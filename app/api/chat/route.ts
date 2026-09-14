import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'
import { DEFAULT_DEEPSEEK_MODEL, isDeepSeekModel, type DeepSeekModelId } from '@/lib/deepseek-models'
import { resolveDeepSeekKey } from '@/lib/deepseek'
import { NextResponse } from 'next/server'
import { getUserStats } from "../../../src/lib/services/stats"

export const dynamic = 'force-dynamic'

interface UserStats {
  totalFlights: number
  totalCountries: number
  totalKilometers: number
  hoursInAir: number
  lastFlightDate?: string
  favoriteDestination?: string
  mostFrequentAirline?: string
  averageFlightDuration?: number
  routes?: Array<{
    from: string
    to: string
    fromIata?: string
    toIata?: string
  }>
  mostVisitedAirport: string
  mostFlownRoute: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// Utility function for exponential backoff retry
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      if (attempt === maxRetries) throw error

      // Check if it's a rate limit error
      if (error?.status === 429) {
        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      throw error
    }
  }
  throw new Error('Max retries exceeded')
}

// IATA code to country mapping (copy from statistics route)
const iataToCountry: { [key: string]: string } = {
  'LGW': 'United Kingdom', 'STN': 'United Kingdom', 'BHX': 'United Kingdom', 'BRS': 'United Kingdom', 'LBA': 'United Kingdom', 'LTN': 'United Kingdom', 'SEN': 'United Kingdom',
  'MAD': 'Spain', 'ALC': 'Spain', 'GRO': 'Spain', 'PMI': 'Spain', 'TFS': 'Spain',
  'KUN': 'Lithuania', 'VNO': 'Lithuania',
  'RIX': 'Latvia',
  'DUB': 'Ireland',
  'GVA': 'Switzerland',
  'NAP': 'Italy',
  'PFO': 'Cyprus'
}

// Counting is the model's weakest move and the one most often asked for
// ("how many in 2026?", "which month do I fly most?"). Count in code and hand
// over the answer, so a miscount is not possible. Computed over every flight,
// even when the detail list below is trimmed.
function summariseByPeriod(flights: any[]): string {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const byYear = new Map<string, number[]>()

  for (const f of flights) {
    // Trimmed: at least one row is stored as ' 2014-03-16', and an untrimmed
    // slice drops it from the counts entirely.
    const date = String(f.departure_date ?? '').trim()
    const [year, month] = [date.slice(0, 4), Number(date.slice(5, 7))]
    if (!/^\d{4}$/.test(year) || !(month >= 1 && month <= 12)) continue
    if (!byYear.has(year)) byYear.set(year, new Array(12).fill(0))
    byYear.get(year)![month - 1] += 1
  }

  const years = [...byYear.keys()].sort().reverse()
  if (years.length === 0) return 'No dated flights on record.'

  return years
    .map((year) => {
      const months = byYear.get(year)!
      const total = months.reduce((a, b) => a + b, 0)
      const breakdown = months
        .map((n, i) => (n > 0 ? `${MONTHS[i]} ${n}` : null))
        .filter(Boolean)
        .join(', ')
      return `  ${year}: ${total} flight${total === 1 ? '' : 's'} (${breakdown})`
    })
    .join('\n')
}

// Helper to calculate duration string from dates and times
function calculateDurationString(depDate: string, depTime: string, arrDate: string, arrTime: string): string | null {
  if (!depDate || !depTime || !arrDate || !arrTime) return null;
  const dep = new Date(`${depDate}T${depTime.length === 5 ? depTime + ':00' : depTime}`);
  const arr = new Date(`${arrDate}T${arrTime.length === 5 ? arrTime + ':00' : arrTime}`);
  let diff = (arr.getTime() - dep.getTime()) / (1000 * 60); // minutes
  if (diff < 0) diff += 24 * 60; // overnight
  const hours = Math.floor(diff / 60);
  const minutes = Math.round(diff % 60);
  return `${hours}h ${minutes}m`;
}

function getErrorMessage(error: any): string {
  if (error?.status === 429) {
    return "I'm currently experiencing high demand. Please wait a moment and try again. You can also try rephrasing your question to use fewer words."
  }
  if (error?.message?.includes('quota')) {
    return "I've reached my usage limit for now. Please try again in a few minutes, or contact support if this persists."
  }
  if (error?.message?.includes('API key')) {
    return "There's an issue with my configuration. Please contact support."
  }
  return "I encountered an error while processing your request. Please try again with a shorter message."
}

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServer()

    // Authenticate user
    const userId = await resolveSupabaseUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message, model } = body

    // The model is chosen by an allowlist, never taken as given: an
    // unrecognised name would otherwise reach DeepSeek verbatim.
    const selectedModel: DeepSeekModelId = isDeepSeekModel(model)
      ? model
      : DEFAULT_DEEPSEEK_MODEL

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Limit message length to avoid quota issues
    if (message.length > 1000) {
      return NextResponse.json({
        error: 'Message too long. Please keep messages under 1000 characters.'
      }, { status: 400 })
    }

    // The user's own stored key, falling back to the deployment key. Fail
    // fast rather than sending an unauthenticated request to DeepSeek.
    const deepseekApiKey = await resolveDeepSeekKey(userId)
    if (!deepseekApiKey) {
      return NextResponse.json(
        {
          error: 'No DeepSeek API key is set. Add yours from the key button above the chat.',
          code: 'missing_api_key',
        },
        { status: 428 }
      )
    }

    // Get user's flight statistics for context
    const userStats = await getUserStats(supabase, userId)

    // Every flight the user owns, newest first. Selecting a "relevant" handful
    // and then telling the model to use only that is what made counting
    // questions wrong: "how many flights in 2026" was answered from the five
    // most recent, so a year spread over six months came back as two.
    const { data: allFlightsRaw, error: flightsError } = await supabase
      .from('vidmaflights')
      .select('*')
      .eq('owner_id', userId)
      .order('departure_date', { ascending: false })

    // Answering from a partial record is worse than not answering: it reads as
    // fact and is wrong. Say so instead.
    if (flightsError) {
      console.error('Chat: could not load flights:', flightsError.message)
      return NextResponse.json(
        { error: 'Could not read your flights just now. Please try again.' },
        { status: 503 }
      )
    }

    const allFlights = (allFlightsRaw ?? []).map((flight) => ({
      ...flight,
      calculated_duration:
        flight.flight_duration ||
        calculateDurationString(
          flight.departure_date,
          flight.departure_time,
          flight.arrival_date,
          flight.arrival_time
        ),
    }))

    // Counted over everything, so the totals stay exact even if the per-flight
    // list below is trimmed for a very large logbook.
    const periodSummary = summariseByPeriod(allFlights)

    // One line per flight. A generous ceiling rather than none: 2000 lines is
    // roughly 150k characters, past what the model can hold. The summary above
    // still covers every flight when this trims.
    const MAX_FLIGHT_LINES = 2000
    const listedFlights = allFlights.slice(0, MAX_FLIGHT_LINES)
    const flightsText = listedFlights
      .map((f) =>
        `${f.departure_date || '????-??-??'} ${f.departure_iata || '???'}->${f.arrival_iata || '???'} ` +
        `${f.departure_airport || ''} to ${f.arrival_airport || ''}, ` +
        `${f.airline || 'unknown airline'} ${f.flight_number || ''}, ` +
        `${f.departure_time || '??'}-${f.arrival_time || '??'}, ` +
        `duration ${f.calculated_duration || 'unknown'}, seat ${f.seat || 'n/a'}, ` +
        `fare ${f.total_receipt || 'n/a'}, ref ${f.reservation_number || 'n/a'}`
      )
      .join('\n')

    const trimmedNote =
      allFlights.length > listedFlights.length
        ? `\n(Showing the ${listedFlights.length} most recent of ${allFlights.length}. The per-year counts above cover all ${allFlights.length}.)`
        : ''

    const now = new Date().toISOString()
    // The data belongs in the system message, not in every user turn: repeating
    // it made each question read as a fresh data dump rather than the next line
    // of a conversation.
    const systemPrompt = `You are a helpful AI assistant for a flight tracking application.

Current timestamp: ${now}

The user's complete flight record is below — ${allFlights.length} flight${allFlights.length === 1 ? '' : 's'} in total. This is the whole record, not a sample.

Flights per year, counted for you (use these numbers directly; do not recount):
${periodSummary}

Derived travel statistics:
${JSON.stringify(userStats, null, 2)}

Every flight, newest first:
${flightsText || 'No flights on record.'}${trimmedNote}

Answer only from the record above, and never invent a flight. When you are asked how many, or which month or year, take the figure from the counted list rather than tallying the lines yourself. If the record genuinely does not cover something, say so plainly.

The messages that follow are one ongoing conversation. Read them before answering: a short follow-up like "and the return?", "what about that one?" or "why?" refers to what was already said, so resolve it from the earlier turns instead of asking the user to repeat themselves. Only ask for clarification when the earlier turns genuinely do not settle it.`

    // --- LOGGING for debugging ---

    // The conversation so far, oldest first. Read before the current message is
    // stored, so the question does not appear twice. Ten messages is five
    // exchanges — enough for "and the return leg?" to resolve, without pushing
    // the flight data out of the model's context.
    const HISTORY_MESSAGES = 10
    const { data: priorMessages, error: historyError } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(HISTORY_MESSAGES)

    // Losing the history degrades the answer; it does not invalidate it. Carry
    // on without it rather than failing the message the user just sent.
    if (historyError) {
      console.error('Chat: could not load conversation history:', historyError.message)
    }

    const history = (priorMessages ?? [])
      .reverse()
      .filter((m) => typeof m.content === 'string' && m.content.trim().length > 0)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    console.log(`Chat: ${allFlights.length} flights, ${history.length} prior messages to ${selectedModel}`)

    // Store user message in database
    await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        role: 'user',
        content: message,
        user_stats: userStats
      })

    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    // A non-2xx from DeepSeek used to fall through to `data.choices?.[0]` and
    // store an empty assistant message, so a rejected key looked like the
    // assistant simply had nothing to say.
    if (!deepseekResponse.ok) {
      const detail = await deepseekResponse.text()
      console.error(`DeepSeek ${deepseekResponse.status} for model ${selectedModel}:`, detail)

      if (deepseekResponse.status === 401) {
        return NextResponse.json(
          {
            error: 'DeepSeek rejected the API key. Check it from the key button above the chat.',
            code: 'invalid_api_key',
          },
          { status: 401 }
        )
      }
      if (deepseekResponse.status === 402) {
        return NextResponse.json(
          { error: 'This DeepSeek account is out of credit.', code: 'insufficient_balance' },
          { status: 402 }
        )
      }
      if (deepseekResponse.status === 429) {
        return NextResponse.json({ error: getErrorMessage({ status: 429 }) }, { status: 429 })
      }

      return NextResponse.json(
        { error: 'DeepSeek could not answer that. Please try again.' },
        { status: 502 }
      )
    }

    const data = await deepseekResponse.json();
    const responseText = data.choices?.[0]?.message?.content || '';

    // An empty body is not an answer; storing it would leave a blank bubble in
    // the transcript that the user cannot tell from a real reply.
    if (!responseText) {
      console.error('DeepSeek returned no content:', JSON.stringify(data).slice(0, 500))
      return NextResponse.json(
        { error: 'DeepSeek returned an empty response. Please try again.' },
        { status: 502 }
      )
    }

    // Store assistant response in database. The stored row's id goes back to
    // the client: it identifies the message for pinning, and the render list
    // de-duplicates on it, so a message without one is dropped.
    const { data: storedAssistant } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        role: 'assistant',
        content: responseText,
        user_stats: userStats
      })
      .select('id, created_at')
      .single()

    return NextResponse.json({
      id: storedAssistant?.id,
      response: responseText,
      stats: userStats,
      model: selectedModel,
      created_at: storedAssistant?.created_at,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Chat API error:', error)

    // Handle specific rate limit errors
    if (error?.status === 429) {
      return NextResponse.json({
        error: getErrorMessage(error)
      }, { status: 429 })
    }

    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createSupabaseServer()
    const userId = await resolveSupabaseUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Delete all chat messages for this user
    const { error: deleteError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', userId)
    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete messages' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete messages' }, { status: 500 })
  }
} 
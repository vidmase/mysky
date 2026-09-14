import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'
import { DEFAULT_DEEPSEEK_MODEL, isDeepSeekModel, type DeepSeekModelId } from '@/lib/deepseek-models'
import { resolveDeepSeekKey } from '@/lib/deepseek'
import { NextResponse } from 'next/server'
import { getUserStats } from "../../../src/lib/services/stats"
import fs from 'fs'

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

// --- Dynamic flight filter ---
function filterFlightsByQuestion(flights: any[], question: string): { matches: any[], explanation: string } {
  const q = question.toLowerCase();
  let matches: any[] = [];
  let explanation = '';

  // Reservation number (case-insensitive, partial)
  const reservationMatch = q.match(/([a-z0-9]{5,})/i);
  if (reservationMatch) {
    matches = flights.filter(f => (f.reservation_number || '').toLowerCase().includes(reservationMatch[1].toLowerCase()));
    if (matches.length > 0) return { matches, explanation: `Matched reservation number: ${reservationMatch[1]}` };
  }

  // Flight number (case-insensitive, partial)
  const flightNumMatch = q.match(/([a-zA-Z]{2,}\d{2,})/);
  if (flightNumMatch) {
    matches = flights.filter(f => (f.flight_number || '').toLowerCase().includes(flightNumMatch[1].toLowerCase()));
    if (matches.length > 0) return { matches, explanation: `Matched flight number: ${flightNumMatch[1]}` };
  }

  // Seat (case-insensitive, partial)
  const seatMatch = q.match(/seat\s*([a-z0-9]+)/i);
  if (seatMatch) {
    matches = flights.filter(f => (f.seat || '').toLowerCase().includes(seatMatch[1].toLowerCase()));
    if (matches.length > 0) return { matches, explanation: `Matched seat: ${seatMatch[1]}` };
  }

  // Airline/company/booking agent/operator (case-insensitive, partial)
  const companyMatch = q.match(/(tez tour|british airways|airline|operator|company|agent|[a-z0-9 ]{3,})/i);
  if (companyMatch) {
    matches = flights.filter(f =>
      (f.airline || '').toLowerCase().includes(companyMatch[1].toLowerCase()) ||
      (f.operator || '').toLowerCase().includes(companyMatch[1].toLowerCase()) ||
      (f.booking_agent || '').toLowerCase().includes(companyMatch[1].toLowerCase()) ||
      (f.notes || '').toLowerCase().includes(companyMatch[1].toLowerCase())
    );
    if (matches.length > 0) return { matches, explanation: `Matched company/airline/operator: ${companyMatch[1]}` };
  }

  // Airport code, city, or airport name (case-insensitive, partial)
  const iataMatch = q.match(/\b([A-Z]{3})\b/);
  if (iataMatch) {
    matches = flights.filter(f =>
      (f.departure_iata || '').toLowerCase().includes(iataMatch[1].toLowerCase()) ||
      (f.arrival_iata || '').toLowerCase().includes(iataMatch[1].toLowerCase())
    );
    if (matches.length > 0) return { matches, explanation: `Matched airport code: ${iataMatch[1]}` };
  }
  // City or airport name
  const cityOrAirportMatch = q.match(/([a-zA-Z ]{3,})/);
  if (cityOrAirportMatch) {
    matches = flights.filter(f =>
      (f.departure_airport || '').toLowerCase().includes(cityOrAirportMatch[1].toLowerCase()) ||
      (f.arrival_airport || '').toLowerCase().includes(cityOrAirportMatch[1].toLowerCase()) ||
      (f.departure_city || '').toLowerCase().includes(cityOrAirportMatch[1].toLowerCase()) ||
      (f.arrival_city || '').toLowerCase().includes(cityOrAirportMatch[1].toLowerCase())
    );
    if (matches.length > 0) return { matches, explanation: `Matched city or airport: ${cityOrAirportMatch[1]}` };
  }

  // Date (YYYY-MM-DD or month/year)
  const dateMatch = q.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    matches = flights.filter(f => f.departure_date === dateMatch[1] || f.arrival_date === dateMatch[1]);
    if (matches.length > 0) return { matches, explanation: `Matched date: ${dateMatch[1]}` };
  }
  // Month (e.g., 'april', 'may')
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  for (const month of monthNames) {
    if (q.includes(month)) {
      matches = flights.filter(f => {
        const depMonth = f.departure_date ? monthNames[new Date(f.departure_date).getMonth()] : '';
        const arrMonth = f.arrival_date ? monthNames[new Date(f.arrival_date).getMonth()] : '';
        return depMonth === month || arrMonth === month;
      });
      if (matches.length > 0) return { matches, explanation: `Matched month: ${month}` };
    }
  }

  // Fuzzy/partial match on all fields
  matches = flights.filter(f => {
    const fields = [
      f.reservation_number, f.flight_number, f.seat, f.airline,
      f.departure_iata, f.arrival_iata, f.departure_airport, f.arrival_airport,
      f.departure_city, f.arrival_city, f.departure_date, f.arrival_date
    ];
    return fields.some(val => (val || '').toLowerCase().includes(q));
  });
  if (matches.length > 0) return { matches, explanation: 'Fuzzy/partial match on multiple fields.' };

  // Fallback: top 5 recent flights
  matches = flights.slice().sort((a, b) => new Date(b.departure_date).getTime() - new Date(a.departure_date).getTime()).slice(0, 5);
  explanation = 'No direct match found. Showing your 5 most recent flights.';
  return { matches, explanation };
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

// Helper to read and sample the CSV file
function getSampledCSV(filePath: string, maxLines: number = 100): string {
  try {
    const csv = fs.readFileSync(filePath, 'utf8');
    const lines = csv.split('\n');
    if (lines.length <= maxLines) return csv;
    return [lines[0], ...lines.slice(1, maxLines)].join('\n'); // header + first N rows
  } catch (e) {
    return '';
  }
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

    // Dynamic context: filter flights based on user question
    const { data: allFlights } = await supabase
      .from('vidmaflights')
      .select('*')
      .eq('owner_id', userId)
    const filterResult = filterFlightsByQuestion(allFlights || [], message)
    let relevantFlights = filterResult.matches
    let filterExplanation = filterResult.explanation
    // Fallback: if no relevant flights, use recent flights
    if (!relevantFlights || relevantFlights.length === 0) {
      relevantFlights = (allFlights || []).sort((a, b) => new Date(b.departure_date).getTime() - new Date(a.departure_date).getTime()).slice(0, 10)
    }

    // Add calculated_duration to each flight if not present
    const relevantFlightsWithDuration = relevantFlights.map(flight => {
      let calculated_duration = flight.flight_duration;
      if (!calculated_duration && flight.departure_date && flight.departure_time && flight.arrival_date && flight.arrival_time) {
        calculated_duration = calculateDurationString(flight.departure_date, flight.departure_time, flight.arrival_date, flight.arrival_time);
      }
      return { ...flight, calculated_duration };
    });

    // Build flights text for context
    const flightsText = relevantFlightsWithDuration.map(f =>
      `- ${f.departure_date}: ${f.departure_airport || ''} (${f.departure_iata || ''}) → ${f.arrival_airport || ''} (${f.arrival_iata || ''}), ${f.departure_time || ''}–${f.arrival_time || ''}, Airline: ${f.airline || ''} (${f.flight_number || ''}), Seat: ${f.seat || 'N/A'}, Reservation: ${f.reservation_number || 'N/A'}, Duration: ${f.calculated_duration || ''}, Distance: ${f.distance_km || ''} km`
    ).join('\n')

    // Pass full JSON of relevant flights
    const flightsJson = JSON.stringify(relevantFlightsWithDuration, null, 2)
    const now = new Date().toISOString()
    // Read CSV and include in prompt
    const csvData = getSampledCSV('data/flights.csv', 100);
    // The data belongs in the system message, not in every user turn: repeating
    // it made each question read as a fresh data dump rather than the next line
    // of a conversation.
    const systemPrompt = `You are a helpful AI assistant for a flight tracking application.\n\nCurrent timestamp: ${now}\n\nHere are the user's current travel statistics:\n${JSON.stringify(userStats, null, 2)}\n\n${filterExplanation ? 'Flight search explanation: ' + filterExplanation + '\n' : ''}Relevant Flights (summary):\n${flightsText || 'No relevant flights found.'}\n\nRelevant Flights (JSON):\n${flightsJson}\n\nHere is your flight database in CSV format:\n${csvData}\n\nUse ONLY the above data to answer questions about the user's flights. Do not make up or interpret data.\n\nThe messages that follow are one ongoing conversation. Read them before answering: a short follow-up like "and the return?", "what about that one?" or "why?" refers to what was already said, so resolve it from the earlier turns instead of asking the user to repeat themselves. Only ask for clarification when the earlier turns genuinely do not settle it.`

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

    console.log(`Chat: ${relevantFlightsWithDuration.length} flights, ${history.length} prior messages to ${selectedModel} — ${filterExplanation}`)

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

    // If user asks for JSON, return it directly
    if (/show me (that )?json|show json|show me the json/i.test(message)) {
      return NextResponse.json({
        flights: relevantFlightsWithDuration,
        explanation: filterExplanation
      });
    }

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
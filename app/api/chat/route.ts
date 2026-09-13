import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getUserStats } from "../../../src/lib/services/stats"
import fs from 'fs'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

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

function createContextualPrompt(userStats: UserStats & { nextFlight?: any }, userMessage: string, flightsText: string): string {
  const today = new Date().toISOString().split('T')[0]
  let nextFlightText = ''
  if (userStats.nextFlight) {
    nextFlightText = `\nNext upcoming flight: ${userStats.nextFlight.departure_airport || ''} (${userStats.nextFlight.departure_iata || ''}) to ${userStats.nextFlight.arrival_airport || ''} (${userStats.nextFlight.arrival_iata || ''}) on ${userStats.nextFlight.departure_date} at ${userStats.nextFlight.departure_time || 'unknown time'} (local time). Arrival: ${userStats.nextFlight.arrival_time || 'unknown time'}`
  } else {
    nextFlightText = '\nNo upcoming flights found.'
  }
  const context = `You are a helpful AI assistant for a flight tracking application. Here are the user's current travel statistics:\n\nToday's date: ${today}${nextFlightText}\n\nTravel Profile:\n- Total flights taken: ${userStats.totalFlights}\n- Countries visited: ${userStats.totalCountries}\n- Total kilometers flown: ${userStats.totalKilometers.toLocaleString()} km\n- Total hours in air: ${userStats.hoursInAir} hours\n${userStats.lastFlightDate ? `- Last flight: ${userStats.lastFlightDate}` : ''}\n${userStats.favoriteDestination ? `- Favorite destination: ${userStats.favoriteDestination}` : ''}\n${userStats.mostFrequentAirline ? `- Most frequent airline: ${userStats.mostFrequentAirline}` : ''}\n${userStats.averageFlightDuration ? `- Average flight duration: ${userStats.averageFlightDuration} hours` : ''}\n\nRelevant Flights:\n${flightsText || 'No relevant flights found.'}\n\nUse this context to provide personalized, relevant responses about travel, flights, destinations, and travel planning. Be helpful, engaging, and reference their travel history when appropriate. Keep responses concise and conversational.\n\nUser's question: ${userMessage}`
  return context
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
    const { message, conversation = [] } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Limit message length to avoid quota issues
    if (message.length > 1000) {
      return NextResponse.json({
        error: 'Message too long. Please keep messages under 1000 characters.'
      }, { status: 400 })
    }

    // Fail fast if the AI provider key is missing, rather than sending an
    // unauthenticated request to DeepSeek.
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY
    if (!deepseekApiKey) {
      console.error('Chat API error: DEEPSEEK_API_KEY is not set')
      return NextResponse.json(
        { error: 'Chat is not configured. Please contact support.' },
        { status: 500 }
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
    const contextualPrompt = `You are a helpful AI assistant for a flight tracking application.\n\nCurrent timestamp: ${now}\n\nHere are the user's current travel statistics:\n${JSON.stringify(userStats, null, 2)}\n\n${filterExplanation ? 'Flight search explanation: ' + filterExplanation + '\n' : ''}Relevant Flights (summary):\n${flightsText || 'No relevant flights found.'}\n\nRelevant Flights (JSON):\n${flightsJson}\n\nHere is your flight database in CSV format:\n${csvData}\n\nUse ONLY the above data to answer the user's question. Do not make up or interpret data.\n\nUser's question: ${message}`

    // --- LOGGING for debugging ---
    console.log('Gemini prompt context:', contextualPrompt)
    console.log('Flights sent to Gemini:', relevantFlightsWithDuration)
    console.log('Flight filter explanation:', filterExplanation)

    // Store user message in database
    await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        role: 'user',
        content: message,
        user_stats: userStats
      })

    // Call Deepseek API instead of Gemini
    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ${deepseekApiKey}',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant for a flight tracking application.' },
          { role: 'user', content: contextualPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });
    const data = await deepseekResponse.json();
    const responseText = data.choices?.[0]?.message?.content || '';

    // Store assistant response in database
    await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        role: 'assistant',
        content: responseText,
        user_stats: userStats
      })

    // If user asks for JSON, return it directly
    if (/show me (that )?json|show json|show me the json/i.test(message)) {
      return NextResponse.json({
        flights: relevantFlightsWithDuration,
        explanation: filterExplanation
      });
    }

    return NextResponse.json({
      response: responseText,
      stats: userStats,
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
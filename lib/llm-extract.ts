import { GoogleGenerativeAI, Part } from '@google/generative-ai'

// Initialize Gemini API client (same key as used in scan-boarding-pass route)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface PassengerInfo {
  name: string
  type?: string
  age?: number
}

export interface FlightData {
  passenger_name: string
  reservation_number: string
  flight_number: string
  departure_airport: string
  arrival_airport: string
  departure_date: string
  departure_time: string
  arrival_time: string
  total_receipt: string
  purchased_date: string
  purchase_time: string
  airline?: string
  arrival_iata?: string
  departure_iata?: string
  seat?: string
  notes?: string
  arrival_date?: string
  flight_duration?: string
  is_direct?: boolean
  passengers?: PassengerInfo[]
  is_return_flight?: boolean
  booking_type?: 'OUTBOUND' | 'RETURN'
  return_flight_number?: string
  return_departure_date?: string
  return_departure_time?: string
  return_flight_duration?: string
  return_is_direct?: boolean
}

// Reuse the same structured parser used by boarding pass flow
export function parseGeminiResponse(text: string): FlightData[] {
  const lines = text.split('\n')
  let currentSection: 'none' | 'passengers' | 'outbound' | 'return' = 'none'
  let currentPassenger: Partial<PassengerInfo> = {}
  const passengers: PassengerInfo[] = []
  let outbound: any = {}
  let ret: any = {}
  let booking_reference = ''
  let total_receipt = ''

  lines.forEach(line => {
    line = line.trim()
    if (!line) return

    if (line.toLowerCase().startsWith('booking reference:')) {
      booking_reference = line.split(':')[1].trim()
      return
    }
    if (line === 'Passengers:') { currentSection = 'passengers'; return }
    if (line === 'Outbound Flight:') { currentSection = 'outbound'; return }
    if (line === 'Return Flight:') { currentSection = 'return'; return }

    if (currentSection === 'passengers') {
      if (line.startsWith('- Name:')) {
        if (currentPassenger.name) {
          passengers.push(currentPassenger as PassengerInfo)
        }
        currentPassenger = { name: line.split(':')[1].trim() }
      } else if (line.startsWith('Type:')) {
        currentPassenger.type = line.split(':')[1].trim()
      } else if (line.startsWith('Age:')) {
        const v = line.split(':')[1].trim()
        const n = parseInt(v, 10)
        if (!isNaN(n)) currentPassenger.age = n
      }
      return
    }

    const setField = (obj: any, key: string, value: string) => {
      obj[key] = value === 'None' ? '' : value
    }

    if (currentSection === 'outbound' || currentSection === 'return') {
      const target = currentSection === 'outbound' ? outbound : ret
      if (line.toLowerCase().startsWith('flight number:')) setField(target, 'flight_number', line.split(':')[1].trim())
      else if (line.toLowerCase().startsWith('departure airport:')) setField(target, 'departure_airport', line.split(':')[1].trim())
      else if (line.toLowerCase().startsWith('arrival airport:')) setField(target, 'arrival_airport', line.split(':')[1].trim())
      else if (line.toLowerCase().startsWith('departure date:')) setField(target, 'departure_date', line.split(':')[1].trim())
      else if (line.toLowerCase().startsWith('departure time:')) setField(target, 'departure_time', line.split(':')[1].trim())
      else if (line.toLowerCase().startsWith('arrival time:')) setField(target, 'arrival_time', line.split(':')[1].trim())
      else if (line.toLowerCase().startsWith('duration:')) setField(target, 'flight_duration', line.split(':')[1].trim())
      else if (line.toLowerCase().startsWith('price:')) setField(target, 'price', line.split(':')[1].trim())
      return
    }

    if (line.toLowerCase().startsWith('total receipt:')) {
      total_receipt = line.split(':')[1].trim()
      return
    }
  })

  if (currentPassenger.name) passengers.push(currentPassenger as PassengerInfo)

  const results: FlightData[] = []
  if (outbound.flight_number) {
    results.push({
      passenger_name: passengers[0]?.name || '',
      reservation_number: booking_reference || '',
      flight_number: outbound.flight_number || '',
      departure_airport: outbound.departure_airport || '',
      arrival_airport: outbound.arrival_airport || '',
      departure_date: outbound.departure_date || '',
      departure_time: outbound.departure_time || '',
      arrival_time: outbound.arrival_time || '',
      total_receipt: total_receipt || '',
      purchased_date: '',
      purchase_time: '',
      flight_duration: outbound.flight_duration || '',
      passengers: passengers.length ? passengers : undefined,
      booking_type: 'OUTBOUND'
    })
  }
  if (ret.flight_number) {
    results.push({
      passenger_name: passengers[0]?.name || '',
      reservation_number: booking_reference || '',
      flight_number: ret.flight_number || '',
      departure_airport: ret.departure_airport || '',
      arrival_airport: ret.arrival_airport || '',
      departure_date: ret.departure_date || '',
      departure_time: ret.departure_time || '',
      arrival_time: ret.arrival_time || '',
      total_receipt: total_receipt || '',
      purchased_date: '',
      purchase_time: '',
      flight_duration: ret.flight_duration || '',
      passengers: passengers.length ? passengers : undefined,
      booking_type: 'RETURN'
    })
  }

  return results
}

export async function extractFlightsFromTextLLM(emailText: string, hints?: { subject?: string; receivedAt?: string }): Promise<FlightData[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro', generationConfig: { temperature: 0 } })

  // 1) Normalize noisy email text a bit for better extraction
  const normalize = (t: string) =>
    t
      .replace(/\u00A0/g, ' ') // no-break spaces
      .replace(/[\t\r]+/g, ' ')
      .replace(/ +/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .trim()

  const text = normalize(emailText || '')
  if (!text) return []
  // If no API key, skip LLM paths entirely
  const hasGeminiKey = !!(process.env.GEMINI_API_KEY && String(process.env.GEMINI_API_KEY).trim())

  // 2) Prefer structured JSON response with schema
  const generationConfig: any = {
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          passenger_name: { type: 'STRING' },
          reservation_number: { type: 'STRING' },
          flight_number: { type: 'STRING' },
          departure_airport: { type: 'STRING' },
          arrival_airport: { type: 'STRING' },
          departure_date: { type: 'STRING' },
          departure_time: { type: 'STRING' },
          arrival_time: { type: 'STRING' },
          total_receipt: { type: 'STRING' },
          purchased_date: { type: 'STRING' },
          purchase_time: { type: 'STRING' },
          airline: { type: 'STRING' },
          arrival_iata: { type: 'STRING' },
          departure_iata: { type: 'STRING' },
          seat: { type: 'STRING' },
          notes: { type: 'STRING' },
          arrival_date: { type: 'STRING' },
          flight_duration: { type: 'STRING' },
          is_direct: { type: 'BOOLEAN' },
          is_return_flight: { type: 'BOOLEAN' },
          booking_type: { type: 'STRING' },
          return_flight_number: { type: 'STRING' },
          return_departure_date: { type: 'STRING' },
          return_departure_time: { type: 'STRING' },
          return_flight_duration: { type: 'STRING' },
          return_is_direct: { type: 'BOOLEAN' },
          passengers: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                type: { type: 'STRING' },
                age: { type: 'NUMBER' },
              },
            },
          },
        },
      },
    },
  }

  const instruction = [
    {
      text: `Task: Extract ALL flight segments from the airline itinerary/confirmation email and return a JSON array strictly matching the provided schema.

Absolute rules:
- Dates must be ISO: YYYY-MM-DD. Times must be 24h HH:mm.
- Do NOT infer travel dates from the email's received/sent timestamp.
- If a value is not explicitly present, set it to an empty string (or omit optional fields). Never hallucinate.
- Include all segments: outbound and return when present.

Ryanair-specific guidance (high priority):
- Look for "Outbound" and "Return" sections. Dates often appear near these headings or near an FR flight number.
- Flight numbers use the pattern FR123, FR1234, or FR12345 (allow optional space: "FR 1234"). Normalize to no space, uppercase.
- Booking reference/PNR is 5–8 alphanumeric characters (e.g., ABCDEF). It may appear as "Booking reference", "Reservation", or "PNR".
- IATA codes (3 letters) appear alongside airport names; capture both: departure_iata/arrival_iata and departure_airport/arrival_airport.
- Passenger list may appear as a table or bullet list under "Passengers".
- Times are usually local; extract the literal HH:mm text without converting timezones.

General extraction checklist:
1) passenger_name from Passenger/Name fields (use the main traveler if a list exists).
2) reservation_number from Booking/Reservation/PNR patterns.
3) flight_number near each segment line (prefer FR… when Ryanair is detected).
4) departure_iata, arrival_iata and full airport names.
5) departure_date (TRAVEL DATE) most likely found near segment headers or flight details. Accept formats: "Jul 31, 2025", "31 Jul 2025", "31/07/2025", "2025-07-31".
6) departure_time and arrival_time near "Depart"/"Arrive"/"From"/"To" labels or on the same line as the segment.
7) total_receipt from total/price/amount if shown.
8) purchased_date/purchase_time from explicit booking/confirmation timestamps, not from email headers.

Output strictly as JSON matching the schema (array of objects). If both outbound and return exist, include two objects and set booking_type to OUTBOUND/RETURN.

EMAIL CONTEXT: ${hints?.subject ? `Subject: ${hints.subject}` : ''} ${hints?.receivedAt ? `Received: ${hints.receivedAt}` : ''}

Mini example (Ryanair-like):
Text snippet: "Outbound Fri, 31 Jul 2025 FR6882 Riga (RIX) 06:30 → London Stansted (STN) 07:35  Return Tue, 05 Aug 2025 FR6881 STN 20:45 → RIX 00:15"
Expected JSON (abbrev): [{"flight_number":"FR6882","departure_iata":"RIX","arrival_iata":"STN","departure_date":"2025-07-31","departure_time":"06:30","arrival_time":"07:35","booking_type":"OUTBOUND"},{"flight_number":"FR6881","departure_iata":"STN","arrival_iata":"RIX","departure_date":"2025-08-05","departure_time":"20:45","arrival_time":"00:15","booking_type":"RETURN"}]`,
    },
    { text },
  ] as const

  // Helper: sleep
  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

  // Attempt structured JSON extraction with retries
  if (hasGeminiKey) {
    const maxAttempts = 3
    let lastError: unknown = null
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await model.generateContent({ contents: instruction as any, generationConfig })
        const res = await result.response
        const jsonText = res.text()
        if (jsonText) {
          const parsed = JSON.parse(jsonText) as any[]
          const mapped: FlightData[] = (Array.isArray(parsed) ? parsed : [])
            .map((o) => ({
              passenger_name: String(o.passenger_name || ''),
              reservation_number: String(o.reservation_number || ''),
              flight_number: String(o.flight_number || ''),
              departure_airport: String(o.departure_airport || ''),
              arrival_airport: String(o.arrival_airport || ''),
              departure_date: String(o.departure_date || ''),
              departure_time: String(o.departure_time || ''),
              arrival_time: String(o.arrival_time || ''),
              total_receipt: String(o.total_receipt || ''),
              purchased_date: String(o.purchased_date || ''),
              purchase_time: String(o.purchase_time || ''),
              airline: o.airline ? String(o.airline) : undefined,
              arrival_iata: o.arrival_iata ? String(o.arrival_iata) : undefined,
              departure_iata: o.departure_iata ? String(o.departure_iata) : undefined,
              seat: o.seat ? String(o.seat) : undefined,
              notes: o.notes ? String(o.notes) : undefined,
              arrival_date: o.arrival_date ? String(o.arrival_date) : undefined,
              flight_duration: o.flight_duration ? String(o.flight_duration) : undefined,
              is_direct: typeof o.is_direct === 'boolean' ? o.is_direct : undefined,
              is_return_flight: typeof o.is_return_flight === 'boolean' ? o.is_return_flight : undefined,
              booking_type: o.booking_type as any,
              return_flight_number: o.return_flight_number ? String(o.return_flight_number) : undefined,
              return_departure_date: o.return_departure_date ? String(o.return_departure_date) : undefined,
              return_departure_time: o.return_departure_time ? String(o.return_departure_time) : undefined,
              return_flight_duration: o.return_flight_duration ? String(o.return_flight_duration) : undefined,
            }))
            .filter((f) => f.flight_number || f.departure_date)
          if (mapped.length) return mapped
        }
        // If no usable JSON, treat as failure to trigger retry/fallback
        lastError = new Error('Empty or unusable JSON from LLM')
        console.warn(`[llm-extract] Attempt ${attempt}/${maxAttempts}: no usable JSON returned`)
      } catch (e) {
        lastError = e
        console.warn(`[llm-extract] Attempt ${attempt}/${maxAttempts} failed: ${e instanceof Error ? e.message : String(e)}`)
      }
      if (attempt < maxAttempts) await sleep(400 * attempt) // simple backoff
    }
    // continue to fallbacks after retries
  }

  // 3) Fallback to legacy text format + parser
  try {
    if (!hasGeminiKey) throw new Error('No GEMINI_API_KEY; skip legacy LLM prompt')
    const legacyPrompt = `Extract flight details from the following airline itinerary/confirmation email text.
Follow this exact textual template (use "None" for missing fields). Include return if present:

Booking reference: [NUMBER]
Passengers:
- Name: [FULL NAME]
  Type: [Adult/Child/Infant]
  Age: [NUMBER]

Outbound Flight:
Flight number: [CODE]
Departure airport: [NAME] ([IATA])
Arrival airport: [NAME] ([IATA])
Departure date: [YYYY-MM-DD]
Departure time: [HH:mm]
Arrival time: [HH:mm]
Duration: [XXh YYm]
Direct: Yes
Price: [AMOUNT]

Return Flight: (if exists)
Flight number: [CODE]
Departure airport: [NAME] ([IATA])
Arrival airport: [NAME] ([IATA])
Departure date: [YYYY-MM-DD]
Departure time: [HH:mm]
Arrival time: [HH:mm]
Duration: [XXh YYm]
Direct: Yes
Price: [AMOUNT]

Total receipt: [AMOUNT]`

    const out = await model.generateContent([legacyPrompt, text])
    const legacy = out.response.text()
    if (legacy && legacy.trim()) {
      const parsed = parseGeminiResponse(legacy)
      if (parsed.length) return parsed
    }
  } catch { }

  // 4) Heuristic regex extraction as last resort
  const heur = extractWithRegex(text)
  // If hints contain receivedAt, apply as fallback purchase timestamp
  if (heur.length && hints?.receivedAt) {
    try {
      const d = new Date(hints.receivedAt)
      if (!isNaN(d.getTime())) {
        const dateISO = d.toISOString().slice(0,10)
        const timeISO = d.toISOString().slice(11,16)
        for (const h of heur) {
          if (!h.purchased_date) h.purchased_date = dateISO
          if (!h.purchase_time) h.purchase_time = timeISO
        }
      }
    } catch {}
  }
  return heur
}

// Very lightweight heuristic extraction for resilience when LLM fails
function extractWithRegex(t: string): FlightData[] {
  const results: FlightData[] = []
  const flightRegex = /(FR\s?\d{3,4}|[A-Z]{2}\s?\d{3,4})/g
  const dateRegex = /(20\d{2}[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01]))/ // YYYY-MM-DD or YYYY/MM/DD
  const timeRegex = /\b([01]?\d|2[0-3]):([0-5]\d)\b/
  const iataRegex = /\b([A-Z]{3})\b/

  // Try to find the first plausible segment
  const flights = Array.from(new Set(Array.from(t.matchAll(flightRegex)).map(m => m[1].replace(/\s+/g, ''))))
  if (flights.length) {
    const depDate = t.match(dateRegex)?.[1] || ''
    const times = Array.from(t.matchAll(timeRegex)).map(m => m[0])
    const depTime = times[0] || ''
    const arrTime = times[1] || ''
    const iatas = Array.from(t.matchAll(iataRegex)).map(m => m[1])
    const depIata = iatas[0]
    const arrIata = iatas[1]
    results.push({
      passenger_name: '',
      reservation_number: '',
      flight_number: flights[0],
      departure_airport: depIata || '',
      arrival_airport: arrIata || '',
      departure_date: depDate,
      departure_time: depTime,
      arrival_time: arrTime,
      total_receipt: '',
      purchased_date: '',
      purchase_time: ''
    })
  }
  return results
}

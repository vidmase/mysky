import { NextResponse } from 'next/server'
import { GoogleGenerativeAI, Part, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { europeanAirports, Airport } from '@/lib/airports'

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Create a map of IATA codes to airport data for faster lookups
const airportMap = new Map(europeanAirports.map(airport => [airport.iata, airport]))

function getFlagEmoji(countryName: string): string {
    const countryToCode: { [key: string]: string } = {
        'United Kingdom': 'GB',
        'France': 'FR',
        'Germany': 'DE',
        'Spain': 'ES',
        'Italy': 'IT',
        'Netherlands': 'NL',
        'Belgium': 'BE',
        'Portugal': 'PT',
        'Greece': 'GR',
        'Ireland': 'IE',
        'Sweden': 'SE',
        'Denmark': 'DK',
        'Finland': 'FI',
        'Norway': 'NO',
        'Switzerland': 'CH',
        'Austria': 'AT',
        'Poland': 'PL',
        'Czech Republic': 'CZ',
        'Hungary': 'HU',
        'Croatia': 'HR',
        'Romania': 'RO',
        'Bulgaria': 'BG',
        'Slovakia': 'SK',
        'Slovenia': 'SI',
        'Estonia': 'EE',
        'Latvia': 'LV',
        'Lithuania': 'LT',
        'Cyprus': 'CY',
        'Malta': 'MT',
        'Luxembourg': 'LU',
        'Iceland': 'IS',
        'Egypt': 'EG'
    }

    const code = countryToCode[countryName] || ''
    if (!code) return ''

    // Convert country code to flag emoji
    const codePoints = code
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0))

    return String.fromCodePoint(...codePoints)
}

function calculateDistance(airport1: Airport, airport2: Airport): number {
    if (!airport1.coordinates || !airport2.coordinates) return 0;

    const [lon1, lat1] = airport1.coordinates;
    const [lon2, lat2] = airport2.coordinates;

    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

interface PassengerInfo {
    name: string;
    type?: string;  // Adult, Child, Infant
    age?: number;
}

interface FlightData {
    // Required fields
    id?: string                  // uuid, auto-generated
    owner_id?: string           // uuid, auto-generated
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

    // Optional fields
    airline?: string
    arrival_iata?: string
    departure_iata?: string
    seat?: string
    notes?: string
    departure_longitude?: number
    departure_latitude?: number
    arrival_longitude?: number
    arrival_latitude?: number
    departure_country?: string
    arrival_country?: string
    departure_flag?: string
    arrival_flag?: string
    arrival_date?: string
    return_arrival_time?: string

    // Return flight specific fields
    return_flight_number?: string
    return_departure_date?: string
    return_departure_time?: string
    return_flight_duration?: string
    return_is_direct?: boolean

    // Enhanced data fields
    flight_duration?: string
    is_direct?: boolean
    passengers?: PassengerInfo[]
    is_return_flight?: boolean
    booking_type?: 'OUTBOUND' | 'RETURN'
}

function parseGeminiResponse(text: string): FlightData {
    const lines = text.split('\n')
    let currentSection = ''
    let currentPassenger: Partial<PassengerInfo> = {}
    const passengers: PassengerInfo[] = []
    const data: { [key: string]: any } = {
        passengers: [],
        is_direct: false,
        booking_type: 'OUTBOUND'
    }

    // Process lines and organize by sections
    lines.forEach(line => {
        line = line.trim()
        if (!line) return

        // Detect sections
        if (line.toLowerCase().includes('booking reference:')) {
            currentSection = 'booking'
            const [, value] = line.split(':').map(s => s.trim())
            data.booking_reference = value
            return
        }
        if (line === 'Passengers:') {
            currentSection = 'passengers'
            return
        }
        if (line === 'Outbound Flight:') {
            currentSection = 'outbound'
            data.booking_type = 'OUTBOUND'
            return
        }
        if (line === 'Return Flight:') {
            currentSection = 'return'
            return
        }

        // Process passenger information
        if (currentSection === 'passengers') {
            if (line.startsWith('- Name:')) {
                if (Object.keys(currentPassenger).length > 0) {
                    passengers.push(currentPassenger as PassengerInfo)
                }
                currentPassenger = {
                    name: line.split(':')[1].trim()
                }
            } else if (line.startsWith('  Type:')) {
                currentPassenger.type = line.split(':')[1].trim()
            } else if (line.startsWith('  Age:')) {
                currentPassenger.age = parseInt(line.split(':')[1].trim())
            }
            return
        }

        // Process flight information
        if (currentSection === 'outbound' || currentSection === 'return') {
            const [key, value] = line.split(':').map(s => s.trim())
            const normalizedKey = key.toLowerCase().replace(/\s+/g, '_')

            switch (normalizedKey) {
                case 'flight_number':
                    if (currentSection === 'outbound') {
                        data.flight_number = value
                    } else {
                        data.return_flight_number = value
                    }
                    break
                case 'departure_airport':
                    if (currentSection === 'outbound') {
                        data.departure_airport = value.replace(/\([A-Z]{3}\)/, '').trim()
                        data.departure_iata = (value.match(/\(([A-Z]{3})\)/) || [])[1]
                    } else {
                        data.return_departure_airport = value.replace(/\([A-Z]{3}\)/, '').trim()
                        data.return_departure_iata = (value.match(/\(([A-Z]{3})\)/) || [])[1]
                    }
                    break
                case 'arrival_airport':
                    if (currentSection === 'outbound') {
                        data.arrival_airport = value.replace(/\([A-Z]{3}\)/, '').trim()
                        data.arrival_iata = (value.match(/\(([A-Z]{3})\)/) || [])[1]
                    } else {
                        data.return_arrival_airport = value.replace(/\([A-Z]{3}\)/, '').trim()
                        data.return_arrival_iata = (value.match(/\(([A-Z]{3})\)/) || [])[1]
                    }
                    break
                case 'departure_date':
                    if (currentSection === 'outbound') {
                        data.departure_date = value
                    } else {
                        data.return_departure_date = value
                    }
                    break
                case 'departure_time':
                    if (currentSection === 'outbound') {
                        const [hours, minutes] = value.split(':')
                        data.departure_time = `${hours.padStart(2, '0')}:${minutes || '00'}`
                    } else {
                        const [hours, minutes] = value.split(':')
                        data.return_departure_time = `${hours.padStart(2, '0')}:${minutes || '00'}`
                    }
                    break
                case 'arrival_time':
                    if (currentSection === 'outbound') {
                        const [hours, minutes] = value.split(':')
                        data.arrival_time = `${hours.padStart(2, '0')}:${minutes || '00'}`
                    } else {
                        const [hours, minutes] = value.split(':')
                        data.return_arrival_time = `${hours.padStart(2, '0')}:${minutes || '00'}`
                    }
                    break
                case 'duration':
                    if (currentSection === 'outbound') {
                        data.flight_duration = value
                    } else {
                        data.return_flight_duration = value
                    }
                    break
                case 'direct':
                    if (currentSection === 'outbound') {
                        data.is_direct = value.toLowerCase() === 'yes'
                    } else {
                        data.return_is_direct = value.toLowerCase() === 'yes'
                    }
                    break
            }
        }

        // Process total receipt
        if (line.startsWith('Total receipt:')) {
            data.total_receipt = line.split(':')[1].trim()
        }
    })

    // Add the last passenger if exists
    if (Object.keys(currentPassenger).length > 0) {
        passengers.push(currentPassenger as PassengerInfo)
    }

    // Get current time for purchase timestamp
    const now = new Date()
    const purchasedDate = now.toISOString().split('T')[0]
    const purchaseTime = now.toTimeString().split(' ')[0].substring(0, 5)

    // Helper function to get value or "None"
    const getValue = (value: any): string => {
        if (!value || String(value).trim() === '') return 'None'
        // Handle time values
        if (typeof value === 'string' && /^\d{1,2}$/.test(value)) {
            return value.padStart(2, '0') + ':00'
        }
        return String(value).trim()
    }

    // Construct the flight data object
    const flightData: FlightData = {
        // Required fields
        passenger_name: getValue(passengers[0]?.name), // Lead passenger
        reservation_number: getValue(data.booking_reference),
        flight_number: getValue(data.flight_number),
        departure_airport: getValue(data.departure_airport),
        arrival_airport: getValue(data.arrival_airport),
        departure_date: getValue(data.departure_date),
        departure_time: getValue(data.departure_time),
        arrival_time: getValue(data.arrival_time),
        total_receipt: getValue(data.total_receipt),
        purchased_date: purchasedDate,
        purchase_time: purchaseTime,

        // Optional fields
        departure_iata: data.departure_iata,
        arrival_iata: data.arrival_iata,
        flight_duration: data.flight_duration,
        is_direct: data.is_direct,
        passengers: passengers,
        booking_type: data.booking_type,
        is_return_flight: false,

        // Return flight data (if available)
        return_arrival_time: data.return_arrival_time
    }

    // Enrich with airport data
    if (flightData.departure_iata) {
        const departureAirport = airportMap.get(flightData.departure_iata)
        if (departureAirport) {
            flightData.departure_longitude = departureAirport.coordinates?.[0]
            flightData.departure_latitude = departureAirport.coordinates?.[1]
            flightData.departure_country = departureAirport.country
            flightData.departure_flag = getFlagEmoji(departureAirport.country)
        }
    }

    if (flightData.arrival_iata) {
        const arrivalAirport = airportMap.get(flightData.arrival_iata)
        if (arrivalAirport) {
            flightData.arrival_longitude = arrivalAirport.coordinates?.[0]
            flightData.arrival_latitude = arrivalAirport.coordinates?.[1]
            flightData.arrival_country = arrivalAirport.country
            flightData.arrival_flag = getFlagEmoji(arrivalAirport.country)
        }
    }

    return flightData
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            )
        }

        // Convert file to base64
        const buffer = await file.arrayBuffer()
        const base64Data = Buffer.from(buffer).toString('base64')

        // Initialize Gemini 1.5 Pro model - optimized for OCR and text extraction
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

        // Enhanced prompt for better OCR accuracy
        const prompt = `Extract text from this boarding pass or flight confirmation image with high precision.
Focus on these key details (mark as "None" if not found):

1. Booking reference number
2. Passenger names and types (Adult/Child/Infant)
3. Flight details:
   - Flight number with airline code (e.g., BA123, LH456)
   - From/To airports with IATA codes in parentheses
   - Dates in YYYY-MM-DD format
   - Times in 24-hour HH:mm format
   - Duration if shown
4. Total cost with currency

Format exactly as:
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

Return Flight: (if exists)
[Same format as Outbound]

Total receipt: [AMOUNT]

Return ONLY the extracted data in the exact format shown above. Use "None" for missing fields.
For unclear text, use OCR best practices to infer the most likely value.`

        // Create image part with enhanced settings for OCR
        const imagePart: Part = {
            inlineData: {
                data: base64Data,
                mimeType: file.type
            }
        }

        // Generate content with enhanced error handling
        const result = await model.generateContent([prompt, imagePart])
        if (!result) {
            throw new Error('No response from Gemini API')
        }

        const response = await result.response
        const text = response.text()

        if (!text || text.trim() === '') {
            throw new Error('Empty response from Gemini API')
        }

        console.log('Raw Gemini response:', text) // Debug log

        // Parse the response and create flight records
        const extractedData = parseGeminiResponse(text)

        // Debug log
        console.log('Parsed flight data:', JSON.stringify(extractedData, null, 2))

        // If this is a round trip booking, create two flight records
        const flightRecords = []
        if (extractedData.booking_type === 'OUTBOUND') {
            flightRecords.push(extractedData)

            // Create return flight record if available
            if (extractedData.return_arrival_time) {
                const returnFlight = { ...extractedData }
                returnFlight.booking_type = 'RETURN'
                returnFlight.is_return_flight = true

                // Swap airports for return flight
                returnFlight.departure_airport = extractedData.arrival_airport
                returnFlight.arrival_airport = extractedData.departure_airport
                returnFlight.departure_iata = extractedData.arrival_iata
                returnFlight.arrival_iata = extractedData.departure_iata

                // Update flight specific details
                returnFlight.flight_number = extractedData.return_flight_number || returnFlight.flight_number
                returnFlight.departure_date = extractedData.return_departure_date || returnFlight.departure_date
                returnFlight.departure_time = extractedData.return_departure_time || returnFlight.departure_time
                returnFlight.arrival_time = extractedData.return_arrival_time || returnFlight.arrival_time
                returnFlight.flight_duration = extractedData.return_flight_duration || returnFlight.flight_duration
                returnFlight.is_direct = extractedData.return_is_direct ?? returnFlight.is_direct

                flightRecords.push(returnFlight)
            }
        }

        const response_data = flightRecords.length > 0 ? flightRecords : extractedData
        console.log('Final response:', JSON.stringify(response_data, null, 2)) // Debug log

        // Create the response object with both parsed data and raw response
        const responseData = {
            ...response_data,
            raw_response: text // Include the raw response
        }

        return NextResponse.json(responseData)
    } catch (error) {
        console.error('Error processing boarding pass:', error)
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to process boarding pass',
                details: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        )
    }
} 
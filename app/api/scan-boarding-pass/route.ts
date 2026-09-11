import { NextResponse } from 'next/server'
import { GoogleGenerativeAI, Part, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { allAirports, Airport } from '@/lib/airports'

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Create a map of IATA codes to airport data for faster lookups
const airportMap = new Map(allAirports.map(airport => [airport.iata, airport]))

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

function parseGeminiResponse(text: string): FlightData[] {
    const lines = text.split('\n');
    let currentSection: 'none' | 'passengers' | 'outbound' | 'return' = 'none';
    let currentPassenger: Partial<PassengerInfo> = {};
    const passengers: PassengerInfo[] = [];
    let outbound: any = {};
    let ret: any = {};
    let booking_reference = '';
    let total_receipt = '';

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        if (line.toLowerCase().startsWith('booking reference:')) {
            booking_reference = line.split(':')[1].trim();
            return;
        }
        if (line === 'Passengers:') {
            currentSection = 'passengers';
            return;
        }
        if (line === 'Outbound Flight:') {
            currentSection = 'outbound';
            return;
        }
        if (line === 'Return Flight:') {
            currentSection = 'return';
            return;
        }
        if (line.toLowerCase().startsWith('total receipt:')) {
            total_receipt = line.split(':')[1].trim();
            return;
        }

        // Passengers
        if (currentSection === 'passengers') {
            if (line.startsWith('- Name:')) {
                if (currentPassenger.name) passengers.push(currentPassenger as PassengerInfo);
                currentPassenger = { name: line.split(':')[1].trim() };
            } else if (line.startsWith('  Type:')) {
                currentPassenger.type = line.split(':')[1].trim();
            } else if (line.startsWith('  Age:')) {
                const age = line.split(':')[1].trim();
                currentPassenger.age = age === 'None' ? undefined : parseInt(age);
            }
            return;
        }

        // Flights
        if (currentSection === 'outbound' || currentSection === 'return') {
            const [rawKey, ...rest] = line.split(':');
            if (!rawKey || rest.length === 0) return;
            const value = rest.join(':').trim();
            const target = currentSection === 'outbound' ? outbound : ret;
            switch (rawKey.trim().toLowerCase()) {
                case 'flight number':
                    target.flight_number = value;
                    break;
                case 'departure airport': {
                    const match = value.match(/^(.*) \(([A-Z]{3})\)$/);
                    if (match) {
                        target.departure_airport = match[1].trim();
                        target.departure_iata = match[2];
                    } else {
                        target.departure_airport = value;
                    }
                    break;
                }
                case 'arrival airport': {
                    const match = value.match(/^(.*) \(([A-Z]{3})\)$/);
                    if (match) {
                        target.arrival_airport = match[1].trim();
                        target.arrival_iata = match[2];
                    } else {
                        target.arrival_airport = value;
                    }
                    break;
                }
                case 'departure date':
                    target.departure_date = value;
                    break;
                case 'departure time':
                    target.departure_time = value;
                    break;
                case 'arrival time':
                    target.arrival_time = value;
                    break;
                case 'duration':
                    target.flight_duration = value;
                    break;
                case 'direct':
                    target.is_direct = value.toLowerCase() === 'yes';
                    break;
                case 'price':
                    target.individual_price = value;
                    break;
            }
        }
    });
    if (currentPassenger.name) passengers.push(currentPassenger as PassengerInfo);

    // Compose outbound flight
    const now = new Date();
    const purchasedDate = now.toISOString().split('T')[0];
    const purchaseTime = now.toTimeString().split(' ')[0].substring(0, 5);
    
    // Determine outbound flight price
    let outboundPrice = total_receipt;
    if (outbound.individual_price && outbound.individual_price !== 'None') {
        outboundPrice = outbound.individual_price;
    }
    
    const outboundFlight: FlightData = {
        passenger_name: passengers[0]?.name || '',
        reservation_number: booking_reference,
        flight_number: outbound.flight_number || '',
        departure_airport: outbound.departure_airport || '',
        arrival_airport: outbound.arrival_airport || '',
        departure_date: outbound.departure_date || '',
        departure_time: outbound.departure_time || '',
        arrival_time: outbound.arrival_time || '',
        total_receipt: outboundPrice,
        purchased_date: purchasedDate,
        purchase_time: purchaseTime,
        departure_iata: outbound.departure_iata,
        arrival_iata: outbound.arrival_iata,
        flight_duration: outbound.flight_duration,
        is_direct: outbound.is_direct,
        passengers: passengers,
        booking_type: 'OUTBOUND',
        is_return_flight: false,
    };
    
    // Compose return flight if present
    let flights: FlightData[] = [outboundFlight];
    if (ret.flight_number || ret.departure_airport || ret.arrival_airport) {
        // Determine return flight price
        let returnPrice = total_receipt;
        if (ret.individual_price && ret.individual_price !== 'None') {
            returnPrice = ret.individual_price;
        }
        
        const returnFlight: FlightData = {
            ...outboundFlight,
            flight_number: ret.flight_number || '',
            departure_airport: ret.departure_airport || '',
            arrival_airport: ret.arrival_airport || '',
            departure_date: ret.departure_date || '',
            departure_time: ret.departure_time || '',
            arrival_time: ret.arrival_time || '',
            total_receipt: returnPrice,
            flight_duration: ret.flight_duration,
            is_direct: ret.is_direct,
            booking_type: 'RETURN',
            is_return_flight: true,
            departure_iata: ret.departure_iata,
            arrival_iata: ret.arrival_iata,
        };
        flights.push(returnFlight);
    }
    
    // Handle price assignment logic
    const hasIndividualPrices = (outbound.individual_price && outbound.individual_price !== 'None') || 
                               (ret.individual_price && ret.individual_price !== 'None');
    
    if (flights.length === 2 && total_receipt && !hasIndividualPrices) {
        // Only split total price if no individual prices were found
        if (!isNaN(Number(total_receipt.replace(/[^0-9.]/g, '')))) {
            const price = parseFloat(total_receipt.replace(/[^0-9.]/g, ''));
            const currency = total_receipt.replace(/[0-9.\s]/g, '').trim();
            const splitPrice = (price / 2).toFixed(2);
            flights[0].total_receipt = `${splitPrice} ${currency}`;
            flights[1].total_receipt = `${splitPrice} ${currency}`;
        }
    } else if (flights.length === 2 && hasIndividualPrices) {
        // If we have individual prices, use them
        if (outbound.individual_price && outbound.individual_price !== 'None') {
            flights[0].total_receipt = outbound.individual_price;
        }
        if (ret.individual_price && ret.individual_price !== 'None') {
            flights[1].total_receipt = ret.individual_price;
        }
        
        // If only one individual price is available, calculate the other
        if ((outbound.individual_price && outbound.individual_price !== 'None') && 
            (!ret.individual_price || ret.individual_price === 'None') && 
            total_receipt && !isNaN(Number(total_receipt.replace(/[^0-9.]/g, '')))) {
            
            const totalPrice = parseFloat(total_receipt.replace(/[^0-9.]/g, ''));
            const outboundPriceNum = parseFloat(outbound.individual_price.replace(/[^0-9.]/g, ''));
            const currency = total_receipt.replace(/[0-9.\s]/g, '').trim();
            const returnPriceNum = totalPrice - outboundPriceNum;
            flights[1].total_receipt = `${returnPriceNum.toFixed(2)} ${currency}`;
        } else if ((!outbound.individual_price || outbound.individual_price === 'None') && 
                   (ret.individual_price && ret.individual_price !== 'None') && 
                   total_receipt && !isNaN(Number(total_receipt.replace(/[^0-9.]/g, '')))) {
            
            const totalPrice = parseFloat(total_receipt.replace(/[^0-9.]/g, ''));
            const returnPriceNum = parseFloat(ret.individual_price.replace(/[^0-9.]/g, ''));
            const currency = total_receipt.replace(/[0-9.\s]/g, '').trim();
            const outboundPriceNum = totalPrice - returnPriceNum;
            flights[0].total_receipt = `${outboundPriceNum.toFixed(2)} ${currency}`;
        }
    }
    return flights;
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

        // Check if file is PDF or image
        const isPDF = file.type === 'application/pdf'
        const isImage = file.type.startsWith('image/')
        
        if (!isPDF && !isImage) {
            return NextResponse.json(
                { error: 'Unsupported file type. Please upload an image or PDF file.' },
                { status: 400 }
            )
        }

        let base64Data: string
        let mimeType: string

        if (isImage) {
            // Convert image file to base64
            const buffer = await file.arrayBuffer()
            base64Data = Buffer.from(buffer).toString('base64')
            mimeType = file.type
        } else {
            // For PDF files, convert to image using canvas on the server side
            // Since we can't use canvas on the server, we'll pass the PDF to the frontend
            // and convert it there, then send the image back
            // For now, we'll use a different approach - send PDF directly to Gemini
            const buffer = await file.arrayBuffer()
            base64Data = Buffer.from(buffer).toString('base64')
            mimeType = file.type
        }

        // Initialize Gemini 2.0 Flash model - optimized for OCR and text extraction
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', generationConfig: { temperature: 0 } })

        // Enhanced prompt for better OCR accuracy
        const prompt = `Extract text from this boarding pass or flight confirmation ${isPDF ? 'PDF document' : 'image'} with high precision.
Focus on these key details (mark as "None" if not found):

1. Booking reference number
2. Passenger names and types (Adult/Child/Infant)
3. Flight details:
   - Flight number with airline code (e.g., BA123, LH456)
   - From/To airports with IATA codes in parentheses
   - Dates in YYYY-MM-DD format
   - Times in 24-hour HH:mm format
   - Duration if shown
   - Individual flight price if shown separately
4. Pricing information:
   - Individual outbound flight price (if shown)
   - Individual return flight price (if shown)
   - Total cost with currency

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
Price: [AMOUNT] (if individual price shown)

Return Flight: (if exists)
Flight number: [CODE]
Departure airport: [NAME] ([IATA])
Arrival airport: [NAME] ([IATA])
Departure date: [YYYY-MM-DD]
Departure time: [HH:mm]
Arrival time: [HH:mm]
Duration: [XXh YYm]
Direct: Yes
Price: [AMOUNT] (if individual price shown)

Total receipt: [AMOUNT]

Return ONLY the extracted data in the exact format shown above. Use "None" for missing fields.
For unclear text, use OCR best practices to infer the most likely value.${isPDF ? ' If this is a multi-page PDF, focus on the first page containing the boarding pass information.' : ''}`

        // Create file part with enhanced settings for OCR
        const filePart: Part = {
            inlineData: {
                data: base64Data,
                mimeType: mimeType
            }
        }

        // Generate content with enhanced error handling
        const result = await model.generateContent([prompt, filePart])
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
        const extractedFlights = parseGeminiResponse(text)

        console.log('Parsed flight data:', JSON.stringify(extractedFlights, null, 2))

        // Use extractedFlights directly for response
        return NextResponse.json({
            flights: extractedFlights,
            raw_response: text,
            file_type: isPDF ? 'pdf' : 'image'
        })
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
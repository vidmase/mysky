import { NextRequest, NextResponse } from 'next/server'
import { getFlightStatusByNumberAndDate } from '@/src/lib/services/flight-status'

export const revalidate = 300 // 5 min SWR

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const flightNumber = searchParams.get('flightNumber') || 'BA117'
  const date = searchParams.get('date') || '2024-12-15' // Past date for actual times
  
  try {
    const data = await getFlightStatusByNumberAndDate(flightNumber, date, { dateLocalRole: 'Both' })
    
    if (!data || !data.length) {
      return NextResponse.json({ 
        error: 'No flight data found',
        example: {
          message: 'Try a different flight number or date. Example: ?flightNumber=FR8682&date=2024-12-15'
        }
      })
    }

    const flight = data[0]
    
    // Calculate delays manually to demonstrate the logic
    const calculateDelay = (scheduled: string | null, actual: string | null): number | null => {
      if (!scheduled || !actual) return null
      try {
        const scheduledTime = new Date(scheduled).getTime()
        const actualTime = new Date(actual).getTime()
        return Math.round((actualTime - scheduledTime) / (1000 * 60)) // minutes
      } catch {
        return null
      }
    }

    const depScheduled = flight.departure?.scheduledTimeLocal
    const depActual = flight.departure?.actualTimeLocal || flight.departure?.estimatedTimeLocal
    const arrScheduled = flight.arrival?.scheduledTimeLocal
    const arrActual = flight.arrival?.actualTimeLocal || flight.arrival?.estimatedTimeLocal

    const depDelay = calculateDelay(depScheduled, depActual)
    const arrDelay = calculateDelay(arrScheduled, arrActual)

    // Format the response to match your example
    const analysis = {
      flight: {
        number: flight.number,
        airline: flight.airline,
        status: flight.status || 'Unknown'
      },
      departure: {
        airport: flight.departure?.airport?.iata || 'Unknown',
        scheduledTimeLocal: depScheduled,
        actualTimeLocal: depActual,
        delayMinutes: depDelay,
        delayStatus: depDelay === null ? 'No actual data' : 
                    depDelay === 0 ? 'On time' :
                    depDelay > 0 ? `Delayed by ${depDelay} minutes` :
                    `Early by ${Math.abs(depDelay)} minutes`
      },
      arrival: {
        airport: flight.arrival?.airport?.iata || 'Unknown',
        scheduledTimeLocal: arrScheduled,
        actualTimeLocal: arrActual,
        delayMinutes: arrDelay,
        delayStatus: arrDelay === null ? 'No actual data' : 
                    arrDelay === 0 ? 'On time' :
                    arrDelay > 0 ? `Delayed by ${arrDelay} minutes` :
                    `Early by ${Math.abs(arrDelay)} minutes`
      },
      summary: {
        overallStatus: flight.status || 'Unknown',
        departureDelay: depDelay,
        arrivalDelay: arrDelay,
        explanation: {
          scheduled_vs_actual: "Compare scheduledTimeLocal with actualTimeLocal to get delay",
          calculation: "delay_minutes = (actual_time - scheduled_time) / 60000",
          positive_delay: "Positive minutes = Late departure/arrival",
          negative_delay: "Negative minutes = Early departure/arrival",
          zero_delay: "Zero minutes = On time"
        }
      },
      rawApiResponse: flight
    }

    return NextResponse.json(analysis)
  } catch (e: any) {
    return NextResponse.json({ 
      error: e?.message || 'Failed to fetch flight status',
      suggestion: 'Try a past flight date (e.g., 2024-12-15) to see actual vs scheduled times'
    }, { status: 500 })
  }
}

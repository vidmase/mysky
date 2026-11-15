import { parseRyanairItinerary } from '@/lib/ryanair-itinerary'
import { readEasyJetConfirmation } from './easyjet'
import { readWizzItinerary } from './wizz'
import type { EmailBooking } from './types'

export type { EmailBooking, EmailLeg } from './types'

/**
 * The emails worth reading: booking confirmations from the three airlines
 * with an exact reader. Reminders, check-in nudges and marketing from the
 * same senders are left out by subject, so they never reach a reader.
 */
export const FLIGHT_EMAIL_QUERY =
  '(from:itinerary@ryanair.com subject:itinerary) OR ' +
  '(from:noreply@wizzair.com subject:"travel itinerary") OR ' +
  '(from:donotreply@easyjet.com subject:"booking reference")'

/**
 * The booking in a confirmation email, read by the reader for its sender.
 * Null means no reader recognised it; the caller reports it and never saves it.
 */
export function readFlightEmail(sender: string, subject: string, body: string): EmailBooking | null {
  const from = sender.toLowerCase()
  const text = `${subject}\n\n${body}`

  if (from.includes('ryanair.com')) {
    const it = parseRyanairItinerary(text)
    return it
      ? { airline: 'Ryanair', reader: 'ryanair-itinerary', reservation_number: it.reservation_number, legs: it.legs, passenger_name: it.passenger_name, total_receipt: it.total_receipt }
      : null
  }
  if (from.includes('wizzair.com')) return readWizzItinerary(text)
  if (from.includes('easyjet.com')) return readEasyJetConfirmation(text)
  return null
}

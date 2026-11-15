import { allAirports } from '@/lib/airports'
import { flattenEmailText, hhmm, isoFromParts, nextDay, uniqueLegs, type EmailBooking, type EmailLeg } from './types'

// easyJet "easyJet booking reference: XXXXXXX" emails (2024-now):
//   Payment to easyJet of £56.98 by Mastercard on 10/01/2026 ...
//   Passenger & Flight details 1 of 2 Bristol to Barcelona (Terminal 2C) EZY2703
//   Departs: Sat 21 Mar 2026 07:15 Arrives: Sat 21 Mar 2026 10:20 ...
// easyJet names airports but never gives their codes, so a name is accepted
// only when it identifies exactly one airport; otherwise the email is refused.

const LEG = /Passenger & Flight details \d+ of \d+ (.{2,80}?) to (.{2,80}?) (EZY ?\d{1,4}) Departs: \w{3} (\d{1,2}) ([A-Za-z]{3}) (\d{4}) (\d{1,2}:\d{2}) Arrives: \w{3} (\d{1,2}) ([A-Za-z]{3}) (\d{4}) (\d{1,2}:\d{2})/g

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

/** "Barcelona (Terminal 2C)" to BCN, or null when the name is unknown or ambiguous. */
export function airportFromEasyJetName(name: string): { iata: string; name: string } | null {
  const bare = norm(name.replace(/\([^)]*\)/g, ''))
  if (!bare) return null
  const byName = allAirports.filter((a) => norm(a.name) === bare)
  if (byName.length === 1) return { iata: byName[0].iata, name: name.trim() }
  // A city alone ("Barcelona") is accepted only when it has a single airport;
  // "London" has six and must never be resolved by guessing.
  const byCity = allAirports.filter((a) => norm(a.city) === bare)
  if (byName.length === 0 && byCity.length === 1) return { iata: byCity[0].iata, name: name.trim() }
  return null
}

const SYMBOL_TO_CODE: Record<string, string> = { '£': 'GBP', '€': 'EUR', '$': 'USD' }

export function readEasyJetConfirmation(raw: string): EmailBooking | null {
  const t = flattenEmailText(raw)
  const ref = /booking reference:?\s*([A-Z0-9]{7})\b/i.exec(t) || /details for your booking \(?([A-Z0-9]{7})\b/i.exec(t)
  if (!ref) return null

  const legs: EmailLeg[] = []
  for (const m of t.matchAll(LEG)) {
    const from = airportFromEasyJetName(m[1])
    const to = airportFromEasyJetName(m[2])
    const depDate = isoFromParts(m[4], m[5], m[6])
    const arrDate = isoFromParts(m[8], m[9], m[10])
    // One unknown airport makes the whole email unreliable: refuse it rather
    // than save a booking with a leg missing.
    if (!from || !to || !depDate || !arrDate) return null
    legs.push({
      flight_number: m[3].replace(/\s+/g, ''),
      departure_iata: from.iata,
      arrival_iata: to.iata,
      departure_airport: from.name,
      arrival_airport: to.name,
      departure_date: depDate,
      arrival_date: arrDate < depDate ? nextDay(depDate) : arrDate,
      departure_time: hhmm(m[7]),
      arrival_time: hhmm(m[11]),
    })
  }
  if (!legs.length) return null

  // Every payment counts: extras bought later arrive as further payments.
  const payments = Array.from(t.matchAll(/Payment to easyJet of ([£€$])(\d[\d,]*\.\d{2})/g))
  const currencies = new Set(payments.map((p) => p[1]))
  const total =
    payments.length && currencies.size === 1
      ? `${SYMBOL_TO_CODE[payments[0][1]]} ${payments.reduce((s, p) => s + Number(p[2].replace(/,/g, '')), 0).toFixed(2)}`
      : null

  const names = new Set<string>()
  for (const m of t.matchAll(/\b(Mr|Mrs|Ms|Miss|Mstr|child|infant) ([A-Z][A-Z'\-]+(?: [A-Z][A-Z'\-]+)+) (?=\1 )/g)) {
    names.add(`${m[1]} ${m[2]}`)
  }

  return {
    airline: 'easyJet',
    reader: 'easyjet-confirmation',
    reservation_number: ref[1].toUpperCase(),
    legs: uniqueLegs(legs),
    passenger_name: names.size ? Array.from(names).join(', ') : null,
    total_receipt: total,
  }
}

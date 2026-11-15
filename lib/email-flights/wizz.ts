import { flattenEmailText, hhmm, isoFromParts, uniqueLegs, type EmailBooking, type EmailLeg } from './types'

// Wizz Air "Your travel itinerary: XXXXXX" emails (2018-now):
//   Flight confirmation code: DLZEGZ ... Flight details GOING OUT Flight Number: W6 1913
//   Departs from: Arrives to: Vilnius (VNO) Barcelona El Prat - Terminal 2 (BCN)
//   21/03/2026 06:00 21/03/2026 08:35 COMING BACK Flight Number: W6 1914 ...
// Payments can include declined attempts, so the price is the "Grand total".

const LEG = /Flight Number:\s*([A-Z0-9]{2}) ?(\d{1,4})\s+Departs from:\s*Arrives to:\s*(.{2,80}?)\s*\(([A-Z]{3})\)\s*(.{2,80}?)\s*\(([A-Z]{3})\)\s*(\d{2})\/(\d{2})\/(\d{4}) (\d{1,2}:\d{2})\s+(\d{2})\/(\d{2})\/(\d{4}) (\d{1,2}:\d{2})/g

const PASSENGER = /\b(MR|MRS|MS|MISS|CHD|INF) ([A-Z][A-Za-z'\-]+(?: [A-Z][A-Za-z'\-]+)+?) [A-Z]{3}-[A-Z]{3}\b/g

export function readWizzItinerary(raw: string): EmailBooking | null {
  const t = flattenEmailText(raw)
  const ref = /Flight confirmation code:\s*([A-Z0-9]{6})\b/.exec(t)
  if (!ref) return null

  const legs: EmailLeg[] = []
  for (const m of t.matchAll(LEG)) {
    const depDate = isoFromParts(m[7], m[8], m[9])
    const arrDate = isoFromParts(m[11], m[12], m[13])
    if (!depDate || !arrDate) continue
    legs.push({
      flight_number: `${m[1]}${m[2]}`,
      departure_airport: m[3].trim(),
      departure_iata: m[4],
      arrival_airport: m[5].trim(),
      arrival_iata: m[6],
      departure_date: depDate,
      arrival_date: arrDate,
      departure_time: hhmm(m[10]),
      arrival_time: hhmm(m[14]),
    })
  }
  if (!legs.length) return null

  const names = new Set<string>()
  for (const m of t.matchAll(PASSENGER)) names.add(`${m[1]} ${m[2]}`)

  const total = /Grand total\s+(\d[\d,]*(?:\.\d{1,2})?)\s*([A-Z]{3})\b/.exec(t)

  return {
    airline: 'Wizz Air',
    reader: 'wizz-itinerary',
    reservation_number: ref[1],
    legs: uniqueLegs(legs),
    passenger_name: names.size ? Array.from(names).join(', ') : null,
    total_receipt: total ? `${total[2]} ${Number(total[1].replace(/,/g, '')).toFixed(2)}` : null,
  }
}

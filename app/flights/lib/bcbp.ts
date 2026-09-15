/**
 * The IATA bar coded boarding pass string (Resolution 792), built from a filed
 * row.
 *
 * A printed pass carries this as a PDF417 symbol, which is what makes it
 * scannable. The format lays its fields out at fixed widths, and three of them
 * — the compartment, the check-in sequence number and the passenger status —
 * were never filed against these flights and cannot be recovered after the
 * fact. They are left blank rather than filled with a plausible value: a symbol
 * that decodes to a seat that was never assigned would be worse than one that
 * admits it does not know.
 */

/** Every field in the format is an exact width, padded or cut to fit. */
function fixed(value: string, width: number): string {
  return value.slice(0, width).padEnd(width, " ")
}

/** Only A-Z, digits and a few separators survive into the symbol. */
function clean(value?: string | null): string {
  return (value || "").toUpperCase().replace(/[^A-Z0-9/ ]/g, "")
}

/** SURNAME/FIRSTNAME, which is how the format writes a passenger. */
function bcbpName(name?: string | null): string {
  const filed = clean(name).trim().replace(/\s+/g, " ")
  if (!filed) return ""
  if (filed.includes("/")) return filed
  const parts = filed.split(" ")
  if (parts.length < 2) return parts[0]
  // The log files "FIRST LAST"; the format wants the surname first.
  const surname = parts[parts.length - 1]
  return `${surname}/${parts.slice(0, -1).join(" ")}`
}

/** The day of the year, which is how the format writes a date. */
function julianDay(date: string): string | null {
  const when = new Date(date)
  if (isNaN(when.getTime())) return null
  const start = Date.UTC(when.getUTCFullYear(), 0, 0)
  const day = Math.floor((Date.UTC(when.getUTCFullYear(), when.getUTCMonth(), when.getUTCDate()) - start) / 86400000)
  return String(day).padStart(3, "0")
}

/** Four digits and a suffix letter: FR2145 becomes "2145 ", LS87 becomes "0087 ". */
function flightField(flightNumber?: string | null): string | null {
  const match = clean(flightNumber).match(/(\d{1,4})([A-Z]?)\s*$/)
  if (!match) return null
  return match[1].padStart(4, "0") + (match[2] || " ")
}

/** Row and letter as three digits and a letter: 14A becomes "014A". */
function seatField(seat?: string | null): string {
  const match = clean(seat).match(/(\d{1,3})([A-Z])/)
  if (!match) return "    "
  return match[1].padStart(3, "0") + match[2]
}

export type CodeFlight = {
  passenger?: string | null
  pnr?: string | null
  from: string
  to: string
  carrier?: string | null
  flightNumber?: string | null
  departureDate?: string | null
  seat?: string | null
}

/**
 * The 60 mandatory characters of a single-leg M1 pass, or null when the row
 * does not hold enough to say anything true.
 */
export function buildBcbp(flight: CodeFlight): string | null {
  const pnr = clean(flight.pnr).trim()
  const date = flight.departureDate ? julianDay(flight.departureDate) : null
  const flightNo = flightField(flight.flightNumber)
  if (!pnr || !date || !flightNo) return null

  return (
    "M1" +
    fixed(bcbpName(flight.passenger), 20) +
    "E" + // an electronic ticket: everything in the log was bought as one
    fixed(pnr, 7) +
    fixed(clean(flight.from), 3) +
    fixed(clean(flight.to), 3) +
    fixed(clean(flight.carrier), 3) +
    flightNo +
    date +
    " " + // compartment: not filed
    seatField(flight.seat) +
    "     " + // check-in sequence: not filed
    " " + // passenger status: not filed
    "00" // nothing conditional follows
  )
}


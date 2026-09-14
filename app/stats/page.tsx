"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useToast } from '@/hooks/use-toast'
import Link from "next/link"
import { RefreshCcw, Sparkles } from "lucide-react"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts"
import { PaperNav } from "@/app/components/paper-nav"
import { groupFlightsIntoBookings } from "@/lib/statistics/booking-spend"
import {
  AIRPORT_BY_IATA,
  countryForIata,
  detectMoneyPrefix,
  legHours,
} from "@/lib/statistics/leg-metrics"
import s from "./stats.module.css"

type Flight = {
  id: string | number
  departure_country: string | null
  arrival_country: string | null
  departure_date: string | null
  airline: string | null
  departure_iata?: string | null
  arrival_iata?: string | null
  departure_airport?: string | null
  arrival_airport?: string | null
  departure_latitude?: number | string | null
  departure_longitude?: number | string | null
  arrival_latitude?: number | string | null
  arrival_longitude?: number | string | null
  departure_time?: string | null
  arrival_time?: string | null
  reservation_number?: string | null
  total_receipt?: string | null
  extras_receipt?: string | null
  cancelled?: boolean | null
  calculated_duration?: string | null
  flight_duration?: string | null
}

/* ------------------------------------------------------------------
   CHART COLOUR
   Every quantity on this page is a single measure, so it is printed in
   one hue — vermillion, the stock's only accent. Identity (which
   airline) is the sole categorical job, and it uses the fixed order
   below; slots are never cycled, so a sixth airline folds into OTHER
   rather than repeating a hue.

   The theme was checked with the dataviz validator against the paper
   surface (#f2ece1, all pairs). It passes the lightness band, chroma
   floor, normal-vision floor and CVD separation. Two warnings stand
   and are discharged in the markup, not dismissed:
     · brass sits at 2.3:1 against the stock — every slice therefore
       carries a written legend entry with its count;
     · mulberry/blue separate by ΔE 7.7 under deuteranopia, inside the
       6–8 floor band that is legal only with a secondary encoding —
       hence the legend plus a 2px stock gap between slices.
   ------------------------------------------------------------------ */
const SERIES = ['#ce3b1e', '#1f6fb0', '#8e4a86', '#2f8f68', '#c9942f']
const OTHER = '#8c8071'

const VERMILLION = '#ce3b1e'
const INK = '#17130e'
const INK_3 = '#8c8071'
const RULE = 'rgba(23, 19, 14, 0.16)'

/** Fixed-order hue for a slot; anything past the theme is deliberately neutral. */
const seriesColor = (index: number) => SERIES[index] ?? OTHER

/** Recessive axis styling, shared by every figure on the page. */
const AXIS = {
  stroke: INK_3,
  fontSize: 9,
  tickLine: false,
  axisLine: false,
  style: { fontFamily: 'var(--code)', letterSpacing: '0.08em' },
} as const

// Animated counter hook
const useCountUp = (value: number | undefined, duration = 2000) => {
  const [display, setDisplay] = useState<number>(0)
  const startRef = useRef<number | null>(null)
  const fromRef = useRef<number>(0)
  const target = typeof value === "number" ? value : 0

  useEffect(() => {
    fromRef.current = display
    startRef.current = null
    let raf = 0
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts
      const p = Math.min(1, (ts - startRef.current) / duration)
      const eased = 1 - Math.pow(1 - p, 4)
      setDisplay(fromRef.current + (target - fromRef.current) * eased)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return Math.round(display)
}

/** One cell of the headline ledger, counted up on load. */
const LedgerCell = ({ label, value, hot = false }: { label: string; value: number; hot?: boolean }) => {
  const animated = useCountUp(value, 1600)
  return (
    <div className={s.ledgerCell}>
      <dt className={s.ledgerLabel}>{label}</dt>
      <dd className={`${s.ledgerValue} ${hot ? s.ledgerValueHot : ''}`}>
        {animated.toLocaleString()}
      </dd>
    </div>
  )
}

/** Every block on the page is a numbered plate, the way a report sets figures. */
const Figure = ({
  n,
  title,
  children,
  note,
}: {
  n: string
  title: string
  children: React.ReactNode
  note?: string
}) => (
  <section className={s.figure}>
    <header className={s.figureHead}>
      <h2 className={s.figureTitle}>{title}</h2>
      <span className={s.figureNo}>{n}</span>
    </header>
    <div className={s.figureBody}>
      {children}
      {note && <p className={s.figureNote}>{note}</p>}
    </div>
  </section>
)

export default function StatsPage() {
  const [flights, setFlights] = useState<Flight[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchFlights = async () => {
    setIsRefreshing(true)
    setLoading(true)
    try {
      const res = await fetch('/api/flights')
      if (!res.ok) {
        if (res.status === 401) {
          toast({
            title: 'Authentication required',
            description: 'Please log in to view your flight statistics.',
            variant: 'destructive'
          })
          setIsRefreshing(false)
          setLoading(false)
          return
        }
        throw new Error('Failed to load flights')
      }

      const responseData = await res.json()
      const vidmaFlights = responseData.data || responseData || []


      if (Array.isArray(vidmaFlights)) {
        console.log(`[Stats] Loaded ${vidmaFlights.length} flights`)
        // Transform the data to ensure all fields are properly typed
        const transformedFlights: Flight[] = vidmaFlights.map((f: any) => {
          const depIata = (f.departure_iata || "").toUpperCase() || null
          const arrIata = (f.arrival_iata || "").toUpperCase() || null
          const depMeta = depIata ? AIRPORT_BY_IATA.get(depIata) : undefined
          const arrMeta = arrIata ? AIRPORT_BY_IATA.get(arrIata) : undefined
          const depLat = f.departure_latitude != null ? Number(f.departure_latitude) : (depMeta?.coordinates?.[1] ?? null)
          const depLon = f.departure_longitude != null ? Number(f.departure_longitude) : (depMeta?.coordinates?.[0] ?? null)
          const arrLat = f.arrival_latitude != null ? Number(f.arrival_latitude) : (arrMeta?.coordinates?.[1] ?? null)
          const arrLon = f.arrival_longitude != null ? Number(f.arrival_longitude) : (arrMeta?.coordinates?.[0] ?? null)
          return {
            id: f.id,
            departure_country: countryForIata(depIata, f.departure_country),
            arrival_country: countryForIata(arrIata, f.arrival_country),
            departure_date: f.departure_date || null,
            airline: f.airline || null,
            departure_iata: depIata,
            arrival_iata: arrIata,
            departure_airport: f.departure_airport || depMeta?.name || null,
            arrival_airport: f.arrival_airport || arrMeta?.name || null,
            departure_latitude: depLat != null && !Number.isNaN(depLat) ? depLat : null,
            departure_longitude: depLon != null && !Number.isNaN(depLon) ? depLon : null,
            arrival_latitude: arrLat != null && !Number.isNaN(arrLat) ? arrLat : null,
            arrival_longitude: arrLon != null && !Number.isNaN(arrLon) ? arrLon : null,
            departure_time: f.departure_time || null,
            arrival_time: f.arrival_time || null,
            reservation_number: f.reservation_number || null,
            total_receipt: f.total_receipt || null,
            extras_receipt: f.extras_receipt || null,
            cancelled: f.cancelled ?? null,
            calculated_duration: f.calculated_duration || null,
            flight_duration: f.flight_duration || null,
          }
        })
        setFlights(transformedFlights)
        console.log(`[Stats] Transformed ${transformedFlights.length} flights`)
      } else {
        console.log('[Stats] No flights found')
        setFlights([])
      }

      setLastUpdate(new Date())
    } catch (error) {
      console.error('[Stats] Unexpected error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load flights',
        variant: 'destructive'
      })
    } finally {
      setIsRefreshing(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchFlights()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Process chart data
  const chartData = useMemo(() => {
    // Airlines
    const byAirline = new Map<string, number>()
    for (const f of flights) {
      const k = f.airline || "Unknown"
      byAirline.set(k, (byAirline.get(k) || 0) + 1)
    }
    const airlineRanked = Array.from(byAirline.entries())
      .map(([airline, count]) => ({ airline, count }))
      .sort((a, b) => b.count - a.count)

    // The theme has five identity slots and they are never cycled, so the tail
    // becomes a single neutral "Other" rather than a repeated hue.
    const airlineData =
      airlineRanked.length > SERIES.length
        ? [
          ...airlineRanked.slice(0, SERIES.length),
          {
            airline: 'Other',
            count: airlineRanked
              .slice(SERIES.length)
              .reduce((sum, a) => sum + a.count, 0),
          },
        ]
        : airlineRanked
    const airlinesFolded = Math.max(0, airlineRanked.length - SERIES.length)

    // Years
    const byYear = new Map<string, number>()
    for (const f of flights) {
      if (!f.departure_date) continue
      try {
        const date = new Date(f.departure_date)
        if (isNaN(date.getTime())) continue
        const y = date.getFullYear().toString()
        byYear.set(y, (byYear.get(y) || 0) + 1)
      } catch {
        continue
      }
    }
    const flightsByYear = Array.from(byYear.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year.localeCompare(b.year))

    // Months
    const byMonth = new Map<number, number>()
    for (const f of flights) {
      if (!f.departure_date) continue
      try {
        const date = new Date(f.departure_date)
        if (isNaN(date.getTime())) continue
        const m = date.getMonth()
        byMonth.set(m, (byMonth.get(m) || 0) + 1)
      } catch {
        continue
      }
    }
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const flightsByMonth = monthNames.map((name, idx) => ({
      month: name,
      count: byMonth.get(idx) || 0
    }))

    // Countries
    const countryCounts = new Map<string, number>()
    for (const f of flights) {
      if (f.departure_country) countryCounts.set(f.departure_country, (countryCounts.get(f.departure_country) || 0) + 1)
      if (f.arrival_country) countryCounts.set(f.arrival_country, (countryCounts.get(f.arrival_country) || 0) + 1)
    }
    const countryData = Array.from(countryCounts.entries())
      .map(([country, visits]) => ({ country, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 12)

    // Top airports
    const airportCounts = new Map<string, { count: number; name: string }>()
    for (const f of flights) {
      if (f.departure_iata) {
        const prev = airportCounts.get(f.departure_iata) || { count: 0, name: f.departure_airport || '' }
        airportCounts.set(f.departure_iata, { count: prev.count + 1, name: prev.name || f.departure_airport || '' })
      }
      if (f.arrival_iata) {
        const prev = airportCounts.get(f.arrival_iata) || { count: 0, name: f.arrival_airport || '' }
        airportCounts.set(f.arrival_iata, { count: prev.count + 1, name: prev.name || f.arrival_airport || '' })
      }
    }
    const topAirports = Array.from(airportCounts.entries())
      .map(([iata, data]) => ({ iata, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    // Top routes
    const routeCounts = new Map<string, number>()
    for (const f of flights) {
      if (f.departure_iata && f.arrival_iata) {
        const key = `${f.departure_iata} → ${f.arrival_iata}`
        routeCounts.set(key, (routeCounts.get(key) || 0) + 1)
      }
    }
    const topRoutes = Array.from(routeCounts.entries())
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Spending is counted per booking reference, not per leg: a return trip repeats
    // the same total fare on both of its rows.
    // A booking with no fare on any leg is still a booking; it just cannot be
    // spent against, so the priced ones are what the money figures work from.
    // A cancelled booking keeps its fare on the ticket but never reached a
    // spending figure: the trip did not happen.
    const pricedBookings = groupFlightsIntoBookings(flights).filter(
      (b): b is typeof b & { total: number } => b.total != null && !b.cancelled
    )

    // Spending by year
    const spendingByYear = new Map<string, { total: number; count: number }>()
    for (const b of pricedBookings) {
      if (!b.departure_date) continue
      const date = new Date(b.departure_date)
      if (isNaN(date.getTime())) continue
      const y = date.getFullYear().toString()
      const existing = spendingByYear.get(y) || { total: 0, count: 0 }
      spendingByYear.set(y, { total: existing.total + b.total, count: existing.count + 1 })
    }
    const spendingByYearData = Array.from(spendingByYear.entries())
      .map(([year, data]) => ({ year, total: Math.round(data.total * 100) / 100, count: data.count, avg: Math.round((data.total / data.count) * 100) / 100 }))
      .sort((a, b) => a.year.localeCompare(b.year))

    // Spending by airline
    const spendingByAirline = new Map<string, { total: number; count: number }>()
    for (const b of pricedBookings) {
      const airline = b.airline
      if (!airline) continue
      const existing = spendingByAirline.get(airline) || { total: 0, count: 0 }
      spendingByAirline.set(airline, { total: existing.total + b.total, count: existing.count + 1 })
    }
    const spendingByAirlineData = Array.from(spendingByAirline.entries())
      .map(([airline, data]) => ({ airline, total: Math.round(data.total * 100) / 100, count: data.count, avg: Math.round((data.total / data.count) * 100) / 100 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    // Calculate total spending
    let totalSpent = 0
    let minPrice = Infinity
    let maxPrice = 0
    // Extras are a slice of totalSpent, not a sum alongside it: the fare on the
    // confirmation already includes the seats and bags. So this is counted to be
    // reported as "of which", and never added to the total.
    let totalExtras = 0
    let bookingsWithExtras = 0

    for (const b of pricedBookings) {
      totalSpent += b.total
      minPrice = Math.min(minPrice, b.total)
      maxPrice = Math.max(maxPrice, b.total)
      if (b.extras != null) {
        totalExtras += b.extras
        bookingsWithExtras++
      }
    }
    const bookingsWithPrice = pricedBookings.length

    const spendingStats = {
      totalSpent: Math.round(totalSpent * 100) / 100,
      totalExtras: Math.round(totalExtras * 100) / 100,
      bookingsWithExtras,
      bookingsWithPrice,
      avgPerBooking: bookingsWithPrice > 0 ? Math.round((totalSpent / bookingsWithPrice) * 100) / 100 : 0,
      minPrice: minPrice === Infinity ? 0 : Math.round(minPrice * 100) / 100,
      maxPrice: Math.round(maxPrice * 100) / 100,
      spendingByYear: spendingByYearData,
      spendingByAirline: spendingByAirlineData
    }

    return {
      airlineData,
      airlinesFolded,
      flightsByYear,
      flightsByMonth,
      countryData,
      topAirports,
      topRoutes,
      spendingStats,
    }
  }, [flights])

  // Calculate stats
  const calculatedStats = useMemo(() => {
    if (!flights.length) return null

    const num = (v: unknown) => (v == null ? undefined : Number(v))
    const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const toRad = (x: number) => (x * Math.PI) / 180
      const R = 6371
      const dLat = toRad(lat2 - lat1)
      const dLon = toRad(lon2 - lon1)
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
      return R * 2 * Math.asin(Math.sqrt(a))
    }
    const implausible: string[] = []

    const airportSet = new Set<string>()
    const countrySet = new Set<string>()
    const routeSet = new Set<string>()
    let totalKm = 0
    let totalHours = 0

    for (const f of flights) {
      if (f.departure_iata) airportSet.add(f.departure_iata)
      if (f.arrival_iata) airportSet.add(f.arrival_iata)
      if (f.departure_country) countrySet.add(f.departure_country)
      if (f.arrival_country) countrySet.add(f.arrival_country)
      if (f.departure_iata && f.arrival_iata) {
        routeSet.add([f.departure_iata, f.arrival_iata].sort().join('-'))
      }

      const depLat = num(f.departure_latitude)
      const depLon = num(f.departure_longitude)
      const arrLat = num(f.arrival_latitude)
      const arrLon = num(f.arrival_longitude)
      let dist: number | null = null
      if (depLat != null && depLon != null && arrLat != null && arrLon != null &&
        !Number.isNaN(depLat) && !Number.isNaN(depLon) && !Number.isNaN(arrLat) && !Number.isNaN(arrLon)) {
        dist = haversine(depLat, depLon, arrLat, arrLon)
        totalKm += dist
      }
      // Recorded duration when plausible (at most 20h), otherwise the distance estimate.
      const leg = legHours(f, dist)
      if (leg.implausible != null) {
        implausible.push(`${f.departure_iata || '???'}-${f.arrival_iata || '???'} ${f.departure_date || ''} (${leg.implausible.toFixed(1)}h)`)
      }
      if (leg.hours != null) totalHours += leg.hours
    }

    // Silently dropping a bad row would hide the mistake in the record itself.
    if (implausible.length) {
      console.warn(
        `[Stats] ${implausible.length} leg(s) have an impossible recorded duration and were estimated from distance instead:`,
        implausible
      )
    }

    // Calculate years of flying
    const years = flights
      .map(f => {
        if (!f.departure_date) return 0
        try {
          const date = new Date(f.departure_date)
          return isNaN(date.getTime()) ? 0 : date.getFullYear()
        } catch {
          return 0
        }
      })
      .filter(y => y > 0)
    const yearsFlying = years.length ? Math.max(...years) - Math.min(...years) + 1 : 0

    return {
      totalFlights: flights.length,
      totalAirports: airportSet.size,
      totalCountries: countrySet.size,
      totalRoutes: routeSet.size,
      totalKilometers: Math.round(totalKm),
      hoursInAir: Math.round(totalHours),
      yearsFlying,
      earthCircumnavigations: totalKm / 40075
    }
  }, [flights])

  const viewStats = stats ?? calculatedStats

  const formatNumber = (value?: number) =>
    typeof value === 'number' ? value.toLocaleString() : '—'

  const timeAgo = (d?: Date | null) => {
    if (!d) return "—"
    const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
    if (sec < 60) return `${sec}s ago`
    const m = Math.floor(sec / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    return `${h}h ago`
  }

  const moneyPrefix = useMemo(
    () => detectMoneyPrefix(flights.map((f) => f.total_receipt)),
    [flights]
  )

  const money = (v: number) =>
    `${moneyPrefix}${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Every figure hands its hover state to the same printed card.
  const LegTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const n = payload[0].value as number
    return (
      <div className={s.tip}>
        <div className={s.tipLabel}>{label ?? payload[0].name}</div>
        <div className={s.tipValue}>{n.toLocaleString()} {n === 1 ? 'leg' : 'legs'}</div>
      </div>
    )
  }

  const SpendTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload as { year: string; total: number; count: number; avg: number }
    return (
      <div className={s.tip}>
        <div className={s.tipLabel}>{d.year}</div>
        <div className={s.tipValue}>{money(d.total)}</div>
        <div className={s.tipNote}>
          {d.count} {d.count === 1 ? 'booking' : 'bookings'} · {money(d.avg)} each
        </div>
      </div>
    )
  }

  const spend = chartData.spendingStats
  const maxAirport = chartData.topAirports[0]?.count || 1
  const maxAirlineSpend = spend.spendingByAirline[0]?.total || 1
  const maxCountry = chartData.countryData[0]?.visits || 1

  return (
    <div className={s.page}>
      <div className={s.shell}>
        <PaperNav />
      </div>

      <header className={s.shell}>
        <div className={s.masthead}>
          <div className={s.mastheadCopy}>
            <p className={`${s.stamp} ${s.tag} ${s.rise}`} style={{ animationDelay: '40ms' }}>
              <span />
              <span>Section 04 · The numbers</span>
            </p>
            <h1 className={`${s.title} ${s.rise}`} style={{ animationDelay: '110ms' }}>
              What it all <em>adds up to</em>
            </h1>
            <p className={`${s.lede} ${s.rise}`} style={{ animationDelay: '200ms' }}>
              {viewStats?.yearsFlying || 0} years of flying, {flights.length} legs filed.
              Distance uses great-circle airport coordinates. Hours prefer recorded
              flight duration when available, otherwise a distance-based estimate.
            </p>
          </div>

          <div className={`${s.mastheadActions} ${s.rise}`} style={{ animationDelay: '280ms' }}>
            {flights.length > 0 && (
              <Link href="/stats/review" className={s.btnSolid}>
                <Sparkles />
                Year in review
              </Link>
            )}
            <button
              type="button"
              onClick={fetchFlights}
              disabled={isRefreshing}
              className={s.btnOutline}
            >
              <RefreshCcw className={isRefreshing ? s.spin : undefined} />
              {isRefreshing ? 'Drawing' : 'Redraw'}
            </button>
            <span className={s.drawnAt}>Drawn {timeAgo(lastUpdate)}</span>
          </div>
        </div>
      </header>

      <main className={s.shell}>
        {loading && !flights.length ? (
          <div className={s.state}>
            <h2 className={s.stateTitle}>Counting the log</h2>
            <p className={s.stateNote}>One moment.</p>
          </div>
        ) : !flights.length ? (
          <div className={s.state}>
            <h2 className={s.stateTitle}>Nothing filed yet</h2>
            <p className={s.stateNote}>
              File a leg or two and the abstract below will fill itself in.
            </p>
          </div>
        ) : (
          <>
            {/* ── HEADLINE LEDGER ─────────────────────────── */}
            <dl className={s.ledger}>
              <LedgerCell label="Legs filed" value={viewStats?.totalFlights || 0} hot />
              <LedgerCell label="Airports" value={viewStats?.totalAirports || 0} />
              <LedgerCell label="Countries" value={viewStats?.totalCountries || 0} />
              <LedgerCell label="Pairs" value={viewStats?.totalRoutes || 0} />
            </dl>

            {/* ── DISTANCE & TIME ─────────────────────────── */}
            <div className={`${s.grid} ${s.grid2}`}>
              <Figure n="Fig. 1" title="Distance covered">
                <p className={s.hero}>
                  {formatNumber(viewStats?.totalKilometers)}
                  <span className={s.heroUnit}>km</span>
                </p>
                <p className={s.heroGloss}>
                  {(viewStats?.earthCircumnavigations || 0).toFixed(1)} times around the
                  Earth at the equator.
                </p>
                <div className={s.meter}>
                  <div
                    className={s.meterFill}
                    style={{
                      width: `${Math.min(((viewStats?.earthCircumnavigations || 0) / 10) * 100, 100)}%`,
                    }}
                  />
                </div>
                <div className={s.meterScale}>
                  <span>0×</span>
                  <span>10× the equator</span>
                </div>
              </Figure>

              <Figure n="Fig. 2" title="Time aloft">
                <p className={s.hero}>
                  {formatNumber(viewStats?.hoursInAir)}
                  <span className={s.heroUnit}>hours</span>
                </p>
                <p className={s.heroGloss}>
                  Roughly {Math.floor((viewStats?.hoursInAir || 0) / 24)} whole days
                  spent in the air.
                </p>
                <div className={s.split}>
                  <div className={s.splitCell}>
                    <div className={s.splitLabel}>Days</div>
                    <div className={s.splitValue}>
                      {Math.floor((viewStats?.hoursInAir || 0) / 24)}
                    </div>
                  </div>
                  <div className={s.splitCell}>
                    <div className={s.splitLabel}>Hours</div>
                    <div className={s.splitValue}>{(viewStats?.hoursInAir || 0) % 24}</div>
                  </div>
                </div>
              </Figure>
            </div>

            {/* ── OVER TIME ───────────────────────────────── */}
            <div className={`${s.grid} ${s.grid2}`}>
              <Figure n="Fig. 3" title="Legs flown, by year">
                <div className={s.chart}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.flightsByYear} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke={RULE} strokeDasharray="2 4" vertical={false} />
                      <XAxis dataKey="year" {...AXIS} />
                      <YAxis allowDecimals={false} {...AXIS} />
                      <Tooltip
                        content={<LegTooltip />}
                        cursor={{ stroke: INK, strokeWidth: 1, strokeDasharray: '3 3' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke={VERMILLION}
                        strokeWidth={2}
                        fill={VERMILLION}
                        fillOpacity={0.12}
                        dot={{ r: 2.5, fill: VERMILLION, stroke: 'none' }}
                        activeDot={{ r: 4.5, fill: VERMILLION, stroke: '#fbf7ef', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Figure>

              <Figure n="Fig. 4" title="Which months you fly">
                <div className={s.chart}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={chartData.flightsByMonth} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke={RULE} strokeDasharray="2 4" vertical={false} />
                      <XAxis dataKey="month" {...AXIS} />
                      <YAxis allowDecimals={false} {...AXIS} />
                      <Tooltip content={<LegTooltip />} cursor={{ fill: 'rgba(23, 19, 14, 0.05)' }} />
                      <Bar dataKey="count" fill={VERMILLION} radius={0} maxBarSize={26} />
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>
              </Figure>
            </div>

            {/* ── AIRLINES / AIRPORTS / PAIRS ─────────────── */}
            <div className={`${s.grid} ${s.grid3}`}>
              <Figure
                n="Fig. 5"
                title="Who flew you"
                note={
                  chartData.airlinesFolded > 0
                    ? `${chartData.airlinesFolded} further ${chartData.airlinesFolded === 1 ? 'carrier' : 'carriers'} grouped as Other`
                    : undefined
                }
              >
                <div className={`${s.chart} ${s.chartShort}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.airlineData}
                        dataKey="count"
                        nameKey="airline"
                        cx="50%"
                        cy="50%"
                        outerRadius={78}
                        innerRadius={46}
                        /* the 2px stock gap that lets adjacent hues separate
                           without leaning on colour alone */
                        stroke="#fbf7ef"
                        strokeWidth={2}
                      >
                        {chartData.airlineData.map((item, idx) => (
                          <Cell
                            key={item.airline}
                            fill={item.airline === 'Other' ? OTHER : seriesColor(idx)}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<LegTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className={s.legend}>
                  {chartData.airlineData.map((item, idx) => (
                    <span key={item.airline} className={s.legendItem}>
                      <span
                        className={s.legendSwatch}
                        style={{
                          background: item.airline === 'Other' ? OTHER : seriesColor(idx),
                        }}
                      />
                      {item.airline}
                      <span className={s.legendCount}>{item.count}</span>
                    </span>
                  ))}
                </div>
              </Figure>

              <Figure n="Fig. 6" title="Airports most used">
                <div className={s.ranks}>
                  {chartData.topAirports.map((airport, idx) => (
                    <div key={airport.iata} className={s.rank}>
                      <div className={s.rankHead}>
                        <span className={s.rankNo}>{idx + 1}</span>
                        <span className={s.rankCode}>{airport.iata}</span>
                        <span className={s.rankName}>
                          {airport.name?.replace(/\s*\([^)]*\)\s*/g, '')}
                        </span>
                        <span className={s.rankValue}>{airport.count}</span>
                      </div>
                      <div className={s.rankBarTrack}>
                        <div
                          className={s.rankBar}
                          style={{ width: `${(airport.count / maxAirport) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Figure>

              <Figure n="Fig. 7" title="Pairs flown most">
                <div className={s.pairs}>
                  {chartData.topRoutes.map((route, idx) => {
                    const [from, to] = route.route.split(' → ')
                    return (
                      <div key={route.route} className={s.pair}>
                        <span className={s.pairNo}>{idx + 1}</span>
                        <span className={s.pairCodes}>
                          {from}
                          <span className={s.pairArrow}>→</span>
                          {to}
                        </span>
                        <span className={s.pairCount}>{route.count}×</span>
                      </div>
                    )
                  })}
                </div>
              </Figure>
            </div>

            {/* ── SPENDING ────────────────────────────────── */}
            {spend.bookingsWithPrice > 0 && (
              <>
                <dl className={s.money}>
                  <div className={s.moneyCell}>
                    <dt className={s.moneyLabel}>Total spent</dt>
                    <dd className={s.moneyValue}>{money(spend.totalSpent)}</dd>
                    {/* Extras come out of this figure, not on top of it, so they read
                        as a share of it rather than as a fifth column of their own. */}
                    {spend.totalExtras > 0 && (
                      <dd className={s.moneyOfWhich}>
                        of which <strong>{money(spend.totalExtras)}</strong> on extras
                        <span className={s.moneyShare}>
                          {((spend.totalExtras / spend.totalSpent) * 100).toFixed(1)}%
                        </span>
                      </dd>
                    )}
                    <dd className={s.moneyNote}>
                      across {spend.bookingsWithPrice} {spend.bookingsWithPrice === 1 ? 'booking' : 'bookings'} with a fare on record
                      {spend.bookingsWithExtras > 0 &&
                        `; extras filed on ${spend.bookingsWithExtras} of them`}
                    </dd>
                  </div>
                  <div className={s.moneyCell}>
                    <dt className={s.moneyLabel}>Average booking</dt>
                    <dd className={s.moneyValue}>{money(spend.avgPerBooking)}</dd>
                    <dd className={s.moneyNote}>mean of every priced booking</dd>
                  </div>
                  <div className={s.moneyCell}>
                    <dt className={s.moneyLabel}>Cheapest</dt>
                    <dd className={s.moneyValue}>{money(spend.minPrice)}</dd>
                    <dd className={s.moneyNote}>the best you have done</dd>
                  </div>
                  <div className={s.moneyCell}>
                    <dt className={s.moneyLabel}>Dearest</dt>
                    <dd className={s.moneyValue}>{money(spend.maxPrice)}</dd>
                    <dd className={s.moneyNote}>single highest booking filed</dd>
                  </div>
                </dl>

                <div className={`${s.grid} ${s.grid2}`}>
                  {spend.spendingByYear.length > 0 && (
                    <Figure n="Fig. 8" title="What it cost, by year">
                      <div className={s.chart}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={spend.spendingByYear} margin={{ top: 4, right: 8, left: -6, bottom: 0 }}>
                            <CartesianGrid stroke={RULE} strokeDasharray="2 4" vertical={false} />
                            <XAxis dataKey="year" {...AXIS} />
                            <YAxis tickFormatter={(v) => `€${v}`} {...AXIS} />
                            <Tooltip
                              content={<SpendTooltip />}
                              cursor={{ stroke: INK, strokeWidth: 1, strokeDasharray: '3 3' }}
                            />
                            <Area
                              type="monotone"
                              dataKey="total"
                              stroke={VERMILLION}
                              strokeWidth={2}
                              fill={VERMILLION}
                              fillOpacity={0.12}
                              dot={{ r: 2.5, fill: VERMILLION, stroke: 'none' }}
                              activeDot={{ r: 4.5, fill: VERMILLION, stroke: '#fbf7ef', strokeWidth: 2 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </Figure>
                  )}

                  {spend.spendingByAirline.length > 0 && (
                    <Figure n="Fig. 9" title="What it cost, by carrier">
                      <div className={s.ranks}>
                        {spend.spendingByAirline.slice(0, 6).map((item, idx) => (
                          <div key={item.airline} className={s.rank}>
                            <div className={s.rankHead}>
                              <span className={s.rankNo}>{idx + 1}</span>
                              <span className={s.rankName}>{item.airline}</span>
                              <span className={s.rankSub}>
                                {item.count} {item.count === 1 ? 'booking' : 'bookings'}
                              </span>
                              <span className={s.rankValue}>{money(item.total)}</span>
                            </div>
                            <div className={s.rankBarTrack}>
                              <div
                                className={s.rankBar}
                                style={{ width: `${(item.total / maxAirlineSpend) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </Figure>
                  )}
                </div>
              </>
            )}

            {/* ── COUNTRIES ───────────────────────────────── */}
            {chartData.countryData.length > 0 && (
              <div className={s.grid}>
                <Figure
                  n="Fig. 10"
                  title="Countries touched"
                  note={`Counted at both ends of every leg · busiest ${chartData.countryData[0].country}, ${maxCountry} times`}
                >
                  <div className={s.tally}>
                    {chartData.countryData.map((country) => (
                      <div key={country.country} className={s.tallyCell}>
                        <span className={s.tallyName}>{country.country}</span>
                        <span className={s.tallyCount}>{country.visits}</span>
                      </div>
                    ))}
                  </div>
                </Figure>
              </div>
            )}
          </>
        )}

        <div className={s.colophon}>
          <span className={s.tag}>MySky · Section 04</span>
          <p className={s.colophonNote}>
            Distance is the great-circle distance between filed airports, not the
            track flown; hours aloft are derived from it and are an estimate. Fares
            are shown as filed and are not converted between currencies.
          </p>
        </div>
      </main>
    </div>
  )
}


"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCcw } from "lucide-react"
import { ChartContainer } from "@/components/ui/chart"
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
  LabelList,
  LineChart,
  Line,
  Sector,
} from "recharts"

type Flight = {
  id: number
  departure_country: string | null
  arrival_country: string | null
  departure_date: string
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
}

export default function StatsPage() {
  const [flights, setFlights] = useState<Flight[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState<any | null>(null)
  const [nowTick, setNowTick] = useState(0) // forces re-render each second for "time ago"
  const [activeCountryIdx, setActiveCountryIdx] = useState<number | null>(null)
  const [hoverYearIdx, setHoverYearIdx] = useState<number | null>(null)
  const [hoverAirlineIdx, setHoverAirlineIdx] = useState<number | null>(null)

  const fetchFlights = async () => {
    setIsRefreshing(true)
    try {
      const [resFlights, resStats] = await Promise.all([
        fetch("/api/flights", { credentials: "include" }),
        fetch("/api/statistics", { headers: { Accept: "application/json" }, credentials: "include" }),
      ])
      if (!resFlights.ok) throw new Error("Failed to load flights")
      const dataFlights = await resFlights.json()
      setFlights(dataFlights || [])
      if (resStats.ok) {
        const dataStats = await resStats.json()
        setStats(dataStats || null)
      } else {
        setStats(null)
      }
      setLastUpdate(new Date())
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    void fetchFlights()
  }, [])

  // live ticker to update "last updated" text
  useEffect(() => {
    const t = setInterval(() => setNowTick((v) => v + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const chartData = useMemo(() => {
    // Country visits: count both departures and arrivals per country
    const countryCounts = new Map<string, number>()
    for (const f of flights) {
      if (f.departure_country) countryCounts.set(f.departure_country, (countryCounts.get(f.departure_country) || 0) + 1)
      if (f.arrival_country) countryCounts.set(f.arrival_country, (countryCounts.get(f.arrival_country) || 0) + 1)
    }
    const sortedCountryData = Array.from(countryCounts.entries())
      .map(([country, visits]) => ({ country, visits }))
      .sort((a, b) => b.visits - a.visits)

    // Group countries with <3 flights into "Other"
    const grouped = sortedCountryData.filter((c) => c.visits < 3)
    const displayCountryData = sortedCountryData.filter((c) => c.visits >= 3)
    if (grouped.length > 0) {
      const otherTotal = grouped.reduce((sum, c) => sum + c.visits, 0)
      displayCountryData.push({ country: "Other", visits: otherTotal })
    }

    // Flights by year
    const byYear = new Map<string, number>()
    for (const f of flights) {
      if (!f.departure_date) continue
      const y = new Date(f.departure_date).getFullYear().toString()
      byYear.set(y, (byYear.get(y) || 0) + 1)
    }
    const flightsByYear = Array.from(byYear.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year.localeCompare(b.year))

    // Flights by airline
    const byAirline = new Map<string, number>()
    for (const f of flights) {
      const k = f.airline || "Unknown"
      byAirline.set(k, (byAirline.get(k) || 0) + 1)
    }
    const airlineData = Array.from(byAirline.entries())
      .map(([airline, count]) => ({ airline, count }))
      .sort((a, b) => b.count - a.count)

    return {
      countryData: displayCountryData,
      grouped,
      flightsByYear,
      airlineData,
      totalFlights: flights.length,
    }
  }, [flights])

  const colors = [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
    "#bcbd22",
    "#17becf",
  ]

  // simple animated counter without external deps
  const useCountUp = (value: number | undefined, duration = 8000) => {
    const [display, setDisplay] = useState<number>(0)
    const [isMounted, setIsMounted] = useState(false)
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
        const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
        setDisplay(fromRef.current + (target - fromRef.current) * eased)
        if (p < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
      return () => cancelAnimationFrame(raf)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target])

    return Math.round(display)
  }

  // Fallback calculation on the client when API stats are unavailable
  const fallbackStats = useMemo(() => {
    if (!flights.length) return null as any

    const num = (v: unknown) => (v == null ? undefined : Number(v))
    const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const toRad = (x: number) => (x * Math.PI) / 180
      const R = 6371
      const dLat = toRad(lat2 - lat1)
      const dLon = toRad(lon2 - lon1)
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
      return R * 2 * Math.asin(Math.sqrt(a))
    }
    // Use unified duration model (0.5h + distance/840)
    const deriveDurationHours = (distanceKm: number) => distanceKm / 840 + 0.5

    // Totals
    let totalVisits = 0
    const airportSet = new Set<string>()
    const countrySet = new Set<string>()
    const airportVisits = new Map<string, { visits: number; name?: string }>()
    const routeCounts = new Map<string, number>()
    const routeDistance = new Map<string, number>()
    let totalKm = 0
    let totalHours = 0

    for (const f of flights) {
      const depI = (f.departure_iata || '').toUpperCase()
      const arrI = (f.arrival_iata || '').toUpperCase()
      if (depI) { totalVisits++; airportSet.add(depI); const prev = airportVisits.get(depI) || { visits: 0, name: f.departure_airport || undefined }; airportVisits.set(depI, { visits: prev.visits + 1, name: prev.name }); }
      if (arrI) { totalVisits++; airportSet.add(arrI); const prev = airportVisits.get(arrI) || { visits: 0, name: f.arrival_airport || undefined }; airportVisits.set(arrI, { visits: prev.visits + 1, name: prev.name }); }
      if (f.departure_country) countrySet.add(f.departure_country)
      if (f.arrival_country) countrySet.add(f.arrival_country)

      // Distances and routes when coords exist
      const depLat = num(f.departure_latitude)
      const depLon = num(f.departure_longitude)
      const arrLat = num(f.arrival_latitude)
      const arrLon = num(f.arrival_longitude)
      if (
        depLat != null && depLon != null && arrLat != null && arrLon != null &&
        !Number.isNaN(depLat) && !Number.isNaN(depLon) && !Number.isNaN(arrLat) && !Number.isNaN(arrLon)
      ) {
        const dist = haversine(depLat!, depLon!, arrLat!, arrLon!)
        totalKm += dist
        totalHours += deriveDurationHours(dist)
        if (depI && arrI) {
          const key = [depI, arrI].sort().join('-')
          routeDistance.set(key, (routeDistance.get(key) || 0) + dist)
        }
      }
      if (depI && arrI) {
        const key = [depI, arrI].sort().join('-')
        routeCounts.set(key, (routeCounts.get(key) || 0) + 1)
      }
      // Do not add time from timestamps to avoid mixing models
    }

    // Most visited airport
    let mostVisited: { iata: string; name?: string; visits: number } | undefined
    for (const [iata, info] of airportVisits.entries()) {
      if (!mostVisited || info.visits > mostVisited.visits) mostVisited = { iata, name: info.name, visits: info.visits }
    }

    // Most flown & longest
    let mostFlownKey: string | undefined
    let mostFlownCount = -1
    for (const [k, c] of routeCounts.entries()) { if (c > mostFlownCount) { mostFlownCount = c; mostFlownKey = k } }
    let longestKey: string | undefined
    let longestDist = -1
    for (const [k, d] of routeDistance.entries()) { if (d > longestDist) { longestDist = d; longestKey = k } }

    const splitKey = (k?: string) => (k ? { from: { iata: k.split('-')[0] }, to: { iata: k.split('-')[1] } } : undefined)

    return {
      totalAirports: airportSet.size,
      totalVisits,
      totalRoutes: routeCounts.size,
      totalCountries: countrySet.size,
      hoursInAir: Math.round(totalHours),
      totalKilometers: Math.round(totalKm),
      mostVisitedAirport: mostVisited,
      mostFlownRoute: mostFlownKey ? { ...splitKey(mostFlownKey)!, flights: mostFlownCount } : undefined,
      longestRoute: longestKey ? { ...splitKey(longestKey)!, distance_km: Math.round(longestDist) } : undefined,
    }
  }, [flights])

  const viewStats = stats ?? fallbackStats

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

  // counts for animated counters
  const airportsCount = useCountUp(viewStats?.totalAirports)
  const visitsCount = useCountUp(viewStats?.totalVisits)
  const routesCount = useCountUp(viewStats?.totalRoutes)
  const countriesCount = useCountUp(viewStats?.totalCountries)
  const hoursCount = useCountUp(viewStats?.hoursInAir)
  const kmCount = useCountUp(viewStats?.totalKilometers)

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-600/15 via-sky-500/10 to-purple-600/10 dark:from-indigo-400/10 dark:via-sky-300/10 dark:to-fuchsia-400/10 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Flight Statistics
            </h2>
            <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <span>{flights.length} flights</span>
              <span>•</span>
              <span>Last updated {timeAgo(lastUpdate)}</span>
            </div>
          </div>
          <Button onClick={fetchFlights} variant="outline" size="sm" className="gap-2 backdrop-blur supports-[backdrop-filter]:bg-background/50">
            <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        {/* subtle animated orbs */}
        <div className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl" />
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Total Airports</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{formatNumber(airportsCount)}</div>
        </Card>
        <Card className="p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Total Visits</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{formatNumber(visitsCount)}</div>
        </Card>
        <Card className="p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Total Routes</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{formatNumber(routesCount)}</div>
        </Card>
        <Card className="p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Countries Visited</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{formatNumber(countriesCount)}</div>
        </Card>
      </div>

      {/* Detail cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <CardHeader className="p-0 mb-2">
            <CardTitle className="text-lg">Most Visited Airport</CardTitle>
              </CardHeader>
          <CardContent className="p-0">
            {viewStats?.mostVisitedAirport ? (
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-sm font-mono">
                  {viewStats.mostVisitedAirport.iata}
                </Badge>
                <div className="text-lg font-medium truncate">
                  {viewStats.mostVisitedAirport.name || 'Airport'}
                </div>
                <div className="ml-auto text-sm text-muted-foreground">
                  {formatNumber(viewStats.mostVisitedAirport.visits)} visits
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
              </CardContent>
            </Card>

        <Card className="p-4">
          <CardHeader className="p-0 mb-2">
            <CardTitle className="text-lg">Route Statistics</CardTitle>
              </CardHeader>
          <CardContent className="p-0 space-y-3">
            {viewStats?.mostFlownRoute && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">{viewStats.mostFlownRoute.from?.iata}</Badge>
                <span className="mx-1">→</span>
                <Badge variant="outline" className="font-mono">{viewStats.mostFlownRoute.to?.iata}</Badge>
                <div className="ml-auto text-sm text-muted-foreground">
                  {formatNumber(viewStats.mostFlownRoute.flights)} flights
                </div>
              </div>
            )}
            {viewStats?.longestRoute && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">{viewStats.longestRoute.from?.iata}</Badge>
                <span className="mx-1">→</span>
                <Badge variant="outline" className="font-mono">{viewStats.longestRoute.to?.iata}</Badge>
                <div className="ml-auto text-sm text-muted-foreground">
                  {formatNumber(viewStats.longestRoute.distance_km)} km
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardHeader className="p-0 mb-2">
            <CardTitle className="text-lg">Total Hours in Air</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-bold tabular-nums">{formatNumber(hoursCount)} hours</div>
            <div className="text-xs text-muted-foreground">Including taxi, takeoff, and landing times</div>
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardHeader className="p-0 mb-2">
            <CardTitle className="text-lg">Total Distance Flown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-bold tabular-nums">{formatNumber(kmCount)} km</div>
              </CardContent>
            </Card>
          </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        <Card className="p-4 flex flex-col items-center animate-fade-in">
          <h3 className="text-base font-semibold mb-2">Flights by Country</h3>
          <ChartContainer config={{}} className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.countryData}
                  dataKey="visits"
                  nameKey="country"
                  outerRadius={90}
                  innerRadius={40}
                  paddingAngle={2}
                  isAnimationActive
                  animationBegin={150}
                  animationDuration={800}
                  animationEasing="ease-out"
                  activeIndex={activeCountryIdx == null ? undefined : activeCountryIdx}
                  activeShape={(props: any) => (
                    <Sector {...props} outerRadius={(props.outerRadius as number) + 6} />
                  )}
                  onMouseLeave={() => setActiveCountryIdx(null)}
                >
                  {chartData.countryData.map((_, idx) => (
                    <Cell
                      key={`c-${idx}`}
                      fill={colors[idx % colors.length]}
                      fillOpacity={activeCountryIdx == null || activeCountryIdx === idx ? 1 : 0.6}
                      onMouseEnter={() => setActiveCountryIdx(idx)}
                    />
                  ))}
                  <LabelList dataKey="country" position="outside" className="text-xs" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
          {chartData.grouped.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">Other: {chartData.grouped.map((c) => `${c.country}: ${c.visits}`).join(', ')}</div>
          )}
        </Card>

        <Card className="p-4 animate-fade-in">
          <h3 className="text-base font-semibold mb-2">Flights by Year</h3>
          <ChartContainer config={{}} className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={chartData.flightsByYear}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill="#1f77b4"
                  radius={[4,4,0,0]}
                  isAnimationActive
                  animationBegin={150}
                  animationDuration={700}
                >
                  {chartData.flightsByYear.map((_, idx) => (
                    <Cell
                      key={`y-${idx}`}
                      fill="#1f77b4"
                      fillOpacity={hoverYearIdx == null || hoverYearIdx === idx ? 1 : 0.6}
                      className="bar-spring"
                      onMouseEnter={() => setHoverYearIdx(idx)}
                      onMouseLeave={() => setHoverYearIdx(null)}
                    />
                  ))}
                </Bar>
              </ReBarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>

        <Card className="p-4 animate-fade-in">
          <h3 className="text-base font-semibold mb-2">Flights by Airline</h3>
          <ChartContainer config={{}} className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={chartData.airlineData} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="airline" width={80} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill="#ff7f0e"
                  radius={[0,4,4,0]}
                  isAnimationActive
                  animationBegin={150}
                  animationDuration={700}
                >
                  {chartData.airlineData.map((_, idx) => (
                    <Cell
                      key={`a-${idx}`}
                      fill="#ff7f0e"
                      fillOpacity={hoverAirlineIdx == null || hoverAirlineIdx === idx ? 1 : 0.6}
                      className="bar-spring"
                      onMouseEnter={() => setHoverAirlineIdx(idx)}
                      onMouseLeave={() => setHoverAirlineIdx(null)}
                    />
                  ))}
                </Bar>
              </ReBarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>
      </div>

      {/* Trend sparkline */}
      {chartData.flightsByYear.length > 1 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold">Long-term Trend</h3>
            <span className="text-xs text-muted-foreground">Flights per year</span>
          </div>
          <ChartContainer config={{}} className="w-full h-28">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.flightsByYear}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="year" hide />
                <YAxis hide />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>
      )}
    </div>
  )
}


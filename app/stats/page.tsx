"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from '@/hooks/use-toast'
import {
  RefreshCcw,
  Plane,
  MapPin,
  Globe,
  Clock,
  Route,
  TrendingUp,
  Calendar,
  Building2,
  ArrowRight,
  Sparkles,
  Euro,
  DollarSign,
  TrendingDown
} from "lucide-react"
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
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  Legend,
} from "recharts"

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
  total_receipt?: string | null
}

// Vibrant color palette
const COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  accent: '#f472b6',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#06b6d4',
  gradient1: ['#6366f1', '#8b5cf6', '#a855f7'],
  gradient2: ['#f472b6', '#fb7185', '#f43f5e'],
  gradient3: ['#06b6d4', '#22d3ee', '#67e8f9'],
  chart: ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d946ef', '#f472b6', '#fb7185', '#f43f5e', '#f97316', '#fbbf24'],
}

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

// Stat card component
const StatCard = ({
  icon: Icon,
  label,
  value,
  suffix = '',
  gradient,
  delay = 0
}: {
  icon: React.ElementType
  label: string
  value: number
  suffix?: string
  gradient: string
  delay?: number
}) => {
  const animatedValue = useCountUp(value, 2000)

  return (
    <div
      className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl"
      style={{
        background: gradient,
        animationDelay: `${delay}ms`
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl transition-all duration-500 group-hover:scale-150" />

      <div className="relative z-10">
        <div className="mb-4 inline-flex rounded-xl bg-white/20 p-3 backdrop-blur-sm">
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="text-4xl font-bold text-white tabular-nums tracking-tight">
          {animatedValue.toLocaleString()}{suffix}
        </div>
        <div className="mt-1 text-sm font-medium text-white/80">{label}</div>
      </div>
    </div>
  )
}

// Glassmorphic card
const GlassCard = ({
  children,
  className = "",
  title,
  icon: Icon
}: {
  children: React.ReactNode
  className?: string
  title?: string
  icon?: React.ElementType
}) => (
  <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-cyan-500/5" />
    {title && (
      <div className="relative border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-5 w-5 text-purple-400" />}
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
      </div>
    )}
    <div className="relative p-6">{children}</div>
  </div>
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
        const transformedFlights: Flight[] = vidmaFlights.map((f: any) => ({
          id: f.id,
          departure_country: f.departure_country || null,
          arrival_country: f.arrival_country || null,
          departure_date: f.departure_date || null,
          airline: f.airline || null,
          departure_iata: f.departure_iata || null,
          arrival_iata: f.arrival_iata || null,
          departure_airport: f.departure_airport || null,
          arrival_airport: f.arrival_airport || null,
          departure_latitude: f.departure_latitude ? Number(f.departure_latitude) : null,
          departure_longitude: f.departure_longitude ? Number(f.departure_longitude) : null,
          arrival_latitude: f.arrival_latitude ? Number(f.arrival_latitude) : null,
          arrival_longitude: f.arrival_longitude ? Number(f.arrival_longitude) : null,
          departure_time: f.departure_time || null,
          arrival_time: f.arrival_time || null,
          total_receipt: f.total_receipt || null,
        }))
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
    const airlineData = Array.from(byAirline.entries())
      .map(([airline, count]) => ({ airline, count, fill: COLORS.chart[0] }))
      .sort((a, b) => b.count - a.count)

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
      .map(([country, visits], idx) => ({ country, visits, fill: COLORS.chart[idx % COLORS.chart.length] }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 8)

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

    // Spending by year
    const spendingByYear = new Map<string, { total: number; count: number }>()
    for (const f of flights) {
      if (!f.departure_date || !f.total_receipt) continue
      try {
        const date = new Date(f.departure_date)
        if (isNaN(date.getTime())) continue
        const y = date.getFullYear().toString()
        const receipt = parseFloat(String(f.total_receipt).replace(/[^0-9.-]/g, ''))
        if (!isNaN(receipt) && receipt > 0) {
          const existing = spendingByYear.get(y) || { total: 0, count: 0 }
          spendingByYear.set(y, { total: existing.total + receipt, count: existing.count + 1 })
        }
      } catch {
        continue
      }
    }
    const spendingByYearData = Array.from(spendingByYear.entries())
      .map(([year, data]) => ({ year, total: Math.round(data.total * 100) / 100, count: data.count, avg: Math.round((data.total / data.count) * 100) / 100 }))
      .sort((a, b) => a.year.localeCompare(b.year))

    // Spending by airline
    const spendingByAirline = new Map<string, { total: number; count: number }>()
    for (const f of flights) {
      if (!f.airline || !f.total_receipt) continue
      const receipt = parseFloat(String(f.total_receipt).replace(/[^0-9.-]/g, ''))
      if (!isNaN(receipt) && receipt > 0) {
        const airline = f.airline || 'Unknown'
        const existing = spendingByAirline.get(airline) || { total: 0, count: 0 }
        spendingByAirline.set(airline, { total: existing.total + receipt, count: existing.count + 1 })
      }
    }
    const spendingByAirlineData = Array.from(spendingByAirline.entries())
      .map(([airline, data]) => ({ airline, total: Math.round(data.total * 100) / 100, count: data.count, avg: Math.round((data.total / data.count) * 100) / 100 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    // Calculate total spending
    let totalSpent = 0
    let flightsWithPrice = 0
    let minPrice = Infinity
    let maxPrice = 0
    const prices: number[] = []

    for (const f of flights) {
      if (!f.total_receipt) continue
      const receipt = parseFloat(String(f.total_receipt).replace(/[^0-9.-]/g, ''))
      if (!isNaN(receipt) && receipt > 0) {
        totalSpent += receipt
        flightsWithPrice++
        prices.push(receipt)
        minPrice = Math.min(minPrice, receipt)
        maxPrice = Math.max(maxPrice, receipt)
      }
    }

    const spendingStats = {
      totalSpent: Math.round(totalSpent * 100) / 100,
      flightsWithPrice,
      avgPerFlight: flightsWithPrice > 0 ? Math.round((totalSpent / flightsWithPrice) * 100) / 100 : 0,
      minPrice: minPrice === Infinity ? 0 : Math.round(minPrice * 100) / 100,
      maxPrice: Math.round(maxPrice * 100) / 100,
      spendingByYear: spendingByYearData,
      spendingByAirline: spendingByAirlineData
    }

    return { airlineData, flightsByYear, flightsByMonth, countryData, topAirports, topRoutes, spendingStats }
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
    const deriveDurationHours = (distanceKm: number) => distanceKm / 840 + 0.5

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
      if (depLat != null && depLon != null && arrLat != null && arrLon != null &&
        !Number.isNaN(depLat) && !Number.isNaN(depLon) && !Number.isNaN(arrLat) && !Number.isNaN(arrLon)) {
        const dist = haversine(depLat, depLon, arrLat, arrLon)
        totalKm += dist
        totalHours += deriveDurationHours(dist)
      }
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

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border border-white/20 bg-slate-900/95 px-4 py-2 shadow-xl backdrop-blur-sm">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-lg font-bold text-purple-400">{payload[0].value} flights</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-purple-500/20 blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-pink-500/10 blur-[128px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative container mx-auto px-4 py-8 space-y-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-purple-600/20 via-pink-500/20 to-cyan-500/20 p-8 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10" />
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-purple-500/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-cyan-500/30 blur-3xl" />

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/20 px-4 py-1.5 mb-4">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-300">Flight Analytics</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
                Your Flight
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent"> Statistics</span>
              </h1>
              <p className="mt-3 text-lg text-slate-400 max-w-xl">
                {viewStats?.yearsFlying || 0} years of flying • {flights.length} flights tracked • Last updated {timeAgo(lastUpdate)}
              </p>
            </div>

            <Button
              onClick={fetchFlights}
              size="lg"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm gap-2 rounded-xl"
            >
              <RefreshCcw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>
        </div>

        {/* Compact smart next-trip nudge */}
        <Link
          href="/flights"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/5 px-5 py-3 backdrop-blur-sm transition-colors hover:border-sky-400/40 hover:bg-sky-500/10"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-sky-400" />
            <div>
              <p className="text-sm font-medium text-white">Smart next trip</p>
              <p className="text-xs text-slate-400">
                See live prices on your most-flown route on Flight Deck
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-sky-400 transition-transform group-hover:translate-x-0.5" />
        </Link>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Plane}
            label="Total Flights"
            value={viewStats?.totalFlights || 0}
            gradient="linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
            delay={0}
          />
          <StatCard
            icon={MapPin}
            label="Airports Visited"
            value={viewStats?.totalAirports || 0}
            gradient="linear-gradient(135deg, #f472b6 0%, #f43f5e 100%)"
            delay={100}
          />
          <StatCard
            icon={Globe}
            label="Countries"
            value={viewStats?.totalCountries || 0}
            gradient="linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)"
            delay={200}
          />
          <StatCard
            icon={Route}
            label="Unique Routes"
            value={viewStats?.totalRoutes || 0}
            gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
            delay={300}
          />
        </div>

        {/* Distance & Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard title="Distance Traveled" icon={Globe}>
            <div className="space-y-4">
              <div>
                <div className="text-5xl font-bold text-white tabular-nums">
                  {formatNumber(viewStats?.totalKilometers)}
                  <span className="text-2xl text-slate-400 ml-2">km</span>
                </div>
                <p className="text-slate-400 mt-2">
                  That&apos;s {viewStats?.earthCircumnavigations?.toFixed(1) || 0}x around the Earth! 🌍
                </p>
              </div>
              <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min((viewStats?.earthCircumnavigations || 0) / 10 * 100, 100)}%` }}
                />
              </div>
            </div>
          </GlassCard>

          <GlassCard title="Time in the Air" icon={Clock}>
            <div className="space-y-4">
              <div>
                <div className="text-5xl font-bold text-white tabular-nums">
                  {formatNumber(viewStats?.hoursInAir)}
                  <span className="text-2xl text-slate-400 ml-2">hours</span>
                </div>
                <p className="text-slate-400 mt-2">
                  That&apos;s {Math.round((viewStats?.hoursInAir || 0) / 24)} days spent flying ✈️
                </p>
              </div>
              <div className="flex gap-4 text-center">
                <div className="flex-1 rounded-xl bg-slate-800/50 p-3">
                  <div className="text-2xl font-bold text-cyan-400">{Math.floor((viewStats?.hoursInAir || 0) / 24)}</div>
                  <div className="text-xs text-slate-500">Days</div>
                </div>
                <div className="flex-1 rounded-xl bg-slate-800/50 p-3">
                  <div className="text-2xl font-bold text-purple-400">{(viewStats?.hoursInAir || 0) % 24}</div>
                  <div className="text-xs text-slate-500">Hours</div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Flights by Year */}
          <GlassCard title="Flights Over the Years" icon={TrendingUp}>
            <ChartContainer config={{}} className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.flightsByYear}>
                  <defs>
                    <linearGradient id="colorYear" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis
                    dataKey="year"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    fill="url(#colorYear)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </GlassCard>

          {/* Flights by Month */}
          <GlassCard title="Monthly Distribution" icon={Calendar}>
            <ChartContainer config={{}} className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={chartData.flightsByMonth}>
                  <defs>
                    <linearGradient id="colorMonth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={1} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="count"
                    fill="url(#colorMonth)"
                    radius={[6, 6, 0, 0]}
                  />
                </ReBarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </GlassCard>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Airlines Pie */}
          <GlassCard title="Airlines" icon={Building2}>
            <ChartContainer config={{}} className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.airlineData}
                    dataKey="count"
                    nameKey="airline"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {chartData.airlineData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS.chart[idx % COLORS.chart.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="rounded-lg border border-white/20 bg-slate-900/95 px-4 py-2 shadow-xl">
                          <p className="text-sm font-medium text-white">{payload[0].name}</p>
                          <p className="text-lg font-bold text-purple-400">{payload[0].value} flights</p>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {chartData.airlineData.slice(0, 5).map((item, idx) => (
                <Badge
                  key={item.airline}
                  variant="outline"
                  className="border-white/20 text-slate-300"
                  style={{ borderColor: COLORS.chart[idx % COLORS.chart.length] }}
                >
                  <span
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: COLORS.chart[idx % COLORS.chart.length] }}
                  />
                  {item.airline}
                </Badge>
              ))}
            </div>
          </GlassCard>

          {/* Top Airports */}
          <GlassCard title="Top Airports" icon={MapPin}>
            <div className="space-y-3">
              {chartData.topAirports.map((airport, idx) => {
                const maxCount = chartData.topAirports[0]?.count || 1
                const percentage = (airport.count / maxCount) * 100
                return (
                  <div key={airport.iata} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 w-4">{idx + 1}</span>
                        <Badge variant="outline" className="font-mono text-white border-white/20">
                          {airport.iata}
                        </Badge>
                        <span className="text-sm text-slate-400 truncate max-w-[100px]">
                          {airport.name?.replace(/\s*\([^)]*\)\s*/g, '')}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-white">{airport.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
                        style={{
                          width: `${percentage}%`,
                          background: `linear-gradient(90deg, ${COLORS.chart[idx % COLORS.chart.length]}, ${COLORS.chart[(idx + 1) % COLORS.chart.length]})`
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassCard>

          {/* Top Routes */}
          <GlassCard title="Most Flown Routes" icon={Route}>
            <div className="space-y-4">
              {chartData.topRoutes.map((route, idx) => (
                <div
                  key={route.route}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${COLORS.chart[idx]}, ${COLORS.chart[idx + 1] || COLORS.chart[0]})` }}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white font-medium">{route.route.split(' → ')[0]}</span>
                      <ArrowRight className="h-4 w-4 text-slate-500" />
                      <span className="font-mono text-white font-medium">{route.route.split(' → ')[1]}</span>
                    </div>
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border-0">
                    {route.count} flights
                  </Badge>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Spending Statistics */}
        {chartData.spendingStats.flightsWithPrice > 0 && (
          <div className="space-y-6">
            <GlassCard title="Flight Spending" icon={Euro}>
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-500/30">
                    <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-green-500/20 blur-xl" />
                    <div className="relative">
                      <div className="text-xs text-green-300 mb-1">Total Spent</div>
                      <div className="text-3xl font-bold text-white">
                        €{chartData.spendingStats.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-green-400/70 mt-1">
                        {chartData.spendingStats.flightsWithPrice} flights with price data
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border border-blue-500/30">
                    <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-blue-500/20 blur-xl" />
                    <div className="relative">
                      <div className="text-xs text-blue-300 mb-1">Average per Flight</div>
                      <div className="text-3xl font-bold text-white">
                        €{chartData.spendingStats.avgPerFlight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-blue-400/70 mt-1">
                        Across all paid flights
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-purple-500/20 to-pink-600/20 border border-purple-500/30">
                    <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-purple-500/20 blur-xl" />
                    <div className="relative">
                      <div className="text-xs text-purple-300 mb-1">Cheapest Flight</div>
                      <div className="text-3xl font-bold text-white">
                        €{chartData.spendingStats.minPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-purple-400/70 mt-1">
                        Best deal you got
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-orange-500/20 to-red-600/20 border border-orange-500/30">
                    <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-orange-500/20 blur-xl" />
                    <div className="relative">
                      <div className="text-xs text-orange-300 mb-1">Most Expensive</div>
                      <div className="text-3xl font-bold text-white">
                        €{chartData.spendingStats.maxPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-orange-400/70 mt-1">
                        Highest single flight cost
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spending by Year Chart */}
                {chartData.spendingStats.spendingByYear.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4">Spending Over Time</h4>
                    <ChartContainer config={{}} className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData.spendingStats.spendingByYear}>
                          <defs>
                            <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                          <XAxis
                            dataKey="year"
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `€${value}`}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null
                              const data = payload[0].payload as any
                              return (
                                <div className="rounded-lg border border-white/20 bg-slate-900/95 px-4 py-2 shadow-xl">
                                  <p className="text-sm font-medium text-white">{data.year}</p>
                                  <p className="text-lg font-bold text-green-400">
                                    €{data.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {data.count} flights • Avg: €{data.avg.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                </div>
                              )
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="total"
                            stroke="#10b981"
                            strokeWidth={3}
                            fill="url(#colorSpending)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                )}

                {/* Spending by Airline */}
                {chartData.spendingStats.spendingByAirline.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4">Spending by Airline</h4>
                    <div className="space-y-3">
                      {chartData.spendingStats.spendingByAirline.map((item, idx) => {
                        const maxSpent = chartData.spendingStats.spendingByAirline[0]?.total || 1
                        const percentage = (item.total / maxSpent) * 100
                        return (
                          <div key={item.airline} className="group">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                                  style={{ background: `linear-gradient(135deg, ${COLORS.chart[idx % COLORS.chart.length]}, ${COLORS.chart[(idx + 1) % COLORS.chart.length] || COLORS.chart[0]})` }}
                                >
                                  {idx + 1}
                                </div>
                                <div>
                                  <div className="font-semibold text-white">{item.airline}</div>
                                  <div className="text-xs text-slate-400">{item.count} flights</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-green-400">
                                  €{item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Avg: €{item.avg.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              </div>
                            </div>
                            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
                                style={{
                                  width: `${percentage}%`,
                                  background: `linear-gradient(90deg, ${COLORS.chart[idx % COLORS.chart.length]}, ${COLORS.chart[(idx + 1) % COLORS.chart.length] || COLORS.chart[0]})`
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        )}

        {/* Countries */}
        <GlassCard title="Countries Visited" icon={Globe}>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {chartData.countryData.map((country, idx) => (
              <div
                key={country.country}
                className="relative overflow-hidden rounded-xl p-4 text-center transition-all hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.chart[idx % COLORS.chart.length]}20, ${COLORS.chart[idx % COLORS.chart.length]}10)`,
                  borderLeft: `3px solid ${COLORS.chart[idx % COLORS.chart.length]}`
                }}
              >
                <div className="text-2xl font-bold text-white">{country.visits}</div>
                <div className="text-xs text-slate-400 truncate mt-1">{country.country}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Footer */}
        <div className="text-center text-sm text-slate-500 pb-8">
          <p>Data updated {timeAgo(lastUpdate)} • {flights.length} flights analyzed</p>
        </div>
      </div>
    </div>
  )
}

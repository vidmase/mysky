"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Clock, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Search,
  Plane, ArrowRight, Timer, Shield, XCircle, Loader2,
} from 'lucide-react'

type FlightDelayRecord = {
  id: string
  flight_number: string
  departure_airport: string
  arrival_airport: string
  departure_iata: string | null
  arrival_iata: string | null
  departure_date: string
  airline: string | null
  status: string | null
  depDelayMinutes: number | null
  arrDelayMinutes: number | null
}

type UserDelayStats = {
  totalFlights: number
  flightsWithData: number
  onTime: number
  delayed: number
  early: number
  cancelled: number
  avgDepDelay: number | null
  avgArrDelay: number | null
  worstDelay: FlightDelayRecord | null
  bestAirline: { name: string; avgDelay: number; flights: number } | null
  worstAirline: { name: string; avgDelay: number; flights: number } | null
  airports: string[]
  records: FlightDelayRecord[]
  providerError?: { message: string; kind: string; status: number } | null
}

function OnTimeRing({ pct }: { pct: number }) {
  const size = 140
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct / 100)

  const getColor = (v: number) => {
    if (v >= 80) return '#2f6b53'
    if (v >= 60) return '#c9942f'
    if (v >= 40) return '#ce3b1e'
    return '#a32c14'
  }
  const color = getColor(pct)

  return (
    <div className="relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(23,19,14,0.1)" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: 'stroke-dashoffset 1.5s ease-out',
            filter: `drop-shadow(0 0 8px ${color}60)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-[var(--ink)]" style={{ textShadow: `0 0 12px ${color}40` }}>
          {pct}%
        </span>
        <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--ink-3)] font-semibold">On Time</span>
      </div>
    </div>
  )
}

function KPICard({ icon: Icon, label, value, subtext, color }: {
  icon: any; label: string; value: string | number; subtext?: string; color: string
}) {
  const colorMap: Record<string, { text: string; bg: string; glow: string; iconBg: string }> = {
    accent: { text: 'text-[var(--vermillion)]', bg: 'bg-[var(--wash-accent)]', glow: 'rgba(206,59,30,0.12)', iconBg: 'bg-[var(--wash-accent-2)]' },
    good: { text: 'text-[var(--jade)]', bg: 'bg-[var(--wash-jade)]', glow: 'rgba(47,107,83,0.12)', iconBg: 'bg-[var(--wash-jade-2)]' },
    warn: { text: 'text-[var(--brass)]', bg: 'bg-[var(--wash-brass)]', glow: 'rgba(201,148,47,0.14)', iconBg: 'bg-[var(--wash-brass-2)]' },
    bad: { text: 'text-[var(--vermillion-dk)]', bg: 'bg-[var(--wash-accent)]', glow: 'rgba(163,44,20,0.12)', iconBg: 'bg-[var(--wash-accent-2)]' },
    navy: { text: 'text-[var(--navy)]', bg: 'bg-[var(--wash-navy)]', glow: 'rgba(14,32,51,0.1)', iconBg: 'bg-[var(--wash-navy-2)]' },
  }
  const c = colorMap[color] || colorMap.accent

  return (
    <div
      className={`rounded-xl p-4 border border-[var(--rule)] ${c.bg} flex items-start gap-3`}
      style={{ boxShadow: `0 0 24px ${c.glow}` }}
    >
      <div className={`w-10 h-10 rounded-lg ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${c.text}`} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)] font-semibold">{label}</div>
        <div className={`text-xl font-bold ${c.text}`}>{value}</div>
        {subtext && <div className="text-[11px] text-[var(--ink-3)] mt-0.5">{subtext}</div>}
      </div>
    </div>
  )
}

function getDelayColor(minutes: number | null): string {
  if (minutes === null) return 'text-[var(--ink-3)]'
  if (minutes < 0) return 'text-[var(--jade)]'
  if (minutes === 0) return 'text-[var(--jade)]'
  if (minutes < 15) return 'text-[var(--jade)]'
  if (minutes < 30) return 'text-[var(--brass)]'
  if (minutes < 60) return 'text-[var(--brass)]'
  return 'text-[var(--vermillion-dk)]'
}

function getDelayBg(minutes: number | null): string {
  if (minutes === null) return 'bg-[var(--wash-ink)]'
  if (minutes < 0) return 'bg-[var(--wash-jade)]'
  if (minutes < 15) return 'bg-[var(--wash-jade)]'
  if (minutes < 30) return 'bg-[var(--wash-brass)]'
  if (minutes < 60) return 'bg-[var(--wash-brass)]'
  return 'bg-[var(--wash-accent)]'
}

function getDelayLabel(dep: number | null, arr: number | null, status: string | null): { text: string; color: string } {
  if (status?.toLowerCase().includes('cancel')) return { text: 'Cancelled', color: 'text-[var(--vermillion-dk)]' }
  const max = Math.max(dep ?? 0, arr ?? 0)
  if (dep === null && arr === null) return { text: 'No data', color: 'text-[var(--ink-3)]' }
  if (max < 0) return { text: `${Math.abs(max)}m early`, color: 'text-[var(--jade)]' }
  if (max === 0) return { text: 'On time', color: 'text-[var(--jade)]' }
  if (max < 15) return { text: `${max}m`, color: 'text-[var(--jade)]' }
  if (max < 30) return { text: `${max}m late`, color: 'text-[var(--brass)]' }
  if (max < 60) return { text: `${max}m late`, color: 'text-[var(--brass)]' }
  return { text: `${max}m late`, color: 'text-[var(--vermillion-dk)]' }
}

export default function DelaysDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<UserDelayStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'delay'>('date')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fetch('/api/delays/user-flights', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      })
      .then((data) => {
        if (!alive) return
        setStats(data)
      })
      .catch((e) => alive && setError(e?.message || 'Failed to load'))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const filteredRecords = stats?.records
    ?.filter((r) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        r.flight_number.toLowerCase().includes(q) ||
        r.departure_airport.toLowerCase().includes(q) ||
        r.arrival_airport.toLowerCase().includes(q) ||
        r.departure_iata?.toLowerCase().includes(q) ||
        r.arrival_iata?.toLowerCase().includes(q) ||
        r.airline?.toLowerCase().includes(q)
      )
    })
    ?.sort((a, b) => {
      if (sortBy === 'delay') {
        const delayA = Math.max(a.depDelayMinutes ?? 0, a.arrDelayMinutes ?? 0)
        const delayB = Math.max(b.depDelayMinutes ?? 0, b.arrDelayMinutes ?? 0)
        return delayB - delayA
      }
      return new Date(b.departure_date).getTime() - new Date(a.departure_date).getTime()
    })

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[var(--ink)] mb-2">Flight Delays</h1>
            <p className="text-[var(--ink-3)] text-sm">Analyzing your flights…</p>
          </div>
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-2 border-[color-mix(in_srgb,var(--vermillion)_30%,transparent)] rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-[var(--vermillion)] rounded-full animate-spin" />
              <Plane className="absolute inset-0 m-auto w-6 h-6 text-[color-mix(in_srgb,var(--vermillion)_70%,transparent)]" />
            </div>
            <p className="text-[var(--ink-3)] text-sm">Fetching delay data for your flights…</p>
            <p className="text-[var(--ink-3)] text-xs">This may take a moment for many flights</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-[var(--ink)] mb-4">Flight Delays</h1>
          <div className="bg-[var(--wash-accent)] border border-[color-mix(in_srgb,var(--vermillion-dk)_30%,transparent)] rounded-xl p-6 text-[var(--vermillion-dk)]">
            <AlertTriangle className="w-5 h-5 mb-2" />
            <p>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!stats || stats.totalFlights === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto text-center py-20">
          <Plane className="w-12 h-12 text-[var(--ink-3)] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[var(--ink)] mb-2">No Flights Yet</h1>
          <p className="text-[var(--ink-3)] text-sm mb-6">Add some flights to see your delay analytics.</p>
          <Link
            href="/add-flight"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--wash-accent-2)] text-[var(--vermillion)] rounded-lg hover:bg-[var(--wash-accent-2)] transition-all text-sm font-medium"
          >
            Add Your First Flight <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  const onTimePct = stats.flightsWithData > 0
    ? Math.round((stats.onTime / stats.flightsWithData) * 100)
    : 0

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[var(--ink)] mb-1">Flight Delays</h1>
          <p className="text-[var(--ink-3)] text-sm">
            Personal delay analytics from your {stats.totalFlights} flights •{' '}
            {stats.flightsWithData} with delay data
          </p>
        </div>

        {/* The status provider refused us — say so, rather than letting every
            row read "No data" as if the log were simply empty. */}
        {stats.providerError && (
          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--brass)_40%,transparent)] bg-[var(--wash-brass)] px-5 py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[var(--brass)]" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--ink)]">
                  No delay data could be fetched
                </p>
                <p className="text-sm text-[var(--ink-2)]">
                  {/* status 0 means we never sent the request — the key is
                      unusable locally, so blaming the provider would misdirect. */}
                  {stats.providerError.status === 0
                    ? 'Lookups are disabled: '
                    : 'The flight-status provider rejected every request: '}
                  <span className="font-mono">{stats.providerError.message}</span>
                  {stats.providerError.status > 0 && ` (HTTP ${stats.providerError.status})`}.
                </p>
                {stats.providerError.status === 0 ? (
                  <p className="text-xs text-[var(--ink-3)]">
                    This is a local configuration problem, not the provider. An
                    environment variable of that name takes precedence over
                    .env.local — clear it, then restart the terminal and the dev
                    server so both pick up the real key.
                  </p>
                ) : stats.providerError.kind === 'configuration' && (
                  <p className="text-xs text-[var(--ink-3)]">
                    This is an account or API-key problem on the provider side —
                    the figures below stay empty until it is resolved.
                  </p>
                )}
                {stats.providerError.kind === 'rate-limit' && (
                  <p className="text-xs text-[var(--ink-3)]">
                    The provider&apos;s rate limit was hit. Try again shortly.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hero KPI Section */}
        <div className="bg-[hsl(var(--card))] backdrop-blur-xl rounded-2xl border border-[var(--rule)] p-6">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* On-time ring */}
            <div className="flex-shrink-0">
              <OnTimeRing pct={onTimePct} />
            </div>

            {/* KPI grid */}
            <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-3 gap-3">
              <KPICard
                icon={CheckCircle2}
                label="On Time"
                value={stats.onTime}
                subtext={`${onTimePct}% of flights`}
                color="good"
              />
              <KPICard
                icon={AlertTriangle}
                label="Delayed ≥15m"
                value={stats.delayed}
                subtext={stats.flightsWithData > 0 ? `${Math.round((stats.delayed / stats.flightsWithData) * 100)}%` : '—'}
                color="warn"
              />
              <KPICard
                icon={XCircle}
                label="Cancelled"
                value={stats.cancelled}
                color="bad"
              />
              <KPICard
                icon={Timer}
                label="Avg Dep Delay"
                value={stats.avgDepDelay !== null ? `${stats.avgDepDelay}m` : '—'}
                color="warn"
              />
              <KPICard
                icon={Clock}
                label="Avg Arr Delay"
                value={stats.avgArrDelay !== null ? `${stats.avgArrDelay}m` : '—'}
                color="accent"
              />
              <KPICard
                icon={TrendingDown}
                label="Early"
                value={stats.early}
                color="good"
              />
            </div>
          </div>

          {/* Airline insights */}
          {(stats.bestAirline || stats.worstAirline || stats.worstDelay) && (
            <div className="mt-6 pt-6 border-t border-[var(--rule)] grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.bestAirline && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--wash-jade-2)] flex items-center justify-center">
                    <Shield className="w-4 h-4 text-[var(--jade)]" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)] font-semibold">Most Reliable</div>
                    <div className="text-sm font-medium text-[var(--jade)]">{stats.bestAirline.name}</div>
                    <div className="text-[11px] text-[var(--ink-3)]">avg {stats.bestAirline.avgDelay}m • {stats.bestAirline.flights} flights</div>
                  </div>
                </div>
              )}
              {stats.worstAirline && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--wash-accent-2)] flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-[var(--vermillion-dk)]" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)] font-semibold">Least Reliable</div>
                    <div className="text-sm font-medium text-[var(--vermillion-dk)]">{stats.worstAirline.name}</div>
                    <div className="text-[11px] text-[var(--ink-3)]">avg {stats.worstAirline.avgDelay}m • {stats.worstAirline.flights} flights</div>
                  </div>
                </div>
              )}
              {stats.worstDelay && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--wash-brass-2)] flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-[var(--brass)]" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)] font-semibold">Worst Delay</div>
                    <div className="text-sm font-medium text-[var(--brass)]">
                      {stats.worstDelay.flight_number} — {Math.max(stats.worstDelay.depDelayMinutes ?? 0, stats.worstDelay.arrDelayMinutes ?? 0)}m
                    </div>
                    <div className="text-[11px] text-[var(--ink-3)]">
                      {stats.worstDelay.departure_iata} → {stats.worstDelay.arrival_iata} • {new Date(stats.worstDelay.departure_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Flight Delay History */}
        <div className="bg-[hsl(var(--card))] backdrop-blur-xl rounded-2xl border border-[var(--rule)] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[var(--ink)]">Your Flight Delay History</h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--ink-3)]" />
                <input
                  type="text"
                  placeholder="Search flights…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-48 pl-8 pr-3 py-1.5 bg-[var(--wash-ink)] border border-[var(--rule)] rounded-lg text-xs text-[var(--ink)] placeholder-[var(--ink-3)] focus:outline-none focus:border-[color-mix(in_srgb,var(--vermillion)_40%,transparent)] focus:ring-1 focus:ring-[var(--wash-accent)] transition-all"
                />
              </div>
              <div className="flex items-center gap-1 bg-[var(--wash-ink)] rounded-lg p-0.5">
                <button
                  onClick={() => setSortBy('date')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${sortBy === 'date' ? 'bg-[var(--wash-accent-2)] text-[var(--vermillion)]' : 'text-[var(--ink-3)] hover:text-[var(--ink-2)]'
                    }`}
                >
                  Date
                </button>
                <button
                  onClick={() => setSortBy('delay')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${sortBy === 'delay' ? 'bg-[var(--wash-accent-2)] text-[var(--vermillion)]' : 'text-[var(--ink-3)] hover:text-[var(--ink-2)]'
                    }`}
                >
                  Delay
                </button>
              </div>
            </div>
          </div>

          {/* Flight records */}
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredRecords?.map((r) => {
              const delay = getDelayLabel(r.depDelayMinutes, r.arrDelayMinutes, r.status)
              const maxDelay = Math.max(r.depDelayMinutes ?? 0, r.arrDelayMinutes ?? 0)
              return (
                <Link
                  key={r.id}
                  href={`/flights/${r.id}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--rule)] ${getDelayBg(maxDelay)} hover:bg-[var(--wash-ink)] transition-all group`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-xs font-mono font-semibold text-[var(--ink-2)] w-16 flex-shrink-0">
                      {r.flight_number}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--ink-2)] min-w-0">
                      <span className="font-medium text-[var(--ink-2)]">{r.departure_iata || r.departure_airport.slice(0, 3)}</span>
                      <ArrowRight className="w-3 h-3 text-[var(--ink-3)] flex-shrink-0" />
                      <span className="font-medium text-[var(--ink-2)]">{r.arrival_iata || r.arrival_airport.slice(0, 3)}</span>
                    </div>
                    <span className="text-[11px] text-[var(--ink-3)] hidden sm:inline">
                      {new Date(r.departure_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {r.airline && (
                      <span className="text-[11px] text-[var(--ink-3)] hidden md:inline truncate">{r.airline}</span>
                    )}
                  </div>
                  <div className={`text-xs font-semibold ${delay.color} text-right flex-shrink-0`}>
                    {delay.text}
                  </div>
                </Link>
              )
            })}
            {filteredRecords?.length === 0 && (
              <div className="text-center py-8 text-[var(--ink-3)] text-sm">No matching flights found.</div>
            )}
          </div>
        </div>

        {/* Airport Quick-Search */}
        <div className="bg-[hsl(var(--card))] backdrop-blur-xl rounded-2xl border border-[var(--rule)] p-6 space-y-4">
          <h2 className="text-lg font-bold text-[var(--ink)]">Airport Delay Lookup</h2>
          <p className="text-xs text-[var(--ink-3)]">
            View live delay statistics for any airport. Quick-links to airports you&apos;ve flown through:
          </p>

          {stats.airports.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {stats.airports
                .filter((a) => a && a !== 'None')
                .sort()
                .map((iata) => (
                  <Link
                    key={iata}
                    href={`/delays/${iata}`}
                    className="px-3 py-1.5 rounded-lg bg-[var(--wash-ink)] border border-[var(--rule)] text-xs font-medium text-[var(--vermillion)] hover:bg-[var(--wash-accent)] hover:border-[color-mix(in_srgb,var(--vermillion)_30%,transparent)] transition-all"
                  >
                    {iata}
                  </Link>
                ))}
            </div>
          )}

          {/* Custom IATA input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--ink-3)]" />
              <input
                type="text"
                placeholder="Enter IATA code (e.g. LHR)"
                maxLength={4}
                className="w-full pl-8 pr-3 py-2 bg-[var(--wash-ink)] border border-[var(--rule)] rounded-lg text-sm text-[var(--ink)] placeholder-[var(--ink-3)] focus:outline-none focus:border-[color-mix(in_srgb,var(--vermillion)_40%,transparent)] focus:ring-1 focus:ring-[var(--wash-accent)] transition-all uppercase"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim().toUpperCase()
                    if (val.length >= 3) router.push(`/delays/${val}`)
                  }
                }}
              />
            </div>
            <button
              onClick={() => {
                const input = document.querySelector<HTMLInputElement>('input[placeholder*="IATA"]')
                const val = input?.value?.trim()?.toUpperCase()
                if (val && val.length >= 3) router.push(`/delays/${val}`)
              }}
              className="px-4 py-2 bg-[var(--wash-accent-2)] text-[var(--vermillion)] rounded-lg text-sm font-medium hover:bg-[var(--wash-accent-2)] transition-all"
            >
              View Delays
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

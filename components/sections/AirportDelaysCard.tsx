"use client"

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle } from 'lucide-react'

type Snapshot = {
  airport_iata: string
  ts: string
  scheduled_total: number
  departing_total: number
  arriving_total: number
  delayed_15m: number
  delayed_30m: number
  delayed_60m: number
  canceled: number
  avg_dep_delay_min: number | null
  avg_arr_delay_min: number | null
  delay_index: number
}

function GaugeArc({ value, max = 100, size = 120, strokeWidth = 10 }: { value: number; max?: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = Math.PI * radius // half circle
  const pct = Math.min(value / max, 1)
  const offset = circumference * (1 - pct)

  const getColor = (v: number) => {
    if (v <= 20) return '#22c55e' // green
    if (v <= 40) return '#facc15' // yellow
    if (v <= 60) return '#f97316' // orange
    return '#ef4444' // red
  }

  return (
    <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
      {/* Background arc */}
      <path
        d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Value arc */}
      <path
        d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
        fill="none"
        stroke={getColor(value)}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          filter: `drop-shadow(0 0 6px ${getColor(value)}80)`,
          transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s ease',
        }}
      />
      {/* Center value */}
      <text
        x={size / 2}
        y={size / 2 - 2}
        textAnchor="middle"
        fill={getColor(value)}
        fontSize="24"
        fontWeight="700"
        style={{ filter: `drop-shadow(0 0 4px ${getColor(value)}40)` }}
      >
        {value}
      </text>
      <text
        x={size / 2}
        y={size / 2 + 14}
        textAnchor="middle"
        fill="rgba(255,255,255,0.4)"
        fontSize="9"
        fontWeight="500"
        letterSpacing="0.1em"
      >
        DELAY INDEX
      </text>
    </svg>
  )
}

function StatCard({ label, value, color = 'cyan' }: { label: string; value: string | number; color?: string }) {
  const colorMap: Record<string, { text: string; bg: string; glow: string }> = {
    cyan: { text: 'text-[var(--vermillion)]', bg: 'bg-[var(--wash-accent)]', glow: 'rgba(0,212,255,0.15)' },
    amber: { text: 'text-[var(--brass)]', bg: 'bg-[var(--wash-brass)]', glow: 'rgba(251,191,36,0.15)' },
    red: { text: 'text-[var(--vermillion-dk)]', bg: 'bg-[var(--wash-accent)]', glow: 'rgba(239,68,68,0.15)' },
    green: { text: 'text-[var(--jade)]', bg: 'bg-[var(--wash-jade)]', glow: 'rgba(16,185,129,0.15)' },
    violet: { text: 'text-[var(--vermillion)]', bg: 'bg-[var(--wash-accent)]', glow: 'rgba(139,92,246,0.15)' },
    orange: { text: 'text-[var(--brass)]', bg: 'bg-[var(--wash-brass)]', glow: 'rgba(251,146,60,0.15)' },
  }
  const c = colorMap[color] || colorMap.cyan

  return (
    <div
      className={`rounded-xl p-4 border border-[var(--rule)] ${c.bg}`}
      style={{ boxShadow: `0 0 20px ${c.glow}` }}
    >
      <div className="text-[10px] uppercase tracking-[0.15em] text-[color-mix(in_srgb,var(--ink-2)_40%,transparent)] font-semibold mb-1">{label}</div>
      <div className={`text-2xl font-bold ${c.text}`}>{value}</div>
    </div>
  )
}

export function AirportDelaysCard({ iata = 'BRS', window = '60m' }: { iata?: string; window?: string }) {
  const [data, setData] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fetch(`/api/delays/airport?iata=${encodeURIComponent(iata)}&window=${encodeURIComponent(window)}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      })
      .then((json) => {
        if (!alive) return
        setSource(json?.source ?? null)
        setData(json?.snapshot ?? null)
      })
      .catch((e) => alive && setError(e?.message || 'Failed to load'))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [iata, window])

  const zeroish = useMemo(() => {
    if (!data) return false
    const z = (v?: number | null) => (v ?? 0) === 0
    return z(data.scheduled_total) && z(data.delayed_15m) && z(data.delayed_30m) && z(data.delayed_60m) && z(data.canceled)
  }, [data])

  if (loading) {
    return (
      <div className="bg-[hsl(var(--card))]/60 backdrop-blur-xl rounded-2xl border border-[var(--rule)] p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-[var(--wash-ink)] rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-20 bg-[var(--wash-ink)] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[hsl(var(--card))]/60 backdrop-blur-xl rounded-2xl border border-[color-mix(in_srgb,var(--vermillion-dk)_20%,transparent)] p-6">
        <div className="flex items-center gap-3 text-[var(--vermillion-dk)]">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-[hsl(var(--card))]/60 backdrop-blur-xl rounded-2xl border border-[var(--rule)] p-6">
        <p className="text-[color-mix(in_srgb,var(--ink-2)_40%,transparent)] text-sm">No delay data available for {iata}.</p>
      </div>
    )
  }

  return (
    <div className="bg-[hsl(var(--card))]/60 backdrop-blur-xl rounded-2xl border border-[var(--rule)] p-6 space-y-6">
      {/* Header with gauge */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        <div className="flex flex-col items-center">
          <GaugeArc value={data.delay_index} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-[var(--ink)] mb-1">
            Airport Delays — {iata}
          </h3>
          <p className="text-xs text-[color-mix(in_srgb,var(--ink-2)_40%,transparent)] mb-3">
            {new Date(data.ts).toLocaleString()} • {source === 'rapidapi' ? 'Live via AeroDataBox' : source || 'cached'}
          </p>

          {zeroish && (source === 'rapidapi' || source === 'api-market' || source === 'market') && (
            <div className="bg-[var(--wash-brass)] border border-[color-mix(in_srgb,var(--brass)_20%,transparent)] rounded-lg px-3 py-2 mb-3">
              <p className="text-xs text-[var(--brass)] font-medium">
                ⚠️ Live data unavailable — provider returned zeros (rate limits or no subscription)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Delayed ≥15m" value={data.delayed_15m} color="amber" />
        <StatCard label="Delayed ≥30m" value={data.delayed_30m} color="orange" />
        <StatCard label="Delayed ≥60m" value={data.delayed_60m} color="red" />
        <StatCard label="Cancelled" value={data.canceled} color="red" />
        <StatCard label="Scheduled" value={data.scheduled_total} color="cyan" />
        <StatCard label="Departing" value={data.departing_total} color="violet" />
        <StatCard label="Avg Dep Delay" value={data.avg_dep_delay_min !== null ? `${data.avg_dep_delay_min}m` : '—'} color="amber" />
        <StatCard label="Avg Arr Delay" value={data.avg_arr_delay_min !== null ? `${data.avg_arr_delay_min}m` : '—'} color="orange" />
      </div>
    </div>
  )
}

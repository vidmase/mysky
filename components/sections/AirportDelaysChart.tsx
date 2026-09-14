"use client"

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'

type Point = {
  ts: string
  delay_index: number
  delayed_15m: number
  delayed_30m: number
  delayed_60m: number
  canceled: number
}

type TimeRange = { label: string; days: number; bucket: '15m' | '1h' | '1d' }

const TIME_RANGES: TimeRange[] = [
  { label: '24h', days: 1, bucket: '1h' },
  { label: '7d', days: 7, bucket: '1h' },
  { label: '30d', days: 30, bucket: '1d' },
  { label: '90d', days: 90, bucket: '1d' },
]

const METRICS = [
  { key: 'delay_index', label: 'Delay Index', color: '#60a5fa', fill: '#60a5fa20' },
  { key: 'delayed_15m', label: '≥15m', color: '#facc15', fill: '#facc1520' },
  { key: 'delayed_30m', label: '≥30m', color: '#f97316', fill: '#f9731620' },
  { key: 'delayed_60m', label: '≥60m', color: '#ef4444', fill: '#ef444420' },
  { key: 'canceled', label: 'Cancelled', color: '#a855f7', fill: '#a855f720' },
]

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-[hsl(var(--card))]/95 backdrop-blur-xl border border-[var(--rule)] rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-[10px] text-[color-mix(in_srgb,var(--ink-2)_40%,transparent)] font-medium mb-2">
        {new Date(label).toLocaleString()}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color, boxShadow: `0 0 4px ${entry.color}80` }}
              />
              <span className="text-xs text-[color-mix(in_srgb,var(--ink-2)_60%,transparent)]">{entry.name}</span>
            </div>
            <span className="text-xs font-semibold text-[var(--ink)]">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AirportDelaysChart({
  iata = 'BRS',
  bucket: initialBucket = '1d',
  days: initialDays = 90,
}: {
  iata?: string
  bucket?: '15m' | '1h' | '1d'
  days?: number
}) {
  const [series, setSeries] = useState<Point[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRange, setSelectedRange] = useState<TimeRange>(
    TIME_RANGES.find((r) => r.days === initialDays && r.bucket === initialBucket) || TIME_RANGES[3]
  )
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(new Set(['delay_index']))

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const to = new Date()
    const from = new Date(to.getTime() - selectedRange.days * 24 * 60 * 60 * 1000)
    fetch(
      `/api/delays/airport/timeseries?iata=${encodeURIComponent(iata)}&from=${from.toISOString()}&to=${to.toISOString()}&bucket=${selectedRange.bucket}`,
      { cache: 'no-store' }
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      })
      .then((json) => {
        if (!alive) return
        setSeries(json.series || [])
      })
      .catch((e) => alive && setError(e?.message || 'Failed to load'))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [iata, selectedRange])

  const toggleMetric = (key: string) => {
    setVisibleMetrics((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key) // keep at least one
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <div className="bg-[hsl(var(--card))]/60 backdrop-blur-xl rounded-2xl border border-[var(--rule)] p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-[var(--ink)]">{iata} Delay Trends</h3>

        {/* Time range selector */}
        <div className="flex items-center gap-1 bg-[var(--wash-ink)] rounded-lg p-1">
          {TIME_RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() => setSelectedRange(range)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${selectedRange.label === range.label
                ? 'bg-[var(--wash-accent)] text-[var(--vermillion)] shadow-sm'
                : 'text-[color-mix(in_srgb,var(--ink-2)_40%,transparent)] hover:text-[color-mix(in_srgb,var(--ink-2)_60%,transparent)] hover:bg-[var(--wash-ink)]'
                }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric toggles */}
      <div className="flex flex-wrap gap-2">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => toggleMetric(m.key)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border transition-all ${visibleMetrics.has(m.key)
              ? 'border-[var(--rule)] bg-[var(--wash-ink)]'
              : 'border-transparent bg-[var(--wash-ink)] opacity-50'
              }`}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: m.color, boxShadow: visibleMetrics.has(m.key) ? `0 0 6px ${m.color}80` : 'none' }}
            />
            <span style={{ color: visibleMetrics.has(m.key) ? m.color : 'rgba(255,255,255,0.4)' }}>
              {m.label}
            </span>
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-72">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-[color-mix(in_srgb,var(--vermillion)_30%,transparent)] border-t-[var(--vermillion)] rounded-full animate-spin" />
              <span className="text-xs text-[color-mix(in_srgb,var(--ink-2)_30%,transparent)]">Loading chart…</span>
            </div>
          </div>
        )}
        {!loading && error && (
          <div className="h-full flex items-center justify-center text-[var(--vermillion-dk)] text-sm">{error}</div>
        )}
        {!loading && !error && series.length === 0 && (
          <div className="h-full flex items-center justify-center text-[color-mix(in_srgb,var(--ink-2)_30%,transparent)] text-sm">
            No timeseries data for this range. Try a different time period or sync delay snapshots.
          </div>
        )}
        {!loading && !error && series.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
              <defs>
                {METRICS.map((m) => (
                  <linearGradient key={m.key} id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={m.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="ts"
                tickFormatter={(v) => {
                  const d = new Date(v)
                  return selectedRange.days <= 1
                    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
                }}
                minTickGap={40}
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip content={<CustomTooltip />} />
              {METRICS.filter((m) => visibleMetrics.has(m.key)).map((m) => (
                <Area
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  stroke={m.color}
                  strokeWidth={2}
                  fill={`url(#grad-${m.key})`}
                  dot={false}
                  name={m.label}
                  activeDot={{
                    r: 4,
                    fill: m.color,
                    stroke: '#f2ece1',
                    strokeWidth: 2,
                  }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

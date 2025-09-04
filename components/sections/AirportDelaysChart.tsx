"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

type Point = {
  ts: string
  delay_index: number
  delayed_15m: number
  delayed_30m: number
  delayed_60m: number
  canceled: number
}

export function AirportDelaysChart({ iata = 'BRS', bucket = '1h', days = 7 }: { iata?: string; bucket?: '15m' | '1h' | '1d'; days?: number }) {
  const [series, setSeries] = useState<Point[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const to = new Date()
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
    fetch(`/api/delays/airport/timeseries?iata=${encodeURIComponent(iata)}&from=${from.toISOString()}&to=${to.toISOString()}&bucket=${bucket}&source=db`, { cache: 'no-store' })
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
  }, [iata, bucket, days])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{iata} Delay Index — Timeseries</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <div>Loading…</div>}
        {!loading && error && <div className="text-red-600">{error}</div>}
        {!loading && !error && series.length === 0 && <div>No data.</div>}
        {!loading && !error && series.length > 0 && (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ left: 4, right: 4, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="ts" tickFormatter={(v) => new Date(v).toLocaleDateString()} minTickGap={32} />
                <YAxis yAxisId="idx" domain={[0, 100]} />
                <Tooltip labelFormatter={(v) => new Date(v as string).toLocaleString()} />
                <Line yAxisId="idx" type="monotone" dataKey="delay_index" stroke="#60a5fa" dot={false} name="Delay Index" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

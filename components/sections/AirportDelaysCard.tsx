"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

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

export function AirportDelaysCard({ iata = 'BRS', window = '60m' }: { iata?: string; window?: string }) {
  const [data, setData] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fetch(`/api/delays/airport?iata=${encodeURIComponent(iata)}&window=${encodeURIComponent(window)}&source=rapidapi`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      })
      .then((json) => {
        if (!alive) return
        setSource(json?.source ?? null)
        if (!json?.snapshot) {
          setData(null)
        } else {
          setData(json.snapshot)
        }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Airport Delays — {iata}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <div>Loading…</div>}
        {!loading && error && <div className="text-red-600">{error}</div>}
        {!loading && !error && !data && (
          <div>No data available for the selected window.</div>
        )}
        {!loading && !error && data && zeroish && (source === 'rapidapi' || source === 'api-market' || source === 'market') && (
          <Alert className="mb-4">
            <AlertTitle>Live data unavailable</AlertTitle>
            <AlertDescription>
              The provider returned no data. This can happen due to rate limits or a missing subscription. Values below may appear as zeros.
            </AlertDescription>
          </Alert>
        )}
        {!loading && !error && data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Delay Index</div>
              <div className="text-2xl font-semibold">{data.delay_index}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Delayed ≥15m</div>
              <div className="text-xl">{data.delayed_15m}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Delayed ≥30m</div>
              <div className="text-xl">{data.delayed_30m}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Delayed ≥60m</div>
              <div className="text-xl">{data.delayed_60m}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Canceled</div>
              <div className="text-xl">{data.canceled}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Scheduled</div>
              <div className="text-xl">{data.scheduled_total}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Avg Dep Delay (min)</div>
              <div className="text-xl">{data.avg_dep_delay_min ?? '-'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Avg Arr Delay (min)</div>
              <div className="text-xl">{data.avg_arr_delay_min ?? '-'}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

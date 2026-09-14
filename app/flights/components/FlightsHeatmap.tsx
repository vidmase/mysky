"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import type { Flight } from "@/app/flights/FlightsClient"
import { airportData } from "@/lib/airport-data"

// Basic color scale from light to intense
function colorForCount(n: number) {
  if (n >= 10) return "#b10026"
  if (n >= 7) return "#e31a1c"
  if (n >= 5) return "#fc4e2a"
  if (n >= 3) return "#fd8d3c"
  if (n >= 2) return "#feb24c"
  return "#fed976"
}

export function FlightsHeatmap() {
  const { data: flights = [] } = useQuery<Flight[]>({
    queryKey: ["flights"],
    queryFn: async () => {
      const res = await fetch("/api/flights")
      if (!res.ok) throw new Error("Failed to fetch flights")
      return res.json()
    },
  })

  // Aggregate airport IATA visits and country visits using airportData
  const { airportCounts, countryCounts, points } = useMemo(() => {
    const aCounts = new Map<string, number>()
    const cCounts = new Map<string, number>()

    const addIata = (iata?: string | null) => {
      if (!iata) return
      const code = iata.toUpperCase()
      aCounts.set(code, (aCounts.get(code) || 0) + 1)
      const info = airportData[code]
      if (info?.country) cCounts.set(info.country, (cCounts.get(info.country) || 0) + 1)
    }

    flights.forEach((f) => {
      addIata(f.departure_iata || undefined)
      addIata(f.arrival_iata || undefined)
    })

    // Build point list with coords if available
    const pts: { lat: number; lng: number; iata: string; count: number; label: string }[] = []
    for (const [iata, count] of aCounts) {
      const info = airportData[iata]
      // @ts-expect-error allow optional coords presence in dataset
      const lat = info?.lat as number | undefined
      // @ts-expect-error allow optional coords presence in dataset
      const lng = info?.lng as number | undefined
      if (lat != null && lng != null) {
        pts.push({ lat, lng, iata, count, label: `${info?.name || iata} (${iata})` })
      }
    }

    // Sort for stable rendering
    pts.sort((a, b) => b.count - a.count)

    return { airportCounts: aCounts, countryCounts: cCounts, points: pts }
  }, [flights])

  // Country list sorted by visits
  const countryList = useMemo(() => {
    return Array.from(countryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([country, count]) => ({ country, count }))
  }, [countryCounts])

  // Compute map center: fallback to Europe centroid
  const center = useMemo<[number, number]>(() => {
    if (points.length > 0) {
      const lat = points.reduce((s, p) => s + p.lat, 0) / points.length
      const lng = points.reduce((s, p) => s + p.lng, 0) / points.length
      return [lat, lng]
    }
    return [50.5, 9] // Europe-ish
  }, [points])

  return (
    <div className="space-y-6">
      {/* Airports heatmap (bubble intensity) */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Visited Airports</h2>
          <div className="text-sm text-muted-foreground">{points.length} airports with coordinates</div>
        </div>
        <div className="h-[520px] rounded-md overflow-hidden border">
          {/* Leaflet map */}
          <MapContainer center={center} zoom={4} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {points.map((p) => (
              <CircleMarker
                key={p.iata}
                center={[p.lat, p.lng]}
                radius={6 + Math.min(24, p.count * 3)}
                pathOptions={{ color: colorForCount(p.count), fillColor: colorForCount(p.count), fillOpacity: 0.6 }}
              >
                <LeafletTooltip>
                  <div className="text-sm">
                    <div className="font-medium">{p.label}</div>
                    <div className="text-muted-foreground">Visits: {p.count}</div>
                  </div>
                </LeafletTooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </section>

      {/* Countries heatmap (list with intensity color) */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Visited Countries</h2>
        {countryList.length === 0 ? (
          <div className="text-sm text-muted-foreground">No country data available.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {countryList.map(({ country, count }) => (
              <div key={country} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="truncate mr-3">{country}</div>
                <div
                  className="px-2 py-0.5 rounded text-xs font-medium text-[var(--ink)]"
                  style={{ backgroundColor: colorForCount(count) }}
                  title={`${count} visits`}
                >
                  {count}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

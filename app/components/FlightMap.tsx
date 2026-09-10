"use client"

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icons in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})

interface Airport {
    iata: string
    name: string
    lat: number
    lon: number
}

interface FlightMapProps {
    departureAirport: string
    arrivalAirport: string
    departureIata?: string | null
    arrivalIata?: string | null
}

export default function FlightMap({
    departureAirport,
    arrivalAirport,
    departureIata,
    arrivalIata
}: FlightMapProps) {
    const [airports, setAirports] = useState<[Airport, Airport] | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const mapContainerRef = useRef<HTMLDivElement>(null)
    const mapInstanceRef = useRef<L.Map | null>(null)

    useEffect(() => {
        const fetchAirportCoordinates = async () => {
            setLoading(true)
            setError(null)
            try {
                const response = await fetch('/api/airports', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        departure: departureIata && departureIata !== "None" ? departureIata : departureAirport,
                        arrival: arrivalIata && arrivalIata !== "None" ? arrivalIata : arrivalAirport,
                        departureName: departureAirport,
                        arrivalName: arrivalAirport
                    }),
                })

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    throw new Error(errorData.error || `HTTP ${response.status}`)
                }

                const data = await response.json()
                setAirports([
                    {
                        iata: data.departure.iata,
                        name: departureAirport,
                        lat: data.departure.lat,
                        lon: data.departure.lon
                    },
                    {
                        iata: data.arrival.iata,
                        name: arrivalAirport,
                        lat: data.arrival.lat,
                        lon: data.arrival.lon
                    }
                ])
            } catch (err) {
                console.error('Error fetching airport coordinates:', err)
                setError(err instanceof Error ? err.message : 'Unknown error')
            } finally {
                setLoading(false)
            }
        }

        fetchAirportCoordinates()
    }, [departureAirport, arrivalAirport, departureIata, arrivalIata])

    // Initialize / update the Leaflet map when airports data is ready
    useEffect(() => {
        if (!airports || !mapContainerRef.current) return

        // Clean up any existing map instance first
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove()
            mapInstanceRef.current = null
        }

        const [departure, arrival] = airports
        const bounds = L.latLngBounds(
            [departure.lat, departure.lon],
            [arrival.lat, arrival.lon]
        )

        const map = L.map(mapContainerRef.current, {
            zoomControl: false,
        }).fitBounds(bounds.pad(0.1))

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map)

        L.marker([departure.lat, departure.lon])
            .addTo(map)
            .bindPopup(departure.name)

        L.marker([arrival.lat, arrival.lon])
            .addTo(map)
            .bindPopup(arrival.name)

        L.polyline(
            [[departure.lat, departure.lon], [arrival.lat, arrival.lon]],
            { color: '#3B82F6', weight: 2, dashArray: '4' }
        ).addTo(map)

        mapInstanceRef.current = map

        return () => {
            map.remove()
            mapInstanceRef.current = null
        }
    }, [airports])

    if (loading) {
        return (
            <div className="aspect-video bg-muted/50 rounded-md flex items-center justify-center">
                <div className="text-center space-y-2">
                    <p className="text-sm font-medium">Loading map...</p>
                </div>
            </div>
        )
    }

    if (error || !airports) {
        return (
            <div className="aspect-video bg-muted/50 rounded-md flex items-center justify-center border border-dashed">
                <div className="text-center space-y-2 p-4">
                    <p className="text-sm font-medium text-muted-foreground">Map unavailable</p>
                    <p className="text-xs text-muted-foreground">
                        Could not load coordinates for {departureAirport} → {arrivalAirport}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="aspect-video relative rounded-md overflow-hidden">
            <div ref={mapContainerRef} className="h-full w-full z-0" />
        </div>
    )
}

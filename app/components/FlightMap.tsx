"use client"

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { PlaneIcon } from './PlaneIcon'

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.Icon.extend({
    options: {
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    }
})

// Custom plane icon
const PlaneMarkerIcon = L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500 w-6 h-6" style="transform: rotate(180deg)">
        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path>
    </svg>`,
    className: 'plane-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
})

L.Marker.prototype.options.icon = new DefaultIcon()

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
    const mapRef = useRef<L.Map | null>(null)
    const planeMarkerRef = useRef<L.Marker | null>(null)

    useEffect(() => {
        const fetchAirportCoordinates = async () => {
            try {
                const response = await fetch('/api/airports', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        departure: departureIata || departureAirport.substring(0, 3),
                        arrival: arrivalIata || arrivalAirport.substring(0, 3)
                    }),
                })

                if (!response.ok) {
                    throw new Error('Failed to fetch airport coordinates')
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
            } catch (error) {
                console.error('Error fetching airport coordinates:', error)
            }
        }

        fetchAirportCoordinates()
    }, [departureAirport, arrivalAirport, departureIata, arrivalIata])

    useEffect(() => {
        if (!airports || !mapRef.current) return

        const [departure, arrival] = airports
        const map = mapRef.current

        // Remove existing plane marker if it exists
        if (planeMarkerRef.current) {
            planeMarkerRef.current.remove()
        }

        // Create and add the plane marker at the departure point
        const planeMarker = L.marker([departure.lat, departure.lon], {
            icon: PlaneMarkerIcon
        }).addTo(map)
        planeMarkerRef.current = planeMarker

        // Calculate intermediate points for smooth animation
        const numPoints = 500 // Increased number of points for smoother animation
        const points: [number, number][] = []

        // Add curved path calculation
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints
            // Add slight curve to the path
            const lat = departure.lat + (arrival.lat - departure.lat) * t
            const lon = departure.lon + (arrival.lon - departure.lon) * t
            // Add altitude variation (curved path)
            const mid = Math.sin(t * Math.PI) * 0.5 // Maximum curve at middle point
            const curvedLat = lat + mid * (Math.abs(arrival.lat - departure.lat) * 0.1)
            points.push([curvedLat, lon])
        }

        // Animate the plane along the path
        let currentPoint = 0
        let lastTimestamp = 0
        const ANIMATION_DURATION = 60000 // 60 seconds total duration
        const FRAME_DURATION = ANIMATION_DURATION / points.length

        const animateMarker = (timestamp: number) => {
            if (currentPoint >= points.length) return

            // Calculate if enough time has passed for next frame
            if (timestamp - lastTimestamp >= FRAME_DURATION) {
                const [lat, lon] = points[currentPoint]
                planeMarker.setLatLng([lat, lon])

                // Calculate bearing for plane rotation
                const nextPoint = points[Math.min(currentPoint + 1, points.length - 1)]
                const dx = nextPoint[1] - points[currentPoint][1]
                const dy = nextPoint[0] - points[currentPoint][0]
                const bearing = (Math.atan2(dx, dy) * 180) / Math.PI

                // Update plane rotation - adjust for 180-degree appearance
                const planeElement = planeMarker.getElement()
                if (planeElement) {
                    const svgElement = planeElement.querySelector('svg')
                    if (svgElement) {
                        // Add 180 degrees to maintain downward orientation
                        svgElement.style.transform = `rotate(${bearing + 180}deg)`
                    }
                }

                currentPoint++
                lastTimestamp = timestamp
            }

            requestAnimationFrame(animateMarker)
        }

        // Start the animation
        requestAnimationFrame(animateMarker)

        // Cleanup
        return () => {
            if (planeMarkerRef.current) {
                planeMarkerRef.current.remove()
            }
        }
    }, [airports])

    if (!airports) {
        return (
            <div className="aspect-video bg-muted/50 rounded-md flex items-center justify-center">
                <div className="text-center space-y-2">
                    <p className="text-sm font-medium">Loading map...</p>
                </div>
            </div>
        )
    }

    const [departure, arrival] = airports
    const bounds = L.latLngBounds(
        [departure.lat, departure.lon],
        [arrival.lat, arrival.lon]
    )
    const paddedBounds = bounds.pad(0.1)

    return (
        <div className="aspect-video relative rounded-md overflow-hidden">
            <MapContainer
                bounds={paddedBounds}
                className="h-full w-full z-0"
                zoomControl={false}
                ref={mapRef}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[departure.lat, departure.lon]}>
                    <Popup>{departure.name}</Popup>
                </Marker>
                <Marker position={[arrival.lat, arrival.lon]}>
                    <Popup>{arrival.name}</Popup>
                </Marker>
                <Polyline
                    positions={[
                        [departure.lat, departure.lon],
                        [arrival.lat, arrival.lon]
                    ]}
                    color="#3B82F6"
                    weight={2}
                    dashArray="4"
                />
            </MapContainer>
        </div>
    )
} 
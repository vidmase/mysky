"use client"

import L from "leaflet"
import { useEffect, useRef } from "react"

import { getGreatCirclePoints } from "@/lib/utils"

import "leaflet/dist/leaflet.css"

import s from "./boarding-pass.module.css"

/**
 * The leg on a real map, for the back of its boarding pass.
 *
 * The coordinates arrive already resolved from the atlas, so unlike the map on
 * the detail page this one asks the server for nothing — a booking prints one
 * pass per leg, and a request per card to place two airports the bundle already
 * knows would be a poor trade.
 *
 * It is a picture rather than a viewport: the card is the thing being handled,
 * so dragging and zooming are off and the view is fitted to the route. The line
 * is the great circle, not a straight one between the ends, because that is the
 * track an aeroplane actually flies. OpenStreetMap's credit stays on the tiles,
 * as its licence asks.
 */
export default function PassMap({
  from,
  to,
  colour,
}: {
  /** [lon, lat], the order the atlas files them in. */
  from: [number, number]
  to: [number, number]
  /** The carrier's colour, so the track matches the band on the other side. */
  colour: string
}) {
  const holder = useRef<HTMLDivElement>(null)
  const [fromLon, fromLat] = from
  const [toLon, toLat] = to

  useEffect(() => {
    const element = holder.current
    if (!element) return

    // Leaflet reads [lat, lon]; the atlas files [lon, lat].
    const arc = getGreatCirclePoints([fromLon, fromLat], [toLon, toLat], 64).map(
      ([lon, lat]) => [lat, lon] as [number, number]
    )

    const map = L.map(element, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
    })

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    L.polyline(arc, { color: colour, weight: 2.5, opacity: 0.95 }).addTo(map)

    // Circles rather than pins: a pin would need an image from a third party,
    // and at this size a dot on the coastline reads better anyway.
    for (const end of [arc[0], arc[arc.length - 1]]) {
      L.circleMarker(end, {
        radius: 5,
        color: colour,
        weight: 2.5,
        fillColor: "#ffffff",
        fillOpacity: 1,
      }).addTo(map)
    }

    map.fitBounds(L.latLngBounds(arc).pad(0.2))

    // The card sizes both faces before either is shown, so the box is already
    // right — but the map is built as the card turns, and a measurement taken
    // mid-turn can land short.
    const settle = window.setTimeout(() => map.invalidateSize(), 0)

    return () => {
      window.clearTimeout(settle)
      map.remove()
    }
  }, [fromLon, fromLat, toLon, toLat, colour])

  return <div ref={holder} className={s.map} />
}

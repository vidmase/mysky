"use client"

import L from 'leaflet'
import { prefersReducedMotion, routeColor } from './atlas-config'
import type { AtlasRoute } from './RouteAtlas'

/**
 * The arriving flight — the HyperFrames `nyc-paris-flight` block, re-inked for
 * the plate.
 *
 * The reference block flies a plane along a route, draws the route in behind it,
 * scratches a doodle ring around the destination and pops the wheels down on
 * arrival. The same choreography runs here on the atlas itself, in the plate's
 * own inks: the trail is the route's own colour one weight heavier (the ink is
 * still wet), the ring is vermillion — the ink the plate already uses for "here"
 * — and the landing is stamped instead of announced with a badge.
 *
 * Progress is measured in kilometres along the great circle, not in pixels, so
 * the plane holds a steady speed and arrives on time whether the hop is
 * Vilnius–Riga or Vilnius–Tokyo.
 */

/** The choreography in milliseconds — the reference block's timeline, tightened. */
const TIMING = {
  /** the plane is inked in before it moves */
  intro: 300,
  /** the hop itself, eased in and out like a real take-off and landing */
  travel: 3400,
  /** where along the route the ring starts closing (the block: 4.18 s of 5.6 s) */
  ringFrom: 0.6,
  /** ...and the share of the route it takes to close */
  ringSpan: 0.3,
  /** how long the ring and the stamp sit on the plate after the wheels are down */
  hold: 1500,
  /** ticks printed along the arc as the plane passes them */
  ticks: 6,
  /** the plane in px: big enough to read, small enough to look printed */
  plane: 34,
}

/** The plate's paper, as the atlas draws it — Paper and Midnight are one sheet. */
const PAPER_LIGHT = '#fbf7ef'
const PAPER_DARK = '#0b0d11'

/* The plane and the doodle ring are traced from the reference block, so the
   motion keeps its shape; only their colours are ours. The ring is re-based on
   its own bounding box so it can be dropped around any arrival. */
const PLANE_HULL =
  'M 58 0 C 52 -10 37 -15 15 -16 L -18 -56 C -23 -62 -34 -58 -32 -49 L -21 -15 L -48 -12 C -56 -11 -60 -6 -60 0 C -60 6 -56 11 -48 12 L -21 15 L -32 49 C -34 58 -23 62 -18 56 L 15 16 C 37 15 52 10 58 0 Z'
const PLANE_CORE =
  'M 54 0 C 46 -6 33 -9 14 -10 L -19 -50 C -21 -53 -25 -52 -25 -47 L -15 -10 L -49 -6 C -53 -5 -55 -2 -55 0 C -55 2 -53 5 -49 6 L -15 10 L -25 47 C -25 52 -21 53 -19 50 L 14 10 C 33 9 46 6 54 0 Z'
const RING_MAIN =
  'M 26 102 C 21 43 76 7 143 20 C 216 35 256 78 236 136 C 221 188 140 206 72 182 C 34 169 10 137 26 102'
const RING_ECHO =
  'M 34 116 C 4 76 44 27 121 16 C 204 4 264 58 246 117 C 229 173 157 200 86 183 C 42 173 20 147 34 116'
const RING_BOX = { width: 268, height: 210, drawn: 124 }

export type FlightHandle = { cancel: () => void }

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2
const backOut = (x: number, overshoot = 1.6) =>
  1 + (overshoot + 1) * Math.pow(x - 1, 3) + overshoot * Math.pow(x - 1, 2)

/* Matches the printed arc's widths in RouteAtlas: the trail is the same line,
   one weight heavier, as if the ink were still wet. */
function lineWidth(count: number): number {
  if (count >= 10) return 2.2
  if (count >= 5) return 1.6
  return 1
}

/** Great-circle bearing from a to b, in CSS-rotate degrees (0° = east). */
function heading(a: L.LatLng, b: L.LatLng): number {
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const dLon = ((b.lng - a.lng) * Math.PI) / 180
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (Math.atan2(y, x) * 180) / Math.PI
}

function planeHtml(ink: string, plate: string): string {
  return `<span class="atlas-plane-tilt"><span class="atlas-plane-scale">
    <svg viewBox="-64 -64 128 128" style="--flight-ink:${ink};--flight-plate:${plate}" aria-hidden="true">
      <path class="atlas-plane-hull" d="${PLANE_HULL}" />
      <path class="atlas-plane-core" d="${PLANE_CORE}" />
      <circle class="atlas-plane-dot" cx="18" cy="0" r="6" />
    </svg>
  </span></span>`
}

function ringHtml(ink: string): string {
  return `<svg viewBox="0 0 ${RING_BOX.width} ${RING_BOX.height}" style="--flight-ring:${ink}" aria-hidden="true">
    <path class="atlas-ring-main" d="${RING_MAIN}" />
    <path class="atlas-ring-echo" d="${RING_ECHO}" />
  </svg>`
}

function pathEl(layer: L.Polyline): SVGPathElement | null {
  const el = layer.getElement() as SVGPathElement | undefined
  return el && typeof el.getTotalLength === 'function' ? el : null
}

/**
 * Fly `route` on `map`. Returns a handle to call it off — the caller owns
 * putting the plate back the way it was.
 */
export function flyRoute(
  map: L.Map,
  route: AtlasRoute,
  opts: { dark: boolean; onDone?: () => void }
): FlightHandle {
  const latlngs = route.path.map(([lat, lng]) => L.latLng(lat, lng))
  if (latlngs.length < 2) return { cancel: () => {} }

  const dark = opts.dark
  const plate = dark ? PAPER_DARK : PAPER_LIGHT
  const ink = routeColor(route.count, dark)
  // The ring is always the plate's loudest ink: it marks an arrival, not a route.
  const ringInk = routeColor(5, dark)

  const group = L.layerGroup().addTo(map)

  // --- the arc, drawn by the plane ---
  const stroke = (options: L.PolylineOptions) =>
    L.polyline(route.path, {
      interactive: false,
      lineCap: 'round',
      lineJoin: 'round',
      ...options,
    }).addTo(group)

  const glow = stroke({ color: ink, weight: 9, opacity: dark ? 0.34 : 0.18, className: 'atlas-flight-glow' })
  const line = stroke({ color: ink, weight: lineWidth(route.count) + 0.8, opacity: 1 })
  const thread = stroke({ color: plate, weight: Math.max(0.7, lineWidth(route.count) * 0.5), opacity: 0.72 })

  const reveal = (layer: L.Polyline, fraction: number) => {
    const el = pathEl(layer)
    if (!el) return
    const length = el.getTotalLength()
    if (!length) return
    el.setAttribute('stroke-dasharray', String(length))
    el.setAttribute('stroke-dashoffset', String(length * (1 - clamp01(fraction))))
  }
  reveal(glow, 0)
  reveal(line, 0)
  reveal(thread, 0)

  // --- what the plane passes over ---
  // The path is sampled evenly along the great circle, so equal index steps are
  // equal distances: the plane's position is an index, and each tick sits on one.
  const cumKm: number[] = [0]
  for (let i = 1; i < latlngs.length; i++) {
    cumKm.push(cumKm[i - 1] + latlngs[i - 1].distanceTo(latlngs[i]) / 1000)
  }
  const totalKm = cumKm[cumKm.length - 1] || 1

  /* The trail is revealed in the path's own units (what the browser measured),
     which is what the projection did to the distance — the two only agree at the
     equator, so the end of the trail is looked up rather than assumed. */
  const points = latlngs.map((ll) => map.latLngToLayerPoint(ll))
  const cumPx: number[] = [0]
  for (let i = 1; i < points.length; i++) {
    cumPx.push(cumPx[i - 1] + points[i - 1].distanceTo(points[i]))
  }
  const totalPx = cumPx[cumPx.length - 1] || 1

  const locate = (progress: number) => {
    const target = progress * totalKm
    let i = 1
    while (i < latlngs.length - 1 && cumKm[i] < target) i++
    const span = cumKm[i] - cumKm[i - 1] || 1
    const f = clamp01((target - cumKm[i - 1]) / span)
    const a = latlngs[i - 1]
    const b = latlngs[i]
    const index = i - 1 + f
    const i0 = Math.floor(index)
    const i1 = Math.min(points.length - 1, i0 + 1)
    const px = cumPx[i0] + (cumPx[i1] - cumPx[i0]) * (index - i0)
    return {
      latlng: L.latLng(a.lat + (b.lat - a.lat) * f, a.lng + (b.lng - a.lng) * f),
      heading: heading(a, b),
      drawn: clamp01(px / totalPx),
    }
  }

  const plane = L.marker(latlngs[0], {
    icon: L.divIcon({
      className: 'atlas-plane',
      html: planeHtml(ink, plate),
      iconSize: [TIMING.plane, TIMING.plane],
      iconAnchor: [TIMING.plane / 2, TIMING.plane / 2],
    }),
    interactive: false,
    keyboard: false,
    // The plane flies over the ring it is about to land inside.
    zIndexOffset: 1000,
  }).addTo(group)

  const planeTilt = plane.getElement()?.querySelector<HTMLElement>('.atlas-plane-tilt') ?? null
  const planeScale = plane.getElement()?.querySelector<HTMLElement>('.atlas-plane-scale') ?? null

  const tickMarks = Array.from({ length: TIMING.ticks }, (_, i) => {
    const at = (i + 1) / (TIMING.ticks + 1)
    const marker = L.marker(locate(at).latlng, {
      icon: L.divIcon({
        className: 'atlas-tick',
        html: `<span style="--tick-ink:${ink}"></span>`,
        iconSize: [9, 9],
        iconAnchor: [4.5, 4.5],
      }),
      interactive: false,
      keyboard: false,
    }).addTo(group)
    const el = marker.getElement()
    const dot = el?.querySelector<HTMLElement>('span') ?? null
    if (el) el.style.opacity = '0'
    return { at, dot, el }
  })

  const destination = latlngs[latlngs.length - 1]
  const ring = L.marker(destination, {
    icon: L.divIcon({
      className: 'atlas-doodle',
      html: ringHtml(ringInk),
      iconSize: [
        RING_BOX.drawn,
        (RING_BOX.drawn * RING_BOX.height) / RING_BOX.width,
      ],
      iconAnchor: [
        RING_BOX.drawn / 2,
        (RING_BOX.drawn * RING_BOX.height) / RING_BOX.width / 2,
      ],
    }),
    interactive: false,
    keyboard: false,
  }).addTo(group)

  const ringStrokes = ring.getElement()?.querySelectorAll<SVGPathElement>('path') ?? []

  // --- the run ---
  let cancelled = false
  let landed = false
  let raf = 0
  let holdTimer = 0

  const started = performance.now()

  const land = () => {
    if (landed || cancelled) return
    landed = true
    reveal(glow, 1)
    reveal(line, 1)
    reveal(thread, 1)
    tickMarks.forEach((tick) => {
      if (tick.el) tick.el.style.opacity = '0.18'
      if (tick.dot) tick.dot.style.transform = 'scale(0.6)'
    })
    // The wheels touch: the plane pops, and the plate marks the arrival.
    plane.getElement()?.classList.add('is-landing')
    if (planeScale) planeScale.style.transform = ''
    if (planeTilt) planeTilt.style.transform = `rotate(${planeTilt.dataset.heading ?? '0'}deg)`

    const pop = L.marker(destination, {
      icon: L.divIcon({
        className: 'atlas-pop',
        html: `<span style="--flight-ring:${ringInk}"></span>`,
        iconSize: [140, 140],
        iconAnchor: [70, 70],
      }),
      interactive: false,
      keyboard: false,
      zIndexOffset: 900,
    }).addTo(group)

    const stamp = L.marker(destination, {
      icon: L.divIcon({
        className: 'atlas-stamp',
        html: `<span class="atlas-stamp-inner"><span class="atlas-stamp-rule"></span><span class="atlas-stamp-mark">Arrived</span><span class="atlas-stamp-code">${String(route.to).replace(/[^A-Za-z0-9]/g, '')}</span></span>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      }),
      interactive: false,
      keyboard: false,
      zIndexOffset: 900,
    }).addTo(group)
    stamp.getElement()?.classList.add('is-in')

    opts.onDone?.()

    holdTimer = window.setTimeout(() => {
      if (cancelled) return
      ring.getElement()?.classList.add('is-fading')
      plane.getElement()?.classList.add('is-fading')
      stamp.getElement()?.classList.add('is-out')
      pop.getElement()?.classList.add('is-fading')
      holdTimer = window.setTimeout(() => {
        if (!cancelled) group.remove()
      }, 700)
    }, TIMING.hold)
  }

  const frame = (now: number) => {
    if (cancelled) return
    const t = now - started
    const intro = clamp01(t / TIMING.intro)
    const progress = easeInOutSine(clamp01((t - TIMING.intro) / TIMING.travel))
    const at = locate(progress)

    if (planeTilt) {
      planeTilt.dataset.heading = String(at.heading - 90)
      planeTilt.style.transform = `rotate(${at.heading - 90}deg)`
    }
    if (planeScale) {
      // Inked in, then a slight lean into the wind for the rest of the hop.
      const scale = intro < 1 ? 0.5 + 0.5 * backOut(intro) : 1 + 0.02 * Math.sin(now / 90)
      planeScale.style.transform = `scale(${scale.toFixed(3)})`
    }
    plane.setLatLng(at.latlng)

    // The glow leads the drawn line and the paper thread trails it, the way a
    // wet nib spreads: three passes over the same arc, a moment apart.
    reveal(line, at.drawn)
    reveal(glow, clamp01(at.drawn * 1.05 + 0.01))
    reveal(thread, clamp01((at.drawn - 0.02) / 0.98))

    for (const tick of tickMarks) {
      if (!tick.el) continue
      const age = progress - tick.at
      if (age <= 0) {
        tick.el.style.opacity = '0'
        continue
      }
      const pop = clamp01(age / 0.06)
      const fades = clamp01((age - 0.06) / 0.16)
      tick.el.style.opacity = String(1 - fades * 0.82)
      if (tick.dot) {
        const scale = pop < 1 ? 0.2 + 0.8 * backOut(pop, 3) : 1 - 0.4 * fades
        tick.dot.style.transform = `scale(${scale.toFixed(3)})`
      }
    }

    const closing = clamp01((progress - TIMING.ringFrom) / TIMING.ringSpan)
    ringStrokes.forEach((strokeEl, i) => {
      const length = strokeEl.getTotalLength()
      if (!length) return
      // The echo scratch starts after the main one and finishes on touchdown.
      const fraction = i === 0 ? closing : clamp01((closing - 0.22) / 0.78)
      strokeEl.style.strokeDasharray = String(length)
      strokeEl.style.strokeDashoffset = String(length * (1 - fraction))
    })

    if (progress >= 1) {
      land()
      return
    }
    raf = requestAnimationFrame(frame)
  }

  raf = requestAnimationFrame(frame)

  return {
    cancel: () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.clearTimeout(holdTimer)
      group.remove()
    },
  }
}

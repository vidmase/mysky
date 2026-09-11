// Basemap and route-colour config shared by the page and the Leaflet canvas.
// Kept free of any Leaflet import so the page can read it during SSR.

export type BasemapId = 'paper' | 'midnight' | 'satellite'

export type Basemap = {
  id: BasemapId
  label: string
  url: string
  subdomains: string
  maxZoom: number
  attribution: string
  dark: boolean
}

/**
 * Free tile services, no API key and no signup: CARTO's basemaps are served
 * from basemaps.cartocdn.com, Esri's imagery from arcgisonline.com. Both only
 * ask for the attribution kept below, which Leaflet prints in the corner.
 */
export const BASEMAPS: Basemap[] = [
  {
    id: 'paper',
    label: 'Paper',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 20,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &middot; &copy; <a href="https://carto.com/attributions">CARTO</a>',
    dark: false,
  },
  {
    id: 'midnight',
    label: 'Midnight',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 20,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &middot; &copy; <a href="https://carto.com/attributions">CARTO</a>',
    dark: true,
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    subdomains: '',
    maxZoom: 19,
    attribution: 'Imagery &copy; <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics',
    dark: true,
  },
]

export function isDarkBasemap(id: BasemapId): boolean {
  return BASEMAPS.find((b) => b.id === id)?.dark ?? false
}

/* A pair you fly once is a faint pencil trace; fly it often enough and the
   line darkens all the way to vermillion. Same steps as the printed legend. */
export const ROUTE_COLORS = {
  light: ['#8c8071', '#2f6b53', '#c9942f', '#ce3b1e', '#a32c14'],
  // On a dark plate the same five steps have to be lifted off the ground,
  // or the quietest pairs disappear into the basemap.
  dark: ['#b8ad9c', '#57b48c', '#e5bd63', '#f26343', '#ff8163'],
} as const

export const ROUTE_STEPS = ['1 leg', '2 legs', '3–4 legs', '5–9 legs', '10+ legs']

export function routeColorIndex(count: number): number {
  if (count >= 10) return 4
  if (count >= 5) return 3
  if (count >= 3) return 2
  if (count >= 2) return 1
  return 0
}

export function routeColor(count: number, dark: boolean): string {
  return (dark ? ROUTE_COLORS.dark : ROUTE_COLORS.light)[routeColorIndex(count)]
}

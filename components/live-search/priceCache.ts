/** Client-side cache + light price history for live search calendar. */

const DAY_KEY = "mysky.livePrice.day.v1"
const HIST_KEY = "mysky.livePrice.history.v1"
const DAY_TTL_MS = 6 * 60 * 60 * 1000 // 6h
const HIST_MAX = 400

export type CachedDayPrice = {
  price: number
  currency: string
  savedAt: number
}

export type HistoryPoint = {
  route: string
  flightDate: string
  price: number
  currency: string
  observedAt: string // ISO
}

function routeKey(from: string, to: string, seat: string) {
  return `${from.toUpperCase()}|${to.toUpperCase()}|${seat}`
}

function dayCacheKey(from: string, to: string, seat: string, date: string) {
  return `${routeKey(from, to, seat)}|${date}`
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // quota / private mode — ignore
  }
}

export function getCachedDayPrice(
  from: string,
  to: string,
  seat: string,
  date: string
): CachedDayPrice | null {
  const all = readJson<Record<string, CachedDayPrice>>(DAY_KEY, {})
  const hit = all[dayCacheKey(from, to, seat, date)]
  if (!hit) return null
  if (Date.now() - hit.savedAt > DAY_TTL_MS) return null
  return hit
}

export function setCachedDayPrice(
  from: string,
  to: string,
  seat: string,
  date: string,
  price: number,
  currency: string
) {
  const all = readJson<Record<string, CachedDayPrice>>(DAY_KEY, {})
  all[dayCacheKey(from, to, seat, date)] = { price, currency, savedAt: Date.now() }
  writeJson(DAY_KEY, all)
  appendHistory({
    route: routeKey(from, to, seat),
    flightDate: date,
    price,
    currency,
    observedAt: new Date().toISOString(),
  })
}

export function appendHistory(point: HistoryPoint) {
  const list = readJson<HistoryPoint[]>(HIST_KEY, [])
  list.push(point)
  // keep newest
  const trimmed = list.length > HIST_MAX ? list.slice(list.length - HIST_MAX) : list
  writeJson(HIST_KEY, trimmed)
}

export function getHistoryForRoute(from: string, to: string, seat: string): HistoryPoint[] {
  const key = routeKey(from, to, seat)
  return readJson<HistoryPoint[]>(HIST_KEY, []).filter((p) => p.route === key)
}

export function getHistoryForFlightDate(
  from: string,
  to: string,
  seat: string,
  flightDate: string
): HistoryPoint[] {
  return getHistoryForRoute(from, to, seat)
    .filter((p) => p.flightDate === flightDate)
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt))
}

/** Run async work over items with a concurrency limit. */
export async function mapPool<T>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<void>,
  shouldCancel?: () => boolean
) {
  let i = 0
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (i < items.length) {
      if (shouldCancel?.()) return
      const idx = i++
      await fn(items[idx], idx)
    }
  })
  await Promise.all(workers)
}

import { NextResponse } from "next/server"
import { addDays, format, nextFriday, startOfDay } from "date-fns"
import { createSupabaseServer, resolveSupabaseUserId } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

type FlightRow = {
  departure_iata: string | null
  arrival_iata: string | null
  departure_airport: string | null
  arrival_airport: string | null
}

type OfferLite = {
  price: number
  airlines: string[]
  stops: number
  duration_minutes: number
  is_best?: boolean
}

function getFlightsApiBase(): string {
  const raw =
    process.env.FLIGHTS_API_URL?.trim() ||
    "https://gfscrape-git-main-vidmases-projects.vercel.app"
  return raw.replace(/\/+$/, "")
}

function upstreamHeaders(base: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  }
  if (base.includes("loca.lt")) {
    headers["bypass-tunnel-reminder"] = "true"
    headers["User-Agent"] = "Mozilla/5.0"
  }
  return headers
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|")
}

function sampleDatesOverSixWeeks(from: Date = new Date()): string[] {
  const start = startOfDay(from)
  // Prefer Fridays (common leisure departures), spanning ~6 weeks
  let first = nextFriday(start)
  if (first.getTime() === start.getTime()) {
    first = addDays(first, 7)
  }
  const dates: string[] = []
  for (let i = 0; i < 6; i++) {
    dates.push(format(addDays(first, i * 7), "yyyy-MM-dd"))
  }
  return dates
}

async function searchCheapestForDate(opts: {
  base: string
  from: string
  to: string
  date: string
  signal: AbortSignal
}): Promise<{ date: string; offer: OfferLite | null; currency: string; status: string; googleUrl: string | null }> {
  const { base, from, to, date, signal } = opts
  try {
    const res = await fetch(`${base}/api/search`, {
      method: "POST",
      headers: upstreamHeaders(base),
      signal,
      cache: "no-store",
      body: JSON.stringify({
        trip: "one-way",
        seat: "economy",
        passengers: {
          adults: 1,
          children: 0,
          infants_in_seat: 0,
          infants_on_lap: 0,
        },
        currency: "GBP",
        language: "en-GB",
        flights: [{ date, from_airport: from, to_airport: to }],
      }),
    })

    const data = await res.json().catch(() => ({}))
    const flights = Array.isArray(data?.flights) ? (data.flights as OfferLite[]) : []
    const priced = flights
      .filter((f) => typeof f.price === "number" && f.price > 0)
      .sort((a, b) => a.price - b.price)

    return {
      date,
      offer: priced[0] ?? null,
      currency: typeof data?.currency === "string" ? data.currency : "GBP",
      status: typeof data?.current_status === "string" ? data.current_status : res.ok ? "ok" : "error",
      googleUrl: data?.google_flights_url ?? null,
    }
  } catch {
    return { date, offer: null, currency: "GBP", status: "error", googleUrl: null }
  }
}

export async function GET(request: Request) {
  try {
    const userId = await resolveSupabaseUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const overrideFrom = searchParams.get("from")?.trim().toUpperCase() || null
    const overrideTo = searchParams.get("to")?.trim().toUpperCase() || null

    const supabase = createSupabaseServer()
    const { data: flights, error } = await supabase
      .from("vidmaflights")
      .select("departure_iata, arrival_iata, departure_airport, arrival_airport")
      .eq("owner_id", userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (flights ?? []) as FlightRow[]

    // Undirected route counts + preferred direction
    type Agg = {
      a: string
      b: string
      count: number
      ab: number
      ba: number
      aName: string
      bName: string
    }
    const routes = new Map<string, Agg>()

    for (const f of rows) {
      const from = f.departure_iata?.trim().toUpperCase()
      const to = f.arrival_iata?.trim().toUpperCase()
      if (!from || !to || from.length !== 3 || to.length !== 3 || from === to) continue

      const key = pairKey(from, to)
      const existing = routes.get(key)
      if (!existing) {
        const [a, b] = [from, to].sort()
        routes.set(key, {
          a,
          b,
          count: 1,
          ab: from === a && to === b ? 1 : 0,
          ba: from === b && to === a ? 1 : 0,
          aName: from === a ? f.departure_airport || a : f.arrival_airport || a,
          bName: from === b ? f.departure_airport || b : f.arrival_airport || b,
        })
      } else {
        existing.count += 1
        if (from === existing.a && to === existing.b) existing.ab += 1
        if (from === existing.b && to === existing.a) existing.ba += 1
      }
    }

    let top = Array.from(routes.values()).sort((x, y) => y.count - x.count)[0] ?? null

    let fromIata: string
    let toIata: string
    let timesFlown: number
    let label: string

    if (overrideFrom && overrideTo && overrideFrom.length === 3 && overrideTo.length === 3) {
      fromIata = overrideFrom
      toIata = overrideTo
      const key = pairKey(fromIata, toIata)
      timesFlown = routes.get(key)?.count ?? 0
      label = `${fromIata}↔${toIata}`
    } else if (top) {
      // Prefer historically more common direction
      if (top.ab >= top.ba) {
        fromIata = top.a
        toIata = top.b
      } else {
        fromIata = top.b
        toIata = top.a
      }
      timesFlown = top.count
      label = `${top.a}↔${top.b}`
    } else {
      return NextResponse.json({
        ok: true,
        suggestion: null,
        message:
          "Not enough route history yet. Log a few flights with IATA codes, then come back for a personal next-trip tip.",
      })
    }

    const dates = sampleDatesOverSixWeeks()
    const base = getFlightsApiBase()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000)

    const samples = await Promise.all(
      dates.map((date) =>
        searchCheapestForDate({
          base,
          from: fromIata,
          to: toIata,
          date,
          signal: controller.signal,
        })
      )
    )
    clearTimeout(timeout)

    const withOffers = samples
      .filter((s) => s.offer)
      .sort((a, b) => (a.offer!.price) - (b.offer!.price))

    const best = withOffers[0] ?? null
    const allFailed = samples.every((s) => s.status === "error" || !s.offer)

    return NextResponse.json({
      ok: true,
      suggestion: {
        label,
        from: fromIata,
        to: toIata,
        timesFlown,
        windowDays: 42,
        sampleDates: dates,
        headline:
          timesFlown > 0
            ? `You've done ${label} ${timesFlown}×`
            : `Suggested route ${label}`,
        best: best
          ? {
              date: best.date,
              price: best.offer!.price,
              currency: best.currency,
              airlines: best.offer!.airlines ?? [],
              stops: best.offer!.stops ?? 0,
              durationMinutes: best.offer!.duration_minutes ?? 0,
              googleUrl: best.googleUrl,
              status: best.status,
            }
          : null,
        samples: samples.map((s) => ({
          date: s.date,
          price: s.offer?.price ?? null,
          currency: s.currency,
          status: s.status,
        })),
        liveStatus: allFailed ? "unavailable" : best?.status === "mock" ? "mock" : "live",
      },
      message: best
        ? null
        : allFailed
          ? "Could not reach live search right now. Your route pattern is ready — try again in a bit."
          : "No priced offers in the next 6 weeks for this direction.",
    })
  } catch (err) {
    console.error("GET /api/next-trip failed:", err)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}

"use client"

import { useCallback, useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { Loader2, Plane, RefreshCcw, Sparkles, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Sample = {
  date: string
  price: number | null
  currency: string
  status: string
}

type Suggestion = {
  label: string
  from: string
  to: string
  timesFlown: number
  windowDays: number
  sampleDates: string[]
  headline: string
  best: {
    date: string
    price: number
    currency: string
    airlines: string[]
    stops: number
    durationMinutes: number
    googleUrl: string | null
    status: string
  } | null
  samples: Sample[]
  liveStatus: "live" | "mock" | "unavailable"
}

type NextTripResponse = {
  ok?: boolean
  suggestion: Suggestion | null
  message?: string | null
  error?: string
}

export type NextTripExploreOpts = {
  from: string
  to: string
  date?: string
}

export type NextTripCardProps = {
  onExplore?: (opts: NextTripExploreOpts) => void
  className?: string
}

function formatMoney(price: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency || "GBP",
      maximumFractionDigits: 0,
    }).format(price)
  } catch {
    return `${currency || "GBP"} ${Math.round(price)}`
  }
}

function formatChipDate(iso: string) {
  try {
    return format(parseISO(iso), "d MMM")
  } catch {
    return iso
  }
}

export function NextTripCard({ onExplore, className }: NextTripCardProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<NextTripResponse | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/next-trip", { cache: "no-store" })
      const json = (await res.json().catch(() => ({}))) as NextTripResponse
      if (!res.ok) {
        setError(json.error || json.message || `Request failed (${res.status})`)
        setData(null)
        return
      }
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load next trip")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const suggestion = data?.suggestion ?? null

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-zinc-800 bg-zinc-900/80 text-zinc-50 shadow-lg backdrop-blur-sm",
        className
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-sky-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-blue-500/10 blur-3xl" />

      <CardHeader className="relative flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-300">
            <Sparkles className="h-3.5 w-3.5" />
            Smart next trip
          </div>
          <CardTitle className="text-lg font-semibold tracking-tight text-zinc-50 sm:text-xl">
            {loading
              ? "Finding your route…"
              : suggestion?.headline || "Your next trip"}
          </CardTitle>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Refresh next trip"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {loading && (
          <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-6 text-sm text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
            Sampling Fridays over the next ~6 weeks for live prices…
          </div>
        )}

        {!loading && error && (
          <div className="space-y-3 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            <p>{error}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
              onClick={() => void load()}
            >
              Try again
            </Button>
          </div>
        )}

        {!loading && !error && !suggestion && (
          <p className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-400">
            {data?.message ||
              "Not enough route history yet. Log a few flights with IATA codes, then come back."}
          </p>
        )}

        {!loading && !error && suggestion && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="border border-zinc-700 bg-zinc-800/80 font-normal text-zinc-200"
              >
                <Plane className="mr-1.5 h-3.5 w-3.5 text-sky-400" />
                {suggestion.from} → {suggestion.to}
              </Badge>
              {suggestion.timesFlown > 0 && (
                <Badge
                  variant="outline"
                  className="border-sky-500/40 bg-sky-500/10 font-normal text-sky-300"
                >
                  Flown {suggestion.timesFlown}×
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "font-normal",
                  suggestion.liveStatus === "live" &&
                    "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
                  suggestion.liveStatus === "mock" &&
                    "border-amber-500/40 bg-amber-500/10 text-amber-300",
                  suggestion.liveStatus === "unavailable" &&
                    "border-zinc-600 bg-zinc-800/60 text-zinc-400"
                )}
              >
                {suggestion.liveStatus === "live"
                  ? "Live prices"
                  : suggestion.liveStatus === "mock"
                    ? "Sample prices"
                    : "Prices unavailable"}
              </Badge>
            </div>

            {suggestion.best ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Cheapest Friday sample
                </p>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-3xl font-bold tabular-nums text-sky-300">
                    {formatMoney(suggestion.best.price, suggestion.best.currency)}
                  </span>
                  <span className="text-sm text-zinc-400">
                    {format(parseISO(suggestion.best.date), "EEE d MMM yyyy")}
                  </span>
                </div>
                {(suggestion.best.airlines?.length > 0 ||
                  typeof suggestion.best.stops === "number") && (
                  <p className="mt-2 text-xs text-zinc-500">
                    {[
                      suggestion.best.airlines?.slice(0, 2).join(", "),
                      suggestion.best.stops === 0
                        ? "Direct"
                        : `${suggestion.best.stops} stop${suggestion.best.stops === 1 ? "" : "s"}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-400">
                {data?.message ||
                  "No priced offers in the next 6 weeks for this direction."}
              </p>
            )}

            {suggestion.samples?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Sample Fridays
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestion.samples.map((s) => {
                    const isBest =
                      suggestion.best &&
                      s.date === suggestion.best.date &&
                      s.price != null
                    return (
                      <button
                        key={s.date}
                        type="button"
                        disabled={!onExplore}
                        onClick={() =>
                          onExplore?.({
                            from: suggestion.from,
                            to: suggestion.to,
                            date: s.date,
                          })
                        }
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                          isBest
                            ? "border-sky-500/50 bg-sky-500/15 text-sky-200"
                            : "border-zinc-700 bg-zinc-800/60 text-zinc-300",
                          onExplore && "hover:border-sky-500/40 hover:bg-zinc-800 cursor-pointer",
                          !onExplore && "cursor-default"
                        )}
                      >
                        <span>{formatChipDate(s.date)}</span>
                        <span className="tabular-nums text-zinc-400">
                          {s.price != null
                            ? formatMoney(s.price, s.currency)
                            : "—"}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                className="gap-2 bg-sky-600 text-white hover:bg-sky-500"
                disabled={!onExplore}
                onClick={() =>
                  onExplore?.({
                    from: suggestion.from,
                    to: suggestion.to,
                    date: suggestion.best?.date,
                  })
                }
              >
                Explore deals
                <ArrowRight className="h-4 w-4" />
              </Button>
              {suggestion.best?.googleUrl && (
                <Button
                  type="button"
                  variant="outline"
                  className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800"
                  asChild
                >
                  <a
                    href={suggestion.best.googleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Google Flights
                  </a>
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

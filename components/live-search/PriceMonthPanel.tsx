"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import {
  getCachedDayPrice,
  getHistoryForFlightDate,
  mapPool,
  setCachedDayPrice,
} from "./priceCache"
import type { LiveSearchResponse } from "./types"
import { shiftDate } from "./mapOfferToFlight"

export type MonthDayCell = {
  date: string
  inMonth: boolean
  price: number | null
  loading: boolean
  error?: string
}

type Props = {
  from: string
  to: string
  seat: string
  selectedDate: string
  currency: string
  /** Build one-way search body for a given YYYY-MM-DD */
  buildOneWayBody: (date: string) => unknown
  onSelectDate: (date: string) => void
  /** When true, auto-start loading the visible month */
  autoLoad?: boolean
}

function monthStart(isoMonth: string) {
  return `${isoMonth}-01`
}

function toMonth(isoDate: string) {
  return isoDate.slice(0, 7)
}

function addMonths(isoMonth: string, delta: number) {
  const [y, m] = isoMonth.split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

function daysInMonth(isoMonth: string) {
  const [y, m] = isoMonth.split("-").map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** Monday-first weekday 0..6 */
function mondayIndex(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00Z`)
  return (d.getUTCDay() + 6) % 7
}

function formatMonthTitle(isoMonth: string) {
  const d = new Date(`${isoMonth}-01T12:00:00Z`)
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function priceColor(price: number, min: number, max: number) {
  if (max <= min) return "bg-[var(--wash-jade)] text-[var(--jade)] border-[color-mix(in_srgb,var(--jade)_40%,transparent)]"
  const t = (price - min) / (max - min)
  if (t <= 0.33) return "bg-[var(--wash-jade)] text-[var(--jade)] border-[color-mix(in_srgb,var(--jade)_40%,transparent)]"
  if (t <= 0.66) return "bg-[var(--wash-brass)] text-[var(--brass)] border-[color-mix(in_srgb,var(--brass)_40%,transparent)]"
  return "bg-[var(--wash-accent)] text-[var(--vermillion-dk)] border-[color-mix(in_srgb,var(--vermillion-dk)_40%,transparent)]"
}

function priceLabel(currency: string, price: number) {
  if (currency === "GBP") return `£${price}`
  return `${currency} ${price}`
}

export function PriceMonthPanel({
  from,
  to,
  seat,
  selectedDate,
  currency,
  buildOneWayBody,
  onSelectDate,
  autoLoad = false,
}: Props) {
  const [month, setMonth] = useState(() => toMonth(selectedDate || todayIso()))
  const [cells, setCells] = useState<MonthDayCell[]>([])
  const [loadingMonth, setLoadingMonth] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [chartTab, setChartTab] = useState<"month" | "history">("month")
  const cancelRef = useRef(false)
  const genRef = useRef(0)

  const fromCode = from.trim().toUpperCase()
  const toCode = to.trim().toUpperCase()
  const canLoad = fromCode.length === 3 && toCode.length === 3

  const grid = useMemo(() => {
    const start = monthStart(month)
    const n = daysInMonth(month)
    const lead = mondayIndex(start)
    const dates: { date: string; inMonth: boolean }[] = []
    for (let i = 0; i < lead; i++) {
      dates.push({ date: shiftDate(start, -(lead - i)), inMonth: false })
    }
    for (let d = 1; d <= n; d++) {
      dates.push({
        date: `${month}-${String(d).padStart(2, "0")}`,
        inMonth: true,
      })
    }
    while (dates.length % 7 !== 0) {
      const last = dates[dates.length - 1].date
      dates.push({ date: shiftDate(last, 1), inMonth: false })
    }
    return dates
  }, [month])

  // Merge grid skeleton with cell state
  const displayCells = useMemo(() => {
    const map = new Map(cells.map((c) => [c.date, c]))
    return grid.map((g) => {
      const hit = map.get(g.date)
      return (
        hit || {
          date: g.date,
          inMonth: g.inMonth,
          price: null,
          loading: false,
        }
      )
    })
  }, [grid, cells])

  const priced = displayCells.filter((c) => c.inMonth && c.price != null) as (MonthDayCell & {
    price: number
  })[]
  const minP = priced.length ? Math.min(...priced.map((c) => c.price)) : 0
  const maxP = priced.length ? Math.max(...priced.map((c) => c.price)) : 0

  const monthChartData = useMemo(
    () =>
      displayCells
        .filter((c) => c.inMonth)
        .map((c) => ({
          date: c.date,
          day: Number(c.date.slice(8, 10)),
          price: c.price,
          label: c.date.slice(8, 10),
        })),
    [displayCells]
  )

  const historyData = useMemo(() => {
    if (!canLoad) return []
    return getHistoryForFlightDate(fromCode, toCode, seat, selectedDate).map((p) => ({
      t: p.observedAt.slice(0, 16).replace("T", " "),
      price: p.price,
    }))
  }, [canLoad, fromCode, toCode, seat, selectedDate, cells, loadingMonth])

  useEffect(() => {
    setMonth(toMonth(selectedDate || todayIso()))
  }, [selectedDate])

  useEffect(() => {
    // reset cell overlay when month/route changes
    setCells(
      grid.map((g) => {
        const cached =
          g.inMonth && canLoad
            ? getCachedDayPrice(fromCode, toCode, seat, g.date)
            : null
        return {
          date: g.date,
          inMonth: g.inMonth,
          price: cached?.price ?? null,
          loading: false,
        }
      })
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, fromCode, toCode, seat])

  useEffect(() => {
    if (!autoLoad || !canLoad) return
    void loadMonth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, month, fromCode, toCode, seat])

  useEffect(() => {
    return () => {
      cancelRef.current = true
    }
  }, [])

  const loadMonth = async (force = false) => {
    if (!canLoad) return
    cancelRef.current = false
    const gen = ++genRef.current
    const today = todayIso()
    const targets = grid
      .filter((g) => g.inMonth && g.date >= today)
      .map((g) => g.date)
      .filter((d) => force || !getCachedDayPrice(fromCode, toCode, seat, d))

    setLoadingMonth(true)
    setProgress({ done: 0, total: targets.length })

    // seed from cache for all in-month days
    setCells(
      grid.map((g) => {
        const cached =
          g.inMonth && canLoad ? getCachedDayPrice(fromCode, toCode, seat, g.date) : null
        const needs = targets.includes(g.date)
        return {
          date: g.date,
          inMonth: g.inMonth,
          price: cached?.price ?? null,
          loading: needs,
        }
      })
    )

    let done = 0
    await mapPool(
      targets,
      2,
      async (date) => {
        if (cancelRef.current || gen !== genRef.current) return
        try {
          const res = await fetch("/api/live-search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildOneWayBody(date)),
          })
          const data = (await res.json()) as LiveSearchResponse
          if (cancelRef.current || gen !== genRef.current) return
          if (!res.ok || !data.flights?.length) {
            setCells((prev) =>
              prev.map((c) =>
                c.date === date
                  ? { ...c, loading: false, price: null, error: "—" }
                  : c
              )
            )
          } else {
            const cheapest = Math.min(...data.flights.map((f) => f.price))
            const cur = data.currency || currency || "GBP"
            setCachedDayPrice(fromCode, toCode, seat, date, cheapest, cur)
            setCells((prev) =>
              prev.map((c) =>
                c.date === date
                  ? { ...c, loading: false, price: cheapest, error: undefined }
                  : c
              )
            )
          }
        } catch {
          if (cancelRef.current || gen !== genRef.current) return
          setCells((prev) =>
            prev.map((c) =>
              c.date === date ? { ...c, loading: false, price: null, error: "—" } : c
            )
          )
        } finally {
          done += 1
          setProgress({ done, total: targets.length })
        }
      },
      () => cancelRef.current || gen !== genRef.current
    )

    if (gen === genRef.current) setLoadingMonth(false)
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--rule)] bg-[hsl(var(--card))]/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8 border-[var(--rule)] bg-[hsl(var(--card))]"
            onClick={() => {
              cancelRef.current = true
              setMonth((m) => addMonths(m, -1))
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-[9rem] text-center text-sm font-semibold text-[var(--ink)]">
            {formatMonthTitle(month)}
          </p>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8 border-[var(--rule)] bg-[hsl(var(--card))]"
            onClick={() => {
              cancelRef.current = true
              setMonth((m) => addMonths(m, 1))
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          type="button"
          size="sm"
          className="gap-1.5 bg-[var(--vermillion)] text-[var(--paper)] hover:bg-[var(--vermillion-dk)]"
          disabled={!canLoad || loadingMonth}
          onClick={() => void loadMonth(false)}
        >
          {loadingMonth ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {progress.done}/{progress.total}
            </>
          ) : (
            "Load month prices"
          )}
        </Button>
      </div>

      <p className="text-[11px] text-[var(--ink-3)]">
        One-way cheapest per day · {fromCode || "—"} → {toCode || "—"} · loads ~2 at a time
        (cached 6h)
      </p>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-[var(--ink-3)]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {displayCells.map((cell) => {
          const past = cell.date < todayIso()
          const selected = cell.date === selectedDate
          const clickable = cell.inMonth && !past
          const heat =
            cell.price != null ? priceColor(cell.price, minP, maxP) : "border-[var(--rule)] bg-[hsl(var(--card))]/60 text-[var(--ink-3)]"

          return (
            <button
              key={cell.date}
              type="button"
              disabled={!clickable}
              onClick={() => onSelectDate(cell.date)}
              className={`min-h-[3.25rem] rounded-lg border px-1 py-1 text-left transition ${
                !cell.inMonth
                  ? "border-transparent bg-transparent text-[var(--ink-2)]"
                  : past
                    ? "cursor-not-allowed border-[var(--rule)] bg-[hsl(var(--card))]/40 text-[var(--ink-2)] opacity-50"
                    : selected
                      ? "border-[var(--vermillion)] bg-[var(--wash-accent)] text-[var(--vermillion)] ring-1 ring-[var(--wash-accent)]"
                      : `${heat} hover:border-[var(--rule)]`
              }`}
            >
              <div className="text-[10px] tabular-nums text-[var(--ink-3)]">{cell.date.slice(8)}</div>
              <div className="text-[11px] font-semibold tabular-nums leading-tight">
                {cell.loading ? (
                  <Loader2 className="mt-0.5 h-3 w-3 animate-spin text-[var(--ink-3)]" />
                ) : cell.price != null ? (
                  priceLabel(currency, cell.price)
                ) : cell.error ? (
                  cell.error
                ) : cell.inMonth && !past ? (
                  "·"
                ) : (
                  ""
                )}
              </div>
            </button>
          )
        })}
      </div>

      {priced.length > 0 && (
        <div className="flex flex-wrap gap-2 text-[10px] text-[var(--ink-3)]">
          <span className="rounded border border-[color-mix(in_srgb,var(--jade)_30%,transparent)] bg-[var(--wash-jade)] px-1.5 py-0.5 text-[var(--jade)]">
            Low {priceLabel(currency, minP)}
          </span>
          <span className="rounded border border-[color-mix(in_srgb,var(--vermillion-dk)_30%,transparent)] bg-[var(--wash-accent)] px-1.5 py-0.5 text-[var(--vermillion-dk)]">
            High {priceLabel(currency, maxP)}
          </span>
          <button
            type="button"
            className="ml-auto text-[var(--ink-3)] underline-offset-2 hover:text-[var(--ink-2)] hover:underline"
            onClick={() => void loadMonth(true)}
            disabled={loadingMonth}
          >
            Refresh month
          </button>
        </div>
      )}

      <div className="flex gap-2 border-b border-[var(--rule)] pb-2">
        <button
          type="button"
          onClick={() => setChartTab("month")}
          className={`rounded-md px-2 py-1 text-xs ${
            chartTab === "month"
              ? "bg-[hsl(var(--card))] text-[var(--ink)]"
              : "text-[var(--ink-3)] hover:text-[var(--ink-2)]"
          }`}
        >
          Month graph
        </button>
        <button
          type="button"
          onClick={() => setChartTab("history")}
          className={`rounded-md px-2 py-1 text-xs ${
            chartTab === "history"
              ? "bg-[hsl(var(--card))] text-[var(--ink)]"
              : "text-[var(--ink-3)] hover:text-[var(--ink-2)]"
          }`}
        >
          Price history
        </button>
      </div>

      <div className="h-40 w-full">
        {chartTab === "month" ? (
          priced.length === 0 ? (
            <p className="flex h-full items-center justify-center text-xs text-[var(--ink-3)]">
              Load month prices to see the graph.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,19,14,0.16)" />
                <XAxis dataKey="label" tick={{ fill: "#5b5142", fontSize: 10 }} />
                <YAxis
                  tick={{ fill: "#5b5142", fontSize: 10 }}
                  width={36}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "#f2ece1",
                    border: "1px solid rgba(23,19,14,0.16)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.date ? String(payload[0].payload.date) : ""
                  }
                  formatter={(value: number | string) => [
                    typeof value === "number" ? priceLabel(currency, value) : String(value),
                    "Cheapest",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#38bdf8"
                  fill="#0ea5e933"
                  strokeWidth={2}
                  connectNulls={false}
                  dot={{ r: 2, fill: "#38bdf8" }}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )
        ) : historyData.length < 2 ? (
          <p className="flex h-full items-center justify-center px-4 text-center text-xs text-[var(--ink-3)]">
            History for {selectedDate || "this date"} builds as you load the grid / search.
            Need at least two checks.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,19,14,0.16)" />
              <XAxis dataKey="t" tick={{ fill: "#5b5142", fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#5b5142", fontSize: 10 }} width={36} />
              <Tooltip
                contentStyle={{
                  background: "#f2ece1",
                  border: "1px solid rgba(23,19,14,0.16)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number) => [priceLabel(currency, value), "Price"]}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={{ r: 3, fill: "#a78bfa" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

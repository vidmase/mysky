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
  if (max <= min) return "bg-emerald-500/25 text-emerald-100 border-emerald-500/40"
  const t = (price - min) / (max - min)
  if (t <= 0.33) return "bg-emerald-500/25 text-emerald-100 border-emerald-500/40"
  if (t <= 0.66) return "bg-amber-500/20 text-amber-100 border-amber-500/40"
  return "bg-rose-500/20 text-rose-100 border-rose-500/40"
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
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8 border-zinc-700 bg-zinc-900"
            onClick={() => {
              cancelRef.current = true
              setMonth((m) => addMonths(m, -1))
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-[9rem] text-center text-sm font-semibold text-zinc-100">
            {formatMonthTitle(month)}
          </p>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8 border-zinc-700 bg-zinc-900"
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
          className="gap-1.5 bg-sky-600 text-white hover:bg-sky-500"
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

      <p className="text-[11px] text-zinc-500">
        One-way cheapest per day · {fromCode || "—"} → {toCode || "—"} · loads ~2 at a time
        (cached 6h)
      </p>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-zinc-500">
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
            cell.price != null ? priceColor(cell.price, minP, maxP) : "border-zinc-800 bg-zinc-950/60 text-zinc-500"

          return (
            <button
              key={cell.date}
              type="button"
              disabled={!clickable}
              onClick={() => onSelectDate(cell.date)}
              className={`min-h-[3.25rem] rounded-lg border px-1 py-1 text-left transition ${
                !cell.inMonth
                  ? "border-transparent bg-transparent text-zinc-700"
                  : past
                    ? "cursor-not-allowed border-zinc-900 bg-zinc-950/40 text-zinc-600 opacity-50"
                    : selected
                      ? "border-sky-500 bg-sky-500/20 text-sky-50 ring-1 ring-sky-400/40"
                      : `${heat} hover:border-zinc-500`
              }`}
            >
              <div className="text-[10px] tabular-nums text-zinc-400">{cell.date.slice(8)}</div>
              <div className="text-[11px] font-semibold tabular-nums leading-tight">
                {cell.loading ? (
                  <Loader2 className="mt-0.5 h-3 w-3 animate-spin text-zinc-400" />
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
        <div className="flex flex-wrap gap-2 text-[10px] text-zinc-500">
          <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-200">
            Low {priceLabel(currency, minP)}
          </span>
          <span className="rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-rose-200">
            High {priceLabel(currency, maxP)}
          </span>
          <button
            type="button"
            className="ml-auto text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
            onClick={() => void loadMonth(true)}
            disabled={loadingMonth}
          >
            Refresh month
          </button>
        </div>
      )}

      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setChartTab("month")}
          className={`rounded-md px-2 py-1 text-xs ${
            chartTab === "month"
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Month graph
        </button>
        <button
          type="button"
          onClick={() => setChartTab("history")}
          className={`rounded-md px-2 py-1 text-xs ${
            chartTab === "history"
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Price history
        </button>
      </div>

      <div className="h-40 w-full">
        {chartTab === "month" ? (
          priced.length === 0 ? (
            <p className="flex h-full items-center justify-center text-xs text-zinc-500">
              Load month prices to see the graph.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                <YAxis
                  tick={{ fill: "#a1a1aa", fontSize: 10 }}
                  width={36}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #3f3f46",
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
          <p className="flex h-full items-center justify-center px-4 text-center text-xs text-zinc-500">
            History for {selectedDate || "this date"} builds as you load the grid / search.
            Need at least two checks.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="t" tick={{ fill: "#a1a1aa", fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} width={36} />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
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

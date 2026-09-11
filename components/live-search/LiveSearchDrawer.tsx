"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeftRight,
  ExternalLink,
  Loader2,
  Plane,
  Plus,
  Search,
} from "lucide-react"
import { useNotification } from "@/contexts/notification-context"
import type { FlightOffer, LiveSearchResponse, SeatType } from "./types"
import {
  defaultSearchDate,
  formatDuration,
  formatSegmentTime,
  mapOfferToPlannedFlight,
  shiftDate,
} from "./mapOfferToFlight"
import { AirportCodeField } from "./AirportCodeField"

type TripType = "one-way" | "round-trip"
type SortMode = "best" | "cheapest" | "fastest"
type StopsFilter = "any" | "0" | "1"

export interface LiveSearchDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialFrom?: string
  initialTo?: string
  initialDate?: string
  onPlannedAdded?: () => void | Promise<void>
}

interface DayPrice {
  date: string
  price: number | null
  loading: boolean
  error?: string
}

function priceLabel(currency: string, price: number) {
  if (currency === "GBP") return `£${price}`
  return `${currency} ${price}`
}

function formatChipDate(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
}

export function LiveSearchDrawer({
  open,
  onOpenChange,
  initialFrom = "",
  initialTo = "",
  initialDate,
  onPlannedAdded,
}: LiveSearchDrawerProps) {
  const { showSuccess, showError } = useNotification()

  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [date, setDate] = useState(initialDate || defaultSearchDate())
  const [returnDate, setReturnDate] = useState(() => shiftDate(initialDate || defaultSearchDate(), 7))
  const [trip, setTrip] = useState<TripType>("one-way")
  const [seat, setSeat] = useState<SeatType>("economy")
  const [maxStops, setMaxStops] = useState<StopsFilter>("any")
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState(0)
  const [infantsInSeat, setInfantsInSeat] = useState(0)
  const [infantsOnLap, setInfantsOnLap] = useState(0)
  const [carryOn, setCarryOn] = useState(0)
  const [checkedBags, setCheckedBags] = useState(0)
  const [sort, setSort] = useState<SortMode>("best")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<FlightOffer[]>([])
  const [googleUrl, setGoogleUrl] = useState<string | null>(null)
  const [currency, setCurrency] = useState("GBP")
  const [addingIndex, setAddingIndex] = useState<number | null>(null)
  const [searched, setSearched] = useState(false)
  const [dayPrices, setDayPrices] = useState<DayPrice[]>([])

  useEffect(() => {
    if (!open) return
    const outbound = initialDate || defaultSearchDate()
    setFrom((initialFrom || "").toUpperCase())
    setTo((initialTo || "").toUpperCase())
    setDate(outbound)
    setReturnDate(shiftDate(outbound, 7))
    setError(null)
    setResults([])
    setGoogleUrl(null)
    setSearched(false)
    setDayPrices([])
  }, [open, initialFrom, initialTo, initialDate])

  const sortedResults = useMemo(() => {
    const list = [...results]
    if (sort === "cheapest") {
      list.sort((a, b) => a.price - b.price || a.duration_minutes - b.duration_minutes)
    } else if (sort === "fastest") {
      list.sort((a, b) => a.duration_minutes - b.duration_minutes || a.price - b.price)
    } else {
      list.sort((a, b) => {
        const ab = a.is_best ? 0 : 1
        const bb = b.is_best ? 0 : 1
        if (ab !== bb) return ab - bb
        return a.price - b.price || a.duration_minutes - b.duration_minutes
      })
    }
    return list
  }, [results, sort])

  const buildBody = (outboundDate: string, opts?: { forFlexible?: boolean }) => {
    const fromCode = from.trim().toUpperCase()
    const toCode = to.trim().toUpperCase()
    const stops =
      maxStops === "any" ? undefined : Number(maxStops)
    const useRoundTrip = trip === "round-trip" && !opts?.forFlexible
    const flights = [
      {
        date: outboundDate,
        from_airport: fromCode,
        to_airport: toCode,
        ...(stops === undefined ? {} : { max_stops: stops }),
      },
    ]
    if (useRoundTrip) {
      flights.push({
        date: returnDate,
        from_airport: toCode,
        to_airport: fromCode,
        ...(stops === undefined ? {} : { max_stops: stops }),
      })
    }
    return {
      trip: useRoundTrip ? ("round-trip" as const) : ("one-way" as const),
      seat,
      passengers: {
        adults: Math.max(1, adults),
        children: Math.max(0, children),
        infants_in_seat: Math.max(0, infantsInSeat),
        infants_on_lap: Math.max(0, infantsOnLap),
      },
      currency: "GBP",
      language: "en-GB",
      carry_on_bags: Math.max(0, carryOn),
      checked_bags: Math.max(0, checkedBags),
      ...(stops === undefined ? {} : { max_stops: stops }),
      flights,
    }
  }

  const loadFlexibleStrip = async (centerDate: string) => {
    const fromCode = from.trim().toUpperCase()
    const toCode = to.trim().toUpperCase()
    if (!fromCode || !toCode) return

    const dates = [-3, -2, -1, 0, 1, 2, 3].map((d) => shiftDate(centerDate, d))
    setDayPrices(dates.map((d) => ({ date: d, price: null, loading: true })))

    await Promise.all(
      dates.map(async (d) => {
        try {
          const res = await fetch("/api/live-search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildBody(d, { forFlexible: true })),
          })
          const data = (await res.json()) as LiveSearchResponse
          if (!res.ok || !data.flights?.length) {
            setDayPrices((prev) =>
              prev.map((x) =>
                x.date === d
                  ? { date: d, price: null, loading: false, error: "—" }
                  : x
              )
            )
            return
          }
          const cheapest = Math.min(...data.flights.map((f) => f.price))
          setDayPrices((prev) =>
            prev.map((x) =>
              x.date === d ? { date: d, price: cheapest, loading: false } : x
            )
          )
        } catch {
          setDayPrices((prev) =>
            prev.map((x) =>
              x.date === d ? { date: d, price: null, loading: false, error: "—" } : x
            )
          )
        }
      })
    )
  }

  const handleSearch = async (outboundOverride?: string) => {
    const fromCode = from.trim().toUpperCase()
    const toCode = to.trim().toUpperCase()
    const outbound = outboundOverride || date
    if (!fromCode || !toCode || !outbound) {
      setError("From, To, and Date are required")
      return
    }
    if (fromCode.length !== 3 || toCode.length !== 3) {
      setError("Pick airports from the list (3-letter IATA)")
      return
    }
    if (trip === "round-trip") {
      if (!returnDate) {
        setError("Return date is required for round-trip")
        return
      }
      if (returnDate < outbound) {
        setError("Return date must be on or after the outbound date")
        return
      }
    }

    if (outboundOverride) setDate(outboundOverride)

    setLoading(true)
    setError(null)
    setResults([])
    setGoogleUrl(null)
    setSearched(true)

    try {
      const body = buildBody(outbound)
      const res = await fetch("/api/live-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = (await res.json()) as LiveSearchResponse & {
        message?: string
        error?: string
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || `Search failed (${res.status})`)
      }

      setResults(Array.isArray(data.flights) ? data.flights : [])
      setGoogleUrl(data.google_flights_url || null)
      setCurrency(data.currency || "GBP")

      if (data.current_status === "empty" || !data.flights?.length) {
        setError(data.message || "No flights found for this route and date.")
      } else {
        // Kick flexible strip for outbound date (one-way probes keep load lighter)
        void loadFlexibleStrip(outbound)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search failed"
      setError(msg)
      showError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPlanned = async (offer: FlightOffer, index: number) => {
    setAddingIndex(index)
    try {
      const payload = mapOfferToPlannedFlight({
        offer,
        fromIata: from.trim().toUpperCase(),
        toIata: to.trim().toUpperCase(),
        searchDate: date,
        seat,
        currency,
      })
      if (trip === "round-trip") {
        payload.notes = `${payload.notes} · round-trip return ${returnDate}`
      }

      const res = await fetch("/api/flights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          (data as { message?: string; error?: string }).message ||
            (data as { error?: string }).error ||
            `Failed to add flight (${res.status})`
        )
      }

      showSuccess("Added as planned flight")
      if (onPlannedAdded) await onPlannedAdded()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add planned flight"
      showError(msg)
    } finally {
      setAddingIndex(null)
    }
  }

  const swapAirports = () => {
    setFrom(to)
    setTo(from)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-zinc-800 bg-zinc-950 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-zinc-800 px-6 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-zinc-50">
            <Search className="h-5 w-5 text-sky-400" />
            Live flight search
          </SheetTitle>
          <SheetDescription className="text-zinc-400">
            Search Google Flights live, then add an offer as a planned upcoming trip.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 border-b border-zinc-800 px-6 py-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Trip</Label>
              <Select value={trip} onValueChange={(v) => setTrip(v as TripType)}>
                <SelectTrigger className="border-zinc-700 bg-zinc-900 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-way">One-way</SelectItem>
                  <SelectItem value="round-trip">Round-trip</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Stops</Label>
              <Select value={maxStops} onValueChange={(v) => setMaxStops(v as StopsFilter)}>
                <SelectTrigger className="border-zinc-700 bg-zinc-900 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="0">Nonstop</SelectItem>
                  <SelectItem value="1">1 stop max</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <AirportCodeField label="From" value={from} onChange={setFrom} />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="mb-0.5 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
              onClick={swapAirports}
              title="Swap airports"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
            <AirportCodeField label="To" value={to} onChange={setTo} />
          </div>

          <div className={`grid gap-3 ${trip === "round-trip" ? "grid-cols-2" : "grid-cols-2"}`}>
            <div className="space-y-1.5">
              <Label htmlFor="live-date" className="text-zinc-300">
                {trip === "round-trip" ? "Outbound" : "Date"}
              </Label>
              <Input
                id="live-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border-zinc-700 bg-zinc-900 text-zinc-100"
              />
            </div>
            {trip === "round-trip" ? (
              <div className="space-y-1.5">
                <Label htmlFor="live-return" className="text-zinc-300">
                  Return
                </Label>
                <Input
                  id="live-return"
                  type="date"
                  value={returnDate}
                  min={date}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="border-zinc-700 bg-zinc-900 text-zinc-100"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Cabin</Label>
                <Select value={seat} onValueChange={(v) => setSeat(v as SeatType)}>
                  <SelectTrigger className="border-zinc-700 bg-zinc-900 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economy">Economy</SelectItem>
                    <SelectItem value="premium-economy">Premium economy</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="first">First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {trip === "round-trip" && (
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Cabin</Label>
              <Select value={seat} onValueChange={(v) => setSeat(v as SeatType)}>
                <SelectTrigger className="border-zinc-700 bg-zinc-900 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="economy">Economy</SelectItem>
                  <SelectItem value="premium-economy">Premium economy</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="first">First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            {(
              [
                ["Adults", adults, setAdults, 1],
                ["Children", children, setChildren, 0],
                ["Infant seat", infantsInSeat, setInfantsInSeat, 0],
                ["Infant lap", infantsOnLap, setInfantsOnLap, 0],
              ] as const
            ).map(([label, val, setter, min]) => (
              <div key={label} className="space-y-1.5">
                <Label className="text-[11px] text-zinc-400">{label}</Label>
                <Input
                  type="number"
                  min={min}
                  max={9}
                  value={val}
                  onChange={(e) => setter(Number(e.target.value) || min)}
                  className="border-zinc-700 bg-zinc-900 text-zinc-100"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Carry-on</Label>
              <Input
                type="number"
                min={0}
                max={9}
                value={carryOn}
                onChange={(e) => setCarryOn(Number(e.target.value) || 0)}
                className="border-zinc-700 bg-zinc-900 text-zinc-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Checked bags</Label>
              <Input
                type="number"
                min={0}
                max={9}
                value={checkedBags}
                onChange={(e) => setCheckedBags(Number(e.target.value) || 0)}
                className="border-zinc-700 bg-zinc-900 text-zinc-100"
              />
            </div>
          </div>

          <Button
            className="w-full gap-2 bg-sky-600 text-white hover:bg-sky-500"
            onClick={() => void handleSearch()}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search
              </>
            )}
          </Button>

          {googleUrl && (
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-sky-400 hover:text-sky-300"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open full search on Google Flights
            </a>
          )}
        </div>

        {dayPrices.length > 0 && (
          <div className="border-b border-zinc-800 px-4 py-3">
            <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Flexible dates (±3)
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {dayPrices.map((day) => {
                const active = day.date === date
                return (
                  <button
                    key={day.date}
                    type="button"
                    disabled={day.loading || loading}
                    onClick={() => void handleSearch(day.date)}
                    className={`min-w-[4.5rem] shrink-0 rounded-lg border px-2 py-2 text-left transition ${
                      active
                        ? "border-sky-500/60 bg-sky-500/15 text-sky-100"
                        : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    <div className="text-[10px] text-zinc-400">{formatChipDate(day.date)}</div>
                    <div className="text-sm font-semibold tabular-nums">
                      {day.loading
                        ? "…"
                        : day.price != null
                          ? priceLabel(currency, day.price)
                          : day.error || "—"}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-2">
          <p className="text-xs text-zinc-500">
            {searched && !loading ? `${sortedResults.length} offers` : "Results"}
          </p>
          <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
            <SelectTrigger className="h-8 w-[140px] border-zinc-700 bg-zinc-900 text-xs text-zinc-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="best">Best</SelectItem>
              <SelectItem value="cheapest">Cheapest</SelectItem>
              <SelectItem value="fastest">Fastest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1 px-6 py-4">
          {error && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {error}
            </div>
          )}

          {!loading && searched && sortedResults.length === 0 && !error && (
            <p className="text-sm text-zinc-500">No results yet. Try another date or route.</p>
          )}

          {!searched && !loading && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-zinc-500">
              <Plane className="h-8 w-8 text-zinc-600" />
              <p className="text-sm">Enter a route and search for live prices.</p>
            </div>
          )}

          <div className="space-y-3 pb-8">
            {sortedResults.map((offer, index) => {
              const first = offer.flights?.[0]
              const last = offer.flights?.[offer.flights.length - 1]
              const depTime = formatSegmentTime(first?.departure?.time, "—")
              const arrTime = formatSegmentTime(last?.arrival?.time, "—")
              const airlines = (offer.airlines || []).join(", ") || "Airline TBD"

              return (
                <div
                  key={`${offer.price}-${index}-${offer.duration_minutes}`}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold text-zinc-50">
                        {priceLabel(currency, offer.price)}
                      </p>
                      <p className="text-xs text-zinc-400">{airlines}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {offer.is_best && (
                        <Badge
                          className="border-sky-500/30 bg-sky-500/15 text-sky-300"
                          variant="outline"
                        >
                          Best
                        </Badge>
                      )}
                      {typeof offer.carbon?.emission === "number" && offer.carbon.emission > 0 && (
                        <span className="text-[10px] text-emerald-400/90">
                          ~{offer.carbon.emission} kg CO₂
                        </span>
                      )}
                      <span className="text-xs text-zinc-400">
                        {offer.stops === 0
                          ? "Direct"
                          : `${offer.stops} stop${offer.stops === 1 ? "" : "s"}`}
                        {" · "}
                        {formatDuration(offer.duration_minutes)}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3 flex items-center gap-2 text-sm text-zinc-200">
                    <span className="font-medium tabular-nums">{depTime}</span>
                    <span className="text-zinc-500">→</span>
                    <span className="font-medium tabular-nums">{arrTime}</span>
                    <span className="ml-auto text-xs text-zinc-500">
                      {from.trim().toUpperCase() || first?.from_airport?.code} →{" "}
                      {to.trim().toUpperCase() || last?.to_airport?.code}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5 bg-sky-600 text-white hover:bg-sky-500"
                      disabled={addingIndex === index}
                      onClick={() => void handleAddPlanned(offer, index)}
                    >
                      {addingIndex === index ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Add as planned
                    </Button>
                    {googleUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-zinc-700 text-zinc-200"
                        asChild
                      >
                        <a href={googleUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                          View on Google Flights
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

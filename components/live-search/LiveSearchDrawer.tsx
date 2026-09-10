"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  ChevronDown,
  ExternalLink,
  Leaf,
  Loader2,
  Plane,
  Plus,
  Search,
  Users,
} from "lucide-react"
import { useNotification } from "@/contexts/notification-context"
import type {
  FlightOffer,
  LiveSearchResponse,
  SeatType,
  Segment,
  SortKey,
  StopsFilter,
  TripType,
} from "./types"
import {
  addDays,
  dayOffset,
  defaultSearchDate,
  formatDuration,
  formatSegmentTime,
  layoverMinutes,
  mapOfferToPlannedFlight,
  segmentsDuration,
  splitOfferLegs,
} from "./mapOfferToFlight"

const CURRENCIES = [
  { code: "GBP", symbol: "£", language: "en-GB" },
  { code: "EUR", symbol: "€", language: "en-GB" },
  { code: "USD", symbol: "$", language: "en-US" },
]

/** Identity that survives re-filtering and re-sorting of the same result set */
function offerKey(offer: FlightOffer, index: number): string {
  const dep = offer.flights?.[0]?.departure?.time?.join(":") ?? index
  const flightNo = offer.flights?.map((s) => s.from_airport?.code).join("-") ?? ""
  return `${offer.price}-${offer.duration_minutes}-${dep}-${flightNo}`
}

export interface LiveSearchDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialFrom?: string
  initialTo?: string
  initialDate?: string
  onPlannedAdded?: () => void | Promise<void>
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

  const [trip, setTrip] = useState<TripType>("one-way")
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [date, setDate] = useState(initialDate || defaultSearchDate())
  const [returnDate, setReturnDate] = useState(addDays(initialDate || defaultSearchDate(), 7))
  const [seat, setSeat] = useState<SeatType>("economy")
  const [currency, setCurrency] = useState("GBP")
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState(0)
  const [infantsInSeat, setInfantsInSeat] = useState(0)
  const [infantsOnLap, setInfantsOnLap] = useState(0)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<FlightOffer[]>([])
  const [googleUrl, setGoogleUrl] = useState<string | null>(null)
  const [resultCurrency, setResultCurrency] = useState("GBP")
  const [resultTrip, setResultTrip] = useState<TripType>("one-way")
  const [addingKey, setAddingKey] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const [sortBy, setSortBy] = useState<SortKey>("best")
  const [stopsFilter, setStopsFilter] = useState<StopsFilter>("any")
  const [airlineFilter, setAirlineFilter] = useState("all")
  const [expanded, setExpanded] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  // Sync when drawer opens with new initials
  useEffect(() => {
    if (!open) return
    const startDate = initialDate || defaultSearchDate()
    setFrom((initialFrom || "").toUpperCase())
    setTo((initialTo || "").toUpperCase())
    setDate(startDate)
    setReturnDate(addDays(startDate, 7))
    setError(null)
    setResults([])
    setGoogleUrl(null)
    setSearched(false)
    setExpanded(null)
    setStopsFilter("any")
    setAirlineFilter("all")
    setSortBy("best")
  }, [open, initialFrom, initialTo, initialDate])

  // Drop any in-flight search when the drawer closes
  useEffect(() => {
    if (open) return
    abortRef.current?.abort()
    abortRef.current = null
  }, [open])

  const swapAirports = () => {
    setFrom(to)
    setTo(from)
  }

  const handleSearch = async () => {
    const fromCode = from.trim().toUpperCase()
    const toCode = to.trim().toUpperCase()
    if (!fromCode || !toCode || !date) {
      setError("From, To, and Date are required")
      return
    }
    if (fromCode.length !== 3 || toCode.length !== 3) {
      setError("Use 3-letter IATA codes (e.g. LHR, JFK)")
      return
    }
    if (trip === "round-trip" && (!returnDate || returnDate < date)) {
      setError("Return date must be on or after the departure date")
      return
    }
    if (infantsOnLap > adults) {
      setError("Each lap infant needs an adult")
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setResults([])
    setGoogleUrl(null)
    setExpanded(null)
    setSearched(true)

    try {
      const language = CURRENCIES.find((c) => c.code === currency)?.language || "en-GB"
      const legs = [{ date, from_airport: fromCode, to_airport: toCode }]
      if (trip === "round-trip") {
        legs.push({ date: returnDate, from_airport: toCode, to_airport: fromCode })
      }

      const body = {
        trip,
        seat,
        passengers: {
          adults: Math.max(1, adults),
          children: Math.max(0, children),
          infants_in_seat: Math.max(0, infantsInSeat),
          infants_on_lap: Math.max(0, infantsOnLap),
        },
        currency,
        language,
        flights: legs,
      }

      const res = await fetch("/api/live-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
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
      setResultCurrency(data.currency || currency)
      setResultTrip(trip)

      if (data.current_status === "empty" || !data.flights?.length) {
        setError(data.message || "No flights found for this route and date.")
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      const msg = err instanceof Error ? err.message : "Search failed"
      setError(msg)
      showError(msg)
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setLoading(false)
      }
    }
  }

  const addLeg = async (payload: ReturnType<typeof mapOfferToPlannedFlight>) => {
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
  }

  const handleAddPlanned = async (offer: FlightOffer, key: string) => {
    setAddingKey(key)
    try {
      const fromCode = from.trim().toUpperCase()
      const toCode = to.trim().toUpperCase()
      const legs = splitOfferLegs(offer, toCode)

      await addLeg(
        mapOfferToPlannedFlight({
          offer,
          segments: legs.outbound,
          fromIata: fromCode,
          toIata: toCode,
          searchDate: date,
          seat,
          currency: resultCurrency,
          legLabel: legs.inbound || resultTrip === "round-trip" ? "Outbound" : undefined,
        })
      )

      if (legs.inbound) {
        await addLeg(
          mapOfferToPlannedFlight({
            offer,
            segments: legs.inbound,
            fromIata: toCode,
            toIata: fromCode,
            searchDate: returnDate,
            seat,
            currency: resultCurrency,
            legLabel: "Return",
            includePrice: false,
          })
        )
      }

      showSuccess(legs.inbound ? "Added outbound and return as planned" : "Added as planned flight")
      if (onPlannedAdded) await onPlannedAdded()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add planned flight"
      showError(msg)
    } finally {
      setAddingKey(null)
    }
  }

  const symbol = CURRENCIES.find((c) => c.code === resultCurrency)?.symbol
  const priceLabel = (price: number) =>
    symbol ? `${symbol}${price}` : `${resultCurrency} ${price}`

  const airlineOptions = useMemo(() => {
    const set = new Set<string>()
    results.forEach((offer) => (offer.airlines || []).forEach((a) => set.add(a)))
    return Array.from(set).sort()
  }, [results])

  const visibleResults = useMemo(() => {
    const filtered = results.filter((offer) => {
      if (stopsFilter === "nonstop" && (offer.stops ?? 0) !== 0) return false
      if (stopsFilter === "one-stop" && (offer.stops ?? 0) > 1) return false
      if (airlineFilter !== "all" && !(offer.airlines || []).includes(airlineFilter)) return false
      return true
    })

    const departureMinutes = (offer: FlightOffer) => {
      const t = offer.flights?.[0]?.departure?.time
      if (!t || t.length < 2) return Number.MAX_SAFE_INTEGER
      return Number(t[0]) * 60 + Number(t[1])
    }

    const sorted = [...filtered]
    if (sortBy === "price") sorted.sort((a, b) => a.price - b.price)
    if (sortBy === "duration") sorted.sort((a, b) => a.duration_minutes - b.duration_minutes)
    if (sortBy === "departure") sorted.sort((a, b) => departureMinutes(a) - departureMinutes(b))
    return sorted
  }, [results, stopsFilter, airlineFilter, sortBy])

  const cheapest = useMemo(
    () => visibleResults.reduce((min, o) => (min === null || o.price < min ? o.price : min), null as number | null),
    [visibleResults]
  )

  const passengerSummary = () => {
    const parts = [`${adults} adult${adults === 1 ? "" : "s"}`]
    if (children > 0) parts.push(`${children} child${children === 1 ? "" : "ren"}`)
    const infants = infantsInSeat + infantsOnLap
    if (infants > 0) parts.push(`${infants} infant${infants === 1 ? "" : "s"}`)
    return parts.join(", ")
  }

  const renderSegments = (segments: Segment[], label: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-zinc-500">
        <span>{label}</span>
        <span className="normal-case tracking-normal">{formatDuration(segmentsDuration(segments))} in the air</span>
      </div>
      {segments.map((segment, i) => (
        <div key={`${label}-${i}`} className="space-y-2">
          {i > 0 && layoverMinutes(segments[i - 1], segment) !== null && (
            <p className="pl-3 text-xs text-amber-300/80">
              {formatDuration(layoverMinutes(segments[i - 1], segment) as number)} layover in{" "}
              {segments[i - 1].to_airport?.code}
            </p>
          )}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300">
            <div className="flex items-center gap-2">
              <span className="font-medium tabular-nums text-zinc-100">
                {formatSegmentTime(segment.departure?.time, "—")}
              </span>
              <span className="text-zinc-500">{segment.from_airport?.code}</span>
              <span className="text-zinc-600">→</span>
              <span className="font-medium tabular-nums text-zinc-100">
                {formatSegmentTime(segment.arrival?.time, "—")}
              </span>
              <span className="text-zinc-500">{segment.to_airport?.code}</span>
              <span className="ml-auto text-zinc-500">{formatDuration(segment.duration)}</span>
            </div>
            {segment.plane_type && (
              <p className="mt-1 text-[11px] text-zinc-500">{segment.plane_type}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )

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

        <div className="space-y-4 border-b border-zinc-800 px-6 py-4">
          <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
            {(["one-way", "round-trip"] as TripType[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTrip(value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  trip === value
                    ? "bg-sky-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {value === "one-way" ? "One way" : "Round trip"}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="live-from" className="text-zinc-300">
                From
              </Label>
              <Input
                id="live-from"
                value={from}
                onChange={(e) => setFrom(e.target.value.toUpperCase())}
                placeholder="LHR"
                maxLength={3}
                className="border-zinc-700 bg-zinc-900 uppercase text-zinc-100"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Swap airports"
              onClick={swapAirports}
              className="mb-0.5 shrink-0 border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-zinc-100"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="live-to" className="text-zinc-300">
                To
              </Label>
              <Input
                id="live-to"
                value={to}
                onChange={(e) => setTo(e.target.value.toUpperCase())}
                placeholder="JFK"
                maxLength={3}
                className="border-zinc-700 bg-zinc-900 uppercase text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="live-date" className="text-zinc-300">
                Depart
              </Label>
              <Input
                id="live-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  if (returnDate < e.target.value) setReturnDate(addDays(e.target.value, 7))
                }}
                className="border-zinc-700 bg-zinc-900 text-zinc-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="live-return-date" className="text-zinc-300">
                Return
              </Label>
              <Input
                id="live-return-date"
                type="date"
                value={returnDate}
                min={date}
                disabled={trip === "one-way"}
                onChange={(e) => setReturnDate(e.target.value)}
                className="border-zinc-700 bg-zinc-900 text-zinc-100 disabled:opacity-40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="border-zinc-700 bg-zinc-900 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label className="text-zinc-300">Passengers</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 border-zinc-700 bg-zinc-900 font-normal text-zinc-100"
                  >
                    <Users className="h-4 w-4 text-zinc-400" />
                    {passengerSummary()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 space-y-3 border-zinc-800 bg-zinc-950">
                  {([
                    ["Adults", adults, setAdults, 1],
                    ["Children", children, setChildren, 0],
                    ["Infants in seat", infantsInSeat, setInfantsInSeat, 0],
                    ["Infants on lap", infantsOnLap, setInfantsOnLap, 0],
                  ] as [string, number, (n: number) => void, number][]).map(
                    ([label, value, setValue, min]) => (
                      <div key={label} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-zinc-300">{label}</span>
                        <Input
                          type="number"
                          min={min}
                          max={9}
                          value={value}
                          onChange={(e) => setValue(Math.max(min, Number(e.target.value) || min))}
                          className="h-8 w-16 border-zinc-700 bg-zinc-900 text-zinc-100"
                        />
                      </div>
                    )
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <Button
              className="flex-1 gap-2 bg-sky-600 text-white hover:bg-sky-500"
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
          </div>

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

        {results.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 px-6 py-3">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
              <SelectTrigger className="h-8 w-[130px] border-zinc-700 bg-zinc-900 text-xs text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="best">Best match</SelectItem>
                <SelectItem value="price">Cheapest</SelectItem>
                <SelectItem value="duration">Fastest</SelectItem>
                <SelectItem value="departure">Earliest</SelectItem>
              </SelectContent>
            </Select>

            <Select value={stopsFilter} onValueChange={(v) => setStopsFilter(v as StopsFilter)}>
              <SelectTrigger className="h-8 w-[120px] border-zinc-700 bg-zinc-900 text-xs text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any stops</SelectItem>
                <SelectItem value="nonstop">Direct only</SelectItem>
                <SelectItem value="one-stop">Up to 1 stop</SelectItem>
              </SelectContent>
            </Select>

            {airlineOptions.length > 1 && (
              <Select value={airlineFilter} onValueChange={setAirlineFilter}>
                <SelectTrigger className="h-8 w-[150px] border-zinc-700 bg-zinc-900 text-xs text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All airlines</SelectItem>
                  {airlineOptions.map((airline) => (
                    <SelectItem key={airline} value={airline}>
                      {airline}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <span className="ml-auto text-xs text-zinc-500">
              {visibleResults.length} of {results.length}
              {cheapest !== null && ` · from ${priceLabel(cheapest)}`}
            </span>
          </div>
        )}

        <ScrollArea className="flex-1 px-6 py-4">
          {error && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {error}
            </div>
          )}

          {!loading && searched && results.length > 0 && visibleResults.length === 0 && (
            <p className="text-sm text-zinc-500">No offers match these filters.</p>
          )}

          {!loading && searched && results.length === 0 && !error && (
            <p className="text-sm text-zinc-500">No results yet. Try another date or route.</p>
          )}

          {!searched && !loading && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-zinc-500">
              <Plane className="h-8 w-8 text-zinc-600" />
              <p className="text-sm">Enter a route and search for live prices.</p>
            </div>
          )}

          <div className="space-y-3 pb-8">
            {visibleResults.map((offer, index) => {
              const key = offerKey(offer, index)
              const legs = splitOfferLegs(offer, to.trim().toUpperCase())
              const first = legs.outbound[0]
              const last = legs.outbound[legs.outbound.length - 1]
              const depTime = formatSegmentTime(first?.departure?.time, "—")
              const arrTime = formatSegmentTime(last?.arrival?.time, "—")
              const overnight = dayOffset(legs.outbound)
              const airlines = (offer.airlines || []).join(", ") || "Airline TBD"
              const isOpen = expanded === key
              const carbonDelta =
                offer.carbon?.typical_on_route && offer.carbon.typical_on_route > 0
                  ? Math.round(
                      ((offer.carbon.emission - offer.carbon.typical_on_route) /
                        offer.carbon.typical_on_route) *
                        100
                    )
                  : null

              return (
                <div
                  key={key}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold text-zinc-50">
                        {priceLabel(offer.price)}
                      </p>
                      <p className="text-xs text-zinc-400">{airlines}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-1">
                        {resultTrip === "round-trip" && (
                          <Badge
                            className="border-zinc-700 bg-zinc-800 text-zinc-300"
                            variant="outline"
                          >
                            Round trip
                          </Badge>
                        )}
                        {offer.is_best && (
                          <Badge className="bg-sky-500/15 text-sky-300 border-sky-500/30" variant="outline">
                            Best
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400">
                        {offer.stops === 0 ? "Direct" : `${offer.stops} stop${offer.stops === 1 ? "" : "s"}`}
                        {" · "}
                        {formatDuration(offer.duration_minutes)}
                      </span>
                      {carbonDelta !== null && (
                        <span
                          className={`inline-flex items-center gap-1 text-xs ${
                            carbonDelta <= 0 ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          <Leaf className="h-3 w-3" />
                          {carbonDelta > 0 ? `+${carbonDelta}` : carbonDelta}% CO₂
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-3 flex items-center gap-2 text-sm text-zinc-200">
                    <span className="font-medium tabular-nums">{depTime}</span>
                    <span className="text-zinc-500">→</span>
                    <span className="font-medium tabular-nums">{arrTime}</span>
                    {overnight > 0 && (
                      <span className="text-xs text-amber-400">+{overnight}</span>
                    )}
                    <span className="ml-auto text-xs text-zinc-500">
                      {from.trim().toUpperCase() || first?.from_airport?.code} →{" "}
                      {to.trim().toUpperCase() || last?.to_airport?.code}
                    </span>
                  </div>

                  {resultTrip === "round-trip" && !legs.inbound && (
                    <p className="mb-3 text-xs text-zinc-500">
                      Round-trip total; return on {returnDate} is picked on Google Flights.
                    </p>
                  )}

                  {isOpen && (
                    <div className="mb-3 space-y-3">
                      {renderSegments(legs.outbound, legs.inbound ? "Outbound" : "Itinerary")}
                      {legs.inbound && renderSegments(legs.inbound, "Return")}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5 bg-sky-600 text-white hover:bg-sky-500"
                      disabled={addingKey === key}
                      onClick={() => void handleAddPlanned(offer, key)}
                    >
                      {addingKey === key ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      {legs.inbound ? "Add both legs" : "Add as planned"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-zinc-700 text-zinc-200"
                      onClick={() => setExpanded(isOpen ? null : key)}
                    >
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                      {isOpen ? "Hide details" : "Details"}
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
                          Google Flights
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

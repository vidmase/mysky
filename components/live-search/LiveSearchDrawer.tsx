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
import { PriceMonthPanel } from "./PriceMonthPanel"
import { setCachedDayPrice } from "./priceCache"

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
  const [outboundResults, setOutboundResults] = useState<FlightOffer[]>([])
  const [returnResults, setReturnResults] = useState<FlightOffer[]>([])
  const [googleUrl, setGoogleUrl] = useState<string | null>(null)
  const [currency, setCurrency] = useState("GBP")
  const [addingKey, setAddingKey] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [dayPrices, setDayPrices] = useState<DayPrice[]>([])
  const [showMonthCalendar, setShowMonthCalendar] = useState(false)

  useEffect(() => {
    if (!open) return
    const outbound = initialDate || defaultSearchDate()
    setFrom((initialFrom || "").toUpperCase())
    setTo((initialTo || "").toUpperCase())
    setDate(outbound)
    setReturnDate(shiftDate(outbound, 7))
    setError(null)
    setOutboundResults([])
    setReturnResults([])
    setGoogleUrl(null)
    setSearched(false)
    setDayPrices([])
  }, [open, initialFrom, initialTo, initialDate])

  const sortOffers = (list: FlightOffer[]) => {
    const next = [...list]
    if (sort === "cheapest") {
      next.sort((a, b) => a.price - b.price || a.duration_minutes - b.duration_minutes)
    } else if (sort === "fastest") {
      next.sort((a, b) => a.duration_minutes - b.duration_minutes || a.price - b.price)
    } else {
      next.sort((a, b) => {
        const ab = a.is_best ? 0 : 1
        const bb = b.is_best ? 0 : 1
        if (ab !== bb) return ab - bb
        return a.price - b.price || a.duration_minutes - b.duration_minutes
      })
    }
    return next
  }

  const sortedOutbound = useMemo(() => sortOffers(outboundResults), [outboundResults, sort])
  const sortedReturn = useMemo(() => sortOffers(returnResults), [returnResults, sort])

  const cheapestCombo = useMemo(() => {
    if (!sortedOutbound.length || !sortedReturn.length) return null
    const o = Math.min(...sortedOutbound.map((f) => f.price))
    const r = Math.min(...sortedReturn.map((f) => f.price))
    return { outbound: o, ret: r, total: o + r }
  }, [sortedOutbound, sortedReturn])

  const buildBody = (
    outboundDate: string,
    opts?: { forFlexible?: boolean; leg?: "outbound" | "return" | "round-trip" }
  ) => {
    const fromCode = from.trim().toUpperCase()
    const toCode = to.trim().toUpperCase()
    const stops = maxStops === "any" ? undefined : Number(maxStops)
    const leg = opts?.leg || "outbound"
    const passengers = {
      adults: Math.max(1, adults),
      children: Math.max(0, children),
      infants_in_seat: Math.max(0, infantsInSeat),
      infants_on_lap: Math.max(0, infantsOnLap),
    }
    const bags = {
      currency: "GBP",
      language: "en-GB",
      carry_on_bags: Math.max(0, carryOn),
      checked_bags: Math.max(0, checkedBags),
      ...(stops === undefined ? {} : { max_stops: stops }),
    }

    if (leg === "round-trip" && trip === "round-trip" && !opts?.forFlexible) {
      return {
        trip: "round-trip" as const,
        seat,
        passengers,
        ...bags,
        flights: [
          {
            date: outboundDate,
            from_airport: fromCode,
            to_airport: toCode,
            ...(stops === undefined ? {} : { max_stops: stops }),
          },
          {
            date: returnDate,
            from_airport: toCode,
            to_airport: fromCode,
            ...(stops === undefined ? {} : { max_stops: stops }),
          },
        ],
      }
    }

    if (leg === "return") {
      return {
        trip: "one-way" as const,
        seat,
        passengers,
        ...bags,
        flights: [
          {
            date: returnDate,
            from_airport: toCode,
            to_airport: fromCode,
            ...(stops === undefined ? {} : { max_stops: stops }),
          },
        ],
      }
    }

    return {
      trip: "one-way" as const,
      seat,
      passengers,
      ...bags,
      flights: [
        {
          date: outboundDate,
          from_airport: fromCode,
          to_airport: toCode,
          ...(stops === undefined ? {} : { max_stops: stops }),
        },
      ],
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
          setCachedDayPrice(fromCode, toCode, seat, d, cheapest, data.currency || "GBP")
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
    setOutboundResults([])
    setReturnResults([])
    setGoogleUrl(null)
    setSearched(true)

    const postSearch = async (body: ReturnType<typeof buildBody>) => {
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
      return data
    }

    try {
      if (trip === "round-trip") {
        // Google RT HTML only lists outbound first — fetch both legs as one-way
        // for real prices, plus a RT call for the combined Google Flights URL.
        const [outData, retData, rtData] = await Promise.all([
          postSearch(buildBody(outbound, { leg: "outbound" })),
          postSearch(buildBody(outbound, { leg: "return" })),
          postSearch(buildBody(outbound, { leg: "round-trip" })).catch(() => null),
        ])

        const outFlights = Array.isArray(outData.flights) ? outData.flights : []
        const retFlights = Array.isArray(retData.flights) ? retData.flights : []
        setOutboundResults(outFlights)
        setReturnResults(retFlights)
        setGoogleUrl(rtData?.google_flights_url || outData.google_flights_url || null)
        setCurrency(outData.currency || retData.currency || "GBP")
        if (outFlights.length) {
          setCachedDayPrice(
            fromCode,
            toCode,
            seat,
            outbound,
            Math.min(...outFlights.map((f) => f.price)),
            outData.currency || "GBP"
          )
        }
        if (retFlights.length) {
          setCachedDayPrice(
            toCode,
            fromCode,
            seat,
            returnDate,
            Math.min(...retFlights.map((f) => f.price)),
            retData.currency || "GBP"
          )
        }

        if (!outFlights.length && !retFlights.length) {
          setError(
            outData.message ||
              retData.message ||
              "No flights found for this route and dates."
          )
        } else if (!outFlights.length) {
          setError("No outbound flights found — return options still shown below.")
        } else if (!retFlights.length) {
          setError("No return flights found — outbound options still shown below.")
        } else {
          void loadFlexibleStrip(outbound)
        }
      } else {
        const data = await postSearch(buildBody(outbound, { leg: "outbound" }))
        const flights = Array.isArray(data.flights) ? data.flights : []
        setOutboundResults(flights)
        setReturnResults([])
        setGoogleUrl(data.google_flights_url || null)
        setCurrency(data.currency || "GBP")
        if (flights.length) {
          setCachedDayPrice(
            fromCode,
            toCode,
            seat,
            outbound,
            Math.min(...flights.map((f) => f.price)),
            data.currency || "GBP"
          )
        }

        if (data.current_status === "empty" || !flights.length) {
          setError(data.message || "No flights found for this route and date.")
        } else {
          void loadFlexibleStrip(outbound)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search failed"
      setError(msg)
      showError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPlanned = async (
    offer: FlightOffer,
    key: string,
    leg: "outbound" | "return"
  ) => {
    setAddingKey(key)
    try {
      const fromIata = leg === "outbound" ? from.trim().toUpperCase() : to.trim().toUpperCase()
      const toIata = leg === "outbound" ? to.trim().toUpperCase() : from.trim().toUpperCase()
      const searchDate = leg === "outbound" ? date : returnDate
      const payload = mapOfferToPlannedFlight({
        offer,
        fromIata,
        toIata,
        searchDate,
        seat,
        currency,
      })
      if (trip === "round-trip") {
        payload.notes = `${payload.notes} · ${leg} · RT ${date} / ${returnDate}`
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
      setAddingKey(null)
    }
  }

  const swapAirports = () => {
    setFrom(to)
    setTo(from)
  }

  const renderOfferCards = (
    offers: FlightOffer[],
    leg: "outbound" | "return",
    fromCode: string,
    toCode: string
  ) => (
    <div className="space-y-3">
      {offers.map((offer, index) => {
        const first = offer.flights?.[0]
        const last = offer.flights?.[offer.flights.length - 1]
        const depTime = formatSegmentTime(first?.departure?.time, "—")
        const arrTime = formatSegmentTime(last?.arrival?.time, "—")
        const airlines = (offer.airlines || []).join(", ") || "Airline TBD"
        const key = `${leg}-${offer.price}-${index}-${offer.duration_minutes}`

        return (
          <div
            key={key}
            className="rounded-xl border border-[var(--rule)] bg-[hsl(var(--card))]/80 p-4 shadow-sm"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-lg font-semibold text-[var(--ink)]">
                  {priceLabel(currency, offer.price)}
                </p>
                <p className="text-xs text-[var(--ink-3)]">{airlines}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {offer.is_best && (
                  <Badge
                    className="border-[color-mix(in_srgb,var(--vermillion)_30%,transparent)] bg-[var(--wash-accent)] text-[var(--vermillion)]"
                    variant="outline"
                  >
                    Best
                  </Badge>
                )}
                {typeof offer.carbon?.emission === "number" && offer.carbon.emission > 0 && (
                  <span className="text-[10px] text-[color-mix(in_srgb,var(--jade)_90%,transparent)]">
                    ~{offer.carbon.emission} kg CO₂
                  </span>
                )}
                <span className="text-xs text-[var(--ink-3)]">
                  {offer.stops === 0
                    ? "Direct"
                    : `${offer.stops} stop${offer.stops === 1 ? "" : "s"}`}
                  {" · "}
                  {formatDuration(offer.duration_minutes)}
                </span>
              </div>
            </div>

            <div className="mb-3 flex items-center gap-2 text-sm text-[var(--ink-2)]">
              <span className="font-medium tabular-nums">{depTime}</span>
              <span className="text-[var(--ink-3)]">→</span>
              <span className="font-medium tabular-nums">{arrTime}</span>
              <span className="ml-auto text-xs text-[var(--ink-3)]">
                {fromCode || first?.from_airport?.code} → {toCode || last?.to_airport?.code}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="gap-1.5 bg-[var(--vermillion)] text-[var(--paper)] hover:bg-[var(--vermillion-dk)]"
                disabled={addingKey === key}
                onClick={() => void handleAddPlanned(offer, key, leg)}
              >
                {addingKey === key ? (
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
                  className="gap-1.5 border-[var(--rule)] text-[var(--ink-2)]"
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
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden border-[var(--rule)] bg-[hsl(var(--card))] p-0 sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <SheetHeader className="shrink-0 border-b border-[var(--rule)] px-6 py-4 pr-12 text-left">
          <SheetTitle className="flex items-center gap-2 text-[var(--ink)]">
            <Search className="h-5 w-5 text-[var(--vermillion)]" />
            Live flight search
          </SheetTitle>
          <SheetDescription className="text-[var(--ink-3)]">
            Search Google Flights live, then add an offer as a planned upcoming trip.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-3 border-b border-[var(--rule)] px-6 py-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-[var(--ink-2)]">Trip</Label>
              <Select value={trip} onValueChange={(v) => setTrip(v as TripType)}>
                <SelectTrigger className="border-[var(--rule)] bg-[hsl(var(--card))] text-[var(--ink)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-way">One-way</SelectItem>
                  <SelectItem value="round-trip">Round-trip</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[var(--ink-2)]">Stops</Label>
              <Select value={maxStops} onValueChange={(v) => setMaxStops(v as StopsFilter)}>
                <SelectTrigger className="border-[var(--rule)] bg-[hsl(var(--card))] text-[var(--ink)]">
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
              className="mb-0.5 border-[var(--rule)] bg-[hsl(var(--card))] text-[var(--ink-2)] hover:bg-[hsl(var(--card))]"
              onClick={swapAirports}
              title="Swap airports"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
            <AirportCodeField label="To" value={to} onChange={setTo} />
          </div>

          <div className={`grid gap-3 ${trip === "round-trip" ? "grid-cols-2" : "grid-cols-2"}`}>
            <div className="space-y-1.5">
              <Label htmlFor="live-date" className="text-[var(--ink-2)]">
                {trip === "round-trip" ? "Outbound" : "Date"}
              </Label>
              <Input
                id="live-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border-[var(--rule)] bg-[hsl(var(--card))] text-[var(--ink)]"
              />
            </div>
            {trip === "round-trip" ? (
              <div className="space-y-1.5">
                <Label htmlFor="live-return" className="text-[var(--ink-2)]">
                  Return
                </Label>
                <Input
                  id="live-return"
                  type="date"
                  value={returnDate}
                  min={date}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="border-[var(--rule)] bg-[hsl(var(--card))] text-[var(--ink)]"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-[var(--ink-2)]">Cabin</Label>
                <Select value={seat} onValueChange={(v) => setSeat(v as SeatType)}>
                  <SelectTrigger className="border-[var(--rule)] bg-[hsl(var(--card))] text-[var(--ink)]">
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
              <Label className="text-[var(--ink-2)]">Cabin</Label>
              <Select value={seat} onValueChange={(v) => setSeat(v as SeatType)}>
                <SelectTrigger className="border-[var(--rule)] bg-[hsl(var(--card))] text-[var(--ink)]">
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
                <Label className="text-[11px] text-[var(--ink-3)]">{label}</Label>
                <Input
                  type="number"
                  min={min}
                  max={9}
                  value={val}
                  onChange={(e) => setter(Number(e.target.value) || min)}
                  className="border-[var(--rule)] bg-[hsl(var(--card))] text-[var(--ink)]"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[var(--ink-2)]">Carry-on</Label>
              <Input
                type="number"
                min={0}
                max={9}
                value={carryOn}
                onChange={(e) => setCarryOn(Number(e.target.value) || 0)}
                className="border-[var(--rule)] bg-[hsl(var(--card))] text-[var(--ink)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[var(--ink-2)]">Checked bags</Label>
              <Input
                type="number"
                min={0}
                max={9}
                value={checkedBags}
                onChange={(e) => setCheckedBags(Number(e.target.value) || 0)}
                className="border-[var(--rule)] bg-[hsl(var(--card))] text-[var(--ink)]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full border-[var(--rule)] bg-[hsl(var(--card))] text-[var(--ink-2)] hover:bg-[hsl(var(--card))]"
              onClick={() => setShowMonthCalendar((v) => !v)}
            >
              {showMonthCalendar ? "Hide month prices" : "Month price grid & graph"}
            </Button>
            {showMonthCalendar && (
              <PriceMonthPanel
                from={from}
                to={to}
                seat={seat}
                selectedDate={date}
                currency={currency}
                buildOneWayBody={(d) => buildBody(d, { forFlexible: true, leg: "outbound" })}
                onSelectDate={(d) => {
                  setDate(d)
                  void handleSearch(d)
                }}
              />
            )}
          </div>

          {googleUrl && (
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--vermillion)] hover:text-[var(--vermillion-dk)]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open full search on Google Flights
            </a>
          )}
        </div>

        {dayPrices.length > 0 && (
          <div className="border-b border-[var(--rule)] px-4 py-3">
            <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-[var(--ink-3)]">
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
                        ? "border-[color-mix(in_srgb,var(--vermillion)_60%,transparent)] bg-[var(--wash-accent)] text-[var(--vermillion)]"
                        : "border-[var(--rule)] bg-[hsl(var(--card))] text-[var(--ink-2)] hover:border-[var(--rule)]"
                    }`}
                  >
                    <div className="text-[10px] text-[var(--ink-3)]">{formatChipDate(day.date)}</div>
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

        <div className="flex items-center justify-between border-b border-[var(--rule)] px-6 py-2">
          <p className="text-xs text-[var(--ink-3)]">
            {searched && !loading
              ? trip === "round-trip"
                ? `${sortedOutbound.length} out · ${sortedReturn.length} return`
                : `${sortedOutbound.length} offers`
              : "Results"}
          </p>
          <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
            <SelectTrigger className="h-8 w-[140px] border-[var(--rule)] bg-[hsl(var(--card))] text-xs text-[var(--ink)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="best">Best</SelectItem>
              <SelectItem value="cheapest">Cheapest</SelectItem>
              <SelectItem value="fastest">Fastest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="px-6 py-4">
          {error && (
            <div className="mb-3 rounded-lg border border-[color-mix(in_srgb,var(--brass)_30%,transparent)] bg-[var(--wash-brass)] px-3 py-2 text-sm text-[var(--brass)]">
              {error}
            </div>
          )}

          {!loading &&
            searched &&
            sortedOutbound.length === 0 &&
            sortedReturn.length === 0 &&
            !error && (
              <p className="text-sm text-[var(--ink-3)]">No results yet. Try another date or route.</p>
            )}

          {!searched && !loading && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-[var(--ink-3)]">
              <Plane className="h-8 w-8 text-[var(--ink-2)]" />
              <p className="text-sm">Enter a route and search for live prices.</p>
            </div>
          )}

          {searched && trip === "round-trip" && cheapestCombo && (
            <div className="mb-4 rounded-lg border border-[color-mix(in_srgb,var(--vermillion)_30%,transparent)] bg-[var(--wash-accent)] px-3 py-2 text-sm text-[var(--vermillion)]">
              Cheapest combo (one-way + one-way):{" "}
              <span className="font-semibold tabular-nums">
                {priceLabel(currency, cheapestCombo.outbound)} +{" "}
                {priceLabel(currency, cheapestCombo.ret)} ={" "}
                {priceLabel(currency, cheapestCombo.total)}
              </span>
              <span className="mt-0.5 block text-xs text-[color-mix(in_srgb,var(--vermillion)_80%,transparent)]">
                Separate tickets estimate — Google Flights link is the true round-trip fare.
              </span>
            </div>
          )}

          <div className="space-y-6 pb-8">
            {searched && (trip === "round-trip" || sortedOutbound.length > 0) && (
              <section className="space-y-3">
                {trip === "round-trip" && (
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[var(--ink)]">
                      Outbound · {formatChipDate(date)}
                    </h3>
                    <span className="text-xs text-[var(--ink-3)]">
                      {from.trim().toUpperCase()} → {to.trim().toUpperCase()}
                    </span>
                  </div>
                )}
                {sortedOutbound.length === 0 && searched && !loading ? (
                  <p className="text-sm text-[var(--ink-3)]">No outbound flights.</p>
                ) : (
                  renderOfferCards(
                    sortedOutbound,
                    "outbound",
                    from.trim().toUpperCase(),
                    to.trim().toUpperCase()
                  )
                )}
              </section>
            )}

            {searched && trip === "round-trip" && (
              <section className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--ink)]">
                    Return · {formatChipDate(returnDate)}
                  </h3>
                  <span className="text-xs text-[var(--ink-3)]">
                    {to.trim().toUpperCase()} → {from.trim().toUpperCase()}
                  </span>
                </div>
                {sortedReturn.length === 0 && !loading ? (
                  <p className="text-sm text-[var(--ink-3)]">No return flights.</p>
                ) : (
                  renderOfferCards(
                    sortedReturn,
                    "return",
                    to.trim().toUpperCase(),
                    from.trim().toUpperCase()
                  )
                )}
              </section>
            )}
          </div>
        </div>
        </div>

        <div className="shrink-0 border-t border-[var(--rule)] bg-[hsl(var(--card))] px-6 py-3">
          <Button
            className="w-full gap-2 bg-[var(--vermillion)] text-[var(--paper)] hover:bg-[var(--vermillion-dk)]"
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
                Search flights
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

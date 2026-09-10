"use client"

import { useEffect, useState } from "react"
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
} from "./mapOfferToFlight"

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

  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [date, setDate] = useState(initialDate || defaultSearchDate())
  const [seat, setSeat] = useState<SeatType>("economy")
  const [adults, setAdults] = useState(1)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<FlightOffer[]>([])
  const [googleUrl, setGoogleUrl] = useState<string | null>(null)
  const [currency, setCurrency] = useState("GBP")
  const [addingIndex, setAddingIndex] = useState<number | null>(null)
  const [searched, setSearched] = useState(false)

  // Sync when drawer opens with new initials
  useEffect(() => {
    if (!open) return
    setFrom((initialFrom || "").toUpperCase())
    setTo((initialTo || "").toUpperCase())
    setDate(initialDate || defaultSearchDate())
    setError(null)
    setResults([])
    setGoogleUrl(null)
    setSearched(false)
  }, [open, initialFrom, initialTo, initialDate])

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

    setLoading(true)
    setError(null)
    setResults([])
    setGoogleUrl(null)
    setSearched(true)

    try {
      const body = {
        trip: "one-way" as const,
        seat,
        passengers: {
          adults: Math.max(1, adults),
          children: 0,
          infants_in_seat: 0,
          infants_on_lap: 0,
        },
        currency: "GBP",
        language: "en-GB",
        flights: [
          {
            date,
            from_airport: fromCode,
            to_airport: toCode,
          },
        ],
      }

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

      if (
        data.current_status === "empty" ||
        !data.flights?.length
      ) {
        setError(data.message || "No flights found for this route and date.")
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

  const priceLabel = (price: number) => {
    if (currency === "GBP") return `£${price}`
    return `${currency} ${price}`
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

        <div className="space-y-4 border-b border-zinc-800 px-6 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
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
                Date
              </Label>
              <Input
                id="live-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border-zinc-700 bg-zinc-900 text-zinc-100"
              />
            </div>
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
          </div>

          <div className="flex items-end gap-3">
            <div className="w-24 space-y-1.5">
              <Label htmlFor="live-adults" className="text-zinc-300">
                Adults
              </Label>
              <Input
                id="live-adults"
                type="number"
                min={1}
                max={9}
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value) || 1)}
                className="border-zinc-700 bg-zinc-900 text-zinc-100"
              />
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

        <ScrollArea className="flex-1 px-6 py-4">
          {error && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {error}
            </div>
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
            {results.map((offer, index) => {
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
                        {priceLabel(offer.price)}
                      </p>
                      <p className="text-xs text-zinc-400">{airlines}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {offer.is_best && (
                        <Badge className="bg-sky-500/15 text-sky-300 border-sky-500/30" variant="outline">
                          Best
                        </Badge>
                      )}
                      <span className="text-xs text-zinc-400">
                        {offer.stops === 0 ? "Direct" : `${offer.stops} stop${offer.stops === 1 ? "" : "s"}`}
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

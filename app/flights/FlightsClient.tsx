"use client"

import { useCallback, useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { DateRange } from "react-day-picker"
import { isWithinInterval, isSameDay } from "date-fns"
import { enUS } from "date-fns/locale"
import { useNotification } from "@/contexts/notification-context"
import { Button } from "@/components/ui/button"
import { ArrowRight, Pencil, Trash2, Mail, Upload, Download, Settings, ChevronDown, Search, RotateCcw } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { PaginationControls } from "@/app/flights/components/PaginationControls"
import { FiltersPanel } from "@/app/flights/components/FiltersPanel"
import { FlightsTable } from "@/app/flights/components/FlightsTable"
import { groupFlightsIntoBookings } from "@/lib/statistics/booking-spend"
import { DeleteFlightDialog } from "@/app/flights/components/DeleteFlightDialog"
import { CsvImportDialog } from "@/app/flights/components/CsvImportDialog"
import { CsvExportDialog } from "@/app/flights/components/CsvExportDialog"
import { Flightradar24ExportDialog } from "@/app/flights/components/Flightradar24ExportDialog"
import { GmailImportDialog } from "@/components/gmail/GmailImportDialog"
import { LiveSearchDrawer } from "@/components/live-search/LiveSearchDrawer"
import { defaultSearchDate } from "@/components/live-search/mapOfferToFlight"
import { format } from "date-fns"
import { formatTimeToHHMM, calculateDuration, getAirlineLogo, resolveAirlineName } from "@/app/flights/lib/flight-utils"
import { SearchBar } from "@/app/flights/components/SearchBar"
import { PaperNav } from "@/app/components/paper-nav"
import { Plane } from "lucide-react"
import type { Flight } from "@/types/flight"
import s from "./flights.module.css"

const Arrow = () => (
  <svg width="16" height="8" viewBox="0 0 16 8" fill="none" aria-hidden="true">
    <path d="M0 4h14M10.5 1L14 4l-3.5 3" stroke="currentColor" strokeWidth="1.2" />
  </svg>
)

/** IATA when we have one, otherwise the first three letters of the airport. */
const iataOf = (iata: string | null | undefined, airportName: string) =>
  iata && iata !== "None" ? iata : airportName.slice(0, 3).toUpperCase()


export type FlightsCounts = {
  total: number
  upcoming: number
  past: number
}

export function FlightsClient({ initialFlights, initialCounts }: { initialFlights: Flight[]; initialCounts: FlightsCounts }) {
  const router = useRouter()
  const { showSuccess, showError } = useNotification()

  const { data: flights = [], isFetching, refetch: originalRefetch } = useQuery<Flight[]>({
    queryKey: ["flights"],
    queryFn: async () => {
      const res = await fetch("/api/flights")
      if (!res.ok) throw new Error("Failed to fetch flights")
      const data = await res.json()
      return data
    },
    initialData: initialFlights,
    refetchOnWindowFocus: false, // Prevent auto-refetch when switching tabs
    refetchOnMount: false, // Prevent auto-refetch on component mount
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  })

  // Custom refetch function that shows success toast
  const refetch = async () => {
    const result = await originalRefetch()
    if (result.isSuccess) {
      showSuccess("Flights updated")
    }
    return result
  }

  const [isGmailImportOpen, setIsGmailImportOpen] = useState(false)
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false)
  const [isCsvExportDialogOpen, setIsCsvExportDialogOpen] = useState(false)
  const [isFlightradar24ExportDialogOpen, setIsFlightradar24ExportDialogOpen] = useState(false)
  const [liveSearchOpen, setLiveSearchOpen] = useState(false)
  const [liveSearchInitial, setLiveSearchInitial] = useState<{ from?: string; to?: string; date?: string }>({})

  const openLiveSearch = (opts?: { from?: string; to?: string; date?: string }) => {
    setLiveSearchInitial({
      from: opts?.from || "",
      to: opts?.to || "",
      date: opts?.date || defaultSearchDate(),
    })
    setLiveSearchOpen(true)
  }

  const openFlyItAgain = (flight: Flight) => {
    const from = (flight.departure_iata || flight.departure_airport || "").trim()
    const to = (flight.arrival_iata || flight.arrival_airport || "").trim()
    openLiveSearch({ from, to, date: defaultSearchDate() })
  }


  const [searchTerm, setSearchTerm] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [airline, setAirline] = useState("all")
  const [priceRange, setPriceRange] = useState("all")
  const [tripType, setTripType] = useState("all")
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [isDeleting, setIsDeleting] = useState(false)
  const [flightToDelete, setFlightToDelete] = useState<Flight | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 7


  // FiltersPanel extra state/props
  const initialDate = useMemo(() => new Date(), [])
  const [selectedCurrency, setSelectedCurrency] = useState<string>("USD")
  const currencies = ["USD", "EUR", "GBP"]
  const getPriceRangeLabel = (range: string) => {
    const label: Record<string, string> = {
      under100: "Under 100",
      "100to500": "100 - 500",
      "500to1000": "500 - 1000",
      over1000: "Over 1000",
    }
    return `${label[range] ?? "All"} ${selectedCurrency}`
  }

  // Lightweight client-side logger (fire-and-forget)
  const logEvent = (action: string, metadata?: Record<string, any>) => {
    try {
      void fetch("/api/event-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, metadata, page: "/flights" }),
        keepalive: true,
      })
    } catch { }
  }

  const airlines = useMemo(() => {
    const set = new Set<string>()
    for (const f of flights) {
      // Read the carrier the same way the list prints it, so a row whose airline
      // was never filled in files under Ryanair rather than under Unknown.
      const name = resolveAirlineName(f.airline, f.flight_number)
      if (name) set.add(name)
    }
    const hasUnknown = flights.some((f) => !resolveAirlineName(f.airline, f.flight_number))
    // Remove any literal 'Unknown' already present (case-insensitive) to avoid duplicates
    const list = (Array.from(set) as string[]).filter(
      (a) => a.trim().toLowerCase() !== "unknown"
    )
    return hasUnknown ? ["Unknown", ...list] : list
  }, [flights])

  /* A reservation is what was paid for; a leg is what was flown. The list is
     filed by reservation so one fare is printed once, with its other legs folded
     underneath it. A booking stays on the page when ANY of its legs matches the
     filters — searching for the return leg's airport still finds the booking. */
  const matchesLeg = useCallback(
    (flight: Flight) => {
      const term = searchTerm.toLowerCase()
      const matchesSearch =
        flight.departure_airport.toLowerCase().includes(term) ||
        flight.arrival_airport.toLowerCase().includes(term) ||
        flight.departure_iata?.toLowerCase().includes(term) ||
        flight.arrival_iata?.toLowerCase().includes(term) ||
        (flight.airline || "").toLowerCase().includes(term) ||
        flight.flight_number.toLowerCase().includes(term) ||
        flight.passenger_name.toLowerCase().includes(term) ||
        flight.reservation_number.toLowerCase().includes(term)

      const carrier = resolveAirlineName(flight.airline, flight.flight_number)
      const matchesAirline = (
        airline === "all" ||
        airline === "" ||
        (airline === "Unknown" ? !carrier : carrier === airline)
      )

      let matchesDateRange = true
      if (dateRange?.from || dateRange?.to) {
        const flightDate = new Date(flight.departure_date)
        if (dateRange.from && dateRange.to) {
          matchesDateRange = isWithinInterval(flightDate, { start: dateRange.from, end: dateRange.to })
        } else if (dateRange.from) {
          matchesDateRange = isSameDay(flightDate, dateRange.from)
        }
      }

      let matchesTripType = true
      if (tripType !== "all") {
        const isRoundTrip = flights.some(
          (otherFlight) =>
            otherFlight.id !== flight.id &&
            otherFlight.departure_airport === flight.arrival_airport &&
            otherFlight.arrival_airport === flight.departure_airport
        )
        matchesTripType = tripType === "roundtrip" ? isRoundTrip : !isRoundTrip
      }

      return matchesSearch && matchesAirline && matchesDateRange && matchesTripType
    },
    [flights, searchTerm, airline, dateRange, tripType]
  )

  const filteredBookings = useMemo(() => {
    return groupFlightsIntoBookings(flights).filter((booking) => {
      if (!booking.legs.some(matchesLeg)) return false
      if (priceRange === "all") return true
      // The price filter reads the booking's total, which is what was actually
      // paid — not a fare repeated across its legs.
      const price = booking.total
      if (price == null) return false
      switch (priceRange) {
        case "under100":
          return price < 100
        case "100to500":
          return price >= 100 && price <= 500
        case "500to1000":
          return price >= 500 && price <= 1000
        case "over1000":
          return price > 1000
        default:
          return true
      }
    })
  }, [flights, matchesLeg, priceRange])

  const sortedBookings = useMemo(() => {
    return [...filteredBookings].sort((a, b) => {
      const outboundA = a.legs[0]
      const outboundB = b.legs[0]
      switch (sortBy) {
        case "date": {
          const dateA = new Date(outboundA.departure_date).getTime()
          const dateB = new Date(outboundB.departure_date).getTime()
          return sortOrder === "desc" ? dateB - dateA : dateA - dateB
        }
        case "price": {
          const priceA = a.total ?? 0
          const priceB = b.total ?? 0
          return sortOrder === "desc" ? priceB - priceA : priceA - priceB
        }
        case "airline": {
          const airlineA = outboundA.airline || ""
          const airlineB = outboundB.airline || ""
          return sortOrder === "desc" ? airlineB.localeCompare(airlineA) : airlineA.localeCompare(airlineB)
        }
        default:
          return 0
      }
    })
  }, [filteredBookings, sortBy, sortOrder])

  const totalPages = Math.ceil(sortedBookings.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentBookings = sortedBookings.slice(startIndex, endIndex)

  const canGoPrevious = currentPage > 1
  const canGoNext = currentPage < totalPages

  /* Narrowing the list re-cuts it, and the page you were on rarely exists in the
     new cut: filtering to an airline with one page while sitting on page three
     used to slice past the end and report "nothing filed" for a filter that
     matches perfectly well. Every filter change starts again at the first page. */
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, airline, dateRange, priceRange, tripType, sortBy, sortOrder])

  // A page can also fall off the end without the filters moving — a deletion, or
  // a refetch that returns fewer flights — so the current page is kept in range.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(Math.max(1, totalPages))
  }, [currentPage, totalPages])

  const goToPage = (page: number) => setCurrentPage(Math.min(Math.max(1, page), totalPages))

  const isUpcoming = (date: string) => {
    const flightDate = new Date(date)
    flightDate.setHours(23, 59, 59, 999)
    return flightDate > new Date()
  }

  const handleDelete = async (flight: Flight) => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/flights/${flight.id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete flight")
      await refetch()
      setFlightToDelete(null)
      showSuccess("Flight deleted")
      logEvent("delete_flight", { id: flight.id })
    } catch (e) {
      showError("Failed to delete flight")
    } finally {
      setIsDeleting(false)
    }
  }

  // Top counts (from server initial counts; recompute on client from flights to stay consistent after refetch)
  const counts = useMemo(() => {
    const now = new Date()
    const upcoming = flights.filter((f) => new Date(f.departure_date) > now).length
    const past = flights.length - upcoming
    return { total: flights.length, upcoming, past }
  }, [flights])

  return (
    <div className={s.page}>
      <div className={s.shell}>
        <PaperNav />
      </div>

      <header className={s.shell}>
        <div className={s.masthead}>
          <div className={s.mastheadCopy}>
            <p className={`${s.stamp} ${s.tag} ${s.rise}`} style={{ animationDelay: "40ms" }}>
              <span />
              <span>Section 02 · The logbook</span>
            </p>
            <h1 className={`${s.title} ${s.rise}`} style={{ animationDelay: "110ms" }}>
              Every leg <em>you have filed</em>
            </h1>
            <p className={`${s.lede} ${s.rise}`} style={{ animationDelay: "200ms" }}>
              The whole record, sorted and searchable down to a single reservation
              number. Filed legs are printed below in reverse order of departure.
            </p>
          </div>
          <div className={`${s.mastheadActions} ${s.rise}`} style={{ animationDelay: "280ms" }}>
            <button
              type="button"
              className={s.btnOutline}
              onClick={() => openLiveSearch()}
            >
              <Search className="h-3.5 w-3.5" />
              Search flights
            </button>
            <a href="/add-flight" className={s.btnPrimary}>
              File a flight
              <Arrow />
            </a>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={s.btnOutline}>
                  <Settings className="h-3.5 w-3.5" />
                  Tools
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="paper-surface w-56">
              <DropdownMenuItem onClick={() => setIsCsvDialogOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Import CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsCsvExportDialogOpen(true)} className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsFlightradar24ExportDialogOpen(true)} className="gap-2">
                <Plane className="h-4 w-4 text-[var(--brass)]" />
                Export for Flightradar24
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsGmailImportOpen(true)} className="gap-2">
                <Mail className="h-4 w-4" />
                Import from Gmail
              </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className={s.shell}>
        {/* Counts, kept as a ledger strip rather than cards */}
        <dl className={`${s.ledger} ${s.rise}`} style={{ animationDelay: "340ms" }}>
          <div className={s.ledgerCell}>
            <dt className={s.ledgerLabel}>Legs filed</dt>
            <dd className={s.ledgerValue}>{counts.total}</dd>
          </div>
          <div className={s.ledgerCell}>
            <dt className={s.ledgerLabel}>Still to come</dt>
            <dd className={`${s.ledgerValue} ${s.ledgerValueHot}`}>{counts.upcoming}</dd>
          </div>
          <div className={s.ledgerCell}>
            <dt className={s.ledgerLabel}>Flown</dt>
            <dd className={s.ledgerValue}>{counts.past}</dd>
          </div>
        </dl>

        <div className={s.filing}>
          {/* Quick Search: reservation number or single date */}
          <SearchBar
            setSearchTerm={(v) => { setSearchTerm(v); logEvent("quick_search", { term: v }) }}
            setDateRange={(range) => { setDateRange(range); logEvent("quick_search_date", { from: range?.from, to: range?.to }) }}
          />

          {/* Filters */}
          <FiltersPanel
        dateRange={dateRange}
        setDateRange={(range) => { setDateRange(range); logEvent("filter_date_range", { from: range?.from, to: range?.to }) }}
        initialDate={initialDate}
        airline={airline}
        setAirline={(v) => { setAirline(v); logEvent("filter_airline", { airline: v }) }}
        airlines={airlines}
        priceRange={priceRange}
        setPriceRange={(v) => { setPriceRange(v); logEvent("filter_price_range", { priceRange: v }) }}
        selectedCurrency={selectedCurrency}
        setSelectedCurrency={(v) => { setSelectedCurrency(v); logEvent("filter_currency", { currency: v }) }}
        currencies={currencies}
        getPriceRangeLabel={getPriceRangeLabel}
        tripType={tripType}
        setTripType={(v) => { setTripType(v); logEvent("filter_trip_type", { tripType: v }) }}
        sortBy={sortBy}
        setSortBy={(v) => { setSortBy(v); logEvent("sort_by", { sortBy: v }) }}
            sortOrder={sortOrder}
            setSortOrder={(v: string) => { setSortOrder(v as "asc" | "desc"); logEvent("sort_order", { sortOrder: v }) }}
          />
        </div>

        {/* CSV Import Dialog */}
        <CsvImportDialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen} onImported={async () => { await refetch() }} />

        {/* CSV Export Dialog */}
        <CsvExportDialog open={isCsvExportDialogOpen} onOpenChange={setIsCsvExportDialogOpen} flights={flights} />
        <Flightradar24ExportDialog open={isFlightradar24ExportDialogOpen} onOpenChange={setIsFlightradar24ExportDialogOpen} flights={flights} />

        {/* Narrow screens: each leg as a torn boarding-pass stub */}
        <div className={s.cards}>
          {currentBookings.map((booking) => (
            <FlightCard
              key={booking.key}
              flight={booking.legs[0]}
              otherLegs={booking.legs.length - 1}
              onRowClick={(f) => { logEvent("open_flight", { id: f.id, source: "row_click" }); router.push(`/flights/${f.id}`) }}
              onEdit={(f) => { logEvent("open_flight_edit", { id: f.id, source: "table_edit" }); router.push(`/flights/${f.id}/edit`) }}
              onDeleteRequest={(f) => setFlightToDelete(f)}
              onFlyAgain={openFlyItAgain}
              isUpcoming={isUpcoming}
            />
          ))}
        </div>

        {/* Desktop table */}
        <FlightsTable
          loading={isFetching}
          bookings={currentBookings}
          onEdit={(f) => { logEvent("open_flight_edit", { id: f.id, source: "table_edit" }); router.push(`/flights/${f.id}/edit`) }}
          onDeleteRequest={(f) => setFlightToDelete(f)}
          onFlyAgain={openFlyItAgain}
          onRowClick={(f) => { logEvent("open_flight", { id: f.id, source: "row_click" }); router.push(`/flights/${f.id}`) }}
        />

        <PaginationControls
          loading={isFetching}
          currentPage={currentPage}
          totalPages={totalPages}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          goToPage={goToPage}
          startIndex={startIndex}
          endIndex={endIndex}
          totalItems={sortedBookings.length}
          itemLabel="Bookings"
        />

        <div className={s.colophon}>
          <span className={s.tag}>MySky · Personal flight record</span>
          <p className={s.colophonNote}>
            Scheduled times are as filed. Actual and estimated times are supplied by
            third parties and shown for reference only.
          </p>
        </div>
      </main>

      <DeleteFlightDialog
        open={!!flightToDelete}
        flight={flightToDelete}
        onOpenChange={(open) => { if (!open) setFlightToDelete(null) }}
        onConfirm={() => flightToDelete && handleDelete(flightToDelete)}
        isDeleting={isDeleting}
      />

      {/* Gmail import: scan, review, confirm */}
      <GmailImportDialog
        open={isGmailImportOpen}
        onOpenChange={setIsGmailImportOpen}
        onAdded={async () => { await refetch() }}
      />

      {/* Import Progress Indicator */}

      <LiveSearchDrawer
        open={liveSearchOpen}
        onOpenChange={setLiveSearchOpen}
        initialFrom={liveSearchInitial.from}
        initialTo={liveSearchInitial.to}
        initialDate={liveSearchInitial.date}
        onPlannedAdded={async () => { await originalRefetch() }}
      />
    </div>
  )
}

interface FlightCardProps {
  flight: Flight;
  /** legs of the same reservation not shown on this card */
  otherLegs?: number;
  onRowClick: (flight: Flight) => void;
  onEdit: (flight: Flight) => void;
  onDeleteRequest: (flight: Flight) => void;
  onFlyAgain: (flight: Flight) => void;
  isUpcoming: (date: string) => boolean;
}

const FlightCard: React.FC<FlightCardProps> = ({ flight, otherLegs = 0, onRowClick, onEdit, onDeleteRequest, onFlyAgain, isUpcoming }) => (
  <article
    className={`${s.card} ${flight.cancelled ? s.cancelled : ""}`}
    onClick={() => onRowClick(flight)}
  >
    <div className={s.cardMain}>
      <div className={s.cardHead}>
        <div className={s.cardFlight}>
          <span className={s.logo}>
            <img
              src={getAirlineLogo(flight.airline ?? null, flight.flight_number)}
              alt=""
              onError={(e) => {
                const target = e.currentTarget
                target.style.display = 'none'
                const fallbackIcon = target.parentElement?.querySelector('.fallback-icon') as HTMLElement
                if (fallbackIcon) fallbackIcon.style.display = 'flex'
              }}
            />
            <span className="fallback-icon" style={{ display: 'none' }}>
              <Plane className="h-4 w-4" />
            </span>
          </span>
          <span className={s.flightNo}>{flight.flight_number}</span>
          <span className={s.cardAirline}>{resolveAirlineName(flight.airline, flight.flight_number) || "Unknown"}</span>
        </div>
        {flight.cancelled
          ? flight.total_receipt && (
              <span className={s.cancelledPaid}>Paid {flight.total_receipt}</span>
            )
          : isUpcoming(flight.departure_date) && <span className={s.cardFlag}>Upcoming</span>}
      </div>

      <div className={s.cardRoute}>
        <div className={s.cardIata}>
          {iataOf(flight.departure_iata, flight.departure_airport)}
          <small>{flight.departure_airport}</small>
        </div>
        <svg className={s.cardArc} viewBox="0 0 104 22" aria-hidden="true">
          <path d="M2 19 C 28 2, 76 2, 102 19" />
        </svg>
        <div className={s.cardIata} style={{ textAlign: "right" }}>
          {iataOf(flight.arrival_iata, flight.arrival_airport)}
          <small>{flight.arrival_airport}</small>
        </div>
      </div>

      <dl className={s.cardData}>
        <div className={s.cardField}>
          <dt>Date</dt>
          <dd>{format(new Date(flight.departure_date), "dd MMM").toUpperCase()}</dd>
        </div>
        <div className={s.cardField}>
          <dt>Dep</dt>
          <dd>{formatTimeToHHMM(flight.departure_time) || "—"}</dd>
        </div>
        <div className={s.cardField}>
          <dt>Arr</dt>
          <dd>{formatTimeToHHMM(flight.arrival_time) || "—"}</dd>
        </div>
      </dl>

      <div className={s.cardFoot}>
        <span className={s.ref}>
          {flight.reservation_number}
          {otherLegs > 0 && (
            <span className={s.cardLegs}>+{otherLegs} leg{otherLegs > 1 ? "s" : ""}</span>
          )}
        </span>
        <div className={s.actions}>
          {onFlyAgain && (
            <button
              type="button"
              className={s.iconBtn}
              aria-label="Fly it again"
              title="Fly it again"
              onClick={(e) => { e.stopPropagation(); onFlyAgain(flight) }}
            >
              <RotateCcw />
            </button>
          )}
          <button
            type="button"
            className={s.iconBtn}
            aria-label="Edit flight"
            onClick={(e) => { e.stopPropagation(); onEdit(flight) }}
          >
            <Pencil />
          </button>
          <button
            type="button"
            className={s.iconBtn}
            aria-label="Delete flight"
            onClick={(e) => { e.stopPropagation(); onDeleteRequest(flight) }}
          >
            <Trash2 />
          </button>
        </div>
      </div>
    </div>

    <aside className={s.cardStub}>
      <span className={`${s.notch} ${s.notchTop}`} aria-hidden="true" />
      <span className={`${s.notch} ${s.notchBottom}`} aria-hidden="true" />
      <div>
        <div className={s.stubLabel}>Seat</div>
        <div className={s.stubValue}>{flight.seat || "—"}</div>
      </div>
      <div className={s.barcode} aria-hidden="true" />
      <span className={s.stubLabel}>{flight.flight_number}</span>
    </aside>
  </article>
);

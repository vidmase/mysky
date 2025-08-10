"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { DateRange } from "react-day-picker"
import { isWithinInterval, isSameDay } from "date-fns"
import { enUS } from "date-fns/locale"
import { useNotification } from "@/contexts/notification-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, Pencil, Trash2, Mail, Loader2, Upload, Download } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { PaginationControls } from "@/app/flights/components/PaginationControls"
import { FiltersPanel } from "@/app/flights/components/FiltersPanel"
import { FlightsTable } from "@/app/flights/components/FlightsTable"
import { DeleteFlightDialog } from "@/app/flights/components/DeleteFlightDialog"
import { CsvImportDialog } from "@/app/flights/components/CsvImportDialog"
import { format } from "date-fns"
import { formatTimeToHHMM, calculateDuration, getAirlineLogo } from "@/app/flights/lib/flight-utils"

export interface Flight {
  id: number
  passenger_name: string
  reservation_number: string
  flight_number: string
  departure_airport: string
  arrival_airport: string
  departure_date: string
  departure_time: string
  arrival_time: string
  total_receipt: string
  purchased_date: string
  purchase_time: string
  airline: string | null
  arrival_country: string | null
  arrival_iata: string | null
  departure_iata: string | null
  seat: string | null
  notes: string | null
}

export type FlightsCounts = {
  total: number
  upcoming: number
  past: number
}

export function FlightsClient({ initialFlights, initialCounts }: { initialFlights: Flight[]; initialCounts: FlightsCounts }) {
  const router = useRouter()
  const { showSuccess, showError } = useNotification()

  const { data: flights = [], isFetching, refetch } = useQuery<Flight[]>({
    queryKey: ["flights"],
    queryFn: async () => {
      const res = await fetch("/api/flights")
      if (!res.ok) throw new Error("Failed to fetch flights")
      const data = await res.json()
      // toast only on client refetches
      showSuccess("Flights updated")
      return data
    },
    initialData: initialFlights,
  })

  // Gmail preview and selection dialog state
  type GmailPreviewItem = {
    id: string
    subject: string
    received_at?: string
    duplicate?: boolean
    key?: string
    parsed: any
  }
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isImportingSelected, setIsImportingSelected] = useState(false)
  const [gmailItems, setGmailItems] = useState<GmailPreviewItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false)
  // Gmail date range (YYYY-MM-DD)
  const todayISO = useMemo(() => new Date().toISOString().slice(0,10), [])
  const defaultStartISO = useMemo(() => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 30)
    return d.toISOString().slice(0,10)
  }, [])
  const [gmailStart, setGmailStart] = useState<string>(defaultStartISO)
  const [gmailEnd, setGmailEnd] = useState<string>(todayISO)
  // Items filtered by EMAIL RECEIVED date
  const filteredGmailItems = useMemo(() => {
    const start = gmailStart ? new Date(gmailStart + 'T00:00:00Z') : null
    const end = gmailEnd ? new Date(gmailEnd + 'T23:59:59Z') : null
    return gmailItems.filter((item) => {
      const dStr = item.received_at
      if (!dStr) return false
      const d = new Date(dStr)
      if (Number.isNaN(d.getTime())) return false
      if (start && d < start) return false
      if (end && d > end) return false
      return true
    })
  }, [gmailItems, gmailStart, gmailEnd])

  // When list or range changes, preselect all (user can adjust afterwards)
  // This mirrors the old behavior of preselecting non-duplicates
  // but now includes all items in the filtered range.
  useEffect(() => {
    setSelectedIds(new Set(filteredGmailItems.map(i => i.id)))
  }, [filteredGmailItems])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(filteredGmailItems.map(i => i.id)))
  const clearAll = () => setSelectedIds(new Set())

  const openImportDialog = () => {
    // Open dialog without auto-loading previews.
    // User will explicitly choose Last 30/90 days to fetch.
    setIsDialogOpen(true)
    setGmailItems([])
    setSelectedIds(new Set())
  }

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams()
      if (dateRange?.from) params.set('start', format(dateRange.from, 'yyyy-MM-dd'))
      if (dateRange?.to) params.set('end', format(dateRange.to, 'yyyy-MM-dd'))
      const qs = params.toString()
      const res = await fetch(`/api/flights/export${qs ? `?${qs}` : ''}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'flights.csv'
      a.click()
      URL.revokeObjectURL(url)
      showSuccess('Exported flights CSV')
    } catch (e) {
      showError('Failed to export CSV')
    }
  }

  const loadPreview = async (override?: { start?: string; end?: string }) => {
    setIsLoadingPreview(true)
    try {
      const params = new URLSearchParams()
      const startQ = override?.start ?? gmailStart
      const endQ = override?.end ?? gmailEnd
      if (startQ) params.set('start', startQ)
      if (endQ) params.set('end', endQ)
      const res = await fetch(`/api/gmail/preview?${params.toString()}`)
      if (res.status === 401) {
        const data = await res.json().catch(() => ({}))
        if (data?.authUrl) {
          window.location.href = data.authUrl
          return
        }
        showError('Gmail not connected')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showError(data?.message || data?.error || 'Failed to load Gmail previews')
        return
      }
      const data = await res.json()
      const items: GmailPreviewItem[] = data.items || []
      setGmailItems(items)
      setSelectedIds(new Set(items.filter(i => !i.duplicate).map(i => i.id)))
    } catch (e) {
      showError('Failed to load Gmail previews')
    } finally {
      setIsLoadingPreview(false)
    }
  }

  // Helpers for month range selection (UTC-safe to avoid TZ drift)
  const toISO = (d: Date) => d.toISOString().slice(0, 10)
  const getMonthRangeISO = (year: number, monthZeroBased: number) => {
    const start = new Date(Date.UTC(year, monthZeroBased, 1))
    const end = new Date(Date.UTC(year, monthZeroBased + 1, 0))
    return { startISO: toISO(start), endISO: toISO(end) }
  }
  const setMonthRangeAndLoad = (year: number, monthZeroBased: number) => {
    const { startISO, endISO } = getMonthRangeISO(year, monthZeroBased)
    setGmailStart(startISO)
    setGmailEnd(endISO)
    void loadPreview({ start: startISO, end: endISO })
  }

  const importSelected = async () => {
    if (!selectedIds.size) {
      showError('Select at least one flight to import')
      return
    }
    setIsImportingSelected(true)
    try {
      const ids = Array.from(selectedIds)
      const res = await fetch('/api/gmail/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
      if (res.status === 401) {
        const data = await res.json().catch(() => ({}))
        if (data?.authUrl) {
          window.location.href = data.authUrl
          return
        }
        showError('Gmail not connected')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showError(data?.message || data?.error || 'Import failed')
        return
      }
      const data = await res.json()
      showSuccess(`Imported ${data.inserted} flights (${data.skipped_duplicates} duplicates skipped)`) 
      setIsDialogOpen(false)
      await refetch()
    } catch (e) {
      showError('Import error')
    } finally {
      setIsImportingSelected(false)
    }
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

  // Bulk import from Gmail (Ryanair itineraries)
  const [isImporting, setIsImporting] = useState(false)
  const importFromGmail = async () => {
    setIsImporting(true)
    try {
      const res = await fetch('/api/gmail/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: gmailStart, end: gmailEnd }),
      })
      if (res.status === 401) {
        const data = await res.json().catch(() => ({}))
        if (data?.authUrl) {
          window.location.href = data.authUrl
          return
        }
        showError('Gmail not connected')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showError(data?.message || data?.error || 'Import failed')
        return
      }
      const data = await res.json()
      showSuccess(`Imported ${data.inserted} flights (${data.skipped_duplicates} duplicates skipped)`) 
      await refetch()
    } catch (e) {
      showError('Import error')
    } finally {
      setIsImporting(false)
    }
  }

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
    } catch {}
  }

  const airlines = useMemo(
    () => Array.from(new Set(flights.map((f) => f.airline).filter(Boolean))) as string[],
    [flights]
  )

  const filteredFlights = useMemo(() => {
    return flights.filter((flight) => {
      const matchesSearch =
        flight.departure_airport.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flight.arrival_airport.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flight.departure_iata?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flight.arrival_iata?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (flight.airline || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        flight.flight_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flight.passenger_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flight.reservation_number.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesAirline = airline === "all" || airline === "" || flight.airline === airline

      let matchesDateRange = true
      if (dateRange?.from || dateRange?.to) {
        const flightDate = new Date(flight.departure_date)
        if (dateRange.from && dateRange.to) {
          matchesDateRange = isWithinInterval(flightDate, { start: dateRange.from, end: dateRange.to })
        } else if (dateRange.from) {
          matchesDateRange = isSameDay(flightDate, dateRange.from)
        }
      }

      let matchesPriceRange = true
      if (priceRange !== "all") {
        const price = parseFloat(flight.total_receipt.replace(/[^0-9.]/g, ""))
        switch (priceRange) {
          case "under100":
            matchesPriceRange = price < 100
            break
          case "100to500":
            matchesPriceRange = price >= 100 && price <= 500
            break
          case "500to1000":
            matchesPriceRange = price >= 500 && price <= 1000
            break
          case "over1000":
            matchesPriceRange = price > 1000
            break
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

      return matchesSearch && matchesAirline && matchesDateRange && matchesPriceRange && matchesTripType
    })
  }, [flights, searchTerm, airline, dateRange, priceRange, tripType])

  const sortedFlights = useMemo(() => {
    return [...filteredFlights].sort((a, b) => {
      switch (sortBy) {
        case "date":
          const dateA = new Date(a.departure_date)
          const dateB = new Date(b.departure_date)
          return sortOrder === "desc" ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime()
        case "price":
          const priceA = parseFloat(a.total_receipt.replace(/[^0-9.]/g, ""))
          const priceB = parseFloat(b.total_receipt.replace(/[^0-9.]/g, ""))
          return sortOrder === "desc" ? priceB - priceA : priceA - priceB
        case "airline":
          const airlineA = a.airline || ""
          const airlineB = b.airline || ""
          return sortOrder === "desc" ? airlineB.localeCompare(airlineA) : airlineA.localeCompare(airlineB)
        default:
          return 0
      }
    })
  }, [filteredFlights, sortBy, sortOrder])

  const totalPages = Math.ceil(sortedFlights.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentFlights = sortedFlights.slice(startIndex, endIndex)

  const canGoPrevious = currentPage > 1
  const canGoNext = currentPage < totalPages

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
    <div className="container mx-auto p-4">
      {/* Import/Export actions */}
      <div className="flex justify-end gap-2 mb-4">
        <Button variant="outline" className="gap-2" onClick={() => setIsCsvDialogOpen(true)}>
          <Upload className="h-4 w-4" /> Import CSV
        </Button>
        <Button variant="outline" className="gap-2" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
        <Button variant="secondary" className="gap-2" onClick={openImportDialog} disabled={isLoadingPreview}>
          {isLoadingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Import from Gmail
        </Button>
      </div>

      {/* Counts section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="rounded-lg border border-border/50 p-4">
          <div className="text-sm text-muted-foreground">Total Flights</div>
          <div className="text-2xl font-semibold">{counts.total}</div>
        </div>
        <div className="rounded-lg border border-border/50 p-4">
          <div className="text-sm text-muted-foreground">Upcoming</div>
          <div className="text-2xl font-semibold">{counts.upcoming}</div>
        </div>
        <div className="rounded-lg border border-border/50 p-4">
          <div className="text-sm text-muted-foreground">Past</div>
          <div className="text-2xl font-semibold">{counts.past}</div>
        </div>
      </div>

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

      {/* CSV Import Dialog */}
      <CsvImportDialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen} onImported={async () => { await refetch() }} />

      {/* Mobile cards (simplified retained from previous code) */}
      <div className="grid grid-cols-1 gap-4 md:hidden mb-4">
        {currentFlights.map((flight) => (
          <div key={flight.id} className="rounded-lg border border-border/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={getAirlineLogo(flight.airline ?? null)} alt={flight.airline || "Airline"} className="h-6 w-6 rounded-full" />
                <div>
                  <div className="font-medium">{flight.flight_number}</div>
                  <div className="text-xs text-muted-foreground">{flight.airline || "Unknown"}</div>
                  <div className="text-xs text-muted-foreground truncate" title={flight.passenger_name} aria-label={`Passenger ${flight.passenger_name}`}>
                    {flight.passenger_name}
                  </div>
                </div>
              </div>
              <Badge variant={isUpcoming(flight.departure_date) ? "default" : "secondary"}>
                {isUpcoming(flight.departure_date) ? "Upcoming" : "Past"}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="font-medium">{flight.departure_airport}</div>
                <div className="text-xs text-muted-foreground">{format(new Date(flight.departure_date), "MMM d, yyyy", { locale: enUS })}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">{flight.arrival_airport}</div>
                <div className="text-xs text-muted-foreground">Seat {flight.seat || "-"}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Badge variant="outline" className="w-fit bg-muted/30 text-foreground text-xs">{flight.reservation_number}</Badge>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/flights/${flight.id}`) }}>View <ArrowRight className="h-3 w-3 ml-1" /></Button>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/flights/${flight.id}/edit`) }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setFlightToDelete(flight) }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>

        ))}
      </div>

      {/* Desktop table */}
      <FlightsTable
        loading={isFetching}
        flights={currentFlights}
        onEdit={(f) => { logEvent("open_flight_edit", { id: f.id, source: "table_edit" }); router.push(`/flights/${f.id}/edit`) }}
        onDeleteRequest={(f) => setFlightToDelete(f)}
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
        totalItems={sortedFlights.length}
      />

      <DeleteFlightDialog
        open={!!flightToDelete}
        flight={flightToDelete}
        onOpenChange={(open) => { if (!open) setFlightToDelete(null) }}
        onConfirm={() => flightToDelete && handleDelete(flightToDelete)}
        isDeleting={isDeleting}
      />

      {/* Gmail selection dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl w-[95vw] sm:w-[90vw] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Import from Gmail</DialogTitle>
            <DialogDescription>
              Preview Ryanair itineraries received in your Gmail. Select a date range below (Last 30 or Last 90 days) to fetch emails.
            </DialogDescription>
          </DialogHeader>

          {/* Quick actions */}
          <div className="mb-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date()
                  const endISO = d.toISOString().slice(0,10)
                  const dStart = new Date(d)
                  dStart.setUTCDate(dStart.getUTCDate() - 30)
                  const startISO = dStart.toISOString().slice(0,10)
                  setGmailStart(startISO)
                  setGmailEnd(endISO)
                  void loadPreview({ start: startISO, end: endISO })
                }}
                disabled={isLoadingPreview}
              >
                Last 30 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date()
                  const endISO = d.toISOString().slice(0,10)
                  const dStart = new Date(d)
                  dStart.setUTCDate(dStart.getUTCDate() - 90)
                  const startISO = dStart.toISOString().slice(0,10)
                  setGmailStart(startISO)
                  setGmailEnd(endISO)
                  void loadPreview({ start: startISO, end: endISO })
                }}
                disabled={isLoadingPreview}
              >
                Last 90 days
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {filteredGmailItems.length} found · {Array.from(selectedIds).length} selected
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
                <Button variant="ghost" size="sm" onClick={clearAll}>Clear</Button>
              </div>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
                  <tr className="text-xs uppercase text-muted-foreground tracking-wide">
                    <th className="text-left p-3 w-12">Select</th>
                    <th className="text-left p-3 w-24">Date</th>
                    <th className="text-left p-3 w-32">Passenger</th>
                    <th className="text-left p-3 w-28">Reservation</th>
                    <th className="text-left p-3 w-48">Flight Details</th>
                    <th className="text-left p-3 w-36">Departure</th>
                    <th className="text-left p-3 w-36">Arrival</th>
                    <th className="text-left p-3 w-20">Duration</th>
                    <th className="text-left p-3 w-32">Purchase</th>
                    <th className="text-left p-3 w-32">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredGmailItems.map((item, index) => {
                    const p = item.parsed || {}
                    const depAirport = p.departure_airport || p.departure_iata || '—'
                    const arrAirport = p.arrival_airport || p.arrival_iata || '—'
                    const depDate = p.departure_date ? new Date(p.departure_date) : null
                    const depDateStr = depDate ? format(depDate, 'MMM d', { locale: enUS }) : '—'
                    const depTimeRaw = p.departure_time || ''
                    const arrTimeRaw = p.arrival_time || ''
                    const depTime = depTimeRaw ? (formatTimeToHHMM(depTimeRaw) || depTimeRaw || '—') : '—'
                    const arrTime = arrTimeRaw ? (formatTimeToHHMM(arrTimeRaw) || arrTimeRaw || '—') : '—'
                    const duration = depTimeRaw && arrTimeRaw ? (calculateDuration(depTimeRaw, arrTimeRaw) || '—') : '—'
                    const purchaseDateStr = p.purchased_date ? format(new Date(p.purchased_date), 'MMM d', { locale: enUS }) : '—'
                    const purchaseTimeStr = p.purchase_time ? formatTimeToHHMM(p.purchase_time) : ''
                    const purchase = purchaseTimeStr ? `${purchaseDateStr} ${purchaseTimeStr}` : purchaseDateStr
                    const receipt = p.total_receipt ? ` · ${p.total_receipt}` : ''
                    const receivedStr = item.received_at ? format(new Date(item.received_at), 'MMM d HH:mm', { locale: enUS }) : '—'
                    const disabled = !!item.duplicate
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${disabled ? 'opacity-60' : 'hover:bg-accent/5'} ${index % 2 === 0 ? 'bg-background/30' : 'bg-background/10'}`}
                      >
                        <td className="p-3">
                          <Checkbox
                            checked={selectedIds.has(item.id)}
                            onCheckedChange={() => toggleSelect(item.id)}
                          />
                        </td>
                        <td className="p-3 text-sm font-mono tabular-nums">{depDateStr}</td>
                        <td className="p-3 text-sm truncate max-w-32">{p.passenger_name || '—'}</td>
                        <td className="p-3 text-sm">
                          <Badge variant="outline" className="bg-muted/30 text-foreground text-xs font-mono">{p.reservation_number || '—'}</Badge>
                        </td>
                        <td className="p-3 text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            {(() => {
                              const logo = getAirlineLogo(p.airline || '')
                              return logo ? <img src={logo} alt="logo" className="h-4 w-4 rounded-sm flex-shrink-0" /> : null
                            })()}
                            <span className="font-mono font-semibold">{p.flight_number || 'Unknown'}</span>
                            <span className="text-muted-foreground">·</span>
                            <span className="truncate text-xs">{p.airline || 'Ryanair'}</span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{item.subject}</div>
                          {disabled && (
                            <Badge
                              variant="secondary"
                              className="mt-1 bg-red-500/15 text-red-400 border border-red-500/30 text-xs"
                            >
                              Duplicate
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-sm">
                          <div className="space-y-1">
                            {p.departure_iata && (
                              <div className="inline-flex items-center rounded bg-blue-500/20 text-blue-400 px-2 py-1 text-xs font-bold border border-blue-500/30">
                                {p.departure_iata}
                              </div>
                            )}
                            <div className="font-medium text-sm truncate">{depAirport}</div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12,6 12,12 16,14"/>
                              </svg>
                              <span className="font-mono">{depTime}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-sm">
                          <div className="space-y-1">
                            {p.arrival_iata && (
                              <div className="inline-flex items-center rounded bg-green-500/20 text-green-400 px-2 py-1 text-xs font-bold border border-green-500/30">
                                {p.arrival_iata}
                              </div>
                            )}
                            <div className="font-medium text-sm truncate">{arrAirport}</div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12,6 12,12 16,14"/>
                              </svg>
                              <span className="font-mono">{arrTime}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-sm">
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <svg className="h-3 w-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12,6 12,12 16,14"/>
                            </svg>
                            <span className="font-mono tabular-nums">{duration}</span>
                          </div>
                        </td>
                        <td className="p-3 text-sm truncate max-w-32">{purchase}{receipt}</td>
                        <td className="p-3 text-sm font-mono tabular-nums">{receivedStr}</td>
                      </tr>
                    )
                  })}
                  {gmailItems.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-sm text-muted-foreground">
                        No matching Ryanair emails found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={importSelected} disabled={isImportingSelected || selectedIds.size === 0}>
              {isImportingSelected ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Import Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

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
import { ArrowRight, Pencil, Trash2, Mail, Loader2, Upload, Download, Settings, ChevronDown, Search, RotateCcw } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { PaginationControls } from "@/app/flights/components/PaginationControls"
import { FiltersPanel } from "@/app/flights/components/FiltersPanel"
import { FlightsTable } from "@/app/flights/components/FlightsTable"
import { DeleteFlightDialog } from "@/app/flights/components/DeleteFlightDialog"
import { CsvImportDialog } from "@/app/flights/components/CsvImportDialog"
import { CsvExportDialog } from "@/app/flights/components/CsvExportDialog"
import { Flightradar24ExportDialog } from "@/app/flights/components/Flightradar24ExportDialog"
import { ImportProgressIndicator } from "@/app/flights/components/ImportProgressIndicator"
import { PreviewProgressIndicator } from "@/app/flights/components/PreviewProgressIndicator"
import { ModernSpinner } from "@/app/flights/components/ModernSpinner"
import { EnhancedGmailImport } from "@/components/EnhancedGmailImport"
import { LiveSearchDrawer } from "@/components/live-search/LiveSearchDrawer"
import { NextTripCard } from "@/components/next-trip/NextTripCard"
import { defaultSearchDate } from "@/components/live-search/mapOfferToFlight"
import { format } from "date-fns"
import { formatTimeToHHMM, calculateDuration, getAirlineLogo } from "@/app/flights/lib/flight-utils"
import { SearchBar } from "@/app/flights/components/SearchBar"
import { Plane } from "lucide-react"
import type { Flight } from "@/types/flight"


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

  // Gmail preview and selection dialog state
  type GmailPreviewItem = {
    id: string
    subject: string
    received_at?: string
    duplicate?: boolean
    key?: string
    parsed: any
  }
  // Gmail import state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [gmailItems, setGmailItems] = useState<GmailPreviewItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isImportingSelected, setIsImportingSelected] = useState(false)
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


  // Enhanced loading states
  const [importProgress, setImportProgress] = useState<{
    step: string
    current: number
    total: number
    message: string
  } | null>(null)
  const [previewProgress, setPreviewProgress] = useState<{
    step: string
    message: string
  } | null>(null)
  const [loadingButton, setLoadingButton] = useState<'30days' | '90days' | 'next60days' | 'next90days' | null>(null)

  // Gmail date range (YYYY-MM-DD)
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const defaultStartISO = useMemo(() => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 30)
    return d.toISOString().slice(0, 10)
  }, [])
  const [gmailStart, setGmailStart] = useState<string>(defaultStartISO)
  const [gmailEnd, setGmailEnd] = useState<string>(todayISO)
  // Use all items returned from backend (already filtered by departure date)
  const filteredGmailItems = gmailItems

  // When list changes, preselect all (user can adjust afterwards)
  // This mirrors the old behavior of preselecting non-duplicates
  // but now includes all items returned from backend.
  useEffect(() => {
    setSelectedIds(new Set(gmailItems.map(i => i.id)))
  }, [gmailItems])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(gmailItems.map(i => i.id)))
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

  const loadPreview = async (override?: { start?: string; end?: string }, buttonId?: '30days' | '90days' | 'next60days' | 'next90days') => {
    setIsLoadingPreview(true)
    setLoadingButton(buttonId || null)
    setPreviewProgress({ step: 'connecting', message: 'Connecting to Gmail...' })

    try {
      const params = new URLSearchParams()
      const startQ = override?.start ?? gmailStart
      const endQ = override?.end ?? gmailEnd
      if (startQ) params.set('start', startQ)
      if (endQ) params.set('end', endQ)

      setPreviewProgress({ step: 'searching', message: 'Searching for Ryanair emails...' })
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

      setPreviewProgress({ step: 'processing', message: 'Processing flight data...' })
      const data = await res.json()
      const items: GmailPreviewItem[] = data.items || []

      setPreviewProgress({ step: 'complete', message: `Found ${items.length} flight emails` })
      setGmailItems(items)
      setSelectedIds(new Set(items.filter(i => !i.duplicate).map(i => i.id)))

      // Clear progress after a short delay
      setTimeout(() => setPreviewProgress(null), 3000)

    } catch (e) {
      showError('Failed to load Gmail previews')
    } finally {
      setIsLoadingPreview(false)
      setLoadingButton(null)
      setPreviewProgress(null)
    }
  }

  // Helpers for month range selection (UTC-safe to avoid TZ drift)
  const toISO = (d: Date) => d.toISOString().slice(0, 10)
  const getMonthRangeISO = (year: number, monthZeroBased: number) => {
    const start = new Date(Date.UTC(year, monthZeroBased, 1))
    const end = new Date(Date.UTC(year, monthZeroBased + 1, 0))
    return { startISO: toISO(start), endISO: toISO(end) }
  }
  const setMonthRangeAndLoad = (year: number, monthZeroBased: number, buttonId?: '30days' | '90days') => {
    const { startISO, endISO } = getMonthRangeISO(year, monthZeroBased)
    setGmailStart(startISO)
    setGmailEnd(endISO)
    void loadPreview({ start: startISO, end: endISO }, buttonId)
  }

  const importSelected = async () => {
    if (!selectedIds.size) {
      showError('Select at least one flight to import')
      return
    }
    setIsImportingSelected(true)
    setImportProgress({
      step: 'preparing',
      current: 0,
      total: selectedIds.size,
      message: 'Preparing to import flights...'
    })

    try {
      const ids = Array.from(selectedIds)

      setImportProgress({
        step: 'connecting',
        current: 0,
        total: ids.length,
        message: 'Connecting to Gmail...'
      })

      const res = await fetch('/api/gmail/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
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

      setImportProgress({
        step: 'processing',
        current: ids.length,
        total: ids.length,
        message: 'Processing imported flights...'
      })

      const data = await res.json()

      setImportProgress({
        step: 'complete',
        current: ids.length,
        total: ids.length,
        message: `Successfully imported ${data.inserted} flights`
      })

      showSuccess(`Imported ${data.inserted} flights (${data.skipped_duplicates} duplicates skipped)`)
      setIsDialogOpen(false)
      await refetch()

      // Clear progress after a short delay
      setTimeout(() => setImportProgress(null), 3000)

    } catch (e) {
      showError('Import error')
    } finally {
      setIsImportingSelected(false)
      setImportProgress(null)
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
  const [showEnhancedGmailImport, setShowEnhancedGmailImport] = useState(false)
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
    } catch { }
  }

  const airlines = useMemo(() => {
    const set = new Set<string>()
    for (const f of flights) {
      if (f.airline && f.airline.trim() !== "") set.add(f.airline)
    }
    // If any flight has missing airline, add an explicit 'Unknown' option
    const hasUnknown = flights.some((f) => !f.airline || f.airline.trim() === "")
    // Remove any literal 'Unknown' already present (case-insensitive) to avoid duplicates
    const list = (Array.from(set) as string[]).filter(
      (a) => a.trim().toLowerCase() !== "unknown"
    )
    return hasUnknown ? ["Unknown", ...list] : list
  }, [flights])

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

      const matchesAirline = (
        airline === "all" ||
        airline === "" ||
        (airline === "Unknown" ? (!flight.airline || flight.airline.trim() === "") : flight.airline === airline)
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
      <div className="relative mb-8">
        <div className="absolute -left-12 -top-12 h-56 w-56 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-300">
              Your Flight Deck
            </h1>
            <p className="text-muted-foreground">Manage, track, and analyze your flight history.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              className="gap-2 bg-sky-600 text-white hover:bg-sky-500"
              onClick={() => openLiveSearch()}
            >
              <Search className="h-4 w-4" />
              Search flights
            </Button>
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Settings className="h-4 w-4" />
                Tools
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setIsCsvDialogOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Import CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsCsvExportDialogOpen(true)} className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsFlightradar24ExportDialogOpen(true)} className="gap-2">
                <Plane className="h-4 w-4 text-orange-500" />
                Export for Flightradar24
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={openImportDialog}
                className="gap-2"
              >
                {isLoadingPreview ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Import from Gmail (Legacy)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowEnhancedGmailImport(true)}
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                Enhanced Gmail Import ✨
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <NextTripCard
        className="mb-6"
        onExplore={({ from, to, date }) => openLiveSearch({ from, to, date })}
      />

      {/* Counts section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Flights" value={counts.total} />
        <StatCard title="Upcoming" value={counts.upcoming} />
        <StatCard title="Past" value={counts.past} />
      </div>

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

      {/* CSV Import Dialog */}
      <CsvImportDialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen} onImported={async () => { await refetch() }} />

      {/* CSV Export Dialog */}
      <CsvExportDialog open={isCsvExportDialogOpen} onOpenChange={setIsCsvExportDialogOpen} flights={flights} />
      <Flightradar24ExportDialog open={isFlightradar24ExportDialogOpen} onOpenChange={setIsFlightradar24ExportDialogOpen} flights={flights} />

      {/* Mobile cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden mb-4">
        {currentFlights.map((flight) => (
          <FlightCard
            key={flight.id}
            flight={flight}
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
        flights={currentFlights}
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
              Preview Ryanair itineraries from your Gmail. Select a date range below - past flights (Last 30/90 days) or future flights (Next 60/90 days).
            </DialogDescription>
          </DialogHeader>

          {/* Quick actions */}
          <div className="mb-3 space-y-3">
            {/* Preview Progress Indicator */}
            <PreviewProgressIndicator
              progress={previewProgress}
              isVisible={isLoadingPreview}
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date()
                  const endISO = d.toISOString().slice(0, 10)
                  const dStart = new Date(d)
                  dStart.setUTCDate(dStart.getUTCDate() - 30)
                  const startISO = dStart.toISOString().slice(0, 10)
                  setGmailStart(startISO)
                  setGmailEnd(endISO)
                  void loadPreview({ start: startISO, end: endISO }, '30days')
                }}
                disabled={loadingButton === '30days'}
              >
                {loadingButton === '30days' ? (
                  <>
                    <ModernSpinner size="sm" className="mr-2" />
                    Loading...
                  </>
                ) : (
                  'Last 30 days'
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date()
                  const endISO = d.toISOString().slice(0, 10)
                  const dStart = new Date(d)
                  dStart.setUTCDate(dStart.getUTCDate() - 90)
                  const startISO = dStart.toISOString().slice(0, 10)
                  setGmailStart(startISO)
                  setGmailEnd(endISO)
                  void loadPreview({ start: startISO, end: endISO }, '90days')
                }}
                disabled={loadingButton === '90days'}
              >
                {loadingButton === '90days' ? (
                  <>
                    <ModernSpinner size="sm" className="mr-2" />
                    Loading...
                  </>
                ) : (
                  'Last 90 days'
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date()
                  const startISO = d.toISOString().slice(0, 10)
                  const dEnd = new Date(d)
                  dEnd.setUTCDate(dEnd.getUTCDate() + 60)
                  const endISO = dEnd.toISOString().slice(0, 10)
                  setGmailStart(startISO)
                  setGmailEnd(endISO)
                  void loadPreview({ start: startISO, end: endISO }, 'next60days')
                }}
                disabled={loadingButton === 'next60days'}
              >
                {loadingButton === 'next60days' ? (
                  <>
                    <ModernSpinner size="sm" className="mr-2" />
                    Loading...
                  </>
                ) : (
                  'Next 60 days'
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date()
                  const startISO = d.toISOString().slice(0, 10)
                  const dEnd = new Date(d)
                  dEnd.setUTCDate(dEnd.getUTCDate() + 90)
                  const endISO = dEnd.toISOString().slice(0, 10)
                  setGmailStart(startISO)
                  setGmailEnd(endISO)
                  void loadPreview({ start: startISO, end: endISO }, 'next90days')
                }}
                disabled={loadingButton === 'next90days'}
              >
                {loadingButton === 'next90days' ? (
                  <>
                    <ModernSpinner size="sm" className="mr-2" />
                    Loading...
                  </>
                ) : (
                  'Next 90 days'
                )}
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {gmailItems.length} found · {Array.from(selectedIds).length} selected
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
                  {gmailItems.map((item, index) => {
                    const p = item.parsed || {}
                    console.log('FlightsClient - Item parsed data:', {
                      departure_date: p.departure_date,
                      purchased_date: p.purchased_date,
                      received_at: item.received_at,
                      flight_number: p.flight_number
                    })
                    const depAirport = p.departure_airport || p.departure_iata || '—'
                    const arrAirport = p.arrival_airport || p.arrival_iata || '—'
                    const depDate = p.departure_date ? new Date(p.departure_date) : null
                    const depDateStr = depDate ? format(depDate, 'MMM d', { locale: enUS }) : '—'
                    const depTimeRaw = p.departure_time || ''
                    const arrTimeRaw = p.arrival_time || ''
                    const depTime = depTimeRaw ? (formatTimeToHHMM(depTimeRaw) || depTimeRaw || '—') : '—'
                    const arrTime = arrTimeRaw ? (formatTimeToHHMM(arrTimeRaw) || arrTimeRaw || '—') : '—'
                    const duration = (depTimeRaw && arrTimeRaw ? (
                      calculateDuration(
                        depTimeRaw,
                        arrTimeRaw,
                        {
                          departureDate: p.departure_date,
                          arrivalDate: p.arrival_date,
                          departureIata: p.departure_iata || p.departure_airport,
                          arrivalIata: p.arrival_iata || p.arrival_airport,
                          departureAirportName: p.departure_airport,
                          arrivalAirportName: p.arrival_airport,
                        }
                      ) || p.flight_duration || '—'
                    ) : (p.flight_duration || '—'))
                    // Use purchased_date if available, otherwise fall back to received date
                    const purchaseDate = p.purchased_date ? new Date(p.purchased_date) : (item.received_at ? new Date(item.received_at) : null)
                    const purchaseDateStr = purchaseDate ? format(purchaseDate, 'MMM d', { locale: enUS }) : '—'
                    const purchaseTimeStr = p.purchase_time ? formatTimeToHHMM(p.purchase_time) : (purchaseDate ? format(purchaseDate, 'HH:mm') : '')
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
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12,6 12,12 16,14" />
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
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12,6 12,12 16,14" />
                              </svg>
                              <span className="font-mono">{arrTime}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-sm">
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <svg className="h-3 w-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12,6 12,12 16,14" />
                            </svg>
                            <span className="font-mono tabular-nums">{duration}</span>
                          </div>
                        </td>
                        <td className="p-3 text-sm truncate max-w-32">{purchase}{receipt}</td>
                        <td className="p-3 text-sm font-mono tabular-nums">{receivedStr}</td>
                      </tr>
                    )
                  })}
                  {gmailItems.length === 0 && !isLoadingPreview && (
                    <tr>
                      <td colSpan={10} className="p-8 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Mail className="h-12 w-12 text-muted-foreground/50" />
                          <div className="text-sm text-muted-foreground font-medium">
                            No matching Ryanair emails found.
                          </div>
                          <div className="text-xs text-muted-foreground/70 max-w-md">
                            <p className="mb-2">This could mean:</p>
                            <ul className="text-left list-disc list-inside space-y-1">
                              <li>No booking confirmations in the selected date range</li>
                              <li>Gmail might not be properly connected</li>
                              <li>The email search didn&apos;t find relevant messages</li>
                            </ul>
                            <p className="mt-3 text-center">
                              Try selecting a different date range or check your Gmail connection.
                            </p>
                          </div>
                        </div>
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
              {isImportingSelected ? (
                <>
                  <ModernSpinner size="sm" className="mr-2" />
                  Importing...
                </>
              ) : (
                `Import Selected (${selectedIds.size})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Gmail Import Dialog */}
      {showEnhancedGmailImport && (
        <Dialog open={showEnhancedGmailImport} onOpenChange={setShowEnhancedGmailImport}>
          <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enhanced Gmail Import with Future Flights</DialogTitle>
              <DialogDescription>
                Import flight bookings from Gmail with advanced reliability features and future flight support.
              </DialogDescription>
            </DialogHeader>
            <EnhancedGmailImport />
          </DialogContent>
        </Dialog>
      )}

      {/* Import Progress Indicator */}

      <LiveSearchDrawer
        open={liveSearchOpen}
        onOpenChange={setLiveSearchOpen}
        initialFrom={liveSearchInitial.from}
        initialTo={liveSearchInitial.to}
        initialDate={liveSearchInitial.date}
        onPlannedAdded={async () => { await originalRefetch() }}
      />
      <ImportProgressIndicator
        progress={importProgress}
        isVisible={isImportingSelected}
      />
    </div>
  )
}

interface StatCardProps {
  title: string;
  value: number | string;
}

const StatCard = ({ title, value }: StatCardProps) => (
  <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-lg backdrop-blur-sm">
    <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-primary/10 blur-2xl" />
    <p className="text-sm text-muted-foreground">{title}</p>
    <p className="text-3xl font-bold text-zinc-50">{value}</p>
  </div>
);

interface FlightCardProps {
  flight: Flight;
  onRowClick: (flight: Flight) => void;
  onEdit: (flight: Flight) => void;
  onDeleteRequest: (flight: Flight) => void;
  onFlyAgain: (flight: Flight) => void;
  isUpcoming: (date: string) => boolean;
}

const FlightCard: React.FC<FlightCardProps> = ({ flight, onRowClick, onEdit, onDeleteRequest, onFlyAgain, isUpcoming }) => (
  <div
    className="relative rounded-xl border border-zinc-800 bg-zinc-950/30 backdrop-blur-sm p-4 transition-all duration-300 hover:border-zinc-700 cursor-pointer"
    onClick={() => onRowClick(flight)}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-md overflow-hidden flex items-center justify-center bg-zinc-800/50">
          <img
            src={getAirlineLogo(flight.airline ?? null, flight.flight_number)}
            alt={flight.airline || "Airline"}
            className="w-7 h-7 object-contain"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              const fallbackIcon = target.parentElement?.querySelector('.fallback-icon') as HTMLElement;
              if (fallbackIcon) {
                fallbackIcon.style.display = 'flex';
              }
            }}
          />
          <div className="fallback-icon items-center justify-center" style={{ display: 'none' }}>
            <Plane className="h-5 w-5 text-zinc-500" />
          </div>
        </div>
        <div>
          <p className="font-semibold text-zinc-100">{flight.departure_iata} → {flight.arrival_iata}</p>
          <p className="text-xs text-zinc-400">{flight.airline} • {flight.flight_number}</p>
        </div>
      </div>
      <Badge
        variant="outline"
        className={`text-xs ${isUpcoming(flight.departure_date)
          ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
          : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}
      >
        {isUpcoming(flight.departure_date) ? "Upcoming" : "Past"}
      </Badge>
    </div>
    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
      <div>
        <p className="text-zinc-400 text-xs">Departure</p>
        <p className="text-zinc-100 font-medium">{format(new Date(flight.departure_date), "MMM d, yyyy")}</p>
        <p className="text-zinc-300">{formatTimeToHHMM(flight.departure_time)}</p>
      </div>
      <div className="text-right">
        <p className="text-zinc-400 text-xs">Arrival</p>
        <p className="text-zinc-100 font-medium">{flight.arrival_date ? format(new Date(flight.arrival_date), "MMM d, yyyy") : "-"}</p>
        <p className="text-zinc-300">{formatTimeToHHMM(flight.arrival_time)}</p>
      </div>
    </div>
    <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
      <p className="text-xs text-zinc-500">Confirmation: {flight.reservation_number}</p>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" title="Fly it again" className="h-8 w-8 rounded-full bg-zinc-800/50 hover:bg-sky-500/20 text-zinc-300 hover:text-sky-300" onClick={(e) => { e.stopPropagation(); onFlyAgain(flight); }}><RotateCcw className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-white" onClick={(e) => { e.stopPropagation(); onEdit(flight); }}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-zinc-800/50 hover:bg-destructive/10 text-zinc-300 hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDeleteRequest(flight); }}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  </div>
);

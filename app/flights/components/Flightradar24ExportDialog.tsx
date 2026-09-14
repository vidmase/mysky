"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Download, Plane, ExternalLink } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"

import type { Flight } from "@/app/flights/lib/types"

interface Flightradar24ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  flights: Flight[]
}

type AirportCodeFormat = "iata" | "icao" | "both"

export function Flightradar24ExportDialog({ open, onOpenChange, flights }: Flightradar24ExportDialogProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [airportCodeFormat, setAirportCodeFormat] = useState<AirportCodeFormat>("iata")
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    
    try {
      // Filter flights by date range if selected
      let filteredFlights = flights
      if (dateRange?.from || dateRange?.to) {
        filteredFlights = flights.filter((flight) => {
          const flightDate = new Date(flight.departure_date)
          if (dateRange.from && flightDate < dateRange.from) return false
          if (dateRange.to && flightDate > dateRange.to) return false
          return true
        })
      }

      // Flightradar24 format: Date, Flight, Origin, Destination
      // Date must be YYYY-MM-DD
      // Origin/Destination can be IATA, ICAO, or both (LHR/EGLL)
      const headers = ["Date", "Flight", "Origin", "Destination"]

      const formatAirportCode = (iata: string | undefined, icao?: string): string => {
        const iataCode = iata || ""
        const icaoCode = icao || ""
        
        switch (airportCodeFormat) {
          case "iata":
            return iataCode || icaoCode
          case "icao":
            return icaoCode || iataCode
          case "both":
            if (iataCode && icaoCode) {
              return `${iataCode}/${icaoCode}`
            }
            return iataCode || icaoCode
          default:
            return iataCode || icaoCode
        }
      }

      // Generate CSV content
      const csvContent = [
        headers.join(","),
        ...filteredFlights.map(flight => {
          const date = flight.departure_date 
            ? format(new Date(flight.departure_date), "yyyy-MM-dd")
            : ""
          const flightNumber = flight.flight_number || ""
          const origin = formatAirportCode(flight.departure_iata, (flight as any).departure_icao)
          const destination = formatAirportCode(flight.arrival_iata, (flight as any).arrival_icao)
          
          return [date, flightNumber, origin, destination]
            .map(value => {
              // Escape commas and quotes in CSV values
              if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`
              }
              return value
            })
            .join(",")
        })
      ].join("\n")

      // Create and download file with UTF-8 BOM for Excel compatibility
      const BOM = "\uFEFF"
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      
      // Generate filename
      let filename = "flightradar24_import"
      if (dateRange?.from && dateRange?.to) {
        const fromStr = format(dateRange.from, "yyyy-MM-dd")
        const toStr = format(dateRange.to, "yyyy-MM-dd")
        filename += `_${fromStr}_to_${toStr}`
      }
      filename += ".csv"
      
      link.setAttribute("download", filename)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      onOpenChange(false)
      
    } catch (error) {
      console.error("Export failed:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const filteredCount = dateRange?.from || dateRange?.to 
    ? flights.filter((flight) => {
        const flightDate = new Date(flight.departure_date)
        if (dateRange.from && flightDate < dateRange.from) return false
        if (dateRange.to && flightDate > dateRange.to) return false
        return true
      }).length
    : flights.length

  // Count flights with valid required fields
  const validFlightsCount = flights.filter(f => 
    f.departure_date && f.departure_iata && f.arrival_iata
  ).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-[var(--brass)]" />
            Export for Flightradar24
          </DialogTitle>
          <DialogDescription>
            Export your flights in a format compatible with{" "}
            <a 
              href="https://my.flightradar24.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[var(--brass)] hover:underline inline-flex items-center gap-1"
            >
              my.flightradar24.com
              <ExternalLink className="h-3 w-3" />
            </a>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Info */}
          <div className="rounded-lg border border-[color-mix(in_srgb,var(--brass)_20%,transparent)] bg-[var(--wash-brass)] p-4">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="border-[color-mix(in_srgb,var(--brass)_50%,transparent)] text-[var(--brass)] shrink-0">
                FR24 Format
              </Badge>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Required columns:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li><code className="text-xs bg-muted px-1 rounded">Date</code> – YYYY-MM-DD format</li>
                  <li><code className="text-xs bg-muted px-1 rounded">Origin</code> – Airport code (IATA/ICAO)</li>
                  <li><code className="text-xs bg-muted px-1 rounded">Destination</code> – Airport code (IATA/ICAO)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="space-y-2">
            <Label>Date Range (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} –{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>All flights</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <p className="text-sm text-muted-foreground">
              {filteredCount} flight{filteredCount !== 1 ? "s" : ""} will be exported
              {validFlightsCount < flights.length && (
                <span className="text-[var(--brass)] ml-1">
                  ({flights.length - validFlightsCount} missing required fields)
                </span>
              )}
            </p>
          </div>

          {/* Airport Code Format */}
          <div className="space-y-3">
            <Label>Airport Code Format</Label>
            <RadioGroup
              value={airportCodeFormat}
              onValueChange={(value) => setAirportCodeFormat(value as AirportCodeFormat)}
              className="grid grid-cols-3 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="iata" id="iata" />
                <Label htmlFor="iata" className="text-sm font-normal cursor-pointer">
                  IATA <span className="text-muted-foreground">(LHR)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="icao" id="icao" />
                <Label htmlFor="icao" className="text-sm font-normal cursor-pointer">
                  ICAO <span className="text-muted-foreground">(EGLL)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both" className="text-sm font-normal cursor-pointer">
                  Both <span className="text-muted-foreground">(LHR/EGLL)</span>
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Flightradar24 accepts IATA, ICAO, or both formats
            </p>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>CSV Preview</Label>
            <div className="rounded-md border bg-muted/30 p-3 font-mono text-xs overflow-x-auto">
              <div className="text-muted-foreground">Date,Flight,Origin,Destination</div>
              {flights.slice(0, 3).map((flight, i) => {
                const date = flight.departure_date 
                  ? format(new Date(flight.departure_date), "yyyy-MM-dd")
                  : "—"
                const origin = flight.departure_iata || "—"
                const dest = flight.arrival_iata || "—"
                const flightNum = flight.flight_number || "—"
                return (
                  <div key={i} className="text-foreground">
                    {date},{flightNum},{origin},{dest}
                  </div>
                )
              })}
              {flights.length > 3 && (
                <div className="text-muted-foreground">... and {flights.length - 3} more</div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || filteredCount === 0}
            className="bg-[var(--brass)] hover:bg-[var(--ink-2)] text-[var(--paper)]"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exporting..." : `Export ${filteredCount} Flight${filteredCount !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


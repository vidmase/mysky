"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Download } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface Flight {
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

interface CsvExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  flights: Flight[]
}

export function CsvExportDialog({ open, onOpenChange, flights }: CsvExportDialogProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [includeAllFields, setIncludeAllFields] = useState(true)
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

      // Define CSV headers based on user selection
      const allHeaders = [
        'passenger_name',
        'reservation_number', 
        'flight_number',
        'departure_airport',
        'arrival_airport',
        'departure_date',
        'departure_time',
        'arrival_time',
        'total_receipt',
        'purchased_date',
        'purchase_time',
        'airline',
        'arrival_country',
        'arrival_iata',
        'departure_iata',
        'seat',
        'notes'
      ]

      const basicHeaders = [
        'passenger_name',
        'flight_number',
        'departure_airport',
        'arrival_airport',
        'departure_date',
        'departure_time',
        'arrival_time'
      ]

      const headers = includeAllFields ? allHeaders : basicHeaders

      // Generate CSV content
      const csvContent = [
        headers.join(','),
        ...filteredFlights.map(flight => 
          headers.map(header => {
            const value = flight[header as keyof Flight] || ''
            // Escape commas and quotes in CSV values
            return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
              ? `"${value.replace(/"/g, '""')}"` 
              : value
          }).join(',')
        )
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      
      // Generate filename with date range if specified
      let filename = 'flights'
      if (dateRange?.from && dateRange?.to) {
        const fromStr = format(dateRange.from, 'yyyy-MM-dd')
        const toStr = format(dateRange.to, 'yyyy-MM-dd')
        filename += `_${fromStr}_to_${toStr}`
      } else if (dateRange?.from) {
        filename += `_from_${format(dateRange.from, 'yyyy-MM-dd')}`
      } else if (dateRange?.to) {
        filename += `_until_${format(dateRange.to, 'yyyy-MM-dd')}`
      }
      filename += '.csv'
      
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Close dialog
      onOpenChange(false)
      
    } catch (error) {
      console.error('Export failed:', error)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Flights to CSV
          </DialogTitle>
          <DialogDescription>
            Choose a date range and export options for your flight data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
                        {format(dateRange.from, "LLL dd, y")} -{" "}
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
              {filteredCount} flight{filteredCount !== 1 ? 's' : ''} will be exported
            </p>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <Label>Export Options</Label>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-all-fields" 
                checked={includeAllFields}
                onCheckedChange={(checked) => setIncludeAllFields(checked === true)}
              />
              <Label htmlFor="include-all-fields" className="text-sm font-normal">
                Include all fields (airline, seat, notes, etc.)
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              {includeAllFields 
                ? "Export will include all available flight data fields"
                : "Export will include only basic flight information"
              }
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || filteredCount === 0}>
            {isExporting ? "Exporting..." : `Export ${filteredCount} Flight${filteredCount !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

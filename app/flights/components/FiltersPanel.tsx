"use client"

import { useEffect, useState } from "react"
import { addDays, subDays, startOfMonth, endOfMonth } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Calendar, ChevronRight, CreditCard, Plane, ArrowUpDown, ArrowDownUp, Building, X, ChevronDown } from "lucide-react"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"

export interface FiltersPanelProps {
  // Date range
  dateRange: DateRange | undefined
  setDateRange: (range: DateRange | undefined) => void
  initialDate: Date
  // Airline
  airline: string
  setAirline: (value: string) => void
  airlines: string[]
  // Price + currency
  priceRange: string
  setPriceRange: (value: string) => void
  selectedCurrency: string
  setSelectedCurrency: (value: any) => void
  currencies: string[]
  getPriceRangeLabel: (range: string) => string
  // Trip + sort
  tripType: string
  setTripType: (value: string) => void
  sortBy: string
  setSortBy: (value: string) => void
  sortOrder: string
  setSortOrder: (value: string) => void
}

export function FiltersPanel(props: FiltersPanelProps) {
  const {
    dateRange,
    setDateRange,
    initialDate,
    airline,
    setAirline,
    airlines,
    priceRange,
    setPriceRange,
    selectedCurrency,
    setSelectedCurrency,
    currencies,
    getPriceRangeLabel,
    tripType,
    setTripType,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
  } = props

  const [open, setOpen] = useState(true)
  // Responsive month count for the calendar so it fits on screen
  const [months, setMonths] = useState<number>(2)
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      setMonths(w >= 1024 ? 2 : 1) // 2 months on desktop, 1 month otherwise
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return (
    <Card className="border-t-4 border-t-flight">
      <CardContent className="pt-4">
        <Collapsible open={open} onOpenChange={setOpen}>
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium text-sm text-muted-foreground">Filters</div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                {open ? "Hide" : "Show"}
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : "rotate-0"}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-flight" />
                  Date Range
                </Label>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${!dateRange && "text-muted-foreground"}`}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {dateRange?.from ? (
                            dateRange.to ? (
                              <div className="flex-1 flex items-center gap-2">
                                <div className="flex flex-col">
                                  <span className="text-xs text-muted-foreground">From</span>
                                  <span className="font-medium">{format(dateRange.from, "MMM dd, yyyy", { locale: enUS })}</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="flex flex-col">
                                  <span className="text-xs text-muted-foreground">To</span>
                                  <span className="font-medium">{format(dateRange.to, "MMM dd, yyyy", { locale: enUS })}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Selected Date</span>
                                <span className="font-medium">{format(dateRange.from, "MMM dd, yyyy", { locale: enUS })}</span>
                              </div>
                            )
                          ) : (
                            <span>Select date range</span>
                          )}
                        </div>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="z-50 w-[95vw] max-w-[720px] max-h-[85vh] p-0 overflow-auto rounded-2xl shadow-2xl ring-1 ring-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur"
                      align="start"
                      side="bottom"
                      sideOffset={8}
                      collisionPadding={16}
                      avoidCollisions={false}
                    >
                      <div className="p-3">
                        <CalendarComponent
                          mode="range"
                          selected={dateRange}
                          onSelect={setDateRange}
                          numberOfMonths={months}
                          initialFocus
                          fromYear={2000}
                          toYear={2100}
                          locale={enUS as any}
                          className="rounded-xl border border-white/5 bg-transparent"
                          captionLayout="buttons"
                          showOutsideDays
                          classNames={{
                            caption_label: "text-base font-semibold",
                            nav_button: "h-8 w-8 rounded-full hover:bg-white/10 ring-1 ring-white/10",
                            day: "h-9 w-9 p-0 font-medium rounded-full hover:bg-white/10",
                            day_selected: "bg-flight text-white hover:bg-flight",
                            day_today: "ring-2 ring-flight/50",
                            day_range_start: "rounded-l-full",
                            day_range_end: "rounded-r-full",
                            day_range_middle: "bg-flight/20 text-white",
                            head_cell: "text-xs text-muted-foreground",
                            table: "w-full",
                          }}
                        />
                        <div className="mt-3 grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full"
                            onClick={() => {
                              const end = new Date()
                              const start = subDays(end, 6)
                              setDateRange({ from: start, to: end })
                            }}
                          >
                            Last 7 days
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full"
                            onClick={() => {
                              const end = new Date()
                              const start = subDays(end, 29)
                              setDateRange({ from: start, to: end })
                            }}
                          >
                            Last 30 days
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full"
                            onClick={() => {
                              const end = new Date()
                              const start = subDays(end, 89)
                              setDateRange({ from: start, to: end })
                            }}
                          >
                            Last 90 days
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full"
                            onClick={() => {
                              const now = new Date()
                              setDateRange({ from: startOfMonth(now), to: endOfMonth(now) })
                            }}
                          >
                            This month
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full"
                            onClick={() => setDateRange(undefined)}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {dateRange && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Clear"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setDateRange(undefined)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Airline */}
              <div className="space-y-2">
                <Label htmlFor="airline" className="flex items-center">
                  <Building className="h-4 w-4 mr-1 text-flight" />
                  Airline
                </Label>
                <Select value={airline} onValueChange={setAirline}>
                  <SelectTrigger id="airline" className="pl-9 relative">
                    <Building className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="All airlines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All airlines</SelectItem>
                    {airlines.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

          {/* Price + Currency */}
          <div className="space-y-2">
            <Label htmlFor="priceRange" className="flex items-center">
              <CreditCard className="h-4 w-4 mr-1 text-flight" />
              Price Range
            </Label>
            <div className="flex gap-2">
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger id="priceRange" className="pl-9 relative">
                  <CreditCard className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="All prices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All prices</SelectItem>
                  <SelectItem value="under100">{getPriceRangeLabel("under100")}</SelectItem>
                  <SelectItem value="100to500">{getPriceRangeLabel("100to500")}</SelectItem>
                  <SelectItem value="500to1000">{getPriceRangeLabel("500to1000")}</SelectItem>
                  <SelectItem value="over1000">{getPriceRangeLabel("over1000")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency as any}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Trip Type */}
          <div className="space-y-2">
            <Label htmlFor="tripType" className="flex items-center">
              <Plane className="h-4 w-4 mr-1 text-flight" />
              Trip Type
            </Label>
            <Select value={tripType} onValueChange={setTripType}>
              <SelectTrigger id="tripType" className="pl-9 relative">
                <Plane className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="All trips" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All trips</SelectItem>
                <SelectItem value="oneway">One-way</SelectItem>
                <SelectItem value="roundtrip">Round-trip</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <Label htmlFor="sortBy" className="flex items-center">
              <ArrowUpDown className="h-4 w-4 mr-1 text-flight" />
              Sort By
            </Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger id="sortBy" className="pl-9 relative">
                <ArrowUpDown className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="airline">Airline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <div className="space-y-2">
            <Label htmlFor="sortOrder" className="flex items-center">
              <ArrowDownUp className="h-4 w-4 mr-1 text-flight" />
              Sort Order
            </Label>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger id="sortOrder" className="pl-9 relative">
                <ArrowDownUp className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

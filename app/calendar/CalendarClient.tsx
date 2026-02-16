"use client"

import { useState, useMemo } from 'react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isToday,
  isAfter,
  isBefore,
  isWithinInterval,
  startOfDay,
  endOfDay
} from 'date-fns'
import { Flight } from '@/app/flights/FlightsClient'
import { CalendarFlightEvent } from '@/types/calendar'
import { transformFlightsToCalendarEvents, calculateCalendarStats } from '@/app/calendar/lib/calendar-utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  CalendarIcon, 
  PlaneIcon, 
  MapPinIcon, 
  ClockIcon, 
  ChevronLeft, 
  ChevronRight, 
  ListIcon, 
  LayoutGridIcon,
  MoreHorizontal
} from 'lucide-react'
import { FlightEventModal } from './components/FlightEventModal'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface CalendarClientProps {
  initialFlights: Flight[]
}

export function CalendarClient({ initialFlights }: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'agenda'>('month')
  const [selectedEvent, setSelectedEvent] = useState<CalendarFlightEvent | null>(null)

  // Transform flights to calendar events
  const calendarEvents = useMemo(() => {
    return transformFlightsToCalendarEvents(initialFlights)
  }, [initialFlights])

  // Calculate statistics
  const stats = useMemo(() => {
    return calculateCalendarStats(calendarEvents)
  }, [calendarEvents])

  // Calendar Grid Logic
  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

    return eachDayOfInterval({
      start: startDate,
      end: endDate
    })
  }, [currentDate])

  const weeks = daysInMonth.length / 7

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const goToToday = () => setCurrentDate(new Date())

  // Get events for a specific day
  const getEventsForDay = (date: Date) => {
    return calendarEvents.filter(event => isSameDay(event.start, date))
      .sort((a, b) => a.start.getTime() - b.start.getTime())
  }

  // Filter and group events by month for Agenda View
  const agendaEvents = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    
    // Filter events that fall within the selected month
    const monthEvents = calendarEvents.filter(event => {
      const eventStart = startOfDay(event.start)
      const eventEnd = startOfDay(event.end)
      const monthStartDay = startOfDay(monthStart)
      const monthEndDay = endOfDay(monthEnd)
      
      // Check if event overlaps with the selected month
      return (
        isWithinInterval(eventStart, { start: monthStartDay, end: monthEndDay }) ||
        isWithinInterval(eventEnd, { start: monthStartDay, end: monthEndDay }) ||
        (isBefore(eventStart, monthStartDay) && isAfter(eventEnd, monthEndDay))
      )
    })
    
    // Sort by start time
    return monthEvents.sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [calendarEvents, currentDate])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard 
          title="Total Flights" 
          value={stats.totalFlights} 
          icon={<PlaneIcon className="h-4 w-4 text-muted-foreground" />} 
        />
        <StatsCard 
          title="Upcoming" 
          value={stats.upcomingFlights} 
          icon={<ClockIcon className="h-4 w-4 text-blue-500" />} 
          valueColor="text-blue-600"
        />
        <StatsCard 
          title="Completed" 
          value={stats.completedFlights} 
          icon={<CalendarIcon className="h-4 w-4 text-green-500" />} 
          valueColor="text-green-600"
        />
        <StatsCard 
          title="Destinations" 
          value={stats.uniqueDestinations} 
          icon={<MapPinIcon className="h-4 w-4 text-purple-500" />} 
          valueColor="text-purple-600"
        />
      </div>

      {/* Calendar Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background/50 backdrop-blur-sm p-2 rounded-lg border">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-md p-1">
          <Button
              variant={view === 'month' ? 'default' : 'ghost'}
            size="sm"
              onClick={() => setView('month')}
              className="h-8 px-3"
          >
              <LayoutGridIcon className="h-4 w-4 mr-2" />
            Month
          </Button>
          <Button
              variant={view === 'agenda' ? 'default' : 'ghost'}
            size="sm"
              onClick={() => setView('agenda')}
              className="h-8 px-3"
            >
              <ListIcon className="h-4 w-4 mr-2" />
              Agenda
            </Button>
          </div>
          <div className="h-6 w-px bg-border mx-2 hidden sm:block" />
          <Button variant="outline" size="sm" onClick={goToToday} className="hidden sm:flex">
            Today
          </Button>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[140px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card className="border-none shadow-lg overflow-hidden ring-1 ring-border/50">
        <CardContent className="p-0">
          {view === 'month' ? (
            <div className="flex flex-col h-[700px]">
              {/* Days Header */}
              <div className="grid grid-cols-7 border-b bg-muted/40">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="py-3 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div 
                className="grid grid-cols-7 flex-1 bg-background/50"
                style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}
              >
                {daysInMonth.map((date, i) => {
                  const dayEvents = getEventsForDay(date)
                  const isCurrentMonth = isSameMonth(date, currentDate)
                  const isTodayDate = isToday(date)
                  
                  return (
                    <div 
                      key={date.toString()} 
                      className={cn(
                        "min-h-[100px] border-b border-r p-2 transition-colors hover:bg-muted/20 relative group",
                        !isCurrentMonth && "bg-muted/10 text-muted-foreground",
                        isTodayDate && "bg-blue-50/30 dark:bg-blue-950/10",
                        (i + 1) % 7 === 0 && "border-r-0"
                      )}
                      onClick={() => {
                        // Optional: Click on day to add event or see details
                      }}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={cn(
                          "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
                          isTodayDate ? "bg-primary text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                        )}>
                          {format(date, 'd')}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[10px] text-muted-foreground font-medium sm:hidden">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <EventPill 
                            key={event.id} 
                            event={event} 
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedEvent(event)
                            }} 
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button 
                                className="w-full text-left text-[10px] text-muted-foreground hover:text-foreground pl-1 font-medium transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                + {dayEvents.length - 3} more
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-2" align="start">
                              <div className="font-medium text-sm mb-2 pb-2 border-b">
                                {format(date, 'MMMM d, yyyy')}
                              </div>
                              <div className="space-y-1">
                                {dayEvents.map(event => (
                                  <EventPill 
                                    key={event.id} 
                                    event={event} 
                                    onClick={() => setSelectedEvent(event)} 
                                  />
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="h-[700px] bg-background/50">
              <ScrollArea className="h-full">
                <div className="p-6 max-w-3xl mx-auto space-y-8">
                  {agendaEvents.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                      <PlaneIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>No flights found for {format(currentDate, 'MMMM yyyy')}.</p>
                    </div>
                  ) : (
                    groupEventsByMonth(agendaEvents).map(([month, events]) => (
                      <div key={month} className="space-y-4">
                        <h3 className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 text-sm font-semibold text-muted-foreground border-b z-10">
                          {month}
                        </h3>
                        <div className="space-y-3">
                          {events.map((event) => (
                            <AgendaEventCard 
                              key={event.id} 
                              event={event} 
                              onClick={() => setSelectedEvent(event)} 
                            />
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
          </div>
          )}
        </CardContent>
      </Card>

      <FlightEventModal 
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  )
}

// Subcomponents

function StatsCard({ title, value, icon, valueColor }: { title: string, value: number, icon: React.ReactNode, valueColor?: string }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", valueColor)}>{value}</div>
      </CardContent>
    </Card>
  )
}

function EventPill({ event, onClick }: { event: CalendarFlightEvent, onClick: (e: any) => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] font-medium transition-all hover:brightness-95 hover:scale-[1.02] shadow-sm truncate"
      style={{ 
        backgroundColor: event.color, 
        color: '#fff',
        borderLeft: `3px solid rgba(255,255,255,0.3)`
      }}
    >
      <span className="opacity-80 text-[10px]">{format(event.start, 'HH:mm')}</span>
      <span className="truncate flex-1">{event.flightNumber}</span>
    </button>
  )
}

function AgendaEventCard({ event, onClick }: { event: CalendarFlightEvent, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group"
    >
      <div 
        className="flex flex-col items-center justify-center w-14 h-14 rounded-lg border bg-muted/30"
        style={{ borderColor: event.color }}
      >
        <span className="text-xs font-bold text-muted-foreground">{format(event.start, 'MMM')}</span>
        <span className="text-xl font-bold" style={{ color: event.color }}>{format(event.start, 'd')}</span>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5" style={{ borderColor: event.color, color: event.color }}>
            {event.airline || 'Flight'}
          </Badge>
          <span className="text-sm font-semibold truncate">{event.title}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
          </span>
          <span className="flex items-center gap-1">
            <PlaneIcon className="h-3 w-3" />
            {event.flightNumber}
          </span>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

function groupEventsByMonth(events: CalendarFlightEvent[]) {
  const grouped: Record<string, CalendarFlightEvent[]> = {}
  events.forEach(event => {
    const month = format(event.start, 'MMMM yyyy')
    if (!grouped[month]) grouped[month] = []
    grouped[month].push(event)
  })
  return Object.entries(grouped)
}

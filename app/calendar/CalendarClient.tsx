"use client"

import { useState, useMemo } from 'react'
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { Flight } from '@/app/flights/FlightsClient'
import { CalendarFlightEvent } from '@/types/calendar'
import { transformFlightsToCalendarEvents, calculateCalendarStats } from '@/app/calendar/lib/calendar-utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarIcon, PlaneIcon, MapPinIcon, ClockIcon } from 'lucide-react'
import { CalendarEvent } from './components/CalendarEvent'
import { FlightEventModal } from './components/FlightEventModal'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './calendar.css'

// Setup the localizer for react-big-calendar
const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface CalendarClientProps {
  initialFlights: Flight[]
}

export function CalendarClient({ initialFlights }: CalendarClientProps) {
  const [currentView, setCurrentView] = useState<View>(Views.MONTH)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarFlightEvent | null>(null)

  // Transform flights to calendar events
  const calendarEvents = useMemo(() => {
    return transformFlightsToCalendarEvents(initialFlights)
  }, [initialFlights])

  // Calculate statistics
  const stats = useMemo(() => {
    return calculateCalendarStats(calendarEvents)
  }, [calendarEvents])

  // Custom event component based on view
  const EventComponent = ({ event }: { event: CalendarFlightEvent }) => {
    const viewType = currentView === Views.MONTH ? 'month' : 
                    currentView === Views.WEEK ? 'week' : 
                    currentView === Views.DAY ? 'day' : 'agenda'
    
    return <CalendarEvent event={event} view={viewType} />
  }

  // Handle event selection
  const handleSelectEvent = (event: CalendarFlightEvent) => {
    setSelectedEvent(event)
  }

  // Handle view change
  const handleViewChange = (view: View) => {
    setCurrentView(view)
  }

  // Handle date navigation
  const handleNavigate = (date: Date) => {
    setCurrentDate(date)
  }

  // Custom month day header with popover details
  type MonthDateHeaderProps = { label: string; date: Date }
  const MonthDateHeader = ({ date }: MonthDateHeaderProps) => {
    const dayEvents = useMemo(() => {
      return calendarEvents.filter((evt) =>
        isWithinInterval(date, { start: startOfDay(evt.start), end: endOfDay(evt.end) })
      )
    }, [calendarEvents, date])

    const flightsCount = dayEvents.length

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            tabIndex={0}
            aria-label={`Day ${format(date, 'do')}${flightsCount ? `, ${flightsCount} flights` : ''}`}
            className="rbc-button-link flex items-center gap-1 text-foreground hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
              }
            }}
          >
            <span className="font-medium">{format(date, 'dd')}</span>
            {flightsCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] leading-none px-1.5 py-0.5">
                {flightsCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" side="top" className="w-80 p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{format(date, 'EEEE, MMM d')}</div>
              {flightsCount > 0 && (
                <Badge variant="secondary" className="text-[10px]">{flightsCount} flight{flightsCount > 1 ? 's' : ''}</Badge>
              )}
            </div>

            {flightsCount === 0 ? (
              <div className="text-xs text-muted-foreground">No flights on this day.</div>
            ) : (
              <ul className="space-y-2">
                {dayEvents.map((evt) => (
                  <li key={`${evt.title}-${evt.start.toString()}`} className="rounded-md border border-border/60 p-2">
                    <div className="flex items-center gap-2 text-xs">
                      <PlaneIcon className="h-3 w-3 text-muted-foreground" />
                      <span className="font-semibold">{evt.flightNumber}</span>
                      <span className="text-muted-foreground">{evt.route}</span>
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {format(evt.start, 'HH:mm')} – {format(evt.end, 'HH:mm')}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Flights</CardTitle>
            <PlaneIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFlights}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.upcomingFlights}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedFlights}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Destinations</CardTitle>
            <MapPinIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.uniqueDestinations}</div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <Button
            variant={currentView === Views.MONTH ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewChange(Views.MONTH)}
          >
            Month
          </Button>
          <Button
            variant={currentView === Views.WEEK ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewChange(Views.WEEK)}
          >
            Week
          </Button>
          <Button
            variant={currentView === Views.DAY ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewChange(Views.DAY)}
          >
            Day
          </Button>
          <Button
            variant={currentView === Views.AGENDA ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewChange(Views.AGENDA)}
          >
            Agenda
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {calendarEvents.length} flights loaded
          </Badge>
        </div>
      </div>

      {/* Calendar Component */}
      <Card>
        <CardContent className="p-6">
          <div style={{ height: '600px' }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              titleAccessor="title"
              view={currentView}
              onView={handleViewChange}
              date={currentDate}
              onNavigate={handleNavigate}
              onSelectEvent={handleSelectEvent}
              components={{
                event: EventComponent,
                month: { dateHeader: MonthDateHeader },
              }}
              eventPropGetter={(event: CalendarFlightEvent) => ({
                style: {
                  backgroundColor: event.color,
                  borderColor: event.color,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                }
              })}
              dayPropGetter={(date) => {
                const hasFlights = calendarEvents.some((evt) =>
                  isWithinInterval(date, { start: startOfDay(evt.start), end: endOfDay(evt.end) })
                )
                return {
                  className: `${hasFlights ? 'bg-muted/10 hover:bg-muted/20' : ''} transition-colors`,
                }
              }}
              className="rbc-calendar"
            />
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Flight Event Modal */}
      <FlightEventModal 
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  )
}

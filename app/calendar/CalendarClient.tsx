"use client"

import { useState, useMemo } from 'react'
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
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

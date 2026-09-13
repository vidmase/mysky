"use client"

import { useMemo, useState } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isAfter, isBefore, isSameDay, isSameMonth, isToday, isWithinInterval, startOfDay, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { CalendarIcon, ChevronLeft, ChevronRight, ListIcon, MapPinIcon, PlaneIcon } from 'lucide-react'
import { Flight } from '@/app/flights/FlightsClient'
import { CalendarFlightEvent } from '@/types/calendar'
import { calculateCalendarStats, transformFlightsToCalendarEvents } from '@/app/calendar/lib/calendar-utils'
import { PaperNav } from '@/app/components/paper-nav'
import { FlightEventModal } from './components/FlightEventModal'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import s from './calendar.module.css'

interface CalendarClientProps { initialFlights: Flight[] }

export function CalendarClient({ initialFlights }: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'agenda'>('month')
  const [selectedEvent, setSelectedEvent] = useState<CalendarFlightEvent | null>(null)
  const calendarEvents = useMemo(() => transformFlightsToCalendarEvents(initialFlights), [initialFlights])
  const stats = useMemo(() => calculateCalendarStats(calendarEvents), [calendarEvents])
  const days = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
  }), [currentDate])
  const weeks = days.length / 7
  const agendaEvents = useMemo(() => {
    const start = startOfDay(startOfMonth(currentDate))
    const end = endOfMonth(currentDate)
    return calendarEvents.filter((event) => isWithinInterval(startOfDay(event.start), { start, end }) || isWithinInterval(startOfDay(event.end), { start, end }) || (isBefore(event.start, start) && isAfter(event.end, end))).sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [calendarEvents, currentDate])
  const eventsFor = (date: Date) => calendarEvents.filter((event) => isSameDay(event.start, date)).sort((a, b) => a.start.getTime() - b.start.getTime())

  return <div className={s.page}>
    <div className={s.shell}><PaperNav /></div>
    <header className={`${s.shell} ${s.masthead}`}>
      <div className={s.copy}>
        <p className={`${s.stamp} ${s.tag}`}>Section 05 · The diary</p>
        <h1 className={s.title}>A month of <em>miles</em></h1>
        <p className={s.lede}>Every flight, placed where it happened. Browse the calendar or read the month as a simple itinerary.</p>
      </div>
      <dl className={s.ledger}>
        <Stat label="Legs filed" value={stats.totalFlights} />
        <Stat label="Still to come" value={stats.upcomingFlights} hot />
        <Stat label="Places reached" value={stats.uniqueDestinations} />
        <Stat label="Completed" value={stats.completedFlights} />
      </dl>
    </header>

    <main className={s.shell}>
      <div className={s.controls}>
        <div className={s.viewSwitch} aria-label="Calendar view">
          <button className={`${s.switchButton} ${view === 'month' ? s.switchButtonActive : ''}`} onClick={() => setView('month')}><CalendarIcon size={14} aria-hidden /> Month</button>
          <button className={`${s.switchButton} ${view === 'agenda' ? s.switchButtonActive : ''}`} onClick={() => setView('agenda')}><ListIcon size={14} aria-hidden /> Agenda</button>
        </div>
        <div className={s.monthNav}>
          <button className={s.arrow} onClick={() => setCurrentDate(subMonths(currentDate, 1))} aria-label="Previous month"><ChevronLeft size={17} /></button>
          <h2 className={s.monthTitle}>{format(currentDate, 'MMMM yyyy')}</h2>
          <button className={s.arrow} onClick={() => setCurrentDate(addMonths(currentDate, 1))} aria-label="Next month"><ChevronRight size={17} /></button>
        </div>
        <button className={s.today} onClick={() => setCurrentDate(new Date())}>Today</button>
      </div>

      {view === 'month' ? <section className={s.calendar} aria-label={`${format(currentDate, 'MMMM yyyy')} flight calendar`}>
        <div className={s.weekdays}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <div className={s.weekday} key={day}>{day}</div>)}</div>
        <div className={s.days} style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}>
          {days.map(date => <Day key={date.toISOString()} date={date} currentDate={currentDate} events={eventsFor(date)} onSelect={setSelectedEvent} />)}
        </div>
      </section> : <Agenda events={agendaEvents} onSelect={setSelectedEvent} />}
    </main>
    <FlightEventModal event={selectedEvent} isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} />
  </div>
}

function Stat({ label, value, hot = false }: { label: string; value: number; hot?: boolean }) { return <div className={s.ledgerCell}><dt className={s.ledgerLabel}>{label}</dt><dd className={`${s.ledgerValue} ${hot ? s.ledgerHot : ''}`}>{value}</dd></div> }
function Event({ event, onSelect }: { event: CalendarFlightEvent; onSelect: () => void }) { return <button className={s.event} style={{ '--event-color': event.color } as React.CSSProperties} onClick={onSelect}><span className={s.eventTime}>{format(event.start, 'HH:mm')}</span><span className={s.eventFlight}>{event.flightNumber}</span></button> }
function Day({ date, currentDate, events, onSelect }: { date: Date; currentDate: Date; events: CalendarFlightEvent[]; onSelect: (event: CalendarFlightEvent) => void }) {
  const visible = events.slice(0, 3)
  return <div className={`${s.day} ${!isSameMonth(date, currentDate) ? s.dayOutside : ''} ${isToday(date) ? s.dayToday : ''}`}><span className={s.dayNumber}>{format(date, 'd')}</span><div className={s.events}>{visible.map(event => <Event key={event.id} event={event} onSelect={() => onSelect(event)} />)}{events.length > 3 && <Popover><PopoverTrigger asChild><button className={s.more}>+ {events.length - 3} more</button></PopoverTrigger><PopoverContent className={s.popover} align="start"><div className={s.popoverTitle}>{format(date, 'd MMMM yyyy')}</div><div className={s.events}>{events.map(event => <Event key={event.id} event={event} onSelect={() => onSelect(event)} />)}</div></PopoverContent></Popover>}</div></div>
}
function Agenda({ events, onSelect }: { events: CalendarFlightEvent[]; onSelect: (event: CalendarFlightEvent) => void }) {
  if (!events.length) return <div className={s.empty}><PlaneIcon size={44} /><p>No flights filed for this month.</p></div>
  return <section className={s.agenda}>{Object.entries(groupByMonth(events)).map(([month, monthEvents]) => <div key={month}><h3 className={s.agendaTitle}>{month}</h3><div className={s.agendaList}>{monthEvents.map(event => <button key={event.id} className={s.agendaEvent} style={{ '--event-color': event.color } as React.CSSProperties} onClick={() => onSelect(event)}><span className={s.agendaDate}>{format(event.start, 'MMM')}<strong>{format(event.start, 'd')}</strong></span><span><span className={s.agendaRoute}>{event.title}</span><span className={s.agendaMeta}><MapPinIcon size={12} /> {format(event.start, 'HH:mm')}–{format(event.end, 'HH:mm')}</span></span><span className={s.agendaFlight}>{event.flightNumber}</span></button>)}</div></div>)}</section>
}
function groupByMonth(events: CalendarFlightEvent[]) { return events.reduce<Record<string, CalendarFlightEvent[]>>((groups, event) => { const month = format(event.start, 'MMMM yyyy'); (groups[month] ??= []).push(event); return groups }, {}) }

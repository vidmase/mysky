"use client"

import { CalendarFlightEvent } from '@/types/calendar'
import { Badge } from '@/components/ui/badge'
import { PlaneIcon, ClockIcon } from 'lucide-react'
import { format, isSameDay, differenceInDays } from 'date-fns'
import { getAirlineColor } from '@/app/calendar/lib/calendar-utils'

interface CalendarEventProps {
  event: CalendarFlightEvent
  view?: 'month' | 'week' | 'day' | 'agenda'
}

export function CalendarEvent({ event, view = 'month' }: CalendarEventProps) {
  const airlineColors = getAirlineColor(event.airline)
  const isMultiDay = !isSameDay(event.start, event.end)
  const daysDifference = differenceInDays(event.end, event.start)

  // Different rendering based on calendar view
  switch (view) {
    case 'month':
      return (
        <div 
          className="text-xs p-1 rounded-md truncate cursor-pointer hover:opacity-90 transition-opacity"
          style={{ 
            backgroundColor: airlineColors.primary,
            color: airlineColors.text,
            border: `1px solid ${airlineColors.primary}`,
          }}
        >
          <div className="flex items-center gap-1">
            <PlaneIcon className="h-3 w-3 flex-shrink-0" />
            <span className="font-semibold truncate">{event.flightNumber}</span>
            {isMultiDay && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                {daysDifference}d
              </Badge>
            )}
          </div>
          <div className="truncate opacity-90">
            {event.route}
          </div>
          {event.status === 'upcoming' && (
            <div className="flex items-center gap-1 mt-1">
              <ClockIcon className="h-2 w-2" />
              <span className="text-[10px]">
                {format(event.start, 'HH:mm')}
              </span>
            </div>
          )}
        </div>
      )

    case 'week':
    case 'day':
      return (
        <div 
          className="text-xs p-2 rounded-md cursor-pointer hover:opacity-90 transition-opacity h-full"
          style={{ 
            backgroundColor: airlineColors.primary,
            color: airlineColors.text,
            border: `2px solid ${airlineColors.secondary}`,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <PlaneIcon className="h-3 w-3 flex-shrink-0" />
            <span className="font-bold">{event.flightNumber}</span>
            <Badge 
              variant={event.status === 'upcoming' ? 'default' : 'secondary'}
              className="text-[10px] px-1 py-0 h-4"
            >
              {event.status === 'upcoming' ? 'UP' : 'DONE'}
            </Badge>
          </div>
          <div className="font-medium mb-1">
            {event.route}
          </div>
          <div className="flex items-center justify-between text-[10px] opacity-90">
            <span>{format(event.start, 'HH:mm')}</span>
            <span>→</span>
            <span>{format(event.end, 'HH:mm')}</span>
          </div>
          {isMultiDay && (
            <div className="mt-1 text-[10px] bg-orange-500/20 rounded px-1 py-0.5">
              Multi-day (+{daysDifference})
            </div>
          )}
          {event.metadata.seat && (
            <div className="mt-1 text-[10px] opacity-75">
              Seat: {event.metadata.seat}
            </div>
          )}
        </div>
      )

    case 'agenda':
      return (
        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
          <div 
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: airlineColors.primary }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold">{event.flightNumber}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{event.airline}</span>
              <Badge 
                variant={event.status === 'upcoming' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {event.status}
              </Badge>
            </div>
            <div className="text-sm font-medium mb-1">
              {event.route}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{format(event.start, 'MMM d, HH:mm')}</span>
              <span>→</span>
              <span>{format(event.end, 'MMM d, HH:mm')}</span>
              {isMultiDay && (
                <Badge variant="outline" className="text-[10px]">
                  {daysDifference} day{daysDifference > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            {event.metadata.seat && (
              <div className="text-xs text-muted-foreground mt-1">
                Seat: {event.metadata.seat}
              </div>
            )}
          </div>
        </div>
      )

    default:
      return (
        <div className="text-xs p-1 rounded truncate">
          {event.title}
        </div>
      )
  }
}

"use client"

import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Plane, ArrowRight, Calendar, Clock, User, Trash2 } from "lucide-react"
import type { Flight } from "@/app/flights/lib/types"

export interface DeleteFlightDialogProps {
  open: boolean
  flight: Flight | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isDeleting: boolean
}

export function DeleteFlightDialog({ open, flight, onOpenChange, onConfirm, isDeleting }: DeleteFlightDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="mx-4 sm:mx-0 sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Flight
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this flight? This action cannot be undone.
          </AlertDialogDescription>

          <div className="mt-4 space-y-4">
            {/* Flight Details */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-flight" />
                <span className="font-medium">{flight?.airline} {flight?.flight_number}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-airport/10 text-airport border-airport/20">
                  {flight?.departure_airport}
                  {flight?.departure_iata && ` (${flight?.departure_iata})`}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className="bg-airport/10 text-airport border-airport/20">
                  {flight?.arrival_airport}
                  {flight?.arrival_iata && ` (${flight?.arrival_iata})`}
                  {flight?.arrival_country && ` (${flight?.arrival_country})`}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {flight?.departure_date ? format(new Date(flight.departure_date), "MMMM d, yyyy", { locale: enUS }) : 'No date'}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {flight?.departure_time} - {flight?.arrival_time}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {flight?.passenger_name}
                {flight?.seat && ` (Seat ${flight.seat})`}
              </div>
            </div>

            {/* Warning Message */}
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              <div className="font-medium">Warning:</div>
              <div>This will permanently delete this flight from your history. This action cannot be undone.</div>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Deleting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Flight
              </div>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

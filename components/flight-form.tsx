"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import s from "@/app/flights/[id]/edit/edit.module.css"

interface FlightFormProps {
  initialData?: any
  onSubmit: (data: any) => void
  onCancel?: () => void
  submitLabel?: string
}

const Arrow = () => (
  <svg width="16" height="8" viewBox="0 0 16 8" fill="none" aria-hidden="true">
    <path d="M0 4h14M10.5 1L14 4l-3.5 3" stroke="currentColor" strokeWidth="1.2" />
  </svg>
)

/**
 * A ruled line with a letterpress label above it.
 *
 * Declared at module scope, not inside FlightForm: a component defined during
 * render is a new type on every keystroke, so React would unmount and remount
 * the input and the caret would jump out of the field mid-word.
 */
function Field({
  name,
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
}: {
  name: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  required?: boolean
  placeholder?: string
}) {
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className={s.input}
      />
    </div>
  )
}

/** The two date fields share a popover calendar, on paper stock. */
function DateField({
  label,
  value,
  onSelect,
}: {
  label: string
  value: Date
  onSelect: (date: Date) => void
}) {
  return (
    <div className={s.field}>
      <span className={s.label}>{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className={s.dateTrigger}>
            {value ? format(value, "d MMM yyyy") : "Pick a date"}
            <CalendarIcon />
          </button>
        </PopoverTrigger>
        <PopoverContent className="paper-surface w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => onSelect(date || new Date())}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function FlightForm({ initialData, onSubmit, onCancel, submitLabel = "Add Flight" }: FlightFormProps) {
  const [formData, setFormData] = useState({
    passenger_name: initialData?.passenger_name || "",
    reservation_number: initialData?.reservation_number || "",
    flight_number: initialData?.flight_number || "",
    departure_airport: initialData?.departure_airport || "",
    arrival_airport: initialData?.arrival_airport || "",
    departure_date: initialData?.departure_date ? new Date(initialData.departure_date) : new Date(),
    departure_time: initialData?.departure_time || "",
    arrival_time: initialData?.arrival_time || "",
    total_receipt: initialData?.total_receipt || "",
    purchased_date: initialData?.purchased_date ? new Date(initialData.purchased_date) : new Date(),
    purchase_time: initialData?.purchase_time || "",
    airline: initialData?.airline || "",
    seat: initialData?.seat || "",
    notes: initialData?.notes || ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  /** Bind a text field to its slot in formData. */
  const field = (name: keyof typeof formData) => ({
    name,
    value: formData[name] as string,
    onChange: handleChange,
  })

  const dateField = (name: 'departure_date' | 'purchased_date') => ({
    value: formData[name],
    onSelect: (date: Date) => setFormData(prev => ({ ...prev, [name]: date })),
  })

  return (
    <form onSubmit={handleSubmit} className={s.form}>
      <fieldset className={s.fieldset}>
        <legend className="sr-only">Particulars</legend>
        <div className={s.fieldsetHead}>
          <span className={s.fieldsetTitle}>Particulars</span>
          <span className={s.fieldsetNo}>Sheet 1</span>
        </div>
        <div className={s.grid}>
          <Field {...field("passenger_name")} label="Passenger name" required />
          <Field {...field("reservation_number")} label="Reservation" required />
          <Field {...field("flight_number")} label="Flight number" required />
          <Field {...field("airline")} label="Airline" placeholder="Carrier on the ticket" />
          <Field {...field("departure_airport")} label="Departure airport" required />
          <Field {...field("arrival_airport")} label="Arrival airport" required />
          <Field {...field("seat")} label="Seat" placeholder="Unassigned" />
          <Field {...field("total_receipt")} label="Fare paid" required />
        </div>
      </fieldset>

      <fieldset className={s.fieldset}>
        <legend className="sr-only">Times</legend>
        <div className={s.fieldsetHead}>
          <span className={s.fieldsetTitle}>Dates and times</span>
          <span className={s.fieldsetNo}>Sheet 2</span>
        </div>
        <div className={s.grid}>
          <DateField {...dateField("departure_date")} label="Flight date" />
          <DateField {...dateField("purchased_date")} label="Purchase date" />
          <Field {...field("departure_time")} label="Departure time" type="time" required />
          <Field {...field("arrival_time")} label="Arrival time" type="time" required />
          <Field {...field("purchase_time")} label="Purchase time" type="time" required />
        </div>
      </fieldset>

      <fieldset className={s.fieldset}>
        <legend className="sr-only">Notes</legend>
        <div className={s.fieldsetHead}>
          <span className={s.fieldsetTitle}>Notes</span>
          <span className={s.fieldsetNo}>Sheet 3</span>
        </div>
        <div className={`${s.grid} ${s.gridSingle}`}>
          <div className={s.field}>
            <label className={s.label} htmlFor="notes">Anything worth remembering</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className={s.textarea}
            />
          </div>
        </div>
      </fieldset>

      <div className={s.actions}>
        <button type="submit" className={s.btnPrimary}>
          {submitLabel}
          <Arrow />
        </button>
        {onCancel && (
          <button type="button" className={s.btnGhost} onClick={onCancel}>
            Discard changes
          </button>
        )}
      </div>
    </form>
  )
}

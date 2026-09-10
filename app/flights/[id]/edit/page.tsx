"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useNotification } from "@/contexts/notification-context"
import { FlightForm } from "@/components/flight-form"
import { format } from "date-fns"
import { enUS } from 'date-fns/locale'
import { use } from "react"
import { calculateDuration } from "@/app/flights/lib/flight-utils"
import { PaperNav } from "@/app/components/paper-nav"
import s from "./edit.module.css"

/** IATA when we have one, otherwise the first three letters of the airport. */
const iataOf = (iata: string | null | undefined, airportName: string) =>
  iata && iata !== "None" ? iata : (airportName || "").slice(0, 3).toUpperCase()

/** Blank out the placeholders the importer leaves behind. */
const orDash = (v: unknown) => {
  const str = typeof v === "string" ? v.trim() : v == null ? "" : String(v)
  return !str || str === "None" ? "—" : str
}

const BackArrow = () => (
  <svg viewBox="0 0 16 8" fill="none" aria-hidden="true">
    <path d="M16 4H2M5.5 1L2 4l3.5 3" stroke="currentColor" strokeWidth="1.2" />
  </svg>
)

const Arrow = () => (
  <svg width="16" height="8" viewBox="0 0 16 8" fill="none" aria-hidden="true">
    <path d="M0 4h14M10.5 1L14 4l-3.5 3" stroke="currentColor" strokeWidth="1.2" />
  </svg>
)

// Add formatTime helper function after the imports
const formatTime = (timeStr: string) => {
  try {
    if (!timeStr) return ''

    // If it's an ISO date string
    if (timeStr.includes('T')) {
      const date = new Date(timeStr)
      return format(date, 'HH:mm')
    }

    // If it's already in HH:mm format, return as is
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      return timeStr
    }

    // For any other format, try to extract hours and minutes
    const [hours, minutes] = timeStr.split(':').map(num => num.padStart(2, '0'))
    return `${hours}:${minutes}`
  } catch (error) {
    console.error('Error formatting time:', error)
    return timeStr
  }
}

export default function EditFlightPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { showSuccess, showError } = useNotification()
  const [flight, setFlight] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFlight = async () => {
      try {
        const response = await fetch(`/api/flights/${resolvedParams.id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch flight')
        }
        const data = await response.json()
        setFlight(data)
      } catch (error) {
        console.error('Error fetching flight:', error)
        showError('Failed to load flight details')
        router.push('/flights')
      } finally {
        setLoading(false)
      }
    }

    fetchFlight()
  }, [resolvedParams.id, router, showError])

  const handleSubmit = async (formData: any) => {
    try {
      // Fetch coordinates for departure airport
      const departureResponse = await fetch('/api/coordinates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchQuery: formData.departure_airport,
          type: 'departure'
        }),
      })

      if (!departureResponse.ok) {
        throw new Error('Failed to fetch departure airport coordinates')
      }

      const departureData = await departureResponse.json()

      // Fetch coordinates for arrival airport
      const arrivalResponse = await fetch('/api/coordinates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchQuery: formData.arrival_airport,
          type: 'arrival'
        }),
      })

      if (!arrivalResponse.ok) {
        throw new Error('Failed to fetch arrival airport coordinates')
      }

      const arrivalData = await arrivalResponse.json()

      // Add coordinates to form data
      const updatedFormData = {
        ...formData,
        departure_longitude: departureData.departure_longitude,
        departure_latitude: departureData.departure_latitude,
        arrival_longitude: arrivalData.arrival_longitude,
        arrival_latitude: arrivalData.arrival_latitude
      }

      const response = await fetch(`/api/flights/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedFormData),
      })

      if (!response.ok) {
        throw new Error('Failed to update flight')
      }

      showSuccess('Flight updated successfully! ✈️')
      router.push('/flights')
    } catch (error) {
      console.error('Error updating flight:', error)
      showError('Failed to update flight. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className={s.page}>
        <div className={s.shell}>
          <PaperNav />
          <div className={s.state}>
            <div className={s.compass} />
            <p className={s.stateNote}>Pulling the record</p>
          </div>
        </div>
      </div>
    )
  }

  if (!flight) {
    return (
      <div className={s.page}>
        <div className={s.shell}>
          <PaperNav />
          <div className={s.state}>
            <h1 className={s.stateTitle}>No such leg on file</h1>
            <p className={s.stateNote}>It may have been deleted since you opened this page.</p>
          </div>
        </div>
      </div>
    )
  }

  const depIata = iataOf(flight.departure_iata, flight.departure_airport)
  const arrIata = iataOf(flight.arrival_iata, flight.arrival_airport)

  return (
    <div className={s.page}>
      <div className={s.shell}>
        <PaperNav />
      </div>

      <header className={s.shell}>
        <div className={s.masthead}>
          <button type="button" className={`${s.back} ${s.rise}`} onClick={() => router.back()}>
            <BackArrow />
            Back to the log
          </button>
          <h1 className={`${s.title} ${s.rise}`} style={{ animationDelay: "80ms" }}>
            Amend a <em>filed leg</em>
          </h1>
          <p className={`${s.lede} ${s.rise}`} style={{ animationDelay: "170ms" }}>
            What is on file appears below. Change any of it and file the correction —
            the logbook keeps the amended version.
          </p>
        </div>
      </header>

      <main className={s.shell}>
        {/* ── THE RECORD AS FILED ─────────────────────────── */}
        <section className={`${s.record} ${s.rise}`} style={{ animationDelay: "240ms" }}>
          <header className={s.recordHead}>
            <h2 className={s.recordTitle}>As filed</h2>
            <span className={s.recordRef}>{orDash(flight.reservation_number)}</span>
          </header>

          <div className={s.recordRoute}>
            <div className={s.iata}>
              {depIata}
              <small>{orDash(flight.departure_airport)}</small>
            </div>
            <svg className={s.recordArc} viewBox="0 0 104 26" aria-hidden="true">
              <path d="M2 23 C 28 2, 76 2, 102 23" />
            </svg>
            <div className={s.iata} style={{ textAlign: "right" }}>
              {arrIata}
              <small>{orDash(flight.arrival_airport)}</small>
            </div>
          </div>

          <dl className={s.recordFacts}>
            <div className={s.fact}>
              <dt>Flight</dt>
              <dd>
                {orDash(flight.flight_number)}
                <span className={s.factSub}>{orDash(flight.airline)}</span>
              </dd>
            </div>
            <div className={s.fact}>
              <dt>Date</dt>
              <dd>
                {format(new Date(flight.departure_date), "dd MMM yyyy", { locale: enUS })}
                <span className={s.factSub}>
                  {format(new Date(flight.departure_date), "EEEE", { locale: enUS })}
                </span>
              </dd>
            </div>
            <div className={s.fact}>
              <dt>Departs</dt>
              <dd>{formatTime(flight.departure_time) || "—"}</dd>
            </div>
            <div className={s.fact}>
              <dt>Arrives</dt>
              <dd>{formatTime(flight.arrival_time) || "—"}</dd>
            </div>
            <div className={s.fact}>
              <dt>Block</dt>
              <dd>
                {calculateDuration(flight.departure_time, flight.arrival_time, {
                  departureDate: flight.departure_date,
                  departureIata: flight.departure_iata,
                  arrivalIata: flight.arrival_iata,
                })}
              </dd>
            </div>
            <div className={s.fact}>
              <dt>Seat</dt>
              <dd>{orDash(flight.seat)}</dd>
            </div>
            <div className={s.fact}>
              <dt>Passenger</dt>
              <dd>
                {orDash(flight.passenger_name)}
              </dd>
            </div>
            <div className={s.fact}>
              <dt>Fare</dt>
              <dd>
                {orDash(flight.total_receipt)}
                <span className={s.factSub}>
                  bought {format(new Date(flight.purchased_date), "d MMM yyyy", { locale: enUS })}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        {/* ── THE AMENDMENT ───────────────────────────────── */}
        <FlightForm
          initialData={flight}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          submitLabel="File the correction"
        />

        <div className={s.colophon}>
          <span className={s.tag}>MySky · Amendment</span>
          <p className={s.colophonNote}>
            Airport coordinates are looked up again when the correction is filed, so a
            changed airport also moves the leg on the atlas.
          </p>
        </div>
      </main>
    </div>
  )
}


export type Flight = {
  id: number
  owner_id: string
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
  arrival_date: string | null
  flight_duration: string | null
  is_direct: boolean | null
  is_return_flight: boolean | null
  booking_type: 'OUTBOUND' | 'RETURN' | null
  return_flight_number: string | null
  return_departure_date: string | null
  return_departure_time: string | null
  return_flight_duration: string | null
  return_is_direct: boolean | null
  /** Booking was cancelled: kept in the log, watermarked, and left out of spend. */
  cancelled: boolean | null
  /** Part of total_receipt that went on extras — seats, bags, priority. Not an addition to it. */
  extras_receipt: string | null
}

export type Airport = {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  visits: number;
  routes: Route[];
}

export type Route = {
  id: string;
  from: string;
  to: string;
  count: number;
}
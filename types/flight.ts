export type Flight = {
  id: string
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
  airline?: string
  arrival_country?: string
  arrival_iata?: string
  departure_iata?: string
  seat?: string
  notes?: string
} 
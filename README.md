# MySky - Flight Tracking Application

A modern web application for tracking and managing flight information, built with Next.js, Supabase, and Tailwind CSS.

## Features

- View and manage flight history
- Search and filter flights by various criteria
- Real-time data updates
- Responsive design for all devices
- Modern UI with dark mode support

## Tech Stack

- Next.js 14
- TypeScript
- Supabase
- Tailwind CSS
- Radix UI Components
- date-fns for date formatting

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/yourusername/mysky.git
cd mysky
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses a Supabase database with the following schema:

```sql
CREATE TABLE public.vidmaflights (
  id bigserial NOT NULL,
  passenger_name text NOT NULL,
  reservation_number text NOT NULL,
  flight_number text NOT NULL,
  departure_airport text NOT NULL,
  arrival_airport text NOT NULL,
  departure_date text NOT NULL,
  departure_time text NOT NULL,
  arrival_time text NOT NULL,
  total_receipt text NOT NULL,
  purchased_date text NOT NULL,
  purchase_time text NOT NULL,
  airline text NULL,
  arrival_country text NULL,
  arrival_iata text NULL,
  departure_iata text NULL,
  seat text NULL,
  notes text NULL,
  CONSTRAINT vidmaflights_pkey PRIMARY KEY (id)
);
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

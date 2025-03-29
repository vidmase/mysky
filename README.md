# MySky - Flight History Tracker

A modern web application for tracking and managing your flight history. Built with Next.js 14, React, TypeScript, and Supabase.

![MySky Screenshot](screenshot.png)

## Features

- 🛫 **Comprehensive Flight Tracking**

  - Store detailed flight information including reservation numbers, flight numbers, and passenger details
  - Track departure and arrival times, airports, and seat assignments
  - Add personal notes for each flight

- 🔍 **Advanced Search & Filtering**

  - Search across multiple fields (airports, airlines, flight numbers, etc.)
  - Filter by date range, airline, price range, and trip type
  - Sort results by date, price, or airline

- 📊 **Smart Organization**

  - View flights in a clean, organized table layout
  - Quick access to flight details with hover tooltips
  - Visual indicators for flight status and trip types

- 📱 **Responsive Design**
  - Fully responsive layout that works on desktop and mobile devices
  - Optimized interface for different screen sizes
  - Touch-friendly controls and interactions

## Tech Stack

- **Frontend**

  - Next.js 14 (App Router)
  - React
  - TypeScript
  - Tailwind CSS
  - shadcn/ui Components
  - date-fns for date handling
  - Lucide Icons

- **Backend**
  - Supabase (PostgreSQL)
  - Next.js API Routes
  - Supabase Auth Helpers

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/mysky.git
   cd mysky
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
mysky/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── flights/          # Flight pages
│   └── components/       # React components
├── components/            # Shared components
│   └── ui/              # UI components
├── lib/                   # Utility functions
├── styles/                # Global styles
└── types/                 # TypeScript types
```

## Key Components

- **Flight List**: Main interface displaying all flights with sorting and filtering
- **Flight Details**: Detailed view of individual flight information
- **Date Range Picker**: Custom calendar for selecting flight date ranges
- **Filter System**: Advanced filtering interface for finding specific flights
- **Search**: Global search functionality across all flight data

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

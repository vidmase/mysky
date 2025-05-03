# ✈️ FlightTrack - Your Personal Flight Journey Companion

![FlightTrack Banner](banner.png)

FlightTrack is a modern, feature-rich flight tracking application that helps you visualize and manage your travel history. Built with Next.js 14, React, and Supabase, it offers a beautiful, interactive way to track your flights and analyze your travel patterns.

## 🌟 Key Features

### 📊 Comprehensive Analytics
- Real-time flight statistics and visualizations
- Total distance flown with accurate calculations
- Countries visited tracking
- Most frequent routes analysis
- Airline usage breakdown

### 🗺️ Interactive Map
- Beautiful, interactive world map
- Animated flight paths
- Airport markers with detailed information
- Real-time distance calculations
- Country-based coloring

### ✨ Modern UI/UX
- Dark mode by default
- Responsive design for all devices
- Beautiful gradients and animations
- Interactive cards with hover effects
- Real-time updates

### 🔄 Smart Sync
- Automatic data synchronization
- Offline support
- Real-time updates
- Efficient caching system

## 🛠️ Tech Stack

- **Frontend**
  - Next.js 14 (App Router)
  - React 18
  - TypeScript
  - Tailwind CSS
  - shadcn/ui Components
  - Leaflet for maps
  - Lucide Icons

- **Backend**
  - Supabase (PostgreSQL)
  - Next.js API Routes
  - Supabase Auth

- **Data Visualization**
  - Recharts
  - Leaflet
  - Custom animations

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/flighttrack.git
   cd flighttrack
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
   Create a `.env.local` file:
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

## 📁 Project Structure

```
flighttrack/
├── app/                # Next.js app directory
│   ├── api/           # API routes
│   ├── flights/       # Flight pages
│   ├── map/          # Map visualization
│   └── stats/        # Statistics pages
├── components/        # React components
│   ├── ui/           # Reusable UI components
│   └── sections/     # Page sections
├── lib/              # Utility functions
├── contexts/         # React contexts
└── types/           # TypeScript types
```

## 🔑 Key Components

- **Flight Management**
  - Add/Edit flights
  - Bulk import support
  - Rich flight details

- **Map Visualization**
  - Interactive world map
  - Animated flight paths
  - Airport information

- **Statistics Dashboard**
  - Total distance flown
  - Countries visited
  - Airline analysis
  - Time in air

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Leaflet](https://leafletjs.com/)
- [Lucide Icons](https://lucide.dev/)

## 🌐 Live Demo

Check out the live demo at [flighttrack.example.com](https://flighttrack.example.com)

---

Made with ❤️ by [Your Name]

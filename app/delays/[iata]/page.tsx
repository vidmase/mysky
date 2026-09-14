import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AirportDelaysCard } from '@/components/sections/AirportDelaysCard'
import { AirportDelaysChart } from '@/components/sections/AirportDelaysChart'

export default async function AirportDelayPage({ params }: { params: Promise<{ iata: string }> }) {
  const { iata: rawIata } = await params
  const iata = (rawIata || 'BRS').toUpperCase()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/delays"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--wash-ink)] border border-[var(--rule)] text-xs text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--wash-ink)] transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[var(--ink)]">
              <span className="bg-gradient-to-r from-[var(--vermillion)] to-[var(--brass)] bg-clip-text text-transparent">{iata}</span>
              <span className="text-[var(--ink-2)] text-lg ml-2">Airport Delays</span>
            </h1>
            <p className="text-[var(--ink-3)] text-xs mt-0.5">
              Live delay statistics powered by AeroDataBox
            </p>
          </div>
        </div>

        {/* Live delay card */}
        <AirportDelaysCard iata={iata} window="3mo" />

        {/* Trend chart */}
        <AirportDelaysChart iata={iata} bucket="1d" days={90} />
      </div>
    </div>
  )
}

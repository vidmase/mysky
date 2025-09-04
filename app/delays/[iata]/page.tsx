import { AirportDelaysCard } from '@/components/sections/AirportDelaysCard'
import { AirportDelaysChart } from '@/components/sections/AirportDelaysChart'

export default function AirportDelayPage({ params }: { params: { iata: string } }) {
  const iata = (params.iata || 'BRS').toUpperCase()
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Airport Delays — {iata}</h1>
        <p className="text-muted-foreground">Updated every 15 minutes. Window: last 3 months.</p>
      </div>
      <div className="space-y-6">
        <AirportDelaysCard iata={iata} window="3mo" />
        <AirportDelaysChart iata={iata} bucket="1d" days={90} />
      </div>
    </div>
  )
}

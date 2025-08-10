export default function FlightsHeatmapPage() {
  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold mb-4">Flights Heatmap</h1>
      {/* Client component renders the visualization */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <FlightsHeatmapWrapper />
    </div>
  )
}

function FlightsHeatmapWrapper() {
  // Dynamic import to avoid SSR issues with d3 / DOM
  // eslint-disable-next-line @next/next/no-sync-scripts
  return <div suppressHydrationWarning>{typeof window !== 'undefined' ? <ClientHeatmap /> : null}</div>
}

function ClientHeatmap() {
  const Heatmap = require("../components/FlightsHeatmap").FlightsHeatmap
  return <Heatmap />
}

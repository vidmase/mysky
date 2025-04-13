'use client'

import Link from "next/link"
import { PlaneTakeoff, Plus, Globe } from "lucide-react"
import Image from 'next/image'
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="relative h-screen w-full overflow-hidden">
        <Image
          src="/plane1.jpg"
          alt="Airplane in the sky"
          fill
          className="object-cover"
          priority
          quality={100}
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-4">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm mb-4">
              <PlaneTakeoff className="h-8 w-8" />
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">Welcome to FlightTrack</h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Track your flights, visualize your travels, and gain insights into your journey.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" className="bg-white text-black hover:bg-white/90">
                <Link href="/add-flight">
                  <Plus className="mr-2 h-5 w-5" /> Start Tracking Flights
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                <Link href="/map">
                  <Globe className="mr-2 h-5 w-5" /> Explore Map
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}


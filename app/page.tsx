import Link from "next/link"
import { ArrowRight, MapPin, PlaneTakeoff, Plus, BarChart3, Globe, Clock, Calendar, Plane, List } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { TotalFlights } from "@/components/total-flights"
import { TotalCountries } from "@/components/total-countries"
import { HoursInAir } from "@/components/hours-in-air"
import { TotalKilometers } from "@/components/total-kilometers"
import { MostUsedAirline } from "@/components/most-used-airline"
import { MostVisitedAirport } from "@/components/most-visited-airport"

export default function Home() {
  // Mock data - in a real app this would come from a database
  const stats = {
    totalHours: 187,
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-8">
        <section className="space-y-4 text-center max-w-3xl mx-auto">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-airline text-white mb-2 animate-float">
            <PlaneTakeoff className="h-6 w-6" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Welcome to FlightTrack</h1>
          <p className="text-muted-foreground text-lg">
            Track your flights, visualize your travels, and gain insights into your journey.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-4">
          <TotalFlights />
          <TotalCountries />
          <HoursInAir />
          <TotalKilometers />
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <MostUsedAirline />
          <MostVisitedAirport />
        </section>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="flight-card border-t-4 border-t-flight">
            <CardHeader>
              <CardTitle className="text-flight flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                Add Flight
              </CardTitle>
              <CardDescription>Record a new journey</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-4">
              <div className="h-20 w-20 rounded-full bg-flight/10 flex items-center justify-center">
                <Plane className="h-10 w-10 text-flight" />
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full bg-flight hover:bg-flight/90">
                <Link href="/add-flight" className="flex items-center">
                  <Plus className="mr-2 h-4 w-4" /> Add Flight
                </Link>
              </Button>
            </CardFooter>
          </Card>
          <Card className="flight-card border-t-4 border-t-flight">
            <CardHeader>
              <CardTitle className="text-flight flex items-center">
                <List className="h-5 w-5 mr-2" />
                View Flights
              </CardTitle>
              <CardDescription>Browse your travel history</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-4">
              <div className="h-20 w-20 rounded-full bg-flight/10 flex items-center justify-center">
                <Calendar className="h-10 w-10 text-flight" />
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full border-flight text-flight hover:bg-flight/10">
                <Link href="/flights" className="flex items-center">
                  <ArrowRight className="mr-2 h-4 w-4" /> View All
                </Link>
              </Button>
            </CardFooter>
          </Card>
          <Card className="flight-card border-t-4 border-t-airport">
            <CardHeader>
              <CardTitle className="text-airport flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Map View
              </CardTitle>
              <CardDescription>Visualize your travels</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-4">
              <div className="h-20 w-20 rounded-full bg-airport/10 flex items-center justify-center">
                <Globe className="h-10 w-10 text-airport" />
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full border-airport text-airport hover:bg-airport/10">
                <Link href="/map" className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4" /> Open Map
                </Link>
              </Button>
            </CardFooter>
          </Card>
          <Card className="flight-card border-t-4 border-t-stats">
            <CardHeader>
              <CardTitle className="text-stats flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Stats & Insights
              </CardTitle>
              <CardDescription>Analyze your flight data</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-4">
              <div className="h-20 w-20 rounded-full bg-stats/10 flex items-center justify-center">
                <BarChart3 className="h-10 w-10 text-stats" />
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full border-stats text-stats hover:bg-stats/10">
                <Link href="/stats" className="flex items-center">
                  <BarChart3 className="mr-2 h-4 w-4" /> View Stats
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </section>

        <section className="rounded-xl bg-muted/50 p-6 pattern-bg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold mb-2">Ready to track your next adventure?</h2>
              <p className="text-muted-foreground">Add your flights and start visualizing your travel history.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="bg-gradient-airline hover:bg-gradient-airline">
                <Link href="/add-flight">
                  <Plus className="mr-2 h-4 w-4" /> Add Your First Flight
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/map">
                  <Globe className="mr-2 h-4 w-4" /> Explore Map
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}


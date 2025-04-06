'use client'

import Link from "next/link"
import { ArrowRight, MapPin, PlaneTakeoff, Plus, BarChart3, Globe, Clock, Calendar, Plane, List, Route, Compass } from "lucide-react"
import { useEffect } from 'react'
import { Suspense } from 'react'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { RecentActivity } from "./components/recent-activity"
import './styles/shine-effect.css'

// Implement loading fallbacks
const StatisticsLoadingFallback = () => (
  <section className="grid gap-6 md:grid-cols-4">
    {[...Array(4)].map((_, i) => (
      <Card key={i} className="stat-card bg-gradient-stats text-white">
        <CardHeader>
          <LoadingSpinner />
        </CardHeader>
      </Card>
    ))}
  </section>
)

const InsightsLoadingFallback = () => (
  <section className="grid gap-6 md:grid-cols-2">
    {[...Array(2)].map((_, i) => (
      <Card key={i} className="stat-card">
        <CardHeader>
          <LoadingSpinner />
        </CardHeader>
      </Card>
    ))}
  </section>
)

export default function Home() {
  useEffect(() => {
    const cards = document.querySelectorAll('.feature-card');
    const handleMouseMove = (e: MouseEvent) => {
      const card = e.currentTarget;
      if (!(card instanceof HTMLElement)) return;

      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
    };

    cards.forEach(card => {
      card.addEventListener('mousemove', handleMouseMove as EventListener);
    });

    return () => {
      cards.forEach(card => {
        card.removeEventListener('mousemove', handleMouseMove as EventListener);
      });
    };
  }, []);

  return (
    <main className="container mx-auto px-4 py-8">
      <style jsx global>{`
        @keyframes shine {
          0% {
            transform: translateX(-100%) rotate(-45deg);
            opacity: 0;
          }
          10% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.3;
          }
          90% {
            opacity: 0.5;
          }
          100% {
            transform: translateX(200%) rotate(-45deg);
            opacity: 0;
          }
        }
        
        @keyframes ambient-shine {
          0%, 100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.3;
          }
        }
        
        .shine-effect {
          isolation: isolate;
        }
        
        .shine-effect::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 200%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0) 20%,
            rgba(255, 255, 255, 0.3) 50%,
            rgba(255, 255, 255, 0) 80%,
            transparent 100%
          );
          transform: translateX(-100%) rotate(-45deg);
          animation: shine 5s infinite ease-out;
          pointer-events: none;
          mix-blend-mode: soft-light;
          z-index: 1;
        }
        
        .shine-effect::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at 50% 50%,
            rgba(255, 255, 255, 0.2),
            transparent 70%
          );
          animation: ambient-shine 3s infinite ease-in-out;
          pointer-events: none;
          mix-blend-mode: soft-light;
          z-index: 1;
        }
        
        .shine-effect:hover::before {
          animation: shine 2s infinite ease-out;
        }
        
        .feature-card:hover .shine-effect::after {
          background: radial-gradient(
            circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
            rgba(255, 255, 255, 0.3),
            transparent 70%
          );
        }
      `}</style>

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

        {/* Feature Highlights Section */}
        <section className="grid gap-6 md:grid-cols-4">
          <Card className="feature-card relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 bg-gradient-airline text-white shadow-[0_0_30px_-5px_rgba(var(--airline-rgb),0.3)] hover:shadow-[0_0_40px_-5px_rgba(var(--airline-rgb),0.5)]">
            <div className="shine-effect absolute inset-0"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]"></div>
            <CardHeader className="pb-2 relative">
              <CardTitle className="flex flex-col gap-1">
                <div className="text-2xl font-bold flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
                      <Route className="h-6 w-6 opacity-90" />
                    </div>
                    <span className="ml-3">Track Routes</span>
                  </div>
                </div>
              </CardTitle>
              <CardDescription className="text-white/90 font-medium">
                Record and visualize your flight paths across the globe
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 relative">
              <div className="text-sm text-white/90 space-y-2">
                <div className="flex items-center gap-2 transition-transform hover:translate-x-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/80"></div>
                  Log departure and arrival details
                </div>
                <div className="flex items-center gap-2 transition-transform hover:translate-x-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/80"></div>
                  View route statistics
                </div>
                <div className="flex items-center gap-2 transition-transform hover:translate-x-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/80"></div>
                  Track frequent connections
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="feature-card relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 bg-gradient-airport text-white shadow-[0_0_30px_-5px_rgba(var(--airport-rgb),0.3)] hover:shadow-[0_0_40px_-5px_rgba(var(--airport-rgb),0.5)]">
            <div className="shine-effect absolute inset-0"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]"></div>
            <CardHeader className="pb-2 relative">
              <CardTitle className="flex flex-col gap-1">
                <div className="text-2xl font-bold flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
                      <Globe className="h-6 w-6 opacity-90" />
                    </div>
                    <span className="ml-3">Global Coverage</span>
                  </div>
                </div>
              </CardTitle>
              <CardDescription className="text-white/90 font-medium">
                Explore your worldwide travel footprint
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 relative">
              <div className="text-sm text-white/90 space-y-2">
                <div className="flex items-center gap-2 transition-transform hover:translate-x-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/80"></div>
                  Track visited countries
                </div>
                <div className="flex items-center gap-2 transition-transform hover:translate-x-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/80"></div>
                  Discover new destinations
                </div>
                <div className="flex items-center gap-2 transition-transform hover:translate-x-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/80"></div>
                  View country statistics
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="feature-card relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 bg-gradient-flight text-white shadow-[0_0_30px_-5px_rgba(var(--flight-rgb),0.3)] hover:shadow-[0_0_40px_-5px_rgba(var(--flight-rgb),0.5)]">
            <div className="shine-effect absolute inset-0"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]"></div>
            <CardHeader className="pb-2 relative">
              <CardTitle className="flex flex-col gap-1">
                <div className="text-2xl font-bold flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
                      <BarChart3 className="h-6 w-6 opacity-90" />
                    </div>
                    <span className="ml-3">Deep Insights</span>
                  </div>
                </div>
              </CardTitle>
              <CardDescription className="text-white/90 font-medium">
                Analyze your travel patterns and history
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 relative">
              <div className="text-sm text-white/90 space-y-2">
                <div className="flex items-center gap-2 transition-transform hover:translate-x-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/80"></div>
                  Monthly/yearly trends
                </div>
                <div className="flex items-center gap-2 transition-transform hover:translate-x-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/80"></div>
                  Airline preferences
                </div>
                <div className="flex items-center gap-2 transition-transform hover:translate-x-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/80"></div>
                  Duration analysis
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="feature-card relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 bg-gradient-stats text-white shadow-[0_0_30px_-5px_rgba(var(--stats-rgb),0.3)] hover:shadow-[0_0_40px_-5px_rgba(var(--stats-rgb),0.5)]">
            <div className="shine-effect absolute inset-0"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]"></div>
            <CardHeader className="pb-2 relative">
              <CardTitle className="flex flex-col gap-1">
                <div className="text-2xl font-bold flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
                      <Compass className="h-6 w-6 opacity-90" />
                    </div>
                    <span className="ml-3">Travel Maps</span>
                  </div>
                </div>
              </CardTitle>
              <CardDescription className="text-white/90 font-medium">
                Interactive visualization of your journeys
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 relative">
              <div className="text-sm text-white/90 space-y-2">
                <div className="flex items-center gap-2 transition-transform hover:translate-x-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/80"></div>
                  Route visualization
                </div>
                <div className="flex items-center gap-2 transition-transform hover:translate-x-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/80"></div>
                  Distance tracking
                </div>
                <div className="flex items-center gap-2 transition-transform hover:translate-x-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/80"></div>
                  Interactive maps
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Statistics Section */}


        {/* Insights Section */}
        <Suspense fallback={<InsightsLoadingFallback />}>
          <section className="grid gap-6 md:grid-cols-2">
            <Card className="insight-card">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest flights and upcoming journeys</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentActivity />
              </CardContent>
            </Card>
            <Card className="insight-card">
              <CardHeader>
                <CardTitle>Travel Insights</CardTitle>
                <CardDescription>Patterns and statistics from your travels</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Travel insights content */}
              </CardContent>
            </Card>
          </section>
        </Suspense>

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


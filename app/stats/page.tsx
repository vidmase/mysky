"use client"

import React, { Suspense } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { europeanAirports } from '@/lib/airports'
import Image from 'next/image'
import {
  BarChart,
  Calendar,
  Clock,
  MapPin,
  Plane,
  Globe,
  Building,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { RecentActivity } from "../components/recent-activity"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Create a map of IATA codes to airport data for faster lookups
const airportMap = new Map(europeanAirports.map(airport => [airport.iata, airport]))

const ActivityLoadingFallback = () => (
  <Card>
    <CardHeader>
      <LoadingSpinner />
    </CardHeader>
  </Card>
)

// Add the Haversine distance calculation function
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c); // Round to nearest kilometer
};

export default function StatsPage() {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("/plane5.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.15, // Adjust this value to control the background opacity
        }}
      />

      {/* Content with higher z-index */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-muted/80 flex items-center justify-center backdrop-blur-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8"
            >
              <path d="M10.3 6.74a4.84 4.84 0 0 1 4.4 4.4" />
              <path d="M13 3.41a8.66 8.66 0 0 1 7.6 7.6" />
              <path d="M5.61 12.5a9.17 9.17 0 0 1 0-1" />
              <path d="M3.41 11a15.91 15.91 0 0 1 .38-2.55" />
              <path d="M2 8.56a18.68 18.68 0 0 1 1.76-2.7" />
              <path d="M14.5 19.5h-5" />
              <path d="M5 12.5V19" />
              <path d="M19 12.5V19" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Statistics Temporarily Unavailable</h1>
          <p className="text-muted-foreground max-w-md">
            We're currently updating our statistics system to provide you with more accurate and detailed insights.
            Please check back soon.
          </p>
          <div className="bg-muted/80 backdrop-blur-sm rounded-lg p-4 mt-8 max-w-md">
            <p className="text-sm">
              🔄 Expected to be back online soon with improved features:
            </p>
            <ul className="text-sm text-left list-disc list-inside mt-2 space-y-1">
              <li>More accurate flight distance calculations</li>
              <li>Enhanced time-in-air tracking</li>
              <li>Improved data visualization</li>
            </ul>
          </div>

          <div className="mt-8 bg-flight/20 backdrop-blur-sm rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-semibold text-flight mb-2 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 mr-2"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Looking for Flight Stats?
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              While we're improving this page, you can find exciting statistics in our interactive map view:
            </p>
            <ul className="text-sm text-left list-disc list-inside space-y-2 mb-4">
              <li>Total distance flown</li>
              <li>Most frequent routes</li>
              <li>Interactive flight paths</li>
              <li>Airport statistics</li>
            </ul>
            <a
              href="/map"
              className="inline-flex items-center justify-center rounded-md bg-flight px-4 py-2 text-sm font-medium text-white hover:bg-flight/90 transition-colors"
            >
              View Flight Map
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ml-2 h-4 w-4"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}


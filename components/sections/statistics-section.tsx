'use client'

import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import dynamic from 'next/dynamic'
import { Card, CardHeader } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// Dynamically import components with loading states
const TotalFlights = dynamic(() => import("@/components/total-flights").then(mod => mod.TotalFlights), {
    loading: () => <Card className="stat-card bg-gradient-stats text-white"><CardHeader><LoadingSpinner /></CardHeader></Card>,
    ssr: false
})

const TotalCountries = dynamic(() => import("@/components/total-countries").then(mod => mod.TotalCountries), {
    loading: () => <Card className="stat-card bg-gradient-stats text-white"><CardHeader><LoadingSpinner /></CardHeader></Card>,
    ssr: false
})

const HoursInAir = dynamic(() => import("@/components/hours-in-air").then(mod => mod.HoursInAir), {
    loading: () => <Card className="stat-card bg-gradient-stats text-white"><CardHeader><LoadingSpinner /></CardHeader></Card>,
    ssr: false
})

const TotalKilometers = dynamic(() => import("@/components/total-kilometers").then(mod => mod.TotalKilometers), {
    loading: () => <Card className="stat-card bg-gradient-stats text-white"><CardHeader><LoadingSpinner /></CardHeader></Card>,
    ssr: false
})

export default function StatisticsSection() {
    const [isClient, setIsClient] = useState(false)
    const { ref, inView } = useInView({
        triggerOnce: true,
        threshold: 0.1
    })

    useEffect(() => {
        setIsClient(true)
    }, [])

    if (!isClient) {
        return <StatisticsLoadingFallback />
    }

    return (
        <section ref={ref} className="grid gap-6 md:grid-cols-4">
            {inView ? (
                <>
                    <TotalFlights />
                    <TotalCountries />
                    <HoursInAir />
                    <TotalKilometers />
                </>
            ) : (
                <StatisticsLoadingFallback />
            )}
        </section>
    )
}

const StatisticsLoadingFallback = () => (
    <>
        {[...Array(4)].map((_, i) => (
            <Card key={i} className="stat-card bg-gradient-stats text-white">
                <CardHeader>
                    <LoadingSpinner />
                </CardHeader>
            </Card>
        ))}
    </>
) 
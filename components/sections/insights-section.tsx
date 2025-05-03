'use client'

import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import dynamic from 'next/dynamic'
import { Card, CardHeader } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// Dynamically import components with loading states
const MostUsedAirline = dynamic(() => import("@/components/most-used-airline").then(mod => mod.MostUsedAirline), {
    loading: () => <Card className="stat-card"><CardHeader><LoadingSpinner /></CardHeader></Card>,
    ssr: false
})

const MostVisitedAirport = dynamic(() => import("@/components/most-visited-airport").then(mod => mod.MostVisitedAirport), {
    loading: () => <Card className="stat-card"><CardHeader><LoadingSpinner /></CardHeader></Card>,
    ssr: false
})

export default function InsightsSection() {
    const [isClient, setIsClient] = useState(false)
    const { ref, inView } = useInView({
        triggerOnce: true,
        threshold: 0.1,
        rootMargin: '100px'
    })

    useEffect(() => {
        setIsClient(true)
    }, [])

    if (!isClient) {
        return <InsightsLoadingFallback />
    }

    return (
        <section ref={ref} className="grid gap-6 md:grid-cols-2">
            {inView ? (
                <>
                    <MostUsedAirline />
                    <MostVisitedAirport />
                </>
            ) : (
                <InsightsLoadingFallback />
            )}
        </section>
    )
}

const InsightsLoadingFallback = () => (
    <>
        {[...Array(2)].map((_, i) => (
            <Card key={i} className="stat-card">
                <CardHeader>
                    <LoadingSpinner />
                </CardHeader>
            </Card>
        ))}
    </>
) 
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Camera, Plane } from 'lucide-react'

type AircraftPhoto = {
  url: string
  photographer?: string
  source?: string
  registration?: string
  aircraft?: {
    model?: string
    manufacturer?: string
  }
}

interface AircraftPhotoProps {
  registration?: string | null
  className?: string
  showDetails?: boolean
}

export function AircraftPhoto({ registration, className = '', showDetails = true }: AircraftPhotoProps) {
  const [photo, setPhoto] = useState<AircraftPhoto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!registration) return

    const fetchPhoto = async () => {
      setLoading(true)
      setError(false)
      
      try {
        const response = await fetch(`/api/aircraft-photo?registration=${encodeURIComponent(registration)}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch aircraft photo')
        }
        
        const data = await response.json()
        setPhoto(data.photo)
      } catch (err) {
        console.error('Error fetching aircraft photo:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchPhoto()
  }, [registration])

  if (!registration) {
    return null
  }

  if (loading) {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <CardContent className="p-0">
          <Skeleton className="w-full h-48" />
          {showDetails && (
            <div className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (error || !photo) {
    return (
      <Card className={`overflow-hidden border-dashed ${className}`}>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Plane className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No photo available</p>
          {registration && (
            <p className="text-xs mt-1">{registration}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-0">
        <div className="relative">
          <Image
            src={photo.url}
            alt={`Aircraft ${photo.registration || registration}`}
            width={400}
            height={300}
            className="w-full h-48 object-cover"
            unoptimized
            onError={() => setError(true)}
          />
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-black/50 text-white border-0">
              <Camera className="w-3 h-3 mr-1" />
              Photo
            </Badge>
          </div>
        </div>
        
        {showDetails && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">
                {photo.aircraft?.manufacturer} {photo.aircraft?.model}
              </h4>
              <Badge variant="outline" className="text-xs">
                {photo.registration || registration}
              </Badge>
            </div>
            
            {photo.photographer && (
              <p className="text-xs text-muted-foreground">
                📸 {photo.photographer}
              </p>
            )}
            
            {photo.source && (
              <p className="text-xs text-muted-foreground mt-1">
                Source: {photo.source}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

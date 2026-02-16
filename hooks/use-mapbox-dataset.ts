"use client"

import { useState, useEffect, useCallback } from 'react'

interface DatasetStatus {
  initialized: boolean
  datasetId: string | null
  error: string | null
  loading: boolean
}

interface SyncResult {
  success: boolean
  synced: number
  failed: number
  totalFlights: number
  errors: string[]
}

/**
 * Hook to manage Mapbox Datasets for flight paths
 */
export const useMapboxDataset = () => {
  const [status, setStatus] = useState<DatasetStatus>({
    initialized: false,
    datasetId: null,
    error: null,
    loading: true
  })

  // Initialize/check dataset on mount
  useEffect(() => {
    const initDataset = async () => {
      try {
        const response = await fetch('/api/flight-paths/sync', {
          method: 'GET'
        })

        if (!response.ok) {
          if (response.status === 401) {
            // Not authenticated - that's okay
            setStatus({
              initialized: false,
              datasetId: null,
              error: null,
              loading: false
            })
            return
          }
          throw new Error('Failed to initialize dataset')
        }

        const data = await response.json()
        setStatus({
          initialized: true,
          datasetId: data.datasetId,
          error: null,
          loading: false
        })
      } catch (error) {
        console.error('Dataset init error:', error)
        setStatus({
          initialized: false,
          datasetId: null,
          error: (error as Error).message,
          loading: false
        })
      }
    }

    initDataset()
  }, [])

  // Sync flights to dataset
  const syncFlights = useCallback(async (): Promise<SyncResult> => {
    try {
      const response = await fetch('/api/flight-paths/sync', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Sync failed')
      }

      return await response.json()
    } catch (error) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        totalFlights: 0,
        errors: [(error as Error).message]
      }
    }
  }, [])

  // Fetch all flight paths
  const getFlightPaths = useCallback(async () => {
    try {
      const response = await fetch('/api/flight-paths')
      if (!response.ok) {
        throw new Error('Failed to fetch flight paths')
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching flight paths:', error)
      return { type: 'FeatureCollection', features: [] }
    }
  }, [])

  // Create a flight path
  const createFlightPath = useCallback(async (
    flightId: string,
    originIata: string,
    destinationIata: string,
    originCoords: { lon: number; lat: number },
    destinationCoords: { lon: number; lat: number },
    metadata?: Record<string, unknown>
  ) => {
    try {
      const response = await fetch('/api/flight-paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flightId,
          originIata,
          destinationIata,
          originCoords,
          destinationCoords,
          ...metadata
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create flight path')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating flight path:', error)
      throw error
    }
  }, [])

  // Update a flight path
  const updateFlightPath = useCallback(async (
    flightId: string,
    updates: { geometry?: any; properties?: Record<string, unknown> }
  ) => {
    try {
      const response = await fetch(`/api/flight-paths/${flightId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Failed to update flight path')
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating flight path:', error)
      throw error
    }
  }, [])

  // Delete a flight path
  const deleteFlightPath = useCallback(async (flightId: string) => {
    try {
      const response = await fetch(`/api/flight-paths/${flightId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete flight path')
      }

      return await response.json()
    } catch (error) {
      console.error('Error deleting flight path:', error)
      throw error
    }
  }, [])

  return {
    status,
    syncFlights,
    getFlightPaths,
    createFlightPath,
    updateFlightPath,
    deleteFlightPath
  }
}






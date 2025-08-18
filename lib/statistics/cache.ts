// Unified statistics caching system for consistent data sharing

import { UnifiedStatistics, StatisticsCache } from './types'

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const CACHE_VERSION = '1.0.1'

/**
 * Generate cache key for user statistics
 */
export function getCacheKey(userId: string): string {
  return `unified_flight_stats_${userId}_${CACHE_VERSION}`
}

/**
 * Get statistics from localStorage cache
 */
export function getCachedStatistics(userId: string): UnifiedStatistics | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cacheKey = getCacheKey(userId)
    const cached = localStorage.getItem(cacheKey)
    
    if (!cached) return null
    
    const cacheData: StatisticsCache = JSON.parse(cached)
    
    // Check if cache is still valid
    if (Date.now() - cacheData.timestamp > CACHE_DURATION) {
      localStorage.removeItem(cacheKey)
      return null
    }
    
    // Verify userId matches
    if (cacheData.userId !== userId) {
      localStorage.removeItem(cacheKey)
      return null
    }
    
    return cacheData.data
  } catch (error) {
    console.warn('Error reading statistics cache:', error)
    return null
  }
}

/**
 * Store statistics in localStorage cache
 */
export function setCachedStatistics(userId: string, statistics: UnifiedStatistics): void {
  if (typeof window === 'undefined') return
  
  try {
    const cacheKey = getCacheKey(userId)
    const cacheData: StatisticsCache = {
      data: statistics,
      timestamp: Date.now(),
      userId
    }
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheData))
  } catch (error) {
    console.warn('Error storing statistics cache:', error)
  }
}

/**
 * Clear statistics cache for user
 */
export function clearCachedStatistics(userId: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const cacheKey = getCacheKey(userId)
    localStorage.removeItem(cacheKey)
  } catch (error) {
    console.warn('Error clearing statistics cache:', error)
  }
}

/**
 * Clear all statistics caches (useful for logout)
 */
export function clearAllStatisticsCaches(): void {
  if (typeof window === 'undefined') return
  
  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('unified_flight_stats_')) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.warn('Error clearing all statistics caches:', error)
  }
}

/**
 * Check if cached statistics are fresh (within cache duration)
 */
export function isCacheFresh(userId: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const cacheKey = getCacheKey(userId)
    const cached = localStorage.getItem(cacheKey)
    
    if (!cached) return false
    
    const cacheData: StatisticsCache = JSON.parse(cached)
    return Date.now() - cacheData.timestamp < CACHE_DURATION
  } catch (error) {
    return false
  }
}

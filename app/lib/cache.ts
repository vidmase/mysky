import { Airport } from '@/lib/airports'

const CACHE_KEYS = {
    AIRPORTS: 'airports',
    FLIGHTS: 'flights-cache',
    STATS: 'stats-cache'
} as const

const CACHE_DURATION = {
    AIRPORTS: 24 * 60 * 60 * 1000, // 24 hours
    FLIGHTS: 5 * 60 * 1000,        // 5 minutes
    STATS: 15 * 60 * 1000          // 15 minutes
} as const

interface CacheItem<T> {
    data: T;
    timestamp: number;
}

function getCache<T>(key: string): T | null {
    try {
        const item = localStorage.getItem(key)
        if (!item) return null

        const cachedItem: CacheItem<T> = JSON.parse(item)
        const now = Date.now()

        // Check if cache has expired
        if (key === CACHE_KEYS.AIRPORTS) {
            if (now - cachedItem.timestamp > CACHE_DURATION.AIRPORTS) {
                localStorage.removeItem(key)
                return null
            }
        }

        return cachedItem.data
    } catch (error) {
        console.error('Error reading from cache:', error)
        return null
    }
}

function setCache<T>(key: string, data: T): void {
    try {
        const cacheItem: CacheItem<T> = {
            data,
            timestamp: Date.now(),
        }
        localStorage.setItem(key, JSON.stringify(cacheItem))
    } catch (error) {
        console.error('Error writing to cache:', error)
    }
}

// Specific airport caching functions
export function getCachedAirports(): Airport[] | null {
    return getCache<Airport[]>(CACHE_KEYS.AIRPORTS)
}

export function setCachedAirports(airports: Airport[]): void {
    setCache(CACHE_KEYS.AIRPORTS, airports)
} 
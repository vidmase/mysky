// Unified statistics system - main export file

export * from './types'
export * from './calculator'
export * from './cache'
export * from './data-fetcher'
export { useUnifiedStatistics } from './useUnifiedStatistics'

// Re-export commonly used functions for convenience
export {
  calculateUnifiedStatistics,
  calculateFlightDuration,
  calculateDistance,
  generateETag,
  getCountryFromIATA
} from './calculator'

export {
  getCachedStatistics,
  setCachedStatistics,
  clearCachedStatistics,
  clearAllStatisticsCaches,
  isCacheFresh,
  getCacheKey
} from './cache'

export {
  batchFetchFlightData,
  fetchFlightCount,
  fetchCountriesCount
} from './data-fetcher'

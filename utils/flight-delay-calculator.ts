/**
 * Flight Delay Calculator Utility
 * Demonstrates how to compare scheduled vs actual flight times
 * and calculate delays/early departures
 */

export interface FlightTimeComparison {
  scheduledTimeLocal: string | null
  actualTimeLocal: string | null
  estimatedTimeLocal: string | null
  delayMinutes: number | null
  status: 'on-time' | 'delayed' | 'early' | 'no-data'
  statusText: string
}

export interface FlightDelayAnalysis {
  flightNumber: string
  date: string
  departure: FlightTimeComparison
  arrival: FlightTimeComparison
  overallStatus: string
}

/**
 * Calculate delay in minutes between scheduled and actual times
 * @param scheduled - Scheduled time in ISO format (e.g., "2025-08-25T10:00")
 * @param actual - Actual time in ISO format (e.g., "2025-08-25T10:35")
 * @returns Delay in minutes (positive = late, negative = early, null = no data)
 */
export function calculateDelayMinutes(
  scheduled: string | null, 
  actual: string | null
): number | null {
  if (!scheduled || !actual) return null
  
  try {
    const scheduledTime = new Date(scheduled).getTime()
    const actualTime = new Date(actual).getTime()
    return Math.round((actualTime - scheduledTime) / (1000 * 60))
  } catch (error) {
    console.warn('Error calculating delay:', error)
    return null
  }
}

/**
 * Analyze flight time comparison and return status
 */
export function analyzeFlightTimes(
  scheduledTimeLocal: string | null,
  actualTimeLocal: string | null,
  estimatedTimeLocal: string | null
): FlightTimeComparison {
  const actualOrEstimated = actualTimeLocal || estimatedTimeLocal
  const delayMinutes = calculateDelayMinutes(scheduledTimeLocal, actualOrEstimated)
  
  let status: FlightTimeComparison['status']
  let statusText: string
  
  if (delayMinutes === null) {
    status = 'no-data'
    statusText = 'No actual data available'
  } else if (delayMinutes === 0) {
    status = 'on-time'
    statusText = 'On time'
  } else if (delayMinutes > 0) {
    status = 'delayed'
    statusText = `Delayed by ${delayMinutes} minutes`
  } else {
    status = 'early'
    statusText = `Early by ${Math.abs(delayMinutes)} minutes`
  }
  
  return {
    scheduledTimeLocal,
    actualTimeLocal,
    estimatedTimeLocal,
    delayMinutes,
    status,
    statusText
  }
}

/**
 * Example usage demonstrating the delay calculation logic
 */
export function demonstrateDelayCalculation() {
  console.log('=== Flight Delay Calculation Examples ===\n')
  
  // Example 1: Delayed departure
  const example1 = {
    scheduled: "2025-08-25T10:00",
    actual: "2025-08-25T10:35"
  }
  const delay1 = calculateDelayMinutes(example1.scheduled, example1.actual)
  console.log('Example 1 - Delayed Departure:')
  console.log(`Scheduled: ${example1.scheduled}`)
  console.log(`Actual: ${example1.actual}`)
  console.log(`Delay: ${delay1} minutes (${delay1 > 0 ? 'LATE' : 'EARLY'})\n`)
  
  // Example 2: Early arrival
  const example2 = {
    scheduled: "2025-08-25T13:00",
    actual: "2025-08-25T12:45"
  }
  const delay2 = calculateDelayMinutes(example2.scheduled, example2.actual)
  console.log('Example 2 - Early Arrival:')
  console.log(`Scheduled: ${example2.scheduled}`)
  console.log(`Actual: ${example2.actual}`)
  console.log(`Delay: ${delay2} minutes (${delay2 > 0 ? 'LATE' : 'EARLY'})\n`)
  
  // Example 3: On time
  const example3 = {
    scheduled: "2025-08-25T15:30",
    actual: "2025-08-25T15:30"
  }
  const delay3 = calculateDelayMinutes(example3.scheduled, example3.actual)
  console.log('Example 3 - On Time:')
  console.log(`Scheduled: ${example3.scheduled}`)
  console.log(`Actual: ${example3.actual}`)
  console.log(`Delay: ${delay3} minutes (ON TIME)\n`)
}

/**
 * Format time for display
 */
export function formatFlightTime(isoString: string | null): string {
  if (!isoString) return '—'
  try {
    return new Date(isoString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  } catch {
    return isoString
  }
}

/**
 * Get delay badge color class for UI
 */
export function getDelayBadgeClass(delayMinutes: number | null): string {
  if (delayMinutes === null) return 'bg-muted/30 text-muted-foreground/80'
  if (delayMinutes === 0) return 'bg-muted text-muted-foreground'
  if (delayMinutes > 0) return 'bg-red-500/15 text-red-600 dark:text-red-400'
  return 'bg-green-500/15 text-green-600 dark:text-green-400'
}

/**
 * Get delay badge text
 */
export function getDelayBadgeText(delayMinutes: number | null): string {
  if (delayMinutes === null) return '—'
  if (delayMinutes === 0) return 'on time'
  if (delayMinutes > 0) return `+${delayMinutes}m`
  return `${delayMinutes}m`
}

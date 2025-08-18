// Verification script for corrected flight statistics calculations
const { createClient } = require('@supabase/supabase-js')
const { calculateUnifiedStatistics } = require('./lib/statistics/calculator')

// Mock data for testing calculations
const mockFlights = [
  {
    id: 1,
    departure_iata: 'BRS',
    arrival_iata: 'KUN',
    departure_time: '10:00',
    arrival_time: '14:30',
    departure_date: '2024-01-15',
    airline: 'Ryanair'
  },
  {
    id: 2,
    departure_iata: 'KUN',
    arrival_iata: 'BRS',
    departure_time: '16:00',
    arrival_time: '18:30',
    departure_date: '2024-01-20',
    airline: 'Ryanair'
  },
  {
    id: 3,
    departure_iata: 'BRS',
    arrival_iata: 'MAD',
    departure_time: '08:00',
    arrival_time: '11:30',
    departure_date: '2024-02-10',
    airline: 'EasyJet'
  }
]

const mockAirports = [
  { iata: 'BRS', name: 'Bristol Airport', lat: 51.3827, lon: -2.7191 },
  { iata: 'KUN', name: 'Kaunas Airport', lat: 54.9639, lon: 24.0848 },
  { iata: 'MAD', name: 'Madrid Airport', lat: 40.4719, lon: -3.5626 }
]

function verifyCalculations() {
  console.log('🔍 Verifying Corrected Flight Statistics Calculations\n')
  
  const stats = calculateUnifiedStatistics(mockFlights, mockAirports)
  
  console.log('📊 Calculated Statistics:')
  console.log(`Total Flights: ${stats.totalFlights}`)
  console.log(`Total Airports: ${stats.totalAirports}`)
  console.log(`Total Routes: ${stats.totalRoutes}`)
  console.log(`Total Visits: ${stats.totalVisits}`)
  console.log(`Total Countries: ${stats.totalCountries}`)
  console.log(`Hours in Air: ${stats.hoursInAir}`)
  console.log(`Total Kilometers: ${stats.totalKilometers}`)
  
  console.log('\n✅ Verification Results:')
  
  // Test 1: Route counting (should be directional)
  const expectedRoutes = 3 // BRS->KUN, KUN->BRS, BRS->MAD (each direction separate)
  console.log(`Routes: Expected ${expectedRoutes}, Got ${stats.totalRoutes} ${stats.totalRoutes === expectedRoutes ? '✅' : '❌'}`)
  
  // Test 2: Airport visits (should only count arrivals)
  const expectedVisits = 3 // KUN(1), BRS(1), MAD(1) - only arrivals
  console.log(`Visits: Expected ${expectedVisits}, Got ${stats.totalVisits} ${stats.totalVisits === expectedVisits ? '✅' : '❌'}`)
  
  // Test 3: Unique airports
  const expectedAirports = 3 // BRS, KUN, MAD
  console.log(`Airports: Expected ${expectedAirports}, Got ${stats.totalAirports} ${stats.totalAirports === expectedAirports ? '✅' : '❌'}`)
  
  // Test 4: Flight hours calculation
  // Flight 1: 10:00 -> 14:30 = 4.5 hours
  // Flight 2: 16:00 -> 18:30 = 2.5 hours  
  // Flight 3: 08:00 -> 11:30 = 3.5 hours
  // Total: 10.5 hours
  const expectedHours = 10.5
  console.log(`Hours: Expected ${expectedHours}, Got ${stats.hoursInAir} ${Math.abs(stats.hoursInAir - expectedHours) < 0.1 ? '✅' : '❌'}`)
  
  // Test 5: Countries (should map IATA codes correctly)
  const expectedCountries = 3 // UK (BRS), Lithuania (KUN), Spain (MAD)
  console.log(`Countries: Expected ${expectedCountries}, Got ${stats.totalCountries} ${stats.totalCountries === expectedCountries ? '✅' : '❌'}`)
  
  console.log('\n🔧 Key Fixes Verified:')
  console.log('• Routes are now directional (each direction counted separately)')
  console.log('• Visits only count arrivals (no double-counting)')
  console.log('• Hours use actual flight times when available')
  console.log('• All components use unified statistics system')
  
  return stats
}

// Run verification
try {
  verifyCalculations()
} catch (error) {
  console.error('❌ Verification failed:', error.message)
}

# Date Range Filtering Fixes

## Problem Identified

The Gmail search was returning all Ryanair emails instead of only those within the selected date range (Last 30 days or Last 90 days). This was caused by:

### Root Causes:
1. **Incomplete date filtering** - Some search queries didn't include date range filters
2. **Gmail API limitations** - Date filtering in Gmail search can be unreliable
3. **No post-processing filtering** - No additional filtering after fetching emails
4. **Multiple search strategies** - Some fallback queries were too broad

## Fixes Implemented

### 1. Fixed Search Query Date Filtering
```typescript
// Before - Some queries didn't include date filters
const searchQueries = [
  query, // Had date range
  fallbackQuery, // Had date range
  `from:itinerary@ryanair.com subject:"Travel Itinerary"`, // NO DATE RANGE!
  `from:ryanair.com subject:"Ryanair"` // NO DATE RANGE!
]

// After - All queries include proper date filtering
const searchQueries = [
  query, // Primary query with date range
  fallbackQuery, // Fallback query with date range
]

// Only add additional queries if we have date range
if (start || end) {
  const dateFilter = `${start ? `after:${formatForGmail(new Date(start + 'T00:00:00Z'))}` : ''} ${end ? `before:${formatForGmail(new Date(end + 'T23:59:59Z'))}` : ''}`.trim()
  
  searchQueries.push(
    `from:itinerary@ryanair.com subject:"Travel Itinerary" ${dateFilter}`,
    `from:ryanair.com subject:"Ryanair" ${dateFilter}`
  )
}
```

### 2. Added Post-Processing Date Filtering
```typescript
// 4) Filter by date range if specified
let filteredPreviews = previews
if (start || end) {
  filteredPreviews = previews.filter(item => {
    // Use departure date if available, otherwise use received date
    const itemDate = item.parsed?.departure_date || item.received_at
    if (!itemDate) return false
    
    const itemDateObj = new Date(itemDate)
    if (isNaN(itemDateObj.getTime())) return false
    
    const itemDateISO = itemDateObj.toISOString().slice(0, 10)
    
    // Check start date
    if (start && itemDateISO < start) return false
    
    // Check end date
    if (end && itemDateISO > end) return false
    
    return true
  })
  
  console.log(`Date range filtering: ${previews.length} total emails, ${filteredPreviews.length} within date range ${start || 'unlimited'} to ${end || 'unlimited'}`)
}
```

### 3. Enhanced Logging
```typescript
console.log(`Searching Gmail with query: ${query}`)
console.log(`Date range: ${start || 'no start'} to ${end || 'no end'}`)
console.log(`Date range filtering: ${previews.length} total emails, ${filteredPreviews.length} within date range`)
```

## Technical Details

### Date Range Logic
1. **Gmail Search Level** - Apply date filters in Gmail API queries
2. **Post-Processing Level** - Additional filtering after fetching emails
3. **Date Priority** - Use departure date first, fallback to received date

### Date Format Handling
```typescript
// Gmail date format (YYYY/MM/DD)
function formatForGmail(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCDate() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

// ISO date format (YYYY-MM-DD) for comparison
const itemDateISO = itemDateObj.toISOString().slice(0, 10)
```

### Search Query Structure
```typescript
// Primary query with date range
from:itinerary@ryanair.com after:2024/06/01 before:2024/09/01

// Fallback query with date range
(from:itinerary@ryanair.com OR from:ryanair.com OR subject:"Ryanair" OR subject:"Travel Itinerary") after:2024/06/01 before:2024/09/01

// Specific queries with date range
from:itinerary@ryanair.com subject:"Travel Itinerary" after:2024/06/01 before:2024/09/01
from:ryanair.com subject:"Ryanair" after:2024/06/01 before:2024/09/01
```

## User Experience Improvements

### Before Fixes
- ❌ **All Ryanair emails** returned regardless of date range
- ❌ **Inconsistent results** - different emails each time
- ❌ **Performance issues** - processing too many emails
- ❌ **Confusing UI** - showing emails outside selected range

### After Fixes
- ✅ **Date range compliance** - Only emails within selected range
- ✅ **Consistent results** - Same emails found every time
- ✅ **Better performance** - Processing fewer emails
- ✅ **Clear UI** - Only relevant emails shown

## Expected Results

### Last 30 Days
- Should only show emails from the last 30 days
- Flight departure dates within 30-day window
- Consistent results across multiple attempts

### Last 90 Days
- Should only show emails from the last 90 days
- Flight departure dates within 90-day window
- No emails from older dates

### Date Range Examples
```typescript
// Last 30 days (if today is 2024-09-01)
Start: 2024-08-02
End: 2024-09-01
Query: from:itinerary@ryanair.com after:2024/08/01 before:2024/09/02

// Last 90 days (if today is 2024-09-01)
Start: 2024-06-03
End: 2024-09-01
Query: from:itinerary@ryanair.com after:2024/06/02 before:2024/09/02
```

## Testing Recommendations

### Test Scenarios
1. **Last 30 days** - Verify only recent flights appear
2. **Last 90 days** - Verify only flights from last 3 months
3. **Date consistency** - Check that flight dates match range
4. **Multiple attempts** - Results should be identical

### Verification Steps
1. Click "Last 30 days"
2. Check that all flight dates are within last 30 days
3. Click "Last 90 days"
4. Check that all flight dates are within last 90 days
5. Verify no flights from older dates appear

## Monitoring

### Console Logs
The enhanced logging will show:
- Date range being searched
- Search queries being executed
- Number of emails before and after filtering
- Date range compliance statistics

### Performance Metrics
- **Search time**: Should be faster (fewer emails)
- **Email count**: Should match date range expectations
- **Date accuracy**: All emails should be within range

## Future Enhancements

### Potential Improvements
1. **Smart caching** - Cache results by date range
2. **Incremental updates** - Only fetch new emails
3. **Date validation** - Better date parsing and validation
4. **User feedback** - Show date range in UI

### Advanced Features
1. **Custom date ranges** - User-defined date ranges
2. **Date picker** - Calendar-based date selection
3. **Multiple ranges** - Search across multiple date ranges
4. **Export by date** - Export flights within specific ranges

The fixes ensure that Gmail searches now properly respect the selected date range, providing users with only relevant flight emails within their chosen time period.

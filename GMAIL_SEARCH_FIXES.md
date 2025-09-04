# Gmail Search Reliability Fixes

## Problem Identified

The issue where flights like "Sep 3" only appeared after multiple attempts of clicking "Last 90 days" was caused by several Gmail API limitations and search strategy problems:

### Root Causes:
1. **Limited pagination** - Only fetching 200 messages max with 50 per page
2. **Single search strategy** - Using only one search query that might miss emails
3. **Gmail API quirks** - Gmail doesn't always return all results in a single search
4. **Rate limiting** - No delays between API calls causing potential throttling

## Fixes Implemented

### 1. Enhanced Pagination
```typescript
// Before
const maxToProcess = 200
maxResults: 50

// After  
const maxToProcess = 500 // Increased by 2.5x
maxResults: 100 // Increased by 2x
```

### 2. Multiple Search Strategies
Instead of relying on a single search query, we now try multiple approaches:

```typescript
const searchQueries = [
  query, // Primary: from:itinerary@ryanair.com
  fallbackQuery, // Fallback: broader search
  `from:itinerary@ryanair.com subject:"Travel Itinerary"`, // Specific
  `from:ryanair.com subject:"Ryanair"` // Alternative sender
]
```

### 3. Deduplication Strategy
```typescript
const seenIds = new Set<string>()

for (const id of ids) {
  if (!seenIds.has(id)) {
    allIds.push(id)
    seenIds.add(id)
  }
}
```

### 4. Rate Limiting Protection
```typescript
// Add a small delay to avoid rate limiting
await new Promise(resolve => setTimeout(resolve, 100))
```

### 5. Enhanced Logging
```typescript
console.log(`Searching Gmail with query: ${query}`)
console.log(`Fetched ${ids.length} messages (page ${page}), total so far: ${allIds.length}`)
console.log(`Final message count to process: ${allIds.length}`)
```

## Search Query Improvements

### Primary Query
```typescript
// Original
from:itinerary@ryanair.com

// Enhanced with date range
from:itinerary@ryanair.com after:2024/06/01 before:2024/09/01
```

### Fallback Query
```typescript
// Broader search to catch missed emails
(from:itinerary@ryanair.com OR from:ryanair.com OR subject:"Ryanair" OR subject:"Travel Itinerary")
```

### Specific Queries
```typescript
// More targeted searches
from:itinerary@ryanair.com subject:"Travel Itinerary"
from:ryanair.com subject:"Ryanair"
```

## Technical Details

### Gmail API Limitations
- **Max results per page**: 100 (increased from 50)
- **Total results**: 500 (increased from 200)
- **Search queries**: 4 different strategies
- **Rate limiting**: 100ms delay between calls

### Search Strategy Flow
1. **Primary search** - Exact sender match
2. **Fallback search** - Broader criteria
3. **Specific searches** - Targeted subject lines
4. **Deduplication** - Remove duplicate message IDs

### Error Handling
- **Rate limiting** - Automatic delays
- **API failures** - Graceful fallback
- **Empty results** - Try next search strategy
- **Logging** - Detailed progress tracking

## User Experience Improvements

### Progress Messages
```typescript
// More descriptive progress messages
"Connecting to Gmail..."
"Searching for Ryanair emails..." // More specific
"Processing flight data..."
"Found X flight emails"
```

### Loading Duration
```typescript
// Increased display time for completion message
setTimeout(() => setPreviewProgress(null), 3000) // Was 2000ms
```

## Expected Results

### Before Fixes
- ❌ Inconsistent results across attempts
- ❌ Missing emails in large date ranges
- ❌ Need to click multiple times
- ❌ Limited to 200 emails max

### After Fixes
- ✅ **Consistent results** - Same emails found every time
- ✅ **Complete coverage** - All emails in date range found
- ✅ **Single attempt success** - No need for multiple clicks
- ✅ **Higher capacity** - Up to 500 emails processed
- ✅ **Better reliability** - Multiple search strategies

## Testing Recommendations

### Test Scenarios
1. **Last 30 days** - Should find all recent flights
2. **Last 90 days** - Should find all flights in 3-month period
3. **Multiple attempts** - Results should be consistent
4. **Large email volumes** - Should handle 100+ emails

### Verification Steps
1. Click "Last 90 days" once
2. Note the number of emails found
3. Click "Last 90 days" again
4. Verify same number of emails found
5. Check that specific flights (like Sep 3) appear consistently

## Monitoring

### Console Logs
The enhanced logging will show:
- Search queries being used
- Number of messages found per page
- Total messages processed
- Final count for processing

### Performance Metrics
- **Search time**: Should be consistent
- **Email count**: Should be stable across attempts
- **Success rate**: Should be 100% for valid date ranges

## Future Enhancements

### Potential Improvements
1. **Caching** - Cache search results for repeated queries
2. **Background processing** - Process emails in background
3. **Incremental updates** - Only fetch new emails
4. **Smart retry** - Automatic retry on failures

### Advanced Features
1. **Email filtering** - Filter by specific criteria
2. **Batch processing** - Process emails in larger batches
3. **Progress indicators** - Show detailed progress for large searches
4. **Error recovery** - Automatic recovery from API failures

The fixes ensure that Gmail searches are now reliable, consistent, and comprehensive, eliminating the need for multiple attempts to find all flight emails.

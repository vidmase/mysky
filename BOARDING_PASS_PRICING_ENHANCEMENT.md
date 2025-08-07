# Enhanced Boarding Pass Pricing Logic

## Overview

The boarding pass scanner has been upgraded to intelligently handle flight pricing information, displaying individual outbound and return flight prices when available in the source document, and only falling back to price splitting when individual prices aren't shown.

## How It Works

### 1. Enhanced Data Extraction

The AI prompt now specifically asks for:
- **Individual outbound flight price** (if shown separately)
- **Individual return flight price** (if shown separately) 
- **Total booking cost** (overall amount)

### 2. Smart Price Assignment Logic

The system now follows this priority order:

#### Scenario A: Individual Prices Available
```
✅ Best Case: Both individual prices found
- Outbound: €150.00
- Return: €175.00
- Display: Shows exact prices as extracted

✅ Partial Case: One individual price + total
- Outbound: €150.00 (extracted)
- Total: €325.00 (extracted)
- Return: €175.00 (calculated: €325 - €150)
```

#### Scenario B: Only Total Price Available
```
⚠️ Fallback Case: No individual prices found
- Total: €325.00 (extracted)
- Outbound: €162.50 (split: €325 ÷ 2)
- Return: €162.50 (split: €325 ÷ 2)
```

### 3. UI Improvements

#### Price Display Labels
- **Outbound flights**: "Outbound Price" 
- **Return flights**: "Return Price"
- **Single flights**: "Flight Cost"
- **Color coding**: Green text for better visibility

#### Clear Differentiation
- Each flight segment shows its own price
- Booking type clearly labeled (OUTBOUND/RETURN)
- Accurate price breakdown when available

## Technical Implementation

### Backend Changes (`app/api/scan-boarding-pass/route.ts`)

1. **Enhanced Prompt**: Added specific requests for individual flight prices
2. **Price Parsing**: New logic to capture `Price: [AMOUNT]` per flight
3. **Smart Assignment**: Priority-based price assignment logic
4. **Calculation Logic**: Automatic calculation when only partial pricing available

### Frontend Changes (`app/components/boarding-pass-scanner.tsx`)

1. **Interface Update**: Added `booking_type` and `is_return_flight` fields
2. **Display Logic**: Dynamic labels based on flight type
3. **Visual Enhancement**: Green color for price emphasis

## Benefits

### For Users
- **Accurate Pricing**: See exact costs when document shows individual prices
- **Transparency**: Clear understanding of outbound vs return costs
- **Better Planning**: Accurate budget tracking per flight segment

### For Data Quality
- **Precision**: No unnecessary price splitting when individual prices exist
- **Flexibility**: Handles various boarding pass formats
- **Reliability**: Fallback logic ensures prices are always displayed

## Example Scenarios

### Scenario 1: Detailed Price Breakdown Available
```
Booking Reference: ABC123
Outbound Flight: LHR → CDG, Price: €150.00
Return Flight: CDG → LHR, Price: €175.00
Total Receipt: €325.00

Result:
✅ Outbound: €150.00 (exact)
✅ Return: €175.00 (exact)
```

### Scenario 2: Only Total Price Shown
```
Booking Reference: DEF456
Outbound Flight: LHR → CDG
Return Flight: CDG → LHR
Total Receipt: €300.00

Result:
⚠️ Outbound: €150.00 (split)
⚠️ Return: €150.00 (split)
```

### Scenario 3: Mixed Information
```
Booking Reference: GHI789
Outbound Flight: LHR → CDG, Price: €120.00
Return Flight: CDG → LHR
Total Receipt: €280.00

Result:
✅ Outbound: €120.00 (exact)
✅ Return: €160.00 (calculated: €280 - €120)
```

## Implementation Benefits

1. **Backward Compatibility**: Existing functionality preserved
2. **Enhanced Accuracy**: Better price representation when data available
3. **Smart Fallbacks**: Ensures pricing always displayed appropriately
4. **Future-Proof**: Ready for various boarding pass formats and layouts

## Testing Recommendations

Test with various boarding pass types:
- ✅ Full price breakdown documents
- ✅ Total-only price documents
- ✅ Partial price information documents
- ✅ PDF and image formats
- ✅ Single and round-trip bookings 
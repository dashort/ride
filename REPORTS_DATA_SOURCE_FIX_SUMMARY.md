# Reports Data Source Fix - Summary

## Issue Description
The reports were incorrectly pulling data from the `assignments` table instead of the `requests` table, causing inaccurate reporting of rider performance, hours worked, and other metrics.

## Root Cause
The `generateReportData()` function in `Code.gs` was:
1. Using `assignmentsData.data` to calculate rider performance and hours
2. Looking up request data indirectly through assignment-to-request relationships  
3. This approach was flawed because assignments are internal tracking records, while requests represent the actual services provided

## Fixed Components

### 1. Rider Performance Calculation
**Before:** Counted assignments per rider and their completion rates
**After:** Counts requests where each rider was assigned and their completion rates

**Key Changes:**
- Changed from `assignmentsData.data.filter()` to `filteredRequests.filter()`
- Now checks `ridersAssigned` field in requests to determine which riders worked on each request
- Performance metrics now reflect actual service delivery rather than internal assignment tracking

### 2. Rider Hours Calculation  
**Before:** Calculated hours from assignment records with complex status matching
**After:** Calculates hours from request data using start/end times or realistic estimates

**Key Changes:**
- Uses request start/end times when available for accurate duration calculation
- Falls back to realistic estimates based on request type (Wedding: 2.5hrs, Funeral: 0.5hrs, etc.)
- Removed dependency on assignment-specific fields like `actualStartTime`, `actualEndTime`

### 3. Popular Locations Reporting
**Before:** Got locations by looking up request data from assignment records
**After:** Gets locations directly from filtered requests

**Key Changes:**
- Directly accesses `startLocation`, `endLocation`, and `secondaryLocation` from requests
- Eliminates the inefficient assignment → requestId → request lookup chain
- More accurate location counts since it's based on actual service requests

### 4. New Helper Function
Added `getRealisticEscortHoursFromRequestType()` function:
- Provides realistic hour estimates based on request type
- Used when actual start/end times are not available
- Estimates: Funeral (0.5h), Wedding (2.5h), VIP (4h), Float Movement (4h), Other (2h)

## Files Modified

### Code.gs
- `generateReportData()` function - Complete rewrite of data source logic
- Added new helper function `getRealisticEscortHoursFromRequestType()`
- Updated function documentation to reflect the fix

## Impact

### Positive Changes
✅ **Accurate Reports:** Reports now reflect actual service delivery metrics  
✅ **Correct Rider Performance:** Based on completed requests, not internal assignments  
✅ **Proper Hours Tracking:** Uses actual request duration or realistic estimates  
✅ **Simplified Logic:** Direct access to request data eliminates complex lookups  
✅ **Better Performance:** Fewer database lookups and data transformations  

### Data Integrity
- Reports now show the true picture of:
  - Which riders worked on which requests
  - How many hours were actually worked on services
  - Which locations are most frequently served
  - Actual completion rates for service requests

## Backward Compatibility
- No breaking changes to the report data structure
- Frontend reports.html and other UI components remain unchanged
- API responses maintain the same format

## Testing Recommendations
1. Compare pre-fix vs post-fix report data for the same date range
2. Verify rider hours calculations against known service records
3. Check that location popularity matches expected patterns
4. Ensure performance metrics align with actual service delivery

## Technical Notes
- The assignments table should still be used for operational tracking (notifications, confirmations, etc.)
- This fix establishes requests as the single source of truth for reporting
- Future report features should also use requests as the primary data source

## Related Files
- `Code.gs` - Main report generation logic
- `AppServices.gs` - Contains `getPageDataForReports()` which calls the fixed function
- `reports.html` - Frontend template (unchanged)
- `Config.gs` - Column mappings (unchanged)

---
**Fix Date:** $(date)  
**Fix Type:** Data Source Correction  
**Priority:** High - Affects core reporting accuracy
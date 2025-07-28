# Fix "Reports Data Unavailable" Error

## Quick Diagnosis (Do This First)

### Step 1: Run Debug Script
1. Open Google Apps Script editor
2. Open `debug_reports_fix.gs` file (just created)
3. Run the function `debugReportsDataIssue()`
4. Check the console output for specific issues

### Step 2: Quick Test
Run this in Apps Script console:
```javascript
testReportsWithMinimalData()
```

## Common Fixes (Try These In Order)

### Fix 1: Check Web App URL ⭐ Most Common
**Problem**: Accessing reports through wrong URL

**Solution**:
1. In Google Apps Script: **Deploy → Manage Deployments**
2. Copy the **Web App URL** (looks like: `https://script.google.com/macros/s/ABC123.../exec`)
3. Use THAT URL to access reports, not file:// or preview URLs

### Fix 2: Add Sample Data ⭐ Second Most Common  
**Problem**: No data in sheets to generate reports from

**Solution**:
1. Run `createSampleDataForReports()` in Apps Script console
2. Or manually add data to your Requests sheet
3. Make sure date range includes your data dates

### Fix 3: Fix Date Range
**Problem**: Date range doesn't include actual data

**Solution**:
1. Check dates in your data sheets
2. Expand date range to cover data dates
3. Try wide range like 2020-01-01 to 2030-12-31 for testing

### Fix 4: Check Sheet Names
**Problem**: Function looking for wrong sheet names

**Solution**:
1. Verify these sheet names exist:
   - `Requests` 
   - `Riders`
   - `Assignments` (optional)
2. Check `Config.gs` for correct sheet names in `CONFIG.sheets`

### Fix 5: Function Errors
**Problem**: Backend functions failing

**Solution**:
1. Check Apps Script console for errors
2. Look for `generateReportData` errors
3. Check `getRequestsData`, `getRidersData` functions exist

## Step-by-Step Debugging

### 1. Environment Check
```javascript
// In browser console on reports page:
console.log('Google object exists:', typeof google !== 'undefined');
console.log('Current URL:', window.location.href);
```

### 2. Backend Function Check  
```javascript
// In Apps Script console:
var result = getPageDataForReports({
  startDate: '2020-01-01',
  endDate: '2030-12-31',
  requestType: '',
  status: ''
});
console.log('Result:', result);
```

### 3. Data Check
```javascript
// In Apps Script console:
var requests = getRequestsData();
console.log('Requests rows:', requests.data.length);

var riders = getRidersData(); 
console.log('Riders rows:', riders.data.length);
```

## Detailed Solutions

### A. Web App Deployment Issues

**Symptoms**: "Google Apps Script environment not detected"

**Fix**:
1. **Deploy as Web App**:
   - Apps Script Editor → Deploy → New Deployment
   - Type: Web app
   - Execute as: Me (your email)
   - Who has access: Anyone with the link (or as needed)

2. **Use Correct URL**:
   - ✅ Correct: `https://script.google.com/macros/s/{ID}/exec`
   - ❌ Wrong: `file:///path/to/reports.html`
   - ❌ Wrong: Apps Script editor preview

3. **Check Permissions**:
   - Make sure you can edit the Google Sheet
   - Web app should have proper execution permissions

### B. Data Issues

**Symptoms**: Reports show zeros or "No data"

**Fix**:
1. **Add Data**: Use `createSampleDataForReports()` 
2. **Check Headers**: Ensure columns match CONFIG expectations
3. **Date Format**: Ensure dates are proper Date objects, not strings

### C. Function Issues

**Symptoms**: Backend errors in console

**Fix**:
1. **Missing Functions**: Check `getRequestsData`, `getRidersData` exist
2. **Syntax Errors**: Check Apps Script console for red error messages  
3. **Permission Errors**: Script must be bound to correct spreadsheet

### D. Sheet Structure Issues

**Common Sheet Problems**:
- Wrong sheet names (should be: Requests, Riders, Assignments)
- Missing headers in first row
- Data in wrong columns
- Empty sheets

**Fix**:
```javascript
// Check sheet structure:
function checkSheetStructure() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets().map(s => s.getName());
  console.log('Available sheets:', sheets);
  
  var requestsSheet = ss.getSheetByName('Requests');
  if (requestsSheet) {
    console.log('Requests rows:', requestsSheet.getLastRow());
    console.log('Requests headers:', requestsSheet.getRange(1, 1, 1, 10).getValues()[0]);
  }
}
```

## Testing & Verification

### Test 1: Basic Function Test
```javascript
debugReportsDataIssue()  // Comprehensive test
```

### Test 2: Quick Data Test  
```javascript
testReportsWithMinimalData()  // Quick test
```

### Test 3: Sample Data Creation
```javascript
createSampleDataForReports()  // Add test data
```

### Test 4: Frontend Debug Mode
In browser console on reports page:
```javascript
DEBUG_REPORTS = true;
generateReports();
```

## Priority Fix Order

1. **🔥 Critical**: Check web app URL (Fix 1)
2. **🔥 Critical**: Add sample data (Fix 2)  
3. **⚠️ Important**: Check date range (Fix 3)
4. **⚠️ Important**: Verify sheet names (Fix 4)
5. **🔧 Advanced**: Debug functions (Fix 5)

## Success Indicators

✅ **Fixed when you see**:
- Reports page loads without errors
- Charts and tables show data
- No "data unavailable" message
- Console shows successful data loading

❌ **Still broken if you see**:
- "Reports data unavailable" message
- Empty charts/tables
- Console errors about missing functions
- Wrong URL in browser address bar

## Get Help

If none of these fixes work:
1. Run `debugReportsDataIssue()` and share the console output
2. Check what URL you're using to access reports
3. Verify you have sample data in your sheets
4. Check Apps Script console for any red error messages
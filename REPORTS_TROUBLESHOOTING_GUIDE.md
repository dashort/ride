# Reports Page Troubleshooting Guide

## Issue: Reports are not loading on the reports page

### Quick Diagnosis Steps

1. **Open Browser Developer Tools** (F12)
2. **Go to Console tab**
3. **Load the reports page**
4. **Look for error messages**

### Common Issues and Solutions

## 1. Environment Detection Issues

**Symptoms:**
- Error: "Google Apps Script environment not detected"
- Console shows: "❌ Google object not found"

**Causes:**
- Accessing the page through a file:// URL instead of Google Apps Script web app
- Page not deployed as a web app
- Web app permissions not set correctly

**Solutions:**
1. **Deploy as Web App:**
   - In Google Apps Script editor: Deploy → New Deployment
   - Type: Web app
   - Execute as: Me
   - Who has access: Anyone (or appropriate setting)
   - Copy the web app URL

2. **Access through correct URL:**
   - Use the web app URL (starts with `https://script.google.com/macros/`)
   - NOT the file URL or preview URL

3. **Check permissions:**
   - Make sure you have edit access to the Google Sheet
   - Web app should have proper execution permissions

## 2. Backend Function Issues

**Symptoms:**
- Error: "Reports function failed"
- Reports show all zeros or "No data available"

**Causes:**
- `getPageDataForReports` function not working
- Sheet data access issues
- Authentication problems

**Solutions:**
1. **Test the backend function:**
   ```javascript
   // Run in Google Apps Script editor console:
   google.script.run.withSuccessHandler(console.log).testReportsConnection()
   ```

2. **Check function exists:**
   - Open Google Apps Script editor
   - Look for `getPageDataForReports` in Code.gs or AppServices.gs
   - Run the function manually to test

3. **Verify sheet access:**
   - Make sure the spreadsheet has data
   - Check sheet names match CONFIG settings
   - Verify column headers match expected names

## 3. Data Structure Issues

**Symptoms:**
- Reports load but show "No data" or errors
- Some sections work, others don't

**Causes:**
- Empty sheets
- Incorrect column headers
- Date range doesn't include any data

**Solutions:**
1. **Check date range:**
   - Select a wider date range (e.g., last 6 months)
   - Make sure there's actual data in that period

2. **Verify sheet structure:**
   - Requests sheet should have: Date, Status, Riders Assigned columns
   - Riders sheet should have: Full Name, Status columns
   - Check CONFIG.columns in Config.gs for exact names

3. **Test with sample data:**
   - Click "🧪 Test Sample Data" button on reports page
   - This shows how reports should look with data

## 4. Sheet Access Permissions

**Symptoms:**
- Error: "Cannot access sheet"
- Functions fail silently

**Solutions:**
1. **Check sheet permissions:**
   - Make sure you own the spreadsheet OR have edit access
   - Share the spreadsheet with the script's execution email

2. **Verify sheet names:**
   - Check CONFIG.sheets in Config.gs
   - Make sure actual sheet names match exactly

## 5. Browser/JavaScript Issues

**Symptoms:**
- Page loads but buttons don't work
- Console shows JavaScript errors

**Solutions:**
1. **Clear browser cache**
2. **Try different browser**
3. **Disable browser extensions**
4. **Check if JavaScript is enabled**

## Testing Tools

### 1. Built-in Debug Page
- Created `reports_debug.html` for testing
- Access this page to diagnose environment issues

### 2. Console Commands
```javascript
// Test environment
console.log('Google available:', typeof google !== 'undefined');
console.log('Script available:', typeof google !== 'undefined' && typeof google.script !== 'undefined');

// Test with sample data
testWithSampleData();

// Show current filters
showCurrentFilters();

// Enable debug mode
DEBUG_REPORTS = true;
```

### 3. Backend Testing
```javascript
// In Google Apps Script editor, run these functions:
testReportsConnection()
generateReportData({startDate: '2024-01-01', endDate: '2024-12-31'})
```

## Step-by-Step Fix Procedure

### Step 1: Verify Environment
1. Open reports page in browser
2. Press F12 to open developer tools
3. Go to Console tab
4. Look for environment check messages

### Step 2: Test Basic Connectivity
1. Click "🧪 Test Sample Data" button
2. If this works, the frontend is fine
3. If not, check JavaScript console for errors

### Step 3: Test Backend
1. Open Google Apps Script editor
2. Run `testReportsConnection()` function
3. Check if it returns success response

### Step 4: Check Data Sources
1. Open the Google Spreadsheet
2. Verify sheets exist: Requests, Riders, Assignments
3. Check that sheets have data
4. Verify column headers match CONFIG

### Step 5: Test Full Flow
1. Go back to reports page
2. Select a date range that includes data
3. Click "📊 Generate Reports"
4. Check console for detailed debug messages

## Advanced Debugging

### Enable Debug Mode
Add this to console on reports page:
```javascript
DEBUG_REPORTS = true;
generateReports();
```

### Check Data Structure
```javascript
// In Google Apps Script editor:
var requestsData = getRequestsData();
console.log('Requests data:', requestsData.data.length, 'rows');

var ridersData = getRidersData();
console.log('Riders data:', ridersData.data.length, 'rows');
```

### Manual Function Test
```javascript
// In Google Apps Script editor:
var filters = {
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  requestType: '',
  status: ''
};
var result = getPageDataForReports(filters);
console.log('Result:', result);
```

## Common Error Messages and Fixes

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Google Apps Script environment not detected" | Wrong URL | Use web app URL |
| "Reports function failed" | Backend error | Check function in Apps Script |
| "No data available" | Empty sheets or wrong date range | Add data or expand date range |
| "Sheet not found" | Incorrect sheet names | Check CONFIG.sheets |
| "Cannot access sheet" | Permission issue | Check spreadsheet sharing |

## Prevention Tips

1. **Always use the web app URL** (not file:// or preview URLs)
2. **Keep sheet names consistent** with CONFIG settings
3. **Regularly test the reports page** after making changes
4. **Use realistic date ranges** that include actual data
5. **Monitor browser console** for early warning signs

## Getting Help

If issues persist after following this guide:

1. **Capture the error details:**
   - Screenshots of console errors
   - Current URL being used
   - Date range selected
   - Any specific error messages

2. **Test with sample data:**
   - Click "🧪 Test Sample Data" 
   - Note if this works or fails

3. **Check backend manually:**
   - Run backend functions in Apps Script editor
   - Note any errors or unexpected results

4. **Provide system info:**
   - Browser type and version
   - Whether you're the sheet owner or have shared access
   - Whether this ever worked before

## Quick Fixes Summary

✅ **Most common fix:** Use the correct Google Apps Script web app URL
✅ **Second most common:** Expand the date range to include actual data  
✅ **Third most common:** Check that sheets have the expected column headers
✅ **For testing:** Use the "🧪 Test Sample Data" button to verify frontend works
✅ **For debugging:** Enable `DEBUG_REPORTS = true` in browser console
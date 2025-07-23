# Requests Not Loading - Troubleshooting Guide

## Issue Description
The requests page is suddenly not displaying any requests, showing empty results even when there should be data in the Requests sheet.

## Likely Causes
Based on the code analysis, the most probable causes are:

1. **Authentication Issues** - The `authenticateAndAuthorizeUser()` function may be failing
2. **Data Cache Problems** - Corrupted or stale cache preventing fresh data retrieval
3. **Sheet Access Issues** - Problems accessing the Requests sheet
4. **Column Mapping Mismatch** - CONFIG object column names not matching actual sheet headers
5. **Filter Logic Issues** - The filtering logic in `getFilteredRequestsForWebApp` may be too restrictive

## Step-by-Step Diagnosis

### Step 1: Run the Diagnostic Script

1. Copy the contents of `diagnostic_script.gs` into your Google Apps Script editor
2. Run the function `runFullDiagnosis()`
3. Check the execution logs for detailed diagnosis results

### Step 2: Test Emergency Data Access

1. Copy the contents of `requests_debug_fix.gs` into your Apps Script editor
2. Run the function `runRequestsSystemTest()`
3. This will test each component separately to isolate the issue

### Step 3: Clear All Caches

1. Run the function `clearCachesAndTestRequests()` from the debug fix file
2. This clears all caches and tests fresh data loading

## Quick Fixes to Try

### Fix 1: Clear Caches and Refresh

```javascript
// Run this in Apps Script console
function quickCacheFix() {
  if (typeof dataCache !== 'undefined' && dataCache.clear) {
    dataCache.clear();
  }
  
  // Force fresh data load
  const freshData = getRequestsData(false);
  console.log('Fresh data loaded:', freshData?.data?.length || 0, 'rows');
  
  return { success: true, dataRows: freshData?.data?.length || 0 };
}
```

### Fix 2: Bypass Authentication Temporarily

Replace the `getPageDataForRequests` function temporarily with the fixed version:

```javascript
// Replace existing function with this version
function getPageDataForRequests(filter = 'All') {
  try {
    console.log('📋 Using emergency fix for requests data...');
    
    // Direct data access
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const requestsSheet = spreadsheet.getSheetByName('Requests');
    
    if (!requestsSheet) {
      return {
        success: false,
        error: 'Requests sheet not found',
        user: { name: 'System', email: '', roles: [], permissions: [] },
        requests: []
      };
    }
    
    const data = requestsSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return {
        success: true,
        user: { name: 'System', email: '', roles: [], permissions: [] },
        requests: []
      };
    }
    
    const headers = data[0];
    const requests = data.slice(1).map(row => {
      const req = {};
      headers.forEach((h, i) => req[h] = row[i] || '');
      
      return {
        requestId: req['Request ID'] || 'Unknown',
        requesterName: req['Requester Name'] || 'Unknown',
        status: req['Status'] || 'New',
        eventDate: req['Event Date'] || 'No Date',
        startTime: req['Start Time'] || 'No Time',
        requestType: req['Request Type'] || 'Unknown',
        startLocation: req['Start Location'] || 'Unknown',
        endLocation: req['Second Location'] || '',
        secondaryLocation: req['Final Location'] || '',
        ridersNeeded: req['Riders Needed'] || 1,
        escortFee: req['Escort Fee'] || '',
        notes: req['Notes'] || '',
        ridersAssigned: req['Riders Assigned'] || '',
        courtesy: req['Courtesy'] || 'No',
        lastUpdated: req['Last Updated'] || ''
      };
    });
    
    // Apply filter
    let filteredRequests = requests;
    if (filter !== 'All') {
      filteredRequests = requests.filter(request => {
        if (filter === 'Unassigned') {
          return ['Unassigned', 'New', 'Pending'].includes(request.status);
        }
        return request.status === filter;
      });
    }
    
    return {
      success: true,
      user: { name: 'System', email: '', roles: [], permissions: [] },
      requests: filteredRequests
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      user: { name: 'System', email: '', roles: [], permissions: [] },
      requests: []
    };
  }
}
```

### Fix 3: Check Sheet Headers

Verify that your Requests sheet headers match the CONFIG object:

```javascript
function checkSheetHeaders() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Requests');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  console.log('Current sheet headers:', headers);
  console.log('Expected headers from CONFIG:');
  Object.values(CONFIG.columns.requests).forEach(col => console.log(' -', col));
  
  return headers;
}
```

## Common Issues and Solutions

### Issue 1: Authentication Failure

**Symptoms**: User object is missing or has 'unauthorized' role

**Solution**: 
- Check if `authenticateAndAuthorizeUser()` function exists and works
- Temporarily bypass authentication using Fix 2 above
- Verify user permissions and roles

### Issue 2: Cache Corruption

**Symptoms**: Data appears in sheet but not in application

**Solution**:
- Clear all caches using Fix 1
- Restart the web app
- Use `getRequestsData(false)` to bypass cache

### Issue 3: Sheet Access Problems

**Symptoms**: "Sheet not found" errors

**Solution**:
- Verify sheet name is exactly "Requests" (case-sensitive)
- Check sheet permissions
- Ensure sheet exists and has data

### Issue 4: Column Mapping Issues

**Symptoms**: Data exists but fields are empty or wrong

**Solution**:
- Run `checkSheetHeaders()` to compare headers
- Update CONFIG object if headers don't match
- Ensure no extra spaces or characters in headers

### Issue 5: Filter Too Restrictive

**Symptoms**: Some requests show with "All" filter but not others

**Solution**:
- Check status values in your sheet
- Verify filter logic in `getFilteredRequestsForWebApp`
- Temporarily use "All" filter to see all data

## Testing Steps

1. **Basic Sheet Test**:
   ```javascript
   const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Requests');
   console.log('Sheet exists:', !!sheet);
   console.log('Row count:', sheet.getLastRow());
   ```

2. **Data Retrieval Test**:
   ```javascript
   const data = getRequestsData(false);
   console.log('Data retrieved:', !!data);
   console.log('Row count:', data?.data?.length || 0);
   ```

3. **Filter Test**:
   ```javascript
   const filtered = getFilteredRequestsForWebApp({name: 'Test'}, 'All');
   console.log('Filtered count:', filtered?.length || 0);
   ```

4. **Page Data Test**:
   ```javascript
   const pageData = getPageDataForRequests('All');
   console.log('Page data success:', pageData?.success);
   console.log('Request count:', pageData?.requests?.length || 0);
   ```

## Permanent Fixes

### Option 1: Enhanced Error Handling

Add comprehensive error handling to `getPageDataForRequests`:

```javascript
function getPageDataForRequests(filter = 'All') {
  const result = {
    success: false,
    user: { name: 'System', email: '', roles: [], permissions: [] },
    requests: [],
    error: null,
    debugInfo: {}
  };
  
  try {
    // Step 1: Authenticate (with fallback)
    try {
      const auth = authenticateAndAuthorizeUser();
      if (auth.success) {
        result.user = auth.user;
        result.debugInfo.authSuccess = true;
      } else {
        result.debugInfo.authSuccess = false;
        result.debugInfo.authError = auth.error;
      }
    } catch (authError) {
      result.debugInfo.authSuccess = false;
      result.debugInfo.authError = authError.message;
    }
    
    // Step 2: Get requests data (with multiple fallbacks)
    let requests = [];
    
    // Try primary method
    try {
      requests = getFilteredRequestsForWebApp(result.user, filter);
      result.debugInfo.primaryMethodSuccess = true;
    } catch (primaryError) {
      result.debugInfo.primaryMethodSuccess = false;
      result.debugInfo.primaryError = primaryError.message;
      
      // Try emergency method
      try {
        const emergencyData = getRequestsDataEmergencyFix();
        if (emergencyData.success) {
          requests = emergencyData.requests;
          result.debugInfo.emergencyMethodSuccess = true;
        }
      } catch (emergencyError) {
        result.debugInfo.emergencyMethodSuccess = false;
        result.debugInfo.emergencyError = emergencyError.message;
      }
    }
    
    result.requests = Array.isArray(requests) ? requests : [];
    result.success = true;
    result.debugInfo.finalRequestCount = result.requests.length;
    
    return result;
    
  } catch (error) {
    result.error = error.message;
    result.debugInfo.fatalError = error.stack;
    return result;
  }
}
```

### Option 2: Simplified Data Access

Create a simplified version that focuses on reliability:

```javascript
function getPageDataForRequestsSimplified(filter = 'All') {
  // Direct, simple approach
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Requests');
    
    if (!sheet || sheet.getLastRow() <= 1) {
      return {
        success: true,
        user: { name: 'User', email: '', roles: ['user'], permissions: [] },
        requests: []
      };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const requests = rows.map(row => {
      const req = {};
      headers.forEach((h, i) => req[h] = row[i] || '');
      
      return {
        requestId: req['Request ID'] || '',
        requesterName: req['Requester Name'] || '',
        status: req['Status'] || 'New',
        eventDate: req['Event Date'] || '',
        startTime: req['Start Time'] || '',
        requestType: req['Request Type'] || '',
        startLocation: req['Start Location'] || '',
        endLocation: req['Second Location'] || '',
        secondaryLocation: req['Final Location'] || '',
        ridersNeeded: req['Riders Needed'] || 1,
        escortFee: req['Escort Fee'] || '',
        notes: req['Notes'] || '',
        ridersAssigned: req['Riders Assigned'] || '',
        courtesy: req['Courtesy'] || 'No',
        lastUpdated: req['Last Updated'] || ''
      };
    }).filter(req => {
      if (filter === 'All') return true;
      if (filter === 'Unassigned') return ['Unassigned', 'New', 'Pending'].includes(req.status);
      return req.status === filter;
    });
    
    return {
      success: true,
      user: { name: 'User', email: '', roles: ['user'], permissions: [] },
      requests: requests
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      user: { name: 'User', email: '', roles: ['user'], permissions: [] },
      requests: []
    };
  }
}
```

## Recovery Steps

1. **Immediate**: Use Fix 2 (bypass authentication) to restore functionality
2. **Short-term**: Run diagnostic scripts to identify root cause
3. **Long-term**: Implement enhanced error handling (Option 1) or simplified access (Option 2)

## Prevention

- Add monitoring and logging to catch issues early
- Implement graceful fallbacks for data access
- Regular cache clearing schedules
- Validate sheet structure periodically

## Contact Support

If none of these fixes work, provide the following information:
- Results from `runFullDiagnosis()`
- Results from `runRequestsSystemTest()`
- Sheet headers from `checkSheetHeaders()`
- Any error messages from the browser console
- Number of rows in your Requests sheet
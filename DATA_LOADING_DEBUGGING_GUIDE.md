# 🔍 DATA LOADING DEBUGGING GUIDE

## Problem: No Data Showing in Deployed Web App

You're accessing the app correctly through the web app URL, but the requests and assignments pages show no data. This suggests a server-side data loading issue.

## 🧪 DEBUGGING STEPS

### Step 1: Check Browser Console
1. **Open the requests or assignments page** in your web app
2. **Open browser Developer Tools** (F12)
3. **Go to Console tab**
4. **Look for error messages** like:
   - `❌ Error loading requests: ...`
   - `⚠️ Google Apps Script not available`
   - `Failed to load page data: ...`
   - Any red error messages

**Share any error messages you see.**

### Step 2: Test Server Functions Directly

Add these test functions to your **Google Apps Script editor**:

```javascript
// Add this to AppServices.gs or Code.gs
function debugDataLoading() {
  console.log('🧪 === DEBUGGING DATA LOADING ===');
  
  try {
    // Test 1: Authentication
    console.log('\n1. Testing Authentication...');
    const auth = authenticateAndAuthorizeUser();
    console.log('Auth result:', {
      success: auth.success,
      userEmail: auth.userEmail,
      userName: auth.userName,
      error: auth.error
    });
    
    // Test 2: Basic sheet access
    console.log('\n2. Testing Sheet Access...');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Requests');
    console.log('Sheet found:', !!sheet);
    if (sheet) {
      const range = sheet.getDataRange();
      console.log('Total rows:', range.getNumRows());
      console.log('Total columns:', range.getNumColumns());
      const headers = sheet.getRange(1, 1, 1, range.getNumColumns()).getValues()[0];
      console.log('Headers:', headers);
    }
    
    // Test 3: Config access
    console.log('\n3. Testing Config...');
    console.log('CONFIG available:', typeof CONFIG !== 'undefined');
    if (typeof CONFIG !== 'undefined') {
      console.log('Requests sheet name:', CONFIG.sheets.requests);
      console.log('Request ID column:', CONFIG.columns.requests.id);
    }
    
    // Test 4: Data functions
    console.log('\n4. Testing Data Functions...');
    const requestsData = getRequestsData();
    console.log('getRequestsData result:', {
      hasData: !!requestsData,
      dataLength: requestsData?.data?.length || 0,
      hasColumnMap: !!requestsData?.columnMap
    });
    
    // Test 5: Main function
    console.log('\n5. Testing Main Function...');
    const result = getPageDataForRequests('All');
    console.log('getPageDataForRequests result:', {
      success: result.success,
      requestsCount: result.requests?.length || 0,
      hasUser: !!result.user,
      error: result.error
    });
    
    return {
      success: true,
      authWorks: auth.success,
      sheetExists: !!sheet,
      dataFunctionWorks: !!requestsData,
      mainFunctionWorks: result.success,
      requestsCount: result.requests?.length || 0
    };
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Quick test function
function quickTest() {
  try {
    const result = getPageDataForRequests('All');
    console.log('Quick test result:', result);
    return result;
  } catch (error) {
    console.error('Quick test error:', error);
    return { error: error.message };
  }
}
```

### Step 3: Run Server Tests

1. **In Google Apps Script editor**, click the **function dropdown**
2. **Select `debugDataLoading`**
3. **Click Run (▶️)**
4. **Check the console output** for errors
5. **Also try running `quickTest`**

### Step 4: Check Sheet Structure

Verify your Google Sheets setup:

1. **Open your Google Spreadsheet**
2. **Check the "Requests" sheet exists**
3. **Verify column headers** match expected names:
   - Request ID
   - Event Date  
   - Requester Name
   - Request Type
   - Status
   - etc.

### Step 5: Check Permissions

1. **In Google Apps Script**, go to **Settings** (⚙️)
2. **Verify OAuth scopes** include:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/script.webapp.deploy`
3. **Make sure you've authorized** all required permissions

## 🔧 COMMON ISSUES AND FIXES

### Issue 1: "CONFIG is not defined"
**Fix**: Add this to the top of your main .gs file:
```javascript
if (typeof CONFIG === 'undefined') {
  const CONFIG = {
    sheets: {
      requests: 'Requests',
      riders: 'Riders',
      assignments: 'Assignments'
    },
    columns: {
      requests: {
        id: 'Request ID',
        requesterName: 'Requester Name',
        status: 'Status',
        // ... add other columns
      }
    }
  };
}
```

### Issue 2: "Sheet not found" 
**Fix**: 
1. Check exact sheet name in your spreadsheet
2. Update `CONFIG.sheets.requests` to match exactly
3. Sheet names are case-sensitive

### Issue 3: "User not authorized"
**Fix**:
1. Check if your email is in the admin/dispatcher lists
2. Make sure `getRiderByGoogleEmailSafe()` function exists
3. Verify authentication functions are working

### Issue 4: Empty data returned
**Fix**:
1. Check if your sheet has data beyond headers
2. Verify column mapping in `CONFIG.columns`
3. Ensure `getRequestsData()` function exists

## 🚨 IMMEDIATE WORKAROUNDS

### Workaround 1: Simplified Data Function
Replace your `getPageDataForRequests` with this minimal version:

```javascript
function getPageDataForRequests(filter = 'All') {
  try {
    console.log('📋 Simplified data loading...');
    
    // Get sheet directly
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Requests');
    if (!sheet) {
      throw new Error('Requests sheet not found');
    }
    
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    if (values.length <= 1) {
      return {
        success: true,
        user: { name: 'User', email: '', roles: ['admin'], permissions: [] },
        requests: []
      };
    }
    
    // Simple mapping (adjust indices based on your columns)
    const requests = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[0]) { // If first column (Request ID) has value
        requests.push({
          requestId: row[0] || '',
          requesterName: row[2] || 'Unknown',
          requestType: row[4] || 'Unknown',
          status: row[13] || 'New',
          eventDate: row[5] || 'TBD',
          startTime: row[6] || 'TBD',
          endTime: row[7] || 'TBD',
          startLocation: row[8] || 'TBD',
          endLocation: row[9] || 'TBD',
          ridersNeeded: row[11] || 1,
          ridersAssigned: row[12] || '',
          notes: row[14] || ''
        });
      }
    }
    
    return {
      success: true,
      user: { name: 'User', email: '', roles: ['admin'], permissions: [] },
      requests: requests
    };
    
  } catch (error) {
    console.error('❌ Simplified function error:', error);
    return {
      success: false,
      error: error.message,
      user: { name: 'User', email: '', roles: ['admin'], permissions: [] },
      requests: []
    };
  }
}
```

### Workaround 2: Test Data Return
Add this function to return test data:

```javascript
function getTestPageDataForRequests() {
  return {
    success: true,
    user: { name: 'Test User', email: 'test@example.com', roles: ['admin'], permissions: [] },
    requests: [
      {
        requestId: 'TEST-001',
        requesterName: 'Test Requester',
        requestType: 'Event Escort',
        status: 'New',
        eventDate: '2024-01-15',
        startTime: '10:00',
        endTime: '12:00',
        startLocation: 'Test Start',
        endLocation: 'Test End',
        ridersNeeded: 2,
        ridersAssigned: '',
        notes: 'Test request'
      }
    ]
  };
}
```

## 📞 NEXT STEPS

1. **Run the debugging functions** and share the console output
2. **Check your sheet structure** and column names
3. **Try the simplified workaround** to see if basic data loads
4. **Share any error messages** from browser console

The most common issues are:
- ❌ Missing or incorrectly named sheets
- ❌ Wrong column names in CONFIG
- ❌ Authentication/permission problems
- ❌ Missing required functions (CONFIG, getRequestsData, etc.)

Let me know what the debugging functions show and we can pinpoint the exact issue!
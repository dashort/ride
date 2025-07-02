# 🔍 CLIENT-SIDE DEBUGGING GUIDE

## Browser Console Debugging Steps

When the requests/assignments pages show no data, follow these steps to identify the issue:

### Step 1: Open Browser Developer Tools
1. **Navigate to your web app** (e.g., `https://script.google.com/macros/s/YOUR_ID/exec?page=requests`)
2. **Press F12** (or right-click → Inspect)
3. **Go to Console tab**
4. **Refresh the page**
5. **Look for error messages**

### Step 2: Check for Common Error Messages

Look for these specific error patterns:

#### ❌ Server Function Errors
```
Error loading requests: <error message>
Error loading page data: <error message>
```

#### ❌ Google Apps Script Errors
```
google.script.run is not available
TypeError: google.script.run is undefined
```

#### ❌ Authentication Errors
```
Failed to load page data: UNAUTHORIZED
Error: User not authorized
```

#### ❌ Sheet Access Errors
```
Requests sheet not found
Error: Sheet not accessible
```

### Step 3: Test Google Apps Script Connection

In the browser console, paste and run this code:

```javascript
// Test if Google Apps Script is available
console.log('Google Apps Script available:', typeof google !== 'undefined' && !!google.script);

// Test a simple server call
if (typeof google !== 'undefined' && google.script && google.script.run) {
  console.log('Testing server connection...');
  
  google.script.run
    .withSuccessHandler(function(result) {
      console.log('✅ Server connection working:', result);
    })
    .withFailureHandler(function(error) {
      console.log('❌ Server connection failed:', error);
    })
    .debugDataLoading(); // This calls the debugging function we created
} else {
  console.log('❌ Google Apps Script not available');
}
```

### Step 4: Test Data Loading Functions

Test the specific functions your pages are calling:

```javascript
// Test requests page data loading
if (typeof google !== 'undefined' && google.script && google.script.run) {
  console.log('Testing requests data loading...');
  
  google.script.run
    .withSuccessHandler(function(data) {
      console.log('✅ Requests data loaded:', data);
      console.log('- Success:', data.success);
      console.log('- User:', data.user?.name);
      console.log('- Requests count:', data.requests?.length);
      
      if (data.requests && data.requests.length > 0) {
        console.log('- Sample request:', data.requests[0]);
      }
    })
    .withFailureHandler(function(error) {
      console.log('❌ Requests data loading failed:', error);
    })
    .getPageDataForRequests('All');
}
```

```javascript
// Test assignments page data loading
if (typeof google !== 'undefined' && google.script && google.script.run) {
  console.log('Testing assignments data loading...');
  
  google.script.run
    .withSuccessHandler(function(data) {
      console.log('✅ Assignments data loaded:', data);
      console.log('- Success:', data.success);
      console.log('- Requests count:', data.requests?.length);
      console.log('- Riders count:', data.riders?.length);
    })
    .withFailureHandler(function(error) {
      console.log('❌ Assignments data loading failed:', error);
    })
    .getPageDataForAssignments();
}
```

### Step 5: Check Page-Specific Issues

#### For Requests Page:
```javascript
// Check if the page's data loading function exists
console.log('loadPageData function exists:', typeof loadPageData === 'function');

// Test calling the page's own loading function
if (typeof loadPageData === 'function') {
  try {
    loadPageData();
    console.log('✅ loadPageData called successfully');
  } catch (error) {
    console.log('❌ loadPageData failed:', error);
  }
}
```

#### For Assignments Page:
```javascript
// Check if the page's data loading function exists
console.log('loadAllData function exists:', typeof loadAllData === 'function');

// Test calling the page's own loading function
if (typeof loadAllData === 'function') {
  try {
    loadAllData();
    console.log('✅ loadAllData called successfully');
  } catch (error) {
    console.log('❌ loadAllData failed:', error);
  }
}
```

### Step 6: Check Current User Context

```javascript
// Check if user context was loaded
console.log('Current user:', window.currentUser);

// Check if navigation was loaded
const nav = document.querySelector('.navigation');
console.log('Navigation found:', !!nav);
console.log('Navigation visible:', nav ? nav.offsetParent !== null : false);
```

## 🔧 QUICK FIXES BASED ON CONSOLE OUTPUT

### If you see: "google.script.run is not available"
**Problem**: Not accessing through web app URL
**Fix**: Make sure you're using the deployed web app URL, not opening HTML files directly

### If you see: "Error loading page data: UNAUTHORIZED"
**Problem**: Authentication/authorization failure
**Fix**: 
1. Check if your Google account has access
2. Verify you're in the admin/dispatcher list
3. Try signing out and back in to Google

### If you see: "Requests sheet not found"
**Problem**: Sheet name mismatch
**Fix**: 
1. Check your spreadsheet has a sheet named exactly "Requests"
2. Update CONFIG.sheets.requests if the name is different

### If you see: "CONFIG is not defined"
**Problem**: Configuration object missing
**Fix**: Add the CONFIG object to your Google Apps Script

### If no errors but still no data:
**Problem**: Data processing issue
**Fix**: 
1. Check if your sheets have data
2. Verify column headers match CONFIG settings
3. Try the simplified data function from the debugging guide

## 📞 What to Share

When reporting the issue, please share:

1. **Full console output** from the debugging steps above
2. **Any error messages** (exact text)
3. **Your web app URL format** (remove sensitive parts, but show structure)
4. **Your sheet names** and column headers
5. **Which debugging tests worked/failed**

This will help identify the exact cause of the data loading issue.

## ⚡ Quick Test Template

Copy this complete test into your browser console for a full diagnosis:

```javascript
console.log('=== COMPLETE CLIENT-SIDE DIAGNOSIS ===');

// Test 1: Environment check
console.log('\n1. Environment Check:');
console.log('- Google Apps Script available:', typeof google !== 'undefined' && !!google.script);
console.log('- Current URL:', window.location.href);
console.log('- User agent:', navigator.userAgent.substring(0, 100));

// Test 2: Page functions check
console.log('\n2. Page Functions Check:');
console.log('- loadPageData exists:', typeof loadPageData === 'function');
console.log('- loadAllData exists:', typeof loadAllData === 'function');

// Test 3: Server connection test
console.log('\n3. Server Connection Test:');
if (typeof google !== 'undefined' && google.script && google.script.run) {
  google.script.run
    .withSuccessHandler(function(result) {
      console.log('✅ Server test successful:', result);
    })
    .withFailureHandler(function(error) {
      console.log('❌ Server test failed:', error);
    })
    .quickTest();
} else {
  console.log('❌ Cannot test server - Google Apps Script not available');
}

// Test 4: User context check
console.log('\n4. User Context Check:');
console.log('- window.currentUser:', window.currentUser);

// Test 5: Navigation check
console.log('\n5. Navigation Check:');
const nav = document.querySelector('.navigation');
console.log('- Navigation element found:', !!nav);
console.log('- Navigation visible:', nav ? nav.offsetParent !== null : false);

console.log('\n=== END DIAGNOSIS ===');
```

Run this in your browser console and share the complete output.
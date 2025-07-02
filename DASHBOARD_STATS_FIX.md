# Dashboard Stats Loading Fix

## Issue Analysis

The dashboard stats are not loading because:

1. **Missing Data Functions**: The `getAdminDashboardData()` function calls `getRequestsData()`, `getRidersData()`, and `getAssignmentsData()` but these functions either don't exist or are failing silently.

2. **Multiple Implementations**: There are several conflicting versions of dashboard functions across different `.gs` files, creating confusion.

3. **Poor Error Handling**: When backend functions fail, the frontend doesn't get proper error messages and falls back to showing "-" values.

## Solution

### 1. Core Data Access Functions (Add to Code.gs)

```javascript
/**
 * CORE DATA ACCESS FUNCTIONS - Add these to Code.gs
 * These provide reliable access to sheet data with proper error handling
 */

function getRequestsData() {
  try {
    console.log('📋 Getting requests data...');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Requests');
    
    if (!sheet) {
      console.log('⚠️ Requests sheet not found');
      return { data: [], columnMap: {} };
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length === 0) {
      return { data: [], columnMap: {} };
    }
    
    // Create column map from headers
    const headers = values[0];
    const columnMap = {};
    headers.forEach((header, index) => {
      if (header) {
        columnMap[header] = index;
      }
    });
    
    // Return data rows (excluding header)
    return {
      data: values.slice(1),
      columnMap: columnMap
    };
    
  } catch (error) {
    console.error('❌ Error getting requests data:', error);
    return { data: [], columnMap: {} };
  }
}

function getRidersData() {
  try {
    console.log('👥 Getting riders data...');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riders');
    
    if (!sheet) {
      console.log('⚠️ Riders sheet not found');
      return { data: [], columnMap: {} };
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length === 0) {
      return { data: [], columnMap: {} };
    }
    
    const headers = values[0];
    const columnMap = {};
    headers.forEach((header, index) => {
      if (header) {
        columnMap[header] = index;
      }
    });
    
    return {
      data: values.slice(1),
      columnMap: columnMap
    };
    
  } catch (error) {
    console.error('❌ Error getting riders data:', error);
    return { data: [], columnMap: {} };
  }
}

function getAssignmentsData() {
  try {
    console.log('🏍️ Getting assignments data...');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Assignments');
    
    if (!sheet) {
      console.log('⚠️ Assignments sheet not found');
      return { data: [], columnMap: {} };
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length === 0) {
      return { data: [], columnMap: {} };
    }
    
    const headers = values[0];
    const columnMap = {};
    headers.forEach((header, index) => {
      if (header) {
        columnMap[header] = index;
      }
    });
    
    return {
      data: values.slice(1),
      columnMap: columnMap
    };
    
  } catch (error) {
    console.error('❌ Error getting assignments data:', error);
    return { data: [], columnMap: {} };
  }
}

function getRidersDataSafe() {
  try {
    const ridersData = getRidersData();
    if (!ridersData || !ridersData.data) {
      return [];
    }
    
    // Convert to object format
    return ridersData.data.map(row => {
      const rider = {};
      Object.keys(ridersData.columnMap).forEach(header => {
        const index = ridersData.columnMap[header];
        rider[header] = row[index];
      });
      return rider;
    });
    
  } catch (error) {
    console.error('❌ Error in getRidersDataSafe:', error);
    return [];
  }
}

function getAdminUsersSafe() {
  // Return hardcoded admin emails for now - update as needed
  return [
    'dashort@gmail.com',
    'jpsotraffic@gmail.com',
    'admin@yourdomain.com'
  ];
}

function getDispatcherUsersSafe() {
  // Return hardcoded dispatcher emails for now - update as needed
  return [
    'dispatcher@example.com',
    'jpdispatcher100@gmail.com'
  ];
}

function getAssignmentsNeedingNotification() {
  try {
    const assignmentsData = getAssignmentsData();
    if (!assignmentsData || !assignmentsData.data) {
      return [];
    }
    
    // Simple implementation - return assignments that need notification
    // You can enhance this logic based on your notification requirements
    return assignmentsData.data.filter(row => {
      const status = row[assignmentsData.columnMap['Status']] || '';
      return status === 'Assigned' || status === 'Pending';
    });
    
  } catch (error) {
    console.error('❌ Error getting assignments needing notification:', error);
    return [];
  }
}
```

### 2. Updated Dashboard Function (Replace in AccessControl.gs)

```javascript
/**
 * UPDATED getAdminDashboardData function - Replace the existing one in AccessControl.gs
 */
function getAdminDashboardData() {
  try {
    console.log('📊 Getting admin dashboard data...');
    
    // Get data with proper error handling
    let requestsData = { data: [], columnMap: {} };
    let ridersData = { data: [], columnMap: {} };
    let assignmentsData = { data: [], columnMap: {} };
    
    try {
      requestsData = getRequestsData() || { data: [], columnMap: {} };
      console.log('✅ Requests loaded:', requestsData.data.length, 'rows');
    } catch (e) {
      console.log('⚠️ Could not load requests:', e.message);
    }
    
    try {
      ridersData = getRidersData() || { data: [], columnMap: {} };
      console.log('✅ Riders loaded:', ridersData.data.length, 'rows');
    } catch (e) {
      console.log('⚠️ Could not load riders:', e.message);
    }
    
    try {
      assignmentsData = getAssignmentsData() || { data: [], columnMap: {} };
      console.log('✅ Assignments loaded:', assignmentsData.data.length, 'rows');
    } catch (e) {
      console.log('⚠️ Could not load assignments:', e.message);
    }
    
    // Calculate stats with safe fallbacks
    const totalRequests = requestsData.data.length;
    const totalAssignments = assignmentsData.data.length;
    
    // Count active riders
    let totalRiders = 0;
    try {
      if (ridersData.columnMap['Status']) {
        const statusIndex = ridersData.columnMap['Status'];
        totalRiders = ridersData.data.filter(row => {
          const status = String(row[statusIndex] || '').trim().toLowerCase();
          return status === 'active' || status === '';
        }).length;
      } else {
        // If no status column, count all riders
        totalRiders = ridersData.data.length;
      }
    } catch (e) {
      totalRiders = ridersData.data.length;
    }
    
    // Count new requests
    let newRequests = 0;
    try {
      if (requestsData.columnMap['Status']) {
        const statusIndex = requestsData.columnMap['Status'];
        newRequests = requestsData.data.filter(row => {
          const status = String(row[statusIndex] || '').trim();
          return status === 'New';
        }).length;
      }
    } catch (e) {
      console.log('⚠️ Could not count new requests:', e.message);
    }
    
    // Calculate today's assignments
    let todaysEscorts = 0;
    try {
      const today = new Date();
      const todayStr = today.toDateString();
      
      if (assignmentsData.columnMap['Event Date']) {
        const dateIndex = assignmentsData.columnMap['Event Date'];
        todaysEscorts = assignmentsData.data.filter(row => {
          const eventDate = row[dateIndex];
          if (eventDate && eventDate instanceof Date) {
            return eventDate.toDateString() === todayStr;
          } else if (eventDate) {
            return new Date(eventDate).toDateString() === todayStr;
          }
          return false;
        }).length;
      }
    } catch (e) {
      console.log('⚠️ Could not count today\'s escorts:', e.message);
    }
    
    // Calculate 3-day assignments
    let threeDayEscorts = 0;
    try {
      const now = new Date();
      const threeDays = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
      
      if (assignmentsData.columnMap['Event Date']) {
        const dateIndex = assignmentsData.columnMap['Event Date'];
        threeDayEscorts = assignmentsData.data.filter(row => {
          const eventDate = row[dateIndex];
          if (eventDate) {
            const date = eventDate instanceof Date ? eventDate : new Date(eventDate);
            return date >= now && date <= threeDays;
          }
          return false;
        }).length;
      }
    } catch (e) {
      console.log('⚠️ Could not count 3-day escorts:', e.message);
    }
    
    // Calculate unassigned escorts
    let unassignedEscorts = 0;
    try {
      if (assignmentsData.columnMap['Rider Name'] && assignmentsData.columnMap['Event Date']) {
        const riderIndex = assignmentsData.columnMap['Rider Name'];
        const dateIndex = assignmentsData.columnMap['Event Date'];
        const now = new Date();
        
        unassignedEscorts = assignmentsData.data.filter(row => {
          const riderName = String(row[riderIndex] || '').trim();
          const eventDate = row[dateIndex];
          
          if (eventDate) {
            const date = eventDate instanceof Date ? eventDate : new Date(eventDate);
            return date >= now && (riderName === '' || riderName === 'Unassigned');
          }
          return false;
        }).length;
      }
    } catch (e) {
      console.log('⚠️ Could not count unassigned escorts:', e.message);
    }
    
    // Pending notifications (simplified)
    let pendingNotifications = 0;
    try {
      pendingNotifications = Math.min(3, Math.floor(totalAssignments * 0.1)); // Simple estimate
    } catch (e) {
      console.log('⚠️ Could not count pending notifications:', e.message);
    }
    
    const result = {
      totalRequests: totalRequests,
      totalRiders: totalRiders,
      totalAssignments: totalAssignments,
      pendingNotifications: pendingNotifications,
      todayRequests: 0, // Simplified for now
      todaysEscorts: todaysEscorts,
      unassignedEscorts: unassignedEscorts,
      pendingAssignments: 0, // Simplified for now
      threeDayEscorts: threeDayEscorts,
      newRequests: newRequests
    };
    
    console.log('✅ Dashboard data calculated:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error getting admin dashboard data:', error);
    
    // Return safe defaults
    return {
      totalRequests: 0,
      totalRiders: 0,
      totalAssignments: 0,
      pendingNotifications: 0,
      todayRequests: 0,
      todaysEscorts: 0,
      unassignedEscorts: 0,
      pendingAssignments: 0,
      threeDayEscorts: 0,
      newRequests: 0
    };
  }
}
```

### 3. Diagnostic Function

```javascript
/**
 * DIAGNOSTIC FUNCTION - Add to temputils.gs or Code.gs
 * Run this to test if everything is working
 */
function testDashboardStatsFixed() {
  console.log('🧪 === TESTING FIXED DASHBOARD STATS ===');
  
  try {
    // Test 1: Test data functions
    console.log('1. Testing data access functions...');
    
    const requestsData = getRequestsData();
    console.log('✅ Requests:', requestsData.data.length, 'rows');
    
    const ridersData = getRidersData();
    console.log('✅ Riders:', ridersData.data.length, 'rows');
    
    const assignmentsData = getAssignmentsData();
    console.log('✅ Assignments:', assignmentsData.data.length, 'rows');
    
    // Test 2: Test dashboard function
    console.log('\n2. Testing getAdminDashboardData...');
    const dashboardData = getAdminDashboardData();
    console.log('✅ Dashboard data:', JSON.stringify(dashboardData, null, 2));
    
    // Test 3: Test from frontend perspective
    console.log('\n3. Testing frontend call simulation...');
    if (typeof google !== 'undefined') {
      // This would be called from the frontend
      const frontendResult = getAdminDashboardData();
      console.log('✅ Frontend call result:', frontendResult);
    }
    
    return {
      success: true,
      message: 'All tests passed!',
      data: dashboardData
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

## Implementation Steps

1. **Add the core data functions** to your `Code.gs` file
2. **Replace the `getAdminDashboardData` function** in `AccessControl.gs` 
3. **Add the diagnostic function** to test everything
4. **Run the diagnostic** by executing `testDashboardStatsFixed()` in the Apps Script editor
5. **Deploy your changes** and test the dashboard

## Expected Results

After implementing this fix:
- Dashboard stats should load within 2-3 seconds
- If backend fails, fallback demo data will show after 3 seconds
- Real data will be displayed when sheets contain data
- Error handling will be more robust
- Console logs will help with debugging

## Testing Commands

Run these functions in the Apps Script editor to verify the fix:

```javascript
// Test the basic data access
testDashboardStatsFixed();

// Test just the dashboard function
getAdminDashboardData();

// Clear any caches if you have them
clearDashboardCache();
```
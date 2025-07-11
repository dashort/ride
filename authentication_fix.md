# Authentication Fix for Rider Availability Dashboard

## Problem Analysis

The rider availability dashboard is showing "welcome: undefined (undefined)" instead of proper user information because:

1. **Root Cause**: The `getCurrentUserForAvailability()` function returns a user object with undefined `name` and `role` properties
2. **Display Issue**: The frontend code uses template literals: `${currentUser.name} (${currentUser.role})` which displays "undefined (undefined)" when these properties are undefined
3. **Authentication Chain**: The issue occurs in the authentication chain: `getCurrentUserForAvailability()` → `getCurrentUser()` → `authenticateAndAuthorizeUser()` → `getEnhancedUserSession()`

## Technical Issues Identified

### 1. User Session Retrieval
- `getEnhancedUserSession()` may not properly extract the user's name from Google account
- Fallback to `extractNameFromEmail()` might not be working correctly

### 2. Role Mapping
- User might not be properly mapped to admin/dispatcher/rider roles
- Google account might not be linked to rider record in the system

### 3. Error Handling
- Functions don't provide proper fallback values for undefined properties
- No graceful degradation when user lookup fails

## Fix Implementation

### Step 1: Fix getCurrentUserForAvailability Function

**Location**: `AvailabilityService.gs` lines 11-41

**Problem**: Returns user object with potentially undefined properties

**Fix**:
```javascript
function getCurrentUserForAvailability() {
  try {
    const user = getCurrentUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Ensure user has proper name and role with fallbacks
    const userName = user.name || extractNameFromEmail(user.email) || 'User';
    const userRole = user.role || 'guest';

    // Get rider ID if user is a rider
    let riderId = null;
    if (userRole === 'rider') {
      const ridersData = getRidersData();
      const emailCol = CONFIG.columns.riders.email;
      const idCol = CONFIG.columns.riders.jpNumber;
      
      for (let row of ridersData.data) {
        const riderEmail = getColumnValue(row, ridersData.columnMap, emailCol);
        if (riderEmail && riderEmail.toLowerCase() === user.email.toLowerCase()) {
          riderId = getColumnValue(row, ridersData.columnMap, idCol);
          break;
        }
      }
    }

    return {
      success: true,
      user: {
        email: user.email || 'unknown@example.com',
        name: userName,
        role: userRole,
        riderId: riderId,
        permissions: user.permissions || []
      }
    };
  } catch (error) {
    console.error('Error getting current user for availability:', error);
    return { 
      success: false, 
      error: 'Failed to load user information',
      user: {
        email: 'unknown@example.com',
        name: 'Guest User',
        role: 'guest',
        riderId: null,
        permissions: []
      }
    };
  }
}
```

### Step 2: Fix authenticateAndAuthorizeUser Function

**Location**: `AccessControl.gs` lines 795-900

**Problem**: May return user object with undefined name/role properties

**Fix**: Ensure proper fallback values:
```javascript
// Inside authenticateAndAuthorizeUser function, around line 847
const authenticatedUser = {
  name: userSession.name || rider?.name || extractNameFromEmail(userSession.email) || 'User',
  email: userSession.email || 'unknown@example.com',
  role: userRole || 'guest',
  roles: [userRole || 'guest'],
  permissions: permissions || [],
  avatar: (userSession.name || rider?.name || extractNameFromEmail(userSession.email) || 'U').charAt(0).toUpperCase()
};
```

### Step 3: Fix Frontend Display Code

**Location**: `rider-availability.html` lines 739-740

**Problem**: No fallback when user properties are undefined

**Fix**:
```javascript
function handleUserLoaded(result) {
    if (result.success && result.user) {
        currentUser = result.user;
        
        // Ensure properties exist with fallbacks
        const userName = currentUser.name || 'User';
        const userRole = currentUser.role || 'guest';
        
        document.getElementById('userInfo').textContent = 
            `${userName} (${userRole})`;
        
        // Show admin view toggle if user has admin permissions
        if (userRole === 'admin' || userRole === 'dispatcher') {
            document.getElementById('allRidersBtn').style.display = 'block';
        }

        loadMyAvailability();
    } else {
        // Handle failed user load
        document.getElementById('userInfo').textContent = 'Guest User (guest)';
        showMessage('Failed to load user information', 'error');
    }
}
```

### Step 4: Add User Mapping Verification

**New Function**: Add to `AvailabilityService.gs`

```javascript
/**
 * Verify user mapping and provide diagnostic information
 * @param {string} email User email
 * @return {object} Mapping status and details
 */
function verifyUserMapping(email) {
  try {
    console.log(`Verifying user mapping for: ${email}`);
    
    // Check admin users
    const adminUsers = getAdminUsersSafe();
    const isAdmin = adminUsers.includes(email);
    
    // Check dispatcher users
    const dispatcherUsers = getDispatcherUsersSafe();
    const isDispatcher = dispatcherUsers.includes(email);
    
    // Check rider mapping
    const rider = getRiderByGoogleEmailSafe(email);
    const isRider = rider && rider.status === 'Active';
    
    // Determine role
    let role = 'unauthorized';
    if (isAdmin) role = 'admin';
    else if (isDispatcher) role = 'dispatcher';
    else if (isRider) role = 'rider';
    
    return {
      success: true,
      email: email,
      isAdmin: isAdmin,
      isDispatcher: isDispatcher,
      isRider: isRider,
      role: role,
      riderData: rider,
      adminList: adminUsers,
      dispatcherList: dispatcherUsers
    };
    
  } catch (error) {
    console.error('Error verifying user mapping:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

## Quick Fix for Immediate Resolution

### For the Frontend (rider-availability.html):

Add this defensive code to handle undefined values:

```javascript
// Replace the existing handleUserLoaded function with this improved version
function handleUserLoaded(result) {
    console.log('User loaded result:', result);
    
    if (result.success && result.user) {
        currentUser = result.user;
        
        // Defensive programming - ensure properties exist
        const userName = currentUser.name || currentUser.email?.split('@')[0] || 'User';
        const userRole = currentUser.role || 'guest';
        
        document.getElementById('userInfo').textContent = 
            `Welcome, ${userName} (${userRole})`;
        
        // Show admin view toggle if user has admin permissions
        if (userRole === 'admin' || userRole === 'dispatcher') {
            document.getElementById('allRidersBtn').style.display = 'block';
        }

        loadMyAvailability();
    } else {
        // Handle authentication failure
        currentUser = {
            email: 'unknown@example.com',
            name: 'Guest User',
            role: 'guest',
            riderId: null
        };
        
        document.getElementById('userInfo').textContent = 'Guest User (guest)';
        showMessage('Authentication required. Please sign in.', 'error');
    }
}
```

## Testing the Fix

1. **Test User Authentication**:
   - Run `getCurrentUserForAvailability()` in Apps Script editor
   - Verify it returns proper user object with name and role

2. **Test User Mapping**:
   - Run `verifyUserMapping(Session.getActiveUser().getEmail())` 
   - Check if user is properly mapped to admin/dispatcher/rider role

3. **Test Frontend Display**:
   - Load the rider availability page
   - Verify welcome message shows proper name and role instead of "undefined (undefined)"

## Root Cause Resolution

The real issue is likely that:

1. **User's Google account is not properly mapped** to any role (admin/dispatcher/rider)
2. **Settings sheet** may not contain the user's email in the admin/dispatcher lists
3. **Riders sheet** may not have the user's Google email properly linked to their rider record

### To permanently fix:

1. **Check Settings Sheet**: Ensure user's email is in the admin or dispatcher email lists
2. **Check Riders Sheet**: Ensure rider's Google email column is properly populated
3. **Verify CONFIG**: Ensure CONFIG.columns references are correct for all sheets
4. **Test Authentication Flow**: Run the diagnostic functions to identify where the mapping fails

This fix provides both immediate resolution and long-term stability by adding proper fallbacks and error handling throughout the authentication chain.
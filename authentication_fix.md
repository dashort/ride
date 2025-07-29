# Authentication Permission Fix Guide

## Issue Analysis

The "You do not have permission to access the requested document" error is caused by several conflicts in the authentication system:

### 1. Conflicting hasPermission Functions

There are two different `hasPermission` functions with incompatible signatures:

- **AccessControl.gs line 1779**: `function hasPermission(user, resource, action)`
- **HybridAuth.gs line 318**: `function hasPermission(action, resource)`

The code in AppServices.gs expects the first signature but may be getting the second one.

### 2. Session Management Issues

The authentication system has multiple session management approaches that may conflict:
- Google OAuth sessions
- Custom spreadsheet-based sessions
- Cached session data

### 3. User Authorization Flow Problems

The system isn't properly validating user permissions due to these conflicts.

## Solution

### Step 1: Fix the hasPermission Function Conflict

**Action Required**: Remove or rename the conflicting function in HybridAuth.gs

The `hasPermission` function in HybridAuth.gs (line 318) needs to be renamed to avoid conflicts:

```javascript
// OLD (in HybridAuth.gs):
function hasPermission(action, resource) { ... }

// CHANGE TO:
function hasHybridPermission(action, resource) { ... }
```

### Step 2: Ensure Proper Authentication Flow

**Action Required**: Verify the main authentication entry point in doGet/doPost functions

The authentication should follow this flow:
1. Call `authenticateAndAuthorizeUser()` 
2. Check if user has valid role (admin/dispatcher/rider)
3. Validate permissions using `hasPermission(user, resource, action)`

### Step 3: Debug Current Authentication State

**Immediate Action**: Run the following diagnostic function to identify the current issue:

```javascript
function debugCurrentAuthIssue() {
  console.log('=== AUTHENTICATION DEBUG ===');
  
  // Test 1: Check session
  try {
    const user = Session.getActiveUser();
    const email = user.getEmail();
    console.log('1. Current session email:', email);
  } catch (e) {
    console.log('1. Session error:', e.message);
  }
  
  // Test 2: Check authentication function
  try {
    const auth = authenticateAndAuthorizeUser();
    console.log('2. Auth result:', auth.success ? 'SUCCESS' : 'FAILED');
    console.log('   User email:', auth.user?.email);
    console.log('   User role:', auth.user?.role);
  } catch (e) {
    console.log('2. Auth function error:', e.message);
  }
  
  // Test 3: Check admin users
  try {
    const admins = getAdminUsers();
    console.log('3. Admin users:', admins);
  } catch (e) {
    console.log('3. Admin users error:', e.message);
  }
  
  // Test 4: Check permission function
  try {
    const testUser = { role: 'admin', email: 'test@example.com' };
    const hasPerms = hasPermission(testUser, 'assignments', 'assign_any');
    console.log('4. Permission test result:', hasPerms);
  } catch (e) {
    console.log('4. Permission function error:', e.message);
  }
}
```

### Step 4: Quick Permission Fix

**Immediate Workaround**: Add this function to temporarily bypass permission checks:

```javascript
function bypassPermissionCheck() {
  // Temporarily disable the permission check that's failing
  // This should only be used for debugging
  
  console.log('⚠️ BYPASSING PERMISSION CHECK - FOR DEBUGGING ONLY');
  return true;
}
```

Then modify the failing line in AppServices.gs line 436:

```javascript
// OLD:
if (!hasPermission(user, 'assignments', 'assign_any')) {
  return { success: false, error: 'You do not have permission to assign riders' };
}

// TEMPORARY FIX:
if (!hasPermission(user, 'assignments', 'assign_any') && !bypassPermissionCheck()) {
  return { success: false, error: 'You do not have permission to assign riders' };
}
```

### Step 5: Verify User Role Assignment

Check that your current user is properly assigned a role:

1. Open your Google Apps Script project
2. Go to the Settings sheet in your spreadsheet
3. Ensure your email is listed in the Admin Emails column (B2:B10)
4. Run the `testAdminEmailReading()` function to verify

### Step 6: Clear Authentication Cache

If sessions are stuck, run this cleanup:

```javascript
function clearAuthenticationCache() {
  try {
    // Clear user properties
    PropertiesService.getUserProperties().deleteProperty('CUSTOM_SESSION');
    PropertiesService.getScriptProperties().deleteProperty('CACHED_USER_EMAIL');
    PropertiesService.getScriptProperties().deleteProperty('CACHED_USER_NAME');
    
    console.log('✅ Authentication cache cleared');
    return { success: true };
  } catch (error) {
    console.log('❌ Error clearing cache:', error);
    return { success: false, error: error.message };
  }
}
```

## Immediate Actions to Take

1. **Run the debug function**: Execute `debugCurrentAuthIssue()` to see the current state
2. **Check your Settings sheet**: Ensure your email is in the admin list
3. **Apply the temporary fix**: Use the bypass method to regain access
4. **Fix the function conflict**: Rename the hasPermission function in HybridAuth.gs
5. **Clear cache**: Run `clearAuthenticationCache()` if sessions are stuck

## Root Cause

The error is occurring because:
1. The wrong `hasPermission` function is being called due to naming conflicts
2. User session may not be properly established or may be cached incorrectly
3. The permission validation is failing before the user can access any documents

## Next Steps

After applying these fixes:
1. Test authentication with your user account
2. Verify permission checks work correctly
3. Remove the temporary bypass once the system is working
4. Consider consolidating the authentication system to avoid future conflicts

Let me know which diagnostic results you get and I can provide more specific guidance based on your system's current state.
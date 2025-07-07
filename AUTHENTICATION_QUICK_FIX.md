# 🔧 Authentication Quick Fix Guide

## Your Issue: "You do not have permission to access the requested document"

This error occurs when you're authenticated via Google but your dispatcher account isn't properly configured in the permission system.

## 🚨 IMMEDIATE FIX (In Google Apps Script Editor)

### Step 1: Run Diagnostics
```javascript
// 1. Open Google Apps Script editor
// 2. Run this function to see what's wrong:
diagnosePersistentAuthIssue()
```

### Step 2: Apply Automatic Fixes
```javascript
// This will automatically fix your Settings sheet and add you as admin:
fixAuthenticationIssues()
```

### Step 3: Emergency Access (If Still Locked Out)
```javascript
// Creates temporary admin access for 2 hours:
emergencyAdminAccess()
```

## 🔍 MANUAL VERIFICATION

### Check Your Settings Sheet
1. Open your Google Spreadsheet
2. Look for "Settings" sheet tab
3. Check these columns:
   - **Column B**: Admin Emails (add your email here for full access)
   - **Column C**: Dispatcher Emails (add your dispatcher email here)

### Expected Settings Sheet Structure:
```
Row 1: Setting Type | Admin Emails          | Dispatcher Emails     | Notes
Row 2: User Management | your@email.com   | dispatcher@email.com  | Primary accounts
Row 3:                 | jpsotraffic@gmail.com | jpdispatcher100@gmail.com | Backup accounts
```

## 🎯 SPECIFIC FIX FOR DISPATCHER ACCOUNTS

If you're logging in as a dispatcher and getting permission errors:

### Option 1: Add Dispatcher Email to Settings
1. Go to Settings sheet in your spreadsheet
2. Add your dispatcher email to Column C (Dispatcher Emails)
3. Save the sheet
4. Try logging in again

### Option 2: Temporary Admin Access
1. Add your dispatcher email to Column B (Admin Emails) temporarily
2. This gives you full access to fix other issues
3. Move it back to Column C after fixing

### Option 3: Use Local Authentication
1. Try using the email/password login instead of Google
2. Use these test credentials:
   - Email: `admin@test.com`
   - Password: `admin123`

## 🧪 TEST FUNCTIONS TO RUN

### Test Your Authentication Setup:
```javascript
// Run these functions in sequence:

// 1. Test overall system
diagnosePersistentAuthIssue()

// 2. Test local authentication
testLocalAuthentication() 

// 3. Test admin user configuration
getAdminUsers()

// 4. Test dispatcher configuration  
getDispatcherUsers()
```

## 💡 WHY THE LOCAL OPTION MIGHT NOT SHOW

The local authentication form should be visible on the login page. If it's not showing:

1. **Clear Browser Cache**: Hard refresh (Ctrl+F5 or Cmd+Shift+R)
2. **Check JavaScript Errors**: Open browser dev tools and check console
3. **Verify HTML File**: Make sure `login.html` has both sections
4. **Test in Incognito Mode**: Rules out browser extension issues

## 🔧 COMPLETE SYSTEM RESET (Last Resort)

If nothing else works:

```javascript
// 1. Clear all authentication data
PropertiesService.getUserProperties().deleteProperty('CUSTOM_SESSION')
PropertiesService.getScriptProperties().deleteProperty('CACHED_USER_EMAIL')

// 2. Reinitialize the system
runCompleteSetup()

// 3. Create sample users
createSampleUsers()
```

## 📞 NEXT STEPS

1. **Run the diagnostic function first**: `diagnosePersistentAuthIssue()`
2. **Apply the automatic fix**: `fixAuthenticationIssues()`
3. **Test both authentication methods**:
   - Google OAuth (should work for dispatchers after fix)
   - Local email/password (should work with sample credentials)

## 🎭 COMMON SOLUTIONS BY SYMPTOM

**"Permission denied" but Google auth works**: Add email to Settings sheet
**Local auth form not visible**: Clear cache, check browser console
**Both auth methods fail**: Run complete system reset
**Can authenticate but can't access pages**: Check role-based permissions

---

**🚨 If you're completely stuck**: Run `emergencyAdminAccess()` for immediate temporary access, then apply the fixes above.

Let me know what the diagnostic function shows and I can provide more targeted help!
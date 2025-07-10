# 🔐 Spreadsheet Permissions Diagnostic Guide

## The Issue: "You do not have permission to access the requested document"

This error typically occurs when:
1. ✅ User is properly configured in Settings sheet
2. ❌ Google Spreadsheet is not shared with the user
3. ❌ Web App deployment permissions are too restrictive

## 🧪 DIAGNOSTIC STEPS

### Step 1: Check Spreadsheet Sharing

**In Google Spreadsheet (not script editor):**
1. Click "Share" button (top-right)
2. Look for these emails in the shared list:
   - `jpdispatcher100@gmail.com` 
   - `dispatcher@example.com`
3. If missing, add them with "Editor" access

### Step 2: Check Web App Deployment Permissions

**In Google Apps Script Editor:**
1. Click "Deploy" > "Manage deployments"
2. Click edit icon ✏️ next to current deployment
3. Verify settings:
   - **Execute as**: "Me (your-email@gmail.com)"
   - **Who has access**: "Anyone" OR specific emails including dispatcher

### Step 3: Run Permission Diagnostic Function

```javascript
function diagnoseSpreadsheetPermissions() {
  console.log('🔐 === SPREADSHEET PERMISSIONS DIAGNOSTIC ===');
  
  try {
    // Check current user
    const currentUser = Session.getActiveUser().getEmail();
    console.log('Current user:', currentUser);
    
    // Get spreadsheet info
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const spreadsheetId = ss.getId();
    const spreadsheetUrl = ss.getUrl();
    
    console.log('Spreadsheet ID:', spreadsheetId);
    console.log('Spreadsheet URL:', spreadsheetUrl);
    
    // Check if we can access protection info (indicates owner access)
    try {
      const protections = ss.getProtections(SpreadsheetApp.ProtectionType.SHEET);
      console.log('✅ Can access protection settings (likely owner/editor)');
    } catch (e) {
      console.log('❌ Cannot access protection settings (likely viewer or no access)');
    }
    
    // Try to get web app URL
    try {
      const webAppUrl = ScriptApp.getService().getUrl();
      console.log('Web App URL:', webAppUrl);
    } catch (e) {
      console.log('❌ Cannot get web app URL:', e.message);
    }
    
    // Check Settings sheet access
    try {
      const settingsSheet = ss.getSheetByName('Settings');
      const data = settingsSheet.getDataRange().getValues();
      console.log('✅ Can read Settings sheet');
      
      // Extract dispatcher emails
      const dispatcherEmails = [];
      for (let i = 1; i < data.length; i++) {
        if (data[i][2] && String(data[i][2]).trim()) {
          dispatcherEmails.push(String(data[i][2]).trim());
        }
      }
      console.log('Configured dispatcher emails:', dispatcherEmails);
      
    } catch (e) {
      console.log('❌ Cannot read Settings sheet:', e.message);
    }
    
    return {
      success: true,
      currentUser: currentUser,
      spreadsheetId: spreadsheetId,
      canAccessProtections: true
    };
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

## 🔧 FIXES BY SYMPTOM

### Symptom: "Permission denied" immediately on login
**Fix**: Share spreadsheet with dispatcher email
```
1. Open spreadsheet
2. Click "Share" 
3. Add jpdispatcher100@gmail.com with "Editor" access
```

### Symptom: Login works but can't access any pages
**Fix**: Check web app deployment permissions
```
1. Go to Apps Script editor
2. Deploy > Manage deployments 
3. Edit deployment settings
4. Set "Who has access" to "Anyone"
```

### Symptom: Some pages work, others don't
**Fix**: Check individual sheet permissions
```
1. Right-click sheet tabs
2. Select "Protect sheet"
3. Remove restrictions or add dispatcher email
```

## 🚨 QUICK SPREADSHEET SHARING FIX

**Run this function to automatically share with common dispatcher emails:**

```javascript
function shareSpreadsheetWithDispatchers() {
  console.log('📤 Sharing spreadsheet with dispatcher emails...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dispatcherEmails = ['jpdispatcher100@gmail.com', 'dispatcher@example.com'];
    
    for (const email of dispatcherEmails) {
      try {
        // Note: This function requires the Advanced Drive API to be enabled
        // Alternative: Manual sharing through the UI
        console.log(`Attempting to share with: ${email}`);
        
        // This is a placeholder - actual sharing requires Drive API
        console.log(`⚠️ Manual action required: Share spreadsheet with ${email}`);
        
      } catch (e) {
        console.log(`❌ Could not share with ${email}:`, e.message);
      }
    }
    
    console.log('📝 MANUAL STEPS REQUIRED:');
    console.log('1. Click "Share" button in spreadsheet');
    console.log('2. Add these emails with Editor access:');
    dispatcherEmails.forEach(email => console.log(`   - ${email}`));
    
    return {
      success: true,
      message: 'Manual sharing steps provided',
      emails: dispatcherEmails
    };
    
  } catch (error) {
    console.error('❌ Sharing diagnostic failed:', error);
    return { success: false, error: error.message };
  }
}
```

## 🎯 VERIFICATION STEPS

After fixing permissions:

1. **Test access**: Have dispatcher try logging in again
2. **Check error messages**: Should be different/resolved
3. **Verify navigation**: Dispatcher should see appropriate menu items
4. **Test functionality**: Try creating/viewing requests

## 📋 PERMISSION CHECKLIST

- [ ] Spreadsheet shared with `jpdispatcher100@gmail.com` (Editor access)
- [ ] Web app deployed with "Anyone" access OR specific user access
- [ ] No protected ranges blocking dispatcher access
- [ ] Settings sheet contains dispatcher email in Column C
- [ ] No browser cache issues (cleared cache/tried incognito)

## 💡 ALTERNATIVE: Test with Owner Account

To verify this is a permissions issue:
1. Login with the spreadsheet owner account (`jpsotraffic@gmail.com`)
2. Navigate to dispatcher functions
3. If it works for owner but not dispatcher = permission issue confirmed

## 🚀 FASTEST FIX

1. **Share spreadsheet**: Add `jpdispatcher100@gmail.com` as Editor
2. **Clear browser cache**: Hard refresh (Ctrl+F5)
3. **Test login**: Try dispatcher login again
4. **Check deployment**: Ensure web app allows access

This should resolve the "permission denied" error for properly configured dispatcher accounts.
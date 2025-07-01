/**
 * Quick fixes for authentication issues
 */

/**
 * Emergency fix: Add current user to all auth lists
 */
function emergencyAddCurrentUserToAuthLists() {
  try {
    const user = Session.getActiveUser();
    const email = user.getEmail();
    
    console.log(`🚨 Emergency auth fix for: ${email}`);
    
    // Add to dispatcher list (modify getDispatcherUsers function)
    console.log('1. Adding to dispatcher list...');
    
    // Check if Settings sheet exists and add there
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settingsSheet = ss.getSheetByName('Settings');
    
    if (settingsSheet) {
      // Find next empty row in column C (dispatcher column)
      let nextRow = 2;
      while (settingsSheet.getRange(nextRow, 3).getValue()) {
        nextRow++;
      }
      settingsSheet.getRange(nextRow, 3).setValue(email);
      console.log(`✅ Added ${email} to Settings sheet row ${nextRow}`);
    }
    
    // Add to Users sheet
    console.log('2. Adding to Users sheet...');
    let usersSheet = ss.getSheetByName('Users');
    
    if (!usersSheet) {
      // Create Users sheet if it doesn't exist
      usersSheet = ss.insertSheet('Users');
      const headers = ['email', 'hashedPassword', 'role', 'status', 'name'];
      usersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      console.log('✅ Created Users sheet with headers');
    }
    
    // Check if user already exists
    const data = usersSheet.getDataRange().getValues();
    const emailExists = data.some(row => row[0] === email);
    
    if (!emailExists) {
      const nextRow = usersSheet.getLastRow() + 1;
      const userData = [
        email,
        '', // No password needed for Google OAuth users
        'dispatcher',
        'active',
        user.getName() || email.split('@')[0]
      ];
      usersSheet.getRange(nextRow, 1, 1, userData.length).setValues([userData]);
      console.log(`✅ Added ${email} to Users sheet row ${nextRow}`);
    } else {
      console.log(`ℹ️ ${email} already exists in Users sheet`);
    }
    
    console.log('3. Testing authentication...');
    const authResult = authenticateUser();
    console.log(`Auth result: ${JSON.stringify(authResult)}`);
    
    if (authResult.success) {
      console.log('🎉 Authentication successful!');
      return { success: true, message: 'User added and authenticated successfully' };
    } else {
      console.log('❌ Authentication still failing');
      return { success: false, message: 'User added but authentication still failing', authResult };
    }
    
  } catch (error) {
    console.error('❌ Emergency fix error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify authentication system is working
 */
function verifyAuthenticationSystem() {
  console.log('🔍 Verifying authentication system...');
  
  try {
    // Test 1: Check if new doGet function is active
    console.log('1. Checking doGet function...');
    if (typeof doGet === 'function') {
      console.log('✅ doGet function exists');
    } else {
      console.log('❌ doGet function missing');
    }
    
    // Test 2: Check authentication functions
    console.log('2. Checking auth functions...');
    const authFunctions = ['authenticateUser', 'authenticateWithGoogle', 'getDispatcherUsers', 'findUserRecord'];
    authFunctions.forEach(funcName => {
      if (typeof eval(funcName) === 'function') {
        console.log(`✅ ${funcName} exists`);
      } else {
        console.log(`❌ ${funcName} missing`);
      }
    });
    
    // Test 3: Test current user auth
    console.log('3. Testing current user auth...');
    const user = Session.getActiveUser();
    const email = user.getEmail();
    console.log(`Current user: ${email}`);
    
    const authResult = authenticateUser();
    console.log(`Auth result: ${JSON.stringify(authResult)}`);
    
    return {
      success: authResult.success,
      userEmail: email,
      authResult: authResult
    };
    
  } catch (error) {
    console.error('❌ Verification error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reset authentication system to working state
 */
function resetAuthenticationSystem() {
  console.log('🔄 Resetting authentication system...');
  
  try {
    // Clear any cached auth data
    PropertiesService.getUserProperties().deleteProperty('CUSTOM_SESSION');
    PropertiesService.getUserProperties().deleteProperty('SECURE_SESSION');
    
    // Reset rate limiting for current user
    const user = Session.getActiveUser();
    const email = user.getEmail();
    
    const properties = PropertiesService.getScriptProperties();
    const allProps = properties.getProperties();
    
    Object.keys(allProps).forEach(key => {
      if (key.includes(email) || key.includes('rate_limit') || key.includes('failed_attempts')) {
        properties.deleteProperty(key);
      }
    });
    
    console.log('✅ Cleared cached authentication data');
    
    // Test auth again
    const authResult = authenticateUser();
    console.log(`Fresh auth result: ${JSON.stringify(authResult)}`);
    
    return { success: true, authResult: authResult };
    
  } catch (error) {
    console.error('❌ Reset error:', error);
    return { success: false, error: error.message };
  }
}
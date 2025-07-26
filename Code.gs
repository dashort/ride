/**
 * Diagnostic and helper utilities. The global configuration and menu setup
 * functions were extracted into Config.gs and Menu.gs.
 */

/**
 * Comprehensive authentication diagnostic function
 * Add this to your Code.gs file and run it to diagnose the authentication issue
 */
var AUTH_TRACE = [];
/**
 * Trace function calls to see which authentication functions are being used
 */
function traceAuthFunction(functionName, email, source) {
  const timestamp = new Date().toISOString();
  AUTH_TRACE.push({
    timestamp: timestamp,
    function: functionName,
    email: email || 'NO_EMAIL',
    source: source || 'unknown'
  });
  
  debugLog(`🔍 AUTH TRACE: ${functionName} -> ${email} (${source})`);
  
  // If we see jpsotraffic@gmail.com, log it prominently
  if (email === 'jpsotraffic@gmail.com') {
    debugLog(`🚨 JPSOTRAFFIC DETECTED in ${functionName}!`);
  }
}

/**
 * Enhanced getCurrentUser with tracing
 * REPLACE your getCurrentUser function in CoreUtils.gs with this version
 */
function getCurrentUser() {
  try {
    debugLog('🔍 getCurrentUser called from CoreUtils.gs');
    
    // Delegate to the centralized authentication service
    if (typeof authenticateAndAuthorizeUser === 'function') {
      const auth = authenticateAndAuthorizeUser();
      if (auth && auth.success && auth.user) {
        traceAuthFunction('getCurrentUser->authenticateAndAuthorizeUser', auth.user.email, 'success');
        logActivity(`User ${auth.user.email} logged in with roles: ${auth.user.roles.join(', ')}`);
        return auth.user;
      } else {
        traceAuthFunction('getCurrentUser->authenticateAndAuthorizeUser', 'FAILED', 'auth_failed');
      }
    } else {
      traceAuthFunction('getCurrentUser', 'NO_AUTH_FUNCTION', 'missing_function');
    }

    // Fallback to session information if the auth service fails
    debugLog('⚠️ getCurrentUser falling back to direct session...');
    const userEmail = Session.getActiveUser().getEmail();
    const displayName = getUserDisplayName(userEmail);
    
    traceAuthFunction('getCurrentUser->fallback', userEmail, 'session_fallback');
    
    return { email: userEmail, name: displayName, roles: ['guest'], permissions: ['view'] };
  } catch (error) {
    debugLog('❌ getCurrentUser error:', error);
    traceAuthFunction('getCurrentUser->error', 'anonymous@example.com', 'error');
    logError('Error getting current user:', error);
    return { email: 'anonymous@example.com', name: 'Guest User', roles: ['guest'], permissions: ['view'] };
  }
}
/**
 * Comprehensive Settings sheet diagnostic
 * Add this to your Code.gs and run it to see what's in your Settings sheet
 */
function diagnoseSettingsSheet() {
  debugLog('🔍 === SETTINGS SHEET DIAGNOSTIC ===');
  
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // Check all sheet names
    const allSheets = spreadsheet.getSheets().map(sheet => sheet.getName());
    debugLog('📋 All sheet names:', allSheets);
    
    // Check for different possible Settings sheet names
    const possibleNames = ['Settings', 'settings', 'SETTINGS', 'Config', 'Configuration'];
    let settingsSheet = null;
    let actualName = '';
    
    for (const name of possibleNames) {
      try {
        const sheet = spreadsheet.getSheetByName(name);
        if (sheet) {
          settingsSheet = sheet;
          actualName = name;
          debugLog(`✅ Found Settings sheet with name: "${actualName}"`);
          break;
        }
      } catch (e) {
        // Continue checking
      }
    }
    
    if (!settingsSheet) {
      debugLog('❌ No Settings sheet found with any expected name');
      debugLog('📋 Available sheets:', allSheets);
      return {
        success: false,
        error: 'Settings sheet not found',
        availableSheets: allSheets,
        suggestion: 'Create a sheet named "Settings" or update CONFIG.sheets.settings'
      };
    }
    
    // Check what's in the Settings sheet
    debugLog(`\n📊 Reading data from "${actualName}" sheet...`);
    
    const dataRange = settingsSheet.getDataRange();
    const allData = dataRange.getValues();
    
    debugLog(`📐 Sheet dimensions: ${allData.length} rows x ${allData[0]?.length || 0} columns`);
    
    // Show the raw data
    debugLog('\n📋 Raw sheet data:');
    allData.forEach((row, index) => {
      debugLog(`Row ${index + 1}:`, row);
    });
    
    // Test specific ranges that the system tries to read
    debugLog('\n🔍 Testing admin email range (B2:B10):');
    try {
      const adminRange = settingsSheet.getRange('B2:B10').getValues();
      const adminEmails = adminRange.flat().filter(email => email && email.trim());
      debugLog('Admin emails found:', adminEmails);
      
      if (adminEmails.includes('jpsotraffic@gmail.com')) {
        debugLog('✅ jpsotraffic@gmail.com is in the admin list (B2:B10)');
      } else {
        debugLog('⚠️ jpsotraffic@gmail.com NOT found in admin range B2:B10');
      }
    } catch (e) {
      debugLog('❌ Error reading B2:B10:', e.message);
    }
    
    debugLog('\n🔍 Testing dispatcher email range (C2:C10):');
    try {
      const dispatcherRange = settingsSheet.getRange('C2:C10').getValues();
      const dispatcherEmails = dispatcherRange.flat().filter(email => email && email.trim());
      debugLog('Dispatcher emails found:', dispatcherEmails);
    } catch (e) {
      debugLog('❌ Error reading C2:C10:', e.message);
    }
    
    // Check CONFIG reference
    debugLog('\n🔍 Checking CONFIG.sheets.settings:');
    try {
      if (typeof CONFIG !== 'undefined' && CONFIG.sheets && CONFIG.sheets.settings) {
        debugLog('CONFIG.sheets.settings =', CONFIG.sheets.settings);
        
        if (CONFIG.sheets.settings !== actualName) {
          debugLog(`⚠️ MISMATCH: CONFIG expects "${CONFIG.sheets.settings}" but sheet is named "${actualName}"`);
        } else {
          debugLog('✅ CONFIG matches actual sheet name');
        }
      } else {
        debugLog('⚠️ CONFIG.sheets.settings not defined');
      }
    } catch (e) {
      debugLog('❌ Error checking CONFIG:', e.message);
    }
    
    return {
      success: true,
      sheetName: actualName,
      dimensions: { rows: allData.length, cols: allData[0]?.length || 0 },
      adminEmailsInB2B10: settingsSheet.getRange('B2:B10').getValues().flat().filter(email => email && email.trim()),
      dispatcherEmailsInC2C10: settingsSheet.getRange('C2:C10').getValues().flat().filter(email => email && email.trim()),
      allSheetNames: allSheets
    };
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Fixed getAdminUsers function that works regardless of CONFIG
 * REPLACE your getAdminUsers function in Code.gs with this version
 */
function getAdminUsers() {
  debugLog('🔍 getAdminUsers called...');
  
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // Try multiple possible Settings sheet names
    const possibleNames = ['Settings', 'settings', 'SETTINGS'];
    let settingsSheet = null;
    
    for (const name of possibleNames) {
      try {
        settingsSheet = spreadsheet.getSheetByName(name);
        if (settingsSheet) {
          debugLog(`✅ Found Settings sheet: "${name}"`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (settingsSheet) {
      try {
        debugLog('📖 Reading admin emails from Settings sheet...');
        const adminRange = settingsSheet.getRange('B2:B10').getValues();
        const adminEmails = adminRange.flat().filter(email => email && email.trim());
        
        debugLog('📧 Admin emails from sheet:', adminEmails);
        
        if (adminEmails.length > 0) {
          return adminEmails;
        } else {
          debugLog('⚠️ No admin emails found in Settings sheet, using fallback');
        }
      } catch (error) {
        debugLog('❌ Error reading Settings sheet:', error.message);
      }
    } else {
      debugLog('⚠️ Settings sheet not found, using fallback');
    }
  } catch (error) {
    debugLog('❌ Error accessing spreadsheet:', error.message);
  }
  
  // Fallback to hardcoded admin emails
  debugLog('📧 Using hardcoded admin fallback');
  return [
    'admin@yourdomain.com',
    'jpsotraffic@gmail.com',
    'manager@yourdomain.com'
    // Add your admin emails here
  ];
}
/**
 * Fix the Settings sheet structure to have clean email data
 * Run this function to restructure your Settings sheet properly
 */
function fixSettingsSheetStructure() {
  debugLog('🛠️ Fixing Settings sheet structure...');
  
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const settingsSheet = spreadsheet.getSheetByName('Settings');
    
    if (!settingsSheet) {
      debugLog('❌ Settings sheet not found');
      return { success: false, error: 'Settings sheet not found' };
    }
    
    // Clear the existing problematic structure
    debugLog('🧹 Clearing existing data...');
    settingsSheet.clear();
    
    // Set up clean structure with proper email separation
    const newStructure = [
      // Row 1: Headers
      ['Setting Type', 'Admin Emails', 'Dispatcher Emails', 'System Config', 'Value', 'Notes', 'Month Codes', 'Code'],
      
      // Rows 2-11: Admin and Dispatcher emails (clean email-only data)
      ['User Access', 'dashort@gmail.com', 'dispatcher@example.com', '', '', 'Primary accounts', 'January', 'A'],
      ['User Access', 'jpsotraffic@gmail.com', 'jpdispatcher100@gmail.com', '', '', 'JP accounts', 'February', 'B'],
      ['User Access', 'manager@example.com', 'operator@example.com', '', '', 'Management', 'March', 'C'],
      ['User Access', '', '', '', '', '', 'April', 'D'],
      ['User Access', '', '', '', '', '', 'May', 'E'],
      ['User Access', '', '', '', '', '', 'June', 'F'],
      ['User Access', '', '', '', '', '', 'July', 'G'],
      ['User Access', '', '', '', '', '', 'August', 'H'],
      ['User Access', '', '', '', '', '', 'September', 'I'],
      ['User Access', '', '', '', '', '', 'October', 'J'],
      
      // Additional system config rows
      ['Auth Config', 'require_2fa', 'false', '', '', 'Two-factor auth', 'November', 'K'],
      ['Auth Config', 'session_timeout', '24', '', 'hours', 'Session duration', 'December', 'L']
    ];
    
    // Write the new structure
    debugLog('📝 Writing new structure...');
    settingsSheet.getRange(1, 1, newStructure.length, newStructure[0].length).setValues(newStructure);
    
    // Format headers
    debugLog('🎨 Formatting headers...');
    settingsSheet.getRange(1, 1, 1, newStructure[0].length)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('white');
    
    // Auto-resize columns
    settingsSheet.autoResizeColumns(1, newStructure[0].length);
    
    debugLog('✅ Settings sheet structure fixed!');
    
    // Test the fix
    debugLog('\n🧪 Testing the fix...');
    const testResult = testAdminEmailReading();
    
    return {
      success: true,
      message: 'Settings sheet structure fixed successfully',
      testResult: testResult
    };
    
  } catch (error) {
    console.error('❌ Error fixing Settings sheet:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Robust admin email reading function that handles mixed data types
 * REPLACE your getAdminUsers function with this version
 */
function getAdminUsers() {
  debugLog('🔍 getAdminUsers called (robust version)...');
  
  try {
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
    if (settingsSheet) {
      debugLog('📖 Reading admin emails from Settings sheet...');
      
      // Read the range
      const adminRange = settingsSheet.getRange('B2:B11').getValues(); // Extended range
      debugLog('📊 Raw admin range data:', adminRange);
      
      // Robust filtering to handle mixed data types
      const adminEmails = adminRange
        .flat() // Flatten the 2D array
        .filter(cell => {
          // Only include cells that are strings and look like emails
          if (typeof cell !== 'string') return false;
          if (!cell || !cell.trim()) return false;
          
          const trimmed = cell.trim();
          
          // Skip instructional text
          if (trimmed.includes('(') || trimmed.includes(')')) return false;
          if (trimmed.toLowerCase().includes('add more')) return false;
          if (trimmed.toLowerCase().includes('users with')) return false;
          if (trimmed.toLowerCase().includes('access')) return false;
          
          // Must contain @ symbol to be an email
          if (!trimmed.includes('@')) return false;
          
          return true;
        })
        .map(email => email.trim()); // Clean up the emails
      
      debugLog('📧 Filtered admin emails:', adminEmails);
      
      if (adminEmails.length > 0) {
        return adminEmails;
      } else {
        debugLog('⚠️ No valid admin emails found in Settings sheet');
      }
    } else {
      debugLog('⚠️ Settings sheet not found');
    }
  } catch (error) {
    debugLog('❌ Error reading Settings sheet:', error.message);
  }
  
  // Fallback to hardcoded admin emails
  debugLog('📧 Using hardcoded admin fallback');
  return [
    'dashort@gmail.com',
    'jpsotraffic@gmail.com',
    'manager@example.com'
  ];
}

/**
 * Robust dispatcher email reading function
 */
function getDispatcherUsers() {
  debugLog('🔍 getDispatcherUsers called (robust version)...');
  
  try {
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
    if (settingsSheet) {
      debugLog('📖 Reading dispatcher emails from Settings sheet...');
      
      const dispatcherRange = settingsSheet.getRange('C2:C11').getValues();
      debugLog('📊 Raw dispatcher range data:', dispatcherRange);
      
      // Robust filtering
      const dispatcherEmails = dispatcherRange
        .flat()
        .filter(cell => {
          if (typeof cell !== 'string') return false;
          if (!cell || !cell.trim()) return false;
          
          const trimmed = cell.trim();
          
          // Skip instructional text
          if (trimmed.includes('(') || trimmed.includes(')')) return false;
          if (trimmed.toLowerCase().includes('add more')) return false;
          if (trimmed.toLowerCase().includes('users with')) return false;
          if (trimmed.toLowerCase().includes('access')) return false;
          
          // Must contain @ symbol
          if (!trimmed.includes('@')) return false;
          
          return true;
        })
        .map(email => email.trim());
      
      debugLog('📧 Filtered dispatcher emails:', dispatcherEmails);
      
      if (dispatcherEmails.length > 0) {
        return dispatcherEmails;
      }
    }
  } catch (error) {
    debugLog('❌ Error reading dispatcher emails:', error.message);
  }
  
  // Fallback
  return [
    'dispatcher@example.com',
    'jpdispatcher100@gmail.com'
  ];
}


/**
 * Fixed getAdminUsersSafe function 
 * REPLACE your getAdminUsersSafe function in AccessControl.gs with this version
 * */
 
function getAdminUsersSafe() {
  try {
    // First try the main getAdminUsers function
    if (typeof getAdminUsers === 'function') {
      const admins = getAdminUsers();
      if (admins && admins.length > 0) {
        return admins;
      }
    }
    
    // Fallback method
    return getAdminUsersFallback();
    
  } catch (error) {
    console.error('❌ Error getting admin users:', error);
    return ['jpsotraffic@gmail.com']; // At least include your account as fallback
  }
}


/**
 * Create or update Settings sheet with proper structure
 */
function createOrUpdateSettingsSheet() {
  debugLog('🛠️ Creating/updating Settings sheet...');
  
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let settingsSheet = spreadsheet.getSheetByName('Settings');
    
    if (!settingsSheet) {
      debugLog('📄 Creating new Settings sheet...');
      settingsSheet = spreadsheet.insertSheet('Settings');
    } else {
      debugLog('📄 Updating existing Settings sheet...');
    }
    
    // Create the proper structure
    const headers = ['Setting Type', 'Admin Emails', 'Dispatcher Emails', 'Notes'];
    settingsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Add sample data if sheet is empty
    const existingData = settingsSheet.getDataRange().getValues();
    if (existingData.length === 1) { // Only headers
      const sampleData = [
        ['User Management', 'jpsotraffic@gmail.com', 'dispatcher@example.com', 'Main admin account'],
        ['', 'admin@yourdomain.com', 'operator@example.com', 'Secondary admin'],
        ['', 'manager@yourdomain.com', '', 'Manager access'],
        ['', '', '', ''],
        ['', '(Add more emails below)', '(Add more emails below)', ''],
        ['', '', '', ''],
        ['', '', '', ''],
        ['', '', '', ''],
        ['', '', '', ''],
        ['', '', '', '']
      ];
      
      settingsSheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
    }
    
    // Format the sheet
    settingsSheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('white');
    
    settingsSheet.autoResizeColumns(1, headers.length);
    
    debugLog('✅ Settings sheet created/updated successfully');
    
    // Test reading from the updated sheet
    debugLog('\n🧪 Testing updated sheet:');
    const testAdmins = getAdminUsers();
    debugLog('Admin emails now:', testAdmins);
    
    return {
      success: true,
      message: 'Settings sheet created/updated successfully',
      adminEmails: testAdmins
    };
    
  } catch (error) {
    console.error('❌ Error creating/updating Settings sheet:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
function diagnoseAuthenticationIssue() {
  debugLog('🔍 === AUTHENTICATION DIAGNOSTIC REPORT ===');
  
  try {
    // 1. Test raw Session methods
    debugLog('\n1. RAW SESSION TESTING:');
    
    let activeUser = null;
    let activeUserEmail = '';
    let effectiveUser = null;
    let effectiveUserEmail = '';
    
    try {
      activeUser = Session.getActiveUser();
      debugLog('✅ Session.getActiveUser() succeeded');
      debugLog('   Type:', typeof activeUser);
      
      if (activeUser) {
        try {
          activeUserEmail = activeUser.getEmail();
          debugLog('✅ getEmail() succeeded:', activeUserEmail);
        } catch (e) {
          debugLog('❌ getEmail() failed:', e.message);
          activeUserEmail = activeUser.email || 'NO_EMAIL_PROPERTY';
          debugLog('   Fallback email property:', activeUserEmail);
        }
      }
    } catch (e) {
      debugLog('❌ Session.getActiveUser() failed:', e.message);
    }
    
    try {
      effectiveUser = Session.getEffectiveUser();
      debugLog('✅ Session.getEffectiveUser() succeeded');
      
      if (effectiveUser) {
        try {
          effectiveUserEmail = effectiveUser.getEmail();
          debugLog('✅ getEmail() succeeded:', effectiveUserEmail);
        } catch (e) {
          debugLog('❌ getEmail() failed:', e.message);
          effectiveUserEmail = effectiveUser.email || 'NO_EMAIL_PROPERTY';
          debugLog('   Fallback email property:', effectiveUserEmail);
        }
      }
    } catch (e) {
      debugLog('❌ Session.getEffectiveUser() failed:', e.message);
    }
    
    // 2. Test cached data
    debugLog('\n2. CACHED DATA TESTING:');
    try {
      const properties = PropertiesService.getScriptProperties();
      const cachedEmail = properties.getProperty('CACHED_USER_EMAIL');
      const cachedName = properties.getProperty('CACHED_USER_NAME');
      
      debugLog('Cached Email:', cachedEmail || 'NONE');
      debugLog('Cached Name:', cachedName || 'NONE');
      
      if (cachedEmail && cachedEmail !== activeUserEmail && cachedEmail !== effectiveUserEmail) {
        debugLog('⚠️  WARNING: Cached email differs from session emails!');
        debugLog('   This might be causing the jpsotraffic@gmail.com issue');
      }
    } catch (e) {
      debugLog('❌ Error reading cached data:', e.message);
    }
    
    // 3. Test enhanced user session
    debugLog('\n3. ENHANCED USER SESSION TESTING:');
    try {
      const enhancedSession = getEnhancedUserSession();
      debugLog('Enhanced session result:', JSON.stringify(enhancedSession, null, 2));
      
      if (enhancedSession.email === 'jpsotraffic@gmail.com') {
        debugLog('🚨 FOUND THE PROBLEM: Enhanced session returning jpsotraffic@gmail.com');
        debugLog('   Source:', enhancedSession.source);
      }
    } catch (e) {
      debugLog('❌ Enhanced session failed:', e.message);
    }
    
    // 4. Test full authentication
    debugLog('\n4. FULL AUTHENTICATION TESTING:');
    try {
      const authResult = authenticateAndAuthorizeUser();
      debugLog('Auth result:', JSON.stringify(authResult, null, 2));
      
      if (authResult.success && authResult.user.email === 'jpsotraffic@gmail.com') {
        debugLog('🚨 FOUND THE PROBLEM: Full auth returning jpsotraffic@gmail.com');
      }
    } catch (e) {
      debugLog('❌ Full authentication failed:', e.message);
    }
    
    // 5. Test admin users list
    debugLog('\n5. ADMIN USERS TESTING:');
    try {
      const adminUsers = getAdminUsersSafe();
      debugLog('Admin users list:', adminUsers);
      
      if (adminUsers.includes('jpsotraffic@gmail.com')) {
        debugLog('✅ jpsotraffic@gmail.com is legitimately in admin list');
      }
    } catch (e) {
      debugLog('❌ Error getting admin users:', e.message);
    }
    
    // 6. Summary and recommendations
    debugLog('\n6. SUMMARY:');
    debugLog('Active user email:', activeUserEmail || 'NONE');
    debugLog('Effective user email:', effectiveUserEmail || 'NONE');
    
    if (!activeUserEmail && !effectiveUserEmail) {
      debugLog('🚨 PROBLEM: No user session detected at all');
      debugLog('📋 SOLUTION: User needs to sign in to Google first');
    } else if (activeUserEmail && activeUserEmail !== 'jpsotraffic@gmail.com') {
      debugLog('✅ Good: Session shows correct user');
      debugLog('🔍 Need to check why enhanced session or auth is overriding this');
    }
    
    return {
      activeUserEmail: activeUserEmail,
      effectiveUserEmail: effectiveUserEmail,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    return { error: error.message };
  }
}

/**
 * EMERGENCY AUTHENTICATION DEBUG FUNCTIONS
 * Add these functions to help diagnose and fix the permission issues
 */



/**
 * Temporary bypass for permission checks (DEBUGGING ONLY)
 */
function bypassPermissionCheck() {
  debugLog('⚠️ BYPASSING PERMISSION CHECK - FOR DEBUGGING ONLY');
  return true;
}

/**
 * Clear authentication cache
 */
function clearAuthenticationCache() {
  try {
    // Clear user properties
    PropertiesService.getUserProperties().deleteProperty('CUSTOM_SESSION');
    PropertiesService.getScriptProperties().deleteProperty('CACHED_USER_EMAIL');
    PropertiesService.getScriptProperties().deleteProperty('CACHED_USER_NAME');
    
    debugLog('✅ Authentication cache cleared');
    return { success: true };
  } catch (error) {
    debugLog('❌ Error clearing cache:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Force refresh user session and test authentication
 */
function forceRefreshAuthentication() {
  debugLog('🔄 Force refreshing authentication...');
  
  try {
    // Step 1: Clear cache
    const clearResult = clearAuthenticationCache();
    debugLog('Cache clear result:', clearResult);
    
    // Step 2: Get fresh session
    const session = getEnhancedUserSession();
    debugLog('Fresh session:', session);
    
    // Step 3: Test authentication
    const auth = authenticateAndAuthorizeUser();
    debugLog('Auth test result:', auth);
    
    // Step 4: Test permission
    if (auth.success) {
      const permTest = hasPermission(auth.user, 'assignments', 'assign_any');
      debugLog('Permission test:', permTest);
    }
    
    return {
      success: true,
      clearResult,
      session,
      auth,
      message: 'Authentication refresh completed'
    };
    
  } catch (error) {
    console.error('❌ Error in force refresh:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
/**
 * Clear all authentication cache and force fresh session detection
 */
function clearAllAuthenticationCache() {
  debugLog('🧹 Clearing all authentication cache...');
  
  try {
    const properties = PropertiesService.getScriptProperties();
    
    // Clear known cache keys
    const cacheKeys = [
      'CACHED_USER_EMAIL',
      'CACHED_USER_NAME',
      'USER_SESSION_CACHE',
      'AUTH_RESULT_CACHE',
      'LAST_AUTH_CHECK'
    ];
    
    cacheKeys.forEach(key => {
      try {
        properties.deleteProperty(key);
        debugLog('✅ Cleared:', key);
      } catch (e) {
        debugLog('⚠️  Could not clear:', key);
      }
    });
    
    debugLog('✅ Authentication cache cleared');
    return { success: true, message: 'Cache cleared successfully' };
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Force fresh user session detection (bypasses all caching)
 */
function getFreshUserSession() {
  debugLog('🔄 Getting fresh user session (no cache)...');
  
  try {
    let userEmail = '';
    let userName = '';
    
    // Method 1: Direct Session.getActiveUser()
    try {
      const user = Session.getActiveUser();
      if (user && user.getEmail) {
        userEmail = user.getEmail();
        userName = user.getName ? user.getName() : '';
        debugLog('✅ Got user from Session.getActiveUser():', userEmail);
      }
    } catch (e) {
      debugLog('⚠️  Session.getActiveUser() failed:', e.message);
    }
    
    // Method 2: Try Session.getEffectiveUser() if needed
    if (!userEmail) {
      try {
        const effectiveUser = Session.getEffectiveUser();
        if (effectiveUser && effectiveUser.getEmail) {
          userEmail = effectiveUser.getEmail();
          userName = effectiveUser.getName ? effectiveUser.getName() : '';
          debugLog('✅ Got user from Session.getEffectiveUser():', userEmail);
        }
      } catch (e) {
        debugLog('⚠️  Session.getEffectiveUser() failed:', e.message);
      }
    }
    
    const result = {
      email: userEmail.trim(),
      name: userName.trim() || extractNameFromEmail(userEmail),
      hasEmail: !!userEmail.trim(),
      hasName: !!userName.trim(),
      source: 'fresh_session',
      timestamp: new Date().toISOString()
    };
    
    debugLog('Fresh session result:', JSON.stringify(result, null, 2));
    return result;
    
  } catch (error) {
    console.error('❌ Fresh session detection failed:', error);
    return {
      email: '',
      name: '',
      hasEmail: false,
      hasName: false,
      source: 'error',
      error: error.message
    };
  }
}

function testMySetup() {
  const result = debugSystemSetup();
  debugLog('Debug result:', result);
  return result;
}
// ISSUE 2: doGet function problems
// Your current doGet might have issues. Here's a corrected version:
function testNavigationUrls() {
  const baseUrl = getWebAppUrl();
  debugLog('Web app URL:', baseUrl);
  
  const nav = getNavigationHtmlWithDynamicUrls('requests');
  debugLog('Generated navigation:', nav);
}


// ISSUE 3: getNavigationHtml function problems
// Make sure this function is working correctly:

/**
 * Robust getNavigationHtml function
 */
function getNavigationHtml(currentPage = '') {
  try {
    debugLog('getNavigationHtml: Called for page: ' + currentPage); // Added
    debugLog(`🧭 Getting navigation for page: ${currentPage}`);
    
    let navContent;
    try {
      navContent = HtmlService.createHtmlOutputFromFile('_navigation.html').getContent();
      debugLog('getNavigationHtml: _navigation.html content length: ' + (navContent ? navContent.length : 'null')); // Added
      debugLog(`📄 Navigation file loaded: ${navContent.length} chars`);
    } catch (error) {
      console.error('❌ Could not load _navigation.html:', error);
      throw error;
    }
    
    if (!navContent || navContent.length === 0) {
      throw new Error('Navigation file is empty');
    }
    
    // Add active class if needed
    if (currentPage) {
      // Find the anchor with the matching data-page attribute regardless of
      // attribute order and ensure it has the "active" class
      const linkPattern = new RegExp(
        `<a[^>]*data-page="${currentPage}"[^>]*>`,
        'i'
      );
      navContent = navContent.replace(linkPattern, function(anchorHtml) {
        // Update the class attribute inside the matched anchor
        return anchorHtml.replace(/class="([^"]*)"/, function(_, classes) {
          const classList = classes.split(/\s+/);
          if (!classList.includes('active')) {
            classList.push('active');
          }
          return `class="${classList.join(' ')}"`;
        });
      });
    }
    debugLog('getNavigationHtml: Returning HTML (first 100 chars): ' + (navContent ? navContent.substring(0,100) : 'null')); // Added
    return navContent;
    
  } catch (error) {
    console.error('❌ Error in getNavigationHtml:', error);
    // Log error before returning fallback
    debugLog('getNavigationHtml: Returning HTML (first 100 chars): ' + 'null (error fallback)'); // Added for error path
    
    // Return basic fallback navigation
    const baseUrl = getWebAppUrl();
    return `<nav class="navigation">
      <a href="${baseUrl}" target="_top" class="nav-button ${currentPage === 'dashboard' ? 'active' : ''}">📊 Dashboard</a>
      <a href="${baseUrl}?page=requests" target="_top" class="nav-button ${currentPage === 'requests' ? 'active' : ''}">📋 Requests</a>
      <a href="${baseUrl}?page=assignments" target="_top" class="nav-button ${currentPage === 'assignments' ? 'active' : ''}">🏍️ Assignments</a>
      <a href="${baseUrl}?page=riders" target="_top" class="nav-button ${currentPage === 'riders' ? 'active' : ''}" data-page="riders">👥 Riders</a>
      <a href="${baseUrl}?page=notifications" target="_top" class="nav-button ${currentPage === 'notifications' ? 'active' : ''}">📱 Notifications</a>
      <a href="${baseUrl}?page=reports" target="_top" class="nav-button ${currentPage === 'reports' ? 'active' : ''}">📊 Reports</a>
    </nav>`;
  }
}

// ISSUE 4: Test the complete flow
/**
 * Complete navigation flow test
 */
function testCompleteNavigationFlow() {
  try {
    debugLog('=== COMPLETE NAVIGATION FLOW TEST ===');
    
    // Test 1: _navigation.html file
    debugLog('1. Testing _navigation.html...');
    const navFile = HtmlService.createHtmlOutputFromFile('_navigation.html').getContent();
    debugLog(`   ✅ File exists: ${navFile.length} chars`);
    
    // Test 2: getNavigationHtml function
    debugLog('2. Testing getNavigationHtml...');
    const navHtml = getNavigationHtml('dashboard');
    debugLog(`   ✅ Function works: ${navHtml.length} chars`);
    
    // Test 3: Test with each page file
    debugLog('3. Testing page files...');
    const pages = ['index', 'requests', 'assignments', 'notifications', 'reports'];
    
    pages.forEach(page => {
      try {
        const content = HtmlService.createHtmlOutputFromFile(page).getContent();
        const hasPlaceholder = content.includes('<!--NAVIGATION_MENU_PLACEHOLDER-->');
        debugLog(`   ${page}.html: ${hasPlaceholder ? '✅ HAS' : '❌ MISSING'} placeholder`);
        
        if (hasPlaceholder) {
          const injected = content.replace('<!--NAVIGATION_MENU_PLACEHOLDER-->', navHtml);
          const hasNavAfter = injected.includes('<nav class="navigation">');
          debugLog(`   ${page}.html: Injection ${hasNavAfter ? '✅ SUCCESS' : '❌ FAILED'}`);
        }
      } catch (error) {
        debugLog(`   ${page}.html: ❌ ERROR - ${error.message}`);
      }
    });
    
    // Test 4: Mock doGet call
    debugLog('4. Testing doGet simulation...');
    const mockEvent = { parameter: { page: 'dashboard' } };
    try {
      const result = doGet(mockEvent);
      debugLog(`   ✅ doGet completed successfully`);
      
      const finalContent = result.getContent();
      const hasFinalNav = finalContent.includes('<nav class="navigation">');
      debugLog(`   Navigation in final output: ${hasFinalNav ? '✅ YES' : '❌ NO'}`);
      
    } catch (error) {
      debugLog(`   ❌ doGet failed: ${error.message}`);
    }
    
    debugLog('=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Complete flow test failed:', error);
  }
}
// ===== DEFINITIVE PLACEHOLDER FIX =====

// The debug clearly shows NO HTML comments exist in any file
// This means the placeholders are truly missing from the actual files

/**
 * Function to show exactly what needs to be added to each file
 */
function showExactPlaceholderLocations() {
  const files = ['index', 'requests', 'assignments', 'notifications', 'reports'];
  
  files.forEach(fileName => {
    try {
      debugLog(`\n=== ${fileName.toUpperCase()}.HTML ===`);
      const content = HtmlService.createHtmlOutputFromFile(fileName).getContent();
      
      // Find common insertion points
      const headerEnd = content.indexOf('</header>');
      const bodyStart = content.indexOf('<body>');
      const containerStart = content.indexOf('<div class="container">');
      const navigationStart = content.indexOf('<nav class="navigation">');
      
      debugLog(`File length: ${content.length} characters`);
      debugLog(`</header> found at: ${headerEnd}`);
      debugLog(`<body> found at: ${bodyStart}`);
      debugLog(`<div class="container"> found at: ${containerStart}`);
      debugLog(`<nav class="navigation"> found at: ${navigationStart}`);
      
      // Show the area where placeholder should go
      if (headerEnd !== -1) {
        const start = Math.max(0, headerEnd - 50);
        const end = Math.min(content.length, headerEnd + 100);
        debugLog(`Context around </header>:`);
        debugLog(`"${content.substring(start, end)}"`);
        debugLog(`\n>>> ADD PLACEHOLDER AFTER </header> AND BEFORE NEXT ELEMENT <<<`);
      } else if (bodyStart !== -1) {
        const start = Math.max(0, bodyStart);
        const end = Math.min(content.length, bodyStart + 100);
        debugLog(`Context after <body>:`);
        debugLog(`"${content.substring(start, end)}"`);
        debugLog(`\n>>> ADD PLACEHOLDER AFTER <body> <<<`);
      }
      
    } catch (error) {
      debugLog(`Error reading ${fileName}: ${error.message}`);
    }
  });
}


/**
 * Create fallback navigation HTML
 */
function createFallbackNavigation(currentPage = '') {
  const baseUrl = getWebAppUrl();
  
    const pages = [
      { id: 'dashboard', url: baseUrl, label: '📊 Dashboard' },
      { id: 'requests', url: `${baseUrl}?page=requests`, label: '📋 Requests' },
      { id: 'assignments', url: `${baseUrl}?page=assignments`, label: '🏍️ Assignments' },
      { id: 'riders', url: `${baseUrl}?page=riders`, label: '👥 Riders' }
    ];

    if (['riders', 'rider-schedule', 'admin-schedule'].includes(currentPage)) {
      pages.push(
        { id: 'rider-schedule', url: `${baseUrl}?page=rider-schedule`, label: '📆 My Schedule' },
        { id: 'admin-schedule', url: `${baseUrl}?page=admin-schedule`, label: '🗓️ Manage Schedules' }
      );
    }

    pages.push(
      { id: 'notifications', url: `${baseUrl}?page=notifications`, label: '📱 Notifications' },
      { id: 'reports', url: `${baseUrl}?page=reports`, label: '📊 Reports' }
    );
  
  const navButtons = pages.map(page => {
    const activeClass = page.id === currentPage ? ' active' : '';
    return `<a href="${page.url}" class="nav-button${activeClass}" data-page="${page.id}">${page.label}</a>`;
  }).join('\n        ');
  
  return `    <nav class="navigation">
        ${navButtons}
    </nav>`;
}
// ===== NAVIGATION VERIFICATION STEPS =====

/**
 * Test if the force injection actually worked
 */
function verifyNavigationInjection() {
  try {
    debugLog('=== VERIFYING NAVIGATION INJECTION ===');
    
    // Test the actual doGet function with different pages
    const testPages = ['dashboard', 'requests', 'assignments', 'notifications', 'reports'];
    
    testPages.forEach(pageName => {
      debugLog(`\n--- Testing ${pageName} page ---`);
      
      try {
        const mockEvent = { parameter: { page: pageName === 'dashboard' ? undefined : pageName } };
        const result = doGet(mockEvent);
        const content = result.getContent();
        
        debugLog(`✅ Page loads: ${pageName}`);
        debugLog(`Content length: ${content.length} chars`);
        
        // Check for navigation elements
        const hasNavTag = content.includes('<nav class="navigation">');
        const hasNavButtons = content.includes('nav-button');
        const hasDashboardLink = content.includes('📊 Dashboard');
        const hasRequestsLink = content.includes('📋 Requests');
        
        debugLog(`Has <nav> tag: ${hasNavTag ? '✅' : '❌'}`);
        debugLog(`Has nav buttons: ${hasNavButtons ? '✅' : '❌'}`);
        debugLog(`Has Dashboard link: ${hasDashboardLink ? '✅' : '❌'}`);
        debugLog(`Has Requests link: ${hasRequestsLink ? '✅' : '❌'}`);
        
        if (hasNavTag) {
          // Extract and show the navigation HTML
          const navStart = content.indexOf('<nav class="navigation">');
          const navEnd = content.indexOf('</nav>', navStart) + 6;
          const navHtml = content.substring(navStart, navEnd);
          debugLog(`Navigation HTML: ${navHtml.substring(0, 200)}...`);
        }
        
        // Check if navigation has active class for current page
        if (pageName !== 'dashboard') {
          const hasActiveClass = content.includes(`data-page="${pageName}"`) && content.includes('active');
          debugLog(`Has active class for ${pageName}: ${hasActiveClass ? '✅' : '❌'}`);
        }
        
      } catch (error) {
        debugLog(`❌ Error testing ${pageName}: ${error.message}`);
      }
    });
    
    debugLog('\n=== VERIFICATION COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

/**
 * Quick test to see what the actual web app output looks like
 */
function showActualWebAppOutput() {
  try {
    debugLog('=== ACTUAL WEB APP OUTPUT SAMPLE ===');
    
    const mockEvent = { parameter: {} }; // Dashboard
    const result = doGet(mockEvent);
    const content = result.getContent();
    
    debugLog(`Total content length: ${content.length} characters`);
    
    // Show the first part of the content (should include navigation)
    const firstPart = content.substring(0, 1000);
    debugLog('\nFirst 1000 characters of output:');
    debugLog('---START---');
    debugLog(firstPart);
    debugLog('---END---');
    
    // Look specifically for navigation
    const navIndex = content.indexOf('<nav');
    if (navIndex !== -1) {
      debugLog(`\nNavigation found at position: ${navIndex}`);
      const navSection = content.substring(navIndex, navIndex + 500);
      debugLog('Navigation section:');
      debugLog(navSection);
    } else {
      debugLog('\n❌ No <nav> tag found in output');
    }
    
    // Check what injection strategy was used (look for console logs)
    debugLog('\nDeployment check:');
    debugLog('- If you see navigation HTML above, the injection worked');
    debugLog('- If not, there may be a deployment issue');
    debugLog('- Check your web app deployment settings');
    
  } catch (error) {
    console.error('❌ Error showing output:', error);
  }
}

/**
 * Check deployment and provide troubleshooting steps
 */
function checkDeploymentStatus() {
  try {
    debugLog('=== DEPLOYMENT TROUBLESHOOTING ===');
    
    // Get the web app URL
    const webAppUrl = getWebAppUrl();
    debugLog(`Web App URL: ${webAppUrl}`);
    
    // Check if we can create HTML outputs
    try {
      const testOutput = HtmlService.createHtmlOutput('<h1>Test</h1>');
      debugLog('✅ HTML Service working');
    } catch (error) {
      debugLog('❌ HTML Service error:', error.message);
    }
    
    // Check if navigation file exists
    try {
      const navContent = HtmlService.createHtmlOutputFromFile('_navigation.html').getContent();
      debugLog(`✅ Navigation file exists (${navContent.length} chars)`);
    } catch (error) {
      debugLog('❌ Navigation file error:', error.message);
    }
    
    // Test the doGet function directly
    try {
      const result = doGet({ parameter: {} });
      debugLog('✅ doGet function works');
      
      const content = result.getContent();
      const hasNav = content.includes('<nav');
      debugLog(`Navigation in output: ${hasNav ? '✅ YES' : '❌ NO'}`);
      
    } catch (error) {
      debugLog('❌ doGet function error:', error.message);
    }
    
    debugLog('\nNext steps:');
    debugLog('1. If everything shows ✅ above, check your browser');
    debugLog('2. Open your web app URL in a new private/incognito window');
    debugLog('3. Check browser console (F12) for any errors');
    debugLog('4. If still no navigation, you may need to redeploy the web app');
    
  } catch (error) {
    console.error('❌ Deployment check failed:', error);
  }
}

// BROWSER-SIDE DEBUGGING CODE
// Add this to your HTML files for client-side verification:
const clientDebugCode = `
<script>
document.addEventListener('DOMContentLoaded', function() {
    debugLog('🔍 CLIENT-SIDE NAVIGATION DEBUG');
    
    // Check if navigation exists
    const nav = document.querySelector('nav.navigation');
    debugLog('Navigation element found:', !!nav);
    
    if (nav) {
        debugLog('✅ Navigation HTML:', nav.outerHTML);
        debugLog('✅ Navigation visible:', nav.offsetHeight > 0);
        debugLog('✅ Navigation position:', nav.getBoundingClientRect());
        
        // Check nav buttons
        const buttons = nav.querySelectorAll('.nav-button');
        debugLog('✅ Number of nav buttons:', buttons.length);
        
        buttons.forEach((btn, index) => {
            debugLog(\`Button \${index + 1}: \${btn.textContent.trim()}\`);
        });
        
    } else {
        debugLog('❌ Navigation not found in DOM');
        
        // Check if placeholder still exists
        const bodyHtml = document.body.innerHTML;
        if (bodyHtml.includes('NAVIGATION_MENU_PLACEHOLDER')) {
            debugLog('❌ Placeholder still exists - injection failed');
        }
        
        // Check for any nav-related elements
        const navElements = document.querySelectorAll('[class*="nav"], [id*="nav"]');
        debugLog('Other nav elements found:', navElements.length);
    }
    
    // Check page parameters
    const urlParams = new URLSearchParams(window.location.search);
    debugLog('Current page parameter:', urlParams.get('page') || 'dashboard');
});
</script>
`;

/* 
TESTING CHECKLIST:

1. Run verifyNavigationInjection() to test all pages
2. Run showActualWebAppOutput() to see what's being generated
3. Run checkDeploymentStatus() for troubleshooting info

4. If tests show navigation exists but you don't see it:
   - Clear browser cache
   - Try private/incognito window
   - Check if you need to redeploy the web app

5. Add the client debug code to one HTML file temporarily to check browser-side

6. If navigation still doesn't appear:
   - Go to Deploy → Manage Deployments
   - Create a new deployment (New Deployment button)
   - Set Execute as: Me
   - Set Access: Anyone
   - Deploy and use the new URL
*/
/**
 * Test the force injection approach
 */
function testForceInjection() {
  try {
    debugLog('=== TESTING FORCE INJECTION ===');
    
    const mockEvent = { parameter: { page: 'dashboard' } };
    const result = doGetWithForceInjection(mockEvent);
    const finalContent = result.getContent();
    
    debugLog(`Final content length: ${finalContent.length}`);
    debugLog(`Has navigation: ${finalContent.includes('<nav class="navigation">')}`);
    debugLog(`Has nav buttons: ${finalContent.includes('nav-button')}`);
    
    // Show navigation section
    const navStart = finalContent.indexOf('<nav class="navigation">');
    if (navStart !== -1) {
      const navEnd = finalContent.indexOf('</nav>', navStart) + 6;
      debugLog('Navigation HTML in final content:');
      debugLog(finalContent.substring(navStart, navEnd));
    }
    
    return { success: true, hasNavigation: finalContent.includes('<nav class="navigation">') };
    
  } catch (error) {
    console.error('Force injection test failed:', error);
    return { success: false, error: error.message };
  }
}



function testPlaceholderInFiles() {
  const filesToCheck = ['index', 'requests', 'assignments', 'notifications', 'reports'];
  
  filesToCheck.forEach(fileName => {
    try {
      const content = HtmlService.createHtmlOutputFromFile(fileName).getContent();
      const placeholder = '<!--NAVIGATION_MENU_PLACEHOLDER-->';
      const placeholderIndex = content.indexOf(placeholder);
      
      debugLog(`${fileName}.html: Placeholder ${placeholderIndex !== -1 ? 'FOUND' : 'NOT FOUND'} at index ${placeholderIndex}`);
      
      if (placeholderIndex !== -1) {
        const context = content.substring(placeholderIndex - 50, placeholderIndex + 100);
        debugLog(`Context: ${context}`);
      }
    } catch (error) {
      debugLog(`Error checking ${fileName}.html: ${error.message}`);
    }
  });
}
function testNavigationMenu() {
  try {
    const navContent = HtmlService.createHtmlOutputFromFile('_navigation.html').getContent();
    debugLog('Navigation file exists. Length:', navContent.length);
    debugLog('Content:', navContent);
    return navContent;
  } catch (error) {
    debugLog('Navigation file error:', error.message);
    return null;
  }
}
/**
 * Enhanced onEdit function that clears cache when relevant sheets are modified.
 * Also handles Request ID generation, dashboard filter changes, and notification actions.
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e The onEdit event object.
 * @return {void}
 */
function _onEdit(e) {
  // Simple throttling to prevent rapid, identical edits from firing multiple times.
  const now = Date.now();
  const last = PropertiesService.getScriptProperties().getProperty('lastEditTime');
  if (last && (now - parseInt(last, 10)) < 1000) { // 1-second debounce.
    debugLog('_onEdit: Guard triggered, exiting.');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('lastEditTime', now.toString());

  const range = e.range;
  if (!range) {
    // This should ideally not happen if `e` is a valid edit event.
    debugLog('_onEdit: No range in event, exiting.');
    return;
  }

  const sheet = range.getSheet();
  const sheetName = sheet.getName();
  const cellA1 = range.getA1Notation();
  const row = range.getRow();
  const col = range.getColumn();

  debugLog(`_onEdit fired on sheet "${sheetName}", cell ${cellA1}`);

  // Protection: Skip rider name column edits (Riders sheet, column B) and header row edits.
  if (sheetName === 'Riders' && (col === 2 || row === 1)) {
    debugLog('🛡️ _onEdit: Protecting rider name/header edit - skipping processing');
    return;
  }

  // Clear relevant caches when the underlying data changes.
  if (['Requests', 'Assignments', 'Riders'].includes(sheetName)) {
    clearRequestsCache();
    clearDashboardCache();

    // Specific actions only for Requests sheet
    if (sheetName === CONFIG.sheets.requests) {
      if (row > 1) { // Not header row
        // Generation of Request ID (in column A).
        // This is necessary because onEditRequestsSheet is called within _onEdit now.
        // It needs to be inside a conditional to only trigger if the ID is missing.
        const requestIdCell = sheet.getRange(row, 1);
        requestIdCell.setNumberFormat('@'); // Force plain text format
        let requestId = requestIdCell.getValue();

        if (!requestId || typeof requestId !== 'string' || !requestId.match(/^[A-L]-\d{2}-\d{2}$/)) {
          const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
          const eventDateCol = headers.indexOf(CONFIG.columns.requests.eventDate) + 1;
          const eventDate = eventDateCol > 0 ? sheet.getRange(row, eventDateCol).getValue() : null;
          const newId = generateRequestId(sheet, eventDate);
          requestIdCell.setValue(newId);
          logActivity(`Generated new Request ID: ${newId} for row ${row}`);
          // A break is needed here to prevent immediate re-triggering, or simply let the next `onEdit` catch it.
          // For simplicity and efficiency, let's allow onEditRequestsSheet handle post-ID-generation logic.
        }
      }
      onEditRequestsSheet(e); // Route to specialized handler for Requests sheet
      return;
    }
  }

  // Handle Dashboard sheet edits.
  if (sheetName === CONFIG.sheets.dashboard) {
    debugLog('_onEdit: Routing to dashboard logic');

    // Handle filter dropdown changes (cell B9).
    if (cellA1 === CONFIG.dashboard.filterCell) {
      debugLog(`_onEdit: Filter cell changed to "${range.getValue()}", refreshing dashboard.`);
      const lock = LockService.getScriptLock();
      if (lock.tryLock(10000)) { // Attempt to acquire lock for 10 seconds.
        try {
          refreshDashboard(true); // Force update dashboard
        } catch (err) {
          logError('Error refreshing dashboard on filter change', err);
        } finally {
          lock.releaseLock();
        }
      }
      return;
    }

    // Handle notification column actions (column K - 11th column).
    const requestsDisplayStartRow = CONFIG.dashboard.requestsDisplayStartRow;
    if (col === 11 && row >= requestsDisplayStartRow) {
      debugLog(`_onEdit: Notification action selected at row ${row}`);
      handleEnhancedNotificationAction(e, sheet, row);
      return;
    }
  }
  debugLog(`_onEdit: Edit on unrelated sheet "${sheetName}" or column, skipping.`);
}

// =======================
// REQUEST ID GENERATOR & MANAGEMENT
// =======================
/**
 * Function to handle onEdit events specifically for the Requests sheet.
 * Generates Request ID if missing and updates request status based on rider assignment changes.
 */
// ===== NAVIGATION HELPER =====
/**
 * Fetches the HTML content of the shared navigation menu.
 * @param {string} [currentPage=''] The name of the current page (e.g., 'dashboard', 'requests') to set the active link.
 * @return {string} The HTML content of the navigation menu.
 */
function getNavigationHtml(currentPage = '') {
  try {
    Logger.log("Base Script URL: " + getWebAppUrl()); // Added for URL context
    let navHtmlFromFile = HtmlService.createHtmlOutputFromFile('_navigation.html').getContent();
    Logger.log('Fetched _navigation.html content: ' + navHtmlFromFile);

    let navHtmlProcessed = navHtmlFromFile;
    // Logic to set the 'active' class
    if (currentPage) {
      // More robust regex to add 'active' class to the correct link
      // It looks for an <a> tag with the correct data-page and class="nav-button"
      // and inserts ' active' into the class attribute.
      const linkToMakeActivePattern = new RegExp(
        `(<a[^>]*data-page="${currentPage}"[^>]*class="[^"]*nav-button)([^"]*)("[^>]*>)`,
        'i'
      );

      navHtmlProcessed = navHtmlProcessed.replace(linkToMakeActivePattern, function(match, p1, p2, p3) {
        if (p2.includes(' active')) { // Already active (or nav-button active)
          // Check if it's exactly ' active' or part of another class like 'nav-button-active'
          // This check ensures we don't add 'active' if 'nav-button active' is already present.
          if (/(?:^|\s)active(?:\s|$)/.test(p2)) {
            return match; // Already correctly active
          }
          // If 'active' is part of another class name, this might need more specific handling,
          // but for 'nav-button active' it should be fine.
        }
        // Insert ' active' ensuring a space if other classes follow nav-button
        return `${p1} active${p2}${p3}`;
      });
    }
    Logger.log('Processed navigationMenuHtml (with active class attempt for ' + currentPage + '): ' + navHtmlProcessed);
    return navHtmlProcessed;
  } catch (error) {
    logError('Error getting navigation HTML', error);
    Logger.log('Error in getNavigationHtml: ' + error.toString());
    return '<!-- Navigation Load Error -->'; // Fallback
  }
}

// ===== WEB APP ENTRY POINTS (DO NOT EDIT FUNCTION NAMES)=====




/**
 * Handles HTTP POST requests, serving as an API endpoint for the web app.
 * @param {GoogleAppsScript.Events.DoPost} e The event object from the POST request.
 *                                         `e.parameter.action` specifies the function to call.
 *                                         `e.parameter.data` contains a JSON string of arguments for the action.
 * @return {GoogleAppsScript.ContentService.TextOutput} A JSON response indicating success or failure.
 */
/**
 * Complete doPost function with SMS webhook handler
 * Replace your existing doPost function in Code.js with this version
 */
function doPost(e) {
  try {
    debugLog('📨 doPost called');
    
    // Log the incoming request for debugging
    if (e && e.parameter) {
      debugLog('📋 Parameters received:', JSON.stringify(e.parameter));
    }
    
    // Check if this is a Twilio SMS webhook
    if (e.parameter.webhook === 'sms' || e.parameter.From) {
      debugLog('📱 Detected SMS webhook from Twilio');
      return handleSMSWebhook(e);
    }
    
    // Handle regular web app API calls
    const action = e.parameter.action;
    const data = JSON.parse(e.parameter.data || '{}');
    
    debugLog(`🔧 doPost action: ${action}`);
    
    let result = {};
    
    switch (action) {
      case 'createRequest':
        throw new Error('createRequest action not implemented in this version.');
        
      case 'updateRequestStatus':
        throw new Error('updateRequestStatus action not implemented in this version.');
        
      case 'assignRiders':
        result = processAssignmentAndPopulate(data.requestId, data.selectedRiders);
        break;
        
      case 'sendNotification':
        result = sendAssignmentNotification(data.assignmentId, data.notificationType);
        break;
        
      case 'bulkNotification':
        result = sendBulkNotificationsByTimeframe(data.filter, data.type);
        break;
        
      case 'generateReport':
        result = generateReportData(data.filters);
        break;
      
      case 'riderOperation':
        result = handleRiderOperation(data.action, data.data);
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    // Return standard success response for API calls
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('❌ doPost error:', error);
    logError('doPost error', error);
    
    // Return standard error response for API calls
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle incoming SMS responses from Twilio
 * This function processes SMS replies from riders
 */
function handleSMSWebhook(e) {
  try {
    debugLog('📱 Processing SMS webhook...');
    
    // Extract Twilio parameters
    const fromNumber = e.parameter.From || '';           // Rider's phone number (+15551234567)
    const toNumber = e.parameter.To || '';               // Your Twilio number
    const messageBody = e.parameter.Body || '';          // The SMS message content
    const messageSid = e.parameter.MessageSid || '';     // Twilio message ID
    const accountSid = e.parameter.AccountSid || '';     // Twilio account ID
    
    debugLog(`📨 SMS from ${fromNumber} to ${toNumber}: "${messageBody}"`);
    debugLog(`📋 Message SID: ${messageSid}`);
    
    // Verify this is from your Twilio account (security check)
    if (accountSid && accountSid !== CONFIG.twilio.accountSid) {
      console.warn('⚠️ SMS webhook from unknown account, ignoring');
      return createTwiMLResponse();
    }
    
    // Process the SMS response
    const responseResult = processSMSResponse(fromNumber, messageBody, messageSid);
    
    // Log the response for tracking
    logSMSResponse(fromNumber, messageBody, messageSid, responseResult);
    
    debugLog(`✅ SMS response processed: ${responseResult.action}`);
    
    // Return empty TwiML response (required by Twilio)
    return createTwiMLResponse();
    
  } catch (error) {
    console.error('❌ SMS webhook error:', error);
    logError('SMS webhook error', error);
    
    // Always return valid TwiML response, even on error
    return createTwiMLResponse();
  }
}

/**
 * Process SMS responses from riders
 */
function processSMSResponse(fromNumber, messageBody, messageSid) {
  try {
    const cleanMessage = messageBody.trim().toLowerCase();
    debugLog(`🔍 Processing message: "${cleanMessage}"`);
    
    // Find the rider by phone number
    const rider = findRiderByPhone(fromNumber);
    if (!rider) {
      debugLog(`⚠️ SMS from unknown number: ${fromNumber}`);
      
      // Send helpful response to unknown numbers
      sendAutoReply(fromNumber, 'This number is not registered in our rider system. Please contact dispatch if you need assistance.');
      
      return { 
        action: 'unknown_number', 
        rider: null,
        fromNumber: fromNumber 
      };
    }
    
    debugLog(`👤 SMS from rider: ${rider.name}`);
    
    // Process different response types
    let action = 'unknown';
    let autoReply = null;
    let statusUpdate = null;
    
    if (cleanMessage.includes('confirm') || cleanMessage === 'yes' || cleanMessage === 'y' || cleanMessage === '1') {
      action = 'confirm';
      statusUpdate = 'Confirmed';
      autoReply = `✅ Thanks ${rider.name}! Your assignment is CONFIRMED. Safe riding! 🏍️`;
      
    } else if (cleanMessage.includes('decline') || cleanMessage.includes('cancel') || cleanMessage === 'no' || cleanMessage === 'n' || cleanMessage === '0') {
      action = 'decline';
      statusUpdate = 'Declined';
      autoReply = `📝 Thanks for letting us know, ${rider.name}. We'll assign another rider for this request.`;
      
    } else if (cleanMessage.includes('info') || cleanMessage.includes('details') || cleanMessage.includes('help')) {
      action = 'info_request';
      autoReply = getAssignmentDetails(rider.name);
      
    } else if (cleanMessage.includes('status') || cleanMessage.includes('assignment')) {
      action = 'status_check';
      autoReply = getAssignmentStatus(rider.name);
      
    } else {
      action = 'general_response';
      autoReply = `Thanks for your message, ${rider.name}. An admin will review and respond if needed.\n\nQuick replies:\n• Reply "Confirm" - Accept assignment\n• Reply "Decline" - Cannot accept\n• INFO - Get assignment details`;
      
      // Notify admin of message that needs attention
      notifyAdminOfResponse(rider.name, fromNumber, messageBody);
    }
    
    // Update assignment status if needed
    if (statusUpdate) {
      const updateResult = updateAssignmentStatus(rider.name, statusUpdate, 'SMS');
      debugLog(`📊 Status update result: ${updateResult.success ? 'Success' : 'Failed'}`);
    }
    
    // Send auto-reply
    if (autoReply) {
      setTimeout(() => {
        sendAutoReply(fromNumber, autoReply);
      }, 1000); // Small delay to ensure proper order
    }
    
    return { 
      action: action, 
      rider: rider.name, 
      statusUpdate: statusUpdate,
      autoReply: !!autoReply 
    };
    
  } catch (error) {
    console.error('❌ Error processing SMS response:', error);
    logError('Error processing SMS response', error);
    
    return { 
      action: 'error', 
      error: error.message,
      fromNumber: fromNumber 
    };
  }
}

/**
 * Find rider by phone number
 */
function findRiderByPhone(phoneNumber) {
  try {
    const ridersData = getRidersData();
    
    // Clean the search phone number (remove +1 and non-digits, get last 10 digits)
    const cleanSearchNumber = phoneNumber.replace(/\D/g, '').slice(-10);
    debugLog(`🔍 Searching for rider with phone ending in: ${cleanSearchNumber}`);
    
    for (let i = 0; i < ridersData.data.length; i++) {
      const row = ridersData.data[i];
      const riderPhone = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.phone);
      const riderName = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.name);
      
      if (riderPhone && riderName) {
        // Clean the rider's phone number the same way
        const cleanRiderPhone = riderPhone.replace(/\D/g, '').slice(-10);
        
        if (cleanRiderPhone === cleanSearchNumber) {
          debugLog(`✅ Found rider: ${riderName}`);
          return {
            name: riderName,
            phone: riderPhone,
            email: getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.email) || '',
            jpNumber: getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.jpNumber) || ''
          };
        }
      }
    }
    
    debugLog(`❌ No rider found for phone: ${phoneNumber}`);
    return null;
    
  } catch (error) {
    console.error('❌ Error finding rider by phone:', error);
    logError('Error finding rider by phone', error);
    return null;
  }
}

/**
 * Update assignment status based on rider response
 */
function updateAssignmentStatus(riderName, newStatus, method) {
  try {
    debugLog(`📊 Updating status for ${riderName} to ${newStatus}`);
    
    const assignmentsData = getAssignmentsData(false); // Force fresh data
    const sheet = assignmentsData.sheet;
    let updatedCount = 0;
    
    for (let i = 0; i < assignmentsData.data.length; i++) {
      const row = assignmentsData.data[i];
      const assignmentRider = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const currentStatus = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      const assignmentId = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.id);
      
      // Update assignments that are currently "Assigned" for this rider
      if (assignmentRider === riderName && currentStatus === 'Assigned') {
        const rowNumber = i + 2; // Account for header row
        const statusColIndex = assignmentsData.columnMap[CONFIG.columns.assignments.status] + 1;
        
        sheet.getRange(rowNumber, statusColIndex).setValue(newStatus);

        if (newStatus === 'Confirmed') {
          const confirmedCol = assignmentsData.columnMap[CONFIG.columns.assignments.confirmedDate];
          if (confirmedCol !== undefined) {
            sheet.getRange(rowNumber, confirmedCol + 1).setValue(new Date());
          }
          const methodCol = assignmentsData.columnMap[CONFIG.columns.assignments.confirmationMethod];
          if (methodCol !== undefined && method) {
            sheet.getRange(rowNumber, methodCol + 1).setValue(method);
          }
        }
        
        debugLog(`✅ Updated assignment ${assignmentId}: ${riderName} → ${newStatus}`);
        logActivity(`SMS Response: Assignment ${assignmentId} status updated to ${newStatus} for ${riderName}`);
        updatedCount++;
      }
    }
    
    return { success: true, updatedCount: updatedCount };
    
  } catch (error) {
    console.error('❌ Error updating assignment status:', error);
    logError('Error updating assignment status', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update assignment status by assignment ID
 */
function updateAssignmentStatusById(assignmentId, newStatus, method) {
  try {
    const assignmentsData = getAssignmentsData(false);
    const sheet = assignmentsData.sheet;
    const rowIndex = assignmentsData.data.findIndex(row =>
      getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.id) === assignmentId
    );

    if (rowIndex === -1) {
      return { success: false, error: 'Assignment not found' };
    }

    const rowNumber = rowIndex + 2;
    const statusColIndex = assignmentsData.columnMap[CONFIG.columns.assignments.status] + 1;
    sheet.getRange(rowNumber, statusColIndex).setValue(newStatus);

    if (newStatus === 'Confirmed') {
      const confirmedCol = assignmentsData.columnMap[CONFIG.columns.assignments.confirmedDate];
      if (confirmedCol !== undefined) {
        sheet.getRange(rowNumber, confirmedCol + 1).setValue(new Date());
      }
      const methodCol = assignmentsData.columnMap[CONFIG.columns.assignments.confirmationMethod];
      if (methodCol !== undefined && method) {
        sheet.getRange(rowNumber, methodCol + 1).setValue(method);
      }
    }

    logActivity(`Assignment ${assignmentId} status updated to ${newStatus}`);

    return { success: true };

  } catch (error) {
    console.error('❌ Error updating assignment status by ID:', error);
    logError('Error updating assignment status by ID', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get assignment details for a rider
 */
function getAssignmentDetails(riderName) {
  try {
    debugLog(`📋 Getting assignment details for ${riderName}`);
    
    const assignmentsData = getAssignmentsData();
    
    for (let i = 0; i < assignmentsData.data.length; i++) {
      const row = assignmentsData.data[i];
      const assignmentRider = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const status = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      
      // Find active assignments for this rider
      if (assignmentRider === riderName && ['Assigned', 'Confirmed'].includes(status)) {
        const assignmentId = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.id);
        const requestId = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
        const eventDate = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
        const startTime = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.startTime);
        const startLocation = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.startLocation);
        const endLocation = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.endLocation);
        
        let details = `Assignment: ${assignmentId}\n`;
        details += `Request: ${requestId}\n`;
        details += `Rider: ${riderName}\n\n`;
        details += `Request Details:\n`;
        details += `📅 Date: ${formatDateForDisplay(eventDate)}\n`;
        details += `🕐 Time: ${formatTimeForDisplay(startTime)}\n`;
        details += `📍 Start: ${startLocation || 'TBD'}\n`;
        details += `🏁 End: ${endLocation || 'TBD'}\n`;
        details += `Status: ${status}\n\n`;
        details += `RESPOND:\n`;
        details += `Reply "Confirm"\n`;
        details += `Reply "Decline"`;
        
        return details;
      }
    }
    
    return `Hi ${riderName}! No current assignments found. You'll receive notifications when new assignments are available.`;
    
  } catch (error) {
    console.error('❌ Error getting assignment details:', error);
    logError('Error getting assignment details', error);
    return `Sorry ${riderName}, unable to retrieve assignment details right now. Please contact dispatch.`;
  }
}

/**
 * Get current assignment status for a rider
 */
function getAssignmentStatus(riderName) {
  try {
    const assignmentsData = getAssignmentsData();
    const activeAssignments = [];
    
    for (let i = 0; i < assignmentsData.data.length; i++) {
      const row = assignmentsData.data[i];
      const assignmentRider = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const status = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      
      if (assignmentRider === riderName && !['Completed', 'Cancelled'].includes(status)) {
        const requestId = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
        const eventDate = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
        
        activeAssignments.push({
          requestId: requestId,
          eventDate: formatDateForDisplay(eventDate),
          status: status
        });
      }
    }
    
    if (activeAssignments.length === 0) {
      return `Hi ${riderName}! You have no active assignments at this time.`;
    } else {
      let statusMsg = `📊 STATUS for ${riderName}:\n\n`;
      activeAssignments.forEach((assignment, index) => {
        statusMsg += `${index + 1}. ${assignment.requestId}\n`;
        statusMsg += `   Date: ${assignment.eventDate}\n`;
        statusMsg += `   Status: ${assignment.status}\n\n`;
      });
      statusMsg += `Reply INFO for full details of any assignment.`;
      return statusMsg;
    }
    
  } catch (error) {
    console.error('❌ Error getting assignment status:', error);
    return `Sorry ${riderName}, unable to check status right now.`;
  }
}

/**
 * Send auto-reply SMS
 */
function sendAutoReply(toNumber, message) {
  try {
    debugLog(`📱 Sending auto-reply to ${toNumber}`);
    
    // Remove +1 country code for the sendSMS function
    const cleanNumber = toNumber.replace('+1', '');
    
    const result = sendSMS(cleanNumber, 'auto', message);
    
    if (result.success) {
      debugLog(`✅ Auto-reply sent successfully`);
      logActivity(`Auto-reply sent to ${toNumber}: ${message.substring(0, 50)}...`);
    } else {
      console.error(`❌ Auto-reply failed: ${result.message}`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error sending auto-reply:', error);
    logError('Error sending auto-reply', error);
    return { success: false, message: error.message };
  }
}

/**
 * Log SMS responses to tracking sheet
 */
function logSMSResponse(fromNumber, messageBody, messageSid, result) {
  try {
    const sheet = getOrCreateSheet('SMS_Responses', [
      'Timestamp', 'From Number', 'Rider Name', 'Message Body', 'Action', 'Status Update', 'Auto Reply Sent'
    ]);
    
    sheet.appendRow([
      new Date(),
      fromNumber,
      result.rider || 'Unknown',
      messageBody,
      result.action,
      result.statusUpdate || 'None',
      result.autoReply ? 'Yes' : 'No'
    ]);
    
    debugLog(`📝 SMS response logged: ${result.action}`);
    
  } catch (error) {
    console.error('❌ Error logging SMS response:', error);
    logError('Error logging SMS response', error);
  }
}

/**
 * Notify admin of responses that need manual handling
 */
function notifyAdminOfResponse(riderName, fromNumber, messageBody) {
  try {
    const logMessage = `SMS Response needs attention - ${riderName} (${fromNumber}): "${messageBody}"`;
    logActivity(logMessage);
    
    // Could also send email notification here if needed:
    // GmailApp.sendEmail('admin@yourdomain.com', 'SMS Response Needs Attention', logMessage);
    
    debugLog(`📧 Admin notified of response from ${riderName}`);
    
  } catch (error) {
    console.error('❌ Error notifying admin:', error);
    logError('Error notifying admin of response', error);
  }
}

/**
 * Find rider by email address
 */
function findRiderByEmail(emailAddress) {
  try {
    const ridersData = getRidersData();
    const cleanEmail = String(emailAddress).trim().toLowerCase();

    for (let i = 0; i < ridersData.data.length; i++) {
      const row = ridersData.data[i];
      const riderEmail = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.email);
      const riderName = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.name);

      if (riderEmail && riderName && String(riderEmail).trim().toLowerCase() === cleanEmail) {
        return {
          name: riderName,
          email: riderEmail,
          phone: getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.phone) || '',
          jpNumber: getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.jpNumber) || ''
        };
      }
    }

    debugLog(`❌ No rider found for email: ${emailAddress}`);
    return null;

  } catch (error) {
    console.error('❌ Error finding rider by email:', error);
    logError('Error finding rider by email', error);
    return null;
  }
}

/**
 * Process unread email replies from riders
 * Intended to run via time-based trigger
 */
function processEmailResponses() {
  try {
    const threads = GmailApp.search('is:unread in:inbox');
    threads.forEach(thread => {
      const messages = thread.getMessages();
      messages.forEach(msg => {
        if (!msg.isUnread()) return;
        const fromEmail = msg.getFrom().replace(/.*<|>.*/g, '').trim().toLowerCase();
        const body = msg.getPlainBody();
        const subject = msg.getSubject();
        const requestId = extractRequestIdFromSubject(subject);
        const result = handleEmailMessage(fromEmail, body);
        logEmailResponse(fromEmail, body, requestId, result);
        msg.markRead();
      });
    });

    logActivity(`Processed ${threads.length} email thread(s)`);

  } catch (error) {
    logError('Error processing email responses', error);
  }
}

/**
 * Handle a single email message from a rider
 */
function handleEmailMessage(fromEmail, messageBody) {
  try {
    const cleanBody = String(messageBody).trim().toLowerCase();
    const rider = findRiderByEmail(fromEmail);
    if (!rider) {
      return { action: 'unknown_email', rider: null };
    }

    // Append the raw message to the rider's assignment notes for tracking
    appendEmailResponseToAssignments(rider.name, messageBody);

    let action = 'general_response';

    if (cleanBody.includes('confirm') || cleanBody === 'yes' || cleanBody === 'y') {
      action = 'confirm';
      updateAssignmentStatus(rider.name, 'Confirmed', 'Email');
    } else if (cleanBody.includes('decline') || cleanBody.includes('cancel') || cleanBody === 'no' || cleanBody === 'n') {
      action = 'decline';
      updateAssignmentStatus(rider.name, 'Declined', 'Email');
    }

    return { action: action, rider: rider.name };

  } catch (error) {
    logError('Error handling email message', error);
    return { action: 'error', error: error.message };
  }
}

/**
 * Extract the request ID from an email subject line.
 * Expected subject format: "Assignment <assignmentId> - <requestId>".
 * @param {string} subject The email subject line.
 * @return {string} The request ID if found, else an empty string.
 */
function extractRequestIdFromSubject(subject) {
  try {
    if (!subject) return '';
    const match = subject.match(/Assignment\s+[^-]+-\s*([^\s]+)/i);
    return match ? match[1].trim() : '';
  } catch (error) {
    logError('Error extracting request ID', error);
    return '';
  }
}

/**
 * Log email responses to tracking sheet
 */
function logEmailResponse(fromEmail, messageBody, requestId, result) {
  try {
    const sheet = getOrCreateSheet('Email_Responses', [
      'Timestamp', 'From Email', 'Rider Name', 'Message Body', 'Request ID', 'Action'
    ]);

    sheet.appendRow([
      new Date(),
      fromEmail,
      result.rider || 'Unknown',
      messageBody,
      requestId || '',
      result.action
    ]);

    debugLog(`📝 Email response logged: ${result.action}`);

  } catch (error) {
    console.error('❌ Error logging email response:', error);
    logError('Error logging email response', error);
  }
}

/**
 * Append an email response to the rider's assignment notes
 * @param {string} riderName Rider name associated with the assignments
 * @param {string} messageBody Full email body text
 */
function appendEmailResponseToAssignments(riderName, messageBody) {
  try {
    const assignmentsData = getAssignmentsData(false); // Use fresh data
    const sheet = assignmentsData.sheet;
    const columnMap = assignmentsData.columnMap;

    const notesCol = columnMap[CONFIG.columns.assignments.notes];
    const riderCol = columnMap[CONFIG.columns.assignments.riderName];
    const statusCol = columnMap[CONFIG.columns.assignments.status];

    if (notesCol === undefined || riderCol === undefined) return;

    const timestamp = formatDateTimeForDisplay(new Date());
    const noteText = `[Email ${timestamp}] ${messageBody}`;

    for (let i = 0; i < assignmentsData.data.length; i++) {
      const row = assignmentsData.data[i];
      const assignmentRider = row[riderCol];
      const status = statusCol !== undefined ? row[statusCol] : '';

      if (assignmentRider === riderName && status !== 'Completed' && status !== 'Cancelled') {
        const rowNumber = i + 2; // Account for header row
        const existingNote = row[notesCol] || '';
        const newNote = existingNote ? existingNote + '\n' + noteText : noteText;
        sheet.getRange(rowNumber, notesCol + 1).setValue(newNote);
      }
    }
  } catch (error) {
    console.error('❌ Error appending email response to assignments:', error);
    logError('Error appending email response to assignments', error);
  }
}

/**
 * Create empty TwiML response required by Twilio
 */
function createTwiMLResponse() {
  const twimlResponse = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
  
  return ContentService
    .createTextOutput(twimlResponse)
    .setMimeType(ContentService.MimeType.XML);
}

/**
 * ENHANCEMENT 6: Bulk notification functions by time period (callable from menu)
 */
// Today's assignments
/** @return {void} Sends SMS for today's assignments. */
function sendTodaySMS() { sendBulkByDateRange('SMS', 'today'); }
/** @return {void} Sends Email for today's assignments. */
function sendTodayEmail() { sendBulkByDateRange('Email', 'today'); }
/** @return {void} Sends Both SMS and Email for today's assignments. */
function sendTodayBoth() { sendBulkByDateRange('Both', 'today'); }

// This week's assignments
/** @return {void} Sends SMS for this week's assignments. */
function sendWeekSMS() { sendBulkByDateRange('SMS', 'week'); }
/** @return {void} Sends Email for this week's assignments. */
function sendWeekEmail() { sendBulkByDateRange('Email', 'week'); }
/** @return {void} Sends Both SMS and Email for this week's assignments. */
function sendWeekBoth() { sendBulkByDateRange('Both', 'week'); }
// Pending assignments (not yet notified)
/** @return {void} Sends SMS for pending assignments (never notified). */
function sendPendingSMS() { sendBulkByStatus('SMS', 'pending'); }
/** @return {void} Sends Email for pending assignments (never notified). */
function sendPendingEmail() { sendBulkByStatus('Email', 'pending'); }
/** @return {void} Sends Both SMS and Email for pending assignments (never notified). */
function sendPendingBoth() { sendBulkByStatus('Both', 'pending'); }
// All assigned requests
/** @return {void} Sends SMS for all active, assigned requests. */
function sendAllAssignedSMS() { sendBulkByStatus('SMS', 'assigned'); }
/** @return {void} Sends Email for all active, assigned requests. */
function sendAllAssignedEmail() { sendBulkByStatus('Email', 'assigned'); }
/** @return {void} Sends Both SMS and Email for all active, assigned requests. */
function sendAllAssignedBoth() { sendBulkByStatus('Both', 'assigned'); }

/**
 * Core logic for sending bulk notifications by date range.
 * @param {string} notificationType - The type of notification ('SMS', 'Email', 'Both').
 * @param {string} dateRange - The predefined date range ('today', 'week').
 * @return {void}
 */
function sendBulkByDateRange(notificationType, dateRange) {
  try {
    debugLog(`Bulk ${notificationType} for ${dateRange}`);
    
    // Calculate date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate = new Date(today);
    let endDate = new Date(today);
    
    if (dateRange === 'today') {
      endDate.setHours(23, 59, 59, 999);
    } else if (dateRange === 'week') {
      endDate.setDate(today.getDate() + 7);
      endDate.setHours(23, 59, 59, 999);
    }
    
    const assignmentsData = getAssignmentsData(); // This already retrieves formatted data
    const targetAssignments = assignmentsData.data.filter(assignment => {
      const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate); // This is already a Date object
      const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      
      if (!eventDate || !(eventDate instanceof Date) || !riderName || String(riderName).trim().length === 0) {
        return false;
      }
      
      if (['Cancelled', 'Completed', 'No Show'].includes(status)) {
        return false;
      }
      
      const assignmentDate = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      return assignmentDate.getTime() >= startDate.getTime() && assignmentDate.getTime() <= endDate.getTime();
    });
    
    if (targetAssignments.length === 0) {
      SpreadsheetApp.getUi().alert(`No assignments found for ${dateRange}`);
      return;
    }
    
    const confirmMessage = `Send ${notificationType} notifications to ${targetAssignments.length} assignment(s) for ${dateRange}?`;
    const response = SpreadsheetApp.getUi().alert('Confirm Bulk Notification', confirmMessage, SpreadsheetApp.getUi().ButtonSet.YES_NO);
    
    if (response !== SpreadsheetApp.getUi().Button.YES) {
      return;
    }
    
    processBulkNotifications(targetAssignments, notificationType, `${dateRange} assignments`);
    
  } catch (error) {
    logError(`Error in bulk ${notificationType} for ${dateRange}`, error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Core logic for sending bulk notifications by status type.
 * @param {string} notificationType - The type of notification ('SMS', 'Email', 'Both').
 * @param {string} statusType - The predefined status type ('pending', 'assigned').
 * @return {void}
 */
function sendBulkByStatus(notificationType, statusType) {
  try {
    debugLog(`Bulk ${notificationType} for ${statusType} status`);
    
    const assignmentsData = getAssignmentsData(); // This already retrieves formatted data
    let targetAssignments = [];
    
    if (statusType === 'pending') {
      targetAssignments = assignmentsData.data.filter(assignment => {
        const notified = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.notified);
        const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status); // Get full status

        // Count as pending if has rider, has Assigned/Confirmed/In Progress status, and is NOT notified by any means
        const hasRider = riderName && String(riderName).trim().length > 0;
        const isAssignedActive = ['Assigned', 'Confirmed', 'En Route', 'In Progress'].includes(status);
        const isNotified = notified instanceof Date ||
                           (getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.smsSent) instanceof Date) ||
                           (getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.emailSent) instanceof Date);

        return hasRider && isAssignedActive && !isNotified;
      });
    } else if (statusType === 'assigned') {
      targetAssignments = assignmentsData.data.filter(assignment => {
        const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
        
        return riderName && String(riderName).trim().length > 0 && 
               !['Cancelled', 'Completed', 'No Show'].includes(status);
      });
    }
    
    if (targetAssignments.length === 0) {
      SpreadsheetApp.getUi().alert(`No ${statusType} assignments found`);
      return;
    }
    
    const confirmMessage = `Send ${notificationType} notifications to ${targetAssignments.length} ${statusType} assignment(s)?`;
    const response = SpreadsheetApp.getUi().alert('Confirm Bulk Notification', confirmMessage, SpreadsheetApp.getUi().ButtonSet.YES_NO);
    
    if (response !== SpreadsheetApp.getUi().Button.YES) {
      return;
    }
    
    processBulkNotifications(targetAssignments, notificationType, `${statusType} assignments`);
    
  } catch (error) {
    logError(`Error in bulk ${notificationType} for ${statusType}`, error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Processes bulk notifications for a list of assignments.
 * This is the refined version used for both menu actions and any direct API calls.
 * @param {Array<Array<object>>} assignments - An array of assignment data rows.
 * @param {string} notificationType - The type of notification ('SMS', 'Email', 'Both').
 * @param {string} description - A descriptive string for logging (e.g., "today's assignments").
 * @return {object} A result object with success/failure counts and messages.
 */
function processBulkNotifications(assignments, notificationType, description) {
  try {
    debugLog(`Processing ${assignments.length} bulk notifications: ${notificationType} for ${description}`);
    
    const assignmentsData = getAssignmentsData(); // Get mapping
    let successfulCount = 0;
    let failedCount = 0;
    const errors = [];
    
    assignments.forEach((assignmentRow, index) => {
      const assignmentId = getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.id);
      const riderName = getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const requestId = getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
      
      debugLog(`Processing ${index + 1}/${assignments.length}: ${assignmentId} - ${riderName}`);
      
      try {
        if (notificationType === 'SMS' || notificationType === 'Both') {
          const smsResult = sendAssignmentNotification(assignmentId, 'SMS');
          if (smsResult.success) { successfulCount++; } else { failedCount++; errors.push(`SMS to ${riderName} (${requestId}): ${smsResult.message}`); }
        }
        
        if (notificationType === 'Email' || notificationType === 'Both') {
          const emailResult = sendAssignmentNotification(assignmentId, 'Email');
          if (emailResult.success) { successfulCount++; } else { failedCount++; errors.push(`Email to ${riderName} (${requestId}): ${emailResult.message}`); }
        }
        
        if (index % 5 === 4) { // Pause every 5 notifications to avoid rate limits
          Utilities.sleep(1000);
        }
      } catch (error) {
        failedCount++;
        errors.push(`${riderName} (${requestId}): ${error.message}`);
      }
    });
    
    logActivity(`Bulk ${notificationType} for ${description}: ${successfulCount} successful, ${failedCount} failed`);
    
    const message = `Processed ${assignments.length} notifications: ${successfulCount} successful, ${failedCount} failed.`;
    
    // For menu calls, use SpreadsheetApp.getUi().alert
    if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.getUi) {
      let alertMessage = `Bulk Notification Results for ${description}:\n\n`;
      alertMessage += `📊 Total Processed: ${assignments.length}\n`;
      alertMessage += `✅ Successful: ${successfulCount}\n`;
      alertMessage += `❌ Failed: ${failedCount}\n\n`;
      if (errors.length > 0) {
        alertMessage += `Errors (showing first 5):\n${errors.slice(0, 5).join('\n')}`;
        if (errors.length > 5) alertMessage += `\n... and ${errors.length - 5} more`;
      }
      SpreadsheetApp.getUi().alert('Bulk Notification Results', alertMessage, SpreadsheetApp.getUi().ButtonSet.OK);
    }

    // For doPost calls, return simplified result
    return { success: true, successful: successfulCount, failed: failedCount, errors: errors.slice(0, 10), message: message };
    
  } catch (error) {
    logError('Error processing bulk notifications', error);
    // For menu alerts
    if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.getUi) {
      SpreadsheetApp.getUi().alert('Bulk Notification Error', 'Error processing bulk notifications: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
    }
    // For doPost errors
    throw new Error('Error processing bulk notifications: ' + error.message);
  }
}

/**
 * Generates a comprehensive notification report and displays it in an alert.
 * @return {void}
 */
function generateNotificationReport() {
  try {
    debugLog('Generating notification report');
    
    const assignmentsData = getAssignmentsData(); // This already retrieves formatted data
    const allAssignments = assignmentsData.data.filter(assignment => {
      const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      return status === 'Assigned';
    });
    
    if (allAssignments.length === 0) {
      SpreadsheetApp.getUi().alert('No assigned riders found for report');
      return;
    }
    
    let report = `📊 NOTIFICATION REPORT\n`;
    report += `Generated: ${formatDateTimeForDisplay(new Date())}\n\n`;
    
    let totalAssignments = 0;
    let notifiedCount = 0;
    let smsCount = 0;
    let emailCount = 0;
    
    const byRequest = {};
    
    allAssignments.forEach(assignment => {
      const requestId = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
      const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const notified = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.notified); // Date object or null
      const smsSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.smsSent); // Date object or null
      const emailSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.emailSent); // Date object or null
      
      totalAssignments++;
      
      if (notified instanceof Date) notifiedCount++;
      if (smsSent instanceof Date) smsCount++;
      if (emailSent instanceof Date) emailCount++;
      
      if (!byRequest[requestId]) {
        byRequest[requestId] = [];
      }
      
      byRequest[requestId].push({
        rider: riderName,
        notified: notified instanceof Date,
        sms: smsSent instanceof Date,
        email: emailSent instanceof Date
      });
    });
    
    report += `📈 SUMMARY:\n`;
    report += `Total Assignments: ${totalAssignments}\n`;
    report += `Notified: ${notifiedCount} (${(totalAssignments > 0 ? (notifiedCount/totalAssignments*100).toFixed(0) : 0)}%)\n`;
    report += `SMS Sent: ${smsCount} (${(totalAssignments > 0 ? (smsCount/totalAssignments*100).toFixed(0) : 0)}%)\n`;
    report += `Email Sent: ${emailCount} (${(totalAssignments > 0 ? (emailCount/totalAssignments*100).toFixed(0) : 0)}%)\n\n`;
    
    report += `📋 BY REQUEST (first 10):\n`;
    Object.entries(byRequest).slice(0, 10).forEach(([requestId, riders]) => {
      report += `${requestId}: ${riders.length} rider(s)\n`;
      riders.forEach(rider => {
        const status = [];
        if (rider.sms) status.push('📱');
        if (rider.email) status.push('📧');
        if (rider.notified) status.push('✅');
        report += `  ${rider.rider}: ${status.join(' ') || '❌'}\n`;
      });
    });
    
    if (Object.keys(byRequest).length > 10) {
      report += `... and ${Object.keys(byRequest).length - 10} more requests\n`;
    }
    
    SpreadsheetApp.getUi().alert('Notification Report', report, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    logError('Error generating notification report', error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Get notification history for the notifications page.
 * @return {Array<object>} An array of notification history objects.
 */
function getNotificationHistory() {
  try {
    const assignmentsData = getAssignmentsData(); // Data is already formatted
    
    const history = assignmentsData.data
      .filter(assignment => {
        const smsSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.smsSent);
        const emailSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.emailSent);
        return (smsSent instanceof Date) || (emailSent instanceof Date); // Filter for rows with actual sent timestamps
      })
      .map(assignment => {
        const smsSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.smsSent);
        const emailSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.emailSent);
        const assignmentId = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.id);
        const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const requestId = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
        
        const notifications = [];
        
        if (smsSent instanceof Date) {
          notifications.push({
            id: `${assignmentId}_sms`,
            timestamp: smsSent.toISOString(), // Use ISO string for consistent sorting on client side
            type: 'SMS',
            recipient: riderName,
            requestId: requestId,
            status: 'Success',
            messagePreview: 'Assignment notification sent via SMS'
          });
        }
        
        if (emailSent instanceof Date) {
          notifications.push({
            id: `${assignmentId}_email`,
            timestamp: emailSent.toISOString(),
            type: 'Email',
            recipient: riderName,
            requestId: requestId,
            status: 'Success',
            messagePreview: 'Assignment notification sent via email'
          });
        }
        
        return notifications;
      })
      .flat() // Flatten array of arrays
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Sort by most recent first
    
    return history;
    
  } catch (error) {
    logError('Error getting notification history', error);
    return [];
  }
}

/**
 * Wrapper for admin dashboard notifications
 */
function getSystemNotifications() {
  try {
    return getNotificationHistory().slice(0, 10);
  } catch (error) {
    logError('Error getting system notifications', error);
    return [];
  }
}

/**
 * Wrapper for dispatcher dashboard notifications
 */
function getDispatchNotifications() {
  try {
    return getNotificationHistory().slice(0, 10);
  } catch (error) {
    logError('Error getting dispatch notifications', error);
    return [];
  }
}

// ===== REPORTS FUNCTIONS =====
/**
 * Generates report data based on filters.
 * @param {object} filters An object containing filter criteria (startDate, endDate, requestType, status).
 * @return {object} Structured report data for display.
 * @throws {Error} If an error occurs during report generation.
 */
function generateReportData(filters) {
  try {
    debugLog('Generating report data with filters:', filters);
    
    const requestsData = getRequestsData();
    const assignmentsData = getAssignmentsData();
    const ridersData = getRidersData();
    
    // Filter data based on date range
    const startDate = parseDateString(filters.startDate) || new Date(1970, 0, 1);
    startDate.setHours(0,0,0,0);
    const endDate = parseDateString(filters.endDate) || new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const filteredRequests = requestsData.data.filter(request => {
      const requestDate = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.date);
      const requestType = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.type);
      const status = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.status);
      
      let matchesDate = true;
      if (requestDate instanceof Date) {
        matchesDate = requestDate >= startDate && requestDate <= endDate;
      }
      
      let matchesType = true;
      if (filters.requestType && filters.requestType !== 'All') {
        matchesType = requestType === filters.requestType;
      }
      
      let matchesStatus = true;
      if (filters.status && filters.status !== 'All') {
        matchesStatus = status === filters.status;
      }
      
      return matchesDate && matchesType && matchesStatus;
    });
    
    // Calculate summary statistics
    const totalRequests = filteredRequests.length;
    const completedRequests = filteredRequests.filter(request => 
      getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.status) === 'Completed'
    ).length;
    
    const activeRiders = ridersData.data.filter(rider =>
      getColumnValue(rider, ridersData.columnMap, CONFIG.columns.riders.status) === 'Active'
    ).length;
    
    // Calculate request types distribution
    const requestTypes = {};
    filteredRequests.forEach(request => {
      const type = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.type) || 'Other';
      requestTypes[type] = (requestTypes[type] || 0) + 1;
    });
    
    // Calculate rider performance
    const riderPerformance = [];
    ridersData.data.forEach(rider => {
      const riderName = getColumnValue(rider, ridersData.columnMap, CONFIG.columns.riders.name);
      if (!riderName) return;
      
      const assignments = assignmentsData.data.filter(assignment => {
        const assignmentRider = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const createdDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.createdDate);
        
        let matchesDate = true;
        if (createdDate instanceof Date) {
          matchesDate = createdDate >= startDate && createdDate <= endDate;
        }
        
        return assignmentRider === riderName && matchesDate;
      });
      
      if (assignments.length > 0) {
        const completed = assignments.filter(assignment =>
          getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status) === 'Completed'
        ).length;
        
        riderPerformance.push({
          name: riderName,
          assignments: assignments.length,
          completionRate: assignments.length > 0 ? Math.round((completed / assignments.length) * 100) : 0
        });
      }
    });

    // Calculate escort count and total hours per rider within the period
    const riderHours = [];
    ridersData.data.forEach(rider => {
      const riderName = getColumnValue(rider, ridersData.columnMap, CONFIG.columns.riders.name);
      if (!riderName) return;

      let totalHours = 0;
      let escorts = 0;

      assignmentsData.data.forEach(assignment => {
        const assignmentRider = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
        const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);

        let dateMatches = true;
        if (eventDate instanceof Date) {
          dateMatches = eventDate >= startDate && eventDate <= endDate;
        }

        // Match rider names (case-insensitive, trimmed)
        if (assignmentRider && riderName && 
            assignmentRider.toString().trim().toLowerCase() === riderName.toString().trim().toLowerCase() && 
            dateMatches) {
          
          // OPTIMIZED: More flexible status matching for better counting
          const statusLower = (status || '').toLowerCase().trim();
          const eventDateObj = eventDate instanceof Date ? eventDate : new Date(eventDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Count valid escort assignments - expanded criteria
          const validStatuses = ['completed', 'in progress', 'assigned', 'confirmed', 'en route'];
          const hasValidStatus = !statusLower || validStatuses.includes(statusLower);
          const eventHasPassed = !isNaN(eventDateObj.getTime()) && eventDateObj < today;
          
          // Count if:
          // 1. Assignment has a valid working status, OR
          // 2. Event date has passed (indicating work was done)
          if (hasValidStatus || eventHasPassed) {
            escorts++;
            
            // Priority 1: Use actual completion times if available
            const actualStart = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.actualStartTime);
            const actualEnd = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.actualEndTime);
            const actualDuration = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.actualDuration);
            
            let hoursToAdd = 0;
            
            if (actualDuration && !isNaN(parseFloat(actualDuration))) {
              // Use recorded duration if available
              hoursToAdd = roundToQuarterHour(parseFloat(actualDuration));
              debugLog(`Using recorded duration: ${hoursToAdd} hours for ${assignmentRider}`);
            } else if (actualStart && actualEnd) {
              // Calculate from actual start/end times
              const startTime = parseTimeString(actualStart);
              const endTime = parseTimeString(actualEnd);
              if (startTime && endTime && endTime > startTime) {
                hoursToAdd = roundToQuarterHour((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
                debugLog(`Calculated from actual times: ${hoursToAdd} hours for ${assignmentRider}`);
              }
            } else {
              // OPTIMIZED: Use estimated hours for all countable assignments
              hoursToAdd = getRealisticEscortHours(assignment, assignmentsData.columnMap);
              debugLog(`Using realistic estimate: ${hoursToAdd} hours for ${assignmentRider}`);
            }
            
            totalHours += hoursToAdd;
          }
        }
      });

      riderHours.push({
        name: riderName,
        escorts: escorts,
        hours: Math.round(totalHours * 100) / 100
      });
    });

    const reportData = {
      summary: {
        totalRequests: totalRequests,
        completedRequests: completedRequests,
        activeRiders: activeRiders,
        avgCompletionRate: riderPerformance.length > 0 ? Math.round(riderPerformance.reduce((sum, r) => sum + r.completionRate, 0) / riderPerformance.length) : 0
      },
      charts: {
        requestVolume: {
          total: totalRequests,
          // Placeholder for actual trends, would need more complex data processing
        },
        requestTypes: requestTypes,
        // Placeholder for monthly trends
        monthlyTrends: {}
      },
      tables: {
        riderPerformance: riderPerformance.sort((a, b) => b.assignments - a.assignments),
        riderHours: riderHours.sort((a, b) => b.hours - a.hours),
        // Placeholder for response time
        responseTime: {}
      }
    };
    
    return reportData;
    
  } catch (error) {
    logError('Error generating report data', error);
    throw error;
  }
}

/**
 * Get realistic escort hours for completed assignments when actual data isn't available
 * Only use for assignments where the event date has passed (indicating work was done)
 * @param {Array} assignment - The assignment row data
 * @param {Object} columnMap - Column mapping for assignments
 * @return {number} Realistic hours estimate based on request type
 */
function getRealisticEscortHours(assignment, columnMap) {
  // Realistic hour estimates based on actual escort experience
  const realisticEstimates = {
    'Funeral': 0.5,        // Short, focused escorts
    'Wedding': 2.5,        // Moderate duration with setup/ceremony/departure
    'VIP': 4.0,           // Longer, more complex routes
    'Float Movement': 4.0, // Extended transport/logistics
    'Other': 2.0          // General default
  };
  
  try {
    // Get the request type from the assignment's request ID
    const requestId = getColumnValue(assignment, columnMap, CONFIG.columns.assignments.requestId);
    
    if (requestId) {
      const requestsData = getRequestsData();
      const request = requestsData.data.find(r => 
        getColumnValue(r, requestsData.columnMap, CONFIG.columns.requests.id) === requestId
      );
      
      if (request) {
        const requestType = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.type);
        const estimatedHours = realisticEstimates[requestType] || realisticEstimates['Other'];
        debugLog(`Applied realistic estimate: ${estimatedHours} hours for ${requestType} escort (Request ID: ${requestId})`);
        return roundToQuarterHour(estimatedHours);
      }
    }
  } catch (error) {
    debugLog('Could not determine request type for realistic estimate:', error);
  }
  
  // Default fallback
  return roundToQuarterHour(realisticEstimates['Other']);
}

/**
 * Helper function to add actual completion time columns to the Assignments sheet
 * Run this once to add the necessary columns for tracking actual escort completion times
 * @return {Object} Result of the setup operation
 */
function setupActualCompletionTimeColumns() {
  try {
    debugLog('🛠️ Setting up Actual Completion Time columns in Assignments sheet...');
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const assignmentsSheet = spreadsheet.getSheetByName(CONFIG.sheets.assignments);
    
    if (!assignmentsSheet) {
      throw new Error('Assignments sheet not found');
    }
    
    // Get existing headers
    const lastColumn = assignmentsSheet.getLastColumn();
    const headers = assignmentsSheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    
    // Check which new columns need to be added
    const newColumns = [
      'Actual Start Time',
      'Actual End Time', 
      'Actual Duration (Hours)'
    ];
    
    let nextColumn = lastColumn + 1;
    const addedColumns = [];
    
    newColumns.forEach(columnName => {
      if (!headers.includes(columnName)) {
        assignmentsSheet.getRange(1, nextColumn).setValue(columnName);
        addedColumns.push(columnName);
        debugLog(`Added column: ${columnName} at position ${nextColumn}`);
        nextColumn++;
      } else {
        debugLog(`Column already exists: ${columnName}`);
      }
    });
    
    // Format the new columns
    if (addedColumns.length > 0) {
      const newRange = assignmentsSheet.getRange(1, lastColumn + 1, 1, addedColumns.length);
      newRange.setFontWeight('bold');
      newRange.setBackground('#fff2cc'); // Light yellow background for new columns
      
      // Add data validation for duration column if it was added
      if (addedColumns.includes('Actual Duration (Hours)')) {
        const durationColumnIndex = headers.length + addedColumns.indexOf('Actual Duration (Hours)') + 1;
        const durationRange = assignmentsSheet.getRange(2, durationColumnIndex, assignmentsSheet.getMaxRows() - 1, 1);
        
        // Set number format to 2 decimal places
        durationRange.setNumberFormat('0.00');
        
        // Add note about usage
        assignmentsSheet.getRange(1, durationColumnIndex).setNote(
          'Enter the actual duration of the escort in decimal hours (e.g., 1.5 for 1 hour 30 minutes). ' +
          'This will be used for accurate reporting instead of estimates.'
        );
      }
    }
    
    debugLog(`✅ Setup complete. Added ${addedColumns.length} new columns.`);
    
    // Instructions for users
    const instructions = [
      '\n📋 INSTRUCTIONS FOR TRACKING ACTUAL COMPLETION TIMES:',
      '',
      '1. ACTUAL START TIME: Enter the time the escort actually began (e.g., "2:15 PM")',
      '2. ACTUAL END TIME: Enter the time the escort actually ended (e.g., "4:45 PM")',
      '3. ACTUAL DURATION (HOURS): Enter decimal hours (e.g., "2.5" for 2 hours 30 minutes)',
      '',
      '💡 TIP: You only need to fill ONE of these:',
      '   - Either fill both Actual Start Time AND Actual End Time',
      '   - OR just fill Actual Duration (Hours)',
      '',
      '🎯 PRIORITY: Duration takes precedence over start/end times if both are provided',
      '',
      '📊 REPORTING: Reports will use actual data when available, estimates when not',
      '   - Funeral: 0.5 hours estimate',
      '   - Wedding: 2.5 hours estimate', 
      '   - VIP/Float Movement: 4.0 hours estimate'
    ];
    
    instructions.forEach(line => debugLog(line));
    
    return {
      success: true,
      addedColumns: addedColumns,
      message: `Successfully added ${addedColumns.length} columns. Check console for usage instructions.`,
      instructions: instructions
    };
    
  } catch (error) {
    console.error('❌ Error setting up actual completion time columns:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to setup completion time columns. Check logs for details.'
    };
  }
}
  
  /**
   * Generates a rider activity report for the given date range.
 * @param {string} startDate Start date in YYYY-MM-DD format.
 * @param {string} endDate End date in YYYY-MM-DD format.
 * @return {object} Result object with success flag and data array.
 */
function generateRiderActivityReport(startDate, endDate) {
  try {
    const assignmentsData = getAssignmentsData();
    const start = parseDateString(startDate);
    const end = parseDateString(endDate);
    if (!start || !end) {
      throw new Error('Invalid date range');
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const riderMap = {};

    assignmentsData.data.forEach(row => {
      const eventDate = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
      if (eventDate instanceof Date) {
        if (eventDate < start || eventDate > end) return;
      }
      const status = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      const rider = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      if (!rider) return;

      // Only count assignments that have actually been worked
      const statusLower = (status || '').toLowerCase().trim();
      const eventDateObj = eventDate instanceof Date ? eventDate : new Date(eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const isCompleted = statusLower === 'completed';
      const eventHasPassed = !isNaN(eventDateObj.getTime()) && eventDateObj < today;
      const wasAssigned = ['assigned', 'confirmed', 'en route', 'in progress'].includes(statusLower);
      
      if (!(isCompleted || (eventHasPassed && wasAssigned))) return;

      if (!riderMap[rider]) {
        riderMap[rider] = { escorts: 0, hours: 0 };
      }
      riderMap[rider].escorts++;
      
      // Priority 1: Use actual completion data
      const actualStart = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.actualStartTime);
      const actualEnd = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.actualEndTime);
      const actualDuration = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.actualDuration);
      
      let hoursToAdd = 0;
      
      if (actualDuration && !isNaN(parseFloat(actualDuration))) {
        hoursToAdd = roundToQuarterHour(parseFloat(actualDuration));
      } else if (actualStart && actualEnd) {
        const startTime = parseTimeString(actualStart);
        const endTime = parseTimeString(actualEnd);
        if (startTime && endTime && endTime > startTime) {
          hoursToAdd = roundToQuarterHour((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
        }
      }
      
      // If no actual data and event has passed, use realistic estimates
      if (hoursToAdd === 0 && eventHasPassed) {
        hoursToAdd = getRealisticEscortHours(row, assignmentsData.columnMap);
      }

      riderMap[rider].hours += hoursToAdd;
    });

    const data = Object.keys(riderMap).map(name => ({
      name: name,
      escorts: riderMap[name].escorts,
      hours: Math.round(riderMap[name].hours * 100) / 100
    })).sort((a, b) => b.hours - a.hours);

  return { success: true, data };
  } catch (error) {
    logError('Error in generateRiderActivityReport', error);
    return { success: false, error: error.message };
  }
}

/**
 * Exports rider activity report as CSV.
 * @param {string} startDate Start date in YYYY-MM-DD format.
 * @param {string} endDate End date in YYYY-MM-DD format.
 * @return {object} Result object with CSV content or error message.
 */
function exportRiderActivityCSV(startDate, endDate) {
  try {
    const report = generateRiderActivityReport(startDate, endDate);
    if (!report.success) {
      throw new Error(report.error || 'Failed to generate rider activity');
    }

    const headers = ['Rider', 'Escorts', 'Hours'];
    const csvRows = [headers.join(',')];
    report.data.forEach(r => {
      const row = [
        `"${String(r.name).replace(/"/g, '""')}"`,
        r.escorts,
        r.hours
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const filename = `rider_activity_${startDate}_to_${endDate}.csv`;

    return {
      success: true,
      csvContent: csvContent,
      filename: filename,
      count: report.data.length
    };
  } catch (error) {
    logError('Error in exportRiderActivityCSV', error);
    return { success: false, message: error.message };
  }
}

/**
 * Generates an executive summary for the given period or the last 30 days.
 * @param {string} [startDate] Start date in YYYY-MM-DD format.
 * @param {string} [endDate] End date in YYYY-MM-DD format.
 * @return {object} Result object with summary data or an error message.
 */
function generateExecutiveSummary(startDate, endDate) {
  try {
    const today = new Date();
    const start = startDate ? parseDateString(startDate) : new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? parseDateString(endDate) : today;

    if (!start || !end) {
      throw new Error('Invalid date range');
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const requestsData = getRequestsData();
    let completed = 0;
    let totalHours = 0;
    const typeMap = {};

    requestsData.data.forEach(row => {
      const eventDate = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.eventDate);
      if (eventDate instanceof Date) {
        if (eventDate < start || eventDate > end) return;
      } else {
        return;
      }

      const type = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.type) || 'Other';
      typeMap[type] = (typeMap[type] || 0) + 1;

      const status = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.status);
      
      // Only count requests that have been completed
      const statusLower = (status || '').toLowerCase().trim();
      
      if (statusLower === 'completed') {
        completed++;
        
        // For executive summary, we need to aggregate from actual assignment hours
        // since requests don't track actual completion times
        const requestId = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.id);
        let requestHours = 0;
        
        // Get all assignments for this request and sum their actual hours
        try {
          const assignmentsData = getAssignmentsData();
          assignmentsData.data.forEach(assignment => {
            const assignmentRequestId = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
            if (assignmentRequestId === requestId) {
              const actualDuration = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.actualDuration);
              if (actualDuration && !isNaN(parseFloat(actualDuration))) {
                requestHours += roundToQuarterHour(parseFloat(actualDuration));
              } else {
                // Use realistic estimate for this assignment
                const requestType = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.type);
                const realisticEstimates = {
                  'Funeral': 0.5,
                  'Wedding': 2.5,
                  'VIP': 4.0,
                  'Float Movement': 4.0,
                  'Other': 2.0
                };
                requestHours += roundToQuarterHour(realisticEstimates[requestType] || realisticEstimates['Other']);
              }
            }
          });
        } catch (error) {
          console.warn('Error calculating request hours from assignments:', error);
          // Fallback to request type estimate
          const requestType = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.type);
          const realisticEstimates = {
            'Funeral': 0.5,
            'Wedding': 2.5,
            'VIP': 4.0,
            'Float Movement': 4.0,
            'Other': 2.0
          };
          requestHours = roundToQuarterHour(realisticEstimates[requestType] || realisticEstimates['Other']);
        }
        
        totalHours += requestHours;
      }
    });

    totalHours = Math.round(totalHours * 100) / 100;

    return {
      success: true,
      data: {
        start: formatDateForDisplay(start),
        end: formatDateForDisplay(end),
        completedEscorts: completed,
        totalHours: totalHours,
        requestTypes: typeMap
      }
    };
  } catch (error) {
    logError('Error in generateExecutiveSummary', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches and formats recent requests for web app display.
 * @param {number} [limit=10] The maximum number of recent requests to return.
 * @return {Array<object>} An array of formatted recent request objects.
 */
function getRecentRequestsForWebApp(limit = 10) {
  try {
    debugLog(`📋 Getting ${limit} recent requests for web app...`);
    
    const requestsData = getRequestsData();
    
    if (!requestsData || !requestsData.data || requestsData.data.length === 0) {
      debugLog('❌ No requests data found');
      return [];
    }
    
    const columnMap = requestsData.columnMap;
    
    // Process requests with better error handling
    const validRequests = [];
    
    for (let i = 0; i < requestsData.data.length; i++) {
      try {
        const row = requestsData.data[i];
        
        const requestId = getColumnValue(row, columnMap, CONFIG.columns.requests.id);
        const requesterName = getColumnValue(row, columnMap, CONFIG.columns.requests.requesterName);
        const eventDate = getColumnValue(row, columnMap, CONFIG.columns.requests.eventDate);
        
        // Must have basic required fields
        if (!requestId || !requesterName) {
          continue;
        }
        
        const processedRequest = {
          id: requestId,
          requesterName: requesterName,
          type: getColumnValue(row, columnMap, CONFIG.columns.requests.type) || 'Unknown',
          eventDate: eventDate ? formatDateForDisplay(eventDate) : 'No Date',
          startTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.requests.startTime)) || 'No Time',
          status: getColumnValue(row, columnMap, CONFIG.columns.requests.status) || 'New'
        };
        
        validRequests.push(processedRequest);
        
      } catch (rowError) {
        debugLog(`⚠️ Error processing request row ${i}:`, rowError);
      }
    }
    
    // Sort by most recent (if we have valid dates)
    const sortedRequests = validRequests.sort((a, b) => {
      try {
        if (a.eventDate === 'No Date' && b.eventDate === 'No Date') return 0;
        if (a.eventDate === 'No Date') return 1;
        if (b.eventDate === 'No Date') return -1;
        
        const dateA = new Date(a.eventDate);
        const dateB = new Date(b.eventDate);
        
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        
        return dateB.getTime() - dateA.getTime();
      } catch (sortError) {
        return 0;
      }
    });
    
    const recentRequests = sortedRequests.slice(0, limit);
    
    debugLog(`✅ Returning ${recentRequests.length} recent requests`);
    return recentRequests;
    
  } catch (error) {
    console.error('❌ Error getting recent requests:', error);
    logError('Error in getRecentRequestsForWebApp', error);
    return [];
  }
}
// ===== DEBUGGING CHECKLIST AND FIXES =====

// ISSUE 1: Missing Server-Side Functions
// Your HTML files are calling functions that aren't defined in Code.js

// Add these missing functions to your Code.js file:

/**
 * Consolidated function to get all dashboard data in one call
 */
function getPageDataForDashboard() {
  try {
    debugLog('🚀 Loading consolidated dashboard data...');

    const auth = authenticateAndAuthorizeUser();
    if (!auth.success) {
      return {
        success: false,
        error: auth.error || 'UNAUTHORIZED',
        user: auth.user || {
          name: auth.userName || 'User',
          email: auth.userEmail || '',
          roles: ['unauthorized'],
          permissions: []
        }
      };
    }

    const user = Object.assign({}, auth.user, {
      roles: auth.user.roles || [auth.user.role]
    });

    const stats = getDashboardStats();
    const recentRequests = getRecentRequestsForWebApp(5);
    const upcomingAssignments = getUpcomingAssignmentsForWebApp(5);
    const notifications = (typeof getNotificationHistory === 'function')
      ? getNotificationHistory().slice(0, 10)
      : [];
    
    return {
      success: true,
      user: user,
      stats: stats,
      recentRequests: recentRequests,
      upcomingAssignments: upcomingAssignments,
      notifications: notifications
    };
  } catch (error) {
    logError('Error in getPageDataForDashboard', error);
    return {
      success: false,
      error: error.message,
      user: {
        name: 'System User',
        email: '',
        roles: ['system'],
        permissions: []
      }
    };
  }
}




/**
 * Get current user information
 */
function getCurrentUser() {
  try {
    if (typeof authenticateAndAuthorizeUser === 'function') {
      const auth = authenticateAndAuthorizeUser();
      if (auth && auth.success && auth.user) {
        return auth.user;
      }
    }

    const session = Session.getActiveUser();
    return {
      name: session.getEmail().split('@')[0] || 'User',
      email: session.getEmail(),
      roles: ['guest'],
      permissions: ['view']
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return {
      name: 'Guest User',
      email: 'anonymous@example.com',
      roles: ['guest'],
      permissions: ['view']
    };
  }
}

/**
 * Get dashboard statistics
 */
function getDashboardStats() {
  try {
    debugLog('📊 Calculating dashboard stats with consistent counts...');
    
    const requestsData = getRequestsData();
    const ridersData = getRidersData();
    const assignmentsData = getAssignmentsData();
    
    // Use consistent counting for all rider stats
    const totalRiders = getTotalRiderCount(); // Uses consistent logic
    const activeRiders = getActiveRidersCount(); // Uses consistent logic
    
    // Calculate other stats
    const pendingRequests = requestsData.data.filter(request => {
      const status = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.status);
      return ['New', 'Pending', 'Unassigned'].includes(status);
    }).length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAssignments = assignmentsData.data.filter(assignment => {
      const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
      if (!(eventDate instanceof Date)) return false;
      const assignmentDate = new Date(eventDate);
      assignmentDate.setHours(0, 0, 0, 0);
      return assignmentDate.getTime() === today.getTime();
    }).length;
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekAssignments = assignmentsData.data.filter(assignment => {
      const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
      if (!(eventDate instanceof Date)) return false;
      return eventDate >= weekStart && eventDate <= weekEnd;
    }).length;
    
    const stats = {
      totalRiders: totalRiders,        // Consistent count
      activeRiders: activeRiders,      // Consistent count
      pendingRequests: pendingRequests,
      todayAssignments: todayAssignments,
      weekAssignments: weekAssignments
    };
    
    debugLog('✅ Dashboard stats calculated:', stats);
    return stats;
    
  } catch (error) {
    logError('Error getting dashboard stats', error);
    return {
      totalRiders: 0,
      activeRiders: 0,
      pendingRequests: 0,
      todayAssignments: 0,
      weekAssignments: 0
    };
  }
}
/**
 * Get upcoming assignments for dashboard
 */
function getUpcomingAssignmentsForWebApp(limit = 5) {
  try {
    const assignmentsData = getAssignmentsData();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingAssignments = assignmentsData.data
      .filter(assignment => {
        const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
        const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
        const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        
        return (eventDate instanceof Date) && 
               eventDate >= today && 
               riderName && 
               !['Cancelled', 'Completed', 'No Show'].includes(status);
      })
      .sort((a, b) => {
        const dateA = getColumnValue(a, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
        const dateB = getColumnValue(b, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, limit)
      .map(assignment => ({
        assignmentId: getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.id),
        requestId: getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.requestId),
        riderName: getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName),
        eventDate: formatDateForDisplay(getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate)),
        startTime: formatTimeForDisplay(getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.startTime)),
        startLocation: getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.startLocation)
      }));
    
    return upcomingAssignments;
  } catch (error) {
    logError('Error getting upcoming assignments', error);
    return [];
  }
}

// ISSUE 2: Missing Data Access Functions
// Make sure these core functions exist:

/**
 * Check if required sheets exist and create them if missing
 */
function ensureSheetsExist() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  Object.values(CONFIG.sheets).forEach(sheetName => {
    if (!ss.getSheetByName(sheetName)) {
      debugLog(`Creating missing sheet: ${sheetName}`);
      const newSheet = ss.insertSheet(sheetName);
      
      // Add headers based on sheet type
      if (sheetName === CONFIG.sheets.requests) {
        const headers = Object.values(CONFIG.columns.requests);
        newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      } else if (sheetName === CONFIG.sheets.riders) {
        const headers = Object.values(CONFIG.columns.riders);
        newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      } else if (sheetName === CONFIG.sheets.assignments) {
        const headers = Object.values(CONFIG.columns.assignments);
        newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

      } else if (sheetName === CONFIG.sheets.riderAvailability) {
        const headers = Object.values(CONFIG.columns.riderAvailability);

        newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      } else if (sheetName === CONFIG.sheets.availability) {
        const headers = Object.values(CONFIG.columns.availability);

        newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }
  });
}

// ISSUE 3: Missing Helper Functions
// Add these utility functions if they don't exist:

/**
 * Format date for display
 */
function formatDateForDisplay(date) {
  if (!date || !(date instanceof Date)) return 'No Date';
  try {
    return Utilities.formatDate(date, CONFIG.system.timezone, CONFIG.system.dateFormat);
  } catch (error) {
    return 'Invalid Date';
  }
}

/**
 * Format time for display
 */
function formatTimeForDisplay(time) {
  if (!time) return 'No Time';
  try {
    if (time instanceof Date) {
      return Utilities.formatDate(time, CONFIG.system.timezone, CONFIG.system.timeFormat);
    } else if (typeof time === 'string') {
      return time;
    }
    return 'No Time';
  } catch (error) {
    return 'Invalid Time';
  }
}

/**
 * Get column value safely
 */
function normalizeColumnName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ');
}

function getColumnIndex(columnMap, columnName) {
  if (!columnMap || !columnName) return undefined;
  if (columnMap.hasOwnProperty(columnName)) {
    return columnMap[columnName];
  }
  const normalized = normalizeColumnName(columnName);
  for (const [name, idx] of Object.entries(columnMap)) {
    if (normalizeColumnName(name) === normalized) {
      return idx;
    }
  }
  return undefined;
}

function getColumnValue(row, columnMap, columnName) {
  try {
    const columnIndex = getColumnIndex(columnMap, columnName);
    if (columnIndex === undefined || columnIndex < 0 || columnIndex >= row.length) {
      return null;
    }
    return row[columnIndex];
  } catch (error) {
    console.error(`Error getting column value for ${columnName}:`, error);
    return null;
  }
}

/**
 * Log error safely
 */
function logError(message, error) {
  console.error(message, error);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName(CONFIG.sheets.log);
    if (logSheet) {
      logSheet.appendRow([
        new Date(),
        message,
        error.toString(),
        error.stack || 'No stack trace'
      ]);
    }
  } catch (logErr) {
    console.error('Failed to log error to sheet:', logErr);
  }
}

/**
 * Log activity
 */
function logActivity(message) {
  debugLog(message);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName(CONFIG.sheets.log);
    if (logSheet) {
      logSheet.appendRow([new Date(), 'ACTIVITY', message, '']);
    }
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}


/**
 * 🔧 USER MANAGEMENT ROUTING FIX
 * Replace your doGet function with this simplified version that handles user management properly
 */

/**
 * COMPLETE ENHANCED doGet FUNCTION
 * Replace your existing doGet function in Code.gs with this enhanced version
 * This includes all your existing functionality PLUS the new confirmation handling
 */
function doGet(e) {
  try {
    const action = e.parameter?.action;
const response = e.parameter?.response;

// Handle public confirmations WITHOUT any authentication required
if (action === 'respondRequest' || action === 'respondAssignment' || action === 'quickConfirm') {
  console.log('📧 Handling public confirmation bypass - no authentication required');
  console.log('Action:', action, 'Response:', response);
  
  try {
    if (action === 'quickConfirm') {
      // Handle secure token-based confirmations
      return handleQuickConfirmation(e.parameter);
    } else {
      // Handle basic confirmations
      return handlePublicConfirmation(e.parameter);
    }
  } catch (confirmError) {
    console.error('❌ Confirmation handling error:', confirmError);
    return createSimpleErrorPage('Error processing confirmation. Please try again or contact your dispatcher.');
  }
}
    debugLog('🌐 doGet called with parameters:', e.parameter);
    

    const requestId = e.parameter?.requestId;
    const assignmentId = e.parameter?.assignmentId;
    const riderParam = e.parameter?.rider;
    
    // ✅ NEW: Handle public confirmations WITHOUT authentication
    if (action === 'respondRequest' || action === 'respondAssignment') {
      debugLog('📧 Handling public confirmation:', { action, response, requestId, assignmentId, riderParam });
      return handlePublicConfirmation(e.parameter);
    }
    
    // ✅ NEW: Handle secure one-click confirmations WITHOUT authentication
    if (action === 'quickConfirm') {
      debugLog('🔒 Handling secure confirmation:', { action, response });
      return handleQuickConfirmation(e.parameter);
    }
    
    // Handle sign-in actions
    if (action === 'signin' || action === 'login') {
      debugLog('🔐 Handling login action');
      return createLoginPage();
    }
    
    // Get current user session
    debugLog('👤 Getting user session...');
    const userSession = getEnhancedUserSession();
    
    if (!userSession || !userSession.hasEmail) {
      debugLog('❌ No valid user session, redirecting to login');
      return createLoginPage();
    }
    
    debugLog('✅ User session found:', { email: userSession.email, name: userSession.name });
    
    // Authenticate and authorize user
    debugLog('🔒 Authenticating and authorizing user...');
    const authResult = authenticateAndAuthorizeUser();
    
    if (!authResult.success) {
      debugLog('❌ Authentication failed:', authResult.error);
      if (authResult.error === 'UNAUTHORIZED') {
        return createUnauthorizedPage(userSession.email, userSession.name);
      } else {
        return createLoginPage();
      }
    }
    
    const user = authResult.user;
    const riderData = authResult.rider;
    
    debugLog('✅ User authenticated:', { 
      name: user.name, 
      email: user.email, 
      role: user.role, 
      permissions: user.permissions 
    });
    
    // Determine page to load
    let pageName = e.parameter?.page || 'dashboard';
    let pageFile = pageName;
    
    // Special page routing based on user role
    if (user.role === 'admin' && pageName === 'dashboard') {
      pageFile = 'admin-dashboard';
    } else if (user.role === 'rider' && pageName === 'dashboard') {
      pageFile = 'rider-dashboard';
    } else if (user.role === 'dispatcher' && pageName === 'dashboard') {
      // Use default dashboard for dispatchers unless you have a dispatcher-specific one
      pageFile = 'index'; // or 'dispatcher-dashboard' if you create one
    }
    
    debugLog('📄 Loading page:', { pageName, pageFile, userRole: user.role });
    
    // Mobile detection
    const isMobileParam = e.parameter?.mobile;
    const userAgent = e.parameter?.userAgent || '';
    const isMobileDevice = isMobileParam === 'true' || 
                          (isMobileParam !== 'false' && detectMobileDevice(userAgent));
    
    if (isMobileDevice) {
      debugLog('📱 Mobile device detected, using mobile interface');
      return loadMobilePage(pageName, user, riderData, e.parameter);
    }
    
    // Load desktop page
    return loadDesktopPage(pageFile, user, riderData, e.parameter);
    
  } catch (error) {
    console.error('❌ doGet error:', error);
    logError('doGet function error', error);
    
    return HtmlService.createHtmlOutput(`
      <div style="padding: 20px; font-family: Arial, sans-serif; text-align: center;">
        <h2 style="color: #f44336;">⚠️ System Error</h2>
        <p>Unable to process your request. Please try refreshing the page.</p>
        <p><a href="${getWebAppUrl()}" style="color: #2196F3;">Return to Home</a></p>
        <p style="color: #666; font-size: 0.9rem; margin-top: 30px;">
          Error details: ${error.message}<br>
          Time: ${new Date().toLocaleString()}
        </p>
      </div>
    `).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

/**
 * Handle public confirmation responses without requiring authentication
 */
function handlePublicConfirmation(params) {
  try {
    const { action, response, requestId, assignmentId, rider } = params;
    
    debugLog('📧 Processing public confirmation:', { action, response, requestId, assignmentId, rider });
    
    // Validate required parameters
    if (!response || !rider) {
      return createConfirmationResponse('error', 'Missing required information');
    }
    
    // Validate response type
    if (!['confirm', 'decline', 'accept', 'reject'].includes(response.toLowerCase())) {
      return createConfirmationResponse('error', 'Invalid response type');
    }
    
    let result;
    
    if (action === 'respondRequest' && requestId) {
      // Handle request-level responses (pre-assignment)
      result = processRequestConfirmation(requestId, rider, response);
    } else if (action === 'respondAssignment' && assignmentId) {
      // Handle assignment-level responses (post-assignment)
      result = processAssignmentConfirmation(assignmentId, rider, response);
    } else {
      return createConfirmationResponse('error', 'Invalid confirmation parameters');
    }
    
    // Log the confirmation
    logConfirmationResponse(rider, response, requestId || assignmentId, result.success);
    
    if (result.success) {
      // Notify dispatcher/admin of the response
      notifyAdminOfConfirmation(rider, response, requestId || assignmentId);
      
      return createConfirmationResponse('success', result.message, {
        rider: rider,
        response: response,
        id: requestId || assignmentId
      });
    } else {
      return createConfirmationResponse('error', result.message);
    }
    
  } catch (error) {
    console.error('❌ Public confirmation error:', error);
    logError('Public confirmation error', error);
    return createConfirmationResponse('error', 'System error processing confirmation');
  }
}

/**
 * Handle quick confirmation with token validation
 */
function handleQuickConfirmation(params) {
  try {
    const { token, response } = params;
    
    debugLog('🔒 Processing secure confirmation:', { token: token ? 'present' : 'missing', response });
    
    if (!token || !response) {
      return createConfirmationResponse('error', 'Missing confirmation parameters');
    }
    
    // Validate the token
    const validation = validateConfirmationToken(token);
    if (!validation.valid) {
      return createConfirmationResponse('error', validation.error);
    }
    
    const { assignmentId, riderName, requestId } = validation.data;
    
    // Process the confirmation
    const result = processAssignmentConfirmation(assignmentId, riderName, response);
    
    // Clean up the token after use
    const properties = PropertiesService.getScriptProperties();
    properties.deleteProperty(`confirm_${token}`);
    
    // Log the confirmation
    logConfirmationResponse(riderName, response, assignmentId, result.success);
    
    if (result.success) {
      // Notify dispatcher of the response
      notifyAdminOfConfirmation(riderName, response, assignmentId);
      
      return createOneClickConfirmationResponse('success', result.message, {
        rider: riderName,
        response: response,
        assignmentId: assignmentId,
        requestId: requestId
      });
    } else {
      return createOneClickConfirmationResponse('error', result.message);
    }
    
  } catch (error) {
    console.error('❌ Quick confirmation error:', error);
    return createConfirmationResponse('error', 'System error processing confirmation');
  }
}

/**
 * Load desktop page with full functionality
 */
function loadDesktopPage(pageFile, user, riderData, params) {
  try {
    debugLog('🖥️ Loading desktop page:', pageFile);
    
    // Load the HTML file
    const htmlOutput = HtmlService.createTemplateFromFile(pageFile);
    
    // Inject user data and navigation
    let content = htmlOutput.evaluate().getContent();
    
    // Add navigation menu
    const navigation = getNavigationHtml(pageFile, user);
    content = content.replace('<!--NAVIGATION_MENU_PLACEHOLDER-->', navigation);
    
    // Add user data injection
    content = addUserDataInjection(content, user, riderData);
    
    // Inject URL parameters
    content = injectUrlParameters(content, params);
    
    // Create final HTML output
    const finalOutput = HtmlService.createHtmlOutput(content)
      .setTitle(`Motorcycle Escort Management - ${pageFile.charAt(0).toUpperCase() + pageFile.slice(1)}`)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    debugLog('✅ Desktop page loaded successfully');
    return finalOutput;
    
  } catch (error) {
    console.error('❌ Error loading desktop page:', error);
    
    // Fallback to basic dashboard
    try {
      const fallbackContent = `
        <html>
        <head>
          <title>Motorcycle Escort Management</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .error { color: #f44336; }
            .info { color: #2196F3; }
          </style>
        </head>
        <body>
          <h1>🏍️ Motorcycle Escort Management</h1>
          <p class="info">Welcome, ${user.name}!</p>
          <p class="error">Unable to load the ${pageFile} page. Please try again or contact support.</p>
          <p><a href="${getWebAppUrl()}?page=dashboard">Return to Dashboard</a></p>
        </body>
        </html>
      `;
      
      return HtmlService.createHtmlOutput(fallbackContent)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
        
    } catch (fallbackError) {
      console.error('❌ Fallback page also failed:', fallbackError);
      throw error; // Let the main error handler deal with it
    }
  }
}

/**
 * Load mobile page with optimized interface
 */
function loadMobilePage(pageName, user, riderData, params) {
  try {
    debugLog('📱 Loading mobile page:', pageName);
    
    // Map page names to mobile files
    const mobilePages = {
      'dashboard': 'mobile-dashboard',
      'requests': 'mobile-requests',
      'assignments': 'mobile-assignments',
      'notifications': 'mobile-notifications'
    };
    
    const mobileFile = mobilePages[pageName] || 'mobile-dashboard';
    
    // Try to load mobile-specific file
    let content;
    try {
      content = HtmlService.createTemplateFromFile(mobileFile).evaluate().getContent();
    } catch (mobileError) {
      debugLog('⚠️ Mobile file not found, falling back to desktop with mobile optimizations');
      content = HtmlService.createTemplateFromFile(pageName === 'dashboard' ? 'index' : pageName).evaluate().getContent();
      content = addMobileOptimizations(content);
    }
    
    // Add navigation and user data
    const navigation = getMobileNavigationHtml(pageName, user);
    content = content.replace('<!--NAVIGATION_MENU_PLACEHOLDER-->', navigation);
    content = addUserDataInjection(content, user, riderData);
    content = injectUrlParameters(content, params);
    
    const finalOutput = HtmlService.createHtmlOutput(content)
      .setTitle(`Escort Management - ${pageName}`)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    debugLog('✅ Mobile page loaded successfully');
    return finalOutput;
    
  } catch (error) {
    console.error('❌ Error loading mobile page:', error);
    // Fall back to desktop page
    return loadDesktopPage(pageName === 'dashboard' ? 'index' : pageName, user, riderData, params);
  }
}

/**
 * Create login page
 */
function createLoginPage() {
  try {
    debugLog('🔐 Creating login page');
    return HtmlService.createTemplateFromFile('login').evaluate()
      .setTitle('Login - Motorcycle Escort Management')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    console.error('❌ Error creating login page:', error);
    return HtmlService.createHtmlOutput(`
      <div style="padding: 20px; font-family: Arial, sans-serif; text-align: center;">
        <h2>🔐 Login Required</h2>
        <p>Please contact your administrator for access.</p>
      </div>
    `).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

/**
 * Create unauthorized access page
 */
function createUnauthorizedPage(email, name) {
  debugLog('❌ Creating unauthorized page for:', email);
  
  const html = `
    <html>
    <head>
      <title>Access Denied</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          padding: 50px 20px;
          background: #f5f5f5;
        }
        .container {
          max-width: 500px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .error-icon {
          font-size: 4rem;
          color: #f44336;
          margin-bottom: 20px;
        }
        h1 {
          color: #f44336;
          margin-bottom: 20px;
        }
        .user-info {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="error-icon">🚫</div>
        <h1>Access Denied</h1>
        <p>Your account is not authorized to access this system.</p>
        
        <div class="user-info">
          <strong>Account Details:</strong><br>
          Name: ${name || 'Unknown'}<br>
          Email: ${email}
        </div>
        
        <p>Please contact your administrator to request access.</p>
        
        <p style="margin-top: 30px;">
          <a href="${getWebAppUrl()}?action=signin" style="color: #2196F3;">Try Different Account</a>
        </p>
      </div>
    </body>
    </html>
  `;
  
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Detect mobile device from user agent or explicit parameter
 */
function detectMobileDevice(userAgent) {
  if (!userAgent) return false;
  
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent);
}

/**
 * Enhanced user session getter (if not already in your code)
 */
function getEnhancedUserSession() {
  try {
    let userEmail = '';
    let userName = '';
    
    // Try Session.getActiveUser() first
    try {
      const activeUser = Session.getActiveUser();
      if (activeUser && activeUser.getEmail) {
        userEmail = activeUser.getEmail();
        userName = activeUser.getName ? activeUser.getName() : '';
        debugLog('✅ Got user from Session.getActiveUser():', userEmail);
      }
    } catch (e) {
      debugLog('⚠️ Session.getActiveUser() failed:', e.message);
    }
    
    // Try Session.getEffectiveUser() if needed
    if (!userEmail) {
      try {
        const effectiveUser = Session.getEffectiveUser();
        if (effectiveUser && effectiveUser.getEmail) {
          userEmail = effectiveUser.getEmail();
          userName = effectiveUser.getName ? effectiveUser.getName() : '';
          debugLog('✅ Got user from Session.getEffectiveUser():', userEmail);
        }
      } catch (e) {
        debugLog('⚠️ Session.getEffectiveUser() failed:', e.message);
      }
    }
    
    const result = {
      email: userEmail.trim(),
      name: userName.trim() || extractNameFromEmail(userEmail),
      hasEmail: !!userEmail.trim(),
      hasName: !!userName.trim(),
      source: 'session',
      timestamp: new Date().toISOString()
    };
    
    debugLog('Enhanced session result:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Enhanced session detection failed:', error);
    return {
      email: '',
      name: '',
      hasEmail: false,
      hasName: false,
      source: 'error',
      error: error.message
    };
  }
}

/**
 * Extract name from email if name is not available
 */
function extractNameFromEmail(email) {
  if (!email) return 'User';
  
  const localPart = email.split('@')[0];
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}

/**
 * Handle public confirmation responses without requiring authentication
 */
function handlePublicConfirmation(params) {
  try {
    const { action, response, requestId, assignmentId, rider } = params;
    
    debugLog('📧 Processing public confirmation:', { action, response, requestId, assignmentId, rider });
    
    // Validate required parameters
    if (!response || !rider) {
      return createConfirmationResponse('error', 'Missing required information');
    }
    
    // Validate response type
    if (!['confirm', 'decline', 'accept', 'reject'].includes(response.toLowerCase())) {
      return createConfirmationResponse('error', 'Invalid response type');
    }
    
    let result;
    
    if (action === 'respondRequest' && requestId) {
      // Handle request-level responses (pre-assignment)
      result = processRequestConfirmation(requestId, rider, response);
    } else if (action === 'respondAssignment' && assignmentId) {
      // Handle assignment-level responses (post-assignment)
      result = processAssignmentConfirmation(assignmentId, rider, response);
    } else {
      return createConfirmationResponse('error', 'Invalid confirmation parameters');
    }
    
    // Log the confirmation
    logConfirmationResponse(rider, response, requestId || assignmentId, result.success);
    
    if (result.success) {
      // Notify dispatcher/admin of the response
      notifyAdminOfConfirmation(rider, response, requestId || assignmentId);
      
      return createConfirmationResponse('success', result.message, {
        rider: rider,
        response: response,
        id: requestId || assignmentId
      });
    } else {
      return createConfirmationResponse('error', result.message);
    }
    
  } catch (error) {
    console.error('❌ Public confirmation error:', error);
    logError('Public confirmation error', error);
    return createConfirmationResponse('error', 'System error processing confirmation');
  }
}

/**
 * Handle quick confirmation with token validation
 */
function handleQuickConfirmation(params) {
  try {
    const { token, response } = params;
    
    debugLog('🔒 Processing secure confirmation:', { token: token ? 'present' : 'missing', response });
    
    if (!token || !response) {
      return createConfirmationResponse('error', 'Missing confirmation parameters');
    }
    
    // Validate the token
    const validation = validateConfirmationToken(token);
    if (!validation.valid) {
      return createConfirmationResponse('error', validation.error);
    }
    
    const { assignmentId, riderName, requestId } = validation.data;
    
    // Process the confirmation
    const result = processAssignmentConfirmation(assignmentId, riderName, response);
    
    // Clean up the token after use
    const properties = PropertiesService.getScriptProperties();
    properties.deleteProperty(`confirm_${token}`);
    
    // Log the confirmation
    logConfirmationResponse(riderName, response, assignmentId, result.success);
    
    if (result.success) {
      // Notify dispatcher of the response
      notifyAdminOfConfirmation(riderName, response, assignmentId);
      
      return createOneClickConfirmationResponse('success', result.message, {
        rider: riderName,
        response: response,
        assignmentId: assignmentId,
        requestId: requestId
      });
    } else {
      return createOneClickConfirmationResponse('error', result.message);
    }
    
  } catch (error) {
    console.error('❌ Quick confirmation error:', error);
    return createConfirmationResponse('error', 'System error processing confirmation');
  }
}

/**
 * Load desktop page with full functionality
 */
function loadDesktopPage(pageFile, user, rider, params) {
  try {
    debugLog('🖥️ Loading desktop page:', pageFile);
    
    // Load the HTML file
    const htmlOutput = HtmlService.createTemplateFromFile(pageFile);
    
    // Inject user data and navigation
    let content = htmlOutput.evaluate().getContent();
    
    // Add navigation menu
    const navigation = getNavigationHtml(pageFile, user);
    content = content.replace('<!--NAVIGATION_MENU_PLACEHOLDER-->', navigation);
    
    // Add user data injection
    content = addUserDataInjection(content, user, rider);
    
    // Inject URL parameters
    content = injectUrlParameters(content, params);
    
    // Create final HTML output
    const finalOutput = HtmlService.createHtmlOutput(content)
      .setTitle(`Motorcycle Escort Management - ${pageFile.charAt(0).toUpperCase() + pageFile.slice(1)}`)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    debugLog('✅ Desktop page loaded successfully');
    return finalOutput;
    
  } catch (error) {
    console.error('❌ Error loading desktop page:', error);
    
    // Fallback to basic dashboard
    try {
      const fallbackContent = `
        <html>
        <head>
          <title>Motorcycle Escort Management</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .error { color: #f44336; }
            .info { color: #2196F3; }
          </style>
        </head>
        <body>
          <h1>🏍️ Motorcycle Escort Management</h1>
          <p class="info">Welcome, ${user.name}!</p>
          <p class="error">Unable to load the ${pageFile} page. Please try again or contact support.</p>
          <p><a href="${getWebAppUrl()}?page=dashboard">Return to Dashboard</a></p>
        </body>
        </html>
      `;
      
      return HtmlService.createHtmlOutput(fallbackContent)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
        
    } catch (fallbackError) {
      console.error('❌ Fallback page also failed:', fallbackError);
      throw error; // Let the main error handler deal with it
    }
  }
}

/**
 * Load mobile page with optimized interface
 */
function loadMobilePage(pageName, user, rider, params) {
  try {
    debugLog('📱 Loading mobile page:', pageName);
    
    // Map page names to mobile files
    const mobilePages = {
      'dashboard': 'mobile-dashboard',
      'requests': 'mobile-requests',
      'assignments': 'mobile-assignments',
      'notifications': 'mobile-notifications'
    };
    
    const mobileFile = mobilePages[pageName] || 'mobile-dashboard';
    
    // Try to load mobile-specific file
    let content;
    try {
      content = HtmlService.createTemplateFromFile(mobileFile).evaluate().getContent();
    } catch (mobileError) {
      debugLog('⚠️ Mobile file not found, falling back to desktop with mobile optimizations');
      content = HtmlService.createTemplateFromFile(pageName === 'dashboard' ? 'index' : pageName).evaluate().getContent();
      content = addMobileOptimizations(content);
    }
    
    // Add navigation and user data
    const navigation = getMobileNavigationHtml(pageName, user);
    content = content.replace('<!--NAVIGATION_MENU_PLACEHOLDER-->', navigation);
    content = addUserDataInjection(content, user, rider);
    content = injectUrlParameters(content, params);
    
    const finalOutput = HtmlService.createHtmlOutput(content)
      .setTitle(`Escort Management - ${pageName}`)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    debugLog('✅ Mobile page loaded successfully');
    return finalOutput;
    
  } catch (error) {
    console.error('❌ Error loading mobile page:', error);
    // Fall back to desktop page
    return loadDesktopPage(pageName === 'dashboard' ? 'index' : pageName, user, rider, params);
  }
}

/**
 * Create login page
 */
function createLoginPage() {
  try {
    debugLog('🔐 Creating login page');
    return HtmlService.createTemplateFromFile('login').evaluate()
      .setTitle('Login - Motorcycle Escort Management')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    console.error('❌ Error creating login page:', error);
    return HtmlService.createHtmlOutput(`
      <div style="padding: 20px; font-family: Arial, sans-serif; text-align: center;">
        <h2>🔐 Login Required</h2>
        <p>Please contact your administrator for access.</p>
      </div>
    `).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

/**
 * Create unauthorized access page
 */
function createUnauthorizedPage(email, name) {
  debugLog('❌ Creating unauthorized page for:', email);
  
  const html = `
    <html>
    <head>
      <title>Access Denied</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          padding: 50px 20px;
          background: #f5f5f5;
        }
        .container {
          max-width: 500px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .error-icon {
          font-size: 4rem;
          color: #f44336;
          margin-bottom: 20px;
        }
        h1 {
          color: #f44336;
          margin-bottom: 20px;
        }
        .user-info {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="error-icon">🚫</div>
        <h1>Access Denied</h1>
        <p>Your account is not authorized to access this system.</p>
        
        <div class="user-info">
          <strong>Account Details:</strong><br>
          Name: ${name || 'Unknown'}<br>
          Email: ${email}
        </div>
        
        <p>Please contact your administrator to request access.</p>
        
        <p style="margin-top: 30px;">
          <a href="${getWebAppUrl()}?action=signin" style="color: #2196F3;">Try Different Account</a>
        </p>
      </div>
    </body>
    </html>
  `;
  
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Detect mobile device from user agent or explicit parameter
 */
function detectMobileDevice(userAgent) {
  if (!userAgent) return false;
  
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent);
}

/**
 * Enhanced user session getter (if not already in your code)
 */
function getEnhancedUserSession() {
  try {
    let userEmail = '';
    let userName = '';
    
    // Try Session.getActiveUser() first
    try {
      const activeUser = Session.getActiveUser();
      if (activeUser && activeUser.getEmail) {
        userEmail = activeUser.getEmail();
        userName = activeUser.getName ? activeUser.getName() : '';
        debugLog('✅ Got user from Session.getActiveUser():', userEmail);
      }
    } catch (e) {
      debugLog('⚠️ Session.getActiveUser() failed:', e.message);
    }
    
    // Try Session.getEffectiveUser() if needed
    if (!userEmail) {
      try {
        const effectiveUser = Session.getEffectiveUser();
        if (effectiveUser && effectiveUser.getEmail) {
          userEmail = effectiveUser.getEmail();
          userName = effectiveUser.getName ? effectiveUser.getName() : '';
          debugLog('✅ Got user from Session.getEffectiveUser():', userEmail);
        }
      } catch (e) {
        debugLog('⚠️ Session.getEffectiveUser() failed:', e.message);
      }
    }
    
    const result = {
      email: userEmail.trim(),
      name: userName.trim() || extractNameFromEmail(userEmail),
      hasEmail: !!userEmail.trim(),
      hasName: !!userName.trim(),
      source: 'session',
      timestamp: new Date().toISOString()
    };
    
    debugLog('Enhanced session result:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Enhanced session detection failed:', error);
    return {
      email: '',
      name: '',
      hasEmail: false,
      hasName: false,
      source: 'error',
      error: error.message
    };
  }
}

/**
 * Extract name from email if name is not available
 */
function extractNameFromEmail(email) {
  if (!email) return 'User';
  
  const localPart = email.split('@')[0];
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}
function handleQuickConfirmation(params) {
  try {
    const { token, response } = params;
    
    if (!token || !response) {
      return createConfirmationResponse('error', 'Missing confirmation parameters');
    }
    
    // Validate the token
    const validation = validateConfirmationToken(token);
    if (!validation.valid) {
      return createConfirmationResponse('error', validation.error);
    }
    
    const { assignmentId, riderName, requestId } = validation.data;
    
    // Process the confirmation
    const result = processAssignmentConfirmation(assignmentId, riderName, response);
    
    // Clean up the token after use
    const properties = PropertiesService.getScriptProperties();
    properties.deleteProperty(`confirm_${token}`);
    
    // Log the confirmation
    logConfirmationResponse(riderName, response, assignmentId, result.success);
    
    if (result.success) {
      // Notify dispatcher of the response
      notifyAdminOfConfirmation(riderName, response, assignmentId);
      
      return createOneClickConfirmationResponse('success', result.message, {
        rider: riderName,
        response: response,
        assignmentId: assignmentId,
        requestId: requestId
      });
    } else {
      return createOneClickConfirmationResponse('error', result.message);
    }
    
  } catch (error) {
    console.error('Quick confirmation error:', error);
    return createConfirmationResponse('error', 'System error processing confirmation');
  }
}

/**
 * Simple user management page (if HTML file doesn't exist)
 */
function createSimpleUserManagementPage() {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Management - Motorcycle Escort Management</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #eee;
        }
        .btn {
            background: #3498db;
            color: white;
            padding: 12px 25px;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 10px;
            transition: all 0.3s ease;
        }
        .btn:hover {
            background: #2980b9;
            transform: translateY(-2px);
        }
        .nav-link {
            background: #95a5a6;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 20px;
            text-decoration: none;
            display: inline-block;
            margin: 10px 5px;
        }
        .nav-link:hover {
            background: #7f8c8d;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            border-left: 4px solid #3498db;
        }
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #3498db;
        }
        .stat-label {
            color: #666;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>👥 User Management Dashboard</h1>
            <p>Manage user access, permissions, and authentication settings</p>
            
            <!-- Navigation -->
            <div style="margin-top: 20px;">
                <a href="?" class="nav-link">🏠 Dashboard</a>
                <a href="?page=requests" class="nav-link">📋 Requests</a>
                <a href="?page=assignments" class="nav-link">🏍️ Assignments</a>
                <a href="?page=reports" class="nav-link">📊 Reports</a>
            </div>
        </div>
        
        <!-- Statistics -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number" id="totalUsers">-</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="activeUsers">-</div>
                <div class="stat-label">Active Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="pendingUsers">-</div>
                <div class="stat-label">Pending Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="adminUsers">-</div>
                <div class="stat-label">Admin Users</div>
            </div>
        </div>
        
        <!-- Actions -->
        <div style="text-align: center; margin: 30px 0;">
            <h3>🎯 User Management Actions</h3>
            
            <button class="btn" onclick="openAuthSetup()">
                🔐 Google Authentication Setup
            </button>
            
            <button class="btn" onclick="loadUserData()">
                📊 Load User Statistics
            </button>
            
            <button class="btn" onclick="testSystem()">
                🧪 Test System
            </button>
            
            <button class="btn" onclick="exportUsers()">
                📥 Export User Data
            </button>
        </div>
        
        <!-- Status -->
        <div id="status" style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 10px;">
            <h4>📋 System Status</h4>
            <p>User Management page loaded successfully.</p>
            <p>Click "Load User Statistics" to see current user data.</p>
        </div>
        
        <!-- User List -->
        <div id="userList" style="margin: 20px 0;">
            <h4>👥 Users</h4>
            <div id="users">Click "Load User Statistics" to view users...</div>
        </div>
    </div>
    
    <script>
        // Load initial data
        document.addEventListener('DOMContentLoaded', function() {
            loadUserData();
        });
        
        function loadUserData() {
            updateStatus('Loading user data...', 'info');
            
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                google.script.run
                    .withSuccessHandler(handleUserDataSuccess)
                    .withFailureHandler(handleUserDataError)
                    .getUserManagementData();
            } else {
                handleUserDataError('Google Apps Script not available');
            }
        }
        
        function handleUserDataSuccess(data) {
            debugLog('User data received:', data);
            
            if (data && data.success) {
                // Update statistics
                document.getElementById('totalUsers').textContent = data.stats.totalUsers || 0;
                document.getElementById('activeUsers').textContent = data.stats.activeUsers || 0;
                document.getElementById('pendingUsers').textContent = data.stats.pendingUsers || 0;
                document.getElementById('adminUsers').textContent = data.stats.totalUsers - data.stats.pendingUsers || 0;
                
                // Display users
                displayUsers(data.users || []);
                
                updateStatus('User data loaded successfully!', 'success');
            } else {
                handleUserDataError(data.error || 'Unknown error');
            }
        }
        
        function handleUserDataError(error) {
            console.error('User data error:', error);
            updateStatus('Error loading user data: ' + error, 'error');
            
            // Show demo data
            document.getElementById('totalUsers').textContent = '?';
            document.getElementById('activeUsers').textContent = '?';
            document.getElementById('pendingUsers').textContent = '?';
            document.getElementById('adminUsers').textContent = '?';
        }
        
        function displayUsers(users) {
            const usersDiv = document.getElementById('users');
            
            if (users.length === 0) {
                usersDiv.innerHTML = '<p>No users found.</p>';
                return;
            }
            
            let html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">';
            
            users.forEach(user => {
                html += '<div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db;">';
                html += '<strong>' + user.name + '</strong><br>';
                html += '<small>' + user.email + '</small><br>';
                html += '<span style="background: #e8f4f8; padding: 3px 8px; border-radius: 10px; font-size: 0.8rem;">' + user.role + '</span> ';
                html += '<span style="background: #d4edda; padding: 3px 8px; border-radius: 10px; font-size: 0.8rem;">' + user.status + '</span>';
                html += '</div>';
            });
            
            html += '</div>';
            usersDiv.innerHTML = html;
        }
        
        function getDeployedUrl(callback) {
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                google.script.run.withSuccessHandler(callback).getWebAppUrl();
            } else {
                const local = window.location.origin + window.location.pathname;
                callback(local);
            }
        }

        function openAuthSetup() {
            getDeployedUrl(function(baseUrl) {
                window.open(baseUrl + '?page=auth-setup', '_blank');
            });
        }
        
        function testSystem() {
            updateStatus('Testing system...', 'info');
            
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                google.script.run
                    .withSuccessHandler(function(result) {
                        updateStatus('System test completed. Check console for details.', 'success');
                        debugLog('System test result:', result);
                    })
                    .withFailureHandler(function(error) {
                        updateStatus('System test failed: ' + error, 'error');
                    })
                    .testAuthenticationSimple();
            } else {
                updateStatus('Cannot test - Google Apps Script not available', 'warning');
            }
        }
        
        function exportUsers() {
            updateStatus('Exporting user data...', 'info');
            // Implementation would go here
            setTimeout(() => {
                updateStatus('Export feature not yet implemented', 'warning');
            }, 1000);
        }
        
        function updateStatus(message, type) {
            const statusDiv = document.getElementById('status');
            let bgColor = '#f8f9fa';
            let textColor = '#333';
            
            switch(type) {
                case 'success':
                    bgColor = '#d4edda';
                    textColor = '#155724';
                    break;
                case 'error':
                    bgColor = '#f8d7da';
                    textColor = '#721c24';
                    break;
                case 'warning':
                    bgColor = '#fff3cd';
                    textColor = '#856404';
                    break;
                case 'info':
                    bgColor = '#cce5ff';
                    textColor = '#0056b3';
                    break;
            }
            
            statusDiv.style.background = bgColor;
            statusDiv.style.color = textColor;
            statusDiv.innerHTML = '<h4>📋 Status</h4><p>' + message + '</p>';
        }
    </script>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('User Management')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Fallback dashboard if user-management.html is missing
 */
function createUserManagementDashboard() {
  return createSimpleUserManagementPage();
}

/**
 * Simple navigation for testing
 */
function getSimpleNavigation(currentPage, user) {
  const baseUrl = getWebAppUrlSafe();

  // When running outside Apps Script, getWebAppUrlSafe returns "#". In that
  // scenario use local HTML file links so navigation works during development.
  const usingLocal = !baseUrl || baseUrl === '#';
  function navUrl(page) {
    return usingLocal
      ? (page === 'dashboard' ? 'index.html' : page + '.html')
      : (page === 'dashboard' ? baseUrl : `${baseUrl}?page=${page}`);
  }

  const adminNav = [
    { page: 'dashboard', label: '📊 Dashboard', url: navUrl('dashboard') },
    { page: 'requests', label: '📋 Requests', url: navUrl('requests') },
    { page: 'assignments', label: '🏍️ Assignments', url: navUrl('assignments') },
    { page: 'notifications', label: '📱 Notifications', url: navUrl('notifications') },
    { page: 'riders', label: '👥 Riders', url: navUrl('riders') },
    { page: 'user-management', label: '👥 User Management', url: navUrl('user-management') },
    { page: 'reports', label: '📊 Reports', url: navUrl('reports') }
  ];

  const dispatcherNav = [
    { page: 'dashboard', label: '📊 Dashboard', url: navUrl('dashboard') },
    { page: 'requests', label: '📋 Requests', url: navUrl('requests') },
    { page: 'assignments', label: '🏍️ Assignments', url: navUrl('assignments') },
    { page: 'notifications', label: '📱 Notifications', url: navUrl('notifications') }
  ];
  
  const menuItems = user.role === 'admin' ? adminNav : dispatcherNav;
  
  let navHtml = '<nav class="navigation">';

  menuItems.forEach(item => {
    const activeClass = item.page === currentPage ? ' active' : '';
    const idAttr = item.page === 'notifications' ? 'notificationsLink' : `nav-${item.page}`;
    navHtml += `<a href="${item.url}" class="nav-button${activeClass}" id="${idAttr}" data-page="${item.page}">${item.label}</a>`;
  });

  navHtml += '</nav>';
  
  return navHtml;
}
/**
 * Simple sign-in page
 */
function createSignInPageSimple() {
  const webAppUrl = getWebAppUrlSafe();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Sign In - Escort Management</title>
    <style>
        body { 
            font-family: Arial, sans-serif; text-align: center; padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; min-height: 100vh; margin: 0;
            display: flex; align-items: center; justify-content: center;
        }
        .container {
            background: rgba(255, 255, 255, 0.95); color: #333;
            padding: 40px; border-radius: 15px; max-width: 500px;
        }
        .btn {
            background: #3498db; color: white; padding: 15px 30px;
            border: none; border-radius: 25px; font-size: 18px;
            cursor: pointer; text-decoration: none; display: inline-block; margin: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏍️ Motorcycle Escort Management</h1>
        <h2>🔐 Sign In Required</h2>
        <p>Please sign in with your Google account to access the system.</p>
        <a href="${webAppUrl}" class="btn">🔑 Sign In with Google</a>
    </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html).setTitle('Sign In Required');
}

/**
 * Simple access denied page
 */
function createAccessDeniedPageSimple(user) {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Access Denied</title>
    <style>
        body { 
            font-family: Arial, sans-serif; text-align: center; padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; min-height: 100vh; margin: 0;
            display: flex; align-items: center; justify-content: center;
        }
        .container {
            background: rgba(255, 255, 255, 0.95); color: #333;
            padding: 40px; border-radius: 15px; max-width: 500px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏍️ Motorcycle Escort Management</h1>
        <h2>🚫 Access Denied</h2>
        <p>Hello ${user.name},</p>
        <p>You need admin privileges to access this page.</p>
        <p>Your role: <strong>${user.role}</strong></p>
        <a href="${getWebAppUrlSafe()}" style="color: #3498db;">← Back to Dashboard</a>
    </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html).setTitle('Access Denied');
}

/**
 * Simple error page
 */
function createErrorPageSimple(error) {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Error</title>
    <style>
        body { 
            font-family: Arial, sans-serif; text-align: center; padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            background: rgba(255, 255, 255, 0.95); color: #333;
            padding: 40px; border-radius: 15px; max-width: 500px; margin: 0 auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>⚠️ System Error</h1>
        <p>Error: ${error.message || error}</p>
        <a href="${getWebAppUrlSafe()}" style="color: #3498db;">← Try Again</a>
    </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html).setTitle('Error');
}

/**
 * Test what happens with user management
 */
function testUserManagementRouting() {
  try {
    debugLog('🧪 Testing user management routing...');
    
    // Simulate the user management request
    const e = { parameter: { page: 'user-management' } };
    
    debugLog('Testing doGet with user-management parameter...');
    const result = doGet(e);
    
    debugLog('✅ doGet completed without errors');
    debugLog('Result type:', typeof result);
    
    return {
      success: true,
      message: 'User management routing test completed'
    };
    
  } catch (error) {
    console.error('❌ User management routing test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
/**
 * Enhanced page file mapping
 */
function getPageFileNameSafe(pageName, userRole) {
  try {
    debugLog(`🗂️ Getting file for page: ${pageName}, role: ${userRole}`);
    
    // Role-specific page mapping
    const rolePageMap = {
      admin: {
        'dashboard': 'admin-dashboard'  // Use admin dashboard for admins
      },
      dispatcher: {
        'dashboard': 'index'  // Use regular dashboard for dispatchers
      },
      rider: {
        'dashboard': 'index',  // Use regular dashboard for riders
        'rider-schedule': 'rider-schedule',
        'my-assignments': 'assignments'
      }
    };
    
    // Check if there's a role-specific page that exists
    if (rolePageMap[userRole] && rolePageMap[userRole][pageName]) {
      const fileName = rolePageMap[userRole][pageName];
      
      // Verify the file exists
      if (checkFileExists(fileName)) {
        debugLog(`✅ Using role-specific file: ${fileName}`);
        return fileName;
      } else {
        debugLog(`⚠️ Role-specific file ${fileName} not found, using default`);
      }
    }
    
    // Default page mapping
    const defaultPages = {
      'dashboard': 'index',
      'requests': 'requests',
      'assignments': 'assignments',
      'riders': 'riders',
      'notifications': 'notifications',
      'reports': 'reports',
      'rider-schedule': 'rider-schedule',
      'admin-schedule': 'admin-schedule'
    };
    
    let fileName = defaultPages[pageName] || 'index';
    
    // Double-check the file exists
    if (!checkFileExists(fileName)) {
      debugLog(`⚠️ File ${fileName} not found, falling back to index`);
      fileName = 'index';
    }
    
    debugLog(`✅ Using file: ${fileName} for page: ${pageName}`);
    return fileName;
    
  } catch (error) {
    console.error('❌ Error getting page file name:', error);
    return 'index'; // Always fallback to index
  }
}

/**
 * Enhanced sign-in page
 */
function createSignInPage() {
  const webAppUrl = getWebAppUrlSafe();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In - Motorcycle Escort Management</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .signin-container {
            background: rgba(255, 255, 255, 0.95);
            color: #333;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            text-align: center;
            max-width: 500px;
            width: 90%;
        }
        .logo { font-size: 4rem; margin-bottom: 20px; }
        h1 { color: #2c3e50; margin-bottom: 10px; }
        h2 { color: #3498db; margin-bottom: 30px; font-weight: 300; }
        .signin-btn {
            background: #4285f4;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 25px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s ease;
            margin: 10px;
        }
        .signin-btn:hover {
            background: #3367d6;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(66, 133, 244, 0.3);
        }
        .google-icon {
            width: 20px; height: 20px; background: white; border-radius: 3px;
            display: flex; align-items: center; justify-content: center;
            color: #4285f4; font-weight: bold;
        }
        .info {
            background: #e8f4f8; padding: 20px; border-radius: 10px;
            margin: 30px 0; border-left: 4px solid #3498db;
        }
    </style>
</head>
<body>
    <div class="signin-container">
        <div class="logo">🏍️</div>
        <h1>Motorcycle Escort Management</h1>
        <h2>Google Sign In Required</h2>
        
        <div class="info">
            <p><strong>📋 To access the system:</strong></p>
            <ol style="text-align: left;">
                <li>Click "Sign In with Google" below</li>
                <li>Choose your authorized Google account</li>
                <li>Grant necessary permissions</li>
                <li>Access your dashboard</li>
            </ol>
        </div>
        
        <button class="signin-btn" onclick="handleSignIn()">
            <div class="google-icon">G</div>
            Sign In with Google
        </button>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
            Only authorized personnel can access this system.
        </p>
    </div>
    
    <script>
        function handleSignIn() {
            const btn = document.querySelector('.signin-btn');
            btn.innerHTML = '<div class="google-icon">⏳</div>Signing In...';
            btn.style.background = '#666';
            
            setTimeout(() => {
                window.location.href = '${webAppUrl}?auth=true&t=' + Date.now();
            }, 500);
        }
    </script>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('Sign In - Escort Management')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Unauthorized access page
 */
function createUnauthorizedPage(email, name) {
  const webAppUrl = getWebAppUrlSafe();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Access Request - Escort Management</title>
    <style>
        body { 
            font-family: Arial, sans-serif; text-align: center; padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; min-height: 100vh; margin: 0;
            display: flex; align-items: center; justify-content: center;
        }
        .container {
            background: rgba(255, 255, 255, 0.95); color: #333;
            padding: 40px; border-radius: 15px; max-width: 600px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        .btn {
            background: #3498db; color: white; padding: 15px 30px;
            border: none; border-radius: 25px; font-size: 16px;
            cursor: pointer; text-decoration: none; display: inline-block;
            margin: 10px; transition: all 0.3s ease;
        }
        .btn:hover { background: #2980b9; transform: translateY(-2px); }
        .user-info {
            background: #f8f9fa; padding: 20px; border-radius: 10px;
            margin: 20px 0; border-left: 4px solid #3498db;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏍️ Motorcycle Escort Management</h1>
        <h2>🚫 Access Not Authorized</h2>
        
        <div class="user-info">
            <strong>Signed in as:</strong><br>
            📧 ${email}<br>
            👤 ${name || 'Unknown User'}
        </div>
        
        <p>Your Google account is not currently authorized to access this system.</p>
        
        <a href="mailto:admin@yourdomain.com?subject=Access Request&body=I need access to the Escort Management System.%0D%0AEmail: ${email}" class="btn">
            📧 Request Access
        </a>
        
        <a href="${webAppUrl}?action=signin" class="btn" style="background: #95a5a6;">
            ← Back to Sign In
        </a>
    </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('Access Request')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Error page with sign-in option
 */
function createErrorPageWithSignIn(error) {
  const webAppUrl = getWebAppUrlSafe();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Error - Escort Management</title>
    <style>
        body { 
            font-family: Arial, sans-serif; text-align: center; padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            background: rgba(255, 255, 255, 0.95); color: #333;
            padding: 40px; border-radius: 15px; max-width: 500px; margin: 0 auto;
        }
        .btn {
            background: #3498db; color: white; padding: 15px 30px;
            border: none; border-radius: 25px; font-size: 16px;
            cursor: pointer; text-decoration: none; display: inline-block; margin: 10px;
        }
        .error-details {
            background: #f8d7da; color: #721c24; padding: 15px;
            border-radius: 8px; margin: 20px 0; font-family: monospace;
            font-size: 12px; text-align: left;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏍️ Motorcycle Escort Management</h1>
        <h2>⚠️ System Error</h2>
        <p>An error occurred while loading the application.</p>
        
        <div class="error-details">
            Error: ${error.message || 'Unknown error'}
        </div>
        
        <a href="${webAppUrl}?action=signin" class="btn">🔄 Try Again</a>
        <a href="${webAppUrl}" class="btn">🏠 Home</a>
    </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('System Error')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 🛡️ SAFE WRAPPER FUNCTIONS

function getWebAppUrlSafe() {
  try {
    if (typeof getWebAppUrl === 'function') {
      return getWebAppUrl();
    }
    return ScriptApp.getService().getUrl();
  } catch (error) {
    console.error('Error getting web app URL:', error);
    return '#';
  }
}

function checkPageAccessSafe(pageName, user, rider) {
  try {
    if (typeof checkPageAccess === 'function') {
      return checkPageAccess(pageName, user, rider);
    }
    return { allowed: true }; // Default allow
  } catch (error) {
    console.error('Error in checkPageAccessSafe:', error);
    return { allowed: true };
  }
}

function getPageFileNameSafe(pageName, userRole) {
  try {
    if (typeof getPageFileName === 'function') {
      return getPageFileName(pageName, userRole);
    }
    
    const pageMap = {
      'dashboard': 'index',
      'requests': 'requests',
      'assignments': 'assignments',
      'riders': 'riders',
      'notifications': 'notifications',
      'reports': 'reports'
    };
    
    return pageMap[pageName] || 'index';
  } catch (error) {
    console.error('Error getting page file name:', error);
    return 'index';
  }
}

function getRoleBasedNavigationSafe(pageName, user, rider) {
  try {
    if (typeof getRoleBasedNavigation === 'function') {
      return getRoleBasedNavigation(pageName, user, rider);
    }
    return '<nav>Navigation unavailable</nav>';
  } catch (error) {
    console.error('Error in getRoleBasedNavigationSafe:', error);
    return '<nav>Navigation error</nav>';
  }
}

function injectUserInfoSafe(content, user, rider) {
  try {
    if (typeof injectUserInfo === 'function') {
      return injectUserInfo(content, user, rider);
    }
    return content;
  } catch (error) {
    console.error('Error in injectUserInfoSafe:', error);
    return content;
  }
}

function addNavigationToContentSafe(content, navigationHtml) {
  try {
    if (typeof addNavigationToContent === 'function') {
      return addNavigationToContent(content, navigationHtml);
    }
    
    if (content.includes('<!--NAVIGATION_MENU_PLACEHOLDER-->')) {
      return content.replace('<!--NAVIGATION_MENU_PLACEHOLDER-->', navigationHtml);
    } else if (content.includes('</header>')) {
      return content.replace('</header>', `</header>\n${navigationHtml}\n`);
    }
    
    return content;
  } catch (error) {
    console.error('Error adding navigation to content:', error);
    return content;
  }
}


/**
 * Create a proper sign-in page that actually works
 */
function createSignInPage() {
  const webAppUrl = getWebAppUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In - Motorcycle Escort Management</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .signin-container {
            background: rgba(255, 255, 255, 0.95);
            color: #333;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            text-align: center;
            max-width: 500px;
            width: 90%;
        }
        .logo {
            font-size: 4rem;
            margin-bottom: 20px;
        }
        h1 {
            color: #2c3e50;
            margin-bottom: 10px;
        }
        h2 {
            color: #3498db;
            margin-bottom: 30px;
            font-weight: 300;
        }
        .signin-btn {
            background: #4285f4;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 25px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s ease;
            margin: 10px;
        }
        .signin-btn:hover {
            background: #3367d6;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(66, 133, 244, 0.3);
        }
        .google-icon {
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .info {
            background: #e8f4f8;
            padding: 20px;
            border-radius: 10px;
            margin: 30px 0;
            border-left: 4px solid #3498db;
        }
        .steps {
            text-align: left;
            margin: 20px 0;
        }
        .step {
            margin: 10px 0;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 5px;
        }
        .troubleshooting {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
            font-size: 14px;
        }
        .alternative-btn {
            background: #27ae60;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 15px;
            font-size: 14px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 5px;
        }
    </style>
</head>
<body>
    <div class="signin-container">
        <div class="logo">🏍️</div>
        <h1>Motorcycle Escort Management</h1>
        <h2>Secure Sign In Required</h2>
        
        <div class="info">
            <strong>📋 To access the system:</strong>
            <div class="steps">
                <div class="step">1️⃣ Click "Sign In with Google" below</div>
                <div class="step">2️⃣ Choose your authorized Google account</div>
                <div class="step">3️⃣ Allow access to the application</div>
                <div class="step">4️⃣ You'll be redirected to your dashboard</div>
            </div>
        </div>
        
        <!-- Primary Sign-In Method -->
        <a href="${webAppUrl}" class="signin-btn" onclick="handleSignIn(this); return false;">
            <div class="google-icon">G</div>
            Sign In with Google
        </a>
        
        <!-- Alternative Methods -->
        <div style="margin: 20px 0;">
            <p><strong>Alternative access methods:</strong></p>
            <a href="${webAppUrl}?force=true" class="alternative-btn">🔄 Force Reload</a>
            <a href="${webAppUrl}" class="alternative-btn" target="_blank">🆕 New Window</a>
        </div>
        
        <div class="troubleshooting">
            <strong>🛠️ Troubleshooting:</strong><br>
            • Make sure you're signed in to Google in this browser<br>
            • Try opening in an incognito/private window<br>
            • Clear your browser cache and cookies<br>
            • Contact your administrator if you need access
        </div>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
            Only authorized personnel can access this system.<br>
            Contact your administrator for account setup.
        </p>
    </div>
    
    <script>
        function handleSignIn(element) {
            // Show loading state
            element.innerHTML = '<div class="google-icon">⏳</div>Loading...';
            element.style.background = '#666';
            
            // Multiple sign-in strategies
            const baseUrl = '${webAppUrl}';
            
            // Strategy 1: Direct navigation
            try {
                window.location.href = baseUrl;
                
                // Strategy 2: Fallback after delay
                setTimeout(function() {
                    window.location.replace(baseUrl);
                }, 1000);
                
                // Strategy 3: Force reload in new window if nothing happens
                setTimeout(function() {
                    const newWindow = window.open(baseUrl, '_blank');
                    if (newWindow) {
                        newWindow.focus();
                    } else {
                        // If popup blocked, use current window
                        window.open(baseUrl, '_self');
                    }
                }, 3000);
                
            } catch (error) {
                console.error('Sign-in error:', error);
                element.innerHTML = '<div class="google-icon">❌</div>Error - Try Again';
                element.style.background = '#e74c3c';
                
                setTimeout(function() {
                    element.innerHTML = '<div class="google-icon">G</div>Sign In with Google';
                    element.style.background = '#4285f4';
                }, 2000);
            }
        }
        
        // Auto-detect if user is already signed in
        document.addEventListener('DOMContentLoaded', function() {
            // Check if we can detect a Google session
            if (typeof gapi !== 'undefined') {
                debugLog('Google APIs detected, attempting auto-signin');
                setTimeout(() => handleSignIn(document.querySelector('.signin-btn')), 1000);
            }
        });
        
        // Handle back button to retry
        window.addEventListener('pageshow', function(event) {
            var navType;
            try {
                if (performance.getEntriesByType) {
                    var entries = performance.getEntriesByType('navigation');
                    navType = entries.length > 0 ? entries[0].type : undefined;
                } else if (performance.navigation) {
                    if (performance.navigation.type === 2) navType = 'back_forward';
                    else if (performance.navigation.type === 1) navType = 'reload';
                    else navType = 'navigate';
                }
            } catch (e) {
                navType = undefined;
            }
            if (event.persisted || navType === 'back_forward') {
                location.replace(location.href);
            }
        });
    </script>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('Sign In - Escort Management')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Create unauthorized access page with registration option
 */
function createUnauthorizedPage(email, name) {
  const webAppUrl = getWebAppUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Access Request - Escort Management</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: rgba(255, 255, 255, 0.95);
            color: #333;
            padding: 40px;
            border-radius: 15px;
            max-width: 600px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        .btn {
            background: #3498db;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 10px;
            transition: all 0.3s ease;
        }
        .btn:hover {
            background: #2980b9;
            transform: translateY(-2px);
        }
        .btn-warning {
            background: #f39c12;
        }
        .btn-warning:hover {
            background: #e67e22;
        }
        .user-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            border-left: 4px solid #3498db;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏍️ Motorcycle Escort Management</h1>
        <h2>🚫 Access Not Authorized</h2>
        
        <div class="user-info">
            <strong>Signed in as:</strong><br>
            📧 ${email}<br>
            👤 ${name || 'Unknown User'}
        </div>
        
        <p>Your Google account is not currently authorized to access this system.</p>
        
        <div style="margin: 30px 0;">
            <h3>🎯 Request Access:</h3>
            <p>If you're a motorcycle escort rider or staff member, you can request access:</p>
            
            <a href="${webAppUrl}?action=register" class="btn">
                📝 Request Access
            </a>
            
            <a href="mailto:admin@yourdomain.com?subject=Access Request - Escort System&body=Hello,%0D%0A%0D%0AI would like to request access to the Motorcycle Escort Management System.%0D%0A%0D%0AMy Google account: ${email}%0D%0AName: ${name}%0D%0ARole requested: [Rider/Dispatcher/Admin]%0D%0A%0D%0AThank you" class="btn btn-warning">
                📧 Email Administrator
            </a>
        </div>
        
        <div style="margin-top: 30px; font-size: 14px; color: #666;">
            <p><strong>Contact Information:</strong></p>
            <p>For immediate assistance, contact your system administrator.</p>
        </div>
        
        <a href="${webAppUrl}?action=signin" class="btn" style="background: #95a5a6;">
            ← Back to Sign In
        </a>
    </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('Access Request')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Create error page with sign-in option
 */
function createErrorPageWithSignIn(error) {
  const webAppUrl = getWebAppUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Error - Escort Management</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            background: rgba(255, 255, 255, 0.95);
            color: #333;
            padding: 40px;
            border-radius: 15px;
            max-width: 500px;
            margin: 0 auto;
        }
        .btn {
            background: #3498db;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 10px;
        }
        .error-details {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            font-family: monospace;
            font-size: 12px;
            text-align: left;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏍️ Motorcycle Escort Management</h1>
        <h2>⚠️ System Error</h2>
        <p>An error occurred while loading the application.</p>
        
        <div class="error-details">
            Error: ${error.message || 'Unknown error'}
        </div>
        
        <a href="${webAppUrl}?action=signin" class="btn">🔄 Try Again</a>
        <a href="${webAppUrl}" class="btn">🏠 Home</a>
    </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('System Error')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 🛡️ SAFE WRAPPER FUNCTIONS (add these to prevent errors)

function getRiderByGoogleEmailSafe(email) {
  try {
    if (typeof getRiderByGoogleEmail === 'function') {
      return getRiderByGoogleEmail(email);
    }
    return null;
  } catch (error) {
    console.error('Error in getRiderByGoogleEmailSafe:', error);
    return null;
  }
}


function getDispatcherUsersSafe() {
  try {
    if (typeof getDispatcherUsers === 'function') {
      return getDispatcherUsers();
    }
    return [];
  } catch (error) {
    console.error('Error in getDispatcherUsersSafe:', error);
    return [];
  }
}

function checkPageAccessSafe(pageName, user, rider) {
  try {
    if (typeof checkPageAccess === 'function') {
      return checkPageAccess(pageName, user, rider);
    }
    return { allowed: true }; // Default to allow
  } catch (error) {
    console.error('Error in checkPageAccessSafe:', error);
    return { allowed: true };
  }
}

function getRoleBasedNavigationSafe(pageName, user, rider) {
  try {
    if (typeof getRoleBasedNavigation === 'function') {
      return getRoleBasedNavigation(pageName, user, rider);
    }
    return '<nav>Navigation unavailable</nav>';
  } catch (error) {
    console.error('Error in getRoleBasedNavigationSafe:', error);
    return '<nav>Navigation error</nav>';
  }
}

function injectUserInfoSafe(content, user, rider) {
  try {
    if (typeof injectUserInfo === 'function') {
      return injectUserInfo(content, user, rider);
    }
    return content;
  } catch (error) {
    console.error('Error in injectUserInfoSafe:', error);
    return content;
  }
}

function updateRiderLastLoginSafe(riderId) {
  try {
    if (typeof updateRiderLastLogin === 'function') {
      updateRiderLastLogin(riderId);
    }
  } catch (error) {
    console.error('Error in updateRiderLastLoginSafe:', error);
  }
}


// 🔐 Authentication Functions
function authenticateUser() {
  try {
    const user = Session.getActiveUser();
    const userEmail = user.getEmail();
    
    if (!userEmail) {
      return {
        success: false,
        error: 'NO_EMAIL',
        message: 'Please sign in with your Google account'
      };
    }
    
    // Check if user is in authorized riders list
    const rider = getRiderByGoogleEmail(userEmail);
    const adminUsers = getAdminUsers();
    const dispatcherUsers = getDispatcherUsers();
    
    let userRole = 'unauthorized';
    let permissions = [];
    
    if (adminUsers.includes(userEmail)) {
      userRole = 'admin';
      permissions = ['view_all', 'edit_all', 'assign_riders', 'manage_users', 'view_reports'];
    } else if (dispatcherUsers.includes(userEmail)) {
      userRole = 'dispatcher';
      permissions = ['view_requests', 'create_requests', 'assign_riders', 'view_reports'];
    } else if (rider && rider.status === 'Active') {
      userRole = 'rider';
      permissions = ['view_own_assignments', 'update_own_status'];
    } else {
      return {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Your account is not authorized to access this system'
      };
    }
    
    // Safe way to get user name
    let userName = '';
    try {
      userName = user.getName ? user.getName() : (user.name || '');
    } catch (e) {
      debugLog('⚠️ getName() failed, trying alternatives...');
      userName = user.name || user.displayName || '';
    }
    
    const displayName = userName || rider?.name || 'User';
    
    return {
      success: true,
      user: {
        name: displayName,
        email: userEmail,
        role: userRole,
        permissions: permissions,
        avatar: displayName.charAt(0).toUpperCase()
      },
      rider: rider
    };
    
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'AUTH_ERROR',
      message: 'Authentication system error'
    };
  }
}

function getRiderByGoogleEmail(email) {
  try {
    const ridersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riders');
    const data = ridersSheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indices
    const emailCol = headers.indexOf('Email');
    const googleEmailCol = headers.indexOf('Google Email');
    const nameCol = headers.indexOf('Full Name');
    const statusCol = headers.indexOf('Status');
    const idCol = headers.indexOf('Rider ID');
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const riderEmail = row[emailCol];
      const googleEmail = row[googleEmailCol];
      
      // Check both regular email and Google email columns
      if (riderEmail === email || googleEmail === email) {
        return {
          id: row[idCol],
          name: row[nameCol],
          email: riderEmail,
          googleEmail: googleEmail,
          status: row[statusCol],
          row: i + 1
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting rider by Google email:', error);
    return null;
  }
}



function getDispatcherUsers() {
  try {
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
    if (settingsSheet) {
      const dispatcherRange = settingsSheet.getRange('C2:C10').getValues();
      return dispatcherRange.flat().filter(email => email && email.trim());
    }
  } catch (error) {
    debugLog('Settings sheet not found, using default dispatchers');
  }
  
  return [
    'dispatcher@yourdomain.com',
    'jpdispatcher100@gmail.com'
    // Add dispatcher emails here
  ];
}

// 🔒 Authorization Functions
function checkPageAccess(pageName, user, rider) {
  const rolePermissions = {
    admin: [
      'dashboard',
      'requests',
      'assignments',
      'riders',
      'notifications',
      'reports',
      'admin-schedule',
      // allow pages only accessible to admins
      'user-management',
      'auth-setup'
    ],
    dispatcher: ['dashboard', 'requests', 'assignments', 'notifications', 'reports'],
    rider: ['dashboard', 'rider-schedule', 'my-assignments']
  };
  
  const allowedPages = rolePermissions[user.role] || [];
  
  // Special case: riders can only see their own data
  if (user.role === 'rider') {
    if (['requests', 'assignments'].includes(pageName)) {
      return { allowed: false, reason: 'Riders can only view their own assignments' };
    }
  }
  
  if (allowedPages.includes(pageName)) {
    return { allowed: true };
  }
  
  return { 
    allowed: false, 
    reason: `Access to ${pageName} is not allowed for ${user.role} role` 
  };
}

function getPageFileName(pageName, userRole) {
  // Role-based page mapping
  const rolePageMap = {
    rider: {
      'dashboard': 'rider-dashboard',
      'rider-schedule': 'rider-schedule',
      'my-assignments': 'rider-assignments'
    },
    // dispatcher: {
    //   'dashboard': 'dispatcher-dashboard'  // File doesn't exist - use default instead
    // },
    admin: {
      'dashboard': 'admin-dashboard'
    }
  };
  
  // Check if there's a role-specific page
  if (rolePageMap[userRole] && rolePageMap[userRole][pageName]) {
    return rolePageMap[userRole][pageName];
  }
  
  // Default page mapping
  const defaultPages = {
    'dashboard': 'index',
    'requests': 'requests',
    'assignments': 'assignments',
    'riders': 'riders',
    'rider-schedule': 'rider-schedule',
    'admin-schedule': 'admin-schedule',
    'notifications': 'notifications',
    'reports': 'reports'
  };
  
  return defaultPages[pageName] || 'index';
}

// 🧭 Role-based Navigation
function getRoleBasedNavigation(currentPage, user, rider) {
  const baseUrl = getWebAppUrl();
  
  const navigationMenus = {
    admin: [
      { page: 'dashboard', label: '📊 Dashboard', url: `${baseUrl}` },
      { page: 'requests', label: '📋 Requests', url: `${baseUrl}?page=requests` },
      { page: 'assignments', label: '🏍️ Assignments', url: `${baseUrl}?page=assignments` },
      { page: 'riders', label: '👥 Riders', url: `${baseUrl}?page=riders` },
      { page: 'notifications', label: '📱 Notifications', url: `${baseUrl}?page=notifications` },
      { page: 'reports', label: '📊 Reports', url: `${baseUrl}?page=reports` }
    ],
    dispatcher: [
      { page: 'dashboard', label: '📊 Dashboard', url: `${baseUrl}` },
      { page: 'requests', label: '📋 Requests', url: `${baseUrl}?page=requests` },
      { page: 'assignments', label: '🏍️ Assignments', url: `${baseUrl}?page=assignments` },
      { page: 'notifications', label: '📱 Notifications', url: `${baseUrl}?page=notifications` },
      { page: 'reports', label: '📊 Reports', url: `${baseUrl}?page=reports` }
    ],
    rider: [
      { page: 'dashboard', label: '📊 My Dashboard', url: `${baseUrl}` },
      { page: 'rider-schedule', label: '📅 My Schedule', url: `${baseUrl}?page=rider-schedule` },
      { page: 'my-assignments', label: '🏍️ My Assignments', url: `${baseUrl}?page=my-assignments` }
    ]
  };
  
  const menuItems = navigationMenus[user.role] || navigationMenus.rider;
  
  let navHtml = '<nav class="navigation" style="display: flex; justify-content: center; align-items: center;">';
  
  menuItems.forEach(item => {
    const isActive = item.page === currentPage ? 'active' : '';
    navHtml += `
      <a href="${item.url}"
         class="nav-button ${isActive}"
         data-page="${item.page}">
        ${item.label}
      </a>
    `;
  });
  
  navHtml += '</nav>';
  
  return navHtml;
}

// 👤 User Information Injection
function injectUserInfo(content, user, rider) {
  debugLog('Code.gs#injectUserInfo: Received user object: ' + JSON.stringify(user));
  // Replace user placeholders
  content = content.replace(/\{\{USER_NAME\}\}/g, user.name);
  content = content.replace(/\{\{USER_EMAIL\}\}/g, user.email);
  content = content.replace(/\{\{USER_ROLE\}\}/g, user.role);
  content = content.replace(/\{\{USER_AVATAR\}\}/g, user.avatar);
  
  if (rider) {
    content = content.replace(/\{\{RIDER_ID\}\}/g, rider.id);
    content = content.replace(/\{\{RIDER_STATUS\}\}/g, rider.status);
  }
  
  // Add user info to existing elements
  if (content.includes('id="userName"')) {
    content = content.replace('id="userName">Loading...', `id="userName">${user.name}`);
  }
  if (content.includes('id="userRole"')) {
    content = content.replace('id="userRole">User', `id="userRole">${user.role}`);
  }
  if (content.includes('id="userAvatar"')) {
    content = content.replace('id="userAvatar">?', `id="userAvatar">${user.avatar}`);
  }
  
  return content;
}

// 📊 User-specific Data Injection
// The original implementation injected a script containing user context and
// UX helpers. It has been removed so pages do not include the inline script.
function addUserDataInjection(htmlOutput, user, rider) {
  try {
    return htmlOutput;
  } catch (error) {
    console.error("Error in addUserDataInjection:", error);
    return htmlOutput;
  }
}

/**
 * Injects URL parameters into the page content as a script
 * This allows individual pages to access parameters that were passed to the doGet function
 */
function injectUrlParameters(content, parameters) {
  try {
    if (!parameters || Object.keys(parameters).length === 0) {
      debugLog('📄 No URL parameters to inject');
      return content;
    }
    
    debugLog('📄 Injecting URL parameters:', parameters);
    
    // Create a script that sets the URL parameters in the window object
    const paramScript = `
<script>
// URL Parameters injected by server-side doGet function
window.urlParameters = ${JSON.stringify(parameters)};
debugLog('📄 URL parameters injected:', window.urlParameters);

// Update the browser's URL to include the parameters for client-side compatibility
if (window.urlParameters && Object.keys(window.urlParameters).length > 0) {
  try {
    const url = new URL(window.location);
    Object.keys(window.urlParameters).forEach(key => {
      if (key !== 'page') { // Don't add 'page' parameter to URL as it's handled server-side
        url.searchParams.set(key, window.urlParameters[key]);
      }
    });
    
    // Update URL without triggering a page reload
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', url.toString());
      debugLog('📄 Browser URL updated with parameters');
    }
  } catch (error) {
    debugLog('📄 Could not update browser URL:', error);
  }
}
</script>`;
    
    // Inject the script at the end of the head section or before the closing body tag
    if (content.includes('</head>')) {
      content = content.replace('</head>', paramScript + '</head>');
    } else if (content.includes('</body>')) {
      content = content.replace('</body>', paramScript + '</body>');
    } else {
      content = content + paramScript;
    }
    
    return content;
    
  } catch (error) {
    console.error('❌ Error injecting URL parameters:', error);
    return content;
  }
}

// Also fix the addMobileOptimizations function:



/**
 * TEST FUNCTION: Verify the fix works
 */
function testHtmlOutputMethods() {
  try {
    debugLog('=== TESTING HTML OUTPUT METHODS ===');
    
    const testOutput = HtmlService.createHtmlOutput('<h1>Test</h1>');
    
    // Test what methods are available
    debugLog('Available methods on HtmlOutput:');
    debugLog('- append:', typeof testOutput.append);
    debugLog('- appendUntrusted:', typeof testOutput.appendUntrusted);
    debugLog('- setContent:', typeof testOutput.setContent);
    debugLog('- getContent:', typeof testOutput.getContent);
    
    // Test appendUntrusted
    try {
      testOutput.appendUntrusted('<script>debugLog("appendUntrusted works!");</script>');
      debugLog('✅ appendUntrusted method works');
    } catch (error) {
      debugLog('❌ appendUntrusted failed:', error.message);
    }
    
    // Test append (should fail)
    try {
      testOutput.append('<script>debugLog("append test");</script>');
      debugLog('⚠️ append method worked (unexpected)');
    } catch (error) {
      debugLog('✅ append method correctly fails:', error.message);
    }
    
    return {
      success: true,
      hasAppendUntrusted: typeof testOutput.appendUntrusted === 'function',
      hasAppend: typeof testOutput.append === 'function'
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}





function addMotorcycleLoaderToContent(content) {
  try {
    debugLog('🏍️ Adding motorcycle loader directly to HTML content');
    
    const motorcycleHtml = `
<!-- INSTANT MOTORCYCLE LOADER -->
<div id="instantMotorcycle" style="
  position: fixed !important; 
  top: 0 !important; left: 0 !important; 
  width: 100% !important; height: 100% !important;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  z-index: 999999 !important;
  display: flex !important;
  justify-content: center !important; align-items: center !important;
  color: white !important; font-family: Arial, sans-serif !important;
  flex-direction: column !important;
">
  <div style="font-size: 5rem; margin-bottom: 1rem; transform: scaleX(-1); animation: motorcycleRide 2s ease-in-out infinite;">🏍️</div>
  <div style="font-size: 2rem; font-weight: bold;">Loading...</div>
</div>
<style>
@keyframes motorcycleRide {
  0%, 100% { transform: scaleX(-1) translateX(-10px) rotate(-2deg); }
  50% { transform: scaleX(-1) translateX(10px) rotate(2deg); }
}
</style>
<script>
(function() {
  function hideMotorcycle() {
    const motorcycle = document.getElementById('instantMotorcycle');
    if (motorcycle) {
      motorcycle.style.opacity = '0';
      motorcycle.style.transition = 'opacity 0.5s ease';
      setTimeout(() => motorcycle.remove(), 500);
    }
  }
  
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(hideMotorcycle, 1500);
  });
  
  setTimeout(hideMotorcycle, 3000); // Fallback
})();
</script>`;
    
    if (content.includes('<body>')) {
      content = content.replace('<body>', '<body>' + motorcycleHtml);
    } else {
      content = motorcycleHtml + content;
    }
    
    return content;
    
  } catch (error) {
    console.error('❌ Error adding motorcycle to content:', error);
    return content;
  }
}
// MOBILE OPTIMIZATION PACKAGE - Add this to your Code.gs

function addMobileOptimizations(htmlOutput, user, rider) {
  try {
    const mobileScript = `
<!-- MOBILE OPTIMIZATION CSS -->
<style>
/* Mobile-First Responsive Design */
@media (max-width: 768px) {
  /* Navigation Optimization */
  .navigation {
    flex-wrap: wrap !important;
    padding: 0.5rem !important;
    gap: 0.3rem !important;
    justify-content: center !important;
  }
  
  .nav-button {
    padding: 0.75rem 1rem !important;
    font-size: 0.85rem !important;
    min-height: 44px !important; /* Apple touch target size */
    border-radius: 8px !important;
    flex: 1 1 auto !important;
    text-align: center !important;
    white-space: nowrap !important;
  }
  
  /* Header Optimization */
  .header {
    padding: 1rem !important;
    flex-direction: column !important;
    text-align: center !important;
  }
  
  .header h1 {
    font-size: 1.5rem !important;
    margin-bottom: 0.5rem !important;
  }
  
  /* Container Optimization */
  .container {
    padding: 1rem !important;
    margin: 0.5rem !important;
    border-radius: 12px !important;
  }
  
  /* Table Optimization */
  table {
    font-size: 0.8rem !important;
    display: block !important;
    overflow-x: auto !important;
    white-space: nowrap !important;
  }
  
  table thead {
    display: none !important; /* Hide headers on mobile */
  }
  
  table tbody tr {
    display: block !important;
    border: 1px solid #ddd !important;
    margin-bottom: 0.5rem !important;
    padding: 0.5rem !important;
    border-radius: 8px !important;
    background: white !important;
  }
  
  table tbody td {
    display: block !important;
    text-align: left !important;
    padding: 0.25rem 0 !important;
    border: none !important;
  }
  
  table tbody td:before {
    content: attr(data-label) ": " !important;
    font-weight: bold !important;
    color: #667eea !important;
  }
  
  /* Form Optimization */
  input, select, textarea {
    font-size: 16px !important; /* Prevents zoom on iOS */
    padding: 0.75rem !important;
    border-radius: 8px !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
  
  button, .btn {
    padding: 0.75rem 1.5rem !important;
    font-size: 1rem !important;
    min-height: 44px !important;
    border-radius: 8px !important;
    width: 100% !important;
    margin-bottom: 0.5rem !important;
  }
  
  /* Modal Optimization */
  .modal-content {
    margin: 1rem !important;
    max-height: 90vh !important;
    overflow-y: auto !important;
  }
  
  /* Dashboard Cards */
  .stat-card, .dashboard-card {
    margin-bottom: 1rem !important;
    padding: 1rem !important;
    border-radius: 12px !important;
  }
  
  /* Font Size Adjustments */
  body {
    font-size: 16px !important;
    line-height: 1.5 !important;
  }
  
  h1 { font-size: 1.75rem !important; }
  h2 { font-size: 1.5rem !important; }
  h3 { font-size: 1.25rem !important; }
}

/* Touch-Friendly Enhancements */
@media (hover: none) and (pointer: coarse) {
  /* This targets touch devices */
  .nav-button:hover {
    transform: none !important; /* Disable hover effects on touch */
  }
  
  .nav-button:active {
    background: #2980b9 !important;
    transform: scale(0.95) !important;
  }
  
  button:active, .btn:active {
    transform: scale(0.95) !important;
  }
}

/* Landscape Phone Optimization */
@media (max-width: 768px) and (orientation: landscape) {
  .navigation {
    padding: 0.25rem !important;
    gap: 0.25rem !important;
  }
  
  .nav-button {
    padding: 0.5rem 0.75rem !important;
    font-size: 0.8rem !important;
  }
  
  .header {
    padding: 0.5rem !important;
  }
  
  .container {
    padding: 0.75rem !important;
  }
}

/* Large Mobile/Small Tablet */
@media (min-width: 481px) and (max-width: 768px) {
  .navigation {
    gap: 0.5rem !important;
  }
  
  .nav-button {
    flex: 1 1 calc(50% - 0.25rem) !important;
    max-width: calc(50% - 0.25rem) !important;
  }
}

/* Accessibility Improvements */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>

<script>
// MOBILE OPTIMIZATION JAVASCRIPT
(function() {
  debugLog('📱 Mobile optimization package loading...');
  
  // 1. DEVICE DETECTION
  function detectDevice() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTablet = /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(navigator.userAgent);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const screenWidth = window.innerWidth || document.documentElement.clientWidth;
    
    return {
      isMobile: isMobile || screenWidth < 768,
      isTablet: isTablet,
      isTouchDevice: isTouchDevice,
      screenWidth: screenWidth,
      orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
    };
  }
  
  const device = detectDevice();
  debugLog('📱 Device info:', device);
  
  // 2. MOBILE-SPECIFIC ENHANCEMENTS
  if (device.isMobile) {
    document.body.classList.add('mobile-device');
    
    // Add mobile-specific meta tags if not present
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(viewport);
    }
    
    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  }
  
  // 3. ENHANCED TABLE MOBILE VIEW
  function enhanceTablesForMobile() {
    if (!device.isMobile) return;
    
    document.querySelectorAll('table').forEach(table => {
      const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
      
      table.querySelectorAll('tbody tr').forEach(row => {
        Array.from(row.querySelectorAll('td')).forEach((cell, index) => {
          if (headers[index]) {
            cell.setAttribute('data-label', headers[index]);
          }
        });
      });
      
      table.classList.add('mobile-table');
    });
  }
  
  // 4. MOBILE NAVIGATION ENHANCEMENTS
  function enhanceMobileNavigation() {
    const nav = document.querySelector('.navigation');
    if (!nav || !device.isMobile) return;
    
    // Add haptic feedback for supported devices
    nav.addEventListener('click', function() {
      if ('vibrate' in navigator) {
        navigator.vibrate(50); // Short vibration
      }
    });
  }
  
  // 5. TOUCH ENHANCEMENTS
  function addTouchEnhancements() {
    if (!device.isTouchDevice) return;
    
    // Add touch feedback to all interactive elements
    document.querySelectorAll('button, .nav-button, a, input[type="submit"]').forEach(element => {
      element.addEventListener('touchstart', function() {
        this.style.opacity = '0.7';
        this.style.transform = 'scale(0.95)';
        this.style.transition = 'all 0.1s ease';
      });
      
      element.addEventListener('touchend', function() {
        this.style.opacity = '';
        this.style.transform = '';
      });
      
      element.addEventListener('touchcancel', function() {
        this.style.opacity = '';
        this.style.transform = '';
      });
    });
  }
  
  // 6. INITIALIZE MOBILE OPTIMIZATIONS
  document.addEventListener('DOMContentLoaded', function() {
    debugLog('📱 Initializing mobile optimizations...');
    
    enhanceTablesForMobile();
    enhanceMobileNavigation();
    addTouchEnhancements();
    
    // Add device class to body without empty tokens
    const classes = [
      device.isMobile ? 'mobile' : 'desktop',
      device.isTouchDevice ? 'touch-device' : 'mouse-device',
      device.orientation
    ];
    if (device.isTablet) {
      classes.push('tablet');
    }
    document.body.classList.add(...classes);
    
    debugLog('✅ Mobile optimizations ready!');
  });
  
  // 7. EXPOSE MOBILE UTILITIES
  window.MobileUX = {
    device: device,
    isMobile: device.isMobile,
    isTouchDevice: device.isTouchDevice
  };
  
  debugLog('✅ Mobile optimization package loaded');
  
})();
</script>`;
    
const currentContent = htmlOutput.getContent();
htmlOutput.setContent(currentContent + mobileScript);
    return htmlOutput;
    
  } catch (error) {
    console.error('Error adding mobile optimizations:', error);
    return htmlOutput;
  }
}

// 📱 Utility Functions
function updateRiderLastLogin(riderId) {
  try {
    const ridersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riders');
    const data = ridersSheet.getDataRange().getValues();
    const headers = data[0];
    
    const idCol = headers.indexOf('Rider ID');
    const lastLoginCol = headers.indexOf('Last Login');
    
    if (lastLoginCol === -1) {
      // Add Last Login column if it doesn't exist
      ridersSheet.getRange(1, headers.length + 1).setValue('Last Login');
    }
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === riderId) {
        const now = new Date();
        ridersSheet.getRange(i + 1, lastLoginCol + 1).setValue(now);
        break;
      }
    }
  } catch (error) {
    console.error('Error updating last login:', error);
  }
}
function createAuthMappingPage() {
  debugLog('🔐 Creating auth mapping page...');
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Setup - Motorcycle Escort Management</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }

        .header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 1rem 2rem;
            box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .header h1 {
            color: #2c3e50;
            font-size: 1.8rem;
            font-weight: 600;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }

        .page-header {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 2rem;
            margin-bottom: 2rem;
            text-align: center;
        }

        .auth-section {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 2rem;
            margin-bottom: 2rem;
        }

        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 0.5rem;
            transition: all 0.3s ease;
        }

        .btn-primary { background: #3498db; color: white; }
        .btn-primary:hover { background: #2980b9; transform: translateY(-2px); }

        .btn-success { background: #27ae60; color: white; }
        .btn-success:hover { background: #219a52; transform: translateY(-2px); }

        .btn-warning { background: #f39c12; color: white; }
        .btn-warning:hover { background: #d68910; transform: translateY(-2px); }

        .mapping-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }

        .mapping-table th, .mapping-table td {
            padding: 0.75rem;
            border: 1px solid #ddd;
            text-align: left;
        }

        .mapping-table th {
            background: #f8f9fa;
            font-weight: 600;
        }

        .status-badge {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 600;
        }

        .status-mapped { background: #d4edda; color: #155724; }
        .status-unmapped { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔐 Authentication Setup</h1>
        <a href="javascript:history.back()" class="btn btn-primary">← Back to Dashboard</a>
    </div>

    <div class="container">
        <div class="page-header">
            <h2>Gmail Account Authentication Setup</h2>
            <p>Manage the connection between rider accounts and their Gmail addresses for system access.</p>
        </div>

        <div class="auth-section">
            <h3>📧 Gmail Account Mapping</h3>
            <p>Connect rider accounts to their Gmail addresses to enable system login.</p>
            
            <div style="margin: 1rem 0;">
                <button class="btn btn-success" onclick="autoMapGmailUsers()">
                    🚀 Auto-Map Gmail Users
                </button>
                <button class="btn btn-primary" onclick="viewUnmappedRiders()">
                    👥 View Unmapped Riders
                </button>
                <button class="btn btn-warning" onclick="testGmailAuth()">
                    🧪 Test Authentication
                </button>
            </div>

            <div id="mappingResults" style="margin-top: 2rem;"></div>
        </div>

        <div class="auth-section">
            <h3>⚙️ Authentication Settings</h3>
            <p>Configure system-wide authentication and security settings.</p>
            
            <div style="margin: 1rem 0;">
                <button class="btn btn-primary" onclick="manageAdminUsers()">
                    👨‍💼 Manage Admin Users
                </button>
                <button class="btn btn-primary" onclick="manageDispatcherUsers()">
                    👨‍💻 Manage Dispatcher Users
                </button>
                <button class="btn btn-warning" onclick="viewAuthLogs()">
                    📋 View Auth Logs
                </button>
            </div>
        </div>
    </div>

    <script>
        // Auto-map Gmail users
        function autoMapGmailUsers() {
            showMessage('Auto-mapping Gmail users...', 'info');
            
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                google.script.run
                    .withSuccessHandler(function(result) {
                        if (result.success) {
                            showMessage('Successfully mapped ' + result.count + ' Gmail users', 'success');
                            displayMappingResults(result.mappings);
                        } else {
                            showMessage('Auto-mapping failed: ' + result.error, 'error');
                        }
                    })
                    .withFailureHandler(function(error) {
                        showMessage('Error: ' + error, 'error');
                    })
                    .autoMapExistingGmailUsers();
            }
        }

        // View unmapped riders
        function viewUnmappedRiders() {
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                google.script.run
                    .withSuccessHandler(displayUnmappedRiders)
                    .withFailureHandler(function(error) {
                        showMessage('Error: ' + error, 'error');
                    })
                    .getUnmappedRiders();
            }
        }

        // Test Gmail authentication
        function testGmailAuth() {
            showMessage('Testing Gmail authentication...', 'info');
            
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                google.script.run
                    .withSuccessHandler(function(result) {
                        showMessage('Authentication test: ' + (result.success ? 'PASSED' : 'FAILED'), 
                                  result.success ? 'success' : 'error');
                    })
                    .withFailureHandler(function(error) {
                        showMessage('Test failed: ' + error, 'error');
                    })
                    .testAuthentication();
            }
        }

        // Display mapping results
        function displayMappingResults(mappings) {
            const container = document.getElementById('mappingResults');
            
            let html = '<h4>Gmail Mapping Results</h4>';
            html += '<table class="mapping-table">';
            html += '<tr><th>Rider Name</th><th>Gmail Address</th><th>Status</th></tr>';
            
            mappings.forEach(mapping => {
                const statusClass = mapping.mapped ? 'status-mapped' : 'status-unmapped';
                const statusText = mapping.mapped ? 'Mapped' : 'Unmapped';
                
                html += '<tr>';
                html += '<td>' + mapping.name + '</td>';
                html += '<td>' + (mapping.gmail || 'Not set') + '</td>';
                html += '<td><span class="status-badge ' + statusClass + '">' + statusText + '</span></td>';
                html += '</tr>';
            });
            
            html += '</table>';
            container.innerHTML = html;
        }

        // Display unmapped riders
        function displayUnmappedRiders(riders) {
            const container = document.getElementById('mappingResults');
            
            let html = '<h4>Unmapped Riders</h4>';
            if (riders.length === 0) {
                html += '<p>All riders are mapped to Gmail accounts! 🎉</p>';
            } else {
                html += '<p>The following riders need Gmail account mapping:</p>';
                html += '<ul>';
                riders.forEach(rider => {
                    html += '<li>' + rider.name + ' (ID: ' + rider.id + ')</li>';
                });
                html += '</ul>';
            }
            
            container.innerHTML = html;
        }

        // Utility functions
        function manageAdminUsers() {
            showMessage('Opening admin user management...', 'info');
            // Redirect to user management with admin filter
            window.location.href = '${getWebAppUrl()}?page=user-management&filter=admin';
        }

        function manageDispatcherUsers() {
            showMessage('Opening dispatcher user management...', 'info');
            // Redirect to user management with dispatcher filter
            window.location.href = '${getWebAppUrl()}?page=user-management&filter=dispatcher';
        }

        function viewAuthLogs() {
            showMessage('Feature coming soon...', 'info');
        }

        function showMessage(message, type) {
            // Simple message display - you can enhance this
            alert(message);
        }
    </script>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Authentication Setup - Escort Management')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 3. Check your dashboard navigation/buttons to ensure they link to the correct page:

// Dashboard should have buttons like this:
// <a href="?page=auth-setup" class="btn btn-primary">🔐 Auth Setup</a>
// <a href="?page=user-management" class="btn btn-primary">👥 User Management</a>

// 4. Testing function to verify the routing:

function testAuthSetupRouting() {
  try {
    debugLog('=== TESTING AUTH SETUP ROUTING ===');
    
    // Test auth-setup page
    const authSetupEvent = { parameter: { page: 'auth-setup' } };
    const authResult = doGet(authSetupEvent);
    const authContent = authResult.getContent();
    
    debugLog('Auth setup page test:');
    debugLog(`- Content length: ${authContent.length}`);
    debugLog(`- Contains "Authentication Setup": ${authContent.includes('Authentication Setup') ? '✅' : '❌'}`);
    debugLog(`- Contains "Gmail Account Mapping": ${authContent.includes('Gmail Account Mapping') ? '✅' : '❌'}`);
    
    // Test user-management page
    const userMgmtEvent = { parameter: { page: 'user-management' } };
    const userResult = doGet(userMgmtEvent);
    const userContent = userResult.getContent();
    
    debugLog('User management page test:');
    debugLog(`- Content length: ${userContent.length}`);
    debugLog(`- Contains "User Management": ${userContent.includes('User Management') ? '✅' : '❌'}`);
    
    return {
      authSetup: {
        hasAuthSetupTitle: authContent.includes('Authentication Setup'),
        hasGmailMapping: authContent.includes('Gmail Account Mapping')
      },
      userManagement: {
        hasUserMgmtTitle: userContent.includes('User Management')
      }
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { error: error.message };
  }
}
// 🚫 Error Pages
function createAuthErrorPage(errorType) {
  const signInUrl = getWebAppUrl();
  
  return HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sign In Required - Escort Management</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 50px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          background: rgba(255, 255, 255, 0.95);
          color: #333;
          padding: 40px;
          border-radius: 15px;
          max-width: 500px;
          margin: 0 auto;
        }
        .btn {
          background: #3498db;
          color: white;
          padding: 15px 30px;
          border: none;
          border-radius: 25px;
          font-size: 16px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🏍️ Motorcycle Escort Management</h1>
        <h2>🔐 Authentication Required</h2>
        <p>Please sign in with your authorized Google account to access the system.</p>
        <a href="${signInUrl}" class="btn">🔑 Sign In with Google</a>
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
          Contact your administrator if you need access.
        </p>
      </div>
    </body>
    </html>
  `).setTitle('Sign In Required');
}

function createAccessDeniedPage(reason, user) {
  return HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Access Denied - Escort Management</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 50px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          background: rgba(255, 255, 255, 0.95);
          color: #333;
          padding: 40px;
          border-radius: 15px;
          max-width: 500px;
          margin: 0 auto;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🏍️ Motorcycle Escort Management</h1>
        <h2>🚫 Access Denied</h2>
        <p>Hello ${user.name},</p>
        <p>${reason}</p>
        <p>Your role: <strong>${user.role}</strong></p>
        <a href="${getWebAppUrl()}" style="color: #3498db;">← Back to Dashboard</a>
      </div>
    </body>
    </html>
  `).setTitle('Access Denied');
}

// Keep your existing addNavigationToContent function but enhance it
function addNavigationToContent(content, navigationHtml) {
  // Remove any existing navigation
  content = content.replace(/<nav class="navigation">[\s\S]*?<\/nav>/g, '');
  
  // Add enhanced navigation CSS for roles
  if (!content.includes('.navigation') || !content.includes('.nav-button')) {
    const navCSS = `
.navigation {
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    gap: 1rem;
    margin: 0 auto 2rem auto !important;
    flex-wrap: wrap;
    background: rgba(255, 255, 255, 0.95);
    padding: 1rem 2rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    border-radius: 0 0 15px 15px;
}
.nav-button {
    padding: 0.75rem 1.5rem !important;
    background: rgba(255, 255, 255, 0.9) !important;
    border: none !important;
    border-radius: 25px !important;
    color: #2c3e50 !important;
    text-decoration: none !important;
    font-weight: 600 !important;
    transition: all 0.3s ease !important;
    cursor: pointer !important;
    display: inline-block !important;
}
.nav-button:hover, .nav-button.active {
    background: #3498db !important;
    color: white !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3) !important;
}
`;
    
    // Add CSS to head
    if (content.includes('<head>')) {
      content = content.replace('<head>', `<head><style>${navCSS}</style>`);
    } else if (content.includes('<style>')) {
      content = content.replace('</style>', `${navCSS}</style>`);
    } else {
      content = `<style>${navCSS}</style>${content}`;
    }
  }
  
  // Add navigation HTML
  if (content.includes('<body>')) {
    content = content.replace('<body>', `<body>${navigationHtml}`);
  } else {
    content = `${navigationHtml}${content}`;
  }
  
  return content;
}

/**
 * STEP 2: Automatic fix based on diagnosis
 */
function autoFixRidersIssue() {
  try {
    debugLog('🔧 Starting automatic fix for riders issue...');
    
    // First, get diagnosis
    const diagnosis = diagnoseRealRidersIssue();
    
    if (!diagnosis.recommendations || diagnosis.recommendations.length === 0) {
      debugLog('✅ No issues found that need fixing');
      return { success: true, message: 'No fixes needed' };
    }
    
    const fixResults = {
      success: true,
      appliedFixes: [],
      errors: []
    };
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.riders);
    
    // Apply fixes based on recommendations
    for (const recommendation of diagnosis.recommendations) {
      debugLog(`🔧 Applying fix: ${recommendation.fix}`);
      
      try {
        switch (recommendation.fix) {
          case 'addSampleRiders':
            // Add sample riders if no data exists
            const sampleRiders = [
              ['RIDER001', 'John Smith', '555-0101', 'john@example.com', 'Active', 'Standard', 0, ''],
              ['RIDER002', 'Jane Doe', '555-0102', 'jane@example.com', 'Active', 'Advanced', 0, ''],
              ['RIDER003', 'Bob Wilson', '555-0103', 'bob@example.com', 'Active', 'Standard', 0, '']
            ];
            
            sampleRiders.forEach(rider => {
              sheet.appendRow(rider);
            });
            
            fixResults.appliedFixes.push('Added 3 sample riders');
            debugLog('✅ Added sample riders');
            break;
            
          case 'fixColumnHeaders':
            // Fix headers to match CONFIG expectations
            const expectedHeaders = Object.values(CONFIG.columns.riders);
            sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
            
            fixResults.appliedFixes.push('Fixed column headers');
            debugLog('✅ Fixed column headers');
            break;
            
          case 'setActiveStatuses':
            // Set empty statuses to 'Active'
            const data = sheet.getDataRange().getValues();
            const headers = data[0];
            const statusColIndex = headers.indexOf(CONFIG.columns.riders.status);
            const nameColIndex = headers.indexOf(CONFIG.columns.riders.name);
            
            if (statusColIndex >= 0 && nameColIndex >= 0) {
              let fixedCount = 0;
              for (let i = 1; i < data.length; i++) {
                const name = data[i][nameColIndex];
                const status = data[i][statusColIndex];
                
                if (name && String(name).trim() && (!status || String(status).trim() === '')) {
                  sheet.getRange(i + 1, statusColIndex + 1).setValue('Active');
                  fixedCount++;
                }
              }
              
              fixResults.appliedFixes.push(`Set ${fixedCount} riders to Active status`);
              debugLog(`✅ Set ${fixedCount} riders to Active status`);
            }
            break;
            
          case 'addRiderNames':
            // Add placeholder names where missing
            const allData = sheet.getDataRange().getValues();
            const allHeaders = allData[0];
            const nameCol = allHeaders.indexOf(CONFIG.columns.riders.name);
            const idCol = allHeaders.indexOf(CONFIG.columns.riders.jpNumber);
            
            if (nameCol >= 0) {
              let addedNames = 0;
              for (let i = 1; i < allData.length; i++) {
                const name = allData[i][nameCol];
                const id = allData[i][idCol];
                
                if ((!name || String(name).trim() === '') && id && String(id).trim()) {
                  sheet.getRange(i + 1, nameCol + 1).setValue(`Rider ${id}`);
                  addedNames++;
                }
              }
              
              fixResults.appliedFixes.push(`Added names to ${addedNames} riders`);
              debugLog(`✅ Added names to ${addedNames} riders`);
            }
            break;
        }
        
      } catch (fixError) {
        console.error(`❌ Fix ${recommendation.fix} failed:`, fixError);
        fixResults.errors.push(`${recommendation.fix}: ${fixError.message}`);
      }
    }
    
    // Clear cache after fixes
    dataCache.clear('sheet_' + CONFIG.sheets.riders);
    fixResults.appliedFixes.push('Cleared data cache');
    
    // Test the result
    try {
      const testRiders = getActiveRidersForAssignments();
      fixResults.testResult = {
        success: testRiders.length > 0,
        ridersFound: testRiders.length,
        sampleRider: testRiders[0] || null
      };
      
      debugLog(`🧪 Test result: Found ${testRiders.length} active riders`);
      
    } catch (testError) {
      fixResults.testResult = {
        success: false,
        error: testError.message
      };
    }
    
    debugLog('🔧 Auto-fix complete:', fixResults);
    return fixResults;
    
  } catch (error) {
    console.error('❌ Auto-fix failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * STEP 3: Simple test to verify riders are working
 */
function testRidersAreWorking() {
  try {
    debugLog('🧪 Testing if riders are working...');
    
    const tests = {
      timestamp: new Date().toISOString(),
      results: {}
    };
    
    // Test 1: Basic data access
    try {
      const ridersData = getRidersData(false);
      tests.results.getRidersData = {
        success: true,
        dataFound: !!(ridersData && ridersData.data && ridersData.data.length > 0),
        rowCount: ridersData?.data?.length || 0
      };
    } catch (error) {
      tests.results.getRidersData = {
        success: false,
        error: error.message
      };
    }
    
    // Test 2: Active riders for assignments
    try {
      const activeRiders = getActiveRidersForAssignments();
      tests.results.getActiveRidersForAssignments = {
        success: true,
        ridersFound: activeRiders.length,
        hasRealRiders: activeRiders.length > 0 && !activeRiders[0].name.includes('System'),
        sampleRider: activeRiders[0] || null
      };
    } catch (error) {
      tests.results.getActiveRidersForAssignments = {
        success: false,
        error: error.message
      };
    }
    
    // Test 3: Web app riders
    try {
      const webAppRiders = getActiveRidersForWebApp();
      tests.results.getActiveRidersForWebApp = {
        success: true,
        ridersFound: webAppRiders.length,
        hasRealRiders: webAppRiders.length > 0 && !webAppRiders[0].name.includes('System'),
        sampleRider: webAppRiders[0] || null
      };
    } catch (error) {
      tests.results.getActiveRidersForWebApp = {
        success: false,
        error: error.message
      };
    }
    
    // Overall assessment
    const hasRealRiders = tests.results.getActiveRidersForAssignments?.hasRealRiders === true;
    tests.overallSuccess = hasRealRiders;
    tests.message = hasRealRiders 
      ? '✅ Riders are working correctly!' 
      : '❌ Still showing fallback/system riders - real data issue remains';
    
    debugLog('🧪 Test complete:', tests);
    return tests;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * STEP 4: Complete solution - diagnose and fix in one go
 */
function fixRidersCompletely() {
  try {
    debugLog('🚀 === COMPLETE RIDERS FIX ===');
    
    const solution = {
      timestamp: new Date().toISOString(),
      steps: []
    };
    
    // Step 1: Diagnose
    debugLog('🔍 Step 1: Diagnosing issue...');
    const diagnosis = diagnoseRealRidersIssue();
    solution.steps.push({
      step: 'diagnosis',
      result: diagnosis,
      success: !diagnosis.error
    });
    
    // Step 2: Apply fixes
    debugLog('🔧 Step 2: Applying fixes...');
    const fixes = autoFixRidersIssue();
    solution.steps.push({
      step: 'fixes',
      result: fixes,
      success: fixes.success
    });
    
    // Step 3: Test result
    debugLog('🧪 Step 3: Testing result...');
    const test = testRidersAreWorking();
    solution.steps.push({
      step: 'test',
      result: test,
      success: test.overallSuccess
    });
    
    solution.overallSuccess = test.overallSuccess;
    solution.finalMessage = test.message;
    
    debugLog('🚀 Complete fix result:', solution);
    
    if (solution.overallSuccess) {
      debugLog('🎉 SUCCESS! Riders should now work properly. Refresh your web app.');
    } else {
      debugLog('❌ Issue persists. Check the diagnosis for more details.');
    }
    
    return solution;
    
  } catch (error) {
    console.error('❌ Complete fix failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
/**
 * Handle user management page
 */
function handleUserManagementPage(e) {
  try {
    debugLog('🔐 Handling user management page...');
    
    // Check authentication first
    const authResult = authenticateAndAuthorizeUser();
    
    if (!authResult.success) {
      debugLog('❌ User management auth failed:', authResult.error);
      return createSignInPage();
    }
    
    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      debugLog('❌ User management access denied for role:', authResult.user.role);
      return createAccessDeniedPage('Only administrators can access user management', authResult.user);
    }
    
    debugLog('✅ User management access granted for admin:', authResult.user.name);
    
    // Check if user-management.html file exists
    if (checkFileExists('user-management')) {
      debugLog('✅ Loading user-management.html file');
      
      // Load the HTML file normally
      let htmlOutput = HtmlService.createHtmlOutputFromFile('user-management');
      let content = htmlOutput.getContent();
      
      // Add navigation and user info
      const navigationHtml = getRoleBasedNavigationSafe('user-management', authResult.user, authResult.rider);
      content = injectUserInfoSafe(content, authResult.user, authResult.rider);
      content = addNavigationToContentSafe(content, navigationHtml);
      htmlOutput.setContent(content);
      addUserDataInjectionSafe(htmlOutput, authResult.user, authResult.rider);

      return htmlOutput
        .setTitle('User Management - Escort Management')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
        
    } else {
      debugLog('❌ user-management.html file not found, creating dynamic page');
      // Fall back to the dynamic version we created earlier
      return createUserManagementDashboard();
    }
    
  } catch (error) {
    console.error('❌ User management page error:', error);
    return createErrorPageWithSignIn(error);
  }
}

/**
 * Handle auth setup page
 */
function handleAuthSetupPage(e) {
  try {
    debugLog('🔐 Handling auth setup page...');
    
    const authResult = authenticateAndAuthorizeUser();
    
    if (!authResult.success || authResult.user.role !== 'admin') {
      return createAccessDeniedPage('Only administrators can access authentication setup', 
        authResult.user || { name: 'Unknown', role: 'unknown' });
    }
    
    // Return the auth mapping page we created
    return createAuthMappingPage();
    
  } catch (error) {
    console.error('❌ Auth setup page error:', error);
    return createErrorPageWithSignIn(error);
  }
}

/**
 * Enhanced navigation that includes user management
 */
function getRoleBasedNavigationSafe(currentPage, user, rider) {
  try {
    const baseUrl = getWebAppUrlSafe();
    
    const navigationMenus = {
      admin: [
        { page: 'dashboard', label: '📊 Dashboard', url: `${baseUrl}` },
        { page: 'requests', label: '📋 Requests', url: `${baseUrl}?page=requests` },
        { page: 'assignments', label: '🏍️ Assignments', url: `${baseUrl}?page=assignments` },
        { page: 'riders', label: '👥 Riders', url: `${baseUrl}?page=riders` },
        { page: 'user-management', label: '🔐 User Management', url: `${baseUrl}?page=user-management` },
        { page: 'notifications', label: '📱 Notifications', url: `${baseUrl}?page=notifications` },
        { page: 'reports', label: '📊 Reports', url: `${baseUrl}?page=reports` }
      ],
      dispatcher: [
        { page: 'dashboard', label: '📊 Dashboard', url: `${baseUrl}` },
        { page: 'requests', label: '📋 Requests', url: `${baseUrl}?page=requests` },
        { page: 'assignments', label: '🏍️ Assignments', url: `${baseUrl}?page=assignments` },
        { page: 'notifications', label: '📱 Notifications', url: `${baseUrl}?page=notifications` },
        { page: 'reports', label: '📊 Reports', url: `${baseUrl}?page=reports` }
      ],
      rider: [
        { page: 'dashboard', label: '📊 My Dashboard', url: `${baseUrl}` },
        { page: 'rider-schedule', label: '📅 My Schedule', url: `${baseUrl}?page=rider-schedule` },
        { page: 'my-assignments', label: '🏍️ My Assignments', url: `${baseUrl}?page=my-assignments` }
      ]
    };
    
    const menuItems = navigationMenus[user.role] || navigationMenus.rider;
    
    let navHtml = '<nav class="navigation" style="display: flex; justify-content: center; align-items: center;">';
    
    menuItems.forEach(item => {
      const isActive = item.page === currentPage ? 'active' : '';
      navHtml += `
        <a href="${item.url}"
           class="nav-button ${isActive}"
           data-page="${item.page}"
           target="_top">
          ${item.label}
        </a>
      `;
    });
    
    navHtml += '</nav>';
    
    return navHtml;
    
  } catch (error) {
    console.error('❌ Error in getRoleBasedNavigationSafe:', error);
    return '<nav>Navigation error</nav>';
  }
}

/**
 * Log out the current user and return a Google sign-out URL
 */
function logout() {
  try {
    if (typeof logoutUser === 'function') {
      logoutUser();
    }
    PropertiesService.getScriptProperties().deleteProperty('CACHED_USER_EMAIL');
    PropertiesService.getScriptProperties().deleteProperty('CACHED_USER_NAME');
  } catch (error) {
    console.error('Error clearing cached user info during logout:', error);
  }

  const baseUrl = getWebAppUrlSafe();
  return `https://accounts.google.com/Logout?continue=${encodeURIComponent(baseUrl)}`;
}

/**
 * Test function - run this to debug your setup
 */
function debugSystemSetup() {
  debugLog('🧪 Debugging system setup...');
  
  try {
    debugLog('=== Testing Authentication ===');
    const authResult = authenticateAndAuthorizeUser();
    debugLog('Auth result:', authResult);
    
    debugLog('=== Testing Admin Dashboard Data ===');
    const dashboardData = getAdminDashboardData();
    debugLog('Dashboard data:', dashboardData);
    
    debugLog('=== Testing User Management Data ===');
    const userMgmtData = getUserManagementData();
    debugLog('User management data:', userMgmtData);
    
    debugLog('=== Testing File Existence ===');
    const files = ['index', 'admin-dashboard', 'user-management', 'requests', 'assignments'];
    files.forEach(file => {
      const exists = checkFileExists(file);
      debugLog(`${exists ? '✅' : '❌'} ${file}.html`);
    });
    
    return {
      auth: authResult,
      dashboard: dashboardData,
      userMgmt: userMgmtData,
      filesExist: files.map(f => ({ file: f, exists: checkFileExists(f) }))
    };
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    return { error: error.message };
  }
}
function handlePublicConfirmation(params) {
  try {
    const { action, response, requestId, assignmentId, rider } = params;
    
    console.log('📧 Processing public confirmation:', { action, response, requestId, assignmentId, rider });
    
    // Validate required parameters
    if (!response || !rider) {
      return createSimpleErrorPage('Missing required information for confirmation.');
    }
    
    // Validate response type
    if (!['confirm', 'decline', 'accept', 'reject'].includes(response.toLowerCase())) {
      return createSimpleErrorPage('Invalid response type.');
    }
    
    let result;
    
    if (action === 'respondRequest' && requestId) {
      // Handle request-level responses (pre-assignment)
      result = processRequestConfirmation(requestId, rider, response);
    } else if (action === 'respondAssignment' && assignmentId) {
      // Handle assignment-level responses (post-assignment)  
      result = processAssignmentConfirmation(assignmentId, rider, response);
    } else {
      return createSimpleErrorPage('Invalid confirmation parameters.');
    }
    
    // Log the confirmation
    try {
      const message = `📧 Confirmation: ${rider} ${response}d ${requestId || assignmentId}`;
      console.log(message);
      // Try to log to activity if the function exists
      if (typeof logActivity === 'function') {
        logActivity(message);
      }
    } catch (logError) {
      console.error('Failed to log confirmation:', logError);
    }
    
    if (result.success) {
      // Try to notify admin/dispatcher if function exists
      try {
        if (typeof notifyAdminOfConfirmation === 'function') {
          notifyAdminOfConfirmation(rider, response, requestId || assignmentId);
        }
      } catch (notifyError) {
        console.error('Failed to notify admin:', notifyError);
      }
      
      return createSimpleSuccessPage(result.message, {
        rider: rider,
        response: response,
        id: requestId || assignmentId
      });
    } else {
      return createSimpleErrorPage(result.message);
    }
    
  } catch (error) {
    console.error('❌ Public confirmation error:', error);
    return createSimpleErrorPage('System error processing confirmation. Please contact your dispatcher.');
  }
}

/**
 * Handle quick confirmation with token validation
 */
function handleQuickConfirmation(params) {
  try {
    const { token, response } = params;
    
    console.log('🔒 Processing secure confirmation with token');
    
    if (!token || !response) {
      return createSimpleErrorPage('Missing confirmation parameters.');
    }
    
    // Validate the token (if validation function exists)
    let validation;
    try {
      if (typeof validateConfirmationToken === 'function') {
        validation = validateConfirmationToken(token);
        if (!validation.valid) {
          return createSimpleErrorPage(validation.error || 'Invalid confirmation link.');
        }
      } else {
        return createSimpleErrorPage('Secure confirmations not available. Please use the basic confirmation link.');
      }
    } catch (tokenError) {
      console.error('Token validation error:', tokenError);
      return createSimpleErrorPage('Error validating confirmation link.');
    }
    
    const { assignmentId, riderName, requestId } = validation.data;
    
    // Process the confirmation
    const result = processAssignmentConfirmation(assignmentId, riderName, response);
    
    // Clean up the token after use
    try {
      const properties = PropertiesService.getScriptProperties();
      properties.deleteProperty(`confirm_${token}`);
    } catch (cleanupError) {
      console.error('Token cleanup error:', cleanupError);
    }
    
    if (result.success) {
      return createSimpleSuccessPage(result.message, {
        rider: riderName,
        response: response,
        assignmentId: assignmentId,
        requestId: requestId
      });
    } else {
      return createSimpleErrorPage(result.message);
    }
    
  } catch (error) {
    console.error('❌ Quick confirmation error:', error);
    return createSimpleErrorPage('System error processing confirmation.');
  }
}

/**
 * Process request confirmation (pre-assignment)
 */
function processRequestConfirmation(requestId, riderName, response) {
  try {
    console.log('📋 Processing request confirmation:', { requestId, riderName, response });
    
    // Try to find the request (if function exists)
    let request;
    try {
      if (typeof getRequestDetails === 'function') {
        request = getRequestDetails(requestId);
        if (!request) {
          return { success: false, message: 'Request not found' };
        }
      }
    } catch (requestError) {
      console.error('Error finding request:', requestError);
      request = { eventDate: 'Unknown', startTime: 'Unknown' }; // Fallback
    }
    
    // Log the response to a tracking sheet
    try {
      const responseSheet = getOrCreateSimpleResponseSheet();
      const now = new Date();
      
      responseSheet.appendRow([
        now,
        'REQUEST',
        requestId,
        '',  // No assignment ID yet
        riderName,
        response.toUpperCase(),
        'Email Confirmation',
        request.eventDate || 'Unknown',
        request.startTime || 'Unknown'
      ]);
    } catch (logError) {
      console.error('Error logging response:', logError);
      // Continue anyway - don't fail the confirmation
    }
    
    console.log('✅ Request confirmation processed successfully');
    
    return {
      success: true,
      message: `Thank you ${riderName}! Your ${response} has been recorded for request ${requestId}.`
    };
    
  } catch (error) {
    console.error('❌ Request confirmation error:', error);
    return { success: false, message: 'Error processing request confirmation' };
  }
}

/**
 * Process assignment confirmation (post-assignment)
 */
function processAssignmentConfirmation(assignmentId, riderName, response) {
  try {
    console.log('📝 Processing assignment confirmation:', { assignmentId, riderName, response });
    
    // Try to find and update the assignment
    let assignment;
    try {
      // Try to update assignment status if functions exist
      if (typeof getAssignmentsData === 'function' && typeof CONFIG !== 'undefined') {
        const assignmentsData = getAssignmentsData();
        const assignmentRow = assignmentsData.data.find(row => 
          getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.assignmentId) === assignmentId
        );
        
        if (assignmentRow) {
          const rowIndex = assignmentsData.data.indexOf(assignmentRow) + 2; // +2 for header row and 0-based index
          const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Assignments');
          
          // Update status
          const statusCol = assignmentsData.columnMap[CONFIG.columns.assignments.status] + 1;
          const newStatus = response.toLowerCase() === 'confirm' || response.toLowerCase() === 'accept' 
            ? 'Confirmed' : 'Declined';
          
          sheet.getRange(rowIndex, statusCol).setValue(newStatus);
          
          // Get assignment details for response
          assignment = {
            requestId: getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.requestId),
            eventDate: getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate),
            startTime: getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.startTime)
          };
        }
      }
    } catch (updateError) {
      console.error('Error updating assignment:', updateError);
      // Continue anyway - we'll still log the response
      assignment = { requestId: 'Unknown', eventDate: 'Unknown', startTime: 'Unknown' };
    }
    
    // Log the response
    try {
      const responseSheet = getOrCreateSimpleResponseSheet();
      const now = new Date();
      
      responseSheet.appendRow([
        now,
        'ASSIGNMENT',
        assignment?.requestId || 'Unknown',
        assignmentId,
        riderName,
        response.toUpperCase(),
        'Email Confirmation',
        assignment?.eventDate || 'Unknown',
        assignment?.startTime || 'Unknown'
      ]);
    } catch (logError) {
      console.error('Error logging response:', logError);
      // Continue anyway
    }
    
    console.log('✅ Assignment confirmation processed successfully');
    
    return {
      success: true,
      message: `Thank you ${riderName}! Your ${response} has been recorded for assignment ${assignmentId}.`
    };
    
  } catch (error) {
    console.error('❌ Assignment confirmation error:', error);
    return { success: false, message: 'Error processing assignment confirmation' };
  }
}

/**
 * Create or get the response tracking sheet (simplified version)
 */
function getOrCreateSimpleResponseSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName('Rider Responses');
  
  if (!sheet) {
    console.log('📊 Creating new Rider Responses sheet');
    sheet = spreadsheet.insertSheet('Rider Responses');
    
    // Add headers
    const headers = [
      'Timestamp',
      'Type', 
      'Request ID',
      'Assignment ID',
      'Rider Name',
      'Response',
      'Method',
      'Event Date',
      'Event Time'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

/**
 * Create simple success page
 */
function createSimpleSuccessPage(message, details = {}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmation Received</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: #f0f8ff;
          text-align: center;
        }
        .container {
          max-width: 500px;
          margin: 50px auto;
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .success-icon {
          font-size: 4rem;
          color: #4CAF50;
          margin-bottom: 20px;
        }
        h1 {
          color: #4CAF50;
          margin-bottom: 20px;
        }
        .message {
          font-size: 1.1rem;
          color: #333;
          margin-bottom: 30px;
          line-height: 1.5;
        }
        .details {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: left;
        }
        .detail-row {
          margin: 8px 0;
        }
        .detail-label {
          font-weight: bold;
          color: #666;
        }
        .footer {
          margin-top: 30px;
          color: #888;
          font-size: 0.9rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-icon">✅</div>
        <h1>Confirmation Received!</h1>
        <div class="message">${message}</div>
        
        ${details.rider ? `
          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Rider:</span> ${details.rider}
            </div>
            <div class="detail-row">
              <span class="detail-label">Response:</span> <strong>${details.response ? details.response.toUpperCase() : 'N/A'}</strong>
            </div>
            <div class="detail-row">
              <span class="detail-label">ID:</span> ${details.id || details.assignmentId || 'N/A'}
            </div>
            <div class="detail-row">
              <span class="detail-label">Time:</span> ${new Date().toLocaleString()}
            </div>
          </div>
        ` : ''}
        
        <div class="footer">
          Your response has been recorded and the dispatcher has been notified.
        </div>
      </div>
    </body>
    </html>
  `;
  
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Create simple error page
 */
function createSimpleErrorPage(errorMessage) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmation Error</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: #fff5f5;
          text-align: center;
        }
        .container {
          max-width: 500px;
          margin: 50px auto;
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .error-icon {
          font-size: 4rem;
          color: #f44336;
          margin-bottom: 20px;
        }
        h1 {
          color: #f44336;
          margin-bottom: 20px;
        }
        .message {
          font-size: 1.1rem;
          color: #333;
          margin-bottom: 30px;
          line-height: 1.5;
        }
        .footer {
          margin-top: 30px;
          color: #888;
          font-size: 0.9rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="error-icon">❌</div>
        <h1>Confirmation Error</h1>
        <div class="message">${errorMessage}</div>
        <div class="footer">
          Please contact your dispatcher if you continue to have issues.
        </div>
      </div>
    </body>
    </html>
  `;
  
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Simple notification function
 */
function notifyAdminOfConfirmation(rider, response, id) {
  try {
    console.log('📨 Attempting to notify admin of confirmation:', { rider, response, id });
    
    // Try to get admin emails if function exists
    let adminEmails = [];
    try {
      if (typeof getAdminUsers === 'function') {
        adminEmails = getAdminUsers();
      }
    } catch (adminError) {
      console.error('Could not get admin emails:', adminError);
      return;
    }
    
    if (!adminEmails || adminEmails.length === 0) {
      console.log('⚠️ No admin emails found for notification');
      return;
    }
    
    const subject = `🏍️ Rider Confirmation: ${rider} ${response}d ${id}`;
    const body = `
Rider confirmation received:

Rider: ${rider}
Response: ${response.toUpperCase()}
ID: ${id}
Time: ${new Date().toLocaleString()}

--
Motorcycle Escort Management System
    `;
    
    adminEmails.forEach(email => {
      if (email && email.trim()) {
        try {
          GmailApp.sendEmail(email, subject, body);
          console.log('✅ Notification sent to admin:', email);
        } catch (emailError) {
          console.error(`❌ Failed to notify admin ${email}:`, emailError);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error notifying admin of confirmation:', error);
  }
}
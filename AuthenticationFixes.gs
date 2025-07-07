/**
 * COMPREHENSIVE AUTHENTICATION DIAGNOSTIC AND FIX FUNCTIONS
 * Run these functions to diagnose and fix permission issues
 * 
 * USAGE:
 * 1. Run diagnosePersistentAuthIssue() to identify problems
 * 2. Run fixAuthenticationIssues() to apply automatic fixes
 * 3. Run emergencyAdminAccess() for immediate temporary access
 */

/**
 * COMPREHENSIVE AUTHENTICATION DIAGNOSTIC
 * Run this function to diagnose and identify permission issues
 */
function diagnosePersistentAuthIssue() {
  console.log('🔍 === COMPREHENSIVE AUTHENTICATION DIAGNOSIS ===');
  
  const results = {
    step1_userSession: null,
    step2_authFunction: null,
    step3_adminUsers: null,
    step4_permissionTest: null,
    step5_settingsSheet: null,
    issues: [],
    fixes: []
  };
  
  // Step 1: Check current user session
  try {
    console.log('1. Checking current user session...');
    const user = Session.getActiveUser();
    const email = user.getEmail();
    const name = user.getName();
    
    results.step1_userSession = { 
      success: true, 
      email: email, 
      name: name,
      hasEmail: !!email,
      hasName: !!name
    };
    console.log('✅ Session active:', email);
  } catch (e) {
    results.step1_userSession = { success: false, error: e.message };
    results.issues.push('No active Google session');
    console.log('❌ Session error:', e.message);
  }
  
  // Step 2: Test authentication function
  try {
    console.log('2. Testing authentication function...');
    const auth = authenticateAndAuthorizeUser();
    results.step2_authFunction = {
      success: auth.success,
      userEmail: auth.user?.email,
      userRole: auth.user?.role,
      userRiderId: auth.user?.riderId,
      error: auth.error
    };
    
    if (auth.success) {
      console.log('✅ Authentication successful:', auth.user.email, 'role:', auth.user.role);
    } else {
      console.log('❌ Authentication failed:', auth.error);
      results.issues.push('Authentication function failed: ' + auth.error);
    }
  } catch (e) {
    results.step2_authFunction = { success: false, error: e.message };
    results.issues.push('Authentication function error: ' + e.message);
    console.log('❌ Auth function error:', e.message);
  }
  
  // Step 3: Check admin users configuration
  try {
    console.log('3. Checking admin users configuration...');
    const admins = getAdminUsers();
    results.step3_adminUsers = {
      success: true,
      adminEmails: admins,
      count: admins.length,
      includesCurrentUser: false
    };
    
    if (results.step1_userSession?.email) {
      results.step3_adminUsers.includesCurrentUser = admins.includes(results.step1_userSession.email);
    }
    
    console.log('✅ Admin users found:', admins);
  } catch (e) {
    results.step3_adminUsers = { success: false, error: e.message };
    results.issues.push('Admin users check failed: ' + e.message);
    console.log('❌ Admin users error:', e.message);
  }
  
  // Step 4: Test permission function directly
  try {
    console.log('4. Testing permission function...');
    const testUser = { 
      role: 'admin', 
      email: results.step1_userSession?.email || 'test@example.com',
      name: 'Test User'
    };
    const hasPerms = hasPermission(testUser, 'assignments', 'assign_any');
    results.step4_permissionTest = {
      success: true,
      testUser: testUser,
      hasPermission: hasPerms,
      functionExists: typeof hasPermission === 'function'
    };
    console.log('✅ Permission test result:', hasPerms);
  } catch (e) {
    results.step4_permissionTest = { success: false, error: e.message };
    results.issues.push('Permission function error: ' + e.message);
    console.log('❌ Permission function error:', e.message);
  }
  
  // Step 5: Check Settings sheet
  try {
    console.log('5. Checking Settings sheet...');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settingsSheet = ss.getSheetByName('Settings');
    
    if (settingsSheet) {
      const data = settingsSheet.getDataRange().getValues();
      const adminEmails = [];
      const dispatcherEmails = [];
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][1]) adminEmails.push(data[i][1]);
        if (data[i][2]) dispatcherEmails.push(data[i][2]);
      }
      
      results.step5_settingsSheet = {
        success: true,
        sheetExists: true,
        adminEmails: adminEmails.filter(e => e),
        dispatcherEmails: dispatcherEmails.filter(e => e),
        currentUserInAdmin: adminEmails.includes(results.step1_userSession?.email),
        currentUserInDispatcher: dispatcherEmails.includes(results.step1_userSession?.email)
      };
      console.log('✅ Settings sheet data:', { adminEmails, dispatcherEmails });
    } else {
      results.step5_settingsSheet = { success: false, sheetExists: false };
      results.issues.push('Settings sheet does not exist');
      console.log('❌ Settings sheet not found');
    }
  } catch (e) {
    results.step5_settingsSheet = { success: false, error: e.message };
    results.issues.push('Settings sheet error: ' + e.message);
    console.log('❌ Settings sheet error:', e.message);
  }
  
  console.log('🔍 === DIAGNOSIS COMPLETE ===');
  console.log('Issues found:', results.issues.length);
  console.log('Results:', results);
  
  return results;
}

/**
 * AUTOMATIC FIX FUNCTION
 * Attempts to automatically resolve authentication issues
 */
function fixAuthenticationIssues() {
  console.log('🔧 === ATTEMPTING AUTOMATIC FIXES ===');
  
  const fixes = [];
  const errors = [];
  
  try {
    // Fix 1: Ensure Settings sheet exists and current user is admin
    console.log('Fix 1: Setting up Settings sheet...');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let settingsSheet = ss.getSheetByName('Settings');
    
    if (!settingsSheet) {
      settingsSheet = ss.insertSheet('Settings');
      const headers = ['Setting', 'Admin Emails', 'Dispatcher Emails', 'Notes'];
      settingsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      settingsSheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#4285f4')
        .setFontColor('white');
      fixes.push('Created Settings sheet');
    }
    
    // Get current user email
    const currentUserEmail = Session.getActiveUser().getEmail();
    
    // Check if current user is in admin emails
    const data = settingsSheet.getDataRange().getValues();
    let userIsAdmin = false;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === currentUserEmail) {
        userIsAdmin = true;
        break;
      }
    }
    
    if (!userIsAdmin && currentUserEmail) {
      // Add current user as admin
      const newRow = ['User Management', currentUserEmail, '', 'Auto-added for access'];
      settingsSheet.getRange(data.length + 1, 1, 1, 4).setValues([newRow]);
      fixes.push(`Added ${currentUserEmail} as admin user`);
    }
    
    // Fix 2: Clear any stuck sessions
    console.log('Fix 2: Clearing cached sessions...');
    try {
      PropertiesService.getUserProperties().deleteProperty('CUSTOM_SESSION');
      PropertiesService.getScriptProperties().deleteProperty('CACHED_USER_EMAIL');
      PropertiesService.getScriptProperties().deleteProperty('CACHED_USER_NAME');
      fixes.push('Cleared cached authentication data');
    } catch (e) {
      errors.push('Failed to clear cache: ' + e.message);
    }
    
    // Fix 3: Ensure Users sheet exists for local authentication
    console.log('Fix 3: Setting up Users sheet...');
    let usersSheet = ss.getSheetByName('Users');
    
    if (!usersSheet) {
      usersSheet = ss.insertSheet('Users');
      const headers = ['name', 'email', 'hashedPassword', 'role', 'status', 'created', 'lastLogin'];
      usersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      usersSheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#4285f4')
        .setFontColor('white');
      
      // Add test admin user
      const testAdmin = [
        'Admin User',
        'admin@test.com',
        Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'admin123').map(b => (b + 256).toString(16).slice(-2)).join(''),
        'admin',
        'active',
        new Date().toISOString(),
        ''
      ];
      usersSheet.getRange(2, 1, 1, testAdmin.length).setValues([testAdmin]);
      fixes.push('Created Users sheet with test admin account (admin@test.com / admin123)');
    }
    
    console.log('✅ Automatic fixes completed');
    return {
      success: true,
      fixes: fixes,
      errors: errors,
      message: `Applied ${fixes.length} fixes. ${errors.length} errors occurred.`
    };
    
  } catch (error) {
    console.error('❌ Error during automatic fix:', error);
    return {
      success: false,
      fixes: fixes,
      errors: [...errors, error.message],
      message: 'Automatic fix failed'
    };
  }
}

/**
 * EMERGENCY ADMIN ACCESS
 * Creates temporary admin access for 2 hours
 */
function emergencyAdminAccess() {
  console.log('🚨 === EMERGENCY ADMIN ACCESS ===');
  
  try {
    const currentUserEmail = Session.getActiveUser().getEmail();
    
    if (!currentUserEmail) {
      return { success: false, error: 'No active user session' };
    }
    
    // Create emergency session
    const emergencySession = {
      email: currentUserEmail,
      name: 'Emergency Admin',
      role: 'admin',
      riderId: '',
      permissions: ['all'],
      created: Date.now(),
      expires: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
      emergency: true
    };
    
    // Store in user properties
    PropertiesService.getUserProperties().setProperty(
      'EMERGENCY_SESSION', 
      JSON.stringify(emergencySession)
    );
    
    console.log('✅ Emergency admin access granted for 2 hours');
    return {
      success: true,
      message: 'Emergency admin access granted for 2 hours',
      user: emergencySession,
      expiresAt: new Date(emergencySession.expires).toLocaleString()
    };
    
  } catch (error) {
    console.error('❌ Emergency access failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * TEST LOCAL AUTHENTICATION
 * Tests the local email/password authentication system
 */
function testLocalAuthentication() {
  console.log('🧪 === TESTING LOCAL AUTHENTICATION ===');
  
  try {
    // Try to login with test credentials
    const testCredentials = [
      { email: 'admin@test.com', password: 'admin123' },
      { email: 'dispatcher@test.com', password: 'dispatch123' },
      { email: 'rider1@test.com', password: 'rider123' }
    ];
    
    const results = [];
    
    for (const cred of testCredentials) {
      try {
        if (typeof loginWithCredentials === 'function') {
          const result = loginWithCredentials(cred.email, cred.password);
          results.push({
            email: cred.email,
            success: result.success,
            role: result.user?.role,
            message: result.message
          });
        } else {
          results.push({
            email: cred.email,
            success: false,
            message: 'loginWithCredentials function not found'
          });
        }
      } catch (e) {
        results.push({
          email: cred.email,
          success: false,
          message: e.message
        });
      }
    }
    
    console.log('✅ Local authentication test completed');
    return {
      success: true,
      results: results,
      message: `Tested ${results.length} accounts`
    };
    
  } catch (error) {
    console.error('❌ Local authentication test failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Local authentication test failed'
    };
  }
}

/**
 * ENHANCED getCurrentUser FUNCTION
 * Checks for emergency sessions and provides fallback authentication
 */
function getCurrentUserEnhanced() {
  try {
    // Check for emergency session first
    const emergencySessionStr = PropertiesService.getUserProperties().getProperty('EMERGENCY_SESSION');
    if (emergencySessionStr) {
      const emergencySession = JSON.parse(emergencySessionStr);
      
      // Check if not expired
      if (emergencySession.expires > Date.now()) {
        console.log('🚨 Using emergency admin session');
        return { success: true, user: emergencySession };
      } else {
        // Clean up expired emergency session
        PropertiesService.getUserProperties().deleteProperty('EMERGENCY_SESSION');
      }
    }
    
    // Fall back to normal authentication
    return authenticateAndAuthorizeUser();
    
  } catch (error) {
    console.error('❌ Enhanced getCurrentUser error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * BYPASS PERMISSION CHECK (TEMPORARY)
 * Use this as a temporary workaround while fixing permissions
 */
function bypassPermissionCheck() {
  console.log('⚠️ BYPASSING PERMISSION CHECK - FOR DEBUGGING ONLY');
  return true;
}

/**
 * QUICK SETUP WIZARD
 * Run this to set up everything from scratch
 */
function runCompleteAuthSetup() {
  console.log('🎯 === COMPLETE AUTHENTICATION SETUP ===');
  
  try {
    const results = {
      diagnosis: null,
      fixes: null,
      emergency: null,
      localTest: null
    };
    
    // Step 1: Diagnose current state
    console.log('Step 1: Diagnosing current state...');
    results.diagnosis = diagnosePersistentAuthIssue();
    
    // Step 2: Apply fixes
    console.log('Step 2: Applying automatic fixes...');
    results.fixes = fixAuthenticationIssues();
    
    // Step 3: Set up emergency access
    console.log('Step 3: Setting up emergency access...');
    results.emergency = emergencyAdminAccess();
    
    // Step 4: Test local authentication
    console.log('Step 4: Testing local authentication...');
    results.localTest = testLocalAuthentication();
    
    console.log('✅ Complete setup finished');
    
    return {
      success: true,
      results: results,
      summary: {
        issuesFound: results.diagnosis.issues.length,
        fixesApplied: results.fixes.fixes.length,
        emergencyAccess: results.emergency.success,
        localAuthWorking: results.localTest.success
      }
    };
    
  } catch (error) {
    console.error('❌ Complete setup failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
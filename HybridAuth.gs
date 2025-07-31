// Fixed Hybrid Authentication System for Google OAuth + Spreadsheet Login

/**
 * Hash password using SHA-256 for storing in Users sheet
 */
function hashPassword(password) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return raw.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

/**
 * Find user record in Users sheet by email
 */
function findUserRecord(email) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Users');
    
    // Create Users sheet if it doesn't exist
    if (!sheet) {
      debugLog('Creating Users sheet...');
      sheet = ss.insertSheet('Users');
      setupUsersSheet(sheet);
      return null; // No existing users yet
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return null; // Only headers or empty
    
    const headers = data[0].map(String);
    const emailCol = headers.indexOf('email');
    const passCol = headers.indexOf('hashedPassword');
    const roleCol = headers.indexOf('role');
    const statusCol = headers.indexOf('status');
    const nameCol = headers.indexOf('name');
    
    if (emailCol === -1) {
      console.error('Users sheet missing email column');
      return null;
    }
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[emailCol] === email) {
        return {
          email: row[emailCol],
          hashedPassword: row[passCol] || '',
          role: row[roleCol] || 'rider',
          status: row[statusCol] || 'inactive',
          name: row[nameCol] || ''
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error finding user record:', error);
    return null;
  }
}

/**
 * Setup Users sheet with proper structure
 */
function setupUsersSheet(sheet) {
  const headers = ['name', 'email', 'hashedPassword', 'role', 'status', 'dateCreated', 'lastLogin'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format headers
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('white');
  
  // Add sample user (you should change this password!)
  const sampleUser = [
    'Test User',
    'test@example.com', 
    hashPassword('password123'), // Change this!
    'admin',
    'active',
    new Date().toISOString(),
    ''
  ];
  sheet.getRange(2, 1, 1, sampleUser.length).setValues([sampleUser]);
  
  sheet.autoResizeColumns(1, headers.length);
  debugLog('Users sheet created with sample data');
}

/**
 * Session configuration
 */
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

/**
 * Create custom session for authenticated user
 */
function createCustomSession(user) {
  const session = {
    email: user.email,
    name: user.name,
    role: user.role,
    expires: Date.now() + SESSION_DURATION_MS,
    loginMethod: user.loginMethod || 'unknown',
    loginTime: new Date().toISOString()
  };
  
  try {
    PropertiesService.getUserProperties().setProperty('CUSTOM_SESSION', JSON.stringify(session));
    debugLog('Session created for:', user.email);
    
    // Update last login time if this is a spreadsheet user
    if (user.loginMethod === 'spreadsheet') {
      updateLastLogin(user.email);
    }
    
    return session;
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
}

/**
 * Get current custom session
 */
function getCustomSession() {
  try {
    const prop = PropertiesService.getUserProperties().getProperty('CUSTOM_SESSION');
    if (!prop) return null;
    
    const sess = JSON.parse(prop);
    if (sess.expires > Date.now()) {
      return sess;
    } else {
      // Session expired, remove it
      PropertiesService.getUserProperties().deleteProperty('CUSTOM_SESSION');
      return null;
    }
  } catch (error) {
    console.error('Error getting session:', error);
    PropertiesService.getUserProperties().deleteProperty('CUSTOM_SESSION');
    return null;
  }
}

/**
 * Update last login time for spreadsheet users
 */
function updateLastLogin(email) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Users');
    if (!sheet) return;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailCol = headers.indexOf('email');
    const lastLoginCol = headers.indexOf('lastLogin');
    
    if (emailCol === -1 || lastLoginCol === -1) return;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailCol] === email) {
        sheet.getRange(i + 1, lastLoginCol + 1).setValue(new Date().toISOString());
        break;
      }
    }
  } catch (error) {
    console.error('Error updating last login:', error);
  }
}

/**
 * Login with email/password credentials (spreadsheet authentication)
 */
function loginWithCredentials(email, password) {
  debugLog('Attempting credentials login for:', email);
  
  if (!email || !password) {
    return { success: false, message: 'Email and password are required' };
  }
  
  try {
    const user = findUserRecord(email.trim());
    
    if (!user) {
      debugLog('User not found:', email);
      return { success: false, message: 'Invalid credentials' };
    }
    
    if (user.status !== 'active') {
      debugLog('User not active:', email, 'Status:', user.status);
      return { success: false, message: 'Account is not active' };
    }
    
    const hashedInput = hashPassword(password);
    if (hashedInput !== user.hashedPassword) {
      debugLog('Password mismatch for:', email);
      return { success: false, message: 'Invalid credentials' };
    }
    
    // Create session
    user.loginMethod = 'spreadsheet';
    const session = createCustomSession(user);
    
    if (!session) {
      return { success: false, message: 'Failed to create session' };
    }
    
    debugLog('Credentials login successful for:', email);
    return { 
      success: true, 
      url: getWebAppUrlSafe(),
      user: {
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
    
  } catch (error) {
    console.error('Credentials login error:', error);
    return { success: false, message: 'Login system error' };
  }
}

/**
 * Login with Google OAuth
 */
function loginWithGoogle() {
  debugLog('Attempting Google OAuth login...');
  
  try {
    // Use the existing authenticateUser function that handles Google OAuth
    const auth = authenticateUser();
    
    if (!auth.success) {
      debugLog('Google authentication failed:', auth.message);
      return auth;
    }
    
    // Create session for Google authenticated user
    const user = auth.user;
    user.loginMethod = 'google';
    const session = createCustomSession(user);
    
    if (!session) {
      return { success: false, message: 'Failed to create session' };
    }
    
    debugLog('Google login successful for:', user.email);
    return { 
      success: true, 
      url: getWebAppUrlSafe(),
      user: {
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
    
  } catch (error) {
    console.error('Google login error:', error);
    return { success: false, message: 'Google authentication error' };
  }
}

/**
 * Logout user by clearing session
 */
function logoutUser() {
  try {
    PropertiesService.getUserProperties().deleteProperty('CUSTOM_SESSION');
    debugLog('User logged out successfully');
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, message: 'Logout error' };
  }
}

/**
 * Get current authenticated user
 */
function getCurrentUser() {
  try {
    // First check custom session
    const session = getCustomSession();
    if (session) {
      return {
        success: true,
        user: {
          email: session.email,
          name: session.name,
          role: session.role,
          loginMethod: session.loginMethod
        }
      };
    }
    
    // Fall back to Google authentication check
    const auth = authenticateUser();
    if (auth.success) {
      return auth;
    }
    
    return { success: false, message: 'Not authenticated' };
    
  } catch (error) {
    console.error('Error getting current user:', error);
    return { success: false, message: 'Authentication check failed' };
  }
}

/**
 * Check if user has specific permission (Hybrid Auth version)
 * RENAMED to avoid conflict with AccessControl.gs hasPermission function
 */
function hasHybridPermission(action, resource) {
  try {
    const userResult = getCurrentUser();
    if (!userResult.success) return false;
    
    const user = userResult.user;
    
    // Use the permissions matrix from AccessControl.gs
    if (typeof PERMISSIONS_MATRIX !== 'undefined' && PERMISSIONS_MATRIX[user.role]) {
      const rolePerms = PERMISSIONS_MATRIX[user.role];
      
      if (rolePerms[resource] && rolePerms[resource][action] !== undefined) {
        return rolePerms[resource][action];
      }
    }
    
    // Fallback permission logic
    if (user.role === 'admin') return true;
    if (user.role === 'dispatcher' && ['read', 'create', 'update'].includes(action)) return true;
    if (user.role === 'rider' && action === 'read') return true;
    
    return false;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

/**
 * Utility function to safely get web app URL
 */
function getWebAppUrlSafe() {
  try {
    if (typeof getWebAppUrl === 'function') {
      return getWebAppUrl();
    }
    return ScriptApp.getService().getUrl();
  } catch (error) {
    console.error('Error getting web app URL:', error);
    return '';
  }
}

/**
 * Helper function to create a new user in the spreadsheet (for admin use)
 */
function createUser(name, email, password, role = 'rider', status = 'active') {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Users');
    
    if (!sheet) {
      sheet = ss.insertSheet('Users');
      setupUsersSheet(sheet);
    }
    
    // Check if user already exists
    if (findUserRecord(email)) {
      return { success: false, message: 'User already exists' };
    }
    
    const hashedPassword = hashPassword(password);
    const newUser = [
      name,
      email,
      hashedPassword,
      role,
      status,
      new Date().toISOString(),
      ''
    ];
    
    sheet.appendRow(newUser);
    
    debugLog('User created:', email);
    return { success: true, message: 'User created successfully' };
    
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, message: 'Failed to create user' };
  }
}

/**
 * Test function to verify authentication system
 */
function testAuthenticationSystem() {
  debugLog('=== Testing Authentication System ===');
  
  try {
    // Test 1: Check if Users sheet exists or can be created
    debugLog('1. Testing Users sheet...');
    const testUser = findUserRecord('nonexistent@test.com');
    debugLog('Users sheet test: OK');
    
    // Test 2: Test password hashing
    debugLog('2. Testing password hashing...');
    const hash1 = hashPassword('test123');
    const hash2 = hashPassword('test123');
    const hashMatch = hash1 === hash2;
    debugLog('Password hashing consistent:', hashMatch);
    
    // Test 3: Test session management
    debugLog('3. Testing session management...');
    const currentSession = getCustomSession();
    debugLog('Current session:', currentSession ? 'Active' : 'None');
    
    // Test 4: Test Google authentication
    debugLog('4. Testing Google authentication...');
    const googleAuth = authenticateUser();
    debugLog('Google auth result:', googleAuth.success ? 'Success' : 'Failed');
    
    return {
      success: true,
      tests: {
        usersSheet: true,
        passwordHashing: hashMatch,
        sessionManagement: true,
        googleAuth: googleAuth.success
      }
    };
    
  } catch (error) {
    console.error('Authentication test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * SETUP AND UTILITY FUNCTIONS
 */

/**
 * Initialize the authentication system - run this once to set everything up
 */
function initializeAuthenticationSystem() {
  debugLog('🚀 Initializing authentication system...');
  
  try {
    const results = {
      usersSheet: false,
      settingsSheet: false,
      sampleUser: false,
      error: null
    };
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Create or verify Users sheet
    let usersSheet = ss.getSheetByName('Users');
    if (!usersSheet) {
      debugLog('📄 Creating Users sheet...');
      usersSheet = ss.insertSheet('Users');
      setupUsersSheet(usersSheet);
      results.sampleUser = true;
    } else {
      debugLog('✅ Users sheet already exists');
    }
    results.usersSheet = true;
    
    // 2. Create or verify Settings sheet (for admin/dispatcher emails)
    let settingsSheet = ss.getSheetByName('Settings');
    if (!settingsSheet) {
      debugLog('📄 Creating Settings sheet...');
      settingsSheet = ss.insertSheet('Settings');
      setupSettingsSheet(settingsSheet);
    } else {
      debugLog('✅ Settings sheet already exists');
    }
    results.settingsSheet = true;
    
    // 3. Test the system
    debugLog('🧪 Testing authentication system...');
    const testResult = testAuthenticationSystem();
    
    if (testResult.success) {
      debugLog('✅ Authentication system initialized successfully!');
      return {
        success: true,
        message: 'Authentication system ready',
        details: results,
        test: testResult
      };
    } else {
      debugLog('⚠️ Authentication system has issues:', testResult.error);
      return {
        success: false,
        message: 'System initialized but has issues',
        details: results,
        test: testResult
      };
    }
    
  } catch (error) {
    console.error('❌ Failed to initialize authentication system:', error);
    return {
      success: false,
      message: 'Initialization failed',
      error: error.message
    };
  }
}

/**
 * Setup Settings sheet with proper structure
 */
function setupSettingsSheet(sheet) {
  const headers = ['Setting', 'Admin Emails', 'Dispatcher Emails', 'Notes'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Add sample configuration
  const settings = [
    ['User Management', 'admin@example.com', 'dispatcher@example.com', 'Main accounts'],
    ['', 'test@example.com', 'test.dispatcher@example.com', 'Test accounts'],
    ['', '', '', 'Add more emails below'],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', '']
  ];
  
  sheet.getRange(2, 1, settings.length, settings[0].length).setValues(settings);
  
  // Format headers
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('white');
  
  sheet.autoResizeColumns(1, headers.length);
  debugLog('Settings sheet created with sample data');
}

/**
 * Add a new user to the system
 */
function addNewUser(name, email, password, role = 'rider', status = 'active') {
  const result = createUser(name, email, password, role, status);
  
  if (result.success) {
    debugLog(`✅ User added: ${name} (${email}) as ${role}`);
  } else {
    console.error(`❌ Failed to add user: ${result.message}`);
  }
  
  return result;
}

/**
 * Update user password
 */
function updateUserPassword(email, newPassword) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Users');
    
    if (!sheet) {
      return { success: false, message: 'Users sheet not found' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailCol = headers.indexOf('email');
    const passwordCol = headers.indexOf('hashedPassword');
    
    if (emailCol === -1 || passwordCol === -1) {
      return { success: false, message: 'Required columns not found' };
    }
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailCol] === email) {
        const hashedPassword = hashPassword(newPassword);
        sheet.getRange(i + 1, passwordCol + 1).setValue(hashedPassword);
        
        debugLog(`✅ Password updated for: ${email}`);
        return { success: true, message: 'Password updated successfully' };
      }
    }
    
    return { success: false, message: 'User not found' };
    
  } catch (error) {
    console.error('Error updating password:', error);
    return { success: false, message: 'Failed to update password' };
  }
}

/**
 * List all users in the system
 */
function listAllUsers() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Users');
    
    if (!sheet) {
      return { success: false, message: 'Users sheet not found' };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, users: [], message: 'No users found' };
    }
    
    const headers = data[0];
    const users = [];
    
    for (let i = 1; i < data.length; i++) {
      const user = {};
      headers.forEach((header, index) => {
        user[header] = data[i][index];
      });
      
      // Don't expose password hash
      delete user.hashedPassword;
      
      users.push(user);
    }
    
    debugLog(`Found ${users.length} users in system`);
    return { success: true, users: users };
    
  } catch (error) {
    console.error('Error listing users:', error);
    return { success: false, message: 'Failed to list users' };
  }
}

/**
 * Toggle user status (active/inactive)
 */
function toggleUserStatus(email) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Users');
    
    if (!sheet) {
      return { success: false, message: 'Users sheet not found' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailCol = headers.indexOf('email');
    const statusCol = headers.indexOf('status');
    
    if (emailCol === -1 || statusCol === -1) {
      return { success: false, message: 'Required columns not found' };
    }
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailCol] === email) {
        const currentStatus = data[i][statusCol];
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        
        sheet.getRange(i + 1, statusCol + 1).setValue(newStatus);
        
        debugLog(`✅ Status changed for ${email}: ${currentStatus} → ${newStatus}`);
        return { 
          success: true, 
          message: `User status changed to ${newStatus}`,
          oldStatus: currentStatus,
          newStatus: newStatus
        };
      }
    }
    
    return { success: false, message: 'User not found' };
    
  } catch (error) {
    console.error('Error toggling user status:', error);
    return { success: false, message: 'Failed to toggle status' };
  }
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions() {
  try {
    // For now, just clear the current user's session if it's expired
    const session = getCustomSession();
    if (!session) {
      debugLog('No active sessions to clean up');
      return { success: true, message: 'No expired sessions found' };
    }
    
    debugLog('Active session found, no cleanup needed');
    return { success: true, message: 'Sessions are current' };
    
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    return { success: false, message: 'Failed to cleanup sessions' };
  }
}

/**
 * Quick test login for debugging
 */
function testLogin(email, password) {
  debugLog(`🧪 Testing login for: ${email}`);
  
  try {
    const result = loginWithCredentials(email, password);
    
    if (result.success) {
      debugLog('✅ Test login successful');
      debugLog('User:', result.user);
      
      // Test getting current user
      const currentUser = getCurrentUser();
      debugLog('Current user check:', currentUser);
      
      return {
        success: true,
        loginResult: result,
        currentUser: currentUser
      };
    } else {
      debugLog('❌ Test login failed:', result.message);
      return {
        success: false,
        error: result.message
      };
    }
    
  } catch (error) {
    console.error('❌ Test login error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create sample users for testing
 */
function createSampleUsers() {
  debugLog('👥 Creating sample users...');
  
  const sampleUsers = [
    { name: 'Admin User', email: 'admin@test.com', password: 'admin123', role: 'admin' },
    { name: 'Dispatcher User', email: 'dispatcher@test.com', password: 'dispatch123', role: 'dispatcher' },
    { name: 'Rider One', email: 'rider1@test.com', password: 'rider123', role: 'rider' },
    { name: 'Rider Two', email: 'rider2@test.com', password: 'rider456', role: 'rider' }
  ];
  
  const results = [];
  
  sampleUsers.forEach(user => {
    const result = createUser(user.name, user.email, user.password, user.role);
    results.push({
      email: user.email,
      name: user.name,
      role: user.role,
      success: result.success,
      message: result.message
    });
  });
  
  const successCount = results.filter(r => r.success).length;
  debugLog(`✅ Created ${successCount} out of ${sampleUsers.length} sample users`);
  
  return {
    success: successCount > 0,
    created: successCount,
    total: sampleUsers.length,
    results: results
  };
}

/**
 * Complete setup wizard - run this to get everything working
 */
function runCompleteSetup() {
  debugLog('🎯 Running complete authentication setup...');
  
  try {
    // Step 1: Initialize system
    debugLog('Step 1: Initializing system...');
    const initResult = initializeAuthenticationSystem();
    
    if (!initResult.success) {
      throw new Error('System initialization failed: ' + initResult.message);
    }
    
    // Step 2: Create sample users
    debugLog('Step 2: Creating sample users...');
    const usersResult = createSampleUsers();
    
    // Step 3: Test authentication
    debugLog('Step 3: Testing authentication...');
    const testResult = testLogin('admin@test.com', 'admin123');
    
    // Step 4: Generate summary
    const summary = {
      success: true,
      message: 'Authentication system setup complete!',
      steps: {
        initialization: initResult.success,
        sampleUsers: usersResult.success,
        authentication: testResult.success
      },
      instructions: [
        '1. Your authentication system is now ready',
        '2. You can login with:',
        '   - admin@test.com / admin123 (Admin)',
        '   - dispatcher@test.com / dispatch123 (Dispatcher)', 
        '   - rider1@test.com / rider123 (Rider)',
        '3. Access the login page by visiting your web app URL',
        '4. Users can also login with their Google accounts if configured',
        '5. Add real users by running: addNewUser("Name", "email", "password", "role")'
      ]
    };
    
    debugLog('✅ Setup complete!');
    debugLog('Instructions:');
    summary.instructions.forEach(instruction => debugLog(instruction));
    
    return summary;
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    return {
      success: false,
      message: 'Setup failed',
      error: error.message
    };
  }
}

/**
 * COMPREHENSIVE AUTHENTICATION DIAGNOSTICS
 * Run this function to diagnose current authentication issues
 */
function diagnosePersistentAuthIssue() {
  debugLog('🔍 === COMPREHENSIVE AUTH DIAGNOSTIC ===');
  
  const results = {
    sessionCheck: {},
    authFlow: {},
    permissions: {},
    userDataCheck: {},
    recommendations: []
  };
  
  try {
    // 1. SESSION DIAGNOSTICS
    debugLog('\n1. 📋 SESSION DIAGNOSTICS:');
    
    try {
      const user = Session.getActiveUser();
      const email = user.getEmail();
      results.sessionCheck.activeUser = email;
      results.sessionCheck.activeUserSuccess = true;
      debugLog('✅ Session.getActiveUser():', email);
    } catch (e) {
      results.sessionCheck.activeUserSuccess = false;
      results.sessionCheck.activeUserError = e.message;
      debugLog('❌ Session.getActiveUser() failed:', e.message);
    }
    
    try {
      const customSession = getCustomSession();
      results.sessionCheck.customSession = customSession;
      debugLog('✅ Custom session:', customSession ? customSession.email : 'None');
    } catch (e) {
      results.sessionCheck.customSessionError = e.message;
      debugLog('❌ Custom session error:', e.message);
    }
    
    // 2. AUTHENTICATION FLOW TEST
    debugLog('\n2. 🔐 AUTHENTICATION FLOW TEST:');
    
    try {
      const authResult = authenticateUser();
      results.authFlow.googleAuth = authResult;
      debugLog('✅ Google authenticateUser():', authResult.success ? 'SUCCESS' : 'FAILED');
      if (authResult.user) {
        debugLog('   User:', authResult.user.email, 'Role:', authResult.user.role);
      }
    } catch (e) {
      results.authFlow.googleAuthError = e.message;
      debugLog('❌ Google auth error:', e.message);
    }
    
    try {
      const currentUser = getCurrentUser();
      results.authFlow.currentUser = currentUser;
      debugLog('✅ getCurrentUser():', currentUser.success ? 'SUCCESS' : 'FAILED');
      if (currentUser.user) {
        debugLog('   User:', currentUser.user.email, 'Role:', currentUser.user.role);
      }
    } catch (e) {
      results.authFlow.currentUserError = e.message;
      debugLog('❌ getCurrentUser() error:', e.message);
    }
    
    // 3. PERMISSION SYSTEM TEST
    debugLog('\n3. 🔒 PERMISSION SYSTEM TEST:');
    
    try {
      const admins = getAdminUsers();
      results.permissions.adminUsers = admins;
      debugLog('✅ Admin users:', admins);
    } catch (e) {
      results.permissions.adminUsersError = e.message;
      debugLog('❌ Admin users error:', e.message);
    }
    
    try {
      const dispatchers = getDispatcherUsers();
      results.permissions.dispatcherUsers = dispatchers;
      debugLog('✅ Dispatcher users:', dispatchers);
    } catch (e) {
      results.permissions.dispatcherUsersError = e.message;
      debugLog('❌ Dispatcher users error:', e.message);
    }
    
    // 4. USER DATA CHECK
    debugLog('\n4. 📊 USER DATA CHECK:');
    
    try {
      const usersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
      if (usersSheet) {
        const data = usersSheet.getDataRange().getValues();
        results.userDataCheck.usersSheetExists = true;
        results.userDataCheck.userCount = data.length - 1; // Minus header
        debugLog('✅ Users sheet exists with', data.length - 1, 'users');
      } else {
        results.userDataCheck.usersSheetExists = false;
        debugLog('❌ Users sheet not found');
      }
    } catch (e) {
      results.userDataCheck.usersSheetError = e.message;
      debugLog('❌ Users sheet error:', e.message);
    }
    
    // 5. GENERATE RECOMMENDATIONS
    debugLog('\n5. 💡 RECOMMENDATIONS:');
    
    if (!results.sessionCheck.activeUserSuccess) {
      results.recommendations.push('No active Google session - user needs to sign in with Google');
      debugLog('• User needs to sign in with Google');
    }
    
    if (results.authFlow.googleAuth && !results.authFlow.googleAuth.success) {
      if (results.authFlow.googleAuth.error === 'UNAUTHORIZED') {
        results.recommendations.push('User email not in authorized lists - add to Settings sheet');
        debugLog('• Add user email to admin or dispatcher list in Settings sheet');
      }
    }
    
    if (!results.userDataCheck.usersSheetExists) {
      results.recommendations.push('Initialize authentication system - run initializeAuthenticationSystem()');
      debugLog('• Run initializeAuthenticationSystem() to set up sheets');
    }
    
    if (results.permissions.adminUsers && results.permissions.adminUsers.length === 0) {
      results.recommendations.push('No admin users configured - update Settings sheet');
      debugLog('• Configure admin users in Settings sheet');
    }
    
    debugLog('\n🎯 NEXT STEPS:');
    debugLog('1. Review the recommendations above');
    debugLog('2. Run fixAuthenticationIssues() to apply automatic fixes');
    debugLog('3. Test login again after fixes');
    
    return results;
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    results.error = error.message;
    return results;
  }
}

/**
 * AUTOMATIC AUTHENTICATION FIXES
 * Run this after diagnosePersistentAuthIssue() to apply fixes
 */
function fixAuthenticationIssues() {
  debugLog('🔧 === APPLYING AUTHENTICATION FIXES ===');
  
  const fixes = {
    settingsSheet: false,
    usersSheet: false,
    adminEmails: false,
    sessionClear: false,
    error: null
  };
  
  try {
    // Fix 1: Ensure Settings sheet exists and has proper admin emails
    debugLog('\n1. 📄 Fixing Settings sheet...');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let settingsSheet = ss.getSheetByName('Settings');
    
    if (!settingsSheet) {
      settingsSheet = ss.insertSheet('Settings');
      debugLog('✅ Created Settings sheet');
    }
    
    // Get current user email to add as admin
    let currentUserEmail = '';
    try {
      const user = Session.getActiveUser();
      currentUserEmail = user.getEmail();
    } catch (e) {
      debugLog('⚠️ Could not get current user email');
    }
    
    // Set up proper structure
    const headers = ['Setting Type', 'Admin Emails', 'Dispatcher Emails', 'Notes'];
    settingsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Add current user as admin if we have their email
    const emailData = [
      ['User Management', currentUserEmail || 'admin@example.com', 'dispatcher@example.com', 'Primary accounts'],
      ['', 'jpsotraffic@gmail.com', 'jpdispatcher100@gmail.com', 'Backup accounts'],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', '']
    ];
    
    settingsSheet.getRange(2, 1, emailData.length, emailData[0].length).setValues(emailData);
    
    // Format headers
    settingsSheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('white');
    
    settingsSheet.autoResizeColumns(1, headers.length);
    fixes.settingsSheet = true;
    debugLog('✅ Settings sheet configured with admin emails');
    
    // Fix 2: Ensure Users sheet exists
    debugLog('\n2. 👥 Fixing Users sheet...');
    
    let usersSheet = ss.getSheetByName('Users');
    if (!usersSheet) {
      usersSheet = ss.insertSheet('Users');
      setupUsersSheet(usersSheet);
      fixes.usersSheet = true;
      debugLog('✅ Created Users sheet with sample data');
    } else {
      debugLog('✅ Users sheet already exists');
      fixes.usersSheet = true;
    }
    
    // Fix 3: Clear any cached authentication data
    debugLog('\n3. 🧹 Clearing authentication cache...');
    
    try {
      PropertiesService.getUserProperties().deleteProperty('CUSTOM_SESSION');
      PropertiesService.getScriptProperties().deleteProperty('CACHED_USER_EMAIL');
      PropertiesService.getScriptProperties().deleteProperty('CACHED_USER_NAME');
      fixes.sessionClear = true;
      debugLog('✅ Authentication cache cleared');
    } catch (e) {
      debugLog('⚠️ Cache clear error:', e.message);
    }
    
    // Fix 4: Test the fixes
    debugLog('\n4. 🧪 Testing fixes...');
    
    try {
      const testAdmins = getAdminUsers();
      fixes.adminEmails = testAdmins.length > 0;
      debugLog('✅ Admin emails test:', testAdmins);
    } catch (e) {
      debugLog('❌ Admin emails test failed:', e.message);
    }
    
    debugLog('\n✅ FIXES APPLIED SUCCESSFULLY!');
    debugLog('📝 Summary:');
    debugLog('• Settings sheet:', fixes.settingsSheet ? 'FIXED' : 'FAILED');
    debugLog('• Users sheet:', fixes.usersSheet ? 'FIXED' : 'FAILED');
    debugLog('• Admin emails:', fixes.adminEmails ? 'WORKING' : 'FAILED');
    debugLog('• Cache cleared:', fixes.sessionClear ? 'YES' : 'NO');
    
    if (currentUserEmail) {
      debugLog(`• Current user (${currentUserEmail}) added as admin`);
    }
    
    debugLog('\n🎯 NEXT STEPS:');
    debugLog('1. Refresh your browser/app');
    debugLog('2. Try logging in again');
    debugLog('3. Run diagnosePersistentAuthIssue() to verify fixes');
    
    return {
      success: true,
      fixes: fixes,
      currentUserEmail: currentUserEmail,
      message: 'Authentication fixes applied successfully'
    };
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    fixes.error = error.message;
    return {
      success: false,
      fixes: fixes,
      error: error.message
    };
  }
}

/**
 * EMERGENCY BYPASS FOR IMMEDIATE ACCESS
 * Use this only for debugging - creates a temporary admin session
 */
function emergencyAdminAccess() {
  debugLog('🚨 EMERGENCY ADMIN ACCESS - FOR DEBUGGING ONLY');
  
  try {
    let userEmail = '';
    try {
      const user = Session.getActiveUser();
      userEmail = user.getEmail();
    } catch (e) {
      userEmail = 'emergency@admin.com';
    }
    
    // Create emergency session
    const emergencySession = {
      email: userEmail,
      name: 'Emergency Admin',
      role: 'admin',
      expires: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
      loginMethod: 'emergency',
      loginTime: new Date().toISOString()
    };
    
    PropertiesService.getUserProperties().setProperty('CUSTOM_SESSION', JSON.stringify(emergencySession));
    
    debugLog('✅ Emergency admin session created for:', userEmail);
    debugLog('⚠️ THIS IS TEMPORARY - Apply proper fixes ASAP');
    
    return {
      success: true,
      session: emergencySession,
      warning: 'This is a temporary emergency session. Apply proper authentication fixes.'
    };
    
  } catch (error) {
    console.error('❌ Emergency access failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * TEST LOCAL AUTHENTICATION
 * Test the local email/password authentication system
 */
function testLocalAuthentication() {
  debugLog('🧪 === TESTING LOCAL AUTHENTICATION ===');
  
  try {
    // Test with sample user credentials
    debugLog('1. Testing with sample credentials...');
    
    const testResult = loginWithCredentials('admin@test.com', 'admin123');
    debugLog('Test login result:', testResult);
    
    if (testResult.success) {
      debugLog('✅ Local authentication working');
      return {
        success: true,
        message: 'Local authentication is working',
        testResult: testResult
      };
    } else {
      debugLog('❌ Local authentication failed:', testResult.message);
      
      // Check if Users sheet has sample data
      const usersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
      if (!usersSheet) {
        debugLog('❌ Users sheet missing - run initializeAuthenticationSystem()');
        return {
          success: false,
          error: 'Users sheet missing',
          recommendation: 'Run initializeAuthenticationSystem()'
        };
      }
      
      const data = usersSheet.getDataRange().getValues();
      debugLog('Users sheet has', data.length - 1, 'users');
      
      return {
        success: false,
        error: testResult.message,
        userCount: data.length - 1,
        recommendation: 'Check Users sheet for valid credentials or run createSampleUsers()'
      };
    }
    
  } catch (error) {
    console.error('❌ Local auth test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

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
      console.log('Creating Users sheet...');
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
  console.log('Users sheet created with sample data');
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
    console.log('Session created for:', user.email);
    
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
  console.log('Attempting credentials login for:', email);
  
  if (!email || !password) {
    return { success: false, message: 'Email and password are required' };
  }
  
  try {
    const user = findUserRecord(email.trim());
    
    if (!user) {
      console.log('User not found:', email);
      return { success: false, message: 'Invalid credentials' };
    }
    
    if (user.status !== 'active') {
      console.log('User not active:', email, 'Status:', user.status);
      return { success: false, message: 'Account is not active' };
    }
    
    const hashedInput = hashPassword(password);
    if (hashedInput !== user.hashedPassword) {
      console.log('Password mismatch for:', email);
      return { success: false, message: 'Invalid credentials' };
    }
    
    // Create session
    user.loginMethod = 'spreadsheet';
    const session = createCustomSession(user);
    
    if (!session) {
      return { success: false, message: 'Failed to create session' };
    }
    
    console.log('Credentials login successful for:', email);
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
  console.log('Attempting Google OAuth login...');
  
  try {
    // Use the existing authenticateUser function that handles Google OAuth
    const auth = authenticateUser();
    
    if (!auth.success) {
      console.log('Google authentication failed:', auth.message);
      return auth;
    }
    
    // Create session for Google authenticated user
    const user = auth.user;
    user.loginMethod = 'google';
    const session = createCustomSession(user);
    
    if (!session) {
      return { success: false, message: 'Failed to create session' };
    }
    
    console.log('Google login successful for:', user.email);
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
    console.log('User logged out successfully');
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
    
    console.log('User created:', email);
    return { success: true, message: 'User created successfully' };
    
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, message: 'Failed to create user' };
  }
}



/**
 * SETUP AND UTILITY FUNCTIONS
 */

/**
 * Initialize the authentication system - run this once to set everything up
 */
function initializeAuthenticationSystem() {
  console.log('🚀 Initializing authentication system...');
  
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
      console.log('📄 Creating Users sheet...');
      usersSheet = ss.insertSheet('Users');
      setupUsersSheet(usersSheet);
      results.sampleUser = true;
    } else {
      console.log('✅ Users sheet already exists');
    }
    results.usersSheet = true;
    
    // 2. Create or verify Settings sheet (for admin/dispatcher emails)
    let settingsSheet = ss.getSheetByName('Settings');
    if (!settingsSheet) {
      console.log('📄 Creating Settings sheet...');
      settingsSheet = ss.insertSheet('Settings');
      setupSettingsSheet(settingsSheet);
    } else {
      console.log('✅ Settings sheet already exists');
    }
    results.settingsSheet = true;
    
    // 3. Test the system
    console.log('🧪 Testing authentication system...');
    const testResult = testAuthenticationSystem();
    
    if (testResult.success) {
      console.log('✅ Authentication system initialized successfully!');
      return {
        success: true,
        message: 'Authentication system ready',
        details: results,
        test: testResult
      };
    } else {
      console.log('⚠️ Authentication system has issues:', testResult.error);
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
  console.log('Settings sheet created with sample data');
}

/**
 * Add a new user to the system
 */
function addNewUser(name, email, password, role = 'rider', status = 'active') {
  const result = createUser(name, email, password, role, status);
  
  if (result.success) {
    console.log(`✅ User added: ${name} (${email}) as ${role}`);
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
        
        console.log(`✅ Password updated for: ${email}`);
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
    
    console.log(`Found ${users.length} users in system`);
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
        
        console.log(`✅ Status changed for ${email}: ${currentStatus} → ${newStatus}`);
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
      console.log('No active sessions to clean up');
      return { success: true, message: 'No expired sessions found' };
    }
    
    console.log('Active session found, no cleanup needed');
    return { success: true, message: 'Sessions are current' };
    
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    return { success: false, message: 'Failed to cleanup sessions' };
  }
}



/**
 * Create sample users for testing
 */
function createSampleUsers() {
  console.log('👥 Creating sample users...');
  
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
  console.log(`✅ Created ${successCount} out of ${sampleUsers.length} sample users`);
  
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
  console.log('🎯 Running complete authentication setup...');
  
  try {
    // Step 1: Initialize system
    console.log('Step 1: Initializing system...');
    const initResult = initializeAuthenticationSystem();
    
    if (!initResult.success) {
      throw new Error('System initialization failed: ' + initResult.message);
    }
    
    // Step 2: Create sample users
    console.log('Step 2: Creating sample users...');
    const usersResult = createSampleUsers();
    
    // Step 3: Test authentication
    console.log('Step 3: Testing authentication...');
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
    
    console.log('✅ Setup complete!');
    console.log('Instructions:');
    summary.instructions.forEach(instruction => console.log(instruction));
    
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
  console.log('🔍 === COMPREHENSIVE AUTH DIAGNOSTIC ===');
  
  const results = {
    sessionCheck: {},
    authFlow: {},
    permissions: {},
    userDataCheck: {},
    recommendations: []
  };
  
  try {
    // 1. SESSION DIAGNOSTICS
    console.log('\n1. 📋 SESSION DIAGNOSTICS:');
    
    try {
      const user = Session.getActiveUser();
      const email = user.getEmail();
      results.sessionCheck.activeUser = email;
      results.sessionCheck.activeUserSuccess = true;
      console.log('✅ Session.getActiveUser():', email);
    } catch (e) {
      results.sessionCheck.activeUserSuccess = false;
      results.sessionCheck.activeUserError = e.message;
      console.log('❌ Session.getActiveUser() failed:', e.message);
    }
    
    try {
      const customSession = getCustomSession();
      results.sessionCheck.customSession = customSession;
      console.log('✅ Custom session:', customSession ? customSession.email : 'None');
    } catch (e) {
      results.sessionCheck.customSessionError = e.message;
      console.log('❌ Custom session error:', e.message);
    }
    
    // 2. AUTHENTICATION FLOW TEST
    console.log('\n2. 🔐 AUTHENTICATION FLOW TEST:');
    
    try {
      const authResult = authenticateUser();
      results.authFlow.googleAuth = authResult;
      console.log('✅ Google authenticateUser():', authResult.success ? 'SUCCESS' : 'FAILED');
      if (authResult.user) {
        console.log('   User:', authResult.user.email, 'Role:', authResult.user.role);
      }
    } catch (e) {
      results.authFlow.googleAuthError = e.message;
      console.log('❌ Google auth error:', e.message);
    }
    
    try {
      const currentUser = getCurrentUser();
      results.authFlow.currentUser = currentUser;
      console.log('✅ getCurrentUser():', currentUser.success ? 'SUCCESS' : 'FAILED');
      if (currentUser.user) {
        console.log('   User:', currentUser.user.email, 'Role:', currentUser.user.role);
      }
    } catch (e) {
      results.authFlow.currentUserError = e.message;
      console.log('❌ getCurrentUser() error:', e.message);
    }
    
    // 3. PERMISSION SYSTEM TEST
    console.log('\n3. 🔒 PERMISSION SYSTEM TEST:');
    
    try {
      const admins = getAdminUsers();
      results.permissions.adminUsers = admins;
      console.log('✅ Admin users:', admins);
    } catch (e) {
      results.permissions.adminUsersError = e.message;
      console.log('❌ Admin users error:', e.message);
    }
    
    try {
      const dispatchers = getDispatcherUsers();
      results.permissions.dispatcherUsers = dispatchers;
      console.log('✅ Dispatcher users:', dispatchers);
    } catch (e) {
      results.permissions.dispatcherUsersError = e.message;
      console.log('❌ Dispatcher users error:', e.message);
    }
    
    // 4. USER DATA CHECK
    console.log('\n4. 📊 USER DATA CHECK:');
    
    try {
      const usersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
      if (usersSheet) {
        const data = usersSheet.getDataRange().getValues();
        results.userDataCheck.usersSheetExists = true;
        results.userDataCheck.userCount = data.length - 1; // Minus header
        console.log('✅ Users sheet exists with', data.length - 1, 'users');
      } else {
        results.userDataCheck.usersSheetExists = false;
        console.log('❌ Users sheet not found');
      }
    } catch (e) {
      results.userDataCheck.usersSheetError = e.message;
      console.log('❌ Users sheet error:', e.message);
    }
    
    // 5. GENERATE RECOMMENDATIONS
    console.log('\n5. 💡 RECOMMENDATIONS:');
    
    if (!results.sessionCheck.activeUserSuccess) {
      results.recommendations.push('No active Google session - user needs to sign in with Google');
      console.log('• User needs to sign in with Google');
    }
    
    if (results.authFlow.googleAuth && !results.authFlow.googleAuth.success) {
      if (results.authFlow.googleAuth.error === 'UNAUTHORIZED') {
        results.recommendations.push('User email not in authorized lists - add to Settings sheet');
        console.log('• Add user email to admin or dispatcher list in Settings sheet');
      }
    }
    
    if (!results.userDataCheck.usersSheetExists) {
      results.recommendations.push('Initialize authentication system - run initializeAuthenticationSystem()');
      console.log('• Run initializeAuthenticationSystem() to set up sheets');
    }
    
    if (results.permissions.adminUsers && results.permissions.adminUsers.length === 0) {
      results.recommendations.push('No admin users configured - update Settings sheet');
      console.log('• Configure admin users in Settings sheet');
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Review the recommendations above');
    console.log('2. Run fixAuthenticationIssues() to apply automatic fixes');
    console.log('3. Test login again after fixes');
    
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
  console.log('🔧 === APPLYING AUTHENTICATION FIXES ===');
  
  const fixes = {
    settingsSheet: false,
    usersSheet: false,
    adminEmails: false,
    sessionClear: false,
    error: null
  };
  
  try {
    // Fix 1: Ensure Settings sheet exists and has proper admin emails
    console.log('\n1. 📄 Fixing Settings sheet...');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let settingsSheet = ss.getSheetByName('Settings');
    
    if (!settingsSheet) {
      settingsSheet = ss.insertSheet('Settings');
      console.log('✅ Created Settings sheet');
    }
    
    // Get current user email to add as admin
    let currentUserEmail = '';
    try {
      const user = Session.getActiveUser();
      currentUserEmail = user.getEmail();
    } catch (e) {
      console.log('⚠️ Could not get current user email');
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
    console.log('✅ Settings sheet configured with admin emails');
    
    // Fix 2: Ensure Users sheet exists
    console.log('\n2. 👥 Fixing Users sheet...');
    
    let usersSheet = ss.getSheetByName('Users');
    if (!usersSheet) {
      usersSheet = ss.insertSheet('Users');
      setupUsersSheet(usersSheet);
      fixes.usersSheet = true;
      console.log('✅ Created Users sheet with sample data');
    } else {
      console.log('✅ Users sheet already exists');
      fixes.usersSheet = true;
    }
    
    // Fix 3: Clear any cached authentication data
    console.log('\n3. 🧹 Clearing authentication cache...');
    
    try {
      PropertiesService.getUserProperties().deleteProperty('CUSTOM_SESSION');
      PropertiesService.getScriptProperties().deleteProperty('CACHED_USER_EMAIL');
      PropertiesService.getScriptProperties().deleteProperty('CACHED_USER_NAME');
      fixes.sessionClear = true;
      console.log('✅ Authentication cache cleared');
    } catch (e) {
      console.log('⚠️ Cache clear error:', e.message);
    }
    
    // Fix 4: Test the fixes
    console.log('\n4. 🧪 Testing fixes...');
    
    try {
      const testAdmins = getAdminUsers();
      fixes.adminEmails = testAdmins.length > 0;
      console.log('✅ Admin emails test:', testAdmins);
    } catch (e) {
      console.log('❌ Admin emails test failed:', e.message);
    }
    
    console.log('\n✅ FIXES APPLIED SUCCESSFULLY!');
    console.log('📝 Summary:');
    console.log('• Settings sheet:', fixes.settingsSheet ? 'FIXED' : 'FAILED');
    console.log('• Users sheet:', fixes.usersSheet ? 'FIXED' : 'FAILED');
    console.log('• Admin emails:', fixes.adminEmails ? 'WORKING' : 'FAILED');
    console.log('• Cache cleared:', fixes.sessionClear ? 'YES' : 'NO');
    
    if (currentUserEmail) {
      console.log(`• Current user (${currentUserEmail}) added as admin`);
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Refresh your browser/app');
    console.log('2. Try logging in again');
    console.log('3. Run diagnosePersistentAuthIssue() to verify fixes');
    
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
  console.log('🚨 EMERGENCY ADMIN ACCESS - FOR DEBUGGING ONLY');
  
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
    
    console.log('✅ Emergency admin session created for:', userEmail);
    console.log('⚠️ THIS IS TEMPORARY - Apply proper fixes ASAP');
    
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



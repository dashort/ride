

// Helper function to escape strings for JavaScript injection
function escapeJsString(str) {
  if (str === null || typeof str === 'undefined') {
    return '';
  }
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '\\\'')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\u2028/g, '\\u2028') // Line separator
    .replace(/\u2029/g, '\\u2029'); // Paragraph separator
}

/**
 * PERMISSIONS MATRIX
 * Define what each role can do in the system
 */
const PERMISSIONS_MATRIX = {
  admin: {
    // Requests
    requests: {
      create: true,
      read: true,
      update: true,
      delete: true,
      view_all: true,
      export: true
    },
    // Riders
    riders: {
      create: true,
      read: true,
      update: true,
      delete: true,
      view_all: true,
      approve: true,
      deactivate: true
    },
    // Assignments
    assignments: {
      create: true,
      read: true,
      update: true,
      delete: true,
      assign_any: true,
      view_all: true,
      bulk_assign: true
    },
    // Reports
    reports: {
      view_all: true,
      export_all: true,
      financial: true,
      rider_performance: true,
      system_logs: true
    },
    // System
    system: {
      manage_users: true,
      system_settings: true,
      backup_data: true,
      view_logs: true,
      send_notifications: true
    },
    // Pages
    pages: ['dashboard', 'requests', 'assignments', 'riders', 'notifications', 'reports', 'admin-schedule', 'settings']
  },

  dispatcher: {
    // Requests
    requests: {
      create: true,
      read: true,
      update: true,
      delete: false,
      view_all: true,
      export: true
    },
    // Riders
    riders: {
      create: false,
      read: true,
      update: false,
      delete: false,
      view_all: true,
      approve: false,
      deactivate: false
    },
    // Assignments
    assignments: {
      create: true,
      read: true,
      update: true,
      delete: false,
      assign_any: true,
      view_all: true,
      bulk_assign: true
    },
    // Reports
    reports: {
      view_all: true,
      export_all: false,
      financial: false,
      rider_performance: true,
      system_logs: false
    },
    // System
    system: {
      manage_users: false,
      system_settings: false,
      backup_data: false,
      view_logs: false,
      send_notifications: true
    },
    // Pages
    pages: ['dashboard', 'requests', 'assignments', 'notifications', 'reports']
  },

  rider: {
    // Requests
    requests: {
      create: false,
      read: false, // Only assigned requests
      update: false,
      delete: false,
      view_all: false,
      export: false
    },
    // Riders
    riders: {
      create: false,
      read: false, // Only own profile
      update: false, // Only own profile
      delete: false,
      view_all: false,
      approve: false,
      deactivate: false
    },
    // Assignments
    assignments: {
      create: false,
      read: true, // Only own assignments
      update: true, // Only own status
      delete: false,
      assign_any: false,
      view_all: false,
      bulk_assign: false
    },
    // Reports
    reports: {
      view_all: false,
      export_all: false,
      financial: false,
      rider_performance: false, // Only own performance
      system_logs: false
    },
    // System
    system: {
      manage_users: false,
      system_settings: false,
      backup_data: false,
      view_logs: false,
      send_notifications: false
    },
    // Pages
    pages: ['dashboard', 'rider-schedule', 'my-assignments', 'my-profile']
  }
};

/**
 * RESOURCE ACCESS CONTROL
 * Controls what data each role can access
 */
const RESOURCE_ACCESS = {
  requests: {
    admin: (user, requestId) => true, // Can access all
    dispatcher: (user, requestId) => true, // Can access all
    rider: (user, requestId) => {
      // Only requests where rider is assigned
      const assignments = getAssignmentsForRider(user.riderId);
      return assignments.some(assignment => assignment.requestId === requestId);
    }
  },
  
  riders: {
    admin: (user, riderId) => true, // Can access all riders
    dispatcher: (user, riderId) => true, // Can view all riders
    rider: (user, riderId) => user.riderId === riderId // Only own profile
  },
  
  assignments: {
    admin: (user, assignmentId) => true, // Can access all
    dispatcher: (user, assignmentId) => true, // Can access all
    rider: (user, assignmentId) => {
      // Only own assignments
      const assignment = getAssignmentById(assignmentId);
      return assignment && assignment.riderId === user.riderId;
    }
  }
};

// 🔧 SYSTEM LOGIN FIX - Add these functions to your Code.gs or AccessControl.gs

/**
 * Handle credential-based authentication
 */
function handleCredentialsAuth(e) {
  try {
    console.log('🔐 Starting credential authentication...');
    
    // If credentials were submitted, process them
    if (e.parameter?.email && e.parameter?.password) {
      console.log('📝 Processing login credentials for:', e.parameter.email);
      
      const loginResult = loginWithCredentials(e.parameter.email, e.parameter.password);
      
      if (loginResult.success) {
        console.log('✅ Credential login successful');
        return createRedirectPage(loginResult.url, 'Login successful');
      } else {
        console.log('❌ Credential login failed:', loginResult.message);
        return createCredentialsLoginFormWithError(loginResult.message);
      }
    }
    
    // No credentials submitted - show login form
    console.log('📋 Showing credentials login form');
    return createCredentialsLoginForm();
    
  } catch (error) {
    console.error('❌ Credential auth error:', error);
    return createErrorPage('Login Error', error.message);
  }
}

/**
 * Create credentials login form
 */
function createCredentialsLoginForm() {
  const webAppUrl = getWebAppUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <title>System Login - Escort Management</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: 0;
      padding: 2rem;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login-container {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      max-width: 400px;
      width: 100%;
    }
    .logo {
      text-align: center;
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    .title {
      text-align: center;
      color: #333;
      margin-bottom: 2rem;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: #555;
      font-weight: 500;
    }
    .form-group input {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 16px;
      box-sizing: border-box;
    }
    .form-group input:focus {
      outline: none;
      border-color: #4285f4;
      box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.1);
    }
    .btn {
      width: 100%;
      padding: 12px;
      background: #34a853;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }
    .btn:hover {
      background: #137333;
    }
    .btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .message {
      margin-top: 1rem;
      padding: 12px;
      border-radius: 6px;
      text-align: center;
      display: none;
    }
    .message.error {
      background: #ffeaea;
      color: #d93025;
      border: 1px solid #fce8e6;
    }
    .message.loading {
      background: #e3f2fd;
      color: #1976d2;
      border: 1px solid #bbdefb;
    }
    .back-link {
      text-align: center;
      margin-top: 2rem;
    }
    .back-link a {
      color: #4285f4;
      text-decoration: none;
      font-size: 14px;
    }
    .back-link a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="logo">🏍️</div>
    <h1 class="title">System Login</h1>
    
    <form id="loginForm" action="${webAppUrl}" method="GET">
      <input type="hidden" name="auth" value="credentials">
      
      <div class="form-group">
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" required autocomplete="username">
      </div>
      
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required autocomplete="current-password">
      </div>
      
      <button type="submit" class="btn" id="loginBtn">
        Sign In
      </button>
    </form>
    
    <div id="message" class="message"></div>
    
    <div class="back-link">
      <a href="${webAppUrl}">← Back to login options</a>
    </div>
  </div>
  
  <script>
    document.getElementById('loginForm').addEventListener('submit', function(e) {
      e.preventDefault();
      
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const loginBtn = document.getElementById('loginBtn');
      
      if (!email || !password) {
        showMessage('Please enter both email and password', 'error');
        return;
      }
      
      // Show loading state
      loginBtn.disabled = true;
      loginBtn.textContent = 'Signing In...';
      showMessage('Verifying credentials...', 'loading');
      
      // Submit form with credentials as URL parameters
      const url = '${webAppUrl}?auth=credentials&email=' + encodeURIComponent(email) + '&password=' + encodeURIComponent(password);
      window.location.href = url;
    });
    
    function showMessage(text, type) {
      const message = document.getElementById('message');
      message.textContent = text;
      message.className = 'message ' + type;
      message.style.display = 'block';
    }
    
    // Auto-focus first input
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('email').focus();
    });
  </script>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('System Login - Escort Management')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}




/**
 * Handle Google OAuth authentication
 */
function handleGoogleAuth(e) {
  try {
    console.log('🔐 Starting Google authentication...');
    
    // Get fresh Google session
    const googleSession = getGoogleUserSession();
    
    if (!googleSession.hasEmail) {
      console.log('❌ No Google session found');
      return createErrorPage('Google Sign-In Failed', 'Could not get your Google account information. Please try again.');
    }
    
    console.log('✅ Google session found:', googleSession.email);
    
    // Check if user is authorized
    const authResult = authorizeValidUser({
      email: googleSession.email,
      name: googleSession.name,
      type: 'google'
    });
    
    if (!authResult.success) {
      if (authResult.error === 'UNAUTHORIZED') {
        return createUnauthorizedPage(googleSession.email, googleSession.name);
      }
      return createErrorPage('Authorization Failed', authResult.message);
    }
    
    console.log('✅ Google auth successful, redirecting to dashboard');
    
    // Success - redirect to dashboard
    const url = getWebAppUrl() + '?page=dashboard';
    return createRedirectPage(url, 'Google sign-in successful');
    
  } catch (error) {
    console.error('❌ Google auth error:', error);
    return createErrorPage('Google Authentication Error', error.message);
  }
}

/**
 * Process credential login
 */
function processCredentialLogin(email, password) {
  try {
    console.log('🔐 Processing credential login for:', email);
    
    // Use your existing loginWithCredentials function
    const result = loginWithCredentials(email, password);
    
    if (result.success) {
      console.log('✅ Credential login successful');
      // The session is already created by loginWithCredentials
      return HtmlService.createHtmlOutput(`
        <script>
          window.location.href = '${result.url}';
        </script>
        <p>Login successful. Redirecting...</p>
      `);
    } else {
      console.log('❌ Credential login failed:', result.message);
      return createCredentialsLoginFormWithError(result.message);
    }
    
  } catch (error) {
    console.error('❌ Credential login error:', error);
    return createCredentialsLoginFormWithError('Login system error');
  }
}

/**
 * Create credentials login form with error message
 */
function createCredentialsLoginFormWithError(errorMessage) {
  const form = createCredentialsLoginForm();
  let content = form.getContent();
  
  // Inject error message
  const errorScript = `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        showMessage('${errorMessage.replace(/'/g, "\\'")}', 'error');
      });
    </script>
  `;
  
  content = content.replace('</body>', errorScript + '</body>');
  form.setContent(content);
  
  return form;
}

// 🔧 FIXED SESSION MANAGEMENT - Complete authentication flow

/**
 * MAIN doGet function with proper session handling
 */
function doGet(e) {
  try {
    console.log('🚀 Main doGet called with:', JSON.stringify(e.parameter || {}));
    
    const params = e.parameter || {};
    
    // FIXED: Handle logout properly
if (params.action === 'logout' || params.auth === 'logout') {
  console.log('🚪 Logout requested - processing complete logout');
  return handleLogoutRequest();
}
    
    // Check for existing session
    const session = getAuthenticatedSession();
    
    if (session.isValid) {
      console.log('✅ Valid session found:', session.user.email, 'role:', session.user.role);
      
      // User is authenticated - load the app
      const pageName = params.page || 'dashboard';
      return loadAppPage(pageName, session.user, session.rider);
    }
    
    console.log('❌ No valid session - showing login page');
    return createLoginPage();
    
  } catch (error) {
    console.error('❌ doGet error:', error);
    return createErrorPage('System Error', error.message);
  }
}
function testCompleteLogout() {
  console.log('🧪 Testing complete logout functionality...');
  
  try {
    // 1. Check current session
    console.log('1. Checking current session...');
    const beforeSession = getAuthenticatedSession();
    console.log('Session before logout:', beforeSession);
    
    // 2. Clear all sessions
    console.log('2. Clearing all sessions...');
    const clearResult = clearUserSession();
    console.log('Clear result:', clearResult);
    
    // 3. Check if session is completely cleared
    console.log('3. Checking session after clearing...');
    const afterSession = getAuthenticatedSession();
    console.log('Session after logout:', afterSession);
    
    // 4. Test custom session
    console.log('4. Checking custom session...');
    const customSession = getCustomSession();
    console.log('Custom session after logout:', customSession);
    
    const result = {
      clearResult: clearResult,
      sessionBeforeLogout: beforeSession,
      sessionAfterLogout: afterSession,
      customSessionAfter: customSession,
      success: !afterSession.isValid && clearResult.success
    };
    
    console.log('🎯 LOGOUT TEST RESULT:', result.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('Complete result:', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Complete logout test failed:', error);
    return { success: false, error: error.message };
  }
}
/**
 * Get authenticated session (checks both Google and custom sessions)
 */
function getAuthenticatedSession() {
  try {
    console.log('🔍 Checking for authenticated session...');
    
    // Method 1: Check stored session from successful login
    const storedSession = getStoredSession();
    if (storedSession.isValid) {
      console.log('✅ Found stored session:', storedSession.user.email);
      return storedSession;
    }
    
    // Method 2: Check Google session (for direct Google OAuth)
    const googleSession = checkGoogleSession();
    if (googleSession.isValid) {
      console.log('✅ Found Google session:', googleSession.user.email);
      return googleSession;
    }
    
    console.log('❌ No valid session found');
    return { isValid: false };
    
  } catch (error) {
    console.error('❌ Session check error:', error);
    return { isValid: false, error: error.message };
  }
}

/**
 * Get stored session from PropertiesService
 */
function getStoredSession() {
  try {
    const userProperties = PropertiesService.getUserProperties();
    const sessionData = userProperties.getProperty('AUTHENTICATED_USER');
    
    if (!sessionData) {
      console.log('No stored session found');
      return { isValid: false };
    }
    
    const session = JSON.parse(sessionData);
    console.log('📋 Stored session data:', session);
    
    // Check if session is expired (24 hours)
    const sessionAge = Date.now() - (session.timestamp || 0);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (sessionAge > maxAge) {
      console.log('⏰ Session expired, clearing...');
      userProperties.deleteProperty('AUTHENTICATED_USER');
      return { isValid: false };
    }
    
    // FIXED: Ensure name property exists
    if (!session.name || session.name === 'undefined') {
      console.log('🔧 Fixing missing name in session...');
      session.name = extractNameFromEmail(session.email);
      
      // Update the stored session with the fixed name
      userProperties.setProperty('AUTHENTICATED_USER', JSON.stringify(session));
      console.log('✅ Updated session with name:', session.name);
    }
    
    // Session is valid
    return {
      isValid: true,
      user: {
        email: session.email,
        name: session.name, // Now guaranteed to exist
        role: session.role,
        method: session.method
      },
      rider: null // You can enhance this to load rider data
    };
    
  } catch (error) {
    console.log('⚠️ Error reading stored session:', error.message);
    return { isValid: false };
  }
}

/**
 * Check Google session for direct OAuth access
 */
function checkGoogleSession() {
  try {
    const user = Session.getActiveUser();
    const email = user.getEmail();
    
    if (!email) {
      return { isValid: false };
    }
    
    // Check if Google user is authorized
    const adminUsers = getAdminUsersSafe ? getAdminUsersSafe() : [];
    const dispatcherUsers = getDispatcherUsersSafe ? getDispatcherUsersSafe() : [];
    const rider = getRiderByGoogleEmailSafe ? getRiderByGoogleEmailSafe(email) : null;
    
    let userRole = 'unauthorized';
    if (adminUsers.includes(email)) {
      userRole = 'admin';
    } else if (dispatcherUsers.includes(email)) {
      userRole = 'dispatcher';
    } else if (rider && rider.status === 'Active') {
      userRole = 'rider';
    }
    
    if (userRole === 'unauthorized') {
      return { isValid: false };
    }
    
    return {
      isValid: true,
      user: {
        email: email,
        name: user.getName() || extractNameFromEmail(email),
        role: userRole,
        method: 'google'
      },
      rider: rider
    };
    
  } catch (error) {
    console.log('⚠️ Google session check failed:', error.message);
    return { isValid: false };
  }
}

/**
 * FIXED: Clear user session function
 */
function clearUserSession() {
  try {
    console.log('🧹 Clearing ALL user sessions...');
    
    const userProperties = PropertiesService.getUserProperties();
    const scriptProperties = PropertiesService.getScriptProperties();
    
    // 1. Clear all USER PROPERTIES sessions
    userProperties.deleteProperty('AUTHENTICATED_USER');
    userProperties.deleteProperty('CUSTOM_SESSION');
    userProperties.deleteProperty('USER_SESSION_CACHE');
    console.log('✅ Cleared user properties sessions');
    
    // 2. Clear all SCRIPT PROPERTIES cache
    scriptProperties.deleteProperty('CACHED_USER_EMAIL');
    scriptProperties.deleteProperty('CACHED_USER_NAME');
    console.log('✅ Cleared script properties cache');
    
    // 3. Clear any additional session properties
    userProperties.deleteProperty('GOOGLE_SESSION_CACHE');
    userProperties.deleteProperty('LOGIN_SESSION');
    userProperties.deleteProperty('AUTH_TOKEN');
    console.log('✅ Cleared additional session properties');
    
    console.log('✅ ALL user sessions cleared successfully');
    
    return { success: true, message: 'All sessions cleared' };
    
  } catch (error) {
    console.error('❌ Error clearing sessions:', error);
    return { success: false, error: error.message };
  }
}
/**
 * Create login page (Google Apps Script method)
 */
function createLoginPage() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Login - Escort Management</title>
  <style>
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: 0; 
      padding: 2rem;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login-container {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      max-width: 400px;
      width: 100%;
      text-align: center;
    }
    .logo { font-size: 3rem; margin-bottom: 1rem; }
    .title { color: #333; margin-bottom: 2rem; }
    .auth-option {
      margin: 1rem 0;
      padding: 1rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #f9f9f9;
    }
    .btn {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      transition: all 0.3s;
      color: white;
    }
    .btn-google { background: #4285f4; }
    .btn-google:hover { background: #3367d6; }
    .btn-credentials { background: #34a853; }
    .btn-credentials:hover { background: #137333; }
    .btn:disabled { background: #ccc; cursor: not-allowed; }
    .message {
      margin-top: 1rem;
      padding: 12px;
      border-radius: 6px;
      display: none;
    }
    .message.error { background: #ffeaea; color: #d93025; }
    .message.loading { background: #e3f2fd; color: #1976d2; }
    .message.success { background: #e8f5e8; color: #2e7d32; }
    .divider {
      text-align: center;
      margin: 1.5rem 0;
      color: #666;
      position: relative;
    }
    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #ddd;
    }
    .divider span {
      background: white;
      padding: 0 1rem;
    }
    input {
      width: 100%;
      padding: 10px;
      margin: 5px 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="logo">🏍️</div>
    <h1 class="title">Escort Management System</h1>
    
    <div class="auth-option">
      <h3>🔐 Google Account</h3>
      <p>Sign in with your authorized Google account</p>
      <button id="googleBtn" class="btn btn-google" onclick="handleGoogleAuth()">
        Sign In with Google
      </button>
    </div>
    
    <div class="divider"><span>or</span></div>
    
    <div class="auth-option">
      <h3>👤 System Login</h3>
      <p>Use your system username and password</p>
      <button id="credentialsBtn" class="btn btn-credentials" onclick="showCredentialsForm()">
        System Login
      </button>
    </div>
    
    <!-- Credentials Form -->
    <div id="credentialsForm" style="display: none; margin-top: 2rem;">
      <div class="auth-option">
        <h3>Enter Credentials</h3>
        <input type="email" id="email" placeholder="Email Address">
        <input type="password" id="password" placeholder="Password">
        <button onclick="handleCredentialsAuth()" class="btn btn-credentials" style="margin-top: 10px;">
          Sign In
        </button>
        <button onclick="hideCredentialsForm()" class="btn" style="background: #666; margin-top: 5px;">
          Cancel
        </button>
      </div>
    </div>
    
    <div id="message" class="message"></div>
  </div>
  
  <script>
    function showMessage(text, type) {
      const message = document.getElementById('message');
      message.textContent = text;
      message.className = 'message ' + type;
      message.style.display = 'block';
    }
    
    function showCredentialsForm() {
      document.getElementById('credentialsForm').style.display = 'block';
      document.getElementById('credentialsBtn').style.display = 'none';
    }
    
    function hideCredentialsForm() {
      document.getElementById('credentialsForm').style.display = 'none';
      document.getElementById('credentialsBtn').style.display = 'block';
    }
    
    function handleGoogleAuth() {
      const btn = document.getElementById('googleBtn');
      btn.disabled = true;
      btn.textContent = 'Authenticating...';
      showMessage('Connecting to Google...', 'loading');
      
      google.script.run
        .withSuccessHandler(function(result) {
          console.log('Google auth result:', result);
          if (result.success) {
            showMessage('✅ Google authentication successful!', 'success');
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            showMessage('❌ ' + result.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Sign In with Google';
          }
        })
        .withFailureHandler(function(error) {
          console.error('Google auth error:', error);
          showMessage('❌ Google authentication error: ' + error.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Sign In with Google';
        })
        .processGoogleAuthentication();
    }
    
    function handleCredentialsAuth() {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      
      if (!email || !password) {
        showMessage('Please enter both email and password', 'error');
        return;
      }
      
      showMessage('Verifying credentials...', 'loading');
      
      google.script.run
        .withSuccessHandler(function(result) {
          console.log('Credentials auth result:', result);
          if (result.success) {
            showMessage('✅ Login successful!', 'success');
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            showMessage('❌ ' + result.message, 'error');
          }
        })
        .withFailureHandler(function(error) {
          console.error('Credentials auth error:', error);
          showMessage('❌ Login error: ' + error.message, 'error');
        })
        .processCredentialsAuthentication(email, password);
    }
    
    console.log('🔧 Login page loaded');
  </script>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Login - Escort Management')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * FIXED: Process Google authentication with proper session storage
 */
function processGoogleAuthentication() {
  try {
    console.log('🔐 Processing Google authentication...');
    
    const user = Session.getActiveUser();
    const email = user.getEmail();
    
    if (!email) {
      return { success: false, message: 'Could not get your Google account information' };
    }
    
    // Get name safely from Google user
    let userName = '';
    try {
      userName = user.getName() || '';
    } catch (error) {
      console.log('⚠️ Could not get name from Google user:', error.message);
    }
    
    // Fallback to extracting name from email if Google name is not available
    if (!userName || userName.trim() === '') {
      userName = extractNameFromEmail(email);
    }
    
    console.log('👤 Google user name:', userName);
    
    // Check authorization
    const adminUsers = getAdminUsersSafe ? getAdminUsersSafe() : [];
    const dispatcherUsers = getDispatcherUsersSafe ? getDispatcherUsersSafe() : [];
    const rider = getRiderByGoogleEmailSafe ? getRiderByGoogleEmailSafe(email) : null;
    
    let userRole = 'unauthorized';
    if (adminUsers.includes(email)) {
      userRole = 'admin';
    } else if (dispatcherUsers.includes(email)) {
      userRole = 'dispatcher';
    } else if (rider && rider.status === 'Active') {
      userRole = 'rider';
      // Use rider name if available
      if (rider.name && rider.name.trim() !== '') {
        userName = rider.name;
      }
    }
    
    if (userRole === 'unauthorized') {
      return {
        success: false,
        message: `Your Google account (${email}) is not authorized. Please contact your administrator.`
      };
    }
    
    // FIXED: Store session with proper name
    const sessionData = {
      email: email,
      name: userName, // Properly set name
      role: userRole,
      method: 'google',
      timestamp: Date.now()
    };
    
    console.log('💾 Storing Google session data:', sessionData);
    
    PropertiesService.getUserProperties().setProperty('AUTHENTICATED_USER', JSON.stringify(sessionData));
    
    console.log('✅ Google authentication successful:', email, 'as', userRole);
    
    return {
      success: true,
      message: 'Google authentication successful',
      user: sessionData
    };
    
  } catch (error) {
    console.error('❌ Google authentication error:', error);
    return { success: false, message: 'Google authentication failed: ' + error.message };
  }
}

/**
 * FIXED: Process credentials authentication with proper session storage
 */
function processCredentialsAuthentication(email, password) {
  try {
    console.log('🔐 Processing credentials authentication for:', email);
    
    // Use existing login function if available
    if (typeof loginWithCredentials === 'function') {
      const result = loginWithCredentials(email, password);
      
      if (result.success) {
        // FIXED: Store session properly
        const sessionData = {
          email: email,
          name: extractNameFromEmail(email),
          role: 'admin', // You could enhance this to get role from Users sheet
          method: 'credentials',
          timestamp: Date.now()
        };
        
        PropertiesService.getUserProperties().setProperty('AUTHENTICATED_USER', JSON.stringify(sessionData));
        
        console.log('✅ Credentials authentication successful:', email);
        
        return {
          success: true,
          message: 'Credentials authentication successful',
          user: sessionData
        };
      } else {
        return { success: false, message: result.message || 'Invalid credentials' };
      }
    } else {
      return { success: false, message: 'Credential authentication not available' };
    }
    
  } catch (error) {
    console.error('❌ Credentials authentication error:', error);
    return { success: false, message: 'Authentication error: ' + error.message };
  }
}



function createErrorPage(title, message) {
  const html = `
<!DOCTYPE html>
<html>
<head><title>${title}</title></head>
<body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
  <h1>❌ ${title}</h1>
  <p>${message}</p>
  <a href="?" style="padding: 10px 20px; background: #4285f4; color: white; text-decoration: none; border-radius: 4px;">Try Again</a>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html).setTitle(title);
}

function extractNameFromEmail(email) {
  if (!email) return 'User';
  try {
    const localPart = email.split('@')[0];
    return localPart.charAt(0).toUpperCase() + localPart.slice(1);
  } catch (error) {
    return 'User';
  }
}

function createGoogleAuthSuccessPage() {
  const webAppUrl = ScriptApp.getService().getUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head><title>Google Auth Success</title></head>
<body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
  <div style="max-width: 500px; margin: 0 auto; background: #c8e6c9; padding: 30px; border-radius: 10px;">
    <h1 style="color: #2e7d32;">✅ GOOGLE AUTH SUCCESS!</h1>
    <p style="font-size: 18px;">The Google authentication parameter was received correctly!</p>
    <p style="color: #666;">This proves that:</p>
    <ul style="text-align: left; display: inline-block;">
      <li>✅ Button click worked</li>
      <li>✅ doGet function received the parameter</li>
      <li>✅ URL parameter passing is working</li>
      <li>✅ Basic authentication flow is functional</li>
    </ul>
    <a href="${webAppUrl}" style="display: inline-block; padding: 10px 20px; background: #4285f4; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">
      🔄 Back to Test Page
    </a>
  </div>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Google Auth Success')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function createCredentialsAuthSuccessPage() {
  const webAppUrl = ScriptApp.getService().getUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head><title>Credentials Auth Success</title></head>
<body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
  <div style="max-width: 500px; margin: 0 auto; background: #c8e6c9; padding: 30px; border-radius: 10px;">
    <h1 style="color: #2e7d32;">✅ CREDENTIALS AUTH SUCCESS!</h1>
    <p style="font-size: 18px;">The credentials authentication parameter was received correctly!</p>
    <p style="color: #666;">This proves that:</p>
    <ul style="text-align: left; display: inline-block;">
      <li>✅ Button click worked</li>
      <li>✅ doGet function received the parameter</li>
      <li>✅ URL parameter passing is working</li>
      <li>✅ Basic authentication flow is functional</li>
    </ul>
    <a href="${webAppUrl}" style="display: inline-block; padding: 10px 20px; background: #34a853; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">
      🔄 Back to Test Page
    </a>
  </div>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Credentials Auth Success')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Alternative simple test function if the above still has issues
function createSimpleTestPage() {
  const webAppUrl = ScriptApp.getService().getUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <title>SIMPLE TEST</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h1>🧪 SIMPLE TEST PAGE</h1>
  
  <p><strong>Click these links and see if they work:</strong></p>
  
  <p><a href="${webAppUrl}?auth=google" target="_top" style="background: #4285f4; color: white; padding: 10px 20px; text-decoration: none;">Google Test</a></p>
  
  <p><a href="${webAppUrl}?auth=credentials" target="_top" style="background: #34a853; color: white; padding: 10px 20px; text-decoration: none;">Credentials Test</a></p>
  
  <script>
    // Force top-level navigation for all links
    document.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        window.top.location.href = this.href;
      });
    });
  </script>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('SIMPLE TEST')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Test function to check frame options
function testFrameOptions() {
  console.log('🔍 Testing frame options...');
  
  try {
    const output = HtmlService.createHtmlOutput('<h1>Test</h1>');
    
    // Try different frame options
    const allowAll = output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    console.log('✅ ALLOWALL frame option available');
    
    return {
      success: true,
      frameOptionsAvailable: true
    };
    
  } catch (error) {
    console.log('❌ Frame options error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Setup Users sheet for credential authentication
 */
function setupUsersSheet() {
  try {
    console.log('🛠️ Setting up Users sheet...');
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let usersSheet = spreadsheet.getSheetByName('Users');
    
    if (!usersSheet) {
      usersSheet = spreadsheet.insertSheet('Users');
      
      const headers = ['email', 'hashedPassword', 'role', 'status', 'name', 'created', 'lastLogin'];
      usersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      usersSheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#4285f4')
        .setFontColor('white');
      
      console.log('✅ Users sheet created with headers');
    }
    
    // Check if we need to add a sample admin user
    const data = usersSheet.getDataRange().getValues();
    if (data.length === 1) { // Only headers, no data
      const adminEmail = 'admin@escort.local';
      const adminPassword = 'TempPass123!'; // User must change this
      const hashedPassword = hashPassword(adminPassword);
      
      const adminData = [
        adminEmail,
        hashedPassword,
        'admin',
        'active',
        'System Administrator',
        new Date(),
        ''
      ];
      
      usersSheet.getRange(2, 1, 1, adminData.length).setValues([adminData]);
      
      console.log('✅ Sample admin user created:');
      console.log('   Email:', adminEmail);
      console.log('   Password:', adminPassword);
      console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');
    }
    
    return { 
      success: true, 
      message: 'Users sheet setup complete' 
    };
    
  } catch (error) {
    console.error('❌ Users sheet setup failed:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Test the complete authentication flow
 */
function testCredentialAuth() {
  console.log('🧪 Testing credential authentication...');
  
  try {
    // Test 1: Setup Users sheet
    console.log('1. Setting up Users sheet...');
    const setupResult = setupUsersSheet();
    console.log('   Result:', setupResult);
    
    // Test 2: Test password hashing
    console.log('2. Testing password hashing...');
    const testPassword = 'TestPassword123';
    const hashed = hashPassword(testPassword);
    console.log('   Hashed length:', hashed.length);
    
    // Test 3: Test user lookup
    console.log('3. Testing user lookup...');
    const user = findUserRecord('admin@escort.local');
    console.log('   User found:', !!user);
    
    // Test 4: Test login function
    console.log('4. Testing login function...');
    const loginResult = loginWithCredentials('admin@escort.local', 'TempPass123!');
    console.log('   Login result:', loginResult);
    
    return {
      success: true,
      message: 'All tests completed',
      results: {
        setup: setupResult,
        hashTest: hashed.length === 64,
        userFound: !!user,
        login: loginResult
      }
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}



function immediateSessionTest() {
  console.log('=== IMMEDIATE SESSION TEST ===');
  
  // Test 1: Raw session
  try {
    const user = Session.getActiveUser();
    const email = user.getEmail();
    console.log('1. Raw Session.getActiveUser().getEmail():', email);
  } catch (e) {
    console.log('1. Raw session failed:', e.message);
  }
  
  // Test 2: Cached data
  try {
    const cached = PropertiesService.getScriptProperties().getProperty('CACHED_USER_EMAIL');
    console.log('2. Cached email:', cached);
  } catch (e) {
    console.log('2. Cache check failed:', e.message);
  }
  
  // Test 3: Admin list
  try {
    const admins = getAdminUsersSafe();
    console.log('3. Admin list:', admins);
  } catch (e) {
    console.log('3. Admin list failed:', e.message);
  }
}
function getRoleBasedNavigation(currentPage, user, rider) {
  console.log('getRoleBasedNavigation: Called for page: ' + currentPage + ', User role: ' + (user ? user.role : 'unknown'));
  if (!user) {
    console.error('getRoleBasedNavigation: User object is null/undefined.');
    return '<nav class="navigation"><!-- User object missing --></nav>';
  }

  const menuItems = getUserNavigationMenu(user); // This function is already in AccessControl.gs
  if (!menuItems || menuItems.length === 0) {
    console.warn('getRoleBasedNavigation: No menu items returned by getUserNavigationMenu for role: ' + user.role);
    return '<nav class="navigation"><!-- No menu items for role --></nav>';
  }

  let navHtml = '<nav class="navigation">';
  menuItems.forEach(item => {
    const isActive = item.page === currentPage ? ' active' : '';
    // item.url should already be correctly formed by getUserNavigationMenu using getWebAppUrl()
    navHtml += `<a href="${item.url}" class="nav-button${isActive}" data-page="${item.page}" target="_top">${item.label}</a>`;
  });
  navHtml += '</nav>';

  console.log('getRoleBasedNavigation: Returning HTML (first 100 chars): ' + navHtml.substring(0, 100));
  return navHtml;
}
function emergencyAuthFix() {
  console.log('🚨 Running emergency authentication fix...');
  
  // Clear all cached user data
  const properties = PropertiesService.getScriptProperties();
  properties.deleteProperty('CACHED_USER_EMAIL');
  properties.deleteProperty('CACHED_USER_NAME');
  
  console.log('✅ Cleared problematic cache');
  return 'Cache cleared - users should see login screen now';
}


function getEnhancedUserSession() {
  console.log('INVESTIGATION: getEnhancedUserSession invoked.');
  try {
    const rawActiveUser = Session.getActiveUser();
    console.log('INVESTIGATION: Raw Session.getActiveUser() object:', rawActiveUser ? 'Exists' : 'Null');
    if (rawActiveUser) {
      // Attempt to get email and catch potential errors
      try {
        const activeUserEmail = rawActiveUser.getEmail();
        console.log('INVESTIGATION: Raw Session.getActiveUser().getEmail() initial value:', activeUserEmail);
        if (activeUserEmail === 'jpsotraffic@gmail.com') {
          console.log("⚠️ INVESTIGATION: Session.getActiveUser().getEmail() IS 'jpsotraffic@gmail.com' at initial check.");
        }
      } catch (e) {
        console.log('⚠️ INVESTIGATION: Error calling Session.getActiveUser().getEmail():', e.message);
      }
    }
  } catch (e) {
    console.log('⚠️ INVESTIGATION: Error accessing Session.getActiveUser():', e.message);
  }

  try {
    const rawEffectiveUser = Session.getEffectiveUser();
    console.log('INVESTIGATION: Raw Session.getEffectiveUser() object:', rawEffectiveUser ? 'Exists' : 'Null');
    if (rawEffectiveUser) {
      // Attempt to get email and catch potential errors
      try {
        console.log('INVESTIGATION: Raw Session.getEffectiveUser().getEmail() initial value:', rawEffectiveUser.getEmail());
      } catch (e) {
        console.log('⚠️ INVESTIGATION: Error calling Session.getEffectiveUser().getEmail():', e.message);
      }
    }
  } catch (e) {
    console.log('⚠️ INVESTIGATION: Error accessing Session.getEffectiveUser():', e.message);
  }

  try {
    console.log('🔍 getEnhancedUserSession called from AccessControl.gs');

    // 0. Check for custom spreadsheet-based session
    try {
      const custom = getCustomSession();
      if (custom) {
        console.log('🔵 Custom session found for ' + custom.email);
        return {
          email: custom.email,
          name: custom.name || '',
          hasEmail: true,
          hasName: !!custom.name,
          source: 'custom_session'
        };
      }
    } catch (e) {
      console.log('⚠️ Custom session check failed: ' + e.message);
    }
    
    let user = null;
    let userEmail = '';
    let userName = '';
    let sessionSource = 'none';
    
    try {
      user = Session.getActiveUser();
      console.log('👤 Session user object:', typeof user);
      
      if (user) {
        // Safe way to get email
        try {
          const activeUserEmail = user.getEmail ? user.getEmail() : (user.email || '');
          console.log('🔵 ActiveUser Email:', activeUserEmail);
          userEmail = activeUserEmail;
          sessionSource = 'active_user_getEmail';
        } catch (e) {
          console.log('⚠️ getEmail() failed, trying alternatives...');
          userEmail = user.email || '';
          sessionSource = 'active_user_property';
        }
        
        // Safe way to get name
        try {
          userName = user.getName ? user.getName() : (user.name || '');
        } catch (e) {
          console.log('⚠️ getName() failed, trying alternatives...');
          userName = user.name || user.displayName || '';
        }
      }
    } catch (error) {
      console.log('⚠️ Session.getActiveUser() failed:', error.message);
      sessionSource = 'getActiveUser_failed';
    }
    
    // Method 2: Try Session.getEffectiveUser() as fallback
    if (!userEmail) {
      try {
        console.log('🔄 Trying Session.getEffectiveUser()...');
        const effectiveUser = Session.getEffectiveUser();
        if (effectiveUser) {
          const effectiveUserEmail = effectiveUser.getEmail ? effectiveUser.getEmail() : (effectiveUser.email || '');
          console.log('🔵 EffectiveUser Email:', effectiveUserEmail);
          userEmail = effectiveUserEmail;
          userName = effectiveUser.getName ? effectiveUser.getName() : (effectiveUser.name || '');
          sessionSource = 'effective_user';
        }
      } catch (error) {
        console.log('⚠️ Session.getEffectiveUser() failed:', error.message);
        sessionSource = 'getEffectiveUser_failed';
      }
    }
    
    // Method 3: Try PropertiesService for cached user info
    if (!userEmail) {
      try {
        console.log('INVESTIGATION: Trying cached user info...'); // Modified existing log to INVESTIGATION
        const scriptProperties = PropertiesService.getScriptProperties();
        const cachedEmail = scriptProperties.getProperty('CACHED_USER_EMAIL');
        const cachedName = scriptProperties.getProperty('CACHED_USER_NAME');
        console.log('INVESTIGATION: Cached email from PropertiesService:', cachedEmail);
        console.log('INVESTIGATION: Cached name from PropertiesService:', cachedName);

        if (cachedEmail === 'jpsotraffic@gmail.com') {
          console.log("⚠️ INVESTIGATION: Cached email IS 'jpsotraffic@gmail.com'.");
        }

        if (cachedEmail) {
          userEmail = cachedEmail;
          userName = cachedName || '';
          sessionSource = 'cached_properties';
        }
      } catch (error) {
        console.log('⚠️ Cached user info failed:', error.message);
        sessionSource = 'cache_failed';
      }
    }
    
    // Trace the result
    traceAuthFunction('getEnhancedUserSession', userEmail, sessionSource);
    console.log('🔵 Final userEmail before returning:', userEmail);
    console.log('🔵 Final sessionSource before returning:', sessionSource);

    if (!userEmail || userEmail.trim() === '') {
      console.log('🔴 No email identified after all attempts. User is unauthorized.');
      return {
        email: '',
        name: '',
        hasEmail: false,
        hasName: false,
        source: 'unidentified',
        error: 'No email could be retrieved for the user.'
      };
    }
    
    // Return enhanced user object
    const enhancedUser = {
      email: userEmail.trim(),
      name: userName.trim() || extractNameFromEmail(userEmail),
      hasEmail: !!userEmail.trim(),
      hasName: !!userName.trim(),
      source: sessionSource
    };
    
    console.log(`✅ Enhanced user session: ${enhancedUser.email} (${enhancedUser.name})`);
    
    // Cache successful user info (but don't cache jpsotraffic unless it's really the active user)
    if (enhancedUser.hasEmail && sessionSource.includes('active_user')) {
      try {
        PropertiesService.getScriptProperties().setProperties({
          'CACHED_USER_EMAIL': enhancedUser.email,
          'CACHED_USER_NAME': enhancedUser.name
        });
      } catch (e) {
        console.log('⚠️ Failed to cache user info');
      }
    }
    
    return enhancedUser;
    
  } catch (error) {
    console.error('❌ Enhanced user session failed:', error);
    traceAuthFunction('getEnhancedUserSession->error', '', 'error: ' + error.message);
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
 * EMERGENCY FIX: Force clear jpsotraffic cache and refresh session
 * Run this function if users are stuck with jpsotraffic@gmail.com
 */
function emergencyFixJpsotrafficIssue() {
  console.log('🚨 EMERGENCY FIX: Clearing jpsotraffic@gmail.com cache...');
  
  try {
    // Clear all cached data
    const properties = PropertiesService.getScriptProperties();
    properties.deleteProperty('CACHED_USER_EMAIL');
    properties.deleteProperty('CACHED_USER_NAME');
    
    console.log('✅ Cleared cached user data');
    
    // Get fresh session
    const freshSession = getFreshUserSession();
    console.log('Fresh session:', freshSession);
    
    // Test authentication with fresh session
    const authResult = authenticateAndAuthorizeUser();
    console.log('Auth result after cache clear:', authResult);
    
    return {
      success: true,
      message: 'Emergency fix applied',
      freshSession: freshSession,
      authResult: authResult
    };
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * USER INSTRUCTION: Add this to your web interface
 * This creates a "Force Refresh Authentication" button for users
 */
function createAuthRefreshButton() {
  return `
<div style="margin: 20px; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px;">
  <h4>🔄 Authentication Issue?</h4>
  <p>If you're seeing the wrong user account, click this button to refresh your authentication:</p>
  <button onclick="forceAuthRefresh()" style="background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
    🔄 Refresh Authentication
  </button>
</div>

<script>
function forceAuthRefresh() {
  if (typeof google !== 'undefined' && google.script && google.script.run) {
    google.script.run
      .withSuccessHandler(function(result) {
        alert('Authentication refreshed! Reloading page...');
        window.location.reload();
      })
      .withFailureHandler(function(error) {
        alert('Refresh failed: ' + error.message);
      })
      .emergencyFixJpsotrafficIssue();
  } else {
    // Fallback: just reload the page
    alert('Reloading page to refresh authentication...');
    window.location.reload();
  }
}
</script>
  `;
}
/**
 * Fixed admin dashboard data function
 */
function getAdminDashboardData() {
  try {
    console.log('📊 Getting admin dashboard data...');
    
    // Use safe functions that handle errors
    let requests = [];
    let riders = [];
    let assignments = [];
    
    try {
      if (typeof getRequestsData === 'function') {
        const reqData = getRequestsData();
        if (reqData && reqData.data) {
          requests = reqData.data.map(row => mapRowToGenericObject(row, reqData.columnMap));
        } else if (Array.isArray(reqData)) {
          requests = reqData;
        }
      }
    } catch (e) {
      console.log('⚠️ Could not get requests data:', e.message);
      requests = [];
    }
    
    try {
      riders = getRidersDataSafe() || [];
    } catch (e) {
      console.log('⚠️ Could not get riders data:', e.message);
      riders = [];
    }
    
    try {
      if (typeof getAssignmentsData === 'function') {
        const assignData = getAssignmentsData();
        if (assignData && assignData.data) {
          assignments = assignData.data.map(row => mapRowToGenericObject(row, assignData.columnMap));
        } else if (Array.isArray(assignData)) {
          assignments = assignData;
        }
      }
    } catch (e) {
      console.log('⚠️ Could not get assignments data:', e.message);
      assignments = [];
    }
    
    const admins = getAdminUsersSafe();
    const dispatchers = getDispatcherUsersSafe();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDays = new Date(today);
    threeDays.setDate(today.getDate() + 3);

    // Escorts scheduled for today
    let escortsToday = 0;
    try {
      escortsToday = requests.filter(r => {
        const ev = r.eventDate || r['Event Date'] || r.date || r['Date'];
        if (!ev) return false;
        const d = new Date(ev);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      }).length;
    } catch (e) {
      console.log('⚠️ Error calculating escorts today:', e.message);
    }

    // Unassigned escorts in next 3 days
    let unassignedEscorts3d = 0;
    try {
      unassignedEscorts3d = requests.filter(r => {
        const ev = r.eventDate || r['Event Date'] || r.date || r['Date'];
        const status = (r.status || r['Status'] || '').toString();
        if (!ev) return false;
        const d = new Date(ev);
        d.setHours(0, 0, 0, 0);
        return d >= today && d <= threeDays && status !== 'Assigned';
      }).length;
    } catch (e) {
      console.log('⚠️ Error calculating unassigned escorts:', e.message);
    }

    // Calculate active riders
    const activeRiders = riders.filter(r => r.status === 'Active').length;
    
    const result = {
      totalRequests: requests.length,
      totalRiders: activeRiders,
      totalAssignments: assignments.length,
      unassignedEscorts3d: unassignedEscorts3d,
      escortsToday: escortsToday
    };
    
    console.log('✅ Admin dashboard data:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error getting admin dashboard data:', error);
    
    // Return default values instead of failing
    return {
      totalRequests: 0,
      totalRiders: 0,
      totalAssignments: 0,
      unassignedEscorts3d: 0,
      escortsToday: 0
    };
  }
}

/**
 * Convert a row array into an object using the provided column map.
 * @param {Array} row - The sheet row data.
 * @param {Object<string,number>} columnMap - Mapping of header name to index.
 * @return {Object} Row data as an object keyed by header.
 */
function mapRowToGenericObject(row, columnMap) {
  const obj = {};
  if (!row || !columnMap) return obj;
  for (const [header, idx] of Object.entries(columnMap)) {
    obj[header] = row[idx];
  }
  return obj;
}

/**
 * Get user management data for the dashboard
 */
function getUserManagementData() {
  try {
    console.log('📊 Getting user management data...');
    
    const riders = getRidersDataSafe() || [];
    const admins = getAdminUsersSafe() || [];
    const dispatchers = getDispatcherUsersSafe() || [];
    
    // Combine all users
    const allUsers = [];
    
    // Add riders
    riders.forEach(rider => {
      allUsers.push({
        id: rider.id || rider.jpNumber || rider['Rider ID'],
        name: rider.name || rider['Full Name'],
        email: rider.email || rider['Email'],
        googleEmail: rider.googleEmail || rider['Google Email'],
        role: 'Rider',
        status: rider.status || 'Unknown',
        avatar: (rider.name || 'R').charAt(0).toUpperCase(),
        lastLogin: rider.lastLogin || rider['Last Login'] || 'Unknown',
        type: 'rider'
      });
    });
    
    // Add admins
    admins.forEach((email, index) => {
      allUsers.push({
        id: 'admin_' + index,
        name: email.split('@')[0].replace(/[._]/g, ' '),
        email: email,
        googleEmail: email,
        role: 'Admin',
        status: 'Active',
        avatar: email.charAt(0).toUpperCase(),
        lastLogin: 'Unknown',
        type: 'admin'
      });
    });
    
    // Add dispatchers
    dispatchers.forEach((email, index) => {
      allUsers.push({
        id: 'dispatcher_' + index,
        name: email.split('@')[0].replace(/[._]/g, ' '),
        email: email,
        googleEmail: email,
        role: 'Dispatcher',
        status: 'Active',
        avatar: email.charAt(0).toUpperCase(),
        lastLogin: 'Unknown',
        type: 'dispatcher'
      });
    });
    
    // Calculate statistics
    const stats = {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(u => u.status === 'Active').length,
      pendingUsers: allUsers.filter(u => u.status === 'Pending').length,
      unmappedUsers: riders.filter(r => !r.googleEmail || r.googleEmail.trim() === '').length
    };
    
    return {
      success: true,
      stats: stats,
      users: allUsers
    };
    
  } catch (error) {
    console.error('❌ Error getting user management data:', error);
    return {
      success: false,
      error: error.message,
      stats: { totalUsers: 0, activeUsers: 0, pendingUsers: 0, unmappedUsers: 0 },
      users: []
    };
  }
}
/**
 * Extract name from email address as fallback
 */
function extractNameFromEmail(email) {
  if (!email) return 'User';
  
  try {
    // Get part before @
    const localPart = email.split('@')[0];
    
    // Split by dots or underscores and capitalize
    const nameParts = localPart.split(/[._]/).map(part => 
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    );
    
    return nameParts.join(' ');
  } catch (error) {
    return 'User';
  }
}
/**
 * 🔐 COMPLETE AUTHENTICATION FUNCTIONS
 * Add these to your Authentication.js file (or Code.js if you prefer)
 * These are the missing functions that are causing the errors
 */

/**
 * Main authentication and authorization function
 */
function authenticateAndAuthorizeUser() {
  try {
    console.log('🔐 authenticateAndAuthorizeUser called');
    
    // Get user session
    const userSession = getEnhancedUserSession();
    traceAuthFunction('authenticateAndAuthorizeUser->session', userSession.email, userSession.source);
    
    if (!userSession.hasEmail) {
      traceAuthFunction('authenticateAndAuthorizeUser', 'NO_EMAIL', 'no_session');
      return {
        success: false,
        error: 'NO_EMAIL',
        message: 'Please sign in with your Google account'
      };
    }
    
    // Check authorization
    const rider = getRiderByGoogleEmailSafe(userSession.email);
    const adminUsers = getAdminUsersSafe();
    const dispatcherUsers = getDispatcherUsersSafe();

    let userRole = 'unauthorized';
    let permissions = [];

    const isAdmin = adminUsers.includes(userSession.email);
    const isDispatcher = dispatcherUsers.includes(userSession.email);

    // Prefer dispatcher role if user appears in both lists
    // console.log('🔍 Checking admin users:', adminUsers); // Original log
    console.log(`🔐 Authenticating user: ${userSession.email}`);

    if (isDispatcher) {
      userRole = 'dispatcher';
      permissions = PERMISSIONS_MATRIX.dispatcher; // Assign full permissions object
      console.log(`✅ User ${userSession.email} authorized as: dispatcher`);
      traceAuthFunction('authenticateAndAuthorizeUser->role', userSession.email, 'dispatcher');
    } else if (isAdmin) {
      userRole = 'admin';
      permissions = PERMISSIONS_MATRIX.admin; // Assign full permissions object
      console.log(`✅ User ${userSession.email} authorized as: admin`);
      traceAuthFunction('authenticateAndAuthorizeUser->role', userSession.email, 'admin');
    } else if (rider && rider.status === 'Active') {
      userRole = 'rider';
      permissions = PERMISSIONS_MATRIX.rider; // Assign full permissions object
      console.log(`✅ User ${userSession.email} authorized as: rider`);
      traceAuthFunction('authenticateAndAuthorizeUser->role', userSession.email, 'rider');
    } else {
      console.log(`🚫 User ${userSession.email} is UNAUTHORIZED.`);
      traceAuthFunction('authenticateAndAuthorizeUser->role', userSession.email, 'unauthorized');
      return {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Your account is not authorized to access this system',
        userEmail: userSession.email,
        userName: userSession.name,
        user: {
          name: userSession.name || 'User',
          email: userSession.email,
          roles: ['unauthorized'],
          role: 'unauthorized',
          permissions: []
        }
      };
    }
    
    const authenticatedUser = {
      name: userSession.name || rider?.name || 'User',
      email: userSession.email,
      role: userRole,
      roles: [userRole], // for backward compatibility with older code
      permissions: permissions,
      avatar: (userSession.name || rider?.name || 'U').charAt(0).toUpperCase()
    };
    
    traceAuthFunction('authenticateAndAuthorizeUser->final', authenticatedUser.email, `role:${userRole}`);
    
    return {
      success: true,
      user: authenticatedUser,
      rider: rider
    };
    
  } catch (error) {
    console.error('❌ Authentication error:', error);
    traceAuthFunction('authenticateAndAuthorizeUser->error', '', 'error: ' + error.message);
    return {
      success: false,
      error: 'AUTH_ERROR',
      message: 'Authentication system error: ' + error.message
    };
  }
}
function clearAuthTrace() {
  AUTH_TRACE = [];
  console.log('✅ Authentication trace cleared');
}

/**
 * Run a complete trace test
 
function runCompleteAuthTrace() {
  console.log('🔍 === RUNNING COMPLETE AUTH TRACE ===');
  
  // Clear previous trace
  clearAuthTrace();
  
  // Test the main authentication flow
  console.log('1. Testing doGet authentication flow...');
  try {
    const mockEvent = { parameter: { page: 'dashboard' } };
    const result = doGet(mockEvent);
    console.log('✅ doGet completed');
  } catch (error) {
    console.log('❌ doGet failed:', error.message);
  }
  
  // Test getCurrentUser directly
  console.log('\n2. Testing getCurrentUser directly...');
  try {
    const currentUser = getCurrentUser();
    console.log('✅ getCurrentUser completed:', currentUser.email);
  } catch (error) {
    console.log('❌ getCurrentUser failed:', error.message);
  }
  
  // Show the trace
  console.log('\n3. Authentication trace results:');
  viewAuthTrace();
  
  return AUTH_TRACE;
}
*/
/**
 * Function to view the authentication trace
 */
function viewAuthTrace() {
  console.log('🔍 === AUTHENTICATION TRACE ===');
  AUTH_TRACE.forEach((entry, index) => {
    console.log(`${index + 1}. ${entry.timestamp} | ${entry.function} -> ${entry.email} (${entry.source})`);
  });
  
  // Show jpsotraffic entries specifically
  const jpsotrafficEntries = AUTH_TRACE.filter(entry => entry.email === 'jpsotraffic@gmail.com');
  if (jpsotrafficEntries.length > 0) {
    console.log('\n🚨 JPSOTRAFFIC@GMAIL.COM ENTRIES:');
    jpsotrafficEntries.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.function} -> ${entry.source}`);
    });
  }
  
  return AUTH_TRACE;
}



/**
 * Extract name from email address as fallback
 */
function extractNameFromEmail(email) {
  if (!email) return 'User';
  
  try {
    const localPart = email.split('@')[0];
    const nameParts = localPart.split(/[._]/).map(part => 
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    );
    return nameParts.join(' ');
  } catch (error) {
    return 'User';
  }
}

/**
 * Safe wrapper for getting rider by Google email
 */
function getRiderByGoogleEmailSafe(email) {
  try {
    if (typeof getRiderByGoogleEmail === 'function') {
      return getRiderByGoogleEmail(email);
    }
    
    // Fallback: direct sheet access
    console.log('🔄 Using fallback rider lookup...');
    return getRiderByGoogleEmailFallback(email);
    
  } catch (error) {
    console.error('❌ Error in getRiderByGoogleEmailSafe:', error);
    return null;
  }
}

/**
 * Fallback method to get rider by Google email
 */
function getRiderByGoogleEmailFallback(email) {
  console.log(`🔄 Fallback: Attempting to get rider by Google Email: ${email}`);
  const ridersSheetName = CONFIG.sheets.riders;
  console.log(`🔄 Fallback: Accessing sheet: ${ridersSheetName}`);

  try {
    const ridersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ridersSheetName);
    if (!ridersSheet) {
      console.log(`⚠️ Fallback: Riders sheet "${ridersSheetName}" not found.`);
      return null;
    }
    console.log(`✅ Fallback: Successfully accessed sheet: ${ridersSheetName}`);
    
    const data = ridersSheet.getDataRange().getValues();
    if (data.length < 2) {
      console.log(`⚠️ Fallback: No data (or only headers) in sheet: ${ridersSheetName}`);
      return null;
    }
    
    const headers = data[0];
    console.log(`🔄 Fallback: Headers found: ${headers.join(', ')}`);

    const requiredColumns = {
      email: CONFIG.columns.riders.email,
      googleEmail: CONFIG.columns.riders.googleEmail,
      name: CONFIG.columns.riders.name,
      status: CONFIG.columns.riders.status,
      jpNumber: CONFIG.columns.riders.jpNumber
    };

    const columnIndices = {};
    let allHeadersFound = true;

    for (const key in requiredColumns) {
      const headerName = requiredColumns[key];
      console.log(`🔄 Fallback: Searching for header: "${headerName}" for ${key}`);
      const index = headers.indexOf(headerName);
      if (index === -1) {
        console.log(`⚠️ Fallback: Required header "${headerName}" for ${key} not found in sheet: ${ridersSheetName}.`);
        allHeadersFound = false;
      }
      columnIndices[key] = index;
    }

    if (!allHeadersFound) {
      console.log(`⚠️ Fallback: Not all required headers found. Cannot reliably map rider data.`);
      // Depending on strictness, you might return null here or proceed with available columns.
      // For now, we'll proceed if core email columns are present.
      if (columnIndices.email === -1 && columnIndices.googleEmail === -1) {
        return null;
      }
    }
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const riderEmail = row[emailCol];
      const googleEmail = row[googleEmailCol];
      
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
    console.error(`❌ Fallback: Error in getRiderByGoogleEmailFallback for sheet ${ridersSheetName}:`, error.message, error.stack);
    return null;
  }
}

/**
 * Safe wrapper for getting admin users
 */
function getAdminUsersSafe() {
  try {
    if (typeof getAdminUsers === 'function') {
      return getAdminUsers();
    }
    
    return getAdminUsersFallback();
    
  } catch (error) {
    console.error('❌ Error getting admin users:', error);
    return []; // Return empty array on error
  }
}

/**
 * Fallback method to get admin users
 */
function getAdminUsersFallback() {
  const settingsSheetName = CONFIG.sheets.settings;
  const adminRangeA1 = 'B2:B10'; // Example range
  console.log(`🔄 Fallback: Attempting to get admin users from sheet: "${settingsSheetName}", range: ${adminRangeA1}`);

  try {
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(settingsSheetName);
    if (!settingsSheet) {
      console.log(`⚠️ Fallback: Settings sheet "${settingsSheetName}" not found. Returning empty list.`);
      return [];
    }
    console.log(`✅ Fallback: Accessed settings sheet: "${settingsSheetName}"`);

    console.log(`🔄 Fallback: Reading admin emails from range: ${adminRangeA1}`);
    const adminRange = settingsSheet.getRange(adminRangeA1).getValues();
    const admins = adminRange.flat().filter(email => email && email.trim());

    if (admins.length > 0) {
      console.log(`✅ Fallback: Loaded ${admins.length} admins from settings sheet:`, admins);
      if (admins.includes('jpsotraffic@gmail.com')) {
        console.log("⚠️ INVESTIGATION: 'jpsotraffic@gmail.com' IS present in the admin list returned by getAdminUsersFallback.");
      } else {
        console.log("ℹ️ INVESTIGATION: 'jpsotraffic@gmail.com' IS NOT present in the admin list returned by getAdminUsersFallback.");
      }
      return admins;
    } else {
      console.log(`⚠️ Fallback: No admin emails found in range ${adminRangeA1} of sheet "${settingsSheetName}". Returning empty list.`);
      // Even if the list is empty, perform the check (it will be false)
      if (admins.includes('jpsotraffic@gmail.com')) { // This will be false
        console.log("⚠️ INVESTIGATION: 'jpsotraffic@gmail.com' IS present in the admin list returned by getAdminUsersFallback (empty list scenario - unexpected).");
      } else {
        console.log("ℹ️ INVESTIGATION: 'jpsotraffic@gmail.com' IS NOT present in the admin list returned by getAdminUsersFallback (empty list scenario).");
      }
      return [];
    }
  } catch (error) {
    console.log(`❌ Fallback: Could not read Settings sheet "${settingsSheetName}" for admin users. Error: ${error.message}. Returning empty list.`);
    // Log for the error case before returning empty array
    console.log("ℹ️ INVESTIGATION: 'jpsotraffic@gmail.com' IS NOT present in the admin list due to an error in getAdminUsersFallback.");
    return []; // Return empty array on error
  }
}

/**
 * Safe wrapper for getting dispatcher users
 */
function getDispatcherUsersSafe() {
  try {
    if (typeof getDispatcherUsers === 'function') {
      return getDispatcherUsers();
    }
    
    return getDispatcherUsersFallback();
    
  } catch (error) {
    console.error('❌ Error getting dispatcher users:', error);
    return [];
  }
}

/**
 * Fallback method to get dispatcher users
 */
function getDispatcherUsersFallback() {
  const settingsSheetName = CONFIG.sheets.settings;
  const dispatcherRangeA1 = 'C2:C10'; // Example range
  console.log(`🔄 Fallback: Attempting to get dispatcher users from sheet: "${settingsSheetName}", range: ${dispatcherRangeA1}`);

  try {
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(settingsSheetName);
    if (!settingsSheet) {
      console.log(`⚠️ Fallback: Settings sheet "${settingsSheetName}" not found. Returning empty list.`);
      return [];
    }
    console.log(`✅ Fallback: Accessed settings sheet: "${settingsSheetName}"`);

    console.log(`🔄 Fallback: Reading dispatcher emails from range: ${dispatcherRangeA1}`);
    const dispatcherRange = settingsSheet.getRange(dispatcherRangeA1).getValues();
    const dispatchers = dispatcherRange.flat().filter(email => email && email.trim());

    if (dispatchers.length > 0) {
      console.log(`✅ Fallback: Loaded ${dispatchers.length} dispatchers from settings sheet:`, dispatchers);
      return dispatchers;
    } else {
      console.log(`⚠️ Fallback: No dispatcher emails found in range ${dispatcherRangeA1} of sheet "${settingsSheetName}". Returning empty list.`);
      return [];
    }
  } catch (error) {
    console.log(`❌ Fallback: Could not read Settings sheet "${settingsSheetName}" for dispatcher users. Error: ${error.message}. Returning empty list.`);
    return []; // Return empty array on error
  }
}

/**
 * Check file exists function
 */
function checkFileExists(fileName) {
  try {
    HtmlService.createHtmlOutputFromFile(fileName);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Safe wrapper for getting web app URL
 */
function getWebAppUrl() {
  try {
    return ScriptApp.getService().getUrl();
  } catch (error) {
    console.error('Error getting web app URL:', error);
    return '#';
  }
}

/**
 * Safe page access checking
 */
function checkPageAccessSafe(pageName, user, rider) {
  try {
    const rolePermissions = {
      admin: [
        'dashboard', 'requests', 'assignments', 'riders', 'notifications', 
        'reports', 'admin-schedule', 'user-management', 'auth-setup'
      ],
      dispatcher: [
        'dashboard', 'requests', 'assignments', 'notifications', 'reports'
      ],
      rider: [
        'dashboard', 'rider-schedule', 'my-assignments', 'my-profile'
      ]
    };
    
    const allowedPages = rolePermissions[user.role] || [];
    
    if (allowedPages.includes(pageName)) {
      return { allowed: true };
    }
    
    return { 
      allowed: false, 
      reason: `Access to ${pageName} is not allowed for ${user.role} role` 
    };
    
  } catch (error) {
    console.error('❌ Error in checkPageAccessSafe:', error);
    return { allowed: true }; // Default to allow to prevent lockouts
  }
}

/**
 * Update rider's last login timestamp
 */
function updateRiderLastLoginSafe(riderId) {
  try {
    if (!riderId) return;
    
    console.log(`📅 Updating last login for rider ${riderId}`);
    
    const ridersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riders');
    if (!ridersSheet) return;
    
    const data = ridersSheet.getDataRange().getValues();
    const headers = data[0];
    
    const idCol = headers.indexOf('Rider ID');
    const lastLoginCol = headers.indexOf('Last Login');
    
    if (idCol === -1) return;
    
    // Add Last Login column if it doesn't exist
    if (lastLoginCol === -1) {
      const newCol = headers.length + 1;
      ridersSheet.getRange(1, newCol).setValue('Last Login');
      
      // Find rider and update
      for (let i = 1; i < data.length; i++) {
        if (data[i][idCol] === riderId) {
          ridersSheet.getRange(i + 1, newCol).setValue(new Date());
          break;
        }
      }
    } else {
      // Update existing column
      for (let i = 1; i < data.length; i++) {
        if (data[i][idCol] === riderId) {
          ridersSheet.getRange(i + 1, lastLoginCol + 1).setValue(new Date());
          break;
        }
      }
    }
    
    console.log(`✅ Updated last login for rider ${riderId}`);
    
  } catch (error) {
    console.error('❌ Error updating last login:', error);
  }
}

/**
 * Create error pages with sign-in options
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

/**
 * Create unauthorized access page
 */
function createUnauthorizedPage(email, name) {
  const webAppUrl = getWebAppUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Access Denied - Escort Management</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
      margin: 0;
      padding: 2rem;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
      max-width: 500px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    .title {
      color: #d63031;
      margin-bottom: 1rem;
    }
    .message {
      color: #636e72;
      margin-bottom: 2rem;
      line-height: 1.5;
    }
    .user-info {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }
    .btn {
      background: #0984e3;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      text-decoration: none;
      display: inline-block;
      font-weight: 600;
      transition: all 0.3s;
      margin: 0 10px;
    }
    .btn:hover {
      background: #74b9ff;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🚫</div>
    <h1 class="title">Access Denied</h1>
    <p class="message">Your account is not authorized to access this system. Please contact your administrator to request access.</p>
    
    <div class="user-info">
      <strong>Account Details:</strong><br>
      Email: ${email || 'Unknown'}<br>
      Name: ${name || 'Not provided'}
    </div>
    
    <a href="${webAppUrl}?auth=logout" class="btn">Try Different Account</a>
    <a href="mailto:admin@yourdomain.com" class="btn">Contact Admin</a>
  </div>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Access Denied - Escort Management');
}

/**
 * Create access denied page for insufficient permissions
 */
function createAccessDeniedPage(reason, user) {
  const webAppUrl = getWebAppUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Access Denied - Escort Management</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%);
      margin: 0;
      padding: 2rem;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
      max-width: 500px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    .title {
      color: #e17055;
      margin-bottom: 1rem;
    }
    .message {
      color: #636e72;
      margin-bottom: 2rem;
      line-height: 1.5;
    }
    .user-info {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }
    .btn {
      background: #00b894;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      text-decoration: none;
      display: inline-block;
      font-weight: 600;
      transition: all 0.3s;
    }
    .btn:hover {
      background: #00a085;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⛔</div>
    <h1 class="title">Insufficient Permissions</h1>
    <p class="message">${reason || 'You do not have permission to access this resource.'}</p>
    
    <div class="user-info">
      <strong>Current User:</strong> ${user ? user.email : 'Unknown'}<br>
      <strong>Role:</strong> ${user ? user.role : 'None'}
    </div>
    
    <a href="${webAppUrl}" class="btn">Return to Dashboard</a>
  </div>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Access Denied - Escort Management');
}


/**
 * Simple test authentication function
 */
function testAuthenticationSimple() {
  try {
    console.log('🧪 Testing simple authentication...');
    
    const userSession = getEnhancedUserSession();
    console.log('1. User session:', userSession);
    
    if (userSession.hasEmail) {
      const authResult = authenticateAndAuthorizeUser();
      console.log('2. Authorization result:', authResult);
      
      return {
        success: true,
        userSession: userSession,
        authResult: authResult
      };
    } else {
      return {
        success: false,
        error: 'No user session found',
        userSession: userSession
      };
    }
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}


/**
 * Enhanced sign-in page that handles user detection better
 */
function createSignInPageEnhanced() {
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
            color: #4285f4;
            font-weight: bold;
        }
        .info {
            background: #e8f4f8;
            padding: 20px;
            border-radius: 10px;
            margin: 30px 0;
            border-left: 4px solid #3498db;
        }
        .debug-info {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            font-size: 12px;
            text-align: left;
            font-family: monospace;
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
        <h2>Google Sign In Required</h2>
        
        <div class="info">
            <p><strong>📋 Authentication Steps:</strong></p>
            <ol style="text-align: left;">
                <li>Click "Sign In with Google" below</li>
                <li>Choose your authorized Google account</li>
                <li>Grant necessary permissions</li>
                <li>Access your dashboard</li>
            </ol>
        </div>
        
        <!-- Primary Sign-In Method -->
        <a href="${webAppUrl}" class="signin-btn">
            <div class="google-icon">G</div>
            Sign In with Google
        </a>
        
        <!-- Debug Information -->
        <div class="debug-info">
            <strong>🔧 Debug Info:</strong><br>
            <span id="debugInfo">Loading...</span>
        </div>
        
        <!-- Alternative Methods -->
        <div style="margin: 20px 0;">
            <p><strong>Alternative access methods:</strong></p>
            <a href="${webAppUrl}?t=${Date.now()}" class="alternative-btn">🔄 Force Reload</a>
            <a href="${webAppUrl}" class="alternative-btn" target="_blank">🆕 New Window</a>
            <button class="alternative-btn" onclick="testUserSession()">🧪 Test Session</button>
        </div>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
            Having trouble? Try refreshing the page or using a different browser.
        </p>
    </div>
    
    <script>
        function handleSignIn() {
            // OAuth prompt occurs automatically when visiting the web app.
        }
        
        function testUserSession() {
            document.getElementById('debugInfo').innerHTML = 'Testing user session...';
            
            // This will trigger a new request to test authentication
            fetch('${webAppUrl}?test=session&t=' + Date.now())
                .then(response => response.text())
                .then(data => {
                    if (data.includes('dashboard') || data.includes('requests')) {
                        document.getElementById('debugInfo').innerHTML = '✅ Session active - redirecting...';
                        setTimeout(() => window.location.href = '${webAppUrl}', 1000);
                    } else {
                        document.getElementById('debugInfo').innerHTML = '❌ No active session';
                    }
                })
                .catch(error => {
                    document.getElementById('debugInfo').innerHTML = '⚠️ Test failed: ' + error.message;
                });
        }
        
        // Auto-detect current state
        document.addEventListener('DOMContentLoaded', function() {
            const debugInfo = document.getElementById('debugInfo');
            debugInfo.innerHTML = 'User Agent: ' + navigator.userAgent.substring(0, 50) + '...';
            
            // Try to detect if we're in an iframe or popup
            if (window !== window.top) {
                debugInfo.innerHTML += '<br>📱 In iframe/popup';
            } else {
                debugInfo.innerHTML += '<br>🖥️ Full window';
            }
            
            // Check if we have any stored auth info
            if (localStorage.getItem) {
                try {
                    const stored = localStorage.getItem('lastSignIn');
                    if (stored) {
                        debugInfo.innerHTML += '<br>💾 Previous sign-in detected';
                    }
                } catch (e) {
                    debugInfo.innerHTML += '<br>🚫 Local storage unavailable';
                }
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
 * Create the hybrid login page with both Google and credential options
 */
function createHybridLoginPage() {
  const webAppUrl = getWebAppUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <title>Login - Escort Management</title>
  <style>
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: 0; 
      padding: 2rem;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login-container {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      max-width: 400px;
      width: 100%;
      text-align: center;
    }
    .logo { 
      font-size: 3rem; 
      margin-bottom: 1rem; 
    }
    .title { 
      color: #333; 
      margin-bottom: 2rem; 
    }
    .auth-option {
      margin: 1rem 0;
      padding: 1rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #f9f9f9;
    }
    .auth-option h3 {
      margin: 0 0 0.5rem 0;
      color: #333;
    }
    .auth-option p {
      margin: 0 0 1rem 0;
      color: #666;
      font-size: 0.9rem;
    }
    .btn {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      transition: all 0.3s;
      text-decoration: none;
      display: inline-block;
      color: white;
    }
    .btn-google {
      background: #4285f4;
    }
    .btn-google:hover {
      background: #3367d6;
    }
    .btn-credentials {
      background: #34a853;
    }
    .btn-credentials:hover {
      background: #137333;
    }
    .divider {
      text-align: center;
      margin: 1.5rem 0;
      color: #666;
      position: relative;
    }
    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #ddd;
    }
    .divider span {
      background: white;
      padding: 0 1rem;
    }
    .debug-info {
      margin-top: 2rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 6px;
      font-size: 0.8rem;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="logo">🏍️</div>
    <h1 class="title">Escort Management System</h1>
    
    <div class="auth-option">
      <h3>🔐 Google Account</h3>
      <p>Sign in with your authorized Google account</p>
      <a href="${webAppUrl}?auth=google" class="btn btn-google">
        Sign In with Google
      </a>
    </div>
    
    <div class="divider">
      <span>or</span>
    </div>
    
    <div class="auth-option">
      <h3>👤 System Login</h3>
      <p>Use your system username and password</p>
      <a href="${webAppUrl}?auth=credentials" class="btn btn-credentials">
        System Login
      </a>
    </div>
    
    <div class="debug-info">
      <strong>Debug Info:</strong><br>
      Current URL: ${webAppUrl}<br>
      Timestamp: ${new Date().toISOString()}
    </div>
  </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('Login - Escort Management')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}





// 🛡️ ADDITIONAL SAFE WRAPPER FUNCTIONS

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

function getPageFileNameSafe(pageName, userRole) {
  try {
    if (typeof getPageFileName === 'function') {
      return getPageFileName(pageName, userRole);
    }
    
    // Fallback mapping
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

function addNavigationToContentSafe(content, navigationHtml) {
  try {
    console.log('addNavigationToContentSafe: Called. Navigation HTML length: ' + (navigationHtml ? navigationHtml.length : 'null')); // Added
    console.log('addNavigationToContentSafe: Placeholder found: ' + content.includes('<!--NAVIGATION_MENU_PLACEHOLDER-->')); // Added
    console.log('addNavigationToContentSafe: Header end found: ' + content.includes('</header>')); // Added
    const originalContentLength = content.length; // Store original length
    console.log('addNavigationToContentSafe: Content length before: ' + originalContentLength); // Added

    // Check if a more specific addNavigationToContent exists and is not this function itself
    if (typeof addNavigationToContent === 'function' && addNavigationToContent.toString() !== addNavigationToContentSafe.toString()) {
      content = addNavigationToContent(content, navigationHtml);
      console.log('addNavigationToContentSafe: Content length after (delegated to addNavigationToContent): ' + content.length); // Added
      return content;
    }
    
    // Simple fallback injection
    if (content.includes('<!--NAVIGATION_MENU_PLACEHOLDER-->')) {
      content = content.replace('<!--NAVIGATION_MENU_PLACEHOLDER-->', navigationHtml);
    } else if (content.includes('</header>')) {
      content = content.replace('</header>', `</header>\n${navigationHtml}\n`);
    }
    // If no specific placeholder, try to append before </body> or at the end
    else if (content.includes('</body>')) {
        content = content.replace('</body>', navigationHtml + '\n</body>');
    } else {
        content += navigationHtml;
    }
    console.log('addNavigationToContentSafe: Content length after (fallback injection): ' + content.length); // Added
    
    return content;
    
  } catch (error) {
    console.error('Error adding navigation to content:', error);
    return content; // Return original content on error
  }
}

function addUserDataInjectionSafe(htmlOutput, user, rider) { // Changed signature
  try {
    if (typeof addUserDataInjection === 'function' && addUserDataInjection.toString().includes("htmlOutput")) { // Basic check if it's already the new version
      return addUserDataInjection(htmlOutput, user, rider); // Call the potentially overridden new version
    }

    // Restore userScript to define window.currentUser
    const userScript = `
<script>
window.currentUser = {
  name: '${escapeJsString(user.name)}',
  email: '${escapeJsString(user.email)}',
  role: '${escapeJsString(user.role)}',
  permissions: ${JSON.stringify(user.permissions)},
  riderId: '${rider ? escapeJsString(rider.id) : ''}',
  isRider: ${rider ? 'true' : 'false'}
};
console.log('👤 User context loaded via addUserDataInjectionSafe (appended).');
</script>`;

    let content = htmlOutput.getContent();
    if (content.includes('</body>')) {
      content = content.replace('</body>', userScript + '\n</body>');
    } else if (content.includes('</html>')) {
      content = content.replace('</html>', userScript + '\n</html>');
    } else {
      content += userScript;
    }

    htmlOutput.setContent(content);
    // No return needed, or return htmlOutput if preferred by other parts of the system

  } catch (error) {
    console.error('Error adding user data injection:', error);
    // Potentially return htmlOutput or throw, depending on error handling strategy
  }
}

function createErrorPageWithSignInSafe(error) {
  try {
    if (typeof createErrorPageWithSignIn === 'function') {
      return createErrorPageWithSignIn(error);
    }
    
    return createSignInPageEnhanced();
    
  } catch (e) {
    console.error('Error creating error page:', e);
    return HtmlService.createHtmlOutput('System Error - Please contact administrator');
  }
}

/**
 * Test function to debug user session issues
 */
function debugUserSession() {
  console.log('🧪 Debugging user session...');
  
  const session = getEnhancedUserSession();
  console.log('Enhanced session result:', session);
  
  try {
    const user = Session.getActiveUser();
    console.log('Raw user object type:', typeof user);
    console.log('Raw user object:', user);
    
    if (user) {
      console.log('Available methods:');
      console.log('- getEmail:', typeof user.getEmail);
      console.log('- getName:', typeof user.getName);
      console.log('- email property:', user.email);
      console.log('- name property:', user.name);
    }
  } catch (error) {
    console.error('Error debugging session:', error);
  }
  
  return session;
}
/**
 * Check if user has specific permission
 */
function hasPermission(user, resource, action) {
  try {
    if (!user || !user.role) {
      console.log('❌ No user or role provided');
      return false;
    }
    
    const rolePermissions = PERMISSIONS_MATRIX[user.role];
    if (!rolePermissions) {
      console.log(`❌ Unknown role: ${user.role}`);
      return false;
    }
    
    const resourcePermissions = rolePermissions[resource];
    if (!resourcePermissions) {
      console.log(`❌ No permissions defined for resource: ${resource}`);
      return false;
    }
    
    const hasAccess = resourcePermissions[action] === true;
    console.log(`🔒 Permission check: ${user.role} -> ${resource}.${action} = ${hasAccess}`);
    
    return hasAccess;
    
  } catch (error) {
    console.error('❌ Permission check error:', error);
    return false;
  }
}

/**
 * Check if user can access specific resource instance
 */
function canAccessResource(user, resource, resourceId) {
  try {
    if (!user || !user.role) return false;
    
    const accessCheck = RESOURCE_ACCESS[resource];
    if (!accessCheck) return false;
    
    const roleCheck = accessCheck[user.role];
    if (!roleCheck) return false;
    
    return roleCheck(user, resourceId);
    
  } catch (error) {
    console.error('❌ Resource access check error:', error);
    return false;
  }
}

/**
 * Check if user can access a specific page
 */
function canAccessPage(user, pageName) {
  try {
    if (!user || !user.role) return false;
    
    const rolePermissions = PERMISSIONS_MATRIX[user.role];
    if (!rolePermissions || !rolePermissions.pages) return false;
    
    return rolePermissions.pages.includes(pageName);
    
  } catch (error) {
    console.error('❌ Page access check error:', error);
    return false;
  }
}

/**
 * Get filtered data based on user permissions
 */
function getFilteredRequests(user, filters = {}) {
  try {
    const allRequests = getRequestsData();
    
    if (hasPermission(user, 'requests', 'view_all')) {
      // Admin/Dispatcher can see all requests
      return applyFilters(allRequests, filters);
    } else if (user.role === 'rider') {
      // Riders can only see requests they're assigned to
      const riderAssignments = getAssignmentsForRider(user.riderId);
      const assignedRequestIds = riderAssignments.map(a => a.requestId);
      
      const filteredRequests = allRequests.filter(request => 
        assignedRequestIds.includes(request.id)
      );
      
      return applyFilters(filteredRequests, filters);
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ Error filtering requests:', error);
    return [];
  }
}

/**
 * Get filtered riders based on user permissions
 */
function getFilteredRiders(user) {
  try {
    const allRiders = getRidersData();
    
    if (hasPermission(user, 'riders', 'view_all')) {
      // Admin/Dispatcher can see all riders
      return allRiders;
    } else if (user.role === 'rider') {
      // Riders can only see their own profile
      return allRiders.filter(rider => rider.id === user.riderId);
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ Error filtering riders:', error);
    return [];
  }
}

/**
 * Get filtered assignments based on user permissions
 */
function getFilteredAssignments(user, filters = {}) {
  try {
    const allAssignments = getAssignmentsData();
    
    if (hasPermission(user, 'assignments', 'view_all')) {
      // Admin/Dispatcher can see all assignments
      return applyFilters(allAssignments, filters);
    } else if (user.role === 'rider') {
      // Riders can only see their own assignments
      const filteredAssignments = allAssignments.filter(assignment => 
        assignment.riderId === user.riderId
      );
      
      return applyFilters(filteredAssignments, filters);
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ Error filtering assignments:', error);
    return [];
  }
}

/**
 * Validate request data based on user permissions
 */
function validateRequestOperation(user, operation, requestData, requestId = null) {
  try {
    // Check if user has permission for this operation
    if (!hasPermission(user, 'requests', operation)) {
      return { 
        valid: false, 
        error: `You don't have permission to ${operation} requests` 
      };
    }
    
    // For updates/deletes, check if user can access this specific request
    if ((operation === 'update' || operation === 'delete') && requestId) {
      if (!canAccessResource(user, 'requests', requestId)) {
        return { 
          valid: false, 
          error: 'You cannot access this request' 
        };
      }
    }
    
    // Additional validation based on role
    if (user.role === 'dispatcher' && operation === 'delete') {
      return { 
        valid: false, 
        error: 'Dispatchers cannot delete requests' 
      };
    }
    
    return { valid: true };
    
  } catch (error) {
    console.error('❌ Request validation error:', error);
    return { valid: false, error: 'Validation error occurred' };
  }
}

/**
 * Validate assignment operation based on user permissions
 */
function validateAssignmentOperation(user, operation, assignmentData, assignmentId = null) {
  try {
    if (!hasPermission(user, 'assignments', operation)) {
      return { 
        valid: false, 
        error: `You don't have permission to ${operation} assignments` 
      };
    }
    
    // Riders can only update status of their own assignments
    if (user.role === 'rider' && operation === 'update') {
      if (!assignmentId || !canAccessResource(user, 'assignments', assignmentId)) {
        return { 
          valid: false, 
          error: 'You can only update your own assignments' 
        };
      }
      
      // Riders can only update status, not other fields
      const allowedFields = ['status', 'notes', 'completionDate'];
      const updateFields = Object.keys(assignmentData);
      const invalidFields = updateFields.filter(field => !allowedFields.includes(field));
      
      if (invalidFields.length > 0) {
        return { 
          valid: false, 
          error: `You can only update: ${allowedFields.join(', ')}` 
        };
      }
    }
    
    return { valid: true };
    
  } catch (error) {
    console.error('❌ Assignment validation error:', error);
    return { valid: false, error: 'Validation error occurred' };
  }
}

/**
 * Get user's dashboard data based on permissions
 */
function getDashboardDataForUser(user) {
  try {
    const dashboardData = {
      user: user,
      stats: {},
      recentActivity: [],
      notifications: []
    };
    
    if (user.role === 'admin') {
      dashboardData.stats = {
        totalRequests: getRequestsData().length,
        activeRiders: getRidersData().filter(r => r.status === 'Active').length,
        pendingAssignments: getAssignmentsData().filter(a => a.status === 'Pending').length,
        completedThisMonth: getCompletedRequestsThisMonth()
      };
      dashboardData.recentActivity = getRecentSystemActivity();
      dashboardData.notifications = getSystemNotifications();
      
    } else if (user.role === 'dispatcher') {
      dashboardData.stats = {
        totalRequests: getRequestsData().length,
        pendingAssignments: getAssignmentsData().filter(a => a.status === 'Pending').length,
        todaysEscorts: getTodaysEscorts(),
        availableRiders: getAvailableRiders().length
      };
      dashboardData.recentActivity = getRecentDispatchActivity();
      dashboardData.notifications = getDispatchNotifications();
      
    } else if (user.role === 'rider') {
      const myAssignments = getAssignmentsForRider(user.riderId);
      dashboardData.stats = {
        myAssignments: myAssignments.length,
        pendingAssignments: myAssignments.filter(a => a.status === 'Pending').length,
        completedThisMonth: myAssignments.filter(a => 
          a.status === 'Completed' && 
          isThisMonth(a.completionDate)
        ).length,
        nextEscort: getNextEscortForRider(user.riderId)
      };
      dashboardData.recentActivity = getRiderActivity(user.riderId);
      dashboardData.notifications = getRiderNotifications(user.riderId);
    }
    
    return dashboardData;
    
  } catch (error) {
    console.error('❌ Error getting dashboard data:', error);
    return { user: user, stats: {}, recentActivity: [], notifications: [] };
  }
}

/**
 * Apply filters to data arrays
 */
function applyFilters(data, filters) {
  try {
    let filteredData = [...data];
    
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value && value !== '') {
        filteredData = filteredData.filter(item => {
          if (typeof item[key] === 'string') {
            return item[key].toLowerCase().includes(value.toLowerCase());
          }
          return item[key] === value;
        });
      }
    });
    
    return filteredData;
    
  } catch (error) {
    console.error('❌ Error applying filters:', error);
    return data;
  }
}

/**
 * Get user's allowed navigation menu
 */
function getUserNavigationMenu(user) {
  try {
    const rolePermissions = PERMISSIONS_MATRIX[user.role];
    if (!rolePermissions || !rolePermissions.pages) {
      return [];
    }
    
    const pageLabels = {
      'dashboard': '📊 Dashboard',
      'requests': '📋 Requests',
      'assignments': '🏍️ Assignments',
      'riders': '👥 Riders',
      'notifications': '📱 Notifications',
      'reports': '📊 Reports',
      'rider-schedule': '📅 My Schedule',
      'my-assignments': '🏍️ My Assignments',
      'my-profile': '👤 My Profile',
      'admin-schedule': '📅 Admin Schedule',
      'settings': '⚙️ Settings'
    };
    
    const baseUrl = getWebAppUrlSafe();
    const usingLocal = !baseUrl || baseUrl === '#';

    return rolePermissions.pages.map(page => {
      const url = usingLocal
        ? (page === 'dashboard' ? 'index.html' : page + '.html')
        : `${baseUrl}${page === 'dashboard' ? '' : '?page=' + page}`;

      return {
        page: page,
        label: pageLabels[page] || page,
        url: url
      };
    });
    
  } catch (error) {
    console.error('❌ Error getting navigation menu:', error);
    return [];
  }
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PERMISSIONS_MATRIX,
    RESOURCE_ACCESS,
    hasPermission,
    canAccessResource,
    canAccessPage,
    getFilteredRequests,
    getFilteredRiders,
    getFilteredAssignments,
    validateRequestOperation,
    validateAssignmentOperation,
    getDashboardDataForUser,
    getUserNavigationMenu
  };
}
// 🔧 SESSION VALIDATION FUNCTIONS - Add these to your AccessControl.gs

/**
 * Check for valid user session (either custom or Google)
 */
function getValidUserSession() {
  try {
    console.log('🔍 Checking for valid user session...');
    
    // Method 1: Check custom session (from credential login)
    const customSession = getCustomSession();
    if (customSession && customSession.expires > Date.now()) {
      console.log('✅ Found valid custom session:', customSession.email);
      return {
        isValid: true,
        type: 'custom',
        email: customSession.email,
        name: customSession.name,
        source: 'credential_login'
      };
    }
    
    // Method 2: Check Google OAuth session
    const googleUser = getGoogleUserSession();
    if (googleUser.hasEmail) {
      console.log('✅ Found valid Google session:', googleUser.email);
      return {
        isValid: true,
        type: 'google',
        email: googleUser.email,
        name: googleUser.name,
        source: 'google_oauth'
      };
    }
    
    console.log('❌ No valid session found');
    return {
      isValid: false,
      error: 'No valid session'
    };
    
  } catch (error) {
    console.error('❌ Session validation error:', error);
    return {
      isValid: false,
      error: error.message
    };
  }
}

function getGoogleUserSession() {
  try {
    console.log('🔍 Getting fresh Google session...');
    
    const user = Session.getActiveUser();
    if (!user) {
      console.log('❌ No Google user session');
      return { hasEmail: false, error: 'No Google user session' };
    }
    
    console.log('👤 User object type:', typeof user);
    console.log('👤 User object methods:', Object.getOwnPropertyNames(user));
    
    // FIXED: Safely get email
    let email = '';
    try {
      if (typeof user.getEmail === 'function') {
        email = user.getEmail();
      } else {
        email = user.email || '';
      }
    } catch (e) {
      console.log('⚠️ getEmail() failed, trying email property:', e.message);
      email = user.email || '';
    }
    
    // FIXED: Safely get name  
    let name = '';
    try {
      if (typeof user.getName === 'function') {
        name = user.getName();
      } else if (user.name) {
        name = user.name;
      } else {
        // Extract name from email as fallback
        name = extractNameFromEmail(email);
      }
    } catch (e) {
      console.log('⚠️ getName() failed, using email fallback:', e.message);
      name = extractNameFromEmail(email);
    }
    
    if (!email || email.trim() === '') {
      console.log('❌ No email in Google session');
      return { hasEmail: false, error: 'No email in Google session' };
    }
    
    console.log('📧 Fresh Google session email:', email);
    console.log('👤 Fresh Google session name:', name);
    
    return {
      hasEmail: true,
      email: email.trim(),
      name: name?.trim() || extractNameFromEmail(email),
      source: 'fresh_google_session'
    };
    
  } catch (error) {
    console.error('❌ Google session error:', error);
    return { 
      hasEmail: false, 
      error: error.message 
    };
  }
}
function getSimpleGoogleSession() {
  try {
    console.log('🔍 Getting simple Google session...');
    
    // Direct approach - just get the email
    const userEmail = Session.getActiveUser().getEmail();
    
    if (!userEmail || userEmail.trim() === '') {
      console.log('❌ No email found');
      return { hasEmail: false, error: 'No email found' };
    }
    
    console.log('📧 Simple Google session email:', userEmail);
    
    return {
      hasEmail: true,
      email: userEmail.trim(),
      name: extractNameFromEmail(userEmail),
      source: 'simple_google_session'
    };
    
  } catch (error) {
    console.error('❌ Simple Google session error:', error);
    return { 
      hasEmail: false, 
      error: error.message 
    };
  }
}

function extractNameFromEmail(email) {
  if (!email) return 'User';
  try {
    const localPart = email.split('@')[0];
    const nameParts = localPart.split(/[._]/).map(part => 
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    );
    return nameParts.join(' ');
  } catch (error) {
    return 'User';
  }
}


// === USER AUTHORIZATION ===

/**
 * Authorize user with valid session
 */
function authorizeValidUser(session) {
  try {
    console.log('🔐 Authorizing user:', session.email);
    
    // Get authorization data (using your existing safe functions)
    const rider = getRiderByGoogleEmailSafe ? getRiderByGoogleEmailSafe(session.email) : null;
    const adminUsers = getAdminUsersSafe ? getAdminUsersSafe() : [];
    const dispatcherUsers = getDispatcherUsersSafe ? getDispatcherUsersSafe() : [];
    
    console.log('📋 Auth data - Rider:', !!rider, 'Admins:', adminUsers.length, 'Dispatchers:', dispatcherUsers.length);
    
    // Determine user role
    let userRole = 'unauthorized';
    let permissions = [];
    
    if (adminUsers.includes(session.email)) {
      userRole = 'admin';
      permissions = ['view_all', 'edit_all', 'assign_riders', 'manage_users', 'view_reports'];
      console.log('✅ User is admin');
    } else if (dispatcherUsers.includes(session.email)) {
      userRole = 'dispatcher';
      permissions = ['view_requests', 'create_requests', 'assign_riders', 'view_reports'];
      console.log('✅ User is dispatcher');
    } else if (rider && rider.status === 'Active') {
      userRole = 'rider';
      permissions = ['view_own_assignments', 'update_own_status'];
      console.log('✅ User is active rider');
    } else {
      console.log('❌ User is unauthorized');
    }
    
    if (userRole === 'unauthorized') {
      return {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Your account is not authorized to access this system'
      };
    }
    
    const user = {
      name: session.name || rider?.name || extractNameFromEmail(session.email),
      email: session.email,
      role: userRole,
      permissions: permissions,
      avatar: (session.name || rider?.name || 'U').charAt(0).toUpperCase()
    };
    
    console.log('✅ User authorized successfully:', user.role);
    
    return {
      success: true,
      user: user,
      rider: rider
    };
    
  } catch (error) {
    console.error('❌ Authorization error:', error);
    return {
      success: false,
      error: 'AUTH_ERROR',
      message: error.message
    };
  }
}

/**
 * Load page for authorized user
 */
function loadPageForUser(pageName, user, rider) {
  try {
    console.log(`📄 Loading page: ${pageName} for role: ${user.role}`);
    
    // Handle special admin-only pages
    if (['auth-setup', 'user-management'].includes(pageName) && user.role !== 'admin') {
      return createAccessDeniedPage('Only administrators can access this page', user);
    }
    
    // Handle auth-setup page
    if (pageName === 'auth-setup') {
      return createAuthMappingPage ? createAuthMappingPage() : createErrorPage('Feature Not Available', 'Authentication setup is not available');
    }
    
    // Handle user-management page
    if (pageName === 'user-management') {
      return handleUserManagementPage ? handleUserManagementPage({ parameter: { page: 'user-management' } }) : createErrorPage('Feature Not Available', 'User management is not available');
    }
    
    // Load regular page content using existing functions
    const fileName = getPageFileNameSafe ? getPageFileNameSafe(pageName, user.role) : pageName;
    let htmlOutput;
    
    try {
      htmlOutput = HtmlService.createHtmlOutputFromFile(fileName);
    } catch (error) {
      // Fallback to default page
      console.log('⚠️ Page file not found, using default:', fileName);
      htmlOutput = HtmlService.createHtmlOutputFromFile('index');
    }
    
    let content = htmlOutput.getContent();
    
    // Add navigation and user info using existing functions if available
    if (typeof getRoleBasedNavigationSafe === 'function') {
      const navigationHtml = getRoleBasedNavigationSafe(pageName, user, rider);
      content = addNavigationToContentSafe ? addNavigationToContentSafe(content, navigationHtml) : content;
    }
    
    if (typeof injectUserInfoSafe === 'function') {
      content = injectUserInfoSafe(content, user, rider);
    }
    
    htmlOutput.setContent(content);
    
    // Add mobile optimizations if function exists
    if (typeof addMobileOptimizations === 'function') {
      htmlOutput = addMobileOptimizations(htmlOutput, user, rider);
    }
    
    console.log('✅ Page loaded successfully');
    return htmlOutput;
    
  } catch (error) {
    console.error('❌ Page loading error:', error);
    return createErrorPage('Page Error', 'Failed to load page: ' + error.message);
  }
}
function createRiderDashboard(user, rider) {
  try {
    console.log('🏍️ Creating rider dashboard...');
    console.log('User object:', user);
    console.log('Rider object:', rider);
    
    // Safe property access with fallbacks
    const userName = (user && user.name) ? user.name : 
                     (user && user.email) ? extractNameFromEmail(user.email) : 'Rider';
    const userEmail = (user && user.email) ? user.email : 'Unknown';
    const userMethod = (user && user.method) ? user.method : 'Unknown';
    const webAppUrl = getWebAppUrl();
    
    console.log('Safe values:', { userName, userEmail, userMethod });
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rider Dashboard - Escort Management</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }

        .main-content {
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }

        .welcome-card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            text-align: center;
        }

        .rider-info {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }

        .card:hover {
            transform: translateY(-5px);
        }

        .card h3 {
            color: #4285f4;
            margin-bottom: 15px;
            font-size: 1.3rem;
        }

        .btn {
            background: #4285f4;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            display: inline-block;
            margin: 5px 10px 5px 0;
            font-weight: 600;
            transition: all 0.3s ease;
        }

        .btn:hover {
            background: #3367d6;
            transform: translateY(-2px);
        }

        .btn-success {
            background: #28a745;
        }

        .btn-success:hover {
            background: #218838;
        }

        .quick-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }

        .stat-item {
            text-align: center;
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 8px;
        }

        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: white;
        }

        .stat-label {
            color: rgba(255,255,255,0.9);
            font-size: 0.9rem;
        }

        .debug-info {
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <!--NAVIGATION_MENU_PLACEHOLDER-->
    
    <div class="main-content">
        <div class="welcome-card">
            <h1>🏍️ Welcome, ${userName}!</h1>
            <p style="font-size: 1.2rem; color: #666; margin-top: 10px;">Rider Dashboard</p>
        </div>

        <div class="rider-info">
            <h2 style="margin-bottom: 20px;">👤 Rider Information</h2>
            <div class="quick-stats">
                <div class="stat-item">
                    <div class="stat-number">✅</div>
                    <div class="stat-label">Status</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">0</div>
                    <div class="stat-label">Active Assignments</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">0</div>
                    <div class="stat-label">Completed This Month</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">0</div>
                    <div class="stat-label">Total Assignments</div>
                </div>
            </div>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Login Method:</strong> ${userMethod}</p>
            
            <div class="debug-info">
                <strong>🔧 Debug Info:</strong><br>
                User object available: ${user ? 'Yes' : 'No'}<br>
                Rider object available: ${rider ? 'Yes' : 'No'}<br>
                Dashboard created dynamically (rider-dashboard.html missing)
            </div>
        </div>

        <div class="cards-grid">
            <div class="card">
                <h3>🏍️ My Assignments</h3>
                <p>View your current and upcoming escort assignments.</p>
                <a href="${webAppUrl}?page=assignments" class="btn">View Assignments</a>
            </div>

            <div class="card">
                <h3>📱 Notifications</h3>
                <p>Check messages and updates from dispatchers.</p>
                <a href="${webAppUrl}?page=notifications" class="btn">View Messages</a>
            </div>

            <div class="card">
                <h3>👤 Profile</h3>
                <p>Update your contact information and preferences.</p>
                <a href="#" class="btn" onclick="alert('Profile editing coming soon!')">Edit Profile</a>
            </div>

            <div class="card">
                <h3>📋 Quick Actions</h3>
                <p>Common rider actions and tools.</p>
                <a href="#" class="btn btn-success" onclick="alert('Availability reporting coming soon!')">Report Availability</a>
                <a href="#" class="btn" onclick="alert('Status updates coming soon!')">Update Status</a>
            </div>
        </div>
    </div>

    <script>
        console.log('🏍️ Rider dashboard loaded');
        console.log('User data:', ${JSON.stringify(user || {})});
        
        // Add any rider-specific JavaScript here
        document.addEventListener('DOMContentLoaded', function() {
            console.log('👤 Dashboard ready for user:', '${userEmail}');
            
            // Check if user context was properly injected
            if (window.currentUser) {
                console.log('✅ Current user context:', window.currentUser);
            } else {
                console.log('⚠️ User context not found');
            }
        });
    </script>
</body>
</html>`;

    console.log('✅ Rider dashboard HTML created successfully');
    
    return HtmlService.createHtmlOutput(html)
      .setTitle('Rider Dashboard - Escort Management')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    console.error('❌ Error creating rider dashboard:', error);
    
    // Return a simple fallback dashboard
    return createSimpleRiderDashboard(user, rider);
  }
}

/**
 * Simple fallback rider dashboard if the main one fails
 */
function createSimpleRiderDashboard(user, rider) {
  const webAppUrl = getWebAppUrl();
  const userEmail = (user && user.email) ? user.email : 'Unknown';
  const userName = (user && user.name) ? user.name : 'Rider';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Rider Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; }
    .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .btn { background: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 5px; display: inline-block; }
    .header { background: #4285f4; color: white; padding: 20px; border-radius: 8px; text-align: center; }
  </style>
</head>
<body>
  <!--NAVIGATION_MENU_PLACEHOLDER-->
  
  <div class="container">
    <div class="header">
      <h1>🏍️ Rider Dashboard</h1>
      <p>Welcome, ${userName}!</p>
    </div>
    
    <div class="card">
      <h3>👤 User Information</h3>
      <p><strong>Email:</strong> ${userEmail}</p>
      <p><strong>Role:</strong> Rider</p>
      <p><strong>Status:</strong> This is a simplified dashboard because rider-dashboard.html is missing.</p>
    </div>
    
    <div class="card">
      <h3>🔧 Quick Actions</h3>
      <a href="${webAppUrl}?page=assignments" class="btn">View My Assignments</a>
      <a href="${webAppUrl}?page=notifications" class="btn">Check Messages</a>
      <a href="?action=logout" class="btn" style="background: #dc3545;" 
   onclick="return confirm('Are you sure you want to logout?');">
   🚪 Logout
</a>
    </div>
    
    <div class="card">
      <h3>ℹ️ Note</h3>
      <p>This is a simplified rider dashboard. To get the full dashboard, create a <code>rider-dashboard.html</code> file in your project.</p>
    </div>
  </div>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Rider Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


/**
 * Test logout functionality
 */
function testLogout() {
  console.log('🧪 Testing logout functionality...');
  
  try {
    // Clear session
    const result = clearUserSession();
    console.log('Logout result:', result);
    
    // Check if session is cleared
    const session = getAuthenticatedSession();
    console.log('Session after logout:', session);
    
    return {
      logoutResult: result,
      sessionAfterLogout: session,
      success: !session.isValid
    };
    
  } catch (error) {
    console.error('❌ Logout test failed:', error);
    return { success: false, error: error.message };
  }
}

function getWebAppUrl() {
  try {
    return ScriptApp.getService().getUrl();
  } catch (error) {
    return '#';
  }
}
/**
 * Create redirect page
 */
function createRedirectPage(url, message) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Redirecting...</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
    .spinner { display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <h2>${message}</h2>
  <p>Redirecting to dashboard...</p>
  <script>
    setTimeout(function() {
      window.location.href = '${url}';
    }, 1500);
  </script>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html).setTitle('Redirecting...');
}

/**
 * Extract name from email
 */
function extractNameFromEmail(email) {
  if (!email) return 'User';
  try {
    const localPart = email.split('@')[0];
    const nameParts = localPart.split(/[._]/).map(part => 
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    );
    return nameParts.join(' ');
  } catch (error) {
    return 'User';
  }
}

/**
 * Get web app URL safely
 */
function getWebAppUrl() {
  try {
    return ScriptApp.getService().getUrl();
  } catch (error) {
    console.error('Error getting web app URL:', error);
    return '#';
  }
}

/**
 * Create access denied page
 */
function createAccessDeniedPage(reason, user) {
  const webAppUrl = getWebAppUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Access Denied - Escort Management</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
      margin: 0;
      padding: 2rem;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
      max-width: 500px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    .title {
      color: #d63031;
      margin-bottom: 1rem;
    }
    .message {
      color: #636e72;
      margin-bottom: 2rem;
      line-height: 1.5;
    }
    .user-info {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }
    .btn {
      background: #0984e3;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      text-decoration: none;
      display: inline-block;
      font-weight: 600;
      transition: all 0.3s;
    }
    .btn:hover {
      background: #74b9ff;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🚫</div>
    <h1 class="title">Access Denied</h1>
    <p class="message">${reason || 'You do not have permission to access this resource.'}</p>
    
    <div class="user-info">
      <strong>Current User:</strong> ${user ? user.email : 'Unknown'}<br>
      <strong>Role:</strong> ${user ? user.role : 'None'}
    </div>
    
    <a href="${webAppUrl}" class="btn">Return to Dashboard</a>
  </div>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Access Denied - Escort Management');
}

/**
 * Create generic error page
 */
function createErrorPage(title, message) {
  const webAppUrl = getWebAppUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${title} - Escort Management</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%);
      margin: 0;
      padding: 2rem;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
      max-width: 500px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    .title {
      color: #6c5ce7;
      margin-bottom: 1rem;
    }
    .message {
      color: #636e72;
      margin-bottom: 2rem;
      line-height: 1.5;
    }
    .btn {
      background: #00b894;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      text-decoration: none;
      display: inline-block;
      font-weight: 600;
      transition: all 0.3s;
      margin: 0 10px;
    }
    .btn:hover {
      background: #00a085;
    }
    .btn-secondary {
      background: #636e72;
    }
    .btn-secondary:hover {
      background: #2d3436;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚠️</div>
    <h1 class="title">${title}</h1>
    <p class="message">${message}</p>
    
    <a href="${webAppUrl}" class="btn">Try Again</a>
    <a href="${webAppUrl}?auth=logout" class="btn btn-secondary">Sign Out</a>
  </div>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle(title + ' - Escort Management');
}

/**
 * Emergency function to clear authentication cache
 */
function emergencyAuthFix() {
  console.log('🚨 Running emergency authentication fix...');
  
  try {
    // Clear script properties cache
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.deleteProperty('CACHED_USER_EMAIL');
    scriptProperties.deleteProperty('CACHED_USER_NAME');
    
    // Clear user properties cache
    const userProperties = PropertiesService.getUserProperties();
    userProperties.deleteProperty('CUSTOM_SESSION');
    
    console.log('✅ Cleared all authentication cache');
    
    return {
      success: true,
      message: 'Authentication cache cleared. Users should see login screen now.',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Emergency function to clear all authentication cache
 */
function emergencyAuthFix() {
  console.log('🚨 Running emergency authentication fix...');
  
  try {
    // Clear script properties cache
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.deleteProperty('CACHED_USER_EMAIL');
    scriptProperties.deleteProperty('CACHED_USER_NAME');
    
    // Clear user properties cache
    const userProperties = PropertiesService.getUserProperties();
    userProperties.deleteProperty('CUSTOM_SESSION');
    
    console.log('✅ Cleared all authentication cache');
    
    return {
      success: true,
      message: 'Authentication cache cleared. Users should see login screen now.',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Safe wrapper for getting web app URL
 */
function getWebAppUrl() {
  try {
    return ScriptApp.getService().getUrl();
  } catch (error) {
    console.error('Error getting web app URL:', error);
    return '#';
  }
}

/**
 * Extract name from email address
 */
function extractNameFromEmail(email) {
  if (!email) return 'User';
  
  try {
    const localPart = email.split('@')[0];
    const nameParts = localPart.split(/[._]/).map(part => 
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    );
    return nameParts.join(' ');
  } catch (error) {
    return 'User';
  }
}




function runCompleteDiagnostic() {
  console.log('🚨 === COMPLETE AUTHENTICATION DIAGNOSTIC ===');
  
  // Test 1: Check if doGet exists and works
  console.log('1. Testing doGet function...');
  try {
    if (typeof doGet !== 'function') {
      console.log('❌ doGet is not defined');
      return { error: 'doGet function missing' };
    }
    
    console.log('✅ doGet function exists');
    
    // Test with auth parameters
    const googleTest = doGet({ parameter: { auth: 'google' } });
    console.log('Google auth test result type:', typeof googleTest);
    
    const credTest = doGet({ parameter: { auth: 'credentials' } });
    console.log('Credentials auth test result type:', typeof credTest);
    
  } catch (error) {
    console.log('❌ doGet test failed:', error.message);
    return { error: 'doGet function broken: ' + error.message };
  }
  
  // Test 2: Check supporting functions
  console.log('\n2. Checking supporting functions...');
  const requiredFunctions = [
    'createHybridLoginPage',
    'handleGoogleAuth', 
    'handleCredentialsAuth',
    'getValidUserSession'
  ];
  
  const missing = [];
  requiredFunctions.forEach(name => {
    try {
      if (typeof eval(name) !== 'function') {
        missing.push(name);
      }
    } catch (e) {
      missing.push(name);
    }
  });
  
  if (missing.length > 0) {
    console.log('❌ Missing functions:', missing.join(', '));
    return { error: 'Missing functions: ' + missing.join(', ') };
  }
  
  console.log('✅ All functions exist');
  
  // Test 3: Check web app URL
  console.log('\n3. Checking web app URL...');
  try {
    const url = getWebAppUrl();
    console.log('Web app URL:', url);
    
    if (!url || url === '#') {
      console.log('❌ Invalid web app URL');
      return { error: 'Web app URL problem' };
    }
    
  } catch (error) {
    console.log('❌ URL error:', error.message);
    return { error: 'URL error: ' + error.message };
  }
  
  console.log('✅ Diagnostic complete - no obvious issues found');
  console.log('\n🔧 If buttons still don\'t work, the issue is likely:');
  console.log('1. Web app not deployed properly');
  console.log('2. Browser cache issues');
  console.log('3. Multiple doGet functions conflicting');
  
  return { success: true };
}




// 🔧 DEBUG BUTTON ISSUES - Run these functions to diagnose the problem

/**
 * 1. Test what happens when you access the auth URLs directly
 */
function testAuthUrls() {
  console.log('🧪 Testing authentication URLs...');
  
  try {
    const webAppUrl = getWebAppUrl();
    console.log('Base URL:', webAppUrl);
    
    // Test Google auth URL
    const googleUrl = webAppUrl + '?auth=google';
    console.log('Google auth URL:', googleUrl);
    
    // Test credentials auth URL
    const credentialsUrl = webAppUrl + '?auth=credentials';
    console.log('Credentials auth URL:', credentialsUrl);
    
    // Test if doGet handles these parameters
    console.log('\n🔍 Testing doGet parameter handling...');
    
    // Mock Google auth request
    const googleEvent = { parameter: { auth: 'google' } };
    console.log('Testing Google auth parameter...');
    try {
      const googleResult = doGet(googleEvent);
      console.log('✅ Google auth test successful');
      console.log('Result type:', typeof googleResult);
      console.log('Has getContent:', typeof googleResult.getContent);
    } catch (error) {
      console.log('❌ Google auth test failed:', error.message);
    }
    
    // Mock credentials auth request
    const credentialsEvent = { parameter: { auth: 'credentials' } };
    console.log('Testing credentials auth parameter...');
    try {
      const credentialsResult = doGet(credentialsEvent);
      console.log('✅ Credentials auth test successful');
      console.log('Result type:', typeof credentialsResult);
      console.log('Has getContent:', typeof credentialsResult.getContent);
    } catch (error) {
      console.log('❌ Credentials auth test failed:', error.message);
    }
    
    return {
      success: true,
      webAppUrl: webAppUrl,
      googleUrl: googleUrl,
      credentialsUrl: credentialsUrl
    };
    
  } catch (error) {
    console.error('❌ URL test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 2. Check if your doGet function is properly defined
 */
function checkDoGetFunction() {
  console.log('🔍 Checking doGet function...');
  
  try {
    // Check if doGet exists
    if (typeof doGet !== 'function') {
      console.log('❌ doGet is not defined as a function');
      return { success: false, error: 'doGet function not found' };
    }
    
    console.log('✅ doGet function exists');
    
    // Test with no parameters
    console.log('Testing doGet with no parameters...');
    try {
      const result = doGet({});
      console.log('✅ doGet works with empty parameters');
      console.log('Result type:', typeof result);
      
      if (result && typeof result.getContent === 'function') {
        const content = result.getContent();
        console.log('Content length:', content.length);
        console.log('Contains "login":', content.toLowerCase().includes('login'));
        console.log('Contains "auth":', content.toLowerCase().includes('auth'));
      }
    } catch (error) {
      console.log('❌ doGet failed with empty parameters:', error.message);
    }
    
    // Test with page parameter
    console.log('Testing doGet with page parameter...');
    try {
      const result = doGet({ parameter: { page: 'dashboard' } });
      console.log('✅ doGet works with page parameter');
    } catch (error) {
      console.log('❌ doGet failed with page parameter:', error.message);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ doGet check failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 3. Check if supporting functions exist
 */
function checkSupportingFunctions() {
  console.log('🔍 Checking supporting functions...');
  
  const requiredFunctions = [
    'createHybridLoginPage',
    'handleGoogleAuth',
    'handleCredentialsAuth',
    'getValidUserSession',
    'getGoogleUserSession',
    'authorizeValidUser',
    'createCredentialsLoginForm',
    'getCustomSession',
    'loginWithCredentials'
  ];
  
  const results = {};
  
  requiredFunctions.forEach(funcName => {
    try {
      const func = eval(funcName);
      if (typeof func === 'function') {
        console.log(`✅ ${funcName} exists`);
        results[funcName] = 'exists';
      } else {
        console.log(`❌ ${funcName} is not a function`);
        results[funcName] = 'not_function';
      }
    } catch (error) {
      console.log(`❌ ${funcName} not found`);
      results[funcName] = 'missing';
    }
  });
  
  const missingFunctions = Object.keys(results).filter(key => results[key] !== 'exists');
  
  if (missingFunctions.length > 0) {
    console.log('🚨 Missing functions:', missingFunctions.join(', '));
  } else {
    console.log('✅ All required functions exist');
  }
  
  return {
    success: missingFunctions.length === 0,
    results: results,
    missing: missingFunctions
  };
}

/**
 * 4. Test the current authentication flow
 */
function testCurrentAuthFlow() {
  console.log('🔍 Testing current authentication flow...');
  
  try {
    // Test session validation
    console.log('1. Testing session validation...');
    if (typeof getValidUserSession === 'function') {
      const session = getValidUserSession();
      console.log('Session result:', session);
    } else {
      console.log('❌ getValidUserSession function missing');
    }
    
    // Test Google session
    console.log('2. Testing Google session...');
    if (typeof getGoogleUserSession === 'function') {
      const googleSession = getGoogleUserSession();
      console.log('Google session result:', googleSession);
    } else {
      console.log('❌ getGoogleUserSession function missing');
    }
    
    // Test custom session
    console.log('3. Testing custom session...');
    if (typeof getCustomSession === 'function') {
      const customSession = getCustomSession();
      console.log('Custom session result:', customSession);
    } else {
      console.log('❌ getCustomSession function missing');
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Auth flow test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 5. Create a minimal working login page for testing
 */
function createTestLoginPage() {
  const webAppUrl = getWebAppUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>TEST LOGIN PAGE</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 2rem; background: #f0f0f0; }
    .container { max-width: 500px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; }
    .btn { display: block; width: 100%; padding: 15px; margin: 10px 0; background: #4285f4; color: white; text-decoration: none; text-align: center; border-radius: 5px; font-size: 16px; }
    .btn:hover { background: #3367d6; }
    .btn.green { background: #34a853; }
    .btn.green:hover { background: #137333; }
    .info { background: #e3f2fd; padding: 1rem; border-radius: 5px; margin: 1rem 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧪 TEST LOGIN PAGE</h1>
    <div class="info">
      <strong>Current URL:</strong> ${webAppUrl}<br>
      <strong>Timestamp:</strong> ${new Date().toISOString()}
    </div>
    
    <h3>Test Authentication URLs:</h3>
    
    <a href="${webAppUrl}?auth=google" class="btn">
      🔗 Test Google Auth (?auth=google)
    </a>
    
    <a href="${webAppUrl}?auth=credentials" class="btn green">
      🔗 Test Credentials Auth (?auth=credentials)
    </a>
    
    <a href="${webAppUrl}" class="btn" style="background: #666;">
      🔗 Back to Main App
    </a>
    
    <div class="info">
      <strong>Instructions:</strong><br>
      1. Click each button above<br>
      2. See what happens<br>
      3. Check browser console for errors<br>
      4. Report back what you see
    </div>
  </div>
  
  <script>
    console.log('Test login page loaded');
    console.log('Current URL:', window.location.href);
    
    // Log clicks
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        console.log('Button clicked:', this.href);
        console.log('Target URL:', this.href);
      });
    });
  </script>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('TEST LOGIN PAGE');
}



/**
 * 7. Master diagnostic function - run this first
 */
function runCompleteDiagnostic() {
  console.log('🚨 === COMPLETE AUTHENTICATION DIAGNOSTIC ===');
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };
  
  console.log('1. Testing URLs...');
  results.tests.urls = testAuthUrls();
  
  console.log('\n2. Checking doGet function...');
  results.tests.doGet = checkDoGetFunction();
  
  console.log('\n3. Checking supporting functions...');
  results.tests.functions = checkSupportingFunctions();
  
  console.log('\n4. Testing auth flow...');
  results.tests.authFlow = testCurrentAuthFlow();
  
  console.log('\n=== DIAGNOSTIC SUMMARY ===');
  console.log('URLs test:', results.tests.urls.success ? '✅ PASS' : '❌ FAIL');
  console.log('doGet test:', results.tests.doGet.success ? '✅ PASS' : '❌ FAIL');
  console.log('Functions test:', results.tests.functions.success ? '✅ PASS' : '❌ FAIL');
  console.log('Auth flow test:', results.tests.authFlow.success ? '✅ PASS' : '❌ FAIL');
  
  // Recommendations
  console.log('\n=== RECOMMENDATIONS ===');
  
  if (!results.tests.functions.success) {
    console.log('🔧 ISSUE: Missing functions');
    console.log('SOLUTION: Add the missing functions from the artifacts I provided');
    console.log('Missing:', results.tests.functions.missing.join(', '));
  }
  
  if (!results.tests.doGet.success) {
    console.log('🔧 ISSUE: doGet function problems');
    console.log('SOLUTION: Replace your doGet function with the fixed version');
  }
  
  if (!results.tests.urls.success) {
    console.log('🔧 ISSUE: URL problems');
    console.log('SOLUTION: Check web app deployment');
  }
  
  console.log('\n🔧 Next step: Run createDebugDoGet() for a simple test');
  
  return results;
}

function createGoogleScriptLoginPage() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Login - Escort Management</title>
  <style>
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: 0; 
      padding: 2rem;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login-container {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      max-width: 400px;
      width: 100%;
      text-align: center;
    }
    .logo { 
      font-size: 3rem; 
      margin-bottom: 1rem; 
    }
    .title { 
      color: #333; 
      margin-bottom: 2rem; 
    }
    .auth-option {
      margin: 1rem 0;
      padding: 1rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #f9f9f9;
    }
    .auth-option h3 {
      margin: 0 0 0.5rem 0;
      color: #333;
    }
    .auth-option p {
      margin: 0 0 1rem 0;
      color: #666;
      font-size: 0.9rem;
    }
    .btn {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      transition: all 0.3s;
      color: white;
    }
    .btn-google {
      background: #4285f4;
    }
    .btn-google:hover {
      background: #3367d6;
    }
    .btn-google:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .btn-credentials {
      background: #34a853;
    }
    .btn-credentials:hover {
      background: #137333;
    }
    .btn-credentials:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .divider {
      text-align: center;
      margin: 1.5rem 0;
      color: #666;
      position: relative;
    }
    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #ddd;
    }
    .divider span {
      background: white;
      padding: 0 1rem;
    }
    .message {
      margin-top: 1rem;
      padding: 12px;
      border-radius: 6px;
      display: none;
    }
    .message.error {
      background: #ffeaea;
      color: #d93025;
      border: 1px solid #fce8e6;
    }
    .message.loading {
      background: #e3f2fd;
      color: #1976d2;
      border: 1px solid #bbdefb;
    }
    .info {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 6px;
      margin-top: 2rem;
      font-size: 0.9rem;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="logo">🏍️</div>
    <h1 class="title">Escort Management System</h1>
    
    <div class="auth-option">
      <h3>🔐 Google Account</h3>
      <p>Sign in with your authorized Google account</p>
      <button id="googleBtn" class="btn btn-google" onclick="handleGoogleAuth()">
        Sign In with Google
      </button>
    </div>
    
    <div class="divider">
      <span>or</span>
    </div>
    
    <div class="auth-option">
      <h3>👤 System Login</h3>
      <p>Use your system username and password</p>
      <button id="credentialsBtn" class="btn btn-credentials" onclick="showCredentialsForm()">
        System Login
      </button>
    </div>
    
    <!-- Credentials Form (initially hidden) -->
    <div id="credentialsForm" style="display: none; margin-top: 2rem;">
      <div class="auth-option">
        <h3>Enter Credentials</h3>
        <input type="email" id="email" placeholder="Email Address" style="width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
        <input type="password" id="password" placeholder="Password" style="width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
        <button onclick="handleCredentialsAuth()" class="btn btn-credentials" style="margin-top: 10px;">
          Sign In
        </button>
        <button onclick="hideCredentialsForm()" class="btn" style="background: #666; margin-top: 5px;">
          Cancel
        </button>
      </div>
    </div>
    
    <div id="message" class="message"></div>
    
    <div class="info">
      <strong>ℹ️ How this works:</strong><br>
      • Uses Google Apps Script's built-in communication (google.script.run)<br>
      • No page navigation required<br>
      • Works within iframe restrictions<br>
      • Authenticates on the server side
    </div>
  </div>
  
  <script>
    function showMessage(text, type) {
      const message = document.getElementById('message');
      message.textContent = text;
      message.className = 'message ' + type;
      message.style.display = 'block';
    }
    
    function hideMessage() {
      document.getElementById('message').style.display = 'none';
    }
    
    function showCredentialsForm() {
      document.getElementById('credentialsForm').style.display = 'block';
      document.getElementById('credentialsBtn').style.display = 'none';
    }
    
    function hideCredentialsForm() {
      document.getElementById('credentialsForm').style.display = 'none';
      document.getElementById('credentialsBtn').style.display = 'block';
    }
    
    function handleGoogleAuth() {
      const btn = document.getElementById('googleBtn');
      btn.disabled = true;
      btn.textContent = 'Authenticating...';
      showMessage('Connecting to Google...', 'loading');
      
      google.script.run
        .withSuccessHandler(function(result) {
          console.log('Google auth result:', result);
          if (result.success) {
            showMessage('Google authentication successful! Redirecting...', 'loading');
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            showMessage('Google authentication failed: ' + result.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Sign In with Google';
          }
        })
        .withFailureHandler(function(error) {
          console.error('Google auth error:', error);
          showMessage('Google authentication error: ' + error.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Sign In with Google';
        })
        .processGoogleAuthentication();
    }
    
    function handleCredentialsAuth() {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      
      if (!email || !password) {
        showMessage('Please enter both email and password', 'error');
        return;
      }
      
      showMessage('Verifying credentials...', 'loading');
      
      google.script.run
        .withSuccessHandler(function(result) {
          console.log('Credentials auth result:', result);
          if (result.success) {
            showMessage('Login successful! Redirecting...', 'loading');
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            showMessage('Login failed: ' + result.message, 'error');
          }
        })
        .withFailureHandler(function(error) {
          console.error('Credentials auth error:', error);
          showMessage('Login error: ' + error.message, 'error');
        })
        .processCredentialsAuthentication(email, password);
    }
    
    console.log('🔧 Google Apps Script login page loaded');
    console.log('Environment: iframe =', window !== window.top);
  </script>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Login - Escort Management')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Server-side authentication functions that work with google.script.run



function processCredentialsAuthentication(email, password) {
  try {
    console.log('🔐 Processing credentials authentication for:', email);
    
    // Use existing login function if available
    if (typeof loginWithCredentials === 'function') {
      const result = loginWithCredentials(email, password);
      
      if (result.success) {
        console.log('✅ Credentials authentication successful');
        
        // Get user details from Users sheet for proper name
        let userName = extractNameFromEmail(email);
        let userRole = 'admin'; // Default
        
        try {
          // Try to get user details from Users sheet
          const userRecord = findUserRecord(email);
          if (userRecord && userRecord.name) {
            userName = userRecord.name;
            userRole = userRecord.role || 'admin';
          }
          console.log('📋 User record found:', userRecord);
        } catch (error) {
          console.log('⚠️ Could not get user record:', error.message);
        }
        
        // FIXED: Store session with proper name
        const sessionData = {
          email: email,
          name: userName, // This was missing before!
          role: userRole,
          method: 'credentials',
          timestamp: Date.now()
        };
        
        console.log('💾 Storing session data:', sessionData);
        
        PropertiesService.getUserProperties().setProperty('AUTHENTICATED_USER', JSON.stringify(sessionData));
        
        return {
          success: true,
          message: 'Credentials authentication successful',
          user: sessionData
        };
      } else {
        return { success: false, message: result.message || 'Invalid credentials' };
      }
    } else {
      return { success: false, message: 'Credential authentication not available' };
    }
    
  } catch (error) {
    console.error('❌ Credentials authentication error:', error);
    return { success: false, message: 'Authentication error: ' + error.message };
  }
}

function createAuthSuccessPage(method, message) {
  const html = `
<!DOCTYPE html>
<html>
<head><title>Authentication Success</title></head>
<body style="font-family: Arial, sans-serif; padding: 20px; text-align: center; background: #f0f8ff;">
  <div style="max-width: 500px; margin: 50px auto; background: #c8e6c9; padding: 30px; border-radius: 10px;">
    <h1 style="color: #2e7d32;">✅ ${method} Authentication Successful!</h1>
    <p style="font-size: 18px;">${message}</p>
    <p style="color: #666;">You will be redirected to the dashboard shortly...</p>
    <button onclick="window.location.reload()" style="padding: 10px 20px; background: #4285f4; color: white; border: none; border-radius: 5px; cursor: pointer;">
      Continue to Dashboard
    </button>
  </div>
  <script>
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  </script>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Authentication Success')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function createAuthErrorPage(method, message) {
  const html = `
<!DOCTYPE html>
<html>
<head><title>Authentication Failed</title></head>
<body style="font-family: Arial, sans-serif; padding: 20px; text-align: center; background: #fff5f5;">
  <div style="max-width: 500px; margin: 50px auto; background: #ffebee; padding: 30px; border-radius: 10px; border: 1px solid #f44336;">
    <h1 style="color: #d32f2f;">❌ ${method} Authentication Failed</h1>
    <p style="font-size: 16px; color: #666;">${message}</p>
    <button onclick="window.location.reload()" style="padding: 10px 20px; background: #4285f4; color: white; border: none; border-radius: 5px; cursor: pointer;">
      Try Again
    </button>
  </div>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Authentication Failed')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function extractNameFromEmail(email) {
  try {
    if (!email || typeof email !== 'string') {
      return 'User';
    }
    
    const localPart = email.split('@')[0];
    if (!localPart) {
      return 'User';
    }
    
    // Handle different email formats
    let nameParts = [];
    
    // Check for common separators
    if (localPart.includes('.')) {
      nameParts = localPart.split('.');
    } else if (localPart.includes('_')) {
      nameParts = localPart.split('_');
    } else if (localPart.includes('-')) {
      nameParts = localPart.split('-');
    } else {
      // Try to split camelCase
      nameParts = localPart.split(/(?=[A-Z])/).filter(part => part.length > 0);
      
      // If no camelCase, just use the whole thing
      if (nameParts.length === 1) {
        nameParts = [localPart];
      }
    }
    
    // Capitalize each part
    const formattedParts = nameParts.map(part => {
      if (!part || part.length === 0) return '';
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }).filter(part => part.length > 0);
    
    return formattedParts.length > 0 ? formattedParts.join(' ') : 'User';
    
  } catch (error) {
    console.log('Error extracting name from email:', error.message);
    return 'User';
  }
}












// 🔧 SETUP SYSTEM USERS - Run this to create the backend user database

/**
 * Main setup function - creates Users sheet with default admin account
 */
function setupSystemUsers() {
  try {
    console.log('🛠️ Setting up system users...');
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let usersSheet = spreadsheet.getSheetByName('Users');
    
    // Create Users sheet if it doesn't exist
    if (!usersSheet) {
      console.log('📄 Creating Users sheet...');
      usersSheet = spreadsheet.insertSheet('Users');
      
      // Add headers
      const headers = ['email', 'hashedPassword', 'role', 'status', 'name', 'created', 'lastLogin'];
      usersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      usersSheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#4285f4')
        .setFontColor('white');
      
      console.log('✅ Users sheet created with headers');
    }
    
    // Check if we already have users
    const data = usersSheet.getDataRange().getValues();
    if (data.length > 1) {
      console.log('ℹ️ Users sheet already has data');
      
      // Show existing users
      console.log('📋 Existing users:');
      for (let i = 1; i < data.length; i++) {
        const [email, , role, status, name] = data[i];
        console.log(`  - ${email} (${role}, ${status})`);
      }
      
      return {
        success: true,
        message: 'Users sheet already exists with ' + (data.length - 1) + ' users',
        users: data.slice(1).map(row => ({
          email: row[0],
          role: row[2],
          status: row[3],
          name: row[4]
        }))
      };
    }
    
    // Create default admin user
    console.log('👤 Creating default admin user...');
    
    const adminEmail = 'admin@escort.local';
    const adminPassword = 'EscortAdmin123!';
    const hashedPassword = hashPassword(adminPassword);
    
    const adminData = [
      adminEmail,              // email
      hashedPassword,          // hashedPassword
      'admin',                 // role
      'active',                // status
      'System Administrator',  // name
      new Date(),             // created
      ''                      // lastLogin
    ];
    
    usersSheet.getRange(2, 1, 1, adminData.length).setValues([adminData]);
    
    // Format the sheet
    usersSheet.autoResizeColumns(1, headers.length);
    
    console.log('✅ Default admin user created successfully!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('⚠️  IMPORTANT: Change this password after first login!');
    
    return {
      success: true,
      message: 'System users setup complete',
      defaultCredentials: {
        email: adminEmail,
        password: adminPassword,
        role: 'admin'
      }
    };
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Add additional system users
 */
function addSystemUser(email, password, role, name) {
  try {
    console.log(`👤 Adding system user: ${email} (${role})`);
    
    const usersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
    if (!usersSheet) {
      return { success: false, error: 'Users sheet not found. Run setupSystemUsers() first.' };
    }
    
    // Check if user already exists
    const data = usersSheet.getDataRange().getValues();
    const existingUser = data.find(row => row[0] === email);
    
    if (existingUser) {
      return { success: false, error: 'User already exists: ' + email };
    }
    
    // Validate inputs
    if (!email || !password || !role || !name) {
      return { success: false, error: 'All fields are required: email, password, role, name' };
    }
    
    if (!['admin', 'dispatcher', 'rider'].includes(role)) {
      return { success: false, error: 'Role must be: admin, dispatcher, or rider' };
    }
    
    // Hash password and add user
    const hashedPassword = hashPassword(password);
    const userData = [
      email,
      hashedPassword,
      role,
      'active',
      name,
      new Date(),
      ''
    ];
    
    const lastRow = usersSheet.getLastRow();
    usersSheet.getRange(lastRow + 1, 1, 1, userData.length).setValues([userData]);
    
    console.log(`✅ User added successfully: ${email}`);
    
    return {
      success: true,
      message: 'User added successfully',
      user: {
        email: email,
        role: role,
        name: name
      }
    };
    
  } catch (error) {
    console.error('❌ Add user failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * List all system users
 */
function listSystemUsers() {
  try {
    const usersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
    if (!usersSheet) {
      return { success: false, error: 'Users sheet not found. Run setupSystemUsers() first.' };
    }
    
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    const users = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      users.push({
        email: row[0],
        role: row[2],
        status: row[3],
        name: row[4],
        created: row[5],
        lastLogin: row[6] || 'Never'
      });
    }
    
    console.log('📋 System Users:');
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}, ${user.status}) - ${user.name}`);
    });
    
    return {
      success: true,
      users: users
    };
    
  } catch (error) {
    console.error('❌ List users failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Change a user's password
 */
function changeUserPassword(email, newPassword) {
  try {
    console.log(`🔑 Changing password for: ${email}`);
    
    const usersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
    if (!usersSheet) {
      return { success: false, error: 'Users sheet not found' };
    }
    
    const data = usersSheet.getDataRange().getValues();
    const emailCol = 0;
    const passwordCol = 1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailCol] === email) {
        const hashedPassword = hashPassword(newPassword);
        usersSheet.getRange(i + 1, passwordCol + 1).setValue(hashedPassword);
        
        console.log(`✅ Password changed for: ${email}`);
        return {
          success: true,
          message: 'Password changed successfully'
        };
      }
    }
    
    return { success: false, error: 'User not found: ' + email };
    
  } catch (error) {
    console.error('❌ Change password failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test the login system
 */
function testSystemLogin() {
  try {
    console.log('🧪 Testing system login...');
    
    // First, make sure we have users
    const setupResult = setupSystemUsers();
    console.log('Setup result:', setupResult);
    
    if (setupResult.defaultCredentials) {
      const { email, password } = setupResult.defaultCredentials;
      
      // Test the login function
      console.log(`🔐 Testing login with: ${email}`);
      
      if (typeof loginWithCredentials === 'function') {
        const loginResult = loginWithCredentials(email, password);
        console.log('Login test result:', loginResult);
        
        return {
          success: true,
          setupResult: setupResult,
          loginResult: loginResult,
          testCredentials: {
            email: email,
            password: password
          }
        };
      } else {
        return {
          success: false,
          error: 'loginWithCredentials function not found. You need the HybridAuth.gs functions.'
        };
      }
    }
    
    return setupResult;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Quick setup with custom credentials
 */
function quickSetupWithCustomAdmin(email, password, name) {
  try {
    console.log('⚡ Quick setup with custom admin...');
    
    if (!email || !password || !name) {
      return { 
        success: false, 
        error: 'Please provide email, password, and name' 
      };
    }
    
    // Create Users sheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let usersSheet = spreadsheet.getSheetByName('Users');
    
    if (!usersSheet) {
      usersSheet = spreadsheet.insertSheet('Users');
      const headers = ['email', 'hashedPassword', 'role', 'status', 'name', 'created', 'lastLogin'];
      usersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      usersSheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#4285f4')
        .setFontColor('white');
    }
    
    // Add your custom admin
    const hashedPassword = hashPassword(password);
    const adminData = [email, hashedPassword, 'admin', 'active', name, new Date(), ''];
    
    const lastRow = usersSheet.getLastRow();
    usersSheet.getRange(lastRow + 1, 1, 1, adminData.length).setValues([adminData]);
    
    console.log('✅ Custom admin created:', email);
    
    return {
      success: true,
      message: 'Custom admin created successfully',
      credentials: { email, password, name }
    };
    
  } catch (error) {
    console.error('❌ Quick setup failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Make sure hashPassword function exists
function hashPassword(password) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return raw.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}
// 🔐 PASSWORD MANAGEMENT - Safe ways to change passwords

/**
 * Method 1: Change password using Apps Script editor (RECOMMENDED)
 */
function changePassword(email, newPassword) {
  try {
    console.log(`🔑 Changing password for: ${email}`);
    
    const usersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
    if (!usersSheet) {
      console.log('❌ Users sheet not found');
      return { success: false, error: 'Users sheet not found' };
    }
    
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find the user
    let userFound = false;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] === email) { // email column
        // Hash the new password
        const hashedPassword = hashPassword(newPassword);
        
        // Update the password in the sheet
        usersSheet.getRange(i + 1, 2).setValue(hashedPassword); // password column
        
        console.log(`✅ Password changed successfully for: ${email}`);
        console.log(`🔑 New password: ${newPassword}`);
        userFound = true;
        break;
      }
    }
    
    if (!userFound) {
      console.log(`❌ User not found: ${email}`);
      return { success: false, error: 'User not found: ' + email };
    }
    
    return {
      success: true,
      message: `Password changed successfully for ${email}`,
      newPassword: newPassword
    };
    
  } catch (error) {
    console.error('❌ Password change failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Quick password change functions for common scenarios
 */

// Change the default admin password
function changeDefaultAdminPassword(newPassword) {
  return changePassword('admin@escort.local', newPassword);
}

// Change password for a specific user
function changeUserPassword(email, newPassword) {
  return changePassword(email, newPassword);
}

// Reset all passwords (useful for testing)
function resetAllPasswords() {
  try {
    console.log('🔄 Resetting all user passwords...');
    
    const usersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
    if (!usersSheet) {
      return { success: false, error: 'Users sheet not found' };
    }
    
    const data = usersSheet.getDataRange().getValues();
    const results = [];
    
    for (let i = 1; i < data.length; i++) {
      const email = data[i][0];
      const role = data[i][2];
      
      // Generate a new password based on role
      let newPassword;
      if (role === 'admin') {
        newPassword = 'AdminPass123!';
      } else if (role === 'dispatcher') {
        newPassword = 'DispatchPass123!';
      } else {
        newPassword = 'UserPass123!';
      }
      
      const result = changePassword(email, newPassword);
      results.push({
        email: email,
        newPassword: newPassword,
        success: result.success
      });
    }
    
    console.log('📋 Password reset results:');
    results.forEach(r => {
      console.log(`  ${r.email}: ${r.success ? '✅' : '❌'} New password: ${r.newPassword}`);
    });
    
    return {
      success: true,
      message: 'All passwords reset',
      results: results
    };
    
  } catch (error) {
    console.error('❌ Reset failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Method 2: Add a password change interface to your web app
 */
function createPasswordChangeInterface() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Change Password</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
    input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
    button { width: 100%; padding: 12px; background: #4285f4; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
    button:hover { background: #3367d6; }
    .message { padding: 10px; border-radius: 4px; margin-top: 15px; display: none; }
    .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
  </style>
</head>
<body>
  <div class="container">
    <h2>🔐 Change Password</h2>
    
    <div class="form-group">
      <label for="email">Email Address:</label>
      <input type="email" id="email" placeholder="Enter email address">
    </div>
    
    <div class="form-group">
      <label for="currentPassword">Current Password:</label>
      <input type="password" id="currentPassword" placeholder="Enter current password">
    </div>
    
    <div class="form-group">
      <label for="newPassword">New Password:</label>
      <input type="password" id="newPassword" placeholder="Enter new password">
    </div>
    
    <div class="form-group">
      <label for="confirmPassword">Confirm New Password:</label>
      <input type="password" id="confirmPassword" placeholder="Confirm new password">
    </div>
    
    <button onclick="changePassword()">Change Password</button>
    
    <div id="message" class="message"></div>
  </div>
  
  <script>
    function changePassword() {
      const email = document.getElementById('email').value.trim();
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      // Validation
      if (!email || !currentPassword || !newPassword || !confirmPassword) {
        showMessage('Please fill in all fields', 'error');
        return;
      }
      
      if (newPassword !== confirmPassword) {
        showMessage('New passwords do not match', 'error');
        return;
      }
      
      if (newPassword.length < 8) {
        showMessage('Password must be at least 8 characters long', 'error');
        return;
      }
      
      // Call server-side function
      google.script.run
        .withSuccessHandler(function(result) {
          if (result.success) {
            showMessage('Password changed successfully!', 'success');
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
          } else {
            showMessage('Error: ' + result.message, 'error');
          }
        })
        .withFailureHandler(function(error) {
          showMessage('Error: ' + error.message, 'error');
        })
        .processPasswordChange(email, currentPassword, newPassword);
    }
    
    function showMessage(text, type) {
      const messageDiv = document.getElementById('message');
      messageDiv.textContent = text;
      messageDiv.className = 'message ' + type;
      messageDiv.style.display = 'block';
    }
  </script>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Change Password')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function processPasswordChange(email, currentPassword, newPassword) {
  try {
    // First verify current password
    const loginResult = loginWithCredentials(email, currentPassword);
    if (!loginResult.success) {
      return { success: false, message: 'Current password is incorrect' };
    }
    
    // Change to new password
    return changePassword(email, newPassword);
    
  } catch (error) {
    return { success: false, message: 'Password change failed: ' + error.message };
  }
}

/**
 * Method 3: View current users and their info (passwords are hidden)
 */
function viewSystemUsers() {
  try {
    const usersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
    if (!usersSheet) {
      console.log('❌ Users sheet not found');
      return;
    }
    
    const data = usersSheet.getDataRange().getValues();
    console.log('👥 === SYSTEM USERS ===');
    console.log('Email | Role | Status | Name | Created');
    console.log('-------|------|--------|------|--------');
    
    for (let i = 1; i < data.length; i++) {
      const [email, , role, status, name, created] = data[i];
      const createdDate = created ? new Date(created).toLocaleDateString() : 'Unknown';
      console.log(`${email} | ${role} | ${status} | ${name} | ${createdDate}`);
    }
    
    return data.slice(1).map(row => ({
      email: row[0],
      role: row[2],
      status: row[3],
      name: row[4],
      created: row[5]
    }));
    
  } catch (error) {
    console.error('❌ View users failed:', error);
    return [];
  }
}

/**
 * Method 4: Quick password changes (for testing)
 */

// Set simple passwords for testing
function setSimplePasswords() {
  console.log('🔧 Setting simple passwords for testing...');
  
  const results = [];
  
  // Change admin password to simple one
  const adminResult = changePassword('admin@escort.local', 'admin123');
  results.push({ user: 'admin@escort.local', password: 'admin123', result: adminResult });
  
  console.log('✅ Simple passwords set:');
  results.forEach(r => {
    console.log(`  ${r.user}: ${r.password} (${r.result.success ? 'SUCCESS' : 'FAILED'})`);
  });
  
  return results;
}

// Common password change scenarios
function changeToSecurePassword(email) {
  const securePassword = 'SecurePass123!@#';
  return changePassword(email, securePassword);
}

function changeToTemporaryPassword(email) {
  const tempPassword = 'TempPass123!';
  return changePassword(email, tempPassword);
}

/**
 * EXAMPLE USAGE FUNCTIONS - Run these to change passwords
 */

// Example 1: Change the default admin password
function example_ChangeAdminPassword() {
  return changePassword('admin@escort.local', 'MyNewAdminPassword123!');
}

// Example 2: Set a simple password for testing
function example_SetSimpleAdminPassword() {
  return changePassword('admin@escort.local', 'admin');
}

// Example 3: View all users
function example_ViewAllUsers() {
  return viewSystemUsers();
}

// Don't forget the hash function
function hashPassword(password) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return raw.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}


/**
 * Load app page using existing HTML files with proper navigation injection
 */
function loadAppPage(pageName, user, rider) {
  try {
    console.log(`📄 Loading page: ${pageName} for user: ${user.email} (${user.role})`);
    
    // Map page names to your existing HTML files
    let fileName;
    
    switch (pageName.toLowerCase()) {
      case 'dashboard':
        if (user.role === 'admin') {
          fileName = 'admin-dashboard';
        } else if (user.role === 'rider') {
          fileName = 'rider-dashboard'; // We'll create this
        } else {
          fileName = 'index';
        }
        break;
      case 'requests':
        fileName = 'requests';
        break;
      case 'assignments':
        fileName = 'assignments';
        break;
      case 'riders':
        fileName = 'riders';
        break;
      case 'notifications':
        fileName = 'notifications';
        break;
      case 'reports':
        fileName = 'reports';
        break;
      default:
        fileName = 'index';
    }
    
    // Try to load the HTML file
    let htmlOutput;
    try {
      console.log(`📂 Loading HTML file: ${fileName}.html`);
      htmlOutput = HtmlService.createHtmlOutputFromFile(fileName);
    } catch (fileError) {
      console.log(`⚠️ File ${fileName}.html not found`);
      
      // Special case: if rider-dashboard is missing, create it
      if (fileName === 'rider-dashboard') {
        console.log('🔧 Creating rider dashboard dynamically');
        return createRiderDashboard(user, rider);
      }
      
      // Fallback to index
      console.log(`⚠️ Falling back to index.html`);
      try {
        htmlOutput = HtmlService.createHtmlOutputFromFile('index');
      } catch (indexError) {
        return createFallbackPage(pageName, user, rider);
      }
    }
    
    // Get the content and inject navigation/user info
    let content = htmlOutput.getContent();
    
    // Inject navigation using your existing functions
    try {
      if (typeof getRoleBasedNavigationSafe === 'function') {
        const navigationHtml = getRoleBasedNavigationSafe(pageName, user, rider);
        if (typeof addNavigationToContentSafe === 'function') {
          content = addNavigationToContentSafe(content, navigationHtml);
        } else {
          content = injectNavigationIntoContent(content, navigationHtml);
        }
      } else {
        // Create simple navigation as fallback
        const simpleNav = createWorkingNavigation(pageName, user.role);
        content = injectNavigationIntoContent(content, simpleNav);
      }
    } catch (navError) {
      console.log('⚠️ Navigation injection failed:', navError.message);
      // Add simple navigation as fallback
      const simpleNav = createWorkingNavigation(pageName, user.role);
      content = injectNavigationIntoContent(content, simpleNav);
    }
    
    // Inject user information
    content = injectUserInfo(content, user, rider);
    
    // Set the modified content
    htmlOutput.setContent(content);
    
    console.log(`✅ Successfully loaded ${fileName}.html`);
    
    return htmlOutput.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
  } catch (error) {
    console.error('❌ Page loading error:', error);
    return createFallbackPage(pageName, user, rider);
  }
}

/**
 * Get page file name based on user role (like your existing logic)
 */
function getPageFileName(pageName, userRole) {
  console.log(`🔍 Getting page file name for: ${pageName}, role: ${userRole}`);
  
  // Use your existing logic or adapt it
  if (typeof getPageFileNameSafe === 'function') {
    return getPageFileNameSafe(pageName, userRole);
  }
  
  // Fallback logic based on your existing patterns
  switch (pageName.toLowerCase()) {
    case 'dashboard':
      if (userRole === 'admin') return 'admin-dashboard';
      if (userRole === 'rider') return 'rider-dashboard';
      return 'index';
    case 'requests':
      return 'requests';
    case 'assignments':
      return 'assignments';
    case 'riders':
      return 'riders';
    case 'notifications':
      return 'notifications';
    case 'reports':
      return 'reports';
    default:
      return 'index';
  }
}

/**
 * Simple navigation injection if your existing functions aren't available
 */
function injectNavigationIntoContent(content, navigationHtml) {
  try {
    // Look for navigation placeholder first
    if (content.includes('<!--NAVIGATION_MENU_PLACEHOLDER-->')) {
      console.log('✅ Found navigation placeholder');
      return content.replace('<!--NAVIGATION_MENU_PLACEHOLDER-->', navigationHtml);
    }
    
    // Look for existing nav to replace
    const navRegex = /<nav[^>]*class="navigation"[^>]*>.*?<\/nav>/s;
    if (navRegex.test(content)) {
      console.log('✅ Replacing existing navigation');
      return content.replace(navRegex, navigationHtml);
    }
    
    // Insert after header
    if (content.includes('</header>')) {
      console.log('✅ Injecting after header');
      return content.replace('</header>', '</header>\n' + navigationHtml);
    }
    
    // Insert after body start
    if (content.includes('<body>')) {
      console.log('✅ Injecting after body start');
      return content.replace('<body>', '<body>\n' + navigationHtml);
    }
    
    // Insert at the very beginning of content
    console.log('✅ Adding navigation at beginning');
    return navigationHtml + '\n' + content;
    
  } catch (error) {
    console.log('❌ Navigation injection error:', error.message);
    return content;
  }
}


function injectUserInfo(content, user, rider) {
  try {
    const webAppUrl = getWebAppUrl();
    
    // Create user context script with logout functionality
    const userScript = `
<script>
// User context for existing JavaScript
window.currentUser = {
    email: '${user.email}',
    name: '${user.name}',
    role: '${user.role}',
    method: '${user.method}',
    isAdmin: ${user.role === 'admin'},
    isDispatcher: ${user.role === 'dispatcher'},
    isRider: ${user.role === 'rider'},
    timestamp: ${Date.now()}
};

// Global logout function that works everywhere
window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        console.log('🚪 Logging out user:', window.currentUser.email);
        
        // Show loading state if possible
        const logoutLinks = document.querySelectorAll('a[href*="logout"], .logout-link, .logout-btn');
        logoutLinks.forEach(link => {
            link.textContent = 'Logging out...';
            link.style.opacity = '0.6';
        });
        
        // Redirect to logout
        window.location.href = '${webAppUrl}?action=logout';
        return true;
    }
    return false;
};

// Auto-bind logout to existing logout links on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('👤 User context loaded:', window.currentUser);
    
    // Find and bind all logout links
    const logoutSelectors = [
        'a[href*="logout"]',
        '.logout-link', 
        '.logout-btn',
        '.logout',
        '[data-action="logout"]'
    ];
    
    logoutSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            console.log('🔗 Found logout element:', element);
            
            // Remove existing click handlers and add new one
            element.onclick = function(e) {
                e.preventDefault();
                window.logout();
                return false;
            };
            
            // Also update href to ensure it works
            if (element.tagName === 'A') {
                element.href = '${webAppUrl}?action=logout';
            }
        });
    });
    
    console.log('✅ Logout functionality bound to', document.querySelectorAll(logoutSelectors.join(',')).length, 'elements');
});

console.log('👤 Enhanced user context and logout system loaded');
</script>

<style>
/* Enhanced user info styles */
.user-info {
    background: linear-gradient(135deg, #4285f4, #34a853);
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    margin: 10px 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.user-info-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
}

.user-details {
    flex: 1;
}

.user-name {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 5px;
}

.user-meta {
    font-size: 0.9rem;
    opacity: 0.9;
}

.logout-area {
    margin-left: 20px;
}

.logout-btn {
    background: rgba(255,255,255,0.2);
    color: white;
    padding: 8px 16px;
    text-decoration: none;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.3);
    font-weight: 500;
    transition: all 0.3s ease;
    cursor: pointer;
    display: inline-block;
}

.logout-btn:hover {
    background: rgba(255,255,255,0.3);
    color: white;
    text-decoration: none;
    transform: translateY(-1px);
}

@media (max-width: 600px) {
    .user-info-content {
        flex-direction: column;
        text-align: center;
    }
    
    .logout-area {
        margin-left: 0;
        margin-top: 10px;
    }
}
</style>`;

    // Try to inject user info box into content
    let userInfoHtml = `
<div class="user-info">
    <div class="user-info-content">
        <div class="user-details">
            <div class="user-name">👤 ${user.name}</div>
            <div class="user-meta">${user.email} • ${user.role} • ${user.method}</div>
        </div>
        <div class="logout-area">
            <a href="${webAppUrl}?action=logout" class="logout-btn" onclick="return window.logout ? window.logout() : true">
                🚪 Logout
            </a>
        </div>
    </div>
</div>`;

    // Try multiple injection strategies
    let contentModified = false;

    // Strategy 1: Look for existing user info area
    if (content.includes('user-info') || content.includes('current-user')) {
        console.log('✅ Found existing user info area, enhancing...');
        // Add script without replacing existing user info
        contentModified = true;
    }
    
    // Strategy 2: Look for header area to inject after
    else if (content.includes('</header>')) {
        console.log('✅ Injecting user info after header');
        content = content.replace('</header>', '</header>\n' + userInfoHtml);
        contentModified = true;
    }
    
    // Strategy 3: Look for navigation area to inject after
    else if (content.includes('</nav>')) {
        console.log('✅ Injecting user info after navigation');
        content = content.replace('</nav>', '</nav>\n' + userInfoHtml);
        contentModified = true;
    }
    
    // Strategy 4: Look for body start
    else if (content.includes('<body>')) {
        console.log('✅ Injecting user info after body start');
        content = content.replace('<body>', '<body>\n' + userInfoHtml);
        contentModified = true;
    }
    
    // Strategy 5: Add at the beginning
    else {
        console.log('✅ Adding user info at beginning of content');
        content = userInfoHtml + '\n' + content;
        contentModified = true;
    }

    // Always add the script
    if (content.includes('</body>')) {
        content = content.replace('</body>', userScript + '\n</body>');
    } else if (content.includes('</html>')) {
        content = content.replace('</html>', userScript + '\n</html>');
    } else {
        content += userScript;
    }

    console.log('✅ User info injection completed, content modified:', contentModified);
    return content;
    
  } catch (error) {
    console.log('❌ User info injection error:', error.message);
    return content;
  }
}
function createWorkingNavigation(currentPage, userRole) {
  const webAppUrl = getWebAppUrl();
  
  const basePages = [
    { name: 'dashboard', label: '📊 Dashboard' },
    { name: 'requests', label: '📋 Requests' },
    { name: 'assignments', label: '🏍️ Assignments' },
    { name: 'riders', label: '👥 Riders' },
    { name: 'notifications', label: '📱 Notifications' },
    { name: 'reports', label: '📈 Reports' }
  ];
  
  // Filter pages based on role
  let pages = basePages;
  if (userRole === 'rider') {
    pages = [
      { name: 'dashboard', label: '📊 Dashboard' },
      { name: 'assignments', label: '🏍️ My Assignments' }
    ];
  }
  
  const navLinks = pages.map(page => {
    const isActive = page.name === currentPage.toLowerCase();
    const activeClass = isActive ? ' active' : '';
    return `        <a href="${webAppUrl}?page=${page.name}" class="nav-button${activeClass}">${page.label}</a>`;
  }).join('\n');
  
  return `
<nav class="navigation">
    <div class="nav-container">
        ${navLinks}
        <a href="?action=logout" class="nav-button logout" 
   onclick="return confirm('Are you sure you want to logout?');">
   🚪 Logout
</a>
    </div>
</nav>

<style>
.navigation {
    background: white;
    padding: 10px 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin-bottom: 20px;
    border-bottom: 3px solid #4285f4;
}
.nav-container {
    max-width: 1200px;
    margin: 0 auto;
}
.nav-button {
    text-decoration: none;
    padding: 12px 18px;
    margin: 0 5px;
    background: #f8f9fa;
    border-radius: 6px;
    color: #333;
    display: inline-block;
    font-weight: 500;
    transition: all 0.3s ease;
}
.nav-button.active {
    background: #4285f4;
    color: white;
    box-shadow: 0 2px 4px rgba(66, 133, 244, 0.3);
}
.nav-button:hover {
    background: #e9ecef;
    transform: translateY(-1px);
}
.nav-button.active:hover {
    background: #3367d6;
}
.nav-button.logout {
    background: #dc3545;
    color: white;
    float: right;
}
.nav-button.logout:hover {
    background: #c82333;
}
</style>

<script>
function confirmLogout() {
    if (confirm('Are you sure you want to logout?')) {
        console.log('🚪 User confirmed logout');
        return true;
    }
    return false;
}

// Log navigation clicks for debugging
document.addEventListener('DOMContentLoaded', function() {
    const navButtons = document.querySelectorAll('.nav-button');
    navButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            console.log('🔗 Navigation clicked:', this.href);
            
            if (this.href.includes('action=logout')) {
                console.log('🚪 Logout button clicked');
            }
        });
    });
});
</script>`;
}

/**
 * Create simple navigation if your existing functions aren't available
 */
function createSimpleNavigation(currentPage, userRole) {
  const webAppUrl = getWebAppUrl();
  
  const basePages = [
    { name: 'dashboard', label: '📊 Dashboard' },
    { name: 'requests', label: '📋 Requests' },
    { name: 'assignments', label: '🏍️ Assignments' },
    { name: 'riders', label: '👥 Riders' },
    { name: 'notifications', label: '📱 Notifications' },
    { name: 'reports', label: '📈 Reports' }
  ];
  
  // Filter pages based on role
  let pages = basePages;
  if (userRole === 'rider') {
    pages = [
      { name: 'dashboard', label: '📊 Dashboard' },
      { name: 'assignments', label: '🏍️ My Assignments' }
    ];
  }
  
  const navLinks = pages.map(page => {
    const isActive = page.name === currentPage.toLowerCase();
    const activeClass = isActive ? ' active' : '';
    return `<a href="${webAppUrl}?page=${page.name}" class="nav-button${activeClass}">${page.label}</a>`;
  }).join('\n    ');
  
  return `
<nav class="navigation">
    ${navLinks}
    <a href="${webAppUrl}?action=logout" class="nav-button logout">🚪 Logout</a>
</nav>

<style>
.navigation {
  background: white;
  padding: 10px 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}
.nav-button {
  text-decoration: none;
  padding: 10px 15px;
  margin: 0 5px;
  background: #f8f9fa;
  border-radius: 4px;
  color: #333;
  display: inline-block;
}
.nav-button.active {
  background: #4285f4;
  color: white;
}
.nav-button:hover {
  background: #e9ecef;
}
.nav-button.active:hover {
  background: #3367d6;
}
.nav-button.logout {
  background: #dc3545;
  color: white;
  float: right;
}
.nav-button.logout:hover {
  background: #c82333;
}
</style>`;
}

/**
 * Fallback page if HTML files can't be loaded
 */
function createFallbackPage(pageName, user, rider) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${pageName} - Escort Management</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .nav { background: #4285f4; color: white; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .nav a { color: white; text-decoration: none; margin: 0 15px; }
    .error { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="nav">
      <strong>🏍️ Escort Management</strong>
      <a href="?page=dashboard">Dashboard</a>
      <a href="?page=requests">Requests</a>
      <a href="?page=assignments">Assignments</a>
      <a href="?action=logout">Logout</a>
    </div>
    
    <h1>📄 ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}</h1>
    
    <div class="error">
      <h3>⚠️ Page Loading Issue</h3>
      <p>Could not load the HTML file for this page. This might mean:</p>
      <ul>
        <li>The HTML file <code>${pageName}.html</code> doesn't exist</li>
        <li>There's a file access issue</li>
        <li>The page name mapping needs to be updated</li>
      </ul>
      
      <h4>👤 Current User:</h4>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Role:</strong> ${user.role}</p>
      <p><strong>Requested Page:</strong> ${pageName}</p>
    </div>
    
    <p><a href="?page=dashboard">← Return to Dashboard</a></p>
  </div>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle(`${pageName} - Escort Management`)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Safe wrapper to get web app URL
 */
function getWebAppUrl() {
  try {
    return ScriptApp.getService().getUrl();
  } catch (error) {
    console.error('Error getting web app URL:', error);
    return '#';
  }
}

/**
 * Test function to see what HTML files exist
 */
function testExistingPages() {
  console.log('🔍 Testing which HTML pages exist...');
  
  const pagesToTest = [
    'index',
    'admin-dashboard', 
    'rider-dashboard',
    'requests',
    'assignments',
    'riders', 
    'notifications',
    'reports'
  ];
  
  const results = [];
  
  pagesToTest.forEach(page => {
    try {
      HtmlService.createHtmlOutputFromFile(page);
      console.log(`✅ ${page}.html exists`);
      results.push({ page: page, exists: true });
    } catch (error) {
      console.log(`❌ ${page}.html not found`);
      results.push({ page: page, exists: false, error: error.message });
    }
  });
  
  console.log('\n📋 Summary of existing pages:');
  const existingPages = results.filter(r => r.exists).map(r => r.page);
  const missingPages = results.filter(r => !r.exists).map(r => r.page);
  
  console.log('Existing:', existingPages.join(', '));
  console.log('Missing:', missingPages.join(', '));
  
  return results;
}


function debugAuthenticationFlow() {
  try {
    console.log('🔍 === DEBUGGING AUTHENTICATION FLOW ===');
    
    // Check session
    console.log('1. Checking authenticated session...');
    const session = getAuthenticatedSession();
    console.log('Session result:', session);
    
    if (session.isValid) {
      console.log('2. Session is valid, testing page load...');
      console.log('User data in session:', session.user);
      console.log('Rider data in session:', session.rider);
      
      return {
        session: session,
        userDataPresent: !!session.user,
        userEmail: session.user ? session.user.email : 'N/A',
        userRole: session.user ? session.user.role : 'N/A'
      };
    } else {
      console.log('2. Session is not valid');
      return { session: session, error: 'Session not valid' };
    }
    
  } catch (error) {
    console.error('❌ Debug flow error:', error);
    return { error: error.message };
  }
}

function checkCurrentSession() {
  const session = getAuthenticatedSession();
  console.log('Current session:', session);
  
  if (session.isValid) {
    console.log('User data:', session.user);
    console.log('Rider data:', session.rider);
  }
  
  return session;
}

function refreshSessionWithName() {
  try {
    console.log('🔄 Refreshing session with proper name...');
    
    const userProperties = PropertiesService.getUserProperties();
    const sessionData = userProperties.getProperty('AUTHENTICATED_USER');
    
    if (!sessionData) {
      return { success: false, error: 'No session to refresh' };
    }
    
    const session = JSON.parse(sessionData);
    console.log('Original session:', session);
    
    // Fix the name
    if (!session.name || session.name === 'undefined') {
      session.name = extractNameFromEmail(session.email);
      console.log('Fixed name to:', session.name);
      
      // Save the updated session
      userProperties.setProperty('AUTHENTICATED_USER', JSON.stringify(session));
    }
    
    console.log('Updated session:', session);
    
    return {
      success: true,
      message: 'Session refreshed with proper name',
      session: session
    };
    
  } catch (error) {
    console.error('❌ Refresh failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function verifyFix() {
  const session = getAuthenticatedSession();
  console.log('Fixed session:', session);
  
  if (session.isValid && session.user && session.user.name) {
    console.log('✅ Session has proper name:', session.user.name);
    return { success: true, userName: session.user.name };
  } else {
    console.log('❌ Session still has issues');
    return { success: false, session: session };
  }
}
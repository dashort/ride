/**
 * @fileoverview
 * Authentication Router for handling dual authentication methods
 * when deployed as "User accessing the web app"
 */

/**
 * Enhanced doGet function that handles both authentication methods
 */
function doGet(e) {
  try {
    console.log('🚀 Enhanced doGet with dual authentication...');
    
    // Check if user explicitly wants credential login
    if (e.parameter && e.parameter.action === 'credential-login') {
      return createCredentialLoginPage();
    }
    
    // Check if user is submitting credentials
    if (e.parameter && e.parameter.action === 'login-credentials') {
      return handleCredentialLoginSubmission(e.parameter);
    }
    
    // Try Google OAuth first (automatic when deployed as "User accessing the web app")
    let authResult;
    try {
      authResult = authenticateWithGoogle();
    } catch (error) {
      console.log('Google OAuth not available or failed:', error.message);
      authResult = { success: false, error: 'GOOGLE_AUTH_FAILED' };
    }
    
    if (authResult.success) {
      // Google OAuth succeeded, proceed with normal flow
      const { user: authenticatedUser, rider } = authResult;
      const pageName = e.parameter && e.parameter.page ? e.parameter.page : 'dashboard';
      
      return loadAuthenticatedPage(pageName, authenticatedUser, rider, e);
    } else {
      // Check if we should show access request page
      if (authResult.showAccessRequest) {
        return createAccessRequestPage(authResult.userEmail, authResult.userName);
      }
      
      // Google OAuth failed or user not authorized via Google
      // Show option for credential-based login
      return createAuthenticationChoicePage();
    }
    
  } catch (error) {
    console.error('❌ doGet error:', error);
    return createErrorPageWithAuthOptions(error);
  }
}

/**
 * Create a page that offers authentication choices
 */
function createAuthenticationChoicePage() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Choose Login Method - Motorcycle Escort Management</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      margin: 0;
      padding: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .auth-container {
      max-width: 500px;
      width: 100%;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 15px;
      padding: 2.5rem;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      text-align: center;
    }
    
    .header h1 {
      color: #333;
      margin: 0 0 0.5rem 0;
      font-size: 1.8rem;
    }
    
    .header p {
      color: #666;
      margin: 0 0 2rem 0;
    }
    
    .auth-option {
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      padding: 1.5rem;
      margin: 1rem 0;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .auth-option:hover {
      border-color: #4285f4;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.2);
    }
    
    .auth-option h3 {
      margin: 0 0 0.5rem 0;
      color: #333;
    }
    
    .auth-option p {
      margin: 0;
      color: #666;
      font-size: 0.9rem;
    }
    
    .btn {
      width: 100%;
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-top: 0.5rem;
    }
    
    .btn-google {
      background: #4285f4;
      color: white;
    }
    
    .btn-credentials {
      background: #34a853;
      color: white;
    }
    
    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    
    .note {
      margin-top: 2rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
      font-size: 0.85rem;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="auth-container">
    <div class="header">
      <h1>🏍️ Welcome</h1>
      <p>Motorcycle Escort Management System</p>
    </div>
    
    <div class="auth-option" onclick="useGoogleAuth()">
      <h3>🔐 Google Account</h3>
      <p>Sign in with your Google account (recommended)</p>
      <button class="btn btn-google">Continue with Google</button>
    </div>
    
    <div class="auth-option" onclick="useCredentialAuth()">
      <h3>🔑 Email & Password</h3>
      <p>Sign in with your email and password</p>
      <button class="btn btn-credentials">Use Email & Password</button>
    </div>
    
    <div class="note">
      <strong>Note:</strong> If you have a Google account associated with this system, 
      we recommend using Google sign-in for enhanced security.
    </div>
  </div>
  
  <script>
    function useGoogleAuth() {
      // Refresh the page to trigger Google OAuth
      window.location.href = window.location.origin + window.location.pathname;
    }
    
    function useCredentialAuth() {
      // Redirect to credential login page
      const url = window.location.origin + window.location.pathname + '?action=credential-login';
      window.location.href = url;
    }
  </script>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('Choose Login Method')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Create credential-only login page
 */
function createCredentialLoginPage() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Login - Motorcycle Escort Management</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      margin: 0;
      padding: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    #loginContainer {
      max-width: 450px;
      width: 100%;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 15px;
      padding: 2.5rem;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
    }
    
    .header {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    .header h1 {
      color: #333;
      margin: 0 0 0.5rem 0;
      font-size: 1.8rem;
    }
    
    .header p {
      color: #666;
      margin: 0;
      font-size: 0.9rem;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: bold;
      color: #333;
    }
    
    input[type="email"], input[type="password"] {
      width: 100%;
      padding: 12px 15px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      box-sizing: border-box;
      transition: border-color 0.3s ease, box-shadow 0.3s ease;
    }
    
    input[type="email"]:focus, input[type="password"]:focus {
      outline: none;
      border-color: #4285f4;
      box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1);
    }
    
    .btn {
      width: 100%;
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-bottom: 1rem;
    }
    
    .btn-primary {
      background: #4285f4;
      color: white;
    }
    
    .btn-primary:hover:not(:disabled) {
      background: #3367d6;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    
    .btn-secondary:hover:not(:disabled) {
      background: #5a6268;
      transform: translateY(-1px);
    }
    
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .divider {
      text-align: center;
      margin: 1.5rem 0;
      position: relative;
    }
    
    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #e0e0e0;
    }
    
    .divider span {
      background: white;
      padding: 0 1rem;
      color: #666;
      font-size: 0.9rem;
    }
    
    .message {
      margin-top: 1rem;
      padding: 10px 15px;
      border-radius: 8px;
      font-size: 0.9rem;
      display: none;
    }
    
    .message.error {
      background: #ffebee;
      color: #c62828;
      border: 1px solid #ffcdd2;
    }
    
    .message.info {
      background: #e3f2fd;
      color: #1565c0;
      border: 1px solid #bbdefb;
    }
    
    .loading {
      display: none;
      text-align: center;
      margin-top: 1rem;
    }
    
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #4285f4;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
<div id="loginContainer">
  <div class="header">
    <h1>🔑 Email Login</h1>
    <p>Motorcycle Escort Management System</p>
  </div>
  
  <form id="loginForm">
    <div class="form-group">
      <label for="email">Email Address</label>
      <input type="email" id="email" name="email" placeholder="Enter your email" required autocomplete="email">
    </div>
    
    <div class="form-group">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" placeholder="Enter your password" required autocomplete="current-password">
    </div>
    
    <button type="submit" id="loginBtn" class="btn btn-primary">
      🔑 Sign In
    </button>
  </form>
  
  <div class="divider">
    <span>or</span>
  </div>
  
  <button id="googleBtn" class="btn btn-secondary" onclick="useGoogleAuth()">
    🔄 Use Google Sign-In Instead
  </button>
  
  <div id="message" class="message"></div>
  
  <div id="loading" class="loading">
    <div class="spinner"></div>
    <p>Authenticating...</p>
  </div>
</div>

<script>
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const messageDiv = document.getElementById('message');
  const loadingDiv = document.getElementById('loading');
  
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
      showMessage('Please enter both email and password', 'error');
      return;
    }
    
    setLoading(true);
    
    // Submit credentials via server function
    google.script.run
      .withSuccessHandler(handleLoginResponse)
      .withFailureHandler(handleLoginError)
      .loginWithCredentials(email, password);
  });
  
  function handleLoginResponse(response) {
    setLoading(false);
    
    if (response && response.success) {
      showMessage('Login successful! Redirecting...', 'info');
      setTimeout(() => {
        window.location.href = response.url || window.location.origin + window.location.pathname;
      }, 1000);
    } else {
      showMessage(response.message || 'Login failed', 'error');
    }
  }
  
  function handleLoginError(error) {
    setLoading(false);
    console.error('Login error:', error);
    showMessage('Login system error. Please try again.', 'error');
  }
  
  function useGoogleAuth() {
    if (confirm('Switch to Google authentication? This will redirect you to Google sign-in.')) {
      window.location.href = window.location.origin + window.location.pathname;
    }
  }
  
  function setLoading(loading) {
    if (loading) {
      loadingDiv.style.display = 'block';
      loginBtn.disabled = true;
    } else {
      loadingDiv.style.display = 'none';
      loginBtn.disabled = false;
    }
  }
  
  function showMessage(text, type = 'info') {
    messageDiv.textContent = text;
    messageDiv.className = \`message \${type}\`;
    messageDiv.style.display = 'block';
  }
  
  // Focus email input on load
  document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('email').focus();
  });
</script>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('Email Login')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Handle credential login submission
 */
function handleCredentialLoginSubmission(parameters) {
  try {
    const email = parameters.email;
    const password = parameters.password;
    
    const loginResult = loginWithCredentials(email, password);
    
    if (loginResult.success) {
      // Redirect to main application
      const redirectUrl = getWebAppUrlSafe();
      const html = `
        <html>
          <body>
            <script>
              window.location.href = '${redirectUrl}';
            </script>
            <p>Login successful! Redirecting...</p>
          </body>
        </html>
      `;
      return HtmlService.createHtmlOutput(html);
    } else {
      // Return to login page with error
      return createCredentialLoginPageWithError(loginResult.message);
    }
  } catch (error) {
    return createCredentialLoginPageWithError('Login system error');
  }
}

/**
 * Create credential login page with error message
 */
function createCredentialLoginPageWithError(errorMessage) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Login - Motorcycle Escort Management</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      margin: 0;
      padding: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    #loginContainer {
      max-width: 450px;
      width: 100%;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 15px;
      padding: 2.5rem;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
    }
    
    .header {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    .header h1 {
      color: #333;
      margin: 0 0 0.5rem 0;
      font-size: 1.8rem;
    }
    
    .header p {
      color: #666;
      margin: 0;
      font-size: 0.9rem;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: bold;
      color: #333;
    }
    
    input[type="email"], input[type="password"] {
      width: 100%;
      padding: 12px 15px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      box-sizing: border-box;
      transition: border-color 0.3s ease, box-shadow 0.3s ease;
    }
    
    input[type="email"]:focus, input[type="password"]:focus {
      outline: none;
      border-color: #4285f4;
      box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1);
    }
    
    .btn {
      width: 100%;
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-bottom: 1rem;
    }
    
    .btn-primary {
      background: #4285f4;
      color: white;
    }
    
    .btn-primary:hover:not(:disabled) {
      background: #3367d6;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    
    .btn-secondary:hover:not(:disabled) {
      background: #5a6268;
      transform: translateY(-1px);
    }
    
    .divider {
      text-align: center;
      margin: 1.5rem 0;
      position: relative;
    }
    
    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #e0e0e0;
    }
    
    .divider span {
      background: white;
      padding: 0 1rem;
      color: #666;
      font-size: 0.9rem;
    }
    
    .message {
      margin-top: 1rem;
      padding: 10px 15px;
      border-radius: 8px;
      font-size: 0.9rem;
    }
    
    .message.error {
      background: #ffebee;
      color: #c62828;
      border: 1px solid #ffcdd2;
    }
  </style>
</head>
<body>
<div id="loginContainer">
  <div class="header">
    <h1>🔑 Email Login</h1>
    <p>Motorcycle Escort Management System</p>
  </div>
  
  <div class="message error">
    ${errorMessage}
  </div>
  
  <form id="loginForm">
    <div class="form-group">
      <label for="email">Email Address</label>
      <input type="email" id="email" name="email" placeholder="Enter your email" required autocomplete="email">
    </div>
    
    <div class="form-group">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" placeholder="Enter your password" required autocomplete="current-password">
    </div>
    
    <button type="submit" id="loginBtn" class="btn btn-primary">
      🔑 Try Again
    </button>
  </form>
  
  <div class="divider">
    <span>or</span>
  </div>
  
  <button id="googleBtn" class="btn btn-secondary" onclick="useGoogleAuth()">
    🔄 Use Google Sign-In Instead
  </button>
</div>

<script>
  const loginForm = document.getElementById('loginForm');
  
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }
    
    // Submit credentials via server function
    google.script.run
      .withSuccessHandler(function(response) {
        if (response && response.success) {
          alert('Login successful! Redirecting...');
          window.location.href = response.url || window.location.origin + window.location.pathname;
        } else {
          alert(response.message || 'Login failed');
        }
      })
      .withFailureHandler(function(error) {
        alert('Login system error. Please try again.');
      })
      .loginWithCredentials(email, password);
  });
  
  function useGoogleAuth() {
    if (confirm('Switch to Google authentication?')) {
      window.location.href = window.location.origin + window.location.pathname;
    }
  }
  
  // Focus email input on load
  document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('email').focus();
  });
</script>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('Email Login')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Authenticate with Google (for "User accessing the web app" deployment)
 */
function authenticateWithGoogle() {
  try {
    const user = Session.getActiveUser();
    const userEmail = user.getEmail();
    
    if (!userEmail) {
      return {
        success: false,
        error: 'NO_EMAIL',
        message: 'Google authentication failed'
      };
    }
    
    // Check if user is authorized via Google account
    const rider = getRiderByGoogleEmail(userEmail);
    const adminUsers = getAdminUsers();
    const dispatcherUsers = getDispatcherUsers();
    
    let userRole = 'unauthorized';
    
    if (adminUsers.includes(userEmail)) {
      userRole = 'admin';
    } else if (dispatcherUsers.includes(userEmail)) {
      userRole = 'dispatcher';
    } else if (rider && rider.status === 'Active') {
      userRole = 'rider';
    } else {
      // User not authorized - offer access request instead of denying
      const user = Session.getActiveUser();
      return {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Your Google account is not authorized to access this system',
        showAccessRequest: true,
        userEmail: userEmail,
        userName: user.getName() || userEmail.split('@')[0]
      };
    }
    
    const authenticatedUser = {
      name: user.getName() || rider?.name || userEmail.split('@')[0],
      email: userEmail,
      role: userRole,
      avatar: (user.getName() || userEmail).charAt(0).toUpperCase()
    };
    
    // Log successful authentication
    if (typeof logSecurityEvent === 'function') {
      logSecurityEvent('SUCCESSFUL_LOGIN', { 
        email: userEmail, 
        role: userRole,
        method: 'google_oauth_auto'
      });
    }
    
    return {
      success: true,
      user: authenticatedUser,
      rider: rider
    };
    
  } catch (error) {
    console.error('Google authentication error:', error);
    return {
      success: false,
      error: 'AUTH_ERROR',
      message: 'Google authentication system error'
    };
  }
}

/**
 * Load authenticated page
 */
function loadAuthenticatedPage(pageName, authenticatedUser, rider, e) {
  console.log(`📄 Loading page: ${pageName} for role: ${authenticatedUser.role}`);
  
  // Check page access
  const pageAccess = checkPageAccess(pageName, authenticatedUser, rider);
  if (!pageAccess.allowed) {
    return createAccessDeniedPage(pageAccess.reason, authenticatedUser);
  }
  
  // Load page content
  const fileName = getPageFileNameSafe(pageName, authenticatedUser.role);
  let htmlOutput;
  try {
    htmlOutput = HtmlService.createHtmlOutputFromFile(fileName);
  } catch (error) {
    // Fallback if file doesn't exist
    console.log('Page file not found:', fileName, 'falling back to index');
    htmlOutput = HtmlService.createHtmlOutputFromFile('index');
  }
  
  let content = htmlOutput.getContent();
  
  // Add enhancements (with safe fallbacks)
  if (typeof addMotorcycleLoaderToContent === 'function') {
    content = addMotorcycleLoaderToContent(content);
  }
  
  const navigationHtml = getRoleBasedNavigationSafe(pageName, authenticatedUser, rider);
  content = injectUserInfoSafe(content, authenticatedUser, rider);
  content = addNavigationToContentSafe(content, navigationHtml);
  
  if (typeof injectUrlParameters === 'function') {
    content = injectUrlParameters(content, e.parameter);
  }
  
  htmlOutput.setContent(content);
  
  if (typeof addUserDataInjectionSafe === 'function') {
    addUserDataInjectionSafe(htmlOutput, authenticatedUser, rider);
  }
  
  if (typeof addMobileOptimizations === 'function') {
    addMobileOptimizations(htmlOutput, authenticatedUser, rider);
  }
  
  return htmlOutput
    .setTitle(`${pageName.charAt(0).toUpperCase() + pageName.slice(1)} - Escort Management`)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Create error page with auth options
 */
function createErrorPageWithAuthOptions(error) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>System Error</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
    .container { max-width: 500px; margin: 0 auto; background: white; padding: 2rem; border-radius: 10px; }
    .btn { background: #4285f4; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚠️ System Error</h1>
    <p>An error occurred while loading the application.</p>
    <p><strong>Error:</strong> ${error.message || 'Unknown error'}</p>
    
    <div style="margin-top: 2rem;">
      <button class="btn" onclick="window.location.reload()">🔄 Try Again</button>
      <button class="btn" onclick="window.location.href='?action=credential-login'">🔑 Use Email Login</button>
    </div>
  </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html).setTitle('System Error');
}

/**
 * Safe helper functions (fallbacks if not defined elsewhere)
 */

function getPageFileNameSafe(pageName, userRole) {
  // Try to use existing function, fallback to simple mapping
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
    'reports': 'reports',
    'user-management': 'user-management',
    'rider-schedule': 'rider-schedule',
    'admin-schedule': 'admin-schedule'
  };
  
  return pageMap[pageName] || 'index';
}

function getRoleBasedNavigationSafe(currentPage, user, rider) {
  // Try to use existing function
  if (typeof getRoleBasedNavigation === 'function') {
    return getRoleBasedNavigation(currentPage, user, rider);
  }
  
  // Fallback simple navigation
  const baseUrl = getWebAppUrlSafe();
  let navItems = [];
  
  if (user.role === 'admin') {
    navItems = [
      { page: 'dashboard', label: '📊 Dashboard' },
      { page: 'requests', label: '📋 Requests' },
      { page: 'assignments', label: '🏍️ Assignments' },
      { page: 'riders', label: '👥 Riders' },
      { page: 'reports', label: '📊 Reports' }
    ];
  } else if (user.role === 'dispatcher') {
    navItems = [
      { page: 'dashboard', label: '📊 Dashboard' },
      { page: 'requests', label: '📋 Requests' },
      { page: 'assignments', label: '🏍️ Assignments' }
    ];
  } else if (user.role === 'rider') {
    navItems = [
      { page: 'dashboard', label: '📊 My Dashboard' },
      { page: 'rider-schedule', label: '📅 My Schedule' }
    ];
  }
  
  let navHtml = '<nav class="navigation">';
  navItems.forEach(item => {
    const isActive = item.page === currentPage ? ' active' : '';
    const url = item.page === 'dashboard' ? baseUrl : `${baseUrl}?page=${item.page}`;
    navHtml += `<a href="${url}" class="nav-button${isActive}">${item.label}</a>`;
  });
  navHtml += '</nav>';
  
  return navHtml;
}

function injectUserInfoSafe(content, user, rider) {
  // Try to use existing function
  if (typeof injectUserInfo === 'function') {
    return injectUserInfo(content, user, rider);
  }
  
  // Fallback user info injection
  content = content.replace(/\{\{USER_NAME\}\}/g, user.name || 'User');
  content = content.replace(/\{\{USER_EMAIL\}\}/g, user.email || '');
  content = content.replace(/\{\{USER_ROLE\}\}/g, user.role || '');
  content = content.replace(/\{\{USER_AVATAR\}\}/g, user.avatar || user.name.charAt(0));
  
  return content;
}

function addNavigationToContentSafe(content, navigationHtml) {
  // Try to use existing function
  if (typeof addNavigationToContent === 'function') {
    return addNavigationToContent(content, navigationHtml);
  }
  
  // Fallback navigation injection
  if (content.includes('{{NAVIGATION}}')) {
    content = content.replace('{{NAVIGATION}}', navigationHtml);
  } else if (content.includes('<body>')) {
    content = content.replace('<body>', '<body>' + navigationHtml);
  }
  
  return content;
}

function createAccessDeniedPage(reason, user) {
  // Try to use existing function
  if (typeof createAccessDeniedPageSimple === 'function') {
    return createAccessDeniedPageSimple(user);
  }
  
  // Fallback access denied page
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Access Denied</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
    .container { max-width: 500px; margin: 0 auto; background: white; padding: 2rem; border-radius: 10px; }
    .btn { background: #4285f4; color: white; padding: 10px 20px; border: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚫 Access Denied</h1>
    <p>You don't have permission to access this page.</p>
    <p><strong>Reason:</strong> ${reason}</p>
    <p><strong>Your Role:</strong> ${user ? user.role : 'Unknown'}</p>
    
    <div style="margin-top: 2rem;">
      <button class="btn" onclick="window.location.href='${getWebAppUrlSafe()}'">🏠 Go to Dashboard</button>
    </div>
  </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html).setTitle('Access Denied');
}

/**
 * Self-registration for Google OAuth users
 */
function requestAccess(userEmail, requestedRole = 'rider') {
  try {
    console.log(`📝 Access request from: ${userEmail}`);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let requestsSheet = ss.getSheetByName('Access_Requests');
    
    // Create Access_Requests sheet if it doesn't exist
    if (!requestsSheet) {
      requestsSheet = ss.insertSheet('Access_Requests');
      const headers = ['Timestamp', 'Email', 'Name', 'Requested Role', 'Status', 'Approved By'];
      requestsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    // Check if request already exists
    const data = requestsSheet.getDataRange().getValues();
    const existingRequest = data.find(row => row[1] === userEmail);
    
    if (existingRequest) {
      return { 
        success: false, 
        message: 'Access request already submitted. Please wait for approval.' 
      };
    }
    
    // Add new request
    const timestamp = new Date();
    const user = Session.getActiveUser();
    const userName = user.getName() || userEmail.split('@')[0];
    
    const newRequest = [
      timestamp,
      userEmail,
      userName,
      requestedRole,
      'Pending',
      ''
    ];
    
    requestsSheet.appendRow(newRequest);
    
    // Send notification to admins
    try {
      const adminEmails = getAdminUsersSafe();
      if (adminEmails && adminEmails.length > 0) {
        const subject = `🔐 New Access Request: ${userEmail}`;
        const body = `
New access request received:

Email: ${userEmail}
Name: ${userName}
Requested Role: ${requestedRole}
Timestamp: ${timestamp}

Please review in the Access_Requests sheet and approve if appropriate.
        `;
        
        adminEmails.forEach(adminEmail => {
          MailApp.sendEmail(adminEmail, subject, body);
        });
      }
    } catch (emailError) {
      console.log('Could not send notification email:', emailError.message);
    }
    
    return {
      success: true,
      message: 'Access request submitted successfully. You will be notified when approved.'
    };
    
  } catch (error) {
    console.error('❌ Access request error:', error);
    return {
      success: false,
      message: 'Error submitting access request. Please contact an administrator.'
    };
  }
}

/**
 * Create access request page for unauthorized users
 */
function createAccessRequestPage(userEmail, userName) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request Access - Motorcycle Escort Management</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      margin: 0;
      padding: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .container {
      max-width: 500px;
      width: 100%;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 15px;
      padding: 2.5rem;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      text-align: center;
    }
    
    .header h1 {
      color: #333;
      margin: 0 0 1rem 0;
      font-size: 1.8rem;
    }
    
    .user-info {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
    }
    
    .btn {
      width: 100%;
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
      margin: 0.5rem 0;
    }
    
    .btn-primary {
      background: #28a745;
      color: white;
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    
    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    
    .message {
      margin: 1rem 0;
      padding: 10px 15px;
      border-radius: 8px;
      display: none;
    }
    
    .message.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    
    .message.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Access Required</h1>
      <p>Motorcycle Escort Management System</p>
    </div>
    
    <div class="user-info">
      <h3>Your Google Account</h3>
      <p><strong>Email:</strong> ${userEmail}</p>
      <p><strong>Name:</strong> ${userName}</p>
    </div>
    
    <p>You need access approval to use this system. Would you like to request access?</p>
    
    <div id="roleSelection">
      <p><strong>Select your role:</strong></p>
      <button class="btn btn-primary" onclick="requestRole('dispatcher')">
        📋 Request Dispatcher Access
      </button>
      <button class="btn btn-primary" onclick="requestRole('rider')">
        🏍️ Request Rider Access
      </button>
    </div>
    
    <div class="message" id="message"></div>
    
    <div style="margin-top: 2rem;">
      <button class="btn btn-secondary" onclick="useCredentialLogin()">
        🔑 Use Email & Password Instead
      </button>
    </div>
  </div>
  
  <script>
    function requestRole(role) {
      const roleSelection = document.getElementById('roleSelection');
      const message = document.getElementById('message');
      
      roleSelection.style.display = 'none';
      message.textContent = 'Submitting access request...';
      message.className = 'message';
      message.style.display = 'block';
      
      google.script.run
        .withSuccessHandler(function(result) {
          if (result.success) {
            message.textContent = result.message;
            message.className = 'message success';
          } else {
            message.textContent = result.message;
            message.className = 'message error';
            roleSelection.style.display = 'block';
          }
        })
        .withFailureHandler(function(error) {
          message.textContent = 'Error submitting request. Please try again.';
          message.className = 'message error';
          roleSelection.style.display = 'block';
        })
        .requestAccess('${userEmail}', role);
    }
    
    function useCredentialLogin() {
      window.location.href = window.location.origin + window.location.pathname + '?action=credential-login';
    }
  </script>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('Request Access')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Test the dual authentication system
 */
function testDualAuthentication() {
  console.log('🧪 Testing dual authentication system...');
  
  // Test Google authentication
  try {
    const googleAuth = authenticateWithGoogle();
    console.log('Google auth result:', googleAuth);
  } catch (error) {
    console.log('Google auth error:', error.message);
  }
  
  // Test credential authentication
  try {
    const credAuth = loginWithCredentials('test@example.com', 'testPassword');
    console.log('Credential auth result:', credAuth);
  } catch (error) {
    console.log('Credential auth error:', error.message);
  }
  
  console.log('🧪 Dual authentication test completed.');
}
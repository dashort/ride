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
  // Return the enhanced login.html but with Google option hidden/modified
  let loginHtml = HtmlService.createHtmlOutputFromFile('login').getContent();
  
  // Modify the HTML to hide/modify Google login option
  loginHtml = loginHtml.replace(
    '<button id="googleBtn" class="btn btn-google">',
    '<button id="googleBtn" class="btn btn-google" onclick="useGoogleInstead()" type="button">'
  );
  
  loginHtml = loginHtml.replace(
    '🔐 Sign In with Google',
    '🔄 Use Google Sign-In Instead'
  );
  
  // Add JavaScript function to redirect to Google auth
  const additionalScript = `
    <script>
      function useGoogleInstead() {
        if (confirm('Switch to Google authentication? This will redirect you to Google sign-in.')) {
          window.location.href = window.location.origin + window.location.pathname;
        }
      }
      
      // Override the original Google login handler
      document.getElementById('googleBtn').onclick = useGoogleInstead;
    </script>
  `;
  
  loginHtml = loginHtml.replace('</body>', additionalScript + '</body>');
  
  return HtmlService.createHtmlOutput(loginHtml)
    .setTitle('Credential Login')
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
      return {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Your Google account is not authorized to access this system'
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
  let htmlOutput = HtmlService.createHtmlOutputFromFile(fileName);
  let content = htmlOutput.getContent();
  
  // Add enhancements
  content = addMotorcycleLoaderToContent(content);
  const navigationHtml = getRoleBasedNavigationSafe(pageName, authenticatedUser, rider);
  content = injectUserInfoSafe(content, authenticatedUser, rider);
  content = addNavigationToContentSafe(content, navigationHtml);
  content = injectUrlParameters(content, e.parameter);
  
  htmlOutput.setContent(content);
  addUserDataInjectionSafe(htmlOutput, authenticatedUser, rider);
  addMobileOptimizations(htmlOutput, authenticatedUser, rider);
  
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
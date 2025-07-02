/**
 * DOGET FIX - Make sure your doGet function calls navigation correctly
 * This should be in your AccessControl.gs file
 */
function doGet(e) {
  try {
    // Authentication
    if (e.parameter?.action === 'signin' || e.parameter?.action === 'login') {
      return createLoginPage();
    }

    const userSession = getEnhancedUserSession();
    if (!userSession.hasEmail) return createLoginPage();
    
    // Authorization
    const rider = getRiderByGoogleEmailSafe(userSession.email);
    const adminUsers = getAdminUsersSafe();
    const dispatcherUsers = getDispatcherUsersSafe();
    
    let userRole = 'unauthorized';
    if (adminUsers.includes(userSession.email)) userRole = 'admin';
    else if (dispatcherUsers.includes(userSession.email)) userRole = 'dispatcher';
    else if (rider?.status === 'Active') userRole = 'rider';
    else return createUnauthorizedPage(userSession.email, userSession.name);
    
    const user = {
      name: userSession.name || rider?.name || 'User',
      email: userSession.email,
      role: userRole,
      avatar: (userSession.name || rider?.name || 'U').charAt(0).toUpperCase()
    };
    
    // Page loading
    let pageName = e.parameter?.page || 'dashboard';
    let pageFile = pageName;
    
    if (userRole === 'admin' && pageName === 'dashboard') pageFile = 'admin-dashboard';
    else if (userRole === 'rider' && pageName === 'dashboard') pageFile = 'rider-dashboard';
    
    if (!checkFileExists(pageFile)) pageFile = 'index';
    
    let content = HtmlService.createHtmlOutputFromFile(pageFile).getContent();
    
    // IMPORTANT: Add navigation using the FIXED function
    const navigation = getRoleBasedNavigation(pageName, user, rider);  // ← This calls our fixed function
    content = content.replace('<!--NAVIGATION_MENU_PLACEHOLDER-->', navigation);
    
    // Add user context
    const userScript = `<script>window.currentUser = ${JSON.stringify(user)};</script>`;
    
    if (content.includes('</body>')) {
      content = content.replace('</body>', userScript + '</body>');
    } else {
      content += userScript;
    }
    
    return HtmlService.createHtmlOutput(content).setTitle('Motorcycle Escort Management');
    
  } catch (error) {
    console.error('doGet error:', error);
    return createErrorPage(error.message);
  }
}
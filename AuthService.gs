// This file will contain functions related to user authentication and authorization.

/**
 * Get current user information (placeholder, actual implementation might involve more checks)
 */
function getCurrentUser() {
  try {
    const session = Session.getActiveUser();
    const email = session.getEmail();
    // Basic role/permission, should be expanded based on actual user roles in your system
    // For example, by looking up the email in a 'User Roles' sheet or PropertiesService
    const userRole = getAdminUsers().includes(email) ? 'admin' : (getDispatcherUsers().includes(email) ? 'dispatcher' : (getRiderByGoogleEmail(email) ? 'rider' : 'guest'));

    return {
      name: session.getName() || email.split('@')[0],
      email: email,
      role: userRole, // Simplified role
      roles: [userRole], // For consistency if 'roles' array is used
      permissions: calculatePermissions([userRole]) // Calculate permissions based on role
    };
  } catch (error) {
    Utils.logError('Error in getCurrentUser', error);
    return {
      name: 'Guest User',
      email: '',
      role: 'guest',
      roles: ['guest'],
      permissions: calculatePermissions(['guest'])
    };
  }
}

/**
 * Main authentication and authorization function.
 * @return {object} Object with success status, user object, and rider object (if applicable).
 */
function authenticateAndAuthorizeUser() {
  try {
    const sessionUser = Session.getActiveUser();
    const userEmail = sessionUser ? sessionUser.getEmail() : null;

    if (!userEmail) {
      return { success: false, error: 'NO_EMAIL', message: 'No active user session or email.' };
    }

    const rider = getRiderByGoogleEmail(userEmail); // Check if user is a known rider
    const adminUsers = getAdminUsers();
    const dispatcherUsers = getDispatcherUsers();

    let userRole = 'unauthorized';
    let permissions = [];

    if (adminUsers.includes(userEmail)) {
      userRole = 'admin';
    } else if (dispatcherUsers.includes(userEmail)) {
      userRole = 'dispatcher';
    } else if (rider && rider.status && rider.status.toLowerCase() === 'active') {
      userRole = 'rider';
    } else if (rider) { // Rider exists but is not 'Active'
      return { success: false, error: 'RIDER_NOT_ACTIVE', message: `Rider account ${userEmail} is not active. Status: ${rider.status}.`, userEmail: userEmail, userName: (sessionUser.getName() || rider.name) };
    } else { // User is not in any predefined role list and not an active rider
      return { success: false, error: 'UNAUTHORIZED', message: `User ${userEmail} is not authorized.`, userEmail: userEmail, userName: sessionUser.getName() };
    }

    permissions = calculatePermissions([userRole]); // Calculate permissions for the determined role

    const user = {
      name: sessionUser.getName() || (rider ? rider.name : userEmail.split('@')[0]),
      email: userEmail,
      role: userRole,
      roles: [userRole],
      permissions: permissions,
      avatar: (sessionUser.getName() || (rider ? rider.name : 'U')).charAt(0).toUpperCase()
    };

    return { success: true, user: user, rider: rider };

  } catch (error) {
    Utils.logError('Critical error in authenticateAndAuthorizeUser', error);
    return { success: false, error: 'AUTH_SYSTEM_ERROR', message: 'An error occurred during authentication.' };
  }
}


function getRiderByGoogleEmail(email) {
  try {
    if (!email) return null;
    const ridersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.riders);
    const data = ridersSheet.getDataRange().getValues();
    const headers = data[0];
    const emailCol = headers.indexOf(CONFIG.columns.riders.email);
    const googleEmailCol = headers.indexOf(CONFIG.columns.riders.googleEmail); // Ensure this column exists
    const nameCol = headers.indexOf(CONFIG.columns.riders.name);
    const statusCol = headers.indexOf(CONFIG.columns.riders.status);
    const idCol = headers.indexOf(CONFIG.columns.riders.jpNumber);

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const riderPrimaryEmail = row[emailCol] ? String(row[emailCol]).trim().toLowerCase() : null;
      const riderGoogleEmail = googleEmailCol !== -1 && row[googleEmailCol] ? String(row[googleEmailCol]).trim().toLowerCase() : null;

      if (riderPrimaryEmail === email.trim().toLowerCase() || riderGoogleEmail === email.trim().toLowerCase()) {
        return {
          id: row[idCol], name: row[nameCol], email: row[emailCol],
          googleEmail: row[googleEmailCol], status: row[statusCol], rowNum: i + 1
        };
      }
    }
    return null;
  } catch (error) {
    Utils.logError('Error in getRiderByGoogleEmail', error);
    return null;
  }
}

function getAdminUsers() {
  try {
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.settings);
    if (settingsSheet && CONFIG.settingsRanges && CONFIG.settingsRanges.adminUsers) {
      const adminRange = settingsSheet.getRange(CONFIG.settingsRanges.adminUsers).getValues();
      return adminRange.flat().filter(email => email && String(email).trim());
    }
    console.warn('Admin users range not found in CONFIG or Settings sheet missing. Using default admins from CONFIG.');
  } catch (error) {
    Utils.logError('Error getting admin users from Settings', error);
  }
  return (CONFIG.defaultUsers && CONFIG.defaultUsers.admins) ? CONFIG.defaultUsers.admins : [];
}

function getDispatcherUsers() {
  try {
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.settings);
    if (settingsSheet && CONFIG.settingsRanges && CONFIG.settingsRanges.dispatcherUsers) {
      const dispatcherRange = settingsSheet.getRange(CONFIG.settingsRanges.dispatcherUsers).getValues();
      return dispatcherRange.flat().filter(email => email && String(email).trim());
    }
    console.warn('Dispatcher users range not found in CONFIG or Settings sheet missing. Using default dispatchers from CONFIG.');
  } catch (error) {
    Utils.logError('Error getting dispatcher users from Settings', error);
  }
  return (CONFIG.defaultUsers && CONFIG.defaultUsers.dispatchers) ? CONFIG.defaultUsers.dispatchers : [];
}

function logout() {
  try {
    PropertiesService.getScriptProperties().deleteProperty('CACHED_USER_EMAIL');
    PropertiesService.getScriptProperties().deleteProperty('CACHED_USER_NAME');
    Utils.logActivity('User logout: Cache cleared.');
  } catch (error) {
    Utils.logError('Error clearing cache during logout', error);
  }
  // Note: Actual Google sign-out happens client-side by redirecting to a Google sign-out URL.
  // This function primarily handles server-side session cleanup if any.
  // The AppServices.gs doGet should handle redirecting to a sign-in page after this.
  return Utils.getWebAppUrlSafe() + '?action=signin&status=loggedout';
}

/**
 * Creates a Sign In page using GenericStatusPage.html.
 * @return {GoogleAppsScript.HTML.HtmlOutput} The HTML output for the sign-in page.
 */
function createSignInPage() {
  const template = HtmlService.createTemplateFromFile('GenericStatusPage.html');
  template.pageTitle = 'Sign In Required';
  template.headerIcon = '🔐';
  template.headerTitle = 'Motorcycle Escort Management';
  template.messageBody = '<p>Please sign in with your Google account to access the system.</p><p>If you are not automatically redirected, please click the button below.</p>';
  template.actionLink = Utils.getWebAppUrlSafe() + '?auth=true&t=' + Date.now(); // Force re-auth attempt
  template.actionText = 'Sign In with Google';
  template.showActionLink = true;
  return template.evaluate().setTitle(template.pageTitle).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Creates an Unauthorized Access page using GenericStatusPage.html.
 * @param {string} email The email of the user attempting access.
 * @param {string} name The name of the user attempting access.
 * @return {GoogleAppsScript.HTML.HtmlOutput} The HTML output for the unauthorized page.
 */
function createUnauthorizedPage(email, name) {
  const template = HtmlService.createTemplateFromFile('GenericStatusPage.html');
  template.pageTitle = 'Access Request';
  template.headerIcon = '🚫';
  template.headerTitle = 'Access Not Authorized';
  template.messageBody = `<p>Your Google account (<strong>${Utils.escapeJsString(email)}</strong>) is not currently authorized for this system.</p><p>If you believe this is an error, or if you are new, please contact your administrator or use the button below to try signing in with a different account.</p>`;
  template.actionLink = Utils.getWebAppUrlSafe() + '?action=signin&logout=true'; // Force sign out then sign in
  template.actionText = 'Try Different Account / Sign In';
  template.showActionLink = true;
  return template.evaluate().setTitle(template.pageTitle).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Creates an Access Denied page using GenericStatusPage.html.
 * @param {string} reason The reason for access denial.
 * @param {object} user The user object (name, role).
 * @return {GoogleAppsScript.HTML.HtmlOutput} The HTML output for the access denied page.
 */
function createAccessDeniedPage(reason, user) {
  const template = HtmlService.createTemplateFromFile('GenericStatusPage.html');
  template.pageTitle = 'Access Denied';
  template.headerIcon = '🚫';
  template.headerTitle = 'Access Denied';
  template.messageBody = `<p>Hello, <strong>${Utils.escapeJsString(user ? user.name : 'User')}</strong>.</p><p>${Utils.escapeJsString(reason || 'You do not have permission to access this page.')}</p><p>Your current role: <strong>${Utils.escapeJsString(user ? user.role : 'Unknown')}</strong>.</p>`;
  template.actionLink = Utils.getWebAppUrlSafe(); // Link to dashboard/home
  template.actionText = '← Back to Dashboard';
  template.showActionLink = true;
  return template.evaluate().setTitle(template.pageTitle).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Creates an Authentication Error page using GenericStatusPage.html.
 * @param {string} errorType A brief description of the authentication error.
 * @return {GoogleAppsScript.HTML.HtmlOutput} The HTML output for the auth error page.
 */
function createAuthErrorPage(errorType) {
  const template = HtmlService.createTemplateFromFile('GenericStatusPage.html');
  template.pageTitle = 'Authentication Error';
  template.headerIcon = '⚠️';
  template.headerTitle = 'Authentication Problem';
  template.messageBody = `<p>An issue occurred during authentication: <strong>${Utils.escapeJsString(errorType)}</strong>.</p><p>Please try signing in again. If the problem persists, contact support.</p>`;
  template.actionLink = Utils.getWebAppUrlSafe() + '?action=signin&logout=true'; // Force sign out then sign in
  template.actionText = 'Try Sign In Again';
  template.showActionLink = true;
  return template.evaluate().setTitle(template.pageTitle).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Placeholder for calculatePermissions if it's not defined elsewhere (e.g. AccessControl.gs)
// This is a simplified version.
if (typeof calculatePermissions !== 'function') {
  function calculatePermissions(roles) {
    const permissionMap = {
      admin: ['view_all', 'edit_all', 'manage_users'],
      dispatcher: ['view_all', 'edit_requests'],
      rider: ['view_own_assignments'],
      guest: ['view_public_info']
    };
    const permissions = new Set();
    if (roles && Array.isArray(roles)) {
      roles.forEach(role => {
        if (permissionMap[role]) {
          permissionMap[role].forEach(permission => permissions.add(permission));
        }
      });
    }
    return Array.from(permissions);
  }
}
>>>>>>> REPLACE

// Main Web Application Service File

/**
 * Handles GET requests for the web application.
 * @param {GoogleAppsScript.Events.AppsScriptHttpRequestEvent} e The event parameter.
 * @return {GoogleAppsScript.HTML.HtmlOutput} The HTML output for the page.
 */
function doGet(e) {
  console.log('AppServices.gs: doGet called with parameters:', JSON.stringify(e.parameter)); // Log parameters
  let pageName = 'dashboard'; // Default page
  let htmlOutput;
  let content;
  let fileName;

  try {
    // Authenticate and Authorize User using AuthService
    const authResult = AuthService.authenticateAndAuthorizeUser();

    if (!authResult || !authResult.success) {
      console.warn('AppServices.gs: Authentication failed or user not authorized. Error:', authResult ? authResult.error : 'Unknown auth error');
      if (authResult && authResult.error === 'NO_EMAIL') {
        // Assuming createSignInPage is designed to be robust or we have a fallback HTML file for sign-in
        return AuthService.createSignInPage ? AuthService.createSignInPage() : HtmlService.createHtmlOutputFromFile('signin').setTitle("Sign In Required").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      }
      // For other auth errors, direct to an unauthorized page
      const activeUser = Session.getActiveUser();
      const userEmail = activeUser ? activeUser.getEmail() : '';
      const userName = activeUser && activeUser.getName ? activeUser.getName() : (userEmail ? userEmail.split('@')[0] : 'Guest');
      return AuthService.createUnauthorizedPage ? AuthService.createUnauthorizedPage(userEmail, userName) : HtmlService.createHtmlOutput("<h1>Access Denied</h1><p>You are not authorized to view this page.</p>").setTitle("Access Denied");
    }

    const user = authResult.user;
    const rider = authResult.rider;

    pageName = e.parameter && e.parameter.page ? e.parameter.page : 'dashboard';
    console.log('AppServices.gs: Determined pageName:', pageName);

    // Check page access using AuthService
    const access = AuthService.checkPageAccessSafe ? AuthService.checkPageAccessSafe(pageName, user, rider) : { allowed: true, reason: "Access check function unavailable" }; // Fallback if checkPageAccessSafe is missing
    if (!access.allowed) {
      console.log('AppServices.gs: Access denied for page:', pageName, 'for user:', user.email, 'role:', user.role, 'Reason:', access.reason);
      return AuthService.createAccessDeniedPage ? AuthService.createAccessDeniedPage(access.reason, user) : HtmlService.createHtmlOutput("<h1>Access Denied</h1><p>" + (access.reason || "You do not have permission to view this page.") + "</p>");
    }
    console.log('AppServices.gs: Access granted for page:', pageName);

    // Get HTML file name using Utils
    fileName = Utils.getPageFileNameSafe(pageName, user.role);
    console.log('AppServices.gs: Serving file:', fileName + ".html");

    if (!Utils.checkFileExists(fileName)) {
        console.error('AppServices.gs: HTML file does not exist:', fileName + ".html");
        Utils.logError('HTML file not found: ' + fileName, new Error('File not found via checkFileExists'));
        return HtmlService.createHtmlOutput("<h1>Page Not Found</h1><p>The requested page could not be found.</p>").setTitle("Page Not Found");
    }
    htmlOutput = HtmlService.createHtmlOutputFromFile(fileName);
    content = htmlOutput.getContent();

    // Inject Navigation using NavigationService
    const navigationHtml = NavigationService.getRoleBasedNavigationSafe(pageName, user, rider);
    content = NavigationService.addNavigationToContentSafe(content, navigationHtml);
    console.log('AppServices.gs: Navigation injected.');

    // Inject UserInfo and UserData using Utils
    content = Utils.injectUserInfoSafe(content, user, rider);
    content = Utils.addUserDataInjectionSafe(content, user, rider);
    console.log('AppServices.gs: User info and data script injected.');

    htmlOutput.setContent(content);
    // Define a getPageTitle function or use a simpler title mechanism
    const title = pageName.charAt(0).toUpperCase() + pageName.slice(1) + ' - Escort Management';
    htmlOutput.setTitle(title);
    htmlOutput.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

    console.log('AppServices.gs: doGet processing complete for page:', pageName);
    return htmlOutput;

  } catch (error) {
    console.error('AppServices.gs: Critical error in doGet for page ' + pageName + ':', error.message, error.stack);
    Utils.logError('Critical doGet error for ' + pageName, error);
    try {
      return AuthService.createErrorPageWithSignIn ? AuthService.createErrorPageWithSignIn(error) : HtmlService.createHtmlOutput("<h1>An unexpected error occurred.</h1><p>" + error.message + "</p><p>Please try signing out and signing back in, or contact support if the issue persists.</p>");
    } catch (fallbackError) {
      console.error('AppServices.gs: Critical error in fallback error page rendering:', fallbackError.message, fallbackError.stack);
      return HtmlService.createHtmlOutput("<h1>Critical System Error</h1><p>The application encountered a severe error and cannot recover. Please contact support immediately.</p>");
    }
  }
}

/**
 * Handles HTTP POST requests for the web application.
 * @param {GoogleAppsScript.Events.AppsScriptHttpRequestEvent} e The event parameter.
 * @return {GoogleAppsScript.Content.TextOutput} The JSON response.
 */
function doPost(e) {
  console.log('AppServices.gs: doPost called with action:', e.parameter ? e.parameter.action : 'No action', 'Parameters:', JSON.stringify(e.parameter));
  let result = { success: false, error: 'Unknown action or no action specified', data: null };
  let user = null;

  try {
    const authResult = AuthService.authenticateAndAuthorizeUser();
    if (!authResult || !authResult.success) {
      Utils.logActivity('doPost: Unauthorized POST attempt.');
      result.error = 'Authentication failed. Please sign in.';
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    user = authResult.user;

    const action = e.parameter && e.parameter.action ? e.parameter.action : null;
    const postDataContents = e.postData && e.postData.contents ? e.postData.contents : '{}';
    const data = JSON.parse(postDataContents); // Data from request body for POST

    // If action is in parameters (e.g. for form submissions not using JSON payload directly for action)
    const actionFromParam = e.parameter && e.parameter.action;
    const finalAction = action || actionFromParam;

    if (!finalAction) {
      throw new Error('No action specified in doPost request.');
    }
    Utils.logActivity('AppServices.doPost Action: ' + finalAction + ' by user: ' + user.email + ' with data: ' + JSON.stringify(data));

    // Routing POST actions to appropriate services
    // This section needs to be populated with actual logic based on original Code.gs doPost
    switch (finalAction) {
      case 'createRequest': // Example: Assumes RequestService.handleCreateRequest exists
        // result = RequestService.createNewRequestSecured(user, data);
        result = { success: true, message: `Action '${finalAction}' received. Data: ${JSON.stringify(data)}`}; // Placeholder
        break;
      case 'assignRiders': // Example: Assumes AssignmentService.assignRidersToRequestSecured exists
        // result = AssignmentService.assignRidersToRequestSecured(user, data.requestId, data.riders);
        result = { success: true, message: `Action '${finalAction}' received. Data: ${JSON.stringify(data)}`}; // Placeholder
        break;
      // Add more cases for other POST actions like 'updateRequestStatus', 'sendNotification', 'bulkNotification', 'generateReport', 'riderOperation'
      default:
        result = { success: false, error: `Action '${finalAction}' is not recognized.` };
        Utils.logError('Unknown doPost action: ' + finalAction, new Error('Unknown action'));
    }

  } catch (err) {
    console.error('AppServices.gs: Error in doPost action ' + (e.parameter && e.parameter.action) + ':', err.message, err.stack);
    Utils.logError('doPost error for action ' + (e.parameter && e.parameter.action), err);
    result.error = 'Error processing request: ' + err.message; // More specific error
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
>>>>>>> REPLACE

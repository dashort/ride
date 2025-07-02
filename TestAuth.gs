// Mock emails for testing different roles
const TEST_EMAILS = {
  ADMIN: 'admin@example.com', // Replace with an actual admin email from your Settings sheet or hardcoded list in AccessControl.gs
  DISPATCHER: 'dispatcher@example.com', // Replace with an actual dispatcher email
  RIDER: 'rider1@example.com', // Replace with an email of an 'Active' rider in your Riders sheet
  UNKNOWN: 'unknown@example.com'
};

// Store original Session methods
let originalSession = null;

function mockGetActiveUser(email) {
  if (!originalSession) {
    originalSession = {
      getActiveUser: Session.getActiveUser,
      getEffectiveUser: Session.getEffectiveUser
    };
  }

  const mockUser = {
    getEmail: function() { return email; },
    getName: function() { return email ? email.split('@')[0] : 'Mock User'; },
    getUserLoginId: function() { return email; },
    getGrantedScopes: function() { return ['https://www.googleapis.com/auth/userinfo.email']; },
    getTimeZone: function() { return 'UTC'; },
    getLanguage: function() { return 'en'; }
  };

  Session.getActiveUser = function() { return mockUser; };
  Session.getEffectiveUser = function() { return mockUser; };

  // Clear any cached user from PropertiesService to ensure fresh fetch for test
  try {
    PropertiesService.getScriptProperties().deleteProperty('CACHED_USER_EMAIL');
    PropertiesService.getScriptProperties().deleteProperty('CACHED_USER_NAME');
  } catch(e) { /* ignore if properties don't exist */ }

  console.log('Mocking Session.getActiveUser().getEmail() to return: ' + email);
}

function restoreOriginalSession() {
  if (originalSession) {
    Session.getActiveUser = originalSession.getActiveUser;
    Session.getEffectiveUser = originalSession.getEffectiveUser;
    originalSession = null;
    console.log('Restored original Session methods.');
  }
}

function testUserAuthenticationAndRoles() {
  console.log('\n--- Testing User Authentication and Roles ---');
  const results = {};
  for (const roleKey in TEST_EMAILS) {
    const email = TEST_EMAILS[roleKey];
    mockGetActiveUser(email);
    try {
      // Directly call the core authentication function from AccessControl.gs
      // Ensure authenticateAndAuthorizeUser is globally accessible or call via a known path
      const authResult = authenticateAndAuthorizeUser(); // This function is in AccessControl.gs
      results[roleKey] = authResult;
      console.log('Auth for ' + roleKey + ' (' + email + '):', JSON.stringify(authResult));
      if (!authResult.success && roleKey !== 'UNKNOWN') {
        console.error('ERROR: Auth failed for known role: ' + roleKey);
      }
      if (authResult.success && authResult.user && roleKey !== 'UNKNOWN' && authResult.user.role.toLowerCase() !== roleKey.toLowerCase()) {
         if (!(roleKey === 'RIDER' && authResult.user.role === 'rider')) { // simple case match
              console.warn('WARN: Role mismatch for ' + roleKey + '. Expected approx: ' + roleKey.toLowerCase() + ', Got: ' + authResult.user.role);
         }
      }
    } catch (e) {
      results[roleKey] = { success: false, error: e.toString(), message: e.message };
      console.error('ERROR during auth test for ' + roleKey + ':', e.toString());
    }
  }
  restoreOriginalSession();
  return results;
}

function testPageAccess() {
  console.log('\n--- Testing Page Access Control ---');
  const pageAccessResults = {};
  const pagesToTest = ['dashboard', 'requests', 'assignments', 'riders', 'rider-availability', 'user-management', 'admin-schedule', 'rider-schedule', 'auth-setup'];

  for (const roleKey in TEST_EMAILS) {
    const email = TEST_EMAILS[roleKey];
    mockGetActiveUser(email);
    const authResult = authenticateAndAuthorizeUser(); // From AccessControl.gs

    pageAccessResults[roleKey] = {};
    if (authResult.success) {
      const user = authResult.user;
      pagesToTest.forEach(page => {
        // Assuming checkPageAccessSafe is globally accessible from AccessControl.gs
        const access = checkPageAccessSafe(page, user, authResult.rider);
        pageAccessResults[roleKey][page] = access.allowed;
        console.log('Access for ' + user.role + ' to ' + page + ': ' + (access.allowed ? 'ALLOWED' : 'DENIED') + (access.reason ? ' Reason: ' + access.reason : ''));
      });
    } else {
      pageAccessResults[roleKey]['error'] = 'Auth failed, cannot test page access.';
      pagesToTest.forEach(page => {
         pageAccessResults[roleKey][page] = false; // No access if auth failed
      });
      console.log('Auth failed for ' + roleKey + ', skipping page access tests for this role.');
    }
  }
  restoreOriginalSession();
  return pageAccessResults;
}

function simulateDoGetRequests() {
  console.log('\n--- Simulating doGet Requests ---');
  const doGetResults = {};
  const pagesToTest = {
     ADMIN: 'user-management',
     DISPATCHER: 'requests',
           RIDER: 'rider-availability', // or 'dashboard' if rider-availability needs specific data setup
     UNKNOWN: 'dashboard'
  };

  for (const roleKey in TEST_EMAILS) {
    const email = TEST_EMAILS[roleKey];
    mockGetActiveUser(email);
    const page = pagesToTest[roleKey] || 'dashboard';
    const mockEvent = { parameter: { page: page }, parameters: { page: [page] } };
    try {
      // Ensure doGet is the one from AccessControl.gs. If it's not global, this won't work directly.
      // This assumes the doGet from AccessControl.gs is the one that will be triggered.
      const htmlOutput = doGet(mockEvent); // From AccessControl.gs
      doGetResults[roleKey] = {
        success: true,
        page: page,
        outputType: typeof htmlOutput,
        title: htmlOutput.getTitle ? htmlOutput.getTitle() : 'N/A'
      };
      console.log('doGet for ' + roleKey + ' to ' + page + ': Success, Title: ' + (htmlOutput.getTitle ? htmlOutput.getTitle() : 'N/A'));
      if (htmlOutput.getTitle && htmlOutput.getTitle().toLowerCase().includes('error') && roleKey !== 'UNKNOWN'){
         console.error("ERROR: doGet for " + roleKey + " resulted in an error page: " + htmlOutput.getTitle());
      }
      if (htmlOutput.getTitle && htmlOutput.getTitle().toLowerCase().includes('sign in') && roleKey !== 'UNKNOWN'){
         console.error("ERROR: doGet for " + roleKey + " resulted in a sign-in page: " + htmlOutput.getTitle());
      }

    } catch (e) {
      doGetResults[roleKey] = { success: false, page: page, error: e.toString(), message: e.message };
      console.error('ERROR during doGet simulation for ' + roleKey + ' to ' + page + ':', e.toString());
    }
  }
  restoreOriginalSession();
  return doGetResults;
}

// Master test function
function runAuthTestSuite() {
  console.log('====== Starting Authentication Test Suite ======');
  // IMPORTANT: Replace TEST_EMAILS with actual emails relevant to your test data.
  // E.g., for ADMIN, use an email that IS in your admin list.
  // For RIDER, use an email of a rider that IS in your Riders sheet and is 'Active'.
  console.warn("IMPORTANT: Ensure TEST_EMAILS in TestAuth.gs are updated with emails that reflect your actual test data for accurate results.");

  const authRoleResults = testUserAuthenticationAndRoles();
  const pageAccessResults = testPageAccess();
  const doGetSimResults = simulateDoGetRequests();

  console.log('\n====== Test Suite Summary ======');
  console.log('\n--- Authentication & Role Results ---');
  console.log(JSON.stringify(authRoleResults, null, 2));
  console.log('\n--- Page Access Results ---');
  console.log(JSON.stringify(pageAccessResults, null, 2));
  console.log('\n--- doGet Simulation Results ---');
  console.log(JSON.stringify(doGetSimResults, null, 2));

  // Basic assertion checks (logged to console)
  // Example: Check if admin auth was successful
  if (authRoleResults.ADMIN && authRoleResults.ADMIN.success && authRoleResults.ADMIN.user.role === 'admin') {
    console.log('✅ Admin authentication and role assignment: PASSED');
  } else {
    console.error('❌ Admin authentication and role assignment: FAILED', authRoleResults.ADMIN);
  }

  // Example: Check if rider can access rider-schedule
  if (pageAccessResults.RIDER && pageAccessResults.RIDER['rider-schedule']) {
     console.log('✅ Rider access to rider-schedule: PASSED');
  } else {
     console.error('❌ Rider access to rider-schedule: FAILED', pageAccessResults.RIDER);
  }

  // Example: Check if unknown user is denied access to a protected page like 'requests'
  if (pageAccessResults.UNKNOWN && pageAccessResults.UNKNOWN['requests'] === false) {
     console.log('✅ Unknown user denied access to requests page: PASSED');
  } else {
     console.error('❌ Unknown user denied access to requests page: FAILED', pageAccessResults.UNKNOWN);
  }

  console.log('====== Test Suite Finished ======');
  return {authRoleResults, pageAccessResults, doGetSimResults};
}
// This file will contain debug and test functions, and troubleshooting guides.

// ===== TROUBLESHOOTING STEPS =====

/*
STEP 1: Check Web App Deployment
1. Go to Deploy → Manage Deployments
2. Make sure "Execute as" is set to "Me"
3. Make sure "Who has access" is set to "Anyone" (or your specific group if using restricted access)
4. Copy the Web app URL and verify it matches the one intended for use.

STEP 2: Test Server Functions
1. Run testServerConnection() from the Apps Script editor.
2. Check the Execution Log (View > Executions) for errors from any server-side function.
3. Look at console.log outputs in the editor or Cloud Logs.

STEP 3: Check Sheet Structure & Configuration
1. Make sure your sheets exist with the names specified in CONFIG.sheets (see Config.gs).
2. Verify column headers in your sheets match those defined in CONFIG.columns.
3. Run Utils.ensureSheetsExist() (from Utils.gs) if you suspect sheets or headers are missing.
4. Double-check all settings in the CONFIG object in Config.gs (timezone, date formats, etc.).

STEP 4: Test Web App (Client-Side)
1. Open your web app URL in a browser (preferably in an incognito window to avoid caching issues).
2. Open the browser's Developer Tools (usually by pressing F12).
3. Check the Console tab for JavaScript errors.
4. Check the Network tab to see if server calls (google.script.run...) are being made correctly and what responses they get. Look for HTTP status codes (200 is OK, 4xx/5xx indicate errors).

STEP 5: Add Debug Logging (Client-Side Example)
You can add this script block to your main HTML files (e.g., index.html, admin-dashboard.html)
inside the <script> tag for more detailed client-side logging:

const CLIENT_SIDE_DEBUG_SCRIPT = `
// Enhanced debug logging
window.addEventListener('error', function(e) {
    console.error('Client-Side JavaScript Error:', e.error, 'Message:', e.message, 'Line:', e.lineno, 'Col:', e.colno);
});

// Test server connection immediately when the page loads
if (typeof google !== 'undefined' && google.script && google.script.run) {
    console.log('🧪 Testing server connection from client...');
    google.script.run
        .withSuccessHandler(result => {
            console.log('✅ Server test successful (from client):', result);
        })
        .withFailureHandler(error => {
            console.error('❌ Server test failed (from client):', error);
        })
        .testServerConnection(); // This function is in DebugUtils.gs
} else {
    console.error('❌ Google Apps Script environment (google.script.run) not available on client.');
}

// You can also add page-specific load functions here, e.g.:
// document.addEventListener('DOMContentLoaded', function() {
//   if (typeof loadDashboardData === 'function') { // Assuming loadDashboardData is your page-specific function
//     loadDashboardData();
//   }
// });
`;
// To use it: <script>\${CLIENT_SIDE_DEBUG_SCRIPT}</script> (if using templates) or directly in HTML.

*/

// ===== GENERAL DEBUGGING FUNCTIONS =====

/**
 * Simple test function to verify server connectivity and basic service availability.
 * Calls functions from various services to check their basic operation.
 */
function testServerConnection() {
  let results = {
    timestamp: new Date().toISOString(),
    checks: {},
    overallStatus: 'PENDING',
    summary: []
  };
  try {
    console.log('🧪 DebugUtils.gs: testServerConnection - Starting...');

    // Check Utils.ensureSheetsExist()
    try {
      Utils.ensureSheetsExist(); // Assumes CONFIG is loaded
      results.checks.ensureSheetsExist = { status: 'OK', message: 'Completed' };
      results.summary.push('Utils.ensureSheetsExist: OK');
    } catch (e) {
      results.checks.ensureSheetsExist = { status: 'ERROR', message: e.message };
      results.summary.push('Utils.ensureSheetsExist: ERROR - ' + e.message);
    }

    // Check AuthService.getCurrentUser()
    try {
      const user = AuthService.getCurrentUser();
      results.checks.getCurrentUser = { status: 'OK', userEmail: user.email };
      results.summary.push('AuthService.getCurrentUser: OK (' + user.email + ')');
    } catch (e) {
      results.checks.getCurrentUser = { status: 'ERROR', message: e.message };
      results.summary.push('AuthService.getCurrentUser: ERROR - ' + e.message);
    }

    // Check if some data can be fetched (e.g., from SheetServices or a specific service)
    try {
      const requestsData = SheetServices.getRequestsData ? SheetServices.getRequestsData(false) : Utils.getSheetData(CONFIG.sheets.requests, false);
      results.checks.getRequestsData = { status: 'OK', count: requestsData.data ? requestsData.data.length : -1 };
      results.summary.push('SheetServices/Utils.getRequestsData: OK, Count: ' + (requestsData.data ? requestsData.data.length : 'N/A'));
    } catch (e) {
      results.checks.getRequestsData = { status: 'ERROR', message: e.message };
      results.summary.push('SheetServices/Utils.getRequestsData: ERROR - ' + e.message);
    }

    // Check DashboardService.getDashboardStats() if it exists
     try {
        const stats = typeof DashboardService !== 'undefined' && DashboardService.getDashboardStats ? DashboardService.getDashboardStats() : "Skipped (DashboardService.getDashboardStats not found)";
        results.checks.getDashboardStats = { status: stats.note ? 'SKIPPED' : 'OK', stats: stats };
        results.summary.push('DashboardService.getDashboardStats: ' + (stats.note ? 'SKIPPED' : 'OK'));
    } catch (e) {
        results.checks.getDashboardStats = { status: 'ERROR', message: e.message};
        results.summary.push('DashboardService.getDashboardStats: ERROR - ' + e.message);
    }

    results.overallStatus = results.summary.every(s => s.includes('OK') || s.includes('SKIPPED')) ? 'COMPLETED_OK' : 'COMPLETED_WITH_ERRORS';
    console.log('🧪 DebugUtils.gs: testServerConnection - Results:', JSON.stringify(results.checks));
    console.log('🧪 DebugUtils.gs: testServerConnection - Summary:', results.summary.join('; '));

  } catch (error) {
    console.error('❌ DebugUtils.gs: testServerConnection - Critical error:', error.message, error.stack);
    Utils.logError('Critical error in testServerConnection', error); // Assumes Utils.logError exists
    results.overallStatus = 'FAILED_CRITICAL';
    results.error = error.message;
    results.summary.push('Overall Test: FAILED_CRITICAL - ' + error.message);
  }
  return results;
}

/**
 * Test function to check the output of the new NavigationService.getRoleBasedNavigationSafe.
 */
function testNewNavigationService_Safe() {
  console.log('🧪 DebugUtils.gs: Testing NavigationService.getRoleBasedNavigationSafe...');
  const results = {};
  // Ensure TEST_EMAILS is defined or provide mock user data directly
  const testUsers = (typeof TEST_EMAILS !== 'undefined' ? Object.values(TEST_EMAILS) : []).map(email => ({
      email: email,
      // Simulate role based on email pattern or use a mock lookup
      role: email.includes('admin') ? 'admin' : (email.includes('dispatch') ? 'dispatcher' : (email.includes('rider') ? 'rider' : 'guest')),
      name: email.split('@')[0]
  }));
   if(testUsers.length === 0) { // Fallback if TEST_EMAILS is not available
     testUsers.push({ email: 'admin@example.com', name: 'Admin User', role: 'admin' });
     testUsers.push({ email: 'disp@example.com', name: 'Dispatcher User', role: 'dispatcher' });
     testUsers.push({ email: 'rider@example.com', name: 'Rider User', role: 'rider' });
   }


  const pagesToTest = ['dashboard', 'requests', 'my-assignments'];

  testUsers.forEach(testUser => {
    results[testUser.role] = {};
    pagesToTest.forEach(page => {
      try {
        console.log(`Simulating for role: ${testUser.role}, page: ${page}`);
        // Construct a simplified user object for testing
        const mockUserObject = { email: testUser.email, name: testUser.name, role: testUser.role, permissions: [] };
        const mockRiderObject = testUser.role === 'rider' ? { id: 'R000', name: testUser.name } : null;

        const navHtml = NavigationService.getRoleBasedNavigationSafe(page, mockUserObject, mockRiderObject);
        results[testUser.role][page] = {
          success: true,
          htmlLength: navHtml.length,
          containsNavClass: navHtml.includes('class="navigation"'),
          containsPageLink: navHtml.includes(`data-page="${page}"`),
          sampleHtml: navHtml.substring(0, 200) + "..."
        };
        console.log(`✅ Navigation for ${testUser.role} on ${page}: Length ${navHtml.length}`);
      } catch (e) {
        results[testUser.role][page] = { success: false, error: e.message };
        console.error(`❌ Error testing navigation for ${testUser.role} on ${page}:`, e.message);
      }
    });
  });
  return results;
}

/**
 * Test function to check content injection by NavigationService.addNavigationToContentSafe.
 */
function testNavigationInjection_Safe() {
  console.log('🧪 DebugUtils.gs: Testing NavigationService.addNavigationToContentSafe...');
  const mockUser = { email: 'test@example.com', name: 'Test User', role: 'admin', permissions:[] };
  const navHtml = NavigationService.getRoleBasedNavigationSafe('dashboard', mockUser, null);

  const testCases = [
    { name: 'With New Placeholder', content: '<html><head></head><body><header></header><!--NAVIGATION_MENU_PLACEHOLDER_NEW--><div>Page Content</div></body></html>' },
    { name: 'With Old Placeholder', content: '<html><head></head><body><header></header><!--NAVIGATION_MENU_PLACEHOLDER--><div>Page Content</div></body></html>' },
    { name: 'With Header', content: '<html><head></head><body><header>Header Content</header><div>Page Content</div></body></html>' },
    { name: 'With Body Only', content: '<html><head></head><body><div>Page Content</div></body></html>' },
    { name: 'Minimal HTML', content: '<div>Page Content</div>' },
    { name: 'Already Contains Nav', content: '<html><body><nav class="navigation">Old Nav</nav><div>Content</div></body></html>'}
  ];

  const results = {};
  testCases.forEach(tc => {
    const modifiedContent = NavigationService.addNavigationToContentSafe(tc.content, navHtml);
    const navCount = (modifiedContent.match(/<nav class="navigation"/g) || []).length;
    results[tc.name] = {
      originalLength: tc.content.length,
      newLength: modifiedContent.length,
      navInjectedCorrectly: navCount === 1, // Should only be one nav bar
      navPresent: modifiedContent.includes(navHtml)
    };
    console.log(`✅ Test Case: ${tc.name} - Nav Injected Correctly: ${results[tc.name].navInjectedCorrectly} (Count: ${navCount})`);
  });
  return results;
}

/**
 * Lists all functions in the project (requires manual copy-pasting of file contents or advanced API usage).
 * This is a conceptual debug tool as Apps Script doesn't easily allow iterating all functions across all files.
 */
function listAllProjectFunctions() {
    console.warn("listAllProjectFunctions: This function requires manual setup or advanced API usage to list functions across all project files. It will currently only list functions in its own file if not adapted.");
    // To make this work better, you would need to:
    // 1. Use `google.script.run` from client-side to call a server-side function that reads all .gs files.
    // 2. Concatenate all file contents.
    // 3. Run the regex on the combined content.
    // For now, this is a placeholder for a more advanced debugging tool.
    return listFunctionsInFile("DebugUtils.gs"); // Example for current file
}

/**
 * A utility function to list all functions in a given GS file content.
 * @param {string} fileContent - The string content of the .gs file.
 * @param {string} [fileName='Unknown File'] - Optional: The name of the file for logging.
 * @return {Array<string>} Array of function names found.
 */
function listFunctionsInFileContent(fileContent, fileName = 'Unknown File') {
    const functionRegex = /function\s+([A-Za-z0-9_]+)\s*\(/g;
    const functions = [];
    let match;
    while ((match = functionRegex.exec(fileContent)) !== null) {
        functions.push(match[1]);
    }
    console.log(`Functions found in ${fileName}:`, functions);
    return functions;
}
>>>>>>> REPLACE

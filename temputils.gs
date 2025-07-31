/**
 * STEP 1: Diagnose what's causing the blank page
 */
function diagnoseBlankPageIssue() {
  debugLog('🔍 DIAGNOSING BLANK PAGE ISSUE...');
  
  try {
    // Test 1: Check if HTML files exist
    debugLog('1. Testing HTML file access...');
    const htmlFiles = ['index', 'admin-dashboard', 'requests', 'assignments', 'riders', 'notifications'];
    const fileResults = {};
    
    htmlFiles.forEach(fileName => {
      try {
        const test = HtmlService.createHtmlOutputFromFile(fileName);
        fileResults[fileName] = 'EXISTS';
        debugLog(`   ✅ ${fileName}.html - exists`);
      } catch (e) {
        fileResults[fileName] = 'MISSING';
        debugLog(`   ❌ ${fileName}.html - missing:`, e.message);
      }
    });
    
    // Test 2: Check authentication session
    debugLog('2. Testing authentication session...');
    const session = getAuthenticatedSession();
    debugLog('   Session valid:', session.isValid);
    if (session.isValid) {
      debugLog('   User email:', session.user?.email);
      debugLog('   User role:', session.user?.role);
    }
    
    // Test 3: Check page loading functions
    debugLog('3. Testing page loading functions...');
    const functionTests = {};
    
    const requiredFunctions = [
      'loadAppPage',
      'getPageDataForDashboard', 
      'getPageFileNameSafe',
      'getUserNavigationMenu',
      'injectNavigation',
      'injectUserInfo'
    ];
    
    requiredFunctions.forEach(funcName => {
      try {
        const func = eval(funcName);
        functionTests[funcName] = typeof func === 'function' ? 'EXISTS' : 'NOT_FUNCTION';
        debugLog(`   ${functionTests[funcName] === 'EXISTS' ? '✅' : '❌'} ${funcName}`);
      } catch (e) {
        functionTests[funcName] = 'MISSING';
        debugLog(`   ❌ ${funcName} - missing`);
      }
    });
    
    // Test 4: Try to load dashboard data
    debugLog('4. Testing dashboard data loading...');
    let dashboardDataTest = 'NOT_TESTED';
    try {
      const dashboardData = getPageDataForDashboard();
      dashboardDataTest = dashboardData ? 'SUCCESS' : 'NO_DATA';
      debugLog('   Dashboard data test:', dashboardDataTest);
    } catch (e) {
      dashboardDataTest = 'ERROR: ' + e.message;
      debugLog('   Dashboard data error:', e.message);
    }
    
    // Summary
    const missingFiles = Object.keys(fileResults).filter(k => fileResults[k] === 'MISSING');
    const missingFunctions = Object.keys(functionTests).filter(k => functionTests[k] !== 'EXISTS');
    
    debugLog('\n📋 DIAGNOSIS SUMMARY:');
    debugLog('Missing HTML files:', missingFiles.length > 0 ? missingFiles : 'None');
    debugLog('Missing functions:', missingFunctions.length > 0 ? missingFunctions : 'None');
    debugLog('Authentication:', session.isValid ? 'Working' : 'Broken');
    debugLog('Dashboard data:', dashboardDataTest);
    
    return {
      success: true,
      htmlFiles: fileResults,
      functions: functionTests,
      session: session,
      dashboardData: dashboardDataTest,
      missingFiles: missingFiles,
      missingFunctions: missingFunctions
    };
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 🔍 HTML FILE LOADING DIAGNOSTIC
 * Run these functions to identify why admin-dashboard.html isn't loading
 */

/**
 * STEP 1: Check if HTML files exist and can be loaded
 */
function diagnoseHtmlFileLoading() {
  debugLog('🔍 DIAGNOSING HTML FILE LOADING...');
  
  const results = {};
  const filesToTest = [
    'admin-dashboard',
    'index', 
    'requests',
    'assignments',
    'riders',
    'notifications',
    'reports',
    'user-management'
  ];
  
  filesToTest.forEach(fileName => {
    debugLog(`\n--- Testing ${fileName}.html ---`);
    
    try {
      // Test 1: Can we create HtmlOutput from file?
      const htmlOutput = HtmlService.createHtmlOutputFromFile(fileName);
      debugLog(`✅ File loads: ${fileName}.html`);
      
      // Test 2: Can we get content?
      const content = htmlOutput.getContent();
      debugLog(`✅ Content accessible: ${content.length} characters`);
      
      // Test 3: Does it have navigation placeholder?
      const hasPlaceholder = content.includes('<!--NAVIGATION_MENU_PLACEHOLDER-->');
      debugLog(`${hasPlaceholder ? '✅' : '⚠️'} Navigation placeholder: ${hasPlaceholder}`);
      
      // Test 4: What's the first 200 characters?
      debugLog(`📄 Content preview: ${content.substring(0, 200)}...`);
      
      results[fileName] = {
        success: true,
        contentLength: content.length,
        hasPlaceholder: hasPlaceholder,
        preview: content.substring(0, 100)
      };
      
    } catch (error) {
      debugLog(`❌ Error loading ${fileName}.html: ${error.message}`);
      results[fileName] = {
        success: false,
        error: error.message
      };
    }
  });
  
  // Summary
  debugLog('\n📋 SUMMARY:');
  const working = Object.keys(results).filter(f => results[f].success);
  const broken = Object.keys(results).filter(f => !results[f].success);
  
  debugLog(`✅ Working files (${working.length}): ${working.join(', ')}`);
  debugLog(`❌ Broken files (${broken.length}): ${broken.join(', ')}`);
  
  // Specific admin-dashboard check
  if (results['admin-dashboard']) {
    debugLog('\n🛡️ ADMIN DASHBOARD SPECIFIC:');
    const adminResult = results['admin-dashboard'];
    if (adminResult.success) {
      debugLog('✅ admin-dashboard.html loads successfully');
      debugLog(`✅ Content length: ${adminResult.contentLength} chars`);
      debugLog(`✅ Has placeholder: ${adminResult.hasPlaceholder}`);
    } else {
      debugLog('❌ admin-dashboard.html failed to load');
      debugLog(`❌ Error: ${adminResult.error}`);
    }
  }
  
  return results;
}

/**
 * STEP 2: Test the exact file loading path your doGet uses
 */
function testAdminDashboardLoading() {
  debugLog('🧪 TESTING ADMIN DASHBOARD LOADING PATH...');
  
  try {
    // Simulate exactly what your doGet does for admin user
    const mockUser = {
      name: 'Jpsotraffic',
      email: 'jpsotraffic@gmail.com',
      role: 'admin',
      permissions: ['view_all', 'edit_all'],
      avatar: 'J'
    };
    
    const pageName = 'dashboard';
    
    debugLog(`👤 User: ${mockUser.name} (${mockUser.role})`);
    debugLog(`📄 Page: ${pageName}`);
    
    // Step 1: Determine file name (same logic as your loadAppPage)
    let fileName;
    if (pageName.toLowerCase() === 'dashboard' && mockUser.role === 'admin') {
      fileName = 'admin-dashboard';
    }
    
    debugLog(`📂 File to load: ${fileName}.html`);
    
    // Step 2: Try to load the file
    debugLog('🔄 Attempting to load file...');
    const htmlOutput = HtmlService.createHtmlOutputFromFile(fileName);
    debugLog('✅ File loaded successfully!');
    
    // Step 3: Get content
    const content = htmlOutput.getContent();
    debugLog(`✅ Content retrieved: ${content.length} characters`);
    
    // Step 4: Check for navigation placeholder
    const hasPlaceholder = content.includes('<!--NAVIGATION_MENU_PLACEHOLDER-->');
    debugLog(`✅ Navigation placeholder: ${hasPlaceholder ? 'FOUND' : 'MISSING'}`);
    
    // Step 5: Try navigation injection (if we have the function)
    if (typeof injectNavigation === 'function') {
      debugLog('🔗 Testing navigation injection...');
      const injectedContent = injectNavigation(content, mockUser, null, pageName);
      const hasNavAfterInjection = injectedContent.includes('<nav class="navigation">');
      debugLog(`✅ Navigation injection: ${hasNavAfterInjection ? 'SUCCESS' : 'FAILED'}`);
      
      if (hasNavAfterInjection) {
        debugLog('🎉 FULL SUCCESS! admin-dashboard.html can load with navigation!');
        return {
          success: true,
          message: 'admin-dashboard.html loads and processes correctly',
          fileLoads: true,
          hasContent: true,
          hasPlaceholder: hasPlaceholder,
          navigationInjection: hasNavAfterInjection
        };
      }
    } else {
      debugLog('⚠️ injectNavigation function not available for testing');
    }
    
    // If we get here, file loads but navigation might have issues
    return {
      success: true,
      message: 'admin-dashboard.html loads but navigation injection needs checking',
      fileLoads: true,
      hasContent: true,
      hasPlaceholder: hasPlaceholder,
      navigationInjection: false
    };
    
  } catch (error) {
    console.error('❌ Admin dashboard loading test failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'admin-dashboard.html failed to load'
    };
  }
}

/**
 * STEP 3: Test your actual doGet function with admin user
 */
function testDoGetWithAdminUser() {
  debugLog('🧪 TESTING doGet WITH ADMIN USER...');
  
  try {
    // Create mock event for dashboard page
    const mockEvent = {
      parameter: {
        // No page parameter = dashboard
      }
    };
    
    debugLog('📞 Calling doGet function...');
    const result = doGet(mockEvent);
    
    if (!result) {
      debugLog('❌ doGet returned null/undefined');
      return { success: false, error: 'doGet returned null' };
    }
    
    if (typeof result.getContent !== 'function') {
      debugLog('❌ doGet result is not HtmlOutput');
      return { success: false, error: 'Invalid return type from doGet' };
    }
    
    debugLog('✅ doGet returned HtmlOutput');
    
    // Get the content
    const content = result.getContent();
    debugLog(`✅ Content retrieved: ${content.length} characters`);
    
    // Check what we got
    const isLoginPage = content.includes('login') || content.includes('Login');
    const isFallbackPage = content.includes('fallback') || content.includes('Using fallback page');
    const isAdminDashboard = content.includes('Administrator Dashboard') || content.includes('admin-dashboard');
    const hasNavigation = content.includes('<nav class="navigation">');
    
    debugLog(`📊 Content Analysis:`);
    debugLog(`   Login page: ${isLoginPage ? '✅' : '❌'}`);
    debugLog(`   Fallback page: ${isFallbackPage ? '✅' : '❌'}`);
    debugLog(`   Admin dashboard: ${isAdminDashboard ? '✅' : '❌'}`);
    debugLog(`   Has navigation: ${hasNavigation ? '✅' : '❌'}`);
    
    // Show first part of content for debugging
    debugLog(`📄 Content preview (first 300 chars):`);
    debugLog(content.substring(0, 300));
    
    return {
      success: true,
      isLoginPage: isLoginPage,
      isFallbackPage: isFallbackPage,
      isAdminDashboard: isAdminDashboard,
      hasNavigation: hasNavigation,
      contentLength: content.length,
      preview: content.substring(0, 200)
    };
    
  } catch (error) {
    console.error('❌ doGet test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * STEP 4: Force load admin-dashboard.html and show it working
 */
function forceLoadAdminDashboard() {
  debugLog('🚀 FORCE LOADING ADMIN DASHBOARD...');
  
  try {
    // Force load the file
    debugLog('📂 Force loading admin-dashboard.html...');
    const htmlOutput = HtmlService.createHtmlOutputFromFile('admin-dashboard');
    const content = htmlOutput.getContent();
    
    debugLog(`✅ File loaded: ${content.length} characters`);
    
    // Create mock user
    const mockUser = {
      name: 'Jpsotraffic',
      email: 'jpsotraffic@gmail.com',
      role: 'admin',
      permissions: ['view_all', 'edit_all'],
      avatar: 'J'
    };
    
    // Try to inject navigation if function exists
    let finalContent = content;
    if (typeof injectNavigation === 'function') {
      debugLog('🔗 Injecting navigation...');
      finalContent = injectNavigation(content, mockUser, null, 'dashboard');
      debugLog(`✅ Navigation injected, final length: ${finalContent.length}`);
    } else {
      debugLog('⚠️ injectNavigation function not available');
      
      // Manual navigation injection as fallback
      if (content.includes('<!--NAVIGATION_MENU_PLACEHOLDER-->')) {
        const simpleNav = `
<nav class="navigation">
    <a href="?" class="nav-button active">📊 Dashboard</a>
    <a href="?page=requests" class="nav-button">📋 Requests</a>
    <a href="?page=assignments" class="nav-button">🏍️ Assignments</a>
    <a href="?page=riders" class="nav-button">👥 Riders</a>
    <a href="?page=notifications" class="nav-button">📱 Notifications</a>
    <a href="?page=reports" class="nav-button">📈 Reports</a>
    <a href="?action=logout" class="nav-button logout">🚪 Logout</a>
</nav>`;
        
        finalContent = content.replace('<!--NAVIGATION_MENU_PLACEHOLDER-->', simpleNav);
        debugLog('✅ Manual navigation injection completed');
      }
    }
    
    // Update the HTML output
    htmlOutput.setContent(finalContent);
    
    debugLog('🎉 SUCCESS! Admin dashboard loaded and enhanced!');
    debugLog(`   Original content: ${content.length} chars`);
    debugLog(`   Final content: ${finalContent.length} chars`);
    debugLog(`   Has navigation: ${finalContent.includes('<nav class="navigation">')}`);
    
    return {
      success: true,
      htmlOutput: htmlOutput,
      originalLength: content.length,
      finalLength: finalContent.length,
      hasNavigation: finalContent.includes('<nav class="navigation">')
    };
    
  } catch (error) {
    console.error('❌ Force load failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * STEP 5: Complete diagnostic with recommendations
 */
function completeHtmlDiagnostic() {
  debugLog('🔍 === COMPLETE HTML DIAGNOSTIC ===');
  
  const results = {};
  
  // Test 1: Basic file loading
  debugLog('\n1. Testing basic file loading...');
  results.fileLoading = diagnoseHtmlFileLoading();
  
  // Test 2: Admin dashboard specific
  debugLog('\n2. Testing admin dashboard loading...');
  results.adminDashboard = testAdminDashboardLoading();
  
  // Test 3: doGet function
  debugLog('\n3. Testing doGet function...');
  results.doGetTest = testDoGetWithAdminUser();
  
  // Test 4: Force load
  debugLog('\n4. Testing force load...');
  results.forceLoad = forceLoadAdminDashboard();
  
  // Analysis and recommendations
  debugLog('\n📋 === DIAGNOSTIC SUMMARY ===');
  
  const adminDashboardWorks = results.fileLoading?.['admin-dashboard']?.success;
  const doGetShowsFallback = results.doGetTest?.isFallbackPage;
  
  debugLog(`Admin dashboard file loads: ${adminDashboardWorks ? '✅ YES' : '❌ NO'}`);
  debugLog(`doGet returns fallback: ${doGetShowsFallback ? '⚠️ YES' : '✅ NO'}`);
  
  if (adminDashboardWorks && doGetShowsFallback) {
    debugLog('\n🔧 DIAGNOSIS: File exists but doGet is not loading it properly');
    debugLog('SOLUTION: Check your loadAppPage or fixedLoadAppPageWithNavigation function');
    debugLog('The file loads fine when called directly, so the issue is in the page loading logic');
  } else if (!adminDashboardWorks) {
    debugLog('\n🔧 DIAGNOSIS: admin-dashboard.html file has problems');
    debugLog('SOLUTION: Check if the file exists and has correct content');
  } else {
    debugLog('\n✅ DIAGNOSIS: Everything should be working');
    debugLog('If you still see fallback, try clearing cache and redeploying');
  }
  
  return results;
}

/**
 * QUICK FIX: Replace loadAppPage to force admin-dashboard loading
 */
function createFixedLoadAppPageFunction() {
  return `
function fixedLoadAppPage(pageName, user, rider) {
  try {
    debugLog(\`📄 FIXED: Loading page: \${pageName} for user: \${user.email} (\${user.role})\`);
    
    // Determine file name
    let fileName = 'index';
    
    if (pageName.toLowerCase() === 'dashboard') {
      if (user.role === 'admin') {
        fileName = 'admin-dashboard';
        debugLog('🛡️ Loading admin dashboard for admin user');
      } else {
        fileName = 'index';
      }
    } else {
      fileName = pageName.toLowerCase();
    }
    
    debugLog(\`📂 Loading file: \${fileName}.html\`);
    
    // Force load the HTML file
    const htmlOutput = HtmlService.createHtmlOutputFromFile(fileName);
    let content = htmlOutput.getContent();
    
    debugLog(\`✅ File loaded: \${content.length} characters\`);
    
    // Inject navigation if placeholder exists
    if (content.includes('<!--NAVIGATION_MENU_PLACEHOLDER-->')) {
      debugLog('🔗 Injecting navigation...');
      
      const simpleNav = \`
<nav class="navigation">
    <a href="?" class="nav-button \${pageName === 'dashboard' ? 'active' : ''}">📊 Dashboard</a>
    <a href="?page=requests" class="nav-button \${pageName === 'requests' ? 'active' : ''}">📋 Requests</a>
    <a href="?page=assignments" class="nav-button \${pageName === 'assignments' ? 'active' : ''}">🏍️ Assignments</a>
    \${user.role === 'admin' ? \`
    <a href="?page=riders" class="nav-button \${pageName === 'riders' ? 'active' : ''}">👥 Riders</a>
    <a href="?page=notifications" class="nav-button \${pageName === 'notifications' ? 'active' : ''}">📱 Notifications</a>
    <a href="?page=reports" class="nav-button \${pageName === 'reports' ? 'active' : ''}">📈 Reports</a>
    \` : ''}
    <a href="?action=logout" class="nav-button logout">🚪 Logout</a>
</nav>
<style>
.navigation { background: white; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
.nav-button { text-decoration: none; padding: 10px 15px; margin: 0 5px; background: #f8f9fa; border-radius: 4px; color: #333; }
.nav-button.active { background: #4285f4; color: white; }
.nav-button:hover { background: #e9ecef; }
.nav-button.logout { background: #dc3545; color: white; float: right; }
</style>\`;
      
      content = content.replace('<!--NAVIGATION_MENU_PLACEHOLDER-->', simpleNav);
      debugLog('✅ Navigation injected successfully');
    }
    
    // Add user context
    const userScript = \`
<script>
window.currentUser = {
    email: '\${user.email}',
    name: '\${user.name}',
    role: '\${user.role}',
    permissions: \${JSON.stringify(user.permissions || [])},
    timestamp: \${Date.now()}
};
debugLog('👤 User context loaded:', window.currentUser);
</script>\`;
    
    content = content.replace('</body>', userScript + '</body>');
    
    htmlOutput.setContent(content);
    
    debugLog(\`🎉 Page loaded successfully: \${fileName}.html\`);
    
    return htmlOutput.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
  } catch (error) {
    console.error('❌ Fixed load app page error:', error);
    return createWorkingFallbackPage(pageName, user, rider);
  }
}`;
}

/**
 * 🔧 SCRIPT INJECTION FIX
 * This fixes the JavaScript showing as text issue
 */

/**
 * DIAGNOSTIC: Check what's actually being generated
 */
function diagnoseScriptInjection() {
  debugLog('🔍 DIAGNOSING SCRIPT INJECTION ISSUE...');
  
  try {
    // Test user
    const testUser = {
      name: 'Jpsotraffic',
      email: 'jpsotraffic@gmail.com',
      role: 'admin',
      permissions: ['view_all'],
      avatar: 'J'
    };
    
    // Load admin dashboard
    debugLog('📂 Loading admin-dashboard.html...');
    const htmlOutput = HtmlService.createHtmlOutputFromFile('admin-dashboard');
    let content = htmlOutput.getContent();
    
    debugLog(`✅ Original content loaded: ${content.length} characters`);
    
    // Check for script tags in original
    const originalScriptCount = (content.match(/<script/g) || []).length;
    const originalScriptCloseCount = (content.match(/<\/script>/g) || []).length;
    debugLog(`📊 Original script tags: ${originalScriptCount} open, ${originalScriptCloseCount} close`);
    
    // Show end of original content
    debugLog('📄 Last 500 chars of original:');
    debugLog(content.slice(-500));
    
    // Test user script creation
    debugLog('👤 Testing user script creation...');
    const userScript = createUserContextScript(testUser, null);
    debugLog(`✅ User script created: ${userScript.length} characters`);
    debugLog('📄 User script preview:');
    debugLog(userScript.substring(0, 200) + '...');
    
    // Test injection
    debugLog('💉 Testing script injection...');
    let injectedContent = content;
    
    if (content.includes('</body>')) {
      injectedContent = content.replace('</body>', '\n' + userScript + '\n</body>');
      debugLog('✅ Injected before </body>');
    } else {
      injectedContent += '\n' + userScript;
      debugLog('✅ Appended to end');
    }
    
    // Check final script counts
    const finalScriptCount = (injectedContent.match(/<script/g) || []).length;
    const finalScriptCloseCount = (injectedContent.match(/<\/script>/g) || []).length;
    debugLog(`📊 Final script tags: ${finalScriptCount} open, ${finalScriptCloseCount} close`);
    
    // Show injection point
    const bodyIndex = injectedContent.indexOf('</body>');
    if (bodyIndex !== -1) {
      const aroundInjection = injectedContent.substring(bodyIndex - 200, bodyIndex + 300);
      debugLog('📄 Content around injection point:');
      debugLog(aroundInjection);
    }
    
    // Show final end
    debugLog('📄 Last 500 chars of final content:');
    debugLog(injectedContent.slice(-500));
    
    return {
      success: true,
      originalLength: content.length,
      finalLength: injectedContent.length,
      originalScriptTags: originalScriptCount,
      finalScriptTags: finalScriptCount,
      scriptTagsBalanced: finalScriptCount === finalScriptCloseCount,
      userScriptLength: userScript.length
    };
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * FIXED: Simple and safe script injection
 */
function createSafeUserScript(user, rider) {
  try {
    debugLog('👤 Creating SAFE user script...');
    
    // Create minimal, safe user context
    const safeUserScript = `
<script type="text/javascript">
(function() {
    // Safe user context
    window.currentUser = {
        email: ${JSON.stringify(user.email || '')},
        name: ${JSON.stringify(user.name || '')},
        role: ${JSON.stringify(user.role || '')},
        isAdmin: ${user.role === 'admin'},
        timestamp: ${Date.now()}
    };
    
    // Safe logout function
    window.logout = function() {
        if (confirm('Are you sure you want to logout?')) {
            window.location.href = '?action=logout';
        }
    };
    
    // Initialize when page loads
    document.addEventListener('DOMContentLoaded', function() {
        debugLog('👤 User context loaded:', window.currentUser);
    });
})();
</script>`;

    debugLog('✅ Safe user script created');
    return safeUserScript;
    
  } catch (error) {
    console.error('❌ Error creating safe user script:', error);
    
    // Ultra-minimal fallback
    return `
<script>
window.currentUser = { role: 'admin' };
window.logout = function() { window.location.href = '?action=logout'; };
</script>`;
  }
}

/**
 * FIXED: Ultra-simple load function without complex injection
 */
function ultraSimpleLoadAppPage(pageName, user, rider) {
  try {
    debugLog(`📄 ULTRA-SIMPLE: Loading ${pageName} for ${user.email}`);
    
    // Determine file
    let fileName = 'index';
    if (pageName.toLowerCase() === 'dashboard' && user.role === 'admin') {
      fileName = 'admin-dashboard';
    } else if (pageName.toLowerCase() !== 'dashboard') {
      fileName = pageName.toLowerCase();
    }
    
    debugLog(`📂 Loading: ${fileName}.html`);
    
    // Load file
    const htmlOutput = HtmlService.createHtmlOutputFromFile(fileName);
    let content = htmlOutput.getContent();
    
    debugLog(`✅ Loaded: ${content.length} chars`);
    
    // MINIMAL navigation injection - only if placeholder exists
    if (content.includes('<!--NAVIGATION_MENU_PLACEHOLDER-->')) {
      const simpleNav = `
<nav style="background: white; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
    <a href="?" style="margin: 0 10px; padding: 10px 15px; background: #4285f4; color: white; text-decoration: none; border-radius: 4px;">📊 Dashboard</a>
    <a href="?page=requests" style="margin: 0 10px; padding: 10px 15px; background: #f8f9fa; color: #333; text-decoration: none; border-radius: 4px;">📋 Requests</a>
    <a href="?page=assignments" style="margin: 0 10px; padding: 10px 15px; background: #f8f9fa; color: #333; text-decoration: none; border-radius: 4px;">🏍️ Assignments</a>
    <a href="?page=riders" style="margin: 0 10px; padding: 10px 15px; background: #f8f9fa; color: #333; text-decoration: none; border-radius: 4px;">👥 Riders</a>
    <a href="?action=logout" style="margin: 0 10px; padding: 10px 15px; background: #dc3545; color: white; text-decoration: none; border-radius: 4px; float: right;">🚪 Logout</a>
</nav>`;
      
      content = content.replace('<!--NAVIGATION_MENU_PLACEHOLDER-->', simpleNav);
      debugLog('✅ Navigation injected');
    }
    
    // MINIMAL user script - NO complex injection
    const userScript = createSafeUserScript(user, rider);
    
    // SAFE injection - only before </body> if it exists
    if (content.includes('</body>')) {
      content = content.replace('</body>', userScript + '</body>');
      debugLog('✅ User script injected safely');
    }
    
    // Update and return
    htmlOutput.setContent(content);
    
    debugLog(`🎉 SUCCESS: ${fileName}.html loaded safely`);
    
    return htmlOutput.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
  } catch (error) {
    console.error('❌ Ultra-simple load failed:', error);
    
    // Return absolute minimal page
    const minimalHtml = `
<!DOCTYPE html>
<html>
<head><title>Dashboard</title></head>
<body>
    <h1>🏍️ Admin Dashboard</h1>
    <p>User: ${user.name} (${user.role})</p>
    <nav>
        <a href="?" style="margin: 10px; padding: 10px; background: blue; color: white;">Dashboard</a>
        <a href="?action=logout" style="margin: 10px; padding: 10px; background: red; color: white;">Logout</a>
    </nav>
    <p>Dashboard loading... (Minimal mode)</p>
    <script>
        window.currentUser = { role: 'admin' };
        debugLog('Minimal page loaded');
    </script>
</body>
</html>`;
    
    return HtmlService.createHtmlOutput(minimalHtml)
      .setTitle('Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

/**
 * ALTERNATIVE: Load admin dashboard with NO script injection
 */
function loadAdminDashboardWithoutScripts(pageName, user, rider) {
  try {
    debugLog('📄 Loading admin dashboard WITHOUT script injection...');
    
    // Load the file as-is
    const htmlOutput = HtmlService.createHtmlOutputFromFile('admin-dashboard');
    let content = htmlOutput.getContent();
    
    // ONLY inject navigation, NO user scripts
    if (content.includes('<!--NAVIGATION_MENU_PLACEHOLDER-->')) {
      const simpleNav = `
<nav class="navigation">
    <div class="nav-container">
        <a href="?" class="nav-button active">📊 Dashboard</a>
        <a href="?page=requests" class="nav-button">📋 Requests</a>
        <a href="?page=assignments" class="nav-button">🏍️ Assignments</a>
        <a href="?page=riders" class="nav-button">👥 Riders</a>
        <a href="?page=notifications" class="nav-button">📱 Notifications</a>
        <a href="?page=reports" class="nav-button">📈 Reports</a>
        <a href="?action=logout" class="nav-button logout">🚪 Logout</a>
    </div>
</nav>`;
      
      content = content.replace('<!--NAVIGATION_MENU_PLACEHOLDER-->', simpleNav);
    }
    
    // Update content
    htmlOutput.setContent(content);
    
    debugLog('✅ Admin dashboard loaded without script injection issues');
    
    return htmlOutput.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
  } catch (error) {
    console.error('❌ No-script load failed:', error);
    return ultraSimpleLoadAppPage(pageName, user, rider);
  }
}

/**
 * TEST: Compare different loading methods
 */
function testDifferentLoadingMethods() {
  debugLog('🧪 TESTING DIFFERENT LOADING METHODS...');
  
  const testUser = {
    name: 'Jpsotraffic',
    email: 'jpsotraffic@gmail.com',
    role: 'admin',
    permissions: ['view_all'],
    avatar: 'J'
  };
  
  const results = {};
  
  // Test 1: Ultra-simple
  try {
    debugLog('1. Testing ultra-simple loading...');
    const result1 = ultraSimpleLoadAppPage('dashboard', testUser, null);
    const content1 = result1.getContent();
    results.ultraSimple = {
      success: true,
      contentLength: content1.length,
      hasScript: content1.includes('<script'),
      hasNavigation: content1.includes('nav'),
      scriptAtEnd: content1.slice(-200).includes('script')
    };
    debugLog('✅ Ultra-simple loading worked');
  } catch (error) {
    results.ultraSimple = { success: false, error: error.message };
    debugLog('❌ Ultra-simple loading failed:', error.message);
  }
  
  // Test 2: No scripts
  try {
    debugLog('2. Testing no-script loading...');
    const result2 = loadAdminDashboardWithoutScripts('dashboard', testUser, null);
    const content2 = result2.getContent();
    results.noScript = {
      success: true,
      contentLength: content2.length,
      hasNavigation: content2.includes('nav'),
      originalScripts: content2.includes('loadAdminDashboardData')
    };
    debugLog('✅ No-script loading worked');
  } catch (error) {
    results.noScript = { success: false, error: error.message };
    debugLog('❌ No-script loading failed:', error.message);
  }
  
  // Test 3: Diagnostic
  try {
    debugLog('3. Running script injection diagnostic...');
    results.diagnostic = diagnoseScriptInjection();
    debugLog('✅ Diagnostic completed');
  } catch (error) {
    results.diagnostic = { success: false, error: error.message };
    debugLog('❌ Diagnostic failed:', error.message);
  }
  
  debugLog('📋 TEST RESULTS:', results);
  
  return results;
}

/**
 * QUICK FIX: Update your doGet to use ultra-simple loading
 */
function quickFixInstructions() {
  return `
QUICK FIX: In your doGet function, replace the loadAppPage call with:

// Replace this:
// return workingLoadAppPage(pageName, session.user, session.rider);

// With this:
return ultraSimpleLoadAppPage(pageName, session.user, session.rider);

// OR for admin dashboard specifically:
if (pageName === 'dashboard' && session.user.role === 'admin') {
    return loadAdminDashboardWithoutScripts(pageName, session.user, session.rider);
} else {
    return ultraSimpleLoadAppPage(pageName, session.user, session.rider);
}
`;
}

/**
 * 🔍 DASHBOARD STATS DIAGNOSTIC
 * Run this to find why your stats are showing 0
 */

/**
 * DIAGNOSTIC: Check all data sources and count functions
 */
function diagnoseDashboardStats() {
  debugLog('🔍 === DASHBOARD STATS DIAGNOSTIC ===');
  
  const results = {};
  
  try {
    // Test 1: Check getRequestsData function
    debugLog('\n1. Testing getRequestsData...');
    try {
      const requestsData = getRequestsData();
      results.requestsData = {
        success: true,
        exists: !!requestsData,
        hasData: !!(requestsData && requestsData.data),
        rowCount: requestsData && requestsData.data ? requestsData.data.length : 0,
        hasColumnMap: !!(requestsData && requestsData.columnMap),
        columnMapKeys: requestsData && requestsData.columnMap ? Object.keys(requestsData.columnMap) : [],
        sampleRow: requestsData && requestsData.data && requestsData.data.length > 0 ? requestsData.data[0] : null
      };
      debugLog(`✅ Requests data: ${results.requestsData.rowCount} rows`);
    } catch (error) {
      results.requestsData = { success: false, error: error.message };
      debugLog('❌ getRequestsData failed:', error.message);
    }
    
    // Test 2: Check getAssignmentsData function
    debugLog('\n2. Testing getAssignmentsData...');
    try {
      const assignmentsData = getAssignmentsData();
      results.assignmentsData = {
        success: true,
        exists: !!assignmentsData,
        hasData: !!(assignmentsData && assignmentsData.data),
        rowCount: assignmentsData && assignmentsData.data ? assignmentsData.data.length : 0,
        hasColumnMap: !!(assignmentsData && assignmentsData.columnMap),
        columnMapKeys: assignmentsData && assignmentsData.columnMap ? Object.keys(assignmentsData.columnMap) : [],
        sampleRow: assignmentsData && assignmentsData.data && assignmentsData.data.length > 0 ? assignmentsData.data[0] : null
      };
      debugLog(`✅ Assignments data: ${results.assignmentsData.rowCount} rows`);
    } catch (error) {
      results.assignmentsData = { success: false, error: error.message };
      debugLog('❌ getAssignmentsData failed:', error.message);
    }
    
    // Test 3: Check getRiders function
    debugLog('\n3. Testing getRiders...');
    try {
      const riders = getRiders();
      results.ridersData = {
        success: true,
        exists: !!riders,
        isArray: Array.isArray(riders),
        count: riders ? riders.length : 0,
        sampleRider: riders && riders.length > 0 ? riders[0] : null
      };
      debugLog(`✅ Riders data: ${results.ridersData.count} riders`);
    } catch (error) {
      results.ridersData = { success: false, error: error.message };
      debugLog('❌ getRiders failed:', error.message);
    }
    
    // Test 4: Test count functions individually
    debugLog('\n4. Testing individual count functions...');
    
    const countFunctions = [
      'getTotalRequestsCount',
      'getActiveRidersCount', 
      'getTotalAssignmentsCount',
      'getPendingRequestsCount',
      'getTodayAssignmentsCount',
      'getUnassignedRequestsCount'
    ];
    
    results.countFunctions = {};
    
    countFunctions.forEach(funcName => {
      try {
        const func = eval(funcName);
        if (typeof func === 'function') {
          const count = func();
          results.countFunctions[funcName] = { success: true, count: count };
          debugLog(`✅ ${funcName}: ${count}`);
        } else {
          results.countFunctions[funcName] = { success: false, error: 'Not a function' };
          debugLog(`❌ ${funcName}: Not a function`);
        }
      } catch (error) {
        results.countFunctions[funcName] = { success: false, error: error.message };
        debugLog(`❌ ${funcName}: ${error.message}`);
      }
    });
    
    // Test 5: Check CONFIG object
    debugLog('\n5. Testing CONFIG object...');
    try {
      results.config = {
        exists: typeof CONFIG !== 'undefined',
        hasSheets: !!(CONFIG && CONFIG.sheets),
        hasColumns: !!(CONFIG && CONFIG.columns),
        requestsSheet: CONFIG && CONFIG.sheets ? CONFIG.sheets.requests : 'undefined',
        assignmentsSheet: CONFIG && CONFIG.sheets ? CONFIG.sheets.assignments : 'undefined',
        ridersSheet: CONFIG && CONFIG.sheets ? CONFIG.sheets.riders : 'undefined'
      };
      debugLog(`✅ CONFIG exists: ${results.config.exists}`);
      if (CONFIG && CONFIG.sheets) {
        debugLog(`   Requests sheet: ${CONFIG.sheets.requests}`);
        debugLog(`   Assignments sheet: ${CONFIG.sheets.assignments}`);
        debugLog(`   Riders sheet: ${CONFIG.sheets.riders}`);
      }
    } catch (error) {
      results.config = { success: false, error: error.message };
      debugLog('❌ CONFIG check failed:', error.message);
    }
    
    // Test 6: Test getDashboardStats function
    debugLog('\n6. Testing getDashboardStats function...');
    try {
      const stats = getDashboardStats();
      results.dashboardStats = {
        success: true,
        stats: stats
      };
      debugLog('✅ getDashboardStats result:', stats);
    } catch (error) {
      results.dashboardStats = { success: false, error: error.message };
      debugLog('❌ getDashboardStats failed:', error.message);
    }
    
    // Test 7: Test getAdminDashboardData function
    debugLog('\n7. Testing getAdminDashboardData function...');
    try {
      const adminData = getAdminDashboardData();
      results.adminDashboardData = {
        success: adminData.success,
        stats: adminData.stats,
        error: adminData.error
      };
      debugLog('✅ getAdminDashboardData result:', adminData);
    } catch (error) {
      results.adminDashboardData = { success: false, error: error.message };
      debugLog('❌ getAdminDashboardData failed:', error.message);
    }
    
    // Summary
    debugLog('\n📋 === DIAGNOSTIC SUMMARY ===');
    debugLog(`Requests data working: ${results.requestsData?.success ? '✅' : '❌'}`);
    debugLog(`Assignments data working: ${results.assignmentsData?.success ? '✅' : '❌'}`);
    debugLog(`Riders data working: ${results.ridersData?.success ? '✅' : '❌'}`);
    debugLog(`Count functions working: ${Object.values(results.countFunctions || {}).filter(f => f.success).length}/${countFunctions.length}`);
    debugLog(`CONFIG object working: ${results.config?.exists ? '✅' : '❌'}`);
    
    // Recommendations
    debugLog('\n🔧 === RECOMMENDATIONS ===');
    
    if (!results.requestsData?.success) {
      debugLog('🔧 ISSUE: getRequestsData not working');
      debugLog('   SOLUTION: Check if Requests sheet exists and has data');
    } else if (results.requestsData?.rowCount === 0) {
      debugLog('🔧 ISSUE: Requests sheet has no data');
      debugLog('   SOLUTION: Add some request data to test with');
    }
    
    if (!results.assignmentsData?.success) {
      debugLog('🔧 ISSUE: getAssignmentsData not working'); 
      debugLog('   SOLUTION: Check if Assignments sheet exists');
    }
    
    if (!results.ridersData?.success) {
      debugLog('🔧 ISSUE: getRiders not working');
      debugLog('   SOLUTION: Check if Riders sheet exists and has data');
    }
    
    const failedCounts = Object.keys(results.countFunctions || {}).filter(f => !results.countFunctions[f].success);
    if (failedCounts.length > 0) {
      debugLog('🔧 ISSUE: Some count functions failed');
      debugLog('   FAILED:', failedCounts.join(', '));
      debugLog('   SOLUTION: These functions need to be implemented');
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * MANUAL COUNT: Count rows directly from sheets
 */
function manualCountSheetRows() {
  debugLog('🔢 MANUAL ROW COUNTING...');
  
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const results = {};
    
    // Check each sheet
    const sheetNames = ['Requests', 'Assignments', 'Riders'];
    
    sheetNames.forEach(sheetName => {
      try {
        const sheet = spreadsheet.getSheetByName(sheetName);
        if (sheet) {
          const lastRow = sheet.getLastRow();
          const lastCol = sheet.getLastColumn();
          const dataRows = lastRow > 1 ? lastRow - 1 : 0; // Subtract header row
          
          results[sheetName] = {
            exists: true,
            totalRows: lastRow,
            dataRows: dataRows,
            columns: lastCol
          };
          
          // Get sample data
          if (dataRows > 0) {
            const sampleRange = sheet.getRange(2, 1, Math.min(3, dataRows), lastCol);
            const sampleData = sampleRange.getValues();
            results[sheetName].sampleData = sampleData;
          }
          
          debugLog(`✅ ${sheetName}: ${dataRows} data rows (${lastRow} total, ${lastCol} columns)`);
        } else {
          results[sheetName] = { exists: false };
          debugLog(`❌ ${sheetName}: Sheet not found`);
        }
      } catch (error) {
        results[sheetName] = { exists: false, error: error.message };
        debugLog(`❌ ${sheetName}: Error - ${error.message}`);
      }
    });
    
    return results;
    
  } catch (error) {
    console.error('❌ Manual count failed:', error);
    return { error: error.message };
  }
}

/**
 * QUICK FIX: Working count functions that directly access sheets
 */
function createWorkingCountFunctions() {
  debugLog('🔧 Creating working count functions...');
  
  const functions = `
// WORKING COUNT FUNCTIONS - Copy these into your Code.gs file

function workingGetTotalRequestsCount() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Requests');
    if (!sheet) return 0;
    const lastRow = sheet.getLastRow();
    return lastRow > 1 ? lastRow - 1 : 0; // Subtract header row
  } catch (error) {
    debugLog('Error counting requests:', error);
    return 0;
  }
}

function workingGetTotalAssignmentsCount() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Assignments');
    if (!sheet) return 0;
    const lastRow = sheet.getLastRow();
    return lastRow > 1 ? lastRow - 1 : 0; // Subtract header row
  } catch (error) {
    debugLog('Error counting assignments:', error);
    return 0;
  }
}

function workingGetActiveRidersCount() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riders');
    if (!sheet) return 0;
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return 0; // No data or only header
    
    // Find status column (usually column with "Status" header)
    const headers = data[0];
    let statusCol = -1;
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].toString().toLowerCase().includes('status')) {
        statusCol = i;
        break;
      }
    }
    
    if (statusCol === -1) {
      // No status column found, count all riders
      return data.length - 1;
    }
    
    // Count active riders
    let activeCount = 0;
    for (let i = 1; i < data.length; i++) {
      const status = data[i][statusCol];
      if (status && status.toString().toLowerCase() === 'active') {
        activeCount++;
      }
    }
    
    return activeCount;
  } catch (error) {
    debugLog('Error counting active riders:', error);
    return 0;
  }
}

function workingGetDashboardStats() {
  try {
    const stats = {
      totalRequests: workingGetTotalRequestsCount(),
      totalAssignments: workingGetTotalAssignmentsCount(),
      activeRiders: workingGetActiveRidersCount(),
      totalRiders: workingGetActiveRidersCount(), // Alias
      pendingRequests: 0, // Would need more complex logic
      unassignedRequests: 0, // Would need more complex logic
      todayAssignments: 0, // Would need date checking
      escortsToday: 0, // Alias for todayAssignments
      unassignedEscorts: 0 // Alias for unassignedRequests
    };
    
    debugLog('Working stats calculated:', stats);
    return stats;
  } catch (error) {
    debugLog('Error in working stats:', error);
    return {
      totalRequests: 0,
      totalAssignments: 0,
      activeRiders: 0,
      totalRiders: 0,
      pendingRequests: 0,
      unassignedRequests: 0,
      todayAssignments: 0,
      escortsToday: 0,
      unassignedEscorts: 0
    };
  }
}
`;

  return functions;
}

/**
 * TEST: Try the working count functions
 */
function testWorkingCountFunctions() {
  debugLog('🧪 Testing working count functions...');
  
  try {
    // Test manual counts
    const manualCounts = manualCountSheetRows();
    debugLog('Manual counts:', manualCounts);
    
    // Test if we can create working functions
    const totalRequests = workingGetTotalRequestsCount();
    const totalAssignments = workingGetTotalAssignmentsCount();
    const activeRiders = workingGetActiveRidersCount();
    
    debugLog('Working function results:');
    debugLog(`Total Requests: ${totalRequests}`);
    debugLog(`Total Assignments: ${totalAssignments}`);
    debugLog(`Active Riders: ${activeRiders}`);
    
    return {
      success: true,
      manualCounts: manualCounts,
      workingCounts: {
        totalRequests: totalRequests,
        totalAssignments: totalAssignments,
        activeRiders: activeRiders
      }
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}

// Add the working count functions
function workingGetTotalRequestsCount() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Requests');
    if (!sheet) return 0;
    const lastRow = sheet.getLastRow();
    return lastRow > 1 ? lastRow - 1 : 0;
  } catch (error) {
    debugLog('Error counting requests:', error);
    return 0;
  }
}

function workingGetTotalAssignmentsCount() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Assignments');
    if (!sheet) return 0;
    const lastRow = sheet.getLastRow();
    return lastRow > 1 ? lastRow - 1 : 0;
  } catch (error) {
    debugLog('Error counting assignments:', error);
    return 0;
  }
}

function workingGetActiveRidersCount() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riders');
    if (!sheet) return 0;
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return 0;
    
    const headers = data[0];
    let statusCol = -1;
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].toString().toLowerCase().includes('status')) {
        statusCol = i;
        break;
      }
    }
    
    if (statusCol === -1) {
      return data.length - 1;
    }
    
    let activeCount = 0;
    for (let i = 1; i < data.length; i++) {
      const status = data[i][statusCol];
      if (status && status.toString().toLowerCase() === 'active') {
        activeCount++;
      }
    }
    
    return activeCount;
  } catch (error) {
    debugLog('Error counting active riders:', error);
    return 0;
  }
}

function workingGetDashboardStats() {
  try {
    const stats = {
      totalRequests: workingGetTotalRequestsCount(),
      totalAssignments: workingGetTotalAssignmentsCount(),
      activeRiders: workingGetActiveRidersCount(),
      totalRiders: workingGetActiveRidersCount(),
      pendingRequests: 0,
      unassignedRequests: 0,
      todayAssignments: 0,
      escortsToday: 0,
      unassignedEscorts: 0
    };
    
    debugLog('Working stats calculated:', stats);
    return stats;
  } catch (error) {
    debugLog('Error in working stats:', error);
    return getDefaultStats();
  }
}

function testGetAdminDashboardData() {
  debugLog('🧪 TESTING getAdminDashboardData...');
  
  try {
    const result = getAdminDashboardData();
    
    debugLog('📊 getAdminDashboardData result:');
    debugLog('Success:', result.success);
    debugLog('Error:', result.error);
    debugLog('Stats:', JSON.stringify(result.stats, null, 2));
    
    if (result.success && result.stats) {
      debugLog('\n📈 Individual Stats:');
      debugLog('Total Requests:', result.stats.totalRequests);
      debugLog('Active Riders:', result.stats.activeRiders || result.stats.totalRiders);
      debugLog('Total Assignments:', result.stats.totalAssignments);
      debugLog('Unassigned Escorts:', result.stats.unassignedEscorts || result.stats.unassignedRequests);
      debugLog('Escorts Today:', result.stats.escortsToday || result.stats.todayAssignments);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}
function testIndividualCountFunctions() {
  debugLog('🔍 TESTING INDIVIDUAL COUNT FUNCTIONS...');
  
  const functions = [
    'getTotalRequestsCount',
    'getActiveRidersCount', 
    'getTotalAssignmentsCount',
    'getPendingRequestsCount',
    'getTodayAssignmentsCount',
    'getUnassignedRequestsCount'
  ];
  
  const results = {};
  
  functions.forEach(funcName => {
    try {
      debugLog(`\n--- Testing ${funcName} ---`);
      const func = eval(funcName);
      
      if (typeof func === 'function') {
        const result = func();
        debugLog(`Result: ${result} (type: ${typeof result})`);
        results[funcName] = {
          success: true,
          result: result,
          type: typeof result,
          isDefined: result !== undefined,
          isNumber: typeof result === 'number'
        };
      } else {
        debugLog(`❌ ${funcName} is not a function`);
        results[funcName] = {
          success: false,
          error: 'Not a function'
        };
      }
    } catch (error) {
      debugLog(`❌ ${funcName} error: ${error.message}`);
      results[funcName] = {
        success: false,
        error: error.message
      };
    }
  });
  
  debugLog('\n📋 SUMMARY:');
  Object.keys(results).forEach(funcName => {
    const result = results[funcName];
    if (result.success) {
      const status = result.isDefined ? '✅' : '❌';
      debugLog(`${status} ${funcName}: ${result.result} (${result.type})`);
    } else {
      debugLog(`❌ ${funcName}: ${result.error}`);
    }
  });
  
  return results;
}

function testBackendFunction() {
  debugLog('🧪 TESTING BACKEND FUNCTION...');
  
  try {
    // Test the function directly
    const result = getAdminDashboardData();
    
    debugLog('📊 Backend Function Result:');
    debugLog('Success:', result.success);
    debugLog('Error:', result.error);
    debugLog('Stats object exists:', !!result.stats);
    
    if (result.stats) {
      debugLog('📈 Individual Stats:');
      Object.keys(result.stats).forEach(key => {
        debugLog(`  ${key}: ${result.stats[key]} (${typeof result.stats[key]})`);
      });
    }
    
    // Test if all required properties exist
    const requiredStats = ['totalRequests', 'totalAssignments', 'activeRiders', 'unassignedEscorts', 'escortsToday'];
    const missingStats = requiredStats.filter(stat => 
      !result.stats || result.stats[stat] === undefined || result.stats[stat] === null
    );
    
    if (missingStats.length > 0) {
      debugLog('❌ Missing stats:', missingStats);
    } else {
      debugLog('✅ All required stats present');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Backend function test failed:', error);
    return { success: false, error: error.message };
  }
}
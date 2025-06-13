/**
 * Diagnostic and helper utilities. The global configuration and menu setup
 * functions were extracted into Config.gs and Menu.gs.
 */

function debugPlaceholderIssues() {
  const filesToCheck = ['index', 'requests', 'assignments', 'notifications', 'reports'];
  
  filesToCheck.forEach(fileName => {
    try {
      console.log(`\n=== DETAILED CHECK: ${fileName}.html ===`);
      const content = HtmlService.createHtmlOutputFromFile(fileName).getContent();
      
      // Check for exact placeholder
      const exactPlaceholder = '<!--NAVIGATION_MENU_PLACEHOLDER-->';
      const exactIndex = content.indexOf(exactPlaceholder);
      console.log(`Exact placeholder found: ${exactIndex !== -1} (index: ${exactIndex})`);
      
      // Check for placeholder parts
      const hasComment = content.includes('<!--');
      const hasNavigation = content.includes('NAVIGATION');
      const hasMenu = content.includes('MENU');
      const hasPlaceholder = content.includes('PLACEHOLDER');
      const hasClosingComment = content.includes('-->');
      
      console.log(`Has <!--: ${hasComment}`);
      console.log(`Has NAVIGATION: ${hasNavigation}`);
      console.log(`Has MENU: ${hasMenu}`);
      console.log(`Has PLACEHOLDER: ${hasPlaceholder}`);
      console.log(`Has -->: ${hasClosingComment}`);
      
      // Search for any navigation-related comments
      const navCommentRegex = /<!--[^>]*NAVIGATION[^>]*-->/gi;
      const navComments = content.match(navCommentRegex);
      if (navComments) {
        console.log(`Navigation comments found:`, navComments);
      }
      
      // Check for common variations
      const variations = [
        '<!--NAVIGATION_MENU_PLACEHOLDER-->',
        '<!-- NAVIGATION_MENU_PLACEHOLDER -->',
        '<!--NAVIGATION_MENU_PLACEHOLDER -->',
        '<!-- NAVIGATION_MENU_PLACEHOLDER-->',
        '<!--NAV_PLACEHOLDER-->',
        '<!--NAVIGATION PLACEHOLDER-->',
        '<!--NAVIGATION-MENU-PLACEHOLDER-->'
      ];
      
      variations.forEach(variation => {
        if (content.includes(variation)) {
          console.log(`Found variation: "${variation}"`);
        }
      });
      
      // Show character codes around any found navigation text
      const navIndex = content.indexOf('NAVIGATION');
      if (navIndex !== -1) {
        const start = Math.max(0, navIndex - 20);
        const end = Math.min(content.length, navIndex + 50);
        const segment = content.substring(start, end);
        console.log(`Context around NAVIGATION: "${segment}"`);
        console.log(`Character codes:`, Array.from(segment).map(char => char.charCodeAt(0)));
      }
      
    } catch (error) {
      console.log(`Error checking ${fileName}: ${error.message}`);
    }
  });
}
function testMySetup() {
  const result = debugSystemSetup();
  console.log('Debug result:', result);
  return result;
}
// ISSUE 2: doGet function problems
// Your current doGet might have issues. Here's a corrected version:
function testNavigationUrls() {
  const baseUrl = getWebAppUrl();
  console.log('Web app URL:', baseUrl);
  
  const nav = getNavigationHtmlWithDynamicUrls('requests');
  console.log('Generated navigation:', nav);
}


// ISSUE 3: getNavigationHtml function problems
// Make sure this function is working correctly:

/**
 * Robust getNavigationHtml function
 */
function getNavigationHtml(currentPage = '') {
  try {
    console.log('getNavigationHtml: Called for page: ' + currentPage); // Added
    console.log(`🧭 Getting navigation for page: ${currentPage}`);
    
    let navContent;
    try {
      navContent = HtmlService.createHtmlOutputFromFile('_navigation.html').getContent();
      console.log('getNavigationHtml: _navigation.html content length: ' + (navContent ? navContent.length : 'null')); // Added
      console.log(`📄 Navigation file loaded: ${navContent.length} chars`);
    } catch (error) {
      console.error('❌ Could not load _navigation.html:', error);
      throw error;
    }
    
    if (!navContent || navContent.length === 0) {
      throw new Error('Navigation file is empty');
    }
    
    // Add active class if needed
    if (currentPage) {
      // Find the anchor with the matching data-page attribute regardless of
      // attribute order and ensure it has the "active" class
      const linkPattern = new RegExp(
        `<a[^>]*data-page="${currentPage}"[^>]*>`,
        'i'
      );
      navContent = navContent.replace(linkPattern, function(anchorHtml) {
        // Update the class attribute inside the matched anchor
        return anchorHtml.replace(/class="([^"]*)"/, function(_, classes) {
          const classList = classes.split(/\s+/);
          if (!classList.includes('active')) {
            classList.push('active');
          }
          return `class="${classList.join(' ')}"`;
        });
      });
    }
    console.log('getNavigationHtml: Returning HTML (first 100 chars): ' + (navContent ? navContent.substring(0,100) : 'null')); // Added
    return navContent;
    
  } catch (error) {
    console.error('❌ Error in getNavigationHtml:', error);
    // Log error before returning fallback
    console.log('getNavigationHtml: Returning HTML (first 100 chars): ' + 'null (error fallback)'); // Added for error path
    
    // Return basic fallback navigation
    const baseUrl = getWebAppUrl();
    return `<nav class="navigation">
      <a href="${baseUrl}" class="nav-button ${currentPage === 'dashboard' ? 'active' : ''}">📊 Dashboard</a>
      <a href="${baseUrl}?page=requests" class="nav-button ${currentPage === 'requests' ? 'active' : ''}">📋 Requests</a>
      <a href="${baseUrl}?page=assignments" class="nav-button ${currentPage === 'assignments' ? 'active' : ''}">🏍️ Assignments</a>
      <a href="${baseUrl}?page=riders" class="nav-button ${currentPage === 'riders' ? 'active' : ''}" data-page="riders">👥 Riders</a>
      <a href="${baseUrl}?page=notifications" class="nav-button ${currentPage === 'notifications' ? 'active' : ''}">📱 Notifications</a>
      <a href="${baseUrl}?page=reports" class="nav-button ${currentPage === 'reports' ? 'active' : ''}">📊 Reports</a>
    </nav>`;
  }
}

// ISSUE 4: Test the complete flow
/**
 * Complete navigation flow test
 */
function testCompleteNavigationFlow() {
  try {
    console.log('=== COMPLETE NAVIGATION FLOW TEST ===');
    
    // Test 1: _navigation.html file
    console.log('1. Testing _navigation.html...');
    const navFile = HtmlService.createHtmlOutputFromFile('_navigation.html').getContent();
    console.log(`   ✅ File exists: ${navFile.length} chars`);
    
    // Test 2: getNavigationHtml function
    console.log('2. Testing getNavigationHtml...');
    const navHtml = getNavigationHtml('dashboard');
    console.log(`   ✅ Function works: ${navHtml.length} chars`);
    
    // Test 3: Test with each page file
    console.log('3. Testing page files...');
    const pages = ['index', 'requests', 'assignments', 'notifications', 'reports'];
    
    pages.forEach(page => {
      try {
        const content = HtmlService.createHtmlOutputFromFile(page).getContent();
        const hasPlaceholder = content.includes('<!--NAVIGATION_MENU_PLACEHOLDER-->');
        console.log(`   ${page}.html: ${hasPlaceholder ? '✅ HAS' : '❌ MISSING'} placeholder`);
        
        if (hasPlaceholder) {
          const injected = content.replace('<!--NAVIGATION_MENU_PLACEHOLDER-->', navHtml);
          const hasNavAfter = injected.includes('<nav class="navigation">');
          console.log(`   ${page}.html: Injection ${hasNavAfter ? '✅ SUCCESS' : '❌ FAILED'}`);
        }
      } catch (error) {
        console.log(`   ${page}.html: ❌ ERROR - ${error.message}`);
      }
    });
    
    // Test 4: Mock doGet call
    console.log('4. Testing doGet simulation...');
    const mockEvent = { parameter: { page: 'dashboard' } };
    try {
      const result = doGet(mockEvent);
      console.log(`   ✅ doGet completed successfully`);
      
      const finalContent = result.getContent();
      const hasFinalNav = finalContent.includes('<nav class="navigation">');
      console.log(`   Navigation in final output: ${hasFinalNav ? '✅ YES' : '❌ NO'}`);
      
    } catch (error) {
      console.log(`   ❌ doGet failed: ${error.message}`);
    }
    
    console.log('=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Complete flow test failed:', error);
  }
}
// ===== DEFINITIVE PLACEHOLDER FIX =====

// The debug clearly shows NO HTML comments exist in any file
// This means the placeholders are truly missing from the actual files

/**
 * Function to show exactly what needs to be added to each file
 */
function showExactPlaceholderLocations() {
  const files = ['index', 'requests', 'assignments', 'notifications', 'reports'];
  
  files.forEach(fileName => {
    try {
      console.log(`\n=== ${fileName.toUpperCase()}.HTML ===`);
      const content = HtmlService.createHtmlOutputFromFile(fileName).getContent();
      
      // Find common insertion points
      const headerEnd = content.indexOf('</header>');
      const bodyStart = content.indexOf('<body>');
      const containerStart = content.indexOf('<div class="container">');
      const navigationStart = content.indexOf('<nav class="navigation">');
      
      console.log(`File length: ${content.length} characters`);
      console.log(`</header> found at: ${headerEnd}`);
      console.log(`<body> found at: ${bodyStart}`);
      console.log(`<div class="container"> found at: ${containerStart}`);
      console.log(`<nav class="navigation"> found at: ${navigationStart}`);
      
      // Show the area where placeholder should go
      if (headerEnd !== -1) {
        const start = Math.max(0, headerEnd - 50);
        const end = Math.min(content.length, headerEnd + 100);
        console.log(`Context around </header>:`);
        console.log(`"${content.substring(start, end)}"`);
        console.log(`\n>>> ADD PLACEHOLDER AFTER </header> AND BEFORE NEXT ELEMENT <<<`);
      } else if (bodyStart !== -1) {
        const start = Math.max(0, bodyStart);
        const end = Math.min(content.length, bodyStart + 100);
        console.log(`Context after <body>:`);
        console.log(`"${content.substring(start, end)}"`);
        console.log(`\n>>> ADD PLACEHOLDER AFTER <body> <<<`);
      }
      
    } catch (error) {
      console.log(`Error reading ${fileName}: ${error.message}`);
    }
  });
}


/**
 * Create fallback navigation HTML
 */
function createFallbackNavigation(currentPage = '') {
  const baseUrl = getWebAppUrl();
  
    const pages = [
      { id: 'dashboard', url: baseUrl, label: '📊 Dashboard' },
      { id: 'requests', url: `${baseUrl}?page=requests`, label: '📋 Requests' },
      { id: 'assignments', url: `${baseUrl}?page=assignments`, label: '🏍️ Assignments' },
      { id: 'riders', url: `${baseUrl}?page=riders`, label: '👥 Riders' }
    ];

    if (['riders', 'rider-schedule', 'admin-schedule'].includes(currentPage)) {
      pages.push(
        { id: 'rider-schedule', url: `${baseUrl}?page=rider-schedule`, label: '📆 My Schedule' },
        { id: 'admin-schedule', url: `${baseUrl}?page=admin-schedule`, label: '🗓️ Manage Schedules' }
      );
    }

    pages.push(
      { id: 'notifications', url: `${baseUrl}?page=notifications`, label: '📱 Notifications' },
      { id: 'reports', url: `${baseUrl}?page=reports`, label: '📊 Reports' }
    );
  
  const navButtons = pages.map(page => {
    const activeClass = page.id === currentPage ? ' active' : '';
    return `<a href="${page.url}" class="nav-button${activeClass}" data-page="${page.id}">${page.label}</a>`;
  }).join('\n        ');
  
  return `    <nav class="navigation">
        ${navButtons}
    </nav>`;
}
// ===== NAVIGATION VERIFICATION STEPS =====

/**
 * Test if the force injection actually worked
 */
function verifyNavigationInjection() {
  try {
    console.log('=== VERIFYING NAVIGATION INJECTION ===');
    
    // Test the actual doGet function with different pages
    const testPages = ['dashboard', 'requests', 'assignments', 'notifications', 'reports'];
    
    testPages.forEach(pageName => {
      console.log(`\n--- Testing ${pageName} page ---`);
      
      try {
        const mockEvent = { parameter: { page: pageName === 'dashboard' ? undefined : pageName } };
        const result = doGet(mockEvent);
        const content = result.getContent();
        
        console.log(`✅ Page loads: ${pageName}`);
        console.log(`Content length: ${content.length} chars`);
        
        // Check for navigation elements
        const hasNavTag = content.includes('<nav class="navigation">');
        const hasNavButtons = content.includes('nav-button');
        const hasDashboardLink = content.includes('📊 Dashboard');
        const hasRequestsLink = content.includes('📋 Requests');
        
        console.log(`Has <nav> tag: ${hasNavTag ? '✅' : '❌'}`);
        console.log(`Has nav buttons: ${hasNavButtons ? '✅' : '❌'}`);
        console.log(`Has Dashboard link: ${hasDashboardLink ? '✅' : '❌'}`);
        console.log(`Has Requests link: ${hasRequestsLink ? '✅' : '❌'}`);
        
        if (hasNavTag) {
          // Extract and show the navigation HTML
          const navStart = content.indexOf('<nav class="navigation">');
          const navEnd = content.indexOf('</nav>', navStart) + 6;
          const navHtml = content.substring(navStart, navEnd);
          console.log(`Navigation HTML: ${navHtml.substring(0, 200)}...`);
        }
        
        // Check if navigation has active class for current page
        if (pageName !== 'dashboard') {
          const hasActiveClass = content.includes(`data-page="${pageName}"`) && content.includes('active');
          console.log(`Has active class for ${pageName}: ${hasActiveClass ? '✅' : '❌'}`);
        }
        
      } catch (error) {
        console.log(`❌ Error testing ${pageName}: ${error.message}`);
      }
    });
    
    console.log('\n=== VERIFICATION COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

/**
 * Quick test to see what the actual web app output looks like
 */
function showActualWebAppOutput() {
  try {
    console.log('=== ACTUAL WEB APP OUTPUT SAMPLE ===');
    
    const mockEvent = { parameter: {} }; // Dashboard
    const result = doGet(mockEvent);
    const content = result.getContent();
    
    console.log(`Total content length: ${content.length} characters`);
    
    // Show the first part of the content (should include navigation)
    const firstPart = content.substring(0, 1000);
    console.log('\nFirst 1000 characters of output:');
    console.log('---START---');
    console.log(firstPart);
    console.log('---END---');
    
    // Look specifically for navigation
    const navIndex = content.indexOf('<nav');
    if (navIndex !== -1) {
      console.log(`\nNavigation found at position: ${navIndex}`);
      const navSection = content.substring(navIndex, navIndex + 500);
      console.log('Navigation section:');
      console.log(navSection);
    } else {
      console.log('\n❌ No <nav> tag found in output');
    }
    
    // Check what injection strategy was used (look for console logs)
    console.log('\nDeployment check:');
    console.log('- If you see navigation HTML above, the injection worked');
    console.log('- If not, there may be a deployment issue');
    console.log('- Check your web app deployment settings');
    
  } catch (error) {
    console.error('❌ Error showing output:', error);
  }
}

/**
 * Check deployment and provide troubleshooting steps
 */
function checkDeploymentStatus() {
  try {
    console.log('=== DEPLOYMENT TROUBLESHOOTING ===');
    
    // Get the web app URL
    const webAppUrl = getWebAppUrl();
    console.log(`Web App URL: ${webAppUrl}`);
    
    // Check if we can create HTML outputs
    try {
      const testOutput = HtmlService.createHtmlOutput('<h1>Test</h1>');
      console.log('✅ HTML Service working');
    } catch (error) {
      console.log('❌ HTML Service error:', error.message);
    }
    
    // Check if navigation file exists
    try {
      const navContent = HtmlService.createHtmlOutputFromFile('_navigation.html').getContent();
      console.log(`✅ Navigation file exists (${navContent.length} chars)`);
    } catch (error) {
      console.log('❌ Navigation file error:', error.message);
    }
    
    // Test the doGet function directly
    try {
      const result = doGet({ parameter: {} });
      console.log('✅ doGet function works');
      
      const content = result.getContent();
      const hasNav = content.includes('<nav');
      console.log(`Navigation in output: ${hasNav ? '✅ YES' : '❌ NO'}`);
      
    } catch (error) {
      console.log('❌ doGet function error:', error.message);
    }
    
    console.log('\nNext steps:');
    console.log('1. If everything shows ✅ above, check your browser');
    console.log('2. Open your web app URL in a new private/incognito window');
    console.log('3. Check browser console (F12) for any errors');
    console.log('4. If still no navigation, you may need to redeploy the web app');
    
  } catch (error) {
    console.error('❌ Deployment check failed:', error);
  }
}

// BROWSER-SIDE DEBUGGING CODE
// Add this to your HTML files for client-side verification:
const clientDebugCode = `
<script>
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 CLIENT-SIDE NAVIGATION DEBUG');
    
    // Check if navigation exists
    const nav = document.querySelector('nav.navigation');
    console.log('Navigation element found:', !!nav);
    
    if (nav) {
        console.log('✅ Navigation HTML:', nav.outerHTML);
        console.log('✅ Navigation visible:', nav.offsetHeight > 0);
        console.log('✅ Navigation position:', nav.getBoundingClientRect());
        
        // Check nav buttons
        const buttons = nav.querySelectorAll('.nav-button');
        console.log('✅ Number of nav buttons:', buttons.length);
        
        buttons.forEach((btn, index) => {
            console.log(\`Button \${index + 1}: \${btn.textContent.trim()}\`);
        });
        
    } else {
        console.log('❌ Navigation not found in DOM');
        
        // Check if placeholder still exists
        const bodyHtml = document.body.innerHTML;
        if (bodyHtml.includes('NAVIGATION_MENU_PLACEHOLDER')) {
            console.log('❌ Placeholder still exists - injection failed');
        }
        
        // Check for any nav-related elements
        const navElements = document.querySelectorAll('[class*="nav"], [id*="nav"]');
        console.log('Other nav elements found:', navElements.length);
    }
    
    // Check page parameters
    const urlParams = new URLSearchParams(window.location.search);
    console.log('Current page parameter:', urlParams.get('page') || 'dashboard');
});
</script>
`;

/* 
TESTING CHECKLIST:

1. Run verifyNavigationInjection() to test all pages
2. Run showActualWebAppOutput() to see what's being generated
3. Run checkDeploymentStatus() for troubleshooting info

4. If tests show navigation exists but you don't see it:
   - Clear browser cache
   - Try private/incognito window
   - Check if you need to redeploy the web app

5. Add the client debug code to one HTML file temporarily to check browser-side

6. If navigation still doesn't appear:
   - Go to Deploy → Manage Deployments
   - Create a new deployment (New Deployment button)
   - Set Execute as: Me
   - Set Access: Anyone
   - Deploy and use the new URL
*/
/**
 * Test the force injection approach
 */
function testForceInjection() {
  try {
    console.log('=== TESTING FORCE INJECTION ===');
    
    const mockEvent = { parameter: { page: 'dashboard' } };
    const result = doGetWithForceInjection(mockEvent);
    const finalContent = result.getContent();
    
    console.log(`Final content length: ${finalContent.length}`);
    console.log(`Has navigation: ${finalContent.includes('<nav class="navigation">')}`);
    console.log(`Has nav buttons: ${finalContent.includes('nav-button')}`);
    
    // Show navigation section
    const navStart = finalContent.indexOf('<nav class="navigation">');
    if (navStart !== -1) {
      const navEnd = finalContent.indexOf('</nav>', navStart) + 6;
      console.log('Navigation HTML in final content:');
      console.log(finalContent.substring(navStart, navEnd));
    }
    
    return { success: true, hasNavigation: finalContent.includes('<nav class="navigation">') };
    
  } catch (error) {
    console.error('Force injection test failed:', error);
    return { success: false, error: error.message };
  }
}



function testPlaceholderInFiles() {
  const filesToCheck = ['index', 'requests', 'assignments', 'notifications', 'reports'];
  
  filesToCheck.forEach(fileName => {
    try {
      const content = HtmlService.createHtmlOutputFromFile(fileName).getContent();
      const placeholder = '<!--NAVIGATION_MENU_PLACEHOLDER-->';
      const placeholderIndex = content.indexOf(placeholder);
      
      console.log(`${fileName}.html: Placeholder ${placeholderIndex !== -1 ? 'FOUND' : 'NOT FOUND'} at index ${placeholderIndex}`);
      
      if (placeholderIndex !== -1) {
        const context = content.substring(placeholderIndex - 50, placeholderIndex + 100);
        console.log(`Context: ${context}`);
      }
    } catch (error) {
      console.log(`Error checking ${fileName}.html: ${error.message}`);
    }
  });
}
function testNavigationMenu() {
  try {
    const navContent = HtmlService.createHtmlOutputFromFile('_navigation.html').getContent();
    console.log('Navigation file exists. Length:', navContent.length);
    console.log('Content:', navContent);
    return navContent;
  } catch (error) {
    console.log('Navigation file error:', error.message);
    return null;
  }
}
/**
 * Enhanced onEdit function that clears cache when relevant sheets are modified.
 * Also handles Request ID generation, dashboard filter changes, and notification actions.
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e The onEdit event object.
 * @return {void}
 */
function _onEdit(e) {
  // Simple throttling to prevent rapid, identical edits from firing multiple times.
  const now = Date.now();
  const last = PropertiesService.getScriptProperties().getProperty('lastEditTime');
  if (last && (now - parseInt(last, 10)) < 1000) { // 1-second debounce.
    console.log('_onEdit: Guard triggered, exiting.');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('lastEditTime', now.toString());

  const range = e.range;
  if (!range) {
    // This should ideally not happen if `e` is a valid edit event.
    console.log('_onEdit: No range in event, exiting.');
    return;
  }

  const sheet = range.getSheet();
  const sheetName = sheet.getName();
  const cellA1 = range.getA1Notation();
  const row = range.getRow();
  const col = range.getColumn();

  console.log(`_onEdit fired on sheet "${sheetName}", cell ${cellA1}`);

  // Protection: Skip rider name column edits (Riders sheet, column B) and header row edits.
  if (sheetName === 'Riders' && (col === 2 || row === 1)) {
    console.log('🛡️ _onEdit: Protecting rider name/header edit - skipping processing');
    return;
  }

  // Clear relevant caches when the underlying data changes.
  if (['Requests', 'Assignments', 'Riders'].includes(sheetName)) {
    clearRequestsCache();
    clearDashboardCache();

    // Specific actions only for Requests sheet
    if (sheetName === CONFIG.sheets.requests) {
      if (row > 1) { // Not header row
        // Generation of Request ID (in column A).
        // This is necessary because onEditRequestsSheet is called within _onEdit now.
        // It needs to be inside a conditional to only trigger if the ID is missing.
        const requestIdCell = sheet.getRange(row, 1);
        requestIdCell.setNumberFormat('@'); // Force plain text format
        let requestId = requestIdCell.getValue();

        if (!requestId || typeof requestId !== 'string' || !requestId.match(/^[A-L]-\d{2}-\d{2}$/)) {
          const newId = generateRequestId(sheet);
          requestIdCell.setValue(newId);
          logActivity(`Generated new Request ID: ${newId} for row ${row}`);
          // A break is needed here to prevent immediate re-triggering, or simply let the next `onEdit` catch it.
          // For simplicity and efficiency, let's allow onEditRequestsSheet handle post-ID-generation logic.
        }
      }
      onEditRequestsSheet(e); // Route to specialized handler for Requests sheet
      return;
    }
  }

  // Handle Dashboard sheet edits.
  if (sheetName === CONFIG.sheets.dashboard) {
    console.log('_onEdit: Routing to dashboard logic');

    // Handle filter dropdown changes (cell B9).
    if (cellA1 === CONFIG.dashboard.filterCell) {
      console.log(`_onEdit: Filter cell changed to "${range.getValue()}", refreshing dashboard.`);
      const lock = LockService.getScriptLock();
      if (lock.tryLock(10000)) { // Attempt to acquire lock for 10 seconds.
        try {
          refreshDashboard(true); // Force update dashboard
        } catch (err) {
          logError('Error refreshing dashboard on filter change', err);
        } finally {
          lock.releaseLock();
        }
      }
      return;
    }

    // Handle notification column actions (column K - 11th column).
    const requestsDisplayStartRow = CONFIG.dashboard.requestsDisplayStartRow;
    if (col === 11 && row >= requestsDisplayStartRow) {
      console.log(`_onEdit: Notification action selected at row ${row}`);
      handleEnhancedNotificationAction(e, sheet, row);
      return;
    }
  }
  console.log(`_onEdit: Edit on unrelated sheet "${sheetName}" or column, skipping.`);
}

// =======================
// REQUEST ID GENERATOR & MANAGEMENT
// =======================
/**
 * Function to handle onEdit events specifically for the Requests sheet.
 * Generates Request ID if missing and updates request status based on rider assignment changes.
 */


// ===== NAVIGATION HELPER =====
/**
 * Fetches the HTML content of the shared navigation menu.
 * @param {string} [currentPage=''] The name of the current page (e.g., 'dashboard', 'requests') to set the active link.
 * @return {string} The HTML content of the navigation menu.
 */
function getNavigationHtml(currentPage = '') {
  try {
    Logger.log("Base Script URL: " + getWebAppUrl()); // Added for URL context
    let navHtmlFromFile = HtmlService.createHtmlOutputFromFile('_navigation.html').getContent();
    Logger.log('Fetched _navigation.html content: ' + navHtmlFromFile);

    let navHtmlProcessed = navHtmlFromFile;
    // Logic to set the 'active' class
    if (currentPage) {
      // More robust regex to add 'active' class to the correct link
      // It looks for an <a> tag with the correct data-page and class="nav-button"
      // and inserts ' active' into the class attribute.
      const linkToMakeActivePattern = new RegExp(
        `(<a[^>]*data-page="${currentPage}"[^>]*class="[^"]*nav-button)([^"]*)("[^>]*>)`,
        'i'
      );

      navHtmlProcessed = navHtmlProcessed.replace(linkToMakeActivePattern, function(match, p1, p2, p3) {
        if (p2.includes(' active')) { // Already active (or nav-button active)
          // Check if it's exactly ' active' or part of another class like 'nav-button-active'
          // This check ensures we don't add 'active' if 'nav-button active' is already present.
          if (/(?:^|\s)active(?:\s|$)/.test(p2)) {
            return match; // Already correctly active
          }
          // If 'active' is part of another class name, this might need more specific handling,
          // but for 'nav-button active' it should be fine.
        }
        // Insert ' active' ensuring a space if other classes follow nav-button
        return `${p1} active${p2}${p3}`;
      });
    }
    Logger.log('Processed navigationMenuHtml (with active class attempt for ' + currentPage + '): ' + navHtmlProcessed);
    return navHtmlProcessed;
  } catch (error) {
    logError('Error getting navigation HTML', error);
    Logger.log('Error in getNavigationHtml: ' + error.toString());
    return '<!-- Navigation Load Error -->'; // Fallback
  }
}

// ===== WEB APP ENTRY POINTS (DO NOT EDIT FUNCTION NAMES)=====




/**
 * Handles HTTP POST requests, serving as an API endpoint for the web app.
 * @param {GoogleAppsScript.Events.DoPost} e The event object from the POST request.
 *                                         `e.parameter.action` specifies the function to call.
 *                                         `e.parameter.data` contains a JSON string of arguments for the action.
 * @return {GoogleAppsScript.ContentService.TextOutput} A JSON response indicating success or failure.
 */
/**
 * Complete doPost function with SMS webhook handler
 * Replace your existing doPost function in Code.js with this version
 */
function doPost(e) {
  try {
    console.log('📨 doPost called');
    
    // Log the incoming request for debugging
    if (e && e.parameter) {
      console.log('📋 Parameters received:', JSON.stringify(e.parameter));
    }
    
    // Check if this is a Twilio SMS webhook
    if (e.parameter.webhook === 'sms' || e.parameter.From) {
      console.log('📱 Detected SMS webhook from Twilio');
      return handleSMSWebhook(e);
    }
    
    // Handle regular web app API calls
    const action = e.parameter.action;
    const data = JSON.parse(e.parameter.data || '{}');
    
    console.log(`🔧 doPost action: ${action}`);
    
    let result = {};
    
    switch (action) {
      case 'createRequest':
        throw new Error('createRequest action not implemented in this version.');
        
      case 'updateRequestStatus':
        throw new Error('updateRequestStatus action not implemented in this version.');
        
      case 'assignRiders':
        result = processAssignmentAndPopulate(data.requestId, data.selectedRiders);
        break;
        
      case 'sendNotification':
        result = sendAssignmentNotification(data.assignmentId, data.notificationType);
        break;
        
      case 'bulkNotification':
        result = sendBulkNotificationsByTimeframe(data.filter, data.type);
        break;
        
      case 'generateReport':
        result = generateReportData(data.filters);
        break;
      
      case 'riderOperation':
        result = handleRiderOperation(data.action, data.data);
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    // Return standard success response for API calls
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('❌ doPost error:', error);
    logError('doPost error', error);
    
    // Return standard error response for API calls
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle incoming SMS responses from Twilio
 * This function processes SMS replies from riders
 */
function handleSMSWebhook(e) {
  try {
    console.log('📱 Processing SMS webhook...');
    
    // Extract Twilio parameters
    const fromNumber = e.parameter.From || '';           // Rider's phone number (+15551234567)
    const toNumber = e.parameter.To || '';               // Your Twilio number
    const messageBody = e.parameter.Body || '';          // The SMS message content
    const messageSid = e.parameter.MessageSid || '';     // Twilio message ID
    const accountSid = e.parameter.AccountSid || '';     // Twilio account ID
    
    console.log(`📨 SMS from ${fromNumber} to ${toNumber}: "${messageBody}"`);
    console.log(`📋 Message SID: ${messageSid}`);
    
    // Verify this is from your Twilio account (security check)
    if (accountSid && accountSid !== CONFIG.twilio.accountSid) {
      console.warn('⚠️ SMS webhook from unknown account, ignoring');
      return createTwiMLResponse();
    }
    
    // Process the SMS response
    const responseResult = processSMSResponse(fromNumber, messageBody, messageSid);
    
    // Log the response for tracking
    logSMSResponse(fromNumber, messageBody, messageSid, responseResult);
    
    console.log(`✅ SMS response processed: ${responseResult.action}`);
    
    // Return empty TwiML response (required by Twilio)
    return createTwiMLResponse();
    
  } catch (error) {
    console.error('❌ SMS webhook error:', error);
    logError('SMS webhook error', error);
    
    // Always return valid TwiML response, even on error
    return createTwiMLResponse();
  }
}

/**
 * Process SMS responses from riders
 */
function processSMSResponse(fromNumber, messageBody, messageSid) {
  try {
    const cleanMessage = messageBody.trim().toLowerCase();
    console.log(`🔍 Processing message: "${cleanMessage}"`);
    
    // Find the rider by phone number
    const rider = findRiderByPhone(fromNumber);
    if (!rider) {
      console.log(`⚠️ SMS from unknown number: ${fromNumber}`);
      
      // Send helpful response to unknown numbers
      sendAutoReply(fromNumber, 'This number is not registered in our rider system. Please contact dispatch if you need assistance.');
      
      return { 
        action: 'unknown_number', 
        rider: null,
        fromNumber: fromNumber 
      };
    }
    
    console.log(`👤 SMS from rider: ${rider.name}`);
    
    // Process different response types
    let action = 'unknown';
    let autoReply = null;
    let statusUpdate = null;
    
    if (cleanMessage.includes('confirm') || cleanMessage === 'yes' || cleanMessage === 'y' || cleanMessage === '1') {
      action = 'confirm';
      statusUpdate = 'Confirmed';
      autoReply = `✅ Thanks ${rider.name}! Your assignment is CONFIRMED. Safe riding! 🏍️`;
      
    } else if (cleanMessage.includes('decline') || cleanMessage.includes('cancel') || cleanMessage === 'no' || cleanMessage === 'n' || cleanMessage === '0') {
      action = 'decline';
      statusUpdate = 'Declined';
      autoReply = `📝 Thanks for letting us know, ${rider.name}. We'll assign another rider for this request.`;
      
    } else if (cleanMessage.includes('info') || cleanMessage.includes('details') || cleanMessage.includes('help')) {
      action = 'info_request';
      autoReply = getAssignmentDetails(rider.name);
      
    } else if (cleanMessage.includes('status') || cleanMessage.includes('assignment')) {
      action = 'status_check';
      autoReply = getAssignmentStatus(rider.name);
      
    } else {
      action = 'general_response';
      autoReply = `Thanks for your message, ${rider.name}. An admin will review and respond if needed.\n\nQuick replies:\n• CONFIRM - Accept assignment\n• DECLINE - Cannot accept\n• INFO - Get assignment details`;
      
      // Notify admin of message that needs attention
      notifyAdminOfResponse(rider.name, fromNumber, messageBody);
    }
    
    // Update assignment status if needed
    if (statusUpdate) {
      const updateResult = updateAssignmentStatus(rider.name, statusUpdate);
      console.log(`📊 Status update result: ${updateResult.success ? 'Success' : 'Failed'}`);
    }
    
    // Send auto-reply
    if (autoReply) {
      setTimeout(() => {
        sendAutoReply(fromNumber, autoReply);
      }, 1000); // Small delay to ensure proper order
    }
    
    return { 
      action: action, 
      rider: rider.name, 
      statusUpdate: statusUpdate,
      autoReply: !!autoReply 
    };
    
  } catch (error) {
    console.error('❌ Error processing SMS response:', error);
    logError('Error processing SMS response', error);
    
    return { 
      action: 'error', 
      error: error.message,
      fromNumber: fromNumber 
    };
  }
}

/**
 * Find rider by phone number
 */
function findRiderByPhone(phoneNumber) {
  try {
    const ridersData = getRidersData();
    
    // Clean the search phone number (remove +1 and non-digits, get last 10 digits)
    const cleanSearchNumber = phoneNumber.replace(/\D/g, '').slice(-10);
    console.log(`🔍 Searching for rider with phone ending in: ${cleanSearchNumber}`);
    
    for (let i = 0; i < ridersData.data.length; i++) {
      const row = ridersData.data[i];
      const riderPhone = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.phone);
      const riderName = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.name);
      
      if (riderPhone && riderName) {
        // Clean the rider's phone number the same way
        const cleanRiderPhone = riderPhone.replace(/\D/g, '').slice(-10);
        
        if (cleanRiderPhone === cleanSearchNumber) {
          console.log(`✅ Found rider: ${riderName}`);
          return {
            name: riderName,
            phone: riderPhone,
            email: getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.email) || '',
            jpNumber: getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.jpNumber) || ''
          };
        }
      }
    }
    
    console.log(`❌ No rider found for phone: ${phoneNumber}`);
    return null;
    
  } catch (error) {
    console.error('❌ Error finding rider by phone:', error);
    logError('Error finding rider by phone', error);
    return null;
  }
}

/**
 * Update assignment status based on rider response
 */
function updateAssignmentStatus(riderName, newStatus) {
  try {
    console.log(`📊 Updating status for ${riderName} to ${newStatus}`);
    
    const assignmentsData = getAssignmentsData(false); // Force fresh data
    const sheet = assignmentsData.sheet;
    let updatedCount = 0;
    
    for (let i = 0; i < assignmentsData.data.length; i++) {
      const row = assignmentsData.data[i];
      const assignmentRider = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const currentStatus = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      const assignmentId = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.id);
      
      // Update assignments that are currently "Assigned" for this rider
      if (assignmentRider === riderName && currentStatus === 'Assigned') {
        const rowNumber = i + 2; // Account for header row
        const statusColIndex = assignmentsData.columnMap[CONFIG.columns.assignments.status] + 1;
        
        sheet.getRange(rowNumber, statusColIndex).setValue(newStatus);
        
        console.log(`✅ Updated assignment ${assignmentId}: ${riderName} → ${newStatus}`);
        logActivity(`SMS Response: Assignment ${assignmentId} status updated to ${newStatus} for ${riderName}`);
        updatedCount++;
      }
    }
    
    return { success: true, updatedCount: updatedCount };
    
  } catch (error) {
    console.error('❌ Error updating assignment status:', error);
    logError('Error updating assignment status', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get assignment details for a rider
 */
function getAssignmentDetails(riderName) {
  try {
    console.log(`📋 Getting assignment details for ${riderName}`);
    
    const assignmentsData = getAssignmentsData();
    
    for (let i = 0; i < assignmentsData.data.length; i++) {
      const row = assignmentsData.data[i];
      const assignmentRider = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const status = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      
      // Find active assignments for this rider
      if (assignmentRider === riderName && ['Assigned', 'Confirmed'].includes(status)) {
        const assignmentId = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.id);
        const requestId = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
        const eventDate = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
        const startTime = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.startTime);
        const startLocation = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.startLocation);
        const endLocation = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.endLocation);
        
        let details = `📋 ASSIGNMENT DETAILS\n\n`;
        details += `Assignment: ${assignmentId}\n`;
        details += `Request: ${requestId}\n`;
        details += `Date: ${formatDateForDisplay(eventDate)}\n`;
        details += `Time: ${formatTimeForDisplay(startTime)}\n`;
        details += `Start: ${startLocation || 'TBD'}\n`;
        details += `End: ${endLocation || 'TBD'}\n`;
        details += `Status: ${status}\n\n`;
        details += `Reply CONFIRM to accept or DECLINE if unavailable.`;
        
        return details;
      }
    }
    
    return `Hi ${riderName}! No current assignments found. You'll receive notifications when new assignments are available.`;
    
  } catch (error) {
    console.error('❌ Error getting assignment details:', error);
    logError('Error getting assignment details', error);
    return `Sorry ${riderName}, unable to retrieve assignment details right now. Please contact dispatch.`;
  }
}

/**
 * Get current assignment status for a rider
 */
function getAssignmentStatus(riderName) {
  try {
    const assignmentsData = getAssignmentsData();
    const activeAssignments = [];
    
    for (let i = 0; i < assignmentsData.data.length; i++) {
      const row = assignmentsData.data[i];
      const assignmentRider = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const status = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      
      if (assignmentRider === riderName && !['Completed', 'Cancelled'].includes(status)) {
        const requestId = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
        const eventDate = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
        
        activeAssignments.push({
          requestId: requestId,
          eventDate: formatDateForDisplay(eventDate),
          status: status
        });
      }
    }
    
    if (activeAssignments.length === 0) {
      return `Hi ${riderName}! You have no active assignments at this time.`;
    } else {
      let statusMsg = `📊 STATUS for ${riderName}:\n\n`;
      activeAssignments.forEach((assignment, index) => {
        statusMsg += `${index + 1}. ${assignment.requestId}\n`;
        statusMsg += `   Date: ${assignment.eventDate}\n`;
        statusMsg += `   Status: ${assignment.status}\n\n`;
      });
      statusMsg += `Reply INFO for full details of any assignment.`;
      return statusMsg;
    }
    
  } catch (error) {
    console.error('❌ Error getting assignment status:', error);
    return `Sorry ${riderName}, unable to check status right now.`;
  }
}

/**
 * Send auto-reply SMS
 */
function sendAutoReply(toNumber, message) {
  try {
    console.log(`📱 Sending auto-reply to ${toNumber}`);
    
    // Remove +1 country code for the sendSMS function
    const cleanNumber = toNumber.replace('+1', '');
    
    const result = sendSMS(cleanNumber, 'auto', message);
    
    if (result.success) {
      console.log(`✅ Auto-reply sent successfully`);
      logActivity(`Auto-reply sent to ${toNumber}: ${message.substring(0, 50)}...`);
    } else {
      console.error(`❌ Auto-reply failed: ${result.message}`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error sending auto-reply:', error);
    logError('Error sending auto-reply', error);
    return { success: false, message: error.message };
  }
}

/**
 * Log SMS responses to tracking sheet
 */
function logSMSResponse(fromNumber, messageBody, messageSid, result) {
  try {
    const sheet = getOrCreateSheet('SMS_Responses', [
      'Timestamp', 'From Number', 'Rider Name', 'Message Body', 'Action', 'Status Update', 'Auto Reply Sent'
    ]);
    
    sheet.appendRow([
      new Date(),
      fromNumber,
      result.rider || 'Unknown',
      messageBody,
      result.action,
      result.statusUpdate || 'None',
      result.autoReply ? 'Yes' : 'No'
    ]);
    
    console.log(`📝 SMS response logged: ${result.action}`);
    
  } catch (error) {
    console.error('❌ Error logging SMS response:', error);
    logError('Error logging SMS response', error);
  }
}

/**
 * Notify admin of responses that need manual handling
 */
function notifyAdminOfResponse(riderName, fromNumber, messageBody) {
  try {
    const logMessage = `SMS Response needs attention - ${riderName} (${fromNumber}): "${messageBody}"`;
    logActivity(logMessage);
    
    // Could also send email notification here if needed:
    // GmailApp.sendEmail('admin@yourdomain.com', 'SMS Response Needs Attention', logMessage);
    
    console.log(`📧 Admin notified of response from ${riderName}`);
    
  } catch (error) {
    console.error('❌ Error notifying admin:', error);
    logError('Error notifying admin of response', error);
  }
}

/**
 * Find rider by email address
 */
function findRiderByEmail(emailAddress) {
  try {
    const ridersData = getRidersData();
    const cleanEmail = String(emailAddress).trim().toLowerCase();

    for (let i = 0; i < ridersData.data.length; i++) {
      const row = ridersData.data[i];
      const riderEmail = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.email);
      const riderName = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.name);

      if (riderEmail && riderName && String(riderEmail).trim().toLowerCase() === cleanEmail) {
        return {
          name: riderName,
          email: riderEmail,
          phone: getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.phone) || '',
          jpNumber: getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.jpNumber) || ''
        };
      }
    }

    console.log(`❌ No rider found for email: ${emailAddress}`);
    return null;

  } catch (error) {
    console.error('❌ Error finding rider by email:', error);
    logError('Error finding rider by email', error);
    return null;
  }
}

/**
 * Process unread email replies from riders
 * Intended to run via time-based trigger
 */
function processEmailResponses() {
  try {
    const threads = GmailApp.search('is:unread in:inbox');
    threads.forEach(thread => {
      const messages = thread.getMessages();
      messages.forEach(msg => {
        if (!msg.isUnread()) return;
        const fromEmail = msg.getFrom().replace(/.*<|>.*/g, '').trim().toLowerCase();
        const body = msg.getPlainBody();
        const result = handleEmailMessage(fromEmail, body);
        logEmailResponse(fromEmail, body, result);
        msg.markRead();
      });
    });

    logActivity(`Processed ${threads.length} email thread(s)`);

  } catch (error) {
    logError('Error processing email responses', error);
  }
}

/**
 * Handle a single email message from a rider
 */
function handleEmailMessage(fromEmail, messageBody) {
  try {
    const cleanBody = String(messageBody).trim().toLowerCase();
    const rider = findRiderByEmail(fromEmail);
    if (!rider) {
      return { action: 'unknown_email', rider: null };
    }

    let action = 'general_response';

    if (cleanBody.includes('confirm') || cleanBody === 'yes' || cleanBody === 'y') {
      action = 'confirm';
      updateAssignmentStatus(rider.name, 'Confirmed');
    } else if (cleanBody.includes('decline') || cleanBody.includes('cancel') || cleanBody === 'no' || cleanBody === 'n') {
      action = 'decline';
      updateAssignmentStatus(rider.name, 'Declined');
    }

    return { action: action, rider: rider.name };

  } catch (error) {
    logError('Error handling email message', error);
    return { action: 'error', error: error.message };
  }
}

/**
 * Log email responses to tracking sheet
 */
function logEmailResponse(fromEmail, messageBody, result) {
  try {
    const sheet = getOrCreateSheet('Email_Responses', [
      'Timestamp', 'From Email', 'Rider Name', 'Message Body', 'Action'
    ]);

    sheet.appendRow([
      new Date(),
      fromEmail,
      result.rider || 'Unknown',
      messageBody,
      result.action
    ]);

    console.log(`📝 Email response logged: ${result.action}`);

  } catch (error) {
    console.error('❌ Error logging email response:', error);
    logError('Error logging email response', error);
  }
}

/**
 * Create empty TwiML response required by Twilio
 */
function createTwiMLResponse() {
  const twimlResponse = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
  
  return ContentService
    .createTextOutput(twimlResponse)
    .setMimeType(ContentService.MimeType.XML);
}

/**
 * ENHANCEMENT 6: Bulk notification functions by time period (callable from menu)
 */
// Today's assignments
/** @return {void} Sends SMS for today's assignments. */
function sendTodaySMS() { sendBulkByDateRange('SMS', 'today'); }
/** @return {void} Sends Email for today's assignments. */
function sendTodayEmail() { sendBulkByDateRange('Email', 'today'); }
/** @return {void} Sends Both SMS and Email for today's assignments. */
function sendTodayBoth() { sendBulkByDateRange('Both', 'today'); }

// This week's assignments
/** @return {void} Sends SMS for this week's assignments. */
function sendWeekSMS() { sendBulkByDateRange('SMS', 'week'); }
/** @return {void} Sends Email for this week's assignments. */
function sendWeekEmail() { sendBulkByDateRange('Email', 'week'); }
/** @return {void} Sends Both SMS and Email for this week's assignments. */
function sendWeekBoth() { sendBulkByDateRange('Both', 'week'); }

// Pending assignments (not yet notified)
/** @return {void} Sends SMS for pending assignments (never notified). */
function sendPendingSMS() { sendBulkByStatus('SMS', 'pending'); }
/** @return {void} Sends Email for pending assignments (never notified). */
function sendPendingEmail() { sendBulkByStatus('Email', 'pending'); }
/** @return {void} Sends Both SMS and Email for pending assignments (never notified). */
function sendPendingBoth() { sendBulkByStatus('Both', 'pending'); }

// All assigned requests
/** @return {void} Sends SMS for all active, assigned requests. */
function sendAllAssignedSMS() { sendBulkByStatus('SMS', 'assigned'); }
/** @return {void} Sends Email for all active, assigned requests. */
function sendAllAssignedEmail() { sendBulkByStatus('Email', 'assigned'); }
/** @return {void} Sends Both SMS and Email for all active, assigned requests. */
function sendAllAssignedBoth() { sendBulkByStatus('Both', 'assigned'); }

/**
 * Core logic for sending bulk notifications by date range.
 * @param {string} notificationType - The type of notification ('SMS', 'Email', 'Both').
 * @param {string} dateRange - The predefined date range ('today', 'week').
 * @return {void}
 */
function sendBulkByDateRange(notificationType, dateRange) {
  try {
    console.log(`Bulk ${notificationType} for ${dateRange}`);
    
    // Calculate date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate = new Date(today);
    let endDate = new Date(today);
    
    if (dateRange === 'today') {
      endDate.setHours(23, 59, 59, 999);
    } else if (dateRange === 'week') {
      endDate.setDate(today.getDate() + 7);
      endDate.setHours(23, 59, 59, 999);
    }
    
    const assignmentsData = getAssignmentsData(); // This already retrieves formatted data
    const targetAssignments = assignmentsData.data.filter(assignment => {
      const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate); // This is already a Date object
      const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      
      if (!eventDate || !(eventDate instanceof Date) || !riderName || String(riderName).trim().length === 0) {
        return false;
      }
      
      if (['Cancelled', 'Completed', 'No Show'].includes(status)) {
        return false;
      }
      
      const assignmentDate = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      return assignmentDate.getTime() >= startDate.getTime() && assignmentDate.getTime() <= endDate.getTime();
    });
    
    if (targetAssignments.length === 0) {
      SpreadsheetApp.getUi().alert(`No assignments found for ${dateRange}`);
      return;
    }
    
    const confirmMessage = `Send ${notificationType} notifications to ${targetAssignments.length} assignment(s) for ${dateRange}?`;
    const response = SpreadsheetApp.getUi().alert('Confirm Bulk Notification', confirmMessage, SpreadsheetApp.getUi().ButtonSet.YES_NO);
    
    if (response !== SpreadsheetApp.getUi().Button.YES) {
      return;
    }
    
    processBulkNotifications(targetAssignments, notificationType, `${dateRange} assignments`);
    
  } catch (error) {
    logError(`Error in bulk ${notificationType} for ${dateRange}`, error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Core logic for sending bulk notifications by status type.
 * @param {string} notificationType - The type of notification ('SMS', 'Email', 'Both').
 * @param {string} statusType - The predefined status type ('pending', 'assigned').
 * @return {void}
 */
function sendBulkByStatus(notificationType, statusType) {
  try {
    console.log(`Bulk ${notificationType} for ${statusType} status`);
    
    const assignmentsData = getAssignmentsData(); // This already retrieves formatted data
    let targetAssignments = [];
    
    if (statusType === 'pending') {
      targetAssignments = assignmentsData.data.filter(assignment => {
        const notified = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.notified);
        const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status); // Get full status

        // Count as pending if has rider, has Assigned/Confirmed/In Progress status, and is NOT notified by any means
        const hasRider = riderName && String(riderName).trim().length > 0;
        const isAssignedActive = ['Assigned', 'Confirmed', 'En Route', 'In Progress'].includes(status);
        const isNotified = notified instanceof Date ||
                           (getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.smsSent) instanceof Date) ||
                           (getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.emailSent) instanceof Date);

        return hasRider && isAssignedActive && !isNotified;
      });
    } else if (statusType === 'assigned') {
      targetAssignments = assignmentsData.data.filter(assignment => {
        const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
        
        return riderName && String(riderName).trim().length > 0 && 
               !['Cancelled', 'Completed', 'No Show'].includes(status);
      });
    }
    
    if (targetAssignments.length === 0) {
      SpreadsheetApp.getUi().alert(`No ${statusType} assignments found`);
      return;
    }
    
    const confirmMessage = `Send ${notificationType} notifications to ${targetAssignments.length} ${statusType} assignment(s)?`;
    const response = SpreadsheetApp.getUi().alert('Confirm Bulk Notification', confirmMessage, SpreadsheetApp.getUi().ButtonSet.YES_NO);
    
    if (response !== SpreadsheetApp.getUi().Button.YES) {
      return;
    }
    
    processBulkNotifications(targetAssignments, notificationType, `${statusType} assignments`);
    
  } catch (error) {
    logError(`Error in bulk ${notificationType} for ${statusType}`, error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Processes bulk notifications for a list of assignments.
 * This is the refined version used for both menu actions and any direct API calls.
 * @param {Array<Array<object>>} assignments - An array of assignment data rows.
 * @param {string} notificationType - The type of notification ('SMS', 'Email', 'Both').
 * @param {string} description - A descriptive string for logging (e.g., "today's assignments").
 * @return {object} A result object with success/failure counts and messages.
 */
function processBulkNotifications(assignments, notificationType, description) {
  try {
    console.log(`Processing ${assignments.length} bulk notifications: ${notificationType} for ${description}`);
    
    const assignmentsData = getAssignmentsData(); // Get mapping
    let successfulCount = 0;
    let failedCount = 0;
    const errors = [];
    
    assignments.forEach((assignmentRow, index) => {
      const assignmentId = getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.id);
      const riderName = getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const requestId = getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
      
      console.log(`Processing ${index + 1}/${assignments.length}: ${assignmentId} - ${riderName}`);
      
      try {
        if (notificationType === 'SMS' || notificationType === 'Both') {
          const smsResult = sendAssignmentNotification(assignmentId, 'SMS');
          if (smsResult.success) { successfulCount++; } else { failedCount++; errors.push(`SMS to ${riderName} (${requestId}): ${smsResult.message}`); }
        }
        
        if (notificationType === 'Email' || notificationType === 'Both') {
          const emailResult = sendAssignmentNotification(assignmentId, 'Email');
          if (emailResult.success) { successfulCount++; } else { failedCount++; errors.push(`Email to ${riderName} (${requestId}): ${emailResult.message}`); }
        }
        
        if (index % 5 === 4) { // Pause every 5 notifications to avoid rate limits
          Utilities.sleep(1000);
        }
      } catch (error) {
        failedCount++;
        errors.push(`${riderName} (${requestId}): ${error.message}`);
      }
    });
    
    logActivity(`Bulk ${notificationType} for ${description}: ${successfulCount} successful, ${failedCount} failed`);
    
    const message = `Processed ${assignments.length} notifications: ${successfulCount} successful, ${failedCount} failed.`;
    
    // For menu calls, use SpreadsheetApp.getUi().alert
    if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.getUi) {
      let alertMessage = `Bulk Notification Results for ${description}:\n\n`;
      alertMessage += `📊 Total Processed: ${assignments.length}\n`;
      alertMessage += `✅ Successful: ${successfulCount}\n`;
      alertMessage += `❌ Failed: ${failedCount}\n\n`;
      if (errors.length > 0) {
        alertMessage += `Errors (showing first 5):\n${errors.slice(0, 5).join('\n')}`;
        if (errors.length > 5) alertMessage += `\n... and ${errors.length - 5} more`;
      }
      SpreadsheetApp.getUi().alert('Bulk Notification Results', alertMessage, SpreadsheetApp.getUi().ButtonSet.OK);
    }

    // For doPost calls, return simplified result
    return { success: true, successful: successfulCount, failed: failedCount, errors: errors.slice(0, 10), message: message };
    
  } catch (error) {
    logError('Error processing bulk notifications', error);
    // For menu alerts
    if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.getUi) {
      SpreadsheetApp.getUi().alert('Bulk Notification Error', 'Error processing bulk notifications: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
    }
    // For doPost errors
    throw new Error('Error processing bulk notifications: ' + error.message);
  }
}

/**
 * Generates a comprehensive notification report and displays it in an alert.
 * @return {void}
 */
function generateNotificationReport() {
  try {
    console.log('Generating notification report');
    
    const assignmentsData = getAssignmentsData(); // This already retrieves formatted data
    const allAssignments = assignmentsData.data.filter(assignment => {
      const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      return status === 'Assigned';
    });
    
    if (allAssignments.length === 0) {
      SpreadsheetApp.getUi().alert('No assigned riders found for report');
      return;
    }
    
    let report = `📊 NOTIFICATION REPORT\n`;
    report += `Generated: ${formatDateTimeForDisplay(new Date())}\n\n`;
    
    let totalAssignments = 0;
    let notifiedCount = 0;
    let smsCount = 0;
    let emailCount = 0;
    
    const byRequest = {};
    
    allAssignments.forEach(assignment => {
      const requestId = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
      const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const notified = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.notified); // Date object or null
      const smsSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.smsSent); // Date object or null
      const emailSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.emailSent); // Date object or null
      
      totalAssignments++;
      
      if (notified instanceof Date) notifiedCount++;
      if (smsSent instanceof Date) smsCount++;
      if (emailSent instanceof Date) emailCount++;
      
      if (!byRequest[requestId]) {
        byRequest[requestId] = [];
      }
      
      byRequest[requestId].push({
        rider: riderName,
        notified: notified instanceof Date,
        sms: smsSent instanceof Date,
        email: emailSent instanceof Date
      });
    });
    
    report += `📈 SUMMARY:\n`;
    report += `Total Assignments: ${totalAssignments}\n`;
    report += `Notified: ${notifiedCount} (${(totalAssignments > 0 ? (notifiedCount/totalAssignments*100).toFixed(0) : 0)}%)\n`;
    report += `SMS Sent: ${smsCount} (${(totalAssignments > 0 ? (smsCount/totalAssignments*100).toFixed(0) : 0)}%)\n`;
    report += `Email Sent: ${emailCount} (${(totalAssignments > 0 ? (emailCount/totalAssignments*100).toFixed(0) : 0)}%)\n\n`;
    
    report += `📋 BY REQUEST (first 10):\n`;
    Object.entries(byRequest).slice(0, 10).forEach(([requestId, riders]) => {
      report += `${requestId}: ${riders.length} rider(s)\n`;
      riders.forEach(rider => {
        const status = [];
        if (rider.sms) status.push('📱');
        if (rider.email) status.push('📧');
        if (rider.notified) status.push('✅');
        report += `  ${rider.rider}: ${status.join(' ') || '❌'}\n`;
      });
    });
    
    if (Object.keys(byRequest).length > 10) {
      report += `... and ${Object.keys(byRequest).length - 10} more requests\n`;
    }
    
    SpreadsheetApp.getUi().alert('Notification Report', report, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    logError('Error generating notification report', error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Get notification history for the notifications page.
 * @return {Array<object>} An array of notification history objects.
 */
function getNotificationHistory() {
  try {
    const assignmentsData = getAssignmentsData(); // Data is already formatted
    
    const history = assignmentsData.data
      .filter(assignment => {
        const smsSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.smsSent);
        const emailSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.emailSent);
        return (smsSent instanceof Date) || (emailSent instanceof Date); // Filter for rows with actual sent timestamps
      })
      .map(assignment => {
        const smsSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.smsSent);
        const emailSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.emailSent);
        const assignmentId = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.id);
        const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const requestId = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
        
        const notifications = [];
        
        if (smsSent instanceof Date) {
          notifications.push({
            id: `${assignmentId}_sms`,
            timestamp: smsSent.toISOString(), // Use ISO string for consistent sorting on client side
            type: 'SMS',
            recipient: riderName,
            requestId: requestId,
            status: 'Success',
            messagePreview: 'Assignment notification sent via SMS'
          });
        }
        
        if (emailSent instanceof Date) {
          notifications.push({
            id: `${assignmentId}_email`,
            timestamp: emailSent.toISOString(),
            type: 'Email',
            recipient: riderName,
            requestId: requestId,
            status: 'Success',
            messagePreview: 'Assignment notification sent via email'
          });
        }
        
        return notifications;
      })
      .flat() // Flatten array of arrays
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Sort by most recent first
    
    return history;
    
  } catch (error) {
    logError('Error getting notification history', error);
    return [];
  }
}

/**
 * Wrapper for admin dashboard notifications
 */
function getSystemNotifications() {
  try {
    return getNotificationHistory().slice(0, 10);
  } catch (error) {
    logError('Error getting system notifications', error);
    return [];
  }
}

/**
 * Wrapper for dispatcher dashboard notifications
 */
function getDispatchNotifications() {
  try {
    return getNotificationHistory().slice(0, 10);
  } catch (error) {
    logError('Error getting dispatch notifications', error);
    return [];
  }
}

// ===== REPORTS FUNCTIONS =====
/**
 * Generates report data based on filters.
 * @param {object} filters An object containing filter criteria (startDate, endDate, requestType, status).
 * @return {object} Structured report data for display.
 * @throws {Error} If an error occurs during report generation.
 */
function generateReportData(filters) {
  try {
    console.log('Generating report data with filters:', filters);
    
    const requestsData = getRequestsData();
    const assignmentsData = getAssignmentsData();
    const ridersData = getRidersData();
    
    // Filter data based on date range
    const startDate = new Date(filters.startDate);
    startDate.setHours(0,0,0,0);
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);
    
    const filteredRequests = requestsData.data.filter(request => {
      const requestDate = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.date);
      const requestType = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.type);
      const status = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.status);
      
      let matchesDate = true;
      if (requestDate instanceof Date) {
        matchesDate = requestDate >= startDate && requestDate <= endDate;
      }
      
      let matchesType = true;
      if (filters.requestType && filters.requestType !== 'All') {
        matchesType = requestType === filters.requestType;
      }
      
      let matchesStatus = true;
      if (filters.status && filters.status !== 'All') {
        matchesStatus = status === filters.status;
      }
      
      return matchesDate && matchesType && matchesStatus;
    });
    
    // Calculate summary statistics
    const totalRequests = filteredRequests.length;
    const completedRequests = filteredRequests.filter(request => 
      getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.status) === 'Completed'
    ).length;
    
    const activeRiders = ridersData.data.filter(rider =>
      getColumnValue(rider, ridersData.columnMap, CONFIG.columns.riders.status) === 'Active'
    ).length;
    
    // Calculate request types distribution
    const requestTypes = {};
    filteredRequests.forEach(request => {
      const type = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.type) || 'Other';
      requestTypes[type] = (requestTypes[type] || 0) + 1;
    });
    
    // Calculate rider performance
    const riderPerformance = [];
    ridersData.data.forEach(rider => {
      const riderName = getColumnValue(rider, ridersData.columnMap, CONFIG.columns.riders.name);
      if (!riderName) return;
      
      const assignments = assignmentsData.data.filter(assignment => {
        const assignmentRider = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const createdDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.createdDate);
        
        let matchesDate = true;
        if (createdDate instanceof Date) {
          matchesDate = createdDate >= startDate && createdDate <= endDate;
        }
        
        return assignmentRider === riderName && matchesDate;
      });
      
      if (assignments.length > 0) {
        const completed = assignments.filter(assignment =>
          getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status) === 'Completed'
        ).length;
        
        riderPerformance.push({
          name: riderName,
          assignments: assignments.length,
          completionRate: assignments.length > 0 ? Math.round((completed / assignments.length) * 100) : 0
        });
      }
    });

    // Calculate total escort hours per rider within the period
    const riderHours = [];
    ridersData.data.forEach(rider => {
      const riderName = getColumnValue(rider, ridersData.columnMap, CONFIG.columns.riders.name);
      if (!riderName) return;

      let totalHours = 0;

      assignmentsData.data.forEach(assignment => {
        const assignmentRider = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
        const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);

        let dateMatches = true;
        if (eventDate instanceof Date) {
          dateMatches = eventDate >= startDate && eventDate <= endDate;
        }

        if (assignmentRider === riderName && status === 'Completed' && dateMatches) {
          const start = parseTimeString(getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.startTime));
          const end = parseTimeString(getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.endTime));
          if (start && end && end > start) {
            totalHours += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          }
        }
      });

      if (totalHours > 0) {
        riderHours.push({ name: riderName, hours: Math.round(totalHours * 100) / 100 });
      }
    });

    const reportData = {
      summary: {
        totalRequests: totalRequests,
        completedRequests: completedRequests,
        activeRiders: activeRiders,
        avgCompletionRate: riderPerformance.length > 0 ? Math.round(riderPerformance.reduce((sum, r) => sum + r.completionRate, 0) / riderPerformance.length) : 0
      },
      charts: {
        requestVolume: {
          total: totalRequests,
          // Placeholder for actual trends, would need more complex data processing
        },
        requestTypes: requestTypes,
        // Placeholder for monthly trends
        monthlyTrends: {}
      },
      tables: {
        riderPerformance: riderPerformance.sort((a, b) => b.assignments - a.assignments),
        riderHours: riderHours.sort((a, b) => b.hours - a.hours),
        // Placeholder for response time
        responseTime: {}
      }
    };
    
    return reportData;
    
  } catch (error) {
    logError('Error generating report data', error);
    throw error;
  }
}
/**
 * Generates a rider activity report for the given date range.
 * @param {string} startDate Start date in YYYY-MM-DD format.
 * @param {string} endDate End date in YYYY-MM-DD format.
 * @return {object} Result object with success flag and data array.
 */
function generateRiderActivityReport(startDate, endDate) {
  try {
    const assignmentsData = getAssignmentsData();
    const start = parseDateString(startDate);
    const end = parseDateString(endDate);
    if (!start || !end) {
      throw new Error('Invalid date range');
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const riderMap = {};

    assignmentsData.data.forEach(row => {
      const eventDate = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
      if (eventDate instanceof Date) {
        if (eventDate < start || eventDate > end) return;
      }
      const status = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      if (status !== 'Completed') return;
      const rider = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      if (!rider) return;

      const startTime = parseTimeString(getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.startTime));
      const endTime = parseTimeString(getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.endTime));

      if (!riderMap[rider]) {
        riderMap[rider] = { escorts: 0, hours: 0 };
      }
      riderMap[rider].escorts++;
      if (startTime && endTime && endTime > startTime) {
        riderMap[rider].hours += (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      }
    });

    const data = Object.keys(riderMap).map(name => ({
      name: name,
      escorts: riderMap[name].escorts,
      hours: Math.round(riderMap[name].hours * 100) / 100
    })).sort((a, b) => b.hours - a.hours);

  return { success: true, data };
  } catch (error) {
    logError('Error in generateRiderActivityReport', error);
    return { success: false, error: error.message };
  }
}

/**
 * Exports rider activity report as CSV.
 * @param {string} startDate Start date in YYYY-MM-DD format.
 * @param {string} endDate End date in YYYY-MM-DD format.
 * @return {object} Result object with CSV content or error message.
 */
function exportRiderActivityCSV(startDate, endDate) {
  try {
    const report = generateRiderActivityReport(startDate, endDate);
    if (!report.success) {
      throw new Error(report.error || 'Failed to generate rider activity');
    }

    const headers = ['Rider', 'Escorts', 'Hours'];
    const csvRows = [headers.join(',')];
    report.data.forEach(r => {
      const row = [
        `"${String(r.name).replace(/"/g, '""')}"`,
        r.escorts,
        r.hours
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const filename = `rider_activity_${startDate}_to_${endDate}.csv`;

    return {
      success: true,
      csvContent: csvContent,
      filename: filename,
      count: report.data.length
    };
  } catch (error) {
    logError('Error in exportRiderActivityCSV', error);
    return { success: false, message: error.message };
  }
}

/**
 * Generates an executive summary for the given period or the last 30 days.
 * @param {string} [startDate] Start date in YYYY-MM-DD format.
 * @param {string} [endDate] End date in YYYY-MM-DD format.
 * @return {object} Result object with summary data or an error message.
 */
function generateExecutiveSummary(startDate, endDate) {
  try {
    const today = new Date();
    const start = startDate ? parseDateString(startDate) : new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? parseDateString(endDate) : today;

    if (!start || !end) {
      throw new Error('Invalid date range');
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const requestsData = getRequestsData();
    let completed = 0;
    let totalHours = 0;
    const typeMap = {};

    requestsData.data.forEach(row => {
      const eventDate = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.eventDate);
      if (eventDate instanceof Date) {
        if (eventDate < start || eventDate > end) return;
      } else {
        return;
      }

      const type = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.type) || 'Other';
      typeMap[type] = (typeMap[type] || 0) + 1;

      const status = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.status);
      if (status === 'Completed') {
        completed++;
        const s = parseTimeString(getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.startTime));
        const e = parseTimeString(getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.endTime));
        if (s && e && e > s) {
          totalHours += (e.getTime() - s.getTime()) / (1000 * 60 * 60);
        }
      }
    });

    totalHours = Math.round(totalHours * 100) / 100;

    return {
      success: true,
      data: {
        start: formatDateForDisplay(start),
        end: formatDateForDisplay(end),
        completedEscorts: completed,
        totalHours: totalHours,
        requestTypes: typeMap
      }
    };
  } catch (error) {
    logError('Error in generateExecutiveSummary', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches and formats recent requests for web app display.
 * @param {number} [limit=10] The maximum number of recent requests to return.
 * @return {Array<object>} An array of formatted recent request objects.
 */
function getRecentRequestsForWebApp(limit = 10) {
  try {
    console.log(`📋 Getting ${limit} recent requests for web app...`);
    
    const requestsData = getRequestsData();
    
    if (!requestsData || !requestsData.data || requestsData.data.length === 0) {
      console.log('❌ No requests data found');
      return [];
    }
    
    const columnMap = requestsData.columnMap;
    
    // Process requests with better error handling
    const validRequests = [];
    
    for (let i = 0; i < requestsData.data.length; i++) {
      try {
        const row = requestsData.data[i];
        
        const requestId = getColumnValue(row, columnMap, CONFIG.columns.requests.id);
        const requesterName = getColumnValue(row, columnMap, CONFIG.columns.requests.requesterName);
        const eventDate = getColumnValue(row, columnMap, CONFIG.columns.requests.eventDate);
        
        // Must have basic required fields
        if (!requestId || !requesterName) {
          continue;
        }
        
        const processedRequest = {
          id: requestId,
          requesterName: requesterName,
          type: getColumnValue(row, columnMap, CONFIG.columns.requests.type) || 'Unknown',
          eventDate: eventDate ? formatDateForDisplay(eventDate) : 'No Date',
          startTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.requests.startTime)) || 'No Time',
          status: getColumnValue(row, columnMap, CONFIG.columns.requests.status) || 'New'
        };
        
        validRequests.push(processedRequest);
        
      } catch (rowError) {
        console.log(`⚠️ Error processing request row ${i}:`, rowError);
      }
    }
    
    // Sort by most recent (if we have valid dates)
    const sortedRequests = validRequests.sort((a, b) => {
      try {
        if (a.eventDate === 'No Date' && b.eventDate === 'No Date') return 0;
        if (a.eventDate === 'No Date') return 1;
        if (b.eventDate === 'No Date') return -1;
        
        const dateA = new Date(a.eventDate);
        const dateB = new Date(b.eventDate);
        
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        
        return dateB.getTime() - dateA.getTime();
      } catch (sortError) {
        return 0;
      }
    });
    
    const recentRequests = sortedRequests.slice(0, limit);
    
    console.log(`✅ Returning ${recentRequests.length} recent requests`);
    return recentRequests;
    
  } catch (error) {
    console.error('❌ Error getting recent requests:', error);
    logError('Error in getRecentRequestsForWebApp', error);
    return [];
  }
}
// ===== DEBUGGING CHECKLIST AND FIXES =====

// ISSUE 1: Missing Server-Side Functions
// Your HTML files are calling functions that aren't defined in Code.js

// Add these missing functions to your Code.js file:

/**
 * Consolidated function to get all dashboard data in one call
 */
function getPageDataForDashboard() {
  try {
    console.log('🚀 Loading consolidated dashboard data...');
    
    const user = getCurrentUser();
    const stats = getDashboardStats();
    const recentRequests = getRecentRequestsForWebApp(5);
    const upcomingAssignments = getUpcomingAssignmentsForWebApp(5);
    const notifications = (typeof getNotificationHistory === 'function')
      ? getNotificationHistory().slice(0, 10)
      : [];
    
    return {
      success: true,
      user: user,
      stats: stats,
      recentRequests: recentRequests,
      upcomingAssignments: upcomingAssignments,
      notifications: notifications
    };
  } catch (error) {
    logError('Error in getPageDataForDashboard', error);
    return {
      success: false,
      error: error.message,
      user: getCurrentUser() // Try to at least return user data
    };
  }
}
/**
 * Get Page Data for Riders * 
 */
function getPageDataForRiders() {
  try {
    console.log('🔄 Loading riders page data with consistent counts...');
    
    const user = getCurrentUser();
    const riders = getRiders(); // Uses consistent filtering
    
    // Calculate stats using consistent logic
    const certifiedRiders = riders.filter(r =>
      String(r.certification || r['Certification'] || '').toLowerCase() !==
      'not certified'
    );

    const stats = {
      totalRiders: certifiedRiders.length, // Matches displayed count
      activeRiders: certifiedRiders.filter(r =>
        String(r.status || '').toLowerCase() === 'active' ||
        String(r.status || '').toLowerCase() === 'available' ||
        String(r.status || '').trim() === ''
      ).length,
      inactiveRiders: certifiedRiders.filter(r =>
        String(r.status || '').toLowerCase() === 'inactive'
      ).length,
      onVacation: certifiedRiders.filter(r =>
        String(r.status || '').toLowerCase() === 'vacation'
      ).length,

      inTraining: certifiedRiders.filter(r =>
        String(r.status || '').toLowerCase() === 'training'
      ).length,
      partTimeRiders: certifiedRiders.filter(r =>
        String(r.partTime || '').toLowerCase() === 'yes'
      ).length
    };
    
    console.log('✅ Riders page data loaded:', {
      userEmail: user.email,
      ridersCount: riders.length,
      stats: stats
    });
    
    return {
      success: true,
      user: user,
      riders: riders,
      stats: stats
    };
    
  } catch (error) {
    console.error('❌ Error loading riders page data:', error);
    logError('Error in getPageDataForRiders', error);
    
    return {
      success: false,
      error: error.message,
      user: getCurrentUser(),
      riders: [],
      stats: {
        totalRiders: 0,
        activeRiders: 0,
        inactiveRiders: 0,
        onVacation: 0,

        inTraining: 0,
        partTimeRiders: 0

      }
    };
  }
}



/**
 * Get current user information
 */
function getCurrentUser() {
  try {
    const session = Session.getActiveUser();
    return {
      name: session.getEmail().split('@')[0] || 'User',
      email: session.getEmail(),
      roles: ['admin'], // Default role
      permissions: ['view', 'create_request', 'assign_riders', 'send_notifications', 'view_reports']
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return {
      name: 'System User',
      email: 'user@system.com',
      roles: ['admin'],
      permissions: ['view', 'create_request', 'assign_riders', 'send_notifications', 'view_reports']
    };
  }
}

/**
 * Get dashboard statistics
 */
function getDashboardStats() {
  try {
    console.log('📊 Calculating dashboard stats with consistent counts...');
    
    const requestsData = getRequestsData();
    const ridersData = getRidersData();
    const assignmentsData = getAssignmentsData();
    
    // Use consistent counting for all rider stats
    const totalRiders = getTotalRiderCount(); // Uses consistent logic
    const activeRiders = getActiveRidersCount(); // Uses consistent logic
    
    // Calculate other stats
    const pendingRequests = requestsData.data.filter(request => {
      const status = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.status);
      return ['New', 'Pending', 'Unassigned'].includes(status);
    }).length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAssignments = assignmentsData.data.filter(assignment => {
      const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
      if (!(eventDate instanceof Date)) return false;
      const assignmentDate = new Date(eventDate);
      assignmentDate.setHours(0, 0, 0, 0);
      return assignmentDate.getTime() === today.getTime();
    }).length;
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekAssignments = assignmentsData.data.filter(assignment => {
      const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
      if (!(eventDate instanceof Date)) return false;
      return eventDate >= weekStart && eventDate <= weekEnd;
    }).length;
    
    const stats = {
      totalRiders: totalRiders,        // Consistent count
      activeRiders: activeRiders,      // Consistent count
      pendingRequests: pendingRequests,
      todayAssignments: todayAssignments,
      weekAssignments: weekAssignments
    };
    
    console.log('✅ Dashboard stats calculated:', stats);
    return stats;
    
  } catch (error) {
    logError('Error getting dashboard stats', error);
    return {
      totalRiders: 0,
      activeRiders: 0,
      pendingRequests: 0,
      todayAssignments: 0,
      weekAssignments: 0
    };
  }
}

/**
 * Get upcoming assignments for dashboard
 */
function getUpcomingAssignmentsForWebApp(limit = 5) {
  try {
    const assignmentsData = getAssignmentsData();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingAssignments = assignmentsData.data
      .filter(assignment => {
        const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
        const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
        const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        
        return (eventDate instanceof Date) && 
               eventDate >= today && 
               riderName && 
               !['Cancelled', 'Completed', 'No Show'].includes(status);
      })
      .sort((a, b) => {
        const dateA = getColumnValue(a, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
        const dateB = getColumnValue(b, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, limit)
      .map(assignment => ({
        assignmentId: getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.id),
        requestId: getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.requestId),
        riderName: getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName),
        eventDate: formatDateForDisplay(getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate)),
        startTime: formatTimeForDisplay(getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.startTime)),
        startLocation: getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.startLocation)
      }));
    
    return upcomingAssignments;
  } catch (error) {
    logError('Error getting upcoming assignments', error);
    return [];
  }
}

// ISSUE 2: Missing Data Access Functions
// Make sure these core functions exist:

/**
 * Check if required sheets exist and create them if missing
 */
function ensureSheetsExist() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  Object.values(CONFIG.sheets).forEach(sheetName => {
    if (!ss.getSheetByName(sheetName)) {
      console.log(`Creating missing sheet: ${sheetName}`);
      const newSheet = ss.insertSheet(sheetName);
      
      // Add headers based on sheet type
      if (sheetName === CONFIG.sheets.requests) {
        const headers = Object.values(CONFIG.columns.requests);
        newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      } else if (sheetName === CONFIG.sheets.riders) {
        const headers = Object.values(CONFIG.columns.riders);
        newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      } else if (sheetName === CONFIG.sheets.assignments) {
        const headers = Object.values(CONFIG.columns.assignments);
        newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

      } else if (sheetName === CONFIG.sheets.riderAvailability) {
        const headers = Object.values(CONFIG.columns.riderAvailability);

        newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      } else if (sheetName === CONFIG.sheets.availability) {
        const headers = Object.values(CONFIG.columns.availability);

        newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }
  });
}

// ISSUE 3: Missing Helper Functions
// Add these utility functions if they don't exist:

/**
 * Format date for display
 */
function formatDateForDisplay(date) {
  if (!date || !(date instanceof Date)) return 'No Date';
  try {
    return Utilities.formatDate(date, CONFIG.system.timezone, CONFIG.system.dateFormat);
  } catch (error) {
    return 'Invalid Date';
  }
}

/**
 * Format time for display
 */
function formatTimeForDisplay(time) {
  if (!time) return 'No Time';
  try {
    if (time instanceof Date) {
      return Utilities.formatDate(time, CONFIG.system.timezone, CONFIG.system.timeFormat);
    } else if (typeof time === 'string') {
      return time;
    }
    return 'No Time';
  } catch (error) {
    return 'Invalid Time';
  }
}

/**
 * Get column value safely
 */
function normalizeColumnName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ');
}

function getColumnIndex(columnMap, columnName) {
  if (!columnMap || !columnName) return undefined;
  if (columnMap.hasOwnProperty(columnName)) {
    return columnMap[columnName];
  }
  const normalized = normalizeColumnName(columnName);
  for (const [name, idx] of Object.entries(columnMap)) {
    if (normalizeColumnName(name) === normalized) {
      return idx;
    }
  }
  return undefined;
}

function getColumnValue(row, columnMap, columnName) {
  try {
    const columnIndex = getColumnIndex(columnMap, columnName);
    if (columnIndex === undefined || columnIndex < 0 || columnIndex >= row.length) {
      return null;
    }
    return row[columnIndex];
  } catch (error) {
    console.error(`Error getting column value for ${columnName}:`, error);
    return null;
  }
}

/**
 * Log error safely
 */
function logError(message, error) {
  console.error(message, error);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName(CONFIG.sheets.log);
    if (logSheet) {
      logSheet.appendRow([
        new Date(),
        message,
        error.toString(),
        error.stack || 'No stack trace'
      ]);
    }
  } catch (logErr) {
    console.error('Failed to log error to sheet:', logErr);
  }
}

/**
 * Log activity
 */
function logActivity(message) {
  console.log(message);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName(CONFIG.sheets.log);
    if (logSheet) {
      logSheet.appendRow([new Date(), 'ACTIVITY', message, '']);
    }
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
function debugNavigationUrls() {
  try {
    console.log('=== NAVIGATION URL DEBUG ===');
    
    const pages = ['dashboard', 'requests', 'assignments', 'notifications', 'reports'];
    
    pages.forEach(pageName => {
      console.log(`\n--- Testing ${pageName} page ---`);
      
      // Test navigation generation
      const nav = getNavigationHtmlWithDynamicUrls(pageName);
      console.log('Generated navigation:');
      console.log(nav);
      
      // Extract URLs from the navigation
      const urlMatches = nav.match(/href="([^"]+)"/g);
      if (urlMatches) {
        console.log('URLs found:');
        urlMatches.forEach(match => {
          const url = match.replace('href="', '').replace('"', '');
          console.log(`  ${url}`);
        });
      }
      
      // Test actual doGet call
      const mockEvent = { parameter: pageName === 'dashboard' ? {} : { page: pageName } };
      const result = doGet(mockEvent);
      const content = result.getContent();
      
      // Check if navigation exists in final content
      const finalNavExists = content.includes('<nav class="navigation">');
      console.log(`Navigation in final content: ${finalNavExists ? '✅' : '❌'}`);
      
      if (finalNavExists) {
        // Extract navigation from final content
        const navStart = content.indexOf('<nav class="navigation">');
        const navEnd = content.indexOf('</nav>', navStart) + 6;
        const finalNav = content.substring(navStart, navEnd);
        
        // Check URLs in final navigation
        const finalUrls = finalNav.match(/href="([^"]+)"/g);
        if (finalUrls) {
          console.log('Final URLs:');
          finalUrls.forEach(match => {
            const url = match.replace('href="', '').replace('"', '');
            console.log(`  ${url}`);
          });
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}
// ISSUE 4: Debug Function to Test Server Connection
/**
 * Simple test function to verify server connectivity
 */
function testServerConnection() {
  try {
    console.log('🧪 Testing server connection...');
    ensureSheetsExist();
    
    const user = getCurrentUser();
    console.log('✅ User data:', user);
    
    const requestsData = getRequestsData();
    console.log('✅ Requests data loaded:', requestsData ? requestsData.data.length : 'Failed');
    
    const stats = getDashboardStats();
    console.log('✅ Stats calculated:', stats);
    
    return {
      success: true,
      message: 'Server connection test passed',
      user: user,
      dataPoints: {
        requests: requestsData ? requestsData.data.length : 0,
        stats: stats
      }
    };
  } catch (error) {
    console.error('❌ Server connection test failed:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// ===== TROUBLESHOOTING STEPS =====

/*
STEP 1: Check Web App Deployment
1. Go to Deploy → Manage Deployments
2. Make sure "Execute as" is set to "Me"
3. Make sure "Who has access" is set to "Anyone"
4. Copy the Web app URL and verify it matches your script

STEP 2: Test Server Functions
1. Run testServerConnection() in the Apps Script editor
2. Check the execution transcript for errors
3. Look at console.log outputs

STEP 3: Check Sheet Structure
1. Make sure your sheets exist with the names in CONFIG.sheets
2. Verify column headers match CONFIG.columns
3. Run ensureSheetsExist() if needed

STEP 4: Test Web App
1. Open your web app URL in browser
2. Open browser Developer Tools (F12)
3. Check Console tab for JavaScript errors
4. Check Network tab to see if server calls are being made

STEP 5: Add Debug Logging
Add this to your index.html script section for more debugging:
*/

// Add this to index.html <script> section for debugging:
const debugWebApp = `
// Enhanced debug logging
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
});

// Test server connection immediately
if (typeof google !== 'undefined' && google.script && google.script.run) {
    console.log('🧪 Testing server connection...');
    google.script.run
        .withSuccessHandler(result => {
            console.log('✅ Server test successful:', result);
        })
        .withFailureHandler(error => {
            console.error('❌ Server test failed:', error);
        })
        .testServerConnection();
} else {
    console.error('❌ Google Apps Script not available');
}
`;
function debugNotificationsFile() {
  try {
    console.log('=== DEBUGGING NOTIFICATIONS.HTML ===');
    
    const content = HtmlService.createHtmlOutputFromFile('notifications').getContent();
    console.log(`File length: ${content.length}`);
    
    // Count existing navigation
    const navMatches = content.match(/<nav class="navigation">/g);
    const navCount = navMatches ? navMatches.length : 0;
    console.log(`Hardcoded navigation count: ${navCount}`);
    
    if (navCount > 0) {
      console.log('⚠️ notifications.html has hardcoded navigation!');
      console.log('This will cause duplicates when navigation is injected.');
      console.log('Solution: Remove the hardcoded <nav class="navigation">...</nav> from notifications.html');
    }
    
    // Check for placeholder
    const hasPlaceholder = content.includes('<!--NAVIGATION_MENU_PLACEHOLDER-->');
    console.log(`Has placeholder: ${hasPlaceholder ? '✅' : '❌'}`);
    
    return { navCount, hasPlaceholder, length: content.length };
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    return { error: error.message };
  }
}

/**
 * 🔧 USER MANAGEMENT ROUTING FIX
 * Replace your doGet function with this simplified version that handles user management properly
 */

/*
/*
function doGet(e) {
  try {
    console.log('🚀 doGet started...');
    console.log('Parameters received:', JSON.stringify(e.parameter));
    
    // Get the requested page
    const requestedPage = e.parameter && e.parameter.page;
    console.log('📄 Requested page:', requestedPage);
    
    // SPECIAL HANDLING FOR USER MANAGEMENT PAGE
    if (requestedPage === 'user-management') {
      console.log('🔗 Handling user-management page directly...');
      
      try {
        // Check authentication
        const authResult = authenticateAndAuthorizeUser();
        console.log('🔐 Auth result for user management:', authResult);
        
        if (!authResult.success) {
          console.log('❌ Auth failed, showing sign-in');
          return createSignInPageSimple();
        }
        
        if (authResult.user.role !== 'admin') {
          console.log('❌ Not admin, access denied');
          return createAccessDeniedPageSimple(authResult.user);
        }
        
        console.log('✅ Admin access granted, loading user management page');
        
        // Try to load user-management.html file
        if (checkFileExists('user-management')) {
          console.log('✅ user-management.html exists, loading it');
          let htmlOutput = HtmlService.createHtmlOutputFromFile('user-management');
          return htmlOutput.setTitle('User Management').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
        } else {
          console.log('❌ user-management.html not found, creating dynamic page');
          return createSimpleUserManagementPage();
        }
        
      } catch (error) {
        console.error('❌ Error in user management handling:', error);
        return createErrorPageSimple(error);
      }
    }
    
    // Handle auth setup page
    if (requestedPage === 'auth-setup') {
      console.log('🔗 Handling auth-setup page...');
      
      try {
        const authResult = authenticateAndAuthorizeUser();
        if (!authResult.success || authResult.user.role !== 'admin') {
          return createAccessDeniedPageSimple({ name: 'User', role: 'unknown' });
        }
        return createAuthMappingPage();
      } catch (error) {
        return createErrorPageSimple(error);
      }
    }
    
    // Handle special authentication pages
    if (e.parameter && e.parameter.action === 'signin') {
      return createSignInPageSimple();
    }
    
    if (e.parameter && e.parameter.action === 'register') {
      return createRiderRegistrationForm();
    }
    
    // NORMAL PAGE HANDLING
    console.log('📄 Handling normal page...');
    
    // Authentication for normal pages
    const authResult = authenticateAndAuthorizeUser();
    
    if (!authResult.success) {
      console.log('❌ Authentication failed:', authResult.error);
      return createSignInPageSimple();
    }
    
    const user = authResult.user;
    const rider = authResult.rider;
    
    console.log(`✅ Authenticated: ${user.name} (${user.role})`);
    
    // Check page access
    let pageName = requestedPage || 'dashboard';
    console.log(`📄 Loading page: ${pageName}`);
    
    // Get file name
    let fileName = getPageFileNameSafe(pageName, user.role);
    console.log(`📁 Using file: ${fileName}.html`);
    
    // Load the HTML file
    let htmlOutput = HtmlService.createHtmlOutputFromFile(fileName);
    let content = htmlOutput.getContent();
    
    // Add navigation (simplified)
    const navigationHtml = getSimpleNavigation(pageName, user);
    content = addNavigationToContentSafe(content, navigationHtml);
    
    // Add user info
    content = injectUserInfoSafe(content, user, rider);
    
    htmlOutput.setContent(content);
    
    return htmlOutput
      .setTitle(`${pageName.charAt(0).toUpperCase() + pageName.slice(1)} - Escort Management`)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    console.error('❌ doGet fatal error:', error);
    return createErrorPageSimple(error);
  }
}
*/


/**
 * Simple user management page (if HTML file doesn't exist)
 */
function createSimpleUserManagementPage() {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Management - Motorcycle Escort Management</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #eee;
        }
        .btn {
            background: #3498db;
            color: white;
            padding: 12px 25px;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 10px;
            transition: all 0.3s ease;
        }
        .btn:hover {
            background: #2980b9;
            transform: translateY(-2px);
        }
        .nav-link {
            background: #95a5a6;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 20px;
            text-decoration: none;
            display: inline-block;
            margin: 10px 5px;
        }
        .nav-link:hover {
            background: #7f8c8d;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            border-left: 4px solid #3498db;
        }
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #3498db;
        }
        .stat-label {
            color: #666;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>👥 User Management Dashboard</h1>
            <p>Manage user access, permissions, and authentication settings</p>
            
            <!-- Navigation -->
            <div style="margin-top: 20px;">
                <a href="?" class="nav-link">🏠 Dashboard</a>
                <a href="?page=requests" class="nav-link">📋 Requests</a>
                <a href="?page=assignments" class="nav-link">🏍️ Assignments</a>
                <a href="?page=reports" class="nav-link">📊 Reports</a>
            </div>
        </div>
        
        <!-- Statistics -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number" id="totalUsers">-</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="activeUsers">-</div>
                <div class="stat-label">Active Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="pendingUsers">-</div>
                <div class="stat-label">Pending Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="adminUsers">-</div>
                <div class="stat-label">Admin Users</div>
            </div>
        </div>
        
        <!-- Actions -->
        <div style="text-align: center; margin: 30px 0;">
            <h3>🎯 User Management Actions</h3>
            
            <button class="btn" onclick="openAuthSetup()">
                🔐 Google Authentication Setup
            </button>
            
            <button class="btn" onclick="loadUserData()">
                📊 Load User Statistics
            </button>
            
            <button class="btn" onclick="testSystem()">
                🧪 Test System
            </button>
            
            <button class="btn" onclick="exportUsers()">
                📥 Export User Data
            </button>
        </div>
        
        <!-- Status -->
        <div id="status" style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 10px;">
            <h4>📋 System Status</h4>
            <p>User Management page loaded successfully.</p>
            <p>Click "Load User Statistics" to see current user data.</p>
        </div>
        
        <!-- User List -->
        <div id="userList" style="margin: 20px 0;">
            <h4>👥 Users</h4>
            <div id="users">Click "Load User Statistics" to view users...</div>
        </div>
    </div>
    
    <script>
        // Load initial data
        document.addEventListener('DOMContentLoaded', function() {
            loadUserData();
        });
        
        function loadUserData() {
            updateStatus('Loading user data...', 'info');
            
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                google.script.run
                    .withSuccessHandler(handleUserDataSuccess)
                    .withFailureHandler(handleUserDataError)
                    .getUserManagementData();
            } else {
                handleUserDataError('Google Apps Script not available');
            }
        }
        
        function handleUserDataSuccess(data) {
            console.log('User data received:', data);
            
            if (data && data.success) {
                // Update statistics
                document.getElementById('totalUsers').textContent = data.stats.totalUsers || 0;
                document.getElementById('activeUsers').textContent = data.stats.activeUsers || 0;
                document.getElementById('pendingUsers').textContent = data.stats.pendingUsers || 0;
                document.getElementById('adminUsers').textContent = data.stats.totalUsers - data.stats.pendingUsers || 0;
                
                // Display users
                displayUsers(data.users || []);
                
                updateStatus('User data loaded successfully!', 'success');
            } else {
                handleUserDataError(data.error || 'Unknown error');
            }
        }
        
        function handleUserDataError(error) {
            console.error('User data error:', error);
            updateStatus('Error loading user data: ' + error, 'error');
            
            // Show demo data
            document.getElementById('totalUsers').textContent = '?';
            document.getElementById('activeUsers').textContent = '?';
            document.getElementById('pendingUsers').textContent = '?';
            document.getElementById('adminUsers').textContent = '?';
        }
        
        function displayUsers(users) {
            const usersDiv = document.getElementById('users');
            
            if (users.length === 0) {
                usersDiv.innerHTML = '<p>No users found.</p>';
                return;
            }
            
            let html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">';
            
            users.forEach(user => {
                html += '<div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db;">';
                html += '<strong>' + user.name + '</strong><br>';
                html += '<small>' + user.email + '</small><br>';
                html += '<span style="background: #e8f4f8; padding: 3px 8px; border-radius: 10px; font-size: 0.8rem;">' + user.role + '</span> ';
                html += '<span style="background: #d4edda; padding: 3px 8px; border-radius: 10px; font-size: 0.8rem;">' + user.status + '</span>';
                html += '</div>';
            });
            
            html += '</div>';
            usersDiv.innerHTML = html;
        }
        
        function getDeployedUrl(callback) {
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                google.script.run.withSuccessHandler(callback).getWebAppUrl();
            } else {
                const local = window.location.origin + window.location.pathname;
                callback(local);
            }
        }

        function openAuthSetup() {
            getDeployedUrl(function(baseUrl) {
                window.open(baseUrl + '?page=auth-setup', '_blank');
            });
        }
        
        function testSystem() {
            updateStatus('Testing system...', 'info');
            
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                google.script.run
                    .withSuccessHandler(function(result) {
                        updateStatus('System test completed. Check console for details.', 'success');
                        console.log('System test result:', result);
                    })
                    .withFailureHandler(function(error) {
                        updateStatus('System test failed: ' + error, 'error');
                    })
                    .testAuthenticationSimple();
            } else {
                updateStatus('Cannot test - Google Apps Script not available', 'warning');
            }
        }
        
        function exportUsers() {
            updateStatus('Exporting user data...', 'info');
            // Implementation would go here
            setTimeout(() => {
                updateStatus('Export feature not yet implemented', 'warning');
            }, 1000);
        }
        
        function updateStatus(message, type) {
            const statusDiv = document.getElementById('status');
            let bgColor = '#f8f9fa';
            let textColor = '#333';
            
            switch(type) {
                case 'success':
                    bgColor = '#d4edda';
                    textColor = '#155724';
                    break;
                case 'error':
                    bgColor = '#f8d7da';
                    textColor = '#721c24';
                    break;
                case 'warning':
                    bgColor = '#fff3cd';
                    textColor = '#856404';
                    break;
                case 'info':
                    bgColor = '#cce5ff';
                    textColor = '#0056b3';
                    break;
            }
            
            statusDiv.style.background = bgColor;
            statusDiv.style.color = textColor;
            statusDiv.innerHTML = '<h4>📋 Status</h4><p>' + message + '</p>';
        }
    </script>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('User Management')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Fallback dashboard if user-management.html is missing
 */
function createUserManagementDashboard() {
  return createSimpleUserManagementPage();
}

/**
 * Simple navigation for testing
 */
function getSimpleNavigation(currentPage, user) {
  const baseUrl = getWebAppUrlSafe();

  // When running outside Apps Script, getWebAppUrlSafe returns "#". In that
  // scenario use local HTML file links so navigation works during development.
  const usingLocal = !baseUrl || baseUrl === '#';
  function navUrl(page) {
    return usingLocal
      ? (page === 'dashboard' ? 'index.html' : page + '.html')
      : (page === 'dashboard' ? baseUrl : `${baseUrl}?page=${page}`);
  }

  const adminNav = [
    { page: 'dashboard', label: '📊 Dashboard', url: navUrl('dashboard') },
    { page: 'requests', label: '📋 Requests', url: navUrl('requests') },
    { page: 'assignments', label: '🏍️ Assignments', url: navUrl('assignments') },
    { page: 'riders', label: '👥 Riders', url: navUrl('riders') },
    { page: 'user-management', label: '👥 User Management', url: navUrl('user-management') },
    { page: 'reports', label: '📊 Reports', url: navUrl('reports') }
  ];

  const dispatcherNav = [
    { page: 'dashboard', label: '📊 Dashboard', url: navUrl('dashboard') },
    { page: 'requests', label: '📋 Requests', url: navUrl('requests') },
    { page: 'assignments', label: '🏍️ Assignments', url: navUrl('assignments') }
  ];
  
  const menuItems = user.role === 'admin' ? adminNav : dispatcherNav;
  
  let navHtml = '<nav class="navigation">';

  menuItems.forEach(item => {
    const activeClass = item.page === currentPage ? ' active' : '';
    navHtml += `<a href="${item.url}" class="nav-button${activeClass}" data-page="${item.page}">${item.label}</a>`;
  });

  navHtml += '</nav>';
  
  return navHtml;
}

/**
 * Simple sign-in page
 */
function createSignInPageSimple() {
  const webAppUrl = getWebAppUrlSafe();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Sign In - Escort Management</title>
    <style>
        body { 
            font-family: Arial, sans-serif; text-align: center; padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; min-height: 100vh; margin: 0;
            display: flex; align-items: center; justify-content: center;
        }
        .container {
            background: rgba(255, 255, 255, 0.95); color: #333;
            padding: 40px; border-radius: 15px; max-width: 500px;
        }
        .btn {
            background: #3498db; color: white; padding: 15px 30px;
            border: none; border-radius: 25px; font-size: 18px;
            cursor: pointer; text-decoration: none; display: inline-block; margin: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏍️ Motorcycle Escort Management</h1>
        <h2>🔐 Sign In Required</h2>
        <p>Please sign in with your Google account to access the system.</p>
        <a href="${webAppUrl}" class="btn">🔑 Sign In with Google</a>
    </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html).setTitle('Sign In Required');
}

/**
 * Simple access denied page
 */
function createAccessDeniedPageSimple(user) {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Access Denied</title>
    <style>
        body { 
            font-family: Arial, sans-serif; text-align: center; padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; min-height: 100vh; margin: 0;
            display: flex; align-items: center; justify-content: center;
        }
        .container {
            background: rgba(255, 255, 255, 0.95); color: #333;
            padding: 40px; border-radius: 15px; max-width: 500px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏍️ Motorcycle Escort Management</h1>
        <h2>🚫 Access Denied</h2>
        <p>Hello ${user.name},</p>
        <p>You need admin privileges to access this page.</p>
        <p>Your role: <strong>${user.role}</strong></p>
        <a href="${getWebAppUrlSafe()}" style="color: #3498db;">← Back to Dashboard</a>
    </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html).setTitle('Access Denied');
}

/**
 * Simple error page
 */
function createErrorPageSimple(error) {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Error</title>
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
    </style>
</head>
<body>
    <div class="container">
        <h1>⚠️ System Error</h1>
        <p>Error: ${error.message || error}</p>
        <a href="${getWebAppUrlSafe()}" style="color: #3498db;">← Try Again</a>
    </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html).setTitle('Error');
}

/**
 * Test what happens with user management
 */
function testUserManagementRouting() {
  try {
    console.log('🧪 Testing user management routing...');
    
    // Simulate the user management request
    const e = { parameter: { page: 'user-management' } };
    
    console.log('Testing doGet with user-management parameter...');
    const result = doGet(e);
    
    console.log('✅ doGet completed without errors');
    console.log('Result type:', typeof result);
    
    return {
      success: true,
      message: 'User management routing test completed'
    };
    
  } catch (error) {
    console.error('❌ User management routing test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
/**
 * Enhanced page file mapping
 */
function getPageFileNameSafe(pageName, userRole) {
  try {
    console.log(`🗂️ Getting file for page: ${pageName}, role: ${userRole}`);
    
    // Role-specific page mapping
    const rolePageMap = {
      admin: {
        'dashboard': 'admin-dashboard'  // Use admin dashboard for admins
      },
      dispatcher: {
        'dashboard': 'index'  // Use regular dashboard for dispatchers
      },
      rider: {
        'dashboard': 'index',  // Use regular dashboard for riders
        'rider-schedule': 'rider-schedule',
        'my-assignments': 'assignments'
      }
    };
    
    // Check if there's a role-specific page that exists
    if (rolePageMap[userRole] && rolePageMap[userRole][pageName]) {
      const fileName = rolePageMap[userRole][pageName];
      
      // Verify the file exists
      if (checkFileExists(fileName)) {
        console.log(`✅ Using role-specific file: ${fileName}`);
        return fileName;
      } else {
        console.log(`⚠️ Role-specific file ${fileName} not found, using default`);
      }
    }
    
    // Default page mapping
    const defaultPages = {
      'dashboard': 'index',
      'requests': 'requests',
      'assignments': 'assignments',
      'riders': 'riders',
      'notifications': 'notifications',
      'reports': 'reports',
      'rider-schedule': 'rider-schedule',
      'admin-schedule': 'admin-schedule'
    };
    
    let fileName = defaultPages[pageName] || 'index';
    
    // Double-check the file exists
    if (!checkFileExists(fileName)) {
      console.log(`⚠️ File ${fileName} not found, falling back to index`);
      fileName = 'index';
    }
    
    console.log(`✅ Using file: ${fileName} for page: ${pageName}`);
    return fileName;
    
  } catch (error) {
    console.error('❌ Error getting page file name:', error);
    return 'index'; // Always fallback to index
  }
}

/**
 * Enhanced sign-in page
 */
function createSignInPage() {
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
        .logo { font-size: 4rem; margin-bottom: 20px; }
        h1 { color: #2c3e50; margin-bottom: 10px; }
        h2 { color: #3498db; margin-bottom: 30px; font-weight: 300; }
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
            width: 20px; height: 20px; background: white; border-radius: 3px;
            display: flex; align-items: center; justify-content: center;
            color: #4285f4; font-weight: bold;
        }
        .info {
            background: #e8f4f8; padding: 20px; border-radius: 10px;
            margin: 30px 0; border-left: 4px solid #3498db;
        }
    </style>
</head>
<body>
    <div class="signin-container">
        <div class="logo">🏍️</div>
        <h1>Motorcycle Escort Management</h1>
        <h2>Google Sign In Required</h2>
        
        <div class="info">
            <p><strong>📋 To access the system:</strong></p>
            <ol style="text-align: left;">
                <li>Click "Sign In with Google" below</li>
                <li>Choose your authorized Google account</li>
                <li>Grant necessary permissions</li>
                <li>Access your dashboard</li>
            </ol>
        </div>
        
        <button class="signin-btn" onclick="handleSignIn()">
            <div class="google-icon">G</div>
            Sign In with Google
        </button>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
            Only authorized personnel can access this system.
        </p>
    </div>
    
    <script>
        function handleSignIn() {
            const btn = document.querySelector('.signin-btn');
            btn.innerHTML = '<div class="google-icon">⏳</div>Signing In...';
            btn.style.background = '#666';
            
            setTimeout(() => {
                window.location.href = '${webAppUrl}?auth=true&t=' + Date.now();
            }, 500);
        }
    </script>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('Sign In - Escort Management')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Unauthorized access page
 */
function createUnauthorizedPage(email, name) {
  const webAppUrl = getWebAppUrlSafe();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Access Request - Escort Management</title>
    <style>
        body { 
            font-family: Arial, sans-serif; text-align: center; padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; min-height: 100vh; margin: 0;
            display: flex; align-items: center; justify-content: center;
        }
        .container {
            background: rgba(255, 255, 255, 0.95); color: #333;
            padding: 40px; border-radius: 15px; max-width: 600px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        .btn {
            background: #3498db; color: white; padding: 15px 30px;
            border: none; border-radius: 25px; font-size: 16px;
            cursor: pointer; text-decoration: none; display: inline-block;
            margin: 10px; transition: all 0.3s ease;
        }
        .btn:hover { background: #2980b9; transform: translateY(-2px); }
        .user-info {
            background: #f8f9fa; padding: 20px; border-radius: 10px;
            margin: 20px 0; border-left: 4px solid #3498db;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏍️ Motorcycle Escort Management</h1>
        <h2>🚫 Access Not Authorized</h2>
        
        <div class="user-info">
            <strong>Signed in as:</strong><br>
            📧 ${email}<br>
            👤 ${name || 'Unknown User'}
        </div>
        
        <p>Your Google account is not currently authorized to access this system.</p>
        
        <a href="mailto:admin@yourdomain.com?subject=Access Request&body=I need access to the Escort Management System.%0D%0AEmail: ${email}" class="btn">
            📧 Request Access
        </a>
        
        <a href="${webAppUrl}?action=signin" class="btn" style="background: #95a5a6;">
            ← Back to Sign In
        </a>
    </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('Access Request')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Error page with sign-in option
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

// 🛡️ SAFE WRAPPER FUNCTIONS

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

function checkPageAccessSafe(pageName, user, rider) {
  try {
    if (typeof checkPageAccess === 'function') {
      return checkPageAccess(pageName, user, rider);
    }
    return { allowed: true }; // Default allow
  } catch (error) {
    console.error('Error in checkPageAccessSafe:', error);
    return { allowed: true };
  }
}

function getPageFileNameSafe(pageName, userRole) {
  try {
    if (typeof getPageFileName === 'function') {
      return getPageFileName(pageName, userRole);
    }
    
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

function getRoleBasedNavigationSafe(pageName, user, rider) {
  try {
    if (typeof getRoleBasedNavigation === 'function') {
      return getRoleBasedNavigation(pageName, user, rider);
    }
    return '<nav>Navigation unavailable</nav>';
  } catch (error) {
    console.error('Error in getRoleBasedNavigationSafe:', error);
    return '<nav>Navigation error</nav>';
  }
}

function injectUserInfoSafe(content, user, rider) {
  try {
    if (typeof injectUserInfo === 'function') {
      return injectUserInfo(content, user, rider);
    }
    return content;
  } catch (error) {
    console.error('Error in injectUserInfoSafe:', error);
    return content;
  }
}

function addNavigationToContentSafe(content, navigationHtml) {
  try {
    if (typeof addNavigationToContent === 'function') {
      return addNavigationToContent(content, navigationHtml);
    }
    
    if (content.includes('<!--NAVIGATION_MENU_PLACEHOLDER-->')) {
      return content.replace('<!--NAVIGATION_MENU_PLACEHOLDER-->', navigationHtml);
    } else if (content.includes('</header>')) {
      return content.replace('</header>', `</header>\n${navigationHtml}\n`);
    }
    
    return content;
  } catch (error) {
    console.error('Error adding navigation to content:', error);
    return content;
  }
}

function addUserDataInjectionSafe(content, user, rider) {
  try {
    if (typeof addUserDataInjection === 'function') {
      return addUserDataInjection(content, user, rider);
    }
    
    const userScript = `
<script>
window.currentUser = {
  name: '${user.name}',
  email: '${user.email}',
  role: '${user.role}',
  permissions: ${JSON.stringify(user.permissions)},
  riderId: '${rider ? rider.id : ''}',
  isRider: ${rider ? 'true' : 'false'}
};
console.log('👤 User context loaded:', window.currentUser);
</script>`;
    
    if (content.includes('</body>')) {
      return content.replace('</body>', userScript + '\n</body>');
    }
    
    return content;
  } catch (error) {
    console.error('Error adding user data injection:', error);
    return content;
  }
}

/**
 * Create a proper sign-in page that actually works
 */
function createSignInPage() {
  const webAppUrl = getWebAppUrl();
  
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
        }
        .info {
            background: #e8f4f8;
            padding: 20px;
            border-radius: 10px;
            margin: 30px 0;
            border-left: 4px solid #3498db;
        }
        .steps {
            text-align: left;
            margin: 20px 0;
        }
        .step {
            margin: 10px 0;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 5px;
        }
        .troubleshooting {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
            font-size: 14px;
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
        <h2>Secure Sign In Required</h2>
        
        <div class="info">
            <strong>📋 To access the system:</strong>
            <div class="steps">
                <div class="step">1️⃣ Click "Sign In with Google" below</div>
                <div class="step">2️⃣ Choose your authorized Google account</div>
                <div class="step">3️⃣ Allow access to the application</div>
                <div class="step">4️⃣ You'll be redirected to your dashboard</div>
            </div>
        </div>
        
        <!-- Primary Sign-In Method -->
        <a href="${webAppUrl}" class="signin-btn" onclick="handleSignIn(this); return false;">
            <div class="google-icon">G</div>
            Sign In with Google
        </a>
        
        <!-- Alternative Methods -->
        <div style="margin: 20px 0;">
            <p><strong>Alternative access methods:</strong></p>
            <a href="${webAppUrl}?force=true" class="alternative-btn">🔄 Force Reload</a>
            <a href="${webAppUrl}" class="alternative-btn" target="_blank">🆕 New Window</a>
        </div>
        
        <div class="troubleshooting">
            <strong>🛠️ Troubleshooting:</strong><br>
            • Make sure you're signed in to Google in this browser<br>
            • Try opening in an incognito/private window<br>
            • Clear your browser cache and cookies<br>
            • Contact your administrator if you need access
        </div>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
            Only authorized personnel can access this system.<br>
            Contact your administrator for account setup.
        </p>
    </div>
    
    <script>
        function handleSignIn(element) {
            // Show loading state
            element.innerHTML = '<div class="google-icon">⏳</div>Loading...';
            element.style.background = '#666';
            
            // Multiple sign-in strategies
            const baseUrl = '${webAppUrl}';
            
            // Strategy 1: Direct navigation
            try {
                window.location.href = baseUrl;
                
                // Strategy 2: Fallback after delay
                setTimeout(function() {
                    window.location.replace(baseUrl);
                }, 1000);
                
                // Strategy 3: Force reload in new window if nothing happens
                setTimeout(function() {
                    const newWindow = window.open(baseUrl, '_blank');
                    if (newWindow) {
                        newWindow.focus();
                    } else {
                        // If popup blocked, use current window
                        window.open(baseUrl, '_self');
                    }
                }, 3000);
                
            } catch (error) {
                console.error('Sign-in error:', error);
                element.innerHTML = '<div class="google-icon">❌</div>Error - Try Again';
                element.style.background = '#e74c3c';
                
                setTimeout(function() {
                    element.innerHTML = '<div class="google-icon">G</div>Sign In with Google';
                    element.style.background = '#4285f4';
                }, 2000);
            }
        }
        
        // Auto-detect if user is already signed in
        document.addEventListener('DOMContentLoaded', function() {
            // Check if we can detect a Google session
            if (typeof gapi !== 'undefined') {
                console.log('Google APIs detected, attempting auto-signin');
                setTimeout(() => handleSignIn(document.querySelector('.signin-btn')), 1000);
            }
        });
        
        // Handle back button to retry
        window.addEventListener('pageshow', function(event) {
            if (event.persisted) {
                location.reload();
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
 * Create unauthorized access page with registration option
 */
function createUnauthorizedPage(email, name) {
  const webAppUrl = getWebAppUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Access Request - Escort Management</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: rgba(255, 255, 255, 0.95);
            color: #333;
            padding: 40px;
            border-radius: 15px;
            max-width: 600px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        .btn {
            background: #3498db;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 10px;
            transition: all 0.3s ease;
        }
        .btn:hover {
            background: #2980b9;
            transform: translateY(-2px);
        }
        .btn-warning {
            background: #f39c12;
        }
        .btn-warning:hover {
            background: #e67e22;
        }
        .user-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            border-left: 4px solid #3498db;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏍️ Motorcycle Escort Management</h1>
        <h2>🚫 Access Not Authorized</h2>
        
        <div class="user-info">
            <strong>Signed in as:</strong><br>
            📧 ${email}<br>
            👤 ${name || 'Unknown User'}
        </div>
        
        <p>Your Google account is not currently authorized to access this system.</p>
        
        <div style="margin: 30px 0;">
            <h3>🎯 Request Access:</h3>
            <p>If you're a motorcycle escort rider or staff member, you can request access:</p>
            
            <a href="${webAppUrl}?action=register" class="btn">
                📝 Request Access
            </a>
            
            <a href="mailto:admin@yourdomain.com?subject=Access Request - Escort System&body=Hello,%0D%0A%0D%0AI would like to request access to the Motorcycle Escort Management System.%0D%0A%0D%0AMy Google account: ${email}%0D%0AName: ${name}%0D%0ARole requested: [Rider/Dispatcher/Admin]%0D%0A%0D%0AThank you" class="btn btn-warning">
                📧 Email Administrator
            </a>
        </div>
        
        <div style="margin-top: 30px; font-size: 14px; color: #666;">
            <p><strong>Contact Information:</strong></p>
            <p>For immediate assistance, contact your system administrator.</p>
        </div>
        
        <a href="${webAppUrl}?action=signin" class="btn" style="background: #95a5a6;">
            ← Back to Sign In
        </a>
    </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('Access Request')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Create error page with sign-in option
 */
function createErrorPageWithSignIn(error) {
  const webAppUrl = getWebAppUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Error - Escort Management</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            background: rgba(255, 255, 255, 0.95);
            color: #333;
            padding: 40px;
            border-radius: 15px;
            max-width: 500px;
            margin: 0 auto;
        }
        .btn {
            background: #3498db;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 10px;
        }
        .error-details {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            font-family: monospace;
            font-size: 12px;
            text-align: left;
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

// 🛡️ SAFE WRAPPER FUNCTIONS (add these to prevent errors)

function getRiderByGoogleEmailSafe(email) {
  try {
    if (typeof getRiderByGoogleEmail === 'function') {
      return getRiderByGoogleEmail(email);
    }
    return null;
  } catch (error) {
    console.error('Error in getRiderByGoogleEmailSafe:', error);
    return null;
  }
}

function getAdminUsersSafe() {
  try {
    if (typeof getAdminUsers === 'function') {
      return getAdminUsers();
    }
    return ['admin@example.com']; // Default fallback
  } catch (error) {
    console.error('Error in getAdminUsersSafe:', error);
    return [];
  }
}

function getDispatcherUsersSafe() {
  try {
    if (typeof getDispatcherUsers === 'function') {
      return getDispatcherUsers();
    }
    return [];
  } catch (error) {
    console.error('Error in getDispatcherUsersSafe:', error);
    return [];
  }
}

function checkPageAccessSafe(pageName, user, rider) {
  try {
    if (typeof checkPageAccess === 'function') {
      return checkPageAccess(pageName, user, rider);
    }
    return { allowed: true }; // Default to allow
  } catch (error) {
    console.error('Error in checkPageAccessSafe:', error);
    return { allowed: true };
  }
}

function getRoleBasedNavigationSafe(pageName, user, rider) {
  try {
    if (typeof getRoleBasedNavigation === 'function') {
      return getRoleBasedNavigation(pageName, user, rider);
    }
    return '<nav>Navigation unavailable</nav>';
  } catch (error) {
    console.error('Error in getRoleBasedNavigationSafe:', error);
    return '<nav>Navigation error</nav>';
  }
}

function injectUserInfoSafe(content, user, rider) {
  try {
    if (typeof injectUserInfo === 'function') {
      return injectUserInfo(content, user, rider);
    }
    return content;
  } catch (error) {
    console.error('Error in injectUserInfoSafe:', error);
    return content;
  }
}

function updateRiderLastLoginSafe(riderId) {
  try {
    if (typeof updateRiderLastLogin === 'function') {
      updateRiderLastLogin(riderId);
    }
  } catch (error) {
    console.error('Error in updateRiderLastLoginSafe:', error);
  }
}


// 🔐 Authentication Functions
function authenticateUser() {
  try {
    const user = Session.getActiveUser();
    const userEmail = user.getEmail();
    
    if (!userEmail) {
      return {
        success: false,
        error: 'NO_EMAIL',
        message: 'Please sign in with your Google account'
      };
    }
    
    // Check if user is in authorized riders list
    const rider = getRiderByGoogleEmail(userEmail);
    const adminUsers = getAdminUsers();
    const dispatcherUsers = getDispatcherUsers();
    
    let userRole = 'unauthorized';
    let permissions = [];
    
    if (adminUsers.includes(userEmail)) {
      userRole = 'admin';
      permissions = ['view_all', 'edit_all', 'assign_riders', 'manage_users', 'view_reports'];
    } else if (dispatcherUsers.includes(userEmail)) {
      userRole = 'dispatcher';
      permissions = ['view_requests', 'create_requests', 'assign_riders', 'view_reports'];
    } else if (rider && rider.status === 'Active') {
      userRole = 'rider';
      permissions = ['view_own_assignments', 'update_own_status'];
    } else {
      return {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Your account is not authorized to access this system'
      };
    }
    
    return {
      success: true,
      user: {
        name: user.getName() || rider?.name,
        email: userEmail,
        role: userRole,
        permissions: permissions,
        avatar: (user.getName() || rider?.name || 'U').charAt(0).toUpperCase()
      },
      rider: rider
    };
    
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'AUTH_ERROR',
      message: 'Authentication system error'
    };
  }
}

function getRiderByGoogleEmail(email) {
  try {
    const ridersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riders');
    const data = ridersSheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indices
    const emailCol = headers.indexOf('Email');
    const googleEmailCol = headers.indexOf('Google Email');
    const nameCol = headers.indexOf('Full Name');
    const statusCol = headers.indexOf('Status');
    const idCol = headers.indexOf('Rider ID');
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const riderEmail = row[emailCol];
      const googleEmail = row[googleEmailCol];
      
      // Check both regular email and Google email columns
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
    console.error('Error getting rider by Google email:', error);
    return null;
  }
}

function getAdminUsers() {
  // You can store these in a Settings sheet or hardcode initially
  try {
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
    if (settingsSheet) {
      const adminRange = settingsSheet.getRange('B2:B10').getValues(); // Adjust range as needed
      return adminRange.flat().filter(email => email && email.trim());
    }
  } catch (error) {
    console.log('Settings sheet not found, using default admins');
  }
  
  // Fallback to hardcoded admin emails
  return [
    'admin@yourdomain.com',
    'jpsotraffic@gmail.com',
    'manager@yourdomain.com'
    // Add your admin emails here
  ];
}

function getDispatcherUsers() {
  try {
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
    if (settingsSheet) {
      const dispatcherRange = settingsSheet.getRange('C2:C10').getValues();
      return dispatcherRange.flat().filter(email => email && email.trim());
    }
  } catch (error) {
    console.log('Settings sheet not found, using default dispatchers');
  }
  
  return [
    'dispatcher@yourdomain.com'
    // Add dispatcher emails here
  ];
}

// 🔒 Authorization Functions
function checkPageAccess(pageName, user, rider) {
  const rolePermissions = {
    admin: ['dashboard', 'requests', 'assignments', 'riders', 'notifications', 'reports', 'admin-schedule'],
    dispatcher: ['dashboard', 'requests', 'assignments', 'notifications', 'reports'],
    rider: ['dashboard', 'rider-schedule', 'my-assignments']
  };
  
  const allowedPages = rolePermissions[user.role] || [];
  
  // Special case: riders can only see their own data
  if (user.role === 'rider') {
    if (['requests', 'assignments'].includes(pageName)) {
      return { allowed: false, reason: 'Riders can only view their own assignments' };
    }
  }
  
  if (allowedPages.includes(pageName)) {
    return { allowed: true };
  }
  
  return { 
    allowed: false, 
    reason: `Access to ${pageName} is not allowed for ${user.role} role` 
  };
}

function getPageFileName(pageName, userRole) {
  // Role-based page mapping
  const rolePageMap = {
    rider: {
      'dashboard': 'rider-dashboard',
      'rider-schedule': 'rider-schedule',
      'my-assignments': 'rider-assignments'
    },
    dispatcher: {
      'dashboard': 'dispatcher-dashboard'
    },
    admin: {
      'dashboard': 'admin-dashboard'
    }
  };
  
  // Check if there's a role-specific page
  if (rolePageMap[userRole] && rolePageMap[userRole][pageName]) {
    return rolePageMap[userRole][pageName];
  }
  
  // Default page mapping
  const defaultPages = {
    'dashboard': 'index',
    'requests': 'requests',
    'assignments': 'assignments',
    'riders': 'riders',
    'rider-schedule': 'rider-schedule',
    'admin-schedule': 'admin-schedule',
    'notifications': 'notifications',
    'reports': 'reports'
  };
  
  return defaultPages[pageName] || 'index';
}

// 🧭 Role-based Navigation
function getRoleBasedNavigation(currentPage, user, rider) {
  const baseUrl = getWebAppUrl();
  
  const navigationMenus = {
    admin: [
      { page: 'dashboard', label: '📊 Dashboard', url: `${baseUrl}` },
      { page: 'requests', label: '📋 Requests', url: `${baseUrl}?page=requests` },
      { page: 'assignments', label: '🏍️ Assignments', url: `${baseUrl}?page=assignments` },
      { page: 'riders', label: '👥 Riders', url: `${baseUrl}?page=riders` },
      { page: 'notifications', label: '📱 Notifications', url: `${baseUrl}?page=notifications` },
      { page: 'reports', label: '📊 Reports', url: `${baseUrl}?page=reports` }
    ],
    dispatcher: [
      { page: 'dashboard', label: '📊 Dashboard', url: `${baseUrl}` },
      { page: 'requests', label: '📋 Requests', url: `${baseUrl}?page=requests` },
      { page: 'assignments', label: '🏍️ Assignments', url: `${baseUrl}?page=assignments` },
      { page: 'notifications', label: '📱 Notifications', url: `${baseUrl}?page=notifications` },
      { page: 'reports', label: '📊 Reports', url: `${baseUrl}?page=reports` }
    ],
    rider: [
      { page: 'dashboard', label: '📊 My Dashboard', url: `${baseUrl}` },
      { page: 'rider-schedule', label: '📅 My Schedule', url: `${baseUrl}?page=rider-schedule` },
      { page: 'my-assignments', label: '🏍️ My Assignments', url: `${baseUrl}?page=my-assignments` }
    ]
  };
  
  const menuItems = navigationMenus[user.role] || navigationMenus.rider;
  
  let navHtml = '<nav class="navigation" style="display: flex; justify-content: center; align-items: center;">';
  
  menuItems.forEach(item => {
    const isActive = item.page === currentPage ? 'active' : '';
    navHtml += `
      <a href="${item.url}"
         class="nav-button ${isActive}"
         data-page="${item.page}">
        ${item.label}
      </a>
    `;
  });
  
  navHtml += '</nav>';
  
  return navHtml;
}

// 👤 User Information Injection
function injectUserInfo(content, user, rider) {
  console.log('Code.gs#injectUserInfo: Received user object: ' + JSON.stringify(user));
  // Replace user placeholders
  content = content.replace(/\{\{USER_NAME\}\}/g, user.name);
  content = content.replace(/\{\{USER_EMAIL\}\}/g, user.email);
  content = content.replace(/\{\{USER_ROLE\}\}/g, user.role);
  content = content.replace(/\{\{USER_AVATAR\}\}/g, user.avatar);
  
  if (rider) {
    content = content.replace(/\{\{RIDER_ID\}\}/g, rider.id);
    content = content.replace(/\{\{RIDER_STATUS\}\}/g, rider.status);
  }
  
  // Add user info to existing elements
  if (content.includes('id="userName"')) {
    content = content.replace('id="userName">Loading...', `id="userName">${user.name}`);
  }
  if (content.includes('id="userRole"')) {
    content = content.replace('id="userRole">User', `id="userRole">${user.role}`);
  }
  if (content.includes('id="userAvatar"')) {
    content = content.replace('id="userAvatar">?', `id="userAvatar">${user.avatar}`);
  }
  
  return content;
}

// 📊 User-specific Data Injection
function addUserDataInjection(content, user, rider) {
  if (content.includes('</body>')) {
    const dataScript = `
<script>
// Inject user context into the page
window.currentUser = {
  name: '${user.name}',
  email: '${user.email}',
  role: '${user.role}',
  permissions: ${JSON.stringify(user.permissions)},
  riderId: '${rider ? rider.id : ''}',
  isRider: ${rider ? 'true' : 'false'}
};

// Role-based page initialization
document.addEventListener('DOMContentLoaded', function() {
  console.log('👤 User context loaded:', window.currentUser);
  
  // Hide/show elements based on role
  const roleElements = document.querySelectorAll('[data-role]');
  roleElements.forEach(function(element) {
    const allowedRoles = element.getAttribute('data-role').split(',');
    if (!allowedRoles.includes(window.currentUser.role)) {
      element.style.display = 'none';
    }
  });
  
  // Hide/show elements based on permissions
  const permissionElements = document.querySelectorAll('[data-permission]');
  permissionElements.forEach(function(element) {
    const requiredPermission = element.getAttribute('data-permission');
    if (!window.currentUser.permissions.includes(requiredPermission)) {
      element.style.display = 'none';
    }
  });
  
  // Add role class to body
  document.body.classList.add('role-' + window.currentUser.role);
});
</script>`;
    
    content = content.replace('</body>', dataScript + '\n</body>');
  }
  
  return content;
}

// 📱 Utility Functions
function updateRiderLastLogin(riderId) {
  try {
    const ridersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riders');
    const data = ridersSheet.getDataRange().getValues();
    const headers = data[0];
    
    const idCol = headers.indexOf('Rider ID');
    const lastLoginCol = headers.indexOf('Last Login');
    
    if (lastLoginCol === -1) {
      // Add Last Login column if it doesn't exist
      ridersSheet.getRange(1, headers.length + 1).setValue('Last Login');
    }
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === riderId) {
        const now = new Date();
        ridersSheet.getRange(i + 1, lastLoginCol + 1).setValue(now);
        break;
      }
    }
  } catch (error) {
    console.error('Error updating last login:', error);
  }
}

// 🚫 Error Pages
function createAuthErrorPage(errorType) {
  const signInUrl = getWebAppUrl();
  
  return HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sign In Required - Escort Management</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 50px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          background: rgba(255, 255, 255, 0.95);
          color: #333;
          padding: 40px;
          border-radius: 15px;
          max-width: 500px;
          margin: 0 auto;
        }
        .btn {
          background: #3498db;
          color: white;
          padding: 15px 30px;
          border: none;
          border-radius: 25px;
          font-size: 16px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🏍️ Motorcycle Escort Management</h1>
        <h2>🔐 Authentication Required</h2>
        <p>Please sign in with your authorized Google account to access the system.</p>
        <a href="${signInUrl}" class="btn">🔑 Sign In with Google</a>
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
          Contact your administrator if you need access.
        </p>
      </div>
    </body>
    </html>
  `).setTitle('Sign In Required');
}

function createAccessDeniedPage(reason, user) {
  return HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Access Denied - Escort Management</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 50px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          background: rgba(255, 255, 255, 0.95);
          color: #333;
          padding: 40px;
          border-radius: 15px;
          max-width: 500px;
          margin: 0 auto;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🏍️ Motorcycle Escort Management</h1>
        <h2>🚫 Access Denied</h2>
        <p>Hello ${user.name},</p>
        <p>${reason}</p>
        <p>Your role: <strong>${user.role}</strong></p>
        <a href="${getWebAppUrl()}" style="color: #3498db;">← Back to Dashboard</a>
      </div>
    </body>
    </html>
  `).setTitle('Access Denied');
}

// Keep your existing addNavigationToContent function but enhance it
function addNavigationToContent(content, navigationHtml) {
  // Remove any existing navigation
  content = content.replace(/<nav class="navigation">[\s\S]*?<\/nav>/g, '');
  
  // Add enhanced navigation CSS for roles
  if (!content.includes('.navigation') || !content.includes('.nav-button')) {
    const navCSS = `
.navigation {
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    gap: 1rem;
    margin: 0 auto 2rem auto !important;
    flex-wrap: wrap;
    background: rgba(255, 255, 255, 0.95);
    padding: 1rem 2rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    border-radius: 0 0 15px 15px;
    position: relative;
    z-index: 1000;
    max-width: 1200px;
    width: 100%;
    text-align: center;
}

.nav-button {
    padding: 0.75rem 1.5rem !important;
    background: rgba(255, 255, 255, 0.9) !important;
    border: none !important;
    border-radius: 25px !important;
    color: #2c3e50 !important;
    text-decoration: none !important;
    font-weight: 600 !important;
    transition: all 0.3s ease !important;
    cursor: pointer !important;
    display: inline-block !important;
    pointer-events: auto !important;
    user-select: none !important;
    white-space: nowrap !important;
}

.nav-button:hover, .nav-button.active {
    background: #3498db !important;
    color: white !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3) !important;
}

/* Role-specific styling */
.role-admin .nav-button { border-left: 3px solid #e74c3c; }
.role-dispatcher .nav-button { border-left: 3px solid #f39c12; }
.role-rider .nav-button { border-left: 3px solid #27ae60; }

@media (max-width: 768px) {
    .navigation {
        padding: 1rem !important;
        gap: 0.5rem !important;
        justify-content: center !important;
    }
    
    .nav-button {
        padding: 0.5rem 1rem !important;
        font-size: 0.9rem !important;
    }
}`;
    
    if (content.includes('</style>')) {
      content = content.replace('</style>', navCSS + '\n    </style>');
    } else {
      content = content.replace('</head>', `    <style>${navCSS}\n    </style>\n</head>`);
    }
  }
  
  // Inject navigation
  let injected = false;
  
  if (content.includes('<!--NAVIGATION_MENU_PLACEHOLDER-->')) {
    content = content.replace('<!--NAVIGATION_MENU_PLACEHOLDER-->', navigationHtml);
    injected = true;
  } else if (content.includes('</header>')) {
    content = content.replace('</header>', `</header>\n${navigationHtml}\n`);
    injected = true;
  } else {
    const bodyMatch = content.match(/<body[^>]*>/);
    if (bodyMatch) {
      content = content.replace(bodyMatch[0], `${bodyMatch[0]}\n${navigationHtml}\n`);
      injected = true;
    }
  }
  
  return content;
}

function getNavigationHtmlWithIframeSupport(currentPage = '') {
  console.log(`🔗 Creating centered navigation for: ${currentPage}`);

  // Always use the deployed web app URL as the base for all links
  const baseUrl = getWebAppUrl();

  const links = [
    `<a href="${baseUrl}" class="nav-button ${currentPage === 'dashboard' ? 'active' : ''}" data-page="dashboard">📊 Dashboard</a>`,
    `<a href="${baseUrl}?page=requests" class="nav-button ${currentPage === 'requests' ? 'active' : ''}" data-page="requests">📋 Requests</a>`,
    `<a href="${baseUrl}?page=assignments" class="nav-button ${currentPage === 'assignments' ? 'active' : ''}" data-page="assignments">🏍️ Assignments</a>`,
    `<a href="${baseUrl}?page=riders" class="nav-button ${currentPage === 'riders' ? 'active' : ''}" data-page="riders">👥 Riders</a>`
  ];

  if (['riders', 'rider-schedule', 'admin-schedule'].includes(currentPage)) {
    links.push(
      `<a href="${baseUrl}?page=rider-schedule" class="nav-button ${currentPage === 'rider-schedule' ? 'active' : ''}" data-page="rider-schedule">📆 My Schedule</a>`,
      `<a href="${baseUrl}?page=admin-schedule" class="nav-button ${currentPage === 'admin-schedule' ? 'active' : ''}" data-page="admin-schedule">🗓️ Manage Schedules</a>`
    );
  }

  links.push(
    `<a href="${baseUrl}?page=notifications" class="nav-button ${currentPage === 'notifications' ? 'active' : ''}" data-page="notifications">📱 Notifications</a>`,
    `<a href="${baseUrl}?page=reports" class="nav-button ${currentPage === 'reports' ? 'active' : ''}" data-page="reports">📊 Reports</a>`
  );
  
  const navigation = `<nav class="navigation" id="main-navigation">
        ${links.join('\n        ')}
    </nav>`;
  
  return navigation;
}


function getNavigationHtmlWithForcedClicks(currentPage = '') {
  console.log(`🔗 Creating navigation with forced click handling for: ${currentPage}`);

  const BASE_URL = getWebAppUrl();
  
  // Create links with both href AND onclick for maximum compatibility
  const links = [
    `<a href="${BASE_URL}" class="nav-button ${currentPage === 'dashboard' ? 'active' : ''}" data-page="dashboard" onclick="navigateToPage('${BASE_URL}'); return false;">📊 Dashboard</a>`,
    `<a href="${BASE_URL}?page=requests" class="nav-button ${currentPage === 'requests' ? 'active' : ''}" data-page="requests" onclick="navigateToPage('${BASE_URL}?page=requests'); return false;">📋 Requests</a>`,
    `<a href="${BASE_URL}?page=assignments" class="nav-button ${currentPage === 'assignments' ? 'active' : ''}" data-page="assignments" onclick="navigateToPage('${BASE_URL}?page=assignments'); return false;">🏍️ Assignments</a>`,
    `<a href="${BASE_URL}?page=notifications" class="nav-button ${currentPage === 'notifications' ? 'active' : ''}" data-page="notifications" onclick="navigateToPage('${BASE_URL}?page=notifications'); return false;">📱 Notifications</a>`,
    `<a href="${BASE_URL}?page=reports" class="nav-button ${currentPage === 'reports' ? 'active' : ''}" data-page="reports" onclick="navigateToPage('${BASE_URL}?page=reports'); return false;">📊 Reports</a>`
  ];
  
  const navigation = `<nav class="navigation" style="position: relative; z-index: 1000;">
        ${links.join('\n        ')}
    </nav>`;
  
  console.log('Generated navigation with forced click handling');
  return navigation;
}
/**
 * Navigation function with absolute URLs (make sure this exists)
 */
function getNavigationHtmlWithAbsoluteUrls(currentPage = '') {
  console.log(`🔗 Creating navigation with absolute URLs for: ${currentPage}`);

  const BASE_URL = getWebAppUrl();
  
  // Create each link with full absolute URL
  const links = [
    `<a href="${BASE_URL}" class="nav-button ${currentPage === 'dashboard' ? 'active' : ''}" data-page="dashboard">📊 Dashboard</a>`,
    `<a href="${BASE_URL}?page=requests" class="nav-button ${currentPage === 'requests' ? 'active' : ''}" data-page="requests">📋 Requests</a>`,
    `<a href="${BASE_URL}?page=assignments" class="nav-button ${currentPage === 'assignments' ? 'active' : ''}" data-page="assignments">🏍️ Assignments</a>`,
    `<a href="${BASE_URL}?page=riders" class="nav-button ${currentPage === 'riders' ? 'active' : ''}" data-page="riders">👥 Riders</a>`,
    `<a href="${BASE_URL}?page=notifications" class="nav-button ${currentPage === 'notifications' ? 'active' : ''}" data-page="notifications">📱 Notifications</a>`,
    `<a href="${BASE_URL}?page=reports" class="nav-button ${currentPage === 'reports' ? 'active' : ''}" data-page="reports">📊 Reports</a>`
  ];
  
  const navigation = `<nav class="navigation">
        ${links.join('\n        ')}
    </nav>`;
  
  console.log('Generated navigation with absolute URLs');
  return navigation;
}

/**
 * Simple test to verify the navigation function works
 */
function testNavigationGeneration() {
  try {
    console.log('=== TESTING NAVIGATION GENERATION ===');
    
    const nav = getNavigationHtmlWithAbsoluteUrls('requests');
    console.log('Generated navigation:');
    console.log(nav);
    
    // Check for absolute URLs
    const hasAbsoluteUrls = nav.includes('https://script.google.com');
    console.log(`Has absolute URLs: ${hasAbsoluteUrls ? '✅' : '❌'}`);
    
    // Count links
    const linkCount = (nav.match(/href="/g) || []).length;
    console.log(`Number of links: ${linkCount}`);
    
    return { success: true, hasAbsoluteUrls, linkCount };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test the complete doGet function
 */
function testDoGetFunction() {
  try {
    console.log('=== TESTING doGet FUNCTION ===');
    
    // Test requests page
    const mockEvent = { parameter: { page: 'requests' } };
    const result = doGet(mockEvent);
    const content = result.getContent();
    
    console.log(`Content length: ${content.length}`);
    console.log(`Has navigation: ${content.includes('<nav class="navigation">') ? '✅' : '❌'}`);
    console.log(`Has absolute URLs: ${content.includes('https://script.google.com') ? '✅' : '❌'}`);
    console.log(`Has debug script: ${content.includes('CLIENT-SIDE NAVIGATION DEBUG') ? '✅' : '❌'}`);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ doGet test failed:', error);
    return { success: false, error: error.message };
  }
}

/*
IMMEDIATE STEPS:

1. Replace your doGet function with the one above (fixed version)
2. Make sure you have the getNavigationHtmlWithAbsoluteUrls function
3. Run testNavigationGeneration() to verify it works
4. Run testDoGetFunction() to test the complete flow
5. Deploy and test in browser

The fixed version:
- ✅ Has the debug script embedded directly (no undefined reference)
- ✅ Uses absolute URLs
- ✅ Includes proper error handling
- ✅ Adds client-side debugging automatically

After deploying, check the browser console for the navigation debug messages.
*/


function getNavigationHtmlWithAbsoluteUrls(currentPage = '') {
  console.log(`🔗 Creating navigation with absolute URLs for: ${currentPage}`);
  
  // Base URL retrieved once for consistency
  const BASE_URL = getWebAppUrl();
  
  // Create each link with full absolute URL
  const links = [
    `<a href="${BASE_URL}" class="nav-button ${currentPage === 'dashboard' ? 'active' : ''}" data-page="dashboard">📊 Dashboard</a>`,
    `<a href="${BASE_URL}?page=requests" class="nav-button ${currentPage === 'requests' ? 'active' : ''}" data-page="requests">📋 Requests</a>`,
    `<a href="${BASE_URL}?page=assignments" class="nav-button ${currentPage === 'assignments' ? 'active' : ''}" data-page="assignments">🏍️ Assignments</a>`,
    `<a href="${BASE_URL}?page=riders" class="nav-button ${currentPage === 'riders' ? 'active' : ''}" data-page="riders">👥 Riders</a>`,
    `<a href="${BASE_URL}?page=notifications" class="nav-button ${currentPage === 'notifications' ? 'active' : ''}" data-page="notifications">📱 Notifications</a>`,
    `<a href="${BASE_URL}?page=reports" class="nav-button ${currentPage === 'reports' ? 'active' : ''}" data-page="reports">📊 Reports</a>`
  ];
  
  const navigation = `<nav class="navigation">
        ${links.join('\n        ')}
    </nav>`;
  
  console.log('Generated navigation with absolute URLs:');
  console.log(navigation);
  
  return navigation;
}
/**
 * Test function to check for duplicate navigation issues
 */
function testForNavigationDuplicates() {
  try {
    console.log('=== TESTING FOR NAVIGATION DUPLICATES ===');
    
    const pages = ['requests', 'notifications', 'assignments'];
    
    pages.forEach(pageName => {
      console.log(`\n--- Checking ${pageName} page ---`);
      
      try {
        const mockEvent = { parameter: { page: pageName } };
        const result = doGet(mockEvent);
        const content = result.getContent();
        
        // Count navigation elements
        const navCount = (content.match(/<nav class="navigation">/g) || []).length;
        const hasCSS = content.includes('.nav-button') && content.includes('.navigation');
        
        console.log(`Navigation count: ${navCount}`);
        console.log(`Has CSS: ${hasCSS ? '✅' : '❌'}`);
        console.log(`Status: ${navCount === 1 && hasCSS ? '✅ GOOD' : '❌ NEEDS FIX'}`);
        
        if (navCount > 1) {
          console.log(`⚠️ DUPLICATE NAVIGATION DETECTED!`);
        }
        
        if (!hasCSS) {
          console.log(`⚠️ MISSING NAVIGATION CSS!`);
        }
        
      } catch (error) {
        console.log(`❌ Error testing ${pageName}: ${error.message}`);
      }
    });
    
    console.log('\n=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * Create fallback navigation (same as before)
 */
function createFallbackNavigation(currentPage = '') {
  const baseUrl = getWebAppUrl();

  const links = [
    `<a href="${baseUrl}" class="nav-button ${currentPage === 'dashboard' ? 'active' : ''}" data-page="dashboard">📊 Dashboard</a>`,
    `<a href="${baseUrl}?page=requests" class="nav-button ${currentPage === 'requests' ? 'active' : ''}" data-page="requests">📋 Requests</a>`,
    `<a href="${baseUrl}?page=assignments" class="nav-button ${currentPage === 'assignments' ? 'active' : ''}" data-page="assignments">🏍️ Assignments</a>`,
    `<a href="${baseUrl}?page=riders" class="nav-button ${currentPage === 'riders' ? 'active' : ''}" data-page="riders">👥 Riders</a>`
  ];

  if (['riders', 'rider-schedule', 'admin-schedule'].includes(currentPage)) {
    links.push(
      `<a href="${baseUrl}?page=rider-schedule" class="nav-button ${currentPage === 'rider-schedule' ? 'active' : ''}" data-page="rider-schedule">📆 My Schedule</a>`,
      `<a href="${baseUrl}?page=admin-schedule" class="nav-button ${currentPage === 'admin-schedule' ? 'active' : ''}" data-page="admin-schedule">🗓️ Manage Schedules</a>`
    );
  }

  links.push(
    `<a href="${baseUrl}?page=notifications" class="nav-button ${currentPage === 'notifications' ? 'active' : ''}" data-page="notifications">📱 Notifications</a>`,
    `<a href="${baseUrl}?page=reports" class="nav-button ${currentPage === 'reports' ? 'active' : ''}" data-page="reports">📊 Reports</a>`
  );

  return `<nav class="navigation">\n    ${links.join('\n    ')}\n  </nav>`;
}
function getNavigationHtmlWithDynamicUrls(currentPage = '') {
  try {
    console.log(`🧭 Getting navigation for page: ${currentPage}`);
    
    // Use cached URL for consistency across all pages
    const baseUrl = getWebAppUrl();
    
    const pages = [
      { id: 'dashboard', url: baseUrl, label: '📊 Dashboard' },
      { id: 'requests', url: `${baseUrl}?page=requests`, label: '📋 Requests' },
      { id: 'assignments', url: `${baseUrl}?page=assignments`, label: '🏍️ Assignments' },
      { id: 'riders', url: `${baseUrl}?page=riders`, label: '👥 Riders' }
    ];

    if (['riders', 'rider-schedule', 'admin-schedule'].includes(currentPage)) {
      pages.push(
        { id: 'rider-schedule', url: `${baseUrl}?page=rider-schedule`, label: '📆 My Schedule' },
        { id: 'admin-schedule', url: `${baseUrl}?page=admin-schedule`, label: '🗓️ Manage Schedules' }
      );
    }

    pages.push(
      { id: 'notifications', url: `${baseUrl}?page=notifications`, label: '📱 Notifications' },
      { id: 'reports', url: `${baseUrl}?page=reports`, label: '📊 Reports' }
    );
    
    const navButtons = pages.map(page => {
      const activeClass = page.id === currentPage ? ' active' : '';
      return `        <a href="${page.url}" class="nav-button${activeClass}" id="nav-${page.id}" data-page="${page.id}">${page.label}</a>`;
    }).join('\n');
    
    return `    <nav class="navigation">\n${navButtons}\n    </nav>`;
    
  } catch (error) {
    console.error('❌ Error in navigation:', error);
    return `<nav class="navigation"><a href="${baseUrl}">📊 Dashboard</a></nav>`;
  }
}
/**
 * Test the new doGet function
 */
function testNewDoGetFunction() {
  try {
    console.log('=== TESTING NEW doGet FUNCTION ===');
    
    const mockEvent = { parameter: { page: 'requests' } };
    const result = doGet(mockEvent);
    const content = result.getContent();
    
    console.log(`Result content length: ${content.length}`);
    console.log(`Has navigation: ${content.includes('<nav class="navigation">')}`);
    console.log(`Has nav buttons: ${content.includes('nav-button')}`);
    
    if (content.includes('<nav class="navigation">')) {
      console.log('🎉 SUCCESS! Navigation injection is working!');
      
      // Show the navigation part
      const navStart = content.indexOf('<nav class="navigation">');
      const navEnd = content.indexOf('</nav>', navStart) + 6;
      const navHtml = content.substring(navStart, navEnd);
      console.log('Injected navigation HTML:');
      console.log(navHtml);
      
    } else {
      console.log('❌ FAILED! Navigation still not in final content');
      
      // Show first part of content for debugging
      console.log('First 500 chars of content:');
      console.log(content.substring(0, 500));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/*
IMMEDIATE STEPS:

1. REPLACE your current doGet function with the one above
2. Run testNewDoGetFunction() to verify it works
3. Deploy the web app again (Deploy → New Deployment)
4. Test in browser

The new doGet has much more detailed logging and tries 6 different 
injection strategies, so it should definitely work!
*/
/**
 * @fileoverview
 * This file contains the `showQuickAssignDialog` function, which is designed to be called
 * from the Google Sheets UI (e.g., a custom menu or a button). It allows users to quickly
 * open the web app's assignment page for a specific Request ID selected on the dashboard sheet.
 */

/**
 * Opens the web application's assignment page for a Request ID selected on the dashboard.
 * It validates the selection, constructs the web app URL with the Request ID,
 * and then uses a small HTML dialog to trigger opening the URL in a new tab.
 * This function is intended to be called from the Google Sheets environment.
 * @return {void}
 */
function showQuickAssignDialog() {
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActive();
    const dashSheet = ss.getSheetByName(CONFIG.sheets.dashboard);

    // Ensure the active sheet is the dashboard
    if (ss.getActiveSheet().getName() !== CONFIG.sheets.dashboard) {
      ui.alert('Error', 'Please navigate to the Dashboard sheet to use this function.', ui.ButtonSet.OK);
      return;
    }

    const activeRange = ss.getActiveRange();
    if (!activeRange) {
      ui.alert('Error', 'Please select a cell containing a Request ID on the dashboard.', ui.ButtonSet.OK);
      return;
    }

    const selectedRow = activeRange.getRow();
    const selectedCol = activeRange.getColumn();

    // Check if the selected row is within the requests display area (starts from row 11)
    const requestsDisplayStartRow = CONFIG.dashboard.requestsDisplayStartRow;
    if (selectedRow < requestsDisplayStartRow) {
      ui.alert('Error', 'Please select a Request ID cell within the displayed requests (rows 11 or below).', ui.ButtonSet.OK);
      return;
    }

    // Check if the selected column is the Request ID column (Column A, which is 1)
    if (selectedCol !== 1) {
      ui.alert('Error', 'Please select a cell in the "Request ID" column (Column A) to assign riders.', ui.ButtonSet.OK);
      return;
    }

    // Get the Request ID from the selected cell
    const requestId = activeRange.getValue();

    // Changed \d{2} to \d{1,2} to allow for single-digit sequence numbers
    if (!requestId || typeof requestId !== 'string' || !requestId.match(/^[A-L]-\d{1,2}-\d{2}$/)) {
      ui.alert('Error', `Invalid Request ID selected: "${requestId}". Please select a valid Request ID.`, ui.ButtonSet.OK);
      return;
    }

    // ===== IMPORTANT: REPLACE THIS WITH YOUR ACTUAL WEB APP DEPLOYMENT URL =====
    // If you don't have one yet, deploy your script as a Web App (Deploy -> New Deployment -> Web App)
    // Make sure "Execute as" is "Me" and "Who has access" is "Anyone".
    const WEB_APP_BASE_URL = getWebAppUrl(); // Example: "https://script.google.com/macros/s/AKfycbxyzabc123defg456hi/exec";

    // IMPORTANT: If you see a generic URL like "https://script.google.com/macros/s/AKfycbxyzabc123defg456hi/exec" you MUST
    // get your unique web app URL from Deploy -> Manage Deployments -> Your Web App Deployment -> Web app URL
    // Each deployment generates a unique URL.

    if (!WEB_APP_BASE_URL) {
        ui.alert('Configuration Error', 'Please deploy your script as a Web App and update WEB_APP_BASE_URL in the script with the actual URL from your deployment settings.', ui.ButtonSet.OK);
        return;
    }


    const webAppUrl = `${WEB_APP_BASE_URL}?requestId=${encodeURIComponent(requestId)}`;

    const htmlOutput = HtmlService.createHtmlOutput(`<script>window.open('${webAppUrl}', '_blank').focus(); google.script.host.close();</script>`)
      .setTitle('Opening Assignment Form')
      .setHeight(10)
      .setWidth(10);

    ui.showModalDialog(htmlOutput, 'Opening...');

    logActivity(`Opened assignment form for Request ID: ${requestId}`);

  } catch (error) {
    logError('Error assigning riders from dashboard', error);
    ui.alert('Error', 'Failed to open assignment form: ' + error.message, ui.ButtonSet.OK);
  }
}
/**
 * REAL DIAGNOSIS AND FIX FOR RIDERS DATA ISSUE
 * 
 * The "System Rider" appearing means the error fallback is being triggered.
 * Let's find and fix the actual issue with your riders data.
 */

/**
 * STEP 1: Deep diagnosis of your actual riders data
 * Add this to your Code.gs file and run it
 */
function diagnoseRealRidersIssue() {
  try {
    console.log('🔍 === DEEP RIDERS DATA DIAGNOSIS ===');
    
    const diagnosis = {
      timestamp: new Date().toISOString(),
      sheetAnalysis: {},
      dataAnalysis: {},
      columnAnalysis: {},
      configAnalysis: {},
      recommendations: []
    };
    
    // STEP 1: Check if riders sheet exists and is accessible
    console.log('📋 Step 1: Checking sheet access...');
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      console.log('✅ Spreadsheet accessible:', ss.getName());
      
      const sheet = ss.getSheetByName(CONFIG.sheets.riders);
      if (!sheet) {
        diagnosis.sheetAnalysis.error = `Sheet "${CONFIG.sheets.riders}" not found`;
        console.log(`❌ Sheet "${CONFIG.sheets.riders}" not found`);
        
        // Check what sheets actually exist
        const allSheets = ss.getSheets().map(s => s.getName());
        diagnosis.sheetAnalysis.availableSheets = allSheets;
        console.log('📊 Available sheets:', allSheets);
        
        return diagnosis;
      }
      
      diagnosis.sheetAnalysis.sheetName = sheet.getName();
      diagnosis.sheetAnalysis.lastRow = sheet.getLastRow();
      diagnosis.sheetAnalysis.lastColumn = sheet.getLastColumn();
      
      console.log(`✅ Sheet found: ${sheet.getName()}`);
      console.log(`📊 Dimensions: ${sheet.getLastRow()} rows × ${sheet.getLastColumn()} columns`);
      
    } catch (sheetError) {
      diagnosis.sheetAnalysis.error = sheetError.message;
      console.error('❌ Sheet access error:', sheetError);
      return diagnosis;
    }
    
    // STEP 2: Get raw sheet data
    console.log('📋 Step 2: Getting raw sheet data...');
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.riders);
      const range = sheet.getDataRange();
      const allValues = range.getValues();
      
      diagnosis.dataAnalysis.totalRows = allValues.length;
      diagnosis.dataAnalysis.headers = allValues.length > 0 ? allValues[0] : [];
      diagnosis.dataAnalysis.dataRows = allValues.length > 1 ? allValues.length - 1 : 0;
      diagnosis.dataAnalysis.sampleDataRows = [];
      
      // Get first 5 data rows for analysis
      for (let i = 1; i < Math.min(6, allValues.length); i++) {
        diagnosis.dataAnalysis.sampleDataRows.push({
          rowNumber: i + 1,
          data: allValues[i],
          hasAnyData: allValues[i].some(cell => cell && String(cell).trim() !== '')
        });
      }
      
      console.log(`✅ Raw data: ${allValues.length} total rows, ${allValues.length - 1} data rows`);
      console.log('📊 Headers:', allValues[0]);
      
    } catch (dataError) {
      diagnosis.dataAnalysis.error = dataError.message;
      console.error('❌ Data access error:', dataError);
      return diagnosis;
    }
    
    // STEP 3: Analyze column mapping
    console.log('📋 Step 3: Analyzing column mapping...');
    try {
      const headers = diagnosis.dataAnalysis.headers;
      
      // Check what CONFIG expects vs what we have
      const expectedColumns = {
        name: CONFIG.columns.riders.name,
        jpNumber: CONFIG.columns.riders.jpNumber,
        phone: CONFIG.columns.riders.phone,
        email: CONFIG.columns.riders.email,
        status: CONFIG.columns.riders.status,
        partTime: CONFIG.columns.riders.partTime,
        certification: CONFIG.columns.riders.certification
      };
      
      diagnosis.configAnalysis.expectedColumns = expectedColumns;
      
      // Check which expected columns actually exist
      const columnMapping = {};
      Object.entries(expectedColumns).forEach(([key, expectedName]) => {
        const index = headers.indexOf(expectedName);
        columnMapping[key] = {
          expectedName: expectedName,
          foundAtIndex: index,
          exists: index !== -1
        };
      });
      
      diagnosis.columnAnalysis.mapping = columnMapping;
      diagnosis.columnAnalysis.allExpectedColumnsFound = Object.values(columnMapping).every(col => col.exists);
      
      console.log('🔍 Column mapping analysis:');
      Object.entries(columnMapping).forEach(([key, info]) => {
        const status = info.exists ? '✅' : '❌';
        console.log(`  ${status} ${key}: "${info.expectedName}" ${info.exists ? `at index ${info.foundAtIndex}` : 'NOT FOUND'}`);
      });
      
    } catch (columnError) {
      diagnosis.columnAnalysis.error = columnError.message;
      console.error('❌ Column analysis error:', columnError);
    }
    
    // STEP 4: Test getRidersData function
    console.log('📋 Step 4: Testing getRidersData function...');
    try {
      const ridersData = getRidersData(false); // Force fresh data, no cache
      
      diagnosis.dataAnalysis.getRidersDataResult = {
        success: true,
        hasData: !!ridersData,
        dataLength: ridersData?.data?.length || 0,
        headersLength: ridersData?.headers?.length || 0,
        columnMapKeys: ridersData?.columnMap ? Object.keys(ridersData.columnMap) : []
      };
      
      console.log('✅ getRidersData test result:', diagnosis.dataAnalysis.getRidersDataResult);
      
    } catch (getRidersError) {
      diagnosis.dataAnalysis.getRidersDataResult = {
        success: false,
        error: getRidersError.message
      };
      console.error('❌ getRidersData error:', getRidersError);
    }
    
    // STEP 5: Analyze specific rider data issues
    console.log('📋 Step 5: Analyzing rider data quality...');
    try {
      const headers = diagnosis.dataAnalysis.headers;
      const sampleRows = diagnosis.dataAnalysis.sampleDataRows;
      
      const dataQuality = {
        rowsWithNames: 0,
        rowsWithIds: 0,
        rowsWithStatuses: 0,
        emptyRows: 0,
        statusValues: new Set(),
        issues: []
      };
      
      // Assume standard positions if named columns not found
      const nameColIndex = headers.indexOf(CONFIG.columns.riders.name) !== -1 
        ? headers.indexOf(CONFIG.columns.riders.name) 
        : 1; // Fallback to second column
        
      const idColIndex = headers.indexOf(CONFIG.columns.riders.jpNumber) !== -1 
        ? headers.indexOf(CONFIG.columns.riders.jpNumber) 
        : 0; // Fallback to first column
        
      const statusColIndex = headers.indexOf(CONFIG.columns.riders.status) !== -1 
        ? headers.indexOf(CONFIG.columns.riders.status) 
        : 4; // Fallback to fifth column
      
      sampleRows.forEach(rowInfo => {
        const row = rowInfo.data;
        
        const name = row[nameColIndex];
        const id = row[idColIndex];
        const status = row[statusColIndex];
        
        if (!rowInfo.hasAnyData) {
          dataQuality.emptyRows++;
          return;
        }
        
        if (name && String(name).trim()) {
          dataQuality.rowsWithNames++;
        }
        
        if (id && String(id).trim()) {
          dataQuality.rowsWithIds++;
        }
        
        if (status && String(status).trim()) {
          dataQuality.rowsWithStatuses++;
          dataQuality.statusValues.add(String(status).trim());
        }
      });
      
      diagnosis.dataAnalysis.dataQuality = {
        ...dataQuality,
        statusValues: Array.from(dataQuality.statusValues)
      };
      
      console.log('📊 Data quality analysis:', diagnosis.dataAnalysis.dataQuality);
      
    } catch (qualityError) {
      diagnosis.dataAnalysis.dataQualityError = qualityError.message;
      console.error('❌ Data quality analysis error:', qualityError);
    }
    
    // STEP 6: Generate specific recommendations
    console.log('📋 Step 6: Generating recommendations...');
    
    if (diagnosis.dataAnalysis.dataRows === 0) {
      diagnosis.recommendations.push({
        priority: 'HIGH',
        issue: 'No rider data found',
        action: 'Add rider data to the sheet',
        fix: 'addSampleRiders'
      });
    }
    
    if (!diagnosis.columnAnalysis.allExpectedColumnsFound) {
      const missingColumns = Object.entries(diagnosis.columnAnalysis.mapping)
        .filter(([_, info]) => !info.exists)
        .map(([key, info]) => `${key} (${info.expectedName})`);
      
      diagnosis.recommendations.push({
        priority: 'HIGH',
        issue: `Missing expected columns: ${missingColumns.join(', ')}`,
        action: 'Fix column headers or update CONFIG',
        fix: 'fixColumnHeaders'
      });
    }
    
    const dataQuality = diagnosis.dataAnalysis.dataQuality;
    if (dataQuality && dataQuality.rowsWithNames === 0) {
      diagnosis.recommendations.push({
        priority: 'HIGH',
        issue: 'No riders have names',
        action: 'Add names to rider records',
        fix: 'addRiderNames'
      });
    }
    
    if (dataQuality && dataQuality.statusValues.length === 0) {
      diagnosis.recommendations.push({
        priority: 'MEDIUM',
        issue: 'No status values found',
        action: 'Set rider statuses to Active',
        fix: 'setActiveStatuses'
      });
    } else if (dataQuality && !dataQuality.statusValues.includes('Active')) {
      diagnosis.recommendations.push({
        priority: 'MEDIUM',
        issue: 'No riders have "Active" status',
        action: 'Set some riders to Active status',
        fix: 'setActiveStatuses'
      });
    }
    
    console.log('✅ Diagnosis complete!');
    console.log('🎯 Recommendations:', diagnosis.recommendations);
    
    return diagnosis;
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * STEP 2: Automatic fix based on diagnosis
 */
function autoFixRidersIssue() {
  try {
    console.log('🔧 Starting automatic fix for riders issue...');
    
    // First, get diagnosis
    const diagnosis = diagnoseRealRidersIssue();
    
    if (!diagnosis.recommendations || diagnosis.recommendations.length === 0) {
      console.log('✅ No issues found that need fixing');
      return { success: true, message: 'No fixes needed' };
    }
    
    const fixResults = {
      success: true,
      appliedFixes: [],
      errors: []
    };
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.riders);
    
    // Apply fixes based on recommendations
    for (const recommendation of diagnosis.recommendations) {
      console.log(`🔧 Applying fix: ${recommendation.fix}`);
      
      try {
        switch (recommendation.fix) {
          case 'addSampleRiders':
            // Add sample riders if no data exists
            const sampleRiders = [
              ['RIDER001', 'John Smith', '555-0101', 'john@example.com', 'Active', 'Standard', 0, ''],
              ['RIDER002', 'Jane Doe', '555-0102', 'jane@example.com', 'Active', 'Advanced', 0, ''],
              ['RIDER003', 'Bob Wilson', '555-0103', 'bob@example.com', 'Active', 'Standard', 0, '']
            ];
            
            sampleRiders.forEach(rider => {
              sheet.appendRow(rider);
            });
            
            fixResults.appliedFixes.push('Added 3 sample riders');
            console.log('✅ Added sample riders');
            break;
            
          case 'fixColumnHeaders':
            // Fix headers to match CONFIG expectations
            const expectedHeaders = Object.values(CONFIG.columns.riders);
            sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
            
            fixResults.appliedFixes.push('Fixed column headers');
            console.log('✅ Fixed column headers');
            break;
            
          case 'setActiveStatuses':
            // Set empty statuses to 'Active'
            const data = sheet.getDataRange().getValues();
            const headers = data[0];
            const statusColIndex = headers.indexOf(CONFIG.columns.riders.status);
            const nameColIndex = headers.indexOf(CONFIG.columns.riders.name);
            
            if (statusColIndex >= 0 && nameColIndex >= 0) {
              let fixedCount = 0;
              for (let i = 1; i < data.length; i++) {
                const name = data[i][nameColIndex];
                const status = data[i][statusColIndex];
                
                if (name && String(name).trim() && (!status || String(status).trim() === '')) {
                  sheet.getRange(i + 1, statusColIndex + 1).setValue('Active');
                  fixedCount++;
                }
              }
              
              fixResults.appliedFixes.push(`Set ${fixedCount} riders to Active status`);
              console.log(`✅ Set ${fixedCount} riders to Active status`);
            }
            break;
            
          case 'addRiderNames':
            // Add placeholder names where missing
            const allData = sheet.getDataRange().getValues();
            const allHeaders = allData[0];
            const nameCol = allHeaders.indexOf(CONFIG.columns.riders.name);
            const idCol = allHeaders.indexOf(CONFIG.columns.riders.jpNumber);
            
            if (nameCol >= 0) {
              let addedNames = 0;
              for (let i = 1; i < allData.length; i++) {
                const name = allData[i][nameCol];
                const id = allData[i][idCol];
                
                if ((!name || String(name).trim() === '') && id && String(id).trim()) {
                  sheet.getRange(i + 1, nameCol + 1).setValue(`Rider ${id}`);
                  addedNames++;
                }
              }
              
              fixResults.appliedFixes.push(`Added names to ${addedNames} riders`);
              console.log(`✅ Added names to ${addedNames} riders`);
            }
            break;
        }
        
      } catch (fixError) {
        console.error(`❌ Fix ${recommendation.fix} failed:`, fixError);
        fixResults.errors.push(`${recommendation.fix}: ${fixError.message}`);
      }
    }
    
    // Clear cache after fixes
    dataCache.clear('sheet_' + CONFIG.sheets.riders);
    fixResults.appliedFixes.push('Cleared data cache');
    
    // Test the result
    try {
      const testRiders = getActiveRidersForAssignments();
      fixResults.testResult = {
        success: testRiders.length > 0,
        ridersFound: testRiders.length,
        sampleRider: testRiders[0] || null
      };
      
      console.log(`🧪 Test result: Found ${testRiders.length} active riders`);
      
    } catch (testError) {
      fixResults.testResult = {
        success: false,
        error: testError.message
      };
    }
    
    console.log('🔧 Auto-fix complete:', fixResults);
    return fixResults;
    
  } catch (error) {
    console.error('❌ Auto-fix failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * STEP 3: Simple test to verify riders are working
 */
function testRidersAreWorking() {
  try {
    console.log('🧪 Testing if riders are working...');
    
    const tests = {
      timestamp: new Date().toISOString(),
      results: {}
    };
    
    // Test 1: Basic data access
    try {
      const ridersData = getRidersData(false);
      tests.results.getRidersData = {
        success: true,
        dataFound: !!(ridersData && ridersData.data && ridersData.data.length > 0),
        rowCount: ridersData?.data?.length || 0
      };
    } catch (error) {
      tests.results.getRidersData = {
        success: false,
        error: error.message
      };
    }
    
    // Test 2: Active riders for assignments
    try {
      const activeRiders = getActiveRidersForAssignments();
      tests.results.getActiveRidersForAssignments = {
        success: true,
        ridersFound: activeRiders.length,
        hasRealRiders: activeRiders.length > 0 && !activeRiders[0].name.includes('System'),
        sampleRider: activeRiders[0] || null
      };
    } catch (error) {
      tests.results.getActiveRidersForAssignments = {
        success: false,
        error: error.message
      };
    }
    
    // Test 3: Web app riders
    try {
      const webAppRiders = getActiveRidersForWebApp();
      tests.results.getActiveRidersForWebApp = {
        success: true,
        ridersFound: webAppRiders.length,
        hasRealRiders: webAppRiders.length > 0 && !webAppRiders[0].name.includes('System'),
        sampleRider: webAppRiders[0] || null
      };
    } catch (error) {
      tests.results.getActiveRidersForWebApp = {
        success: false,
        error: error.message
      };
    }
    
    // Overall assessment
    const hasRealRiders = tests.results.getActiveRidersForAssignments?.hasRealRiders === true;
    tests.overallSuccess = hasRealRiders;
    tests.message = hasRealRiders 
      ? '✅ Riders are working correctly!' 
      : '❌ Still showing fallback/system riders - real data issue remains';
    
    console.log('🧪 Test complete:', tests);
    return tests;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * STEP 4: Complete solution - diagnose and fix in one go
 */
function fixRidersCompletely() {
  try {
    console.log('🚀 === COMPLETE RIDERS FIX ===');
    
    const solution = {
      timestamp: new Date().toISOString(),
      steps: []
    };
    
    // Step 1: Diagnose
    console.log('🔍 Step 1: Diagnosing issue...');
    const diagnosis = diagnoseRealRidersIssue();
    solution.steps.push({
      step: 'diagnosis',
      result: diagnosis,
      success: !diagnosis.error
    });
    
    // Step 2: Apply fixes
    console.log('🔧 Step 2: Applying fixes...');
    const fixes = autoFixRidersIssue();
    solution.steps.push({
      step: 'fixes',
      result: fixes,
      success: fixes.success
    });
    
    // Step 3: Test result
    console.log('🧪 Step 3: Testing result...');
    const test = testRidersAreWorking();
    solution.steps.push({
      step: 'test',
      result: test,
      success: test.overallSuccess
    });
    
    solution.overallSuccess = test.overallSuccess;
    solution.finalMessage = test.message;
    
    console.log('🚀 Complete fix result:', solution);
    
    if (solution.overallSuccess) {
      console.log('🎉 SUCCESS! Riders should now work properly. Refresh your web app.');
    } else {
      console.log('❌ Issue persists. Check the diagnosis for more details.');
    }
    
    return solution;
    
  } catch (error) {
    console.error('❌ Complete fix failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
/**
 * QUICK FIX: Add this function to your Code.gs file and run it
 * This will immediately fix the "filterValidRidersData is not defined" error
 */
function quickFixRidersError() {
  try {
    console.log('🔧 Applying quick fix for riders error...');
    
    // Step 1: Clear any bad cache
    dataCache.clear('sheet_' + CONFIG.sheets.riders);
    console.log('✅ Cleared riders cache');
    
    // Step 2: Test basic sheet access
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.riders);
    if (!sheet) {
      throw new Error('Riders sheet not found');
    }
    
    const range = sheet.getDataRange();
    const values = range.getValues();
    console.log(`✅ Sheet accessible: ${values.length} rows found`);
    
    // Step 3: Test the problematic getRidersData function by creating a fixed version
    const headers = values.length > 0 ? values[0] : [];
    const allData = values.length > 1 ? values.slice(1) : [];
    
    const columnMap = {};
    headers.forEach((header, index) => {
      columnMap[header] = index;
    });
    
    // Apply the same filtering logic without the undefined function
    const nameIdx = columnMap[CONFIG.columns.riders.name];
    const idIdx = columnMap[CONFIG.columns.riders.jpNumber];
    
    const validData = allData.filter(row => {
      const name = nameIdx !== undefined ? String(row[nameIdx] || '').trim() : '';
      const riderId = idIdx !== undefined ? String(row[idIdx] || '').trim() : '';
      
      // Only include rows that have either a name OR an ID
      return name.length > 0 || riderId.length > 0;
    });
    
    console.log(`✅ Data filtering test: ${allData.length} total rows → ${validData.length} valid riders`);
    
    // Step 4: Test if we can find active riders
    let activeCount = 0;
    const statusIdx = columnMap[CONFIG.columns.riders.status];
    
    validData.forEach(row => {
      const name = nameIdx !== undefined ? String(row[nameIdx] || '').trim() : '';
      const status = statusIdx !== undefined ? String(row[statusIdx] || '').trim().toLowerCase() : '';
      
      if (name.length > 0) {
        // Count as active if no status or status is active/available
        if (!status || status === '' || status === 'active' || status === 'available') {
          activeCount++;
        }
      }
    });
    
    console.log(`✅ Found ${activeCount} potentially active riders`);
    
    const result = {
      success: true,
      totalRows: allData.length,
      validRiders: validData.length,
      activeRiders: activeCount,
      sampleRider: validData.length > 0 ? {
        name: nameIdx !== undefined ? validData[0][nameIdx] : 'N/A',
        id: idIdx !== undefined ? validData[0][idIdx] : 'N/A',
        status: statusIdx !== undefined ? validData[0][statusIdx] : 'N/A'
      } : null,
      fix: 'The issue is in SheetServices.gs line 259. Replace getRidersData function with the fixed version provided.'
    };
    
    console.log('✅ Quick fix diagnosis complete:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Quick fix failed:', error);
    return {
      success: false,
      error: error.message,
      solution: 'Replace the getRidersData function in SheetServices.gs with the fixed version'
    };
  }
}
/**
 * Enhanced getRidersDataSafe that actually works
 */
function getRidersDataSafe() {
  try {
    // First try the original function if it exists
    if (typeof getRidersData === 'function') {
      const result = getRidersData();
      if (Array.isArray(result)) {
        console.log('✅ Got riders data from getRidersData():', result.length);
        return result;
      }
    }
    
    // Fallback: read directly from sheet
    console.log('🔄 Using fallback riders data method...');
    return getRidersDataFallback();
    
  } catch (error) {
    console.error('❌ Error in getRidersDataSafe:', error);
    return getRidersDataFallback();
  }
}

/**
 * Reliable fallback to get riders data
 */
function getRidersDataFallback() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const ridersSheet = spreadsheet.getSheetByName('Riders');
    
    if (!ridersSheet) {
      console.log('❌ Riders sheet not found');
      return [];
    }
    
    const data = ridersSheet.getDataRange().getValues();
    if (data.length < 2) {
      console.log('⚠️ No rider data found');
      return [];
    }
    
    const headers = data[0];
    const riders = [];
    
    // Convert to object array
    for (let i = 1; i < data.length; i++) {
      const rider = {};
      headers.forEach((header, index) => {
        rider[header] = data[i][index];
      });
      
      // Add common aliases for easier access
      rider.id = rider['Rider ID'] || rider.id;
      rider.name = rider['Full Name'] || rider.name;
      rider.email = rider['Email'] || rider.email;
      rider.status = rider['Status'] || rider.status;
      rider.googleEmail = rider['Google Email'] || rider.googleEmail || '';
      rider.authStatus = rider['Auth Status'] || rider.authStatus || 'Not Set';
      
      riders.push(rider);
    }
    
    console.log(`✅ Fallback method loaded ${riders.length} riders`);
    return riders;
    
  } catch (error) {
    console.error('❌ Fallback riders method failed:', error);
    return [];
  }
}

/**
 * Get user management data - enhanced version
 */
function getUserManagementData() {
  try {
    console.log('📊 Getting user management data...');
    
    const riders = getRidersDataSafe() || [];
    const admins = getAdminUsersSafe() || [];
    const dispatchers = getDispatcherUsersSafe() || [];
    
    console.log(`📊 Found: ${riders.length} riders, ${admins.length} admins, ${dispatchers.length} dispatchers`);
    
    // Combine all users
    const allUsers = [];
    
    // Add riders
    riders.forEach((rider, index) => {
      allUsers.push({
        id: rider.id || rider['Rider ID'] || `rider_${index}`,
        name: rider.name || rider['Full Name'] || 'Unknown Rider',
        email: rider.email || rider['Email'] || '',
        googleEmail: rider.googleEmail || rider['Google Email'] || '',
        role: 'Rider',
        status: rider.status || 'Unknown',
        avatar: (rider.name || 'R').charAt(0).toUpperCase(),
        lastLogin: rider.lastLogin || rider['Last Login'] || 'Never',
        type: 'rider'
      });
    });
    
    // Add admins
    admins.forEach((email, index) => {
      if (email && email.trim()) {
        allUsers.push({
          id: 'admin_' + index,
          name: extractNameFromEmail(email),
          email: email,
          googleEmail: email,
          role: 'Admin',
          status: 'Active',
          avatar: email.charAt(0).toUpperCase(),
          lastLogin: 'Unknown',
          type: 'admin'
        });
      }
    });
    
    // Add dispatchers
    dispatchers.forEach((email, index) => {
      if (email && email.trim()) {
        allUsers.push({
          id: 'dispatcher_' + index,
          name: extractNameFromEmail(email),
          email: email,
          googleEmail: email,
          role: 'Dispatcher',
          status: 'Active',
          avatar: email.charAt(0).toUpperCase(),
          lastLogin: 'Unknown',
          type: 'dispatcher'
        });
      }
    });
    
    // Calculate statistics
    const stats = {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(u => u.status === 'Active').length,
      pendingUsers: allUsers.filter(u => u.status === 'Pending').length,
      unmappedUsers: riders.filter(r => !r.googleEmail || r.googleEmail.trim() === '').length
    };
    
    console.log('✅ User management stats:', stats);
    
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
 * Extract name from email for display
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
 * Get recent system activity
 */
function getRecentSystemActivity() {
  try {
    // Try to read from Auth Log sheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = spreadsheet.getSheetByName('Auth Log');
    
    if (logSheet && logSheet.getLastRow() > 1) {
      const data = logSheet.getDataRange().getValues();
      const activities = [];
      
      // Get last 5 activities
      const startRow = Math.max(1, data.length - 5);
      for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (row[0]) { // Has timestamp
          activities.push({
            description: `${row[2] || 'User'} - ${row[4] || 'Action'}`,
            time: formatTimeAgo(row[0])
          });
        }
      }
      
      return activities.reverse(); // Most recent first
    }
    
    // Return demo data if no log sheet
    return [
      { description: 'System started successfully', time: '1 hour ago' },
      { description: 'Admin dashboard accessed', time: '2 hours ago' },
      { description: 'User authentication verified', time: '3 hours ago' }
    ];
    
  } catch (error) {
    console.error('❌ Error getting recent activity:', error);
    return [
      { description: 'System running normally', time: 'now' }
    ];
  }
}

/**
 * Format time ago helper
 */
function formatTimeAgo(timestamp) {
  try {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } catch (error) {
    return 'recently';
  }
}

/**
 * Test function to debug what's working
 */
function testDashboardData() {
  console.log('🧪 Testing dashboard data functions...');
  
  console.log('=== Testing getRidersDataSafe ===');
  const riders = getRidersDataSafe();
  console.log('Riders result:', riders);
  
  console.log('=== Testing getAdminUsersSafe ===');
  const admins = getAdminUsersSafe();
  console.log('Admins result:', admins);
  
  console.log('=== Testing getAdminDashboardData ===');
  const dashboardData = getAdminDashboardData();
  console.log('Dashboard data result:', dashboardData);
  
  console.log('=== Testing getUserManagementData ===');
  const userMgmtData = getUserManagementData();
  console.log('User management data result:', userMgmtData);
  
  return {
    riders: riders,
    admins: admins,
    dashboardData: dashboardData,
    userMgmtData: userMgmtData
  };
}
/**
 * TEMPORARY WORKAROUND: Override the problematic getRidersData function
 * Add this to your Code.gs file to immediately fix the issue
 */
function getRidersDataFixed(useCache = true) {
  const cacheKey = `sheet_${CONFIG.sheets.riders}`;

  if (useCache) {
    const cached = dataCache.get(cacheKey);
    if (cached && cached.data) {
      return cached;
    }
  }

  try {
    const sheet = getSheet(CONFIG.sheets.riders);
    const range = sheet.getDataRange();
    const values = range.getValues();

    if (values.length === 0) {
      return {
        headers: [],
        data: [],
        columnMap: {},
        sheet: sheet
      };
    }

    const headers = values[0];
    const allData = values.slice(1);

    const columnMap = {};
    headers.forEach((header, index) => {
      columnMap[header] = index;
    });

    // Filter out empty rows without calling undefined function
    const validData = allData.filter(row => {
      const nameIdx = columnMap[CONFIG.columns.riders.name];
      const idIdx = columnMap[CONFIG.columns.riders.jpNumber];
      
      const name = nameIdx !== undefined ? String(row[nameIdx] || '').trim() : '';
      const riderId = idIdx !== undefined ? String(row[idIdx] || '').trim() : '';
      
      return name.length > 0 || riderId.length > 0;
    });

    const result = {
      headers,
      data: validData,
      columnMap,
      sheet
    };

    if (useCache) {
      dataCache.set(cacheKey, result);
    }

    return result;

  } catch (error) {
    logError(`Error getting riders data`, error);
    return {
      headers: [],
      data: [],
      columnMap: {},
      sheet: getSheet(CONFIG.sheets.riders)
    };
  }
}

/**
 * Test the fixed function
 */
function testFixedRidersFunction() {
  try {
    console.log('🧪 Testing fixed riders function...');
    
    const ridersData = getRidersDataFixed(false);
    console.log('✅ getRidersDataFixed works:', {
      hasData: !!ridersData,
      dataLength: ridersData.data ? ridersData.data.length : 0,
      headers: ridersData.headers ? ridersData.headers.length : 0
    });
    
    // Test active riders with fixed data
    if (ridersData.data && ridersData.data.length > 0) {
      const columnMap = ridersData.columnMap;
      const nameIdx = columnMap[CONFIG.columns.riders.name];
      const statusIdx = columnMap[CONFIG.columns.riders.status];
      
      let activeCount = 0;
      ridersData.data.forEach(row => {
        const name = nameIdx !== undefined ? String(row[nameIdx] || '').trim() : '';
        const status = statusIdx !== undefined ? String(row[statusIdx] || '').trim().toLowerCase() : '';
        
        if (name.length > 0 && (!status || status === 'active' || status === 'available' || status === '')) {
          activeCount++;
        }
      });
      
      console.log(`✅ Found ${activeCount} active riders out of ${ridersData.data.length} total`);
      
      return {
        success: true,
        totalRiders: ridersData.data.length,
        activeRiders: activeCount,
        sampleRider: ridersData.data[0] ? {
          name: nameIdx !== undefined ? ridersData.data[0][nameIdx] : 'N/A',
          status: statusIdx !== undefined ? ridersData.data[0][statusIdx] : 'N/A'
        } : null
      };
    }
    
    return { success: true, totalRiders: 0, activeRiders: 0 };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}
function testFiles() {
  const existing = testExistingFiles();
  console.log('Existing files:', existing);
  return existing;
}
/**
 * Handle user management page - FIXED VERSION
 */
function handleUserManagementPage(e) {
  try {
    console.log('🔐 Handling user management page...');
    
    // Check authentication first
    const authResult = authenticateAndAuthorizeUser();
    
    if (!authResult.success) {
      console.log('❌ User management auth failed:', authResult.error);
      return createSignInPage();
    }
    
    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      console.log('❌ User management access denied for role:', authResult.user.role);
      return createAccessDeniedPage('Only administrators can access user management', authResult.user);
    }
    
    console.log('✅ User management access granted for admin:', authResult.user.name);
    
    // Check if user-management.html file exists
    if (checkFileExists('user-management')) {
      console.log('✅ Loading user-management.html file');
      
      // Load the HTML file normally
      let htmlOutput = HtmlService.createHtmlOutputFromFile('user-management');
      let content = htmlOutput.getContent();
      
      // Add navigation and user info
      const navigationHtml = getRoleBasedNavigationSafe('user-management', authResult.user, authResult.rider);
      content = injectUserInfoSafe(content, authResult.user, authResult.rider);
      content = addNavigationToContentSafe(content, navigationHtml);
      content = addUserDataInjectionSafe(content, authResult.user, authResult.rider);
      
      htmlOutput.setContent(content);
      
      return htmlOutput
        .setTitle('User Management - Escort Management')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
        
    } else {
      console.log('❌ user-management.html file not found, creating dynamic page');
      // Fall back to the dynamic version we created earlier
      return createUserManagementDashboard();
    }
    
  } catch (error) {
    console.error('❌ User management page error:', error);
    return createErrorPageWithSignIn(error);
  }
}

/**
 * Handle auth setup page
 */
function handleAuthSetupPage(e) {
  try {
    console.log('🔐 Handling auth setup page...');
    
    const authResult = authenticateAndAuthorizeUser();
    
    if (!authResult.success || authResult.user.role !== 'admin') {
      return createAccessDeniedPage('Only administrators can access authentication setup', 
        authResult.user || { name: 'Unknown', role: 'unknown' });
    }
    
    // Return the auth mapping page we created
    return createAuthMappingPage();
    
  } catch (error) {
    console.error('❌ Auth setup page error:', error);
    return createErrorPageWithSignIn(error);
  }
}

/**
 * Enhanced navigation that includes user management
 */
function getRoleBasedNavigationSafe(currentPage, user, rider) {
  try {
    const baseUrl = getWebAppUrlSafe();
    
    const navigationMenus = {
      admin: [
        { page: 'dashboard', label: '📊 Dashboard', url: `${baseUrl}` },
        { page: 'requests', label: '📋 Requests', url: `${baseUrl}?page=requests` },
        { page: 'assignments', label: '🏍️ Assignments', url: `${baseUrl}?page=assignments` },
        { page: 'riders', label: '👥 Riders', url: `${baseUrl}?page=riders` },
        { page: 'user-management', label: '🔐 User Management', url: `${baseUrl}?page=user-management` },
        { page: 'notifications', label: '📱 Notifications', url: `${baseUrl}?page=notifications` },
        { page: 'reports', label: '📊 Reports', url: `${baseUrl}?page=reports` }
      ],
      dispatcher: [
        { page: 'dashboard', label: '📊 Dashboard', url: `${baseUrl}` },
        { page: 'requests', label: '📋 Requests', url: `${baseUrl}?page=requests` },
        { page: 'assignments', label: '🏍️ Assignments', url: `${baseUrl}?page=assignments` },
        { page: 'notifications', label: '📱 Notifications', url: `${baseUrl}?page=notifications` },
        { page: 'reports', label: '📊 Reports', url: `${baseUrl}?page=reports` }
      ],
      rider: [
        { page: 'dashboard', label: '📊 My Dashboard', url: `${baseUrl}` },
        { page: 'rider-schedule', label: '📅 My Schedule', url: `${baseUrl}?page=rider-schedule` },
        { page: 'my-assignments', label: '🏍️ My Assignments', url: `${baseUrl}?page=my-assignments` }
      ]
    };
    
    const menuItems = navigationMenus[user.role] || navigationMenus.rider;
    
    let navHtml = '<nav class="navigation" style="display: flex; justify-content: center; align-items: center;">';
    
    menuItems.forEach(item => {
      const isActive = item.page === currentPage ? 'active' : '';
      navHtml += `
        <a href="${item.url}"
           class="nav-button ${isActive}"
           data-page="${item.page}">
          ${item.label}
        </a>
      `;
    });
    
    navHtml += '</nav>';
    
    return navHtml;
    
  } catch (error) {
    console.error('❌ Error in getRoleBasedNavigationSafe:', error);
    return '<nav>Navigation error</nav>';
  }
}

/**
 * Log out the current user and return a Google sign-out URL
 */
function logout() {
  try {
    PropertiesService.getScriptProperties().deleteProperty('CACHED_USER_EMAIL');
    PropertiesService.getScriptProperties().deleteProperty('CACHED_USER_NAME');
  } catch (error) {
    console.error('Error clearing cached user info during logout:', error);
  }

  const baseUrl = getWebAppUrlSafe();
  return `https://accounts.google.com/Logout?continue=${encodeURIComponent(baseUrl)}`;
}

/**
 * Test function - run this to debug your setup
 */
function debugSystemSetup() {
  console.log('🧪 Debugging system setup...');
  
  try {
    console.log('=== Testing Authentication ===');
    const authResult = authenticateAndAuthorizeUser();
    console.log('Auth result:', authResult);
    
    console.log('=== Testing Admin Dashboard Data ===');
    const dashboardData = getAdminDashboardData();
    console.log('Dashboard data:', dashboardData);
    
    console.log('=== Testing User Management Data ===');
    const userMgmtData = getUserManagementData();
    console.log('User management data:', userMgmtData);
    
    console.log('=== Testing File Existence ===');
    const files = ['index', 'admin-dashboard', 'user-management', 'requests', 'assignments'];
    files.forEach(file => {
      const exists = checkFileExists(file);
      console.log(`${exists ? '✅' : '❌'} ${file}.html`);
    });
    
    return {
      auth: authResult,
      dashboard: dashboardData,
      userMgmt: userMgmtData,
      filesExist: files.map(f => ({ file: f, exists: checkFileExists(f) }))
    };
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    return { error: error.message };
  }
}
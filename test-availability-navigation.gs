/**
 * @fileoverview
 * Test script to verify that the availability calendar navigation is working properly.
 * Run this after implementing the availability system to ensure everything is connected.
 */

/**
 * Test the availability calendar navigation and permissions
 * Run this function to verify the system is set up correctly
 */
function testAvailabilityNavigation() {
  console.log('🧪 === TESTING AVAILABILITY CALENDAR NAVIGATION ===');
  
  const testResults = {
    permissions: {},
    navigation: {},
    routing: {},
    files: {}
  };
  
  try {
    // Test 1: Permissions Matrix
    console.log('\n1️⃣ Testing Permissions Matrix...');
    testResults.permissions = testPermissionsMatrix();
    
    // Test 2: Navigation Menu Generation
    console.log('\n2️⃣ Testing Navigation Menu Generation...');
    testResults.navigation = testNavigationGeneration();
    
    // Test 3: Page Routing
    console.log('\n3️⃣ Testing Page Routing...');
    testResults.routing = testPageRouting();
    
    // Test 4: File Existence
    console.log('\n4️⃣ Testing File Existence...');
    testResults.files = testFileExistence();
    
    // Test 5: Backend Functions
    console.log('\n5️⃣ Testing Backend Functions...');
    testResults.backend = testBackendFunctions();
    
    // Summary
    console.log('\n📊 === TEST SUMMARY ===');
    const allPassed = Object.values(testResults).every(result => result.success);
    
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED! Availability calendar should be working.');
    } else {
      console.log('❌ Some tests failed. Check the details above.');
    }
    
    return testResults;
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    return { error: error.message, testResults: testResults };
  }
}

/**
 * Test the permissions matrix for availability access
 */
function testPermissionsMatrix() {
  try {
    const testRoles = ['admin', 'dispatcher', 'rider'];
    const results = {};
    
    for (const role of testRoles) {
      const permissions = PERMISSIONS_MATRIX[role];
      
      if (!permissions) {
        results[role] = { error: 'Role not found in permissions matrix' };
        continue;
      }
      
      const hasAvailabilityPage = permissions.pages && permissions.pages.includes('rider-availability');
      const hasAvailabilityPerms = permissions.availability !== undefined;
      
      results[role] = {
        hasPage: hasAvailabilityPage,
        hasPermissions: hasAvailabilityPerms,
        permissions: permissions.availability,
        pages: permissions.pages
      };
      
      console.log(`   ${role}: Page=${hasAvailabilityPage ? '✅' : '❌'}, Perms=${hasAvailabilityPerms ? '✅' : '❌'}`);
    }
    
    const allRolesHavePage = testRoles.every(role => results[role].hasPage);
    const allRolesHavePerms = testRoles.every(role => results[role].hasPermissions);
    
    return {
      success: allRolesHavePage && allRolesHavePerms,
      details: results,
      summary: `Pages: ${allRolesHavePage ? '✅' : '❌'}, Permissions: ${allRolesHavePerms ? '✅' : '❌'}`
    };
    
  } catch (error) {
    console.error('   ❌ Permissions test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test navigation menu generation for different roles
 */
function testNavigationGeneration() {
  try {
    const testUsers = [
      { email: 'admin@test.com', name: 'Test Admin', role: 'admin' },
      { email: 'dispatcher@test.com', name: 'Test Dispatcher', role: 'dispatcher' },
      { email: 'rider@test.com', name: 'Test Rider', role: 'rider' }
    ];
    
    const results = {};
    
    for (const user of testUsers) {
      try {
        const menuItems = getUserNavigationMenu(user);
        const hasAvailabilityItem = menuItems.some(item => item.page === 'rider-availability');
        
        results[user.role] = {
          success: true,
          hasAvailabilityItem: hasAvailabilityItem,
          menuItemsCount: menuItems.length,
          availabilityItem: menuItems.find(item => item.page === 'rider-availability'),
          allItems: menuItems.map(item => `${item.page}: ${item.label}`)
        };
        
        console.log(`   ${user.role}: ${hasAvailabilityItem ? '✅' : '❌'} (${menuItems.length} items)`);
        
      } catch (error) {
        results[user.role] = { success: false, error: error.message };
        console.log(`   ${user.role}: ❌ Error - ${error.message}`);
      }
    }
    
    const allHaveAvailability = Object.values(results).every(r => r.success && r.hasAvailabilityItem);
    
    return {
      success: allHaveAvailability,
      details: results,
      summary: `All roles have availability menu: ${allHaveAvailability ? '✅' : '❌'}`
    };
    
  } catch (error) {
    console.error('   ❌ Navigation test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test page routing for rider-availability
 */
function testPageRouting() {
  try {
    const testRoles = ['admin', 'dispatcher', 'rider'];
    const results = {};
    
    for (const role of testRoles) {
      try {
        const fileName = getPageFileName('rider-availability', role);
        const fileNameSafe = getPageFileNameSafe('rider-availability', role);
        
        results[role] = {
          success: true,
          fileName: fileName,
          fileNameSafe: fileNameSafe,
          matches: fileName === 'rider-availability' || fileNameSafe === 'rider-availability'
        };
        
        console.log(`   ${role}: ${fileName} / ${fileNameSafe} ${results[role].matches ? '✅' : '❌'}`);
        
      } catch (error) {
        results[role] = { success: false, error: error.message };
        console.log(`   ${role}: ❌ Error - ${error.message}`);
      }
    }
    
    const allRoutingWorks = Object.values(results).every(r => r.success && r.matches);
    
    return {
      success: allRoutingWorks,
      details: results,
      summary: `Page routing works: ${allRoutingWorks ? '✅' : '❌'}`
    };
    
  } catch (error) {
    console.error('   ❌ Routing test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test if the HTML file exists
 */
function testFileExistence() {
  try {
    const fileName = 'rider-availability';
    let fileExists = false;
    let error = null;
    
    try {
      // Try to create an HTML output from the file
      const htmlOutput = HtmlService.createHtmlOutputFromFile(fileName);
      fileExists = htmlOutput !== null;
      console.log(`   ${fileName}.html: ✅ File exists and loads`);
    } catch (e) {
      error = e.message;
      console.log(`   ${fileName}.html: ❌ File not found or error - ${error}`);
    }
    
    return {
      success: fileExists,
      fileName: fileName,
      error: error,
      summary: `HTML file exists: ${fileExists ? '✅' : '❌'}`
    };
    
  } catch (error) {
    console.error('   ❌ File existence test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test backend availability functions
 */
function testBackendFunctions() {
  try {
    const functions = [
      'getCurrentUserForAvailability',
      'getUserAvailabilityForCalendar',
      'getAllRidersAvailabilityForCalendar',
      'saveRiderAvailabilityData',
      'saveRecurringAvailability',
      'deleteRiderAvailability',
      'ensureAvailabilitySheet'
    ];
    
    const results = {};
    
    for (const funcName of functions) {
      try {
        const func = eval(funcName);
        const exists = typeof func === 'function';
        
        results[funcName] = {
          exists: exists,
          type: typeof func
        };
        
        console.log(`   ${funcName}: ${exists ? '✅' : '❌'}`);
        
      } catch (error) {
        results[funcName] = {
          exists: false,
          error: error.message
        };
        console.log(`   ${funcName}: ❌ Error - ${error.message}`);
      }
    }
    
    const allFunctionsExist = Object.values(results).every(r => r.exists);
    
    return {
      success: allFunctionsExist,
      details: results,
      summary: `All backend functions exist: ${allFunctionsExist ? '✅' : '❌'}`
    };
    
  } catch (error) {
    console.error('   ❌ Backend functions test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Quick test to verify just the navigation menu
 */
function quickTestNavigationMenu() {
  console.log('🔍 Quick Navigation Menu Test');
  
  try {
    const testUser = { email: 'test@test.com', name: 'Test User', role: 'rider' };
    const menuItems = getUserNavigationMenu(testUser);
    
    console.log('Menu items for rider:');
    menuItems.forEach(item => {
      console.log(`  - ${item.page}: ${item.label} (${item.url})`);
      if (item.page === 'rider-availability') {
        console.log('    ✅ Availability calendar found!');
      }
    });
    
    const hasAvailability = menuItems.some(item => item.page === 'rider-availability');
    
    if (hasAvailability) {
      console.log('✅ SUCCESS: Availability calendar is in the navigation menu!');
    } else {
      console.log('❌ ISSUE: Availability calendar not found in navigation menu');
    }
    
    return hasAvailability;
    
  } catch (error) {
    console.error('❌ Quick test failed:', error);
    return false;
  }
}

/**
 * Test the availability sheet creation
 */
function testAvailabilitySheetCreation() {
  console.log('📊 Testing Availability Sheet Creation');
  
  try {
    // Test sheet creation
    ensureAvailabilitySheet();
    
    // Verify sheet exists
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.sheets.availability);
    
    if (sheet) {
      console.log('✅ Availability sheet created successfully');
      
      // Check headers
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const expectedHeaders = Object.values(CONFIG.columns.availability);
      
      console.log('Expected headers:', expectedHeaders);
      console.log('Actual headers:', headers);
      
      const headersMatch = expectedHeaders.every(header => headers.includes(header));
      
      if (headersMatch) {
        console.log('✅ Headers match expected configuration');
      } else {
        console.log('❌ Headers do not match expected configuration');
      }
      
      return {
        success: true,
        sheetExists: true,
        headersMatch: headersMatch,
        headers: headers
      };
      
    } else {
      console.log('❌ Availability sheet was not created');
      return {
        success: false,
        sheetExists: false,
        error: 'Sheet not found after creation attempt'
      };
    }
    
  } catch (error) {
    console.error('❌ Sheet creation test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Run all availability tests
 */
function runAllAvailabilityTests() {
  console.log('🧪 === COMPREHENSIVE AVAILABILITY SYSTEM TEST ===\n');
  
  const results = {};
  
  // Test 1: Navigation Menu
  console.log('1️⃣ Testing Navigation Menu...');
  results.navigation = quickTestNavigationMenu();
  
  // Test 2: Sheet Creation
  console.log('\n2️⃣ Testing Sheet Creation...');
  results.sheet = testAvailabilitySheetCreation();
  
  // Test 3: Full System Test
  console.log('\n3️⃣ Running Full System Test...');
  results.fullTest = testAvailabilityNavigation();
  
  // Summary
  console.log('\n📊 === FINAL SUMMARY ===');
  console.log(`Navigation Menu: ${results.navigation ? '✅' : '❌'}`);
  console.log(`Sheet Creation: ${results.sheet.success ? '✅' : '❌'}`);
  console.log(`Full System: ${results.fullTest.success ? '✅' : '❌'}`);
  
  const overallSuccess = results.navigation && results.sheet.success && results.fullTest.success;
  
  if (overallSuccess) {
    console.log('\n🎉 SUCCESS! Availability calendar system is ready to use!');
    console.log('📱 Users should now see the "🗓️ Availability" menu item.');
  } else {
    console.log('\n⚠️ Some issues found. Check the test results above.');
  }
  
  return {
    success: overallSuccess,
    details: results
  };
}
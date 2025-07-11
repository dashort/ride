/**
 * @fileoverview
 * Test and fix functions for rider availability dashboard authentication issues
 * Run these functions to diagnose and resolve "welcome: undefined (undefined)" problems
 */

/**
 * Quick test function to check what's happening with authentication
 * Run this function in the Apps Script editor to diagnose the issue
 */
function testAvailabilityAuth() {
  console.log('🔧 Testing availability authentication...');
  
  try {
    // Test 1: Basic session info
    console.log('\n1. Testing basic session:');
    const sessionUser = Session.getActiveUser();
    const sessionEmail = sessionUser.getEmail();
    console.log(`   Session email: ${sessionEmail}`);
    
    // Test 2: getCurrentUser function
    console.log('\n2. Testing getCurrentUser:');
    const currentUser = getCurrentUser();
    console.log(`   Current user: ${JSON.stringify(currentUser)}`);
    
    // Test 3: getCurrentUserForAvailability function
    console.log('\n3. Testing getCurrentUserForAvailability:');
    const availUser = getCurrentUserForAvailability();
    console.log(`   Availability user: ${JSON.stringify(availUser)}`);
    
    // Test 4: Check if email is in admin/dispatcher lists
    console.log('\n4. Testing user role mapping:');
    const adminUsers = getAdminUsersSafe();
    const dispatcherUsers = getDispatcherUsersSafe();
    console.log(`   Admin users: ${JSON.stringify(adminUsers)}`);
    console.log(`   Dispatcher users: ${JSON.stringify(dispatcherUsers)}`);
    console.log(`   Is admin: ${adminUsers.includes(sessionEmail)}`);
    console.log(`   Is dispatcher: ${dispatcherUsers.includes(sessionEmail)}`);
    
    // Test 5: Check rider mapping
    console.log('\n5. Testing rider mapping:');
    const rider = getRiderByGoogleEmailSafe(sessionEmail);
    console.log(`   Rider data: ${JSON.stringify(rider)}`);
    
    console.log('\n✅ Test completed. Check the logs above for issues.');
    
    return {
      success: true,
      sessionEmail: sessionEmail,
      currentUser: currentUser,
      availUser: availUser,
      adminUsers: adminUsers,
      dispatcherUsers: dispatcherUsers,
      rider: rider
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Show user mapping status and provide manual mapping instructions
 * This tells you what role the user should have and where to map them
 */
function showUserMappingInstructions() {
  try {
    const currentEmail = Session.getActiveUser().getEmail();
    console.log(`\n🔍 User Mapping Analysis for: ${currentEmail}`);
    
    // Check current mappings
    const adminUsers = getAdminUsersSafe();
    const dispatcherUsers = getDispatcherUsersSafe();
    const rider = getRiderByGoogleEmailSafe(currentEmail);
    
    const isAdmin = adminUsers.includes(currentEmail);
    const isDispatcher = dispatcherUsers.includes(currentEmail);
    const isRider = rider && rider.status === 'Active';
    
    console.log('\n📋 Current Role Status:');
    console.log(`   ✓ Admin: ${isAdmin ? 'YES' : 'NO'}`);
    console.log(`   ✓ Dispatcher: ${isDispatcher ? 'YES' : 'NO'}`);
    console.log(`   ✓ Rider: ${isRider ? 'YES' : 'NO'}`);
    
    if (!isAdmin && !isDispatcher && !isRider) {
      console.log('\n⚠️ USER NOT MAPPED TO ANY ROLE');
      console.log('\n🔧 TO FIX, CHOOSE ONE OF THESE OPTIONS:');
      console.log('\n1. 👑 IF USER SHOULD BE AN ADMIN:');
      console.log('   - Open your Google Spreadsheet');
      console.log('   - Go to the "Settings" sheet');
      console.log(`   - Add "${currentEmail}" to an empty cell in column B (Admin Emails)`);
      
      console.log('\n2. 📋 IF USER SHOULD BE A DISPATCHER:');
      console.log('   - Open your Google Spreadsheet');
      console.log('   - Go to the "Settings" sheet');
      console.log(`   - Add "${currentEmail}" to an empty cell in column C (Dispatcher Emails)`);
      
      console.log('\n3. 🏍️ IF USER SHOULD BE A RIDER:');
      console.log('   - Open your Google Spreadsheet');
      console.log('   - Go to the "Riders" sheet');
      console.log(`   - Find the row with your rider information`);
      console.log(`   - Add "${currentEmail}" to the "Google Email" column for your rider record`);
      console.log('   - Ensure the "Status" column is set to "Active"');
      
      console.log('\n4. 🚫 IF USER SHOULD NOT HAVE ACCESS:');
      console.log('   - No action needed - user will remain unauthorized');
    } else {
      console.log('\n✅ USER IS PROPERLY MAPPED');
      if (isAdmin) console.log('   Role: Admin');
      if (isDispatcher) console.log('   Role: Dispatcher');
      if (isRider) console.log(`   Role: Rider (${rider.name || rider.id})`);
    }
    
    return {
      success: true,
      userEmail: currentEmail,
      isAdmin: isAdmin,
      isDispatcher: isDispatcher,
      isRider: isRider,
      needsMapping: !isAdmin && !isDispatcher && !isRider,
      riderData: rider
    };
    
  } catch (error) {
    console.error('❌ Error analyzing user mapping:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if current user is properly mapped and provide specific guidance
 */
function diagnoseUserRole() {
  console.log('🔍 Running user role diagnosis...');
  
  const mappingInfo = showUserMappingInstructions();
  
  if (!mappingInfo.success) {
    return mappingInfo;
  }
  
  if (mappingInfo.needsMapping) {
    console.log('\n❌ ISSUE FOUND: User not mapped to any role');
    console.log('📝 ACTION REQUIRED: Follow the instructions above to map the user to appropriate role');
    
    return {
      issue: 'USER_NOT_MAPPED',
      solution: 'Map user to appropriate role in Settings or Riders sheet',
      mappingInfo: mappingInfo
    };
  } else {
    console.log('\n✅ User role mapping is correct');
    
    // Test if the mapping is working in the authentication system
    const authTest = getCurrentUserForAvailability();
    
    if (authTest.success && authTest.user && authTest.user.name && authTest.user.role) {
      console.log('✅ Authentication is working correctly');
      return {
        issue: 'NONE',
        solution: 'System is working correctly',
        authResult: authTest
      };
    } else {
      console.log('⚠️ User is mapped but authentication still failing');
      return {
        issue: 'AUTH_SYSTEM_ERROR',
        solution: 'User mapping is correct but authentication system has other issues',
        mappingInfo: mappingInfo,
        authResult: authTest
      };
    }
  }
}

/**
 * Verify Settings sheet structure and admin/dispatcher lists
 */
function verifySettingsSheet() {
  try {
    console.log('📊 Verifying Settings sheet structure...');
    
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
    if (!settingsSheet) {
      console.log('❌ Settings sheet not found');
      return {
        success: false,
        error: 'Settings sheet not found',
        solution: 'Create a sheet named "Settings" with admin emails in column B and dispatcher emails in column C'
      };
    }
    
    // Check admin emails (column B)
    const adminRange = settingsSheet.getRange('B2:B20');
    const adminValues = adminRange.getValues().flat().filter(email => email && email.trim());
    
    // Check dispatcher emails (column C)  
    const dispatcherRange = settingsSheet.getRange('C2:C20');
    const dispatcherValues = dispatcherRange.getValues().flat().filter(email => email && email.trim());
    
    console.log('📧 Admin emails found:', adminValues);
    console.log('📧 Dispatcher emails found:', dispatcherValues);
    
    return {
      success: true,
      adminEmails: adminValues,
      dispatcherEmails: dispatcherValues,
      hasAdmins: adminValues.length > 0,
      hasDispatchers: dispatcherValues.length > 0
    };
    
  } catch (error) {
    console.error('❌ Error verifying Settings sheet:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Complete diagnostic - identifies the exact issue and provides solution
 */
function completeAuthDiagnostic() {
  console.log('� Running complete authentication diagnostic...');
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };
  
  try {
    // Test 1: Settings sheet verification
    console.log('\n📋 Step 1: Verifying Settings sheet...');
    const settingsTest = verifySettingsSheet();
    results.tests.settings = settingsTest;
    
    // Test 2: User role diagnosis
    console.log('\n📋 Step 2: Diagnosing user role...');
    const roleTest = diagnoseUserRole();
    results.tests.userRole = roleTest;
    
    // Test 3: Authentication function test
    console.log('\n📋 Step 3: Testing authentication functions...');
    const authTest = testAvailabilityAuth();
    results.tests.authentication = authTest;
    
    // Generate recommendations
    console.log('\n📝 DIAGNOSTIC SUMMARY:');
    
    if (roleTest.issue === 'USER_NOT_MAPPED') {
      console.log('❌ ISSUE: User is not mapped to any role');
      console.log('🔧 SOLUTION: Map the user to the appropriate role (see instructions above)');
      results.recommendation = 'MAP_USER_TO_ROLE';
    } else if (roleTest.issue === 'AUTH_SYSTEM_ERROR') {
      console.log('⚠️ ISSUE: User mapping is correct but authentication system has problems');
      console.log('🔧 SOLUTION: Check authentication system functions');
      results.recommendation = 'CHECK_AUTH_SYSTEM';
    } else if (roleTest.issue === 'NONE') {
      console.log('✅ RESULT: System is working correctly');
      results.recommendation = 'NO_ACTION_NEEDED';
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    results.error = error.message;
    return results;
  }
}

/**
 * Updated instructions that don't automatically grant admin access
 */
function showSecureInstructions() {
  const instructions = `
🔧 RIDER AVAILABILITY AUTHENTICATION DIAGNOSTIC INSTRUCTIONS

To fix the "welcome: undefined (undefined)" issue:

1. Run 'completeAuthDiagnostic()' first
   - This will identify exactly what's wrong and provide specific guidance

2. Based on the results, manually map the user to the correct role:

   👑 FOR ADMIN ACCESS:
   - Open your Google Spreadsheet → Settings sheet
   - Add user's email to column B (Admin Emails)
   
   📋 FOR DISPATCHER ACCESS:
   - Open your Google Spreadsheet → Settings sheet  
   - Add user's email to column C (Dispatcher Emails)
   
   🏍️ FOR RIDER ACCESS:
   - Open your Google Spreadsheet → Riders sheet
   - Find the rider's row and add their Google email to "Google Email" column
   - Ensure "Status" is set to "Active"

3. After mapping, reload the rider availability page to test

DO NOT run functions that automatically grant admin access!

Common issues and solutions:
- User not in any role lists → Map to appropriate role manually
- Settings sheet missing → Create Settings sheet with proper structure
- Rider Google email not linked → Add Google email to Riders sheet
- Authentication system errors → Run diagnostic for specific guidance

The frontend has been updated with fallback values, so even if authentication 
has issues, it will show meaningful information instead of "undefined (undefined)".
`;
  
  console.log(instructions);
  return instructions;
}
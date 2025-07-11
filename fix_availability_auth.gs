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
 * Fix function to add current user to admin list (if needed)
 * Run this if your email is not in the admin list
 */
function addCurrentUserToAdminList() {
  try {
    const currentEmail = Session.getActiveUser().getEmail();
    console.log(`Adding ${currentEmail} to admin list...`);
    
    // Get Settings sheet
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
    if (!settingsSheet) {
      console.log('❌ Settings sheet not found');
      return { success: false, error: 'Settings sheet not found' };
    }
    
    // Find first empty row in admin email column (B column)
    const adminRange = settingsSheet.getRange('B2:B20');
    const adminValues = adminRange.getValues();
    
    let emptyRow = -1;
    for (let i = 0; i < adminValues.length; i++) {
      if (!adminValues[i][0] || adminValues[i][0].trim() === '') {
        emptyRow = i + 2; // +2 because we start from B2
        break;
      }
    }
    
    if (emptyRow === -1) {
      console.log('❌ No empty rows found in admin email column');
      return { success: false, error: 'No empty rows found in admin email column' };
    }
    
    // Add current user email to admin list
    settingsSheet.getRange(`B${emptyRow}`).setValue(currentEmail);
    
    console.log(`✅ Added ${currentEmail} to admin list at row ${emptyRow}`);
    
    // Test the fix
    const testResult = testAvailabilityAuth();
    
    return {
      success: true,
      message: `Added ${currentEmail} to admin list`,
      testResult: testResult
    };
    
  } catch (error) {
    console.error('❌ Error adding user to admin list:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Complete diagnostic and fix function
 * This will identify and attempt to fix common authentication issues
 */
function diagnoseAndFixAuth() {
  console.log('🔍 Running comprehensive authentication diagnosis and fix...');
  
  const results = {
    timestamp: new Date().toISOString(),
    steps: []
  };
  
  try {
    // Step 1: Test basic authentication
    console.log('\n📋 Step 1: Testing basic authentication...');
    const authTest = testAvailabilityAuth();
    results.steps.push({
      step: 'auth_test',
      success: authTest.success,
      result: authTest
    });
    
    if (!authTest.success) {
      console.log('❌ Basic authentication failed');
      return results;
    }
    
    // Step 2: Check if user has proper role
    console.log('\n📋 Step 2: Checking user role assignment...');
    const userEmail = authTest.sessionEmail;
    const hasRole = authTest.adminUsers.includes(userEmail) || 
                   authTest.dispatcherUsers.includes(userEmail) || 
                   (authTest.rider && authTest.rider.status === 'Active');
    
    results.steps.push({
      step: 'role_check',
      success: hasRole,
      userEmail: userEmail,
      hasRole: hasRole,
      roleType: authTest.adminUsers.includes(userEmail) ? 'admin' : 
                (authTest.dispatcherUsers.includes(userEmail) ? 'dispatcher' : 
                (authTest.rider ? 'rider' : 'none'))
    });
    
    if (!hasRole) {
      console.log('⚠️ User has no assigned role. Attempting to add to admin list...');
      const addResult = addCurrentUserToAdminList();
      results.steps.push({
        step: 'add_to_admin',
        success: addResult.success,
        result: addResult
      });
    }
    
    // Step 3: Test getCurrentUserForAvailability again
    console.log('\n📋 Step 3: Testing fixed authentication...');
    const finalTest = getCurrentUserForAvailability();
    results.steps.push({
      step: 'final_test',
      success: finalTest.success,
      result: finalTest
    });
    
    // Generate summary
    const successfulSteps = results.steps.filter(step => step.success).length;
    results.summary = {
      totalSteps: results.steps.length,
      successfulSteps: successfulSteps,
      status: successfulSteps === results.steps.length ? 'ALL_FIXED' : 'NEEDS_MANUAL_FIX',
      message: successfulSteps === results.steps.length ? 
               'All authentication issues fixed!' : 
               'Some issues remain - check the logs and fix manually'
    };
    
    console.log(`\n✅ Diagnosis complete: ${results.summary.message}`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
    results.error = error.message;
    return results;
  }
}

/**
 * Quick fix function - run this to immediately resolve the undefined issue
 */
function quickFixUndefinedWelcome() {
  console.log('🚀 Applying quick fix for undefined welcome message...');
  
  try {
    // Test current state
    const currentState = getCurrentUserForAvailability();
    console.log('Current state:', JSON.stringify(currentState));
    
    if (currentState.success && currentState.user && currentState.user.name && currentState.user.role) {
      console.log('✅ User authentication is working correctly!');
      console.log(`   User: ${currentState.user.name} (${currentState.user.role})`);
      return {
        success: true,
        message: 'Authentication is working correctly',
        user: currentState.user
      };
    }
    
    // If we get here, there's an issue - run the full diagnostic
    console.log('⚠️ Issues detected, running full diagnostic...');
    return diagnoseAndFixAuth();
    
  } catch (error) {
    console.error('❌ Quick fix failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Instructions for the user
 */
function showInstructions() {
  const instructions = `
🔧 RIDER AVAILABILITY AUTHENTICATION FIX INSTRUCTIONS

To fix the "welcome: undefined (undefined)" issue:

1. Run 'quickFixUndefinedWelcome()' first
   - This will diagnose and attempt to fix the issue automatically

2. If that doesn't work, run 'testAvailabilityAuth()' 
   - This will show you exactly what's happening with authentication

3. If your email is not in the admin/dispatcher lists, run 'addCurrentUserToAdminList()'
   - This will add your email to the admin users list

4. After making changes, reload the rider availability page to test

The fixes include:
- Adding fallback values for undefined user properties
- Ensuring proper role assignment
- Adding diagnostic functions to identify issues
- Improving error handling in the authentication chain

Common issues:
- User email not in Settings sheet admin/dispatcher lists
- Google email not linked to rider record
- Session authentication failing
- Role mapping not working correctly

After running the fixes, the welcome message should show:
"Welcome, [Your Name] ([Your Role])" instead of "undefined (undefined)"
`;
  
  console.log(instructions);
  return instructions;
}
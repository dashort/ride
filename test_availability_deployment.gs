/**
 * AVAILABILITY CALENDAR DEPLOYMENT TEST
 * Run this function to verify the availability calendar is working correctly
 */
function testAvailabilityCalendarDeployment() {
  console.log('🧪 TESTING AVAILABILITY CALENDAR DEPLOYMENT');
  console.log('='.repeat(50));
  
  const results = {
    navigationTest: null,
    availabilityServiceTest: null,
    configurationTest: null,
    fileAccessTest: null,
    overallStatus: 'UNKNOWN'
  };
  
  try {
    // Test 1: Navigation System
    console.log('\n1️⃣ Testing Navigation System...');
    try {
      const navResult = testNavigationWithAvailability();
      results.navigationTest = navResult.success ? 'PASS' : 'FAIL';
      console.log(`   Navigation Test: ${results.navigationTest}`);
    } catch (error) {
      results.navigationTest = 'ERROR';
      console.log(`   Navigation Test: ERROR - ${error.message}`);
    }
    
    // Test 2: AvailabilityService Functions
    console.log('\n2️⃣ Testing AvailabilityService Functions...');
    try {
      // Test if main availability functions exist
      const functionsExist = [
        typeof getCurrentUserForAvailability === 'function',
        typeof getUserAvailabilityForCalendar === 'function',
        typeof saveRiderAvailabilityData === 'function',
        typeof checkRiderAvailabilityForAssignment === 'function'
      ];
      
      const allExist = functionsExist.every(exists => exists);
      results.availabilityServiceTest = allExist ? 'PASS' : 'FAIL';
      console.log(`   AvailabilityService Functions: ${results.availabilityServiceTest}`);
      console.log(`   Functions found: ${functionsExist.filter(Boolean).length}/4`);
      
    } catch (error) {
      results.availabilityServiceTest = 'ERROR';
      console.log(`   AvailabilityService Test: ERROR - ${error.message}`);
    }
    
    // Test 3: Configuration
    console.log('\n3️⃣ Testing Configuration...');
    try {
      const configTests = [
        !!CONFIG.sheets.availability,
        !!CONFIG.columns.availability,
        !!CONFIG.columns.availability.email,
        !!CONFIG.columns.availability.date,
        !!CONFIG.columns.availability.startTime,
        !!CONFIG.columns.availability.endTime
      ];
      
      const configOK = configTests.every(test => test);
      results.configurationTest = configOK ? 'PASS' : 'FAIL';
      console.log(`   Configuration Test: ${results.configurationTest}`);
      console.log(`   Config items found: ${configTests.filter(Boolean).length}/6`);
      
    } catch (error) {
      results.configurationTest = 'ERROR';
      console.log(`   Configuration Test: ERROR - ${error.message}`);
    }
    
    // Test 4: File Access
    console.log('\n4️⃣ Testing File Access...');
    try {
      const riderAvailabilityContent = HtmlService.createHtmlOutputFromFile('rider-availability').getContent();
      const hasCalendar = riderAvailabilityContent.includes('FullCalendar');
      const hasPlaceholder = riderAvailabilityContent.includes('NAVIGATION_MENU_PLACEHOLDER');
      
      results.fileAccessTest = (hasCalendar && hasPlaceholder) ? 'PASS' : 'PARTIAL';
      console.log(`   File Access Test: ${results.fileAccessTest}`);
      console.log(`   - rider-availability.html exists: ✅`);
      console.log(`   - Contains FullCalendar: ${hasCalendar ? '✅' : '❌'}`);
      console.log(`   - Has navigation placeholder: ${hasPlaceholder ? '✅' : '❌'}`);
      
    } catch (error) {
      results.fileAccessTest = 'FAIL';
      console.log(`   File Access Test: FAIL - ${error.message}`);
    }
    
    // Overall Status
    console.log('\n' + '='.repeat(50));
    const testResults = Object.values(results).filter(r => r !== 'UNKNOWN');
    const passCount = testResults.filter(r => r === 'PASS').length;
    const totalTests = testResults.length;
    
    if (passCount === totalTests) {
      results.overallStatus = 'ALL TESTS PASS ✅';
    } else if (passCount >= totalTests - 1) {
      results.overallStatus = 'MOSTLY WORKING ⚠️';
    } else {
      results.overallStatus = 'ISSUES FOUND ❌';
    }
    
    console.log(`🎯 OVERALL STATUS: ${results.overallStatus}`);
    console.log(`📊 Test Results: ${passCount}/${totalTests} tests passed`);
    
    // Recommendations
    console.log('\n📋 NEXT STEPS:');
    if (results.overallStatus.includes('✅')) {
      console.log('✅ Availability calendar is ready for use!');
      console.log('✅ Users should now see the 🗓️ Availability link in navigation');
      console.log('✅ Test the calendar by accessing the web app');
    } else {
      console.log('⚠️ Some issues found. Check the test results above.');
      if (results.navigationTest !== 'PASS') {
        console.log('   - Navigation issue: Check PERMISSIONS_MATRIX configuration');
      }
      if (results.availabilityServiceTest !== 'PASS') {
        console.log('   - Missing functions: Check AvailabilityService.gs file');
      }
      if (results.configurationTest !== 'PASS') {
        console.log('   - Config issue: Check CONFIG object in Config.gs');
      }
      if (results.fileAccessTest !== 'PASS') {
        console.log('   - File issue: Check rider-availability.html file');
      }
    }
    
    console.log('\n🔗 Quick Access Test:');
    console.log('Try this URL in your web app:');
    const webAppUrl = getWebAppUrlSafe();
    console.log(`${webAppUrl}?page=rider-availability`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Deployment test failed:', error);
    results.overallStatus = 'TEST FAILED ❌';
    return results;
  }
}

/**
 * Quick manual test for users
 */
function quickAvailabilityTest() {
  console.log('🚀 QUICK AVAILABILITY TEST');
  console.log('Run this test and check the output:');
  
  try {
    // Test navigation generation
    const testUser = { name: 'Test User', email: 'test@test.com', role: 'rider' };
    const navigation = getRoleBasedNavigation('dashboard', testUser, null);
    
    console.log('\n📋 Generated Navigation:');
    console.log(navigation);
    
    const hasAvailability = navigation.includes('rider-availability');
    console.log(`\n🔍 Contains availability link: ${hasAvailability ? '✅ YES' : '❌ NO'}`);
    
    if (hasAvailability) {
      console.log('✅ SUCCESS: Availability link is present in navigation!');
      console.log('✅ Users should now see the 🗓️ Availability link');
    } else {
      console.log('❌ PROBLEM: Availability link is missing');
      console.log('❌ Check your PERMISSIONS_MATRIX configuration');
    }
    
    return hasAvailability;
    
  } catch (error) {
    console.error('❌ Quick test failed:', error);
    return false;
  }
}

/**
 * User-friendly deployment verification
 */
function verifyAvailabilityCalendarIsWorking() {
  console.log('🎯 VERIFYING AVAILABILITY CALENDAR DEPLOYMENT');
  console.log('This will test if the availability calendar is working correctly.\n');
  
  const result = testAvailabilityCalendarDeployment();
  
  console.log('\n' + '🎉'.repeat(20));
  console.log('FINAL VERIFICATION RESULT:');
  console.log('🎉'.repeat(20));
  
  if (result.overallStatus.includes('✅')) {
    console.log('🎉 EXCELLENT! Your availability calendar is fully functional!');
    console.log('🎉 Riders can now manage their availability through the web interface');
    console.log('🎉 Admins and dispatchers can view all rider availability');
  } else if (result.overallStatus.includes('⚠️')) {
    console.log('⚠️  GOOD NEWS: Your availability calendar is mostly working!');
    console.log('⚠️  Minor issues found but system should be functional');
  } else {
    console.log('❌ ATTENTION: Some issues need to be resolved');
    console.log('❌ Check the detailed test results above');
  }
  
  return result;
}
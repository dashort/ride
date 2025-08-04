/**
 * Comprehensive test script to verify reports functionality
 * Run this from Google Apps Script editor to test all components
 */

function testReportsFullFlow() {
  console.log('🔍 === COMPREHENSIVE REPORTS TEST ===');
  console.log('Testing all components of the reports system...\n');
  
  let testResults = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: { passed: 0, failed: 0, warnings: 0 }
  };
  
  // Test 1: Check if core functions exist
  console.log('1️⃣ Testing function existence...');
  const requiredFunctions = [
    'getPageDataForReports',
    'generateReportData', 
    'debugReportsIssue',
    'authenticateAndAuthorizeUser',
    'getRequestsData',
    'getRidersData'
  ];
  
  requiredFunctions.forEach(funcName => {
    const exists = typeof eval(funcName) === 'function';
    testResults.tests.push({
      name: `Function exists: ${funcName}`,
      passed: exists,
      message: exists ? 'Function found' : 'Function missing'
    });
    
    if (exists) {
      testResults.summary.passed++;
      console.log(`✅ ${funcName}: EXISTS`);
    } else {
      testResults.summary.failed++;
      console.log(`❌ ${funcName}: MISSING`);
    }
  });
  
  // Test 2: Test getPageDataForReports with various scenarios
  console.log('\n2️⃣ Testing getPageDataForReports...');
  
  const testFilters = [
    { name: 'Default filters', startDate: '2024-01-01', endDate: '2025-12-31', requestType: 'All', status: 'All' },
    { name: 'No filters', startDate: null, endDate: null },
    { name: 'Recent dates', startDate: '2024-12-01', endDate: '2024-12-31' },
    { name: 'Empty object', }
  ];
  
  testFilters.forEach(filter => {
    try {
      console.log(`\n  Testing: ${filter.name}`);
      const result = getPageDataForReports(filter);
      
      const isValid = result && 
                     result.success === true && 
                     result.user && 
                     result.reportData &&
                     result.reportData.summary;
      
      testResults.tests.push({
        name: `getPageDataForReports: ${filter.name}`,
        passed: isValid,
        message: isValid ? 'Valid response received' : 'Invalid or missing response',
        details: {
          hasSuccess: !!result?.success,
          hasUser: !!result?.user,
          hasReportData: !!result?.reportData,
          totalRequests: result?.reportData?.summary?.totalRequests
        }
      });
      
      if (isValid) {
        testResults.summary.passed++;
        console.log(`  ✅ ${filter.name}: PASSED`);
        console.log(`     - Total Requests: ${result.reportData.summary.totalRequests}`);
        console.log(`     - Active Riders: ${result.reportData.summary.activeRiders}`);
        console.log(`     - Data Source: ${result.reportData.dataSource}`);
      } else {
        testResults.summary.failed++;
        console.log(`  ❌ ${filter.name}: FAILED`);
        console.log(`     - Result: ${JSON.stringify(result)}`);
      }
      
    } catch (error) {
      testResults.summary.failed++;
      testResults.tests.push({
        name: `getPageDataForReports: ${filter.name}`,
        passed: false,
        message: `Error: ${error.message}`,
        error: error.toString()
      });
      console.log(`  ❌ ${filter.name}: ERROR - ${error.message}`);
    }
  });
  
  // Test 3: Test debugReportsIssue
  console.log('\n3️⃣ Testing debugReportsIssue...');
  try {
    const debugResult = debugReportsIssue();
    const isValidDebug = debugResult && debugResult.success;
    
    testResults.tests.push({
      name: 'debugReportsIssue function',
      passed: isValidDebug,
      message: isValidDebug ? 'Debug function working' : 'Debug function failed',
      details: debugResult
    });
    
    if (isValidDebug) {
      testResults.summary.passed++;
      console.log('✅ debugReportsIssue: PASSED');
    } else {
      testResults.summary.failed++;
      console.log('❌ debugReportsIssue: FAILED');
    }
  } catch (debugError) {
    testResults.summary.failed++;
    testResults.tests.push({
      name: 'debugReportsIssue function',
      passed: false,
      message: `Error: ${debugError.message}`,
      error: debugError.toString()
    });
    console.log(`❌ debugReportsIssue: ERROR - ${debugError.message}`);
  }
  
  // Test 4: Test data access functions
  console.log('\n4️⃣ Testing data access...');
  
  const dataFunctions = [
    { name: 'getRequestsData', func: getRequestsData },
    { name: 'getRidersData', func: getRidersData }
  ];
  
  dataFunctions.forEach(dataFunc => {
    try {
      console.log(`  Testing ${dataFunc.name}...`);
      const data = dataFunc.func();
      
      const hasData = data && 
                     (Array.isArray(data) || 
                      (data.data && Array.isArray(data.data)));
      
      testResults.tests.push({
        name: `Data access: ${dataFunc.name}`,
        passed: hasData,
        message: hasData ? 'Data retrieved successfully' : 'No data or invalid format',
        details: {
          isArray: Array.isArray(data),
          hasDataProperty: !!(data && data.data),
          dataLength: Array.isArray(data) ? data.length : (data?.data?.length || 0)
        }
      });
      
      if (hasData) {
        testResults.summary.passed++;
        const length = Array.isArray(data) ? data.length : data.data.length;
        console.log(`  ✅ ${dataFunc.name}: PASSED (${length} records)`);
      } else {
        testResults.summary.warnings++;
        console.log(`  ⚠️ ${dataFunc.name}: NO DATA (may be expected if sheets are empty)`);
      }
      
    } catch (dataError) {
      testResults.summary.failed++;
      testResults.tests.push({
        name: `Data access: ${dataFunc.name}`,
        passed: false,
        message: `Error: ${dataError.message}`,
        error: dataError.toString()
      });
      console.log(`  ❌ ${dataFunc.name}: ERROR - ${dataError.message}`);
    }
  });
  
  // Test 5: Test authentication
  console.log('\n5️⃣ Testing authentication...');
  try {
    const auth = authenticateAndAuthorizeUser();
    const hasAuth = auth && (auth.user || auth.userName);
    
    testResults.tests.push({
      name: 'Authentication',
      passed: hasAuth,
      message: hasAuth ? 'Authentication working' : 'Authentication failed',
      details: {
        hasUser: !!(auth && auth.user),
        hasUserName: !!(auth && auth.userName),
        authType: typeof auth
      }
    });
    
    if (hasAuth) {
      testResults.summary.passed++;
      console.log('✅ Authentication: PASSED');
      console.log(`   User: ${auth.user?.name || auth.userName || 'Unknown'}`);
    } else {
      testResults.summary.warnings++;
      console.log('⚠️ Authentication: NO USER (may be expected in some environments)');
    }
    
  } catch (authError) {
    testResults.summary.warnings++;
    testResults.tests.push({
      name: 'Authentication',
      passed: false,
      message: `Error: ${authError.message}`,
      error: authError.toString()
    });
    console.log(`⚠️ Authentication: ERROR - ${authError.message} (may be expected)`);
  }
  
  // Final Summary
  console.log('\n📊 === TEST SUMMARY ===');
  console.log(`Total Tests: ${testResults.tests.length}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  console.log(`⚠️ Warnings: ${testResults.summary.warnings}`);
  
  const successRate = Math.round((testResults.summary.passed / testResults.tests.length) * 100);
  console.log(`Success Rate: ${successRate}%`);
  
  if (testResults.summary.failed === 0) {
    console.log('🎉 ALL CRITICAL TESTS PASSED! Reports should be working.');
  } else if (testResults.summary.failed <= 2) {
    console.log('⚠️ Minor issues detected. Reports may work with fallback data.');
  } else {
    console.log('❌ Multiple critical issues detected. Reports need fixes.');
  }
  
  console.log('\n🔧 RECOMMENDATIONS:');
  if (testResults.summary.failed > 0) {
    console.log('1. Review failed tests above');
    console.log('2. Check Google Apps Script permissions');
    console.log('3. Verify spreadsheet access');
    console.log('4. Ensure all .gs files are deployed');
  } else {
    console.log('1. ✅ Backend functions are working correctly');
    console.log('2. ✅ Data access is functional');
    console.log('3. If reports still not loading, check frontend console for errors');
    console.log('4. Ensure reports.html is using the latest version');
  }
  
  return testResults;
}

/**
 * Quick test specifically for the reports page data flow
 */
function quickReportsTest() {
  console.log('🚀 === QUICK REPORTS TEST ===');
  
  try {
    const result = getPageDataForReports({
      startDate: '2024-01-01',
      endDate: '2025-12-31',
      requestType: 'All',
      status: 'All'
    });
    
    console.log('📊 Result Structure:');
    console.log(`- Success: ${result?.success}`);
    console.log(`- Has User: ${!!result?.user}`);
    console.log(`- Has Report Data: ${!!result?.reportData}`);
    console.log(`- Total Requests: ${result?.reportData?.summary?.totalRequests}`);
    console.log(`- Active Riders: ${result?.reportData?.summary?.activeRiders}`);
    console.log(`- Data Source: ${result?.reportData?.dataSource}`);
    
    if (result && result.success && result.reportData) {
      console.log('✅ QUICK TEST PASSED - Reports should work!');
      return { success: true, message: 'Reports function working correctly' };
    } else {
      console.log('❌ QUICK TEST FAILED - Check detailed test');
      return { success: false, message: 'Reports function not working', result: result };
    }
    
  } catch (error) {
    console.log('❌ QUICK TEST ERROR:', error.message);
    return { success: false, message: 'Error in reports function', error: error.message };
  }
}

/**
 * Run this to simulate what the frontend calls
 */
function simulateFrontendCall() {
  console.log('🎭 === SIMULATING FRONTEND CALL ===');
  
  // This exactly mimics what reports.html does
  const filters = {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    requestType: '',
    status: ''
  };
  
  console.log('Calling with filters:', filters);
  
  try {
    const result = getPageDataForReports(filters);
    console.log('Frontend simulation result:', result);
    return result;
  } catch (error) {
    console.log('Frontend simulation error:', error);
    return { error: error.message };
  }
}
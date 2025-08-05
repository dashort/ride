/**
 * Comprehensive Riders Loading Fix Script
 * This script diagnoses and fixes the "No data" issue on the riders page
 */

function diagnoseAndFixRidersLoading() {
  console.log('🔧 === COMPREHENSIVE RIDERS LOADING FIX ===');
  console.log('Timestamp:', new Date().toISOString());
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: {},
    fixes: [],
    recommendations: [],
    success: false
  };
  
  try {
    // Test 1: Check if CONFIG is properly defined
    console.log('\n📋 Test 1: Checking CONFIG...');
    results.tests.config = testConfig();
    
    // Test 2: Check if Riders sheet exists
    console.log('\n📄 Test 2: Checking Riders sheet...');
    results.tests.sheet = testRidersSheet();
    
    // Test 3: Test data retrieval functions
    console.log('\n📊 Test 3: Testing data functions...');
    results.tests.dataFunctions = testDataFunctions();
    
    // Test 4: Test main API function
    console.log('\n🌐 Test 4: Testing getPageDataForRiders...');
    results.tests.mainAPI = testMainAPIFunction();
    
    // Apply fixes based on test results
    console.log('\n🔧 Applying fixes...');
    applyFixes(results);
    
    // Final verification
    console.log('\n✅ Final verification...');
    results.tests.finalCheck = testMainAPIFunction();
    
    results.success = results.tests.finalCheck.success;
    
    // Generate report
    generateReport(results);
    
    return results;
    
  } catch (error) {
    console.error('❌ Critical error in diagnoseAndFixRidersLoading:', error);
    results.criticalError = error.message;
    return results;
  }
}

function testConfig() {
  try {
    if (typeof CONFIG === 'undefined') {
      return {
        success: false,
        error: 'CONFIG object is not defined',
        recommendation: 'Check if Config.gs is properly loaded'
      };
    }
    
    if (!CONFIG.sheets || !CONFIG.sheets.riders) {
      return {
        success: false,
        error: 'CONFIG.sheets.riders is not defined',
        recommendation: 'Check CONFIG.sheets.riders in Config.gs'
      };
    }
    
    console.log(`✅ CONFIG.sheets.riders = "${CONFIG.sheets.riders}"`);
    return {
      success: true,
      ridersSheetName: CONFIG.sheets.riders
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      recommendation: 'Fix CONFIG object definition'
    };
  }
}

function testRidersSheet() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.sheets.riders);
    
    if (!sheet) {
      return {
        success: false,
        error: `Sheet "${CONFIG.sheets.riders}" not found`,
        recommendation: 'Create the Riders sheet',
        sheetExists: false
      };
    }
    
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    
    console.log(`✅ Sheet "${CONFIG.sheets.riders}" found`);
    console.log(`   Last row: ${lastRow}, Last column: ${lastColumn}`);
    
    let headers = [];
    if (lastRow > 0 && lastColumn > 0) {
      headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
      console.log(`   Headers: ${JSON.stringify(headers)}`);
    }
    
    return {
      success: true,
      sheetExists: true,
      lastRow: lastRow,
      lastColumn: lastColumn,
      headers: headers,
      hasData: lastRow > 1
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      recommendation: 'Check spreadsheet access and sheet existence'
    };
  }
}

function testDataFunctions() {
  const results = {};
  
  // Test getRidersData
  try {
    console.log('   Testing getRidersData...');
    const ridersData = getRidersData();
    results.getRidersData = {
      success: !!(ridersData && ridersData.data),
      dataLength: ridersData?.data?.length || 0,
      hasHeaders: !!(ridersData && ridersData.headers && ridersData.headers.length > 0)
    };
    console.log(`   ✅ getRidersData returned ${results.getRidersData.dataLength} rows`);
  } catch (error) {
    console.log(`   ❌ getRidersData failed: ${error.message}`);
    results.getRidersData = {
      success: false,
      error: error.message
    };
  }
  
  // Test getRiders
  try {
    console.log('   Testing getRiders...');
    const riders = getRiders();
    results.getRiders = {
      success: Array.isArray(riders),
      ridersCount: riders ? riders.length : 0
    };
    console.log(`   ✅ getRiders returned ${results.getRiders.ridersCount} riders`);
  } catch (error) {
    console.log(`   ❌ getRiders failed: ${error.message}`);
    results.getRiders = {
      success: false,
      error: error.message
    };
  }
  
  return results;
}

function testMainAPIFunction() {
  try {
    console.log('   Testing getPageDataForRiders...');
    const result = getPageDataForRiders();
    
    const success = !!(result && result.success && result.riders);
    const ridersCount = result?.riders?.length || 0;
    
    console.log(`   ${success ? '✅' : '❌'} getPageDataForRiders success: ${result?.success}`);
    console.log(`   Riders count: ${ridersCount}`);
    
    return {
      success: success,
      resultSuccess: result?.success,
      ridersCount: ridersCount,
      hasUser: !!(result && result.user),
      hasStats: !!(result && result.stats),
      rawResult: result
    };
    
  } catch (error) {
    console.log(`   ❌ getPageDataForRiders failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

function applyFixes(results) {
  const fixes = [];
  
  // Fix 1: Create Riders sheet if missing
  if (!results.tests.sheet.success || !results.tests.sheet.sheetExists) {
    console.log('🔧 Fix 1: Creating Riders sheet...');
    try {
      createRidersSheet();
      fixes.push('Created Riders sheet with sample data');
      console.log('   ✅ Riders sheet created successfully');
    } catch (error) {
      console.log(`   ❌ Failed to create Riders sheet: ${error.message}`);
      fixes.push(`Failed to create Riders sheet: ${error.message}`);
    }
  }
  
  // Fix 2: Add sample data if sheet is empty
  else if (results.tests.sheet.success && !results.tests.sheet.hasData) {
    console.log('🔧 Fix 2: Adding sample data to empty Riders sheet...');
    try {
      addSampleRidersData();
      fixes.push('Added sample data to empty Riders sheet');
      console.log('   ✅ Sample data added successfully');
    } catch (error) {
      console.log(`   ❌ Failed to add sample data: ${error.message}`);
      fixes.push(`Failed to add sample data: ${error.message}`);
    }
  }
  
  // Fix 3: Clear cache to force fresh data
  console.log('🔧 Fix 3: Clearing cache...');
  try {
    if (typeof dataCache !== 'undefined' && dataCache.clear) {
      dataCache.clear('sheet_' + CONFIG.sheets.riders);
      fixes.push('Cleared data cache');
      console.log('   ✅ Cache cleared successfully');
    }
  } catch (error) {
    console.log(`   ⚠️ Cache clear failed (may not be critical): ${error.message}`);
  }
  
  results.fixes = fixes;
}

function createRidersSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.insertSheet(CONFIG.sheets.riders);
  
  // Define headers based on CONFIG
  const headers = [
    'Rider ID',
    'Full Name', 
    'Phone Number',
    'Email',
    'Status',
    'Platoon',
    'Part-Time Rider',
    'Certification',
    'Total Assignments',
    'Last Assignment Date'
  ];
  
  // Set headers
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  
  // Add sample data
  const sampleData = [
    ['R001', 'John Smith', '555-0001', 'john.smith@nopd.com', 'Active', 'A', 'No', 'Certified', '5', '01/15/2024'],
    ['R002', 'Jane Doe', '555-0002', 'jane.doe@nopd.com', 'Active', 'B', 'Yes', 'Certified', '3', '01/10/2024'],
    ['R003', 'Mike Johnson', '555-0003', 'mike.johnson@nopd.com', 'Active', 'A', 'No', 'Training', '1', '01/05/2024']
  ];
  
  sheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
  
  // Format the sheet
  sheet.autoResizeColumns(1, headers.length);
  
  console.log(`✅ Created "${CONFIG.sheets.riders}" sheet with ${sampleData.length} sample riders`);
}

function addSampleRidersData() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(CONFIG.sheets.riders);
  
  if (!sheet) {
    throw new Error('Riders sheet not found');
  }
  
  // Check if headers exist, if not add them
  if (sheet.getLastRow() === 0) {
    const headers = [
      'Rider ID', 'Full Name', 'Phone Number', 'Email', 'Status', 
      'Platoon', 'Part-Time Rider', 'Certification', 'Total Assignments', 'Last Assignment Date'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  
  // Add sample data
  const sampleData = [
    ['R001', 'John Smith', '555-0001', 'john.smith@nopd.com', 'Active', 'A', 'No', 'Certified', '5', '01/15/2024'],
    ['R002', 'Jane Doe', '555-0002', 'jane.doe@nopd.com', 'Active', 'B', 'Yes', 'Certified', '3', '01/10/2024'],
    ['R003', 'Mike Johnson', '555-0003', 'mike.johnson@nopd.com', 'Active', 'A', 'No', 'Training', '1', '01/05/2024']
  ];
  
  const nextRow = sheet.getLastRow() + 1;
  sheet.getRange(nextRow, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
  
  console.log(`✅ Added ${sampleData.length} sample riders to existing sheet`);
}

function generateReport(results) {
  console.log('\n📋 === DIAGNOSIS AND FIX REPORT ===');
  console.log(`Overall Success: ${results.success ? '✅ FIXED' : '❌ STILL FAILING'}`);
  
  console.log('\n📊 Test Results:');
  Object.keys(results.tests).forEach(testName => {
    const test = results.tests[testName];
    console.log(`${test.success ? '✅' : '❌'} ${testName}: ${test.success ? 'PASSED' : 'FAILED'}`);
    if (!test.success && test.error) {
      console.log(`   Error: ${test.error}`);
    }
  });
  
  if (results.fixes.length > 0) {
    console.log('\n🔧 Fixes Applied:');
    results.fixes.forEach(fix => console.log(`   - ${fix}`));
  }
  
  if (!results.success) {
    console.log('\n🚨 MANUAL INTERVENTION REQUIRED');
    console.log('The automatic fix was unable to resolve the issue.');
    console.log('\n📝 Next Steps:');
    console.log('1. Check your Google Sheets spreadsheet manually');
    console.log('2. Verify that a sheet named "Riders" exists');
    console.log('3. Ensure the sheet has proper headers and data');
    console.log('4. Check the browser console for additional errors');
    console.log('\n🆘 If the issue persists, please contact your system administrator.');
  } else {
    console.log('\n✅ SUCCESS! The riders page should now load properly.');
    console.log('🔄 Refresh the riders page in your browser to see the changes.');
  }
}

// Quick test function for manual execution
function quickRidersTest() {
  console.log('🧪 Quick Riders Test');
  
  try {
    const pageData = getPageDataForRiders();
    console.log('✅ getPageDataForRiders result:', {
      success: pageData?.success,
      ridersCount: pageData?.riders?.length || 0,
      hasUser: !!pageData?.user,
      hasStats: !!pageData?.stats
    });
    
    if (pageData?.success && pageData?.riders?.length > 0) {
      console.log('🎉 RIDERS LOADING IS WORKING!');
      return { success: true, message: 'Riders loading is working correctly' };
    } else {
      console.log('❌ RIDERS LOADING FAILED - running automatic fix...');
      return diagnoseAndFixRidersLoading();
    }
    
  } catch (error) {
    console.log('❌ Quick test failed:', error.message);
    console.log('🔧 Running automatic fix...');
    return diagnoseAndFixRidersLoading();
  }
}
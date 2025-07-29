/**
 * Comprehensive Riders Loading Diagnostic Script
 * This script tests every step of the riders loading process to identify the exact issue
 */

function diagnoseRidersLoading() {
  console.log('🔍 Starting comprehensive riders loading diagnosis...');
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: {},
    summary: {
      overallSuccess: false,
      criticalIssues: [],
      recommendations: []
    }
  };
  
  try {
    // Test 1: Check if Riders sheet exists
    console.log('\n📋 Test 1: Checking Riders sheet existence...');
    results.tests.sheetExists = testSheetExists();
    
    // Test 2: Check CONFIG settings
    console.log('\n⚙️ Test 2: Checking CONFIG settings...');
    results.tests.config = testConfigSettings();
    
    // Test 3: Test getRidersData function
    console.log('\n📊 Test 3: Testing getRidersData function...');
    results.tests.getRidersData = testGetRidersData();
    
    // Test 4: Test getRiders function  
    console.log('\n👥 Test 4: Testing getRiders function...');
    results.tests.getRiders = testGetRiders();
    
    // Test 5: Test getPageDataForRiders function
    console.log('\n🌐 Test 5: Testing getPageDataForRiders function...');
    results.tests.getPageDataForRiders = testGetPageDataForRiders();
    
    // Test 6: Test authentication
    console.log('\n🔐 Test 6: Testing authentication...');
    results.tests.authentication = testAuthentication();
    
    // Test 7: Check sheet data structure
    console.log('\n🏗️ Test 7: Checking sheet data structure...');
    results.tests.dataStructure = testDataStructure();
    
    // Analyze results and provide recommendations
    analyzeResults(results);
    
    console.log('\n✅ Diagnosis complete!');
    console.log(JSON.stringify(results, null, 2));
    
    return results;
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
    results.tests.generalError = {
      success: false,
      error: error.message,
      stack: error.stack
    };
    return results;
  }
}

function testSheetExists() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.sheets.riders);
    
    if (!sheet) {
      return {
        success: false,
        error: `Sheet "${CONFIG.sheets.riders}" not found`,
        availableSheets: spreadsheet.getSheets().map(s => s.getName())
      };
    }
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    return {
      success: true,
      sheetName: sheet.getName(),
      lastRow: lastRow,
      lastColumn: lastCol,
      hasData: lastRow > 1,
      dataRows: Math.max(0, lastRow - 1)
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function testConfigSettings() {
  try {
    return {
      success: true,
      sheetName: CONFIG.sheets.riders,
      columns: CONFIG.columns.riders,
      ridersSheetConfig: {
        jpNumber: CONFIG.columns.riders.jpNumber,
        name: CONFIG.columns.riders.name,
        status: CONFIG.columns.riders.status,
        phone: CONFIG.columns.riders.phone,
        email: CONFIG.columns.riders.email
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function testGetRidersData() {
  try {
    const result = getRidersData(false); // Force fresh data
    
    return {
      success: true,
      hasHeaders: !!(result.headers && result.headers.length > 0),
      headerCount: result.headers ? result.headers.length : 0,
      headers: result.headers || [],
      hasData: !!(result.data && result.data.length > 0),
      dataRows: result.data ? result.data.length : 0,
      hasColumnMap: !!(result.columnMap && Object.keys(result.columnMap).length > 0),
      columnMapKeys: result.columnMap ? Object.keys(result.columnMap) : [],
      sampleRow: result.data && result.data.length > 0 ? result.data[0] : null
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function testGetRiders() {
  try {
    const riders = getRiders();
    
    return {
      success: true,
      riderCount: riders.length,
      hasRiders: riders.length > 0,
      sampleRiders: riders.slice(0, 3).map(rider => ({
        jpNumber: rider.jpNumber,
        name: rider.name,
        status: rider.status
      })),
      statusBreakdown: getStatusBreakdown(riders)
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function testGetPageDataForRiders() {
  try {
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      roles: ['admin'],
      permissions: ['view_riders']
    };
    
    const result = getPageDataForRiders(testUser);
    
    return {
      success: result.success,
      hasUser: !!(result.user),
      userName: result.user ? result.user.name : null,
      hasRiders: !!(result.riders && result.riders.length > 0),
      riderCount: result.riders ? result.riders.length : 0,
      hasStats: !!(result.stats),
      stats: result.stats || {},
      error: result.error || null,
      fullResponse: result
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function testAuthentication() {
  try {
    const auth = authenticateAndAuthorizeUser();
    
    return {
      success: auth.success,
      hasUser: !!(auth.user),
      userInfo: auth.user || null,
      error: auth.error || null
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      fallbackWorking: true // We can use fallback user
    };
  }
}

function testDataStructure() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.riders);
    if (!sheet) {
      return { success: false, error: 'Sheet not found' };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length === 0) {
      return { success: false, error: 'No data in sheet' };
    }
    
    const headers = data[0];
    const requiredColumns = [
      CONFIG.columns.riders.jpNumber,
      CONFIG.columns.riders.name,
      CONFIG.columns.riders.status
    ];
    
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    const headerMap = {};
    headers.forEach((header, index) => {
      headerMap[header] = index;
    });
    
    return {
      success: missingColumns.length === 0,
      headers: headers,
      requiredColumns: requiredColumns,
      missingColumns: missingColumns,
      headerMap: headerMap,
      totalRows: data.length,
      dataRows: data.length - 1,
      sampleDataRow: data.length > 1 ? data[1] : null
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function getStatusBreakdown(riders) {
  const breakdown = {};
  riders.forEach(rider => {
    const status = rider.status || 'Unknown';
    breakdown[status] = (breakdown[status] || 0) + 1;
  });
  return breakdown;
}

function analyzeResults(results) {
  const { tests, summary } = results;
  
  // Check for critical issues
  if (!tests.sheetExists.success) {
    summary.criticalIssues.push('Riders sheet does not exist');
    summary.recommendations.push('Create a sheet named "' + CONFIG.sheets.riders + '"');
  }
  
  if (!tests.getRidersData.success) {
    summary.criticalIssues.push('getRidersData function failed');
    summary.recommendations.push('Check sheet permissions and data structure');
  }
  
  if (!tests.getRiders.success) {
    summary.criticalIssues.push('getRiders function failed');
    summary.recommendations.push('Fix getRiders function implementation');
  }
  
  if (!tests.getPageDataForRiders.success) {
    summary.criticalIssues.push('getPageDataForRiders function failed');
    summary.recommendations.push('Check backend function implementation');
  }
  
  if (tests.dataStructure.success && tests.dataStructure.missingColumns.length > 0) {
    summary.criticalIssues.push('Missing required columns: ' + tests.dataStructure.missingColumns.join(', '));
    summary.recommendations.push('Add missing columns to the Riders sheet');
  }
  
  if (tests.getRiders.success && tests.getRiders.riderCount === 0) {
    summary.criticalIssues.push('No riders found in database');
    summary.recommendations.push('Add rider data to the Riders sheet');
  }
  
  // Determine overall success
  summary.overallSuccess = (
    tests.sheetExists.success &&
    tests.getRidersData.success &&
    tests.getRiders.success &&
    tests.getPageDataForRiders.success &&
    tests.dataStructure.success &&
    tests.getRiders.riderCount > 0
  );
  
  if (summary.overallSuccess) {
    summary.recommendations.push('All tests passed! The issue might be in the frontend.');
  }
}

/**
 * Quick test function for immediate results
 */
function quickRidersDiagnosis() {
  console.log('🚀 Quick riders diagnosis...');
  
  try {
    // Test 1: Check sheet
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.riders);
    console.log('Sheet exists:', !!sheet);
    
    if (sheet) {
      console.log('Last row:', sheet.getLastRow());
      console.log('Last column:', sheet.getLastColumn());
    }
    
    // Test 2: Check getRidersData
    const ridersData = getRidersData(false);
    console.log('getRidersData success:', !!ridersData);
    console.log('Data rows:', ridersData.data ? ridersData.data.length : 0);
    
    // Test 3: Check getRiders
    const riders = getRiders();
    console.log('getRiders success:', !!riders);
    console.log('Riders count:', riders.length);
    
    // Test 4: Check getPageDataForRiders
    const pageData = getPageDataForRiders();
    console.log('getPageDataForRiders success:', pageData.success);
    console.log('Page data riders count:', pageData.riders ? pageData.riders.length : 0);
    
    return {
      sheetExists: !!sheet,
      dataRows: ridersData.data ? ridersData.data.length : 0,
      ridersCount: riders.length,
      pageDataSuccess: pageData.success,
      pageDataRidersCount: pageData.riders ? pageData.riders.length : 0
    };
    
  } catch (error) {
    console.error('Quick diagnosis error:', error);
    return { error: error.message };
  }
}
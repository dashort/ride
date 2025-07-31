/**
 * COMPREHENSIVE REPORTS DEBUG SCRIPT
 * Run this script to diagnose why reports show "data unavailable"
 */

function debugReportsDataIssue() {
  debugLog('🔍 === COMPREHENSIVE REPORTS DEBUG ===');
  debugLog('Time:', new Date().toISOString());
  
  const results = {
    environment: {},
    dataAccess: {},
    functions: {},
    sampleData: {},
    recommendations: []
  };
  
  // 1. CHECK ENVIRONMENT
  debugLog('\n1️⃣ CHECKING ENVIRONMENT...');
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    results.environment.spreadsheetAccess = true;
    results.environment.spreadsheetId = ss.getId();
    results.environment.spreadsheetName = ss.getName();
    debugLog('✅ Spreadsheet access: OK');
    debugLog('   ID:', ss.getId());
    debugLog('   Name:', ss.getName());
  } catch (error) {
    results.environment.spreadsheetAccess = false;
    results.environment.error = error.message;
    debugLog('❌ Spreadsheet access: FAILED');
    debugLog('   Error:', error.message);
    results.recommendations.push('Fix spreadsheet access permissions');
  }
  
  // 2. CHECK DATA FUNCTIONS
  debugLog('\n2️⃣ CHECKING DATA FUNCTIONS...');
  
  // Test getRequestsData
  try {
    debugLog('Testing getRequestsData...');
    const requestsData = getRequestsData();
    results.dataAccess.requestsData = {
      success: true,
      rowCount: requestsData?.data?.length || 0,
      hasColumnMap: !!requestsData?.columnMap
    };
    debugLog(`✅ getRequestsData: ${requestsData?.data?.length || 0} rows`);
  } catch (error) {
    results.dataAccess.requestsData = {
      success: false,
      error: error.message
    };
    debugLog('❌ getRequestsData failed:', error.message);
    results.recommendations.push('Fix getRequestsData function or check Requests sheet');
  }
  
  // Test getRidersData  
  try {
    debugLog('Testing getRidersData...');
    const ridersData = getRidersData();
    results.dataAccess.ridersData = {
      success: true,
      rowCount: ridersData?.data?.length || 0,
      hasColumnMap: !!ridersData?.columnMap
    };
    debugLog(`✅ getRidersData: ${ridersData?.data?.length || 0} rows`);
  } catch (error) {
    results.dataAccess.ridersData = {
      success: false,
      error: error.message
    };
    debugLog('❌ getRidersData failed:', error.message);
    results.recommendations.push('Fix getRidersData function or check Riders sheet');
  }
  
  // Test getAssignmentsData
  try {
    debugLog('Testing getAssignmentsData...');
    const assignmentsData = getAssignmentsData();
    results.dataAccess.assignmentsData = {
      success: true,
      rowCount: assignmentsData?.data?.length || 0,
      hasColumnMap: !!assignmentsData?.columnMap
    };
    debugLog(`✅ getAssignmentsData: ${assignmentsData?.data?.length || 0} rows`);
  } catch (error) {
    results.dataAccess.assignmentsData = {
      success: false,
      error: error.message
    };
    debugLog('❌ getAssignmentsData failed:', error.message);
    results.recommendations.push('Fix getAssignmentsData function or check Assignments sheet');
  }
  
  // 3. CHECK MAIN FUNCTIONS
  debugLog('\n3️⃣ CHECKING MAIN FUNCTIONS...');
  
  // Test generateReportData
  try {
    debugLog('Testing generateReportData...');
    const testFilters = {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      requestType: '',
      status: ''
    };
    const reportData = generateReportData(testFilters);
    results.functions.generateReportData = {
      success: true,
      hasData: !!reportData,
      dataType: typeof reportData,
      hasError: reportData?.success === false
    };
    if (reportData?.success === false) {
      results.functions.generateReportData.error = reportData.error;
      debugLog('❌ generateReportData returned error:', reportData.error);
    } else {
      debugLog('✅ generateReportData: OK');
    }
  } catch (error) {
    results.functions.generateReportData = {
      success: false,
      error: error.message
    };
    debugLog('❌ generateReportData failed:', error.message);
    results.recommendations.push('Fix generateReportData function');
  }
  
  // Test getPageDataForReports
  try {
    debugLog('Testing getPageDataForReports...');
    const testFilters = {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      requestType: '',
      status: ''
    };
    const pageData = getPageDataForReports(testFilters);
    results.functions.getPageDataForReports = {
      success: pageData?.success || false,
      hasUser: !!pageData?.user,
      hasReportData: !!pageData?.reportData,
      error: pageData?.error
    };
    if (pageData?.success) {
      debugLog('✅ getPageDataForReports: OK');
    } else {
      debugLog('❌ getPageDataForReports failed:', pageData?.error);
      results.recommendations.push('Fix getPageDataForReports function');
    }
  } catch (error) {
    results.functions.getPageDataForReports = {
      success: false,
      error: error.message
    };
    debugLog('❌ getPageDataForReports failed:', error.message);
    results.recommendations.push('Fix getPageDataForReports function');
  }
  
  // 4. CHECK SAMPLE DATA
  debugLog('\n4️⃣ CHECKING FOR SAMPLE DATA...');
  if (results.dataAccess.requestsData?.success && results.dataAccess.requestsData.rowCount > 0) {
    try {
      const requestsData = getRequestsData();
      const sampleRequest = requestsData.data[0];
      const dateColumn = getColumnValue(sampleRequest, requestsData.columnMap, CONFIG.columns.requests.date);
      results.sampleData.hasSampleRequest = true;
      results.sampleData.sampleDate = dateColumn;
      debugLog('✅ Sample request found with date:', dateColumn);
      
      // Check if dates are in the future (common issue)
      if (dateColumn instanceof Date) {
        const now = new Date();
        const isInFuture = dateColumn > now;
        const isOld = dateColumn < new Date('2020-01-01');
        results.sampleData.dateAnalysis = {
          isInFuture: isInFuture,
          isOld: isOld,
          sampleDate: dateColumn.toISOString().split('T')[0]
        };
        
        if (isInFuture) {
          debugLog('⚠️  Sample date is in the future:', dateColumn);
          results.recommendations.push('Adjust date range to include future dates OR check data entry');
        } else if (isOld) {
          debugLog('⚠️  Sample date is very old:', dateColumn);
          results.recommendations.push('Adjust date range to include older dates OR check data entry');
        } else {
          debugLog('✅ Sample date looks reasonable:', dateColumn);
        }
      }
    } catch (error) {
      debugLog('❌ Error analyzing sample data:', error.message);
    }
  } else {
    results.sampleData.hasSampleRequest = false;
    results.recommendations.push('Add sample data to test reports');
    debugLog('❌ No sample requests found - this is likely the main issue!');
  }
  
  // 5. FINAL RECOMMENDATIONS
  debugLog('\n5️⃣ FINAL DIAGNOSIS & RECOMMENDATIONS...');
  
  const criticalIssues = [];
  if (!results.environment.spreadsheetAccess) criticalIssues.push('Spreadsheet access');
  if (!results.dataAccess.requestsData?.success) criticalIssues.push('Requests data access');
  if (!results.functions.generateReportData?.success) criticalIssues.push('generateReportData function');
  if (!results.functions.getPageDataForReports?.success) criticalIssues.push('getPageDataForReports function');
  if (results.dataAccess.requestsData?.rowCount === 0) criticalIssues.push('No requests data');
  
  if (criticalIssues.length === 0) {
    debugLog('✅ All major components working - issue might be with date range or web app access');
    results.recommendations.push('Check that you are accessing via Google Apps Script web app URL');
    results.recommendations.push('Verify date range includes your actual data dates');
  } else {
    debugLog('❌ Critical issues found:', criticalIssues.join(', '));
  }
  
  debugLog('\n📋 SUMMARY OF RECOMMENDATIONS:');
  results.recommendations.forEach((rec, index) => {
    debugLog(`${index + 1}. ${rec}`);
  });
  
  // 6. PROVIDE SPECIFIC FIXES
  debugLog('\n🔧 SPECIFIC FIXES TO TRY:');
  
  if (results.dataAccess.requestsData?.rowCount === 0) {
    debugLog('🎯 MAIN ISSUE: No data in Requests sheet');
    debugLog('   → Add some sample requests to the Requests sheet');
    debugLog('   → Or check if data is in a different sheet');
  }
  
  if (!results.functions.getPageDataForReports?.success) {
    debugLog('🎯 MAIN ISSUE: getPageDataForReports function failing');
    debugLog('   → Check the function exists in AppServices.gs or Code.gs');
    debugLog('   → Check for syntax errors in the function');
  }
  
  if (!results.environment.spreadsheetAccess) {
    debugLog('🎯 MAIN ISSUE: Cannot access spreadsheet');
    debugLog('   → Check script is bound to correct spreadsheet');
    debugLog('   → Check spreadsheet permissions');
  }
  
  debugLog('\n🌐 WEB APP ACCESS CHECK:');
  debugLog('Make sure you are accessing reports via the web app URL that looks like:');
  debugLog('https://script.google.com/macros/s/{SCRIPT_ID}/exec');
  debugLog('NOT a file:// URL or Apps Script editor preview');
  
  return results;
}

/**
 * Quick fix to test if reports work with minimal data
 */
function testReportsWithMinimalData() {
  debugLog('🧪 Testing reports with minimal data...');
  
  try {
    // Test with a wide date range
    const filters = {
      startDate: '2020-01-01',
      endDate: '2030-12-31',
      requestType: '',
      status: ''
    };
    
    const result = getPageDataForReports(filters);
    debugLog('Test result:', result);
    
    if (result?.success) {
      debugLog('✅ Reports function works - issue is likely data or date range');
      return { success: true, message: 'Function works, check date range and data' };
    } else {
      debugLog('❌ Reports function failing:', result?.error);
      return { success: false, error: result?.error };
    }
  } catch (error) {
    debugLog('❌ Reports function error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Create sample data for testing
 */
function createSampleDataForReports() {
  debugLog('📝 Creating sample data for reports testing...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Check if Requests sheet exists
    let requestsSheet = ss.getSheetByName('Requests');
    if (!requestsSheet) {
      debugLog('Creating Requests sheet...');
      requestsSheet = ss.insertSheet('Requests');
    }
    
    // Add headers if empty
    const lastRow = requestsSheet.getLastRow();
    if (lastRow === 0) {
      const headers = [
        'Request ID', 'Date', 'Requester Name', 'Requester Email', 
        'Type', 'Status', 'Pickup Location', 'Destination', 
        'Pickup Time', 'Notes', 'Assigned Rider'
      ];
      requestsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    // Add sample data
    const today = new Date();
    const sampleData = [
      ['REQ001', today, 'John Doe', 'john@example.com', 'Transport', 'Completed', 'Campus A', 'Campus B', '10:00 AM', 'Test request', 'Rider1'],
      ['REQ002', new Date(today.getTime() - 24*60*60*1000), 'Jane Smith', 'jane@example.com', 'Escort', 'Completed', 'Library', 'Parking Lot', '2:00 PM', 'Test escort', 'Rider2'],
      ['REQ003', new Date(today.getTime() - 2*24*60*60*1000), 'Bob Johnson', 'bob@example.com', 'Transport', 'Pending', 'Building C', 'Building D', '11:30 AM', 'Test pending', '']
    ];
    
    requestsSheet.getRange(lastRow + 1, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
    
    debugLog('✅ Sample data created successfully');
    debugLog('   Added 3 sample requests');
    debugLog('   Date range:', new Date(today.getTime() - 2*24*60*60*1000).toDateString(), 'to', today.toDateString());
    
    return { success: true, message: 'Sample data created' };
    
  } catch (error) {
    debugLog('❌ Error creating sample data:', error.message);
    return { success: false, error: error.message };
  }
}
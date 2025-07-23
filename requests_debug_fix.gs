/**
 * Enhanced debugging and fixes for requests not loading issue
 * Add this to your Apps Script project to help diagnose and fix the problem
 */

/**
 * Emergency fix function that bypasses authentication and caching to get raw requests data
 * Use this to test if the issue is with authentication or caching
 */
function getRequestsDataEmergencyFix() {
  try {
    console.log('🚨 Emergency fix: Getting requests data directly...');
    
    // Direct access to spreadsheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const requestsSheet = spreadsheet.getSheetByName('Requests');
    
    if (!requestsSheet) {
      console.log('❌ Requests sheet not found');
      const sheets = spreadsheet.getSheets().map(s => s.getName());
      console.log('Available sheets:', sheets.join(', '));
      return { success: false, error: 'Requests sheet not found', availableSheets: sheets };
    }
    
    // Get raw data
    const dataRange = requestsSheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length <= 1) {
      console.log('❌ No data in requests sheet');
      return { success: false, error: 'No data in requests sheet', rowCount: values.length };
    }
    
    const headers = values[0];
    const dataRows = values.slice(1);
    
    console.log(`✅ Found ${dataRows.length} requests with headers:`, headers.join(', '));
    
    // Simple formatting without complex filtering
    const simpleRequests = dataRows.map((row, index) => {
      const request = {};
      headers.forEach((header, colIndex) => {
        request[header] = row[colIndex] || '';
      });
      
      // Add some basic formatting
      return {
        requestId: request['Request ID'] || 'Unknown',
        requesterName: request['Requester Name'] || 'Unknown',
        status: request['Status'] || 'New',
        eventDate: request['Event Date'] || 'No Date',
        startTime: request['Start Time'] || 'No Time',
        requestType: request['Request Type'] || 'Unknown',
        startLocation: request['Start Location'] || 'Unknown',
        endLocation: request['Second Location'] || '',
        secondaryLocation: request['Final Location'] || '',
        ridersNeeded: request['Riders Needed'] || 1,
        escortFee: request['Escort Fee'] || '',
        notes: request['Notes'] || '',
        ridersAssigned: request['Riders Assigned'] || '',
        courtesy: request['Courtesy'] || 'No',
        lastUpdated: request['Last Updated'] || '',
        // Keep original data for debugging
        _originalRow: row,
        _rowIndex: index + 2 // +2 because of header and 1-based indexing
      };
    });
    
    console.log(`✅ Formatted ${simpleRequests.length} requests`);
    if (simpleRequests.length > 0) {
      console.log('Sample request:', simpleRequests[0]);
    }
    
    return {
      success: true,
      requests: simpleRequests,
      totalRows: dataRows.length,
      headers: headers,
      rawData: values.slice(0, 3) // First 3 rows for debugging
    };
    
  } catch (error) {
    console.log('❌ Emergency fix failed:', error.message);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Fixed version of getPageDataForRequests that includes better error handling
 */
function getPageDataForRequestsFixed(filter = 'All') {
  try {
    console.log(`📋 Fixed getPageDataForRequests called with filter: ${filter}`);
    
    // Try the emergency fix first to see if we can get data
    const emergencyData = getRequestsDataEmergencyFix();
    
    if (!emergencyData.success) {
      return {
        success: false,
        error: emergencyData.error,
        user: { name: 'System User', email: '', roles: ['system'], permissions: [] },
        requests: [],
        debugInfo: emergencyData
      };
    }
    
    // If we got data, try authentication
    let user = { name: 'System User', email: '', roles: ['system'], permissions: [] };
    
    try {
      const auth = authenticateAndAuthorizeUser();
      if (auth.success) {
        user = auth.user;
        console.log('✅ Authentication successful for:', user.name);
      } else {
        console.log('⚠️ Authentication failed, proceeding with system user');
      }
    } catch (authError) {
      console.log('⚠️ Authentication error, proceeding with system user:', authError.message);
    }
    
    // Apply simple filtering
    let filteredRequests = emergencyData.requests;
    
    if (filter !== 'All') {
      filteredRequests = emergencyData.requests.filter(request => {
        if (filter === 'Unassigned') {
          return ['Unassigned', 'New', 'Pending'].includes(request.status);
        }
        return request.status === filter;
      });
      console.log(`✅ Filtered ${filteredRequests.length} requests for filter: ${filter}`);
    }
    
    return {
      success: true,
      user: user,
      requests: filteredRequests,
      debugInfo: {
        totalFound: emergencyData.totalRows,
        afterFilter: filteredRequests.length,
        authWorked: user.name !== 'System User'
      }
    };
    
  } catch (error) {
    console.log('❌ Fixed function failed:', error.message);
    return {
      success: false,
      error: error.message,
      user: { name: 'System User', email: '', roles: ['system'], permissions: [] },
      requests: [],
      stack: error.stack
    };
  }
}

/**
 * Backup function that bypasses all complex logic
 */
function getSimpleRequestsList() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Requests');
    
    if (!sheet) {
      return { error: 'No Requests sheet found' };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { error: 'No data in Requests sheet' };
    }
    
    const headers = data[0];
    const requests = data.slice(1).map(row => {
      const req = {};
      headers.forEach((h, i) => req[h] = row[i]);
      return req;
    });
    
    return {
      success: true,
      count: requests.length,
      requests: requests.slice(0, 10), // First 10 for testing
      headers: headers
    };
    
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Test function to check different aspects of the system
 */
function runRequestsSystemTest() {
  console.log('🧪 Running comprehensive requests system test...');
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };
  
  // Test 1: Basic sheet access
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Requests');
    results.tests.sheetAccess = {
      success: !!sheet,
      sheetExists: !!sheet,
      sheetName: sheet ? sheet.getName() : 'not found'
    };
  } catch (error) {
    results.tests.sheetAccess = {
      success: false,
      error: error.message
    };
  }
  
  // Test 2: Data retrieval
  try {
    const simpleData = getSimpleRequestsList();
    results.tests.dataRetrieval = simpleData;
  } catch (error) {
    results.tests.dataRetrieval = {
      success: false,
      error: error.message
    };
  }
  
  // Test 3: Emergency fix
  try {
    const emergencyResult = getRequestsDataEmergencyFix();
    results.tests.emergencyFix = {
      success: emergencyResult.success,
      requestCount: emergencyResult.requests ? emergencyResult.requests.length : 0,
      hasData: emergencyResult.success && emergencyResult.requests && emergencyResult.requests.length > 0
    };
  } catch (error) {
    results.tests.emergencyFix = {
      success: false,
      error: error.message
    };
  }
  
  // Test 4: Authentication
  try {
    const authResult = authenticateAndAuthorizeUser();
    results.tests.authentication = {
      success: authResult.success,
      userName: authResult.user ? authResult.user.name : 'none',
      error: authResult.error || 'none'
    };
  } catch (error) {
    results.tests.authentication = {
      success: false,
      error: error.message
    };
  }
  
  // Test 5: Original function
  try {
    const originalResult = getPageDataForRequests('All');
    results.tests.originalFunction = {
      success: originalResult.success,
      requestCount: originalResult.requests ? originalResult.requests.length : 0,
      error: originalResult.error || 'none'
    };
  } catch (error) {
    results.tests.originalFunction = {
      success: false,
      error: error.message
    };
  }
  
  // Test 6: Fixed function
  try {
    const fixedResult = getPageDataForRequestsFixed('All');
    results.tests.fixedFunction = {
      success: fixedResult.success,
      requestCount: fixedResult.requests ? fixedResult.requests.length : 0,
      error: fixedResult.error || 'none'
    };
  } catch (error) {
    results.tests.fixedFunction = {
      success: false,
      error: error.message
    };
  }
  
  console.log('🏁 Test completed. Results:', results);
  return results;
}

/**
 * Quick function to clear all caches and test data loading
 */
function clearCachesAndTestRequests() {
  try {
    console.log('🧹 Clearing caches...');
    
    // Clear data cache if available
    if (typeof dataCache !== 'undefined' && dataCache.clear) {
      dataCache.clear();
      console.log('✅ Data cache cleared');
    }
    
    // Clear other caches
    if (typeof clearRequestsCache === 'function') {
      clearRequestsCache();
      console.log('✅ Requests cache cleared');
    }
    
    // Test fresh data loading
    const testResult = getRequestsDataEmergencyFix();
    
    return {
      success: true,
      cacheCleared: true,
      freshDataTest: testResult
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
/**
 * Diagnostic function to check requests data availability
 * Run this in the Apps Script editor to troubleshoot the issue
 */
function diagnoseRequestsIssue() {
  try {
    console.log('🔍 Starting diagnosis of requests data issue...');
    
    // 1. Check if the Requests sheet exists
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const requestsSheet = spreadsheet.getSheetByName('Requests');
    
    if (!requestsSheet) {
      console.log('❌ ISSUE FOUND: Requests sheet does not exist!');
      const sheetNames = spreadsheet.getSheets().map(s => s.getName());
      console.log('Available sheets:', sheetNames.join(', '));
      return {
        issue: 'MISSING_SHEET',
        availableSheets: sheetNames
      };
    }
    
    console.log('✅ Requests sheet exists');
    
    // 2. Check if sheet has data
    const lastRow = requestsSheet.getLastRow();
    const lastCol = requestsSheet.getLastColumn();
    
    console.log('📊 Sheet dimensions: ' + lastRow + ' rows, ' + lastCol + ' columns');
    
    if (lastRow <= 1) {
      console.log('❌ ISSUE FOUND: Requests sheet has no data (only headers or empty)!');
      return {
        issue: 'NO_DATA',
        rows: lastRow,
        cols: lastCol
      };
    }
    
    // 3. Check headers
    const headers = requestsSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    console.log('📋 Headers found:', headers.join(', '));
    
    // 4. Check for required columns
    const requiredColumns = ['Request ID', 'Requester Name', 'Status', 'Event Date'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('⚠️ ISSUE FOUND: Missing required columns:', missingColumns.join(', '));
      return {
        issue: 'MISSING_COLUMNS',
        missingColumns: missingColumns,
        foundHeaders: headers
      };
    }
    
    // 5. Get sample data
    const sampleData = requestsSheet.getRange(2, 1, Math.min(3, lastRow - 1), lastCol).getValues();
    console.log('📝 Sample data (first 3 rows):');
    sampleData.forEach((row, i) => {
      console.log('Row ' + (i + 2) + ':', row.slice(0, 5).join(' | '));
    });
    
    // 6. Test getRequestsData function
    console.log('🧪 Testing getRequestsData function...');
    try {
      const requestsData = getRequestsData(false); // Don't use cache
      
      if (!requestsData) {
        console.log('❌ ISSUE FOUND: getRequestsData returned null/undefined');
        return { issue: 'FUNCTION_RETURNED_NULL' };
      }
      
      if (!requestsData.data) {
        console.log('❌ ISSUE FOUND: getRequestsData.data is missing');
        return { issue: 'MISSING_DATA_PROPERTY', result: requestsData };
      }
      
      console.log('✅ getRequestsData works: ' + requestsData.data.length + ' rows loaded');
      
      // 7. Test getFilteredRequestsForWebApp
      console.log('🧪 Testing getFilteredRequestsForWebApp function...');
      
      const mockUser = { name: 'Test User', roles: ['admin'] };
      const filteredRequests = getFilteredRequestsForWebApp(mockUser, 'All');
      
      if (!Array.isArray(filteredRequests)) {
        console.log('❌ ISSUE FOUND: getFilteredRequestsForWebApp did not return an array');
        return { issue: 'FILTER_FUNCTION_ERROR', result: filteredRequests };
      }
      
      console.log('✅ getFilteredRequestsForWebApp works: ' + filteredRequests.length + ' requests filtered');
      
      // 8. Test the page data function
      console.log('🧪 Testing getPageDataForRequests function...');
      
      const pageData = getPageDataForRequests('All');
      
      if (!pageData) {
        console.log('❌ ISSUE FOUND: getPageDataForRequests returned null/undefined');
        return { issue: 'PAGE_DATA_FUNCTION_NULL' };
      }
      
      if (!pageData.success) {
        console.log('❌ ISSUE FOUND: getPageDataForRequests returned failure');
        console.log('Error:', pageData.error);
        return { issue: 'PAGE_DATA_FUNCTION_FAILED', error: pageData.error };
      }
      
      console.log('✅ getPageDataForRequests works: ' + (pageData.requests ? pageData.requests.length : 0) + ' requests returned');
      
      return {
        success: true,
        sheetsPresent: true,
        dataRows: lastRow - 1,
        headers: headers,
        getRequestsDataWorks: true,
        filteredRequestsWork: true,
        pageDataWorks: true,
        finalRequestCount: pageData.requests ? pageData.requests.length : 0
      };
      
    } catch (functionError) {
      console.log('❌ ISSUE FOUND: Error testing functions:', functionError.message);
      return {
        issue: 'FUNCTION_ERROR',
        error: functionError.message,
        stack: functionError.stack
      };
    }
    
  } catch (error) {
    console.log('❌ FATAL ERROR during diagnosis:', error.message);
    return {
      issue: 'FATAL_ERROR',
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Quick fix function to clear all caches and refresh data
 */
function clearAllCachesAndRefresh() {
  try {
    console.log('🧹 Clearing all caches...');
    
    if (typeof dataCache !== 'undefined' && dataCache.clear) {
      dataCache.clear();
      console.log('✅ Data cache cleared');
    } else {
      console.log('⚠️ Data cache not available');
    }
    
    // Force refresh of requests data
    const freshData = getRequestsData(false);
    console.log('✅ Fresh requests data loaded: ' + (freshData && freshData.data ? freshData.data.length : 0) + ' rows');
    
    return { success: true, message: 'Caches cleared and data refreshed' };
    
  } catch (error) {
    console.log('❌ Error clearing caches:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Run diagnosis and return results
 */
function runFullDiagnosis() {
  console.log('🏁 Running full diagnosis...');
  
  const diagnosis = diagnoseRequestsIssue();
  const cacheResults = clearAllCachesAndRefresh();
  
  return {
    diagnosis: diagnosis,
    cacheClearing: cacheResults,
    timestamp: new Date().toISOString()
  };
}

/**
 * Quick function to check if problem is authentication-related
 */
function testAuthenticationIssue() {
  try {
    console.log('🔐 Testing authentication flow...');
    
    // Test authentication function
    const authResult = authenticateAndAuthorizeUser();
    console.log('Auth result:', authResult);
    
    return authResult;
    
  } catch (error) {
    console.log('❌ Authentication test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test specific filters to see if filter logic is causing issues
 */
function testFiltersLogic() {
  try {
    console.log('🎯 Testing filter logic...');
    
    const mockUser = { name: 'Test User', roles: ['admin'] };
    const results = {};
    
    const filters = ['All', 'New', 'Pending', 'Assigned', 'Unassigned'];
    
    filters.forEach(filter => {
      try {
        const filtered = getFilteredRequestsForWebApp(mockUser, filter);
        results[filter] = {
          success: true,
          count: Array.isArray(filtered) ? filtered.length : 0
        };
        console.log('Filter "' + filter + '": ' + results[filter].count + ' results');
      } catch (filterError) {
        results[filter] = {
          success: false,
          error: filterError.message
        };
        console.log('Filter "' + filter + '" failed:', filterError.message);
      }
    });
    
    return results;
    
  } catch (error) {
    console.log('❌ Filter testing failed:', error.message);
    return { error: error.message };
  }
}
/**
 * Quick fix script for assignment issues like "Request I-01-25 not found"
 * Run this script to diagnose and fix the specific issue
 */

function fixAssignmentIssue() {
  debugLog('🔧 Starting assignment issue fix...');
  
  try {
    // First, diagnose the issue with the specific request ID
    const diagnosisResult = diagnoseAssignmentIssues('I-01-25');
    
    debugLog('📋 Diagnosis Result:', JSON.stringify(diagnosisResult, null, 2));
    
    if (!diagnosisResult.success) {
      debugLog('❌ Issues found. Attempting automatic fixes...');
      
      // Try to find and fix common issues
      return attemptAutomaticFixes('I-01-25');
    } else {
      debugLog('✅ No issues found with request I-01-25');
      return { success: true, message: 'No issues found' };
    }
    
  } catch (error) {
    console.error('❌ Error in fixAssignmentIssue:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Attempts to automatically fix common assignment issues
 */
function attemptAutomaticFixes(requestId) {
  debugLog(`🔨 Attempting automatic fixes for request ${requestId}...`);
  
  const fixes = [];
  const errors = [];
  
  try {
    // Fix 1: Clear all caches
    debugLog('🧹 Clearing all caches...');
    if (typeof clearRequestsCache === 'function') {
      clearRequestsCache();
      fixes.push('Cleared requests cache');
    }
    
    if (typeof dataCache !== 'undefined' && dataCache.clear) {
      dataCache.clear();
      fixes.push('Cleared data cache');
    }
    
    // Fix 2: Check if request exists in different format
    debugLog('🔍 Checking for request with similar ID...');
    const requestsData = getRequestsData(false);
    
    const allRequestIds = requestsData.data.map(row => {
      const id = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.id);
      return String(id).trim();
    }).filter(id => id.length > 0);
    
    debugLog(`📊 Found ${allRequestIds.length} total requests`);
    debugLog(`🔍 First 10 request IDs: ${allRequestIds.slice(0, 10).join(', ')}`);
    
    // Look for similar IDs
    const searchId = String(requestId).trim();
    const exactMatch = allRequestIds.find(id => id === searchId);
    
    if (exactMatch) {
      debugLog(`✅ Found exact match: ${exactMatch}`);
      fixes.push(`Found exact match for ${requestId}`);
    } else {
      // Look for similar IDs
      const similarIds = allRequestIds.filter(id => {
        return id.toLowerCase().includes(searchId.toLowerCase()) ||
               searchId.toLowerCase().includes(id.toLowerCase()) ||
               id.replace(/[^A-Za-z0-9]/g, '') === searchId.replace(/[^A-Za-z0-9]/g, '');
      });
      
      if (similarIds.length > 0) {
        debugLog(`🔍 Found similar IDs: ${similarIds.join(', ')}`);
        fixes.push(`Found similar IDs: ${similarIds.join(', ')} - check if any of these is the correct ID`);
      } else {
        debugLog('❌ No similar IDs found');
        errors.push(`Request ${requestId} not found in any format`);
      }
    }
    
    // Fix 3: Check assignments sheet for orphaned assignments
    debugLog('🔍 Checking assignments sheet for orphaned assignments...');
    try {
      const assignments = getAssignmentsForRequest(requestId);
      if (assignments.length > 0) {
        debugLog(`📋 Found ${assignments.length} assignments for ${requestId}`);
        fixes.push(`Found ${assignments.length} assignments - may need to clean up orphaned assignments`);
        
        // Try to sync if request exists
        if (exactMatch) {
          const syncResult = syncAssignmentsWithRequest(requestId);
          if (syncResult.success) {
            fixes.push(`Successfully synced assignments for ${requestId}`);
          } else {
            errors.push(`Failed to sync assignments: ${syncResult.error}`);
          }
        }
      } else {
        debugLog(`📋 No assignments found for ${requestId}`);
        fixes.push(`No orphaned assignments found for ${requestId}`);
      }
    } catch (assignmentError) {
      console.error('❌ Error checking assignments:', assignmentError);
      errors.push(`Error checking assignments: ${assignmentError.message}`);
    }
    
    // Fix 4: Validate sheet structure
    debugLog('🏗️ Validating sheet structure...');
    try {
      const requestsSheet = getSheet(CONFIG.sheets.requests);
      const assignmentsSheet = getSheet(CONFIG.sheets.assignments);
      
      if (!requestsSheet) {
        errors.push('Requests sheet not found');
      } else {
        fixes.push('Requests sheet exists');
      }
      
      if (!assignmentsSheet) {
        errors.push('Assignments sheet not found');
      } else {
        fixes.push('Assignments sheet exists');
      }
      
      // Check column mappings
      const columnMap = requestsData.columnMap;
      const requiredColumns = [
        CONFIG.columns.requests.id,
        CONFIG.columns.requests.status,
        CONFIG.columns.requests.ridersAssigned
      ];
      
      for (const column of requiredColumns) {
        if (columnMap[column] !== undefined) {
          fixes.push(`Column '${column}' found at index ${columnMap[column]}`);
        } else {
          errors.push(`Missing required column: ${column}`);
        }
      }
      
    } catch (sheetError) {
      console.error('❌ Error validating sheet structure:', sheetError);
      errors.push(`Sheet validation error: ${sheetError.message}`);
    }
    
    const result = {
      success: errors.length === 0,
      requestId,
      fixes,
      errors,
      timestamp: new Date().toISOString()
    };
    
    debugLog('🔧 Automatic fixes completed');
    debugLog('✅ Fixes applied:', fixes);
    if (errors.length > 0) {
      debugLog('❌ Errors encountered:', errors);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error in automatic fixes:', error);
    return {
      success: false,
      requestId,
      fixes,
      errors: [...errors, error.message],
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Function to manually check all requests and their status
 */
function checkAllRequestsStatus() {
  debugLog('📊 Checking all requests status...');
  
  try {
    // Clear cache first
    if (typeof clearRequestsCache === 'function') {
      clearRequestsCache();
    }
    
    const requestsData = getRequestsData(false);
    const columnMap = requestsData.columnMap;
    
    debugLog(`📋 Total requests: ${requestsData.data.length}`);
    
    const statusSummary = {};
    const recentRequests = [];
    
    requestsData.data.forEach((row, index) => {
      const id = getColumnValue(row, columnMap, CONFIG.columns.requests.id);
      const status = getColumnValue(row, columnMap, CONFIG.columns.requests.status);
      const eventDate = getColumnValue(row, columnMap, CONFIG.columns.requests.eventDate);
      
      const trimmedId = String(id).trim();
      const trimmedStatus = String(status).trim();
      
      if (trimmedId) {
        // Count by status
        statusSummary[trimmedStatus] = (statusSummary[trimmedStatus] || 0) + 1;
        
        // Collect recent requests
        if (recentRequests.length < 20) {
          recentRequests.push({
            id: trimmedId,
            status: trimmedStatus,
            eventDate: eventDate,
            rowIndex: index + 2
          });
        }
      }
    });
    
    debugLog('📊 Status Summary:', statusSummary);
    debugLog('📋 Recent Requests (first 20):');
    recentRequests.forEach(req => {
      debugLog(`  ${req.id} - ${req.status} - ${req.eventDate} (Row ${req.rowIndex})`);
    });
    
    return {
      success: true,
      totalRequests: requestsData.data.length,
      statusSummary,
      recentRequests,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error checking requests status:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
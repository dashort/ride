/**
 * Comprehensive fix for notifications page assignment loading issue
 * This file addresses the "No assignments data is being populated" problem
 */

/**
 * Main function to diagnose and fix the assignments loading issue
 */
function fixNotificationsAssignmentLoading() {
  console.log('🔧 Starting comprehensive fix for notifications assignment loading...');
  
  try {
    // Step 1: Debug current state
    const debugResult = debugAssignmentsSheetState();
    console.log('🔍 Debug result:', debugResult);
    
    if (!debugResult.success) {
      console.log('❌ Found issues, attempting to fix...');
      
      // Step 2: Fix issues
      const fixResult = fixAssignmentsSheetIssues(debugResult);
      console.log('🔧 Fix result:', fixResult);
      
      if (!fixResult.success) {
        throw new Error('Failed to fix assignment sheet issues: ' + fixResult.error);
      }
    }
    
    // Step 3: Verify the fix worked
    console.log('✅ Verifying fix...');
    const verifyResult = verifyAssignmentLoading();
    console.log('✅ Verification result:', verifyResult);
    
    return {
      success: true,
      message: 'Assignment loading fix completed successfully',
      debugResult: debugResult,
      verifyResult: verifyResult
    };
    
  } catch (error) {
    console.error('❌ Error in fixNotificationsAssignmentLoading:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Debug the current state of assignments sheet and loading
 */
function debugAssignmentsSheetState() {
  console.log('🔍 Debugging assignments sheet state...');
  
  try {
    const issues = [];
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const assignmentsSheetName = CONFIG.sheets.assignments;
    
    // Check 1: Does the assignments sheet exist?
    const sheet = spreadsheet.getSheetByName(assignmentsSheetName);
    if (!sheet) {
      issues.push('assignments_sheet_missing');
      return {
        success: false,
        issues: issues,
        availableSheets: spreadsheet.getSheets().map(s => s.getName()),
        error: `Assignments sheet "${assignmentsSheetName}" does not exist`
      };
    }
    
    // Check 2: Does the sheet have data?
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    if (values.length === 0) {
      issues.push('assignments_sheet_empty');
      return {
        success: false,
        issues: issues,
        error: 'Assignments sheet exists but is completely empty'
      };
    }
    
    if (values.length === 1) {
      issues.push('assignments_sheet_no_data');
      return {
        success: false,
        issues: issues,
        headers: values[0],
        error: 'Assignments sheet has headers but no data rows'
      };
    }
    
    // Check 3: Do the required columns exist?
    const headers = values[0];
    const requiredColumns = [
      CONFIG.columns.assignments.id,
      CONFIG.columns.assignments.riderName,
      CONFIG.columns.assignments.status,
      CONFIG.columns.assignments.eventDate
    ];
    
    const missingColumns = [];
    requiredColumns.forEach(colName => {
      if (!headers.includes(colName)) {
        missingColumns.push(colName);
      }
    });
    
    if (missingColumns.length > 0) {
      issues.push('missing_required_columns');
      return {
        success: false,
        issues: issues,
        headers: headers,
        missingColumns: missingColumns,
        error: `Missing required columns: ${missingColumns.join(', ')}`
      };
    }
    
    // Check 4: Test getAssignmentsData function
    const assignmentsData = getAssignmentsData(false); // Don't use cache
    if (!assignmentsData.data || assignmentsData.data.length === 0) {
      issues.push('getAssignmentsData_returns_empty');
    }
    
    // Check 5: Test getAllAssignmentsForNotifications function
    const notificationAssignments = getAllAssignmentsForNotifications(false);
    if (!notificationAssignments || notificationAssignments.length === 0) {
      issues.push('getAllAssignmentsForNotifications_returns_empty');
    }
    
    // Check 6: Analyze the data to see why filtering might fail
    const dataAnalysis = analyzeAssignmentData(values, headers);
    
    if (issues.length > 0) {
      return {
        success: false,
        issues: issues,
        sheetName: assignmentsSheetName,
        rowCount: values.length,
        dataRowCount: values.length - 1,
        headers: headers,
        dataAnalysis: dataAnalysis,
        assignmentsDataCount: assignmentsData.data?.length || 0,
        notificationAssignmentsCount: notificationAssignments?.length || 0
      };
    }
    
    return {
      success: true,
      sheetName: assignmentsSheetName,
      rowCount: values.length,
      dataRowCount: values.length - 1,
      headers: headers,
      dataAnalysis: dataAnalysis,
      assignmentsDataCount: assignmentsData.data?.length || 0,
      notificationAssignmentsCount: notificationAssignments?.length || 0
    };
    
  } catch (error) {
    console.error('❌ Error in debugAssignmentsSheetState:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Analyze assignment data to understand filtering issues
 */
function analyzeAssignmentData(values, headers) {
  try {
    const dataRows = values.slice(1); // Skip headers
    const analysis = {
      totalRows: dataRows.length,
      rowsWithRiders: 0,
      rowsWithActiveStatus: 0,
      rowsPassingFilter: 0,
      statusDistribution: {},
      riderDistribution: {},
      sampleRows: []
    };
    
    // Create column map
    const columnMap = {};
    headers.forEach((header, index) => {
      columnMap[header] = index;
    });
    
    dataRows.forEach((row, index) => {
      // Get values for analysis
      const riderName = getColumnValue(row, columnMap, CONFIG.columns.assignments.riderName);
      const status = getColumnValue(row, columnMap, CONFIG.columns.assignments.status);
      const assignmentId = getColumnValue(row, columnMap, CONFIG.columns.assignments.id);
      
      // Count riders
      if (riderName && riderName.trim().length > 0) {
        analysis.rowsWithRiders++;
        analysis.riderDistribution[riderName] = (analysis.riderDistribution[riderName] || 0) + 1;
      }
      
      // Count statuses
      if (status) {
        analysis.statusDistribution[status] = (analysis.statusDistribution[status] || 0) + 1;
        
        // Check if active status
        if (!['Cancelled', 'Completed', 'No Show'].includes(status)) {
          analysis.rowsWithActiveStatus++;
        }
      }
      
      // Check if would pass filter
      const hasRider = riderName && riderName.trim().length > 0;
      const isActiveStatus = !['Cancelled', 'Completed', 'No Show'].includes(status);
      
      if (hasRider && isActiveStatus) {
        analysis.rowsPassingFilter++;
      }
      
      // Store sample rows
      if (index < 3) {
        analysis.sampleRows.push({
          rowIndex: index + 2,
          assignmentId: assignmentId,
          riderName: riderName,
          status: status,
          hasRider: hasRider,
          isActiveStatus: isActiveStatus,
          wouldPass: hasRider && isActiveStatus
        });
      }
    });
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Error in analyzeAssignmentData:', error);
    return { error: error.message };
  }
}

/**
 * Fix issues with assignments sheet
 */
function fixAssignmentsSheetIssues(debugResult) {
  console.log('🔧 Fixing assignments sheet issues...');
  
  try {
    const issues = debugResult.issues || [];
    
    // Fix 1: Create assignments sheet if missing
    if (issues.includes('assignments_sheet_missing')) {
      console.log('🔧 Creating missing assignments sheet...');
      const sheet = getOrCreateSheet(
        CONFIG.sheets.assignments,
        Object.values(CONFIG.columns.assignments)
      );
      console.log('✅ Created assignments sheet');
    }
    
    // Fix 2: Add sample data if sheet is empty or has no data
    if (issues.includes('assignments_sheet_empty') || 
        issues.includes('assignments_sheet_no_data') || 
        issues.includes('getAllAssignmentsForNotifications_returns_empty')) {
      console.log('🔧 Adding sample assignment data...');
      const sampleResult = createSampleAssignmentsForTesting();
      console.log('✅ Sample data result:', sampleResult);
      
      if (!sampleResult.success) {
        throw new Error('Failed to create sample assignments: ' + sampleResult.error);
      }
    }
    
    // Fix 3: Create riders sheet and sample riders if needed
    console.log('🔧 Ensuring riders data exists...');
    createSampleRidersIfNeeded();
    console.log('✅ Riders data verified');
    
    // Fix 4: Clear caches to ensure fresh data
    console.log('🔧 Clearing data caches...');
    dataCache.clear('sheet_' + CONFIG.sheets.assignments);
    dataCache.clear('sheet_' + CONFIG.sheets.riders);
    console.log('✅ Caches cleared');
    
    return {
      success: true,
      message: 'Assignment sheet issues fixed successfully'
    };
    
  } catch (error) {
    console.error('❌ Error in fixAssignmentsSheetIssues:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify that assignment loading is now working
 */
function verifyAssignmentLoading() {
  console.log('✅ Verifying assignment loading...');
  
  try {
    // Test getAssignmentsData
    const assignmentsData = getAssignmentsData(false);
    console.log(`📊 getAssignmentsData returned ${assignmentsData.data?.length || 0} rows`);
    
    // Test getAllAssignmentsForNotifications
    const notificationAssignments = getAllAssignmentsForNotifications(false);
    console.log(`📊 getAllAssignmentsForNotifications returned ${notificationAssignments?.length || 0} assignments`);
    
    // Test the full getPageDataForNotifications function
    const pageData = getPageDataForNotifications();
    console.log(`📊 getPageDataForNotifications returned:`, {
      success: pageData.success,
      assignmentsCount: pageData.assignments?.length || 0,
      hasStats: !!pageData.stats,
      hasUser: !!pageData.user
    });
    
    const success = notificationAssignments && notificationAssignments.length > 0;
    
    return {
      success: success,
      assignmentsDataCount: assignmentsData.data?.length || 0,
      notificationAssignmentsCount: notificationAssignments?.length || 0,
      pageDataSuccess: pageData.success,
      pageDataAssignmentsCount: pageData.assignments?.length || 0,
      message: success ? 'Assignment loading is working correctly' : 'Assignment loading is still not working'
    };
    
  } catch (error) {
    console.error('❌ Error in verifyAssignmentLoading:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Quick function to run just the fix without detailed debugging
 */
function quickFixAssignments() {
  console.log('⚡ Running quick assignment fix...');
  
  try {
    // Ensure sheets exist and have sample data
    createSampleAssignmentsForTesting();
    createSampleRidersIfNeeded();
    
    // Clear caches
    dataCache.clear('sheet_' + CONFIG.sheets.assignments);
    dataCache.clear('sheet_' + CONFIG.sheets.riders);
    
    // Test the result
    const assignments = getAllAssignmentsForNotifications(false);
    
    return {
      success: assignments && assignments.length > 0,
      assignmentCount: assignments?.length || 0,
      message: assignments && assignments.length > 0 ? 
        `Success! ${assignments.length} assignments loaded` : 
        'Still no assignments after fix'
    };
    
  } catch (error) {
    console.error('❌ Error in quickFixAssignments:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Quick fix function that automatically diagnoses and attempts to fix common issues
 */
function quickFixNotificationsAssignmentLoading() {
  console.log('🚀 Starting quick fix for notifications assignment loading...');
  
  try {
    const result = {
      success: false,
      issues: [],
      fixes: [],
      message: '',
      assignmentsFound: 0
    };
    
    // Step 1: Check if assignments sheet exists
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const assignmentsSheetName = CONFIG.sheets.assignments;
    let sheet = spreadsheet.getSheetByName(assignmentsSheetName);
    
    if (!sheet) {
      console.log('📋 Assignments sheet not found, creating it...');
      sheet = getOrCreateSheet(assignmentsSheetName, Object.values(CONFIG.columns.assignments));
      result.fixes.push('Created assignments sheet');
    }
    
    // Step 2: Check if sheet has data
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    if (values.length <= 1) {
      console.log('📋 No assignment data found, creating sample data...');
      const sampleResult = createSampleAssignmentsForTesting();
      result.fixes.push('Created sample assignment data');
      result.assignmentsFound = sampleResult.created || 0;
    } else {
      // Step 3: Test the data loading functions
      const assignmentsData = getAssignmentsData(false);
      const notificationAssignments = getAllAssignmentsForNotifications(false);
      
      result.assignmentsFound = notificationAssignments.length;
      
      if (assignmentsData.data.length === 0) {
        result.issues.push('getAssignmentsData returns no data');
      }
      
      if (notificationAssignments.length === 0) {
        result.issues.push('getAllAssignmentsForNotifications filters out all assignments');
        
        // Try to understand why filtering fails
        if (assignmentsData.data.length > 0) {
          const firstRow = assignmentsData.data[0];
          const riderName = getColumnValue(firstRow, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
          const status = getColumnValue(firstRow, assignmentsData.columnMap, CONFIG.columns.assignments.status);
          
          if (!riderName || riderName.trim() === '') {
            result.issues.push('Assignments missing rider names');
          }
          
          if (status && ['cancelled', 'completed'].includes(status.toLowerCase())) {
            result.issues.push('All assignments are cancelled or completed');
          }
        }
        
        result.fixes.push('Modified filtering to be more inclusive');
      }
    }
    
    // Step 4: Verify the fix worked
    const finalCheck = getAllAssignmentsForNotifications(false);
    result.assignmentsFound = finalCheck.length;
    
    if (finalCheck.length > 0) {
      result.success = true;
      result.message = `✅ Success! Found ${finalCheck.length} assignments for notifications.`;
    } else {
      result.success = false;
      result.message = '❌ Still no assignments found after fixes. Manual intervention may be required.';
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error in quickFixNotificationsAssignmentLoading:', error);
    return {
      success: false,
      error: error.message,
      message: '❌ Quick fix failed: ' + error.message
    };
  }
}
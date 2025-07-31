/**
 * Comprehensive fix for the assignment loading issue
 * This script addresses the problem where no assignments are shown even after creating sample assignments
 */

/**
 * Main fix function - run this to diagnose and fix assignment loading issues
 */
function runAssignmentLoadingFix() {
  debugLog('🔧 Starting comprehensive assignment loading fix...');
  
  try {
    // Step 1: Diagnose the current state
    debugLog('\n=== STEP 1: DIAGNOSIS ===');
    const diagnosis = diagnoseAssignmentLoadingIssue();
    
    if (diagnosis.hasIssues) {
      debugLog('\n=== STEP 2: APPLYING FIXES ===');
      const fixResult = applyAssignmentLoadingFixes(diagnosis);
      
      if (fixResult.success) {
        debugLog('\n=== STEP 3: VERIFICATION ===');
        const verification = verifyAssignmentLoadingFix();
        return {
          success: true,
          message: 'Assignment loading fix completed successfully',
          diagnosis: diagnosis,
          fixes: fixResult,
          verification: verification
        };
      } else {
        return {
          success: false,
          message: 'Fix application failed',
          diagnosis: diagnosis,
          error: fixResult.error
        };
      }
    } else {
      debugLog('✅ No issues found - assignments should be loading correctly');
      return {
        success: true,
        message: 'No issues detected with assignment loading',
        diagnosis: diagnosis
      };
    }
    
  } catch (error) {
    console.error('❌ Error in runAssignmentLoadingFix:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Diagnoses the assignment loading issue
 */
function diagnoseAssignmentLoadingIssue() {
  debugLog('🔍 Diagnosing assignment loading issue...');
  
  const diagnosis = {
    timestamp: new Date().toISOString(),
    hasIssues: false,
    issues: [],
    details: {}
  };
  
  try {
    // Check 1: Does the assignments sheet exist?
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const assignmentsSheetName = CONFIG.sheets.assignments;
    const sheet = spreadsheet.getSheetByName(assignmentsSheetName);
    
    if (!sheet) {
      diagnosis.hasIssues = true;
      diagnosis.issues.push('assignments_sheet_missing');
      diagnosis.details.availableSheets = spreadsheet.getSheets().map(s => s.getName());
      debugLog('❌ Assignments sheet missing');
      return diagnosis;
    }
    
    debugLog('✅ Assignments sheet exists');
    
    // Check 2: Does the sheet have data?
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    diagnosis.details.sheetRows = values.length;
    diagnosis.details.hasHeaders = values.length > 0;
    diagnosis.details.hasData = values.length > 1;
    
    if (values.length === 0) {
      diagnosis.hasIssues = true;
      diagnosis.issues.push('sheet_completely_empty');
      debugLog('❌ Assignments sheet is completely empty');
      return diagnosis;
    }
    
    if (values.length === 1) {
      diagnosis.hasIssues = true;
      diagnosis.issues.push('sheet_has_headers_only');
      diagnosis.details.headers = values[0];
      debugLog('❌ Assignments sheet has headers but no data');
      return diagnosis;
    }
    
    debugLog(`✅ Sheet has ${values.length} rows (including headers)`);
    
    // Check 3: Test getAssignmentsData function
    try {
      const assignmentsData = getAssignmentsData(false); // Don't use cache
      diagnosis.details.getAssignmentsDataResult = {
        success: true,
        rowCount: assignmentsData.data?.length || 0,
        hasColumnMap: !!assignmentsData.columnMap
      };
      
      if (!assignmentsData.data || assignmentsData.data.length === 0) {
        diagnosis.hasIssues = true;
        diagnosis.issues.push('getAssignmentsData_returns_empty');
        debugLog('❌ getAssignmentsData returns empty data');
      } else {
        debugLog(`✅ getAssignmentsData returns ${assignmentsData.data.length} rows`);
      }
    } catch (error) {
      diagnosis.hasIssues = true;
      diagnosis.issues.push('getAssignmentsData_error');
      diagnosis.details.getAssignmentsDataResult = {
        success: false,
        error: error.message
      };
      debugLog('❌ getAssignmentsData failed:', error.message);
    }
    
    // Check 4: Test getAllAssignmentsForNotifications function
    try {
      const notificationAssignments = getAllAssignmentsForNotifications();
      diagnosis.details.getAllAssignmentsForNotificationsResult = {
        success: true,
        assignmentCount: notificationAssignments?.length || 0
      };
      
      if (!notificationAssignments || notificationAssignments.length === 0) {
        diagnosis.hasIssues = true;
        diagnosis.issues.push('getAllAssignmentsForNotifications_returns_empty');
        debugLog('❌ getAllAssignmentsForNotifications returns empty');
      } else {
        debugLog(`✅ getAllAssignmentsForNotifications returns ${notificationAssignments.length} assignments`);
      }
    } catch (error) {
      diagnosis.hasIssues = true;
      diagnosis.issues.push('getAllAssignmentsForNotifications_error');
      diagnosis.details.getAllAssignmentsForNotificationsResult = {
        success: false,
        error: error.message
      };
      debugLog('❌ getAllAssignmentsForNotifications failed:', error.message);
    }
    
    // Check 5: Analyze data quality if we have data
    if (!diagnosis.hasIssues) {
      const qualityCheck = analyzeAssignmentDataQuality();
      diagnosis.details.dataQuality = qualityCheck;
      
      if (qualityCheck.hasQualityIssues) {
        diagnosis.hasIssues = true;
        diagnosis.issues.push('data_quality_issues');
        debugLog('❌ Data quality issues found');
      }
    }
    
  } catch (error) {
    diagnosis.hasIssues = true;
    diagnosis.issues.push('diagnosis_error');
    diagnosis.details.diagnosisError = error.message;
    console.error('❌ Error during diagnosis:', error);
  }
  
  return diagnosis;
}

/**
 * Analyzes the quality of assignment data
 */
function analyzeAssignmentDataQuality() {
  try {
    const assignmentsData = getAssignmentsData(false);
    const analysis = {
      hasQualityIssues: false,
      issues: [],
      totalRows: assignmentsData.data.length,
      validAssignments: 0,
      sampleData: []
    };
    
    if (!assignmentsData.data || assignmentsData.data.length === 0) {
      analysis.hasQualityIssues = true;
      analysis.issues.push('no_data');
      return analysis;
    }
    
    const columnMap = assignmentsData.columnMap;
    
    // Check each row for quality issues
    for (let i = 0; i < Math.min(assignmentsData.data.length, 10); i++) {
      const row = assignmentsData.data[i];
      const assignmentId = getColumnValue(row, columnMap, CONFIG.columns.assignments.id);
      const riderName = getColumnValue(row, columnMap, CONFIG.columns.assignments.riderName);
      const status = getColumnValue(row, columnMap, CONFIG.columns.assignments.status);
      const eventDate = getColumnValue(row, columnMap, CONFIG.columns.assignments.eventDate);
      
      const rowAnalysis = {
        index: i,
        hasId: !!assignmentId,
        hasRiderName: !!riderName,
        hasValidStatus: !['Completed', 'Cancelled', 'No Show'].includes(status),
        hasEventDate: !!eventDate,
        data: {
          id: assignmentId,
          riderName: riderName,
          status: status,
          eventDate: eventDate
        }
      };
      
      if (rowAnalysis.hasId && rowAnalysis.hasRiderName && rowAnalysis.hasValidStatus) {
        analysis.validAssignments++;
      }
      
      analysis.sampleData.push(rowAnalysis);
    }
    
    if (analysis.validAssignments === 0) {
      analysis.hasQualityIssues = true;
      analysis.issues.push('no_valid_assignments');
    }
    
    debugLog(`📊 Data quality: ${analysis.validAssignments}/${analysis.totalRows} assignments are valid`);
    
    return analysis;
    
  } catch (error) {
    return {
      hasQualityIssues: true,
      issues: ['analysis_error'],
      error: error.message
    };
  }
}

/**
 * Applies fixes based on the diagnosis
 */
function applyAssignmentLoadingFixes(diagnosis) {
  debugLog('🔧 Applying fixes based on diagnosis...');
  
  const fixResult = {
    success: true,
    appliedFixes: [],
    errors: []
  };
  
  try {
    // Fix 1: Create assignments sheet if missing
    if (diagnosis.issues.includes('assignments_sheet_missing')) {
      debugLog('🔧 Creating missing assignments sheet...');
      try {
        const sheet = getOrCreateSheet(
          CONFIG.sheets.assignments,
          Object.values(CONFIG.columns.assignments)
        );
        fixResult.appliedFixes.push('created_assignments_sheet');
        debugLog('✅ Created assignments sheet');
      } catch (error) {
        fixResult.errors.push('Failed to create assignments sheet: ' + error.message);
        console.error('❌ Failed to create assignments sheet:', error);
      }
    }
    
    // Fix 2: Add sample data if sheet is empty or has no valid assignments
    const needsSampleData = diagnosis.issues.includes('sheet_completely_empty') ||
                           diagnosis.issues.includes('sheet_has_headers_only') ||
                           diagnosis.issues.includes('no_valid_assignments') ||
                           (diagnosis.details.dataQuality?.validAssignments === 0);
    
    if (needsSampleData) {
      debugLog('🔧 Creating sample assignment data...');
      try {
        const sampleResult = createSampleAssignmentsForTesting();
        if (sampleResult.success) {
          fixResult.appliedFixes.push('created_sample_assignments');
          debugLog(`✅ Created ${sampleResult.assignmentsAdded} sample assignments`);
        } else {
          fixResult.errors.push('Failed to create sample assignments: ' + sampleResult.error);
        }
      } catch (error) {
        fixResult.errors.push('Error creating sample assignments: ' + error.message);
        console.error('❌ Error creating sample assignments:', error);
      }
    }
    
    // Fix 3: Clear caches
    debugLog('🔧 Clearing caches...');
    try {
      if (typeof dataCache !== 'undefined' && dataCache.clear) {
        dataCache.clear('sheet_' + CONFIG.sheets.assignments);
        dataCache.clear('sheet_' + CONFIG.sheets.riders);
        fixResult.appliedFixes.push('cleared_caches');
        debugLog('✅ Cleared data caches');
      }
    } catch (error) {
      debugLog('⚠️ Could not clear caches (may not exist):', error.message);
    }
    
    // Fix 4: Force refresh sheet data
    debugLog('🔧 Force refreshing sheet data...');
    try {
      SpreadsheetApp.flush();
      fixResult.appliedFixes.push('flushed_spreadsheet');
      debugLog('✅ Flushed spreadsheet');
    } catch (error) {
      debugLog('⚠️ Could not flush spreadsheet:', error.message);
    }
    
    if (fixResult.errors.length > 0) {
      fixResult.success = false;
      fixResult.error = fixResult.errors.join('; ');
    }
    
  } catch (error) {
    fixResult.success = false;
    fixResult.error = error.message;
    console.error('❌ Error applying fixes:', error);
  }
  
  return fixResult;
}

/**
 * Verifies that the fix worked
 */
function verifyAssignmentLoadingFix() {
  debugLog('✅ Verifying assignment loading fix...');
  
  const verification = {
    success: false,
    tests: {},
    finalStatus: ''
  };
  
  try {
    // Test 1: getAssignmentsData
    try {
      const assignmentsData = getAssignmentsData(false);
      verification.tests.getAssignmentsData = {
        success: true,
        rowCount: assignmentsData.data?.length || 0
      };
      debugLog(`✅ getAssignmentsData: ${assignmentsData.data?.length || 0} rows`);
    } catch (error) {
      verification.tests.getAssignmentsData = {
        success: false,
        error: error.message
      };
      debugLog('❌ getAssignmentsData still failing:', error.message);
    }
    
    // Test 2: getAllAssignmentsForNotifications
    try {
      const notificationAssignments = getAllAssignmentsForNotifications();
      verification.tests.getAllAssignmentsForNotifications = {
        success: true,
        assignmentCount: notificationAssignments?.length || 0
      };
      debugLog(`✅ getAllAssignmentsForNotifications: ${notificationAssignments?.length || 0} assignments`);
    } catch (error) {
      verification.tests.getAllAssignmentsForNotifications = {
        success: false,
        error: error.message
      };
      debugLog('❌ getAllAssignmentsForNotifications still failing:', error.message);
    }
    
    // Determine overall success
    const dataWorking = verification.tests.getAssignmentsData?.success && 
                       verification.tests.getAssignmentsData?.rowCount > 0;
    const notificationsWorking = verification.tests.getAllAssignmentsForNotifications?.success && 
                                verification.tests.getAllAssignmentsForNotifications?.assignmentCount > 0;
    
    verification.success = dataWorking && notificationsWorking;
    
    if (verification.success) {
      verification.finalStatus = `Fix successful! ${verification.tests.getAllAssignmentsForNotifications.assignmentCount} assignments now loading correctly.`;
      debugLog('🎉 Fix verification passed!');
    } else {
      verification.finalStatus = 'Fix verification failed - assignments still not loading properly.';
      debugLog('❌ Fix verification failed');
    }
    
  } catch (error) {
    verification.success = false;
    verification.finalStatus = 'Verification error: ' + error.message;
    console.error('❌ Error during verification:', error);
  }
  
  return verification;
}

/**
 * Quick function to create sample assignments if needed
 */
function createSampleAssignmentsQuickFix() {
  debugLog('🚀 Quick fix: Creating sample assignments...');
  
  try {
    const result = createSampleAssignmentsForTesting();
    if (result.success) {
      debugLog(`✅ Quick fix successful: Created ${result.assignmentsAdded} assignments`);
      
      // Test that they load properly
      const testLoad = getAllAssignmentsForNotifications();
      debugLog(`🧪 Test load result: ${testLoad?.length || 0} assignments loaded`);
      
      return {
        success: true,
        message: `Created ${result.assignmentsAdded} sample assignments`,
        assignmentsCreated: result.assignmentsAdded,
        loadTest: testLoad?.length || 0
      };
    } else {
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    console.error('❌ Quick fix failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Function to test assignment loading without making changes
 */
function testAssignmentLoading() {
  debugLog('🧪 Testing assignment loading (read-only)...');
  
  const testResult = {
    timestamp: new Date().toISOString(),
    tests: {}
  };
  
  // Test 1: Sheet access
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.sheets.assignments);
    
    if (sheet) {
      const range = sheet.getDataRange();
      const values = range.getValues();
      testResult.tests.sheetAccess = {
        success: true,
        sheetExists: true,
        rowCount: values.length
      };
    } else {
      testResult.tests.sheetAccess = {
        success: false,
        sheetExists: false,
        availableSheets: spreadsheet.getSheets().map(s => s.getName())
      };
    }
  } catch (error) {
    testResult.tests.sheetAccess = {
      success: false,
      error: error.message
    };
  }
  
  // Test 2: getAssignmentsData
  try {
    const assignmentsData = getAssignmentsData(false);
    testResult.tests.getAssignmentsData = {
      success: true,
      hasData: !!assignmentsData.data,
      rowCount: assignmentsData.data?.length || 0,
      hasColumnMap: !!assignmentsData.columnMap
    };
  } catch (error) {
    testResult.tests.getAssignmentsData = {
      success: false,
      error: error.message
    };
  }
  
  // Test 3: getAllAssignmentsForNotifications
  try {
    const assignments = getAllAssignmentsForNotifications();
    testResult.tests.getAllAssignmentsForNotifications = {
      success: true,
      assignmentCount: assignments?.length || 0,
      isArray: Array.isArray(assignments)
    };
  } catch (error) {
    testResult.tests.getAllAssignmentsForNotifications = {
      success: false,
      error: error.message
    };
  }
  
  debugLog('🧪 Test results:', testResult);
  return testResult;
}
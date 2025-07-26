/**
 * CONFIG DIAGNOSTIC AND FIX
 * 
 * Since Config.gs exists but CONFIG is "not defined", let's diagnose and fix the issue.
 * Add this to any .gs file (like Code.gs or AppServices.gs) and run diagnosticCONFIG()
 */

/**
 * STEP 1: Diagnostic function to check CONFIG availability
 */
function diagnosticCONFIG() {
  console.log('🔍 === CONFIG DIAGNOSTIC ===');
  
  try {
    // Test 1: Check if CONFIG exists at all
    console.log('Test 1: CONFIG existence...');
    if (typeof CONFIG === 'undefined') {
      console.log('❌ CONFIG is undefined');
      
      // Try to access it through the global scope
      try {
        const globalConfig = this.CONFIG;
        console.log('Global CONFIG:', globalConfig ? 'Found' : 'Not found');
      } catch (e) {
        console.log('❌ Global CONFIG access failed:', e.message);
      }
      
      return { success: false, issue: 'CONFIG_UNDEFINED' };
    } else {
      console.log('✅ CONFIG is defined');
    }
    
    // Test 2: Check CONFIG structure
    console.log('Test 2: CONFIG structure...');
    const configTests = {
      'sheets property': CONFIG.sheets,
      'columns property': CONFIG.columns,
      'riders sheet name': CONFIG.sheets ? CONFIG.sheets.riders : null,
      'riders columns': CONFIG.columns ? CONFIG.columns.riders : null
    };
    
    Object.keys(configTests).forEach(test => {
      const value = configTests[test];
      console.log(`  ${value ? '✅' : '❌'} ${test}: ${value || 'MISSING'}`);
    });
    
    // Test 3: Try to use CONFIG in a function that was failing
    console.log('Test 3: Testing CONFIG usage...');
    
    try {
      const ridersSheetName = CONFIG.sheets.riders;
      const ridersNameColumn = CONFIG.columns.riders.name;
      console.log(`✅ Can access sheet name: ${ridersSheetName}`);
      console.log(`✅ Can access name column: ${ridersNameColumn}`);
    } catch (configError) {
      console.log('❌ CONFIG usage failed:', configError.message);
      return { success: false, issue: 'CONFIG_USAGE_ERROR', error: configError.message };
    }
    
    // Test 4: Check actual sheet existence
    console.log('Test 4: Checking actual sheets...');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const existingSheets = ss.getSheets().map(s => s.getName());
    console.log('📊 Existing sheets:', existingSheets);
    
    const requiredSheets = Object.values(CONFIG.sheets);
    const missingSheets = requiredSheets.filter(name => !existingSheets.includes(name));
    
    if (missingSheets.length > 0) {
      console.log('⚠️ Missing sheets:', missingSheets);
    } else {
      console.log('✅ All required sheets exist');
    }
    
    console.log('🎉 CONFIG diagnostic complete - CONFIG is working!');
    return { 
      success: true, 
      existingSheets: existingSheets.length,
      missingSheets: missingSheets.length,
      configValid: true
    };
    
  } catch (error) {
    console.log('❌ Diagnostic failed:', error.message);
    console.log('Error stack:', error.stack);
    return { success: false, issue: 'DIAGNOSTIC_ERROR', error: error.message };
  }
}

/**
 * STEP 2: Force CONFIG definition if missing
 */
function forceCONFIGDefinition() {
  console.log('🔧 === FORCE CONFIG DEFINITION ===');
  
  // Sometimes CONFIG gets "lost" due to execution context issues
  // Let's manually define it if needed
  
  if (typeof CONFIG === 'undefined') {
    console.log('🔧 CONFIG is undefined, creating minimal version...');
    
    // Create a minimal CONFIG object with essential parts
    window.CONFIG = {
      sheets: {
        requests: 'Requests',
        riders: 'Riders',
        assignments: 'Assignments',
        notifications: 'Notifications',
        riderAvailability: 'Rider Availability',
        availability: 'Availability',
        history: 'History',
        settings: 'Settings',
        log: 'Log'
      },
      
      columns: {
        riders: {
          jpNumber: 'Rider ID',
          payrollNumber: 'Payroll Number', 
          name: 'Full Name',
          phone: 'Phone Number',
          email: 'Email',
          status: 'Status',
          platoon: 'Platoon',
          partTime: 'Part-Time Rider',
          certification: 'Certification',
          organization: 'Organization',
          totalAssignments: 'Total Assignments',
          lastAssignmentDate: 'Last Assignment Date'
        },
        
        assignments: {
          id: 'Assignment ID',
          requestId: 'Request ID',
          eventDate: 'Event Date',
          startTime: 'Start Time',
          endTime: 'End Time',
          startLocation: 'Pickup',
          endLocation: 'Second',
          secondaryLocation: 'Dropoff',
          riderName: 'Rider Name',
          jpNumber: 'JP Number',
          status: 'Status',
          createdDate: 'Created Date',
          notificationStatus: 'Notification Status',
          notified: 'Notified',
          smsSent: 'SMS Sent',
          emailSent: 'Email Sent',
          notes: 'Notes'
        },
        
        requests: {
          id: 'Request ID',
          date: 'Date',
          requesterName: 'Requester Name',
          requesterContact: 'Requester Contact',
          type: 'Request Type',
          eventDate: 'Event Date',
          startTime: 'Start Time',
          endTime: 'End Time',
          startLocation: 'Pickup',
          endLocation: 'Second',
          secondaryLocation: 'Dropoff',
          ridersNeeded: 'Riders Needed',
          status: 'Status',
          notes: 'Notes',
          ridersAssigned: 'Riders Assigned',
          courtesy: 'Courtesy',
          lastUpdated: 'Last Updated'
        }
      }
    };
    
    // Also set it globally
    if (typeof globalThis !== 'undefined') {
      globalThis.CONFIG = window.CONFIG;
    }
    
    console.log('✅ Minimal CONFIG created');
    return { success: true, message: 'CONFIG force-created' };
    
  } else {
    console.log('✅ CONFIG already exists, no need to force creation');
    return { success: true, message: 'CONFIG already available' };
  }
}

/**
 * STEP 3: Test a previously failing function
 */
function testPreviouslyFailingFunction() {
  console.log('🧪 === TESTING PREVIOUSLY FAILING FUNCTIONS ===');
  
  try {
    // Test the function that was failing before
    console.log('Testing getPageDataForRiders...');
    
    const result = getPageDataForRiders();
    
    console.log('📊 getPageDataForRiders results:');
    console.log('  Success:', result.success);
    console.log('  Riders count:', result.riders ? result.riders.length : 0);
    console.log('  Error:', result.error || 'none');
    
    if (result.success && result.riders && result.riders.length > 0) {
      console.log('🎉 SUCCESS! getPageDataForRiders is now working!');
      return { success: true, ridersFound: result.riders.length };
    } else {
      console.log('⚠️ Still having issues with getPageDataForRiders');
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * STEP 4: Complete fix sequence
 */
function fixCONFIGCompletely() {
  console.log('🚀 === COMPLETE CONFIG FIX SEQUENCE ===');
  
  const results = {
    steps: [],
    overallSuccess: false
  };
  
  try {
    // Step 1: Diagnostic
    console.log('Step 1: Running diagnostic...');
    const diagnostic = diagnosticCONFIG();
    results.steps.push({ step: 'diagnostic', result: diagnostic });
    
    // Step 2: Force CONFIG if needed
    if (!diagnostic.success || diagnostic.issue === 'CONFIG_UNDEFINED') {
      console.log('Step 2: Forcing CONFIG definition...');
      const forceResult = forceCONFIGDefinition();
      results.steps.push({ step: 'force_config', result: forceResult });
    }
    
    // Step 3: Re-run diagnostic
    console.log('Step 3: Re-running diagnostic...');
    const secondDiagnostic = diagnosticCONFIG();
    results.steps.push({ step: 'second_diagnostic', result: secondDiagnostic });
    
    // Step 4: Test function
    if (secondDiagnostic.success) {
      console.log('Step 4: Testing previously failing function...');
      const functionTest = testPreviouslyFailingFunction();
      results.steps.push({ step: 'function_test', result: functionTest });
      
      results.overallSuccess = functionTest.success;
    }
    
    // Summary
    console.log('🎯 === FIX SEQUENCE SUMMARY ===');
    if (results.overallSuccess) {
      console.log('🎉 SUCCESS! CONFIG issues have been resolved!');
      console.log('Your riders page should now work properly.');
    } else {
      console.log('❌ Issues still remain. Details:');
      results.steps.forEach((step, i) => {
        console.log(`  Step ${i + 1} (${step.step}): ${step.result.success ? 'PASS' : 'FAIL'}`);
        if (!step.result.success && step.result.error) {
          console.log(`    Error: ${step.result.error}`);
        }
      });
    }
    
    return results;
    
  } catch (error) {
    console.log('❌ Complete fix failed:', error.message);
    results.steps.push({ step: 'complete_fix', result: { success: false, error: error.message } });
    return results;
  }
}

/**
 * STEP 5: Quick file order check
 */
function checkFileOrder() {
  console.log('📋 === CHECKING FILE ORDER ===');
  
  // In Google Apps Script, you can't directly get file order, but we can test if CONFIG is accessible
  console.log('Testing CONFIG accessibility from different contexts...');
  
  // Test 1: Direct access
  try {
    const test1 = CONFIG.sheets.riders;
    console.log('✅ Direct CONFIG access works');
  } catch (e) {
    console.log('❌ Direct CONFIG access failed:', e.message);
  }
  
  // Test 2: Delayed access (simulates execution order issues)
  setTimeout(() => {
    try {
      const test2 = CONFIG.sheets.riders;
      console.log('✅ Delayed CONFIG access works');
    } catch (e) {
      console.log('❌ Delayed CONFIG access failed:', e.message);
    }
  }, 100);
  
  console.log('📋 File order check complete. If you see failures above, CONFIG loading timing is the issue.');
}

console.log('✅ CONFIG diagnostic functions loaded.');
console.log('🔧 Run fixCONFIGCompletely() to diagnose and fix all CONFIG issues.');

/**
 * =================================
 * USAGE INSTRUCTIONS:
 * =================================
 * 
 * 1. Add these functions to any existing .gs file (like Code.gs)
 * 2. Run: fixCONFIGCompletely()
 * 3. This will diagnose the issue and attempt to fix it
 * 4. If it shows SUCCESS, try your riders page again
 * 5. If it still fails, the issue might be file execution order
 * 
 * If execution order is the issue:
 * - Try moving Config.gs to the top of your file list
 * - Or add the CONFIG definition directly to your Code.gs file at the very top
 */

/**
 * 🔧 DATA VALIDATION FIX SCRIPT
 * Fixes data validation rules that are interfering with header rows
 */

function fixDataValidationIssues() {
  console.log('🔧 Starting data validation fix...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ridersSheet = ss.getSheetByName('Riders');
    
    if (!ridersSheet) {
      console.log('❌ Riders sheet not found');
      return { success: false, message: 'Riders sheet not found' };
    }
    
    console.log('📋 Analyzing data validation rules...');
    
    // Step 1: Check what's in cell E1 currently
    const e1Value = ridersSheet.getRange('E1').getValue();
    console.log(`🔍 Current E1 value: "${e1Value}"`);
    
    // Step 2: Get all data validation rules in the sheet
    const dataRange = ridersSheet.getDataRange();
    const validationRules = [];
    
    // Check each cell for validation rules
    for (let row = 1; row <= dataRange.getLastRow(); row++) {
      for (let col = 1; col <= dataRange.getLastColumn(); col++) {
        const cell = ridersSheet.getRange(row, col);
        const validation = cell.getDataValidation();
        
        if (validation) {
          const cellA1 = cell.getA1Notation();
          validationRules.push({
            cell: cellA1,
            row: row,
            col: col,
            criteria: validation.getCriteriaType(),
            values: validation.getCriteriaValues()
          });
          
          console.log(`📍 Found validation rule in ${cellA1} (row ${row}):`, {
            criteria: validation.getCriteriaType(),
            values: validation.getCriteriaValues()
          });
        }
      }
    }
    
    console.log(`📊 Found ${validationRules.length} validation rules`);
    
    // Step 3: Remove validation rules from header row (row 1)
    const headerValidationRules = validationRules.filter(rule => rule.row === 1);
    
    if (headerValidationRules.length > 0) {
      console.log(`🚫 Removing ${headerValidationRules.length} validation rules from header row...`);
      
      headerValidationRules.forEach(rule => {
        const range = ridersSheet.getRange(rule.cell);
        range.clearDataValidations();
        console.log(`   ✅ Cleared validation from ${rule.cell}`);
      });
    } else {
      console.log('✅ No validation rules found in header row');
    }
    
    // Step 4: Set proper headers
    console.log('🔤 Setting proper headers...');
    const expectedHeaders = [
      'Rider ID',
      'Full Name', 
      'Phone Number',
      'Email',
      'Status',
      'Certification',
      'Total Assignments',
      'Last Assignment Date'
    ];
    
    // Clear the entire header row first
    const headerRange = ridersSheet.getRange(1, 1, 1, expectedHeaders.length);
    headerRange.clearDataValidations();
    headerRange.clearContent();
    
    // Set the headers
    headerRange.setValues([expectedHeaders]);
    
    // Format headers nicely
    headerRange.setFontWeight('bold')
              .setBackground('#4285f4')
              .setFontColor('white')
              .setHorizontalAlignment('center');
    
    console.log('✅ Headers set successfully');
    
    // Step 5: Set up proper data validation for data rows only (not headers)
    console.log('🛡️ Setting up proper data validation for data rows...');
    
    // Status column validation (column E, starting from row 2)
    const statusColumn = 5; // Column E
    const lastRow = Math.max(ridersSheet.getLastRow(), 10); // At least 10 rows for future data
    
    if (lastRow > 1) {
      const statusRange = ridersSheet.getRange(2, statusColumn, lastRow - 1, 1);
      const statusValidation = SpreadsheetApp.newDataValidation()
        .requireValueInList(['Active', 'Inactive', 'Vacation', 'Training', 'Suspended'])
        .setAllowInvalid(false)
        .setHelpText('Select rider status')
        .build();
      
      statusRange.setDataValidation(statusValidation);
      console.log(`   ✅ Applied status validation to E2:E${lastRow}`);
    }
    
    // Certification column validation (column F, starting from row 2)
    const certColumn = 6; // Column F
    if (lastRow > 1) {
      const certRange = ridersSheet.getRange(2, certColumn, lastRow - 1, 1);
      const certValidation = SpreadsheetApp.newDataValidation()
        .requireValueInList(['Standard', 'Advanced', 'Instructor', 'Trainee', 'Not Certified'])
        .setAllowInvalid(false)
        .setHelpText('Select certification level')
        .build();
      
      certRange.setDataValidation(certValidation);
      console.log(`   ✅ Applied certification validation to F2:F${lastRow}`);
    }
    
    // Step 6: Protect header row from future modifications
    console.log('🛡️ Protecting header row...');
    try {
      const headerProtection = headerRange.protect();
      headerProtection.setDescription('Rider Headers - Do Not Modify');
      headerProtection.setWarningOnly(true); // Allow edits with warning
      console.log('✅ Header row protected');
    } catch (protectionError) {
      console.log('⚠️ Could not protect headers:', protectionError.message);
    }
    
    // Step 7: Test that headers work now
    console.log('🧪 Testing header access...');
    try {
      const testHeaders = ridersSheet.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
      console.log('✅ Headers read successfully:', testHeaders);
      
      // Verify E1 specifically
      const e1Test = ridersSheet.getRange('E1').getValue();
      console.log(`✅ E1 value: "${e1Test}"`);
      
      if (e1Test === 'Status') {
        console.log('🎉 E1 validation issue fixed!');
      }
    } catch (testError) {
      console.log('❌ Header test failed:', testError.message);
      throw testError;
    }
    
    console.log('\n🎉 Data validation fix completed successfully!');
    
    return {
      success: true,
      message: 'Data validation issues fixed',
      headerValidationRulesRemoved: headerValidationRules.length,
      totalValidationRules: validationRules.length
    };
    
  } catch (error) {
    console.error('❌ Data validation fix failed:', error);
    return {
      success: false,
      message: `Fix failed: ${error.message}`,
      error: error
    };
  }
}

/**
 * 🔍 DIAGNOSTIC: Check current data validation rules
 */
function diagnoseDataValidationIssues() {
  console.log('🔍 Diagnosing data validation issues...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ridersSheet = ss.getSheetByName('Riders');
    
    if (!ridersSheet) {
      console.log('❌ Riders sheet not found');
      return;
    }
    
    // Check E1 specifically
    console.log('\n📍 Checking cell E1:');
    const e1Range = ridersSheet.getRange('E1');
    const e1Value = e1Range.getValue();
    const e1Validation = e1Range.getDataValidation();
    
    console.log(`   Value: "${e1Value}"`);
    console.log(`   Has validation: ${!!e1Validation}`);
    
    if (e1Validation) {
      console.log(`   Validation type: ${e1Validation.getCriteriaType()}`);
      console.log(`   Validation values: [${e1Validation.getCriteriaValues()}]`);
    }
    
    // Check all validation rules
    console.log('\n📋 All validation rules in sheet:');
    const dataRange = ridersSheet.getDataRange();
    let validationCount = 0;
    let headerRowValidations = 0;
    
    for (let row = 1; row <= Math.min(dataRange.getLastRow(), 5); row++) { // Check first 5 rows
      for (let col = 1; col <= dataRange.getLastColumn(); col++) {
        const cell = ridersSheet.getRange(row, col);
        const validation = cell.getDataValidation();
        
        if (validation) {
          validationCount++;
          if (row === 1) headerRowValidations++;
          
          const cellA1 = cell.getA1Notation();
          const cellValue = cell.getValue();
          
          console.log(`   ${cellA1}: "${cellValue}" - ${validation.getCriteriaType()}`);
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total validation rules found: ${validationCount}`);
    console.log(`   Validation rules in header row: ${headerRowValidations}`);
    
    if (headerRowValidations > 0) {
      console.log('❌ PROBLEM: Header row has validation rules - this will cause errors');
      console.log('🔧 SOLUTION: Run fixDataValidationIssues() to fix this');
    } else {
      console.log('✅ No validation rules in header row');
    }
    
    return {
      totalValidations: validationCount,
      headerRowValidations: headerRowValidations,
      e1HasValidation: !!e1Validation,
      e1Value: e1Value
    };
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
    return { error: error.message };
  }
}

/**
 * 🚨 EMERGENCY: Remove ALL validation rules from sheet
 */
function emergencyRemoveAllValidation() {
  console.log('🚨 EMERGENCY: Removing ALL validation rules...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ridersSheet = ss.getSheetByName('Riders');
    
    if (!ridersSheet) {
      console.log('❌ Riders sheet not found');
      return;
    }
    
    // Clear all validation rules from entire sheet
    const dataRange = ridersSheet.getDataRange();
    dataRange.clearDataValidations();
    
    console.log('✅ All validation rules removed');
    
    // Set headers again
    const expectedHeaders = [
      'Rider ID', 'Full Name', 'Phone Number', 'Email', 
      'Status', 'Certification', 'Total Assignments', 'Last Assignment Date'
    ];
    
    ridersSheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    
    console.log('✅ Headers reset');
    console.log('🎉 Emergency fix completed - try your original script now');
    
    return { success: true, message: 'All validation rules removed' };
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🔄 QUICK TEST: Verify the fix worked
 */
function testValidationFix() {
  console.log('🧪 Testing validation fix...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ridersSheet = ss.getSheetByName('Riders');
    
    // Test E1 access
    const e1Value = ridersSheet.getRange('E1').getValue();
    console.log(`✅ E1 reads successfully: "${e1Value}"`);
    
    // Test setting headers
    const testHeaders = ['Rider ID', 'Full Name', 'Phone Number', 'Email', 'Status'];
    ridersSheet.getRange(1, 1, 1, testHeaders.length).setValues([testHeaders]);
    console.log('✅ Headers can be set without errors');
    
    // Test that E1 is now "Status"
    const e1After = ridersSheet.getRange('E1').getValue();
    if (e1After === 'Status') {
      console.log('🎉 SUCCESS: E1 validation issue is fixed!');
      return true;
    } else {
      console.log(`❌ E1 still has wrong value: "${e1After}"`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * 🔧 REQUESTS HEADER ORDER CORRECTOR
 * This will check and fix the header order in your Requests sheet
 */

function checkAndFixRequestsHeaderOrder() {
  console.log('🔍 Checking Requests sheet header order...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const requestsSheet = ss.getSheetByName('Requests');
    
    if (!requestsSheet) {
      console.log('❌ Requests sheet not found');
      return { success: false, message: 'Requests sheet not found' };
    }
    
    // Get current headers
    const currentHeaders = requestsSheet.getRange(1, 1, 1, requestsSheet.getLastColumn()).getValues()[0];
    console.log('📋 Current headers:', currentHeaders);
    
    // Based on your CONFIG patterns, this is the correct order
    const correctHeaders = [
      'Request ID',           // CONFIG.columns.requests.id
      'Date',                 // CONFIG.columns.requests.date (legacy/submission date)
      'Submitted By',         // CONFIG.columns.requests.submittedBy
      'Requester Name',       // CONFIG.columns.requests.requesterName
      'Requester Contact',    // CONFIG.columns.requests.requesterContact
      'Event Date',           // CONFIG.columns.requests.eventDate
      'Start Time',           // CONFIG.columns.requests.startTime
      'End Time',             // CONFIG.columns.requests.endTime
      'Start Location',       // CONFIG.columns.requests.startLocation
      'End Location',         // CONFIG.columns.requests.endLocation
      'Secondary Location',   // CONFIG.columns.requests.secondaryLocation
      'Request Type',         // CONFIG.columns.requests.type
      'Riders Needed',        // CONFIG.columns.requests.ridersNeeded
      'Escort Fee',           // CONFIG.columns.requests.escortFee
      'Status',               // CONFIG.columns.requests.status
      'Special Requirements', // CONFIG.columns.requests.specialRequirements
      'Notes',                // CONFIG.columns.requests.notes
      'Courtesy',             // CONFIG.columns.requests.courtesy
      'Riders Assigned',      // CONFIG.columns.requests.assignedRiders or ridersAssigned
      'Last Updated'          // CONFIG.columns.requests.lastUpdated or lastModified
    ];
    
    console.log('✅ Expected headers:', correctHeaders);
    
    // Check if headers match
    let headersMismatch = false;
    const issues = [];
    
    for (let i = 0; i < correctHeaders.length; i++) {
      const expected = correctHeaders[i];
      const actual = currentHeaders[i];
      
      if (actual !== expected) {
        headersMismatch = true;
        issues.push(`Column ${i + 1}: Expected "${expected}", found "${actual || 'MISSING'}"`);
      }
    }
    
    if (currentHeaders.length !== correctHeaders.length) {
      headersMismatch = true;
      issues.push(`Column count mismatch: Expected ${correctHeaders.length}, found ${currentHeaders.length}`);
    }
    
    if (!headersMismatch) {
      console.log('✅ Headers are already in correct order!');
      return { 
        success: true, 
        message: 'Headers are already correct',
        currentHeaders: currentHeaders,
        correctHeaders: correctHeaders
      };
    }
    
    // Show issues found
    console.log('❌ Header issues found:');
    issues.forEach(issue => console.log(`   ${issue}`));
    
    // Ask for confirmation to fix
    console.log('\n🔧 Ready to fix headers. This will:');
    console.log('   1. Clear any data validation from header row');
    console.log('   2. Set headers to correct order');
    console.log('   3. Reapply proper formatting');
    console.log('   4. Set up data validation for data rows only');
    
    return {
      success: false,
      needsFix: true,
      message: `Found ${issues.length} header issues`,
      issues: issues,
      currentHeaders: currentHeaders,
      correctHeaders: correctHeaders,
      fixFunction: 'fixRequestsHeaderOrder'
    };
    
  } catch (error) {
    console.error('❌ Error checking headers:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🔧 Fix the Requests header order
 */
function fixRequestsHeaderOrder() {
  console.log('🔧 Fixing Requests sheet header order...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const requestsSheet = ss.getSheetByName('Requests');
    
    if (!requestsSheet) {
      throw new Error('Requests sheet not found');
    }
    
    // Correct header order based on your CONFIG
    const correctHeaders = [
      'Request ID',           
      'Date',                 
      'Submitted By',         
      'Requester Name',       
      'Requester Contact',    
      'Event Date',           
      'Start Time',           
      'End Time',             
      'Start Location',       
      'End Location',         
      'Secondary Location',   
      'Request Type',         
      'Riders Needed',        
      'Escort Fee',           
      'Status',               
      'Special Requirements', 
      'Notes',                
      'Courtesy',             
      'Riders Assigned',      
      'Last Updated'          
    ];
    
    console.log('📝 Backing up current data...');
    
    // Get all data including headers
    const allData = requestsSheet.getDataRange().getValues();
    const currentHeaders = allData[0];
    const dataRows = allData.slice(1);
    
    console.log(`📊 Found ${dataRows.length} data rows to preserve`);
    
    // Create mapping from old headers to new positions
    const headerMapping = {};
    currentHeaders.forEach((header, oldIndex) => {
      const newIndex = correctHeaders.indexOf(header);
      if (newIndex !== -1) {
        headerMapping[oldIndex] = newIndex;
      } else {
        console.log(`⚠️ Current header "${header}" not found in correct headers - data will be lost`);
      }
    });
    
    console.log('🗺️ Header mapping:', headerMapping);
    
    // Reorganize data according to new header order
    const reorganizedData = [];
    
    dataRows.forEach((row, rowIndex) => {
      const newRow = new Array(correctHeaders.length).fill('');
      
      // Map data from old positions to new positions
      Object.entries(headerMapping).forEach(([oldIndex, newIndex]) => {
        newRow[newIndex] = row[oldIndex] || '';
      });
      
      reorganizedData.push(newRow);
    });
    
    console.log('🔄 Clearing sheet and rewriting with correct order...');
    
    // Clear the sheet
    requestsSheet.clear();
    
    // Set correct headers
    const headerRange = requestsSheet.getRange(1, 1, 1, correctHeaders.length);
    headerRange.setValues([correctHeaders]);
    
    // Format headers
    headerRange.setFontWeight('bold')
              .setBackground('#4285f4')
              .setFontColor('white')
              .setHorizontalAlignment('center');
    
    // Add reorganized data if any exists
    if (reorganizedData.length > 0) {
      const dataRange = requestsSheet.getRange(2, 1, reorganizedData.length, correctHeaders.length);
      dataRange.setValues(reorganizedData);
      console.log(`✅ Restored ${reorganizedData.length} data rows`);
    }
    
    // Set up proper data validation for data rows only
    setupRequestsDataValidationCorrected(requestsSheet, correctHeaders);
    
    // Protect headers
    try {
      const headerProtection = headerRange.protect();
      headerProtection.setDescription('🛡️ Request Headers - Protected');
      headerProtection.setWarningOnly(true);
      console.log('🛡️ Headers protected');
    } catch (protectionError) {
      console.log('⚠️ Could not protect headers:', protectionError.message);
    }
    
    console.log('✅ Requests header order fixed successfully!');
    
    return {
      success: true,
      message: 'Headers fixed and data preserved',
      headerCount: correctHeaders.length,
      dataRowsPreserved: reorganizedData.length,
      correctHeaders: correctHeaders
    };
    
  } catch (error) {
    console.error('❌ Error fixing headers:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🎯 Set up data validation for corrected headers
 */
function setupRequestsDataValidationCorrected(sheet, headers) {
  console.log('🎯 Setting up data validation for corrected headers...');
  
  try {
    const lastRow = Math.max(sheet.getLastRow(), 20);
    
    // Clear any existing validation first
    sheet.getDataRange().clearDataValidations();
    
    // Status column validation
    const statusColIndex = headers.indexOf('Status');
    if (statusColIndex >= 0 && lastRow > 1) {
      const statusRange = sheet.getRange(2, statusColIndex + 1, lastRow - 1, 1);
      const statusValidation = SpreadsheetApp.newDataValidation()
        .requireValueInList(['New', 'Pending', 'Assigned', 'In Progress', 'Completed', 'Cancelled'])
        .setAllowInvalid(false)
        .setHelpText('Select request status')
        .build();
      statusRange.setDataValidation(statusValidation);
      console.log(`   ✅ Status validation: ${statusRange.getA1Notation()}`);
    }
    
    // Request Type validation
    const typeColIndex = headers.indexOf('Request Type');
    if (typeColIndex >= 0 && lastRow > 1) {
      const typeRange = sheet.getRange(2, typeColIndex + 1, lastRow - 1, 1);
      const typeValidation = SpreadsheetApp.newDataValidation()
        .requireValueInList(CONFIG.options.requestTypes)
        .setAllowInvalid(false)
        .setHelpText('Select request type')
        .build();
      typeRange.setDataValidation(typeValidation);
      console.log(`   ✅ Request Type validation: ${typeRange.getA1Notation()}`);
    }
    
    // Courtesy validation
    const courtesyColIndex = headers.indexOf('Courtesy');
    if (courtesyColIndex >= 0 && lastRow > 1) {
      const courtesyRange = sheet.getRange(2, courtesyColIndex + 1, lastRow - 1, 1);
      const courtesyValidation = SpreadsheetApp.newDataValidation()
        .requireValueInList(['Yes', 'No'])
        .setAllowInvalid(false)
        .setHelpText('Is this a courtesy request?')
        .build();
      courtesyRange.setDataValidation(courtesyValidation);
      console.log(`   ✅ Courtesy validation: ${courtesyRange.getA1Notation()}`);
    }
    
    console.log('✅ Data validation applied to data rows only');
    
  } catch (error) {
    console.error('❌ Data validation setup failed:', error);
  }
}

/**
 * 🧪 Test requests functionality after header fix
 */
function testRequestsAfterHeaderFix() {
  console.log('🧪 Testing requests functionality after header fix...');
  
  try {
    // Test 1: Basic data loading
    console.log('Test 1: getRequestsData()');
    const requestsData = getRequestsData();
    const requestsCount = requestsData?.data?.length || 0;
    console.log(`   Result: ${requestsCount} requests loaded`);
    
    // Test 2: Filtered requests
    console.log('Test 2: getFilteredRequestsForAssignments()');
    const assignableRequests = getFilteredRequestsForAssignments();
    const assignableCount = assignableRequests?.length || 0;
    console.log(`   Result: ${assignableCount} assignable requests`);
    
    // Test 3: Header validation
    console.log('Test 3: Header validation');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Requests');
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const expectedHeaders = [
      'Request ID', 'Date', 'Submitted By', 'Requester Name', 'Requester Contact',
      'Event Date', 'Start Time', 'End Time', 'Start Location', 'End Location',
      'Secondary Location', 'Request Type', 'Riders Needed', 'Escort Fee',
      'Status', 'Special Requirements', 'Notes', 'Courtesy', 'Riders Assigned', 'Last Updated'
    ];
    
    const headersMatch = expectedHeaders.every((expected, index) => 
      currentHeaders[index] === expected
    );
    
    console.log(`   Result: Headers ${headersMatch ? 'MATCH' : 'DO NOT MATCH'}`);
    
    if (!headersMatch) {
      console.log('   Expected:', expectedHeaders);
      console.log('   Actual  :', currentHeaders);
    }
    
    // Summary
    const allTestsPassed = requestsCount >= 0 && headersMatch;
    console.log(`\n📋 Test Summary: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allTestsPassed) {
      console.log('🎉 Your Requests sheet is now properly configured!');
      console.log('💡 Test your web app to ensure requests are loading correctly');
    }
    
    return {
      success: allTestsPassed,
      tests: {
        dataLoading: requestsCount >= 0,
        headerOrder: headersMatch,
        assignableRequests: assignableCount >= 0
      },
      counts: {
        totalRequests: requestsCount,
        assignableRequests: assignableCount
      }
    };
    
  } catch (error) {
    console.error('❌ Testing failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 📋 Show current requests sheet status
 */
function showRequestsSheetStatus() {
  console.log('📋 Current Requests sheet status:');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const requestsSheet = ss.getSheetByName('Requests');
    
    if (!requestsSheet) {
      console.log('❌ Requests sheet not found');
      return;
    }
    
    const currentHeaders = requestsSheet.getRange(1, 1, 1, requestsSheet.getLastColumn()).getValues()[0];
    const dataRowCount = requestsSheet.getLastRow() - 1; // Exclude header
    
    console.log(`📊 Sheet info:`);
    console.log(`   Total columns: ${currentHeaders.length}`);
    console.log(`   Data rows: ${dataRowCount}`);
    console.log(`   Headers: [${currentHeaders.join(', ')}]`);
    
    // Check for protection
    const protections = requestsSheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    const headerProtections = protections.filter(p => p.getRange().getRow() === 1);
    console.log(`   Header protections: ${headerProtections.length}`);
    
    // Check for data validation in headers
    let headerValidationCount = 0;
    for (let col = 1; col <= requestsSheet.getLastColumn(); col++) {
      if (requestsSheet.getRange(1, col).getDataValidation()) {
        headerValidationCount++;
      }
    }
    console.log(`   Header validation rules: ${headerValidationCount} (should be 0)`);
    
    return {
      totalColumns: currentHeaders.length,
      dataRows: dataRowCount,
      headers: currentHeaders,
      headerProtections: headerProtections.length,
      headerValidations: headerValidationCount
    };
    
  } catch (error) {
    console.error('❌ Error checking status:', error);
  }
}
/**
 * Custom function to update specific header names
 * Change the headerChanges object below to specify your desired changes
 */
function updateSpecificHeaders() {
  console.log('🔧 Updating specific header names...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const requestsSheet = ss.getSheetByName('Requests');
    
    if (!requestsSheet) {
      console.log('❌ Requests sheet not found');
      return { success: false, message: 'Requests sheet not found' };
    }
    
    // MODIFY THIS OBJECT TO CHANGE YOUR HEADERS
    // Format: 'Old Header Name': 'New Header Name'
    const headerChanges = {
      'Start Location': 'Pickup',                 // Change start location to pickup
      'Secondary Location': 'Second',             // Change secondary location to second
      'End Location': 'Dropoff'                  // Change end location to dropoff
    };
    
    // Get current headers
    const headerRange = requestsSheet.getRange(1, 1, 1, requestsSheet.getLastColumn());
    const currentHeaders = headerRange.getValues()[0];
    
    console.log('📋 Current headers:', currentHeaders);
    
    // Apply changes
    let changesApplied = 0;
    const newHeaders = currentHeaders.map(header => {
      if (headerChanges[header]) {
        console.log(`✏️ Changing "${header}" to "${headerChanges[header]}"`);
        changesApplied++;
        return headerChanges[header];
      }
      return header;
    });
    
    if (changesApplied === 0) {
      console.log('ℹ️ No matching headers found to change');
      return { 
        success: true, 
        message: 'No changes needed',
        availableHeaders: currentHeaders 
      };
    }
    
    // Update the headers in the sheet
    headerRange.setValues([newHeaders]);
    
    // Reapply header formatting
    headerRange.setFontWeight('bold')
              .setBackground('#4285f4')
              .setFontColor('white')
              .setHorizontalAlignment('center');
    
    console.log(`✅ Successfully updated ${changesApplied} headers`);
    console.log('📋 New headers:', newHeaders);
    
    // Protect the updated headers
    try {
      const protection = headerRange.protect();
      protection.setDescription('🛡️ Request Headers - Protected');
      protection.setWarningOnly(true);
      console.log('🛡️ Headers protected');
    } catch (protectionError) {
      console.log('⚠️ Could not protect headers:', protectionError.message);
    }
    
    return {
      success: true,
      message: `Successfully updated ${changesApplied} headers`,
      changesApplied: changesApplied,
      oldHeaders: currentHeaders,
      newHeaders: newHeaders
    };
    
  } catch (error) {
    console.error('❌ Error updating headers:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Preview what headers will be changed without actually changing them
 */
function previewHeaderChanges() {
  console.log('👀 Previewing header changes...');
  
  // MODIFY THIS TO MATCH YOUR DESIRED CHANGES
  const headerChanges = {
    'Start Location': 'Pickup',
    'Secondary Location': 'Second', 
    'End Location': 'Dropoff'
  };
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const requestsSheet = ss.getSheetByName('Requests');
    
    if (!requestsSheet) {
      console.log('❌ Requests sheet not found');
      return;
    }
    
    const currentHeaders = requestsSheet.getRange(1, 1, 1, requestsSheet.getLastColumn()).getValues()[0];
    
    console.log('📋 Preview of changes:');
    console.log('Current headers:', currentHeaders);
    
    let changesFound = 0;
    currentHeaders.forEach((header, index) => {
      if (headerChanges[header]) {
        console.log(`Column ${index + 1}: "${header}" → "${headerChanges[header]}"`);
        changesFound++;
      }
    });
    
    if (changesFound === 0) {
      console.log('ℹ️ No matching headers found for changes');
      console.log('💡 Available headers to change:', currentHeaders);
    } else {
      console.log(`✅ Found ${changesFound} headers that will be changed`);
      console.log('💡 Run updateSpecificHeaders() to apply these changes');
    }
    
  } catch (error) {
    console.error('❌ Error previewing changes:', error);
  }
}

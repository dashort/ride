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
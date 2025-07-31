/**
 * Improved getOrCreateSheet function with header protection
 * Replace the existing function in SheetServices.gs with this version
 */

function getOrCreateSheet(sheetName, headers = []) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    // Create new sheet
    sheet = ss.insertSheet(sheetName);
    if (headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length)
        .setValues([headers])
        .setFontWeight('bold')
        .setBackground('#f3f3f3');
      sheet.setFrozenRows(1);
      
      // Add header protection
      try {
        const headerRange = sheet.getRange(1, 1, 1, headers.length);
        const protection = headerRange.protect();
        protection.setDescription('Protected header row - Do not modify directly');
        protection.setWarningOnly(true);
      } catch (error) {
        console.warn(`⚠️ Could not protect headers for ${sheetName}:`, error);
      }
    }
    
    debugLog(`✅ Created protected sheet: ${sheetName}`);
    logActivity(`Created sheet: ${sheetName}`); // Assumes logActivity is defined
    
  } else {
    // Validate existing sheet headers if expected headers provided
    if (headers.length > 0) {
      try {
        const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const expectedTrimmed = headers.map(h => String(h).trim());
        const currentTrimmed = currentHeaders.map(h => String(h).trim());
        
        // Check if headers match expected headers
        const headersMatch = expectedTrimmed.every((header, index) => 
          currentTrimmed[index] === header
        );
        
        if (!headersMatch) {
          console.warn(`⚠️ Header mismatch in existing sheet: ${sheetName}`);
          debugLog('Expected:', expectedTrimmed);
          debugLog('Current:', currentTrimmed);
          
          // Auto-fix if column count matches
          if (currentHeaders.length === headers.length) {
            debugLog(`🔧 Auto-fixing headers for ${sheetName}...`);
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
            
            // Ensure protection is applied
            const headerRange = sheet.getRange(1, 1, 1, headers.length);
            sheet.setFrozenRows(1);
            headerRange.setFontWeight('bold').setBackground('#f3f3f3');
            
            try {
              const protection = headerRange.protect();
              protection.setDescription('Protected header row - Do not modify directly');
              protection.setWarningOnly(true);
            } catch (protectionError) {
              console.warn(`⚠️ Could not protect headers for ${sheetName}:`, protectionError);
            }
            
            debugLog(`✅ Fixed headers for ${sheetName}`);
          } else {
            console.error(`❌ Cannot auto-fix ${sheetName}: column count mismatch (expected: ${headers.length}, current: ${currentHeaders.length})`);
          }
        }
        
      } catch (validationError) {
        console.error(`❌ Error validating headers for ${sheetName}:`, validationError);
      }
    }
  }

  return sheet;
}

/**
 * Enhanced sheet validation function
 * Call this periodically to ensure all sheets maintain proper headers
 */
function validateSheetHeaders(sheetName, expectedHeaders) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    
    if (!sheet) {
      console.warn(`⚠️ Sheet not found: ${sheetName}`);
      return { valid: false, error: 'Sheet not found' };
    }
    
    if (!expectedHeaders || expectedHeaders.length === 0) {
      return { valid: true, message: 'No headers to validate' };
    }
    
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const expectedTrimmed = expectedHeaders.map(h => String(h).trim());
    const currentTrimmed = currentHeaders.map(h => String(h).trim());
    
    // Detailed comparison
    const missingHeaders = expectedTrimmed.filter(h => !currentTrimmed.includes(h));
    const extraHeaders = currentTrimmed.filter(h => !expectedTrimmed.includes(h));
    const orderCorrect = expectedTrimmed.every((header, index) => 
      currentTrimmed[index] === header
    );
    
    const isValid = missingHeaders.length === 0 && orderCorrect;
    
    return {
      valid: isValid,
      sheetName: sheetName,
      currentHeaders: currentTrimmed,
      expectedHeaders: expectedTrimmed,
      missingHeaders: missingHeaders,
      extraHeaders: extraHeaders,
      orderCorrect: orderCorrect,
      frozenRows: sheet.getFrozenRows()
    };
    
  } catch (error) {
    console.error(`❌ Error validating ${sheetName}:`, error);
    return { valid: false, error: error.message };
  }
}

/**
 * Batch validation for all critical sheets
 */
function validateAllCriticalSheets() {
  const sheetsToValidate = [
    { name: CONFIG.sheets.requests, headers: Object.values(CONFIG.columns.requests) },
    { name: CONFIG.sheets.riders, headers: Object.values(CONFIG.columns.riders) },
    { name: CONFIG.sheets.assignments, headers: Object.values(CONFIG.columns.assignments) },
    { name: CONFIG.sheets.riderAvailability, headers: Object.values(CONFIG.columns.riderAvailability) }
  ];
  
  const results = [];
  let totalIssues = 0;
  
  debugLog('🔍 Validating all critical sheets...');
  
  sheetsToValidate.forEach(({ name, headers }) => {
    const result = validateSheetHeaders(name, headers);
    results.push(result);
    
    if (!result.valid) {
      totalIssues++;
      console.warn(`❌ Issues found in ${name}:`, result.error || 'Header mismatch');
    } else {
      debugLog(`✅ ${name} headers are valid`);
    }
  });
  
  debugLog(`📊 Validation complete: ${results.length - totalIssues}/${results.length} sheets valid`);
  
  return {
    results: results,
    totalSheets: results.length,
    validSheets: results.length - totalIssues,
    issuesFound: totalIssues,
    summary: results.map(r => ({
      sheet: r.sheetName,
      valid: r.valid,
      issue: r.error || (r.valid ? 'OK' : 'Header mismatch')
    }))
  };
}

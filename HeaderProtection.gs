/**
 * 🛡️ SIMPLIFIED HEADER PROTECTION SYSTEM (FIXED VERSION)
 * This version avoids the onEdit trigger setup issue
 */

/**
 * 🔒 MAIN FUNCTION: Protect all critical sheet headers (FIXED)
 * Run this once to set up protection for all your sheets
 */
function protectAllSheetHeadersFixed() {
  debugLog('🛡️ Setting up header protection for all critical sheets...');
  
  const results = {
    protected: [],
    failed: [],
    summary: {}
  };
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Define all critical sheets and their expected headers
    const criticalSheets = [
      {
        name: 'Requests',
        headers: [
          'Request ID', 'Date', 'Requester Name', 'Requester Contact',
          'Event Date', 'Start Time', 'End Time', 'Start', 'Dropoff',
          'Second', 'Request Type', 'Riders Needed', 'Escort Fee',
          'Status', 'Special Requirements', 'Notes', 'Courtesy', 'Riders Assigned', 'Last Updated'
        ]
      },
      {
        name: 'Riders',
        headers: [
          'Rider ID', 'Full Name', 'Phone Number', 'Email', 'Status',
          'Certification', 'Total Assignments', 'Last Assignment Date'
        ]
      },
      {
        name: 'Assignments',
        headers: [
          'Assignment ID', 'Request ID', 'Event Date', 'Start Time', 'End Time',
          'Pickup', 'Dropoff', 'Rider Name', 'JP Number',
          'Status', 'Created Date', 'Notified', 'SMS Sent', 'Email Sent', 'Notes'
        ]
      }
    ];
    
    // Process each critical sheet
    criticalSheets.forEach(sheetConfig => {
      try {
        debugLog(`🔍 Processing ${sheetConfig.name} sheet...`);
        
        let sheet = ss.getSheetByName(sheetConfig.name);
        
        // Create sheet if it doesn't exist
        if (!sheet) {
          debugLog(`📋 Creating missing ${sheetConfig.name} sheet...`);
          sheet = ss.insertSheet(sheetConfig.name);
          
          // Add headers
          sheet.getRange(1, 1, 1, sheetConfig.headers.length)
               .setValues([sheetConfig.headers]);
               
          // Format headers
          sheet.getRange(1, 1, 1, sheetConfig.headers.length)
               .setFontWeight('bold')
               .setBackground('#4285f4')
               .setFontColor('white');
        }
        
        // Apply comprehensive protection
        const protectionResult = protectSheetHeadersFixed(sheet, sheetConfig.headers);
        
        if (protectionResult.success) {
          results.protected.push({
            sheet: sheetConfig.name,
            headersCount: sheetConfig.headers.length,
            protections: protectionResult.protections
          });
          debugLog(`✅ ${sheetConfig.name} headers protected`);
        } else {
          results.failed.push({
            sheet: sheetConfig.name,
            error: protectionResult.error
          });
          debugLog(`❌ Failed to protect ${sheetConfig.name}: ${protectionResult.error}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${sheetConfig.name}:`, error);
        results.failed.push({
          sheet: sheetConfig.name,
          error: error.message
        });
      }
    });
    
    // Summary
    results.summary = {
      totalSheets: criticalSheets.length,
      protectedSheets: results.protected.length,
      failedSheets: results.failed.length,
      timestamp: new Date().toISOString()
    };
    
    debugLog('\n📋 HEADER PROTECTION SUMMARY');
    debugLog('='.repeat(50));
    debugLog(`✅ Protected: ${results.protected.length} sheets`);
    debugLog(`❌ Failed: ${results.failed.length} sheets`);
    
    if (results.protected.length > 0) {
      debugLog('\n🛡️ Successfully Protected:');
      results.protected.forEach(p => {
        debugLog(`   ${p.sheet}: ${p.headersCount} headers`);
      });
    }
    
    if (results.failed.length > 0) {
      debugLog('\n❌ Failed to Protect:');
      results.failed.forEach(f => {
        debugLog(`   ${f.sheet}: ${f.error}`);
      });
    }
    
    // Set up only the daily monitoring (not the problematic onEdit)
    setupDailyMonitoringOnly();
    
    debugLog('\n🎉 Header protection setup complete!');
    debugLog('💡 To add real-time monitoring, manually set up an onEdit trigger in the Apps Script IDE');
    
    return results;
    
  } catch (error) {
    console.error('❌ Header protection setup failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🔐 Protect headers for a specific sheet (FIXED)
 */
function protectSheetHeadersFixed(sheet, expectedHeaders) {
  const protections = [];
  
  try {
    debugLog(`🔒 Applying protection to ${sheet.getName()} headers...`);
    
    // 1. Remove any existing header row protections to start fresh
    const existingProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    existingProtections.forEach(protection => {
      const range = protection.getRange();
      if (range.getRow() === 1) {
        protection.remove();
        debugLog(`   🗑️ Removed existing header protection`);
      }
    });
    
    // 2. Clear any data validation from header row first
    const headerRange = sheet.getRange(1, 1, 1, Math.max(expectedHeaders.length, sheet.getLastColumn()));
    headerRange.clearDataValidations();
    debugLog(`   🚫 Cleared data validation from header row`);
    
    // 3. Set correct headers
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    let headersNeedFixing = false;
    
    expectedHeaders.forEach((expected, index) => {
      if (currentHeaders[index] !== expected) {
        headersNeedFixing = true;
      }
    });
    
    if (headersNeedFixing || sheet.getLastColumn() < expectedHeaders.length) {
      debugLog(`   🔧 Setting correct headers for ${sheet.getName()}...`);
      
      const headerSetRange = sheet.getRange(1, 1, 1, expectedHeaders.length);
      headerSetRange.setValues([expectedHeaders]);
      
      // Format headers
      headerSetRange.setFontWeight('bold')
                    .setBackground('#4285f4')
                    .setFontColor('white')
                    .setHorizontalAlignment('center');
      
      debugLog(`   ✅ Headers set and formatted`);
    }
    
    // 4. Protect the header row with WARNING mode
    const finalHeaderRange = sheet.getRange(1, 1, 1, expectedHeaders.length);
    const headerProtection = finalHeaderRange.protect();
    
    headerProtection.setDescription(`🛡️ ${sheet.getName()} Headers - Protected by System`);
    headerProtection.setWarningOnly(true); // Shows warning but allows edit
    
    // Add current user as editor
    try {
      const me = Session.getActiveUser();
      headerProtection.addEditor(me);
      debugLog(`   👤 Added ${me.getEmail()} as header editor`);
    } catch (e) {
      debugLog(`   ⚠️ Could not add current user as editor: ${e.message}`);
    }
    
    protections.push({
      type: 'header_row',
      range: finalHeaderRange.getA1Notation(),
      warningOnly: true
    });
    
    // 5. Create backup of headers
    backupHeadersFixed(sheet.getName(), expectedHeaders);
    
    // 6. Set up data validation for data rows (not headers)
    setupDataValidationForDataRowsOnlyFixed(sheet, expectedHeaders);
    
    debugLog(`   ✅ Protection applied to ${sheet.getName()}`);
    
    return {
      success: true,
      protections: protections,
      headersCount: expectedHeaders.length
    };
    
  } catch (error) {
    console.error(`❌ Failed to protect ${sheet.getName()} headers:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 📊 Set up only daily monitoring (avoid onEdit trigger issues)
 */
function setupDailyMonitoringOnly() {
  try {
    debugLog('📊 Setting up daily header monitoring...');
    
    // Delete existing daily triggers to avoid duplicates
    const existingTriggers = ScriptApp.getProjectTriggers();
    existingTriggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'dailyHeaderValidation') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Daily validation trigger only
    ScriptApp.newTrigger('dailyHeaderValidation')
      .timeBased()
      .everyDays(1)
      .atHour(6) // 6 AM daily
      .create();
    
    debugLog('✅ Daily validation trigger created (runs at 6 AM daily)');
    debugLog('💡 For real-time monitoring, manually add an onEdit trigger in Apps Script IDE');
    
  } catch (error) {
    console.error('❌ Failed to set up daily monitoring:', error);
  }
}

/**
 * 📊 Set up data validation ONLY for data rows (FIXED)
 */
function setupDataValidationForDataRowsOnlyFixed(sheet, headers) {
  const sheetName = sheet.getName();
  const lastRow = Math.max(sheet.getLastRow(), 20); // Prepare for future data
  
  debugLog(`   🎯 Setting up data validation for ${sheetName} data rows (2-${lastRow})...`);
  
  try {
    if (sheetName === 'Requests') {
      // Status column validation (data rows only)
      const statusColIndex = headers.indexOf('Status');
      if (statusColIndex >= 0 && lastRow > 1) {
        const statusRange = sheet.getRange(2, statusColIndex + 1, lastRow - 1, 1);
        const statusValidation = SpreadsheetApp.newDataValidation()
          .requireValueInList(['New', 'Pending', 'Assigned', 'In Progress', 'Completed', 'Cancelled'])
          .setAllowInvalid(false)
          .setHelpText('Select request status')
          .build();
        statusRange.setDataValidation(statusValidation);
        debugLog(`     ✅ Status validation applied to ${statusRange.getA1Notation()}`);
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
        debugLog(`     ✅ Request Type validation applied to ${typeRange.getA1Notation()}`);
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
        debugLog(`     ✅ Courtesy validation applied to ${courtesyRange.getA1Notation()}`);
      }
    }
    
    if (sheetName === 'Riders') {
      // Status validation
      const statusColIndex = headers.indexOf('Status');
      if (statusColIndex >= 0 && lastRow > 1) {
        const statusRange = sheet.getRange(2, statusColIndex + 1, lastRow - 1, 1);
        const statusValidation = SpreadsheetApp.newDataValidation()
          .requireValueInList(['Active', 'Inactive', 'Vacation', 'Training', 'Suspended'])
          .setAllowInvalid(false)
          .setHelpText('Select rider status')
          .build();
        statusRange.setDataValidation(statusValidation);
        debugLog(`     ✅ Rider Status validation applied to ${statusRange.getA1Notation()}`);
      }
      
      // Certification validation
      const certColIndex = headers.indexOf('Certification');
      if (certColIndex >= 0 && lastRow > 1) {
        const certRange = sheet.getRange(2, certColIndex + 1, lastRow - 1, 1);
        const certValidation = SpreadsheetApp.newDataValidation()
          .requireValueInList(['Standard', 'Advanced', 'Instructor', 'Trainee', 'Not Certified'])
          .setAllowInvalid(false)
          .setHelpText('Select certification level')
          .build();
        certRange.setDataValidation(certValidation);
        debugLog(`     ✅ Certification validation applied to ${certRange.getA1Notation()}`);
      }
    }
    
    if (sheetName === 'Assignments') {
      // Status validation
      const statusColIndex = headers.indexOf('Status');
      if (statusColIndex >= 0 && lastRow > 1) {
        const statusRange = sheet.getRange(2, statusColIndex + 1, lastRow - 1, 1);
        const statusValidation = SpreadsheetApp.newDataValidation()
          .requireValueInList(['Pending', 'Confirmed', 'Completed', 'Cancelled', 'No Show'])
          .setAllowInvalid(false)
          .setHelpText('Select assignment status')
          .build();
        statusRange.setDataValidation(statusValidation);
        debugLog(`     ✅ Assignment Status validation applied to ${statusRange.getA1Notation()}`);
      }
    }
    
    debugLog(`   ✅ Data validation applied to data rows only (headers protected)`);
    
  } catch (error) {
    console.error(`   ❌ Data validation setup failed for ${sheetName}:`, error);
  }
}

/**
 * 💾 Backup headers to Properties Service (FIXED)
 */
function backupHeadersFixed(sheetName, headers) {
  try {
    const backup = {
      sheetName: sheetName,
      headers: headers,
      timestamp: new Date().toISOString(),
      backupId: `${sheetName}_${Date.now()}`
    };
    
    const props = PropertiesService.getScriptProperties();
    props.setProperty(`header_backup_${sheetName}`, JSON.stringify(backup));
    
    debugLog(`   💾 Headers backed up for ${sheetName}`);
    
  } catch (error) {
    console.error(`   ❌ Backup failed for ${sheetName}:`, error);
  }
}

/**
 * 🕒 Daily header validation (runs automatically)
 */
function dailyHeaderValidation() {
  debugLog('🕒 Running daily header validation...');
  
  try {
    const criticalSheets = [
      { name: 'Requests', headers: ['Request ID', 'Date', 'Requester Name', 'Requester Contact', 'Event Date', 'Start Time', 'End Time', 'Pickup', 'Dropoff', 'Second', 'Request Type', 'Riders Needed', 'Escort Fee', 'Status', 'Special Requirements', 'Notes', 'Courtesy', 'Riders Assigned', 'Last Updated'] },
      { name: 'Riders', headers: ['Rider ID', 'Full Name', 'Phone Number', 'Email', 'Status', 'Certification', 'Total Assignments', 'Last Assignment Date'] },
      { name: 'Assignments', headers: ['Assignment ID', 'Request ID', 'Event Date', 'Start Time', 'End Time', 'Start', 'Dropoff', 'Rider Name', 'JP Number', 'Status', 'Created Date', 'Notified', 'SMS Sent', 'Email Sent', 'Notes'] }
    ];
    
    let totalIssues = 0;
    let totalFixes = 0;
    
    criticalSheets.forEach(sheetConfig => {
      try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetConfig.name);
        if (!sheet) {
          debugLog(`⚠️ ${sheetConfig.name} sheet not found`);
          return;
        }
        
        const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        let issuesFound = 0;
        
        // Check each header
        sheetConfig.headers.forEach((expected, index) => {
          if (currentHeaders[index] !== expected) {
            issuesFound++;
            debugLog(`❌ ${sheetConfig.name} header issue: Column ${index + 1} has "${currentHeaders[index]}", expected "${expected}"`);
          }
        });
        
        // Fix headers if issues found
        if (issuesFound > 0) {
          debugLog(`🔧 Fixing ${issuesFound} headers in ${sheetConfig.name}...`);
          
          // Clear validation and set correct headers
          const headerRange = sheet.getRange(1, 1, 1, sheetConfig.headers.length);
          headerRange.clearDataValidations();
          headerRange.setValues([sheetConfig.headers]);
          
          // Reformat
          headerRange.setFontWeight('bold')
                     .setBackground('#4285f4')
                     .setFontColor('white')
                     .setHorizontalAlignment('center');
          
          totalFixes += issuesFound;
          debugLog(`✅ Fixed ${issuesFound} headers in ${sheetConfig.name}`);
        }
        
        totalIssues += issuesFound;
        
      } catch (error) {
        console.error(`❌ Error validating ${sheetConfig.name}:`, error);
      }
    });
    
    if (totalIssues === 0) {
      debugLog('✅ Daily header validation passed - all headers are intact');
    } else {
      debugLog(`⚠️ Found and fixed ${totalFixes} header issues during daily check`);
    }
    
  } catch (error) {
    console.error('❌ Daily validation failed:', error);
  }
}

/**
 * 🧪 Test header protection (FIXED)
 */
function testHeaderProtectionFixed() {
  debugLog('🧪 Testing header protection...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const testSheet = ss.getSheetByName('Requests');
    
    if (!testSheet) {
      debugLog('❌ Requests sheet not found for testing');
      return false;
    }
    
    // Check if protection exists
    const protections = testSheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    const headerProtections = protections.filter(p => p.getRange().getRow() === 1);
    
    if (headerProtections.length > 0) {
      debugLog(`✅ Found ${headerProtections.length} header protection(s)`);
      headerProtections.forEach(p => {
        debugLog(`   Protected range: ${p.getRange().getA1Notation()}`);
        debugLog(`   Warning only: ${p.isWarningOnly()}`);
        debugLog(`   Description: ${p.getDescription()}`);
      });
    } else {
      debugLog('⚠️ No header protections found');
    }
    
    // Check data validation
    const headerRange = testSheet.getRange(1, 1, 1, testSheet.getLastColumn());
    let headerValidationFound = false;
    
    for (let col = 1; col <= testSheet.getLastColumn(); col++) {
      const cell = testSheet.getRange(1, col);
      if (cell.getDataValidation()) {
        headerValidationFound = true;
        debugLog(`❌ Data validation found in header cell ${cell.getA1Notation()}`);
      }
    }
    
    if (!headerValidationFound) {
      debugLog('✅ No data validation found in header row (good!)');
    }
    
    debugLog('🧪 Protection test completed');
    return true;
    
  } catch (error) {
    console.error('❌ Protection test failed:', error);
    return false;
  }
}

/**
 * 🔄 Manual trigger to validate and fix all headers immediately
 */
function validateAndFixAllHeadersNow() {
  debugLog('🔄 Running immediate header validation and fix...');
  dailyHeaderValidation();
  debugLog('✅ Manual validation completed');
}
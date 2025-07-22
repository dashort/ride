/**
 * Simple Header Protection Implementation
 * Add these functions to prevent spreadsheet header corruption
 */

/**
 * Apply comprehensive protection to a header row
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The sheet to protect
 */
function protectSheetHeaders(sheet) {
  try {
    // Freeze the header row so it stays visible
    sheet.setFrozenRows(1);
    
    // Style the header row for visibility
    const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    headerRange
      .setFontWeight('bold')
      .setBackground('#f3f3f3')
      .setBorder(true, true, true, true, false, false);

    // Protect the header row from editing
    const protection = headerRange.protect();
    protection.setDescription('Protected header row - Do not modify directly');
    protection.setWarningOnly(true); // Shows warning but allows override if needed
    
    console.log(`✅ Protected headers for sheet: ${sheet.getName()}`);
    
  } catch (error) {
    console.error(`❌ Error protecting headers for ${sheet.getName()}:`, error);
  }
}

/**
 * Validate that sheet headers match expected headers
 */
function validateAndFixHeaders(sheet, sheetName, expectedHeaders) {
  if (!expectedHeaders || expectedHeaders.length === 0) return;
  
  try {
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const expectedTrimmed = expectedHeaders.map(h => String(h).trim());
    const currentTrimmed = currentHeaders.map(h => String(h).trim());
    
    // Check if headers match
    const headersMatch = expectedTrimmed.every((header, index) => 
      currentTrimmed[index] === header
    );
    
    if (!headersMatch) {
      console.warn(`⚠️ Header mismatch detected in ${sheetName}!`);
      console.log('Expected:', expectedTrimmed);
      console.log('Current:', currentTrimmed);
      
      // Auto-fix if safe to do so
      if (currentHeaders.length === expectedHeaders.length) {
        sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
        protectSheetHeaders(sheet);
        console.log(`🔧 Auto-fixed headers for ${sheetName}`);
      } else {
        console.error(`❌ Cannot auto-fix ${sheetName}: column count mismatch`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error validating headers for ${sheetName}:`, error);
  }
}

/**
 * Validate headers for all critical sheets
 */
function validateAllSheetHeaders() {
  const criticalSheets = [
    { name: CONFIG.sheets.requests, headers: Object.values(CONFIG.columns.requests) },
    { name: CONFIG.sheets.riders, headers: Object.values(CONFIG.columns.riders) },
    { name: CONFIG.sheets.assignments, headers: Object.values(CONFIG.columns.assignments) }
  ];
  
  let issuesFound = 0;
  
  criticalSheets.forEach(({ name, headers }) => {
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
      if (sheet) {
        validateAndFixHeaders(sheet, name, headers);
      } else {
        console.warn(`⚠️ Missing sheet: ${name}`);
        issuesFound++;
      }
    } catch (error) {
      console.error(`❌ Error validating ${name}:`, error);
      issuesFound++;
    }
  });
  
  return issuesFound;
}

/**
 * Setup protection for all sheets
 */
function setupAllHeaderProtection() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  
  sheets.forEach(sheet => {
    protectSheetHeaders(sheet);
  });
  
  console.log('🛡️ Header protection applied to all sheets!');
}

/**
 * Backup headers for all critical sheets
 */
function backupAllHeaders() {
  const criticalSheets = [
    CONFIG.sheets.requests,
    CONFIG.sheets.riders, 
    CONFIG.sheets.assignments,
    CONFIG.sheets.riderAvailability
  ];
  
  const backups = {};
  const timestamp = new Date().toISOString();
  
  criticalSheets.forEach(sheetName => {
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
      if (sheet) {
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        backups[sheetName] = {
          headers: headers,
          timestamp: timestamp,
          columnCount: headers.length
        };
      }
    } catch (error) {
      console.error(`❌ Error backing up ${sheetName}:`, error);
    }
  });
  
  // Store backup in Properties Service
  PropertiesService.getScriptProperties().setProperty(
    'header_backup_' + timestamp.split('T')[0], 
    JSON.stringify(backups)
  );
  
  console.log(`�� Backed up headers for ${Object.keys(backups).length} sheets`);
  return backups;
}

/**
 * Setup automated daily header validation (run once)
 */
function setupDailyHeaderValidation() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'dailyHeaderValidation') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new daily trigger
  ScriptApp.newTrigger('dailyHeaderValidation')
    .timeBased()
    .everyDays(1)
    .atHour(6) // Run at 6 AM daily
    .create();
    
  console.log('⏰ Setup daily header validation at 6 AM');
}

/**
 * Daily automated header validation
 */
function dailyHeaderValidation() {
  try {
    console.log('⏰ Running daily header validation...');
    
    // Backup current headers
    backupAllHeaders();
    
    // Validate all headers
    const issues = validateAllSheetHeaders();
    
    if (issues > 0) {
      // Send alert email if configured
      const adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
      if (adminEmail) {
        MailApp.sendEmail(
          adminEmail,
          '⚠️ Header Issues Detected',
          `Found and auto-fixed ${issues} header issues.\n\nTime: ${new Date()}`
        );
      }
    }
    
    console.log('✅ Daily header validation completed');
    
  } catch (error) {
    console.error('❌ Error in daily header validation:', error);
    
    // Send alert email if configured
    const adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
    if (adminEmail) {
      MailApp.sendEmail(
        adminEmail,
        '🚨 Header Validation Failed',
        `Daily header validation failed with error: ${error.message}\n\nTime: ${new Date()}`
      );
    }
  }
}

/**
 * One-time setup function - run this after adding the code
 */
function setupHeaderProtectionSystem() {
  console.log('🚀 Setting up header protection system...');
  
  try {
    // 1. Backup current headers
    console.log('1. Backing up current headers...');
    backupAllHeaders();
    
    // 2. Validate and fix any current issues
    console.log('2. Validating current headers...');
    const issues = validateAllSheetHeaders();
    
    // 3. Apply protection to all sheets
    console.log('3. Applying header protection...');
    setupAllHeaderProtection();
    
    // 4. Setup daily validation
    console.log('4. Setting up daily validation...');
    setupDailyHeaderValidation();
    
    // 5. Set admin email for notifications
    console.log('5. Setting up notifications...');
    const adminEmail = 'your-email@domain.com'; // CHANGE THIS TO YOUR EMAIL
    PropertiesService.getScriptProperties().setProperty('ADMIN_EMAIL', adminEmail);
    
    console.log('✅ Header protection system setup complete!');
    console.log(`📧 Admin email set to: ${adminEmail}`);
    console.log('🕖 Daily validation scheduled for 6:00 AM');
    
    return {
      success: true,
      issuesFixed: issues,
      message: 'Header protection system is now active'
    };
    
  } catch (error) {
    console.error('❌ Error setting up header protection:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

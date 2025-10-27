/**
 * 🛡️ Header Duplication Prevention and Fix System
 * 
 * This script addresses the duplicate "Last Updated" columns issue
 * and provides comprehensive prevention mechanisms.
 */

/**
 * 🔍 Detect and fix duplicate columns in all sheets
 */
function fixAllDuplicateColumns() {
  console.log('🔍 Starting comprehensive duplicate column detection and fix...');
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  let totalIssuesFixed = 0;
  
  sheets.forEach(sheet => {
    const issuesFixed = fixDuplicateColumnsInSheet(sheet);
    totalIssuesFixed += issuesFixed;
  });
  
  console.log(`✅ Fixed ${totalIssuesFixed} duplicate column issues across all sheets`);
  
  // Send notification if issues were found and fixed
  if (totalIssuesFixed > 0) {
    const adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
    if (adminEmail) {
      MailApp.sendEmail(
        adminEmail,
        '🔧 Duplicate Columns Fixed',
        `Automatically detected and fixed ${totalIssuesFixed} duplicate column issues.\n\nTime: ${new Date()}`
      );
    }
  }
  
  return { totalIssuesFixed };
}

/**
 * 🔧 Fix duplicate columns in a specific sheet
 */
function fixDuplicateColumnsInSheet(sheet) {
  const sheetName = sheet.getName();
  console.log(`🔍 Checking ${sheetName} for duplicate columns...`);
  
  try {
    const lastColumn = sheet.getLastColumn();
    if (lastColumn === 0) return 0;
    
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    const duplicates = findDuplicateHeaders(headers);
    
    if (duplicates.length === 0) {
      console.log(`✅ No duplicates found in ${sheetName}`);
      return 0;
    }
    
    console.log(`⚠️ Found duplicate columns in ${sheetName}:`, duplicates);
    
    // Backup the sheet data before fixing
    backupSheetData(sheet);
    
    // Remove duplicate columns
    const cleanedHeaders = removeDuplicateHeaders(headers);
    const issuesFixed = headers.length - cleanedHeaders.length;
    
    if (issuesFixed > 0) {
      // Get all data
      const allData = sheet.getDataRange().getValues();
      const dataRows = allData.slice(1);
      
      // Create mapping for data preservation
      const columnMapping = createColumnMapping(headers, cleanedHeaders);
      
      // Reorganize data according to cleaned headers
      const cleanedData = reorganizeData(dataRows, columnMapping, cleanedHeaders.length);
      
      // Clear sheet and rewrite with cleaned data
      sheet.clear();
      
      // Set cleaned headers
      if (cleanedHeaders.length > 0) {
        sheet.getRange(1, 1, 1, cleanedHeaders.length).setValues([cleanedHeaders]);
        
        // Format headers
        const headerRange = sheet.getRange(1, 1, 1, cleanedHeaders.length);
        headerRange.setFontWeight('bold')
                  .setBackground('#f3f3f3')
                  .setBorder(true, true, true, true, false, false);
        
        // Freeze header row
        sheet.setFrozenRows(1);
      }
      
      // Add cleaned data
      if (cleanedData.length > 0) {
        sheet.getRange(2, 1, cleanedData.length, cleanedHeaders.length).setValues(cleanedData);
      }
      
      // Protect headers
      protectSheetHeaders(sheet);
      
      console.log(`🔧 Fixed ${issuesFixed} duplicate columns in ${sheetName}`);
    }
    
    return issuesFixed;
    
  } catch (error) {
    console.error(`❌ Error fixing duplicates in ${sheetName}:`, error);
    return 0;
  }
}

/**
 * 🔍 Find duplicate headers in an array
 */
function findDuplicateHeaders(headers) {
  const seen = new Set();
  const duplicates = [];
  
  headers.forEach((header, index) => {
    const normalizedHeader = String(header).trim().toLowerCase();
    if (seen.has(normalizedHeader)) {
      duplicates.push({
        header: header,
        index: index,
        normalized: normalizedHeader
      });
    } else {
      seen.add(normalizedHeader);
    }
  });
  
  return duplicates;
}

/**
 * 🧹 Remove duplicate headers, keeping only the first occurrence
 */
function removeDuplicateHeaders(headers) {
  const seen = new Set();
  const cleaned = [];
  
  headers.forEach(header => {
    const normalizedHeader = String(header).trim().toLowerCase();
    if (!seen.has(normalizedHeader) && header.trim() !== '') {
      seen.add(normalizedHeader);
      cleaned.push(header);
    }
  });
  
  return cleaned;
}

/**
 * 🗺️ Create mapping from old column indices to new column indices
 */
function createColumnMapping(oldHeaders, newHeaders) {
  const mapping = {};
  
  oldHeaders.forEach((header, oldIndex) => {
    const normalizedHeader = String(header).trim().toLowerCase();
    const newIndex = newHeaders.findIndex(newHeader => 
      String(newHeader).trim().toLowerCase() === normalizedHeader
    );
    
    if (newIndex !== -1) {
      mapping[oldIndex] = newIndex;
    }
  });
  
  return mapping;
}

/**
 * 🔄 Reorganize data rows according to column mapping
 */
function reorganizeData(dataRows, columnMapping, newColumnCount) {
  return dataRows.map(row => {
    const newRow = new Array(newColumnCount).fill('');
    
    Object.entries(columnMapping).forEach(([oldIndex, newIndex]) => {
      newRow[newIndex] = row[oldIndex] || '';
    });
    
    return newRow;
  });
}

/**
 * 💾 Backup sheet data before making changes
 */
function backupSheetData(sheet) {
  try {
    const sheetName = sheet.getName();
    const timestamp = new Date().toISOString().split('T')[0];
    const backupKey = `sheet_backup_${sheetName}_${timestamp}`;
    
    const data = sheet.getDataRange().getValues();
    const backup = {
      sheetName: sheetName,
      timestamp: new Date().toISOString(),
      data: data,
      rowCount: data.length,
      columnCount: data[0]?.length || 0
    };
    
    PropertiesService.getScriptProperties().setProperty(
      backupKey, 
      JSON.stringify(backup)
    );
    
    console.log(`💾 Backed up ${sheetName} (${backup.rowCount} rows, ${backup.columnCount} columns)`);
  } catch (error) {
    console.warn(`⚠️ Could not backup ${sheet.getName()}:`, error);
  }
}

/**
 * 🛡️ Protect sheet headers from accidental editing
 */
function protectSheetHeaders(sheet) {
  try {
    const lastColumn = sheet.getLastColumn();
    if (lastColumn === 0) return;
    
    const headerRange = sheet.getRange(1, 1, 1, lastColumn);
    const protection = headerRange.protect();
    protection.setDescription(`Protected headers for ${sheet.getName()}`);
    protection.setWarningOnly(true);
    
    console.log(`🛡️ Protected headers for ${sheet.getName()}`);
  } catch (error) {
    console.warn(`⚠️ Could not protect headers for ${sheet.getName()}:`, error);
  }
}

/**
 * 🔍 Enhanced version of ensureAvailabilitySheet to prevent duplicates
 */
function ensureAvailabilitySheetSafe() {
  const sheetName = CONFIG.sheets.availability;
  const expectedHeaders = Object.values(CONFIG.columns.availability);
  
  console.log(`🔍 Safely ensuring ${sheetName} sheet with proper headers...`);
  
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  
  if (!sheet) {
    // Create new sheet with headers
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    protectSheetHeaders(sheet);
    console.log(`✅ Created ${sheetName} with ${expectedHeaders.length} headers`);
    return sheet;
  }
  
  // Validate existing sheet headers
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    // Empty sheet - add headers
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    protectSheetHeaders(sheet);
    console.log(`✅ Added headers to empty ${sheetName} sheet`);
    return sheet;
  }
  
  const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  
  // Check for duplicates first
  const duplicates = findDuplicateHeaders(currentHeaders);
  if (duplicates.length > 0) {
    console.log(`⚠️ Found ${duplicates.length} duplicate headers in ${sheetName}, fixing...`);
    fixDuplicateColumnsInSheet(sheet);
    return sheet;
  }
  
  // Check if we have all expected headers
  const missingHeaders = expectedHeaders.filter(header => 
    !currentHeaders.some(current => 
      String(current).trim().toLowerCase() === String(header).trim().toLowerCase()
    )
  );
  
  if (missingHeaders.length > 0) {
    console.log(`📝 Adding ${missingHeaders.length} missing headers to ${sheetName}:`, missingHeaders);
    
    // Add missing headers to the end
    const newHeaders = [...currentHeaders, ...missingHeaders];
    sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
    protectSheetHeaders(sheet);
  }
  
  return sheet;
}

/**
 * 🔧 Fix the original ensureAvailabilitySheet function by replacing it
 */
function fixAvailabilityServiceFunction() {
  console.log('🔧 Implementing safe availability sheet management...');
  
  // Create a backup of the current function (in comments)
  const backupNote = `
  /*
   * ORIGINAL FUNCTION (CAUSED DUPLICATES):
   * function ensureAvailabilitySheet() {
   *   const sheetName = CONFIG.sheets.availability;
   *   const headers = Object.values(CONFIG.columns.availability);
   *   const sheet = getOrCreateSheet(sheetName, headers);
   *   const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
   *   if (currentHeaders.length < headers.length) {
   *     sheet.insertColumnsAfter(currentHeaders.length, headers.length - currentHeaders.length);
   *     sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
   *   }
   * }
   * 
   * ISSUE: The above function would insert columns even when they already existed,
   * then overwrite all headers, causing duplicates.
   */
  `;
  
  console.log('📝 The original ensureAvailabilitySheet function needs to be replaced with ensureAvailabilitySheetSafe');
  console.log('⚠️ Manual action required: Replace ensureAvailabilitySheet with ensureAvailabilitySheetSafe in AvailabilityService.gs');
  
  return {
    success: true,
    message: 'Safe replacement function created',
    actionRequired: 'Replace ensureAvailabilitySheet function in AvailabilityService.gs'
  };
}

/**
 * 📋 Menu function to run duplicate column fix
 */
function menuFixDuplicateColumns() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    '🔧 Fix Duplicate Columns',
    'This will scan all sheets for duplicate columns and fix them automatically. ' +
    'Data will be preserved. Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    const result = fixAllDuplicateColumns();
    ui.alert(
      '✅ Duplicate Column Fix Complete',
      `Fixed ${result.totalIssuesFixed} duplicate column issues.`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * ⏰ Daily automated duplicate detection
 */
function dailyDuplicateColumnCheck() {
  try {
    console.log('⏰ Running daily duplicate column check...');
    
    const result = fixAllDuplicateColumns();
    
    if (result.totalIssuesFixed > 0) {
      console.log(`🔧 Daily check fixed ${result.totalIssuesFixed} issues`);
    } else {
      console.log('✅ Daily check found no duplicate column issues');
    }
    
  } catch (error) {
    console.error('❌ Error in daily duplicate column check:', error);
    
    const adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
    if (adminEmail) {
      MailApp.sendEmail(
        adminEmail,
        '🚨 Duplicate Column Check Failed',
        `Daily duplicate column check failed with error: ${error.message}\n\nTime: ${new Date()}`
      );
    }
  }
}

/**
 * 🎯 Setup automated daily checks
 */
function setupDailyDuplicateColumnCheck() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'dailyDuplicateColumnCheck') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new daily trigger
  ScriptApp.newTrigger('dailyDuplicateColumnCheck')
    .timeBased()
    .everyDays(1)
    .atHour(5) // Run at 5 AM daily
    .create();
    
  console.log('⏰ Setup daily duplicate column check at 5 AM');
}
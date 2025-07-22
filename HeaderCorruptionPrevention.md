# 🛡️ Spreadsheet Header Corruption Prevention Guide

## Problem Analysis

Based on your system, the backend spreadsheet corruption issue you experienced likely occurred due to:

1. **Unprotected Header Rows**: Headers can be accidentally modified by users
2. **Lack of Validation**: No automated checking for header integrity  
3. **No Backup/Recovery**: Missing restoration mechanisms
4. **Manual Sheet Operations**: Direct spreadsheet editing without safeguards

## 🔧 Immediate Prevention Steps

### 1. Freeze and Protect Header Rows

Add this function to your existing codebase (add to `SheetServices.gs`):

```javascript
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
```

### 2. Add Header Validation to Existing Functions

Modify your `getOrCreateSheet` function in `SheetServices.gs`:

```javascript
function getOrCreateSheet(sheetName, headers = []) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length)
        .setValues([headers])
        .setFontWeight('bold')
        .setBackground('#f3f3f3');
      sheet.setFrozenRows(1);
      
      // ADD THIS: Protect the headers
      protectSheetHeaders(sheet);
    }
    logActivity(`Created sheet: ${sheetName}`);
  } else {
    // ADD THIS: Validate existing headers
    validateAndFixHeaders(sheet, sheetName, headers);
  }

  return sheet;
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
```

### 3. Add to Your Menu System

Add this to your `Menu.gs` file:

```javascript
// Add this to your existing menu creation function
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('🏍️ Escort Management')
    // ... your existing menu items ...
    .addSeparator()
    .addSubMenu(ui.createMenu('🛡️ System Protection')
      .addItem('✅ Validate All Headers', 'validateAllSheetHeaders')
      .addItem('🔧 Fix Corrupted Headers', 'fixAllCorruptedHeaders') 
      .addItem('🛡️ Setup Header Protection', 'setupAllHeaderProtection')
      .addItem('💾 Backup All Headers', 'backupAllHeaders'))
    .addToUi();
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
  
  if (issuesFound === 0) {
    SpreadsheetApp.getUi().alert('✅ All headers validated successfully!');
  } else {
    SpreadsheetApp.getUi().alert(`⚠️ Found issues with ${issuesFound} sheets. Check logs for details.`);
  }
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
  
  SpreadsheetApp.getUi().alert('🛡️ Header protection applied to all sheets!');
}
```

### 4. Create Header Backup System

Add this to `CoreUtils.gs`:

```javascript
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
  
  console.log(`💾 Backed up headers for ${Object.keys(backups).length} sheets`);
  return backups;
}

/**
 * Restore headers from most recent backup
 */
function restoreHeadersFromBackup(sheetName) {
  try {
    const properties = PropertiesService.getScriptProperties().getProperties();
    const backupKeys = Object.keys(properties).filter(key => key.startsWith('header_backup_'));
    
    if (backupKeys.length === 0) {
      throw new Error('No header backups found');
    }
    
    // Get most recent backup
    const latestBackupKey = backupKeys.sort().pop();
    const backup = JSON.parse(properties[latestBackupKey]);
    
    if (!backup[sheetName]) {
      throw new Error(`No backup found for sheet: ${sheetName}`);
    }
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName}`);
    }
    
    // Restore headers
    const headerData = backup[sheetName];
    sheet.getRange(1, 1, 1, headerData.headers.length).setValues([headerData.headers]);
    protectSheetHeaders(sheet);
    
    console.log(`🔄 Restored headers for ${sheetName} from backup ${headerData.timestamp}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error restoring headers for ${sheetName}:`, error);
    return false;
  }
}
```

### 5. Setup Automated Daily Validation

Add this trigger setup to your code:

```javascript
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
    validateAllSheetHeaders();
    
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
```

## 🔍 Manual Implementation Steps

1. **Copy the protection function** to your `SheetServices.gs`
2. **Update your `getOrCreateSheet` function** with validation
3. **Add the menu items** to your `Menu.gs`
4. **Add backup functions** to your `CoreUtils.gs`
5. **Run the setup functions** once:
   ```javascript
   setupAllHeaderProtection();
   setupDailyHeaderValidation();
   backupAllHeaders();
   ```

## 🚨 Emergency Recovery

If headers get corrupted again:

1. **Check available backups**:
   ```javascript
   // In Apps Script console
   const props = PropertiesService.getScriptProperties().getProperties();
   console.log(Object.keys(props).filter(k => k.includes('header_backup')));
   ```

2. **Restore from backup**:
   ```javascript
   restoreHeadersFromBackup('Assignments'); // or whatever sheet name
   ```

3. **Manual fix** (if no backup):
   ```javascript
   fixAllCorruptedHeaders();
   ```

## 📧 Admin Email Setup

Set your admin email for alerts:
```javascript
PropertiesService.getScriptProperties().setProperty('ADMIN_EMAIL', 'your-email@domain.com');
```

## 🔄 Testing the Protection

1. **Validate current state**: Run `validateAllSheetHeaders()`
2. **Test protection**: Try manually editing a header (should show warning)
3. **Test backup/restore**: 
   - Run `backupAllHeaders()`
   - Manually corrupt a header
   - Run `restoreHeadersFromBackup('SheetName')`

This comprehensive approach will prevent future header corruption through multiple layers of protection, validation, backup, and automated monitoring.

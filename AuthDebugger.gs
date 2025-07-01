/**
 * @fileoverview
 * Authentication Debugger - Helps diagnose authentication issues
 */

/**
 * Debug authentication for the current user
 */
function debugCurrentUserAuthentication() {
  console.log('🔍 === AUTHENTICATION DEBUG SESSION ===');
  
  try {
    // Step 1: Check raw Google session
    console.log('\n1. 📍 GOOGLE SESSION CHECK:');
    const user = Session.getActiveUser();
    const userEmail = user.getEmail();
    const userName = user.getName();
    
    console.log(`   - User Email: ${userEmail}`);
    console.log(`   - User Name: ${userName}`);
    console.log(`   - Has Email: ${!!userEmail}`);
    
    // Step 2: Check admin users list
    console.log('\n2. 📍 ADMIN USERS CHECK:');
    const adminUsers = getAdminUsers();
    console.log(`   - Admin Users List: ${JSON.stringify(adminUsers)}`);
    console.log(`   - Is Current User Admin: ${adminUsers.includes(userEmail)}`);
    
    // Step 3: Check dispatcher users list
    console.log('\n3. 📍 DISPATCHER USERS CHECK:');
    const dispatcherUsers = getDispatcherUsers();
    console.log(`   - Dispatcher Users List: ${JSON.stringify(dispatcherUsers)}`);
    console.log(`   - Is Current User Dispatcher: ${dispatcherUsers.includes(userEmail)}`);
    
    // Step 4: Check rider lookup
    console.log('\n4. 📍 RIDER LOOKUP CHECK:');
    const rider = getRiderByGoogleEmail(userEmail);
    console.log(`   - Rider Found: ${!!rider}`);
    if (rider) {
      console.log(`   - Rider Details: ${JSON.stringify(rider)}`);
      console.log(`   - Rider Status: ${rider.status}`);
      console.log(`   - Is Active: ${rider.status === 'Active'}`);
    }
    
    // Step 5: Check Users spreadsheet
    console.log('\n5. 📍 USERS SPREADSHEET CHECK:');
    const userRecord = findUserRecord(userEmail);
    console.log(`   - User Record Found: ${!!userRecord}`);
    if (userRecord) {
      console.log(`   - User Record: ${JSON.stringify(userRecord)}`);
      console.log(`   - Status: ${userRecord.status}`);
      console.log(`   - Role: ${userRecord.role}`);
    }
    
    // Step 6: Run full authentication
    console.log('\n6. 📍 FULL AUTHENTICATION TEST:');
    const authResult = authenticateUser();
    console.log(`   - Auth Success: ${authResult.success}`);
    console.log(`   - Auth Result: ${JSON.stringify(authResult)}`);
    
    // Step 7: Test Google-specific authentication
    console.log('\n7. 📍 GOOGLE AUTH TEST:');
    if (typeof authenticateWithGoogle === 'function') {
      const googleAuthResult = authenticateWithGoogle();
      console.log(`   - Google Auth Success: ${googleAuthResult.success}`);
      console.log(`   - Google Auth Result: ${JSON.stringify(googleAuthResult)}`);
    } else {
      console.log('   - authenticateWithGoogle function not available');
    }
    
    // Step 8: Check spreadsheet access
    console.log('\n8. 📍 SPREADSHEET ACCESS CHECK:');
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      console.log(`   - Can Access Spreadsheet: true`);
      console.log(`   - Spreadsheet Name: ${ss.getName()}`);
      
      // Check specific sheets
      const sheets = ['Users', 'Riders', 'Settings'];
      sheets.forEach(sheetName => {
        const sheet = ss.getSheetByName(sheetName);
        console.log(`   - ${sheetName} Sheet Exists: ${!!sheet}`);
        if (sheet) {
          console.log(`   - ${sheetName} Rows: ${sheet.getLastRow()}`);
        }
      });
      
    } catch (error) {
      console.log(`   - Spreadsheet Access Error: ${error.message}`);
    }
    
    console.log('\n🔍 === DEBUG SESSION COMPLETE ===');
    
    return {
      userEmail: userEmail,
      isAdmin: adminUsers.includes(userEmail),
      isDispatcher: dispatcherUsers.includes(userEmail),
      hasRiderRecord: !!rider,
      hasUserRecord: !!userRecord,
      authResult: authResult
    };
    
  } catch (error) {
    console.error('❌ Debug session error:', error);
    return { error: error.message };
  }
}

/**
 * Debug specific email authentication
 */
function debugSpecificUserAuth(email) {
  console.log(`🔍 === DEBUGGING AUTH FOR: ${email} ===`);
  
  try {
    // Check all authentication sources
    const adminUsers = getAdminUsers();
    const dispatcherUsers = getDispatcherUsers();
    const rider = getRiderByGoogleEmail(email);
    const userRecord = findUserRecord(email);
    
    console.log(`📍 RESULTS FOR ${email}:`);
    console.log(`   - In Admin List: ${adminUsers.includes(email)}`);
    console.log(`   - In Dispatcher List: ${dispatcherUsers.includes(email)}`);
    console.log(`   - Has Rider Record: ${!!rider}`);
    console.log(`   - Has User Record: ${!!userRecord}`);
    
    if (rider) {
      console.log(`   - Rider Status: ${rider.status}`);
    }
    
    if (userRecord) {
      console.log(`   - User Role: ${userRecord.role}`);
      console.log(`   - User Status: ${userRecord.status}`);
    }
    
    // Determine what should happen
    let expectedRole = 'unauthorized';
    if (adminUsers.includes(email)) expectedRole = 'admin';
    else if (dispatcherUsers.includes(email)) expectedRole = 'dispatcher';
    else if (rider && rider.status === 'Active') expectedRole = 'rider';
    
    console.log(`   - Expected Role: ${expectedRole}`);
    
    return {
      email: email,
      inAdminList: adminUsers.includes(email),
      inDispatcherList: dispatcherUsers.includes(email),
      hasRiderRecord: !!rider,
      hasUserRecord: !!userRecord,
      expectedRole: expectedRole
    };
    
  } catch (error) {
    console.error('❌ Specific user debug error:', error);
    return { error: error.message };
  }
}

/**
 * Check Users spreadsheet structure
 */
function debugUsersSpreadsheetStructure() {
  console.log('🔍 === USERS SPREADSHEET STRUCTURE DEBUG ===');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Users');
    
    if (!sheet) {
      console.log('❌ Users sheet does not exist!');
      return { error: 'Users sheet not found' };
    }
    
    console.log('✅ Users sheet found');
    
    // Check headers
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    console.log(`📍 Headers: ${JSON.stringify(headers)}`);
    
    // Check for required columns
    const requiredColumns = ['email', 'hashedPassword', 'role', 'status', 'name'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      console.log(`❌ Missing columns: ${JSON.stringify(missingColumns)}`);
    } else {
      console.log('✅ All required columns present');
    }
    
    // Show sample data (first 3 rows)
    const dataRows = Math.min(4, sheet.getLastRow()); // Header + 3 data rows
    if (dataRows > 1) {
      const sampleData = sheet.getRange(1, 1, dataRows, sheet.getLastColumn()).getValues();
      console.log('📍 Sample Data:');
      sampleData.forEach((row, index) => {
        if (index === 0) {
          console.log(`   Headers: ${JSON.stringify(row)}`);
        } else {
          // Mask password for security
          const maskedRow = [...row];
          const passIndex = headers.indexOf('hashedPassword');
          if (passIndex >= 0 && maskedRow[passIndex]) {
            maskedRow[passIndex] = '[HASH]';
          }
          console.log(`   Row ${index}: ${JSON.stringify(maskedRow)}`);
        }
      });
    }
    
    return {
      sheetExists: true,
      headers: headers,
      missingColumns: missingColumns,
      rowCount: sheet.getLastRow()
    };
    
  } catch (error) {
    console.error('❌ Users spreadsheet debug error:', error);
    return { error: error.message };
  }
}

/**
 * Quick fix: Add user to dispatcher list
 */
function quickAddToDispatcherList(email) {
  console.log(`🔧 Adding ${email} to dispatcher list...`);
  
  try {
    // You'll need to update this based on how your dispatcher list is stored
    // Option 1: If stored in Settings sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settingsSheet = ss.getSheetByName('Settings');
    
    if (settingsSheet) {
      // Find next empty row in dispatcher column (typically column C)
      const dispatcherColumn = 3; // Column C
      const lastRow = settingsSheet.getLastRow();
      let nextRow = 2; // Start from row 2
      
      // Find next empty cell
      for (let i = 2; i <= lastRow + 1; i++) {
        const cellValue = settingsSheet.getRange(i, dispatcherColumn).getValue();
        if (!cellValue) {
          nextRow = i;
          break;
        }
      }
      
      settingsSheet.getRange(nextRow, dispatcherColumn).setValue(email);
      console.log(`✅ Added ${email} to Settings sheet row ${nextRow}`);
      
    } else {
      console.log('❌ Settings sheet not found');
    }
    
    // Option 2: You might need to modify getDispatcherUsers() function directly
    console.log('💡 You may also need to update the getDispatcherUsers() function directly');
    
  } catch (error) {
    console.error('❌ Error adding to dispatcher list:', error);
  }
}

/**
 * Test all authentication functions
 */
function runFullAuthTest() {
  console.log('🧪 === RUNNING FULL AUTHENTICATION TEST ===');
  
  const results = {
    currentUser: debugCurrentUserAuthentication(),
    usersSheet: debugUsersSpreadsheetStructure()
  };
  
  console.log('\n📊 === TEST SUMMARY ===');
  console.log(JSON.stringify(results, null, 2));
  
  return results;
}
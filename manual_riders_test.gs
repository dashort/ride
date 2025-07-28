/**
 * Manual Riders Test Script
 * Run this function in Google Apps Script to manually test riders loading
 */

function manualRidersTest() {
  console.log('🧪 === MANUAL RIDERS TEST START ===');
  
  try {
    // Test 1: Check CONFIG
    console.log('\n1. CONFIG Check:');
    if (typeof CONFIG !== 'undefined' && CONFIG.sheets && CONFIG.sheets.riders) {
      console.log(`✅ CONFIG.sheets.riders = "${CONFIG.sheets.riders}"`);
    } else {
      console.log('❌ CONFIG not found or invalid');
      return;
    }
    
    // Test 2: Check Spreadsheet
    console.log('\n2. Spreadsheet Check:');
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    console.log(`✅ Spreadsheet: "${spreadsheet.getName()}"`);
    
    // Test 3: Check Riders Sheet
    console.log('\n3. Riders Sheet Check:');
    let ridersSheet = spreadsheet.getSheetByName(CONFIG.sheets.riders);
    if (ridersSheet) {
      console.log(`✅ Riders sheet found: "${ridersSheet.getName()}"`);
      console.log(`   Last row: ${ridersSheet.getLastRow()}`);
      console.log(`   Last column: ${ridersSheet.getLastColumn()}`);
      
      if (ridersSheet.getLastRow() > 0) {
        const headers = ridersSheet.getRange(1, 1, 1, ridersSheet.getLastColumn()).getValues()[0];
        console.log(`   Headers: ${JSON.stringify(headers)}`);
      }
    } else {
      console.log('❌ Riders sheet not found');
      console.log('🔧 Creating sheet with sample data...');
      
      ridersSheet = spreadsheet.insertSheet(CONFIG.sheets.riders);
      const headers = ['Rider ID', 'Full Name', 'Phone Number', 'Email', 'Status', 'Platoon', 'Part-Time Rider', 'Certification'];
      ridersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      const sampleData = [
        ['R001', 'Test Rider 1', '555-0001', 'test1@nopd.com', 'Active', 'A', 'No', 'Certified'],
        ['R002', 'Test Rider 2', '555-0002', 'test2@nopd.com', 'Active', 'B', 'Yes', 'Certified'],
        ['R003', 'Test Rider 3', '555-0003', 'test3@nopd.com', 'Inactive', 'A', 'No', 'Training']
      ];
      
      ridersSheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
      console.log('✅ Created Riders sheet with sample data');
    }
    
    // Test 4: Test getRiders()
    console.log('\n4. getRiders() Test:');
    const riders = getRiders();
    console.log(`✅ getRiders() returned ${riders.length} riders`);
    
    if (riders.length > 0) {
      console.log('   Sample riders:');
      riders.slice(0, 3).forEach((rider, i) => {
        console.log(`   ${i + 1}. ${rider.name || 'No Name'} (${rider.jpNumber || 'No ID'}) - ${rider.status || 'No Status'}`);
      });
    }
    
    // Test 5: Test getPageDataForRiders()
    console.log('\n5. getPageDataForRiders() Test:');
    const pageData = getPageDataForRiders();
    console.log(`✅ getPageDataForRiders() completed`);
    console.log(`   Success: ${pageData.success}`);
    console.log(`   Riders count: ${pageData.riders ? pageData.riders.length : 0}`);
    console.log(`   Has user: ${!!pageData.user}`);
    console.log(`   Has stats: ${!!pageData.stats}`);
    console.log(`   Error: ${pageData.error || 'None'}`);
    
    if (pageData.success && pageData.riders && pageData.riders.length > 0) {
      console.log('\n🎉 SUCCESS: All tests passed!');
      console.log('✅ Riders loading should work now');
      console.log('🔄 Try refreshing the riders page');
    } else {
      console.log('\n⚠️ ISSUES FOUND:');
      if (!pageData.success) console.log('   - API function returned success: false');
      if (!pageData.riders || pageData.riders.length === 0) console.log('   - No riders returned');
      if (pageData.error) console.log(`   - Error: ${pageData.error}`);
    }
    
    console.log('\n🧪 === MANUAL RIDERS TEST END ===');
    return pageData;
    
  } catch (error) {
    console.error('❌ Manual test failed:', error);
    console.log('\n🧪 === MANUAL RIDERS TEST END (WITH ERROR) ===');
    return { success: false, error: error.message };
  }
}

/**
 * Quick fix function - run this to try and fix common issues
 */
function quickFix() {
  console.log('🔧 Running quick fix...');
  
  try {
    // Fix 1: Ensure Riders sheet exists
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let ridersSheet = spreadsheet.getSheetByName(CONFIG.sheets.riders);
    
    if (!ridersSheet) {
      console.log('Creating Riders sheet...');
      ridersSheet = spreadsheet.insertSheet(CONFIG.sheets.riders);
      
      const headers = ['Rider ID', 'Full Name', 'Phone Number', 'Email', 'Status', 'Platoon', 'Part-Time Rider', 'Certification'];
      ridersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      const sampleData = [
        ['R001', 'John Smith', '555-0101', 'john.smith@nopd.com', 'Active', 'A', 'No', 'Certified'],
        ['R002', 'Jane Doe', '555-0102', 'jane.doe@nopd.com', 'Active', 'B', 'Yes', 'Certified'],
        ['R003', 'Mike Wilson', '555-0103', 'mike.wilson@nopd.com', 'Active', 'A', 'No', 'Training'],
        ['R004', 'Sarah Johnson', '555-0104', 'sarah.johnson@nopd.com', 'Inactive', 'C', 'No', 'Certified']
      ];
      
      ridersSheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
      console.log('✅ Created Riders sheet with sample data');
    }
    
    // Fix 2: Test the main function
    const result = getPageDataForRiders();
    
    if (result.success) {
      console.log('✅ Quick fix successful!');
      console.log(`✅ ${result.riders.length} riders available`);
      return { success: true, message: 'Quick fix completed successfully', ridersCount: result.riders.length };
    } else {
      console.log('❌ Quick fix didn\'t resolve the issue');
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.error('❌ Quick fix failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reset everything and start fresh
 */
function resetEverything() {
  console.log('🔄 Resetting everything...');
  
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // Delete existing Riders sheet if it exists
    let ridersSheet = spreadsheet.getSheetByName(CONFIG.sheets.riders);
    if (ridersSheet) {
      spreadsheet.deleteSheet(ridersSheet);
      console.log('🗑️ Deleted existing Riders sheet');
    }
    
    // Create fresh sheet
    ridersSheet = spreadsheet.insertSheet(CONFIG.sheets.riders);
    
    const headers = [
      'Rider ID', 'Full Name', 'Phone Number', 'Email', 'Status', 
      'Platoon', 'Part-Time Rider', 'Certification', 'Total Assignments', 'Last Assignment Date'
    ];
    
    ridersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    const freshData = [
      ['R001', 'Officer John Smith', '504-123-4567', 'john.smith@nopd.com', 'Active', 'A Platoon', 'No', 'Motorcycle Certified', '5', '2024-01-15'],
      ['R002', 'Officer Jane Doe', '504-234-5678', 'jane.doe@nopd.com', 'Active', 'B Platoon', 'Yes', 'Motorcycle Certified', '3', '2024-01-10'],
      ['R003', 'Officer Mike Johnson', '504-345-6789', 'mike.johnson@nopd.com', 'Active', 'A Platoon', 'No', 'Advanced Certified', '8', '2024-01-18'],
      ['R004', 'Officer Sarah Wilson', '504-456-7890', 'sarah.wilson@nopd.com', 'Available', 'C Platoon', 'No', 'Motorcycle Certified', '2', '2024-01-05'],
      ['R005', 'Officer Tom Brown', '504-567-8901', 'tom.brown@nopd.com', 'Active', 'B Platoon', 'Yes', 'Motorcycle Certified', '12', '2024-01-20']
    ];
    
    ridersSheet.getRange(2, 1, freshData.length, freshData[0].length).setValues(freshData);
    
    console.log('✅ Created fresh Riders sheet with sample data');
    
    // Test the result
    const result = getPageDataForRiders();
    
    if (result.success && result.riders.length > 0) {
      console.log('🎉 Reset successful!');
      console.log(`✅ ${result.riders.length} riders now available`);
      return { success: true, message: 'Reset completed successfully', ridersCount: result.riders.length };
    } else {
      console.log('❌ Reset didn\'t resolve the issue');
      return { success: false, error: result.error || 'Unknown error after reset' };
    }
    
  } catch (error) {
    console.error('❌ Reset failed:', error);
    return { success: false, error: error.message };
  }
}
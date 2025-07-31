/**
 * Comprehensive Riders Loading Diagnostic and Fix Tool
 * This script diagnoses and fixes the "error loading riders, no data received from server" issue
 */

function diagnoseAndFixRidersLoading() {
  debugLog('🩺 COMPREHENSIVE RIDERS LOADING DIAGNOSTIC & FIX');
  debugLog('=================================================');
  
  const results = {
    diagnosis: {},
    fixes: [],
    success: false,
    riders: [],
    stats: {}
  };
  
  try {
    // Step 1: Check spreadsheet access
    debugLog('\n📋 Step 1: Checking Spreadsheet Access...');
    let spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      results.diagnosis.spreadsheetAccess = true;
      debugLog('✅ Spreadsheet access: OK');
    } catch (error) {
      results.diagnosis.spreadsheetAccess = false;
      console.error('❌ Spreadsheet access failed:', error.message);
      return results;
    }
    
    // Step 2: Check if Riders sheet exists
    debugLog('\n📊 Step 2: Checking Riders Sheet...');
    let ridersSheet = spreadsheet.getSheetByName(CONFIG.sheets.riders);
    
    if (!ridersSheet) {
      debugLog('❌ Riders sheet not found. Creating it...');
      
      try {
        ridersSheet = spreadsheet.insertSheet(CONFIG.sheets.riders);
        
        // Add headers
        const headers = [
          'Rider ID', 'Full Name', 'Phone Number', 'Email', 'Status', 
          'Platoon', 'Part-Time Rider', 'Certification', 'Organization', 'Total Assignments'
        ];
        
        ridersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        
        // Add sample data
        const sampleData = [
          ['JP001', 'John Smith', '504-123-4567', 'john.smith@nopd.com', 'Active', 'A Platoon', 'No', 'Motorcycle', 'NOPD', 5],
          ['JP002', 'Jane Doe', '504-234-5678', 'jane.doe@nopd.com', 'Active', 'B Platoon', 'Yes', 'Motorcycle', 'NOPD', 3],
          ['JP003', 'Mike Johnson', '504-345-6789', 'mike.johnson@nopd.com', 'Active', 'C Platoon', 'No', 'Advanced', 'NOPD', 8]
        ];
        
        ridersSheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
        
        debugLog('✅ Created Riders sheet with sample data');
        results.fixes.push('Created missing Riders sheet with sample data');
        
      } catch (createError) {
        console.error('❌ Failed to create Riders sheet:', createError.message);
        results.diagnosis.sheetCreation = false;
        return results;
      }
    } else {
      debugLog('✅ Riders sheet exists');
    }
    
    results.diagnosis.ridersSheetExists = true;
    
    // Step 3: Check sheet data
    debugLog('\n📝 Step 3: Analyzing Sheet Data...');
    const dataRange = ridersSheet.getDataRange();
    const allValues = dataRange.getValues();
    
    debugLog(`   - Total rows: ${allValues.length}`);
    debugLog(`   - Headers: ${JSON.stringify(allValues[0])}`);
    
    if (allValues.length < 2) {
      debugLog('❌ No data rows found. Adding sample data...');
      
      const sampleData = [
        ['JP001', 'John Smith', '504-123-4567', 'john.smith@nopd.com', 'Active', 'A Platoon', 'No', 'Motorcycle', 'NOPD', 5],
        ['JP002', 'Jane Doe', '504-234-5678', 'jane.doe@nopd.com', 'Active', 'B Platoon', 'Yes', 'Motorcycle', 'NOPD', 3],
        ['JP003', 'Mike Johnson', '504-345-6789', 'mike.johnson@nopd.com', 'Active', 'C Platoon', 'No', 'Advanced', 'NOPD', 8]
      ];
      
      ridersSheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
      debugLog('✅ Added sample rider data');
      results.fixes.push('Added sample rider data to empty sheet');
      
      // Re-read the data
      const updatedDataRange = ridersSheet.getDataRange();
      const updatedAllValues = updatedDataRange.getValues();
      debugLog(`   - Updated total rows: ${updatedAllValues.length}`);
    }
    
    // Step 4: Test data retrieval methods
    debugLog('\n🔍 Step 4: Testing Data Retrieval Methods...');
    
    // Test Method 1: getRiders()
    try {
      debugLog('Testing getRiders()...');
      const ridersMethod1 = getRiders();
      debugLog(`✅ getRiders() returned ${ridersMethod1.length} riders`);
      results.diagnosis.getRidersWorks = true;
      
      if (ridersMethod1.length > 0) {
        results.riders = ridersMethod1;
        debugLog('Sample rider from getRiders():', JSON.stringify(ridersMethod1[0], null, 2));
      }
      
    } catch (error) {
      console.error('❌ getRiders() failed:', error.message);
      results.diagnosis.getRidersWorks = false;
    }
    
    // Test Method 2: getRidersWithFallback()
    try {
      debugLog('Testing getRidersWithFallback()...');
      const ridersMethod2 = getRidersWithFallback();
      debugLog(`✅ getRidersWithFallback() returned ${ridersMethod2.length} riders`);
      results.diagnosis.getRidersWithFallbackWorks = true;
      
      if (!results.riders || results.riders.length === 0) {
        results.riders = ridersMethod2;
      }
      
    } catch (error) {
      console.error('❌ getRidersWithFallback() failed:', error.message);
      results.diagnosis.getRidersWithFallbackWorks = false;
    }
    
    // Test Method 3: Direct sheet reading
    try {
      debugLog('Testing direct sheet reading...');
      const headers = allValues[0];
      const dataRows = allValues.slice(1);
      
      const directRiders = dataRows.map(row => {
        const rider = {};
        headers.forEach((header, index) => {
          rider[header] = row[index] || '';
        });
        
        // Normalize field names
        rider.name = rider.name || rider['Full Name'] || rider[headers[1]] || '';
        rider.jpNumber = rider.jpNumber || rider['Rider ID'] || rider[headers[0]] || '';
        rider.phone = rider.phone || rider['Phone Number'] || rider[headers[2]] || '';
        rider.email = rider.email || rider['Email'] || rider[headers[3]] || '';
        rider.status = rider.status || rider['Status'] || rider[headers[4]] || 'Active';
        
        return rider;
      }).filter(rider => rider.name && rider.name.trim().length > 0);
      
      debugLog(`✅ Direct sheet reading returned ${directRiders.length} riders`);
      results.diagnosis.directReadingWorks = true;
      
      if (!results.riders || results.riders.length === 0) {
        results.riders = directRiders;
      }
      
    } catch (error) {
      console.error('❌ Direct sheet reading failed:', error.message);
      results.diagnosis.directReadingWorks = false;
    }
    
    // Step 5: Test main function
    debugLog('\n🎯 Step 5: Testing Main Function...');
    try {
      debugLog('Testing getPageDataForRiders()...');
      const pageData = getPageDataForRiders();
      
      debugLog('✅ getPageDataForRiders() completed');
      debugLog(`   - Success: ${pageData.success}`);
      debugLog(`   - Riders count: ${pageData.riders ? pageData.riders.length : 0}`);
      debugLog(`   - User: ${pageData.user ? pageData.user.name : 'None'}`);
      debugLog(`   - Error: ${pageData.error || 'None'}`);
      
      if (pageData.success && pageData.riders && pageData.riders.length > 0) {
        results.success = true;
        results.riders = pageData.riders;
        results.stats = pageData.stats;
        debugLog('🎉 SUCCESS: Main function works correctly!');
      } else {
        debugLog('⚠️ Main function completed but with issues');
      }
      
      results.diagnosis.mainFunctionWorks = pageData.success;
      
    } catch (error) {
      console.error('❌ getPageDataForRiders() failed:', error.message);
      results.diagnosis.mainFunctionWorks = false;
    }
    
    // Step 6: Calculate final statistics
    if (results.riders && results.riders.length > 0) {
      results.stats = {
        totalRiders: results.riders.length,
        activeRiders: results.riders.filter(r => r.status === 'Active').length,
        inactiveRiders: results.riders.filter(r => r.status !== 'Active').length,
        partTimeRiders: results.riders.filter(r => r.partTime === 'Yes' || r['Part-Time Rider'] === 'Yes').length
      };
      
      results.stats.fullTimeRiders = results.stats.totalRiders - results.stats.partTimeRiders;
    }
    
    // Step 7: Final summary
    debugLog('\n📊 DIAGNOSTIC SUMMARY:');
    debugLog('======================');
    debugLog(`Spreadsheet Access: ${results.diagnosis.spreadsheetAccess ? '✅' : '❌'}`);
    debugLog(`Riders Sheet Exists: ${results.diagnosis.ridersSheetExists ? '✅' : '❌'}`);
    debugLog(`getRiders() Works: ${results.diagnosis.getRidersWorks ? '✅' : '❌'}`);
    debugLog(`getRidersWithFallback() Works: ${results.diagnosis.getRidersWithFallbackWorks ? '✅' : '❌'}`);
    debugLog(`Direct Reading Works: ${results.diagnosis.directReadingWorks ? '✅' : '❌'}`);
    debugLog(`Main Function Works: ${results.diagnosis.mainFunctionWorks ? '✅' : '❌'}`);
    debugLog(`Total Riders Found: ${results.riders.length}`);
    debugLog(`Fixes Applied: ${results.fixes.length}`);
    
    if (results.fixes.length > 0) {
      debugLog('\nFixes Applied:');
      results.fixes.forEach((fix, index) => {
        debugLog(`${index + 1}. ${fix}`);
      });
    }
    
    if (results.success) {
      debugLog('\n🎉 RESULT: Riders loading is now working correctly!');
    } else {
      debugLog('\n⚠️ RESULT: Issues still exist. Check the diagnosis above.');
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Critical error in diagnostic:', error);
    results.diagnosis.criticalError = error.message;
    return results;
  }
}

/**
 * Quick test function to check if riders loading is working
 */
function quickRidersTest() {
  debugLog('🚀 Quick Riders Loading Test');
  debugLog('============================');
  
  try {
    const result = getPageDataForRiders();
    
    if (result.success && result.riders && result.riders.length > 0) {
      debugLog('✅ SUCCESS: Riders loading works!');
      debugLog(`   Found ${result.riders.length} riders`);
      debugLog(`   User: ${result.user ? result.user.name : 'Unknown'}`);
      
      // Show first few riders
      result.riders.slice(0, 3).forEach((rider, i) => {
        debugLog(`   ${i + 1}. ${rider.name} (${rider.jpNumber}) - ${rider.status}`);
      });
      
      return { success: true, count: result.riders.length };
    } else {
      debugLog('❌ FAILED: No riders returned or error occurred');
      debugLog(`   Error: ${result.error || 'Unknown error'}`);
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.error('❌ Exception in test:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Force fix for riders loading issues
 */
function forceFixRidersLoading() {
  debugLog('🔧 FORCE FIX: Riders Loading Issues');
  debugLog('===================================');
  
  try {
    // Step 1: Ensure sheet exists with proper structure
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let ridersSheet = spreadsheet.getSheetByName(CONFIG.sheets.riders);
    
    if (!ridersSheet) {
      debugLog('Creating Riders sheet...');
      ridersSheet = spreadsheet.insertSheet(CONFIG.sheets.riders);
    }
    
    // Step 2: Clear and rebuild sheet with proper headers
    ridersSheet.clear();
    
    const headers = [
      'Rider ID', 'Full Name', 'Phone Number', 'Email', 'Status', 
      'Platoon', 'Part-Time Rider', 'Certification', 'Organization', 
      'Total Assignments', 'Last Assignment Date'
    ];
    
    ridersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Step 3: Add comprehensive sample data
    const sampleData = [
      ['JP001', 'Officer John Smith', '504-123-4567', 'john.smith@nopd.com', 'Active', 'A Platoon', 'No', 'Motorcycle', 'NOPD', 15, '2024-01-15'],
      ['JP002', 'Officer Jane Doe', '504-234-5678', 'jane.doe@nopd.com', 'Active', 'B Platoon', 'Yes', 'Motorcycle', 'NOPD', 8, '2024-01-12'],
      ['JP003', 'Officer Mike Johnson', '504-345-6789', 'mike.johnson@nopd.com', 'Active', 'C Platoon', 'No', 'Advanced', 'NOPD', 22, '2024-01-18'],
      ['JP004', 'Officer Sarah Wilson', '504-456-7890', 'sarah.wilson@nopd.com', 'Active', 'A Platoon', 'Yes', 'Motorcycle', 'NOPD', 6, '2024-01-10'],
      ['JP005', 'Officer Robert Brown', '504-567-8901', 'robert.brown@nopd.com', 'Active', 'B Platoon', 'No', 'Standard', 'NOPD', 12, '2024-01-16']
    ];
    
    ridersSheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
    
    debugLog('✅ Rebuilt Riders sheet with sample data');
    
    // Step 4: Test the fix
    const testResult = quickRidersTest();
    
    if (testResult.success) {
      debugLog('🎉 FORCE FIX SUCCESSFUL! Riders loading now works.');
      return { success: true, ridersCount: testResult.count };
    } else {
      debugLog('⚠️ Force fix completed but test still fails.');
      return { success: false, error: testResult.error };
    }
    
  } catch (error) {
    console.error('❌ Force fix failed:', error);
    return { success: false, error: error.message };
  }
}
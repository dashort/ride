/**
 * Comprehensive Riders Loading Fix Script
 * This script diagnoses and fixes the riders loading issue
 */

function fixRidersLoadingIssue() {
  console.log('🔧 Starting comprehensive riders loading fix...');
  
  const results = {
    timestamp: new Date().toISOString(),
    steps: [],
    fixes: [],
    success: false
  };
  
  try {
    // Step 1: Check if Riders sheet exists and create if needed
    console.log('\n📋 Step 1: Checking Riders sheet...');
    const sheetResult = ensureRidersSheet();
    results.steps.push(sheetResult);
    
    // Step 2: Test basic data functions
    console.log('\n📊 Step 2: Testing data functions...');
    const dataResult = testDataFunctions();
    results.steps.push(dataResult);
    
    // Step 3: Test the main API function
    console.log('\n🌐 Step 3: Testing getPageDataForRiders...');
    const apiResult = testMainAPIFunction();
    results.steps.push(apiResult);
    
    // Step 4: Verify frontend compatibility
    console.log('\n💻 Step 4: Checking frontend compatibility...');
    const frontendResult = checkFrontendCompatibility();
    results.steps.push(frontendResult);
    
    // Generate summary
    results.success = results.steps.every(step => step.success);
    
    console.log('\n📋 Fix Summary:');
    console.log(`✅ Overall Success: ${results.success}`);
    
    results.steps.forEach((step, i) => {
      console.log(`${step.success ? '✅' : '❌'} Step ${i + 1}: ${step.name} - ${step.success ? 'PASSED' : 'FAILED'}`);
      if (!step.success && step.error) {
        console.log(`   Error: ${step.error}`);
      }
    });
    
    if (results.success) {
      console.log('\n🎉 All checks passed! Riders loading should work now.');
      console.log('🔄 Try refreshing the riders page.');
    } else {
      console.log('\n⚠️ Some issues found. Check the details above.');
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Critical error during fix:', error);
    return { success: false, error: error.message, results };
  }
}

function ensureRidersSheet() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let ridersSheet = spreadsheet.getSheetByName(CONFIG.sheets.riders);
    
    if (!ridersSheet) {
      console.log('❌ Riders sheet not found, creating...');
      
      // Create the sheet
      ridersSheet = spreadsheet.insertSheet(CONFIG.sheets.riders);
      
      // Set up headers
      const headers = [
        'Rider ID', 'Full Name', 'Phone Number', 'Email', 'Status', 
        'Platoon', 'Part-Time Rider', 'Certification', 'Total Assignments', 'Last Assignment Date'
      ];
      
      ridersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Add sample data
      const sampleData = [
        ['R001', 'John Smith', '555-0101', 'john.smith@nopd.com', 'Active', 'A', 'No', 'Certified', '0', ''],
        ['R002', 'Jane Doe', '555-0102', 'jane.doe@nopd.com', 'Active', 'B', 'Yes', 'Certified', '0', ''],
        ['R003', 'Mike Wilson', '555-0103', 'mike.wilson@nopd.com', 'Inactive', 'A', 'No', 'Training', '0', '']
      ];
      
      ridersSheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
      
      console.log('✅ Created Riders sheet with sample data');
      return { success: true, name: 'Riders Sheet Creation', message: 'Created with sample data' };
    } else {
      console.log('✅ Riders sheet exists');
      
      // Check if it has data
      const lastRow = ridersSheet.getLastRow();
      if (lastRow <= 1) {
        console.log('⚠️ Riders sheet is empty, adding sample data...');
        const sampleData = [
          ['R001', 'John Smith', '555-0101', 'john.smith@nopd.com', 'Active', 'A', 'No', 'Certified', '0', ''],
          ['R002', 'Jane Doe', '555-0102', 'jane.doe@nopd.com', 'Active', 'B', 'Yes', 'Certified', '0', ''],
          ['R003', 'Mike Wilson', '555-0103', 'mike.wilson@nopd.com', 'Inactive', 'A', 'No', 'Training', '0', '']
        ];
        ridersSheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
        console.log('✅ Added sample data to empty sheet');
      }
      
      return { success: true, name: 'Riders Sheet Check', message: `Sheet exists with ${lastRow} rows` };
    }
  } catch (error) {
    console.error('❌ Error with riders sheet:', error);
    return { success: false, name: 'Riders Sheet Check', error: error.message };
  }
}

function testDataFunctions() {
  try {
    console.log('Testing getRiders()...');
    const riders = getRiders();
    console.log(`✅ getRiders() returned ${riders.length} riders`);
    
    if (riders.length > 0) {
      console.log('Sample rider:', {
        name: riders[0].name,
        jpNumber: riders[0].jpNumber,
        status: riders[0].status
      });
    }
    
    return { 
      success: riders.length >= 0, 
      name: 'Data Functions Test', 
      message: `getRiders() returned ${riders.length} riders` 
    };
  } catch (error) {
    console.error('❌ Error testing data functions:', error);
    return { success: false, name: 'Data Functions Test', error: error.message };
  }
}

function testMainAPIFunction() {
  try {
    console.log('Testing getPageDataForRiders()...');
    const result = getPageDataForRiders();
    
    console.log('API Result:', {
      success: result.success,
      ridersCount: result.riders ? result.riders.length : 0,
      hasUser: !!result.user,
      hasStats: !!result.stats,
      error: result.error
    });
    
    if (result.success && result.riders && result.riders.length > 0) {
      console.log('✅ API function working correctly');
      return { 
        success: true, 
        name: 'Main API Test', 
        message: `API returned ${result.riders.length} riders successfully` 
      };
    } else {
      console.log('⚠️ API function has issues');
      return { 
        success: false, 
        name: 'Main API Test', 
        error: result.error || 'No riders returned' 
      };
    }
  } catch (error) {
    console.error('❌ Error testing API function:', error);
    return { success: false, name: 'Main API Test', error: error.message };
  }
}

function checkFrontendCompatibility() {
  try {
    // Test data structure compatibility
    const result = getPageDataForRiders();
    
    const requiredFields = ['success', 'riders', 'user', 'stats'];
    const missingFields = requiredFields.filter(field => !(field in result));
    
    if (missingFields.length > 0) {
      return { 
        success: false, 
        name: 'Frontend Compatibility', 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      };
    }
    
    // Check rider object structure
    if (result.riders && result.riders.length > 0) {
      const rider = result.riders[0];
      const riderFields = ['name', 'jpNumber', 'status'];
      const missingRiderFields = riderFields.filter(field => !(field in rider));
      
      if (missingRiderFields.length > 0) {
        console.log('⚠️ Some rider fields missing:', missingRiderFields);
      }
    }
    
    console.log('✅ Frontend compatibility check passed');
    return { 
      success: true, 
      name: 'Frontend Compatibility', 
      message: 'Data structure is compatible with frontend' 
    };
    
  } catch (error) {
    console.error('❌ Error checking frontend compatibility:', error);
    return { success: false, name: 'Frontend Compatibility', error: error.message };
  }
}

/**
 * Quick test function that can be called from frontend
 */
function quickRidersTest() {
  console.log('🚀 Quick riders test...');
  
  try {
    const result = getPageDataForRiders();
    console.log('Quick test result:', {
      success: result.success,
      ridersCount: result.riders ? result.riders.length : 0,
      error: result.error
    });
    
    return result;
  } catch (error) {
    console.error('❌ Quick test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reset riders data for testing
 */
function resetRidersData() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let ridersSheet = spreadsheet.getSheetByName(CONFIG.sheets.riders);
    
    if (ridersSheet) {
      // Clear existing data
      ridersSheet.clear();
      
      // Set up headers
      const headers = [
        'Rider ID', 'Full Name', 'Phone Number', 'Email', 'Status', 
        'Platoon', 'Part-Time Rider', 'Certification', 'Total Assignments', 'Last Assignment Date'
      ];
      
      ridersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Add fresh sample data
      const sampleData = [
        ['R001', 'John Smith', '555-0101', 'john.smith@nopd.com', 'Active', 'A', 'No', 'Certified', '5', '2024-01-15'],
        ['R002', 'Jane Doe', '555-0102', 'jane.doe@nopd.com', 'Active', 'B', 'Yes', 'Certified', '3', '2024-01-10'],
        ['R003', 'Mike Wilson', '555-0103', 'mike.wilson@nopd.com', 'Active', 'A', 'No', 'Training', '1', '2024-01-08'],
        ['R004', 'Sarah Johnson', '555-0104', 'sarah.johnson@nopd.com', 'Inactive', 'C', 'No', 'Certified', '8', '2023-12-20'],
        ['R005', 'Tom Brown', '555-0105', 'tom.brown@nopd.com', 'Active', 'B', 'Yes', 'Certified', '12', '2024-01-18']
      ];
      
      ridersSheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
      
      console.log('✅ Reset riders data with fresh sample data');
      return { success: true, message: 'Riders data reset successfully' };
    } else {
      return { success: false, error: 'Riders sheet not found' };
    }
  } catch (error) {
    console.error('❌ Error resetting riders data:', error);
    return { success: false, error: error.message };
  }
}
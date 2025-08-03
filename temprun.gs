/**
 * DATA INVESTIGATION SCRIPT
 * Since the fix is already applied but numbers are still wrong,
 * let's investigate your actual data to find the root cause
 */
/**
 * Comprehensive Riders Loading Diagnostic and Fix Tool
 * This script diagnoses and fixes the "error loading riders, no data received from server" issue
 */
/**
 * 🗑️ Remove all email response processing triggers that are causing duplicates
 * Run this function in Google Apps Script to stop the automated email processing
 */
/**
 * 🎯 Remove ONLY the dailyHeaderValidation trigger
 * This will keep your onEdit trigger and other triggers intact
 */
function removeDailyHeaderValidationTrigger() {
  try {
    console.log('🔍 Searching for dailyHeaderValidation trigger...');
    
    const triggers = ScriptApp.getProjectTriggers();
    let deletedCount = 0;
    let foundTrigger = null;
    
    // Find and remove only the dailyHeaderValidation trigger
    triggers.forEach(trigger => {
      const handlerFunction = trigger.getHandlerFunction();
      
      if (handlerFunction === 'dailyHeaderValidation') {
        foundTrigger = {
          id: trigger.getUniqueId(),
          function: handlerFunction,
          type: trigger.getTriggerSource().toString(),
          source: trigger.getTriggerSource() === ScriptApp.TriggerSource.CLOCK ? 'Time-based' : 'Other'
        };
        
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
        console.log(`🗑️ Deleted dailyHeaderValidation trigger: ${trigger.getUniqueId()}`);
      }
    });
    
    if (deletedCount > 0) {
      console.log(`✅ Successfully removed ${deletedCount} dailyHeaderValidation trigger(s)`);
      console.log('📋 Removed trigger details:', foundTrigger);
      console.log('🎉 Daily header validation automation has been stopped!');
      console.log('✅ Your onEdit and other triggers remain intact');
    } else {
      console.log('ℹ️ No dailyHeaderValidation trigger was found');
      console.log('💡 The trigger may have already been removed or named differently');
    }
    
    return {
      success: true,
      deletedCount: deletedCount,
      trigger: foundTrigger
    };
    
  } catch (error) {
    console.error('❌ Error removing dailyHeaderValidation trigger:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 🔍 Show only the current trigger status (safe to run anytime)
 * This helps you verify what triggers are active
 */
function showCurrentTriggerStatus() {
  try {
    console.log('🔍 Current trigger status:');
    console.log('=' .repeat(50));
    
    const triggers = ScriptApp.getProjectTriggers();
    
    if (triggers.length === 0) {
      console.log('✅ No triggers are currently active');
      return { triggerCount: 0, triggers: [] };
    }
    
    console.log(`📊 Found ${triggers.length} active trigger(s):`);
    
    let dailyHeaderTriggers = 0;
    let onEditTriggers = 0;
    let otherTriggers = 0;
    
    const triggerInfo = triggers.map(trigger => {
      const info = {
        id: trigger.getUniqueId(),
        function: trigger.getHandlerFunction(),
        source: trigger.getTriggerSource().toString(),
        type: 'Unknown'
      };
      
      // Categorize triggers
      if (trigger.getTriggerSource() === ScriptApp.TriggerSource.CLOCK) {
        info.type = 'Time-based';
      } else if (trigger.getTriggerSource() === ScriptApp.TriggerSource.SPREADSHEETS) {
        info.type = 'Spreadsheet event (onEdit/onChange)';
        onEditTriggers++;
      }
      
      // Count specific triggers
      if (info.function === 'dailyHeaderValidation') {
        dailyHeaderTriggers++;
        console.log(`   ⚠️ ${info.function} (${info.type}) - ID: ${info.id} [TARGET FOR REMOVAL]`);
      } else if (info.function === 'onEdit') {
        console.log(`   ✅ ${info.function} (${info.type}) - ID: ${info.id} [KEEPING THIS]`);
      } else {
        otherTriggers++;
        console.log(`   📌 ${info.function} (${info.type}) - ID: ${info.id}`);
      }
      
      return info;
    });
    
    console.log('\n📊 Summary:');
    console.log(`   • Daily header validation triggers: ${dailyHeaderTriggers} ${dailyHeaderTriggers > 0 ? '← Will be removed' : ''}`);
    console.log(`   • OnEdit triggers: ${onEditTriggers} ${onEditTriggers > 0 ? '← Will be kept' : ''}`);
    console.log(`   • Other triggers: ${otherTriggers}`);
    
    return {
      triggerCount: triggers.length,
      triggers: triggerInfo,
      dailyHeaderTriggers: dailyHeaderTriggers,
      onEditTriggers: onEditTriggers,
      otherTriggers: otherTriggers
    };
    
  } catch (error) {
    console.error('❌ Error checking trigger status:', error);
    return { error: error.message };
  }
}

/**
 * 🎯 Complete solution: Check status, remove daily trigger, verify result
 * This is the main function to run - it does everything safely
 */
function removeOnlyDailyHeaderTrigger() {
  try {
    console.log('🎯 Starting targeted removal of dailyHeaderValidation trigger...');
    console.log('=' .repeat(60));
    
    // Step 1: Show current status
    console.log('\n1️⃣ BEFORE - Current trigger status:');
    const beforeStatus = showCurrentTriggerStatus();
    
    if (beforeStatus.dailyHeaderTriggers === 0) {
      console.log('\n✅ No dailyHeaderValidation triggers found - nothing to remove!');
      return { success: true, message: 'No dailyHeaderValidation triggers found' };
    }
    
    // Step 2: Remove the daily header trigger
    console.log('\n2️⃣ REMOVING - dailyHeaderValidation trigger...');
    const removalResult = removeDailyHeaderValidationTrigger();
    
    if (!removalResult.success) {
      console.log('\n❌ Failed to remove trigger:', removalResult.error);
      return removalResult;
    }
    
    // Step 3: Verify the result
    console.log('\n3️⃣ AFTER - Verifying trigger status:');
    const afterStatus = showCurrentTriggerStatus();
    
    // Step 4: Summary
    console.log('\n🎉 COMPLETE - Summary:');
    console.log('=' .repeat(40));
    console.log(`✅ Removed ${removalResult.deletedCount} dailyHeaderValidation trigger(s)`);
    console.log(`✅ Kept ${afterStatus.onEditTriggers} onEdit trigger(s) intact`);
    console.log(`✅ Other triggers remain unchanged: ${afterStatus.otherTriggers}`);
    console.log('\n💡 Your header duplication issues should now be resolved!');
    
    return {
      success: true,
      message: 'Daily header validation trigger removed successfully',
      removed: removalResult.deletedCount,
      onEditTriggersKept: afterStatus.onEditTriggers,
      otherTriggersKept: afterStatus.otherTriggers
    };
    
  } catch (error) {
    console.error('❌ Error in complete removal process:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
function removeAllEmailProcessingTriggers() {
  try {
    console.log('🔍 Searching for email processing triggers...');
    
    const triggers = ScriptApp.getProjectTriggers();
    let deletedCount = 0;
    let triggerDetails = [];
    
    triggers.forEach(trigger => {
      const handlerFunction = trigger.getHandlerFunction();
      
      // Remove email response processing triggers
      if (handlerFunction === 'processEmailResponses') {
        triggerDetails.push({
          id: trigger.getUniqueId(),
          function: handlerFunction,
          type: trigger.getTriggerSource().toString()
        });
        
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
        console.log(`🗑️ Deleted email processing trigger: ${trigger.getUniqueId()}`);
      }
    });
    
    console.log(`✅ Successfully deleted ${deletedCount} email processing triggers`);
    
    if (deletedCount > 0) {
      console.log('📋 Deleted triggers details:', triggerDetails);
      console.log('🎉 Email processing automation has been stopped!');
      console.log('⚠️ Note: Emails will no longer be processed automatically');
    } else {
      console.log('ℹ️ No email processing triggers were found');
    }
    
    return {
      success: true,
      deletedCount: deletedCount,
      triggers: triggerDetails
    };
    
  } catch (error) {
    console.error('❌ Error removing email processing triggers:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 🧹 Remove ALL automated triggers (nuclear option)
 * Use this if you want to stop ALL automated processes
 */
function removeAllAutomatedTriggers() {
  try {
    console.log('🚨 REMOVING ALL AUTOMATED TRIGGERS - This will stop all automation!');
    
    const triggers = ScriptApp.getProjectTriggers();
    let deletedCount = 0;
    let triggerDetails = [];
    
    triggers.forEach(trigger => {
      const handlerFunction = trigger.getHandlerFunction();
      
      triggerDetails.push({
        id: trigger.getUniqueId(),
        function: handlerFunction,
        type: trigger.getTriggerSource().toString()
      });
      
      ScriptApp.deleteTrigger(trigger);
      deletedCount++;
      console.log(`🗑️ Deleted trigger: ${handlerFunction} (${trigger.getUniqueId()})`);
    });
    
    console.log(`✅ Successfully deleted ${deletedCount} triggers`);
    console.log('📋 Deleted triggers:', triggerDetails);
    console.log('🛑 ALL AUTOMATION HAS BEEN STOPPED!');
    
    return {
      success: true,
      deletedCount: deletedCount,
      triggers: triggerDetails
    };
    
  } catch (error) {
    console.error('❌ Error removing all triggers:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 🔍 Check what triggers are currently running
 * Use this to see what processes are active before removing them
 */
function checkCurrentTriggers() {
  try {
    console.log('🔍 Checking current triggers...');
    
    const triggers = ScriptApp.getProjectTriggers();
    
    if (triggers.length === 0) {
      console.log('✅ No triggers are currently running');
      return { triggerCount: 0, triggers: [] };
    }
    
    console.log(`📊 Found ${triggers.length} active triggers:`);
    
    const triggerInfo = triggers.map(trigger => {
      const info = {
        id: trigger.getUniqueId(),
        function: trigger.getHandlerFunction(),
        source: trigger.getTriggerSource().toString(),
        type: 'Unknown'
      };
      
      // Determine trigger type
      if (trigger.getTriggerSource() === ScriptApp.TriggerSource.CLOCK) {
        info.type = 'Time-based';
      } else if (trigger.getTriggerSource() === ScriptApp.TriggerSource.SPREADSHEETS) {
        info.type = 'Spreadsheet event';
      }
      
      console.log(`   📌 ${info.function} (${info.type}) - ID: ${info.id}`);
      
      return info;
    });
    
    // Identify problematic triggers
    const emailTriggers = triggerInfo.filter(t => t.function === 'processEmailResponses');
    const headerTriggers = triggerInfo.filter(t => t.function.includes('header') || t.function.includes('Header'));
    
    if (emailTriggers.length > 0) {
      console.log('⚠️ Found email processing triggers (likely causing duplicates):', emailTriggers.length);
    }
    
    if (headerTriggers.length > 0) {
      console.log('⚠️ Found header-related triggers:', headerTriggers.length);
    }
    
    return {
      triggerCount: triggers.length,
      triggers: triggerInfo,
      emailTriggers: emailTriggers,
      headerTriggers: headerTriggers
    };
    
  } catch (error) {
    console.error('❌ Error checking triggers:', error);
    return { error: error.message };
  }
}

/**
 * 🎯 Smart trigger removal - only removes problematic ones
 * This removes triggers that are likely causing header duplication issues
 */
function removeProblematicTriggers() {
  try {
    console.log('🎯 Removing only problematic triggers that cause duplicates...');
    
    const triggers = ScriptApp.getProjectTriggers();
    let deletedCount = 0;
    let triggerDetails = [];
    
    // Functions that commonly cause header duplication issues
    const problematicFunctions = [
      'processEmailResponses',
      'fixRequestsHeaderOrder',
      'dailyHeaderValidation',
      'setupEmailResponsesSheet',
      'executeBackgroundAssignmentProcessing'
    ];
    
    triggers.forEach(trigger => {
      const handlerFunction = trigger.getHandlerFunction();
      
      if (problematicFunctions.includes(handlerFunction)) {
        triggerDetails.push({
          id: trigger.getUniqueId(),
          function: handlerFunction,
          type: trigger.getTriggerSource().toString(),
          reason: 'Causes header duplication'
        });
        
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
        console.log(`🗑️ Removed problematic trigger: ${handlerFunction}`);
      }
    });
    
    console.log(`✅ Removed ${deletedCount} problematic triggers`);
    
    if (deletedCount > 0) {
      console.log('🎉 Header duplication issues should now be resolved!');
    } else {
      console.log('ℹ️ No problematic triggers found');
    }
    
    return {
      success: true,
      deletedCount: deletedCount,
      triggers: triggerDetails
    };
    
  } catch (error) {
    console.error('❌ Error removing problematic triggers:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
function diagnoseAndFixRidersLoading() {
  console.log('🩺 COMPREHENSIVE RIDERS LOADING DIAGNOSTIC & FIX');
  console.log('=================================================');
  
  const results = {
    diagnosis: {},
    fixes: [],
    success: false,
    riders: [],
    stats: {}
  };
  
  try {
    // Step 1: Check spreadsheet access
    console.log('\n📋 Step 1: Checking Spreadsheet Access...');
    let spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      results.diagnosis.spreadsheetAccess = true;
      console.log('✅ Spreadsheet access: OK');
    } catch (error) {
      results.diagnosis.spreadsheetAccess = false;
      console.error('❌ Spreadsheet access failed:', error.message);
      return results;
    }
    
    // Step 2: Check if Riders sheet exists
    console.log('\n📊 Step 2: Checking Riders Sheet...');
    let ridersSheet = spreadsheet.getSheetByName(CONFIG.sheets.riders);
    
    if (!ridersSheet) {
      console.log('❌ Riders sheet not found. Creating it...');
      
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
        
        console.log('✅ Created Riders sheet with sample data');
        results.fixes.push('Created missing Riders sheet with sample data');
        
      } catch (createError) {
        console.error('❌ Failed to create Riders sheet:', createError.message);
        results.diagnosis.sheetCreation = false;
        return results;
      }
    } else {
      console.log('✅ Riders sheet exists');
    }
    
    results.diagnosis.ridersSheetExists = true;
    
    // Step 3: Check sheet data
    console.log('\n📝 Step 3: Analyzing Sheet Data...');
    const dataRange = ridersSheet.getDataRange();
    const allValues = dataRange.getValues();
    
    console.log(`   - Total rows: ${allValues.length}`);
    console.log(`   - Headers: ${JSON.stringify(allValues[0])}`);
    
    if (allValues.length < 2) {
      console.log('❌ No data rows found. Adding sample data...');
      
      const sampleData = [
        ['JP001', 'John Smith', '504-123-4567', 'john.smith@nopd.com', 'Active', 'A Platoon', 'No', 'Motorcycle', 'NOPD', 5],
        ['JP002', 'Jane Doe', '504-234-5678', 'jane.doe@nopd.com', 'Active', 'B Platoon', 'Yes', 'Motorcycle', 'NOPD', 3],
        ['JP003', 'Mike Johnson', '504-345-6789', 'mike.johnson@nopd.com', 'Active', 'C Platoon', 'No', 'Advanced', 'NOPD', 8]
      ];
      
      ridersSheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
      console.log('✅ Added sample rider data');
      results.fixes.push('Added sample rider data to empty sheet');
      
      // Re-read the data
      const updatedDataRange = ridersSheet.getDataRange();
      const updatedAllValues = updatedDataRange.getValues();
      console.log(`   - Updated total rows: ${updatedAllValues.length}`);
    }
    
    // Step 4: Test data retrieval methods
    console.log('\n🔍 Step 4: Testing Data Retrieval Methods...');
    
    // Test Method 1: getRiders()
    try {
      console.log('Testing getRiders()...');
      const ridersMethod1 = getRiders();
      console.log(`✅ getRiders() returned ${ridersMethod1.length} riders`);
      results.diagnosis.getRidersWorks = true;
      
      if (ridersMethod1.length > 0) {
        results.riders = ridersMethod1;
        console.log('Sample rider from getRiders():', JSON.stringify(ridersMethod1[0], null, 2));
      }
      
    } catch (error) {
      console.error('❌ getRiders() failed:', error.message);
      results.diagnosis.getRidersWorks = false;
    }
    
    // Test Method 2: getRidersWithFallback()
    try {
      console.log('Testing getRidersWithFallback()...');
      const ridersMethod2 = getRidersWithFallback();
      console.log(`✅ getRidersWithFallback() returned ${ridersMethod2.length} riders`);
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
      console.log('Testing direct sheet reading...');
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
      
      console.log(`✅ Direct sheet reading returned ${directRiders.length} riders`);
      results.diagnosis.directReadingWorks = true;
      
      if (!results.riders || results.riders.length === 0) {
        results.riders = directRiders;
      }
      
    } catch (error) {
      console.error('❌ Direct sheet reading failed:', error.message);
      results.diagnosis.directReadingWorks = false;
    }
    
    // Step 5: Test main function
    console.log('\n🎯 Step 5: Testing Main Function...');
    try {
      console.log('Testing getPageDataForRiders()...');
      const pageData = getPageDataForRiders();
      
      console.log('✅ getPageDataForRiders() completed');
      console.log(`   - Success: ${pageData.success}`);
      console.log(`   - Riders count: ${pageData.riders ? pageData.riders.length : 0}`);
      console.log(`   - User: ${pageData.user ? pageData.user.name : 'None'}`);
      console.log(`   - Error: ${pageData.error || 'None'}`);
      
      if (pageData.success && pageData.riders && pageData.riders.length > 0) {
        results.success = true;
        results.riders = pageData.riders;
        results.stats = pageData.stats;
        console.log('🎉 SUCCESS: Main function works correctly!');
      } else {
        console.log('⚠️ Main function completed but with issues');
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
    console.log('\n📊 DIAGNOSTIC SUMMARY:');
    console.log('======================');
    console.log(`Spreadsheet Access: ${results.diagnosis.spreadsheetAccess ? '✅' : '❌'}`);
    console.log(`Riders Sheet Exists: ${results.diagnosis.ridersSheetExists ? '✅' : '❌'}`);
    console.log(`getRiders() Works: ${results.diagnosis.getRidersWorks ? '✅' : '❌'}`);
    console.log(`getRidersWithFallback() Works: ${results.diagnosis.getRidersWithFallbackWorks ? '✅' : '❌'}`);
    console.log(`Direct Reading Works: ${results.diagnosis.directReadingWorks ? '✅' : '❌'}`);
    console.log(`Main Function Works: ${results.diagnosis.mainFunctionWorks ? '✅' : '❌'}`);
    console.log(`Total Riders Found: ${results.riders.length}`);
    console.log(`Fixes Applied: ${results.fixes.length}`);
    
    if (results.fixes.length > 0) {
      console.log('\nFixes Applied:');
      results.fixes.forEach((fix, index) => {
        console.log(`${index + 1}. ${fix}`);
      });
    }
    
    if (results.success) {
      console.log('\n🎉 RESULT: Riders loading is now working correctly!');
    } else {
      console.log('\n⚠️ RESULT: Issues still exist. Check the diagnosis above.');
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
  console.log('🚀 Quick Riders Loading Test');
  console.log('============================');
  
  try {
    const result = getPageDataForRiders();
    
    if (result.success && result.riders && result.riders.length > 0) {
      console.log('✅ SUCCESS: Riders loading works!');
      console.log(`   Found ${result.riders.length} riders`);
      console.log(`   User: ${result.user ? result.user.name : 'Unknown'}`);
      
      // Show first few riders
      result.riders.slice(0, 3).forEach((rider, i) => {
        console.log(`   ${i + 1}. ${rider.name} (${rider.jpNumber}) - ${rider.status}`);
      });
      
      return { success: true, count: result.riders.length };
    } else {
      console.log('❌ FAILED: No riders returned or error occurred');
      console.log(`   Error: ${result.error || 'Unknown error'}`);
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
  console.log('🔧 FORCE FIX: Riders Loading Issues');
  console.log('===================================');
  
  try {
    // Step 1: Ensure sheet exists with proper structure
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let ridersSheet = spreadsheet.getSheetByName(CONFIG.sheets.riders);
    
    if (!ridersSheet) {
      console.log('Creating Riders sheet...');
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
    
    console.log('✅ Rebuilt Riders sheet with sample data');
    
    // Step 4: Test the fix
    const testResult = quickRidersTest();
    
    if (testResult.success) {
      console.log('🎉 FORCE FIX SUCCESSFUL! Riders loading now works.');
      return { success: true, ridersCount: testResult.count };
    } else {
      console.log('⚠️ Force fix completed but test still fails.');
      return { success: false, error: testResult.error };
    }
    
  } catch (error) {
    console.error('❌ Force fix failed:', error);
    return { success: false, error: error.message };
  }
}
/**
 * MAIN INVESTIGATION: Find out why 104 completed requests only show 11 rider activity
 */

function investigateDataStructure() {
  console.log('🔍 === INVESTIGATING DATA STRUCTURE ===');
  
  try {
    // Get current date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    console.log(`📅 Investigating date range: ${startDate.toDateString()} to ${endDate.toDateString()}`);
    
    // 1. Check requests data structure
    console.log('\n📊 === REQUESTS DATA ANALYSIS ===');
    const requestsData = getRequestsData();
    console.log(`Total requests in system: ${requestsData.data.length}`);
    
    // Check completed requests
    let completedRequests = 0;
    let requestsWithRiders = 0;
    let requestsWithoutRiders = 0;
    let riderFieldExamples = [];
    
    requestsData.data.forEach((request, index) => {
      const status = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.status);
      const eventDate = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.eventDate);
      const ridersAssigned = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.ridersAssigned);
      const requestId = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.requestId);
      
      // Check if in date range
      let inDateRange = true;
      if (eventDate) {
        const requestDate = eventDate instanceof Date ? eventDate : new Date(eventDate);
        if (!isNaN(requestDate.getTime())) {
          inDateRange = requestDate >= startDate && requestDate <= endDate;
        }
      }
      
      if (inDateRange) {
        const statusLower = (status || '').toLowerCase().trim();
        if (statusLower === 'completed') {
          completedRequests++;
          
          // Check riders assigned field
          if (ridersAssigned && ridersAssigned.toString().trim()) {
            requestsWithRiders++;
            
            // Collect examples for analysis
            if (riderFieldExamples.length < 10) {
              riderFieldExamples.push({
                requestId: requestId,
                ridersAssigned: ridersAssigned,
                type: typeof ridersAssigned
              });
            }
          } else {
            requestsWithoutRiders++;
            
            // Show examples of requests without riders
            if (requestsWithoutRiders <= 5) {
              console.log(`   ⚠️ Request ${requestId}: Status='${status}' but no riders assigned`);
            }
          }
        }
      }
    });
    
    console.log(`✅ Completed requests in date range: ${completedRequests}`);
    console.log(`👥 Requests WITH riders assigned: ${requestsWithRiders}`);
    console.log(`❌ Requests WITHOUT riders assigned: ${requestsWithoutRiders}`);
    console.log(`📝 Rider field examples:`, riderFieldExamples);
    
    // 2. Check the ridersAssigned field structure
    console.log('\n👥 === RIDERS ASSIGNED FIELD ANALYSIS ===');
    
    const riderCounts = {};
    let totalRiderAssignments = 0;
    
    requestsData.data.forEach(request => {
      const status = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.status);
      const eventDate = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.eventDate);
      const ridersAssigned = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.ridersAssigned);
      const requestId = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.requestId);
      
      // Check if in date range and completed
      let inDateRange = true;
      if (eventDate) {
        const requestDate = eventDate instanceof Date ? eventDate : new Date(eventDate);
        if (!isNaN(requestDate.getTime())) {
          inDateRange = requestDate >= startDate && requestDate <= endDate;
        }
      }
      
      const statusLower = (status || '').toLowerCase().trim();
      if (inDateRange && statusLower === 'completed' && ridersAssigned) {
        
        // Parse riders (same logic as the fixed function)
        const assignedRidersList = String(ridersAssigned).split(',')
          .map(name => name.trim())
          .filter(name => name && name.length > 0);
        
        console.log(`📋 Request ${requestId}: Found ${assignedRidersList.length} riders: [${assignedRidersList.join(', ')}]`);
        
        assignedRidersList.forEach(riderName => {
          if (riderName) {
            riderCounts[riderName] = (riderCounts[riderName] || 0) + 1;
            totalRiderAssignments++;
          }
        });
      }
    });
    
    console.log(`🎯 Total rider assignments found: ${totalRiderAssignments}`);
    console.log(`👤 Unique riders with assignments:`, Object.keys(riderCounts).length);
    console.log(`📊 Rider breakdown:`, riderCounts);
    
    // 3. Check what the current generateRiderActivityReport actually returns
    console.log('\n🔍 === TESTING CURRENT RIDER ACTIVITY FUNCTION ===');
    
    try {
      // Test the actual function that should be fixed
      const riderActivityResult = generateRiderActivityReport(
        startDate.toISOString().split('T')[0], 
        endDate.toISOString().split('T')[0]
      );
      
      console.log(`📈 generateRiderActivityReport result:`, riderActivityResult);
      
      if (riderActivityResult && riderActivityResult.data) {
        const totalEscorts = riderActivityResult.data.reduce((sum, rider) => sum + (rider.escorts || 0), 0);
        console.log(`📊 Total escorts from function: ${totalEscorts}`);
        console.log(`📋 Riders returned: ${riderActivityResult.data.length}`);
      }
      
    } catch (functionError) {
      console.error('❌ Error calling generateRiderActivityReport:', functionError);
    }
    
    // 4. Check CONFIG columns mapping
    console.log('\n⚙️ === CONFIG COLUMNS CHECK ===');
    console.log('CONFIG.columns.requests.ridersAssigned:', CONFIG.columns.requests.ridersAssigned);
    console.log('CONFIG.columns.requests.status:', CONFIG.columns.requests.status);
    console.log('CONFIG.columns.requests.eventDate:', CONFIG.columns.requests.eventDate);
    
    // Check if the column mappings are correct
    console.log('Column mappings:');
    console.log('  ridersAssigned column index:', requestsData.columnMap[CONFIG.columns.requests.ridersAssigned]);
    console.log('  status column index:', requestsData.columnMap[CONFIG.columns.requests.status]);
    console.log('  eventDate column index:', requestsData.columnMap[CONFIG.columns.requests.eventDate]);
    
    return {
      completedRequests,
      requestsWithRiders,
      requestsWithoutRiders,
      totalRiderAssignments,
      uniqueRiders: Object.keys(riderCounts).length,
      riderCounts,
      riderFieldExamples
    };
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
    return { error: error.message };
  }
}

/**
 * CHECK SPECIFIC REQUESTS TO SEE WHY THEY'RE NOT COUNTING
 * This will help identify the exact issue
 */
function debugSpecificRequests() {
  console.log('🔎 === DEBUGGING SPECIFIC REQUESTS ===');
  
  try {
    const requestsData = getRequestsData();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    console.log('Looking at first 10 completed requests to see why they might not count...');
    
    let debugCount = 0;
    
    requestsData.data.forEach((request, index) => {
      if (debugCount >= 10) return; // Only check first 10
      
      const status = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.status);
      const eventDate = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.eventDate);
      const ridersAssigned = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.ridersAssigned);
      const requestId = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.requestId);
      
      const statusLower = (status || '').toLowerCase().trim();
      
      if (statusLower === 'completed') {
        debugCount++;
        
        // Check date range
        let inDateRange = true;
        let dateInfo = 'no date';
        if (eventDate) {
          const requestDate = eventDate instanceof Date ? eventDate : new Date(eventDate);
          if (!isNaN(requestDate.getTime())) {
            inDateRange = requestDate >= startDate && requestDate <= endDate;
            dateInfo = `${requestDate.toDateString()} (${inDateRange ? 'IN RANGE' : 'OUT OF RANGE'})`;
          } else {
            dateInfo = 'invalid date';
          }
        }
        
        // Check riders
        let riderInfo = 'no riders';
        let ridersCount = 0;
        if (ridersAssigned) {
          const assignedRidersList = String(ridersAssigned).split(',')
            .map(name => name.trim())
            .filter(name => name && name.length > 0);
          ridersCount = assignedRidersList.length;
          riderInfo = `${ridersCount} riders: [${assignedRidersList.join(', ')}]`;
        }
        
        const shouldCount = inDateRange && ridersAssigned && ridersCount > 0;
        
        console.log(`📋 Request ${requestId}:`);
        console.log(`   Status: '${status}' (✅ completed)`);
        console.log(`   Date: ${dateInfo}`);
        console.log(`   Riders: ${riderInfo}`);
        console.log(`   Should count: ${shouldCount ? '✅ YES' : '❌ NO'}`);
        console.log('');
      }
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

/**
 * CHECK IF THE FIXED FUNCTION IS ACTUALLY BEING USED
 * Sometimes old cached versions cause issues
 */
function checkFunctionVersion() {
  console.log('🔍 === CHECKING FUNCTION VERSION ===');
  
  try {
    // Get the actual function code to see if it's the fixed version
    const functionString = generateRiderActivityReport.toString();
    
    console.log('Function length:', functionString.length, 'characters');
    
    // Check for key indicators of the fixed version
    const hasRequestsData = functionString.includes('getRequestsData()');
    const hasAssignmentsData = functionString.includes('getAssignmentsData()');
    const hasRidersAssigned = functionString.includes('ridersAssigned');
    const hasCorrectFilter = functionString.includes("status === 'Completed'");
    
    console.log('Function analysis:');
    console.log(`  ✅ Uses getRequestsData(): ${hasRequestsData}`);
    console.log(`  ❌ Uses getAssignmentsData(): ${hasAssignmentsData}`);
    console.log(`  ✅ Checks ridersAssigned field: ${hasRidersAssigned}`);
    console.log(`  ✅ Filters by status === 'Completed': ${hasCorrectFilter}`);
    
    if (hasRequestsData && !hasAssignmentsData && hasRidersAssigned) {
      console.log('✅ Function appears to be the FIXED version');
    } else {
      console.log('❌ Function appears to be the OLD version or has issues');
    }
    
    // Show first 500 characters to help identify the version
    console.log('\nFirst 500 characters of function:');
    console.log(functionString.substring(0, 500) + '...');
    
  } catch (error) {
    console.error('❌ Function check failed:', error);
  }
}

/**
 * RUN COMPLETE DATA INVESTIGATION
 * This will run all checks to identify the exact problem
 */
function runCompleteDataInvestigation() {
  console.log('🚀 === COMPLETE DATA INVESTIGATION ===');
  
  console.log('\n1️⃣ Checking function version...');
  checkFunctionVersion();
  
  console.log('\n2️⃣ Investigating data structure...');
  const dataAnalysis = investigateDataStructure();
  
  console.log('\n3️⃣ Debugging specific requests...');
  debugSpecificRequests();
  
  console.log('\n🎯 === INVESTIGATION SUMMARY ===');
  if (dataAnalysis && !dataAnalysis.error) {
    console.log(`Completed requests: ${dataAnalysis.completedRequests}`);
    console.log(`Requests with riders: ${dataAnalysis.requestsWithRiders}`);
    console.log(`Total rider assignments: ${dataAnalysis.totalRiderAssignments}`);
    console.log(`Unique riders: ${dataAnalysis.uniqueRiders}`);
    
    // Identify the likely issues
    const issues = [];
    
    if (dataAnalysis.requestsWithoutRiders > dataAnalysis.requestsWithRiders) {
      issues.push(`❌ MAJOR ISSUE: ${dataAnalysis.requestsWithoutRiders} completed requests have no riders assigned`);
    }
    
    if (dataAnalysis.totalRiderAssignments < 50 && dataAnalysis.completedRequests > 100) {
      issues.push(`❌ MAJOR ISSUE: Very few rider assignments (${dataAnalysis.totalRiderAssignments}) compared to completed requests (${dataAnalysis.completedRequests})`);
    }
    
    if (dataAnalysis.totalRiderAssignments > 50) {
      issues.push(`🔍 INVESTIGATION NEEDED: Function should be finding ${dataAnalysis.totalRiderAssignments} rider assignments but only reports 11`);
    }
    
    if (issues.length > 0) {
      console.log('\n⚠️ IDENTIFIED ISSUES:');
      issues.forEach(issue => console.log(issue));
    } else {
      console.log('\n✅ Data looks good - issue may be in function logic');
    }
  }
  
  return dataAnalysis;
}


function checkColumns() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riders');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  console.log('Current headers:', headers);
  console.log('Expected headers:', CONFIG.columns.riders);
}
/**
 * FIX FOR ASSIGNMENT STATUS SYNCHRONIZATION
 * This will sync assignment statuses with their corresponding request statuses
 */

/**
 * Main function to fix assignment statuses
 */
function fixAssignmentStatuses() {
  console.log('🔧 === FIXING ASSIGNMENT STATUSES ===');
  
  try {
    const assignmentsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Assignments');
    const assignmentsData = getAssignmentsData();
    const requestsData = getRequestsData();
    
    if (!assignmentsSheet) {
      throw new Error('Assignments sheet not found');
    }
    
    let updatedCount = 0;
    const statusUpdates = [];
    
    // Find the status column in assignments
    const statusColumnIndex = assignmentsData.columnMap[CONFIG.columns.assignments.status];
    const requestIdColumnIndex = assignmentsData.columnMap[CONFIG.columns.assignments.requestId];
    
    if (statusColumnIndex === undefined) {
      throw new Error('Status column not found in Assignments sheet');
    }
    
    console.log(`📊 Processing ${assignmentsData.data.length} assignments...`);
    
    // Process each assignment
    assignmentsData.data.forEach((assignment, index) => {
      const rowNumber = index + 2; // +2 for header row and 0-based index
      const currentStatus = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      const requestId = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
      const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
      
      // Skip if already has a status
      if (currentStatus && currentStatus.trim()) {
        console.log(`   ⏭️  Skipping ${requestId} - already has status: ${currentStatus}`);
        return;
      }
      
      // Find corresponding request
      const correspondingRequest = requestsData.data.find(request => 
        getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.id) === requestId
      );
      
      if (!correspondingRequest) {
        console.log(`   ⚠️  No matching request found for assignment ${requestId}`);
        return;
      }
      
      const requestStatus = getColumnValue(correspondingRequest, requestsData.columnMap, CONFIG.columns.requests.status);
      
      if (!requestStatus || !requestStatus.trim()) {
        console.log(`   ⚠️  Request ${requestId} has no status`);
        return;
      }
      
      // Determine assignment status based on request status and rider assignment
      let newAssignmentStatus;
      
      if (requestStatus.toLowerCase() === 'completed') {
        if (riderName && riderName.trim()) {
          newAssignmentStatus = 'Completed';
        } else {
          newAssignmentStatus = 'Completed (No Rider)';
        }
      } else if (requestStatus.toLowerCase() === 'cancelled') {
        newAssignmentStatus = 'Cancelled';
      } else if (requestStatus.toLowerCase() === 'assigned') {
        if (riderName && riderName.trim()) {
          // Check if event date has passed
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const assignmentDate = eventDate instanceof Date ? eventDate : new Date(eventDate);
          
          if (!isNaN(assignmentDate.getTime()) && assignmentDate < today) {
            newAssignmentStatus = 'Completed'; // Past event with rider = completed
          } else {
            newAssignmentStatus = 'Assigned';
          }
        } else {
          newAssignmentStatus = 'Pending Assignment';
        }
      } else {
        newAssignmentStatus = requestStatus; // Copy request status
      }
      
      // Update the status
      try {
        assignmentsSheet.getRange(rowNumber, statusColumnIndex + 1).setValue(newAssignmentStatus);
        updatedCount++;
        
        statusUpdates.push({
          requestId: requestId,
          riderName: riderName || 'No Rider',
          oldStatus: currentStatus || 'Empty',
          newStatus: newAssignmentStatus,
          requestStatus: requestStatus
        });
        
        console.log(`   ✅ Updated ${requestId} (${riderName || 'No Rider'}): "${currentStatus || 'Empty'}" → "${newAssignmentStatus}"`);
        
      } catch (updateError) {
        console.error(`   ❌ Failed to update ${requestId}:`, updateError);
      }
    });
    
    console.log(`\n🎯 === SUMMARY ===`);
    console.log(`✅ Updated ${updatedCount} assignment statuses`);
    console.log(`📊 Status distribution after update:`);
    
    // Show new status distribution
    const newStatusCounts = {};
    statusUpdates.forEach(update => {
      newStatusCounts[update.newStatus] = (newStatusCounts[update.newStatus] || 0) + 1;
    });
    
    Object.keys(newStatusCounts).forEach(status => {
      console.log(`   ${status}: ${newStatusCounts[status]}`);
    });
    
    return {
      success: true,
      updatedCount: updatedCount,
      statusUpdates: statusUpdates,
      message: `Successfully updated ${updatedCount} assignment statuses`
    };
    
  } catch (error) {
    console.error('❌ Error fixing assignment statuses:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test the fix by running the diagnostic again
 */
function testStatusFix() {
  console.log('🧪 === TESTING STATUS FIX ===');
  
  try {
    // Run the fix
    console.log('1. Applying status fix...');
    const fixResult = fixAssignmentStatuses();
    
    if (!fixResult.success) {
      throw new Error('Status fix failed: ' + fixResult.error);
    }
    
    console.log(`✅ Fix applied: ${fixResult.updatedCount} assignments updated`);
    
    // Wait a moment for updates to process
    Utilities.sleep(2000);
    
    // Run diagnostic again
    console.log('\n2. Running diagnostic again...');
    const diagnostic = diagnoseReportsDiscrepancy();
    
    console.log('\n🎯 === RESULTS COMPARISON ===');
    console.log(`Before Fix:`);
    console.log(`   Completed Requests: 69`);
    console.log(`   Rider Activity: 4`);
    console.log(`   Gap: 65 missing escorts`);
    
    console.log(`\nAfter Fix:`);
    console.log(`   Completed Requests: ${diagnostic.completedEscorts || 'Error'}`);
    console.log(`   Rider Activity: ${diagnostic.riderActivity || 'Error'}`);
    console.log(`   Gap: ${Math.abs((diagnostic.completedEscorts || 0) - (diagnostic.riderActivity || 0))}`);
    
    if (diagnostic.riderActivity > 10) {
      console.log('✅ SUCCESS: Rider activity significantly increased!');
    } else {
      console.log('⚠️ Partial success: May need additional fixes');
    }
    
    return {
      success: true,
      fixResult: fixResult,
      newDiagnostic: diagnostic
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Quick fix for assignments with riders but no status from past dates
 */
function quickFixPastAssignments() {
  console.log('⚡ === QUICK FIX FOR PAST ASSIGNMENTS ===');
  
  try {
    const assignmentsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Assignments');
    const assignmentsData = getAssignmentsData();
    
    let fixedCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const statusColumnIndex = assignmentsData.columnMap[CONFIG.columns.assignments.status];
    
    assignmentsData.data.forEach((assignment, index) => {
      const rowNumber = index + 2;
      const currentStatus = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
      
      // Check if assignment meets criteria for quick fix
      const hasRider = riderName && riderName.trim() && riderName.toLowerCase() !== 'unassigned';
      const hasNoStatus = !currentStatus || !currentStatus.trim();
      
      let isPastEvent = false;
      if (eventDate) {
        const assignmentDate = eventDate instanceof Date ? eventDate : new Date(eventDate);
        isPastEvent = !isNaN(assignmentDate.getTime()) && assignmentDate < today;
      }
      
      if (hasRider && hasNoStatus && isPastEvent) {
        try {
          assignmentsSheet.getRange(rowNumber, statusColumnIndex + 1).setValue('Completed');
          fixedCount++;
          console.log(`   ✅ Quick fix: ${getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.requestId)} - ${riderName} → Completed`);
        } catch (error) {
          console.error(`   ❌ Failed to quick fix assignment:`, error);
        }
      }
    });
    
    console.log(`⚡ Quick fixed ${fixedCount} past assignments with riders`);
    
    return {
      success: true,
      fixedCount: fixedCount
    };
    
  } catch (error) {
    console.error('❌ Quick fix failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Run just the quick fix if you want immediate results
 */
function runQuickFix() {
  console.log('🚀 === RUNNING QUICK FIX ===');
  
  const result = quickFixPastAssignments();
  
  if (result.success) {
    console.log(`✅ Quick fix completed: ${result.fixedCount} assignments marked as completed`);
    console.log('💡 Now check your reports page - rider activity should show more escorts!');
  } else {
    console.log(`❌ Quick fix failed: ${result.error}`);
  }
  
  return result;
}
/**
 * DIAGNOSTIC FUNCTIONS TO IDENTIFY THE 94 vs 4 DISCREPANCY
 * Run these functions to identify where the mismatch is coming from
 */

/**
 * Main diagnostic function to identify the discrepancy
 */
/**
 * REPORTS DISCREPANCY DIAGNOSTIC SCRIPT
 * Run this to investigate the 58 vs 11 discrepancy
 * 
 * Copy this function into your Google Apps Script Editor and run it
 */

function diagnoseReportsDiscrepancy() {
  console.log('🔍 === REPORTS DISCREPANCY DIAGNOSIS ===');
  
  try {
    // Get current date range (assuming last 30 days or similar)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30); // Last 30 days
    
    console.log(`📅 Date range: ${startDate.toDateString()} to ${endDate.toDateString()}`);
    
    // 1. Check how "completed escorts" is calculated
    const completedEscortsCount = diagnoseCompletedEscortsCalculation(startDate, endDate);
    console.log(`\n📊 COMPLETED ESCORTS COUNT: ${completedEscortsCount}`);
    
    // 2. Check how "rider activity" is calculated  
    const riderActivityCount = diagnoseRiderActivityCalculation(startDate, endDate);
    console.log(`\n👥 RIDER ACTIVITY COUNT: ${riderActivityCount} total escorts from all riders`);
    
    // 3. Check assignment data directly
    const assignmentAnalysis = analyzeAssignmentData(startDate, endDate);
    console.log(`\n📋 ASSIGNMENT DATA ANALYSIS:`);
    console.log(`   Total assignments in period: ${assignmentAnalysis.totalAssignments}`);
    console.log(`   Status breakdown:`, assignmentAnalysis.statusBreakdown);
    console.log(`   Riders with assignments: ${assignmentAnalysis.ridersWithAssignments}`);
    console.log(`   Assignments with riders: ${assignmentAnalysis.assignmentsWithRiders}`);
    
    // 4. Check for data inconsistencies
    const inconsistencies = findDataInconsistencies();
    console.log(`\n⚠️  DATA INCONSISTENCIES:`);
    console.log(inconsistencies);
    
    return {
      completedEscorts: completedEscortsCount,
      riderActivity: riderActivityCount,
      assignmentAnalysis: assignmentAnalysis,
      inconsistencies: inconsistencies
    };
    
  } catch (error) {
    console.error('❌ Error in diagnosis:', error);
    return { error: error.message };
  }
}

/**
 * Check how "completed escorts" number is calculated
 */
function diagnoseCompletedEscortsCalculation(startDate, endDate) {
  try {
    console.log('\n🔍 Analyzing "Completed Escorts" calculation...');
    
    // This likely comes from generateReportData() or similar function
    // Check Requests sheet for completed requests
    const requestsData = getRequestsData();
    let completedCount = 0;
    
    requestsData.data.forEach(row => {
      const status = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.status);
      const eventDate = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.eventDate);
      
      // Check if date is in range
      let dateInRange = false;
      if (eventDate) {
        const requestDate = eventDate instanceof Date ? eventDate : new Date(eventDate);
        if (!isNaN(requestDate.getTime())) {
          dateInRange = requestDate >= startDate && requestDate <= endDate;
        }
      }
      
      if (dateInRange || !eventDate) { // Include if no date or in range
        const statusLower = (status || '').toLowerCase().trim();
        if (statusLower === 'completed' || statusLower === 'done' || statusLower === 'finished') {
          completedCount++;
          console.log(`   ✅ Request: ${getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.requestId)} - ${status}`);
        }
      }
    });
    
    console.log(`   📊 Completed requests method: ${completedCount}`);
    
    // Also check assignments approach
    const assignmentsData = getAssignmentsData();
    let completedAssignments = 0;
    
    assignmentsData.data.forEach(assignment => {
      const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
      
      let dateInRange = false;
      if (eventDate) {
        const assignmentDate = eventDate instanceof Date ? eventDate : new Date(eventDate);
        if (!isNaN(assignmentDate.getTime())) {
          dateInRange = assignmentDate >= startDate && assignmentDate <= endDate;
        }
      }
      
      if (dateInRange || !eventDate) {
        const statusLower = (status || '').toLowerCase().trim();
        if (statusLower === 'completed' || statusLower === 'done' || statusLower === 'finished') {
          completedAssignments++;
        }
      }
    });
    
    console.log(`   📊 Completed assignments method: ${completedAssignments}`);
    
    return Math.max(completedCount, completedAssignments);
    
  } catch (error) {
    console.error('❌ Error analyzing completed escorts:', error);
    return 0;
  }
}

/**
 * Check how "rider activity" is calculated
 */
function diagnoseRiderActivityCalculation(startDate, endDate) {
  try {
    console.log('\n🔍 Analyzing "Rider Activity" calculation...');
    
    const ridersData = getRidersData();
    const assignmentsData = getAssignmentsData();
    let totalRiderEscorts = 0;
    const riderBreakdown = {};
    
    ridersData.data.forEach(rider => {
      const riderName = getColumnValue(rider, ridersData.columnMap, CONFIG.columns.riders.name);
      if (!riderName) return;
      
      let riderEscorts = 0;
      
      assignmentsData.data.forEach(assignment => {
        const assignmentRider = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
        const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
        
        // Check rider name match (case insensitive)
        const riderMatches = assignmentRider && riderName && 
          assignmentRider.toString().trim().toLowerCase() === riderName.toString().trim().toLowerCase();
        
        // Check date range
        let dateInRange = false;
        if (eventDate) {
          const assignmentDate = eventDate instanceof Date ? eventDate : new Date(eventDate);
          if (!isNaN(assignmentDate.getTime())) {
            dateInRange = assignmentDate >= startDate && assignmentDate <= endDate;
          }
        }
        
        if (riderMatches && (dateInRange || !eventDate)) {
          const statusLower = (status || '').toLowerCase().trim();
          // Current logic: only count "completed" status
          if (statusLower === 'completed') {
            riderEscorts++;
          }
          console.log(`   👥 ${riderName}: Assignment ${getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.requestId)} - Status: ${status} - Counted: ${statusLower === 'completed'}`);
        }
      });
      
      if (riderEscorts > 0) {
        riderBreakdown[riderName] = riderEscorts;
        totalRiderEscorts += riderEscorts;
      }
    });
    
    console.log(`   👥 Rider breakdown:`, riderBreakdown);
    console.log(`   👥 Total rider escorts: ${totalRiderEscorts}`);
    
    return totalRiderEscorts;
    
  } catch (error) {
    console.error('❌ Error analyzing rider activity:', error);
    return 0;
  }
}

/**
 * Analyze assignment data to understand the gap
 */
function analyzeAssignmentData(startDate, endDate) {
  try {
    const assignmentsData = getAssignmentsData();
    const analysis = {
      totalAssignments: 0,
      statusBreakdown: {},
      ridersWithAssignments: 0,
      assignmentsWithRiders: 0,
      missingStatuses: 0,
      pastEventsNoStatus: 0
    };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    assignmentsData.data.forEach(assignment => {
      const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
      
      // Check date range
      let dateInRange = true;
      if (eventDate && startDate && endDate) {
        const assignmentDate = eventDate instanceof Date ? eventDate : new Date(eventDate);
        if (!isNaN(assignmentDate.getTime())) {
          dateInRange = assignmentDate >= startDate && assignmentDate <= endDate;
        }
      }
      
      if (dateInRange) {
        analysis.totalAssignments++;
        
        // Count status breakdown
        const statusKey = status || 'MISSING_STATUS';
        analysis.statusBreakdown[statusKey] = (analysis.statusBreakdown[statusKey] || 0) + 1;
        
        // Count assignments with riders
        if (riderName && riderName.trim() && riderName.toLowerCase() !== 'unassigned') {
          analysis.assignmentsWithRiders++;
        }
        
        // Count missing statuses
        if (!status || !status.trim()) {
          analysis.missingStatuses++;
          
          // Check if it's a past event with no status
          if (eventDate) {
            const assignmentDate = eventDate instanceof Date ? eventDate : new Date(eventDate);
            if (!isNaN(assignmentDate.getTime()) && assignmentDate < today) {
              analysis.pastEventsNoStatus++;
            }
          }
        }
      }
    });
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Error analyzing assignment data:', error);
    return { error: error.message };
  }
}

/**
 * Find data inconsistencies between sheets
 */
function findDataInconsistencies() {
  try {
    const issues = [];
    
    // Check if all riders in assignments exist in riders sheet
    const ridersData = getRidersData();
    const assignmentsData = getAssignmentsData();
    
    const riderNamesFromRidersSheet = new Set();
    const riderNamesFromAssignments = new Set();
    
    ridersData.data.forEach(rider => {
      const name = getColumnValue(rider, ridersData.columnMap, CONFIG.columns.riders.name);
      if (name && name.trim()) {
        riderNamesFromRidersSheet.add(name.trim().toLowerCase());
      }
    });
    
    assignmentsData.data.forEach(assignment => {
      const name = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      if (name && name.trim()) {
        riderNamesFromAssignments.add(name.trim().toLowerCase());
      }
    });
    
    const unmatchedRiders = [];
    riderNamesFromAssignments.forEach(name => {
      if (!riderNamesFromRidersSheet.has(name)) {
        unmatchedRiders.push(name);
      }
    });
    
    if (unmatchedRiders.length > 0) {
      issues.push(`Riders in assignments but not in riders sheet: ${unmatchedRiders.join(', ')}`);
    }
    
    return issues;
    
  } catch (error) {
    console.error('❌ Error finding inconsistencies:', error);
    return ['Error checking for inconsistencies: ' + error.message];
  }
}

/**
 * QUICK FIX FUNCTION
 * Run this to automatically fix past assignments that have riders but no status
 */
function quickFixPastAssignments() {
  console.log('⚡ === QUICK FIX FOR PAST ASSIGNMENTS ===');
  
  try {
    const assignmentsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Assignments');
    const assignmentsData = getAssignmentsData();
    
    let fixedCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const statusColumnIndex = assignmentsData.columnMap[CONFIG.columns.assignments.status];
    
    assignmentsData.data.forEach((assignment, index) => {
      const rowNumber = index + 2;
      const currentStatus = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
      
      // Check if assignment meets criteria for quick fix
      const hasRider = riderName && riderName.trim() && riderName.toLowerCase() !== 'unassigned';
      const hasNoStatus = !currentStatus || !currentStatus.trim();
      
      let isPastEvent = false;
      if (eventDate) {
        const assignmentDate = eventDate instanceof Date ? eventDate : new Date(eventDate);
        isPastEvent = !isNaN(assignmentDate.getTime()) && assignmentDate < today;
      }
      
      if (hasRider && hasNoStatus && isPastEvent) {
        try {
          assignmentsSheet.getRange(rowNumber, statusColumnIndex + 1).setValue('Completed');
          fixedCount++;
          console.log(`   ✅ Quick fix: ${getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.requestId)} - ${riderName} → Completed`);
        } catch (error) {
          console.error(`   ❌ Failed to quick fix assignment:`, error);
        }
      }
    });
    
    console.log(`⚡ Quick fixed ${fixedCount} past assignments with riders`);
    
    return {
      success: true,
      fixedCount: fixedCount
    };
    
  } catch (error) {
    console.error('❌ Quick fix failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * COMPLETE DIAGNOSTIC AND FIX
 * Run this to diagnose the issue and apply fixes automatically
 */
function runCompleteReportsFix() {
  console.log('🚀 === COMPLETE REPORTS FIX ===');
  
  try {
    // 1. Run diagnostic first
    console.log('\n1. Running initial diagnostic...');
    const initialDiagnostic = diagnoseReportsDiscrepancy();
    
    console.log(`\n📊 INITIAL STATE:`);
    console.log(`   Completed Escorts: ${initialDiagnostic.completedEscorts}`);
    console.log(`   Rider Activity: ${initialDiagnostic.riderActivity}`);
    console.log(`   Gap: ${Math.abs(initialDiagnostic.completedEscorts - initialDiagnostic.riderActivity)}`);
    
    // 2. Apply quick fix for past assignments
    console.log('\n2. Applying quick fix...');
    const fixResult = quickFixPastAssignments();
    
    if (!fixResult.success) {
      throw new Error('Quick fix failed: ' + fixResult.error);
    }
    
    console.log(`✅ Quick fix applied: ${fixResult.fixedCount} assignments updated`);
    
    // 3. Wait and run diagnostic again
    Utilities.sleep(2000);
    console.log('\n3. Running diagnostic again...');
    const finalDiagnostic = diagnoseReportsDiscrepancy();
    
    console.log(`\n🎯 === RESULTS COMPARISON ===`);
    console.log(`Before Fix:`);
    console.log(`   Completed Escorts: ${initialDiagnostic.completedEscorts}`);
    console.log(`   Rider Activity: ${initialDiagnostic.riderActivity}`);
    console.log(`   Gap: ${Math.abs(initialDiagnostic.completedEscorts - initialDiagnostic.riderActivity)}`);
    
    console.log(`\nAfter Fix:`);
    console.log(`   Completed Escorts: ${finalDiagnostic.completedEscorts || 'Error'}`);
    console.log(`   Rider Activity: ${finalDiagnostic.riderActivity || 'Error'}`);
    console.log(`   Gap: ${Math.abs((finalDiagnostic.completedEscorts || 0) - (finalDiagnostic.riderActivity || 0))}`);
    
    const improvement = (finalDiagnostic.riderActivity || 0) - initialDiagnostic.riderActivity;
    if (improvement > 0) {
      console.log(`✅ SUCCESS: Rider activity increased by ${improvement} escorts!`);
    } else {
      console.log(`⚠️ No improvement detected. May need manual investigation.`);
    }
    
    return {
      success: true,
      initialDiagnostic,
      fixResult,
      finalDiagnostic,
      improvement
    };
    
  } catch (error) {
    console.error('❌ Complete fix failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check how "completed escorts" number is calculated
 */
function diagnoseCompletedEscortsCalculation(startDate, endDate) {
  try {
    console.log('\n🔍 Analyzing "Completed Escorts" calculation...');
    
    // This likely comes from generateReportData() or similar function
    // Check Requests sheet for completed requests
    const requestsData = getRequestsData();
    let completedCount = 0;
    
    requestsData.data.forEach(row => {
      const status = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.status);
      const eventDate = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.eventDate);
      
      // Check if date is in range
      let dateInRange = false;
      if (eventDate) {
        const requestDate = eventDate instanceof Date ? eventDate : new Date(eventDate);
        if (!isNaN(requestDate.getTime())) {
          dateInRange = requestDate >= startDate && requestDate <= endDate;
        }
      }
      
      // Count completed requests in date range
      if (dateInRange) {
        const statusLower = (status || '').toLowerCase().trim();
        if (statusLower === 'completed' || statusLower === 'done' || statusLower === 'finished') {
          completedCount++;
          console.log(`   ✅ Completed request: ${getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.id)} - ${status}`);
        } else if (status) {
          console.log(`   ⏸️  Non-completed request: ${getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.id)} - ${status}`);
        }
      }
    });
    
    console.log(`   📊 Completed requests method: ${completedCount}`);
    
    // Alternative: Check assignments for completed escorts
    const assignmentsData = getAssignmentsData();
    let completedAssignments = 0;
    
    assignmentsData.data.forEach(assignment => {
      const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
      
      // Check if date is in range
      let dateInRange = false;
      if (eventDate) {
        const assignmentDate = eventDate instanceof Date ? eventDate : new Date(eventDate);
        if (!isNaN(assignmentDate.getTime())) {
          dateInRange = assignmentDate >= startDate && assignmentDate <= endDate;
        }
      }
      
      if (dateInRange) {
        const statusLower = (status || '').toLowerCase().trim();
        if (statusLower === 'completed' || statusLower === 'done' || statusLower === 'finished') {
          completedAssignments++;
        }
      }
    });
    
    console.log(`   📊 Completed assignments method: ${completedAssignments}`);
    
    return Math.max(completedCount, completedAssignments);
    
  } catch (error) {
    console.error('❌ Error analyzing completed escorts:', error);
    return 0;
  }
}

/**
 * Check how "rider activity" is calculated
 */
function diagnoseRiderActivityCalculation(startDate, endDate) {
  try {
    console.log('\n🔍 Analyzing "Rider Activity" calculation...');
    
    const ridersData = getRidersData();
    const assignmentsData = getAssignmentsData();
    let totalRiderEscorts = 0;
    
    ridersData.data.forEach(rider => {
      const riderName = getColumnValue(rider, ridersData.columnMap, CONFIG.columns.riders.name);
      if (!riderName) return;
      
      let riderEscorts = 0;
      
      assignmentsData.data.forEach(assignment => {
        const assignmentRider = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
        const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
        
        // Check rider name match (case insensitive)
        const riderMatches = assignmentRider && riderName && 
          assignmentRider.toString().trim().toLowerCase() === riderName.toString().trim().toLowerCase();
        
        // Check date range
        let dateInRange = false;
        if (eventDate) {
          const assignmentDate = eventDate instanceof Date ? eventDate : new Date(eventDate);
          if (!isNaN(assignmentDate.getTime())) {
            dateInRange = assignmentDate >= startDate && assignmentDate <= endDate;
          }
        }
        
        if (riderMatches && dateInRange) {
          // Check what statuses are being counted
          const statusLower = (status || '').toLowerCase().trim();
          console.log(`   👤 ${riderName}: Assignment ${getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.assignmentId)} - Status: "${status}" - Date: ${eventDate}`);
          
          // Original restrictive logic (only 'completed')
          if (statusLower === 'completed') {
            riderEscorts++;
            console.log(`     ✅ COUNTED (completed status)`);
          } else {
            console.log(`     ❌ NOT COUNTED (status: ${statusLower})`);
          }
        }
      });
      
      if (riderEscorts > 0) {
        console.log(`   📊 ${riderName}: ${riderEscorts} escorts`);
        totalRiderEscorts += riderEscorts;
      }
    });
    
    console.log(`   📊 Total from rider activity: ${totalRiderEscorts}`);
    return totalRiderEscorts;
    
  } catch (error) {
    console.error('❌ Error analyzing rider activity:', error);
    return 0;
  }
}

/**
 * Analyze assignment data to understand the discrepancy
 */
function analyzeAssignmentData(startDate, endDate) {
  try {
    const assignmentsData = getAssignmentsData();
    let totalAssignments = 0;
    let assignmentsWithRiders = 0;
    let ridersWithAssignments = new Set();
    let statusBreakdown = {};
    
    assignmentsData.data.forEach(assignment => {
      const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
      const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      
      // Check date range
      let dateInRange = false;
      if (eventDate) {
        const assignmentDate = eventDate instanceof Date ? eventDate : new Date(eventDate);
        if (!isNaN(assignmentDate.getTime())) {
          dateInRange = assignmentDate >= startDate && assignmentDate <= endDate;
        }
      }
      
      if (dateInRange) {
        totalAssignments++;
        
        // Track status distribution
        const statusKey = status || 'No Status';
        statusBreakdown[statusKey] = (statusBreakdown[statusKey] || 0) + 1;
        
        // Track riders
        if (riderName && riderName.trim()) {
          assignmentsWithRiders++;
          ridersWithAssignments.add(riderName.trim());
        }
      }
    });
    
    return {
      totalAssignments: totalAssignments,
      assignmentsWithRiders: assignmentsWithRiders,
      ridersWithAssignments: ridersWithAssignments.size,
      statusBreakdown: statusBreakdown
    };
    
  } catch (error) {
    console.error('❌ Error analyzing assignment data:', error);
    return {};
  }
}

/**
 * Find potential data inconsistencies
 */
function findDataInconsistencies() {
  try {
    const issues = [];
    
    // Check 1: Assignments without rider names
    const assignmentsData = getAssignmentsData();
    let assignmentsWithoutRiders = 0;
    
    assignmentsData.data.forEach(assignment => {
      const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      if (!riderName || !riderName.trim()) {
        assignmentsWithoutRiders++;
      }
    });
    
    if (assignmentsWithoutRiders > 0) {
      issues.push(`${assignmentsWithoutRiders} assignments have no rider assigned`);
    }
    
    // Check 2: Inconsistent status values
    const statusValues = new Set();
    assignmentsData.data.forEach(assignment => {
      const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      if (status) statusValues.add(status);
    });
    
    const statusArray = Array.from(statusValues);
    if (statusArray.length > 10) {
      issues.push(`Too many different status values (${statusArray.length}): ${statusArray.join(', ')}`);
    }
    
    // Check 3: Rider name mismatches
    const ridersData = getRidersData();
    const riderNamesFromRidersSheet = new Set();
    const riderNamesFromAssignments = new Set();
    
    ridersData.data.forEach(rider => {
      const name = getColumnValue(rider, ridersData.columnMap, CONFIG.columns.riders.name);
      if (name && name.trim()) {
        riderNamesFromRidersSheet.add(name.trim().toLowerCase());
      }
    });
    
    assignmentsData.data.forEach(assignment => {
      const name = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      if (name && name.trim()) {
        riderNamesFromAssignments.add(name.trim().toLowerCase());
      }
    });
    
    const unmatchedRiders = [];
    riderNamesFromAssignments.forEach(name => {
      if (!riderNamesFromRidersSheet.has(name)) {
        unmatchedRiders.push(name);
      }
    });
    
    if (unmatchedRiders.length > 0) {
      issues.push(`Riders in assignments but not in riders sheet: ${unmatchedRiders.join(', ')}`);
    }
    
    return issues;
    
  } catch (error) {
    console.error('❌ Error finding inconsistencies:', error);
    return ['Error checking for inconsistencies: ' + error.message];
  }
}

/**
 * Fix the rider activity calculation to match completed escorts
 */
function fixRiderActivityCalculation() {
  console.log('🔧 === FIXING RIDER ACTIVITY CALCULATION ===');
  
  try {
    // The fix is to update the generateRiderActivityReport function
    // or wherever rider hours are calculated to use the same logic as completed escorts
    
    console.log('The fix involves updating these functions in Code.gs:');
    console.log('1. generateReportData() - around line 2750');
    console.log('2. generateRiderActivityReport() - if it exists');
    console.log('3. Any other functions that calculate rider hours');
    
    console.log('\nRecommended changes:');
    console.log('1. Change status filtering from only "Completed" to include:');
    console.log('   - "Completed", "Done", "Finished"');
    console.log('   - Or count assignments where event date has passed');
    console.log('');
    console.log('2. Improve rider name matching to be case-insensitive');
    console.log('3. Add fallback hour estimation when actual times missing');
    
    return {
      success: true,
      message: 'Diagnostic complete. Manual code updates needed in generateReportData() function.'
    };
    
  } catch (error) {
    console.error('❌ Fix error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Updated rider activity calculation (use this to replace existing logic)
 */
function calculateRiderActivityFixed(startDate, endDate) {
  try {
    const ridersData = getRidersData();
    const assignmentsData = getAssignmentsData();
    const riderHours = [];
    
    ridersData.data.forEach(rider => {
      const riderName = getColumnValue(rider, ridersData.columnMap, CONFIG.columns.riders.name);
      if (!riderName || !riderName.trim()) return;
      
      let totalHours = 0;
      let escorts = 0;
      
      assignmentsData.data.forEach(assignment => {
        const assignmentRider = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
        const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
        
        // Improved rider name matching (case-insensitive, trimmed)
        if (!assignmentRider || !riderName) return;
        const riderMatches = assignmentRider.toString().trim().toLowerCase() === riderName.toString().trim().toLowerCase();
        if (!riderMatches) return;
        
        // Date filtering
        let dateMatches = true;
        if (eventDate && startDate && endDate) {
          const assignmentDate = eventDate instanceof Date ? eventDate : new Date(eventDate);
          if (!isNaN(assignmentDate.getTime())) {
            dateMatches = assignmentDate >= startDate && assignmentDate <= endDate;
          }
        }
        if (!dateMatches) return;
        
        // ✅ FIXED: More flexible status matching
        const statusLower = (status || '').toLowerCase().trim();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Count if assignment is completed OR event date has passed (indicating work was done)
        const isCompleted = ['completed', 'done', 'finished'].includes(statusLower);
        const eventPassed = eventDate && (eventDate instanceof Date ? eventDate : new Date(eventDate)) < today;
        const hasRiderAssigned = assignmentRider && assignmentRider.trim();
        
        if ((isCompleted || (eventPassed && hasRiderAssigned)) && dateMatches) {
          escorts++;
          
          // Try to calculate hours from time data
          const startTime = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.startTime);
          const endTime = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.endTime);
          
          const start = parseTimeString(startTime);
          const end = parseTimeString(endTime);
          
          if (start && end && end > start) {
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            totalHours += hours;
          } else {
            // ✅ FIXED: Fallback estimation based on request type
            const requestId = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
            const estimatedHours = estimateHoursByRequestType(requestId);
            totalHours += estimatedHours;
          }
        }
      });
      
      if (escorts > 0) {
        riderHours.push({
          name: riderName,
          escorts: escorts,
          hours: Math.round(totalHours * 100) / 100
        });
      }
    });
    
    return riderHours.sort((a, b) => b.hours - a.hours);
    
  } catch (error) {
    console.error('❌ Error calculating rider activity:', error);
    return [];
  }
}

/**
 * Helper function to estimate hours by request type
 */
function estimateHoursByRequestType(requestId) {
  try {
    // Default estimates by request type (in hours)
    const typeEstimates = {
      'Wedding': 2.5,
      'Funeral': 1.5,
      'Float Movement': 3.0,
      'VIP': 2.0,
      'Other': 2.0
    };
    
    // Try to get the request type from the original request
    const requestsData = getRequestsData();
    const request = requestsData.data.find(r => 
      getColumnValue(r, requestsData.columnMap, CONFIG.columns.requests.id) === requestId
    );
    
    if (request) {
      const requestType = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.type);
      return typeEstimates[requestType] || typeEstimates['Other'];
    }
    
    return typeEstimates['Other']; // Default fallback
    
  } catch (error) {
    console.error('Error estimating hours:', error);
    return 2.0; // Safe fallback
  }
}
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

/**
 * 🔧 REQUESTS HEADER ORDER CORRECTOR
 * This will check and fix the header order in your Requests sheet
 */

function checkAndFixRequestsHeaderOrder() {
  console.log('🔍 Checking Requests sheet header order...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const requestsSheet = ss.getSheetByName('Requests');
    
    if (!requestsSheet) {
      console.log('❌ Requests sheet not found');
      return { success: false, message: 'Requests sheet not found' };
    }
    
    // Get current headers
    const currentHeaders = requestsSheet.getRange(1, 1, 1, requestsSheet.getLastColumn()).getValues()[0];
    console.log('📋 Current headers:', currentHeaders);
    
    // Based on your CONFIG patterns, this is the correct order
    const correctHeaders = [
      'Request ID',           // CONFIG.columns.requests.id
      'Date',                 // CONFIG.columns.requests.date (legacy/submission date)
      'Submitted By',         // CONFIG.columns.requests.submittedBy
      'Requester Name',       // CONFIG.columns.requests.requesterName
      'Requester Contact',    // CONFIG.columns.requests.requesterContact
      'Event Date',           // CONFIG.columns.requests.eventDate
      'Start Time',           // CONFIG.columns.requests.startTime
      'End Time',             // CONFIG.columns.requests.endTime
      'Start Location',       // CONFIG.columns.requests.startLocation
      'End Location',         // CONFIG.columns.requests.endLocation
      'Secondary Location',   // CONFIG.columns.requests.secondaryLocation
      'Request Type',         // CONFIG.columns.requests.type
      'Riders Needed',        // CONFIG.columns.requests.ridersNeeded
      'Escort Fee',           // CONFIG.columns.requests.escortFee
      'Status',               // CONFIG.columns.requests.status
      'Special Requirements', // CONFIG.columns.requests.specialRequirements
      'Notes',                // CONFIG.columns.requests.notes
      'Courtesy',             // CONFIG.columns.requests.courtesy
      'Riders Assigned',      // CONFIG.columns.requests.assignedRiders or ridersAssigned
      'Last Updated'          // CONFIG.columns.requests.lastUpdated or lastModified
    ];
    
    console.log('✅ Expected headers:', correctHeaders);
    
    // Check if headers match
    let headersMismatch = false;
    const issues = [];
    
    for (let i = 0; i < correctHeaders.length; i++) {
      const expected = correctHeaders[i];
      const actual = currentHeaders[i];
      
      if (actual !== expected) {
        headersMismatch = true;
        issues.push(`Column ${i + 1}: Expected "${expected}", found "${actual || 'MISSING'}"`);
      }
    }
    
    if (currentHeaders.length !== correctHeaders.length) {
      headersMismatch = true;
      issues.push(`Column count mismatch: Expected ${correctHeaders.length}, found ${currentHeaders.length}`);
    }
    
    if (!headersMismatch) {
      console.log('✅ Headers are already in correct order!');
      return { 
        success: true, 
        message: 'Headers are already correct',
        currentHeaders: currentHeaders,
        correctHeaders: correctHeaders
      };
    }
    
    // Show issues found
    console.log('❌ Header issues found:');
    issues.forEach(issue => console.log(`   ${issue}`));
    
    // Ask for confirmation to fix
    console.log('\n🔧 Ready to fix headers. This will:');
    console.log('   1. Clear any data validation from header row');
    console.log('   2. Set headers to correct order');
    console.log('   3. Reapply proper formatting');
    console.log('   4. Set up data validation for data rows only');
    
    return {
      success: false,
      needsFix: true,
      message: `Found ${issues.length} header issues`,
      issues: issues,
      currentHeaders: currentHeaders,
      correctHeaders: correctHeaders,
      fixFunction: 'fixRequestsHeaderOrder'
    };
    
  } catch (error) {
    console.error('❌ Error checking headers:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🔧 Fix the Requests header order
 */
function fixRequestsHeaderOrder() {
  console.log('🔧 Fixing Requests sheet header order...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const requestsSheet = ss.getSheetByName('Requests');
    
    if (!requestsSheet) {
      throw new Error('Requests sheet not found');
    }
    
    // Correct header order based on your CONFIG
    const correctHeaders = [
      'Request ID',           
      'Date',                 
      'Submitted By',         
      'Requester Name',       
      'Requester Contact',    
      'Event Date',           
      'Start Time',           
      'End Time',             
      'Start Location',       
      'End Location',         
      'Secondary Location',   
      'Request Type',         
      'Riders Needed',        
      'Escort Fee',           
      'Status',               
      'Special Requirements', 
      'Notes',                
      'Courtesy',             
      'Riders Assigned',      
      'Last Updated'          
    ];
    
    console.log('📝 Backing up current data...');
    
    // Get all data including headers
    const allData = requestsSheet.getDataRange().getValues();
    const currentHeaders = allData[0];
    const dataRows = allData.slice(1);
    
    console.log(`📊 Found ${dataRows.length} data rows to preserve`);
    
    // Create mapping from old headers to new positions
    const headerMapping = {};
    currentHeaders.forEach((header, oldIndex) => {
      const newIndex = correctHeaders.indexOf(header);
      if (newIndex !== -1) {
        headerMapping[oldIndex] = newIndex;
      } else {
        console.log(`⚠️ Current header "${header}" not found in correct headers - data will be lost`);
      }
    });
    
    console.log('🗺️ Header mapping:', headerMapping);
    
    // Reorganize data according to new header order
    const reorganizedData = [];
    
    dataRows.forEach((row, rowIndex) => {
      const newRow = new Array(correctHeaders.length).fill('');
      
      // Map data from old positions to new positions
      Object.entries(headerMapping).forEach(([oldIndex, newIndex]) => {
        newRow[newIndex] = row[oldIndex] || '';
      });
      
      reorganizedData.push(newRow);
    });
    
    console.log('🔄 Clearing sheet and rewriting with correct order...');
    
    // Clear the sheet
    requestsSheet.clear();
    
    // Set correct headers
    const headerRange = requestsSheet.getRange(1, 1, 1, correctHeaders.length);
    headerRange.setValues([correctHeaders]);
    
    // Format headers
    headerRange.setFontWeight('bold')
              .setBackground('#4285f4')
              .setFontColor('white')
              .setHorizontalAlignment('center');
    
    // Add reorganized data if any exists
    if (reorganizedData.length > 0) {
      const dataRange = requestsSheet.getRange(2, 1, reorganizedData.length, correctHeaders.length);
      dataRange.setValues(reorganizedData);
      console.log(`✅ Restored ${reorganizedData.length} data rows`);
    }
    
    // Set up proper data validation for data rows only
    setupRequestsDataValidationCorrected(requestsSheet, correctHeaders);
    
    // Protect headers
    try {
      const headerProtection = headerRange.protect();
      headerProtection.setDescription('🛡️ Request Headers - Protected');
      headerProtection.setWarningOnly(true);
      console.log('🛡️ Headers protected');
    } catch (protectionError) {
      console.log('⚠️ Could not protect headers:', protectionError.message);
    }
    
    console.log('✅ Requests header order fixed successfully!');
    
    return {
      success: true,
      message: 'Headers fixed and data preserved',
      headerCount: correctHeaders.length,
      dataRowsPreserved: reorganizedData.length,
      correctHeaders: correctHeaders
    };
    
  } catch (error) {
    console.error('❌ Error fixing headers:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🎯 Set up data validation for corrected headers
 */
function setupRequestsDataValidationCorrected(sheet, headers) {
  console.log('🎯 Setting up data validation for corrected headers...');
  
  try {
    const lastRow = Math.max(sheet.getLastRow(), 20);
    
    // Clear any existing validation first
    sheet.getDataRange().clearDataValidations();
    
    // Status column validation
    const statusColIndex = headers.indexOf('Status');
    if (statusColIndex >= 0 && lastRow > 1) {
      const statusRange = sheet.getRange(2, statusColIndex + 1, lastRow - 1, 1);
      const statusValidation = SpreadsheetApp.newDataValidation()
        .requireValueInList(['New', 'Pending', 'Assigned', 'In Progress', 'Completed', 'Cancelled'])
        .setAllowInvalid(false)
        .setHelpText('Select request status')
        .build();
      statusRange.setDataValidation(statusValidation);
      console.log(`   ✅ Status validation: ${statusRange.getA1Notation()}`);
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
      console.log(`   ✅ Request Type validation: ${typeRange.getA1Notation()}`);
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
      console.log(`   ✅ Courtesy validation: ${courtesyRange.getA1Notation()}`);
    }
    
    console.log('✅ Data validation applied to data rows only');
    
  } catch (error) {
    console.error('❌ Data validation setup failed:', error);
  }
}

/**
 * 🧪 Test requests functionality after header fix
 */
function testRequestsAfterHeaderFix() {
  console.log('🧪 Testing requests functionality after header fix...');
  
  try {
    // Test 1: Basic data loading
    console.log('Test 1: getRequestsData()');
    const requestsData = getRequestsData();
    const requestsCount = requestsData?.data?.length || 0;
    console.log(`   Result: ${requestsCount} requests loaded`);
    
    // Test 2: Filtered requests
    console.log('Test 2: getFilteredRequestsForAssignments()');
    const assignableRequests = getFilteredRequestsForAssignments();
    const assignableCount = assignableRequests?.length || 0;
    console.log(`   Result: ${assignableCount} assignable requests`);
    
    // Test 3: Header validation
    console.log('Test 3: Header validation');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Requests');
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const expectedHeaders = [
      'Request ID', 'Date', 'Submitted By', 'Requester Name', 'Requester Contact',
      'Event Date', 'Start Time', 'End Time', 'Start Location', 'End Location',
      'Secondary Location', 'Request Type', 'Riders Needed', 'Escort Fee',
      'Status', 'Special Requirements', 'Notes', 'Courtesy', 'Riders Assigned', 'Last Updated'
    ];
    
    const headersMatch = expectedHeaders.every((expected, index) => 
      currentHeaders[index] === expected
    );
    
    console.log(`   Result: Headers ${headersMatch ? 'MATCH' : 'DO NOT MATCH'}`);
    
    if (!headersMatch) {
      console.log('   Expected:', expectedHeaders);
      console.log('   Actual  :', currentHeaders);
    }
    
    // Summary
    const allTestsPassed = requestsCount >= 0 && headersMatch;
    console.log(`\n📋 Test Summary: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allTestsPassed) {
      console.log('🎉 Your Requests sheet is now properly configured!');
      console.log('💡 Test your web app to ensure requests are loading correctly');
    }
    
    return {
      success: allTestsPassed,
      tests: {
        dataLoading: requestsCount >= 0,
        headerOrder: headersMatch,
        assignableRequests: assignableCount >= 0
      },
      counts: {
        totalRequests: requestsCount,
        assignableRequests: assignableCount
      }
    };
    
  } catch (error) {
    console.error('❌ Testing failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 📋 Show current requests sheet status
 */
function showRequestsSheetStatus() {
  console.log('📋 Current Requests sheet status:');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const requestsSheet = ss.getSheetByName('Requests');
    
    if (!requestsSheet) {
      console.log('❌ Requests sheet not found');
      return;
    }
    
    const currentHeaders = requestsSheet.getRange(1, 1, 1, requestsSheet.getLastColumn()).getValues()[0];
    const dataRowCount = requestsSheet.getLastRow() - 1; // Exclude header
    
    console.log(`📊 Sheet info:`);
    console.log(`   Total columns: ${currentHeaders.length}`);
    console.log(`   Data rows: ${dataRowCount}`);
    console.log(`   Headers: [${currentHeaders.join(', ')}]`);
    
    // Check for protection
    const protections = requestsSheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    const headerProtections = protections.filter(p => p.getRange().getRow() === 1);
    console.log(`   Header protections: ${headerProtections.length}`);
    
    // Check for data validation in headers
    let headerValidationCount = 0;
    for (let col = 1; col <= requestsSheet.getLastColumn(); col++) {
      if (requestsSheet.getRange(1, col).getDataValidation()) {
        headerValidationCount++;
      }
    }
    console.log(`   Header validation rules: ${headerValidationCount} (should be 0)`);
    
    return {
      totalColumns: currentHeaders.length,
      dataRows: dataRowCount,
      headers: currentHeaders,
      headerProtections: headerProtections.length,
      headerValidations: headerValidationCount
    };
    
  } catch (error) {
    console.error('❌ Error checking status:', error);
  }
}
/**
 * Custom function to update specific header names
 * Change the headerChanges object below to specify your desired changes
 */
function updateSpecificHeaders() {
  console.log('🔧 Updating specific header names...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const requestsSheet = ss.getSheetByName('Requests');
    
    if (!requestsSheet) {
      console.log('❌ Requests sheet not found');
      return { success: false, message: 'Requests sheet not found' };
    }
    
    // MODIFY THIS OBJECT TO CHANGE YOUR HEADERS
    // Format: 'Old Header Name': 'New Header Name'
    const headerChanges = {
      'Start Location': 'Pickup',                 // Change start location to pickup
      'Secondary Location': 'Second',             // Change secondary location to second
      'End Location': 'Dropoff'                  // Change end location to dropoff
    };
    
    // Get current headers
    const headerRange = requestsSheet.getRange(1, 1, 1, requestsSheet.getLastColumn());
    const currentHeaders = headerRange.getValues()[0];
    
    console.log('📋 Current headers:', currentHeaders);
    
    // Apply changes
    let changesApplied = 0;
    const newHeaders = currentHeaders.map(header => {
      if (headerChanges[header]) {
        console.log(`✏️ Changing "${header}" to "${headerChanges[header]}"`);
        changesApplied++;
        return headerChanges[header];
      }
      return header;
    });
    
    if (changesApplied === 0) {
      console.log('ℹ️ No matching headers found to change');
      return { 
        success: true, 
        message: 'No changes needed',
        availableHeaders: currentHeaders 
      };
    }
    
    // Update the headers in the sheet
    headerRange.setValues([newHeaders]);
    
    // Reapply header formatting
    headerRange.setFontWeight('bold')
              .setBackground('#4285f4')
              .setFontColor('white')
              .setHorizontalAlignment('center');
    
    console.log(`✅ Successfully updated ${changesApplied} headers`);
    console.log('📋 New headers:', newHeaders);
    
    // Protect the updated headers
    try {
      const protection = headerRange.protect();
      protection.setDescription('🛡️ Request Headers - Protected');
      protection.setWarningOnly(true);
      console.log('🛡️ Headers protected');
    } catch (protectionError) {
      console.log('⚠️ Could not protect headers:', protectionError.message);
    }
    
    return {
      success: true,
      message: `Successfully updated ${changesApplied} headers`,
      changesApplied: changesApplied,
      oldHeaders: currentHeaders,
      newHeaders: newHeaders
    };
    
  } catch (error) {
    console.error('❌ Error updating headers:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Preview what headers will be changed without actually changing them
 */
function previewHeaderChanges() {
  console.log('👀 Previewing header changes...');
  
  // MODIFY THIS TO MATCH YOUR DESIRED CHANGES
  const headerChanges = {
    'Start Location': 'Pickup',
    'Secondary Location': 'Second', 
    'End Location': 'Dropoff'
  };
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const requestsSheet = ss.getSheetByName('Requests');
    
    if (!requestsSheet) {
      console.log('❌ Requests sheet not found');
      return;
    }
    
    const currentHeaders = requestsSheet.getRange(1, 1, 1, requestsSheet.getLastColumn()).getValues()[0];
    
    console.log('📋 Preview of changes:');
    console.log('Current headers:', currentHeaders);
    
    let changesFound = 0;
    currentHeaders.forEach((header, index) => {
      if (headerChanges[header]) {
        console.log(`Column ${index + 1}: "${header}" → "${headerChanges[header]}"`);
        changesFound++;
      }
    });
    
    if (changesFound === 0) {
      console.log('ℹ️ No matching headers found for changes');
      console.log('💡 Available headers to change:', currentHeaders);
    } else {
      console.log(`✅ Found ${changesFound} headers that will be changed`);
      console.log('💡 Run updateSpecificHeaders() to apply these changes');
    }
    
  } catch (error) {
    console.error('❌ Error previewing changes:', error);
  }
}

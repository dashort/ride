/**
 * Test script to verify the rider name property fix
 * This tests the generateReportData function to ensure rider names are properly returned
 */

function testRiderNameFix() {
  console.log('🧪 === TESTING RIDER NAME FIX ===');
  console.log('Verifying that rider names are properly returned instead of "Unknown"');
  
  try {
    // Test with current date range to get active data
    const testFilters = {
      startDate: '2024-01-01',
      endDate: '2025-12-31',
      requestType: 'All',
      status: 'All'
    };
    
    console.log('📊 Testing generateReportData with filters:', testFilters);
    const reportData = generateReportData(testFilters);
    
    if (!reportData || !reportData.success) {
      console.log('❌ generateReportData failed:', reportData ? reportData.error : 'No data returned');
      return { success: false, error: 'generateReportData failed' };
    }
    
    console.log('✅ generateReportData executed successfully');
    
    // Check rider hours data structure
    const riderHours = reportData.riderHours || reportData.tables?.riderHours || [];
    console.log(`📈 Found ${riderHours.length} rider hours records`);
    
    if (riderHours.length === 0) {
      console.log('⚠️ No rider hours data found - this might be normal if no completed escorts exist');
      return { success: true, warning: 'No rider hours data to test' };
    }
    
    // Test the first few riders to check property structure
    const testResults = [];
    for (let i = 0; i < Math.min(5, riderHours.length); i++) {
      const rider = riderHours[i];
      console.log(`\n🔍 Testing rider ${i + 1}:`, rider);
      
      const hasRiderName = rider.hasOwnProperty('riderName');
      const hasRiderProperty = rider.hasOwnProperty('rider');
      const riderNameValue = rider.riderName;
      const riderPropertyValue = rider.rider;
      
      console.log(`   - Has 'riderName' property: ${hasRiderName}`);
      console.log(`   - Has 'rider' property: ${hasRiderProperty}`);
      console.log(`   - riderName value: "${riderNameValue}"`);
      if (hasRiderProperty) {
        console.log(`   - rider value: "${riderPropertyValue}"`);
      }
      console.log(`   - escorts: ${rider.escorts}`);
      console.log(`   - hours: ${rider.hours}`);
      
      // Test what the frontend would use
      const displayName = rider.riderName || rider.rider || 'Unknown';
      console.log(`   - Frontend would display: "${displayName}"`);
      
      testResults.push({
        index: i,
        hasRiderName: hasRiderName,
        hasRiderProperty: hasRiderProperty,
        riderNameValue: riderNameValue,
        displayName: displayName,
        isUnknown: displayName === 'Unknown' || displayName.startsWith('Unknown'),
        escorts: rider.escorts,
        hours: rider.hours
      });
    }
    
    // Analysis
    const unknownCount = testResults.filter(r => r.isUnknown).length;
    const properNameCount = testResults.filter(r => !r.isUnknown && r.displayName && r.displayName.trim().length > 0).length;
    
    console.log('\n📊 === TEST ANALYSIS ===');
    console.log(`Total riders tested: ${testResults.length}`);
    console.log(`Riders with proper names: ${properNameCount}`);
    console.log(`Riders showing as "Unknown": ${unknownCount}`);
    
    if (unknownCount === 0) {
      console.log('✅ SUCCESS: All riders have proper names, no "Unknown" entries found!');
      return { 
        success: true, 
        tested: testResults.length, 
        properNames: properNameCount,
        unknownCount: unknownCount,
        message: 'Fix successful - all riders have proper names'
      };
    } else {
      console.log('❌ ISSUE: Some riders still showing as "Unknown"');
      console.log('Unknown riders:', testResults.filter(r => r.isUnknown));
      return { 
        success: false, 
        tested: testResults.length, 
        properNames: properNameCount,
        unknownCount: unknownCount,
        message: 'Some riders still showing as Unknown',
        unknownRiders: testResults.filter(r => r.isUnknown)
      };
    }
    
  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test the rider data source directly to check for issues
 */
function testRiderDataSource() {
  console.log('\n🔍 === TESTING RIDER DATA SOURCE ===');
  
  try {
    const ridersData = getRidersData();
    console.log(`📋 Found ${ridersData.data.length} riders in source data`);
    
    // Check the first few riders for name field consistency
    for (let i = 0; i < Math.min(5, ridersData.data.length); i++) {
      const rider = ridersData.data[i];
      const riderName = getColumnValue(rider, ridersData.columnMap, CONFIG.columns.riders.name);
      const status = getColumnValue(rider, ridersData.columnMap, CONFIG.columns.riders.status);
      
      console.log(`   Rider ${i + 1}: "${riderName}" (Status: ${status})`);
    }
    
    return { success: true, totalRiders: ridersData.data.length };
    
  } catch (error) {
    console.log('❌ Error testing rider data source:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Run complete test suite
 */
function runCompleteRiderNameTest() {
  console.log('🚀 === COMPLETE RIDER NAME FIX TEST ===');
  
  const dataSourceTest = testRiderDataSource();
  const riderNameTest = testRiderNameFix();
  
  console.log('\n📋 === FINAL RESULTS ===');
  console.log('Data source test:', dataSourceTest.success ? '✅ PASSED' : '❌ FAILED');
  console.log('Rider name test:', riderNameTest.success ? '✅ PASSED' : '❌ FAILED');
  
  if (riderNameTest.success && dataSourceTest.success) {
    console.log('\n🎉 ALL TESTS PASSED! The "Unknown" rider names issue should be resolved.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the results above.');
  }
  
  return {
    dataSourceTest: dataSourceTest,
    riderNameTest: riderNameTest,
    overallSuccess: dataSourceTest.success && riderNameTest.success
  };
}
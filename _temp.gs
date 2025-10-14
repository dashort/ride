/**
 * DIAGNOSTIC TOOL: Find out why times aren't showing up
 * Run this to see what's actually in your data
 */

function diagnosePublicAssignmentTimes() {
  console.log('🔍 DIAGNOSING PUBLIC ASSIGNMENT TIMES\n');
  console.log('═'.repeat(60));
  
  try {
    // Get a sample month's data
    const today = new Date();
    const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    
    console.log(`\nAnalyzing data for: ${startDate}\n`);
    
    // Get the raw requests data
    const requestsData = getRequestsData();
    
    console.log(`Total requests in sheet: ${requestsData.data.length}\n`);
    
    // Sample the first 3 requests with assigned riders
    let samplesFound = 0;
    
    for (let i = 0; i < requestsData.data.length && samplesFound < 3; i++) {
      const row = requestsData.data[i];
      
      const ridersAssigned = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.ridersAssigned);
      
      if (ridersAssigned && ridersAssigned.toString().trim()) {
        samplesFound++;
        
        console.log(`\n📋 SAMPLE REQUEST ${samplesFound}`);
        console.log('─'.repeat(60));
        
        const requestId = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.id);
        const eventDate = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.eventDate);
        const startTime = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.startTime);
        const endTime = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.endTime);
        const requestType = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.type);
        
        console.log(`Request ID: ${requestId}`);
        console.log(`Event Date: ${eventDate}`);
        console.log(`  Type: ${typeof eventDate}`);
        console.log(`  Is Date: ${eventDate instanceof Date}`);
        
        console.log(`\nStart Time RAW VALUE:`);
        console.log(`  Value: "${startTime}"`);
        console.log(`  Type: ${typeof startTime}`);
        console.log(`  Is Date: ${startTime instanceof Date}`);
        console.log(`  Is null/undefined: ${startTime === null || startTime === undefined}`);
        console.log(`  Truthy: ${!!startTime}`);
        
        console.log(`\nEnd Time RAW VALUE:`);
        console.log(`  Value: "${endTime}"`);
        console.log(`  Type: ${typeof endTime}`);
        console.log(`  Is Date: ${endTime instanceof Date}`);
        console.log(`  Is null/undefined: ${endTime === null || endTime === undefined}`);
        console.log(`  Truthy: ${!!endTime}`);
        
        console.log(`\nRequest Type: ${requestType}`);
        console.log(`Riders Assigned: ${ridersAssigned}`);
        
        // Test normalization
        console.log(`\n🔧 TESTING NORMALIZATION:`);
        
        const normalizeTimeValue = value => {
          if (!value) return null;
          if (value instanceof Date && !isNaN(value.getTime())) {
            return value;
          }
          if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed ? value : null;
          }
          return value;
        };
        
        const normalizedStart = normalizeTimeValue(startTime);
        const normalizedEnd = normalizeTimeValue(endTime);
        
        console.log(`  Normalized Start: ${normalizedStart}`);
        console.log(`  Normalized End: ${normalizedEnd}`);
        
        // Test formatting
        console.log(`\n🎨 TESTING FORMATTING:`);
        
        if (normalizedStart) {
          try {
            const formatted = formatMilitaryTime(normalizedStart);
            console.log(`  Formatted Start (military): "${formatted}"`);
          } catch (e) {
            console.log(`  ❌ Error formatting start: ${e.message}`);
          }
        } else {
          console.log(`  ⚠️ Start time is null after normalization`);
        }
        
        if (normalizedEnd) {
          try {
            const formatted = formatMilitaryTime(normalizedEnd);
            console.log(`  Formatted End (military): "${formatted}"`);
          } catch (e) {
            console.log(`  ❌ Error formatting end: ${e.message}`);
          }
        } else {
          console.log(`  ⚠️ End time is null after normalization`);
        }
      }
    }
    
    if (samplesFound === 0) {
      console.log('\n⚠️ No requests found with assigned riders!');
      console.log('   Make sure you have requests with riders assigned for the current month.');
    }
    
    console.log('\n\n📊 COLUMN MAPPING CHECK');
    console.log('─'.repeat(60));
    console.log('Requests sheet columns:');
    Object.keys(requestsData.columnMap).forEach(col => {
      console.log(`  ${col}: index ${requestsData.columnMap[col]}`);
    });
    
    console.log('\n\n💡 RECOMMENDATIONS:');
    console.log('─'.repeat(60));
    
    if (samplesFound > 0) {
      console.log('Based on the samples above:');
      console.log('1. Check if start/end times are actually filled in your Requests sheet');
      console.log('2. Verify the time format in your sheet (should be Date/Time cells)');
      console.log('3. If times are blank, they will show as "TBD" in the summary');
      console.log('4. Check the CONFIG.columns.requests.startTime and endTime settings');
    }
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    console.error(error.stack);
  }
}

/**
 * Test the formatMilitaryTime function with various inputs
 */
function testMilitaryTimeFormatting() {
  console.log('🧪 TESTING MILITARY TIME FORMATTING\n');
  console.log('═'.repeat(60));
  
  const testCases = [
    { input: new Date(2025, 0, 15, 9, 30), description: '9:30 AM as Date object' },
    { input: new Date(2025, 0, 15, 14, 45), description: '2:45 PM as Date object' },
    { input: '9:30 AM', description: 'String with AM' },
    { input: '2:45 PM', description: 'String with PM' },
    { input: '14:45', description: 'String in 24-hour format' },
    { input: null, description: 'null value' },
    { input: '', description: 'empty string' },
    { input: 'TBD', description: 'TBD string' }
  ];
  
  testCases.forEach((test, index) => {
    console.log(`\nTest ${index + 1}: ${test.description}`);
    console.log(`  Input: ${test.input} (type: ${typeof test.input})`);
    
    try {
      const result = formatMilitaryTime(test.input);
      console.log(`  Output: "${result}"`);
      console.log(`  ${result ? '✅ Success' : '⚠️ Empty result'}`);
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  });
}

/**
 * Check what's actually being passed to formatPublicAssignmentCell
 */
function debugFormatPublicAssignmentCell() {
  console.log('🔍 DEBUGGING formatPublicAssignmentCell INPUT\n');
  console.log('═'.repeat(60));
  
  try {
    const today = new Date();
    const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    
    console.log(`Building summary data for: ${startDate}\n`);
    
    const summary = buildPublicAssignmentSummaryData(startDate);
    
    console.log(`Found ${summary.riders.length} riders\n`);
    
    if (summary.riders.length > 0) {
      const rider = summary.riders[0];
      console.log(`Sample Rider: ${rider.name}`);
      console.log(`Total Hours: ${rider.totalHours}\n`);
      
      // Find first day with entries
      for (let day = 0; day < rider.dailyEntries.length; day++) {
        const entries = rider.dailyEntries[day];
        
        if (entries.length > 0) {
          console.log(`Day ${day + 1} has ${entries.length} assignment(s):\n`);
          
          entries.forEach((entry, index) => {
            console.log(`  Assignment ${index + 1}:`);
            console.log(`    start: ${entry.start} (type: ${typeof entry.start})`);
            console.log(`    end: ${entry.end} (type: ${typeof entry.end})`);
            console.log(`    hours: ${entry.hours}`);
            
            // Test formatting this entry
            console.log(`\n    Testing formatPublicAssignmentCell with this entry:`);
            const formatted = formatPublicAssignmentCell([entry]);
            console.log(`    Result:`);
            formatted.split('\n').forEach(line => {
              console.log(`      "${line}"`);
            });
            console.log('');
          });
          
          // Show what the full day would look like
          console.log(`  Full day cell format:`);
          const dayFormatted = formatPublicAssignmentCell(entries);
          dayFormatted.split('\n').forEach(line => {
            console.log(`    "${line}"`);
          });
          
          break; // Only show first day with data
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error(error.stack);
  }
}

/**
 * Check CONFIG settings for time columns
 */
function checkConfigTimeColumns() {
  console.log('⚙️ CHECKING CONFIG TIME COLUMN SETTINGS\n');
  console.log('═'.repeat(60));
  
  console.log('\nCONFIG.columns.requests:');
  if (CONFIG && CONFIG.columns && CONFIG.columns.requests) {
    console.log(`  startTime: "${CONFIG.columns.requests.startTime}"`);
    console.log(`  endTime: "${CONFIG.columns.requests.endTime}"`);
    console.log(`  eventDate: "${CONFIG.columns.requests.eventDate}"`);
  } else {
    console.log('  ❌ CONFIG.columns.requests not found!');
  }
  
  // Check if these columns exist in the actual sheet
  console.log('\nChecking actual sheet headers:');
  const requestsData = getRequestsData();
  const headers = Object.keys(requestsData.columnMap);
  
  console.log('\nAll available columns in Requests sheet:');
  headers.forEach(header => {
    console.log(`  - ${header}`);
  });
  
  // Check for time-related columns
  console.log('\nTime-related columns found:');
  const timeColumns = headers.filter(h => 
    h.toLowerCase().includes('time') || 
    h.toLowerCase().includes('start') || 
    h.toLowerCase().includes('end')
  );
  
  if (timeColumns.length > 0) {
    timeColumns.forEach(col => {
      console.log(`  ✅ ${col}`);
    });
  } else {
    console.log('  ⚠️ No time-related columns found!');
  }
}

/**
 * THE ACTUAL PROBLEM: Check what buildPublicAssignmentSummaryData returns
 */
function debugBuildPublicAssignmentSummaryData() {
  console.log('🔍 DEBUGGING buildPublicAssignmentSummaryData OUTPUT\n');
  console.log('═'.repeat(60));
  
  try {
    const startDate = '2025-10-01';
    console.log(`Building summary for: ${startDate}\n`);
    
    const summary = buildPublicAssignmentSummaryData(startDate);
    
    console.log(`Found ${summary.riders.length} riders\n`);
    
    if (summary.riders.length > 0) {
      const rider = summary.riders[0];
      console.log(`Sample Rider: ${rider.name}`);
      console.log(`Payroll: ${rider.id}`);
      console.log(`Total Hours: ${rider.totalHours}\n`);
      
      // Check first few days
      for (let day = 0; day < Math.min(10, rider.dailyEntries.length); day++) {
        const entries = rider.dailyEntries[day];
        
        if (entries.length > 0) {
          console.log(`\nDay ${day + 1} (${entries.length} assignment(s)):`);
          
          entries.forEach((entry, idx) => {
            console.log(`  Assignment ${idx + 1}:`);
            console.log(`    hours: ${entry.hours}`);
            console.log(`    start: ${entry.start}`);
            console.log(`    start type: ${typeof entry.start}`);
            console.log(`    start is Date: ${entry.start instanceof Date}`);
            console.log(`    start is null: ${entry.start === null}`);
            console.log(`    end: ${entry.end}`);
            console.log(`    end type: ${typeof entry.end}`);
            console.log(`    end is Date: ${entry.end instanceof Date}`);
            console.log(`    end is null: ${entry.end === null}`);
            
            // Try to format it
            const formatted = formatPublicAssignmentCell([entry]);
            console.log(`    Formatted output:`);
            formatted.split('\n').forEach(line => {
              console.log(`      "${line}"`);
            });
          });
        }
      }
    } else {
      console.log('⚠️ No riders found with hours in this month!');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error(error.stack);
  }
}

/**
 * RUN THIS - It will show if start/end are null in the daily entries
 */
function quickDebug() {
  console.log('⚡ QUICK DEBUG\n');
  
  const summary = buildPublicAssignmentSummaryData('2025-10-01');
  
  if (summary.riders.length > 0) {
    const rider = summary.riders[0];
    
    for (let day = 0; day < rider.dailyEntries.length; day++) {
      const entries = rider.dailyEntries[day];
      
      if (entries.length > 0) {
        console.log(`Day ${day + 1}:`);
        entries.forEach(e => {
          console.log(`  Hours: ${e.hours}, Start: ${e.start}, End: ${e.end}`);
        });
        break; // Just show first day with data
      }
    }
  }
}
/**
 * DIAGNOSTIC TOOL: Find out why times aren't showing up
 * Run this to see what's actually in your data
 */

function diagnosePublicAssignmentTimes() {
  console.log('🔍 DIAGNOSING PUBLIC ASSIGNMENT TIMES\n');
  console.log('═'.repeat(60));
  
  try {
    // Get a sample month's data
    const today = new Date();
    const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    
    console.log(`\nAnalyzing data for: ${startDate}\n`);
    
    // Get the raw requests data
    const requestsData = getRequestsData();
    
    console.log(`Total requests in sheet: ${requestsData.data.length}\n`);
    
    // Sample the first 3 requests with assigned riders
    let samplesFound = 0;
    
    for (let i = 0; i < requestsData.data.length && samplesFound < 3; i++) {
      const row = requestsData.data[i];
      
      const ridersAssigned = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.ridersAssigned);
      
      if (ridersAssigned && ridersAssigned.toString().trim()) {
        samplesFound++;
        
        console.log(`\n📋 SAMPLE REQUEST ${samplesFound}`);
        console.log('─'.repeat(60));
        
        const requestId = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.id);
        const eventDate = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.eventDate);
        const startTime = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.startTime);
        const endTime = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.endTime);
        const requestType = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.type);
        
        console.log(`Request ID: ${requestId}`);
        console.log(`Event Date: ${eventDate}`);
        console.log(`  Type: ${typeof eventDate}`);
        console.log(`  Is Date: ${eventDate instanceof Date}`);
        
        console.log(`\nStart Time RAW VALUE:`);
        console.log(`  Value: "${startTime}"`);
        console.log(`  Type: ${typeof startTime}`);
        console.log(`  Is Date: ${startTime instanceof Date}`);
        console.log(`  Is null/undefined: ${startTime === null || startTime === undefined}`);
        console.log(`  Truthy: ${!!startTime}`);
        
        console.log(`\nEnd Time RAW VALUE:`);
        console.log(`  Value: "${endTime}"`);
        console.log(`  Type: ${typeof endTime}`);
        console.log(`  Is Date: ${endTime instanceof Date}`);
        console.log(`  Is null/undefined: ${endTime === null || endTime === undefined}`);
        console.log(`  Truthy: ${!!endTime}`);
        
        console.log(`\nRequest Type: ${requestType}`);
        console.log(`Riders Assigned: ${ridersAssigned}`);
        
        // Test normalization
        console.log(`\n🔧 TESTING NORMALIZATION:`);
        
        const normalizeTimeValue = value => {
          if (!value) return null;
          if (value instanceof Date && !isNaN(value.getTime())) {
            return value;
          }
          if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed ? value : null;
          }
          return value;
        };
        
        const normalizedStart = normalizeTimeValue(startTime);
        const normalizedEnd = normalizeTimeValue(endTime);
        
        console.log(`  Normalized Start: ${normalizedStart}`);
        console.log(`  Normalized End: ${normalizedEnd}`);
        
        // Test formatting
        console.log(`\n🎨 TESTING FORMATTING:`);
        
        if (normalizedStart) {
          try {
            const formatted = formatMilitaryTime(normalizedStart);
            console.log(`  Formatted Start (military): "${formatted}"`);
          } catch (e) {
            console.log(`  ❌ Error formatting start: ${e.message}`);
          }
        } else {
          console.log(`  ⚠️ Start time is null after normalization`);
        }
        
        if (normalizedEnd) {
          try {
            const formatted = formatMilitaryTime(normalizedEnd);
            console.log(`  Formatted End (military): "${formatted}"`);
          } catch (e) {
            console.log(`  ❌ Error formatting end: ${e.message}`);
          }
        } else {
          console.log(`  ⚠️ End time is null after normalization`);
        }
      }
    }
    
    if (samplesFound === 0) {
      console.log('\n⚠️ No requests found with assigned riders!');
      console.log('   Make sure you have requests with riders assigned for the current month.');
    }
    
    console.log('\n\n📊 COLUMN MAPPING CHECK');
    console.log('─'.repeat(60));
    console.log('Requests sheet columns:');
    Object.keys(requestsData.columnMap).forEach(col => {
      console.log(`  ${col}: index ${requestsData.columnMap[col]}`);
    });
    
    console.log('\n\n💡 RECOMMENDATIONS:');
    console.log('─'.repeat(60));
    
    if (samplesFound > 0) {
      console.log('Based on the samples above:');
      console.log('1. Check if start/end times are actually filled in your Requests sheet');
      console.log('2. Verify the time format in your sheet (should be Date/Time cells)');
      console.log('3. If times are blank, they will show as "TBD" in the summary');
      console.log('4. Check the CONFIG.columns.requests.startTime and endTime settings');
    }
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    console.error(error.stack);
  }
}

/**
 * Test the formatMilitaryTime function with various inputs
 */
function testMilitaryTimeFormatting() {
  console.log('🧪 TESTING MILITARY TIME FORMATTING\n');
  console.log('═'.repeat(60));
  
  const testCases = [
    { input: new Date(2025, 0, 15, 9, 30), description: '9:30 AM as Date object' },
    { input: new Date(2025, 0, 15, 14, 45), description: '2:45 PM as Date object' },
    { input: '9:30 AM', description: 'String with AM' },
    { input: '2:45 PM', description: 'String with PM' },
    { input: '14:45', description: 'String in 24-hour format' },
    { input: null, description: 'null value' },
    { input: '', description: 'empty string' },
    { input: 'TBD', description: 'TBD string' }
  ];
  
  testCases.forEach((test, index) => {
    console.log(`\nTest ${index + 1}: ${test.description}`);
    console.log(`  Input: ${test.input} (type: ${typeof test.input})`);
    
    try {
      const result = formatMilitaryTime(test.input);
      console.log(`  Output: "${result}"`);
      console.log(`  ${result ? '✅ Success' : '⚠️ Empty result'}`);
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  });
}

/**
 * Check what's actually being passed to formatPublicAssignmentCell
 */
function debugFormatPublicAssignmentCell() {
  console.log('🔍 DEBUGGING formatPublicAssignmentCell INPUT\n');
  console.log('═'.repeat(60));
  
  try {
    const today = new Date();
    const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    
    console.log(`Building summary data for: ${startDate}\n`);
    
    const summary = buildPublicAssignmentSummaryData(startDate);
    
    console.log(`Found ${summary.riders.length} riders\n`);
    
    if (summary.riders.length > 0) {
      const rider = summary.riders[0];
      console.log(`Sample Rider: ${rider.name}`);
      console.log(`Total Hours: ${rider.totalHours}\n`);
      
      // Find first day with entries
      for (let day = 0; day < rider.dailyEntries.length; day++) {
        const entries = rider.dailyEntries[day];
        
        if (entries.length > 0) {
          console.log(`Day ${day + 1} has ${entries.length} assignment(s):\n`);
          
          entries.forEach((entry, index) => {
            console.log(`  Assignment ${index + 1}:`);
            console.log(`    start: ${entry.start} (type: ${typeof entry.start})`);
            console.log(`    end: ${entry.end} (type: ${typeof entry.end})`);
            console.log(`    hours: ${entry.hours}`);
            
            // Test formatting this entry
            console.log(`\n    Testing formatPublicAssignmentCell with this entry:`);
            const formatted = formatPublicAssignmentCell([entry]);
            console.log(`    Result:`);
            formatted.split('\n').forEach(line => {
              console.log(`      "${line}"`);
            });
            console.log('');
          });
          
          // Show what the full day would look like
          console.log(`  Full day cell format:`);
          const dayFormatted = formatPublicAssignmentCell(entries);
          dayFormatted.split('\n').forEach(line => {
            console.log(`    "${line}"`);
          });
          
          break; // Only show first day with data
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error(error.stack);
  }
}

/**
 * Check CONFIG settings for time columns
 */
function checkConfigTimeColumns() {
  console.log('⚙️ CHECKING CONFIG TIME COLUMN SETTINGS\n');
  console.log('═'.repeat(60));
  
  console.log('\nCONFIG.columns.requests:');
  if (CONFIG && CONFIG.columns && CONFIG.columns.requests) {
    console.log(`  startTime: "${CONFIG.columns.requests.startTime}"`);
    console.log(`  endTime: "${CONFIG.columns.requests.endTime}"`);
    console.log(`  eventDate: "${CONFIG.columns.requests.eventDate}"`);
  } else {
    console.log('  ❌ CONFIG.columns.requests not found!');
  }
  
  // Check if these columns exist in the actual sheet
  console.log('\nChecking actual sheet headers:');
  const requestsData = getRequestsData();
  const headers = Object.keys(requestsData.columnMap);
  
  console.log('\nAll available columns in Requests sheet:');
  headers.forEach(header => {
    console.log(`  - ${header}`);
  });
  
  // Check for time-related columns
  console.log('\nTime-related columns found:');
  const timeColumns = headers.filter(h => 
    h.toLowerCase().includes('time') || 
    h.toLowerCase().includes('start') || 
    h.toLowerCase().includes('end')
  );
  
  if (timeColumns.length > 0) {
    timeColumns.forEach(col => {
      console.log(`  ✅ ${col}`);
    });
  } else {
    console.log('  ⚠️ No time-related columns found!');
  }
}

/**
 * MASTER DIAGNOSTIC - Run everything
 */
function runFullTimeDiagnostics() {
  console.log('\n');
  console.log('🚀 RUNNING FULL TIME DIAGNOSTICS');
  console.log('═'.repeat(60));
  console.log('\n');
  
  console.log('1️⃣ Checking CONFIG settings...\n');
  checkConfigTimeColumns();
  
  console.log('\n\n2️⃣ Testing military time formatting...\n');
  testMilitaryTimeFormatting();
  
  console.log('\n\n3️⃣ Diagnosing actual request data...\n');
  diagnosePublicAssignmentTimes();
  
  console.log('\n\n4️⃣ Debugging cell formatting...\n');
  debugFormatPublicAssignmentCell();
  
  console.log('\n\n✅ DIAGNOSTICS COMPLETE');
  console.log('═'.repeat(60));
  console.log('\nReview the output above to identify the issue.');
  console.log('Most common issues:');
  console.log('  1. Start/End times are blank in the Requests sheet');
  console.log('  2. CONFIG column names don\'t match actual sheet headers');
  console.log('  3. Time values are stored as text instead of Date objects');
  console.log('  4. normalizeTimeValue is returning null');
}
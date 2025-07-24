/**
 * Assignment Fix Validator
 * Tests the fixes for getAllAssignmentsForNotifications and creates sample data if needed
 */

// Provide a minimal CONFIG fallback when running this file by itself
if (typeof CONFIG === 'undefined') {
  console.warn('CONFIG is not defined. Using fallback values for validator.');

  this.CONFIG = {
    sheets: {
      assignments: 'Assignments',
      riders: 'Riders',
    },
    columns: {
      assignments: {
        id: 'Assignment ID',
        requestId: 'Request ID',
        eventDate: 'Event Date',
        startTime: 'Start Time',
        endTime: 'End Time',
        startLocation: 'Start Location',
        endLocation: 'Second Location',
        secondaryLocation: 'Final Location',
        riderName: 'Rider Name',
        jpNumber: 'JP Number',
        status: 'Status',
        createdDate: 'Created Date',
        notified: 'Notified',
        notificationStatus: 'Notification Status',
        smsSent: 'SMS Sent',
        emailSent: 'Email Sent',
        confirmedDate: 'Confirmed Date',
        confirmationMethod: 'Confirmation Method',
        completedDate: 'Completed Date',
        actualStartTime: 'Actual Start Time',
        actualEndTime: 'Actual End Time',
        actualDuration: 'Actual Duration (Hours)',
        calendarEventId: 'Calendar Event ID',
        notes: 'Notes',
      },
      riders: {
        name: 'Full Name',
        phone: 'Phone Number',
        email: 'Email',
        carrier: 'Carrier',
      },
    },
  };
}

function validateAndFixAssignments() {
  console.log('🔍 Validating assignment fixes...');
  
  const result = {
    success: false,
    assignmentCount: 0,
    issues: [],
    fixes: [],
    sampleDataCreated: false
  };
  
  try {
    // Step 1: Check if assignments sheet exists and has data
    console.log('\n=== STEP 1: CHECKING ASSIGNMENT DATA ===');
    const dataCheck = checkAssignmentData();
    
    if (dataCheck.needsSampleData) {
      console.log('\n=== STEP 2: CREATING SAMPLE DATA ===');
      const sampleResult = createSampleAssignmentData();
      result.sampleDataCreated = sampleResult.success;
      result.fixes.push(`Created ${sampleResult.count} sample assignments`);
    }
    
    // Step 3: Test getAllAssignmentsForNotifications
    console.log('\n=== STEP 3: TESTING FUNCTION ===');
    const functionTest = testGetAllAssignmentsForNotifications();
    result.assignmentCount = functionTest.count;
    result.success = functionTest.success;
    
    if (!functionTest.success) {
      result.issues = functionTest.issues;
    }
    
    // Step 4: Fix missing rider names if any
    console.log('\n=== STEP 4: FIXING RIDER NAMES ===');
    const riderFix = fixMissingRiderNames();
    if (riderFix.fixed > 0) {
      result.fixes.push(`Fixed ${riderFix.fixed} missing rider names`);
    }
    
    console.log('\n=== VALIDATION COMPLETE ===');
    if (result.success) {
      console.log(`✅ SUCCESS: ${result.assignmentCount} assignments now loading correctly`);
    } else {
      console.log('❌ ISSUES REMAIN:', result.issues);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Validation error:', error);
    result.issues.push(`Validation error: ${error.message}`);
    return result;
  }
}

function checkAssignmentData() {
  console.log('📊 Checking assignment data...');
  
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const assignmentsSheetName = CONFIG.sheets.assignments;
    let sheet = spreadsheet.getSheetByName(assignmentsSheetName);
    
    if (!sheet) {
      console.log('📋 Creating assignments sheet...');
      sheet = getOrCreateSheet(assignmentsSheetName, Object.values(CONFIG.columns.assignments));
      return { needsSampleData: true, reason: 'Sheet did not exist' };
    }
    
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    if (values.length <= 1) {
      return { needsSampleData: true, reason: 'No data rows found' };
    }
    
    console.log(`📊 Found ${values.length - 1} assignment rows`);
    return { needsSampleData: false, rowCount: values.length - 1 };
    
  } catch (error) {
    console.error('❌ Error checking assignment data:', error);
    return { needsSampleData: true, reason: `Error: ${error.message}` };
  }
}

function createSampleAssignmentData() {
  console.log('📋 Creating sample assignment data...');
  
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.sheets.assignments);
    
    if (!sheet) {
      console.log('❌ Assignments sheet not found');
      return { success: false, count: 0 };
    }
    
    // Create realistic sample data
    const sampleAssignments = [
      [
        'ASG-0001',           // Assignment ID
        'REQ-0001',           // Request ID
        new Date(),           // Event Date
        '08:00',              // Start Time
        '17:00',              // End Time
        'Downtown Plaza',     // Start Location
        'Airport Terminal',   // Second Location
        'Hotel District',     // Final Location
        'Officer Smith',      // Rider Name
        'JP001',             // JP Number
        'Assigned',          // Status
        new Date(),          // Created Date
        false,               // Notified
        'pending',           // Notification Status
        '',                  // SMS Sent
        '',                  // Email Sent
        '',                  // Confirmed Date
        '',                  // Confirmation Method
        '',                  // Completed Date
        '',                  // Actual Start Time
        '',                  // Actual End Time
        '',                  // Actual Duration
        '',                  // Calendar Event ID
        'Sample assignment for testing'  // Notes
      ],
      [
        'ASG-0002',
        'REQ-0002',
        new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        '09:00',
        '18:00',
        'City Hall',
        'Convention Center',
        'Sports Arena',
        'Officer Jones',
        'JP002',
        'Assigned',
        new Date(),
        false,
        'pending',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'Second sample assignment'
      ],
      [
        'ASG-0003',
        'REQ-0003',
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        '10:00',
        '16:00',
        'Main Street',
        'Shopping Mall',
        'Stadium',
        'Officer Davis',
        'JP003',
        'Pending',
        new Date(),
        false,
        'pending',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'Third sample assignment'
      ]
    ];
    
    // Add the sample data to the sheet
    const startRow = sheet.getLastRow() + 1;
    const range = sheet.getRange(startRow, 1, sampleAssignments.length, sampleAssignments[0].length);
    range.setValues(sampleAssignments);
    
    console.log(`✅ Created ${sampleAssignments.length} sample assignments`);
    return { success: true, count: sampleAssignments.length };
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    return { success: false, count: 0 };
  }
}

function testGetAllAssignmentsForNotifications() {
  console.log('🧪 Testing getAllAssignmentsForNotifications...');
  
  try {
    const assignments = getAllAssignmentsForNotifications(false);
    const count = assignments ? assignments.length : 0;
    
    console.log(`📊 Function returned ${count} assignments`);
    
    if (count === 0) {
      return {
        success: false,
        count: 0,
        issues: ['getAllAssignmentsForNotifications returns no assignments']
      };
    }
    
    // Validate the structure of returned assignments
    const firstAssignment = assignments[0];
    const requiredFields = ['id', 'requestId', 'riderName', 'status', 'eventDate'];
    const missingFields = requiredFields.filter(field => !firstAssignment.hasOwnProperty(field));
    
    if (missingFields.length > 0) {
      return {
        success: false,
        count: count,
        issues: [`Missing fields in assignment: ${missingFields.join(', ')}`]
      };
    }
    
    console.log('📋 Sample assignment structure:', {
      id: firstAssignment.id,
      requestId: firstAssignment.requestId,
      riderName: firstAssignment.riderName,
      status: firstAssignment.status,
      eventDate: firstAssignment.eventDate
    });
    
    return {
      success: true,
      count: count,
      issues: []
    };
    
  } catch (error) {
    console.error('❌ Test error:', error);
    return {
      success: false,
      count: 0,
      issues: [`Function error: ${error.message}`]
    };
  }
}

function fixMissingRiderNames() {
  console.log('🔧 Fixing missing rider names...');
  
  try {
    const assignmentsData = getAssignmentsData(false);
    if (!assignmentsData || !assignmentsData.data || assignmentsData.data.length <= 1) {
      console.log('⚠️ No assignment data to fix');
      return { fixed: 0 };
    }
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.sheets.assignments);
    
    if (!sheet) {
      console.log('⚠️ Assignments sheet not found');
      return { fixed: 0 };
    }
    
    let fixedCount = 0;
    const columnMap = assignmentsData.columnMap;
    const riderNameColIndex = columnMap[CONFIG.columns.assignments.riderName];
    
    if (riderNameColIndex === undefined) {
      console.log('⚠️ Rider Name column not found');
      return { fixed: 0 };
    }
    
    // Check each row for missing rider names
    for (let i = 1; i < assignmentsData.data.length; i++) {
      const row = assignmentsData.data[i];
      const riderName = getColumnValue(row, columnMap, CONFIG.columns.assignments.riderName);
      const requestId = getColumnValue(row, columnMap, CONFIG.columns.assignments.requestId);
      
      // If there's a request ID but no rider name, add placeholder
      if (requestId && (!riderName || riderName.trim() === '')) {
        try {
          sheet.getRange(i + 1, riderNameColIndex + 1).setValue('Unassigned');
          fixedCount++;
        } catch (cellError) {
          console.log(`⚠️ Could not update cell for row ${i + 1}`);
        }
      }
    }
    
    if (fixedCount > 0) {
      console.log(`✅ Fixed ${fixedCount} missing rider names`);
    } else {
      console.log('✅ No missing rider names found');
    }
    
    return { fixed: fixedCount };
    
  } catch (error) {
    console.error('❌ Error fixing rider names:', error);
    return { fixed: 0 };
  }
}

// Run the validation when this script is executed
console.log('🚀 Starting assignment validation and fix...');
const validationResult = validateAndFixAssignments();
console.log('🏁 Validation completed:', validationResult);
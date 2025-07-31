/**
 * Creates sample assignment data for testing the notifications page
 */
function createSampleAssignmentsForTesting() {
  try {
    debugLog('🧪 Creating sample assignments for testing...');
    
    // Get or create the assignments sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const assignmentsSheet = getOrCreateSheet(
      CONFIG.sheets.assignments, 
      Object.values(CONFIG.columns.assignments)
    );
    
    // Check if there are already assignments
    const existingData = getAssignmentsData();
    debugLog(`📊 Found ${existingData.data.length} existing assignments`);
    
    // Sample data
    const sampleAssignments = [
      {
        [CONFIG.columns.assignments.id]: 'ASG-001',
        [CONFIG.columns.assignments.requestId]: 'REQ-001',
        [CONFIG.columns.assignments.eventDate]: new Date(Date.now() + 86400000), // Tomorrow
        [CONFIG.columns.assignments.startTime]: '10:00 AM',
        [CONFIG.columns.assignments.endTime]: '2:00 PM',
        [CONFIG.columns.assignments.startLocation]: 'City Hall',
        [CONFIG.columns.assignments.endLocation]: 'Memorial Park',
        [CONFIG.columns.assignments.riderName]: 'John Smith',
        [CONFIG.columns.assignments.jpNumber]: 'JP001',
        [CONFIG.columns.assignments.status]: 'Assigned',
        [CONFIG.columns.assignments.createdDate]: new Date(),
        [CONFIG.columns.assignments.notified]: '', // Empty - needs notification
        [CONFIG.columns.assignments.smsSent]: '',
        [CONFIG.columns.assignments.emailSent]: '',
        [CONFIG.columns.assignments.notes]: 'Sample assignment for testing'
      },
      {
        [CONFIG.columns.assignments.id]: 'ASG-002',
        [CONFIG.columns.assignments.requestId]: 'REQ-002',
        [CONFIG.columns.assignments.eventDate]: new Date(Date.now() + 2 * 86400000), // Day after tomorrow
        [CONFIG.columns.assignments.startTime]: '2:00 PM',
        [CONFIG.columns.assignments.endTime]: '6:00 PM',
        [CONFIG.columns.assignments.startLocation]: 'Hospital Main Entrance',
        [CONFIG.columns.assignments.endLocation]: 'Cemetery',
        [CONFIG.columns.assignments.riderName]: 'Mike Johnson',
        [CONFIG.columns.assignments.jpNumber]: 'JP002',
        [CONFIG.columns.assignments.status]: 'Confirmed',
        [CONFIG.columns.assignments.createdDate]: new Date(),
        [CONFIG.columns.assignments.notified]: new Date(), // Already notified
        [CONFIG.columns.assignments.smsSent]: new Date(),
        [CONFIG.columns.assignments.emailSent]: '',
        [CONFIG.columns.assignments.notes]: 'Rider confirmed via SMS'
      },
      {
        [CONFIG.columns.assignments.id]: 'ASG-003',
        [CONFIG.columns.assignments.requestId]: 'REQ-003',
        [CONFIG.columns.assignments.eventDate]: new Date(), // Today
        [CONFIG.columns.assignments.startTime]: '9:00 AM',
        [CONFIG.columns.assignments.endTime]: '12:00 PM',
        [CONFIG.columns.assignments.startLocation]: 'Church',
        [CONFIG.columns.assignments.endLocation]: 'Reception Hall',
        [CONFIG.columns.assignments.riderName]: 'Sarah Wilson',
        [CONFIG.columns.assignments.jpNumber]: 'JP003',
        [CONFIG.columns.assignments.status]: 'Assigned',
        [CONFIG.columns.assignments.createdDate]: new Date(),
        [CONFIG.columns.assignments.notified]: '',
        [CONFIG.columns.assignments.smsSent]: '',
        [CONFIG.columns.assignments.emailSent]: '',
        [CONFIG.columns.assignments.notes]: 'Wedding escort - high priority'
      }
    ];
    
    const headers = Object.values(CONFIG.columns.assignments);
    let rowsAdded = 0;
    
    for (const assignment of sampleAssignments) {
      // Check if this assignment already exists
      const existingAssignment = existingData.data.find(row => 
        getColumnValue(row, existingData.columnMap, CONFIG.columns.assignments.id) === assignment[CONFIG.columns.assignments.id]
      );
      
      if (!existingAssignment) {
        // Create row array in correct column order
        const row = headers.map(header => assignment[header] || '');
        assignmentsSheet.appendRow(row);
        rowsAdded++;
        debugLog(`✅ Added assignment: ${assignment[CONFIG.columns.assignments.id]}`);
      } else {
        debugLog(`⚠️ Assignment ${assignment[CONFIG.columns.assignments.id]} already exists, skipping`);
      }
    }
    
    // Create sample riders if they don't exist
    createSampleRidersIfNeeded();
    
    // Clear cache so new data is loaded
    dataCache.clear('sheet_' + CONFIG.sheets.assignments);
    dataCache.clear('sheet_' + CONFIG.sheets.riders);
    
    debugLog(`✅ Sample assignment creation complete. Added ${rowsAdded} new assignments.`);
    
    return {
      success: true,
      message: `Created ${rowsAdded} sample assignments`,
      assignmentsAdded: rowsAdded,
      totalAssignments: existingData.data.length + rowsAdded
    };
    
  } catch (error) {
    console.error('❌ Error creating sample assignments:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Creates sample riders if they don't exist
 */
function createSampleRidersIfNeeded() {
  try {
    const ridersSheet = getOrCreateSheet(
      CONFIG.sheets.riders, 
      Object.values(CONFIG.columns.riders)
    );
    
    const ridersData = getRidersData();
    
    const sampleRiders = [
      {
        [CONFIG.columns.riders.jpNumber]: 'JP001',
        [CONFIG.columns.riders.name]: 'John Smith',
        [CONFIG.columns.riders.phone]: '(555) 123-4567',
        [CONFIG.columns.riders.email]: 'john.smith@test.com',
        [CONFIG.columns.riders.status]: 'Active',
        [CONFIG.columns.riders.platoon]: 'A',
        [CONFIG.columns.riders.certification]: 'Standard'
      },
      {
        [CONFIG.columns.riders.jpNumber]: 'JP002',
        [CONFIG.columns.riders.name]: 'Mike Johnson',
        [CONFIG.columns.riders.phone]: '(555) 234-5678',
        [CONFIG.columns.riders.email]: 'mike.johnson@test.com',
        [CONFIG.columns.riders.status]: 'Active',
        [CONFIG.columns.riders.platoon]: 'B',
        [CONFIG.columns.riders.certification]: 'Advanced'
      },
      {
        [CONFIG.columns.riders.jpNumber]: 'JP003',
        [CONFIG.columns.riders.name]: 'Sarah Wilson',
        [CONFIG.columns.riders.phone]: '(555) 345-6789',
        [CONFIG.columns.riders.email]: 'sarah.wilson@test.com',
        [CONFIG.columns.riders.status]: 'Active',
        [CONFIG.columns.riders.platoon]: 'A',
        [CONFIG.columns.riders.certification]: 'Standard'
      }
    ];
    
    const headers = Object.values(CONFIG.columns.riders);
    let ridersAdded = 0;
    
    for (const rider of sampleRiders) {
      // Check if rider already exists
      const existingRider = ridersData.data.find(row => 
        getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.jpNumber) === rider[CONFIG.columns.riders.jpNumber]
      );
      
      if (!existingRider) {
        const row = headers.map(header => rider[header] || '');
        ridersSheet.appendRow(row);
        ridersAdded++;
        debugLog(`✅ Added rider: ${rider[CONFIG.columns.riders.name]}`);
      }
    }
    
    debugLog(`✅ Added ${ridersAdded} sample riders`);
    
  } catch (error) {
    console.error('❌ Error creating sample riders:', error);
  }
}
/**
 * @fileoverview
 * Availability Service for the Motorcycle Escort Management System
 * Handles individual rider availability calendars with enhanced features
 * including recurring schedules, status management, and admin views.
 */

/**
 * Gets current user information for availability calendar
 * @return {object} User data with role and permissions
 */
function getCurrentUserForAvailability() {
  try {
    const user = getCurrentUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get rider ID if user is a rider
    let riderId = null;
    if (user.role === 'rider') {
      // Try to find rider ID from riders sheet by matching either primary Email or Google Email
      const ridersData = getRidersData();
      const primaryEmailCol = CONFIG.columns.riders.email;
      const idCol = CONFIG.columns.riders.jpNumber;
      const normalize = (v) => String(v == null ? '' : v).trim().toLowerCase();
      const userEmail = normalize(user.email);

      for (let row of ridersData.data) {
        const primary = getColumnValue(row, ridersData.columnMap, primaryEmailCol);
        const googleEmail = getColumnValue(row, ridersData.columnMap, 'Google Email');
        const rowEmail = normalize(primary || googleEmail);
        if (rowEmail && rowEmail === userEmail) {
          riderId = getColumnValue(row, ridersData.columnMap, idCol);
          break;
        }
      }
    }

    return {
      success: true,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        riderId: riderId,
        permissions: user.permissions || []
      }
    };
  } catch (error) {
    console.error('Error getting current user for availability:', error);
    return { success: false, error: 'Failed to load user information' };
  }
}

/**
 * Simple test function to verify web app communication
 * Add this to AvailabilityService.gs
 */
function testSimpleReturn() {
  console.log('testSimpleReturn called');
  return ['test1', 'test2', 'test3'];
}

/**
 * Test that returns the same structure as getUserAvailabilityForCalendar
 */
function testAvailabilityReturn() {
  console.log('testAvailabilityReturn called');
  
  return [
    {
      id: 'test_1',
      date: '2025-10-10',
      status: 'available',
      title: 'Available'
    },
    {
      id: 'test_2',
      date: '2025-10-11',
      status: 'available',
      title: 'Available'
    }
  ];
}

/**
 * Alternative version of getUserAvailabilityForCalendar
 * that returns simpler data
 */
function getUserAvailabilitySimple(email) {
  try {
    console.log('getUserAvailabilitySimple called for:', email);
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rider Availability');
    if (!sheet) {
      console.log('Sheet not found');
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    const results = [];
    const targetEmail = String(email).toLowerCase().trim();
    
    console.log('Searching for:', targetEmail);
    
    for (let i = 1; i < data.length; i++) {
      const rowEmail = String(data[i][0] || '').toLowerCase().trim();
      
      if (rowEmail === targetEmail) {
        const dateObj = new Date(data[i][1]);
        const dateKey = dateObj.toISOString().split('T')[0];
        
        results.push({
          date: dateKey,
          status: data[i][4] || 'available'
        });
        
        console.log('Found:', dateKey);
      }
    }
    
    console.log('Returning', results.length, 'results');
    return results;
    
  } catch (error) {
    console.error('Error:', error.message);
    return [];
  }
}
/**
 * Gets availability data for a specific user's calendar
 * @param {string} email User email
 * @return {Array} Array of calendar events
 */
/**
 * Gets availability data for a specific user's calendar
 * REPLACE getUserAvailabilityForCalendar in AvailabilityService.gs
 */
function getUserAvailabilityForCalendar(email) {
  try {
    console.log(`=== getUserAvailabilityForCalendar START ===`);
    console.log(`Getting availability for user: ${email}`);
    
    if (!email) {
      console.log('❌ No email provided');
      return [];
    }
    
    // Get the sheet directly (no caching)
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    console.log('Got spreadsheet:', ss.getName());
    
    const sheetName = CONFIG.sheets.availability;
    console.log('Looking for sheet:', sheetName);
    
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      console.log('❌ Availability sheet not found:', sheetName);
      console.log('Available sheets:', ss.getSheets().map(s => s.getName()).join(', '));
      return [];
    }

    console.log('✅ Sheet found:', sheet.getName());

    // Get all data from sheet
    const data = sheet.getDataRange().getValues();
    console.log('Total rows in sheet:', data.length);
    
    if (data.length <= 1) {
      console.log('⚠️ No availability data in sheet (only header or empty)');
      return [];
    }

    const headers = data[0];
    console.log('Headers:', JSON.stringify(headers));
    
    const events = [];
    const targetEmail = String(email).toLowerCase().trim();
    
    console.log('Looking for email (normalized):', targetEmail);

    // Process each row (skip header)
    let matchCount = 0;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowEmail = String(row[0] || '').toLowerCase().trim();
      
      if (i <= 3) {
        console.log(`Row ${i} email: "${rowEmail}"`);
      }
      
      // Check if this row is for our target email
      if (rowEmail === targetEmail) {
        matchCount++;
        
        const date = row[1]; // Date column
        const startTime = row[2]; // Start Time column
        const endTime = row[3]; // End Time column
        const status = row[4] || 'available'; // Status column
        const notes = row[5] || ''; // Notes column
        
        console.log(`Match ${matchCount}: Date=${date}, Status=${status}`);
        
        if (date) {
          try {
            // Format the date as YYYY-MM-DD
            const dateObj = new Date(date);
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            const dateKey = `${year}-${month}-${day}`;
            
            // Create event object
            const event = {
              id: `avail_${i}`,
              date: dateKey,
              start: dateObj.toISOString(),
              end: dateObj.toISOString(),
              status: status,
              notes: notes,
              startTime: startTime,
              endTime: endTime,
              title: status === 'available' ? 'Available' : 'Unavailable'
            };
            
            events.push(event);
            console.log(`✅ Added event for ${dateKey}: ${status}`);
          } catch (dateError) {
            console.error(`Error processing date for row ${i}:`, dateError.message);
          }
        } else {
          console.log(`⚠️ Row ${i} has no date`);
        }
      }
    }

    console.log(`✅ Found ${events.length} availability events for ${email}`);
    console.log('Returning events:', JSON.stringify(events));
    console.log(`=== getUserAvailabilityForCalendar END ===`);
    
    return events;

  } catch (error) {
    console.error('❌ ERROR in getUserAvailabilityForCalendar:', error.message);
    console.error('Stack:', error.stack);
    return [];
  }
}

/**
 * Gets all riders' availability for admin calendar view
 * @return {object} Object containing riders list and events
 */
function getAllRidersAvailabilityForCalendar() {
  try {
    console.log('Getting all riders availability for admin view');
    
    // Get active riders
    const ridersData = getRidersData();
    const riders = [];
    const events = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Process each rider
    for (let row of ridersData.data) {
      const name = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.name);
      const email = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.email);
      const riderId = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.jpNumber);
      const status = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.status);

      if (name && email && (status === 'Active' || !status)) {
        // Get rider's availability
        const riderAvailability = getUserAvailabilityForCalendar(email);
        
        // Calculate today's status
        const todayStatus = calculateTodayStatus(riderAvailability, today);
        
        riders.push({
          id: riderId || email,
          name: name,
          email: email,
          todayStatus: todayStatus.status,
          todayHours: todayStatus.hours
        });

        // Add rider's events to master events list
        riderAvailability.forEach(event => {
          events.push({
            ...event,
            riderName: name,
            riderId: riderId || email,
            title: `${name}: ${event.title}`
          });
        });
      }
    }

    console.log(`Found ${riders.length} riders with ${events.length} total events`);
    
    return {
      riders: riders,
      events: events
    };

  } catch (error) {
    console.error('Error getting all riders availability:', error);
    logError('Error in getAllRidersAvailabilityForCalendar', error);
    return { riders: [], events: [] };
  }
}

/**
 * Saves rider availability data
 * REPLACE the entire saveRiderAvailabilityData function in AvailabilityService.gs
 */
function saveRiderAvailabilityData(data) {
  try {
    console.log('Saving rider availability:', JSON.stringify(data));
    
    // Validate required fields
    if (!data.email) {
      console.error('Missing email in data');
      return { success: false, error: 'Email is required' };
    }
    
    if (!data.date || !data.startTime || !data.endTime) {
      console.error('Missing required fields');
      return { success: false, error: 'Missing required fields (date, startTime, endTime)' };
    }

    // Get current user for authorization check
    const currentUserResponse = getCurrentUser();
    let currentUser;
    if (currentUserResponse && currentUserResponse.user) {
      currentUser = currentUserResponse.user;
    } else {
      currentUser = currentUserResponse;
    }
    
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    console.log('Current user:', currentUser.email, 'Saving for:', data.email);

    // Ensure availability sheet exists
    ensureAvailabilitySheet();
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.availability);
    
    if (!sheet) {
      return { success: false, error: 'Availability sheet not found' };
    }

    const sheetData = getSheetData(CONFIG.sheets.availability, false);

    // Track timestamps
    const timestamp = new Date();
    let createdDate = timestamp;

    // Check if updating existing entry to preserve original created date
    if (data.id && data.id.startsWith('avail_')) {
      const rowIndex = parseInt(data.id.replace('avail_', ''));
      if (rowIndex >= 0 && rowIndex < sheetData.data.length) {
        const existingRow = sheetData.data[rowIndex];
        createdDate = getColumnValue(existingRow, sheetData.columnMap, CONFIG.columns.availability.created) || timestamp;
      }
    }

    // CRITICAL FIX: Use data.email (the target rider's email), not currentUser.email
    const targetEmail = data.email;
    console.log('Target email for save:', targetEmail);

    // Determine rider ID
    const riderId = data.riderId || getUserRiderId(targetEmail);

    // Prepare row data matching sheet columns
    // Column order: Email, Date, Start Time, End Time, Status, Notes, Created, Updated, Rider ID
    const rowData = [
      targetEmail,                      // Use the email passed in data
      new Date(data.date),
      data.startTime,
      data.endTime,
      data.status || 'available',
      data.notes || '',
      createdDate,
      timestamp,
      riderId
    ];

    console.log('Row data to save:', JSON.stringify(rowData));

    // Check if updating existing entry
    if (data.id && data.id.startsWith('avail_')) {
      const rowIndex = parseInt(data.id.replace('avail_', ''));
      if (rowIndex >= 0 && rowIndex < sheetData.data.length) {
        // Update existing row
        const sheetRowNumber = rowIndex + 2; // Account for header row
        sheet.getRange(sheetRowNumber, 1, 1, rowData.length).setValues([rowData]);
        console.log(`Updated availability row ${sheetRowNumber}`);
      } else {
        // Add new row if ID is invalid
        sheet.appendRow(rowData);
        console.log('Added new availability row');
      }
    } else {
      // Add new row
      sheet.appendRow(rowData);
      console.log('Added new availability row for:', targetEmail);
    }

    // Clear cache
    dataCache.clear('sheet_' + CONFIG.sheets.availability);
    
    logActivity(`Availability ${data.status} set for ${targetEmail} on ${data.date} by ${currentUser.name}`);
    
    return { 
      success: true, 
      message: `Availability saved successfully for ${targetEmail}`
    };

  } catch (error) {
    console.error('Error saving rider availability:', error);
    console.error('Error stack:', error.stack);
    logError('Error in saveRiderAvailabilityData', error);
    return { success: false, error: 'Failed to save availability: ' + error.message };
  }
}

/**
 * Saves a single availability entry to the sheet
 * @param {object} availabilityData Availability data
 * @return {object} Success status and entry ID
 */
function saveAvailabilityEntry(availabilityData) {
  try {
    console.log('Saving availability entry:', availabilityData);
    
    // Validate input
    if (!availabilityData || !availabilityData.email || !availabilityData.date) {
      return { success: false, error: 'Invalid availability data' };
    }
    
    // Ensure availability sheet exists with proper headers
    ensureAvailabilitySheet();
    
    // Get the spreadsheet and sheet using CONFIG
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.sheets.availability);
    
    if (!sheet) {
      return { success: false, error: 'Could not access availability sheet' };
    }
    
    // Get all data from sheet
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const timestamp = new Date().toISOString();

    // Normalize the input date for reliable comparisons
    const inputDate = new Date(availabilityData.date);
    const inputDateStr = inputDate.toISOString().split('T')[0];

    // Look for existing entry for this user and date
    let existingRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowDate = new Date(row[1]);
      const rowDateStr = rowDate.toISOString().split('T')[0];

      if (row[0] === availabilityData.email && rowDateStr === inputDateStr) {
        existingRowIndex = i + 1; // Convert to 1-based index for sheet operations
        break;
      }
    }
    
    if (existingRowIndex > 0) {
      // UPDATE EXISTING ROW - This is where we modify the sheet
      sheet.getRange(existingRowIndex, 2).setValue(inputDate);                    // Date
      sheet.getRange(existingRowIndex, 3).setValue(availabilityData.startTime);   // Start Time
      sheet.getRange(existingRowIndex, 4).setValue(availabilityData.endTime);     // End Time
      sheet.getRange(existingRowIndex, 5).setValue(availabilityData.status);      // Status
      sheet.getRange(existingRowIndex, 6).setValue(availabilityData.notes || ''); // Notes
      sheet.getRange(existingRowIndex, 8).setValue(timestamp);                    // Updated
      sheet.getRange(existingRowIndex, 9).setValue(availabilityData.riderId || getUserRiderId(availabilityData.email)); // Rider ID
      
      console.log('SHEET UPDATED: Row ' + existingRowIndex + ' modified');
      
    } else {
      // ADD NEW ROW - This is where we add to the sheet
      const newRow = [
        availabilityData.email,
        inputDate,
        availabilityData.startTime,
        availabilityData.endTime,
        availabilityData.status,
        availabilityData.notes || '',
        timestamp,
        timestamp,
        availabilityData.riderId || getUserRiderId(availabilityData.email)
      ];
      
      sheet.appendRow(newRow);  // <-- THIS IS THE ACTUAL SHEET WRITE
      console.log('SHEET MODIFIED: New row added');
    }
    
    // Clear cache to force refresh
    dataCache.clear('sheet_' + CONFIG.sheets.availability);
    
    return {
      success: true,
      id: `${availabilityData.email}-${availabilityData.date}`,
      message: 'Availability saved to sheet successfully'
    };
    
  } catch (error) {
    console.error('Error writing to sheet:', error);
    return { success: false, error: 'Failed to save to sheet: ' + error.message };
  }
}

/**
 * Deletes an availability entry from the sheet
 * @param {string} email User email
 * @param {string} date Date in YYYY-MM-DD format
 * @return {object} Success status
 */
function deleteAvailabilityEntry(email, date) {
  try {
    console.log(`Deleting from sheet: ${email} on ${date}`);
    
    // Ensure availability sheet exists
    ensureAvailabilitySheet();
    
    // Get the spreadsheet and sheet using CONFIG
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.sheets.availability);
    
    if (!sheet) {
      return { success: false, error: 'Availability sheet not found' };
    }
    
    // Get all data from sheet
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: false, error: 'No data in sheet' };
    }
    
    // Find the row to delete
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] === email && row[1] === date) {
        // DELETE THE ROW - This is where we modify the sheet
        sheet.deleteRow(i + 1); // Convert to 1-based index for sheet operations
        console.log('SHEET MODIFIED: Row ' + (i + 1) + ' deleted');
        
        // Clear cache to force refresh
        dataCache.clear('sheet_' + CONFIG.sheets.availability);
        
        return {
          success: true,
          message: 'Entry deleted from sheet successfully'
        };
      }
    }
    
    return { success: false, error: 'Entry not found in sheet' };
    
  } catch (error) {
    console.error('Error deleting from sheet:', error);
    return { success: false, error: 'Failed to delete from sheet: ' + error.message };
  }
}

/**
 * Saves recurring availability pattern
 * @param {object} data Recurring availability data
 * @return {object} Success/error result
 */
function saveRecurringAvailability(data) {
  try {
    console.log('Saving recurring availability:', data);
    
    if (!data.dayOfWeek || !data.startTime || !data.endTime || !data.untilDate) {
      return { success: false, error: 'Missing required fields for recurring availability' };
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    // Ensure availability sheet exists
    ensureAvailabilitySheet();
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.availability);
    
    // Generate dates for recurring pattern
    const dates = generateRecurringDates(data.dayOfWeek, data.untilDate);
    let addedCount = 0;

    for (let date of dates) {
      // Check if availability already exists for this date/time
      if (!availabilityExistsForDateTime(currentUser.email, date, data.startTime)) {
        const rowData = [
          currentUser.email,
          date,
          data.startTime,
          data.endTime,
          generateAvailabilityNotes(data.status, `Recurring ${data.dayOfWeek}`)
        ];
        
        sheet.appendRow(rowData);
        addedCount++;
      }
    }

    // Clear cache
    dataCache.clear('sheet_' + CONFIG.sheets.availability);
    
    logActivity(`Recurring availability set by ${currentUser.name}: ${data.dayOfWeek} ${data.startTime}-${data.endTime} (${addedCount} dates)`);
    
    return { 
      success: true, 
      message: `Recurring availability set for ${addedCount} ${data.dayOfWeek}s` 
    };

  } catch (error) {
    console.error('Error saving recurring availability:', error);
    logError('Error in saveRecurringAvailability', error);
    return { success: false, error: 'Failed to save recurring availability' };
  }
}

/**
 * Deletes rider availability entry
 * @param {string} id Availability entry ID
 * @return {object} Success/error result
 */
function deleteRiderAvailability(id) {
  try {
    console.log('Deleting availability:', id);
    
    if (!id || !id.startsWith('avail_')) {
      return { success: false, error: 'Invalid availability ID' };
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.availability);
    const rowIndex = parseInt(id.replace('avail_', ''));
    const sheetRowNumber = rowIndex + 2; // Account for header row

    // Verify this is the user's availability entry
    const emailCell = sheet.getRange(sheetRowNumber, 1).getValue();
    if (emailCell !== currentUser.email && currentUser.role !== 'admin') {
      return { success: false, error: 'You can only delete your own availability' };
    }

    // Delete the row
    sheet.deleteRow(sheetRowNumber);
    
    // Clear cache
    dataCache.clear('sheet_' + CONFIG.sheets.availability);
    
    logActivity(`Availability deleted by ${currentUser.name}`);
    
    return { success: true, message: 'Availability deleted successfully' };

  } catch (error) {
    console.error('Error deleting availability:', error);
    logError('Error in deleteRiderAvailability', error);
    return { success: false, error: 'Failed to delete availability' };
  }
}

/**
 * Checks rider availability for assignment purposes
 * @param {string} riderId Rider ID
 * @param {Date} date Assignment date
 * @param {string} startTime Assignment start time
 * @param {string} endTime Assignment end time
 * @return {object} Availability status and details
 */
function checkRiderAvailabilityForAssignment(riderId, date, startTime, endTime) {
  try {
    console.log(`Checking availability for rider ${riderId} on ${date}`);
    
    // Get rider email from ID
    const riderEmail = getRiderEmailFromId(riderId);
    if (!riderEmail) {
      return { 
        available: false, 
        reason: 'Rider not found',
        conflicts: []
      };
    }

    // Get rider's availability for the date
    const availability = getUserAvailabilityForCalendar(riderEmail);
    const assignmentDate = new Date(date);
    const assignmentStart = combineDateAndTime(assignmentDate, startTime);
    const assignmentEnd = combineDateAndTime(assignmentDate, endTime);

    const conflicts = [];
    let hasAvailableTime = false;

    for (let event of availability) {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      // Check if dates match
      if (isSameDay(eventStart, assignmentDate)) {
        if (event.status === 'available') {
          // Check if assignment time falls within available time
          if (assignmentStart >= eventStart && assignmentEnd <= eventEnd) {
            hasAvailableTime = true;
          }
        } else if (event.status === 'unavailable' || event.status === 'busy') {
          // Check for time conflicts
          if (timesOverlap(assignmentStart, assignmentEnd, eventStart, eventEnd)) {
            conflicts.push({
              type: event.status,
              start: event.start,
              end: event.end,
              notes: event.notes
            });
          }
        }
      }
    }

    // Also check for existing assignments
    const existingAssignments = getRiderAssignmentsForDate(riderId, assignmentDate);
    for (let assignment of existingAssignments) {
      const assignStart = getColumnValue(assignment, {}, 'Start Time');
      const assignEnd = getColumnValue(assignment, {}, 'End Time');
      
      if (assignStart && assignEnd) {
        const existingStart = combineDateAndTime(assignmentDate, assignStart);
        const existingEnd = combineDateAndTime(assignmentDate, assignEnd);
        
        if (timesOverlap(assignmentStart, assignmentEnd, existingStart, existingEnd)) {
          conflicts.push({
            type: 'assignment',
            start: existingStart.toISOString(),
            end: existingEnd.toISOString(),
            notes: 'Existing assignment'
          });
        }
      }
    }

    const available = hasAvailableTime && conflicts.length === 0;
    
    return {
      available: available,
      reason: available ? 'Available' : (conflicts.length > 0 ? 'Time conflict' : 'No availability set'),
      conflicts: conflicts,
      hasAvailableTime: hasAvailableTime
    };

  } catch (error) {
    console.error('Error checking rider availability:', error);
    logError('Error in checkRiderAvailabilityForAssignment', error);
    return { 
      available: false, 
      reason: 'Error checking availability',
      conflicts: []
    };
  }
}

/**
 * Gets available riders for a specific time slot
 * @param {Date} date Assignment date
 * @param {string} startTime Start time
 * @param {string} endTime End time
 * @param {number} ridersNeeded Number of riders needed
 * @return {Array} Array of available riders sorted by suitability
 */
function getAvailableRidersForTimeSlot(date, startTime, endTime, ridersNeeded) {
  try {
    console.log(`Finding available riders for ${date} ${startTime}-${endTime}`);
    
    const ridersData = getRidersData();
    const availableRiders = [];

    for (let row of ridersData.data) {
      const name = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.name);
      const riderId = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.jpNumber);
      const status = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.status);
      const partTime = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.partTime);

      if (name && riderId && (status === 'Active' || !status)) {
        const availability = checkRiderAvailabilityForAssignment(riderId, date, startTime, endTime);
        
        if (availability.available) {
          availableRiders.push({
            riderId: riderId,
            name: name,
            partTime: partTime === 'Yes',
            availability: availability,
            priority: calculateRiderPriority(riderId, partTime)
          });
        }
      }
    }

    // Sort by priority (full-time riders first, then by other factors)
    availableRiders.sort((a, b) => b.priority - a.priority);

    console.log(`Found ${availableRiders.length} available riders`);
    return availableRiders.slice(0, ridersNeeded * 2); // Return extra for alternatives

  } catch (error) {
    console.error('Error getting available riders:', error);
    logError('Error in getAvailableRidersForTimeSlot', error);
    return [];
  }
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Ensures the availability sheet exists with proper headers
 * FIXED VERSION - Prevents duplicate column creation
 */
function ensureAvailabilitySheet() {
  const sheetName = CONFIG.sheets.availability;
  const expectedHeaders = Object.values(CONFIG.columns.availability);
  
  console.log(`🔍 Safely ensuring ${sheetName} sheet with proper headers...`);
  
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  
  if (!sheet) {
    // Create new sheet with headers
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    
    // Format and protect headers
    const headerRange = sheet.getRange(1, 1, 1, expectedHeaders.length);
    headerRange.setFontWeight('bold')
              .setBackground('#f3f3f3')
              .setBorder(true, true, true, true, false, false);
    sheet.setFrozenRows(1);
    
    console.log(`✅ Created ${sheetName} with ${expectedHeaders.length} headers`);
    return sheet;
  }
  
  // Validate existing sheet headers
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    // Empty sheet - add headers
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    console.log(`✅ Added headers to empty ${sheetName} sheet`);
    return sheet;
  }
  
  const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  
  // Check for duplicates first and fix if found
  const seenHeaders = new Set();
  const hasDuplicates = currentHeaders.some(header => {
    const normalized = String(header).trim().toLowerCase();
    if (seenHeaders.has(normalized)) {
      return true;
    }
    seenHeaders.add(normalized);
    return false;
  });
  
  if (hasDuplicates) {
    console.log(`⚠️ Found duplicate headers in ${sheetName}, fixing...`);
    // Remove duplicates by keeping only first occurrence
    const uniqueHeaders = [];
    const seen = new Set();
    currentHeaders.forEach(header => {
      const normalized = String(header).trim().toLowerCase();
      if (!seen.has(normalized) && header.trim() !== '') {
        seen.add(normalized);
        uniqueHeaders.push(header);
      }
    });
    
    // Backup data before fixing
    const allData = sheet.getDataRange().getValues();
    const dataRows = allData.slice(1);
    
    // Clear and rewrite with unique headers
    sheet.clear();
    sheet.getRange(1, 1, 1, uniqueHeaders.length).setValues([uniqueHeaders]);
    
    // Restore data (truncated to unique header count)
    if (dataRows.length > 0) {
      const cleanData = dataRows.map(row => row.slice(0, uniqueHeaders.length));
      sheet.getRange(2, 1, cleanData.length, uniqueHeaders.length).setValues(cleanData);
    }
  }
  
  // Check if we have all expected headers (without creating duplicates)
  const finalHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const missingHeaders = expectedHeaders.filter(header => 
    !finalHeaders.some(current => 
      String(current).trim().toLowerCase() === String(header).trim().toLowerCase()
    )
  );
  
  if (missingHeaders.length > 0) {
    console.log(`📝 Adding ${missingHeaders.length} missing headers to ${sheetName}`);
    
    // Only add truly missing headers to the end
    const newHeaders = [...finalHeaders, ...missingHeaders];
    sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
  }
  
  return sheet;
}

/**
 * Combines date and time strings into a Date object
 * @param {Date} date Date object
 * @param {string} timeString Time string (HH:MM)
 * @return {Date} Combined DateTime
 */
function combineDateAndTime(date, timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Gets appropriate event title based on status
 * @param {string} status Availability status
 * @param {string} notes Additional notes
 * @return {string} Event title
 */
function getEventTitle(status, notes) {
  if (notes && notes.trim().length > 0 && !notes.toLowerCase().includes(status)) {
    return notes.trim();
  }
  
  switch (status) {
    case 'available': return '✅ Available';
    case 'unavailable': return '❌ Unavailable';
    case 'busy': return '🔄 Busy/Assigned';
    default: return 'Availability';
  }
}

/**
 * Generates notes string based on status and user notes
 * @param {string} status Availability status
 * @param {string} userNotes User-provided notes
 * @return {string} Combined notes
 */
function generateAvailabilityNotes(status, userNotes) {
  const statusText = status || 'available';
  const notes = userNotes || '';
  
  if (notes.trim().length > 0) {
    return `${statusText}: ${notes}`;
  }
  
  return statusText;
}

/**
 * Gets rider ID from user information
 * @param {string} email User email
 * @return {string} Rider ID or email if not found
 */
function getUserRiderId(email) {
  try {
    const ridersData = getRidersData();
    const emailCol = CONFIG.columns.riders.email;
    const idCol = CONFIG.columns.riders.jpNumber;
    
    for (let row of ridersData.data) {
      const riderEmail = getColumnValue(row, ridersData.columnMap, emailCol);
      if (riderEmail && riderEmail.toLowerCase() === email.toLowerCase()) {
        return getColumnValue(row, ridersData.columnMap, idCol) || email;
      }
    }
    
    return email; // Fallback to email
  } catch (error) {
    console.error('Error getting rider ID:', error);
    return email;
  }
}

/**
 * Gets rider email from rider ID
 * @param {string} riderId Rider ID
 * @return {string} Rider email or null
 */
function getRiderEmailFromId(riderId) {
  try {
    const ridersData = getRidersData();
    const emailCol = CONFIG.columns.riders.email;
    const idCol = CONFIG.columns.riders.jpNumber;
    const nameCol = CONFIG.columns.riders.name;

    const normalize = (v) => String(v == null ? '' : v).trim().toLowerCase();
    const targetId = normalize(riderId);

    // First pass: match by Rider ID (case-insensitive, trimmed)
    for (let row of ridersData.data) {
      const riderIdInRow = getColumnValue(row, ridersData.columnMap, idCol);
      if (normalize(riderIdInRow) === targetId) {
        // Prefer primary email, but fall back to 'Google Email' or other variants if available
        const primary = getColumnValue(row, ridersData.columnMap, emailCol);
        const googleEmail = getColumnValue(row, ridersData.columnMap, 'Google Email');
        const email = primary || googleEmail;
        return email || null;
      }
    }

    // Fallback: if an ID match is not found, try matching by rider name
    for (let row of ridersData.data) {
      const riderNameInRow = getColumnValue(row, ridersData.columnMap, nameCol);
      if (normalize(riderNameInRow) === targetId) {
        const primary = getColumnValue(row, ridersData.columnMap, emailCol);
        const googleEmail = getColumnValue(row, ridersData.columnMap, 'Google Email');
        const email = primary || googleEmail;
        return email || null;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting rider email:', error);
    return null;
  }
}

/**
 * Calculates today's availability status for a rider
 * @param {Array} availability Rider's availability events
 * @param {Date} today Today's date
 * @return {object} Status and hours information
 */
function calculateTodayStatus(availability, today) {
  let totalHours = 0;
  let availableHours = 0;
  let hasUnavailable = false;
  
  for (let event of availability) {
    const eventDate = new Date(event.start);
    
    if (isSameDay(eventDate, today)) {
      const duration = (new Date(event.end) - new Date(event.start)) / (1000 * 60 * 60); // hours
      totalHours += duration;
      
      if (event.status === 'available') {
        availableHours += duration;
      } else if (event.status === 'unavailable') {
        hasUnavailable = true;
      }
    }
  }
  
  let status = 'unknown';
  if (availableHours > 0 && !hasUnavailable) {
    status = 'available';
  } else if (availableHours > 0 && hasUnavailable) {
    status = 'busy';
  } else if (hasUnavailable) {
    status = 'unavailable';
  }
  
  return {
    status: status,
    hours: totalHours > 0 ? `${availableHours}/${totalHours}h` : null
  };
}

/**
 * Generates array of dates for recurring pattern
 * @param {string} dayOfWeek Day name (monday, tuesday, etc.)
 * @param {string} untilDate End date string
 * @return {Array} Array of Date objects
 */
function generateRecurringDates(dayOfWeek, untilDate) {
  const dates = [];
  const dayMap = {
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6
  };
  
  const targetDay = dayMap[dayOfWeek.toLowerCase()];
  const endDate = new Date(untilDate);
  let currentDate = new Date();
  
  // Find next occurrence of the target day
  while (currentDate.getDay() !== targetDay) {
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Generate dates until end date
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 7); // Next week
  }
  
  return dates;
}

/**
 * Checks if availability already exists for a specific date/time
 * @param {string} email User email
 * @param {Date} date Date to check
 * @param {string} startTime Start time
 * @return {boolean} True if availability exists
 */
function availabilityExistsForDateTime(email, date, startTime) {
  try {
    const sheetData = getSheetData(CONFIG.sheets.availability, false);
    if (!sheetData || !sheetData.data) return false;

    const emailCol = CONFIG.columns.availability.email;
    const dateCol = CONFIG.columns.availability.date;
    const startCol = CONFIG.columns.availability.startTime;

    for (let row of sheetData.data) {
      const rowEmail = getColumnValue(row, sheetData.columnMap, emailCol);
      const rowDate = getColumnValue(row, sheetData.columnMap, dateCol);
      const rowStart = getColumnValue(row, sheetData.columnMap, startCol);
      
      if (rowEmail === email && 
          isSameDay(new Date(rowDate), date) && 
          rowStart === startTime) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking existing availability:', error);
    return false;
  }
}

/**
 * Checks if two dates are the same day
 * @param {Date} date1 First date
 * @param {Date} date2 Second date
 * @return {boolean} True if same day
 */
function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * Checks if two time ranges overlap
 * @param {Date} start1 First range start
 * @param {Date} end1 First range end
 * @param {Date} start2 Second range start
 * @param {Date} end2 Second range end
 * @return {boolean} True if times overlap
 */
function timesOverlap(start1, end1, start2, end2) {
  return start1 < end2 && end1 > start2;
}

/**
 * Calculates priority score for rider assignment
 * @param {string} riderId Rider ID
 * @param {string} partTime Whether rider is part-time
 * @return {number} Priority score (higher = better)
 */
function calculateRiderPriority(riderId, partTime) {
  let priority = 100; // Base priority
  
  // Full-time riders get higher priority
  if (partTime !== 'Yes') {
    priority += 50;
  }
  
  // Could add other factors like:
  // - Recent assignment count
  // - Rider rating
  // - Availability frequency
  
  return priority;
}

/**
 * Formats time for display
 * @param {string|Date} time Time value
 * @return {string} Formatted time string
 */
function formatTimeForDisplay(time) {
  if (!time) return '';
  
  if (typeof time === 'string') {
    return time;
  }
  
  if (time instanceof Date) {
    return time.toTimeString().slice(0, 5);
  }
  
  return String(time);
}

/**
 * Formats date for display
 * @param {Date} date Date object
 * @return {string} Formatted date string
 */
function formatDateForDisplay(date) {
  if (!date || !(date instanceof Date)) return '';
  
  return date.toLocaleDateString();
}

/**
 * Mobile view function for getting rider assignments and availability
 * Enhanced version of the existing mobile function
 */
function getPageDataForMobileRiderView(filter = 'All') {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get user's assignments
    const assignments = getMobileAssignmentsForRider();
    
    // Get user's availability for the mobile calendar
    const availability = getUserAvailabilityForCalendar(user.email);
    
    // Get filtered requests (for context)
    const requests = getFilteredRequests(user, { status: filter });
    
    return {
      success: true,
      user: user,
      assignments: assignments,
      availability: availability,
      requests: requests,
      canManageAvailability: true
    };

  } catch (error) {
    console.error('Error in getPageDataForMobileRiderView:', error);
    logError('Error in getPageDataForMobileRiderView', error);
    return { success: false, error: 'Failed to load mobile data' };
  }
}
/**
 * Simplified version - returns just riders list without availability data
 * REPLACE getAllRidersWithAvailability in AvailabilityService.gs
 */
function getAllRidersWithAvailability() {
  try {
    console.log('Getting all riders for calendar...');
    
    // Get current user and verify admin/dispatcher access
    const currentUserResponse = getCurrentUser();
    
    // Handle both nested and direct user object structures
    let currentUser;
    if (currentUserResponse && currentUserResponse.user) {
      currentUser = currentUserResponse.user;
    } else {
      currentUser = currentUserResponse;
    }
    
    if (!currentUser) {
      console.log('No current user');
      return { success: false, error: 'User not authenticated' };
    }
    
    console.log('User role:', currentUser.role);
    
    if (currentUser.role !== 'admin' && currentUser.role !== 'dispatcher') {
      console.log('Access denied for role:', currentUser.role);
      return { success: false, error: 'Access denied. Admin or dispatcher role required.' };
    }

    console.log('User authorized, fetching riders...');

    // Get all active riders
    const ridersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.riders);
    if (!ridersSheet) {
      console.log('Riders sheet not found');
      return { success: false, error: 'Riders sheet not found' };
    }

    const ridersData = ridersSheet.getDataRange().getValues();
    
    if (ridersData.length <= 1) {
      console.log('No riders in sheet');
      return { success: true, riders: [] };
    }
    
    const headers = ridersData[0];
    
    // Find column indices
    const nameCol = headers.indexOf(CONFIG.columns.riders.name);
    const emailCol = headers.indexOf(CONFIG.columns.riders.email);
    const jpCol = headers.indexOf(CONFIG.columns.riders.jpNumber);
    const statusCol = headers.indexOf(CONFIG.columns.riders.status);
    
    console.log('Columns:', { nameCol, emailCol, jpCol, statusCol });
    
    // Build riders array (simplified - no availability data)
    const riders = [];
    for (let i = 1; i < ridersData.length; i++) {
      const row = ridersData[i];
      
      const name = nameCol >= 0 ? row[nameCol] : null;
      const email = emailCol >= 0 ? row[emailCol] : null;
      const jpNumber = jpCol >= 0 ? row[jpCol] : null;
      const status = statusCol >= 0 ? row[statusCol] : 'Active';
      
      // Only include active riders with name and email
      if (name && email && (status === 'Active' || !status)) {
        riders.push({
          email: String(email).trim(),
          name: String(name).trim(),
          jpNumber: jpNumber ? String(jpNumber).trim() : 'N/A'
        });
      }
    }

    console.log(`Returning ${riders.length} active riders`);

    // Return simplified response (no availability data for now)
    return {
      success: true,
      riders: riders
    };

  } catch (error) {
    console.error('Error in getAllRidersWithAvailability:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Helper function to format date for client
 */
function formatDateForClient(date) {
  if (!date || !(date instanceof Date)) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
function testGetAllRidersWithAvailability() {
  console.log('🧪 === TESTING getAllRidersWithAvailability ===\n');
  
  try {
    // Call the function directly
    const result = getAllRidersWithAvailability();
    
    console.log('📊 Result type:', typeof result);
    console.log('📊 Result is null?', result === null);
    console.log('📊 Result is undefined?', result === undefined);
    
    if (result) {
      console.log('✅ Function returned a result');
      console.log('   Success:', result.success);
      
      if (result.success) {
        console.log('   Riders count:', result.riders ? result.riders.length : 0);
        
        if (result.riders && result.riders.length > 0) {
          console.log('\n👥 First 3 riders:');
          result.riders.slice(0, 3).forEach((rider, i) => {
            console.log(`   ${i + 1}. ${rider.name} (${rider.email}) - ${rider.jpNumber}`);
          });
        }
      } else {
        console.log('❌ Function returned success: false');
        console.log('   Error:', result.error);
      }
      
      console.log('\n📦 Full result:');
      console.log(JSON.stringify(result, null, 2));
      
    } else {
      console.log('❌ Function returned null or undefined!');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error testing function:', error.message);
    console.error('Stack:', error.stack);
    return null;
  }
}

/**
 * Test if the function is accessible from the web app
 */
function testGetAllRidersAsWebApp() {
  console.log('🌐 === TESTING as Web App Call ===\n');
  
  try {
    // Simulate how the web app calls it
    const result = getAllRidersWithAvailability();
    
    // Try to convert to JSON (this is what happens when returning to client)
    const jsonString = JSON.stringify(result);
    console.log('✅ Can convert to JSON');
    console.log('JSON length:', jsonString.length);
    
    // Parse it back
    const parsed = JSON.parse(jsonString);
    console.log('✅ Can parse back from JSON');
    console.log('Parsed riders count:', parsed.riders ? parsed.riders.length : 0);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error in web app simulation:', error.message);
    return null;
  }
}

/**
 * Helper function to format date for client
 */
function formatDateForClient(date) {
  if (!date || !(date instanceof Date)) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get availability for a specific rider (admin function)
 * @param {string} riderEmail Email of the rider
 * @return {object} Availability data for the rider
 */
function getRiderAvailabilityByEmail(riderEmail) {
  try {
    console.log('Getting availability for rider:', riderEmail);
    
    // Verify admin/dispatcher access
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }
    
    if (currentUser.role !== 'admin' && currentUser.role !== 'dispatcher') {
      return { success: false, error: 'Access denied' };
    }

    // Get availability sheet
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.availability);
    if (!sheet) {
      return { success: false, error: 'Availability sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const availability = [];

    // Process rows (skip header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const email = row[0];
      
      if (email === riderEmail) {
        const date = row[1];
        const startTime = row[2];
        const endTime = row[3];
        const status = row[4];
        const notes = row[5];
        
        if (date) {
          const dateObj = new Date(date);
          availability.push({
            date: formatDateForClient(dateObj),
            startTime: startTime || null,
            endTime: endTime || null,
            status: status || 'available',
            notes: notes || ''
          });
        }
      }
    }

    return {
      success: true,
      availability: availability
    };

  } catch (error) {
    console.error('Error getting rider availability:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get availability summary for all riders on a specific date
 * @param {string} dateStr Date in YYYY-MM-DD format
 * @return {object} Summary of rider availability for the date
 */
function getAvailabilitySummaryForDate(dateStr) {
  try {
    console.log('Getting availability summary for date:', dateStr);
    
    // Verify admin/dispatcher access
    const currentUser = getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'dispatcher')) {
      return { success: false, error: 'Access denied' };
    }

    const result = getAllRidersWithAvailability();
    if (!result.success) {
      return result;
    }

    const summary = {
      date: dateStr,
      available: [],
      unavailable: [],
      noStatus: []
    };

    result.riders.forEach(rider => {
      const riderAvail = result.availability[rider.email];
      
      if (riderAvail && riderAvail[dateStr]) {
        const status = riderAvail[dateStr].status;
        if (status === 'available') {
          summary.available.push({
            name: rider.name,
            email: rider.email,
            jpNumber: rider.jpNumber,
            times: riderAvail[dateStr].startTime && riderAvail[dateStr].endTime
              ? `${riderAvail[dateStr].startTime} - ${riderAvail[dateStr].endTime}`
              : 'All day'
          });
        } else if (status === 'unavailable') {
          summary.unavailable.push({
            name: rider.name,
            email: rider.email,
            jpNumber: rider.jpNumber,
            reason: riderAvail[dateStr].notes || 'No reason specified'
          });
        }
      } else {
        summary.noStatus.push({
          name: rider.name,
          email: rider.email,
          jpNumber: rider.jpNumber
        });
      }
    });

    return {
      success: true,
      summary: summary
    };

  } catch (error) {
    console.error('Error getting availability summary:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Helper function to format date for client
 * @param {Date} date Date object
 * @return {string} Formatted date string YYYY-MM-DD
 */
function formatDateForClient(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper function to get column value safely
 * @param {Array} row Data row
 * @param {object} dataObj Data object with headers
 * @param {string} columnName Column name to get
 * @return {any} Column value
 */
function getColumnValue(row, dataObj, columnName) {
  try {
    const headers = dataObj.headers || dataObj.columnMap?.headers || [];
    const index = headers.indexOf(columnName);
    return index >= 0 ? row[index] : null;
  } catch (error) {
    console.error('Error getting column value:', error);
    return null;
  }
}
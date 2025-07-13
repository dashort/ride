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
      // Try to find rider ID from riders sheet
      const ridersData = getRidersData();
      const emailCol = CONFIG.columns.riders.email;
      const idCol = CONFIG.columns.riders.jpNumber;
      
      for (let row of ridersData.data) {
        const riderEmail = getColumnValue(row, ridersData.columnMap, emailCol);
        if (riderEmail && riderEmail.toLowerCase() === user.email.toLowerCase()) {
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
 * Gets availability data for a specific user's calendar
 * @param {string} email User email
 * @return {Array} Array of calendar events
 */
function getUserAvailabilityForCalendar(email) {
  try {
    console.log(`Getting availability for user: ${email}`);
    
    // Ensure availability sheet exists
    ensureAvailabilitySheet();
    
    const sheetData = getSheetData(CONFIG.sheets.availability, false);
    if (!sheetData || !sheetData.data) {
      return [];
    }

    const events = [];
    const emailCol = CONFIG.columns.availability.email;
    const dateCol = CONFIG.columns.availability.date;
    const startCol = CONFIG.columns.availability.startTime;
    const endCol = CONFIG.columns.availability.endTime;
    const notesCol = CONFIG.columns.availability.notes;

    for (let i = 0; i < sheetData.data.length; i++) {
      const row = sheetData.data[i];
      const rowEmail = getColumnValue(row, sheetData.columnMap, emailCol);
      
      if (rowEmail && rowEmail.toLowerCase() === email.toLowerCase()) {
        const date = getColumnValue(row, sheetData.columnMap, dateCol);
        const startTime = getColumnValue(row, sheetData.columnMap, startCol);
        const endTime = getColumnValue(row, sheetData.columnMap, endCol);
        const notes = getColumnValue(row, sheetData.columnMap, notesCol) || '';

        if (date && startTime && endTime) {
          const eventDate = new Date(date);
          const startDateTime = combineDateAndTime(eventDate, startTime);
          const endDateTime = combineDateAndTime(eventDate, endTime);

          // Determine status from notes or default to available
          let status = 'available';
          if (notes.toLowerCase().includes('unavailable') || notes.toLowerCase().includes('busy')) {
            status = 'unavailable';
          } else if (notes.toLowerCase().includes('assigned') || notes.toLowerCase().includes('escort')) {
            status = 'busy';
          }

          events.push({
            id: `avail_${i}`,
            title: getEventTitle(status, notes),
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString(),
            status: status,
            notes: notes,
            riderId: getUserRiderId(email)
          });
        }
      }
    }

    console.log(`Found ${events.length} availability events for ${email}`);
    return events;

  } catch (error) {
    console.error('Error getting user availability:', error);
    logError('Error in getUserAvailabilityForCalendar', error);
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
 * @param {object} data Availability data object
 * @return {object} Success/error result
 */
function saveRiderAvailabilityData(data) {
  try {
    console.log('Saving rider availability:', data);
    
    // Validate required fields
    if (!data.date || !data.startTime || !data.endTime) {
      return { success: false, error: 'Missing required fields' };
    }

    // Get current user
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    // Ensure availability sheet exists
    ensureAvailabilitySheet();
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.availability);
    const sheetData = getSheetData(CONFIG.sheets.availability, false);

    // Determine rider ID
    const riderId = data.riderId || currentUser.riderId || getUserRiderId(currentUser.email);

    // Prepare row data
    const rowData = [
      currentUser.email,
      new Date(data.date),
      data.startTime,
      data.endTime,
      generateAvailabilityNotes(data.status, data.notes),
      riderId
    ];

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
      console.log('Added new availability row');
    }

    // Clear cache
    dataCache.clear('sheet_' + CONFIG.sheets.availability);
    
    logActivity(`Availability ${data.status} set by ${currentUser.name} for ${data.date} ${data.startTime}-${data.endTime}`);
    
    return { 
      success: true, 
      message: `Availability ${data.status === 'available' ? 'added' : 'updated'} successfully` 
    };

  } catch (error) {
    console.error('Error saving rider availability:', error);
    logError('Error in saveRiderAvailabilityData', error);
    return { success: false, error: 'Failed to save availability' };
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
    
    // Look for existing entry for this user and date
    let existingRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] === availabilityData.email && row[1] === availabilityData.date) {
        existingRowIndex = i + 1; // Convert to 1-based index for sheet operations
        break;
      }
    }
    
    if (existingRowIndex > 0) {
      // UPDATE EXISTING ROW - This is where we modify the sheet
      sheet.getRange(existingRowIndex, 3).setValue(availabilityData.startTime);  // Start Time
      sheet.getRange(existingRowIndex, 4).setValue(availabilityData.endTime);    // End Time
      sheet.getRange(existingRowIndex, 5).setValue(availabilityData.status);     // Status
      sheet.getRange(existingRowIndex, 6).setValue(availabilityData.notes || ''); // Notes
      sheet.getRange(existingRowIndex, 8).setValue(timestamp);                   // Updated
      sheet.getRange(existingRowIndex, 9).setValue(availabilityData.riderId || getUserRiderId(availabilityData.email)); // Rider ID
      
      console.log('SHEET UPDATED: Row ' + existingRowIndex + ' modified');
      
    } else {
      // ADD NEW ROW - This is where we add to the sheet
      const newRow = [
        availabilityData.email,
        availabilityData.date,
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
 */
function ensureAvailabilitySheet() {
  const sheetName = CONFIG.sheets.availability;
  const headers = Object.values(CONFIG.columns.availability);

  const sheet = getOrCreateSheet(sheetName, headers);

  // If sheet already existed, ensure it has all headers
  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (currentHeaders.length < headers.length) {
    sheet.insertColumnsAfter(currentHeaders.length, headers.length - currentHeaders.length);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
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
    
    for (let row of ridersData.data) {
      const riderIdInRow = getColumnValue(row, ridersData.columnMap, idCol);
      if (riderIdInRow === riderId) {
        return getColumnValue(row, ridersData.columnMap, emailCol);
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
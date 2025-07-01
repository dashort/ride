/**
 * @fileoverview This file contains functions for Creating, Reading, Updating, and Deleting (CRUD)
 * escort requests. These functions will interact with the Google Sheet that serves as the database.
 */

/**
 * Creates a new escort request in the spreadsheet.
 *
 * @param {object} requestData An object containing all the necessary data for a new request.
 *                             Expected properties: requesterName, requesterContact,
 *                             eventDate, startTime, endTime,
 *                             startLocation, endLocation, secondaryLocation (optional),
 *                             requestType, ridersNeeded, notes (optional).
 * @param {string} [submittedBy=Session.getActiveUser().getEmail()] The email of the user submitting the request.
 * @return {object} An object indicating success or failure, and including the new request ID or an error message.
 *                  { success: true, requestId: "R0001", message: "Request created successfully." }
 *                  { success: false, message: "Error details..." }
 */
function createNewRequest(requestData, submittedBy = Session.getActiveUser().getEmail()) {
  try {
    console.log(`🚀 Starting new request creation by ${submittedBy} with data:`, JSON.stringify(requestData).substring(0, 200) + "...");

    const requestsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.requests);
    if (!requestsSheet) {
      throw new Error(`Sheet "${CONFIG.sheets.requests}" not found.`);
    }

    const headers = getSheetHeaders(requestsSheet); // From SheetUtils.js (expected in CoreUtils.gs)
    const columnMap = createHeaderMap(headers);     // From SheetUtils.js (expected in CoreUtils.gs)

    // --- Data Validation ---
    const requiredFields = [
      'requesterName', 'requesterContact',
      'eventDate', 'startTime', 'startLocation', 'endLocation',
      'requestType', 'ridersNeeded'
    ];
    for (const field of requiredFields) {
      if (!requestData[field] && requestData[field] !== 0) { // Allow 0 for ridersNeeded if it makes sense
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (isNaN(parseInt(requestData.ridersNeeded)) || parseInt(requestData.ridersNeeded) <= 0) {
        throw new Error(`Invalid number of riders needed: ${requestData.ridersNeeded}. Must be a positive number.`);
    }

    // --- ID Generation ---
    let newRequestId;
    if (typeof generateUniqueId === "function") { // generateUniqueId from CoreUtils.gs
        newRequestId = generateUniqueId(CONFIG.requestIdPrefix, requestsSheet, columnMap[CONFIG.columns.requests.id]);
    } else {
        console.warn("generateUniqueId function not found. Using fallback ID generation for RequestCRUD.");
        newRequestId = generateRequestIdFallback_RequestCRUD(requestsSheet, columnMap[CONFIG.columns.requests.id]);
    }
    console.log(`🔑 Generated Request ID: ${newRequestId}`);


    // --- Row Preparation ---
    const newRow = [];
    // Order matters: must match sheet column order if directly setting values.
    // Using headers for robust mapping is better.
    for (const header of headers) {
        let value = ''; // Default to empty string
        switch (header) {
            case CONFIG.columns.requests.id:                  value = newRequestId; break;
            case CONFIG.columns.requests.submissionTimestamp: value = new Date(); break;
            case CONFIG.columns.requests.submittedBy:         value = submittedBy; break;
            case CONFIG.columns.requests.requesterName:       value = requestData.requesterName; break;
            case CONFIG.columns.requests.requesterContact:    value = requestData.requesterContact; break;
            case CONFIG.columns.requests.eventDate:
                value = parseDateString(requestData.eventDate);
                break;
            case CONFIG.columns.requests.date:
                // Keep the legacy "Date" column in sync with Event Date if present
                value = parseDateString(requestData.eventDate);
                break;
            case CONFIG.columns.requests.startTime:           value = parseTimeString(requestData.startTime); break; // Ensure time object or formatted string
            case CONFIG.columns.requests.endTime:             value = requestData.endTime ? parseTimeString(requestData.endTime) : ''; break;
            case CONFIG.columns.requests.startLocation:       value = requestData.startLocation; break;
            case CONFIG.columns.requests.endLocation:         value = requestData.endLocation; break;
            case CONFIG.columns.requests.secondaryLocation:   value = requestData.secondaryLocation || ''; break;
            case CONFIG.columns.requests.type:                value = requestData.requestType; break; // Ensure 'type' matches CONFIG
            case CONFIG.columns.requests.ridersNeeded:        value = parseInt(requestData.ridersNeeded); break;
            case CONFIG.columns.requests.status:              value = CONFIG.requestStatus.new; break; // Default status
            case CONFIG.columns.requests.notes:               value = requestData.notes || ''; break;
            case CONFIG.columns.requests.assignedRiders:      value = ''; break; // Initially no riders assigned
            case CONFIG.columns.requests.lastModified:        value = new Date(); break;
            // Add cases for any other default or derived values from CONFIG
            default:
                // Check if requestData has a property that matches a CONFIG column key
                // This is a bit simplistic as requestData keys might not exactly match CONFIG keys
                // e.g. requestData.requestType vs CONFIG.columns.requests.type
                // A more robust mapping might be needed if keys differ significantly.
                const configKey = Object.keys(CONFIG.columns.requests).find(key => CONFIG.columns.requests[key] === header);
                if (configKey && requestData.hasOwnProperty(configKey)) {
                     value = requestData[configKey];
                } else {
                    // console.log(`No direct mapping for header "${header}" in createNewRequest. Will be blank.`);
                }
                break;
        }
        newRow.push(value);
    }

    console.log(`➕ Appending new row data (sample): ${newRow.slice(0, 5).join(', ')}...`);
    requestsSheet.appendRow(newRow);
    SpreadsheetApp.flush(); // Ensure changes are written

    console.log(`✅ Request ${newRequestId} created successfully by ${submittedBy}.`);
    logActivity(`New request ${newRequestId} created by ${submittedBy}. Data: ${JSON.stringify(requestData).substring(0,100)}...`); // From Logger.js (CoreUtils.gs)

    // Optional: Trigger notifications or other actions
    if (typeof sendNewRequestNotification === 'function') { // From NotificationService.js
        try {
            const createdRequestDetails = {}; // Construct this from newRow and headers for the notification
            headers.forEach((header, index) => createdRequestDetails[header] = newRow[index]);
            sendNewRequestNotification(createdRequestDetails);
        } catch (notifError) {
            logError(`Failed to send new request notification for ${newRequestId}`, notifError);
        }
    }


    // Sync to calendar if applicable
    if (typeof syncRequestToCalendar === 'function') {
      try {
        syncRequestToCalendar(newRequestId);
      } catch (syncError) {
        logError(`Failed to sync request ${newRequestId} to calendar`, syncError);
      }
    }

    return {
      success: true,
      requestId: newRequestId,
      message: "Request created successfully."
    };

  } catch (error) {
    console.error(`❌ Error in createNewRequest by ${submittedBy}:`, error.message, error.stack);
    logError(`Error in createNewRequest by ${submittedBy}. Data: ${JSON.stringify(requestData || {}).substring(0,100)}...`, error); // From Logger.js (CoreUtils.gs)
    return {
      success: false,
      message: `Failed to create request: ${error.message}`
    };
  }
}

/**
 * Fallback function to generate a unique request ID.
 * This is used if the primary `generateUniqueId` (expected in CoreUtils.gs) is not found.
 * It finds the last ID in the sheet and increments it.
 * Note: This fallback is less robust than a centralized utility function, especially under high concurrency.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The sheet to check for existing IDs.
 * @param {number} idColumnIndex The 0-based index of the ID column.
 * @return {string} A new, hopefully unique, request ID (e.g., "R0001").
 */
function generateRequestIdFallback_RequestCRUD(sheet, idColumnIndex) {
  const prefix = CONFIG.requestIdPrefix || "R";
  let nextIdNumber = 1;

  try {
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) { // More than just headers
      const idRange = sheet.getRange(2, idColumnIndex + 1, lastRow - 1, 1);
      const ids = idRange.getValues().map(row => row[0]);
      const numericIds = ids
        .filter(id => id && String(id).startsWith(prefix))
        .map(id => parseInt(String(id).substring(prefix.length)))
        .filter(num => !isNaN(num));

      if (numericIds.length > 0) {
        nextIdNumber = Math.max(...numericIds) + 1;
      }
    }
  } catch (e) {
    console.error("Error in fallback ID generation, starting from 1:", e);
    // Fallthrough to use default nextIdNumber = 1
  }

  return `${prefix}${String(nextIdNumber).padStart(CONFIG.requestIdPadding || 4, '0')}`;
}

/**
 * Parses a time string (e.g., "14:30" or "2:30 PM") and returns a Date object
 * with today's date but the specified time.
 * If the input is already a Date object, it's returned directly.
 * Returns null if parsing fails.
 *
 * @param {string|Date} timeInput The time string or Date object.
 * @return {Date|null} A Date object representing the parsed time, or null.
 */
function parseTimeString(timeInput) {
    if (timeInput instanceof Date) {
        return timeInput; // Already a Date object
    }

    // Handle numeric times from Sheets (fraction of a day)
    if (typeof timeInput === 'number' && !isNaN(timeInput)) {
        const base = new Date();
        base.setHours(0, 0, 0, 0);
        const ms = Math.round(timeInput * 24 * 60 * 60 * 1000);
        return new Date(base.getTime() + ms);
    }

    if (typeof timeInput !== 'string' || timeInput.trim() === '') {
        return null;
    }

    const now = new Date(); // Use current date as base
    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    const timeParts = timeInput.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);

    if (timeParts) {
        hours = parseInt(timeParts[1], 10);
        minutes = parseInt(timeParts[2], 10);
        seconds = timeParts[3] ? parseInt(timeParts[3], 10) : 0;
        const ampm = timeParts[4];

        if (ampm) {
            if (ampm.toLowerCase() === 'pm' && hours < 12) {
                hours += 12;
            } else if (ampm.toLowerCase() === 'am' && hours === 12) { // Midnight case
                hours = 0;
            }
        }
        // If no AM/PM, assume 24-hour format if hours > 12, otherwise assume AM.
    } else {
        // Try parsing "HHMMSS", "HHMM" or "HMM" if that's a possible input format
        if (timeInput.length === 6 && !isNaN(timeInput)) { // "143000"
            hours = parseInt(timeInput.substring(0,2), 10);
            minutes = parseInt(timeInput.substring(2,4), 10);
            seconds = parseInt(timeInput.substring(4,6), 10);
        } else if (timeInput.length === 4 && !isNaN(timeInput)) { // "1430"
            hours = parseInt(timeInput.substring(0,2), 10);
            minutes = parseInt(timeInput.substring(2,4), 10);
        } else if (timeInput.length === 3 && !isNaN(timeInput)) { // "930"
            hours = parseInt(timeInput.substring(0,1), 10);
            minutes = parseInt(timeInput.substring(1,3), 10);
        } else {
            console.warn(`Could not parse time string: "${timeInput}"`);
            return null; // Could not parse
        }
    }

    if (
        isNaN(hours) || isNaN(minutes) || isNaN(seconds) ||
        hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59
    ) {
        console.warn(`Invalid time components from string: "${timeInput}" (H:${hours}, M:${minutes}, S:${seconds})`);
        return null;
    }

    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, seconds);
}

/**
 * Parses a date string in YYYY-MM-DD format to a Date object in local timezone.
 * If the input is already a Date, it is returned as-is.
 * Returns null if parsing fails.
 *
 * @param {string|Date} dateInput The date string or Date object.
 * @return {Date|null} A Date object or null on failure.
 */
function parseDateString(dateInput) {
    if (dateInput instanceof Date) {
        return dateInput;
    }
    if (typeof dateInput !== 'string' || dateInput.trim() === '') {
        return null;
    }

    // Handle ISO format (YYYY-MM-DD) explicitly to avoid timezone shifts
    var isoMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
        var year = parseInt(isoMatch[1], 10);
        var month = parseInt(isoMatch[2], 10) - 1; // zero-based month
        var day = parseInt(isoMatch[3], 10);
        return new Date(year, month, day);
    }

    var parsed = new Date(dateInput);
    if (!isNaN(parsed.getTime())) {
        return parsed;
    }
    console.warn('Could not parse date string:', dateInput);
    return null;
}

/**
 * Updates an existing request in the 'Requests' sheet.
 * @param {object} requestData - An object containing the request data to update.
 * @return {object} An object indicating success or failure, with a message.
 */
/**
 * Updates an existing request in the 'Requests' sheet.
 * Enhanced version with better error handling and data validation.
 * @param {object} requestData - An object containing the request data to update.
 * @return {object} An object indicating success or failure, with a message.
 */
function updateExistingRequest(requestData) {
  try {
    console.log('📝 Starting updateExistingRequest with data:', JSON.stringify(requestData, null, 2));
    
    if (!requestData || !requestData.requestId) {
      throw new Error('Request ID is missing. Cannot update request.');
    }

    const requestsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.requests);
    if (!requestsSheet) {
      throw new Error(`Sheet "${CONFIG.sheets.requests}" not found.`);
    }

    // Use the existing getRequestsData function to get structured data
    const requestsData = getRequestsData(false); // Don't use cache for updates
    if (!requestsData || !requestsData.data || requestsData.data.length === 0) {
      throw new Error('No requests data found in sheet.');
    }

    const columnMap = requestsData.columnMap;
    const headers = requestsData.headers;
    const sheet = requestsData.sheet;

    // Find the request by ID
    let targetRowIndex = -1;
    for (let i = 0; i < requestsData.data.length; i++) {
      const rowRequestId = getColumnValue(requestsData.data[i], columnMap, CONFIG.columns.requests.id);
      if (String(rowRequestId).trim() === String(requestData.requestId).trim()) {
        targetRowIndex = i;
        break;
      }
    }

    if (targetRowIndex === -1) {
      throw new Error(`Request with ID "${requestData.requestId}" not found.`);
    }

    // Calculate actual sheet row number (data array index + 2 because of header row)
    const sheetRowNumber = targetRowIndex + 2;

    console.log(`✅ Found request at data index ${targetRowIndex}, sheet row ${sheetRowNumber}`);

    // Update individual cells rather than entire row to be more robust
    const updates = [];

    // Map form data to sheet columns with proper validation
    const fieldMappings = {
      requesterName: CONFIG.columns.requests.requesterName,
      requesterContact: CONFIG.columns.requests.requesterContact,
      requestType: CONFIG.columns.requests.type,
      eventDate: CONFIG.columns.requests.eventDate,
      date: CONFIG.columns.requests.date,
      startTime: CONFIG.columns.requests.startTime,
      endTime: CONFIG.columns.requests.endTime,
      startLocation: CONFIG.columns.requests.startLocation,
      endLocation: CONFIG.columns.requests.endLocation,
      secondaryEndLocation: CONFIG.columns.requests.secondaryLocation,
      ridersNeeded: CONFIG.columns.requests.ridersNeeded,
      status: CONFIG.columns.requests.status,
      courtesy: CONFIG.columns.requests.courtesy,
      specialRequirements: CONFIG.columns.requests.requirements,
      notes: CONFIG.columns.requests.notes
    };

    // Process each field mapping
    for (const [formField, configColumn] of Object.entries(fieldMappings)) {
      if (requestData.hasOwnProperty(formField) && columnMap.hasOwnProperty(configColumn)) {
        const columnIndex = columnMap[configColumn];
        let value = requestData[formField];

        // Handle special data types
        switch (configColumn) {
          case CONFIG.columns.requests.eventDate:
          case CONFIG.columns.requests.date:
            if (value) {
              value = parseDateString(value);
              if (!value) {
                console.warn(`Invalid date provided for ${formField}: ${requestData[formField]}`);
                continue; // Skip this update
              }
            }
            break;
            
          case CONFIG.columns.requests.startTime:
          case CONFIG.columns.requests.endTime:
            if (value) {
              value = parseTimeString(value);
              if (!value) {
                console.warn(`Invalid time provided for ${formField}: ${requestData[formField]}`);
                continue; // Skip this update
              }
            }
            break;
            
          case CONFIG.columns.requests.ridersNeeded:
            if (value !== undefined && value !== null) {
              value = parseInt(value);
              if (isNaN(value) || value <= 0) {
                throw new Error(`Invalid number of riders needed: ${requestData[formField]}`);
              }
            }
            break;
            
          case CONFIG.columns.requests.courtesy:
            // Ensure courtesy is 'Yes' or 'No'
            value = (value === true || value === 'Yes' || value === 'true') ? 'Yes' : 'No';
            break;
        }

        updates.push({
          column: columnIndex + 1, // Convert to 1-based
          value: value
        });
      }
    }

    // Always update the last modified timestamp
    if (columnMap.hasOwnProperty(CONFIG.columns.requests.lastUpdated)) {
      updates.push({
        column: columnMap[CONFIG.columns.requests.lastUpdated] + 1,
        value: new Date()
      });
    }

    console.log(`📝 Preparing to update ${updates.length} fields for request ${requestData.requestId}`);

    // Apply all updates
    for (const update of updates) {
      try {
        sheet.getRange(sheetRowNumber, update.column).setValue(update.value);
      } catch (cellError) {
        console.error(`Error updating column ${update.column}:`, cellError);
        // Continue with other updates rather than failing completely
      }
    }

    // Force spreadsheet to flush changes
    SpreadsheetApp.flush();

    // Clear cache to ensure fresh data on next load
    if (typeof clearRequestsCache === 'function') {
      clearRequestsCache();
    }

    // Check if request status was changed to "Completed" and record actual completion times
    if (requestData.status && requestData.status.toLowerCase() === 'completed') {
      try {
        console.log(`🕒 Request marked as completed - recording actual completion times for ${requestData.requestId}`);
        const completionResult = recordActualCompletionTimes(requestData.requestId);
        if (completionResult.success) {
          console.log(`✅ ${completionResult.message}`);
        } else {
          console.warn(`⚠️ ${completionResult.message}`);
        }
      } catch (completionError) {
        console.error(`❌ Error recording completion times for ${requestData.requestId}:`, completionError);
        // Don't fail the whole update if completion recording fails
      }
    }

    // Log the successful update
    logActivity(`Request updated: ${requestData.requestId} - Updated ${updates.length} fields`);
    
    console.log(`✅ Successfully updated request ${requestData.requestId}`);

    // Sync calendar if feature is available
    if (typeof syncRequestToCalendar === 'function') {
      try {
        syncRequestToCalendar(requestData.requestId);
      } catch (syncError) {
        logError(`Failed to sync request ${requestData.requestId} to calendar`, syncError);
      }
    }

    return {
      success: true,
      message: 'Request updated successfully.',
      requestId: requestData.requestId,
      updatedFields: updates.length
    };

  } catch (error) {
    console.error('❌ Error in updateExistingRequest:', error);
    logError('Error updating request', error);
    return { 
      success: false, 
      message: 'Error updating request: ' + error.message,
      requestId: requestData.requestId || 'unknown'
    };
  }
}

/**
 * Automatically records actual completion times for all assignments when a request is marked as completed
 * @param {string} requestId - The ID of the completed request
 * @return {Object} Result indicating success/failure and details
 */
function recordActualCompletionTimes(requestId) {
  try {
    console.log(`📋 Recording actual completion times for request ${requestId}...`);
    
    if (!requestId) {
      throw new Error('Request ID is required');
    }
    
    // Get all assignments for this request
    const assignmentsData = getAssignmentsData(false); // Don't use cache
    if (!assignmentsData || !assignmentsData.data || assignmentsData.data.length === 0) {
      throw new Error('No assignments data found');
    }
    
    const assignmentsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.assignments);
    if (!assignmentsSheet) {
      throw new Error('Assignments sheet not found');
    }
    
    const columnMap = assignmentsData.columnMap;
    const relatedAssignments = [];
    
    // Find all assignments for this request
    assignmentsData.data.forEach((assignment, index) => {
      const assignmentRequestId = getColumnValue(assignment, columnMap, CONFIG.columns.assignments.requestId);
      if (String(assignmentRequestId).trim() === String(requestId).trim()) {
        relatedAssignments.push({
          data: assignment,
          rowIndex: index + 2 // +2 because data array is 0-based and sheet is 1-based with header
        });
      }
    });
    
    if (relatedAssignments.length === 0) {
      return {
        success: false,
        message: `No assignments found for request ${requestId}`
      };
    }
    
    console.log(`Found ${relatedAssignments.length} assignments for request ${requestId}`);
    
    // Get the original request data to calculate duration
    const requestsData = getRequestsData(false);
    const request = requestsData.data.find(r => 
      getColumnValue(r, requestsData.columnMap, CONFIG.columns.requests.id) === requestId
    );
    
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }
    
    const requestType = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.type);
    const originalStartTime = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.startTime);
    const originalEndTime = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.endTime);
    
    // Calculate completion time and duration
    const completionTime = new Date();
    let actualDuration = calculateActualDuration(requestType, originalStartTime, originalEndTime);
    
    console.log(`Request type: ${requestType}, Calculated duration: ${actualDuration} hours`);
    
    // Update all related assignments
    const updateResults = [];
    
    for (const assignmentInfo of relatedAssignments) {
      try {
        const assignment = assignmentInfo.data;
        const rowIndex = assignmentInfo.rowIndex;
        const riderName = getColumnValue(assignment, columnMap, CONFIG.columns.assignments.riderName);
        
        // Calculate actual start and end times based on original request times
        let actualStartTime = originalStartTime;
        let actualEndTime = new Date(completionTime.getTime()); // Use current completion time as end
        
        // If we have original times, adjust the end time based on duration
        if (originalStartTime && parseTimeString(originalStartTime)) {
          const startTime = parseTimeString(originalStartTime);
          actualEndTime = new Date(startTime.getTime() + (actualDuration * 60 * 60 * 1000));
        }
        
        // Prepare updates for this assignment
        const updates = [];
        
        // Update status to Completed
        if (columnMap.hasOwnProperty(CONFIG.columns.assignments.status)) {
          const statusColumn = columnMap[CONFIG.columns.assignments.status] + 1;
          updates.push({ column: statusColumn, value: 'Completed' });
        }
        
        // Update completed date
        if (columnMap.hasOwnProperty(CONFIG.columns.assignments.completedDate)) {
          const completedDateColumn = columnMap[CONFIG.columns.assignments.completedDate] + 1;
          updates.push({ column: completedDateColumn, value: completionTime });
        }
        
        // Update actual start time
        if (columnMap.hasOwnProperty(CONFIG.columns.assignments.actualStartTime) && actualStartTime) {
          const actualStartColumn = columnMap[CONFIG.columns.assignments.actualStartTime] + 1;
          updates.push({ column: actualStartColumn, value: actualStartTime });
        }
        
        // Update actual end time
        if (columnMap.hasOwnProperty(CONFIG.columns.assignments.actualEndTime) && actualEndTime) {
          const actualEndColumn = columnMap[CONFIG.columns.assignments.actualEndTime] + 1;
          updates.push({ column: actualEndColumn, value: actualEndTime });
        }
        
        // Update actual duration
        if (columnMap.hasOwnProperty(CONFIG.columns.assignments.actualDuration)) {
          const actualDurationColumn = columnMap[CONFIG.columns.assignments.actualDuration] + 1;
          updates.push({ column: actualDurationColumn, value: actualDuration });
        }
        
        // Apply all updates for this assignment
        for (const update of updates) {
          try {
            assignmentsSheet.getRange(rowIndex, update.column).setValue(update.value);
          } catch (cellError) {
            console.error(`Error updating column ${update.column} for assignment:`, cellError);
          }
        }
        
        updateResults.push({
          rider: riderName,
          success: true,
          duration: actualDuration,
          updatedFields: updates.length
        });
        
        console.log(`✅ Updated assignment for ${riderName}: ${actualDuration} hours`);
        
      } catch (assignmentError) {
        console.error(`Error updating assignment at row ${assignmentInfo.rowIndex}:`, assignmentError);
        updateResults.push({
          rider: 'Unknown',
          success: false,
          error: assignmentError.message
        });
      }
    }
    
    // Flush all changes
    SpreadsheetApp.flush();
    
    // Clear assignments cache
    if (typeof clearDataCache === 'function') {
      clearDataCache();
    }
    
    const successCount = updateResults.filter(r => r.success).length;
    const failCount = updateResults.filter(r => !r.success).length;
    
    return {
      success: true,
      message: `Recorded completion times for ${successCount} assignment(s) (${failCount} failed)`,
      requestId: requestId,
      assignmentsUpdated: successCount,
      assignmentsFailed: failCount,
      duration: actualDuration,
      requestType: requestType,
      details: updateResults
    };
    
  } catch (error) {
    console.error(`❌ Error recording completion times for ${requestId}:`, error);
    return {
      success: false,
      message: `Failed to record completion times: ${error.message}`,
      requestId: requestId,
      error: error.message
    };
  }
}

/**
 * Calculates actual duration based on request type and original times
 * @param {string} requestType - Type of the request (Wedding, Funeral, etc.)
 * @param {string|Date} originalStartTime - Original start time from request
 * @param {string|Date} originalEndTime - Original end time from request
 * @return {number} Duration in decimal hours
 */
function calculateActualDuration(requestType, originalStartTime, originalEndTime) {
  // Realistic duration estimates based on request type
  const typeDurations = {
    'Funeral': 0.5,
    'Wedding': 2.5,
    'VIP': 4.0,
    'Float Movement': 4.0,
    'Other': 2.0
  };
  
  // Try to use original request duration if available and reasonable
  if (originalStartTime && originalEndTime) {
    try {
      const start = parseTimeString(originalStartTime);
      const end = parseTimeString(originalEndTime);
      
      if (start && end && end > start) {
        const calculatedDuration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        
        // Use calculated duration if it's reasonable (between 0.25 and 12 hours)
        if (calculatedDuration >= 0.25 && calculatedDuration <= 12) {
          console.log(`Using calculated duration from original times: ${calculatedDuration} hours`);
          return Math.round(calculatedDuration * 100) / 100; // Round to 2 decimal places
        }
      }
    } catch (error) {
      console.warn('Error calculating duration from original times:', error);
    }
  }
  
  // Fall back to type-based estimate
  const estimatedDuration = typeDurations[requestType] || typeDurations['Other'];
  console.log(`Using type-based duration estimate for ${requestType}: ${estimatedDuration} hours`);
  return estimatedDuration;
}

/**
 * Manual function to record completion times for a specific request
 * Useful for backfilling completion data for historical requests
 * @param {string} requestId - The ID of the request to mark as completed
 * @param {number} [customDuration] - Optional custom duration in hours (overrides calculation)
 * @return {Object} Result of the completion recording
 */
function manuallyRecordCompletion(requestId, customDuration = null) {
  try {
    console.log(`🔧 Manually recording completion for request ${requestId}`);
    
    if (!requestId) {
      throw new Error('Request ID is required');
    }
    
    // First, update the request status to Completed if it's not already
    const requestsData = getRequestsData(false);
    const request = requestsData.data.find(r => 
      getColumnValue(r, requestsData.columnMap, CONFIG.columns.requests.id) === requestId
    );
    
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }
    
    const currentStatus = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.status);
    
    if (currentStatus && currentStatus.toLowerCase() !== 'completed') {
      console.log(`Updating request ${requestId} status to Completed`);
      const updateResult = updateExistingRequest({
        requestId: requestId,
        status: 'Completed'
      });
      
      if (!updateResult.success) {
        throw new Error(`Failed to update request status: ${updateResult.message}`);
      }
    }
    
    // If custom duration is provided, temporarily override the calculation
    if (customDuration !== null) {
      console.log(`Using custom duration: ${customDuration} hours`);
      
      // Get all assignments for this request and update them with custom duration
      const assignmentsData = getAssignmentsData(false);
      const assignmentsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.assignments);
      const columnMap = assignmentsData.columnMap;
      
      let updatedCount = 0;
      
      assignmentsData.data.forEach((assignment, index) => {
        const assignmentRequestId = getColumnValue(assignment, columnMap, CONFIG.columns.assignments.requestId);
        if (String(assignmentRequestId).trim() === String(requestId).trim()) {
          const rowIndex = index + 2; // +2 for header and 0-based index
          
          // Update status, completed date, and duration
          if (columnMap.hasOwnProperty(CONFIG.columns.assignments.status)) {
            const statusColumn = columnMap[CONFIG.columns.assignments.status] + 1;
            assignmentsSheet.getRange(rowIndex, statusColumn).setValue('Completed');
          }
          
          if (columnMap.hasOwnProperty(CONFIG.columns.assignments.completedDate)) {
            const completedDateColumn = columnMap[CONFIG.columns.assignments.completedDate] + 1;
            assignmentsSheet.getRange(rowIndex, completedDateColumn).setValue(new Date());
          }
          
          if (columnMap.hasOwnProperty(CONFIG.columns.assignments.actualDuration)) {
            const actualDurationColumn = columnMap[CONFIG.columns.assignments.actualDuration] + 1;
            assignmentsSheet.getRange(rowIndex, actualDurationColumn).setValue(customDuration);
          }
          
          updatedCount++;
        }
      });
      
      SpreadsheetApp.flush();
      
      return {
        success: true,
        message: `Manually recorded completion for ${updatedCount} assignment(s) with ${customDuration} hours`,
        requestId: requestId,
        assignmentsUpdated: updatedCount,
        duration: customDuration,
        method: 'manual'
      };
    } else {
      // Use automatic recording
      return recordActualCompletionTimes(requestId);
    }
    
  } catch (error) {
    console.error(`❌ Error in manuallyRecordCompletion:`, error);
    return {
      success: false,
      message: `Failed to manually record completion: ${error.message}`,
      requestId: requestId,
      error: error.message
    };
  }
}

/**
 * Test function to verify automatic completion time recording
 * @param {string} testRequestId - Optional specific request ID to test with
 * @return {Object} Test results
 */
function testAutomaticCompletionRecording(testRequestId = null) {
  try {
    console.log('🧪 Testing automatic completion time recording...');
    
    let requestId = testRequestId;
    
    // If no specific request ID provided, find a suitable test request
    if (!requestId) {
      const requestsData = getRequestsData();
      const testableRequests = requestsData.data.filter(r => {
        const status = getColumnValue(r, requestsData.columnMap, CONFIG.columns.requests.status);
        return status && status.toLowerCase() !== 'completed' && status.toLowerCase() !== 'cancelled';
      });
      
      if (testableRequests.length === 0) {
        return {
          success: false,
          message: 'No testable requests found. All requests are either completed or cancelled.',
          suggestion: 'Create a new test request or provide a specific request ID'
        };
      }
      
      requestId = getColumnValue(testableRequests[0], requestsData.columnMap, CONFIG.columns.requests.id);
      console.log(`Using test request: ${requestId}`);
    }
    
    // Check assignments before completion
    const assignmentsData = getAssignmentsData();
    const relatedAssignments = assignmentsData.data.filter(a => {
      const assignmentRequestId = getColumnValue(a, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
      return String(assignmentRequestId).trim() === String(requestId).trim();
    });
    
    console.log(`Found ${relatedAssignments.length} assignments for test request ${requestId}`);
    
    if (relatedAssignments.length === 0) {
      return {
        success: false,
        message: `No assignments found for request ${requestId}`,
        requestId: requestId
      };
    }
    
    // Simulate marking the request as completed
    console.log(`Marking request ${requestId} as completed...`);
    const updateResult = updateExistingRequest({
      requestId: requestId,
      status: 'Completed'
    });
    
    if (!updateResult.success) {
      throw new Error(`Failed to update request: ${updateResult.message}`);
    }
    
    // Check if completion times were recorded
    console.log('Checking if completion times were recorded...');
    const updatedAssignmentsData = getAssignmentsData(false); // Fresh data
    const updatedAssignments = updatedAssignmentsData.data.filter(a => {
      const assignmentRequestId = getColumnValue(a, updatedAssignmentsData.columnMap, CONFIG.columns.assignments.requestId);
      return String(assignmentRequestId).trim() === String(requestId).trim();
    });
    
    let recordedCompletions = 0;
    let totalDuration = 0;
    
    updatedAssignments.forEach(assignment => {
      const status = getColumnValue(assignment, updatedAssignmentsData.columnMap, CONFIG.columns.assignments.status);
      const actualDuration = getColumnValue(assignment, updatedAssignmentsData.columnMap, CONFIG.columns.assignments.actualDuration);
      const completedDate = getColumnValue(assignment, updatedAssignmentsData.columnMap, CONFIG.columns.assignments.completedDate);
      
      if (status === 'Completed' && (actualDuration || completedDate)) {
        recordedCompletions++;
        if (actualDuration && !isNaN(parseFloat(actualDuration))) {
          totalDuration += parseFloat(actualDuration);
        }
      }
    });
    
    const testResult = {
      success: true,
      requestId: requestId,
      totalAssignments: relatedAssignments.length,
      recordedCompletions: recordedCompletions,
      totalDuration: totalDuration,
      message: recordedCompletions > 0 ? 
        `✅ SUCCESS: Automatic completion recording worked! ${recordedCompletions}/${relatedAssignments.length} assignments updated with ${totalDuration} total hours` :
        '⚠️ WARNING: Request was marked completed but completion times were not recorded automatically',
      details: {
        automaticRecording: recordedCompletions > 0,
        completionRate: Math.round((recordedCompletions / relatedAssignments.length) * 100)
      }
    };
    
    console.log('📋 Test Result:', testResult.message);
    return testResult;
    
  } catch (error) {
    console.error('❌ Error in testAutomaticCompletionRecording:', error);
    return {
      success: false,
      message: `Test failed: ${error.message}`,
      requestId: testRequestId,
      error: error.message
    };
  }
}

/**
 * Helper function to get sheet headers (if not available globally)
 */
function getSheetHeaders(sheet) {
  if (!sheet) return [];
  try {
    const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    return headerRange.getValues()[0];
  } catch (error) {
    console.error('Error getting sheet headers:', error);
    return [];
  }
}

/**
 * Creates a map of header names to their column indices.
 * @param {Array<string>} headers The array of header names.
 * @return {Object<string, number>} Mapping of header name to index.
 */
function createHeaderMap(headers) {
  const map = {};
  if (Array.isArray(headers)) {
    headers.forEach((header, index) => {
      map[header] = index;
    });
  }
  return map;
}

/**
 * Deletes a request from the 'Requests' sheet based on its ID.
 * @param {string} requestId The ID of the request to delete.
 * @return {object} An object indicating success or failure, with a message.
 */
function deleteRequest(requestId) {
  try {
    if (!requestId) {
      throw new Error('Request ID is missing. Cannot delete request.');
    }

    const requestsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.requests);
    if (!requestsSheet) {
      throw new Error(`Sheet "${CONFIG.sheets.requests}" not found.`);
    }

    const headers = getSheetHeaders(requestsSheet); // From CoreUtils.js or SheetServices.gs
    const data = requestsSheet.getDataRange().getValues();

    const idCol = headers.indexOf(CONFIG.columns.requests.id);
    if (idCol === -1) {
      throw new Error(`"${CONFIG.columns.requests.id}" column not found in sheet.`);
    }

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) { // Start from 1 to skip header row
      if (data[i][idCol] == requestId) {
        rowIndex = i; // This is the index in the data array (0-based for data rows relative to start of `data`)
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Request with ID "${requestId}" not found for deletion.`);
    }

    // Convert data array index to actual sheet row number (1-based)
    // data[0] is the header row (sheet row 1).
    // data[1] is the first data row (sheet row 2).
    // So, if the match is at data[rowIndex], its actual sheet row number is rowIndex + 1.
    const sheetRowToDelete = rowIndex + 1; 

    requestsSheet.deleteRow(sheetRowToDelete);
    SpreadsheetApp.flush(); // Ensure changes are written

    logActivity(`Request deleted: ${requestId}`); // Assumes logActivity is global
    return { success: true, message: 'Request deleted successfully.' };

  } catch (error) {
    logError('Error deleting request', error); // Assumes logError is global
    return { success: false, message: 'Error deleting request: ' + error.message };
  }
}
// 🛠️ SETUP FUNCTIONS FOR GOOGLE AUTHENTICATION

/**
 * One-time setup function to prepare your sheets for Google authentication
 * Run this once to add the necessary columns
 */
function setupGoogleAuthentication() {
  try {
    console.log('🛠️ Setting up Google Authentication...');
    
    // Setup Riders sheet
    setupRidersSheetForAuth();
    
    // Setup Settings sheet for admin/dispatcher emails
    setupSettingsSheet();
    
    // Create authentication log sheet
    setupAuthLogSheet();
    
    console.log('✅ Google Authentication setup complete!');
    return { success: true, message: 'Setup completed successfully' };
    
  } catch (error) {
    console.error('❌ Setup error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add Google authentication columns to Riders sheet
 */
function setupRidersSheetForAuth() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let ridersSheet = spreadsheet.getSheetByName('Riders');
  
  if (!ridersSheet) {
    console.log('Creating Riders sheet...');
    ridersSheet = spreadsheet.insertSheet('Riders');
    
    // Add basic headers if sheet is new
    const headers = [
      'Rider ID', 'Full Name', 'Phone', 'Email', 'Carrier', 'Status', 
      'Certification', 'Total Assignments', 'Last Assignment Date'
    ];
    ridersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  // Get existing headers
  const lastColumn = ridersSheet.getLastColumn();
  const headers = ridersSheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  
  // Add new columns if they don't exist
  const newColumns = [
    'Google Email',
    'Auth Status', 
    'Last Login',
    'Login Count',
    'Account Created'
  ];
  
  let nextColumn = lastColumn + 1;
  
  newColumns.forEach(columnName => {
    if (!headers.includes(columnName)) {
      ridersSheet.getRange(1, nextColumn).setValue(columnName);
      console.log(`Added column: ${columnName}`);
      nextColumn++;
    }
  });
  
  // Format the new columns
  if (nextColumn > lastColumn + 1) {
    const newRange = ridersSheet.getRange(1, lastColumn + 1, 1, nextColumn - lastColumn - 1);
    newRange.setFontWeight('bold');
    newRange.setBackground('#e8f4f8');
  }
}

/**
 * Create Settings sheet for admin and dispatcher emails
 */
function setupSettingsSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let settingsSheet = spreadsheet.getSheetByName('Settings');
  
  if (!settingsSheet) {
    settingsSheet = spreadsheet.insertSheet('Settings');
  }
  
  // Setup the settings structure
  const settingsData = [
    ['Setting', 'Admin Emails', 'Dispatcher Emails', 'System Settings'],
    ['Description', 'Users with full admin access', 'Users with dispatch access', 'General system configuration'],
    ['', 'admin@example.com', 'dispatcher@example.com', 'setting=value'],
    ['', 'manager@example.com', 'operator@example.com', ''],
    ['', '', '', ''],
    ['', '(Add more admin emails)', '(Add more dispatcher emails)', ''],
    ['', '', '', ''],
    ['AUTH CONFIG', '', '', ''],
    ['require_2fa', 'false', '', ''],
    ['session_timeout', '24', '', 'hours'],
    ['auto_logout', 'true', '', '']
  ];
  
  settingsSheet.getRange(1, 1, settingsData.length, settingsData[0].length).setValues(settingsData);
  
  // Format headers
  settingsSheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
  settingsSheet.getRange(8, 1, 1, 4).setFontWeight('bold').setBackground('#34a853').setFontColor('white');
  
  // Auto-resize columns
  settingsSheet.autoResizeColumns(1, 4);
}

/**
 * Create authentication log sheet
 */
function setupAuthLogSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = spreadsheet.getSheetByName('Auth Log');
  
  if (!logSheet) {
    logSheet = spreadsheet.insertSheet('Auth Log');
    
    const headers = [
      'Timestamp', 'User Email', 'User Name', 'Action', 'Role', 
      'IP Address', 'User Agent', 'Success', 'Error Message'
    ];
    
    logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    logSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#ff9800').setFontColor('white');
    logSheet.autoResizeColumns(1, headers.length);
  }
}

/**
 * Map existing riders to Google accounts
 * This helps transition your current riders to the new auth system
 */
function mapExistingRidersToGoogle() {
  try {
    const ridersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riders');
    const data = ridersSheet.getDataRange().getValues();
    const headers = data[0];
    
    const emailCol = headers.indexOf('Email');
    const googleEmailCol = headers.indexOf('Google Email');
    const authStatusCol = headers.indexOf('Auth Status');
    
    if (emailCol === -1 || googleEmailCol === -1) {
      throw new Error('Required columns not found. Run setupGoogleAuthentication() first.');
    }
    
    let mappedCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      const email = data[i][emailCol];
      const existingGoogleEmail = data[i][googleEmailCol];
      
      // If no Google email is set but regular email exists and is Gmail
      if (!existingGoogleEmail && email && email.includes('@gmail.com')) {
        ridersSheet.getRange(i + 1, googleEmailCol + 1).setValue(email);
        ridersSheet.getRange(i + 1, authStatusCol + 1).setValue('Pending');
        mappedCount++;
        console.log(`Mapped rider ${data[i][headers.indexOf('Full Name')]} to ${email}`);
      }
    }
    
    return { 
      success: true, 
      message: `Mapped ${mappedCount} riders to Google accounts`,
      count: mappedCount 
    };
    
  } catch (error) {
    console.error('Error mapping riders:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a rider registration form for new Google users
 */
function createRiderRegistrationForm() {
  const formHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Rider Registration - Escort Management</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #333;
        }
        input, select {
            width: 100%;
            padding: 10px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
        }
        input:focus, select:focus {
            outline: none;
            border-color: #3498db;
        }
        .btn {
            background: #3498db;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
            width: 100%;
        }
        .btn:hover {
            background: #2980b9;
        }
        .success { color: #27ae60; }
        .error { color: #e74c3c; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏍️ Rider Registration</h1>
        <p>Register your Google account with the Motorcycle Escort Management System</p>
        
        <form id="registrationForm">
            <div class="form-group">
                <label>Full Name:</label>
                <input type="text" id="fullName" required>
            </div>
            
            <div class="form-group">
                <label>Phone Number:</label>
                <input type="tel" id="phone" required>
            </div>
            
            <div class="form-group">
                <label>Google Email (must match your Google account):</label>
                <input type="email" id="googleEmail" required>
            </div>
            
            <div class="form-group">
                <label>Carrier (for SMS notifications):</label>
                <select id="carrier">
                    <option value="verizon">Verizon</option>
                    <option value="att">AT&T</option>
                    <option value="tmobile">T-Mobile</option>
                    <option value="sprint">Sprint</option>
                    <option value="other">Other</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Certification Level:</label>
                <select id="certification">
                    <option value="Basic">Basic</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Instructor">Instructor</option>
                </select>
            </div>
            
            <button type="submit" class="btn">🚀 Register Account</button>
        </form>
        
        <div id="message"></div>
    </div>
    
    <script>
        document.getElementById('registrationForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = {
                fullName: document.getElementById('fullName').value,
                phone: document.getElementById('phone').value,
                googleEmail: document.getElementById('googleEmail').value,
                carrier: document.getElementById('carrier').value,
                certification: document.getElementById('certification').value
            };
            
            document.getElementById('message').innerHTML = '<p>Registering...</p>';
            
            google.script.run
                .withSuccessHandler(handleRegistrationSuccess)
                .withFailureHandler(handleRegistrationError)
                .registerNewRider(formData);
        });
        
        function handleRegistrationSuccess(result) {
            if (result.success) {
                document.getElementById('message').innerHTML = 
                    '<p class="success">✅ Registration successful! Your account is pending approval.</p>';
                document.getElementById('registrationForm').reset();
            } else {
                document.getElementById('message').innerHTML = 
                    '<p class="error">❌ Registration failed: ' + result.error + '</p>';
            }
        }
        
        function handleRegistrationError(error) {
            document.getElementById('message').innerHTML = 
                '<p class="error">❌ Error: ' + error.message + '</p>';
        }
    </script>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(formHtml)
    .setTitle('Rider Registration')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Handle new rider registration from the form
 */
function registerNewRider(formData) {
  try {
    const ridersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riders');
    const nextId = generateNewRiderId();
    
    const newRiderData = [
      nextId,                           // Rider ID
      formData.fullName,               // Full Name
      formData.phone,                  // Phone
      formData.googleEmail,            // Email (use Google email as primary)
      formData.carrier,                // Carrier
      'Pending',                       // Status
      formData.certification,          // Certification
      0,                               // Total Assignments
      '',                              // Last Assignment Date
      formData.googleEmail,            // Google Email
      'Pending Approval',              // Auth Status
      '',                              // Last Login
      0,                               // Login Count
      new Date()                       // Account Created
    ];
    
    const lastRow = ridersSheet.getLastRow();
    ridersSheet.getRange(lastRow + 1, 1, 1, newRiderData.length).setValues([newRiderData]);
    
    // Log the registration
    logAuthEvent(formData.googleEmail, formData.fullName, 'REGISTRATION', 'rider', true);
    
    // Notify admins of new registration
    notifyAdminsOfNewRegistration(formData);
    
    return { 
      success: true, 
      message: 'Registration submitted successfully',
      riderId: nextId 
    };
    
  } catch (error) {
    console.error('Registration error:', error);
    logAuthEvent(formData.googleEmail, formData.fullName, 'REGISTRATION', 'rider', false, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Generate a new rider ID
 */
function generateNewRiderId() {
  const ridersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riders');
  const data = ridersSheet.getDataRange().getValues();
  
  let maxId = 0;
  for (let i = 1; i < data.length; i++) {
    const id = data[i][0];
    if (typeof id === 'string' && id.startsWith('R-')) {
      const num = parseInt(id.split('-')[1]);
      if (num > maxId) maxId = num;
    }
  }
  
  return `R-${(maxId + 1).toString().padStart(3, '0')}`;
}

/**
 * Log authentication events
 */
function logAuthEvent(email, name, action, role, success, errorMessage = '') {
  try {
    const logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Auth Log');
    if (!logSheet) return;
    
    const logData = [
      new Date(),
      email,
      name,
      action,
      role,
      '', // IP Address (not available in Apps Script)
      '', // User Agent (not available in Apps Script)
      success,
      errorMessage
    ];
    
    const lastRow = logSheet.getLastRow();
    logSheet.getRange(lastRow + 1, 1, 1, logData.length).setValues([logData]);
    
  } catch (error) {
    console.error('Error logging auth event:', error);
  }
}

/**
 * Notify admins of new rider registration
 */
function notifyAdminsOfNewRegistration(formData) {
  try {
    const adminEmails = getAdminUsers();
    const subject = '🏍️ New Rider Registration - Approval Required';
    const body = `
New rider registration received:

Name: ${formData.fullName}
Email: ${formData.googleEmail}
Phone: ${formData.phone}
Certification: ${formData.certification}

Please review and approve this registration in the Riders management section.

Access the system: ${getWebAppUrl()}?page=riders
    `;
    
    adminEmails.forEach(email => {
      if (email && email.trim()) {
        GmailApp.sendEmail(email, subject, body);
      }
    });
    
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
}

/**
 * Quick test function to verify authentication setup
 */
function testAuthentication() {
  try {
    const user = Session.getActiveUser();
    const email = user.getEmail();
    
    console.log('Current user:', user.getName(), email);
    
    const rider = getRiderByGoogleEmail(email);
    console.log('Rider mapping:', rider);
    
    const admins = getAdminUsers();
    console.log('Admin users:', admins);
    
    const dispatchers = getDispatcherUsers();
    console.log('Dispatcher users:', dispatchers);
    
    return {
      user: { name: user.getName(), email: email },
      rider: rider,
      admins: admins,
      dispatchers: dispatchers
    };
    
  } catch (error) {
    console.error('Test error:', error);
    return { error: error.message };
  }
}

/**
 * Ensure riders sheet has required authentication columns.
 * Runs setupGoogleAuthentication if any are missing.
 */
function ensureGoogleAuthSetup() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Riders');
    if (!sheet) {
      setupGoogleAuthentication();
      return;
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const required = ['Google Email', 'Auth Status', 'Last Login', 'Login Count', 'Account Created'];
    const missing = required.filter(c => headers.indexOf(c) === -1);

    if (missing.length > 0) {
      console.log('🔧 Missing auth columns detected:', missing.join(', '));
      setupRidersSheetForAuth();
      setupAuthLogSheet();
    }
  } catch (error) {
    console.error('❌ ensureGoogleAuthSetup failed:', error);
  }
}
/**
 * FIXED AUTHENTICATION MAPPING FUNCTIONS
 * Place these in your RequestCRUD.gs or create a new AuthMapping.gs file
 */

/**
 * Fixed createAuthMappingPage function with proper error handling
 */
function createAuthMappingPage() {
  try {
    console.log('📋 Creating authentication mapping page...');

    // Ensure the Riders sheet has the necessary columns
    ensureGoogleAuthSetup();

    // Get riders data with error handling
    let riders = [];
    try {
      const ridersDataObj = getRidersData();
      riders = (ridersDataObj && Array.isArray(ridersDataObj.data)) ? ridersDataObj.data.map(row => {
        const colMap = ridersDataObj.columnMap;
        return {
          id: getColumnValue(row, colMap, CONFIG.columns.riders.jpNumber) || row.id || row['Rider ID'] || '',
          name: getColumnValue(row, colMap, CONFIG.columns.riders.name) || row.name || row['Full Name'] || '',
          email: getColumnValue(row, colMap, CONFIG.columns.riders.email) || row.email || row['Email'] || '',
          status: getColumnValue(row, colMap, CONFIG.columns.riders.status) || row.status || row['Status'] || '',
          googleEmail: getColumnValue(row, colMap, 'Google Email') || row.googleEmail || row['Google Email'] || '',
          authStatus: getColumnValue(row, colMap, 'Auth Status') || row.authStatus || row['Auth Status'] || 'Not Set'
        };
      }) : ridersDataObj;
      console.log(`Found ${riders ? riders.length : 0} riders`);
    } catch (error) {
      console.error('❌ Error getting riders data:', error);
      return createErrorMappingPage('Error loading riders data: ' + error.message);
    }

    // Ensure riders is an array
    if (!Array.isArray(riders)) {
      console.error('❌ Riders data is not an array:', typeof riders);
      return createErrorMappingPage('Invalid riders data format');
    }
    
    if (riders.length === 0) {
      console.log('⚠️ No riders found');
      return createEmptyMappingPage();
    }
    
    // Create the mapping page HTML
    let html = `
<!DOCTYPE html>
<html>
<head>
    <title>🔐 Google Authentication Setup</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 1200px; 
            margin: 20px auto; 
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #eee;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            border-left: 4px solid #3498db;
        }
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #3498db;
        }
        .stat-label {
            color: #666;
            margin-top: 5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background: white;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #f8f9fa;
            font-weight: bold;
            position: sticky;
            top: 0;
        }
        tr:hover {
            background: #f5f5f5;
        }
        input[type="email"] {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        input[type="email"]:focus {
            outline: none;
            border-color: #3498db;
            box-shadow: 0 0 5px rgba(52, 152, 219, 0.3);
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        .btn-primary {
            background: #3498db;
            color: white;
        }
        .btn-primary:hover {
            background: #2980b9;
        }
        .btn-success {
            background: #27ae60;
            color: white;
        }
        .btn-success:hover {
            background: #229954;
        }
        .btn-warning {
            background: #f39c12;
            color: white;
        }
        .btn-warning:hover {
            background: #e67e22;
        }
        .status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }
        .status-active { background: #d4edda; color: #155724; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-inactive { background: #f8d7da; color: #721c24; }
        .status-mapped { background: #cce5ff; color: #0056b3; }
        .bulk-actions {
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .message {
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
        }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .info { background: #cce5ff; color: #0056b3; border: 1px solid #b3d9ff; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Google Authentication Setup</h1>
            <p>Map your existing riders to Google accounts for secure system access</p>
        </div>
        
        <!-- Statistics -->
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number" id="totalRiders">${riders.length}</div>
                <div class="stat-label">Total Riders</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="mappedRiders">${countMappedRiders(riders)}</div>
                <div class="stat-label">Already Mapped</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="unmappedRiders">${riders.length - countMappedRiders(riders)}</div>
                <div class="stat-label">Need Mapping</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="activeRiders">${countActiveRiders(riders)}</div>
                <div class="stat-label">Active Riders</div>
            </div>
        </div>
        
        <!-- Bulk Actions -->
        <div class="bulk-actions">
            <h3>📋 Bulk Actions</h3>
            <button class="btn btn-primary" onclick="autoMapGmailUsers()">
                🚀 Auto-Map Gmail Users
            </button>
            <button class="btn btn-warning" onclick="clearAllMappings()">
                🗑️ Clear All Mappings
            </button>
            <button class="btn btn-success" onclick="exportMappings()">
                📥 Export Mappings
            </button>
        </div>
        
        <!-- Riders Table -->
        <div style="overflow-x: auto;">
            <table>
                <thead>
                    <tr>
                        <th>Rider ID</th>
                        <th>Name</th>
                        <th>Current Email</th>
                        <th>Status</th>
                        <th>Google Email</th>
                        <th>Auth Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>`;
    
    // Add each rider row
    riders.forEach((rider, index) => {
      const riderId = rider.id || rider['Rider ID'] || `R-${index + 1}`;
      const name = rider.name || rider['Full Name'] || 'Unknown';
      const email = rider.email || rider['Email'] || '';
      const status = rider.status || rider['Status'] || 'Unknown';
      const googleEmail = rider.googleEmail || rider['Google Email'] || '';
      const authStatus = rider.authStatus || rider['Auth Status'] || 'Not Set';
      
      const statusClass = getStatusClass(status);
      const authStatusClass = getAuthStatusClass(authStatus);
      const isGmail = email.includes('@gmail.com');
      
      html += `
                    <tr id="rider_${index}">
                        <td><strong>${riderId}</strong></td>
                        <td>${name}</td>
                        <td>${email} ${isGmail ? '<span style="color: #27ae60;">📧</span>' : ''}</td>
                        <td><span class="status ${statusClass}">${status}</span></td>
                        <td>
                            <input type="email" 
                                   id="google_${index}" 
                                   value="${googleEmail}"
                                   placeholder="${isGmail ? email : 'user@gmail.com'}"
                                   style="width: 200px;">
                        </td>
                        <td><span class="status ${authStatusClass}">${authStatus}</span></td>
                        <td>
                            <button class="btn btn-primary" onclick="mapSingleRider(${index}, '${riderId}', '${name}')">
                                ${googleEmail ? '🔄 Update' : '🔗 Map'}
                            </button>
                        </td>
                    </tr>`;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        
        <!-- Messages Area -->
        <div id="messages"></div>
    </div>
    
    <script>
        function mapSingleRider(index, riderId, riderName) {
            const googleEmail = document.getElementById('google_' + index).value.trim();
            
            if (!googleEmail) {
                showMessage('Please enter a Google email address', 'error');
                return;
            }
            
            if (!isValidEmail(googleEmail)) {
                showMessage('Please enter a valid email address', 'error');
                return;
            }
            
            showMessage('Mapping rider...', 'info');
            
            google.script.run
                .withSuccessHandler(function(result) {
                    handleMappingResult(result, index, riderName);
                })
                .withFailureHandler(function(error) {
                    showMessage('Error mapping rider: ' + error.message, 'error');
                })
                .mapRiderToGoogleAccount(riderId, googleEmail);
        }
        
        function autoMapGmailUsers() {
            showMessage('Auto-mapping Gmail users...', 'info');
            
            google.script.run
                .withSuccessHandler(function(result) {
                    if (result.success) {
                        showMessage('Successfully mapped ' + result.count + ' Gmail users', 'success');
                        setTimeout(() => location.reload(), 2000);
                    } else {
                        showMessage('Auto-mapping failed: ' + result.error, 'error');
                    }
                })
                .withFailureHandler(function(error) {
                    showMessage('Error during auto-mapping: ' + error.message, 'error');
                })
                .autoMapExistingGmailUsers();
        }
        
        function clearAllMappings() {
            if (!confirm('Are you sure you want to clear all Google email mappings?')) {
                return;
            }
            
            showMessage('Clearing all mappings...', 'warning');
            
            google.script.run
                .withSuccessHandler(function(result) {
                    if (result.success) {
                        showMessage('All mappings cleared', 'success');
                        setTimeout(() => location.reload(), 1500);
                    } else {
                        showMessage('Failed to clear mappings: ' + result.error, 'error');
                    }
                })
                .withFailureHandler(function(error) {
                    showMessage('Error clearing mappings: ' + error.message, 'error');
                })
                .clearAllGoogleMappings();
        }
        
        function exportMappings() {
            showMessage('Exporting mappings...', 'info');
            
            google.script.run
                .withSuccessHandler(function(result) {
                    if (result.success) {
                        const blob = new Blob([result.csvContent], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'rider_google_mappings.csv';
                        a.click();
                        URL.revokeObjectURL(url);
                        showMessage('Mappings exported successfully', 'success');
                    } else {
                        showMessage('Export failed: ' + result.error, 'error');
                    }
                })
                .withFailureHandler(function(error) {
                    showMessage('Export error: ' + error.message, 'error');
                })
                .exportRiderMappings();
        }
        
        function handleMappingResult(result, index, riderName) {
            if (result.success) {
                showMessage('Successfully mapped ' + riderName + ' to Google account', 'success');
                
                // Update the auth status in the table
                const row = document.getElementById('rider_' + index);
                const authStatusCell = row.cells[5];
                authStatusCell.innerHTML = '<span class="status status-mapped">Mapped</span>';
                
                // Update button text
                const button = row.querySelector('button');
                button.innerHTML = '🔄 Update';
                
                // Update stats
                updateStats();
                
            } else {
                showMessage('Failed to map ' + riderName + ': ' + result.error, 'error');
            }
        }
        
        function updateStats() {
            // Recalculate and update statistics
            const rows = document.querySelectorAll('tbody tr');
            let mapped = 0;
            
            rows.forEach(row => {
                const input = row.querySelector('input[type="email"]');
                if (input && input.value.trim()) {
                    mapped++;
                }
            });
            
            document.getElementById('mappedRiders').textContent = mapped;
            document.getElementById('unmappedRiders').textContent = rows.length - mapped;
        }
        
        function showMessage(message, type) {
            const messagesDiv = document.getElementById('messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + type;
            messageDiv.textContent = message;
            
            messagesDiv.appendChild(messageDiv);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 5000);
            
            // Scroll to message
            messageDiv.scrollIntoView({ behavior: 'smooth' });
        }
        
        function isValidEmail(email) {
            const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
            return emailRegex.test(email);
        }
        
        // Auto-save functionality
        document.addEventListener('input', function(e) {
            if (e.target.type === 'email') {
                // Auto-save after 2 seconds of no typing
                clearTimeout(e.target.saveTimeout);
                e.target.saveTimeout = setTimeout(() => {
                    if (e.target.value.trim() && isValidEmail(e.target.value.trim())) {
                        e.target.style.borderColor = '#27ae60';
                    } else if (e.target.value.trim()) {
                        e.target.style.borderColor = '#e74c3c';
                    } else {
                        e.target.style.borderColor = '#ddd';
                    }
                }, 500);
            }
        });
    </script>
</body>
</html>`;
    
    return HtmlService.createHtmlOutput(html)
      .setTitle('Google Authentication Setup')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
  } catch (error) {
    console.error('❌ Error in createAuthMappingPage:', error);
    return createErrorMappingPage('System error: ' + error.message);
  }
}

/**
 * Helper function to count mapped riders
 */
function countMappedRiders(riders) {
  if (!Array.isArray(riders)) return 0;
  
  return riders.filter(rider => {
    const googleEmail = rider.googleEmail || rider['Google Email'] || '';
    return googleEmail.trim() !== '';
  }).length;
}

/**
 * Helper function to count active riders
 */
function countActiveRiders(riders) {
  if (!Array.isArray(riders)) return 0;
  
  return riders.filter(rider => {
    const status = rider.status || rider['Status'] || '';
    return status.toLowerCase() === 'active';
  }).length;
}

/**
 * Helper function to get CSS class for status
 */
function getStatusClass(status) {
  switch (status.toLowerCase()) {
    case 'active': return 'status-active';
    case 'pending': return 'status-pending';
    case 'inactive': return 'status-inactive';
    default: return 'status-inactive';
  }
}

/**
 * Helper function to get CSS class for auth status
 */
function getAuthStatusClass(authStatus) {
  switch (authStatus.toLowerCase()) {
    case 'mapped':
    case 'active': return 'status-mapped';
    case 'pending': 
    case 'pending approval': return 'status-pending';
    default: return 'status-inactive';
  }
}

/**
 * Create error page when riders data can't be loaded
 */
function createErrorMappingPage(errorMessage) {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Error - Authentication Setup</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
        }
        .error { color: #e74c3c; }
        .btn {
            background: #3498db;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin: 10px;
            text-decoration: none;
            display: inline-block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>❌ Error Loading Authentication Setup</h1>
        <p class="error">${errorMessage}</p>
        <p>Please check:</p>
        <ul style="text-align: left;">
            <li>Riders sheet exists and has data</li>
            <li>Required columns are present</li>
            <li>getRidersData() function is working</li>
        </ul>
        <a href="#" onclick="location.reload()" class="btn">🔄 Retry</a>
        <a href="${getWebAppUrl()}" class="btn">🏠 Back to Dashboard</a>
    </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html).setTitle('Error - Auth Setup');
}

/**
 * Create page when no riders exist
 */
function createEmptyMappingPage() {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>No Riders - Authentication Setup</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
        }
        .btn {
            background: #3498db;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin: 10px;
            text-decoration: none;
            display: inline-block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📋 No Riders Found</h1>
        <p>There are no riders in the system to map to Google accounts.</p>
        <p>Please add riders first, then return to set up authentication.</p>
        <a href="${getWebAppUrl()}?page=riders" class="btn">👥 Manage Riders</a>
        <a href="${getWebAppUrl()}" class="btn">🏠 Back to Dashboard</a>
    </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html).setTitle('No Riders Found');
}

/**
 * Backend function to map a rider to Google account
 */
function mapRiderToGoogleAccount(riderId, googleEmail) {
  try {
    console.log(`🔗 Mapping rider ${riderId} to ${googleEmail}`);
    
    const ridersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riders');
    if (!ridersSheet) {
      return { success: false, error: 'Riders sheet not found' };
    }
    
    const data = ridersSheet.getDataRange().getValues();
    const headers = data[0];
    
    const idCol = headers.indexOf('Rider ID');
    const googleEmailCol = headers.indexOf('Google Email');
    const authStatusCol = headers.indexOf('Auth Status');
    
    if (idCol === -1) {
      return { success: false, error: 'Rider ID column not found' };
    }
    
    if (googleEmailCol === -1) {
      return { success: false, error: 'Google Email column not found. Run setupGoogleAuthentication() first.' };
    }
    
    // Find the rider row using string comparison to handle numeric IDs
    for (let i = 1; i < data.length; i++) {
      const sheetId = data[i][idCol];
      if (String(sheetId).trim() === String(riderId).trim()) {
        // Update Google email
        ridersSheet.getRange(i + 1, googleEmailCol + 1).setValue(googleEmail);
        
        // Update auth status if column exists
        if (authStatusCol !== -1) {
          ridersSheet.getRange(i + 1, authStatusCol + 1).setValue('Mapped');
        }
        
        console.log(`✅ Successfully mapped rider ${riderId}`);
        return { success: true, message: 'Rider mapped successfully' };
      }
    }

    console.log(`❌ Rider not found for ID "${riderId}"`);
    return { success: false, error: 'Rider not found' };
    
  } catch (error) {
    console.error('❌ Error mapping rider:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Auto-map existing Gmail users
 */
function autoMapExistingGmailUsers() {
  try {
    console.log('🚀 Auto-mapping Gmail users...');
    
    const ridersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riders');
    if (!ridersSheet) {
      return { success: false, error: 'Riders sheet not found' };
    }
    
    const data = ridersSheet.getDataRange().getValues();
    const headers = data[0];
    
    const emailCol = headers.indexOf('Email');
    const googleEmailCol = headers.indexOf('Google Email');
    const authStatusCol = headers.indexOf('Auth Status');
    
    if (emailCol === -1 || googleEmailCol === -1) {
      return { success: false, error: 'Required columns not found' };
    }
    
    let mappedCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      const email = data[i][emailCol];
      const existingGoogleEmail = data[i][googleEmailCol];
      
      // If no Google email is set but regular email is Gmail
      if (!existingGoogleEmail && email && email.includes('@gmail.com')) {
        ridersSheet.getRange(i + 1, googleEmailCol + 1).setValue(email);
        
        if (authStatusCol !== -1) {
          ridersSheet.getRange(i + 1, authStatusCol + 1).setValue('Auto-Mapped');
        }
        
        mappedCount++;
      }
    }
    
    console.log(`✅ Auto-mapped ${mappedCount} Gmail users`);
    return { success: true, count: mappedCount };
    
  } catch (error) {
    console.error('❌ Error auto-mapping Gmail users:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Clear all Google email mappings
 */
function clearAllGoogleMappings() {
  try {
    console.log('🗑️ Clearing all Google mappings...');
    
    const ridersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riders');
    if (!ridersSheet) {
      return { success: false, error: 'Riders sheet not found' };
    }
    
    const data = ridersSheet.getDataRange().getValues();
    const headers = data[0];
    
    const googleEmailCol = headers.indexOf('Google Email');
    const authStatusCol = headers.indexOf('Auth Status');
    
    if (googleEmailCol === -1) {
      return { success: false, error: 'Google Email column not found' };
    }
    
    // Clear all Google email mappings
    for (let i = 1; i < data.length; i++) {
      ridersSheet.getRange(i + 1, googleEmailCol + 1).setValue('');
      
      if (authStatusCol !== -1) {
        ridersSheet.getRange(i + 1, authStatusCol + 1).setValue('Not Set');
      }
    }
    
    console.log('✅ All mappings cleared');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error clearing mappings:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Export rider mappings to CSV
 */
function exportRiderMappings() {
  try {
    console.log('📥 Exporting rider mappings...');
    
    const ridersDataObj = getRidersData();
    let riders = [];
    if (ridersDataObj && Array.isArray(ridersDataObj.data)) {
      const colMap = ridersDataObj.columnMap;
      riders = ridersDataObj.data.map(row => ({
        id: getColumnValue(row, colMap, CONFIG.columns.riders.jpNumber) || row.id || row['Rider ID'] || '',
        name: getColumnValue(row, colMap, CONFIG.columns.riders.name) || row.name || row['Full Name'] || '',
        email: getColumnValue(row, colMap, CONFIG.columns.riders.email) || row.email || row['Email'] || '',
        googleEmail: getColumnValue(row, colMap, 'Google Email') || row.googleEmail || row['Google Email'] || '',
        authStatus: getColumnValue(row, colMap, 'Auth Status') || row.authStatus || row['Auth Status'] || '' ,
        status: getColumnValue(row, colMap, CONFIG.columns.riders.status) || row.status || row['Status'] || ''
      }));
    } else {
      riders = Array.isArray(ridersDataObj) ? ridersDataObj : [];
    }

    if (!Array.isArray(riders)) {
      return { success: false, error: 'Invalid riders data' };
    }
    
    let csvContent = 'Rider ID,Name,Email,Google Email,Auth Status,Status\\n';
    
    riders.forEach(rider => {
      const riderId = rider.id || rider['Rider ID'] || '';
      const name = rider.name || rider['Full Name'] || '';
      const email = rider.email || rider['Email'] || '';
      const googleEmail = rider.googleEmail || rider['Google Email'] || '';
      const authStatus = rider.authStatus || rider['Auth Status'] || '';
      const status = rider.status || rider['Status'] || '';
      
      csvContent += `"${riderId}","${name}","${email}","${googleEmail}","${authStatus}","${status}"\\n`;
    });
    
    return { 
      success: true, 
      csvContent: csvContent,
      filename: `rider_mappings_${new Date().toISOString().split('T')[0]}.csv`
    };
    
  } catch (error) {
    console.error('❌ Error exporting mappings:', error);
    return { success: false, error: error.message };
  }
}

/**
 * @fileoverview This file contains functions for Creating, Reading, Updating, and Deleting (CRUD)
 * escort requests. These functions will interact with the Google Sheet that serves as the database.
 */

/**
 * Creates a new escort request in the spreadsheet.
 *
 * @param {object} requestData An object containing all the necessary data for a new request.
 *                             Expected properties: requesterName, requesterEmail, requesterPhone,
 *                             requesterDepartment, eventDate, startTime, endTime,
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
      'requesterName', 'requesterEmail', 'requesterPhone', 'requesterDepartment',
      'eventDate', 'startTime', 'startLocation', 'endLocation', 'requestType', 'ridersNeeded'
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
            case CONFIG.columns.requests.requesterEmail:      value = requestData.requesterEmail; break;
            case CONFIG.columns.requests.requesterPhone:      value = requestData.requesterPhone; break;
            case CONFIG.columns.requests.requesterDepartment: value = requestData.requesterDepartment; break;
            case CONFIG.columns.requests.eventDate:           value = new Date(requestData.eventDate); break;
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
    if (typeof timeInput !== 'string' || timeInput.trim() === '') {
        return null;
    }

    const now = new Date(); // Use current date as base
    let hours = 0;
    let minutes = 0;

    const timeParts = timeInput.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);

    if (timeParts) {
        hours = parseInt(timeParts[1], 10);
        minutes = parseInt(timeParts[2], 10);
        const ampm = timeParts[3];

        if (ampm) {
            if (ampm.toLowerCase() === 'pm' && hours < 12) {
                hours += 12;
            } else if (ampm.toLowerCase() === 'am' && hours === 12) { // Midnight case
                hours = 0;
            }
        }
        // If no AM/PM, assume 24-hour format if hours > 12, otherwise assume AM.
        // This might need adjustment based on common input format.
    } else {
        // Try parsing "HHMM" or "HMM" if that's a possible input format
        if (timeInput.length === 4 && !isNaN(timeInput)) { // "1430"
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

    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.warn(`Invalid time components from string: "${timeInput}" (H:${hours}, M:${minutes})`);
        return null;
    }

    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
}

/**
 * Updates an existing request in the 'Requests' sheet.
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
            if (value) {
              value = new Date(value);
              if (isNaN(value.getTime())) {
                console.warn(`Invalid date provided for eventDate: ${requestData[formField]}`);
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
    clearRequestsCache();

    // Log the successful update
    logActivity(`Request updated: ${requestData.requestId} - Updated ${updates.length} fields`);
    
    console.log(`✅ Successfully updated request ${requestData.requestId}`);

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

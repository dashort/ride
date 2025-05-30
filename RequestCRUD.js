// Add these functions to a new file called RequestCRUD.js in your Apps Script project

/**
 * Create a new request
 * @param {Object} requestData The request data from the form
 * @returns {Object} Success/failure result
 */
function createNewRequest(requestData) {
  try {
    console.log('Creating new request:', requestData);
    
    const requestsSheet = getSheet(CONFIG.sheets.requests);
    const requestsData = getRequestsData(false); // Get fresh data
    
    // Generate new Request ID
    const newRequestId = generateRequestId(requestsSheet);
    
    // Prepare row data in the correct order
    const newRow = [];
    const columnMap = requestsData.columnMap;
    const headers = requestsData.headers;
    
    // Initialize array with empty values
    for (let i = 0; i < headers.length; i++) {
      newRow[i] = '';
    }
    
    // Set values using column mapping
    setColumnValue(newRow, columnMap, CONFIG.columns.requests.id, newRequestId);
    setColumnValue(newRow, columnMap, CONFIG.columns.requests.date, new Date());
    setColumnValue(newRow, columnMap, CONFIG.columns.requests.requesterName, requestData.requesterName);
    setColumnValue(newRow, columnMap, CONFIG.columns.requests.requesterContact, requestData.requesterContact);
    setColumnValue(newRow, columnMap, CONFIG.columns.requests.type, requestData.requestType);
    setColumnValue(newRow, columnMap, CONFIG.columns.requests.eventDate, new Date(requestData.eventDate));
    setColumnValue(newRow, columnMap, CONFIG.columns.requests.startTime, parseTimeString(requestData.startTime));
    setColumnValue(newRow, columnMap, CONFIG.columns.requests.endTime, parseTimeString(requestData.endTime));
    setColumnValue(newRow, columnMap, CONFIG.columns.requests.startLocation, requestData.startLocation);
    setColumnValue(newRow, columnMap, CONFIG.columns.requests.endLocation, requestData.endLocation);
    setColumnValue(newRow, columnMap, CONFIG.columns.requests.secondaryLocation, requestData.secondaryEndLocation);
    setColumnValue(newRow, columnMap, CONFIG.columns.requests.ridersNeeded, requestData.ridersNeeded);
    setColumnValue(newRow, columnMap, CONFIG.columns.requests.requirements, requestData.specialRequirements);
    setColumnValue(newRow, columnMap, CONFIG.columns.requests.status, requestData.status);
    setColumnValue(newRow, columnMap, CONFIG.columns.requests.notes, requestData.notes);
    setColumnValue(newRow, columnMap, CONFIG.columns.requests.courtesy, requestData.courtesy === 'Yes' ? 'Yes' : 'No');
    setColumnValue(newRow, columnMap, CONFIG.columns.requests.lastUpdated, new Date());
    
    // Add the new row to the sheet
    requestsSheet.appendRow(newRow);
    
    // Clear cache to ensure fresh data on next load
    clearDataCache();
    
    logActivity(`Created new request: ${newRequestId}`);
    
    return {
      success: true,
      message: `Request ${newRequestId} created successfully`,
      requestId: newRequestId
    };
    
  } catch (error) {
    logError('Error creating new request:', error);
    return {
      success: false,
      message: `Failed to create request: ${error.message}`
    };
  }
}

/**
 * Update an existing request
 * @param {Object} requestData The request data from the form
 * @returns {Object} Success/failure result
 */
function updateExistingRequest(requestData) {
  try {
    console.log('Updating request:', requestData.requestId);
    
    const requestsSheet = getSheet(CONFIG.sheets.requests);
    const requestsData = getRequestsData(false); // Get fresh data
    
    // Find the row to update
    let rowIndex = -1;
    for (let i = 0; i < requestsData.data.length; i++) {
      const rowRequestId = getColumnValue(requestsData.data[i], requestsData.columnMap, CONFIG.columns.requests.id);
      if (String(rowRequestId).trim().toLowerCase() === String(requestData.requestId).trim().toLowerCase()) {
        rowIndex = i + 2; // +2 because sheet rows are 1-indexed and we skip header
        break;
      }
    }
    
    if (rowIndex === -1) {
      throw new Error(`Request ${requestData.requestId} not found`);
    }
    
    const columnMap = requestsData.columnMap;
    
    // Update each field
    const updates = [
      [CONFIG.columns.requests.requesterName, requestData.requesterName],
      [CONFIG.columns.requests.requesterContact, requestData.requesterContact],
      [CONFIG.columns.requests.type, requestData.requestType],
      [CONFIG.columns.requests.eventDate, new Date(requestData.eventDate)],
      [CONFIG.columns.requests.startTime, parseTimeString(requestData.startTime)],
      [CONFIG.columns.requests.endTime, parseTimeString(requestData.endTime)],
      [CONFIG.columns.requests.startLocation, requestData.startLocation],
      [CONFIG.columns.requests.endLocation, requestData.endLocation],
      [CONFIG.columns.requests.secondaryLocation, requestData.secondaryEndLocation],
      [CONFIG.columns.requests.ridersNeeded, requestData.ridersNeeded],
      [CONFIG.columns.requests.requirements, requestData.specialRequirements],
      [CONFIG.columns.requests.status, requestData.status],
      [CONFIG.columns.requests.notes, requestData.notes],
      [CONFIG.columns.requests.courtesy, requestData.courtesy === 'Yes' ? 'Yes' : 'No'],
      [CONFIG.columns.requests.lastUpdated, new Date()]
    ];
    
    // Apply updates
    updates.forEach(([columnName, value]) => {
      const colIndex = columnMap[columnName];
      if (colIndex !== undefined && value !== undefined) {
        requestsSheet.getRange(rowIndex, colIndex + 1).setValue(value);
      }
    });
    
    // Clear cache to ensure fresh data on next load
    clearDataCache();
    
    logActivity(`Updated request: ${requestData.requestId}`);
    
    return {
      success: true,
      message: `Request ${requestData.requestId} updated successfully`
    };
    
  } catch (error) {
    logError('Error updating request:', error);
    return {
      success: false,
      message: `Failed to update request: ${error.message}`
    };
  }
}

/**
 * Delete a request
 * @param {string} requestId The ID of the request to delete
 * @returns {Object} Success/failure result
 */
function deleteRequest(requestId) {
  try {
    console.log('Deleting request:', requestId);
    
    const requestsSheet = getSheet(CONFIG.sheets.requests);
    const requestsData = getRequestsData(false); // Get fresh data
    
    // Find the row to delete
    let rowIndex = -1;
    for (let i = 0; i < requestsData.data.length; i++) {
      const rowRequestId = getColumnValue(requestsData.data[i], requestsData.columnMap, CONFIG.columns.requests.id);
      if (String(rowRequestId).trim().toLowerCase() === String(requestId).trim().toLowerCase()) {
        rowIndex = i + 2; // +2 because sheet rows are 1-indexed and we skip header
        break;
      }
    }
    
    if (rowIndex === -1) {
      throw new Error(`Request ${requestId} not found`);
    }
    
    // Check if request has active assignments
    const assignmentsData = getAssignmentsData();
    const hasActiveAssignments = assignmentsData.data.some(row => {
      const assignmentRequestId = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
      const status = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      return String(assignmentRequestId).trim().toLowerCase() === String(requestId).trim().toLowerCase() &&
             !['Completed', 'Cancelled', 'No Show'].includes(status);
    });
    
    if (hasActiveAssignments) {
      return {
        success: false,
        message: `Cannot delete request ${requestId}: It has active rider assignments. Please cancel the assignments first.`
      };
    }
    
    // Delete the row
    requestsSheet.deleteRow(rowIndex);
    
    // Clear cache to ensure fresh data on next load
    clearDataCache();
    
    logActivity(`Deleted request: ${requestId}`);
    
    return {
      success: true,
      message: `Request ${requestId} deleted successfully`
    };
    
  } catch (error) {
    logError('Error deleting request:', error);
    return {
      success: false,
      message: `Failed to delete request: ${error.message}`
    };
  }
}

/**
 * Helper function to parse time string into a Date object
 * @param {string} timeStr Time string in HH:MM format
 * @returns {Date|null} Date object with time, or null if invalid
 */
function parseTimeString(timeStr) {
  if (!timeStr) return null;
  
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    
    // Create a date object with today's date but the specified time
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  } catch (error) {
    console.log('Error parsing time string:', timeStr, error);
    return null;
  }
}
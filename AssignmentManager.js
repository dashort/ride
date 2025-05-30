function buildAssignmentRow(assignmentId, requestId, riderName, requestDetails, createdDate, jpNumber = null) {
  const columns = CONFIG.columns.assignments;
  const assignmentsData = getAssignmentsData(); // For columnMap

  const row = new Array(Object.keys(assignmentsData.columnMap).length).fill('');

  setColumnValue(row, assignmentsData.columnMap, columns.id, assignmentId);
  setColumnValue(row, assignmentsData.columnMap, columns.requestId, requestId);
  setColumnValue(row, assignmentsData.columnMap, columns.eventDate, requestDetails.eventDate);
  setColumnValue(row, assignmentsData.columnMap, columns.startTime, requestDetails.startTime);
  setColumnValue(row, assignmentsData.columnMap, columns.endTime, requestDetails.endTime);
  setColumnValue(row, assignmentsData.columnMap, columns.startLocation, requestDetails.startLocation);
  setColumnValue(row, assignmentsData.columnMap, columns.endLocation, requestDetails.endLocation);
  setColumnValue(row, assignmentsData.columnMap, columns.secondaryLocation, requestDetails.secondaryLocation);
  setColumnValue(row, assignmentsData.columnMap, columns.riderName, riderName);
  setColumnValue(row, assignmentsData.columnMap, columns.jpNumber, jpNumber);
  setColumnValue(row, assignmentsData.columnMap, columns.status, 'Assigned');
  setColumnValue(row, assignmentsData.columnMap, columns.createdDate, createdDate);

  return row;
}

/**
 * Cancels a specific rider's assignment for a specific request by updating its status to 'Cancelled'.
 * @param {string} requestId The ID of the escort request.
 * @param {string} riderName The name of the rider whose assignment should be cancelled.
 * @throws {Error} If updating the sheet fails.
 */
function cancelRiderAssignment(requestId, riderName) {
  try {
    const assignmentsData = getAssignmentsData(false);
    const sheet = assignmentsData.sheet;

    const requestIdCol = CONFIG.columns.assignments.requestId;
    const riderNameCol = CONFIG.columns.assignments.riderName;
    const statusCol = CONFIG.columns.assignments.status;

    let found = false;
    for (let i = 0; i < assignmentsData.data.length; i++) {
      const row = assignmentsData.data[i];
      const rowRequestId = String(getColumnValue(row, assignmentsData.columnMap, requestIdCol) || '').trim().toLowerCase();
      const rowRiderName = getColumnValue(row, assignmentsData.columnMap, riderNameCol);
      const rowStatus = getColumnValue(row, assignmentsData.columnMap, statusCol);

      if (rowRequestId === String(requestId || '').trim().toLowerCase() &&
        rowRiderName === riderName &&
        !['Cancelled', 'Completed'].includes(rowStatus)) {

        const sheetRowIndex = i + 2;

        const statusColIndex = assignmentsData.columnMap[statusCol];
        sheet.getRange(sheetRowIndex, statusColIndex + 1).setValue('Cancelled');

        logActivity(`Cancelled assignment for ${riderName} on request ${requestId}`);
        found = true;
        break;
      }
    }
    if (!found) {
      logActivity(`No active assignment found to cancel for ${riderName} on request ${requestId}`);
    }

  } catch (error) {
    logError('Error cancelling specific rider assignment', error);
    throw error;
  }
}

/**
 * Add new rider assignments for a request.
 * @param {string} requestId The ID of the request.
 * @param {Array<Object>} ridersToAdd Array of rider objects like {name: "John Doe", jpNumber: "JP001"}.
 */
function addRiderAssignments(requestId, ridersToAdd) {
  if (ridersToAdd.length === 0) return;

  try {
    const assignmentsData = getAssignmentsData(false);
    const ridersData = getRidersData();
    const sheet = assignmentsData.sheet;

    const requestDetails = getRequestDetails(requestId);
    if (!requestDetails) {
      throw new Error(`Request ${requestId} not found`);
    }

    const now = new Date();

    ridersToAdd.forEach(riderObj => {
      const riderName = riderObj.name;
      const jpNumber = riderObj.jpNumber; // Use the provided JP Number directly

      const assignmentId = generateAssignmentId();

      const newRow = buildAssignmentRow(assignmentId, requestId, riderName, requestDetails, now, jpNumber);
      sheet.appendRow(newRow);
      logActivity(`Created assignment ${assignmentId} for ${riderName} on request ${requestId}`);
    });

  } catch (error) {
    logError('Error adding rider assignments', error);
    throw error;
  }
}


/**
 * Processes assignment selection from the web form and updates sheets.
 * @param {string} requestIdInput The raw ID string received from the web form.
 * @param {Array<Object>} selectedRiders Array of rider objects {name, jpNumber}.
 * @returns {object} Success message and newly assigned riders for notification screen.
 * @throws {Error} If processing fails.
 */
function processAssignmentAndPopulate(requestIdInput, selectedRiders) {
  const cleanedInputId = String(requestIdInput || '').replace(/^"|"$/g, '').trim();
  const originalRequestId = cleanedInputId;
  const requestId = normalizeRequestId(originalRequestId);

  console.log(`[START] processAssignmentAndPopulate - Request ID: "${requestId}"`);

  try {
    const requestsSheet = getSheet(CONFIG.sheets.requests);
    const requestsData = getRequestsData(false);
    const requestColMap = requestsData.columnMap;

    const requestRowIndexFn = (id) => {
      for (let i = 0; i < requestsData.data.length; i++) {
        const rowIdRaw = getColumnValue(requestsData.data[i], requestColMap, CONFIG.columns.requests.id);
        if (normalizeRequestId(String(rowIdRaw)).toLowerCase().trim() === id.toLowerCase().trim()) {
          return i + 2; // 1-based sheet row index
        }
      }
      return -1;
    };

    const requestOriginalSheetRowIndex_1_based = requestRowIndexFn(requestId);
    if (requestOriginalSheetRowIndex_1_based === -1) {
      throw new Error(`Request ID "${originalRequestId}" not found.`);
    }
    const requestOriginalDataRow = requestsData.data[requestOriginalSheetRowIndex_1_based - 2]; 

    const ridersNeeded = parseInt(getColumnValue(requestOriginalDataRow, requestColMap, CONFIG.columns.requests.ridersNeeded) || 0);

    const currentAssignmentsSheet = getSheet(CONFIG.sheets.assignments);
    const currentAssignmentsData = getAssignmentsData(false);

    const currentAssignedRiders = currentAssignmentsData.data
      .filter(row =>
        normalizeRequestId(String(getColumnValue(row, currentAssignmentsData.columnMap, CONFIG.columns.assignments.requestId) || '')).toLowerCase().trim() === requestId.toLowerCase().trim() &&
        !['Cancelled', 'Completed', 'No Show'].includes(String(getColumnValue(row, currentAssignmentsData.columnMap, CONFIG.columns.assignments.status) || '').trim())
      )
      .map(row => String(getColumnValue(row, currentAssignmentsData.columnMap, CONFIG.columns.assignments.riderName) || '').trim())
      .filter(name => name !== '');

    const selectedRiderNames = selectedRiders.map(sr => String(sr.name || '').trim());

    const ridersToCancelNames = currentAssignedRiders.filter(riderName =>
      !selectedRiderNames.includes(riderName)
    );

    const ridersToAddObjects = selectedRiders.filter(sr =>
      !currentAssignedRiders.includes(String(sr.name || '').trim())
    );

    const newlyAssignedRidersForNotification = [];

    // Cancel assignments for unchecked riders
    ridersToCancelNames.forEach(riderName => {
      cancelRiderAssignment(requestId, riderName);
      console.log(`   - Cancelled ${riderName} for request ${requestId}`);
    });

    // Add new assignments for checked riders not currently assigned
    const requestDetails = getRequestDetails(requestId);
    if (!requestDetails) {
      throw new Error(`Failed to get fresh request details for ID "${requestId}".`);
    }

    ridersToAddObjects.forEach(riderObj => {
      const assignmentId = generateAssignmentId();
      const newAssignmentData = buildAssignmentRow(
        assignmentId,
        requestId,
        riderObj.name,
        requestDetails,
        new Date(),
        riderObj.jpNumber
      );
      currentAssignmentsSheet.appendRow(newAssignmentData);
      console.log(`   - Appended new assignment ${assignmentId} for ${riderObj.name} on request ${requestId}`);

      newlyAssignedRidersForNotification.push({
        assignmentId: assignmentId,
        riderName: riderObj.name,
        phone: riderObj.phone,
        email: riderObj.email,
        carrier: riderObj.carrier
      });
    });

    // Determine the request's status based on actual assignments
    const actualAssignedCount = selectedRiders.length;
    let determinedNewStatus;
    if (actualAssignedCount === 0) {
      determinedNewStatus = 'Unassigned';
    } else if (actualAssignedCount < ridersNeeded) {
      determinedNewStatus = 'Unassigned';
    } else {
      determinedNewStatus = 'Assigned';
    }

    // Update "Riders Assigned" in the Requests sheet
    const assignedNamesString = selectedRiderNames.join('\n');
    const ridersAssignedColIndex_requestsSheet = requestColMap[CONFIG.columns.requests.ridersAssigned];
    requestsSheet.getRange(requestOriginalSheetRowIndex_1_based, ridersAssignedColIndex_requestsSheet + 1).setValue(assignedNamesString);

    // Update status in the Requests sheet
    updateRequestStatus(requestId, determinedNewStatus);

    clearDataCache(); // Clear the data cache

    console.log(`[END] processAssignmentAndPopulate - Success.`);
    return {
      success: true,
      message: `Riders assigned successfully. Request status updated to ${determinedNewStatus}.`,
      assignedRidersForNotification: newlyAssignedRidersForNotification
    };

  } catch (error) {
    logError(`Error in processAssignmentAndPopulate for request ${originalRequestId}`, error);
    throw new Error(`Failed to assign riders: ${error.message}`);
  }
}
function getRequestDetails(requestId) {
  try {
    const normalizedId = normalizeRequestId(requestId);
    console.log(`getRequestDetails: Looking for ID "${requestId}" (normalized: "${normalizedId}")`);

    const requestsData = getRequestsData(); // Already gets formatted data
    const requests = requestsData.data;
    const columnMap = requestsData.columnMap;

    let foundRequestRow = null;
    for (let i = 0; i < requests.length; i++) {
        const row = requests[i];
        const rowId = getColumnValue(row, columnMap, CONFIG.columns.requests.id);
        if (rowId && normalizeRequestId(String(rowId)).toLowerCase() === normalizedId.toLowerCase()) {
            foundRequestRow = row;
            break;
        }
    }
    
    if (!foundRequestRow) {
        console.log(`❌ getRequestDetails: Request ID "${requestId}" not found after normalization.`);
        return null;
    }

    const details = {
        id: getColumnValue(foundRequestRow, columnMap, CONFIG.columns.requests.id),
        ridersNeeded: getColumnValue(foundRequestRow, columnMap, CONFIG.columns.requests.ridersNeeded),
        eventDate: getColumnValue(foundRequestRow, columnMap, CONFIG.columns.requests.eventDate),
        startTime: getColumnValue(foundRequestRow, columnMap, CONFIG.columns.requests.startTime),
        endTime: getColumnValue(foundRequestRow, columnMap, CONFIG.columns.requests.endTime),
        startLocation: getColumnValue(foundRequestRow, columnMap, CONFIG.columns.requests.startLocation),
        endLocation: getColumnValue(foundRequestRow, columnMap, CONFIG.columns.requests.endLocation),
        secondaryLocation: getColumnValue(foundRequestRow, columnMap, CONFIG.columns.requests.secondaryLocation),
        requesterName: getColumnValue(foundRequestRow, columnMap, CONFIG.columns.requests.requesterName),
        status: getColumnValue(foundRequestRow, columnMap, CONFIG.columns.requests.status),
        ridersAssigned: getColumnValue(foundRequestRow, columnMap, CONFIG.columns.requests.ridersAssigned) || ''
    };
    
    console.log(`✅ getRequestDetails: Successfully found details for "${requestId}"`);
    return details;

  } catch (error) {
    logError(`Error in getRequestDetails for "${requestId}":`, error);
    return null;
  }
}


/**
 * Generates a unique Assignment ID (ASG-XXXX) based on the highest existing ID.
 * @returns {string} The generated unique assignment ID.
 */
function generateAssignmentId() {
  const assignmentsData = getAssignmentsData(); // Get fresh data for current IDs
  const idColIndex = assignmentsData.columnMap[CONFIG.columns.assignments.id];

  let maxNum = 0;
  if (assignmentsData.data.length > 0) {
    // Iterate through data rows to find the max number
    for (let i = 0; i < assignmentsData.data.length; i++) {
      const id = assignmentsData.data[i][idColIndex];
      // Check if it's a string and matches the ASG- format
      if (typeof id === 'string' && id.startsWith('ASG-')) {
        const numPart = id.substring(4);
        const num = parseInt(numPart, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }
  const nextNum = (maxNum + 1).toString().padStart(4, '0');
  return `ASG-${nextNum}`;
}

/**
 * Updates a request's status in the Requests sheet.
 * @param {string} requestId The ID of the request to update.
 * @param {string} newStatus The new status for the request.
 * @throws {Error} If updating the request status fails.
 */
function updateRequestStatus(requestId, newStatus) {
  try {
    const requestsData = getRequestsData(false); // Get fresh data for writes
    const sheet = requestsData.sheet;

    const requestIdCol = CONFIG.columns.requests.id;
    const statusCol = CONFIG.columns.requests.status;
    const lastUpdatedCol = CONFIG.columns.requests.lastUpdated;

    requestsData.data.forEach((row, index) => {
      const rowRequestId = String(getColumnValue(row, requestsData.columnMap, requestIdCol) || '').trim().toLowerCase();
      const targetRequestId = String(requestId || '').trim().toLowerCase();

      if (rowRequestId === targetRequestId) {
        const rowNumber = index + 2;

        const statusColIndex = requestsData.columnMap[statusCol];
        if (statusColIndex !== undefined) {
          sheet.getRange(rowNumber, statusColIndex + 1).setValue(newStatus);
        }

        const lastUpdatedColIndex = requestsData.columnMap[lastUpdatedCol];
        if (lastUpdatedColIndex !== undefined) {
          sheet.getRange(rowNumber, lastUpdatedColIndex + 1).setValue(new Date());
        }

        logActivity(`Updated request ${requestId} status to ${newStatus}`);
        return;
      }
    });

  } catch (error) {
    logError('Error updating request status', error);
    throw error;
  }
}
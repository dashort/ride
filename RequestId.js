function onEditRequestsSheet(e) {
  try {
    if (!e || !e.range || e.range.getSheet().getName() !== CONFIG.sheets.requests) {
      console.log(`onEditRequestsSheet: Not on Requests sheet or outside range, exiting.`);
      return;
    }

    const row = e.range.getRow();
    const col = e.range.getColumn();
    const sheet = e.range.getSheet();

    if (row < 2) { // Skip header row
      console.log('onEditRequestsSheet: Edit on header row, exiting.');
      return;
    }

    const requestIdCell = sheet.getRange(row, 1); // Request ID is in column A
    requestIdCell.setNumberFormat('@'); // Ensure it's formatted as plain text

    let requestId = requestIdCell.getValue();
    const requestsData = getRequestsData(); // Get current data to use columnMap

    // IMPORTANT: Even if ID was generated before, this function might be triggered again by another edit in the row.
    // It should now use the existing (or newly generated) ID to trigger status update.
    if (!requestId || typeof requestId !== 'string' || !requestId.match(/^[A-L]-\d{2}-\d{2}$/)) {
      // If code reaches here, it means the ID was not properly set by a previous `_onEdit` iteration.
      // This should ideally be handled within `_onEdit`'s ID generation block.
      // If this is a subsequent edit to a row where the ID was just generated, `requestId` will now have a value.
      console.log(`onEditRequestsSheet: Request ID is missing or malformed for row ${row}. Skipping status update.`);
      return;
    }

    // --- Core Logic for Status Update ---
    // If the edit is in column A (Request ID), or the 'Riders Needed' or 'Riders Assigned' columns:
    const ridersNeededColIdx = requestsData.columnMap[CONFIG.columns.requests.ridersNeeded];
    const ridersAssignedColIdx = requestsData.columnMap[CONFIG.columns.requests.ridersAssigned];

    // Convert 0-indexed column map values to 1-indexed for comparison with 'col'
    const ridersNeededCol1Idx = (ridersNeededColIdx !== undefined) ? ridersNeededColIdx + 1 : -1;
    const ridersAssignedCol1Idx = (ridersAssignedColIdx !== undefined) ? ridersAssignedColIdx + 1 : -1;

    console.log(`onEditRequestsSheet: Script expects "Riders Needed" (1-indexed): ${ridersNeededCol1Idx}, "Riders Assigned" (1-indexed): ${ridersAssignedCol1Idx}`);
    console.log(`onEditRequestsSheet: Actual edited column (1-indexed): ${col}`);

    if (col === 1 || col === ridersNeededCol1Idx || col === ridersAssignedCol1Idx) {
      console.log(`onEditRequestsSheet: Calling updateRequestStatusBasedOnRiders for ID ${requestId} due to edit in col ${col}.`);
      updateRequestStatusBasedOnRiders(requestId);
    } else {
      console.log(`onEditRequestsSheet: Edit in column ${col} (not a trigger column for status update) for ID ${requestId}, skipping status update.`);
    }

  } catch (error) {
    logError("Error in onEditRequestsSheet", error);
  }
}

/**
 * Updates a request's status based on the number of assigned riders and riders needed.
 * Designed to be called from onEditRequestsSheet.
 * @param {string} requestId The ID of the request to update.
 */
function updateRequestStatusBasedOnRiders(requestId) {
  try {
    const requestsData = getRequestsData(false); // Get fresh data for lookups

    const requestColMap = requestsData.columnMap;
    let requestDataRow = null;

    for (let i = 0; i < requestsData.data.length; i++) {
      if (String(getColumnValue(requestsData.data[i], requestColMap, CONFIG.columns.requests.id) || '').trim().toLowerCase() === String(requestId || '').trim().toLowerCase()) {
        requestDataRow = requestsData.data[i];
        break;
      }
    }

    if (!requestDataRow) {
      logError(`updateRequestStatusBasedOnRiders: Request ID ${requestId} not found.`);
      return;
    }

    const ridersNeeded = parseInt(getColumnValue(requestDataRow, requestColMap, CONFIG.columns.requests.ridersNeeded) || 0);
    const assignedNamesString = String(getColumnValue(requestDataRow, requestColMap, CONFIG.columns.requests.ridersAssigned) || '').trim();

    const actualAssignedCount = assignedNamesString ?
      assignedNamesString.split(/[\n,]/).filter(name => name.trim() !== '' && name.trim().toLowerCase() !== 'tbd').length : 0;

    let determinedNewStatus;
    if (actualAssignedCount === 0) {
      determinedNewStatus = 'Unassigned';
    } else if (actualAssignedCount < ridersNeeded) {
      determinedNewStatus = 'Unassigned';
    } else {
      determinedNewStatus = 'Assigned';
    }

    updateRequestStatus(requestId, determinedNewStatus);
    logActivity(`Status set for request ${requestId} to ${determinedNewStatus} after rider check.`);

  } catch (error) {
    logError(`Error in updateRequestStatusBasedOnRiders for request ${requestId}`, error);
  }
}

/**
 * Function to generate a Request ID based on the specified format: M-##-YY
 * Example: A-01-24 (January 2024, first request)
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The Requests sheet.
 * @returns {string} The formatted unique request ID.
 */
function generateRequestId(sheet) {
  try {
    const now = new Date();
    const monthIndex = now.getMonth();
    const year = now.getFullYear().toString().slice(-2);

    const monthLetter = "ABCDEFGHIJKL".charAt(monthIndex);

    const data = sheet.getDataRange().getValues();
    const existingIds = data.slice(1)
      .map(row => row[0])
      .filter(id => id && typeof id === 'string')
      .filter(id => id.startsWith(monthLetter + "-"));

    const sequenceNumbers = existingIds
      .map(id => {
        const match = id.match(/^[A-L]-(\d+)-\d{2}$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => !isNaN(num));

    let nextSequence = 1;
    if (sequenceNumbers.length > 0) {
      nextSequence = Math.max(...sequenceNumbers) + 1;
    }

    const paddedSequence = nextSequence.toString().padStart(2, '0');

    return `${monthLetter}-${paddedSequence}-${year}`;
  } catch (error) {
    logError("Error generating Request ID", error);
    return `ERR-${Math.floor(Math.random() * 9999)}-${new Date().getFullYear().toString().slice(-2)}`;
  }
}

/**
 * Generates all missing Request IDs in the Requests sheet.
 */
function generateAllMissingRequestIds() {
  try {
    const ss = SpreadsheetApp.getActive();
    const requestsSheet = ss.getSheetByName(CONFIG.sheets.requests);

    if (!requestsSheet) {
      SpreadsheetApp.getUi().alert("Requests sheet not found");
      return;
    }

    const data = requestsSheet.getDataRange().getValues();
    let generatedCount = 0;

    for (let i = 1; i < data.length; i++) {
      const currentId = data[i][0];
      const hasValidId = currentId && typeof currentId === 'string' && currentId.match(/^[A-L]-\d{2}-\d{2}$/);

      if (!hasValidId && (data[i].some(cell => cell !== ''))) {
        const newId = generateRequestId(requestsSheet);
        requestsSheet.getRange(i + 1, 1).setValue(newId);
        generatedCount++;
      }
    }

    if (generatedCount > 0) {
      SpreadsheetApp.getUi().alert(`Generated ${generatedCount} new Request IDs`);
      logActivity(`Generated ${generatedCount} missing Request IDs`);
    } else {
      SpreadsheetApp.getUi().alert("No missing Request IDs found");
    }

  } catch (error) {
    logError("Error in generateAllMissingRequestIds", error);
    SpreadsheetApp.getUi().alert("Error: " + error.toString());
  }
}
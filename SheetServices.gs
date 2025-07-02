/**
 * @fileoverview
 * This file provides utility functions for interacting with Google Sheets (from former SheetUtils.js)
 * and specific data retrieval and manipulation functions (from former DataService.js and RequestId.js).
 * It serves as a data access and sheet interaction layer for the application.
 */

// --- Content from SheetUtils.js ---

/**
 * Gets the currently active Google Spreadsheet.
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet} The active spreadsheet.
 */
function getSpreadsheet() {
  return SpreadsheetApp.getActive();
}

/**
 * Gets a sheet by its name from the active spreadsheet.
 * Throws an error if the sheet is not found.
 * @param {string} sheetName The name of the sheet to retrieve.
 * @return {GoogleAppsScript.Spreadsheet.Sheet} The found sheet object.
 * @throws {Error} If a sheet with the given name is not found.
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }
  return sheet;
}

/**
 * Gets a sheet by name, or creates it if it doesn't exist.
 * If created, optionally adds headers to the first row.
 * @param {string} sheetName The name of the sheet.
 * @param {Array<string>} [headers=[]] An array of strings to set as headers if the sheet is created.
 * @return {GoogleAppsScript.Spreadsheet.Sheet} The existing or newly created sheet object.
 */
function getOrCreateSheet(sheetName, headers = []) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length)
        .setValues([headers])
        .setFontWeight('bold')
        .setBackground('#f3f3f3')
        .setFrozenRows(1);
    }
    logActivity(`Created sheet: ${sheetName}`); // Assumes logActivity is defined
  }

  return sheet;
}

/**
 * Retrieves all data from a specified sheet and structures it.
 * Includes headers, data rows, a column map (header name to index), and a sheet reference.
 * Implements caching using the global `dataCache` object.
 * @param {string} sheetName The name of the sheet to get data from.
 * @param {boolean} [useCache=true] Whether to attempt to load from cache first.
 * @return {object} An object containing:
 *                  `headers` (Array<string>),
 *                  `data` (Array<Array<any>>),
 *                  `columnMap` (Object<string, number>),
 *                  `sheet` (GoogleAppsScript.Spreadsheet.Sheet).
 *                  Returns an empty structure on error or if sheet is empty.
 */
function getSheetData(sheetName, useCache = true) {
  const cacheKey = `sheet_${sheetName}`;

  if (useCache) {
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;
  }

  try {
    const sheet = getSheet(sheetName);
    const range = sheet.getDataRange();
    const values = range.getValues();

    if (values.length === 0) {
      return {
        headers: [],
        data: [],
        columnMap: {},
        sheet: sheet
      };
    }

    const headers = values[0];
    const data = values.slice(1);

    const columnMap = {};
    headers.forEach((header, index) => {
      columnMap[header] = index;
    });

    const result = {
      headers,
      data,
      columnMap,
      sheet
    };

    if (useCache) {
      dataCache.set(cacheKey, result);
    }

    return result;
  } catch (error) {
    logError(`Error getting data from ${sheetName}`, error); // Assumes logError is defined
    return {
      headers: [],
      data: [],
      columnMap: {},
      sheet: getSheet(sheetName)
    };
  }
}

/**
 * Finds the first column index in a header row that includes a given search term (case-insensitive).
 * @param {Array<string>} headers An array of header strings.
 * @param {string} searchTerm The term to search for within the header strings.
 * @return {number} The 0-based index of the found column, or -1 if not found.
 */
function findColumn(headers, searchTerm) {
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].toString().toLowerCase().includes(searchTerm.toLowerCase())) {
      return i;
    }
  }
  return -1;
}

/**
 * Get column value from row using column name.
 * @param {Array<any>} row The data row array.
 * @param {Object.<string, number>} columnMap The column name to index map.
 * @param {string} columnName The name of the column to retrieve.
 * @return {any} The value of the column, or null if not found or if row/columnMap is invalid.
 */
function normalizeColumnName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ');
}

function getColumnIndex(columnMap, columnName) {
  if (!columnMap || !columnName) return undefined;
  if (columnMap.hasOwnProperty(columnName)) {
    return columnMap[columnName];
  }
  const normalized = normalizeColumnName(columnName);
  for (const [name, idx] of Object.entries(columnMap)) {
    if (normalizeColumnName(name) === normalized) {
      return idx;
    }
  }
  return undefined;
}

function getColumnValue(row, columnMap, columnName) {
  if (!row || !columnMap || !columnName) return null; // Basic validation
  const index = getColumnIndex(columnMap, columnName);
  return index !== undefined && index < row.length ? row[index] : null;
}

/**
 * Set column value in row using column name.
 * @param {Array<any>} row The data row array.
 * @param {Object.<string, number>} columnMap The column name to index map.
 * @param {string} columnName The name of the column to set.
 * @param {any} value The value to set.
 * @return {void}
 */
function setColumnValue(row, columnMap, columnName, value) {
  if (!row || !columnMap || !columnName) return; // Basic validation
  const index = getColumnIndex(columnMap, columnName);
  if (index === undefined) return;
  row[index] = value;
}

/**
 * Apply formatting to any data structure for client-side display.
 * This function recursively processes objects and arrays, focusing on date/time fields.
 * Handles ISO strings and Date objects for proper display.
 * @param {any} data The data structure to format.
 * @return {any} The formatted data structure.
 */
function applyTimeFormatting(data) {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  if (data instanceof Date) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => applyTimeFormatting(item));
  }

  const formatted = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];

      if (typeof value === 'string' && (value.includes('T') && value.includes('Z'))) {
        if (key.toLowerCase().includes('date')) {
          formatted[key] = formatDateForDisplay(value); // Assumes formatDateForDisplay is defined
        } else if (key.toLowerCase().includes('time')) {
          formatted[key] = formatTimeForDisplay(value); // Assumes formatTimeForDisplay is defined
        } else if (key.toLowerCase().includes('updated')) {
          formatted[key] = formatDateTimeForDisplay(value); // Assumes formatDateTimeForDisplay is defined
        } else {
          formatted[key] = value;
        }
      } else if (value instanceof Date) {
        if (key.toLowerCase().includes('date')) {
          formatted[key] = formatDateForDisplay(value);
        } else if (key.toLowerCase().includes('time')) {
          formatted[key] = formatTimeForDisplay(value);
        } else if (key.toLowerCase().includes('updated')) {
          formatted[key] = formatDateTimeForDisplay(value);
        } else {
          formatted[key] = value;
        }
      } else if (typeof value === 'number' && (key.toLowerCase().includes('time') || key.toLowerCase().includes('date'))) {
        if (key.toLowerCase().includes('date')) {
          formatted[key] = formatDateForDisplay(value);
        } else if (key.toLowerCase().includes('time')) {
          formatted[key] = formatTimeForDisplay(value);
        } else {
          formatted[key] = applyTimeFormatting(value);
        }
      } else {
        formatted[key] = applyTimeFormatting(value);
      }
    }
  }
  return formatted;
}

// --- Content from DataService.js ---

/**
 * Retrieves all data from the "Requests" sheet.
 * Uses `getSheetData` which includes caching.
 * @param {boolean} [useCache=true] Whether to use cached data.
 * @return {object} An object containing headers, data rows, columnMap, and sheet reference for "Requests".
 */
function getRequestsData(useCache = true) {
  const data = getSheetData(CONFIG.sheets.requests, useCache);
  return data;
}

/**
 * Retrieves all data from the "Riders" sheet.
 * Uses `getSheetData` which includes caching.
 * FIXED: Removed reference to undefined filterValidRidersData function
 * @param {boolean} [useCache=true] Whether to use cached data.
 * @return {object} An object containing headers, data rows, columnMap, and sheet reference for "Riders".
 */
function getRidersData(useCache = true) {
  const cacheKey = `sheet_${CONFIG.sheets.riders}`;

  if (useCache) {
    const cached = dataCache.get(cacheKey);
    if (cached) {
      // Apply filtering to cached data as well
      return applyRidersDataFiltering(cached);
    }
  }

  try {
    const sheet = getSheet(CONFIG.sheets.riders);
    const range = sheet.getDataRange();
    const values = range.getValues();

    if (values.length === 0) {
      return {
        headers: [],
        data: [],
        columnMap: {},
        sheet: sheet
      };
    }

    const headers = values[0];
    const allData = values.slice(1);

    const columnMap = {};
    headers.forEach((header, index) => {
      columnMap[header] = index;
    });

    // FILTER OUT EMPTY ROWS HERE - this is the key fix
    const validData = allData.filter(row => {
      const nameIdx = columnMap[CONFIG.columns.riders.name];
      const idIdx = columnMap[CONFIG.columns.riders.jpNumber];
      
      const name = nameIdx !== undefined ? String(row[nameIdx] || '').trim() : '';
      const riderId = idIdx !== undefined ? String(row[idIdx] || '').trim() : '';
      
      // Only include rows that have either a name OR an ID
      return name.length > 0 || riderId.length > 0;
    });

    const result = {
      headers,
      data: validData, // Use filtered data instead of allData
      columnMap,
      sheet
    };

    if (useCache) {
      dataCache.set(cacheKey, result);
    }

    console.log(`✅ getRidersData: Filtered ${allData.length} total rows to ${validData.length} valid riders`);
    return result;

  } catch (error) {
    logError(`Error getting data from ${CONFIG.sheets.riders}`, error);
    return {
      headers: [],
      data: [],
      columnMap: {},
      sheet: getSheet(CONFIG.sheets.riders)
    };
  }
}

/**
 * Helper function to apply riders data filtering
 * @param {object} ridersData - The riders data object
 * @return {object} Filtered riders data
 */
function applyRidersDataFiltering(ridersData) {
  if (!ridersData || !ridersData.data) {
    return ridersData;
  }

  const filteredData = ridersData.data.filter(row => {
    const nameIdx = ridersData.columnMap[CONFIG.columns.riders.name];
    const idIdx = ridersData.columnMap[CONFIG.columns.riders.jpNumber];
    
    const name = nameIdx !== undefined ? String(row[nameIdx] || '').trim() : '';
    const riderId = idIdx !== undefined ? String(row[idIdx] || '').trim() : '';
    
    // Only include rows that have either a name OR an ID
    return name.length > 0 || riderId.length > 0;
  });

  return {
    ...ridersData,
    data: filteredData
  };
}
function getTotalRiderCount() {
  try {
    console.log('📊 Getting total rider count...');
    const ridersData = getRidersData();

    if (!ridersData || !ridersData.data || ridersData.data.length === 0) {
      return 0;
    }

    const columnMap = ridersData.columnMap;
    const nameIdx = columnMap[CONFIG.columns.riders.name];
    const jpNumberIdx = columnMap[CONFIG.columns.riders.jpNumber];

    let totalCount = 0;
    
    for (let i = 0; i < ridersData.data.length; i++) {
      const row = ridersData.data[i];
      const name = nameIdx !== undefined ? String(row[nameIdx] || '').trim() : '';
      const jpNumber = jpNumberIdx !== undefined ? String(row[jpNumberIdx] || '').trim() : '';
      
      // Count only rows with valid data
      if (name.length > 0 || jpNumber.length > 0) {
        totalCount++;
      }
    }
    
    console.log(`✅ Total riders count: ${totalCount}`);
    return totalCount;
  } catch (error) {
    console.error('❌ Error getting total rider count:', error);
    return 0;
  }
}

/**
 * Retrieves all data from the "Assignments" sheet.
 * Uses `getSheetData` which includes caching.
 * @param {boolean} [useCache=true] Whether to use cached data.
 * @return {object} An object containing headers, data rows, columnMap, and sheet reference for "Assignments".
 */
function getAssignmentsData(useCache = true) {
  const data = getSheetData(CONFIG.sheets.assignments, useCache);
  return data;
}

// REMOVED: Duplicate availability functions - use AvailabilityService.gs instead


/**
 * Retrieves rows of pending requests (status 'New', 'Pending', or 'Assigned').
 * @return {Array<Array<any>>} An array of row arrays, where each inner array represents a pending request.
 */
function getPendingRequests() {
  const requestsData = getRequestsData();
  const statusColName = CONFIG.columns.requests.status;

  return requestsData.data.filter(row => {
    const status = getColumnValue(row, requestsData.columnMap, statusColName);
    return ['New', 'Pending', 'Assigned'].includes(status);
  });
}

/**
 * Retrieves assignment rows for a specific request ID that are not completed or cancelled.
 * @param {string} requestId The ID of the request to find assignments for.
 * @return {Array<Array<any>>} An array of row arrays, where each inner array represents an assignment for the request.
 */
function getAssignmentsForRequest(requestId) {
  const assignmentsData = getAssignmentsData();
  const requestIdColName = CONFIG.columns.assignments.requestId;
  const statusColName = CONFIG.columns.assignments.status;

  return assignmentsData.data.filter(row => {
    const rowRequestId = String(getColumnValue(row, assignmentsData.columnMap, requestIdColName) || '').trim().toLowerCase();
    const targetRequestId = String(requestId || '').trim().toLowerCase();
    const status = getColumnValue(row, assignmentsData.columnMap, statusColName);

    return rowRequestId === targetRequestId && !['Completed', 'Cancelled'].includes(status);
  });
}

/**
 * Retrieves assignment rows for a specific rider on a given date that are not completed, cancelled, or no-shows.
 * @param {string} riderName The name of the rider.
 * @param {Date} date The date to check for assignments. The time part of the date is ignored.
 * @param {object} [rawAssignmentsData=null] Optional raw assignments data object (with headers, data, columnMap) to use instead of fetching.
 * @return {Array<Array<any>>} An array of row arrays, representing assignments for the rider on that date.
 */
function getRiderAssignmentsForDate(riderName, date, rawAssignmentsData = null) {
  const assignmentsData = rawAssignmentsData || getAssignmentsData();
  const riderColName = CONFIG.columns.assignments.riderName; // Corrected to use consistent naming if changed in CONFIG
  const dateColName = CONFIG.columns.assignments.eventDate;   // Corrected
  const statusColName = CONFIG.columns.assignments.status; // Corrected

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  if (!assignmentsData || !assignmentsData.data) {
    logError('No assignments data available in getRiderAssignmentsForDate'); // Assumes logError is defined
    return [];
  }

  return assignmentsData.data.filter(row => {
    const rowRider = getColumnValue(row, assignmentsData.columnMap, riderColName);
    const eventDateValue = getColumnValue(row, assignmentsData.columnMap, dateColName);
    const status = getColumnValue(row, assignmentsData.columnMap, statusColName);

    if (rowRider !== riderName || !eventDateValue) return false;

    let eventDate;
    if (eventDateValue instanceof Date) {
      eventDate = eventDateValue;
    } else if (typeof eventDateValue === 'string' && eventDateValue.includes('T')) {
      eventDate = new Date(eventDateValue);
    } else if (typeof eventDateValue === 'number') {
      eventDate = new Date((eventDateValue - 25569) * 86400 * 1000);
    } else {
      eventDate = new Date(eventDateValue);
    }

    if (!eventDate || isNaN(eventDate.getTime())) return false;

    eventDate.setHours(0, 0, 0, 0);

    return eventDate.getTime() === targetDate.getTime() &&
           !['Completed', 'Cancelled', 'No Show'].includes(status);
  });
}


/**
 * Get active riders based on sheet data and status column.
 * @param {object} [rawRidersData=null] Optional raw riders data to use.
 * @return {Array<Array<any>>} An array of active rider data rows.
 */
function getActiveRidersCount(rawRidersData = null) {
  try {
    console.log('🔄 Getting active riders count with consistent logic...');
    const currentRidersData = rawRidersData || getRidersData();

    if (!currentRidersData || !currentRidersData.data || currentRidersData.data.length === 0) {
      console.log('📊 No rider data found.');
      return 0;
    }

    const riders = currentRidersData.data;
    const columnMap = currentRidersData.columnMap;

    const statusIdx = columnMap[CONFIG.columns.riders.status];
    const nameIdx = columnMap[CONFIG.columns.riders.name];
    const jpNumberIdx = columnMap[CONFIG.columns.riders.jpNumber];

    let activeCount = 0;
    
    for (let i = 0; i < riders.length; i++) {
      const row = riders[i];
      try {
        const name = nameIdx !== undefined ? String(row[nameIdx] || '').trim() : '';
        const jpNumber = jpNumberIdx !== undefined ? String(row[jpNumberIdx] || '').trim() : '';
        
        // CONSISTENT LOGIC: Must have either name OR JP number to be counted
        const hasValidIdentifier = name.length > 0 || jpNumber.length > 0;
        
        if (!hasValidIdentifier) {
          continue; // Skip rows without valid identifier
        }
        
        // Check status (default to active if no status column or empty status)
        if (statusIdx !== undefined) {
          const status = String(row[statusIdx] || '').toLowerCase().trim();
          if (!status || status === 'active' || status === 'available') {
            activeCount++;
          }
        } else {
          // If no status column, count as active
          activeCount++;
        }
        
      } catch (rowError) {
        console.log(`⚠️ Error processing rider row ${i}:`, rowError);
      }
    }
    
    console.log(`✅ Active riders count (consistent): ${activeCount}`);
    return activeCount;
    
  } catch (error) {
    console.error('❌ Error getting active riders count:', error);
    logError('Error getting active riders count:', error);
    return 0;
  }
}

/**
 * Calculates and returns the count of active riders.
 * An active rider is defined as one with a name and a status of 'Active', 'Available', or no status.
 * @param {object} [rawRidersData=null] Optional raw riders data object to use instead of fetching.
 * @return {number} The count of active riders. Returns 0 on error or if no data.
 */
function getActiveRidersCount(rawRidersData = null) {
  try {
    console.log('🔄 Getting active riders count...');
    const currentRidersData = rawRidersData || getRidersData();

    if (!currentRidersData || !currentRidersData.data || currentRidersData.data.length === 0) {
      console.log('📊 No rider data found.');
      return 0;
    }

    const riders = currentRidersData.data;
    const columnMap = currentRidersData.columnMap;

    const statusIdx = columnMap[CONFIG.columns.riders.status];
    const nameIdx = columnMap[CONFIG.columns.riders.name];
    const jpNumberIdx = columnMap[CONFIG.columns.riders.jpNumber];

    let activeCount = 0;
    for (let i = 0; i < riders.length; i++) {
      const row = riders[i];
      try {
        const hasName = nameIdx !== undefined && row[nameIdx] && String(row[nameIdx]).trim().length > 0;
        const hasJpNumber = jpNumberIdx !== undefined && row[jpNumberIdx] && String(row[jpNumberIdx]).trim().length > 0;
        if (!hasName && !hasJpNumber) continue;
        if (statusIdx !== undefined) {
          const status = String(row[statusIdx] || '').toLowerCase().trim();
          if (!status || status === 'active' || status === 'available') activeCount++;
        } else {
          activeCount++;
        }
      } catch (rowError) { console.log(`⚠️ Error processing rider row ${i}:`, rowError); }
    }
    console.log(`✅ Active riders count: ${activeCount}`);
    return activeCount;
  } catch (error) {
    console.error('❌ Error getting active riders count:', error);
    logError('Error getting active riders count:', error); // Assumes logError is defined
    return 0;
  }
}

// --- Content from RequestId.js ---

/**
 * An onEdit trigger function specifically for the "Requests" sheet.
 * If a Request ID is missing in an edited row (and the row is not empty), it generates one.
 * It also triggers `updateRequestStatusBasedOnRiders` if the Request ID, 'Riders Needed',
 * or 'Riders Assigned' columns are edited.
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e The onEdit event object from Google Sheets.
 * @return {void}
 */
function onEditRequestsSheet(e) {
  try {
    if (!e || !e.range || e.range.getSheet().getName() !== CONFIG.sheets.requests) {
      console.log(`onEditRequestsSheet: Not on Requests sheet or outside range, exiting.`);
      return;
    }

    const row = e.range.getRow();
    const col = e.range.getColumn();
    const sheet = e.range.getSheet();

    if (row < 2) {
      console.log('onEditRequestsSheet: Edit on header row, exiting.');
      return;
    }

    const requestIdCell = sheet.getRange(row, 1);
    requestIdCell.setNumberFormat('@');

    let requestId = requestIdCell.getValue();
    const requestsData = getRequestsData();

    if (!requestId || typeof requestId !== 'string' || !requestId.match(/^[A-L]-\d{2}-\d{2}$/)) {
      console.log(`onEditRequestsSheet: Request ID is missing or malformed for row ${row}. Skipping status update.`);
      return;
    }

    const ridersNeededColIdx = requestsData.columnMap[CONFIG.columns.requests.ridersNeeded];
    const ridersAssignedColIdx = requestsData.columnMap[CONFIG.columns.requests.ridersAssigned];
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

    if (typeof syncRequestToCalendar === 'function') {
      try {
        syncRequestToCalendar(requestId);
      } catch (syncError) {
        logError(`Failed to sync request ${requestId} to calendar`, syncError);
      }
    }

  } catch (error) {
    logError("Error in onEditRequestsSheet", error); // Assumes logError is defined
  }
}

/**
 * Updates a request's status (e.g., 'Unassigned', 'Assigned') based on the number
 * of riders needed versus the number of riders actually assigned.
 * This function is typically called after an edit to the 'Riders Needed' or 'Riders Assigned' columns.
 *
 * @param {string} requestId The ID of the request to update.
 * @return {void}
 */
function updateRequestStatusBasedOnRiders(requestId) {
  try {
    const requestsData = getRequestsData(false);

    const requestColMap = requestsData.columnMap;
    let requestDataRow = null;
    let requestRowIndex = -1;

    for (let i = 0; i < requestsData.data.length; i++) {
      if (String(getColumnValue(requestsData.data[i], requestColMap, CONFIG.columns.requests.id) || '').trim().toLowerCase() === String(requestId || '').trim().toLowerCase()) {
        requestDataRow = requestsData.data[i];
        requestRowIndex = i + 2;
        break;
      }
    }

    if (!requestDataRow) {
      logError(`updateRequestStatusBasedOnRiders: Request ID ${requestId} not found.`);
      return;
    }

    const ridersNeeded = parseInt(getColumnValue(requestDataRow, requestColMap, CONFIG.columns.requests.ridersNeeded) || 0);
    const assignedNamesString = String(getColumnValue(requestDataRow, requestColMap, CONFIG.columns.requests.ridersAssigned) || '').trim();
    const currentStatus = String(getColumnValue(requestDataRow, requestColMap, CONFIG.columns.requests.status) || '').trim();

    const actualAssignedCount = assignedNamesString ?
      assignedNamesString.split(/[\n,]/).map(name => name.trim()).filter(name => name.length > 0 && name.toLowerCase() !== 'tbd').length : 0;

    let determinedNewStatus;
    if (currentStatus === 'Completed' || currentStatus === 'Cancelled') {
        determinedNewStatus = currentStatus;
    } else if (actualAssignedCount === 0) {
      determinedNewStatus = 'Unassigned';
    } else if (actualAssignedCount < ridersNeeded) {
      determinedNewStatus = 'Unassigned';
    } else {
      determinedNewStatus = 'Assigned';
    }

    if (currentStatus !== determinedNewStatus) {
      const statusColIdx = requestColMap[CONFIG.columns.requests.status];
      if (statusColIdx !== undefined && requestRowIndex > 0) {
        requestsData.sheet.getRange(requestRowIndex, statusColIdx + 1).setValue(determinedNewStatus);
        const lastUpdatedColIdx = requestColMap[CONFIG.columns.requests.lastUpdated];
        if (lastUpdatedColIdx !== undefined) {
            requestsData.sheet.getRange(requestRowIndex, lastUpdatedColIdx + 1).setValue(new Date());
        }
        logActivity(`Status automatically updated for request ${requestId} to ${determinedNewStatus}.`);
      } else {
        logError(`Could not update status for ${requestId}: Status column or row index invalid.`);
      }
    } else {
      console.log(`Status for ${requestId} remains ${currentStatus}. No update needed.`);
    }

  } catch (error) {
    logError(`Error in updateRequestStatusBasedOnRiders for request ${requestId}`, error);
  }
}

/**
 * Generates a unique Request ID based on the current month, year, and a sequence number.
 * The format is M-##-YY (e.g., A-01-24 for January 2024, first request).
 * It checks existing IDs in the sheet to determine the next sequence number for the current month and year.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The "Requests" sheet object.
 * @return {string} The formatted unique request ID (e.g., "A-01-24").
 *                  Returns an error-formatted ID on failure.
 */
function generateRequestId(sheet) {
  try {
    const now = new Date();
    const monthIndex = now.getMonth();
    const year = now.getFullYear().toString().slice(-2);
    const monthLetter = "ABCDEFGHIJKL".charAt(monthIndex);
    const idPrefix = `${monthLetter}-`;
    const idSuffix = `-${year}`;

    const data = sheet.getDataRange().getValues();
    const existingIdsThisMonthYear = data.slice(1)
      .map(row => row[0])
      .filter(id => id && typeof id === 'string' && id.startsWith(idPrefix) && id.endsWith(idSuffix));

    const sequenceNumbers = existingIdsThisMonthYear
      .map(id => {
        const match = id.match(/^[A-L]-(\d+)-\d{2}$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => !isNaN(num));

    let nextSequence = 1;
    if (sequenceNumbers.length > 0) {
      nextSequence = Math.max(0, ...sequenceNumbers) + 1; // Ensure Math.max doesn't get -Infinity
    }

    const paddedSequence = nextSequence.toString().padStart(2, '0');
    return `${idPrefix}${paddedSequence}${idSuffix}`;
  } catch (error) {
    logError("Error generating Request ID", error); // Assumes logError is defined
    return `ERR-${Math.floor(Math.random() * 9999)}-${new Date().getFullYear().toString().slice(-2)}`;
  }
}

/**
 * Iterates through the "Requests" sheet and generates Request IDs for any rows
 * that are missing a valid ID but contain other data.
 * This is useful for backfilling IDs or fixing data import issues.
 * Displays an alert with the count of generated IDs.
 * @return {void}
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

    for (let i = 1; i < data.length; i++) { // Start from row 2 (index 1)
      const currentId = data[i][0]; // Assuming ID is in the first column
      // Check if ID is missing/invalid AND if other cells in the row have data (to avoid filling empty rows)
      const rowHasData = data[i].slice(1).some(cell => cell !== null && cell !== '');

      if (rowHasData && (!currentId || typeof currentId !== 'string' || !currentId.match(/^[A-L]-\d{2}-\d{2}$/))) {
        const newId = generateRequestId(requestsSheet);
        requestsSheet.getRange(i + 1, 1).setValue(newId).setNumberFormat('@');
        generatedCount++;
      }
    }

    if (generatedCount > 0) {
      SpreadsheetApp.getUi().alert(`Generated ${generatedCount} new Request IDs`);
      logActivity(`Generated ${generatedCount} missing Request IDs`); // Assumes logActivity is defined
    } else {
      SpreadsheetApp.getUi().alert("No missing Request IDs found or rows with data needing IDs.");
    }

  } catch (error) {
    logError("Error in generateAllMissingRequestIds", error); // Assumes logError is defined
    SpreadsheetApp.getUi().alert("Error: " + error.toString());
  }
}

// --- End of Content from RequestId.js ---

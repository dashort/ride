/**
 * Get the current active spreadsheet
 */
function getSpreadsheet() {
  return SpreadsheetApp.getActive();
}

/**
 * Get sheet by name with error handling
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
 * Get or create sheet with headers
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
    logActivity(`Created sheet: ${sheetName}`);
  }

  return sheet;
}
function getSheetData(sheetName, useCache = true) {
  const cacheKey = `sheet_${sheetName}`;

  if (useCache) {
    const cached = dataCache.get(cacheKey);
    if (cached) {
      if (sheetName === 'Dashboard' || sheetName === 'Requests' || sheetName === 'Assignments') {
        // Apply formatting directly to all fetched data for display consistency
        return applyTimeFormatting(cached);
      }
      return cached;
    }
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
    
    // Apply formatting to fresh data before returning
    if (sheetName === 'Dashboard' || sheetName === 'Requests' || sheetName === 'Assignments') {
      return applyTimeFormatting(result);
    }

    return result;
  } catch (error) {
    logError(`Error getting data from ${sheetName}`, error);
    return {
      headers: [],
      data: [],
      columnMap: {},
      sheet: getSheet(sheetName)
    };
  }
}
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
    logActivity(`Created sheet: ${sheetName}`);
  }

  return sheet;
}
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
        sheet: sheet // Always include sheet reference for consistency
      };
    }

    const headers = values[0];
    const data = values.slice(1);

    // Create column mapping for easy access
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
    logError(`Error getting data from ${sheetName}`, error);
    return {
      headers: [],
      data: [],
      columnMap: {},
      sheet: getSheet(sheetName) // Return sheet even on error for some operations
    };
  }
}
function findColumn(headers, searchTerm) {
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].toString().toLowerCase().includes(searchTerm.toLowerCase())) {
      return i;
    }
  }
  return -1;
}

/**
 * Get column value from row using column name
 * @param {any[]} row The data row array.
 * @param {Object.<string, number>} columnMap The column name to index map.
 * @param {string} columnName The name of the column to retrieve.
 * @returns {any} The value of the column, or null if not found.
 */
function getColumnValue(row, columnMap, columnName) {
  const index = columnMap[columnName];
  return index !== undefined ? row[index] : null;
}

/**
 * Set column value in row using column name
 * @param {any[]} row The data row array.
 * @param {Object.<string, number>} columnMap The column name to index map.
 * @param {string} columnName The name of the column to set.
 * @param {any} value The value to set.
 */
function setColumnValue(row, columnMap, columnName, value) {
  const index = columnMap[columnName];
  if (index !== undefined) {
    row[index] = value;
  }
}

/**
 * Apply formatting to any data structure for client-side display.
 * This function recursively processes objects and arrays, focusing on date/time fields.
 * Handles ISO strings and Date objects for proper display.
 * @param {any} data The data structure to format.
 * @returns {any} The formatted data structure.
 */
function applyTimeFormatting(data) {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  if (data instanceof Date) {
    return data; // Dates are dates, handled by specific format functions
  }

  if (Array.isArray(data)) {
    return data.map(item => applyTimeFormatting(item));
  }

  const formatted = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];

      if (typeof value === 'string' && (value.includes('T') && value.includes('Z'))) {
        // This looks like an ISO string
        if (key.toLowerCase().includes('date')) {
          formatted[key] = formatDateForDisplay(value);
        } else if (key.toLowerCase().includes('time')) {
          formatted[key] = formatTimeForDisplay(value);
        } else if (key.toLowerCase().includes('updated')) { // For Last Updated
          formatted[key] = formatDateTimeForDisplay(value);
        } else {
          formatted[key] = value; // Keep non-date/time ISO strings as is
        }
      } else if (value instanceof Date) {
        // If it's a Date object, always prefer it for date/time fields
        if (key.toLowerCase().includes('date')) {
          formatted[key] = formatDateForDisplay(value);
        } else if (key.toLowerCase().includes('time')) {
          formatted[key] = formatTimeForDisplay(value);
        } else if (key.toLowerCase().includes('updated')) {
          formatted[key] = formatDateTimeForDisplay(value);
        } else {
          formatted[key] = value; // Keep Date objects in other fields as is
        }
      } else if (typeof value === 'number' && (key.toLowerCase().includes('time') || key.toLowerCase().includes('date'))) {
         // Handle Excel serial numbers for display
        if (key.toLowerCase().includes('date')) {
          formatted[key] = formatDateForDisplay(value);
        } else if (key.toLowerCase().includes('time')) {
          formatted[key] = formatTimeForDisplay(value);
        } else {
          formatted[key] = applyTimeFormatting(value);
        }
      } else {
        formatted[key] = applyTimeFormatting(value); // Recursively format nested objects/arrays
      }
    }
  }
  return formatted;
}

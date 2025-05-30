function getRequestsData(useCache = true) {
  const data = getSheetData(CONFIG.sheets.requests, useCache);
  return data;
}

/**
 * Get all riders data
 * @param {boolean} useCache Whether to use cached data.
 * @returns {Object} riders data, headers, columnMap.
 */
function getRidersData(useCache = true) {
  const data = getSheetData(CONFIG.sheets.riders, useCache);
  return data;
}

/**
 * Get all assignments data
 * @param {boolean} useCache Whether to use cached data.
 * @returns {Object} assignments data, headers, columnMap.
 */
function getAssignmentsData(useCache = true) {
  const data = getSheetData(CONFIG.sheets.assignments, useCache);
  return data;
}


/**
 * Get pending requests
 * @returns {any[][]} Array of pending request rows.
 */
function getPendingRequests() {
  const requestsData = getRequestsData();
  const statusCol = CONFIG.columns.requests.status;

  return requestsData.data.filter(row => {
    const status = getColumnValue(row, requestsData.columnMap, statusCol);
    return ['New', 'Pending', 'Assigned'].includes(status); // Statuses that suggest active requests
  });
}

/**
 * Get assignments for a specific request
 * @param {string} requestId The ID of the request.
 * @returns {any[][]} Array of assignment rows for the request.
 */
function getAssignmentsForRequest(requestId) {
  const assignmentsData = getAssignmentsData();
  const requestIdCol = CONFIG.columns.assignments.requestId;
  const statusCol = CONFIG.columns.assignments.status;

  return assignmentsData.data.filter(row => {
    const rowRequestId = String(getColumnValue(row, assignmentsData.columnMap, requestIdCol) || '').trim().toLowerCase();
    const targetRequestId = String(requestId || '').trim().toLowerCase();
    const status = getColumnValue(row, assignmentsData.columnMap, statusCol);

    return rowRequestId === targetRequestId && !['Completed', 'Cancelled'].includes(status);
  });
}

/**
 * Get rider assignments for a date
 * @param {string} riderName The name of the rider.
 * @param {Date} date The date to check for assignments.
 * @returns {any[][]} Array of assignment rows for the rider on the specified date.
 */
function getRiderAssignmentsForDate(riderName, date) {
  const assignmentsData = getAssignmentsData();
  const riderCol = CONFIG.columns.assignments.riderName;
  const dateCol = CONFIG.columns.assignments.eventDate;
  const statusCol = CONFIG.columns.assignments.status;

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  return assignmentsData.data.filter(row => {
    const rowRider = getColumnValue(row, assignmentsData.columnMap, riderCol);
    const rowDate = getColumnValue(row, assignmentsData.columnMap, dateCol);
    const status = getColumnValue(row, assignmentsData.columnMap, statusCol);

    if (rowRider !== riderName || !(rowDate instanceof Date)) return false;

    const eventDate = new Date(rowDate);
    eventDate.setHours(0, 0, 0, 0);

    return eventDate.getTime() === targetDate.getTime() &&
      !['Completed', 'Cancelled'].includes(status);
  });
}


/**
 * Get active riders based on sheet data and status column.
 * @return {array} An array of active rider data rows.
 */
function getActiveRiders() {
  const ridersData = getRidersData();
  const statusCol = CONFIG.columns.riders.status;

  return ridersData.data.filter(row => {
    const status = getColumnValue(row, ridersData.columnMap, statusCol);
    const name = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.name);
    // Ensure rider has a name and is either 'Active' or has no status (implies active)
    return name && String(name).trim().length > 0 &&
           (!status || String(status).trim() === 'Active' || String(status).trim() === 'Available');
  });
}
function getActiveRidersCount() {
  try {
    console.log('🔄 Getting active riders count...');

    const ridersData = getRidersData();
    
    if (!ridersData || !ridersData.data || ridersData.data.length === 0) {
      console.log('📊 No rider data found.');
      return 0;
    }

    const riders = ridersData.data;
    const columnMap = ridersData.columnMap;

    const statusIdx = columnMap[CONFIG.columns.riders.status];
    const nameIdx = columnMap[CONFIG.columns.riders.name];
    const jpNumberIdx = columnMap[CONFIG.columns.riders.jpNumber];

    let activeCount = 0;

    for (let i = 0; i < riders.length; i++) {
      const row = riders[i];
      
      try {
        // Basic check if the row represents a rider
        const hasName = nameIdx !== undefined && row[nameIdx] && String(row[nameIdx]).trim().length > 0;
        const hasJpNumber = jpNumberIdx !== undefined && row[jpNumberIdx] && String(row[jpNumberIdx]).trim().length > 0;
        
        if (!hasName && !hasJpNumber) {
          continue; // Skip empty rows
        }
        
        // Check status
        if (statusIdx !== undefined) {
          const status = String(row[statusIdx] || '').toLowerCase().trim();
          if (!status || status === 'active' || status === 'available') {
            activeCount++;
          }
        } else {
          // If no status column, assume all riders with names are active
          activeCount++;
        }
      } catch (rowError) {
        console.log(`⚠️ Error processing rider row ${i}:`, rowError);
      }
    }

    console.log(`✅ Active riders count: ${activeCount}`);
    return activeCount;

  } catch (error) {
    console.error('❌ Error getting active riders count:', error);
    logError('Error getting active riders count:', error);
    return 0;
  }
}

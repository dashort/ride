function displayDashboardLayout() {
  try {
    const dashSheet = getSheet(CONFIG.sheets.dashboard);

    dashSheet.getRange('A1:Z200').breakApart(); // Clear any existing merged cells
    dashSheet.getRange('A1:Z10').clearContent().clearFormat(); // Clear top section

    // Main Title (A1:P1 merged)
    const mainTitleRange = dashSheet.getRange('A1:P1');
    mainTitleRange.merge();
    mainTitleRange
      .setValue('🏍️ Rider Integration & Deployment Engine Dashboard')
      .setFontWeight('bold')
      .setFontSize(16)
      .setBackground('#1f4e79')
      .setFontColor('#ffffff')
      .setHorizontalAlignment('center');

    // Summary Statistics Labels (starting at Column A / column 1)
    const sumStatCol = CONFIG.dashboard.summaryStatsStartCol;
    dashSheet.getRange(3, sumStatCol).setValue('📊 Summary Statistics').setFontWeight('bold');
    dashSheet.getRange(4, sumStatCol).setValue('Active Riders:').setFontWeight('bold');
    dashSheet.getRange(4, sumStatCol + 2).setValue('Pending Requests:').setFontWeight('bold');
    dashSheet.getRange(5, sumStatCol).setValue('Today\'s Assignments:').setFontWeight('bold');
    dashSheet.getRange(5, sumStatCol + 2).setValue('This Week:').setFontWeight('bold');
    dashSheet.getRange(6, sumStatCol).setValue('Total Requests:').setFontWeight('bold');
    dashSheet.getRange(6, sumStatCol + 2).setValue('Completed:').setFontWeight('bold');

    dashSheet.getRange('A3:P3').setBorder(false, false, true, false, false, false);

    // Rider Schedule Section Label
    const scheduleStartRow = CONFIG.dashboard.scheduleStartRow;
    const scheduleStartCol = CONFIG.dashboard.scheduleStartCol;
    dashSheet.getRange(scheduleStartRow, scheduleStartCol).setValue('🏍️ Rider Schedule - Next 7 Days').setFontWeight('bold').setFontSize(12);
    dashSheet.getRange(scheduleStartRow, scheduleStartCol, 1, 8).setBorder(false, false, true, false, false, false);

    logActivity('Dashboard layout displayed.');
  } catch (error) {
    logError('Error displaying dashboard layout', error);
  }
}

/**
 * Sets up the data validation dropdown for the dashboard filter cell.
 */
function setupDashboardFilterDropdown() {
  try {
    const dashSheet = getSheet(CONFIG.sheets.dashboard);
    const filterRange = dashSheet.getRange(CONFIG.dashboard.filterCell);

    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(CONFIG.dashboard.filterOptions)
      .setAllowInvalid(false)
      .setHelpText('Select a status to filter requests, or "All" to show all statuses.')
      .build();

    filterRange.setDataValidation(rule);

    if (!filterRange.getValue()) {
      filterRange.setValue('All');
    }

    dashSheet.getRange('A9').setValue('Show:').setFontWeight('bold');

    logActivity('Dashboard filter dropdown set up.');
  } catch (error) {
    logError('Error setting up dashboard filter dropdown', error);
  }
}

/**
 * Refreshes all dynamic content on the dashboard.
 * @param {boolean} forceUpdate If true, forces a cache clear and full update.
 * @returns {Object} Result of the refresh.
 */
function refreshDashboard(forceUpdate = false) {
  console.log(`🔄 Refreshing dashboard (forceUpdate: ${forceUpdate})...`);

  try {
    if (forceUpdate) {
      clearDashboardCache(); // Clear application-level cache
    }

    // Get current filter from dashboard
    const dashSheet = getSheet(CONFIG.sheets.dashboard);
    const filterStatus = dashSheet.getRange(CONFIG.dashboard.filterCell).getValue();

    // 1. Update summary statistics
    updateSummaryStatistics();

    // 2. Update requests display
    updateRequestsDisplay(filterStatus);
    
    // 3. Update rider schedule
    updateRiderScheduleSection();
    
    // 4. Apply conditional formatting and column sizing
    formatDashboardColumns();
    applyStatusColors(dashSheet, CONFIG.dashboard.requestsDisplayStartRow, CONFIG.dashboard.maxDisplayRows, 9); // Status column is 9

    logActivity('Dashboard refreshed successfully');
    return {
      success: true,
      message: 'Dashboard refreshed'
    };

  } catch (error) {
    logError('Error refreshing dashboard', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Update summary statistics on the dashboard.
 */
function updateSummaryStatistics() {
  try {
    const dashSheet = getSheet(CONFIG.sheets.dashboard);
    const startRow = 3;

    const stats = calculateDashboardStatistics();

    const statsData = [
      ['', stats.activeRiders, '', stats.pendingRequests],
      ['', stats.todayAssignments, '', stats.weekAssignments],
      ['', stats.totalRequests, '', stats.completedRequests]
    ];

    const sumStatCol = CONFIG.dashboard.summaryStatsStartCol;
    dashSheet.getRange(startRow + 1, sumStatCol + 1, 3, 1).setValues(statsData.map(row => [row[1]])); // Column B
    dashSheet.getRange(startRow + 1, sumStatCol + 3, 3, 1).setValues(statsData.map(row => [row[3]])); // Column D

    dashSheet.getRange(startRow + 1, sumStatCol + 1, 3, 1).setNumberFormat('0');
    dashSheet.getRange(startRow + 1, sumStatCol + 3, 3, 1).setNumberFormat('0');

    logActivity('Summary statistics updated');
    return true;
  } catch (error) {
    logError('Error updating summary statistics', error);
    return false;
  }
}

/**
 * Calculate dashboard statistics from various data sources.
 */
function calculateDashboardStatistics() {
  try {
    console.log('📊 Calculating dashboard statistics...');

    // Fetch all necessary raw data once
    const rawRequestsData = getRequestsData();
    const rawAssignmentsData = getAssignmentsData();
    // getActiveRidersCount already fetches riders data internally,
    // but if we need rawRidersData for other stats, fetch it here:
    // const rawRidersData = getRidersData(); 

    let activeRiders = 0;
    let pendingRequests = 0;
    let todayAssignments = 0;
    let weekAssignments = 0;
    let totalRequests = 0;
    let completedRequests = 0;

    // Calculate active riders count
    try {
      // getActiveRidersCount uses getRidersData() internally.
      // If rawRidersData was fetched above, pass it to an optimized getActiveRidersCount if available.
      activeRiders = getActiveRidersCount(); 
      console.log(`✅ Active riders: ${activeRiders}`);
    } catch (error) {
      console.error('❌ Error getting active riders count:', error);
      activeRiders = 0; // Fallback
    }

    // Process requests data
    try {
      if (rawRequestsData && rawRequestsData.data) {
        const requests = rawRequestsData.data;
        const requestsColMap = rawRequestsData.columnMap;
        totalRequests = requests.length;

        completedRequests = requests.filter(row =>
          getColumnValue(row, requestsColMap, CONFIG.columns.requests.status) === 'Completed'
        ).length;

        pendingRequests = requests.filter(row => {
          const status = getColumnValue(row, requestsColMap, CONFIG.columns.requests.status);
          return ['New', 'Pending'].includes(status);
        }).length;
        console.log(`✅ Requests stats - Total: ${totalRequests}, Completed: ${completedRequests}, Pending: ${pendingRequests}`);
      } else {
        console.warn('⚠️ No raw requests data found for statistics.');
      }
    } catch (error) {
      console.error('❌ Error processing requests data for statistics:', error);
    }

    // Process assignments data
    try {
      if (rawAssignmentsData && rawAssignmentsData.data) {
        const assignments = rawAssignmentsData.data;
        const assignmentsColMap = rawAssignmentsData.columnMap;

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date

        const weekFromNow = new Date(today);
        weekFromNow.setDate(today.getDate() + 7); // End of the 7-day window

        assignments.forEach(row => {
          const eventDateValue = getColumnValue(row, assignmentsColMap, CONFIG.columns.assignments.eventDate);
          const riderName = getColumnValue(row, assignmentsColMap, CONFIG.columns.assignments.riderName);
          const status = getColumnValue(row, assignmentsColMap, CONFIG.columns.assignments.status);

          if (!riderName || ['Cancelled', 'Completed', 'No Show'].includes(status)) {
            return; // Skip if no rider or terminal status
          }

          if (eventDateValue) {
            let eventDate;
            // Handle different raw date types (Date object, ISO string, or number/serial)
            if (eventDateValue instanceof Date) {
              eventDate = eventDateValue;
            } else if (typeof eventDateValue === 'string' && eventDateValue.includes('T')) {
              eventDate = new Date(eventDateValue);
            } else if (typeof eventDateValue === 'number') {
              // Assuming Excel serial date if it's a number; convert to Date
              eventDate = new Date((eventDateValue - 25569) * 86400 * 1000);
            } else {
              // Try to parse if it's a simple date string, might fail for ambiguous formats
              eventDate = new Date(eventDateValue); 
            }

            if (eventDate && !isNaN(eventDate.getTime())) {
              const normalizedEventDate = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
              
              if (normalizedEventDate.getTime() === today.getTime()) {
                todayAssignments++;
              }
              // Check if the event date is within the 7-day window (inclusive of today, exclusive of the 8th day)
              if (normalizedEventDate.getTime() >= today.getTime() && normalizedEventDate.getTime() < weekFromNow.getTime()) {
                weekAssignments++;
              }
            }
          }
        });
        console.log(`✅ Assignment stats - Today: ${todayAssignments}, This week (next 7 days): ${weekAssignments}`);
      } else {
        console.warn('⚠️ No raw assignments data found for statistics.');
      }
    } catch (error) {
      console.error('❌ Error processing assignments data for statistics:', error);
    }

    const stats = {
      activeRiders,
      pendingRequests: pendingRequests,
      todayAssignments: todayAssignments,
      weekAssignments: weekAssignments,
      totalRequests: totalRequests,
      completedRequests: completedRequests
    };

    console.log('✅ Final dashboard statistics:', stats);
    return stats;

  } catch (error) {
    console.error('❌ Error in calculateDashboardStatistics:', error);
    logError('Error calculating dashboard statistics:', error);
    
    // Return safe fallback values
    return {
      activeRiders: 0,
      pendingRequests: 0,
      todayAssignments: 0,
      weekAssignments: 0,
      totalRequests: 0,
      completedRequests: 0
    };
  }
}

/**
 * Get active riders count based on sheet data and status column.
 * This is the corrected and robust version.
 */


/**
 * Display filtered requests on the dashboard.
 * @param {string} filterStatus The status to filter by (e.g., 'New', 'Pending', 'All').
 */
function updateRequestsDisplay(filterStatus) {
  try {
    const dashSheet = getSheet(CONFIG.sheets.dashboard);
    const startRow = CONFIG.dashboard.requestsDisplayStartRow;
    const maxDisplayRows = CONFIG.dashboard.maxDisplayRows;

    // Clear previous requests
    dashSheet.getRange(startRow, 1, maxDisplayRows, 11).clearContent().clearFormat();

    // Get raw requests data once
    const rawRequestsData = getRequestsData();
    // Pass raw data to the filtering and formatting function
    const requests = getFilteredRequestsForWebApp(rawRequestsData, filterStatus);

    if (requests.length === 0) {
      dashSheet.getRange(startRow, 1).setValue('No requests found for this filter.').setFontStyle('italic');
      return;
    }

    // Prepare data for display
    const headers = [
      'Request ID', 'Date', 'Requester Name', 'Request Type', 'Event Date',
      'Start Time', 'Start Location', 'End Location', 'Status', 'Riders Assigned', 'Notifications'
    ];

    const displayData = requests.slice(0, maxDisplayRows).map(req => [
      req.requestId,
      req.date,
      req.requesterName,
      req.requestType,
      req.eventDate,
      req.startTime,
      req.startLocation,
      req.endLocation,
      req.status,
      req.ridersAssigned,
      '' // Placeholder for notification dropdown - will be populated by dropdown function
    ]);

    // Set headers
    dashSheet.getRange(startRow - 1, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight('bold')
      .setBackground('#cfe2f3')
      .setHorizontalAlignment('center');

    // Set data
    const dataRange = dashSheet.getRange(startRow, 1, displayData.length, headers.length);
    dataRange.setValues(displayData);

    // Setup Notification Dropdowns for each row
    addEnhancedNotificationDropdowns(dashSheet, startRow, displayData.length);

    logActivity(`Requests display updated with ${displayData.length} entries for filter: ${filterStatus}`);

  } catch (error) {
    logError('Error updating requests display', error);
  }
}

/**
 * Gets requests data suitable for displaying on the dashboard/web app,
 * filtering by status and applying date/time formatting.
 * This function also ensures the structure matches what's expected for display.
 * @param {string} statusFilter The status to filter requests by ('All', 'New', etc.).
 * @returns {Array<Object>} An array of formatted request objects.
 */
function getFilteredRequestsForWebApp(rawRequestsData, statusFilter = 'All') {
  try {
    console.log(`📋 Getting filtered requests for: ${statusFilter}`);

    if (!rawRequestsData || !rawRequestsData.data || rawRequestsData.data.length === 0) {
      console.log('❌ No raw requests data provided to getFilteredRequestsForWebApp.');
      return [];
    }

    const requests = rawRequestsData.data;
    const columnMap = rawRequestsData.columnMap;

    const filteredRequests = requests.filter(rowArray => {
      if (!Array.isArray(rowArray) || rowArray.filter(cell => cell !== '').length === 0) {
        return false;
      }
      const requestId = getColumnValue(rowArray, columnMap, CONFIG.columns.requests.id);
      if (!requestId) return false;

      const status = getColumnValue(rowArray, columnMap, CONFIG.columns.requests.status);
      if (statusFilter !== 'All') {
        return (status || 'New') === statusFilter;
      }
      return true;
    }).map(rowArray => {
      const obj = {};
      // Create an object from the row array using the column map
      for (const header in columnMap) {
        if (Object.prototype.hasOwnProperty.call(columnMap, header)) {
          obj[header] = rowArray[columnMap[header]];
        }
      }

      // Apply formatting functions from Formatting.js
      return {
        id: obj[CONFIG.columns.requests.id] || '',
        requestId: obj[CONFIG.columns.requests.id] || '',
        date: formatDateForDisplay(obj[CONFIG.columns.requests.date]),
        requesterName: obj[CONFIG.columns.requests.requesterName] || '',
        requesterContact: obj[CONFIG.columns.requests.requesterContact] || '',
        requestType: obj[CONFIG.columns.requests.type] || '',
        eventDate: formatDateForDisplay(obj[CONFIG.columns.requests.eventDate]),
        startTime: formatTimeForDisplay(obj[CONFIG.columns.requests.startTime]),
        endTime: formatTimeForDisplay(obj[CONFIG.columns.requests.endTime]),
        startLocation: obj[CONFIG.columns.requests.startLocation] || '',
        endLocation: obj[CONFIG.columns.requests.endLocation] || '',
        secondaryEndLocation: obj[CONFIG.columns.requests.secondaryLocation] || '',
        ridersNeeded: obj[CONFIG.columns.requests.ridersNeeded] || 0,
        specialRequirements: obj[CONFIG.columns.requests.requirements] || '',
        status: obj[CONFIG.columns.requests.status] || 'New',
        notes: obj[CONFIG.columns.requests.notes] || '',
        ridersAssigned: obj[CONFIG.columns.requests.ridersAssigned] || '', // This might need special handling if it's a list
        courtesy: obj[CONFIG.columns.requests.courtesy] || '',
        lastUpdated: formatDateTimeForDisplay(obj[CONFIG.columns.requests.lastUpdated]) || ''
      };
    });

    console.log(`✅ Returning ${filteredRequests.length} filtered requests for status: ${statusFilter}`);
    return filteredRequests;

  } catch (error) {
    logError('Error in getFilteredRequestsForWebApp:', error);
    return [];
  }
}

/**
 * Gets requests data with robust ID, Event Date, and Start Time formatting.
 * Used internally, often by dashboard display functions that need prepared values.
 */
function getFormattedRequestsForDashboard(rawRequestsData) {
  try {
    if (!rawRequestsData || !rawRequestsData.data || rawRequestsData.data.length === 0) {
      console.log('❌ No raw requests data provided to getFormattedRequestsForDashboard.');
      return [];
    }

    const requests = rawRequestsData.data;
    const columnMap = rawRequestsData.columnMap;

    // Filter out rows without a Request ID (likely empty/partial rows)
    const cleanedRequests = requests.filter(rowArray => {
      const requestId = getColumnValue(rowArray, columnMap, CONFIG.columns.requests.id);
      return requestId && String(requestId).trim().length > 0;
    });

    const mappedRequests = cleanedRequests.map(rowArray => {
      const obj = {};
      // Create an object from the row array using the column map
      for (const header in columnMap) {
        if (Object.prototype.hasOwnProperty.call(columnMap, header)) {
          obj[header] = rowArray[columnMap[header]];
        }
      }
      
      // Apply formatting functions from Formatting.js
      return {
        requestId: obj[CONFIG.columns.requests.id] || '',
        date: formatDateForDisplay(obj[CONFIG.columns.requests.date]),
        requesterName: obj[CONFIG.columns.requests.requesterName] || '',
        requestType: obj[CONFIG.columns.requests.type] || '',
        eventDate: formatDateForDisplay(obj[CONFIG.columns.requests.eventDate]),
        startTime: formatTimeForDisplay(obj[CONFIG.columns.requests.startTime]),
        endTime: formatTimeForDisplay(obj[CONFIG.columns.requests.endTime]),
        startLocation: obj[CONFIG.columns.requests.startLocation] || '',
        endLocation: obj[CONFIG.columns.requests.endLocation] || '',
        ridersNeeded: obj[CONFIG.columns.requests.ridersNeeded] || 0,
        status: obj[CONFIG.columns.requests.status] || 'New',
        notes: obj[CONFIG.columns.requests.notes] || '',
        ridersAssigned: obj[CONFIG.columns.requests.ridersAssigned] || '' // May need special handling
      };
    }).sort((a, b) => {
      // Sort by event date, most recent first.
      // Need to parse formatted dates back to Date objects for reliable sorting.
      let dateA, dateB;
      try {
        // Assuming formatDateForDisplay produces a format parseable by new Date()
        // e.g., "MM/DD/YYYY" or "ShortMonth DD, YYYY". If not, this parsing needs adjustment.
        dateA = new Date(a.eventDate); 
        dateB = new Date(b.eventDate);
      } catch (e) {
        // If parsing fails, don't sort these elements relative to each other
        return 0;
      }

      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        return 0; // Don't sort if dates are invalid after parsing
      }
      return dateB.getTime() - dateA.getTime(); // Descending order
    });

    console.log(`✅ Returning ${mappedRequests.length} formatted and sorted requests for dashboard.`);
    return mappedRequests;

  } catch (error) {
    logError('Error in getFormattedRequestsForDashboard:', error);
    return [];
  }
}

/**
 * Update the rider schedule section on the dashboard.
 */
function updateRiderScheduleSection() {
  try {
    const dashSheet = getSheet(CONFIG.sheets.dashboard);
    const startRow = CONFIG.dashboard.scheduleStartRow;
    const startCol = CONFIG.dashboard.scheduleStartCol;

    dashSheet.getRange(startRow, startCol, 25, 8).clearContent().clearFormat();

    dashSheet.getRange(startRow, startCol, 1, 8)
      .merge()
      .setValue('📅 Rider Schedule - Next 7 Days')
      .setFontWeight('bold')
      .setBackground('#f2f2f2')
      .setHorizontalAlignment('center');

    // Fetch raw data once
    const rawAssignmentsData = getAssignmentsData();
    const rawRidersData = getRidersData(); // getActiveRiders also uses this

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(today);
      day.setDate(day.getDate() + i);
      weekDays.push(day);
    }

    const headerRow = ['Rider'].concat(
      weekDays.map(day => {
        // Use formatting functions for header display
        const dayName = formatDateForDisplay(day).split(',')[0]; // e.g., "Mon" from "Mon, Jan 1"
        const monthDay = `${formatDateForDisplay(day).split(' ')[1]} ${formatDateForDisplay(day).split(' ')[2].replace(',', '')}`; // "Jan 1"
        return `${dayName}\n${monthDay}`;
      })
    );

    dashSheet.getRange(startRow + 1, startCol, 1, headerRow.length)
      .setValues([headerRow])
      .setFontWeight('bold')
      .setBackground('#d9d9d9')
      .setWrap(true)
      .setVerticalAlignment('middle')
      .setHorizontalAlignment('center');

    dashSheet.setColumnWidth(startCol, 120);
    for (let i = 1; i <= 7; i++) {
      dashSheet.setColumnWidth(startCol + i, 35);
    }
    dashSheet.setRowHeight(startRow + 1, 35);

    // Pass raw data to helper functions
    const activeRidersWithUpcomingAssignments = getAssignedRidersForUpcomingWeek(rawRidersData, rawAssignmentsData, weekDays);

    if (activeRidersWithUpcomingAssignments.length > 0) {
      const scheduleGrid = buildCompactRiderScheduleGrid(activeRidersWithUpcomingAssignments, rawAssignmentsData, rawRidersData.columnMap, weekDays);

      if (scheduleGrid.length > 0) {
        const dataRange = dashSheet.getRange(startRow + 2, startCol, scheduleGrid.length, headerRow.length);
        dataRange.setValues(scheduleGrid);
        
        dataRange.setVerticalAlignment('middle');
        
        for (let i = 1; i <= 7; i++) {
          const dayColRange = dashSheet.getRange(startRow + 2, startCol + i, scheduleGrid.length, 1);
          dayColRange.setHorizontalAlignment('center');
          dayColRange.setFontSize(12);
          dayColRange.setFontWeight('bold');
        }
        
        const riderNameRange = dashSheet.getRange(startRow + 2, startCol, scheduleGrid.length, 1);
        riderNameRange.setHorizontalAlignment('left');
        riderNameRange.setFontSize(10);
        
        for (let row = 0; row < scheduleGrid.length; row++) {
          dashSheet.setRowHeight(startRow + 2 + row, 22);
        }
      }
    } else {
      dashSheet.getRange(startRow + 2, startCol)
        .setValue('No riders with assignments in the next 7 days')
        .setFontStyle('italic')
        .setFontSize(10);
    }

    return true;

  } catch (error) {
    logError('Error updating rider schedule section', error);
    return false;
  }
}

/**
 * Get active riders who have at least one assignment in the specified week.
 * @param {Object} rawRidersData Raw data object for riders.
 * @param {Object} rawAssignmentsData Raw data object for assignments.
 * @param {Date[]} weekDays An array of Date objects representing the days of the week to check.
 * @returns {any[][]} An array of rider data rows who have assignments in the upcoming week.
 */
function getAssignedRidersForUpcomingWeek(rawRidersData, rawAssignmentsData, weekDays) {
  // Use an optimized getActiveRiders that can accept rawRidersData if available,
  // or ensure getActiveRiders uses its own efficient fetch if rawRidersData is not passed.
  const allActiveRiders = getActiveRiders(rawRidersData); // Modify getActiveRiders to accept optional raw data
  const ridersColMap = rawRidersData.columnMap;

  const assignedRiders = allActiveRiders.filter(riderRow => {
    const riderName = getColumnValue(riderRow, ridersColMap, CONFIG.columns.riders.name);
    return weekDays.some(day => {
      // Pass rawAssignmentsData to getRiderAssignmentsForDate
      const assignments = getRiderAssignmentsForDate(riderName, day, rawAssignmentsData);
      return assignments.length > 0;
    });
  });

  return assignedRiders;
}

/**
 * Builds a compact rider schedule grid for dashboard display.
 * Displays checkmark for single assignment, count for multiple assignments on a day.
 * @param {Array<Object>} activeRiders An array of rider data rows.
 * @param {Object} rawAssignmentsData Raw data object for assignments.
 * @param {Object} ridersColMap Column map for riders data.
 * @param {Date[]} weekDays An array of Date objects for the next 7 days.
 * @returns {Array<Array<string>>} The schedule grid data for display.
 */
function buildCompactRiderScheduleGrid(activeRiders, rawAssignmentsData, ridersColMap, weekDays) {
  const scheduleGrid = [];

  activeRiders.forEach(riderRow => {
    const riderName = getColumnValue(riderRow, ridersColMap, CONFIG.columns.riders.name);
    
    const shortRiderName = riderName.replace(/^(Dep\.|Sgt\.|Lt\.|Capt\.)\s+/i, '');
    const scheduleRow = [shortRiderName];

    weekDays.forEach(day => {
      // Pass rawAssignmentsData to getRiderAssignmentsForDate
      const assignments = getRiderAssignmentsForDate(riderName, day, rawAssignmentsData);
      const assignmentCount = assignments.length;
      
      if (assignmentCount === 0) {
        scheduleRow.push('');
      } else if (assignmentCount === 1) {
        scheduleRow.push('✓'); // Checkmark for single assignment
      } else {
        scheduleRow.push(String(assignmentCount)); // Count for multiple assignments
      }
    });
    scheduleGrid.push(scheduleRow);
  });
  return scheduleGrid;
}

/**
 * Applies conditional formatting for status colors to a specified range.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The sheet to format.
 * @param {number} startRow The starting row of the data range.
 * @param {number} numRows The number of rows in the data range.
 * @param {number} statusColumn The 1-indexed column number of the status field.
 */
function applyStatusColors(sheet, startRow, numRows, statusColumn) {
  try {
    const statusRange = sheet.getRange(startRow, statusColumn, numRows, 1);

    const colorMap = {
      'New': { background: '#fce5cd', color: '#b45f06' },
      'Pending': { background: '#fff2cc', color: '#bf9000' },
      'Assigned': { background: '#cfe2f3', color: '#1c4587' },
      'Unassigned': { background: '#eafeff', color: '#1a565a' },
      'In Progress': { background: '#d9d2e9', color: '#20124d' },
      'Completed': { background: '#d9ead3', color: '#274e13' },
      'Cancelled': { background: '#f4c7c3', color: '#a61e1e' }
    };

    const rules = [];
    Object.entries(colorMap).forEach(([status, colors]) => {
      rules.push(
        SpreadsheetApp.newConditionalFormatRule()
          .whenTextEqualTo(status)
          .setBackground(colors.background)
          .setFontColor(colors.color)
          .setRanges([statusRange])
          .build()
      );
    });

    sheet.setConditionalFormatRules(rules);

  } catch (error) {
    logError('Error applying status colors', error);
  }
}

/**
 * Formats dashboard columns, sets widths, alignment, wrapping, and row heights.
 */
function formatDashboardColumns() {
  try {
    const dashSheet = getSheet(CONFIG.sheets.dashboard);
    const startRow = CONFIG.dashboard.requestsDisplayStartRow;
    
    // Auto-resize columns A through I (exclude Assigned Riders and Notifications)
    for (let col = 1; col <= 9; col++) {
      dashSheet.autoResizeColumn(col);
    }
    
    // Set fixed widths for content-heavy columns
    dashSheet.setColumnWidth(10, 250); // Assigned Riders - 250px
    dashSheet.setColumnWidth(11, 180); // Notifications - 180px
    
    // Set maximum and minimum widths for other columns
    const maxWidths = { 1: 120, 2: 100, 3: 150, 4: 120, 5: 80, 6: 100, 7: 200, 8: 200, 9: 100 };
    Object.entries(maxWidths).forEach(([col, maxWidth]) => {
      const currentWidth = dashSheet.getColumnWidth(parseInt(col));
      if (currentWidth > maxWidth) {
        dashSheet.setColumnWidth(parseInt(col), maxWidth);
      }
    });
    
    const minWidths = { 1: 80, 2: 85, 4: 80, 5: 60, 6: 80, 9: 80 };
    Object.entries(minWidths).forEach(([col, minWidth]) => {
      const currentWidth = dashSheet.getColumnWidth(parseInt(col));
      if (currentWidth < minWidth) {
        dashSheet.setColumnWidth(parseInt(col), minWidth);
      }
    });
    
    // Apply text wrapping to longer content columns (including notifications)
    const wrapColumns = [3, 7, 8, 10, 11];
    wrapColumns.forEach(col => {
      const dataRange = dashSheet.getRange(startRow, col, 50, 1);
      dataRange.setWrap(true);
      dataRange.setVerticalAlignment('top');
    });
    
    // Set dynamic row heights for multi-line content
    for (let row = startRow; row < startRow + 20; row++) {
      const assignedRidersCell = dashSheet.getRange(row, 10);
      const cellValue = assignedRidersCell.getValue();
      
      if (cellValue && String(cellValue).includes('\n')) {
        const lineCount = String(cellValue).split('\n').length;
        const calculatedHeight = Math.max(30, lineCount * 18 + 10);
        const currentHeight = dashSheet.getRowHeight(row);
        
        if (currentHeight < calculatedHeight) {
          dashSheet.setRowHeight(row, calculatedHeight);
        }
      } else if (cellValue && String(cellValue).trim().length > 0) {
        const currentHeight = dashSheet.getRowHeight(row);
        if (currentHeight < 30) { // Minimum height for single line items
          dashSheet.setRowHeight(row, 30);
        }
      }
    }
    
    // Center-align certain columns
    const centerColumns = [1, 2, 4, 5, 6, 9, 11];
    centerColumns.forEach(col => {
      const dataRange = dashSheet.getRange(startRow, col, 50, 1);
      dataRange.setHorizontalAlignment('center');
    });
    
    // Left-align text columns
    const leftColumns = [3, 7, 8, 10];
    leftColumns.forEach(col => {
      const dataRange = dashSheet.getRange(startRow, col, 50, 1);
      dataRange.setHorizontalAlignment('left');
    });
    
    // Special formatting for notifications column
    const notificationsRange = dashSheet.getRange(startRow, 11, 50, 1);
    notificationsRange.setFontSize(10);
    notificationsRange.setVerticalAlignment('middle');
    
    logActivity('Dashboard columns formatted');
    
  } catch (error) {
    logError('Error formatting dashboard columns', error);
  }
}

/**
 * Formats the 'Riders Assigned' column in the Requests sheet to handle line breaks.
 */
function formatRequestsSheetForLineBreaks() {
  try {
    const ss = SpreadsheetApp.getActive();
    const reqSheet = ss.getSheetByName('Requests');
    
    const ridersAssignedCol = 17; // Column Q (1-indexed)
    const lastRow = reqSheet.getLastRow();
    
    if (lastRow > 1) {
      const range = reqSheet.getRange(2, ridersAssignedCol, lastRow - 1, 1);
      range.setWrap(true);
      range.setVerticalAlignment('top');
      reqSheet.setColumnWidth(ridersAssignedCol, 200);
    }
    
    logActivity('Requests sheet formatted for line break assigned riders');
    
  } catch (error) {
    logError('Error formatting Requests sheet for line breaks', error);
  }
}
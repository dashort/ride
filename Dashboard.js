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

    let activeRiders = 0;
    let pendingRequests = 0;
    let todayAssignments = 0;
    let weekAssignments = 0;
    let totalRequests = 0;
    let completedRequests = 0;

    // Get active riders count with error handling
    try {
      activeRiders = getActiveRidersCount();
      console.log(`✅ Active riders: ${activeRiders}`);
    } catch (error) {
      console.error('❌ Error getting active riders count:', error);
      activeRiders = 0;
    }

    // Get requests data with error handling
    try {
      const requestsDataObj = getRequestsData();
      if (requestsDataObj && requestsDataObj.data) {
        const requests = requestsDataObj.data;
        const requestsColMap = requestsDataObj.columnMap;

        totalRequests = requests.length;
        
        completedRequests = requests.filter(row => {
          try {
            return getColumnValue(row, requestsColMap, CONFIG.columns.requests.status) === 'Completed';
          } catch (e) {
            return false;
          }
        }).length;
        
        pendingRequests = requests.filter(row => {
          try {
            const status = getColumnValue(row, requestsColMap, CONFIG.columns.requests.status);
            return ['New', 'Pending'].includes(status);
          } catch (e) {
            return false;
          }
        }).length;
        
        console.log(`✅ Requests stats - Total: ${totalRequests}, Completed: ${completedRequests}, Pending: ${pendingRequests}`);
      }
    } catch (error) {
      console.error('❌ Error processing requests data:', error);
    }

    // Get assignments data with error handling
    try {
      const assignmentsDataObj = getAssignmentsData();
      if (assignmentsDataObj && assignmentsDataObj.data) {
        const assignments = assignmentsDataObj.data;
        const assignmentsColMap = assignmentsDataObj.columnMap;

        const today = new Date();
        const todayMillis = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const weekFromNowMillis = todayMillis + (7 * 24 * 60 * 60 * 1000);

        assignments.forEach(row => {
          try {
            const eventDate = getColumnValue(row, assignmentsColMap, CONFIG.columns.assignments.eventDate);
            const riderName = getColumnValue(row, assignmentsColMap, CONFIG.columns.assignments.riderName);
            const status = getColumnValue(row, assignmentsColMap, CONFIG.columns.assignments.status);
            
            // Only count assignments with riders and not cancelled/completed
            if (!riderName || ['Cancelled', 'Completed', 'No Show'].includes(status)) {
              return;
            }
            
            if (eventDate instanceof Date && !isNaN(eventDate.getTime())) {
              const eventDateMillis = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()).getTime();

              if (eventDateMillis === todayMillis) {
                todayAssignments++;
              }
              if (eventDateMillis >= todayMillis && eventDateMillis <= weekFromNowMillis) {
                weekAssignments++;
              }
            }
          } catch (e) {
            // Skip invalid rows
          }
        });
        
        console.log(`✅ Assignment stats - Today: ${todayAssignments}, Week: ${weekAssignments}`);
      }
    } catch (error) {
      console.error('❌ Error processing assignments data:', error);
    }

    const stats = {
      activeRiders: activeRiders,
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

    // Get requests data
    const requests = getFilteredRequestsForWebApp(filterStatus);

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
function getFilteredRequestsForWebApp(statusFilter = 'All') {
  try {
    console.log(`📋 Getting filtered requests for: ${statusFilter}`);

    // getRequestsData already applies formatting and caching
    const requestsData = getRequestsData(); 
    const requests = requestsData.data;
    const headers = requestsData.headers;
    const columnMap = requestsData.columnMap;

    if (!requests || requests.length === 0) {
      console.log('❌ No raw requests data.');
      return [];
    }

    const filteredRequests = requests.filter(rowArray => {
      // Ensure the row is a valid array and has content
      if (!Array.isArray(rowArray) || rowArray.filter(cell => cell !== '').length === 0) {
        return false;
      }
      
      const requestId = getColumnValue(rowArray, columnMap, CONFIG.columns.requests.id);
      if (!requestId) return false; // Must have a Request ID

      const status = getColumnValue(rowArray, columnMap, CONFIG.columns.requests.status);

      // Apply status filter
      if (statusFilter !== 'All') {
        return (status || 'New') === statusFilter;
      }
      return true;
    }).map(rowArray => {
      // Map row array to object using the columnMap for safe access
      const obj = {};
      for (const key in columnMap) {
          if (Object.prototype.hasOwnProperty.call(columnMap, key)) {
              obj[key] = rowArray[columnMap[key]];
          }
      }

      // Explicitly pull out and format required fields (redundant due to applyTimeFormatting, but explicit)
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
          ridersAssigned: obj[CONFIG.columns.requests.ridersAssigned] || '',
          courtesy: obj[CONFIG.columns.requests.courtesy] || '',
          lastUpdated: formatDateTimeForDisplay(obj[CONFIG.columns.requests.lastUpdated]) || ''
      };
    });

    console.log(`✅ Returning ${filteredRequests.length} filtered requests`);
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
function getFormattedRequestsForDashboard() {
  try {
    const requestsData = getRequestsData(); // Already returns formatted data

    if (!requestsData || requestsData.data.length === 0) return [];

    // Filter out rows without a Request ID (likely empty/partial rows)
    const cleanedRequests = requestsData.data.filter(row => {
      const requestId = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.id);
      return requestId && String(requestId).trim().length > 0;
    });

    const mappedRequests = cleanedRequests.map(row => {
      // `getColumnValue` will return already formatted values due to `applyTimeFormatting` in `getSheetData`
      return {
        requestId: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.id) || '',
        date: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.date) || '',
        requesterName: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.requesterName) || '',
        requestType: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.type) || '',
        eventDate: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.eventDate) || '',
        startTime: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.startTime) || '',
        endTime: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.endTime) || '',
        startLocation: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.startLocation) || '',
        endLocation: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.endLocation) || '',
        ridersNeeded: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.ridersNeeded) || 0,
        status: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.status) || 'New',
        notes: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.notes) || '',
        ridersAssigned: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.ridersAssigned) || ''
      };
    }).sort((a, b) => {
        // Sort by event date, most recent first (requires valid date strings)
        const dateA = new Date(a.eventDate);
        const dateB = new Date(b.eventDate);
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
          return 0; // Don't sort if dates are invalid
        }
        return dateB.getTime() - dateA.getTime();
    });

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
        const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
        const monthDay = day.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
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

    const activeRidersWithUpcomingAssignments = getAssignedRidersForUpcomingWeek(weekDays);

    if (activeRidersWithUpcomingAssignments.length > 0) {
      const scheduleGrid = buildCompactRiderScheduleGrid(activeRidersWithUpcomingAssignments, weekDays);

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
 * @param {Date[]} weekDays An array of Date objects representing the days of the week to check.
 * @returns {any[][]} An array of rider data rows who have assignments in the upcoming week.
 */
function getAssignedRidersForUpcomingWeek(weekDays) {
  const allActiveRiders = getActiveRiders();
  const ridersData = getRidersData();

  const assignedRiders = allActiveRiders.filter(riderRow => {
    const riderName = getColumnValue(riderRow, ridersData.columnMap, CONFIG.columns.riders.name);
    return weekDays.some(day => {
      const assignments = getRiderAssignmentsForDate(riderName, day);
      return assignments.length > 0;
    });
  });

  return assignedRiders;
}

/**
 * Builds a compact rider schedule grid for dashboard display.
 * Displays checkmark for single assignment, count for multiple assignments on a day.
 * @param {Array<Object>} activeRiders An array of rider objects.
 * @param {Date[]} weekDays An array of Date objects for the next 7 days.
 * @returns {Array<Array<string>>} The schedule grid data for display.
 */
function buildCompactRiderScheduleGrid(activeRiders, weekDays) {
  const scheduleGrid = [];
  const ridersData = getRidersData(); // Fetch once outside the loop

  activeRiders.forEach(riderRow => {
    const riderName = getColumnValue(riderRow, ridersData.columnMap, CONFIG.columns.riders.name);
    
    // Use shorter rider name format (remove titles for space)
    const shortRiderName = riderName.replace(/^(Dep\.|Sgt\.|Lt\.|Capt\.)\s+/i, '');

    const scheduleRow = [shortRiderName];

    weekDays.forEach(day => {
      const assignments = getRiderAssignmentsForDate(riderName, day);
      const assignmentCount = assignments.length;
      
      if (assignmentCount === 0) {
        scheduleRow.push('');
      } else if (assignmentCount === 1) {
        scheduleRow.push('✓');
      } else {
        scheduleRow.push(`${assignmentCount}`);
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
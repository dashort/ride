/**
 * @fileoverview
 * This file contains functions that serve data to the web application and manage application logic.
 * It acts as a service layer, preparing data from various sources (like DataService.js and SheetUtils.js)
 * and formatting it as needed for different web app views (e.g., dashboard, assignments page, reports).
 * It includes wrapper functions for consolidating multiple data fetches, CRUD operations for requests,
 * assignment processing, dashboard calculations, and report generation.
 */

// --- From WebAppService.js ---

/**
 * Retrieves detailed information for a specific escort request, including request details
 * and a list of active riders.
 *
 * @param {string} requestIdInput The ID of the request to fetch details for. Can be a raw input that needs cleaning.
 * @return {object} An object containing the `request` details and an array of `riders`.
 * @throws {Error} If the request ID is not found or if there's a configuration error.
 */
function getEscortDetailsForAssignment(requestIdInput) {
  const cleanedInputId = String(requestIdInput || '').replace(/^"|"$/g, '').trim();
  const originalRequestId = cleanedInputId;
  const requestId = normalizeRequestId(originalRequestId); // From Utility.js (expected in CoreUtils.gs)

  try {
    const requestsData = getRequestsData(); // From DataService.js (expected in SheetServices.gs)
    const ridersData = getRidersData(); // From DataService.js (expected in SheetServices.gs)

    const requestColMap = requestsData.columnMap;
    const requestIdHeader = CONFIG.columns.requests.id;
    const requestIdColIndex = requestColMap[requestIdHeader];

    if (requestIdColIndex === undefined) {
      throw new Error(`Configuration error: Requests sheet header "${requestIdHeader}" not found.`);
    }

    let foundRequestRow = null;
    const cleanedTargetId = String(requestId || '').trim().toLowerCase();

    for (let i = 0; i < requestsData.data.length; i++) {
        const row = requestsData.data[i];
        const rowIdRaw = getColumnValue(row, requestColMap, requestIdHeader); // From SheetUtils.js (expected in SheetServices.gs)
        const normalizedRowId = normalizeRequestId(String(rowIdRaw));
        const cleanedRowId = normalizedRowId.trim().toLowerCase();
        if (cleanedRowId === cleanedTargetId) {
            foundRequestRow = row;
            break;
        }
    }

    if (!foundRequestRow) {
      throw new Error(`Request details not found for ID: "${originalRequestId}"`);
    }

    const requestDetails = {
      id: getColumnValue(foundRequestRow, requestColMap, CONFIG.columns.requests.id),
      ridersNeeded: getColumnValue(foundRequestRow, requestColMap, CONFIG.columns.requests.ridersNeeded),
      eventDate: getColumnValue(foundRequestRow, requestColMap, CONFIG.columns.requests.eventDate),
      startTime: getColumnValue(foundRequestRow, requestColMap, CONFIG.columns.requests.startTime),
      endTime: getColumnValue(foundRequestRow, requestColMap, CONFIG.columns.requests.endTime),
      startLocation: getColumnValue(foundRequestRow, requestColMap, CONFIG.columns.requests.startLocation),
      endLocation: getColumnValue(foundRequestRow, requestColMap, CONFIG.columns.requests.endLocation),
      secondaryLocation: getColumnValue(foundRequestRow, requestColMap, CONFIG.columns.requests.secondaryLocation),
      requesterName: getColumnValue(foundRequestRow, requestColMap, CONFIG.columns.requests.requesterName),
      status: getColumnValue(foundRequestRow, requestColMap, CONFIG.columns.requests.status),
      ridersAssigned: getColumnValue(foundRequestRow, requestColMap, CONFIG.columns.requests.ridersAssigned) || ''
    };

    const activeRiders = getActiveRiders().map(riderRow => { // getActiveRiders from DataService.js (expected in SheetServices.gs)
      const riderColMap = ridersData.columnMap;
      return {
        jpNumber: getColumnValue(riderRow, riderColMap, CONFIG.columns.riders.jpNumber),
        name: getColumnValue(riderRow, riderColMap, CONFIG.columns.riders.name),
        phone: getColumnValue(riderRow, riderColMap, CONFIG.columns.riders.phone),
        email: getColumnValue(riderRow, riderColMap, CONFIG.columns.riders.email),
        carrier: getColumnValue(riderRow, riderColMap, CONFIG.columns.riders.carrier)
      };
    });

    logActivity(`Fetched details for request: "${originalRequestId}"`); // From Logger.js (expected in CoreUtils.gs)

    return {
      request: requestDetails,
      riders: activeRiders
    };

  } catch (error) {
    logError(`Error in getEscortDetailsForAssignment for ${originalRequestId}`, error); // From Logger.js (expected in CoreUtils.gs)
    throw new Error(`Could not retrieve escort details: ${error.message}`);
  }
}

/**
 * Fetches upcoming assignments for the web application, typically for dashboard display.
 * Filters assignments for the next 30 days that are not completed or cancelled.
 *
 * @param {object} user The current user object (currently unused in the function but good for context).
 * @return {Array<object>} An array of formatted upcoming assignment objects, limited to 10.
 *                         Each object contains: assignmentId, requestId, eventDate, startTime, riderName, startLocation, status.
 */
function getUpcomingAssignmentsForWebApp(user) {
  try {
    console.log('📋 Getting upcoming assignments for web app...');
    console.log('User parameter received:', user);

    const assignmentsData = getAssignmentsData();

    if (!assignmentsData || !assignmentsData.data || assignmentsData.data.length === 0) {
      console.log('❌ No assignments data found');
      return [];
    }

    console.log(`✅ Found ${assignmentsData.data.length} total assignments`);

    const columnMap = assignmentsData.columnMap;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));

    const upcomingAssignments = assignmentsData.data
      .filter(row => {
        const assignmentId = getColumnValue(row, columnMap, CONFIG.columns.assignments.id);
        const riderName = getColumnValue(row, columnMap, CONFIG.columns.assignments.riderName);
        const status = getColumnValue(row, columnMap, CONFIG.columns.assignments.status);
        const eventDateValue = getColumnValue(row, columnMap, CONFIG.columns.assignments.eventDate);

        if (!assignmentId || !riderName || !eventDateValue) {
          return false;
        }

        if (['Completed', 'Cancelled', 'No Show'].includes(status)) {
          return false;
        }

        const assignmentDate = new Date(eventDateValue);
        if (isNaN(assignmentDate.getTime())) {
          return false;
        }

        return assignmentDate >= today && assignmentDate <= thirtyDaysFromNow;
      })
      .map(row => {
        const eventDate = getColumnValue(row, columnMap, CONFIG.columns.assignments.eventDate);
        const startTime = getColumnValue(row, columnMap, CONFIG.columns.assignments.startTime);
        const startLocation = getColumnValue(row, columnMap, CONFIG.columns.assignments.startLocation);
        const endLocation = getColumnValue(row, columnMap, CONFIG.columns.assignments.endLocation);

        let displayLocation = 'Location TBD';
        if (startLocation) {
          displayLocation = startLocation;
          if (endLocation) {
            displayLocation += ` → ${endLocation}`;
          }
        } else if (endLocation) {
          displayLocation = `To: ${endLocation}`;
        }

        return {
          assignmentId: getColumnValue(row, columnMap, CONFIG.columns.assignments.id),
          requestId: getColumnValue(row, columnMap, CONFIG.columns.assignments.requestId) || 'Unknown',
          eventDate: formatDateForDisplay(eventDate),
          startTime: formatTimeForDisplay(startTime),
          riderName: getColumnValue(row, columnMap, CONFIG.columns.assignments.riderName) || 'Unknown Rider',
          startLocation: displayLocation,
          status: getColumnValue(row, columnMap, CONFIG.columns.assignments.status) || 'Assigned'
        };
      })
      .sort((a, b) => {
        let dateA, dateB;
        try { dateA = new Date(a.eventDate); } catch (e) { dateA = null; }
        try { dateB = new Date(b.eventDate); } catch (e) { dateB = null; }

        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;

        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 10);

    console.log(`✅ Returning ${upcomingAssignments.length} upcoming assignments`);

    if (upcomingAssignments.length > 0) {
      console.log('Sample assignment:', {
        id: upcomingAssignments[0].assignmentId,
        requestId: upcomingAssignments[0].requestId,
        eventDate: upcomingAssignments[0].eventDate,
        rider: upcomingAssignments[0].riderName
      });
    }

    return upcomingAssignments;

  } catch (error) {
    console.error('❌ Error getting upcoming assignments:', error);
    logError('Error in getUpcomingAssignmentsForWebApp', error);
    return [];
  }
}

/**
 * Gets all active assignments for web app display.
 * "Active" here means not completed or cancelled.
 *
 * @return {Array<object>} An array of formatted active assignment objects, limited to 10.
 */
function getAllActiveAssignmentsForWebApp() {
  try {
    console.log('📋 Getting all active assignments...');

    const assignmentsData = getAssignmentsData();

    if (!assignmentsData || !assignmentsData.data || assignmentsData.data.length === 0) {
      console.log('❌ No assignments data found');
      return [];
    }

    const columnMap = assignmentsData.columnMap;
    const activeAssignments = [];

    for (let i = 0; i < assignmentsData.data.length; i++) {
      try {
        const row = assignmentsData.data[i];

        const assignmentId = getColumnValue(row, columnMap, CONFIG.columns.assignments.id);
        const riderName = getColumnValue(row, columnMap, CONFIG.columns.assignments.riderName);
        const status = getColumnValue(row, columnMap, CONFIG.columns.assignments.status);

        if (!assignmentId || !riderName || ['Completed', 'Cancelled', 'No Show'].includes(status)) {
          continue;
        }

        const assignment = {
          assignmentId: assignmentId,
          requestId: getColumnValue(row, columnMap, CONFIG.columns.assignments.requestId) || 'Unknown',
          eventDate: formatDateForDisplay(getColumnValue(row, columnMap, CONFIG.columns.assignments.eventDate)) || 'No Date',
          startTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.assignments.startTime)) || 'No Time',
          riderName: riderName,
          startLocation: getColumnValue(row, columnMap, CONFIG.columns.assignments.startLocation) || 'Location TBD',
          status: status || 'Assigned'
        };

        activeAssignments.push(assignment);

      } catch (rowError) {
        console.log(`⚠️ Error processing assignment row ${i}:`, rowError);
      }
    }

    const limitedAssignments = activeAssignments.slice(0, 10);

    console.log(`✅ Returning ${limitedAssignments.length} active assignments`);
    return limitedAssignments;

  } catch (error) {
    console.error('❌ Error getting active assignments:', error);
    logError('Error in getAllActiveAssignmentsForWebApp', error);
    return [];
  }
}

/**
 * Gets all active riders for rendering in web app forms (e.g., assignment dropdowns).
 * Filters riders by "Active" status and ensures they have a name.
 *
 * @return {Array<object>} An array of active rider objects, each containing:
 *                         jpNumber, name, phone, email, carrier.
 */
function getActiveRidersForWebApp() {
  try {
    const ridersData = getRidersData();

    if (!ridersData || !ridersData.data) {
      return [];
    }

    return ridersData.data
      .filter(row => {
        const status = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.status);
        const name = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.name);
        return String(status).trim().toLowerCase() === 'active' && name && String(name).trim().length > 0;
      })
      .map(row => ({
        jpNumber: getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.jpNumber) || '',
        name: getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.name) || '',
        phone: getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.phone) || '',
        email: getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.email) || '',
        carrier: getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.carrier) || ''
      }));
  } catch (error) {
    logError('Error getting active riders for web app:', error);
    return [];
  }
}

/**
 * Provides general dashboard data structure including statistics, formatted requests, and formatted rider schedule.
 * This function might be an older approach to dashboard data consolidation.
 * The newer `getPageDataForDashboard` is preferred for client-side calls.
 *
 * @return {object} An object containing `stats`, `requests` (formatted), and `riderSchedule` (formatted).
 */
function getDashboardData() {
  try {
    const requests = getFormattedRequestsForDashboard();
    const riderSchedule = getRiderScheduleFormatted();
    const stats = calculateDashboardStatistics();

    return {
      stats: stats,
      requests: requests,
      riderSchedule: riderSchedule
    };

  } catch (error) {
    logError('Error getting dashboard data:', error);
    return {
      stats: { totalRequests: 0, activeRiders: 0, pendingRequests: 0, todaysAssignments: 0, thisWeeksAssignments: 0, completedRequests: 0 },
      requests: [],
      riderSchedule: []
    };
  }
}

/**
 * Get rider schedule with formatted dates/times for dashboard display.
 * Filters assignments for the upcoming week.
 *
 * @return {Array<object>} An array of formatted assignment objects for the schedule.
 */
function getRiderScheduleFormatted() {
  try {
    const assignmentsData = getAssignmentsData();
    const assignments = assignmentsData.data;
    const columnMap = assignmentsData.columnMap;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const schedule = assignments
      .filter(row => {
        const eventDateValue = getColumnValue(row, columnMap, CONFIG.columns.assignments.eventDate);
        if (!(eventDateValue instanceof Date)) return false;
        const rowDate = new Date(eventDateValue.getFullYear(), eventDateValue.getMonth(), eventDateValue.getDate());
        return rowDate >= today && rowDate <= nextWeek;
      })
      .map(row => ({
        assignmentId: getColumnValue(row, columnMap, CONFIG.columns.assignments.id) || '',
        requestId: getColumnValue(row, columnMap, CONFIG.columns.assignments.requestId) || '',
        eventDate: formatDateForDisplay(getColumnValue(row, columnMap, CONFIG.columns.assignments.eventDate)),
        startTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.assignments.startTime)),
        endTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.assignments.endTime)),
        riderName: getColumnValue(row, columnMap, CONFIG.columns.assignments.riderName) || '',
        status: getColumnValue(row, columnMap, CONFIG.columns.assignments.status) || 'Assigned'
      }))
      .sort((a, b) => {
        let dateA, dateB;
        try { dateA = new Date(a.eventDate); } catch (e) { dateA = null; }
        try { dateB = new Date(b.eventDate); } catch (e) { dateB = null; }

        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA.getTime() - dateB.getTime();
      });

    return schedule;
  } catch (error) {
    logError('Error getting rider schedule for dashboard:', error);
    return [];
  }
}

// ===== SIDEBAR FUNCTIONS ===== (Shared by sheets & web app)

/**
 * Get data for the escort assignment sidebar, used by both Google Sheets sidebar and web app assignment modal.
 * Filters for active requests and active riders.
 *
 * @return {object} An object containing:
 *                  {Array<Array<any>>} requestsData Filtered request rows.
 *                  {Array<string>} requestsHeaders Headers for requests.
 *                  {Array<Array<any>>} ridersData Filtered active rider rows.
 *                  {Array<string>} ridersHeaders Headers for riders.
 */
function getDataForEscortSidebar() {
  try {
    const requestsDataObj = getRequestsData();
    const ridersDataObj = getRidersData();

    const validRequests = requestsDataObj.data.filter(row => {
      const id = getColumnValue(row, requestsDataObj.columnMap, CONFIG.columns.requests.id);
      const requesterName = getColumnValue(row, requestsDataObj.columnMap, CONFIG.columns.requests.requesterName);
      const status = getColumnValue(row, requestsDataObj.columnMap, CONFIG.columns.requests.status);

      return id && String(id).trim().length > 0 &&
             requesterName && String(requesterName).trim().length > 0 &&
             ['New', 'Pending', 'Assigned', 'Unassigned', 'In Progress'].includes(status);
    });

    const activeRiders = ridersDataObj.data.filter(row => {
      const status = getColumnValue(row, ridersDataObj.columnMap, CONFIG.columns.riders.status);
      const name = getColumnValue(row, ridersDataObj.columnMap, CONFIG.columns.riders.name);
      return String(status).trim().toLowerCase() === 'active' && name && String(name).trim().length > 0;
    });

    return {
      requestsData: validRequests,
      requestsHeaders: requestsDataObj.headers,
      ridersData: activeRiders,
      ridersHeaders: ridersDataObj.headers
    };

  } catch (error) {
    logError('Error getting data for escort sidebar', error);
    return { requestsData: [], requestsHeaders: [], ridersData: [], ridersHeaders: [] };
  }
}

/**
 * Displays the escort assignment sidebar in Google Sheets UI.
 * Uses data fetched by `getDataForEscortSidebar`.
 * @return {void}
 */
function showEscortSidebar() {
  try {
    const data = getDataForEscortSidebar();

    if (data.requestsData.length === 0) {
      SpreadsheetApp.getUi().alert('No valid requests found with proper Request IDs and requester names.');
      return;
    }
    if (data.ridersData.length === 0) {
      SpreadsheetApp.getUi().alert('No active riders found.');
      return;
    }

    const template = HtmlService.createTemplateFromFile('EscortSidebar');
    template.requestsData = data.requestsData;
    template.requestsHeaders = data.requestsHeaders;
    template.ridersData = data.ridersData;
    template.ridersHeaders = data.ridersHeaders;

    const htmlOutput = template.evaluate().setTitle('🏍️ Assign Escort Riders').setWidth(400);
    SpreadsheetApp.getUi().showSidebar(htmlOutput);
  } catch (error) {
    logError('Error loading escort sidebar:', error);
    SpreadsheetApp.getUi().alert('Error loading sidebar: ' + error.message);
  }
}

/**
 * Renders the escort sidebar content as an HTML string for use in the web app (e.g., assignments.html).
 * This allows the web app to display a similar assignment interface.
 *
 * @return {GoogleAppsScript.HTML.HtmlOutput} HTML content for the sidebar, or an error message.
 */
function renderEscortSidebarForWebApp() {
  try {
    const data = getDataForEscortSidebar();
    const template = HtmlService.createTemplateFromFile('EscortSidebar');
    template.requestsData = data.requestsData;
    template.requestsHeaders = data.requestsHeaders;
    template.ridersData = data.ridersData;
    template.ridersHeaders = data.ridersHeaders;
    return template.evaluate().setTitle('Assign Escort Riders').setWidth(400);
  } catch (error) {
    logError('Error rendering escort sidebar for web app:', error);
    return HtmlService.createHtmlOutput(
      `<html><body><h3>⚠️ Error Loading Assignment Form</h3><p>Error: ${error.message}</p>` +
      `<p>Please try refreshing or contact support.</p><button onclick="google.script.host.close()">Close</button></body></html>`
    ).setTitle('Assignment Error').setWidth(400);
  }
}

/**
 * Gets filtered requests for web app display
 * @param {string} filter - Status filter ('All', 'New', 'Pending', etc.)
 * @return {Array<object>} Array of formatted request objects
 */

/**
 * Enhanced wrapper function for the requests page
 * Add this to your AppServices.gs file, replacing the existing version
 */
function getPageDataForRequests(filter = 'All') {
  try {
    console.log(`📋 getPageDataForRequests called with filter: ${filter}`);
    
    // Get user data
    const user = getCurrentUser();
    console.log('✅ User data retrieved:', user?.name || 'Unknown');
    
    // Get requests using the enhanced function
    const requests = getFilteredRequestsForWebApp(filter);
    console.log(`✅ Requests retrieved: ${requests?.length || 0} items`);
    
    // Ensure we return an array
    const safeRequests = Array.isArray(requests) ? requests : [];
    
    const result = {
      success: true,
      user: user,
      requests: safeRequests
    };
    
    console.log('✅ getPageDataForRequests result:', {
      success: result.success,
      userName: result.user?.name,
      requestsCount: result.requests?.length || 0
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Error in getPageDataForRequests:', error);
    logError('Error in getPageDataForRequests', error);
    
    return {
      success: false,
      error: error.message,
      user: getCurrentUser() || { name: 'Guest', roles: ['guest'], permissions: ['view'] },
      requests: []
    };
  }
}

/**
 * Alternative direct function for testing
 * This bypasses the wrapper and directly returns formatted requests
 */
function getRequestsForWebAppDirect(filter = 'All') {
  try {
    console.log(`🔄 Direct requests call with filter: ${filter}`);
    
    const result = getFilteredRequestsForWebApp(filter);
    console.log(`📊 Direct result: ${result?.length || 0} requests`);
    
    return result || [];
    
  } catch (error) {
    console.error('❌ Error in direct requests call:', error);
    return [];
  }
}

/**
 * Simple test that just returns basic data
 */
function testSimpleRequestsData() {
  try {
    console.log('🧪 Testing simple requests data...');
    
    // Try to get raw sheet data
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Requests');
    if (!sheet) {
      return { error: 'Requests sheet not found' };
    }
    
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    console.log('✅ Got sheet data:', values.length, 'rows');
    
    // Return first few rows as simple objects
    const simpleRequests = [];
    for (let i = 1; i < Math.min(6, values.length); i++) { // Skip header, get first 5 rows
      const row = values[i];
      simpleRequests.push({
        id: row[0] || `ROW-${i}`,
        requestId: row[0] || `ROW-${i}`,
        requesterName: row[2] || 'Unknown',
        type: row[4] || 'Unknown',
        requestType: row[4] || 'Unknown',
        status: row[13] || 'New',
        eventDate: 'TBD',
        startTime: 'TBD',
        endTime: 'TBD',
        startLocation: row[8] || 'TBD',
        endLocation: row[9] || 'TBD',
        ridersNeeded: row[11] || 1,
        notes: row[14] || ''
      });
    }
    
    console.log('✅ Returning', simpleRequests.length, 'simple requests');
    return simpleRequests;
    
  } catch (error) {
    console.error('❌ Error in testSimpleRequestsData:', error);
    return { error: error.message };
  }
}
/**
 * Simple test to check if requests data is accessible
 */
function testRequestsAccess() {
  try {
    console.log('🧪 Testing basic requests access...');
    
    // Test 1: Can we access the sheet?
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.requests);
    if (!sheet) {
      return { error: 'Requests sheet not found. Expected sheet name: ' + CONFIG.sheets.requests };
    }
    
    // Test 2: Get basic data
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    console.log('✅ Sheet found:', sheet.getName());
    console.log('✅ Rows found:', values.length);
    console.log('✅ Headers:', values[0]);
    
    // Test 3: Try getRequestsData function
    const requestsData = getRequestsData();
    console.log('✅ getRequestsData works:', !!requestsData);
    
    // Test 4: Try the filter function
    const filtered = getFilteredRequestsForWebApp('All');
    console.log('✅ getFilteredRequestsForWebApp works:', !!filtered);
    
    return {
      success: true,
      sheetName: sheet.getName(),
      totalRows: values.length,
      headers: values[0],
      requestsDataWorks: !!requestsData,
      filteredCount: filtered ? filtered.length : 0,
      sampleRequest: filtered && filtered.length > 0 ? filtered[0] : null
    };
    
  } catch (error) {
    console.error('❌ Test error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
/**
 * Gets requests that are suitable for assignment (not completed or cancelled).
 * Used by the assignments page in the web app.
 *
 * @param {object} user The current user object (logged for context, not used for filtering in this version).
 * @return {Array<object>} An array of formatted request objects suitable for assignment.
 */
function getFilteredRequestsForAssignments(user) {
  try {
    console.log('📋 Getting filtered requests for assignments page...');
    console.log('User parameter:', user);
    const requestsData = getRequestsData();
    if (!requestsData || !requestsData.data || requestsData.data.length === 0) {
      console.log('❌ No requests data found');
      return [];
    }
    const columnMap = requestsData.columnMap;
    console.log('Column map:', columnMap);
    console.log('Looking for Request ID column:', CONFIG.columns.requests.id);
    console.log('Request ID column index:', columnMap[CONFIG.columns.requests.id]);

    const assignableRequests = [];
    for (let i = 0; i < requestsData.data.length; i++) {
      try {
        const row = requestsData.data[i];
        if (i < 3) {
          console.log(`Row ${i} data:`, row);
          console.log(`Row ${i} Request ID:`, getColumnValue(row, columnMap, CONFIG.columns.requests.id));
        }
        const requestId = getColumnValue(row, columnMap, CONFIG.columns.requests.id);
        const requesterName = getColumnValue(row, columnMap, CONFIG.columns.requests.requesterName);
        const status = getColumnValue(row, columnMap, CONFIG.columns.requests.status);
        const eventDate = getColumnValue(row, columnMap, CONFIG.columns.requests.eventDate);
        if (!requestId) {
          console.log(`⚠️ Missing Request ID in row ${i}:`, { requestId, requesterName, rawRow: row.slice(0, 5) });
          continue;
        }
        if (!requesterName) {
          console.log(`⚠️ Missing requester name in row ${i} for Request ID: ${requestId}`);
          continue;
        }
        if (!['New', 'Pending', 'Assigned', 'Unassigned', 'In Progress'].includes(status)) {
          continue;
        }
        assignableRequests.push({
          id: requestId, requestId, requesterName,
          type: getColumnValue(row, columnMap, CONFIG.columns.requests.type) || 'Unknown',
          eventDate: formatDateForDisplay(eventDate) || 'No Date',
          startTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.requests.startTime)) || 'No Time',
          endTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.requests.endTime)) || '',
          startLocation: getColumnValue(row, columnMap, CONFIG.columns.requests.startLocation) || 'Location TBD',
          endLocation: getColumnValue(row, columnMap, CONFIG.columns.requests.endLocation) || '',
          ridersNeeded: getColumnValue(row, columnMap, CONFIG.columns.requests.ridersNeeded) || 1,
          ridersAssigned: getColumnValue(row, columnMap, CONFIG.columns.requests.ridersAssigned) || '',
          status: status || 'New'
        });
      } catch (rowError) {
        console.log(`⚠️ Error processing request row ${i}:`, rowError);
      }
    }
    const sortedRequests = assignableRequests.sort((a, b) => {
      try {
        if (a.eventDate === 'No Date' && b.eventDate === 'No Date') return 0;
        if (a.eventDate === 'No Date') return 1;
        if (b.eventDate === 'No Date') return -1;
        let dateA, dateB;
        try { dateA = new Date(a.eventDate); } catch (e) { dateA = null; }
        try { dateB = new Date(b.eventDate); } catch (e) { dateB = null; }
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB.getTime() - dateA.getTime();
      } catch (sortError) { return 0; }
    });
    console.log(`✅ Returning ${sortedRequests.length} assignable requests`);
    if (sortedRequests.length > 0) console.log('First processed request:', sortedRequests[0]);
    return sortedRequests;
  } catch (error) {
    console.error('❌ Error getting filtered requests for assignments:', error);
    logError('Error in getFilteredRequestsForAssignments', error);
    return [];
  }
}

/**
 * Fetches active riders for the assignments page.
 * Filters riders by status (Active or Available, or no status) and ensures they have a name.
 *
 * @return {Array<object>} An array of active rider objects, each containing:
 *                         name, jpNumber, phone, email, carrier, status ('Available').
 */
function getActiveRidersForAssignments() {
  try {
    console.log('🏍️ Getting active riders for assignments page...');
    const ridersData = getRidersData();
    if (!ridersData || !ridersData.data || ridersData.data.length === 0) {
      console.log('❌ No riders data found');
      return [];
    }
    const columnMap = ridersData.columnMap;
    const activeRiders = [];
    for (let i = 0; i < ridersData.data.length; i++) {
      try {
        const row = ridersData.data[i];
        const riderName = getColumnValue(row, columnMap, CONFIG.columns.riders.name);
        const jpNumber = getColumnValue(row, columnMap, CONFIG.columns.riders.jpNumber);
        const status = getColumnValue(row, columnMap, CONFIG.columns.riders.status);
        const phone = getColumnValue(row, columnMap, CONFIG.columns.riders.phone);
        const email = getColumnValue(row, columnMap, CONFIG.columns.riders.email);
        const carrier = getColumnValue(row, columnMap, CONFIG.columns.riders.carrier);
        if (!riderName || !String(riderName).trim()) continue;
        const riderStatus = String(status || '').trim().toLowerCase();
        if (riderStatus && !['active', 'available', ''].includes(riderStatus)) continue;
        activeRiders.push({
          name: riderName, jpNumber: jpNumber || 'N/A', phone: phone || 'N/A',
          email: email || 'N/A', carrier: carrier || 'N/A', status: 'Available'
        });
      } catch (rowError) {
        console.log(`⚠️ Error processing rider row ${i}:`, rowError);
      }
    }
    console.log(`✅ Returning ${activeRiders.length} active riders`);
    return activeRiders;
  } catch (error) {
    console.error('❌ Error getting active riders for assignments:', error);
    logError('Error in getActiveRidersForAssignments', error);
    return [];
  }
}

/**
 * Fetches upcoming assignments, formatted for the assignments page.
 * Filters for assignments in the next 60 days that are not completed or cancelled.
 * @param {object} user The current user object (logged for context, not used for filtering).
 * @return {Array<object>} An array of formatted upcoming assignment objects.
 */
function getUpcomingAssignmentsForAssignmentsPage(user) {
  try {
    console.log('📋 Getting upcoming assignments for assignments page...');
    const assignmentsData = getAssignmentsData();
    if (!assignmentsData || !assignmentsData.data || assignmentsData.data.length === 0) {
      console.log('❌ No assignments data found');
      return [];
    }
    const columnMap = assignmentsData.columnMap;
    const today = new Date(); today.setHours(0,0,0,0);
    const futureDate = new Date(today.getTime() + (60 * 24 * 60 * 60 * 1000));
    const upcomingAssignments = [];
    for (let i = 0; i < assignmentsData.data.length; i++) {
      try {
        const row = assignmentsData.data[i];
        const assignmentId = getColumnValue(row, columnMap, CONFIG.columns.assignments.id);
        const requestId = getColumnValue(row, columnMap, CONFIG.columns.assignments.requestId);
        const riderName = getColumnValue(row, columnMap, CONFIG.columns.assignments.riderName);
        const status = getColumnValue(row, columnMap, CONFIG.columns.assignments.status);
        const eventDate = getColumnValue(row, columnMap, CONFIG.columns.assignments.eventDate);
        if (!assignmentId || !requestId || !riderName || !eventDate) continue;
        if (['Completed', 'Cancelled', 'No Show'].includes(status)) continue;
        const assignmentDate = new Date(eventDate);
        if (isNaN(assignmentDate.getTime()) || assignmentDate < today || assignmentDate > futureDate) continue;

        const startLocation = getColumnValue(row, columnMap, CONFIG.columns.assignments.startLocation);
        const endLocation = getColumnValue(row, columnMap, CONFIG.columns.assignments.endLocation);
        let displayLocation = 'Location TBD';
        if (startLocation) { displayLocation = startLocation; if (endLocation) displayLocation += ` → ${endLocation}`; }
        else if (endLocation) displayLocation = `To: ${endLocation}`;

        upcomingAssignments.push({
          id: assignmentId, requestId, eventDate: formatDateForDisplay(eventDate),
          startTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.assignments.startTime)) || 'No Time',
          endTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.assignments.endTime)) || '',
          riderName, startLocation: displayLocation, status: status || 'Assigned',
          notificationStatus: determineNotificationStatus(row, columnMap)
        });
      } catch (rowError) { console.log(`⚠️ Error processing assignment row ${i}:`, rowError); }
    }
    const sortedAssignments = upcomingAssignments.sort((a, b) => {
      try {
        const dateA = new Date(a.eventDate); const dateB = new Date(b.eventDate);
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1; if (isNaN(dateB.getTime())) return -1;
        return dateA.getTime() - dateB.getTime();
      } catch (sortError) { return 0; }
    });
    console.log(`✅ Returning ${sortedAssignments.length} upcoming assignments`);
    return sortedAssignments;
  } catch (error) {
    console.error('❌ Error getting upcoming assignments for assignments page:', error);
    logError('Error in getUpcomingAssignmentsForAssignmentsPage', error);
    return [];
  }
}

/**
 * A debugging function to test data retrieval for the assignments page.
 * Fetches requests, riders, and assignments and logs counts and sample data.
 * @return {object} An object containing samples of requests, riders, assignments, and counts.
 */
function debugAssignmentsPageData() {
  try {
    console.log('=== DEBUGGING ASSIGNMENTS PAGE DATA ===');
    const requests = getFilteredRequestsForAssignments({roles: ['admin']});
    const riders = getActiveRidersForAssignments();
    const assignments = getUpcomingAssignmentsForAssignmentsPage({roles: ['admin']});
    console.log('Requests count:', requests.length, 'Riders count:', riders.length, 'Assignments count:', assignments.length);
    if (requests.length > 0) console.log('Sample request:', requests[0]);
    if (riders.length > 0) console.log('Sample rider:', riders[0]);
    if (assignments.length > 0) console.log('Sample assignment:', assignments[0]);
    return {
      requests: requests.slice(0,3), riders: riders.slice(0,3), assignments: assignments.slice(0,3),
      summary: { requestsCount: requests.length, ridersCount: riders.length, assignmentsCount: assignments.length }
    };
  } catch (error) {
    console.error('Error in debugAssignmentsPageData:', error);
    return { error: error.message };
  }
}

/**
 * NEW WRAPPER FUNCTIONS FOR CONSOLIDATED CLIENT-SIDE DATA REQUESTS
 */

/**
 * Fetches all necessary data for the main dashboard (index.html) in a single call.
 * @return {object} An object containing `user`, `stats`, `recentRequests`, and `upcomingAssignments`. Includes a `success` flag and `error` message on failure.
 */
function getPageDataForDashboard() {
  try {
    const user = getCurrentUser();
    const stats = calculateDashboardStatistics();
    const rawRequests = getRequestsData();
    let recentRequests = [];
    if (rawRequests && rawRequests.data) {
      const allFormattedRequests = getFilteredRequestsForWebApp(rawRequests, 'All');
      try {
        recentRequests = allFormattedRequests.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
      } catch (e) {
        console.error("Error sorting recent requests: ", e);
        recentRequests = allFormattedRequests.slice(0, 10);
      }
    }
    const upcomingAssignments = getUpcomingAssignmentsForWebApp(user);
    return { success: true, user, stats, recentRequests, upcomingAssignments };
  } catch (error) {
    logError('Error in getPageDataForDashboard', error);
    return {
      success: false, error: error.message, user: getCurrentUser(),
      stats: { activeRiders: 0, pendingRequests: 0, todayAssignments: 0, weekAssignments: 0, totalRequests: 0, completedRequests: 0 },
      recentRequests: [], upcomingAssignments: []
    };
  }
}


/**
 * Gets consolidated data for the assignments page
 * @param {string} [requestIdToLoad] - Optional request ID to pre-select
 * @return {object} Consolidated data object with user, requests, riders, and optional initial request details
 */
function getPageDataForAssignments(requestIdToLoad) {
  try {
    console.log('🔄 Loading assignments page data...', requestIdToLoad ? `Pre-selecting: ${requestIdToLoad}` : '');
    
    const result = {
      success: true,
      user: null,
      requests: [],
      riders: [],
      initialRequestDetails: null
    };
    
    // Get user data
    try {
      result.user = getCurrentUser();
    } catch (userError) {
      console.log('⚠️ Could not load user data:', userError);
      result.user = {
        name: 'System User',
        email: 'user@system.com',
        roles: ['admin'],
        permissions: ['view', 'assign_riders']
      };
    }
    
    // Get assignable requests
    try {
      result.requests = getFilteredRequestsForAssignments(result.user);
      console.log(`✅ Loaded ${result.requests.length} assignable requests`);
    } catch (requestsError) {
      console.log('⚠️ Could not load requests:', requestsError);
      result.requests = [];
    }
    
    // Get active riders
    try {
      result.riders = getActiveRidersForWebApp();
      console.log(`✅ Loaded ${result.riders.length} active riders`);
    } catch (ridersError) {
      console.log('⚠️ Could not load riders:', ridersError);
      result.riders = [];
    }
    
    // If a specific request ID was requested, try to get its details
    if (requestIdToLoad) {
      try {
        const specificRequest = result.requests.find(r => r.id === requestIdToLoad);
        if (specificRequest) {
          result.initialRequestDetails = specificRequest;
          console.log(`✅ Found initial request details for: ${requestIdToLoad}`);
        } else {
          console.log(`⚠️ Request ID ${requestIdToLoad} not found in assignable requests`);
        }
      } catch (detailsError) {
        console.log('⚠️ Could not load initial request details:', detailsError);
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error in getPageDataForAssignments:', error);
    return {
      success: false,
      error: error.message,
      user: {
        name: 'System User',
        email: 'user@system.com',
        roles: ['admin'],
        permissions: ['view', 'assign_riders']
      }
    };
  }
}

/**
 * Gets consolidated data for the requests page
 * @param {string} [filter='All'] - Status filter for requests
 * @return {object} Consolidated data object with user and filtered requests
 */
/**
 * Enhanced function to get filtered requests for web app with better error handling
 * Add this to your Dashboard.js or AppServices.gs file
 */
function getFilteredRequestsForWebApp(filter = 'All') {
  try {
    console.log(`📋 Getting filtered requests for web app with filter: ${filter}`);
    
    // Get the raw requests data
    const requestsData = getRequestsData();
    
    if (!requestsData || !requestsData.data || requestsData.data.length === 0) {
      console.log('❌ No requests data found');
      return [];
    }
    
    console.log(`✅ Found ${requestsData.data.length} total requests in sheet`);
    
    const columnMap = requestsData.columnMap;
    const filteredRequests = [];
    
    // Process each request row
    for (let i = 0; i < requestsData.data.length; i++) {
      try {
        const row = requestsData.data[i];
        
        // Get basic required fields
        const requestId = getColumnValue(row, columnMap, CONFIG.columns.requests.id);
        const requesterName = getColumnValue(row, columnMap, CONFIG.columns.requests.requesterName);
        const status = getColumnValue(row, columnMap, CONFIG.columns.requests.status);
        
        // Skip rows without essential data
        if (!requestId || !requesterName) {
          console.log(`⚠️ Skipping row ${i}: Missing ID or requester name`);
          continue;
        }
        
        // Apply status filter
        if (filter !== 'All' && status !== filter) {
          continue;
        }
        
        // Build the formatted request object
        const formattedRequest = {
          requestId: requestId,
          requesterName: requesterName,
          requesterContact: getColumnValue(row, columnMap, CONFIG.columns.requests.requesterContact) || '',
          requestType: getColumnValue(row, columnMap, CONFIG.columns.requests.type) || 'Unknown',
          eventDate: formatDateForDisplay(getColumnValue(row, columnMap, CONFIG.columns.requests.eventDate)) || 'No Date',
          startTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.requests.startTime)) || 'No Time',
          endTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.requests.endTime)) || '',
          startLocation: getColumnValue(row, columnMap, CONFIG.columns.requests.startLocation) || 'Location TBD',
          endLocation: getColumnValue(row, columnMap, CONFIG.columns.requests.endLocation) || '',
          secondaryEndLocation: getColumnValue(row, columnMap, CONFIG.columns.requests.secondaryLocation) || '',
          ridersNeeded: getColumnValue(row, columnMap, CONFIG.columns.requests.ridersNeeded) || 1,
          status: status || 'New',
          specialRequirements: getColumnValue(row, columnMap, CONFIG.columns.requests.requirements) || '',
          notes: getColumnValue(row, columnMap, CONFIG.columns.requests.notes) || '',
          ridersAssigned: getColumnValue(row, columnMap, CONFIG.columns.requests.ridersAssigned) || '',
          courtesy: getColumnValue(row, columnMap, CONFIG.columns.requests.courtesy) || 'No',
          lastUpdated: formatDateTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.requests.lastUpdated)) || '',
          date: formatDateForDisplay(getColumnValue(row, columnMap, CONFIG.columns.requests.date)) || formatDateForDisplay(getColumnValue(row, columnMap, CONFIG.columns.requests.eventDate)) || 'No Date'
        };
        
        filteredRequests.push(formattedRequest);
        
        // Log first few for debugging
        if (i < 3) {
          console.log(`✅ Processed request ${i}:`, {
            id: formattedRequest.requestId,
            requester: formattedRequest.requesterName,
            status: formattedRequest.status,
            eventDate: formattedRequest.eventDate
          });
        }
        
      } catch (rowError) {
        console.log(`⚠️ Error processing request row ${i}:`, rowError);
      }
    }
    
    // Sort by event date (most recent first)
    filteredRequests.sort((a, b) => {
      try {
        const dateA = new Date(a.eventDate);
        const dateB = new Date(b.eventDate);
        
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        
        return dateB.getTime() - dateA.getTime();
      } catch (sortError) {
        console.log('⚠️ Error sorting requests:', sortError);
        return 0;
      }
    });
    
    console.log(`✅ Returning ${filteredRequests.length} filtered requests for filter: ${filter}`);
    
    if (filteredRequests.length > 0) {
      console.log('Sample filtered request:', filteredRequests[0]);
    }
    
    return filteredRequests;
    
  } catch (error) {
    console.error('❌ Error in getFilteredRequestsForWebApp:', error);
    logError('Error in getFilteredRequestsForWebApp', error);
    
    // Return empty array instead of null to prevent client-side errors
    return [];
  }
}

/**
 * Debugging function to test request data retrieval
 * Call this from your browser console: google.script.run.debugRequestsData()
 */
function debugRequestsData() {
  try {
    console.log('=== DEBUGGING REQUESTS DATA ===');
    
    // Test basic data retrieval
    const requestsData = getRequestsData();
    console.log('Raw requests data:', {
      hasData: !!requestsData,
      dataLength: requestsData?.data?.length || 0,
      headers: requestsData?.headers || [],
      columnMap: requestsData?.columnMap || {}
    });
    
    // Test column mapping
    if (requestsData?.columnMap) {
      console.log('Column mappings:');
      Object.entries(CONFIG.columns.requests).forEach(([key, columnName]) => {
        const index = requestsData.columnMap[columnName];
        console.log(`  ${key} (${columnName}): column ${index}`);
      });
    }
    
    // Test sample data processing
    if (requestsData?.data?.length > 0) {
      console.log('Sample raw row:', requestsData.data[0]);
      
      const sampleProcessed = {
        requestId: getColumnValue(requestsData.data[0], requestsData.columnMap, CONFIG.columns.requests.id),
        requesterName: getColumnValue(requestsData.data[0], requestsData.columnMap, CONFIG.columns.requests.requesterName),
        status: getColumnValue(requestsData.data[0], requestsData.columnMap, CONFIG.columns.requests.status)
      };
      console.log('Sample processed data:', sampleProcessed);
    }
    
    // Test the actual function
    const filtered = getFilteredRequestsForWebApp('All');
    console.log('Filtered result:', {
      type: typeof filtered,
      isArray: Array.isArray(filtered),
      length: filtered?.length || 0,
      sample: filtered?.[0] || 'No data'
    });
    
    return {
      success: true,
      rawDataLength: requestsData?.data?.length || 0,
      filteredLength: filtered?.length || 0,
      columnMap: requestsData?.columnMap || {},
      sampleFiltered: filtered?.[0] || null
    };
    
  } catch (error) {
    console.error('Debug error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
/**
 * Test function to see what data we have
 */
function testRequestsPageData() {
  try {
    console.log('🧪 Testing requests data...');
    
    // Test basic data access
    const requestsData = getRequestsData();
    console.log('Raw requests data:', requestsData);
    
    if (requestsData && requestsData.data) {
      console.log('Found', requestsData.data.length, 'raw request rows');
      
      // Show first few rows
      if (requestsData.data.length > 0) {
        console.log('First request row:', requestsData.data[0]);
        console.log('Column mapping:', requestsData.columnMap);
      }
    }
    
    // Test the filtered function
    const filtered = getFilteredRequestsForWebApp('All');
    console.log('Filtered requests:', filtered);
    
    return {
      success: true,
      rawCount: requestsData?.data?.length || 0,
      filteredCount: filtered?.length || 0,
      sampleRaw: requestsData?.data?.[0] || null,
      sampleFiltered: filtered?.[0] || null
    };
    
  } catch (error) {
    console.error('Test error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
/**
 * Test function to debug requests page data
 */
function testRequestsPageData() {
  console.log('🧪 Testing requests page data...');
  
  try {
    const result = getPageDataForRequests('All');
    console.log('✅ Success:', result.success);
    console.log('👤 User:', result.user?.name);
    console.log('📋 Requests count:', result.requests?.length);
    
    if (result.requests && result.requests.length > 0) {
      console.log('📋 Sample request:', result.requests[0]);
      console.log('📋 Request fields available:', Object.keys(result.requests[0]));
    }
    
    // Test with filter
    const filteredResult = getPageDataForRequests('New');
    console.log('📋 New requests count:', filteredResult.requests?.length);
    
    return result;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { error: error.message };
  }
}

/**
 * Fetches data for the notifications page (notifications.html).
 * @param {Array<string>} [userRoles=['admin']] The roles of the current user (used for potential filtering, though not implemented in this version).
 * @return {object} An object containing `user`, `assignments` (all relevant for notifications),
 *                  and `stats` (notification-related statistics).
 *                  Includes a `success` flag and `error` message on failure.
 */
/**
 * Gets consolidated data for the notifications page
 * @return {object} Consolidated data object with user, assignments, and stats
 */
function getPageDataForNotifications() {
  try {
    console.log('🔄 Loading notifications page data...');
    
    const result = {
      success: true,
      user: null,
      assignments: [],
      stats: {},
      recentActivity: []
    };
    
    // Get user data
    try {
      result.user = getCurrentUser();
    } catch (userError) {
      console.log('⚠️ Could not load user data:', userError);
      result.user = {
        name: 'System User',
        email: 'user@system.com',
        roles: ['admin'],
        permissions: ['send_notifications']
      };
    }
    
    // Get all assignments for notifications
    try {
      result.assignments = getAllAssignmentsForNotifications();
      console.log(`✅ Loaded ${result.assignments.length} assignments for notifications`);
    } catch (assignmentsError) {
      console.log('⚠️ Could not load assignments:', assignmentsError);
      result.assignments = [];
    }
    
    // Calculate notification stats
    try {
      result.stats = calculateNotificationStats(result.assignments);
      console.log('✅ Calculated notification stats:', result.stats);
    } catch (statsError) {
      console.log('⚠️ Could not calculate stats:', statsError);
      result.stats = {
        totalAssignments: 0,
        pendingNotifications: 0,
        smsToday: 0,
        emailToday: 0
      };
    }
    
    // Get recent notification activity
    try {
      result.recentActivity = getRecentNotificationActivity(result.assignments);
      console.log(`✅ Found ${result.recentActivity.length} recent activities`);
    } catch (activityError) {
      console.log('⚠️ Could not load recent activity:', activityError);
      result.recentActivity = [];
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error in getPageDataForNotifications:', error);
    return {
      success: false,
      error: error.message,
      user: {
        name: 'System User',
        email: 'user@system.com',
        roles: ['admin'],
        permissions: ['send_notifications']
      }
    };
  }
}

/**
 * ADD THIS NEW FUNCTION to AppServices.gs
 * Gets all assignments formatted for notifications page
 */
function getAllAssignmentsForNotifications() {
  try {
    const assignmentsData = getAssignmentsData();
    if (!assignmentsData || !assignmentsData.data) {
      console.log('⚠️ No assignments data found');
      return [];
    }
    
    const assignments = assignmentsData.data
      .filter(assignment => {
        const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
        
        // Only include assignments with riders that aren't cancelled/completed
        return riderName && 
               riderName.trim().length > 0 && 
               !['Cancelled', 'Completed', 'No Show'].includes(status);
      })
      .map(assignment => {
        const smsSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.smsSent);
        const emailSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.emailSent);
        const notified = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.notified);
        
        // Determine notification status
        let notificationStatus = 'none';
        if (smsSent instanceof Date && emailSent instanceof Date) {
          notificationStatus = 'both_sent';
        } else if (smsSent instanceof Date) {
          notificationStatus = 'sms_sent';
        } else if (emailSent instanceof Date) {
          notificationStatus = 'email_sent';
        } else if (notified instanceof Date) {
          notificationStatus = 'notified'; // Generic notification
        }
        
        // Get the most recent notification timestamp
        let lastNotified = null;
        if (smsSent instanceof Date || emailSent instanceof Date || notified instanceof Date) {
          const dates = [smsSent, emailSent, notified].filter(d => d instanceof Date);
          if (dates.length > 0) {
            lastNotified = new Date(Math.max(...dates.map(d => d.getTime())));
          }
        }
        
        return {
          id: getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.id),
          requestId: getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.requestId),
          riderName: getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName),
          riderPhone: getRiderPhone(getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName)),
          riderEmail: getRiderEmail(getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName)),
          riderCarrier: getRiderCarrier(getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName)),
          eventDate: formatDateForDisplay(getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate)),
          startTime: formatTimeForDisplay(getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.startTime)),
          endTime: formatTimeForDisplay(getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.endTime)),
          startLocation: getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.startLocation),
          endLocation: getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.endLocation),
          notificationStatus: notificationStatus,
          lastNotified: lastNotified ? lastNotified.toISOString() : null,
          status: getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status)
        };
      })
      .filter(assignment => assignment.id && assignment.riderName);
    
    console.log(`✅ Processed ${assignments.length} assignments for notifications`);
    return assignments;
    
  } catch (error) {
    console.error('❌ Error getting assignments for notifications:', error);
    return [];
  }
}


/**
 * Gets all assignments formatted for notifications page
 * @return {Array<object>} Array of assignment objects with notification data
 */
function getAllAssignmentsForNotifications() {
  try {
    const assignmentsData = getAssignmentsData();
    if (!assignmentsData || !assignmentsData.data) {
      console.log('⚠️ No assignments data found');
      return [];
    }
    
    const assignments = assignmentsData.data
      .filter(assignment => {
        const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
        
        // Only include assignments with riders that aren't cancelled/completed
        return riderName && 
               riderName.trim().length > 0 && 
               !['Cancelled', 'Completed', 'No Show'].includes(status);
      })
      .map(assignment => {
        const smsSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.smsSent);
        const emailSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.emailSent);
        const notified = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.notified);
        
        // Determine notification status
        let notificationStatus = 'none';
        if (smsSent instanceof Date && emailSent instanceof Date) {
          notificationStatus = 'both_sent';
        } else if (smsSent instanceof Date) {
          notificationStatus = 'sms_sent';
        } else if (emailSent instanceof Date) {
          notificationStatus = 'email_sent';
        } else if (notified instanceof Date) {
          notificationStatus = 'notified'; // Generic notification
        }
        
        // Get the most recent notification timestamp
        let lastNotified = null;
        if (smsSent instanceof Date || emailSent instanceof Date || notified instanceof Date) {
          const dates = [smsSent, emailSent, notified].filter(d => d instanceof Date);
          if (dates.length > 0) {
            lastNotified = new Date(Math.max(...dates.map(d => d.getTime())));
          }
        }
        
        return {
          id: getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.id),
          requestId: getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.requestId),
          riderName: getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName),
          riderPhone: getRiderPhone(getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName)),
          riderEmail: getRiderEmail(getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName)),
          riderCarrier: getRiderCarrier(getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName)),
          eventDate: formatDateForDisplay(getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate)),
          startTime: formatTimeForDisplay(getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.startTime)),
          endTime: formatTimeForDisplay(getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.endTime)),
          startLocation: getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.startLocation),
          endLocation: getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.endLocation),
          notificationStatus: notificationStatus,
          lastNotified: lastNotified ? lastNotified.toISOString() : null,
          status: getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status)
        };
      })
      .filter(assignment => assignment.id && assignment.riderName);
    
    console.log(`✅ Processed ${assignments.length} assignments for notifications`);
    return assignments;
    
  } catch (error) {
    console.error('❌ Error getting assignments for notifications:', error);
    return [];
  }
}

/**
 * Helper function to get rider phone from riders data
 */
function getRiderPhone(riderName) {
  if (!riderName) return 'N/A';
  try {
    const ridersData = getRidersData();
    const rider = ridersData.data.find(r => 
      getColumnValue(r, ridersData.columnMap, CONFIG.columns.riders.name) === riderName
    );
    return rider ? getColumnValue(rider, ridersData.columnMap, CONFIG.columns.riders.phone) || 'N/A' : 'N/A';
  } catch (error) {
    return 'N/A';
  }
}

/**
 * Helper function to get rider email from riders data
 */
function getRiderEmail(riderName) {
  if (!riderName) return 'N/A';
  try {
    const ridersData = getRidersData();
    const rider = ridersData.data.find(r => 
      getColumnValue(r, ridersData.columnMap, CONFIG.columns.riders.name) === riderName
    );
    return rider ? getColumnValue(rider, ridersData.columnMap, CONFIG.columns.riders.email) || 'N/A' : 'N/A';
  } catch (error) {
    return 'N/A';
  }
}

/**
 * Helper function to get rider carrier from riders data
 */
function getRiderCarrier(riderName) {
  if (!riderName) return 'N/A';
  try {
    const ridersData = getRidersData();
    const rider = ridersData.data.find(r => 
      getColumnValue(r, ridersData.columnMap, CONFIG.columns.riders.name) === riderName
    );
    return rider ? getColumnValue(rider, ridersData.columnMap, CONFIG.columns.riders.carrier) || 'N/A' : 'N/A';
  } catch (error) {
    return 'N/A';
  }
}

/**
 * Calculates notification statistics from assignments data
 */
function calculateNotificationStats(assignments) {
  if (!assignments || !Array.isArray(assignments)) {
    return {
      totalAssignments: 0,
      pendingNotifications: 0,
      smsToday: 0,
      emailToday: 0
    };
  }
  
  const today = new Date();
  const todayStr = today.toDateString();
  
  let totalAssignments = assignments.length;
  let pendingNotifications = 0;
  let smsToday = 0;
  let emailToday = 0;
  
  assignments.forEach(assignment => {
    // Count pending notifications (not yet notified)
    if (!assignment.notificationStatus || assignment.notificationStatus === 'none') {
      pendingNotifications++;
    }
    
    // Count today's notifications
    if (assignment.lastNotified) {
      const notifiedDate = new Date(assignment.lastNotified);
      if (notifiedDate.toDateString() === todayStr) {
        if (assignment.notificationStatus === 'sms_sent' || assignment.notificationStatus === 'both_sent') {
          smsToday++;
        }
        if (assignment.notificationStatus === 'email_sent' || assignment.notificationStatus === 'both_sent') {
          emailToday++;
        }
      }
    }
  });
  
  return {
    totalAssignments: totalAssignments,
    pendingNotifications: pendingNotifications,
    smsToday: smsToday,
    emailToday: emailToday
  };
}

/**
 * Gets recent notification activity
 */
function getRecentNotificationActivity(assignments) {
  if (!assignments || !Array.isArray(assignments)) {
    return [];
  }
  
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  return assignments
    .filter(assignment => {
      return assignment.lastNotified && new Date(assignment.lastNotified) > weekAgo;
    })
    .sort((a, b) => new Date(b.lastNotified).getTime() - new Date(a.lastNotified).getTime())
    .slice(0, 10)
    .map(assignment => ({
      id: `${assignment.id}_activity`,
      timestamp: assignment.lastNotified,
      type: assignment.notificationStatus.includes('sms') ? 'SMS' : 'Email',
      recipient: assignment.riderName,
      requestId: assignment.requestId,
      status: 'Success',
      messagePreview: `Assignment notification sent to ${assignment.riderName}`
    }));
}

/**
 * Fetches data for the reports page (reports.html).
 * @param {object} filters Filters to apply for report generation (e.g., date ranges, types).
 * @return {object} An object containing `user` and `reportData`.
 *                  Includes a `success` flag and `error` message on failure.
 */
function getPageDataForReports(filters) {
  try {
    const user = getCurrentUser();
    const reportData = generateReportData(filters); // From Reports.js
    return { success: true, user, reportData };
  } catch (error) {
    logError('Error in getPageDataForReports', error);
    return { success: false, error: error.message, user: getCurrentUser(), reportData: null };
  }
}

/**
 * Fetches all necessary data for the mobile rider view (requests and specific assignments).
 * @param {string} [filter='All'] The status filter to apply to the general requests.
 * @return {object} An object containing `user`, `requests`, and `assignments`.
 *                  Includes a `success` flag and `error` message on failure.
 */
function getPageDataForMobileRiderView(filter = 'All') {
  let user = null;
  try {
    user = getCurrentUser(); // Attempt to get user info first

    // Fetch general requests
    const rawRequests = getRequestsData();
    let requests = [];
    // Ensure getFilteredRequestsForWebApp is available in the global scope or defined in AppServices.gs
    if (typeof getFilteredRequestsForWebApp === 'function') {
        requests = getFilteredRequestsForWebApp(rawRequests, filter);
    } else {
        // console.warn('getFilteredRequestsForWebApp is not defined. Skipping general requests.');
    }

    // Fetch assignments specific to the rider
    const assignments = getMobileAssignmentsForRider(); // Newly added function

    return {
      success: true,
      user: user,
      requests: requests,
      assignments: assignments
    };

  } catch (error) {
    // console.error('Error in getPageDataForMobileRiderView:', error.message, error.stack);
    if (typeof logError === 'function') {
      logError('Error in getPageDataForMobileRiderView', error);
    } else {
      // console.error('logError function not available. Error in getPageDataForMobileRiderView:', error);
    }
    if (!user) {
      try { user = getCurrentUser(); } catch (e) { /* ignore secondary error */ }
    }
    return {
      success: false,
      error: error.message,
      user: user,
      requests: [],
      assignments: []
    };
  }
}

/**
 * Helper function to calculate notification-related statistics from a list of assignments.
 * @param {Array<object>} assignments An array of assignment objects.
 * @return {object} An object with statistics: totalAssignments, pendingNotifications, smsToday, emailToday.
 */
function calculateStatsFromAssignmentsData(assignments) {
    if (!assignments || !Array.isArray(assignments)) {
        return { totalAssignments: 0, pendingNotifications: 0, smsToday: 0, emailToday: 0 };
    }
    const todayStr = new Date().toDateString();
    let pending = 0;
    let smsTodayCount = 0;
    let emailTodayCount = 0;
    assignments.forEach(asm => {
        if (!asm.notificationStatus || asm.notificationStatus === 'none') {
            pending++;
        }
        if (asm.lastNotified) {
            const notifiedDate = new Date(asm.lastNotified);
            if (notifiedDate.toDateString() === todayStr) {
                if (asm.notificationStatus === 'sms_sent' || asm.notificationStatus === 'both_sent') smsTodayCount++;
                if (asm.notificationStatus === 'email_sent' || asm.notificationStatus === 'both_sent') emailTodayCount++;
            }
        }
    });
    return {
        totalAssignments: assignments.length,
        pendingNotifications: pending,
        smsToday: smsTodayCount,
        emailToday: emailTodayCount
    };
}

// --- End of From WebAppService.js ---

// --- From Dashboard.js ---
// (JSDoc comments for these functions were added in a previous step and are assumed to be present in the source)
// displayDashboardLayout, setupDashboardFilterDropdown, refreshDashboard, updateSummaryStatistics,
// calculateDashboardStatistics, updateRequestsDisplay, getFilteredRequestsForWebApp,
// getFormattedRequestsForDashboard, updateRiderScheduleSection, getAssignedRidersForUpcomingWeek,
// buildCompactRiderScheduleGrid, applyStatusColors, formatDashboardColumns, formatRequestsSheetForLineBreaks
// --- End of From Dashboard.js ---

// --- From Reports.js ---
// (JSDoc comments for generateReportData was added previously)
// --- End of From Reports.js ---

// --- From RequestCRUD.js ---
// (JSDoc comments for these functions were added previously)
// createNewRequest, updateExistingRequest, deleteRequest, parseTimeString
// --- End of From RequestCRUD.js ---

// --- From AssignmentManager.js ---
// (JSDoc comments for these functions were added previously)
// buildAssignmentRow, cancelRiderAssignment, addRiderAssignments, processAssignmentAndPopulate,
// getRequestDetails, generateAssignmentId, updateRequestStatus
// --- End of From AssignmentManager.js ---

/**
 * Fetches assignments specifically for the logged-in rider, formatted for mobile display.
 * Filters assignments based on the rider's email.
 *
 * @return {Array<object>} An array of assignment objects for the rider.
 *                         Each object contains: assignmentId, requestId, eventDate, startTime,
 *                         startLocation, status.
 *                         Returns an empty array if no assignments or an error occurs.
 */
function getMobileAssignmentsForRider() {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      // console.warn('No active user email found for getMobileAssignmentsForRider.');
      return [];
    }

    // console.log(`🏍️ Getting mobile assignments for rider: ${userEmail}`);

    const assignmentsData = getAssignmentsData(); // Assumes this function exists and returns { data: [], columnMap: {} }

    if (!assignmentsData || !assignmentsData.data || assignmentsData.data.length === 0) {
      // console.log('❌ No assignments data found in getMobileAssignmentsForRider.');
      return [];
    }

    const columnMap = assignmentsData.columnMap;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Consider assignments from the beginning of today

    const riderAssignments = [];

    for (let i = 0; i < assignmentsData.data.length; i++) {
      const row = assignmentsData.data[i];
      let riderIdentifierFound = false;

      const assignedRiderEmailColumn = CONFIG.columns.assignments.riderEmail;
      if (columnMap.hasOwnProperty(assignedRiderEmailColumn)) {
        const assignedRiderEmail = getColumnValue(row, columnMap, assignedRiderEmailColumn);
        if (assignedRiderEmail && String(assignedRiderEmail).trim().toLowerCase() === userEmail.trim().toLowerCase()) {
          riderIdentifierFound = true;
        }
      } else {
        // console.warn(`Configured riderEmail column "${assignedRiderEmailColumn}" not found in Assignments sheet columnMap. Falling back to name matching.`);
      }

      if (!riderIdentifierFound) {
        const assignedRiderNameColumn = CONFIG.columns.assignments.riderName;
        if (columnMap.hasOwnProperty(assignedRiderNameColumn)) {
          const assignedRiderName = getColumnValue(row, columnMap, assignedRiderNameColumn);
          const userProfile = getCurrentUser();
          const currentUserName = userProfile ? userProfile.name : Session.getActiveUser().getUsername();
          if (assignedRiderName && currentUserName && String(assignedRiderName).trim().toLowerCase() === String(currentUserName).trim().toLowerCase()){
            riderIdentifierFound = true;
            // console.log(`Matched assignment by name for ${currentUserName} as email was not found or didn't match.`);
          }
        } else {
           // console.warn(`Configured riderName column "${assignedRiderNameColumn}" not found in Assignments sheet columnMap.`);
        }
      }

      if (!riderIdentifierFound) {
        continue;
      }

      const status = getColumnValue(row, columnMap, CONFIG.columns.assignments.status);
      const eventDateValue = getColumnValue(row, columnMap, CONFIG.columns.assignments.eventDate);

      if (['Completed', 'Cancelled', 'No Show'].includes(status)) {
        continue;
      }

      let assignmentDate;
      if (eventDateValue instanceof Date) {
        assignmentDate = new Date(eventDateValue.getFullYear(), eventDateValue.getMonth(), eventDateValue.getDate());
      } else if (typeof eventDateValue === 'string' && eventDateValue.trim() !== '') {
        try {
          assignmentDate = new Date(eventDateValue);
          if (isNaN(assignmentDate.getTime())) {
             // console.warn(`Invalid date string for assignment ${getColumnValue(row, columnMap, CONFIG.columns.assignments.id)}: ${eventDateValue}`);
             continue;
          }
          assignmentDate.setHours(0,0,0,0);
        } catch(e){
          // console.warn(`Error parsing date string for assignment ${getColumnValue(row, columnMap, CONFIG.columns.assignments.id)}: ${eventDateValue}`, e);
          continue;
        }
      } else {
        // console.warn(`Missing or invalid event date for assignment ${getColumnValue(row, columnMap, CONFIG.columns.assignments.id)}`);
        continue;
      }

      const twoDaysAgo = new Date(today.getTime() - (2 * 24 * 60 * 60 * 1000));
      if (assignmentDate < twoDaysAgo) {
        if (!['In Progress', 'Assigned'].includes(status)) {
            continue;
        }
      }

      const startLocation = getColumnValue(row, columnMap, CONFIG.columns.assignments.startLocation);
      const endLocation = getColumnValue(row, columnMap, CONFIG.columns.assignments.endLocation);
      let displayLocation = 'Location TBD';
      if (startLocation) {
        displayLocation = startLocation;
        if (endLocation) {
          displayLocation += ` → ${endLocation}`;
        }
      } else if (endLocation) {
        displayLocation = `To: ${endLocation}`;
      }

      riderAssignments.push({
        assignmentId: getColumnValue(row, columnMap, CONFIG.columns.assignments.id) || 'N/A',
        requestId: getColumnValue(row, columnMap, CONFIG.columns.assignments.requestId) || 'N/A',
        eventDate: formatDateForDisplay(eventDateValue),
        startTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.assignments.startTime)) || 'No Time',
        startLocation: displayLocation,
        status: status || 'Assigned'
      });
    }

    riderAssignments.sort((a, b) => {
      let dateA, dateB;
      try { dateA = new Date(a.eventDate + ' ' + (a.startTime === 'No Time' ? '00:00' : a.startTime.replace(/( AM| PM)/i, ''))); } catch(e) { dateA = null;}
      try { dateB = new Date(b.eventDate + ' ' + (b.startTime === 'No Time' ? '00:00' : b.startTime.replace(/( AM| PM)/i, ''))); } catch(e) { dateB = null;}

      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA - dateB;
    });

    // console.log(`✅ Returning ${riderAssignments.length} assignments for rider ${userEmail}.`);
    // if (riderAssignments.length > 0) {
      // console.log('Sample mobile assignment:', riderAssignments[0]);
    // }
    return riderAssignments;

  } catch (error) {
    // console.error(`❌ Error in getMobileAssignmentsForRider for ${Session.getActiveUser().getEmail()}:`, error.message, error.stack);
    if (typeof logError === 'function') {
      logError('Error in getMobileAssignmentsForRider', error);
    } else {
      // console.error('logError function not available. Error in getMobileAssignmentsForRider:', error);
    }
    return [];
  }
}
/**
 * @fileoverview Assignment processing functions for the Motorcycle Escort Management System
 * These functions handle the creation and management of rider assignments.
 */

/**
 * Main function to process rider assignments for a request and populate the assignments sheet.
 * This is the function called from the web app (assignments.html).
 * @param {string} requestId - The ID of the request to assign riders to.
 * @param {Array<object>} selectedRiders - Array of rider objects with their details.
 * @return {object} Result object indicating success/failure and details.
 */
function processAssignmentAndPopulate(requestId, selectedRiders) {
  try {
    console.log(`🏍️ Starting assignment process for request ${requestId} with ${selectedRiders.length} riders`);
    console.log('Selected riders:', JSON.stringify(selectedRiders, null, 2));
    
    if (!requestId || !selectedRiders || selectedRiders.length === 0) {
      throw new Error('Request ID and riders are required for assignment');
    }

    // Validate that the request exists and get its details
    const requestDetails = getRequestDetails(requestId);
    if (!requestDetails) {
      throw new Error(`Request ${requestId} not found`);
    }

    console.log('Request details found:', requestDetails);

    // Remove any existing assignments for this request first
    const existingAssignments = getAssignmentsForRequest(requestId);
    if (existingAssignments.length > 0) {
      console.log(`🗑️ Removing ${existingAssignments.length} existing assignments for request ${requestId}`);
      removeExistingAssignments(requestId);
    }

    // Create new assignments
    const assignmentResults = [];
    const assignedRiderNames = [];

    for (let i = 0; i < selectedRiders.length; i++) {
      const rider = selectedRiders[i];
      console.log(`📝 Creating assignment ${i + 1}/${selectedRiders.length} for rider: ${rider.name}`);
      
      try {
        const assignmentId = generateAssignmentId();
        const assignmentRow = buildAssignmentRow(assignmentId, requestId, rider, requestDetails);
        
        // Add the assignment to the sheet
        const assignmentsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.assignments);
        if (!assignmentsSheet) {
          throw new Error('Assignments sheet not found');
        }
        
        assignmentsSheet.appendRow(assignmentRow);
        assignedRiderNames.push(rider.name);
        
        assignmentResults.push({
          assignmentId: assignmentId,
          riderName: rider.name,
          status: 'success'
        });
        
        console.log(`✅ Created assignment ${assignmentId} for rider ${rider.name}`);
        
      } catch (riderError) {
        console.error(`❌ Failed to create assignment for rider ${rider.name}:`, riderError);
        assignmentResults.push({
          riderName: rider.name,
          status: 'failed',
          error: riderError.message
        });
      }
    }

    // Update the request with assigned rider names
    updateRequestWithAssignedRiders(requestId, assignedRiderNames);

    // Clear caches to ensure fresh data
    clearRequestsCache();
    clearDataCache();

    const successCount = assignmentResults.filter(r => r.status === 'success').length;
    const failCount = assignmentResults.filter(r => r.status === 'failed').length;

    logActivity(`Assignment process completed for ${requestId}: ${successCount} successful, ${failCount} failed`);

    return {
      success: true,
      message: `Successfully assigned ${successCount} rider(s) to request ${requestId}`,
      requestId: requestId,
      assignmentResults: assignmentResults,
      successCount: successCount,
      failCount: failCount
    };

  } catch (error) {
    console.error('❌ Error in processAssignmentAndPopulate:', error);
    logError('Error in processAssignmentAndPopulate', error);
    return {
      success: false,
      message: `Failed to process assignments: ${error.message}`,
      requestId: requestId || 'unknown',
      error: error.message
    };
  }
}

/**
 * Gets details for a specific request by ID.
 * @param {string} requestId - The request ID to look up.
 * @return {object|null} Request details object or null if not found.
 */
function getRequestDetails(requestId) {
  try {
    const requestsData = getRequestsData();
    if (!requestsData || !requestsData.data) {
      return null;
    }

    const columnMap = requestsData.columnMap;
    
    for (let i = 0; i < requestsData.data.length; i++) {
      const row = requestsData.data[i];
      const rowRequestId = getColumnValue(row, columnMap, CONFIG.columns.requests.id);
      
      if (String(rowRequestId).trim() === String(requestId).trim()) {
        return {
          id: getColumnValue(row, columnMap, CONFIG.columns.requests.id),
          requesterName: getColumnValue(row, columnMap, CONFIG.columns.requests.requesterName),
          eventDate: getColumnValue(row, columnMap, CONFIG.columns.requests.eventDate),
          startTime: getColumnValue(row, columnMap, CONFIG.columns.requests.startTime),
          endTime: getColumnValue(row, columnMap, CONFIG.columns.requests.endTime),
          startLocation: getColumnValue(row, columnMap, CONFIG.columns.requests.startLocation),
          endLocation: getColumnValue(row, columnMap, CONFIG.columns.requests.endLocation),
          secondaryLocation: getColumnValue(row, columnMap, CONFIG.columns.requests.secondaryLocation),
          type: getColumnValue(row, columnMap, CONFIG.columns.requests.type),
          ridersNeeded: getColumnValue(row, columnMap, CONFIG.columns.requests.ridersNeeded),
          status: getColumnValue(row, columnMap, CONFIG.columns.requests.status),
          notes: getColumnValue(row, columnMap, CONFIG.columns.requests.notes)
        };
      }
    }
    
    return null;
  } catch (error) {
    logError('Error getting request details', error);
    return null;
  }
}

/**
 * Generates a unique assignment ID.
 * @return {string} New assignment ID in format ASG-####.
 */
function generateAssignmentId() {
  try {
    const assignmentsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.assignments);
    if (!assignmentsSheet) {
      throw new Error('Assignments sheet not found');
    }

    const data = assignmentsSheet.getDataRange().getValues();
    const existingIds = [];

    // Get existing assignment IDs
    for (let i = 1; i < data.length; i++) { // Skip header row
      const id = data[i][0]; // Assuming ID is in first column
      if (id && String(id).startsWith('ASG-')) {
        const num = parseInt(String(id).replace('ASG-', ''));
        if (!isNaN(num)) {
          existingIds.push(num);
        }
      }
    }

    const nextNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    return `ASG-${String(nextNumber).padStart(4, '0')}`;

  } catch (error) {
    logError('Error generating assignment ID', error);
    return `ASG-${Date.now()}`; // Fallback to timestamp-based ID
  }
}

/**
 * Builds an assignment row array for the assignments sheet.
 * @param {string} assignmentId - The assignment ID.
 * @param {string} requestId - The request ID.
 * @param {object} rider - The rider object with details.
 * @param {object} requestDetails - The request details object.
 * @return {Array} Array of values for the assignment row.
 */
function buildAssignmentRow(assignmentId, requestId, rider, requestDetails) {
  try {
    const assignmentsData = getAssignmentsData();
    const headers = assignmentsData.headers;
    const row = [];

    // Build row based on headers order
    for (const header of headers) {
      let value = '';
      
      switch (header) {
        case CONFIG.columns.assignments.id:
          value = assignmentId;
          break;
        case CONFIG.columns.assignments.requestId:
          value = requestId;
          break;
        case CONFIG.columns.assignments.eventDate:
          value = requestDetails.eventDate || '';
          break;
        case CONFIG.columns.assignments.startTime:
          value = requestDetails.startTime || '';
          break;
        case CONFIG.columns.assignments.endTime:
          value = requestDetails.endTime || '';
          break;
        case CONFIG.columns.assignments.startLocation:
          value = requestDetails.startLocation || '';
          break;
        case CONFIG.columns.assignments.endLocation:
          value = requestDetails.endLocation || '';
          break;
        case CONFIG.columns.assignments.secondaryLocation:
          value = requestDetails.secondaryLocation || '';
          break;
        case CONFIG.columns.assignments.riderName:
          value = rider.name || '';
          break;
        case CONFIG.columns.assignments.jpNumber:
          value = rider.jpNumber || '';
          break;
        case CONFIG.columns.assignments.status:
          value = 'Assigned';
          break;
        case CONFIG.columns.assignments.createdDate:
          value = new Date();
          break;
        case CONFIG.columns.assignments.notes:
          value = requestDetails.notes || '';
          break;
        // Initialize notification columns as empty
        case CONFIG.columns.assignments.notified:
        case CONFIG.columns.assignments.smsSent:
        case CONFIG.columns.assignments.emailSent:
        case CONFIG.columns.assignments.completedDate:
        case CONFIG.columns.assignments.calendarEventId:
          value = '';
          break;
        default:
          value = '';
      }
      
      row.push(value);
    }

    return row;

  } catch (error) {
    logError('Error building assignment row', error);
    throw new Error(`Failed to build assignment row: ${error.message}`);
  }
}

/**
 * Removes existing assignments for a request.
 * @param {string} requestId - The request ID to clear assignments for.
 * @return {void}
 */
function removeExistingAssignments(requestId) {
  try {
    const assignmentsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.assignments);
    if (!assignmentsSheet) {
      throw new Error('Assignments sheet not found');
    }

    const data = assignmentsSheet.getDataRange().getValues();
    const headers = data[0];
    const requestIdCol = headers.indexOf(CONFIG.columns.assignments.requestId);

    if (requestIdCol === -1) {
      throw new Error('Request ID column not found in assignments sheet');
    }

    // Find rows to delete (in reverse order to avoid index shifting)
    const rowsToDelete = [];
    for (let i = data.length - 1; i >= 1; i--) { // Start from bottom, skip header
      if (String(data[i][requestIdCol]).trim() === String(requestId).trim()) {
        rowsToDelete.push(i + 1); // Convert to 1-based row number
      }
    }

    // Delete the rows
    for (const rowNum of rowsToDelete) {
      assignmentsSheet.deleteRow(rowNum);
    }

    console.log(`🗑️ Removed ${rowsToDelete.length} existing assignments for request ${requestId}`);

  } catch (error) {
    logError('Error removing existing assignments', error);
    throw new Error(`Failed to remove existing assignments: ${error.message}`);
  }
}

/**
 * Updates the request with the list of assigned rider names.
 * @param {string} requestId - The request ID to update.
 * @param {Array<string>} riderNames - Array of assigned rider names.
 * @return {void}
 */
function updateRequestWithAssignedRiders(requestId, riderNames) {
  try {
    const requestsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.requests);
    if (!requestsSheet) {
      throw new Error('Requests sheet not found');
    }

    const requestsData = getRequestsData(false); // Don't use cache
    const columnMap = requestsData.columnMap;

    // Find the request row
    let targetRowIndex = -1;
    for (let i = 0; i < requestsData.data.length; i++) {
      const rowRequestId = getColumnValue(requestsData.data[i], columnMap, CONFIG.columns.requests.id);
      if (String(rowRequestId).trim() === String(requestId).trim()) {
        targetRowIndex = i;
        break;
      }
    }

    if (targetRowIndex === -1) {
      throw new Error(`Request ${requestId} not found for rider assignment update`);
    }

    const sheetRowNumber = targetRowIndex + 2; // Convert to 1-based row number
    const ridersAssignedCol = columnMap[CONFIG.columns.requests.ridersAssigned];
    const statusCol = columnMap[CONFIG.columns.requests.status];
    const lastUpdatedCol = columnMap[CONFIG.columns.requests.lastUpdated];

    // Update assigned riders
    if (ridersAssignedCol !== undefined) {
      const ridersText = riderNames.join(', ');
      requestsSheet.getRange(sheetRowNumber, ridersAssignedCol + 1).setValue(ridersText);
    }

    // Update status to 'Assigned' if riders were assigned
    if (statusCol !== undefined && riderNames.length > 0) {
      requestsSheet.getRange(sheetRowNumber, statusCol + 1).setValue('Assigned');
    }

    // Update last modified timestamp
    if (lastUpdatedCol !== undefined) {
      requestsSheet.getRange(sheetRowNumber, lastUpdatedCol + 1).setValue(new Date());
    }

    console.log(`📝 Updated request ${requestId} with ${riderNames.length} assigned riders`);

  } catch (error) {
    logError('Error updating request with assigned riders', error);
    throw new Error(`Failed to update request with riders: ${error.message}`);
  }
}

/**
 * Alternative assignment function for testing/debugging.
 * @param {string} requestId - The request ID.
 * @param {Array<object>} riders - Array of rider objects.
 * @return {object} Result object.
 */
function testAssignmentProcess(requestId, riders) {
  console.log('🧪 Test assignment process called');
  console.log('Request ID:', requestId);
  console.log('Riders:', riders);
  
  return {
    success: true,
    message: 'Test assignment completed',
    requestId: requestId,
    riderCount: riders ? riders.length : 0
  };
}
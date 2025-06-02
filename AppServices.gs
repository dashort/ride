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
 * Fetches all necessary data for the assignments page (assignments.html).
 * Optionally fetches details for a specific request if `requestId` is provided.
 * @param {string} [requestId=null] Optional ID of a request to fetch details for.
 * @return {object} An object containing `user`, `requests` (assignable), `riders` (active),
 *                  and `initialRequestDetails`. Includes a `success` flag and `error` message on failure.
 */
function getPageDataForAssignments(requestId = null) {
  try {
    const user = getCurrentUser();
    const assignableRequests = getFilteredRequestsForAssignments(user);
    const activeRiders = getActiveRidersForAssignments();
    let requestDetails = null;
    if (requestId) {
      try {
        const escortDetails = getEscortDetailsForAssignment(requestId);
        requestDetails = escortDetails.request;
      } catch (e) {
        logError(`Failed to get details for initial requestId ${requestId} in getPageDataForAssignments`, e);
      }
    }
    return { success: true, user, requests: assignableRequests, riders: activeRiders, initialRequestDetails: requestDetails };
  } catch (error) {
    logError('Error in getPageDataForAssignments', error);
    return { success: false, error: error.message, user: getCurrentUser(), requests: [], riders: [], initialRequestDetails: null };
  }
}

/**
 * Fetches data for the requests list page (requests.html).
 * @param {string} [filter='All'] The status filter to apply to the requests.
 * @return {object} An object containing `user` and `requests` (filtered and formatted).
 *                  Includes a `success` flag and `error` message on failure.
 */
function getPageDataForRequests(filter = 'All') {
  try {
    const user = getCurrentUser();
    const rawRequests = getRequestsData();
    const requests = getFilteredRequestsForWebApp(rawRequests, filter); // From Dashboard.js
    return { success: true, user, requests };
  } catch (error) {
    logError('Error in getPageDataForRequests', error);
    return { success: false, error: error.message, user: getCurrentUser(), requests: [] };
  }
}

/**
 * Fetches data for the notifications page (notifications.html).
 * @param {Array<string>} [userRoles=['admin']] The roles of the current user (used for potential filtering, though not implemented in this version).
 * @return {object} An object containing `user`, `assignments` (all relevant for notifications),
 *                  and `stats` (notification-related statistics).
 *                  Includes a `success` flag and `error` message on failure.
 */
function getPageDataForNotifications(userRoles = ['admin']) {
  try {
    const user = getCurrentUser();
    let assignments = [];
    if (typeof getAllAssignmentsForNotifications === "function") { // From Notifications.js
        assignments = getAllAssignmentsForNotifications();
    } else {
        const rawAssignments = getAssignmentsData();
        if (rawAssignments && rawAssignments.data) {
            assignments = rawAssignments.data.map((row, index) => {
                const colMap = rawAssignments.columnMap;
                return {
                    id: getColumnValue(row, colMap, CONFIG.columns.assignments.id) || `TEMP_ID_${index}`,
                    requestId: getColumnValue(row, colMap, CONFIG.columns.assignments.requestId),
                    riderName: getColumnValue(row, colMap, CONFIG.columns.assignments.riderName),
                    riderPhone: getColumnValue(row, colMap, CONFIG.columns.riders.phone),
                    riderEmail: getColumnValue(row, colMap, CONFIG.columns.riders.email),
                    eventDate: formatDateForDisplay(getColumnValue(row, colMap, CONFIG.columns.assignments.eventDate)),
                    startTime: formatTimeForDisplay(getColumnValue(row, colMap, CONFIG.columns.assignments.startTime)),
                    startLocation: getColumnValue(row, colMap, CONFIG.columns.assignments.startLocation),
                    notificationStatus: getColumnValue(row, colMap, CONFIG.columns.assignments.notificationStatus) || 'none',
                    lastNotified: getColumnValue(row, colMap, CONFIG.columns.assignments.lastNotifiedDate)
                };
            });
        }
         logWarn("Used fallback data for getAllAssignmentsForNotifications in getPageDataForNotifications");
    }
    const stats = calculateStatsFromAssignmentsData(assignments);
    return { success: true, user, assignments, stats };
  } catch (error) {
    logError('Error in getPageDataForNotifications', error);
    return {
      success: false, error: error.message, user: getCurrentUser(),
      assignments: [], stats: { totalAssignments: 0, pendingNotifications: 0, smsToday: 0, emailToday: 0 }
    };
  }
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

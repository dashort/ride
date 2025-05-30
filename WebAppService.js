function getEscortDetailsForAssignment(requestIdInput) {
  const cleanedInputId = String(requestIdInput || '').replace(/^"|"$/g, '').trim();
  const originalRequestId = cleanedInputId;
  const requestId = normalizeRequestId(originalRequestId);

  try {
    const requestsData = getRequestsData();
    const ridersData = getRidersData();

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
        const rowIdRaw = getColumnValue(row, requestColMap, requestIdHeader);
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
      endTime: getColumnValue(foundRequestRow, requestColMap, CONFIG.columns.requests.endTime), // Ensure endTime is retrievable
      startLocation: getColumnValue(foundRequestRow, requestColMap, CONFIG.columns.requests.startLocation),
      endLocation: getColumnValue(foundRequestRow, requestColMap, CONFIG.columns.requests.endLocation), // Ensure endLocation is retrievable
      secondaryLocation: getColumnValue(foundRequestRow, requestColMap, CONFIG.columns.requests.secondaryLocation), // Ensure secondaryLocation is retrievable
      requesterName: getColumnValue(foundRequestRow, requestColMap, CONFIG.columns.requests.requesterName),
      status: getColumnValue(foundRequestRow, requestColMap, CONFIG.columns.requests.status),
      ridersAssigned: getColumnValue(foundRequestRow, requestColMap, CONFIG.columns.requests.ridersAssigned) || ''
    };

    const activeRiders = getActiveRiders().map(riderRow => {
      const riderColMap = ridersData.columnMap;
      return {
        jpNumber: getColumnValue(riderRow, riderColMap, CONFIG.columns.riders.jpNumber),
        name: getColumnValue(riderRow, riderColMap, CONFIG.columns.riders.name),
        phone: getColumnValue(riderRow, riderColMap, CONFIG.columns.riders.phone),
        email: getColumnValue(riderRow, riderColMap, CONFIG.columns.riders.email),
        carrier: getColumnValue(riderRow, riderColMap, CONFIG.columns.riders.carrier)
      };
    });

    logActivity(`Fetched details for request: "${originalRequestId}"`);

    return {
      request: requestDetails,
      riders: activeRiders
    };

  } catch (error) {
    logError(`Error in getEscortDetailsForAssignment for ${originalRequestId}`, error);
    throw new Error(`Could not retrieve escort details: ${error.message}`);
  }
}

function getUpcomingAssignmentsForWebApp(user) {
  try {
    console.log('📋 Getting upcoming assignments for web app...');
    console.log('User parameter received:', user);
    
    // Get assignments data using the standardized function
    const assignmentsData = getAssignmentsData();
    
    if (!assignmentsData || !assignmentsData.data || assignmentsData.data.length === 0) {
      console.log('❌ No assignments data found');
      return [];
    }
    
    console.log(`✅ Found ${assignmentsData.data.length} total assignments`);
    
    const columnMap = assignmentsData.columnMap;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get assignments for the next 30 days
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    const upcomingAssignments = assignmentsData.data
      .filter(row => {
        // Check if row has required data
        const assignmentId = getColumnValue(row, columnMap, CONFIG.columns.assignments.id);
        const riderName = getColumnValue(row, columnMap, CONFIG.columns.assignments.riderName);
        const status = getColumnValue(row, columnMap, CONFIG.columns.assignments.status);
        const eventDate = getColumnValue(row, columnMap, CONFIG.columns.assignments.eventDate);
        
        // Must have basic required fields
        if (!assignmentId || !riderName || !eventDate) {
          return false;
        }
        
        // Must not be completed or cancelled
        if (['Completed', 'Cancelled', 'No Show'].includes(status)) {
          return false;
        }
        
        // Must be in the upcoming timeframe
        const assignmentDate = new Date(eventDate);
        if (isNaN(assignmentDate.getTime())) {
          return false;
        }
        
        return assignmentDate >= today && assignmentDate <= thirtyDaysFromNow;
      })
      .map(row => {
        // Map to expected structure with proper formatting
        const eventDate = getColumnValue(row, columnMap, CONFIG.columns.assignments.eventDate);
        const startTime = getColumnValue(row, columnMap, CONFIG.columns.assignments.startTime);
        const startLocation = getColumnValue(row, columnMap, CONFIG.columns.assignments.startLocation);
        const endLocation = getColumnValue(row, columnMap, CONFIG.columns.assignments.endLocation);
        
        // Create display location
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
        // Sort by event date, earliest first
        const dateA = new Date(a.eventDate);
        const dateB = new Date(b.eventDate);
        
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 10); // Limit to 10 most upcoming
    
    console.log(`✅ Returning ${upcomingAssignments.length} upcoming assignments`);
    
    // Debug log first assignment
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
        
        // Must have basic data and not be completed/cancelled
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
 * Gets all active riders for rendering in web app forms.
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
        return status === 'Active' && name && name.toString().trim().length > 0;
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
 * Provides general dashboard data structure including statistics and requests.
 * @returns {object} An object containing 'stats', 'requests', and 'riderSchedule'.
 */
function getDashboardData() {
  try {
    // getRequestsData and getAssignmentsData already apply formatting and caching.
    const requests = getFormattedRequestsForDashboard(); // Gets requests data formatted for dashboard
    const riderSchedule = getRiderScheduleFormatted(); // Gets rider schedule formatted for dashboard

    const stats = calculateDashboardStatistics(); // Calculates key statistics

    return {
      stats: stats,
      requests: requests, // Already formatted
      riderSchedule: riderSchedule // Already formatted
    };

  } catch (error) {
    logError('Error getting dashboard data:', error);
    return {
      stats: {
        totalRequests: 0,
        activeRiders: 0,
        pendingRequests: 0,
        todaysAssignments: 0,
        thisWeeksAssignments: 0,
        completedRequests: 0
      },
      requests: [],
      riderSchedule: []
    };
  }
}

/**
 * Get rider schedule with formatted dates/times for dashboard display.
 */
function getRiderScheduleFormatted() {
  try {
    const assignmentsData = getAssignmentsData(); // Data is already formatted
    const assignments = assignmentsData.data;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const schedule = assignments
      .filter(row => {
        const eventDate = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
        if (!(eventDate instanceof Date)) return false; // Ensure it's a Date object
        const rowDate = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        return rowDate >= today && rowDate <= nextWeek;
      })
      .map(row => ({
        assignmentId: getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.id) || '',
        requestId: getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.requestId) || '',
        eventDate: getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate),
        startTime: getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.startTime),
        endTime: getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.endTime),
        riderName: getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.riderName) || '',
        status: getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.status) || 'Assigned'
      }))
      .sort((a, b) => {
        const dateA = new Date(a.eventDate);
        const dateB = new Date(b.eventDate);
        return dateA.getTime() - dateB.getTime(); // Sort chronologically
      });

    return schedule;
  } catch (error) {
    logError('Error getting rider schedule for dashboard:', error);
    return [];
  }
}

// ===== SIDEBAR FUNCTIONS ===== (Shared by sheets & web app)

/**
 * Get data for escort sidebar (used by EscortSidebar.html)
 */
function getDataForEscortSidebar() {
  try {
    const requestsData = getRequestsData();
    const ridersData = getRidersData();

    const validRequests = requestsData.data.filter(row => {
      const id = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.id);
      const requesterName = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.requesterName);
      const status = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.status);

      return id &&
             String(id).trim().length > 0 &&
             requesterName &&
             String(requesterName).trim().length > 0 &&
             ['New', 'Pending', 'Assigned', 'Unassigned', 'In Progress'].includes(status); // Added In Progress
    });

    const activeRiders = ridersData.data.filter(row => {
      const status = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.status);
      const name = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.name);
      return status === 'Active' && name && String(name).trim().length > 0;
    });

    return {
      requestsData: validRequests,
      requestsHeaders: requestsData.headers,
      ridersData: activeRiders,
      ridersHeaders: ridersData.headers
    };

  } catch (error) {
    logError('Error getting data for escort sidebar', error);
    return {
      requestsData: [],
      requestsHeaders: [],
      ridersData: [],
      ridersHeaders: []
    };
  }
}

/**
 * FIXED showEscortSidebar - Shows actual Request IDs from sheet, not normalized ones
 * This function is typically for Google Sheets sidebars.
 */
function showEscortSidebar() {
  try {
    const data = getDataForEscortSidebar(); // Use the general data retrieval

    if (data.requestsData.length === 0) {
      SpreadsheetApp.getUi().alert('No valid requests found with proper Request IDs and requester names.');
      return;
    }

    if (data.ridersData.length === 0) {
      SpreadsheetApp.getUi().alert('No active riders found.');
      return;
    }

    // Pass data to a templated HTML for rendering
    const template = HtmlService.createTemplateFromFile('EscortSidebar');
    template.requestsData = data.requestsData;
    template.requestsHeaders = data.requestsHeaders;
    template.ridersData = data.ridersData;
    template.ridersHeaders = data.ridersHeaders;

    const htmlOutput = template.evaluate()
      .setTitle('🏍️ Assign Escort Riders')
      .setWidth(400);

    SpreadsheetApp.getUi().showSidebar(htmlOutput);

  } catch (error) {
    logError('Error loading escort sidebar:', error);
    SpreadsheetApp.getUi().alert('Error loading sidebar: ' + error.message);
  }
}

/**
 * Renders the escort sidebar specifically for the web app (assignments.html page).
 * This allows the web app to trigger sidebar-like behavior.
 */
function renderEscortSidebarForWebApp() {
  try {
    const data = getDataForEscortSidebar();
    
    const template = HtmlService.createTemplateFromFile('EscortSidebar');
    template.requestsData = data.requestsData;
    template.requestsHeaders = data.requestsHeaders;
    template.ridersData = data.ridersData;
    template.ridersHeaders = data.ridersHeaders;
    
    return template.evaluate()
      .setTitle('Assign Escort Riders')
      .setWidth(400);
      
  } catch (error) {
    logError('Error rendering escort sidebar for web app:', error);
    
    return HtmlService.createHtmlOutput(`
      <html><body style="font-family: Arial; padding: 20px;">
        <h3>⚠️ Error Loading Assignment Form</h3>
        <p>Error: ${error.message}</p>
        <p>Please try refreshing or contact support.</p>
        <button onclick="google.script.host.close()">Close</button>
      </body></html>
    `).setTitle('Assignment Error').setWidth(400);
  }
}

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
    
    // DEBUG: Log the column mapping
    console.log('Column map:', columnMap);
    console.log('Looking for Request ID column:', CONFIG.columns.requests.id);
    console.log('Request ID column index:', columnMap[CONFIG.columns.requests.id]);
    
    // Filter requests that can be assigned (not completed/cancelled)
    const assignableRequests = [];
    
    for (let i = 0; i < requestsData.data.length; i++) {
      try {
        const row = requestsData.data[i];
        
        // FIX: Add detailed logging for the first few rows
        if (i < 3) {
          console.log(`Row ${i} data:`, row);
          console.log(`Row ${i} Request ID:`, getColumnValue(row, columnMap, CONFIG.columns.requests.id));
        }
        
        const requestId = getColumnValue(row, columnMap, CONFIG.columns.requests.id);
        const requesterName = getColumnValue(row, columnMap, CONFIG.columns.requests.requesterName);
        const status = getColumnValue(row, columnMap, CONFIG.columns.requests.status);
        const eventDate = getColumnValue(row, columnMap, CONFIG.columns.requests.eventDate);
        
        // FIX: Add better debugging for missing Request ID
        if (!requestId) {
          console.log(`⚠️ Missing Request ID in row ${i}:`, {
            requestId: requestId,
            requesterName: requesterName,
            rawRow: row.slice(0, 5) // Show first 5 columns
          });
          continue; // Skip rows without Request ID
        }
        
        // Must have basic required fields
        if (!requesterName) {
          console.log(`⚠️ Missing requester name in row ${i} for Request ID: ${requestId}`);
          continue;
        }
        
        // Only include assignable statuses
        if (!['New', 'Pending', 'Assigned', 'Unassigned', 'In Progress'].includes(status)) {
          continue;
        }
        
        const processedRequest = {
          id: requestId,           // This should now have the proper value
          requestId: requestId,    // Add both for compatibility
          requesterName: requesterName,
          type: getColumnValue(row, columnMap, CONFIG.columns.requests.type) || 'Unknown',
          eventDate: formatDateForDisplay(eventDate) || 'No Date',
          startTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.requests.startTime)) || 'No Time',
          endTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.requests.endTime)) || '',
          startLocation: getColumnValue(row, columnMap, CONFIG.columns.requests.startLocation) || 'Location TBD',
          endLocation: getColumnValue(row, columnMap, CONFIG.columns.requests.endLocation) || '',
          ridersNeeded: getColumnValue(row, columnMap, CONFIG.columns.requests.ridersNeeded) || 1,
          ridersAssigned: getColumnValue(row, columnMap, CONFIG.columns.requests.ridersAssigned) || '',
          status: status || 'New'
        };
        
        assignableRequests.push(processedRequest);
        
      } catch (rowError) {
        console.log(`⚠️ Error processing request row ${i}:`, rowError);
      }
    }
    
    // Sort by event date (most recent first)
    const sortedRequests = assignableRequests.sort((a, b) => {
      try {
        if (a.eventDate === 'No Date' && b.eventDate === 'No Date') return 0;
        if (a.eventDate === 'No Date') return 1;
        if (b.eventDate === 'No Date') return -1;
        
        const dateA = new Date(a.eventDate);
        const dateB = new Date(b.eventDate);
        
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        
        return dateB.getTime() - dateA.getTime();
      } catch (sortError) {
        return 0;
      }
    });
    
    console.log(`✅ Returning ${sortedRequests.length} assignable requests`);
    
    // DEBUG: Log the first request to verify it has an ID
    if (sortedRequests.length > 0) {
      console.log('First processed request:', sortedRequests[0]);
    }
    
    return sortedRequests;
    
  } catch (error) {
    console.error('❌ Error getting filtered requests for assignments:', error);
    logError('Error in getFilteredRequestsForAssignments', error);
    return [];
  }
}

// 2. Add to WebAppService.js - Function to get active riders for assignments page
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
        
        // Must have name and be active
        if (!riderName || !String(riderName).trim()) {
          continue;
        }
        
        // Check if active (no status or status is Active/Available)
        const riderStatus = String(status || '').toLowerCase().trim();
        if (riderStatus && !['active', 'available', ''].includes(riderStatus)) {
          continue;
        }
        
        const rider = {
          name: riderName,
          jpNumber: jpNumber || 'N/A',
          phone: phone || 'N/A',
          email: email || 'N/A',
          carrier: carrier || 'N/A',
          status: 'Available' // For assignments page display
        };
        
        activeRiders.push(rider);
        
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

// 3. Add to WebAppService.js - Enhanced function to get upcoming assignments with better formatting
function getUpcomingAssignmentsForAssignmentsPage(user) {
  try {
    console.log('📋 Getting upcoming assignments for assignments page...');
    
    const assignmentsData = getAssignmentsData();
    
    if (!assignmentsData || !assignmentsData.data || assignmentsData.data.length === 0) {
      console.log('❌ No assignments data found');
      return [];
    }
    
    const columnMap = assignmentsData.columnMap;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get assignments for the next 60 days
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
        
        // Must have basic required fields
        if (!assignmentId || !requestId || !riderName || !eventDate) {
          continue;
        }
        
        // Must not be completed or cancelled
        if (['Completed', 'Cancelled', 'No Show'].includes(status)) {
          continue;
        }
        
        // Must be in the upcoming timeframe
        const assignmentDate = new Date(eventDate);
        if (isNaN(assignmentDate.getTime()) || assignmentDate < today || assignmentDate > futureDate) {
          continue;
        }
        
        const startLocation = getColumnValue(row, columnMap, CONFIG.columns.assignments.startLocation);
        const endLocation = getColumnValue(row, columnMap, CONFIG.columns.assignments.endLocation);
        
        // Create display location
        let displayLocation = 'Location TBD';
        if (startLocation) {
          displayLocation = startLocation;
          if (endLocation) {
            displayLocation += ` → ${endLocation}`;
          }
        } else if (endLocation) {
          displayLocation = `To: ${endLocation}`;
        }
        
        const assignment = {
          id: assignmentId,
          requestId: requestId,
          eventDate: formatDateForDisplay(eventDate),
          startTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.assignments.startTime)) || 'No Time',
          endTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.assignments.endTime)) || '',
          riderName: riderName,
          startLocation: displayLocation,
          status: status || 'Assigned',
          notificationStatus: determineNotificationStatus(row, columnMap)
        };
        
        upcomingAssignments.push(assignment);
        
      } catch (rowError) {
        console.log(`⚠️ Error processing assignment row ${i}:`, rowError);
      }
    }
    
    // Sort by event date, earliest first
    const sortedAssignments = upcomingAssignments.sort((a, b) => {
      try {
        const dateA = new Date(a.eventDate);
        const dateB = new Date(b.eventDate);
        
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        
        return dateA.getTime() - dateB.getTime();
      } catch (sortError) {
        return 0;
      }
    });
    
    console.log(`✅ Returning ${sortedAssignments.length} upcoming assignments`);
    return sortedAssignments;
    
  } catch (error) {
    console.error('❌ Error getting upcoming assignments for assignments page:', error);
    logError('Error in getUpcomingAssignmentsForAssignmentsPage', error);
    return [];
  }
}

// 4. Add debugging function to test assignments page data
function debugAssignmentsPageData() {
  try {
    console.log('=== DEBUGGING ASSIGNMENTS PAGE DATA ===');
    
    const requests = getFilteredRequestsForAssignments({roles: ['admin']});
    const riders = getActiveRidersForAssignments();
    const assignments = getUpcomingAssignmentsForAssignmentsPage({roles: ['admin']});
    
    console.log('Requests count:', requests.length);
    console.log('Riders count:', riders.length);
    console.log('Assignments count:', assignments.length);
    
    if (requests.length > 0) {
      console.log('Sample request:', requests[0]);
    }
    
    if (riders.length > 0) {
      console.log('Sample rider:', riders[0]);
    }
    
    if (assignments.length > 0) {
      console.log('Sample assignment:', assignments[0]);
    }
    
    return {
      requests: requests.slice(0, 3),
      riders: riders.slice(0, 3),
      assignments: assignments.slice(0, 3),
      summary: {
        requestsCount: requests.length,
        ridersCount: riders.length,
        assignmentsCount: assignments.length
      }
    };
    
  } catch (error) {
    console.error('Error in debugAssignmentsPageData:', error);
    return { error: error.message };
  }
}

/**
 * NEW WRAPPER FUNCTIONS FOR CONSOLIDATED CLIENT-SIDE DATA REQUESTS
 */

// For index.html (Dashboard)
function getPageDataForDashboard() {
  try {
    const user = getCurrentUser(); // From AuthService.js or Code.js
    const stats = calculateDashboardStatistics(); // From Dashboard.js

    // For recent requests:
    // calculateDashboardStatistics fetches rawRequestsData.
    // We need to pass this to getFilteredRequestsForWebApp if we want to avoid a second fetch.
    // However, calculateDashboardStatistics doesn't return the raw data directly.
    // Option 1: Modify calculateDashboardStatistics to return raw data (more invasive).
    // Option 2: Fetch rawRequestsData again here (less invasive for now).
    // Option 3: Create a new function in Dashboard.js that gives raw requests and then pass it around.

    // Let's go with Option 2 for now to minimize changes to existing optimized functions in Dashboard.js,
    // but acknowledge this isn't perfectly optimal if calculateDashboardStatistics already has the data.
    // A future optimization could be to have a core data fetching function that calculateDashboardStatistics
    // and this function both use.
    
    const rawRequests = getRequestsData(); // Fetch raw requests
    let recentRequests = [];
    if (rawRequests && rawRequests.data) {
      // Use the existing getFilteredRequestsForWebApp from Dashboard.js
      // It expects rawRequestsData object and a filter.
      // To get "recent", we'll take all, then sort and slice.
      const allFormattedRequests = getFilteredRequestsForWebApp(rawRequests, 'All'); 
      
      // Sort by date (assuming 'date' field is sortable after formatting or use raw date before formatting)
      // For simplicity, if formatted date is "MM/DD/YYYY", new Date() can parse it.
      // Otherwise, it's better to sort raw data then format.
      // Let's assume getFilteredRequestsForWebApp returns objects with a 'date' field that is display-formatted
      // and also a raw date field if possible, or we sort based on the formatted date string (less reliable).
      // Given the previous refactor, getFilteredRequestsForWebApp formats dates.
      // Sorting by formatted date strings like "ShortMonth DD, YYYY" can be tricky.
      // It's better if getFilteredRequestsForWebApp could also return a raw sortable date.
      // For now, we'll sort by the formatted date, which might not be perfectly chronological
      // if date formats vary wildly.
      try {
        recentRequests = allFormattedRequests.sort((a, b) => {
          // Assuming 'date' field is something like "Jan 01, 2024" or "MM/DD/YYYY"
          // This sort is imperfect for string dates but a common approach.
          return new Date(b.date) - new Date(a.date); 
        }).slice(0, 10);
      } catch (e) {
        console.error("Error sorting recent requests: ", e);
        recentRequests = allFormattedRequests.slice(0, 10); // Fallback to unsorted slice
      }
    }
    
    // For upcoming assignments:
    // getUpcomingAssignmentsForWebApp is already in WebAppService.js
    // It takes a user object, which we have.
    const upcomingAssignments = getUpcomingAssignmentsForWebApp(user);

    return {
      success: true,
      user: user,
      stats: stats,
      recentRequests: recentRequests,
      upcomingAssignments: upcomingAssignments
    };
  } catch (error) {
    logError('Error in getPageDataForDashboard', error);
    return {
      success: false,
      error: error.message,
      user: getCurrentUser(), // Still return user if possible
      stats: { activeRiders: 0, pendingRequests: 0, todayAssignments: 0, weekAssignments: 0, totalRequests: 0, completedRequests: 0 },
      recentRequests: [],
      upcomingAssignments: []
    };
  }
}


// For assignments.html (Assignments Page)
function getPageDataForAssignments(requestId = null) {
  try {
    const user = getCurrentUser();
    // These functions are already in WebAppService.js
    const assignableRequests = getFilteredRequestsForAssignments(user); 
    const activeRiders = getActiveRidersForAssignments();
    
    let requestDetails = null;
    if (requestId) {
      // getEscortDetailsForAssignment is in WebAppService.js
      // It fetches request details and active riders again.
      // We can optimize by passing activeRiders if the function is refactored,
      // or call it as is. For now, call as is.
      try {
        const escortDetails = getEscortDetailsForAssignment(requestId);
        requestDetails = escortDetails.request; 
        // We already have activeRiders, so escortDetails.riders is redundant here.
      } catch (e) {
        logError(`Failed to get details for initial requestId ${requestId} in getPageDataForAssignments`, e);
        // Continue without pre-loaded details if specific request fails
      }
    }

    return {
      success: true,
      user: user,
      requests: assignableRequests,
      riders: activeRiders,
      initialRequestDetails: requestDetails // For pre-populating if requestId was passed
    };
  } catch (error) {
    logError('Error in getPageDataForAssignments', error);
    return {
      success: false,
      error: error.message,
      user: getCurrentUser(),
      requests: [],
      riders: [],
      initialRequestDetails: null
    };
  }
}

// For requests.html (Requests Page)
function getPageDataForRequests(filter = 'All') {
  try {
    const user = getCurrentUser();
    // getFilteredRequestsForWebApp is in Dashboard.js, ensure it's accessible
    // or move/copy a version to WebAppService or Code.js if preferred.
    // Assuming it's globally accessible for now.
    // It needs raw data.
    const rawRequests = getRequestsData();
    const requests = getFilteredRequestsForWebApp(rawRequests, filter);

    return {
      success: true,
      user: user,
      requests: requests
    };
  } catch (error) {
    logError('Error in getPageDataForRequests', error);
    return {
      success: false,
      error: error.message,
      user: getCurrentUser(),
      requests: []
    };
  }
}

// For notifications.html
function getPageDataForNotifications(userRoles = ['admin']) { // Pass user roles for filtering if needed
  try {
    const user = getCurrentUser();
    // getAllAssignmentsForNotifications should be created or verified.
    // Let's assume it exists in this file or is globally available.
    // If it doesn't exist, we'll need to define it.
    // For now, let's assume a function that gets all assignments suitable for notification.
    let assignments = [];
    if (typeof getAllAssignmentsForNotifications === "function") {
        assignments = getAllAssignmentsForNotifications();
    } else {
        // Fallback or placeholder if the function isn't defined yet.
        // This would ideally fetch all assignments and format them appropriately.
        const rawAssignments = getAssignmentsData();
        if (rawAssignments && rawAssignments.data) {
            assignments = rawAssignments.data.map((row, index) => { // Basic mapping
                const colMap = rawAssignments.columnMap;
                return {
                    id: getColumnValue(row, colMap, CONFIG.columns.assignments.id) || `TEMP_ID_${index}`,
                    requestId: getColumnValue(row, colMap, CONFIG.columns.assignments.requestId),
                    riderName: getColumnValue(row, colMap, CONFIG.columns.assignments.riderName),
                    riderPhone: getColumnValue(row, colMap, CONFIG.columns.riders.phone), // This might need a join or separate fetch
                    riderEmail: getColumnValue(row, colMap, CONFIG.columns.riders.email), // Ditto
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

    // Calculate stats based on the fetched assignments
    const stats = calculateStatsFromAssignmentsData(assignments); // Ensure this helper is available

    return {
      success: true,
      user: user,
      assignments: assignments,
      stats: stats
    };
  } catch (error) {
    logError('Error in getPageDataForNotifications', error);
    return {
      success: false,
      error: error.message,
      user: getCurrentUser(),
      assignments: [],
      stats: { totalAssignments: 0, pendingNotifications: 0, smsToday: 0, emailToday: 0 }
    };
  }
}

// For reports.html
function getPageDataForReports(filters) {
  try {
    const user = getCurrentUser();
    // generateReportData is already designed to fetch data based on filters.
    const reportData = generateReportData(filters); // Assuming this is in Reports.js or global

    return {
      success: true,
      user: user,
      reportData: reportData
    };
  } catch (error) {
    logError('Error in getPageDataForReports', error);
    return {
      success: false,
      error: error.message,
      user: getCurrentUser(),
      reportData: null // Or some default/empty report structure
    };
  }
}

// Helper function (ensure it's defined, possibly move from notifications.html or make global)
// This is a placeholder, actual implementation might be more complex or reside elsewhere.
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

// Ensure getCurrentUser is available (e.g., from AuthService.js or Code.js)
// Ensure calculateDashboardStatistics is available (from Dashboard.js)
// Ensure getFilteredRequestsForWebApp is available (from Dashboard.js)
// Ensure getRequestsData is available (from DataService.js)
// Ensure getAssignmentsData is available (from DataService.js)
// Ensure formatDateForDisplay, formatTimeForDisplay are available (from Formatting.js)
// Ensure getColumnValue is available (from SheetUtils.js)
// Ensure CONFIG is available
// Ensure logError, logWarn are available (from Logger.js or Code.js)
// Ensure generateReportData is available (from Reports.js or Code.js)
// Ensure getAllAssignmentsForNotifications is defined (expected in WebAppService.js or DataService.js)

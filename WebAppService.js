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

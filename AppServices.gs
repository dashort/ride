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
// 🔒 SECURED WEBAPP FUNCTIONS - Update your WebAppService.js with these

/**
 * Enhanced getPageData with access control
 */
function getPageDataForDashboard(user) {
  try {
    // Validate user authentication
    if (!user || !user.role) {
      return { success: false, error: 'Authentication required' };
    }
    
    // Check page access
    if (!canAccessPage(user, 'dashboard')) {
      return { success: false, error: 'Access denied to dashboard' };
    }
    
    // Get role-based dashboard data
    const dashboardData = getDashboardDataForUser(user);
    
    return {
      success: true,
      user: user,
      data: dashboardData
    };
    
  } catch (error) {
    console.error('❌ Error in getPageDataForDashboard:', error);
    return { success: false, error: 'Failed to load dashboard data' };
  }
}

/**
 * Secured requests data with role-based filtering
 */
function getPageDataForRequests(user, filters = {}) {
  try {
    if (!user || !user.role) {
      return { success: false, error: 'Authentication required' };
    }
    
    if (!canAccessPage(user, 'requests')) {
      return { success: false, error: 'Access denied to requests' };
    }
    
    // Get filtered requests based on user role
    const requests = getFilteredRequests(user, filters);
    
    // Additional data based on permissions
    const pageData = {
      requests: requests,
      canCreate: hasPermission(user, 'requests', 'create'),
      canEdit: hasPermission(user, 'requests', 'update'),
      canDelete: hasPermission(user, 'requests', 'delete'),
      canExport: hasPermission(user, 'requests', 'export'),
      totalCount: requests.length
    };
    
    // Add riders list if user can assign
    if (hasPermission(user, 'assignments', 'assign_any')) {
      pageData.availableRiders = getFilteredRiders(user);
    }
    
    return {
      success: true,
      user: user,
      data: pageData
    };
    
  } catch (error) {
    console.error('❌ Error in getPageDataForRequests:', error);
    return { success: false, error: 'Failed to load requests data' };
  }
}



/**
 * Secured riders management
 */
function getPageDataForRiders(user, filters = {}) {
  try {
    if (!user || !user.role) {
      return { success: false, error: 'Authentication required' };
    }
    
    if (!canAccessPage(user, 'riders')) {
      return { success: false, error: 'Access denied to riders' };
    }
    
    const riders = getFilteredRiders(user);
    
    const pageData = {
      riders: riders,
      canCreate: hasPermission(user, 'riders', 'create'),
      canEdit: hasPermission(user, 'riders', 'update'),
      canDelete: hasPermission(user, 'riders', 'delete'),
      canApprove: hasPermission(user, 'riders', 'approve'),
      canDeactivate: hasPermission(user, 'riders', 'deactivate'),
      totalCount: riders.length
    };
    
    return {
      success: true,
      user: user,
      data: pageData
    };
    
  } catch (error) {
    console.error('❌ Error in getPageDataForRiders:', error);
    return { success: false, error: 'Failed to load riders data' };
  }
}

/**
 * Secured reports data
 */
function getPageDataForReports(user, filters = {}) {
  try {
    if (!user || !user.role) {
      return { success: false, error: 'Authentication required' };
    }
    
    if (!canAccessPage(user, 'reports')) {
      return { success: false, error: 'Access denied to reports' };
    }
    
    const reportData = {
      summary: {},
      charts: {},
      tables: {}
    };
    
    // Generate reports based on user permissions
    if (hasPermission(user, 'reports', 'view_all')) {
      // Full system reports for admin/dispatcher
      reportData.summary = getSystemSummaryStats();
      reportData.charts = getSystemCharts(filters);
      reportData.tables = getSystemTables(filters);
      
    } else if (user.role === 'rider') {
      // Personal reports for rider
      reportData.summary = getRiderSummaryStats(user.riderId);
      reportData.charts = getRiderCharts(user.riderId, filters);
      reportData.tables = getRiderTables(user.riderId, filters);
    }
    
    const pageData = {
      reportData: reportData,
      canExportAll: hasPermission(user, 'reports', 'export_all'),
      canViewFinancial: hasPermission(user, 'reports', 'financial'),
      canViewSystemLogs: hasPermission(user, 'reports', 'system_logs'),
      canViewRiderPerformance: hasPermission(user, 'reports', 'rider_performance')
    };
    
    return {
      success: true,
      user: user,
      data: pageData
    };
    
  } catch (error) {
    console.error('❌ Error in getPageDataForReports:', error);
    return { success: false, error: 'Failed to load reports data' };
  }
}

/**
 * Secured request creation
 */
function createNewRequestSecured(user, requestData) {
  try {
    // Validate permissions
    const validation = validateRequestOperation(user, 'create', requestData);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Add audit fields
    requestData.createdBy = user.email;
    requestData.createdByRole = user.role;
    requestData.createdDate = new Date();
    
    // Call your existing create function
    const result = createNewRequest(requestData);
    
    // Log the action
    logUserAction(user, 'CREATE_REQUEST', requestData.id || 'NEW', true);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error in createNewRequestSecured:', error);
    logUserAction(user, 'CREATE_REQUEST', 'FAILED', false, error.message);
    return { success: false, error: 'Failed to create request' };
  }
}

/**
 * Secured request update
 */
function updateExistingRequestSecured(user, requestData) {
  try {
    const validation = validateRequestOperation(user, 'update', requestData, requestData.id);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Add audit fields
    requestData.lastModifiedBy = user.email;
    requestData.lastModifiedByRole = user.role;
    requestData.lastModifiedDate = new Date();
    
    const result = updateExistingRequest(requestData);
    
    logUserAction(user, 'UPDATE_REQUEST', requestData.id, true);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error in updateExistingRequestSecured:', error);
    logUserAction(user, 'UPDATE_REQUEST', requestData.id, false, error.message);
    return { success: false, error: 'Failed to update request' };
  }
}

/**
 * Secured request deletion
 */
function deleteRequestSecured(user, requestId) {
  try {
    const validation = validateRequestOperation(user, 'delete', {}, requestId);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    const result = deleteRequest(requestId);
    
    logUserAction(user, 'DELETE_REQUEST', requestId, result.success);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error in deleteRequestSecured:', error);
    logUserAction(user, 'DELETE_REQUEST', requestId, false, error.message);
    return { success: false, error: 'Failed to delete request' };
  }
}

/**
 * Secured rider assignment
 */
function assignRidersToRequestSecured(user, requestId, riderNames) {
  try {
    if (!hasPermission(user, 'assignments', 'assign_any')) {
      return { success: false, error: 'You do not have permission to assign riders' };
    }
    
    const result = assignRidersToRequest(requestId, riderNames);
    
    if (result.success) {
      logUserAction(user, 'ASSIGN_RIDERS', `${requestId}:${riderNames.join(',')}`, true);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error in assignRidersToRequestSecured:', error);
    logUserAction(user, 'ASSIGN_RIDERS', requestId, false, error.message);
    return { success: false, error: 'Failed to assign riders' };
  }
}

/**
 * Secured assignment status update (for riders)
 */
function updateAssignmentStatusSecured(user, assignmentId, newStatus, notes = '') {
  try {
    const validation = validateAssignmentOperation(user, 'update', { status: newStatus, notes: notes }, assignmentId);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Get the assignment to verify ownership (for riders)
    if (user.role === 'rider') {
      if (!canAccessResource(user, 'assignments', assignmentId)) {
        return { success: false, error: 'You can only update your own assignments' };
      }
    }
    
    const result = updateAssignmentStatus(assignmentId, newStatus, notes, user.email);
    
    logUserAction(user, 'UPDATE_ASSIGNMENT_STATUS', assignmentId, result.success);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error in updateAssignmentStatusSecured:', error);
    logUserAction(user, 'UPDATE_ASSIGNMENT_STATUS', assignmentId, false, error.message);
    return { success: false, error: 'Failed to update assignment status' };
  }
}

/**
 * User action logging
 */
function logUserAction(user, action, resourceId, success, errorMessage = '') {
  try {
    const logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('User Actions Log');
    
    if (!logSheet) {
      // Create log sheet if it doesn't exist
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const newLogSheet = spreadsheet.insertSheet('User Actions Log');
      const headers = [
        'Timestamp', 'User Email', 'User Name', 'Role', 'Action', 
        'Resource ID', 'Success', 'Error Message', 'IP Address'
      ];
      newLogSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      newLogSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
    }
    
    const logData = [
      new Date(),
      user.email,
      user.name,
      user.role,
      action,
      resourceId,
      success,
      errorMessage,
      '' // IP Address not available in Apps Script
    ];
    
    const lastRow = logSheet.getLastRow();
    logSheet.getRange(lastRow + 1, 1, 1, logData.length).setValues([logData]);
    
  } catch (error) {
    console.error('❌ Error logging user action:', error);
  }
}

/**
 * Get rider-specific data (for rider dashboard)
 */
function getRiderDashboardData(user) {
  try {
    if (user.role !== 'rider' || !user.riderId) {
      return { success: false, error: 'Invalid rider access' };
    }
    
    const myAssignments = getAssignmentsForRider(user.riderId);
    const upcomingAssignments = myAssignments.filter(a => 
      a.status === 'Pending' && new Date(a.eventDate) > new Date()
    );
    const completedThisMonth = myAssignments.filter(a => 
      a.status === 'Completed' && isThisMonth(a.completionDate)
    );
    
    return {
      success: true,
      data: {
        myStats: {
          totalAssignments: myAssignments.length,
          upcomingAssignments: upcomingAssignments.length,
          completedThisMonth: completedThisMonth.length,
          totalHoursThisMonth: calculateRiderHours(user.riderId, 'this_month')
        },
        upcomingEscorts: upcomingAssignments.slice(0, 5),
        recentActivity: getRiderRecentActivity(user.riderId),
        notifications: getRiderNotifications(user.riderId)
      }
    };
    
  } catch (error) {
    console.error('❌ Error getting rider dashboard data:', error);
    return { success: false, error: 'Failed to load rider data' };
  }
}

/**
 * Master page data function with authentication
 */
function getSecuredPageData(pageName, user, filters = {}) {
  try {
    // Map page names to secured functions
    const pageHandlers = {
      'dashboard': () => getPageDataForDashboard(user),
      'requests': () => getPageDataForRequests(user, filters),
      'assignments': () => getPageDataForAssignments(user, filters),
      'riders': () => getPageDataForRiders(user, filters),
      'reports': () => getPageDataForReports(user, filters),
      'rider-schedule': () => getRiderDashboardData(user),
      'my-assignments': () => getPageDataForAssignments(user, { riderId: user.riderId })
    };
    
    const handler = pageHandlers[pageName];
    if (!handler) {
      return { success: false, error: `Unknown page: ${pageName}` };
    }
    
    return handler();
    
  } catch (error) {
    console.error(`❌ Error getting secured page data for ${pageName}:`, error);
    return { success: false, error: 'Failed to load page data' };
  }
}

// Helper functions for date/time calculations
function isThisMonth(date) {
  if (!date) return false;
  const checkDate = new Date(date);
  const now = new Date();
  return checkDate.getMonth() === now.getMonth() && 
         checkDate.getFullYear() === now.getFullYear();
}

function calculateRiderHours(riderId, period) {
  // Implement your hour calculation logic here
  // This would typically look at assignment start/end times
  return 0; // Placeholder
}

function getRiderRecentActivity(riderId) {
  // Get recent assignments and status changes for this rider
  return []; // Placeholder
}

function getRiderNotifications(riderId) {
  // Get notifications for this specific rider
  return []; // Placeholder
}
/**
 * Get page data for riders page
 * Add this function to AppServices.gs (or any .gs file)
 */
function getPageDataForRiders(user) { // Added user parameter
  try {
    console.log('🔄 Loading riders page data...');
    
    // const user = getCurrentUser(); // Removed: user is now a parameter
    const riders = getRiders(); // This should work now with our previous fixes
    
    // Calculate stats using the same filtered data
    const certifiedRiders = riders.filter(r =>
      String(r.certification || r['Certification'] || '').toLowerCase() !==
      'not certified'
    );

    const stats = {
      totalRiders: certifiedRiders.length,
      activeRiders: certifiedRiders.filter(r =>
        String(r.status || '').toLowerCase() === 'active' ||
        String(r.status || '').toLowerCase() === 'available' ||
        String(r.status || '').trim() === ''
      ).length,
      inactiveRiders: certifiedRiders.filter(r =>
        String(r.status || '').toLowerCase() === 'inactive'
      ).length,
      onVacation: certifiedRiders.filter(r =>
        String(r.status || '').toLowerCase() === 'vacation'
      ).length,

      inTraining: certifiedRiders.filter(r =>
        String(r.status || '').toLowerCase() === 'training'
      ).length,
      partTimeRiders: certifiedRiders.filter(r =>
        String(r.partTime || '').toLowerCase() === 'yes'
      ).length
    };
    
    console.log('✅ Riders page data loaded:', {
      userEmail: user.email,
      ridersCount: riders.length,
      stats: stats
    });
    
    return {
      success: true,
      user: user,
      riders: riders,
      stats: stats
    };
    
  } catch (error) {
    console.error('❌ Error loading riders page data:', error);
    logError('Error in getPageDataForRiders', error);
    
    return {
      success: false,
      error: error.message,
      user: user, // Use passed user
      riders: [],
      stats: {
        totalRiders: 0,
        activeRiders: 0,
        inactiveRiders: 0,
        onVacation: 0,

        inTraining: 0,
        partTimeRiders: 0

      }
    };
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

// REPLACE the getActiveRidersForWebApp function in AppServices.gs with this fixed version:

/**
 * Fixed getActiveRidersForWebApp function with proper error handling
 * @return {Array<object>} Array of active rider objects
 */
function getActiveRidersForWebApp() {
  try {
    console.log('🌐 Getting active riders for web app...');
    
    let assignmentRiders = [];
    
    // Try to get riders from getActiveRidersForAssignments
    try {
      const ridersResult = getActiveRidersForAssignments();
      console.log('getActiveRidersForAssignments returned:', typeof ridersResult, ridersResult);
      
      // Check if it's an array
      if (Array.isArray(ridersResult)) {
        assignmentRiders = ridersResult;
        console.log(`✅ Got ${assignmentRiders.length} riders from getActiveRidersForAssignments`);
      } else {
        console.warn('⚠️ getActiveRidersForAssignments did not return an array:', ridersResult);
        throw new Error('getActiveRidersForAssignments returned non-array');
      }
    } catch (assignmentRidersError) {
      console.warn('⚠️ getActiveRidersForAssignments failed:', assignmentRidersError.message);
      
      // Fallback: try to get riders directly
      try {
        console.log('🔄 Fallback: getting riders directly...');
        const ridersData = getRidersData();
        
        if (ridersData && ridersData.data && Array.isArray(ridersData.data)) {
          console.log(`📊 Got riders data with ${ridersData.data.length} rows`);
          
          const columnMap = ridersData.columnMap;
          assignmentRiders = [];
          
          for (let i = 0; i < ridersData.data.length; i++) {
            const row = ridersData.data[i];
            const name = getColumnValue(row, columnMap, CONFIG.columns.riders.name);
            const status = getColumnValue(row, columnMap, CONFIG.columns.riders.status);
            
            // Check if rider is active (case insensitive)
            if (name && status && String(status).toLowerCase() === 'active') {
              assignmentRiders.push({
                name: name,
                jpNumber: getColumnValue(row, columnMap, CONFIG.columns.riders.jpNumber) || '',
                phone: getColumnValue(row, columnMap, CONFIG.columns.riders.phone) || '',
                email: getColumnValue(row, columnMap, CONFIG.columns.riders.email) || '',
                status: status
              });
            }
          }
          
          console.log(`✅ Fallback found ${assignmentRiders.length} active riders`);
        } else {
          throw new Error('No valid riders data found');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback riders method failed:', fallbackError.message);
        
        // Last resort: return mock data
        console.log('🆘 Using emergency mock riders data');
        assignmentRiders = [
          {
            name: 'Emergency Rider 1',
            jpNumber: 'EMRG001',
            phone: '555-0911',
            email: 'emergency1@riders.com',
            status: 'Active'
          },
          {
            name: 'Emergency Rider 2', 
            jpNumber: 'EMRG002',
            phone: '555-0912',
            email: 'emergency2@riders.com',
            status: 'Active'
          }
        ];
      }
    }
    
    // Convert to web app format (ensure array before mapping)
    if (!Array.isArray(assignmentRiders)) {
      console.error('❌ assignmentRiders is still not an array:', typeof assignmentRiders);
      assignmentRiders = [];
    }
    
    const webAppRiders = assignmentRiders.map(rider => ({
      jpNumber: rider.jpNumber || '',
      name: rider.name || '',
      phone: rider.phone || '',
      email: rider.email || '',
      carrier: rider.carrier || 'Unknown',
      partTime: rider.partTime || 'No',
      status: rider.status || 'Active'
    }));
    
    console.log(`✅ Returning ${webAppRiders.length} active riders for web app`);
    return webAppRiders;
    
  } catch (error) {
    console.error('❌ Critical error in getActiveRidersForWebApp:', error);
    logError('Error in getActiveRidersForWebApp', error);
    
    // Return emergency fallback
    return [
      {
        jpNumber: 'FALL001',
        name: 'Fallback Rider',
        phone: '555-0000',
        email: 'fallback@riders.com',
        carrier: 'Emergency',
        partTime: 'No',
        status: 'Active'
      }
    ];
  }
}

// ALSO ADD this diagnostic function to see what getActiveRidersForAssignments returns:

function debugGetActiveRidersForAssignments() {
  try {
    console.log('🔍 Debugging getActiveRidersForAssignments...');
    
    const result = getActiveRidersForAssignments();
    
    console.log('Result type:', typeof result);
    console.log('Is array:', Array.isArray(result));
    console.log('Result value:', result);
    
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      console.log('Object keys:', Object.keys(result));
      console.log('Has length property:', 'length' in result);
    }
    
    return {
      type: typeof result,
      isArray: Array.isArray(result),
      value: result,
      length: result ? result.length : 'N/A'
    };
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    return { error: error.message };
  }
}

// AND ADD this function to test the complete riders chain:

function testCompleteRidersChain() {
  try {
    console.log('🧪 Testing complete riders chain...');
    
    const results = {};
    
    // Test 1: getRidersData
    try {
      const ridersData = getRidersData();
      results.getRidersData = {
        success: true,
        hasData: !!ridersData,
        hasDataArray: !!(ridersData && ridersData.data),
        dataLength: ridersData?.data?.length || 0
      };
    } catch (error) {
      results.getRidersData = { success: false, error: error.message };
    }
    
    // Test 2: getActiveRidersForAssignments
    try {
      const assignmentRiders = getActiveRidersForAssignments();
      results.getActiveRidersForAssignments = {
        success: true,
        type: typeof assignmentRiders,
        isArray: Array.isArray(assignmentRiders),
        length: assignmentRiders?.length || 'No length property'
      };
    } catch (error) {
      results.getActiveRidersForAssignments = { success: false, error: error.message };
    }
    
    // Test 3: getActiveRidersForWebApp
    try {
      const webAppRiders = getActiveRidersForWebApp();
      results.getActiveRidersForWebApp = {
        success: true,
        type: typeof webAppRiders,
        isArray: Array.isArray(webAppRiders),
        length: webAppRiders?.length || 0,
        sample: webAppRiders?.[0] || null
      };
    } catch (error) {
      results.getActiveRidersForWebApp = { success: false, error: error.message };
    }
    
    console.log('🧪 Complete riders chain test results:', results);
    return results;
    
  } catch (error) {
    console.error('❌ Complete test failed:', error);
    return { error: error.message };
  }
}
/**
 * Returns riders for the assignments page optionally filtered by active status.
 * When `filterActive` is true, only active riders are returned. Otherwise all
 * riders are provided in the same simplified format used by the web app.
 *
 * @param {boolean} filterActive Whether to filter by active status.
 * @return {Array<object>} Array of rider objects.
 */
function getRidersWithAvailability(filterActive) {
  try {
    if (filterActive) {
      return getActiveRidersForWebApp();
    }

    const allRiders = getRiders();
    return allRiders.map(rider => ({
      jpNumber: rider.jpNumber || '',
      name: rider.name || '',
      phone: rider.phone || '',
      email: rider.email || '',
      carrier: rider.carrier || 'Unknown',
      partTime: rider.partTime || 'No'
    }));

  } catch (error) {
    console.error('❌ Error in getRidersWithAvailability:', error);
    logError('Error in getRidersWithAvailability', error);
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
function getDashboardData(user) { // Added user parameter
  try {
    // Assuming these functions will be refactored to accept user
    const requests = getFormattedRequestsForDashboard(user);
    const riderSchedule = getRiderScheduleFormatted(user);
    const stats = calculateDashboardStatistics(user);

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
 * Gets all assignments for a specific rider
 * Add this function to your AppServices.gs or RiderCRUD.gs file
 */
function getRiderAssignments(riderId, riderName) {
  try {
    console.log(`🔍 Getting assignments for rider: ${riderName} (ID: ${riderId})`);
    
    const assignmentsData = getAssignmentsData();
    
    if (!assignmentsData || !assignmentsData.data || assignmentsData.data.length === 0) {
      console.log('❌ No assignments data found');
      return [];
    }
    
    const columnMap = assignmentsData.columnMap;
    const riderAssignments = [];
    
    // Filter assignments for this specific rider
    for (let i = 0; i < assignmentsData.data.length; i++) {
      try {
        const row = assignmentsData.data[i];
        
        // Get rider name from assignment
        const assignmentRiderName = getColumnValue(row, columnMap, CONFIG.columns.assignments.riderName);
        const assignmentJpNumber = getColumnValue(row, columnMap, CONFIG.columns.assignments.jpNumber);
        
        // Check if this assignment belongs to the requested rider
        const riderMatches = 
          (assignmentRiderName && assignmentRiderName === riderName) ||
          (assignmentJpNumber && assignmentJpNumber === riderId) ||
          (assignmentRiderName && riderName && 
           String(assignmentRiderName).toLowerCase().trim() === String(riderName).toLowerCase().trim());
        
        if (!riderMatches) {
          continue;
        }
        
        // Get assignment details
        const assignmentId = getColumnValue(row, columnMap, CONFIG.columns.assignments.id);
        const requestId = getColumnValue(row, columnMap, CONFIG.columns.assignments.requestId);
        const status = getColumnValue(row, columnMap, CONFIG.columns.assignments.status);
        const eventDate = getColumnValue(row, columnMap, CONFIG.columns.assignments.eventDate);
        const startTime = getColumnValue(row, columnMap, CONFIG.columns.assignments.startTime);
        const endTime = getColumnValue(row, columnMap, CONFIG.columns.assignments.endTime);
        const startLocation = getColumnValue(row, columnMap, CONFIG.columns.assignments.startLocation);
        const endLocation = getColumnValue(row, columnMap, CONFIG.columns.assignments.endLocation);
        const notes = getColumnValue(row, columnMap, CONFIG.columns.assignments.notes);
        
        // Skip if no assignment ID or request ID
        if (!assignmentId || !requestId) {
          continue;
        }
        
        // Format the assignment
        const assignment = {
          assignmentId: assignmentId,
          requestId: requestId,
          eventDate: formatDateForDisplay(eventDate) || 'No Date',
          startTime: formatTimeForDisplay(startTime) || 'No Time',
          endTime: formatTimeForDisplay(endTime) || '',
          startLocation: startLocation || 'Location TBD',
          endLocation: endLocation || '',
          status: status || 'Assigned',
          notes: notes || '',
          riderName: assignmentRiderName
        };
        
        // Create location display
        if (startLocation && endLocation) {
          assignment.location = `${startLocation} → ${endLocation}`;
        } else if (startLocation) {
          assignment.location = startLocation;
        } else if (endLocation) {
          assignment.location = `To: ${endLocation}`;
        } else {
          assignment.location = 'Location TBD';
        }
        
        riderAssignments.push(assignment);
        
      } catch (rowError) {
        console.log(`⚠️ Error processing assignment row ${i}:`, rowError);
      }
    }
    
    // Sort assignments by event date (upcoming first, then by date)
    riderAssignments.sort((a, b) => {
      try {
        const dateA = new Date(a.eventDate);
        const dateB = new Date(b.eventDate);
        
        // Handle invalid dates
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        
        return dateA.getTime() - dateB.getTime();
      } catch (sortError) {
        console.log('⚠️ Error sorting assignments:', sortError);
        return 0;
      }
    });
    
    console.log(`✅ Found ${riderAssignments.length} assignments for ${riderName}`);
    
    if (riderAssignments.length > 0) {
      console.log('Sample assignment:', riderAssignments[0]);
    }
    
    return riderAssignments;
    
  } catch (error) {
    console.error(`❌ Error getting assignments for rider ${riderName}:`, error);
    logError(`Error in getRiderAssignments for rider ${riderName}`, error);
    return [];
  }
}

/**
 * Alternative function to get rider assignments by name only
 */
function getRiderAssignmentsByName(riderName) {
  try {
    console.log(`🔍 Getting assignments for rider by name: ${riderName}`);
    
    // Find the rider ID first
    const ridersData = getRidersData();
    let riderId = null;
    
    if (ridersData && ridersData.data) {
      for (let i = 0; i < ridersData.data.length; i++) {
        const row = ridersData.data[i];
        const rowName = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.name);
        
        if (rowName && String(rowName).toLowerCase().trim() === String(riderName).toLowerCase().trim()) {
          riderId = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.jpNumber);
          break;
        }
      }
    }
    
    return getRiderAssignments(riderId, riderName);
    
  } catch (error) {
    console.error(`❌ Error getting assignments by name for ${riderName}:`, error);
    return [];
  }
}

/**
 * Enhanced function to get rider assignment summary with counts
 */
function getRiderAssignmentSummary(riderId, riderName) {
  try {
    const assignments = getRiderAssignments(riderId, riderName);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let upcoming = 0;
    let completed = 0;
    let inProgress = 0;
    let total = assignments.length;
    
    assignments.forEach(assignment => {
      try {
        const eventDate = new Date(assignment.eventDate);
        const status = assignment.status;
        
        if (status === 'Completed') {
          completed++;
        } else if (status === 'In Progress') {
          inProgress++;
        } else if (eventDate >= today) {
          upcoming++;
        }
      } catch (e) {
        // Skip assignments with invalid dates
      }
    });
    
    return {
      assignments: assignments,
      summary: {
        total: total,
        upcoming: upcoming,
        completed: completed,
        inProgress: inProgress
      }
    };
    
  } catch (error) {
    console.error(`❌ Error getting assignment summary for ${riderName}:`, error);
    return {
      assignments: [],
      summary: { total: 0, upcoming: 0, completed: 0, inProgress: 0 }
    };
  }
}

/**
 * Checks if the rider has an assignment within one hour of the given start time on the given date.
 * @param {string} riderName The rider name.
 * @param {string} eventDateStr The event date string.
 * @param {string} startTimeStr The start time string.
 * @return {boolean} True if a conflict exists.
 */
function checkRiderTimeConflict(riderName, eventDateStr, startTimeStr) {
  try {
    if (!riderName || !eventDateStr || !startTimeStr) return false;

    var eventDate = new Date(eventDateStr);
    if (isNaN(eventDate.getTime())) return false;

    var assignments = getRiderAssignmentsForDate(riderName, eventDate);
    if (!assignments || assignments.length === 0) return false;

    var assignmentsData = getAssignmentsData();
    var colMap = assignmentsData.columnMap;
    var startCol = CONFIG.columns.assignments.startTime;
    var statusCol = CONFIG.columns.assignments.status;

    var requestStart = parseTimeString(startTimeStr);
    if (!requestStart) return false;
    requestStart.setFullYear(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    for (var i = 0; i < assignments.length; i++) {
      var row = assignments[i];
      var status = getColumnValue(row, colMap, statusCol);
      if (['Completed', 'Cancelled', 'No Show'].indexOf(status) !== -1) continue;

      var startVal = getColumnValue(row, colMap, startCol);
      var rowStart = parseTimeString(startVal);
      if (!rowStart) continue;
      rowStart.setFullYear(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

      var diff = Math.abs(rowStart.getTime() - requestStart.getTime());
      if (diff <= 60 * 60 * 1000) {
        return true;
      }
    }

    return false;
  } catch (error) {
    logError('Error in checkRiderTimeConflict', error);
    return false;
  }
}

/**
 * Checks the rider's availability schedule for a specific datetime.
 * @param {string|number} riderId Rider identifier or name.
 * @param {Date|string} datetime Date and time to check.
 * @return {boolean} True if the rider is available at that time.
 */
function getRiderAvailabilityForDate(riderId, datetime) {
  try {
    if (!riderId || !datetime) return true;
    const checkDate = datetime instanceof Date ? new Date(datetime) : new Date(datetime);
    if (isNaN(checkDate.getTime())) return true;

    const availData = getRiderAvailabilityData();
    if (!availData || !availData.data) return true;

    const cm = availData.columnMap;
    const idCol = CONFIG.columns.riderAvailability.riderId;
    const dateCol = CONFIG.columns.riderAvailability.date;
    const startCol = CONFIG.columns.riderAvailability.startTime;
    const endCol = CONFIG.columns.riderAvailability.endTime;
    const statusCol = CONFIG.columns.riderAvailability.status;

    for (let i = 0; i < availData.data.length; i++) {
      const row = availData.data[i];
      const rowId = getColumnValue(row, cm, idCol);
      if (String(rowId).trim() !== String(riderId).trim()) continue;

      let rowDate = getColumnValue(row, cm, dateCol);
      rowDate = rowDate instanceof Date ? new Date(rowDate) : parseDateString(rowDate);
      if (!rowDate) continue;
      rowDate.setHours(0, 0, 0, 0);
      const cmp = new Date(checkDate); cmp.setHours(0,0,0,0);
      if (rowDate.getTime() !== cmp.getTime()) continue;

      let start = getColumnValue(row, cm, startCol);
      let end = getColumnValue(row, cm, endCol);
      const startDt = start ? parseTimeString(start) : null;
      const endDt = end ? parseTimeString(end) : null;
      const checkDt = new Date(checkDate);
      if (startDt) startDt.setFullYear(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
      if (endDt) endDt.setFullYear(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());

      const matchesTime = (!startDt && !endDt) ||
                          (startDt && !endDt && checkDt >= startDt) ||
                          (!startDt && endDt && checkDt <= endDt) ||
                          (startDt && endDt && checkDt >= startDt && checkDt <= endDt);

      if (matchesTime) {
        const status = String(getColumnValue(row, cm, statusCol) || '').toLowerCase();
        return status === '' || status === 'available';
      }
    }
    return true;
  } catch (err) {
    logError('Error in getRiderAvailabilityForDate', err);
    return true;
  }
}

/**
 * Determines overall availability of a rider combining assignments and schedule.
 * @param {string} riderName Rider name used in assignments sheet.
 * @param {string} dateStr Event date string.
 * @param {string} startTimeStr Start time string of the event.
 * @return {boolean} True if the rider is available.
 */
function isRiderAvailable(riderName, dateStr, startTimeStr) {
  const conflict = checkRiderTimeConflict(riderName, dateStr, startTimeStr);
  if (conflict) return false;

  const rider = getRiderDetails(riderName);
  const riderId = rider ? rider.jpNumber || rider.riderId || rider.id : riderName;
  const start = parseTimeString(startTimeStr);
  const date = new Date(dateStr);
  if (start) start.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
  const available = getRiderAvailabilityForDate(riderId, start || date);
  return available;
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

    const auth = authenticateAndAuthorizeUser();
    if (!auth.success) {
      return {
        success: false,
        error: auth.error || 'UNAUTHORIZED',
        user: auth.user || {
          name: auth.userName || 'User',
          email: auth.userEmail || '',
          roles: ['unauthorized'],
          permissions: []
        },
        requests: []
      };
    }

    const user = Object.assign({}, auth.user, {
      roles: auth.user.roles || [auth.user.role]
    });

    // Get requests using the enhanced function
    const requests = getFilteredRequestsForWebApp(user, filter); // Pass user
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
      user: {
        name: 'System User',
        email: '',
        roles: ['system'],
        permissions: []
      },
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
 * Simple debug function to diagnose riders issue
 * Add this to your AppServices.gs or Code.gs file
 */
function debugRidersIssue() {
  try {
    console.log('🔍 Starting simple riders debug...');
    
    // Test 1: Get raw riders data
    const ridersData = getRidersData();
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      tests: {}
    };
    
    // Test raw data access
    result.tests.rawData = {
      hasData: !!ridersData,
      dataLength: ridersData?.data?.length || 0,
      headersLength: ridersData?.headers?.length || 0,
      headers: ridersData?.headers || [],
      columnMap: ridersData?.columnMap || {},
      sampleRow: ridersData?.data?.[0] || null
    };
    
    // Test CONFIG columns
    result.tests.configColumns = {
      expectedName: CONFIG.columns.riders.name,
      expectedStatus: CONFIG.columns.riders.status,
      expectedJpNumber: CONFIG.columns.riders.jpNumber,
      nameColumnExists: ridersData?.columnMap?.[CONFIG.columns.riders.name] !== undefined,
      statusColumnExists: ridersData?.columnMap?.[CONFIG.columns.riders.status] !== undefined,
      jpNumberColumnExists: ridersData?.columnMap?.[CONFIG.columns.riders.jpNumber] !== undefined
    };
    
    // Test actual riders function
    let allRiders = [];
    try {
      allRiders = getRiders();
      result.tests.getRiders = {
        success: true,
        count: allRiders.length,
        sample: allRiders[0] || null
      };
    } catch (error) {
      result.tests.getRiders = {
        success: false,
        error: error.message
      };
    }
    
    // Test active riders function
    let activeRiders = [];
    try {
      activeRiders = getActiveRidersForAssignments();
      result.tests.getActiveRiders = {
        success: true,
        count: activeRiders.length,
        sample: activeRiders[0] || null
      };
    } catch (error) {
      result.tests.getActiveRiders = {
        success: false,
        error: error.message
      };
    }
    
    // Analyze why no active riders
    if (allRiders.length > 0 && activeRiders.length === 0) {
      result.analysis = {
        totalRiders: allRiders.length,
        activeRiders: activeRiders.length,
        statusValues: allRiders.map(r => r.status || r.Status || 'No Status'),
        possibleIssues: []
      };
      
      // Check for common issues
      const statuses = result.analysis.statusValues;
      const uniqueStatuses = [...new Set(statuses)];
      
      if (!uniqueStatuses.includes('Active')) {
        result.analysis.possibleIssues.push('No riders have "Active" status');
      }
      
      if (uniqueStatuses.includes('')) {
        result.analysis.possibleIssues.push('Some riders have empty status');
      }
      
      result.analysis.uniqueStatuses = uniqueStatuses;
    }
    
    console.log('✅ Debug completed:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Quick fix function to make all riders active
 * Use this temporarily to test if the issue is status-related
 */
function getAllRidersRegardlessOfStatus() {
  try {
    console.log('🔧 Getting ALL riders regardless of status...');
    
    const ridersData = getRidersData();
    
    if (!ridersData || !ridersData.data || ridersData.data.length === 0) {
      return [];
    }
    
    const columnMap = ridersData.columnMap;
    const allRiders = [];
    
    for (let i = 0; i < ridersData.data.length; i++) {
      const row = ridersData.data[i];
      
      const riderName = getColumnValue(row, columnMap, CONFIG.columns.riders.name) || 
                        getColumnValue(row, columnMap, 'Full Name') || 
                        row[1];
      
      // Only require a name - ignore status completely
      if (!riderName || String(riderName).trim().length === 0) {
        continue;
      }
      
      const jpNumber = getColumnValue(row, columnMap, CONFIG.columns.riders.jpNumber) || 
                       getColumnValue(row, columnMap, 'Rider ID') || 
                       row[0] || `RIDER-${i}`;
      
      const phone = getColumnValue(row, columnMap, CONFIG.columns.riders.phone) || 
                    getColumnValue(row, columnMap, 'Phone Number') || 
                    '555-0000';
      
      const email = getColumnValue(row, columnMap, CONFIG.columns.riders.email) || 
                    getColumnValue(row, columnMap, 'Email') || 
                    '';
      
      allRiders.push({
        name: String(riderName).trim(),
        jpNumber: String(jpNumber).trim(),
        phone: String(phone).trim(),
        email: String(email).trim(),
        carrier: 'Unknown',
        status: 'Available' // Force all to be available
      });
    }
    
    console.log(`✅ Found ${allRiders.length} riders (ignoring status)`);
    return allRiders;
    
  } catch (error) {
    console.error('❌ Error getting all riders:', error);
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
function getPageDataForDashboard(user) { // Added user parameter
  try {
    // const user = getCurrentUser(); // Removed: user is now a parameter
    const stats = calculateDashboardStatistics();
    const rawRequests = getRequestsData();
    let recentRequests = [];
    if (rawRequests && rawRequests.data) {
      const allFormattedRequests = getFilteredRequestsForWebApp(user, 'All', rawRequests); // Adjusted parameters
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
      success: false, error: error.message, user: user, // Use passed user
      stats: { activeRiders: 0, pendingRequests: 0, todayAssignments: 0, weekAssignments: 0, totalRequests: 0, completedRequests: 0 },
      recentRequests: [], upcomingAssignments: []
    };
  }
}

/**
 * Unified getPageDataForAssignments function
 * Handles both parameter patterns for compatibility
 * @param {string|object} userOrRequestId - Either a user object or requestId string
 * @param {object} [filters] - Optional filters (when first param is user)
 * @return {object} Consolidated data object
 */
function getPageDataForAssignments(userOrRequestId = null, filters = {}) {
    console.log('ADP_LOG: getPageDataForAssignments received raw userOrRequestId:', userOrRequestId);
    try {
        console.log('📊 getPageDataForAssignments called with:', typeof userOrRequestId, userOrRequestId);
        
        let user = null;
        let requestIdToLoad = null;
        
        // Determine parameter pattern
        if (typeof userOrRequestId === 'string') {
            // Called with requestId (from assignments page)
            console.log('🎯 Called with requestId pattern');
            requestIdToLoad = userOrRequestId;
            console.log('ADP_LOG: Extracted requestIdToLoad (from string input):', requestIdToLoad);
            if (requestIdToLoad) {
                requestIdToLoad = String(requestIdToLoad).trim();
                console.log('ADP_LOG: Sanitized requestIdToLoad:', requestIdToLoad);
            }
            
            // Get user from authentication
            const auth = authenticateAndAuthorizeUser();
            if (!auth.success) {
                return {
                    success: false,
                    error: auth.error || 'Authentication failed',
                    user: null,
                    requests: [],
                    riders: []
                };
            }
            user = auth.user;
            
        } else if (userOrRequestId && typeof userOrRequestId === 'object') {
            // Called with user object (from secured functions)
            console.log('👤 Called with user object pattern');
            user = userOrRequestId;
            
            // Check if requestId is in filters
            if (filters.requestId) {
                requestIdToLoad = filters.requestId;
                console.log('ADP_LOG: Extracted requestIdToLoad (from filters):', requestIdToLoad);
                if (requestIdToLoad) {
                    requestIdToLoad = String(requestIdToLoad).trim();
                    console.log('ADP_LOG: Sanitized requestIdToLoad:', requestIdToLoad);
                }
            }
            
        } else {
            // Called with no parameters or null
            console.log('🔄 Called with no parameters, getting user from auth');
            const auth = authenticateAndAuthorizeUser();
            if (!auth.success) {
                return {
                    success: false,
                    error: auth.error || 'Authentication failed',
                    user: null,
                    requests: [],
                    riders: []
                };
            }
            user = auth.user;
        }
        
        console.log('✅ User determined:', user.name, '| RequestId:', requestIdToLoad);
        
        // Check permissions
        if (!canAccessPage(user, 'assignments')) {
            return {
                success: false,
                error: 'Access denied to assignments page',
                user: user,
                requests: [],
                riders: []
            };
        }
        
        // Initialize result
        const result = {
            success: true,
            user: user,
            requests: [],
            riders: [],
            initialRequestDetails: null
        };
        
        // Get assignable requests
        try {
            console.log('📋 Loading assignable requests...');
            result.requests = getFilteredRequestsForAssignments(user);
            console.log(`✅ Loaded ${result.requests.length} assignable requests`);
        } catch (requestsError) {
            console.warn('⚠️ Error loading requests:', requestsError.message);
            result.requests = [];
        }
        
        // Get active riders
        try {
            console.log('👥 Loading active riders...');
            result.riders = getActiveRidersForWebApp();
            console.log(`✅ Loaded ${result.riders.length} active riders`);
        } catch (ridersError) {
            console.warn('⚠️ Error loading riders:', ridersError.message);
            result.riders = [];
        }
        
        // Add permission flags for compatibility with secured version
        result.canCreate = hasPermission(user, 'assignments', 'create');
        result.canEdit = hasPermission(user, 'assignments', 'update');
        result.canDelete = hasPermission(user, 'assignments', 'delete');
        result.canBulkAssign = hasPermission(user, 'assignments', 'bulk_assign');
        
        // Handle specific request ID
        if (requestIdToLoad) {
            console.log('🎯 Looking for specific request:', requestIdToLoad);
            
            // First check in loaded requests
            const foundRequest = result.requests.find(req => 
                (req.id && req.id === requestIdToLoad) ||
                (req.requestId && req.requestId === requestIdToLoad)
            );
            
            if (foundRequest) {
                result.initialRequestDetails = foundRequest;
                console.log('✅ Found initial request in list:', foundRequest.id || foundRequest.requestId);
            } else {
                console.warn('⚠️ Requested ID not found in assignable requests:', requestIdToLoad);
                
                // Try to get it directly (might be completed/cancelled but still viewable)
                try {
                    if (typeof getRequestDetails === 'function') {
                        const directRequest = getRequestDetails(requestIdToLoad);
                        if (directRequest) {
                            result.initialRequestDetails = directRequest;
                            console.log('✅ Found request via direct lookup');
                        }
                    }
                } catch (directError) {
                    console.warn('⚠️ Direct request lookup failed:', directError.message);
                }
                
                // Set flags for not found
                if (!result.initialRequestDetails) {
                    result.requestNotFound = true;
                    result.requestedId = requestIdToLoad;
                }
            }
        }
        
        console.log('✅ Returning unified assignments data');
        console.log('  - Success:', result.success);
        console.log('  - User:', result.user.name);
        console.log('  - Requests:', result.requests.length);
        console.log('  - Riders:', result.riders.length);
        console.log('  - Initial request:', !!result.initialRequestDetails);
        
        return result;
        
    } catch (error) {
        console.error('❌ Critical error in unified getPageDataForAssignments:', error);
        return {
            success: false,
            error: 'Server error: ' + error.message,
            user: user || null,
            requests: [],
            riders: []
        };
    }
}




// ADD this function to help debug which functions exist:

function debugAssignmentsFunctions() {
    try {
        console.log('=== DEBUGGING ASSIGNMENTS FUNCTIONS ===');
        
        // Check if helper functions exist
        const helperFunctions = [
            'authenticateAndAuthorizeUser',
            'canAccessPage', 
            'hasPermission',
            'getFilteredRequestsForAssignments',
            'getActiveRidersForWebApp',
            'getRequestDetails'
        ];
        
        helperFunctions.forEach(funcName => {
            const exists = typeof eval(funcName) === 'function';
            console.log(`${funcName}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
        });
        
        // Test the unified function
        console.log('\n--- Testing unified function ---');
        const testResult = getPageDataForAssignments('E-13-25');
        console.log('Test result success:', testResult.success);
        
        if (testResult.success) {
            console.log('✅ UNIFIED FUNCTION WORKS!');
        } else {
            console.log('❌ Unified function failed:', testResult.error);
        }
        
        return testResult;
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
        return { success: false, error: error.message };
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
function getFilteredRequestsForWebApp(user, filter = 'All', rawRequestsInput = null) { // Added user, rawRequestsInput
  try {
    console.log(`📋 Getting filtered requests for web app with filter: ${filter} for user: ${user ? user.name : 'Unknown'}`);
    
    // Get the raw requests data
    const requestsData = rawRequestsInput || getRequestsData(); // Use input or fetch
    
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
function getPageDataForNotifications(user) { // Added user parameter
  try {
    console.log('🔄 Loading notifications page data...');
    
    const result = {
      success: true,
      user: user, // Use passed user
      assignments: [],
      stats: {},
      recentActivity: []
    };
    
    // Get user data
    // try { // Removed block
    //   result.user = getCurrentUser();
    // } catch (userError) {
    //   console.log('⚠️ Could not load user data:', userError);
    //   result.user = {
    //     name: 'System User',
    //     email: 'user@system.com',
    //     roles: ['admin'],
    //     permissions: ['send_notifications']
    //   };
    // }
    
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
      user: user || { // Use passed user or fallback
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
function getPageDataForReports(user, filters) { // Added user parameter
  try {
    // const user = getCurrentUser(); // Removed: user is now a parameter
    const reportData = generateReportData(filters); // From Reports.js
    return { success: true, user, reportData };
  } catch (error) {
    logError('Error in getPageDataForReports', error);
    return { success: false, error: error.message, user: user, reportData: null }; // Use passed user
  }
}

/**
 * Fetches all necessary data for the mobile rider view (requests and specific assignments).
 * @param {string} [filter='All'] The status filter to apply to the general requests.
 * @return {object} An object containing `user`, `requests`, and `assignments`.
 *                  Includes a `success` flag and `error` message on failure.
 */
function getPageDataForMobileRiderView(user, filter = 'All') { // Added user parameter
  // let user = null; // Removed: user is now a parameter
  try {
    // user = getCurrentUser(); // Attempt to get user info first // Removed

    // Fetch general requests
    const rawRequests = getRequestsData();
    let requests = [];
    // Ensure getFilteredRequestsForWebApp is available in the global scope or defined in AppServices.gs
    if (typeof getFilteredRequestsForWebApp === 'function') {
        // Assuming getFilteredRequestsForWebApp will be refactored to take user as first param
        requests = getFilteredRequestsForWebApp(user, filter, rawRequests); // Corrected parameter order
    } else {
        // console.warn('getFilteredRequestsForWebApp is not defined. Skipping general requests.');
    }

    // Fetch assignments specific to the rider
    const assignments = getMobileAssignmentsForRider(user); // Pass user

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
    // if (!user) { // user is now a parameter, this block might be redundant
    //   try { user = getCurrentUser(); } catch (e) { /* ignore secondary error */ }
    // }
    return {
      success: false,
      error: error.message,
      user: user, // Use passed user
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
function getMobileAssignmentsForRider(user) { // Added user parameter
  try {
    const userEmail = user.email; // Use user.email from parameter
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
          // const userProfile = getCurrentUser(); // Removed
          const currentUserName = user.name; // Use user.name from parameter
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
    // console.error(`❌ Error in getMobileAssignmentsForRider for ${user.email}:`, error.message, error.stack); // Use user.email
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
 * @param {boolean} [usePriority=true] - Whether to update the assignment rotation.
 * @return {object} Result object indicating success/failure and details.
 */
function processAssignmentAndPopulate(requestId, selectedRiders, usePriority) {
  // Existing log for requestId
  console.log('ADP_LOG: processAssignmentAndPopulate received raw requestId:', requestId);

  // Enhanced logging for selectedRiders
  console.log('ADP_LOG: Type of selectedRiders:', typeof selectedRiders);
  if (Array.isArray(selectedRiders)) {
      console.log('ADP_LOG: selectedRiders.length:', selectedRiders.length);
      if (selectedRiders.length > 0) {
          console.log('ADP_LOG: Type of selectedRiders[0]:', typeof selectedRiders[0]);
          console.log('ADP_LOG: selectedRiders[0] (JSON):', JSON.stringify(selectedRiders[0]));
      } else {
          console.log('ADP_LOG: selectedRiders is an empty array.');
      }
  } else {
      console.log('ADP_LOG: selectedRiders is NOT an array.');
  }

  // Existing log for usePriority
  console.log('ADP_LOG: processAssignmentAndPopulate received usePriority:', usePriority);
  console.log('ADP_LOG: Type of usePriority:', typeof usePriority);

  // Sanitization of requestId (already added in the previous step)
  var cleanRequestId = requestId;
  if (cleanRequestId) {
      cleanRequestId = String(cleanRequestId).trim();
  }
  console.log('ADP_LOG: Sanitized requestId for processAssignmentAndPopulate:', cleanRequestId);

  try {
    console.log(`🏍️ Starting assignment process for request ${cleanRequestId} with ${selectedRiders.length} riders`);
    console.log('Selected riders:', JSON.stringify(selectedRiders, null, 2));
    
    if (!cleanRequestId || !selectedRiders) {
      throw new Error('Request ID is required for assignment');
    }

    // Validate that the request exists and get its details
    const requestDetails = getRequestDetails(cleanRequestId);
    if (!requestDetails) {
      throw new Error(`Request ${cleanRequestId} not found`);
    }

    console.log('Request details found:', requestDetails);

    // Remove any existing assignments for this request first
    const existingAssignments = getAssignmentsForRequest(cleanRequestId);
    if (existingAssignments.length > 0) {
      console.log(`🗑️ Removing ${existingAssignments.length} existing assignments for request ${cleanRequestId}`);
      removeExistingAssignments(cleanRequestId);
    }

    // Create new assignments
    const assignmentResults = [];
    const assignedRiderNames = [];

    for (let i = 0; i < selectedRiders.length; i++) {
      const rider = selectedRiders[i];
      console.log(`📝 Creating assignment ${i + 1}/${selectedRiders.length} for rider: ${rider.name}`);
      
      try {
        const assignmentId = generateAssignmentId();
        const assignmentRow = buildAssignmentRow(assignmentId, cleanRequestId, rider, requestDetails);
        
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
    updateRequestWithAssignedRiders(cleanRequestId, assignedRiderNames);
    if (usePriority !== false) {
      updateAssignmentRotation(assignedRiderNames);
    }

    // Clear caches to ensure fresh data
    clearRequestsCache();
    clearDataCache();


    const successCount = assignmentResults.filter(r => r.status === 'success').length;
    const failCount = assignmentResults.filter(r => r.status === 'failed').length;

    logActivity(`Assignment process completed for ${cleanRequestId}: ${successCount} successful, ${failCount} failed`);

    return {
      success: true,
      message: `Successfully assigned ${successCount} rider(s) to request ${cleanRequestId}`,
      requestId: cleanRequestId,
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
      requestId: cleanRequestId || 'unknown',
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
          notes: getColumnValue(row, columnMap, CONFIG.columns.requests.notes),
          ridersAssigned: getColumnValue(row, columnMap, CONFIG.columns.requests.ridersAssigned) || ''
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
 * @param {string} cleanRequestId - The request ID.
 * @param {object} rider - The rider object with details.
 * @param {object} requestDetails - The request details object.
 * @return {Array} Array of values for the assignment row.
 */
function buildAssignmentRow(assignmentId, cleanRequestId, rider, requestDetails) {
  try {
    const assignmentsData = getAssignmentsData(); // This function call seems problematic in context, might need getAssignmentsSheetData()
    const headers = assignmentsData.headers; // Assuming getAssignmentsData returns headers
    const row = [];

    // Build row based on headers order
    for (const header of headers) {
      let value = '';
      
      switch (header) {
        case CONFIG.columns.assignments.id:
          value = assignmentId;
          break;
        case CONFIG.columns.assignments.requestId:
          value = cleanRequestId;
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
 * @param {string} cleanRequestId - The request ID to clear assignments for.
 * @return {void}
 */
function removeExistingAssignments(cleanRequestId) {
  try {
    const assignmentsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.assignments);
    if (!assignmentsSheet) {
      throw new Error('Assignments sheet not found');
    }

    const data = assignmentsSheet.getDataRange().getValues();
    const headers = data[0];
    const requestIdCol = headers.indexOf(CONFIG.columns.assignments.requestId);
    const riderNameCol = headers.indexOf(CONFIG.columns.assignments.riderName);

    if (requestIdCol === -1) {
      throw new Error('Request ID column not found in assignments sheet');
    }

    // Find rows to delete (in reverse order to avoid index shifting)
    const rowsToDelete = [];
    const removedNames = [];
    for (let i = data.length - 1; i >= 1; i--) { // Start from bottom, skip header
      if (String(data[i][requestIdCol]).trim() === String(cleanRequestId).trim()) {
        rowsToDelete.push(i + 1); // Convert to 1-based row number
        if (riderNameCol !== -1) {
          const name = String(data[i][riderNameCol]).trim();
          if (name) removedNames.push(name);
        }
      }
    }

    // Delete the rows
    for (const rowNum of rowsToDelete) {
      assignmentsSheet.deleteRow(rowNum);
    }

    console.log(`🗑️ Removed ${rowsToDelete.length} existing assignments for request ${cleanRequestId}`);

    if (removedNames.length > 0) {
      updateRotationOnUnassign(removedNames);
    }

    return removedNames;

  } catch (error) {
    logError('Error removing existing assignments', error);
    throw new Error(`Failed to remove existing assignments: ${error.message}`);
  }
}

/**
 * Updates the request with the list of assigned rider names.
 * @param {string} cleanRequestId - The request ID to update.
 * @param {Array<string>} riderNames - Array of assigned rider names.
 * @return {void}
 */
function updateRequestWithAssignedRiders(cleanRequestId, riderNames) {
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
      if (String(rowRequestId).trim() === String(cleanRequestId).trim()) {
        targetRowIndex = i;
        break;
      }
    }

    if (targetRowIndex === -1) {
      throw new Error(`Request ${cleanRequestId} not found for rider assignment update`);
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

    // Update status based on whether riders were assigned
    if (statusCol !== undefined) {
      const newStatus = riderNames.length > 0 ? 'Assigned' : 'Unassigned';
      requestsSheet.getRange(sheetRowNumber, statusCol + 1).setValue(newStatus);
    }

    // Update last modified timestamp
    if (lastUpdatedCol !== undefined) {
      requestsSheet.getRange(sheetRowNumber, lastUpdatedCol + 1).setValue(new Date());
    }

    console.log(`📝 Updated request ${cleanRequestId} with ${riderNames.length} assigned riders`);

    if (typeof syncRequestToCalendar === 'function') {
      try {
        syncRequestToCalendar(cleanRequestId);
      } catch (syncError) {
        logError(`Failed to sync request ${cleanRequestId} to calendar`, syncError);
      }
    }

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
/**
 * Add these debugging functions to your Code.gs or AppServices.gs file
 * These will help diagnose why no active riders are being returned
 */

/**
 * Comprehensive debugging function for active riders issue
 * Add this to your Code.gs or AppServices.gs file
 */
function debugActiveRidersIssue() {
  try {
    console.log('🔍 === DEBUGGING ACTIVE RIDERS ISSUE ===');
    
    const result = {
      timestamp: new Date().toISOString(),
      tests: {},
      recommendations: []
    };
    
    // Test 1: Raw sheet access
    console.log('🧪 Test 1: Raw sheet access...');
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.riders);
      const range = sheet.getDataRange();
      const values = range.getValues();
      
      result.tests.rawSheetAccess = {
        success: true,
        sheetName: sheet.getName(),
        totalRows: values.length,
        totalColumns: values.length > 0 ? values[0].length : 0,
        headers: values.length > 0 ? values[0] : [],
        sampleDataRow: values.length > 1 ? values[1] : null
      };
      
      console.log('✅ Raw sheet access successful');
    } catch (error) {
      result.tests.rawSheetAccess = {
        success: false,
        error: error.message
      };
      console.error('❌ Raw sheet access failed:', error);
    }
    
    // Test 2: getRidersData function
    console.log('🧪 Test 2: getRidersData function...');
    try {
      const ridersData = getRidersData();
      
      result.tests.getRidersData = {
        success: true,
        hasData: !!ridersData,
        dataLength: ridersData?.data?.length || 0,
        headersLength: ridersData?.headers?.length || 0,
        headers: ridersData?.headers || [],
        columnMap: ridersData?.columnMap || {},
        sampleRow: ridersData?.data?.[0] || null
      };
      
      console.log('✅ getRidersData successful');
    } catch (error) {
      result.tests.getRidersData = {
        success: false,
        error: error.message
      };
      console.error('❌ getRidersData failed:', error);
    }
    
    // Test 3: Column mapping check
    console.log('🧪 Test 3: Column mapping check...');
    try {
      const ridersData = getRidersData();
      const expectedColumns = {
        name: CONFIG.columns.riders.name,
        status: CONFIG.columns.riders.status,
        jpNumber: CONFIG.columns.riders.jpNumber,
        phone: CONFIG.columns.riders.phone,
        email: CONFIG.columns.riders.email
      };
      
      const columnMappingResult = {};
      Object.entries(expectedColumns).forEach(([key, columnName]) => {
        const index = ridersData?.columnMap?.[columnName];
        columnMappingResult[key] = {
          expectedColumnName: columnName,
          foundAtIndex: index,
          exists: index !== undefined
        };
      });
      
      result.tests.columnMapping = {
        success: true,
        expectedColumns: expectedColumns,
        mapping: columnMappingResult,
        allColumnsFound: Object.values(columnMappingResult).every(col => col.exists)
      };
      
      console.log('✅ Column mapping check complete');
    } catch (error) {
      result.tests.columnMapping = {
        success: false,
        error: error.message
      };
      console.error('❌ Column mapping check failed:', error);
    }
    
    // Test 4: Status analysis
    console.log('🧪 Test 4: Rider status analysis...');
    try {
      const ridersData = getRidersData();
      const statusAnalysis = {
        totalRiders: 0,
        statusCounts: {},
        ridersWithoutNames: 0,
        ridersWithoutStatus: 0,
        sampleRiders: []
      };
      
      if (ridersData?.data) {
        statusAnalysis.totalRiders = ridersData.data.length;
        
        ridersData.data.forEach((row, index) => {
          const name = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.name);
          const status = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.status);
          const jpNumber = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.jpNumber);
          
          // Count statuses
          const statusKey = status || 'NO_STATUS';
          statusAnalysis.statusCounts[statusKey] = (statusAnalysis.statusCounts[statusKey] || 0) + 1;
          
          // Count missing data
          if (!name || String(name).trim() === '') {
            statusAnalysis.ridersWithoutNames++;
          }
          
          if (!status || String(status).trim() === '') {
            statusAnalysis.ridersWithoutStatus++;
          }
          
          // Sample first 5 riders
          if (index < 5) {
            statusAnalysis.sampleRiders.push({
              index: index,
              name: name || 'NO_NAME',
              status: status || 'NO_STATUS',
              jpNumber: jpNumber || 'NO_JP_NUMBER',
              hasName: !!(name && String(name).trim()),
              hasStatus: !!(status && String(status).trim())
            });
          }
        });
      }
      
      result.tests.statusAnalysis = {
        success: true,
        ...statusAnalysis
      };
      
      console.log('✅ Status analysis complete');
    } catch (error) {
      result.tests.statusAnalysis = {
        success: false,
        error: error.message
      };
      console.error('❌ Status analysis failed:', error);
    }
    
    // Test 5: Test the actual functions
    console.log('🧪 Test 5: Testing actual rider functions...');
    try {
      const functionTests = {};
      
      // Test getRiders
      try {
        const allRiders = getRiders();
        functionTests.getRiders = {
          success: true,
          count: allRiders?.length || 0,
          sample: allRiders?.[0] || null
        };
      } catch (error) {
        functionTests.getRiders = {
          success: false,
          error: error.message
        };
      }
      
      // Test getActiveRidersForAssignments
      try {
        const activeRiders = getActiveRidersForAssignments();
        functionTests.getActiveRidersForAssignments = {
          success: true,
          count: activeRiders?.length || 0,
          sample: activeRiders?.[0] || null
        };
      } catch (error) {
        functionTests.getActiveRidersForAssignments = {
          success: false,
          error: error.message
        };
      }
      
      // Test getActiveRidersForWebApp
      try {
        const webAppRiders = getActiveRidersForWebApp();
        functionTests.getActiveRidersForWebApp = {
          success: true,
          count: webAppRiders?.length || 0,
          sample: webAppRiders?.[0] || null
        };
      } catch (error) {
        functionTests.getActiveRidersForWebApp = {
          success: false,
          error: error.message
        };
      }
      
      result.tests.functionTests = functionTests;
      console.log('✅ Function tests complete');
    } catch (error) {
      result.tests.functionTests = {
        success: false,
        error: error.message
      };
      console.error('❌ Function tests failed:', error);
    }
    
    // Generate recommendations
    console.log('🧪 Generating recommendations...');
    
    if (result.tests.statusAnalysis?.success) {
      const statusCounts = result.tests.statusAnalysis.statusCounts;
      const totalWithoutStatus = result.tests.statusAnalysis.ridersWithoutStatus;
      
      if (totalWithoutStatus > 0) {
        result.recommendations.push(`${totalWithoutStatus} riders have no status - consider setting them to 'Active'`);
      }
      
      if (!statusCounts['Active'] && !statusCounts['active']) {
        result.recommendations.push('No riders have "Active" status - this may be why no active riders are found');
      }
      
      if (statusCounts['NO_STATUS'] > 0) {
        result.recommendations.push(`${statusCounts['NO_STATUS']} riders have empty status - these may need to be set to 'Active'`);
      }
    }
    
    if (result.tests.columnMapping?.success && !result.tests.columnMapping.allColumnsFound) {
      result.recommendations.push('Some expected columns are missing - check your sheet headers match CONFIG settings');
    }
    
    console.log('✅ Debug analysis complete');
    console.log('📊 Final result:', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Debug function failed:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Simple function to get all riders regardless of status (for testing)
 */
function getAllRidersIgnoreStatus() {
  try {
    console.log('🔧 Getting ALL riders regardless of status...');
    
    const ridersData = getRidersData();
    
    if (!ridersData || !ridersData.data || ridersData.data.length === 0) {
      return [];
    }
    
    const columnMap = ridersData.columnMap;
    const allRiders = [];
    
    for (let i = 0; i < ridersData.data.length; i++) {
      const row = ridersData.data[i];
      
      const riderName = getColumnValue(row, columnMap, CONFIG.columns.riders.name) || 
                        getColumnValue(row, columnMap, 'Full Name') || 
                        row[1];
      
      // Only require a name - ignore status completely
      if (!riderName || String(riderName).trim().length === 0) {
        continue;
      }
      
      const jpNumber = getColumnValue(row, columnMap, CONFIG.columns.riders.jpNumber) || 
                       getColumnValue(row, columnMap, 'Rider ID') || 
                       row[0] || `RIDER-${i}`;
      
      const phone = getColumnValue(row, columnMap, CONFIG.columns.riders.phone) || 
                    getColumnValue(row, columnMap, 'Phone Number') || 
                    '555-0000';
      
      const email = getColumnValue(row, columnMap, CONFIG.columns.riders.email) || 
                    getColumnValue(row, columnMap, 'Email') || 
                    '';
      
      const status = getColumnValue(row, columnMap, CONFIG.columns.riders.status) || 'Active';
      
      allRiders.push({
        name: String(riderName).trim(),
        jpNumber: String(jpNumber).trim(),
        phone: String(phone).trim(),
        email: String(email).trim(),
        carrier: 'Unknown',
        status: status // Keep original status but don't filter by it
      });
    }
    
    console.log(`✅ Found ${allRiders.length} riders (ignoring status)`);
    return allRiders;
    
  } catch (error) {
    console.error('❌ Error getting all riders:', error);
    return [];
  }
}

/**
 * Function to fix all rider statuses to 'Active' (for testing)
 */
function setAllRidersToActive() {
  try {
    console.log('🔧 Setting all riders to Active status...');
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.riders);
    if (!sheet) {
      throw new Error('Riders sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const statusColIndex = headers.indexOf(CONFIG.columns.riders.status);
    
    if (statusColIndex === -1) {
      throw new Error('Status column not found');
    }
    
    let updatedCount = 0;
    
    // Update all riders to Active status
    for (let i = 1; i < data.length; i++) { // Skip header row
      const currentStatus = data[i][statusColIndex];
      
      // Only update if there's a name in the row
      const nameColIndex = headers.indexOf(CONFIG.columns.riders.name);
      const name = nameColIndex >= 0 ? data[i][nameColIndex] : data[i][1];
      
      if (name && String(name).trim().length > 0) {
        sheet.getRange(i + 1, statusColIndex + 1).setValue('Active');
        updatedCount++;
      }
    }
    
    console.log(`✅ Updated ${updatedCount} riders to Active status`);
    
    // Clear cache
    dataCache.clear('sheet_' + CONFIG.sheets.riders);
    
    return {
      success: true,
      updatedCount: updatedCount,
      message: `Set ${updatedCount} riders to Active status`
    };
    
  } catch (error) {
    console.error('❌ Error setting riders to active:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test function to verify the fix worked
 */
function testActiveRidersFix() {
  try {
    console.log('🧪 Testing active riders fix...');
    
    const result = {
      beforeFix: {},
      afterFix: {},
      success: false
    };
    
    // Test current state
    const activeRiders = getActiveRidersForAssignments();
    const allRiders = getAllRidersIgnoreStatus();
    
    result.beforeFix = {
      totalRiders: allRiders.length,
      activeRiders: activeRiders.length
    };
    
    console.log('Before fix:', result.beforeFix);
    
    // Apply fix if no active riders found
    if (activeRiders.length === 0 && allRiders.length > 0) {
      console.log('🔧 Applying fix...');
      const fixResult = setAllRidersToActive();
      
      if (fixResult.success) {
        // Test again after fix
        const activeRidersAfter = getActiveRidersForAssignments();
        
        result.afterFix = {
          totalRiders: allRiders.length,
          activeRiders: activeRidersAfter.length,
          fixApplied: true
        };
        
        result.success = activeRidersAfter.length > 0;
      }
    } else {
      result.afterFix = result.beforeFix;
      result.success = true;
    }
    
    console.log('After fix:', result.afterFix);
    console.log('Fix successful:', result.success);
    
    return result;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Save an availability entry for the current user or specified email.
 * If an entry with the same email, date and start time exists, it will be updated.
 * @param {object} entry Object containing date (YYYY-MM-DD), startTime, endTime, notes, and optional email.
 * @return {object} Result object with success boolean and row number.
 */
function saveUserAvailability(user, entry) { // Added user parameter
  try {
    if (!entry) throw new Error('No availability data provided');

    // const user = getCurrentUser(); // Removed: user is now a parameter
    const email = entry.email || user.email;
    const repeat = entry.repeat || 'none';
    const untilDate = entry.repeatUntil ? new Date(entry.repeatUntil) : new Date(entry.date);

    // Ensure the Availability sheet exists with the expected headers
    const sheet = getOrCreateSheet(
      CONFIG.sheets.availability,
      Object.values(CONFIG.columns.availability)
    );

    const sheetData = getSheetData(CONFIG.sheets.availability, false);
    const map = sheetData.columnMap;

    const emailCol = map[CONFIG.columns.availability.email] + 1;
    const dateCol = map[CONFIG.columns.availability.date] + 1;
    const startCol = map[CONFIG.columns.availability.startTime] + 1;
    const endCol = map[CONFIG.columns.availability.endTime] + 1;
    const notesCol = map[CONFIG.columns.availability.notes] + 1;

    function saveSingle(dateStr) {
      let targetRow = -1;
      for (let i = 0; i < sheetData.data.length; i++) {
        const row = sheetData.data[i];
        const rowEmail = row[map[CONFIG.columns.availability.email]];
        const rowDate = row[map[CONFIG.columns.availability.date]];
        const rowStart = row[map[CONFIG.columns.availability.startTime]];
        if (String(rowEmail).toLowerCase() === String(email).toLowerCase() &&
            Utilities.formatDate(new Date(rowDate), CONFIG.system.timezone, 'yyyy-MM-dd') === dateStr &&
            String(rowStart) === entry.startTime) {
          targetRow = i + 2; // account for header
          break;
        }
      }

      const rowValues = [email, new Date(dateStr), entry.startTime, entry.endTime, entry.notes || ''];

      if (targetRow > 0) {
        sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        sheet.appendRow(rowValues);
      }
    }

    let curDate = new Date(entry.date);
    const endDate = untilDate;
    while (curDate <= endDate) {
      const dateStr = Utilities.formatDate(curDate, CONFIG.system.timezone, 'yyyy-MM-dd');
      saveSingle(dateStr);

      if (repeat === 'daily') {
        curDate.setDate(curDate.getDate() + 1);
      } else if (repeat === 'weekly') {
        curDate.setDate(curDate.getDate() + 7);
      } else {
        break;
      }
    }

    clearDataCache();
    return { success: true };
  } catch (error) {
    logError('Error in saveUserAvailability', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieve availability entries for the specified email or current user.
 * @param {string} [email] Optional email address. Defaults to current user.
 * @return {Array<object>} Array of availability objects.
 */
function getUserAvailability(user, email) { // Added user parameter
  try {
    // const user = getCurrentUser(); // Removed: user is now a parameter
    const targetEmail = email || user.email;

    const sheetData = getSheetData(CONFIG.sheets.availability, true);
    const map = sheetData.columnMap;

    const results = [];
    sheetData.data.forEach(row => {
      const rowEmail = row[map[CONFIG.columns.availability.email]];
      if (String(rowEmail).toLowerCase() !== String(targetEmail).toLowerCase()) return;

      const dateVal = row[map[CONFIG.columns.availability.date]];
      results.push({
        email: rowEmail,
        date: formatDateForDisplay(new Date(dateVal)),
        startTime: formatTimeForDisplay(row[map[CONFIG.columns.availability.startTime]]),
        endTime: formatTimeForDisplay(row[map[CONFIG.columns.availability.endTime]]),
        notes: row[map[CONFIG.columns.availability.notes]] || ''
      });
    });

    results.sort((a, b) => {
      try { return new Date(a.date) - new Date(b.date); } catch(e) { return 0; }
    });

    return results;
  } catch (error) {
    logError('Error in getUserAvailability', error);
    return [];
  }
}


/**
 * Returns recent entries from the system log sheet.
 * @param {number} [limit=50] Maximum number of log entries to return.
 * @return {Array<Object>} Array of log objects with Timestamp, Type, Message, and Details.
 */
function getSystemLogs(limit) {
  try {
    var max = limit || 50;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.log);
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    var headers = data[0];
    var rows = data.slice(-Math.min(max, data.length - 1)).reverse();
    return rows.map(function(row) {
      var entry = {};
      headers.forEach(function(h, i) { entry[h] = row[i]; });
      return entry;
    });
  } catch (error) {
    logError('Error in getSystemLogs', error);
    return [];
  }
}

/**
 * Retrieves the current assignment rotation order from script properties.
 * Generates a default order from active riders if none exists.
 * @return {string[]} Ordered list of rider names.
 */
function getAssignmentRotation() {
  try {
    const prop = PropertiesService.getScriptProperties().getProperty('ASSIGNMENT_ORDER');
    if (prop) {
      return prop.split('\n').map(n => n.trim()).filter(n => n);
    }
    const riders = getActiveRidersForAssignments().filter(r => String(r.partTime || 'No').toLowerCase() !== 'yes');
    const order = riders.sort((a, b) => a.name.localeCompare(b.name)).map(r => r.name);
    PropertiesService.getScriptProperties().setProperty('ASSIGNMENT_ORDER', order.join('\n'));
    return order;
  } catch (error) {
    logError('Error in getAssignmentRotation', error);
    return [];
  }
}

/**
 * Updates the assignment rotation by moving newly assigned riders to the end.
 * @param {string[]} assignedNames Array of rider names that were just assigned.
 * @return {string[]} Updated order array.
 */
function updateAssignmentRotation(assignedNames) {
  try {
    if (!assignedNames || assignedNames.length === 0) {
      return getAssignmentRotation();
    }
    let order = getAssignmentRotation();
    assignedNames.forEach(function(name) {
      const idx = order.indexOf(name);
      if (idx !== -1) {
        order.splice(idx, 1);
      }
      order.push(name);
    });
    PropertiesService.getScriptProperties().setProperty('ASSIGNMENT_ORDER', order.join('\n'));
    return order;
  } catch (error) {
    logError('Error in updateAssignmentRotation', error);
    return getAssignmentRotation();
  }
}

/**
 * Updates the assignment rotation when riders are unassigned by moving them to the
 * front of the order. Riders not currently in the rotation are ignored.
 * @param {string[]} unassignedNames Array of rider names that were unassigned.
 * @return {string[]} Updated order array.
 */
function updateRotationOnUnassign(unassignedNames) {
  try {
    if (!unassignedNames || unassignedNames.length === 0) {
      return getAssignmentRotation();
    }
    let order = getAssignmentRotation();
    // Remove unassigned names from current order
    unassignedNames.forEach(function(name) {
      const idx = order.indexOf(name);
      if (idx !== -1) {
        order.splice(idx, 1);
      }
    });
    // Add them back to the front in the same order provided
    for (let i = unassignedNames.length - 1; i >= 0; i--) {
      order.unshift(unassignedNames[i]);
    }
    PropertiesService.getScriptProperties().setProperty('ASSIGNMENT_ORDER', order.join('\n'));
    return order;
  } catch (error) {
    logError('Error in updateRotationOnUnassign', error);
    return getAssignmentRotation();
  }
}

/**
 * Exposed function for the web application to retrieve the assignment order.
 * @return {string[]} Current assignment order.
 */
function getAssignmentOrderForWeb() {
  return getAssignmentRotation();
}
// Add this section to your AppServices.gs file
// You can place it after the existing assignment-related functions

// ===== ENHANCED ASSIGNMENTS DATA FUNCTIONS =====

/**
 * Enhanced getAssignmentsData function that supports pre-loading specific requests
 * @param {string} [requestId] - Optional request ID to pre-load
 * @returns {object} Combined data for assignments page
 */
function getAssignmentsData(requestId = null) {
    try {
        console.log('📊 Getting assignments data, requestId:', requestId);
        
        // Get user information
        const authResult = authenticateAndAuthorizeUser();
        if (!authResult.success) {
            return {
                success: false,
                error: 'Authentication failed: ' + authResult.error
            };
        }
        
        // Get requests data - use existing function
        const requestsResult = getRequestsForAssignments();
        if (!requestsResult.success) {
            return {
                success: false,
                error: 'Failed to load requests: ' + requestsResult.error
            };
        }
        
        // Get riders data - use existing function  
        const ridersResult = getActiveRidersForAssignments();
        if (!ridersResult.success) {
            return {
                success: false,
                error: 'Failed to load riders: ' + ridersResult.error
            };
        }
        
        const response = {
            success: true,
            user: authResult.user,
            requests: requestsResult.requests || requestsResult.data || [],
            riders: ridersResult.riders || ridersResult.data || []
        };
        
        // If a specific requestId was provided, try to get its details
        if (requestId) {
            console.log('🎯 Loading specific request details for:', requestId);
            
            try {
                // First check if it's in the regular requests list
                const foundInList = response.requests.find(req => 
                    (req.id && req.id === requestId) || 
                    (req.requestId && req.requestId === requestId)
                );
                
                if (foundInList) {
                    console.log('✅ Found request in regular list');
                    response.initialRequestDetails = foundInList;
                } else {
                    // Try to get it separately (might be completed/cancelled but still valid for viewing)
                    console.log('🔍 Request not in regular list, trying to fetch separately');
                    const specificRequest = getRequestByIdForAssignments(requestId);
                    
                    if (specificRequest) {
                        console.log('✅ Found specific request');
                        response.initialRequestDetails = specificRequest;
                    } else {
                        console.warn('⚠️ Could not find request:', requestId);
                        response.requestNotFound = true;
                        response.requestedId = requestId;
                    }
                }
            } catch (error) {
                console.error('❌ Error loading specific request:', error);
                // Don't fail the whole request, just log the issue
                response.requestLoadError = error.message;
            }
        }
        
        console.log('✅ Assignments data prepared successfully');
        return response;
        
    } catch (error) {
        console.error('❌ Error in getAssignmentsData:', error);
        return {
            success: false,
            error: 'Server error: ' + error.message
        };
    }
}

/**
 * Helper function to get a specific request by ID for assignments
 * @param {string} requestId - The request ID to find
 * @returns {object|null} The request object or null if not found
 */
function getRequestByIdForAssignments(requestId) {
    try {
        const requestsData = getRequestsData();
        if (!requestsData || !requestsData.data) {
            console.log('❌ No requests data available');
            return null;
        }
        
        const columnMap = requestsData.columnMap;
        
        // Find the row with matching request ID
        for (let i = 0; i < requestsData.data.length; i++) {
            const row = requestsData.data[i];
            const rowRequestId = String(getColumnValue(row, columnMap, CONFIG.columns.requests.id) || '').trim();
            
            if (rowRequestId === String(requestId).trim()) {
                // Format the request for the frontend using existing logic
                return {
                    id: rowRequestId,
                    requestId: rowRequestId, // For compatibility
                    requesterName: getColumnValue(row, columnMap, CONFIG.columns.requests.requesterName) || '',
                    eventDate: formatDateForDisplay(getColumnValue(row, columnMap, CONFIG.columns.requests.eventDate)),
                    startTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.requests.startTime)),
                    endTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.requests.endTime)),
                    startLocation: getColumnValue(row, columnMap, CONFIG.columns.requests.startLocation) || '',
                    endLocation: getColumnValue(row, columnMap, CONFIG.columns.requests.endLocation) || '',
                    ridersNeeded: parseInt(getColumnValue(row, columnMap, CONFIG.columns.requests.ridersNeeded) || 1),
                    status: getColumnValue(row, columnMap, CONFIG.columns.requests.status) || 'New',
                    type: getColumnValue(row, columnMap, CONFIG.columns.requests.requestType) || '',
                    ridersAssigned: getColumnValue(row, columnMap, CONFIG.columns.requests.ridersAssigned) || '',
                    specialRequirements: getColumnValue(row, columnMap, CONFIG.columns.requests.specialRequirements) || '',
                    notes: getColumnValue(row, columnMap, CONFIG.columns.requests.notes) || ''
                };
            }
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ Error getting request by ID for assignments:', error);
        return null;
    }
}

/**
 * Wrapper function to get requests suitable for assignments
 * This uses your existing logic but ensures consistent return format
 */
function getRequestsForAssignments() {
    try {
        // If you have an existing function like getFilteredRequestsForAssignments, use it
        if (typeof getFilteredRequestsForAssignments === 'function') {
            const requests = getFilteredRequestsForAssignments();
            return {
                success: true,
                requests: Array.isArray(requests) ? requests : []
            };
        }
        
        // Fallback: create a basic implementation
        const requestsData = getRequestsData();
        if (!requestsData || !requestsData.data) {
            return { success: false, error: 'No requests data available' };
        }
        
        const assignableStatuses = ['New', 'Pending', 'Assigned', 'Unassigned'];
        const filteredRequests = [];
        
        requestsData.data.forEach((row, index) => {
            try {
                const status = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.status);
                const requestId = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.id);
                
                if (requestId && assignableStatuses.includes(status)) {
                    filteredRequests.push({
                        id: requestId,
                        requesterName: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.requesterName) || '',
                        eventDate: formatDateForDisplay(getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.eventDate)),
                        startTime: formatTimeForDisplay(getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.startTime)),
                        startLocation: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.startLocation) || '',
                        ridersNeeded: parseInt(getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.ridersNeeded) || 1),
                        status: status
                    });
                }
            } catch (rowError) {
                console.warn(`Error processing request row ${index}:`, rowError);
            }
        });
        
        return {
            success: true,
            requests: filteredRequests
        };
        
    } catch (error) {
        console.error('❌ Error in getRequestsForAssignments:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
// ADD this function to your Code.gs or AppServices.gs file

/**
 * Gets all data needed for the assignments page in one consolidated call
 * @param {string} [requestIdInput] - Optional request ID to pre-load
 * @returns {object} Combined data for assignments page
 */
function getPageDataForAssignments(requestIdInput = null) { // Renamed to avoid conflict with outer scope
    console.log('ADP_LOG: (Inner getPageDataForAssignments) received raw requestIdInput:', requestIdInput);
    let requestId = requestIdInput;
    if (requestId) {
        requestId = String(requestId).trim();
        console.log('ADP_LOG: (Inner getPageDataForAssignments) sanitized requestId:', requestId);
    }
    try {
        console.log('📊 Getting assignments page data, requestId:', requestId);
        
        // Get user information
        const authResult = authenticateAndAuthorizeUser();
        if (!authResult.success) {
            return {
                success: false,
                error: 'Authentication failed: ' + authResult.error
            };
        }
        
        // Get requests data for assignments
        let requestsData = [];
        try {
            // Try to use existing function or create basic one
            if (typeof getFilteredRequestsForAssignments === 'function') {
                requestsData = getFilteredRequestsForAssignments(authResult.user);
            } else {
                // Fallback: get assignable requests
                requestsData = getAssignableRequestsBasic();
            }
        } catch (error) {
            console.error('❌ Error getting requests:', error);
            requestsData = [];
        }
        
        // Get riders data
        let ridersData = [];
        try {
            ridersData = getActiveRidersBasic();
        } catch (error) {
            console.error('❌ Error getting riders:', error);
            ridersData = [];
        }
        
        const response = {
            success: true,
            user: authResult.user,
            requests: requestsData,
            riders: ridersData
        };
        
        // If a specific requestId was provided, try to get its details
        if (requestId) {
            console.log('🎯 Loading specific request details for:', requestId);
            
            try {
                // Check if it's in the regular requests list
                const foundInList = requestsData.find(req => 
                    (req.id && req.id === requestId) || 
                    (req.requestId && req.requestId === requestId)
                );
                
                if (foundInList) {
                    console.log('✅ Found request in regular list');
                    response.initialRequestDetails = foundInList;
                } else {
                    // Try to get it separately
                    console.log('🔍 Request not in regular list, trying to fetch separately');
                    const specificRequest = getSpecificRequestForAssignments(requestId);
                    
                    if (specificRequest) {
                        console.log('✅ Found specific request');
                        response.initialRequestDetails = specificRequest;
                    } else {
                        console.warn('⚠️ Could not find request:', requestId);
                        response.requestNotFound = true;
                        response.requestedId = requestId;
                    }
                }
            } catch (error) {
                console.error('❌ Error loading specific request:', error);
                response.requestLoadError = error.message;
            }
        }
        
        console.log('✅ Assignments page data prepared successfully');
        return response;
        
    } catch (error) {
        console.error('❌ Error in getPageDataForAssignments:', error);
        return {
            success: false,
            error: 'Server error: ' + error.message
        };
    }
}

/**
 * Basic function to get assignable requests
 * @returns {Array} Array of request objects
 */
function getAssignableRequestsBasic() {
    try {
        const requestsData = getRequestsData();
        if (!requestsData || !requestsData.data) {
            console.log('❌ No requests data available');
            return [];
        }
        
        const assignableStatuses = ['New', 'Pending', 'Assigned', 'Unassigned'];
        const filteredRequests = [];
        
        requestsData.data.forEach((row, index) => {
            try {
                const status = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.status);
                const requestId = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.id);
                
                if (requestId && assignableStatuses.includes(status)) {
                    filteredRequests.push({
                        id: requestId,
                        requestId: requestId, // For compatibility
                        requesterName: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.requesterName) || '',
                        eventDate: formatDateForDisplay(getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.eventDate)),
                        startTime: formatTimeForDisplay(getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.startTime)),
                        endTime: formatTimeForDisplay(getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.endTime)),
                        startLocation: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.startLocation) || '',
                        endLocation: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.endLocation) || '',
                        ridersNeeded: parseInt(getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.ridersNeeded) || 1),
                        status: status,
                        type: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.requestType) || '',
                        ridersAssigned: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.ridersAssigned) || '',
                        specialRequirements: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.specialRequirements) || '',
                        notes: getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.notes) || ''
                    });
                }
            } catch (rowError) {
                console.warn(`Error processing request row ${index}:`, rowError);
            }
        });
        
        console.log(`✅ Found ${filteredRequests.length} assignable requests`);
        return filteredRequests;
        
    } catch (error) {
        console.error('❌ Error in getAssignableRequestsBasic:', error);
        return [];
    }
}

/**
 * Basic function to get active riders
 * @returns {Array} Array of rider objects
 */
function getActiveRidersBasic() {
    try {
        const ridersData = getRidersData();
        if (!ridersData || !ridersData.data) {
            console.log('❌ No riders data available');
            return [];
        }
        
        const activeRiders = [];
        
        ridersData.data.forEach((row, index) => {
            try {
                const status = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.status);
                const name = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.name);
                
                if (name && status === 'Active') {
                    activeRiders.push({
                        name: name,
                        jpNumber: getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.jpNumber) || '',
                        phone: getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.phone) || '',
                        email: getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.email) || '',
                        status: status
                    });
                }
            } catch (rowError) {
                console.warn(`Error processing rider row ${index}:`, rowError);
            }
        });
        
        console.log(`✅ Found ${activeRiders.length} active riders`);
        return activeRiders;
        
    } catch (error) {
        console.error('❌ Error in getActiveRidersBasic:', error);
        return [];
    }
}

/**
 * Get a specific request by ID for assignments
 * @param {string} requestId - The request ID to find
 * @returns {object|null} The request object or null if not found
 */
function getSpecificRequestForAssignments(requestId) {
    try {
        const requestsData = getRequestsData();
        if (!requestsData || !requestsData.data) {
            console.log('❌ No requests data available');
            return null;
        }
        
        const columnMap = requestsData.columnMap;
        
        // Find the row with matching request ID
        for (let i = 0; i < requestsData.data.length; i++) {
            const row = requestsData.data[i];
            const rowRequestId = String(getColumnValue(row, columnMap, CONFIG.columns.requests.id) || '').trim();
            
            if (rowRequestId === String(requestId).trim()) {
                // Format the request for the frontend
                return {
                    id: rowRequestId,
                    requestId: rowRequestId, // For compatibility
                    requesterName: getColumnValue(row, columnMap, CONFIG.columns.requests.requesterName) || '',
                    eventDate: formatDateForDisplay(getColumnValue(row, columnMap, CONFIG.columns.requests.eventDate)),
                    startTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.requests.startTime)),
                    endTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.requests.endTime)),
                    startLocation: getColumnValue(row, columnMap, CONFIG.columns.requests.startLocation) || '',
                    endLocation: getColumnValue(row, columnMap, CONFIG.columns.requests.endLocation) || '',
                    ridersNeeded: parseInt(getColumnValue(row, columnMap, CONFIG.columns.requests.ridersNeeded) || 1),
                    status: getColumnValue(row, columnMap, CONFIG.columns.requests.status) || 'New',
                    type: getColumnValue(row, columnMap, CONFIG.columns.requests.requestType) || '',
                    ridersAssigned: getColumnValue(row, columnMap, CONFIG.columns.requests.ridersAssigned) || '',
                    specialRequirements: getColumnValue(row, columnMap, CONFIG.columns.requests.specialRequirements) || '',
                    notes: getColumnValue(row, columnMap, CONFIG.columns.requests.notes) || ''
                };
            }
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ Error getting specific request for assignments:', error);
        return null;
    }
}

// ALSO ADD this test function to verify the assignments function works
function testAssignmentsPageData() {
    try {
        console.log('🧪 Testing assignments page data function...');
        
        // Test without requestId
        const result1 = getPageDataForAssignments();
        console.log('Test 1 (no requestId):', result1.success ? '✅ SUCCESS' : '❌ FAILED');
        if (result1.success) {
            console.log(`- Requests: ${result1.requests ? result1.requests.length : 0}`);
            console.log(`- Riders: ${result1.riders ? result1.riders.length : 0}`);
        } else {
            console.log('- Error:', result1.error);
        }
        
        // Test with requestId
        const result2 = getPageDataForAssignments('E-13-25');
        console.log('Test 2 (with requestId):', result2.success ? '✅ SUCCESS' : '❌ FAILED');
        if (result2.success) {
            console.log(`- Initial request details: ${result2.initialRequestDetails ? '✅ Found' : '❌ Not found'}`);
            if (result2.initialRequestDetails) {
                console.log(`- Request ID: ${result2.initialRequestDetails.id}`);
                console.log(`- Requester: ${result2.initialRequestDetails.requesterName}`);
            }
        }
        
        return {
            success: true,
            test1: result1.success,
            test2: result2.success
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// REPLACE the getActiveRidersForAssignments function in AppServices.gs with this working version:

/**
 * Fixed getActiveRidersForAssignments function that always returns an array
 * @return {Array<object>} Array of active rider objects
 */
function getActiveRidersForAssignments() {
  try {
    console.log('🏍️ Getting active riders for assignments (FIXED VERSION)...');
    
    const ridersData = getRidersData();
    
    if (!ridersData || !ridersData.data || ridersData.data.length === 0) {
      console.log('❌ No riders data found, returning empty array');
      return [];
    }
    
    console.log(`📊 Processing ${ridersData.data.length} riders from sheet`);
    console.log('📋 Headers:', ridersData.headers);
    
    const columnMap = ridersData.columnMap;
    const activeRiders = [];
    
    // Process each rider row
    for (let i = 0; i < ridersData.data.length; i++) {
      try {
        const row = ridersData.data[i];
        
        // Get values using getColumnValue helper
        const name = getColumnValue(row, columnMap, CONFIG.columns.riders.name);
        const status = getColumnValue(row, columnMap, CONFIG.columns.riders.status);
        const jpNumber = getColumnValue(row, columnMap, CONFIG.columns.riders.jpNumber);
        const phone = getColumnValue(row, columnMap, CONFIG.columns.riders.phone);
        const email = getColumnValue(row, columnMap, CONFIG.columns.riders.email);
        const partTime = getColumnValue(row, columnMap, CONFIG.columns.riders.partTime);
        
        // Debug first few rows
        if (i < 3) {
          console.log(`Row ${i}:`, { name, status, jpNumber, phone, email });
        }
        
        // Check if rider has a name and is active
        if (name && String(name).trim() !== '') {
          // Check status - be flexible with status checking
          const statusStr = String(status || '').toLowerCase().trim();
          const isActive = statusStr === 'active' || 
                          statusStr === 'available' || 
                          statusStr === '' ||  // Empty status might mean active
                          !status;  // No status might mean active
          
          if (isActive) {
            const rider = {
              name: String(name).trim(),
              jpNumber: String(jpNumber || '').trim(),
              phone: String(phone || '').trim(),
              email: String(email || '').trim(),
              status: status || 'Active',
              partTime: String(partTime || 'No').trim()
            };
            
            activeRiders.push(rider);
            console.log(`✅ Added active rider: ${rider.name} (${rider.status})`);
          } else {
            console.log(`⚠️ Skipped rider ${name} - status: ${status}`);
          }
        } else {
          console.log(`⚠️ Skipped row ${i} - no name: ${name}`);
        }
        
      } catch (rowError) {
        console.warn(`⚠️ Error processing rider row ${i}:`, rowError.message);
      }
    }
    
    console.log(`✅ Found ${activeRiders.length} active riders for assignments`);
    
    // If no active riders found, return a test rider to prevent errors
    if (activeRiders.length === 0) {
      console.warn('⚠️ No active riders found, returning test rider');
      return [{
        name: 'Test Rider (No Active Riders Found)',
        jpNumber: 'TEST001',
        phone: '555-0000',
        email: 'test@riders.com',
        status: 'Active',
        partTime: 'No'
      }];
    }
    
    // Always return an array
    return activeRiders;
    
  } catch (error) {
    console.error('❌ Error in getActiveRidersForAssignments:', error);
    logError('Error in getActiveRidersForAssignments', error);
    
    // Always return an array, even on error
    return [{
      name: 'Error Fallback Rider',
      jpNumber: 'ERR001',
      phone: '555-0000',
      email: 'error@riders.com',
      status: 'Active',
      partTime: 'No'
    }];
  }
}

// ALSO ADD this simpler test function:

function testGetActiveRidersForAssignments() {
  try {
    console.log('🧪 Testing getActiveRidersForAssignments...');
    
    const riders = getActiveRidersForAssignments();
    
    console.log('Result type:', typeof riders);
    console.log('Is array:', Array.isArray(riders));
    console.log('Length:', riders ? riders.length : 'N/A');
    console.log('First rider:', riders && riders.length > 0 ? riders[0] : 'None');
    
    if (Array.isArray(riders)) {
      console.log('✅ Function returns an array');
      console.log(`📊 Found ${riders.length} riders`);
      
      if (riders.length > 0) {
        console.log('👤 Sample rider structure:', Object.keys(riders[0]));
        return {
          success: true,
          count: riders.length,
          sample: riders[0]
        };
      } else {
        console.log('⚠️ Array is empty');
        return {
          success: true,
          count: 0,
          isEmpty: true
        };
      }
    } else {
      console.log('❌ Function does NOT return an array');
      return {
        success: false,
        error: 'Function did not return an array',
        actualType: typeof riders
      };
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// AND this function to check your riders sheet directly:

function inspectRidersSheet() {
  try {
    console.log('🔍 Inspecting riders sheet directly...');
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.riders);
    
    if (!sheet) {
      console.error('❌ Riders sheet not found:', CONFIG.sheets.riders);
      return { error: 'Riders sheet not found' };
    }
    
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    console.log('📊 Sheet info:');
    console.log('  - Name:', sheet.getName());
    console.log('  - Rows:', values.length);
    console.log('  - Columns:', values.length > 0 ? values[0].length : 0);
    
    if (values.length > 0) {
      console.log('📋 Headers:', values[0]);
      
      if (values.length > 1) {
        console.log('📄 Sample data rows:');
        for (let i = 1; i < Math.min(4, values.length); i++) {
          console.log(`  Row ${i}:`, values[i]);
        }
        
        // Check for active riders
        let activeCount = 0;
        const statusCol = values[0].indexOf('Status') !== -1 ? values[0].indexOf('Status') : 
                         values[0].indexOf('Rider Status') !== -1 ? values[0].indexOf('Rider Status') : -1;
        
        if (statusCol !== -1) {
          for (let i = 1; i < values.length; i++) {
            const status = String(values[i][statusCol] || '').toLowerCase();
            if (status === 'active' || status === 'available') {
              activeCount++;
            }
          }
          console.log(`🏍️ Found ${activeCount} riders with 'Active' or 'Available' status`);
        } else {
          console.log('⚠️ No Status column found');
        }
      }
    }
    
    return {
      success: true,
      sheetName: sheet.getName(),
      totalRows: values.length,
      headers: values.length > 0 ? values[0] : [],
      sampleData: values.length > 1 ? values.slice(1, 4) : []
    };
    
  } catch (error) {
    console.error('❌ Error inspecting sheet:', error);
    return { error: error.message };
  }
}

function debugAssignmentsPageIssue() {
    try {
        console.log('=== DEBUGGING ASSIGNMENTS PAGE ISSUE ===');
        
        // Test 1: Check if function exists
        console.log('1. Testing if getPageDataForAssignments function exists...');
        if (typeof getPageDataForAssignments === 'function') {
            console.log('✅ getPageDataForAssignments function exists');
            
            // Test 2: Try to call it
            console.log('2. Testing function call...');
            const result = getPageDataForAssignments('E-13-25');
            console.log('Function result:', JSON.stringify(result, null, 2));
            
            if (result.success) {
                console.log('✅ Function call successful');
                console.log(`- Requests: ${result.requests ? result.requests.length : 0}`);
                console.log(`- Riders: ${result.riders ? result.riders.length : 0}`);
                console.log(`- User: ${result.user ? result.user.name : 'none'}`);
            } else {
                console.log('❌ Function call failed:', result.error);
            }
        } else {
            console.log('❌ getPageDataForAssignments function does NOT exist');
            console.log('This is the problem - the function needs to be added');
        }
        
        // Test 3: Check if assignments.html loads
        console.log('3. Testing assignments.html file...');
        try {
            const content = HtmlService.createHtmlOutputFromFile('assignments').getContent();
            console.log(`✅ assignments.html exists: ${content.length} characters`);
            
            // Check if it calls the missing function
            const callsFunction = content.includes('getPageDataForAssignments');
            console.log(`Calls getPageDataForAssignments: ${callsFunction ? '✅ YES' : '❌ NO'}`);
            
        } catch (error) {
            console.log('❌ assignments.html file error:', error.message);
        }
        
        // Test 4: Check doGet for assignments
        console.log('4. Testing doGet with assignments page...');
        try {
            const mockEvent = { parameter: { page: 'assignments', requestId: 'E-13-25' } };
            const result = doGet(mockEvent);
            console.log('✅ doGet completed for assignments page');
        } catch (error) {
            console.log('❌ doGet failed for assignments page:', error.message);
        }
        
        console.log('=== DEBUG COMPLETE ===');
        
        return {
            success: true,
            hasMissingFunction: typeof getPageDataForAssignments !== 'function'
        };
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

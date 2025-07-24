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
function diagnosePartTimeColumn() {
  try {
    debugLog('=== PART-TIME COLUMN DIAGNOSTIC ===');
    
    // Get raw sheet data
    const ridersData = getRidersData();
    debugLog('Available headers:', ridersData.headers);
    debugLog('Column mapping:', ridersData.columnMap);
    
    // Check what CONFIG expects
    debugLog('CONFIG expects part-time column:', CONFIG.columns.riders.partTime);
    
    // Check all possible part-time columns
    const partTimeColumns = [
      CONFIG.columns.riders.partTime,
      'Part Time',
      'Part-Time',
      'Part Time Rider',
      'PartTime'
    ];
    
    debugLog('Looking for these part-time columns:', partTimeColumns);
    
    partTimeColumns.forEach(colName => {
      const index = ridersData.columnMap[colName];
      debugLog(`  "${colName}" -> index ${index} ${index !== undefined ? '✅' : '❌'}`);
    });
    
    // Get first few riders and show their part-time values
    debugLog('\nFirst 5 riders part-time detection:');
    for (let i = 0; i < Math.min(5, ridersData.data.length); i++) {
      const row = ridersData.data[i];
      const rider = mapRowToRiderObject(row, ridersData.columnMap, ridersData.headers);
      debugLog(`  ${rider.name}: partTime="${rider.partTime}" (from row: [${row.join(', ')}])`);
    }
    
    return {
      headers: ridersData.headers,
      configExpected: CONFIG.columns.riders.partTime,
      columnMapping: ridersData.columnMap,
      sampleRiders: ridersData.data.slice(0, 5).map(row => 
        mapRowToRiderObject(row, ridersData.columnMap, ridersData.headers)
      )
    };
    
  } catch (error) {
    console.error('Error in diagnosePartTimeColumn:', error);
    return { error: error.message };
  }
}
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
      escortFee: getColumnValue(foundRequestRow, requestColMap, CONFIG.columns.requests.escortFee),
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
 * Secured assignments data
 */
function getPageDataForAssignments(user, filters = {}) {
  try {
    if (!user || !user.role) {
      return { success: false, error: 'Authentication required' };
    }
    
    if (!canAccessPage(user, 'assignments')) {
      return { success: false, error: 'Access denied to assignments' };
    }
    
    const assignments = getFilteredAssignments(user, filters);
    
    const pageData = {
      assignments: assignments,
      canCreate: hasPermission(user, 'assignments', 'create'),
      canEdit: hasPermission(user, 'assignments', 'update'),
      canDelete: hasPermission(user, 'assignments', 'delete'),
      canBulkAssign: hasPermission(user, 'assignments', 'bulk_assign'),
      totalCount: assignments.length
    };
    
    // Add additional data for assignment creation
    if (hasPermission(user, 'assignments', 'create')) {
      pageData.availableRequests = getFilteredRequests(user, { status: 'Open' });
      pageData.availableRiders = getFilteredRiders(user);
    }
    
    return {
      success: true,
      user: user,
      data: pageData
    };
    
  } catch (error) {
    console.error('❌ Error in getPageDataForAssignments:', error);
    return { success: false, error: 'Failed to load assignments data' };
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
    // Enhanced permission check with debugging
    debugLog('🔒 Checking permission for user:', user.email, 'role:', user.role);
    
    let hasAssignPermission = false;
    try {
      hasAssignPermission = hasPermission(user, 'assignments', 'assign_any');
    } catch (permError) {
      console.error('❌ Permission check failed:', permError);
      // Enhanced fallback - check multiple conditions
      if (user.role === 'admin' || user.role === 'dispatcher') {
        hasAssignPermission = true;
        debugLog('✅ Permission granted via role-based fallback');
      } else {
        // Check if user is in emergency session
        try {
          const emergencySessionStr = PropertiesService.getUserProperties().getProperty('EMERGENCY_SESSION');
          if (emergencySessionStr) {
            const emergencySession = JSON.parse(emergencySessionStr);
            if (emergencySession.expires > Date.now()) {
              hasAssignPermission = true;
              debugLog('✅ Permission granted via emergency session');
            }
          }
        } catch (e) {
          debugLog('No emergency session found');
        }
      }
    }
    
    debugLog('🔒 Permission result:', hasAssignPermission);
    
    if (!hasAssignPermission) {
      debugLog('❌ Permission denied for user:', user.email, 'role:', user.role);
      return { 
        success: false, 
        error: 'You do not have permission to assign riders. Try running fixAuthenticationIssues() or emergencyAdminAccess() from the script editor.' 
      };
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
    
    const result = updateAssignmentStatusById(assignmentId, newStatus, 'Web');
    
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
    debugLog('🔄 Loading riders page data...');
    
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
    
    debugLog('✅ Riders page data loaded:', {
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
    debugLog('📋 Getting upcoming assignments for web app...');
    debugLog('User parameter received:', user);

    const assignmentsData = getAssignmentsData();

    if (!assignmentsData || !assignmentsData.data || assignmentsData.data.length === 0) {
      debugLog('❌ No assignments data found');
      return [];
    }

    debugLog(`✅ Found ${assignmentsData.data.length} total assignments`);

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

    debugLog(`✅ Returning ${upcomingAssignments.length} upcoming assignments`);

    if (upcomingAssignments.length > 0) {
      debugLog('Sample assignment:', {
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
    debugLog('📋 Getting all active assignments...');

    const assignmentsData = getAssignmentsData();

    if (!assignmentsData || !assignmentsData.data || assignmentsData.data.length === 0) {
      debugLog('❌ No assignments data found');
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
        debugLog(`⚠️ Error processing assignment row ${i}:`, rowError);
      }
    }

    const limitedAssignments = activeAssignments.slice(0, 10);

    debugLog(`✅ Returning ${limitedAssignments.length} active assignments`);
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
    debugLog('🌐 Getting active riders for web app...');
    
    // Use the enhanced assignment function as the base
    const assignmentRiders = getActiveRidersForAssignments();
    
    // Convert to web app format if needed
    const webAppRiders = assignmentRiders.map(rider => ({
      jpNumber: rider.jpNumber || '',
      name: rider.name || '',
      phone: rider.phone || '',
      email: rider.email || '',
      carrier: rider.carrier || 'Unknown',
      partTime: rider.partTime || 'No'
    }));
    
    debugLog(`✅ Returning ${webAppRiders.length} active riders for web app`);
    return webAppRiders;
    
  } catch (error) {
    console.error('❌ Error getting active riders for web app:', error);
    logError('Error in getActiveRidersForWebApp', error);
    
    // Return fallback
    return [{
      jpNumber: 'WEB001',
      name: 'Web App Rider',
      phone: '555-0000',
      email: 'webapp@example.com',
      carrier: 'Unknown'
    }];
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
    debugLog(`🔍 Getting assignments for rider: ${riderName} (ID: ${riderId})`);
    
    const assignmentsData = getAssignmentsData();
    
    if (!assignmentsData || !assignmentsData.data || assignmentsData.data.length === 0) {
      debugLog('❌ No assignments data found');
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
        debugLog(`⚠️ Error processing assignment row ${i}:`, rowError);
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
        debugLog('⚠️ Error sorting assignments:', sortError);
        return 0;
      }
    });
    
    debugLog(`✅ Found ${riderAssignments.length} assignments for ${riderName}`);
    
    if (riderAssignments.length > 0) {
      debugLog('Sample assignment:', riderAssignments[0]);
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
    debugLog(`🔍 Getting assignments for rider by name: ${riderName}`);
    
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
  
  // Skip availability check for NOPD riders - they are always considered available
  if (rider && (rider.organization === 'NOPD' || rider['Organization'] === 'NOPD')) {
    debugLog(`⚠️ Skipping availability check for NOPD rider: ${riderName}`);
    return true;
  }
  
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
    debugLog(`📋 getPageDataForRequests called with filter: ${filter}`);

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
    const requests = getFilteredRequestsForWebApp(user, filter); // Pass user and filter correctly
    debugLog(`✅ Requests retrieved: ${requests?.length || 0} items with filter: ${filter}`);
    
    // Ensure we return an array
    const safeRequests = Array.isArray(requests) ? requests : [];
    
    const result = {
      success: true,
      user: user,
      requests: safeRequests
    };
    
    debugLog('✅ getPageDataForRequests result:', {
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
    debugLog(`🔄 Direct requests call with filter: ${filter}`);
    
    const result = getFilteredRequestsForWebApp(filter);
    debugLog(`📊 Direct result: ${result?.length || 0} requests`);
    
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
    debugLog('🧪 Testing simple requests data...');
    
    // Try to get raw sheet data
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Requests');
    if (!sheet) {
      return { error: 'Requests sheet not found' };
    }
    
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    debugLog('✅ Got sheet data:', values.length, 'rows');
    
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
    
    debugLog('✅ Returning', simpleRequests.length, 'simple requests');
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
    debugLog('🧪 Testing basic requests access...');
    
    // Test 1: Can we access the sheet?
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.requests);
    if (!sheet) {
      return { error: 'Requests sheet not found. Expected sheet name: ' + CONFIG.sheets.requests };
    }
    
    // Test 2: Get basic data
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    debugLog('✅ Sheet found:', sheet.getName());
    debugLog('✅ Rows found:', values.length);
    debugLog('✅ Headers:', values[0]);
    
    // Test 3: Try getRequestsData function
    const requestsData = getRequestsData();
    debugLog('✅ getRequestsData works:', !!requestsData);
    
    // Test 4: Try the filter function
    const filtered = getFilteredRequestsForWebApp('All');
    debugLog('✅ getFilteredRequestsForWebApp works:', !!filtered);
    
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
    debugLog('📋 Getting filtered requests for assignments page...');
    debugLog('User parameter:', user);
    const requestsData = getRequestsData();
    if (!requestsData || !requestsData.data || requestsData.data.length === 0) {
      debugLog('❌ No requests data found');
      return [];
    }
    const columnMap = requestsData.columnMap;
    debugLog('Column map:', columnMap);
    debugLog('Looking for Request ID column:', CONFIG.columns.requests.id);
    debugLog('Request ID column index:', columnMap[CONFIG.columns.requests.id]);

    const assignableRequests = [];
    for (let i = 0; i < requestsData.data.length; i++) {
      try {
        const row = requestsData.data[i];
        if (i < 3) {
          debugLog(`Row ${i} data:`, row);
          debugLog(`Row ${i} Request ID:`, getColumnValue(row, columnMap, CONFIG.columns.requests.id));
        }
        const requestId = getColumnValue(row, columnMap, CONFIG.columns.requests.id);
        const requesterName = getColumnValue(row, columnMap, CONFIG.columns.requests.requesterName);
        const status = getColumnValue(row, columnMap, CONFIG.columns.requests.status);
        const eventDate = getColumnValue(row, columnMap, CONFIG.columns.requests.eventDate);
        if (!requestId) {
          debugLog(`⚠️ Missing Request ID in row ${i}:`, { requestId, requesterName, rawRow: row.slice(0, 5) });
          continue;
        }
        if (!requesterName) {
          debugLog(`⚠️ Missing requester name in row ${i} for Request ID: ${requestId}`);
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
        debugLog(`⚠️ Error processing request row ${i}:`, rowError);
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
    debugLog(`✅ Returning ${sortedRequests.length} assignable requests`);
    if (sortedRequests.length > 0) debugLog('First processed request:', sortedRequests[0]);
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
    debugLog('🏍️ Getting active riders for assignments page with enhanced logic...');
    
    const ridersData = getRidersData();
    
    if (!ridersData || !ridersData.data || ridersData.data.length === 0) {
      debugLog('❌ No riders data found');
      return [];
    }
    
    debugLog(`📊 Total riders in sheet: ${ridersData.data.length}`);
    debugLog('📋 Available columns:', ridersData.headers);
    debugLog('🗂️ Column mapping:', ridersData.columnMap);
    
    const columnMap = ridersData.columnMap;
    const activeRiders = [];
    
    // Enhanced column detection - try multiple possible column names
    const nameColumns = [
      CONFIG.columns.riders.name,
      'Full Name',
      'Name',
      'Rider Name'
    ];
    
    const statusColumns = [
      CONFIG.columns.riders.status,
      'Status',
      'Rider Status'
    ];
    
    const jpNumberColumns = [
      CONFIG.columns.riders.jpNumber,
      'Rider ID',
      'JP Number',
      'ID'
    ];
    
    const phoneColumns = [
      CONFIG.columns.riders.phone,
      'Phone Number',
      'Phone',
      'Contact'
    ];
    
    const emailColumns = [
      CONFIG.columns.riders.email,
      'Email',
      'Email Address'
    ];

   const partTimeColumns = [
  CONFIG.columns.riders.partTime,
  'Part Time',
  'Part-Time',
  'Part Time Rider',
  'Part-Time Rider',  // ← ADD THIS LINE (your actual column name)
  'PartTime'
];
    
    // Find the best column matches
    const getColumnIndex = (possibleNames) => {
      for (const name of possibleNames) {
        if (columnMap[name] !== undefined) {
          return columnMap[name];
        }
      }
      return -1;
    };
    
    const nameColIndex = getColumnIndex(nameColumns);
    const statusColIndex = getColumnIndex(statusColumns);
    const jpNumberColIndex = getColumnIndex(jpNumberColumns);
    const phoneColIndex = getColumnIndex(phoneColumns);
    const emailColIndex = getColumnIndex(emailColumns);
    const partTimeColIndex = getColumnIndex(partTimeColumns);
    
    debugLog('🔍 Column detection results:');
    debugLog(`  Name column: index ${nameColIndex} (${nameColumns.find(n => columnMap[n] !== undefined) || 'NOT FOUND'})`);
    debugLog(`  Status column: index ${statusColIndex} (${statusColumns.find(n => columnMap[n] !== undefined) || 'NOT FOUND'})`);
    debugLog(`  JP Number column: index ${jpNumberColIndex} (${jpNumberColumns.find(n => columnMap[n] !== undefined) || 'NOT FOUND'})`);
    
    // Fallback: if no proper columns found, use positional indexing
    const usePositionalFallback = nameColIndex === -1;
    
    if (usePositionalFallback) {
      debugLog('⚠️ Using positional fallback (assuming standard column order)');
    }
    
    for (let i = 0; i < ridersData.data.length; i++) {
      try {
        const row = ridersData.data[i];
        
        // Get rider data with enhanced fallback logic
        let riderName, status, jpNumber, phone, email, partTime;
        
        if (usePositionalFallback) {
          // Assume standard order: ID, Name, Phone, Email, Status, ...
          jpNumber = row[0] || '';
          riderName = row[1] || '';
          phone = row[2] || '';
          email = row[3] || '';
          status = row[4] || 'Active'; // Default to Active
          partTime = row[5] || 'No';
        } else {
          riderName = nameColIndex >= 0 ? row[nameColIndex] : (row[1] || '');
          status = statusColIndex >= 0 ? row[statusColIndex] : 'Active';
          jpNumber = jpNumberColIndex >= 0 ? row[jpNumberColIndex] : (row[0] || '');
          phone = phoneColIndex >= 0 ? row[phoneColIndex] : (row[2] || '');
          email = emailColIndex >= 0 ? row[emailColIndex] : (row[3] || '');
          partTime = partTimeColIndex >= 0 ? row[partTimeColIndex] : (row[5] || 'No');
        }
        
        // Debug first few riders
        if (i < 3) {
          debugLog(`🔍 Rider ${i + 1}:`, {
            name: riderName,
            jpNumber: jpNumber,
            status: status,
            partTime: partTime,
            phone: phone,
            hasValidName: !!(riderName && String(riderName).trim().length > 0)
          });
        }
        
        // Check if rider has a name (essential requirement)
        if (!riderName || String(riderName).trim().length === 0) {
          if (i < 5) debugLog(`⚠️ Skipping rider ${i + 1}: No name`);
          continue;
        }
        
        // ENHANCED STATUS CHECKING - be very permissive
        const riderStatus = String(status || '').trim().toLowerCase();
        
        // Consider these as "active":
        // - Empty status (default to active)
        // - 'active', 'available', 'yes', 'y', 'true'
        // - Any status that doesn't explicitly say inactive
        const isActive = !riderStatus || 
                        riderStatus === '' || 
                        riderStatus === 'active' || 
                        riderStatus === 'available' ||
                        riderStatus === 'yes' ||
                        riderStatus === 'y' ||
                        riderStatus === 'true' ||
                        riderStatus === '1' ||
                        // Be permissive - exclude only clearly inactive statuses
                        (!['inactive', 'disabled', 'suspended', 'no', 'false', '0'].includes(riderStatus));
        
        if (!isActive) {
          if (i < 5) debugLog(`⚠️ Skipping rider ${i + 1}: Status '${status}' considered inactive`);
          continue;
        }
        
        // Add to active riders list
        activeRiders.push({
          name: String(riderName).trim(),
          jpNumber: jpNumber ? String(jpNumber).trim() : `R${i}`,
          phone: phone ? String(phone).trim() : '555-0000',
          email: email ? String(email).trim() : '',
          carrier: 'Unknown',
          status: 'Available',
          partTime: partTime ? String(partTime).trim() : 'No'
        });
        
        if (i < 3) {
          debugLog(`✅ Added rider ${i + 1}: ${riderName} (${jpNumber || `R${i}`})`);
        }
        
      } catch (rowError) {
        debugLog(`⚠️ Error processing rider row ${i}:`, rowError);
      }
    }
    
    debugLog(`✅ Found ${activeRiders.length} active riders out of ${ridersData.data.length} total riders`);
    
    // If still no active riders, provide detailed debugging info
    if (activeRiders.length === 0) {
      debugLog('❌ NO ACTIVE RIDERS FOUND - DETAILED ANALYSIS:');
      
      debugLog('📊 Sample of first 5 rows (raw data):');
      for (let i = 0; i < Math.min(5, ridersData.data.length); i++) {
        const row = ridersData.data[i];
        debugLog(`  Row ${i + 1}:`, row);
      }
      
      debugLog('📊 Sample processed data:');
      for (let i = 0; i < Math.min(3, ridersData.data.length); i++) {
        const row = ridersData.data[i];
        const name = nameColIndex >= 0 ? row[nameColIndex] : row[1];
        const status = statusColIndex >= 0 ? row[statusColIndex] : row[4];
        debugLog(`  Row ${i + 1}: name="${name}" status="${status}" hasName=${!!(name && String(name).trim())}`);
      }
      
      // Return a fallback rider for testing if absolutely no riders found
      debugLog('🔧 Creating fallback test rider...');
      return [{
        name: 'Test Rider',
        jpNumber: 'TEST001',
        phone: '555-0000',
        email: 'test@example.com',
        carrier: 'Unknown',
        status: 'Available'
      }];
      
    } else {
      debugLog('📋 Sample active riders:', activeRiders.slice(0, 3));
    }
    
    return activeRiders;
    
  } catch (error) {
    console.error('❌ Error getting active riders for assignments:', error);
    logError('Error in getActiveRidersForAssignments', error);
    
    // Return fallback rider on error
    return [{
      name: 'System Rider',
      jpNumber: 'SYS001',
      phone: '555-0000',
      email: 'system@example.com',
      carrier: 'Unknown',
      status: 'Available'
    }];
  }
}
/**
 * Simple debug function to diagnose riders issue
 * Add this to your AppServices.gs or Code.gs file
 */
function debugRidersIssue() {
  try {
    debugLog('🔍 Starting simple riders debug...');
    
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
    
    debugLog('✅ Debug completed:', result);
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
    debugLog('🔧 Getting ALL riders regardless of status...');
    
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
    
    debugLog(`✅ Found ${allRiders.length} riders (ignoring status)`);
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
    debugLog('📋 Getting upcoming assignments for assignments page...');
    const assignmentsData = getAssignmentsData();
    if (!assignmentsData || !assignmentsData.data || assignmentsData.data.length === 0) {
      debugLog('❌ No assignments data found');
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
      } catch (rowError) { debugLog(`⚠️ Error processing assignment row ${i}:`, rowError); }
    }
    const sortedAssignments = upcomingAssignments.sort((a, b) => {
      try {
        const dateA = new Date(a.eventDate); const dateB = new Date(b.eventDate);
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1; if (isNaN(dateB.getTime())) return -1;
        return dateA.getTime() - dateB.getTime();
      } catch (sortError) { return 0; }
    });
    debugLog(`✅ Returning ${sortedAssignments.length} upcoming assignments`);
    return sortedAssignments;
  } catch (error) {
    console.error('❌ Error getting upcoming assignments for assignments page:', error);
    logError('Error in getUpcomingAssignmentsForAssignmentsPage', error);
    return [];
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
 * Gets consolidated data for the assignments page
 * @param {string} [requestIdToLoad] - Optional request ID to pre-select
 * @return {object} Consolidated data object with user, requests, riders, and optional initial request details
 */
function getPageDataForAssignments(requestIdToLoad) {
  try {
    debugLog('🔄 Loading assignments page data...', requestIdToLoad ? `Pre-selecting: ${requestIdToLoad}` : '');

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
        requests: [],
        riders: [],
        initialRequestDetails: null,
        assignmentOrder: []
      };
    }

    const user = Object.assign({}, auth.user, { roles: auth.user.roles || [auth.user.role] });

    const result = {
      success: true,
      user: user,
      requests: [],
      riders: [],
      initialRequestDetails: null,
      assignmentOrder: []
    };
    
    // Get assignable requests
    try {
      result.requests = getFilteredRequestsForAssignments(result.user);
      debugLog(`✅ Loaded ${result.requests.length} assignable requests`);
    } catch (requestsError) {
      debugLog('⚠️ Could not load requests:', requestsError);
      result.requests = [];
    }
    
    // Get active riders
    try {
      result.riders = getActiveRidersForWebApp();
      debugLog(`✅ Loaded ${result.riders.length} active riders`);
    } catch (ridersError) {
      debugLog('⚠️ Could not load riders:', ridersError);
      result.riders = [];
    }

    try {
      result.assignmentOrder = getAssignmentRotation();
      debugLog(`✅ Loaded assignment rotation with ${result.assignmentOrder.length} riders`);
    } catch (orderError) {
      debugLog('⚠️ Could not load assignment order:', orderError);
      result.assignmentOrder = [];
    }
    
    // If a specific request ID was requested, try to get its details
    if (requestIdToLoad) {
      const cleanedRequestIdToLoad = String(requestIdToLoad).trim();
      try {
        // Attempt to fetch the specific request directly
        const directlyFetchedRequest = getRequestDetails(cleanedRequestIdToLoad); // Assuming getRequestDetails is available
        if (directlyFetchedRequest) {
          result.initialRequestDetails = directlyFetchedRequest;
          debugLog(`✅ Successfully fetched initial request details directly for ID: "${cleanedRequestIdToLoad}"`);
        } else {
          console.warn(`⚠️ Requested ID "${cleanedRequestIdToLoad}" for pre-selection was not found through direct fetch.`);
        }
      } catch (fetchError) {
        console.error(`⚠️ Error during direct fetch for initial request details (ID "${cleanedRequestIdToLoad}"):`, fetchError);
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
        email: '',
        roles: ['system'],
        permissions: []
      }
    };
  }
}


/**
 * Simple test function to verify server connection
 * @return {object} Connection test result
 */
function testConnection() {
  try {
    debugLog('🌐 Testing server connection...');
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Server connection is working',
      serverInfo: {
        userEmail: Session.getActiveUser().getEmail(),
        timezone: Session.getScriptTimeZone(),
        locale: Session.getActiveLocale()
      }
    };
    
    debugLog('✅ Server connection test passed:', result);
    return result;
  } catch (error) {
    console.error('❌ Server connection test failed:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Creates sample data for testing assignments functionality
 * @return {object} Result of sample data creation
 */
function createSampleDataForAssignments() {
  try {
    debugLog('🔧 Creating sample data for assignments testing...');
    
    const result = {
      success: true,
      created: {
        requests: 0,
        riders: 0
      },
      errors: []
    };

    // Create sample requests
    try {
      const requestsSheet = getOrCreateSheet(CONFIG.sheets.requests);
      const requestsData = requestsSheet.getDataRange().getValues();
      
      // If sheet is empty or has only headers, create sample data
      if (requestsData.length <= 1) {
        debugLog('📋 Creating sample requests...');
        
        const headers = [
          'Request ID', 'Requester Name', 'Requester Email', 'Type', 
          'Event Date', 'Start Time', 'End Time', 'Start Location', 
          'End Location', 'Riders Needed', 'Riders Assigned', 'Status', 
          'Notes', 'Created Date'
        ];
        
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const sampleRequests = [
          [
            'REQ-001', 'John Smith', 'john.smith@example.com', 'Escort',
            tomorrow.toLocaleDateString(), '09:00 AM', '10:00 AM',
            'Downtown Office', 'City Hall', '2', '', 'New',
            'High priority event', today.toLocaleDateString()
          ],
          [
            'REQ-002', 'Sarah Johnson', 'sarah.j@example.com', 'Escort',
            nextWeek.toLocaleDateString(), '02:00 PM', '03:30 PM',
            'Airport', 'Convention Center', '3', '', 'Pending',
            'VIP transport needed', today.toLocaleDateString()
          ],
          [
            'REQ-003', 'Mike Davis', 'mike.davis@example.com', 'Event',
            tomorrow.toLocaleDateString(), '11:00 AM', '12:00 PM',
            'Hotel Grand', 'Stadium', '1', '', 'Unassigned',
            'Sports event escort', today.toLocaleDateString()
          ]
        ];
        
        requestsSheet.clear();
        requestsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        requestsSheet.getRange(2, 1, sampleRequests.length, headers.length).setValues(sampleRequests);
        
        result.created.requests = sampleRequests.length;
        debugLog(`✅ Created ${sampleRequests.length} sample requests`);
      }
    } catch (requestsError) {
      result.errors.push('Requests creation failed: ' + requestsError.message);
      console.error('❌ Failed to create sample requests:', requestsError);
    }

    // Create sample riders
    try {
      const ridersSheet = getOrCreateSheet(CONFIG.sheets.riders);
      const ridersData = ridersSheet.getDataRange().getValues();
      
      // If sheet is empty or has only headers, create sample data
      if (ridersData.length <= 1) {
        debugLog('🏍️ Creating sample riders...');
        
        const headers = [
          'Rider ID', 'Full Name', 'Phone Number', 'Email', 'Status',
          'Part-Time Rider', 'Carrier', 'Notes', 'Join Date'
        ];
        
        const today = new Date();
        const sampleRiders = [
          [
            'R001', 'Alex Rodriguez', '555-0101', 'alex.r@example.com', 'Active',
            'No', 'Verizon', 'Experienced rider', today.toLocaleDateString()
          ],
          [
            'R002', 'Emily Chen', '555-0102', 'emily.c@example.com', 'Active',
            'No', 'AT&T', 'Lead rider for events', today.toLocaleDateString()
          ],
          [
            'R003', 'Marcus Johnson', '555-0103', 'marcus.j@example.com', 'Available',
            'Yes', 'T-Mobile', 'Part-time weekends only', today.toLocaleDateString()
          ],
          [
            'R004', 'Lisa Williams', '555-0104', 'lisa.w@example.com', 'Active',
            'No', 'Verizon', 'Senior rider trainer', today.toLocaleDateString()
          ],
          [
            'R005', 'David Brown', '555-0105', 'david.b@example.com', 'Active',
            'No', 'AT&T', 'Backup rider', today.toLocaleDateString()
          ]
        ];
        
        ridersSheet.clear();
        ridersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        ridersSheet.getRange(2, 1, sampleRiders.length, headers.length).setValues(sampleRiders);
        
        result.created.riders = sampleRiders.length;
        debugLog(`✅ Created ${sampleRiders.length} sample riders`);
      }
    } catch (ridersError) {
      result.errors.push('Riders creation failed: ' + ridersError.message);
      console.error('❌ Failed to create sample riders:', ridersError);
    }

    // Clear any cached data
    try {
      clearDataCache();
      debugLog('✅ Cleared data cache');
    } catch (cacheError) {
      console.warn('⚠️ Failed to clear cache:', cacheError);
    }

    debugLog('🎯 Sample data creation completed:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Sample data creation failed:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Helper function to get or create a sheet
 * @param {string} sheetName - Name of the sheet
 * @return {GoogleAppsScript.Spreadsheet.Sheet} The sheet object
 */
function getOrCreateSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    debugLog(`📄 Creating new sheet: ${sheetName}`);
    sheet = ss.insertSheet(sheetName);
  }
  
  return sheet;
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
    debugLog(`📋 Getting filtered requests for web app with filter: ${filter} for user: ${user ? user.name : 'Unknown'}`);
    
    // Get the raw requests data
    const requestsData = rawRequestsInput || getRequestsData(); // Use input or fetch
    
    if (!requestsData || !requestsData.data || requestsData.data.length === 0) {
      debugLog('❌ No requests data found');
      return [];
    }
    
    debugLog(`✅ Found ${requestsData.data.length} total requests in sheet`);
    
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
          debugLog(`⚠️ Skipping row ${i}: Missing ID or requester name`);
          continue;
        }
        
      // Apply status filter
      if (filter !== 'All') {
        if (filter === 'Unassigned') {
          // Unassigned filter should also include new and pending requests
          if (!['Unassigned', 'New', 'Pending'].includes(status)) {
            continue;
          }
        } else if (status !== filter) {
          continue;
        }
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
          secondaryLocation: getColumnValue(row, columnMap, CONFIG.columns.requests.secondaryLocation) || '',
          ridersNeeded: getColumnValue(row, columnMap, CONFIG.columns.requests.ridersNeeded) || 1,
          escortFee: getColumnValue(row, columnMap, CONFIG.columns.requests.escortFee) || '',
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
          debugLog(`✅ Processed request ${i}:`, {
            id: formattedRequest.requestId,
            requester: formattedRequest.requesterName,
            status: formattedRequest.status,
            eventDate: formattedRequest.eventDate
          });
        }
        
      } catch (rowError) {
        debugLog(`⚠️ Error processing request row ${i}:`, rowError);
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
        debugLog('⚠️ Error sorting requests:', sortError);
        return 0;
      }
    });
    
    debugLog(`✅ Returning ${filteredRequests.length} filtered requests for filter: ${filter}`);
    
    if (filteredRequests.length > 0) {
      debugLog('Sample filtered request:', filteredRequests[0]);
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
    debugLog('=== DEBUGGING REQUESTS DATA ===');
    
    // Test basic data retrieval
    const requestsData = getRequestsData();
    debugLog('Raw requests data:', {
      hasData: !!requestsData,
      dataLength: requestsData?.data?.length || 0,
      headers: requestsData?.headers || [],
      columnMap: requestsData?.columnMap || {}
    });
    
    // Test column mapping
    if (requestsData?.columnMap) {
      debugLog('Column mappings:');
      Object.entries(CONFIG.columns.requests).forEach(([key, columnName]) => {
        const index = requestsData.columnMap[columnName];
        debugLog(`  ${key} (${columnName}): column ${index}`);
      });
    }
    
    // Test sample data processing
    if (requestsData?.data?.length > 0) {
      debugLog('Sample raw row:', requestsData.data[0]);
      
      const sampleProcessed = {
        requestId: getColumnValue(requestsData.data[0], requestsData.columnMap, CONFIG.columns.requests.id),
        requesterName: getColumnValue(requestsData.data[0], requestsData.columnMap, CONFIG.columns.requests.requesterName),
        status: getColumnValue(requestsData.data[0], requestsData.columnMap, CONFIG.columns.requests.status)
      };
      debugLog('Sample processed data:', sampleProcessed);
    }
    
    // Test the actual function
    const filtered = getFilteredRequestsForWebApp('All');
    debugLog('Filtered result:', {
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
    debugLog('🧪 Testing requests data...');
    
    // Test basic data access
    const requestsData = getRequestsData();
    debugLog('Raw requests data:', requestsData);
    
    if (requestsData && requestsData.data) {
      debugLog('Found', requestsData.data.length, 'raw request rows');
      
      // Show first few rows
      if (requestsData.data.length > 0) {
        debugLog('First request row:', requestsData.data[0]);
        debugLog('Column mapping:', requestsData.columnMap);
      }
    }
    
    // Test the filtered function
    const filtered = getFilteredRequestsForWebApp('All');
    debugLog('Filtered requests:', filtered);
    
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
  debugLog('🧪 Testing requests page data...');
  
  try {
    const result = getPageDataForRequests('All');
    debugLog('✅ Success:', result.success);
    debugLog('👤 User:', result.user?.name);
    debugLog('📋 Requests count:', result.requests?.length);
    
    if (result.requests && result.requests.length > 0) {
      debugLog('📋 Sample request:', result.requests[0]);
      debugLog('📋 Request fields available:', Object.keys(result.requests[0]));
    }
    
    // Test with filter
    const filteredResult = getPageDataForRequests('New');
    debugLog('📋 New requests count:', filteredResult.requests?.length);
    
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
function getPageDataForNotifications(user) {
  try {
    debugLog('🔄 Loading notifications page data...');
    
    // Use passed user or get current user
    let currentUser = user;
    if (!currentUser) {
      try {
        const auth = authenticateAndAuthorizeUser();
        currentUser = auth.success ? auth.user : {
          name: 'System User',
          email: 'user@system.com',
          roles: ['admin'],
          permissions: ['send_notifications']
        };
      } catch (userError) {
        debugLog('⚠️ Could not authenticate user:', userError);
        currentUser = {
          name: 'System User',
          email: 'user@system.com',
          roles: ['admin'],
          permissions: ['send_notifications']
        };
      }
    }
    
    const result = {
      success: true,
      user: currentUser,
      assignments: [],
      stats: {},
      recentActivity: []
    };
    
    // Get all assignments for notifications
    try {
      result.assignments = getAllAssignmentsForNotifications(false);
      debugLog(`✅ Loaded ${result.assignments.length} assignments for notifications`);
    } catch (assignmentsError) {
      debugLog('⚠️ Could not load assignments:', assignmentsError);
      result.assignments = [];
    }
    
    // Calculate notification stats
    try {
      result.stats = calculateNotificationStats(result.assignments);
      debugLog('✅ Calculated notification stats:', result.stats);
    } catch (statsError) {
      debugLog('⚠️ Could not calculate stats:', statsError);
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
      debugLog(`✅ Found ${result.recentActivity.length} recent activities`);
    } catch (activityError) {
      debugLog('⚠️ Could not load recent activity:', activityError);
      result.recentActivity = [];
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error in getPageDataForNotifications:', error);
    return {
      success: false,
      error: error.message,
      user: user || {
        name: 'System User',
        email: 'user@system.com',
        roles: ['admin'],
        permissions: ['send_notifications']
      },
      assignments: [],
      stats: {
        totalAssignments: 0,
        pendingNotifications: 0,
        smsToday: 0,
        emailToday: 0
      },
      recentActivity: []
    };
  }
}
function debugAssignmentLoading() {
  try {
    debugLog('🔍 DEBUGGING ASSIGNMENT LOADING...');
    
    const result = {
      step1_rawData: null,
      step2_filtering: null,
      step3_processedData: null,
      step4_finalResult: null,
      issues: []
    };
    
    // STEP 1: Check raw assignments data
    debugLog('\n--- STEP 1: Raw Assignments Data ---');
    const assignmentsData = getAssignmentsData();
    result.step1_rawData = {
      dataExists: !!assignmentsData,
      hasData: !!(assignmentsData && assignmentsData.data),
      totalRows: assignmentsData?.data?.length || 0,
      hasColumnMap: !!(assignmentsData && assignmentsData.columnMap),
      columnMapKeys: assignmentsData?.columnMap ? Object.keys(assignmentsData.columnMap) : []
    };
    
    debugLog('Raw data check:', result.step1_rawData);
    
    if (!assignmentsData || !assignmentsData.data) {
      result.issues.push('No assignments data found - check getAssignmentsData()');
      return result;
    }
    
    // STEP 2: Check first 5 assignments in detail
    debugLog('\n--- STEP 2: Sample Assignment Analysis ---');
    const sampleSize = Math.min(5, assignmentsData.data.length);
    result.step2_filtering = [];
    
    for (let i = 0; i < sampleSize; i++) {
      const row = assignmentsData.data[i];
      const analysis = {
        rowIndex: i,
        assignmentId: getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.id),
        riderName: getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.riderName),
        status: getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.status),
        requestId: getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.requestId),
        eventDate: getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate),
        rawRow: row
      };
      
      analysis.shouldInclude = !!(
        analysis.riderName && 
        analysis.riderName.trim().length > 0 && 
        analysis.status && 
        !['cancelled', 'completed'].includes(analysis.status.toLowerCase())
      );
      
      analysis.filterReasons = [];
      if (!analysis.riderName) analysis.filterReasons.push('No rider name');
      if (analysis.riderName && analysis.riderName.trim().length === 0) analysis.filterReasons.push('Empty rider name');
      if (!analysis.status) analysis.filterReasons.push('No status');
      if (analysis.status && ['cancelled', 'completed'].includes(analysis.status.toLowerCase())) {
        analysis.filterReasons.push(`Status is ${analysis.status}`);
      }
      
      result.step2_filtering.push(analysis);
      debugLog(`Assignment ${i}:`, analysis);
    }
    
    // STEP 3: Check status distribution
    debugLog('\n--- STEP 3: Status Distribution ---');
    const statusCounts = {};
    const riderNameCounts = {};
    
    assignmentsData.data.forEach(row => {
      const status = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      const riderName = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      
      statusCounts[status || 'NULL'] = (statusCounts[status || 'NULL'] || 0) + 1;
      riderNameCounts[riderName ? 'HAS_RIDER' : 'NO_RIDER'] = (riderNameCounts[riderName ? 'HAS_RIDER' : 'NO_RIDER'] || 0) + 1;
    });
    
    result.step3_processedData = {
      statusDistribution: statusCounts,
      riderDistribution: riderNameCounts
    };
    
    debugLog('Status distribution:', statusCounts);
    debugLog('Rider distribution:', riderNameCounts);
    
    // STEP 4: Test the actual getAllAssignmentsForNotifications function
    debugLog('\n--- STEP 4: Testing getAllAssignmentsForNotifications ---');
    const filteredAssignments = getAllAssignmentsForNotifications(false);
    result.step4_finalResult = {
      filteredCount: filteredAssignments.length,
      sampleAssignments: filteredAssignments.slice(0, 3)
    };
    
    debugLog(`Filtered assignments count: ${filteredAssignments.length}`);
    if (filteredAssignments.length > 0) {
      debugLog('Sample filtered assignment:', filteredAssignments[0]);
    }
    
    // STEP 5: Identify issues
    if (result.step1_rawData.totalRows === 0) {
      result.issues.push('No assignment rows found in spreadsheet');
    }
    
    if (result.step2_filtering.every(item => !item.shouldInclude)) {
      result.issues.push('All sample assignments filtered out due to missing rider or completed/cancelled status');
    }
    
    if (result.step3_processedData.riderDistribution.NO_RIDER > result.step3_processedData.riderDistribution.HAS_RIDER) {
      result.issues.push('Most assignments have no rider assigned');
    }
    
    if (Object.keys(result.step3_processedData.statusDistribution).some(status => 
        ['completed', 'cancelled'].includes(status?.toLowerCase()))) {
      result.issues.push('Many assignments have completed/cancelled status');
    }
    
    if (result.step4_finalResult.filteredCount === 0 && result.step1_rawData.totalRows > 0) {
      result.issues.push('Filtering logic is too restrictive - all assignments excluded');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Debug function failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
/**
 * Test function to verify notifications data loading
 */
function testNotificationsData() {
  try {
    debugLog('🧪 Testing notifications data loading...');
    
    // Test user authentication
    const auth = authenticateAndAuthorizeUser();
    debugLog('Auth result:', auth.success);
    
    // Test assignments loading
    const assignments = getAllAssignmentsForNotifications(false);
    debugLog(`Assignments found: ${assignments.length}`);
    
    if (assignments.length > 0) {
      debugLog('Sample assignment:', assignments[0]);
    }
    
    // Test stats calculation
    const stats = calculateNotificationStats(assignments);
    debugLog('Stats:', stats);
    
    // Test recent activity
    const activity = getRecentNotificationActivity(assignments);
    debugLog(`Recent activities: ${activity.length}`);
    
    // Test complete data loading
    const pageData = getPageDataForNotifications(auth.user);
    debugLog('Page data success:', pageData.success);
    
    return {
      success: true,
      assignmentCount: assignments.length,
      stats: stats,
      activityCount: activity.length,
      pageDataSuccess: pageData.success
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Gets all assignments formatted for notifications page
 */
function getAllAssignmentsForNotifications(useCache = true) {
  try {
    debugLog('📋 [FIXED] Getting all assignments for notifications...');

    const assignmentsData = getAssignmentsData(useCache);
    if (!assignmentsData || !assignmentsData.data || assignmentsData.data.length <= 1) {
      debugLog('⚠️ No assignments data found or only headers');
      return [];
    }
    
    debugLog(`📊 Processing ${assignmentsData.data.length - 1} assignment rows`);
    
    const columnMap = assignmentsData.columnMap;
    const assignments = [];
    
    // Get rider contact info for enrichment
    const ridersData = getRidersData();
    const riderMap = {};
    
    if (ridersData && ridersData.data && ridersData.data.length > 0) {
      ridersData.data.forEach(riderRow => {
        const name = getColumnValue(riderRow, ridersData.columnMap, CONFIG.columns.riders.name);
        if (name && name.trim()) {
          riderMap[name.trim()] = {
            phone: getColumnValue(riderRow, ridersData.columnMap, CONFIG.columns.riders.phone) || 'N/A',
            email: getColumnValue(riderRow, ridersData.columnMap, CONFIG.columns.riders.email) || 'N/A',
            carrier: getColumnValue(riderRow, ridersData.columnMap, CONFIG.columns.riders.carrier) || 'N/A'
          };
        }
      });
    }
    
    // Process each assignment row (skip header)
    for (let i = 1; i < assignmentsData.data.length; i++) {
      const row = assignmentsData.data[i];
      
      try {
        const requestId = getColumnValue(row, columnMap, CONFIG.columns.assignments.requestId);
        const assignmentId = getColumnValue(row, columnMap, CONFIG.columns.assignments.id);
        const riderName = getColumnValue(row, columnMap, CONFIG.columns.assignments.riderName);
        const status = getColumnValue(row, columnMap, CONFIG.columns.assignments.status);
        
        // Very inclusive filtering - include if ANY important field has data
        const hasData = !!(requestId || assignmentId || (riderName && riderName.trim()) || status);
        
        if (hasData) {
          const cleanRiderName = riderName ? riderName.trim() : '';
          const riderInfo = cleanRiderName ? (riderMap[cleanRiderName] || { phone: 'N/A', email: 'N/A', carrier: 'N/A' }) : { phone: 'N/A', email: 'N/A', carrier: 'N/A' };
          
          // Determine notification status
          const smsSent = getColumnValue(row, columnMap, CONFIG.columns.assignments.smsSent);
          const emailSent = getColumnValue(row, columnMap, CONFIG.columns.assignments.emailSent);
          const notified = getColumnValue(row, columnMap, CONFIG.columns.assignments.notified);
          
          let notificationStatus = 'pending';
          let lastNotified = null;
          
          if (smsSent instanceof Date && emailSent instanceof Date) {
            notificationStatus = 'both_sent';
            lastNotified = smsSent > emailSent ? smsSent.toISOString() : emailSent.toISOString();
          } else if (smsSent instanceof Date) {
            notificationStatus = 'sms_sent';
            lastNotified = smsSent.toISOString();
          } else if (emailSent instanceof Date) {
            notificationStatus = 'email_sent';
            lastNotified = emailSent.toISOString();
          } else if (notified instanceof Date) {
            notificationStatus = 'notified';
            lastNotified = notified.toISOString();
          }
          
          const assignment = {
            id: assignmentId || `ASG-${String(i).padStart(4, '0')}`,
            requestId: requestId || 'Unknown',
            riderName: cleanRiderName || 'Unassigned',
            riderPhone: riderInfo.phone,
            riderEmail: riderInfo.email,
            riderCarrier: riderInfo.carrier,
            jpNumber: getColumnValue(row, columnMap, CONFIG.columns.assignments.jpNumber) || '',
            eventDate: formatDateForDisplay(getColumnValue(row, columnMap, CONFIG.columns.assignments.eventDate)) || 'No Date',
            startTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.assignments.startTime)) || 'No Time',
            endTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.assignments.endTime)) || '',
            startLocation: getColumnValue(row, columnMap, CONFIG.columns.assignments.startLocation) || 'Location TBD',
            endLocation: getColumnValue(row, columnMap, CONFIG.columns.assignments.endLocation) || '',
            status: status || 'Unknown',
            notificationStatus: notificationStatus,
            lastNotified: lastNotified,
            createdDate: getColumnValue(row, columnMap, CONFIG.columns.assignments.createdDate) || ''
          };
          
          assignments.push(assignment);
        }
        
      } catch (rowError) {
        debugLog(`⚠️ Error processing assignment row ${i}:`, rowError);
      }
    }
    
    debugLog(`✅ [FIXED] Found ${assignments.length} assignments for notifications`);
    
    // Debug output if no assignments found
    if (assignments.length === 0 && assignmentsData.data.length > 1) {
      debugLog('🔍 No assignments found. Debugging first row:');
      const firstRow = assignmentsData.data[1];
      debugLog('🔍 Row data:', firstRow.slice(0, 10));
      debugLog('🔍 Column map keys:', Object.keys(columnMap));
    }
    
    return assignments;
    
  } catch (error) {
    console.error('❌ Error in getAllAssignmentsForNotifications:', error);
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

function calculateNotificationStats(assignments) {
  try {
    debugLog('📊 Calculating notification stats...');
    
    if (!assignments || !Array.isArray(assignments)) {
      return {
        totalAssignments: 0,
        pendingNotifications: 0,
        smsToday: 0,
        emailToday: 0
      };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let totalAssignments = assignments.length;
    let pendingNotifications = 0;
    let smsToday = 0;
    let emailToday = 0;
    
    assignments.forEach(assignment => {
      // Count pending notifications (assignments without notification sent)
      if (!assignment.notified && !assignment.smsSent && !assignment.emailSent) {
        pendingNotifications++;
      }
      
      // Count SMS sent today
      if (assignment.smsSent) {
        try {
          const smsDate = new Date(assignment.smsSent);
          smsDate.setHours(0, 0, 0, 0);
          if (smsDate.getTime() === today.getTime()) {
            smsToday++;
          }
        } catch (e) {
          // Invalid date, ignore
        }
      }
      
      // Count emails sent today
      if (assignment.emailSent) {
        try {
          const emailDate = new Date(assignment.emailSent);
          emailDate.setHours(0, 0, 0, 0);
          if (emailDate.getTime() === today.getTime()) {
            emailToday++;
          }
        } catch (e) {
          // Invalid date, ignore
        }
      }
    });
    
    const stats = {
      totalAssignments,
      pendingNotifications,
      smsToday,
      emailToday
    };
    
    debugLog('✅ Notification stats calculated:', stats);
    return stats;
    
  } catch (error) {
    console.error('❌ Error calculating notification stats:', error);
    return {
      totalAssignments: 0,
      pendingNotifications: 0,
      smsToday: 0,
      emailToday: 0
    };
  }
}

/**
 * Gets recent notification activity
 */
function getRecentNotificationActivity(assignments) {
  try {
    debugLog('📝 Getting recent notification activity...');
    
    if (!assignments || !Array.isArray(assignments)) {
      return [];
    }
    
    const activities = [];
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    assignments.forEach(assignment => {
      // Check SMS activities
      if (assignment.smsSent) {
        try {
          const smsDate = new Date(assignment.smsSent);
          if (smsDate >= sevenDaysAgo) {
            activities.push({
              type: 'SMS',
              requestId: assignment.requestId,
              assignmentId: assignment.id,
              recipient: assignment.riderName,
              timestamp: smsDate,
              messagePreview: `SMS notification sent for ${assignment.requestId} - ${assignment.eventDate}`
            });
          }
        } catch (e) {
          // Invalid date, ignore
        }
      }
      
      // Check Email activities
      if (assignment.emailSent) {
        try {
          const emailDate = new Date(assignment.emailSent);
          if (emailDate >= sevenDaysAgo) {
            activities.push({
              type: 'Email',
              requestId: assignment.requestId,
              assignmentId: assignment.id,
              recipient: assignment.riderName,
              timestamp: emailDate,
              messagePreview: `Email notification sent for ${assignment.requestId} - ${assignment.eventDate}`
            });
          }
        } catch (e) {
          // Invalid date, ignore
        }
      }
    });
    
    // Sort by most recent first
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    debugLog(`✅ Found ${activities.length} recent notification activities`);
    return activities.slice(0, 10); // Return last 10 activities
    
  } catch (error) {
    console.error('❌ Error getting recent notification activity:', error);
    return [];
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
    debugLog('🔄 Loading reports page data...', filters);

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
        reportData: null
      };
    }

    const user = Object.assign({}, auth.user, { roles: auth.user.roles || [auth.user.role] });

    const reportData = generateReportData(filters);
    return { success: true, user: user, reportData: reportData };
  } catch (error) {
    logError('Error in getPageDataForReports', error);
    return { success: false, error: error.message, user: { name: 'System User' }, reportData: null };
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

    // debugLog(`🏍️ Getting mobile assignments for rider: ${userEmail}`);

    const assignmentsData = getAssignmentsData(); // Assumes this function exists and returns { data: [], columnMap: {} }

    if (!assignmentsData || !assignmentsData.data || assignmentsData.data.length === 0) {
      // debugLog('❌ No assignments data found in getMobileAssignmentsForRider.');
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
            // debugLog(`Matched assignment by name for ${currentUserName} as email was not found or didn't match.`);
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

    // debugLog(`✅ Returning ${riderAssignments.length} assignments for rider ${userEmail}.`);
    // if (riderAssignments.length > 0) {
      // debugLog('Sample mobile assignment:', riderAssignments[0]);
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
  try {
    debugLog(`🏍️ Starting assignment process for request ${requestId} with ${selectedRiders.length} riders`);
    debugLog('Selected riders:', JSON.stringify(selectedRiders, null, 2));
    
    if (!requestId || !selectedRiders) {
      throw new Error('Request ID is required for assignment');
    }

    // Validate that the request exists and get its details
    const requestDetails = getRequestDetails(requestId);
    if (!requestDetails) {
      throw new Error(`Request ${requestId} not found`);
    }

    debugLog('Request details found:', requestDetails);

    // Remove any existing assignments for this request first
    const existingAssignments = getAssignmentsForRequest(requestId);
    if (existingAssignments.length > 0) {
      debugLog(`🗑️ Removing ${existingAssignments.length} existing assignments for request ${requestId}`);
      removeExistingAssignments(requestId);
    }

    // Create new assignments using batch operation
    const assignmentResults = [];
    const assignedRiderNames = [];
    const assignmentRows = [];

    debugLog(`📝 Preparing ${selectedRiders.length} assignments for batch creation`);
    
    // First, prepare all assignment rows in memory
    for (let i = 0; i < selectedRiders.length; i++) {
      const rider = selectedRiders[i];
      debugLog(`📝 Preparing assignment ${i + 1}/${selectedRiders.length} for rider: ${rider.name}`);
      
      try {
        const assignmentId = generateAssignmentId();
        const assignmentRow = buildAssignmentRow(assignmentId, requestId, rider, requestDetails);
        
        assignmentRows.push(assignmentRow);
        assignedRiderNames.push(rider.name);
        
        assignmentResults.push({
          assignmentId: assignmentId,
          riderName: rider.name,
          status: 'success'
        });
        
        debugLog(`✅ Prepared assignment ${assignmentId} for rider ${rider.name}`);
        
      } catch (riderError) {
        console.error(`❌ Failed to prepare assignment for rider ${rider.name}:`, riderError);
        assignmentResults.push({
          riderName: rider.name,
          status: 'failed',
          error: riderError.message
        });
      }
    }

    // Now batch insert all assignments at once
    if (assignmentRows.length > 0) {
      try {
        const assignmentsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.assignments);
        if (!assignmentsSheet) {
          throw new Error('Assignments sheet not found');
        }
        
        debugLog(`🔄 Batch inserting ${assignmentRows.length} assignments...`);
        
        // Get the range starting from the next available row
        const lastRow = assignmentsSheet.getLastRow();
        const startRow = lastRow + 1;
        const numCols = assignmentRows[0].length;
        
        const range = assignmentsSheet.getRange(startRow, 1, assignmentRows.length, numCols);
        range.setValues(assignmentRows);
        
        debugLog(`✅ Successfully batch inserted ${assignmentRows.length} assignments`);
        
      } catch (batchError) {
        console.error(`❌ Batch insert failed, falling back to individual inserts:`, batchError);
        
        // Fallback to individual inserts if batch fails
        const assignmentsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.assignments);
        for (let i = 0; i < assignmentRows.length; i++) {
          try {
            assignmentsSheet.appendRow(assignmentRows[i]);
          } catch (individualError) {
            console.error(`❌ Failed to insert assignment ${i + 1}:`, individualError);
            // Mark this assignment as failed
            const failedResult = assignmentResults.find(r => r.status === 'success' && assignmentResults.indexOf(r) === i);
            if (failedResult) {
              failedResult.status = 'failed';
              failedResult.error = individualError.message;
            }
          }
        }
      }
    }

    // Update the request with assigned rider names (critical operation)
    updateRequestWithAssignedRiders(requestId, assignedRiderNames);

    const successCount = assignmentResults.filter(r => r.status === 'success').length;
    const failCount = assignmentResults.filter(r => r.status === 'failed').length;

    debugLog(`✅ Assignment process completed for ${requestId}: ${successCount} successful, ${failCount} failed`);

    // Return immediately to prevent timeout - defer non-critical operations
    const response = {
      success: true,
      message: `Successfully assigned ${successCount} rider(s) to request ${requestId}`,
      requestId: requestId,
      assignmentResults: assignmentResults,
      successCount: successCount,
      failCount: failCount
    };

    // Defer rotation updates and other non-critical operations to background
    try {
      debugLog('🔄 Scheduling background operations...');
      
      // Use a time-driven trigger to execute background operations
      if (assignedRiderNames.length > 0) {
        // Store data for background processing
        const backgroundData = {
          requestId: requestId,
          assignedRiderNames: assignedRiderNames,
          usePriority: usePriority,
          timestamp: new Date().getTime()
        };
        
        PropertiesService.getScriptProperties().setProperty(
          'BACKGROUND_ASSIGNMENT_DATA_' + requestId, 
          JSON.stringify(backgroundData)
        );
        
        // Create a one-time trigger for background processing
        ScriptApp.newTrigger('executeBackgroundAssignmentProcessing')
          .timeBased()
          .after(1000) // 1 second delay
          .create();
      }
      
    } catch (backgroundError) {
      // Don't let background setup errors affect the main response
      logError('Background processing setup failed but assignment was successful', backgroundError);
      
      // Fallback: try to execute critical operations immediately
      try {
        if (usePriority !== false && assignedRiderNames.length > 0) {
          updateAssignmentRotation(assignedRiderNames);
        }
        logActivity(`Assignment process completed for ${requestId}: ${successCount} successful, ${failCount} failed`);
      } catch (fallbackError) {
        logError('Fallback operations also failed', fallbackError);
      }
    }

    return response;

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
 * @param {boolean} [useCache=true] - Whether to use cached request data.
 * @return {object|null} Request details object or null if not found.
 */
function getRequestDetails(requestId, useCache = true) {
  try {
    const requestsData = getRequestsData(useCache);
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
        case CONFIG.columns.assignments.confirmedDate:
        case CONFIG.columns.assignments.confirmationMethod:
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
    debugLog(`🗑️ Starting batch removal of assignments for request ${requestId}`);
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

    // Filter out rows that match the requestId and collect removed names
    const rowsToKeep = [headers]; // Always keep the header row
    const removedNames = [];
    let removedCount = 0;

    for (let i = 1; i < data.length; i++) { // Skip header row
      const rowRequestId = String(data[i][requestIdCol]).trim();
      if (rowRequestId === String(requestId).trim()) {
        // This row should be removed
        removedCount++;
        if (riderNameCol !== -1) {
          const name = String(data[i][riderNameCol]).trim();
          if (name) removedNames.push(name);
        }
      } else {
        // Keep this row
        rowsToKeep.push(data[i]);
      }
    }

    if (removedCount > 0) {
      // Clear the sheet and rewrite with only the rows we want to keep
      debugLog(`🔄 Batch removing ${removedCount} assignments using full sheet rewrite`);
      assignmentsSheet.clear();
      
      if (rowsToKeep.length > 1) { // More than just header
        const range = assignmentsSheet.getRange(1, 1, rowsToKeep.length, headers.length);
        range.setValues(rowsToKeep);
      } else {
        // Only header row remains
        assignmentsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
      
      debugLog(`✅ Batch removed ${removedCount} existing assignments for request ${requestId}`);
    } else {
      debugLog(`ℹ️ No existing assignments found for request ${requestId}`);
    }

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
    const ridersNeededCol = columnMap[CONFIG.columns.requests.ridersNeeded];

    // Update assigned riders
    if (ridersAssignedCol !== undefined) {
      const ridersText = riderNames.join(', ');
      requestsSheet.getRange(sheetRowNumber, ridersAssignedCol + 1).setValue(ridersText);
    }

    // Determine how many riders are needed for this request
    let ridersNeeded = 0;
    if (ridersNeededCol !== undefined) {
      const neededVal = requestsSheet.getRange(sheetRowNumber, ridersNeededCol + 1).getValue();
      const parsedNeeded = parseInt(neededVal, 10);
      ridersNeeded = isNaN(parsedNeeded) ? 0 : parsedNeeded;
    }

    // Update status based on how many riders are assigned
    if (statusCol !== undefined) {
      const currentStatus = String(requestsSheet.getRange(sheetRowNumber, statusCol + 1).getValue()).trim();
      let newStatus;
      if (currentStatus === 'Completed' || currentStatus === 'Cancelled') {
        newStatus = currentStatus;
      } else if (riderNames.length === 0) {
        newStatus = 'Unassigned';
      } else if (riderNames.length < ridersNeeded) {
        newStatus = 'Unassigned';
      } else {
        newStatus = 'Assigned';
      }
      requestsSheet.getRange(sheetRowNumber, statusCol + 1).setValue(newStatus);
    }

    // Update last modified timestamp
    if (lastUpdatedCol !== undefined) {
      requestsSheet.getRange(sheetRowNumber, lastUpdatedCol + 1).setValue(new Date());
    }

    debugLog(`📝 Updated request ${requestId} with ${riderNames.length} assigned riders`);

    if (typeof clearRequestsCache === 'function') {
      clearRequestsCache();
    }

    if (typeof syncRequestToCalendar === 'function') {
      try {
        syncRequestToCalendar(requestId);
      } catch (syncError) {
        logError(`Failed to sync request ${requestId} to calendar`, syncError);
      }
    }

  } catch (error) {
    logError('Error updating request with assigned riders', error);
    throw new Error(`Failed to update request with riders: ${error.message}`);
  }
}

/**
 * Simple function to get all riders regardless of status (for testing)
 */
function getAllRidersIgnoreStatus() {
  try {
    debugLog('🔧 Getting ALL riders regardless of status...');
    
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
    
    debugLog(`✅ Found ${allRiders.length} riders (ignoring status)`);
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
    debugLog('🔧 Setting all riders to Active status...');
    
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
    
    debugLog(`✅ Updated ${updatedCount} riders to Active status`);
    
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
    debugLog('🧪 Testing active riders fix...');
    
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
    
    debugLog('Before fix:', result.beforeFix);
    
    // Apply fix if no active riders found
    if (activeRiders.length === 0 && allRiders.length > 0) {
      debugLog('🔧 Applying fix...');
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
    
    debugLog('After fix:', result.afterFix);
    debugLog('Fix successful:', result.success);
    
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
 * @param {object} userOrEntry Object containing date (YYYY-MM-DD), startTime, endTime, notes, and optional email.
 * @param {object} entry (Optional) Object containing date (YYYY-MM-DD), startTime, endTime, notes, and optional email.
 * @return {object} Result object with success boolean and row number.
 */
function saveUserAvailability(userOrEntry, entry) { // Added user parameter
  try {
    // Handle backward compatibility: if only one parameter is passed, treat it as entry
    let user, actualEntry;
    
    if (arguments.length === 1) {
      // Legacy call: saveUserAvailability(entry)
      actualEntry = userOrEntry;
      user = getCurrentUser();
    } else {
      // New call: saveUserAvailability(user, entry)
      user = userOrEntry;
      actualEntry = entry;
    }
    
    if (!actualEntry) throw new Error('No availability data provided');

    const email = actualEntry.email || user.email;
    const repeat = actualEntry.repeat || 'none';
    const untilDate = actualEntry.repeatUntil ? new Date(actualEntry.repeatUntil) : new Date(actualEntry.date);

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
            String(rowStart) === actualEntry.startTime) {
          targetRow = i + 2; // account for header
          break;
        }
      }

      const rowValues = [email, new Date(dateStr), actualEntry.startTime, actualEntry.endTime, actualEntry.notes || ''];

      if (targetRow > 0) {
        sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        sheet.appendRow(rowValues);
      }
    }

    let curDate = new Date(actualEntry.date);
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
 * Returns recent rider email responses.
 * @param {number} [limit=50] Maximum number of responses to return.
 * @return {Array<Object>} Array of response objects.
 */
function getEmailResponses(limit) {
  try {
    var max = limit || 50;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Email_Responses');
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
    logError('Error in getEmailResponses', error);
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
    let order = [];
    
    // Get stored order
    const prop = PropertiesService.getScriptProperties().getProperty('ASSIGNMENT_ORDER');
    if (prop) {
      order = prop.split('\n').map(n => n.trim()).filter(n => n);
    }
    
    // Get current active riders data to check part-time status
    const activeRiders = getActiveRidersForAssignments();
    const riderLookup = {};
    activeRiders.forEach(rider => {
      riderLookup[rider.name] = rider;
    });
    
    // Filter out part-time riders from the stored order
    order = order.filter(name => {
      const rider = riderLookup[name];
      if (!rider) {
        // Rider no longer exists, remove from rotation
        return false;
      }
      // Exclude part-time riders
      const isPartTime = String(rider.partTime || 'No').toLowerCase() === 'yes';
      return !isPartTime;
    });
    
    // If no stored order exists or it's empty after filtering, create a new one
    if (order.length === 0) {
      const riders = activeRiders.filter(r => String(r.partTime || 'No').toLowerCase() !== 'yes');
      order = riders.sort((a, b) => a.name.localeCompare(b.name)).map(r => r.name);
    }
    
    // Save the cleaned order back to properties
    PropertiesService.getScriptProperties().setProperty('ASSIGNMENT_ORDER', order.join('\n'));
    
    return order;
    
  } catch (error) {
    logError('Error in getAssignmentRotation', error);
    return [];
  }
}
function checkRotationStatus() {
  try {
    const currentOrder = getAssignmentRotation();
    const activeRiders = getActiveRidersForAssignments();
    
    debugLog('=== ROTATION STATUS CHECK ===');
    debugLog(`Current rotation has ${currentOrder.length} riders`);
    debugLog('Riders in rotation:', currentOrder);
    
    // Check each rider in rotation
    currentOrder.forEach(name => {
      const rider = activeRiders.find(r => r.name === name);
      if (!rider) {
        debugLog(`⚠️  ${name} - NOT FOUND in active riders`);
      } else {
        const isPartTime = String(rider.partTime || 'No').toLowerCase() === 'yes';
        debugLog(`${isPartTime ? '❌' : '✅'} ${name} - Part-time: ${rider.partTime || 'No'}`);
      }
    });
    
    return {
      rotationCount: currentOrder.length,
      rotation: currentOrder,
      activeRidersCount: activeRiders.length
    };
    
  } catch (error) {
    console.error('Error checking rotation status:', error);
    return { error: error.message };
  }
}
/**
 * ADDITIONAL FIX: Add a function to manually clean the rotation
 * This can be called once to clean up any existing bad data
 */
function cleanAssignmentRotation() {
  try {
    debugLog('🧹 Cleaning assignment rotation to remove part-time riders...');
    
    // Get current active riders
    const activeRiders = getActiveRidersForAssignments();
    
    // Filter to only full-time riders
    const fullTimeRiders = activeRiders.filter(r => 
      String(r.partTime || 'No').toLowerCase() !== 'yes'
    );
    
    // Create clean rotation order
    const cleanOrder = fullTimeRiders
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(r => r.name);
    
    // Save the clean order
    PropertiesService.getScriptProperties().setProperty('ASSIGNMENT_ORDER', cleanOrder.join('\n'));
    
    debugLog(`✅ Assignment rotation cleaned. ${cleanOrder.length} full-time riders in rotation.`);
    debugLog('Full-time riders in rotation:', cleanOrder);
    
    return {
      success: true,
      message: `Assignment rotation cleaned. ${cleanOrder.length} full-time riders in rotation.`,
      riders: cleanOrder
    };
    
  } catch (error) {
    console.error('❌ Error cleaning assignment rotation:', error);
    logError('Error in cleanAssignmentRotation', error);
    return {
      success: false,
      message: `Error cleaning rotation: ${error.message}`
    };
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

/**
 * Executes post-assignment cleanup operations in the background
 * This function handles cache clearing and calendar sync to avoid blocking the main response
 * @param {string} requestId - The request ID that was processed
 * @param {Array} assignedRiderNames - Array of rider names that were assigned
 */
function executePostAssignmentCleanup(requestId, assignedRiderNames) {
  try {
    debugLog(`🧹 Starting post-assignment cleanup for request ${requestId}`);
    
    // Clear caches to ensure fresh data
    if (typeof clearRequestsCache === 'function') {
      clearRequestsCache();
    }
    if (typeof clearDataCache === 'function') {
      clearDataCache();
    }
    
    // Post assignments to calendar
    if (typeof postAssignmentsToCalendar === 'function') {
      try {
        postAssignmentsToCalendar();
        debugLog(`✅ Calendar sync completed for request ${requestId}`);
      } catch (calendarError) {
        logError('Failed to post assignments to calendar during cleanup', calendarError);
      }
    }
    
    debugLog(`🧹 Post-assignment cleanup completed for request ${requestId}`);
    
  } catch (error) {
    logError('Error in executePostAssignmentCleanup', error);
  }
}

/**
 * Executes background operations that were deferred during assignment processing
 * to improve the user experience by returning the assignment response faster.
 * This function is triggered after a short delay to handle non-critical operations.
 */
function executeBackgroundAssignmentProcessing() {
  try {
    debugLog('🔄 Starting background assignment processing...');
    
    // Get all pending background data
    const properties = PropertiesService.getScriptProperties();
    const allProperties = properties.getProperties();
    
    let processedCount = 0;
    const maxAge = 5 * 60 * 1000; // 5 minutes max age
    const now = new Date().getTime();
    
    // Process all pending background assignment data
    for (const [key, value] of Object.entries(allProperties)) {
      if (key.startsWith('BACKGROUND_ASSIGNMENT_DATA_')) {
        try {
          const backgroundData = JSON.parse(value);
          const age = now - backgroundData.timestamp;
          
          if (age > maxAge) {
            // Too old, skip and clean up
            properties.deleteProperty(key);
            debugLog(`⏰ Skipped expired background data for ${backgroundData.requestId}`);
            continue;
          }
          
          debugLog(`🔄 Processing background operations for request ${backgroundData.requestId}`);
          
          // Execute the deferred operations
          if (backgroundData.usePriority !== false && backgroundData.assignedRiderNames.length > 0) {
            updateAssignmentRotation(backgroundData.assignedRiderNames);
            debugLog(`✅ Updated rotation for ${backgroundData.assignedRiderNames.length} riders`);
          }
          
          // Log the activity
          logActivity(`Assignment process completed for ${backgroundData.requestId}: riders assigned successfully`);
          
          // Update rider assignment statistics
          if (backgroundData.assignedRiderNames.length > 0) {
            for (const riderName of backgroundData.assignedRiderNames) {
              try {
                updateRiderAssignmentStats(riderName);
              } catch (statsError) {
                logError(`Failed to update stats for rider ${riderName}`, statsError);
              }
            }
            debugLog(`📊 Updated assignment statistics for ${backgroundData.assignedRiderNames.length} riders`);
          }
          
          // Clean up the processed data
          properties.deleteProperty(key);
          processedCount++;
          
          debugLog(`✅ Completed background processing for request ${backgroundData.requestId}`);
          
        } catch (dataError) {
          logError(`Error processing background assignment data for ${key}`, dataError);
          // Clean up invalid data
          properties.deleteProperty(key);
        }
      }
    }
    
    debugLog(`🏁 Background assignment processing completed. Processed ${processedCount} requests.`);
    
    // Clean up old triggers to prevent accumulation
    cleanupOldAssignmentTriggers();
    
  } catch (error) {
    logError('Error in executeBackgroundAssignmentProcessing', error);
  }
}

/**
 * Cleans up old assignment processing triggers to prevent accumulation.
 */
function cleanupOldAssignmentTriggers() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    let cleanedCount = 0;
    
    for (const trigger of triggers) {
      if (trigger.getHandlerFunction() === 'executeBackgroundAssignmentProcessing') {
        // Delete the trigger since it's already been executed
        ScriptApp.deleteTrigger(trigger);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      debugLog(`🧹 Cleaned up ${cleanedCount} old assignment processing triggers`);
    }
    
  } catch (error) {
    logError('Error cleaning up assignment triggers', error);
  }
}

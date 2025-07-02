// 🔒 ACCESS CONTROL MATRIX - Place this in a new file: AccessControl.js

// Helper function to escape strings for JavaScript injection
function escapeJsString(str) {
  if (str === null || typeof str === 'undefined') {
    return '';
  }
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '\\\'')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\u2028/g, '\\u2028') // Line separator
    .replace(/\u2029/g, '\\u2029'); // Paragraph separator
}

/**
 * PERMISSIONS MATRIX
 * Define what each role can do in the system
 */
const PERMISSIONS_MATRIX = {
  admin: {
    // Requests
    requests: {
      create: true,
      read: true,
      update: true,
      delete: true,
      view_all: true,
      export: true
    },
    // Riders
    riders: {
      create: true,
      read: true,
      update: true,
      delete: true,
      view_all: true,
      approve: true,
      deactivate: true
    },
    // Assignments
    assignments: {
      create: true,
      read: true,
      update: true,
      delete: true,
      assign_any: true,
      view_all: true,
      bulk_assign: true
    },
    // Reports
    reports: {
      view_all: true,
      export_all: true,
      financial: true,
      rider_performance: true,
      system_logs: true
    },
    // Availability
availability: {
  view_own: true,
  view_all: true,
  edit_own: true,
  edit_all: true,
  delete_own: true,
  delete_all: true
},
    // System
    system: {
      manage_users: true,
      system_settings: true,
      backup_data: true,
      view_logs: true,
      send_notifications: true
    },
    // Pages
    pages: ['dashboard', 'requests', 'assignments', 'riders', 'rider-availability', 'notifications', 'reports', 'admin-schedule', 'settings']
  },

  dispatcher: {
    // Requests
    requests: {
      create: true,
      read: true,
      update: true,
      delete: false,
      view_all: true,
      export: true
    },
    // Riders
    riders: {
      create: false,
      read: true,
      update: false,
      delete: false,
      view_all: true,
      approve: false,
      deactivate: false
    },
    // Assignments
    assignments: {
      create: true,
      read: true,
      update: true,
      delete: false,
      assign_any: true,
      view_all: true,
      bulk_assign: true
    },
    // Reports
    reports: {
      view_all: true,
      export_all: false,
      financial: false,
      rider_performance: true,
      system_logs: false
    },
    // Availability
availability: {
  view_own: true,
  view_all: true,
  edit_own: false,
  edit_all: false,
  delete_own: false,
  delete_all: false
},
    // System
    system: {
      manage_users: false,
      system_settings: false,
      backup_data: false,
      view_logs: false,
      send_notifications: true
    },
    // Pages
    pages: ['dashboard', 'requests', 'assignments', 'rider-availability', 'notifications', 'reports']
  },

  rider: {
    // Requests
    requests: {
      create: false,
      read: false, // Only assigned requests
      update: false,
      delete: false,
      view_all: false,
      export: false
    },
    // Riders
    riders: {
      create: false,
      read: false, // Only own profile
      update: false, // Only own profile
      delete: false,
      view_all: false,
      approve: false,
      deactivate: false
    },
    // Assignments
    assignments: {
      create: false,
      read: true, // Only own assignments
      update: true, // Only own status
      delete: false,
      assign_any: false,
      view_all: false,
      bulk_assign: false
    },
    // Reports
    reports: {
      view_all: false,
      export_all: false,
      financial: false,
      rider_performance: false, // Only own performance
      system_logs: false
    },
    // Availability
availability: {
  view_own: true,
  view_all: false,
  edit_own: true,
  edit_all: false,
  delete_own: true,
  delete_all: false
},
    // System
    system: {
      manage_users: false,
      system_settings: false,
      backup_data: false,
      view_logs: false,
      send_notifications: false
    },
    // Pages
    pages: ['dashboard', 'rider-availability', 'my-assignments', 'my-profile']
  }
};

/**
 * RESOURCE ACCESS CONTROL
 * Controls what data each role can access
 */
const RESOURCE_ACCESS = {
  requests: {
    admin: (user, requestId) => true, // Can access all
    dispatcher: (user, requestId) => true, // Can access all
    rider: (user, requestId) => {
      // Only requests where rider is assigned
      const assignments = getAssignmentsForRider(user.riderId);
      return assignments.some(assignment => assignment.requestId === requestId);
    }
  },
  
  riders: {
    admin: (user, riderId) => true, // Can access all riders
    dispatcher: (user, riderId) => true, // Can view all riders
    rider: (user, riderId) => user.riderId === riderId // Only own profile
  },
  
  assignments: {
    admin: (user, assignmentId) => true, // Can access all
    dispatcher: (user, assignmentId) => true, // Can access all
    rider: (user, assignmentId) => {
      // Only own assignments
      const assignment = getAssignmentById(assignmentId);
      return assignment && assignment.riderId === user.riderId;
    }
  }
};
function immediateSessionTest() {
  console.log('=== IMMEDIATE SESSION TEST ===');
  
  // Test 1: Raw session
  try {
    const user = Session.getActiveUser();
    const email = user.getEmail();
    console.log('1. Raw Session.getActiveUser().getEmail():', email);
  } catch (e) {
    console.log('1. Raw session failed:', e.message);
  }
  
  // Test 2: Cached data
  try {
    const cached = PropertiesService.getScriptProperties().getProperty('CACHED_USER_EMAIL');
    console.log('2. Cached email:', cached);
  } catch (e) {
    console.log('2. Cache check failed:', e.message);
  }
  
  // Test 3: Admin list
  try {
    const admins = getAdminUsersSafe();
    console.log('3. Admin list:', admins);
  } catch (e) {
    console.log('3. Admin list failed:', e.message);
  }
}
function getRoleBasedNavigation(currentPage, user, rider) {
  try {
    console.log('getRoleBasedNavigation: Called for page: ' + currentPage + ', User role: ' + (user ? user.role : 'unknown'));
    
    if (!user) {
      console.error('getRoleBasedNavigation: User object is null/undefined.');
      return '<nav class="navigation"><!-- User object missing --></nav>';
    }

    const menuItems = getUserNavigationMenu(user);
    if (!menuItems || menuItems.length === 0) {
      console.warn('getRoleBasedNavigation: No menu items returned by getUserNavigationMenu for role: ' + user.role);
      return '<nav class="navigation"><!-- No menu items for role --></nav>';
    }

    let navHtml = '<nav class="navigation">';
    menuItems.forEach(item => {
      const isActive = item.page === currentPage ? ' active' : '';
      navHtml += `<a href="${item.url}" class="nav-button${isActive}" data-page="${item.page}" target="_top">${item.label}</a>`;
    });
    navHtml += '</nav>';

    console.log('getRoleBasedNavigation: Generated navigation with ' + menuItems.length + ' items');
    console.log('getRoleBasedNavigation: Items included: ' + menuItems.map(i => i.page).join(', '));
    
    return navHtml;
    
  } catch (error) {
    console.error('❌ Error in getRoleBasedNavigation:', error);
    
    // Fallback navigation that DEFINITELY includes availability
    const baseUrl = getWebAppUrlSafe();
    return `<nav class="navigation">
      <a href="${baseUrl}" class="nav-button ${currentPage === 'dashboard' ? 'active' : ''}" data-page="dashboard" target="_top">📊 Dashboard</a>
      <a href="${baseUrl}?page=requests" class="nav-button ${currentPage === 'requests' ? 'active' : ''}" data-page="requests" target="_top">📋 Requests</a>
      <a href="${baseUrl}?page=assignments" class="nav-button ${currentPage === 'assignments' ? 'active' : ''}" data-page="assignments" target="_top">🏍️ Assignments</a>
      <a href="${baseUrl}?page=riders" class="nav-button ${currentPage === 'riders' ? 'active' : ''}" data-page="riders" target="_top">👥 Riders</a>
      <a href="${baseUrl}?page=rider-availability" class="nav-button ${currentPage === 'rider-availability' ? 'active' : ''}" data-page="rider-availability" target="_top">🗓️ Availability</a>
      <a href="${baseUrl}?page=notifications" class="nav-button ${currentPage === 'notifications' ? 'active' : ''}" data-page="notifications" target="_top">📱 Notifications</a>
      <a href="${baseUrl}?page=reports" class="nav-button ${currentPage === 'reports' ? 'active' : ''}" data-page="reports" target="_top">📊 Reports</a>
    </nav>`;
  }
}

// 🔧 FIXED USER OBJECT HANDLING - Replace your authentication functions

/**
 * IMMEDIATE FIX: Replace your getEnhancedUserSession function with this version
 * This version prioritizes fresh session data over cached data
 */
function getEnhancedUserSession() {
  try {
    console.log('🔍 getEnhancedUserSession called from AccessControl.gs');

    // 1) Check custom session used by spreadsheet logins
    try {
      if (typeof getCustomSession === 'function') {
        const custom = getCustomSession();
        if (custom) {
          console.log('✅ Found custom session for ' + custom.email);
          traceAuthFunction('getEnhancedUserSession', custom.email, 'custom_session');
          return {
            email: String(custom.email || '').trim(),
            name: String(custom.name || '').trim(),
            role: custom.role || '',
            hasEmail: !!custom.email,
            hasName: !!custom.name,
            source: 'custom_session'
          };
        }
      }
    } catch (err) {
      console.log('⚠️ Error retrieving custom session: ' + err.message);
    }

    let user = null;
    let userEmail = '';
    let userName = '';
    let sessionSource = 'none';
    
    try {
      user = Session.getActiveUser();
      console.log('👤 Session user object:', typeof user);
      
      if (user) {
        // Safe way to get email
        try {
          userEmail = user.getEmail ? user.getEmail() : (user.email || '');
          sessionSource = 'active_user_getEmail';
        } catch (e) {
          console.log('⚠️ getEmail() failed, trying alternatives...');
          userEmail = user.email || '';
          sessionSource = 'active_user_property';
        }
        
        // Safe way to get name
        try {
          userName = user.getName ? user.getName() : (user.name || '');
        } catch (e) {
          console.log('⚠️ getName() failed, trying alternatives...');
          userName = user.name || user.displayName || '';
        }
      }
    } catch (error) {
      console.log('⚠️ Session.getActiveUser() failed:', error.message);
      sessionSource = 'getActiveUser_failed';
    }
    
    // Method 2: Try Session.getEffectiveUser() as fallback
    if (!userEmail) {
      try {
        console.log('🔄 Trying Session.getEffectiveUser()...');
        const effectiveUser = Session.getEffectiveUser();
        if (effectiveUser) {
          userEmail = effectiveUser.getEmail ? effectiveUser.getEmail() : (effectiveUser.email || '');
          userName = effectiveUser.getName ? effectiveUser.getName() : (effectiveUser.name || '');
          sessionSource = 'effective_user';
        }
      } catch (error) {
        console.log('⚠️ Session.getEffectiveUser() failed:', error.message);
        sessionSource = 'getEffectiveUser_failed';
      }
    }
    
    // Method 3: Try PropertiesService for cached user info
    if (!userEmail) {
      try {
        console.log('🔄 Trying cached user info...');
        const cachedEmail = PropertiesService.getScriptProperties().getProperty('CACHED_USER_EMAIL');
        const cachedName = PropertiesService.getScriptProperties().getProperty('CACHED_USER_NAME');
        if (cachedEmail) {
          userEmail = cachedEmail;
          userName = cachedName || '';
          sessionSource = 'cached_properties';
        }
      } catch (error) {
        console.log('⚠️ Cached user info failed:', error.message);
        sessionSource = 'cache_failed';
      }
    }
    
    // Trace the result
    traceAuthFunction('getEnhancedUserSession', userEmail, sessionSource);
    
    // Return enhanced user object
    const enhancedUser = {
      email: userEmail.trim(),
      name: userName.trim() || extractNameFromEmail(userEmail),
      role: '',
      hasEmail: !!userEmail.trim(),
      hasName: !!userName.trim(),
      source: sessionSource
    };
    
    console.log(`✅ Enhanced user session: ${enhancedUser.email} (${enhancedUser.name})`);
    
    // Cache successful user info (but don't cache jpsotraffic unless it's really the active user)
    if (enhancedUser.hasEmail && sessionSource.includes('active_user')) {
      try {
        PropertiesService.getScriptProperties().setProperties({
          'CACHED_USER_EMAIL': enhancedUser.email,
          'CACHED_USER_NAME': enhancedUser.name
        });
      } catch (e) {
        console.log('⚠️ Failed to cache user info');
      }
    }
    
    return enhancedUser;
    
  } catch (error) {
    console.error('❌ Enhanced user session failed:', error);
    traceAuthFunction('getEnhancedUserSession->error', '', 'error: ' + error.message);
    return {
      email: '',
      name: '',
      hasEmail: false,
      hasName: false,
      source: 'error',
      error: error.message
    };
  }
}

/**
 * EMERGENCY FIX: Force clear jpsotraffic cache and refresh session
 * Run this function if users are stuck with jpsotraffic@gmail.com
 */
function emergencyFixJpsotrafficIssue() {
  console.log('🚨 EMERGENCY FIX: Clearing jpsotraffic@gmail.com cache...');
  
  try {
    // Clear all cached data
    const properties = PropertiesService.getScriptProperties();
    properties.deleteProperty('CACHED_USER_EMAIL');
    properties.deleteProperty('CACHED_USER_NAME');
    
    console.log('✅ Cleared cached user data');
    
    // Get fresh session
    const freshSession = getFreshUserSession();
    console.log('Fresh session:', freshSession);
    
    // Test authentication with fresh session
    const authResult = authenticateAndAuthorizeUser();
    console.log('Auth result after cache clear:', authResult);
    
    return {
      success: true,
      message: 'Emergency fix applied',
      freshSession: freshSession,
      authResult: authResult
    };
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * USER INSTRUCTION: Add this to your web interface
 * This creates a "Force Refresh Authentication" button for users
 */
function createAuthRefreshButton() {
  return `
<div style="margin: 20px; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px;">
  <h4>🔄 Authentication Issue?</h4>
  <p>If you're seeing the wrong user account, click this button to refresh your authentication:</p>
  <button onclick="forceAuthRefresh()" style="background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
    🔄 Refresh Authentication
  </button>
</div>

<script>
function forceAuthRefresh() {
  if (typeof google !== 'undefined' && google.script && google.script.run) {
    google.script.run
      .withSuccessHandler(function(result) {
        alert('Authentication refreshed! Reloading page...');
        window.location.reload();
      })
      .withFailureHandler(function(error) {
        alert('Refresh failed: ' + error.message);
      })
      .emergencyFixJpsotrafficIssue();
  } else {
    // Fallback: just reload the page
    alert('Reloading page to refresh authentication...');
    window.location.reload();
  }
}
</script>
  `;
}
/**
 * Fixed admin dashboard data function
 */
function getAdminDashboardData() {
  try {
    console.log('📊 Getting admin dashboard data...');
    
    // Use safe functions that handle errors
    let requests = [];
    let riders = [];
    let assignments = [];
    
    try {
      if (typeof getRequestsData === 'function') {
        const reqData = getRequestsData();
        if (reqData && reqData.data) {
          requests = reqData.data.map(row => mapRowToGenericObject(row, reqData.columnMap));
        } else if (Array.isArray(reqData)) {
          requests = reqData;
        }
      }
    } catch (e) {
      console.log('⚠️ Could not get requests data:', e.message);
      requests = [];
    }
    
    try {
      riders = getRidersDataSafe() || [];
    } catch (e) {
      console.log('⚠️ Could not get riders data:', e.message);
      riders = [];
    }
    
    try {
      if (typeof getAssignmentsData === 'function') {
        const assignData = getAssignmentsData();
        if (assignData && assignData.data) {
          assignments = assignData.data.map(row => mapRowToGenericObject(row, assignData.columnMap));
        } else if (Array.isArray(assignData)) {
          assignments = assignData;
        }
      }
    } catch (e) {
      console.log('⚠️ Could not get assignments data:', e.message);
      assignments = [];
    }
    
    const admins = getAdminUsersSafe();
    const dispatchers = getDispatcherUsersSafe();

    // Calculate new requests with status 'New'
    let newRequests = 0;
    try {
      newRequests = requests.filter(r => String(r.status || r['Status']).trim() === 'New').length;
    } catch (e) {
      console.log('⚠️ Error calculating new requests:', e.message);
    }
    
    const today = new Date();
    const todayStr = today.toDateString();
    
    // Calculate today's requests
    let todayRequests = 0;
    let todaysEscorts = 0; // Number of assignments scheduled for today
    try {
      todayRequests = requests.filter(r => {
        const reqDate = r.dateCreated || r['Date Created'] || r.date || '';
        if (reqDate) {
          return new Date(reqDate).toDateString() === todayStr;
        }
        return false;
      }).length;
    } catch (e) {
      console.log('⚠️ Error calculating today requests:', e.message);
    }

    // Calculate escorts scheduled for today
    try {
      todaysEscorts = assignments.filter(a => {
        const eventDate = a.eventDate || a['Event Date'];
        return eventDate && new Date(eventDate).toDateString() === todayStr;
      }).length;
    } catch (e) {
      console.log('⚠️ Error calculating todays escorts:', e.message);
    }
    
    // Calculate unassigned escorts within the next 3 days
    let unassignedEscorts = 0;
    try {
      const now = new Date();
      const threeDays = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3);
      unassignedEscorts = assignments.filter(a => {
        const eventDate = new Date(a.eventDate || a['Event Date']);
        return eventDate && eventDate >= now && eventDate <= threeDays &&
          a.status !== 'Assigned';
      }).length;
    } catch (e) {
      console.log('⚠️ Error calculating unassigned escorts:', e.message);
    }

    // Calculate escorts within the next 3 days
    let threeDayEscorts = 0;
    try {
      const now = new Date();
      const threeDays = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3);
      threeDayEscorts = assignments.filter(a => {
        const eventDate = new Date(a.eventDate || a['Event Date']);
        return eventDate && eventDate >= now && eventDate <= threeDays;
      }).length;
    } catch (e) {
      console.log('⚠️ Error calculating 3 day escorts:', e.message);
    }

    // Calculate active riders
    const activeRiders = riders.filter(r => r.status === 'Active').length;

    // Calculate pending assignments
    let pendingAssignments = 0;
    try {
      pendingAssignments = assignments.filter(a => a.status === 'Pending').length;
    } catch (e) {
      console.log('⚠️ Error calculating pending assignments:', e.message);
    }

    // Calculate notifications pending (assigned riders not yet notified)
    let pendingNotifications = 0;
    try {
      const toNotify = getAssignmentsNeedingNotification();
      pendingNotifications = Array.isArray(toNotify) ? toNotify.length : 0;
    } catch (e) {
      console.log('⚠️ Error calculating pending notifications:', e.message);
    }
    
    const result = {
      totalRequests: requests.length,
      totalRiders: activeRiders,
      totalAssignments: assignments.length,
      pendingNotifications: pendingNotifications,
      todayRequests: todayRequests,
      todaysEscorts: todaysEscorts,
      unassignedEscorts: unassignedEscorts,
      pendingAssignments: pendingAssignments,
      threeDayEscorts: threeDayEscorts,
      newRequests: newRequests
    };
    
    console.log('✅ Admin dashboard data:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error getting admin dashboard data:', error);
    
    // Return default values instead of failing
    return {
      totalRequests: 0,
      totalRiders: 0,
      totalAssignments: 0,
      pendingNotifications: 0,
      todayRequests: 0,
      todaysEscorts: 0,
      unassignedEscorts: 0,
      pendingAssignments: 0,
      threeDayEscorts: 0,
      newRequests: 0
    };
  }
}

/**
 * Convert a row array into an object using the provided column map.
 * @param {Array} row - The sheet row data.
 * @param {Object<string,number>} columnMap - Mapping of header name to index.
 * @return {Object} Row data as an object keyed by header.
 */
function mapRowToGenericObject(row, columnMap) {
  const obj = {};
  if (!row || !columnMap) return obj;
  for (const [header, idx] of Object.entries(columnMap)) {
    obj[header] = row[idx];
  }
  return obj;
}

/**
 * Get user management data for the dashboard
 */
function getUserManagementData() {
  try {
    console.log('📊 Getting user management data...');
    
    const riders = getRidersDataSafe() || [];
    const admins = getAdminUsersSafe() || [];
    const dispatchers = getDispatcherUsersSafe() || [];
    
    // Combine all users
    const allUsers = [];
    
    // Add riders
    riders.forEach(rider => {
      allUsers.push({
        id: rider.id || rider.jpNumber || rider['Rider ID'],
        name: rider.name || rider['Full Name'],
        email: rider.email || rider['Email'],
        googleEmail: rider.googleEmail || rider['Google Email'],
        role: 'Rider',
        status: rider.status || 'Unknown',
        avatar: (rider.name || 'R').charAt(0).toUpperCase(),
        lastLogin: rider.lastLogin || rider['Last Login'] || 'Unknown',
        type: 'rider'
      });
    });
    
    // Add admins
    admins.forEach((email, index) => {
      allUsers.push({
        id: 'admin_' + index,
        name: email.split('@')[0].replace(/[._]/g, ' '),
        email: email,
        googleEmail: email,
        role: 'Admin',
        status: 'Active',
        avatar: email.charAt(0).toUpperCase(),
        lastLogin: 'Unknown',
        type: 'admin'
      });
    });
    
    // Add dispatchers
    dispatchers.forEach((email, index) => {
      allUsers.push({
        id: 'dispatcher_' + index,
        name: email.split('@')[0].replace(/[._]/g, ' '),
        email: email,
        googleEmail: email,
        role: 'Dispatcher',
        status: 'Active',
        avatar: email.charAt(0).toUpperCase(),
        lastLogin: 'Unknown',
        type: 'dispatcher'
      });
    });
    
    // Calculate statistics
    const stats = {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(u => u.status === 'Active').length,
      pendingUsers: allUsers.filter(u => u.status === 'Pending').length,
      unmappedUsers: riders.filter(r => !r.googleEmail || r.googleEmail.trim() === '').length
    };
    
    return {
      success: true,
      stats: stats,
      users: allUsers
    };
    
  } catch (error) {
    console.error('❌ Error getting user management data:', error);
    return {
      success: false,
      error: error.message,
      stats: { totalUsers: 0, activeUsers: 0, pendingUsers: 0, unmappedUsers: 0 },
      users: []
    };
  }
}
/**
 * Extract name from email address as fallback
 */
function extractNameFromEmail(email) {
  if (!email) return 'User';
  
  try {
    // Get part before @
    const localPart = email.split('@')[0];
    
    // Split by dots or underscores and capitalize
    const nameParts = localPart.split(/[._]/).map(part => 
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    );
    
    return nameParts.join(' ');
  } catch (error) {
    return 'User';
  }
}
/**
 * 🔐 COMPLETE AUTHENTICATION FUNCTIONS
 * Add these to your Authentication.js file (or Code.js if you prefer)
 * These are the missing functions that are causing the errors
 */

/**
 * Main authentication and authorization function
 */
function authenticateAndAuthorizeUser() {
  try {
    console.log('🔐 authenticateAndAuthorizeUser called');
    
    // Get user session
    const userSession = getEnhancedUserSession();
    traceAuthFunction('authenticateAndAuthorizeUser->session', userSession.email, userSession.source);
    
    if (!userSession.hasEmail) {
      traceAuthFunction('authenticateAndAuthorizeUser', 'NO_EMAIL', 'no_session');
      return {
        success: false,
        error: 'NO_EMAIL',
        message: 'Please sign in with your Google account'
      };
    }
    
    // Check authorization
    const rider = getRiderByGoogleEmailSafe(userSession.email);
    const adminUsers = getAdminUsersSafe();
    const dispatcherUsers = getDispatcherUsersSafe();

    let userRole = 'unauthorized';
    let permissions = [];

    const isAdmin = adminUsers.includes(userSession.email);
    const isDispatcher = dispatcherUsers.includes(userSession.email);

    // If custom session provided role, trust it
    if (userSession.source === 'custom_session' && userSession.role) {
      userRole = userSession.role;
      if (userRole === 'admin') {
        permissions = ['view_all', 'edit_all', 'assign_riders', 'manage_users', 'view_reports'];
      } else if (userRole === 'dispatcher') {
        permissions = ['view_requests', 'create_requests', 'assign_riders', 'view_reports'];
      } else if (userRole === 'rider') {
        permissions = ['view_own_assignments', 'update_own_status'];
      }
      traceAuthFunction('authenticateAndAuthorizeUser->role', userSession.email, userRole + '(custom)');
    } else {
      // Prefer dispatcher role if user appears in both lists
      console.log('🔍 Checking admin users:', adminUsers);
      if (isDispatcher) {
        userRole = 'dispatcher';
        permissions = ['view_requests', 'create_requests', 'assign_riders', 'view_reports'];
        traceAuthFunction('authenticateAndAuthorizeUser->role', userSession.email, 'dispatcher');
      } else if (isAdmin) {
        userRole = 'admin';
        permissions = ['view_all', 'edit_all', 'assign_riders', 'manage_users', 'view_reports'];
        traceAuthFunction('authenticateAndAuthorizeUser->role', userSession.email, 'admin');
      } else if (rider && rider.status === 'Active') {
        userRole = 'rider';
        permissions = ['view_own_assignments', 'update_own_status'];
        traceAuthFunction('authenticateAndAuthorizeUser->role', userSession.email, 'rider');
      } else {
        traceAuthFunction('authenticateAndAuthorizeUser->role', userSession.email, 'unauthorized');
        return {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Your account is not authorized to access this system',
          userEmail: userSession.email,
          userName: userSession.name,
          user: {
            name: userSession.name || 'User',
            email: userSession.email,
            roles: ['unauthorized'],
            role: 'unauthorized',
            permissions: []
          }
        };
      }
    }
    
    const authenticatedUser = {
      name: userSession.name || rider?.name || 'User',
      email: userSession.email,
      role: userRole,
      roles: [userRole], // for backward compatibility with older code
      permissions: permissions,
      avatar: (userSession.name || rider?.name || 'U').charAt(0).toUpperCase()
    };
    
    traceAuthFunction('authenticateAndAuthorizeUser->final', authenticatedUser.email, `role:${userRole}`);
    
    return {
      success: true,
      user: authenticatedUser,
      rider: rider
    };
    
  } catch (error) {
    console.error('❌ Authentication error:', error);
    traceAuthFunction('authenticateAndAuthorizeUser->error', '', 'error: ' + error.message);
    return {
      success: false,
      error: 'AUTH_ERROR',
      message: 'Authentication system error: ' + error.message
    };
  }
}
function clearAuthTrace() {
  AUTH_TRACE = [];
  console.log('✅ Authentication trace cleared');
}

/**
 * Run a complete trace test
 
function runCompleteAuthTrace() {
  console.log('🔍 === RUNNING COMPLETE AUTH TRACE ===');
  
  // Clear previous trace
  clearAuthTrace();
  
  // Test the main authentication flow
  console.log('1. Testing doGet authentication flow...');
  try {
    const mockEvent = { parameter: { page: 'dashboard' } };
    const result = doGet(mockEvent);
    console.log('✅ doGet completed');
  } catch (error) {
    console.log('❌ doGet failed:', error.message);
  }
  
  // Test getCurrentUser directly
  console.log('\n2. Testing getCurrentUser directly...');
  try {
    const currentUser = getCurrentUser();
    console.log('✅ getCurrentUser completed:', currentUser.email);
  } catch (error) {
    console.log('❌ getCurrentUser failed:', error.message);
  }
  
  // Show the trace
  console.log('\n3. Authentication trace results:');
  viewAuthTrace();
  
  return AUTH_TRACE;
}
*/
/**
 * Function to view the authentication trace
 */
function viewAuthTrace() {
  console.log('🔍 === AUTHENTICATION TRACE ===');
  AUTH_TRACE.forEach((entry, index) => {
    console.log(`${index + 1}. ${entry.timestamp} | ${entry.function} -> ${entry.email} (${entry.source})`);
  });
  
  // Show jpsotraffic entries specifically
  const jpsotrafficEntries = AUTH_TRACE.filter(entry => entry.email === 'jpsotraffic@gmail.com');
  if (jpsotrafficEntries.length > 0) {
    console.log('\n🚨 JPSOTRAFFIC@GMAIL.COM ENTRIES:');
    jpsotrafficEntries.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.function} -> ${entry.source}`);
    });
  }
  
  return AUTH_TRACE;
}



/**
 * Extract name from email address as fallback
 */
function extractNameFromEmail(email) {
  if (!email) return 'User';
  
  try {
    const localPart = email.split('@')[0];
    const nameParts = localPart.split(/[._]/).map(part => 
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    );
    return nameParts.join(' ');
  } catch (error) {
    return 'User';
  }
}

/**
 * Safe wrapper for getting rider by Google email
 */
function getRiderByGoogleEmailSafe(email) {
  try {
    if (typeof getRiderByGoogleEmail === 'function') {
      return getRiderByGoogleEmail(email);
    }
    
    // Fallback: direct sheet access
    console.log('🔄 Using fallback rider lookup...');
    return getRiderByGoogleEmailFallback(email);
    
  } catch (error) {
    console.error('❌ Error in getRiderByGoogleEmailSafe:', error);
    return null;
  }
}

/**
 * Fallback method to get rider by Google email
 */
function getRiderByGoogleEmailFallback(email) {
  try {
    const ridersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.riders); // Use CONFIG
    if (!ridersSheet) {
      console.log('⚠️ Riders sheet not found: ' + CONFIG.sheets.riders); // Log with CONFIG name
      return null;
    }
    
    const data = ridersSheet.getDataRange().getValues();
    if (data.length < 2) return null;
    
    const headers = data[0];
    const emailCol = headers.indexOf(CONFIG.columns.riders.email); // Use CONFIG
    const googleEmailCol = headers.indexOf(CONFIG.columns.riders.googleEmail); // Use CONFIG
    const nameCol = headers.indexOf(CONFIG.columns.riders.name); // Use CONFIG
    const statusCol = headers.indexOf(CONFIG.columns.riders.status); // Use CONFIG
    const idCol = headers.indexOf(CONFIG.columns.riders.jpNumber); // Use CONFIG (jpNumber is 'Rider ID')
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const riderEmail = row[emailCol];
      const googleEmail = row[googleEmailCol];
      
      if (riderEmail === email || googleEmail === email) {
        return {
          id: row[idCol],
          name: row[nameCol],
          email: riderEmail,
          googleEmail: googleEmail,
          status: row[statusCol],
          row: i + 1
        };
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ Fallback rider lookup failed:', error);
    return null;
  }
}

/**
 * Safe wrapper for getting admin users
 */
function getAdminUsersSafe() {
  try {
    if (typeof getAdminUsers === 'function') {
      return getAdminUsers();
    }
    
    return getAdminUsersFallback();
    
  } catch (error) {
    console.error('❌ Error getting admin users:', error);
    return ['admin@example.com']; // Default fallback
  }
}

/**
 * Fallback method to get admin users
 */
function getAdminUsersFallback() {
  try {
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.settings); // Use CONFIG
    if (settingsSheet) {
      // Assuming admin emails are in a fixed range B2:B10 as CONFIG doesn't specify a column name.
      // For more flexibility, consider adding a CONFIG.columns.settings.adminEmailColumn
      // and then finding that column by header to read all its values.
      const adminRange = settingsSheet.getRange('B2:B10').getValues();
      const admins = adminRange.flat().filter(email => email && email.trim());
      if (admins.length > 0) return admins;
    }
  } catch (error) {
    console.log('⚠️ Could not read Settings sheet');
  }
  
  // Default admin emails - UPDATE THESE WITH YOUR ACTUAL ADMIN EMAILS!
  return [
    'admin@yourdomain.com',
    'jpsotraffic@gmail.com',
    'manager@yourdomain.com',
    // Add your actual admin email here:
    // 'your-email@gmail.com'
  ];
}

/**
 * Safe wrapper for getting dispatcher users
 */
function getDispatcherUsersSafe() {
  try {
    if (typeof getDispatcherUsers === 'function') {
      return getDispatcherUsers();
    }
    
    return getDispatcherUsersFallback();
    
  } catch (error) {
    console.error('❌ Error getting dispatcher users:', error);
    return [];
  }
}

/**
 * Fallback method to get dispatcher users
 */
function getDispatcherUsersFallback() {
  try {
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.settings); // Use CONFIG
    if (settingsSheet) {
      // Assuming dispatcher emails are in a fixed range C2:C10 as CONFIG doesn't specify a column name.
      // For more flexibility, consider adding a CONFIG.columns.settings.dispatcherEmailColumn
      // and then finding that column by header to read all its values.
      const dispatcherRange = settingsSheet.getRange('C2:C10').getValues();
      const dispatchers = dispatcherRange.flat().filter(email => email && email.trim());
      return dispatchers; // Return even if empty, fallback below will handle if no dispatchers found
    }
  } catch (error) {
    console.log('⚠️ Could not read Settings sheet for dispatchers');
  }
  
  // Default dispatcher emails if sheet/range is empty or fails
  return [
    'dispatcher@yourdomain.com'
    // Add dispatcher emails here
  ];
}

/**
 * Check file exists function
 */
function checkFileExists(fileName) {
  try {
    HtmlService.createHtmlOutputFromFile(fileName);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Safe wrapper for getting web app URL
 */
function getWebAppUrl() {
  try {
    return ScriptApp.getService().getUrl();
  } catch (error) {
    console.error('Error getting web app URL:', error);
    return '#';
  }
}

/**
 * Safe page access checking
 */
function checkPageAccessSafe(pageName, user, rider) {
  try {
    const rolePermissions = {
      admin: [
        'dashboard', 'requests', 'assignments', 'riders', 'notifications', 
        'reports', 'admin-schedule', 'user-management', 'auth-setup'
      ],
      dispatcher: [
        'dashboard', 'requests', 'assignments', 'notifications', 'reports'
      ],
      rider: [
        'dashboard', 'rider-schedule', 'my-assignments', 'my-profile'
      ]
    };
    
    const allowedPages = rolePermissions[user.role] || [];
    
    if (allowedPages.includes(pageName)) {
      return { allowed: true };
    }
    
    return { 
      allowed: false, 
      reason: `Access to ${pageName} is not allowed for ${user.role} role` 
    };
    
  } catch (error) {
    console.error('❌ Error in checkPageAccessSafe:', error);
    return { allowed: true }; // Default to allow to prevent lockouts
  }
}

/**
 * Update rider's last login timestamp
 */
function updateRiderLastLoginSafe(riderId) {
  try {
    if (!riderId) return;
    
    console.log(`📅 Updating last login for rider ${riderId}`);
    
    const ridersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riders');
    if (!ridersSheet) return;
    
    const data = ridersSheet.getDataRange().getValues();
    const headers = data[0];
    
    const idCol = headers.indexOf('Rider ID');
    const lastLoginCol = headers.indexOf('Last Login');
    
    if (idCol === -1) return;
    
    // Add Last Login column if it doesn't exist
    if (lastLoginCol === -1) {
      const newCol = headers.length + 1;
      ridersSheet.getRange(1, newCol).setValue('Last Login');
      
      // Find rider and update
      for (let i = 1; i < data.length; i++) {
        if (data[i][idCol] === riderId) {
          ridersSheet.getRange(i + 1, newCol).setValue(new Date());
          break;
        }
      }
    } else {
      // Update existing column
      for (let i = 1; i < data.length; i++) {
        if (data[i][idCol] === riderId) {
          ridersSheet.getRange(i + 1, lastLoginCol + 1).setValue(new Date());
          break;
        }
      }
    }
    
    console.log(`✅ Updated last login for rider ${riderId}`);
    
  } catch (error) {
    console.error('❌ Error updating last login:', error);
  }
}

/**
 * Create error pages with sign-in options
 */
function createErrorPageWithSignIn(error) {
  const webAppUrl = getWebAppUrlSafe();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Error - Escort Management</title>
    <style>
        body { 
            font-family: Arial, sans-serif; text-align: center; padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            background: rgba(255, 255, 255, 0.95); color: #333;
            padding: 40px; border-radius: 15px; max-width: 500px; margin: 0 auto;
        }
        .btn {
            background: #3498db; color: white; padding: 15px 30px;
            border: none; border-radius: 25px; font-size: 16px;
            cursor: pointer; text-decoration: none; display: inline-block; margin: 10px;
        }
        .error-details {
            background: #f8d7da; color: #721c24; padding: 15px;
            border-radius: 8px; margin: 20px 0; font-family: monospace;
            font-size: 12px; text-align: left;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏍️ Motorcycle Escort Management</h1>
        <h2>⚠️ System Error</h2>
        <p>An error occurred while loading the application.</p>
        
        <div class="error-details">
            Error: ${error.message || 'Unknown error'}
        </div>
        
        <a href="${webAppUrl}?action=signin" class="btn">🔄 Try Again</a>
        <a href="${webAppUrl}" class="btn">🏠 Home</a>
    </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('System Error')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Create access denied page
 */
function createAccessDeniedPage(reason, user) {
  return HtmlService.createHtmlOutput(`
<!DOCTYPE html>
<html>
<head>
    <title>Access Denied - Escort Management</title>
    <style>
        body { 
            font-family: Arial, sans-serif; text-align: center; padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; min-height: 100vh; margin: 0;
            display: flex; align-items: center; justify-content: center;
        }
        .container {
            background: rgba(255, 255, 255, 0.95); color: #333;
            padding: 40px; border-radius: 15px; max-width: 600px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        .btn {
            background: #3498db; color: white; padding: 15px 30px;
            border: none; border-radius: 25px; font-size: 16px;
            cursor: pointer; text-decoration: none; display: inline-block;
            margin: 10px; transition: all 0.3s ease;
        }
        .btn:hover { background: #2980b9; transform: translateY(-2px); }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏍️ Motorcycle Escort Management</h1>
        <h2>🚫 Access Denied</h2>
        <p>Hello ${user.name},</p>
        <p>${reason}</p>
        <p>Your role: <strong>${user.role}</strong></p>
        <a href="${getWebAppUrlSafe()}" class="btn">← Back to Dashboard</a>
    </div>
</body>
</html>
  `).setTitle('Access Denied');
}

/**
 * Simple test authentication function
 */
function testAuthenticationSimple() {
  try {
    console.log('🧪 Testing simple authentication...');
    
    const userSession = getEnhancedUserSession();
    console.log('1. User session:', userSession);
    
    if (userSession.hasEmail) {
      const authResult = authenticateAndAuthorizeUser();
      console.log('2. Authorization result:', authResult);
      
      return {
        success: true,
        userSession: userSession,
        authResult: authResult
      };
    } else {
      return {
        success: false,
        error: 'No user session found',
        userSession: userSession
      };
    }
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
/**
 * UPDATED doGet function with fixed user handling
 */
function doGet(e) {
  try {
    // Authentication
    if (e.parameter?.action === 'signin' || e.parameter?.action === 'login') {
      return createLoginPage();
    }

    const userSession = getEnhancedUserSession();
    if (!userSession.hasEmail) return createLoginPage();
    
    // Authorization
    const rider = getRiderByGoogleEmailSafe(userSession.email);
    const adminUsers = getAdminUsersSafe();
    const dispatcherUsers = getDispatcherUsersSafe();
    
    let userRole = 'unauthorized';
    if (adminUsers.includes(userSession.email)) userRole = 'admin';
    else if (dispatcherUsers.includes(userSession.email)) userRole = 'dispatcher';
    else if (rider?.status === 'Active') userRole = 'rider';
    else return createUnauthorizedPage(userSession.email, userSession.name);
    
    const user = {
      name: userSession.name || rider?.name || 'User',
      email: userSession.email,
      role: userRole,
      avatar: (userSession.name || rider?.name || 'U').charAt(0).toUpperCase()
    };
    
    // Page loading
    let pageName = e.parameter?.page || 'dashboard';
    let pageFile = pageName;
    
    if (userRole === 'admin' && pageName === 'dashboard') pageFile = 'admin-dashboard';
    else if (userRole === 'rider' && pageName === 'dashboard') pageFile = 'rider-dashboard';
    
    if (!checkFileExists(pageFile)) pageFile = 'index';
    
    let content = HtmlService.createHtmlOutputFromFile(pageFile).getContent();
    
    // Add navigation
    const navigation = getRoleBasedNavigationSafe(pageName, user, rider);
    content = content.replace('<!--NAVIGATION_MENU_PLACEHOLDER-->', navigation);
    
    // CLEAN: Add only essential user context
    const userScript = `<script>window.currentUser = ${JSON.stringify(user)};</script>`;
    
    if (content.includes('</body>')) {
      content = content.replace('</body>', userScript + '</body>');
    } else {
      content += userScript;
    }
    
    return HtmlService.createHtmlOutput(content).setTitle('Motorcycle Escort Management');
    
  } catch (error) {
    console.error('doGet error:', error);
    return createErrorPage(error.message);
  }
}

/**
 * Enhanced sign-in page that handles user detection better
 */
function createSignInPageEnhanced() {
  const webAppUrl = getWebAppUrlSafe();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In - Motorcycle Escort Management</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .signin-container {
            background: rgba(255, 255, 255, 0.95);
            color: #333;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            text-align: center;
            max-width: 500px;
            width: 90%;
        }
        .logo {
            font-size: 4rem;
            margin-bottom: 20px;
        }
        h1 {
            color: #2c3e50;
            margin-bottom: 10px;
        }
        h2 {
            color: #3498db;
            margin-bottom: 30px;
            font-weight: 300;
        }
        .signin-btn {
            background: #4285f4;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 25px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s ease;
            margin: 10px;
        }
        .signin-btn:hover {
            background: #3367d6;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(66, 133, 244, 0.3);
        }
        .google-icon {
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #4285f4;
            font-weight: bold;
        }
        .info {
            background: #e8f4f8;
            padding: 20px;
            border-radius: 10px;
            margin: 30px 0;
            border-left: 4px solid #3498db;
        }
        .debug-info {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            font-size: 12px;
            text-align: left;
            font-family: monospace;
        }
        .alternative-btn {
            background: #27ae60;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 15px;
            font-size: 14px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 5px;
        }
    </style>
</head>
<body>
    <div class="signin-container">
        <div class="logo">🏍️</div>
        <h1>Motorcycle Escort Management</h1>
        <h2>Google Sign In Required</h2>
        
        <div class="info">
            <p><strong>📋 Authentication Steps:</strong></p>
            <ol style="text-align: left;">
                <li>Click "Sign In with Google" below</li>
                <li>Choose your authorized Google account</li>
                <li>Grant necessary permissions</li>
                <li>Access your dashboard</li>
            </ol>
        </div>
        
        <!-- Primary Sign-In Method -->
        <a href="${webAppUrl}" class="signin-btn">
            <div class="google-icon">G</div>
            Sign In with Google
        </a>
        
        <!-- Debug Information -->
        <div class="debug-info">
            <strong>🔧 Debug Info:</strong><br>
            <span id="debugInfo">Loading...</span>
        </div>
        
        <!-- Alternative Methods -->
        <div style="margin: 20px 0;">
            <p><strong>Alternative access methods:</strong></p>
            <a href="${webAppUrl}?t=${Date.now()}" class="alternative-btn">🔄 Force Reload</a>
            <a href="${webAppUrl}" class="alternative-btn" target="_blank">🆕 New Window</a>
            <button class="alternative-btn" onclick="testUserSession()">🧪 Test Session</button>
        </div>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
            Having trouble? Try refreshing the page or using a different browser.
        </p>
    </div>
    
    <script>
        function handleSignIn() {
            // OAuth prompt occurs automatically when visiting the web app.
        }
        
        function testUserSession() {
            document.getElementById('debugInfo').innerHTML = 'Testing user session...';
            
            // This will trigger a new request to test authentication
            fetch('${webAppUrl}?test=session&t=' + Date.now())
                .then(response => response.text())
                .then(data => {
                    if (data.includes('dashboard') || data.includes('requests')) {
                        document.getElementById('debugInfo').innerHTML = '✅ Session active - redirecting...';
                        setTimeout(() => window.location.href = '${webAppUrl}', 1000);
                    } else {
                        document.getElementById('debugInfo').innerHTML = '❌ No active session';
                    }
                })
                .catch(error => {
                    document.getElementById('debugInfo').innerHTML = '⚠️ Test failed: ' + error.message;
                });
        }
        
        // Auto-detect current state
        document.addEventListener('DOMContentLoaded', function() {
            const debugInfo = document.getElementById('debugInfo');
            debugInfo.innerHTML = 'User Agent: ' + navigator.userAgent.substring(0, 50) + '...';
            
            // Try to detect if we're in an iframe or popup
            if (window !== window.top) {
                debugInfo.innerHTML += '<br>📱 In iframe/popup';
            } else {
                debugInfo.innerHTML += '<br>🖥️ Full window';
            }
            
            // Check if we have any stored auth info
            if (localStorage.getItem) {
                try {
                    const stored = localStorage.getItem('lastSignIn');
                    if (stored) {
                        debugInfo.innerHTML += '<br>💾 Previous sign-in detected';
                    }
                } catch (e) {
                    debugInfo.innerHTML += '<br>🚫 Local storage unavailable';
                }
            }
        });
    </script>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('Sign In - Escort Management')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Simple login page for hybrid authentication
function createLoginPage() {
  try {
    return HtmlService.createHtmlOutputFromFile('login')
      .setTitle('Login - Escort Management')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (e) {
    console.error('Error creating login page:', e);
    return HtmlService.createHtmlOutput('Unable to load login page.');
  }
}

// 🛡️ ADDITIONAL SAFE WRAPPER FUNCTIONS

function getWebAppUrlSafe() {
  try {
    if (typeof getWebAppUrl === 'function') {
      return getWebAppUrl();
    }
    return ScriptApp.getService().getUrl();
  } catch (error) {
    console.error('Error getting web app URL:', error);
    return '#';
  }
}

function getPageFileNameSafe(pageName, userRole) {
  try {
    if (typeof getPageFileName === 'function') {
      return getPageFileName(pageName, userRole);
    }
    
    // Fallback mapping
    const pageMap = {
      'dashboard': 'index',
      'requests': 'requests',
      'assignments': 'assignments',
      'riders': 'riders',
      'notifications': 'notifications',
      'reports': 'reports'
    };
    
    return pageMap[pageName] || 'index';
    
  } catch (error) {
    console.error('Error getting page file name:', error);
    return 'index';
  }
}

function addNavigationToContentSafe(content, navigationHtml) {
  try {
    console.log('addNavigationToContentSafe: Called. Navigation HTML length: ' + (navigationHtml ? navigationHtml.length : 'null')); // Added
    console.log('addNavigationToContentSafe: Placeholder found: ' + content.includes('<!--NAVIGATION_MENU_PLACEHOLDER-->')); // Added
    console.log('addNavigationToContentSafe: Header end found: ' + content.includes('</header>')); // Added
    const originalContentLength = content.length; // Store original length
    console.log('addNavigationToContentSafe: Content length before: ' + originalContentLength); // Added

    // Check if a more specific addNavigationToContent exists and is not this function itself
    if (typeof addNavigationToContent === 'function' && addNavigationToContent.toString() !== addNavigationToContentSafe.toString()) {
      content = addNavigationToContent(content, navigationHtml);
      console.log('addNavigationToContentSafe: Content length after (delegated to addNavigationToContent): ' + content.length); // Added
      return content;
    }
    
    // Simple fallback injection
    if (content.includes('<!--NAVIGATION_MENU_PLACEHOLDER-->')) {
      content = content.replace('<!--NAVIGATION_MENU_PLACEHOLDER-->', navigationHtml);
    } else if (content.includes('</header>')) {
      content = content.replace('</header>', `</header>\n${navigationHtml}\n`);
    }
    // If no specific placeholder, try to append before </body> or at the end
    else if (content.includes('</body>')) {
        content = content.replace('</body>', navigationHtml + '\n</body>');
    } else {
        content += navigationHtml;
    }
    console.log('addNavigationToContentSafe: Content length after (fallback injection): ' + content.length); // Added
    
    return content;
    
  } catch (error) {
    console.error('Error adding navigation to content:', error);
    return content; // Return original content on error
  }
}

function addUserDataInjectionSafe(htmlOutput, user, rider) { // Changed signature
  try {
    if (typeof addUserDataInjection === 'function' && addUserDataInjection.toString().includes("htmlOutput")) { // Basic check if it's already the new version
      return addUserDataInjection(htmlOutput, user, rider); // Call the potentially overridden new version
    }

    // Restore userScript to define window.currentUser
    const userScript = `
<script>
window.currentUser = {
  name: '${escapeJsString(user.name)}',
  email: '${escapeJsString(user.email)}',
  role: '${escapeJsString(user.role)}',
  permissions: ${JSON.stringify(user.permissions)},
  riderId: '${rider ? escapeJsString(rider.id) : ''}',
  isRider: ${rider ? 'true' : 'false'}
};
console.log('👤 User context loaded via addUserDataInjectionSafe (appended).');
</script>`;

    let content = htmlOutput.getContent();
    if (content.includes('</body>')) {
      content = content.replace('</body>', userScript + '\n</body>');
    } else if (content.includes('</html>')) {
      content = content.replace('</html>', userScript + '\n</html>');
    } else {
      content += userScript;
    }

    htmlOutput.setContent(content);
    // No return needed, or return htmlOutput if preferred by other parts of the system

  } catch (error) {
    console.error('Error adding user data injection:', error);
    // Potentially return htmlOutput or throw, depending on error handling strategy
  }
}

function createErrorPageWithSignInSafe(error) {
  try {
    if (typeof createErrorPageWithSignIn === 'function') {
      return createErrorPageWithSignIn(error);
    }
    
    return createSignInPageEnhanced();
    
  } catch (e) {
    console.error('Error creating error page:', e);
    return HtmlService.createHtmlOutput('System Error - Please contact administrator');
  }
}

/**
 * Test function to debug user session issues
 */
function debugUserSession() {
  console.log('🧪 Debugging user session...');
  
  const session = getEnhancedUserSession();
  console.log('Enhanced session result:', session);
  
  try {
    const user = Session.getActiveUser();
    console.log('Raw user object type:', typeof user);
    console.log('Raw user object:', user);
    
    if (user) {
      console.log('Available methods:');
      console.log('- getEmail:', typeof user.getEmail);
      console.log('- getName:', typeof user.getName);
      console.log('- email property:', user.email);
      console.log('- name property:', user.name);
    }
  } catch (error) {
    console.error('Error debugging session:', error);
  }
  
  return session;
}
/**
 * Check if user has specific permission
 */
function hasPermission(user, resource, action) {
  try {
    if (!user || !user.role) {
      console.log('❌ No user or role provided');
      return false;
    }
    
    const rolePermissions = PERMISSIONS_MATRIX[user.role];
    if (!rolePermissions) {
      console.log(`❌ Unknown role: ${user.role}`);
      return false;
    }
    
    const resourcePermissions = rolePermissions[resource];
    if (!resourcePermissions) {
      console.log(`❌ No permissions defined for resource: ${resource}`);
      return false;
    }
    
    const hasAccess = resourcePermissions[action] === true;
    console.log(`🔒 Permission check: ${user.role} -> ${resource}.${action} = ${hasAccess}`);
    
    return hasAccess;
    
  } catch (error) {
    console.error('❌ Permission check error:', error);
    return false;
  }
}

/**
 * Check if user can access specific resource instance
 */
function canAccessResource(user, resource, resourceId) {
  try {
    if (!user || !user.role) return false;
    
    const accessCheck = RESOURCE_ACCESS[resource];
    if (!accessCheck) return false;
    
    const roleCheck = accessCheck[user.role];
    if (!roleCheck) return false;
    
    return roleCheck(user, resourceId);
    
  } catch (error) {
    console.error('❌ Resource access check error:', error);
    return false;
  }
}

/**
 * Check if user can access a specific page
 */
function canAccessPage(user, pageName) {
  try {
    if (!user || !user.role) return false;
    
    const rolePermissions = PERMISSIONS_MATRIX[user.role];
    if (!rolePermissions || !rolePermissions.pages) return false;
    
    return rolePermissions.pages.includes(pageName);
    
  } catch (error) {
    console.error('❌ Page access check error:', error);
    return false;
  }
}

/**
 * Get filtered data based on user permissions
 */
function getFilteredRequests(user, filters = {}) {
  try {
    const allRequests = getRequestsData();
    
    if (hasPermission(user, 'requests', 'view_all')) {
      // Admin/Dispatcher can see all requests
      return applyFilters(allRequests, filters);
    } else if (user.role === 'rider') {
      // Riders can only see requests they're assigned to
      const riderAssignments = getAssignmentsForRider(user.riderId);
      const assignedRequestIds = riderAssignments.map(a => a.requestId);
      
      const filteredRequests = allRequests.filter(request => 
        assignedRequestIds.includes(request.id)
      );
      
      return applyFilters(filteredRequests, filters);
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ Error filtering requests:', error);
    return [];
  }
}

/**
 * Get filtered riders based on user permissions
 */
function getFilteredRiders(user) {
  try {
    const allRiders = getRidersData();
    
    if (hasPermission(user, 'riders', 'view_all')) {
      // Admin/Dispatcher can see all riders
      return allRiders;
    } else if (user.role === 'rider') {
      // Riders can only see their own profile
      return allRiders.filter(rider => rider.id === user.riderId);
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ Error filtering riders:', error);
    return [];
  }
}

/**
 * Get filtered assignments based on user permissions
 */
function getFilteredAssignments(user, filters = {}) {
  try {
    const allAssignments = getAssignmentsData();
    
    if (hasPermission(user, 'assignments', 'view_all')) {
      // Admin/Dispatcher can see all assignments
      return applyFilters(allAssignments, filters);
    } else if (user.role === 'rider') {
      // Riders can only see their own assignments
      const filteredAssignments = allAssignments.filter(assignment => 
        assignment.riderId === user.riderId
      );
      
      return applyFilters(filteredAssignments, filters);
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ Error filtering assignments:', error);
    return [];
  }
}

/**
 * Validate request data based on user permissions
 */
function validateRequestOperation(user, operation, requestData, requestId = null) {
  try {
    // Check if user has permission for this operation
    if (!hasPermission(user, 'requests', operation)) {
      return { 
        valid: false, 
        error: `You don't have permission to ${operation} requests` 
      };
    }
    
    // For updates/deletes, check if user can access this specific request
    if ((operation === 'update' || operation === 'delete') && requestId) {
      if (!canAccessResource(user, 'requests', requestId)) {
        return { 
          valid: false, 
          error: 'You cannot access this request' 
        };
      }
    }
    
    // Additional validation based on role
    if (user.role === 'dispatcher' && operation === 'delete') {
      return { 
        valid: false, 
        error: 'Dispatchers cannot delete requests' 
      };
    }
    
    return { valid: true };
    
  } catch (error) {
    console.error('❌ Request validation error:', error);
    return { valid: false, error: 'Validation error occurred' };
  }
}

/**
 * Validate assignment operation based on user permissions
 */
function validateAssignmentOperation(user, operation, assignmentData, assignmentId = null) {
  try {
    if (!hasPermission(user, 'assignments', operation)) {
      return { 
        valid: false, 
        error: `You don't have permission to ${operation} assignments` 
      };
    }
    
    // Riders can only update status of their own assignments
    if (user.role === 'rider' && operation === 'update') {
      if (!assignmentId || !canAccessResource(user, 'assignments', assignmentId)) {
        return { 
          valid: false, 
          error: 'You can only update your own assignments' 
        };
      }
      
      // Riders can only update status, not other fields
      const allowedFields = ['status', 'notes', 'completionDate'];
      const updateFields = Object.keys(assignmentData);
      const invalidFields = updateFields.filter(field => !allowedFields.includes(field));
      
      if (invalidFields.length > 0) {
        return { 
          valid: false, 
          error: `You can only update: ${allowedFields.join(', ')}` 
        };
      }
    }
    
    return { valid: true };
    
  } catch (error) {
    console.error('❌ Assignment validation error:', error);
    return { valid: false, error: 'Validation error occurred' };
  }
}

/**
 * Get user's dashboard data based on permissions
 */
function getDashboardDataForUser(user) {
  try {
    const dashboardData = {
      user: user,
      stats: {},
      recentActivity: [],
      notifications: []
    };
    
    if (user.role === 'admin') {
      dashboardData.stats = {
        totalRequests: getRequestsData().length,
        activeRiders: getRidersData().filter(r => r.status === 'Active').length,
        pendingAssignments: getAssignmentsData().filter(a => a.status === 'Pending').length,
        completedThisMonth: getCompletedRequestsThisMonth()
      };
      dashboardData.recentActivity = getRecentSystemActivity();
      dashboardData.notifications = getSystemNotifications();
      
    } else if (user.role === 'dispatcher') {
      dashboardData.stats = {
        totalRequests: getRequestsData().length,
        pendingAssignments: getAssignmentsData().filter(a => a.status === 'Pending').length,
        todaysEscorts: getTodaysEscorts(),
        availableRiders: getAvailableRiders().length
      };
      dashboardData.recentActivity = getRecentDispatchActivity();
      dashboardData.notifications = getDispatchNotifications();
      
    } else if (user.role === 'rider') {
      const myAssignments = getAssignmentsForRider(user.riderId);
      dashboardData.stats = {
        myAssignments: myAssignments.length,
        pendingAssignments: myAssignments.filter(a => a.status === 'Pending').length,
        completedThisMonth: myAssignments.filter(a => 
          a.status === 'Completed' && 
          isThisMonth(a.completionDate)
        ).length,
        nextEscort: getNextEscortForRider(user.riderId)
      };
      dashboardData.recentActivity = getRiderActivity(user.riderId);
      dashboardData.notifications = getRiderNotifications(user.riderId);
    }
    
    return dashboardData;
    
  } catch (error) {
    console.error('❌ Error getting dashboard data:', error);
    return { user: user, stats: {}, recentActivity: [], notifications: [] };
  }
}

/**
 * Apply filters to data arrays
 */
function applyFilters(data, filters) {
  try {
    let filteredData = [...data];
    
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value && value !== '') {
        filteredData = filteredData.filter(item => {
          if (typeof item[key] === 'string') {
            return item[key].toLowerCase().includes(value.toLowerCase());
          }
          return item[key] === value;
        });
      }
    });
    
    return filteredData;
    
  } catch (error) {
    console.error('❌ Error applying filters:', error);
    return data;
  }
}

/**
 * Get user's allowed navigation menu
 */
function getUserNavigationMenu(user) {
  try {
    const rolePermissions = PERMISSIONS_MATRIX[user.role];
    if (!rolePermissions || !rolePermissions.pages) {
      return [];
    }
    
    const pageLabels = {
      'dashboard': '📊 Dashboard',
      'requests': '📋 Requests',
      'assignments': '🏍️ Assignments',
      'riders': '👥 Riders',
      'notifications': '📱 Notifications',
      'reports': '📊 Reports',
      'rider-schedule': '📅 My Schedule',
      'my-assignments': '🏍️ My Assignments',
      'my-profile': '👤 My Profile',
      'rider-availability': '🗓️ Availability',
      'admin-schedule': '📅 Admin Schedule',
      'settings': '⚙️ Settings'
    };
    
    const baseUrl = getWebAppUrlSafe();
    const usingLocal = !baseUrl || baseUrl === '#';

    return rolePermissions.pages.map(page => {
      const url = usingLocal
        ? (page === 'dashboard' ? 'index.html' : page + '.html')
        : `${baseUrl}${page === 'dashboard' ? '' : '?page=' + page}`;

      return {
        page: page,
        label: pageLabels[page] || page,
        url: url
      };
    });
    
  } catch (error) {
    console.error('❌ Error getting navigation menu:', error);
    return [];
  }
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PERMISSIONS_MATRIX,
    RESOURCE_ACCESS,
    hasPermission,
    canAccessResource,
    canAccessPage,
    getFilteredRequests,
    getFilteredRiders,
    getFilteredAssignments,
    validateRequestOperation,
    validateAssignmentOperation,
    getDashboardDataForUser,
    getUserNavigationMenu
  };
}

/**
 * Test function to debug navigation and verify availability link is included
 */
function testNavigationWithAvailability() {
  try {
    console.log('=== TESTING NAVIGATION WITH AVAILABILITY LINK ===');
    
    // Test for each user role
    const testUsers = [
      { name: 'Test Admin', email: 'admin@test.com', role: 'admin' },
      { name: 'Test Dispatcher', email: 'dispatcher@test.com', role: 'dispatcher' },
      { name: 'Test Rider', email: 'rider@test.com', role: 'rider' }
    ];
    
    testUsers.forEach(user => {
      console.log(`\n--- Testing navigation for ${user.role.toUpperCase()} ---`);
      
      // Test getUserNavigationMenu first
      const menuItems = getUserNavigationMenu(user);
      console.log(`Menu items count: ${menuItems.length}`);
      console.log(`Pages included: ${menuItems.map(item => item.page).join(', ')}`);
      
      const hasAvailability = menuItems.some(item => item.page === 'rider-availability');
      console.log(`Has availability link: ${hasAvailability ? '✅ YES' : '❌ NO'}`);
      
      if (hasAvailability) {
        const availItem = menuItems.find(item => item.page === 'rider-availability');
        console.log(`Availability item: ${availItem.label} -> ${availItem.url}`);
      }
      
      // Test full navigation HTML generation
      const navHtml = getRoleBasedNavigation('dashboard', user, null);
      console.log(`Navigation HTML length: ${navHtml.length} chars`);
      
      const htmlHasAvailability = navHtml.includes('rider-availability') && navHtml.includes('🗓️ Availability');
      console.log(`HTML includes availability: ${htmlHasAvailability ? '✅ YES' : '❌ NO'}`);
      
      if (htmlHasAvailability) {
        // Extract just the availability link from the HTML
        const availMatch = navHtml.match(/<a[^>]*rider-availability[^>]*>.*?<\/a>/);
        if (availMatch) {
          console.log(`Availability link HTML: ${availMatch[0]}`);
        }
      }
    });
    
    console.log('\n=== PERMISSIONS MATRIX CHECK ===');
    Object.keys(PERMISSIONS_MATRIX).forEach(role => {
      const pages = PERMISSIONS_MATRIX[role].pages || [];
      const hasAvail = pages.includes('rider-availability');
      console.log(`${role}: ${hasAvail ? '✅' : '❌'} rider-availability in pages`);
      if (hasAvail) {
        console.log(`  ${role} pages: [${pages.join(', ')}]`);
      }
    });
    
    console.log('\n=== TESTING COMPLETE ===');
    
    return {
      success: true,
      message: 'Navigation test completed. Check console logs for details.'
    };
    
  } catch (error) {
    console.error('❌ Navigation test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Quick fix function to ensure availability link appears
 */
function forceAvailabilityLinkInNavigation() {
  try {
    console.log('🔧 Force adding availability link to navigation...');
    
    // Test current navigation generation
    const testUser = { name: 'Test User', email: 'test@test.com', role: 'rider' };
    const currentNav = getRoleBasedNavigation('dashboard', testUser, null);
    
    console.log('Current navigation for rider:');
    console.log(currentNav);
    
    const hasAvailability = currentNav.includes('rider-availability');
    console.log(`Current navigation has availability: ${hasAvailability ? '✅ YES' : '❌ NO'}`);
    
    if (!hasAvailability) {
      console.log('⚠️ Availability link missing! Check PERMISSIONS_MATRIX configuration.');
      
      // Show what pages are currently allowed for rider
      const riderPages = PERMISSIONS_MATRIX.rider?.pages || [];
      console.log('Rider allowed pages:', riderPages);
      
      // Check if availability is in the list
      const hasAvailInConfig = riderPages.includes('rider-availability');
      console.log(`rider-availability in config: ${hasAvailInConfig ? '✅ YES' : '❌ NO'}`);
      
      if (!hasAvailInConfig) {
        console.log('❌ PROBLEM: rider-availability not in PERMISSIONS_MATRIX.rider.pages');
      }
    }
    
    return {
      success: hasAvailability,
      currentNavigation: currentNav,
      hasAvailabilityLink: hasAvailability
    };
    
  } catch (error) {
    console.error('❌ Force availability link test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}


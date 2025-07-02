/**
 * DASHBOARD OPTIMIZATION - Google Apps Script
 * Optimized backend functions to resolve loading issues
 * Place this in your Google Apps Script project
 */

/**
 * Optimized getCurrentUser function with faster response
 */
function getCurrentUserOptimized() {
  try {
    console.log('🚀 getCurrentUserOptimized called');
    
    // Try immediate session first (fastest path)
    const user = Session.getActiveUser();
    const email = user.getEmail();
    
    if (email && email.trim()) {
      console.log('✅ Got user email immediately:', email);
      
      // Quick role determination
      const role = determineUserRoleQuick(email);
      
      return {
        name: extractNameFromEmail(email),
        email: email,
        role: role,
        roles: [role],
        permissions: getPermissionsForRole(role),
        success: true
      };
    }
    
    // If no email, return guest immediately
    console.log('⚠️ No email found, returning guest user');
    return {
      name: 'Guest User',
      email: '',
      role: 'guest',
      roles: ['guest'],
      permissions: ['view'],
      success: false
    };
    
  } catch (error) {
    console.error('❌ Error in getCurrentUserOptimized:', error);
    return {
      name: 'System User',
      email: '',
      role: 'guest',
      roles: ['guest'],
      permissions: ['view'],
      success: false
    };
  }
}

/**
 * Quick user role determination without complex sheet reads
 */
function determineUserRoleQuick(email) {
  try {
    // Hardcoded admin emails for speed (can be updated as needed)
    const adminEmails = [
      'dashort@gmail.com',
      'jpsotraffic@gmail.com',
      'admin@yourdomain.com'
    ];
    
    const dispatcherEmails = [
      'dispatcher@example.com',
      'jpdispatcher100@gmail.com'
    ];
    
    if (adminEmails.includes(email)) {
      return 'admin';
    } else if (dispatcherEmails.includes(email)) {
      return 'dispatcher';
    } else {
      // Check if user is in riders sheet (simplified)
      try {
        const ridersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riders');
        if (ridersSheet) {
          const emailColumn = ridersSheet.getRange('H:H').getValues().flat(); // Assuming email is in column H
          if (emailColumn.includes(email)) {
            return 'rider';
          }
        }
      } catch (e) {
        console.log('⚠️ Could not check riders sheet:', e.message);
      }
      
      return 'guest';
    }
  } catch (error) {
    console.error('❌ Error determining role:', error);
    return 'guest';
  }
}

/**
 * Get permissions for a role quickly
 */
function getPermissionsForRole(role) {
  const rolePermissions = {
    admin: ['view_all', 'edit_all', 'assign_riders', 'manage_users', 'view_reports'],
    dispatcher: ['view_requests', 'create_requests', 'assign_riders', 'view_reports'],
    rider: ['view_own_assignments', 'update_own_status'],
    guest: ['view']
  };
  
  return rolePermissions[role] || ['view'];
}

/**
 * Optimized admin dashboard data function with caching
 */
function getAdminDashboardDataOptimized() {
  try {
    console.log('📊 getAdminDashboardDataOptimized called');
    
    // Try to use cached data if available and fresh (under 2 minutes old)
    const cachedData = getCachedDashboardData();
    if (cachedData) {
      console.log('✅ Using cached dashboard data');
      return cachedData;
    }
    
    // Calculate stats with minimal sheet access
    const quickStats = calculateQuickDashboardStats();
    
    // Cache the result
    cacheDashboardData(quickStats);
    
    console.log('✅ Dashboard data calculated and cached');
    return quickStats;
    
  } catch (error) {
    console.error('❌ Error in getAdminDashboardDataOptimized:', error);
    return getDefaultDashboardStats();
  }
}

/**
 * Calculate dashboard stats with optimized sheet access
 */
function calculateQuickDashboardStats() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // Get sheet data in batch (faster than individual calls)
    const sheets = {
      requests: spreadsheet.getSheetByName('Requests'),
      riders: spreadsheet.getSheetByName('Riders'),
      assignments: spreadsheet.getSheetByName('Assignments')
    };
    
    let stats = {
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
    
    // Count requests quickly
    if (sheets.requests) {
      try {
        const requestsData = sheets.requests.getDataRange().getValues();
        stats.totalRequests = Math.max(0, requestsData.length - 1); // Subtract header
        
        // Count new requests (assuming status is in column C)
        stats.newRequests = requestsData.slice(1).filter(row => 
          String(row[2] || '').trim().toLowerCase() === 'new'
        ).length;
      } catch (e) {
        console.log('⚠️ Error counting requests:', e.message);
      }
    }
    
    // Count riders quickly
    if (sheets.riders) {
      try {
        const ridersData = sheets.riders.getDataRange().getValues();
        const activeRiders = ridersData.slice(1).filter(row => 
          String(row[6] || '').trim().toLowerCase() === 'active' || // Assuming status is in column G
          String(row[6] || '').trim() === ''
        ).length;
        stats.totalRiders = activeRiders;
      } catch (e) {
        console.log('⚠️ Error counting riders:', e.message);
      }
    }
    
    // Count assignments quickly
    if (sheets.assignments) {
      try {
        const assignmentsData = sheets.assignments.getDataRange().getValues();
        stats.totalAssignments = Math.max(0, assignmentsData.length - 1);
        
        const today = new Date();
        const todayStr = today.toDateString();
        
        // Count today's assignments (assuming event date is in column E)
        stats.todaysEscorts = assignmentsData.slice(1).filter(row => {
          const eventDate = row[4]; // Column E
          return eventDate && new Date(eventDate).toDateString() === todayStr;
        }).length;
        
      } catch (e) {
        console.log('⚠️ Error counting assignments:', e.message);
      }
    }
    
    console.log('📊 Calculated stats:', stats);
    return stats;
    
  } catch (error) {
    console.error('❌ Error calculating quick stats:', error);
    return getDefaultDashboardStats();
  }
}

/**
 * Cache dashboard data
 */
function cacheDashboardData(data) {
  try {
    const cache = {
      data: data,
      timestamp: new Date().getTime()
    };
    
    PropertiesService.getScriptProperties().setProperty(
      'DASHBOARD_CACHE',
      JSON.stringify(cache)
    );
    
    console.log('✅ Dashboard data cached successfully');
  } catch (error) {
    console.log('⚠️ Failed to cache dashboard data:', error.message);
  }
}

/**
 * Get cached dashboard data if fresh
 */
function getCachedDashboardData() {
  try {
    const cachedString = PropertiesService.getScriptProperties().getProperty('DASHBOARD_CACHE');
    if (!cachedString) {
      return null;
    }
    
    const cached = JSON.parse(cachedString);
    const now = new Date().getTime();
    const cacheAge = now - cached.timestamp;
    
    // Cache is valid for 2 minutes (120,000 milliseconds)
    if (cacheAge < 120000) {
      console.log('✅ Using cached dashboard data (age:', Math.round(cacheAge / 1000), 'seconds)');
      return cached.data;
    } else {
      console.log('⚠️ Dashboard cache expired (age:', Math.round(cacheAge / 1000), 'seconds)');
      return null;
    }
  } catch (error) {
    console.log('⚠️ Error reading dashboard cache:', error.message);
    return null;
  }
}

/**
 * Default dashboard stats for fallback
 */
function getDefaultDashboardStats() {
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

/**
 * Optimized page data function for main dashboard
 */
function getPageDataForDashboardOptimized() {
  try {
    console.log('🚀 getPageDataForDashboardOptimized called');
    
    // Get user info quickly
    const user = getCurrentUserOptimized();
    
    // Get dashboard stats (use cached if available)
    const stats = {
      activeRiders: 0,
      newRequests: 0,
      todayAssignments: 0,
      weekAssignments: 0
    };
    
    // Try to get quick stats
    try {
      const adminStats = getAdminDashboardDataOptimized();
      stats.activeRiders = adminStats.totalRiders || 0;
      stats.newRequests = adminStats.newRequests || 0;
      stats.todayAssignments = adminStats.todaysEscorts || 0;
      stats.weekAssignments = adminStats.totalAssignments || 0;
    } catch (e) {
      console.log('⚠️ Could not get admin stats, using defaults');
    }
    
    // Return minimal data set for speed
    const result = {
      success: true,
      user: user,
      stats: stats,
      recentRequests: [], // Empty for speed - will be loaded separately if needed
      upcomingAssignments: [], // Empty for speed - will be loaded separately if needed
      notifications: [] // Empty for speed - will be loaded separately if needed
    };
    
    console.log('✅ Optimized page data prepared');
    return result;
    
  } catch (error) {
    console.error('❌ Error in getPageDataForDashboardOptimized:', error);
    
    // Return safe fallback
    return {
      success: false,
      user: {
        name: 'System User',
        email: '',
        role: 'guest',
        roles: ['guest'],
        permissions: ['view']
      },
      stats: {
        activeRiders: 0,
        newRequests: 0,
        todayAssignments: 0,
        weekAssignments: 0
      },
      recentRequests: [],
      upcomingAssignments: [],
      notifications: []
    };
  }
}

/**
 * Clear dashboard cache (useful for debugging)
 */
function clearDashboardCache() {
  try {
    PropertiesService.getScriptProperties().deleteProperty('DASHBOARD_CACHE');
    console.log('✅ Dashboard cache cleared');
    return { success: true, message: 'Cache cleared successfully' };
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Extract name from email address
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
 * Test function to verify optimizations work
 */
function testDashboardOptimizations() {
  console.log('🧪 Testing dashboard optimizations...');
  
  try {
    // Test user function
    console.log('1. Testing getCurrentUserOptimized...');
    const user = getCurrentUserOptimized();
    console.log('✅ User result:', user);
    
    // Test dashboard data
    console.log('2. Testing getAdminDashboardDataOptimized...');
    const adminData = getAdminDashboardDataOptimized();
    console.log('✅ Admin data result:', adminData);
    
    // Test page data
    console.log('3. Testing getPageDataForDashboardOptimized...');
    const pageData = getPageDataForDashboardOptimized();
    console.log('✅ Page data result:', pageData);
    
    return {
      success: true,
      user: user,
      adminData: adminData,
      pageData: pageData
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
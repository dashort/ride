function clearDataCache() {
  dataCache.clear();
  logActivity('Custom dataCache completely cleared');
}

/**
 * Clears cached data related to the "Requests" sheet.
 * This primarily targets the custom dataCache used by getSheetData.
 * It also clears specific filtered request keys from CacheService.getScriptCache() if they are used.
 */
function clearRequestsCache() {
  // Clear from custom dataCache
  dataCache.clear('sheet_Requests');
  logActivity('Custom dataCache cleared for sheet_Requests');

  // Clear related items from CacheService.getScriptCache()
  // These keys seem to be for filtered/processed data, not raw sheet data from getSheetData.
  // Keep them if other parts of the application set/use them.
  const scriptCache = CacheService.getScriptCache();
  const statusFilters = ['All', 'New', 'Pending', 'Assigned', 'Unassigned', 'In Progress', 'Completed', 'Cancelled'];
  const keysToRemove = statusFilters.map(status => `filteredRequests_${status}`);
  
  // remove 'cached_Requests' if it was meant for CacheService and is different from dataCache's 'sheet_Requests'
  // keysToRemove.push('cached_Requests'); // This key seems redundant if getSheetData uses dataCache exclusively.
                                        // For now, assume it might be used by something else, but ideally phase out.

  scriptCache.removeAll(keysToRemove);
  if (keysToRemove.length > 0) {
    logActivity(`Cleared from ScriptCache: ${keysToRemove.join(', ')}`);
  }
  logActivity('Requests cache clearing process completed');
}

/**
 * Clears caches relevant to the dashboard.
 * This includes the entire custom dataCache (as dashboard uses multiple sheets)
 * and specific dashboard-related keys from CacheService.getScriptCache().
 */
function clearDashboardCache() {
  // Clear the entire custom dataCache
  dataCache.clear(); // This clears sheet_Requests, sheet_Assignments, sheet_Riders etc.
  logActivity('Custom dataCache completely cleared (for dashboard refresh)');

  // Clear dashboard-specific keys from CacheService.getScriptCache()
  const scriptCache = CacheService.getScriptCache();
  const dashboardCacheKeys = [
    'dashboardData',      // Potentially for cached results of calculateDashboardStatistics
    'cached_Dashboard',   // Generic key, unclear if used by current scope
    // 'cached_Riders',   // Redundant if getSheetData('Riders',...) uses dataCache via sheet_Riders
    // 'cached_Assignments',// Redundant if getSheetData('Assignments',...) uses dataCache via sheet_Assignments
    // 'cached_Requests'  // Redundant if getSheetData('Requests',...) uses dataCache via sheet_Requests
  ];
  
  // Only remove keys that are likely to be used by dashboard-specific logic,
  // not for raw sheet data already handled by dataCache.
  const keysToActuallyRemove = ['dashboardData', 'cached_Dashboard'];


  if (keysToActuallyRemove.length > 0) {
    scriptCache.removeAll(keysToActuallyRemove);
    logActivity(`Cleared from ScriptCache for dashboard: ${keysToActuallyRemove.join(', ')}`);
  }
  logActivity('Dashboard cache clearing process completed');
}

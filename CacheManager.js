function clearDataCache() {
  dataCache.clear();
  logActivity('Data cache cleared');
}

/**
 * Clear requests cache for requests page.
 * Specific keys are removed to avoid affecting dashboard/assignment data.
 */
function clearRequestsCache() {
  const cache = CacheService.getScriptCache();
  const statusFilters = ['All', 'New', 'Pending', 'Assigned', 'Unassigned', 'In Progress', 'Completed', 'Cancelled'];

  statusFilters.forEach(status => {
    cache.remove(`filteredRequests_${status}`);
  });
  cache.remove('cached_Requests'); // Clear main Requests sheet cache as well
  logActivity('Requests page cache cleared');
}

/**
 * Clear dashboard cache.
 */
function clearDashboardCache() {
  const cache = CacheService.getScriptCache();
  const dashboardCacheKeys = [
    'dashboardData',
    'cached_Dashboard',
    'cached_Riders',
    'cached_Assignments',
    'cached_Requests'
  ];
  dashboardCacheKeys.forEach(key => cache.remove(key));
  logActivity('Dashboard cache cleared');
}

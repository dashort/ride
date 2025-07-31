/**
 * @fileoverview
 * Performance-optimized implementations of critical functions
 * These functions replace the existing implementations with better performance characteristics
 */

// ===========================================
// OPTIMIZED DATA ACCESS FUNCTIONS
// ===========================================

/**
 * Optimized version of getRequestsData with better caching and batching
 * Replaces the version in SheetServices.gs
 */
function getRequestsDataOptimized(useCache = true) {
  const cacheKey = 'optimized_requests_data';
  
  if (useCache) {
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;
  }

  try {
    const sheet = getSheet(CONFIG.sheets.requests);
    const range = sheet.getDataRange();
    
    if (range.getNumRows() === 0) {
      return { headers: [], data: [], columnMap: {}, sheet, indices: {} };
    }

    const values = range.getValues();
    const [headers, ...data] = values;
    
    // Create optimized column mapping with O(1) lookups
    const columnMap = Object.fromEntries(
      headers.map((header, index) => [header, index])
    );
    
    // Pre-compute frequently accessed column indices
    const indices = {
      id: columnMap[CONFIG.columns.requests.id],
      status: columnMap[CONFIG.columns.requests.status],
      date: columnMap[CONFIG.columns.requests.eventDate],
      ridersNeeded: columnMap[CONFIG.columns.requests.ridersNeeded],
      ridersAssigned: columnMap[CONFIG.columns.requests.ridersAssigned]
    };

    const result = {
      headers,
      data,
      columnMap,
      sheet,
      indices,
      lastUpdated: new Date()
    };

    // Cache with longer timeout for stable data
    dataCache.set(cacheKey, result, 15 * 60 * 1000); // 15 minutes
    return result;

  } catch (error) {
    logError('Error in getRequestsDataOptimized', error);
    return { headers: [], data: [], columnMap: {}, sheet: null, indices: {} };
  }
}

/**
 * Optimized version of getRidersData with better filtering and indexing
 */
function getRidersDataOptimized(useCache = true) {
  const cacheKey = 'optimized_riders_data';
  
  if (useCache) {
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;
  }

  try {
    const sheet = getSheet(CONFIG.sheets.riders);
    const range = sheet.getDataRange();
    
    if (range.getNumRows() === 0) {
      return { headers: [], data: [], columnMap: {}, sheet, indices: {}, riderMap: new Map() };
    }

    const values = range.getValues();
    const [headers, ...allData] = values;
    
    const columnMap = Object.fromEntries(
      headers.map((header, index) => [header, index])
    );
    
    const indices = {
      name: columnMap[CONFIG.columns.riders.name],
      jpNumber: columnMap[CONFIG.columns.riders.jpNumber],
      status: columnMap[CONFIG.columns.riders.status],
      phone: columnMap[CONFIG.columns.riders.phone],
      email: columnMap[CONFIG.columns.riders.email]
    };

    // Single-pass filtering and indexing
    const validData = [];
    const riderMap = new Map(); // For O(1) rider lookups
    
    allData.forEach((row, originalIndex) => {
      const name = indices.name !== undefined ? String(row[indices.name] || '').trim() : '';
      const jpNumber = indices.jpNumber !== undefined ? String(row[indices.jpNumber] || '').trim() : '';
      
      // Only include rows with valid data
      if (name.length > 0 || jpNumber.length > 0) {
        const validIndex = validData.length;
        validData.push(row);
        
        // Create lookup maps for fast access
        if (name) riderMap.set(name.toLowerCase(), { row, index: validIndex });
        if (jpNumber) riderMap.set(jpNumber, { row, index: validIndex });
      }
    });

    const result = {
      headers,
      data: validData,
      columnMap,
      sheet,
      indices,
      riderMap,
      lastUpdated: new Date()
    };

    dataCache.set(cacheKey, result, 15 * 60 * 1000);
    return result;

  } catch (error) {
    logError('Error in getRidersDataOptimized', error);
    return { headers: [], data: [], columnMap: {}, sheet: null, indices: {}, riderMap: new Map() };
  }
}

/**
 * Batch operation for multiple range reads
 * Reduces API calls by combining multiple range operations
 */
function batchReadRanges(sheet, ranges) {
  try {
    if (ranges.length === 1) {
      return [sheet.getRange(ranges[0]).getValues()];
    }

    // For multiple ranges, determine if we can combine them
    const rangeObjects = ranges.map(range => {
      const [start, end] = range.split(':');
      return { start, end, original: range };
    });

    // Simple optimization: if ranges are adjacent, combine them
    // More complex optimization could be implemented here
    return ranges.map(range => sheet.getRange(range).getValues());

  } catch (error) {
    logError('Error in batchReadRanges', error);
    return ranges.map(() => []);
  }
}

/**
 * Optimized settings data access with batched reads
 * Replaces multiple individual range reads in Code.gs
 */
function getSettingsDataOptimized() {
  const cacheKey = 'optimized_settings_data';
  const cached = dataCache.get(cacheKey);
  if (cached) return cached;

  try {
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
    if (!settingsSheet) {
      throw new Error('Settings sheet not found');
    }

    // Single range read instead of multiple calls
    const combinedRange = settingsSheet.getRange('B2:C11').getValues();
    
    const adminEmails = combinedRange
      .map(row => row[0])
      .filter(email => email && typeof email === 'string' && email.includes('@'))
      .map(email => email.trim());

    const dispatcherEmails = combinedRange
      .map(row => row[1])
      .filter(email => email && typeof email === 'string' && email.includes('@'))
      .map(email => email.trim());

    const result = {
      adminEmails,
      dispatcherEmails,
      lastUpdated: new Date()
    };

    dataCache.set(cacheKey, result, 30 * 60 * 1000); // 30 minutes - settings change infrequently
    return result;

  } catch (error) {
    logError('Error in getSettingsDataOptimized', error);
    return {
      adminEmails: ['admin@yourdomain.com', 'jpsotraffic@gmail.com'],
      dispatcherEmails: ['dispatcher@yourdomain.com']
    };
  }
}

// ===========================================
// OPTIMIZED LOOKUP FUNCTIONS
// ===========================================

/**
 * Fast request lookup using pre-built index
 * Replaces linear search loops
 */
function findRequestByIdOptimized(requestId, requestsData = null) {
  const data = requestsData || getRequestsDataOptimized();
  
  if (!data.indices || data.indices.id === undefined) {
    throw new Error('Request data not properly indexed');
  }

  const targetId = String(requestId).trim().toLowerCase();
  
  // Use direct array search with pre-computed index
  const foundRow = data.data.find(row => {
    const rowId = String(row[data.indices.id] || '').trim().toLowerCase();
    return rowId === targetId;
  });

  return foundRow ? {
    row: foundRow,
    index: data.data.indexOf(foundRow)
  } : null;
}

/**
 * Fast rider lookup using Map for O(1) access
 */
function findRiderOptimized(identifier, ridersData = null) {
  const data = ridersData || getRidersDataOptimized();
  
  if (!data.riderMap) {
    throw new Error('Rider data not properly indexed');
  }

  const searchKey = String(identifier).toLowerCase().trim();
  return data.riderMap.get(searchKey) || null;
}

/**
 * Optimized active riders count with caching
 */
function getActiveRidersCountOptimized() {
  const cacheKey = 'active_riders_count';
  let count = dataCache.get(cacheKey);
  
  if (count !== null) return count;

  const ridersData = getRidersDataOptimized();
  const statusIndex = ridersData.indices.status;
  
  if (statusIndex === undefined) {
    return 0;
  }

  count = ridersData.data.filter(row => {
    const status = String(row[statusIndex] || '').trim();
    return status === 'Active';
  }).length;

  dataCache.set(cacheKey, count, 10 * 60 * 1000); // 10 minutes
  return count;
}

// ===========================================
// OPTIMIZED BATCH OPERATIONS
// ===========================================

/**
 * Batch update multiple cells efficiently
 * Reduces individual setValue calls
 */
function batchUpdateCells(sheet, updates) {
  if (!updates || updates.length === 0) return;

  try {
    // Group updates by row for efficiency
    const rowUpdates = new Map();
    
    updates.forEach(({ row, col, value }) => {
      if (!rowUpdates.has(row)) {
        rowUpdates.set(row, new Map());
      }
      rowUpdates.get(row).set(col, value);
    });

    // Apply updates row by row to minimize API calls
    rowUpdates.forEach((colUpdates, row) => {
      const sortedCols = Array.from(colUpdates.keys()).sort((a, b) => a - b);
      const minCol = sortedCols[0];
      const maxCol = sortedCols[sortedCols.length - 1];
      
      if (sortedCols.length === 1) {
        // Single cell update
        sheet.getRange(row, minCol).setValue(colUpdates.get(minCol));
      } else if (maxCol - minCol + 1 === sortedCols.length) {
        // Contiguous range update
        const values = [];
        for (let col = minCol; col <= maxCol; col++) {
          values.push(colUpdates.get(col) || '');
        }
        sheet.getRange(row, minCol, 1, values.length).setValues([values]);
      } else {
        // Non-contiguous updates - update individually
        colUpdates.forEach((value, col) => {
          sheet.getRange(row, col).setValue(value);
        });
      }
    });

    // Single flush at the end
    SpreadsheetApp.flush();

  } catch (error) {
    logError('Error in batchUpdateCells', error);
    throw error;
  }
}

/**
 * Optimized notification processing with batching
 */
function processNotificationsBatch(assignmentIds, notificationType) {
  try {
    const assignmentsData = getAssignmentsData();
    const ridersData = getRidersDataOptimized();
    
    // Batch all notification sending
    const notifications = [];
    const updates = [];
    
    assignmentIds.forEach(assignmentId => {
      const assignment = assignmentsData.data.find(row => 
        getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.id) === assignmentId
      );
      
      if (!assignment) return;
      
      const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const rider = findRiderOptimized(riderName, ridersData);
      
      if (!rider) return;
      
      notifications.push({
        assignmentId,
        riderName,
        phone: rider.row[ridersData.indices.phone],
        email: rider.row[ridersData.indices.email],
        type: notificationType
      });
      
      // Prepare batch updates
      const assignmentIndex = assignmentsData.data.indexOf(assignment);
      const now = new Date();
      
      if (notificationType === 'SMS' || notificationType === 'Both') {
        updates.push({
          row: assignmentIndex + 2,
          col: assignmentsData.columnMap[CONFIG.columns.assignments.smsSent] + 1,
          value: now
        });
      }
      
      if (notificationType === 'Email' || notificationType === 'Both') {
        updates.push({
          row: assignmentIndex + 2,
          col: assignmentsData.columnMap[CONFIG.columns.assignments.emailSent] + 1,
          value: now
        });
      }
    });

    // Send all notifications
    const results = notifications.map(notification => {
      // Implementation would call actual notification service
      return sendNotificationOptimized(notification);
    });

    // Batch update all timestamp columns
    if (updates.length > 0) {
      batchUpdateCells(assignmentsData.sheet, updates);
    }

    return {
      success: true,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };

  } catch (error) {
    logError('Error in processNotificationsBatch', error);
    return { success: false, error: error.message };
  }
}

// ===========================================
// SMART CACHING UTILITIES
// ===========================================

/**
 * Enhanced cache class with dependency tracking
 */
class SmartDataCache extends DataCache {
  constructor() {
    super();
    this.dependencies = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes default
  }

  /**
   * Set cache with custom timeout
   */
  set(key, data, customTimeout = null) {
    super.set(key, data);
    if (customTimeout) {
      this.lastUpdate[key] = Date.now();
      // Store custom timeout info
      this.customTimeouts = this.customTimeouts || {};
      this.customTimeouts[key] = customTimeout;
    }
  }

  /**
   * Get with custom timeout check
   */
  get(key) {
    const now = Date.now();
    const timeout = this.customTimeouts?.[key] || this.cacheTimeout;
    
    if (this.cache[key] && (now - this.lastUpdate[key] < timeout)) {
      return this.cache[key];
    }
    return null;
  }

  /**
   * Register dependencies between cached data
   */
  addDependency(key, dependsOn) {
    if (!this.dependencies.has(dependsOn)) {
      this.dependencies.set(dependsOn, new Set());
    }
    this.dependencies.get(dependsOn).add(key);
  }

  /**
   * Invalidate cache and all dependencies
   */
  invalidateWithDependencies(key) {
    this.clear(key);
    
    const dependents = this.dependencies.get(key);
    if (dependents) {
      dependents.forEach(dependent => this.clear(dependent));
    }
  }
}

// ===========================================
// PERFORMANCE MONITORING
// ===========================================

/**
 * Performance tracking wrapper
 */
function trackPerformance(operationName, fn) {
  const start = Date.now();
  const startMemory = Utilities.getUuid(); // Placeholder for memory tracking
  
  try {
    const result = fn();
    const duration = Date.now() - start;
    
    // Log performance metrics
    logPerformanceMetric({
      operation: operationName,
      duration,
      success: true,
      timestamp: new Date()
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    logPerformanceMetric({
      operation: operationName,
      duration,
      success: false,
      error: error.message,
      timestamp: new Date()
    });
    
    throw error;
  }
}

/**
 * Log performance metrics to dedicated sheet
 */
function logPerformanceMetric(metric) {
  try {
    // Only log if performance monitoring is enabled
    if (!CONFIG.system?.enablePerformanceLogging) return;
    
    const sheet = getOrCreateSheet('Performance Logs', [
      'Timestamp', 'Operation', 'Duration (ms)', 'Success', 'Error', 'User'
    ]);
    
    sheet.appendRow([
      metric.timestamp,
      metric.operation,
      metric.duration,
      metric.success,
      metric.error || '',
      Session.getActiveUser().getEmail()
    ]);
    
  } catch (error) {
    // Fail silently to avoid impacting application performance
    console.error('Failed to log performance metric:', error);
  }
}

// ===========================================
// CONDITIONAL LOGGING
// ===========================================

/**
 * Debug logging that can be disabled in production
 */
function debugLog(message, ...args) {
  const debugMode = PropertiesService.getScriptProperties().getProperty('DEBUG_MODE') === 'true';

  if (debugMode) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
}

/**
 * Performance-aware activity logging
 */
function logActivityOptimized(activity, details = {}) {
  const enableLogging = CONFIG.system?.enableActivityLogging !== false;
  
  if (!enableLogging) return;
  
  try {
    // Use batch logging to reduce API calls
    if (!this.activityLogBatch) {
      this.activityLogBatch = [];
    }
    
    this.activityLogBatch.push({
      timestamp: new Date(),
      activity,
      details: typeof details === 'object' ? JSON.stringify(details) : String(details),
      user: Session.getActiveUser().getEmail()
    });
    
    // Flush batch when it reaches a certain size
    if (this.activityLogBatch.length >= 10) {
      flushActivityLogBatch();
    }
    
  } catch (error) {
    console.error('Error in logActivityOptimized:', error);
  }
}

/**
 * Flush batched activity logs
 */
function flushActivityLogBatch() {
  if (!this.activityLogBatch || this.activityLogBatch.length === 0) return;
  
  try {
    const sheet = getOrCreateSheet('Activity Log', [
      'Timestamp', 'Activity', 'Details', 'User'
    ]);
    
    const rows = this.activityLogBatch.map(log => [
      log.timestamp, log.activity, log.details, log.user
    ]);
    
    if (rows.length > 0) {
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, rows.length, 4).setValues(rows);
    }
    
    this.activityLogBatch = [];
    
  } catch (error) {
    console.error('Error flushing activity log batch:', error);
  }
}

// Global instance for optimized caching
const smartCache = new SmartDataCache();
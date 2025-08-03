/**
 * @fileoverview
 * Global configuration and caching utilities for the Motorcycle Escort
 * Management System. Extracted from the original monolithic Code.gs to
 * improve maintainability.
 */

/**
 * Global flag to prevent infinite recursion in debugLogToSheet.
 * THIS MUST BE AT THE VERY TOP LEVEL OF YOUR SCRIPT, OUTSIDE OF ANY FUNCTION.
 * @type {boolean}
 */
let isDebugLoggingInProgress = false;

/**
 * @description
 * Centralized configuration object for the Motorcycle Escort Management System.
 * Updated for Twilio SMS integration with cleaned up structure.
 */
const CONFIG = {
// Production Performance Configuration
  performance: {
    enableDebugLogging: false,  // Disabled for production - major performance boost
    enablePerformanceTracking: true,
    batchSize: 100, // Keep this - good for batch operations
    maxCacheAge: 30 * 60 * 1000, // Keep this - 30 minutes is good
    enableSmartCaching: true,  // Keep this - helps performance
    slowOperationThreshold: 1000
  },
  
  // Add system settings if not already present
  system: {
    enableDebugLogging: false,
    enablePerformanceLogging: false,
    enableActivityLogging: false,
    timezone: 'America/Chicago',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: 'hh:mm a'
  },

// Twilio SMS Configuration
  twilio: {
  accountSid: PropertiesService.getScriptProperties().getProperty('TWILIO_ACCOUNT_SID'),
  authToken: PropertiesService.getScriptProperties().getProperty('TWILIO_AUTH_TOKEN'),
  fromNumber: PropertiesService.getScriptProperties().getProperty('TWILIO_FROM_NUMBER'),
    
    // Optional settings
    enableDeliveryCallbacks: true,                          // Set to true if you want delivery receipts
    maxRetries: 3,                                          // Number of retry attempts
    retryDelay: 1000                                        // Delay between retries in milliseconds
  }, 

  // Sheet names
  sheets: {
    dashboard: "Dashboard",
    requests: "Requests",
    riders: "Riders",
    assignments: "Assignments",

    riderAvailability: "Rider Availability",
    availability: "Rider Availability",

    history: "History",
    settings: "Settings",
    log: "Log"
  },

  // Column mappings (try to use consistent names please)
  columns: {
    requests: {
      id: 'Request ID',
      date: 'Date',
      requesterName: 'Requester Name',
      requesterContact: 'Requester Contact',
      type: 'Request Type',
      eventDate: 'Event Date',
      startTime: 'Start Time',
      endTime: 'End Time',
      startLocation: 'Pickup',
      endLocation: 'Second',
      secondaryLocation: 'Dropoff',
      ridersNeeded: 'Riders Needed',
      escortFee: 'Escort Fee',
      status: 'Status',
      notes: 'Notes',
      ridersAssigned: 'Riders Assigned',
      lastUpdated: 'Last Updated',
      calendarEventId: 'Calendar Event ID'
    },
    riders: {
      jpNumber: 'Rider ID',
      payrollNumber: 'Payroll Number',
      name: 'Full Name',
      phone: 'Phone Number',
      email: 'Email',
      status: 'Status',
      platoon: 'Platoon',
      partTime: 'Part-Time Rider',
      certification: 'Certification',
      organization: 'Organization',
      totalAssignments: 'Total Assignments',
      lastAssignmentDate: 'Last Assignment Date'  // Fixed: was 'LastAssignmentDate'
    },
    assignments: {
      id: 'Assignment ID',
      requestId: 'Request ID',
      eventDate: 'Event Date',
      startTime: 'Start Time',
      endTime: 'End Time',
      startLocation: 'Pickup',
      endLocation: 'Second',
      secondaryLocation: 'Dropoff',
      riderName: 'Rider Name',
      jpNumber: 'JP Number',
      status: 'Status',
      createdDate: 'Created Date',
      notified: 'Notified',
      notificationStatus: 'Notification Status',
      smsSent: 'SMS Sent',
      emailSent: 'Email Sent',
      confirmedDate: 'Confirmed Date',
      confirmationMethod: 'Confirmation Method',
      completedDate: 'Completed Date',
      actualStartTime: 'Actual Start Time',
      actualEndTime: 'Actual End Time',
      actualDuration: 'Actual Duration (Hours)',
      calendarEventId: 'Calendar Event ID',
      notes: 'Notes'
    },

    riderAvailability: {
      riderId: 'Rider ID',
      date: 'Date',
      startTime: 'Start Time',
      endTime: 'End Time',
      status: 'Status'

    },
    availability: {
      email: 'Email',
      date: 'Date',
      startTime: 'Start Time',
      endTime: 'End Time',
      status: 'Status',
      notes: 'Notes',
      created: 'Created',
      updated: 'Updated',
      riderId: 'Rider ID'

    }
  },

  // Dropdown options
  options: {
    requestTypes: ['Wedding', 'Funeral', 'Float Movement', 'VIP', 'Other'],
    requestStatuses: ['New', 'Pending', 'Assigned', 'Unassigned', 'In Progress', 'Completed', 'Cancelled'],
    riderStatuses: ['Active', 'Inactive', 'Vacation', 'Training', 'Suspended'],
    platoons: ['A', 'B'],
    certificationTypes: ['Standard', 'Advanced', 'Instructor', 'Trainee', 'Not Certified'],
    assignmentStatuses: ['Assigned', 'Confirmed', 'En Route', 'In Progress', 'Completed', 'Cancelled', 'No Show']
  },

  // Dashboard layout settings
  dashboard: {
    requestsDisplayStartRow: 11,
    scheduleStartRow: 9,
    scheduleStartCol: 12,
    summaryStatsStartCol: 1,
    maxDisplayRows: 40,
    refreshInterval: 5 * 60 * 1000,
    filterCell: 'B9',
    filterOptions: ['All', 'New', 'Pending', 'Assigned', 'In Progress', 'Completed', 'Cancelled']
  },

  // System settings
  system: {
    timezone: 'America/Chicago',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'h:mm A',
    calendarName: 'Motorcycle Escorts',
    maxRidersPerRequest: 4,
    notificationLeadTime: 24 // hours
  }
};

/**
 * Optimized logging functions for performance
 */
function debugLog(message, ...args) {
  if (CONFIG.performance.enableDebugLogging) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
}

function performanceLog(message, ...args) {
  if (CONFIG.performance.enablePerformanceTracking) {
    console.log(`[PERF] ${message}`, ...args);
  }
}

function trackPerformance(operation, fn) {
  if (!CONFIG.performance.enablePerformanceTracking) {
    return fn();
  }
  
  const start = Date.now();
  const result = fn();
  const duration = Date.now() - start;
  
  performanceLog(`${operation}: ${duration}ms`);
  
  // Log slow operations
  if (duration > 1000) {
    console.warn(`⚠️ Slow operation detected: ${operation} took ${duration}ms`);
  }
  
  return result;
}
class DataCache {
  constructor() {
    this.cache = new Map();
    this.indexes = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.hitCount = 0;
    this.missCount = 0;
  }

  set(key, value, customTimeout = null) {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      timeout: customTimeout || this.cacheTimeout
    });
    
    // Auto-create indexes for common data types
    if (key === 'requests_data' && value.data) {
      this.createRequestIndex(value.data, value.columnMap);
    }
    if (key === 'riders_data' && value.data) {
      this.createRiderIndex(value.data, value.columnMap);
    }
  }

  get(key) {
    const cached = this.cache.get(key);
    if (!cached) {
      this.missCount++;
      return null;
    }
    
    if (Date.now() - cached.timestamp > cached.timeout) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }
    
    this.hitCount++;
    return cached.data;
  }

  // Create O(1) lookup index for requests
  createRequestIndex(data, columnMap) {
    const index = new Map();
    const idColumn = columnMap[CONFIG.columns.requests.id];
    const statusColumn = columnMap[CONFIG.columns.requests.status];
    
    data.forEach((row, i) => {
      const id = row[idColumn];
      const status = row[statusColumn];
      if (id) {
        index.set(String(id).toLowerCase(), { row, index: i, status });
      }
    });
    
    this.indexes.set('requests_by_id', index);
    debugLog(`Created request index with ${index.size} entries`);
  }

  // Create O(1) lookup index for riders
  createRiderIndex(data, columnMap) {
    const index = new Map();
    const nameColumn = columnMap[CONFIG.columns.riders.name];
    const jpColumn = columnMap[CONFIG.columns.riders.jpNumber];
    const emailColumn = columnMap[CONFIG.columns.riders.email];
    
    data.forEach((row, i) => {
      const name = row[nameColumn];
      const jpNumber = row[jpColumn];
      const email = row[emailColumn];
      
      if (name) index.set(String(name).toLowerCase(), { row, index: i });
      if (jpNumber) index.set(String(jpNumber).toLowerCase(), { row, index: i });
      if (email) index.set(String(email).toLowerCase(), { row, index: i });
    });
    
    this.indexes.set('riders_by_identifier', index);
    debugLog(`Created rider index with ${index.size} entries`);
  }

  // Fast O(1) lookups
  findRequestById(requestId) {
    const index = this.indexes.get('requests_by_id');
    return index ? index.get(String(requestId).toLowerCase()) : null;
  }

  findRiderByIdentifier(identifier) {
    const index = this.indexes.get('riders_by_identifier');
    return index ? index.get(String(identifier).toLowerCase()) : null;
  }

  // Smart cache invalidation
  invalidateRequests() {
    this.cache.delete('requests_data');
    this.cache.delete('filtered_requests');
    this.indexes.delete('requests_by_id');
    debugLog('Invalidated requests cache');
  }

  invalidateRiders() {
    this.cache.delete('riders_data');
    this.cache.delete('active_riders');
    this.indexes.delete('riders_by_identifier');
    debugLog('Invalidated riders cache');
  }

  // Performance statistics
  getStats() {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? ((this.hitCount / total) * 100).toFixed(1) : 0;
    return {
      hitRate: `${hitRate}%`,
      hits: this.hitCount,
      misses: this.missCount,
      cacheSize: this.cache.size,
      indexCount: this.indexes.size
    };
  }

  clear(key = null) {
    if (key) {
      this.cache.delete(key);
      // Clear related indexes
      for (const [indexKey] of this.indexes) {
        if (indexKey.includes(key.replace('_data', ''))) {
          this.indexes.delete(indexKey);
        }
      }
    } else {
      this.cache.clear();
      this.indexes.clear();
      this.hitCount = 0;
      this.missCount = 0;
    }
  }
}


// --- DATA CACHE ---
class DataCache2 {
  /**
   * @description Constructs a DataCache instance.
   */
  constructor() {
    /** @private @type {Object<string, any>} */
    this.cache = {};
    /** @private @type {Object<string, number>} */
    this.lastUpdate = {};
    /** @private @type {number} Cache timeout in milliseconds (optimized to 30 minutes). */
    this.cacheTimeout = CONFIG.performance?.maxCacheAge || (30 * 60 * 1000);
  }

  /**
   * Retrieves an item from the cache if it exists and has not expired.
   * @param {string} key The key of the item to retrieve.
   * @return {any|null} The cached item, or null if not found or expired.
   */
  get(key) {
    const now = Date.now();
    if (this.cache[key] && (now - this.lastUpdate[key] < this.cacheTimeout)) {
      return this.cache[key];
    }
    return null;
  }

  /**
   * Adds or updates an item in the cache.
   * @param {string} key The key of the item to store.
   * @param {any} data The data to store.
   * @return {void}
   */
  set(key, data) {
    this.cache[key] = data;
    this.lastUpdate[key] = Date.now();
  }

  /**
   * Clears an item from the cache, or the entire cache if no key is provided.
   * @param {string} [key=null] The key of the item to clear. If null, clears the entire cache.
   * @return {void}
   */
  clear(key = null) {
    if (key) {
      delete this.cache[key];
      delete this.lastUpdate[key];
    } else {
      this.cache = {};
      this.lastUpdate = {};
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalKeys = Object.keys(this.cache).length;
    const totalSize = JSON.stringify(this.cache).length;
    return { totalKeys, totalSize, cacheTimeout: this.cacheTimeout };
  }
}

/**
 * Enhanced DataCache with index support for faster lookups
 */
class IndexedDataCache extends DataCache {
  constructor() {
    super();
    this.indexes = new Map(); // Store index maps for O(1) lookups
  }

  /**
   * Create an index for faster lookups
   * @param {string} dataKey The cache key for the data
   * @param {string} indexKey The index identifier
   * @param {Function} keyExtractor Function to extract the index key from each row
   */
  createIndex(dataKey, indexKey, keyExtractor) {
    const data = this.get(dataKey);
    if (!data || !data.data) return;

    const index = new Map();
    data.data.forEach((row, rowIndex) => {
      const key = keyExtractor(row, data.columnMap);
      if (key) {
        index.set(key, { row, rowIndex });
      }
    });

    this.indexes.set(`${dataKey}_${indexKey}`, index);
    debugLog(`Created index for ${dataKey}.${indexKey} with ${index.size} entries`);
  }

  /**
   * Fast lookup using index
   * @param {string} dataKey The cache key for the data
   * @param {string} indexKey The index identifier
   * @param {any} lookupValue The value to find
   * @return {Object|null} The found row data or null
   */
  findByIndex(dataKey, indexKey, lookupValue) {
    const index = this.indexes.get(`${dataKey}_${indexKey}`);
    return index ? index.get(lookupValue) : null;
  }

  /**
   * Clear cache and associated indexes
   */
  clear(key = null) {
    super.clear(key);
    if (key) {
      // Clear related indexes
      const keysToDelete = [];
      for (const indexKey of this.indexes.keys()) {
        if (indexKey.startsWith(key + '_')) {
          keysToDelete.push(indexKey);
        }
      }
      keysToDelete.forEach(k => this.indexes.delete(k));
    } else {
      this.indexes.clear();
    }
  }
}

/**
 * Global instance of the enhanced DataCache class for managing in-memory caching of sheet data.
 * @type {IndexedDataCache}
 */
const dataCache = new IndexedDataCache();

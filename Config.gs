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
 * Contains sheet names, column mappings, dropdown options, SMS gateways,
 * dashboard layout settings, and system-wide parameters.
 * @type {object}
 */
/**
 * @description
 * Centralized configuration object for the Motorcycle Escort Management System.
 * Updated for Twilio SMS integration with cleaned up structure.
 */
const CONFIG = {
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
      startLocation: 'Start Location',
      endLocation: 'End Location',
      secondaryLocation: 'Secondary End Location',
      ridersNeeded: 'Riders Needed',
      requirements: 'Special Requirements',
      status: 'Status',
      notes: 'Notes',
      ridersAssigned: 'Riders Assigned',
      courtesy: 'Courtesy',
      lastUpdated: 'Last Updated',
      calendarEventId: 'Calendar Event ID'
    },
    riders: {
      jpNumber: 'Rider ID',
      name: 'Full Name',
      phone: 'Phone Number',
      email: 'Email',
      status: 'Status',
      partTime: 'Part-Time Rider',  
      certification: 'Certification',
      totalAssignments: 'Total Assignments',
      lastAssignmentDate: 'Last Assignment Date'  // Fixed: was 'LastAssignmentDate'
    },
    assignments: {
      id: 'Assignment ID',
      requestId: 'Request ID',
      eventDate: 'Event Date',
      startTime: 'Start Time',
      endTime: 'End Time',
      startLocation: 'Start Location',
      endLocation: 'End Location',
      secondaryLocation: 'Secondary End Location',
      riderName: 'Rider Name',
      jpNumber: 'JP Number',
      status: 'Status',
      createdDate: 'Created Date',
      notified: 'Notified',
      smsSent: 'SMS Sent',
      emailSent: 'Email Sent',
      completedDate: 'Completed Date',
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
      notes: 'Notes'

    }
  },

  // Dropdown options
  options: {
    requestTypes: ['Wedding', 'Funeral', 'Float Movement', 'VIP', 'Other'],
    requestStatuses: ['New', 'Pending', 'Assigned', 'Unassigned', 'In Progress', 'Completed', 'Cancelled'],
    riderStatuses: ['Active', 'Inactive', 'Vacation', 'Training', 'Suspended'],
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

// --- DATA CACHE ---
class DataCache {
  /**
   * @description Constructs a DataCache instance.
   */
  constructor() {
    /** @private @type {Object<string, any>} */
    this.cache = {};
    /** @private @type {Object<string, number>} */
    this.lastUpdate = {};
    /** @private @type {number} Cache timeout in milliseconds (default: 5 minutes). */
    this.cacheTimeout = 5 * 60 * 1000;
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
}
/**
 * Global instance of the DataCache class for managing in-memory caching of sheet data.
 * @type {DataCache}
 */
const dataCache = new DataCache();

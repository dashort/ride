/**
 * @fileoverview
 * This file consolidates core utility services for the application,
 * including formatting, logging, cache management, user authentication,
 * and other general helper functions.
 */

// --- Content from Formatting.js ---
/**
 * Formats a time value for display (e.g., "HH:MM AM/PM").
 * Handles Date objects, ISO strings, Excel time serial numbers (fraction of a day),
 * and time strings like "HH:MM:SS" or "HH:MM".
 * If the input is already formatted with AM/PM, it's returned as is.
 *
 * @param {Date|string|number|null|undefined} timeValue The time value to format.
 * @return {string} The formatted time string (e.g., "10:30 AM"), or the original value if formatting fails, or an empty string for null/undefined input.
 */
function formatTimeForDisplay(timeValue) {
  if (!timeValue) return '';
  try {
    let date;
    if (typeof timeValue === 'string' && (timeValue.includes('AM') || timeValue.includes('PM'))) {
        return timeValue; // Already formatted
    } else if (typeof timeValue === 'string' && (timeValue.includes('T') || timeValue.includes('Z'))) {
        date = new Date(timeValue);
    } else if (timeValue instanceof Date) {
        date = timeValue;
    } else if (typeof timeValue === 'number' && timeValue >= 0 && timeValue < 1) {
        date = new Date(1899, 11, 30, 0, 0, 0, Math.round(timeValue * 24 * 60 * 60 * 1000));
    } else if (typeof timeValue === 'string' && /^\d{1,2}:\d{2}(:\d{2})?(\s(AM|PM))?$/i.test(timeValue.trim())) {
        const parts = timeValue.trim().split(/[:\s]/);
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        date = new Date();
        date.setHours(hours, minutes, parts[2] ? parseInt(parts[2], 10) : 0, 0);
    } else {
        date = new Date(timeValue);
    }
    if (isNaN(date.getTime())) {
        return String(timeValue);
    }
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch (error) {
    logError('Error formatting time for display.', error, `Input: ${timeValue}`);
    return String(timeValue);
  }
}
/**
 * Safely format a date value for display
 * @param {any} dateValue - The date value from the sheet
 * @return {string} Formatted date string or original value
 */
function formatDateSafe(dateValue) {
  try {
    if (!dateValue) return '';
    
    // If it's already a properly formatted string, return it
    if (typeof dateValue === 'string' && dateValue.length > 0 && dateValue !== 'TBD') {
      // Check if it looks like a valid date string
      const testDate = new Date(dateValue);
      if (!isNaN(testDate.getTime())) {
        return dateValue; // Return as-is if it's already a good date string
      }
      return dateValue; // Return original string even if not a date
    }
    
    // If it's a Date object
    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) return '';
      return dateValue.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    }
    
    // Try to convert to date
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    }
    
    // Return original value if we can't format it
    return String(dateValue);
    
  } catch (error) {
    console.log('Error formatting date:', dateValue, error);
    return String(dateValue || '');
  }
}

/**
 * Safely format a time value for display
 * @param {any} timeValue - The time value from the sheet
 * @return {string} Formatted time string or original value
 */
function formatTimeSafe(timeValue) {
  try {
    if (!timeValue) return '';
    
    // If it's already a good string, return it
    if (typeof timeValue === 'string' && timeValue.length > 0 && timeValue !== 'TBD') {
      return timeValue;
    }
    
    // If it's a Date object (common for time cells in Sheets)
    if (timeValue instanceof Date) {
      if (isNaN(timeValue.getTime())) return '';
      return timeValue.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    
    // Try to parse as time
    if (typeof timeValue === 'number') {
      // Might be a decimal representing time (e.g., 0.5 = 12:00 PM)
      const totalMinutes = Math.round(timeValue * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }
    
    // Return original value
    return String(timeValue);
    
  } catch (error) {
    console.log('Error formatting time:', timeValue, error);
    return String(timeValue || '');
  }
}
/**
 * Formats a date for display manually in "MM/DD/YYYY" format.
 * @param {Date} date The date object to format.
 * @return {string} The formatted date string "MM/DD/YYYY" or an empty string.
 */
function formatDate(date) {
  if (!date || !(date instanceof Date)) return '';
  const inputYear = date.getFullYear();
  const inputMonth = date.getMonth();
  const inputDay = date.getDate();
  const inputHours = date.getHours();
  const inputMinutes = date.getMinutes();
  const inputSeconds = date.getSeconds();
  const isEpoch1970Zero = (inputYear === 1970 && inputMonth === 0 && inputDay === 1 && inputHours === 0 && inputMinutes === 0 && inputSeconds === 0);
  const isEpoch1899 = (inputYear === 1899 && inputMonth === 11 && inputDay === 30 && inputHours === 0 && inputMinutes === 0 && inputSeconds === 0);
  if (isEpoch1970Zero || isEpoch1899) return '';
  let month = date.getMonth() + 1;
  let day = date.getDate();
  let year = date.getFullYear();
  if (isNaN(month) || isNaN(day) || isNaN(year)) return '';
  month = month < 10 ? '0' + month : month;
  day = day < 10 ? '0' + day : day;
  return `${month}/${day}/${year}`;
}

/**
 * Formats a time for display manually in "h:mm A" format (e.g., "3:30 PM").
 * @param {Date} time The date object representing a time.
 * @return {string} The formatted time string "h:mm A" or an empty string.
 */
function formatTime(time) {
  if (!time || !(time instanceof Date)) return '';
  const inputYear = time.getFullYear();
  const inputMonth = time.getMonth();
  const inputDay = time.getDate();
  const isEpoch1899Midnight = (inputYear === 1899 && inputMonth === 11 && inputDay === 30 && time.getHours() === 0 && time.getMinutes() === 0 && time.getSeconds() === 0);
  const isEpoch1970Midnight = (inputYear === 1970 && inputMonth === 0 && inputDay === 1 && time.getHours() === 0 && time.getMinutes() === 0 && time.getSeconds() === 0);
  if (isEpoch1899Midnight || isEpoch1970Midnight) return '';
  let hours = time.getHours();
  let minutes = time.getMinutes();
  if (isNaN(hours) || isNaN(minutes)) return '';
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Formats a date value for display (e.g., "Jan 1, 2024").
 * @param {Date|string|number|null|undefined} dateValue The date value to format.
 * @return {string} The formatted date string (e.g., "Jan 1, 2024"), or the original value if formatting fails, or an empty string for null/undefined input.
 */
function formatDateForDisplay(dateValue) {
  if (!dateValue) return '';
  try {
    let date;
    if (typeof dateValue === 'string' && (dateValue.includes('T') || dateValue.includes('Z'))) {
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'number') {
      date = new Date((dateValue - 25569) * 86400 * 1000);
    } else {
      date = new Date(dateValue);
    }
    if (isNaN(date.getTime())) return String(dateValue);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (error) {
    logError('Error formatting date for display.', error, `Input: ${dateValue}`);
    return String(dateValue);
  }
}

/**
 * Formats a date-time value for display (e.g., "Jan 1, 2024, 10:30 AM").
 * @param {Date|string|number|null|undefined} dateTimeValue The date-time value to format.
 * @return {string} The formatted date-time string, or the original value if formatting fails, or an empty string for null/undefined input.
 */
function formatDateTimeForDisplay(dateTimeValue) {
  if (!dateTimeValue) return '';
  try {
    let date;
    if (typeof dateTimeValue === 'string' && (dateTimeValue.includes('T') || dateTimeValue.includes('Z'))) {
      date = new Date(dateTimeValue);
    } else if (dateTimeValue instanceof Date) {
      date = dateTimeValue;
    } else if (typeof dateTimeValue === 'number') {
      date = new Date((dateTimeValue - 25569) * 86400 * 1000);
    } else {
      date = new Date(dateTimeValue);
    }
    if (isNaN(date.getTime())) return String(dateTimeValue);
    return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  } catch (error) {
    logError('Error formatting datetime.', error, `Input: ${dateTimeValue}`);
    return String(dateTimeValue);
  }
}

// --- Content from Logger.js ---
/**
 * Logs a debug message to both the console and a designated "Log" sheet.
 * @param {string} message The primary debug message.
 * @param {string} [details=''] Additional details or stringified objects to include in the log.
 * @return {void}
 */
function debugLogToSheet(message, details = '') {
  if (isDebugLoggingInProgress) {
    console.warn(`[WARNING] Recursive call to debugLogToSheet prevented. Message: ${message}`);
    return;
  }
  isDebugLoggingInProgress = true;
  try {
    const debugLogSheet = getOrCreateSheet(CONFIG.sheets.log, ['Timestamp', 'Type', 'Message', 'Details']); // getOrCreateSheet from SheetServices.gs
    if (debugLogSheet) {
      const rowData = [new Date(), 'DEBUG', message, details];
      console.log(`[DEBUG] Attempting to append to ${CONFIG.sheets.log} sheet. Data: ${JSON.stringify(rowData)}`);
      debugLogSheet.appendRow(rowData);
    } else {
      console.error(`ERROR: Log sheet '${CONFIG.sheets.log}' is null, cannot write debug log. Fallback DEBUG LOG: ${message} - ${details}`);
    }
  } catch (e) {
    console.error(`ERROR WRITING TO DEBUG_LOG SHEET (caught within itself): ${message} - ${details}. Actual error: ${e.message}`);
  } finally {
    isDebugLoggingInProgress = false;
  }
}

/**
 * Log activity to system log sheet and console.
 * @param {string} message The log message.
 * @param {string} [details=''] Additional details.
 * @return {void}
 */
function logActivity(message, details = '') {
  console.log(`[ACTIVITY] ${message}`, details);
  try {
    const logSheet = getOrCreateSheet(CONFIG.sheets.log, ['Timestamp', 'Type', 'Message', 'Details']);
    logSheet.appendRow([new Date(), 'INFO', message, details]);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

/**
 * Log error to system log sheet and console.
 * @param {string} message The error message.
 * @param {Error|object|null} [error=null] The error object or additional error information.
 * @return {void}
 */
function logError(message, error = null) {
  const errorDetails = error ? error.toString() + (error.stack ? '\n' + error.stack : '') : '';
  console.error(`[ERROR] ${message}`, errorDetails);
  try {
    const logSheet = getOrCreateSheet(CONFIG.sheets.log, ['Timestamp', 'Type', 'Message', 'Details']);
    logSheet.appendRow([new Date(), 'ERROR', message, errorDetails]);
  } catch (logErrorEx) { // Renamed to avoid conflict with outer 'error'
    console.error('Failed to log error to sheet:', logErrorEx);
  }
}

// --- Content from CacheManager.js ---
/**
 * Clears the entire custom `dataCache` instance.
 * @return {void}
 */
function clearDataCache() {
  dataCache.clear();
  logActivity('Custom dataCache completely cleared');
}

/**
 * Clears cached data related to the "Requests" sheet from the custom `dataCache`.
 * Also clears specific filtered request keys from `CacheService.getScriptCache()`.
 * @return {void}
 */
function clearRequestsCache() {
  dataCache.clear('sheet_Requests');
  logActivity('Custom dataCache cleared for sheet_Requests');
  const scriptCache = CacheService.getScriptCache();
  const statusFilters = ['All', 'New', 'Pending', 'Assigned', 'Unassigned', 'In Progress', 'Completed', 'Cancelled'];
  const keysToRemoveFromScriptCache = statusFilters.map(status => `filteredRequests_${status}`);
  if (keysToRemoveFromScriptCache.length > 0) {
    scriptCache.removeAll(keysToRemoveFromScriptCache);
    logActivity(`Cleared from ScriptCache: ${keysToRemoveFromScriptCache.join(', ')}`);
  }
  logActivity('Requests cache clearing process completed');
}

/**
 * Clears caches relevant to the dashboard.
 * This includes clearing the *entire* custom `dataCache` and specific dashboard-related keys from `CacheService.getScriptCache()`.
 * @return {void}
 */
function clearDashboardCache() {
  dataCache.clear();
  logActivity('Custom dataCache completely cleared (for dashboard refresh)');
  const scriptCache = CacheService.getScriptCache();
  const dashboardScriptCacheKeys = ['dashboardData', 'cached_Dashboard'];
  if (dashboardScriptCacheKeys.length > 0) {
    scriptCache.removeAll(dashboardScriptCacheKeys);
    logActivity(`Cleared from ScriptCache for dashboard: ${dashboardScriptCacheKeys.join(', ')}`);
  }
  logActivity('Dashboard cache clearing process completed');
}

// --- Content from AuthService.js ---
/**
 * Retrieves the current active user's information.
 * @warning This function should not be the primary source for user role determination
 *          in the application's authentication/authorization flow.
 *          User roles and permissions should be established via the main authentication
 *          process (e.g., involving AccessControl.gs or a dedicated auth module) and
 *          the resulting user object (with roles/permissions) should be passed to functions.
 * @return {object} An object representing the current user.
 */
function getCurrentUser() {
  try {
    // Delegate to the centralized authentication service
    if (typeof authenticateAndAuthorizeUser === 'function') {
      const auth = authenticateAndAuthorizeUser();
      if (auth && auth.success && auth.user) {
        logActivity(`User ${auth.user.email} logged in with roles: ${auth.user.roles.join(', ')}`);
        return auth.user;
      }
    }

    // Fallback to session information if the auth service fails
    const userEmail = Session.getActiveUser().getEmail();
    const displayName = getUserDisplayName(userEmail);
    return { email: userEmail, name: displayName, roles: ['guest'], permissions: ['view'] };
  } catch (error) {
    logError('Error getting current user:', error);
    return { email: 'anonymous@example.com', name: 'Guest User', roles: ['guest'], permissions: ['view'] };
  }
}

/**
 * Determines the roles for a given user email.
 * @param {string} email The email address of the user.
 * @return {Array<string>} An array of role strings.
 * @deprecated This function is deprecated for primary role assignment.
 *             Roles should be determined by the main authentication flow (e.g., AccessControl.gs)
 *             and included in the user object.
 */
function getUserRoles(email) {
  // const roleMapping = { 'jpsotraffic@gmail.com': ['admin', 'dispatcher', 'rider'] };
  // return roleMapping[email] || ['admin'];
  return ['deprecated_role_from_CoreUtils']; // Return a specific value to indicate if this is still being called.
}

/**
 * Calculates a list of unique permissions based on user roles.
 * @param {Array<string>} roles An array of user role strings.
 * @return {Array<string>} An array of unique permission strings.
 */
function calculatePermissions(roles) {
  const permissionMap = {
    admin: ['view', 'create_request', 'assign_riders', 'send_notifications', 'update_status', 'manage_users', 'view_reports', 'system_config', 'export_data'],
    dispatcher: ['view', 'create_request', 'assign_riders', 'send_notifications', 'update_status', 'view_reports'],
    rider: ['view', 'view_own_assignments', 'update_own_status'],
    guest: ['view']
  };
  const permissions = new Set();
  roles.forEach(role => {
    if (permissionMap[role]) permissionMap[role].forEach(permission => permissions.add(permission));
  });
  return Array.from(permissions);
}

/**
 * Gets a displayable name for the user.
 * @param {string} email The user's email address.
 * @return {string} A formatted display name.
 */
function getUserDisplayName(email) {
  try {
    const ridersData = getRidersData(); // From SheetServices.gs (originally DataService.js)
    const riderEmailIdx = ridersData.columnMap[CONFIG.columns.riders.email];
    const riderNameIdx = ridersData.columnMap[CONFIG.columns.riders.name];
    if (riderEmailIdx !== undefined && riderNameIdx !== undefined) {
        const riderRow = ridersData.data.find(row => String(row[riderEmailIdx] || '').toLowerCase() === String(email || '').toLowerCase());
        if (riderRow) return String(riderRow[riderNameIdx] || '').trim();
    }
    const namePart = email.split('@')[0];
    return namePart.replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  } catch (error) {
    logError('Error getting user display name:', error);
    return 'User';
  }
}

// --- Content from Utility.js ---
/**
 * Normalizes a Request ID to a standard format (e.g., M-DD-YY).
 * @param {string} requestId The raw request ID string.
 * @return {string} The normalized request ID or the original input if not matched.
 */
function normalizeRequestId(requestId) {
  if (!requestId || typeof requestId !== 'string') return requestId;
  const match = requestId.match(/^([A-L])-(\d+)-(\d{2})$/i);
  if (match) {
    const monthLetter = match[1].toUpperCase();
    const sequence = parseInt(match[2], 10);
    const year = match[3];
    return `${monthLetter}-${sequence.toString().padStart(2, '0')}-${year}`;
  }
  return requestId;
}

/**
 * Cleans a phone number string by removing all non-digit characters.
 * @param {string|number} phone The phone number to clean.
 * @return {string} The cleaned phone number containing only digits, or an empty string if input is falsy.
 */
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

/**
 * Constructs an SMS gateway email address from a phone number and carrier.
 * @param {string|number} phone The phone number.
 * @param {string} carrier The carrier name.
 * @return {string} The constructed SMS gateway email address.
 * @throws {Error} If the carrier is unknown.
 */
function getSmsGatewayEmail(phone, carrier) {
  const cleanPhone = cleanPhoneNumber(phone);
  const gateway = CONFIG.smsGateways[String(carrier).toLowerCase()];
  if (!gateway) throw new Error(`Unknown carrier: ${carrier}`);
  return `${cleanPhone}@${gateway}`;
}

/**
 * Extract name from email address as fallback.
 * @param {string} email The email address.
 * @return {string} A displayable name extracted from the email.
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
 * Tests basic server-side connectivity and script functionality.
 * @return {object} An object containing a timestamp, active spreadsheet name, sheet count, and server status.
 */
function testServerConnection() {
  try {
    console.log('🔧 Testing server connection...');
    const testData = {
      timestamp: new Date().toISOString(),
      activeSpreadsheet: SpreadsheetApp.getActiveSpreadsheet().getName(),
      sheetsCount: SpreadsheetApp.getActiveSpreadsheet().getSheets().length,
      serverStatus: 'OK'
    };
    console.log('✅ Server connection test successful:', testData);
    return testData;
  } catch (error) {
    console.error('❌ Server connection test failed:', error);
    return { timestamp: new Date().toISOString(), serverStatus: 'ERROR', error: error.message };
  }
}

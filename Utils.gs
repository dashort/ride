// This file will contain utility functions.

/**
 * Log error safely to the spreadsheet and console.
 * @param {string} message The error message.
 * @param {Error} [error] The error object (optional).
 */
function logError(message, error) {
  console.error(message, error ? error.stack : '');
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheetName = (typeof CONFIG !== 'undefined' && CONFIG.sheets && CONFIG.sheets.log) ? CONFIG.sheets.log : 'ErrorLog';
    const logSheet = ss.getSheetByName(logSheetName);
    if (logSheet) {
      logSheet.appendRow([
        new Date(),
        'ERROR',
        message,
        error ? error.toString() : '',
        error && error.stack ? error.stack : 'No stack trace'
      ]);
    } else {
      console.warn(`Log sheet "${logSheetName}" not found.`);
    }
  } catch (logErr) {
    console.error('Failed to log error to sheet:', logErr);
  }
}

/**
 * Log activity to the spreadsheet and console.
 * @param {string} message The activity message.
 */
function logActivity(message) {
  console.log(message);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheetName = (typeof CONFIG !== 'undefined' && CONFIG.sheets && CONFIG.sheets.log) ? CONFIG.sheets.log : 'ActivityLog';
    const logSheet = ss.getSheetByName(logSheetName);
    if (logSheet) {
      logSheet.appendRow([new Date(), 'ACTIVITY', message]);
    } else {
      console.warn(`Log sheet "${logSheetName}" not found.`);
    }
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

/**
 * Format date for display using CONFIG settings or a default.
 * @param {Date} date The date object to format.
 * @return {string} The formatted date string or 'No Date'.
 */
function formatDateForDisplay(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return 'No Date';
  try {
    const timezone = (typeof CONFIG !== 'undefined' && CONFIG.system && CONFIG.system.timezone) ? CONFIG.system.timezone : Session.getScriptTimeZone();
    const dateFormat = (typeof CONFIG !== 'undefined' && CONFIG.system && CONFIG.system.dateFormat) ? CONFIG.system.dateFormat : 'MM/dd/yyyy';
    return Utilities.formatDate(date, timezone, dateFormat);
  } catch (error) {
    logError('Error formatting date for display', error);
    return 'Invalid Date';
  }
}

/**
 * Format time for display using CONFIG settings or a default.
 * @param {Date|string} time The time object or string to format.
 * @return {string} The formatted time string or 'No Time'.
 */
function formatTimeForDisplay(time) {
  if (!time) return 'No Time';
  try {
    const timezone = (typeof CONFIG !== 'undefined' && CONFIG.system && CONFIG.system.timezone) ? CONFIG.system.timezone : Session.getScriptTimeZone();
    const timeFormat = (typeof CONFIG !== 'undefined' && CONFIG.system && CONFIG.system.timeFormat) ? CONFIG.system.timeFormat : 'HH:mm';
    if (time instanceof Date) {
      if (isNaN(time.getTime())) return 'Invalid Time';
      return Utilities.formatDate(time, timezone, timeFormat);
    } else if (typeof time === 'string') {
      const parsedDate = new Date('1970/01/01 ' + time);
      if (!isNaN(parsedDate.getTime())) {
        return Utilities.formatDate(parsedDate, timezone, timeFormat);
      }
      return time;
    }
    return 'Invalid Time Input';
  } catch (error) {
    logError('Error formatting time for display: ' + time, error);
    return 'Invalid Time';
  }
}

/**
 * Normalize column name for matching.
 * @param {string} name The column name.
 * @return {string} The normalized column name.
 */
function normalizeColumnName(name) {
  return String(name || '').trim().toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
}

/**
 * Get column index from a map.
 * @param {Object} columnMap The column map (header name to index).
 * @param {string} columnName The name of the column to find.
 * @return {number|undefined} The column index or undefined if not found.
 */
function getColumnIndex(columnMap, columnName) {
  if (!columnMap || !columnName) return undefined;
  if (columnMap.hasOwnProperty(columnName)) return columnMap[columnName];
  const normalizedNameToFind = normalizeColumnName(columnName);
  for (const [key, index] of Object.entries(columnMap)) {
    if (normalizeColumnName(key) === normalizedNameToFind) return index;
  }
  return undefined;
}

/**
 * Get cell value safely from a row array using column map.
 * @param {Array} row The row data array.
 * @param {Object} columnMap The column map (header name to index).
 * @param {string} columnName The name of the column.
 * @return {*} The cell value or null if not found or error.
 */
function getColumnValue(row, columnMap, columnName) {
  try {
    const columnIndex = getColumnIndex(columnMap, columnName);
    if (columnIndex === undefined || columnIndex < 0 || !row || columnIndex >= row.length) {
      return null;
    }
    return row[columnIndex];
  } catch (error) {
    logError(`Error getting column value for "${columnName}"`, error);
    return null;
  }
}

/**
 * Extract a display name from an email address.
 * @param {string} email The email address.
 * @return {string} The extracted name or 'User' if not possible.
 */
function extractNameFromEmail(email) {
  if (!email || typeof email !== 'string') return 'User';
  try {
    const localPart = email.split('@')[0];
    const nameParts = localPart.split(/[._]/).map(part =>
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    );
    return nameParts.join(' ');
  } catch (error) {
    logError('Error extracting name from email', error);
    return 'User';
  }
}

/**
 * Format a timestamp into a 'time ago' string.
 * @param {Date|string|number} timestamp The timestamp to format.
 * @return {string} The formatted 'time ago' string.
 */
function formatTimeAgo(timestamp) {
  if (!timestamp) return 'never';
  try {
    const now = new Date();
    const time = new Date(timestamp);
    if (isNaN(time.getTime())) return 'invalid date';
    const diffMs = now.getTime() - time.getTime();
    const diffSecs = Math.round(diffMs / 1000);
    const diffMins = Math.round(diffSecs / 60);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);
    if (diffSecs < 60) return `${diffSecs} sec ago`;
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } catch (error) {
    logError('Error formatting time ago', error);
    return 'long ago';
  }
}

/**
 * Safely gets the web app URL.
 * @return {string} The web app URL or '#' if an error occurs.
 */
function getWebAppUrlSafe() {
  try {
    // Check if a global getWebAppUrl exists (e.g., if defined in WebAppService.gs for specific logic)
    // It's better practice for getWebAppUrl to be in WebAppService if it has complex logic,
    // or here if it's just a direct call to ScriptApp.getService().getUrl().
    // For this refactoring, we assume it might be defined elsewhere or can be called directly.
    if (typeof getWebAppUrl === 'function' && getWebAppUrl.name !== 'getWebAppUrlSafe') {
      return getWebAppUrl();
    }
    return ScriptApp.getService().getUrl();
  } catch (error) {
    logError('Error getting web app URL in getWebAppUrlSafe', error);
    return '#';
  }
}

/**
 * Determines the HTML file name for a given page and user role.
 * @param {string} pageName The name of the page (e.g., 'dashboard', 'requests').
 * @param {string} userRole The role of the user (e.g., 'admin', 'dispatcher', 'rider').
 * @return {string} The name of the HTML file (without .html extension). Defaults to 'index'.
 */
function getPageFileNameSafe(pageName, userRole) {
  console.log(`Utils.getPageFileNameSafe: For page "${pageName}", role "${userRole}"`);

  // Default page mapping - these are the actual .html file names
  const defaultPages = {
    'dashboard': 'index',
    'requests': 'requests',
    'assignments': 'assignments',
    'riders': 'riders',
    'notifications': 'notifications',
    'reports': 'reports',
    'user-management': 'user-management',
    'admin-schedule': 'admin-schedule',
    'rider-schedule': 'rider-schedule',
    'my-assignments': 'rider-assignments', // Example: Rider specific view for assignments
    'my-profile': 'rider-profile', // Example: Rider profile page
    'settings': 'settings', // Example: System settings page for admin
    'signin': 'signin', // Sign-in page
    'unauthorized': 'unauthorized', // Unauthorized access page
    'error': 'error' // Generic error page
  };

  // Role-specific page overrides. Values here should match keys in defaultPages or be valid file names.
  const rolePageMap = {
    admin: {
      'dashboard': 'admin-dashboard', // Admins see admin-dashboard.html instead of index.html
    },
    dispatcher: {
      'dashboard': 'dispatcher-dashboard', // Dispatchers see dispatcher-dashboard.html
    },
    rider: {
      'dashboard': 'rider-dashboard',
      'assignments': 'my-assignments', // Riders see their assignments via my-assignments.html
      'requests': null, // Riders might not have access to the general requests list
    }
  };

  let fileName = defaultPages[pageName] || 'index'; // Default to index if pageName is not in defaultPages

  // Apply role-specific override if one exists for that pageName and role
  if (rolePageMap[userRole] && rolePageMap[userRole][pageName] !== undefined) {
    if (rolePageMap[userRole][pageName] === null) {
      console.warn(`Utils.getPageFileNameSafe: No page configured for role "${userRole}" and page "${pageName}". Falling back to "unauthorized.html".`);
      return defaultPages['unauthorized'] || 'index'; // Fallback to an unauthorized page or index
    }
    fileName = rolePageMap[userRole][pageName];
     // Ensure the role-specific page is a known page, otherwise, it might be a configuration error.
    if (!defaultPages[fileName] && !checkFileExists(fileName)) {
        console.warn(`Utils.getPageFileNameSafe: Role-specific page "${fileName}" for role "${userRole}" and pageName "${pageName}" is not a standard page and file does not exist. Defaulting to index.`);
        Utils.logError(`Role-specific file "${fileName}.html" not found for page "${pageName}", role "${userRole}".`);
        return defaultPages['index'];
    } else if (!checkFileExists(fileName)) {
        // If it was supposed to be a standard page but the file is missing
        console.warn(`Utils.getPageFileNameSafe: File "${fileName}.html" (mapped for role "${userRole}", page "${pageName}") not found. Defaulting to index.`);
        Utils.logError(`HTML file "${fileName}.html" not found for page "${pageName}", role "${userRole}".`);
        return defaultPages['index'];
    }
  } else if (!checkFileExists(fileName)) {
    // If the default page file is missing
    console.warn(`Utils.getPageFileNameSafe: Default file "${fileName}.html" for page "${pageName}" not found. Defaulting to index.`);
    Utils.logError(`HTML file "${fileName}.html" not found for page "${pageName}".`);
    return defaultPages['index'];
  }

  console.log(`Utils.getPageFileNameSafe: Determined file name: "${fileName}.html"`);
  return fileName;
}

/**
 * Injects user information into HTML content placeholders.
 * Placeholders: {{USER_NAME}}, {{USER_EMAIL}}, {{USER_ROLE}}, {{USER_AVATAR}}, {{RIDER_ID}}, {{RIDER_STATUS}}
 * @param {string} content The HTML content.
 * @param {object} user The user object (with name, email, role, avatar).
 * @param {object} rider The rider object (with id, status) or null.
 * @return {string} The modified HTML content.
 */
function injectUserInfoSafe(content, user, rider) {
  if (!content || typeof content !== 'string') {
    console.warn("Utils.injectUserInfoSafe: Content is not a string. Skipping injection.");
    return content || "";
  }
  if (!user || typeof user !== 'object') {
    console.warn("Utils.injectUserInfoSafe: User object is invalid. Skipping injection.");
    return content;
  }

  // Define default values for user properties to avoid 'undefined' in HTML
  const userName = user.name || 'User';
  const userEmail = user.email || '';
  const userRole = user.role || 'Guest';
  const userAvatar = user.avatar || (userName ? userName.charAt(0).toUpperCase() : 'U');

  const riderId = rider && rider.id ? rider.id : '';
  const riderStatus = rider && rider.status ? rider.status : '';

  content = content.replace(/\{\{USER_NAME\}\}/g, escapeJsString(userName));
  content = content.replace(/\{\{USER_EMAIL\}\}/g, escapeJsString(userEmail));
  content = content.replace(/\{\{USER_ROLE\}\}/g, escapeJsString(userRole));
  content = content.replace(/\{\{USER_AVATAR\}\}/g, escapeJsString(userAvatar));
  content = content.replace(/\{\{RIDER_ID\}\}/g, escapeJsString(riderId));
  content = content.replace(/\{\{RIDER_STATUS\}\}/g, escapeJsString(riderStatus));

  return content;
}

/**
 * Adds a script tag to inject currentUser object into the page for client-side use.
 * @param {string} content The HTML content.
 * @param {object} user The user object.
 * @param {object} rider The rider object or null.
 * @return {string} The modified HTML content with the user data script.
 */
function addUserDataInjectionSafe(content, user, rider) {
  if (!content || typeof content !== 'string') {
    console.warn("Utils.addUserDataInjectionSafe: Content is not a string. Skipping injection.");
    return content || "";
  }
   if (!user || typeof user !== 'object') {
    console.warn("Utils.addUserDataInjectionSafe: User object is invalid. Skipping injection.");
    return content;
  }

  const userData = {
    name: user.name || 'User',
    email: user.email || '',
    role: user.role || 'guest',
    permissions: user.permissions || [],
    riderId: rider && rider.id ? rider.id : '',
    isRider: !!(rider && rider.id) // Ensure boolean
  };

  // Escape user data for safe injection into JSON.stringify
  const escapedUserData = {};
  for (const key in userData) {
    if (typeof userData[key] === 'string') {
      escapedUserData[key] = escapeJsString(userData[key]);
    } else if (Array.isArray(userData[key])) {
      escapedUserData[key] = userData[key].map(item => typeof item === 'string' ? escapeJsString(item) : item);
    }
     else {
      escapedUserData[key] = userData[key];
    }
  }

  const userScript = `
<script id="userDataInjection">
  window.currentUser = ${JSON.stringify(escapedUserData)};
  console.log('Utils.addUserDataInjectionSafe: User context loaded:', window.currentUser);
  document.dispatchEvent(new CustomEvent('userDataReady', { detail: window.currentUser }));
</script>`;

  content = content.replace(/<script id="userDataInjection">[\s\S]*?<\/script>/g, ''); // Remove old one if exists

  if (content.includes('</head>')) {
    content = content.replace('</head>', userScript + '\n</head>');
  } else if (content.includes('</body>')) {
    content = content.replace('</body>', userScript + '\n</body>');
  } else {
    content += userScript;
  }
  return content;
}

/**
 * Helper function to escape strings for JavaScript injection within HTML.
 * @param {string} str The string to escape.
 * @return {string} The escaped string.
 */
function escapeJsString(str) {
  if (str === null || typeof str === 'undefined') {
    return '';
  }
  return String(str)
    .replace(/\\/g, '\\\\') // Backslash
    .replace(/'/g, '\\\'')  // Single quote
    .replace(/"/g, '\\"')  // Double quote
    .replace(/\n/g, '\\n') // Newline
    .replace(/\r/g, '\\r') // Carriage return
    .replace(/\t/g, '\\t') // Tab
    .replace(/</g, '\\u003c') // Less than
    .replace(/>/g, '\\u003e') // Greater than
    .replace(/&/g, '\\u0026') // Ampersand
    .replace(/\u2028/g, '\\u2028') // Line separator
    .replace(/\u2029/g, '\\u2029'); // Paragraph separator
}


/**
 * Checks if required sheets exist and creates them if missing.
 */
function ensureSheetsExist() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (typeof CONFIG === 'undefined' || !CONFIG.sheets || !CONFIG.columns) {
    console.error("Utils.ensureSheetsExist: CONFIG object not found or not properly structured.");
    logError("CONFIG object not properly defined for ensureSheetsExist");
    return;
  }

  Object.values(CONFIG.sheets).forEach(sheetName => {
    if (typeof sheetName !== 'string') {
        console.warn("Utils.ensureSheetsExist: Invalid sheet name in CONFIG.sheets:", sheetName);
        return;
    }
    if (!ss.getSheetByName(sheetName)) {
      console.log(`Utils.ensureSheetsExist: Creating missing sheet: ${sheetName}`);
      const newSheet = ss.insertSheet(sheetName);
      let headers = [];
      const columnConfigKey = Object.keys(CONFIG.sheets).find(key => CONFIG.sheets[key] === sheetName);
      if (columnConfigKey && CONFIG.columns[columnConfigKey]) {
          headers = Object.values(CONFIG.columns[columnConfigKey]);
      } else {
          console.warn(`Utils.ensureSheetsExist: No column configuration found for sheet: ${sheetName}`);
      }
      if (headers.length > 0) {
        newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        console.log(`Utils.ensureSheetsExist: Added headers to ${sheetName}`);
      }
    }
  });
}

/**
 * Checks if an HTML file exists in the project.
 * @param {string} fileName The name of the HTML file (without .html extension).
 * @return {boolean} True if the file exists, false otherwise.
 */
function checkFileExists(fileName) {
  try {
    HtmlService.createHtmlOutputFromFile(fileName);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Gets a sheet by name, creating it with headers if it doesn't exist.
 * @param {string} sheetName The name of the sheet.
 * @param {Array<string>} [headers] Optional array of header strings to set if the sheet is created.
 * @return {GoogleAppsScript.Spreadsheet.Sheet} The sheet object.
 */
function getSheet(sheetName, headers = []) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    console.log(`Utils.getSheet: Created new sheet: ${sheetName}`);
    if (headers.length > 0) {
      try {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        console.log(`Utils.getSheet: Set headers for new sheet: ${sheetName}`);
      } catch (e) {
        logError(`Utils.getSheet: Failed to set headers for ${sheetName}`, e);
      }
    }
  }
  return sheet;
}
>>>>>>> REPLACE

/**
 * @fileoverview
 * This is the main server-side script file for the Motorcycle Escort Management System.
 * It contains global configurations, core functions like onOpen and doGet/doPost for web app handling,
 * utility classes like DataCache, and event handlers like _onEdit.
 * It serves as the central hub for the Google Apps Script project.
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
const CONFIG = {
  // Sheet names
  sheets: {
    dashboard: "Dashboard",
    requests: "Requests",
    riders: "Riders",
    assignments: "Assignments",
    history: "History",
    settings: "Settings",
    log: "Log" // This exists
  },

  // Column mappings (try to use consistent names)
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
      ridersAssigned: 'Riders Assigned', // Maps to your Column Q
      courtesy: 'Courtesy', // Maps to your Column R
      lastUpdated: 'Last Updated'
    },
    riders: {
      jpNumber: 'Rider ID',
      name: 'Full Name',
      phone: 'Phone Number',
      carrier: 'Carrier',
      email: 'Email',
      smsGateway: 'SMS Gateway Email',
      status: 'Status',
      certification: 'Certification',
      totalAssignments: 'Total Assignments',
      LastAssignmentDate: 'Last Assignment Date'
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
      jpNumber: 'JP Number', // Added for consistency in assignments.
      status: 'Status',
      createdDate: 'Created Date',
      notified: 'Notified',
      smsSent: 'SMS Sent',
      emailSent: 'Email Sent',
      completedDate: 'Completed Date',
      calendarEventId: 'Calendar Event ID',
      notes: 'Notes'
    }
  },

  // Dropdown options
  options: {
    requestTypes: ['Wedding', 'Funeral', 'Float Movement', 'VIP', 'Other'],
    requestStatuses: ['New', 'Pending', 'Assigned', 'Unassigned', 'In Progress', 'Completed', 'Cancelled'],
    riderStatuses: ['Active', 'Inactive', 'Vacation', 'Training', 'Suspended'],
    assignmentStatuses: ['Assigned', 'Confirmed', 'En Route', 'In Progress', 'Completed', 'Cancelled', 'No Show'],
    carriers: ['Verizon', 'AT&T', 'T-Mobile', 'Sprint', 'Virgin Mobile', 'Boost Mobile', 'Cricket', 'Metro PCS', 'US Cellular', 'Google Fi', 'Xfinity Mobile', 'Spectrum Mobile', 'Other']
  },

  // SMS carrier gateways
  smsGateways: {
    'verizon': 'vtext.com',
    'at&t': 'txt.att.net',
    'tmobile': 'tmomail.net',
    'sprint': 'messaging.sprintpcs.com',
    'virgin mobile': 'vmobl.com',
    'boost mobile': 'sms.myboostmobile.com',
    'cricket': 'sms.cricketwireless.net',
    'metro pcs': 'mymetropcs.com',
    'us cellular': 'email.uscc.net',
    'google fi': 'msg.fi.google.com',
    'xfinity mobile': 'vtext.com',
    'spectrum mobile': 'vtext.com'
  },

  // Dashboard layout settings
  dashboard: {
    requestsDisplayStartRow: 11, // Actual row where request data begins its display (e.g., 11)
    scheduleStartRow: 9, // Schedule at top-right
    scheduleStartCol: 12, // Column L (original was 14, moving left by 2)
    summaryStatsStartCol: 1, // Column A (moving back to original left position)
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


// ===== MAIN FUNCTIONS & MENU SETUP =====

/**
 * Trigger function that runs when the Google Sheet is opened.
 * Sets up the custom menu, displays the dashboard layout, and refreshes dashboard data.
 * @return {void}
 */
function onOpen() {
  try {
    console.log('Starting onOpen...');
    createMenu();
    displayDashboardLayout();
    setupDashboardFilterDropdown(); // Sets up dropdown and initial value
    refreshDashboard(true); // Call refresh with forceUpdate=true to ensure fresh data and layout
    console.log('Menu created successfully, dashboard initialized.');
  } catch (error) {
    console.error('onOpen error:', error);
  }
}

/**
 * Creates the custom menu in the Google Sheet UI.
 * Provides access to various system functionalities like opening sidebars, refreshing data,
 * and triggering bulk notifications.
 * @return {void}
 */
function createMenu() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('🏍️ Escort Management')
    .addItem('🏍️ Open Assignment Sidebar', 'showEscortSidebar') // This function will be moved from QuickAssign.js
    .addItem('📊 Refresh Dashboard', 'refreshDashboard')
    .addSeparator()
    .addSubMenu(ui.createMenu('📱 Bulk SMS Notifications')
      .addItem('📅 Today\'s Assignments', 'sendTodaySMS')
      .addItem('📆 This Week\'s Assignments', 'sendWeekSMS')
      .addItem('🔄 All Pending Assignments', 'sendPendingSMS')
      .addItem('✅ All Assigned Requests', 'sendAllAssignedSMS')
    )
    .addSubMenu(ui.createMenu('📧 Bulk Email Notifications')
      .addItem('📅 Today\'s Assignments', 'sendTodayEmail')
      .addItem('📆 This Week\'s Assignments', 'sendWeekEmail')
      .addItem('🔄 All Pending Assignments', 'sendPendingEmail')
      .addItem('✅ All Assigned Requests', 'sendAllAssignedEmail')
    )
    .addSubMenu(ui.createMenu('📨 Bulk Both Notifications')
      .addItem('📅 Today\'s Assignments', 'sendTodayBoth')
      .addItem('📆 This Week\'s Assignments', 'sendWeekBoth')
      .addItem('🔄 All Pending Assignments', 'sendPendingBoth')
      .addItem('✅ All Assigned Requests', 'sendAllAssignedBoth')
    )
    .addSeparator()
    .addItem('📊 Notification Report', 'generateNotificationReport')
    .addSeparator()
    .addItem('Generate Missing Request IDs', 'generateAllMissingRequestIds')
    .addToUi();
}
/**
 * Handles HTTP GET requests to the web app, primarily for initial page loads and mobile detection.
 * This version appears to be an older or alternative doGet, potentially for a mobile detection/redirector page.
 * The primary page serving logic with navigation injection is in the second doGet function below.
 * @param {GoogleAppsScript.Events.DoGet} e The event object from the GET request.
 * @return {GoogleAppsScript.HTML.HtmlOutput} The HTML output to be served.
 */
function doGet(e) {
  try {
    // Mobile detection
    const userAgent = Utilities.getUuid(); // This won't work for user agent, let's use a different approach
    let isMobile = false;

    // Check if mobile is explicitly requested
    if (e.parameter.mobile === 'true') {
      isMobile = true;
    } else if (e.parameter.mobile === 'false') {
      isMobile = false;
    } else {
      // Auto-detect based on common mobile patterns in referrer or other indicators
      // Since we can't directly access user agent in Apps Script, we'll use URL parameters
      isMobile = e.parameter.m === '1' || e.parameter.mobile === '1';
    }
    
    const page = e.parameter.page || 'dashboard';
    console.log(`Loading page: ${page}, Mobile: ${isMobile}`);
    
    let htmlOutput;
    
    switch(page) {
      case 'dashboard':
        if (isMobile) {
          htmlOutput = HtmlService.createHtmlOutputFromFile('mobile-dashboard');
        } else {
          htmlOutput = HtmlService.createHtmlOutputFromFile('index');
        }
        break;

      case 'requests':
        if (isMobile) {
          htmlOutput = HtmlService.createHtmlOutputFromFile('mobile-requests');
        } else {
          htmlOutput = HtmlService.createHtmlOutputFromFile('requests');
        }
        break;

      case 'assignments':
        if (isMobile) {
          htmlOutput = HtmlService.createHtmlOutputFromFile('mobile-assignments');
        } else {
          htmlOutput = HtmlService.createHtmlOutputFromFile('assignments');
        }
        break;

      case 'notifications':
        if (isMobile) {
          htmlOutput = HtmlService.createHtmlOutputFromFile('mobile-notifications');
        } else {
          htmlOutput = HtmlService.createHtmlOutputFromFile('notifications');
        }
        break;

      case 'reports':
        // Reports probably better on desktop for now
        htmlOutput = HtmlService.createHtmlOutputFromFile('reports');
        break;

      default:
        // Default to dashboard
        if (isMobile) {
          htmlOutput = HtmlService.createHtmlOutputFromFile('mobile-dashboard');
        } else {
          htmlOutput = HtmlService.createHtmlOutputFromFile('index');
        }
    }
    
    // Add mobile detection redirect page if no specific mobile version requested
    if (!isMobile && !e.parameter.mobile) {
      // Create a detection page that can redirect to mobile if needed
      return HtmlService.createHtmlOutput(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Motorcycle Escort Management</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; text-align: center; }
            .container { max-width: 600px; margin: 50px auto; }
            .btn { display: inline-block; padding: 15px 30px; margin: 10px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; font-size: 18px; }
            .btn:hover { background: #2980b9; }
            .mobile-btn { background: #e74c3c; }
            .mobile-btn:hover { background: #c0392b; }
            @media (max-width: 768px) {
              .auto-redirect { display: block; margin-top: 30px; padding: 20px; background: #f39c12; color: white; border-radius: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🏍️ Motorcycle Escort Management</h1>
            <p>Choose your preferred interface:</p>

            <a href="?mobile=false" class="btn">💻 Desktop Version</a>
            <a href="?mobile=true" class="btn mobile-btn">📱 Mobile Version</a>

            <div class="auto-redirect" style="display: none;">
              <p>📱 Mobile device detected!</p>
              <p>Redirecting to mobile version in <span id="countdown">3</span> seconds...</p>
              <a href="?mobile=false">Use desktop version instead</a>
            </div>
          </div>

          <script>
            // Mobile detection and auto-redirect
            function isMobileDevice() {
              return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     (window.innerWidth <= 768 && window.innerHeight <= 1024);
            }

            if (isMobileDevice()) {
              document.querySelector('.auto-redirect').style.display = 'block';
              let countdown = 3;
              const countdownEl = document.getElementById('countdown');

              const timer = setInterval(() => {
                countdown--;
                countdownEl.textContent = countdown;

                if (countdown <= 0) {
                  clearInterval(timer);
                  window.location.href = '?mobile=true&page=${page}';
                }
              }, 1000);
            }
          </script>
        </body>
        </html>
      `).setTitle('Motorcycle Escort Management - Choose Interface');
    }
    
    return htmlOutput
      .setTitle(isMobile ? 'Mobile - Escort Management' : 'Motorcycle Escort Management')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  } catch (error) {
    logError('doGet error (mobile detection part)', error);
    return HtmlService.createHtmlOutput(`
      <html><body style="font-family: Arial; padding: 20px;">
        <h1>⚠️ Error Loading Page</h1>
        <p>Error: ${error.message}</p>
        <p><a href="?" style="color: #3498db;">Return to Home</a></p>
        <p><strong>Debug Info:</strong> Requested page: ${e.parameter.page}, Mobile: ${e.parameter.mobile}</p>
      </body></html>
    `);
  }
}
/**
 * Enhanced onEdit function that clears cache when relevant sheets are modified.
 * Also handles Request ID generation, dashboard filter changes, and notification actions.
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e The onEdit event object.
 * @return {void}
 */
function _onEdit(e) {
  // Simple throttling to prevent rapid, identical edits from firing multiple times.
  const now = Date.now();
  const last = PropertiesService.getScriptProperties().getProperty('lastEditTime');
  if (last && (now - parseInt(last, 10)) < 1000) { // 1-second debounce.
    console.log('_onEdit: Guard triggered, exiting.');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('lastEditTime', now.toString());

  const range = e.range;
  if (!range) {
    // This should ideally not happen if `e` is a valid edit event.
    console.log('_onEdit: No range in event, exiting.');
    return;
  }

  const sheet = range.getSheet();
  const sheetName = sheet.getName();
  const cellA1 = range.getA1Notation();
  const row = range.getRow();
  const col = range.getColumn();

  console.log(`_onEdit fired on sheet "${sheetName}", cell ${cellA1}`);

  // Protection: Skip rider name column edits (Riders sheet, column B) and header row edits.
  if (sheetName === 'Riders' && (col === 2 || row === 1)) {
    console.log('🛡️ _onEdit: Protecting rider name/header edit - skipping processing');
    return;
  }

  // Clear relevant caches when the underlying data changes.
  if (['Requests', 'Assignments', 'Riders'].includes(sheetName)) {
    clearRequestsCache();
    clearDashboardCache();

    // Specific actions only for Requests sheet
    if (sheetName === CONFIG.sheets.requests) {
      if (row > 1) { // Not header row
        // Generation of Request ID (in column A).
        // This is necessary because onEditRequestsSheet is called within _onEdit now.
        // It needs to be inside a conditional to only trigger if the ID is missing.
        const requestIdCell = sheet.getRange(row, 1);
        requestIdCell.setNumberFormat('@'); // Force plain text format
        let requestId = requestIdCell.getValue();

        if (!requestId || typeof requestId !== 'string' || !requestId.match(/^[A-L]-\d{2}-\d{2}$/)) {
          const newId = generateRequestId(sheet);
          requestIdCell.setValue(newId);
          logActivity(`Generated new Request ID: ${newId} for row ${row}`);
          // A break is needed here to prevent immediate re-triggering, or simply let the next `onEdit` catch it.
          // For simplicity and efficiency, let's allow onEditRequestsSheet handle post-ID-generation logic.
        }
      }
      onEditRequestsSheet(e); // Route to specialized handler for Requests sheet
      return;
    }
  }

  // Handle Dashboard sheet edits.
  if (sheetName === CONFIG.sheets.dashboard) {
    console.log('_onEdit: Routing to dashboard logic');

    // Handle filter dropdown changes (cell B9).
    if (cellA1 === CONFIG.dashboard.filterCell) {
      console.log(`_onEdit: Filter cell changed to "${range.getValue()}", refreshing dashboard.`);
      const lock = LockService.getScriptLock();
      if (lock.tryLock(10000)) { // Attempt to acquire lock for 10 seconds.
        try {
          refreshDashboard(true); // Force update dashboard
        } catch (err) {
          logError('Error refreshing dashboard on filter change', err);
        } finally {
          lock.releaseLock();
        }
      }
      return;
    }

    // Handle notification column actions (column K - 11th column).
    const requestsDisplayStartRow = CONFIG.dashboard.requestsDisplayStartRow;
    if (col === 11 && row >= requestsDisplayStartRow) {
      console.log(`_onEdit: Notification action selected at row ${row}`);
      handleEnhancedNotificationAction(e, sheet, row);
      return;
    }
  }
  console.log(`_onEdit: Edit on unrelated sheet "${sheetName}" or column, skipping.`);
}

// =======================
// REQUEST ID GENERATOR & MANAGEMENT
// =======================
/**
 * Function to handle onEdit events specifically for the Requests sheet.
 * Generates Request ID if missing and updates request status based on rider assignment changes.
 */


// ===== NAVIGATION HELPER =====
/**
 * Fetches the HTML content of the shared navigation menu.
 * @param {string} [currentPage=''] The name of the current page (e.g., 'dashboard', 'requests') to set the active link.
 * @return {string} The HTML content of the navigation menu.
 */
function getNavigationHtml(currentPage = '') {
  try {
    Logger.log("Base Script URL: " + ScriptApp.getService().getUrl()); // Added for URL context
    let navHtmlFromFile = HtmlService.createHtmlOutputFromFile('_navigation.html').getContent();
    Logger.log('Fetched _navigation.html content: ' + navHtmlFromFile);

    let navHtmlProcessed = navHtmlFromFile;
    // Logic to set the 'active' class
    if (currentPage) {
      // More robust regex to add 'active' class to the correct link
      // It looks for an <a> tag with the correct data-page and class="nav-button"
      // and inserts ' active' into the class attribute.
      const linkToMakeActivePattern = new RegExp(
        `(<a[^>]*data-page="${currentPage}"[^>]*class="[^"]*nav-button)([^"]*)("[^>]*>)`,
        'i'
      );

      navHtmlProcessed = navHtmlProcessed.replace(linkToMakeActivePattern, function(match, p1, p2, p3) {
        if (p2.includes(' active')) { // Already active (or nav-button active)
          // Check if it's exactly ' active' or part of another class like 'nav-button-active'
          // This check ensures we don't add 'active' if 'nav-button active' is already present.
          if (/(?:^|\s)active(?:\s|$)/.test(p2)) {
            return match; // Already correctly active
          }
          // If 'active' is part of another class name, this might need more specific handling,
          // but for 'nav-button active' it should be fine.
        }
        // Insert ' active' ensuring a space if other classes follow nav-button
        return `${p1} active${p2}${p3}`;
      });
    }
    Logger.log('Processed navigationMenuHtml (with active class attempt for ' + currentPage + '): ' + navHtmlProcessed);
    return navHtmlProcessed;
  } catch (error) {
    logError('Error getting navigation HTML', error);
    Logger.log('Error in getNavigationHtml: ' + error.toString());
    return '<!-- Navigation Load Error -->'; // Fallback
  }
}

// ===== WEB APP ENTRY POINTS (DO NOT EDIT FUNCTION NAMES)=====

/**
 * Handles HTTP GET requests to the web app.
 * Directs to different HTML pages based on the 'page' parameter.
 * @param {GoogleAppsScript.Events.DoGet} e The event object from the GET request.
 * @return {GoogleAppsScript.HTML.HtmlOutput} The HTML output to be served.
 */
function doGet(e) {
  try {
    // Comprehensive logging of the event object
    Logger.log('-----------------------------------------');
    Logger.log('doGet called. Event object: ' + JSON.stringify(e));
    if (e) {
      Logger.log('e.parameter: ' + JSON.stringify(e.parameter));
      Logger.log('e.parameters: ' + JSON.stringify(e.parameters));
      Logger.log('e.contextPath: ' + e.contextPath);
      Logger.log('e.queryString: ' + e.queryString);
      Logger.log('e.parameter.page: ' + e.parameter.page);
    } else {
      Logger.log('Event object e is undefined or null.');
    }

    const pageName = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'dashboard';
    Logger.log(`Determined pageName: ${pageName}`);
    
    const navigationMenuHtml = getNavigationHtml(pageName);
    Logger.log(`getNavigationHtml called with pageName: ${pageName}`);
    let pageFileName = '';
    let pageTitle = 'Motorcycle Escort Management'; // Default title

    switch(pageName) {
      case 'dashboard':
        pageFileName = 'index'; // Assumes index.html is the dashboard
        pageTitle = 'Dashboard - Escort Management';

        // Logging for dashboard case
        Logger.log('--- Debugging doGet for /dashboard ---');
        let tempPageOutput = HtmlService.createHtmlOutputFromFile(pageFileName);
        let tempPageContent = tempPageOutput.getContent();
        Logger.log('Raw content from index.html (snippet): ' + tempPageContent.substring(0, 500));
        const placeholderIndex = tempPageContent.indexOf('<!--NAVIGATION_MENU_PLACEHOLDER-->');
        Logger.log('Placeholder present in index.html raw content: ' + (placeholderIndex !== -1));
        if (placeholderIndex !== -1) {
          Logger.log('Content around placeholder: ' + tempPageContent.substring(Math.max(0, placeholderIndex - 100), placeholderIndex + 130));
        }
        Logger.log('Navigation HTML to be injected: ' + navigationMenuHtml);
        // End logging for dashboard case - actual replacement happens later
        break;
      case 'requests':
        pageFileName = 'requests';
        pageTitle = 'Requests - Escort Management';
        break;
      case 'assignments':
        if (e.parameter.mode === 'sidebar') { // Sidebar is a special case, might not need main nav
          return renderEscortSidebarForWebApp();
        }
        pageFileName = 'assignments';
        pageTitle = 'Assignments - Escort Management';
        break;
      case 'notifications':
        pageFileName = 'notifications';
        pageTitle = 'Notifications - Escort Management';
        break;
      case 'reports':
        pageFileName = 'reports';
        pageTitle = 'Reports - Escort Management';
        break;
      // Handle mobile pages if they should also get the standard navigation
      case 'mobile-requests': // Example if mobile-requests is a full page
        pageFileName = 'mobile-requests';
        pageTitle = 'Mobile Requests - Escort Management';
        break;
      default:
        pageFileName = 'index'; // Fallback to dashboard
        pageTitle = 'Dashboard - Escort Management';
    }

    if (!pageFileName) { // Should not happen with default case, but good practice
        throw new Error("Page not found and no default specified.");
    }

    let htmlOutput = HtmlService.createHtmlOutputFromFile(pageFileName);
    let pageContent = htmlOutput.getContent();

    // Inject navigation menu using placeholder
    const originalLength = pageContent.length;
    pageContent = pageContent.replace('<!--NAVIGATION_MENU_PLACEHOLDER-->', navigationMenuHtml);
    const newLength = pageContent.length;

    if (pageName === 'dashboard') { // Log only for the dashboard case after replacement
        Logger.log('Placeholder replacement done. Original length: ' + originalLength + ', New length: ' + newLength);
        const injectedNavIndex = pageContent.indexOf(navigationMenuHtml);
        if (injectedNavIndex !== -1) {
            Logger.log('Content after injection (snippet around nav): ' + pageContent.substring(Math.max(0, injectedNavIndex - 100), injectedNavIndex + navigationMenuHtml.length + 100));
        } else {
            Logger.log('Navigation HTML not found after replacement attempt.');
        }
        Logger.log('--- End debugging doGet for /dashboard ---');
    }

    htmlOutput.setContent(pageContent);

    return htmlOutput
      .setTitle(pageTitle)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  } catch (error) {
    logError('doGet error', error);
    Logger.log('Critical error in doGet: ' + error.toString());
    return HtmlService.createHtmlOutput(`
      <html><body style="font-family: Arial; padding: 20px;">
        <h1>⚠️ Error Loading Page</h1>
        <p>Error: ${error.message}</p>
        <p><a href="?" style="color: #3498db;">Return to Dashboard</a></p>
        <p><strong>Debug Info:</strong> Requested page: ${e.parameter.page}</p>
      </body></html>
    `);
  }
}


/**
 * Handles HTTP POST requests, serving as an API endpoint for the web app.
 * @param {GoogleAppsScript.Events.DoPost} e The event object from the POST request.
 *                                         `e.parameter.action` specifies the function to call.
 *                                         `e.parameter.data` contains a JSON string of arguments for the action.
 * @return {GoogleAppsScript.ContentService.TextOutput} A JSON response indicating success or failure.
 */
function doPost(e) {
  try {
    const action = e.parameter.action;
    const data = JSON.parse(e.parameter.data || '{}');

    console.log(`doPost action: ${action}`);

    let result = {};

    switch (action) {
      case 'createRequest':
        // Assuming createRequestFromWebApp is defined elsewhere or doesn't exist
        // result = createRequestFromWebApp(data);
        throw new Error('createRequest action not implemented in this version.');

      case 'updateRequestStatus':
        // Assuming updateRequestStatusFromWebApp is defined elsewhere or doesn't exist
        // result = updateRequestStatusFromWebApp(data.requestId, data.status);
        throw new Error('updateRequestStatus action not implemented in this version.');

      case 'assignRiders':
        result = processAssignmentAndPopulate(data.requestId, data.selectedRiders);
        break;

      case 'sendNotification':
        result = sendAssignmentNotification(data.assignmentId, data.notificationType);
        break;

      case 'bulkNotification':
        result = sendBulkNotificationsByTimeframe(data.filter, data.type); // Fixed: data.filter and data.type
        break;

      case 'generateReport':
        result = generateReportData(data.filters);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Return standard success response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logError('doPost error', error);
    // Return standard error response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ENHANCEMENT 6: Bulk notification functions by time period (callable from menu)
 */
// Today's assignments
/** @return {void} Sends SMS for today's assignments. */
function sendTodaySMS() { sendBulkByDateRange('SMS', 'today'); }
/** @return {void} Sends Email for today's assignments. */
function sendTodayEmail() { sendBulkByDateRange('Email', 'today'); }
/** @return {void} Sends Both SMS and Email for today's assignments. */
function sendTodayBoth() { sendBulkByDateRange('Both', 'today'); }

// This week's assignments
/** @return {void} Sends SMS for this week's assignments. */
function sendWeekSMS() { sendBulkByDateRange('SMS', 'week'); }
/** @return {void} Sends Email for this week's assignments. */
function sendWeekEmail() { sendBulkByDateRange('Email', 'week'); }
/** @return {void} Sends Both SMS and Email for this week's assignments. */
function sendWeekBoth() { sendBulkByDateRange('Both', 'week'); }

// Pending assignments (not yet notified)
/** @return {void} Sends SMS for pending assignments (never notified). */
function sendPendingSMS() { sendBulkByStatus('SMS', 'pending'); }
/** @return {void} Sends Email for pending assignments (never notified). */
function sendPendingEmail() { sendBulkByStatus('Email', 'pending'); }
/** @return {void} Sends Both SMS and Email for pending assignments (never notified). */
function sendPendingBoth() { sendBulkByStatus('Both', 'pending'); }

// All assigned requests
/** @return {void} Sends SMS for all active, assigned requests. */
function sendAllAssignedSMS() { sendBulkByStatus('SMS', 'assigned'); }
/** @return {void} Sends Email for all active, assigned requests. */
function sendAllAssignedEmail() { sendBulkByStatus('Email', 'assigned'); }
/** @return {void} Sends Both SMS and Email for all active, assigned requests. */
function sendAllAssignedBoth() { sendBulkByStatus('Both', 'assigned'); }

/**
 * Core logic for sending bulk notifications by date range.
 * @param {string} notificationType - The type of notification ('SMS', 'Email', 'Both').
 * @param {string} dateRange - The predefined date range ('today', 'week').
 * @return {void}
 */
function sendBulkByDateRange(notificationType, dateRange) {
  try {
    console.log(`Bulk ${notificationType} for ${dateRange}`);
    
    // Calculate date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate = new Date(today);
    let endDate = new Date(today);
    
    if (dateRange === 'today') {
      endDate.setHours(23, 59, 59, 999);
    } else if (dateRange === 'week') {
      endDate.setDate(today.getDate() + 7);
      endDate.setHours(23, 59, 59, 999);
    }
    
    const assignmentsData = getAssignmentsData(); // This already retrieves formatted data
    const targetAssignments = assignmentsData.data.filter(assignment => {
      const eventDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate); // This is already a Date object
      const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      
      if (!eventDate || !(eventDate instanceof Date) || !riderName || String(riderName).trim().length === 0) {
        return false;
      }
      
      if (['Cancelled', 'Completed', 'No Show'].includes(status)) {
        return false;
      }
      
      const assignmentDate = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      return assignmentDate.getTime() >= startDate.getTime() && assignmentDate.getTime() <= endDate.getTime();
    });
    
    if (targetAssignments.length === 0) {
      SpreadsheetApp.getUi().alert(`No assignments found for ${dateRange}`);
      return;
    }
    
    const confirmMessage = `Send ${notificationType} notifications to ${targetAssignments.length} assignment(s) for ${dateRange}?`;
    const response = SpreadsheetApp.getUi().alert('Confirm Bulk Notification', confirmMessage, SpreadsheetApp.getUi().ButtonSet.YES_NO);
    
    if (response !== SpreadsheetApp.getUi().Button.YES) {
      return;
    }
    
    processBulkNotifications(targetAssignments, notificationType, `${dateRange} assignments`);
    
  } catch (error) {
    logError(`Error in bulk ${notificationType} for ${dateRange}`, error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Core logic for sending bulk notifications by status type.
 * @param {string} notificationType - The type of notification ('SMS', 'Email', 'Both').
 * @param {string} statusType - The predefined status type ('pending', 'assigned').
 * @return {void}
 */
function sendBulkByStatus(notificationType, statusType) {
  try {
    console.log(`Bulk ${notificationType} for ${statusType} status`);
    
    const assignmentsData = getAssignmentsData(); // This already retrieves formatted data
    let targetAssignments = [];
    
    if (statusType === 'pending') {
      targetAssignments = assignmentsData.data.filter(assignment => {
        const notified = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.notified);
        const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status); // Get full status

        // Count as pending if has rider, has Assigned/Confirmed/In Progress status, and is NOT notified by any means
        const hasRider = riderName && String(riderName).trim().length > 0;
        const isAssignedActive = ['Assigned', 'Confirmed', 'En Route', 'In Progress'].includes(status);
        const isNotified = notified instanceof Date ||
                           (getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.smsSent) instanceof Date) ||
                           (getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.emailSent) instanceof Date);

        return hasRider && isAssignedActive && !isNotified;
      });
    } else if (statusType === 'assigned') {
      targetAssignments = assignmentsData.data.filter(assignment => {
        const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
        
        return riderName && String(riderName).trim().length > 0 && 
               !['Cancelled', 'Completed', 'No Show'].includes(status);
      });
    }
    
    if (targetAssignments.length === 0) {
      SpreadsheetApp.getUi().alert(`No ${statusType} assignments found`);
      return;
    }
    
    const confirmMessage = `Send ${notificationType} notifications to ${targetAssignments.length} ${statusType} assignment(s)?`;
    const response = SpreadsheetApp.getUi().alert('Confirm Bulk Notification', confirmMessage, SpreadsheetApp.getUi().ButtonSet.YES_NO);
    
    if (response !== SpreadsheetApp.getUi().Button.YES) {
      return;
    }
    
    processBulkNotifications(targetAssignments, notificationType, `${statusType} assignments`);
    
  } catch (error) {
    logError(`Error in bulk ${notificationType} for ${statusType}`, error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Processes bulk notifications for a list of assignments.
 * This is the refined version used for both menu actions and any direct API calls.
 * @param {Array<Array<object>>} assignments - An array of assignment data rows.
 * @param {string} notificationType - The type of notification ('SMS', 'Email', 'Both').
 * @param {string} description - A descriptive string for logging (e.g., "today's assignments").
 * @return {object} A result object with success/failure counts and messages.
 */
function processBulkNotifications(assignments, notificationType, description) {
  try {
    console.log(`Processing ${assignments.length} bulk notifications: ${notificationType} for ${description}`);
    
    const assignmentsData = getAssignmentsData(); // Get mapping
    let successfulCount = 0;
    let failedCount = 0;
    const errors = [];
    
    assignments.forEach((assignmentRow, index) => {
      const assignmentId = getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.id);
      const riderName = getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const requestId = getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
      
      console.log(`Processing ${index + 1}/${assignments.length}: ${assignmentId} - ${riderName}`);
      
      try {
        if (notificationType === 'SMS' || notificationType === 'Both') {
          const smsResult = sendAssignmentNotification(assignmentId, 'SMS');
          if (smsResult.success) { successfulCount++; } else { failedCount++; errors.push(`SMS to ${riderName} (${requestId}): ${smsResult.message}`); }
        }
        
        if (notificationType === 'Email' || notificationType === 'Both') {
          const emailResult = sendAssignmentNotification(assignmentId, 'Email');
          if (emailResult.success) { successfulCount++; } else { failedCount++; errors.push(`Email to ${riderName} (${requestId}): ${emailResult.message}`); }
        }
        
        if (index % 5 === 4) { // Pause every 5 notifications to avoid rate limits
          Utilities.sleep(1000);
        }
      } catch (error) {
        failedCount++;
        errors.push(`${riderName} (${requestId}): ${error.message}`);
      }
    });
    
    logActivity(`Bulk ${notificationType} for ${description}: ${successfulCount} successful, ${failedCount} failed`);
    
    const message = `Processed ${assignments.length} notifications: ${successfulCount} successful, ${failedCount} failed.`;
    
    // For menu calls, use SpreadsheetApp.getUi().alert
    if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.getUi) {
      let alertMessage = `Bulk Notification Results for ${description}:\n\n`;
      alertMessage += `📊 Total Processed: ${assignments.length}\n`;
      alertMessage += `✅ Successful: ${successfulCount}\n`;
      alertMessage += `❌ Failed: ${failedCount}\n\n`;
      if (errors.length > 0) {
        alertMessage += `Errors (showing first 5):\n${errors.slice(0, 5).join('\n')}`;
        if (errors.length > 5) alertMessage += `\n... and ${errors.length - 5} more`;
      }
      SpreadsheetApp.getUi().alert('Bulk Notification Results', alertMessage, SpreadsheetApp.getUi().ButtonSet.OK);
    }

    // For doPost calls, return simplified result
    return { success: true, successful: successfulCount, failed: failedCount, errors: errors.slice(0, 10), message: message };
    
  } catch (error) {
    logError('Error processing bulk notifications', error);
    // For menu alerts
    if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.getUi) {
      SpreadsheetApp.getUi().alert('Bulk Notification Error', 'Error processing bulk notifications: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
    }
    // For doPost errors
    throw new Error('Error processing bulk notifications: ' + error.message);
  }
}

/**
 * Generates a comprehensive notification report and displays it in an alert.
 * @return {void}
 */
function generateNotificationReport() {
  try {
    console.log('Generating notification report');
    
    const assignmentsData = getAssignmentsData(); // This already retrieves formatted data
    const allAssignments = assignmentsData.data.filter(assignment => {
      const status = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      return status === 'Assigned';
    });
    
    if (allAssignments.length === 0) {
      SpreadsheetApp.getUi().alert('No assigned riders found for report');
      return;
    }
    
    let report = `📊 NOTIFICATION REPORT\n`;
    report += `Generated: ${formatDateTimeForDisplay(new Date())}\n\n`;
    
    let totalAssignments = 0;
    let notifiedCount = 0;
    let smsCount = 0;
    let emailCount = 0;
    
    const byRequest = {};
    
    allAssignments.forEach(assignment => {
      const requestId = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
      const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const notified = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.notified); // Date object or null
      const smsSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.smsSent); // Date object or null
      const emailSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.emailSent); // Date object or null
      
      totalAssignments++;
      
      if (notified instanceof Date) notifiedCount++;
      if (smsSent instanceof Date) smsCount++;
      if (emailSent instanceof Date) emailCount++;
      
      if (!byRequest[requestId]) {
        byRequest[requestId] = [];
      }
      
      byRequest[requestId].push({
        rider: riderName,
        notified: notified instanceof Date,
        sms: smsSent instanceof Date,
        email: emailSent instanceof Date
      });
    });
    
    report += `📈 SUMMARY:\n`;
    report += `Total Assignments: ${totalAssignments}\n`;
    report += `Notified: ${notifiedCount} (${(totalAssignments > 0 ? (notifiedCount/totalAssignments*100).toFixed(0) : 0)}%)\n`;
    report += `SMS Sent: ${smsCount} (${(totalAssignments > 0 ? (smsCount/totalAssignments*100).toFixed(0) : 0)}%)\n`;
    report += `Email Sent: ${emailCount} (${(totalAssignments > 0 ? (emailCount/totalAssignments*100).toFixed(0) : 0)}%)\n\n`;
    
    report += `📋 BY REQUEST (first 10):\n`;
    Object.entries(byRequest).slice(0, 10).forEach(([requestId, riders]) => {
      report += `${requestId}: ${riders.length} rider(s)\n`;
      riders.forEach(rider => {
        const status = [];
        if (rider.sms) status.push('📱');
        if (rider.email) status.push('📧');
        if (rider.notified) status.push('✅');
        report += `  ${rider.rider}: ${status.join(' ') || '❌'}\n`;
      });
    });
    
    if (Object.keys(byRequest).length > 10) {
      report += `... and ${Object.keys(byRequest).length - 10} more requests\n`;
    }
    
    SpreadsheetApp.getUi().alert('Notification Report', report, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    logError('Error generating notification report', error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Get notification history for the notifications page.
 * @return {Array<object>} An array of notification history objects.
 */
function getNotificationHistory() {
  try {
    const assignmentsData = getAssignmentsData(); // Data is already formatted
    
    const history = assignmentsData.data
      .filter(assignment => {
        const smsSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.smsSent);
        const emailSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.emailSent);
        return (smsSent instanceof Date) || (emailSent instanceof Date); // Filter for rows with actual sent timestamps
      })
      .map(assignment => {
        const smsSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.smsSent);
        const emailSent = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.emailSent);
        const assignmentId = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.id);
        const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const requestId = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
        
        const notifications = [];
        
        if (smsSent instanceof Date) {
          notifications.push({
            id: `${assignmentId}_sms`,
            timestamp: smsSent.toISOString(), // Use ISO string for consistent sorting on client side
            type: 'SMS',
            recipient: riderName,
            requestId: requestId,
            status: 'Success',
            messagePreview: 'Assignment notification sent via SMS'
          });
        }
        
        if (emailSent instanceof Date) {
          notifications.push({
            id: `${assignmentId}_email`,
            timestamp: emailSent.toISOString(),
            type: 'Email',
            recipient: riderName,
            requestId: requestId,
            status: 'Success',
            messagePreview: 'Assignment notification sent via email'
          });
        }
        
        return notifications;
      })
      .flat() // Flatten array of arrays
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Sort by most recent first
    
    return history;
    
  } catch (error) {
    logError('Error getting notification history', error);
    return [];
  }
}

// ===== REPORTS FUNCTIONS =====
/**
 * Generates report data based on filters.
 * @param {object} filters An object containing filter criteria (startDate, endDate, requestType, status).
 * @return {object} Structured report data for display.
 * @throws {Error} If an error occurs during report generation.
 */
function generateReportData(filters) {
  try {
    console.log('Generating report data with filters:', filters);
    
    const requestsData = getRequestsData();
    const assignmentsData = getAssignmentsData();
    const ridersData = getRidersData();
    
    // Filter data based on date range
    const startDate = new Date(filters.startDate);
    startDate.setHours(0,0,0,0);
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);
    
    const filteredRequests = requestsData.data.filter(request => {
      const requestDate = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.date);
      const requestType = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.type);
      const status = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.status);
      
      let matchesDate = true;
      if (requestDate instanceof Date) {
        matchesDate = requestDate >= startDate && requestDate <= endDate;
      }
      
      let matchesType = true;
      if (filters.requestType && filters.requestType !== 'All') {
        matchesType = requestType === filters.requestType;
      }
      
      let matchesStatus = true;
      if (filters.status && filters.status !== 'All') {
        matchesStatus = status === filters.status;
      }
      
      return matchesDate && matchesType && matchesStatus;
    });
    
    // Calculate summary statistics
    const totalRequests = filteredRequests.length;
    const completedRequests = filteredRequests.filter(request => 
      getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.status) === 'Completed'
    ).length;
    
    const activeRiders = ridersData.data.filter(rider =>
      getColumnValue(rider, ridersData.columnMap, CONFIG.columns.riders.status) === 'Active'
    ).length;
    
    // Calculate request types distribution
    const requestTypes = {};
    filteredRequests.forEach(request => {
      const type = getColumnValue(request, requestsData.columnMap, CONFIG.columns.requests.type) || 'Other';
      requestTypes[type] = (requestTypes[type] || 0) + 1;
    });
    
    // Calculate rider performance
    const riderPerformance = [];
    ridersData.data.forEach(rider => {
      const riderName = getColumnValue(rider, ridersData.columnMap, CONFIG.columns.riders.name);
      if (!riderName) return;
      
      const assignments = assignmentsData.data.filter(assignment => {
        const assignmentRider = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const createdDate = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.createdDate);
        
        let matchesDate = true;
        if (createdDate instanceof Date) {
          matchesDate = createdDate >= startDate && createdDate <= endDate;
        }
        
        return assignmentRider === riderName && matchesDate;
      });
      
      if (assignments.length > 0) {
        const completed = assignments.filter(assignment =>
          getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.status) === 'Completed'
        ).length;
        
        riderPerformance.push({
          name: riderName,
          assignments: assignments.length,
          completionRate: assignments.length > 0 ? Math.round((completed / assignments.length) * 100) : 0,
          rating: 4.5 
        });
      }
    });
    
    const reportData = {
      summary: {
        totalRequests: totalRequests,
        completedRequests: completedRequests,
        activeRiders: activeRiders,
        avgCompletionRate: riderPerformance.length > 0 ? Math.round(riderPerformance.reduce((sum, r) => sum + r.completionRate, 0) / riderPerformance.length) : 0
      },
      charts: {
        requestVolume: {
          total: totalRequests,
          // Placeholder for actual trends, would need more complex data processing
        },
        requestTypes: requestTypes,
        // Placeholder for monthly trends
        monthlyTrends: {}
      },
      tables: {
        riderPerformance: riderPerformance.sort((a, b) => b.assignments - a.assignments),
        // Placeholder for response time
        responseTime: {}
      }
    };
    
    return reportData;
    
  } catch (error) {
    logError('Error generating report data', error);
    throw error;
  }
}

/**
 * Fetches and formats recent requests for web app display.
 * @param {number} [limit=10] The maximum number of recent requests to return.
 * @return {Array<object>} An array of formatted recent request objects.
 */
function getRecentRequestsForWebApp(limit = 10) {
  try {
    console.log(`📋 Getting ${limit} recent requests for web app...`);
    
    const requestsData = getRequestsData();
    
    if (!requestsData || !requestsData.data || requestsData.data.length === 0) {
      console.log('❌ No requests data found');
      return [];
    }
    
    const columnMap = requestsData.columnMap;
    
    // Process requests with better error handling
    const validRequests = [];
    
    for (let i = 0; i < requestsData.data.length; i++) {
      try {
        const row = requestsData.data[i];
        
        const requestId = getColumnValue(row, columnMap, CONFIG.columns.requests.id);
        const requesterName = getColumnValue(row, columnMap, CONFIG.columns.requests.requesterName);
        const eventDate = getColumnValue(row, columnMap, CONFIG.columns.requests.eventDate);
        
        // Must have basic required fields
        if (!requestId || !requesterName) {
          continue;
        }
        
        const processedRequest = {
          id: requestId,
          requesterName: requesterName,
          type: getColumnValue(row, columnMap, CONFIG.columns.requests.type) || 'Unknown',
          eventDate: eventDate ? formatDateForDisplay(eventDate) : 'No Date',
          startTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.requests.startTime)) || 'No Time',
          status: getColumnValue(row, columnMap, CONFIG.columns.requests.status) || 'New'
        };
        
        validRequests.push(processedRequest);
        
      } catch (rowError) {
        console.log(`⚠️ Error processing request row ${i}:`, rowError);
      }
    }
    
    // Sort by most recent (if we have valid dates)
    const sortedRequests = validRequests.sort((a, b) => {
      try {
        if (a.eventDate === 'No Date' && b.eventDate === 'No Date') return 0;
        if (a.eventDate === 'No Date') return 1;
        if (b.eventDate === 'No Date') return -1;
        
        const dateA = new Date(a.eventDate);
        const dateB = new Date(b.eventDate);
        
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        
        return dateB.getTime() - dateA.getTime();
      } catch (sortError) {
        return 0;
      }
    });
    
    const recentRequests = sortedRequests.slice(0, limit);
    
    console.log(`✅ Returning ${recentRequests.length} recent requests`);
    return recentRequests;
    
  } catch (error) {
    console.error('❌ Error getting recent requests:', error);
    logError('Error in getRecentRequestsForWebApp', error);
    return [];
  }
}

/**
 * @fileoverview
 * This file contains the `showQuickAssignDialog` function, which is designed to be called
 * from the Google Sheets UI (e.g., a custom menu or a button). It allows users to quickly
 * open the web app's assignment page for a specific Request ID selected on the dashboard sheet.
 */

/**
 * Opens the web application's assignment page for a Request ID selected on the dashboard.
 * It validates the selection, constructs the web app URL with the Request ID,
 * and then uses a small HTML dialog to trigger opening the URL in a new tab.
 * This function is intended to be called from the Google Sheets environment.
 * @return {void}
 */
function showQuickAssignDialog() {
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActive();
    const dashSheet = ss.getSheetByName(CONFIG.sheets.dashboard);

    // Ensure the active sheet is the dashboard
    if (ss.getActiveSheet().getName() !== CONFIG.sheets.dashboard) {
      ui.alert('Error', 'Please navigate to the Dashboard sheet to use this function.', ui.ButtonSet.OK);
      return;
    }

    const activeRange = ss.getActiveRange();
    if (!activeRange) {
      ui.alert('Error', 'Please select a cell containing a Request ID on the dashboard.', ui.ButtonSet.OK);
      return;
    }

    const selectedRow = activeRange.getRow();
    const selectedCol = activeRange.getColumn();

    // Check if the selected row is within the requests display area (starts from row 11)
    const requestsDisplayStartRow = CONFIG.dashboard.requestsDisplayStartRow;
    if (selectedRow < requestsDisplayStartRow) {
      ui.alert('Error', 'Please select a Request ID cell within the displayed requests (rows 11 or below).', ui.ButtonSet.OK);
      return;
    }

    // Check if the selected column is the Request ID column (Column A, which is 1)
    if (selectedCol !== 1) {
      ui.alert('Error', 'Please select a cell in the "Request ID" column (Column A) to assign riders.', ui.ButtonSet.OK);
      return;
    }

    // Get the Request ID from the selected cell
    const requestId = activeRange.getValue();

    // Changed \d{2} to \d{1,2} to allow for single-digit sequence numbers
    if (!requestId || typeof requestId !== 'string' || !requestId.match(/^[A-L]-\d{1,2}-\d{2}$/)) {
      ui.alert('Error', `Invalid Request ID selected: "${requestId}". Please select a valid Request ID.`, ui.ButtonSet.OK);
      return;
    }

    // ===== IMPORTANT: REPLACE THIS WITH YOUR ACTUAL WEB APP DEPLOYMENT URL =====
    // If you don't have one yet, deploy your script as a Web App (Deploy -> New Deployment -> Web App)
    // Make sure "Execute as" is "Me" and "Who has access" is "Anyone".
    const WEB_APP_BASE_URL = "https://script.google.com/macros/s/AKfycbyGPHwTNYnqK59cdsI6NVv5O5aBlrzSnulpVu-WJ86-1rlkT3PqIf_FAWgrFpcNbMVU/exec"; // Example: "https://script.google.com/macros/s/AKfycbxyzabc123defg456hi/exec";

    // IMPORTANT: If you see a generic URL like "https://script.google.com/macros/s/AKfycbxyzabc123defg456hi/exec" you MUST
    // get your unique web app URL from Deploy -> Manage Deployments -> Your Web App Deployment -> Web app URL
    // Each deployment generates a unique URL.

    if (WEB_APP_BASE_URL === "https://script.google.com/macros/s/AKfycbyGPHwTNYnqK59cdsI6NVv5O5aBlrzSnulpVu-WJ86-1rlkT3PqIf_FAWgrFpcNbMVU/exec") {
        ui.alert('Configuration Error', 'Please deploy your script as a Web App and update WEB_APP_BASE_URL in the script with the actual URL from your deployment settings.', ui.ButtonSet.OK);
        return;
    }


    const webAppUrl = `${WEB_APP_BASE_URL}?requestId=${encodeURIComponent(requestId)}`;

    const htmlOutput = HtmlService.createHtmlOutput(`<script>window.open('${webAppUrl}', '_blank').focus(); google.script.host.close();</script>`)
      .setTitle('Opening Assignment Form')
      .setHeight(10)
      .setWidth(10);

    ui.showModalDialog(htmlOutput, 'Opening...');

    logActivity(`Opened assignment form for Request ID: ${requestId}`);

  } catch (error) {
    logError('Error assigning riders from dashboard', error);
    ui.alert('Error', 'Failed to open assignment form: ' + error.message, ui.ButtonSet.OK);
  }
}

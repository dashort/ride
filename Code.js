/**
 * MOTORCYCLE ESCORT MANAGEMENT SYSTEM
 * Centralized Configuration
 */

// Global flag to prevent infinite recursion in debugLogToSheet
// THIS MUST BE AT THE VERY TOP LEVEL OF YOUR SCRIPT, OUTSIDE OF ANY FUNCTION
let isDebugLoggingInProgress = false;

// ===== MAIN CONFIGURATION =====
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
  constructor() {
    this.cache = {};
    this.lastUpdate = {};
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  get(key) {
    const now = Date.now();
    if (this.cache[key] && (now - this.lastUpdate[key] < this.cacheTimeout)) {
      return this.cache[key];
    }
    return null;
  }

  set(key, data) {
    this.cache[key] = data;
    this.lastUpdate[key] = Date.now();
  }

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
const dataCache = new DataCache(); // Instantiate the cache


// ===== MAIN FUNCTIONS & MENU SETUP =====

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

function createMenu() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('🏍️ Escort Management')
    .addItem('🏍️ Open Assignment Sidebar', 'showEscortSidebar')
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
 * Fetches the HTML content of the shared navigation menu.
 * @param {string} [currentPage=''] The name of the current page (e.g., 'dashboard', 'requests') - now handled by client-side JS.
 * @return {string} The HTML content of the navigation menu.
 */
function getNavigationHtml(currentPage = '') {
  try {
    const navHtml = HtmlService.createHtmlOutputFromFile('_navigation.html').getContent();
    return navHtml;
  } catch (error) {
    logError('Error getting navigation HTML', error);
    return `
      <style>
        .navigation {
          display: flex;
          gap: 1rem;
          margin: 2rem auto;
          padding: 0 2rem;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          max-width: 1200px;
        }
        .nav-button {
          padding: 0.75rem 1.5rem;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 25px;
          color: #2c3e50;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s ease;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .nav-button:hover, .nav-button.active {
          background: #3498db;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
        }
      </style>
      <nav class="navigation">
        <a href="#" class="nav-button" onclick="navigateToPage('dashboard')">📊 Dashboard</a>
        <a href="#" class="nav-button" onclick="navigateToPage('requests')">📋 Requests</a>
        <a href="#" class="nav-button" onclick="navigateToPage('assignments')">🏍️ Assignments</a>
        <a href="#" class="nav-button" onclick="navigateToPage('notifications')">📱 Notifications</a>
        <a href="#" class="nav-button" onclick="navigateToPage('reports')">📊 Reports</a>
      </nav>
      <script>
        function navigateToPage(page) {
          const baseUrl = window.location.href.split('?')[0];
          if (page === 'dashboard') {
            window.location.href = baseUrl;
          } else {
            window.location.href = baseUrl + '?page=' + page;
          }
        }
      </script>
    `; // Fallback navigation
  }
}

/**
 * Server-side navigation function to handle page routing
 * Add this function to your Code.js file
 */
function getNavigationUrl(page) {
  try {
    console.log('🧭 Server-side navigation request for page:', page);
    
    // Get the current web app URL
    const currentUrl = ScriptApp.getService().getUrl();
    
    let navigationUrl;
    if (page === 'dashboard') {
      navigationUrl = currentUrl;
    } else {
      navigationUrl = currentUrl + '?page=' + encodeURIComponent(page);
    }
    
    console.log('🧭 Generated navigation URL:', navigationUrl);
    
    return {
      success: true,
      url: navigationUrl,
      page: page
    };
    
  } catch (error) {
    console.error('🧭 Server navigation error:', error);
    logError('Error in getNavigationUrl', error);
    
    return {
      success: false,
      error: error.message,
      page: page
    };
  }
}
/**
 * Enhanced onEdit function that clears cache when relevant sheets are modified.
 * Also handles Request ID generation, dashboard filter changes, and notification actions.
 */
function _onEdit(e) {
  // Simple throttling to prevent rapid, identical edits from firing multiple times
  const now = Date.now();
  const last = PropertiesService.getScriptProperties().getProperty('lastEditTime');
  if (last && (now - parseInt(last, 10)) < 1000) { // 1 second debounce
    console.log('_onEdit: Guard triggered, exiting.');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('lastEditTime', now.toString());

  const range = e.range;
  if (!range) {
    console.log('_onEdit: No range in event, exiting.');
    return;
  }

  const sheet = range.getSheet();
  const sheetName = sheet.getName();
  const cellA1 = range.getA1Notation();
  const row = range.getRow();
  const col = range.getColumn();

  console.log(`_onEdit fired on sheet "${sheetName}", cell ${cellA1}`);

  // Protection: Skip rider name column edits (Riders sheet, column B) and header row edits
  if (sheetName === 'Riders' && (col === 2 || row === 1)) {
    console.log('🛡️ _onEdit: Protecting rider name/header edit - skipping processing');
    return;
  }

  // Clear relevant caches when the underlying data changes
  if (['Requests', 'Assignments', 'Riders'].includes(sheetName)) {
    clearRequestsCache();
    clearDashboardCache();

    // Specific actions only for Requests sheet
    if (sheetName === CONFIG.sheets.requests) {
      if (row > 1) { // Not header row
        // Generation of Request ID (in column A)
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

  // Handle Dashboard sheet edits
  if (sheetName === CONFIG.sheets.dashboard) {
    console.log('_onEdit: Routing to dashboard logic');

    // Handle filter dropdown changes (cell B9)
    if (cellA1 === CONFIG.dashboard.filterCell) {
      console.log(`_onEdit: Filter cell changed to "${range.getValue()}", refreshing dashboard.`);
      const lock = LockService.getScriptLock();
      if (lock.tryLock(10000)) { // Attempt to acquire lock for 10 seconds
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

    // Handle notification column actions (column K - 11th column)
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


/**
 * Opens "Assign Escort Riders" web app for the selected Request ID on the dashboard.
 * Requires the user to select a cell in the Request ID column (Column A) on the Dashboard sheet.
 */
function showQuickAssignDialog() {
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActive();
    const dashSheet = ss.getSheetByName(CONFIG.sheets.dashboard);

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

    const requestsDisplayStartRow = CONFIG.dashboard.requestsDisplayStartRow;
    if (selectedRow < requestsDisplayStartRow) {
      ui.alert('Error', 'Please select a Request ID cell within the displayed requests (rows 11 or below).', ui.ButtonSet.OK);
      return;
    }

    if (selectedCol !== 1) {
      ui.alert('Error', 'Please select a cell in the "Request ID" column (Column A) to assign riders.', ui.ButtonSet.OK);
      return;
    }

    const requestId = activeRange.getValue();

    if (!requestId || typeof requestId !== 'string' || !requestId.match(/^[A-L]-\d{1,2}-\d{2}$/)) {
      ui.alert('Error', `Invalid Request ID selected: "${requestId}". Please select a valid Request ID.`, ui.ButtonSet.OK);
      return;
    }

    // ===== REPLACE THIS WITH YOUR ACTUAL WEB APP DEPLOYMENT URL =====
    const WEB_APP_BASE_URL = "https://script.google.com/macros/s/AKfycbyGPHwTNYnqK59cdsI6NVv5O5aBlrzSnulpVu-WJ86-1rlkT3PqIf_FAWgrFpcNbMVU/exec";
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


// ===== NAVIGATION HELPER =====
/**
 * Fetches the HTML content of the shared navigation menu.
 * @param {string} [currentPage=''] The name of the current page (e.g., 'dashboard', 'requests') to set the active link.
 * @return {string} The HTML content of the navigation menu.
 */
function getNavigationHtml(currentPage = '') {
  try {
    let navHtml = HtmlService.createHtmlOutputFromFile('_navigation.html').getContent();
    
    // Logic to set the 'active' class - can be enhanced later
    // For now, a simple string replacement based on data-page attribute.
    if (currentPage) {
      const activeMarker = `data-page="${currentPage}"`;
      const replaceString = `class="nav-button active" data-page="${currentPage}"`;
      // Ensure we only replace if the class="nav-button" is also present to avoid mangling other attributes.
      navHtml = navHtml.replace(
        new RegExp(`class="nav-button" ${activeMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), 
        replaceString
      );
    }
    return navHtml;
  } catch (error) {
    logError('Error getting navigation HTML', error);
    return '<!-- Navigation Load Error -->'; // Fallback
  }
}

// ===== WEB APP ENTRY POINTS (DO NOT EDIT FUNCTION NAMES)=====
/**
 * Force injection doGet - bypasses placeholder issues
 */
function doGet(e) {
  try {
    const page = e.parameter.page || 'dashboard';
    console.log(`Loading page: ${page}`);
    
    // Determine file to load
    let pageFileName = 'index';
    switch(page) {
      case 'requests': pageFileName = 'requests'; break;
      case 'assignments': pageFileName = 'assignments'; break;
      case 'notifications': pageFileName = 'notifications'; break;
      case 'reports': pageFileName = 'reports'; break;
    }
    
    console.log(`Loading HTML file: ${pageFileName}`);
    
    // Get navigation HTML from _navigation.html file
    const navigationHtml = getNavigationHtml(page);
    
    // Get page content
    const htmlOutput = HtmlService.createHtmlOutputFromFile(pageFileName);
    let pageContent = htmlOutput.getContent();
    
    console.log(`Original content length: ${pageContent.length}`);
    
    // Try multiple injection strategies
    let injected = false;
    
    // Strategy 1: Look for placeholder (any variation)
    const placeholders = [
      '<!--NAVIGATION_MENU_PLACEHOLDER-->',
      '<!-- NAVIGATION_MENU_PLACEHOLDER -->',
      '<!--navigation_menu_placeholder-->',
      '<!--NAVIGATION_PLACEHOLDER-->'
    ];
    
    for (const placeholder of placeholders) {
      if (pageContent.includes(placeholder)) {
        pageContent = pageContent.replace(placeholder, navigationHtml);
        console.log(`✅ Injected via placeholder: ${placeholder}`);
        injected = true;
        break;
      }
    }
    
    // Strategy 2: Inject after </header>
    if (!injected && pageContent.includes('</header>')) {
      pageContent = pageContent.replace('</header>', '</header>\n' + navigationHtml);
      console.log('✅ Injected after </header>');
      injected = true;
    }
    
    // Strategy 3: Inject after opening <body>
    if (!injected && pageContent.includes('<body>')) {
      pageContent = pageContent.replace('<body>', '<body>\n' + navigationHtml);
      console.log('✅ Injected after <body>');
      injected = true;
    }
    
    // Strategy 4: Inject at start of container
    if (!injected && pageContent.includes('<div class="container">')) {
      pageContent = pageContent.replace('<div class="container">', navigationHtml + '\n<div class="container">');
      console.log('✅ Injected before container');
      injected = true;
    }
    
    if (!injected) {
      console.log('❌ No injection point found, adding navigation at end of body');
      // Fallback: inject before closing body tag
      if (pageContent.includes('</body>')) {
        pageContent = pageContent.replace('</body>', navigationHtml + '\n</body>');
        console.log('✅ Injected before </body> as fallback');
      }
    }
    
    console.log(`Final content length: ${pageContent.length}`);
    
    return HtmlService.createHtmlOutput(pageContent)
      .setTitle(`${page.charAt(0).toUpperCase() + page.slice(1)} - Motorcycle Escort Management`)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    console.error(`❌ doGet error: ${error.message}`);
    logError('doGet error', error);
    
    return HtmlService.createHtmlOutput(`
      <html><body style="font-family: Arial; padding: 20px;">
        <h1>⚠️ Error Loading Page</h1>
        <p>Error: ${error.message}</p>
        <p><a href="?" style="color: #3498db;">Return to Dashboard</a></p>
        <p><strong>Debug Info:</strong> Requested page: ${e.parameter.page || 'dashboard'}</p>
      </body></html>
    `);
  }
}

/**
 * Remove this function - it's replaced by the consolidated doGet above
 * DELETE THE getNavigationHtml FUNCTION since it's now integrated
 */

/**
 * Handles HTTP POST requests, serving as an API endpoint for the web app.
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
function sendTodaySMS() { sendBulkByDateRange('SMS', 'today'); }
function sendTodayEmail() { sendBulkByDateRange('Email', 'today'); }
function sendTodayBoth() { sendBulkByDateRange('Both', 'today'); }

// This week's assignments
function sendWeekSMS() { sendBulkByDateRange('SMS', 'week'); }
function sendWeekEmail() { sendBulkByDateRange('Email', 'week'); }
function sendWeekBoth() { sendBulkByDateRange('Both', 'week'); }

// Pending assignments (not yet notified)
function sendPendingSMS() { sendBulkByStatus('SMS', 'pending'); }
function sendPendingEmail() { sendBulkByStatus('Email', 'pending'); }
function sendPendingBoth() { sendBulkByStatus('Both', 'pending'); }

// All assigned requests
function sendAllAssignedSMS() { sendBulkByStatus('SMS', 'assigned'); }
function sendAllAssignedEmail() { sendBulkByStatus('Email', 'assigned'); }
function sendAllAssignedBoth() { sendBulkByStatus('Both', 'assigned'); }

/**
 * Core logic for sending bulk notifications by date range.
 * @param {string} notificationType - The type of notification ('SMS', 'Email', 'Both').
 * @param {string} dateRange - The predefined date range ('today', 'week').
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
 * @param {Array<Array<any>>} assignments - An array of assignment data rows.
 * @param {string} notificationType - The type of notification ('SMS', 'Email', 'Both').
 * @param {string} description - A descriptive string for logging (e.g., "today's assignments").
 * @returns {object} A result object with success/failure counts and messages.
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
 * Generates a comprehensive notification report.
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
 * @param {Object} filters An object containing filter criteria (startDate, endDate, requestType, status).
 * @returns {Object} Structured report data for display.
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
// REMOVE FROM HERE! To the very end
// Add this debug function to your Code.js file temporarily

/**
 * Debug function to test navigation injection
 */
function debugNavigationInjection() {
  try {
    console.log('=== NAVIGATION DEBUG START ===');
    
    // Test 1: Can we read the navigation file?
    let navHtml;
    try {
      navHtml = HtmlService.createHtmlOutputFromFile('_navigation').getContent();
      console.log('✅ Navigation file read successfully');
      console.log('Navigation content length:', navHtml.length);
      console.log('Navigation content preview:', navHtml.substring(0, 100) + '...');
    } catch (e) {
      console.log('❌ Cannot read _navigation.html:', e.message);
      return;
    }
    
    // Test 2: Can we read a main HTML file?
    let indexHtml;
    try {
      indexHtml = HtmlService.createHtmlOutputFromFile('index').getContent();
      console.log('✅ Index file read successfully');
      console.log('Index content length:', indexHtml.length);
    } catch (e) {
      console.log('❌ Cannot read index.html:', e.message);
      return;
    }
    
    // Test 3: Does the placeholder exist in the HTML?
    const hasPlaceholder = indexHtml.includes('<!--NAVIGATION_MENU_PLACEHOLDER-->');
    console.log('Has placeholder:', hasPlaceholder);
    
    if (hasPlaceholder) {
      console.log('✅ Placeholder found in index.html');
      
      // Test 4: Can we perform the replacement?
      const newContent = indexHtml.replace('<!--NAVIGATION_MENU_PLACEHOLDER-->', navHtml);
      const replacementWorked = newContent !== indexHtml;
      console.log('Replacement worked:', replacementWorked);
      
      if (replacementWorked) {
        console.log('✅ Replacement successful');
        console.log('New content length:', newContent.length);
      } else {
        console.log('❌ Replacement failed');
      }
    } else {
      console.log('❌ Placeholder NOT found in index.html');
      console.log('Searching for similar patterns...');
      
      // Look for variations
      const variations = [
        '<!--NAVIGATION_MENU_PLACEHOLDER-->',
        '<!-- NAVIGATION_MENU_PLACEHOLDER -->',
        '<!--navigation_menu_placeholder-->',
        '<!--NAVIGATION_PLACEHOLDER-->',
        'NAVIGATION_MENU_PLACEHOLDER'
      ];
      
      variations.forEach(variation => {
        if (indexHtml.includes(variation)) {
          console.log(`Found variation: ${variation}`);
        }
      });
      
      // Show some content around where navigation might be
      const headerIndex = indexHtml.indexOf('</header>');
      if (headerIndex !== -1) {
        const surrounding = indexHtml.substring(headerIndex - 50, headerIndex + 200);
        console.log('Content around </header>:', surrounding);
      }
    }
    
    console.log('=== NAVIGATION DEBUG END ===');
    
    return {
      navFileExists: !!navHtml,
      indexFileExists: !!indexHtml,
      hasPlaceholder: hasPlaceholder,
      navContentLength: navHtml ? navHtml.length : 0
    };
    
  } catch (error) {
    console.log('❌ Debug function error:', error.message);
    return { error: error.message };
  }
}

/**
 * Test the doGet function specifically
 */
function testDoGetFunction() {
  try {
    console.log('=== TESTING doGet FUNCTION ===');
    
    // Simulate a request event
    const mockEvent = {
      parameter: {
        page: 'dashboard'
      }
    };
    
    // Call doGet
    const result = doGet(mockEvent);
    console.log('doGet result type:', typeof result);
    console.log('doGet result:', result);
    
    if (result && result.getContent) {
      const content = result.getContent();
      console.log('Generated content length:', content.length);
      
      const hasNavigation = content.includes('class="navigation"') || content.includes('<nav');
      console.log('Content includes navigation:', hasNavigation);
      
      if (hasNavigation) {
        console.log('✅ Navigation found in generated content');
      } else {
        console.log('❌ Navigation NOT found in generated content');
        
        // Look for the placeholder in the output
        const stillHasPlaceholder = content.includes('<!--NAVIGATION_MENU_PLACEHOLDER-->');
        console.log('Still has placeholder:', stillHasPlaceholder);
      }
    }
    
    console.log('=== doGet TEST END ===');
    
  } catch (error) {
    console.log('❌ doGet test error:', error.message);
  }
}
/**
 * Enhanced debug function to find the exact issue
 */
function debugPlaceholderIssue() {
  try {
    console.log('=== ENHANCED PLACEHOLDER DEBUG ===');
    
    // Test reading index.html
    const indexContent = HtmlService.createHtmlOutputFromFile('index').getContent();
    console.log(`Index.html length: ${indexContent.length}`);
    
    // Look for exact placeholder
    const exactPlaceholder = '<!--NAVIGATION_MENU_PLACEHOLDER-->';
    const hasExactPlaceholder = indexContent.includes(exactPlaceholder);
    console.log(`Has exact placeholder: ${hasExactPlaceholder}`);
    
    if (hasExactPlaceholder) {
      const placeholderIndex = indexContent.indexOf(exactPlaceholder);
      console.log(`Placeholder found at position: ${placeholderIndex}`);
      
      // Show content around the placeholder
      const start = Math.max(0, placeholderIndex - 100);
      const end = Math.min(indexContent.length, placeholderIndex + exactPlaceholder.length + 100);
      const surrounding = indexContent.substring(start, end);
      console.log(`Content around placeholder: "${surrounding}"`);
    } else {
      // Search for any comment that might be the placeholder
      const commentRegex = /<!--[^>]*-->/g;
      const comments = indexContent.match(commentRegex);
      console.log('All HTML comments found:');
      if (comments) {
        comments.forEach((comment, index) => {
          console.log(`  ${index + 1}: ${comment}`);
        });
      } else {
        console.log('  No HTML comments found');
      }
      
      // Look for the word "NAVIGATION"
      if (indexContent.toLowerCase().includes('navigation')) {
        const navIndex = indexContent.toLowerCase().indexOf('navigation');
        const navSurrounding = indexContent.substring(navIndex - 50, navIndex + 100);
        console.log(`Found "navigation" at: "${navSurrounding}"`);
      }
    }
    
    // Test navigation file
    try {
      const navContent = HtmlService.createHtmlOutputFromFile('_navigation').getContent();
      console.log(`Navigation file length: ${navContent.length}`);
      console.log(`Navigation preview: ${navContent.substring(0, 200)}...`);
    } catch (navError) {
      console.log(`Navigation file error: ${navError.message}`);
    }
    
    console.log('=== DEBUG COMPLETE ===');
    
  } catch (error) {
    console.log(`Debug error: ${error.message}`);
  }
}

/**
 * Test the replacement process step by step
 */
function testReplacementProcess() {
  try {
    console.log('=== TESTING REPLACEMENT PROCESS ===');
    
    // Get files
    const indexContent = HtmlService.createHtmlOutputFromFile('index').getContent();
    const navContent = HtmlService.createHtmlOutputFromFile('_navigation').getContent();
    
    console.log(`Index length: ${indexContent.length}`);
    console.log(`Nav length: ${navContent.length}`);
    
    // Test replacement
    const placeholder = '<!--NAVIGATION_MENU_PLACEHOLDER-->';
    const beforeReplace = indexContent.length;
    const afterContent = indexContent.replace(placeholder, navContent);
    const afterReplace = afterContent.length;
    
    console.log(`Before replacement: ${beforeReplace} characters`);
    console.log(`After replacement: ${afterReplace} characters`);
    console.log(`Difference: ${afterReplace - beforeReplace} characters`);
    console.log(`Expected difference: ${navContent.length - placeholder.length} characters`);
    
    const replacementWorked = afterReplace !== beforeReplace;
    console.log(`Replacement worked: ${replacementWorked}`);
    
    if (replacementWorked) {
      console.log('✅ Replacement process works correctly');
    } else {
      console.log('❌ Replacement process failed');
    }
    
  } catch (error) {
    console.log(`Test error: ${error.message}`);
  }
}
/**
 * Comprehensive debug to find why replacement fails
 */
function comprehensiveReplacementDebug() {
  try {
    console.log('=== COMPREHENSIVE REPLACEMENT DEBUG ===');
    
    // Get the files
    const indexContent = HtmlService.createHtmlOutputFromFile('index').getContent();
    const navContent = HtmlService.createHtmlOutputFromFile('_navigation').getContent();
    
    console.log(`Index file length: ${indexContent.length}`);
    console.log(`Nav file length: ${navContent.length}`);
    
    // Define the exact placeholder
    const placeholder = '<!--NAVIGATION_MENU_PLACEHOLDER-->';
    console.log(`Searching for: "${placeholder}"`);
    console.log(`Placeholder length: ${placeholder.length}`);
    
    // Check if placeholder exists
    const placeholderExists = indexContent.includes(placeholder);
    console.log(`Placeholder exists: ${placeholderExists}`);
    
    if (placeholderExists) {
      // Find all occurrences
      const positions = [];
      let pos = indexContent.indexOf(placeholder, 0);
      while (pos !== -1) {
        positions.push(pos);
        pos = indexContent.indexOf(placeholder, pos + 1);
      }
      
      console.log(`Found ${positions.length} occurrence(s) at positions: ${positions.join(', ')}`);
      
      // Show content around each occurrence
      positions.forEach((position, index) => {
        const start = Math.max(0, position - 100);
        const end = Math.min(indexContent.length, position + placeholder.length + 100);
        const surrounding = indexContent.substring(start, end);
        console.log(`\nOccurrence ${index + 1} at position ${position}:`);
        console.log(`"${surrounding}"`);
      });
      
      // Test replacement step by step
      console.log('\n--- TESTING REPLACEMENT ---');
      
      // Method 1: Simple replace
      console.log('Method 1: Simple replace');
      const result1 = indexContent.replace(placeholder, navContent);
      const worked1 = result1.length !== indexContent.length;
      console.log(`Simple replace worked: ${worked1}`);
      console.log(`Length change: ${result1.length - indexContent.length}`);
      
      // Method 2: Replace first occurrence only
      console.log('Method 2: Replace first occurrence');
      const firstPos = indexContent.indexOf(placeholder);
      if (firstPos !== -1) {
        const before = indexContent.substring(0, firstPos);
        const after = indexContent.substring(firstPos + placeholder.length);
        const result2 = before + navContent + after;
        const worked2 = result2.length !== indexContent.length;
        console.log(`Manual replace worked: ${worked2}`);
        console.log(`Length change: ${result2.length - indexContent.length}`);
      }
      
      // Method 3: Global replace
      console.log('Method 3: Global replace');
      const result3 = indexContent.replaceAll(placeholder, navContent);
      const worked3 = result3.length !== indexContent.length;
      console.log(`Global replace worked: ${worked3}`);
      console.log(`Length change: ${result3.length - indexContent.length}`);
      
      // Method 4: Split and join
      console.log('Method 4: Split and join');
      const parts = indexContent.split(placeholder);
      console.log(`Split into ${parts.length} parts`);
      if (parts.length > 1) {
        const result4 = parts.join(navContent);
        const worked4 = result4.length !== indexContent.length;
        console.log(`Split/join worked: ${worked4}`);
        console.log(`Length change: ${result4.length - indexContent.length}`);
      }
      
    } else {
      console.log('❌ Placeholder not found - checking byte-level');
      
      // Check for the placeholder with potential encoding issues
      const placeholderBytes = [];
      for (let i = 0; i < placeholder.length; i++) {
        placeholderBytes.push(placeholder.charCodeAt(i));
      }
      console.log(`Placeholder bytes: ${placeholderBytes.join(',')}`);
      
      // Look for similar patterns
      const searchStart = '<!--NAVIGATION';
      const searchStartPos = indexContent.indexOf(searchStart);
      if (searchStartPos !== -1) {
        const sampleEnd = Math.min(indexContent.length, searchStartPos + 50);
        const sample = indexContent.substring(searchStartPos, sampleEnd);
        console.log(`Found similar pattern: "${sample}"`);
        
        // Get bytes of this section
        const sampleBytes = [];
        for (let i = 0; i < Math.min(sample.length, placeholder.length); i++) {
          sampleBytes.push(sample.charCodeAt(i));
        }
        console.log(`Sample bytes: ${sampleBytes.join(',')}`);
      }
    }
    
    // Test the navigation content
    console.log('\n--- TESTING NAVIGATION CONTENT ---');
    console.log(`Navigation content preview: "${navContent.substring(0, 100)}..."`);
    console.log(`Navigation starts with: "${navContent.substring(0, 20)}"`);
    console.log(`Navigation ends with: "${navContent.substring(navContent.length - 20)}"`);
    
    // Check if navigation content has any special characters
    const navHasSpecialChars = /[^\x20-\x7E\s]/.test(navContent);
    console.log(`Navigation has special characters: ${navHasSpecialChars}`);
    
  } catch (error) {
    console.log(`❌ Debug error: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
  }
}

/**
 * Test with a simple replacement
 */
function testSimpleReplacement() {
  try {
    console.log('=== TESTING SIMPLE REPLACEMENT ===');
    
    const indexContent = HtmlService.createHtmlOutputFromFile('index').getContent();
    
    // Test with a simple string replacement
    const testPlaceholder = '<!--NAVIGATION_MENU_PLACEHOLDER-->';
    const testReplacement = 'NAVIGATION_WAS_HERE';
    
    const beforeLength = indexContent.length;
    const result = indexContent.replace(testPlaceholder, testReplacement);
    const afterLength = result.length;
    
    console.log(`Before: ${beforeLength} characters`);
    console.log(`After: ${afterLength} characters`);
    console.log(`Difference: ${afterLength - beforeLength}`);
    console.log(`Expected: ${testReplacement.length - testPlaceholder.length}`);
    
    const worked = afterLength !== beforeLength;
    console.log(`Simple replacement worked: ${worked}`);
    
    if (worked) {
      // Find where the replacement occurred
      const replacePos = result.indexOf(testReplacement);
      if (replacePos !== -1) {
        const start = Math.max(0, replacePos - 50);
        const end = Math.min(result.length, replacePos + testReplacement.length + 50);
        const surrounding = result.substring(start, end);
        console.log(`Replacement found at: "${surrounding}"`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Test error: ${error.message}`);
  }
}
/**
 * Definitive test to find exactly what's in the file
 */
function definitivePlaceholderTest() {
  try {
    console.log('=== DEFINITIVE PLACEHOLDER TEST ===');
    
    const indexContent = HtmlService.createHtmlOutputFromFile('index').getContent();
    
    // Search for any part of the word "NAVIGATION"
    const searchWord = 'NAVIGATION';
    const searchWordLower = searchWord.toLowerCase();
    
    console.log(`Searching for "${searchWord}" (case sensitive):`);
    let pos = indexContent.indexOf(searchWord);
    
    if (pos !== -1) {
      console.log(`✅ Found "${searchWord}" at position ${pos}`);
      
      // Show 200 characters around it
      const start = Math.max(0, pos - 100);
      const end = Math.min(indexContent.length, pos + searchWord.length + 100);
      const surrounding = indexContent.substring(start, end);
      
      console.log('Context around "NAVIGATION":');
      console.log('========================================');
      console.log(surrounding);
      console.log('========================================');
      
      // Get the exact characters around it for analysis
      const exactStart = Math.max(0, pos - 5);
      const exactEnd = Math.min(indexContent.length, pos + searchWord.length + 15);
      const exactMatch = indexContent.substring(exactStart, exactEnd);
      
      console.log(`Exact match: "${exactMatch}"`);
      
      // Get character codes
      const charCodes = [];
      for (let i = 0; i < exactMatch.length; i++) {
        charCodes.push(`${exactMatch[i]}(${exactMatch.charCodeAt(i)})`);
      }
      console.log(`Character codes: ${charCodes.join(' ')}`);
      
    } else {
      console.log(`❌ "${searchWord}" not found, trying lowercase...`);
      
      pos = indexContent.toLowerCase().indexOf(searchWordLower);
      if (pos !== -1) {
        console.log(`✅ Found "${searchWordLower}" at position ${pos}`);
        
        const start = Math.max(0, pos - 100);
        const end = Math.min(indexContent.length, pos + searchWordLower.length + 100);
        const surrounding = indexContent.substring(start, end);
        
        console.log('Context around lowercase "navigation":');
        console.log('========================================');
        console.log(surrounding);
        console.log('========================================');
      } else {
        console.log('❌ "navigation" not found in any case');
      }
    }
    
    // Test if ANY HTML comments exist
    console.log('\n--- SEARCHING FOR HTML COMMENTS ---');
    const commentPattern = /<!--[\s\S]*?-->/g;
    const comments = indexContent.match(commentPattern);
    
    if (comments) {
      console.log(`Found ${comments.length} HTML comments:`);
      comments.forEach((comment, index) => {
        console.log(`${index + 1}: "${comment}"`);
        
        // Check if this comment contains any part of our search
        if (comment.toUpperCase().includes('NAVIGATION')) {
          console.log(`  ⭐ This comment contains "NAVIGATION"!`);
        }
      });
    } else {
      console.log('❌ No HTML comments found at all');
    }
    
    // Search for just "<!--" to see if any comments exist
    const commentStart = indexContent.indexOf('<!--');
    if (commentStart !== -1) {
      console.log(`Found comment start at position: ${commentStart}`);
      const commentSample = indexContent.substring(commentStart, commentStart + 100);
      console.log(`Comment sample: "${commentSample}"`);
    } else {
      console.log('❌ No comment start markers found');
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

/**
 * Test if we can write to the HTML file
 */
function testWriteToHTML() {
  try {
    console.log('=== TESTING HTML FILE WRITE ===');
    
    // This test will show us if the file is actually being read correctly
    const originalContent = HtmlService.createHtmlOutputFromFile('index').getContent();
    console.log(`Original file length: ${originalContent.length}`);
    
    // Try to find a safe place to test replacement
    const bodyTag = '<body>';
    if (originalContent.includes(bodyTag)) {
      console.log('✅ Found <body> tag');
      
      const testReplacement = originalContent.replace(bodyTag, bodyTag + '<!-- TEST INJECTION -->');
      const lengthDiff = testReplacement.length - originalContent.length;
      
      console.log(`Test replacement length difference: ${lengthDiff}`);
      console.log(`Expected difference: ${('<!-- TEST INJECTION -->').length}`);
      
      if (lengthDiff > 0) {
        console.log('✅ String replacement works on this file');
      } else {
        console.log('❌ String replacement failed even on <body> tag');
      }
    } else {
      console.log('❌ <body> tag not found');
    }
    
  } catch (error) {
    console.log(`❌ Test error: ${error.message}`);
  }
}
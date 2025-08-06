
/**
 * @fileoverview
 * Menu and initialization functions extracted from Code.gs to simplify
 * maintenance.
 */

// ===== MAIN FUNCTIONS & MENU SETUP =====

/**
 * Trigger function that runs when the Google Sheet is opened.
 * Sets up the custom menu, displays the dashboard layout, and refreshes dashboard data.
 * @return {void}
 */
function onOpen() {
  try {
  
    createMenu();
    displayDashboardLayout();
    setupDashboardFilterDropdown(); // Sets up dropdown and initial value
    refreshDashboard(true); // Call refresh with forceUpdate=true to ensure fresh data and layout

  } catch (error) {

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
    .addItem('🔄 Sync All Assigned to Calendar', 'syncAllAssignedRequestsToCalendar')
    .addItem('📝 Post Assignments to Calendar', 'postAssignmentsToCalendar')
    .addSeparator()
    .addSubMenu(ui.createMenu('📧 Email Response Tracking')
      .addItem('🚀 Setup Email Response Tracking', 'setupEmailResponseTracking')
      .addItem('📊 Check Tracking Status', 'checkEmailResponseTrackingStatus')
      .addItem('🔧 Process Emails Manually', 'processEmailResponsesManually')
      .addItem('📝 Update Requests with Responses', 'updateRequestsWithResponseInfo')
      .addItem('🗑️ Remove Email Triggers', 'deleteEmailResponseTriggers')
    )
    .addSeparator()
    .addItem('Generate Missing Request IDs', 'generateAllMissingRequestIds')
    .addToUi();
}

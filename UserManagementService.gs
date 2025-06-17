// This file will contain functions related to user management.

/**
 * Handle user management page - FIXED VERSION
 */
function handleUserManagementPage(e) {
  try {
    console.log('🔐 Handling user management page...');

    const authResult = authenticateAndAuthorizeUser(); // Assumes this is in AuthService.gs

    if (!authResult.success) {
      console.log('❌ User management auth failed:', authResult.error);
      return createSignInPage(); // Assumes this is in WebAppService.gs or similar
    }

    if (authResult.user.role !== 'admin') {
      console.log('❌ User management access denied for role:', authResult.user.role);
      return createAccessDeniedPage('Only administrators can access user management', authResult.user); // Assumes this is in WebAppService.gs or similar
    }

    console.log('✅ User management access granted for admin:', authResult.user.name);

    if (checkFileExists('user-management')) { // Assumes this is a utility function
      console.log('✅ Loading user-management.html file');

      let htmlOutput = HtmlService.createHtmlOutputFromFile('user-management');
      let content = htmlOutput.getContent();

      const navigationHtml = getRoleBasedNavigationSafe('user-management', authResult.user, authResult.rider); // Assumes this is in NavigationService.gs
      content = injectUserInfoSafe(content, authResult.user, authResult.rider); // Assumes this is in NavigationService.gs or Utils.gs
      content = addNavigationToContentSafe(content, navigationHtml); // Assumes this is in NavigationService.gs
      content = addUserDataInjectionSafe(content, authResult.user, authResult.rider); // Assumes this is in NavigationService.gs or Utils.gs

      htmlOutput.setContent(content);

      return htmlOutput
        .setTitle('User Management - Escort Management')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

    } else {
      console.log('❌ user-management.html file not found, creating dynamic page');
      return createUserManagementDashboard();
    }

  } catch (error) {
    console.error('❌ User management page error:', error);
    logError('Error in handleUserManagementPage', error); // Assumes logError is available
    return createErrorPageWithSignIn(error); // Assumes this is in WebAppService.gs or similar
  }
}

/**
 * Handle auth setup page
 */
function handleAuthSetupPage(e) {
  try {
    console.log('🔐 Handling auth setup page...');

    const authResult = authenticateAndAuthorizeUser(); // Assumes this is in AuthService.gs

    if (!authResult.success || authResult.user.role !== 'admin') {
      return createAccessDeniedPage('Only administrators can access authentication setup',
        authResult.user || { name: 'Unknown', role: 'unknown' }); // Assumes this is in WebAppService.gs or similar
    }

    return createAuthMappingPage();

  } catch (error) {
    console.error('❌ Auth setup page error:', error);
    logError('Error in handleAuthSetupPage', error); // Assumes logError is available
    return createErrorPageWithSignIn(error); // Assumes this is in WebAppService.gs or similar
  }
}

/**
 * Simple user management page (if HTML file doesn't exist)
 */
function createSimpleUserManagementPage() {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Management - Motorcycle Escort Management</title>
    <style>
        body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; margin: 0; padding: 20px; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; background: rgba(255, 255, 255, 0.95); border-radius: 20px; padding: 30px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2); }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #eee; }
        .btn { background: #3498db; color: white; padding: 12px 25px; border: none; border-radius: 25px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; margin: 10px; transition: all 0.3s ease; }
        .btn:hover { background: #2980b9; transform: translateY(-2px); }
        .nav-link { background: #95a5a6; color: white; padding: 10px 20px; border: none; border-radius: 20px; text-decoration: none; display: inline-block; margin: 10px 5px; }
        .nav-link:hover { background: #7f8c8d; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #3498db; }
        .stat-number { font-size: 2rem; font-weight: bold; color: #3498db; }
        .stat-label { color: #666; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>👥 User Management Dashboard</h1>
            <p>Manage user access, permissions, and authentication settings</p>
            <!-- Navigation placeholder to be filled by a call to NavigationService -->
            <div id="navigation-placeholder"></div>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-number" id="totalUsers">-</div><div class="stat-label">Total Users</div></div>
            <div class="stat-card"><div class="stat-number" id="activeUsers">-</div><div class="stat-label">Active Users</div></div>
            <div class="stat-card"><div class="stat-number" id="pendingUsers">-</div><div class="stat-label">Pending Users</div></div>
            <div class="stat-card"><div class="stat-number" id="adminUsers">-</div><div class="stat-label">Admin Users</div></div>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <h3>🎯 User Management Actions</h3>
            <button class="btn" onclick="openAuthSetup()">🔐 Google Authentication Setup</button>
            <button class="btn" onclick="loadUserData()">📊 Load User Statistics</button>
        </div>
        <div id="status" style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 10px;"><h4>📋 System Status</h4><p>User Management page loaded. Click "Load User Statistics".</p></div>
        <div id="userList" style="margin: 20px 0;"><h4>👥 Users</h4><div id="users">Click "Load User Statistics" to view users...</div></div>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Dynamically load navigation
            if (typeof google !== 'undefined' && google.script && google.script.run && typeof getRoleBasedNavigationSafe === 'function') {
                 google.script.run.withSuccessHandler(function(navHtml) {
                     document.getElementById('navigation-placeholder').innerHTML = navHtml;
                 }).getRoleBasedNavigationSafe('user-management', window.currentUser, null); // Assuming currentUser is globally available
            }
            loadUserData();
        });
        function loadUserData() {
            updateStatus('Loading user data...', 'info');
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                google.script.run.withSuccessHandler(handleUserDataSuccess).withFailureHandler(handleUserDataError).getUserManagementData();
            } else { handleUserDataError('Google Apps Script not available'); }
        }
        function handleUserDataSuccess(data) {
            if (data && data.success) {
                document.getElementById('totalUsers').textContent = data.stats.totalUsers || 0;
                document.getElementById('activeUsers').textContent = data.stats.activeUsers || 0;
                document.getElementById('pendingUsers').textContent = data.stats.pendingUsers || 0;
                document.getElementById('adminUsers').textContent = (data.stats.totalUsers - data.stats.pendingUsers) || 0;
                displayUsers(data.users || []);
                updateStatus('User data loaded successfully!', 'success');
            } else { handleUserDataError(data.error || 'Unknown error'); }
        }
        function handleUserDataError(error) { console.error('User data error:', error); updateStatus('Error loading user data: ' + error, 'error'); }
        function displayUsers(users) {
            const usersDiv = document.getElementById('users');
            if (users.length === 0) { usersDiv.innerHTML = '<p>No users found.</p>'; return; }
            let html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">';
            users.forEach(user => {
                html += \`<div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db;"><strong>\${user.name}</strong><br><small>\${user.email}</small><br><span style="background: #e8f4f8; padding: 3px 8px; border-radius: 10px; font-size: 0.8rem;">\${user.role}</span> <span style="background: #d4edda; padding: 3px 8px; border-radius: 10px; font-size: 0.8rem;">\${user.status}</span></div>\`;
            });
            html += '</div>'; usersDiv.innerHTML = html;
        }
        function openAuthSetup() { if (typeof google !== 'undefined' && google.script && google.script.run) { google.script.run.withSuccessHandler(url => window.open(url, '_blank')).getWebAppUrl(); }}
        function updateStatus(message, type) {
            const statusDiv = document.getElementById('status');
            let bgColor = {'success': '#d4edda', 'error': '#f8d7da', 'warning': '#fff3cd', 'info': '#cce5ff'}[type] || '#f8f9fa';
            let textColor = {'success': '#155724', 'error': '#721c24', 'warning': '#856404', 'info': '#0056b3'}[type] || '#333';
            statusDiv.style.background = bgColor; statusDiv.style.color = textColor;
            statusDiv.innerHTML = '<h4>📋 Status</h4><p>' + message + '</p>';
        }
    </script>
</body></html>`;
  return HtmlService.createHtmlOutput(html).setTitle('User Management').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


/**
 * Fallback dashboard if user-management.html is missing
 */
function createUserManagementDashboard() {
  return createSimpleUserManagementPage();
}

/**
 * Get user management data - enhanced version
 */
function getUserManagementData() {
  try {
    console.log('📊 Getting user management data...');

    const riders = getRidersDataSafe() || [];
    const admins = getAdminUsersSafe() || [];
    const dispatchers = getDispatcherUsersSafe() || [];

    const allUsers = [];

    riders.forEach((rider, index) => {
      allUsers.push({
        id: rider.id || rider['Rider ID'] || `rider_${index}`, name: rider.name || rider['Full Name'] || 'Unknown Rider',
        email: rider.email || rider['Email'] || '', googleEmail: rider.googleEmail || rider['Google Email'] || '',
        role: 'Rider', status: rider.status || 'Unknown', avatar: (rider.name || 'R').charAt(0).toUpperCase(),
        lastLogin: rider.lastLogin || rider['Last Login'] || 'Never', type: 'rider'
      });
    });

    admins.forEach((email, index) => {
      if (email && email.trim()) {
        allUsers.push({
          id: 'admin_' + index, name: extractNameFromEmail(email), email: email, googleEmail: email, role: 'Admin',
          status: 'Active', avatar: email.charAt(0).toUpperCase(), lastLogin: 'Unknown', type: 'admin'
        });
      }
    });

    dispatchers.forEach((email, index) => {
      if (email && email.trim()) {
        allUsers.push({
          id: 'dispatcher_' + index, name: extractNameFromEmail(email), email: email, googleEmail: email, role: 'Dispatcher',
          status: 'Active', avatar: email.charAt(0).toUpperCase(), lastLogin: 'Unknown', type: 'dispatcher'
        });
      }
    });

    const stats = {
      totalUsers: allUsers.length, activeUsers: allUsers.filter(u => u.status === 'Active').length,
      pendingUsers: allUsers.filter(u => u.status === 'Pending').length,
      unmappedUsers: riders.filter(r => !r.googleEmail || r.googleEmail.trim() === '').length
    };

    return { success: true, stats: stats, users: allUsers };

  } catch (error) {
    console.error('❌ Error getting user management data:', error);
    logError('Error in getUserManagementData', error);
    return { success: false, error: error.message, stats: { totalUsers: 0, activeUsers: 0, pendingUsers: 0, unmappedUsers: 0 }, users: [] };
  }
}

/**
 * Extract name from email for display
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
 * Get recent system activity
 */
function getRecentSystemActivity() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const logSheetName = CONFIG.sheets.authLog || 'Auth Log'; // Use default if not in CONFIG
    const logSheet = spreadsheet.getSheetByName(logSheetName);

    if (logSheet && logSheet.getLastRow() > 1) {
      const data = logSheet.getDataRange().getValues();
      const activities = [];
      const startRow = Math.max(1, data.length - 5);
      for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (row[0] && row[0] instanceof Date) {
          activities.push({
            description: `${row[2] || 'User'} - ${row[4] || 'Action'}`,
            time: formatTimeAgo(row[0])
          });
        }
      }
      return activities.reverse();
    }
    return [ { description: 'System started successfully', time: '1 hour ago' } ];
  } catch (error) {
    console.error('❌ Error getting recent activity:', error);
    logError('Error in getRecentSystemActivity', error);
    return [ { description: 'System running normally', time: 'now' } ];
  }
}

/**
 * Format time ago helper
 */
function formatTimeAgo(timestamp) {
  try {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } catch (error) {
    return 'recently';
  }
}

/**
 * Placeholder for createAuthMappingPage if it's not defined elsewhere.
 */
function createAuthMappingPage() {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Mapping Setup</title>
      <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    </head>
    <body>
      <div class="container">
        <h1>Authentication Mapping</h1>
        <p>This page is used to map Google Accounts to user roles (Admin, Dispatcher, Rider).</p>
        <p><em>Implementation Note: This is a placeholder. Full implementation needed.</em></p>
        <div id="user-mapping-table"> <p>User list and role assignment UI here.</p> </div>
        <button class="btn btn-primary" onclick="saveMappings()">Save Mappings</button>
      </div>
      <script>
        function saveMappings() { alert("Save functionality to be implemented."); }
      </script>
    </body>
    </html>`;
  return HtmlService.createHtmlOutput(htmlContent)
    .setTitle("Auth Mapping Setup")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * HELPER FUNCTIONS - Add these to AccessControl.gs if they don't exist
 */

/**
 * Safe wrapper for getWebAppUrl
 */
function getWebAppUrlSafe() {
  try {
    if (typeof getWebAppUrl === 'function') {
      return getWebAppUrl();
    }
    return ScriptApp.getService().getUrl();
  } catch (error) {
    console.error('Error getting web app URL:', error);
    return '#';
  }
}

/**
 * Check if a file exists in the project
 */
function checkFileExists(fileName) {
  try {
    HtmlService.createHtmlOutputFromFile(fileName);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Safe wrapper for getting admin users
 */
function getAdminUsersSafe() {
  try {
    if (typeof getAdminUsers === 'function') {
      return getAdminUsers();
    }
    // Fallback - add your admin emails here
    return ['your-admin@gmail.com']; // ← REPLACE with your actual admin email
  } catch (error) {
    console.error('Error getting admin users:', error);
    return [];
  }
}

/**
 * Safe wrapper for getting dispatcher users
 */
function getDispatcherUsersSafe() {
  try {
    if (typeof getDispatcherUsers === 'function') {
      return getDispatcherUsers();
    }
    // Fallback - add your dispatcher emails here
    return ['your-dispatcher@gmail.com']; // ← REPLACE with actual dispatcher emails
  } catch (error) {
    console.error('Error getting dispatcher users:', error);
    return [];
  }
}

/**
 * Safe wrapper for getting rider by email
 */
function getRiderByGoogleEmailSafe(email) {
  try {
    if (typeof getRiderByGoogleEmail === 'function') {
      return getRiderByGoogleEmail(email);
    }
    
    // Fallback - check riders sheet directly
    const ridersData = getRidersData();
    if (ridersData && ridersData.data) {
      for (let row of ridersData.data) {
        const riderEmail = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.email);
        if (riderEmail && riderEmail.toLowerCase() === email.toLowerCase()) {
          return {
            name: getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.name),
            status: getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.status) || 'Active',
            id: getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.jpNumber)
          };
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting rider by email:', error);
    return null;
  }
}

/**
 * Create simple login page
 */
function createLoginPage() {
  const webAppUrl = getWebAppUrlSafe();
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Sign In - Motorcycle Escort Management</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            background: rgba(255, 255, 255, 0.95);
            color: #333;
            padding: 40px;
            border-radius: 15px;
            max-width: 400px;
            margin: 0 auto;
        }
        .btn {
            background: #3498db;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏍️ Motorcycle Escort Management</h1>
        <h2>Sign In Required</h2>
        <p>Please sign in with your Google account to continue.</p>
        <a href="${webAppUrl}" class="btn">Sign In with Google</a>
    </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('Sign In')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Create unauthorized page
 */
function createUnauthorizedPage(email, name) {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Access Denied</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            background: rgba(255, 255, 255, 0.95);
            color: #333;
            padding: 40px;
            border-radius: 15px;
            max-width: 500px;
            margin: 0 auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏍️ Motorcycle Escort Management</h1>
        <h2>🚫 Access Not Authorized</h2>
        <p><strong>Signed in as:</strong> ${email}</p>
        <p>Your account is not authorized to access this system.</p>
        <p>Please contact your administrator for access.</p>
    </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html);
}

/**
 * Create error page
 */
function createErrorPage(errorMessage) {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>System Error</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            background: rgba(255, 255, 255, 0.95);
            color: #333;
            padding: 40px;
            border-radius: 15px;
            max-width: 500px;
            margin: 0 auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏍️ Motorcycle Escort Management</h1>
        <h2>⚠️ System Error</h2>
        <p>An error occurred while loading the application:</p>
        <p><code>${errorMessage}</code></p>
        <p>Please try refreshing the page or contact support.</p>
    </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html);
}
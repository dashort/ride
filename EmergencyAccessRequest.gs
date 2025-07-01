/**
 * Emergency Access Request System
 * Use this if the normal authentication flow isn't working
 */

function doGetEmergency(e) {
  const params = e && e.parameter ? e.parameter : {};
  
  // If they're requesting access
  if (params.action === 'request') {
    return createEmergencyAccessRequestPage();
  }
  
  // Default emergency page
  return createEmergencyLandingPage();
}

function createEmergencyLandingPage() {
  try {
    const user = Session.getActiveUser();
    const userEmail = user.getEmail();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Emergency Access</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 1rem;
    }
    .container { 
      background: white; padding: 2rem; border-radius: 15px; 
      box-shadow: 0 10px 30px rgba(0,0,0,0.3); max-width: 500px; width: 100%;
    }
    .header { text-align: center; margin-bottom: 2rem; }
    .emergency { color: #dc3545; background: #f8d7da; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
    .info { color: #0c5460; background: #d1ecf1; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
    .btn { 
      background: #007bff; color: white; padding: 12px 24px; border: none; 
      border-radius: 8px; cursor: pointer; text-decoration: none; display: inline-block;
      margin: 0.5rem; font-size: 16px; transition: all 0.3s;
    }
    .btn:hover { background: #0056b3; transform: translateY(-2px); }
    .btn-success { background: #28a745; }
    .btn-success:hover { background: #1e7e34; }
    .steps { background: #f8f9fa; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
    .user-info { background: #e9ecef; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Emergency Access Portal</h1>
    </div>
    
    <div class="emergency">
      <h3>⚠️ Access Issue Detected</h3>
      <p>You're seeing this page because there may be an issue with the normal authentication flow.</p>
    </div>
    
    <div class="user-info">
      <h3>Your Information:</h3>
      <p><strong>Email:</strong> ${userEmail}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="info">
      <h3>🔧 Quick Fixes:</h3>
      <div class="steps">
        <p><strong>1. Try Normal Access:</strong></p>
        <a href="${ScriptApp.getService().getUrl()}" class="btn">Go to Main App</a>
        
        <p style="margin-top: 1rem;"><strong>2. Request Access:</strong></p>
        <a href="${ScriptApp.getService().getUrl()}?action=request" class="btn btn-success">Request Access</a>
        
        <p style="margin-top: 1rem;"><strong>3. Direct Credential Login:</strong></p>
        <a href="${ScriptApp.getService().getUrl()}?auth=credentials" class="btn">Login with Credentials</a>
      </div>
    </div>
    
    <div class="info">
      <h3>📋 Troubleshooting:</h3>
      <ul style="margin-left: 1.5rem;">
        <li>Make sure you're logged into the correct Google account</li>
        <li>Try logging out and back into Google</li>
        <li>Clear your browser cache and cookies</li>
        <li>Try using an incognito/private browsing window</li>
        <li>Contact your administrator if issues persist</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin-top: 2rem;">
      <small style="color: #6c757d;">Emergency Access Portal - ${new Date().toLocaleString()}</small>
    </div>
  </div>
</body>
</html>`;
    
    return HtmlService.createHtmlOutput(html)
      .setTitle('Emergency Access Portal')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    return createFallbackErrorPage(error);
  }
}

function createEmergencyAccessRequestPage() {
  try {
    const user = Session.getActiveUser();
    const userEmail = user.getEmail();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Request Access</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 1rem;
    }
    .container { 
      background: white; padding: 2rem; border-radius: 15px; 
      box-shadow: 0 10px 30px rgba(0,0,0,0.3); max-width: 600px; width: 100%;
    }
    .form-group { margin-bottom: 1.5rem; }
    label { display: block; margin-bottom: 0.5rem; font-weight: bold; color: #333; }
    input, select, textarea { 
      width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; 
      font-size: 16px; transition: border-color 0.3s;
    }
    input:focus, select:focus, textarea:focus { 
      outline: none; border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.25);
    }
    .btn { 
      background: #28a745; color: white; padding: 12px 24px; border: none; 
      border-radius: 8px; cursor: pointer; font-size: 16px; transition: all 0.3s;
      width: 100%;
    }
    .btn:hover { background: #1e7e34; transform: translateY(-2px); }
    .success { color: #155724; background: #d4edda; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
    .error { color: #721c24; background: #f8d7da; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
    .info { color: #0c5460; background: #d1ecf1; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
    .loading { display: none; text-align: center; margin: 1rem 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 Request Access</h1>
    
    <div class="info">
      <p><strong>Your Email:</strong> ${userEmail}</p>
      <p>Please fill out this form to request access to the application.</p>
    </div>
    
    <form id="accessRequestForm">
      <div class="form-group">
        <label for="fullName">Full Name *</label>
        <input type="text" id="fullName" name="fullName" required>
      </div>
      
      <div class="form-group">
        <label for="role">Requested Role *</label>
        <select id="role" name="role" required>
          <option value="">Select a role...</option>
          <option value="Dispatcher">Dispatcher</option>
          <option value="Rider">Rider</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="reason">Reason for Access *</label>
        <textarea id="reason" name="reason" rows="3" placeholder="Please explain why you need access to this application..." required></textarea>
      </div>
      
      <div class="form-group">
        <label for="department">Department/Organization</label>
        <input type="text" id="department" name="department" placeholder="Optional">
      </div>
      
      <div class="loading" id="loading">
        <p>⏳ Submitting your request...</p>
      </div>
      
      <button type="submit" class="btn" id="submitBtn">Submit Access Request</button>
    </form>
    
    <div id="result"></div>
    
    <div style="text-align: center; margin-top: 2rem;">
      <a href="${ScriptApp.getService().getUrl()}" style="color: #007bff;">← Back to Main Page</a>
    </div>
  </div>

  <script>
    document.getElementById('accessRequestForm').addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = new FormData(this);
      const data = Object.fromEntries(formData.entries());
      
      // Show loading
      document.getElementById('loading').style.display = 'block';
      document.getElementById('submitBtn').disabled = true;
      
      // Submit request
      google.script.run
        .withSuccessHandler(onSuccess)
        .withFailureHandler(onError)
        .submitEmergencyAccessRequest(data);
    });
    
    function onSuccess(result) {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('result').innerHTML = 
        '<div class="success"><h3>✅ Request Submitted!</h3><p>' + result.message + '</p></div>';
      document.getElementById('accessRequestForm').style.display = 'none';
    }
    
    function onError(error) {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('submitBtn').disabled = false;
      document.getElementById('result').innerHTML = 
        '<div class="error"><h3>❌ Error</h3><p>' + error.message + '</p></div>';
    }
  </script>
</body>
</html>`;
    
    return HtmlService.createHtmlOutput(html)
      .setTitle('Request Access')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    return createFallbackErrorPage(error);
  }
}

function submitEmergencyAccessRequest(data) {
  try {
    const user = Session.getActiveUser();
    const userEmail = user.getEmail();
    
    // Basic validation
    if (!data.fullName || !data.role || !data.reason) {
      throw new Error('Please fill in all required fields.');
    }
    
    // Create request record
    const requestData = {
      timestamp: new Date(),
      email: userEmail,
      name: data.fullName,
      requestedRole: data.role,
      reason: data.reason,
      department: data.department || 'Not specified',
      status: 'Pending',
      submissionMethod: 'Emergency Portal'
    };
    
    // Try to save to spreadsheet
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      let sheet = ss.getSheetByName('Access_Requests');
      
      if (!sheet) {
        sheet = ss.insertSheet('Access_Requests');
        sheet.getRange(1, 1, 1, 8).setValues([[
          'Timestamp', 'Email', 'Name', 'Requested Role', 'Reason', 'Department', 'Status', 'Method'
        ]]);
      }
      
      sheet.appendRow([
        requestData.timestamp,
        requestData.email,
        requestData.name,
        requestData.requestedRole,
        requestData.reason,
        requestData.department,
        requestData.status,
        requestData.submissionMethod
      ]);
      
    } catch (sheetError) {
      console.error('Could not save to spreadsheet:', sheetError);
      // Continue anyway - we'll email the admin
    }
    
    // Send notification email
    try {
      const adminEmail = 'your-admin@email.com'; // Replace with actual admin email
      const subject = `🔐 Emergency Access Request from ${requestData.name}`;
      const body = `
New access request received via Emergency Portal:

Name: ${requestData.name}
Email: ${requestData.email}
Requested Role: ${requestData.requestedRole}
Department: ${requestData.department}
Reason: ${requestData.reason}

Submitted: ${requestData.timestamp.toLocaleString()}

Please review and approve this request by adding the user to the appropriate authorization lists in your spreadsheet.
      `;
      
      MailApp.sendEmail(adminEmail, subject, body);
    } catch (emailError) {
      console.error('Could not send email:', emailError);
    }
    
    return {
      success: true,
      message: 'Your access request has been submitted successfully! An administrator will review your request and you will be notified via email once approved.'
    };
    
  } catch (error) {
    console.error('Emergency access request error:', error);
    return {
      success: false,
      message: error.message || 'An error occurred while submitting your request. Please try again or contact your administrator.'
    };
  }
}

function createFallbackErrorPage(error) {
  const html = `
<!DOCTYPE html>
<html>
<head><title>System Error</title>
<style>
  body { font-family: Arial, sans-serif; padding: 2rem; background: #f8f9fa; }
  .container { max-width: 600px; margin: 0 auto; background: white; padding: 2rem; border-radius: 10px; }
  .error { color: #721c24; background: #f8d7da; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
</style>
</head>
<body>
  <div class="container">
    <h1>⚠️ System Error</h1>
    <div class="error">
      <p><strong>Error:</strong> ${error.message}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    </div>
    <p>Please contact your system administrator with this error information.</p>
  </div>
</body>
</html>`;
  
  return HtmlService.createHtmlOutput(html).setTitle('System Error');
}
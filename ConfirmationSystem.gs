/**
 * CONFIRMATION SYSTEM HELPER FUNCTIONS
 * Add these functions to your Code.gs file or create a new ConfirmationSystem.gs file
 */

/**
 * Process request confirmation (pre-assignment)
 */
function processRequestConfirmation(requestId, riderName, response) {
  try {
    debugLog('📋 Processing request confirmation:', { requestId, riderName, response });
    
    // Find the request
    const request = getRequestDetails(requestId);
    if (!request) {
      return { success: false, message: 'Request not found' };
    }
    
    // Log the response to a tracking sheet
    const responseSheet = getOrCreateResponseSheet();
    const now = new Date();
    
    responseSheet.appendRow([
      now,
      'REQUEST',
      requestId,
      '',  // No assignment ID yet
      riderName,
      response.toUpperCase(),
      'Email Confirmation',
      request.eventDate,
      request.startTime
    ]);
    
    debugLog('✅ Request confirmation logged successfully');
    
    return {
      success: true,
      message: `Thank you ${riderName}! Your ${response} has been recorded for request ${requestId}.`
    };
    
  } catch (error) {
    console.error('❌ Request confirmation error:', error);
    logError('Request confirmation error', error);
    return { success: false, message: 'Error processing request confirmation' };
  }
}

/**
 * Process assignment confirmation (post-assignment)
 */
function processAssignmentConfirmation(assignmentId, riderName, response) {
  try {
    debugLog('📝 Processing assignment confirmation:', { assignmentId, riderName, response });
    
    // Find the assignment
    const assignment = getAssignmentDetails(assignmentId);
    if (!assignment) {
      return { success: false, message: 'Assignment not found' };
    }
    
    // Update the assignment status
    const assignmentsData = getAssignmentsData();
    const assignmentRow = assignmentsData.data.find(row => 
      getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.assignmentId) === assignmentId
    );
    
    if (assignmentRow) {
      const rowIndex = assignmentsData.data.indexOf(assignmentRow) + 2; // +2 for header row and 0-based index
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Assignments');
      
      // Update status and confirmation date
      const statusCol = assignmentsData.columnMap[CONFIG.columns.assignments.status] + 1;
      
      const newStatus = response.toLowerCase() === 'confirm' || response.toLowerCase() === 'accept' 
        ? 'Confirmed' : 'Declined';
      
      sheet.getRange(rowIndex, statusCol).setValue(newStatus);
      
      // Try to add confirmation date if column exists
      try {
        const confirmationCol = assignmentsData.columnMap['confirmationDate'];
        if (confirmationCol !== undefined) {
          sheet.getRange(rowIndex, confirmationCol + 1).setValue(new Date());
        }
      } catch (colError) {
        debugLog('⚠️ Confirmation date column not found, skipping date update');
      }
    }
    
    // Log the response
    const responseSheet = getOrCreateResponseSheet();
    const now = new Date();
    
    responseSheet.appendRow([
      now,
      'ASSIGNMENT',
      assignment.requestId,
      assignmentId,
      riderName,
      response.toUpperCase(),
      'Email Confirmation',
      assignment.eventDate,
      assignment.startTime
    ]);
    
    debugLog('✅ Assignment confirmation processed successfully');
    
    return {
      success: true,
      message: `Thank you ${riderName}! Your ${response} has been recorded for assignment ${assignmentId}.`
    };
    
  } catch (error) {
    console.error('❌ Assignment confirmation error:', error);
    logError('Assignment confirmation error', error);
    return { success: false, message: 'Error processing assignment confirmation' };
  }
}

/**
 * Create or get the response tracking sheet
 */
function getOrCreateResponseSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName('Rider Responses');
  
  if (!sheet) {
    debugLog('📊 Creating new Rider Responses sheet');
    sheet = spreadsheet.insertSheet('Rider Responses');
    
    // Add headers
    const headers = [
      'Timestamp',
      'Type',
      'Request ID',
      'Assignment ID',
      'Rider Name',
      'Response',
      'Method',
      'Event Date',
      'Event Time'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    // Set column widths
    sheet.setColumnWidth(1, 150); // Timestamp
    sheet.setColumnWidth(2, 100); // Type
    sheet.setColumnWidth(3, 120); // Request ID
    sheet.setColumnWidth(4, 120); // Assignment ID
    sheet.setColumnWidth(5, 150); // Rider Name
    sheet.setColumnWidth(6, 100); // Response
    sheet.setColumnWidth(7, 120); // Method
    sheet.setColumnWidth(8, 120); // Event Date
    sheet.setColumnWidth(9, 120); // Event Time
  }
  
  return sheet;
}

/**
 * Create confirmation response HTML page
 */
function createConfirmationResponse(status, message, details = {}) {
  const isSuccess = status === 'success';
  const icon = isSuccess ? '✅' : '❌';
  const color = isSuccess ? '#4CAF50' : '#f44336';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmation Response</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 40px;
          max-width: 500px;
          width: 90%;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          animation: slideIn 0.5s ease-out;
        }
        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }
        .title {
          color: ${color};
          font-size: 1.8rem;
          font-weight: bold;
          margin-bottom: 15px;
        }
        .message {
          font-size: 1.1rem;
          color: #555;
          line-height: 1.5;
          margin-bottom: 30px;
        }
        .details {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: left;
        }
        .details h4 {
          margin: 0 0 10px 0;
          color: #333;
        }
        .details p {
          margin: 5px 0;
          color: #666;
        }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          background: #2196F3;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          transition: background-color 0.3s;
        }
        .btn:hover {
          background: #1976D2;
        }
        @media (max-width: 480px) {
          .container {
            padding: 30px 20px;
          }
          .icon {
            font-size: 3rem;
          }
          .title {
            font-size: 1.5rem;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">${icon}</div>
        <div class="title">${isSuccess ? 'Confirmation Received' : 'Error'}</div>
        <div class="message">${message}</div>
        
        ${details.rider ? `
          <div class="details">
            <h4>Confirmation Details:</h4>
            <p><strong>Rider:</strong> ${details.rider}</p>
            <p><strong>Response:</strong> ${details.response.toUpperCase()}</p>
            <p><strong>ID:</strong> ${details.id}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
        ` : ''}
        
        <p style="font-size: 0.9rem; color: #888; margin-top: 30px;">
          ${isSuccess ? 
            'Your response has been recorded and the dispatcher has been notified.' : 
            'Please contact your dispatcher if you continue to have issues.'
          }
        </p>
      </div>
    </body>
    </html>
  `;
  
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Generate secure one-click confirmation URLs
 */
function generateSecureConfirmationLinks(assignmentId, riderName, requestId) {
  try {
    // Create a unique token for this confirmation
    const timestamp = Date.now();
    const token = Utilities.base64Encode(
      Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        `${assignmentId}-${riderName}-${requestId}-${timestamp}`
      )
    ).substring(0, 16); // Use first 16 chars as token
    
    // Store the token temporarily for validation
    storeConfirmationToken(token, {
      assignmentId,
      riderName,
      requestId,
      expires: timestamp + (7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    const baseUrl = getWebAppUrl();
    
    return {
      confirmUrl: `${baseUrl}?action=quickConfirm&token=${token}&response=confirm`,
      declineUrl: `${baseUrl}?action=quickConfirm&token=${token}&response=decline`
    };
    
  } catch (error) {
    console.error('Error generating confirmation links:', error);
    // Fallback to basic links
    const baseUrl = getWebAppUrl();
    return {
      confirmUrl: `${baseUrl}?action=respondAssignment&assignmentId=${assignmentId}&rider=${encodeURIComponent(riderName)}&response=confirm`,
      declineUrl: `${baseUrl}?action=respondAssignment&assignmentId=${assignmentId}&rider=${encodeURIComponent(riderName)}&response=decline`
    };
  }
}

/**
 * Store confirmation token for validation
 */
function storeConfirmationToken(token, data) {
  try {
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty(`confirm_${token}`, JSON.stringify(data));
    debugLog('🔑 Confirmation token stored:', token);
  } catch (error) {
    console.error('Error storing confirmation token:', error);
  }
}

/**
 * Validate and retrieve confirmation token data
 */
function validateConfirmationToken(token) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const tokenData = properties.getProperty(`confirm_${token}`);
    
    if (!tokenData) {
      return { valid: false, error: 'Invalid or expired confirmation link' };
    }
    
    const data = JSON.parse(tokenData);
    
    // Check if token is expired
    if (Date.now() > data.expires) {
      // Clean up expired token
      properties.deleteProperty(`confirm_${token}`);
      return { valid: false, error: 'Confirmation link has expired' };
    }
    
    debugLog('✅ Token validation successful:', { token, riderName: data.riderName });
    return { valid: true, data: data };
    
  } catch (error) {
    console.error('Error validating token:', error);
    return { valid: false, error: 'Error validating confirmation link' };
  }
}

/**
 * Create enhanced confirmation response page for one-click confirmations
 */
function createOneClickConfirmationResponse(status, message, details = {}) {
  const isSuccess = status === 'success';
  const icon = isSuccess ? '✅' : '❌';
  const color = isSuccess ? '#4CAF50' : '#f44336';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmation Complete</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 40px;
          max-width: 500px;
          width: 90%;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          animation: slideIn 0.5s ease-out;
        }
        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .icon {
          font-size: 4rem;
          margin-bottom: 20px;
          animation: bounce 0.6s ease-out;
        }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          60% { transform: translateY(-5px); }
        }
        .title {
          color: ${color};
          font-size: 1.8rem;
          font-weight: bold;
          margin-bottom: 15px;
        }
        .message {
          font-size: 1.1rem;
          color: #555;
          line-height: 1.5;
          margin-bottom: 30px;
        }
        .success-details {
          background: #e8f5e8;
          border: 2px solid #4CAF50;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .error-details {
          background: #ffeaea;
          border: 2px solid #f44336;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .detail-item {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          border-bottom: 1px solid rgba(0,0,0,0.1);
        }
        .detail-item:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: #333;
        }
        .detail-value {
          color: #666;
        }
        .timestamp {
          font-size: 0.9rem;
          color: #888;
          margin-top: 20px;
          font-style: italic;
        }
        .contact-info {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          font-size: 0.95rem;
          color: #666;
        }
        @media (max-width: 480px) {
          .container {
            padding: 30px 20px;
          }
          .icon {
            font-size: 3rem;
          }
          .title {
            font-size: 1.5rem;
          }
          .detail-item {
            flex-direction: column;
            text-align: left;
          }
          .detail-value {
            margin-top: 5px;
            font-weight: 500;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">${icon}</div>
        <div class="title">${isSuccess ? 'Response Recorded!' : 'Error Occurred'}</div>
        <div class="message">${message}</div>
        
        ${details.rider && isSuccess ? `
          <div class="success-details">
            <div class="detail-item">
              <div class="detail-label">Rider:</div>
              <div class="detail-value">${details.rider}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Response:</div>
              <div class="detail-value"><strong>${details.response.toUpperCase()}</strong></div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Assignment:</div>
              <div class="detail-value">${details.assignmentId}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Request:</div>
              <div class="detail-value">${details.requestId}</div>
            </div>
          </div>
          
          <div class="contact-info">
            <strong>What happens next?</strong><br>
            ${details.response.toLowerCase() === 'confirm' ? 
              '✅ Your confirmation has been sent to the dispatcher. You should receive additional details closer to the event date.' :
              '❌ Your decline has been noted. The dispatcher will assign another rider to this request.'
            }
          </div>
        ` : ''}
        
        ${!isSuccess ? `
          <div class="error-details">
            <p><strong>Having trouble?</strong></p>
            <p>Please contact your dispatcher directly or try the link in your original email again.</p>
          </div>
        ` : ''}
        
        <div class="timestamp">
          Processed at ${new Date().toLocaleString()}
        </div>
      </div>
    </body>
    </html>
  `;
  
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Log confirmation responses
 */
function logConfirmationResponse(rider, response, id, success) {
  try {
    const message = `📧 Confirmation: ${rider} ${response}d ${id} - ${success ? 'Success' : 'Failed'}`;
    logActivity(message);
    debugLog(message);
  } catch (error) {
    console.error('Error logging confirmation:', error);
  }
}

/**
 * Notify admin/dispatcher of confirmations
 */
function notifyAdminOfConfirmation(rider, response, id) {
  try {
    debugLog('📨 Notifying admin of confirmation:', { rider, response, id });
    
    // Get admin emails from settings
    const adminEmails = getAdminUsers();
    if (!adminEmails || adminEmails.length === 0) {
      debugLog('⚠️ No admin emails found for notification');
      return;
    }
    
    const subject = `🏍️ Rider Confirmation: ${rider} ${response}d ${id}`;
    const body = `
Rider confirmation received:

Rider: ${rider}
Response: ${response.toUpperCase()}
ID: ${id}
Time: ${new Date().toLocaleString()}

View assignments: ${getWebAppUrl()}?page=assignments

--
Motorcycle Escort Management System
    `;
    
    adminEmails.forEach(email => {
      if (email && email.trim()) {
        try {
          GmailApp.sendEmail(email, subject, body);
          debugLog('✅ Notification sent to admin:', email);
        } catch (emailError) {
          console.error(`❌ Failed to notify admin ${email}:`, emailError);
        }
      }
    });
    
    debugLog('📧 Admin notifications completed');
    
  } catch (error) {
    console.error('❌ Error notifying admin of confirmation:', error);
  }
}

/**
 * Clean up expired confirmation tokens (run this periodically)
 */
function cleanupExpiredTokens() {
  try {
    debugLog('🧹 Cleaning up expired confirmation tokens...');
    
    const properties = PropertiesService.getScriptProperties();
    const allProperties = properties.getProperties();
    let cleanupCount = 0;
    
    Object.keys(allProperties).forEach(key => {
      if (key.startsWith('confirm_')) {
        try {
          const data = JSON.parse(allProperties[key]);
          if (Date.now() > data.expires) {
            properties.deleteProperty(key);
            cleanupCount++;
          }
        } catch (error) {
          // Invalid data, clean it up
          properties.deleteProperty(key);
          cleanupCount++;
        }
      }
    });
    
    debugLog(`✅ Cleaned up ${cleanupCount} expired confirmation tokens`);
    return cleanupCount;
    
  } catch (error) {
    console.error('❌ Error cleaning up tokens:', error);
    return 0;
  }
}

/**
 * Test the confirmation system
 */
function testConfirmationSystem() {
  try {
    debugLog('🧪 Testing confirmation system...');
    
    // Test token generation
    const links = generateSecureConfirmationLinks('ASG-001', 'Test Rider', 'R-001');
    debugLog('✅ Generated confirmation links:', links);
    
    // Test token validation
    const tokenMatch = links.confirmUrl.match(/token=([^&]+)/);
    if (tokenMatch) {
      const token = tokenMatch[1];
      const validation = validateConfirmationToken(token);
      debugLog('✅ Token validation:', validation);
      
      // Clean up test token
      PropertiesService.getScriptProperties().deleteProperty(`confirm_${token}`);
    }
    
    // Test response sheet creation
    const responseSheet = getOrCreateResponseSheet();
    debugLog('✅ Response sheet created/found:', responseSheet.getName());
    
    debugLog('✅ Confirmation system test complete');
    return { success: true, message: 'All tests passed' };
    
  } catch (error) {
    console.error('❌ Confirmation system test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get assignment details (helper function if not already exists)
 */
function getAssignmentDetails(assignmentId) {
  try {
    const assignmentsData = getAssignmentsData();
    
    const assignmentRow = assignmentsData.data.find(row => 
      getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.assignmentId) === assignmentId
    );
    
    if (!assignmentRow) {
      return null;
    }
    
    return {
      assignmentId: assignmentId,
      requestId: getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.requestId),
      riderName: getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.riderName),
      eventDate: getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate),
      startTime: getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.startTime),
      status: getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.status)
    };
    
  } catch (error) {
    console.error('Error getting assignment details:', error);
    return null;
  }
}
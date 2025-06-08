function addEnhancedNotificationDropdowns(dashSheet, startRow, numRows) {
  try {
    if (numRows === 0) return;

    for (let i = 0; i < numRows; i++) {
      const row = startRow + i;
      const requestIdCell = dashSheet.getRange(row, 1);
      const assignedRidersCell = dashSheet.getRange(row, 10);
      const notificationCell = dashSheet.getRange(row, 11);

      const requestId = requestIdCell.getValue();
      const assignedRidersText = assignedRidersCell.getValue();

      // Only create enhanced dropdown for requests with assigned riders
      if (assignedRidersText && String(assignedRidersText).trim().length > 0) {
        const riderList = String(assignedRidersText).split(/[\n,]/) // Supports both newlines and commas
          .map(name => name.trim())
          .filter(name => name.length > 0);

        if (riderList.length > 0) {
          const notificationOptions = [
            'Select action...',
            '── Bulk Actions ──',
            `📱 Send SMS to All (${riderList.length})`,
            `📧 Send Email to All (${riderList.length})`,
            `📨 Send Both to All (${riderList.length})`,
            '── Individual Rider SMS ──',
            ...riderList.map(rider => `📱 SMS → ${rider}`),
            '── Individual Rider Email ──',
            ...riderList.map(rider => `📧 Email → ${rider}`),
            '── Individual Rider Both ──',
            ...riderList.map(rider => `📨 Both → ${rider}`),
            '── Utility Actions ──',
            '✅ Mark All as Notified',
            '📊 Show Notification Status'
          ];
          
          const rule = SpreadsheetApp.newDataValidation()
            .requireValueInList(notificationOptions)
            .setAllowInvalid(false)
            .setHelpText(`Notification options for ${requestId} (${riderList.length} riders)`)
            .build();
          
          notificationCell.setDataValidation(rule);
          notificationCell.setValue('Select action...');
        }
      } else {
        // Simple dropdown for requests with no assigned riders
        const basicOptions = ['Select action...', 'No riders assigned'];
        
        const rule = SpreadsheetApp.newDataValidation()
          .requireValueInList(basicOptions)
          .setAllowInvalid(false)
          .setHelpText('No riders assigned to this request')
          .build();
        
        notificationCell.setDataValidation(rule);
        notificationCell.setValue('Select action...');
      }
    }
    logActivity(`Enhanced notification dropdowns created for ${numRows} dashboard rows`);
  } catch (error) {
    logError('Error adding enhanced notification dropdowns', error);
  }
}

/**
 * Handles notification actions triggered from the dashboard.
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e The onEdit event object.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} dashSheet The dashboard sheet.
 * @param {number} row The row number where the edit occurred.
 */
function handleEnhancedNotificationAction(e, dashSheet, row) {
  try {
    const selectedAction = e.range.getValue();
    console.log(`handleEnhancedNotificationAction: Action "${selectedAction}" selected at row ${row}`);
    
    if (!selectedAction || selectedAction === 'Select action...' || selectedAction.startsWith('──')) {
      return;
    }
    
    const requestId = dashSheet.getRange(row, 1).getValue();
    if (!requestId) {
      SpreadsheetApp.getUi().alert('Error: Could not find Request ID for this row');
      return;
    }
    
    e.range.setValue('Select action...'); // Reset dropdown
    
    if (selectedAction.includes('Send SMS to All')) {
      sendNotificationsToRequest(requestId, 'SMS');
    } else if (selectedAction.includes('Send Email to All')) {
      sendNotificationsToRequest(requestId, 'Email');
    } else if (selectedAction.includes('Send Both to All')) {
      sendNotificationsToRequest(requestId, 'Both');
    } else if (selectedAction.includes('SMS →')) {
      const riderName = selectedAction.split('→')[1].trim();
      sendIndividualNotification(requestId, riderName, 'SMS');
    } else if (selectedAction.includes('Email →')) {
      const riderName = selectedAction.split('→')[1].trim();
      sendIndividualNotification(requestId, riderName, 'Email');
    } else if (selectedAction.includes('Both →')) {
      const riderName = selectedAction.split('→')[1].trim();
      sendIndividualNotification(requestId, riderName, 'Both');
    } else if (selectedAction.includes('Mark All as Notified')) {
      markRequestAsNotified(requestId);
    } else if (selectedAction.includes('Show Notification Status')) {
      showNotificationStatus(requestId);
    } else {
      console.log(`Unknown notification action: ${selectedAction}`);
    }
    
  } catch (error) {
    logError('Error handling enhanced notification action', error);
    SpreadsheetApp.getUi().alert('Error processing notification: ' + error.message);
  }
}


/**
 * Send notification to a specific rider for a specific request.
 * @param {string} requestId The ID of the request.
 * @param {string} riderName The name of the rider.
 * @param {string} type The type of notification ('SMS', 'Email', or 'Both').
 */
function sendIndividualNotification(requestId, riderName, type) {
  try {
    console.log(`Sending ${type} to ${riderName} for request ${requestId}`);
    
    const assignments = getAssignmentsForRequest(requestId);
    const assignmentsData = getAssignmentsData();
    
    const targetAssignment = assignments.find(assignment => {
      const assignmentRiderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      return String(assignmentRiderName || '').trim() === String(riderName || '').trim();
    });
    
    if (!targetAssignment) {
      SpreadsheetApp.getUi().alert(`No assignment found for rider "${riderName}" on request ${requestId}`);
      return;
    }
    
    const assignmentId = getColumnValue(targetAssignment, assignmentsData.columnMap, CONFIG.columns.assignments.id);
    
    const results = { success: 0, failed: 0, errors: [] };
    
    try {
      if (type === 'SMS' || type === 'Both') {
        const smsResult = sendAssignmentNotification(assignmentId, 'SMS');
        if (smsResult.success) { results.success++; } else { results.failed++; results.errors.push(`SMS: ${smsResult.message}`); }
      }
      if (type === 'Email' || type === 'Both') {
        const emailResult = sendAssignmentNotification(assignmentId, 'Email');
        if (emailResult.success) { results.success++; } else { results.failed++; results.errors.push(`Email: ${emailResult.message}`); }
      }
    } catch (error) { results.failed++; results.errors.push(error.message); }
    
    let message = `${type} notification to ${riderName}:\n\n`;
    if (results.success > 0) { message += `✅ Successfully sent!\n`; }
    if (results.failed > 0) { message += `❌ Failed: ${results.errors.join(', ')}\n`; }
    
    SpreadsheetApp.getUi().alert('Individual Notification Result', message, SpreadsheetApp.getUi().ButtonSet.OK);
    logActivity(`Sent ${type} to ${riderName} for ${requestId}: ${results.success > 0 ? 'success' : 'failed'}`);
    
  } catch (error) {
    logError(`Error sending individual notification to ${riderName}`, error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Displays the notification status for all assignments related to a request.
 * @param {string} requestId The ID of the request.
 */
function showNotificationStatus(requestId) {
  try {
    console.log(`Showing notification status for ${requestId}`);
    
    const assignments = getAssignmentsForRequest(requestId);
    const assignmentsData = getAssignmentsData();
    
    if (assignments.length === 0) {
      SpreadsheetApp.getUi().alert('No assignments found for this request');
      return;
    }
    
    let statusReport = `Notification Status for ${requestId}:\n\n`;
    
    assignments.forEach(assignment => {
      const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const notifiedValue = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.notified);
      const smsSentValue = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.smsSent);
      const emailSentValue = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.emailSent);
      
      const notified = notifiedValue instanceof Date ? notifiedValue : null;
      const smsSent = smsSentValue instanceof Date ? smsSentValue : null;
      const emailSent = emailSentValue instanceof Date ? emailSentValue : null;

      statusReport += `📍 ${riderName}:\n`;
      statusReport += `  📱 SMS: ${smsSent ? '✅ Sent ' + formatDateTimeForDisplay(smsSent) : '❌ Not sent'}\n`;
      statusReport += `  📧 Email: ${emailSent ? '✅ Sent ' + formatDateTimeForDisplay(emailSent) : '❌ Not sent'}\n`;
      statusReport += `  🔔 Notified: ${notified ? '✅ ' + formatDateTimeForDisplay(notified) : '❌ No'}\n\n`;
    });
    
    SpreadsheetApp.getUi().alert('Notification Status', statusReport, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    logError(`Error showing notification status for ${requestId}`, error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}


/**
 * Send notifications to all assigned riders for a request (either SMS, Email, or Both).
 * @param {string} requestId The ID of the request.
 * @param {string} notificationType The type of notification ('SMS', 'Email', or 'Both').
 */
function sendNotificationsToRequest(requestId, notificationType) {
  try {
    console.log(`sendNotificationsToRequest: Sending ${notificationType} for request ${requestId}`);
    
    const assignments = getAssignmentsForRequest(requestId);
    
    if (assignments.length === 0) {
      SpreadsheetApp.getUi().alert('No assigned riders found for this request');
      return;
    }
    
    const assignmentsData = getAssignmentsData();
    const results = { successful: 0, failed: 0, errors: [] };
    
    for (const assignment of assignments) {
      const assignmentId = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.id);
      const riderName = getColumnValue(assignment, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      
      console.log(`Sending ${notificationType} to ${riderName} (${assignmentId})`);
      
      try {
        if (notificationType === 'SMS' || notificationType === 'Both') {
          const smsResult = sendAssignmentNotification(assignmentId, 'SMS');
          if (smsResult.success) { results.successful++; } else { results.failed++; results.errors.push(`SMS to ${riderName}: ${smsResult.message}`); }
        }
        if (notificationType === 'Email' || notificationType === 'Both') {
          const emailResult = sendAssignmentNotification(assignmentId, 'Email');
          if (emailResult.success) { results.successful++; } else { results.failed++; results.errors.push(`Email to ${riderName}: ${emailResult.message}`); }
        }
      } catch (error) { results.failed++; results.errors.push(`${riderName}: ${error.message}`); }
    }
    
    let message = `Notification Results for ${requestId}:\n\n`;
    message += `✅ Successful: ${results.successful}\n`;
    message += `❌ Failed: ${results.failed}\n`;
    if (results.errors.length > 0) { message += `\nErrors:\n${results.errors.slice(0, 5).join('\n')}`; }
    
    SpreadsheetApp.getUi().alert('Notification Results', message, SpreadsheetApp.getUi().ButtonSet.OK);
    logActivity(`Sent ${notificationType} notifications for ${requestId}: ${results.successful} success, ${results.failed} failed`);
    
  } catch (error) {
    logError(`Error sending notifications for request ${requestId}`, error);
    SpreadsheetApp.getUi().alert('Error sending notifications: ' + error.message);
  }
}

/**
 * Mark all assignments for a request as notified.
 * @param {string} requestId The ID of the request to mark as notified.
 */
function markRequestAsNotified(requestId) {
  try {
    console.log(`markRequestAsNotified: Marking ${requestId} as notified`);
    
    const assignments = getAssignmentsForRequest(requestId);
    const assignmentsData = getAssignmentsData();
    const sheet = assignmentsData.sheet;
    
    let markedCount = 0;
    
    for (let i = 0; i < assignmentsData.data.length; i++) {
      const row = assignmentsData.data[i];
      const rowRequestId = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
      
      if (String(rowRequestId || '').trim().toLowerCase() === String(requestId || '').trim().toLowerCase()) {
        const sheetRowIndex = i + 2;
        const notifiedColIndex = assignmentsData.columnMap[CONFIG.columns.assignments.notified];
        
        if (notifiedColIndex !== undefined) {
          sheet.getRange(sheetRowIndex, notifiedColIndex + 1).setValue(new Date());
          markedCount++;
        }
      }
    }
    
    if (markedCount > 0) {
      SpreadsheetApp.getUi().alert(`✅ Marked ${markedCount} assignment(s) as notified for ${requestId}`);
      logActivity(`Marked ${markedCount} assignments as notified for ${requestId}`);
    } else {
      SpreadsheetApp.getUi().alert('No assignments found to mark as notified');
    }
    
  } catch (error) {
    logError(`Error marking request ${requestId} as notified`, error);
    SpreadsheetApp.getUi().alert('Error marking as notified: ' + error.message);
  }
}


// Replace the sendAssignmentNotification function in your Notifications.js file
// This ensures the message formatting gets the request ID properly

/**
 * Send notification for a specific assignment with enhanced message content.
 * @param {string} assignmentId - The assignment ID.
 * @param {string} type - 'SMS', 'Email', or 'Both'.
 * @return {Object} Result object indicating success/failure.
 */
function sendAssignmentNotification(assignmentId, type) {
  console.log(`📱 Sending ${type} notification for assignment ${assignmentId}`);
  
  try {
    const assignmentsData = getAssignmentsData();
    if (!assignmentsData || assignmentsData.data.length === 0) {
      return { success: false, message: 'No assignments data available' };
    }
    
    const assignmentsHeaders = assignmentsData.headers;
    const assignmentsRows = assignmentsData.data;
    
    const assgnIdIdx = assignmentsHeaders.indexOf('Assignment ID');
    const reqIdIdx = assignmentsHeaders.indexOf('Request ID');
    const riderNameColIdx = assignmentsHeaders.indexOf('Rider Name');
    const eventDateColIdx = assignmentsHeaders.indexOf('Event Date');
    const startTimeColIdx = assignmentsHeaders.indexOf('Start Time');
    const startLocationColIdx = assignmentsHeaders.indexOf('Start Location');
    const endLocationColIdx = assignmentsHeaders.indexOf('End Location');
    const smsColIdx = assignmentsHeaders.indexOf('SMS Sent');
    const emailColIdx = assignmentsHeaders.indexOf('Email Sent');
    const notifiedColIdx = assignmentsHeaders.indexOf('Notified');
    
    let assignmentRow = null;
    let assignmentRowIndex = -1;
    
    if (assgnIdIdx >= 0) {
      assignmentRowIndex = assignmentsRows.findIndex(row => row[assgnIdIdx] === assignmentId);
      if (assignmentRowIndex >= 0) {
        assignmentRow = assignmentsRows[assignmentRowIndex];
      }
    }
    
    if (!assignmentRow) {
      return { success: false, message: `Assignment ${assignmentId} not found` };
    }
    
    const riderName = getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
    const requestId = getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
    const eventDate = getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
    const startTime = getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.startTime);
    const startLocation = getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.startLocation);
    const endLocation = getColumnValue(assignmentRow, assignmentsData.columnMap, CONFIG.columns.assignments.endLocation);
    
    if (!riderName) {
      return { success: false, message: 'No rider name found for assignment' };
    }
    
    const ridersData = getRidersData();
    if (!ridersData || ridersData.data.length === 0) {
      return { success: false, message: 'Riders data not available' };
    }
    
    const riderFullNameIdx = ridersData.columnMap[CONFIG.columns.riders.name];
    const riderPhoneIdx = ridersData.columnMap[CONFIG.columns.riders.phone];
    const riderEmailIdx = ridersData.columnMap[CONFIG.columns.riders.email];
    const riderCarrierIdx = ridersData.columnMap[CONFIG.columns.riders.carrier];
    
    let riderInfo = null;
    if (riderFullNameIdx !== undefined) {
      riderInfo = ridersData.data.find(row => row[riderFullNameIdx] === riderName);
    }
    
    if (!riderInfo) {
      return { success: false, message: `Rider ${riderName} not found in riders database` };
    }
    
    const riderPhone = riderInfo[riderPhoneIdx];
    const riderEmail = riderInfo[riderEmailIdx];
    const riderCarrier = riderInfo[riderCarrierIdx];
    
    if (!riderPhone && !riderEmail) {
      return { success: false, message: `No contact information found for rider ${riderName}` };
    }
    
    // Enhanced message formatting with request details
    const smsMessage = formatNotificationMessage({
      assignmentId,
      requestId,
      riderName,
      eventDate,
      startTime,
      startLocation,
      endLocation
    }, true);

    // Build an email-specific message (without links) that includes other assigned riders
    let emailMessage = smsMessage;

    if (type === 'Email' || type === 'Both') {
      emailMessage = formatNotificationMessage({
        assignmentId,
        requestId,
        riderName,
        eventDate,
        startTime,
        startLocation,
        endLocation
      }, false);
      try {
        const relatedAssignments = getAssignmentsForRequest(requestId);
        const otherRiders = relatedAssignments
          .map(row => getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.riderName))
          .filter(name => name && name !== riderName);
        if (otherRiders.length > 0) {
          emailMessage += `\n\nRiders Assigned: ${otherRiders.concat(riderName).join(', ')}`;
        } else {
          emailMessage += `\n\nRiders Assigned: ${riderName}`;
        }

        const requestDetails = getRequestDetailsForNotification(requestId);
        const formattedDetails = formatRequestDetails(requestDetails);
        if (formattedDetails) {
          emailMessage += `\n\nRequest Details:\n${formattedDetails}`;
        }
      } catch (otherError) {
        console.log(`Could not retrieve other riders for ${requestId}: ${otherError}`);
      }
    }
    
    let smsResult = { success: true };
    let emailResult = { success: true };
    
    if ((type === 'SMS' || type === 'Both') && riderPhone) {
      smsResult = sendSMS(riderPhone, riderCarrier, smsMessage);
    }
    if ((type === 'Email' || type === 'Both') && riderEmail) {
      emailResult = sendEmail(riderEmail, `Assignment ${assignmentId} - ${requestId}`, emailMessage);
    }
    
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const assignmentsSheet = ss.getSheetByName('Assignments');
      const actualRowNum = assignmentRowIndex + 2;
      const now = new Date();
      
      // Only set value if column index is valid and communication was successful
      if (smsResult.success && (type === 'SMS' || type === 'Both') && smsColIdx !== undefined) {
        assignmentsSheet.getRange(actualRowNum, smsColIdx + 1).setValue(now);
      }
      if (emailResult.success && (type === 'Email' || type === 'Both') && emailColIdx !== undefined) {
        assignmentsSheet.getRange(actualRowNum, emailColIdx + 1).setValue(now);
      }
      if ((smsResult.success || emailResult.success) && notifiedColIdx !== undefined) {
        assignmentsSheet.getRange(actualRowNum, notifiedColIdx + 1).setValue(now);
      }
      clearDataCache(); // Clear data cache to ensure fresh data for next calls.
    } catch (updateError) {
      logError(`Error updating sheet for assignment ${assignmentId}:`, updateError);
    }
    
    const overallSuccess = smsResult.success && emailResult.success;
    let resultMessage = '';
    if (type === 'Both') { 
      resultMessage = `SMS: ${smsResult.success ? 'Sent' : 'Failed'}, Email: ${emailResult.success ? 'Sent' : 'Failed'}`;
    } else if (type === 'SMS') { 
      resultMessage = smsResult.success ? 'SMS sent successfully' : `SMS failed: ${smsResult.message}`;
    } else if (type === 'Email') { 
      resultMessage = emailResult.success ? 'Email sent successfully' : `Email failed: ${emailResult.message}`;
    }
    
    return { 
      success: overallSuccess, 
      message: resultMessage, 
      smsResult: smsResult, 
      emailResult: emailResult 
    };
    
  } catch (error) {
    logError(`Error sending notification for assignment ${assignmentId} (${type})`, error);
    return { success: false, message: `Error: ${error.message}` };
  }
}

/**
 * Sends an SMS to a phone number via email-to-SMS gateway.
 * @param {string} phone - The 10-digit phone number.
 * @param {string} carrier - The carrier name (e.g., 'Verizon', 'AT&T').
 * @param {string} message - The message text.
 * @returns {Object} An object indicating success and a message.
 */
/**
 * Updated SMS functions for Twilio integration
 * Replace these functions in your NotificationService.gs file
 */

/**
 * Sends SMS via Twilio API (replaces the old carrier gateway method)
 * @param {string} phone - The 10-digit phone number
 * @param {string} carrier - Legacy parameter, now ignored (kept for compatibility)
 * @param {string} message - The message text
 * @returns {Object} An object indicating success and a message
 */
function sendSMS(phone, carrier, message) {
  try {
    console.log(`📱 Sending SMS via Twilio to ${phone}`);
    
    // Validate inputs
    if (!phone) {
      return { success: false, message: 'No phone number provided' };
    }
    
    if (!message) {
      return { success: false, message: 'No message content provided' };
    }
    
    // Clean and format phone number
    const cleanPhone = cleanPhoneNumber(phone);
    if (cleanPhone.length !== 10) {
      return { success: false, message: 'Invalid phone number format' };
    }
    
    // Format to E.164 format (+1XXXXXXXXXX for US)
    const formattedPhone = `+1${cleanPhone}`;
    
    // Validate Twilio configuration
    if (!CONFIG.twilio.accountSid || !CONFIG.twilio.authToken || !CONFIG.twilio.fromNumber) {
      return { 
        success: false, 
        message: 'Twilio configuration incomplete. Please check accountSid, authToken, and fromNumber.' 
      };
    }
    
    // Send SMS via Twilio
    const result = sendTwilioSMS(formattedPhone, message);
    
    if (result.success) {
      console.log(`✅ SMS sent successfully to ${formattedPhone}`);
      logActivity(`SMS sent via Twilio to ${formattedPhone}: ${result.messageSid}`);
      return { 
        success: true, 
        message: 'SMS sent via Twilio',
        messageSid: result.messageSid 
      };
    } else {
      console.error(`❌ SMS failed to ${formattedPhone}: ${result.message}`);
      logError(`Twilio SMS failed to ${formattedPhone}`, result.error);
      return { 
        success: false, 
        message: `SMS failed: ${result.message}` 
      };
    }
    
  } catch (error) {
    console.error('❌ SMS sending error:', error);
    logError('SMS sending error', error);
    return { 
      success: false, 
      message: `SMS error: ${error.message}` 
    };
  }
}

/**
 * Core Twilio API call function
 * @param {string} toNumber - Phone number in E.164 format (+1XXXXXXXXXX)
 * @param {string} messageBody - Message content
 * @param {number} retryCount - Current retry attempt (for internal use)
 * @returns {Object} Result object with success status and details
 */
function sendTwilioSMS(toNumber, messageBody, retryCount = 0) {
  try {
    // Twilio API endpoint
    const url = `https://api.twilio.com/2010-04-01/Accounts/${CONFIG.twilio.accountSid}/Messages.json`;
    
    // Prepare the payload
    const payload = {
      'To': toNumber,
      'From': CONFIG.twilio.fromNumber,
      'Body': messageBody
    };
    
    // Add delivery callback if enabled
    if (CONFIG.twilio.enableDeliveryCallbacks) {
      // You can set this to your web app URL + a webhook endpoint if needed
      // payload['StatusCallback'] = 'https://your-webapp-url/twilio-webhook';
    }
    
    // Create authorization header
    const authHeader = Utilities.base64Encode(`${CONFIG.twilio.accountSid}:${CONFIG.twilio.authToken}`);
    
    // Configure the request
    const options = {
      'method': 'POST',
      'headers': {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      'payload': Object.keys(payload).map(key => 
        `${encodeURIComponent(key)}=${encodeURIComponent(payload[key])}`
      ).join('&')
    };
    
    console.log(`🔄 Making Twilio API call to ${toNumber}`);
    
    // Make the API call
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log(`📡 Twilio API response code: ${responseCode}`);
    
    if (responseCode >= 200 && responseCode < 300) {
      // Success
      const responseData = JSON.parse(responseText);
      return {
        success: true,
        messageSid: responseData.sid,
        status: responseData.status,
        message: 'SMS queued successfully'
      };
    } else {
      // Error response from Twilio
      let errorMessage = 'Unknown Twilio error';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.detail || errorMessage;
      } catch (parseError) {
        errorMessage = `HTTP ${responseCode}: ${responseText}`;
      }
      
      // Retry logic for certain errors
      if (retryCount < CONFIG.twilio.maxRetries && (responseCode >= 500 || responseCode === 429)) {
        console.log(`🔄 Retrying SMS send (attempt ${retryCount + 1}/${CONFIG.twilio.maxRetries})`);
        Utilities.sleep(CONFIG.twilio.retryDelay * (retryCount + 1)); // Exponential backoff
        return sendTwilioSMS(toNumber, messageBody, retryCount + 1);
      }
      
      return {
        success: false,
        message: errorMessage,
        responseCode: responseCode,
        error: responseText
      };
    }
    
  } catch (error) {
    console.error('❌ Twilio API call error:', error);
    
    // Retry on network errors
    if (retryCount < CONFIG.twilio.maxRetries) {
      console.log(`🔄 Retrying SMS send due to network error (attempt ${retryCount + 1}/${CONFIG.twilio.maxRetries})`);
      Utilities.sleep(CONFIG.twilio.retryDelay * (retryCount + 1));
      return sendTwilioSMS(toNumber, messageBody, retryCount + 1);
    }
    
    return {
      success: false,
      message: `Network error: ${error.message}`,
      error: error
    };
  }
}

/**
 * Test function to verify Twilio setup
 * Run this from Apps Script editor to test your configuration
 */
function testTwilioSetup() {
  try {
    console.log('🧪 Testing Twilio configuration...');
    
    // Check configuration
    if (!CONFIG.twilio.accountSid || CONFIG.twilio.accountSid === 'YOUR_TWILIO_ACCOUNT_SID') {
      throw new Error('Please set your Twilio Account SID in CONFIG.twilio');
    }
    
    if (!CONFIG.twilio.authToken || CONFIG.twilio.authToken === 'YOUR_TWILIO_AUTH_TOKEN') {
      throw new Error('Please set your Twilio Auth Token in CONFIG.twilio');
    }
    
    if (!CONFIG.twilio.fromNumber || CONFIG.twilio.fromNumber === 'YOUR_TWILIO_PHONE_NUMBER') {
      throw new Error('Please set your Twilio phone number in CONFIG.twilio');
    }
    
    console.log('✅ Twilio configuration looks good');
    console.log(`📞 From number: ${CONFIG.twilio.fromNumber}`);
    
    // Test with a sample phone number (replace with your own for actual testing)
    const testPhone = '5047233075'; // ⚠️ Replace with your phone number for testing
    const testMessage = '🏍️ Test SMS from Motorcycle Escort Management System via Twilio';
    
    console.log(`📱 Sending test SMS to ${testPhone}...`);
    
    const result = sendSMS(testPhone, 'twilio', testMessage); // Carrier parameter is now ignored
    
    if (result.success) {
      console.log('✅ Test SMS sent successfully!');
      console.log('Message SID:', result.messageSid);
      SpreadsheetApp.getUi().alert('✅ Twilio Test Successful', 
        `Test SMS sent successfully!\nMessage SID: ${result.messageSid}`, 
        SpreadsheetApp.getUi().ButtonSet.OK);
    } else {
      console.error('❌ Test SMS failed:', result.message);
      SpreadsheetApp.getUi().alert('❌ Twilio Test Failed', 
        `Test SMS failed: ${result.message}`, 
        SpreadsheetApp.getUi().ButtonSet.OK);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Twilio test error:', error);
    SpreadsheetApp.getUi().alert('❌ Twilio Configuration Error', 
      `Configuration error: ${error.message}`, 
      SpreadsheetApp.getUi().ButtonSet.OK);
    return { success: false, message: error.message };
  }
}

/**
 * Enhanced phone number cleaning for Twilio (supports international)
 * @param {string|number} phone - The phone number to clean
 * @returns {string} Clean phone number with only digits
 */
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  
  // Remove all non-digit characters
  let cleaned = String(phone).replace(/\D/g, '');
  
  // Handle US numbers with country code
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    cleaned = cleaned.substring(1);
  }
  
  return cleaned;
}

/**
 * Get Twilio account info for debugging
 * @returns {Object} Account information or error
 */
function getTwilioAccountInfo() {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${CONFIG.twilio.accountSid}.json`;
    const authHeader = Utilities.base64Encode(`${CONFIG.twilio.accountSid}:${CONFIG.twilio.authToken}`);
    
    const options = {
      'method': 'GET',
      'headers': {
        'Authorization': `Basic ${authHeader}`
      }
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseData = JSON.parse(response.getContentText());
    
    console.log('Twilio Account Info:', {
      friendlyName: responseData.friendly_name,
      status: responseData.status,
      type: responseData.type
    });
    
    return responseData;
    
  } catch (error) {
    console.error('Error getting Twilio account info:', error);
    return { error: error.message };
  }
}

/**
 * Sends an email notification.
 * @param {string} email - The recipient's email address.
 * @param {string} subject - The email subject.
 * @param {string} message - The email body.
 * @returns {Object} An object indicating success and a message.
 */
function sendEmail(email, subject, message) {
  try {
    if (!email || !email.includes('@')) return { success: false, message: 'Invalid email address' };
    GmailApp.sendEmail(email, subject, message);
    return { success: true, message: 'Email sent' };
  } catch (error) {
    logError(`Email sending error for ${email}:`, error);
    return { success: false, message: error.message };
  }
}

// Replace the formatNotificationMessage function in your Notifications.js file

/**
 * Formats a notification message using assignment details, including notes and courtesy flag.
 * @param {Object} assignment - An object containing assignment details.
 * @returns {string} The formatted message string.
 */
/**
 * Enhanced SMS Features for Motorcycle Escort System
 * Includes link support and response handling via Twilio webhooks
 */

// ===== 1. ENHANCED MESSAGE FORMATTING WITH LINKS =====

/**
 * Enhanced notification message formatter that can include links
 * Replace your existing formatNotificationMessage function
 */
function formatNotificationMessage(assignment, includeLinks = true) {
  const { assignmentId, requestId, riderName, eventDate, startTime, startLocation, endLocation } = assignment;
  
  let message = `🏍️ ESCORT ASSIGNMENT\n\n`;
  message += `Assignment: ${assignmentId}\n`;
  if (requestId) message += `Request: ${requestId}\n`;
  message += `Rider: ${riderName}\n\n`;
  
  if (eventDate) {
    let dateStr = eventDate;
    if (eventDate instanceof Date) { 
      dateStr = formatDate(eventDate);
    }
    message += `📅 Date: ${dateStr}\n`;
  }
  
  if (startTime) {
    let timeStr = startTime;
    if (startTime instanceof Date) { 
      timeStr = formatTime(startTime);
    }
    message += `🕐 Time: ${timeStr}\n`;
  }
  
  if (startLocation) { 
    message += `📍 Start: ${startLocation}\n`; 
  }
  if (endLocation) { 
    message += `🏁 End: ${endLocation}\n`; 
  }
  
  // Get additional request details
  const requestDetails = getRequestDetailsForNotification(requestId);
  
  if (requestDetails) {
    if (requestDetails.courtesy === 'Yes') {
      message += `\n⭐ **COURTESY** ⭐\n`;
    }
    
    if (requestDetails.notes && requestDetails.notes.trim()) {
      message += `\n📝 Notes: ${requestDetails.notes.trim()}\n`;
    }
  }
  
  // Add response options
  message += `\n📱 RESPOND:\n`;
  message += `• Reply "CONFIRM" to confirm\n`;
  message += `• Reply "DECLINE" if unavailable\n`;
  message += `• Reply "INFO" for details\n`;
  
  // Add links if enabled
  if (includeLinks) {
    const webAppUrl = getWebAppUrl();
    if (webAppUrl) {
      // Create a shortened assignment-specific URL
      const assignmentUrl = `${webAppUrl}?page=assignments&requestId=${requestId}`;
      message += `\n🔗 View Details: ${assignmentUrl}\n`;
    }
  }
  
  message += `\n-- Rider Integration and Deployment Engine`;
  return message;
}

/**
 * Formats full request details for inclusion in email notifications.
 * @param {Object|null} details - Object returned from getRequestDetailsForNotification.
 * @return {string} Multiline string with formatted request information.
 */
function formatRequestDetails(details) {
  if (!details) return '';

  const parts = [];
  if (details.requesterName) parts.push(`Requester: ${details.requesterName}`);
  if (details.requesterContact) parts.push(`Contact: ${details.requesterContact}`);
  if (details.requestType) parts.push(`Type: ${details.requestType}`);
  if (details.eventDate) parts.push(`Event Date: ${formatDateForDisplay(details.eventDate)}`);
  if (details.startTime) parts.push(`Start Time: ${formatTimeForDisplay(details.startTime)}`);
  if (details.endTime) parts.push(`End Time: ${formatTimeForDisplay(details.endTime)}`);
  if (details.startLocation) parts.push(`Start Location: ${details.startLocation}`);
  if (details.endLocation) parts.push(`End Location: ${details.endLocation}`);
  if (details.secondaryLocation) parts.push(`Secondary Location: ${details.secondaryLocation}`);
  if (details.ridersNeeded) parts.push(`Riders Needed: ${details.ridersNeeded}`);
  if (details.ridersAssigned) parts.push(`Riders Assigned: ${details.ridersAssigned}`);
  if (details.requirements) parts.push(`Requirements: ${details.requirements}`);
  if (details.notes) parts.push(`Notes: ${details.notes}`);
  if (details.courtesy) parts.push(`Courtesy: ${details.courtesy}`);
  if (details.status) parts.push(`Status: ${details.status}`);

  return parts.join('\n');
}

/**
 * Cached web app URL so we only fetch it once.
 * @type {?string}
 */
let WEB_APP_URL;

/**
 * Get the web app URL for creating links. The URL is retrieved once and then
 * cached for subsequent calls.
 * @return {?string} The deployed web app URL or null if unavailable.
 */
function getWebAppUrl() {
  if (WEB_APP_URL !== undefined) {
    return WEB_APP_URL;
  }
  try {
    WEB_APP_URL = ScriptApp.getService().getUrl();
  } catch (error) {
    console.log('Could not determine web app URL');
    WEB_APP_URL = null;
  }
  return WEB_APP_URL;
}

// ===== 2. TWILIO WEBHOOK SETUP FOR RESPONSES =====

/**
 * Enhanced Twilio SMS function with webhook for responses
 */
function sendTwilioSMSWithWebhook(toNumber, messageBody, retryCount = 0) {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${CONFIG.twilio.accountSid}/Messages.json`;
    
    // Get webhook URL for responses
    const webhookUrl = getWebhookUrl();
    
    const payload = {
      'To': toNumber,
      'From': CONFIG.twilio.fromNumber,
      'Body': messageBody
    };
    
    // Add webhook URL for incoming responses
    if (webhookUrl) {
      payload['StatusCallback'] = webhookUrl;
      // This webhook will receive delivery status updates
    }
    
    const authHeader = Utilities.base64Encode(`${CONFIG.twilio.accountSid}:${CONFIG.twilio.authToken}`);
    
    const options = {
      'method': 'POST',
      'headers': {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      'payload': Object.keys(payload).map(key => 
        `${encodeURIComponent(key)}=${encodeURIComponent(payload[key])}`
      ).join('&')
    };
    
    console.log(`🔄 Sending SMS with webhook to ${toNumber}`);
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode >= 200 && responseCode < 300) {
      const responseData = JSON.parse(responseText);
      
      // Store the message SID for tracking responses
      storeSentMessageInfo(responseData.sid, toNumber, messageBody);
      
      return {
        success: true,
        messageSid: responseData.sid,
        status: responseData.status,
        message: 'SMS sent with response tracking'
      };
    } else {
      // Retry logic (same as before)
      if (retryCount < CONFIG.twilio.maxRetries && (responseCode >= 500 || responseCode === 429)) {
        console.log(`🔄 Retrying SMS send (attempt ${retryCount + 1}/${CONFIG.twilio.maxRetries})`);
        Utilities.sleep(CONFIG.twilio.retryDelay * (retryCount + 1));
        return sendTwilioSMSWithWebhook(toNumber, messageBody, retryCount + 1);
      }
      
      let errorMessage = 'Unknown Twilio error';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.detail || errorMessage;
      } catch (parseError) {
        errorMessage = `HTTP ${responseCode}: ${responseText}`;
      }
      
      return {
        success: false,
        message: errorMessage,
        responseCode: responseCode
      };
    }
    
  } catch (error) {
    console.error('❌ Twilio API call error:', error);
    
    if (retryCount < CONFIG.twilio.maxRetries) {
      console.log(`🔄 Retrying SMS send due to network error (attempt ${retryCount + 1}/${CONFIG.twilio.maxRetries})`);
      Utilities.sleep(CONFIG.twilio.retryDelay * (retryCount + 1));
      return sendTwilioSMSWithWebhook(toNumber, messageBody, retryCount + 1);
    }
    
    return {
      success: false,
      message: `Network error: ${error.message}`,
      error: error
    };
  }
}

/**
 * Get webhook URL for receiving SMS responses
 */
function getWebhookUrl() {
  // This would be your web app URL + webhook endpoint
  const webAppUrl = getWebAppUrl();
  if (webAppUrl) {
    return `${webAppUrl}?webhook=sms`;
  }
  return null;
}

/**
 * Store information about sent messages for tracking responses
 */
function storeSentMessageInfo(messageSid, toNumber, messageBody) {
  try {
    const sheet = getOrCreateSheet('SMS_Tracking', [
      'Timestamp', 'Message SID', 'To Number', 'Message Body', 'Status', 'Response', 'Response Time'
    ]);
    
    sheet.appendRow([
      new Date(),
      messageSid,
      toNumber,
      messageBody,
      'Sent',
      '', // Response will be filled when received
      '' // Response time will be calculated
    ]);
    
    console.log(`📝 Tracked message: ${messageSid}`);
    
  } catch (error) {
    logError('Error storing sent message info', error);
  }
}

// ===== 3. WEBHOOK HANDLER FOR INCOMING RESPONSES =====

/**
 * Enhanced doPost to handle Twilio webhooks
 * Add this to your existing doPost function or replace it
 */
function doPost(e) {
  try {
    // Check if this is a Twilio webhook
    if (e.parameter.webhook === 'sms') {
      return handleSMSWebhook(e);
    }
    
    // Your existing doPost logic for other actions
    const action = e.parameter.action;
    const data = JSON.parse(e.parameter.data || '{}');
    
    console.log(`doPost action: ${action}`);
    
    let result = {};
    
    switch (action) {
      case 'assignRiders':
        result = processAssignmentAndPopulate(data.requestId, data.selectedRiders);
        break;
      case 'sendNotification':
        result = sendAssignmentNotification(data.assignmentId, data.notificationType);
        break;
      case 'bulkNotification':
        result = sendBulkNotificationsByTimeframe(data.filter, data.type);
        break;
      case 'generateReport':
        result = generateReportData(data.filters);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    logError('doPost error', error);
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
 * Handle incoming SMS responses from Twilio
 */
function handleSMSWebhook(e) {
  try {
    console.log('📱 Handling SMS webhook...');
    
    // Twilio sends data as form parameters
    const fromNumber = e.parameter.From;
    const messageBody = e.parameter.Body;
    const messageSid = e.parameter.MessageSid;
    const toNumber = e.parameter.To; // Your Twilio number
    
    console.log(`📨 SMS Response from ${fromNumber}: ${messageBody}`);
    
    // Process the response
    const responseResult = processSMSResponse(fromNumber, messageBody, messageSid);
    
    // Log the response
    logSMSResponse(fromNumber, messageBody, messageSid, responseResult);
    
    // Send TwiML response (required by Twilio)
    const twimlResponse = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
    
    return ContentService
      .createTextOutput(twimlResponse)
      .setMimeType(ContentService.MimeType.XML);
      
  } catch (error) {
    logError('SMS webhook error', error);
    
    // Return empty TwiML response even on error
    const twimlResponse = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
    return ContentService
      .createTextOutput(twimlResponse)
      .setMimeType(ContentService.MimeType.XML);
  }
}

/**
 * Process SMS responses from riders
 */
function processSMSResponse(fromNumber, messageBody, messageSid) {
  try {
    const cleanMessage = messageBody.trim().toLowerCase();
    
    // Find the rider by phone number
    const rider = findRiderByPhone(fromNumber);
    if (!rider) {
      console.log(`⚠️ Unknown number responded: ${fromNumber}`);
      return { action: 'unknown_number', rider: null };
    }
    
    console.log(`📱 Response from ${rider.name}: ${cleanMessage}`);
    
    // Process different response types
    let action = 'unknown';
    let autoReply = null;
    
    if (cleanMessage.includes('confirm') || cleanMessage === 'yes' || cleanMessage === 'y') {
      action = 'confirm';
      updateAssignmentStatus(rider.name, 'Confirmed');
      autoReply = `✅ Thanks ${rider.name}! Your assignment is confirmed. Safe riding! 🏍️`;
      
    } else if (cleanMessage.includes('decline') || cleanMessage === 'no' || cleanMessage === 'n') {
      action = 'decline';
      updateAssignmentStatus(rider.name, 'Declined');
      autoReply = `📝 Thanks for letting us know, ${rider.name}. We'll find another rider.`;
      
    } else if (cleanMessage.includes('info') || cleanMessage.includes('details')) {
      action = 'info_request';
      autoReply = getAssignmentDetails(rider.name);
      
    } else {
      action = 'general_response';
      // Forward to admin for manual handling
      notifyAdminOfResponse(rider.name, fromNumber, messageBody);
    }
    
    // Send auto-reply if we have one
    if (autoReply) {
      sendSMS(fromNumber.replace('+1', ''), 'auto', autoReply);
    }
    
    return { action: action, rider: rider.name, autoReply: !!autoReply };
    
  } catch (error) {
    logError('Error processing SMS response', error);
    return { action: 'error', error: error.message };
  }
}

/**
 * Find rider by phone number
 */
function findRiderByPhone(phoneNumber) {
  try {
    const ridersData = getRidersData();
    const cleanSearchNumber = phoneNumber.replace(/\D/g, '').slice(-10); // Last 10 digits
    
    for (let i = 0; i < ridersData.data.length; i++) {
      const row = ridersData.data[i];
      const riderPhone = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.phone);
      const riderName = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.name);
      
      if (riderPhone) {
        const cleanRiderPhone = riderPhone.replace(/\D/g, '').slice(-10);
        if (cleanRiderPhone === cleanSearchNumber) {
          return {
            name: riderName,
            phone: riderPhone,
            email: getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.email)
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    logError('Error finding rider by phone', error);
    return null;
  }
}

/**
 * Update assignment status based on rider response
 */
function updateAssignmentStatus(riderName, newStatus) {
  try {
    const assignmentsData = getAssignmentsData();
    const sheet = assignmentsData.sheet;
    
    for (let i = 0; i < assignmentsData.data.length; i++) {
      const row = assignmentsData.data[i];
      const assignmentRider = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const currentStatus = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      
      if (assignmentRider === riderName && currentStatus === 'Assigned') {
        const rowNumber = i + 2; // Account for header row
        const statusColIndex = assignmentsData.columnMap[CONFIG.columns.assignments.status] + 1;
        
        sheet.getRange(rowNumber, statusColIndex).setValue(newStatus);
        
        logActivity(`Assignment status updated: ${riderName} → ${newStatus}`);
        break;
      }
    }
  } catch (error) {
    logError('Error updating assignment status', error);
  }
}

/**
 * Get assignment details for a rider
 */
function getAssignmentDetails(riderName) {
  try {
    const assignmentsData = getAssignmentsData();
    
    for (let i = 0; i < assignmentsData.data.length; i++) {
      const row = assignmentsData.data[i];
      const assignmentRider = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      
      if (assignmentRider === riderName) {
        const requestId = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.requestId);
        const eventDate = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
        const startTime = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.startTime);
        const startLocation = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.startLocation);
        const endLocation = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.endLocation);
        
        let details = `📋 ASSIGNMENT DETAILS\n\n`;
        details += `Request: ${requestId}\n`;
        details += `Date: ${formatDateForDisplay(eventDate)}\n`;
        details += `Time: ${formatTimeForDisplay(startTime)}\n`;
        details += `Start: ${startLocation}\n`;
        details += `End: ${endLocation}\n\n`;
        details += `Reply CONFIRM to accept or DECLINE if unavailable.`;
        
        return details;
      }
    }
    
    return `No current assignments found for ${riderName}`;
    
  } catch (error) {
    logError('Error getting assignment details', error);
    return 'Unable to retrieve assignment details at this time.';
  }
}

/**
 * Log SMS responses to tracking sheet
 */
function logSMSResponse(fromNumber, messageBody, messageSid, result) {
  try {
    const sheet = getOrCreateSheet('SMS_Responses', [
      'Timestamp', 'From Number', 'Rider Name', 'Message Body', 'Action', 'Auto Reply Sent'
    ]);
    
    sheet.appendRow([
      new Date(),
      fromNumber,
      result.rider || 'Unknown',
      messageBody,
      result.action,
      result.autoReply ? 'Yes' : 'No'
    ]);
    
  } catch (error) {
    logError('Error logging SMS response', error);
  }
}

/**
 * Notify admin of responses that need manual handling
 */
function notifyAdminOfResponse(riderName, fromNumber, messageBody) {
  try {
    // You could send an email or create a notification here
    logActivity(`Manual response needed from ${riderName} (${fromNumber}): ${messageBody}`);
    
    // Optionally send email to admin
    // GmailApp.sendEmail('admin@yourdomain.com', 'SMS Response Needs Attention', ...);
    
  } catch (error) {
    logError('Error notifying admin of response', error);
  }
}

/**
 * Gets additional request details for notification purposes.
 * @param {string} requestId - The request ID to look up.
 * @returns {Object|null} Request details including notes and courtesy status.
 */
function getRequestDetailsForNotification(requestId) {
  try {
    if (!requestId) return null;

    const requestsData = getRequestsData();
    if (!requestsData || !requestsData.data || requestsData.data.length === 0) {
      return null;
    }

    const columnMap = requestsData.columnMap;

    // Find the matching request row
    for (let i = 0; i < requestsData.data.length; i++) {
      const row = requestsData.data[i];
      const rowRequestId = getColumnValue(row, columnMap, CONFIG.columns.requests.id);

      if (String(rowRequestId).trim().toLowerCase() === String(requestId).trim().toLowerCase()) {
        return {
          requesterName: getColumnValue(row, columnMap, CONFIG.columns.requests.requesterName) || '',
          requesterContact: getColumnValue(row, columnMap, CONFIG.columns.requests.requesterContact) || '',
          requestType: getColumnValue(row, columnMap, CONFIG.columns.requests.type) || '',
          eventDate: getColumnValue(row, columnMap, CONFIG.columns.requests.eventDate) || '',
          date: getColumnValue(row, columnMap, CONFIG.columns.requests.date) || '',
          startTime: getColumnValue(row, columnMap, CONFIG.columns.requests.startTime) || '',
          endTime: getColumnValue(row, columnMap, CONFIG.columns.requests.endTime) || '',
          startLocation: getColumnValue(row, columnMap, CONFIG.columns.requests.startLocation) || '',
          endLocation: getColumnValue(row, columnMap, CONFIG.columns.requests.endLocation) || '',
          secondaryLocation: getColumnValue(row, columnMap, CONFIG.columns.requests.secondaryLocation) || '',
          ridersNeeded: getColumnValue(row, columnMap, CONFIG.columns.requests.ridersNeeded) || '',
          ridersAssigned: getColumnValue(row, columnMap, CONFIG.columns.requests.ridersAssigned) || '',
          requirements: getColumnValue(row, columnMap, CONFIG.columns.requests.requirements) || '',
          status: getColumnValue(row, columnMap, CONFIG.columns.requests.status) || '',
          notes: getColumnValue(row, columnMap, CONFIG.columns.requests.notes) || '',
          courtesy: getColumnValue(row, columnMap, CONFIG.columns.requests.courtesy) || 'No',
          lastUpdated: getColumnValue(row, columnMap, CONFIG.columns.requests.lastUpdated) || ''
        };
      }
    }

    return null;
  } catch (error) {
    logError('Error getting request details for notification:', error);
    return null;
  }
}

/**
 * Returns all assignments data structured for the notifications page.
 * @returns {Array<Object>} An array of assignment objects.
 */
function getAllAssignmentsForNotifications() {
  try {
    console.log('📋 Getting all assignments for notifications...');
    
    const assignmentsData = getAssignmentsData(); // This gets actual assignments
    
    if (!assignmentsData || !assignmentsData.data || assignmentsData.data.length === 0) {
      console.log('❌ No assignments data found');
      return [];
    }
    
    const columnMap = assignmentsData.columnMap;
    const assignments = [];
    
    // Get rider contact info once to avoid repeated lookups
    const ridersData = getRidersData();
    const riderMap = {};
    
    if (ridersData && ridersData.data.length > 0) {
      ridersData.data.forEach(riderRow => {
        const name = getColumnValue(riderRow, ridersData.columnMap, CONFIG.columns.riders.name);
        if (name) {
          riderMap[name] = {
            phone: getColumnValue(riderRow, ridersData.columnMap, CONFIG.columns.riders.phone) || 'N/A',
            email: getColumnValue(riderRow, ridersData.columnMap, CONFIG.columns.riders.email) || 'N/A',
            carrier: getColumnValue(riderRow, ridersData.columnMap, CONFIG.columns.riders.carrier) || 'N/A'
          };
        }
      });
    }
    
    // Process each assignment
    assignmentsData.data.forEach((row, index) => {
      try {
        const assignmentId = getColumnValue(row, columnMap, CONFIG.columns.assignments.id);
        const riderName = getColumnValue(row, columnMap, CONFIG.columns.assignments.riderName);
        const status = getColumnValue(row, columnMap, CONFIG.columns.assignments.status);
        
        // Skip assignments without proper data or completed/cancelled ones
        if (!assignmentId || !riderName || ['Completed', 'Cancelled', 'No Show'].includes(status)) {
          return;
        }
        
        const riderInfo = riderMap[riderName] || { phone: 'N/A', email: 'N/A', carrier: 'N/A' };
        
        // Determine notification status
        const smsSent = getColumnValue(row, columnMap, CONFIG.columns.assignments.smsSent);
        const emailSent = getColumnValue(row, columnMap, CONFIG.columns.assignments.emailSent);
        const notified = getColumnValue(row, columnMap, CONFIG.columns.assignments.notified);
        
        let notificationStatus = 'none';
        let lastNotified = null;
        
        if (smsSent instanceof Date && emailSent instanceof Date) {
          notificationStatus = 'both_sent';
          lastNotified = smsSent > emailSent ? smsSent.toISOString() : emailSent.toISOString();
        } else if (smsSent instanceof Date) {
          notificationStatus = 'sms_sent';
          lastNotified = smsSent.toISOString();
        } else if (emailSent instanceof Date) {
          notificationStatus = 'email_sent';
          lastNotified = emailSent.toISOString();
        } else if (notified instanceof Date) {
          notificationStatus = 'notified';
          lastNotified = notified.toISOString();
        }
        
        const assignment = {
          id: assignmentId, // Real assignment ID like ASG-0001
          requestId: getColumnValue(row, columnMap, CONFIG.columns.assignments.requestId) || 'Unknown',
          riderName: riderName,
          riderPhone: riderInfo.phone,
          riderEmail: riderInfo.email,
          riderCarrier: riderInfo.carrier,
          eventDate: formatDateForDisplay(getColumnValue(row, columnMap, CONFIG.columns.assignments.eventDate)) || 'No Date',
          startTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.assignments.startTime)) || 'No Time',
          endTime: formatTimeForDisplay(getColumnValue(row, columnMap, CONFIG.columns.assignments.endTime)) || '',
          startLocation: getColumnValue(row, columnMap, CONFIG.columns.assignments.startLocation) || 'Location TBD',
          endLocation: getColumnValue(row, columnMap, CONFIG.columns.assignments.endLocation) || '',
          notificationStatus: notificationStatus,
          lastNotified: lastNotified
        };
        
        assignments.push(assignment);
        
      } catch (rowError) {
        console.log(`⚠️ Error processing assignment row ${index}:`, rowError);
      }
    });
    
    console.log(`✅ Processed ${assignments.length} assignments for notifications`);
    return assignments;
    
  } catch (error) {
    logError('Error in getAllAssignmentsForNotifications:', error);
    return [];
  }
}


/**
 * Determines the simplified notification status for display.
 * @param {Array} assignmentRow The array representing a single assignment row.
 * @param {Object} columnMap The column mapping for the assignments sheet.
 * @returns {string} One of 'both_sent', 'sms_sent', 'email_sent', 'notified', 'pending', 'no_rider'.
 */
function determineNotificationStatus(assignmentRow, columnMap) {
  const smsSent = getColumnValue(assignmentRow, columnMap, CONFIG.columns.assignments.smsSent);
  const emailSent = getColumnValue(assignmentRow, columnMap, CONFIG.columns.assignments.emailSent);
  const notified = getColumnValue(assignmentRow, columnMap, CONFIG.columns.assignments.notified);
  const riderName = getColumnValue(assignmentRow, columnMap, CONFIG.columns.assignments.riderName);
  const status = getColumnValue(assignmentRow, columnMap, CONFIG.columns.assignments.status);

  // Check if smsSent or emailSent are Date objects (indicating sent)
  const isSmsSent = smsSent instanceof Date;
  const isEmailSent = emailSent instanceof Date;
  const isNotified = notified instanceof Date;

  if (isSmsSent && isEmailSent) {
    return 'both_sent';
  } else if (isSmsSent) {
    return 'sms_sent';
  } else if (isEmailSent) {
    return 'email_sent';
  } else if (isNotified) { // If "notified" is set but no specific SMS/Email stamp
    return 'notified';
  } else if (riderName && String(riderName).trim().length > 0 && status === 'Assigned') {
    return 'pending'; // Has a rider and status is assigned, but not notified
  } else {
    return 'no_rider'; // No rider or not an assigned status
  }
}

/**
 * Get notification statistics for notifications page.
 */
function getNotificationStats() {
  console.log('📊 Getting notification stats...');
  
  try {
    const assignmentsData = getAssignmentsData(); // Uses caching and formatting
    const assignments = assignmentsData.data; // Array of data rows
    const columnMap = assignmentsData.columnMap; // Map of headers to column indices

    if (!assignments || assignments.length === 0) {
      console.log('⚠️ No assignments data found');
      return {
        totalAssignments: 0,
        pendingNotifications: 0,
        unnotifiedAssigned: 0,
        smsToday: 0,
        emailToday: 0
      };
    }
    
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    let totalAssignments = 0;
    let pendingNotifications = 0;
    let unnotifiedAssigned = 0; // Specifically assigned but not notified
    let smsToday = 0;
    let emailToday = 0;
    
    assignments.forEach(row => {
      const assignmentStatus = getColumnValue(row, columnMap, CONFIG.columns.assignments.status);
      const riderName = getColumnValue(row, columnMap, CONFIG.columns.assignments.riderName);
      const notified = getColumnValue(row, columnMap, CONFIG.columns.assignments.notified);
      const smsSent = getColumnValue(row, columnMap, CONFIG.columns.assignments.smsSent);
      const emailSent = getColumnValue(row, columnMap, CONFIG.columns.assignments.emailSent);

      // Count total assignments (with a rider)
      if (riderName && String(riderName).trim().length > 0) {
        totalAssignments++;
      }

      // Check if rider is assigned and not yet notified
      const isAssigned = (assignmentStatus === 'Assigned' || assignmentStatus === 'Confirmed' || assignmentStatus === 'In Progress');
      const hasRider = (riderName && String(riderName).trim().length > 0);
      const isNotYetNotified = !(notified instanceof Date);

      if (hasRider && isAssigned && isNotYetNotified) {
        unnotifiedAssigned++;
      }
      
      // Legacy "pending notification" count logic (usually refers to any assigned needing notification)
      if (hasRider && isAssigned && !(notified instanceof Date) && !(smsSent instanceof Date) && !(emailSent instanceof Date)) {
          pendingNotifications++;
      }

      // Count SMS/Email sent today
      if (smsSent instanceof Date && smsSent >= todayStart && smsSent < tomorrowStart) {
        smsToday++;
      }
      if (emailSent instanceof Date && emailSent >= todayStart && emailSent < tomorrowStart) {
        emailToday++;
      }
    });
    
    return {
      totalAssignments: totalAssignments,
      pendingNotifications: pendingNotifications, // legacy
      unnotifiedAssigned: unnotifiedAssigned, // all assigned tasks which have no notification stamp
      smsToday: smsToday,
      emailToday: emailToday
    };
  } catch (error) {
    logError('Error getting notification stats:', error);
    return {
      totalAssignments: 0,
      pendingNotifications: 0,
      unnotifiedAssigned: 0,
      smsToday: 0,
      emailToday: 0
    };
  }
}

/**
 * Gets all assignments that are 'Assigned' and not yet notified.
 * @returns {Array<Array<any>>} Array of assignment rows.
 */
function getAssignmentsNeedingNotification() {
  try {
    const assignmentsData = getAssignmentsData();
    const notifiedCol = CONFIG.columns.assignments.notified;
    const smsSentCol = CONFIG.columns.assignments.smsSent;
    const emailSentCol = CONFIG.columns.assignments.emailSent;
    const statusCol = CONFIG.columns.assignments.status;
    const riderNameCol = CONFIG.columns.assignments.riderName;

    return assignmentsData.data.filter(row => {
      const riderName = getColumnValue(row, assignmentsData.columnMap, riderNameCol);
      const notified = getColumnValue(row, assignmentsData.columnMap, notifiedCol);
      const smsSent = getColumnValue(row, assignmentsData.columnMap, smsSentCol);
      const emailSent = getColumnValue(row, assignmentsData.columnMap, emailSentCol);
      const status = getColumnValue(row, assignmentsData.columnMap, statusCol);

      // Check if rider exists, status is assigned, and NO notification has been sent yet
      return (riderName && String(riderName).trim().length > 0) &&
             (status === 'Assigned') &&
             !(notified instanceof Date) && !(smsSent instanceof Date) && !(emailSent instanceof Date);

    });

  } catch (error) {
    logError('Error getting assignments needing notification', error);
    return [];
  }
}

/**
 * Marks a specific assignment as notified (either SMS or Email or Both).
 * @param {string} assignmentId The ID of the assignment to mark.
 * @param {string} notificationType The type of notification sent ('SMS' or 'Email').
 * @throws {Error} If marking as notified fails.
 */
function markAssignmentNotified(assignmentId, notificationType = 'SMS') {
  const now = new Date();

  try {
    const assignmentsData = getAssignmentsData(false);
    const sheet = assignmentsData.sheet;

    const idCol = CONFIG.columns.assignments.id;
    const notifiedCol = CONFIG.columns.assignments.notified;
    const smsCol = CONFIG.columns.assignments.smsSent;
    const emailCol = CONFIG.columns.assignments.emailSent;

    assignmentsData.data.forEach((row, index) => {
      const rowId = getColumnValue(row, assignmentsData.columnMap, idCol);

      if (rowId === assignmentId) {
        const rowNumber = index + 2;

        const notifiedColIndex = assignmentsData.columnMap[notifiedCol];
        if (notifiedColIndex !== undefined) {
          sheet.getRange(rowNumber, notifiedColIndex + 1).setValue(now);
        }

        if (notificationType === 'SMS' && assignmentsData.columnMap[smsCol] !== undefined) {
          sheet.getRange(rowNumber, assignmentsData.columnMap[smsCol] + 1).setValue(now);
        } else if (notificationType === 'Email' && assignmentsData.columnMap[emailCol] !== undefined) {
          sheet.getRange(rowNumber, assignmentsData.columnMap[emailCol] + 1).setValue(now);
        }

        logActivity(`Marked assignment ${assignmentId} as notified via ${notificationType}`);
        return;
      }
    });

  } catch (error) {
    logError('Error marking assignment as notified', error);
    throw error;
  }
}

// Add these functions to your Notifications.js file in Apps Script

/**
 * Enhanced notification statistics for the notifications page
 */
function getEnhancedNotificationStats() {
  try {
    console.log('📊 Getting enhanced notification stats...');
    
    // Get basic assignments data
    const assignmentsData = getAssignmentsData();
    if (!assignmentsData || !assignmentsData.data || assignmentsData.data.length === 0) {
      console.log('❌ No assignments data available');
      return {
        totalAssignments: 0,
        pendingNotifications: 0,
        smsToday: 0,
        emailToday: 0,
        assignments: []
      };
    }
    
    const columnMap = assignmentsData.columnMap;
    const assignments = assignmentsData.data;
    
    // Calculate stats
    let totalAssignments = 0;
    let pendingNotifications = 0;
    let smsToday = 0;
    let emailToday = 0;
    
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    assignments.forEach(row => {
      const riderName = getColumnValue(row, columnMap, CONFIG.columns.assignments.riderName);
      const status = getColumnValue(row, columnMap, CONFIG.columns.assignments.status);
      const smsSent = getColumnValue(row, columnMap, CONFIG.columns.assignments.smsSent);
      const emailSent = getColumnValue(row, columnMap, CONFIG.columns.assignments.emailSent);
      const notified = getColumnValue(row, columnMap, CONFIG.columns.assignments.notified);
      
      // Count assignments with riders
      if (riderName && String(riderName).trim().length > 0) {
        totalAssignments++;
        
        // Count pending notifications (assigned but not notified)
        if (status === 'Assigned' && !(notified instanceof Date) && !(smsSent instanceof Date) && !(emailSent instanceof Date)) {
          pendingNotifications++;
        }
        
        // Count today's SMS
        if (smsSent instanceof Date && smsSent >= todayStart && smsSent < tomorrowStart) {
          smsToday++;
        }
        
        // Count today's emails
        if (emailSent instanceof Date && emailSent >= todayStart && emailSent < tomorrowStart) {
          emailToday++;
        }
      }
    });
    
    // Get processed assignments for the notifications page
    const processedAssignments = getAllAssignmentsForNotifications();
    
    const stats = {
      totalAssignments: totalAssignments,
      pendingNotifications: pendingNotifications,
      smsToday: smsToday,
      emailToday: emailToday,
      assignments: processedAssignments // Include for auto-loading
    };
    
    console.log('✅ Enhanced notification stats calculated:', stats);
    return stats;
    
  } catch (error) {
    logError('Error getting enhanced notification stats:', error);
    console.error('Error in getEnhancedNotificationStats:', error);
    return {
      totalAssignments: 0,
      pendingNotifications: 0,
      smsToday: 0,
      emailToday: 0,
      assignments: []
    };
  }
}

/**
 * Send bulk notifications to selected assignment IDs
 */
function sendBulkNotificationsToSelected(assignmentIds, notificationType) {
  try {
    console.log(`📱 Sending bulk ${notificationType} to ${assignmentIds.length} assignments`);
    
    let successful = 0;
    let failed = 0;
    const errors = [];
    
    assignmentIds.forEach(assignmentId => {
      try {
        const result = sendAssignmentNotification(assignmentId, notificationType);
        if (result && result.success) {
          successful++;
        } else {
          failed++;
          errors.push(`${assignmentId}: ${result ? result.message : 'Unknown error'}`);
        }
        
        // Small delay between notifications
        Utilities.sleep(100);
        
      } catch (error) {
        failed++;
        errors.push(`${assignmentId}: ${error.message}`);
      }
    });
    
    const result = {
      success: true,
      successful: successful,
      failed: failed,
      errors: errors.slice(0, 10),
      message: `Bulk notification completed: ${successful} successful, ${failed} failed`
    };
    
    console.log('✅ Bulk notification result:', result);
    return result;
    
  } catch (error) {
    logError('Error in sendBulkNotificationsToSelected:', error);
    return {
      success: false,
      successful: 0,
      failed: assignmentIds.length,
      message: `Bulk notification failed: ${error.message}`
    };
  }
}

/**
 * Send bulk notifications by timeframe filter
 */
function sendBulkNotificationsByTimeframe(filter, type) {
  try {
    console.log(`📱 Sending bulk ${type} for filter: ${filter}`);
    
    // Get assignments based on filter
    const assignmentsData = getAssignmentsData();
    let targetAssignments = [];
    
    if (filter === 'all') {
      targetAssignments = assignmentsData.data.filter(row => {
        const riderName = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        const status = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.status);
        return riderName && !['Completed', 'Cancelled', 'No Show'].includes(status);
      });
    } else if (filter === 'pending') {
      targetAssignments = getAssignmentsNeedingNotification();
    } else if (filter === 'today') {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      
      targetAssignments = assignmentsData.data.filter(row => {
        const eventDate = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
        const riderName = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
        
        if (!riderName || !(eventDate instanceof Date)) return false;
        
        const assignmentDate = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        return assignmentDate >= todayStart && assignmentDate < tomorrowStart;
      });
    }
    
    if (targetAssignments.length === 0) {
      return {
        success: true,
        successful: 0,
        failed: 0,
        message: `No assignments found for filter: ${filter}`
      };
    }
    
    // Use the existing bulk processing function
    return processBulkNotifications(targetAssignments, type, `${filter} assignments`);
    
  } catch (error) {
    logError('Error in sendBulkNotificationsByTimeframe:', error);
    return {
      success: false,
      successful: 0,
      failed: 0,
      message: `Error: ${error.message}`
    };
  }
}



/**
 * Helper function to get today's assignments
 */
function getAssignmentsForToday() {
  const assignmentsData = getAssignmentsData();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  
  return assignmentsData.data.filter(row => {
    const eventDate = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.eventDate);
    if (!(eventDate instanceof Date)) return false;
    
    const assignmentDate = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    return assignmentDate >= today && assignmentDate < tomorrow;
  });
}

/**
 * Helper function to convert assignment object back to row format for bulk processing
 */
function convertAssignmentToRow(assignment) {
  // This is a simplified conversion - you might need to adjust based on your data structure
  const assignmentsData = getAssignmentsData();
  const columnMap = assignmentsData.columnMap;
  
  // Find the actual row in the assignments data
  return assignmentsData.data.find(row => 
    getColumnValue(row, columnMap, CONFIG.columns.assignments.id) === assignment.id
  );
}
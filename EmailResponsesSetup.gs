/**
 * Ensure the Email_Responses sheet exists with the correct headers.
 * Run this once to create the sheet manually if needed.
 */
function setupEmailResponsesSheet() {
  getOrCreateSheet('Email_Responses', [
    'Timestamp',
    'From Email',
    'Rider Name',
    'Message Body',
    'Request ID',
    'Action'
  ]);
}

/**
 * Set up email response tracking system with automatic triggers.
 * This function creates the necessary sheet and sets up a time-driven trigger
 * to automatically process email responses every 5 minutes.
 */
function setupEmailResponseTracking() {
  try {
    console.log('🚀 Setting up email response tracking system...');
    
    // 1. Create the Email_Responses sheet if it doesn't exist
    setupEmailResponsesSheet();
    console.log('✅ Email_Responses sheet created/verified');
    
    // 2. Delete any existing email processing triggers to avoid duplicates
    deleteEmailResponseTriggers();
    
    // 3. Create a new time-driven trigger to process emails every 5 minutes
    const trigger = ScriptApp.newTrigger('processEmailResponses')
      .timeBased()
      .everyMinutes(5)
      .create();
    
    console.log('✅ Email response processing trigger created (every 5 minutes)');
    console.log('📧 Trigger ID:', trigger.getUniqueId());
    
    // 4. Test the system by running it once
    console.log('🧪 Testing email response processing...');
    processEmailResponses();
    console.log('✅ Email response tracking system setup complete!');
    
    return {
      success: true,
      message: 'Email response tracking system setup successfully',
      triggerId: trigger.getUniqueId()
    };
    
  } catch (error) {
    console.error('❌ Error setting up email response tracking:', error);
    logError('Error setting up email response tracking', error);
    return {
      success: false,
      message: 'Failed to setup email response tracking: ' + error.message
    };
  }
}

/**
 * Delete all existing email response processing triggers to avoid duplicates.
 */
function deleteEmailResponseTriggers() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    let deletedCount = 0;
    
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'processEmailResponses') {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
        console.log('🗑️ Deleted existing trigger:', trigger.getUniqueId());
      }
    });
    
    console.log(`✅ Cleaned up ${deletedCount} existing email response triggers`);
    return deletedCount;
    
  } catch (error) {
    console.error('❌ Error deleting email response triggers:', error);
    logError('Error deleting email response triggers', error);
    return 0;
  }
}

/**
 * Check the status of email response tracking system.
 * Returns information about triggers, sheet existence, and recent activity.
 */
function checkEmailResponseTrackingStatus() {
  try {
    const status = {
      sheetExists: false,
      triggerExists: false,
      triggerCount: 0,
      triggers: [],
      recentResponses: 0,
      lastActivity: null
    };
    
    // Check if Email_Responses sheet exists
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Email_Responses');
    status.sheetExists = !!sheet;
    
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      status.recentResponses = Math.max(0, data.length - 1); // Exclude header
      if (data.length > 1) {
        status.lastActivity = data[data.length - 1][0]; // Last timestamp
      }
    }
    
    // Check for active triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'processEmailResponses') {
        status.triggerExists = true;
        status.triggerCount++;
        status.triggers.push({
          id: trigger.getUniqueId(),
          type: trigger.getTriggerSource().toString(),
          frequency: trigger.getTriggerSource() === ScriptApp.TriggerSource.CLOCK ? 'Time-driven' : 'Unknown'
        });
      }
    });
    
    console.log('📊 Email Response Tracking Status:', JSON.stringify(status, null, 2));
    return status;
    
  } catch (error) {
    console.error('❌ Error checking email response tracking status:', error);
    logError('Error checking email response tracking status', error);
    return { error: error.message };
  }
}

/**
 * Manual function to process email responses immediately.
 * Useful for testing or one-time processing.
 */
function processEmailResponsesManually() {
  try {
    console.log('🔧 Manually processing email responses...');
    processEmailResponses();
    console.log('✅ Manual email response processing complete');
    
    // Show recent results
    const responses = getEmailResponses(10);
    console.log(`📊 Recent responses processed: ${responses.length}`);
    
    return {
      success: true,
      message: 'Email responses processed manually',
      recentCount: responses.length
    };
    
  } catch (error) {
    console.error('❌ Error in manual email processing:', error);
    logError('Error in manual email processing', error);
    return {
      success: false,
      message: 'Failed to process emails manually: ' + error.message
    };
  }
}
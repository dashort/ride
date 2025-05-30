function debugLogToSheet(message, details = '') {
  if (isDebugLoggingInProgress) {
    console.warn(`[WARNING] Recursive call to debugLogToSheet prevented. Message: ${message}`);
    return;
  }

  isDebugLoggingInProgress = true;
  try {
    const debugLogSheet = getOrCreateSheet(CONFIG.sheets.log, ['Timestamp', 'Type', 'Message', 'Details']);
    if (debugLogSheet) {
      const rowData = [new Date(), 'DEBUG', message, details];
      console.log(`[DEBUG] Attempting to append to ${CONFIG.sheets.log} sheet. Data: ${JSON.stringify(rowData)}`);
      debugLogSheet.appendRow(rowData);
    } else {
      console.error(`ERROR: Log sheet '${CONFIG.sheets.log}' is null, cannot write debug log. Fallback DEBUG LOG: ${message} - ${details}`);
    }
  } catch (e) {
    console.error(`ERROR WRITING TO DEBUG_LOG SHEET (caught within itself): ${message} - ${details}. Actual error: ${e.message}`);
  } finally {
    isDebugLoggingInProgress = false;
  }
}
// ===== ERROR HANDLING & LOGGING =====

/**
 * Log activity to system log
 * @param {string} message The log message.
 * @param {string} [details=''] Additional details.
 */
function logActivity(message, details = '') {
  console.log(`[ACTIVITY] ${message}`, details);

  try {
    const logSheet = getOrCreateSheet(CONFIG.sheets.log, ['Timestamp', 'Type', 'Message', 'Details']);
    logSheet.appendRow([new Date(), 'INFO', message, details]);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

/**
 * Log error to system log
 * @param {string} message The error message.
 * @param {Error|null} [error=null] The error object.
 */
function logError(message, error = null) {
  const errorDetails = error ? error.toString() + (error.stack ? '\n' + error.stack : '') : '';
  console.error(`[ERROR] ${message}`, errorDetails);

  try {
    const logSheet = getOrCreateSheet(CONFIG.sheets.log, ['Timestamp', 'Type', 'Message', 'Details']);
    logSheet.appendRow([new Date(), 'ERROR', message, errorDetails]);
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
}
/**
 * @fileoverview
 * Security Audit and Logging Module for Motorcycle Escort Management System
 * Provides comprehensive security event tracking, monitoring, and alerting.
 */

/**
 * Security event types for categorization
 */
const SECURITY_EVENT_TYPES = {
  AUTHENTICATION: {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILED: 'LOGIN_FAILED',
    LOGOUT: 'LOGOUT',
    SESSION_CREATED: 'SESSION_CREATED',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    SESSION_HIJACK_ATTEMPT: 'SESSION_HIJACK_ATTEMPT'
  },
  AUTHORIZATION: {
    ACCESS_GRANTED: 'ACCESS_GRANTED',
    ACCESS_DENIED: 'ACCESS_DENIED',
    PRIVILEGE_ESCALATION_ATTEMPT: 'PRIVILEGE_ESCALATION_ATTEMPT',
    UNAUTHORIZED_RESOURCE_ACCESS: 'UNAUTHORIZED_RESOURCE_ACCESS'
  },
  SECURITY_CONTROLS: {
    RATE_LIMIT_TRIGGERED: 'RATE_LIMIT_TRIGGERED',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    SECURITY_POLICY_VIOLATION: 'SECURITY_POLICY_VIOLATION'
  },
  DATA_ACCESS: {
    SENSITIVE_DATA_ACCESS: 'SENSITIVE_DATA_ACCESS',
    DATA_EXPORT: 'DATA_EXPORT',
    BULK_DATA_ACCESS: 'BULK_DATA_ACCESS',
    UNAUTHORIZED_DATA_ATTEMPT: 'UNAUTHORIZED_DATA_ATTEMPT'
  },
  SYSTEM: {
    SYSTEM_ERROR: 'SYSTEM_ERROR',
    CONFIGURATION_CHANGE: 'CONFIGURATION_CHANGE',
    SECURITY_SCAN: 'SECURITY_SCAN',
    MAINTENANCE_MODE: 'MAINTENANCE_MODE'
  },
  SUSPICIOUS: {
    UNUSUAL_LOGIN_PATTERN: 'UNUSUAL_LOGIN_PATTERN',
    MULTIPLE_FAILED_ATTEMPTS: 'MULTIPLE_FAILED_ATTEMPTS',
    UNUSUAL_DATA_ACCESS: 'UNUSUAL_DATA_ACCESS',
    POTENTIAL_ATTACK: 'POTENTIAL_ATTACK'
  }
};

/**
 * Security alert levels
 */
const SECURITY_ALERT_LEVELS = {
  INFO: 'INFO',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

/**
 * Main security event logging function
 */
function logSecurityEvent(eventType, details = {}, alertLevel = SECURITY_ALERT_LEVELS.INFO) {
  try {
    // Don't log if security logging is disabled
    if (!SECURITY_CONFIG.logSecurityEvents) {
      return;
    }
    
    const timestamp = new Date();
    const logEntry = {
      timestamp: timestamp.toISOString(),
      eventType: eventType,
      alertLevel: alertLevel,
      details: sanitizeLogDetails(details),
      sessionInfo: getCurrentSessionInfoSafe(),
      systemInfo: getSystemInfoSafe()
    };
    
    // Log to console for immediate visibility
    debugLog(`🔒 SECURITY EVENT [${alertLevel}]: ${eventType}`, logEntry);
    
    // Log to spreadsheet for persistence
    persistSecurityLog(logEntry);
    
    // Handle alerts for high-priority events
    if (shouldAlert(eventType, alertLevel)) {
      handleSecurityAlert(logEntry);
    }
    
    // Update security metrics
    updateSecurityMetrics(eventType, alertLevel);
    
  } catch (error) {
    console.error('❌ Security logging error:', error);
    // Fallback logging to prevent infinite recursion
    debugLog(`🔒 SECURITY EVENT (FALLBACK): ${eventType} - ${JSON.stringify(details)}`);
  }
}

/**
 * Sanitize log details to prevent sensitive data leakage
 */
function sanitizeLogDetails(details) {
  if (!details || typeof details !== 'object') {
    return details;
  }
  
  const sanitized = { ...details };
  
  // Remove or mask sensitive fields
  const sensitiveFields = ['password', 'token', 'session', 'credential', 'secret'];
  
  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    }
    
    // Mask email addresses partially
    if (key === 'email' && typeof sanitized[key] === 'string') {
      const email = sanitized[key];
      const parts = email.split('@');
      if (parts.length === 2) {
        const username = parts[0];
        const domain = parts[1];
        sanitized[key] = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1) + '@' + domain;
      }
    }
  });
  
  return sanitized;
}

/**
 * Get current session information safely
 */
function getCurrentSessionInfoSafe() {
  try {
    const sessionValidation = validateSecureSession();
    if (sessionValidation.valid) {
      return {
        sessionId: sessionValidation.session.id,
        userEmail: sessionValidation.session.email,
        userRole: sessionValidation.session.role,
        sessionAge: Date.now() - sessionValidation.session.created
      };
    }
  } catch (error) {
    // Silently fail to avoid logging loops
  }
  
  return {
    sessionId: 'none',
    userEmail: 'unknown',
    userRole: 'unknown',
    sessionAge: 0
  };
}

/**
 * Get system information safely
 */
function getSystemInfoSafe() {
  try {
    return {
      timestamp: Date.now(),
      timezone: Session.getScriptTimeZone(),
      executionTime: new Date().getTime(),
      // Add more system info as needed
    };
  } catch (error) {
    return {
      timestamp: Date.now(),
      timezone: 'unknown',
      executionTime: Date.now()
    };
  }
}

/**
 * Persist security log to spreadsheet
 */
function persistSecurityLog(logEntry) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName('Security_Log');
    
    // Create security log sheet if it doesn't exist
    if (!logSheet) {
      logSheet = ss.insertSheet('Security_Log');
      
      // Set up headers
      const headers = [
        'Timestamp',
        'Event Type',
        'Alert Level',
        'User Email',
        'User Role',
        'Session ID',
        'Details',
        'System Info'
      ];
      
      logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format header row
      const headerRange = logSheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      
      // Freeze header row
      logSheet.setFrozenRows(1);
    }
    
    // Prepare row data
    const rowData = [
      logEntry.timestamp,
      logEntry.eventType,
      logEntry.alertLevel,
      logEntry.sessionInfo.userEmail,
      logEntry.sessionInfo.userRole,
      logEntry.sessionInfo.sessionId,
      JSON.stringify(logEntry.details),
      JSON.stringify(logEntry.systemInfo)
    ];
    
    // Append the log entry
    logSheet.appendRow(rowData);
    
    // Auto-resize columns periodically
    if (logSheet.getLastRow() % 100 === 0) {
      logSheet.autoResizeColumns(1, 8);
    }
    
    // Archive old logs if sheet gets too large
    if (logSheet.getLastRow() > 10000) {
      archiveOldSecurityLogs(logSheet);
    }
    
  } catch (error) {
    console.error('❌ Failed to persist security log:', error);
  }
}

/**
 * Archive old security logs to keep sheet manageable
 */
function archiveOldSecurityLogs(logSheet) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep 90 days
    
    const data = logSheet.getDataRange().getValues();
    const headers = data[0];
    const recentData = [headers];
    
    // Filter recent data
    for (let i = 1; i < data.length; i++) {
      const rowDate = new Date(data[i][0]); // Timestamp column
      if (rowDate >= cutoffDate) {
        recentData.push(data[i]);
      }
    }
    
    // Create archive sheet
    const archiveSheetName = `Security_Log_Archive_${new Date().toISOString().split('T')[0]}`;
    const archiveSheet = ss.insertSheet(archiveSheetName);
    
    // Move old data to archive
    if (data.length > recentData.length) {
      const archivedData = data.slice(recentData.length);
      archiveSheet.getRange(1, 1, archivedData.length, headers.length)
        .setValues([headers, ...archivedData]);
    }
    
    // Replace current sheet with recent data
    logSheet.clear();
    logSheet.getRange(1, 1, recentData.length, headers.length)
      .setValues(recentData);
    
    debugLog(`📚 Archived ${data.length - recentData.length} old security log entries`);
    
  } catch (error) {
    console.error('❌ Failed to archive security logs:', error);
  }
}

/**
 * Determine if an event should trigger an alert
 */
function shouldAlert(eventType, alertLevel) {
  if (!SECURITY_CONFIG.alertOnSuspiciousActivity) {
    return false;
  }
  
  // Always alert on critical events
  if (alertLevel === SECURITY_ALERT_LEVELS.CRITICAL) {
    return true;
  }
  
  // Alert on high-priority events
  if (alertLevel === SECURITY_ALERT_LEVELS.HIGH) {
    return true;
  }
  
  // Alert on specific suspicious events
  const suspiciousEvents = [
    'ACCOUNT_LOCKED',
    'MULTIPLE_FAILED_ATTEMPTS',
    'UNAUTHORIZED_ACCESS_ATTEMPT',
    'SESSION_HIJACK_ATTEMPT',
    'PRIVILEGE_ESCALATION_ATTEMPT'
  ];
  
  return suspiciousEvents.includes(eventType);
}

/**
 * Handle security alerts
 */
function handleSecurityAlert(logEntry) {
  try {
    debugLog(`🚨 SECURITY ALERT [${logEntry.alertLevel}]: ${logEntry.eventType}`);
    
    // Send email alert to administrators
    sendSecurityAlertEmail(logEntry);
    
    // Log the alert action
    debugLog(`📧 Security alert sent for event: ${logEntry.eventType}`);
    
  } catch (error) {
    console.error('❌ Failed to handle security alert:', error);
  }
}

/**
 * Send security alert email to administrators
 */
function sendSecurityAlertEmail(logEntry) {
  try {
    const adminEmails = getAdminUsersSafe();
    if (!adminEmails || adminEmails.length === 0) {
      debugLog('⚠️ No admin emails configured for security alerts');
      return;
    }
    
    const subject = `🚨 Security Alert: ${logEntry.eventType}`;
    const body = createSecurityAlertEmailBody(logEntry);
    
    // Send to each admin
    adminEmails.forEach(email => {
      try {
        MailApp.sendEmail({
          to: email,
          subject: subject,
          htmlBody: body
        });
      } catch (emailError) {
        console.error(`❌ Failed to send alert to ${email}:`, emailError);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to send security alert emails:', error);
  }
}

/**
 * Create HTML email body for security alerts
 */
function createSecurityAlertEmailBody(logEntry) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
        <h1>🚨 Security Alert</h1>
      </div>
      
      <div style="padding: 20px; background: #f8f9fa;">
        <h2>Alert Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Event Type:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${logEntry.eventType}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Alert Level:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <span style="background: ${getAlertLevelColor(logEntry.alertLevel)}; color: white; padding: 2px 8px; border-radius: 4px;">
                ${logEntry.alertLevel}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Timestamp:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${logEntry.timestamp}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">User:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${logEntry.sessionInfo.userEmail} (${logEntry.sessionInfo.userRole})</td>
          </tr>
        </table>
        
        <h3>Event Details</h3>
        <pre style="background: #f8f9fa; padding: 10px; border-left: 4px solid #007bff; overflow-x: auto;">
${JSON.stringify(logEntry.details, null, 2)}
        </pre>
        
        <div style="margin-top: 20px; text-align: center;">
          <a href="${getWebAppUrlSafe()}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            View Application
          </a>
        </div>
      </div>
      
      <div style="background: #e9ecef; padding: 10px; text-align: center; font-size: 12px; color: #6c757d;">
        This is an automated security alert from the Motorcycle Escort Management System.
      </div>
    </div>
  `;
}

/**
 * Get color for alert level
 */
function getAlertLevelColor(alertLevel) {
  switch (alertLevel) {
    case SECURITY_ALERT_LEVELS.CRITICAL: return '#dc3545';
    case SECURITY_ALERT_LEVELS.HIGH: return '#fd7e14';
    case SECURITY_ALERT_LEVELS.MEDIUM: return '#ffc107';
    case SECURITY_ALERT_LEVELS.LOW: return '#28a745';
    default: return '#6c757d';
  }
}

/**
 * Update security metrics
 */
function updateSecurityMetrics(eventType, alertLevel) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const today = new Date().toISOString().split('T')[0];
    
    // Update daily metrics
    const dailyKey = `security_metrics_${today}`;
    const dailyMetrics = JSON.parse(properties.getProperty(dailyKey) || '{}');
    
    if (!dailyMetrics[eventType]) {
      dailyMetrics[eventType] = 0;
    }
    dailyMetrics[eventType]++;
    
    if (!dailyMetrics.alertLevels) {
      dailyMetrics.alertLevels = {};
    }
    if (!dailyMetrics.alertLevels[alertLevel]) {
      dailyMetrics.alertLevels[alertLevel] = 0;
    }
    dailyMetrics.alertLevels[alertLevel]++;
    
    properties.setProperty(dailyKey, JSON.stringify(dailyMetrics));
    
    // Clean up old metrics (keep 30 days)
    cleanupOldMetrics();
    
  } catch (error) {
    console.error('❌ Failed to update security metrics:', error);
  }
}

/**
 * Get security metrics for a date range
 */
function getSecurityMetrics(daysBack = 7) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const metrics = {};
    
    for (let i = 0; i < daysBack; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const dailyKey = `security_metrics_${dateKey}`;
      
      const dailyMetrics = JSON.parse(properties.getProperty(dailyKey) || '{}');
      metrics[dateKey] = dailyMetrics;
    }
    
    return metrics;
  } catch (error) {
    console.error('❌ Failed to get security metrics:', error);
    return {};
  }
}

/**
 * Clean up old security metrics
 */
function cleanupOldMetrics() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    const allProperties = properties.getProperties();
    Object.keys(allProperties).forEach(key => {
      if (key.startsWith('security_metrics_')) {
        const dateStr = key.replace('security_metrics_', '');
        const metricDate = new Date(dateStr);
        
        if (metricDate < cutoffDate) {
          properties.deleteProperty(key);
        }
      }
    });
  } catch (error) {
    console.error('❌ Failed to cleanup old metrics:', error);
  }
}

/**
 * Generate security report
 */
function generateSecurityReport(daysBack = 30) {
  try {
    const metrics = getSecurityMetrics(daysBack);
    const report = {
      generatedAt: new Date().toISOString(),
      period: `${daysBack} days`,
      summary: {},
      dailyBreakdown: metrics,
      recommendations: []
    };
    
    // Calculate summary statistics
    const allEvents = {};
    const allAlertLevels = {};
    
    Object.values(metrics).forEach(daily => {
      Object.keys(daily).forEach(eventType => {
        if (eventType !== 'alertLevels') {
          allEvents[eventType] = (allEvents[eventType] || 0) + daily[eventType];
        }
      });
      
      if (daily.alertLevels) {
        Object.keys(daily.alertLevels).forEach(level => {
          allAlertLevels[level] = (allAlertLevels[level] || 0) + daily.alertLevels[level];
        });
      }
    });
    
    report.summary.totalEvents = Object.values(allEvents).reduce((sum, count) => sum + count, 0);
    report.summary.eventTypes = allEvents;
    report.summary.alertLevels = allAlertLevels;
    
    // Generate recommendations
    if (allEvents.FAILED_LOGIN_ATTEMPT > 10) {
      report.recommendations.push('High number of failed login attempts detected. Consider reviewing user access.');
    }
    
    if (allAlertLevels.HIGH > 5) {
      report.recommendations.push('Multiple high-severity security events. Consider security review.');
    }
    
    if (report.summary.totalEvents === 0) {
      report.recommendations.push('No security events recorded. Verify logging is working correctly.');
    }
    
    return report;
  } catch (error) {
    console.error('❌ Failed to generate security report:', error);
    return null;
  }
}

/**
 * Export security logs to CSV format
 */
function exportSecurityLogs(daysBack = 30) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName('Security_Log');
    
    if (!logSheet) {
      return { success: false, message: 'No security log sheet found' };
    }
    
    const data = logSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: false, message: 'No security log data found' };
    }
    
    // Filter by date if specified
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    const headers = data[0];
    const filteredData = [headers];
    
    for (let i = 1; i < data.length; i++) {
      const rowDate = new Date(data[i][0]);
      if (rowDate >= cutoffDate) {
        filteredData.push(data[i]);
      }
    }
    
    // Convert to CSV format
    const csvContent = filteredData.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    return {
      success: true,
      data: csvContent,
      filename: `security_logs_${new Date().toISOString().split('T')[0]}.csv`,
      recordCount: filteredData.length - 1
    };
    
  } catch (error) {
    console.error('❌ Failed to export security logs:', error);
    return { success: false, message: 'Export failed: ' + error.message };
  }
}

/**
 * Test security audit functions
 */
function testSecurityAudit() {
  debugLog('🔍 Testing Security Audit Functions...');
  
  // Test different types of security events
  logSecurityEvent('TEST_EVENT', { testData: 'sample' }, SECURITY_ALERT_LEVELS.INFO);
  logSecurityEvent('FAILED_LOGIN_ATTEMPT', { email: 'test@example.com' }, SECURITY_ALERT_LEVELS.MEDIUM);
  logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', { resource: 'admin_panel' }, SECURITY_ALERT_LEVELS.HIGH);
  
  // Test metrics
  const metrics = getSecurityMetrics(7);
  debugLog('Security metrics (7 days):', metrics);
  
  // Test report generation
  const report = generateSecurityReport(7);
  debugLog('Security report:', report);
  
  debugLog('🔍 Security audit testing completed.');
}
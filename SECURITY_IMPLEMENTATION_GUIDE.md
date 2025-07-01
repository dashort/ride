# Security Implementation Guide
## Google Apps Script Authentication & Security

This guide walks you through implementing the enhanced security features for your Motorcycle Escort Management System.

---

## Phase 1: Immediate Security Deployment

### Step 1: Deploy Security Modules

1. **Upload New Security Files**:
   - Copy `EnhancedSecurity.gs` to your Apps Script project
   - Copy `SecurityAudit.gs` to your Apps Script project
   - Replace the existing `login.html` with the enhanced version

2. **Update Existing Files**:
   - The `HybridAuth.gs` file has been updated to use secure functions when available
   - No changes needed to existing `Code.gs` or `AccessControl.gs` at this time

3. **Configure Security Settings**:
   ```javascript
   // In EnhancedSecurity.gs, adjust these settings as needed:
   const SECURITY_CONFIG = {
     maxFailedAttempts: 5,        // Adjust lockout threshold
     lockoutDuration: 30 * 60 * 1000, // 30 minutes
     sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
     maxLoginAttemptsPerHour: 10, // Rate limiting
     logSecurityEvents: true,     // Enable security logging
     alertOnSuspiciousActivity: true // Enable email alerts
   };
   ```

### Step 2: Set Up User Management Sheet

1. **Create Users Sheet** (if not exists):
   ```
   Column A: email
   Column B: hashedPassword  
   Column C: role (admin, dispatcher, rider)
   Column D: status (active, inactive, pending)
   Column E: name
   Column F: createdDate
   Column G: lastLogin
   ```

2. **Add Test Users**:
   ```javascript
   // Run this function to hash passwords for the Users sheet:
   function generateHashedPassword() {
     const password = "YourStrongPassword123!";
     const hash = hashPassword(password);
     console.log("Hashed password:", hash);
     // Copy this hash to the hashedPassword column
   }
   ```

3. **Sample Users Sheet Data**:
   ```
   email                 | hashedPassword        | role       | status | name
   admin@yourdomain.com  | [generated hash]      | admin      | active | Admin User
   dispatch@yourdomain.com| [generated hash]     | dispatcher | active | Dispatcher
   rider@yourdomain.com  | [generated hash]      | rider      | active | Test Rider
   ```

### Step 3: Test Security Functions

1. **Run Security Tests**:
   ```javascript
   // In Apps Script editor, run these functions:
   testSecurityFunctions();
   testSecurityAudit();
   ```

2. **Test Login Flow**:
   - Deploy the web app
   - Test both Google OAuth and credential-based login
   - Verify rate limiting by attempting multiple failed logins
   - Check security log sheet is created and populated

---

## Phase 2: Advanced Configuration

### Step 1: Configure Email Alerts

1. **Set Admin Emails** in your Settings sheet or update the `getAdminUsersSafe()` function:
   ```javascript
   function getAdminUsersSafe() {
     // Update with your admin emails
     return [
       'admin@yourdomain.com',
       'security@yourdomain.com'
     ];
   }
   ```

2. **Test Security Alerts**:
   ```javascript
   // Trigger a test security alert
   logSecurityEvent('TEST_SECURITY_ALERT', 
     { message: 'Testing security alert system' }, 
     SECURITY_ALERT_LEVELS.HIGH
   );
   ```

### Step 2: Customize Password Requirements

Update password requirements in `EnhancedSecurity.gs`:
```javascript
const SECURITY_CONFIG = {
  // Adjust these based on your organization's policy
  minPasswordLength: 12,         // Minimum length
  requireUppercase: true,        // Require A-Z
  requireLowercase: true,        // Require a-z  
  requireNumbers: true,          // Require 0-9
  requireSpecialChars: true,     // Require !@#$%^&*
};
```

### Step 3: Set Up Security Monitoring

1. **Security Dashboard**: Access via `?page=user-management` (admin only)

2. **Regular Security Reports**:
   ```javascript
   // Set up a trigger to run weekly
   function weeklySecurityReport() {
     const report = generateSecurityReport(7);
     console.log('Weekly Security Report:', report);
     
     // Optionally email the report to admins
     if (report && report.summary.totalEvents > 0) {
       // Email logic here
     }
   }
   ```

3. **Export Security Logs**:
   ```javascript
   function exportRecentSecurityLogs() {
     const export = exportSecurityLogs(30); // Last 30 days
     console.log('Export result:', export);
   }
   ```

---

## Phase 3: Production Deployment

### Step 1: Web App Deployment

1. **Deploy Settings**:
   - **Execute as**: "User accessing the web app"
   - **Who has access**: "Anyone" 
   - **Note**: Security is handled by the authentication system

2. **URL Configuration**:
   ```javascript
   // Update getWebAppUrlSafe() function if needed
   function getWebAppUrlSafe() {
     try {
       return ScriptApp.getService().getUrl();
     } catch (error) {
       // Fallback for development
       return 'YOUR_DEPLOYED_WEB_APP_URL';
     }
   }
   ```

### Step 2: Access Control Verification

1. **Test Role-Based Access**:
   ```javascript
   // Run the test suite
   runAuthTestSuite();
   ```

2. **Verify Page Access**:
   - Admin users: Can access all pages
   - Dispatcher users: Limited to operational pages
   - Rider users: Only their own data

### Step 3: Security Hardening

1. **Review Permissions**: 
   - Ensure the Apps Script project has minimal required scopes
   - Remove any unused OAuth scopes from `appsscript.json`

2. **Audit User Access**:
   ```javascript
   function auditUserAccess() {
     // Review all users in the system
     const users = getAllUsers(); // Implement this based on your user storage
     users.forEach(user => {
       console.log(`User: ${user.email}, Role: ${user.role}, Status: ${user.status}`);
     });
   }
   ```

---

## Testing Checklist

### Security Features Testing

- [ ] **Password Validation**
  - [ ] Minimum length enforcement (12 characters)
  - [ ] Character requirement validation
  - [ ] Common password detection
  - [ ] Sequential character detection

- [ ] **Rate Limiting**
  - [ ] Login attempt rate limiting (10/hour)
  - [ ] Account lockout after 5 failed attempts
  - [ ] 30-minute lockout duration
  - [ ] Automatic unlock after timeout

- [ ] **Session Security**
  - [ ] Session creation with UUID
  - [ ] Session expiration (8 hours)
  - [ ] Session validation on each request
  - [ ] Secure session cleanup on logout

- [ ] **Authentication Methods**
  - [ ] Google OAuth login
  - [ ] Spreadsheet credential login
  - [ ] Fallback authentication handling
  - [ ] Invalid credential handling

### Access Control Testing

- [ ] **Role-Based Access**
  - [ ] Admin access to all features
  - [ ] Dispatcher limited access
  - [ ] Rider restricted to own data
  - [ ] Unauthorized access blocking

- [ ] **Page Access Control**
  - [ ] Admin-only pages (user-management, auth-setup)
  - [ ] Role-appropriate navigation
  - [ ] Unauthorized page redirects

### Security Monitoring Testing

- [ ] **Audit Logging**
  - [ ] Security events logged to spreadsheet
  - [ ] Log data sanitization
  - [ ] Log retention and archiving
  - [ ] Export functionality

- [ ] **Alert System**
  - [ ] High-severity event alerts
  - [ ] Email notifications to admins
  - [ ] Alert escalation thresholds

---

## Troubleshooting

### Common Issues

1. **"Function not found" errors**:
   - Ensure all `.gs` files are uploaded to your project
   - Check function names match exactly

2. **Security logging not working**:
   - Verify `SECURITY_CONFIG.logSecurityEvents = true`
   - Check if Security_Log sheet is created

3. **Email alerts not sending**:
   - Verify admin email addresses in `getAdminUsersSafe()`
   - Check Gmail API permissions

4. **Rate limiting too strict**:
   - Adjust `SECURITY_CONFIG.maxLoginAttemptsPerHour`
   - Modify `lockoutDuration` as needed

### Debug Functions

```javascript
// Test authentication flow
function debugAuthentication() {
  console.log('Testing authentication...');
  
  // Test session validation
  const session = validateSecureSession();
  console.log('Session validation:', session);
  
  // Test rate limiting
  const isLimited = isRateLimited('test@example.com', 'login');
  console.log('Rate limited:', isLimited);
  
  // Test security logging
  logSecurityEvent('DEBUG_TEST', { message: 'Debug test' });
}

// Clear all security data (use carefully!)
function clearSecurityData() {
  const properties = PropertiesService.getScriptProperties();
  const userProperties = PropertiesService.getUserProperties();
  
  // Clear rate limiting
  const allProps = properties.getProperties();
  Object.keys(allProps).forEach(key => {
    if (key.startsWith('rate_limit_') || key.startsWith('failed_attempts_') || key.startsWith('locked_until_')) {
      properties.deleteProperty(key);
    }
  });
  
  // Clear sessions
  userProperties.deleteProperty('SECURE_SESSION');
  userProperties.deleteProperty('CUSTOM_SESSION');
  
  console.log('Security data cleared');
}
```

---

## Security Maintenance

### Daily Tasks
- Review security log for unusual activity
- Monitor failed login attempts
- Check for locked accounts

### Weekly Tasks  
- Generate security report
- Review user access levels
- Update security metrics

### Monthly Tasks
- Audit user accounts
- Review and update password policies
- Security training for users

### Quarterly Tasks
- Full security assessment
- Update security documentation
- Review and test incident response procedures

---

## Next Steps

After implementing this security system:

1. **Monitor for 1-2 weeks** to ensure stability
2. **Adjust security settings** based on usage patterns
3. **Train users** on new security features
4. **Plan Phase 2 enhancements**:
   - Two-factor authentication
   - Advanced threat detection
   - Single sign-on integration
   - Data encryption at rest

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review security logs for error details
3. Test with debug functions
4. Consider adjusting security configuration based on your organization's needs

Remember: Security is an ongoing process, not a one-time setup. Regular monitoring and updates are essential for maintaining a secure system.
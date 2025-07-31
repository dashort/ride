/**
 * @fileoverview
 * Enhanced Security Module for Motorcycle Escort Management System
 * Implements comprehensive security measures including rate limiting, 
 * account lockout, session security, and audit logging.
 */

// Security Configuration
const SECURITY_CONFIG = {
  // Authentication settings
  maxFailedAttempts: 5,
  lockoutDuration: 30 * 60 * 1000, // 30 minutes
  sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
  
  // Rate limiting
  maxLoginAttemptsPerHour: 10,
  maxApiCallsPerMinute: 60,
  
  // Password requirements
  minPasswordLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  
  // Security logging
  logSecurityEvents: true,
  alertOnSuspiciousActivity: true
};

/**
 * Enhanced password validation with comprehensive requirements
 */
function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  
  const issues = [];
  
  // Length check
  if (password.length < SECURITY_CONFIG.minPasswordLength) {
    issues.push(`Password must be at least ${SECURITY_CONFIG.minPasswordLength} characters long`);
  }
  
  // Character requirements
  if (SECURITY_CONFIG.requireUppercase && !/[A-Z]/.test(password)) {
    issues.push('Password must contain at least one uppercase letter');
  }
  
  if (SECURITY_CONFIG.requireLowercase && !/[a-z]/.test(password)) {
    issues.push('Password must contain at least one lowercase letter');
  }
  
  if (SECURITY_CONFIG.requireNumbers && !/\d/.test(password)) {
    issues.push('Password must contain at least one number');
  }
  
  if (SECURITY_CONFIG.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    issues.push('Password must contain at least one special character');
  }
  
  // Common password check
  if (isCommonPassword(password)) {
    issues.push('Password is too common, please choose a different one');
  }
  
  // Sequential characters check
  if (hasSequentialCharacters(password)) {
    issues.push('Password cannot contain sequential characters (e.g., 123, abc)');
  }
  
  if (issues.length === 0) {
    return { valid: true, strength: calculatePasswordStrength(password) };
  } else {
    return { valid: false, message: issues.join('. '), issues: issues };
  }
}

/**
 * Check if password is in common passwords list
 */
function isCommonPassword(password) {
  const commonPasswords = [
    'password', '123456', '123456789', 'password123', 'admin', 'qwerty',
    'letmein', 'welcome', 'monkey', '1234567890', 'password1', 'abc123',
    'Password1', 'password!', 'admin123'
  ];
  
  return commonPasswords.some(common => 
    password.toLowerCase().includes(common.toLowerCase())
  );
}

/**
 * Check for sequential characters
 */
function hasSequentialCharacters(password) {
  // Check for sequential numbers
  for (let i = 0; i < password.length - 2; i++) {
    const char = password.charAt(i);
    if (!isNaN(char)) {
      const next1 = password.charAt(i + 1);
      const next2 = password.charAt(i + 2);
      if (parseInt(char) + 1 === parseInt(next1) && parseInt(next1) + 1 === parseInt(next2)) {
        return true;
      }
    }
  }
  
  // Check for sequential letters
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const lowerPassword = password.toLowerCase();
  for (let i = 0; i < lowerPassword.length - 2; i++) {
    const substr = lowerPassword.substr(i, 3);
    if (alphabet.includes(substr)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate password strength score
 */
function calculatePasswordStrength(password) {
  let score = 0;
  
  // Length bonus
  score += Math.min(password.length * 2, 20);
  
  // Character variety bonus
  if (/[a-z]/.test(password)) score += 5;
  if (/[A-Z]/.test(password)) score += 5;
  if (/\d/.test(password)) score += 5;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;
  
  // Unique characters bonus
  const uniqueChars = new Set(password).size;
  score += uniqueChars * 2;
  
  if (score < 30) return 'weak';
  if (score < 60) return 'medium';
  if (score < 90) return 'strong';
  return 'very-strong';
}

/**
 * Rate limiting implementation
 */
function isRateLimited(identifier, limitType = 'login') {
  try {
    const properties = PropertiesService.getScriptProperties();
    const key = `rate_limit_${limitType}_${identifier}`;
    const attemptsData = properties.getProperty(key);
    
    if (!attemptsData) {
      return false;
    }
    
    const attempts = JSON.parse(attemptsData);
    const now = Date.now();
    
    // Clean old attempts based on limit type
    let timeWindow, maxAttempts;
    switch (limitType) {
      case 'login':
        timeWindow = 60 * 60 * 1000; // 1 hour
        maxAttempts = SECURITY_CONFIG.maxLoginAttemptsPerHour;
        break;
      case 'api':
        timeWindow = 60 * 1000; // 1 minute
        maxAttempts = SECURITY_CONFIG.maxApiCallsPerMinute;
        break;
      default:
        timeWindow = 60 * 60 * 1000;
        maxAttempts = 10;
    }
    
    const recentAttempts = attempts.filter(timestamp => now - timestamp < timeWindow);
    
    // Update stored attempts
    if (recentAttempts.length !== attempts.length) {
      properties.setProperty(key, JSON.stringify(recentAttempts));
    }
    
    return recentAttempts.length >= maxAttempts;
  } catch (error) {
    logSecurityEvent('RATE_LIMIT_ERROR', { error: error.message, identifier });
    return false; // Fail open for availability
  }
}

/**
 * Record an attempt for rate limiting
 */
function recordAttempt(identifier, limitType = 'login') {
  try {
    const properties = PropertiesService.getScriptProperties();
    const key = `rate_limit_${limitType}_${identifier}`;
    const attemptsData = properties.getProperty(key);
    
    let attempts = attemptsData ? JSON.parse(attemptsData) : [];
    attempts.push(Date.now());
    
    // Keep only recent attempts to prevent unlimited growth
    const timeWindow = limitType === 'api' ? 60 * 1000 : 60 * 60 * 1000;
    const now = Date.now();
    attempts = attempts.filter(timestamp => now - timestamp < timeWindow);
    
    properties.setProperty(key, JSON.stringify(attempts));
  } catch (error) {
    logSecurityEvent('RATE_LIMIT_RECORD_ERROR', { error: error.message, identifier });
  }
}

/**
 * Account lockout implementation
 */
function trackFailedLoginAttempt(email) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const attemptsKey = `failed_attempts_${email}`;
    const lockKey = `locked_until_${email}`;
    
    // Check if account is already locked
    const lockedUntil = properties.getProperty(lockKey);
    if (lockedUntil && Date.now() < parseInt(lockedUntil)) {
      const unlockTime = new Date(parseInt(lockedUntil));
      logSecurityEvent('LOGIN_ATTEMPT_WHILE_LOCKED', { email, unlockTime });
      return {
        locked: true,
        message: `Account is locked until ${unlockTime.toLocaleString()}`,
        unlockTime: unlockTime
      };
    }
    
    // Increment failed attempts
    const currentAttempts = parseInt(properties.getProperty(attemptsKey) || '0');
    const newAttempts = currentAttempts + 1;
    
    properties.setProperty(attemptsKey, newAttempts.toString());
    
    logSecurityEvent('FAILED_LOGIN_ATTEMPT', { 
      email, 
      attemptNumber: newAttempts,
      timestamp: new Date().toISOString()
    });
    
    // Lock account if threshold reached
    if (newAttempts >= SECURITY_CONFIG.maxFailedAttempts) {
      const lockUntil = Date.now() + SECURITY_CONFIG.lockoutDuration;
      properties.setProperty(lockKey, lockUntil.toString());
      
      logSecurityEvent('ACCOUNT_LOCKED', { 
        email, 
        lockUntil: new Date(lockUntil).toISOString(),
        totalAttempts: newAttempts
      });
      
      return {
        locked: true,
        message: `Account locked due to ${newAttempts} failed attempts. Try again in 30 minutes.`,
        unlockTime: new Date(lockUntil)
      };
    }
    
    return {
      locked: false,
      attemptsRemaining: SECURITY_CONFIG.maxFailedAttempts - newAttempts
    };
    
  } catch (error) {
    logSecurityEvent('LOCKOUT_TRACKING_ERROR', { error: error.message, email });
    return { locked: false }; // Fail open
  }
}

/**
 * Clear failed attempts on successful login
 */
function clearFailedAttempts(email) {
  try {
    const properties = PropertiesService.getScriptProperties();
    properties.deleteProperty(`failed_attempts_${email}`);
    properties.deleteProperty(`locked_until_${email}`);
    
    logSecurityEvent('FAILED_ATTEMPTS_CLEARED', { email });
  } catch (error) {
    logSecurityEvent('CLEAR_ATTEMPTS_ERROR', { error: error.message, email });
  }
}

/**
 * Check if account is currently locked
 */
function isAccountLocked(email) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const lockKey = `locked_until_${email}`;
    const lockedUntil = properties.getProperty(lockKey);
    
    if (!lockedUntil) {
      return { locked: false };
    }
    
    const lockTime = parseInt(lockedUntil);
    if (Date.now() >= lockTime) {
      // Lock has expired, clean up
      properties.deleteProperty(lockKey);
      properties.deleteProperty(`failed_attempts_${email}`);
      return { locked: false };
    }
    
    return {
      locked: true,
      unlockTime: new Date(lockTime),
      message: `Account locked until ${new Date(lockTime).toLocaleString()}`
    };
    
  } catch (error) {
    logSecurityEvent('LOCK_CHECK_ERROR', { error: error.message, email });
    return { locked: false }; // Fail open
  }
}

/**
 * Enhanced session creation with security features
 */
function createSecureSession(user) {
  try {
    const sessionId = Utilities.getUuid();
    const now = Date.now();
    
    const sessionData = {
      id: sessionId,
      email: user.email,
      name: user.name,
      role: user.role,
      created: now,
      expires: now + SECURITY_CONFIG.sessionTimeout,
      lastActivity: now,
      // Add security metadata
      createdBy: 'system',
      ipAddress: getClientIPAddress(), // If available
      userAgent: getUserAgent() // If available
    };
    
    // Store session
    PropertiesService.getUserProperties()
      .setProperty('SECURE_SESSION', JSON.stringify(sessionData));
    
    logSecurityEvent('SESSION_CREATED', { 
      email: user.email, 
      sessionId: sessionId,
      role: user.role 
    });
    
    return sessionData;
    
  } catch (error) {
    logSecurityEvent('SESSION_CREATION_ERROR', { error: error.message, user: user.email });
    throw error;
  }
}

/**
 * Enhanced session validation
 */
function validateSecureSession() {
  try {
    const sessionData = PropertiesService.getUserProperties()
      .getProperty('SECURE_SESSION');
    
    if (!sessionData) {
      return { valid: false, reason: 'No session found' };
    }
    
    const session = JSON.parse(sessionData);
    const now = Date.now();
    
    // Check expiration
    if (session.expires < now) {
      clearSecureSession();
      logSecurityEvent('SESSION_EXPIRED', { email: session.email, sessionId: session.id });
      return { valid: false, reason: 'Session expired' };
    }
    
    // Check session integrity
    if (!session.id || !session.email || !session.role) {
      clearSecureSession();
      logSecurityEvent('SESSION_INTEGRITY_FAILED', { session: session });
      return { valid: false, reason: 'Session integrity check failed' };
    }
    
    // Update last activity
    session.lastActivity = now;
    PropertiesService.getUserProperties()
      .setProperty('SECURE_SESSION', JSON.stringify(session));
    
    return { valid: true, session: session };
    
  } catch (error) {
    logSecurityEvent('SESSION_VALIDATION_ERROR', { error: error.message });
    return { valid: false, reason: 'Session validation error' };
  }
}

/**
 * Clear secure session
 */
function clearSecureSession() {
  try {
    const sessionData = PropertiesService.getUserProperties()
      .getProperty('SECURE_SESSION');
    
    if (sessionData) {
      const session = JSON.parse(sessionData);
      logSecurityEvent('SESSION_CLEARED', { 
        email: session.email, 
        sessionId: session.id 
      });
    }
    
    PropertiesService.getUserProperties().deleteProperty('SECURE_SESSION');
  } catch (error) {
    logSecurityEvent('SESSION_CLEAR_ERROR', { error: error.message });
  }
}

/**
 * Get client IP address (limited in Apps Script)
 */
function getClientIPAddress() {
  // Apps Script has limited access to client information
  // This is a placeholder for when/if such functionality becomes available
  return 'unknown';
}

/**
 * Get user agent (limited in Apps Script)
 */
function getUserAgent() {
  // Apps Script has limited access to client information
  // This is a placeholder for when/if such functionality becomes available
  return 'unknown';
}

/**
 * Enhanced login function with security features
 */
function secureLoginWithCredentials(email, password) {
  try {
    // Input validation
    if (!email || !password) {
      logSecurityEvent('LOGIN_INVALID_INPUT', { email: email || 'empty' });
      return { success: false, message: 'Email and password are required' };
    }
    
    email = email.trim().toLowerCase();
    
    // Rate limiting check
    if (isRateLimited(email, 'login')) {
      logSecurityEvent('LOGIN_RATE_LIMITED', { email });
      return { 
        success: false, 
        message: 'Too many login attempts. Please try again later.' 
      };
    }
    
    // Record this attempt
    recordAttempt(email, 'login');
    
    // Account lockout check
    const lockStatus = isAccountLocked(email);
    if (lockStatus.locked) {
      return { success: false, message: lockStatus.message };
    }
    
    // Find user record
    const user = findUserRecord(email);
    if (!user || user.status !== 'active') {
      const failureResult = trackFailedLoginAttempt(email);
      return { 
        success: false, 
        message: 'Invalid credentials',
        ...failureResult
      };
    }
    
    // Verify password
    const hashedPassword = hashPassword(password);
    if (hashedPassword !== String(user.hashedPassword)) {
      const failureResult = trackFailedLoginAttempt(email);
      return { 
        success: false, 
        message: 'Invalid credentials',
        ...failureResult
      };
    }
    
    // Successful login
    clearFailedAttempts(email);
    const session = createSecureSession(user);
    
    logSecurityEvent('SUCCESSFUL_LOGIN', { 
      email: user.email, 
      role: user.role,
      method: 'credentials'
    });
    
    return { 
      success: true, 
      url: getWebAppUrlSafe(),
      user: user,
      session: session
    };
    
  } catch (error) {
    logSecurityEvent('LOGIN_ERROR', { error: error.message, email });
    return { 
      success: false, 
      message: 'Login system error. Please try again.' 
    };
  }
}

/**
 * Enhanced Google OAuth login with security features
 */
function secureLoginWithGoogle() {
  try {
    // Rate limiting for Google login attempts
    const tempId = 'google_login_' + Date.now();
    if (isRateLimited(tempId, 'login')) {
      logSecurityEvent('GOOGLE_LOGIN_RATE_LIMITED', { tempId });
      return { 
        success: false, 
        message: 'Too many login attempts. Please try again later.' 
      };
    }
    
    recordAttempt(tempId, 'login');
    
    // Use existing Google authentication
    const auth = authenticateUser();
    if (!auth.success) {
      logSecurityEvent('GOOGLE_LOGIN_FAILED', { error: auth.error });
      return auth;
    }
    
    // Create secure session
    const session = createSecureSession(auth.user);
    
    logSecurityEvent('SUCCESSFUL_LOGIN', { 
      email: auth.user.email, 
      role: auth.user.role,
      method: 'google_oauth'
    });
    
    return { 
      success: true, 
      url: getWebAppUrlSafe(),
      user: auth.user,
      rider: auth.rider,
      session: session
    };
    
  } catch (error) {
    logSecurityEvent('GOOGLE_LOGIN_ERROR', { error: error.message });
    return { 
      success: false, 
      message: 'Google login system error. Please try again.' 
    };
  }
}

/**
 * Secure logout with cleanup
 */
function secureLogout() {
  try {
    const sessionValidation = validateSecureSession();
    if (sessionValidation.valid) {
      logSecurityEvent('USER_LOGOUT', { 
        email: sessionValidation.session.email,
        sessionId: sessionValidation.session.id
      });
    }
    
    clearSecureSession();
    
    return { success: true };
  } catch (error) {
    logSecurityEvent('LOGOUT_ERROR', { error: error.message });
    return { success: false, message: 'Logout error occurred' };
  }
}

/**
 * Enhanced input sanitization
 */
function sanitizeInput(input, type = 'string') {
  if (input === null || input === undefined) {
    return '';
  }
  
  let sanitized = String(input).trim();
  
  switch (type) {
    case 'email':
      sanitized = sanitized.toLowerCase()
        .replace(/[^a-z0-9@._-]/g, '');
      return isValidEmail(sanitized) ? sanitized : '';
      
    case 'name':
      return sanitized.replace(/[<>\"'&]/g, '')
        .replace(/\s+/g, ' ')
        .substring(0, 100);
      
    case 'phone':
      return sanitized.replace(/[^\d\+\-\(\)\s]/g, '')
        .substring(0, 20);
      
    case 'alphanumeric':
      return sanitized.replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 50);
      
    default:
      return sanitized.replace(/[<>\"'&]/g, '')
        .substring(0, 500);
  }
}

/**
 * Email validation
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Test security functions
 */
function testSecurityFunctions() {
  debugLog('🔒 Testing Security Functions...');
  
  // Test password validation
  const passwordTests = [
    'weak',
    'StrongPassword123!',
    'password123',
    'VeryStrongP@ssw0rd2024!'
  ];
  
  passwordTests.forEach(pwd => {
    const result = validatePasswordStrength(pwd);
    debugLog(`Password "${pwd}": ${result.valid ? 'Valid' : 'Invalid'} - ${result.message || result.strength}`);
  });
  
  // Test rate limiting
  debugLog('\nTesting rate limiting...');
  const testEmail = 'test@example.com';
  for (let i = 0; i < 12; i++) {
    recordAttempt(testEmail, 'login');
    debugLog(`Attempt ${i + 1}: Rate limited = ${isRateLimited(testEmail, 'login')}`);
  }
  
  // Test input sanitization
  const testInputs = [
    'normal@email.com',
    '<script>alert("xss")</script>',
    'John O\'Connor',
    '+1-555-123-4567'
  ];
  
  debugLog('\nTesting input sanitization...');
  testInputs.forEach(input => {
    debugLog(`Input: "${input}" -> Sanitized: "${sanitizeInput(input)}"`);
  });
  
  debugLog('🔒 Security function testing completed.');
}
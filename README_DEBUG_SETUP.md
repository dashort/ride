# Debug Logging Setup - Motorcycle Escort Management System

## Issue Resolved: "debuglog is not defined" Error

### Problem
The application was calling `debugLog()` throughout the codebase but the function was never defined, causing runtime errors.

### Solution
Added the missing `debugLog()` function to `Code.gs` that respects the configuration settings.

### Debug Logging Function
```javascript
function debugLog(...args) {
  // Check if debug logging is enabled in CONFIG
  if (CONFIG.performance && CONFIG.performance.enableDebugLogging) {
    console.log('[DEBUG]', ...args);
  } else if (CONFIG.system && CONFIG.system.enableDebugLogging) {
    console.log('[DEBUG]', ...args);
  }
  // If debugging is disabled, this function does nothing (silent)
}
```

### How to Enable Debug Logging

#### Method 1: Enable via Performance Settings
In `Config.gs`, change:
```javascript
performance: {
  enableDebugLogging: true,  // Change from false to true
  // ... other settings
}
```

#### Method 2: Enable via System Settings
In `Config.gs`, change:
```javascript
system: {
  enableDebugLogging: true,  // Change from false to true
  // ... other settings
}
```

### Testing Debug Logging
Run the `testDebugLog()` function in the Google Apps Script editor to verify the debug logging is working correctly.

### Production Considerations
- Debug logging is disabled by default for performance reasons
- Only enable debug logging temporarily for troubleshooting
- Remember to disable it again in production environments

### Files Modified
- `Code.gs` - Added `debugLog()` function and `testDebugLog()` function
- This README file created for documentation

### Usage
The `debugLog()` function can now be called from anywhere in the codebase:
```javascript
debugLog('This is a debug message');
debugLog('User logged in:', userEmail);
debugLog('Processing request:', requestData);
```
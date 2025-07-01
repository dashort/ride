/**
 * Simple test to verify deployment is working
 * Temporarily replace your doGet function with this one to test
 */

function doGetTest(e) {
  try {
    const user = Session.getActiveUser();
    const userEmail = user.getEmail();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Deployment Test</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 2rem; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 2rem; border-radius: 10px; }
    .success { color: #28a745; background: #d4edda; padding: 1rem; border-radius: 5px; margin: 1rem 0; }
    .info { color: #0056b3; background: #cce5ff; padding: 1rem; border-radius: 5px; margin: 1rem 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎉 Deployment Test Successful!</h1>
    
    <div class="success">
      ✅ Google Apps Script is working properly!
    </div>
    
    <div class="info">
      <h3>Your Information:</h3>
      <p><strong>Email:</strong> ${userEmail}</p>
      <p><strong>Name:</strong> ${user.getName() || 'Not available'}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    </div>
    
    <h3>Next Steps:</h3>
    <ol>
      <li>This confirms your deployment is working</li>
      <li>Now switch back to your main doGet function</li>
      <li>The authentication system should work properly</li>
    </ol>
    
    <p><small>If you see this page, the deployment is configured correctly.</small></p>
  </div>
</body>
</html>`;
    
    return HtmlService.createHtmlOutput(html)
      .setTitle('Deployment Test')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    const errorHtml = `
<!DOCTYPE html>
<html>
<head><title>Test Error</title></head>
<body>
  <h1>❌ Test Error</h1>
  <p><strong>Error:</strong> ${error.message}</p>
  <p><strong>Stack:</strong> ${error.stack}</p>
</body>
</html>`;
    
    return HtmlService.createHtmlOutput(errorHtml).setTitle('Test Error');
  }
}

/**
 * Check if you have the correct doGet function active
 */
function checkActiveDoGet() {
  console.log('🔍 Checking which doGet function is active...');
  
  // List all functions that start with 'doGet'
  const functionNames = [];
  try {
    if (typeof doGet === 'function') functionNames.push('doGet');
    if (typeof doGetOriginal === 'function') functionNames.push('doGetOriginal');
    if (typeof doGetTest === 'function') functionNames.push('doGetTest');
  } catch (e) {
    console.log('Error checking functions:', e.message);
  }
  
  console.log('Available doGet functions:', functionNames);
  
  // Check if we have the authentication router
  if (typeof createAuthenticationChoicePage === 'function') {
    console.log('✅ Authentication router functions available');
  } else {
    console.log('❌ Authentication router functions missing');
  }
  
  // Check if we have the enhanced security
  if (typeof secureLoginWithCredentials === 'function') {
    console.log('✅ Enhanced security functions available');
  } else {
    console.log('❌ Enhanced security functions missing');
  }
  
  return {
    availableFunctions: functionNames,
    hasAuthRouter: typeof createAuthenticationChoicePage === 'function',
    hasEnhancedSecurity: typeof secureLoginWithCredentials === 'function'
  };
}
function normalizeRequestId(requestId) {
  if (!requestId || typeof requestId !== 'string') {
    return requestId; // Return as is if not a valid string
  }
  const match = requestId.match(/^([A-L])-(\d+)-(\d{2})$/i);
  if (match) {
    const monthLetter = match[1].toUpperCase();
    const sequence = parseInt(match[2], 10);
    const year = match[3];
    return `${monthLetter}-${sequence.toString().padStart(2, '0')}-${year}`;
  }
  return requestId; // Return original if format doesn't match
}
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}
function getSmsGatewayEmail(phone, carrier) {
  const cleanPhone = cleanPhoneNumber(phone);
  const gateway = CONFIG.smsGateways[String(carrier).toLowerCase()];

  if (!gateway) {
    throw new Error(`Unknown carrier: ${carrier}`);
  }

  return `${cleanPhone}@${gateway}`;
}
function testServerConnection() {
  try {
    console.log('🔧 Testing server connection...');
    
    const testData = {
      timestamp: new Date().toISOString(),
      activeSpreadsheet: SpreadsheetApp.getActiveSpreadsheet().getName(),
      sheetsCount: SpreadsheetApp.getActiveSpreadsheet().getSheets().length,
      serverStatus: 'OK'
    };
    
    console.log('✅ Server connection test successful:', testData);
    return testData;
    
  } catch (error) {
    console.error('❌ Server connection test failed:', error);
    return {
      timestamp: new Date().toISOString(),
      serverStatus: 'ERROR',
      error: error.message
    };
  }
}
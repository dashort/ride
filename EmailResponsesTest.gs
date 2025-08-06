/**
 * @fileoverview
 * Test functions for email response tracking system.
 * Use these functions to verify that email responses are being recorded properly.
 */

/**
 * Test function to verify the email response tracking system is working.
 * This will check all components and provide a detailed report.
 */
function testEmailResponseSystem() {
  console.log('🧪 Starting Email Response System Test...');
  console.log('=' .repeat(50));
  
  try {
    // 1. Check system status
    console.log('1️⃣ Checking system status...');
    const status = checkEmailResponseTrackingStatus();
    
    if (status.error) {
      console.error('❌ Error checking status:', status.error);
      return false;
    }
    
    console.log(`   📋 Sheet exists: ${status.sheetExists ? '✅' : '❌'}`);
    console.log(`   ⏰ Trigger exists: ${status.triggerExists ? '✅' : '❌'}`);
    console.log(`   📊 Recent responses: ${status.recentResponses}`);
    console.log(`   🕐 Last activity: ${status.lastActivity || 'None'}`);
    
    // 2. Verify Email_Responses sheet structure
    console.log('\n2️⃣ Verifying sheet structure...');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Email_Responses');
    
    if (!sheet) {
      console.log('   ❌ Email_Responses sheet does not exist');
      console.log('   🔧 Run setupEmailResponseTracking() to create it');
      return false;
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const expectedHeaders = ['Timestamp', 'From Email', 'Rider Name', 'Message Body', 'Request ID', 'Action'];
    
    console.log(`   📊 Headers found: ${headers.join(', ')}`);
    
    const headersMatch = expectedHeaders.every(header => headers.includes(header));
    console.log(`   ✅ Headers correct: ${headersMatch ? '✅' : '❌'}`);
    
    // 3. Check for riders in the system
    console.log('\n3️⃣ Checking rider data...');
    const ridersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Riders');
    
    if (!ridersSheet) {
      console.log('   ❌ Riders sheet not found');
      return false;
    }
    
    const ridersData = ridersSheet.getDataRange().getValues();
    const riderCount = ridersData.length - 1; // Exclude header
    console.log(`   👥 Riders in system: ${riderCount}`);
    
    // 4. Test email processing function
    console.log('\n4️⃣ Testing email processing function...');
    try {
      processEmailResponses();
      console.log('   ✅ processEmailResponses() executed successfully');
    } catch (error) {
      console.error('   ❌ Error in processEmailResponses():', error.message);
      return false;
    }
    
    // 5. Final recommendations
    console.log('\n📋 RECOMMENDATIONS:');
    
    if (!status.sheetExists) {
      console.log('   🔧 Run setupEmailResponseTracking() to create the Email_Responses sheet');
    }
    
    if (!status.triggerExists) {
      console.log('   ⏰ Run setupEmailResponseTracking() to create the time-driven trigger');
    }
    
    if (status.recentResponses === 0) {
      console.log('   📧 No email responses recorded yet - this is normal if no riders have replied via email');
    }
    
    console.log('\n🎉 Email Response System Test Complete!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    logError('Email response system test failed', error);
    return false;
  }
}

/**
 * Simple function to test if a specific rider's email would be recognized.
 * @param {string} testEmail Email address to test
 */
function testRiderEmailRecognition(testEmail) {
  if (!testEmail) {
    console.log('❌ Please provide an email address to test');
    return false;
  }
  
  console.log(`🧪 Testing email recognition for: ${testEmail}`);
  
  try {
    const rider = findRiderByEmail(testEmail);
    
    if (rider) {
      console.log(`✅ Email recognized! Rider: ${rider.name}`);
      console.log(`   📞 Phone: ${rider.phone || 'Not provided'}`);
      console.log(`   📧 Email: ${rider.email}`);
      return true;
    } else {
      console.log('❌ Email not found in rider database');
      console.log('💡 Make sure the email exists in the Riders sheet');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing email recognition:', error);
    return false;
  }
}

/**
 * Display recent email responses in a readable format.
 * @param {number} limit Number of recent responses to show (default: 10)
 */
function showRecentEmailResponses(limit = 10) {
  console.log(`📧 Recent Email Responses (Last ${limit}):`);
  console.log('=' .repeat(60));
  
  try {
    const responses = getEmailResponses(limit);
    
    if (responses.length === 0) {
      console.log('📭 No email responses found');
      console.log('💡 This could mean:');
      console.log('   - No riders have replied via email yet');
      console.log('   - The Email_Responses sheet doesn\'t exist');
      console.log('   - The trigger is not set up to process emails');
      return;
    }
    
    responses.forEach((response, index) => {
      console.log(`\n${index + 1}. ${response.Timestamp}`);
      console.log(`   From: ${response['From Email']}`);
      console.log(`   Rider: ${response['Rider Name']}`);
      console.log(`   Action: ${response.Action}`);
      console.log(`   Request ID: ${response['Request ID'] || 'None'}`);
      console.log(`   Message: ${response['Message Body']?.substring(0, 100)}${response['Message Body']?.length > 100 ? '...' : ''}`);
    });
    
    console.log(`\n📊 Total responses shown: ${responses.length}`);
    
  } catch (error) {
    console.error('❌ Error retrieving email responses:', error);
    logError('Error showing recent email responses', error);
  }
}

/**
 * Comprehensive setup and test function.
 * Runs the full setup and then tests the system.
 */
function setupAndTestEmailResponseSystem() {
  console.log('🚀 Setting up and testing email response system...');
  console.log('=' .repeat(60));
  
  // 1. Setup the system
  const setupResult = setupEmailResponseTracking();
  
  if (!setupResult.success) {
    console.error('❌ Setup failed:', setupResult.message);
    return false;
  }
  
  console.log('✅ Setup completed successfully!');
  
  // 2. Wait a moment for setup to complete
  Utilities.sleep(2000);
  
  // 3. Test the system
  console.log('\n🧪 Now testing the system...');
  const testResult = testEmailResponseSystem();
  
  if (testResult) {
    console.log('\n🎉 Setup and test completed successfully!');
    console.log('📧 Email responses will now be automatically recorded every 5 minutes.');
  } else {
    console.log('\n⚠️ Setup completed but test found some issues. Check the logs above.');
  }
  
  return testResult;
}

/**
 * Test the request update functionality with sample response data
 * This will help verify that responses are being added to request notes properly
 */
function testRequestResponseUpdate() {
  try {
    console.log('🧪 Testing request response update functionality...');
    
    // First check if we have any sample data to work with
    const responses = getEmailResponses(5);
    console.log(`📊 Found ${responses.length} email responses to test with`);
    
    if (responses.length === 0) {
      console.log('⚠️ No email responses found. Creating sample data for testing...');
      
      // Create sample response data for testing
      const sampleResponses = [
        {
          riderName: 'Joe Smith',
          requestId: 'TEST-001',
          action: 'Confirmed',
          timestamp: new Date()
        },
        {
          riderName: 'Jane Doe',
          requestId: 'TEST-002', 
          action: 'Declined',
          timestamp: new Date(Date.now() - 60000) // 1 minute ago
        }
      ];
      
      console.log('📝 Testing with sample data:');
      sampleResponses.forEach((sample, index) => {
        console.log(`   ${index + 1}. ${sample.riderName} ${sample.action} for ${sample.requestId}`);
        updateSingleRequestWithResponse(sample.requestId, sample.riderName, sample.action, sample.timestamp);
      });
    } else {
      console.log('📝 Testing with actual email response data...');
      
      // Test updating requests with the first few responses
      responses.slice(0, 3).forEach((response, index) => {
        if (response.requestId && response.riderName && response.action) {
          console.log(`   ${index + 1}. ${response.riderName} ${response.action} for ${response.requestId}`);
          updateSingleRequestWithResponse(response.requestId, response.riderName, response.action, response.timestamp);
        }
      });
    }
    
    console.log('✅ Request response update test completed');
    
    // Now test the bulk update function
    console.log('🔄 Testing bulk update function...');
    const result = updateRequestsWithResponseInfo();
    console.log('📊 Bulk update result:', JSON.stringify(result, null, 2));
    
    return {
      success: true,
      message: 'Request response update test completed successfully',
      responsesProcessed: responses.length
    };
    
  } catch (error) {
    console.error('❌ Error in testRequestResponseUpdate:', error);
    return {
      success: false,
      message: 'Test failed: ' + error.message
    };
  }
}

/**
 * Verify that request notes contain response information
 * @param {string} requestId Optional specific request ID to check
 */
function verifyRequestResponseUpdates(requestId = null) {
  try {
    console.log('🔍 Verifying request response updates...');
    
    const requestsData = getRequestsData(false);
    if (!requestsData || !requestsData.data) {
      throw new Error('Could not access requests data');
    }
    
    const columnMap = requestsData.columnMap;
    const notesCol = columnMap[CONFIG.columns.requests.notes];
    const requestIdCol = columnMap[CONFIG.columns.requests.id];
    
    if (notesCol === undefined || requestIdCol === undefined) {
      throw new Error('Required columns not found in requests sheet');
    }
    
    let requestsWithResponses = 0;
    let totalRequests = 0;
    
    requestsData.data.forEach((row, index) => {
      const rowRequestId = getColumnValue(row, columnMap, CONFIG.columns.requests.id);
      const notes = getColumnValue(row, columnMap, CONFIG.columns.requests.notes);
      
      if (!rowRequestId) return;
      
      totalRequests++;
      
      // Skip if we're looking for a specific request ID
      if (requestId && String(rowRequestId).trim() !== String(requestId).trim()) {
        return;
      }
      
      // Check if notes contain response information (looking for patterns like "confirmed at" or "declined at")
      if (notes && (String(notes).includes('confirmed at') || String(notes).includes('declined at'))) {
        requestsWithResponses++;
        console.log(`✅ Request ${rowRequestId} has response info in notes:`);
        console.log(`   Notes: ${String(notes).substring(0, 100)}${String(notes).length > 100 ? '...' : ''}`);
      } else if (requestId) {
        console.log(`📋 Request ${rowRequestId} notes: ${notes || 'No notes'}`);
      }
    });
    
    console.log(`📊 Summary: ${requestsWithResponses} out of ${totalRequests} requests have response information`);
    
    return {
      success: true,
      totalRequests: totalRequests,
      requestsWithResponses: requestsWithResponses,
      percentage: totalRequests > 0 ? Math.round((requestsWithResponses / totalRequests) * 100) : 0
    };
    
  } catch (error) {
    console.error('❌ Error verifying request response updates:', error);
    return {
      success: false,
      message: 'Verification failed: ' + error.message
    };
  }
}
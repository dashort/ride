/**
 * @fileoverview
 * Complete Rider Management System for the Motorcycle Escort Management System.
 * Provides CRUD operations for managing riders including add, update, delete, and retrieval functions.
 * Integrates with the existing caching system and configuration structure.
 */

/**
 * Fetches all riders from the Riders sheet.
 * @return {Array<object>} An array of rider objects, or an empty array if an error occurs.
 */

function getRiders() {
  try {
    console.log('📋 Fetching all riders with enhanced filtering...');
    
    const sheetData = getSheetData(CONFIG.sheets.riders);
    
    if (!sheetData || !sheetData.data || sheetData.data.length === 0) {
      console.log('⚠️ No rider data found');
      return [];
    }
    
    const riders = sheetData.data.map((row, index) => {
      try {
        // Enhanced column detection
        const possibleNameColumns = [CONFIG.columns.riders.name, 'Full Name', 'Name'];
        const possibleIdColumns = [CONFIG.columns.riders.jpNumber, 'Rider ID', 'JP Number', 'ID'];
        
        let name = null;
        let jpNumber = null;
        
        // Try to find name in any of the possible columns
        for (const colName of possibleNameColumns) {
          const value = getColumnValue(row, sheetData.columnMap, colName);
          if (value && String(value).trim().length > 0) {
            name = value;
            break;
          }
        }
        
        // Try to find ID in any of the possible columns
        for (const colName of possibleIdColumns) {
          const value = getColumnValue(row, sheetData.columnMap, colName);
          if (value && String(value).trim().length > 0) {
            jpNumber = value;
            break;
          }
        }
        
        // Fallback to positional if no named columns found
        if (!name && row.length > 1) name = row[1];
        if (!jpNumber && row.length > 0) jpNumber = row[0];
        
        // CONSISTENT LOGIC: Must have either name OR JP number
        const hasValidIdentifier = (name && String(name).trim().length > 0) || 
                                  (jpNumber && String(jpNumber).trim().length > 0);
        
        if (!hasValidIdentifier) {
          return null; // Filter out invalid riders
        }
        
        return mapRowToRiderObject(row, sheetData.columnMap, sheetData.headers);
      } catch (rowError) {
        console.warn(`⚠️ Error processing rider row ${index}:`, rowError);
        return null;
      }
    }).filter(rider => rider !== null); // Remove nulls
    
    console.log(`✅ Successfully fetched ${riders.length} valid riders`);
    return riders;
    
  } catch (error) {
    console.error('❌ Error fetching riders:', error);
    logError('Error in getRiders', error);
    return [];
  }
}
function getRidersForPage() {
  try {
    // Use shared sheet utility for reliable column detection
    const sheetData = getSheetData(CONFIG.sheets.riders);
    if (!sheetData || !sheetData.data) {
      return { success: false, message: 'Riders sheet not found', riders: [] };
    }

    const riders = sheetData.data
      .map(row => mapRowToRiderObject(row, sheetData.columnMap, sheetData.headers))
      .filter(r => r && (r.jpNumber || r.name))
      .map(r => ({
        jpNumber: r.jpNumber || '',
        name: r.name || '',
        phone: r.phone || '',
        status: r.status || ''
      }));

    return { success: true, riders };
  } catch (error) {
    if (typeof logError === 'function') {
      logError('getRidersForPage', error);
    }
    return { success: false, message: error.message, riders: [] };
  }
}

function getRiderDashboard(riderId) {
  return {
    myAssignments: getAssignmentsForRider(riderId),
    upcomingEscorts: getUpcomingEscorts(riderId),
    completedThisMonth: getCompletedCount(riderId),
    notifications: getRiderNotifications(riderId)
  };
}

/**
 * Fetches details for a specific rider by their Rider ID.
 * @param {string|number} riderId The Rider ID (jpNumber) to search for.
 * @return {object|null} The rider object if found, otherwise null.
 */
function getRiderDetails(riderId) {
  try {
    console.log(`🔍 getRiderDetails called with: "${riderId}" (type: ${typeof riderId})`);
    
    if (!riderId) {
      console.warn('⚠️ No rider ID provided');
      return null;
    }

    const sheetData = getSheetData(CONFIG.sheets.riders);
    
    if (!sheetData || !sheetData.data || sheetData.data.length === 0) {
      console.log('⚠️ No rider data found in sheet');
      return null;
    }

    // Get column info with flexible header detection
    const possibleIdColumns = [
      CONFIG.columns.riders.jpNumber,
      'Rider ID',
      'JP Number',
      'ID'
    ];
    const possibleNameColumns = [
      CONFIG.columns.riders.name,
      'Full Name',
      'Name'
    ];

    let riderIdColumn = null;
    let riderIdIndex = undefined;
    for (const col of possibleIdColumns) {
      const idx = getColumnIndex(sheetData.columnMap, col);
      if (idx !== undefined) {
        riderIdColumn = col;
        riderIdIndex = idx;
        break;
      }
    }

    let nameColumn = null;
    let nameIndex = undefined;
    for (const col of possibleNameColumns) {
      const idx = getColumnIndex(sheetData.columnMap, col);
      if (idx !== undefined) {
        nameColumn = col;
        nameIndex = idx;
        break;
      }
    }

    console.log(`📊 Search config:`);
    console.log(`   Looking for column: "${riderIdColumn}" at index: ${riderIdIndex}`);
    console.log(`   Name column: "${nameColumn}" at index: ${nameIndex}`);
    console.log(`   Total data rows: ${sheetData.data.length}`);

    // If Rider ID column is missing, fall back to name-only search when possible
    if (riderIdIndex === undefined && nameIndex === undefined) {
      throw new Error(`Required columns not found in Riders sheet (missing ${CONFIG.columns.riders.jpNumber} and ${CONFIG.columns.riders.name})`);
    }

    // Search with different strategies
    let targetRow = null;
    let matchMethod = '';

    // Helper to normalize IDs (ignore punctuation, case, and leading zeros)
    const normalizeId = (value) => {
      if (value === null || value === undefined) return '';
      return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/^0+/, '');
    };
    
    // If we have an ID column, attempt ID-based strategies first
    if (riderIdIndex !== undefined) {
      // Strategy 1: Exact string match
      targetRow = sheetData.data.find((row, index) => {
        const rowRiderId = row[riderIdIndex];
        const isMatch = String(rowRiderId).trim() === String(riderId).trim();
        
        if (index < 5 || isMatch) { // Log first 5 rows or any matches
          console.log(`   Row ${index + 2}: ID="${rowRiderId}" Name="${row[nameIndex] || 'N/A'}" Match=${isMatch}`);
        }
        
        return isMatch;
      });
      
      if (targetRow) {
        matchMethod = 'exact string match';
      } else {
        // Strategy 2: Normalized ID match (handles 00123 vs 123, JP-123 vs jp123)
        const normalizedRequestedId = normalizeId(riderId);
        targetRow = sheetData.data.find(row => normalizeId(row[riderIdIndex]) === normalizedRequestedId);
        if (targetRow) {
          matchMethod = 'normalized ID match';
        } else {
          // Strategy 3: Case-insensitive match
          targetRow = sheetData.data.find((row) => {
            const rowRiderId = row[riderIdIndex];
            const isMatch = String(rowRiderId).trim().toLowerCase() === String(riderId).trim().toLowerCase();
            return isMatch;
          });
          
          if (targetRow) {
            matchMethod = 'case-insensitive match';
          }
        }
      }
    }

    // Strategy 4: Try searching by name if riderId might actually be a name (or ID column missing)
    if (!targetRow && nameIndex !== undefined) {
      targetRow = sheetData.data.find((row) => {
        const rowName = row[nameIndex];
        const isMatch = String(rowName).trim().toLowerCase() === String(riderId).trim().toLowerCase();
        return isMatch;
      });
      if (targetRow) {
        matchMethod = riderIdIndex === undefined ? 'name match (ID column missing)' : 'name match (riderId was actually a name)';
      }
    }

    if (!targetRow) {
      console.log(`❌ Rider not found with ID: "${riderId}"`);
      console.log(`🔍 Available IDs in first 10 rows:`);
      
      sheetData.data.slice(0, 10).forEach((row, index) => {
        const id = row[riderIdIndex] || 'EMPTY';
        const name = row[nameIndex] || 'NO NAME';
        console.log(`   Row ${index + 2}: ID="${id}" Name="${name}"`);
      });
      
      return null;
    }

    const rider = mapRowToRiderObject(targetRow, sheetData.columnMap, sheetData.headers);
    console.log(`✅ Found rider via ${matchMethod}: ${rider.name || 'Unknown'} (ID: ${rider.jpNumber})`);
    
    return rider;

  } catch (error) {
    console.error(`❌ Error fetching rider details for ID ${riderId}:`, error);
    logError(`Error in getRiderDetails for ID ${riderId}`, error);
    return null;
  }
}
/**
 * Main handler for all rider operations called from the web app
 * Add this function to RiderCRUD.gs
 */
function handleRiderOperation(action, data) {
  try {
    console.log(`🔧 handleRiderOperation: ${action}`, data);
    
    switch (action) {
      case 'get':
        // Get rider details for editing
        const riderId = data.riderId || data['Rider ID'];
        console.log(`Getting rider details for: "${riderId}"`);
        
        const rider = getRiderDetails(riderId);
        if (!rider) {
          return {
            success: false,
            message: `Rider with ID "${riderId}" not found`
          };
        }
        
        return {
          success: true,
          rider: rider
        };
        
      case 'create':
        // Add new rider
        return addRider(data);
        
      case 'update':
        // Update existing rider
        return updateRider(data);
        
      case 'delete':
        // Delete rider
        const deleteId = data.riderId || data['Rider ID'];
        return deleteRider(deleteId);
        
      case 'export':
        // Export riders to CSV
        return exportRidersToCSV(data.status);
        
      case 'bulkUpdateStatus':
        // Bulk update rider status
        return bulkUpdateRiderStatus(data.riderIds, data.newStatus);
        
      default:
        throw new Error(`Unknown rider operation: ${action}`);
    }
    
  } catch (error) {
    console.error(`❌ Error in handleRiderOperation (${action}):`, error);
    logError(`Error in handleRiderOperation (${action})`, error);
    return {
      success: false,
      message: error.message
    };
  }
}

function getTotalRiderCount() {
  try {
    console.log('📊 Getting total rider count with consistent logic...');
    
    const ridersData = getRidersData();
    
    if (!ridersData || !ridersData.data || ridersData.data.length === 0) {
      return 0;
    }
    
    // Use the same filtering logic as display
    const validRiders = ridersData.data.filter(row => {
      const name = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.name);
      const jpNumber = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.jpNumber);
      
      // CONSISTENT LOGIC: Must have either name OR JP number
      return (name && String(name).trim().length > 0) || 
             (jpNumber && String(jpNumber).trim().length > 0);
    });
    
    console.log(`✅ Total valid riders: ${validRiders.length}`);
    return validRiders.length;
    
  } catch (error) {
    console.error('❌ Error getting total rider count:', error);
    return 0;
  }
}
/**
 * Adds a new rider to the Riders sheet.
 * @param {object} riderData An object containing the new rider's information.
 * @return {object} An object with 'success' (boolean) and 'message' (string) properties.
 */
function addRider(riderData) {
  try {
    console.log('➕ Adding new rider:', JSON.stringify(riderData, null, 2));
    
    // Validate required fields
    const requiredFields = [
      CONFIG.columns.riders.jpNumber,
      CONFIG.columns.riders.name,
      CONFIG.columns.riders.phone
    ];
    
    for (const field of requiredFields) {
      if (!riderData[field] || String(riderData[field]).trim() === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate payroll number if provided
    if (riderData[CONFIG.columns.riders.payrollNumber]) {
      const payroll = String(riderData[CONFIG.columns.riders.payrollNumber]).trim();
      if (!/^\d{5,8}$/.test(payroll)) {
        throw new Error('Payroll Number must be 5-8 digits');
      }
    }
    
    // Check for duplicate Rider ID
    const existingRider = getRiderDetails(riderData[CONFIG.columns.riders.jpNumber]);
    if (existingRider) {
      throw new Error(`Rider ID "${riderData[CONFIG.columns.riders.jpNumber]}" already exists`);
    }
    
    // Get sheet and headers
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.riders);
    if (!sheet) {
      throw new Error(`Sheet "${CONFIG.sheets.riders}" not found`);
    }
    
    const sheetData = getSheetData(CONFIG.sheets.riders);
    const headers = sheetData.headers;

    // Normalize incoming data keys for flexible mapping
    const normalizedData = {};
    Object.keys(riderData).forEach(key => {
      normalizedData[normalizeColumnName(key)] = riderData[key];
    });

    // Support common variations of the part time field
   const normalizedPartTime =
      normalizedData['part time'] ||
      normalizedData['part-time'] ||
      normalizedData['parttimerider'] ||
      normalizedData['part time rider'] ||
      normalizedData['parttime'];

    const normalizedPlatoon = normalizedData['platoon'];

    // Create new row array based on headers
    const newRowArray = headers.map(header => {
      const normalizedHeader = normalizeColumnName(header);

      if (normalizedData.hasOwnProperty(normalizedHeader)) {
        return normalizedData[normalizedHeader];
      }

      // Set default values for specific columns
      switch (header) {
        case CONFIG.columns.riders.status:
          return 'Active';
        case CONFIG.columns.riders.totalAssignments:
          return 0;
        case CONFIG.columns.riders.lastAssignmentDate:
          return '';
        case CONFIG.columns.riders.partTime:
          return normalizedPartTime || 'No';
        case CONFIG.columns.riders.platoon:
          return normalizedPlatoon || '';
        case CONFIG.columns.riders.payrollNumber:
          return riderData[header] || '';
        case CONFIG.columns.riders.certification:
          return riderData[header] || 'Standard';
        default:
          return riderData[header] || '';
      }
    });
    
    // Append the new row
    sheet.appendRow(newRowArray);
    SpreadsheetApp.flush(); // Ensure changes are written
    
    // Clear cache to refresh data
    dataCache.clear('sheet_' + CONFIG.sheets.riders);
    
    const successMessage = `Rider "${riderData[CONFIG.columns.riders.name]}" (ID: ${riderData[CONFIG.columns.riders.jpNumber]}) added successfully`;
    console.log(`✅ ${successMessage}`);
    logActivity(successMessage);
    
    return {
      success: true,
      message: 'Rider added successfully.',
      riderId: riderData[CONFIG.columns.riders.jpNumber]
    };
    
  } catch (error) {
    console.error('❌ Error adding rider:', error);
    logError('Error in addRider', error);
    return {
      success: false,
      message: `Failed to add rider: ${error.message}`
    };
  }
}

/**
 * Updates an existing rider's information on the Riders sheet.
 * @param {object} riderData An object containing the rider's updated information, including their Rider ID.
 * @return {object} An object with 'success' (boolean) and 'message' (string) properties.
 */
function updateRider(riderData) {
  try {
    console.log('📝 Updating rider:', JSON.stringify(riderData, null, 2));
    
    const riderIdField = CONFIG.columns.riders.jpNumber;
  const riderId = riderData[riderIdField];

  if (!riderId) {
    throw new Error(`Missing Rider ID (${riderIdField}) in update data`);
  }

    // Validate payroll number if provided
    if (riderData[CONFIG.columns.riders.payrollNumber]) {
      const payroll = String(riderData[CONFIG.columns.riders.payrollNumber]).trim();
      if (!/^\d{5,8}$/.test(payroll)) {
        throw new Error('Payroll Number must be 5-8 digits');
      }
    }
    
    // Fetch current sheet data
    const sheetData = getSheetData(CONFIG.sheets.riders, false); // Force fresh data for updates
    
    if (!sheetData || !sheetData.data || sheetData.data.length === 0) {
      throw new Error('No rider data found in sheet');
    }
    
    // Find the rider to update
    const riderIdIndex = sheetData.columnMap[riderIdField];
    if (riderIdIndex === undefined) {
      throw new Error(`Column "${riderIdField}" not found in Riders sheet`);
    }
    
    let targetRowIndex = -1;
    for (let i = 0; i < sheetData.data.length; i++) {
      if (String(sheetData.data[i][riderIdIndex]).trim() === String(riderId).trim()) {
        targetRowIndex = i;
        break;
      }
    }
    
    if (targetRowIndex === -1) {
      throw new Error(`Rider with ID "${riderId}" not found`);
    }
    
    // Normalize update data keys to handle header inconsistencies
    const normalizedData = {};
    Object.keys(riderData).forEach(key => {
      normalizedData[normalizeColumnName(key)] = riderData[key];
    });

    // Handle possible variations of the part time field
    const normalizedPartTime =
      normalizedData['part time'] ||
      normalizedData['part-time'] ||
      normalizedData['parttimerider'] ||
      normalizedData['part time rider'] ||
      normalizedData['parttime'];

    if (normalizedPartTime !== undefined) {
      // Ensure we map the value to all normalized variations so the header match
      // succeeds regardless of the column name used in the sheet.
      normalizedData['part time'] = normalizedPartTime;
      normalizedData['part time rider'] = normalizedPartTime;
      normalizedData['parttimerider'] = normalizedPartTime;
    }

    // Create updated row array using normalized matching
    const updatedRowArray = sheetData.headers.map((header, headerIndex) => {
      const normalizedHeader = normalizeColumnName(header);

      if (normalizedData.hasOwnProperty(normalizedHeader)) {
        return normalizedData[normalizedHeader];
      }

      // Otherwise, preserve the existing value
      return sheetData.data[targetRowIndex][headerIndex];
    });
    
    // Calculate actual sheet row number (data index + 2 for header and 0-based indexing)
    const sheetRowNumber = targetRowIndex + 2;
    
    // Update the row in the sheet
    const sheet = sheetData.sheet;
    sheet.getRange(sheetRowNumber, 1, 1, updatedRowArray.length).setValues([updatedRowArray]);
    SpreadsheetApp.flush(); // Ensure changes are written
    
    // Clear cache to refresh data
    dataCache.clear('sheet_' + CONFIG.sheets.riders);
    
    const successMessage = `Rider "${riderData[CONFIG.columns.riders.name] || riderId}" updated successfully`;
    console.log(`✅ ${successMessage}`);
    logActivity(successMessage);
    
    return {
      success: true,
      message: 'Rider updated successfully.',
      riderId: riderId
    };
    
  } catch (error) {
    console.error('❌ Error updating rider:', error);
    logError('Error in updateRider', error);
    return {
      success: false,
      message: `Failed to update rider: ${error.message}`
    };
  }
}

/**
 * Deletes a rider from the Riders sheet.
 * @param {string|number} riderId The Rider ID of the rider to delete.
 * @return {object} An object with 'success' (boolean) and 'message' (string) properties.
 */
function deleteRider(riderId) {
  try {
    console.log(`🗑️ Deleting rider with ID: ${riderId}`);
    
    if (!riderId) {
      throw new Error('Rider ID is required for deletion');
    }
    
    // Check if rider has any active assignments
    const hasActiveAssignments = checkRiderActiveAssignments(riderId);
    if (hasActiveAssignments) {
      throw new Error('Cannot delete rider with active assignments. Please complete or reassign their assignments first.');
    }
    
    // Fetch current sheet data
    const sheetData = getSheetData(CONFIG.sheets.riders, false); // Force fresh data for deletions
    
    if (!sheetData || !sheetData.data || sheetData.data.length === 0) {
      throw new Error('No rider data found in sheet');
    }
    
    // Find the rider to delete
    const riderIdField = CONFIG.columns.riders.jpNumber;
    const riderIdIndex = sheetData.columnMap[riderIdField];
    
    if (riderIdIndex === undefined) {
      throw new Error(`Column "${riderIdField}" not found in Riders sheet`);
    }
    
    let targetRowIndex = -1;
    let riderName = 'Unknown';
    
    for (let i = 0; i < sheetData.data.length; i++) {
      if (String(sheetData.data[i][riderIdIndex]).trim() === String(riderId).trim()) {
        targetRowIndex = i;
        // Get rider name for logging
        const nameIndex = sheetData.columnMap[CONFIG.columns.riders.name];
        if (nameIndex !== undefined) {
          riderName = sheetData.data[i][nameIndex] || 'Unknown';
        }
        break;
      }
    }
    
    if (targetRowIndex === -1) {
      throw new Error(`Rider with ID "${riderId}" not found`);
    }
    
    // Calculate actual sheet row number (data index + 2 for header and 0-based indexing)
    const sheetRowNumber = targetRowIndex + 2;
    
    // Delete the row from the sheet
    const sheet = sheetData.sheet;
    sheet.deleteRow(sheetRowNumber);
    SpreadsheetApp.flush(); // Ensure changes are written
    
    // Clear cache to refresh data
    dataCache.clear('sheet_' + CONFIG.sheets.riders);
    
    const successMessage = `Rider "${riderName}" (ID: ${riderId}) deleted successfully`;
    console.log(`✅ ${successMessage}`);
    logActivity(successMessage);
    
    return {
      success: true,
      message: 'Rider deleted successfully.',
      riderId: riderId,
      riderName: riderName
    };
    
  } catch (error) {
    console.error(`❌ Error deleting rider ${riderId}:`, error);
    logError(`Error in deleteRider for ID ${riderId}`, error);
    return {
      success: false,
      message: `Failed to delete rider: ${error.message}`
    };
  }
}

/**
 * Helper function to map a sheet row to a rider object.
 * @param {Array} row The row data array.
 * @param {object} columnMap The column mapping object.
 * @param {Array} headers The sheet headers array.
 * @return {object} A rider object with properly mapped properties.
 */
function mapRowToRiderObject(row, columnMap, headers) {
  const rider = {};
  
  // Map each header to its corresponding value
  headers.forEach((header, index) => {
    rider[header] = row[index] || '';
  });
  
  // Add convenient access properties using CONFIG column names
  rider.jpNumber = getColumnValue(row, columnMap, CONFIG.columns.riders.jpNumber);
  if (!rider.jpNumber) {
    rider.jpNumber = getColumnValue(row, columnMap, 'JP Number') ||
                     getColumnValue(row, columnMap, 'Rider ID') ||
                     getColumnValue(row, columnMap, 'ID') || '';
  }
  rider.payrollNumber = getColumnValue(row, columnMap, CONFIG.columns.riders.payrollNumber) || '';
  rider.name = getColumnValue(row, columnMap, CONFIG.columns.riders.name);
  if (!rider.name) {
    rider.name = getColumnValue(row, columnMap, 'Full Name') ||
                 getColumnValue(row, columnMap, 'Name') || '';
  }
  rider.phone = getColumnValue(row, columnMap, CONFIG.columns.riders.phone) || '';
  // Be flexible about email header variations
  rider.email = getColumnValue(row, columnMap, CONFIG.columns.riders.email) ||
                getColumnValue(row, columnMap, 'Google Email') ||
                getColumnValue(row, columnMap, 'Email Address') ||
                getColumnValue(row, columnMap, 'E-mail') || '';
  rider.status = getColumnValue(row, columnMap, CONFIG.columns.riders.status) || 'Active';
  rider.platoon = getColumnValue(row, columnMap, CONFIG.columns.riders.platoon) || '';
  let partTimeVal = getColumnValue(row, columnMap, CONFIG.columns.riders.partTime);
  if (partTimeVal === null || partTimeVal === '') {
    partTimeVal = getColumnValue(row, columnMap, 'Part Time Rider');
  }
  if (partTimeVal === null || partTimeVal === '') {
    partTimeVal = getColumnValue(row, columnMap, 'Part-Time');
  }
  rider.partTime = partTimeVal || 'No';
  rider.certification = getColumnValue(row, columnMap, CONFIG.columns.riders.certification) || '';
  rider.organization = getColumnValue(row, columnMap, CONFIG.columns.riders.organization) || '';
  rider.totalAssignments = getColumnValue(row, columnMap, CONFIG.columns.riders.totalAssignments) || 0;
  rider.lastAssignmentDate = getColumnValue(row, columnMap, CONFIG.columns.riders.lastAssignmentDate) || '';
  
  return rider;
}

/**
 * Checks if a rider has any active assignments that would prevent deletion.
 * @param {string|number} riderId The Rider ID to check.
 * @return {boolean} True if the rider has active assignments, false otherwise.
 */
function checkRiderActiveAssignments(riderId) {
  try {
    console.log(`🔍 Checking active assignments for rider ${riderId}`);
    
    // Get rider name first
    const rider = getRiderDetails(riderId);
    if (!rider) {
      return false; // If rider doesn't exist, no assignments to worry about
    }
    
    const riderName = rider.name;
    
    // Check assignments sheet for active assignments
    const assignmentsData = getAssignmentsData();
    
    if (!assignmentsData || !assignmentsData.data || assignmentsData.data.length === 0) {
      return false; // No assignments data
    }
    
    // Look for assignments where this rider is assigned and status is active
    const activeStatuses = ['Assigned', 'Confirmed', 'En Route', 'In Progress'];
    
    const activeAssignments = assignmentsData.data.filter(row => {
      const assignmentRiderName = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.riderName);
      const assignmentStatus = getColumnValue(row, assignmentsData.columnMap, CONFIG.columns.assignments.status);
      
      return assignmentRiderName === riderName && activeStatuses.includes(assignmentStatus);
    });
    
    const hasActiveAssignments = activeAssignments.length > 0;
    
    if (hasActiveAssignments) {
      console.log(`⚠️ Rider ${riderName} has ${activeAssignments.length} active assignment(s)`);
    } else {
      console.log(`✅ Rider ${riderName} has no active assignments`);
    }
    
    return hasActiveAssignments;
    
  } catch (error) {
    console.error(`❌ Error checking active assignments for rider ${riderId}:`, error);
    logError(`Error in checkRiderActiveAssignments for rider ${riderId}`, error);
    // Return true as a safety measure - if we can't check, don't allow deletion
    return true;
  }
}
/**
 * Comprehensive diagnostic function to identify rider count discrepancies
 * Add this function to your Code.gs or RiderCRUD.gs file
 */
function diagnoseRiderCountDiscrepancy() {
  try {
    console.log('🔍 === RIDER COUNT DIAGNOSTIC STARTING ===');
    
    // Get raw sheet data
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.riders);
    if (!sheet) {
      console.error('❌ Riders sheet not found');
      return { error: 'Riders sheet not found' };
    }
    
    // Get all sheet data including empty rows
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const allRows = allData.slice(1); // Remove header row
    
    console.log(`📊 Sheet Analysis:`);
    console.log(`   Total rows (including header): ${allData.length}`);
    console.log(`   Data rows (excluding header): ${allRows.length}`);
    console.log(`   Headers:`, headers);
    
    // Analyze each row for content
    let totalRowsWithData = 0;
    let totalEmptyRows = 0;
    let ridersWithNames = 0;
    let ridersWithIds = 0;
    let ridersWithPhones = 0;
    let activeRiders = 0;
    let inactiveRiders = 0;
    let ridersWithoutStatus = 0;
    
    const nameColumnIndex = headers.indexOf(CONFIG.columns.riders.name);
    const idColumnIndex = headers.indexOf(CONFIG.columns.riders.jpNumber);
    const phoneColumnIndex = headers.indexOf(CONFIG.columns.riders.phone);
    const statusColumnIndex = headers.indexOf(CONFIG.columns.riders.status);
    
    console.log(`🔍 Column Analysis:`);
    console.log(`   Name column (${CONFIG.columns.riders.name}) at index: ${nameColumnIndex}`);
    console.log(`   ID column (${CONFIG.columns.riders.jpNumber}) at index: ${idColumnIndex}`);
    console.log(`   Phone column (${CONFIG.columns.riders.phone}) at index: ${phoneColumnIndex}`);
    console.log(`   Status column (${CONFIG.columns.riders.status}) at index: ${statusColumnIndex}`);
    
    // Detailed row analysis
    const rowAnalysis = [];
    
    allRows.forEach((row, index) => {
      const rowNumber = index + 2; // Account for header row
      
      // Check if row has any data
      const hasAnyData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
      
      if (hasAnyData) {
        totalRowsWithData++;
        
        const name = nameColumnIndex >= 0 ? String(row[nameColumnIndex] || '').trim() : '';
        const riderId = idColumnIndex >= 0 ? String(row[idColumnIndex] || '').trim() : '';
        const phone = phoneColumnIndex >= 0 ? String(row[phoneColumnIndex] || '').trim() : '';
        const status = statusColumnIndex >= 0 ? String(row[statusColumnIndex] || '').trim() : '';
        
        const analysis = {
          rowNumber: rowNumber,
          hasName: name.length > 0,
          hasId: riderId.length > 0,
          hasPhone: phone.length > 0,
          status: status || 'No Status',
          name: name || 'No Name',
          riderId: riderId || 'No ID',
          phone: phone || 'No Phone'
        };
        
        // Count by criteria
        if (name.length > 0) ridersWithNames++;
        if (riderId.length > 0) ridersWithIds++;
        if (phone.length > 0) ridersWithPhones++;
        
        if (status.toLowerCase() === 'active') {
          activeRiders++;
        } else if (status.toLowerCase() === 'inactive') {
          inactiveRiders++;
        } else if (status === '') {
          ridersWithoutStatus++;
        }
        
        rowAnalysis.push(analysis);
        
        // Log first 5 and last 5 for debugging
        if (index < 5 || index >= allRows.length - 5) {
          console.log(`   Row ${rowNumber}: Name="${name}" ID="${riderId}" Status="${status}" HasData=${hasAnyData}`);
        }
      } else {
        totalEmptyRows++;
      }
    });
    
    console.log(`📈 Count Summary:`);
    console.log(`   Rows with any data: ${totalRowsWithData}`);
    console.log(`   Empty rows: ${totalEmptyRows}`);
    console.log(`   Riders with names: ${ridersWithNames}`);
    console.log(`   Riders with IDs: ${ridersWithIds}`);
    console.log(`   Riders with phones: ${ridersWithPhones}`);
    console.log(`   Active riders: ${activeRiders}`);
    console.log(`   Inactive riders: ${inactiveRiders}`);
    console.log(`   Riders without status: ${ridersWithoutStatus}`);
    
    // Test your existing functions
    console.log(`🧪 Testing Existing Functions:`);
    
    try {
      const ridersFromFunction = getRiders();
      console.log(`   getRiders() returned: ${ridersFromFunction.length} riders`);
    } catch (error) {
      console.log(`   getRiders() error: ${error.message}`);
    }
    
    try {
      const activeFromFunction = getActiveRidersManagement();
      console.log(`   getActiveRidersManagement() returned: ${activeFromFunction.length} riders`);
    } catch (error) {
      console.log(`   getActiveRidersManagement() error: ${error.message}`);
    }
    
    try {
      const ridersData = getRidersData();
      console.log(`   getRidersData() returned: ${ridersData.data ? ridersData.data.length : 0} rows`);
    } catch (error) {
      console.log(`   getRidersData() error: ${error.message}`);
    }
    
    // Check for the most likely issue: different counting criteria
    console.log(`🎯 Likely Issues Identified:`);
    
    if (totalRowsWithData !== ridersWithNames) {
      console.log(`   ⚠️ ISSUE: ${totalRowsWithData} rows have data, but only ${ridersWithNames} have names`);
      console.log(`   💡 SOLUTION: Empty name fields are being counted in total but filtered out in display`);
    }
    
    if (totalRowsWithData !== ridersWithIds) {
      console.log(`   ⚠️ ISSUE: ${totalRowsWithData} rows have data, but only ${ridersWithIds} have IDs`);
      console.log(`   💡 SOLUTION: Empty ID fields are being counted in total but filtered out in display`);
    }
    
    if (ridersWithoutStatus > 0) {
      console.log(`   ⚠️ ISSUE: ${ridersWithoutStatus} riders have no status set`);
      console.log(`   💡 SOLUTION: Riders without status might be excluded from active counts`);
    }
    
    // Identify the exact discrepancy pattern
    const discrepancy = totalRowsWithData - ridersWithNames;
    if (discrepancy > 0) {
      console.log(`\n🔍 Analyzing ${discrepancy} rows with data but no names:`);
      
      rowAnalysis.filter(r => !r.hasName).slice(0, 10).forEach(row => {
        console.log(`   Row ${row.rowNumber}: ID="${row.riderId}" Phone="${row.phone}" Status="${row.status}"`);
      });
    }
    
    console.log('\n🔍 === DIAGNOSTIC COMPLETE ===');
    
    return {
      success: true,
      summary: {
        totalRowsWithData,
        totalEmptyRows,
        ridersWithNames,
        ridersWithIds,
        ridersWithPhones,
        activeRiders,
        inactiveRiders,
        ridersWithoutStatus,
        discrepancy: totalRowsWithData - ridersWithNames
      },
      rowAnalysis: rowAnalysis.slice(0, 20), // Return first 20 for review
      recommendations: [
        discrepancy > 0 ? 'Clean up rows with data but no names' : 'Row data is consistent',
        ridersWithoutStatus > 0 ? `Set status for ${ridersWithoutStatus} riders without status` : 'All riders have status',
        totalEmptyRows > 5 ? 'Consider removing empty rows for cleaner data' : 'Empty row count is acceptable'
      ]
    };
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Quick fix function to clean up rider data
 * Run this AFTER running the diagnostic to understand what will be cleaned
 */
function cleanupRiderData() {
  try {
    console.log('🧹 Starting rider data cleanup...');
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.riders);
    if (!sheet) {
      throw new Error('Riders sheet not found');
    }
    
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const allRows = allData.slice(1);
    
    const nameColumnIndex = headers.indexOf(CONFIG.columns.riders.name);
    const idColumnIndex = headers.indexOf(CONFIG.columns.riders.jpNumber);
    const statusColumnIndex = headers.indexOf(CONFIG.columns.riders.status);
    
    let rowsDeleted = 0;
    let rowsUpdated = 0;
    
    // Process rows from bottom to top to avoid index shifting during deletion
    const pendingStatusUpdates = [];
    for (let i = allRows.length - 1; i >= 0; i--) {
      const row = allRows[i];
      const rowNumber = i + 2; // Account for header
      
      const hasAnyData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
      const name = nameColumnIndex >= 0 ? String(row[nameColumnIndex] || '').trim() : '';
      const riderId = idColumnIndex >= 0 ? String(row[idColumnIndex] || '').trim() : '';
      const status = statusColumnIndex >= 0 ? String(row[statusColumnIndex] || '').trim() : '';
      
      // Delete rows that have some data but no name AND no ID
      if (hasAnyData && !name && !riderId) {
        console.log(`🗑️ Deleting row ${rowNumber}: No name or ID`);
        sheet.deleteRow(rowNumber);
        rowsDeleted++;
        continue;
      }
      
      // Set default status for riders with name but no status
      if (name && !status && statusColumnIndex >= 0) {
        console.log(`📝 Setting default status for row ${rowNumber}: ${name}`);
        pendingStatusUpdates.push({ row: rowNumber, col: statusColumnIndex + 1, value: 'Active' });
        rowsUpdated++;
      }
    }

    // Apply all pending status updates in a batch
    if (pendingStatusUpdates.length > 0 && typeof batchUpdateCells === 'function') {
      batchUpdateCells(sheet, pendingStatusUpdates);
    }
    
    // Clear cache after cleanup
    dataCache.clear('sheet_' + CONFIG.sheets.riders);
    
    const message = `Cleanup complete: ${rowsDeleted} rows deleted, ${rowsUpdated} rows updated`;
    console.log(`✅ ${message}`);
    logActivity(`Rider data cleanup: ${message}`);
    
    SpreadsheetApp.getUi().alert('Cleanup Complete', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
    return {
      success: true,
      rowsDeleted,
      rowsUpdated,
      message
    };
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    logError('Error in cleanupRiderData', error);
    SpreadsheetApp.getUi().alert('Cleanup Error', error.message, SpreadsheetApp.getUi().ButtonSet.OK);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Alternative count function that matches the display logic
 * Use this to get consistent counts
 */
function getConsistentRiderCount() {
  try {
    const ridersData = getRidersData();
    
    if (!ridersData || !ridersData.data || ridersData.data.length === 0) {
      return 0;
    }
    
    // Count riders using the same criteria as display
    const validRiders = ridersData.data.filter(row => {
      const name = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.name);
      const riderId = getColumnValue(row, ridersData.columnMap, CONFIG.columns.riders.jpNumber);
      
      // A rider is valid if they have either a name OR an ID
      return (name && String(name).trim().length > 0) || 
             (riderId && String(riderId).trim().length > 0);
    });
    
    console.log(`📊 Consistent rider count: ${validRiders.length}`);
    return validRiders.length;
    
  } catch (error) {
    console.error('❌ Error getting consistent rider count:', error);
    return 0;
  }
}
/**
 * Gets riders filtered by status.
 * @param {string} status The status to filter by (e.g., 'Active', 'Inactive').
 * @return {Array<object>} An array of rider objects matching the status.
 */
function getRidersByStatus(status) {
  try {
    console.log(`📋 Fetching riders with status: ${status}`);
    
    const allRiders = getRiders();
    
    if (!status) {
      return allRiders;
    }
    
    const filteredRiders = allRiders.filter(rider => {
      return String(rider.status || '').toLowerCase() === String(status).toLowerCase();
    });
    
    console.log(`✅ Found ${filteredRiders.length} riders with status: ${status}`);
    return filteredRiders;
    
  } catch (error) {
    console.error(`❌ Error fetching riders by status ${status}:`, error);
    logError(`Error in getRidersByStatus for status ${status}`, error);
    return [];
  }
}

/**
 * Gets active riders (convenience function for getRidersByStatus('Active')).
 * @return {Array<object>} An array of active rider objects.
 */
function getActiveRidersManagement() {
  return getRidersByStatus('Active');
}

/**
 * Updates a rider's assignment statistics (total assignments and last assignment date).
 * This should be called when assignments are completed.
 * @param {string} riderName The name of the rider to update.
 * @param {Date} [assignmentDate=new Date()] The date of the assignment.
 * @return {object} Result object indicating success or failure.
 */
function updateRiderAssignmentStats(riderName, assignmentDate = new Date()) {
  try {
    console.log(`📊 Updating assignment stats for rider: ${riderName}`);
    
    if (!riderName) {
      throw new Error('Rider name is required');
    }
    
    // Find rider by name
    const allRiders = getRiders();
    const rider = allRiders.find(r => r.name === riderName);
    
    if (!rider) {
      throw new Error(`Rider "${riderName}" not found`);
    }
    
    // Calculate updated stats
    const currentTotal = parseInt(rider.totalAssignments) || 0;
    const newTotal = currentTotal + 1;
    
    // Prepare update data
    const updateData = {
      [CONFIG.columns.riders.jpNumber]: rider.jpNumber, // Required for identification
      [CONFIG.columns.riders.totalAssignments]: newTotal,
      [CONFIG.columns.riders.lastAssignmentDate]: assignmentDate
    };
    
    // Update the rider
    const result = updateRider(updateData);
    
    if (result.success) {
      console.log(`✅ Updated assignment stats for ${riderName}: Total assignments now ${newTotal}`);
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ Error updating assignment stats for rider ${riderName}:`, error);
    logError(`Error in updateRiderAssignmentStats for rider ${riderName}`, error);
    return {
      success: false,
      message: `Failed to update assignment stats: ${error.message}`
    };
  }
}

/**
 * Validates rider data before add/update operations.
 * @param {object} riderData The rider data to validate.
 * @param {boolean} [isUpdate=false] Whether this is for an update operation.
 * @return {object} Validation result with success flag and any error messages.
 */
function validateRiderData(riderData, isUpdate = false) {
  try {
    console.log('🔍 Validating rider data:', riderData);
    const errors = [];
    
    // Required fields for new riders
    if (!isUpdate) {
      const requiredFields = [
        { field: CONFIG.columns.riders.jpNumber, name: 'Rider ID' },
        { field: CONFIG.columns.riders.name, name: 'Full Name' },
        { field: CONFIG.columns.riders.phone, name: 'Phone Number' }
      ];
      
      requiredFields.forEach(({ field, name }) => {
        const value = riderData[field];
        if (!value || String(value).trim() === '') {
          errors.push(`${name} is required`);
        }
      });
    }
    
    // Validate phone number format
    if (riderData[CONFIG.columns.riders.phone]) {
      const phone = String(riderData[CONFIG.columns.riders.phone]).replace(/\D/g, '');
      if (phone.length !== 10) {
        errors.push('Phone number must be 10 digits');
      }
    }
    
    // Validate email format if provided
    if (riderData[CONFIG.columns.riders.email]) {
      const email = String(riderData[CONFIG.columns.riders.email]).trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && !emailRegex.test(email)) {
        errors.push('Invalid email format');
      }
    }
    
    // FIXED: More flexible certification validation
    if (riderData[CONFIG.columns.riders.certification]) {
      const validCertifications = [
        'Standard', 
        'Advanced', 
        'Instructor', 
        'Trainee', 
        'Not Certified',
        'NotCertified',  // Alternative without space
        'None'           // Another alternative
      ];
      
      const certification = String(riderData[CONFIG.columns.riders.certification]).trim();
      console.log(`🎯 Checking certification: "${certification}"`);
      
      if (!validCertifications.includes(certification)) {
        console.warn(`⚠️ Invalid certification: "${certification}"`);
        console.log('Valid options:', validCertifications);
        errors.push(`Certification must be one of: ${validCertifications.slice(0, 5).join(', ')}`);
      } else {
        console.log(`✅ Certification "${certification}" is valid`);
      }
    }
    
    // Validate status if provided
    if (riderData[CONFIG.columns.riders.status]) {
      const validStatuses = CONFIG.options?.riderStatuses || ['Active', 'Inactive', 'Vacation', 'Training', 'Suspended'];
      if (!validStatuses.includes(riderData[CONFIG.columns.riders.status])) {
        errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
      }
    }

    if (riderData[CONFIG.columns.riders.platoon]) {
      const platoon = String(riderData[CONFIG.columns.riders.platoon]).trim();
      const validPlatoons = CONFIG.options?.platoons || ['A', 'B'];
      if (platoon && !validPlatoons.includes(platoon)) {
        errors.push('Platoon must be A or B');
      }
    }
    
    const isValid = errors.length === 0;
    console.log(`🎯 Validation result: ${isValid ? 'PASSED' : 'FAILED'}`);
    if (!isValid) {
      console.log('❌ Validation errors:', errors);
    }
    
    return {
      success: isValid,
      errors: errors,
      message: errors.length > 0 ? errors.join('; ') : 'Validation passed'
    };
    
  } catch (error) {
    console.error('❌ Error validating rider data:', error);
    return {
      success: false,
      errors: ['Validation error occurred'],
      message: `Validation failed: ${error.message}`
    };
  }
}

/**
 * Exports rider data to CSV format.
 * @param {string} [status=null] Optional status filter ('Active', 'Inactive', etc.).
 * @return {object} Result object with CSV data or error message.
 */
function exportRidersToCSV(status = null) {
  try {
    console.log(`📊 Exporting riders to CSV${status ? ` (status: ${status})` : ''}`);
    
    const riders = status ? getRidersByStatus(status) : getRiders();
    
    if (riders.length === 0) {
      return {
        success: false,
        message: 'No riders found to export'
      };
    }
    
    // Get headers from CONFIG
    const headers = Object.values(CONFIG.columns.riders);
    
    // Create CSV content
    const csvRows = [headers.join(',')];
    
    riders.forEach(rider => {
      const row = headers.map(header => {
        const value = rider[header] || '';
        // Escape commas and quotes in CSV
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    
    console.log(`✅ Exported ${riders.length} riders to CSV`);
    
    return {
      success: true,
      csvContent: csvContent,
      filename: `riders_export_${new Date().toISOString().split('T')[0]}.csv`,
      count: riders.length
    };
    
  } catch (error) {
    console.error('❌ Error exporting riders to CSV:', error);
    logError('Error in exportRidersToCSV', error);
    return {
      success: false,
      message: `Export failed: ${error.message}`
    };
  }
}

/**
 * Bulk update riders' status.
 * @param {Array<string>} riderIds Array of rider IDs to update.
 * @param {string} newStatus The new status to set.
 * @return {object} Result object with success counts and any errors.
 */
function bulkUpdateRiderStatus(riderIds, newStatus) {
  try {
    console.log(`📊 Bulk updating ${riderIds.length} riders to status: ${newStatus}`);
    
    if (!Array.isArray(riderIds) || riderIds.length === 0) {
      throw new Error('Rider IDs array is required');
    }
    
    if (!newStatus) {
      throw new Error('New status is required');
    }
    
    let successCount = 0;
    let failureCount = 0;
    const errors = [];
    
    riderIds.forEach(riderId => {
      try {
        const rider = getRiderDetails(riderId);
        if (!rider) {
          errors.push(`Rider ${riderId} not found`);
          failureCount++;
          return;
        }
        
        const updateData = {
          [CONFIG.columns.riders.jpNumber]: riderId,
          [CONFIG.columns.riders.status]: newStatus
        };
        
        const result = updateRider(updateData);
        if (result.success) {
          successCount++;
        } else {
          errors.push(`${riderId}: ${result.message}`);
          failureCount++;
        }
        
      } catch (error) {
        errors.push(`${riderId}: ${error.message}`);
        failureCount++;
      }
    });
    
    const message = `Bulk update completed: ${successCount} successful, ${failureCount} failed`;
    console.log(`✅ ${message}`);
    logActivity(message);
    
    return {
      success: successCount > 0,
      successCount: successCount,
      failureCount: failureCount,
      errors: errors,
      message: message
    };
    
  } catch (error) {
    console.error('❌ Error in bulk update rider status:', error);
    logError('Error in bulkUpdateRiderStatus', error);
    return {
      success: false,
      successCount: 0,
      failureCount: riderIds ? riderIds.length : 0,
      message: `Bulk update failed: ${error.message}`
    };
  }
}
/**
 * DEBUG FUNCTION: Test certification saving
 */
function testCertificationSave() {
  try {
    console.log('🧪 Testing certification save...');
    
    const testData = {
      'Rider ID': 'TEST001',
      'Full Name': 'Test Rider',
      'Phone Number': '5551234567',
      'Email': 'test@example.com',
      'Status': 'Active',
      'Certification': 'Not Certified'  // Test the problematic value
    };
    
    console.log('📤 Testing with data:', testData);
    
    // Test validation
    const validation = validateRiderData(testData, false);
    console.log('🔍 Validation result:', validation);
    
    if (validation.success) {
      console.log('✅ Validation passed for "Not Certified"');
    } else {
      console.log('❌ Validation failed:', validation.errors);
    }
    
    return validation;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}
/**
 * QUICK FIX: Function to immediately resolve the riders issue
 * Call this if you want to quickly fix the problem
 */
function quickFixRidersIssue() {
  try {
    console.log('⚡ Applying quick fix for riders issue...');
    
    const result = {
      success: false,
      actions: [],
      finalResult: {}
    };
    
    // Action 1: Ensure riders sheet has proper headers
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.riders);
    if (!sheet) {
      throw new Error('Riders sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length === 0) {
      // Create headers
      const headers = Object.values(CONFIG.columns.riders);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      result.actions.push('Added proper headers to riders sheet');
    }
    
    // Action 2: Ensure there's at least one test rider
    if (data.length < 2) {
      const testRider = [
        'TEST001',           // Rider ID
        'Test Rider',        // Full Name
        '555-0123',          // Phone Number
        'test@example.com',  // Email
        'Active',            // Status
        'Standard',          // Certification
        0,                   // Total Assignments
        ''                   // Last Assignment Date
      ];
      
      sheet.appendRow(testRider);
      result.actions.push('Added test rider');
    }
    
    // Action 3: Fix any empty statuses
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusColIndex = headers.findIndex(h => 
      h === CONFIG.columns.riders.status || h === 'Status'
    );
    
    if (statusColIndex >= 0) {
      const allData = sheet.getDataRange().getValues();
      let fixedCount = 0;
      
      const statusUpdates = [];
      for (let i = 1; i < allData.length; i++) {
        const name = allData[i][1] || allData[i][0];
        const status = allData[i][statusColIndex];
        
        if (name && String(name).trim().length > 0 && 
            (!status || String(status).trim() === '')) {
          statusUpdates.push({ row: i + 1, col: statusColIndex + 1, value: 'Active' });
          fixedCount++;
        }
      }
      if (statusUpdates.length > 0 && typeof batchUpdateCells === 'function') {
        batchUpdateCells(sheet, statusUpdates);
      }
      
      if (fixedCount > 0) {
        result.actions.push(`Fixed ${fixedCount} empty statuses`);
      }
    }
    
    // Action 4: Clear cache
    dataCache.clear('sheet_' + CONFIG.sheets.riders);
    result.actions.push('Cleared data cache');
    
    // Action 5: Test the result
    const activeRiders = getActiveRidersForAssignments();
    result.finalResult = {
      activeRidersFound: activeRiders.length,
      sampleRider: activeRiders[0] || null
    };
    
    result.success = activeRiders.length > 0;
    
    console.log('⚡ Quick fix result:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Quick fix failed:', error);
    return {
      success: false,
      error: error.message,
      actions: []
    };
  }
}
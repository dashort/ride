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
    console.log('📋 Fetching all riders...');
    
    const sheetData = getSheetData(CONFIG.sheets.riders);
    
    if (!sheetData || !sheetData.data || sheetData.data.length === 0) {
      console.log('⚠️ No rider data found');
      return [];
    }
    
    const riders = sheetData.data.map((row, index) => {
      try {
        return mapRowToRiderObject(row, sheetData.columnMap, sheetData.headers);
      } catch (rowError) {
        console.warn(`⚠️ Error processing rider row ${index}:`, rowError);
        return null;
      }
    }).filter(rider => rider !== null); // Remove any failed rows
    
    console.log(`✅ Successfully fetched ${riders.length} riders`);
    return riders;
    
  } catch (error) {
    console.error('❌ Error fetching riders:', error);
    logError('Error in getRiders', error);
    return [];
  }
}

/**
 * Fetches details for a specific rider by their Rider ID.
 * @param {string|number} riderId The Rider ID (jpNumber) to search for.
 * @return {object|null} The rider object if found, otherwise null.
 */
function getRiderDetails(riderId) {
  try {
    console.log(`🔍 Fetching rider details for ID: ${riderId}`);
    
    if (!riderId) {
      console.warn('⚠️ No rider ID provided');
      return null;
    }
    
    const sheetData = getSheetData(CONFIG.sheets.riders);
    
    if (!sheetData || !sheetData.data || sheetData.data.length === 0) {
      console.log('⚠️ No rider data found');
      return null;
    }
    
    // Find the rider by ID
    const riderIdColumn = CONFIG.columns.riders.jpNumber;
    const riderIdIndex = sheetData.columnMap[riderIdColumn];
    
    if (riderIdIndex === undefined) {
      throw new Error(`Column "${riderIdColumn}" not found in Riders sheet`);
    }
    
    const targetRow = sheetData.data.find(row => {
      const rowRiderId = row[riderIdIndex];
      return String(rowRiderId).trim() === String(riderId).trim();
    });
    
    if (!targetRow) {
      console.log(`⚠️ Rider not found with ID: ${riderId}`);
      return null;
    }
    
    const rider = mapRowToRiderObject(targetRow, sheetData.columnMap, sheetData.headers);
    console.log(`✅ Found rider: ${rider.name || 'Unknown'}`);
    
    return rider;
    
  } catch (error) {
    console.error(`❌ Error fetching rider details for ID ${riderId}:`, error);
    logError(`Error in getRiderDetails for ID ${riderId}`, error);
    return null;
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
    
    // Create new row array based on headers
    const newRowArray = headers.map(header => {
      if (riderData.hasOwnProperty(header)) {
        return riderData[header];
      }
      
      // Set default values for specific columns
      switch (header) {
        case CONFIG.columns.riders.status:
          return 'Active';
        case CONFIG.columns.riders.totalAssignments:
          return 0;
        case CONFIG.columns.riders.lastAssignmentDate:
          return '';
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
    
    // Create updated row array
    const updatedRowArray = sheetData.headers.map((header, headerIndex) => {
      // If update data has this field, use the new value
      if (riderData.hasOwnProperty(header)) {
        return riderData[header];
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
  rider.jpNumber = getColumnValue(row, columnMap, CONFIG.columns.riders.jpNumber) || '';
  rider.name = getColumnValue(row, columnMap, CONFIG.columns.riders.name) || '';
  rider.phone = getColumnValue(row, columnMap, CONFIG.columns.riders.phone) || '';
  rider.email = getColumnValue(row, columnMap, CONFIG.columns.riders.email) || '';
  rider.status = getColumnValue(row, columnMap, CONFIG.columns.riders.status) || 'Active';
  rider.certification = getColumnValue(row, columnMap, CONFIG.columns.riders.certification) || '';
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
    const errors = [];
    
    // Required fields for new riders
    if (!isUpdate) {
      const requiredFields = [
        { field: CONFIG.columns.riders.jpNumber, name: 'Rider ID' },
        { field: CONFIG.columns.riders.name, name: 'Full Name' },
        { field: CONFIG.columns.riders.phone, name: 'Phone Number' }
      ];
      
      requiredFields.forEach(({ field, name }) => {
        if (!riderData[field] || String(riderData[field]).trim() === '') {
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
    
    // Validate status if provided
    if (riderData[CONFIG.columns.riders.status]) {
      const validStatuses = CONFIG.options.riderStatuses || ['Active', 'Inactive', 'Vacation', 'Training', 'Suspended'];
      if (!validStatuses.includes(riderData[CONFIG.columns.riders.status])) {
        errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
      }
    }
    
    return {
      success: errors.length === 0,
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
function getCurrentUser() {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    const userRoles = getUserRoles(userEmail);
    const userPermissions = calculatePermissions(userRoles);
    const userDisplayName = getUserDisplayName(userEmail);

    const user = {
      email: userEmail,
      name: userDisplayName,
      roles: userRoles,
      permissions: userPermissions
    };
    
    logActivity(`User ${user.email} logged in with roles: ${user.roles.join(', ')}`);
    return user;

  } catch (error) {
    logError('Error getting current user:', error);
    return {
      email: 'anonymous@example.com',
      name: 'Guest User',
      roles: ['guest'],
      permissions: ['view']
    };
  }
}
function getUserRoles(email) {
  const roleMapping = {
    'jpsotraffic@gmail.com': ['admin', 'dispatcher', 'rider'],
    // Add more specific email-to-role mappings here
  };

  // For general users, or if not mapped, provide a default role.
  // Be careful with default roles in a production environment.
  return roleMapping[email] || ['admin']; // Default to admin for now, but restrict in production!
}

/**
 * Calculates user permissions based on their assigned roles.
 * @param {Array<string>} roles An array of user roles.
 * @returns {Array<string>} An array of unique permissions.
 */
function calculatePermissions(roles) {
  const permissionMap = {
    admin: [
      'view', 'create_request', 'assign_riders', 'send_notifications',
      'update_status', 'manage_users', 'view_reports', 'system_config', 'export_data'
    ],
    dispatcher: [
      'view', 'create_request', 'assign_riders', 'send_notifications',
      'update_status', 'view_reports'
    ],
    rider: [
      'view', 'view_own_assignments', 'update_own_status'
    ],
    guest: ['view']
  };

  const permissions = new Set();
  roles.forEach(role => {
    if (permissionMap[role]) {
      permissionMap[role].forEach(permission => permissions.add(permission));
    }
  });
  return Array.from(permissions);
}

/**
 * Gets a displayable name for the user.
 * @param {string} email The user's email.
 * @returns {string} A formatted display name.
 */
function getUserDisplayName(email) {
  try {
    // Try to get rider name from riders sheet if it matches an email
    const ridersData = getRidersData();
    const riderEmailIdx = ridersData.columnMap[CONFIG.columns.riders.email];
    const riderNameIdx = ridersData.columnMap[CONFIG.columns.riders.name];

    if (riderEmailIdx !== undefined && riderNameIdx !== undefined) {
        const riderRow = ridersData.data.find(row => 
            String(row[riderEmailIdx] || '').toLowerCase() === String(email || '').toLowerCase()
        );
        if (riderRow) {
            return String(row[riderNameIdx] || '').trim();
        }
    }
    
    // Fallback to formatting email
    const namePart = email.split('@')[0];
    return namePart
      .replace(/[._-]/g, ' ') // Replace dots, underscores, hyphens with spaces
      .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
  } catch (error) {
    logError('Error getting user display name:', error);
    return 'User';
  }
}
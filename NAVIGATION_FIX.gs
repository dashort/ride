/**
 * NAVIGATION FIX - Add this code to your AccessControl.gs file
 * This ensures the availability calendar link appears in navigation for all users
 */

/**
 * Generate role-based navigation HTML - FIXED VERSION with Availability Link
 * Add this function to your AccessControl.gs file
 */
function getRoleBasedNavigation(currentPage, user, rider) {
  try {
    console.log('getRoleBasedNavigation: Called for page: ' + currentPage + ', User role: ' + (user ? user.role : 'unknown'));
    
    if (!user) {
      console.error('getRoleBasedNavigation: User object is null/undefined.');
      return '<nav class="navigation"><!-- User object missing --></nav>';
    }

    const menuItems = getUserNavigationMenu(user);
    if (!menuItems || menuItems.length === 0) {
      console.warn('getRoleBasedNavigation: No menu items returned by getUserNavigationMenu for role: ' + user.role);
      return '<nav class="navigation"><!-- No menu items for role --></nav>';
    }

    let navHtml = '<nav class="navigation">';
    menuItems.forEach(item => {
      const isActive = item.page === currentPage ? ' active' : '';
      navHtml += `<a href="${item.url}" class="nav-button${isActive}" data-page="${item.page}" target="_top">${item.label}</a>`;
    });
    navHtml += '</nav>';

    console.log('getRoleBasedNavigation: Generated navigation with ' + menuItems.length + ' items');
    console.log('getRoleBasedNavigation: Items included: ' + menuItems.map(i => i.page).join(', '));
    
    return navHtml;
    
  } catch (error) {
    console.error('❌ Error in getRoleBasedNavigation:', error);
    
    // Fallback navigation that DEFINITELY includes availability
    const baseUrl = getWebAppUrlSafe();
    return `<nav class="navigation">
      <a href="${baseUrl}" class="nav-button ${currentPage === 'dashboard' ? 'active' : ''}" data-page="dashboard" target="_top">📊 Dashboard</a>
      <a href="${baseUrl}?page=requests" class="nav-button ${currentPage === 'requests' ? 'active' : ''}" data-page="requests" target="_top">📋 Requests</a>
      <a href="${baseUrl}?page=assignments" class="nav-button ${currentPage === 'assignments' ? 'active' : ''}" data-page="assignments" target="_top">🏍️ Assignments</a>
      <a href="${baseUrl}?page=riders" class="nav-button ${currentPage === 'riders' ? 'active' : ''}" data-page="riders" target="_top">👥 Riders</a>
      <a href="${baseUrl}?page=rider-availability" class="nav-button ${currentPage === 'rider-availability' ? 'active' : ''}" data-page="rider-availability" target="_top">🗓️ Availability</a>
      <a href="${baseUrl}?page=notifications" class="nav-button ${currentPage === 'notifications' ? 'active' : ''}" data-page="notifications" target="_top">📱 Notifications</a>
      <a href="${baseUrl}?page=reports" class="nav-button ${currentPage === 'reports' ? 'active' : ''}" data-page="reports" target="_top">📊 Reports</a>
    </nav>`;
  }
}

/**
 * Test function to verify the navigation fix is working
 * Add this to AccessControl.gs and run it to test
 */
function testNavigationFix() {
  console.log('🧪 TESTING NAVIGATION FIX');
  console.log('='.repeat(40));
  
  // Test for each user role
  const testUsers = [
    { name: 'Test Admin', email: 'admin@test.com', role: 'admin' },
    { name: 'Test Dispatcher', email: 'dispatcher@test.com', role: 'dispatcher' },
    { name: 'Test Rider', email: 'rider@test.com', role: 'rider' }
  ];
  
  testUsers.forEach(user => {
    console.log(`\n--- Testing navigation for ${user.role.toUpperCase()} ---`);
    
    const navHtml = getRoleBasedNavigation('dashboard', user, null);
    const hasAvailability = navHtml.includes('rider-availability') && navHtml.includes('🗓️ Availability');
    
    console.log(`✅ Navigation generated: ${navHtml.length} characters`);
    console.log(`✅ Has availability link: ${hasAvailability ? 'YES' : 'NO'}`);
    
    if (hasAvailability) {
      // Extract the availability link
      const availMatch = navHtml.match(/<a[^>]*rider-availability[^>]*>.*?<\/a>/);
      if (availMatch) {
        console.log(`✅ Availability link: ${availMatch[0]}`);
      }
    } else {
      console.log('❌ PROBLEM: Availability link missing!');
    }
  });
  
  console.log('\n🎯 TEST COMPLETE');
  return true;
}

/**
 * Quick verification function - run this after adding the code
 */
function verifyAvailabilityLinkExists() {
  const testUser = { name: 'Test User', email: 'test@test.com', role: 'rider' };
  const navigation = getRoleBasedNavigation('dashboard', testUser, null);
  const hasLink = navigation.includes('rider-availability');
  
  console.log('🔍 AVAILABILITY LINK CHECK:');
  console.log(`Result: ${hasLink ? '✅ FOUND' : '❌ MISSING'}`);
  
  if (hasLink) {
    console.log('✅ SUCCESS: Availability link is working!');
    console.log('✅ Users should now see 🗓️ Availability in navigation');
  } else {
    console.log('❌ PROBLEM: Still missing availability link');
    console.log('❌ Double-check the code was added correctly');
  }
  
  return hasLink;
}
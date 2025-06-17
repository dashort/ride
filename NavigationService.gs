// This file will contain functions related to navigation within the web app.

/**
 * Safely gets role-based navigation HTML.
 * @param {string} currentPage The name of the current page (e.g., 'dashboard').
 * @param {object} user The user object, containing at least a 'role' property.
 * @param {object} rider The rider object (can be null if user is not a rider).
 * @return {string} HTML string for the navigation menu.
 */
function getRoleBasedNavigationSafe(currentPage, user, rider) {
  try {
    const baseUrl = Utils.getWebAppUrlSafe(); // Uses the utility function
    if (!user || !user.role) {
      console.warn("User or user.role is undefined in getRoleBasedNavigationSafe. Defaulting to no navigation.");
      return "<!-- User role not defined, navigation hidden -->";
    }

    const role = user.role;
    let menuItems = [];

    // Define menu items based on role
    // These URLs should point to the web app, typically using query parameters for pages
    const commonPages = [
      { page: 'dashboard', label: '📊 Dashboard', url: `${baseUrl}` },
      { page: 'requests', label: '📋 Requests', url: `${baseUrl}?page=requests` },
      { page: 'assignments', label: '🏍️ Assignments', url: `${baseUrl}?page=assignments` },
      { page: 'notifications', label: '📱 Notifications', url: `${baseUrl}?page=notifications` },
      { page: 'reports', label: '📊 Reports', url: `${baseUrl}?page=reports` }
    ];

    if (role === 'admin') {
      menuItems = [
        ...commonPages,
        { page: 'riders', label: '👥 Riders', url: `${baseUrl}?page=riders` },
        { page: 'user-management', label: '🔐 User Management', url: `${baseUrl}?page=user-management` },
        { page: 'admin-schedule', label: '🗓️ Manage Schedules', url: `${baseUrl}?page=admin-schedule` }
      ];
    } else if (role === 'dispatcher') {
      menuItems = [
        ...commonPages,
         { page: 'riders', label: '👥 Riders', url: `${baseUrl}?page=riders` } // Dispatchers might also view riders
      ];
    } else if (role === 'rider') {
      menuItems = [
        { page: 'dashboard', label: '📊 My Dashboard', url: `${baseUrl}` }, // Could be a specific rider dashboard
        { page: 'my-assignments', label: '🏍️ My Assignments', url: `${baseUrl}?page=my-assignments` },
        { page: 'rider-schedule', label: '📅 My Schedule', url: `${baseUrl}?page=rider-schedule` }
      ];
    } else {
      // Fallback for unknown roles or guests - minimal navigation
      menuItems = [{ page: 'dashboard', label: '📊 Dashboard', url: `${baseUrl}` }];
    }

    let navHtml = '<nav class="navigation">';
    menuItems.forEach(item => {
      const activeClass = (item.page === currentPage) ? ' active' : '';
      navHtml += `<a href="${item.url}" class="nav-button${activeClass}" data-page="${item.page}">${item.label}</a>`;
    });
    navHtml += '</nav>';

    return navHtml;

  } catch (error) {
    console.error('Error in getRoleBasedNavigationSafe:', error);
    Utils.logError('Error in getRoleBasedNavigationSafe', error); // Assuming Utils.logError is available
    // Fallback to a very basic navigation or an error message
    const baseUrlFallback = Utils.getWebAppUrlSafe();
    return `<nav class="navigation"><a href="${baseUrlFallback}" class="nav-button active" data-page="dashboard">📊 Dashboard</a><span style="color:red;padding-left:10px;">Nav Error</span></nav>`;
  }
}

/**
 * Safely adds navigation HTML to page content.
 * Removes existing navigation before injecting to prevent duplicates.
 * @param {string} content The original HTML content of the page.
 * @param {string} navigationHtml The HTML string for the navigation menu.
 * @return {string} The modified HTML content with the navigation menu.
 */
function addNavigationToContentSafe(content, navigationHtml) {
  try {
    if (typeof content !== 'string' || typeof navigationHtml !== 'string') {
      console.warn("Invalid input for addNavigationToContentSafe. Content or navigationHtml is not a string.");
      return content || ""; // Return original content or empty string if content is also invalid
    }

    // Remove any existing navigation of the same class to prevent duplicates
    content = content.replace(/<nav class="navigation">[\s\S]*?<\/nav>/g, '');
    // Also remove placeholder if it exists, in case it wasn't replaced for some reason
    content = content.replace(/<!--NAVIGATION_MENU_PLACEHOLDER-->/g, '');


    // Attempt to inject the new navigation
    if (content.includes('<!--NAVIGATION_MENU_PLACEHOLDER_NEW-->')) { // Using a new placeholder to be sure
      content = content.replace('<!--NAVIGATION_MENU_PLACEHOLDER_NEW-->', navigationHtml);
    } else if (content.includes('</header>')) {
      // Place it right after the header closing tag
      content = content.replace('</header>', `</header>\n${navigationHtml}`);
    } else {
      // Fallback: Try to inject it after the opening body tag
      const bodyTagMatch = content.match(/<body[^>]*>/i);
      if (bodyTagMatch && bodyTagMatch.length > 0) {
        content = content.replace(bodyTagMatch[0], `${bodyTagMatch[0]}\n${navigationHtml}`);
      } else {
        // If no body tag, prepend (less ideal, but a last resort)
        console.warn("No ideal injection point for navigation found (no </header> or <body> tag). Prepending navigation.");
        content = navigationHtml + content;
      }
    }
    return content;
  } catch (error) {
    console.error('Error in addNavigationToContentSafe:', error);
    Utils.logError('Error in addNavigationToContentSafe', error);
    return content; // Return original content on error
  }
}
>>>>>>> REPLACE

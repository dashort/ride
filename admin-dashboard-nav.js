        (function() {
            // Set up navigation links with proper web app URLs
            function setNavigationLinks(baseUrl) {
                console.log('🧭 Setting admin navigation links with base URL:', baseUrl);
                document.querySelectorAll('nav.navigation a').forEach(function(a) {
                    var page = a.getAttribute('data-page');
                    var href = page === 'admin-dashboard' ? baseUrl : baseUrl + '?page=' + page;
                    a.href = href;
                    a.dataset.url = href;
                    console.log('🔗 Set link for', page, ':', href);
                });
            }

            function setFallbackNavigationLinks() {
                console.log('🔗 Setting fallback admin navigation links');
                document.querySelectorAll('nav.navigation a').forEach(function(a) {
                    var page = a.getAttribute('data-page');
                    var href = page === 'admin-dashboard' ? 'admin-dashboard.html' : page + '.html';
                    a.href = href;
                    a.dataset.url = href;
                });
            }

            // Try to get the web app URL for navigation
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                console.log('🚀 Getting web app URL for admin navigation');
                google.script.run
                    .withSuccessHandler(setNavigationLinks)
                    .withFailureHandler(function(error) {
                        console.error('❌ Failed to get web app URL for admin navigation:', error);
                        setFallbackNavigationLinks();
                    })
                    .getWebAppUrl();
            } else {
                console.log('⚠️ Google Apps Script not available, using fallback admin navigation');
                setFallbackNavigationLinks();
            }

            // Navigation click handler
            function handleAdminNavigation(link) {
                var url = link.dataset.url || link.getAttribute('href');
                if (!url || url === '#') {
                    console.error('❌ No URL found for admin navigation link');
                    return false;
                }
                
                console.log('🔗 Admin navigating to:', url);
                
                try {
                    // Use top level navigation for proper page loads
                    if (window.top !== window) {
                        window.top.location.href = url;
                    } else {
                        window.location.href = url;
                    }
                } catch (e) {
                    console.error('❌ Admin navigation error:', e);
                    window.location.href = url;
                }
                return false;
            }

            // Initialize navigation when DOM is ready
            document.addEventListener('DOMContentLoaded', function() {
                console.log('🧭 Initializing admin navigation click handlers');
                document.querySelectorAll('nav.navigation a').forEach(function(link) {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        return handleAdminNavigation(this);
                    });
                });
                
                // Highlight current page
                var currentLink = document.querySelector('nav.navigation a[data-page="admin-dashboard"]');
                if (currentLink) {
                    currentLink.classList.add('active');
                    console.log('✅ Highlighted admin dashboard as current page');
                }
                
                console.log('✅ Admin navigation initialized successfully');
            });
        })();

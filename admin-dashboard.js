        // Initialize admin dashboard
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 Admin dashboard loading...');
            
            // Load user info first
            loadUserInfo();
            
            // Load dashboard data
            loadAdminDashboardData();
            loadRecentActivity();
            loadRecentNotifications();

            // Auto-refresh every 30 seconds
            setInterval(loadAdminDashboardData, 30000);
            
            // CRITICAL: Set a timeout to force fallback data if loading takes too long
            setTimeout(function() {
                console.log('⏰ Loading timeout reached, checking if fallback is needed...');
                const statsElements = ['totalRequests', 'totalRiders', 'totalAssignments', 'pendingNotifications'];
                let needsFallback = false;
                
                statsElements.forEach(statId => {
                    const element = document.getElementById(statId);
                    if (element && (element.textContent === '-' || element.textContent === 'Loading...')) {
                        needsFallback = true;
                    }
                });
                
                if (needsFallback) {
                    console.log('🔧 Forcing fallback data due to loading timeout');
                    updateDashboardStats(getDemoData());
                    updateRecentActivity(getDemoActivity());
                    updateRecentNotifications(getDemoNotifications());
                }
            }, 5000); // 5 second timeout
        });

        function loadUserInfo() {
            console.log('👤 Loading user info...');
            
            // Check if we're in a local environment
            const isLocal = window.location.hostname === 'localhost' || 
                           window.location.protocol === 'file:' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname.includes('8080');
                           
            if (isLocal) {
                console.log('🏠 Local environment detected, using demo user');
                updateUserDisplay({
                    name: 'Demo Admin',
                    email: 'admin@demo.com',
                    role: 'Admin'
                });
                return;
            }
            
            // Immediately set loading state with better UX
            updateUserDisplay({
                name: '...',
                email: '',
                role: 'Loading'
            });
            
            // Check if user info is available from global scope
            if (typeof window.currentUser !== 'undefined' && window.currentUser) {
                updateUserDisplay(window.currentUser);
                return;
            }
            
            // Try to get user info from Google Apps Script
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                // Reduced timeout for faster fallback (1.5 seconds)
                const userTimeout = setTimeout(function() {
                    console.log('⏰ User info timeout (1.5s), using fallback');
                    updateUserDisplay({
                        name: 'User',
                        email: '',
                        role: 'guest'
                    });
                }, 1500); // Reduced from 3000ms
                
                google.script.run
                    .withSuccessHandler(function(user) {
                        clearTimeout(userTimeout);
                        console.log('✅ User info loaded:', user);
                        updateUserDisplay(user);
                    })
                    .withFailureHandler(function(error) {
                        clearTimeout(userTimeout);
                        console.error('❌ Error loading user info:', error);
                        updateUserDisplay({
                            name: 'User',
                            email: '',
                            role: 'guest'
                        });
                    })
                    .getCurrentUser();
            } else {
                console.log('⚠️ Google Apps Script not available, using default user');
                updateUserDisplay({
                    name: 'User',
                    email: '',
                    role: 'guest'
                });
            }
        }

        function updateUserDisplay(user) {
            try {
                const safeUpdateElement = (id, value) => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.textContent = value;
                        console.log(`✅ Updated ${id}: ${value}`);
                    } else {
                        console.warn(`⚠️ Element ${id} not found`);
                    }
                };

                safeUpdateElement('userName', user.name || 'Admin User');
                safeUpdateElement('userRole', user.role || 'Admin');
                safeUpdateElement('userAvatar', (user.name || 'A').charAt(0).toUpperCase());

                console.log('✅ User display updated successfully');
            } catch (error) {
                console.error('❌ Error updating user display:', error);
            }
        }

        function loadAdminDashboardData() {
            console.log('📊 Loading admin dashboard data...');
            
            // Check if we're in a local environment
            const isLocal = window.location.hostname === 'localhost' || 
                           window.location.protocol === 'file:' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname.includes('8080');
                           
            if (isLocal) {
                console.log('🏠 Local environment detected, using demo data immediately');
                updateDashboardStats(getDemoData());
                return;
            }
            
            // Immediately show loading with better UX (dots instead of dashes)
            setStatsToLoadingState();
            
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                // Primary timeout for faster user feedback (3 seconds)
                const primaryTimeout = setTimeout(function() {
                    console.log('⏰ Primary stats timeout (3s), using fallback data');
                    if (allStatsStillLoading()) {
                        updateDashboardStats(getDemoData());
                    }
                }, 3000);
                
                // Secondary timeout as final safety net (6 seconds)
                const secondaryTimeout = setTimeout(function() {
                    console.log('⏰ Secondary timeout (6s), forcing zero values');
                    forceAllStatsToZero();
                }, 6000);
                
                google.script.run
                    .withSuccessHandler(function(data) {
                        clearTimeout(primaryTimeout);
                        clearTimeout(secondaryTimeout);
                        console.log('✅ Dashboard data loaded:', data);
                        updateDashboardStats(data);
                    })
                    .withFailureHandler(function(error) {
                        clearTimeout(primaryTimeout);
                        clearTimeout(secondaryTimeout);
                        console.error('❌ Error loading admin dashboard data:', error);
                        console.log('⚠️ Falling back to demo data');
                        updateDashboardStats(getDemoData());
                    })
                    .getAdminDashboardData();
            } else {
                console.log('⚠️ Google Apps Script not available, using demo data');
                updateDashboardStats(getDemoData());
            }
        }

        function updateDashboardStats(data) {
            try {
                console.log('📊 Updating dashboard stats with data:', data);

                // Update main stats with better error handling
                const safeUpdate = (id, value) => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.textContent = (value !== undefined && value !== null) ? value : 0;
                        console.log(`✅ Updated ${id}: ${value}`);
                    } else {
                        console.warn(`⚠️ Element ${id} not found`);
                    }
                };

                // Update main stats
                safeUpdate('totalRequests', data.totalRequests);
                safeUpdate('totalRiders', data.totalRiders);
                safeUpdate('totalAssignments', data.totalAssignments);
                safeUpdate('pendingNotifications', data.pendingNotifications);

                // Update quick stats
                safeUpdate('newRequests', data.newRequests);
                safeUpdate('todaysEscorts', data.todaysEscorts);
                safeUpdate('threeDayEscorts', data.threeDayEscorts);
                safeUpdate('unassignedEscorts', data.unassignedEscorts);

                console.log('✅ Dashboard stats updated successfully');
            } catch (error) {
                console.error('❌ Error updating dashboard stats:', error);
                // Set fallback values on error
                setFallbackStats();
            }
        }

        function setFallbackStats() {
            console.log('🔄 Setting fallback stats');
            const stats = ['totalRequests', 'totalRiders', 'totalAssignments', 'pendingNotifications', 
                          'newRequests', 'todaysEscorts', 'threeDayEscorts', 'unassignedEscorts'];
            
            stats.forEach(statId => {
                const element = document.getElementById(statId);
                if (element) {
                    element.textContent = '0';
                }
            });
        }

        function loadRecentActivity() {
            // Check if we're in a local environment
            const isLocal = window.location.hostname === 'localhost' || 
                           window.location.protocol === 'file:' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname.includes('8080');
                           
            if (isLocal) {
                console.log('🏠 Local environment detected, using demo activity');
                updateRecentActivity(getDemoActivity());
                return;
            }
            
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                // Set timeout for activity loading
                const activityTimeout = setTimeout(function() {
                    console.log('⏰ Activity timeout, using demo activity');
                    updateRecentActivity(getDemoActivity());
                }, 8000); // 8 second timeout
                
                google.script.run
                    .withSuccessHandler(function(activities) {
                        clearTimeout(activityTimeout);
                        console.log('✅ Recent activity loaded:', activities);
                        updateRecentActivity(activities);
                    })
                    .withFailureHandler(function(error) {
                        clearTimeout(activityTimeout);
                        console.error('❌ Error loading recent activity:', error);
                        console.log('⚠️ Falling back to demo activity');
                        updateRecentActivity(getDemoActivity());
                    })
                    .getRecentSystemActivity();
            } else {
                console.log('⚠️ Google Apps Script not available, using demo activity');
                updateRecentActivity(getDemoActivity());
            }
        }

        function loadRecentNotifications() {
            // Check if we're in a local environment
            const isLocal = window.location.hostname === 'localhost' || 
                           window.location.protocol === 'file:' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname.includes('8080');
                           
            if (isLocal) {
                console.log('🏠 Local environment detected, using demo notifications');
                updateRecentNotifications(getDemoNotifications());
                return;
            }
            
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                // Set timeout for notifications loading
                const notificationsTimeout = setTimeout(function() {
                    console.log('⏰ Notifications timeout, using demo notifications');
                    updateRecentNotifications(getDemoNotifications());
                }, 8000); // 8 second timeout
                
                google.script.run
                    .withSuccessHandler(function(notifications) {
                        clearTimeout(notificationsTimeout);
                        console.log('✅ Recent notifications loaded:', notifications);
                        updateRecentNotifications(notifications);
                    })
                    .withFailureHandler(function(error) {
                        clearTimeout(notificationsTimeout);
                        console.error('❌ Error loading recent notifications:', error);
                        console.log('⚠️ Falling back to demo notifications');
                        updateRecentNotifications(getDemoNotifications());
                    })
                    .getNotificationHistory();
            } else {
                console.log('⚠️ Google Apps Script not available, using demo notifications');
                updateRecentNotifications(getDemoNotifications());
            }
        }

        function updateRecentActivity(activities) {
            const activityList = document.getElementById('activityList');
            
            if (activities && activities.length > 0) {
                activityList.innerHTML = activities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-description">${activity.description}</div>
                        <div class="activity-time">${activity.time}</div>
                    </div>
                `).join('');
            } else {
                activityList.innerHTML = `
                    <div class="activity-item">
                        <div class="activity-description">No recent activity</div>
                        <div class="activity-time">--</div>
                    </div>
                `;
            }
        }

        function updateRecentNotifications(notifications) {
            const container = document.getElementById('notificationList');

            if (notifications && notifications.length > 0) {
                container.innerHTML = notifications.map(n => `
                    <div class="activity-item">
                        <div class="activity-description">${n.recipient} (${n.type})</div>
                        <div class="activity-time">${new Date(n.timestamp).toLocaleString()}</div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = `
                    <div class="activity-item">
                        <div class="activity-description">No notifications</div>
                        <div class="activity-time">--</div>
                    </div>
                `;
            }
        }

        // Admin Action Functions
        function getDeployedUrl(callback) {
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                google.script.run.withSuccessHandler(callback).getWebAppUrl();
            } else {
                const local = window.location.origin + window.location.pathname;
                callback(local);
            }
        }

        function openUserManagement() {
            getDeployedUrl(function(baseUrl) {
                window.open(baseUrl + '?page=user-management', '_blank');
            });
        }

        function openAuthSetup() {
            getDeployedUrl(function(baseUrl) {
                window.open(baseUrl + '?page=auth-setup', '_blank');
            });
        }

        function openNewRequests() {
            var isLocal = window.location.hostname === 'localhost' || window.location.protocol === 'file:';
            if (isLocal) {
                window.location.assign('requests.html?status=New');
            } else {
                navigateTo('requests', { status: 'New' });
            }
        }

        function goToTodaysEscorts() {
            console.log('🏍️ Navigating to today\'s escorts...');
            const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
            var isLocal = window.location.hostname === 'localhost' || window.location.protocol === 'file:';
            if (isLocal) {
                window.location.assign('requests.html?dateFilter=' + today);
            } else {
                navigateTo('requests', { dateFilter: today });
            }
        }


        function navigateTo(page, params = {}) {
            const search = new URLSearchParams();
            search.set('page', page);
            Object.keys(params).forEach(key => search.set(key, params[key]));

            function openUrl(base) {
                const url = base + (base.includes('?') ? '&' : '?') + search.toString();
                try {
                    window.top.location.assign(url);
                } catch (error) {
                    window.location.assign(url);
                }
            }

            if (typeof google !== 'undefined' && google.script && google.script.run) {
                google.script.run
                    .withSuccessHandler(openUrl)
                    .withFailureHandler(function() {
                        var basePath = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
                        var fallbackBase = basePath + (page === 'dashboard' ? 'index.html' : page + '.html');
                        openUrl(fallbackBase);
                    })
                    .getWebAppUrl();
            } else {
                const base = page === 'dashboard' ? 'index.html' : page + '.html';
                openUrl(base);
            }
        }

        function viewSystemLogs() {
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                google.script.run
                    .withSuccessHandler(function(logs) {
                        displaySystemLogs(logs);
                    })
                    .withFailureHandler(handleError)
                    .getSystemLogs();
            } else {
                alert('System logs feature requires Google Apps Script connection');
            }
        }

        function displaySystemLogs(logs) {
            const win = window.open('', '_blank', 'width=900,height=600,scrollbars=yes');
            const doc = win.document;
            doc.write('<html><head><title>System Logs</title></head><body>');
            doc.write('<h2>System Logs</h2>');
            if (!logs || logs.length === 0) {
                doc.write('<p>No logs available.</p>');
            } else {
                doc.write('<table border="1" style="border-collapse: collapse; width: 100%;">');
                doc.write('<tr><th>Timestamp</th><th>Type</th><th>Message</th><th>Details</th></tr>');
                logs.forEach(function(log) {
                    doc.write('<tr><td>' + (log.Timestamp || log.timestamp || '') + '</td>' +
                             '<td>' + (log.Type || log.type || '') + '</td>' +
                             '<td>' + (log.Message || log.message || '') + '</td>' +
                             '<td>' + (log.Details || log.details || '') + '</td></tr>');
                });
                doc.write('</table>');
            }
            doc.write('</body></html>');
            doc.close();
        }

        function viewEmailResponses() {
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                google.script.run
                    .withSuccessHandler(function(responses) {
                        displayEmailResponses(responses);
                    })
                    .withFailureHandler(handleError)
                    .getEmailResponses();
            } else {
                alert('Email responses feature requires Google Apps Script connection');
            }
        }

        function displayEmailResponses(responses) {
            const win = window.open('', '_blank', 'width=900,height=600,scrollbars=yes');
            const doc = win.document;
            doc.write('<html><head><title>Rider Email Responses</title></head><body>');
            doc.write('<h2>Rider Email Responses</h2>');
            if (!responses || responses.length === 0) {
                doc.write('<p>No responses available.</p>');
            } else {
                doc.write('<table border="1" style="border-collapse: collapse; width: 100%;">');
                doc.write('<tr><th>Timestamp</th><th>From Email</th><th>Rider Name</th><th>Message Body</th><th>Action</th></tr>');
                responses.forEach(function(r) {
                    doc.write('<tr><td>' + (r.Timestamp || r.timestamp || '') + '</td>' +
                             '<td>' + (r["From Email"] || r.fromEmail || '') + '</td>' +
                             '<td>' + (r["Rider Name"] || r.riderName || '') + '</td>' +
                             '<td>' + (r["Message Body"] || r.messageBody || '') + '</td>' +
                             '<td>' + (r.Action || r.action || '') + '</td></tr>');
                });
                doc.write('</table>');
            }
            doc.write('</body></html>');
            doc.close();
        }

        function runDiagnostics() {
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                showMessage('Running system diagnostics...', 'info');
                google.script.run
                    .withSuccessHandler(function(result) {
                        showMessage('Diagnostics completed: ' + result.status, 'success');
                        console.log('Diagnostics result:', result);
                    })
                    .withFailureHandler(handleError)
                    .runSystemDiagnostics();
            } else {
                alert('Diagnostics feature requires Google Apps Script connection');
            }
        }

        function exportAllData() {
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                showMessage('Exporting system data...', 'info');
                google.script.run
                    .withSuccessHandler(function(result) {
                        if (result.success) {
                            // Create download link
                            const blob = new Blob([result.csvContent], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = result.filename;
                            a.click();
                            URL.revokeObjectURL(url);
                            showMessage('Data exported successfully', 'success');
                        } else {
                            showMessage('Export failed: ' + result.error, 'error');
                        }
                    })
                    .withFailureHandler(handleError)
                    .exportSystemData();
            } else {
                alert('Export feature requires Google Apps Script connection');
            }
        }

        function generateReports() {
            getDeployedUrl(function(baseUrl) {
                window.open(baseUrl + '?page=reports', '_blank');
            });
        }

        function emergencyLockdown() {
            const confirmation = prompt('Type "EMERGENCY" to confirm system lockdown:');
            if (confirmation === 'EMERGENCY') {
                if (typeof google !== 'undefined' && google.script && google.script.run) {
                    showMessage('Activating emergency lockdown...', 'error');
                    google.script.run
                        .withSuccessHandler(function(result) {
                            showMessage('Emergency lockdown activated', 'error');
                        })
                        .withFailureHandler(handleError)
                        .activateEmergencyLockdown();
                } else {
                    alert('Emergency lockdown requires Google Apps Script connection');
                }
            }
        }

        function resetAllSessions() {
            if (confirm('Are you sure you want to reset all user sessions?')) {
                if (typeof google !== 'undefined' && google.script && google.script.run) {
                    showMessage('Resetting all sessions...', 'warning');
                    google.script.run
                        .withSuccessHandler(function(result) {
                            showMessage('All sessions reset', 'success');
                        })
                        .withFailureHandler(handleError)
                        .resetAllUserSessions();
                } else {
                    alert('Session reset requires Google Apps Script connection');
                }
            }
        }

        // Utility Functions
        function showMessage(message, type) {
            // Create a temporary message element
            const messageDiv = document.createElement('div');
            messageDiv.style.position = 'fixed';
            messageDiv.style.top = '20px';
            messageDiv.style.right = '20px';
            messageDiv.style.padding = '1rem';
            messageDiv.style.borderRadius = '5px';
            messageDiv.style.zIndex = '9999';
            messageDiv.style.maxWidth = '300px';
            messageDiv.textContent = message;
            
            switch(type) {
                case 'success':
                    messageDiv.style.background = '#27ae60';
                    break;
                case 'error':
                    messageDiv.style.background = '#e74c3c';
                    break;
                case 'warning':
                    messageDiv.style.background = '#f39c12';
                    break;
                default:
                    messageDiv.style.background = '#3498db';
            }
            messageDiv.style.color = 'white';
            
            document.body.appendChild(messageDiv);
            setTimeout(() => messageDiv.remove(), 3000);
        }

        function handleDashboardError(error) {
            console.error('Dashboard error:', error);
            showMessage('Error loading dashboard data', 'error');
        }

        function handleActivityError(error) {
            console.error('Activity error:', error);
        }

        function handleError(error) {
            console.error('Error:', error);
            showMessage('An error occurred: ' + error.message, 'error');
        }

        // Demo data for when Google Apps Script is not available
        function getDemoData() {
            return {
                totalRequests: 156,
                totalRiders: 23,
                totalAssignments: 89,
                pendingNotifications: 3,
                todaysEscorts: 12,
                threeDayEscorts: 5,
                unassignedEscorts: 2,
                newRequests: 4
            };
        }

        function getDemoActivity() {
            return [
                { description: 'New escort request created by Dispatcher', time: '2 min ago' },
                { description: 'Rider John Smith completed assignment E-123-25', time: '15 min ago' },
                { description: 'System backup completed successfully', time: '1 hour ago' },
                { description: 'New user registration pending approval', time: '2 hours ago' }
            ];
        }

        function getDemoNotifications() {
            return [
                { recipient: 'John Doe', type: 'SMS', timestamp: new Date().toISOString(), requestId: 'REQ-1' },
                { recipient: 'Jane Smith', type: 'Email', timestamp: new Date().toISOString(), requestId: 'REQ-2' }
            ];
        }

        // Helper functions for better loading state management
        function setStatsToLoadingState() {
            const statsElements = ['totalRequests', 'totalRiders', 'totalAssignments', 'pendingNotifications', 
                                  'newRequests', 'todaysEscorts', 'threeDayEscorts', 'unassignedEscorts'];
            
            statsElements.forEach(statId => {
                const element = document.getElementById(statId);
                if (element) {
                    element.textContent = '...';
                }
            });
        }

        function allStatsStillLoading() {
            const statsElements = ['totalRequests', 'totalRiders', 'totalAssignments', 'pendingNotifications'];
            return statsElements.some(statId => {
                const element = document.getElementById(statId);
                return element && (element.textContent === '-' || element.textContent === '...' || element.textContent === 'Loading...');
            });
        }

        function forceAllStatsToZero() {
            console.log('🔧 Forcing all stats to zero due to timeout');
            const statsElements = ['totalRequests', 'totalRiders', 'totalAssignments', 'pendingNotifications', 
                                  'newRequests', 'todaysEscorts', 'threeDayEscorts', 'unassignedEscorts'];
            
            statsElements.forEach(statId => {
                const element = document.getElementById(statId);
                if (element && (element.textContent === '-' || element.textContent === '...' || element.textContent === 'Loading...')) {
                    element.textContent = '0';
                    console.log(`🔧 Forced ${statId} to zero`);
                }
            });
        }

        function logout() {
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                google.script.run
                    .withSuccessHandler(url => { window.location.href = url; })
                    .logout();
            } else {
                window.location.href = 'https://accounts.google.com/Logout';
            }
        }

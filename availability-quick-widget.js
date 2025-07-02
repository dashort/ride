/**
 * Floating Availability Widget
 * Provides quick access to availability calendar from any page
 */

class AvailabilityWidget {
    constructor() {
        this.isOpen = false;
        this.currentUser = null;
        this.todayAvailability = null;
        this.init();
    }

    init() {
        this.createWidget();
        this.loadUserInfo();
        this.bindEvents();
    }

    createWidget() {
        // Create floating button
        const fab = document.createElement('div');
        fab.id = 'availability-fab';
        fab.innerHTML = '🗓️';
        fab.title = 'Quick Availability';
        
        // Create widget panel
        const widget = document.createElement('div');
        widget.id = 'availability-widget';
        widget.innerHTML = `
            <div class="widget-header">
                <h3>🗓️ Quick Availability</h3>
                <button class="close-btn" id="close-widget">×</button>
            </div>
            <div class="widget-content">
                <div class="today-status">
                    <h4>Today's Status</h4>
                    <div id="today-availability" class="status-display">
                        <div class="loading">Loading...</div>
                    </div>
                </div>
                
                <div class="quick-actions">
                    <h4>Quick Actions</h4>
                    <div class="action-buttons">
                        <button class="action-btn available" id="set-available-today">
                            ✅ Available Today
                        </button>
                        <button class="action-btn unavailable" id="set-unavailable-today">
                            ❌ Unavailable Today
                        </button>
                        <button class="action-btn neutral" id="clear-today">
                            🔄 Clear Status
                        </button>
                    </div>
                </div>

                <div class="widget-footer">
                    <button class="full-calendar-btn" id="open-full-calendar">
                        📅 Open Full Calendar
                    </button>
                </div>
            </div>
        `;

        // Add styles
        const styles = document.createElement('style');
        styles.textContent = `
            #availability-fab {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 56px;
                height: 56px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                cursor: pointer;
                z-index: 1000;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                transition: all 0.3s ease;
                user-select: none;
            }

            #availability-fab:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 25px rgba(0,0,0,0.4);
            }

            #availability-widget {
                position: fixed;
                bottom: 90px;
                right: 20px;
                width: 320px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                display: none;
                z-index: 1001;
                border: 1px solid rgba(255,255,255,0.2);
                backdrop-filter: blur(10px);
            }

            #availability-widget.open {
                display: block;
                animation: slideUp 0.3s ease-out;
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .widget-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 1rem;
                border-radius: 12px 12px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .widget-header h3 {
                margin: 0;
                font-size: 1rem;
                font-weight: 600;
            }

            .close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background 0.2s ease;
            }

            .close-btn:hover {
                background: rgba(255,255,255,0.2);
            }

            .widget-content {
                padding: 1rem;
            }

            .today-status,
            .quick-actions {
                margin-bottom: 1rem;
            }

            .today-status h4,
            .quick-actions h4 {
                margin: 0 0 0.5rem 0;
                font-size: 0.9rem;
                color: #2c3e50;
                font-weight: 600;
            }

            .status-display {
                padding: 0.75rem;
                background: #f8f9fa;
                border-radius: 8px;
                border-left: 4px solid #3498db;
                font-size: 0.9rem;
            }

            .status-display.available {
                border-left-color: #27ae60;
                background: #d4edda;
                color: #155724;
            }

            .status-display.unavailable {
                border-left-color: #e74c3c;
                background: #f8d7da;
                color: #721c24;
            }

            .status-display .loading {
                color: #666;
                font-style: italic;
            }

            .action-buttons {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .action-btn {
                padding: 0.5rem;
                border: none;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.85rem;
            }

            .action-btn.available {
                background: #27ae60;
                color: white;
            }

            .action-btn.available:hover {
                background: #229954;
            }

            .action-btn.unavailable {
                background: #e74c3c;
                color: white;
            }

            .action-btn.unavailable:hover {
                background: #dc3545;
            }

            .action-btn.neutral {
                background: #6c757d;
                color: white;
            }

            .action-btn.neutral:hover {
                background: #5a6268;
            }

            .widget-footer {
                border-top: 1px solid #ecf0f1;
                padding-top: 1rem;
            }

            .full-calendar-btn {
                width: 100%;
                padding: 0.75rem;
                background: linear-gradient(135deg, #3498db, #2980b9);
                color: white;
                border: none;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .full-calendar-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                #availability-widget {
                    width: calc(100vw - 40px);
                    right: 20px;
                    left: 20px;
                    bottom: 90px;
                }

                #availability-fab {
                    bottom: 15px;
                    right: 15px;
                    width: 50px;
                    height: 50px;
                    font-size: 20px;
                }
            }

            /* Hide on very small screens */
            @media (max-width: 480px) {
                #availability-fab,
                #availability-widget {
                    display: none !important;
                }
            }
        `;

        document.head.appendChild(styles);
        document.body.appendChild(fab);
        document.body.appendChild(widget);
    }

    bindEvents() {
        // Toggle widget
        document.getElementById('availability-fab').addEventListener('click', () => {
            this.toggleWidget();
        });

        // Close widget
        document.getElementById('close-widget').addEventListener('click', () => {
            this.closeWidget();
        });

        // Quick actions
        document.getElementById('set-available-today').addEventListener('click', () => {
            this.setTodayStatus('available');
        });

        document.getElementById('set-unavailable-today').addEventListener('click', () => {
            this.setTodayStatus('unavailable');
        });

        document.getElementById('clear-today').addEventListener('click', () => {
            this.setTodayStatus('clear');
        });

        // Open full calendar
        document.getElementById('open-full-calendar').addEventListener('click', () => {
            this.openFullCalendar();
        });

        // Close widget when clicking outside
        document.addEventListener('click', (e) => {
            const widget = document.getElementById('availability-widget');
            const fab = document.getElementById('availability-fab');
            
            if (this.isOpen && !widget.contains(e.target) && !fab.contains(e.target)) {
                this.closeWidget();
            }
        });
    }

    toggleWidget() {
        if (this.isOpen) {
            this.closeWidget();
        } else {
            this.openWidget();
        }
    }

    openWidget() {
        const widget = document.getElementById('availability-widget');
        widget.classList.add('open');
        this.isOpen = true;
        this.loadTodayAvailability();
    }

    closeWidget() {
        const widget = document.getElementById('availability-widget');
        widget.classList.remove('open');
        this.isOpen = false;
    }

    loadUserInfo() {
        if (typeof google !== 'undefined' && google.script && google.script.run) {
            google.script.run
                .withSuccessHandler((user) => {
                    this.currentUser = user;
                })
                .withFailureHandler((error) => {
                    console.warn('Could not load user info for availability widget:', error);
                })
                .getCurrentUser();
        }
    }

    loadTodayAvailability() {
        const statusElement = document.getElementById('today-availability');
        statusElement.innerHTML = '<div class="loading">Loading...</div>';

        const today = new Date().toISOString().split('T')[0];

        if (typeof google !== 'undefined' && google.script && google.script.run) {
            google.script.run
                .withSuccessHandler((availability) => {
                    this.displayTodayAvailability(availability);
                })
                .withFailureHandler((error) => {
                    statusElement.innerHTML = 'Unable to load availability';
                    console.warn('Error loading today availability:', error);
                })
                .getRiderAvailabilityForDate(today);
        } else {
            statusElement.innerHTML = 'No availability data available';
        }
    }

    displayTodayAvailability(availability) {
        const statusElement = document.getElementById('today-availability');
        
        if (!availability || availability.length === 0) {
            statusElement.className = 'status-display';
            statusElement.innerHTML = 'No status set for today';
            return;
        }

        const todayStatus = availability[0];
        let statusClass = 'status-display';
        let statusText = '';

        if (todayStatus.status === 'Available') {
            statusClass += ' available';
            statusText = `✅ Available ${todayStatus.startTime} - ${todayStatus.endTime}`;
        } else if (todayStatus.status === 'Unavailable') {
            statusClass += ' unavailable';
            statusText = `❌ Unavailable`;
        } else {
            statusText = `🔄 ${todayStatus.status}`;
        }

        statusElement.className = statusClass;
        statusElement.innerHTML = statusText;
    }

    setTodayStatus(status) {
        const today = new Date().toISOString().split('T')[0];
        let statusData = {};

        if (status === 'available') {
            statusData = {
                date: today,
                status: 'Available',
                startTime: '09:00',
                endTime: '17:00',
                notes: 'Set via quick widget'
            };
        } else if (status === 'unavailable') {
            statusData = {
                date: today,
                status: 'Unavailable',
                startTime: '',
                endTime: '',
                notes: 'Set via quick widget'
            };
        } else if (status === 'clear') {
            statusData = {
                date: today,
                action: 'delete'
            };
        }

        if (typeof google !== 'undefined' && google.script && google.script.run) {
            const statusElement = document.getElementById('today-availability');
            statusElement.innerHTML = '<div class="loading">Updating...</div>';

            google.script.run
                .withSuccessHandler((result) => {
                    if (result.success) {
                        this.loadTodayAvailability();
                        this.showToast('Status updated successfully!');
                    } else {
                        this.showToast('Error updating status: ' + result.error, true);
                    }
                })
                .withFailureHandler((error) => {
                    this.showToast('Error updating status', true);
                    console.error('Error updating availability:', error);
                })
                .updateRiderAvailability(statusData);
        } else {
            this.showToast('Availability service not available', true);
        }
    }

    openFullCalendar() {
        if (typeof google !== 'undefined' && google.script && google.script.run) {
            google.script.run
                .withSuccessHandler((url) => {
                    window.open(url + '?page=availability', '_blank');
                })
                .withFailureHandler(() => {
                    window.open('rider-availability.html', '_blank');
                })
                .getWebAppUrl();
        } else {
            window.open('rider-availability.html', '_blank');
        }
        this.closeWidget();
    }

    showToast(message, isError = false) {
        let toast = document.getElementById('availability-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'availability-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 100px;
                right: 20px;
                background: ${isError ? '#dc3545' : '#28a745'};
                color: white;
                padding: 0.75rem 1rem;
                border-radius: 6px;
                font-size: 0.9rem;
                font-weight: 600;
                z-index: 1002;
                opacity: 0;
                transition: opacity 0.3s ease;
                max-width: 300px;
            `;
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.background = isError ? '#dc3545' : '#28a745';
        toast.style.opacity = '1';

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if not on the full availability calendar page
    if (!window.location.pathname.includes('rider-availability.html')) {
        new AvailabilityWidget();
    }
});

// Fallback for pages that are already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
} else {
    initWidget();
}

function initWidget() {
    if (!window.availabilityWidget && !window.location.pathname.includes('rider-availability.html')) {
        window.availabilityWidget = new AvailabilityWidget();
    }
}
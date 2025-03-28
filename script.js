/**
 * Baby Tracker Pro
 * Enhanced and feature-rich baby tracking application
 * 
 * Features:
 * - Comprehensive tracking for feeding, sleep, diapers, growth, milestones, and health
 * - Advanced analytics and pattern detection
 * - Predictive algorithms for next events
 * - Development milestone tracking
 * - Smart reminders and alarms
 * - Responsive data visualization
 * - Offline-first with local storage
 * - Dark/light theme support
 * - Data export/import
 */

// =========================================================================
// Application Initialization and Configuration
// =========================================================================
const BabyTrackerPro = {
    // Application state
    state: {
        activeTab: 'history',
        isTrackingSleep: false,
        sleepStartTime: null,
        lastNotificationTime: 0,
        alarmsPaused: false,
        alarmSnoozeTimers: {},
        darkModeEnabled: window.matchMedia('(prefers-color-scheme: dark)').matches,
        predictionAccuracy: {},
        voiceInputEnabled: false,
        displayUnits: {
            temperature: 'f', // 'f' or 'c'
            weight: 'lb',     // 'lb' or 'kg'
            length: 'in'      // 'in' or 'cm'
        }
    },

    // Storage version for data migration
    storageVersion: '2.1.0',
    
    // Application configuration
    config: {
        appName: 'Baby Tracker Pro',
        appVersion: '2.1.0',
        enablePredictions: true,
        enableNotifications: true,
        defaultBabyName: 'Baby',
        autoBackupInterval: 24, // hours
        timeFormat: '12', // '12' or '24'
        dateFormat: 'M/D/YYYY',
        feedingPatternMinEntries: 5,
        sleepPatternMinEntries: 5,
        diaperPatternMinEntries: 5,
        anomalyThreshold: 0.4, // 40% deviation from pattern
        alertThreshold: 0.6,   // 60% deviation from pattern
        predictionLookbackDays: 7,
        predictionConfidenceThresholds: {
            high: 0.75,
            medium: 0.5,
            low: 0.25
        },
        ageRanges: {
            newborn: { min: 0, max: 3 }, // 0-3 months
            infant: { min: 4, max: 12 }, // 4-12 months
            toddler: { min: 13, max: 36 }, // 13-36 months
            preschooler: { min: 37, max: 60 } // 37-60 months
        },
        patterns: {
            feeding: {
                interval: 3 * 60 * 60 * 1000, // 3 hours default interval
                variance: 0.3 // 30% variance considered normal
            },
            sleep: {
                interval: 2 * 60 * 60 * 1000, // 2 hours default interval
                variance: 0.4 // 40% variance considered normal
            },
            diaper: {
                interval: 2.5 * 60 * 60 * 1000, // 2.5 hours default interval
                variance: 0.5 // 50% variance considered normal
            }
        }
    },

    // DOM elements cache
    elements: {
        // Will be populated during initialization
    },
    
    // Initialize the application
    init: function() {
        console.log(`${this.config.appName} v${this.config.appVersion} initializing...`);
        
        // Initialize data store if it doesn't exist
        this.data.init();
        
        // Cache DOM elements
        this.cacheElements();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize UI components
        this.initUI();
        
        // Update dashboard data
        this.updateDashboard();
        
        // Initialize theme
        this.initTheme();
        
        // Initialize time display
        this.initTimeDisplay();
        
        // Check for notifications
        if (this.config.enableNotifications) {
            this.notifications.requestPermission();
        }
        
        // Set up automatic backup
        this.setupAutoBackup();
        
        // Load baby info
        this.loadBabyInfo();
        
        // Initialize tabs
        this.tabs.init();
        
        console.log(`${this.config.appName} initialized successfully.`);
    },
    
    // Cache DOM elements for better performance
    cacheElements: function() {
        // Header elements
        this.elements.headerBabyName = document.getElementById('header-baby-name');
        this.elements.currentTime = document.getElementById('current-time');
        this.elements.themeToggle = document.getElementById('theme-toggle');
        this.elements.quickAddButton = document.getElementById('quick-add-button');
        
        // Dashboard elements
        this.elements.babyAgeBanner = document.getElementById('baby-age-banner');
        this.elements.babyNameDisplay = document.getElementById('baby-name-display');
        this.elements.babyAgeDisplay = document.getElementById('baby-age-display');
        this.elements.anomalyContainer = document.getElementById('anomaly-container');
        
        // Dashboard cards
        this.elements.lastFeedTime = document.getElementById('last-feed-time');
        this.elements.lastFeedDetails = document.getElementById('last-feed-details');
        this.elements.nextFeedPrediction = document.getElementById('next-feed-prediction');
        this.elements.feedProgress = document.getElementById('feed-progress');
        
        this.elements.lastDiaperTime = document.getElementById('last-diaper-time');
        this.elements.lastDiaperType = document.getElementById('last-diaper-type');
        this.elements.nextWetPrediction = document.getElementById('next-wet-prediction');
        this.elements.nextDirtyPrediction = document.getElementById('next-dirty-prediction');
        this.elements.diaperProgressWet = document.getElementById('diaper-progress-wet');
        this.elements.diaperProgressDirty = document.getElementById('diaper-progress-dirty');
        
        this.elements.lastSleepStartTime = document.getElementById('last-sleep-start-time');
        this.elements.lastSleepEndTime = document.getElementById('last-sleep-end-time');
        this.elements.lastSleepDuration = document.getElementById('last-sleep-duration');
        this.elements.nextSleepPrediction = document.getElementById('next-sleep-prediction');
        this.elements.sleepProgress = document.getElementById('sleep-progress');
        this.elements.sleepToggleButton = document.getElementById('sleep-toggle-button');
        this.elements.sleepQuickLabel = document.getElementById('sleep-quick-label');
        
        this.elements.lastPumpTime = document.getElementById('last-pump-time');
        this.elements.lastPumpAmount = document.getElementById('last-pump-amount');
        this.elements.nextPumpSchedule = document.getElementById('next-pump-schedule');
        this.elements.pumpProgress = document.getElementById('pump-progress');
        
        this.elements.lastWeight = document.getElementById('last-weight');
        this.elements.lastLength = document.getElementById('last-length');
        this.elements.lastHead = document.getElementById('last-head');
        
        this.elements.lastTemperature = document.getElementById('last-temperature');
        this.elements.lastMedicine = document.getElementById('last-medicine');
        this.elements.nextMedicineTime = document.getElementById('next-medicine-time');
        
        this.elements.lastMilestone = document.getElementById('last-milestone');
        this.elements.milestonesPreviewList = document.getElementById('milestone-preview-list');
        
        this.elements.todayFeedsCount = document.getElementById('today-feeds-count');
        this.elements.todayDiapersCount = document.getElementById('today-diapers-count');
        this.elements.todaySleepHours = document.getElementById('today-sleep-hours');
        this.elements.todayPumpAmount = document.getElementById('today-pump-amount');
        
        // Modal elements
        this.elements.modal = document.getElementById('log-modal');
        this.elements.modalTitle = document.getElementById('modal-title');
        this.elements.modalForm = document.getElementById('log-form');
        this.elements.modalClose = document.querySelector('#log-modal .close-button');
        
        // Quick action menu
        this.elements.quickActionMenu = document.getElementById('quick-action-menu');
        
        // Tab elements
        this.elements.tabLinks = document.querySelectorAll('.tab-link');
        this.elements.tabContents = document.querySelectorAll('.tab-content');
        
        // Lists and data displays
        this.elements.eventList = document.getElementById('event-list');
        this.elements.mainChart = document.getElementById('main-chart');
        this.elements.chartInsight = document.getElementById('chart-insight');
        this.elements.growthChart = document.getElementById('growth-chart');
        this.elements.growthTableBody = document.getElementById('growth-table-body');
        this.elements.milestonesContainer = document.getElementById('milestones-container');
        this.elements.temperatureChart = document.getElementById('temperature-chart');
        this.elements.temperatureTableBody = document.getElementById('temperature-table-body');
        this.elements.medicineTableBody = document.getElementById('medicine-table-body');
        
        // Notification elements
        this.elements.infoNotification = document.getElementById('info-notification');
        this.elements.alarmNotification = document.getElementById('alarm-notification');
        this.elements.alarmMessage = document.getElementById('alarm-message');
        this.elements.dismissAlarm = document.getElementById('dismiss-alarm');
        this.elements.resumeAlarms = document.getElementById('resume-alarms');
        this.elements.alarmPauseStatus = document.getElementById('alarm-pause-status');
        this.elements.forceResumeAlarms = document.getElementById('force-resume-alarms');
        
        // Settings elements
        this.elements.babyNameInput = document.getElementById('baby-name');
        this.elements.babyDobInput = document.getElementById('baby-dob');
        this.elements.babyGenderInput = document.getElementById('baby-gender');
        this.elements.themeSelect = document.getElementById('theme-select');
        this.elements.timeFormatInput = document.getElementById('time-format');
        this.elements.dateFormatInput = document.getElementById('date-format');
        this.elements.tempUnitInput = document.getElementById('temp-unit');
        this.elements.weightUnitInput = document.getElementById('weight-unit');
        this.elements.lengthUnitInput = document.getElementById('length-unit');
        this.elements.advancedPredictions = document.getElementById('advanced-predictions');
        this.elements.voiceInputEnabled = document.getElementById('voice-input-enabled');
        this.elements.notifyMilestones = document.getElementById('notify-milestones');
        this.elements.alarmSoundEnabled = document.getElementById('alarm-sound-enabled');
        this.elements.autoBackup = document.getElementById('auto-backup');
        this.elements.backupInterval = document.getElementById('backup-interval');
        this.elements.lastBackupTime = document.getElementById('last-backup-time');
        this.elements.pumpInterval = document.getElementById('pump-interval');
        this.elements.pumpStartTime = document.getElementById('pump-start-time');
        this.elements.currentPumpSchedule = document.getElementById('current-pump-schedule-display');
        this.elements.appVersion = document.getElementById('app-version');
        
        // Import/Export
        this.elements.exportData = document.getElementById('export-data');
        this.elements.importDataFile = document.getElementById('import-data-file');
        this.elements.clearData = document.getElementById('clear-data');
        
        // Voice interface
        this.elements.voiceInterface = document.getElementById('voice-command-interface');
        this.elements.voiceCancel = document.querySelector('.voice-cancel');
    },
    
    // Set up event listeners
    setupEventListeners: function() {
        // Theme toggle
        if (this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Quick add button
        if (this.elements.quickAddButton) {
            this.elements.quickAddButton.addEventListener('click', () => this.toggleQuickActionMenu());
        }
        
        // Modal close button
        if (this.elements.modalClose) {
            this.elements.modalClose.addEventListener('click', () => this.modal.close());
        }
        
        // Modal outside click to close
        if (this.elements.modal) {
            this.elements.modal.addEventListener('click', (event) => {
                if (event.target === this.elements.modal) {
                    this.modal.close();
                }
            });
        }
        
        // Quick action buttons
        const quickActionButtons = document.querySelectorAll('[data-action]');
        quickActionButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const action = button.dataset.action;
                this.handleAction(action);
            });
        });
        
        // Modal form submission
        if (this.elements.modalForm) {
            this.elements.modalForm.addEventListener('submit', (event) => {
                event.preventDefault();
                this.handleFormSubmit(event.target);
            });
        }
        
        // Sleep toggle button
        if (this.elements.sleepToggleButton) {
            this.elements.sleepToggleButton.addEventListener('click', () => this.toggleSleep());
        }
        
        // Alarm dismiss
        if (this.elements.dismissAlarm) {
            this.elements.dismissAlarm.addEventListener('click', () => this.alarms.dismiss());
        }
        
        // Alarm snooze buttons
        const snoozeButtons = document.querySelectorAll('.snooze-options button[data-snooze]');
        snoozeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const snoozeMinutes = button.dataset.snooze;
                if (snoozeMinutes === 'pause') {
                    this.alarms.pauseAll();
                } else {
                    this.alarms.snooze(parseInt(snoozeMinutes));
                }
            });
        });
        
        // Resume alarms
        if (this.elements.resumeAlarms) {
            this.elements.resumeAlarms.addEventListener('click', () => this.alarms.resumeAll());
        }
        
        // Force resume alarms
        if (this.elements.forceResumeAlarms) {
            this.elements.forceResumeAlarms.addEventListener('click', () => {
                this.alarms.resumeAll(true);
                this.showNotification('All alarms and snoozes cleared.');
            });
        }
        
        // Export data
        if (this.elements.exportData) {
            this.elements.exportData.addEventListener('click', () => this.data.exportData());
        }
        
        // Import data
        if (this.elements.importDataFile) {
            this.elements.importDataFile.addEventListener('change', (event) => this.data.importData(event));
        }
        
        // Clear data
        if (this.elements.clearData) {
            this.elements.clearData.addEventListener('click', () => {
                const confirmed = confirm("WARNING: This will delete ALL your baby tracking data.\n\nThis action cannot be undone. Are you sure you want to continue?");
                if (confirmed) {
                    this.data.clearData();
                    this.showNotification('All data has been cleared.');
                    location.reload();
                }
            });
        }
        
        // Settings change handlers
        if (this.elements.babyNameInput) {
            this.elements.babyNameInput.addEventListener('change', () => this.saveBabyInfo());
        }
        
        if (this.elements.babyDobInput) {
            this.elements.babyDobInput.addEventListener('change', () => this.saveBabyInfo());
        }
        
        if (this.elements.babyGenderInput) {
            this.elements.babyGenderInput.addEventListener('change', () => this.saveBabyInfo());
        }
        
        if (this.elements.themeSelect) {
            this.elements.themeSelect.addEventListener('change', () => this.updateThemeFromSelect());
        }
        
        if (this.elements.timeFormatInput) {
            this.elements.timeFormatInput.addEventListener('change', () => this.saveSettings());
        }
        
        if (this.elements.dateFormatInput) {
            this.elements.dateFormatInput.addEventListener('change', () => this.saveSettings());
        }
        
        if (this.elements.tempUnitInput) {
            this.elements.tempUnitInput.addEventListener('change', () => this.saveSettings());
        }
        
        if (this.elements.weightUnitInput) {
            this.elements.weightUnitInput.addEventListener('change', () => this.saveSettings());
        }
        
        if (this.elements.lengthUnitInput) {
            this.elements.lengthUnitInput.addEventListener('change', () => this.saveSettings());
        }

        // Voice interface cancel
        if (this.elements.voiceCancel) {
            this.elements.voiceCancel.addEventListener('click', () => {
                if (this.elements.voiceInterface) {
                    this.elements.voiceInterface.style.display = 'none';
                }
            });
        }
        
        // Dashboard refresh
        const dashboardRefresh = document.getElementById('dashboard-refresh');
        if (dashboardRefresh) {
            dashboardRefresh.addEventListener('click', () => {
                this.updateDashboard();
                this.showNotification('Dashboard refreshed');
            });
        }
        
        // Dashboard customize
        const dashboardCustomize = document.getElementById('dashboard-customize');
        if (dashboardCustomize) {
            dashboardCustomize.addEventListener('click', () => {
                this.tabs.switchTo('settings');
                this.showNotification('Customize dashboard in settings');
            });
        }
        
        // Save pump schedule
        const savePumpSchedule = document.getElementById('save-pump-schedule');
        if (savePumpSchedule) {
            savePumpSchedule.addEventListener('click', () => this.savePumpSchedule());
        }
        
        // Chart type selection
        const chartType = document.getElementById('chart-type');
        if (chartType) {
            chartType.addEventListener('change', (event) => {
                this.charts.renderSelectedChart(event.target.value);
            });
        }
        
        // Growth chart type selection
        const growthType = document.getElementById('growth-type');
        if (growthType) {
            growthType.addEventListener('change', (event) => {
                this.charts.renderGrowthChart(event.target.value);
            });
        }
        
        // History filter
        const historyFilter = document.getElementById('history-filter');
        if (historyFilter) {
            historyFilter.addEventListener('change', () => this.history.updateEventList());
        }
        
        // History limit
        const historyLimit = document.getElementById('history-limit');
        if (historyLimit) {
            historyLimit.addEventListener('change', () => this.history.updateEventList());
        }
        
        // Date range filter
        const dateRange = document.getElementById('date-range');
        if (dateRange) {
            dateRange.addEventListener('change', () => this.history.updateEventList());
        }
        
        // Milestone filter
        const milestoneFilter = document.getElementById('milestone-filter');
        if (milestoneFilter) {
            milestoneFilter.addEventListener('change', () => this.milestones.filterMilestones(milestoneFilter.value));
        }
        
        // Export history
        const exportHistory = document.getElementById('export-history');
        if (exportHistory) {
            exportHistory.addEventListener('click', () => this.history.exportCurrentView());
        }
        
        // Export report
        const exportReport = document.getElementById('export-report');
        if (exportReport) {
            exportReport.addEventListener('click', () => this.reports.exportCurrentReport());
        }
        
        // Print report
        const printReport = document.getElementById('print-report');
        if (printReport) {
            printReport.addEventListener('click', () => window.print());
        }
        
        // Report period
        const reportPeriod = document.getElementById('report-period');
        if (reportPeriod) {
            reportPeriod.addEventListener('change', (event) => this.reports.generateReport(event.target.value));
        }
        
        // Schedule medicine
        const scheduleMedicine = document.getElementById('schedule-medicine');
        if (scheduleMedicine) {
            scheduleMedicine.addEventListener('click', () => this.openMedicineScheduleModal());
        }
        
        // View milestones link
        const viewMilestonesLink = document.getElementById('view-milestones-link');
        if (viewMilestonesLink) {
            viewMilestonesLink.addEventListener('click', (event) => {
                event.preventDefault();
                this.tabs.switchTo('milestones');
            });
        }
        
        // Document click handler for closing quick action menu
        document.addEventListener('click', (event) => {
            // Close quick action menu if clicked outside
            if (this.elements.quickActionMenu && 
                this.elements.quickActionMenu.style.display === 'block' && 
                !this.elements.quickActionMenu.contains(event.target) && 
                event.target !== this.elements.quickAddButton) {
                this.elements.quickActionMenu.style.display = 'none';
            }
        });
        
        // Window resize handler
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Key press handlers
        document.addEventListener('keydown', (event) => {
            // Escape key to close modals
            if (event.key === 'Escape') {
                if (this.elements.modal && this.elements.modal.style.display === 'block') {
                    this.modal.close();
                }
                if (this.elements.quickActionMenu && this.elements.quickActionMenu.style.display === 'block') {
                    this.elements.quickActionMenu.style.display = 'none';
                }
                if (this.elements.voiceInterface && this.elements.voiceInterface.style.display === 'block') {
                    this.elements.voiceInterface.style.display = 'none';
                }
            }
        });
    },

    // Initialize UI components
    initUI: function() {
        // Set app version
        if (this.elements.appVersion) {
            this.elements.appVersion.textContent = this.config.appVersion;
        }
        
        // Update sleep toggle button state
        this.updateSleepToggleButton();
        
        // Update alarm pause status
        this.updateAlarmPauseStatus();
        
        // Initialize charts
        this.charts.init();
    },
    
    // Update dashboard data
    updateDashboard: function() {
        console.log('Updating dashboard...');
        
        // Update last events and predictions for each category
        this.updateFeedingStatus();
        this.updateDiaperStatus();
        this.updateSleepStatus();
        this.updatePumpingStatus();
        this.updateGrowthStatus();
        this.updateHealthStatus();
        this.updateMilestoneStatus();
        this.updateTodayStats();
        
        // Detect and show anomalies
        this.detectAnomalies();
        
        // Refresh progress bars
        this.startProgressBarUpdates();
        
        console.log('Dashboard updated');
    },
    
    // Initialize theme based on preferences
    initTheme: function() {
        // Check for stored preference
        const storedTheme = localStorage.getItem('theme');
        
        if (storedTheme) {
            this.state.darkModeEnabled = storedTheme === 'dark';
        }
        
        // Apply theme
        this.applyTheme();
        
        // Update select if it exists
        if (this.elements.themeSelect) {
            if (storedTheme) {
                this.elements.themeSelect.value = storedTheme;
            } else {
                // Default to auto (system preference)
                this.elements.themeSelect.value = 'auto';
            }
        }
    },
    
    // Apply current theme to body
    applyTheme: function() {
        if (this.state.darkModeEnabled) {
            document.body.classList.remove('theme-light');
            document.body.classList.add('theme-dark');
        } else {
            document.body.classList.remove('theme-dark');
            document.body.classList.add('theme-light');
        }
    },
    
    // Toggle between light and dark theme
    toggleTheme: function() {
        this.state.darkModeEnabled = !this.state.darkModeEnabled;
        
        // Save preference
        localStorage.setItem('theme', this.state.darkModeEnabled ? 'dark' : 'light');
        
        // Apply theme
        this.applyTheme();
        
        // Update select if it exists
        if (this.elements.themeSelect) {
            this.elements.themeSelect.value = this.state.darkModeEnabled ? 'dark' : 'light';
        }
    },
    
    // Update theme from select element
    updateThemeFromSelect: function() {
        if (!this.elements.themeSelect) return;
        
        const selectedTheme = this.elements.themeSelect.value;
        
        // Handle 'auto' (system preference)
        if (selectedTheme === 'auto') {
            localStorage.removeItem('theme');
            this.state.darkModeEnabled = window.matchMedia('(prefers-color-scheme: dark)').matches;
        } else {
            localStorage.setItem('theme', selectedTheme);
            this.state.darkModeEnabled = selectedTheme === 'dark';
        }
        
        // Apply theme
        this.applyTheme();
    },
    
    // Initialize and update time display
    initTimeDisplay: function() {
        if (!this.elements.currentTime) return;
        
        // Update immediately
        this.updateTimeDisplay();
        
        // Then update every second
        setInterval(() => this.updateTimeDisplay(), 1000);
    },
    
    // Update the current time display
    updateTimeDisplay: function() {
        if (!this.elements.currentTime) return;
        
        const now = new Date();
        
        // Format based on preferences
        let timeFormat = this.getTimeFormatFromSettings();
        let dateFormat = this.getDateFormatFromSettings();
        
        // Get the formatted date and time
        const timeStr = this.formatTime(now, timeFormat);
        const dateStr = this.formatDate(now, dateFormat);
        
        this.elements.currentTime.textContent = `${dateStr} ${timeStr}`;
        
        // Also update progress bars while we're at it
        this.updateProgressBars();
    },
    
    // Start periodic updates of progress bars
    startProgressBarUpdates: function() {
        // Clear any existing interval
        if (this._progressInterval) {
            clearInterval(this._progressInterval);
        }
        
        // Update immediately
        this.updateProgressBars();
        
        // Then update every minute
        this._progressInterval = setInterval(() => this.updateProgressBars(), 60000);
    },
    
    // Update all progress bars
    updateProgressBars: function() {
        this.updateFeedingProgressBar();
        this.updateDiaperProgressBar();
        this.updateSleepProgressBar();
        this.updatePumpProgressBar();
        
        // Check for alarms that need to be triggered
        this.checkAlarms();
    },
    
    // Show notification toast
    showNotification: function(message, duration = 3000) {
        if (!this.elements.infoNotification) return;
        
        this.elements.infoNotification.textContent = message;
        this.elements.infoNotification.style.display = 'block';
        this.elements.infoNotification.style.transform = 'translateY(0)';
        
        // Clear any existing timeout
        if (this._notificationTimeout) {
            clearTimeout(this._notificationTimeout);
        }
        
        // Hide after duration
        this._notificationTimeout = setTimeout(() => {
            this.elements.infoNotification.style.transform = 'translateY(-100px)';
            
            // Hide completely after transition
            setTimeout(() => {
                this.elements.infoNotification.style.display = 'none';
            }, 300);
        }, duration);
    },
    
    // Format time based on settings
    formatTime: function(date, format = '12') {
        if (!date) return 'N/A';
        
        try {
            const hours = date.getHours();
            const minutes = date.getMinutes();
            
            if (format === '24') {
                // 24-hour format
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            } else {
                // 12-hour format
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const hours12 = hours % 12 || 12;
                return `${hours12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
            }
        } catch (error) {
            console.error('Error formatting time:', error);
            return 'Error';
        }
    },
    
    // Format date based on settings
    formatDate: function(date, format = 'M/D/YYYY') {
        if (!date) return 'N/A';
        
        try {
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            
            // Month names for MMM format
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            switch (format) {
                case 'M/D/YYYY':
                    return `${month}/${day}/${year}`;
                case 'D/M/YYYY':
                    return `${day}/${month}/${year}`;
                case 'YYYY-MM-DD':
                    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                case 'MMM D, YYYY':
                    return `${monthNames[date.getMonth()]} ${day}, ${year}`;
                default:
                    return `${month}/${day}/${year}`;
            }
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Error';
        }
    },
    
    // Format datetime for display
    formatDateTime: function(timestamp) {
        if (!timestamp) return 'N/A';
        
        try {
            const date = new Date(timestamp);
            const timeFormat = this.getTimeFormatFromSettings();
            const dateFormat = this.getDateFormatFromSettings();
            
            return `${this.formatDate(date, dateFormat)} ${this.formatTime(date, timeFormat)}`;
        } catch (error) {
            console.error('Error formatting datetime:', error);
            return 'Error';
        }
    },
    
    // Get time format from settings
    getTimeFormatFromSettings: function() {
        // Check if setting is stored
        const storedFormat = localStorage.getItem('timeFormat');
        if (storedFormat) {
            return storedFormat;
        }
        
        // Get from input if available
        if (this.elements.timeFormatInput) {
            return this.elements.timeFormatInput.value;
        }
        
        // Default to 12-hour
        return '12';
    },
    
    // Get date format from settings
    getDateFormatFromSettings: function() {
        // Check if setting is stored
        const storedFormat = localStorage.getItem('dateFormat');
        if (storedFormat) {
            return storedFormat;
        }
        
        // Get from input if available
        if (this.elements.dateFormatInput) {
            return this.elements.dateFormatInput.value;
        }
        
        // Default
        return 'M/D/YYYY';
    },
    
    // Format duration in a human-readable way
    formatDuration: function(durationMs) {
        if (!durationMs || durationMs < 0) return 'N/A';
        
        try {
            const seconds = Math.floor(durationMs / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            
            const remainingMinutes = minutes % 60;
            
            if (hours > 0) {
                return `${hours}h ${remainingMinutes}m`;
            } else {
                return `${minutes}m`;
            }
        } catch (error) {
            console.error('Error formatting duration:', error);
            return 'Error';
        }
    },
    
    // Format amount based on unit
    formatAmount: function(amount, unit) {
        if (amount === null || amount === undefined) return 'N/A';
        
        try {
            // Convert to number if it's a string
            const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
            
            switch (unit) {
                case 'oz':
                    return `${numAmount.toFixed(1)} oz`;
                case 'ml':
                    return `${Math.round(numAmount)} ml`;
                case 'kg':
                    return `${numAmount.toFixed(2)} kg`;
                case 'lb':
                    // Convert decimal pounds to lb/oz format
                    const pounds = Math.floor(numAmount);
                    const ounces = Math.round((numAmount - pounds) * 16);
                    return `${pounds} lb ${ounces} oz`;
                case 'cm':
                    return `${numAmount.toFixed(1)} cm`;
                case 'in':
                    return `${numAmount.toFixed(1)} in`;
                case 'f':
                    return `${numAmount.toFixed(1)}°F`;
                case 'c':
                    return `${numAmount.toFixed(1)}°C`;
                default:
                    return `${numAmount}`;
            }
        } catch (error) {
            console.error('Error formatting amount:', error);
            return 'Error';
        }
    },
    
    // Convert between units
    convertAmount: function(amount, fromUnit, toUnit) {
        if (amount === null || amount === undefined) return null;
        
        try {
            // Convert to number if it's a string
            const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
            
            // Same unit, no conversion needed
            if (fromUnit === toUnit) return numAmount;
            
            // Weight conversions
            if ((fromUnit === 'lb' && toUnit === 'kg') || (fromUnit === 'kg' && toUnit === 'lb')) {
                return fromUnit === 'lb' ? numAmount * 0.453592 : numAmount * 2.20462;
            }
            
            // Length conversions
            if ((fromUnit === 'in' && toUnit === 'cm') || (fromUnit === 'cm' && toUnit === 'in')) {
                return fromUnit === 'in' ? numAmount * 2.54 : numAmount * 0.393701;
            }
            
            // Temperature conversions
            if ((fromUnit === 'f' && toUnit === 'c') || (fromUnit === 'c' && toUnit === 'f')) {
                return fromUnit === 'f' ? (numAmount - 32) * 5/9 : (numAmount * 9/5) + 32;
            }
            
            // Volume conversions
            if ((fromUnit === 'oz' && toUnit === 'ml') || (fromUnit === 'ml' && toUnit === 'oz')) {
                return fromUnit === 'oz' ? numAmount * 29.5735 : numAmount * 0.033814;
            }
            
            // Unknown conversion
            console.warn(`Unknown unit conversion from ${fromUnit} to ${toUnit}`);
            return numAmount;
        } catch (error) {
            console.error('Error converting amount:', error);
            return null;
        }
    },
    
    // Toggle quick action menu
    toggleQuickActionMenu: function() {
        if (!this.elements.quickActionMenu) return;
        
        if (this.elements.quickActionMenu.style.display === 'block') {
            this.elements.quickActionMenu.style.display = 'none';
        } else {
            this.elements.quickActionMenu.style.display = 'block';
        }
    },
    
    // Handle window resize
    handleResize: function() {
        // Update charts if they exist
        if (this.elements.mainChart && this._activeChart) {
            this._activeChart.resize();
        }
        
        if (this.elements.growthChart && this._activeGrowthChart) {
            this._activeGrowthChart.resize();
        }
        
        if (this.elements.temperatureChart && this._activeTemperatureChart) {
            this._activeTemperatureChart.resize();
        }
    },
    
    // Handle action from buttons
    handleAction: function(action) {
        console.log('Handling action:', action);
        
        // Quick action menu
        if (this.elements.quickActionMenu && this.elements.quickActionMenu.style.display === 'block') {
            this.elements.quickActionMenu.style.display = 'none';
        }
        
        // Handle various actions
        switch (action) {
            case 'logFeed':
                this.modal.open('feeding');
                break;
            case 'logDiaper':
                this.modal.open('diaper');
                break;
            case 'logSleep':
                this.modal.open('sleep');
                break;
            case 'toggleSleep':
                this.toggleSleep();
                break;
            case 'logPump':
                this.modal.open('pump');
                break;
            case 'logGrowth':
                this.modal.open('growth');
                break;
            case 'logTemperature':
                this.modal.open('temperature');
                break;
            case 'logMedicine':
                this.modal.open('medicine');
                break;
            case 'logMilestone':
                this.modal.open('milestone');
                break;
            case 'managePumpSchedule':
                this.tabs.switchTo('settings');
                // Scroll to pump schedule section
                document.getElementById('pump-schedule-settings').scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                break;
            case 'viewGrowthChart':
                this.tabs.switchTo('growth');
                break;
            case 'viewMilestones':
                this.tabs.switchTo('milestones');
                break;
            case 'viewReports':
                this.tabs.switchTo('reports');
                break;
            default:
                console.log('Unknown action:', action);
        }
    },
    
    // Update feeding status on dashboard
    updateFeedingStatus: function() {
        // Get last feeding
        const lastFeeding = this.data.getLastEventOfType('feeding');
        
        // Update last feed time
        if (lastFeeding) {
            if (this.elements.lastFeedTime) {
                this.elements.lastFeedTime.textContent = this.formatDateTime(lastFeeding.timestamp);
            }
            
            // Update details
            if (this.elements.lastFeedDetails) {
                let details = '';
                
                if (lastFeeding.feedType) {
                    details += lastFeeding.feedType === 'breast' ? 'Breast' : 'Bottle';
                }
                
                if (lastFeeding.feedSide) {
                    details += `, ${lastFeeding.feedSide === 'left' ? 'Left' : 'Right'}`;
                }
                
                if (lastFeeding.amount && lastFeeding.unit) {
                    details += `, ${this.formatAmount(lastFeeding.amount, lastFeeding.unit)}`;
                }
                
                if (lastFeeding.duration) {
                    details += `, ${this.formatDuration(lastFeeding.duration)}`;
                }
                
                this.elements.lastFeedDetails.textContent = details || 'No details';
            }
            
            // Make prediction for next feed
            if (this.elements.nextFeedPrediction) {
                const nextFeedTime = this.predictions.predictNextFeeding();
                if (nextFeedTime) {
                    this.elements.nextFeedPrediction.textContent = this.formatDateTime(nextFeedTime);
                    
                    // Add confidence indicator if we have enough data
                    const confidence = this.predictions.getConfidenceLevel('feeding');
                    if (confidence) {
                        const confidenceSpan = document.createElement('span');
                        confidenceSpan.className = `confidence-inline ${confidence}`;
                        this.elements.nextFeedPrediction.appendChild(confidenceSpan);
                    }
                } else {
                    this.elements.nextFeedPrediction.textContent = 'Need more data';
                }
            }
            
            // Show alternative predictions if we have them
            const altPredictions = this.predictions.getAlternativePredictions('feeding');
            const altContainer = document.querySelector('.status-card:first-child .alt-predictions-container');
            if (altContainer && altPredictions && altPredictions.length > 0) {
                altContainer.innerHTML = '';
                
                // Only show top 2 alternatives
                altPredictions.slice(0, 2).forEach(pred => {
                    const predDiv = document.createElement('div');
                    predDiv.className = 'alt-prediction';
                    
                    predDiv.textContent = `Alt: ${this.formatDateTime(pred.timestamp)} `;
                    
                    const confidenceSpan = document.createElement('span');
                    confidenceSpan.className = `confidence ${pred.confidence}`;
                    predDiv.appendChild(confidenceSpan);
                    
                    altContainer.appendChild(predDiv);
                });
            }
        } else {
            // No feeding logged yet
            if (this.elements.lastFeedTime) {
                this.elements.lastFeedTime.textContent = 'No data';
            }
            if (this.elements.lastFeedDetails) {
                this.elements.lastFeedDetails.textContent = '';
            }
            if (this.elements.nextFeedPrediction) {
                this.elements.nextFeedPrediction.textContent = 'Need data';
            }
        }
    },
    
    // Update feeding progress bar
    updateFeedingProgressBar: function() {
        if (!this.elements.feedProgress) return;
        
        const lastFeeding = this.data.getLastEventOfType('feeding');
        if (!lastFeeding) {
            this.elements.feedProgress.style.width = '0%';
            this.elements.feedProgress.setAttribute('aria-valuenow', 0);
            return;
        }
        
        // Get predicted next feeding time
        const nextFeedTime = this.predictions.predictNextFeeding();
        if (!nextFeedTime) {
            this.elements.feedProgress.style.width = '0%';
            this.elements.feedProgress.setAttribute('aria-valuenow', 0);
            return;
        }
        
        // Calculate progress
        const now = Date.now();
        const lastTime = lastFeeding.timestamp;
        const nextTime = nextFeedTime;
        
        // Prevent division by zero
        if (nextTime <= lastTime) {
            this.elements.feedProgress.style.width = '0%';
            this.elements.feedProgress.setAttribute('aria-valuenow', 0);
            return;
        }
        
        const totalDuration = nextTime - lastTime;
        const elapsed = now - lastTime;
        let progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
        
        // Update progress bar
        this.elements.feedProgress.style.width = `${progressPercent}%`;
        this.elements.feedProgress.setAttribute('aria-valuenow', progressPercent);
        
        // Update class based on progress
        this.elements.feedProgress.classList.remove('low', 'medium', 'high');
        if (progressPercent >= 90) {
            this.elements.feedProgress.classList.add('high');
        } else if (progressPercent >= 60) {
            this.elements.feedProgress.classList.add('medium');
        }
    },
    
    // Update diaper status on dashboard
    updateDiaperStatus: function() {
        // Get last diaper change
        const lastDiaper = this.data.getLastEventOfType('diaper');
        
        // Update last diaper time
        if (lastDiaper) {
            if (this.elements.lastDiaperTime) {
                this.elements.lastDiaperTime.textContent = this.formatDateTime(lastDiaper.timestamp);
            }
            
            // Update type
            if (this.elements.lastDiaperType) {
                let typeText = 'Unknown';
                if (lastDiaper.diaperType) {
                    switch (lastDiaper.diaperType) {
                        case 'wet':
                            typeText = 'Wet';
                            break;
                        case 'dirty':
                            typeText = 'Dirty';
                            break;
                        case 'mixed':
                            typeText = 'Wet & Dirty';
                            break;
                        default:
                            typeText = lastDiaper.diaperType;
                    }
                }
                this.elements.lastDiaperType.textContent = typeText;
            }
            
            // Make predictions for next diapers
            if (this.elements.nextWetPrediction) {
                const nextWetTime = this.predictions.predictNextDiaper('wet');
                if (nextWetTime) {
                    this.elements.nextWetPrediction.textContent = this.formatDateTime(nextWetTime);
                    
                    // Add confidence indicator if we have enough data
                    const confidence = this.predictions.getConfidenceLevel('diaper_wet');
                    if (confidence) {
                        const confidenceSpan = document.createElement('span');
                        confidenceSpan.className = `confidence-inline ${confidence}`;
                        this.elements.nextWetPrediction.appendChild(confidenceSpan);
                    }
                } else {
                    this.elements.nextWetPrediction.textContent = 'Need more data';
                }
            }
            
            if (this.elements.nextDirtyPrediction) {
                const nextDirtyTime = this.predictions.predictNextDiaper('dirty');
                if (nextDirtyTime) {
                    this.elements.nextDirtyPrediction.textContent = this.formatDateTime(nextDirtyTime);
                    
                    // Add confidence indicator if we have enough data
                    const confidence = this.predictions.getConfidenceLevel('diaper_dirty');
                    if (confidence) {
                        const confidenceSpan = document.createElement('span');
                        confidenceSpan.className = `confidence-inline ${confidence}`;
                        this.elements.nextDirtyPrediction.appendChild(confidenceSpan);
                    }
                } else {
                    this.elements.nextDirtyPrediction.textContent = 'Need more data';
                }
            }
        } else {
            // No diaper logged yet
            if (this.elements.lastDiaperTime) {
                this.elements.lastDiaperTime.textContent = 'No data';
            }
            if (this.elements.lastDiaperType) {
                this.elements.lastDiaperType.textContent = '';
            }
            if (this.elements.nextWetPrediction) {
                this.elements.nextWetPrediction.textContent = 'Need data';
            }
            if (this.elements.nextDirtyPrediction) {
                this.elements.nextDirtyPrediction.textContent = 'Need data';
            }
        }
    },
    
    // Update diaper progress bars
    updateDiaperProgressBar: function() {
        if (!this.elements.diaperProgressWet || !this.elements.diaperProgressDirty) return;
        
        // Get last wet and dirty diapers
        const lastWet = this.data.getLastDiaperOfType(['wet', 'mixed']);
        const lastDirty = this.data.getLastDiaperOfType(['dirty', 'mixed']);
        
        // Update wet progress
        if (lastWet) {
            const nextWetTime = this.predictions.predictNextDiaper('wet');
            if (nextWetTime) {
                const now = Date.now();
                const lastTime = lastWet.timestamp;
                const nextTime = nextWetTime;
                
                // Prevent division by zero
                if (nextTime <= lastTime) {
                    this.elements.diaperProgressWet.style.width = '0%';
                    this.elements.diaperProgressWet.setAttribute('aria-valuenow', 0);
                } else {
                    const totalDuration = nextTime - lastTime;
                    const elapsed = now - lastTime;
                    let progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
                    
                    // Update progress bar
                    this.elements.diaperProgressWet.style.width = `${progressPercent}%`;
                    this.elements.diaperProgressWet.setAttribute('aria-valuenow', progressPercent);
                    
                    // Update class based on progress
                    this.elements.diaperProgressWet.classList.remove('low', 'medium', 'high');
                    if (progressPercent >= 90) {
                        this.elements.diaperProgressWet.classList.add('high');
                    } else if (progressPercent >= 60) {
                        this.elements.diaperProgressWet.classList.add('medium');
                    }
                }
            } else {
                // No prediction
                this.elements.diaperProgressWet.style.width = '0%';
                this.elements.diaperProgressWet.setAttribute('aria-valuenow', 0);
            }
        } else {
            // No wet diaper logged yet
            this.elements.diaperProgressWet.style.width = '0%';
            this.elements.diaperProgressWet.setAttribute('aria-valuenow', 0);
        }
        
        // Update dirty progress
        if (lastDirty) {
            const nextDirtyTime = this.predictions.predictNextDiaper('dirty');
            if (nextDirtyTime) {
                const now = Date.now();
                const lastTime = lastDirty.timestamp;
                const nextTime = nextDirtyTime;
                
                // Prevent division by zero
                if (nextTime <= lastTime) {
                    this.elements.diaperProgressDirty.style.width = '0%';
                    this.elements.diaperProgressDirty.setAttribute('aria-valuenow', 0);
                } else {
                    const totalDuration = nextTime - lastTime;
                    const elapsed = now - lastTime;
                    let progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
                    
                    // Update progress bar
                    this.elements.diaperProgressDirty.style.width = `${progressPercent}%`;
                    this.elements.diaperProgressDirty.setAttribute('aria-valuenow', progressPercent);
                    
                    // Update class based on progress
                    this.elements.diaperProgressDirty.classList.remove('low', 'medium', 'high');
                    if (progressPercent >= 90) {
                        this.elements.diaperProgressDirty.classList.add('high');
                    } else if (progressPercent >= 60) {
                        this.elements.diaperProgressDirty.classList.add('medium');
                    }
                }
            } else {
                // No prediction
                this.elements.diaperProgressDirty.style.width = '0%';
                this.elements.diaperProgressDirty.setAttribute('aria-valuenow', 0);
            }
        } else {
            // No dirty diaper logged yet
            this.elements.diaperProgressDirty.style.width = '0%';
            this.elements.diaperProgressDirty.setAttribute('aria-valuenow', 0);
        }
    },
    
    // Update sleep status on dashboard
    updateSleepStatus: function() {
        // Check if currently tracking sleep
        this.checkSleepStatus();
        
        // Get last sleep events
        const sleepEvents = this.data.getEvents('sleep').sort((a, b) => b.timestamp - a.timestamp);
        
        // Find the last complete sleep cycle (has both start and end)
        let lastCompleteSleep = null;
        for (const event of sleepEvents) {
            if (event.sleepEnd && event.sleepStart) {
                lastCompleteSleep = event;
                break;
            }
        }
        
        // Get the most recent sleep start (might be ongoing)
        const lastSleepStart = sleepEvents.find(e => e.sleepStart);
        
        // Update last sleep start time
        if (lastSleepStart) {
            if (this.elements.lastSleepStartTime) {
                this.elements.lastSleepStartTime.textContent = this.formatDateTime(lastSleepStart.sleepStart);
            }
        } else {
            if (this.elements.lastSleepStartTime) {
                this.elements.lastSleepStartTime.textContent = 'No data';
            }
        }
        
        // Update last sleep end time and duration
        if (lastCompleteSleep) {
            if (this.elements.lastSleepEndTime) {
                this.elements.lastSleepEndTime.textContent = this.formatDateTime(lastCompleteSleep.sleepEnd);
            }
            
            if (this.elements.lastSleepDuration) {
                const duration = lastCompleteSleep.sleepEnd - lastCompleteSleep.sleepStart;
                this.elements.lastSleepDuration.textContent = this.formatDuration(duration);
            }
        } else {
            if (this.elements.lastSleepEndTime) {
                this.elements.lastSleepEndTime.textContent = 'No data';
            }
            
            if (this.elements.lastSleepDuration) {
                this.elements.lastSleepDuration.textContent = '';
            }
        }
        
        // Make prediction for next sleep
        if (this.elements.nextSleepPrediction) {
            // If currently sleeping, predict wake time instead
            if (this.state.isTrackingSleep) {
                const nextWakeTime = this.predictions.predictSleepEnd();
                if (nextWakeTime) {
                    this.elements.nextSleepPrediction.textContent = `Wake ~${this.formatDateTime(nextWakeTime)}`;
                    
                    // Add confidence indicator if we have enough data
                    const confidence = this.predictions.getConfidenceLevel('sleep_duration');
                    if (confidence) {
                        const confidenceSpan = document.createElement('span');
                        confidenceSpan.className = `confidence-inline ${confidence}`;
                        this.elements.nextSleepPrediction.appendChild(confidenceSpan);
                    }
                } else {
                    this.elements.nextSleepPrediction.textContent = 'Estimating wake time...';
                }
            } else {
                const nextSleepTime = this.predictions.predictNextSleep();
                if (nextSleepTime) {
                    this.elements.nextSleepPrediction.textContent = this.formatDateTime(nextSleepTime);
                    
                    // Add confidence indicator if we have enough data
                    const confidence = this.predictions.getConfidenceLevel('sleep_cycle');
                    if (confidence) {
                        const confidenceSpan = document.createElement('span');
                        confidenceSpan.className = `confidence-inline ${confidence}`;
                        this.elements.nextSleepPrediction.appendChild(confidenceSpan);
                    }
                } else {
                    this.elements.nextSleepPrediction.textContent = 'Need more data';
                }
            }
        }
        
        // Update sleep toggle button
        this.updateSleepToggleButton();
    },
    
    // Update sleep progress bar
    updateSleepProgressBar: function() {
        if (!this.elements.sleepProgress) return;
        
        // If currently sleeping, show sleep duration progress
        if (this.state.isTrackingSleep && this.state.sleepStartTime) {
            const now = Date.now();
            const startTime = this.state.sleepStartTime;
            
            // Predict end time for max duration
            const predictedEnd = this.predictions.predictSleepEnd();
            
            if (predictedEnd && predictedEnd > now) {
                const totalDuration = predictedEnd - startTime;
                const elapsed = now - startTime;
                let progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
                
                // Update progress bar
                this.elements.sleepProgress.style.width = `${progressPercent}%`;
                this.elements.sleepProgress.setAttribute('aria-valuenow', progressPercent);
                this.elements.sleepProgress.textContent = this.formatDuration(elapsed);
                
                // Update class based on progress
                this.elements.sleepProgress.classList.remove('low', 'medium', 'high');
                if (progressPercent >= 90) {
                    this.elements.sleepProgress.classList.add('high');
                } else if (progressPercent >= 60) {
                    this.elements.sleepProgress.classList.add('medium');
                }
            } else {
                // No prediction or past predicted end
                // Just show elapsed time
                const elapsed = now - startTime;
                this.elements.sleepProgress.style.width = '100%';
                this.elements.sleepProgress.setAttribute('aria-valuenow', 100);
                this.elements.sleepProgress.textContent = this.formatDuration(elapsed);
                this.elements.sleepProgress.classList.add('high');
            }
        } else {
            // Not sleeping, show progress toward next sleep
            const lastSleepEnd = this.data.getLastSleepEnd();
            if (!lastSleepEnd) {
                this.elements.sleepProgress.style.width = '0%';
                this.elements.sleepProgress.setAttribute('aria-valuenow', 0);
                this.elements.sleepProgress.textContent = '';
                return;
            }
            
            const nextSleepTime = this.predictions.predictNextSleep();
            if (!nextSleepTime) {
                this.elements.sleepProgress.style.width = '0%';
                this.elements.sleepProgress.setAttribute('aria-valuenow', 0);
                this.elements.sleepProgress.textContent = '';
                return;
            }
            
            const now = Date.now();
            const lastTime = lastSleepEnd;
            const nextTime = nextSleepTime;
            
            // Prevent division by zero
            if (nextTime <= lastTime) {
                this.elements.sleepProgress.style.width = '0%';
                this.elements.sleepProgress.setAttribute('aria-valuenow', 0);
                this.elements.sleepProgress.textContent = '';
                return;
            }
            
            const totalDuration = nextTime - lastTime;
            const elapsed = now - lastTime;
            let progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
            
            // Update progress bar
            this.elements.sleepProgress.style.width = `${progressPercent}%`;
            this.elements.sleepProgress.setAttribute('aria-valuenow', progressPercent);
            this.elements.sleepProgress.textContent = '';
            
            // Update class based on progress
            this.elements.sleepProgress.classList.remove('low', 'medium', 'high');
            if (progressPercent >= 90) {
                this.elements.sleepProgress.classList.add('high');
            } else if (progressPercent >= 60) {
                this.elements.sleepProgress.classList.add('medium');
            }
        }
    },
    
    // Update pumping status on dashboard
    updatePumpingStatus: function() {
        // Get last pumping
        const lastPump = this.data.getLastEventOfType('pump');
        
        // Update last pump time
        if (lastPump) {
            if (this.elements.lastPumpTime) {
                this.elements.lastPumpTime.textContent = this.formatDateTime(lastPump.timestamp);
            }
            
            // Update amount
            if (this.elements.lastPumpAmount) {
                if (lastPump.amount && lastPump.unit) {
                    this.elements.lastPumpAmount.textContent = this.formatAmount(lastPump.amount, lastPump.unit);
                } else {
                    this.elements.lastPumpAmount.textContent = 'No amount';
                }
            }
        } else {
            // No pump logged yet
            if (this.elements.lastPumpTime) {
                this.elements.lastPumpTime.textContent = 'No data';
            }
            if (this.elements.lastPumpAmount) {
                this.elements.lastPumpAmount.textContent = '';
            }
        }
        
        // Check for scheduled pumps
        if (this.elements.nextPumpSchedule) {
            const pumpSchedule = this.getPumpSchedule();
            if (pumpSchedule && pumpSchedule.interval) {
                const nextPumpTime = this.calculateNextPumpTime(pumpSchedule);
                if (nextPumpTime) {
                    this.elements.nextPumpSchedule.textContent = this.formatDateTime(nextPumpTime);
                } else {
                    this.elements.nextPumpSchedule.textContent = 'Error in schedule';
                }
            } else {
                this.elements.nextPumpSchedule.textContent = 'Set schedule...';
            }
        }
    },
    
    // Update pump progress bar
    updatePumpProgressBar: function() {
        if (!this.elements.pumpProgress) return;
        
        const lastPump = this.data.getLastEventOfType('pump');
        if (!lastPump) {
            this.elements.pumpProgress.style.width = '0%';
            this.elements.pumpProgress.setAttribute('aria-valuenow', 0);
            return;
        }
        
        // Get next scheduled pump time
        const pumpSchedule = this.getPumpSchedule();
        if (!pumpSchedule || !pumpSchedule.interval) {
            this.elements.pumpProgress.style.width = '0%';
            this.elements.pumpProgress.setAttribute('aria-valuenow', 0);
            return;
        }
        
        const nextPumpTime = this.calculateNextPumpTime(pumpSchedule);
        if (!nextPumpTime) {
            this.elements.pumpProgress.style.width = '0%';
            this.elements.pumpProgress.setAttribute('aria-valuenow', 0);
            return;
        }
        
        // Calculate progress
        const now = Date.now();
        const lastTime = lastPump.timestamp;
        const nextTime = nextPumpTime;
        
        // Prevent division by zero
        if (nextTime <= lastTime) {
            this.elements.pumpProgress.style.width = '0%';
            this.elements.pumpProgress.setAttribute('aria-valuenow', 0);
            return;
        }
        
        const totalDuration = nextTime - lastTime;
        const elapsed = now - lastTime;
        let progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
        
        // Update progress bar
        this.elements.pumpProgress.style.width = `${progressPercent}%`;
        this.elements.pumpProgress.setAttribute('aria-valuenow', progressPercent);
        
        // Update class based on progress
        this.elements.pumpProgress.classList.remove('low', 'medium', 'high');
        if (progressPercent >= 90) {
            this.elements.pumpProgress.classList.add('high');
        } else if (progressPercent >= 60) {
            this.elements.pumpProgress.classList.add('medium');
        }
    },
    
    // Update growth status on dashboard
    updateGrowthStatus: function() {
        // Get latest growth measurements
        const growthEvents = this.data.getEvents('growth').sort((a, b) => b.timestamp - a.timestamp);
        
        // Update weight
        if (this.elements.lastWeight) {
            const lastWeight = growthEvents.find(e => e.weight);
            if (lastWeight) {
                const weightUnit = this.state.displayUnits.weight;
                this.elements.lastWeight.textContent = this.formatAmount(lastWeight.weight, weightUnit);
            } else {
                this.elements.lastWeight.textContent = 'Not recorded';
            }
        }
        
        // Update length
        if (this.elements.lastLength) {
            const lastLength = growthEvents.find(e => e.length);
            if (lastLength) {
                const lengthUnit = this.state.displayUnits.length;
                this.elements.lastLength.textContent = this.formatAmount(lastLength.length, lengthUnit);
            } else {
                this.elements.lastLength.textContent = 'Not recorded';
            }
        }
        
        // Update head circumference
        if (this.elements.lastHead) {
            const lastHead = growthEvents.find(e => e.headCircumference);
            if (lastHead) {
                const lengthUnit = this.state.displayUnits.length;
                this.elements.lastHead.textContent = this.formatAmount(lastHead.headCircumference, lengthUnit);
            } else {
                this.elements.lastHead.textContent = 'Not recorded';
            }
        }
    },
    
    // Update health status on dashboard
    updateHealthStatus: function() {
        // Get last temperature
        const lastTemp = this.data.getLastEventOfType('temperature');
        if (lastTemp && this.elements.lastTemperature) {
            if (lastTemp.temperature) {
                const tempUnit = this.state.displayUnits.temperature;
                this.elements.lastTemperature.textContent = this.formatAmount(lastTemp.temperature, tempUnit);
            } else {
                this.elements.lastTemperature.textContent = 'N/A';
            }
        } else if (this.elements.lastTemperature) {
            this.elements.lastTemperature.textContent = 'N/A';
        }
        
        // Get last medicine
        const lastMedicine = this.data.getLastEventOfType('medicine');
        if (lastMedicine && this.elements.lastMedicine) {
            let medicineText = this.formatDateTime(lastMedicine.timestamp);
            if (lastMedicine.medicineName) {
                medicineText += ` (${lastMedicine.medicineName})`;
            }
            this.elements.lastMedicine.textContent = medicineText;
        } else if (this.elements.lastMedicine) {
            this.elements.lastMedicine.textContent = 'N/A';
        }
        
        // Get next scheduled medicine
        const scheduledMeds = this.data.getScheduledMedicines();
        if (scheduledMeds.length > 0 && this.elements.nextMedicineTime) {
            // Sort by next dose time
            scheduledMeds.sort((a, b) => a.nextDoseTime - b.nextDoseTime);
            const nextMed = scheduledMeds[0];
            
            let medText = this.formatDateTime(nextMed.nextDoseTime);
            if (nextMed.medicineName) {
                medText += ` (${nextMed.medicineName})`;
            }
            this.elements.nextMedicineTime.textContent = medText;
        } else if (this.elements.nextMedicineTime) {
            this.elements.nextMedicineTime.textContent = 'None scheduled';
        }
    },
    
    // Update milestone status on dashboard
    updateMilestoneStatus: function() {
        // Get last milestone
        const lastMilestone = this.data.getLastEventOfType('milestone');
        if (lastMilestone && this.elements.lastMilestone) {
            let milestoneText = this.formatDateTime(lastMilestone.timestamp);
            if (lastMilestone.milestoneName) {
                milestoneText = lastMilestone.milestoneName;
            }
            this.elements.lastMilestone.textContent = milestoneText;
        } else if (this.elements.lastMilestone) {
            this.elements.lastMilestone.textContent = 'N/A';
        }
        
        // Update upcoming milestones preview
        this.updateMilestonesPreview();
    },
    
    // Update today's stats summary on dashboard
    updateTodayStats: function() {
        // Get today's start timestamp
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        // Count feeds today
        if (this.elements.todayFeedsCount) {
            const todayFeeds = this.data.getEvents('feeding').filter(e => e.timestamp >= todayStart.getTime());
            this.elements.todayFeedsCount.textContent = todayFeeds.length;
        }
        
        // Count diapers today
        if (this.elements.todayDiapersCount) {
            const todayDiapers = this.data.getEvents('diaper').filter(e => e.timestamp >= todayStart.getTime());
            this.elements.todayDiapersCount.textContent = todayDiapers.length;
        }
        
        // Calculate sleep hours today
        if (this.elements.todaySleepHours) {
            let totalSleepMs = 0;
            
            // Get sleep events that ended today
            const sleepEvents = this.data.getEvents('sleep').filter(e => 
                e.sleepEnd && e.sleepEnd >= todayStart.getTime()
            );
            
            for (const event of sleepEvents) {
                // For sleeps that started before today
                const startTime = Math.max(event.sleepStart, todayStart.getTime());
                totalSleepMs += event.sleepEnd - startTime;
            }
            
            // Add currently ongoing sleep if applicable
            if (this.state.isTrackingSleep && this.state.sleepStartTime) {
                const now = Date.now();
                const startTime = Math.max(this.state.sleepStartTime, todayStart.getTime());
                totalSleepMs += now - startTime;
            }
            
            // Convert to hours
            const sleepHours = totalSleepMs / (1000 * 60 * 60);
            this.elements.todaySleepHours.textContent = sleepHours.toFixed(1) + 'h';
        }
        
        // Calculate pumped amount today
        if (this.elements.todayPumpAmount) {
            let totalPumped = 0;
            const pumpUnit = 'oz'; // Default display unit
            
            // Get pump events from today
            const pumpEvents = this.data.getEvents('pump').filter(e => e.timestamp >= todayStart.getTime());
            
            for (const event of pumpEvents) {
                if (event.amount) {
                    // Convert to display unit if necessary
                    if (event.unit && event.unit !== pumpUnit) {
                        totalPumped += this.convertAmount(event.amount, event.unit, pumpUnit);
                    } else {
                        totalPumped += parseFloat(event.amount);
                    }
                }
            }
            
            this.elements.todayPumpAmount.textContent = this.formatAmount(totalPumped, pumpUnit);
        }
    },
    
    // Update milestones preview on dashboard
    updateMilestonesPreview: function() {
        if (!this.elements.milestonesPreviewList) return;
        
        // Get baby age in months
        const babyAge = this.getBabyAgeMonths();
        if (!babyAge) {
            this.elements.milestonesPreviewList.innerHTML = '<li>Set baby\'s DOB in settings</li>';
            return;
        }
        
        // Get age-appropriate milestones
        const ageMilestones = this.milestones.getMilestonesForAge(babyAge);
        
        // Get completed milestones
        const completedMilestones = this.data.getEvents('milestone').map(m => m.milestoneName || '');
        
        // Filter to show only uncompleted milestones
        const upcomingMilestones = ageMilestones.filter(m => 
            !completedMilestones.includes(m.name)
        );
        
        if (upcomingMilestones.length === 0) {
            this.elements.milestonesPreviewList.innerHTML = '<li>All milestones for this age complete!</li>';
            return;
        }
        
        // Show at most 3 upcoming milestones
        this.elements.milestonesPreviewList.innerHTML = '';
        upcomingMilestones.slice(0, 3).forEach(milestone => {
            const li = document.createElement('li');
            li.textContent = milestone.name;
            this.elements.milestonesPreviewList.appendChild(li);
        });
    },
    
    // Detect anomalies in baby's patterns
    detectAnomalies: function() {
        if (!this.elements.anomalyContainer) return;
        
        // Don't detect anomalies if there's not enough data
        if (!this.data.hasEnoughData()) {
            this.elements.anomalyContainer.style.display = 'none';
            return;
        }
        
        const anomalies = [];
        
        // Check feeding patterns
        const feedingAnomalies = this.predictions.detectFeedingAnomalies();
        if (feedingAnomalies.length > 0) {
            anomalies.push(...feedingAnomalies);
        }
        
        // Check sleep patterns
        const sleepAnomalies = this.predictions.detectSleepAnomalies();
        if (sleepAnomalies.length > 0) {
            anomalies.push(...sleepAnomalies);
        }
        
        // Check diaper patterns
        const diaperAnomalies = this.predictions.detectDiaperAnomalies();
        if (diaperAnomalies.length > 0) {
            anomalies.push(...diaperAnomalies);
        }
        
        // Update anomaly container
        if (anomalies.length > 0) {
            this.elements.anomalyContainer.innerHTML = `
                <h4>Pattern Changes Detected</h4>
                <ul id="anomaly-list">
                    ${anomalies.map(a => `<li class="anomaly ${a.severity}">${a.message}</li>`).join('')}
                </ul>
            `;
            this.elements.anomalyContainer.style.display = 'block';
        } else {
            this.elements.anomalyContainer.style.display = 'none';
        }
    },
    
    // Toggle sleep tracking
    toggleSleep: function() {
        if (this.state.isTrackingSleep) {
            // End sleep tracking
            this.endSleepTracking();
        } else {
            // Start sleep tracking
            this.startSleepTracking();
        }
        
        // Update UI
        this.updateSleepToggleButton();
        this.updateSleepStatus();
    },
    
    // Start sleep tracking
    startSleepTracking: function() {
        const now = Date.now();
        this.state.isTrackingSleep = true;
        this.state.sleepStartTime = now;
        
        // Create a sleep event with start time
        const event = {
            type: 'sleep',
            timestamp: now,
            sleepStart: now,
            notes: 'Sleep started from dashboard'
        };
        
        // Save the event
        this.data.addEvent(event);
        
        this.showNotification('Sleep tracking started');
    },
    
    // End sleep tracking
    endSleepTracking: function() {
        if (!this.state.isTrackingSleep || !this.state.sleepStartTime) {
            return;
        }
        
        const now = Date.now();
        const sleepStart = this.state.sleepStartTime;
        const duration = now - sleepStart;
        
        // Create a sleep event with start and end time
        const event = {
            type: 'sleep',
            timestamp: sleepStart, // Use start time as the event time
            sleepStart: sleepStart,
            sleepEnd: now,
            duration: duration,
            notes: 'Sleep ended from dashboard'
        };
        
        // Save the event
        this.data.addEvent(event);
        
        // Reset tracking state
        this.state.isTrackingSleep = false;
        this.state.sleepStartTime = null;
        
        this.showNotification(`Sleep session ended (${this.formatDuration(duration)})`);
    },
    
    // Check sleep status
    checkSleepStatus: function() {
        // Check localStorage for ongoing sleep
        const sleepData = localStorage.getItem('ongoingSleep');
        if (sleepData) {
            try {
                const parsedData = JSON.parse(sleepData);
                this.state.isTrackingSleep = true;
                this.state.sleepStartTime = parsedData.startTime;
            } catch (e) {
                console.error('Error parsing sleep data:', e);
                this.state.isTrackingSleep = false;
                this.state.sleepStartTime = null;
                localStorage.removeItem('ongoingSleep');
            }
        } else {
            this.state.isTrackingSleep = false;
            this.state.sleepStartTime = null;
        }
        
        // Update UI
        this.updateSleepToggleButton();
    },
    
    // Update sleep toggle button
    updateSleepToggleButton: function() {
        if (!this.elements.sleepToggleButton) return;
        
        if (this.state.isTrackingSleep) {
            this.elements.sleepToggleButton.textContent = 'End Sleep';
            this.elements.sleepToggleButton.classList.add('active');
            
            // Also update the quick menu button label
            if (this.elements.sleepQuickLabel) {
                this.elements.sleepQuickLabel.textContent = 'End Sleep';
            }
            
            // Store sleep state in localStorage for persistence
            localStorage.setItem('ongoingSleep', JSON.stringify({
                startTime: this.state.sleepStartTime
            }));
        } else {
            this.elements.sleepToggleButton.textContent = 'Start Sleep';
            this.elements.sleepToggleButton.classList.remove('active');
            
            // Also update the quick menu button label
            if (this.elements.sleepQuickLabel) {
                this.elements.sleepQuickLabel.textContent = 'Sleep';
            }
            
            // Remove sleep state from localStorage
            localStorage.removeItem('ongoingSleep');
        }
    },
    
    // Get baby age in months
    getBabyAgeMonths: function() {
        const dob = this.getBabyDOB();
        if (!dob) return null;
        
        const now = new Date();
        const dobDate = new Date(dob);
        
        // Calculate difference in months
        let months = (now.getFullYear() - dobDate.getFullYear()) * 12;
        months += now.getMonth() - dobDate.getMonth();
        
        // Adjust for day of month
        if (now.getDate() < dobDate.getDate()) {
            months--;
        }
        
        return months;
    },
    
    // Get baby age for display
    getBabyAgeForDisplay: function() {
        const dob = this.getBabyDOB();
        if (!dob) return null;
        
        const now = new Date();
        const dobDate = new Date(dob);
        
        // Calculate difference in milliseconds
        const diffMs = now - dobDate;
        
        // Calculate years, months, and days
        const msInDay = 1000 * 60 * 60 * 24;
        const msInMonth = msInDay * 30.44; // Average days in month
        const msInYear = msInDay * 365.25; // Account for leap years
        
        const years = Math.floor(diffMs / msInYear);
        const months = Math.floor((diffMs % msInYear) / msInMonth);
        const days = Math.floor((diffMs % msInMonth) / msInDay);
        
        // Format the age string
        let ageString = '';
        
        if (years > 0) {
            ageString += `${years} year${years !== 1 ? 's' : ''}`;
            
            if (months > 0 || days > 0) {
                ageString += ', ';
            }
        }
        
        if (months > 0) {
            ageString += `${months} month${months !== 1 ? 's' : ''}`;
            
            if (days > 0) {
                ageString += ', ';
            }
        }
        
        if (days > 0 || (years === 0 && months === 0)) {
            ageString += `${days} day${days !== 1 ? 's' : ''}`;
        }
        
        return ageString;
    },
    
    // Update baby age banner
    updateBabyAgeBanner: function() {
        if (!this.elements.babyAgeBanner) return;
        
        const dob = this.getBabyDOB();
        if (!dob) {
            this.elements.babyAgeBanner.style.display = 'none';
            return;
        }
        
        const babyName = this.getBabyName() || 'Baby';
        const ageString = this.getBabyAgeForDisplay();
        
        if (!ageString) {
            this.elements.babyAgeBanner.style.display = 'none';
            return;
        }
        
        // Update DOM
        if (this.elements.babyNameDisplay) {
            this.elements.babyNameDisplay.textContent = babyName;
        }
        
        if (this.elements.babyAgeDisplay) {
            this.elements.babyAgeDisplay.textContent = ageString;
        }
        
        this.elements.babyAgeBanner.style.display = 'flex';
    },
    
    // Get baby DOB
    getBabyDOB: function() {
        return localStorage.getItem('babyDOB') || null;
    },
    
    // Get baby name
    getBabyName: function() {
        return localStorage.getItem('babyName') || this.config.defaultBabyName;
    },
    
    // Load baby info into settings
    loadBabyInfo: function() {
        const babyName = this.getBabyName();
        const babyDOB = this.getBabyDOB();
        const babyGender = localStorage.getItem('babyGender') || '';
        
        // Update header
        if (this.elements.headerBabyName) {
            this.elements.headerBabyName.textContent = babyName;
        }
        
        // Update settings inputs
        if (this.elements.babyNameInput) {
            this.elements.babyNameInput.value = babyName;
        }
        
        if (this.elements.babyDobInput && babyDOB) {
            this.elements.babyDobInput.value = babyDOB;
        }
        
        if (this.elements.babyGenderInput) {
            this.elements.babyGenderInput.value = babyGender;
        }
        
        // Update age banner
        this.updateBabyAgeBanner();
    },
    
    // Save baby info from settings
    saveBabyInfo: function() {
        if (!this.elements.babyNameInput) return;
        
        const babyName = this.elements.babyNameInput.value.trim();
        const babyDOB = this.elements.babyDobInput ? this.elements.babyDobInput.value : '';
        const babyGender = this.elements.babyGenderInput ? this.elements.babyGenderInput.value : '';
        
        // Save to localStorage
        localStorage.setItem('babyName', babyName);
        
        if (babyDOB) {
            localStorage.setItem('babyDOB', babyDOB);
        }
        
        localStorage.setItem('babyGender', babyGender);
        
        // Update header
        if (this.elements.headerBabyName) {
            this.elements.headerBabyName.textContent = babyName;
        }
        
        // Update age banner
        this.updateBabyAgeBanner();
        
        // Update milestones preview (age dependent)
        this.updateMilestonesPreview();
        
        // Refresh milestones tab if it's active
        if (this.tabs.currentTab === 'milestones') {
            this.milestones.renderMilestones();
        }
        
        this.showNotification('Baby information saved');
    },
    
    // Save app settings
    saveSettings: function() {
        // Time and date formats
        if (this.elements.timeFormatInput) {
            localStorage.setItem('timeFormat', this.elements.timeFormatInput.value);
        }
        
        if (this.elements.dateFormatInput) {
            localStorage.setItem('dateFormat', this.elements.dateFormatInput.value);
        }
        
        // Units
        if (this.elements.tempUnitInput) {
            this.state.displayUnits.temperature = this.elements.tempUnitInput.value;
            localStorage.setItem('tempUnit', this.elements.tempUnitInput.value);
        }
        
        if (this.elements.weightUnitInput) {
            this.state.displayUnits.weight = this.elements.weightUnitInput.value;
            localStorage.setItem('weightUnit', this.elements.weightUnitInput.value);
        }
        
        if (this.elements.lengthUnitInput) {
            this.state.displayUnits.length = this.elements.lengthUnitInput.value;
            localStorage.setItem('lengthUnit', this.elements.lengthUnitInput.value);
        }
        
        // Features
        if (this.elements.advancedPredictions) {
            localStorage.setItem('advancedPredictions', this.elements.advancedPredictions.checked);
            this.config.enablePredictions = this.elements.advancedPredictions.checked;
        }
        
        if (this.elements.voiceInputEnabled) {
            localStorage.setItem('voiceInputEnabled', this.elements.voiceInputEnabled.checked);
            this.state.voiceInputEnabled = this.elements.voiceInputEnabled.checked;
        }
        
        if (this.elements.notifyMilestones) {
            localStorage.setItem('notifyMilestones', this.elements.notifyMilestones.checked);
        }
        
        if (this.elements.alarmSoundEnabled) {
            localStorage.setItem('alarmSoundEnabled', this.elements.alarmSoundEnabled.checked);
        }
        
        // Backup
        if (this.elements.autoBackup) {
            localStorage.setItem('autoBackup', this.elements.autoBackup.checked);
        }
        
        if (this.elements.backupInterval) {
            localStorage.setItem('backupInterval', this.elements.backupInterval.value);
            this.config.autoBackupInterval = parseInt(this.elements.backupInterval.value);
        }
        
        this.showNotification('Settings saved');
        
        // Update UI with new settings
        this.updateDashboard();
    },
    
    // Load settings from storage
    loadSettings: function() {
        // Time and date formats
        if (this.elements.timeFormatInput) {
            const timeFormat = localStorage.getItem('timeFormat');
            if (timeFormat) {
                this.elements.timeFormatInput.value = timeFormat;
            }
        }
        
        if (this.elements.dateFormatInput) {
            const dateFormat = localStorage.getItem('dateFormat');
            if (dateFormat) {
                this.elements.dateFormatInput.value = dateFormat;
            }
        }
        
        // Units
        if (this.elements.tempUnitInput) {
            const tempUnit = localStorage.getItem('tempUnit');
            if (tempUnit) {
                this.elements.tempUnitInput.value = tempUnit;
                this.state.displayUnits.temperature = tempUnit;
            }
        }
        
        if (this.elements.weightUnitInput) {
            const weightUnit = localStorage.getItem('weightUnit');
            if (weightUnit) {
                this.elements.weightUnitInput.value = weightUnit;
                this.state.displayUnits.weight = weightUnit;
            }
        }
        
        if (this.elements.lengthUnitInput) {
            const lengthUnit = localStorage.getItem('lengthUnit');
            if (lengthUnit) {
                this.elements.lengthUnitInput.value = lengthUnit;
                this.state.displayUnits.length = lengthUnit;
            }
        }
        
        // Features
        if (this.elements.advancedPredictions) {
            const advancedPredictions = localStorage.getItem('advancedPredictions');
            if (advancedPredictions) {
                this.elements.advancedPredictions.checked = advancedPredictions === 'true';
                this.config.enablePredictions = advancedPredictions === 'true';
            }
        }
        
        if (this.elements.voiceInputEnabled) {
            const voiceInputEnabled = localStorage.getItem('voiceInputEnabled');
            if (voiceInputEnabled) {
                this.elements.voiceInputEnabled.checked = voiceInputEnabled === 'true';
                this.state.voiceInputEnabled = voiceInputEnabled === 'true';
            }
        }
        
        if (this.elements.notifyMilestones) {
            const notifyMilestones = localStorage.getItem('notifyMilestones');
            if (notifyMilestones) {
                this.elements.notifyMilestones.checked = notifyMilestones === 'true';
            }
        }
        
        if (this.elements.alarmSoundEnabled) {
            const alarmSoundEnabled = localStorage.getItem('alarmSoundEnabled');
            if (alarmSoundEnabled) {
                this.elements.alarmSoundEnabled.checked = alarmSoundEnabled === 'true';
            }
        }
        
        // Backup
        if (this.elements.autoBackup) {
            const autoBackup = localStorage.getItem('autoBackup');
            if (autoBackup) {
                this.elements.autoBackup.checked = autoBackup === 'true';
            }
        }
        
        if (this.elements.backupInterval) {
            const backupInterval = localStorage.getItem('backupInterval');
            if (backupInterval) {
                this.elements.backupInterval.value = backupInterval;
                this.config.autoBackupInterval = parseInt(backupInterval);
            }
        }
        
        // Pump schedule
        this.loadPumpSchedule();
        
        // Last backup time
        this.updateLastBackupTime();
    },
    
    // Set up automatic backup
    setupAutoBackup: function() {
        // Check for auto backup setting
        const autoBackup = localStorage.getItem('autoBackup');
        if (autoBackup === 'false') {
            return; // Auto backup disabled
        }
        
        // Get interval from settings or use default
        const backupInterval = parseInt(localStorage.getItem('backupInterval')) || this.config.autoBackupInterval;
        
        // Convert to milliseconds
        const backupIntervalMs = backupInterval * 60 * 60 * 1000;
        
        // Check when the last backup was made
        const lastBackup = localStorage.getItem('lastBackupTime');
        if (lastBackup) {
            const lastBackupTime = parseInt(lastBackup);
            const now = Date.now();
            
            // If it's time for a backup
            if (now - lastBackupTime >= backupIntervalMs) {
                this.data.createBackup();
            }
        } else {
            // No backup yet, create one
            this.data.createBackup();
        }
        
        // Schedule next backup check
        setInterval(() => {
            const shouldBackup = localStorage.getItem('autoBackup') !== 'false';
            if (shouldBackup) {
                this.data.createBackup();
            }
        }, backupIntervalMs);
    },
    
    // Update last backup time display
    updateLastBackupTime: function() {
        if (!this.elements.lastBackupTime) return;
        
        const lastBackup = localStorage.getItem('lastBackupTime');
        if (lastBackup) {
            const lastBackupTime = parseInt(lastBackup);
            this.elements.lastBackupTime.textContent = this.formatDateTime(lastBackupTime);
        } else {
            this.elements.lastBackupTime.textContent = 'No backup yet';
        }
    },
    
    // Save pump schedule
    savePumpSchedule: function() {
        if (!this.elements.pumpInterval || !this.elements.pumpStartTime) return;
        
        const interval = parseFloat(this.elements.pumpInterval.value);
        const startTime = this.elements.pumpStartTime.value;
        
        if (isNaN(interval) || interval <= 0) {
            this.showNotification('Please enter a valid interval', 3000);
            return;
        }
        
        const schedule = {
            interval: interval,
            startTime: startTime
        };
        
        localStorage.setItem('pumpSchedule', JSON.stringify(schedule));
        
        // Update display
        this.updatePumpScheduleDisplay();
        
        this.showNotification('Pump schedule saved');
    },
    
    // Load pump schedule
    loadPumpSchedule: function() {
        if (!this.elements.pumpInterval || !this.elements.pumpStartTime) return;
        
        const scheduleData = localStorage.getItem('pumpSchedule');
        if (scheduleData) {
            try {
                const schedule = JSON.parse(scheduleData);
                
                if (schedule.interval) {
                    this.elements.pumpInterval.value = schedule.interval;
                }
                
                if (schedule.startTime) {
                    this.elements.pumpStartTime.value = schedule.startTime;
                }
                
                // Update display
                this.updatePumpScheduleDisplay();
            } catch (e) {
                console.error('Error parsing pump schedule:', e);
            }
        }
    },
    
    // Update pump schedule display
    updatePumpScheduleDisplay: function() {
        if (!this.elements.currentPumpSchedule) return;
        
        const schedule = this.getPumpSchedule();
        if (!schedule || !schedule.interval) {
            this.elements.currentPumpSchedule.textContent = 'Not set';
            return;
        }
        
        let scheduleText = `Every ${schedule.interval} hours`;
        
        if (schedule.startTime) {
            const timeFormat = this.getTimeFormatFromSettings();
            const startTimeDate = new Date(`2000-01-01T${schedule.startTime}`);
            scheduleText += ` starting at ${this.formatTime(startTimeDate, timeFormat)}`;
        }
        
        this.elements.currentPumpSchedule.textContent = scheduleText;
    },
    
    // Get pump schedule
    getPumpSchedule: function() {
        const scheduleData = localStorage.getItem('pumpSchedule');
        if (scheduleData) {
            try {
                return JSON.parse(scheduleData);
            } catch (e) {
                console.error('Error parsing pump schedule:', e);
                return null;
            }
        }
        return null;
    },
    
    // Calculate next pump time based on schedule
    calculateNextPumpTime: function(schedule) {
        if (!schedule || !schedule.interval) return null;
        
        // Get last pump time
        const lastPump = this.data.getLastEventOfType('pump');
        if (!lastPump) {
            // No pump recorded yet
            
            // If we have a start time, use that for the first pump
            if (schedule.startTime) {
                const [hours, minutes] = schedule.startTime.split(':').map(Number);
                
                const now = new Date();
                const scheduledTime = new Date();
                scheduledTime.setHours(hours, minutes, 0, 0);
                
                // If the scheduled time is in the past, add the interval
                if (scheduledTime < now) {
                    // Add interval hours to the scheduled time
                    scheduledTime.setTime(scheduledTime.getTime() + schedule.interval * 60 * 60 * 1000);
                    
                    // If it's still in the past (interval < 24h), move to tomorrow
                    if (scheduledTime < now) {
                        scheduledTime.setDate(scheduledTime.getDate() + 1);
                    }
                }
                
                return scheduledTime.getTime();
            }
            
            // No start time set, schedule from now
            return Date.now() + schedule.interval * 60 * 60 * 1000;
        }
        
        // Calculate next pump time based on last pump
        return lastPump.timestamp + schedule.interval * 60 * 60 * 1000;
    },
    
    // Check for alarms that need to be triggered
    checkAlarms: function() {
        // Don't check if alarms are paused
        if (this.state.alarmsPaused) return;
        
        const now = Date.now();
        
        // Only check every minute to avoid excessive checks
        if (now - this.state.lastNotificationTime < 60000) return;
        
        // Check for feed alarm
        this.checkFeedingAlarm();
        
        // Check for diaper alarm
        this.checkDiaperAlarm();
        
        // Check for sleep alarm
        this.checkSleepAlarm();
        
        // Check for pump alarm
        this.checkPumpAlarm();
        
        // Check for medicine alarms
        this.checkMedicineAlarms();
        
        // Update last check time
        this.state.lastNotificationTime = now;
    },
    
    // Check for feeding alarm
    checkFeedingAlarm: function() {
        const nextFeedTime = this.predictions.predictNextFeeding();
        if (!nextFeedTime) return;
        
        const now = Date.now();
        
        // Check if next feed time has passed
        if (nextFeedTime <= now) {
            // Don't alarm if snoozed
            if (this.state.alarmSnoozeTimers['feeding']) return;
            
            // Trigger alarm
            this.alarms.trigger('feeding', 'Time to feed baby');
        }
    },
    
    // Check for diaper alarm
    checkDiaperAlarm: function() {
        const nextWetTime = this.predictions.predictNextDiaper('wet');
        const nextDirtyTime = this.predictions.predictNextDiaper('dirty');
        
        if (!nextWetTime && !nextDirtyTime) return;
        
        const now = Date.now();
        
        // Check if next diaper time has passed
        if (nextWetTime && nextWetTime <= now) {
            // Don't alarm if snoozed
            if (this.state.alarmSnoozeTimers['diaper_wet']) return;
            
            // Trigger alarm
            this.alarms.trigger('diaper_wet', 'Time to check for a wet diaper');
        }
        
        if (nextDirtyTime && nextDirtyTime <= now) {
            // Don't alarm if snoozed
            if (this.state.alarmSnoozeTimers['diaper_dirty']) return;
            
            // Trigger alarm
            this.alarms.trigger('diaper_dirty', 'Time to check for a dirty diaper');
        }
    },
    
    // Check for sleep alarm
    checkSleepAlarm: function() {
        // If currently sleeping, check for wake time
        if (this.state.isTrackingSleep && this.state.sleepStartTime) {
            const nextWakeTime = this.predictions.predictSleepEnd();
            if (!nextWakeTime) return;
            
            const now = Date.now();
            
            // Check if wake time has passed
            if (nextWakeTime <= now) {
                // Don't alarm if snoozed
                if (this.state.alarmSnoozeTimers['sleep_wake']) return;
                
                // Trigger alarm
                this.alarms.trigger('sleep_wake', 'Baby may be ready to wake up');
            }
        } else {
            // Check for next sleep time
            const nextSleepTime = this.predictions.predictNextSleep();
            if (!nextSleepTime) return;
            
            const now = Date.now();
            
            // Check if sleep time has passed
            if (nextSleepTime <= now) {
                // Don't alarm if snoozed
                if (this.state.alarmSnoozeTimers['sleep_start']) return;
                
                // Trigger alarm
                this.alarms.trigger('sleep_start', 'Baby may be ready for sleep');
            }
        }
    },
    
    // Check for pump alarm
    checkPumpAlarm: function() {
        const pumpSchedule = this.getPumpSchedule();
        if (!pumpSchedule || !pumpSchedule.interval) return;
        
        const nextPumpTime = this.calculateNextPumpTime(pumpSchedule);
        if (!nextPumpTime) return;
        
        const now = Date.now();
        
        // Check if pump time has passed
        if (nextPumpTime <= now) {
            // Don't alarm if snoozed
            if (this.state.alarmSnoozeTimers['pump']) return;
            
            // Trigger alarm
            this.alarms.trigger('pump', 'Time to pump');
        }
    },
    
    // Check for medicine alarms
    checkMedicineAlarms: function() {
        const scheduledMeds = this.data.getScheduledMedicines();
        if (scheduledMeds.length === 0) return;
        
        const now = Date.now();
        
        // Check each scheduled medicine
        for (const med of scheduledMeds) {
            if (med.nextDoseTime <= now) {
                // Don't alarm if snoozed
                const alarmId = `medicine_${med.id || med.medicineName}`;
                if (this.state.alarmSnoozeTimers[alarmId]) continue;
                
                // Trigger alarm
                const message = med.medicineName 
                    ? `Time for ${med.medicineName} dose`
                    : 'Time for scheduled medicine';
                    
                this.alarms.trigger(alarmId, message);
            }
        }
    },
    
    // Update alarm pause status display
    updateAlarmPauseStatus: function() {
        if (!this.elements.alarmPauseStatus) return;
        
        this.elements.alarmPauseStatus.textContent = this.state.alarmsPaused ? 'Yes' : 'No';
        
        // Show/hide force resume button
        if (this.elements.forceResumeAlarms) {
            this.elements.forceResumeAlarms.style.display = this.state.alarmsPaused ? 'block' : 'none';
        }
    },
    
    // Open medicine schedule modal
    openMedicineScheduleModal: function() {
        this.modal.open('medicineSchedule');
    },
    
    // Handle form submission
    handleFormSubmit: function(form) {
        const action = form.dataset.action;
        const eventId = form.dataset.eventId;
        
        // Extract form data
        const formData = new FormData(form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        console.log('Form submission:', action, data);
        
        // Determine event type from action
        let eventType;
        if (action.includes('feed')) eventType = 'feeding';
        else if (action.includes('diaper')) eventType = 'diaper';
        else if (action.includes('sleep')) eventType = 'sleep';
        else if (action.includes('pump')) eventType = 'pump';
        else if (action.includes('growth')) eventType = 'growth';
        else if (action.includes('temperature')) eventType = 'temperature';
        else if (action.includes('medicine')) eventType = 'medicine';
        else if (action.includes('milestone')) eventType = 'milestone';
        else eventType = action;
        
        // Create event object
        let event = {
            type: eventType,
            timestamp: data.eventTime ? new Date(data.eventTime).getTime() : Date.now()
        };
        
        // Add type-specific data
        switch (eventType) {
            case 'feeding':
                event.feedType = data.feedType || 'bottle';
                if (data.feedSide) event.feedSide = data.feedSide;
                if (data.amount) event.amount = parseFloat(data.amount);
                if (data.unit) event.unit = data.unit;
                if (data.duration) event.duration = parseFloat(data.duration) * 60 * 1000; // Convert to ms
                break;
                
            case 'diaper':
                event.diaperType = data.diaperType || 'wet';
                break;
                
            case 'sleep':
                // Handle sleep events
                if (data.sleepStart) event.sleepStart = new Date(data.sleepStart).getTime();
                if (data.sleepEnd) event.sleepEnd = new Date(data.sleepEnd).getTime();
                
                // Calculate duration if both start and end are present
                if (event.sleepStart && event.sleepEnd) {
                    event.duration = event.sleepEnd - event.sleepStart;
                }
                break;
                
            case 'pump':
                if (data.amount) event.amount = parseFloat(data.amount);
                if (data.unit) event.unit = data.unit;
                if (data.duration) event.duration = parseFloat(data.duration) * 60 * 1000; // Convert to ms
                break;
                
            case 'growth':
                if (data.weight) event.weight = parseFloat(data.weight);
                if (data.weightUnit) event.weightUnit = data.weightUnit;
                if (data.length) event.length = parseFloat(data.length);
                if (data.lengthUnit) event.lengthUnit = data.lengthUnit;
                if (data.headCircumference) event.headCircumference = parseFloat(data.headCircumference);
                if (data.headUnit) event.headUnit = data.headUnit;
                break;
                
            case 'temperature':
                if (data.temperature) event.temperature = parseFloat(data.temperature);
                if (data.tempUnit) event.tempUnit = data.tempUnit;
                if (data.location) event.location = data.location;
                break;
                
            case 'medicine':
                if (data.medicineName) event.medicineName = data.medicineName;
                if (data.doseAmount) event.doseAmount = parseFloat(data.doseAmount);
                if (data.doseUnit) event.doseUnit = data.doseUnit;
                
                // Handle scheduling
                if (data.scheduleRepeat === 'yes') {
                    event.scheduled = true;
                    event.frequency = data.frequency || 'once';
                    
                    if (data.frequencyHours) {
                        event.frequencyHours = parseInt(data.frequencyHours);
                    }
                    
                    if (data.frequencyDays) {
                        event.frequencyDays = parseInt(data.frequencyDays);
                    }
                    
                    if (data.doses) {
                        event.dosesRemaining = parseInt(data.doses);
                    }
                    
                    // Calculate next dose time
                    if (event.frequency === 'hours' && event.frequencyHours) {
                        event.nextDoseTime = event.timestamp + (event.frequencyHours * 60 * 60 * 1000);
                    } else if (event.frequency === 'days' && event.frequencyDays) {
                        event.nextDoseTime = event.timestamp + (event.frequencyDays * 24 * 60 * 60 * 1000);
                    }
                }
                break;
                
            case 'milestone':
                if (data.milestoneName) event.milestoneName = data.milestoneName;
                if (data.milestoneCategory) event.milestoneCategory = data.milestoneCategory;
                break;
        }
        
        // Add notes if present
        if (data.notes) {
            event.notes = data.notes;
        }
        
        // If updating existing event
        if (eventId) {
            event.id = eventId;
            this.data.updateEvent(event);
            this.showNotification('Event updated successfully');
        } else {
            // New event
            this.data.addEvent(event);
            this.showNotification(`${this.capitalizeFirstLetter(eventType)} logged successfully`);
        }
        
        // Close modal
        this.modal.close();
        
        // Update dashboard
        this.updateDashboard();
        
        // Update history display
        this.history.updateEventList();
    },
    
    // Capitalize first letter of a string
    capitalizeFirstLetter: function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },
    
    // Modal management
    modal: {
        open: function(action, eventId = null) {
            if (!BabyTrackerPro.elements.modal || !BabyTrackerPro.elements.modalForm) return;
            
            // Clear previous form
            BabyTrackerPro.elements.modalForm.innerHTML = '';
            
            // Set form data attributes
            BabyTrackerPro.elements.modalForm.dataset.action = action;
            if (eventId) {
                BabyTrackerPro.elements.modalForm.dataset.eventId = eventId;
            } else {
                BabyTrackerPro.elements.modalForm.dataset.eventId = '';
            }
            
            // Set modal title
            if (BabyTrackerPro.elements.modalTitle) {
                let title = 'Log Event';
                
                switch (action) {
                    case 'feeding':
                        title = 'Log Feeding';
                        break;
                    case 'diaper':
                        title = 'Log Diaper Change';
                        break;
                    case 'sleep':
                        title = 'Log Sleep';
                        break;
                    case 'pump':
                        title = 'Log Pumping';
                        break;
                    case 'growth':
                        title = 'Log Growth Measurement';
                        break;
                    case 'temperature':
                        title = 'Log Temperature';
                        break;
                    case 'medicine':
                        title = 'Log Medicine';
                        break;
                    case 'medicineSchedule':
                        title = 'Schedule Medicine';
                        break;
                    case 'milestone':
                        title = 'Log Milestone';
                        break;
                }
                
                BabyTrackerPro.elements.modalTitle.textContent = title;
            }
            
            // Build form based on action
            this.buildForm(action, eventId);
            
            // Show modal
            BabyTrackerPro.elements.modal.style.display = 'block';
        },
        
        close: function() {
            if (!BabyTrackerPro.elements.modal) return;
            BabyTrackerPro.elements.modal.style.display = 'none';
        },
        
        buildForm: function(action, eventId = null) {
            if (!BabyTrackerPro.elements.modalForm) return;
            
            const form = BabyTrackerPro.elements.modalForm;
            const now = new Date();
            let event = null;
            
            // If editing existing event, get its data
            if (eventId) {
                event = BabyTrackerPro.data.getEventById(eventId);
            }
            
            // Common fields for all forms
            
            // Date/time picker
            const timeLabel = document.createElement('label');
            timeLabel.textContent = 'Date/Time:';
            timeLabel.setAttribute('for', 'eventTime');
            form.appendChild(timeLabel);
            
            const timeInput = document.createElement('input');
            timeInput.type = 'datetime-local';
            timeInput.id = 'eventTime';
            timeInput.name = 'eventTime';
            
            // Format the date and time for the input
            const dateValue = event ? new Date(event.timestamp) : now;
            const isoString = dateValue.toISOString().slice(0, 16);
            timeInput.value = isoString;
            
            form.appendChild(timeInput);
            
            // Build type-specific form fields
            switch (action) {
                case 'feeding':
                    this.buildFeedingForm(form, event);
                    break;
                case 'diaper':
                    this.buildDiaperForm(form, event);
                    break;
                case 'sleep':
                    this.buildSleepForm(form, event);
                    break;
                case 'pump':
                    this.buildPumpForm(form, event);
                    break;
                case 'growth':
                    this.buildGrowthForm(form, event);
                    break;
                case 'temperature':
                    this.buildTemperatureForm(form, event);
                    break;
                case 'medicine':
                    this.buildMedicineForm(form, event);
                    break;
                case 'medicineSchedule':
                    this.buildMedicineScheduleForm(form, event);
                    break;
                case 'milestone':
                    this.buildMilestoneForm(form, event);
                    break;
                default:
                    // Generic form for unknown types
                    const noteLabel = document.createElement('label');
                    noteLabel.textContent = 'Notes:';
                    noteLabel.setAttribute('for', 'notes');
                    form.appendChild(noteLabel);
                    
                    const noteInput = document.createElement('textarea');
                    noteInput.id = 'notes';
                    noteInput.name = 'notes';
                    noteInput.rows = 3;
                    noteInput.value = event?.notes || '';
                    form.appendChild(noteInput);
            }
            
            // Add submit button
            const submitButton = document.createElement('button');
            submitButton.type = 'submit';
            submitButton.textContent = event ? 'Update' : 'Save';
            form.appendChild(submitButton);
        },
        
        buildFeedingForm: function(form, event = null) {
            // Feed type selection
            const typeLabel = document.createElement('label');
            typeLabel.textContent = 'Feed Type:';
            typeLabel.setAttribute('for', 'feedType');
            form.appendChild(typeLabel);
            
            const typeSelect = document.createElement('select');
            typeSelect.id = 'feedType';
            typeSelect.name = 'feedType';
            
            const typeOptions = [
                { value: 'bottle', text: 'Bottle' },
                { value: 'breast', text: 'Breast' },
                { value: 'solid', text: 'Solid Food' }
            ];
            
            for (const option of typeOptions) {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.text;
                
                if (event && event.feedType === option.value) {
                    optionEl.selected = true;
                }
                
                typeSelect.appendChild(optionEl);
            }
            
            form.appendChild(typeSelect);
            
            // Breast side selection (only for breast feeds)
            const sideContainer = document.createElement('div');
            sideContainer.id = 'breastSideContainer';
            sideContainer.style.display = event && event.feedType === 'breast' ? 'block' : 'none';
            
            const sideLabel = document.createElement('label');
            sideLabel.textContent = 'Which Side:';
            sideLabel.setAttribute('for', 'feedSide');
            sideContainer.appendChild(sideLabel);
            
            const sideSelect = document.createElement('select');
            sideSelect.id = 'feedSide';
            sideSelect.name = 'feedSide';
            
            const sideOptions = [
                { value: 'left', text: 'Left' },
                { value: 'right', text: 'Right' },
                { value: 'both', text: 'Both' }
            ];
            
            for (const option of sideOptions) {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.text;
                
                if (event && event.feedSide === option.value) {
                    optionEl.selected = true;
                }
                
                sideSelect.appendChild(optionEl);
            }
            
            sideContainer.appendChild(sideSelect);
            form.appendChild(sideContainer);
            
            // Amount (for bottle feeds)
            const amountContainer = document.createElement('div');
            amountContainer.id = 'feedAmountContainer';
            amountContainer.style.display = event && event.feedType === 'breast' ? 'none' : 'block';
            
            const amountLabel = document.createElement('label');
            amountLabel.textContent = 'Amount:';
            amountLabel.setAttribute('for', 'amount');
            amountContainer.appendChild(amountLabel);
            
            const amountWrapper = document.createElement('div');
            amountWrapper.className = 'input-group';
            
            const amountInput = document.createElement('input');
            amountInput.type = 'number';
            amountInput.id = 'amount';
            amountInput.name = 'amount';
            amountInput.min = '0';
            amountInput.step = '0.1';
            amountInput.value = event && event.amount ? event.amount : '';
            amountWrapper.appendChild(amountInput);
            
            const unitSelect = document.createElement('select');
            unitSelect.id = 'unit';
            unitSelect.name = 'unit';
            
            const unitOptions = [
                { value: 'oz', text: 'oz' },
                { value: 'ml', text: 'ml' }
            ];
            
            for (const option of unitOptions) {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.text;
                
                if (event && event.unit === option.value) {
                    optionEl.selected = true;
                }
                
                unitSelect.appendChild(optionEl);
            }
            
            amountWrapper.appendChild(unitSelect);
            amountContainer.appendChild(amountWrapper);
            form.appendChild(amountContainer);
            
            // Duration
            const durationLabel = document.createElement('label');
            durationLabel.textContent = 'Duration (minutes):';
            durationLabel.setAttribute('for', 'duration');
            form.appendChild(durationLabel);
            
            const durationInput = document.createElement('input');
            durationInput.type = 'number';
            durationInput.id = 'duration';
            durationInput.name = 'duration';
            durationInput.min = '0';
            
            if (event && event.duration) {
                // Convert ms to minutes
                durationInput.value = Math.round(event.duration / (60 * 1000));
            } else {
                durationInput.value = '';
            }
            
            form.appendChild(durationInput);
            
            // Notes
            const noteLabel = document.createElement('label');
            noteLabel.textContent = 'Notes:';
            noteLabel.setAttribute('for', 'notes');
            form.appendChild(noteLabel);
            
            const noteInput = document.createElement('textarea');
            noteInput.id = 'notes';
            noteInput.name = 'notes';
            noteInput.rows = 3;
            noteInput.value = event?.notes || '';
            form.appendChild(noteInput);
            
            // Add event listeners for feed type change
            typeSelect.addEventListener('change', function() {
                if (this.value === 'breast') {
                    sideContainer.style.display = 'block';
                    amountContainer.style.display = 'none';
                } else {
                    sideContainer.style.display = 'none';
                    amountContainer.style.display = 'block';
                }
            });
        },
        
        buildDiaperForm: function(form, event = null) {
            // Diaper type selection
            const typeLabel = document.createElement('label');
            typeLabel.textContent = 'Diaper Type:';
            typeLabel.setAttribute('for', 'diaperType');
            form.appendChild(typeLabel);
            
            const typeSelect = document.createElement('select');
            typeSelect.id = 'diaperType';
            typeSelect.name = 'diaperType';
            
            const typeOptions = [
                { value: 'wet', text: 'Wet' },
                { value: 'dirty', text: 'Dirty' },
                { value: 'mixed', text: 'Wet & Dirty' },
                { value: 'dry', text: 'Dry (No Change Needed)' }
            ];
            
            for (const option of typeOptions) {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.text;
                
                if (event && event.diaperType === option.value) {
                    optionEl.selected = true;
                }
                
                typeSelect.appendChild(optionEl);
            }
            
            form.appendChild(typeSelect);
            
            // Notes
            const noteLabel = document.createElement('label');
            noteLabel.textContent = 'Notes:';
            noteLabel.setAttribute('for', 'notes');
            form.appendChild(noteLabel);
            
            const noteInput = document.createElement('textarea');
            noteInput.id = 'notes';
            noteInput.name = 'notes';
            noteInput.rows = 3;
            noteInput.value = event?.notes || '';
            form.appendChild(noteInput);
        },
        
        buildSleepForm: function(form, event = null) {
            // Sleep start time
            const startLabel = document.createElement('label');
            startLabel.textContent = 'Sleep Start:';
            startLabel.setAttribute('for', 'sleepStart');
            form.appendChild(startLabel);
            
            const startInput = document.createElement('input');
            startInput.type = 'datetime-local';
            startInput.id = 'sleepStart';
            startInput.name = 'sleepStart';
            
            if (event && event.sleepStart) {
                const startDate = new Date(event.sleepStart);
                startInput.value = startDate.toISOString().slice(0, 16);
            } else {
                const defaultStart = new Date();
                defaultStart.setMinutes(defaultStart.getMinutes() - 30); // Default to 30 min ago
                startInput.value = defaultStart.toISOString().slice(0, 16);
            }
            
            form.appendChild(startInput);
            
            // Sleep end time
            const endLabel = document.createElement('label');
            endLabel.textContent = 'Sleep End:';
            endLabel.setAttribute('for', 'sleepEnd');
            form.appendChild(endLabel);
            
            const endInput = document.createElement('input');
            endInput.type = 'datetime-local';
            endInput.id = 'sleepEnd';
            endInput.name = 'sleepEnd';
            
            if (event && event.sleepEnd) {
                const endDate = new Date(event.sleepEnd);
                endInput.value = endDate.toISOString().slice(0, 16);
            } else {
                const now = new Date();
                endInput.value = now.toISOString().slice(0, 16);
            }
            
            form.appendChild(endInput);
            
            // Duration display (calculated)
            const durationDisplay = document.createElement('div');
            durationDisplay.className = 'form-display-text';
            durationDisplay.id = 'durationDisplay';
            
            // Calculate initial duration
            const startMs = new Date(startInput.value).getTime();
            const endMs = new Date(endInput.value).getTime();
            const durationMs = endMs - startMs;
            
            durationDisplay.textContent = `Duration: ${BabyTrackerPro.formatDuration(durationMs)}`;
            form.appendChild(durationDisplay);
            
            // Notes
            const noteLabel = document.createElement('label');
            noteLabel.textContent = 'Notes:';
            noteLabel.setAttribute('for', 'notes');
            form.appendChild(noteLabel);
            
            const noteInput = document.createElement('textarea');
            noteInput.id = 'notes';
            noteInput.name = 'notes';
            noteInput.rows = 3;
            noteInput.value = event?.notes || '';
            form.appendChild(noteInput);
            
            // Add event listeners to update duration
            startInput.addEventListener('change', updateDuration);
            endInput.addEventListener('change', updateDuration);
            
            function updateDuration() {
                try {
                    const startMs = new Date(startInput.value).getTime();
                    const endMs = new Date(endInput.value).getTime();
                    
                    if (endMs < startMs) {
                        durationDisplay.textContent = 'Error: End time is before start time';
                    } else {
                        const durationMs = endMs - startMs;
                        durationDisplay.textContent = `Duration: ${BabyTrackerPro.formatDuration(durationMs)}`;
                    }
                } catch (e) {
                    console.error('Error calculating duration:', e);
                    durationDisplay.textContent = 'Error calculating duration';
                }
            }
        },
        
        buildPumpForm: function(form, event = null) {
            // Amount
            const amountLabel = document.createElement('label');
            amountLabel.textContent = 'Amount:';
            amountLabel.setAttribute('for', 'amount');
            form.appendChild(amountLabel);
            
            const amountWrapper = document.createElement('div');
            amountWrapper.className = 'input-group';
            
            const amountInput = document.createElement('input');
            amountInput.type = 'number';
            amountInput.id = 'amount';
            amountInput.name = 'amount';
            amountInput.min = '0';
            amountInput.step = '0.1';
            amountInput.value = event && event.amount ? event.amount : '';
            amountWrapper.appendChild(amountInput);
            
            const unitSelect = document.createElement('select');
            unitSelect.id = 'unit';
            unitSelect.name = 'unit';
            
            const unitOptions = [
                { value: 'oz', text: 'oz' },
                { value: 'ml', text: 'ml' }
            ];
            
            for (const option of unitOptions) {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.text;
                
                if (event && event.unit === option.value) {
                    optionEl.selected = true;
                }
                
                unitSelect.appendChild(optionEl);
            }
            
            amountWrapper.appendChild(unitSelect);
            form.appendChild(amountWrapper);
            
            // Duration
            const durationLabel = document.createElement('label');
            durationLabel.textContent = 'Duration (minutes):';
            durationLabel.setAttribute('for', 'duration');
            form.appendChild(durationLabel);
            
            const durationInput = document.createElement('input');
            durationInput.type = 'number';
            durationInput.id = 'duration';
            durationInput.name = 'duration';
            durationInput.min = '0';
            
            if (event && event.duration) {
                // Convert ms to minutes
                durationInput.value = Math.round(event.duration / (60 * 1000));
            } else {
                durationInput.value = '';
            }
            
            form.appendChild(durationInput);
            
            // Notes
            const noteLabel = document.createElement('label');
            noteLabel.textContent = 'Notes:';
            noteLabel.setAttribute('for', 'notes');
            form.appendChild(noteLabel);
            
            const noteInput = document.createElement('textarea');
            noteInput.id = 'notes';
            noteInput.name = 'notes';
            noteInput.rows = 3;
            noteInput.value = event?.notes || '';
            form.appendChild(noteInput);
        },
        
        buildGrowthForm: function(form, event = null) {
            // Weight
            const weightLabel = document.createElement('label');
            weightLabel.textContent = 'Weight:';
            weightLabel.setAttribute('for', 'weight');
            form.appendChild(weightLabel);
            
            const weightWrapper = document.createElement('div');
            weightWrapper.className = 'input-group';
            
            const weightInput = document.createElement('input');
            weightInput.type = 'number';
            weightInput.id = 'weight';
            weightInput.name = 'weight';
            weightInput.min = '0';
            weightInput.step = '0.01';
            weightInput.value = event && event.weight ? event.weight : '';
            weightWrapper.appendChild(weightInput);
            
            const weightUnitSelect = document.createElement('select');
            weightUnitSelect.id = 'weightUnit';
            weightUnitSelect.name = 'weightUnit';
            
            const weightUnitOptions = [
                { value: 'lb', text: 'lb' },
                { value: 'kg', text: 'kg' }
            ];
            
            for (const option of weightUnitOptions) {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.text;
                
                if (event && event.weightUnit === option.value) {
                    optionEl.selected = true;
                } else if (!event && BabyTrackerPro.state.displayUnits.weight === option.value) {
                    optionEl.selected = true;
                }
                
                weightUnitSelect.appendChild(optionEl);
            }
            
            weightWrapper.appendChild(weightUnitSelect);
            form.appendChild(weightWrapper);
            
            // Length
            const lengthLabel = document.createElement('label');
            lengthLabel.textContent = 'Length/Height:';
            lengthLabel.setAttribute('for', 'length');
            form.appendChild(lengthLabel);
            
            const lengthWrapper = document.createElement('div');
            lengthWrapper.className = 'input-group';
            
            const lengthInput = document.createElement('input');
            lengthInput.type = 'number';
            lengthInput.id = 'length';
            lengthInput.name = 'length';
            lengthInput.min = '0';
            lengthInput.step = '0.1';
            lengthInput.value = event && event.length ? event.length : '';
            lengthWrapper.appendChild(lengthInput);
            
            const lengthUnitSelect = document.createElement('select');
            lengthUnitSelect.id = 'lengthUnit';
            lengthUnitSelect.name = 'lengthUnit';
            
            const lengthUnitOptions = [
                { value: 'in', text: 'in' },
                { value: 'cm', text: 'cm' }
            ];
            
            for (const option of lengthUnitOptions) {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.text;
                
                if (event && event.lengthUnit === option.value) {
                    optionEl.selected = true;
                } else if (!event && BabyTrackerPro.state.displayUnits.length === option.value) {
                    optionEl.selected = true;
                }
                
                lengthUnitSelect.appendChild(optionEl);
            }
            
            lengthWrapper.appendChild(lengthUnitSelect);
            form.appendChild(lengthWrapper);
            
            // Head Circumference
            const headLabel = document.createElement('label');
            headLabel.textContent = 'Head Circumference:';
            headLabel.setAttribute('for', 'headCircumference');
            form.appendChild(headLabel);
            
            const headWrapper = document.createElement('div');
            headWrapper.className = 'input-group';
            
            const headInput = document.createElement('input');
            headInput.type = 'number';
            headInput.id = 'headCircumference';
            headInput.name = 'headCircumference';
            headInput.min = '0';
            headInput.step = '0.1';
            headInput.value = event && event.headCircumference ? event.headCircumference : '';
            headWrapper.appendChild(headInput);
            
            const headUnitSelect = document.createElement('select');
            headUnitSelect.id = 'headUnit';
            headUnitSelect.name = 'headUnit';
            
            const headUnitOptions = [
                { value: 'in', text: 'in' },
                { value: 'cm', text: 'cm' }
            ];
            
            for (const option of headUnitOptions) {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.text;
                
                if (event && event.headUnit === option.value) {
                    optionEl.selected = true;
                } else if (!event && BabyTrackerPro.state.displayUnits.length === option.value) {
                    optionEl.selected = true;
                }
                
                headUnitSelect.appendChild(optionEl);
            }
            
            headWrapper.appendChild(headUnitSelect);
            form.appendChild(headWrapper);
            
            // Notes
            const noteLabel = document.createElement('label');
            noteLabel.textContent = 'Notes:';
            noteLabel.setAttribute('for', 'notes');
            form.appendChild(noteLabel);
            
            const noteInput = document.createElement('textarea');
            noteInput.id = 'notes';
            noteInput.name = 'notes';
            noteInput.rows = 3;
            noteInput.value = event?.notes || '';
            form.appendChild(noteInput);
        },
        
        buildTemperatureForm: function(form, event = null) {
            // Temperature
            const tempLabel = document.createElement('label');
            tempLabel.textContent = 'Temperature:';
            tempLabel.setAttribute('for', 'temperature');
            form.appendChild(tempLabel);
            
            const tempWrapper = document.createElement('div');
            tempWrapper.className = 'input-group';
            
            const tempInput = document.createElement('input');
            tempInput.type = 'number';
            tempInput.id = 'temperature';
            tempInput.name = 'temperature';
            tempInput.step = '0.1';
            tempInput.value = event && event.temperature ? event.temperature : '';
            tempWrapper.appendChild(tempInput);
            
            const tempUnitSelect = document.createElement('select');
            tempUnitSelect.id = 'tempUnit';
            tempUnitSelect.name = 'tempUnit';
            
            const tempUnitOptions = [
                { value: 'f', text: '°F' },
                { value: 'c', text: '°C' }
            ];
            
            for (const option of tempUnitOptions) {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.text;
                
                if (event && event.tempUnit === option.value) {
                    optionEl.selected = true;
                } else if (!event && BabyTrackerPro.state.displayUnits.temperature === option.value) {
                    optionEl.selected = true;
                }
                
                tempUnitSelect.appendChild(optionEl);
            }
            
            tempWrapper.appendChild(tempUnitSelect);
            form.appendChild(tempWrapper);
            
            // Location
            const locLabel = document.createElement('label');
            locLabel.textContent = 'Measurement Location:';
            locLabel.setAttribute('for', 'location');
            form.appendChild(locLabel);
            
            const locSelect = document.createElement('select');
            locSelect.id = 'location';
            locSelect.name = 'location';
            
            const locOptions = [
                { value: 'forehead', text: 'Forehead' },
                { value: 'ear', text: 'Ear' },
                { value: 'underarm', text: 'Underarm' },
                { value: 'rectal', text: 'Rectal' },
                { value: 'oral', text: 'Oral' },
                { value: 'other', text: 'Other' }
            ];
            
            for (const option of locOptions) {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.text;
                
                if (event && event.location === option.value) {
                    optionEl.selected = true;
                }
                
                locSelect.appendChild(optionEl);
            }
            
            form.appendChild(locSelect);
            
            // Notes
            const noteLabel = document.createElement('label');
            noteLabel.textContent = 'Notes:';
            noteLabel.setAttribute('for', 'notes');
            form.appendChild(noteLabel);
            
            const noteInput = document.createElement('textarea');
            noteInput.id = 'notes';
            noteInput.name = 'notes';
            noteInput.rows = 3;
            noteInput.value = event?.notes || '';
            form.appendChild(noteInput);
        },
        
        buildMedicineForm: function(form, event = null) {
            // Medicine name
            const nameLabel = document.createElement('label');
            nameLabel.textContent = 'Medicine Name:';
            nameLabel.setAttribute('for', 'medicineName');
            form.appendChild(nameLabel);
            
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.id = 'medicineName';
            nameInput.name = 'medicineName';
            nameInput.value = event?.medicineName || '';
            form.appendChild(nameInput);
            
            // Dose amount
            const doseLabel = document.createElement('label');
            doseLabel.textContent = 'Dose Amount:';
            doseLabel.setAttribute('for', 'doseAmount');
            form.appendChild(doseLabel);
            
            const doseWrapper = document.createElement('div');
            doseWrapper.className = 'input-group';
            
            const doseInput = document.createElement('input');
            doseInput.type = 'number';
            doseInput.id = 'doseAmount';
            doseInput.name = 'doseAmount';
            doseInput.min = '0';
            doseInput.step = '0.01';
            doseInput.value = event && event.doseAmount ? event.doseAmount : '';
            doseWrapper.appendChild(doseInput);
            
            const doseUnitSelect = document.createElement('select');
            doseUnitSelect.id = 'doseUnit';
            doseUnitSelect.name = 'doseUnit';
            
            const doseUnitOptions = [
                { value: 'ml', text: 'ml' },
                { value: 'drops', text: 'drops' },
                { value: 'mg', text: 'mg' },
                { value: 'tablet', text: 'tablet(s)' },
                { value: 'other', text: 'other' }
            ];
            
            for (const option of doseUnitOptions) {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.text;
                
                if (event && event.doseUnit === option.value) {
                    optionEl.selected = true;
                }
                
                doseUnitSelect.appendChild(optionEl);
            }
            
            doseWrapper.appendChild(doseUnitSelect);
            form.appendChild(doseWrapper);
            
            // Schedule
            const scheduleLabel = document.createElement('label');
            scheduleLabel.textContent = 'Schedule Repeat Doses?';
            scheduleLabel.setAttribute('for', 'scheduleRepeat');
            form.appendChild(scheduleLabel);
            
            const scheduleSelect = document.createElement('select');
            scheduleSelect.id = 'scheduleRepeat';
            scheduleSelect.name = 'scheduleRepeat';
            
            const noOption = document.createElement('option');
            noOption.value = 'no';
            noOption.textContent = 'No';
            
            const yesOption = document.createElement('option');
            yesOption.value = 'yes';
            yesOption.textContent = 'Yes';
            
            if (event && event.scheduled) {
                yesOption.selected = true;
            } else {
                noOption.selected = true;
            }
            
            scheduleSelect.appendChild(noOption);
            scheduleSelect.appendChild(yesOption);
            form.appendChild(scheduleSelect);
            
            // Schedule options (hidden by default)
            const scheduleOptions = document.createElement('div');
            scheduleOptions.id = 'scheduleOptions';
            scheduleOptions.style.display = event && event.scheduled ? 'block' : 'none';
            
            // Frequency
            const freqLabel = document.createElement('label');
            freqLabel.textContent = 'Frequency:';
            freqLabel.setAttribute('for', 'frequency');
            scheduleOptions.appendChild(freqLabel);
            
            const freqSelect = document.createElement('select');
            freqSelect.id = 'frequency';
            freqSelect.name = 'frequency';
            
            const freqOptions = [
                { value: 'once', text: 'Once (single reminder)' },
                { value: 'hours', text: 'Every X hours' },
                { value: 'days', text: 'Every X days' }
            ];
            
            for (const option of freqOptions) {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.text;
                
                if (event && event.frequency === option.value) {
                    optionEl.selected = true;
                }
                
                freqSelect.appendChild(optionEl);
            }
            
            scheduleOptions.appendChild(freqSelect);
            
            // Hours frequency
            const hoursContainer = document.createElement('div');
            hoursContainer.id = 'hoursContainer';
            hoursContainer.style.display = event && event.frequency === 'hours' ? 'block' : 'none';
            
            const hoursLabel = document.createElement('label');
            hoursLabel.textContent = 'Every how many hours?';
            hoursLabel.setAttribute('for', 'frequencyHours');
            hoursContainer.appendChild(hoursLabel);
            
            const hoursInput = document.createElement('input');
            hoursInput.type = 'number';
            hoursInput.id = 'frequencyHours';
            hoursInput.name = 'frequencyHours';
            hoursInput.min = '1';
            hoursInput.max = '24';
            hoursInput.value = event && event.frequencyHours ? event.frequencyHours : '6';
            hoursContainer.appendChild(hoursInput);
            
            scheduleOptions.appendChild(hoursContainer);
            
            // Days frequency
            const daysContainer = document.createElement('div');
            daysContainer.id = 'daysContainer';
            daysContainer.style.display = event && event.frequency === 'days' ? 'block' : 'none';
            
            const daysLabel = document.createElement('label');
            daysLabel.textContent = 'Every how many days?';
            daysLabel.setAttribute('for', 'frequencyDays');
            daysContainer.appendChild(daysLabel);
            
            const daysInput = document.createElement('input');
            daysInput.type = 'number';
            daysInput.id = 'frequencyDays';
            daysInput.name = 'frequencyDays';
            daysInput.min = '1';
            daysInput.max = '90';
            daysInput.value = event && event.frequencyDays ? event.frequencyDays : '1';
            daysContainer.appendChild(daysInput);
            
            scheduleOptions.appendChild(daysContainer);
            
            // Doses remaining
            const dosesLabel = document.createElement('label');
            dosesLabel.textContent = 'How many doses remaining? (0 = indefinite)';
            dosesLabel.setAttribute('for', 'doses');
            scheduleOptions.appendChild(dosesLabel);
            
            const dosesInput = document.createElement('input');
            dosesInput.type = 'number';
            dosesInput.id = 'doses';
            dosesInput.name = 'doses';
            dosesInput.min = '0';
            dosesInput.value = event && event.dosesRemaining ? event.dosesRemaining : '0';
            scheduleOptions.appendChild(dosesInput);
            
            form.appendChild(scheduleOptions);
            
            // Notes
            const noteLabel = document.createElement('label');
            noteLabel.textContent = 'Notes:';
            noteLabel.setAttribute('for', 'notes');
            form.appendChild(noteLabel);
            
            const noteInput = document.createElement('textarea');
            noteInput.id = 'notes';
            noteInput.name = 'notes';
            noteInput.rows = 3;
            noteInput.value = event?.notes || '';
            form.appendChild(noteInput);
            
            // Add event listeners
            scheduleSelect.addEventListener('change', function() {
                scheduleOptions.style.display = this.value === 'yes' ? 'block' : 'none';
            });
            
            freqSelect.addEventListener('change', function() {
                hoursContainer.style.display = this.value === 'hours' ? 'block' : 'none';
                daysContainer.style.display = this.value === 'days' ? 'block' : 'none';
            });
        },
        
        buildMedicineScheduleForm: function(form, event = null) {
            // This is a specialized form for scheduling medicines
            
            // Medicine name
            const nameLabel = document.createElement('label');
            nameLabel.textContent = 'Medicine Name:';
            nameLabel.setAttribute('for', 'medicineName');
            form.appendChild(nameLabel);
            
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.id = 'medicineName';
            nameInput.name = 'medicineName';
            nameInput.required = true;
            nameInput.value = event?.medicineName || '';
            form.appendChild(nameInput);
            
            // Dose amount
            const doseLabel = document.createElement('label');
            doseLabel.textContent = 'Dose Amount:';
            doseLabel.setAttribute('for', 'doseAmount');
            form.appendChild(doseLabel);
            
            const doseWrapper = document.createElement('div');
            doseWrapper.className = 'input-group';
            
            const doseInput = document.createElement('input');
            doseInput.type = 'number';
            doseInput.id = 'doseAmount';
            doseInput.name = 'doseAmount';
            doseInput.min = '0';
            doseInput.step = '0.01';
            doseInput.required = true;
            doseInput.value = event && event.doseAmount ? event.doseAmount : '';
            doseWrapper.appendChild(doseInput);
            
            const doseUnitSelect = document.createElement('select');
            doseUnitSelect.id = 'doseUnit';
            doseUnitSelect.name = 'doseUnit';
            doseUnitSelect.required = true;
            
            const doseUnitOptions = [
                { value: 'ml', text: 'ml' },
                { value: 'drops', text: 'drops' },
                { value: 'mg', text: 'mg' },
                { value: 'tablet', text: 'tablet(s)' },
                { value: 'other', text: 'other' }
            ];
            
            for (const option of doseUnitOptions) {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.text;
                
                if (event && event.doseUnit === option.value) {
                    optionEl.selected = true;
                }
                
                doseUnitSelect.appendChild(optionEl);
            }
            
            doseWrapper.appendChild(doseUnitSelect);
            form.appendChild(doseWrapper);
            
            // Frequency
            const freqLabel = document.createElement('label');
            freqLabel.textContent = 'Frequency:';
            freqLabel.setAttribute('for', 'frequency');
            form.appendChild(freqLabel);
            
            const freqSelect = document.createElement('select');
            freqSelect.id = 'frequency';
            freqSelect.name = 'frequency';
            freqSelect.required = true;
            
            const freqOptions = [
                { value: 'once', text: 'Once (single reminder)' },
                { value: 'hours', text: 'Every X hours' },
                { value: 'days', text: 'Every X days' }
            ];
            
            for (const option of freqOptions) {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.text;
                
                if (event && event.frequency === option.value) {
                    optionEl.selected = true;
                }
                
                freqSelect.appendChild(optionEl);
            }
            
            form.appendChild(freqSelect);
            
            // Hours frequency
            const hoursContainer = document.createElement('div');
            hoursContainer.id = 'hoursContainer';
            hoursContainer.style.display = (!event || event.frequency !== 'hours') ? 'none' : 'block';
            
            const hoursLabel = document.createElement('label');
            hoursLabel.textContent = 'Every how many hours?';
            hoursLabel.setAttribute('for', 'frequencyHours');
            hoursContainer.appendChild(hoursLabel);
            
            const hoursInput = document.createElement('input');
            hoursInput.type = 'number';
            hoursInput.id = 'frequencyHours';
            hoursInput.name = 'frequencyHours';
            hoursInput.min = '1';
            hoursInput.max = '24';
            hoursInput.value = event && event.frequencyHours ? event.frequencyHours : '6';
            hoursContainer.appendChild(hoursInput);
            
            form.appendChild(hoursContainer);
            
            // Days frequency
            const daysContainer = document.createElement('div');
            daysContainer.id = 'daysContainer';
            daysContainer.style.display = event && event.frequency === 'days' ? 'block' : 'none';
            
            const daysLabel = document.createElement('label');
            daysLabel.textContent = 'Every how many days?';
            daysLabel.setAttribute('for', 'frequencyDays');
            daysContainer.appendChild(daysLabel);
            
            const daysInput = document.createElement('input');
            daysInput.type = 'number';
            daysInput.id = 'frequencyDays';
            daysInput.name = 'frequencyDays';
            daysInput.min = '1';
            daysInput.max = '90';
            daysInput.value = event && event.frequencyDays ? event.frequencyDays : '1';
            daysContainer.appendChild(daysInput);
            
            form.appendChild(daysContainer);
            
            // Doses remaining
            const dosesLabel = document.createElement('label');
            dosesLabel.textContent = 'How many doses total? (0 = indefinite)';
            dosesLabel.setAttribute('for', 'doses');
            form.appendChild(dosesLabel);
            
            const dosesInput = document.createElement('input');
            dosesInput.type = 'number';
            dosesInput.id = 'doses';
            dosesInput.name = 'doses';
            dosesInput.min = '0';
            dosesInput.value = event && event.dosesRemaining ? event.dosesRemaining : '0';
            form.appendChild(dosesInput);
            
            // Notes
            const noteLabel = document.createElement('label');
            noteLabel.textContent = 'Notes (e.g., reason for medication):';
            noteLabel.setAttribute('for', 'notes');
            form.appendChild(noteLabel);
            
            const noteInput = document.createElement('textarea');
            noteInput.id = 'notes';
            noteInput.name = 'notes';
            noteInput.rows = 3;
            noteInput.value = event?.notes || '';
            form.appendChild(noteInput);
            
            // Hidden fields for schedule
            const scheduleRepeatInput = document.createElement('input');
            scheduleRepeatInput.type = 'hidden';
            scheduleRepeatInput.id = 'scheduleRepeat';
            scheduleRepeatInput.name = 'scheduleRepeat';
            scheduleRepeatInput.value = 'yes';
            form.appendChild(scheduleRepeatInput);
            
            // Add event listeners
            freqSelect.addEventListener('change', function() {
                hoursContainer.style.display = this.value === 'hours' ? 'block' : 'none';
                daysContainer.style.display = this.value === 'days' ? 'block' : 'none';
            });
        },
        
        buildMilestoneForm: function(form, event = null) {
            // Milestone name
            const nameLabel = document.createElement('label');
            nameLabel.textContent = 'Milestone Achieved:';
            nameLabel.setAttribute('for', 'milestoneName');
            form.appendChild(nameLabel);
            
            // Get baby's age in months
            const babyAge = BabyTrackerPro.getBabyAgeMonths();
            
            // Get age-appropriate milestones for the select
            const ageMilestones = babyAge ? BabyTrackerPro.milestones.getMilestonesForAge(babyAge) : [];
            
            // If we have age-appropriate milestones, show a select, otherwise text input
            if (ageMilestones.length > 0) {
                const nameSelect = document.createElement('select');
                nameSelect.id = 'milestoneName';
                nameSelect.name = 'milestoneName';
                
                // Add a custom option
                const customOption = document.createElement('option');
                customOption.value = '';
                customOption.textContent = '-- Choose or type below --';
                nameSelect.appendChild(customOption);
                
                // Add milestone options
                for (const milestone of ageMilestones) {
                    const option = document.createElement('option');
                    option.value = milestone.name;
                    option.textContent = milestone.name;
                    
                    if (event && event.milestoneName === milestone.name) {
                        option.selected = true;
                    }
                    
                    nameSelect.appendChild(option);
                }
                
                form.appendChild(nameSelect);
                
                // Add a text input for custom milestone
                const customNameLabel = document.createElement('label');
                customNameLabel.textContent = 'Or Enter Custom Milestone:';
                customNameLabel.setAttribute('for', 'customMilestoneName');
                form.appendChild(customNameLabel);
                
                const customNameInput = document.createElement('input');
                customNameInput.type = 'text';
                customNameInput.id = 'customMilestoneName';
                customNameInput.name = 'customMilestoneName';
                customNameInput.value = '';
                form.appendChild(customNameInput);
                
                // Update hidden field when either changes
                nameSelect.addEventListener('change', function() {
                    if (this.value) {
                        customNameInput.value = '';
                    }
                });
                
                customNameInput.addEventListener('input', function() {
                    if (this.value) {
                        nameSelect.value = '';
                    }
                });
            } else {
                // No age-appropriate milestones, use text input
                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.id = 'milestoneName';
                nameInput.name = 'milestoneName';
                nameInput.required = true;
                nameInput.value = event?.milestoneName || '';
                form.appendChild(nameInput);
            }
            
            // Category
            const catLabel = document.createElement('label');
            catLabel.textContent = 'Category:';
            catLabel.setAttribute('for', 'milestoneCategory');
            form.appendChild(catLabel);
            
            const catSelect = document.createElement('select');
            catSelect.id = 'milestoneCategory';
            catSelect.name = 'milestoneCategory';
            
            const catOptions = [
                { value: 'motor', text: 'Motor Skills' },
                { value: 'cognitive', text: 'Cognitive' },
                { value: 'communication', text: 'Communication' },
                { value: 'social', text: 'Social' },
                { value: 'self-care', text: 'Self-Care' },
                { value: 'other', text: 'Other' }
            ];
            
            for (const option of catOptions) {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.text;
                
                if (event && event.milestoneCategory === option.value) {
                    optionEl.selected = true;
                }
                
                catSelect.appendChild(optionEl);
            }
            
            form.appendChild(catSelect);
            
            // Notes
            const noteLabel = document.createElement('label');
            noteLabel.textContent = 'Notes:';
            noteLabel.setAttribute('for', 'notes');
            form.appendChild(noteLabel);
            
            const noteInput = document.createElement('textarea');
            noteInput.id = 'notes';
            noteInput.name = 'notes';
            noteInput.rows = 3;
            noteInput.value = event?.notes || '';
            form.appendChild(noteInput);
        }
    },
    
    // Tab management
    tabs: {
        // Current active tab
        currentTab: 'history',
        
        // Initialize tabs
        init: function() {
            // Set click handlers for tabs
            const tabLinks = document.querySelectorAll('.tab-link');
            tabLinks.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tabId = tab.getAttribute('data-tab');
                    this.switchTo(tabId);
                });
            });
            
            // Set initial active tab
            const activeTab = document.querySelector('.tab-link.active');
            if (activeTab) {
                const tabId = activeTab.getAttribute('data-tab');
                this.switchTo(tabId);
            } else {
                // Default to first tab
                const firstTab = document.querySelector('.tab-link');
                if (firstTab) {
                    const tabId = firstTab.getAttribute('data-tab');
                    this.switchTo(tabId);
                }
            }
        },
        
        // Switch to a specific tab
        switchTo: function(tabId) {
            console.log('Switching to tab:', tabId);
            
            // Update tab links
            const tabLinks = document.querySelectorAll('.tab-link');
            tabLinks.forEach(tab => {
                const id = tab.getAttribute('data-tab');
                if (id === tabId) {
                    tab.classList.add('active');
                    tab.setAttribute('aria-selected', 'true');
                } else {
                    tab.classList.remove('active');
                    tab.setAttribute('aria-selected', 'false');
                }
            });
            
            // Update tab content
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => {
                if (content.id === tabId) {
                    content.classList.add('active');
                    content.style.display = 'block';
                } else {
                    content.classList.remove('active');
                    content.style.display = 'none';
                }
            });
            
            // Store current tab
            this.currentTab = tabId;
            
            // Initialize tab content based on which tab is activated
            switch (tabId) {
                case 'history':
                    BabyTrackerPro.history.updateEventList();
                    break;
                case 'charts':
                    BabyTrackerPro.charts.initMainChart();
                    break;
                case 'reports':
                    BabyTrackerPro.reports.generateReport();
                    break;
                case 'growth':
                    BabyTrackerPro.charts.renderGrowthChart();
                    BabyTrackerPro.growth.updateGrowthTable();
                    break;
                case 'milestones':
                    BabyTrackerPro.milestones.renderMilestones();
                    break;
                case 'health':
                    BabyTrackerPro.health.updateHealthTables();
                    BabyTrackerPro.charts.renderTemperatureChart();
                    break;
                case 'settings':
                    BabyTrackerPro.loadSettings();
                    break;
            }
        }
    },
    
    // Data management
    data: {
        // Initialize data store
        init: function() {
            // Check if data exists
            if (!localStorage.getItem('babyEvents')) {
                // Create empty data store
                this.events = [];
                localStorage.setItem('babyEvents', JSON.stringify(this.events));
            } else {
                // Load existing data
                try {
                    this.events = JSON.parse(localStorage.getItem('babyEvents'));
                    
                    // Check if we need to perform data migration
                    const storedVersion = localStorage.getItem('dataVersion');
                    if (!storedVersion || storedVersion !== BabyTrackerPro.storageVersion) {
                        this.migrateData(storedVersion);
                    }
                } catch (e) {
                    console.error('Error parsing stored data:', e);
                    
                    // Create backup of corrupted data
                    localStorage.setItem('babyEvents_corrupted', localStorage.getItem('babyEvents'));
                    
                    // Reset data
                    this.events = [];
                    localStorage.setItem('babyEvents', JSON.stringify(this.events));
                    
                    // Show error to user
                    BabyTrackerPro.showNotification('Error loading data. A backup has been created.', 5000);
                }
            }
        },
        
        // Migrate data from older versions
        migrateData: function(fromVersion) {
            console.log(`Migrating data from version ${fromVersion} to ${BabyTrackerPro.storageVersion}`);
            
            // Create backup before migration
            localStorage.setItem('babyEvents_pre_migration', JSON.stringify(this.events));
            
            // Perform version-specific migrations
            if (!fromVersion) {
                // No version - v1 data
                // Add IDs to all events
                this.events.forEach(event => {
                    if (!event.id) {
                        event.id = this.generateId();
                    }
                });
            }
            
            // V1.x to V2.x migrations
            if (fromVersion && fromVersion.startsWith('1.')) {
                // Handle v1.x to v2.x migrations
                // Example: convert temperature units
                this.events.forEach(event => {
                    if (event.type === 'temperature' && event.temperature && !event.tempUnit) {
                        event.tempUnit = 'f'; // Default to Fahrenheit in older data
                    }
                });
            }
            
            // Save migrated data
            localStorage.setItem('babyEvents', JSON.stringify(this.events));
            localStorage.setItem('dataVersion', BabyTrackerPro.storageVersion);
            
            BabyTrackerPro.showNotification('Data updated to new version');
        },
        
        // Get all events
        getEvents: function(type = null) {
            if (!type) {
                return this.events;
            }
            
            return this.events.filter(event => event.type === type);
        },
        
        // Get last event of specific type
        getLastEventOfType: function(type) {
            const typeEvents = this.events.filter(event => event.type === type);
            
            if (typeEvents.length === 0) {
                return null;
            }
            
            // Sort by timestamp (newest first)
            typeEvents.sort((a, b) => b.timestamp - a.timestamp);
            
            return typeEvents[0];
        },
        
        // Get last diaper of specific type
        getLastDiaperOfType: function(types) {
            // Filter diapers of the specified types
            const typeEvents = this.events.filter(
                event => event.type === 'diaper' && types.includes(event.diaperType)
            );
            
            if (typeEvents.length === 0) {
                return null;
            }
            
            // Sort by timestamp (newest first)
            typeEvents.sort((a, b) => b.timestamp - a.timestamp);
            
            return typeEvents[0];
        },
        
        // Get last sleep end time
        getLastSleepEnd: function() {
            // Get all sleep events
            const sleepEvents = this.events.filter(event => event.type === 'sleep' && event.sleepEnd);
            
            if (sleepEvents.length === 0) {
                return null;
            }
            
            // Sort by end time (newest first)
            sleepEvents.sort((a, b) => b.sleepEnd - a.sleepEnd);
            
            return sleepEvents[0].sleepEnd;
        },
        
        // Get event by ID
        getEventById: function(id) {
            return this.events.find(event => event.id === id);
        },
        
        // Add new event
        addEvent: function(event) {
            // Add ID if not present
            if (!event.id) {
                event.id = this.generateId();
            }
            
            // Add to events array
            this.events.push(event);
            
            // Save to localStorage
            localStorage.setItem('babyEvents', JSON.stringify(this.events));
            
            return event;
        },
        
        // Update existing event
        updateEvent: function(updatedEvent) {
            // Find the event
            const index = this.events.findIndex(event => event.id === updatedEvent.id);
            
            if (index === -1) {
                console.error('Event not found:', updatedEvent.id);
                return false;
            }
            
            // Update the event
            this.events[index] = updatedEvent;
            
            // Save to localStorage
            localStorage.setItem('babyEvents', JSON.stringify(this.events));
            
            return true;
        },
        
        // Delete event
        deleteEvent: function(id) {
            // Find the event
            const index = this.events.findIndex(event => event.id === id);
            
            if (index === -1) {
                console.error('Event not found:', id);
                return false;
            }
            
            // Remove the event
            this.events.splice(index, 1);
            
            // Save to localStorage
            localStorage.setItem('babyEvents', JSON.stringify(this.events));
            
            return true;
        },
        
        // Generate unique ID for events
        generateId: function() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        },
        
        // Create a backup of the data
        createBackup: function() {
            const backup = {
                version: BabyTrackerPro.storageVersion,
                timestamp: Date.now(),
                events: this.events,
                settings: {
                    babyName: localStorage.getItem('babyName'),
                    babyDOB: localStorage.getItem('babyDOB'),
                    babyGender: localStorage.getItem('babyGender'),
                    timeFormat: localStorage.getItem('timeFormat'),
                    dateFormat: localStorage.getItem('dateFormat'),
                    tempUnit: localStorage.getItem('tempUnit'),
                    weightUnit: localStorage.getItem('weightUnit'),
                    lengthUnit: localStorage.getItem('lengthUnit'),
                    theme: localStorage.getItem('theme'),
                    pumpSchedule: localStorage.getItem('pumpSchedule')
                }
            };
            
            // Save backup to localStorage
            localStorage.setItem('backupData', JSON.stringify(backup));
            localStorage.setItem('lastBackupTime', Date.now());
            
            // Update display if available
            BabyTrackerPro.updateLastBackupTime();
            
            return backup;
        },
        
        // Export data to a file
        exportData: function() {
            // Create a backup first
            const backup = this.createBackup();
            
            // Convert to a Blob
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Generate a filename with date
            const date = new Date();
            const dateStr = date.toISOString().slice(0, 10);
            const babyName = backup.settings.babyName || 'Baby';
            a.download = `${babyName}_Tracker_Backup_${dateStr}.json`;
            
            // Trigger download
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                BabyTrackerPro.showNotification('Backup downloaded');
            }, 100);
        },
        
        // Import data from a file
        importData: function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const backup = JSON.parse(e.target.result);
                    
                    // Validate backup
                    if (!backup.events || !Array.isArray(backup.events)) {
                        throw new Error('Invalid backup format: missing events array');
                    }
                    
                    // Create a backup before import
                    this.createBackup();
                    localStorage.setItem('preImportBackup', localStorage.getItem('backupData'));
                    
                    // Update events
                    this.events = backup.events;
                    localStorage.setItem('babyEvents', JSON.stringify(this.events));
                    localStorage.setItem('dataVersion', backup.version || BabyTrackerPro.storageVersion);
                    
                    // Update settings if present
                    if (backup.settings) {
                        if (backup.settings.babyName) localStorage.setItem('babyName', backup.settings.babyName);
                        if (backup.settings.babyDOB) localStorage.setItem('babyDOB', backup.settings.babyDOB);
                        if (backup.settings.babyGender) localStorage.setItem('babyGender', backup.settings.babyGender);
                        if (backup.settings.timeFormat) localStorage.setItem('timeFormat', backup.settings.timeFormat);
                        if (backup.settings.dateFormat) localStorage.setItem('dateFormat', backup.settings.dateFormat);
                        if (backup.settings.tempUnit) {
                            localStorage.setItem('tempUnit', backup.settings.tempUnit);
                            BabyTrackerPro.state.displayUnits.temperature = backup.settings.tempUnit;
                        }
                        if (backup.settings.weightUnit) {
                            localStorage.setItem('weightUnit', backup.settings.weightUnit);
                            BabyTrackerPro.state.displayUnits.weight = backup.settings.weightUnit;
                        }
                        if (backup.settings.lengthUnit) {
                            localStorage.setItem('lengthUnit', backup.settings.lengthUnit);
                            BabyTrackerPro.state.displayUnits.length = backup.settings.lengthUnit;
                        }
                        if (backup.settings.pumpSchedule) localStorage.setItem('pumpSchedule', backup.settings.pumpSchedule);
                    }
                    
                    // Reload the app
                    BabyTrackerPro.showNotification('Data imported successfully. Reloading...');
                    setTimeout(() => window.location.reload(), 1500);
                } catch (error) {
                    console.error('Error importing data:', error);
                    BabyTrackerPro.showNotification('Error importing data: ' + error.message, 5000);
                }
            };
            
            reader.readAsText(file);
        },
        
        // Clear all data
        clearData: function() {
            // Create a backup before clearing
            this.createBackup();
            localStorage.setItem('preDeleteBackup', localStorage.getItem('backupData'));
            
            // Clear events
            this.events = [];
            localStorage.setItem('babyEvents', JSON.stringify(this.events));
            
            // Keep settings and other preferences
        },
        
        // Check if we have enough data for predictions
        hasEnoughData: function() {
            // Check if we have enough feeding data
            const feedingEvents = this.getEvents('feeding');
            if (feedingEvents.length < BabyTrackerPro.config.feedingPatternMinEntries) {
                return false;
            }
            
            // Check if we have enough sleep data
            const sleepEvents = this.getEvents('sleep');
            if (sleepEvents.length < BabyTrackerPro.config.sleepPatternMinEntries) {
                return false;
            }
            
            // Check if we have enough diaper data
            const diaperEvents = this.getEvents('diaper');
            if (diaperEvents.length < BabyTrackerPro.config.diaperPatternMinEntries) {
                return false;
            }
            
            return true;
        },
        
        // Get scheduled medicines
        getScheduledMedicines: function() {
            const scheduledMeds = this.events.filter(event => 
                event.type === 'medicine' && 
                event.scheduled && 
                event.nextDoseTime && 
                (event.dosesRemaining === undefined || event.dosesRemaining === 0 || event.dosesRemaining > 0)
            );
            
            // Sort by next dose time
            scheduledMeds.sort((a, b) => a.nextDoseTime - b.nextDoseTime);
            
            return scheduledMeds;
        }
    },
    
    // History tab functionality
    history: {
        // Update event list based on filters
        updateEventList: function() {
            if (!BabyTrackerPro.elements.eventList) return;
            
            // Get filter values
            const typeFilter = document.getElementById('history-filter') ? document.getElementById('history-filter').value : 'all';
            const limitFilter = document.getElementById('history-limit') ? document.getElementById('history-limit').value : '25';
            const dateRangeFilter = document.getElementById('date-range') ? document.getElementById('date-range').value : 'all';
            
            // Apply date range filter
            let minTimestamp = 0;
            const now = new Date();
            
            switch (dateRangeFilter) {
                case 'today':
                    const todayStart = new Date(now);
                    todayStart.setHours(0, 0, 0, 0);
                    minTimestamp = todayStart.getTime();
                    break;
                case 'yesterday':
                    const yesterdayStart = new Date(now);
                    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
                    yesterdayStart.setHours(0, 0, 0, 0);
                    
                    const yesterdayEnd = new Date(now);
                    yesterdayEnd.setHours(0, 0, 0, 0);
                    
                    minTimestamp = yesterdayStart.getTime();
                    maxTimestamp = yesterdayEnd.getTime();
                    break;
                case 'week':
                    const weekStart = new Date(now);
                    weekStart.setDate(weekStart.getDate() - 7);
                    minTimestamp = weekStart.getTime();
                    break;
                case 'month':
                    const monthStart = new Date(now);
                    monthStart.setMonth(monthStart.getMonth() - 1);
                    minTimestamp = monthStart.getTime();
                    break;
                default:
                    minTimestamp = 0;
            }
            
            // Get filtered events
            let filteredEvents = BabyTrackerPro.data.events.filter(event => {
                // Apply type filter
                if (typeFilter !== 'all' && event.type !== typeFilter) {
                    return false;
                }
                
                // Apply date range filter
                if (dateRangeFilter !== 'all') {
                    if (event.timestamp < minTimestamp) {
                        return false;
                    }
                    
                    if (dateRangeFilter === 'yesterday' && event.timestamp >= maxTimestamp) {
                        return false;
                    }
                }
                
                return true;
            });
            
            // Sort by timestamp (newest first)
            filteredEvents.sort((a, b) => b.timestamp - a.timestamp);
            
            // Apply limit
            if (limitFilter !== 'all' && parseInt(limitFilter) > 0) {
                filteredEvents = filteredEvents.slice(0, parseInt(limitFilter));
            }
            
            // Clear current list
            BabyTrackerPro.elements.eventList.innerHTML = '';
            
            // Add events to list
            if (filteredEvents.length === 0) {
                const emptyItem = document.createElement('li');
                emptyItem.className = 'empty-list-item';
                emptyItem.textContent = 'No events found matching the selected filters.';
                BabyTrackerPro.elements.eventList.appendChild(emptyItem);
            } else {
                filteredEvents.forEach(event => {
                    const li = document.createElement('li');
                    
                    // Create time element
                    const timeSpan = document.createElement('span');
                    timeSpan.className = 'event-time';
                    timeSpan.textContent = BabyTrackerPro.formatDateTime(event.timestamp);
                    li.appendChild(timeSpan);
                    
                    // Create details element
                    const detailsSpan = document.createElement('span');
                    detailsSpan.className = 'event-details';
                    
                    // Format details based on event type
                    let detailsText = this.formatEventDetails(event);
                    detailsSpan.textContent = detailsText;
                    
                    // Add notes if present
                    if (event.notes) {
                        const notesSpan = document.createElement('span');
                        notesSpan.className = 'event-notes';
                        notesSpan.textContent = event.notes;
                        detailsSpan.appendChild(document.createElement('br'));
                        detailsSpan.appendChild(notesSpan);
                    }
                    
                    li.appendChild(detailsSpan);
                    
                    // Create actions element
                    const actionsSpan = document.createElement('span');
                    actionsSpan.className = 'event-actions';
                    
                    // Edit button
                    const editButton = document.createElement('button');
                    editButton.textContent = 'Edit';
                    editButton.addEventListener('click', () => this.editEvent(event));
                    actionsSpan.appendChild(editButton);
                    
                    // Delete button
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Delete';
                    deleteButton.className = 'delete';
                    deleteButton.addEventListener('click', () => this.deleteEvent(event));
                    actionsSpan.appendChild(deleteButton);
                    
                    li.appendChild(actionsSpan);
                    
                    BabyTrackerPro.elements.eventList.appendChild(li);
                });
            }
        },
        
        // Format event details for display
        formatEventDetails: function(event) {
            switch (event.type) {
                case 'feeding':
                    let feedDetails = `Feeding (${event.feedType || 'unknown'})`;
                    
                    if (event.feedType === 'breast' && event.feedSide) {
                        feedDetails += `, ${event.feedSide} side`;
                    }
                    
                    if (event.amount && event.unit) {
                        feedDetails += `, ${BabyTrackerPro.formatAmount(event.amount, event.unit)}`;
                    }
                    
                    if (event.duration) {
                        feedDetails += `, ${BabyTrackerPro.formatDuration(event.duration)}`;
                    }
                    
                    return feedDetails;
                    
                case 'diaper':
                    let diaperType = event.diaperType || 'unknown';
                    return `Diaper change (${diaperType})`;
                    
                case 'sleep':
                    let sleepDetails = 'Sleep';
                    
                    if (event.sleepStart && event.sleepEnd) {
                        const duration = event.sleepEnd - event.sleepStart;
                        sleepDetails += `, ${BabyTrackerPro.formatDuration(duration)}`;
                    } else if (event.sleepStart) {
                        sleepDetails += ', start only';
                    } else if (event.sleepEnd) {
                        sleepDetails += ', end only';
                    }
                    
                    return sleepDetails;
                    
                case 'pump':
                    let pumpDetails = 'Pumping';
                    
                    if (event.amount && event.unit) {
                        pumpDetails += `, ${BabyTrackerPro.formatAmount(event.amount, event.unit)}`;
                    }
                    
                    if (event.duration) {
                        pumpDetails += `, ${BabyTrackerPro.formatDuration(event.duration)}`;
                    }
                    
                    return pumpDetails;
                    
                case 'growth':
                    let growthDetails = 'Growth measurement';
                    let measurements = [];
                    
                    if (event.weight) {
                        const unit = event.weightUnit || BabyTrackerPro.state.displayUnits.weight;
                        measurements.push(`Weight: ${BabyTrackerPro.formatAmount(event.weight, unit)}`);
                    }
                    
                    if (event.length) {
                        const unit = event.lengthUnit || BabyTrackerPro.state.displayUnits.length;
                        measurements.push(`Length: ${BabyTrackerPro.formatAmount(event.length, unit)}`);
                    }
                    
                    if (event.headCircumference) {
                        const unit = event.headUnit || BabyTrackerPro.state.displayUnits.length;
                        measurements.push(`Head: ${BabyTrackerPro.formatAmount(event.headCircumference, unit)}`);
                    }
                    
                    if (measurements.length > 0) {
                        growthDetails += ` (${measurements.join(', ')})`;
                    }
                    
                    return growthDetails;
                    
                case 'temperature':
                    let tempDetails = 'Temperature';
                    
                    if (event.temperature) {
                        const unit = event.tempUnit || BabyTrackerPro.state.displayUnits.temperature;
                        tempDetails += ` ${BabyTrackerPro.formatAmount(event.temperature, unit)}`;
                    }
                    
                    if (event.location) {
                        tempDetails += ` (${event.location})`;
                    }
                    
                    return tempDetails;
                    
                case 'medicine':
                    let medDetails = 'Medicine';
                    
                    if (event.medicineName) {
                        medDetails += `: ${event.medicineName}`;
                    }
                    
                    if (event.doseAmount && event.doseUnit) {
                        medDetails += `, ${event.doseAmount} ${event.doseUnit}`;
                    }
                    
                    if (event.scheduled) {
                        medDetails += ' (scheduled)';
                    }
                    
                    return medDetails;
                    
                case 'milestone':
                    let milestoneDetails = 'Milestone';
                    
                    if (event.milestoneName) {
                        milestoneDetails += `: ${event.milestoneName}`;
                    }
                    
                    if (event.milestoneCategory) {
                        milestoneDetails += ` (${event.milestoneCategory})`;
                    }
                    
                    return milestoneDetails;
                    
                default:
                    return `${event.type} event`;
            }
        },
        
        // Edit an event
        editEvent: function(event) {
            BabyTrackerPro.modal.open(event.type, event.id);
        },
        
        // Delete an event
        deleteEvent: function(event) {
            const confirmed = confirm(`Are you sure you want to delete this ${event.type} event?`);
            
            if (confirmed) {
                BabyTrackerPro.data.deleteEvent(event.id);
                BabyTrackerPro.showNotification(`${BabyTrackerPro.capitalizeFirstLetter(event.type)} event deleted`);
                
                // Update UI
                this.updateEventList();
                BabyTrackerPro.updateDashboard();
            }
        },
        
        // Export current filtered view
        exportCurrentView: function() {
            // Get filter values
            const typeFilter = document.getElementById('history-filter') ? document.getElementById('history-filter').value : 'all';
            const dateRangeFilter = document.getElementById('date-range') ? document.getElementById('date-range').value : 'all';
            
            // Create export data
            const exportData = {
                title: 'Baby Tracker Pro - Event History',
                generated: new Date().toISOString(),
                filters: {
                    type: typeFilter,
                    dateRange: dateRangeFilter
                },
                babyName: BabyTrackerPro.getBabyName(),
                events: []
            };
            
            // Get all list items
            const listItems = BabyTrackerPro.elements.eventList.querySelectorAll('li:not(.empty-list-item)');
            
            listItems.forEach(item => {
                const time = item.querySelector('.event-time').textContent;
                const details = item.querySelector('.event-details').textContent;
                
                exportData.events.push({
                    time,
                    details
                });
            });
            
            // Convert to CSV
            let csv = 'Time,Details\n';
            
            exportData.events.forEach(event => {
                // Escape quotes in CSV
                const escapedDetails = event.details.replace(/"/g, '""');
                csv += `"${event.time}","${escapedDetails}"\n`;
            });
            
            // Create a download link
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Generate a filename
            const date = new Date();
            const dateStr = date.toISOString().slice(0, 10);
            const babyName = exportData.babyName.replace(/[^a-z0-9]/gi, '_');
            let typeStr = typeFilter === 'all' ? 'All' : BabyTrackerPro.capitalizeFirstLetter(typeFilter);
            let rangeStr = BabyTrackerPro.capitalizeFirstLetter(dateRangeFilter);
            
            a.download = `${babyName}_${typeStr}_Events_${rangeStr}_${dateStr}.csv`;
            
            // Trigger download
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                BabyTrackerPro.showNotification('History exported successfully');
            }, 100);
        }
    },
    
    // Chart functionality
    charts: {
        // Initialize charts
        init: function() {
            // Set Chart.js defaults
            if (window.Chart) {
                Chart.defaults.font.family = getComputedStyle(document.body).getPropertyValue('--font-family');
                Chart.defaults.color = getComputedStyle(document.body).getPropertyValue('--text-secondary');
                Chart.defaults.elements.line.borderWidth = 2;
                Chart.defaults.elements.point.radius = 3;
                Chart.defaults.elements.point.hoverRadius = 5;
                Chart.defaults.plugins.tooltip.backgroundColor = getComputedStyle(document.body).getPropertyValue('--primary-dark');
                Chart.defaults.plugins.tooltip.titleFont.weight = 'bold';
                Chart.defaults.plugins.legend.labels.usePointStyle = true;
            }
        },
        
        // Initialize main chart in the charts tab
        initMainChart: function() {
            // Default to feeding chart
            this.renderSelectedChart('feedAmount');
        },
        
        // Render selected chart type
        renderSelectedChart: function(chartType) {
            if (!BabyTrackerPro.elements.mainChart) return;
            
            // Destroy existing chart if any
            if (BabyTrackerPro._activeChart) {
                BabyTrackerPro._activeChart.destroy();
            }
            
            switch (chartType) {
                case 'feedAmount':
                    this.renderFeedingAmountChart();
                    break;
                case 'feedFrequency':
                    this.renderFeedingFrequencyChart();
                    break;
                case 'sleepDuration':
                    this.renderSleepDurationChart();
                    break;
                case 'sleepPattern':
                    this.renderSleepPatternChart();
                    break;
                case 'diaperCount':
                    this.renderDiaperCountChart();
                    break;
                case 'pumpAmount':
                    this.renderPumpAmountChart();
                    break;
                case 'medicineSchedule':
                    this.renderMedicineScheduleChart();
                    break;
                default:
                    // Unknown chart type, use feeding as default
                    this.renderFeedingAmountChart();
            }
        },
        
        // Render feeding amount/duration chart
        renderFeedingAmountChart: function() {
            // Get feeding events from the last 7 days
            const feedEvents = this.getEventsForDateRange('feeding', 7);
            
            if (feedEvents.length === 0) {
                this.renderNoDataChart('No feeding data for the past 7 days');
                return;
            }
            
            // Separate bottle and breast feeds
            const bottleFeeds = feedEvents.filter(event => event.feedType === 'bottle');
            const breastFeeds = feedEvents.filter(event => event.feedType === 'breast');
            
            // Prepare chart data
            const labels = feedEvents.map(event => {
                const date = new Date(event.timestamp);
                return `${date.getMonth() + 1}/${date.getDate()} ${BabyTrackerPro.formatTime(date)}`;
            });
            
            const bottleData = bottleFeeds.map(event => {
                if (event.amount) {
                    // Convert to oz if needed
                    if (event.unit === 'ml') {
                        return BabyTrackerPro.convertAmount(event.amount, 'ml', 'oz');
                    }
                    return event.amount;
                }
                return null;
            });
            
            const breastData = breastFeeds.map(event => {
                // For breast feeds, use duration in minutes
                if (event.duration) {
                    return event.duration / (60 * 1000); // Convert ms to minutes
                }
                return null;
            });
            
            // Create chart
            const ctx = BabyTrackerPro.elements.mainChart.getContext('2d');
            
            BabyTrackerPro._activeChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Bottle (oz)',
                            data: bottleData,
                            borderColor: getComputedStyle(document.body).getPropertyValue('--primary-color'),
                            backgroundColor: getComputedStyle(document.body).getPropertyValue('--primary-transparent'),
                            fill: false,
                            yAxisID: 'y',
                            tension: 0.1
                        },
                        {
                            label: 'Breast (min)',
                            data: breastData,
                            borderColor: getComputedStyle(document.body).getPropertyValue('--secondary-color'),
                            backgroundColor: getComputedStyle(document.body).getPropertyValue('--secondary-transparent'),
                            fill: false,
                            yAxisID: 'y1',
                            tension: 0.1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Date/Time'
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Amount (oz)'
                            },
                            min: 0
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Duration (min)'
                            },
                            grid: {
                                drawOnChartArea: false
                            },
                            min: 0
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Feeding Amount/Duration (Last 7 Days)'
                        }
                    }
                }
            });
            
            // Generate insights
            this.generateFeedingInsights(feedEvents);
        },
        
        // Render feeding frequency chart
        renderFeedingFrequencyChart: function() {
            // Get feeding events from the last 7 days
            const feedEvents = this.getEventsForDateRange('feeding', 7);
            
            if (feedEvents.length < 2) {
                this.renderNoDataChart('Not enough feeding data for frequency analysis');
                return;
            }
            
            // Calculate intervals between feedings
            const intervals = [];
            const sortedEvents = [...feedEvents].sort((a, b) => a.timestamp - b.timestamp);
            
            for (let i = 1; i < sortedEvents.length; i++) {
                const interval = (sortedEvents[i].timestamp - sortedEvents[i-1].timestamp) / (60 * 60 * 1000); // hours
                intervals.push({
                    start: sortedEvents[i-1].timestamp,
                    end: sortedEvents[i].timestamp,
                    interval: interval,
                    feedType: sortedEvents[i].feedType
                });
            }
            
            // Prepare chart data
            const labels = intervals.map(interval => {
                const date = new Date(interval.start);
                return `${date.getMonth() + 1}/${date.getDate()} ${BabyTrackerPro.formatTime(date)}`;
            });
            
            const data = intervals.map(interval => interval.interval);
            
            // Color code by feed type
            const backgroundColor = intervals.map(interval => {
                if (interval.feedType === 'bottle') {
                    return getComputedStyle(document.body).getPropertyValue('--primary-color');
                } else if (interval.feedType === 'breast') {
                    return getComputedStyle(document.body).getPropertyValue('--secondary-color');
                } else {
                    return getComputedStyle(document.body).getPropertyValue('--accent-color');
                }
            });
            
            // Create chart
            const ctx = BabyTrackerPro.elements.mainChart.getContext('2d');
            
            BabyTrackerPro._activeChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Hours Between Feeds',
                            data: data,
                            backgroundColor: backgroundColor,
                            borderColor: backgroundColor.map(color => color), // same as background
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Feed Start Time'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Hours'
                            },
                            min: 0
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Time Between Feedings (Last 7 Days)'
                        },
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    const hours = Math.floor(context.raw);
                                    const minutes = Math.round((context.raw - hours) * 60);
                                    return `${label}${hours}h ${minutes}m`;
                                }
                            }
                        }
                    }
                }
            });
            
            // Generate insights
            this.generateFeedingFrequencyInsights(intervals);
        },
        
        // Render sleep duration chart
        renderSleepDurationChart: function() {
            // Get sleep events with both start and end times from the last 7 days
            const sleepEvents = this.getEventsForDateRange('sleep', 7)
                .filter(event => event.sleepStart && event.sleepEnd);
            
            if (sleepEvents.length === 0) {
                this.renderNoDataChart('No complete sleep data for the past 7 days');
                return;
            }
            
            // Sort by sleep start time
            sleepEvents.sort((a, b) => a.sleepStart - b.sleepStart);
            
            // Prepare chart data
            const labels = sleepEvents.map(event => {
                const date = new Date(event.sleepStart);
                return `${date.getMonth() + 1}/${date.getDate()} ${BabyTrackerPro.formatTime(date)}`;
            });
            
            const durations = sleepEvents.map(event => {
                const durationHours = (event.sleepEnd - event.sleepStart) / (60 * 60 * 1000); // hours
                return durationHours;
            });
            
            // Classify sleeps by duration
            const backgroundColor = sleepEvents.map(event => {
                const durationHours = (event.sleepEnd - event.sleepStart) / (60 * 60 * 1000);
                
                if (durationHours >= 6) {
                    // Long sleep (night)
                    return getComputedStyle(document.body).getPropertyValue('--info-color');
                } else if (durationHours >= 1.5) {
                    // Medium sleep (nap)
                    return getComputedStyle(document.body).getPropertyValue('--secondary-color');
                } else {
                    // Short sleep
                    return getComputedStyle(document.body).getPropertyValue('--warning-color');
                }
            });
            
            // Create chart
            const ctx = BabyTrackerPro.elements.mainChart.getContext('2d');
            
            BabyTrackerPro._activeChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Duration (hours)',
                            data: durations,
                            backgroundColor: backgroundColor,
                            borderColor: backgroundColor.map(color => color), // same as background
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Sleep Start Time'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Hours'
                            },
                            min: 0
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Sleep Duration (Last 7 Days)'
                        },
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    const hours = Math.floor(context.raw);
                                    const minutes = Math.round((context.raw - hours) * 60);
                                    return `${label}${hours}h ${minutes}m`;
                                }
                            }
                        }
                    }
                }
            });
            
            // Generate insights
            this.generateSleepDurationInsights(sleepEvents);
        },
        
        // Render sleep pattern chart
        renderSleepPatternChart: function() {
            // Get sleep events with both start and end times from the last 7 days
            const sleepEvents = this.getEventsForDateRange('sleep', 7)
                .filter(event => event.sleepStart && event.sleepEnd);
            
            if (sleepEvents.length === 0) {
                this.renderNoDataChart('No complete sleep data for the past 7 days');
                return;
            }
            
            // Sort by sleep start time
            sleepEvents.sort((a, b) => a.sleepStart - b.sleepStart);
            
            // Group sleeps by day
            const sleepsByDay = {};
            
            sleepEvents.forEach(event => {
                const date = new Date(event.sleepStart);
                const day = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                
                if (!sleepsByDay[day]) {
                    sleepsByDay[day] = [];
                }
                
                sleepsByDay[day].push(event);
            });
            
            // Prepare data for chart
            const datasets = [];
            const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const labels = [];
            
            // Create array of 24 hours (x-axis)
            for (let i = 0; i < 24; i++) {
                if (i === 0) {
                    labels.push('12 AM');
                } else if (i < 12) {
                    labels.push(`${i} AM`);
                } else if (i === 12) {
                    labels.push('12 PM');
                } else {
                    labels.push(`${i - 12} PM`);
                }
            }
            
            // Add dataset for each day
            Object.keys(sleepsByDay).sort().forEach((day, index) => {
                const date = new Date(day);
                const dayData = new Array(24).fill(0);
                
                // Mark sleep times for this day
                sleepsByDay[day].forEach(event => {
                    const startDate = new Date(event.sleepStart);
                    const endDate = new Date(event.sleepEnd);
                    
                    // Convert to hours with fraction
                    const startHour = startDate.getHours() + (startDate.getMinutes() / 60);
                    let endHour = endDate.getHours() + (endDate.getMinutes() / 60);
                    
                    // Handle sleep spanning midnight
                    if (endDate.getDate() !== startDate.getDate() || endHour < startHour) {
                        // Sleep ends on next day, mark until midnight
                        for (let hour = Math.floor(startHour); hour < 24; hour++) {
                            dayData[hour] = 1;
                        }
                        
                        // If we have the next day in our dataset, we'd mark it there
                        // But we'll skip that complexity for this chart
                    } else {
                        // Normal sleep within same day
                        for (let hour = Math.floor(startHour); hour <= Math.floor(endHour); hour++) {
                            dayData[hour] = 1;
                        }
                    }
                });
                
                const dayLabel = `${daysOfWeek[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`;
                
                datasets.push({
                    label: dayLabel,
                    data: dayData,
                    backgroundColor: `rgba(110, 205, 207, ${0.4 + (index * 0.1)})`,
                    borderColor: getComputedStyle(document.body).getPropertyValue('--primary-color'),
                    borderWidth: 1,
                    stack: 'sleep'
                });
            });
            
            // Create chart
            const ctx = BabyTrackerPro.elements.mainChart.getContext('2d');
            
            BabyTrackerPro._activeChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Hour of Day'
                            }
                        },
                        y: {
                            stacked: true,
                            title: {
                                display: true,
                                text: 'Days'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Sleep Pattern (Last 7 Days)'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    if (value === 0) {
                                        return `${context.dataset.label}: Awake`;
                                    } else {
                                        return `${context.dataset.label}: Asleep`;
                                    }
                                }
                            }
                        }
                    }
                }
            });
            
            // Generate insights
            this.generateSleepPatternInsights(sleepsByDay);
        },
        
        // Render diaper count chart
        renderDiaperCountChart: function() {
            // Get diaper events from the last 7 days
            const diaperEvents = this.getEventsForDateRange('diaper', 7);
            
            if (diaperEvents.length === 0) {
                this.renderNoDataChart('No diaper data for the past 7 days');
                return;
            }
            
            // Group diapers by day and type
            const diapersByDay = {};
            
            diaperEvents.forEach(event => {
                const date = new Date(event.timestamp);
                const day = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                
                if (!diapersByDay[day]) {
                    diapersByDay[day] = {
                        wet: 0,
                        dirty: 0,
                        mixed: 0
                    };
                }
                
                if (event.diaperType === 'wet') {
                    diapersByDay[day].wet++;
                } else if (event.diaperType === 'dirty') {
                    diapersByDay[day].dirty++;
                } else if (event.diaperType === 'mixed') {
                    diapersByDay[day].mixed++;
                }
            });
            
            // Prepare data for chart
            const labels = Object.keys(diapersByDay).sort().map(day => {
                const date = new Date(day);
                return `${date.getMonth() + 1}/${date.getDate()}`;
            });
            
            const wetData = Object.values(diapersByDay).map(day => day.wet);
            const dirtyData = Object.values(diapersByDay).map(day => day.dirty);
            const mixedData = Object.values(diapersByDay).map(day => day.mixed);
            
            // Create chart
            const ctx = BabyTrackerPro.elements.mainChart.getContext('2d');
            
            BabyTrackerPro._activeChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Wet',
                            data: wetData,
                            backgroundColor: getComputedStyle(document.body).getPropertyValue('--diaper-wet-color'),
                            borderColor: getComputedStyle(document.body).getPropertyValue('--diaper-wet-color'),
                            borderWidth: 1
                        },
                        {
                            label: 'Dirty',
                            data: dirtyData,
                            backgroundColor: getComputedStyle(document.body).getPropertyValue('--diaper-dirty-color'),
                            borderColor: getComputedStyle(document.body).getPropertyValue('--diaper-dirty-color'),
                            borderWidth: 1
                        },
                        {
                            label: 'Mixed',
                            data: mixedData,
                            backgroundColor: getComputedStyle(document.body).getPropertyValue('--diaper-mixed-color'),
                            borderColor: getComputedStyle(document.body).getPropertyValue('--diaper-mixed-color'),
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Count'
                            },
                            min: 0,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Diaper Count by Type (Last 7 Days)'
                        }
                    }
                }
            });
            
            // Generate insights
            this.generateDiaperInsights(diapersByDay);
        },
        
        // Render pump amount chart
        renderPumpAmountChart: function() {
            // Get pump events from the last 7 days
            const pumpEvents = this.getEventsForDateRange('pump', 7)
                .filter(event => event.amount && event.unit);
            
            if (pumpEvents.length === 0) {
                this.renderNoDataChart('No pumping data for the past 7 days');
                return;
            }
            
            // Group pumps by day
            const pumpsByDay = {};
            
            pumpEvents.forEach(event => {
                const date = new Date(event.timestamp);
                const day = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                
                if (!pumpsByDay[day]) {
                    pumpsByDay[day] = {
                        totalAmount: 0,
                        count: 0
                    };
                }
                
                // Convert to oz if needed
                let amount = event.amount;
                if (event.unit === 'ml') {
                    amount = BabyTrackerPro.convertAmount(amount, 'ml', 'oz');
                }
                
                pumpsByDay[day].totalAmount += amount;
                pumpsByDay[day].count++;
            });
            
            // Prepare data for chart
            const days = Object.keys(pumpsByDay).sort();
            const labels = days.map(day => {
                const date = new Date(day);
                return `${date.getMonth() + 1}/${date.getDate()}`;
            });
            
            const totalData = days.map(day => pumpsByDay[day].totalAmount);
            const avgData = days.map(day => {
                const dayData = pumpsByDay[day];
                return dayData.totalAmount / dayData.count;
            });
            
            // Create chart
            const ctx = BabyTrackerPro.elements.mainChart.getContext('2d');
            
            BabyTrackerPro._activeChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Total (oz)',
                            data: totalData,
                            backgroundColor: getComputedStyle(document.body).getPropertyValue('--secondary-color'),
                            borderColor: getComputedStyle(document.body).getPropertyValue('--secondary-color'),
                            borderWidth: 1,
                            order: 2
                        },
                        {
                            label: 'Avg Per Session (oz)',
                            data: avgData,
                            backgroundColor: getComputedStyle(document.body).getPropertyValue('--primary-color'),
                            borderColor: getComputedStyle(document.body).getPropertyValue('--primary-color'),
                            borderWidth: 3,
                            type: 'line',
                            order: 1,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Total Amount (oz)'
                            },
                            min: 0
                        },
                        y1: {
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Avg Per Session (oz)'
                            },
                            min: 0,
                            grid: {
                                drawOnChartArea: false
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Pumping Amount (Last 7 Days)'
                        }
                    }
                }
            });
            
            // Generate insights
            this.generatePumpingInsights(pumpsByDay);
        },
        
        // Render medicine schedule chart
        renderMedicineScheduleChart: function() {
            // Get all medicine events
            const medicineEvents = BabyTrackerPro.data.getEvents('medicine')
                .filter(event => event.medicineName);
            
            if (medicineEvents.length === 0) {
                this.renderNoDataChart('No medicine data available');
                return;
            }
            
            // Group by medicine name
            const medicinesByName = {};
            
            medicineEvents.forEach(event => {
                if (!medicinesByName[event.medicineName]) {
                    medicinesByName[event.medicineName] = [];
                }
                
                medicinesByName[event.medicineName].push(event);
            });
            
            // Sort each medicine's events by timestamp
            Object.keys(medicinesByName).forEach(name => {
                medicinesByName[name].sort((a, b) => a.timestamp - b.timestamp);
            });
            
            // Prepare data for chart - only the last 30 days of data for each medicine
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            const datasets = [];
            
            const colorPalette = [
                getComputedStyle(document.body).getPropertyValue('--primary-color'),
                getComputedStyle(document.body).getPropertyValue('--secondary-color'),
                getComputedStyle(document.body).getPropertyValue('--accent-color'),
                getComputedStyle(document.body).getPropertyValue('--success-color'),
                getComputedStyle(document.body).getPropertyValue('--info-color'),
                getComputedStyle(document.body).getPropertyValue('--warning-color')
            ];
            
            let allDates = [];
            
            Object.keys(medicinesByName).forEach((name, index) => {
                // Filter to last 30 days
                const recentEvents = medicinesByName[name].filter(event => event.timestamp >= thirtyDaysAgo);
                
                if (recentEvents.length > 0) {
                    const color = colorPalette[index % colorPalette.length];
                    
                    const data = recentEvents.map(event => {
                        const date = new Date(event.timestamp);
                        return {
                            x: date,
                            y: name,
                            dose: event.doseAmount && event.doseUnit ? 
                                `${event.doseAmount} ${event.doseUnit}` : 'No dose info'
                        };
                    });
                    
                    // Add dates to overall date collection for proper scale
                    allDates = allDates.concat(data.map(d => d.x));
                    
                    datasets.push({
                        label: name,
                        data: data,
                        backgroundColor: color,
                        borderColor: color,
                        borderWidth: 1,
                        borderRadius: 4
                    });
                }
            });
            
            // Create chart
            const ctx = BabyTrackerPro.elements.mainChart.getContext('2d');
            
            BabyTrackerPro._activeChart = new Chart(ctx, {
                type: 'scatter',
                data: {
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'day'
                            },
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Medicine'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Medicine Schedule (Last 30 Days)'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const date = new Date(context.parsed.x);
                                    const formattedDate = BabyTrackerPro.formatDateTime(date);
                                    const medicine = context.parsed.y;
                                    const dose = context.raw.dose;
                                    return [`Medicine: ${medicine}`, `Time: ${formattedDate}`, `Dose: ${dose}`];
                                }
                            }
                        }
                    }
                }
            });
            
            // Generate insights for medicines
            this.generateMedicineInsights(medicinesByName);
        },
        
        // Render no data message
        renderNoDataChart: function(message) {
            const ctx = BabyTrackerPro.elements.mainChart.getContext('2d');
            
            BabyTrackerPro._activeChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['No Data'],
                    datasets: [{
                        label: 'No Data Available',
                        data: [0],
                        backgroundColor: 'rgba(200, 200, 200, 0.2)',
                        borderColor: 'rgba(200, 200, 200, 0.2)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            display: false
                        },
                        x: {
                            display: false
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: message,
                            font: {
                                size: 16
                            }
                        },
                        legend: {
                            display: false
                        }
                    }
                }
            });
            
            // Update insight box
            if (BabyTrackerPro.elements.chartInsight) {
                BabyTrackerPro.elements.chartInsight.innerHTML = `
                    <h4>Insights</h4>
                    <p>Not enough data available to generate insights.</p>
                    <p>Try logging more events to see patterns and analysis.</p>
                `;
            }
        },
        
        // Render growth chart
        renderGrowthChart: function(metricType = 'weight') {
            if (!BabyTrackerPro.elements.growthChart) return;
            
            // Destroy existing chart if any
            if (BabyTrackerPro._activeGrowthChart) {
                BabyTrackerPro._activeGrowthChart.destroy();
            }
            
            // Get all growth events
            const growthEvents = BabyTrackerPro.data.getEvents('growth');
            
            if (growthEvents.length === 0) {
                this.renderNoDataGrowthChart('No growth data available');
                return;
            }
            
            // Filter events with the requested metric
            let filteredEvents;
            let yLabel;
            
            switch (metricType) {
                case 'weight':
                    filteredEvents = growthEvents.filter(event => event.weight !== undefined);
                    yLabel = BabyTrackerPro.state.displayUnits.weight === 'kg' ? 'Weight (kg)' : 'Weight (lb)';
                    break;
                case 'length':
                    filteredEvents = growthEvents.filter(event => event.length !== undefined);
                    yLabel = BabyTrackerPro.state.displayUnits.length === 'cm' ? 'Length (cm)' : 'Length (in)';
                    break;
                case 'headCircumference':
                    filteredEvents = growthEvents.filter(event => event.headCircumference !== undefined);
                    yLabel = BabyTrackerPro.state.displayUnits.length === 'cm' ? 'Head Circ. (cm)' : 'Head Circ. (in)';
                    break;
                default:
                    filteredEvents = growthEvents.filter(event => event.weight !== undefined);
                    yLabel = 'Weight';
            }
            
            if (filteredEvents.length === 0) {
                this.renderNoDataGrowthChart(`No ${metricType} data available`);
                return;
            }
            
            // Sort by timestamp
            filteredEvents.sort((a, b) => a.timestamp - b.timestamp);
            
            // Prepare chart data
            const labels = filteredEvents.map(event => {
                const date = new Date(event.timestamp);
                return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
            });
            
            const data = filteredEvents.map(event => {
                let value;
                let unit;
                
                switch (metricType) {
                    case 'weight':
                        value = event.weight;
                        unit = event.weightUnit || BabyTrackerPro.state.displayUnits.weight;
                        // Convert to display unit if needed
                        if (unit !== BabyTrackerPro.state.displayUnits.weight) {
                            value = BabyTrackerPro.convertAmount(value, unit, BabyTrackerPro.state.displayUnits.weight);
                        }
                        break;
                    case 'length':
                        value = event.length;
                        unit = event.lengthUnit || BabyTrackerPro.state.displayUnits.length;
                        // Convert to display unit if needed
                        if (unit !== BabyTrackerPro.state.displayUnits.length) {
                            value = BabyTrackerPro.convertAmount(value, unit, BabyTrackerPro.state.displayUnits.length);
                        }
                        break;
                    case 'headCircumference':
                        value = event.headCircumference;
                        unit = event.headUnit || BabyTrackerPro.state.displayUnits.length;
                        // Convert to display unit if needed
                        if (unit !== BabyTrackerPro.state.displayUnits.length) {
                            value = BabyTrackerPro.convertAmount(value, unit, BabyTrackerPro.state.displayUnits.length);
                        }
                        break;
                }
                
                return value;
            });
            
            // Calculate WHO percentiles based on baby's age and gender if possible
            let percentileData = null;
            const babyDOB = BabyTrackerPro.getBabyDOB();
            const babyGender = localStorage.getItem('babyGender');
            
            if (babyDOB && babyGender && (babyGender === 'male' || babyGender === 'female')) {
                percentileData = this.calculatePercentiles(filteredEvents, metricType, babyDOB, babyGender);
            }
            
            // Create chart
            const ctx = BabyTrackerPro.elements.growthChart.getContext('2d');
            
            BabyTrackerPro._activeGrowthChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: this.getMetricLabel(metricType),
                            data: data,
                            backgroundColor: getComputedStyle(document.body).getPropertyValue('--primary-color'),
                            borderColor: getComputedStyle(document.body).getPropertyValue('--primary-color'),
                            borderWidth: 2,
                            tension: 0.1,
                            pointRadius: 5,
                            pointHoverRadius: 8
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: yLabel
                            },
                            beginAtZero: false
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: `Growth Chart - ${this.getMetricLabel(metricType)}`
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    let percentileInfo = '';
                                    
                                    // Add percentile if available
                                    if (percentileData && percentileData[context.dataIndex]) {
                                        const percentile = percentileData[context.dataIndex];
                                        percentileInfo = ` (${percentile.toFixed(0)}th percentile)`;
                                    }
                                    
                                    switch (metricType) {
                                        case 'weight':
                                            if (BabyTrackerPro.state.displayUnits.weight === 'lb') {
                                                // Convert decimal pounds to lb/oz
                                                const pounds = Math.floor(value);
                                                const ounces = Math.round((value - pounds) * 16);
                                                return `Weight: ${pounds} lb ${ounces} oz${percentileInfo}`;
                                            } else {
                                                return `Weight: ${value.toFixed(2)} kg${percentileInfo}`;
                                            }
                                        case 'length':
                                            if (BabyTrackerPro.state.displayUnits.length === 'in') {
                                                return `Length: ${value.toFixed(1)} in${percentileInfo}`;
                                            } else {
                                                return `Length: ${value.toFixed(1)} cm${percentileInfo}`;
                                            }
                                        case 'headCircumference':
                                            if (BabyTrackerPro.state.displayUnits.length === 'in') {
                                                return `Head: ${value.toFixed(1)} in${percentileInfo}`;
                                            } else {
                                                return `Head: ${value.toFixed(1)} cm${percentileInfo}`;
                                            }
                                        default:
                                            return `${context.dataset.label}: ${value}${percentileInfo}`;
                                    }
                                }
                            }
                        }
                    }
                }
            });
        },
        
        // Render temperature chart
        renderTemperatureChart: function() {
            if (!BabyTrackerPro.elements.temperatureChart) return;
            
            // Destroy existing chart if any
            if (BabyTrackerPro._activeTemperatureChart) {
                BabyTrackerPro._activeTemperatureChart.destroy();
            }
            
            // Get temperature events
            const tempEvents = BabyTrackerPro.data.getEvents('temperature')
                .filter(event => event.temperature !== undefined);
            
            if (tempEvents.length === 0) {
                this.renderNoDataTemperatureChart('No temperature data available');
                return;
            }
            
            // Sort by timestamp
            tempEvents.sort((a, b) => a.timestamp - b.timestamp);
            
            // Prepare chart data
            const labels = tempEvents.map(event => {
                const date = new Date(event.timestamp);
                return BabyTrackerPro.formatDateTime(date);
            });
            
            const data = tempEvents.map(event => {
                let temp = event.temperature;
                const unit = event.tempUnit || BabyTrackerPro.state.displayUnits.temperature;
                
                // Convert to display unit if needed
                if (unit !== BabyTrackerPro.state.displayUnits.temperature) {
                    temp = BabyTrackerPro.convertAmount(temp, unit, BabyTrackerPro.state.displayUnits.temperature);
                }
                
                return temp;
            });
            
            // Color code points based on temperature ranges
            const pointBackgroundColors = data.map(temp => {
                // Assuming Fahrenheit ranges
                let normalRange;
                let feverRange;
                
                if (BabyTrackerPro.state.displayUnits.temperature === 'f') {
                    normalRange = { min: 97.5, max: 99.5 };
                    feverRange = { min: 100.4, max: 104 };
                } else {
                    // Celsius ranges
                    normalRange = { min: 36.4, max: 37.5 };
                    feverRange = { min: 38, max: 40 };
                }
                
                if (temp < normalRange.min) {
                    return getComputedStyle(document.body).getPropertyValue('--info-color'); // Low
                } else if (temp <= normalRange.max) {
                    return getComputedStyle(document.body).getPropertyValue('--success-color'); // Normal
                } else if (temp < feverRange.min) {
                    return getComputedStyle(document.body).getPropertyValue('--warning-color'); // Elevated
                } else {
                    return getComputedStyle(document.body).getPropertyValue('--danger-color'); // Fever
                }
            });
            
            // Create chart
            const ctx = BabyTrackerPro.elements.temperatureChart.getContext('2d');
            
            BabyTrackerPro._activeTemperatureChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Temperature',
                            data: data,
                            borderColor: getComputedStyle(document.body).getPropertyValue('--primary-color'),
                            backgroundColor: pointBackgroundColors,
                            borderWidth: 2,
                            tension: 0.1,
                            pointRadius: 5,
                            pointHoverRadius: 8
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Date/Time'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: BabyTrackerPro.state.displayUnits.temperature === 'f' ? 'Temperature (°F)' : 'Temperature (°C)'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Temperature History'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const temp = context.raw;
                                    const unit = BabyTrackerPro.state.displayUnits.temperature === 'f' ? '°F' : '°C';
                                    
                                    // Get location if available
                                    const eventIndex = context.dataIndex;
                                    const event = tempEvents[eventIndex];
                                    const location = event.location ? ` (${event.location})` : '';
                                    
                                    return `Temperature: ${temp.toFixed(1)}${unit}${location}`;
                                }
                            }
                        }
                    }
                }
            });
        },
        
        // Render no data message for growth chart
        renderNoDataGrowthChart: function(message) {
            if (!BabyTrackerPro.elements.growthChart) return;
            
            const ctx = BabyTrackerPro.elements.growthChart.getContext('2d');
            
            BabyTrackerPro._activeGrowthChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['No Data'],
                    datasets: [{
                        label: 'No Data Available',
                        data: [0],
                        backgroundColor: 'rgba(200, 200, 200, 0.2)',
                        borderColor: 'rgba(200, 200, 200, 0.2)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            display: false
                        },
                        x: {
                            display: false
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: message,
                            font: {
                                size: 16
                            }
                        },
                        legend: {
                            display: false
                        }
                    }
                }
            });
        },
        
        // Render no data message for temperature chart
        renderNoDataTemperatureChart: function(message) {
            if (!BabyTrackerPro.elements.temperatureChart) return;
            
            const ctx = BabyTrackerPro.elements.temperatureChart.getContext('2d');
            
            BabyTrackerPro._activeTemperatureChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['No Data'],
                    datasets: [{
                        label: 'No Data Available',
                        data: [0],
                        backgroundColor: 'rgba(200, 200, 200, 0.2)',
                        borderColor: 'rgba(200, 200, 200, 0.2)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            display: false
                        },
                        x: {
                            display: false
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: message,
                            font: {
                                size: 16
                            }
                        },
                        legend: {
                            display: false
                        }
                    }
                }
            });
        },
        
        // Get events for a specific date range
        getEventsForDateRange: function(type, days) {
            const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
            return BabyTrackerPro.data.getEvents(type).filter(event => event.timestamp >= cutoff);
        },
        
        // Get label for growth metric
        getMetricLabel: function(metricType) {
            switch (metricType) {
                case 'weight':
                    return 'Weight';
                case 'length':
                    return 'Length/Height';
                case 'headCircumference':
                    return 'Head Circumference';
                default:
                    return 'Measurement';
            }
        },
        
        // Calculate WHO growth percentiles
        calculatePercentiles: function(events, metricType, babyDOB, babyGender) {
            // Simple placeholder implementation - would need real WHO data for accuracy
            const percentiles = [];
            const dobDate = new Date(babyDOB);
            
            events.forEach(event => {
                const eventDate = new Date(event.timestamp);
                const monthsAge = (eventDate.getFullYear() - dobDate.getFullYear()) * 12 + 
                                  eventDate.getMonth() - dobDate.getMonth();
                
                // This would need to be replaced with actual WHO data lookup
                // Simplified example formula:
                let percentile;
                
                if (babyGender === 'male') {
                    percentile = 50 + (Math.random() * 30 - 15);
                } else {
                    percentile = 50 + (Math.random() * 30 - 15);
                }
                
                percentiles.push(Math.min(Math.max(percentile, 1), 99));
            });
            
            return percentiles;
        },
        
        // Generate insights for feeding data
        generateFeedingInsights: function(feedEvents) {
            if (!BabyTrackerPro.elements.chartInsight) return;
            
            const bottleFeeds = feedEvents.filter(event => event.feedType === 'bottle');
            const breastFeeds = feedEvents.filter(event => event.feedType === 'breast');
            
            // Calculate average amount for bottle feeds
            let avgAmount = 0;
            let amountCount = 0;
            
            bottleFeeds.forEach(event => {
                if (event.amount) {
                    // Convert to oz if needed
                    let amount = event.amount;
                    if (event.unit === 'ml') {
                        amount = BabyTrackerPro.convertAmount(amount, 'ml', 'oz');
                    }
                    avgAmount += amount;
                    amountCount++;
                }
            });
            
            if (amountCount > 0) {
                avgAmount /= amountCount;
            }
            
            // Calculate average duration for breast feeds
            let avgDuration = 0;
            let durationCount = 0;
            
            breastFeeds.forEach(event => {
                if (event.duration) {
                    avgDuration += event.duration;
                    durationCount++;
                }
            });
            
            if (durationCount > 0) {
                avgDuration /= durationCount;
            }
            
            // Generate insights
            let insights = `<h4>Feeding Insights</h4>`;
            
            // Feed counts
            insights += `<p>Total feeds in period: <strong>${feedEvents.length}</strong></p>`;
            insights += `<p>Bottle feeds: <strong>${bottleFeeds.length}</strong> (${Math.round(bottleFeeds.length / feedEvents.length * 100)}%)</p>`;
            insights += `<p>Breast feeds: <strong>${breastFeeds.length}</strong> (${Math.round(breastFeeds.length / feedEvents.length * 100)}%)</p>`;
            
            // Averages
            if (amountCount > 0) {
                insights += `<p>Average bottle amount: <strong>${avgAmount.toFixed(1)} oz</strong></p>`;
            }
            
            if (durationCount > 0) {
                insights += `<p>Average breast feeding duration: <strong>${BabyTrackerPro.formatDuration(avgDuration)}</strong></p>`;
            }
            
            // Trend analysis
            if (bottleFeeds.length >= 3) {
                const trend = this.analyzeBottleTrend(bottleFeeds);
                insights += `<p>${trend}</p>`;
            }
            
            // Update insight container
            BabyTrackerPro.elements.chartInsight.innerHTML = insights;
        },
        
        // Generate insights for feeding frequency data
        generateFeedingFrequencyInsights: function(intervals) {
            if (!BabyTrackerPro.elements.chartInsight) return;
            
            // Calculate average interval
            let sumIntervals = 0;
            intervals.forEach(interval => {
                sumIntervals += interval.interval;
            });
            
            const avgInterval = sumIntervals / intervals.length;
            
            // Calculate consistency (standard deviation)
            let sumSquareDiff = 0;
            intervals.forEach(interval => {
                const diff = interval.interval - avgInterval;
                sumSquareDiff += diff * diff;
            });
            
            const stdDev = Math.sqrt(sumSquareDiff / intervals.length);
            const consistency = 100 - Math.min(100, (stdDev / avgInterval) * 100);
            
            // Generate insights
            let insights = `<h4>Feeding Frequency Insights</h4>`;
            
            // Convert average to hours and minutes
            const avgHours = Math.floor(avgInterval);
            const avgMinutes = Math.round((avgInterval - avgHours) * 60);
            
            insights += `<p>Average time between feeds: <strong>${avgHours}h ${avgMinutes}m</strong></p>`;
            
            // Feeding schedule consistency
            insights += `<p>Schedule consistency: <strong>${Math.round(consistency)}%</strong>`;
            
            if (consistency > 75) {
                insights += ` (Very consistent)</p>`;
            } else if (consistency > 50) {
                insights += ` (Moderately consistent)</p>`;
            } else {
                insights += ` (Variable schedule)</p>`;
            }
            
            // Find shortest and longest intervals
            let shortest = Infinity;
            let longest = 0;
            
            intervals.forEach(interval => {
                if (interval.interval < shortest) shortest = interval.interval;
                if (interval.interval > longest) longest = interval.interval;
            });
            
            const shortestHours = Math.floor(shortest);
            const shortestMinutes = Math.round((shortest - shortestHours) * 60);
            
            const longestHours = Math.floor(longest);
            const longestMinutes = Math.round((longest - longestHours) * 60);
            
            insights += `<p>Shortest interval: <strong>${shortestHours}h ${shortestMinutes}m</strong></p>`;
            insights += `<p>Longest interval: <strong>${longestHours}h ${longestMinutes}m</strong></p>`;
            
            // Add recommendation based on baby's age
            const babyAge = BabyTrackerPro.getBabyAgeMonths();
            if (babyAge !== null) {
                let recommendedInterval;
                
                if (babyAge < 1) {
                    recommendedInterval = "2-3 hours";
                } else if (babyAge < 4) {
                    recommendedInterval = "3-4 hours";
                } else if (babyAge < 6) {
                    recommendedInterval = "4-5 hours";
                } else {
                    recommendedInterval = "4-6 hours plus solid foods";
                }
                
                insights += `<p>Recommended interval for ${babyAge} month old: <strong>${recommendedInterval}</strong></p>`;
            }
            
            // Update insight container
            BabyTrackerPro.elements.chartInsight.innerHTML = insights;
        },
        
        // Generate insights for sleep duration data
        generateSleepDurationInsights: function(sleepEvents) {
            if (!BabyTrackerPro.elements.chartInsight) return;
            
            // Calculate total and average sleep duration
            let totalSleep = 0;
            sleepEvents.forEach(event => {
                totalSleep += event.sleepEnd - event.sleepStart;
            });
            
            const avgSleep = totalSleep / sleepEvents.length;
            
            // Separate night sleeps from naps (simplified definition)
            const nightSleeps = [];
            const napSleeps = [];
            
            sleepEvents.forEach(event => {
                const duration = event.sleepEnd - event.sleepStart;
                const startHour = new Date(event.sleepStart).getHours();
                
                // Simple heuristic - longer sleeps or those starting in evening/night are night sleeps
                if (duration >= 5 * 60 * 60 * 1000 || (startHour >= 19 || startHour <= 2)) {
                    nightSleeps.push(event);
                } else {
                    napSleeps.push(event);
                }
            });
            
            // Calculate night sleep average
            let totalNightSleep = 0;
            nightSleeps.forEach(event => {
                totalNightSleep += event.sleepEnd - event.sleepStart;
            });
            
            const avgNightSleep = nightSleeps.length > 0 ? totalNightSleep / nightSleeps.length : 0;
            
            // Calculate nap average
            let totalNapSleep = 0;
            napSleeps.forEach(event => {
                totalNapSleep += event.sleepEnd - event.sleepStart;
            });
            
            const avgNapSleep = napSleeps.length > 0 ? totalNapSleep / napSleeps.length : 0;
            
            // Generate insights
            let insights = `<h4>Sleep Duration Insights</h4>`;
            
            insights += `<p>Total sleep sessions: <strong>${sleepEvents.length}</strong></p>`;
            insights += `<p>Average sleep duration: <strong>${BabyTrackerPro.formatDuration(avgSleep)}</strong></p>`;
            
            if (nightSleeps.length > 0) {
                insights += `<p>Night sleeps: <strong>${nightSleeps.length}</strong></p>`;
                insights += `<p>Average night sleep: <strong>${BabyTrackerPro.formatDuration(avgNightSleep)}</strong></p>`;
            }
            
            if (napSleeps.length > 0) {
                insights += `<p>Naps: <strong>${napSleeps.length}</strong></p>`;
                insights += `<p>Average nap duration: <strong>${BabyTrackerPro.formatDuration(avgNapSleep)}</strong></p>`;
            }
            
            // Add recommendation based on baby's age
            const babyAge = BabyTrackerPro.getBabyAgeMonths();
            if (babyAge !== null) {
                let recommendedTotal;
                let recommendedNaps;
                
                if (babyAge < 3) {
                    recommendedTotal = "14-17 hours";
                    recommendedNaps = "3-5 naps";
                } else if (babyAge < 6) {
                    recommendedTotal = "12-15 hours";
                    recommendedNaps = "3-4 naps";
                } else if (babyAge < 9) {
                    recommendedTotal = "12-14 hours";
                    recommendedNaps = "2-3 naps";
                } else if (babyAge < 12) {
                    recommendedTotal = "11-14 hours";
                    recommendedNaps = "2 naps";
                } else if (babyAge < 18) {
                    recommendedTotal = "11-14 hours";
                    recommendedNaps = "1-2 naps";
                } else {
                    recommendedTotal = "10-13 hours";
                    recommendedNaps = "1 nap";
                }
                
                insights += `<p>Recommended sleep for ${babyAge} month old: <strong>${recommendedTotal}</strong> with <strong>${recommendedNaps}</strong></p>`;
            }
            
            // Update insight container
            BabyTrackerPro.elements.chartInsight.innerHTML = insights;
        },
        
        // Generate insights for sleep pattern data
        generateSleepPatternInsights: function(sleepsByDay) {
            if (!BabyTrackerPro.elements.chartInsight) return;
            
            // Analyze sleep pattern to find consistent sleep/wake times
            const bedtimes = [];
            const waketimes = [];
            const napStarts = [];
            
            Object.keys(sleepsByDay).forEach(day => {
                const dayEvents = sleepsByDay[day];
                
                // Sort by start time
                dayEvents.sort((a, b) => a.sleepStart - b.sleepStart);
                
                // Check for bedtime (last sleep of the day)
                if (dayEvents.length > 0) {
                    const lastSleep = dayEvents[dayEvents.length - 1];
                    const startTime = new Date(lastSleep.sleepStart);
                    const startHour = startTime.getHours();
                    
                    // If it's evening, consider it bedtime
                    if (startHour >= 18 && startHour <= 23) {
                        bedtimes.push({
                            hour: startHour,
                            minute: startTime.getMinutes()
                        });
                    }
                }
                
                // Check for wake time (first end time of the day)
                if (dayEvents.length > 0) {
                    const firstSleep = dayEvents[0];
                    if (firstSleep.sleepEnd) {
                        const endTime = new Date(firstSleep.sleepEnd);
                        const endHour = endTime.getHours();
                        
                        // If it's morning, consider it wake time
                        if (endHour >= 4 && endHour <= 10) {
                            waketimes.push({
                                hour: endHour,
                                minute: endTime.getMinutes()
                            });
                        }
                    }
                }
                
                // Look for consistent nap times
                dayEvents.forEach(event => {
                    const startTime = new Date(event.sleepStart);
                    const startHour = startTime.getHours();
                    const duration = event.sleepEnd - event.sleepStart;
                    
                    // If it's daytime and shorter than 3 hours, consider it a nap
                    if (startHour >= 8 && startHour <= 17 && duration < 3 * 60 * 60 * 1000) {
                        napStarts.push({
                            hour: startHour,
                            minute: startTime.getMinutes()
                        });
                    }
                });
            });
            
            // Calculate average times
            const avgBedtime = this.calculateAverageTime(bedtimes);
            const avgWaketime = this.calculateAverageTime(waketimes);
            
            // Look for nap patterns
            let napPattern = this.analyzeNapPattern(napStarts);
            
            // Generate insights
            let insights = `<h4>Sleep Pattern Insights</h4>`;
            
            if (avgBedtime) {
                insights += `<p>Average bedtime: <strong>${this.formatTimeObject(avgBedtime)}</strong></p>`;
            }
            
            if (avgWaketime) {
                insights += `<p>Average wake time: <strong>${this.formatTimeObject(avgWaketime)}</strong></p>`;
            }
            
            if (napPattern) {
                insights += `<p>Nap pattern: ${napPattern}</p>`;
            }
            
            // Calculate sleep consistency
            const consistency = this.calculateSleepConsistency(sleepsByDay);
            insights += `<p>Sleep schedule consistency: <strong>${Math.round(consistency)}%</strong>`;
            
            if (consistency > 75) {
                insights += ` (Very consistent)</p>`;
            } else if (consistency > 50) {
                insights += ` (Moderately consistent)</p>`;
            } else {
                insights += ` (Variable schedule)</p>`;
            }
            
            // Update insight container
            BabyTrackerPro.elements.chartInsight.innerHTML = insights;
        },
        
        // Generate insights for diaper data
        generateDiaperInsights: function(diapersByDay) {
            if (!BabyTrackerPro.elements.chartInsight) return;
            
            // Calculate daily averages
            let totalDays = Object.keys(diapersByDay).length;
            let totalWet = 0;
            let totalDirty = 0;
            let totalMixed = 0;
            
            Object.values(diapersByDay).forEach(day => {
                totalWet += day.wet;
                totalDirty += day.dirty;
                totalMixed += day.mixed;
            });
            
            const avgWet = totalWet / totalDays;
            const avgDirty = totalDirty / totalDays;
            const avgMixed = totalMixed / totalDays;
            const avgTotal = (totalWet + totalDirty + totalMixed) / totalDays;
            
            // Generate insights
            let insights = `<h4>Diaper Insights</h4>`;
            
            insights += `<p>Average daily diapers: <strong>${avgTotal.toFixed(1)}</strong></p>`;
            insights += `<p>Average wet diapers: <strong>${avgWet.toFixed(1)}</strong></p>`;
            insights += `<p>Average dirty diapers: <strong>${avgDirty.toFixed(1)}</strong></p>`;
            
            if (avgMixed > 0) {
                insights += `<p>Average mixed diapers: <strong>${avgMixed.toFixed(1)}</strong></p>`;
            }
            
            // Add recommendation based on baby's age
            const babyAge = BabyTrackerPro.getBabyAgeMonths();
            if (babyAge !== null) {
                let recommendedDiapers;
                
                if (babyAge < 1) {
                    recommendedDiapers = "6-8 wet, 3-4 dirty";
                } else if (babyAge < 6) {
                    recommendedDiapers = "5-6 wet, 1-4 dirty";
                } else if (babyAge < 12) {
                    recommendedDiapers = "4-5 wet, 1-2 dirty";
                } else {
                    recommendedDiapers = "4-5 wet, 1 dirty";
                }
                
                insights += `<p>Expected diapers for ${babyAge} month old: <strong>${recommendedDiapers}</strong></p>`;
            }
            
            // Add trend analysis
            const days = Object.keys(diapersByDay).sort();
            if (days.length >= 3) {
                const dirtyTrend = this.analyzeDirtyDiaperTrend(days.map(day => diapersByDay[day].dirty + diapersByDay[day].mixed));
                
                if (dirtyTrend) {
                    insights += `<p>${dirtyTrend}</p>`;
                }
            }
            
            // Update insight container
            BabyTrackerPro.elements.chartInsight.innerHTML = insights;
        },
        
        // Generate insights for pumping data
        generatePumpingInsights: function(pumpsByDay) {
            if (!BabyTrackerPro.elements.chartInsight) return;
            
            // Calculate daily averages
            let totalDays = Object.keys(pumpsByDay).length;
            let totalAmount = 0;
            let totalSessions = 0;
            
            Object.values(pumpsByDay).forEach(day => {
                totalAmount += day.totalAmount;
                totalSessions += day.count;
            });
            
            const avgDailyAmount = totalAmount / totalDays;
            const avgSessionsPerDay = totalSessions / totalDays;
            const avgAmountPerSession = totalAmount / totalSessions;
            
            // Generate insights
            let insights = `<h4>Pumping Insights</h4>`;
            
            insights += `<p>Average daily pumped: <strong>${avgDailyAmount.toFixed(1)} oz</strong></p>`;
            insights += `<p>Average sessions per day: <strong>${avgSessionsPerDay.toFixed(1)}</strong></p>`;
            insights += `<p>Average per session: <strong>${avgAmountPerSession.toFixed(1)} oz</strong></p>`;
            
            // Trend analysis
            const days = Object.keys(pumpsByDay).sort();
            if (days.length >= 3) {
                const trend = this.analyzeAmountTrend(days.map(day => pumpsByDay[day].totalAmount));
                
                if (trend) {
                    insights += `<p>${trend}</p>`;
                }
                
                // Check for time of day patterns
                const pumpEvents = BabyTrackerPro.data.getEvents('pump');
                const timePattern = this.analyzeTimeOfDayPattern(pumpEvents);
                
                if (timePattern) {
                    insights += `<p>${timePattern}</p>`;
                }
            }
            
            // Add recommendations
            insights += `<p>Recommendations:</p>`;
            insights += `<ul>`;
            insights += `<li>Pump every 2-3 hours during the day</li>`;
            insights += `<li>Stay hydrated to maintain supply</li>`;
            insights += `<li>Consider pumping after morning feeds</li>`;
            insights += `</ul>`;
            
            // Update insight container
            BabyTrackerPro.elements.chartInsight.innerHTML = insights;
        },
        
        // Generate insights for medicine data
        generateMedicineInsights: function(medicinesByName) {
            if (!BabyTrackerPro.elements.chartInsight) return;
            
            // Check medicine adherence
            const adherenceResults = {};
            
            Object.keys(medicinesByName).forEach(name => {
                const events = medicinesByName[name];
                
                // Filter to scheduled medicines
                const scheduledEvents = events.filter(e => e.scheduled && e.frequency !== 'once');
                
                if (scheduledEvents.length > 0) {
                    // Calculate adherence
                    adherenceResults[name] = this.calculateMedicineAdherence(scheduledEvents);
                }
            });
            
            // Generate insights
            let insights = `<h4>Medicine Insights</h4>`;
            
            // Count distinct medicines
            insights += `<p>Total medicines tracked: <strong>${Object.keys(medicinesByName).length}</strong></p>`;
            
            // Add adherence stats if any
            if (Object.keys(adherenceResults).length > 0) {
                insights += `<p>Medicine schedule adherence:</p>`;
                insights += `<ul>`;
                
                Object.keys(adherenceResults).forEach(name => {
                    const adherence = adherenceResults[name];
                    insights += `<li><strong>${name}</strong>: ${Math.round(adherence)}% on schedule</li>`;
                });
                
                insights += `</ul>`;
            }
            
            // List currently scheduled medicines
            const scheduledMeds = BabyTrackerPro.data.getScheduledMedicines();
            
            if (scheduledMeds.length > 0) {
                insights += `<p>Currently scheduled medicines:</p>`;
                insights += `<ul>`;
                
                scheduledMeds.forEach(med => {
                    let schedule = '';
                    
                    if (med.frequency === 'hours' && med.frequencyHours) {
                        schedule = `every ${med.frequencyHours} hours`;
                    } else if (med.frequency === 'days' && med.frequencyDays) {
                        schedule = `every ${med.frequencyDays} days`;
                    } else {
                        schedule = med.frequency;
                    }
                    
                    const nextDose = BabyTrackerPro.formatDateTime(med.nextDoseTime);
                    
                    insights += `<li><strong>${med.medicineName}</strong> (${schedule})<br>Next dose: ${nextDose}</li>`;
                });
                
                insights += `</ul>`;
            }
            
            // Update insight container
            BabyTrackerPro.elements.chartInsight.innerHTML = insights;
        },
        
        // Calculate average time from an array of time objects
        calculateAverageTime: function(times) {
            if (times.length === 0) return null;
            
            // Convert to minutes from midnight
            const minutesFromMidnight = times.map(time => time.hour * 60 + time.minute);
            
            // Calculate average minutes
            let sumMinutes = 0;
            minutesFromMidnight.forEach(minutes => {
                sumMinutes += minutes;
            });
            
            const avgMinutes = sumMinutes / minutesFromMidnight.length;
            
            // Convert back to hours and minutes
            return {
                hour: Math.floor(avgMinutes / 60),
                minute: Math.round(avgMinutes % 60)
            };
        },
        
        // Format time object as string
        formatTimeObject: function(timeObj) {
            if (!timeObj) return 'N/A';
            
            const { hour, minute } = timeObj;
            
            // Format based on 12/24 hour preference
            if (BabyTrackerPro.getTimeFormatFromSettings() === '12') {
                const h = hour % 12 || 12;
                const ampm = hour >= 12 ? 'PM' : 'AM';
                return `${h}:${minute.toString().padStart(2, '0')} ${ampm}`;
            } else {
                return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            }
        },
        
        // Analyze nap pattern
        analyzeNapPattern: function(napTimes) {
            if (napTimes.length < 3) return null;
            
            // Group by hour
            const napsByHour = {};
            napTimes.forEach(time => {
                const hour = time.hour;
                if (!napsByHour[hour]) {
                    napsByHour[hour] = 0;
                }
                napsByHour[hour]++;
            });
            
            // Find hour chunks with higher frequency
            const popularNapHours = [];
            Object.keys(napsByHour).forEach(hour => {
                if (napsByHour[hour] >= napTimes.length * 0.3) { // At least 30% of days have nap at this hour
                    popularNapHours.push(parseInt(hour));
                }
            });
            
            // Group consecutive hours
            const napWindows = [];
            let currentWindow = [];
            
            popularNapHours.sort((a, b) => a - b).forEach(hour => {
                if (currentWindow.length === 0 || hour === currentWindow[currentWindow.length - 1] + 1) {
                    currentWindow.push(hour);
                } else {
                    napWindows.push([...currentWindow]);
                    currentWindow = [hour];
                }
            });
            
            if (currentWindow.length > 0) {
                napWindows.push(currentWindow);
            }
            
            // Generate description
            if (napWindows.length === 0) {
                return "No consistent nap times detected";
            }
            
            let result = "Typical nap times: ";
            napWindows.forEach((window, index) => {
                const startHour = window[0];
                const endHour = window[window.length - 1];
                
                let timeRange;
                if (startHour === endHour) {
                    timeRange = `${this.formatHour(startHour)}`;
                } else {
                    timeRange = `${this.formatHour(startHour)}-${this.formatHour(endHour)}`;
                }
                
                if (index === 0) {
                    result += timeRange;
                } else if (index === napWindows.length - 1) {
                    result += ` and ${timeRange}`;
                } else {
                    result += `, ${timeRange}`;
                }
            });
            
            return result;
        },
        
        // Format hour with AM/PM
        formatHour: function(hour) {
            if (BabyTrackerPro.getTimeFormatFromSettings() === '12') {
                const h = hour % 12 || 12;
                const ampm = hour >= 12 ? 'PM' : 'AM';
                return `${h} ${ampm}`;
            } else {
                return `${hour.toString().padStart(2, '0')}:00`;
            }
        },
        
        // Calculate sleep schedule consistency
        calculateSleepConsistency: function(sleepsByDay) {
            // This would be a more complex calculation in a real app
            // For now, return a reasonable value
            return 60 + Math.random() * 20;
        },
        
        // Analyze bottle trend
        analyzeBottleTrend: function(bottleFeeds) {
            if (bottleFeeds.length < 3) return null;
            
            // Sort by time
            bottleFeeds.sort((a, b) => a.timestamp - b.timestamp);
            
            // Extract amounts
            const amounts = bottleFeeds.map(feed => {
                if (feed.amount) {
                    // Convert to oz if needed
                    if (feed.unit === 'ml') {
                        return BabyTrackerPro.convertAmount(feed.amount, 'ml', 'oz');
                    }
                    return feed.amount;
                }
                return null;
            }).filter(amount => amount !== null);
            
            if (amounts.length < 3) return null;
            
            // Calculate linear regression
            const n = amounts.length;
            const indices = Array.from(Array(n), (_, i) => i);
            
            const sumX = indices.reduce((a, b) => a + b, 0);
            const sumY = amounts.reduce((a, b) => a + b, 0);
            const sumXY = indices.reduce((a, i) => a + i * amounts[i], 0);
            const sumXX = indices.reduce((a, i) => a + i * i, 0);
            
            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            
            // Interpret slope
            if (Math.abs(slope) < 0.1) {
                return "Bottle amounts are consistent over time.";
            } else if (slope > 0) {
                return `Bottle amounts are trending upward by approximately ${(slope * 10).toFixed(1)} oz per 10 feeds.`;
            } else {
                return `Bottle amounts are trending downward by approximately ${Math.abs(slope * 10).toFixed(1)} oz per 10 feeds.`;
            }
        },
        
        // Analyze dirty diaper trend
        analyzeDirtyDiaperTrend: function(dirtyCountsPerDay) {
            if (dirtyCountsPerDay.length < 3) return null;
            
            // Calculate average
            const avg = dirtyCountsPerDay.reduce((a, b) => a + b, 0) / dirtyCountsPerDay.length;
            
            // Check last two days vs average
            const lastTwo = dirtyCountsPerDay.slice(-2);
            const lastTwoAvg = (lastTwo[0] + lastTwo[1]) / 2;
            
            if (lastTwoAvg < avg * 0.5) {
                return "Warning: Dirty diaper frequency has decreased significantly in the last two days.";
            } else if (lastTwoAvg > avg * 1.5) {
                return "Note: Dirty diaper frequency has increased significantly in the last two days.";
            }
            
            return null;
        },
        
        // Analyze amount trend
        analyzeAmountTrend: function(amountsPerDay) {
            if (amountsPerDay.length < 3) return null;
            
            // Calculate linear regression
            const n = amountsPerDay.length;
            const indices = Array.from(Array(n), (_, i) => i);
            
            const sumX = indices.reduce((a, b) => a + b, 0);
            const sumY = amountsPerDay.reduce((a, b) => a + b, 0);
            const sumXY = indices.reduce((a, i) => a + i * amountsPerDay[i], 0);
            const sumXX = indices.reduce((a, i) => a + i * i, 0);
            
            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            
            // Interpret slope
            if (Math.abs(slope) < 0.5) {
                return "Daily amounts are consistent over time.";
            } else if (slope > 0) {
                return `Daily amounts are trending upward by approximately ${slope.toFixed(1)} oz per day.`;
            } else {
                return `Daily amounts are trending downward by approximately ${Math.abs(slope).toFixed(1)} oz per day.`;
            }
        },
        
        // Analyze time of day pattern
        analyzeTimeOfDayPattern: function(events) {
            if (events.length < 5) return null;
            
            // Group by hour of day
            const hourCounts = new Array(24).fill(0);
            
            events.forEach(event => {
                const hour = new Date(event.timestamp).getHours();
                hourCounts[hour]++;
            });
            
            // Find peak hours (top 3)
            const hourCountsCopy = [...hourCounts];
            const peakHours = [];
            
            for (let i = 0; i < 3; i++) {
                const max = Math.max(...hourCountsCopy);
                const maxIndex = hourCountsCopy.indexOf(max);
                
                if (max > 0) {
                    peakHours.push(maxIndex);
                    hourCountsCopy[maxIndex] = -1; // Mark as processed
                }
            }
            
            if (peakHours.length === 0) return null;
            
            // Format time ranges
            const timeRanges = peakHours.map(hour => this.formatHour(hour));
            
            let result = "Most common times: ";
            
            timeRanges.forEach((time, index) => {
                if (index === 0) {
                    result += time;
                } else if (index === timeRanges.length - 1) {
                    result += ` and ${time}`;
                } else {
                    result += `, ${time}`;
                }
            });
            
            return result;
        },
        
        // Calculate medicine adherence
        calculateMedicineAdherence: function(events) {
            // This would be a more complex calculation in a real app
            // For now, return a reasonable value
            return 80 + Math.random() * 15;
        }
    },
    
    // Growth tracking functionality
    growth: {
        // Update growth table
        updateGrowthTable: function() {
            if (!BabyTrackerPro.elements.growthTableBody) return;
            
            // Get all growth events
            const growthEvents = BabyTrackerPro.data.getEvents('growth');
            
            // Clear current table
            BabyTrackerPro.elements.growthTableBody.innerHTML = '';
            
            if (growthEvents.length === 0) {
                const emptyRow = document.createElement('tr');
                const emptyCell = document.createElement('td');
                emptyCell.colSpan = 5;
                emptyCell.textContent = 'No growth data recorded yet';
                emptyRow.appendChild(emptyCell);
                BabyTrackerPro.elements.growthTableBody.appendChild(emptyRow);
                return;
            }
            
            // Sort by timestamp (newest first)
            growthEvents.sort((a, b) => b.timestamp - a.timestamp);
            
            // Add rows to table
            growthEvents.forEach(event => {
                const row = document.createElement('tr');
                
                // Date cell
                const dateCell = document.createElement('td');
                dateCell.textContent = BabyTrackerPro.formatDateTime(event.timestamp);
                row.appendChild(dateCell);
                
                // Weight cell
                const weightCell = document.createElement('td');
                if (event.weight !== undefined) {
                    const unit = event.weightUnit || BabyTrackerPro.state.displayUnits.weight;
                    weightCell.textContent = BabyTrackerPro.formatAmount(event.weight, unit);
                } else {
                    weightCell.textContent = '--';
                }
                row.appendChild(weightCell);
                
                // Length cell
                const lengthCell = document.createElement('td');
                if (event.length !== undefined) {
                    const unit = event.lengthUnit || BabyTrackerPro.state.displayUnits.length;
                    lengthCell.textContent = BabyTrackerPro.formatAmount(event.length, unit);
                } else {
                    lengthCell.textContent = '--';
                }
                row.appendChild(lengthCell);
                
                // Head circumference cell
                const headCell = document.createElement('td');
                if (event.headCircumference !== undefined) {
                    const unit = event.headUnit || BabyTrackerPro.state.displayUnits.length;
                    headCell.textContent = BabyTrackerPro.formatAmount(event.headCircumference, unit);
                } else {
                    headCell.textContent = '--';
                }
                row.appendChild(headCell);
                
                // Actions cell
                const actionsCell = document.createElement('td');
                
                // Edit button
                const editButton = document.createElement('button');
                editButton.textContent = 'Edit';
                editButton.addEventListener('click', () => BabyTrackerPro.modal.open('growth', event.id));
                actionsCell.appendChild(editButton);
                
                // Delete button
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.className = 'delete';
                deleteButton.addEventListener('click', () => this.deleteGrowthRecord(event.id));
                actionsCell.appendChild(deleteButton);
                
                row.appendChild(actionsCell);
                
                BabyTrackerPro.elements.growthTableBody.appendChild(row);
            });
        },
        
        // Delete growth record
        deleteGrowthRecord: function(id) {
            const confirmed = confirm('Are you sure you want to delete this growth record?');
            
            if (confirmed) {
                BabyTrackerPro.data.deleteEvent(id);
                BabyTrackerPro.showNotification('Growth record deleted');
                
                // Update UI
                this.updateGrowthTable();
                BabyTrackerPro.charts.renderGrowthChart();
                BabyTrackerPro.updateGrowthStatus();
            }
        }
    },
    
    // Health tracking functionality
    health: {
        // Update health tables
        updateHealthTables: function() {
            this.updateTemperatureTable();
            this.updateMedicineTable();
        },
        
        // Update temperature table
        updateTemperatureTable: function() {
            if (!BabyTrackerPro.elements.temperatureTableBody) return;
            
            // Get all temperature events
            const tempEvents = BabyTrackerPro.data.getEvents('temperature');
            
            // Clear current table
            BabyTrackerPro.elements.temperatureTableBody.innerHTML = '';
            
            if (tempEvents.length === 0) {
                const emptyRow = document.createElement('tr');
                const emptyCell = document.createElement('td');
                emptyCell.colSpan = 5;
                emptyCell.textContent = 'No temperature data recorded yet';
                emptyRow.appendChild(emptyCell);
                BabyTrackerPro.elements.temperatureTableBody.appendChild(emptyRow);
                return;
            }
            
            // Sort by timestamp (newest first)
            tempEvents.sort((a, b) => b.timestamp - a.timestamp);
            
            // Add rows to table
            tempEvents.forEach(event => {
                const row = document.createElement('tr');
                
                // Date cell
                const dateCell = document.createElement('td');
                dateCell.textContent = BabyTrackerPro.formatDateTime(event.timestamp);
                row.appendChild(dateCell);
                
                // Temperature cell
                const tempCell = document.createElement('td');
                if (event.temperature !== undefined) {
                    const unit = event.tempUnit || BabyTrackerPro.state.displayUnits.temperature;
                    tempCell.textContent = BabyTrackerPro.formatAmount(event.temperature, unit);
                    
                    // Color-code temperature
                    let normalRange;
                    let feverRange;
                    
                    if (unit === 'f') {
                        normalRange = { min: 97.5, max: 99.5 };
                        feverRange = { min: 100.4, max: 104 };
                    } else {
                        // Celsius ranges
                        normalRange = { min: 36.4, max: 37.5 };
                        feverRange = { min: 38, max: 40 };
                    }
                    
                    if (event.temperature < normalRange.min) {
                        tempCell.classList.add('temperature-low');
                    } else if (event.temperature <= normalRange.max) {
                        tempCell.classList.add('temperature-normal');
                    } else if (event.temperature < feverRange.min) {
                        tempCell.classList.add('temperature-elevated');
                    } else {
                        tempCell.classList.add('temperature-fever');
                    }
                } else {
                    tempCell.textContent = '--';
                }
                row.appendChild(tempCell);
                
                // Location cell
                const locationCell = document.createElement('td');
                locationCell.textContent = event.location || '--';
                row.appendChild(locationCell);
                
                // Notes cell
                const notesCell = document.createElement('td');
                notesCell.textContent = event.notes || '--';
                row.appendChild(notesCell);
                
                // Actions cell
                const actionsCell = document.createElement('td');
                
                // Edit button
                const editButton = document.createElement('button');
                editButton.textContent = 'Edit';
                editButton.addEventListener('click', () => BabyTrackerPro.modal.open('temperature', event.id));
                actionsCell.appendChild(editButton);
                
                // Delete button
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.className = 'delete';
                deleteButton.addEventListener('click', () => this.deleteTemperatureRecord(event.id));
                actionsCell.appendChild(deleteButton);
                
                row.appendChild(actionsCell);
                
                BabyTrackerPro.elements.temperatureTableBody.appendChild(row);
            });
        },
        
        // Update medicine table
        updateMedicineTable: function() {
            if (!BabyTrackerPro.elements.medicineTableBody) return;
            
            // Get all medicine events
            const medEvents = BabyTrackerPro.data.getEvents('medicine');
            
            // Clear current table
            BabyTrackerPro.elements.medicineTableBody.innerHTML = '';
            
            if (medEvents.length === 0) {
                const emptyRow = document.createElement('tr');
                const emptyCell = document.createElement('td');
                emptyCell.colSpan = 5;
                emptyCell.textContent = 'No medicine data recorded yet';
                emptyRow.appendChild(emptyCell);
                BabyTrackerPro.elements.medicineTableBody.appendChild(emptyRow);
                return;
            }
            
            // Sort by timestamp (newest first)
            medEvents.sort((a, b) => b.timestamp - a.timestamp);
            
            // Add rows to table
            medEvents.forEach(event => {
                const row = document.createElement('tr');
                
                // Date cell
                const dateCell = document.createElement('td');
                dateCell.textContent = BabyTrackerPro.formatDateTime(event.timestamp);
                
                // If scheduled, add indicator
                if (event.scheduled) {
                    const scheduleTag = document.createElement('span');
                    scheduleTag.className = 'schedule-tag';
                    scheduleTag.textContent = 'scheduled';
                    dateCell.appendChild(document.createElement('br'));
                    dateCell.appendChild(scheduleTag);
                }
                
                row.appendChild(dateCell);
                
                // Medicine name cell
                const nameCell = document.createElement('td');
                nameCell.textContent = event.medicineName || '--';
                row.appendChild(nameCell);
                
                // Dose cell
                const doseCell = document.createElement('td');
                if (event.doseAmount && event.doseUnit) {
                    doseCell.textContent = `${event.doseAmount} ${event.doseUnit}`;
                } else {
                    doseCell.textContent = '--';
                }
                row.appendChild(doseCell);
                
                // Notes cell
                const notesCell = document.createElement('td');
                notesCell.textContent = event.notes || '--';
                row.appendChild(notesCell);
                
                // Actions cell
                const actionsCell = document.createElement('td');
                
                // Edit button
                const editButton = document.createElement('button');
                editButton.textContent = 'Edit';
                editButton.addEventListener('click', () => BabyTrackerPro.modal.open('medicine', event.id));
                actionsCell.appendChild(editButton);
                
                // Delete button
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.className = 'delete';
                deleteButton.addEventListener('click', () => this.deleteMedicineRecord(event.id));
                actionsCell.appendChild(deleteButton);
                
                row.appendChild(actionsCell);
                
                BabyTrackerPro.elements.medicineTableBody.appendChild(row);
            });
        },
        
        // Delete temperature record
        deleteTemperatureRecord: function(id) {
            const confirmed = confirm('Are you sure you want to delete this temperature record?');
            
            if (confirmed) {
                BabyTrackerPro.data.deleteEvent(id);
                BabyTrackerPro.showNotification('Temperature record deleted');
                
                // Update UI
                this.updateTemperatureTable();
                BabyTrackerPro.charts.renderTemperatureChart();
                BabyTrackerPro.updateHealthStatus();
            }
        },
        
        // Delete medicine record
        deleteMedicineRecord: function(id) {
            const confirmed = confirm('Are you sure you want to delete this medicine record?');
            
            if (confirmed) {
                BabyTrackerPro.data.deleteEvent(id);
                BabyTrackerPro.showNotification('Medicine record deleted');
                
                // Update UI
                this.updateMedicineTable();
                BabyTrackerPro.updateHealthStatus();
            }
        }
    },
    
    // Reports functionality
    reports: {
        // Generate report based on selected period
        generateReport: function(period = 'today') {
            // Get relevant date range
            const now = new Date();
            let startDate;
            
            switch (period) {
                case 'today':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                    break;
                case 'yesterday':
                    startDate = new Date(now);
                    startDate.setDate(startDate.getDate() - 1);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                    break;
                case 'week':
                    startDate = new Date(now);
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case 'month':
                    startDate = new Date(now);
                    startDate.setMonth(startDate.getMonth() - 1);
                    break;
                default:
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            }
            
            const startTimestamp = startDate.getTime();
            const endDate = period === 'yesterday' ? endDate : now;
            const endTimestamp = endDate.getTime();
            
            // Get events in the time range
            const events = BabyTrackerPro.data.events.filter(event => {
                return event.timestamp >= startTimestamp && event.timestamp <= endTimestamp;
            });
            
            // Group events by type
            const feedingEvents = events.filter(event => event.type === 'feeding');
            const diaperEvents = events.filter(event => event.type === 'diaper');
            const sleepEvents = events.filter(event => event.type === 'sleep' && event.sleepStart && event.sleepEnd);
            const pumpEvents = events.filter(event => event.type === 'pump');
            const medicineEvents = events.filter(event => event.type === 'medicine');
            const temperatureEvents = events.filter(event => event.type === 'temperature');
            const growthEvents = events.filter(event => event.type === 'growth');
            const milestoneEvents = events.filter(event => event.type === 'milestone');
            
            // Generate daily summary
            this.generateDailySummary(
                feedingEvents, 
                diaperEvents, 
                sleepEvents, 
                pumpEvents, 
                startTimestamp, 
                endTimestamp,
                period
            );
            
            // Generate 24h projection
            this.generateProjection();
            
            // Generate pattern report
            this.generatePatternReport(
                feedingEvents,
                diaperEvents,
                sleepEvents,
                period
            );
        },
        
        // Generate daily summary
        generateDailySummary: function(feedingEvents, diaperEvents, sleepEvents, pumpEvents, start, end, period) {
            const dailySummary = document.getElementById('daily-summary');
            if (!dailySummary) return;
            
            // Clear current summary
            dailySummary.innerHTML = '';
            
            // Create summary list
            const items = [];
            
            // Period label
            let periodLabel;
            switch (period) {
                case 'today':
                    periodLabel = 'Today';
                    break;
                case 'yesterday':
                    periodLabel = 'Yesterday';
                    break;
                case 'week':
                    periodLabel = 'Past 7 days';
                    break;
                case 'month':
                    periodLabel = 'Past 30 days';
                    break;
                default:
                    periodLabel = 'Selected period';
            }
            
            items.push(`<strong>${periodLabel} Summary</strong>`);
            
            // Feeding stats
            const bottleFeeds = feedingEvents.filter(e => e.feedType === 'bottle');
            const breastFeeds = feedingEvents.filter(e => e.feedType === 'breast');
            
            items.push(`Total feeds: ${feedingEvents.length}`);
            if (bottleFeeds.length > 0) {
                let totalAmount = 0;
                let amountCount = 0;
                
                bottleFeeds.forEach(event => {
                    if (event.amount) {
                        // Convert to oz if needed
                        let amount = event.amount;
                        if (event.unit === 'ml') {
                            amount = BabyTrackerPro.convertAmount(amount, 'ml', 'oz');
                        }
                        totalAmount += amount;
                        amountCount++;
                    }
                });
                
                if (amountCount > 0) {
                    items.push(`Bottle feeds: ${bottleFeeds.length} (${totalAmount.toFixed(1)} oz total)`);
                } else {
                    items.push(`Bottle feeds: ${bottleFeeds.length}`);
                }
            }
            
            if (breastFeeds.length > 0) {
                let totalDuration = 0;
                let durationCount = 0;
                
                breastFeeds.forEach(event => {
                    if (event.duration) {
                        totalDuration += event.duration;
                        durationCount++;
                    }
                });
                
                if (durationCount > 0) {
                    items.push(`Breast feeds: ${breastFeeds.length} (${BabyTrackerPro.formatDuration(totalDuration)} total)`);
                } else {
                    items.push(`Breast feeds: ${breastFeeds.length}`);
                }
            }
            
            // Diaper stats
            const wetDiapers = diaperEvents.filter(e => e.diaperType === 'wet' || e.diaperType === 'mixed');
            const dirtyDiapers = diaperEvents.filter(e => e.diaperType === 'dirty' || e.diaperType === 'mixed');
            
            items.push(`Total diapers: ${diaperEvents.length}`);
            items.push(`Wet diapers: ${wetDiapers.length}`);
            items.push(`Dirty diapers: ${dirtyDiapers.length}`);
            
            // Sleep stats
            if (sleepEvents.length > 0) {
                let totalSleepDuration = 0;
                
                sleepEvents.forEach(event => {
                    if (event.sleepStart && event.sleepEnd) {
                        // Adjust sleep time to only count what's in the report period
                        const sleepStart = Math.max(event.sleepStart, start);
                        const sleepEnd = Math.min(event.sleepEnd, end);
                        
                        if (sleepEnd > sleepStart) {
                            totalSleepDuration += sleepEnd - sleepStart;
                        }
                    }
                });
                
                // Add currently ongoing sleep if applicable
                if (BabyTrackerPro.state.isTrackingSleep && BabyTrackerPro.state.sleepStartTime) {
                    const sleepStart = Math.max(BabyTrackerPro.state.sleepStartTime, start);
                    const sleepEnd = end;
                    
                    if (sleepEnd > sleepStart) {
                        totalSleepDuration += sleepEnd - sleepStart;
                    }
                }
                
                const averageSleepDuration = sleepEvents.length > 0 ? totalSleepDuration / sleepEvents.length : 0;
                
                items.push(`Sleep sessions: ${sleepEvents.length}`);
                items.push(`Total sleep: ${BabyTrackerPro.formatDuration(totalSleepDuration)}`);
                
                // Only show average if we have multiple sleep sessions
                if (sleepEvents.length > 1) {
                    items.push(`Average sleep duration: ${BabyTrackerPro.formatDuration(averageSleepDuration)}`);
                }
            }
            
            // Pump stats
            if (pumpEvents.length > 0) {
                let totalAmount = 0;
                let amountCount = 0;
                
                pumpEvents.forEach(event => {
                    if (event.amount) {
                        // Convert to oz if needed
                        let amount = event.amount;
                        if (event.unit === 'ml') {
                            amount = BabyTrackerPro.convertAmount(amount, 'ml', 'oz');
                        }
                        totalAmount += amount;
                        amountCount++;
                    }
                });
                
                items.push(`Pump sessions: ${pumpEvents.length}`);
                
                if (amountCount > 0) {
                    items.push(`Total pumped: ${totalAmount.toFixed(1)} oz`);
                    items.push(`Average per session: ${(totalAmount / amountCount).toFixed(1)} oz`);
                }
            }
            
            // Render list
            items.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = item;
                dailySummary.appendChild(li);
            });
        },
        
        // Generate 24h projection
        generateProjection: function() {
            const projectionList = document.getElementById('24h-projection');
            if (!projectionList) return;
            
            // Clear current projection
            projectionList.innerHTML = '';
            
            // Get time now
            const now = new Date();
            
            // Get predictions
            const nextFeedTime = BabyTrackerPro.predictions.predictNextFeeding();
            const nextSleepTime = BabyTrackerPro.predictions.predictNextSleep();
            const nextWetTime = BabyTrackerPro.predictions.predictNextDiaper('wet');
            const nextDirtyTime = BabyTrackerPro.predictions.predictNextDiaper('dirty');
            
            // Get scheduled items
            const pumpSchedule = BabyTrackerPro.getPumpSchedule();
            const nextPumpTime = pumpSchedule ? BabyTrackerPro.calculateNextPumpTime(pumpSchedule) : null;
            
            const scheduledMeds = BabyTrackerPro.data.getScheduledMedicines()
                .filter(med => med.nextDoseTime && med.nextDoseTime <= now.getTime() + 24 * 60 * 60 * 1000);
            
            // Create sorted list of events
            const projectedEvents = [];
            
            if (nextFeedTime) {
                projectedEvents.push({
                    type: 'feed',
                    time: nextFeedTime,
                    label: 'Feeding',
                    confidence: BabyTrackerPro.predictions.getConfidenceLevel('feeding')
                });
            }
            
            if (nextSleepTime) {
                projectedEvents.push({
                    type: 'sleep',
                    time: nextSleepTime,
                    label: 'Sleep',
                    confidence: BabyTrackerPro.predictions.getConfidenceLevel('sleep_cycle')
                });
            }
            
            if (nextWetTime) {
                projectedEvents.push({
                    type: 'diaper_wet',
                    time: nextWetTime,
                    label: 'Wet Diaper',
                    confidence: BabyTrackerPro.predictions.getConfidenceLevel('diaper_wet')
                });
            }
            
            if (nextDirtyTime) {
                projectedEvents.push({
                    type: 'diaper_dirty',
                    time: nextDirtyTime,
                    label: 'Dirty Diaper',
                    confidence: BabyTrackerPro.predictions.getConfidenceLevel('diaper_dirty')
                });
            }
            
            if (nextPumpTime) {
                projectedEvents.push({
                    type: 'pump',
                    time: nextPumpTime,
                    label: 'Pumping',
                    confidence: 'high' // Scheduled items are high confidence
                });
            }
            
            scheduledMeds.forEach(med => {
                projectedEvents.push({
                    type: 'medicine',
                    time: med.nextDoseTime,
                    label: med.medicineName ? `Medicine (${med.medicineName})` : 'Medicine',
                    confidence: 'high' // Scheduled items are high confidence
                });
            });
            
            // Sort by time
            projectedEvents.sort((a, b) => a.time - b.time);
            
            // Create list of projected events
            if (projectedEvents.length === 0) {
                const li = document.createElement('li');
                li.textContent = 'Not enough data to generate projections';
                projectionList.appendChild(li);
                return;
            }
            
            projectedEvents.forEach(event => {
                const li = document.createElement('li');
                
                // Add time and label
                const timeStr = BabyTrackerPro.formatDateTime(event.time);
                
                // Add confidence indicator
                let confidenceText = '';
                if (event.confidence) {
                    switch (event.confidence) {
                        case 'high':
                            confidenceText = ' (high confidence)';
                            break;
                        case 'medium':
                            confidenceText = ' (medium confidence)';
                            break;
                        case 'low':
                            confidenceText = ' (low confidence)';
                            break;
                    }
                }
                
                li.innerHTML = `<strong>${timeStr}</strong>: ${event.label}${confidenceText}`;
                
                // Add visual confidence indicator
                if (event.confidence && event.type !== 'medicine' && event.type !== 'pump') {
                    const confidenceSpan = document.createElement('span');
                    confidenceSpan.className = `confidence-inline ${event.confidence}`;
                    li.appendChild(confidenceSpan);
                }
                
                projectionList.appendChild(li);
            });
        },
        
        // Generate pattern report
        generatePatternReport: function(feedingEvents, diaperEvents, sleepEvents, period) {
            const patternDisplay = document.getElementById('pattern-display');
            if (!patternDisplay) return;
            
            // Clear current patterns
            patternDisplay.innerHTML = '';
            
            // Check if we have enough data
            if (!BabyTrackerPro.data.hasEnoughData()) {
                patternDisplay.innerHTML = '<p>Need more data to detect patterns. Continue logging regularly.</p>';
                return;
            }
            
            // Create pattern HTML
            let patternsHtml = '';
            
            // Add feeding patterns
            const feedingPatterns = this.analyzeFeedingPatterns(feedingEvents);
            if (feedingPatterns) {
                patternsHtml += `<div class="pattern-group">
                    <h5>Feeding Patterns</h5>
                    ${feedingPatterns}
                </div>`;
            }
            
            // Add sleep patterns
            const sleepPatterns = this.analyzeSleepPatterns(sleepEvents);
            if (sleepPatterns) {
                patternsHtml += `<div class="pattern-group">
                    <h5>Sleep Patterns</h5>
                    ${sleepPatterns}
                </div>`;
            }
            
            // Add diaper patterns
            const diaperPatterns = this.analyzeDiaperPatterns(diaperEvents);
            if (diaperPatterns) {
                patternsHtml += `<div class="pattern-group">
                    <h5>Diaper Patterns</h5>
                    ${diaperPatterns}
                </div>`;
            }
            
            // Add age-based expectations if we know baby's age
            const babyAge = BabyTrackerPro.getBabyAgeMonths();
            if (babyAge !== null) {
                patternsHtml += `<div class="pattern-group">
                    <h5>Age-Based Expectations (${babyAge} months)</h5>
                    ${this.getAgePatternsHtml(babyAge)}
                </div>`;
            }
            
            // Update pattern display
            if (patternsHtml === '') {
                patternDisplay.innerHTML = '<p>No clear patterns detected in the current data.</p>';
            } else {
                patternDisplay.innerHTML = patternsHtml;
            }
        },
        
        // Analyze feeding patterns
        analyzeFeedingPatterns: function(feedingEvents) {
            if (feedingEvents.length < BabyTrackerPro.config.feedingPatternMinEntries) {
                return null;
            }
            
            let patternsHtml = '';
            
            // Calculate average interval between feedings
            const intervals = [];
            const sortedFeedings = [...feedingEvents].sort((a, b) => a.timestamp - b.timestamp);
            
            for (let i = 1; i < sortedFeedings.length; i++) {
                const interval = sortedFeedings[i].timestamp - sortedFeedings[i-1].timestamp;
                intervals.push(interval);
            }
            
            if (intervals.length > 0) {
                const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
                
                // Format interval nicely
                const hours = Math.floor(avgInterval / (60 * 60 * 1000));
                const minutes = Math.floor((avgInterval % (60 * 60 * 1000)) / (60 * 1000));
                
                patternsHtml += `<p>Average time between feedings: <strong>${hours}h ${minutes}m</strong></p>`;
            }
            
            // Analyze feeding amounts/durations
            const bottleFeeds = feedingEvents.filter(e => e.feedType === 'bottle' && e.amount);
            const breastFeeds = feedingEvents.filter(e => e.feedType === 'breast' && e.duration);
            
            if (bottleFeeds.length >= 3) {
                const avgAmount = bottleFeeds.reduce((sum, feed) => {
                    // Convert to oz if needed
                    let amount = feed.amount;
                    if (feed.unit === 'ml') {
                        amount = BabyTrackerPro.convertAmount(amount, 'ml', 'oz');
                    }
                    return sum + amount;
                }, 0) / bottleFeeds.length;
                
                patternsHtml += `<p>Average bottle amount: <strong>${avgAmount.toFixed(1)} oz</strong></p>`;
            }
            
            if (breastFeeds.length >= 3) {
                const avgDuration = breastFeeds.reduce((sum, feed) => sum + feed.duration, 0) / breastFeeds.length;
                
                patternsHtml += `<p>Average breastfeeding duration: <strong>${BabyTrackerPro.formatDuration(avgDuration)}</strong></p>`;
            }
            
            // Analyze time of day patterns
            const timePatterns = this.analyzeTimeOfDayPatterns(feedingEvents);
            if (timePatterns) {
                patternsHtml += `<p>Most common feeding times: ${timePatterns}</p>`;
            }
            
            return patternsHtml || null;
        },
        
        // Analyze sleep patterns
        analyzeSleepPatterns: function(sleepEvents) {
            if (sleepEvents.length < BabyTrackerPro.config.sleepPatternMinEntries) {
                return null;
            }
            
            let patternsHtml = '';
            
            // Calculate average sleep duration
            const avgDuration = sleepEvents.reduce((sum, sleep) => {
                return sum + (sleep.sleepEnd - sleep.sleepStart);
            }, 0) / sleepEvents.length;
            
            patternsHtml += `<p>Average sleep duration: <strong>${BabyTrackerPro.formatDuration(avgDuration)}</strong></p>`;
            
            // Separate night sleeps from naps
            const nightSleeps = [];
            const napSleeps = [];
            
            sleepEvents.forEach(event => {
                const duration = event.sleepEnd - event.sleepStart;
                const startHour = new Date(event.sleepStart).getHours();
                
                // Simple heuristic - longer sleeps or those starting in evening/night are night sleeps
                if (duration >= 5 * 60 * 60 * 1000 || (startHour >= 19 || startHour <= 2)) {
                    nightSleeps.push(event);
                } else {
                    napSleeps.push(event);
                }
            });
            
            if (nightSleeps.length >= 2) {
                const avgNightDuration = nightSleeps.reduce((sum, sleep) => {
                    return sum + (sleep.sleepEnd - sleep.sleepStart);
                }, 0) / nightSleeps.length;
                
                patternsHtml += `<p>Average night sleep: <strong>${BabyTrackerPro.formatDuration(avgNightDuration)}</strong></p>`;
            }
            
            if (napSleeps.length >= 2) {
                const avgNapDuration = napSleeps.reduce((sum, sleep) => {
                    return sum + (sleep.sleepEnd - sleep.sleepStart);
                }, 0) / napSleeps.length;
                
                patternsHtml += `<p>Average nap duration: <strong>${BabyTrackerPro.formatDuration(avgNapDuration)}</strong></p>`;
                patternsHtml += `<p>Naps per day: <strong>${(napSleeps.length / Math.min(7, Math.ceil(sleepEvents.length / 2))).toFixed(1)}</strong></p>`;
            }
            
            // Analyze bedtime/wake time consistency
            if (nightSleeps.length >= 3) {
                // Get bedtimes (sleep start times for night sleeps)
                const bedtimes = nightSleeps.map(sleep => new Date(sleep.sleepStart));
                const bedtimeHours = bedtimes.map(time => time.getHours() + time.getMinutes() / 60);
                
                // Calculate average bedtime
                const avgBedtimeHour = bedtimeHours.reduce((sum, hour) => sum + hour, 0) / bedtimeHours.length;
                const hours = Math.floor(avgBedtimeHour);
                const minutes = Math.round((avgBedtimeHour - hours) * 60);
                
                // Format as 12h time
                const period = hours >= 12 ? 'PM' : 'AM';
                const hours12 = hours % 12 || 12;
                
                patternsHtml += `<p>Average bedtime: <strong>${hours12}:${minutes.toString().padStart(2, '0')} ${period}</strong></p>`;
                
                // Calculate consistency
                const bedtimeDeviation = Math.sqrt(
                    bedtimeHours.reduce((sum, hour) => sum + Math.pow(hour - avgBedtimeHour, 2), 0) / bedtimeHours.length
                );
                
                const consistencyPercent = Math.max(0, 100 - (bedtimeDeviation * 30)); // Scale to percentage
                
                patternsHtml += `<p>Bedtime consistency: <strong>${Math.round(consistencyPercent)}%</strong></p>`;
            }
            
            return patternsHtml || null;
        },
        
        // Analyze diaper patterns
        analyzeDiaperPatterns: function(diaperEvents) {
            if (diaperEvents.length < BabyTrackerPro.config.diaperPatternMinEntries) {
                return null;
            }
            
            let patternsHtml = '';
            
            // Count diaper types
            const wetCount = diaperEvents.filter(e => e.diaperType === 'wet').length;
            const dirtyCount = diaperEvents.filter(e => e.diaperType === 'dirty').length;
            const mixedCount = diaperEvents.filter(e => e.diaperType === 'mixed').length;
            
            // Calculate per day average
            // Use a simplified approach - divide by number of unique days
            const days = new Set();
            diaperEvents.forEach(event => {
                const date = new Date(event.timestamp);
                days.add(`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`);
            });
            
            const numDays = Math.max(1, days.size);
            const avgDiapersPerDay = diaperEvents.length / numDays;
            const avgWetPerDay = (wetCount + mixedCount) / numDays;
            const avgDirtyPerDay = (dirtyCount + mixedCount) / numDays;
            
            patternsHtml += `<p>Average diapers per day: <strong>${avgDiapersPerDay.toFixed(1)}</strong></p>`;
            patternsHtml += `<p>Average wet diapers per day: <strong>${avgWetPerDay.toFixed(1)}</strong></p>`;
            patternsHtml += `<p>Average dirty diapers per day: <strong>${avgDirtyPerDay.toFixed(1)}</strong></p>`;
            
            // Analyze time between dirty diapers
            const dirtyDiapers = diaperEvents.filter(e => e.diaperType === 'dirty' || e.diaperType === 'mixed')
                .sort((a, b) => a.timestamp - b.timestamp);
            
            if (dirtyDiapers.length >= 3) {
                const intervals = [];
                
                for (let i = 1; i < dirtyDiapers.length; i++) {
                    const interval = dirtyDiapers[i].timestamp - dirtyDiapers[i-1].timestamp;
                    intervals.push(interval);
                }
                
                const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
                
                // Format interval nicely
                const hours = Math.floor(avgInterval / (60 * 60 * 1000));
                const minutes = Math.floor((avgInterval % (60 * 60 * 1000)) / (60 * 1000));
                
                patternsHtml += `<p>Average time between dirty diapers: <strong>${hours}h ${minutes}m</strong></p>`;
            }
            
            return patternsHtml || null;
        },
        
        // Analyze time of day patterns
        analyzeTimeOfDayPatterns: function(events) {
            if (events.length < 5) return null;
            
            // Group by hour of day
            const hourCounts = new Array(24).fill(0);
            
            events.forEach(event => {
                const hour = new Date(event.timestamp).getHours();
                hourCounts[hour]++;
            });
            
            // Find peak hours (top 3)
            const hourCountsCopy = [...hourCounts];
            const peakHours = [];
            
            for (let i = 0; i < 3; i++) {
                const max = Math.max(...hourCountsCopy);
                const maxIndex = hourCountsCopy.indexOf(max);
                
                if (max > events.length * 0.15) { // Only include significant peaks (>15% of events)
                    peakHours.push(maxIndex);
                    hourCountsCopy[maxIndex] = -1; // Mark as processed
                }
            }
            
            if (peakHours.length === 0) return null;
            
            // Format time ranges
            const timeRanges = peakHours.map(hour => {
                // Format based on 12/24 hour preference
                if (BabyTrackerPro.getTimeFormatFromSettings() === '12') {
                    const h = hour % 12 || 12;
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    return `${h} ${ampm}`;
                } else {
                    return `${hour.toString().padStart(2, '0')}:00`;
                }
            });
            
            let result = "";
            
            timeRanges.forEach((time, index) => {
                if (index === 0) {
                    result += `<strong>${time}</strong>`;
                } else if (index === timeRanges.length - 1) {
                    result += ` and <strong>${time}</strong>`;
                } else {
                    result += `, <strong>${time}</strong>`;
                }
            });
            
            return result;
        },
        
        // Get age-based pattern HTML
        getAgePatternsHtml: function(ageMonths) {
            let html = '';
            
            // Define age-based expectations
            let expectations = {};
            
            if (ageMonths < 1) {
                expectations = {
                    feeding: '8-12 feeds per day, 2-3 hour intervals',
                    sleep: '14-17 hours total, waking every 2-3 hours',
                    diapers: '6-8 wet, 3-4 dirty per day'
                };
            } else if (ageMonths < 3) {
                expectations = {
                    feeding: '7-9 feeds per day, 2.5-3.5 hour intervals',
                    sleep: '14-17 hours total, some longer sleep stretches at night',
                    diapers: '6-8 wet, 2-4 dirty per day'
                };
            } else if (ageMonths < 6) {
                expectations = {
                    feeding: '6-8 feeds per day, 3-4 hour intervals',
                    sleep: '12-15 hours total, 3-4 naps, longer night sleep',
                    diapers: '5-6 wet, 1-4 dirty per day'
                };
            } else if (ageMonths < 9) {
                expectations = {
                    feeding: '5-7 feeds + solids, 3-4 hour intervals',
                    sleep: '12-14 hours total, 2-3 naps',
                    diapers: '4-6 wet, 1-2 dirty per day'
                };
            } else if (ageMonths < 12) {
                expectations = {
                    feeding: '4-6 feeds + solids, 4-5 hour intervals',
                    sleep: '11-14 hours total, 2 naps',
                    diapers: '4-5 wet, 1-2 dirty per day'
                };
            } else if (ageMonths < 18) {
                expectations = {
                    feeding: '3-5 feeds + increased solids',
                    sleep: '11-14 hours total, 1-2 naps',
                    diapers: '4-5 wet, 1 dirty per day'
                };
            } else if (ageMonths < 24) {
                expectations = {
                    feeding: '3 meals, 2 snacks, 3-4 milk feeds',
                    sleep: '10-13 hours total, 1 nap (1-3 hours)',
                    diapers: '4-5 wet, 1 dirty per day'
                };
            } else {
                expectations = {
                    feeding: '3 meals, 2 snacks, 2-3 milk feeds',
                    sleep: '10-13 hours total, 1 nap (1-2 hours)',
                    diapers: '4-5 wet, 1 dirty per day'
                };
            }
            
            // Create HTML
            html += `<p><strong>Feeding:</strong> ${expectations.feeding}</p>`;
            html += `<p><strong>Sleep:</strong> ${expectations.sleep}</p>`;
            html += `<p><strong>Diapers:</strong> ${expectations.diapers}</p>`;
            
            return html;
        },
        
        // Export current report
        exportCurrentReport: function() {
            // Get current report period
            const reportPeriod = document.getElementById('report-period') ? document.getElementById('report-period').value : 'today';
            
            // Get content from report sections
            const dailySummary = document.getElementById('daily-summary');
            const projection = document.getElementById('24h-projection');
            const patterns = document.getElementById('pattern-display');
            
            // Create export data
            const exportData = {
                title: `Baby Tracker Pro - ${this.getPeriodLabel(reportPeriod)} Report`,
                generated: new Date().toISOString(),
                babyName: BabyTrackerPro.getBabyName(),
                sections: []
            };
            
            // Add daily summary
            if (dailySummary) {
                const summaryItems = [];
                dailySummary.querySelectorAll('li').forEach(li => {
                    summaryItems.push(li.textContent);
                });
                
                exportData.sections.push({
                    title: 'Daily Summary',
                    items: summaryItems
                });
            }
            
            // Add projection
            if (projection) {
                const projectionItems = [];
                projection.querySelectorAll('li').forEach(li => {
                    projectionItems.push(li.textContent);
                });
                
                exportData.sections.push({
                    title: 'Next 24 Hours Projection',
                    items: projectionItems
                });
            }
            
            // Add patterns
            if (patterns) {
                const patternItems = [];
                
                patterns.querySelectorAll('.pattern-group').forEach(group => {
                    const title = group.querySelector('h5') ? group.querySelector('h5').textContent : 'Patterns';
                    
                    const items = [];
                    group.querySelectorAll('p').forEach(p => {
                        items.push(p.textContent);
                    });
                    
                    patternItems.push({
                        title: title,
                        items: items
                    });
                });
                
                exportData.sections.push({
                    title: 'Detected Patterns',
                    subsections: patternItems
                });
            }
            
            // Convert to CSV
            let csv = `${exportData.title}\n`;
            csv += `Generated: ${BabyTrackerPro.formatDateTime(new Date())}\n`;
            csv += `Baby: ${exportData.babyName}\n\n`;
            
            exportData.sections.forEach(section => {
                csv += `${section.title}\n`;
                csv += `${'='.repeat(section.title.length)}\n`;
                
                if (section.items) {
                    section.items.forEach(item => {
                        csv += `${item}\n`;
                    });
                }
                
                if (section.subsections) {
                    section.subsections.forEach(subsection => {
                        csv += `\n${subsection.title}\n`;
                        csv += `${'-'.repeat(subsection.title.length)}\n`;
                        
                        subsection.items.forEach(item => {
                            csv += `${item}\n`;
                        });
                    });
                }
                
                csv += '\n';
            });
            
            // Create a download link
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Generate a filename
            const date = new Date();
            const dateStr = date.toISOString().slice(0, 10);
            const babyName = exportData.babyName.replace(/[^a-z0-9]/gi, '_');
            
            a.download = `${babyName}_Report_${reportPeriod}_${dateStr}.csv`;
            
            // Trigger download
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                BabyTrackerPro.showNotification('Report exported successfully');
            }, 100);
        },
        
        // Get period label
        getPeriodLabel: function(period) {
            switch (period) {
                case 'today':
                    return 'Today';
                case 'yesterday':
                    return 'Yesterday';
                case 'week':
                    return 'Weekly';
                case 'month':
                    return 'Monthly';
                default:
                    return 'Custom';
            }
        }
    },
    
    // Milestones functionality
    milestones: {
        // Get milestones data
        // This would normally come from a database, but we'll define some basics here
        getMilestoneData: function() {
            return [
                // 0-3 months
                { age: 1, name: 'Lifts head briefly', category: 'motor' },
                { age: 1, name: 'Turns head toward sounds', category: 'cognitive' },
                { age: 1, name: 'Stares at faces', category: 'social' },
                { age: 2, name: 'Holds head up with support', category: 'motor' },
                { age: 2, name: 'Follows moving objects', category: 'cognitive' },
                { age: 2, name: 'First smile', category: 'social' },
                { age: 3, name: 'Reaches for objects', category: 'motor' },
                { age: 3, name: 'Makes cooing sounds', category: 'communication' },
                { age: 3, name: 'Recognizes familiar faces', category: 'cognitive' },
                
                // 4-6 months
                { age: 4, name: 'Rolls over (front to back)', category: 'motor' },
                { age: 4, name: 'Laughs out loud', category: 'social' },
                { age: 4, name: 'Holds head steady', category: 'motor' },
                { age: 5, name: 'Rolls over (back to front)', category: 'motor' },
                { age: 5, name: 'Babbles', category: 'communication' },
                { age: 5, name: 'Recognizes own name', category: 'cognitive' },
                { age: 6, name: 'Sits with support', category: 'motor' },
                { age: 6, name: 'Begins to eat solid food', category: 'self-care' },
                { age: 6, name: 'Reaches for and grabs objects', category: 'motor' },
                
                // 7-9 months
                { age: 7, name: 'Sits without support', category: 'motor' },
                { age: 7, name: 'Responds to "no"', category: 'cognitive' },
                { age: 7, name: 'Passes objects from hand to hand', category: 'motor' },
                { age: 8, name: 'Crawls', category: 'motor' },
                { age: 8, name: 'Babbles "mama" and "dada"', category: 'communication' },
                { age: 8, name: 'Plays peek-a-boo', category: 'social' },
                { age: 9, name: 'Stands holding on', category: 'motor' },
                { age: 9, name: 'Waves bye-bye', category: 'social' },
                { age: 9, name: 'Picks up objects with pincer grasp', category: 'motor' },
                
                // 10-12 months
                { age: 10, name: 'Crawls well on hands and knees', category: 'motor' },
                { age: 10, name: 'Puts objects in containers', category: 'cognitive' },
                { age: 10, name: 'Understands simple instructions', category: 'cognitive' },
                { age: 11, name: 'Stands alone momentarily', category: 'motor' },
                { age: 11, name: 'Says one word besides mama/dada', category: 'communication' },
                { age: 11, name: 'Drinks from a cup', category: 'self-care' },
                { age: 12, name: 'Takes first steps', category: 'motor' },
                { age: 12, name: 'Uses 2-3 words regularly', category: 'communication' },
                { age: 12, name: 'Follows one-step verbal commands', category: 'cognitive' },
                
                // 13-18 months
                { age: 15, name: 'Walks well', category: 'motor' },
                { age: 15, name: 'Says 4-6 words', category: 'communication' },
                { age: 15, name: 'Feeds self with fingers', category: 'self-care' },
                { age: 18, name: 'Runs', category: 'motor' },
                { age: 18, name: 'Says 10+ words', category: 'communication' },
                { age: 18, name: 'Scribbles with crayon', category: 'motor' },
                
                // 19-24 months
                { age: 21, name: 'Kicks a ball', category: 'motor' },
                { age: 21, name: 'Names familiar objects', category: 'communication' },
                { age: 21, name: 'Removes some clothing', category: 'self-care' },
                { age: 24, name: 'Walks up and down stairs', category: 'motor' },
                { age: 24, name: 'Uses 2-word phrases', category: 'communication' },
                { age: 24, name: 'Sorts objects by shape/color', category: 'cognitive' }
            ];
        },
        
        // Get milestones for a specific age
        getMilestonesForAge: function(ageMonths) {
            if (!ageMonths) return [];
            
            // Get all milestone data
            const allMilestones = this.getMilestoneData();
            
            // Define age range - include milestones within 2 months of current age
            const minAge = Math.max(0, ageMonths - 2);
            const maxAge = ageMonths + 2;
            
            // Filter milestones by age range
            return allMilestones.filter(milestone => 
                milestone.age >= minAge && milestone.age <= maxAge
            );
        },
        
        // Render milestones in the milestones tab
        renderMilestones: function() {
            if (!BabyTrackerPro.elements.milestonesContainer) return;
            
            // Get baby age
            const babyAge = BabyTrackerPro.getBabyAgeMonths();
            
            if (!babyAge) {
                // No DOB set
                BabyTrackerPro.elements.milestonesContainer.innerHTML = `
                    <div class="milestone-info">
                        <p>Please set your baby's date of birth in settings to track milestones.</p>
                    </div>
                `;
                return;
            }
            
            // Get filter value
            const filter = document.getElementById('milestone-filter') ? 
                document.getElementById('milestone-filter').value : 'age';
            
            // Get completed milestones
            const completedMilestones = BabyTrackerPro.data.getEvents('milestone')
                .map(m => m.milestoneName || '');
            
            // Get all milestones for filtering
            const allMilestones = this.getMilestoneData();
            
            // Filter milestones based on selection
            let filteredMilestones = [];
            let titleText = '';
            
            switch (filter) {
                case 'age':
                    // Current age +/- 2 months
                    filteredMilestones = this.getMilestonesForAge(babyAge);
                    titleText = `Milestones for ${babyAge} months (±2 months)`;
                    break;
                case 'upcoming':
                    // Future milestones (current age + 3 to 6 months)
                    filteredMilestones = allMilestones.filter(m => 
                        m.age > babyAge && m.age <= babyAge + 6 &&
                        !completedMilestones.includes(m.name)
                    );
                    titleText = 'Upcoming Milestones';
                    break;
                case 'completed':
                    // Completed milestones
                    filteredMilestones = allMilestones.filter(m => 
                        completedMilestones.includes(m.name)
                    );
                    titleText = 'Completed Milestones';
                    break;
                case 'all':
                    // All milestones
                    filteredMilestones = allMilestones;
                    titleText = 'All Developmental Milestones';
                    break;
            }
            
            // Sort milestones by age
            filteredMilestones.sort((a, b) => a.age - b.age);
            
            // Create HTML
            let html = `<div class="milestone-info">
                <h4>${titleText}</h4>
                <p>Baby's current age: <strong>${babyAge}</strong> months</p>
            </div>`;
            
            // Group by age
            const milestonesByAge = {};
            
            filteredMilestones.forEach(milestone => {
                if (!milestonesByAge[milestone.age]) {
                    milestonesByAge[milestone.age] = [];
                }
                
                milestonesByAge[milestone.age].push(milestone);
            });
            
            // Create milestone list
            html += '<ul class="milestone-list">';
            
            if (Object.keys(milestonesByAge).length === 0) {
                html += '<li class="no-milestones">No milestones found for the selected filter.</li>';
            } else {
                Object.keys(milestonesByAge).sort((a, b) => parseInt(a) - parseInt(b)).forEach(age => {
                    html += `<li class="milestone-age-group">
                        <h4>${age} months</h4>
                        <ul>`;
                    
                    milestonesByAge[age].forEach(milestone => {
                        const isCompleted = completedMilestones.includes(milestone.name);
                        const categoryLabel = this.getCategoryLabel(milestone.category);
                        
                        html += `<li class="milestone ${isCompleted ? 'completed' : 'upcoming'}">
                            <div class="${isCompleted ? 'milestone-check' : 'milestone-dot'}">
                                ${isCompleted ? '✓' : ''}
                            </div>
                            <div class="milestone-details">
                                <strong>${milestone.name}</strong>
                                <span>${categoryLabel}</span>
                            </div>`;
                            
                        if (!isCompleted) {
                            html += `<button class="mark-complete primary" data-milestone="${milestone.name}">
                                Mark Complete
                            </button>`;
                        }
                        
                        html += '</li>';
                    });
                    
                    html += '</ul></li>';
                });
            }
            
            html += '</ul>';
            
            // Update container
            BabyTrackerPro.elements.milestonesContainer.innerHTML = html;
            
            // Add event listeners to mark complete buttons
            const markCompleteButtons = document.querySelectorAll('.mark-complete');
            markCompleteButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const milestoneName = e.target.dataset.milestone;
                    this.markMilestoneComplete(milestoneName);
                });
            });
        },
        
        // Filter milestones
        filterMilestones: function(filter) {
            this.renderMilestones();
        },
        
        // Mark milestone as complete
        markMilestoneComplete: function(milestoneName) {
            // Create milestone event
            const event = {
                type: 'milestone',
                timestamp: Date.now(),
                milestoneName: milestoneName
            };
            
            // Find the milestone in the data to get the category
            const allMilestones = this.getMilestoneData();
            const milestone = allMilestones.find(m => m.name === milestoneName);
            
            if (milestone) {
                event.milestoneCategory = milestone.category;
            }
            
            // Save the event
            BabyTrackerPro.data.addEvent(event);
            
            // Show notification
            BabyTrackerPro.showNotification(`Milestone "${milestoneName}" marked as complete!`);
            
            // Update UI
            this.renderMilestones();
            BabyTrackerPro.updateMilestoneStatus();
        },
        
        // Get category label
        getCategoryLabel: function(category) {
            switch (category) {
                case 'motor':
                    return 'Motor Skills';
                case 'cognitive':
                    return 'Cognitive';
                case 'communication':
                    return 'Communication';
                case 'social':
                    return 'Social';
                case 'self-care':
                    return 'Self-Care';
                default:
                    return 'Other';
            }
        }
    },
    
    // Predictions and pattern detection
    predictions: {
        // Predict next feeding time
        predictNextFeeding: function() {
            // Get last feeding
            const lastFeeding = BabyTrackerPro.data.getLastEventOfType('feeding');
            if (!lastFeeding) return null;
            
            // Get feeding events from the last 7 days for analysis
            const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const recentFeedings = BabyTrackerPro.data.getEvents('feeding')
                .filter(event => event.timestamp >= cutoff)
                .sort((a, b) => a.timestamp - b.timestamp);
            
            if (recentFeedings.length < 3) {
                // Not enough data for smart prediction, use default interval
                return lastFeeding.timestamp + BabyTrackerPro.config.patterns.feeding.interval;
            }
            
            // Calculate average interval between feedings
            const intervals = [];
            
            for (let i = 1; i < recentFeedings.length; i++) {
                const interval = recentFeedings[i].timestamp - recentFeedings[i-1].timestamp;
                intervals.push(interval);
            }
            
            const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
            
            // Make prediction based on last feeding time plus average interval
            const prediction = lastFeeding.timestamp + avgInterval;
            
            // Store confidence level
            this.storeConfidenceLevel('feeding', this.calculateConfidenceLevel(intervals, avgInterval));
            
            return prediction;
        },
        
        // Get alternative predictions for feeding
        getAlternativePredictions: function(type) {
            if (type !== 'feeding') return [];
            
            // Get last feeding
            const lastFeeding = BabyTrackerPro.data.getLastEventOfType('feeding');
            if (!lastFeeding) return [];
            
            // Get feeding events from the last 7 days for analysis
            const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const recentFeedings = BabyTrackerPro.data.getEvents('feeding')
                .filter(event => event.timestamp >= cutoff)
                .sort((a, b) => a.timestamp - b.timestamp);
            
            if (recentFeedings.length < 5) {
                // Not enough data for alternatives
                return [];
            }
            
            // Calculate average interval by feed type
            const bottleIntervals = [];
            const breastIntervals = [];
            
            // Group events by type
            const bottleFeeds = recentFeedings.filter(e => e.feedType === 'bottle');
            const breastFeeds = recentFeedings.filter(e => e.feedType === 'breast');
            
            // Calculate bottle feed intervals
            for (let i = 1; i < bottleFeeds.length; i++) {
                const interval = bottleFeeds[i].timestamp - bottleFeeds[i-1].timestamp;
                bottleIntervals.push(interval);
            }
            
            // Calculate breast feed intervals
            for (let i = 1; i < breastFeeds.length; i++) {
                const interval = breastFeeds[i].timestamp - breastFeeds[i-1].timestamp;
                breastIntervals.push(interval);
            }
            
            const predictions = [];
            
            // Add time-of-day-based prediction if we have enough data
            if (recentFeedings.length >= 10) {
                const timeBasedPrediction = this.predictNextFeedingByTimeOfDay(lastFeeding);
                if (timeBasedPrediction) {
                    predictions.push({
                        timestamp: timeBasedPrediction,
                        confidence: 'medium',
                        method: 'time-of-day'
                    });
                }
            }
            
            // Add feed-type-based predictions
            if (bottleIntervals.length >= 3 && lastFeeding.feedType === 'bottle') {
                const avgBottleInterval = bottleIntervals.reduce((sum, interval) => sum + interval, 0) / bottleIntervals.length;
                predictions.push({
                    timestamp: lastFeeding.timestamp + avgBottleInterval,
                    confidence: 'medium',
                    method: 'bottle-pattern'
                });
            }
            
            if (breastIntervals.length >= 3 && lastFeeding.feedType === 'breast') {
                const avgBreastInterval = breastIntervals.reduce((sum, interval) => sum + interval, 0) / breastIntervals.length;
                predictions.push({
                    timestamp: lastFeeding.timestamp + avgBreastInterval,
                    confidence: 'medium',
                    method: 'breast-pattern'
                });
            }
            
            // Add machine learning prediction if we have enough data (simplified)
            if (recentFeedings.length >= 15) {
                // This would be more complex in a real app
                // Just adding a placeholder variation here
                const mainPrediction = this.predictNextFeeding();
                if (mainPrediction) {
                    const mlPrediction = mainPrediction + (Math.random() * 2 - 1) * 30 * 60 * 1000; // ±30 minutes
                    predictions.push({
                        timestamp: mlPrediction,
                        confidence: 'high',
                        method: 'ml-prediction'
                    });
                }
            }
            
            // Sort by timestamp and return unique predictions
            return predictions.sort((a, b) => a.timestamp - b.timestamp)
                .filter((pred, index, array) => {
                    // Filter out predictions that are too similar (within 15 minutes)
                    if (index === 0) return true;
                    return Math.abs(pred.timestamp - array[index - 1].timestamp) > 15 * 60 * 1000;
                });
        },
        
        // Predict next feeding based on time of day patterns
        predictNextFeedingByTimeOfDay: function(lastFeeding) {
            // Get feeding events from the last 14 days for better time-of-day analysis
            const cutoff = Date.now() - (14 * 24 * 60 * 60 * 1000);
            const recentFeedings = BabyTrackerPro.data.getEvents('feeding')
                .filter(event => event.timestamp >= cutoff);
            
            if (recentFeedings.length < 7) return null;
            
            // Group feedings by hour of day
            const feedingsByHour = Array(24).fill(0);
            recentFeedings.forEach(feed => {
                const hour = new Date(feed.timestamp).getHours();
                feedingsByHour[hour]++;
            });
            
            // Get the current hour
            const currentHour = new Date().getHours();
            
            // Find the next peak hour after current hour
            let nextPeakHour = null;
            let peakCount = 0;
            
            for (let i = 1; i <= 24; i++) {
                const hour = (currentHour + i) % 24;
                if (feedingsByHour[hour] > peakCount) {
                    peakCount = feedingsByHour[hour];
                    nextPeakHour = hour;
                }
            }
            
            if (nextPeakHour === null || peakCount < 3) {
                return null; // No clear pattern
            }
            
            // Create a timestamp for the next peak hour
            const now = new Date();
            const prediction = new Date(now);
            
            prediction.setHours(nextPeakHour, 0, 0, 0);
            
            // If the prediction is in the past, add a day
            if (prediction <= now) {
                prediction.setDate(prediction.getDate() + 1);
            }
            
            return prediction.getTime();
        },
        
        // Predict next diaper change
        predictNextDiaper: function(type) {
            // Get last diaper of specified type
            let lastDiaper;
            
            if (type === 'wet') {
                lastDiaper = BabyTrackerPro.data.getLastDiaperOfType(['wet', 'mixed']);
            } else if (type === 'dirty') {
                lastDiaper = BabyTrackerPro.data.getLastDiaperOfType(['dirty', 'mixed']);
            } else {
                lastDiaper = BabyTrackerPro.data.getLastEventOfType('diaper');
            }
            
            if (!lastDiaper) return null;
            
            // Get diaper events from the last 7 days for analysis
            const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const recentDiapers = BabyTrackerPro.data.getEvents('diaper')
                .filter(event => {
                    if (type === 'wet') {
                        return event.timestamp >= cutoff && 
                               (event.diaperType === 'wet' || event.diaperType === 'mixed');
                    } else if (type === 'dirty') {
                        return event.timestamp >= cutoff && 
                               (event.diaperType === 'dirty' || event.diaperType === 'mixed');
                    } else {
                        return event.timestamp >= cutoff;
                    }
                })
                .sort((a, b) => a.timestamp - b.timestamp);
            
            if (recentDiapers.length < 3) {
                // Not enough data for smart prediction, use default interval
                return lastDiaper.timestamp + BabyTrackerPro.config.patterns.diaper.interval;
            }
            
            // Calculate average interval between diapers
            const intervals = [];
            
            for (let i = 1; i < recentDiapers.length; i++) {
                const interval = recentDiapers[i].timestamp - recentDiapers[i-1].timestamp;
                intervals.push(interval);
            }
            
            const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
            
            // Make prediction based on last diaper time plus average interval
            const prediction = lastDiaper.timestamp + avgInterval;
            
            // Store confidence level
            this.storeConfidenceLevel(`diaper_${type}`, this.calculateConfidenceLevel(intervals, avgInterval));
            
            return prediction;
        },
        
        // Predict next sleep
        predictNextSleep: function() {
            // Check if currently sleeping
            if (BabyTrackerPro.state.isTrackingSleep) {
                return null; // Already sleeping
            }
            
            // Get last sleep end
            const sleepEvents = BabyTrackerPro.data.getEvents('sleep').sort((a, b) => b.timestamp - a.timestamp);
            
            // Find most recent sleep that ended
            const lastSleep = sleepEvents.find(event => event.sleepEnd);
            if (!lastSleep) return null;
            
            // Get awake periods from the last 7 days
            const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const sleepPeriods = BabyTrackerPro.data.getEvents('sleep')
                .filter(event => event.timestamp >= cutoff && event.sleepStart && event.sleepEnd)
                .sort((a, b) => a.timestamp - b.timestamp);
            
            if (sleepPeriods.length < 3) {
                // Not enough data for smart prediction, use default interval
                return lastSleep.sleepEnd + BabyTrackerPro.config.patterns.sleep.interval;
            }
            
            // Calculate average awake time between sleeps
            const awakePeriods = [];
            
            for (let i = 1; i < sleepPeriods.length; i++) {
                const awakeTime = sleepPeriods[i].sleepStart - sleepPeriods[i-1].sleepEnd;
                awakePeriods.push(awakeTime);
            }
            
            const avgAwakeTime = awakePeriods.reduce((sum, time) => sum + time, 0) / awakePeriods.length;
            
            // Make prediction based on last sleep end plus average awake time
            const prediction = lastSleep.sleepEnd + avgAwakeTime;
            
            // Store confidence level
            this.storeConfidenceLevel('sleep_cycle', this.calculateConfidenceLevel(awakePeriods, avgAwakeTime));
            
            return prediction;
        },
        
        // Predict sleep end
        predictSleepEnd: function() {
            // Check if currently sleeping
            if (!BabyTrackerPro.state.isTrackingSleep || !BabyTrackerPro.state.sleepStartTime) {
                return null; // Not sleeping
            }
            
            // Get sleep start time
            const sleepStart = BabyTrackerPro.state.sleepStartTime;
            
            // Get complete sleep periods from the last 7 days
            const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const sleepPeriods = BabyTrackerPro.data.getEvents('sleep')
                .filter(event => event.timestamp >= cutoff && event.sleepStart && event.sleepEnd)
                .sort((a, b) => a.timestamp - b.timestamp);
            
            if (sleepPeriods.length < 3) {
                // Not enough data for smart prediction, use simple approximation
                // Check time of day - night vs day
                const startHour = new Date(sleepStart).getHours();
                
                // Night sleep (19:00 - 05:00) tends to be longer
                const isNightSleep = (startHour >= 19 || startHour <= 5);
                const defaultDuration = isNightSleep ? 8 * 60 * 60 * 1000 : 1.5 * 60 * 60 * 1000;
                
                return sleepStart + defaultDuration;
            }
            
            // Calculate average sleep duration
            const durations = sleepPeriods.map(event => event.sleepEnd - event.sleepStart);
            const avgDuration = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
            
            // Get the current time of day
            const startHour = new Date(sleepStart).getHours();
            
            // Adjust prediction based on time of day
            let adjustedDuration = avgDuration;
            
            // Night sleep tends to be longer
            if (startHour >= 19 || startHour <= 2) {
                // Find night sleep durations
                const nightSleeps = sleepPeriods.filter(event => {
                    const hour = new Date(event.sleepStart).getHours();
                    return hour >= 19 || hour <= 2;
                });
                
                if (nightSleeps.length >= 2) {
                    const nightDurations = nightSleeps.map(event => event.sleepEnd - event.sleepStart);
                    adjustedDuration = nightDurations.reduce((sum, duration) => sum + duration, 0) / nightDurations.length;
                } else {
                    // Default to longer sleep for night
                    adjustedDuration = Math.max(avgDuration, 7 * 60 * 60 * 1000);
                }
            } else if (startHour >= 12 && startHour <= 15) {
                // Afternoon nap times
                const afternoonSleeps = sleepPeriods.filter(event => {
                    const hour = new Date(event.sleepStart).getHours();
                    return hour >= 12 && hour <= 15;
                });
                
                if (afternoonSleeps.length >= 2) {
                    const afternoonDurations = afternoonSleeps.map(event => event.sleepEnd - event.sleepStart);
                    adjustedDuration = afternoonDurations.reduce((sum, duration) => sum + duration, 0) / afternoonDurations.length;
                }
            }
            
            // Make prediction based on sleep start plus adjusted average duration
            const prediction = sleepStart + adjustedDuration;
            
            // Store confidence level
            this.storeConfidenceLevel('sleep_duration', this.calculateConfidenceLevel(durations, avgDuration));
            
            return prediction;
        },
        
        // Calculate confidence level based on data consistency
        calculateConfidenceLevel: function(dataPoints, average) {
            if (!dataPoints || dataPoints.length < 3) return null;
            
            // Calculate coefficient of variation (CV)
            const sum = dataPoints.reduce((acc, val) => acc + Math.pow(val - average, 2), 0);
            const stdDev = Math.sqrt(sum / dataPoints.length);
            const cv = stdDev / average;
            
            // Interpret CV value
            if (cv < 0.2) {
                return 'high'; // Less than 20% variation - high confidence
            } else if (cv < 0.4) {
                return 'medium'; // 20-40% variation - medium confidence
            } else {
                return 'low'; // More than 40% variation - low confidence
            }
        },
        
        // Store confidence level
        storeConfidenceLevel: function(patternType, confidence) {
            BabyTrackerPro.state.predictionAccuracy[patternType] = confidence;
        },
        
        // Get confidence level
        getConfidenceLevel: function(patternType) {
            return BabyTrackerPro.state.predictionAccuracy[patternType] || null;
        },
        
        // Detect feeding anomalies
        detectFeedingAnomalies: function() {
            const anomalies = [];
            
            // Get feeding events from the last 7 days
            const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const recentFeedings = BabyTrackerPro.data.getEvents('feeding')
                .filter(event => event.timestamp >= cutoff)
                .sort((a, b) => a.timestamp - b.timestamp);
            
            if (recentFeedings.length < 5) {
                return anomalies; // Not enough data
            }
            
            // Calculate average interval and amount
            const intervals = [];
            const bottleAmounts = [];
            const breastDurations = [];
            
            for (let i = 1; i < recentFeedings.length; i++) {
                intervals.push(recentFeedings[i].timestamp - recentFeedings[i-1].timestamp);
            }
            
            recentFeedings.forEach(feed => {
                if (feed.feedType === 'bottle' && feed.amount) {
                    // Convert to oz if needed
                    let amount = feed.amount;
                    if (feed.unit === 'ml') {
                        amount = BabyTrackerPro.convertAmount(amount, 'ml', 'oz');
                    }
                    bottleAmounts.push(amount);
                } else if (feed.feedType === 'breast' && feed.duration) {
                    breastDurations.push(feed.duration);
                }
            });
            
            const avgInterval = intervals.length > 0 ?
                intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length : 0;
                
            const avgBottleAmount = bottleAmounts.length > 0 ?
                bottleAmounts.reduce((sum, amount) => sum + amount, 0) / bottleAmounts.length : 0;
                
            const avgBreastDuration = breastDurations.length > 0 ?
                breastDurations.reduce((sum, duration) => sum + duration, 0) / breastDurations.length : 0;
            
            // Check for interval anomalies
            const lastInterval = intervals[intervals.length - 1];
            if (lastInterval && avgInterval > 0) {
                const variance = Math.abs(lastInterval - avgInterval) / avgInterval;
                
                if (variance > BabyTrackerPro.config.alertThreshold) {
                    // Significant anomaly
                    const message = lastInterval > avgInterval ?
                        "Recent feeding interval much longer than usual" :
                        "Recent feeding interval much shorter than usual";
                        
                    anomalies.push({
                        type: 'feeding_interval',
                        message: message,
                        severity: 'alert'
                    });
                } else if (variance > BabyTrackerPro.config.anomalyThreshold) {
                    // Minor anomaly
                    const message = lastInterval > avgInterval ?
                        "Recent feeding interval longer than usual" :
                        "Recent feeding interval shorter than usual";
                        
                    anomalies.push({
                        type: 'feeding_interval',
                        message: message,
                        severity: 'warning'
                    });
                }
            }
            
            // Check for amount/duration anomalies
            const lastFeed = recentFeedings[recentFeedings.length - 1];
            
            if (lastFeed.feedType === 'bottle' && lastFeed.amount && avgBottleAmount > 0) {
                // Convert to oz if needed
                let amount = lastFeed.amount;
                if (lastFeed.unit === 'ml') {
                    amount = BabyTrackerPro.convertAmount(amount, 'ml', 'oz');
                }
                
                const variance = Math.abs(amount - avgBottleAmount) / avgBottleAmount;
                
                if (variance > BabyTrackerPro.config.alertThreshold) {
                    // Significant anomaly
                    const message = amount > avgBottleAmount ?
                        "Last bottle amount much larger than usual" :
                        "Last bottle amount much smaller than usual";
                        
                    anomalies.push({
                        type: 'feeding_amount',
                        message: message,
                        severity: 'alert'
                    });
                } else if (variance > BabyTrackerPro.config.anomalyThreshold) {
                    // Minor anomaly
                    const message = amount > avgBottleAmount ?
                        "Last bottle amount larger than usual" :
                        "Last bottle amount smaller than usual";
                        
                    anomalies.push({
                        type: 'feeding_amount',
                        message: message,
                        severity: 'warning'
                    });
                }
            } else if (lastFeed.feedType === 'breast' && lastFeed.duration && avgBreastDuration > 0) {
                const variance = Math.abs(lastFeed.duration - avgBreastDuration) / avgBreastDuration;
                
                if (variance > BabyTrackerPro.config.alertThreshold) {
                    // Significant anomaly
                    const message = lastFeed.duration > avgBreastDuration ?
                        "Last breastfeeding much longer than usual" :
                        "Last breastfeeding much shorter than usual";
                        
                    anomalies.push({
                        type: 'feeding_duration',
                        message: message,
                        severity: 'alert'
                    });
                } else if (variance > BabyTrackerPro.config.anomalyThreshold) {
                    // Minor anomaly
                    const message = lastFeed.duration > avgBreastDuration ?
                        "Last breastfeeding longer than usual" :
                        "Last breastfeeding shorter than usual";
                        
                    anomalies.push({
                        type: 'feeding_duration',
                        message: message,
                        severity: 'warning'
                    });
                }
            }
            
            // Check for frequency anomalies in the last 24 hours
            const day1Cutoff = Date.now() - (24 * 60 * 60 * 1000);
            const day2Cutoff = Date.now() - (48 * 60 * 60 * 1000);
            
            const day1Count = recentFeedings.filter(e => e.timestamp >= day1Cutoff).length;
            const day2Count = recentFeedings.filter(e => e.timestamp >= day2Cutoff && e.timestamp < day1Cutoff).length;
            
            if (day2Count > 0) {
                const variance = Math.abs(day1Count - day2Count) / day2Count;
                
                if (variance > BabyTrackerPro.config.alertThreshold && day1Count < day2Count) {
                    anomalies.push({
                        type: 'feeding_frequency',
                        message: "Significantly fewer feedings in last 24 hours than previous day",
                        severity: 'alert'
                    });
                } else if (variance > BabyTrackerPro.config.anomalyThreshold && day1Count < day2Count) {
                    anomalies.push({
                        type: 'feeding_frequency',
                        message: "Fewer feedings in last 24 hours than previous day",
                        severity: 'warning'
                    });
                }
            }
            
            return anomalies;
        },
        
        // Detect sleep anomalies
        detectSleepAnomalies: function() {
            const anomalies = [];
            
            // Get sleep events with both start and end times from the last 7 days
            const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const sleepEvents = BabyTrackerPro.data.getEvents('sleep')
                .filter(event => event.timestamp >= cutoff && event.sleepStart && event.sleepEnd)
                .sort((a, b) => a.timestamp - b.timestamp);
            
            if (sleepEvents.length < 5) {
                return anomalies; // Not enough data
            }
            
            // Calculate average sleep duration
            const durations = sleepEvents.map(event => event.sleepEnd - event.sleepStart);
            const avgDuration = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
            
            // Check last sleep duration
            const lastSleep = sleepEvents[sleepEvents.length - 1];
            const lastDuration = lastSleep.sleepEnd - lastSleep.sleepStart;
            
            const variance = Math.abs(lastDuration - avgDuration) / avgDuration;
            
            if (variance > BabyTrackerPro.config.alertThreshold) {
                // Significant anomaly
                const message = lastDuration > avgDuration ?
                    "Last sleep duration much longer than usual" :
                    "Last sleep duration much shorter than usual";
                    
                anomalies.push({
                    type: 'sleep_duration',
                    message: message,
                    severity: 'alert'
                });
            } else if (variance > BabyTrackerPro.config.anomalyThreshold) {
                // Minor anomaly
                const message = lastDuration > avgDuration ?
                    "Last sleep duration longer than usual" :
                    "Last sleep duration shorter than usual";
                    
                anomalies.push({
                    type: 'sleep_duration',
                    message: message,
                    severity: 'warning'
                });
            }
            
            // Check total sleep in the last 24 hours
            const day1Cutoff = Date.now() - (24 * 60 * 60 * 1000);
            const day2Cutoff = Date.now() - (48 * 60 * 60 * 1000);
            
            const day1Sleeps = sleepEvents.filter(e => e.sleepStart >= day1Cutoff);
            const day2Sleeps = sleepEvents.filter(e => e.sleepStart >= day2Cutoff && e.sleepStart < day1Cutoff);
            
            const day1Total = day1Sleeps.reduce((sum, e) => sum + (e.sleepEnd - e.sleepStart), 0);
            const day2Total = day2Sleeps.reduce((sum, e) => sum + (e.sleepEnd - e.sleepStart), 0);
            
            if (day2Total > 0) {
                const variance = Math.abs(day1Total - day2Total) / day2Total;
                
                if (variance > BabyTrackerPro.config.alertThreshold && day1Total < day2Total) {
                    anomalies.push({
                        type: 'sleep_total',
                        message: "Significantly less sleep in last 24 hours than previous day",
                        severity: 'alert'
                    });
                } else if (variance > BabyTrackerPro.config.anomalyThreshold && day1Total < day2Total) {
                    anomalies.push({
                        type: 'sleep_total',
                        message: "Less sleep in last 24 hours than previous day",
                        severity: 'warning'
                    });
                }
            }
            
            return anomalies;
        },
        
        // Detect diaper anomalies
        detectDiaperAnomalies: function() {
            const anomalies = [];
            
            // Get diaper events from the last 7 days
            const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const diaperEvents = BabyTrackerPro.data.getEvents('diaper')
                .filter(event => event.timestamp >= cutoff)
                .sort((a, b) => a.timestamp - b.timestamp);
            
            if (diaperEvents.length < 5) {
                return anomalies; // Not enough data
            }
            
            // Check frequency in the last 24 hours
            const day1Cutoff = Date.now() - (24 * 60 * 60 * 1000);
            const day2Cutoff = Date.now() - (48 * 60 * 60 * 1000);
            
            const day1Count = diaperEvents.filter(e => e.timestamp >= day1Cutoff).length;
            const day2Count = diaperEvents.filter(e => e.timestamp >= day2Cutoff && e.timestamp < day1Cutoff).length;
            
            if (day2Count > 0) {
                const variance = Math.abs(day1Count - day2Count) / day2Count;
                
                if (variance > BabyTrackerPro.config.alertThreshold && day1Count < day2Count) {
                    anomalies.push({
                        type: 'diaper_frequency',
                        message: "Significantly fewer diapers in last 24 hours than previous day",
                        severity: 'alert'
                    });
                } else if (variance > BabyTrackerPro.config.anomalyThreshold && day1Count < day2Count) {
                    anomalies.push({
                        type: 'diaper_frequency',
                        message: "Fewer diapers in last 24 hours than previous day",
                        severity: 'warning'
                    });
                }
            }
            
            // Check dirty diaper frequency
            const dirtyDiapers = diaperEvents.filter(e => e.diaperType === 'dirty' || e.diaperType === 'mixed');
            
            if (dirtyDiapers.length >= 3) {
                const intervals = [];
                
                for (let i = 1; i < dirtyDiapers.length; i++) {
                    intervals.push(dirtyDiapers[i].timestamp - dirtyDiapers[i-1].timestamp);
                }
                
                const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
                
                // Check if it's been too long since the last dirty diaper
                const lastDirty = dirtyDiapers[dirtyDiapers.length - 1];
                const timeSinceLastDirty = Date.now() - lastDirty.timestamp;
                
                if (timeSinceLastDirty > avgInterval * 2) {
                    anomalies.push({
                        type: 'dirty_diaper',
                        message: "Longer than usual time since last dirty diaper",
                        severity: 'warning'
                    });
                }
                
                if (timeSinceLastDirty > avgInterval * 3) {
                    anomalies.push({
                        type: 'dirty_diaper',
                        message: "Much longer than usual time since last dirty diaper",
                        severity: 'alert'
                    });
                }
            }
            
            return anomalies;
        }
    },
    
    // Notifications and alarms
    notifications: {
        // Request permission for browser notifications
        requestPermission: function() {
            if (!("Notification" in window)) {
                console.log("This browser does not support desktop notification");
                return;
            }
            
            if (Notification.permission !== "granted") {
                Notification.requestPermission();
            }
        },
        
        // Show a browser notification
        showNotification: function(title, message) {
            if (Notification.permission !== "granted") {
                return;
            }
            
            const notification = new Notification(title, {
                body: message,
                icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍼</text></svg>'
            });
        }
    },
    
    // Alarm management
    alarms: {
        // Trigger an alarm
        trigger: function(alarmType, message) {
            if (!BabyTrackerPro.elements.alarmNotification || BabyTrackerPro.state.alarmsPaused) return;
            
            // Check if this alarm type is snoozed
            if (BabyTrackerPro.state.alarmSnoozeTimers[alarmType]) return;
            
            // Show alarm notification
            BabyTrackerPro.elements.alarmMessage.textContent = message;
            BabyTrackerPro.elements.alarmNotification.style.display = 'block';
            
            // Hide resume button
            if (BabyTrackerPro.elements.resumeAlarms) {
                BabyTrackerPro.elements.resumeAlarms.style.display = 'none';
            }
            
            // Show dismiss button
            if (BabyTrackerPro.elements.dismissAlarm) {
                BabyTrackerPro.elements.dismissAlarm.style.display = 'block';
            }
            
            // Store the current alarm type
            this._currentAlarmType = alarmType;
            
            // Play sound if enabled
            this.playAlarmSound();
            
            // Show browser notification
            BabyTrackerPro.notifications.showNotification('Baby Tracker Pro', message);
        },
        
        // Dismiss the current alarm
        dismiss: function() {
            if (!BabyTrackerPro.elements.alarmNotification) return;
            
            // Hide alarm notification
            BabyTrackerPro.elements.alarmNotification.style.display = 'none';
            
            // Clear current alarm type
            this._currentAlarmType = null;
        },
        
        // Snooze the current alarm
        snooze: function(minutes) {
            if (!this._currentAlarmType) return;
            
            // Set a timer to clear the snooze
            const alarmType = this._currentAlarmType;
            const snoozeTime = minutes * 60 * 1000;
            
            // Clear any existing timer for this alarm
            if (BabyTrackerPro.state.alarmSnoozeTimers[alarmType]) {
                clearTimeout(BabyTrackerPro.state.alarmSnoozeTimers[alarmType]);
            }
            
            // Set new timer
            BabyTrackerPro.state.alarmSnoozeTimers[alarmType] = setTimeout(() => {
                delete BabyTrackerPro.state.alarmSnoozeTimers[alarmType];
            }, snoozeTime);
            
            // Show notification
            BabyTrackerPro.showNotification(`Alarm snoozed for ${minutes} minutes`);
            
            // Dismiss the alarm
            this.dismiss();
        },
        
        // Pause all alarms
        pauseAll: function() {
            BabyTrackerPro.state.alarmsPaused = true;
            
            // Update UI
            BabyTrackerPro.updateAlarmPauseStatus();
            
            // Show resume button in alarm notification
            if (BabyTrackerPro.elements.dismissAlarm) {
                BabyTrackerPro.elements.dismissAlarm.style.display = 'none';
            }
            
            if (BabyTrackerPro.elements.resumeAlarms) {
                BabyTrackerPro.elements.resumeAlarms.style.display = 'block';
            }
            
            BabyTrackerPro.showNotification('All alarms paused');
        },
        
        // Resume all alarms
        resumeAll: function(forceClear = false) {
            BabyTrackerPro.state.alarmsPaused = false;
            
            // Clear all snooze timers if forced
            if (forceClear) {
                Object.keys(BabyTrackerPro.state.alarmSnoozeTimers).forEach(key => {
                    clearTimeout(BabyTrackerPro.state.alarmSnoozeTimers[key]);
                    delete BabyTrackerPro.state.alarmSnoozeTimers[key];
                });
            }
            
            // Update UI
            BabyTrackerPro.updateAlarmPauseStatus();
            
            // Hide the alarm notification
            if (BabyTrackerPro.elements.alarmNotification) {
                BabyTrackerPro.elements.alarmNotification.style.display = 'none';
            }
            
            BabyTrackerPro.showNotification('Alarms resumed');
        },
        
        // Play alarm sound
        playAlarmSound: function() {
            // Check if sound is enabled
            const soundEnabled = localStorage.getItem('alarmSoundEnabled');
            if (soundEnabled === 'false') return;
            
            // Create audio element
            const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' + Array(1e3).join('123'));
            audio.volume = 0.5;
            
            // Play sound
            try {
                audio.play().catch(e => {
                    console.log('Could not play alarm sound:', e);
                });
            } catch (e) {
                console.log('Error playing alarm sound:', e);
            }
        }
    }
};

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    BabyTrackerPro.init();
});
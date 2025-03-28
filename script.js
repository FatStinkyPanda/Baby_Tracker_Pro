/**
 * Baby Tracker Pro - Enhanced script.js
 * 
 * Features advanced prediction algorithms, comprehensive tracking,
 * intelligent notifications, pattern detection, and improved data management.
 * 
 * Version: 2.0.0
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- Application Constants ---
    const APP_NAME = 'Baby Tracker Pro';
    const APP_VERSION = '2.0.0';
    const STORAGE_KEYS = {
        EVENTS: 'babyTrackerEvents_v2',
        SLEEP_STATE: 'babyTrackerSleepState_v2',
        PUMP_SCHEDULE: 'babyTrackerPumpSchedule_v2',
        SNOOZE_STATE: 'babyTrackerSnoozeState_v2',
        ALARMS_PAUSED: 'babyTrackerAlarmsPaused_v2',
        SETTINGS: 'babyTrackerSettings_v2',
        GROWTH_DATA: 'babyTrackerGrowthData_v1',
        MILESTONE_DATA: 'babyTrackerMilestoneData_v1',
        MEDICINE_SCHEDULE: 'babyTrackerMedicineSchedule_v1',
        TEMPERATURE_DATA: 'babyTrackerTemperatureData_v1',
        BACKUP_SCHEDULE: 'babyTrackerBackupSchedule_v1'
    };
    const ALARM_CHECK_INTERVAL = 30 * 1000;       // Check alarms every 30 seconds
    const DASHBOARD_UPDATE_INTERVAL = 60 * 1000;  // Update dashboard every minute
    const PREDICTION_MIN_EVENTS = 3;              // Min events needed for a basic prediction
    const PREDICTION_WINDOW = 10;                 // Number of recent events for moving average
    const ALARM_THRESHOLD_PERCENT = 0.95;         // Trigger alarm nearing predicted time
    const DEFAULT_ALARM_SOUND = 'alert.mp3';      // Path to alarm sound file
    const AUTO_BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // Auto backup every 24 hours
    const PATTERN_DETECTION_THRESHOLD = 0.7;      // Confidence threshold for pattern detection
    
    // WHO Growth Chart Reference Data (Percentiles)
    const GROWTH_REFERENCES = {
        weight: {
            male: {
                0: [2.5, 3.3, 4.4],    // [3rd, 50th, 97th] percentiles at birth
                1: [3.4, 4.5, 5.8],    // 1 month
                2: [4.3, 5.6, 7.1],    // 2 months
                // ... more data points would be added
            },
            female: {
                0: [2.4, 3.2, 4.2],    // [3rd, 50th, 97th] percentiles at birth
                1: [3.2, 4.2, 5.4],    // 1 month
                2: [4.0, 5.1, 6.6],    // 2 months
                // ... more data points would be added
            }
        },
        length: {
            // Similar structure for height/length
        },
        headCircumference: {
            // Similar structure for head circumference
        }
    };

    // Developmental Milestones by Age (months)
    const MILESTONES = {
        0: ["Lifts head briefly", "Focuses on faces", "Reacts to sounds"],
        1: ["Follows objects with eyes", "Makes smoother movements", "Holds head up briefly"],
        2: ["Smiles at people", "Begins to self-soothe", "Holds head steady"],
        3: ["Raises head and chest", "Opens and closes hands", "Recognizes familiar faces"],
        // ... more milestones by month
    };

    // --- State Variables ---
    let events = [];                     // Main data store for all events
    let isSleeping = false;              // Is the baby currently tracked as sleeping?
    let sleepStartTime = null;           // Timestamp when current sleep started
    let pumpSchedule = { intervalHours: null, startTime: null }; // User's pumping schedule
    let snoozeState = {};                // Stores { eventType: snoozeEndTime } timestamps
    let alarmsPaused = false;            // Global flag to pause all alarms
    let alarmTimeouts = {};              // Stores { eventType: timeoutID } for pending alarms
    let currentChart = null;             // Instance of the currently displayed Chart.js chart
    let patternData = null;              // Detected patterns in baby behavior
    let growthData = { weight: [], length: [], headCircumference: [] }; // Growth measurements
    let milestoneData = { completed: [], upcoming: [] }; // Tracked developmental milestones
    let medicineSchedule = [];           // Medicine schedule and tracking
    let temperatureData = [];            // Temperature measurements
    let lastBackupTime = null;           // When the last auto-backup occurred
    let settings = {                     // User preferences
        alarmSoundEnabled: true,
        theme: 'light',                  // 'light' or 'dark'
        temperatureUnit: 'f',            // 'f' or 'c'
        weightUnit: 'lb',                // 'lb' or 'kg'
        lengthUnit: 'in',                // 'in' or 'cm'
        timeFormat: '12',                // '12' or '24'
        dateFormat: 'M/D/YYYY',          // Various date formats
        autoBackupEnabled: true,         // Enable automatic backups
        autoBackupInterval: 24,          // In hours
        babyName: 'Baby',                // Baby's name
        babyDOB: null,                   // Baby's date of birth
        babyGender: null,                // For growth chart percentiles
        notifyMilestones: true,          // Notify on milestone ages
        voiceInputEnabled: false,        // Voice input capability
        advancedPredictions: true,       // Use machine learning predictions when available
        parentNames: { primary: '', secondary: '' }, // Parent names for reporting
        syncEnabled: false,              // Future cloud sync capability
    };
    let mainAlarmCheckTimeout = null;    // Timeout ID for the main periodic alarm check
    let speechRecognition = null;        // Speech recognition instance for voice input
    let backupTimeout = null;            // Timeout for scheduled backups
    
    // --- Advanced State ---
    let mlModels = {};                   // Machine learning model objects
    let learningData = {};               // Structured data for machine learning
    let anomalyDetection = {             // Track unusual patterns
        lastCheck: null,
        detectedAnomalies: []
    };
    let cachedStats = {                  // Performance optimization for intensive calculations
        lastUpdate: null,
        averageIntervals: {},
        trends: {},
        dailyTotals: {}
    };

    // --- DOM Element Cache ---
    const DOMElements = {
        currentTime: document.getElementById('current-time'),
        modal: document.getElementById('log-modal'),
        modalTitle: document.getElementById('modal-title'),
        logForm: document.getElementById('log-form'),
        closeModalButton: document.querySelector('#log-modal .close-button'),
        eventList: document.getElementById('event-list'),
        sleepToggleButton: document.getElementById('sleep-toggle-button'),
        chartCanvas: document.getElementById('main-chart'),
        chartTypeSelect: document.getElementById('chart-type'),
        tabs: document.querySelectorAll('.tab-link'),
        tabContents: document.querySelectorAll('.tab-content'),
        historyFilter: document.getElementById('history-filter'),
        historyLimit: document.getElementById('history-limit'),
        alarmNotification: document.getElementById('alarm-notification'),
        alarmMessage: document.getElementById('alarm-message'),
        dismissAlarmButton: document.getElementById('dismiss-alarm'),
        resumeAlarmsButton: document.getElementById('resume-alarms'),
        snoozeOptionsContainer: document.querySelector('#alarm-notification .snooze-options'),
        exportButton: document.getElementById('export-data'),
        importButtonLabel: document.querySelector('label[for="import-data-file"]'),
        importFileInput: document.getElementById('import-data-file'),
        clearDataButton: document.getElementById('clear-data'),
        alarmSoundCheckbox: document.getElementById('alarm-sound-enabled'),
        alarmPauseStatus: document.getElementById('alarm-pause-status'),
        forceResumeAlarmsButton: document.getElementById('force-resume-alarms'),
        pumpIntervalInput: document.getElementById('pump-interval'),
        pumpStartTimeInput: document.getElementById('pump-start-time'),
        savePumpScheduleButton: document.getElementById('save-pump-schedule'),
        currentPumpScheduleDisplay: document.getElementById('current-pump-schedule-display'),
        dailySummaryList: document.getElementById('daily-summary'),
        projectionList: document.getElementById('24h-projection'),
        dashboardContainer: document.querySelector('.dashboard'), // For quick actions delegation
        settingsContainer: document.getElementById('settings'), // For settings event delegation
    };

    // --- Utility Functions ---
    const formatTime = (date) => {
        if (!date) return 'N/A';
        const dateObj = new Date(date);
        const options = settings.timeFormat === '24' 
            ? { hour: '2-digit', minute: '2-digit', hour12: false }
            : { hour: 'numeric', minute: '2-digit', hour12: true };
        return dateObj.toLocaleTimeString([], options);
    };
    
    const formatDate = (date) => {
        if (!date) return 'N/A';
        const dateObj = new Date(date);
        // Handle different date format preferences
        switch(settings.dateFormat) {
            case 'M/D/YYYY':
                return dateObj.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' });
            case 'D/M/YYYY':
                return dateObj.toLocaleDateString([], { day: 'numeric', month: 'numeric', year: 'numeric' });
            case 'YYYY-MM-DD':
                return dateObj.toISOString().slice(0, 10);
            case 'MMM D, YYYY':
                return dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            default:
                return dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };
    
    const formatDateTime = (date) => date ? `${formatDate(date)}, ${formatTime(date)}` : 'N/A';
    
    const formatDuration = (ms, precise = false) => {
        if (ms === null || ms === undefined || ms < 0) return '';
        const totalSeconds = Math.floor(ms / 1000);
        const totalMinutes = Math.floor(totalSeconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const seconds = totalSeconds % 60;

        let durationStr = '';
        if (hours > 0) durationStr += `${hours}h `;
        if (minutes > 0 || hours > 0) durationStr += `${minutes}m`; // Show 0m if hours are present
        if (precise && seconds > 0 && hours === 0) durationStr += ` ${seconds}s`; // Only add seconds if precise and short duration

        return durationStr.trim() || (precise ? '0s' : '0m'); // Return '0m' or '0s' if duration is zero
    };
    
    const getTimestamp = (dateTimeStr) => dateTimeStr ? new Date(dateTimeStr).getTime() : Date.now();
    
    const getCurrentLocalDateTimeValue = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); // Adjust for local time zone for input default
        now.setSeconds(0, 0); // Zero out seconds/ms for cleaner default
        return now.toISOString().slice(0, 16);
    };
    
    const generateId = () => `_${Math.random().toString(36).substr(2, 9)}${Date.now().toString(36)}`;
    
    const logError = (message, error = '') => {
        console.error(`${APP_NAME} Error: ${message}`, error);
        // New: Add to error log for diagnostics
        try {
            const errorLog = JSON.parse(localStorage.getItem('babyTrackerErrorLog') || '[]');
            errorLog.push({
                timestamp: Date.now(),
                message,
                error: error?.toString() || '',
                stack: error?.stack || ''
            });
            // Keep only last 50 errors
            while(errorLog.length > 50) errorLog.shift();
            localStorage.setItem('babyTrackerErrorLog', JSON.stringify(errorLog));
        } catch(e) {
            console.error("Failed to log error to storage", e);
        }
    };
    
    const logInfo = (message) => {
        console.info(`${APP_NAME} Info: ${message}`);
    };
    
    const logWarning = (message) => {
        console.warn(`${APP_NAME} Warning: ${message}`);
    };
    
    const getBabyAge = () => {
        if (!settings.babyDOB) return null;
        
        const dob = new Date(settings.babyDOB);
        const now = new Date();
        
        // Calculate age in months (decimal)
        const ageMs = now - dob;
        const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.44); // Average month length
        
        // Calculate years, months, days
        let years = now.getFullYear() - dob.getFullYear();
        let months = now.getMonth() - dob.getMonth();
        if (months < 0) {
            years--;
            months += 12;
        }
        
        // Adjustment for day of month
        if (now.getDate() < dob.getDate()) {
            months--;
            // Add days from last month
            const lastMonth = new Date(now);
            lastMonth.setDate(0); // Go to last day of previous month
            const daysInLastMonth = lastMonth.getDate();
            const daysRemaining = daysInLastMonth - dob.getDate() + now.getDate();
            const days = daysRemaining;
            
            if (months < 0) {
                years--;
                months += 12;
            }
            
            return { years, months, days, totalMonths: parseFloat(ageMonths.toFixed(1)) };
        }
        
        const days = now.getDate() - dob.getDate();
        
        return { years, months, days, totalMonths: parseFloat(ageMonths.toFixed(1)) };
    };
    
    const formatWeight = (weight) => {
        if (weight === null || weight === undefined) return 'N/A';
        
        if (settings.weightUnit === 'kg') {
            // If stored in pounds, convert to kg
            const weightKg = settings.weightUnit === 'lb' ? weight * 0.453592 : weight;
            return `${weightKg.toFixed(2)} kg`;
        } else {
            // If stored in kg, convert to pounds
            const weightLb = settings.weightUnit === 'kg' ? weight * 2.20462 : weight;
            // Format as X lb Y oz
            const lb = Math.floor(weightLb);
            const oz = Math.round((weightLb - lb) * 16);
            return `${lb} lb ${oz} oz`;
        }
    };
    
    const formatLength = (length) => {
        if (length === null || length === undefined) return 'N/A';
        
        if (settings.lengthUnit === 'cm') {
            // If stored in inches, convert to cm
            const lengthCm = settings.lengthUnit === 'in' ? length * 2.54 : length;
            return `${lengthCm.toFixed(1)} cm`;
        } else {
            // If stored in cm, convert to inches
            const lengthIn = settings.lengthUnit === 'cm' ? length / 2.54 : length;
            return `${lengthIn.toFixed(1)} in`;
        }
    };
    
    const formatTemperature = (temp) => {
        if (temp === null || temp === undefined) return 'N/A';
        
        if (settings.temperatureUnit === 'c') {
            // If stored in F, convert to C
            const tempC = settings.temperatureUnit === 'f' ? (temp - 32) * 5/9 : temp;
            return `${tempC.toFixed(1)}°C`;
        } else {
            // If stored in C, convert to F
            const tempF = settings.temperatureUnit === 'c' ? temp * 9/5 + 32 : temp;
            return `${tempF.toFixed(1)}°F`;
        }
    };
    
    // Enhanced debounce function for optimizing expensive operations
    const debounce = (func, wait, immediate = false) => {
        let timeout;
        return function(...args) {
            const context = this;
            const later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };
    
    // Cache expensive calculations
    const memoize = (fn) => {
        const cache = new Map();
        return (...args) => {
            const key = JSON.stringify(args);
            if (cache.has(key)) return cache.get(key);
            const result = fn(...args);
            cache.set(key, result);
            return result;
        };
    };

    // --- Data Management ---
    const saveData = () => {
        try {
            localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
            localStorage.setItem(STORAGE_KEYS.SLEEP_STATE, JSON.stringify({ isSleeping, sleepStartTime }));
            localStorage.setItem(STORAGE_KEYS.PUMP_SCHEDULE, JSON.stringify(pumpSchedule));
            localStorage.setItem(STORAGE_KEYS.SNOOZE_STATE, JSON.stringify(snoozeState));
            localStorage.setItem(STORAGE_KEYS.ALARMS_PAUSED, JSON.stringify(alarmsPaused));
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
            
            // Save additional data collections
            localStorage.setItem(STORAGE_KEYS.GROWTH_DATA, JSON.stringify(growthData));
            localStorage.setItem(STORAGE_KEYS.MILESTONE_DATA, JSON.stringify(milestoneData));
            localStorage.setItem(STORAGE_KEYS.MEDICINE_SCHEDULE, JSON.stringify(medicineSchedule));
            localStorage.setItem(STORAGE_KEYS.TEMPERATURE_DATA, JSON.stringify(temperatureData));
            localStorage.setItem(STORAGE_KEYS.BACKUP_SCHEDULE, JSON.stringify({lastBackupTime}));
            
            // Reset the cache after data changes
            cachedStats.lastUpdate = null;
            
            // Schedule automatic backup if enabled
            if (settings.autoBackupEnabled) {
                scheduleAutoBackup();
            }
        } catch (error) {
            logError("Failed to save data to localStorage. Storage might be full.", error);
            alert("Error: Could not save data. Your browser's local storage might be full or unavailable.");
        }
    };

    const loadData = () => {
        try {
            // Load and parse all data from localStorage
            const storedEvents = localStorage.getItem(STORAGE_KEYS.EVENTS);
            const storedSleepState = localStorage.getItem(STORAGE_KEYS.SLEEP_STATE);
            const storedPumpSchedule = localStorage.getItem(STORAGE_KEYS.PUMP_SCHEDULE);
            const storedSnoozeState = localStorage.getItem(STORAGE_KEYS.SNOOZE_STATE);
            const storedAlarmsPaused = localStorage.getItem(STORAGE_KEYS.ALARMS_PAUSED);
            const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            const storedGrowthData = localStorage.getItem(STORAGE_KEYS.GROWTH_DATA);
            const storedMilestoneData = localStorage.getItem(STORAGE_KEYS.MILESTONE_DATA);
            const storedMedicineSchedule = localStorage.getItem(STORAGE_KEYS.MEDICINE_SCHEDULE);
            const storedTemperatureData = localStorage.getItem(STORAGE_KEYS.TEMPERATURE_DATA);
            const storedBackupSchedule = localStorage.getItem(STORAGE_KEYS.BACKUP_SCHEDULE);

            // Parse main event data
            events = storedEvents ? JSON.parse(storedEvents) : [];
            
            // Data migration and sanitation for backward compatibility
            events = migrateEvents(events);
            events.sort((a, b) => b.timestamp - a.timestamp); // Sort descending by time

            // Parse sleep state
            const sleepState = storedSleepState ? JSON.parse(storedSleepState) : { isSleeping: false, sleepStartTime: null };
            isSleeping = sleepState.isSleeping || false;
            sleepStartTime = sleepState.sleepStartTime ? Number(sleepState.sleepStartTime) : null;

            // Parse pump schedule
            pumpSchedule = storedPumpSchedule ? JSON.parse(storedPumpSchedule) : { intervalHours: null, startTime: null };

            // Parse snooze state and clean expired snoozes
            snoozeState = storedSnoozeState ? JSON.parse(storedSnoozeState) : {};
            Object.keys(snoozeState).forEach(key => {
                 if (snoozeState[key]) snoozeState[key] = Number(snoozeState[key]);
                 // Clean up expired snoozes on load
                 if (snoozeState[key] < Date.now()) delete snoozeState[key];
            });

            // Parse other state variables
            alarmsPaused = storedAlarmsPaused ? JSON.parse(storedAlarmsPaused) : false;
            settings = storedSettings ? { ...settings, ...JSON.parse(storedSettings) } : settings;
            
            // Parse additional data collections
            growthData = storedGrowthData ? JSON.parse(storedGrowthData) : { 
                weight: [], length: [], headCircumference: [] 
            };
            milestoneData = storedMilestoneData ? JSON.parse(storedMilestoneData) : { 
                completed: [], upcoming: [] 
            };
            medicineSchedule = storedMedicineSchedule ? JSON.parse(storedMedicineSchedule) : [];
            temperatureData = storedTemperatureData ? JSON.parse(storedTemperatureData) : [];
            
            // Parse backup schedule
            const backupData = storedBackupSchedule ? JSON.parse(storedBackupSchedule) : {lastBackupTime: null};
            lastBackupTime = backupData.lastBackupTime;

            logInfo("Data loaded successfully.");
            
            // Update available milestones based on baby's age
            updateAvailableMilestones();
            
            // Initialize or update learning data
            initializeLearningData();
            
            // Check for anomalies/patterns if enough data
            if (events.length > 30) {
                detectPatterns();
            }
        } catch (error) {
            logError("Failed to load data from localStorage. Data might be corrupted.", error);
            alert("Error: Could not load previous data. It might be corrupted. Starting fresh or try importing a backup.");
            
            // Reset to defaults in case of corrupted data
            events = [];
            isSleeping = false;
            sleepStartTime = null;
            pumpSchedule = { intervalHours: null, startTime: null };
            snoozeState = {};
            alarmsPaused = false;
            settings = { 
                alarmSoundEnabled: true,
                theme: 'light',
                timeFormat: '12',
                dateFormat: 'M/D/YYYY'
            };
            growthData = { weight: [], length: [], headCircumference: [] };
            milestoneData = { completed: [], upcoming: [] };
            medicineSchedule = [];
            temperatureData = [];
            lastBackupTime = null;
        } finally {
             // Always update UI after load attempt
             updateSettingsUI();
             updatePumpScheduleUI();
             updateAlarmPauseStatus();
             updateUI(); // Full UI refresh
             
             // Apply theme
             applyTheme();
        }
    };
    
    // Enhanced event migration with comprehensive data sanitization 
    const migrateEvents = (oldEvents) => {
        if (!Array.isArray(oldEvents)) return [];
        
        return oldEvents.map(event => {
            // Ensure all events have required properties
            if (!event.id) event.id = generateId();
            if (!event.type) {
                logWarning(`Event missing type, assigning "unknown": ${event.id}`);
                event.type = "unknown";
            }
            
            // Ensure numeric values for time fields
            event.timestamp = Number(event.timestamp) || Date.now();
            if (event.start) event.start = Number(event.start);
            if (event.end) event.end = Number(event.end);
            if (event.duration) event.duration = Number(event.duration);
            
            // Validate specific event types
            switch(event.type) {
                case 'feeding':
                    if (!event.feedType) event.feedType = 'unknown';
                    if (event.feedType === 'bottle' && event.amountOz) {
                        event.amountOz = Number(event.amountOz);
                    }
                    if (event.feedType === 'breast' && event.durationMin) {
                        event.durationMin = Number(event.durationMin);
                    }
                    break;
                    
                case 'sleep':
                    // Recalculate duration if start and end exist but duration is missing
                    if (event.start && event.end && !event.duration) {
                        event.duration = event.end - event.start;
                    }
                    // If only duration exists, but end is missing, derive end from timestamp
                    if (event.duration && !event.end && event.timestamp) {
                        event.end = event.timestamp;
                        event.start = event.timestamp - event.duration;
                    }
                    break;
                    
                case 'pump':
                    if (event.amountOz) event.amountOz = Number(event.amountOz);
                    break;
                    
                case 'diaper':
                    if (!event.diaperType) event.diaperType = 'unknown';
                    break;
                    
                // Handle new event types - migrate from old versions
                case 'weight':
                case 'length':
                case 'headCircumference':
                    // Move to growth data collection
                    if (event.value) {
                        growthData[event.type].push({
                            timestamp: event.timestamp,
                            value: Number(event.value)
                        });
                    }
                    return null; // Remove from events array
                    
                case 'temperature':
                    // Move to temperature data collection
                    if (event.value) {
                        temperatureData.push({
                            timestamp: event.timestamp,
                            value: Number(event.value),
                            location: event.location || 'unknown'
                        });
                    }
                    return null; // Remove from events array
                    
                case 'medicine':
                    // Move to medicine schedule collection
                    medicineSchedule.push({
                        id: event.id,
                        timestamp: event.timestamp,
                        name: event.name || 'Unknown medicine',
                        dose: event.dose || '',
                        notes: event.notes || ''
                    });
                    return null; // Remove from events array
                    
                case 'milestone':
                    // Move to milestone data collection
                    milestoneData.completed.push({
                        id: event.id,
                        timestamp: event.timestamp,
                        name: event.name || 'Unknown milestone',
                        notes: event.notes || ''
                    });
                    return null; // Remove from events array
            }
            
            return event;
        }).filter(event => event !== null); // Remove null events (migrated to other collections)
    };

    const addEvent = (eventData) => {
        const newEvent = {
            id: generateId(),
            timestamp: eventData.timestamp || Date.now(),
            ...eventData
        };
        
        // Basic validation
        if (!newEvent.type) {
            logError("Cannot add event without type property");
            return;
        }
        
        // Special handling for different event types
        switch(newEvent.type) {
            case 'feeding':
                if (newEvent.feedType === 'bottle' && newEvent.amountOz) {
                    newEvent.amountOz = Number(newEvent.amountOz);
                }
                if (newEvent.feedType === 'breast' && newEvent.durationMin) {
                    newEvent.durationMin = Number(newEvent.durationMin);
                }
                break;
                
            case 'diaper':
                // Validate diaper type
                if (!['wet', 'dirty', 'mixed'].includes(newEvent.diaperType)) {
                    newEvent.diaperType = 'unknown';
                }
                break;
                
            case 'sleep':
                // Ensure sleep duration is properly calculated
                if (newEvent.start && newEvent.end) {
                    newEvent.duration = newEvent.end - newEvent.start;
                }
                break;
                
            case 'weight':
            case 'length': 
            case 'headCircumference':
                // Add to growth data instead
                addGrowthMeasurement(newEvent.type, newEvent.value, newEvent.timestamp);
                return; // Don't add to main events
                
            case 'temperature':
                // Add to temperature data
                addTemperature(newEvent.value, newEvent.location, newEvent.timestamp);
                return; // Don't add to main events
                
            case 'medicine':
                // Add to medicine schedule
                addMedicine(newEvent.name, newEvent.dose, newEvent.notes, newEvent.timestamp);
                return; // Don't add to main events
                
            case 'milestone':
                // Add to milestone data
                completeMilestone(newEvent.name, newEvent.notes, newEvent.timestamp);
                return; // Don't add to main events
        }
        
        events.push(newEvent);
        events.sort((a, b) => b.timestamp - a.timestamp); // Keep sorted
        
        saveData();
        updateUI();
        
        // Potentially detect patterns when new data is added
        if (events.length > 30 && settings.advancedPredictions) {
            detectPatterns();
        }
        
        logInfo(`Event added: ${newEvent.type} (ID: ${newEvent.id})`);
        
        // Trigger alarm check soon after adding data, might change predictions
        scheduleNextMainAlarmCheck(5000); // Check in 5 seconds
    };

    const updateEvent = (eventId, updatedData) => {
        const eventIndex = events.findIndex(e => e.id === eventId);
        if (eventIndex > -1) {
            // Merge updates, ensure timestamp is correctly handled
            const originalEvent = events[eventIndex];
            events[eventIndex] = { ...originalEvent, ...updatedData, id: eventId }; // Ensure ID isn't overwritten

            // Ensure crucial fields remain numbers
            events[eventIndex].timestamp = Number(events[eventIndex].timestamp);
            if (events[eventIndex].start) events[eventIndex].start = Number(events[eventIndex].start);
            if (events[eventIndex].end) events[eventIndex].end = Number(events[eventIndex].end);
            
            // Special treatment for sleep events
            if (events[eventIndex].type === 'sleep' && events[eventIndex].start && events[eventIndex].end) {
                events[eventIndex].duration = events[eventIndex].end - events[eventIndex].start;
            }

            if (updatedData.timestamp && updatedData.timestamp !== originalEvent.timestamp) { // If timestamp changed, re-sort
                 events.sort((a, b) => b.timestamp - a.timestamp);
            }
            
            saveData();
            updateUI();
            logInfo(`Event updated: ${events[eventIndex].type} (ID: ${eventId})`);
            scheduleNextMainAlarmCheck(5000); // Re-check alarms
        } else {
            logError("Event not found for update:", eventId);
        }
    };

    const deleteEvent = (eventId) => {
        if (!confirm("Are you sure you want to permanently delete this event?")) return;

        const initialLength = events.length;
        events = events.filter(e => e.id !== eventId);

        if (events.length < initialLength) {
            saveData();
            updateUI();
            
            // Reset learning data if a significant event was deleted
            if (settings.advancedPredictions) {
                initializeLearningData();
            }
            
            logInfo(`Event deleted: (ID: ${eventId})`);
            scheduleNextMainAlarmCheck(5000); // Re-check alarms
        } else {
             logWarning(`Event not found for deletion: (ID: ${eventId})`);
        }
    };

    const clearAllData = () => {
        if (confirm("⚠️ WARNING! ⚠️\n\nThis will permanently delete ALL tracked data (events, settings, schedule).\n\nThis action cannot be undone.\n\nAre you absolutely sure you want to proceed?")) {
            // Create automatic backup before clearing
            try {
                const backupData = prepareBackupData();
                const backup = JSON.stringify(backupData);
                localStorage.setItem('babyTrackerEmergencyBackup', backup);
                logInfo("Emergency backup created before clearing data");
            } catch (e) {
                logError("Failed to create emergency backup", e);
            }
            
            // Remove all app data from localStorage
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });

            // Reset state variables
            events = [];
            isSleeping = false;
            sleepStartTime = null;
            pumpSchedule = { intervalHours: null, startTime: null };
            snoozeState = {};
            alarmsPaused = false;
            settings = { 
                alarmSoundEnabled: true,
                theme: 'light',
                timeFormat: '12',
                dateFormat: 'M/D/YYYY',
                autoBackupEnabled: true,
                babyName: 'Baby'
            };
            growthData = { weight: [], length: [], headCircumference: [] };
            milestoneData = { completed: [], upcoming: [] };
            medicineSchedule = [];
            temperatureData = [];
            lastBackupTime = null;
            
            // Reset advanced state
            mlModels = {};
            learningData = {};
            anomalyDetection = { lastCheck: null, detectedAnomalies: [] };
            cachedStats = { lastUpdate: null, averageIntervals: {}, trends: {}, dailyTotals: {} };

            // Clear active alarms and UI elements related to data
            clearAllAlarmTimeouts();
            hideAlarm();
            if (currentChart) {
                currentChart.destroy();
                currentChart = null;
            }

            // Full UI refresh to reflect cleared state
            updateSettingsUI();
            updatePumpScheduleUI();
            updateAlarmPauseStatus();
            updateUI();

            logInfo("All application data has been cleared.");
            alert("All data has been cleared successfully. If this was a mistake, check Settings for an emergency backup option.");
        }
    };
    
    // --- Growth Tracking ---
    const addGrowthMeasurement = (type, value, timestamp = Date.now()) => {
        if (!['weight', 'length', 'headCircumference'].includes(type)) {
            logError(`Invalid growth measurement type: ${type}`);
            return;
        }
        
        if (isNaN(value) || value <= 0) {
            logError(`Invalid growth measurement value: ${value}`);
            return;
        }
        
        // Add the new measurement
        growthData[type].push({
            timestamp,
            value: Number(value)
        });
        
        // Sort by timestamp (newest first)
        growthData[type].sort((a, b) => b.timestamp - a.timestamp);
        
        saveData();
        updateUI();
        
        logInfo(`Growth measurement added: ${type} - ${value}`);
        
        // If we have a DOB and gender, calculate percentile
        if (settings.babyDOB && settings.babyGender && GROWTH_REFERENCES[type]?.[settings.babyGender]) {
            const percentile = calculateGrowthPercentile(type, value);
            if (percentile) {
                // Show a notification about the percentile
                const percentileMsg = `${settings.babyName}'s ${type} is around the ${percentile} percentile for their age.`;
                showInfoNotification(percentileMsg);
            }
        }
    };
    
    const calculateGrowthPercentile = (type, value) => {
        // Get the baby's age in months
        const age = getBabyAge();
        if (!age) return null;
        
        const ageMonths = Math.floor(age.totalMonths);
        const gender = settings.babyGender;
        
        // Get reference data for this age and gender
        const referenceData = GROWTH_REFERENCES[type]?.[gender]?.[ageMonths];
        if (!referenceData) return null;
        
        // Simplified percentile calculation - this would be more complex in a real app
        // using proper interpolation between standard deviations
        if (value < referenceData[0]) return "below 3rd"; 
        if (value < referenceData[1]) return "3rd-50th";
        if (value < referenceData[2]) return "50th-97th";
        return "above 97th";
    };
    
    // --- Temperature Tracking ---
    const addTemperature = (value, location = 'axillary', timestamp = Date.now()) => {
        if (isNaN(value)) {
            logError(`Invalid temperature value: ${value}`);
            return;
        }
        
        // Add the temperature reading
        temperatureData.push({
            timestamp,
            value: Number(value),
            location
        });
        
        // Sort by timestamp (newest first)
        temperatureData.sort((a, b) => b.timestamp - a.timestamp);
        
        saveData();
        updateUI();
        
        logInfo(`Temperature measurement added: ${value} (${location})`);
        
        // Check for fever
        const isFever = (settings.temperatureUnit === 'f' && value >= 100.4) || 
                       (settings.temperatureUnit === 'c' && value >= 38);
        
        if (isFever) {
            showInfoNotification(`⚠️ Fever detected: ${formatTemperature(value)} - Consider contacting healthcare provider if persists.`);
        }
    };
    
    // --- Medicine Tracking ---
    const addMedicine = (name, dose, notes = '', timestamp = Date.now()) => {
        if (!name) {
            logError("Medicine name is required");
            return;
        }
        
        const medicineEntry = {
            id: generateId(),
            timestamp,
            name,
            dose: dose || '',
            notes
        };
        
        medicineSchedule.push(medicineEntry);
        
        // Sort by timestamp (newest first)
        medicineSchedule.sort((a, b) => b.timestamp - a.timestamp);
        
        saveData();
        updateUI();
        
        logInfo(`Medicine added: ${name} - ${dose}`);
    };
    
    const scheduleMedicine = (name, dose, intervalHours, times = 1, startTimestamp = Date.now()) => {
        if (!name || !intervalHours || isNaN(intervalHours)) {
            logError("Invalid medicine schedule parameters");
            return;
        }
        
        const intervalMs = intervalHours * 60 * 60 * 1000;
        
        for (let i = 0; i < times; i++) {
            const timestamp = startTimestamp + (i * intervalMs);
            
            const medicineEntry = {
                id: generateId(),
                timestamp,
                name,
                dose: dose || '',
                notes: `Scheduled dose ${i + 1} of ${times}`,
                scheduled: true
            };
            
            medicineSchedule.push(medicineEntry);
        }
        
        // Sort by timestamp
        medicineSchedule.sort((a, b) => a.timestamp - b.timestamp);
        
        saveData();
        updateUI();
        
        // Set up alarm for the first dose
        const now = Date.now();
        const firstDose = medicineSchedule.find(m => m.scheduled && m.timestamp > now);
        
        if (firstDose) {
            scheduleAlarmTimeout('medicine', firstDose.timestamp, `Time for ${firstDose.name} (${firstDose.dose})`);
        }
        
        logInfo(`Medicine schedule created: ${name} - every ${intervalHours} hours, ${times} times`);
    };
    
    // --- Milestone Tracking ---
    const updateAvailableMilestones = () => {
        // Reset upcoming milestones
        milestoneData.upcoming = [];
        
        // Get baby's age in months
        const age = getBabyAge();
        if (!age) return;
        
        const completedMilestoneNames = new Set(milestoneData.completed.map(m => m.name));
        
        // Add upcoming milestones based on age
        // Include current month and next 3 months
        for (let m = Math.floor(age.totalMonths); m <= Math.floor(age.totalMonths) + 3; m++) {
            if (MILESTONES[m]) {
                MILESTONES[m].forEach(milestone => {
                    if (!completedMilestoneNames.has(milestone)) {
                        milestoneData.upcoming.push({
                            name: milestone,
                            ageMonth: m
                        });
                    }
                });
            }
        }
        
        // Sort upcoming milestones by age
        milestoneData.upcoming.sort((a, b) => a.ageMonth - b.ageMonth);
    };
    
    const completeMilestone = (name, notes = '', timestamp = Date.now()) => {
        if (!name) {
            logError("Milestone name is required");
            return;
        }
        
        // Check if already completed
        const alreadyCompleted = milestoneData.completed.some(m => m.name === name);
        if (alreadyCompleted) {
            logWarning(`Milestone "${name}" already marked as completed`);
            return;
        }
        
        // Add to completed milestones
        milestoneData.completed.push({
            id: generateId(),
            timestamp,
            name,
            notes,
            ageAtCompletion: getBabyAge()?.totalMonths || null
        });
        
        // Sort by timestamp (newest first)
        milestoneData.completed.sort((a, b) => b.timestamp - a.timestamp);
        
        // Update upcoming milestones
        updateAvailableMilestones();
        
        saveData();
        updateUI();
        
        // Show celebratory message
        showInfoNotification(`🎉 Milestone achieved: ${name}`);
        
        logInfo(`Milestone completed: ${name}`);
    };

    // --- Prediction Logic ---
    /**
     * Calculates the average interval between events of a specific type.
     * Uses time-weighted moving average for more accurate predictions.
     * @param {string} eventType - The type of event (e.g., 'feeding', 'sleep').
     * @param {object|null} subType - Optional filter for subtype (e.g., { diaperType: 'wet' }).
     * @param {number} window - Number of recent intervals to analyze.
     * @returns {object} Detailed prediction data or null if insufficient data.
     */
    const calculateAverageInterval = (eventType, subType = null, window = PREDICTION_WINDOW) => {
        // Check if we have cached results that are still valid
        const cacheKey = `${eventType}:${JSON.stringify(subType)}`;
        if (cachedStats.lastUpdate && 
            cachedStats.averageIntervals[cacheKey] && 
            (Date.now() - cachedStats.lastUpdate < 5 * 60 * 1000)) { // 5 minute cache
            return cachedStats.averageIntervals[cacheKey];
        }
        
        let relevantEvents = events.filter(e => e.type === eventType);
        
        if (subType) {
            const subTypeKey = Object.keys(subType)[0];
            const subTypeValue = Object.values(subType)[0];
            relevantEvents = relevantEvents.filter(e => e[subTypeKey] === subTypeValue);
        }

        // Sort ascending by the relevant timestamp for interval calculation
        relevantEvents.sort((a, b) => (eventType === 'sleep' ? (a.start || a.timestamp) : a.timestamp) - (eventType === 'sleep' ? (b.start || b.timestamp) : b.timestamp));

        if (relevantEvents.length < 2) return null; // Need at least two points to make an interval

        const intervals = [];
        const timeOfDay = [];
        
        for (let i = 1; i < relevantEvents.length; i++) {
            let t1, t2;
            
            if (eventType === 'sleep') {
                // Interval = Awake time = Time between end of sleep[i-1] and start of sleep[i]
                t1 = relevantEvents[i - 1].end;
                t2 = relevantEvents[i].start;
                if (!t1 || !t2) continue; // Skip if start/end times are missing for sleep interval calculation
            } else {
                // Interval = Time between event[i-1] and event[i]
                t1 = relevantEvents[i - 1].timestamp;
                t2 = relevantEvents[i].timestamp;
            }

            const interval = t2 - t1;
            const hourOfDay = new Date(t2).getHours();
            
            // Basic outlier filtering (e.g., ignore negative intervals or extremely long ones)
            const MAX_REASONABLE_INTERVAL = 3 * 24 * 60 * 60 * 1000; // 72 hours - increased for flexibility
            
            if (interval > 0 && interval < MAX_REASONABLE_INTERVAL) {
                intervals.push({
                    startTime: t1,
                    endTime: t2,
                    duration: interval,
                    hourOfDay
                });
                
                // Track time of day distribution
                timeOfDay[hourOfDay] = (timeOfDay[hourOfDay] || 0) + 1;
            }
        }

        if (intervals.length === 0) return null;

        // Use moving average if enough intervals, otherwise use overall average if possible
        const intervalsToAverage = intervals.length >= window ? intervals.slice(-window) : intervals;

        // Need at least PREDICTION_MIN_EVENTS - 1 intervals for a meaningful average
        if (intervalsToAverage.length < PREDICTION_MIN_EVENTS - 1) {
            return null; // Not enough reliable data points yet
        }

        // Time-weighted moving average (more recent intervals have higher weight)
        let weightedSum = 0;
        let weightSum = 0;
        const now = Date.now();
        const timeDecayFactor = 0.8; // Adjusts how quickly older data becomes less important
        
        // Calculate standard deviation and median
        const durations = intervalsToAverage.map(i => i.duration);
        durations.sort((a, b) => a - b);
        const medianInterval = durations[Math.floor(durations.length / 2)];
        
        // Calculate mean
        const meanInterval = durations.reduce((sum, val) => sum + val, 0) / durations.length;
        
        // Calculate standard deviation
        const variance = durations.reduce((sum, val) => sum + Math.pow(val - meanInterval, 2), 0) / durations.length;
        const stdDevInterval = Math.sqrt(variance);
        
        // Time-weighted average calculation
        for (let i = 0; i < intervalsToAverage.length; i++) {
            const interval = intervalsToAverage[i];
            const age = (now - interval.endTime) / (1000 * 60 * 60 * 24); // Age in days
            const weight = Math.exp(-age * timeDecayFactor);
            
            weightedSum += interval.duration * weight;
            weightSum += weight;
        }
        
        const averageInterval = weightSum > 0 ? weightedSum / weightSum : meanInterval;
        
        // Find most common time of day
        let maxCount = 0;
        let mostCommonHour = -1;
        
        for (let hour = 0; hour < 24; hour++) {
            if (timeOfDay[hour] > maxCount) {
                maxCount = timeOfDay[hour];
                mostCommonHour = hour;
            }
        }
        
        // Detect daily patterns (approximately every 24 hours +/- 3 hours)
        const isDailyPattern = Math.abs(averageInterval - (24 * 60 * 60 * 1000)) < (3 * 60 * 60 * 1000);
        
        // Prepare the detailed result
        const result = {
            avgInterval: averageInterval,
            medianInterval: medianInterval, 
            stdDevInterval: stdDevInterval,
            reliability: intervalsToAverage.length / PREDICTION_WINDOW, // 0-1 scale
            intervalsAnalyzed: intervalsToAverage.length,
            mostCommonHour: mostCommonHour,
            timeOfDayDistribution: timeOfDay,
            isDailyPattern,
            regularityScore: 1 - (stdDevInterval / averageInterval) // Higher when more regular
        };
        
        // Cache the result for performance
        if (!cachedStats.lastUpdate) {
            cachedStats.lastUpdate = Date.now();
            cachedStats.averageIntervals = {};
        }
        cachedStats.averageIntervals[cacheKey] = result;
        
        return result;
    };

    /**
     * Predicts the timestamp of the next event occurrence using advanced algorithms.
     * Considers time of day patterns, recent frequency changes, and more.
     * @param {string} eventType - The type of event.
     * @param {object|null} subType - Optional subtype filter.
     * @returns {object} { prediction: number|null, lastEventTime: number|null, avgInterval: number|null, confidence: number, alternativePredictions: [] }
     */
    const predictNextEvent = (eventType, subType = null) => {
        // Get core interval statistics
        const intervalStats = calculateAverageInterval(eventType, subType);
        let lastEventTime = null;
        let prediction = null;
        let confidence = 0;
        let alternativePredictions = [];

        // Find the relevant last event based on event type
        let lastEvent;
        if (eventType === 'sleep') {
            // For sleep prediction (next nap), we need the end time of the *last completed* sleep.
            lastEvent = events.find(e => e.type === 'sleep' && e.end); // Most recent event with an end time
            lastEventTime = lastEvent?.end || null;
        } else {
            // For other events, use the timestamp of the most recent occurrence.
            let relevantEvents = events.filter(e => e.type === eventType);
            if (subType) {
                const subTypeKey = Object.keys(subType)[0];
                const subTypeValue = Object.values(subType)[0];
                relevantEvents = relevantEvents.filter(e => e[subTypeKey] === subTypeValue);
            }
            lastEvent = relevantEvents[0]; // Assumes events are sorted descending
            lastEventTime = lastEvent?.timestamp || null;
        }

        if (!lastEventTime || !intervalStats || !intervalStats.avgInterval) {
            return { prediction: null, lastEventTime, avgInterval: null, confidence: 0, alternativePredictions: [] };
        }
        
        // Base prediction using average interval
        const basicPrediction = lastEventTime + intervalStats.avgInterval;
        
        // Start with the simple prediction
        prediction = basicPrediction;
        
        // Adjust confidence based on regularity
        confidence = Math.min(0.8, intervalStats.reliability * intervalStats.regularityScore);
        
        // Apply advanced prediction adjustments if enabled and we have enough data
        if (settings.advancedPredictions && intervalStats.intervalsAnalyzed >= 5) {
            // Time of day adjustment
            const predictionHour = new Date(basicPrediction).getHours();
            const hourDistribution = intervalStats.timeOfDayDistribution || [];
            
            // If the basic prediction falls in an unlikely hour, shift it to the most common hour
            if (hourDistribution[predictionHour] === 0 && intervalStats.mostCommonHour >= 0) {
                const mostCommonHourTime = new Date(basicPrediction);
                mostCommonHourTime.setHours(intervalStats.mostCommonHour, 0, 0, 0);
                
                // If most common hour is earlier today, use tomorrow
                if (mostCommonHourTime.getTime() < Date.now()) {
                    mostCommonHourTime.setDate(mostCommonHourTime.getDate() + 1);
                }
                
                // Add as an alternative prediction with high confidence
                alternativePredictions.push({
                    timestamp: mostCommonHourTime.getTime(),
                    confidence: 0.7,
                    reason: "Based on most common time of day"
                });
            }
            
            // Check if pattern data is available and has a prediction
            if (patternData && patternData[eventType]) {
                const patternPrediction = patternData[eventType].nextPredicted;
                
                if (patternPrediction && patternPrediction > Date.now()) {
                    alternativePredictions.push({
                        timestamp: patternPrediction,
                        confidence: patternData[eventType].confidence,
                        reason: "Based on detected pattern"
                    });
                    
                    // If pattern prediction has higher confidence, use it
                    if (patternData[eventType].confidence > confidence) {
                        prediction = patternPrediction;
                        confidence = patternData[eventType].confidence;
                    }
                }
            }
            
            // Use machine learning prediction if available (would be implemented in a real app)
            if (mlModels[eventType] && learningData[eventType]) {
                // This is a placeholder for where actual ML prediction would happen
                // In a real implementation, this would use a trained model to make prediction
                const mlPrediction = Date.now() + intervalStats.avgInterval; // Placeholder
                const mlConfidence = 0.75; // Placeholder
                
                alternativePredictions.push({
                    timestamp: mlPrediction,
                    confidence: mlConfidence,
                    reason: "Machine learning prediction"
                });
            }
            
            // Special handling for certain event types
            if (eventType === 'feeding' && lastEvent) {
                // For bottle feeds, adjust based on amount
                if (lastEvent.feedType === 'bottle' && lastEvent.amountOz) {
                    const avgAmount = calculateAverageAmount('feeding', 'amountOz');
                    if (avgAmount && lastEvent.amountOz < avgAmount * 0.7) {
                        // If last feed was smaller than usual, predict earlier next feed
                        const adjustedPrediction = lastEventTime + (intervalStats.avgInterval * 0.85);
                        alternativePredictions.push({
                            timestamp: adjustedPrediction,
                            confidence: 0.65,
                            reason: "Last feed was smaller than average"
                        });
                    }
                }
                
                // For breast feeds, adjust based on duration
                if (lastEvent.feedType === 'breast' && lastEvent.durationMin) {
                    const avgDuration = calculateAverageAmount('feeding', 'durationMin', { feedType: 'breast' });
                    if (avgDuration && lastEvent.durationMin < avgDuration * 0.7) {
                        // If last feed was shorter than usual, predict earlier next feed
                        const adjustedPrediction = lastEventTime + (intervalStats.avgInterval * 0.85);
                        alternativePredictions.push({
                            timestamp: adjustedPrediction,
                            confidence: 0.65,
                            reason: "Last feed was shorter than average"
                        });
                    }
                }
            }
        }
        
        // Sort alternative predictions by timestamp
        alternativePredictions.sort((a, b) => a.timestamp - b.timestamp);
        
        // Only keep predictions in the future
        alternativePredictions = alternativePredictions.filter(p => p.timestamp > Date.now());
        
        // Select the best alternative prediction if it exists and has higher confidence
        if (alternativePredictions.length > 0) {
            const bestAlternative = alternativePredictions.reduce((best, current) => {
                return current.confidence > best.confidence ? current : best;
            }, { confidence: 0 });
            
            if (bestAlternative.confidence > confidence) {
                prediction = bestAlternative.timestamp;
                confidence = bestAlternative.confidence;
            }
        }

        return { 
            prediction, 
            lastEventTime, 
            avgInterval: intervalStats?.avgInterval || null,
            confidence,
            alternativePredictions
        };
    };
    
    /**
     * Calculates average amount/duration for numeric fields in events.
     * @param {string} eventType - The type of event.
     * @param {string} fieldName - Field to average (e.g., 'amountOz', 'durationMin').
     * @param {object} filter - Additional filters to apply.
     * @returns {number|null} - Average value or null if insufficient data.
     */
    const calculateAverageAmount = (eventType, fieldName, filter = {}) => {
        // Filter events by type and any additional filters
        let relevantEvents = events.filter(e => e.type === eventType);
        
        Object.entries(filter).forEach(([key, value]) => {
            relevantEvents = relevantEvents.filter(e => e[key] === value);
        });
        
        // Get events with valid numeric values for the field
        const eventsWithField = relevantEvents.filter(e => 
            e[fieldName] !== undefined && 
            e[fieldName] !== null && 
            !isNaN(e[fieldName]) && 
            e[fieldName] > 0
        );
        
        if (eventsWithField.length < 3) return null; // Need at least 3 data points
        
        // Calculate average
        const sum = eventsWithField.reduce((total, e) => total + Number(e[fieldName]), 0);
        return sum / eventsWithField.length;
    };

    // --- Pattern Detection ---
    /**
     * Analyzes event data to detect patterns and regularities.
     * Uses clustering, time series analysis, and sequence detection.
     */
    const detectPatterns = debounce(() => {
        // Skip if we've analyzed recently or have limited data
        if (events.length < 30 || 
            (anomalyDetection.lastCheck && (Date.now() - anomalyDetection.lastCheck < 6 * 60 * 60 * 1000))) { // 6 hours
            return;
        }
        
        logInfo("Running pattern detection analysis...");
        anomalyDetection.lastCheck = Date.now();
        patternData = {};
        
        // Group events by type for separate analysis
        const eventsByType = {};
        events.forEach(event => {
            if (!eventsByType[event.type]) eventsByType[event.type] = [];
            eventsByType[event.type].push(event);
        });
        
        // Analyze each event type separately
        Object.entries(eventsByType).forEach(([eventType, typeEvents]) => {
            if (typeEvents.length < 15) return; // Need enough data points
            
            // Sort ascending for time series analysis
            typeEvents.sort((a, b) => a.timestamp - b.timestamp);
            
            // Find daily patterns (events that happen at similar times each day)
            const hourDistribution = analyzeDailyTiming(typeEvents);
            let peakHours = findPeakHours(hourDistribution);
            
            // Check event intervals for regularity
            const intervals = [];
            for (let i = 1; i < typeEvents.length; i++) {
                intervals.push(typeEvents[i].timestamp - typeEvents[i-1].timestamp);
            }
            
            // Cluster intervals to find patterns (e.g., short intervals followed by long ones)
            const clusterResults = clusterIntervals(intervals);
            
            // Detect consecutive sequences (e.g., feed, then diaper, then sleep)
            const sequences = detectSequences(eventType);
            
            // Calculate the next predicted time based on patterns
            let nextPredicted = null;
            let confidence = 0;
            let patternType = "none";
            
            // If we have strong daily pattern, predict next occurrence
            if (peakHours.length > 0 && peakHours[0].score > PATTERN_DETECTION_THRESHOLD) {
                const nextHour = peakHours[0].hour;
                const today = new Date();
                today.setHours(nextHour, 0, 0, 0);
                
                // If this hour already passed today, use tomorrow
                if (today.getTime() < Date.now()) {
                    today.setDate(today.getDate() + 1);
                }
                
                nextPredicted = today.getTime();
                confidence = peakHours[0].score;
                patternType = "daily";
            }
            // Otherwise use interval clusters if reliable
            else if (clusterResults && clusterResults.reliability > PATTERN_DETECTION_THRESHOLD) {
                const lastEvent = typeEvents[typeEvents.length - 1];
                nextPredicted = lastEvent.timestamp + clusterResults.predictedInterval;
                confidence = clusterResults.reliability;
                patternType = "interval";
            }
            
            patternData[eventType] = {
                hourDistribution,
                peakHours,
                intervalClusters: clusterResults,
                sequences,
                nextPredicted,
                confidence,
                patternType
            };
        });
        
        saveData();
        
        // Detect any anomalies from the patterns
        detectAnomalies();
        
        logInfo("Pattern detection complete");
    }, 30000); // Debounce to prevent excessive processing
    
    /**
     * Analyzes the hour of day distribution for events.
     * @param {Array} events - Events to analyze.
     * @returns {Array} - Distribution of events by hour.
     */
    const analyzeDailyTiming = (events) => {
        const hourCounts = Array(24).fill(0);
        
        events.forEach(event => {
            const hour = new Date(event.timestamp).getHours();
            hourCounts[hour]++;
        });
        
        // Normalize to percentage
        const totalEvents = events.length;
        return hourCounts.map(count => count / totalEvents);
    };
    
    /**
     * Finds peak hours in the hour distribution.
     * @param {Array} hourDistribution - Distribution of events by hour.
     * @returns {Array} - Peaks with hour and score.
     */
    const findPeakHours = (hourDistribution) => {
        const peaks = [];
        const threshold = 0.1; // Minimum percentage to be considered a peak
        
        hourDistribution.forEach((score, hour) => {
            if (score >= threshold) {
                peaks.push({ hour, score });
            }
        });
        
        // Sort by score descending
        return peaks.sort((a, b) => b.score - a.score);
    };
    
    /**
     * Clusters intervals to find patterns.
     * @param {Array} intervals - Array of time intervals.
     * @returns {Object} - Cluster analysis results.
     */
    const clusterIntervals = (intervals) => {
        if (intervals.length < 10) return null;
        
        // Simplified clustering - in a real app this would use K-means or other proper clustering
        // Convert to hours for easier analysis
        const intervalsHours = intervals.map(ms => ms / (1000 * 60 * 60));
        
        // Find common intervals (simple approach - look for clusters)
        const clusters = {};
        
        intervalsHours.forEach(interval => {
            // Round to nearest half hour
            const roundedInterval = Math.round(interval * 2) / 2;
            clusters[roundedInterval] = (clusters[roundedInterval] || 0) + 1;
        });
        
        // Find the most common interval
        let mostCommonInterval = 0;
        let maxCount = 0;
        let totalIntervals = intervals.length;
        
        Object.entries(clusters).forEach(([interval, count]) => {
            if (count > maxCount) {
                maxCount = count;
                mostCommonInterval = parseFloat(interval);
            }
        });
        
        const reliability = maxCount / totalIntervals;
        
        return {
            clusters,
            mostCommonInterval,
            predictedInterval: mostCommonInterval * 60 * 60 * 1000, // Convert back to ms
            reliability
        };
    };
    
    /**
     * Detects common event sequences.
     * @param {string} eventType - Type of event.
     * @returns {Array} - Common sequences found.
     */
    const detectSequences = (eventType) => {
        // This is a simplified implementation
        // A real sequence detector would be more complex using techniques like Markov chains
        
        // Get all events in the last 7 days
        const recentEvents = events.filter(e => e.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        // Get events that follow the specified type within 30 minutes
        const followingEvents = [];
        
        recentEvents.forEach((event, index) => {
            if (event.type === eventType && index < recentEvents.length - 1) {
                const nextEvent = recentEvents[index + 1];
                const timeDiff = nextEvent.timestamp - event.timestamp;
                
                // If next event is within 30 minutes
                if (timeDiff > 0 && timeDiff < 30 * 60 * 1000) {
                    followingEvents.push({
                        type: nextEvent.type,
                        subType: getEventSubType(nextEvent),
                        timeAfter: timeDiff
                    });
                }
            }
        });
        
        // Count frequency of each following event type
        const followingTypeCounts = {};
        
        followingEvents.forEach(event => {
            const key = `${event.type}:${event.subType || 'none'}`;
            followingTypeCounts[key] = (followingTypeCounts[key] || 0) + 1;
        });
        
        // Convert to array and sort by frequency
        const sequences = Object.entries(followingTypeCounts).map(([key, count]) => {
            const [type, subType] = key.split(':');
            return {
                type,
                subType: subType === 'none' ? null : subType,
                count,
                probability: count / followingEvents.length
            };
        });
        
        return sequences.sort((a, b) => b.count - a.count);
    };
    
    /**
     * Gets the relevant subtype of an event.
     * @param {Object} event - Event object.
     * @returns {string|null} - Subtype string or null.
     */
    const getEventSubType = (event) => {
        switch(event.type) {
            case 'feeding': return event.feedType || null;
            case 'diaper': return event.diaperType || null;
            default: return null;
        }
    };
    
    /**
     * Detects anomalies in the baby's patterns.
     */
    const detectAnomalies = () => {
        anomalyDetection.detectedAnomalies = [];
        
        // Check for significant pattern changes or abnormal intervals
        
        // 1. Check for unusually long time since last feeding
        const { lastEventTime: lastFeedTime, avgInterval: feedInterval } = predictNextEvent('feeding');
        if (lastFeedTime && feedInterval) {
            const timeSinceLastFeed = Date.now() - lastFeedTime;
            if (timeSinceLastFeed > feedInterval * 1.5) {
                anomalyDetection.detectedAnomalies.push({
                    type: 'feeding',
                    message: `Unusually long time since last feeding (${formatDuration(timeSinceLastFeed)} vs avg ${formatDuration(feedInterval)})`,
                    severity: 'warning',
                    timestamp: Date.now()
                });
            }
        }
        
        // 2. Check for unusual diaper patterns
        const lastDayDiapers = events.filter(e => 
            e.type === 'diaper' && 
            e.timestamp > Date.now() - 24 * 60 * 60 * 1000
        );
        
        // Very few diapers in 24 hours could indicate problem
        if (lastDayDiapers.length < 3) {
            anomalyDetection.detectedAnomalies.push({
                type: 'diaper',
                message: `Only ${lastDayDiapers.length} diaper changes in the last 24 hours`,
                severity: 'warning',
                timestamp: Date.now()
            });
        }
        
        // 3. Detect abnormal sleep pattern changes
        const sleepEvents = events.filter(e => e.type === 'sleep' && e.duration);
        if (sleepEvents.length >= 5) {
            // Get average of last 5 vs previous 5
            const recent5 = sleepEvents.slice(0, 5).map(e => e.duration);
            const previous5 = sleepEvents.slice(5, 10).map(e => e.duration);
            
            if (previous5.length === 5) {
                const avgRecent = recent5.reduce((sum, val) => sum + val, 0) / recent5.length;
                const avgPrevious = previous5.reduce((sum, val) => sum + val, 0) / previous5.length;
                
                // If average sleep duration changed by more than 30%
                const percentChange = Math.abs(avgRecent - avgPrevious) / avgPrevious;
                if (percentChange > 0.3) {
                    const direction = avgRecent > avgPrevious ? 'increased' : 'decreased';
                    anomalyDetection.detectedAnomalies.push({
                        type: 'sleep',
                        message: `Sleep duration has ${direction} by ${Math.round(percentChange * 100)}% recently`,
                        severity: 'info',
                        timestamp: Date.now()
                    });
                }
            }
        }
        
        // 4. Check for fever or temperature anomalies
        if (temperatureData.length >= 2) {
            const lastTemp = temperatureData[0];
            const prevTemp = temperatureData[1];
            
            const tempDiff = Math.abs(lastTemp.value - prevTemp.value);
            const isFever = (settings.temperatureUnit === 'f' && lastTemp.value >= 100.4) || 
                           (settings.temperatureUnit === 'c' && lastTemp.value >= 38);
            
            if (isFever) {
                anomalyDetection.detectedAnomalies.push({
                    type: 'temperature',
                    message: `Fever detected: ${formatTemperature(lastTemp.value)}`,
                    severity: 'alert',
                    timestamp: Date.now()
                });
            } else if (tempDiff > (settings.temperatureUnit === 'f' ? 1.5 : 0.8)) {
                const direction = lastTemp.value > prevTemp.value ? 'increased' : 'decreased';
                anomalyDetection.detectedAnomalies.push({
                    type: 'temperature',
                    message: `Temperature has ${direction} by ${settings.temperatureUnit === 'f' ? tempDiff.toFixed(1) + '°F' : (tempDiff * 5/9).toFixed(1) + '°C'}`,
                    severity: 'info',
                    timestamp: Date.now()
                });
            }
        }
        
        // If there are serious anomalies, show a notification
        const highSeverityAnomalies = anomalyDetection.detectedAnomalies.filter(a => 
            a.severity === 'warning' || a.severity === 'alert'
        );
        
        if (highSeverityAnomalies.length > 0) {
            // Only show the first/most important anomaly
            showInfoNotification(`⚠️ ${highSeverityAnomalies[0].message}`);
        }
    };
    
    /**
     * Shows an informational notification to the user.
     * @param {string} message - Message to display.
     * @param {number} duration - Duration in ms to show (0 for no auto-hide).
     */
    const showInfoNotification = (message, duration = 5000) => {
        // Create or use existing notification element
        let notification = document.getElementById('info-notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'info-notification';
            notification.className = 'info-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: var(--info-color, #AEC6CF);
                color: white;
                padding: 10px 15px;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                z-index: 9000;
                max-width: 350px;
                transform: translateY(-100px);
                transition: transform 0.3s ease-out;
                font-size: 0.9rem;
            `;
            document.body.appendChild(notification);
            
            // Add close button
            const closeBtn = document.createElement('span');
            closeBtn.innerHTML = '&times;';
            closeBtn.style.cssText = `
                position: absolute;
                top: 5px;
                right: 8px;
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
            `;
            closeBtn.onclick = () => {
                notification.style.transform = 'translateY(-100px)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            };
            notification.appendChild(closeBtn);
        }
        
        // Set message and show
        notification.innerHTML = message + '<span class="close-info">&times;</span>';
        
        // Add click handler to close button
        const closeBtn = notification.querySelector('.close-info');
        if (closeBtn) {
            closeBtn.style.cssText = `
                position: absolute;
                top: 5px;
                right: 8px;
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
            `;
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                notification.style.transform = 'translateY(-100px)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            };
        }
        
        // Show with animation
        setTimeout(() => {
            notification.style.transform = 'translateY(0)';
        }, 10);
        
        // Auto-hide after duration if specified
        if (duration > 0) {
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.style.transform = 'translateY(-100px)';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }
            }, duration);
        }
    };
    
    // --- Machine Learning & Advanced Analytics (Simplified) ---
    /**
     * Initializes learning data for pattern analysis.
     */
    const initializeLearningData = () => {
        if (!settings.advancedPredictions) return;
        
        learningData = {};
        
        // Prepare data structures for each event type
        events.forEach(event => {
            if (!learningData[event.type]) {
                learningData[event.type] = {
                    timestamps: [],
                    intervals: [],
                    timeOfDay: [],
                    dayOfWeek: [],
                    features: []
                };
            }
            
            const data = learningData[event.type];
            
            // Add core timestamp
            data.timestamps.push(event.timestamp);
            
            // Extract time features
            const date = new Date(event.timestamp);
            data.timeOfDay.push(date.getHours() + date.getMinutes() / 60);
            data.dayOfWeek.push(date.getDay());
            
            // For training, extract additional features
            // (In a real app, this would extract many more relevant features)
            const featureVector = [
                date.getHours() / 24, // Hour normalized to 0-1
                date.getDay() / 7,    // Day of week normalized to 0-1
                // More features would be added in real implementation
            ];
            
            data.features.push(featureVector);
        });
        
        // Calculate intervals for each event type
        Object.keys(learningData).forEach(type => {
            const data = learningData[type];
            
            // Sort timestamps chronologically
            const sortedTimes = [...data.timestamps].sort((a, b) => a - b);
            
            // Calculate intervals
            for (let i = 1; i < sortedTimes.length; i++) {
                data.intervals.push(sortedTimes[i] - sortedTimes[i-1]);
            }
        });
        
        // In a real app, this would now train machine learning models
        // For this demo, we'll simulate trained models
        
        // If we have enough data, "train" simulated models
        Object.keys(learningData).forEach(type => {
            if (learningData[type].timestamps.length >= 20) {
                mlModels[type] = {
                    trained: true,
                    accuracy: 0.75 + Math.random() * 0.2 // Simulate accuracy 0.75-0.95
                };
            }
        });
    };

    // --- UI Update Functions ---
    const updateClock = () => {
        if (DOMElements.currentTime) {
            DOMElements.currentTime.textContent = formatDateTime(Date.now());
        }
    };

    const updateProgressBar = (elementId, lastEventTime, avgInterval, predictedTime = null, confidence = 0.8) => {
        const progressBar = document.getElementById(elementId);
        if (!progressBar) return;

        let percentage = 0;
        let tooltip = '';
        progressBar.classList.remove('medium', 'high'); // Reset classes

        if (lastEventTime && avgInterval && avgInterval > 0) {
            const now = Date.now();
            const elapsed = now - lastEventTime;
            percentage = Math.max(0, (elapsed / avgInterval) * 100);

            // If prediction exists, use it to refine visual state
            const effectivePredictedTime = predictedTime || (lastEventTime + avgInterval);
            
            // If we have prediction and confidence, adjust percentage to reflect confidence
            if (predictedTime && confidence < 1) {
                // Adjust percentage to cap at confidence level (less confident = lower percentage)
                const confidentPercentage = Math.min(percentage, confidence * 100);
                // Blend between standard percentage and confidence-adjusted percentage
                percentage = percentage * confidence + confidentPercentage * (1 - confidence);
            }

            if (now < effectivePredictedTime) {
                // Before predicted time, cap progress visually slightly below 100%
                // unless very close to provide anticipation
                percentage = Math.min(percentage, 99.5);
                
                // Format tooltip with time remaining
                const timeRemaining = effectivePredictedTime - now;
                tooltip = `Estimated: ${formatTime(effectivePredictedTime)}\nRemaining: ${formatDuration(timeRemaining)}`;
                
                if (confidence < 1) {
                    tooltip += `\nConfidence: ${Math.round(confidence * 100)}%`;
                }
            } else {
                // After predicted time, ensure it shows 100% or slightly over
                percentage = 100;
                tooltip = `Expected time passed: ${formatTime(effectivePredictedTime)}\nElapsed: ${formatDuration(now - effectivePredictedTime)}`;
            }

            // Determine urgency based on percentage
            if (percentage >= 95) { // Changed threshold for 'high'
                progressBar.classList.add('high'); // Red/Coral
            } else if (percentage >= 75) { // Changed threshold for 'medium'
                progressBar.classList.add('medium'); // Yellow/Peach
            }
            // Default is green (success-color) - no class needed
        } else {
            tooltip = 'Not enough data to predict yet';
        }
        
        // Set accessibility attributes
        progressBar.setAttribute('title', tooltip);
        progressBar.setAttribute('aria-valuenow', Math.min(100, percentage));
        
        // Set visual percentage
        progressBar.style.width = `${Math.min(100, percentage)}%`; // Visually cap at 100%
    };

    const updateDashboard = () => {
        const now = Date.now();

        // --- Feeding Status ---
        const lastFeed = events.find(e => e.type === 'feeding');
        const { 
            prediction: nextFeedPred, 
            lastEventTime: lastFeedTime, 
            avgInterval: feedAvgInt,
            confidence: feedConfidence,
            alternativePredictions: feedAlternatives 
        } = predictNextEvent('feeding');
        
        const feedCard = DOMElements.dashboardContainer.querySelector('.status-card:nth-child(1)'); // Assuming order
        if (feedCard) {
            feedCard.querySelector('#last-feed-time').textContent = formatTime(lastFeed?.timestamp);
            
            const feedDetails = lastFeed ? 
                (lastFeed.feedType === 'bottle' ? 
                    `${lastFeed.amountOz || '?'}oz` : 
                    `${lastFeed.durationMin || '?'}m ${lastFeed.side || ''}`) : 
                '';
            feedCard.querySelector('#last-feed-details').textContent = feedDetails;
            
            // Update prediction with confidence indicator if available
            let predictionText = nextFeedPred ? `~${formatTime(nextFeedPred)}` : (lastFeed ? 'Calculating...' : 'No data');
            
            // Add confidence indicator for predictions
            if (nextFeedPred && feedConfidence) {
                const confLevel = feedConfidence >= 0.8 ? 'high' : (feedConfidence >= 0.5 ? 'medium' : 'low');
                predictionText += ` <span class="confidence ${confLevel}" title="Prediction confidence: ${Math.round(feedConfidence * 100)}%"></span>`;
            }
            
            // Show alternative predictions if available
            let altPredictionsHtml = '';
            if (feedAlternatives && feedAlternatives.length > 0) {
                altPredictionsHtml = '<div class="alt-predictions">';
                feedAlternatives.forEach(alt => {
                    const confLevel = alt.confidence >= 0.8 ? 'high' : (alt.confidence >= 0.5 ? 'medium' : 'low');
                    altPredictionsHtml += `<div class="alt-prediction" title="${alt.reason}">
                        ${formatTime(alt.timestamp)} 
                        <span class="confidence ${confLevel}" title="Confidence: ${Math.round(alt.confidence * 100)}%"></span>
                    </div>`;
                });
                altPredictionsHtml += '</div>';
            }
            
            feedCard.querySelector('#next-feed-prediction').innerHTML = predictionText;
            
            // Add alternative predictions if element exists
            const altPredContainer = feedCard.querySelector('.alt-predictions-container');
            if (altPredContainer) {
                altPredContainer.innerHTML = altPredictionsHtml;
            }
            
            updateProgressBar('feed-progress', lastFeedTime, feedAvgInt, nextFeedPred, feedConfidence);
        }

        // --- Diaper Status ---
        const lastDiaper = events.find(e => e.type === 'diaper');
        const lastWetDiaper = events.find(e => e.type === 'diaper' && (e.diaperType === 'wet' || e.diaperType === 'mixed'));
        const lastDirtyDiaper = events.find(e => e.type === 'diaper' && (e.diaperType === 'dirty' || e.diaperType === 'mixed'));
        
        const { 
            prediction: nextWetPred, 
            lastEventTime: lastWetTime, 
            avgInterval: wetAvgInt,
            confidence: wetConfidence 
        } = predictNextEvent('diaper', { diaperType: 'wet' }); // Predict based on 'wet' only for clarity
        
        const { 
            prediction: nextDirtyPred, 
            lastEventTime: lastDirtyTime, 
            avgInterval: dirtyAvgInt,
            confidence: dirtyConfidence 
        } = predictNextEvent('diaper', { diaperType: 'dirty' }); // Predict based on 'dirty' only
        
        const diaperCard = DOMElements.dashboardContainer.querySelector('.status-card:nth-child(2)');
        if (diaperCard) {
            diaperCard.querySelector('#last-diaper-time').textContent = formatTime(lastDiaper?.timestamp);
            diaperCard.querySelector('#last-diaper-type').textContent = lastDiaper ? lastDiaper.diaperType : '';
            
            // Update with confidence indicators
            const wetPredText = nextWetPred ? 
                `~${formatTime(nextWetPred)} <span class="confidence ${wetConfidence >= 0.8 ? 'high' : (wetConfidence >= 0.5 ? 'medium' : 'low')}" title="Confidence: ${Math.round(wetConfidence * 100)}%"></span>` : 
                (lastWetDiaper ? 'Calculating...' : 'No data');
                
            const dirtyPredText = nextDirtyPred ? 
                `~${formatTime(nextDirtyPred)} <span class="confidence ${dirtyConfidence >= 0.8 ? 'high' : (dirtyConfidence >= 0.5 ? 'medium' : 'low')}" title="Confidence: ${Math.round(dirtyConfidence * 100)}%"></span>` : 
                (lastDirtyDiaper ? 'Calculating...' : 'No data');
            
            diaperCard.querySelector('#next-wet-prediction').innerHTML = wetPredText;
            diaperCard.querySelector('#next-dirty-prediction').innerHTML = dirtyPredText;
            
            // Update progress bars based on the last occurrence of that specific type (wet/dirty)
            updateProgressBar('diaper-progress-wet', lastWetDiaper?.timestamp || null, wetAvgInt, nextWetPred, wetConfidence);
            updateProgressBar('diaper-progress-dirty', lastDirtyDiaper?.timestamp || null, dirtyAvgInt, nextDirtyPred, dirtyConfidence);
        }


        // --- Sleep Status ---
        const lastCompleteSleep = events.find(e => e.type === 'sleep' && e.end);
        const lastSleepStartEvent = events.find(e => e.type === 'sleep' && e.start); // Might be ongoing or completed
        
        const { 
            prediction: nextSleepPred, 
            lastEventTime: lastSleepEndTimeForPred, 
            avgInterval: sleepAvgInt,
            confidence: sleepConfidence 
        } = predictNextEvent('sleep');
        
        const sleepCard = DOMElements.dashboardContainer.querySelector('.status-card:nth-child(3)');
        if (sleepCard) {
            sleepCard.querySelector('#last-sleep-start-time').textContent = formatTime(lastSleepStartEvent?.start);
            sleepCard.querySelector('#last-sleep-end-time').textContent = formatTime(lastCompleteSleep?.end);
            sleepCard.querySelector('#last-sleep-duration').textContent = isSleeping ? 
                `Ongoing: ${formatDuration(now - sleepStartTime)}` : 
                formatDuration(lastCompleteSleep?.duration);
            
            // Update prediction with confidence
            const sleepPredText = isSleeping ? 'Sleeping...' : (nextSleepPred ? 
                `~${formatTime(nextSleepPred)} <span class="confidence ${sleepConfidence >= 0.8 ? 'high' : (sleepConfidence >= 0.5 ? 'medium' : 'low')}" title="Confidence: ${Math.round(sleepConfidence * 100)}%"></span>` : 
                (lastCompleteSleep ? 'Calculating...' : 'No data'));
            
            sleepCard.querySelector('#next-sleep-prediction').innerHTML = sleepPredText;

            // Sleep Button State & Progress Bar Logic
            if (isSleeping) {
                DOMElements.sleepToggleButton.textContent = `End Sleep (${formatDuration(now - sleepStartTime, true)})`; // More precise while ongoing
                DOMElements.sleepToggleButton.classList.add('active', 'danger'); // Use danger color for active sleep ending
                // Progress bar represents sleep duration relative to average nap length (optional visualization)
                const avgSleepDuration = calculateAverageSleepDuration();
                updateProgressBar('sleep-progress', sleepStartTime, avgSleepDuration); // Progress of current sleep vs average
            } else {
                DOMElements.sleepToggleButton.textContent = 'Start Sleep';
                DOMElements.sleepToggleButton.classList.remove('active', 'danger');
                // Progress bar represents awake time relative to average awake interval needed before next nap
                updateProgressBar('sleep-progress', lastSleepEndTimeForPred, sleepAvgInt, nextSleepPred, sleepConfidence);
            }
        }

        // --- Pumping Status ---
        const lastPump = events.find(e => e.type === 'pump');
        const nextScheduledPumpTime = calculateNextScheduledPump();
        
        // Use schedule interval primarily for progress if set, otherwise historical average
        const pumpInterval = pumpSchedule.intervalHours ? 
            pumpSchedule.intervalHours * 60 * 60 * 1000 : 
            calculateAverageInterval('pump')?.avgInterval;
            
        const pumpCard = DOMElements.dashboardContainer.querySelector('.status-card:nth-child(4)');
        if(pumpCard){
            pumpCard.querySelector('#last-pump-time').textContent = formatTime(lastPump?.timestamp);
            pumpCard.querySelector('#last-pump-amount').textContent = lastPump?.amountOz ? 
                `${lastPump.amountOz}oz` : (lastPump ? 'Logged' : '');
            pumpCard.querySelector('#next-pump-schedule').textContent = nextScheduledPumpTime ? 
                `~${formatTime(nextScheduledPumpTime)}` : 
                (pumpSchedule.intervalHours ? 'Calculating...' : 'Set schedule...');
                
            updateProgressBar('pump-progress', lastPump?.timestamp || null, pumpInterval, nextScheduledPumpTime);
        }

        // Update Reports Tab Content (if active or periodically)
        updateDailySummary();
        updateProjections();
        
        // Update Growth Data and Milestones (if baby's DOB is set)
        if (settings.babyDOB && (document.getElementById('growth-tab')?.classList.contains('active') || 
                                document.getElementById('milestones-tab')?.classList.contains('active'))) {
            updateGrowthAndMilestones();
        }
        
        // Check for anomalies to display
        updateAnomalyDisplay();
    };
    
    /**
     * Updates the anomaly display in the dashboard if any exist.
     */
    const updateAnomalyDisplay = () => {
        const anomalyContainer = document.getElementById('anomaly-container');
        if (!anomalyContainer) return;
        
        if (anomalyDetection.detectedAnomalies && anomalyDetection.detectedAnomalies.length > 0) {
            // Show recent, high-severity anomalies
            const recentAnomalies = anomalyDetection.detectedAnomalies.filter(a => 
                a.timestamp > Date.now() - 24 * 60 * 60 * 1000 && // Last 24 hours
                (a.severity === 'warning' || a.severity === 'alert')
            );
            
            if (recentAnomalies.length > 0) {
                anomalyContainer.style.display = 'block';
                
                let anomalyHtml = '<h4>Detected Patterns</h4><ul>';
                recentAnomalies.slice(0, 3).forEach(anomaly => { // Show up to 3
                    anomalyHtml += `<li class="anomaly ${anomaly.severity}">${anomaly.message}</li>`;
                });
                anomalyHtml += '</ul>';
                
                anomalyContainer.innerHTML = anomalyHtml;
            } else {
                anomalyContainer.style.display = 'none';
            }
        } else {
            anomalyContainer.style.display = 'none';
        }
    };
    
    /**
     * Updates growth charts and milestone progress if available.
     */
    const updateGrowthAndMilestones = () => {
        // Update growth charts if tab is active
        const growthTab = document.getElementById('growth-tab');
        if (growthTab?.classList.contains('active')) {
            renderGrowthChart();
        }
        
        // Update milestone progress if tab is active
        const milestonesTab = document.getElementById('milestones-tab');
        if (milestonesTab?.classList.contains('active')) {
            renderMilestones();
        }
    };
    
    /**
     * Renders growth data in charts.
     */
    const renderGrowthChart = () => {
        const canvas = document.getElementById('growth-chart');
        if (!canvas) return;
        
        // Destroy previous chart if exists
        if (window.growthChart) {
            window.growthChart.destroy();
            window.growthChart = null;
        }
        
        const growthType = document.getElementById('growth-type')?.value || 'weight';
        const data = growthData[growthType] || [];
        
        if (data.length < 2) {
            // Show no data message
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '16px Arial';
            ctx.fillText('Not enough growth data to display chart', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        // Sort data by timestamp (ascending)
        data.sort((a, b) => a.timestamp - b.timestamp);
        
        // Prepare chart data
        const labels = data.map(d => formatDate(d.timestamp));
        const values = data.map(d => d.value);
        
        // Get baby's age at each measurement
        const ages = data.map(d => {
            if (!settings.babyDOB) return null;
            const dob = new Date(settings.babyDOB);
            const measureDate = new Date(d.timestamp);
            const ageMs = measureDate - dob;
            const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.44);
            return parseFloat(ageMonths.toFixed(1));
        }).filter(a => a !== null);
        
        // Show percentile references if we have age and gender
        let percentileDatasets = [];
        if (settings.babyDOB && settings.babyGender && ages.length > 0 && GROWTH_REFERENCES[growthType]?.[settings.babyGender]) {
            // Get age range
            const minAge = Math.floor(Math.min(...ages));
            const maxAge = Math.ceil(Math.max(...ages));
            
            // Prepare percentile data
            const percentiles = [3, 50, 97]; // 3rd, 50th, 97th percentiles
            const percentileLabels = ['3rd percentile', '50th percentile', '97th percentile'];
            const percentileColors = ['rgba(200,200,200,0.7)', 'rgba(150,150,150,0.7)', 'rgba(200,200,200,0.7)'];
            
            // Generate data points for each percentile line
            for (let i = 0; i < percentiles.length; i++) {
                const percentileValues = [];
                const percentileAges = [];
                
                for (let age = minAge; age <= maxAge; age++) {
                    const referenceData = GROWTH_REFERENCES[growthType]?.[settings.babyGender]?.[age];
                    if (referenceData) {
                        percentileValues.push(referenceData[i]);
                        percentileAges.push(age);
                    }
                }
                
                if (percentileValues.length > 0) {
                    percentileDatasets.push({
                        label: percentileLabels[i],
                        data: percentileValues,
                        borderColor: percentileColors[i],
                        borderWidth: 1,
                        fill: false,
                        pointRadius: 0,
                        borderDash: [5, 5],
                        xAxisID: 'age'
                    });
                }
            }
        }
        
        // Create chart
        window.growthChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: growthType === 'weight' ? 'Weight' : 
                               (growthType === 'length' ? 'Length/Height' : 'Head Circumference'),
                        data: values,
                        borderColor: 'rgba(110, 205, 207, 1)',
                        backgroundColor: 'rgba(110, 205, 207, 0.2)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    },
                    ...percentileDatasets
                ]
            },
            options: {
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    age: {
                        type: 'linear',
                        position: 'top',
                        title: {
                            display: true,
                            text: 'Age (months)'
                        },
                        grid: {
                            drawOnChartArea: false
                        },
                        display: ages.length > 0
                    },
                    y: {
                        title: {
                            display: true,
                            text: growthType === 'weight' ? 
                                  (settings.weightUnit === 'lb' ? 'Weight (lb)' : 'Weight (kg)') : 
                                  (growthType === 'length' ? 
                                      (settings.lengthUnit === 'in' ? 'Length (in)' : 'Length (cm)') : 
                                      'Head Circumference (cm)')
                        },
                        beginAtZero: false
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                
                                const value = context.parsed.y;
                                
                                if (growthType === 'weight') {
                                    label += settings.weightUnit === 'lb' ? 
                                            `${value.toFixed(2)} lb` : 
                                            `${value.toFixed(2)} kg`;
                                } else if (growthType === 'length') {
                                    label += settings.lengthUnit === 'in' ? 
                                            `${value.toFixed(1)} in` : 
                                            `${value.toFixed(1)} cm`;
                                } else {
                                    label += `${value.toFixed(1)} cm`;
                                }
                                
                                // Add age if available
                                if (ages[context.dataIndex] !== undefined) {
                                    label += ` (${ages[context.dataIndex]} months)`;
                                }
                                
                                return label;
                            }
                        }
                    }
                }
            }
        });
    };
    
    /**
     * Renders milestone progress.
     */
    const renderMilestones = () => {
        const container = document.getElementById('milestones-container');
        if (!container) return;
        
        // Get baby's age
        const age = getBabyAge();
        if (!age) {
            container.innerHTML = '<p>Please set your baby\'s date of birth in settings to track milestones.</p>';
            return;
        }
        
        let html = '';
        
        // Completed milestones
        html += '<h4>Completed Milestones</h4>';
        if (milestoneData.completed.length === 0) {
            html += '<p>No milestones marked as completed yet.</p>';
        } else {
            html += '<ul class="milestone-list">';
            milestoneData.completed
                .sort((a, b) => b.timestamp - a.timestamp) // Newest first
                .slice(0, 10) // Show last 10
                .forEach(milestone => {
                    const date = formatDate(milestone.timestamp);
                    const ageAt = milestone.ageAtCompletion ? 
                        `at ${milestone.ageAtCompletion.toFixed(1)} months` : '';
                        
                    html += `<li class="milestone completed">
                        <span class="milestone-check">✓</span>
                        <div class="milestone-details">
                            <strong>${milestone.name}</strong>
                            <span>${date} ${ageAt}</span>
                            ${milestone.notes ? `<p>${milestone.notes}</p>` : ''}
                        </div>
                    </li>`;
                });
            html += '</ul>';
        }
        
        // Upcoming milestones
        html += '<h4>Upcoming Milestones</h4>';
        if (milestoneData.upcoming.length === 0) {
            html += '<p>No upcoming milestones found for this age.</p>';
        } else {
            html += '<ul class="milestone-list">';
            milestoneData.upcoming
                .slice(0, 10) // Show next 10
                .forEach(milestone => {
                    const timeframe = milestone.ageMonth <= age.totalMonths ? 
                        'Expected now' : 
                        `Expected around ${milestone.ageMonth} months`;
                        
                    html += `<li class="milestone upcoming">
                        <span class="milestone-dot"></span>
                        <div class="milestone-details">
                            <strong>${milestone.name}</strong>
                            <span>${timeframe}</span>
                        </div>
                        <button class="mark-complete" data-milestone="${milestone.name}">Mark Complete</button>
                    </li>`;
                });
            html += '</ul>';
        }
        
        container.innerHTML = html;
        
        // Add event listeners for milestone completion buttons
        container.querySelectorAll('.mark-complete').forEach(button => {
            button.addEventListener('click', function() {
                const milestoneName = this.dataset.milestone;
                if (milestoneName) {
                    openMilestoneModal(milestoneName);
                }
            });
        });
    };
    
    /**
     * Opens modal for marking a milestone as completed.
     * @param {string} milestoneName - Name of the milestone.
     */
    const openMilestoneModal = (milestoneName) => {
        // Implementation would be similar to other modals
        // For brevity, just complete the milestone directly in this demo
        completeMilestone(milestoneName);
    };

    const renderEventList = () => {
        if (!DOMElements.eventList) return;
        DOMElements.eventList.innerHTML = ''; // Clear previous list

        const filter = DOMElements.historyFilter.value;
        const limit = DOMElements.historyLimit.value === 'all' ? Infinity : parseInt(DOMElements.historyLimit.value);

        let filteredEvents = events;
        if (filter !== 'all') {
            filteredEvents = events.filter(e => e.type === filter);
        }

        const eventsToDisplay = filteredEvents.slice(0, limit);

        if (eventsToDisplay.length === 0) {
            DOMElements.eventList.innerHTML = '<li class="empty-list-item">No events match the current filter.</li>';
            return;
        }

        const fragment = document.createDocumentFragment();
        eventsToDisplay.forEach(event => {
            const li = document.createElement('li');
            li.dataset.eventId = event.id;

            const timeSpan = document.createElement('span');
            timeSpan.className = 'event-time';
            // Display start/end for sleep, timestamp for others
            const displayTime = (event.type === 'sleep' && event.start) ? event.start : event.timestamp;
            timeSpan.textContent = formatDateTime(displayTime);
            timeSpan.title = `Event ID: ${event.id}`; // Add ID to title for debugging

            const detailsSpan = document.createElement('span');
            detailsSpan.className = 'event-details';
            detailsSpan.innerHTML = getEventDescription(event); // Use innerHTML for icons

            const actionsSpan = document.createElement('span');
            actionsSpan.className = 'event-actions';

            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.onclick = (e) => {
                e.stopPropagation(); // Prevent li click if needed
                openEditModal(event.id);
            };
            actionsSpan.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'delete';
            deleteButton.onclick = (e) => {
                 e.stopPropagation();
                 deleteEvent(event.id);
            };
            actionsSpan.appendChild(deleteButton);

            li.appendChild(timeSpan);
            li.appendChild(detailsSpan);
            li.appendChild(actionsSpan);
            fragment.appendChild(li);
        });
        DOMElements.eventList.appendChild(fragment);
    };

    const getEventDescription = (event) => {
         // Use icons for better visual cues
         const icons = { 
             feeding: '🍼', 
             diaper: '💩', 
             sleep: '😴', 
             pump: '🥛', 
             mood: '😊', 
             gas: '💨',
             weight: '⚖️',
             length: '📏',
             headCircumference: '📐',
             temperature: '🌡️',
             medicine: '💊',
             milestone: '🏆'
         };
         let icon = icons[event.type] || '❓';
         let details = '';

        switch (event.type) {
            case 'feeding':
                icon = event.feedType === 'bottle' ? '🍼' : '🤱';
                if (event.feedType === 'bottle') {
                    details = `Bottle: <strong>${event.amountOz || '?'} oz</strong>`;
                } else {
                     details = `Breast: <strong>${event.durationMin || '?'} min</strong> ${event.side ? `(${event.side})` : ''}`;
                }
                break;
            case 'diaper':
                 icon = event.diaperType === 'dirty' ? '💩' : (event.diaperType === 'mixed' ? '💩💧': '💧');
                details = `Diaper: <strong>${event.diaperType}</strong>`;
                break;
            case 'sleep':
                 if (event.start && event.end) {
                    details = `Sleep: <strong>${formatDuration(event.duration)}</strong> (Ended ${formatTime(event.end)})`;
                 } else if (isSleeping && event.id === 'current_sleep_placeholder') { // Special case for live update
                     details = `Sleeping: <strong>${formatDuration(Date.now() - event.start)}</strong>...`;
                 } else if (event.start) { // Manually logged start without end yet
                      details = `Sleep Started: ${formatTime(event.start)}`;
                 } else {
                      details = `Sleep Event (Legacy/Unknown)`; // Fallback
                 }
                break;
            case 'pump':
                details = `Pump: <strong>${event.amountOz || '?'} oz</strong>`;
                break;
            case 'mood':
                details = `Mood: <strong>${event.moodType || 'Not specified'}</strong>`;
                break;
             case 'gas':
                 details = `Gas/Fussiness`;
                 break;
            default:
                details = `${event.type.charAt(0).toUpperCase() + event.type.slice(1)}`;
        }
         // Append notes if they exist
         if (event.notes) {
             details += ` <span class="event-notes">- ${event.notes}</span>`; // Add a class for potential styling
         }

        return `${icon} ${details}`;
    };

    const updateUI = () => {
        updateClock(); // Update clock immediately
        updateDashboard();
        renderEventList(); // Update history list based on current filters
        renderChart(); // Update chart based on current selection and data
        
        // Apply current theme
        applyTheme();
    };
    
    /**
     * Applies the current theme (light/dark).
     */
    const applyTheme = () => {
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add(`theme-${settings.theme || 'light'}`);
    };

    // --- Modal Handling ---
    const openModal = (action, eventId = null) => {
        if (!DOMElements.modal || !DOMElements.logForm) return;

        DOMElements.logForm.innerHTML = ''; // Clear previous form
        DOMElements.logForm.dataset.action = action;
        DOMElements.logForm.dataset.eventId = eventId || ''; // Store eventId for editing

        let eventData = {};
        let title = "Log New Event";
        if (eventId) {
             eventData = events.find(e => e.id === eventId);
             if (!eventData) {
                  logError("Cannot edit: Event not found", eventId);
                  alert("Error: Could not find the event to edit.");
                  return;
             }
             title = "Edit Event";
        }

         // --- Form Field Generation ---
         const formFields = [];

         // Common Fields
         formFields.push(createFormLabel("Time:", "event-time"));
         formFields.push(createFormInput("datetime-local", "event-time", eventData.timestamp ? new Date(eventData.timestamp - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : getCurrentLocalDateTimeValue(), true));

        // Type Specific Fields
        let eventTypeForForm = action.replace('log', '').replace('edit_', '').toLowerCase(); // 'feed' -> 'feeding' etc.

         // If editing, derive type from event data, otherwise from action
         if (eventId && eventData.type) {
             eventTypeForForm = eventData.type;
         } else if (action === 'logFeed') {
              eventTypeForForm = 'feeding';
         } else if (action === 'logDiaper') {
              eventTypeForForm = 'diaper';
         } else if (action === 'logPump') {
             eventTypeForForm = 'pump';
         } else if (action === 'logGrowth') {
             eventTypeForForm = 'growth'; // New event type for growth measurements
         } else if (action === 'logTemperature') {
             eventTypeForForm = 'temperature'; // New event type for temperature
         } else if (action === 'logMedicine') {
             eventTypeForForm = 'medicine'; // New event type for medicine
         } else if (action === 'logMilestone') {
             eventTypeForForm = 'milestone'; // New event type for milestones
         }

        switch (eventTypeForForm) {
            case 'feeding':
                title = eventId ? "Edit Feed" : "Log Feed";
                formFields.push(createRadioGroup("Feed Type:", "feedType", [
                    { label: "🍼 Bottle", value: "bottle", checked: eventData.feedType === 'bottle' || (!eventId && true) }, // Default bottle
                    { label: "🤱 Breast", value: "breast", checked: eventData.feedType === 'breast' }
                ]));
                formFields.push(createFormLabel("Amount (oz, if bottle):", "feed-amount"));
                formFields.push(createFormInput("number", "feed-amount", eventData.amountOz || '', false, { min: 0, step: 0.1, placeholder: "e.g., 4.5" }));
                formFields.push(createFormLabel("Duration (min, if breast):", "feed-duration"));
                formFields.push(createFormInput("number", "feed-duration", eventData.durationMin || '', false, { min: 0, step: 1, placeholder: "e.g., 15" }));
                formFields.push(createFormLabel("Breast Side (if breast):", "feed-side"));
                formFields.push(createSelect("feed-side", [
                    { label: "Not Applicable", value: ""},
                    { label: "Left", value: "L"},
                    { label: "Right", value: "R"},
                    { label: "Both", value: "Both"}
                ], eventData.side || ''));
                 formFields.push(createFormLabel("Notes (Optional):", "feed-notes"));
                 formFields.push(createTextArea("feed-notes", eventData.notes || '', "Any observations?"));
                break;
            case 'diaper':
                title = eventId ? "Edit Diaper" : "Log Diaper";
                formFields.push(createRadioGroup("Diaper Type:", "diaperType", [
                    { label: "💧 Wet", value: "wet", checked: eventData.diaperType === 'wet' || (!eventId && true)}, // Default wet
                    { label: "💩 Dirty", value: "dirty", checked: eventData.diaperType === 'dirty' },
                    { label: "💩💧 Mixed", value: "mixed", checked: eventData.diaperType === 'mixed' }
                ]));
                formFields.push(createFormLabel("Notes (Optional):", "diaper-notes"));
                formFields.push(createTextArea("diaper-notes", eventData.notes || '', "Color, consistency, etc.?"));
                break;
            case 'pump':
                 title = eventId ? "Edit Pump Session" : "Log Pump Session";
                 formFields.push(createFormLabel("Total Amount Pumped (oz):", "pump-amount"));
                 formFields.push(createFormInput("number", "pump-amount", eventData.amountOz || '', false, { min: 0, step: 0.1, placeholder: "e.g., 3.0" }));
                 formFields.push(createFormLabel("Notes (Optional):", "pump-notes"));
                 formFields.push(createTextArea("pump-notes", eventData.notes || '', "Duration, side(s)?"));
                break;
             case 'sleep': // Editing existing sleep requires start/end times
                 title = eventId ? "Edit Sleep Record" : "Log Past Sleep"; // Assume logging past sleep if no ID
                 formFields.push(createFormLabel("Sleep Start Time:", "sleep-start"));
                 formFields.push(createFormInput("datetime-local", "sleep-start", eventData.start ? new Date(eventData.start - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '', true));
                 formFields.push(createFormLabel("Sleep End Time (Optional - leave blank if ongoing):", "sleep-end"));
                 formFields.push(createFormInput("datetime-local", "sleep-end", eventData.end ? new Date(eventData.end - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '', false));
                 formFields.push(createFormLabel("Notes (Optional):", "sleep-notes"));
                 formFields.push(createTextArea("sleep-notes", eventData.notes || '', "Location, quality?"));
                // Note: The main 'timestamp' field will be automatically set to the END time when saving/updating.
                 break;
             case 'gas':
                 title = eventId ? "Edit Gas/Fussiness Event" : "Log Gas/Fussiness";
                 formFields.push(createFormLabel("Notes (Optional):", "gas-notes"));
                 formFields.push(createTextArea("gas-notes", eventData.notes || '', "Severity, remedies tried?"));
                 break;
             case 'growth':
                 title = "Log Growth Measurement";
                 formFields.push(createFormLabel("Measurement Type:", "growth-type"));
                 formFields.push(createSelect("growth-type", [
                     { label: "Weight", value: "weight" },
                     { label: "Length/Height", value: "length" },
                     { label: "Head Circumference", value: "headCircumference" }
                 ], "weight"));
                 
                 formFields.push(createFormLabel(`Value (${settings.weightUnit})`, "growth-value"));
                 formFields.push(createFormInput("number", "growth-value", '', true, { min: 0, step: 0.1, placeholder: "e.g., 15.5" }));
                 
                 formFields.push(createFormLabel("Notes (Optional):", "growth-notes"));
                 formFields.push(createTextArea("growth-notes", '', "Any additional information"));
                 break;
             case 'temperature':
                 title = "Log Temperature";
                 formFields.push(createFormLabel(`Temperature (${settings.temperatureUnit.toUpperCase()})`, "temp-value"));
                 formFields.push(createFormInput("number", "temp-value", '', true, { min: 0, step: 0.1, placeholder: settings.temperatureUnit === 'f' ? "e.g., 98.6" : "e.g., 37.0" }));
                 
                 formFields.push(createFormLabel("Measurement Location:", "temp-location"));
                 formFields.push(createSelect("temp-location", [
                     { label: "Axillary (Armpit)", value: "axillary" },
                     { label: "Oral", value: "oral" },
                     { label: "Rectal", value: "rectal" },
                     { label: "Tympanic (Ear)", value: "ear" },
                     { label: "Forehead", value: "forehead" }
                 ], "axillary"));
                 
                 formFields.push(createFormLabel("Notes (Optional):", "temp-notes"));
                 formFields.push(createTextArea("temp-notes", '', "Any symptoms or information"));
                 break;
             case 'medicine':
                 title = "Log Medicine";
                 formFields.push(createFormLabel("Medicine Name:", "medicine-name"));
                 formFields.push(createFormInput("text", "medicine-name", '', true, { placeholder: "e.g., Tylenol" }));
                 
                 formFields.push(createFormLabel("Dose:", "medicine-dose"));
                 formFields.push(createFormInput("text", "medicine-dose", '', false, { placeholder: "e.g., 2.5ml" }));
                 
                 formFields.push(createFormLabel("Notes (Optional):", "medicine-notes"));
                 formFields.push(createTextArea("medicine-notes", '', "Reason for medication, etc."));
                 break;
             case 'milestone':
                 title = "Log Milestone";
                 
                 // If editing existing milestone
                 if (eventId) {
                     formFields.push(createFormLabel("Milestone:", "milestone-name"));
                     formFields.push(createFormInput("text", "milestone-name", eventData.name || '', true, { placeholder: "e.g., First smile" }));
                 } 
                 // If completing from upcoming list
                 else if (action.includes("complete_")) {
                     const milestoneName = action.replace("complete_", "");
                     formFields.push(createFormInput("hidden", "milestone-name", milestoneName));
                     formFields.push(createFormLabel("Milestone:", "milestone-display"));
                     formFields.push(createFormElement("p", { id: "milestone-display", class: "form-display-text" }, milestoneName));
                 }
                 // If creating new milestone
                 else {
                     const upcomingOptions = milestoneData.upcoming.map(m => ({ label: m.name, value: m.name }));
                     upcomingOptions.unshift({ label: "-- Select a milestone --", value: "" });
                     upcomingOptions.push({ label: "Custom milestone (enter below)", value: "custom" });
                     
                     formFields.push(createFormLabel("Select Milestone:", "milestone-select"));
                     formFields.push(createSelect("milestone-select", upcomingOptions, ""));
                     
                     formFields.push(createFormLabel("Or Enter Custom Milestone:", "milestone-name"));
                     formFields.push(createFormInput("text", "milestone-name", '', false, { placeholder: "e.g., First steps" }));
                 }
                 
                 formFields.push(createFormLabel("Notes (Optional):", "milestone-notes"));
                 formFields.push(createTextArea("milestone-notes", eventData.notes || '', "Any details about this achievement"));
                 break;
        }

         // Append all generated fields to the form
         const fragment = document.createDocumentFragment();
         formFields.forEach(field => fragment.appendChild(field));
         DOMElements.logForm.appendChild(fragment);

         // Submit Button (only if fields were added)
         if (formFields.length > 1) { // At least timestamp + 1 other field
            const submitButton = document.createElement('button');
            submitButton.type = 'submit';
            submitButton.textContent = eventId ? 'Save Changes' : 'Log Event';
            DOMElements.logForm.appendChild(submitButton);
         }

        DOMElements.modalTitle.textContent = title;
        DOMElements.modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling

        // Auto-focus first input for usability
        const firstInput = DOMElements.logForm.querySelector('input:not([type="radio"]), select, textarea');
        if(firstInput) firstInput.focus();
        
        // Add special event handlers for interactive forms
        addModalInteractivity(eventTypeForForm);
    };
    
    /**
     * Adds interactive elements to modal forms based on event type.
     * @param {string} eventType - Type of event being edited.
     */
    const addModalInteractivity = (eventType) => {
        if (!DOMElements.logForm) return;
        
        switch(eventType) {
            case 'feeding':
                // Show/hide fields based on feed type selection
                const feedTypeInputs = DOMElements.logForm.querySelectorAll('input[name="feedType"]');
                const amountField = DOMElements.logForm.querySelector('#feed-amount').parentNode;
                const durationField = DOMElements.logForm.querySelector('#feed-duration').parentNode;
                const sideField = DOMElements.logForm.querySelector('#feed-side').parentNode;
                
                const updateFeedingFields = () => {
                    const selectedType = DOMElements.logForm.querySelector('input[name="feedType"]:checked').value;
                    
                    if (selectedType === 'bottle') {
                        amountField.style.display = 'block';
                        durationField.style.display = 'none';
                        sideField.style.display = 'none';
                    } else { // breast
                        amountField.style.display = 'none';
                        durationField.style.display = 'block';
                        sideField.style.display = 'block';
                    }
                };
                
                feedTypeInputs.forEach(input => {
                    input.addEventListener('change', updateFeedingFields);
                });
                
                // Initialize visibility
                updateFeedingFields();
                break;
                
            case 'milestone':
                // Handle custom milestone selection/entry
                const milestoneSelect = DOMElements.logForm.querySelector('#milestone-select');
                const milestoneNameField = DOMElements.logForm.querySelector('#milestone-name');
                
                if (milestoneSelect && milestoneNameField) {
                    milestoneSelect.addEventListener('change', () => {
                        if (milestoneSelect.value === 'custom') {
                            milestoneNameField.disabled = false;
                            milestoneNameField.required = true;
                            milestoneNameField.focus();
                        } else if (milestoneSelect.value) {
                            milestoneNameField.value = milestoneSelect.value;
                            milestoneNameField.disabled = true;
                            milestoneNameField.required = false;
                        } else {
                            milestoneNameField.value = '';
                            milestoneNameField.disabled = false;
                            milestoneNameField.required = true;
                        }
                    });
                    
                    // Initialize state
                    milestoneSelect.dispatchEvent(new Event('change'));
                }
                break;
                
            case 'growth':
                // Update label based on measurement type
                const growthTypeSelect = DOMElements.logForm.querySelector('#growth-type');
                const valueLabel = DOMElements.logForm.querySelector('label[for="growth-value"]');
                
                if (growthTypeSelect && valueLabel) {
                    growthTypeSelect.addEventListener('change', () => {
                        const selectedType = growthTypeSelect.value;
                        if (selectedType === 'weight') {
                            valueLabel.textContent = `Weight (${settings.weightUnit}):`;
                        } else if (selectedType === 'length') {
                            valueLabel.textContent = `Length (${settings.lengthUnit}):`;
                        } else { // headCircumference
                            valueLabel.textContent = 'Head Circumference (cm):';
                        }
                    });
                    
                    // Initialize label
                    growthTypeSelect.dispatchEvent(new Event('change'));
                }
                break;
        }
    };

     const openEditModal = (eventId) => {
        const event = events.find(e => e.id === eventId);
        if (event) {
            // Use the event's type to determine which form to show
            openModal(`edit_${event.type}`, eventId);
        } else {
            logError("Event not found for editing:", eventId);
            alert("Error: Could not find the event data to edit.");
        }
    };


    const closeModal = () => {
        if (!DOMElements.modal) return;
        DOMElements.modal.style.display = 'none';
        if (DOMElements.logForm) {
            DOMElements.logForm.reset(); // Reset form fields
            DOMElements.logForm.dataset.action = '';
            DOMElements.logForm.dataset.eventId = '';
        }
        document.body.style.overflow = ''; // Restore background scrolling
    };

    // --- Form Element Creation Helpers ---
    const createFormElement = (tag, attributes = {}, textContent = null) => {
        const element = document.createElement(tag);
        Object.entries(attributes).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                element.setAttribute(key, value);
            }
        });
        if (textContent) {
            element.textContent = textContent;
        }
        return element;
    };

    const createFormLabel = (text, htmlFor) => createFormElement('label', { for: htmlFor }, text);
    const createFormInput = (type, id, value = '', required = false, attributes = {}) => createFormElement('input', { type, id, name: id, value, required, ...attributes });
    const createTextArea = (id, value = '', placeholder = '') => createFormElement('textarea', { id, name: id, rows: 3, placeholder }, value);
    const createSelect = (id, options, selectedValue = '') => {
        const select = createFormElement('select', { id, name: id });
        options.forEach(opt => {
            const option = createFormElement('option', { value: opt.value }, opt.label);
            if (opt.value === selectedValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        return select;
    };
    const createRadioGroup = (labelText, name, options) => {
         const fieldset = createFormElement('fieldset', { class: 'radio-group' });
         fieldset.appendChild(createFormElement('legend', {}, labelText));
         options.forEach(opt => {
             const uniqueId = `${name}-${opt.value}`;
             const div = createFormElement('div');
             const input = createFormElement('input', { type: 'radio', id: uniqueId, name, value: opt.value, checked: opt.checked || null });
             const label = createFormElement('label', { for: uniqueId });
             label.innerHTML = opt.label; // Allow HTML in label (for icons)
             div.appendChild(input);
             div.appendChild(label);
             fieldset.appendChild(div);
         });
         return fieldset;
     };

    // --- Event Form Submission Logic ---
    const handleFormSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(DOMElements.logForm);
        const data = Object.fromEntries(formData.entries()); // Modern way to get form data as object

        const action = DOMElements.logForm.dataset.action;
        const eventId = DOMElements.logForm.dataset.eventId;
        const timestamp = getTimestamp(data['event-time']);

        let eventData = { timestamp };
        let eventType = '';

        // Determine event type based on action/form structure
         if (action.includes('feed')) eventType = 'feeding';
         else if (action.includes('diaper')) eventType = 'diaper';
         else if (action.includes('pump')) eventType = 'pump';
         else if (action.includes('sleep')) eventType = 'sleep';
         else if (action.includes('gas')) eventType = 'gas';
         else if (action.includes('growth')) eventType = 'growth';
         else if (action.includes('temperature')) eventType = 'temperature';
         else if (action.includes('medicine')) eventType = 'medicine';
         else if (action.includes('milestone')) eventType = 'milestone';
         // Add other types based on action strings...

         if (!eventType) {
             logError("Could not determine event type during form submission.", action);
             alert("Error: Could not save event, unknown type.");
             return;
         }
         eventData.type = eventType;

        // --- Process form data into structured eventData ---
        switch (eventType) {
            case 'feeding':
                eventData.feedType = data.feedType;
                eventData.amountOz = data.feedType === 'bottle' ? (parseFloat(data['feed-amount']) || null) : null;
                eventData.durationMin = data.feedType === 'breast' ? (parseInt(data['feed-duration']) || null) : null;
                eventData.side = data.feedType === 'breast' ? (data['feed-side'] || null) : null;
                eventData.notes = data['feed-notes'] || null;
                break;
            case 'diaper':
                eventData.diaperType = data.diaperType;
                eventData.notes = data['diaper-notes'] || null;
                break;
            case 'pump':
                eventData.amountOz = parseFloat(data['pump-amount']) || null;
                eventData.notes = data['pump-notes'] || null;
                break;
            case 'sleep':
                 eventData.start = data['sleep-start'] ? getTimestamp(data['sleep-start']) : null;
                 eventData.end = data['sleep-end'] ? getTimestamp(data['sleep-end']) : null;
                 eventData.notes = data['sleep-notes'] || null;
                 if (eventData.start && eventData.end) {
                     if (eventData.end < eventData.start) {
                         alert("Warning: Sleep end time cannot be before start time.");
                         return; // Prevent saving invalid duration
                     }
                     eventData.duration = eventData.end - eventData.start;
                     // Set the primary timestamp to the END time for completed sleep events
                     eventData.timestamp = eventData.end;
                 } else if (eventData.start) {
                     // If only start time is provided, use start time as the main timestamp
                     eventData.timestamp = eventData.start;
                     eventData.duration = null; // Explicitly null duration
                 } else {
                     // Should not happen if start is required, but handle defensively
                     alert("Error: Sleep start time is required.");
                     return;
                 }
                break;
             case 'gas':
                 eventData.notes = data['gas-notes'] || null;
                 break;
             case 'growth':
                 // Handle growth measurements (actually stores in separate collection)
                 const growthType = data['growth-type'];
                 const growthValue = parseFloat(data['growth-value']);
                 
                 if (!growthType || isNaN(growthValue)) {
                     alert("Error: Both measurement type and value are required.");
                     return;
                 }
                 
                 addGrowthMeasurement(growthType, growthValue, timestamp);
                 eventData = null; // Don't add to main events array
                 break;
             case 'temperature':
                 // Handle temperature (stores in separate collection)
                 const tempValue = parseFloat(data['temp-value']);
                 const tempLocation = data['temp-location'] || 'axillary';
                 
                 if (isNaN(tempValue)) {
                     alert("Error: Temperature value is required.");
                     return;
                 }
                 
                 addTemperature(tempValue, tempLocation, timestamp);
                 eventData = null; // Don't add to main events array
                 break;
             case 'medicine':
                 // Handle medicine (stores in separate collection)
                 const medicineName = data['medicine-name'];
                 const medicineDose = data['medicine-dose'] || '';
                 const medicineNotes = data['medicine-notes'] || '';
                 
                 if (!medicineName) {
                     alert("Error: Medicine name is required.");
                     return;
                 }
                 
                 addMedicine(medicineName, medicineDose, medicineNotes, timestamp);
                 eventData = null; // Don't add to main events array
                 break;
             case 'milestone':
                 // Handle milestone (stores in separate collection)
                 let milestoneName = data['milestone-name'];
                 
                 // If using select dropdown, get the selected value
                 if (data['milestone-select'] && data['milestone-select'] !== 'custom') {
                     milestoneName = data['milestone-select'];
                 }
                 
                 const milestoneNotes = data['milestone-notes'] || '';
                 
                 if (!milestoneName) {
                     alert("Error: Milestone name is required.");
                     return;
                 }
                 
                 completeMilestone(milestoneName, milestoneNotes, timestamp);
                 eventData = null; // Don't add to main events array
                 break;
            // Add processing for other event types...
        }

         // --- Only proceed with event operations if we have event data ---
         if (eventData) {
             // Clean up null/empty string values
             Object.keys(eventData).forEach(key => {
                if (eventData[key] === null || eventData[key] === '') {
                    delete eventData[key]; // Remove empty fields for cleaner data object
                }
            });

            // --- Add or Update ---
             if (eventId) {
                updateEvent(eventId, eventData); // Pass only the changed/relevant data
             } else {
                addEvent(eventData);
            }
         }

        closeModal();
        
        // Special case: if the form was for milestone/growth/temperature, update those views
        if (['growth', 'milestone', 'temperature'].includes(eventType)) {
            updateGrowthAndMilestones();
        }
    };

    // --- Sleep Toggle Logic ---
    const handleSleepToggle = () => {
        const now = Date.now();
        if (isSleeping) {
            // --- Ending sleep ---
            if (!sleepStartTime) {
                logError("Cannot end sleep: Start time is missing.");
                // Maybe force reset state?
                isSleeping = false;
                saveData();
                updateUI();
                return;
            }
            const duration = now - sleepStartTime;
            addEvent({
                type: 'sleep',
                start: sleepStartTime,
                end: now,
                timestamp: now, // Use end time as the primary timestamp for sorting/prediction base
                duration: duration
            });
            isSleeping = false;
            sleepStartTime = null;
            logInfo(`Sleep ended. Duration: ${formatDuration(duration)}`);
        } else {
            // --- Starting sleep ---
            isSleeping = true;
            sleepStartTime = now;
             logInfo("Sleep started at:", formatTime(new Date(now)));
             // No event added here; event is logged when sleep ENDS.
             // The dashboard will update based on the isSleeping state.
        }
        saveData(); // Save the changed sleep state
        updateUI(); // Update button text, dashboard, potentially trigger alarm checks
    };

    // --- Quick Action Button Handler ---
    const handleDashboardClick = (e) => {
         if (e.target.classList.contains('quick-action')) {
             const action = e.target.dataset.action;
             if (!action) return;

             if (action === 'toggleSleep') {
                 handleSleepToggle(); // Directly call sleep handler
             } else if (action === 'managePumpSchedule') {
                 switchTab('settings');
                 DOMElements.pumpIntervalInput?.focus(); // Focus relevant input in settings
             } else if (action.startsWith('log')) {
                 openModal(action); // Open modal for logging feed, diaper, pump etc.
             } else {
                  logWarning(`Unhandled quick action: ${action}`);
             }
         }
     };

    // --- Tab Navigation ---
     const switchTab = (tabId) => {
          if (!tabId) return;
          DOMElements.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
          DOMElements.tabContents.forEach(tc => tc.classList.toggle('active', tc.id === tabId));

          // Re-render dynamic content when tab becomes active
          if (tabId === 'charts') renderChart();
          if (tabId === 'history') renderEventList();
          if (tabId === 'reports') {
              updateDailySummary();
              updateProjections();
          }
          if (tabId === 'growth') {
              renderGrowthChart();
          }
          if (tabId === 'milestones') {
              renderMilestones();
          }
     };

     const handleTabClick = (e) => {
         if (e.target.classList.contains('tab-link')) {
            const tabId = e.target.dataset.tab;
            switchTab(tabId);
        }
     };

    // --- Charting Logic ---
    const renderChart = () => {
        if (!DOMElements.chartCanvas || !DOMElements.chartTypeSelect) return;
        if (!document.getElementById('charts').classList.contains('active')) return; // Only render if tab is visible

        const selectedChart = DOMElements.chartTypeSelect.value;
        const ctx = DOMElements.chartCanvas.getContext('2d');

        if (currentChart) {
            currentChart.destroy(); // Destroy previous chart instance cleanly
            currentChart = null;
        }

        const chartDataConfig = generateChartData(selectedChart);

        if (!chartDataConfig || !chartDataConfig.data.labels || chartDataConfig.data.labels.length === 0) {
             // Display a "No data" message on the canvas
             ctx.clearRect(0, 0, DOMElements.chartCanvas.width, DOMElements.chartCanvas.height);
             ctx.save(); // Save context state
             ctx.textAlign = "center";
             ctx.textBaseline = "middle";
             ctx.fillStyle = "#888";
             ctx.font = `16px ${getComputedStyle(document.body).fontFamily}`;
             ctx.fillText("Not enough data to display this chart yet.", DOMElements.chartCanvas.width / 2, DOMElements.chartCanvas.height / 2);
             ctx.restore(); // Restore context state
             return;
         }

        try {
            currentChart = new Chart(ctx, chartDataConfig);
        } catch (error) {
             logError("Failed to create chart.", error);
             // Display error message on canvas
             ctx.clearRect(0, 0, DOMElements.chartCanvas.width, DOMElements.chartCanvas.height);
             ctx.save();
             ctx.textAlign = "center";
             ctx.textBaseline = "middle";
             ctx.fillStyle = "#d9534f"; // Error color
             ctx.font = `16px ${getComputedStyle(document.body).fontFamily}`;
             ctx.fillText("Error displaying chart.", DOMElements.chartCanvas.width / 2, DOMElements.chartCanvas.height / 2);
             ctx.restore();
        }
    };

    const generateChartData = (chartType) => {
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
        const sevenDaysAgoStart = new Date(todayEnd);
        sevenDaysAgoStart.setDate(todayEnd.getDate() - 6); // Get 7 full days including today
        sevenDaysAgoStart.setHours(0, 0, 0, 0);

        // Filter events relevant to the chart timeframe (e.g., last 7 days)
        const recentEvents = events.filter(e => e.timestamp >= sevenDaysAgoStart.getTime() && e.timestamp <= todayEnd.getTime());
        recentEvents.sort((a, b) => a.timestamp - b.timestamp); // Sort ascending for processing

        // Prepare labels for the last 7 days
        const labels = [];
        const dailyDataBuckets = {}; // { 'M/D': { feeding: [events], sleep: [events] } }
        for (let i = 0; i < 7; i++) {
             const date = new Date(sevenDaysAgoStart);
             date.setDate(sevenDaysAgoStart.getDate() + i);
             const label = date.toLocaleDateString([], { month: 'numeric', day: 'numeric' }); // Use M/D format
             labels.push(label);
             dailyDataBuckets[label] = {}; // Initialize bucket for each day
         }

         // Populate daily buckets
         recentEvents.forEach(event => {
            const eventDate = new Date(event.timestamp);
            const dateLabel = eventDate.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
            if (dailyDataBuckets[dateLabel]) {
                 if (!dailyDataBuckets[dateLabel][event.type]) {
                     dailyDataBuckets[dateLabel][event.type] = [];
                 }
                 dailyDataBuckets[dateLabel][event.type].push(event);
            }
        });

        let config = {
             type: 'bar',
             data: { labels: labels, datasets: [] },
             options: {
                 responsive: true,
                 maintainAspectRatio: false,
                 scales: { y: { beginAtZero: true, title: { display: true, text: 'Count' } } }, // Default Y axis
                 plugins: {
                     title: { display: true, text: '', font: { size: 16 } },
                     tooltip: {
                         mode: 'index',
                         intersect: false,
                         callbacks: {} // Initialize callbacks object
                     },
                     legend: { position: 'top' }
                 },
                 animation: { duration: 500 } // Add subtle animation
             }
         };


        switch (chartType) {
            case 'feedAmount':
                config.options.plugins.title.text = 'Daily Feeding Intake (Last 7 Days)';
                 const bottleData = labels.map(label => {
                     const dayEvents = dailyDataBuckets[label]?.feeding?.filter(e => e.feedType === 'bottle' && e.amountOz) || [];
                     return dayEvents.reduce((sum, e) => sum + e.amountOz, 0);
                 });
                 const breastData = labels.map(label => {
                     const dayEvents = dailyDataBuckets[label]?.feeding?.filter(e => e.feedType === 'breast' && e.durationMin) || [];
                     return dayEvents.reduce((sum, e) => sum + e.durationMin, 0);
                 });
                 config.data.datasets = [
                    {
                        label: 'Bottle (oz)', data: bottleData,
                        backgroundColor: 'rgba(110, 205, 207, 0.7)', borderColor: 'rgba(110, 205, 207, 1)',
                        borderWidth: 1, yAxisID: 'y-oz'
                    }, {
                         label: 'Breast (min)', data: breastData,
                         backgroundColor: 'rgba(248, 177, 149, 0.7)', borderColor: 'rgba(248, 177, 149, 1)',
                         borderWidth: 1, yAxisID: 'y-min'
                    }
                 ];
                  config.options.scales = { // Dual axes
                     'y-oz': { type: 'linear', position: 'left', beginAtZero: true, title: { display: true, text: 'Ounces (oz)' } },
                     'y-min': { type: 'linear', position: 'right', beginAtZero: true, title: { display: true, text: 'Minutes (min)' }, grid: { drawOnChartArea: false } }
                 };
                 // Tooltip formatting for dual axis
                 config.options.plugins.tooltip.callbacks.label = function(context) {
                      let label = context.dataset.label || '';
                      if (label) label += ': ';
                      if (context.parsed.y !== null) {
                           label += context.parsed.y.toFixed(1);
                           label += context.dataset.yAxisID === 'y-oz' ? ' oz' : ' min';
                      }
                      return label;
                 };
                break;

             case 'feedFrequency':
                 config.type = 'line'; // Line chart for frequency
                 config.options.plugins.title.text = 'Hourly Feeding Frequency (Last 24 Hours)';
                 const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
                 const feedsLast24h = events.filter(e => e.type === 'feeding' && e.timestamp >= twentyFourHoursAgo);
                 config.data.labels = Array.from({ length: 24 }, (_, i) => {
                     const hour = new Date();
                     hour.setHours(hour.getHours() - (23 - i), 0, 0, 0);
                     return hour.toLocaleTimeString([], { hour: 'numeric', hour12: true });
                 });
                 const hourlyCounts = Array(24).fill(0);
                 feedsLast24h.forEach(feed => {
                     const feedHour = new Date(feed.timestamp).getHours();
                     const currentHour = new Date().getHours();
                     let index = feedHour - (currentHour - 23);
                     if (index < 0) index += 24;
                      if (index >= 0 && index < 24) { hourlyCounts[index]++; }
                 });
                 config.data.datasets = [{
                     label: 'Feeds per Hour', data: hourlyCounts,
                     borderColor: 'rgb(110, 205, 207)', tension: 0.2, fill: false
                 }];
                 config.options.scales = {
                    y: { beginAtZero: true, title: { display: true, text: 'Number of Feeds'}, ticks: { stepSize: 1 } }, // Integer steps
                    x: { title: { display: true, text: 'Hour of Day'} }
                 };
                 config.options.plugins.tooltip.mode = 'nearest'; // Better for single line
                 config.options.plugins.tooltip.intersect = true;
                break;

            case 'sleepDuration':
                config.options.plugins.title.text = 'Daily Sleep Duration (Last 7 Days)';
                const sleepData = labels.map(label => {
                    const daySleeps = dailyDataBuckets[label]?.sleep?.filter(e => e.duration) || [];
                    const totalDurationMs = daySleeps.reduce((sum, e) => sum + e.duration, 0);
                    return totalDurationMs / (1000 * 60 * 60); // Convert ms to hours
                });
                config.data.datasets = [{
                    label: 'Total Sleep (hours)', data: sleepData,
                    backgroundColor: 'rgba(174, 198, 207, 0.7)', borderColor: 'rgba(174, 198, 207, 1)',
                    borderWidth: 1
                }];
                config.options.scales.y.title.text = 'Hours of Sleep';
                 config.options.plugins.tooltip.callbacks.label = function(context) { // Custom tooltip format
                     let label = context.dataset.label || '';
                     if (label) label += ': ';
                     if (context.parsed.y !== null) {
                         label += context.parsed.y.toFixed(1) + ' hours';
                     }
                     return label;
                 };
                break;

             case 'diaperCount':
                 config.options.plugins.title.text = 'Daily Diaper Count (Last 7 Days)';
                 const wetCounts = labels.map(label => dailyDataBuckets[label]?.diaper?.filter(e => e.diaperType === 'wet' || e.diaperType === 'mixed').length || 0);
                 const dirtyCounts = labels.map(label => dailyDataBuckets[label]?.diaper?.filter(e => e.diaperType === 'dirty' || e.diaperType === 'mixed').length || 0);
                 config.data.datasets = [
                     { label: 'Wet', data: wetCounts, backgroundColor: 'rgba(250, 208, 46, 0.7)', stack: 'Stack 0' }, // Warning color
                     { label: 'Dirty', data: dirtyCounts, backgroundColor: 'rgba(160, 82, 45, 0.7)', stack: 'Stack 0' } // Brown color
                 ];
                 config.options.scales.x = { stacked: true }; // Stack X axis
                 config.options.scales.y = { stacked: true, beginAtZero: true, title: { display: true, text: 'Number of Diapers' }, ticks: { stepSize: 1 } }; // Stack Y axis, integer steps
                 break;

             case 'pumpAmount':
                 config.options.plugins.title.text = 'Daily Pumping Amount (Last 7 Days)';
                 const pumpAmounts = labels.map(label => {
                     const dayPumps = dailyDataBuckets[label]?.pump?.filter(e => e.amountOz) || [];
                     return dayPumps.reduce((sum, e) => sum + e.amountOz, 0);
                 });
                 config.data.datasets = [{
                     label: 'Total Pumped (oz)', data: pumpAmounts,
                     backgroundColor: 'rgba(248, 177, 149, 0.7)', borderColor: 'rgba(248, 177, 149, 1)', // Use secondary color
                     borderWidth: 1
                 }];
                 config.options.scales.y.title.text = 'Ounces (oz)';
                 config.options.plugins.tooltip.callbacks.label = function(context) { // Custom tooltip format
                     let label = context.dataset.label || '';
                     if (label) label += ': ';
                     if (context.parsed.y !== null) {
                         label += context.parsed.y.toFixed(1) + ' oz';
                     }
                     return label;
                 };
                 break;
                 
             case 'sleepPattern':
                 config.type = 'bubble';
                 config.options.plugins.title.text = 'Sleep Pattern Analysis (Last 7 Days)';
                 
                 // Get all sleep events in the past 7 days with duration
                 const sleepEvents = recentEvents.filter(e => e.type === 'sleep' && e.start && e.end && e.duration);
                 
                 // Early return if not enough data
                 if (sleepEvents.length < 3) return null;
                 
                 // Create datasets for different sleep durations
                 const shortNaps = []; // < 45 minutes
                 const mediumNaps = []; // 45min - 2hrs
                 const longSleeps = []; // > 2hrs
                 
                 sleepEvents.forEach(sleep => {
                     const startHour = new Date(sleep.start).getHours() + (new Date(sleep.start).getMinutes() / 60);
                     const durationHrs = sleep.duration / (1000 * 60 * 60);
                     const dayIndex = labels.indexOf(new Date(sleep.start).toLocaleDateString([], { month: 'numeric', day: 'numeric' }));
                     
                     if (dayIndex >= 0) {
                         const bubbleData = {
                             x: dayIndex,
                             y: startHour,
                             r: Math.min(Math.max(durationHrs * 3, 3), 12) // Scale radius, with min/max
                         };
                         
                         if (durationHrs < 0.75) { // Less than 45min
                             shortNaps.push(bubbleData);
                         } else if (durationHrs < 2) { // 45min to 2hrs
                             mediumNaps.push(bubbleData);
                         } else { // More than 2hrs
                             longSleeps.push(bubbleData);
                         }
                     }
                 });
                 
                 config.data.datasets = [
                     {
                         label: 'Short Naps (<45min)', 
                         data: shortNaps,
                         backgroundColor: 'rgba(255, 99, 132, 0.7)'
                     },
                     {
                         label: 'Medium Naps (45min-2hrs)', 
                         data: mediumNaps,
                         backgroundColor: 'rgba(110, 205, 207, 0.7)'
                     },
                     {
                         label: 'Long Sleep (>2hrs)', 
                         data: longSleeps,
                         backgroundColor: 'rgba(54, 162, 235, 0.7)'
                     }
                 ];
                 
                 // Custom scale options
                 config.options.scales = {
                     x: {
                         title: {
                             display: true,
                             text: 'Date'
                         }
                     },
                     y: {
                         title: {
                             display: true,
                             text: 'Time of Day (24h)'
                         },
                         min: 0,
                         max: 24,
                         ticks: {
                             callback: function(value) {
                                 return value === 0 ? '12 AM' : 
                                        value === 12 ? '12 PM' :
                                        value < 12 ? `${value} AM` :
                                        `${value - 12} PM`;
                             }
                         }
                     }
                 };
                 
                 // Custom tooltip
                 config.options.plugins.tooltip.callbacks.label = function(context) {
                     const dayLabel = labels[context.parsed.x];
                     const timeValue = context.parsed.y;
                     const hours = Math.floor(timeValue);
                     const minutes = Math.floor((timeValue - hours) * 60);
                     const timeStr = `${hours % 12 || 12}:${minutes.toString().padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
                     const durationHrs = context.parsed.r / 3; // Approximate reverse of our radius calculation
                     
                     return `${context.dataset.label} - ${dayLabel} at ${timeStr} (${durationHrs.toFixed(1)} hrs)`;
                 };
                 break;
                 
             case 'medicineSchedule':
                 config.type = 'line';
                 config.options.plugins.title.text = 'Medicine Schedule (Last 7 Days)';
                 
                 // Early return if no medicine data
                 if (medicineSchedule.length === 0) return null;
                 
                 // Filter medicines in the last 7 days
                 const recentMedicines = medicineSchedule.filter(m => 
                     m.timestamp >= sevenDaysAgoStart.getTime() && 
                     m.timestamp <= todayEnd.getTime()
                 );
                 
                 // Group by medicine name
                 const medicineByName = {};
                 recentMedicines.forEach(med => {
                     if (!medicineByName[med.name]) {
                         medicineByName[med.name] = {
                             name: med.name,
                             timestamps: [],
                             doses: []
                         };
                     }
                     
                     medicineByName[med.name].timestamps.push(med.timestamp);
                     medicineByName[med.name].doses.push(med.dose || '');
                 });
                 
                 // Create scatter datasets for each medicine
                 const medicineDatasets = [];
                 const colors = ['rgb(110, 205, 207)', 'rgb(248, 177, 149)', 'rgb(174, 198, 207)', 'rgb(250, 208, 46)'];
                 
                 Object.values(medicineByName).forEach((medicine, index) => {
                     const colorIndex = index % colors.length;
                     const dataPoints = [];
                     
                     medicine.timestamps.forEach(timestamp => {
                         const date = new Date(timestamp);
                         const dayIndex = labels.indexOf(date.toLocaleDateString([], { month: 'numeric', day: 'numeric' }));
                         
                         if (dayIndex >= 0) {
                             const hour = date.getHours() + (date.getMinutes() / 60);
                             dataPoints.push({
                                 x: dayIndex,
                                 y: hour
                             });
                         }
                     });
                     
                     medicineDatasets.push({
                         label: medicine.name,
                         data: dataPoints,
                         backgroundColor: colors[colorIndex],
                         borderColor: colors[colorIndex],
                         showLine: false, // Scatter plot style
                         pointRadius: 6,
                         pointStyle: 'rectRounded'
                     });
                 });
                 
                 config.data.datasets = medicineDatasets;
                 
                 // Custom scales for medicine chart
                 config.options.scales = {
                     x: {
                         title: {
                             display: true,
                             text: 'Date'
                         }
                     },
                     y: {
                         title: {
                             display: true,
                             text: 'Time of Day'
                         },
                         min: 0,
                         max: 24,
                         ticks: {
                             callback: function(value) {
                                 return value === 0 ? '12 AM' : 
                                        value === 12 ? '12 PM' :
                                        value < 12 ? `${value} AM` :
                                        `${value - 12} PM`;
                             }
                         }
                     }
                 };
                 break;

            default:
                logWarning("Unknown chart type selected:", chartType);
                return null; // No config for unknown type
        }

        return config; // Return the full Chart.js config object
    };


    // --- Alarm System ---
    const playAlarmSound = () => {
         if (settings.alarmSoundEnabled) {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                 const oscillator = audioContext.createOscillator();
                 const gainNode = audioContext.createGain();

                 oscillator.connect(gainNode);
                 gainNode.connect(audioContext.destination);

                 oscillator.type = 'sine'; // Simple beep type
                 oscillator.frequency.setValueAtTime(660, audioContext.currentTime); // Pitch (A5)
                 gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Volume

                 // Beep pattern: Beep-pause-Beep-pause-Beep
                 oscillator.start(audioContext.currentTime);
                 gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.15); // Quick fade out
                 oscillator.stop(audioContext.currentTime + 0.15);

                 setTimeout(() => {
                     const osc2 = audioContext.createOscillator();
                     const gain2 = audioContext.createGain();
                     osc2.connect(gain2); gain2.connect(audioContext.destination);
                     osc2.type = 'sine'; osc2.frequency.setValueAtTime(660, audioContext.currentTime); gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
                     osc2.start(audioContext.currentTime);
                     gain2.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.15);
                     osc2.stop(audioContext.currentTime + 0.15);
                 }, 300); // Second beep after 300ms pause

                 setTimeout(() => {
                     const osc3 = audioContext.createOscillator();
                     const gain3 = audioContext.createGain();
                     osc3.connect(gain3); gain3.connect(audioContext.destination);
                     osc3.type = 'sine'; osc3.frequency.setValueAtTime(660, audioContext.currentTime); gain3.gain.setValueAtTime(0.3, audioContext.currentTime);
                     osc3.start(audioContext.currentTime);
                     gain3.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.15);
                     osc3.stop(audioContext.currentTime + 0.15);

                      // Close context after sound plays to conserve resources
                      setTimeout(() => audioContext.close(), 500);
                 }, 600); // Third beep after another 300ms pause


             } catch (error) {
                logWarning("Could not play alarm sound (Web Audio API failed or not supported).", error);
                // Fallback (less ideal, often blocked)
                // try { new Audio(DEFAULT_ALARM_SOUND).play(); } catch(e) {}
             }
         }
    };

    const showAlarm = (type, message) => {
        const now = Date.now();
        const snoozedUntil = snoozeState[type] || 0;

        // Final check before showing
        if (alarmsPaused || now < snoozedUntil) {
            logInfo(`Alarm display suppressed: ${type} (Paused: ${alarmsPaused}, Snoozed: ${now < snoozedUntil})`);
            scheduleNextMainAlarmCheck(); // Ensure check runs again later
            return;
        }

        logInfo(`ALARM TRIGGERED: ${type} - ${message}`);
        if (DOMElements.alarmNotification && DOMElements.alarmMessage) {
            DOMElements.alarmMessage.textContent = message;
            DOMElements.alarmNotification.dataset.alarmType = type;
            DOMElements.alarmNotification.style.display = 'block';
            DOMElements.resumeAlarmsButton.style.display = 'none'; // Hide global resume when alarm active
            playAlarmSound();
            
            // Show notification if supported and permitted
            if ('Notification' in window && Notification.permission === 'granted') {
                const notification = new Notification(`${APP_NAME}: ${message}`, {
                    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍼</text></svg>',
                    silent: true // We're already playing our own sound
                });
                
                // Auto-close notification after 10 seconds
                setTimeout(() => notification.close(), 10000);
            }
        }

        // Clear the timeout that triggered this specific alarm show
        clearTimeout(alarmTimeouts[type]);
        delete alarmTimeouts[type];
    };

     const hideAlarm = () => {
        if (DOMElements.alarmNotification) {
            DOMElements.alarmNotification.style.display = 'none';
            DOMElements.alarmNotification.dataset.alarmType = '';
        }
         // Show resume button ONLY if alarms are globally paused
         if (DOMElements.resumeAlarmsButton) {
            DOMElements.resumeAlarmsButton.style.display = alarmsPaused ? 'inline-block' : 'none';
         }
    };

    const snoozeAlarm = (type, minutes) => {
        if (!type || isNaN(minutes) || minutes <= 0) return;
        const now = Date.now();
         const snoozeUntil = now + minutes * 60 * 1000;
         snoozeState[type] = snoozeUntil;
         logInfo(`Snoozing ${type} alarm for ${minutes} minutes until ${formatTime(new Date(snoozeUntil))}`);
         saveData(); // Save snooze state
         hideAlarm();
         scheduleNextMainAlarmCheck(); // Schedule next full check, it will respect the new snooze time
    };

     const pauseAllAlarms = () => {
         alarmsPaused = true;
         logInfo("All alarms paused manually.");
         clearAllAlarmTimeouts(); // Clear pending alarms immediately
         hideAlarm(); // Hide any currently showing alarm
         updateAlarmPauseStatus();
         saveData();
     };

     const resumeAllAlarms = (forced = false) => {
         const now = Date.now();
         const isAnySnoozed = Object.values(snoozeState).some(time => time > now);

         if (alarmsPaused) {
             if (forced) {
                 logInfo("Forcing resume of all alarms, clearing active snoozes.");
                 snoozeState = {}; // Clear all snoozes on forced resume
                 alarmsPaused = false;
             } else if (!isAnySnoozed) {
                 logInfo("Resuming alarms (no active snoozes).");
                 alarmsPaused = false;
             } else {
                  logInfo("Cannot resume yet, some alarms are still snoozed. Use 'Force Resume' or wait for snoozes to expire.");
                  // Do not change alarmsPaused state
                  return; // Exit function
             }

             updateAlarmPauseStatus();
             saveData();
             hideAlarm(); // Ensure notification UI is updated
             scheduleNextMainAlarmCheck(1000); // Immediately re-evaluate and schedule checks shortly after resume
         } else {
             logInfo("Alarms are already active.");
             if (forced && isAnySnoozed) {
                 logInfo("Forcing snooze clear while alarms are active.");
                 snoozeState = {};
                 saveData();
                 scheduleNextMainAlarmCheck(1000); // Re-evaluate soon
             }
         }
     };

    const clearAllAlarmTimeouts = () => {
         Object.values(alarmTimeouts).forEach(clearTimeout);
         alarmTimeouts = {};
         logInfo("Cleared all pending alarm timeouts.");
    };

     // --- Alarm Event Handlers ---
    const handleAlarmInteraction = (e) => {
         const button = e.target.closest('button'); // Find the clicked button
         if (!button) return;

         const alarmType = DOMElements.alarmNotification.dataset.alarmType;
         const snoozeMinutes = button.dataset.snooze;

         if (button.id === 'dismiss-alarm') {
             logInfo(`Dismissing ${alarmType} alarm.`);
             hideAlarm();
             // Optional: Add a short implicit snooze on dismiss to prevent immediate re-trigger
             // snoozeAlarm(alarmType, 1); // e.g., snooze for 1 minute
             scheduleNextMainAlarmCheck(10000); // Check again in 10s
         } else if (snoozeMinutes) {
             if (snoozeMinutes === 'pause') {
                 pauseAllAlarms();
             } else {
                 const minutes = parseInt(snoozeMinutes);
                 if (!isNaN(minutes) && alarmType) {
                     snoozeAlarm(alarmType, minutes);
                 }
             }
         }
     };


    const updateAlarmPauseStatus = () => {
        if(DOMElements.alarmPauseStatus && DOMElements.forceResumeAlarmsButton){
            DOMElements.alarmPauseStatus.textContent = alarmsPaused ? `Yes` : 'No';
            DOMElements.forceResumeAlarmsButton.style.display = alarmsPaused ? 'inline-block' : 'none';
        }
         // Resume button within alarm popup is handled by hideAlarm()
    };

    // --- Alarm Scheduling Logic ---
    /**
     * The main function to check all predictable events and schedule alarms if needed.
     */
    const checkAndScheduleAlarms = () => {
        if (alarmsPaused) {
            // logInfo("Alarm checks skipped: Globally paused.");
            return; // Don't schedule if globally paused
        }

        const now = Date.now();
        logInfo(`Running alarm checks at ${formatTime(now)}`);

        const checks = [
            { type: 'feed', eventType: 'feeding', message: "Baby will likely be hungry soon!" },
            { type: 'diaperWet', eventType: 'diaper', subType: { diaperType: 'wet' }, message: "Time for a diaper check (Wet likely)." },
            { type: 'diaperDirty', eventType: 'diaper', subType: { diaperType: 'dirty' }, message: "Time for a diaper check (Dirty likely)." },
            { type: 'sleep', eventType: 'sleep', message: "Baby might be getting tired soon.", condition: () => !isSleeping }, // Only if awake
            { type: 'pump', eventType: 'pump', message: "Time for scheduled pumping session.", useSchedule: true },
            { type: 'medicine', message: "Medicine due.", useCustomCheck: checkMedicineAlarms } // New medicine check
        ];

        checks.forEach(check => {
            // If custom check logic exists, use it
            if (check.useCustomCheck) {
                check.useCustomCheck();
                return;
            }
            
            if (check.condition && !check.condition()) {
                 // If condition exists and is false (e.g., trying to schedule sleep alarm while sleeping), clear any pending timeout and skip
                 clearTimeout(alarmTimeouts[check.type]);
                 delete alarmTimeouts[check.type];
                 return;
            }

            let predictionResult, predictedTime, lastEventTime, avgInterval, confidence;

            if (check.useSchedule && check.type === 'pump') {
                predictedTime = calculateNextScheduledPump();
                lastEventTime = events.find(e => e.type === 'pump')?.timestamp || null;
                avgInterval = pumpSchedule.intervalHours ? pumpSchedule.intervalHours * 60 * 60 * 1000 : null; // Use schedule interval
                 // Use a slightly earlier trigger for scheduled items
                 const triggerTime = predictedTime ? predictedTime - (2 * 60 * 1000) : null; // 2 mins before schedule
                 scheduleAlarmTimeout(check.type, triggerTime, check.message);

            } else if (!check.useSchedule) {
                 predictionResult = predictNextEvent(check.eventType, check.subType);
                 predictedTime = predictionResult.prediction;
                 lastEventTime = predictionResult.lastEventTime;
                 avgInterval = predictionResult.avgInterval;
                 confidence = predictionResult.confidence;

                 if (predictedTime && lastEventTime && avgInterval) {
                     // Calculate trigger time based on threshold and confidence
                     // Higher confidence = closer to predicted time, lower confidence = more time to prepare
                     const adjustedThreshold = ALARM_THRESHOLD_PERCENT * (confidence || 0.8);
                     const triggerTime = lastEventTime + (avgInterval * adjustedThreshold);
                     
                     // Check if any alternative predictions should trigger earlier
                     let earliestAlternative = null;
                     if (predictionResult.alternativePredictions && predictionResult.alternativePredictions.length > 0) {
                         predictionResult.alternativePredictions.forEach(alt => {
                             // For high confidence alternatives that would trigger sooner
                             if (alt.confidence > 0.6 && alt.timestamp < triggerTime && alt.timestamp > now) {
                                 if (!earliestAlternative || alt.timestamp < earliestAlternative) {
                                     earliestAlternative = alt.timestamp - (2 * 60 * 1000); // 2min before alternative
                                 }
                             }
                         });
                     }
                     
                     // Schedule based on the *earlier* of the threshold time, actual predicted time, or earliest alternative
                     const finalTriggerTime = earliestAlternative ? 
                         Math.min(triggerTime, predictedTime, earliestAlternative) : 
                         Math.min(triggerTime, predictedTime);
                         
                     // Customize messages based on confidence
                     let customMessage = check.message;
                     if (confidence < 0.5) {
                         customMessage += " (Low confidence prediction)";
                     }
                     
                     scheduleAlarmTimeout(check.type, finalTriggerTime, customMessage);
                 } else {
                      // Not enough data or missing prediction, clear any pending alarm for this type
                      clearTimeout(alarmTimeouts[check.type]);
                      delete alarmTimeouts[check.type];
                      // logInfo(`Alarm Check [${check.type}]: Not scheduling (Insufficient data).`);
                 }
            }
        });
        
        // Check for upcoming milestones
        checkMilestoneAlerts();
    };
    
    /**
     * Checks if any medicines are due and schedules alarms.
     */
    const checkMedicineAlarms = () => {
        const now = Date.now();
        
        // Find upcoming scheduled medicines
        const upcomingMeds = medicineSchedule
            .filter(m => m.scheduled && m.timestamp > now && m.timestamp < now + (2 * 60 * 60 * 1000)); // Next 2 hours
            
        upcomingMeds.forEach(med => {
            const medKey = `medicine_${med.id}`;
            const message = `Time for ${med.name}${med.dose ? ` (${med.dose})` : ''}`;
            
            // Schedule alarm for 5 minutes before medicine is due
            const triggerTime = med.timestamp - (5 * 60 * 1000);
            
            // Only schedule if trigger time is in the future
            if (triggerTime > now) {
                scheduleAlarmTimeout(medKey, triggerTime, message);
            }
        });
    };
    
    /**
     * Checks for upcoming milestone alerts based on baby's age.
     */
    const checkMilestoneAlerts = () => {
        if (!settings.babyDOB || !settings.notifyMilestones) return;
        
        const age = getBabyAge();
        if (!age) return;
        
        // Find milestones appropriate for current age
        const currentAgeMonths = Math.floor(age.totalMonths);
        
        // Check once a day for milestone alerts
        const milestoneKey = `milestone_alert_${currentAgeMonths}`;
        if (snoozeState[milestoneKey] && snoozeState[milestoneKey] > Date.now()) return;
        
        // Get relevant milestones
        const relevantMilestones = milestoneData.upcoming.filter(m => m.ageMonth === currentAgeMonths);
        
        if (relevantMilestones.length > 0) {
            const message = `Baby is now ${currentAgeMonths} month${currentAgeMonths !== 1 ? 's' : ''} old. Check for new milestones!`;
            scheduleAlarmTimeout(milestoneKey, Date.now() + 5000, message); // Show soon (5 seconds)
            
            // Set snooze to prevent repeated alerts (check again in 1 day)
            snoozeState[milestoneKey] = Date.now() + (24 * 60 * 60 * 1000);
            saveData();
        }
    };

    /**
     * Sets a specific timeout for a single alarm type if needed.
     * @param {string} type - Unique identifier for the alarm (e.g., 'feed', 'diaperWet').
     * @param {number|null} triggerTimestamp - The future timestamp when the alarm should ideally trigger.
     * @param {string} message - The message to display when the alarm triggers.
     */
    const scheduleAlarmTimeout = (type, triggerTimestamp, message) => {
        const now = Date.now();
        const snoozedUntil = snoozeState[type] || 0;

        // Clear any existing timeout for this specific type first
        clearTimeout(alarmTimeouts[type]);
        delete alarmTimeouts[type];

        // Check if scheduling is valid
        if (triggerTimestamp === null || triggerTimestamp <= now || triggerTimestamp <= snoozedUntil || alarmsPaused) {
             // logInfo(`Alarm scheduling skipped for ${type}: Trigger time past, snoozed, or paused.`);
             return; // Don't schedule if trigger time is invalid, in the past, snoozed, or globally paused
        }

        const delay = triggerTimestamp - now;
        logInfo(`Scheduling ${type} alarm in ${formatDuration(delay, true)} (at ${formatTime(triggerTimestamp)})`);

        alarmTimeouts[type] = setTimeout(() => {
            // IMPORTANT: Re-check pause/snooze state *inside* the timeout just before showing
            if (!alarmsPaused && Date.now() >= (snoozeState[type] || 0)) {
                 showAlarm(type, message);
            } else {
                 logInfo(`Alarm timeout for ${type} executed, but suppressed (paused or snoozed).`);
                 // No need to reschedule here, the main loop will catch it next time
            }
            // Remove from active timeouts *after* it fires or is suppressed
            delete alarmTimeouts[type];
        }, delay);
    };

     // Schedules the *next periodic check* of ALL alarms
     const scheduleNextMainAlarmCheck = (interval = ALARM_CHECK_INTERVAL) => {
         clearTimeout(mainAlarmCheckTimeout); // Clear previous pending check
         mainAlarmCheckTimeout = setTimeout(() => {
             checkAndScheduleAlarms(); // Run the checks
             scheduleNextMainAlarmCheck(); // Schedule the *next* check after this one completes
         }, interval);
     };


    // --- Pumping Schedule Logic ---
    const savePumpSchedule = () => {
        const interval = parseFloat(DOMElements.pumpIntervalInput.value);
        const startTime = DOMElements.pumpStartTimeInput.value || null; // Store HH:mm or null

        if (!isNaN(interval) && interval > 0) {
            pumpSchedule.intervalHours = interval;
            pumpSchedule.startTime = startTime;
            saveData();
            updatePumpScheduleUI();
            scheduleNextMainAlarmCheck(1000); // Re-check alarms soon after schedule change
            logInfo("Pump schedule saved:", pumpSchedule);
        } else {
             pumpSchedule.intervalHours = null; // Clear if invalid input
             pumpSchedule.startTime = null;
             saveData();
             updatePumpScheduleUI();
             scheduleNextMainAlarmCheck(1000);
             logInfo("Pump schedule cleared due to invalid input.");
            // alert("Please enter a valid pumping interval (hours). Schedule cleared.");
        }
    };

    const calculateNextScheduledPump = () => {
        if (!pumpSchedule.intervalHours) return null;

        const intervalMillis = pumpSchedule.intervalHours * 60 * 60 * 1000;
        const lastPump = events.find(e => e.type === 'pump');
        const now = Date.now();
        let nextPumpTime = null;

        if (lastPump) {
            // Calculate next based on last pump + interval
            nextPumpTime = lastPump.timestamp + intervalMillis;
        } else if (pumpSchedule.startTime) {
            // No previous pumps, base first one on start time
            const [startHour, startMinute] = pumpSchedule.startTime.split(':').map(Number);
            const todayStartDate = new Date();
            todayStartDate.setHours(startHour, startMinute, 0, 0);
            if (todayStartDate.getTime() > now) {
                nextPumpTime = todayStartDate.getTime(); // First pump is later today
            } else {
                // Start time already passed today, schedule first one tomorrow
                const tomorrowStartDate = new Date(todayStartDate);
                tomorrowStartDate.setDate(todayStartDate.getDate() + 1);
                nextPumpTime = tomorrowStartDate.getTime();
            }
        } else {
            return null; // Cannot calculate without last pump or start time
        }

        // If calculated time is in the past (because interval is short or based on old pump),
        // keep adding interval until it's in the future.
        while (nextPumpTime <= now) {
            nextPumpTime += intervalMillis;
        }

        return nextPumpTime;
    };

    const updatePumpScheduleUI = () => {
        if (!DOMElements.pumpIntervalInput || !DOMElements.pumpStartTimeInput || !DOMElements.currentPumpScheduleDisplay) return;

        DOMElements.pumpIntervalInput.value = pumpSchedule.intervalHours || '';
        DOMElements.pumpStartTimeInput.value = pumpSchedule.startTime || '';
        DOMElements.currentPumpScheduleDisplay.textContent = pumpSchedule.intervalHours
            ? `Approx. every ${pumpSchedule.intervalHours} hours ${pumpSchedule.startTime ? '(aiming near ' + pumpSchedule.startTime + ')' : ''}`
            : 'Not set';
        // Update the dashboard display as well (handled in updateDashboard)
    };


     // --- Reports & Projections ---
     const updateDailySummary = () => {
          if (!DOMElements.dailySummaryList) return;
          DOMElements.dailySummaryList.innerHTML = ''; // Clear previous

          const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
          const todayEvents = events.filter(e => e.timestamp >= todayStart.getTime() && e.timestamp <= todayEnd.getTime());

          if (todayEvents.length === 0) {
              DOMElements.dailySummaryList.innerHTML = '<li>No events recorded today yet.</li>';
              return;
          }

         const summary = {
             feeds: 0, bottleFeeds: 0, breastFeeds: 0, feedAmountOz: 0, feedDurationMin: 0,
             wetDiapers: 0, dirtyDiapers: 0, mixedDiapers: 0, totalDiapers: 0,
             sleepSessions: 0, totalSleepMs: 0, longestSleepMs: 0,
             pumpCount: 0, pumpAmountOz: 0
         };

         todayEvents.forEach(e => {
             switch(e.type) {
                 case 'feeding':
                     summary.feeds++;
                     if (e.feedType === 'bottle') {
                         summary.bottleFeeds++;
                         summary.feedAmountOz += (e.amountOz || 0);
                     } else if (e.feedType === 'breast') {
                         summary.breastFeeds++;
                         summary.feedDurationMin += (e.durationMin || 0);
                     }
                     break;
                 case 'diaper':
                     summary.totalDiapers++;
                     if (e.diaperType === 'wet') summary.wetDiapers++;
                     if (e.diaperType === 'dirty') summary.dirtyDiapers++;
                     if (e.diaperType === 'mixed') summary.mixedDiapers++;
                     break;
                 case 'sleep':
                     // Calculate sleep duration strictly within today
                     if (e.duration && e.end >= todayStart.getTime() && e.start < todayEnd.getTime()) {
                          const startOfDay = todayStart.getTime();
                          const endOfDay = todayEnd.getTime();
                          const sleepStart = Math.max(e.start, startOfDay);
                          const sleepEnd = Math.min(e.end, endOfDay);
                          const durationToday = sleepEnd - sleepStart;
                          if (durationToday > 0) {
                              summary.totalSleepMs += durationToday;
                              summary.sleepSessions++; // Count sessions ending today
                              if (durationToday > summary.longestSleepMs) {
                                   summary.longestSleepMs = durationToday;
                              }
                          }
                     }
                     break;
                 case 'pump':
                     summary.pumpCount++;
                     summary.pumpAmountOz += (e.amountOz || 0);
                     break;
             }
         });

         const fragment = document.createDocumentFragment();
         const addSummaryItem = (label, value) => {
             if (value) { // Only add if value is meaningful (non-zero or non-empty string)
                  const li = createFormElement('li');
                  li.innerHTML = `<strong>${label}:</strong> ${value}`;
                  fragment.appendChild(li);
             }
         };

         addSummaryItem('Total Feeds', `${summary.feeds} (${summary.bottleFeeds} bottle, ${summary.breastFeeds} breast)`);
         if (summary.feedAmountOz > 0) addSummaryItem('Total Bottle Intake', `${summary.feedAmountOz.toFixed(1)} oz`);
         if (summary.feedDurationMin > 0) addSummaryItem('Total Breastfeed Time', formatDuration(summary.feedDurationMin * 60000));
         addSummaryItem('Total Diapers', `${summary.totalDiapers} (💧${summary.wetDiapers + summary.mixedDiapers}, 💩${summary.dirtyDiapers + summary.mixedDiapers})`);
         addSummaryItem('Total Sleep', formatDuration(summary.totalSleepMs));
         if (summary.longestSleepMs > 0) addSummaryItem('Longest Sleep', formatDuration(summary.longestSleepMs));
         if (summary.pumpCount > 0) addSummaryItem('Total Pumped', `${summary.pumpAmountOz.toFixed(1)} oz (${summary.pumpCount} sessions)`);
         
         // Add medicine count if we have any today
         const todayMedicines = medicineSchedule.filter(m => m.timestamp >= todayStart.getTime() && m.timestamp <= todayEnd.getTime());
         if (todayMedicines.length > 0) {
             // Group by medicine name
             const medicineGroups = {};
             todayMedicines.forEach(m => {
                 medicineGroups[m.name] = (medicineGroups[m.name] || 0) + 1;
             });
             
             const medicineStr = Object.entries(medicineGroups)
                 .map(([name, count]) => `${name} (${count})`)
                 .join(', ');
                 
             addSummaryItem('Medicines', medicineStr);
         }
         
         // Add growth measurements if any recorded today
         const todayGrowth = [];
         if (growthData.weight.some(m => m.timestamp >= todayStart.getTime() && m.timestamp <= todayEnd.getTime())) {
             const latestWeight = growthData.weight.find(m => m.timestamp >= todayStart.getTime() && m.timestamp <= todayEnd.getTime());
             todayGrowth.push(`Weight: ${formatWeight(latestWeight.value)}`);
         }
         if (growthData.length.some(m => m.timestamp >= todayStart.getTime() && m.timestamp <= todayEnd.getTime())) {
             const latestLength = growthData.length.find(m => m.timestamp >= todayStart.getTime() && m.timestamp <= todayEnd.getTime());
             todayGrowth.push(`Length: ${formatLength(latestLength.value)}`);
         }
         if (growthData.headCircumference.some(m => m.timestamp >= todayStart.getTime() && m.timestamp <= todayEnd.getTime())) {
             const latestHC = growthData.headCircumference.find(m => m.timestamp >= todayStart.getTime() && m.timestamp <= todayEnd.getTime());
             todayGrowth.push(`Head: ${formatLength(latestHC.value)}`);
         }
         
         if (todayGrowth.length > 0) {
             addSummaryItem('Growth', todayGrowth.join(', '));
         }
         
         // Add baby's age if DOB is set
         const age = getBabyAge();
         if (age) {
             let ageStr = '';
             if (age.years > 0) {
                 ageStr += `${age.years} year${age.years !== 1 ? 's' : ''}`;
                 if (age.months > 0) {
                     ageStr += `, ${age.months} month${age.months !== 1 ? 's' : ''}`;
                 }
             } else {
                 ageStr += `${age.months} month${age.months !== 1 ? 's' : ''}`;
                 if (age.days > 0) {
                     ageStr += `, ${age.days} day${age.days !== 1 ? 's' : ''}`;
                 }
             }
             
             addSummaryItem(`${settings.babyName}'s Age`, ageStr);
         }

         DOMElements.dailySummaryList.appendChild(fragment);
     };

      const updateProjections = () => {
         if (!DOMElements.projectionList) return;
         DOMElements.projectionList.innerHTML = ''; // Clear previous
         const now = Date.now();
         const in24Hours = now + 24 * 60 * 60 * 1000;

         const projections = []; // { time: timestamp, label: string, type: string, confidence: number }

         // Function to add projection if valid and within timeframe
         const addProjection = (type, predictedTime, label, confidence = 0.8, source = 'prediction') => {
             if (predictedTime && predictedTime > now && predictedTime <= in24Hours) {
                 projections.push({ 
                     time: predictedTime, 
                     label: `${label} (~${formatTime(predictedTime)})`, 
                     type,
                     confidence,
                     source
                 });
             }
         };

         // Get initial predictions
         const { 
             prediction: nextFeedPred, 
             avgInterval: feedAvgInt,
             confidence: feedConfidence,
             alternativePredictions: feedAlternatives 
         } = predictNextEvent('feeding');
         
         const { 
             prediction: nextWetPred, 
             avgInterval: wetAvgInt,
             confidence: wetConfidence 
         } = predictNextEvent('diaper', { diaperType: 'wet' });
         
         const { 
             prediction: nextDirtyPred, 
             avgInterval: dirtyAvgInt,
             confidence: dirtyConfidence 
         } = predictNextEvent('diaper', { diaperType: 'dirty' });
         
         const { 
             prediction: nextSleepPred, 
             avgInterval: sleepAvgInt,
             confidence: sleepConfidence 
         } = predictNextEvent('sleep');
         
         const nextScheduledPumpTime = calculateNextScheduledPump();

         // Add first round of predictions
         addProjection('feed', nextFeedPred, '🍼 Next Feed', feedConfidence);
         addProjection('diaperWet', nextWetPred, '💧 Next Wet', wetConfidence);
         addProjection('diaperDirty', nextDirtyPred, '💩 Next Dirty', dirtyConfidence);
         if (!isSleeping) addProjection('sleep', nextSleepPred, '😴 Next Nap', sleepConfidence);
         addProjection('pump', nextScheduledPumpTime, '🥛 Next Pump', 0.95, 'schedule');
         
         // Add alternative feed predictions if available
         if (feedAlternatives && feedAlternatives.length > 0) {
             feedAlternatives.forEach(alt => {
                 addProjection('feed', alt.timestamp, `🍼 Feed (${alt.reason})`, alt.confidence, 'alternative');
             });
         }

         // --- More Sophisticated Forward Projection ---
         // Use both statistical projections and pattern detection
         const projectFurther = (type, lastPredTime, avgInterval, label, confidence, maxSteps = 3) => {
               let currentTime = lastPredTime;
               let currentConfidence = confidence;
               
               for (let i = 0; i < maxSteps; i++) {
                    if (!currentTime || !avgInterval || avgInterval <= 0) break;
                    
                    const nextTime = currentTime + avgInterval;
                    
                    // Decrease confidence for each projection step
                    currentConfidence = Math.max(0.3, currentConfidence * 0.85);
                    
                    addProjection(type, nextTime, label, currentConfidence); // Use addProjection to handle time checks
                    currentTime = nextTime;
               }
          };
          
          // Add projections based on detected patterns if available
          if (patternData) {
              Object.entries(patternData).forEach(([type, data]) => {
                  if (data.nextPredicted && data.nextPredicted > now && data.confidence > 0.6) {
                      let label, emoji;
                      
                      switch(type) {
                          case 'feeding': emoji = '🍼'; label = 'Feed'; break;
                          case 'diaper': emoji = '🧷'; label = 'Diaper'; break;
                          case 'sleep': emoji = '😴'; label = 'Nap'; break;
                          case 'pump': emoji = '🥛'; label = 'Pump'; break;
                          default: emoji = '📝'; label = type.charAt(0).toUpperCase() + type.slice(1);
                      }
                      
                      addProjection(
                          type, 
                          data.nextPredicted, 
                          `${emoji} ${label} (${data.patternType} pattern)`,
                          data.confidence,
                          'pattern'
                      );
                  }
              });
          }

          projectFurther('feed', nextFeedPred, feedAvgInt, '🍼 Feed', feedConfidence, 5);
          projectFurther('diaperWet', nextWetPred, wetAvgInt, '💧 Wet Diaper', wetConfidence, 3);
          projectFurther('diaperDirty', nextDirtyPred, dirtyAvgInt, '💩 Dirty Diaper', dirtyConfidence, 2);
          
          if (!isSleeping) {
              // Projecting sleep requires average sleep duration too for realistic awake/sleep cycle
               const avgSleepDuration = calculateAverageSleepDuration() || (2 * 60 * 60 * 1000); // Default 2h if unknown
               // Project next awake time after predicted sleep ends
               if (nextSleepPred) {
                    const predictedWakeTime = nextSleepPred + avgSleepDuration;
                    // Project next nap start based on predicted wake time + avg awake time (sleepAvgInt)
                    projectFurther('sleep', predictedWakeTime, sleepAvgInt, '😴 Nap Start', sleepConfidence * 0.8, 2);
               }
          }
          
          // Add scheduled medicine doses
          const upcomingMeds = medicineSchedule
            .filter(m => m.timestamp > now && m.timestamp <= in24Hours)
            .sort((a, b) => a.timestamp - b.timestamp);
            
          upcomingMeds.forEach(med => {
              addProjection(
                  'medicine', 
                  med.timestamp, 
                  `💊 ${med.name}${med.dose ? ` (${med.dose})` : ''}`,
                  0.95,
                  'schedule'
              );
          });

          // Sort all collected projections by time
          projections.sort((a, b) => a.time - b.time);

          // Remove duplicates that are very close in time (e.g., within 5 mins)
          // Unless they are from different sources or have different confidence levels
           const uniqueProjections = projections.filter((item, index, self) => {
               if (index === 0) return true;
               
               const prevItem = self[index - 1];
               const timeDiff = Math.abs(item.time - prevItem.time);
               
               // Keep if more than 5 minutes apart
               if (timeDiff > 5 * 60 * 1000) return true;
               
               // Keep if different types, even if close in time
               if (item.type !== prevItem.type) return true;
               
               // Keep if different sources or confidence varies significantly
               if (item.source !== prevItem.source || Math.abs(item.confidence - prevItem.confidence) > 0.2) return true;
               
               // Otherwise filter out (too similar to previous)
               return false;
           });

         if (uniqueProjections.length > 0) {
             const fragment = document.createDocumentFragment();
             uniqueProjections.forEach(p => {
                 const li = createFormElement('li');
                 
                 // Add confidence indicator
                 const confidenceClass = p.confidence >= 0.8 ? 'high' : 
                                         p.confidence >= 0.5 ? 'medium' : 'low';
                 
                 li.innerHTML = `
                    ${p.label} 
                    <span class="confidence-inline ${confidenceClass}" 
                          title="Confidence: ${Math.round(p.confidence * 100)}%">
                        ${p.source === 'schedule' ? '📆' : 
                         p.source === 'pattern' ? '📊' : 
                         p.source === 'alternative' ? '🔄' : '📈'}
                    </span>`;
                 fragment.appendChild(li);
             });
             DOMElements.projectionList.appendChild(fragment);
         } else {
             DOMElements.projectionList.innerHTML = '<li>Not enough data for projections.</li>';
         }
      };

     const calculateAverageSleepDuration = () => {
          const sleepEvents = events.filter(e => e.type === 'sleep' && e.duration && e.duration > 0);
          if (sleepEvents.length < PREDICTION_MIN_EVENTS) return null;
          // Use recent sleeps for average duration
          const recentSleeps = sleepEvents.slice(0, PREDICTION_WINDOW);
          const totalDuration = recentSleeps.reduce((sum, e) => sum + e.duration, 0);
          return totalDuration / recentSleeps.length;
      };


    // --- Data Export/Import/Clear ---
    const handleExportData = () => {
         try {
            const backupData = prepareBackupData();
            const dataStr = JSON.stringify(backupData, null, 2); // Pretty print JSON
             const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
             const url = URL.createObjectURL(blob);
             const a = createFormElement('a', {
                 href: url,
                 download: `baby-tracker-backup-${new Date().toISOString().split('T')[0]}.json` // YYYY-MM-DD format
             });
             a.style.display = 'none';
             document.body.appendChild(a);
             a.click();
             document.body.removeChild(a);
             URL.revokeObjectURL(url);
             
             // Update last backup time
             lastBackupTime = Date.now();
             saveData();
             
             logInfo("Data exported successfully.");
             alert("Data backup file has been generated and downloaded.");
         } catch (error) {
            logError("Failed to export data:", error);
            alert("Error: Could not export data.");
         }
     };
     
     /**
      * Prepares a complete backup data object.
      * @returns {Object} Full backup with all application data.
      */
     const prepareBackupData = () => {
         return {
             appName: APP_NAME,
             appVersion: APP_VERSION,
             exportDate: new Date().toISOString(),
             version: 2, // Version 2 format (new collections)
             data: {
                 events: events,
                 sleepState: { isSleeping, sleepStartTime },
                 pumpSchedule: pumpSchedule,
                 snoozeState: snoozeState,
                 alarmsPaused: alarmsPaused,
                 settings: settings,
                 growthData: growthData,
                 milestoneData: milestoneData,
                 medicineSchedule: medicineSchedule,
                 temperatureData: temperatureData,
                 patterns: patternData,
                 anomalies: anomalyDetection.detectedAnomalies
             }
         };
     };

     const handleImportData = (e) => {
        const file = e.target.files[0];
        if (!file) return;

         if (!confirm("⚠️ IMPORTANT! ⚠️\n\nImporting data will OVERWRITE ALL your current data (events, settings, schedule).\n\nMake sure you have a backup of your current data if needed.\n\nAre you sure you want to proceed with the import?")) {
             DOMElements.importFileInput.value = ''; // Reset file input
             return;
         }

         const reader = new FileReader();
         reader.onload = (event) => {
             try {
                 const importedJson = JSON.parse(event.target.result);

                 // --- Basic Validation ---
                 if (typeof importedJson !== 'object' || !importedJson.data || !Array.isArray(importedJson.data.events)) {
                     throw new Error("Invalid file format. Required 'data' structure with 'events' array is missing.");
                 }
                 // Optional: Check appName or version if needed
                 // if (importedJson.appName !== APP_NAME) { ... }

                 const importedData = importedJson.data;

                 // --- Clear existing data FIRST (User confirmed overwrite) ---
                 clearAllAlarmTimeouts(); // Stop existing alarms before replacing data
                 if (currentChart) { currentChart.destroy(); currentChart = null; } // Clear chart

                 // --- Load Imported Data ---
                 events = importedData.events || [];
                 // Migrate/sanitize imported events
                 events = migrateEvents(events);
                 events.sort((a, b) => b.timestamp - a.timestamp); // Ensure sorted

                 const sleepState = importedData.sleepState || { isSleeping: false, sleepStartTime: null };
                 isSleeping = sleepState.isSleeping || false;
                 sleepStartTime = sleepState.sleepStartTime ? Number(sleepState.sleepStartTime) : null;

                 pumpSchedule = importedData.pumpSchedule || { intervalHours: null, startTime: null };

                 snoozeState = importedData.snoozeState || {};
                 Object.keys(snoozeState).forEach(key => {
                      if (snoozeState[key]) snoozeState[key] = Number(snoozeState[key]);
                       // Clean expired snoozes
                      if (snoozeState[key] < Date.now()) delete snoozeState[key];
                 });

                 alarmsPaused = importedData.alarmsPaused || false;
                 settings = { ...settings, ...(importedData.settings || {}) }; // Merge imported settings, keeping defaults
                 
                 // Import additional collections (version 2+)
                 if (importedJson.version >= 2) {
                     growthData = importedData.growthData || { weight: [], length: [], headCircumference: [] };
                     milestoneData = importedData.milestoneData || { completed: [], upcoming: [] };
                     medicineSchedule = importedData.medicineSchedule || [];
                     temperatureData = importedData.temperatureData || [];
                     patternData = importedData.patterns || null;
                     
                     if (importedData.anomalies) {
                         anomalyDetection.detectedAnomalies = importedData.anomalies;
                     }
                 }

                 // --- Save and Refresh ---
                 saveData(); // Save the newly imported data to localStorage
                 hideAlarm(); // Ensure alarm UI is reset
                 updateSettingsUI();
                 updatePumpScheduleUI();
                 updateAlarmPauseStatus();
                 updateUI(); // Full UI refresh
                 scheduleNextMainAlarmCheck(1000); // Start checks with new data
                 
                 // Update milestones based on DOB
                 updateAvailableMilestones();
                 
                 // Initialize learning data if enabled
                 if (settings.advancedPredictions) {
                     initializeLearningData();
                 }
                 
                 // Detect patterns with new data
                 detectPatterns();

                 alert("Data imported successfully!");
                 logInfo("Data imported successfully.");

             } catch (error) {
                 logError("Failed to import data:", error);
                 alert(`Error importing data: ${error.message}. Please ensure the file is a valid JSON backup from this application.`);
             } finally {
                 DOMElements.importFileInput.value = ''; // Reset file input regardless of success/failure
             }
         };
         reader.onerror = () => {
             logError("Failed to read import file.");
             alert("Error reading the selected file.");
             DOMElements.importFileInput.value = '';
         };
         reader.readAsText(file);
     };
     
     /**
      * Schedules automatic backup based on settings.
      */
     const scheduleAutoBackup = () => {
         if (!settings.autoBackupEnabled) return;
         
         clearTimeout(backupTimeout);
         
         const now = Date.now();
         const interval = (settings.autoBackupInterval || 24) * 60 * 60 * 1000; // Convert hours to ms
         
         // If no previous backup or backup is due
         if (!lastBackupTime || (now - lastBackupTime) >= interval) {
             // Schedule backup soon (1 minute delay to avoid interrupting current tasks)
             backupTimeout = setTimeout(createAutoBackup, 60 * 1000);
         } else {
             // Schedule next backup when the interval expires
             const nextBackupTime = lastBackupTime + interval;
             const delay = nextBackupTime - now;
             
             backupTimeout = setTimeout(createAutoBackup, delay);
         }
     };
     
     /**
      * Creates automatic backup file.
      */
     const createAutoBackup = () => {
         try {
             const backupData = prepareBackupData();
             const dataStr = JSON.stringify(backupData);
             
             // Store in localStorage for emergency recovery
             localStorage.setItem('babyTrackerAutoBackup', dataStr);
             
             // Update last backup time
             lastBackupTime = Date.now();
             saveData();
             
             logInfo("Automatic backup created");
             
             // Schedule next backup
             scheduleAutoBackup();
         } catch (error) {
             logError("Failed to create automatic backup", error);
         }
     };


     // --- Settings Update ---
     const updateSettingsUI = () => {
         if (DOMElements.alarmSoundCheckbox) {
             DOMElements.alarmSoundCheckbox.checked = settings.alarmSoundEnabled;
         }
         
         // Update theme selector if it exists
         const themeSelect = document.getElementById('theme-select');
         if (themeSelect) {
             themeSelect.value = settings.theme || 'light';
         }
         
         // Update baby info fields if they exist
         const babyNameInput = document.getElementById('baby-name');
         const babyDOBInput = document.getElementById('baby-dob');
         const babyGenderSelect = document.getElementById('baby-gender');
         
         if (babyNameInput) babyNameInput.value = settings.babyName || '';
         if (babyDOBInput && settings.babyDOB) babyDOBInput.value = new Date(settings.babyDOB).toISOString().slice(0, 10);
         if (babyGenderSelect) babyGenderSelect.value = settings.babyGender || '';
         
         // Update unit preference selectors
         const tempUnitSelect = document.getElementById('temp-unit');
         const weightUnitSelect = document.getElementById('weight-unit');
         const lengthUnitSelect = document.getElementById('length-unit');
         
         if (tempUnitSelect) tempUnitSelect.value = settings.temperatureUnit || 'f';
         if (weightUnitSelect) weightUnitSelect.value = settings.weightUnit || 'lb';
         if (lengthUnitSelect) lengthUnitSelect.value = settings.lengthUnit || 'in';
         
         // Update backup settings
         const autoBackupCheckbox = document.getElementById('auto-backup');
         const backupIntervalInput = document.getElementById('backup-interval');
         
         if (autoBackupCheckbox) autoBackupCheckbox.checked = settings.autoBackupEnabled;
         if (backupIntervalInput) backupIntervalInput.value = settings.autoBackupInterval || 24;
         
         // Display last backup time if available
         const lastBackupDisplay = document.getElementById('last-backup-time');
         if (lastBackupDisplay) {
             lastBackupDisplay.textContent = lastBackupTime ? 
                 formatDateTime(lastBackupTime) : 
                 'No backup yet';
         }
     };

     const handleSettingsChange = (e) => {
         if (e.target === DOMElements.alarmSoundCheckbox) {
             settings.alarmSoundEnabled = e.target.checked;
             saveData();
             logInfo(`Alarm sound ${settings.alarmSoundEnabled ? 'enabled' : 'disabled'}.`);
         } else if (e.target.id === 'theme-select') {
             settings.theme = e.target.value;
             saveData();
             applyTheme();
             logInfo(`Theme changed to: ${settings.theme}`);
         } else if (e.target.id === 'baby-name') {
             settings.babyName = e.target.value;
             saveData();
         } else if (e.target.id === 'baby-dob') {
             settings.babyDOB = e.target.value ? new Date(e.target.value).getTime() : null;
             saveData();
             updateAvailableMilestones();
             updateGrowthAndMilestones();
         } else if (e.target.id === 'baby-gender') {
             settings.babyGender = e.target.value || null;
             saveData();
             updateGrowthAndMilestones();
         } else if (e.target.id === 'temp-unit') {
             settings.temperatureUnit = e.target.value;
             saveData();
         } else if (e.target.id === 'weight-unit') {
             settings.weightUnit = e.target.value;
             saveData();
         } else if (e.target.id === 'length-unit') {
             settings.lengthUnit = e.target.value;
             saveData();
         } else if (e.target.id === 'auto-backup') {
             settings.autoBackupEnabled = e.target.checked;
             saveData();
             
             if (settings.autoBackupEnabled) {
                 scheduleAutoBackup();
             } else {
                 clearTimeout(backupTimeout);
             }
         } else if (e.target.id === 'backup-interval') {
             const interval = parseInt(e.target.value);
             if (!isNaN(interval) && interval > 0) {
                 settings.autoBackupInterval = interval;
                 saveData();
                 
                 if (settings.autoBackupEnabled) {
                     scheduleAutoBackup();
                 }
             }
         }
     };
     
     // --- Voice Input (Speech Recognition) ---
     const initializeSpeechRecognition = () => {
         // Check if speech recognition is supported
         if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
             logWarning("Speech recognition not supported in this browser");
             return;
         }
         
         try {
             const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
             speechRecognition = new SpeechRecognition();
             
             speechRecognition.continuous = false;
             speechRecognition.interimResults = false;
             speechRecognition.lang = 'en-US';
             
             speechRecognition.onresult = (event) => {
                 const transcript = event.results[0][0].transcript.toLowerCase();
                 const confidence = event.results[0][0].confidence;
                 
                 logInfo(`Speech recognized: "${transcript}" (confidence: ${confidence.toFixed(2)})`);
                 
                 // Process speech command
                 processSpeechCommand(transcript, confidence);
             };
             
             speechRecognition.onerror = (event) => {
                 logError("Speech recognition error", event.error);
             };
             
             // Add voice command button
             addVoiceCommandButton();
             
             logInfo("Speech recognition initialized");
         } catch (error) {
             logError("Failed to initialize speech recognition", error);
         }
     };
     
     const addVoiceCommandButton = () => {
         // Check if button already exists
         if (document.getElementById('voice-command-button')) return;
         
         // Create the button
         const button = document.createElement('button');
         button.id = 'voice-command-button';
         button.className = 'voice-button';
         button.innerHTML = '🎤';
         button.title = 'Voice Command';
         button.setAttribute('aria-label', 'Activate voice command');
         
         // Style the button
         button.style.cssText = `
             position: fixed;
             bottom: 20px;
             left: 20px;
             width: 50px;
             height: 50px;
             border-radius: 50%;
             background-color: var(--primary-color);
             color: white;
             font-size: 24px;
             border: none;
             box-shadow: 0 2px 5px rgba(0,0,0,0.2);
             z-index: 1000;
             display: flex;
             align-items: center;
             justify-content: center;
             cursor: pointer;
         `;
         
         // Add event listener
         button.addEventListener('click', () => {
             button.disabled = true;
             button.style.backgroundColor = 'var(--accent-color)';
             button.innerHTML = '🔴';
             
             // Show recording indicator
             showInfoNotification("Listening... Say a command like 'log bottle feed'", 0);
             
             // Start listening
             speechRecognition.start();
             
             // Set timeout to stop listening after 10 seconds if no result
             setTimeout(() => {
                 if (speechRecognition) {
                     try {
                         speechRecognition.stop();
                     } catch (e) {
                         // Ignore errors if already stopped
                     }
                 }
                 
                 button.disabled = false;
                 button.style.backgroundColor = 'var(--primary-color)';
                 button.innerHTML = '🎤';
                 
                 // Hide notification if still showing
                 const notification = document.getElementById('info-notification');
                 if (notification && notification.textContent.includes('Listening')) {
                     notification.style.transform = 'translateY(-100px)';
                 }
             }, 10000);
         });
         
         // Add button to body
         document.body.appendChild(button);
     };
     
     const processSpeechCommand = (transcript, confidence) => {
         // Simple command parsing with confidence threshold
         if (confidence < 0.5) {
             showInfoNotification("Voice command not clear enough. Please try again.", 5000);
             return;
         }
         
         // Close any open notifications
         const notification = document.getElementById('info-notification');
         if (notification) {
             notification.style.transform = 'translateY(-100px)';
         }
         
         // Re-enable voice button
         const button = document.getElementById('voice-command-button');
         if (button) {
             button.disabled = false;
             button.style.backgroundColor = 'var(--primary-color)';
             button.innerHTML = '🎤';
         }
         
         // Process commands - this is a simplified example
         let commandRecognized = false;
         
         // Feed commands
         if (transcript.includes('bottle feed') || transcript.includes('log bottle')) {
             openModal('logFeed');
             // Pre-select bottle option
             setTimeout(() => {
                 const bottleOption = document.querySelector('input[value="bottle"]');
                 if (bottleOption) bottleOption.checked = true;
                 // Try to extract amount if mentioned
                 const amountMatch = transcript.match(/(\d+(?:\.\d+)?) ?(?:ounce|oz)/);
                 if (amountMatch) {
                     const amount = parseFloat(amountMatch[1]);
                     const amountField = document.getElementById('feed-amount');
                     if (amountField && !isNaN(amount)) {
                         amountField.value = amount;
                     }
                 }
             }, 100);
             commandRecognized = true;
         }
         else if (transcript.includes('breast feed') || transcript.includes('log breast')) {
             openModal('logFeed');
             // Pre-select breast option
             setTimeout(() => {
                 const breastOption = document.querySelector('input[value="breast"]');
                 if (breastOption) breastOption.checked = true;
                 
                 // Try to extract side if mentioned
                 if (transcript.includes('left')) {
                     const sideField = document.getElementById('feed-side');
                     if (sideField) sideField.value = 'L';
                 } else if (transcript.includes('right')) {
                     const sideField = document.getElementById('feed-side');
                     if (sideField) sideField.value = 'R';
                 }
                 
                 // Try to extract duration if mentioned
                 const durationMatch = transcript.match(/(\d+) ?(?:minute|min)/);
                 if (durationMatch) {
                     const duration = parseInt(durationMatch[1]);
                     const durationField = document.getElementById('feed-duration');
                     if (durationField && !isNaN(duration)) {
                         durationField.value = duration;
                     }
                 }
             }, 100);
             commandRecognized = true;
         }
         
         // Diaper commands
         else if (transcript.includes('wet diaper')) {
             openModal('logDiaper');
             // Pre-select wet option
             setTimeout(() => {
                 const wetOption = document.querySelector('input[value="wet"]');
                 if (wetOption) wetOption.checked = true;
             }, 100);
             commandRecognized = true;
         }
         else if (transcript.includes('dirty diaper')) {
             openModal('logDiaper');
             // Pre-select dirty option
             setTimeout(() => {
                 const dirtyOption = document.querySelector('input[value="dirty"]');
                 if (dirtyOption) dirtyOption.checked = true;
             }, 100);
             commandRecognized = true;
         }
         
         // Sleep commands
         else if (transcript.includes('start sleep') || transcript.includes('sleep start')) {
             if (!isSleeping) {
                 handleSleepToggle();
                 showInfoNotification("Sleep started", 2000);
             } else {
                 showInfoNotification("Sleep already in progress", 2000);
             }
             commandRecognized = true;
         }
         else if (transcript.includes('end sleep') || transcript.includes('stop sleep') || transcript.includes('sleep end')) {
             if (isSleeping) {
                 handleSleepToggle();
                 showInfoNotification("Sleep ended", 2000);
             } else {
                 showInfoNotification("No sleep in progress", 2000);
             }
             commandRecognized = true;
         }
         
         // Pump command
         else if (transcript.includes('log pump')) {
             openModal('logPump');
             
             // Try to extract amount if mentioned
             setTimeout(() => {
                 const amountMatch = transcript.match(/(\d+(?:\.\d+)?) ?(?:ounce|oz)/);
                 if (amountMatch) {
                     const amount = parseFloat(amountMatch[1]);
                     const amountField = document.getElementById('pump-amount');
                     if (amountField && !isNaN(amount)) {
                         amountField.value = amount;
                     }
                 }
             }, 100);
             commandRecognized = true;
         }
         
         // Temperature command
         else if (transcript.includes('log temperature') || transcript.includes('log temp')) {
             openModal('logTemperature');
             
             // Try to extract temperature value if mentioned
             setTimeout(() => {
                 const tempMatch = transcript.match(/(\d+(?:\.\d+)?) ?(?:degree|degrees|f|c)/);
                 if (tempMatch) {
                     const temp = parseFloat(tempMatch[1]);
                     const tempField = document.getElementById('temp-value');
                     if (tempField && !isNaN(temp)) {
                         tempField.value = temp;
                     }
                 }
             }, 100);
             commandRecognized = true;
         }
         
         // Show help for voice commands
         else if (transcript.includes('help') || transcript.includes('commands')) {
             showInfoNotification(
                 "Available commands: log bottle feed, log breast feed, wet diaper, dirty diaper, start sleep, end sleep, log pump, log temperature", 
                 10000
             );
             commandRecognized = true;
         }
         
         if (!commandRecognized) {
             showInfoNotification("Command not recognized. Try 'help' for available commands.", 5000);
         }
     };

    // --- Initialization and Event Listeners ---
    const initializeApp = () => {
        logInfo(`Initializing ${APP_NAME} v${APP_VERSION}...`);

        // Load data first
        loadData();

        // Set up repeating tasks
        setInterval(updateClock, 1000);
        setInterval(updateDashboard, DASHBOARD_UPDATE_INTERVAL); // Update dashboard periodically

        // Initial UI state setup
        updateClock(); // Immediate clock update
        // updateUI(); // Called within loadData's finally block now
        switchTab('history'); // Default to history tab

        // Start the main alarm check loop (runs first check relatively quickly)
        scheduleNextMainAlarmCheck(5000);
        
        // Initialize speech recognition if enabled
        if (settings.voiceInputEnabled) {
            initializeSpeechRecognition();
        }
        
        // Schedule automatic backup if enabled
        if (settings.autoBackupEnabled) {
            scheduleAutoBackup();
        }

        // --- Event Listeners ---
        // Modal listeners
        if (DOMElements.closeModalButton) DOMElements.closeModalButton.addEventListener('click', closeModal);
        if (DOMElements.modal) DOMElements.modal.addEventListener('click', (e) => { if (e.target === DOMElements.modal) closeModal(); }); // Click outside modal
        if (DOMElements.logForm) DOMElements.logForm.addEventListener('submit', handleFormSubmit);

        // Dashboard quick actions (event delegation)
        if(DOMElements.dashboardContainer) DOMElements.dashboardContainer.addEventListener('click', handleDashboardClick);

        // Tab navigation (event delegation on parent)
        const tabsContainer = document.querySelector('.tabs');
        if(tabsContainer) tabsContainer.addEventListener('click', handleTabClick);

        // Chart type selection
        if(DOMElements.chartTypeSelect) DOMElements.chartTypeSelect.addEventListener('change', renderChart);

        // History filters
        if(DOMElements.historyFilter) DOMElements.historyFilter.addEventListener('change', renderEventList);
        if(DOMElements.historyLimit) DOMElements.historyLimit.addEventListener('change', renderEventList);

        // Alarm interactions (event delegation)
        if(DOMElements.alarmNotification) DOMElements.alarmNotification.addEventListener('click', handleAlarmInteraction);
        if(DOMElements.resumeAlarmsButton) DOMElements.resumeAlarmsButton.addEventListener('click', () => resumeAllAlarms(false));
        if(DOMElements.forceResumeAlarmsButton) DOMElements.forceResumeAlarmsButton.addEventListener('click', () => resumeAllAlarms(true));

        // Pumping schedule save
        if(DOMElements.savePumpScheduleButton) DOMElements.savePumpScheduleButton.addEventListener('click', savePumpSchedule);

        // Settings changes (event delegation)
        if(DOMElements.settingsContainer) DOMElements.settingsContainer.addEventListener('input', handleSettingsChange); // Use input for immediate feedback on checkbox

        // Data management buttons
        if(DOMElements.exportButton) DOMElements.exportButton.addEventListener('click', handleExportData);
        if(DOMElements.importFileInput) DOMElements.importFileInput.addEventListener('change', handleImportData);
        // Trigger file input click from label
        if(DOMElements.importButtonLabel && DOMElements.importFileInput) DOMElements.importButtonLabel.addEventListener('click', () => DOMElements.importFileInput.click());
        if(DOMElements.clearDataButton) DOMElements.clearDataButton.addEventListener('click', clearAllData);
        
        // Add growth measurement listeners if tab exists
        const growthTypeSelect = document.getElementById('growth-type');
        if (growthTypeSelect) {
            growthTypeSelect.addEventListener('change', renderGrowthChart);
        }
        
        // Add milestone completion button delegation
        const milestonesContainer = document.getElementById('milestones-container');
        if (milestonesContainer) {
            milestonesContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('mark-complete')) {
                    const milestoneName = e.target.dataset.milestone;
                    if (milestoneName) {
                        completeMilestone(milestoneName);
                    }
                }
            });
        }
        
        // Web Notification Permission Request
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            // Add a button to request notification permission
            const notifyButton = document.createElement('button');
            notifyButton.id = 'notification-permission';
            notifyButton.className = 'notification-button';
            notifyButton.textContent = 'Enable Notifications';
            notifyButton.style.cssText = `
                position: fixed;
                top: 10px;
                right: 120px;
                z-index: 1000;
                padding: 5px 10px;
                background-color: var(--primary-color);
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
            `;
            
            notifyButton.addEventListener('click', () => {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        notifyButton.remove();
                        showInfoNotification('Notifications enabled!', 3000);
                    }
                });
            });
            
            document.body.appendChild(notifyButton);
        }

        logInfo("Application Initialized.");
    };

    // --- Start the Application ---
    initializeApp();

}); // End DOMContentLoaded
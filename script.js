/**
 * Baby Tracker Pro - script.js
 *
 * Enhanced version with guidance, help system, improved UI feedback,
 * prediction confidence, and manual past event logging.
 * Version: 2.1 (Full Code Expansion)
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- Application Constants ---
    const APP_NAME = 'Baby Tracker Pro';
    const STORAGE_KEYS = {
        EVENTS: 'babyTrackerEvents_v1',
        SLEEP_STATE: 'babyTrackerSleepState_v1',
        PUMP_SCHEDULE: 'babyTrackerPumpSchedule_v1',
        SNOOZE_STATE: 'babyTrackerSnoozeState_v1',
        ALARMS_PAUSED: 'babyTrackerAlarmsPaused_v1',
        SETTINGS: 'babyTrackerSettings_v1',
        GUIDANCE_DISMISSED: 'babyTrackerGuidanceDismissed_v1' // Tracks if initial guidance dismissed
    };
    const ALARM_CHECK_INTERVAL = 30 * 1000;       // Check alarms every 30 seconds
    const DASHBOARD_UPDATE_INTERVAL = 60 * 1000; // Update dashboard every minute
    const PREDICTION_MIN_EVENTS = 4;             // Min events needed for a somewhat reliable prediction
    const PREDICTION_WINDOW = 10;                // Number of recent events for moving average
    const ALARM_THRESHOLD_PERCENT = 0.95;        // Trigger alarm nearing predicted time
    const CONFIDENCE_THRESHOLDS = { LOW: 0.35, MEDIUM: 0.7 }; // Std Dev / Mean thresholds for confidence

    // --- State Variables ---
    let events = [];                     // Main data store for all events
    let isSleeping = false;              // Is the baby currently tracked as sleeping?
    let sleepStartTime = null;           // Timestamp when current sleep started
    let pumpSchedule = { intervalHours: null, startTime: null }; // User's pumping schedule
    let snoozeState = {};                // Stores { eventType: snoozeEndTime } timestamps
    let alarmsPaused = false;            // Global flag to pause all alarms
    let alarmTimeouts = {};              // Stores { eventType: timeoutID } for pending alarms
    let currentChart = null;             // Instance of the currently displayed Chart.js chart
    let settings = {                     // User preferences
        alarmSoundEnabled: true,
    };
    let guidanceDismissed = false;       // Track if initial guidance is dismissed
    let mainAlarmCheckTimeout = null;    // Timeout ID for the main periodic alarm check

    // --- DOM Element Cache (Enhanced) ---
    const DOMElements = {
        // Header & General
        currentTime: document.getElementById('current-time'),
        guidanceBanner: document.getElementById('initial-guidance'),
        dismissGuidanceButton: document.querySelector('.dismiss-guidance'),
        mainContent: document.querySelector('main'), // For help button delegation

        // Modals
        logModal: document.getElementById('log-modal'),
        logModalTitle: document.getElementById('modal-title'),
        logForm: document.getElementById('log-form'),
        closeLogModalButton: document.querySelector('#log-modal .close-button'),
        helpModal: document.getElementById('help-modal'),
        helpModalTitle: document.getElementById('help-modal-title'),
        helpModalContent: document.getElementById('help-modal-content'),
        closeHelpModalButton: document.querySelector('#help-modal .close-button'),

        // Dashboard Cards & Progress
        dashboardContainer: document.querySelector('.dashboard'),
        feedPredictionConfidence: document.getElementById('feed-confidence'),
        wetPredictionConfidence: document.getElementById('wet-confidence'),
        dirtyPredictionConfidence: document.getElementById('dirty-confidence'),
        sleepPredictionConfidence: document.getElementById('sleep-confidence'),
        sleepToggleButton: document.getElementById('sleep-toggle-button'),
        // Progress Bar Labels
        feedProgressLabel: document.getElementById('feed-progress-label'),
        diaperWetProgressLabel: document.getElementById('diaper-wet-label'),
        diaperDirtyProgressLabel: document.getElementById('diaper-dirty-label'),
        sleepProgressLabel: document.getElementById('sleep-progress-label'),
        pumpProgressLabel: document.getElementById('pump-progress-label'),


        // Alarm Notification
        alarmNotification: document.getElementById('alarm-notification'),
        alarmMessage: document.getElementById('alarm-message'),
        dismissAlarmButton: document.getElementById('dismiss-alarm'),
        resumeAlarmsButton: document.getElementById('resume-alarms'),
        snoozeOptionsContainer: document.querySelector('#alarm-notification .snooze-options'),

        // Analysis & History Tabs
        tabsContainer: document.querySelector('.tabs'),
        tabContents: document.querySelectorAll('.tab-content'),
        eventList: document.getElementById('event-list'),
        historyFilter: document.getElementById('history-filter'),
        historyLimit: document.getElementById('history-limit'),

        // Charts
        chartCanvas: document.getElementById('main-chart'),
        chartTypeSelect: document.getElementById('chart-type'),

        // Reports
        dailySummaryList: document.getElementById('daily-summary'),
        projectionList: document.getElementById('24h-projection'),

        // Settings
        settingsContainer: document.getElementById('settings'),
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
    };

    // --- Help Content (Map topics to HTML strings) ---
    const helpContent = {
        'dashboard': `<h3>Dashboard Help</h3><p>The dashboard provides a quick overview of your baby's current status and upcoming needs based on logged data.</p><ul><li><strong>Cards:</strong> Each card focuses on an activity like feeding, diapers, sleep, or pumping.</li><li><strong>Last Event:</strong> Shows the time and details of the most recent log for that activity.</li><li><strong>Next Estimate:</strong> Predicts when the next event (like hunger or needing a change) might occur. Confidence indicators (?, ✓, ✓✓) show how reliable the prediction is based on data consistency.</li><li><strong>Progress Bars:</strong> Visually represent how close the baby might be to needing the next event, based on typical intervals. Labels show percentage or duration.</li><li><strong>Buttons:</strong> Quickly log new events or manage schedules.</li></ul>`,
        'feeding-card': `<h3>Feeding Card Help</h3><p>Tracks bottle or breastfeeding sessions.</p><ul><li>Log feeds using the 'Log Feed' button.</li><li>The prediction estimates the next feeding time based on recent patterns.</li><li>The progress bar fills up as the estimated feeding time approaches.</li></ul>`,
        'diaper-card': `<h3>Diaper Card Help</h3><p>Tracks wet, dirty, or mixed diaper changes.</p><ul><li>Log changes using the 'Log Diaper' button.</li><li>Predictions estimate the next likely wet and dirty diapers separately.</li><li>Progress bars track progress towards each type of change.</li></ul>`,
        'sleep-card': `<h3>Sleep Card Help</h3><p>Tracks sleep periods.</p><ul><li>Use 'Start Sleep' / 'End Sleep' for live tracking.</li><li>Use 'Log Past Sleep' to manually enter a sleep period that already happened.</li><li>The prediction estimates the next nap time based on recent awake durations.</li><li>The progress bar shows time awake (when awake) or duration asleep (when sleeping).</li></ul>`,
        'pumping-card': `<h3>Pumping Card Help</h3><p>Tracks breast milk pumping sessions and helps manage a schedule.</p><ul><li>Log sessions using the 'Log Pump' button.</li><li>Set a target interval and optional start time using the 'Schedule' button (this takes you to Settings).</li><li>The prediction shows the next scheduled time if a schedule is set.</li><li>The progress bar tracks time since the last pump relative to your schedule or historical average.</li></ul>`,
        'logging': `<h3>Logging Events Help</h3><p>Accurate logging is key for useful predictions!</p><ul><li><strong>Time:</strong> Defaults to now, but you can adjust it for past events. For past sleep, use the specific Start and End time fields.</li><li><strong>Details:</strong> Fill in relevant details like amount (bottle), duration/side (breast), or diaper type.</li><li><strong>Notes:</strong> Add any useful observations (mood, fussiness, poop color, etc.). This isn't used for predictions but is helpful for your reference.</li><li><strong>Saving:</strong> Click 'Log Event' or 'Save Changes' when done.</li></ul>`,
        'alarms': `<h3>Alarms Help</h3><p>Alarms notify you shortly before an estimated need (like feeding or diaper change) or a scheduled pump.</p><ul><li><strong>Snooze:</strong> Temporarily silence the current alarm for a set duration.</li><li><strong>Pause All:</strong> Silence ALL future alarms until you manually resume them in Settings.</li><li><strong>Dismiss:</strong> Hides the current notification. The alarm might reappear later if the condition persists.</li><li>Alarms improve as more consistent data is logged.</li></ul>`,
        'analysis': `<h3>Analysis & History Help</h3><p>Explore past data and trends.</p><ul><li><strong>Event History:</strong> View, filter, edit, or delete past logs.</li><li><strong>Charts:</strong> Visualize trends over time (daily intake, sleep duration, etc.). Select different chart types from the dropdown.</li><li><strong>Reports & Projections:</strong> See a summary for today and estimated event times for the next 24 hours. Projections become more accurate with more data.</li><li><strong>Settings:</strong> Manage data (backup/import/clear), alarm preferences, and pumping schedule.</li></ul>`,
        'history': `<h3>Event History Help</h3><p>Review your logged events.</p><ul><li><strong>Filtering:</strong> Use the dropdowns to show specific event types or change the number of items displayed.</li><li><strong>Editing:</strong> Click 'Edit' on an entry to correct mistakes.</li><li><strong>Deleting:</strong> Click 'Delete' to permanently remove an entry (use with caution!).</li></ul>`,
        'charts': `<h3>Charts Help</h3><p>Visualize your baby's patterns.</p><ul><li>Select different chart types using the dropdown menu.</li><li>Charts show data typically from the last 7 days.</li><li>Hover over data points on the chart for specific values.</li><li>Consistent logging provides more meaningful charts.</li></ul>`,
        'reports': `<h3>Reports & Projections Help</h3><p>Get summaries and future estimates.</p><ul><li><strong>Daily Summary:</strong> Shows totals for today (feeds, sleep duration, diaper counts, etc.).</li><li><strong>Projections:</strong> Estimates event times for the next 24 hours based on learned patterns. These are estimates and improve over time.</li></ul>`,
        'settings': `<h3>Settings Help</h3><p>Configure the application.</p><ul><li><strong>Data Management:</strong> Export backups (recommended!), import backups, or clear all data.</li><li><strong>Alarm Settings:</strong> Enable/disable the alarm sound and see/manage the global alarm pause state.</li><li><strong>Pumping Schedule:</strong> Set your desired pumping interval and optional start time.</li></ul>`,
        'data-management': `<h3>Data Management Help</h3><ul><li><strong>Export:</strong> Creates a JSON backup file of all your data. Save this file somewhere safe!</li><li><strong>Import:</strong> Loads data from a previously exported JSON file. WARNING: This overwrites ALL current data in the app.</li><li><strong>Clear All Data:</strong> Permanently deletes everything. IRREVERSIBLE!</li></ul>`,
        'alarm-settings': `<h3>Alarm Settings Help</h3><ul><li><strong>Enable Sound:</strong> Toggles the simple beep sound for alarms.</li><li><strong>Alarms Paused:</strong> Shows if you've used the 'Pause All' option on an alarm notification. Use 'Force Resume' to reactivate alarms immediately, clearing any active snoozes as well.</li></ul>`,
        'pumping-schedule': `<h3>Pumping Schedule Info</h3><p>Setting a schedule helps plan pumping sessions and provides reminders.</p><ul><li>Enter the desired interval (in hours) between pumping sessions.</li><li>Optionally, enter a preferred start time (e.g., 07:00) to help anchor the schedule, especially when starting out.</li><li>The app will predict the next session based on your last pump and the interval.</li><li>You can adjust this anytime in the Settings tab.</li></ul>`,
        'pumping-schedule-settings': `<h3>Pumping Schedule Settings</h3><p>Configure your pumping routine.</p><ul><li><strong>Interval:</strong> How often (in hours) you aim to pump (e.g., 3 for every 3 hours).</li><li><strong>Start Time:</strong> Optional. If set, the app tries to align scheduled times closer to this time of day when possible, especially for the first pump if no history exists.</li><li>Click 'Save Schedule' to apply changes. Clear the interval field and save to remove the schedule.</li></ul>`,
    };

    // --- Utility Functions ---
    const formatTime = (date) => date ? new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A';
    const formatDate = (date) => date ? new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'N/A';
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
        if (minutes > 0 || hours > 0 || !precise) durationStr += `${minutes}m`;
        if (precise && seconds > 0 && hours === 0 && minutes < 5) durationStr += ` ${seconds}s`;
        return durationStr.trim() || (precise ? '0s' : '0m');
    };
    const getTimestamp = (dateTimeStr) => dateTimeStr ? new Date(dateTimeStr).getTime() : Date.now();
    const getCurrentLocalDateTimeValue = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        now.setSeconds(0, 0);
        return now.toISOString().slice(0, 16);
    };
    const generateId = () => `_${Math.random().toString(36).substr(2, 9)}`;
    const logError = (message, error = '') => console.error(`${APP_NAME} Error: ${message}`, error);
    const logInfo = (message, data = '') => console.info(`${APP_NAME} Info: ${message}`, data);
    const logWarning = (message) => console.warn(`${APP_NAME} Warning: ${message}`);

    // --- Guidance Banner Logic ---
    const showGuidance = () => {
        if (!guidanceDismissed && events.length < 3 && DOMElements.guidanceBanner) {
            DOMElements.guidanceBanner.style.display = 'block';
        } else if (DOMElements.guidanceBanner) {
            DOMElements.guidanceBanner.style.display = 'none'; // Ensure it's hidden otherwise
        }
    };
    const dismissGuidance = () => {
        if (DOMElements.guidanceBanner) DOMElements.guidanceBanner.style.display = 'none';
        if (!guidanceDismissed) {
            guidanceDismissed = true;
            try {
                localStorage.setItem(STORAGE_KEYS.GUIDANCE_DISMISSED, 'true');
            } catch (error) {
                logError("Could not save guidance dismissal state.", error);
            }
        }
    };

    // --- Help Modal Logic ---
    const openHelpModal = (topic) => {
        if (!DOMElements.helpModal || !DOMElements.helpModalContent || !DOMElements.helpModalTitle) return;
        const content = helpContent[topic] || `<p>Help topic "${topic}" not found.</p>`;
        let title = 'Help';
        const titleMatch = content.match(/<h3.*?>(.*?)<\/h3>/i);
        if (titleMatch && titleMatch[1]) title = titleMatch[1];

        DOMElements.helpModalTitle.textContent = title;
        DOMElements.helpModalContent.innerHTML = content;
        DOMElements.helpModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    };
    const closeHelpModal = () => {
        if (!DOMElements.helpModal) return;
        DOMElements.helpModal.style.display = 'none';
        // Restore body scroll only if log modal isn't also open
        if (DOMElements.logModal?.style.display !== 'block') {
            document.body.style.overflow = '';
        }
    };
    const handleHelpClick = (e) => {
        const helpButton = e.target.closest('.help-btn');
        if (helpButton) {
            e.stopPropagation();
            const topic = helpButton.dataset.helpTopic;
            if (topic) openHelpModal(topic);
            else logWarning("Help button clicked without a data-help-topic attribute.");
        }
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
            localStorage.setItem(STORAGE_KEYS.GUIDANCE_DISMISSED, guidanceDismissed ? 'true' : 'false');
        } catch (error) {
            logError("Failed to save data.", error);
            // Optionally, provide user feedback here if saving fails persistently
        }
    };

    const loadData = () => {
        logInfo("Loading data...");
        try {
            const storedEvents = localStorage.getItem(STORAGE_KEYS.EVENTS);
            const storedSleepState = localStorage.getItem(STORAGE_KEYS.SLEEP_STATE);
            const storedPumpSchedule = localStorage.getItem(STORAGE_KEYS.PUMP_SCHEDULE);
            const storedSnoozeState = localStorage.getItem(STORAGE_KEYS.SNOOZE_STATE);
            const storedAlarmsPaused = localStorage.getItem(STORAGE_KEYS.ALARMS_PAUSED);
            const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            const storedGuidanceDismissed = localStorage.getItem(STORAGE_KEYS.GUIDANCE_DISMISSED);

            // Load and Parse Events
            events = storedEvents ? JSON.parse(storedEvents) : [];
            // Sanitize Events
            events.forEach(event => {
                event.timestamp = Number(event.timestamp);
                if (event.start) event.start = Number(event.start);
                if (event.end) event.end = Number(event.end);
                if (!event.id) event.id = generateId(); // Add missing IDs
                // Add other sanitization if needed (e.g., default values for new fields)
            });
            events.sort((a, b) => b.timestamp - a.timestamp); // Ensure sorted

            // Load Sleep State
            const sleepState = storedSleepState ? JSON.parse(storedSleepState) : { isSleeping: false, sleepStartTime: null };
            isSleeping = sleepState.isSleeping || false;
            sleepStartTime = sleepState.sleepStartTime ? Number(sleepState.sleepStartTime) : null;
             // Sanity check: If app loaded while 'sleeping', but start time is very old, reset state.
             if (isSleeping && sleepStartTime && (Date.now() - sleepStartTime > 24 * 60 * 60 * 1000)) { // More than 24h sleep? Unlikely.
                 logWarning("Found potentially stale 'sleeping' state on load. Resetting sleep state.");
                 isSleeping = false;
                 sleepStartTime = null;
             }

            // Load Pump Schedule
            pumpSchedule = storedPumpSchedule ? JSON.parse(storedPumpSchedule) : { intervalHours: null, startTime: null };

            // Load Snooze State & Clean Expired
            snoozeState = storedSnoozeState ? JSON.parse(storedSnoozeState) : {};
            Object.keys(snoozeState).forEach(key => {
                 if (snoozeState[key]) snoozeState[key] = Number(snoozeState[key]);
                 if (snoozeState[key] < Date.now()) delete snoozeState[key]; // Remove expired snoozes
            });

            // Load Other States
            alarmsPaused = storedAlarmsPaused ? JSON.parse(storedAlarmsPaused) : false;
            settings = storedSettings ? { ...settings, ...JSON.parse(storedSettings) } : settings;
            guidanceDismissed = storedGuidanceDismissed === 'true';

            logInfo(`Data loaded: ${events.length} events.`);
        } catch (error) {
            logError("Failed to load data. Data might be corrupted.", error);
            alert("Error: Could not load previous data. It might be corrupted. Starting fresh or try importing a backup.");
            // Reset to defaults on critical load failure
            events = []; isSleeping = false; sleepStartTime = null; pumpSchedule = { intervalHours: null, startTime: null };
            snoozeState = {}; alarmsPaused = false; settings = { alarmSoundEnabled: true }; guidanceDismissed = false;
            saveData(); // Attempt to save the fresh state
        } finally {
             // Always update UI after load attempt
             updateSettingsUI();
             updatePumpScheduleUI();
             updateAlarmPauseStatus();
             updateUI(); // Full UI refresh based on loaded (or reset) state
             showGuidance(); // Attempt to show guidance banner
        }
    };

    const addEvent = (eventData) => {
        const newEvent = { id: generateId(), timestamp: eventData.timestamp || Date.now(), ...eventData };
        // Add basic validation if needed (e.g., ensure required fields exist based on type)
        events.push(newEvent);
        events.sort((a, b) => b.timestamp - a.timestamp); // Keep sorted
        dismissGuidance(); // User has logged something, hide initial help
        saveData();
        updateUI();
        logInfo(`Event added: ${newEvent.type} (ID: ${newEvent.id})`);
        // Trigger alarm check soon after adding data, might change predictions
        scheduleNextMainAlarmCheck(5000); // Check in 5 seconds
    };

     const updateEvent = (eventId, updatedData) => {
        const eventIndex = events.findIndex(e => e.id === eventId);
        if (eventIndex > -1) {
            const originalEvent = events[eventIndex];
            // Merge updates, ensuring crucial properties are numbers and ID is preserved
            events[eventIndex] = { ...originalEvent, ...updatedData, id: eventId };
            events[eventIndex].timestamp = Number(events[eventIndex].timestamp);
            if (events[eventIndex].start) events[eventIndex].start = Number(events[eventIndex].start);
            if (events[eventIndex].end) events[eventIndex].end = Number(events[eventIndex].end);

            // Re-sort if the primary timestamp changed
            if (updatedData.timestamp && updatedData.timestamp !== originalEvent.timestamp) {
                 events.sort((a, b) => b.timestamp - a.timestamp);
            }
            saveData();
            updateUI();
            logInfo(`Event updated: ${events[eventIndex].type} (ID: ${eventId})`);
            scheduleNextMainAlarmCheck(5000); // Re-check alarms after data change
        } else {
            logError("Event not found for update:", eventId);
        }
    };

    const deleteEvent = (eventId) => {
        if (!confirm("Are you sure you want to permanently delete this event? This cannot be undone.")) return;
        const initialLength = events.length;
        events = events.filter(e => e.id !== eventId);
        if (events.length < initialLength) {
            saveData();
            updateUI();
            logInfo(`Event deleted: (ID: ${eventId})`);
            scheduleNextMainAlarmCheck(5000);
        } else {
             logWarning(`Event not found for deletion: (ID: ${eventId})`);
        }
    };

     const clearAllData = () => {
        if (confirm("⚠️ WARNING! ⚠️\n\nThis will permanently delete ALL tracked data (events, settings, schedules, etc.).\n\nThis action cannot be undone.\n\nAre you absolutely sure you want to proceed?")) {
            // Clear all known keys from localStorage
            Object.values(STORAGE_KEYS).forEach(key => {
                try { localStorage.removeItem(key); } catch (e) { logError(`Failed to remove item ${key}`, e); }
            });

            // Reset state variables
            events = []; isSleeping = false; sleepStartTime = null; pumpSchedule = { intervalHours: null, startTime: null };
            snoozeState = {}; alarmsPaused = false; settings = { alarmSoundEnabled: true }; guidanceDismissed = false; // Reset guidance

            // Clear active alarms and UI elements related to data
            clearAllAlarmTimeouts();
            hideAlarm();
            if (currentChart) { currentChart.destroy(); currentChart = null; }

            // Full UI refresh to reflect cleared state
            updateSettingsUI(); updatePumpScheduleUI(); updateAlarmPauseStatus(); updateUI();
            showGuidance(); // Show guidance banner again after clearing data

            logInfo("All application data has been cleared.");
            alert("All data has been cleared successfully.");
        }
    };

    // --- Prediction Logic with Confidence ---
    /**
     * Calculates the average interval and a confidence score based on standard deviation.
     * @param {string} eventType - The type of event (e.g., 'feeding', 'sleep').
     * @param {object|null} subType - Optional filter for subtype (e.g., { diaperType: 'wet' }).
     * @param {number} window - Number of recent intervals to average.
     * @returns {object|null} { average: number, confidence: number (0-1), count: number } or null.
     */
    const calculateIntervalStats = (eventType, subType = null, window = PREDICTION_WINDOW) => {
        let relevantEvents = events.filter(e => e.type === eventType);
        if (subType) {
            const subTypeKey = Object.keys(subType)[0];
            relevantEvents = relevantEvents.filter(e => e[subTypeKey] === Object.values(subType)[0]);
        }
        // Sort ascending by the relevant timestamp for interval calculation
        relevantEvents.sort((a, b) => (eventType === 'sleep' ? (a.start || a.timestamp) : a.timestamp) - (eventType === 'sleep' ? (b.start || b.timestamp) : b.timestamp));

        if (relevantEvents.length < 2) return null; // Need at least two points to make an interval

        const intervals = [];
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
            // Basic outlier filtering (e.g., ignore negative intervals or extremely long ones)
            const MAX_REASONABLE_INTERVAL = 2 * 24 * 60 * 60 * 1000; // 48 hours seems reasonable max for most intervals
            if (interval > 1000 && interval < MAX_REASONABLE_INTERVAL) { // Ignore intervals less than a second too
                intervals.push(interval);
            }
        }

        if (intervals.length === 0) return null;

        // Use moving average if enough intervals, otherwise use overall average if possible
        const intervalsToAnalyze = intervals.length >= window ? intervals.slice(-window) : intervals;
        const count = intervalsToAnalyze.length;

        // Need PREDICTION_MIN_EVENTS - 1 intervals for a somewhat reliable prediction
        if (count < PREDICTION_MIN_EVENTS - 1) {
            return { average: null, confidence: 0, count: count }; // Return low confidence if not enough data
        }

        const average = intervalsToAnalyze.reduce((sum, val) => sum + val, 0) / count;

        // Calculate Standard Deviation for confidence scoring
        const variance = intervalsToAnalyze.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / count;
        const stdDev = Math.sqrt(variance);

        // Calculate Confidence (lower std dev relative to mean = higher confidence)
        let confidence = 0;
        if (average > 0) { // Avoid division by zero
            const relativeStdDev = stdDev / average;
            // Inverse relationship: lower relative std dev -> higher confidence
            // Using thresholds defined in constants
            if (relativeStdDev < CONFIDENCE_THRESHOLDS.LOW) {
                confidence = 1.0; // High confidence
            } else if (relativeStdDev < CONFIDENCE_THRESHOLDS.MEDIUM) {
                confidence = 0.66; // Medium confidence
            } else {
                confidence = 0.33; // Low confidence
            }
        }
         // Boost confidence slightly based purely on number of data points (up to a limit)
         // More data points make the average itself more reliable, even if variance is high
         confidence = Math.min(1, confidence + (count / (PREDICTION_WINDOW * 2))); // Small boost, max 1


        return { average, confidence: Math.max(0, Math.min(1, confidence)), count }; // Ensure confidence is clamped 0-1
    };

    /**
     * Predicts the next event, now including a confidence score.
     * @param {string} eventType - The type of event.
     * @param {object|null} subType - Optional subtype filter.
     * @returns {object} { prediction: number|null, lastEventTime: number|null, avgInterval: number|null, confidence: number (0-1) }
     */
    const predictNextEvent = (eventType, subType = null) => {
        const stats = calculateIntervalStats(eventType, subType);
        const avgInterval = stats?.average || null;
        const confidence = stats?.confidence || 0; // Default to 0 confidence if stats are null

        let lastEventTime = null;
        let prediction = null;

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
                 relevantEvents = relevantEvents.filter(e => e[subTypeKey] === Object.values(subType)[0]);
             }
             lastEvent = relevantEvents[0]; // Assumes events are sorted descending
             lastEventTime = lastEvent?.timestamp || null;
         }

        // Calculate prediction only if we have a basis and an average interval
        if (lastEventTime && avgInterval) {
            prediction = lastEventTime + avgInterval;
        }

        return { prediction, lastEventTime, avgInterval, confidence };
    };


    // --- UI Update Functions (Enhanced) ---
    const updateClock = () => {
         if (DOMElements.currentTime) {
            DOMElements.currentTime.textContent = formatDateTime(Date.now());
         }
    };

    const updateProgressBar = (elementId, labelElement, baseLabel, lastEventTime, avgInterval, predictedTime = null, isCurrentlyActive = false, activeStartTime = null) => {
        const progressBar = document.getElementById(elementId);
        const labelSpan = labelElement; // Use cached element from DOMElements
        if (!progressBar || !labelSpan) return;

        let percentage = 0;
        let labelText = baseLabel ? `${baseLabel}: 0%` : `0%`; // Default label text
        progressBar.classList.remove('medium', 'high', 'active-state'); // Reset classes each time
        progressBar.removeAttribute('aria-valuenow'); // Clear previous ARIA value

        if (isCurrentlyActive && activeStartTime) {
            // --- Active State (e.g., Currently Sleeping) ---
            const elapsedActive = Date.now() - activeStartTime;
            let avgDuration = null;
             // Only calculate average duration meaningfully for sleep
             if (baseLabel === 'Sleeping') {
                 avgDuration = calculateAverageSleepDuration();
             }

             if (avgDuration && avgDuration > 0) {
                // Progress relative to average duration
                percentage = Math.min(100, (elapsedActive / avgDuration) * 100);
            } else {
                percentage = 5; // Show a small amount of progress even if avg duration is unknown
            }
            labelText = `${baseLabel}: ${formatDuration(elapsedActive, true)}`; // Show running duration precisely
            progressBar.classList.add('active-state'); // Apply specific styling for active state

        } else if (lastEventTime && avgInterval && avgInterval > 0) {
             // --- Inactive State (Progress towards next event) ---
            const now = Date.now();
            const elapsed = now - lastEventTime;
            percentage = Math.max(0, (elapsed / avgInterval) * 100); // Calculate raw percentage
            const effectivePredictedTime = predictedTime || (lastEventTime + avgInterval); // Use predicted if available

            // Adjust percentage visually based on prediction time
            if (now < effectivePredictedTime) {
                // Before predicted time, cap progress visually slightly below 100% unless very close
                percentage = Math.min(percentage, 99.5);
            } else {
                // After predicted time, ensure it shows 100%
                percentage = 100;
            }

            labelText = baseLabel ? `${baseLabel}: ${Math.round(percentage)}%` : `${Math.round(percentage)}%`;

            // Apply urgency classes based on percentage
            if (percentage >= 95) progressBar.classList.add('high');
            else if (percentage >= 75) progressBar.classList.add('medium');

        } else {
             // --- No Data State ---
             labelText = baseLabel ? `${baseLabel}: N/A` : `N/A`; // Indicate not applicable
             percentage = 0;
        }

        // Ensure percentage is within bounds and update styles/ARIA
        percentage = Math.min(100, Math.max(0, percentage)); // Clamp 0-100
        progressBar.style.width = `${percentage}%`;
        labelSpan.textContent = labelText;
        progressBar.setAttribute('aria-valuenow', Math.round(percentage)); // Update ARIA value for accessibility
    };

    const updateConfidenceIndicator = (element, confidence) => {
        if (!element) return;
        let indicator = '';
        let title = '';
        // Determine indicator and title based on confidence score
        if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
            indicator = '✓✓'; // High confidence
            title = 'Prediction confidence: High (based on consistent data)';
        } else if (confidence >= CONFIDENCE_THRESHOLDS.LOW) {
             indicator = '✓'; // Medium confidence
             title = 'Prediction confidence: Medium (patterns emerging)';
        } else if (confidence > 0) { // Some data but not enough/consistent
             indicator = '?'; // Low confidence
             title = 'Prediction confidence: Low (need more data or patterns vary)';
        } else {
             indicator = ''; // No indicator if no confidence calculable (e.g., < min events)
             title = '';
        }
        element.textContent = indicator;
        element.title = title; // Tooltip for explanation
    };


    const updateDashboard = () => {
        const now = Date.now();

        // --- Feeding Status Update ---
        const lastFeed = events.find(e => e.type === 'feeding');
        const { prediction: nextFeedPred, lastEventTime: lastFeedTime, avgInterval: feedAvgInt, confidence: feedConf } = predictNextEvent('feeding');
        DOMElements.dashboardContainer?.querySelector('#last-feed-time')?.textContent = formatTime(lastFeed?.timestamp);
        DOMElements.dashboardContainer?.querySelector('#last-feed-details')?.textContent = lastFeed ? (lastFeed.feedType === 'bottle' ? `${lastFeed.amountOz || '?'}oz` : `${lastFeed.durationMin || '?'}m ${lastFeed.side || ''}`) : '';
        DOMElements.dashboardContainer?.querySelector('#next-feed-prediction')?.textContent = nextFeedPred ? `~${formatTime(nextFeedPred)}` : (lastFeed ? 'Calculating...' : 'No data');
        updateConfidenceIndicator(DOMElements.feedPredictionConfidence, feedConf);
        updateProgressBar('feed-progress', DOMElements.feedProgressLabel, '', lastFeedTime, feedAvgInt, nextFeedPred);

        // --- Diaper Status Update ---
        const lastDiaper = events.find(e => e.type === 'diaper');
        const lastWetDiaper = events.find(e => e.type === 'diaper' && (e.diaperType === 'wet' || e.diaperType === 'mixed'));
        const lastDirtyDiaper = events.find(e => e.type === 'diaper' && (e.diaperType === 'dirty' || e.diaperType === 'mixed'));
        // Predict next WET based on last wet/mixed
        const { prediction: nextWetPred, avgInterval: wetAvgInt, confidence: wetConf } = predictNextEvent('diaper', { diaperType: 'wet' });
        // Predict next DIRTY based on last dirty/mixed
        const { prediction: nextDirtyPred, avgInterval: dirtyAvgInt, confidence: dirtyConf } = predictNextEvent('diaper', { diaperType: 'dirty' });
        DOMElements.dashboardContainer?.querySelector('#last-diaper-time')?.textContent = formatTime(lastDiaper?.timestamp);
        DOMElements.dashboardContainer?.querySelector('#last-diaper-type')?.textContent = lastDiaper ? lastDiaper.diaperType : '';
        DOMElements.dashboardContainer?.querySelector('#next-wet-prediction')?.textContent = nextWetPred ? `~${formatTime(nextWetPred)}` : (lastWetDiaper ? 'Calculating...' : 'No data');
        DOMElements.dashboardContainer?.querySelector('#next-dirty-prediction')?.textContent = nextDirtyPred ? `~${formatTime(nextDirtyPred)}` : (lastDirtyDiaper ? 'Calculating...' : 'No data');
        updateConfidenceIndicator(DOMElements.wetPredictionConfidence, wetConf);
        updateConfidenceIndicator(DOMElements.dirtyPredictionConfidence, dirtyConf);
        // Update progress bars based on the last occurrence of that specific type
        updateProgressBar('diaper-progress-wet', DOMElements.diaperWetProgressLabel, 'Wet', lastWetDiaper?.timestamp, wetAvgInt, nextWetPred);
        updateProgressBar('diaper-progress-dirty', DOMElements.diaperDirtyProgressLabel, 'Dirty', lastDirtyDiaper?.timestamp, dirtyAvgInt, nextDirtyPred);

        // --- Sleep Status Update ---
        const lastCompleteSleep = events.find(e => e.type === 'sleep' && e.end);
        const lastSleepStartEvent = events.find(e => e.type === 'sleep' && e.start); // Find most recent start, even if ongoing
        const { prediction: nextSleepPred, lastEventTime: lastSleepEndTimeForPred, avgInterval: sleepAvgInt, confidence: sleepConf } = predictNextEvent('sleep');
        DOMElements.dashboardContainer?.querySelector('#last-sleep-start-time')?.textContent = formatTime(lastSleepStartEvent?.start);
        DOMElements.dashboardContainer?.querySelector('#last-sleep-end-time')?.textContent = formatTime(lastCompleteSleep?.end);
        DOMElements.dashboardContainer?.querySelector('#last-sleep-duration')?.textContent = isSleeping ? `Ongoing: ${formatDuration(now - sleepStartTime)}` : formatDuration(lastCompleteSleep?.duration);
        DOMElements.dashboardContainer?.querySelector('#next-sleep-prediction')?.textContent = isSleeping ? 'Sleeping...' : (nextSleepPred ? `~${formatTime(nextSleepPred)}` : (lastCompleteSleep ? 'Calculating...' : 'No data'));
        updateConfidenceIndicator(DOMElements.sleepPredictionConfidence, isSleeping ? null : sleepConf); // Hide confidence while sleeping

        // Update Sleep Button and Progress Bar based on current state (Sleeping vs Awake)
        if (DOMElements.sleepToggleButton) {
            if (isSleeping) {
                DOMElements.sleepToggleButton.textContent = `End Sleep (${formatDuration(now - sleepStartTime, true)})`;
                DOMElements.sleepToggleButton.classList.add('active', 'danger');
                // Progress bar shows duration asleep relative to average nap length
                updateProgressBar('sleep-progress', DOMElements.sleepProgressLabel, 'Sleeping', null, null, null, true, sleepStartTime);
            } else {
                DOMElements.sleepToggleButton.textContent = 'Start Sleep';
                DOMElements.sleepToggleButton.classList.remove('active', 'danger');
                // Progress bar shows time awake relative to average needed before next nap
                updateProgressBar('sleep-progress', DOMElements.sleepProgressLabel, 'Awake', lastSleepEndTimeForPred, sleepAvgInt, nextSleepPred);
            }
        }

        // --- Pumping Status Update ---
        const lastPump = events.find(e => e.type === 'pump');
        const nextScheduledPumpTime = calculateNextScheduledPump();
        const pumpIntervalStats = calculateIntervalStats('pump'); // Get stats including average if needed
        // Use scheduled interval primarily, fall back to historical average if no schedule set
        const pumpInterval = pumpSchedule.intervalHours ? pumpSchedule.intervalHours * 60 * 60 * 1000 : pumpIntervalStats?.average;
        DOMElements.dashboardContainer?.querySelector('#last-pump-time')?.textContent = formatTime(lastPump?.timestamp);
        DOMElements.dashboardContainer?.querySelector('#last-pump-amount')?.textContent = lastPump?.amountOz ? `${lastPump.amountOz}oz` : (lastPump ? 'Logged' : '');
        DOMElements.dashboardContainer?.querySelector('#next-pump-schedule')?.textContent = nextScheduledPumpTime ? `~${formatTime(nextScheduledPumpTime)}` : (pumpSchedule.intervalHours ? 'Calculating...' : 'Set schedule...');
        // Update progress bar based on time since last pump vs the effective interval (scheduled or historical)
        updateProgressBar('pump-progress', DOMElements.pumpProgressLabel, '', lastPump?.timestamp, pumpInterval, nextScheduledPumpTime);

        // --- Update Reports Tab Content ---
        // These functions will check internally if their respective elements exist
        updateDailySummary();
        updateProjections();
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

        // Display appropriate message if list is empty
        if (eventsToDisplay.length === 0) {
            const message = events.length === 0
                ? "No events recorded yet. Use the dashboard buttons to start logging!"
                : "No events match the current filter.";
            DOMElements.eventList.innerHTML = `<li class="empty-list-item">${message}</li>`;
            return;
        }

        // Build list items using DocumentFragment for efficiency
        const fragment = document.createDocumentFragment();
        eventsToDisplay.forEach(event => {
             const li = createFormElement('li', { 'data-event-id': event.id });
             // Determine the primary time to display (start for sleep, timestamp otherwise)
             const displayTime = (event.type === 'sleep' && event.start) ? event.start : event.timestamp;
             const timeSpan = createFormElement('span', { class: 'event-time', title: `Event ID: ${event.id}` }, formatDateTime(displayTime));
             const detailsSpan = createFormElement('span', { class: 'event-details' });
             detailsSpan.innerHTML = getEventDescription(event); // Use innerHTML for icons/styling

             // Action buttons (Edit/Delete)
             const actionsSpan = createFormElement('span', { class: 'event-actions' });
             const editButton = createFormElement('button', { class: 'edit' }, 'Edit');
             editButton.onclick = (e) => { e.stopPropagation(); openEditModal(event.id); }; // Prevent potential parent clicks
             const deleteButton = createFormElement('button', { class: 'delete' }, 'Delete');
             deleteButton.onclick = (e) => { e.stopPropagation(); deleteEvent(event.id); };
             actionsSpan.appendChild(editButton);
             actionsSpan.appendChild(deleteButton);

             li.appendChild(timeSpan);
             li.appendChild(detailsSpan);
             li.appendChild(actionsSpan);
             fragment.appendChild(li);
         });
         DOMElements.eventList.appendChild(fragment); // Append all items at once
    };

    // Function to generate event description string (with icons)
    const getEventDescription = (event) => {
         const icons = { feeding: '🍼', diaper: '💩', sleep: '😴', pump: '🥛', mood: '😊', gas: '💨' };
         let icon = icons[event.type] || '❓';
         let details = '';

        switch (event.type) {
            case 'feeding':
                icon = event.feedType === 'bottle' ? '🍼' : '🤱';
                details = event.feedType === 'bottle'
                    ? `Bottle: <strong>${event.amountOz || '?'} oz</strong>`
                    : `Breast: <strong>${event.durationMin || '?'} min</strong> ${event.side ? `(${event.side})` : ''}`;
                break;
            case 'diaper':
                icon = event.diaperType === 'dirty' ? '💩' : (event.diaperType === 'mixed' ? '💩💧': '💧');
                details = `Diaper: <strong>${event.diaperType}</strong>`;
                break;
            case 'sleep':
                 // Check if this is the currently active sleep session being displayed in the list
                 if (isSleeping && sleepStartTime === event.start && !event.end) {
                      details = `Sleeping: <strong>${formatDuration(Date.now() - event.start, true)}</strong>...`;
                 } else if (event.start && event.end) {
                    details = `Sleep: <strong>${formatDuration(event.duration)}</strong> (Ended ${formatTime(event.end)})`;
                 } else if (event.start) { // Manually logged start without end yet, or corrupted data
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
                details = `Unknown Event: ${event.type}`;
        }
         // Append notes if they exist, wrapping them for potential styling
         if (event.notes) {
             details += ` <span class="event-notes">- ${event.notes.substring(0, 100)}${event.notes.length > 100 ? '...' : ''}</span>`; // Truncate long notes in list
         }

        return `${icon} ${details}`;
     };

    // Master UI update function
    const updateUI = () => {
        updateClock();        // Update time display
        updateDashboard();    // Update all dashboard cards, progress bars, predictions
        renderEventList();    // Refresh the history list based on current filters
        renderChart();        // Re-render chart if its tab is active
    };


    // --- Modal Handling ---
    const openModal = (action, eventId = null) => {
        if (!DOMElements.logModal || !DOMElements.logForm) return;
        DOMElements.logForm.innerHTML = ''; // Clear previous form content
        DOMElements.logForm.dataset.action = action;
        DOMElements.logForm.dataset.eventId = eventId || '';

        let eventData = {};
        let title = "Log New Event";
        if (eventId) {
             eventData = events.find(e => e.id === eventId);
             if (!eventData) { logError("Cannot edit: Event not found", eventId); alert("Error: Could not find event to edit."); return; }
             title = "Edit Event";
        }

        const formFields = []; // Array to hold generated form elements

        // Determine event type based on action or existing event data
        let eventTypeForForm = action.replace('log', '').replace('edit_', '').toLowerCase();
        if (action === 'logPastSleep') eventTypeForForm = 'sleep';
        else if (action === 'logGas') eventTypeForForm = 'gas'; // Added handling for gas log action

        if (eventId && eventData.type) { // If editing, use the event's type
             eventTypeForForm = eventData.type;
        } else { // Map log actions to event types if needed
             if (action === 'logFeed') eventTypeForForm = 'feeding';
             else if (action === 'logDiaper') eventTypeForForm = 'diaper';
             else if (action === 'logPump') eventTypeForForm = 'pump';
             // Add more mappings if other log actions are added
        }


        // --- Common Field (Time) ---
        const isSleepEditOrLog = eventTypeForForm === 'sleep' && (action === 'edit_sleep' || action === 'logPastSleep');
        // Only show the general timestamp field if NOT logging/editing past sleep
        if (!isSleepEditOrLog) {
             formFields.push(createFormLabel("Time:", "event-time"));
             formFields.push(createFormInput("datetime-local", "event-time", eventData.timestamp ? new Date(eventData.timestamp - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : getCurrentLocalDateTimeValue(), true));
        }


        // --- Type Specific Fields ---
        switch (eventTypeForForm) {
             case 'feeding':
                title = eventId ? "Edit Feed" : "Log Feed";
                formFields.push(createRadioGroup("Feed Type:", "feedType", [
                    { label: "🍼 Bottle", value: "bottle", checked: eventData.feedType === 'bottle' || (!eventId && true) },
                    { label: "🤱 Breast", value: "breast", checked: eventData.feedType === 'breast' }
                ]));
                formFields.push(createFormLabel("Amount (oz, if bottle):", "feed-amount"));
                formFields.push(createFormInput("number", "feed-amount", eventData.amountOz || '', false, { min: 0, step: 0.1, placeholder: "e.g., 4.5" }));
                formFields.push(createFormLabel("Duration (min, if breast):", "feed-duration"));
                formFields.push(createFormInput("number", "feed-duration", eventData.durationMin || '', false, { min: 0, step: 1, placeholder: "e.g., 15" }));
                formFields.push(createFormLabel("Breast Side (if breast):", "feed-side"));
                formFields.push(createSelect("feed-side", [ { label: "N/A", value: ""},{ label: "Left", value: "L"},{ label: "Right", value: "R"},{ label: "Both", value: "Both"}], eventData.side || ''));
                formFields.push(createFormLabel("Notes (Optional):", "feed-notes"));
                formFields.push(createTextArea("feed-notes", eventData.notes || '', "Any observations?"));
                break;
            case 'diaper':
                title = eventId ? "Edit Diaper" : "Log Diaper";
                formFields.push(createRadioGroup("Diaper Type:", "diaperType", [
                    { label: "💧 Wet", value: "wet", checked: eventData.diaperType === 'wet' || (!eventId && true)},
                    { label: "💩 Dirty", value: "dirty", checked: eventData.diaperType === 'dirty' },
                    { label: "💩💧 Mixed", value: "mixed", checked: eventData.diaperType === 'mixed' }
                ]));
                formFields.push(createFormLabel("Notes (Optional):", "diaper-notes"));
                formFields.push(createTextArea("diaper-notes", eventData.notes || '', "Color, consistency?"));
                break;
            case 'pump':
                title = eventId ? "Edit Pump Session" : "Log Pump Session";
                formFields.push(createFormLabel("Total Amount Pumped (oz):", "pump-amount"));
                formFields.push(createFormInput("number", "pump-amount", eventData.amountOz || '', false, { min: 0, step: 0.1, placeholder: "e.g., 3.0" }));
                formFields.push(createFormLabel("Notes (Optional):", "pump-notes"));
                formFields.push(createTextArea("pump-notes", eventData.notes || '', "Duration, side(s)?"));
                break;
             case 'sleep': // Handles both edit_sleep and logPastSleep
                 title = eventId ? "Edit Sleep Record" : "Log Past Sleep";
                 formFields.push(createFormLabel("Sleep Start Time:", "sleep-start"));
                 formFields.push(createFormInput("datetime-local", "sleep-start", eventData.start ? new Date(eventData.start - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : getCurrentLocalDateTimeValue(), true)); // Default start to now for logPastSleep initially
                 formFields.push(createFormLabel("Sleep End Time:", "sleep-end"));
                 // End time is required when logging past sleep or editing an existing record
                 formFields.push(createFormInput("datetime-local", "sleep-end", eventData.end ? new Date(eventData.end - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '', true)); // Make required
                 formFields.push(createFormLabel("Notes (Optional):", "sleep-notes"));
                 formFields.push(createTextArea("sleep-notes", eventData.notes || '', "Location, quality?"));
                break;
             case 'gas':
                 title = eventId ? "Edit Gas/Fussiness Event" : "Log Gas/Fussiness";
                  // Use the general timestamp field for simple events like gas
                 if (isSleepEditOrLog) { // If accidentally called here for sleep, add time field back
                      formFields.unshift(createFormInput("datetime-local", "event-time", eventData.timestamp ? new Date(eventData.timestamp - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : getCurrentLocalDateTimeValue(), true));
                      formFields.unshift(createFormLabel("Time:", "event-time"));
                 }
                 formFields.push(createFormLabel("Notes (Optional):", "gas-notes"));
                 formFields.push(createTextArea("gas-notes", eventData.notes || '', "Severity, remedies?"));
                 break;
            // Add 'mood' or other event types here following the pattern
            default:
                logWarning(`Modal opened with unknown type: ${eventTypeForForm}`);
                formFields.push(createFormElement('p', {}, "Cannot generate form for this event type."));
        }

        // Append generated fields to form
        const fragment = document.createDocumentFragment();
        formFields.forEach(field => fragment.appendChild(field));
        DOMElements.logForm.appendChild(fragment);

        // Add Submit Button if fields were generated
        if (formFields.length > (isSleepEditOrLog ? 0 : 1)) { // Check if more than just general time field exists, or any field for sleep log/edit
            const submitButton = createFormElement('button', { type: 'submit' }, eventId ? 'Save Changes' : 'Log Event');
            DOMElements.logForm.appendChild(submitButton);
        }

        // Display Modal
        DOMElements.logModalTitle.textContent = title;
        DOMElements.logModal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling

        // Auto-focus first focusable element for usability, with slight delay for animation
        const firstInput = DOMElements.logForm.querySelector('input:not([type="radio"]):not([type="hidden"]), select, textarea');
        if(firstInput) setTimeout(() => firstInput.focus(), 50);
    };

    const openEditModal = (eventId) => {
         const event = events.find(e => e.id === eventId);
         if (event) {
            openModal(`edit_${event.type}`, eventId); // Use event's type to ensure correct form
         } else {
            logError("Event not found for editing:", eventId);
            alert("Error: Could not find the event data to edit.");
         }
    };

    const closeModal = () => {
        if (DOMElements.logModal) DOMElements.logModal.style.display = 'none';
        if (DOMElements.logForm) {
            DOMElements.logForm.reset();
            DOMElements.logForm.dataset.action = '';
            DOMElements.logForm.dataset.eventId = '';
        }
        // Restore body scroll only if the help modal is also closed
        if (DOMElements.helpModal?.style.display !== 'block') {
            document.body.style.overflow = '';
        }
     };

    // --- Form Element Creation Helpers ---
    const createFormElement = (tag, attributes = {}, textContent = null) => {
        const element = document.createElement(tag);
        // Set attributes, carefully handling boolean attributes like 'required'
        Object.entries(attributes).forEach(([key, value]) => {
            if (value === true) { // For boolean attributes like 'required', 'checked'
                 element.setAttribute(key, ''); // Set the attribute name only
            } else if (value !== null && value !== undefined && value !== false) {
                element.setAttribute(key, value);
            }
        });
        if (textContent) element.textContent = textContent;
        return element;
    };
    const createFormLabel = (text, htmlFor) => createFormElement('label', { for: htmlFor }, text);
    const createFormInput = (type, id, value = '', required = false, attributes = {}) => createFormElement('input', { type, id, name: id, value, required, ...attributes });
    const createTextArea = (id, value = '', placeholder = '') => createFormElement('textarea', { id, name: id, rows: 3, placeholder }, value);
    const createSelect = (id, options, selectedValue = '') => {
        const select = createFormElement('select', { id, name: id });
        options.forEach(opt => {
            const option = createFormElement('option', { value: opt.value }, opt.label);
            if (opt.value === selectedValue) option.selected = true;
            select.appendChild(option);
        });
        return select;
    };
    const createRadioGroup = (labelText, name, options) => {
         const fieldset = createFormElement('fieldset', { class: 'radio-group' });
         fieldset.appendChild(createFormElement('legend', {}, labelText));
         options.forEach(opt => {
             const uniqueId = `${name}-${opt.value}-${generateId().substring(0,4)}`;
             const div = createFormElement('div');
             const input = createFormElement('input', { type: 'radio', id: uniqueId, name, value: opt.value, checked: opt.checked || null });
             const label = createFormElement('label', { for: uniqueId });
             label.innerHTML = opt.label; // Allow HTML (icons)
             div.appendChild(input);
             div.appendChild(label);
             fieldset.appendChild(div);
         });
         return fieldset;
     };

    // --- Event Form Submission Logic ---
    const handleFormSubmit = (e) => {
        e.preventDefault(); // Prevent default form submission
        const formData = new FormData(DOMElements.logForm);
        const data = Object.fromEntries(formData.entries()); // Get form data as an object

        const action = DOMElements.logForm.dataset.action;
        const eventId = DOMElements.logForm.dataset.eventId;
        const isSleepEditOrLog = action === 'edit_sleep' || action === 'logPastSleep';

        // Timestamp is handled differently for sleep log/edit vs other events
        const timestamp = isSleepEditOrLog ? null : getTimestamp(data['event-time']);

        let eventData = timestamp ? { timestamp } : {}; // Initialize with timestamp if applicable
        let eventType = '';

        // Determine event type based on action or form structure
        if (action.includes('feed')) eventType = 'feeding';
        else if (action.includes('diaper')) eventType = 'diaper';
        else if (action.includes('pump')) eventType = 'pump';
        else if (isSleepEditOrLog) eventType = 'sleep'; // Handle sleep specific actions
        else if (action.includes('gas')) eventType = 'gas';
        // Add more 'else if' conditions for other event types as needed

         if (!eventType) {
             logError("Could not determine event type during form submission.", action);
             alert("Error: Could not save event, unknown type.");
             return; // Stop processing if type is unknown
         }
         eventData.type = eventType;

        // --- Process form data into structured eventData based on type ---
        try {
            switch (eventType) {
                case 'feeding':
                    eventData.feedType = data.feedType;
                    eventData.amountOz = data.feedType === 'bottle' ? (parseFloat(data['feed-amount']) || null) : null;
                    eventData.durationMin = data.feedType === 'breast' ? (parseInt(data['feed-duration']) || null) : null;
                    eventData.side = data.feedType === 'breast' ? (data['feed-side'] || null) : null;
                    eventData.notes = data['feed-notes'] || null;
                    // Basic validation for feeding
                    if (data.feedType === 'bottle' && eventData.amountOz === null) logWarning("Bottle feed logged without amount.");
                    if (data.feedType === 'breast' && eventData.durationMin === null) logWarning("Breast feed logged without duration.");
                    break;
                case 'diaper':
                    eventData.diaperType = data.diaperType;
                    if (!eventData.diaperType) throw new Error("Diaper type is required."); // Example validation
                    eventData.notes = data['diaper-notes'] || null;
                    break;
                case 'pump':
                    eventData.amountOz = parseFloat(data['pump-amount']) || null;
                    if(eventData.amountOz === null) logWarning("Pump session logged without amount.");
                    eventData.notes = data['pump-notes'] || null;
                    break;
                case 'sleep':
                     eventData.start = data['sleep-start'] ? getTimestamp(data['sleep-start']) : null;
                     eventData.end = data['sleep-end'] ? getTimestamp(data['sleep-end']) : null;
                     eventData.notes = data['sleep-notes'] || null;

                     if (!eventData.start || !eventData.end) {
                         // This check should ideally be handled by form validation (required attribute)
                         throw new Error("Both start and end times are required for logging/editing past sleep.");
                     }
                     if (eventData.end < eventData.start) {
                         throw new Error("Sleep end time cannot be before start time.");
                     }
                     eventData.duration = eventData.end - eventData.start;
                     // Set the primary timestamp to the END time for completed sleep events
                     // This is crucial for sorting and prediction logic based on when the baby woke up.
                     eventData.timestamp = eventData.end;
                     break;
                 case 'gas':
                     eventData.notes = data['gas-notes'] || null;
                     // Ensure timestamp is set if it wasn't handled initially (e.g., if sleep form logic was mistakenly triggered)
                     if (!eventData.timestamp) eventData.timestamp = getTimestamp(data['event-time']);
                     break;
                // Add processing for other event types here...
                default:
                     throw new Error(`Unhandled event type in form submission: ${eventType}`);
            }

            // --- Clean up null/empty string values (redundant but safe) ---
             Object.keys(eventData).forEach(key => {
                if (eventData[key] === null || eventData[key] === '') {
                    delete eventData[key];
                }
            });

            // --- Add or Update Event ---
             if (eventId) {
                updateEvent(eventId, eventData);
             } else {
                addEvent(eventData);
            }

            closeModal(); // Close modal on successful submission

        } catch (error) {
             logError("Error processing form submission.", error);
             alert(`Error: ${error.message}`); // Display validation errors or processing issues to the user
        }
    };

    // --- Sleep Toggle Logic ---
    const handleSleepToggle = () => {
        const now = Date.now();
        if (isSleeping) {
            // --- Ending sleep ---
            if (!sleepStartTime) {
                // This case should ideally not happen if state is managed correctly
                logError("Cannot end sleep: Start time is missing from state.");
                isSleeping = false; // Attempt to correct state
                saveData();
                updateUI();
                return;
            }
            const duration = now - sleepStartTime;
            // Add the completed sleep event
            // Note: addEvent handles saving data and updating UI
            addEvent({
                type: 'sleep',
                start: sleepStartTime,
                end: now,
                timestamp: now, // Use end time as primary timestamp
                duration: duration
            });
            // Update state *after* successfully adding the event
            isSleeping = false;
            sleepStartTime = null;
            // Log handled within addEvent now
        } else {
            // --- Starting sleep ---
            isSleeping = true;
            sleepStartTime = now;
            logInfo("Sleep started at:", formatTime(new Date(now)));
             // IMPORTANT: Save the *state* change immediately, even though the full sleep *event* isn't logged yet.
             saveData();
             updateUI(); // Update the UI to reflect the 'Sleeping...' state immediately
             // Schedule an alarm check sooner as sleep state change affects predictions
             scheduleNextMainAlarmCheck(5000);
        }
    };

    // --- Quick Action Button Handler ---
    const handleDashboardClick = (e) => {
         // Use event delegation, find the button that was clicked
         const button = e.target.closest('.quick-action');
         if (button) {
             const action = button.dataset.action;
             if (!action) return; // Ignore if button has no action defined

             // Handle different actions
             switch(action) {
                case 'toggleSleep':
                    handleSleepToggle(); // Call dedicated handler
                    break;
                case 'managePumpSchedule':
                    switchTab('settings'); // Switch to settings tab
                    DOMElements.pumpIntervalInput?.focus(); // Focus input if available
                    break;
                case 'logFeed':
                case 'logDiaper':
                case 'logPump':
                case 'logPastSleep': // Handle the manual sleep log action
                case 'logGas': // Handle gas log action
                     openModal(action); // Open the appropriate logging modal
                     break;
                default:
                    logWarning(`Unhandled quick action button: ${action}`);
             }
         }
     };

    // --- Tab Navigation ---
     const switchTab = (tabId) => {
        if (!tabId) return;
        // Update button states
        DOMElements.tabsContainer?.querySelectorAll('.tab-link').forEach(t => {
            const isSelected = t.dataset.tab === tabId;
            t.classList.toggle('active', isSelected);
            t.setAttribute('aria-selected', isSelected);
        });
        // Update content visibility and aria attributes
        DOMElements.tabContents.forEach(tc => {
            const isActive = tc.id === tabId;
            tc.classList.toggle('active', isActive);
            tc.style.display = isActive ? 'block' : 'none'; // Explicitly manage display
            tc.setAttribute('aria-hidden', !isActive);
        });

        // Trigger content updates/renders for newly activated tabs
        if (tabId === 'charts') renderChart();
        if (tabId === 'history') renderEventList();
        if (tabId === 'reports') { updateDailySummary(); updateProjections(); }
     };

     const handleTabClick = (e) => {
         const tabLink = e.target.closest('.tab-link');
         if (tabLink && !tabLink.classList.contains('active')) { // Only switch if not already active
            e.preventDefault();
            const tabId = tabLink.dataset.tab;
            switchTab(tabId);
        }
     };

    // --- Charting Logic ---
    const renderChart = () => {
        // Check if Chart.js is loaded and canvas exists
        if (typeof Chart === 'undefined' || !DOMElements.chartCanvas || !DOMElements.chartTypeSelect) {
            logError("Chart cannot be rendered: Chart.js or canvas element missing.");
            return;
        }
        // Only render if the chart tab is actually visible
        const chartTab = document.getElementById('charts');
        if (!chartTab || !chartTab.classList.contains('active')) {
            // logInfo("Chart rendering skipped: Tab not active.");
            return; // Don't render if tab not visible
        }

        const selectedChart = DOMElements.chartTypeSelect.value;
        const ctx = DOMElements.chartCanvas.getContext('2d');

        // Destroy previous chart instance if it exists
        if (currentChart) {
            try { currentChart.destroy(); } catch (e) { logError("Error destroying previous chart", e); }
            currentChart = null;
        }

        // Generate the configuration for the selected chart type
        const chartDataConfig = generateChartData(selectedChart);

        // Handle cases where no data is available for the chart
        if (!chartDataConfig || !chartDataConfig.data.labels || chartDataConfig.data.labels.length === 0) {
             // Display a "No data" message centered on the canvas
             ctx.clearRect(0, 0, DOMElements.chartCanvas.width, DOMElements.chartCanvas.height);
             ctx.save();
             ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#888";
             ctx.font = `16px ${getComputedStyle(document.body).fontFamily || 'sans-serif'}`;
             ctx.fillText("Not enough data to display this chart yet.", DOMElements.chartCanvas.width / 2, DOMElements.chartCanvas.height / 2);
             ctx.restore();
             return;
         }

        // Create the new chart instance
        try {
            logInfo(`Rendering chart: ${selectedChart}`);
            currentChart = new Chart(ctx, chartDataConfig);
        } catch (error) {
             logError("Failed to create chart instance.", error);
             // Display error message on canvas
             ctx.clearRect(0, 0, DOMElements.chartCanvas.width, DOMElements.chartCanvas.height);
             ctx.save();
             ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#d9534f"; // Use a distinct error color
             ctx.font = `16px ${getComputedStyle(document.body).fontFamily || 'sans-serif'}`;
             ctx.fillText("Error displaying chart.", DOMElements.chartCanvas.width / 2, DOMElements.chartCanvas.height / 2);
             ctx.restore();
        }
    };

    // This function contains the detailed logic for preparing chart configurations.
    // It processes the `events` array based on the selected `chartType`.
    const generateChartData = (chartType) => {
        // Define date range (e.g., last 7 days including today)
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
        const sevenDaysAgoStart = new Date(todayEnd);
        sevenDaysAgoStart.setDate(todayEnd.getDate() - 6); // -6 to get 7 days total
        sevenDaysAgoStart.setHours(0, 0, 0, 0);

        // Filter events within the date range
        const recentEvents = events.filter(e => e.timestamp >= sevenDaysAgoStart.getTime() && e.timestamp <= todayEnd.getTime());
        recentEvents.sort((a, b) => a.timestamp - b.timestamp); // Sort ascending for daily processing

        // Prepare labels (e.g., M/D format) and daily data buckets
        const labels = [];
        const dailyDataBuckets = {}; // Structure: { 'M/D': { eventType: [events] } }
        for (let i = 0; i < 7; i++) {
             const date = new Date(sevenDaysAgoStart);
             date.setDate(sevenDaysAgoStart.getDate() + i);
             const label = date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
             labels.push(label);
             dailyDataBuckets[label] = {}; // Initialize bucket for each day
         }

         // Populate the daily buckets with relevant events
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

        // --- Default Chart.js Configuration Structure ---
        let config = {
             type: 'bar', // Default type
             data: {
                 labels: labels, // Use generated date labels
                 datasets: []    // Datasets specific to chart type will be added below
             },
             options: {
                 responsive: true,
                 maintainAspectRatio: false, // Allow chart to fill container height better
                 scales: {
                     y: { // Default Y-axis
                         beginAtZero: true,
                         title: { display: true, text: 'Count' } // Default axis title
                     }
                 },
                 plugins: {
                     title: { // Chart title
                         display: true,
                         text: '', // Specific title set below
                         font: { size: 16, weight: '600' }, // Make title slightly bolder
                         padding: { top: 10, bottom: 20 }
                     },
                     tooltip: { // Tooltip configuration
                         mode: 'index', // Show tooltips for all datasets at that index
                         intersect: false, // Don't require direct hover over point
                         callbacks: {} // Initialize for specific formatting
                     },
                     legend: { // Legend configuration
                         position: 'top',
                         labels: { usePointStyle: true } // Use point style (circle) in legend
                     }
                 },
                 animation: { // Subtle animation on load/update
                     duration: 500,
                     easing: 'easeOutQuart'
                 }
             }
         };

        // --- Generate Datasets based on chartType ---
        switch (chartType) {
            case 'feedAmount':
                config.options.plugins.title.text = 'Daily Feeding Intake (Last 7 Days)';
                const bottleData = labels.map(label => (dailyDataBuckets[label]?.feeding?.filter(e => e.feedType === 'bottle' && e.amountOz) || []).reduce((sum, e) => sum + e.amountOz, 0));
                const breastData = labels.map(label => (dailyDataBuckets[label]?.feeding?.filter(e => e.feedType === 'breast' && e.durationMin) || []).reduce((sum, e) => sum + e.durationMin, 0));
                config.data.datasets = [
                    { label: 'Bottle (oz)', data: bottleData, backgroundColor: 'rgba(110, 205, 207, 0.7)', borderColor: 'rgb(110, 205, 207)', borderWidth: 1, yAxisID: 'y-oz', pointStyle: 'rect' },
                    { label: 'Breast (min)', data: breastData, backgroundColor: 'rgba(248, 177, 149, 0.7)', borderColor: 'rgb(248, 177, 149)', borderWidth: 1, yAxisID: 'y-min', pointStyle: 'triangle' }
                ];
                config.options.scales = { // Configure dual axes
                     'y-oz': { type: 'linear', position: 'left', beginAtZero: true, title: { display: true, text: 'Ounces (oz)' } },
                     'y-min': { type: 'linear', position: 'right', beginAtZero: true, title: { display: true, text: 'Minutes (min)' }, grid: { drawOnChartArea: false } } // Hide grid for secondary axis
                 };
                 // Custom tooltip label for dual axis chart
                 config.options.plugins.tooltip.callbacks.label = function(context) {
                      let label = context.dataset.label || ''; if (label) label += ': ';
                      if (context.parsed.y !== null) label += context.parsed.y.toFixed(1) + (context.dataset.yAxisID === 'y-oz' ? ' oz' : ' min');
                      return label;
                 };
                break;

             case 'feedFrequency':
                 config.type = 'line'; // Use line chart for frequency over time
                 config.options.plugins.title.text = 'Hourly Feeding Frequency (Last 24 Hours)';
                 const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
                 const feedsLast24h = events.filter(e => e.type === 'feeding' && e.timestamp >= twentyFourHoursAgo);
                 // Generate labels for the past 24 hours
                 config.data.labels = Array.from({ length: 24 }, (_, i) => {
                     const hour = new Date(); hour.setHours(hour.getHours() - (23 - i), 0, 0, 0); // Hour from 24h ago up to current hour start
                     return hour.toLocaleTimeString([], { hour: 'numeric', hour12: true });
                 });
                 const hourlyCounts = Array(24).fill(0);
                 feedsLast24h.forEach(feed => {
                     const feedHour = new Date(feed.timestamp).getHours();
                     const currentHour = new Date().getHours();
                     // Calculate index relative to the 24h window (0 = 24h ago, 23 = last full hour)
                     let index = feedHour - (currentHour - 23);
                     if (index < 0) index += 24; // Handle wrap around midnight
                     if (index >= 0 && index < 24) { hourlyCounts[index]++; }
                 });
                 config.data.datasets = [{
                     label: 'Feeds per Hour', data: hourlyCounts,
                     borderColor: 'rgb(110, 205, 207)', // Use primary color
                     tension: 0.2, // Slight curve to the line
                     fill: false, // Don't fill under the line
                     pointBackgroundColor: 'rgb(110, 205, 207)', pointRadius: 4
                 }];
                 // Adjust scales for hourly line chart
                 config.options.scales = {
                    y: { beginAtZero: true, title: { display: true, text: 'Number of Feeds'}, ticks: { stepSize: 1 } }, // Ensure integer steps on Y axis
                    x: { title: { display: true, text: 'Hour of Day'} }
                 };
                 // Tooltip mode for line chart
                 config.options.plugins.tooltip.mode = 'nearest';
                 config.options.plugins.tooltip.intersect = true;
                break;

            case 'sleepDuration':
                config.options.plugins.title.text = 'Daily Sleep Duration (Last 7 Days)';
                const sleepData = labels.map(label => (dailyDataBuckets[label]?.sleep?.filter(e => e.duration) || []).reduce((sum, e) => sum + e.duration, 0) / (3600000)); // Convert ms to hours
                config.data.datasets = [{
                    label: 'Total Sleep (hours)', data: sleepData,
                    backgroundColor: 'rgba(174, 198, 207, 0.7)', borderColor: 'rgb(174, 198, 207)', // Soft blue/grey
                    borderWidth: 1
                }];
                config.options.scales.y.title.text = 'Hours of Sleep';
                config.options.plugins.tooltip.callbacks.label = function(context) { // Format tooltip
                     let label = context.dataset.label || ''; if (label) label += ': ';
                     if (context.parsed.y !== null) label += context.parsed.y.toFixed(1) + ' hours'; return label;
                 };
                break;

             case 'diaperCount':
                 config.options.plugins.title.text = 'Daily Diaper Count (Last 7 Days)';
                 const wetCounts = labels.map(label => dailyDataBuckets[label]?.diaper?.filter(e => e.diaperType === 'wet' || e.diaperType === 'mixed').length || 0);
                 const dirtyCounts = labels.map(label => dailyDataBuckets[label]?.diaper?.filter(e => e.diaperType === 'dirty' || e.diaperType === 'mixed').length || 0);
                 config.data.datasets = [
                     { label: 'Wet', data: wetCounts, backgroundColor: 'rgba(250, 208, 46, 0.7)', stack: 'Stack 0' }, // Yellow
                     { label: 'Dirty', data: dirtyCounts, backgroundColor: 'rgba(160, 82, 45, 0.7)', stack: 'Stack 0' } // Brown
                 ];
                 // Configure axes for stacked bar chart
                 config.options.scales.x = { stacked: true };
                 config.options.scales.y = { stacked: true, beginAtZero: true, title: { display: true, text: 'Number of Diapers' }, ticks: { stepSize: 1 } }; // Integer steps
                 break;

             case 'pumpAmount':
                 config.options.plugins.title.text = 'Daily Pumping Amount (Last 7 Days)';
                 const pumpAmounts = labels.map(label => (dailyDataBuckets[label]?.pump?.filter(e => e.amountOz) || []).reduce((sum, e) => sum + e.amountOz, 0));
                 config.data.datasets = [{
                     label: 'Total Pumped (oz)', data: pumpAmounts,
                     backgroundColor: 'rgba(248, 177, 149, 0.7)', borderColor: 'rgb(248, 177, 149)', // Peach/secondary color
                     borderWidth: 1
                 }];
                 config.options.scales.y.title.text = 'Ounces (oz)';
                 config.options.plugins.tooltip.callbacks.label = function(context) { // Format tooltip
                     let label = context.dataset.label || ''; if (label) label += ': ';
                     if (context.parsed.y !== null) label += context.parsed.y.toFixed(1) + ' oz'; return label;
                 };
                 break;

            default:
                logWarning("generateChartData called with unknown chart type:", chartType);
                return null; // Return null if type is not recognized
        }

        return config; // Return the fully configured Chart.js object
    };


    // --- Alarm System ---
    const playAlarmSound = () => {
         if (settings.alarmSoundEnabled) {
            try {
                // Use Web Audio API for more reliable playback and customization
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                 // Create a simple beep sequence
                 let startTime = audioCtx.currentTime;
                 const fundamental = 440; // A4 note
                 const volume = 0.2; // Lower volume slightly

                 // Sequence: Beep - Pause - Beep - Pause - Beep
                 [fundamental, fundamental * 1.5, fundamental].forEach((freq, i) => {
                     const osc = audioCtx.createOscillator();
                     const gain = audioCtx.createGain();
                     osc.connect(gain);
                     gain.connect(audioCtx.destination);

                     osc.type = 'sine'; // A simple, non-jarring tone
                     osc.frequency.setValueAtTime(freq, startTime + i * 0.3); // Slightly longer spacing
                     gain.gain.setValueAtTime(volume, startTime + i * 0.3);
                     // Fade out quickly
                     gain.gain.exponentialRampToValueAtTime(0.0001, startTime + i * 0.3 + 0.15);

                     osc.start(startTime + i * 0.3);
                     osc.stop(startTime + i * 0.3 + 0.15); // Stop after 150ms
                 });

                 // Close the audio context after the sound sequence finishes to conserve resources
                 setTimeout(() => {
                     if (audioCtx.state !== 'closed') {
                         audioCtx.close().catch(e => logError("Error closing audio context", e));
                     }
                 }, 1000); // Close after 1 second

             } catch (error) {
                 logWarning("Could not play alarm sound using Web Audio API.", error);
                 // Consider a very subtle visual fallback if audio fails? (e.g., flash background)
             }
         }
    };
    // --- (Rest of Alarm System Functions: showAlarm, hideAlarm, snoozeAlarm, pauseAllAlarms, resumeAllAlarms, clearAllAlarmTimeouts, handleAlarmInteraction, updateAlarmPauseStatus, checkAndScheduleAlarms, scheduleAlarmTimeout, scheduleNextMainAlarmCheck - These remain the same as in the full version provided in the previous response) ---
    const showAlarm = (type, message) => { const now = Date.now(); const snoozedUntil = snoozeState[type] || 0; if (alarmsPaused || now < snoozedUntil) { scheduleNextMainAlarmCheck(); return; } logInfo(`ALARM TRIGGERED: ${type} - ${message}`); if (DOMElements.alarmNotification && DOMElements.alarmMessage) { DOMElements.alarmMessage.textContent = message; DOMElements.alarmNotification.dataset.alarmType = type; DOMElements.alarmNotification.style.display = 'block'; if(DOMElements.resumeAlarmsButton) DOMElements.resumeAlarmsButton.style.display = 'none'; playAlarmSound(); } clearTimeout(alarmTimeouts[type]); delete alarmTimeouts[type]; };
    const hideAlarm = () => { if (DOMElements.alarmNotification) { DOMElements.alarmNotification.style.display = 'none'; DOMElements.alarmNotification.dataset.alarmType = ''; } if (DOMElements.resumeAlarmsButton) DOMElements.resumeAlarmsButton.style.display = alarmsPaused ? 'inline-block' : 'none'; };
    const snoozeAlarm = (type, minutes) => { if (!type || isNaN(minutes) || minutes <= 0) return; const now = Date.now(); const snoozeUntil = now + minutes * 60 * 1000; snoozeState[type] = snoozeUntil; logInfo(`Snoozing ${type} alarm for ${minutes}m until ${formatTime(new Date(snoozeUntil))}`); saveData(); hideAlarm(); scheduleNextMainAlarmCheck(); };
    const pauseAllAlarms = () => { alarmsPaused = true; logInfo("All alarms paused manually."); clearAllAlarmTimeouts(); hideAlarm(); updateAlarmPauseStatus(); saveData(); };
    const resumeAllAlarms = (forced = false) => { const now = Date.now(); const isAnySnoozed = Object.values(snoozeState).some(time => time > now); if (alarmsPaused) { if (forced) { logInfo("Forcing resume, clearing snoozes."); snoozeState = {}; alarmsPaused = false; } else if (!isAnySnoozed) { logInfo("Resuming alarms."); alarmsPaused = false; } else { logInfo("Cannot resume yet, some alarms snoozed."); return; } updateAlarmPauseStatus(); saveData(); hideAlarm(); scheduleNextMainAlarmCheck(1000); } else { logInfo("Alarms already active."); if (forced && isAnySnoozed) { logInfo("Forcing snooze clear."); snoozeState = {}; saveData(); scheduleNextMainAlarmCheck(1000); } } };
    const clearAllAlarmTimeouts = () => { Object.values(alarmTimeouts).forEach(clearTimeout); alarmTimeouts = {}; };
    const handleAlarmInteraction = (e) => { const button = e.target.closest('button'); if (!button || e.target.closest('.help-btn')) return; const alarmType = DOMElements.alarmNotification.dataset.alarmType; const snoozeMinutes = button.dataset.snooze; if (button.id === 'dismiss-alarm') { logInfo(`Dismissing ${alarmType} alarm.`); hideAlarm(); scheduleNextMainAlarmCheck(10000); } else if (snoozeMinutes) { if (snoozeMinutes === 'pause') pauseAllAlarms(); else { const minutes = parseInt(snoozeMinutes); if (!isNaN(minutes) && alarmType) snoozeAlarm(alarmType, minutes); } } };
    const updateAlarmPauseStatus = () => { if(DOMElements.alarmPauseStatus && DOMElements.forceResumeAlarmsButton){ DOMElements.alarmPauseStatus.textContent = alarmsPaused ? `Yes` : 'No'; DOMElements.forceResumeAlarmsButton.style.display = alarmsPaused ? 'inline-block' : 'none'; } if (DOMElements.resumeAlarmsButton) DOMElements.resumeAlarmsButton.style.display = 'none'; };
    const checkAndScheduleAlarms = () => { if (alarmsPaused) return; const checks = [ { type: 'feed', eventType: 'feeding', message: "Baby might be hungry soon!" }, { type: 'diaperWet', eventType: 'diaper', subType: { diaperType: 'wet' }, message: "Time for a diaper check (Wet likely)." }, { type: 'diaperDirty', eventType: 'diaper', subType: { diaperType: 'dirty' }, message: "Time for a diaper check (Dirty likely)." }, { type: 'sleep', eventType: 'sleep', message: "Baby might be getting tired.", condition: () => !isSleeping }, { type: 'pump', eventType: 'pump', message: "Time for scheduled pumping session.", useSchedule: true }, ]; checks.forEach(check => { if (check.condition && !check.condition()) { clearTimeout(alarmTimeouts[check.type]); delete alarmTimeouts[check.type]; return; } let predictedTime, lastEventTime, avgInterval; if (check.useSchedule && check.type === 'pump') { predictedTime = calculateNextScheduledPump(); const triggerTime = predictedTime ? predictedTime - (2 * 60 * 1000) : null; scheduleAlarmTimeout(check.type, triggerTime, check.message); } else { const { prediction, lastEventTime: letime, avgInterval: avgInt } = predictNextEvent(check.eventType, check.subType); predictedTime = prediction; lastEventTime = letime; avgInterval = avgInt; if (predictedTime && lastEventTime && avgInterval) { const triggerTimeThreshold = lastEventTime + (avgInterval * ALARM_THRESHOLD_PERCENT); const finalTriggerTime = Math.min(triggerTimeThreshold, predictedTime); scheduleAlarmTimeout(check.type, finalTriggerTime, check.message); } else { clearTimeout(alarmTimeouts[check.type]); delete alarmTimeouts[check.type]; } } }); };
    const scheduleAlarmTimeout = (type, triggerTimestamp, message) => { const now = Date.now(); const snoozedUntil = snoozeState[type] || 0; clearTimeout(alarmTimeouts[type]); delete alarmTimeouts[type]; if (triggerTimestamp === null || triggerTimestamp <= now || triggerTimestamp <= snoozedUntil || alarmsPaused) return; const delay = triggerTimestamp - now; alarmTimeouts[type] = setTimeout(() => { if (!alarmsPaused && Date.now() >= (snoozeState[type] || 0)) showAlarm(type, message); delete alarmTimeouts[type]; }, delay); };
    const scheduleNextMainAlarmCheck = (interval = ALARM_CHECK_INTERVAL) => { clearTimeout(mainAlarmCheckTimeout); mainAlarmCheckTimeout = setTimeout(() => { checkAndScheduleAlarms(); scheduleNextMainAlarmCheck(); }, interval); };

    // --- Pumping Schedule Logic ---
    const savePumpSchedule = () => {
        const interval = parseFloat(DOMElements.pumpIntervalInput.value);
        const startTime = DOMElements.pumpStartTimeInput.value || null;
        if (!isNaN(interval) && interval > 0) { pumpSchedule.intervalHours = interval; pumpSchedule.startTime = startTime; logInfo("Pump schedule saved:", pumpSchedule); }
        else { pumpSchedule.intervalHours = null; pumpSchedule.startTime = null; logInfo("Pump schedule cleared."); }
        saveData(); updatePumpScheduleUI(); scheduleNextMainAlarmCheck(1000); // Re-check alarms soon
    };
    const calculateNextScheduledPump = () => {
        if (!pumpSchedule.intervalHours) return null;
        const intervalMillis = pumpSchedule.intervalHours * 3600000; // ms in an hour
        const lastPump = events.find(e => e.type === 'pump');
        const now = Date.now(); let nextPumpTime = null;
        if (lastPump) { nextPumpTime = lastPump.timestamp + intervalMillis; }
        else if (pumpSchedule.startTime) {
            const [startHour, startMinute] = pumpSchedule.startTime.split(':').map(Number);
            const todayStartDate = new Date(); todayStartDate.setHours(startHour, startMinute, 0, 0);
            if (todayStartDate.getTime() > now) nextPumpTime = todayStartDate.getTime();
            else { const tomorrowStartDate = new Date(todayStartDate); tomorrowStartDate.setDate(todayStartDate.getDate() + 1); nextPumpTime = tomorrowStartDate.getTime(); }
        } else return null; // Cannot calculate without reference
        // Ensure next time is in the future
        while (nextPumpTime <= now) nextPumpTime += intervalMillis;
        return nextPumpTime;
    };
    const updatePumpScheduleUI = () => {
        if (!DOMElements.pumpIntervalInput || !DOMElements.pumpStartTimeInput || !DOMElements.currentPumpScheduleDisplay) return;
        DOMElements.pumpIntervalInput.value = pumpSchedule.intervalHours || '';
        DOMElements.pumpStartTimeInput.value = pumpSchedule.startTime || '';
        DOMElements.currentPumpScheduleDisplay.textContent = pumpSchedule.intervalHours ? `Approx. every ${pumpSchedule.intervalHours} hours ${pumpSchedule.startTime ? '(aiming near ' + pumpSchedule.startTime + ')' : ''}` : 'Not set';
    };

     // --- Reports & Projections ---
     const updateDailySummary = () => {
         if (!DOMElements.dailySummaryList) return; DOMElements.dailySummaryList.innerHTML = '';
         const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0); const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
         const todayEvents = events.filter(e => e.timestamp >= todayStart.getTime() && e.timestamp <= todayEnd.getTime());
         if (todayEvents.length === 0) { DOMElements.dailySummaryList.innerHTML = '<li class="empty-list-item">No events yet today to summarize.</li>'; return; }
         const summary = { feeds: 0, bottleFeeds: 0, breastFeeds: 0, feedAmountOz: 0, feedDurationMin: 0, wetDiapers: 0, dirtyDiapers: 0, mixedDiapers: 0, totalDiapers: 0, sleepSessions: 0, totalSleepMs: 0, longestSleepMs: 0, pumpCount: 0, pumpAmountOz: 0 };
         todayEvents.forEach(e => { switch(e.type) { case 'feeding': summary.feeds++; if (e.feedType === 'bottle') { summary.bottleFeeds++; summary.feedAmountOz += (e.amountOz || 0); } else if (e.feedType === 'breast') { summary.breastFeeds++; summary.feedDurationMin += (e.durationMin || 0); } break; case 'diaper': summary.totalDiapers++; if (e.diaperType === 'wet') summary.wetDiapers++; if (e.diaperType === 'dirty') summary.dirtyDiapers++; if (e.diaperType === 'mixed') summary.mixedDiapers++; break; case 'sleep': if (e.duration && e.end >= todayStart.getTime() && e.start < todayEnd.getTime()) { const startOfDay = todayStart.getTime(); const endOfDay = todayEnd.getTime(); const sleepStart = Math.max(e.start, startOfDay); const sleepEnd = Math.min(e.end, endOfDay); const durationToday = sleepEnd - sleepStart; if (durationToday > 0) { summary.totalSleepMs += durationToday; summary.sleepSessions++; if (durationToday > summary.longestSleepMs) summary.longestSleepMs = durationToday; } } break; case 'pump': summary.pumpCount++; summary.pumpAmountOz += (e.amountOz || 0); break; } });
         const fragment = document.createDocumentFragment(); const addSummaryItem = (label, value) => { if (value || value === 0) { const li = createFormElement('li'); li.innerHTML = `<strong>${label}:</strong> ${value}`; fragment.appendChild(li); } }; // Include 0 values
         addSummaryItem('Total Feeds', `${summary.feeds} (${summary.bottleFeeds} bottle, ${summary.breastFeeds} breast)`); if (summary.feedAmountOz > 0) addSummaryItem('Total Bottle Intake', `${summary.feedAmountOz.toFixed(1)} oz`); if (summary.feedDurationMin > 0) addSummaryItem('Total Breastfeed Time', formatDuration(summary.feedDurationMin * 60000)); addSummaryItem('Total Diapers', `${summary.totalDiapers} (💧${summary.wetDiapers + summary.mixedDiapers}, 💩${summary.dirtyDiapers + summary.mixedDiapers})`); addSummaryItem('Total Sleep', formatDuration(summary.totalSleepMs)); if (summary.longestSleepMs > 0) addSummaryItem('Longest Sleep', formatDuration(summary.longestSleepMs)); if (summary.pumpCount > 0) addSummaryItem('Total Pumped', `${summary.pumpAmountOz.toFixed(1)} oz (${summary.pumpCount} sessions)`); else addSummaryItem('Total Pumped', '0 oz'); // Show 0 if none today
         DOMElements.dailySummaryList.appendChild(fragment);
     };
     const updateProjections = () => {
         if (!DOMElements.projectionList) return; DOMElements.projectionList.innerHTML = '';
         const now = Date.now(); const in24Hours = now + 24 * 3600000;
         const projections = []; const addProjection = (type, predictedTime, label) => { if (predictedTime && predictedTime > now && predictedTime <= in24Hours) projections.push({ time: predictedTime, label: `${label} (~${formatTime(predictedTime)})`, type }); };
         const { prediction: nextFeedPred, avgInterval: feedAvgInt } = predictNextEvent('feeding'); const { prediction: nextWetPred, avgInterval: wetAvgInt } = predictNextEvent('diaper', { diaperType: 'wet' }); const { prediction: nextDirtyPred, avgInterval: dirtyAvgInt } = predictNextEvent('diaper', { diaperType: 'dirty' }); const { prediction: nextSleepPred, avgInterval: sleepAvgInt } = predictNextEvent('sleep'); const nextScheduledPumpTime = calculateNextScheduledPump();
         addProjection('feed', nextFeedPred, '🍼 Next Feed'); addProjection('diaperWet', nextWetPred, '💧 Next Wet'); addProjection('diaperDirty', nextDirtyPred, '💩 Next Dirty'); if (!isSleeping) addProjection('sleep', nextSleepPred, '😴 Next Nap'); addProjection('pump', nextScheduledPumpTime, '🥛 Next Pump');
         const projectFurther = (type, lastPredTime, avgInterval, label, maxSteps = 3) => { let currentTime = lastPredTime; for (let i = 0; i < maxSteps; i++) { if (!currentTime || !avgInterval || avgInterval <= 0) break; const nextTime = currentTime + avgInterval; addProjection(type, nextTime, label); currentTime = nextTime; } };
         projectFurther('feed', nextFeedPred, feedAvgInt, '🍼 Feed', 5); projectFurther('diaperWet', nextWetPred, wetAvgInt, '💧 Wet Diaper', 3); projectFurther('diaperDirty', nextDirtyPred, dirtyAvgInt, '💩 Dirty Diaper', 2);
         if (!isSleeping && nextSleepPred) { const avgSleepDuration = calculateAverageSleepDuration() || (2 * 3600000); const predictedWakeTime = nextSleepPred + avgSleepDuration; projectFurther('sleep', predictedWakeTime, sleepAvgInt, '😴 Nap Start', 2); }
         projections.sort((a, b) => a.time - b.time);
         const uniqueProjections = projections.filter((item, index, self) => index === 0 || Math.abs(item.time - self[index - 1].time) > 5 * 60 * 1000);
         if (uniqueProjections.length > 0) { const fragment = document.createDocumentFragment(); uniqueProjections.forEach(p => fragment.appendChild(createFormElement('li', {}, p.label))); DOMElements.projectionList.appendChild(fragment); }
         else { const message = events.length < PREDICTION_MIN_EVENTS ? "Not enough data for projections yet. Keep logging!" : "No projected events in the next 24 hours."; DOMElements.projectionList.innerHTML = `<li class="empty-list-item">${message}</li>`; }
     };
     const calculateAverageSleepDuration = () => {
          const sleepEvents = events.filter(e => e.type === 'sleep' && e.duration && e.duration > 0);
          if (sleepEvents.length < PREDICTION_MIN_EVENTS) return null;
          const recentSleeps = sleepEvents.slice(0, PREDICTION_WINDOW);
          if(recentSleeps.length === 0) return null; // Avoid division by zero if somehow slice results in empty
          return recentSleeps.reduce((sum, e) => sum + e.duration, 0) / recentSleeps.length;
     };

    // --- Data Export/Import/Clear ---
    const handleExportData = () => {
         try {
            // Include versioning and metadata in export
            const dataToExport = {
                appName: APP_NAME,
                exportDate: new Date().toISOString(),
                version: 2.1, // Increment version as format evolves
                data: { // Encapsulate actual data
                    events, // shorthand for events: events
                    sleepState: { isSleeping, sleepStartTime },
                    pumpSchedule,
                    snoozeState,
                    alarmsPaused,
                    settings,
                    guidanceDismissed // Include guidance state
                }
            };
            const dataStr = JSON.stringify(dataToExport, null, 2); // Pretty-print JSON
            const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const a = createFormElement('a', { href: url, download: `baby-tracker-pro-backup-${timestamp}.json` });
            a.style.display = 'none'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            logInfo("Data exported successfully."); alert("Data backup file has been generated and downloaded.");
         } catch (error) { logError("Failed to export data:", error); alert("Error: Could not export data."); }
     };
    const handleImportData = (e) => {
        const file = e.target.files[0]; if (!file) return;
        if (!confirm("⚠️ IMPORTANT! ⚠️\n\nImporting data will OVERWRITE ALL current data.\n\nMake sure you have a backup if needed.\n\nProceed?")) { DOMElements.importFileInput.value = ''; return; }
        const reader = new FileReader();
        reader.onload = (event) => {
             try {
                 const importedJson = JSON.parse(event.target.result);
                 // Validate imported structure
                 if (typeof importedJson !== 'object' || !importedJson.data || !Array.isArray(importedJson.data.events)) throw new Error("Invalid file format or missing required data structure.");
                 // Optional: Check version compatibility if needed
                 // if (importedJson.version > 2.1) { ... warn user ... }
                 const importedData = importedJson.data;

                 // --- Perform Import (Overwrite current state) ---
                 clearAllAlarmTimeouts(); if (currentChart) { currentChart.destroy(); currentChart = null; }

                 events = importedData.events || [];
                 events.forEach(ev => { /* (Sanitize imported events as before) */ ev.timestamp = Number(ev.timestamp); if (ev.start) ev.start = Number(ev.start); if (ev.end) ev.end = Number(ev.end); if (!ev.id) ev.id = generateId(); });
                 events.sort((a, b) => b.timestamp - a.timestamp);

                 const impSleepState = importedData.sleepState || { isSleeping: false, sleepStartTime: null }; isSleeping = impSleepState.isSleeping || false; sleepStartTime = impSleepState.sleepStartTime ? Number(impSleepState.sleepStartTime) : null;
                 pumpSchedule = importedData.pumpSchedule || { intervalHours: null, startTime: null };
                 snoozeState = importedData.snoozeState || {}; Object.keys(snoozeState).forEach(key => { if (snoozeState[key]) snoozeState[key] = Number(snoozeState[key]); if (snoozeState[key] < Date.now()) delete snoozeState[key]; });
                 alarmsPaused = importedData.alarmsPaused || false;
                 settings = { ...settings, ...(importedData.settings || {}) }; // Merge settings
                 guidanceDismissed = importedData.guidanceDismissed === true; // Import guidance state

                 saveData(); // Save the newly imported data
                 // Refresh UI completely
                 hideAlarm(); updateSettingsUI(); updatePumpScheduleUI(); updateAlarmPauseStatus(); updateUI();
                 showGuidance(); // Check if guidance should be shown based on imported state
                 scheduleNextMainAlarmCheck(1000); // Start checks with new data

                 alert("Data imported successfully!"); logInfo("Data imported.");
             } catch (error) { logError("Failed to import data:", error); alert(`Error importing data: ${error.message}. Please ensure the file is a valid backup.`); }
              finally { DOMElements.importFileInput.value = ''; } // Reset file input
         };
         reader.onerror = () => { logError("Failed to read import file."); alert("Error reading the selected file."); DOMElements.importFileInput.value = ''; };
         reader.readAsText(file);
     };

     // --- Settings Update ---
     const updateSettingsUI = () => {
         if (DOMElements.alarmSoundCheckbox) DOMElements.alarmSoundCheckbox.checked = settings.alarmSoundEnabled;
         // Update other settings controls here if added
     };
     const handleSettingsChange = (e) => {
         const target = e.target;
         if (target === DOMElements.alarmSoundCheckbox) { // Check if it's the checkbox input itself
             settings.alarmSoundEnabled = target.checked;
             saveData();
             logInfo(`Alarm sound ${settings.alarmSoundEnabled ? 'enabled' : 'disabled'}.`);
         }
         // Add handlers for other settings inputs if needed
     };

    // --- Initialization and Event Listeners ---
    const initializeApp = () => {
        logInfo(`Initializing ${APP_NAME}...`);

        loadData(); // Load all data from localStorage

        // Set up repeating tasks
        setInterval(updateClock, 1000); // Update clock every second
        setInterval(updateDashboard, DASHBOARD_UPDATE_INTERVAL); // Update dashboard periodically

        updateClock(); // Initial clock update
        switchTab('history'); // Default to history tab on load

        // Start the main alarm check loop
        scheduleNextMainAlarmCheck(5000); // Start first check 5s after load

        // --- Attach Event Listeners ---
        // Use optional chaining for safety in case elements are missing
        DOMElements.closeLogModalButton?.addEventListener('click', closeModal);
        DOMElements.logModal?.addEventListener('click', (e) => { if (e.target === DOMElements.logModal) closeModal(); });
        DOMElements.closeHelpModalButton?.addEventListener('click', closeHelpModal);
        DOMElements.helpModal?.addEventListener('click', (e) => { if (e.target === DOMElements.helpModal) closeHelpModal(); });
        DOMElements.logForm?.addEventListener('submit', handleFormSubmit);

        // Delegated Listeners (more efficient)
        DOMElements.mainContent?.addEventListener('click', handleHelpClick); // Help buttons within main
        DOMElements.alarmNotification?.addEventListener('click', handleHelpClick); // Help button on alarm
        DOMElements.dismissGuidanceButton?.addEventListener('click', dismissGuidance);
        DOMElements.dashboardContainer?.addEventListener('click', handleDashboardClick); // Dashboard actions
        DOMElements.tabsContainer?.addEventListener('click', handleTabClick); // Tab navigation
        DOMElements.alarmNotification?.addEventListener('click', handleAlarmInteraction); // Alarm snooze/dismiss
        DOMElements.settingsContainer?.addEventListener('input', handleSettingsChange); // Settings changes

        // Direct Listeners (for specific elements)
        DOMElements.chartTypeSelect?.addEventListener('change', renderChart);
        DOMElements.historyFilter?.addEventListener('change', renderEventList);
        DOMElements.historyLimit?.addEventListener('change', renderEventList);
        DOMElements.resumeAlarmsButton?.addEventListener('click', () => resumeAllAlarms(false));
        DOMElements.forceResumeAlarmsButton?.addEventListener('click', () => resumeAllAlarms(true));
        DOMElements.savePumpScheduleButton?.addEventListener('click', savePumpSchedule);
        DOMElements.exportButton?.addEventListener('click', handleExportData);
        DOMElements.importFileInput?.addEventListener('change', handleImportData);
        DOMElements.importButtonLabel?.addEventListener('click', () => DOMElements.importFileInput?.click()); // Trigger file input
        DOMElements.clearDataButton?.addEventListener('click', clearAllData);

        logInfo(`${APP_NAME} Initialized and Ready.`);
    };

    // --- Start the Application ---
    initializeApp();

}); // End DOMContentLoaded Listener
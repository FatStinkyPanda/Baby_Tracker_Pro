/**
 * Baby Tracker Pro - script.js
 *
 * Handles all application logic for tracking baby events, predictions,
 * alarms, charting, and data management within the browser using localStorage.
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
        SETTINGS: 'babyTrackerSettings_v1', // For things like alarm sound preference
    };
    const ALARM_CHECK_INTERVAL = 30 * 1000;       // Check alarms every 30 seconds
    const DASHBOARD_UPDATE_INTERVAL = 60 * 1000; // Update dashboard every minute
    const PREDICTION_MIN_EVENTS = 3;             // Min events needed for a basic prediction
    const PREDICTION_WINDOW = 10;                // Number of recent events for moving average
    const ALARM_THRESHOLD_PERCENT = 0.95;      // Trigger alarm nearing predicted time
    const DEFAULT_ALARM_SOUND = 'alert.mp3';     // Path to alarm sound file

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
    let mainAlarmCheckTimeout = null;    // Timeout ID for the main periodic alarm check

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
    const generateId = () => `_${Math.random().toString(36).substr(2, 9)}`;
    const logError = (message, error = '') => console.error(`${APP_NAME} Error: ${message}`, error);
    const logInfo = (message) => console.info(`${APP_NAME} Info: ${message}`);
    const logWarning = (message) => console.warn(`${APP_NAME} Warning: ${message}`);

    // --- Data Management ---
    const saveData = () => {
        try {
            localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
            localStorage.setItem(STORAGE_KEYS.SLEEP_STATE, JSON.stringify({ isSleeping, sleepStartTime }));
            localStorage.setItem(STORAGE_KEYS.PUMP_SCHEDULE, JSON.stringify(pumpSchedule));
            localStorage.setItem(STORAGE_KEYS.SNOOZE_STATE, JSON.stringify(snoozeState));
            localStorage.setItem(STORAGE_KEYS.ALARMS_PAUSED, JSON.stringify(alarmsPaused));
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
            // logInfo("Data saved."); // Can be noisy, uncomment for debugging
        } catch (error) {
            logError("Failed to save data to localStorage. Storage might be full.", error);
            alert("Error: Could not save data. Your browser's local storage might be full or unavailable.");
        }
    };

    const loadData = () => {
        try {
            const storedEvents = localStorage.getItem(STORAGE_KEYS.EVENTS);
            const storedSleepState = localStorage.getItem(STORAGE_KEYS.SLEEP_STATE);
            const storedPumpSchedule = localStorage.getItem(STORAGE_KEYS.PUMP_SCHEDULE);
            const storedSnoozeState = localStorage.getItem(STORAGE_KEYS.SNOOZE_STATE);
            const storedAlarmsPaused = localStorage.getItem(STORAGE_KEYS.ALARMS_PAUSED);
            const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);

            events = storedEvents ? JSON.parse(storedEvents) : [];
            // Data Sanitization/Migration (Example: Ensure timestamps are numbers)
            events.forEach(event => {
                event.timestamp = Number(event.timestamp);
                if (event.start) event.start = Number(event.start);
                if (event.end) event.end = Number(event.end);
                if (!event.id) event.id = generateId(); // Add IDs if missing from older versions
            });
            events.sort((a, b) => b.timestamp - a.timestamp); // Sort descending by time

            const sleepState = storedSleepState ? JSON.parse(storedSleepState) : { isSleeping: false, sleepStartTime: null };
            isSleeping = sleepState.isSleeping || false;
            sleepStartTime = sleepState.sleepStartTime ? Number(sleepState.sleepStartTime) : null;

            pumpSchedule = storedPumpSchedule ? JSON.parse(storedPumpSchedule) : { intervalHours: null, startTime: null };

            snoozeState = storedSnoozeState ? JSON.parse(storedSnoozeState) : {};
            Object.keys(snoozeState).forEach(key => {
                 if (snoozeState[key]) snoozeState[key] = Number(snoozeState[key]);
                 // Clean up expired snoozes on load
                 if (snoozeState[key] < Date.now()) delete snoozeState[key];
            });

            alarmsPaused = storedAlarmsPaused ? JSON.parse(storedAlarmsPaused) : false;

            settings = storedSettings ? { ...settings, ...JSON.parse(storedSettings) } : settings;


            logInfo("Data loaded successfully.");
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
            settings = { alarmSoundEnabled: true };
        } finally {
             // Always update UI after load attempt
             updateSettingsUI();
             updatePumpScheduleUI();
             updateAlarmPauseStatus();
             updateUI(); // Full UI refresh
        }
    };

    const addEvent = (eventData) => {
        const newEvent = {
            id: generateId(),
            timestamp: eventData.timestamp || Date.now(),
            ...eventData
        };
        // Basic validation could go here if needed
        events.push(newEvent);
        events.sort((a, b) => b.timestamp - a.timestamp); // Keep sorted
        saveData();
        updateUI();
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
            logInfo(`Event deleted: (ID: ${eventId})`);
            scheduleNextMainAlarmCheck(5000); // Re-check alarms
        } else {
             logWarning(`Event not found for deletion: (ID: ${eventId})`);
        }
    };

     const clearAllData = () => {
        if (confirm("⚠️ WARNING! ⚠️\n\nThis will permanently delete ALL tracked data (events, settings, schedule).\n\nThis action cannot be undone.\n\nAre you absolutely sure you want to proceed?")) {
            localStorage.removeItem(STORAGE_KEYS.EVENTS);
            localStorage.removeItem(STORAGE_KEYS.SLEEP_STATE);
            localStorage.removeItem(STORAGE_KEYS.PUMP_SCHEDULE);
            localStorage.removeItem(STORAGE_KEYS.SNOOZE_STATE);
            localStorage.removeItem(STORAGE_KEYS.ALARMS_PAUSED);
            localStorage.removeItem(STORAGE_KEYS.SETTINGS);

            // Reset state variables
            events = [];
            isSleeping = false;
            sleepStartTime = null;
            pumpSchedule = { intervalHours: null, startTime: null };
            snoozeState = {};
            alarmsPaused = false;
            settings = { alarmSoundEnabled: true };

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
            alert("All data has been cleared successfully.");
        }
    };

    // --- Prediction Logic ---
    /**
     * Calculates the average interval between events of a specific type.
     * Uses a moving average based on the last `window` occurrences.
     * @param {string} eventType - The type of event (e.g., 'feeding', 'sleep').
     * @param {object|null} subType - Optional filter for subtype (e.g., { diaperType: 'wet' }).
     * @param {number} window - Number of recent intervals to average.
     * @returns {number|null} Average interval in milliseconds, or null if not enough data.
     */
    const calculateAverageInterval = (eventType, subType = null, window = PREDICTION_WINDOW) => {
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
            const MAX_REASONABLE_INTERVAL = 2 * 24 * 60 * 60 * 1000; // 48 hours
            if (interval > 0 && interval < MAX_REASONABLE_INTERVAL) {
                intervals.push(interval);
            }
        }

        if (intervals.length === 0) return null;

        // Use moving average if enough intervals, otherwise use overall average if possible
        const intervalsToAverage = intervals.length >= window ? intervals.slice(-window) : intervals;

        // Need at least PREDICTION_MIN_EVENTS - 1 intervals for a meaningful average
        if (intervalsToAverage.length < PREDICTION_MIN_EVENTS - 1) {
            return null; // Not enough reliable data points yet
        }

        const average = intervalsToAverage.reduce((sum, val) => sum + val, 0) / intervalsToAverage.length;
        return average;
    };

    /**
     * Predicts the timestamp of the next event occurrence.
     * @param {string} eventType - The type of event.
     * @param {object|null} subType - Optional subtype filter.
     * @returns {object} { prediction: number|null, lastEventTime: number|null, avgInterval: number|null }
     */
    const predictNextEvent = (eventType, subType = null) => {
        const avgInterval = calculateAverageInterval(eventType, subType);
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
                 const subTypeValue = Object.values(subType)[0];
                 relevantEvents = relevantEvents.filter(e => e[subTypeKey] === subTypeValue);
             }
             lastEvent = relevantEvents[0]; // Assumes events are sorted descending
             lastEventTime = lastEvent?.timestamp || null;
         }


        if (lastEventTime && avgInterval) {
            prediction = lastEventTime + avgInterval;
        }

        return { prediction, lastEventTime, avgInterval };
    };


    // --- UI Update Functions ---
    const updateClock = () => {
        if (DOMElements.currentTime) {
            DOMElements.currentTime.textContent = formatDateTime(Date.now());
        }
    };

    const updateProgressBar = (elementId, lastEventTime, avgInterval, predictedTime = null) => {
        const progressBar = document.getElementById(elementId);
        if (!progressBar) return;

        let percentage = 0;
        progressBar.classList.remove('medium', 'high'); // Reset classes

        if (lastEventTime && avgInterval && avgInterval > 0) {
            const now = Date.now();
            const elapsed = now - lastEventTime;
            percentage = Math.max(0, (elapsed / avgInterval) * 100);

            // If prediction exists, use it to refine visual state
            const effectivePredictedTime = predictedTime || (lastEventTime + avgInterval);

            if (now < effectivePredictedTime) {
                // Before predicted time, cap progress visually slightly below 100%
                // unless very close to provide anticipation
                percentage = Math.min(percentage, 99.5);
            } else {
                // After predicted time, ensure it shows 100% or slightly over
                percentage = 100;
            }

            // Determine urgency based on percentage
             if (percentage >= 95) { // Changed threshold for 'high'
                progressBar.classList.add('high'); // Red/Coral
            } else if (percentage >= 75) { // Changed threshold for 'medium'
                progressBar.classList.add('medium'); // Yellow/Peach
            }
             // Default is green (success-color) - no class needed
        }

        progressBar.style.width = `${Math.min(100, percentage)}%`; // Visually cap at 100%
    };

    const updateDashboard = () => {
        const now = Date.now();

        // --- Feeding Status ---
        const lastFeed = events.find(e => e.type === 'feeding');
        const { prediction: nextFeedPred, lastEventTime: lastFeedTime, avgInterval: feedAvgInt } = predictNextEvent('feeding');
        const feedCard = DOMElements.dashboardContainer.querySelector('.status-card:nth-child(1)'); // Assuming order
        if (feedCard) {
            feedCard.querySelector('#last-feed-time').textContent = formatTime(lastFeed?.timestamp);
            feedCard.querySelector('#last-feed-details').textContent = lastFeed ? (lastFeed.feedType === 'bottle' ? `${lastFeed.amountOz || '?'}oz` : `${lastFeed.durationMin || '?'}m ${lastFeed.side || ''}`) : '';
            feedCard.querySelector('#next-feed-prediction').textContent = nextFeedPred ? `~${formatTime(nextFeedPred)}` : (lastFeed ? 'Calculating...' : 'No data');
            updateProgressBar('feed-progress', lastFeedTime, feedAvgInt, nextFeedPred);
        }

        // --- Diaper Status ---
        const lastDiaper = events.find(e => e.type === 'diaper');
        const lastWetDiaper = events.find(e => e.type === 'diaper' && (e.diaperType === 'wet' || e.diaperType === 'mixed'));
        const lastDirtyDiaper = events.find(e => e.type === 'diaper' && (e.diaperType === 'dirty' || e.diaperType === 'mixed'));
        const { prediction: nextWetPred, lastEventTime: lastWetTime, avgInterval: wetAvgInt } = predictNextEvent('diaper', { diaperType: 'wet' }); // Predict based on 'wet' only for clarity
        const { prediction: nextDirtyPred, lastEventTime: lastDirtyTime, avgInterval: dirtyAvgInt } = predictNextEvent('diaper', { diaperType: 'dirty' }); // Predict based on 'dirty' only
        const diaperCard = DOMElements.dashboardContainer.querySelector('.status-card:nth-child(2)');
        if (diaperCard) {
            diaperCard.querySelector('#last-diaper-time').textContent = formatTime(lastDiaper?.timestamp);
            diaperCard.querySelector('#last-diaper-type').textContent = lastDiaper ? lastDiaper.diaperType : '';
            diaperCard.querySelector('#next-wet-prediction').textContent = nextWetPred ? `~${formatTime(nextWetPred)}` : (lastWetDiaper ? 'Calculating...' : 'No data');
            diaperCard.querySelector('#next-dirty-prediction').textContent = nextDirtyPred ? `~${formatTime(nextDirtyPred)}` : (lastDirtyDiaper ? 'Calculating...' : 'No data');
             // Update progress bars based on the last occurrence of that specific type (wet/dirty)
            updateProgressBar('diaper-progress-wet', lastWetDiaper?.timestamp || null, wetAvgInt, nextWetPred);
            updateProgressBar('diaper-progress-dirty', lastDirtyDiaper?.timestamp || null, dirtyAvgInt, nextDirtyPred);
        }


        // --- Sleep Status ---
        const lastCompleteSleep = events.find(e => e.type === 'sleep' && e.end);
        const lastSleepStartEvent = events.find(e => e.type === 'sleep' && e.start); // Might be ongoing or completed
        const { prediction: nextSleepPred, lastEventTime: lastSleepEndTimeForPred, avgInterval: sleepAvgInt } = predictNextEvent('sleep');
        const sleepCard = DOMElements.dashboardContainer.querySelector('.status-card:nth-child(3)');
        if (sleepCard) {
            sleepCard.querySelector('#last-sleep-start-time').textContent = formatTime(lastSleepStartEvent?.start);
             sleepCard.querySelector('#last-sleep-end-time').textContent = formatTime(lastCompleteSleep?.end);
             sleepCard.querySelector('#last-sleep-duration').textContent = isSleeping ? `Ongoing: ${formatDuration(now - sleepStartTime)}` : formatDuration(lastCompleteSleep?.duration);
             sleepCard.querySelector('#next-sleep-prediction').textContent = isSleeping ? 'Sleeping...' : (nextSleepPred ? `~${formatTime(nextSleepPred)}` : (lastCompleteSleep ? 'Calculating...' : 'No data'));

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
                updateProgressBar('sleep-progress', lastSleepEndTimeForPred, sleepAvgInt, nextSleepPred);
            }
        }

         // --- Pumping Status ---
        const lastPump = events.find(e => e.type === 'pump');
        const nextScheduledPumpTime = calculateNextScheduledPump();
         // Use schedule interval primarily for progress if set, otherwise historical average
        const pumpInterval = pumpSchedule.intervalHours ? pumpSchedule.intervalHours * 60 * 60 * 1000 : calculateAverageInterval('pump');
        const pumpCard = DOMElements.dashboardContainer.querySelector('.status-card:nth-child(4)');
        if(pumpCard){
            pumpCard.querySelector('#last-pump-time').textContent = formatTime(lastPump?.timestamp);
            pumpCard.querySelector('#last-pump-amount').textContent = lastPump?.amountOz ? `${lastPump.amountOz}oz` : (lastPump ? 'Logged' : '');
             pumpCard.querySelector('#next-pump-schedule').textContent = nextScheduledPumpTime ? `~${formatTime(nextScheduledPumpTime)}` : (pumpSchedule.intervalHours ? 'Calculating...' : 'Set schedule...');
            updateProgressBar('pump-progress', lastPump?.timestamp || null, pumpInterval, nextScheduledPumpTime);
        }

        // Update Reports Tab Content (if active or periodically)
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
         const icons = { feeding: '🍼', diaper: '💩', sleep: '😴', pump: '🥛', mood: '😊', gas: '💨' };
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
                details = `Unknown Event: ${event.type}`;
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
        // Other UI updates as needed (e.g., potentially highlighting overdue items)
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
         }
         // Add more mappings if needed


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
            // Add cases for 'mood', 'gas', etc. here
             case 'gas':
                 title = eventId ? "Edit Gas/Fussiness Event" : "Log Gas/Fussiness";
                 formFields.push(createFormLabel("Notes (Optional):", "gas-notes"));
                 formFields.push(createTextArea("gas-notes", eventData.notes || '', "Severity, remedies tried?"));
                 break;
            default:
                logWarning(`Modal opened with unknown action/type: ${action}`);
                formFields.push(document.createTextNode("Cannot determine event type for this action."));
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
            // Add processing for other event types...
        }

         // --- Clean up null/empty string values ---
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

        closeModal();
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
        ];

        checks.forEach(check => {
            if (check.condition && !check.condition()) {
                 // If condition exists and is false (e.g., trying to schedule sleep alarm while sleeping), clear any pending timeout and skip
                 clearTimeout(alarmTimeouts[check.type]);
                 delete alarmTimeouts[check.type];
                 return;
            }

            let predictionResult, predictedTime, lastEventTime, avgInterval;

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

                 if (predictedTime && lastEventTime && avgInterval) {
                     // Calculate trigger time based on threshold
                     const triggerTime = lastEventTime + (avgInterval * ALARM_THRESHOLD_PERCENT);
                     // Schedule based on the *earlier* of the threshold time or the actual predicted time
                     const finalTriggerTime = Math.min(triggerTime, predictedTime);
                     scheduleAlarmTimeout(check.type, finalTriggerTime, check.message);
                 } else {
                      // Not enough data or missing prediction, clear any pending alarm for this type
                      clearTimeout(alarmTimeouts[check.type]);
                      delete alarmTimeouts[check.type];
                      // logInfo(`Alarm Check [${check.type}]: Not scheduling (Insufficient data).`);
                 }
            }
        });
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

         DOMElements.dailySummaryList.appendChild(fragment);
     };

      const updateProjections = () => {
         if (!DOMElements.projectionList) return;
         DOMElements.projectionList.innerHTML = ''; // Clear previous
         const now = Date.now();
         const in24Hours = now + 24 * 60 * 60 * 1000;

         const projections = []; // { time: timestamp, label: string, type: string }

         // Function to add projection if valid and within timeframe
         const addProjection = (type, predictedTime, label) => {
             if (predictedTime && predictedTime > now && predictedTime <= in24Hours) {
                 projections.push({ time: predictedTime, label: `${label} (~${formatTime(predictedTime)})`, type });
             }
         };

         // Get initial predictions
         const { prediction: nextFeedPred, avgInterval: feedAvgInt } = predictNextEvent('feeding');
         const { prediction: nextWetPred, avgInterval: wetAvgInt } = predictNextEvent('diaper', { diaperType: 'wet' });
         const { prediction: nextDirtyPred, avgInterval: dirtyAvgInt } = predictNextEvent('diaper', { diaperType: 'dirty' });
         const { prediction: nextSleepPred, avgInterval: sleepAvgInt } = predictNextEvent('sleep');
         const nextScheduledPumpTime = calculateNextScheduledPump();

         // Add first round of predictions
         addProjection('feed', nextFeedPred, '🍼 Next Feed');
         addProjection('diaperWet', nextWetPred, '💧 Next Wet');
         addProjection('diaperDirty', nextDirtyPred, '💩 Next Dirty');
         if (!isSleeping) addProjection('sleep', nextSleepPred, '😴 Next Nap');
         addProjection('pump', nextScheduledPumpTime, '🥛 Next Pump');

         // --- Naive Forward Projection ---
         // WARNING: Accuracy decreases significantly with each step.
         const projectFurther = (type, lastPredTime, avgInterval, label, maxSteps = 3) => {
               let currentTime = lastPredTime;
               for (let i = 0; i < maxSteps; i++) {
                    if (!currentTime || !avgInterval || avgInterval <= 0) break;
                    const nextTime = currentTime + avgInterval;
                     addProjection(type, nextTime, label); // Use addProjection to handle time checks
                     currentTime = nextTime;
               }
          };

          projectFurther('feed', nextFeedPred, feedAvgInt, '🍼 Feed', 5);
          projectFurther('diaperWet', nextWetPred, wetAvgInt, '💧 Wet Diaper', 3);
          projectFurther('diaperDirty', nextDirtyPred, dirtyAvgInt, '💩 Dirty Diaper', 2);
          if (!isSleeping) {
              // Projecting sleep requires average sleep duration too for realistic awake/sleep cycle
               const avgSleepDuration = calculateAverageSleepDuration() || (2 * 60 * 60 * 1000); // Default 2h if unknown
               // Project next awake time after predicted sleep ends
               if (nextSleepPred) {
                    const predictedWakeTime = nextSleepPred + avgSleepDuration;
                    // Project next nap start based on predicted wake time + avg awake time (sleepAvgInt)
                    projectFurther('sleep', predictedWakeTime, sleepAvgInt, '😴 Nap Start', 2);
               }
          }

          // Sort all collected projections by time
          projections.sort((a, b) => a.time - b.time);

          // Remove duplicates that are very close in time (e.g., within 5 mins)
           const uniqueProjections = projections.filter((item, index, self) =>
               index === 0 || Math.abs(item.time - self[index - 1].time) > 5 * 60 * 1000
           );

         if (uniqueProjections.length > 0) {
             const fragment = document.createDocumentFragment();
             uniqueProjections.forEach(p => {
                 const li = createFormElement('li', {}, p.label);
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
            const dataToExport = {
                appName: APP_NAME,
                exportDate: new Date().toISOString(),
                version: 1, // Simple versioning
                data: {
                    events: events,
                    sleepState: { isSleeping, sleepStartTime },
                    pumpSchedule: pumpSchedule,
                    snoozeState: snoozeState,
                    alarmsPaused: alarmsPaused,
                    settings: settings
                }
            };
            const dataStr = JSON.stringify(dataToExport, null, 2); // Pretty print JSON
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
             logInfo("Data exported successfully.");
             alert("Data backup file has been generated and downloaded.");
         } catch (error) {
            logError("Failed to export data:", error);
            alert("Error: Could not export data.");
         }
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
                 // Sanitize/Validate imported events
                 events.forEach(ev => {
                     ev.timestamp = Number(ev.timestamp);
                     if (ev.start) ev.start = Number(ev.start);
                     if (ev.end) ev.end = Number(ev.end);
                     if (!ev.id) ev.id = generateId(); // Add ID if missing
                     // Add more validation as needed (e.g., check for required fields based on type)
                 });
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

                 // --- Save and Refresh ---
                 saveData(); // Save the newly imported data to localStorage
                 hideAlarm(); // Ensure alarm UI is reset
                 updateSettingsUI();
                 updatePumpScheduleUI();
                 updateAlarmPauseStatus();
                 updateUI(); // Full UI refresh
                 scheduleNextMainAlarmCheck(1000); // Start checks with new data

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


     // --- Settings Update ---
     const updateSettingsUI = () => {
         if (DOMElements.alarmSoundCheckbox) {
             DOMElements.alarmSoundCheckbox.checked = settings.alarmSoundEnabled;
         }
         // Update other settings UI elements if added
     };

     const handleSettingsChange = (e) => {
         if (e.target === DOMElements.alarmSoundCheckbox) {
             settings.alarmSoundEnabled = e.target.checked;
             saveData();
             logInfo(`Alarm sound ${settings.alarmSoundEnabled ? 'enabled' : 'disabled'}.`);
         }
         // Add handlers for other settings changes
     };

    // --- Initialization and Event Listeners ---
    const initializeApp = () => {
        logInfo("Initializing Baby Tracker Pro...");

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

        logInfo("Application Initialized.");
    };

    // --- Start the Application ---
    initializeApp();

}); // End DOMContentLoaded
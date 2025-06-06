/**
 * @fileoverview Utility functions for interacting with Google Calendar.
 * Provides a method to post assigned escorts to the host account calendar.
 * Calls to CalendarApp are throttled to avoid hitting service quotas.
 */

/**
 * Posts all assignments with status "Assigned" to the configured calendar.
 * Entries are grouped by request so only one calendar event exists per request.
 * Assigned rider names are written back to the request record and used in the
 * event description. The resulting calendar event ID is stored on each
 * assignment row.
 * @return {void}
 */
function postAssignmentsToCalendar() {
  try {
    const assignmentsData = getAssignmentsData();
    const map = assignmentsData.columnMap;
    const sheet = assignmentsData.sheet;

    // Group assigned riders and row indexes by request ID
    const grouped = {};
    assignmentsData.data.forEach((row, idx) => {
      const status = getColumnValue(row, map, CONFIG.columns.assignments.status);
      if (status !== 'Assigned') return;

      const reqId = getColumnValue(row, map, CONFIG.columns.assignments.requestId);
      const rider = getColumnValue(row, map, CONFIG.columns.assignments.riderName);
      if (!reqId) return;

      if (!grouped[reqId]) {
        grouped[reqId] = { riders: [], rows: [] };
      }
      if (rider) grouped[reqId].riders.push(rider);
      grouped[reqId].rows.push(idx);
    });

    Object.keys(grouped).forEach(requestId => {
      const info = grouped[requestId];
      // Update request row with riders and sync to calendar
      updateRequestWithAssignedRiders(requestId, info.riders);

      // Retrieve the calendar event ID from the request row
      const requestsData = getRequestsData(false);
      const rMap = requestsData.columnMap;
      const rSheet = requestsData.sheet;
      let rowIndex = -1;
      for (let i = 0; i < requestsData.data.length; i++) {
        const idVal = getColumnValue(requestsData.data[i], rMap, CONFIG.columns.requests.id);
        if (String(idVal).trim() === String(requestId).trim()) {
          rowIndex = i + 2;
          break;
        }
      }
      let eventId = '';
      if (rowIndex !== -1 && rMap[CONFIG.columns.requests.calendarEventId] !== undefined) {
        eventId = rSheet.getRange(rowIndex, rMap[CONFIG.columns.requests.calendarEventId] + 1).getValue();
      }

      // Write the event ID to each assignment row for this request
      if (eventId) {
        const idCol = map[CONFIG.columns.assignments.calendarEventId];
        if (idCol !== undefined) {
          info.rows.forEach(i => {
            sheet.getRange(i + 2, idCol + 1).setValue(eventId);
          });
        }
      }
    });
  } catch (error) {
    logError('Error posting assignments to calendar', error);
  }
}

/**
 * Creates or updates a calendar event for a single request if it is assigned.
 * Only future events are synced.
 * @param {string} requestId The ID of the request to sync.
 * @return {void}
 */
function syncRequestToCalendar(requestId) {
  try {
    const details = getRequestDetails(requestId);
    if (!details || details.status !== 'Assigned') return;

    const eventDate = details.eventDate;
    if (!(eventDate instanceof Date)) return;
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    if (eventDay < startOfToday) return; // Only future events

    const calendar =
      CalendarApp.getCalendarsByName(CONFIG.system.calendarName)[0] ||
      CalendarApp.createCalendar(CONFIG.system.calendarName);

    const requestsData = getRequestsData();
    const map = requestsData.columnMap;
    const sheet = requestsData.sheet;

    let rowIndex = -1;
    for (let i = 0; i < requestsData.data.length; i++) {
      const idVal = getColumnValue(requestsData.data[i], map, CONFIG.columns.requests.id);
      if (String(idVal).trim() === String(requestId).trim()) {
        rowIndex = i + 2; // account for header row
        break;
      }
    }

    const idCol = map[CONFIG.columns.requests.calendarEventId];
    let existingEventId = null;
    if (rowIndex !== -1 && idCol !== undefined) {
      existingEventId = sheet.getRange(rowIndex, idCol + 1).getValue();
    }

    const startDate = new Date(eventDate);
    if (details.startTime instanceof Date) {
      startDate.setHours(details.startTime.getHours(), details.startTime.getMinutes());
    }
    let endDate = null;
    if (details.endTime instanceof Date) {
      endDate = new Date(eventDate);
      endDate.setHours(details.endTime.getHours(), details.endTime.getMinutes());
    }

  const title = `${details.type || 'Escort'} - ${details.requesterName || requestId}`;
  let description = `Request ID: ${requestId}`;
  if (details.startLocation) description += `\nFrom: ${details.startLocation}`;
  if (details.endLocation) description += `\nTo: ${details.endLocation}`;
  if (details.notes) description += `\nNotes: ${details.notes}`;
  if (details.ridersAssigned) {
    const riders = String(details.ridersAssigned)
      .split(/[,\n]/)
      .map(r => r.trim())
      .filter(r => r);
    if (riders.length > 0) {
      description += `\nAssigned Riders: ${riders.join(', ')}`;
    }
  }

    let event = null;
    if (existingEventId) {
      try {
        event = calendar.getEventById(existingEventId);
      } catch (e) {
        event = null;
      }
    }

    if (event) {
      event.setTitle(title);
      Utilities.sleep(500); // Throttle to avoid Apps Script service quota errors
      event.setDescription(description);
      event.setTime(startDate, endDate || startDate);
      Utilities.sleep(500); // Throttle after event update
    } else {
      event = calendar.createEvent(title, startDate, endDate || startDate, { description });
      Utilities.sleep(500); // Throttle after event creation
    }

    if (rowIndex !== -1 && idCol !== undefined) {
      sheet.getRange(rowIndex, idCol + 1).setValue(event.getId());
    }
  } catch (error) {
    logError(`Error syncing request ${requestId} to calendar`, error);
  }
}

/**
 * Synchronizes all assigned requests with future dates to the calendar.
 * Can be called from a custom menu button.
 * @return {void}
 */
function syncAllAssignedRequestsToCalendar() {
  const requestsData = getRequestsData();
  requestsData.data.forEach(row => {
    const status = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.status);
    if (status !== 'Assigned') return;
    const id = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.id);
    const eventDate = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.eventDate);
    if (!(eventDate instanceof Date)) return;
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const day = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    if (day < startOfToday) return;
    syncRequestToCalendar(id);
  });
}

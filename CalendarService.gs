/**
 * @fileoverview Utility functions for interacting with Google Calendar.
 * Provides helper methods to post assigned escorts to the host account calendar
 * and to remove events when needed. Calls to CalendarApp are throttled to avoid
 * hitting service quotas.
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
 * Creates or updates a calendar event for a single request.
 * Originally events were only synced when a request was marked as
 * "Assigned" which caused new requests to be missing from the calendar.
 * This function now syncs all requests with a valid future event date
 * so that they appear on the calendar immediately and are updated as
 * assignments change.
 * @param {string} requestId The ID of the request to sync.
 * @return {void}
 */
function syncRequestToCalendar(requestId) {
  try {
    const details = getRequestDetails(requestId);
    if (!details) return;

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

    // If no event found by ID, attempt to locate an existing event
    // matching the same title and start time. This helps prevent
    // creating duplicate calendar entries when the stored ID is missing
    // or invalid.
    if (!event) {
      const eventsForDay = calendar.getEventsForDay(startDate);
      for (let i = 0; i < eventsForDay.length; i++) {
        const evt = eventsForDay[i];
        if (evt.getTitle() === title && evt.getStartTime().getTime() === startDate.getTime()) {
          event = evt;
          break;
        }
      }
    }

    // NEW: Search for an event containing the request ID in the description
    // within a reasonable date range in case the stored ID was lost and the
    // event moved to a different day.
    const searchStart = new Date(startDate.getTime());
    searchStart.setDate(searchStart.getDate() - 7);
    const searchEnd = new Date(startDate.getTime());
    searchEnd.setDate(searchEnd.getDate() + 7);
    if (!event) {
      const potentialEvents = calendar.getEvents(searchStart, searchEnd);
      for (let i = 0; i < potentialEvents.length; i++) {
        const evt = potentialEvents[i];
        if (evt.getDescription().indexOf(`Request ID: ${requestId}`) !== -1) {
          event = evt;
          break;
        }
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

    // Remove any duplicate events that may exist for the same request.
    const eventsInRange = calendar.getEvents(searchStart, searchEnd);
    for (var i = 0; i < eventsInRange.length; i++) {
      var evt = eventsInRange[i];
      if (evt.getDescription().indexOf(`Request ID: ${requestId}`) !== -1 &&
          evt.getId() !== event.getId()) {
        try {
          evt.deleteEvent();
          Utilities.sleep(500); // Throttle after deletion
        } catch (dupErr) {
          // Ignore deletion errors
        }
      }
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

/**
 * Deletes the calendar event associated with the given request ID.
 * The event ID is read from the Requests sheet and cleared after deletion.
 * @param {string} requestId The ID of the request whose event should be removed.
 * @return {void}
 */
function deleteRequestCalendarEvent(requestId) {
  try {
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
    if (rowIndex === -1) return;

    const idCol = map[CONFIG.columns.requests.calendarEventId];
    if (idCol === undefined) return;
    const eventId = sheet.getRange(rowIndex, idCol + 1).getValue();
    if (!eventId) return;

    const calendar = CalendarApp.getCalendarsByName(CONFIG.system.calendarName)[0];
    if (calendar) {
      try {
        const event = calendar.getEventById(eventId);
        if (event) {
          event.deleteEvent();
          Utilities.sleep(500); // Throttle to avoid service quota errors
        }
      } catch (e) {
        // Ignore if event not found or cannot be deleted
      }
    }

    sheet.getRange(rowIndex, idCol + 1).setValue('');
  } catch (error) {
    logError(`Error deleting calendar event for request ${requestId}`, error);
  }
}

/**
 * Deletes all calendar events referenced in the Requests sheet.
 * Useful for cleaning up duplicate events.
 * @return {void}
 */
function deleteAllCalendarEvents() {
  const requestsData = getRequestsData();
  requestsData.data.forEach(row => {
    const requestId = getColumnValue(row, requestsData.columnMap, CONFIG.columns.requests.id);
    deleteRequestCalendarEvent(requestId);
  });
}

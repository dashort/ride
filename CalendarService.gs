/**
 * @fileoverview Utility functions for interacting with Google Calendar.
 * Provides a method to post assigned escorts to the host account calendar.
 */

/**
 * Posts all assignments with status "Assigned" to the configured calendar.
 * Creates the calendar if it does not exist and records the event ID in
 * the "Calendar Event ID" column when available.
 * @return {void}
 */
function postAssignmentsToCalendar() {
  try {
    const calendar =
      CalendarApp.getCalendarsByName(CONFIG.system.calendarName)[0] ||
      CalendarApp.createCalendar(CONFIG.system.calendarName);

    const assignmentsData = getAssignmentsData();
    const map = assignmentsData.columnMap;
    const sheet = assignmentsData.sheet;

    // Build a map of request IDs to assigned rider names for quick lookup
    const ridersByRequest = {};
    assignmentsData.data.forEach(row => {
      const status = getColumnValue(row, map, CONFIG.columns.assignments.status);
      if (status !== 'Assigned') return;

      const reqId = getColumnValue(row, map, CONFIG.columns.assignments.requestId);
      const rider = getColumnValue(row, map, CONFIG.columns.assignments.riderName);
      if (!reqId || !rider) return;

      if (!ridersByRequest[reqId]) ridersByRequest[reqId] = [];
      ridersByRequest[reqId].push(rider);
    });

    assignmentsData.data.forEach((row, index) => {
      const status = getColumnValue(row, map, CONFIG.columns.assignments.status);
      if (status !== 'Assigned') return;

      const requestId = getColumnValue(row, map, CONFIG.columns.assignments.requestId);
      const eventDate = getColumnValue(row, map, CONFIG.columns.assignments.eventDate);
      const startTime = getColumnValue(row, map, CONFIG.columns.assignments.startTime);
      const endTime = getColumnValue(row, map, CONFIG.columns.assignments.endTime);

      const riderName = getColumnValue(row, map, CONFIG.columns.assignments.riderName);
      const startLoc = getColumnValue(row, map, CONFIG.columns.assignments.startLocation);
      const endLoc = getColumnValue(row, map, CONFIG.columns.assignments.endLocation);

      const title = `${riderName} escort`;

      let description = `From ${startLoc || 'N/A'} to ${endLoc || 'N/A'}`;

      if (requestId) {
        const requestDetails = getRequestDetails(requestId);
        if (requestDetails) {
          description += `\nRequest ID: ${requestDetails.id}`;
          if (requestDetails.requesterName) {
            description += `\nRequester: ${requestDetails.requesterName}`;
          }
          if (requestDetails.type) {
            description += `\nType: ${requestDetails.type}`;
          }
          if (requestDetails.notes) {
            description += `\nNotes: ${requestDetails.notes}`;
          }
        }

        const riders = ridersByRequest[requestId];
        if (riders && riders.length > 0) {
          description += `\nAssigned Riders: ${riders.join(', ')}`;
        }
      }
      const startDate = new Date(`${eventDate} ${startTime}`);
      const endDate = endTime ? new Date(`${eventDate} ${endTime}`) : null;

      const idCol = map[CONFIG.columns.assignments.calendarEventId];
      const existingEventId = idCol !== undefined ? getColumnValue(row, map, CONFIG.columns.assignments.calendarEventId) : null;
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
        event.setDescription(description);
        event.setTime(startDate, endDate || startDate);
      } else {
        event = calendar.createEvent(title, startDate, endDate || startDate, { description });
      }

      if (idCol !== undefined) {
        const rowIndex = index + 2; // data array is zero-based and skips header
        sheet.getRange(rowIndex, idCol + 1).setValue(event.getId());
      }
    });
  } catch (error) {
    logError('Error posting assignments to calendar', error);
  }
}

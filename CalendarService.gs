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

    assignmentsData.data.forEach((row, index) => {
      const status = getColumnValue(row, map, CONFIG.columns.assignments.status);
      if (status !== 'Assigned') return;

      const eventDate = getColumnValue(row, map, CONFIG.columns.assignments.eventDate);
      const startTime = getColumnValue(row, map, CONFIG.columns.assignments.startTime);
      const endTime = getColumnValue(row, map, CONFIG.columns.assignments.endTime);

      const riderName = getColumnValue(row, map, CONFIG.columns.assignments.riderName);
      const startLoc = getColumnValue(row, map, CONFIG.columns.assignments.startLocation);
      const endLoc = getColumnValue(row, map, CONFIG.columns.assignments.endLocation);

      const title = `${riderName} escort`;
      const description = `From ${startLoc || 'N/A'} to ${endLoc || 'N/A'}`;
      const startDate = new Date(`${eventDate} ${startTime}`);
      const endDate = endTime ? new Date(`${eventDate} ${endTime}`) : null;

      const event = calendar.createEvent(title, startDate, endDate || startDate, { description });

      const idCol = map[CONFIG.columns.assignments.calendarEventId];
      if (idCol !== undefined) {
        const rowIndex = index + 2; // data array is zero-based and skips header
        sheet.getRange(rowIndex, idCol + 1).setValue(event.getId());
      }
    });
  } catch (error) {
    logError('Error posting assignments to calendar', error);
  }
}

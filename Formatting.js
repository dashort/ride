function formatTimeForDisplay(timeValue) {
  if (!timeValue) return '';

  try {
    let date;
    if (typeof timeValue === 'string' && (timeValue.includes('AM') || timeValue.includes('PM'))) {
        return timeValue; // Already formatted
    } else if (typeof timeValue === 'string' && (timeValue.includes('T') || timeValue.includes('Z'))) {
        // ISO string
        date = new Date(timeValue);
    } else if (timeValue instanceof Date) {
        date = timeValue;
    } else if (typeof timeValue === 'number' && timeValue >= 0 && timeValue < 1) {
        // Excel time serial number (fraction of a day)
        date = new Date(1899, 11, 30, 0, 0, 0, timeValue * 24 * 60 * 60 * 1000);
    } else if (typeof timeValue === 'string' && /^\d{1,2}:\d{2}(:\d{2})?(\s(AM|PM))?$/i.test(timeValue.trim())) {
        // "HH:MM:SS" or "HH:MM" format
        const [hours, minutes] = timeValue.split(':').map(Number);
        date = new Date(); // Use current date, just for time conversion
        date.setHours(hours, minutes, 0, 0);
    } else {
        date = new Date(timeValue);
    }

    if (isNaN(date.getTime())) {
        return String(timeValue);
    }

    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

  } catch (error) {
    logError('Error formatting time for display.', error, `Input: ${timeValue}`);
    return String(timeValue);
  }
}

/**
 * Format date for display manually in "MM/DD/YYYY" format.
 * This is a workaround because Utilities.formatDate might cause timezone-related issues
 * if script/sheet timezones are not carefully managed.
 * Returns an empty string if not a valid Date object or if it's the 1970 epoch date.
 *
 * @param {Date} date The date object to format.
 * @returns {string} The formatted date string or empty string.
 */
function formatDate(date) {
  if (!date || !(date instanceof Date)) {
    return '';
  }

  const inputYear = date.getFullYear();
  const inputMonth = date.getMonth();
  const inputDay = date.getDate();
  const inputHours = date.getHours();
  const inputMinutes = date.getMinutes();
  const inputSeconds = date.getSeconds();

  const isEpoch1970Zero = (inputYear === 1970 && inputMonth === 0 && inputDay === 1 && inputHours === 0 && inputMinutes === 0 && inputSeconds === 0);
  const isEpoch1899 = (inputYear === 1899 && inputMonth === 11 && inputDay === 30); // Dec 30, 1899 is Excel's 0 date

  if (isEpoch1970Zero || (isEpoch1899 && inputHours === 0 && inputMinutes === 0 && inputSeconds === 0)) {
    return ''; // Treat these specific epoch dates as empty for display
  }

  let month = date.getMonth() + 1;
  let day = date.getDate();
  let year = date.getFullYear();

  if (isNaN(month) || isNaN(day) || isNaN(year)) {
    return '';
  }

  month = month < 10 ? '0' + month : month;
  day = day < 10 ? '0' + day : day;

  return `${month}/${day}/${year}`;
}

/**
 * Format time for display manually in "h:mm A" format.
 *
 * @param {Date} time The date object representing a time.
 * @returns {string} The formatted time string or empty string.
 */
function formatTime(time) {
  if (!time || !(time instanceof Date)) {
    return '';
  }

  const inputYear = time.getFullYear();
  const inputMonth = time.getMonth();
  const inputDay = time.getDate();

  const isEpoch1899 = (inputYear === 1899 && inputMonth === 11 && inputDay === 30);
  const isEpoch1970 = (inputYear === 1970 && inputMonth === 0 && inputDay === 1);

  if ((isEpoch1970 || isEpoch1899) && time.getHours() === 0 && time.getMinutes() === 0 && time.getSeconds() === 0) {
    return '';
  }

  let hours = time.getHours();
  let minutes = time.getMinutes();

  if (isNaN(hours) || isNaN(minutes)) {
    return '';
  }

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // The hour '0' (midnight) should be '12'
  minutes = minutes < 10 ? '0' + minutes : minutes;

  return hours + ':' + minutes + ' ' + ampm;
}
function formatDateForDisplay(dateValue) {
  if (!dateValue) return '';

  try {
    let date;
    if (typeof dateValue === 'string' && (dateValue.includes('T') || dateValue.includes('Z'))) {
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'number') {
      date = new Date((dateValue - 25569) * 86400 * 1000);
    } else {
      date = new Date(dateValue);
    }

    if (isNaN(date.getTime())) {
      return String(dateValue);
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

  } catch (error) {
    logError('Error formatting date for display.', error, `Input: ${dateValue}`);
    return String(dateValue);
  }
}

function formatDateTimeForDisplay(dateTimeValue) {
  if (!dateTimeValue) return '';

  try {
    let date;
    if (typeof dateTimeValue === 'string' && (dateTimeValue.includes('T') || dateTimeValue.includes('Z'))) {
      date = new Date(dateTimeValue);
    } else if (dateTimeValue instanceof Date) {
      date = dateTimeValue;
    } else if (typeof dateTimeValue === 'number') {
      // Assuming Excel serial number for a full date-time
      date = new Date((dateTimeValue - 25569) * 86400 * 1000);
    } else {
      date = new Date(dateTimeValue);
    }

    if (isNaN(date.getTime())) {
      return String(dateTimeValue); // Return original if invalid date
    }

    // Use toLocaleString for comprehensive formatting including date and time
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

  } catch (error) {
    logError('Error formatting datetime.', error, `Input: ${dateTimeValue}`);
    return String(dateTimeValue);
  }
}

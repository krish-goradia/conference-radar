// Timezone utilities - Dynamic based on server timezone

/**
 * Get the server's timezone offset from UTC
 * This is determined by the server running the scraper
 * @returns {number} Offset in hours (e.g., 5.5 for IST)
 */
function getServerTimezoneOffset() {
  // Get the offset in minutes, convert to hours
  const offsetMinutes = new Date().getTimezoneOffset();
  const offsetHours = -offsetMinutes / 60;
  return offsetHours;
}

/**
 * Convert UTC datetime back to server's original timezone
 * @param {string | Date} utcDate - UTC date string or Date object from database
 * @returns {Date} Date object in server's timezone
 */
export function convertUTCToServerTimezone(utcDate) {
  if (!utcDate) return null;
  
  const date = new Date(utcDate);
  const serverOffset = getServerTimezoneOffset();
  
  // Get UTC time in milliseconds
  const utcTime = date.getTime();
  
  // Convert to server timezone in milliseconds
  const serverOffsetMs = serverOffset * 60 * 60 * 1000;
  
  // Create server timezone date
  const serverDate = new Date(utcTime + serverOffsetMs);
  
  return serverDate;
}

/**
 * Format date in server's timezone
 * @param {string | Date} utcDate - UTC date string or Date object
 * @returns {string} Formatted date string in server timezone
 */
export function formatDateInServerTimezone(utcDate) {
  if (!utcDate) return 'N/A';
  
  const serverDate = convertUTCToServerTimezone(utcDate);
  
  return serverDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get days remaining until deadline (in server timezone)
 * @param {string | Date} utcDeadline - UTC deadline date
 * @returns {number | null} Number of days remaining
 */
export function daysUntilDeadlineServerTZ(utcDeadline) {
  if (!utcDeadline) return null;
  
  const serverDate = convertUTCToServerTimezone(utcDeadline);
  const now = new Date();
  
  // Days calculation
  const days = Math.ceil(
    (serverDate - now) / (1000 * 60 * 60 * 24)
  );
  
  return days;
}

/**
 * Server time utilities
 * All time-based operations use server time, not client time
 * Daily reset occurs at 02:00 server time
 */

/**
 * Get the current server day (Date object)
 * Day resets at 02:00 server time
 */
export function getServerDay(): Date {
  const now = new Date();
  const hour = now.getHours();
  
  // If before 02:00, consider it the previous day
  if (hour < 2) {
    const prevDay = new Date(now);
    prevDay.setDate(prevDay.getDate() - 1);
    prevDay.setHours(2, 0, 0, 0);
    return prevDay;
  }
  
  // Otherwise, current day starting at 02:00
  const currentDay = new Date(now);
  currentDay.setHours(2, 0, 0, 0);
  return currentDay;
}

/**
 * Get the start of the current hour (for hourly limits)
 */
export function getCurrentHour(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
}

/**
 * Get the next server day (for reset times)
 */
export function getNextServerDay(): Date {
  const now = new Date();
  const nextDay = new Date(now);
  
  if (now.getHours() < 2) {
    // Reset is today at 02:00
    nextDay.setHours(2, 0, 0, 0);
  } else {
    // Reset is tomorrow at 02:00
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(2, 0, 0, 0);
  }
  
  return nextDay;
}

/**
 * Check if a date is within the current server day
 */
export function isWithinServerDay(date: Date): boolean {
  const serverDay = getServerDay();
  const nextDay = getNextServerDay();
  return date >= serverDay && date < nextDay;
}

/**
 * Check if a Date object represents the current server day
 */
export function isCurrentServerDay(date: Date): boolean {
  const serverDay = getServerDay();
  return date.getTime() === serverDay.getTime();
}


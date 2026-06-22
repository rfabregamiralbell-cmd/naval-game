/**
 * Formats a duration in milliseconds into a user-friendly Spanish/Clash-like string.
 * 
 * Examples:
 * - 45000 ms -> "45s"
 * - 720000 ms -> "12 min"
 * - 12000000 ms -> "3 h 20 min"
 * - 187200000 ms -> "2 d 4 h"
 * 
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export function formatDuration(ms) {
  if (ms < 0) ms = 0;
  
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec}s`;
  }
  
  const totalMin = Math.floor(totalSec / 60);
  if (totalMin < 60) {
    const remainingSec = totalSec % 60;
    return remainingSec > 0 ? `${totalMin} min ${remainingSec}s` : `${totalMin} min`;
  }
  
  const totalHours = Math.floor(totalMin / 60);
  if (totalHours < 24) {
    const remainingMin = totalMin % 60;
    return remainingMin > 0 ? `${totalHours} h ${remainingMin} min` : `${totalHours} h`;
  }
  
  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  return remainingHours > 0 ? `${days} d ${remainingHours} h` : `${days} d`;
}

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to format date in local timezone (YYYY-MM-DD)
export const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Utility function to format date string in local timezone (YYYY-MM-DD)
export const formatDateStringLocal = (dateString: string): string => {
  if (!dateString) return '';
  return formatDateLocal(new Date(dateString));
};

// Utility function to format time display for UI
// Shows 24:00 instead of 00:00 for better UX
export const formatTimeDisplay = (timeString: string): string => {
  if (!timeString) return '';
  
  // If time is 00:00, display as 24:00 for better UX
  if (timeString === '00:00') {
    return '24:00';
  }
  
  return timeString;
};

export function getWeekRangeFromDateUTC(base: Date) {
  if (import.meta.env.DEV) {
    console.debug("[utils] getWeekRangeFromDateUTC: input (local)", base, base.toString());
  }
  const utc = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate()));
  const day = utc.getUTCDay();
  const daysSinceThursday = (day + 3) % 7;

  const startOfWeek = new Date(utc);
  startOfWeek.setUTCDate(utc.getUTCDate() - daysSinceThursday);
  startOfWeek.setUTCHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
  endOfWeek.setUTCHours(23, 59, 59, 999);

  if (import.meta.env.DEV) {
    console.debug("[utils] getWeekRangeFromDateUTC: utc", utc.toISOString(), "day", day, "offset", daysSinceThursday);
    console.debug("[utils] getWeekRangeFromDateUTC: start", startOfWeek.toISOString(), "end", endOfWeek.toISOString());
  }
  return { startOfWeek, endOfWeek };
}

export function formatDateUTC(d: Date) {
  const out = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  if (import.meta.env.DEV) {
    console.debug("[utils] formatDateUTC:", d.toString(), "->", out);
  }
  return out;
}


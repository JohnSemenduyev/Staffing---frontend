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
  
  // Handle UTC dates properly - treat as local date
  if (dateString.includes('T') && dateString.includes('Z')) {
    // This is a UTC date, extract just the date part without timezone conversion
    return dateString.split('T')[0];
  }
  
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

export function getWeekRangeFromDateLocal(base: Date) {

  const day = base.getDay();
  const daysSinceThursday = (day + 3) % 7; // Thu..Wed week
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysSinceThursday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  end.setHours(23, 59, 59, 999);
  return { startOfWeek: start, endOfWeek: end };
}

export const getWeekRangeFromDateUTC = getWeekRangeFromDateLocal; 

export function toLocalYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function parseLocalYMD(ymd: string) {
  const [y,m,d] = ymd.split('-').map(Number);
  return new Date(y, (m ?? 1)-1, d ?? 1, 0, 0, 0, 0);
}

export function stripTime(input: string) {
  if (!input) return input;
  const firstPart = input.split('T')[0];
  return firstPart.split(' ')[0]; // handles "YYYY-MM-DD HH:mm"
}


// Formats US phone numbers to (XXX) XXX-XXXX.
// Leaves the original value if it cannot be formatted cleanly.
export function formatUSPhone(value?: string | null): string {
  if (!value) return "";
  const digits = String(value).replace(/\D+/g, "");
  let d = digits;

  // Handle leading country code
  if (d.length === 11 && d.startsWith("1")) {
    d = d.slice(1);
  }

  if (d.length !== 10) {
    return value;
  }

  const area = d.slice(0, 3);
  const prefix = d.slice(3, 6);
  const line = d.slice(6);
  return `(${area}) ${prefix}-${line}`;
}


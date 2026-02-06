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

export function getWeekRangeFromDateLocal(base: any) {
  base = new Date(base);
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseLocalYMD(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
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

// --- Time Manipulation Utils (Consolidated) ---

export const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

export const minutesDiffWithWrap = (start: string, end: string): number => {
  const startM = timeToMinutes(start);
  const endM = timeToMinutes(end);

  if (startM === endM) {
    return 24 * 60; // Treat equal as 24h
  }

  let diff = endM - startM;
  if (diff <= 0) diff += 24 * 60;
  return diff;
};

export const calculateHours = (start: string, end: string): number => {
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  if (startH === endH && startM === endM) {
    return 24.0;
  }

  let hours = endH - startH + (endM - startM) / 60;
  if (hours < 0) hours += 24;
  return parseFloat(hours.toFixed(2));
};

export const shiftSpansNextDay = (startTime: string, endTime: string): boolean => {
  if (!startTime || !endTime) return false;
  console.log("startTime", startTime);
  console.log("endTime", endTime);
  if((startTime === '24:00' && endTime === '24:00')||(startTime === '00:00' && endTime === '00:00') || (startTime === '24:00' && endTime === '00:00') || (startTime === '00:00' && endTime === '24:00')) return false;
  if (startTime === endTime) return true; // Full day
  return timeToMinutes(endTime) <= timeToMinutes(startTime);
};

export const getAdjustedDate = (dateStr: string, offset: number): string => {
  if (!dateStr) return dateStr;
  const baseDate = parseLocalYMD(dateStr);
  if (!baseDate || Number.isNaN(baseDate.getTime())) return dateStr;
  baseDate.setDate(baseDate.getDate() + offset);
  return formatDateLocal(baseDate);
};

export const doTimesOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
  const toRanges = (s: string, e: string): Array<[number, number]> => {
    const ss = timeToMinutes(s);
    const ee = timeToMinutes(e);
    // Simple rule: if start >= end, end is in next day
    if (ss >= ee) {
      // Overnight shift: [start, 24*60] and [0, end] (if end is 0, it covers nothing of next day start?)
      // Correction: [0, ee]
      return [[ss, 24 * 60], [0, ee]];
    }
    // Same day shift: [start, end]
    return [[ss, ee]];
  };

  // Special case: 24:00 (end of day) should not overlap with 00:00 (start of next day)
  if (end1 === '24:00' && start2 === '00:00') return false;
  if (end2 === '24:00' && start1 === '00:00') return false;

  const ranges1 = toRanges(start1, end1);
  const ranges2 = toRanges(start2, end2);

  for (const a of ranges1) {
    for (const b of ranges2) {
      const aStart = a[0], aEnd = a[1];
      const bStart = b[0], bEnd = b[1];

      // Special handling for boundary conditions
      if ((aEnd === 24 * 60 && end1 === '24:00' && bStart === 0 && start2 === '00:00') ||
        (bEnd === 24 * 60 && end2 === '24:00' && aStart === 0 && start1 === '00:00')) {
        continue;
      }

      const overlapStart = Math.max(aStart, bStart);
      const overlapEnd = Math.min(aEnd, bEnd);

      if (overlapStart < overlapEnd) {
        const overlapMinutes = overlapEnd - overlapStart;
        if (overlapMinutes > 1) return true;
      }
    }
  }
  return false;
};

export const addressTwoLines = (address?: string) => {
  if (!address) return { line1: "", line2: "" };

  const parts = address.split(",").map(p => p.trim()).filter(Boolean);

  // If we have at least 3 parts, break after the 2nd
  if (parts.length >= 3) {
    return {
      line1: `${parts[0]}, ${parts[1]},`,
      line2: parts.slice(2).join(", "),
    };
  }

  // Fallback: no split or only one comma
  return { line1: address, line2: "" };
};

export const formatDateFromISO = (dateStr: string) => {
  if (!dateStr) return dateStr;
  return dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
};

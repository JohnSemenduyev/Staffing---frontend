import { ScheduleItem, Shift, WeekRange, DateColumn, FormData } from './types';
import { formatDateLocal } from "../../../lib/utils";

export const inputClasses = `
  w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition
`;

export const getWeekRangeFromDateUTC = (baseDate: Date): WeekRange => {
  const day = baseDate.getDay();
  const daysSinceThursday = (day + 3) % 7;

  const startOfWeek = new Date(baseDate);
  startOfWeek.setDate(baseDate.getDate() - daysSinceThursday);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return {
    startOfWeek,
    endOfWeek
  };
};

export const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

export const minutesDiffWithWrap = (start: string, end: string): number => {
  const startM = timeToMinutes(start);
  const endM = timeToMinutes(end);
  let diff = endM - startM;
  if (diff <= 0) diff += 24 * 60;
  return diff;
};

export const doTimesOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
  const toRanges = (s: string, e: string): Array<[number, number]> => {
    const ss = timeToMinutes(s);
    const ee = timeToMinutes(e);
    if (ss === ee) return [[0, 24 * 60]]; // full day
    if (ee > ss) return [[ss, ee]];
    return [[ss, 24 * 60], [0, ee]]; // overnight
  };

  const ranges1 = toRanges(start1, end1);
  const ranges2 = toRanges(start2, end2);

  // Overlap if there's not at least a 1-minute gap between any pair
  for (const a of ranges1) {
    for (const b of ranges2) {
      const aStart = a[0], aEnd = a[1];
      const bStart = b[0], bEnd = b[1];
      const hasRequiredGap = (aEnd + 1 <= bStart) || (bEnd + 1 <= aStart);
      if (!hasRequiredGap) return true;
    }
  }
  return false;
};

export const sortShiftsByTime = (shifts: Shift[]): Shift[] => {
  return [...shifts].sort((a, b) => {
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });
};

export const getMaxShiftsPerDay = (userId: number, scheduleData: ScheduleItem[]): number => {
  const userDays = scheduleData.filter(i => i.userId === userId);
  let max = 1;
  for (const d of userDays) max = Math.max(max, d.shifts.length);
  return max;
};

export const userHasMultiShiftDay = (userId: number, scheduleData: ScheduleItem[]): boolean => {
  const userSchedules = scheduleData.filter(item => item.userId === userId);

  // Group shifts by date to check if any date has multiple shifts
  const shiftsByDate = new Map<string, Shift[]>();

  userSchedules.forEach(schedule => {
    schedule.shifts.forEach(shift => {
      const date = shift.date;
      if (!shiftsByDate.has(date)) {
        shiftsByDate.set(date, []);
      }
      shiftsByDate.get(date)!.push(shift);
    });
  });

  // Check if any date has multiple shifts
  for (const [date, shifts] of shiftsByDate) {
    if (shifts.length > 1) {
      return true; // User has multiple shifts on at least one day
    }
  }

  return false; // User has at most one shift per day
};

export const getUniqueShiftTimes = (userId: number, scheduleData: ScheduleItem[]): { startTime: string; endTime: string }[] => {
  const userSchedules = scheduleData.filter(item => item.userId === userId);
  const uniqueTimes = new Set<string>();
  const shiftTimes: { startTime: string; endTime: string }[] = [];

  userSchedules.forEach(schedule => {
    schedule.shifts.forEach(shift => {
      const timeKey = `${shift.startTime}-${shift.endTime}`;
      if (!uniqueTimes.has(timeKey)) {
        uniqueTimes.add(timeKey);
        shiftTimes.push({
          startTime: shift.startTime,
          endTime: shift.endTime
        });
      }
    });
  });

  return shiftTimes;
};

export const getShiftForUserDateAndTime = (userId: number, date: string, startTime: string, endTime: string, scheduleData: ScheduleItem[]): Shift | null => {
  const daySchedules = scheduleData.filter(item =>
    item.userId === userId && item.startDate === date
  );

  for (const schedule of daySchedules) {
    const shift = schedule.shifts.find(s =>
      s.startTime === startTime && s.endTime === endTime
    );
    if (shift) return shift;
  }
  return null;
};

export const calculateShiftTimeTotal = (userId: number, startTime: string, endTime: string, scheduleData: ScheduleItem[], dateColumns: DateColumn[]): number => {
  let total = 0;
  dateColumns.forEach(dateCol => {
    const shift = getShiftForUserDateAndTime(userId, dateCol.date, startTime, endTime, scheduleData);
    if (shift) {
      total += shift.hours;
    }
  });
  return parseFloat(total.toFixed(2));
};

// Utility function to convert date from YYYY-MM-DD to MM-DD-YYYY
export const convertDateFormat = (dateStr: string): string => {
  // Handle ISO date strings (e.g., "2025-08-21T00:00:00.000Z")
  if (dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0];
  }
  
  // Handle date strings with timezone info (e.g., "08-21T00:00:00.000Z-2025")
  if (dateStr.includes('T') && dateStr.includes('-2025')) {
    const parts = dateStr.split('-');
    const month = parts[0];
    const day = parts[1].split('T')[0];
    const year = parts[parts.length - 1];
    return `${month}-${day}-${year}`;
  }
  
  // Handle standard YYYY-MM-DD format
  const [year, month, day] = dateStr.split('-');
  return `${month}-${day}-${year}`;
};

// Utility function to convert timestamp to YYYY-MM-DD format
export const convertTimestampToDate = (timestamp: string): string => {
  const date = new Date(parseInt(timestamp));
  return formatDateLocal(date);
};

// Form validation function
export const validateForm = (formData: FormData, scheduleData: ScheduleItem[], editingShiftId?: number): { [key: string]: string } => {
  const e: { [key: string]: string } = {};
  if (!formData.userId) e.userId = "Required";
  if (!formData.date) e.date = "Required";
  if (!formData.starttime) e.starttime = "Required";
  if (!formData.endtime) e.endtime = "Required";

  // Minimum duration: end must be at least 1 minute after start
  if (formData.starttime && formData.endtime) {
    const minutes = minutesDiffWithWrap(formData.starttime, formData.endtime);
    if (minutes < 1) {
      e.endtime = "End time must be at least 1 minute after start time";
    }
  }

  // Check for overlapping shifts
  if (formData.userId && formData.date && formData.starttime && formData.endtime) {
    console.log("existing data", scheduleData);
    const existingShifts = scheduleData
      .filter(item => item.userId === Number(formData.userId) && item.startDate === formData.date)
      .flatMap(item => item.shifts);

    for (const shift of existingShifts) {
      if (shift.id === editingShiftId) continue; // Skip current shift when editing

      if (doTimesOverlap(formData.starttime, formData.endtime, shift.startTime, shift.endTime)) {
        e.overlap = "Shift time overlaps with existing shift for this user and date";
        break;
      }
    }
  }
  return e;
};

export const calculateHours = (start: string, end: string): number => {
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  let hours = endH - startH + (endM - startM) / 60;
  if (hours <= 0) hours += 24; // equal times => 24h, overnight => +24
  return parseFloat(hours.toFixed(2));
};

export const generateDateColumns = (currentWeekRange: WeekRange | null): DateColumn[] => {
  if (!currentWeekRange) return [];

  const dates: DateColumn[] = [];
  const startDate = new Date(currentWeekRange.startOfWeek);

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    // No timezone conversion, use local date parts
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    dates.push({
      date: dateStr,
      display: `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`
    });
  }
  return dates;
};

export const getUniqueUsers = (scheduleData: ScheduleItem[]): { id: number; name: string; phone: string }[] => {
  const userMap = new Map();
  scheduleData.forEach(item => {
    if (!userMap.has(item.userId)) {
      userMap.set(item.userId, {
        id: item.userId,
        name: item.userName,
        phone: item.userPhone
      });
    }
  });
  return Array.from(userMap.values());
};

export const calculateDayTotal = (date: string, scheduleData: ScheduleItem[]): number => {
  const total = scheduleData
    .filter(item => item.startDate === date)
    .reduce((total, item) => total + item.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0);
  return parseFloat(total.toFixed(2));
};

export const calculateUserTotal = (userId: number, scheduleData: ScheduleItem[]): number => {
  const total = scheduleData
    .filter(item => item.userId === userId)
    .reduce((total, item) => total + item.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0);
  return parseFloat(total.toFixed(2));
};

export const calculateGrandTotal = (scheduleData: ScheduleItem[]): number => {
  const total = scheduleData.reduce((total, item) => total + item.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0);
  return parseFloat(total.toFixed(2));
};

export const formatDateForAPI = (date: Date): string => {
  return formatDateLocal(date);
};

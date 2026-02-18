import { WeekRange, DateColumn, FormData } from './types';
// Ideally, this file should also use shared types
import { Shift as SharedShift, ScheduleItem as SharedScheduleItem } from "../../../types/schedule";
import {
  formatDateLocal,
  parseLocalYMD,
  getWeekRangeFromDateLocal,
  timeToMinutes as sharedTimeToMinutes,
  shiftSpansNextDay as sharedShiftSpansNextDay,
  getAdjustedDate as sharedGetAdjustedDate,
  minutesDiffWithWrap as sharedMinutesDiffWithWrap,
  doTimesOverlap as sharedDoTimesOverlap,
  calculateHours as sharedCalculateHours
} from "../../../lib/utils";


export const getWeekRangeFromDateUTC = getWeekRangeFromDateLocal;

export const timeToMinutes = sharedTimeToMinutes;

// Check if a shift spans into the next day (crosses midnight)
// Simple rule: if startTime >= endTime, it means endTime is in the next day
export const shiftSpansNextDay = sharedShiftSpansNextDay;

// Get date string offset by N days
export const getAdjustedDate = sharedGetAdjustedDate;

export const minutesDiffWithWrap = sharedMinutesDiffWithWrap;

export const doTimesOverlap = sharedDoTimesOverlap;

/** Calendar-aware overlap for shifts (overnight split by date so 04:00-06:00 does not overlap 23:00-14:00 on same calendar day). */
export const shiftsOverlapInCalendar = (
  date1: string,
  start1: string,
  end1: string,
  date2: string,
  start2: string,
  end2: string
): boolean => {
  const norm = (d: string) => (d.includes("T") ? d.split("T")[0] : d);
  const d1 = norm(date1);
  const d2 = norm(date2);

  const segs = (d: string, s: string, e: string): Array<{ date: string; startM: number; endM: number }> => {
    const startM = sharedTimeToMinutes(s);
    const endM = sharedTimeToMinutes(e);
    if (startM > endM) {
      return [
        { date: d, startM, endM: 24 * 60 },
        { date: getAdjustedDate(d, 1), startM: 0, endM },
      ];
    }
    return [{ date: d, startM, endM }];
  };

  const segs1 = segs(d1, start1, end1);
  const segs2 = segs(d2, start2, end2);

  for (const a of segs1) {
    for (const b of segs2) {
      if (a.date !== b.date) continue;
      if (a.startM < b.endM && b.startM < a.endM) return true;
    }
  }
  return false;
};

export const isOverflowShift = (shiftDate: string, weekStartDate: string | Date): boolean => {
  if (!shiftDate || !weekStartDate) return false;
  // Compare as YYYY-MM-DD strings to avoid timezone bugs: new Date("YYYY-MM-DD") is UTC midnight,
  // which can become the previous local day in western timezones and wrongly mark first-column shifts as overflow.
  const normShiftDate = shiftDate.includes("T") ? shiftDate.split("T")[0] : shiftDate;
  const normWeekStart =
    typeof weekStartDate === "string"
      ? (weekStartDate.includes("T") ? weekStartDate.split("T")[0] : weekStartDate)
      : formatDateLocal(weekStartDate);
  return normShiftDate < normWeekStart;
};

export const sortShiftsByTime = (shifts: SharedShift[]): SharedShift[] => {
  return [...shifts].sort((a, b) => {
    return sharedTimeToMinutes(a.startTime) - sharedTimeToMinutes(b.startTime);
  });
};

export const getMaxShiftsPerDay = (userId: number, scheduleData: SharedScheduleItem[]): number => {
  const userDays = scheduleData.filter(i => i.userId === userId);
  let max = 1;
  for (const d of userDays) max = Math.max(max, d.shifts.length);
  return max;
};

export const userHasMultiShiftDay = (userId: number, scheduleData: SharedScheduleItem[]): boolean => {
  const userSchedules = scheduleData.filter(item => item.userId === userId);

  // Group shifts by date to check if any date has multiple shifts
  const shiftsByDate = new Map<string, SharedShift[]>();

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

export const getUniqueShiftTimes = (userId: number, scheduleData: SharedScheduleItem[]): { startTime: string; endTime: string }[] => {
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

export const getShiftForUserDateAndTime = (userId: number, date: string, startTime: string, endTime: string, scheduleData: SharedScheduleItem[]): SharedShift | null => {
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

export const calculateShiftTimeTotal = (userId: number, startTime: string, endTime: string, scheduleData: SharedScheduleItem[], dateColumns: DateColumn[]): number => {
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
export const validateForm = (
  formData: FormData,
  scheduleData: SharedScheduleItem[],
  editingShiftId?: number,
  apiExistingShifts?: Map<string, any[]>
): { [key: string]: string } => {
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

  // Check for overlapping shifts (both local and API data)
  if (formData.userId && formData.date && formData.starttime && formData.endtime) {
    console.log("[Overlap] validateForm – checking overlaps", {
      userId: formData.userId,
      date: formData.date,
      newTimes: `${formData.starttime}-${formData.endtime}`,
      editingShiftId,
      existingShiftsCount: scheduleData.filter(
        (item) => item.userId === Number(formData.userId) && item.startDate === formData.date
      ).flatMap((item) => item.shifts).length,
    });

    // Check local schedule data overlaps - current day (exclude visually deleted shifts)
    const existingShifts = scheduleData
      .filter(item => item.userId === Number(formData.userId) && item.startDate === formData.date)
      .flatMap(item => item.shifts)
      .filter(shift => !(shift as any).isDelete);

    for (const shift of existingShifts) {
      if (shift.id === editingShiftId) {
        console.log("[Overlap] validateForm – skipping current shift (editing)", { shiftId: shift.id });
        continue; // Skip current shift when editing
      }

      if (shiftsOverlapInCalendar(formData.date, formData.starttime, formData.endtime, formData.date, shift.startTime, shift.endTime)) {
        console.log("[Overlap] validateForm – overlap detected (same day)", {
          date: formData.date,
          newShift: `${formData.starttime}-${formData.endtime}`,
          existingShift: `${shift.startTime}-${shift.endTime}`,
          shiftId: shift.id,
        });
        e.overlap = "Shift time overlaps with existing shift for this user and date";
        break;
      }
    }

    // Always check previous day shifts (they may span into current day)
    // Use calendar-aware overlap to only compare segments that actually fall on the same calendar day.
    if (!e.overlap) {
      const prevDate = getAdjustedDate(formData.date, -1);
      const prevDayShifts = scheduleData
        .filter(item => item.userId === Number(formData.userId) && item.startDate === prevDate)
        .flatMap(item => item.shifts)
        .filter(shift =>
          shiftSpansNextDay(shift.startTime, shift.endTime) && !(shift as any).isDelete
        ); // Only check non-deleted shifts that span into current day

      for (const shift of prevDayShifts) {
        if (shiftsOverlapInCalendar(
          formData.date,
          formData.starttime,
          formData.endtime,
          prevDate,
          shift.startTime,
          shift.endTime
        )) {
          console.log("[Overlap] validateForm – overlap detected (previous day)", {
            currentDate: formData.date,
            previousDate: prevDate,
            newShift: `${formData.starttime}-${formData.endtime}`,
            existingShift: `${shift.startTime}-${shift.endTime}`,
            shiftId: shift.id
          });
          e.overlap = "Shift time overlaps with existing shift from previous day";
          break;
        }
      }
    }

    // Check next day shifts if current shift spans into next day
    if (!e.overlap && shiftSpansNextDay(formData.starttime, formData.endtime)) {
      const nextDate = getAdjustedDate(formData.date, 1);
      const nextDayShifts = scheduleData
        .filter(item => item.userId === Number(formData.userId) && item.startDate === nextDate)
        .flatMap(item => item.shifts)
        .filter(shift => !(shift as any).isDelete);

      for (const shift of nextDayShifts) {
        if (shiftsOverlapInCalendar(
          formData.date,
          formData.starttime,
          formData.endtime,
          nextDate,
          shift.startTime,
          shift.endTime
        )) {
          console.log("[Overlap] validateForm – overlap detected (next day)", {
            currentDate: formData.date,
            nextDate: nextDate,
            newShift: `${formData.starttime}-${formData.endtime}`,
            existingShift: `${shift.startTime}-${shift.endTime}`,
            shiftId: shift.id
          });
          e.overlap = "Shift time overlaps with existing shift on next day";
          break;
        }
      }
    }

    // Check API existing shifts overlaps if provided
    if (apiExistingShifts && !e.overlap) {
      const clientId = scheduleData.find(item => item.userId === Number(formData.userId))?.clientId;
      const addressId = scheduleData.find(item => item.userId === Number(formData.userId))?.addressId;

      if (clientId && addressId) {
        const combinationKey = `${clientId}-${addressId}-${formData.userId}`;
        const apiShifts = apiExistingShifts.get(combinationKey) || [];

        for (const apiShift of apiShifts) {
          // Check if the API shift is for the same date
          const apiShiftDate = apiShift.date.includes('T') ? apiShift.date.split('T')[0] : apiShift.date;
          if (apiShiftDate === formData.date) {
            if (shiftsOverlapInCalendar(formData.date, formData.starttime, formData.endtime, apiShiftDate, apiShift.startTime, apiShift.endTime)) {
              console.log("[Overlap] validateForm – overlap detected (API same day)", {
                date: formData.date,
                newShift: `${formData.starttime}-${formData.endtime}`,
                existingShift: `${apiShift.startTime}-${apiShift.endTime}`,
                shiftId: apiShift.id
              });
              e.overlap = "Shift time overlaps with existing shift in the system for this user and date";
              break;
            }
          }
        }

        // Always check previous day API shifts (they may span into current day)
        // Use calendar-aware overlap to only compare segments that actually fall on the same calendar day.
        if (!e.overlap) {
          const prevDate = getAdjustedDate(formData.date, -1);
          for (const apiShift of apiShifts) {
            const apiShiftDate = apiShift.date.includes('T') ? apiShift.date.split('T')[0] : apiShift.date;
            if (apiShiftDate === prevDate && shiftSpansNextDay(apiShift.startTime, apiShift.endTime)) {
              if (shiftsOverlapInCalendar(
                formData.date,
                formData.starttime,
                formData.endtime,
                apiShiftDate,
                apiShift.startTime,
                apiShift.endTime
              )) {
                console.log("[Overlap] validateForm – overlap detected (API previous day)", {
                  currentDate: formData.date,
                  previousDate: prevDate,
                  newShift: `${formData.starttime}-${formData.endtime}`,
                  existingShift: `${apiShift.startTime}-${apiShift.endTime}`,
                  shiftId: apiShift.id
                });
                e.overlap = "Shift time overlaps with existing shift in the system from previous day";
                break;
              }
            }
          }
        }

        // Check next day API shifts if current shift spans into next day
        if (!e.overlap && shiftSpansNextDay(formData.starttime, formData.endtime)) {
          const nextDate = getAdjustedDate(formData.date, 1);
          for (const apiShift of apiShifts) {
            const apiShiftDate = apiShift.date.includes('T') ? apiShift.date.split('T')[0] : apiShift.date;
            if (apiShiftDate === nextDate) {
              if (shiftsOverlapInCalendar(
                formData.date,
                formData.starttime,
                formData.endtime,
                apiShiftDate,
                apiShift.startTime,
                apiShift.endTime
              )) {
                console.log("[Overlap] validateForm – overlap detected (API next day)", {
                  currentDate: formData.date,
                  nextDate: nextDate,
                  newShift: `${formData.starttime}-${formData.endtime}`,
                  existingShift: `${apiShift.startTime}-${apiShift.endTime}`,
                  shiftId: apiShift.id
                });
                e.overlap = "Shift time overlaps with existing shift in the system on next day";
                break;
              }
            }
          }
        }
      }
    }
  }
  return e;
};

// Helper function to check overlaps with API existing shifts
export const checkApiOverlap = (
  userId: number,
  date: string,
  startTime: string,
  endTime: string,
  clientId: number,
  addressId: number,
  apiExistingShifts: Map<string, any[]>
): boolean => {
  const combinationKey = `${clientId}-${addressId}-${userId}`;
  const apiShifts = apiExistingShifts.get(combinationKey) || [];

  // Check same day shifts
  for (const apiShift of apiShifts) {
    const apiShiftDate = apiShift.date.includes('T') ? apiShift.date.split('T')[0] : apiShift.date;
    if (apiShiftDate === date) {
      if (shiftsOverlapInCalendar(date, startTime, endTime, apiShiftDate, apiShift.startTime, apiShift.endTime)) {
        return true;
      }
    }
  }

  // Always check previous day shifts (they may span into current day)
  // Shifts are treated as starting on current day, so previous day shifts might overlap
  const prevDate = getAdjustedDate(date, -1);
  const newEndCurrentDay = shiftSpansNextDay(startTime, endTime) ? "24:00" : endTime;
  for (const apiShift of apiShifts) {
    const apiShiftDate = apiShift.date.includes('T') ? apiShift.date.split('T')[0] : apiShift.date;
    if (apiShiftDate === prevDate && shiftSpansNextDay(apiShift.startTime, apiShift.endTime)) {
      if (doTimesOverlap(startTime, newEndCurrentDay, "00:00", apiShift.endTime)) {
        return true;
      }
    }
  }

  // Check next day shifts if current shift spans into next day
  if (shiftSpansNextDay(startTime, endTime)) {
    const nextDate = getAdjustedDate(date, 1);
    for (const apiShift of apiShifts) {
      const apiShiftDate = apiShift.date.includes('T') ? apiShift.date.split('T')[0] : apiShift.date;
      if (apiShiftDate === nextDate) {
        if (doTimesOverlap("00:00", endTime, apiShift.startTime, apiShift.endTime)) {
          return true;
        }
      }
    }
  }

  return false;
};

export const calculateHours = sharedCalculateHours;

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

export const getUniqueUsers = (scheduleData: SharedScheduleItem[]): { id: number; name: string; phone: string }[] => {
  const userMap = new Map();
  scheduleData.forEach(item => {
    // Ensure userId is a number
    const userId = Number(item.userId);
    if (!userMap.has(userId)) {
      userMap.set(userId, {
        id: userId,
        name: item.userName,
        phone: item.userPhone
      });
    }
  });
  return Array.from(userMap.values());
};

export const calculateDayTotal = (date: string, scheduleData: SharedScheduleItem[]): number => {
  const total = scheduleData
    .filter(item => item.startDate === date)
    .reduce((total, item) => total + item.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0);
  return parseFloat(total.toFixed(2));
};

export const calculateUserTotal = (userId: number, scheduleData: SharedScheduleItem[]): number => {
  const total = scheduleData
    .filter(item => item.userId === userId)
    .reduce((total, item) => total + item.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0);
  return parseFloat(total.toFixed(2));
};

export const calculateGrandTotal = (scheduleData: SharedScheduleItem[]): number => {
  const total = scheduleData.reduce((total, item) => total + item.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0);
  return parseFloat(total.toFixed(2));
};

export const formatDateForAPI = (date: Date): string => {
  return formatDateLocal(date);
};

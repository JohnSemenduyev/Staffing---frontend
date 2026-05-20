import { getAdjustedDate, shiftSpansNextDay, timeToMinutes, toLocalYMD } from "../lib/utils";
import type { SessionItem, Shift } from "../types/schedule";
import {
    getSessionDisplayRangeOnDate,
    getSessionHoursOnDate,
    hasNoEffectiveClockOut,
    isClockInOnlyVisibleOnDate,
    type SessionCalendarCtx,
} from "./sessionCalendar";

/** Minimal schedule row shape for export (matches ViewSchedule / print). */
export interface ActualTimeScheduleRow {
    userId: number;
    userName: string;
    startDate: string;
    shifts: {
        id: number;
        startTime: string;
        endTime: string;
        isDelete?: boolean;
    }[];
}

const normDate = (d: string) => (d && d.includes("T") ? d.split("T")[0] : d || "");

/** Match web Actual Time grid: sort by display start time, not shift id. */
function sortVisualEntriesStable(
    a: { shift: { id: number; startTime: string }; displayStart: string },
    b: { shift: { id: number; startTime: string }; displayStart: string }
): number {
    const as = a.displayStart || a.shift?.startTime || "00:00";
    const bs = b.displayStart || b.shift?.startTime || "00:00";
    const byTime = timeToMinutes(as) - timeToMinutes(bs);
    if (byTime !== 0) return byTime;
    return Number(a.shift?.id ?? 0) - Number(b.shift?.id ?? 0);
}

export function getWeekDateKeys(currentWeekRange: { startOfWeek: Date }): string[] {
    const keys: string[] = [];
    const startDate = new Date(currentWeekRange.startOfWeek);
    for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        keys.push(toLocalYMD(date));
    }
    return keys;
}

export function buildShiftByIdFromSchedule(scheduleData: ActualTimeScheduleRow[]): Map<number, Shift> {
    const shiftById = new Map<number, Shift>();
    scheduleData.forEach((si) => {
        (si.shifts || []).forEach((sh: any) => {
            if (sh?.id) shiftById.set(sh.id, sh as Shift);
        });
    });
    return shiftById;
}

export function buildSessionCalendarCtx(
    scheduleData: ActualTimeScheduleRow[],
    currentWeekRange?: { startOfWeek: Date; endOfWeek?: Date }
): SessionCalendarCtx {
    const shiftById = buildShiftByIdFromSchedule(scheduleData);
    const weekStartStr = currentWeekRange ? toLocalYMD(new Date(currentWeekRange.startOfWeek)) : "";
    return { shiftById, weekStartStr };
}

/** Users in first-occurrence order (matches Web UI / print). */
export function getUsersInScheduleOrder(scheduleData: ActualTimeScheduleRow[]): { id: number; name: string }[] {
    const uniqueUsers = new Map<number, { id: number; name: string }>();
    scheduleData.forEach((item) => {
        if (!uniqueUsers.has(item.userId)) {
            uniqueUsers.set(item.userId, { id: item.userId, name: item.userName });
        }
    });
    return Array.from(uniqueUsers.values());
}

export function getShiftsForUserDate(
    scheduleData: ActualTimeScheduleRow[],
    userId: number,
    dateStr: string
): ActualTimeScheduleRow["shifts"] {
    const shifts: ActualTimeScheduleRow["shifts"] = [];
    scheduleData.forEach((item) => {
        if (item.userId === userId && normDate(item.startDate) === dateStr) {
            (item.shifts || []).forEach((s) => shifts.push(s));
        }
    });
    return shifts;
}

export function getVisualShiftsForUserDate(
    scheduleData: ActualTimeScheduleRow[],
    userId: number,
    dateStr: string
): { shift: ActualTimeScheduleRow["shifts"][number]; isContinuation: boolean; displayStart: string; displayEnd: string }[] {
    const currentShiftsList = getShiftsForUserDate(scheduleData, userId, dateStr);
    const prevDateStr = getAdjustedDate(dateStr, -1);
    const prevShiftsList = getShiftsForUserDate(scheduleData, userId, prevDateStr);
    const currentShifts = currentShiftsList
        .filter((s: any) => !s.isDelete)
        .map((s) => ({
            shift: s,
            isContinuation: false,
            displayStart: s.startTime,
            displayEnd: s.endTime,
        }));
    const prevSpanning = prevShiftsList
        .filter((s: any) => !s.isDelete && shiftSpansNextDay(s.startTime, s.endTime))
        .map((s) => ({
            shift: s,
            isContinuation: true,
            displayStart: "00:00",
            displayEnd: s.endTime,
        }));
    const merged = [...currentShifts, ...prevSpanning].sort(sortVisualEntriesStable);
    return merged;
}

function getVisualShiftsForUserDateWithInjected(
    scheduleData: ActualTimeScheduleRow[],
    sessionData: SessionItem[],
    sessionCtx: SessionCalendarCtx,
    userId: number,
    dateStr: string
): { shift: ActualTimeScheduleRow["shifts"][number]; isContinuation: boolean; displayStart: string; displayEnd: string }[] {
    const base = getVisualShiftsForUserDate(scheduleData, userId, dateStr);
    const byShiftId = new Set(base.map((v) => v.shift.id));

    const visibleSessions = sessionData.filter((s) => {
        if (typeof s.shiftId !== "number") return false;
        const owner = scheduleData.find((r) => (r.shifts || []).some((sh) => sh.id === s.shiftId));
        if (!owner || owner.userId !== userId) return false;
        if (getSessionHoursOnDate(s, dateStr, sessionCtx) > 0) return true;
        return Boolean(
            s.clockIn?.trim() &&
                hasNoEffectiveClockOut(s) &&
                isClockInOnlyVisibleOnDate(s, dateStr, sessionCtx)
        );
    });

    const injected: { shift: ActualTimeScheduleRow["shifts"][number]; isContinuation: boolean; displayStart: string; displayEnd: string }[] = [];
    visibleSessions.forEach((s) => {
        if (typeof s.shiftId !== "number" || byShiftId.has(s.shiftId)) return;
        const sourceShift = sessionCtx.shiftById.get(s.shiftId);
        const startTime = sourceShift?.startTime || s.clockIn || "00:00";
        const endTime = sourceShift?.endTime || s.clockOut || "24:00";
        injected.push({
            shift: { id: s.shiftId, startTime, endTime, isDelete: false },
            isContinuation: false,
            displayStart: startTime,
            displayEnd: endTime,
        });
        byShiftId.add(s.shiftId);
    });

    return [...base, ...injected].sort(sortVisualEntriesStable);
}

export function getMaxShiftsPerDayForUser(
    scheduleData: ActualTimeScheduleRow[],
    userId: number,
    dateKeys: string[],
    sessionData?: SessionItem[],
    sessionCtx?: SessionCalendarCtx
): number {
    let maxShifts = 1;
    for (const dateStr of dateKeys) {
        const visual =
            sessionData && sessionCtx
                ? getVisualShiftsForUserDateWithInjected(scheduleData, sessionData, sessionCtx, userId, dateStr)
                : getVisualShiftsForUserDate(scheduleData, userId, dateStr);
        maxShifts = Math.max(maxShifts, visual.length);
    }
    return maxShifts;
}

/**
 * Label (newline-separated ranges) and hours for one grid cell — same rules as print / Actual Time table.
 */
export function getActualTimeCellContent(
    sessionData: SessionItem[],
    scheduleData: ActualTimeScheduleRow[],
    sessionCtx: SessionCalendarCtx,
    userId: number,
    dateStr: string,
    rowIdx: number
): { label: string; hours: number } {
    const visual = getVisualShiftsForUserDateWithInjected(scheduleData, sessionData, sessionCtx, userId, dateStr);
    const visualEntry = visual[rowIdx];
    if (!visualEntry) {
        return { label: "", hours: 0 };
    }

    const getSessionHoursOnDateLocal = (session: SessionItem, d: string) =>
        getSessionHoursOnDate(session, d, sessionCtx);

    const getSessionDisplayRangeOnDateLocal = (session: SessionItem, d: string) =>
        getSessionDisplayRangeOnDate(session, d, sessionCtx);

    const shiftMatchedSessions = sessionData.filter((s) => s.shiftId === visualEntry.shift.id);
    const sessionsInCell = shiftMatchedSessions.filter((s) => {
        if (s.shiftId !== visualEntry.shift.id) return false;
        if (getSessionHoursOnDateLocal(s, dateStr) > 0) return true;
        return Boolean(
            s.clockIn?.trim() &&
                hasNoEffectiveClockOut(s) &&
                isClockInOnlyVisibleOnDate(s, dateStr, sessionCtx)
        );
    });

    sessionsInCell.sort((a, b) => {
        const ra = getSessionDisplayRangeOnDateLocal(a, dateStr);
        const rb = getSessionDisplayRangeOnDateLocal(b, dateStr);
        const ta = ra ? timeToMinutes(ra.displayStart) : 0;
        const tb = rb ? timeToMinutes(rb.displayStart) : 0;
        return ta - tb;
    });

    const label = sessionsInCell
        .map((s) => {
            const range = getSessionDisplayRangeOnDateLocal(s, dateStr);
            return range ? `${range.displayStart} - ${range.displayEnd}` : `${s.clockIn} - ${s.clockOut}`;
        })
        .join("\n");

    let hours = 0;
    sessionsInCell.forEach((session) => {
        hours += getSessionHoursOnDateLocal(session, dateStr);
    });
    return { label, hours };
}

export const actualTimeCellLookupKey = (userId: number, dateKey: string, shiftRowIndex: number) =>
    `${userId}|${dateKey}|${shiftRowIndex}`;

export interface ActualTimeCellLookupResult {
    sessionCtx: SessionCalendarCtx;
    dateKeys: string[];
    usersInOrder: { id: number; name: string }[];
    maxShiftsByUser: Map<number, number>;
    cellLookup: Map<string, { label: string; hours: number }>;
    grandTotalHours: number;
}

/**
 * Precomputes per-cell label/hours for Excel and totals. Matches `generateActualTimePrintableTable` cell logic.
 */
export function buildActualTimeCellLookup(
    sessionData: SessionItem[],
    scheduleData: ActualTimeScheduleRow[],
    currentWeekRange: { startOfWeek: Date; endOfWeek: Date }
): ActualTimeCellLookupResult {
    const sessionCtx = buildSessionCalendarCtx(scheduleData, currentWeekRange);
    const dateKeys = getWeekDateKeys(currentWeekRange);
    const usersInOrder = getUsersInScheduleOrder(scheduleData);

    const maxShiftsByUser = new Map<number, number>();
    for (const u of usersInOrder) {
        maxShiftsByUser.set(u.id, getMaxShiftsPerDayForUser(scheduleData, u.id, dateKeys, sessionData, sessionCtx));
    }

    const cellLookup = new Map<string, { label: string; hours: number }>();
    for (const user of usersInOrder) {
        const maxRows = maxShiftsByUser.get(user.id) ?? 1;
        for (let rowIdx = 0; rowIdx < maxRows; rowIdx++) {
            for (const dateKey of dateKeys) {
                const { label, hours } = getActualTimeCellContent(
                    sessionData,
                    scheduleData,
                    sessionCtx,
                    user.id,
                    dateKey,
                    rowIdx
                );
                cellLookup.set(actualTimeCellLookupKey(user.id, dateKey, rowIdx), { label, hours });
            }
        }
    }

    let grandTotalHours = 0;
    for (const dateKey of dateKeys) {
        let daySum = 0;
        for (const s of sessionData) {
            daySum += getSessionHoursOnDate(s, dateKey, sessionCtx);
        }
        grandTotalHours += daySum;
    }
    grandTotalHours = parseFloat(grandTotalHours.toFixed(2));

    return {
        sessionCtx,
        dateKeys,
        usersInOrder,
        maxShiftsByUser,
        cellLookup,
        grandTotalHours,
    };
}

/** Week total hours (matches grand total row in print). */
export function calculateActualTimeGrandTotal(
    sessionData: SessionItem[],
    sessionCtx: SessionCalendarCtx,
    dateKeys: string[]
): number {
    let total = 0;
    for (const dateKey of dateKeys) {
        for (const s of sessionData) {
            total += getSessionHoursOnDate(s, dateKey, sessionCtx);
        }
    }
    return parseFloat(total.toFixed(2));
}

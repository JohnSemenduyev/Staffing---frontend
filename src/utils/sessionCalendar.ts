import type { SessionItem, Shift } from "../types/schedule";
import {
    calculateHours,
    formatDateLocal,
    formatDateStringLocal,
    formatDateUTC,
    getAdjustedDate,
    parseLocalYMD,
    shiftSpansNextDay,
    timeToMinutes,
} from "../lib/utils";

const normDate = (d: string): string => (d && d.includes("T") ? d.split("T")[0] : d || "");

/** Normalize API or UI date strings to YYYY-MM-DD when parseable. */
export function normalizeClockDateString(raw: string | null | undefined): string {
    if (!raw || !String(raw).trim()) return "";
    const s = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const parsed = formatDateStringLocal(s);
    return parsed || "";
}

/**
 * Coerce clock-in/out date fields from API or state to YYYY-MM-DD for UI + GraphQL.
 * Handles epoch ms (number or digit string), seconds (10-digit string), and calendar strings.
 */
export function normalizeClockDateToYmd(raw: unknown): string {
    if (raw == null || raw === "") return "";
    if (typeof raw === "number" && Number.isFinite(raw)) {
        const d = new Date(raw);
        const out = Number.isNaN(d.getTime()) ? "" : formatDateUTC(d);
        return out;
    }
    const s = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // Backend / sample format: MM-DD-YYYY (e.g. 04-03-2026)
    const mdy = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(s);
    if (mdy) {
        const mm = parseInt(mdy[1], 10);
        const dd = parseInt(mdy[2], 10);
        const yyyy = parseInt(mdy[3], 10);
        if (yyyy >= 1900 && yyyy <= 2100 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
            const d = new Date(yyyy, mm - 1, dd);
            if (!Number.isNaN(d.getTime())) return formatDateLocal(d);
        }
    }
    // Epoch as string (GraphQL Long, JSON); 10 digits = seconds, 11–15 = ms
    if (/^\d{10,15}$/.test(s)) {
        const n = Number(s);
        const ms = s.length <= 10 ? n * 1000 : n;
        const d = new Date(ms);
        return Number.isNaN(d.getTime()) ? "" : formatDateUTC(d);
    }
    return normalizeClockDateString(s);
}

/** YYYY-MM-DD → MM-DD-YYYY for `updateManySessionTimes` (backend parseMMDDYYYY). */
export function formatClockDateForApi(raw: unknown): string {
    const ymd = normalizeClockDateToYmd(raw);
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
    const [y, m, d] = ymd.split("-");
    return `${m}-${d}-${y}`;
}

/** Both check-in and check-out calendar dates set (used for overnight split math). */
export function hasExplicitClockDates(session: SessionItem): boolean {
    const a = normalizeClockDateToYmd(session.clockInDate);
    const b = normalizeClockDateToYmd(session.clockOutDate);
    return Boolean(a && b);
}

export function hasExplicitClockInDate(session: SessionItem): boolean {
    return Boolean(normalizeClockDateToYmd(session.clockInDate));
}

export function hasExplicitClockOutDate(session: SessionItem): boolean {
    return Boolean(normalizeClockDateToYmd(session.clockOutDate));
}

/**
 * No real check-out yet (open session). Some APIs send clockOut "00:00" or similar with no clockOutDate — treat as missing, not midnight checkout.
 */
export function hasNoEffectiveClockOut(session: SessionItem): boolean {
    const t = session.clockOut?.trim();
    if (!t) return true;
    if (normalizeClockDateToYmd(session.clockOutDate)) return false;
    return t === "00:00" || t === "0:00";
}

export function getSessionCalendarStartDate(session: SessionItem, shiftById: Map<number, Shift>): string {
    if (hasExplicitClockInDate(session)) {
        return normalizeClockDateToYmd(session.clockInDate);
    }
    const raw = session.shift?.date ?? session.scheduleSessionId;
    if (raw) return normDate(String(raw));
    if (typeof session.shiftId === "number") {
        const sh = shiftById.get(session.shiftId);
        if (sh?.date) return normDate(String(sh.date));
    }
    return "";
}

function clockInstantMs(dateYmd: string, timeHm: string): number {
    const [h, m] = timeHm.split(":").map(Number);
    const d = parseLocalYMD(dateYmd);
    d.setHours(h || 0, m || 0, 0, 0);
    return d.getTime();
}

/** Shift start/end as UTC ms in local calendar sense (matches existing overnight rules). */
export function getShiftStartEndMs(shift: Shift): { startMs: number; endMs: number } {
    const d0 = normDate(shift.date);
    const startMs = clockInstantMs(d0, shift.startTime);
    let endDay = d0;
    if (shiftSpansNextDay(shift.startTime, shift.endTime)) {
        endDay = getAdjustedDate(d0, 1);
    }
    const et = shift.endTime === "24:00" ? "00:00" : shift.endTime;
    let endMs = clockInstantMs(endDay, et);
    if (shift.endTime === "24:00" && !shiftSpansNextDay(shift.startTime, shift.endTime)) {
        const dayEnd = parseLocalYMD(endDay);
        dayEnd.setHours(24, 0, 0, 0);
        endMs = dayEnd.getTime();
    }
    return { startMs, endMs };
}

export type EditSessionRow = {
    clockIn: string;
    clockOut: string;
    clockInDate: string;
    clockOutDate: string;
    clockInDateExplicit?: boolean;
    clockOutDateExplicit?: boolean;
};

export type EditSessionRowState = EditSessionRow & { id: number | null };

/** Returns error message or null if valid. */
export function validateSessionClockAgainstShift(row: EditSessionRow, shift: Shift): string | null {
    const cinD = normalizeClockDateToYmd(row.clockInDate);
    const coutD = normalizeClockDateToYmd(row.clockOutDate);
    if (!cinD) return "Check-in date is required.";
    if (!row.clockIn?.trim()) return "Clock-in time is required.";
    if (coutD && !row.clockOut?.trim()) return "Clock-out time is required when check-out date is set.";
    if (row.clockOut?.trim() && !coutD) return "Check-out date is required when check-out time is set.";
    if (cinD && coutD && cinD > coutD) return "Check-out date cannot be before check-in date.";

    const { startMs, endMs } = getShiftStartEndMs(shift);
    const minIn = startMs - 24 * 60 * 60 * 1000;
    const maxOut = endMs + 24 * 60 * 60 * 1000;

    const inMs = clockInstantMs(cinD, row.clockIn);
    if (inMs < minIn) return "Clock-in is too early for this shift (must be within 24 hours before shift start).";

    if (!row.clockOut?.trim()) return null;

    let outMs = clockInstantMs(coutD!, row.clockOut);
    // Same calendar day with clock-out 00:00 = end of that workday (legacy midnight display).
    if (cinD === coutD && row.clockOut === "00:00" && timeToMinutes(row.clockIn) > 0) {
        outMs = clockInstantMs(getAdjustedDate(cinD, 1), "00:00");
    }

    if (outMs > maxOut) return "Clock-out is too late for this shift (must be within 24 hours after shift end).";

    if (outMs <= inMs) {
        if (row.clockIn === row.clockOut) return null;
        return "Clock-out must be after clock-in, or use the next calendar day for check-out when spanning midnight.";
    }
    return null;
}

function calculateWorkedTimeWith24HourLogic(session: SessionItem): number {
    if (!session.clockIn || !session.clockOut) {
        return (session.workedTime || 0) / 60;
    }
    if (session.clockIn === session.clockOut) {
        return 24.0;
    }
    return calculateHours(session.clockIn, session.clockOut);
}

/** Hours for explicit clock-in/out dates (no shift geometry). Clock-in-only is handled in {@link getSessionHoursOnDate} before this runs. */
function getSessionHoursOnDateExplicit(session: SessionItem, date: string): number {
    const d = normDate(date);
    const cinD = normalizeClockDateToYmd(session.clockInDate);
    const coutD = normalizeClockDateToYmd(session.clockOutDate);
    if (!cinD || !session.clockIn) return 0;

    if (!coutD) return 0;

    if (d < cinD || d > coutD) return 0;

    const sInM = timeToMinutes(session.clockIn);
    const sOutM = timeToMinutes(session.clockOut);

    if (cinD === coutD) {
        if (session.clockIn === session.clockOut) return d === cinD ? 24 : 0;
        if (sOutM === 0) return d === cinD ? calculateHours(session.clockIn, "24:00") : 0;
        if (sInM < sOutM) return d === cinD ? calculateHours(session.clockIn, session.clockOut) : 0;
        return 0;
    }

    if (d === cinD) {
        return calculateHours(session.clockIn, "24:00");
    }
    if (d === coutD) {
        const isMidnight24h = session.clockIn === "00:00" && session.clockOut === "00:00";
        if (isMidnight24h) return 0;
        if (sOutM === 0) return 0;
        return calculateHours("00:00", session.clockOut);
    }
    return 0;
}

export type SessionCalendarCtx = {
    shiftById: Map<number, Shift>;
    /** First day of visible week (YYYY-MM-DD); optional overflow display for print. */
    weekStartStr?: string;
};

/**
 * Calendar column where a clock-in-only session should appear.
 * Any parsable check-in date wins (matches modal input); otherwise legacy shift anchor.
 */
export function getClockInOnlyGridDate(session: SessionItem, ctx: SessionCalendarCtx): string {
    if (!hasNoEffectiveClockOut(session) || !session.clockIn?.trim()) return "";
    const cinD = normalizeClockDateToYmd(session.clockInDate);
    if (cinD) return cinD;
    return getSessionCalendarStartDate(session, ctx.shiftById);
}

/**
 * Open (clock-in-only) sessions attach to the check-in calendar day only.
 * Display on that column is clock-in → 24:00; no duplicate row on the following day.
 */
export function isClockInOnlyVisibleOnDate(session: SessionItem, dateStr: string, ctx: SessionCalendarCtx): boolean {
    if (!hasNoEffectiveClockOut(session) || !session.clockIn?.trim()) return false;
    const anchor = getClockInOnlyGridDate(session, ctx);
    if (!anchor) return false;
    return normDate(dateStr) === normDate(anchor);
}

/** Total worked hours for one session (for workedTime / display). */
export function getSessionTotalWorkedHours(session: SessionItem, ctx: SessionCalendarCtx): number {
    if (!session.clockIn?.trim()) return (session.workedTime || 0) / 60;
    if (hasNoEffectiveClockOut(session)) return (session.workedTime || 0) / 60;

    if (hasExplicitClockDates(session)) {
        const cinD = normalizeClockDateToYmd(session.clockInDate);
        const coutD = normalizeClockDateToYmd(session.clockOutDate);
        if (!cinD || !coutD) return calculateWorkedTimeWith24HourLogic(session);
        if (cinD === coutD) {
            if (session.clockIn === session.clockOut) return 24;
            const sOutM = timeToMinutes(session.clockOut);
            if (sOutM === 0) return calculateHours(session.clockIn, "24:00");
            return calculateHours(session.clockIn, session.clockOut);
        }
        return (
            calculateHours(session.clockIn, "24:00") + calculateHours("00:00", session.clockOut)
        );
    }

    return calculateWorkedTimeWith24HourLogic(session);
}

/** Hours of this session on `date` — explicit dates branch or legacy shift-based inference. */
export function getSessionHoursOnDate(session: SessionItem, date: string, ctx: SessionCalendarCtx): number {
    const d = normDate(date);
    const cinD = normalizeClockDateToYmd(session.clockInDate);

    // No check-out yet: attribute hours only to the check-in calendar day when that date is set (matches modal).
    // Runs before hasExplicitClockInDate so shift-day fallback never steals open sessions.
    if (hasNoEffectiveClockOut(session) && cinD && session.clockIn?.trim()) {
        return cinD === d ? (session.workedTime || 0) / 60 : 0;
    }

    if (hasExplicitClockInDate(session)) {
        return getSessionHoursOnDateExplicit(session, date);
    }

    const sessionDate = getSessionCalendarStartDate(session, ctx.shiftById);
    if (!session.clockIn?.trim()) {
        return sessionDate === d ? (session.workedTime || 0) / 60 : 0;
    }
    if (hasNoEffectiveClockOut(session)) {
        return sessionDate === d ? (session.workedTime || 0) / 60 : 0;
    }
    const scheduledShift = typeof session.shiftId === "number" ? ctx.shiftById.get(session.shiftId) : undefined;

    if (scheduledShift && shiftSpansNextDay(scheduledShift.startTime, scheduledShift.endTime)) {
        const shiftEndM = timeToMinutes(scheduledShift.endTime);
        const sInM = timeToMinutes(session.clockIn);
        const sOutM = timeToMinutes(session.clockOut);

        const inferredClockInDate = sInM <= shiftEndM ? getAdjustedDate(sessionDate, 1) : sessionDate;

        let inferredClockOutDate: string;
        if (session.clockIn === session.clockOut) {
            inferredClockOutDate = getAdjustedDate(inferredClockInDate, 1);
        } else if (sOutM === 0) {
            inferredClockOutDate = inferredClockInDate;
        } else if (sOutM <= sInM) {
            inferredClockOutDate = getAdjustedDate(inferredClockInDate, 1);
        } else {
            inferredClockOutDate = inferredClockInDate;
        }

        const isMidnight24h = session.clockIn === "00:00" && session.clockOut === "00:00";

        if (d === inferredClockInDate && d === inferredClockOutDate) {
            return calculateHours(session.clockIn, session.clockOut);
        }

        if (d === inferredClockInDate && d !== inferredClockOutDate) {
            return calculateHours(session.clockIn, "24:00");
        }

        if (d === inferredClockOutDate && d !== inferredClockInDate) {
            if (isMidnight24h) return 0;
            if (sOutM === 0) return 0;
            return calculateHours("00:00", session.clockOut);
        }

        return 0;
    }

    const sIn = timeToMinutes(session.clockIn);
    const sOut = timeToMinutes(session.clockOut);
    if (sIn < sOut) {
        return sessionDate === d ? calculateHours(session.clockIn, session.clockOut) : 0;
    }
    if (sOut === 0) {
        return sessionDate === d ? calculateHours(session.clockIn, "24:00") : 0;
    }
    const shouldSplitByDate = scheduledShift ? shiftSpansNextDay(scheduledShift.startTime, scheduledShift.endTime) : true;
    if (!shouldSplitByDate) {
        return sessionDate === d ? calculateWorkedTimeWith24HourLogic(session) : 0;
    }
    const startDate = sessionDate;
    const endDate = sessionDate ? getAdjustedDate(sessionDate, 1) : "";
    if (d === startDate) return calculateHours(session.clockIn, "24:00");
    if (d === endDate) return calculateHours("00:00", session.clockOut);
    return 0;
}

export type DisplayRange = { displayStart: string; displayEnd: string };

export function getSessionDisplayRangeOnDate(
    session: SessionItem,
    dateStr: string,
    ctx: SessionCalendarCtx
): DisplayRange | null {
    const hoursHere = getSessionHoursOnDate(session, dateStr, ctx);
    const anchor = getClockInOnlyGridDate(session, ctx);
    const clockInOnlyVisible =
        hasNoEffectiveClockOut(session) &&
        session.clockIn?.trim() &&
        anchor !== "" &&
        isClockInOnlyVisibleOnDate(session, dateStr, ctx);
    if (hoursHere <= 0 && !clockInOnlyVisible) return null;

    if (clockInOnlyVisible) {
        const a = normDate(anchor);
        const ds = normDate(dateStr);
        if (ds !== a) return null;
        return { displayStart: session.clockIn || "N/A", displayEnd: "N/A" };
    }

    if (hasExplicitClockDates(session)) {
        const cinD = normalizeClockDateToYmd(session.clockInDate);
        const coutD = normalizeClockDateToYmd(session.clockOutDate);
        if (!session.clockIn || !session.clockOut || !cinD || !coutD) {
            return { displayStart: session.clockIn || "N/A", displayEnd: session.clockOut || "N/A" };
        }
        const d = normDate(dateStr);
        const sInM = timeToMinutes(session.clockIn);
        const sOutM = timeToMinutes(session.clockOut);

        if (cinD === coutD) {
            if (sOutM === 0 && sInM > 0) {
                return { displayStart: session.clockIn, displayEnd: "24:00" };
            }
            return { displayStart: session.clockIn, displayEnd: session.clockOut };
        }
        if (d === cinD) {
            return { displayStart: session.clockIn, displayEnd: "24:00" };
        }
        if (d === coutD) {
            if (sOutM === 0) return { displayStart: session.clockIn, displayEnd: session.clockOut };
            return { displayStart: "00:00", displayEnd: session.clockOut };
        }
        return null;
    }

    const scheduledShift = typeof session.shiftId === "number" ? ctx.shiftById.get(session.shiftId) : undefined;
    if (!session.clockIn?.trim() || hasNoEffectiveClockOut(session)) {
        return {
            displayStart: session.clockIn || "N/A",
            displayEnd: hasNoEffectiveClockOut(session) ? "N/A" : session.clockOut || "N/A",
        };
    }

    const sessionDate = getSessionCalendarStartDate(session, ctx.shiftById);
    const sIn = timeToMinutes(session.clockIn);
    const sOut = timeToMinutes(session.clockOut);

    if (scheduledShift && shiftSpansNextDay(scheduledShift.startTime, scheduledShift.endTime)) {
        const shiftEndM = timeToMinutes(scheduledShift.endTime);
        const inferredClockInDate = sIn <= shiftEndM ? getAdjustedDate(sessionDate, 1) : sessionDate;
        let inferredClockOutDate: string;
        if (session.clockIn === session.clockOut) {
            inferredClockOutDate = getAdjustedDate(inferredClockInDate, 1);
        } else if (sOut === 0) {
            inferredClockOutDate = inferredClockInDate;
        } else if (sOut <= sIn) {
            inferredClockOutDate = getAdjustedDate(inferredClockInDate, 1);
        } else {
            inferredClockOutDate = inferredClockInDate;
        }

        if (dateStr === inferredClockInDate && dateStr === inferredClockOutDate) {
            return { displayStart: session.clockIn, displayEnd: session.clockOut };
        }
        if (dateStr === inferredClockInDate && dateStr !== inferredClockOutDate) {
            return { displayStart: session.clockIn, displayEnd: "24:00" };
        }
        if (dateStr === inferredClockOutDate && dateStr !== inferredClockInDate) {
            const isMidnight24h = session.clockIn === "00:00" && session.clockOut === "00:00";
            if (isMidnight24h) return null;
            if (sOut === 0) return null;
            return { displayStart: "00:00", displayEnd: session.clockOut };
        }
        return null;
    }

    if (sIn < sOut) {
        return dateStr === sessionDate ? { displayStart: session.clockIn, displayEnd: session.clockOut } : null;
    }
    if (sOut === 0) {
        return dateStr === sessionDate ? { displayStart: session.clockIn, displayEnd: session.clockOut } : null;
    }
    const shouldSplitByDate = scheduledShift ? shiftSpansNextDay(scheduledShift.startTime, scheduledShift.endTime) : true;
    if (!shouldSplitByDate) {
        return dateStr === sessionDate ? { displayStart: session.clockIn, displayEnd: session.clockOut } : null;
    }
    const endDate = getAdjustedDate(sessionDate, 1);
    const ws = ctx.weekStartStr;
    if (dateStr === sessionDate) return { displayStart: session.clockIn, displayEnd: "24:00" };
    if (dateStr === endDate || (ws && sessionDate < ws && dateStr === ws)) {
        return { displayStart: "00:00", displayEnd: session.clockOut };
    }
    return { displayStart: session.clockIn, displayEnd: session.clockOut };
}

/** Calendar segments [date, startM, endM) for overlap checks; uses explicit dates when present. */
export function sessionToDaySegments(
    session: SessionItem,
    legacyAnchorDate: string,
    ctx: SessionCalendarCtx
): Array<{ date: string; startM: number; endM: number }> {
    if (hasExplicitClockDates(session) && session.clockIn && session.clockOut) {
        const cinD = normalizeClockDateToYmd(session.clockInDate);
        const coutD = normalizeClockDateToYmd(session.clockOutDate);
        if (!cinD || !coutD) return [];
        const startM = timeToMinutes(session.clockIn);
        const endM = timeToMinutes(session.clockOut);
        if (cinD === coutD) {
            if (startM >= endM && endM !== 0) {
                return [
                    { date: cinD, startM, endM: 24 * 60 },
                    { date: getAdjustedDate(cinD, 1), startM: 0, endM },
                ];
            }
            if (endM === 0 && startM > 0) {
                return [{ date: cinD, startM, endM: 24 * 60 }];
            }
            return [{ date: cinD, startM, endM }];
        }
        return [
            { date: cinD, startM, endM: 24 * 60 },
            { date: coutD, startM: 0, endM },
        ];
    }

    const d0 = normDate(legacyAnchorDate);
    const clockIn1 = session.clockIn || "";
    const clockOut1 = session.clockOut || "";
    if (!clockIn1 || !clockOut1) return [];
    const startM = timeToMinutes(clockIn1);
    const endM = timeToMinutes(clockOut1);
    if (startM >= endM) {
        return [
            { date: d0, startM, endM: 24 * 60 },
            { date: getAdjustedDate(d0, 1), startM: 0, endM },
        ];
    }
    return [{ date: d0, startM, endM }];
}

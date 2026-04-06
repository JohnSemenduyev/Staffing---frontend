import { useState, useMemo } from "react";
import { ScheduleItem, SessionItem, Shift, RowGroup } from "../types/schedule";
import { formatDateLocal, formatDateStringLocal, calculateHours, minutesDiffWithWrap, timeToMinutes, shiftSpansNextDay, getAdjustedDate } from "../lib/utils";
import { useToast } from "./use-toast";
import { isOverflowShift } from "../pages/Manager/ViewSchedule/utils";
import {
    getSessionCalendarStartDate as getSessionCalendarStartDateUtil,
    getSessionHoursOnDate as getSessionHoursOnDateUtil,
    getSessionTotalWorkedHours,
    isClockInOnlyVisibleOnDate,
    hasExplicitClockInDate,
    hasExplicitClockOutDate,
    hasNoEffectiveClockOut,
    normalizeClockDateToYmd,
    sessionToDaySegments,
    validateSessionClockAgainstShift,
    type EditSessionRowState,
} from "../utils/sessionCalendar";

/**
 * Actual table grid = schedule visual shifts (current-day + previous-day spanning, including overflow from previous week on first day).
 * Sessions are attached to shifts by shiftId; display and hours use getSessionHoursOnDate so overnight/24h split correctly.
 */

const normDate = (d: string): string => (d && d.includes("T") ? d.split("T")[0] : d || "");

/** When injecting a shift for explicit-date hours, prefer the row where this shiftId appears elsewhere in the week; if that slot is taken by another shift on this day, use the next free row or append. */
function placeInjectedShiftCell(
    arr: (Shift | null)[],
    sid: number,
    enriched: Shift,
    preferredRow: number
): { placed: boolean; row: number } {
    if (arr.some(sh => sh != null && sh.id === sid)) return { placed: false, row: -1 };
    while (arr.length <= preferredRow) arr.push(null);
    if (arr[preferredRow] == null || arr[preferredRow]!.id === sid) {
        arr[preferredRow] = enriched;
        return { placed: true, row: preferredRow };
    }
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] == null || arr[i]!.id === sid) {
            arr[i] = enriched;
            return { placed: true, row: i };
        }
    }
    arr.push(enriched);
    return { placed: true, row: arr.length - 1 };
}

interface UseActualTimeTableProps {
    scheduleData: ScheduleItem[];
    sessionData: SessionItem[];
    selectedUserId?: number;
    currentWeekRange: any;
    onSessionDataChange: (newData: SessionItem[]) => void;
    onToggleEditMode: () => void;
    hasChanges?: boolean;
}

export const useActualTimeTable = ({
    scheduleData,
    sessionData,
    selectedUserId,
    currentWeekRange,
    onSessionDataChange,
    onToggleEditMode,
    hasChanges,
}: UseActualTimeTableProps) => {
    const { toast } = useToast();

    // Modal states
    const [deleteAllModal, setDeleteAllModal] = useState({ isOpen: false, shiftId: null as number | null });
    const [deleteUserModal, setDeleteUserModal] = useState({ isOpen: false, userId: null as number | null });
    const [editModeConfirmModal, setEditModeConfirmModal] = useState({ isOpen: false });
    const [editShiftModal, setEditShiftModal] = useState({ isOpen: false, userId: null as number | null, date: null as string | null, shiftId: null as number | null });
    const [editSessions, setEditSessions] = useState<EditSessionRowState[]>([]);

    // Generate date columns
    const dateColumns = useMemo(() => {
        if (!currentWeekRange) return [];
        const dates = [];
        const startDate = new Date(currentWeekRange.startOfWeek);
        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            dates.push({
                date: formatDateLocal(date),
                display: `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`
            });
        }
        return dates;
    }, [currentWeekRange]);

    // Same as schedule table: only users with current-week shift or previous-week overflow into current week
    const visibleUserIds = useMemo(() => {
        const currentWeekDates = new Set(dateColumns.map((c) => c.date));
        const weekStart = currentWeekRange?.startOfWeek;
        const hasSomethingInCurrentWeek = (item: ScheduleItem): boolean => {
            // Exclude draft schedule sessions from actual time table
            if (item.draftScheduleSession) return false;
            
            if (currentWeekDates.has(normDate(item.startDate))) return true;
            if (!weekStart || !isOverflowShift(item.startDate, weekStart)) return false;
            return (item.shifts || []).some(
                (s: any) => !s.isDelete && !s.draftShiftId && !s.draftScheduleSessionId && shiftSpansNextDay(s.startTime, s.endTime)
            );
        };
        const ids = new Set<number>();
        scheduleData.forEach((item) => {
            if (hasSomethingInCurrentWeek(item)) ids.add(item.userId);
        });
        return ids;
    }, [scheduleData, dateColumns, currentWeekRange]);

    // Unique users logic (only guards that appear in schedule table)
    const uniqueUsers = useMemo(() => {
        const userMap = new Map();
        scheduleData.forEach(item => {
            if (!visibleUserIds.has(item.userId) || userMap.has(item.userId)) return;
            userMap.set(item.userId, {
                id: item.userId,
                name: item.userName,
                phone: item.userPhone,
                clientName: item.clientName,
                address: item.address
            });
        });
        return Array.from(userMap.values());
    }, [scheduleData, visibleUserIds]);

    // Row groups for employee view (only if selected user is visible in schedule table)
    const rowGroups: RowGroup[] = useMemo(() => {
        if (!selectedUserId || !visibleUserIds.has(selectedUserId)) return [];
        const map = new Map<string, RowGroup>();
        scheduleData
            .filter(item => item.userId === selectedUserId)
            .forEach(item => {
                const key = `${item.clientId}-${item.addressId}`;
                if (!map.has(key)) {
                    map.set(key, {
                        id: key,
                        userId: item.userId,
                        name: item.userName,
                        phone: item.userPhone,
                        clientName: item.clientName,
                        address: item.address,
                        clientId: item.clientId,
                        addressId: item.addressId,
                    });
                }
            });
        return Array.from(map.values());
    }, [scheduleData, selectedUserId, visibleUserIds]);

    const firstDayOfWeek = dateColumns.length > 0 ? dateColumns[0].date : null;

    const shiftById = useMemo(() => {
        const map = new Map<number, Shift>();
        scheduleData.forEach((si) => {
            (si.shifts || []).forEach((sh: any) => {
                if (!sh?.id) return;
                map.set(sh.id, sh as Shift);
            });
        });
        return map;
    }, [scheduleData]);

    const sessionCtx = useMemo(
        () => ({ shiftById, weekStartStr: firstDayOfWeek ?? undefined }),
        [shiftById, firstDayOfWeek]
    );

    /** Calendar start date for a session (shift.date, else scheduleSessionId string, else shift lookup). */
    const getSessionCalendarStartDate = (session: SessionItem): string =>
        getSessionCalendarStartDateUtil(session, shiftById);

    const getSessionHoursOnDate = (session: SessionItem, date: string): number =>
        getSessionHoursOnDateUtil(session, date, sessionCtx);

    /** Visual shifts for one date from a subset of schedule items (e.g. one user or one group). Includes previous-day spanning on all days (including first day = overflow from previous week). */
    const getVisualShiftsFromScheduleItems = (
        scheduleItems: ScheduleItem[],
        date: string,
        _firstDay: string | null
    ): (Shift & { isContinuation?: boolean })[] => {
        const getItem = (d: string) => scheduleItems.find(item => normDate(item.startDate) === d);
        const daySchedule = getItem(date);
        const currentDayShifts = daySchedule
            ? (daySchedule.shifts || []).filter((s: any) => !s.isDelete && !s.draftShiftId && !s.draftScheduleSessionId).map((s: Shift) => ({ ...s, isContinuation: false }))
            : [];
        const prevDate = getAdjustedDate(date, -1);
        const prevSchedule = getItem(prevDate);
        const prevDaySpanningShifts: (Shift & { isContinuation?: boolean })[] = !prevSchedule
            ? []
            : (prevSchedule.shifts || [])
                .filter((s: any) => !s.isDelete && !s.draftShiftId && !s.draftScheduleSessionId && shiftSpansNextDay(s.startTime, s.endTime))
                .map((s: Shift) => ({ ...s, isContinuation: true }));
        const withDisplayStart = (s: Shift & { isContinuation?: boolean }) =>
            s.isContinuation ? { ...s, displayStartTime: "00:00" as const } : { ...s, displayStartTime: s.startTime };
        const all = [...currentDayShifts.map(withDisplayStart), ...prevDaySpanningShifts.map(withDisplayStart)];
        return all.sort((a, b) => timeToMinutes((a as any).displayStartTime) - timeToMinutes((b as any).displayStartTime));
    };

    const enrichShiftForCell = (s: Shift & { isContinuation?: boolean }): Shift => {
        if ((s as any).isContinuation) {
            return { ...s, startTime: "00:00", hours: calculateHours("00:00", s.endTime), isSplit: true, splitSide: "end" };
        }
        if (shiftSpansNextDay(s.startTime, s.endTime)) {
            return { ...s, endTime: "24:00", hours: calculateHours(s.startTime, "24:00"), isSplit: true, splitSide: "start" };
        }
        return s;
    };

    /** User mode: grid keyed by userId. Schedule visual shifts + injected rows for explicit-date sessions on days with no scheduled cell for that shiftId. */
    const buildUserDateShifts = useMemo(() => {
        const map = new Map<number, Map<string, (Shift | null)[]>>();

        const findShiftRowInWeek = (dateMap: Map<string, (Shift | null)[]>, shiftId: number): number => {
            for (const dc of dateColumns) {
                const arr = dateMap.get(dc.date) ?? [];
                const i = arr.findIndex(sh => sh != null && sh.id === shiftId);
                if (i >= 0) return i;
            }
            return 0;
        };

        const sessionNeedsCellOnDate = (session: SessionItem, dateStr: string): boolean => {
            if (getSessionHoursOnDateUtil(session, dateStr, sessionCtx) > 0) return true;
            return Boolean(
                hasNoEffectiveClockOut(session) &&
                    session.clockIn?.trim() &&
                    isClockInOnlyVisibleOnDate(session, dateStr, sessionCtx)
            );
        };

        const injectExplicitShiftsForUser = (userId: number, dateMap: Map<string, (Shift | null)[]>) => {
            const userSessions = sessionData.filter(s => {
                if (!hasExplicitClockInDate(s) || !s.shiftId) return false;
                const si = scheduleData.find(item => item.shifts?.some(sh => sh.id === s.shiftId));
                return si?.userId === userId;
            });
            for (const session of userSessions) {
                const sid = session.shiftId!;
                const baseShift = shiftById.get(sid);
                if (!baseShift) continue;
                const preferredRow = findShiftRowInWeek(dateMap, sid);
                const enriched = enrichShiftForCell({ ...baseShift, isContinuation: false } as Shift & { isContinuation?: boolean });
                for (const dc of dateColumns) {
                    if (!sessionNeedsCellOnDate(session, dc.date)) continue;
                    const arr = dateMap.get(dc.date);
                    if (!arr) continue;
                    placeInjectedShiftCell(arr, sid, enriched, preferredRow);
                }
            }
        };

        const userIds = Array.from(new Map(scheduleData.map(item => [item.userId, item.userId])).values());
        userIds.forEach(userId => {
            const userItems = scheduleData.filter(item => item.userId === userId);
            if (!map.has(userId)) map.set(userId, new Map());
            const dateMap = map.get(userId)!;
            dateColumns.forEach(dc => {
                const visual = getVisualShiftsFromScheduleItems(userItems, dc.date, firstDayOfWeek);
                dateMap.set(dc.date, visual.map(enrichShiftForCell));
            });
            injectExplicitShiftsForUser(userId, dateMap);
        });
        return map;
    }, [scheduleData, dateColumns, firstDayOfWeek, sessionData, sessionCtx, shiftById]);

    /** Group mode: grid keyed by group id (userId-clientId-addressId). Same visual-shift logic + explicit-date inject. */
    const buildGroupDateShifts = useMemo(() => {
        const map = new Map<string, Map<string, (Shift | null)[]>>();

        const findShiftRowInWeek = (dateMap: Map<string, (Shift | null)[]>, shiftId: number): number => {
            for (const dc of dateColumns) {
                const arr = dateMap.get(dc.date) ?? [];
                const i = arr.findIndex(sh => sh != null && sh.id === shiftId);
                if (i >= 0) return i;
            }
            return 0;
        };

        const sessionNeedsCellOnDate = (session: SessionItem, dateStr: string): boolean => {
            if (getSessionHoursOnDateUtil(session, dateStr, sessionCtx) > 0) return true;
            return Boolean(
                hasNoEffectiveClockOut(session) &&
                    session.clockIn?.trim() &&
                    isClockInOnlyVisibleOnDate(session, dateStr, sessionCtx)
            );
        };

        const injectExplicitShiftsForGroup = (group: RowGroup, dateMap: Map<string, (Shift | null)[]>) => {
            const groupSessions = sessionData.filter(s => {
                if (!hasExplicitClockInDate(s) || !s.shiftId) return false;
                const si = scheduleData.find(item => item.shifts?.some(sh => sh.id === s.shiftId));
                return (
                    si?.userId === group.userId &&
                    si.clientId === group.clientId &&
                    si.addressId === group.addressId
                );
            });
            for (const session of groupSessions) {
                const sid = session.shiftId!;
                const baseShift = shiftById.get(sid);
                if (!baseShift) continue;
                const preferredRow = findShiftRowInWeek(dateMap, sid);
                const enriched = enrichShiftForCell({ ...baseShift, isContinuation: false } as Shift & { isContinuation?: boolean });
                for (const dc of dateColumns) {
                    if (!sessionNeedsCellOnDate(session, dc.date)) continue;
                    const arr = dateMap.get(dc.date);
                    if (!arr) continue;
                    placeInjectedShiftCell(arr, sid, enriched, preferredRow);
                }
            }
        };

        rowGroups.forEach(group => {
            const groupItems = scheduleData.filter(
                item => item.userId === group.userId && item.clientId === group.clientId && item.addressId === group.addressId
            );
            const groupKey = String(group.id);
            if (!map.has(groupKey)) map.set(groupKey, new Map());
            const dateMap = map.get(groupKey)!;
            dateColumns.forEach(dc => {
                const visual = getVisualShiftsFromScheduleItems(groupItems, dc.date, firstDayOfWeek);
                dateMap.set(dc.date, visual.map(enrichShiftForCell));
            });
            injectExplicitShiftsForGroup(group, dateMap);
        });
        return map;
    }, [scheduleData, dateColumns, firstDayOfWeek, rowGroups, sessionData, sessionCtx, shiftById]);

    // Helper functions
    /** Sessions for a shift. When date is provided, only sessions with hours on that date (getSessionHoursOnDate > 0). Display clipping is done in the cell. */
    const getSessionsForShift = (
        shiftId?: number | Shift,
        scheduleSessionId?: number,
        date?: string,
        userId?: number
    ): SessionItem[] => {
        let actualShiftId: number | undefined;
        if (typeof shiftId === 'object') {
            actualShiftId = shiftId.id;
        } else {
            actualShiftId = shiftId;
        }

        if (!actualShiftId && !scheduleSessionId) return [];
        let sessions = sessionData.filter(s => s.shiftId === actualShiftId);

        // Fallback when shiftId is missing but we have scheduleSessionId + date + userId (e.g. Whole Column edge case)
        if (!actualShiftId && sessions.length === 0 && scheduleSessionId && date && typeof userId === 'number') {
            const shiftsOnDate = buildUserDateShifts.get(userId)?.get(date) || [];
            if (shiftsOnDate.some(s => s != null)) {
                const bySessionIdAndDate = sessionData.filter(s => {
                    const d = s.shift?.date || s.scheduleSessionId;
                    const sDate = d ? formatDateStringLocal(String(d)) : '';
                    return s.scheduleSessionId === scheduleSessionId && normDate(sDate) === normDate(date);
                });
                if (bySessionIdAndDate.length > 0) sessions = bySessionIdAndDate;
            }
        }

        if (sessions.length === 0) return [];

        if (date) {
            sessions = sessions.filter(s => {
                if (getSessionHoursOnDate(s, date) > 0) return true;
                // Clock-in only: workedTime is often 0, so hours on date are 0 — still show on check-in (anchor) day
                if (hasNoEffectiveClockOut(s) && s.clockIn?.trim() && isClockInOnlyVisibleOnDate(s, date, sessionCtx)) return true;
                return false;
            });
        }
        return sessions.sort((a, b) => (a.clockIn || '').localeCompare(b.clockIn || ''));
    };


    // Edit Shift Logic: for overnight shifts load full sessions (no date filter) so both cells edit the same session with full start/end; display stays split visually only
    const openEditShift = (userId: number, date: string, shiftId: number) => {
        const shift = scheduleData.flatMap(s => s.shifts || []).find(sh => sh.id === shiftId);
        
        // Prevent opening edit dialog for draft shifts
        if (shift && ((shift as any).draftShiftId || (shift as any).draftScheduleSessionId)) {
            toast({ 
                title: "Cannot Edit", 
                description: "Cannot edit sessions for draft shifts. Please publish the draft schedule first.", 
                variant: "destructive" 
            });
            return;
        }
        
        const scheduleSessionId = shift?.scheduleSessionId;
        const isOvernight = shift && shiftSpansNextDay(shift.startTime, shift.endTime);
        const sessions = getSessionsForShift(shiftId, scheduleSessionId, isOvernight ? undefined : date, userId);
        const shiftDateNorm = shift?.date
            ? normDate(shift.date.includes("T") ? shift.date.split("T")[0] : String(shift.date))
            : normDate(date);
        setEditSessions(
            sessions.map(s => ({
                id: s.id,
                clockIn: s.clockIn || "",
                clockOut: s.clockOut || "",
                clockInDate: hasExplicitClockInDate(s)
                    ? normalizeClockDateToYmd(s.clockInDate)
                    : shiftDateNorm,
                clockOutDate: hasExplicitClockOutDate(s)
                    ? normalizeClockDateToYmd(s.clockOutDate)
                    : "",
            }))
        );
        setEditShiftModal({ isOpen: true, userId, date, shiftId });
    };

    const addEditSessionRow = () => {
        const hasIncomplete = editSessions.some(r => {
            const cinD = normalizeClockDateToYmd(r.clockInDate);
            return !cinD || !r.clockIn || r.clockIn.trim() === "";
        });
        if (hasIncomplete) return;
        setEditSessions(prev => [...prev, { id: null, clockIn: "", clockOut: "", clockInDate: "", clockOutDate: "" }]);
    };

    const removeEditSessionRow = (index: number) => {
        setEditSessions(prev => prev.filter((_, i) => i !== index));
    };

    const saveEditShiftSessions = () => {
        if (!editShiftModal.isOpen || editShiftModal.shiftId == null) return;

        // Check if this is a draft shift - prevent session creation for draft shifts
        const shiftId = editShiftModal.shiftId;
        const shiftToEdit = scheduleData.flatMap(s => s.shifts || []).find(sh => sh.id === shiftId);
        if (shiftToEdit && ((shiftToEdit as any).draftShiftId || (shiftToEdit as any).draftScheduleSessionId)) {
            toast({ 
                title: "Cannot Edit", 
                description: "Cannot create sessions for draft shifts. Please publish the draft schedule first.", 
                variant: "destructive" 
            });
            return;
        }

        // 1) Basic validation + shift window (dates required)
        const shiftForDate = scheduleData.flatMap(s => s.shifts || []).find(sh => sh.id === shiftId);
        if (!shiftForDate) {
            toast({ title: "Error", description: "Shift not found.", variant: "destructive" });
            return;
        }

        for (const row of editSessions) {
            if (!normalizeClockDateToYmd(row.clockInDate)) {
                toast({ title: "Validation Error", description: "Check-in date is required for every session.", variant: "destructive" });
                return;
            }
            if (!row.clockIn || !row.clockIn.trim()) {
                toast({ title: "Validation Error", description: "Clock-in time is required for every session.", variant: "destructive" });
                return;
            }
            const v = validateSessionClockAgainstShift(row, shiftForDate);
            if (v) {
                toast({ title: "Validation Error", description: v, variant: "destructive" });
                return;
            }
            if (row.clockOut) {
                const durationMinutes = minutesDiffWithWrap(row.clockIn, row.clockOut);
                if (durationMinutes < 1) {
                    toast({ title: "Invalid Duration", description: "When clock-out is provided, it must be at least 1 minute after clock-in.", variant: "destructive" });
                    return;
                }
            }
        }

        const date = editShiftModal.date!;
        const userId = editShiftModal.userId!;
        const prevDate = getAdjustedDate(date, -1);
        const nextDate = getAdjustedDate(date, 1);
        const editedSessionStartDate = shiftForDate?.date ? (shiftForDate.date.includes("T") ? shiftForDate.date.split("T")[0] : shiftForDate.date) : date;
        const editedSessionIds = new Set(editSessions.map(r => r.id).filter((id): id is number => id != null));

        const scheduleSessionIdResolved = (scheduleData.find(si => si.shifts.some(sh => sh.id === shiftId))?.shifts.find(sh => sh.id === shiftId)?.scheduleSessionId)!;

        const rowToProbeSession = (r: EditSessionRowState): SessionItem => {
            const cin = normalizeClockDateToYmd(r.clockInDate);
            const cout = r.clockOut?.trim() ? normalizeClockDateToYmd(r.clockOutDate) : "";
            const base: SessionItem = {
                id: r.id ?? 0,
                shiftId,
                scheduleSessionId: scheduleSessionIdResolved,
                clockIn: r.clockIn,
                clockOut: r.clockOut || null,
                clockInDate: cin,
                workedTime: 0,
            };
            if (r.clockOut?.trim() && cout) base.clockOutDate = cout;
            return base;
        };

        const segmentsOverlap = (
            a: Array<{ date: string; startM: number; endM: number }>,
            b: Array<{ date: string; startM: number; endM: number }>
        ): boolean => {
            for (const x of a) {
                for (const y of b) {
                    if (x.date !== y.date) continue;
                    if (x.startM < y.endM && y.startM < x.endM) return true;
                }
            }
            return false;
        };

        // 2) Same‑shift overlap
        const sorted = [...editSessions].sort((a, b) => a.clockIn.localeCompare(b.clockIn));
        for (let i = 0; i < sorted.length; i++) {
            for (let j = i + 1; j < sorted.length; j++) {
                if (!sorted[i].clockOut || !sorted[j].clockOut) continue;
                const a = sessionToDaySegments(rowToProbeSession(sorted[i]) as SessionItem, editedSessionStartDate, sessionCtx);
                const b = sessionToDaySegments(rowToProbeSession(sorted[j]) as SessionItem, editedSessionStartDate, sessionCtx);
                if (segmentsOverlap(a, b)) {
                    toast({ title: "Overlap", description: "Sessions overlap within the same shift.", variant: "destructive" });
                    return;
                }
            }
        }

        // 3) Adjacent-day overlap with other sessions for this user
        const otherSessionsSameUserAndAdjacentDays = sessionData.filter(s => {
            if (s.shiftId === shiftId) return false;
            if (editedSessionIds.has(s.id)) return false;
            const scheduleItem = scheduleData.find(si => si.shifts.some(sh => sh.id === s.shiftId));
            if (!scheduleItem) return false;
            if (scheduleItem.userId !== userId) return false;
            const sDateRaw = s.shift?.date || s.scheduleSessionId;
            const sDate = sDateRaw ? formatDateStringLocal(String(sDateRaw)) : '';
            return sDate === date || sDate === prevDate || sDate === nextDate;
        });

        for (const row of editSessions) {
            for (const s of otherSessionsSameUserAndAdjacentDays) {
                if (!s.clockIn) continue;
                if (!row.clockOut || !s.clockOut) continue;
                const otherAnchor = getSessionCalendarStartDateUtil(s, shiftById);
                const a = sessionToDaySegments(rowToProbeSession(row), editedSessionStartDate, sessionCtx);
                const b = sessionToDaySegments(s, otherAnchor, sessionCtx);
                if (segmentsOverlap(a, b)) {
                    toast({ title: "Overlap", description: "Edited sessions overlap with another session on this date or an adjacent day (same user).", variant: "destructive" });
                    return;
                }
            }
        }

        const remaining = sessionData.filter(s => s.shiftId !== shiftId);
        const sessionDate = shiftForDate?.date ? (shiftForDate.date.includes("T") ? shiftForDate.date.split("T")[0] : shiftForDate.date) : date;
        const withClockOut = editSessions.filter(r => r.clockOut);
        const minClockIn = editSessions.length ? editSessions.reduce((min, r) => (r.clockIn && (!min || r.clockIn < min)) ? r.clockIn : min, "" as string) : "";
        const maxClockOut = withClockOut.length ? withClockOut.reduce((max, r) => (r.clockOut && (!max || r.clockOut > max)) ? r.clockOut : max, "" as string) : "";
        const shiftTimes = (minClockIn && maxClockOut) ? { startTime: minClockIn, endTime: maxClockOut } : {};
        const toAdd = editSessions.map(row => {
            const cinYmd = normalizeClockDateToYmd(row.clockInDate);
            const coutYmd = row.clockOut?.trim() ? normalizeClockDateToYmd(row.clockOutDate) : "";
            const forHours: SessionItem = {
                id: row.id ?? 0,
                shiftId,
                scheduleSessionId: scheduleSessionIdResolved,
                clockIn: row.clockIn,
                clockOut: row.clockOut || null,
                clockInDate: cinYmd,
                workedTime: 0,
            };
            if (row.clockOut?.trim() && coutYmd) forHours.clockOutDate = coutYmd;
            return {
                ...forHours,
                id: row.id ?? Date.now() + Math.floor(Math.random() * 1000),
                workedTime: Math.round(getSessionTotalWorkedHours(forHours, sessionCtx) * 60),
                shift: { id: shiftId, date: sessionDate, ...shiftTimes },
            } as SessionItem;
        });

        onSessionDataChange([...remaining, ...toAdd]);
        setEditShiftModal({ isOpen: false, userId: null, date: null, shiftId: null });
        setEditSessions([]);
    };

    // Delete Handlers
    const confirmDeleteUser = () => {
        const { userId } = deleteUserModal;
        const updatedData = sessionData.filter(item => {
            const sessionUserId = item.scheduleSessionId;
            if (!sessionUserId) return false;
            const scheduleItem = scheduleData.find(scheduleItem =>
                scheduleItem.shifts.some(shift => shift.scheduleSessionId === sessionUserId)
            );
            return scheduleItem?.userId !== userId;
        });
        onSessionDataChange(updatedData);
        setDeleteUserModal({ isOpen: false, userId: null });
    };

    const confirmDeleteAllForShift = () => {
        if (!deleteAllModal.isOpen || deleteAllModal.shiftId == null) return;
        const updated = sessionData.filter(s => s.shiftId !== deleteAllModal.shiftId);
        onSessionDataChange(updated);
        setDeleteAllModal({ isOpen: false, shiftId: null });
    };

    // Edit Mode Toggle
    const handleEditModeToggle = () => {
        if (hasChanges) {
            setEditModeConfirmModal({ isOpen: true });
        } else {
            onToggleEditMode();
        }
    };

    const confirmEditModeToggle = () => {
        setEditModeConfirmModal({ isOpen: false });
        onToggleEditMode();
    };


    // Calculations
    const calculateWorkedTimeWith24HourLogic = (session: SessionItem) =>
        getSessionTotalWorkedHours(session, sessionCtx);

    const calculateDayTotal = (date: string, sessions: SessionItem[]) => {
        const total = sessions.reduce((sum, item) => sum + getSessionHoursOnDate(item, date), 0);
        return parseFloat(total.toFixed(2));
    };

    /** Hours for this user on this date displayed in the grid. Uses getSessionHoursOnDate only so overnight sessions are not double-counted. */
    const calculateUserDayTotalFromGrid = (userId: number, date: string): number => {
        let total = 0;
        const shiftsOnDate = buildUserDateShifts.get(userId)?.get(date) ?? [];
        shiftsOnDate.forEach(shift => {
            if (!shift) return;
            const cellSessions = getSessionsForShift(shift, shift.scheduleSessionId, date, userId);
            cellSessions.forEach(session => {
                total += getSessionHoursOnDate(session, date);
            });
        });
        return parseFloat(total.toFixed(2));
    };

    const calculateUserTotal = (
        userId: number,
        sessions: SessionItem[],
        schedule: ScheduleItem[]
    ) => {
        const userSessions = sessions.filter(item => {
            const scheduleItem = schedule.find(si =>
                si.shifts.some(shift => shift.id === item.shiftId)
            );
            return scheduleItem?.userId === userId;
        });
        // Sum only hours that fall within current week dates (excludes next-week overflow, includes previous-week overflow)
        let total = 0;
        dateColumns.forEach(dateCol => {
            userSessions.forEach(session => {
                total += getSessionHoursOnDate(session, dateCol.date);
            });
        });
        return parseFloat(total.toFixed(2));
    };

    /** Row total: sum of getSessionHoursOnDate(session, date) for each cell in the row. groupId optional for group mode. */
    const calculateRowTotal = (
        userId: number,
        rowIdx: number,
        _sessions: SessionItem[],
        _schedule: ScheduleItem[],
        dateCols: { date: string }[],
        groupId?: string
    ) => {
        let rowTotal = 0;
        const shiftMap = groupId != null
            ? buildGroupDateShifts.get(groupId)
            : buildUserDateShifts.get(userId);
        dateCols.forEach(dateCol => {
            const shiftsOnDate = shiftMap?.get(dateCol.date) ?? [];
            const shift = shiftsOnDate[rowIdx];
            if (shift) {
                const cellSessions = getSessionsForShift(shift, shift.scheduleSessionId, dateCol.date, userId);
                cellSessions.forEach(session => {
                    rowTotal += getSessionHoursOnDate(session, dateCol.date);
                });
            }
        });
        return parseFloat(rowTotal.toFixed(2));
    };

    const calculateGrandTotal = (sessions: SessionItem[]) => {
        // Final total = sum of day totals in the grand total row (so it matches the displayed day columns)
        let total = 0;
        dateColumns.forEach(dateCol => {
            total += calculateDayTotal(dateCol.date, sessions);
        });
        return parseFloat(total.toFixed(2));
    };

    const hasTimeMismatch = (shift: Shift, sessions: SessionItem[], cellDate?: string): boolean => {
        if (!shift || sessions.length === 0) return false;
        const scheduledDuration = calculateHours(shift.startTime, shift.endTime);
        const totalActualTime = cellDate
            ? sessions.reduce((total, session) => total + getSessionHoursOnDate(session, cellDate), 0)
            : sessions.reduce((total, session) => total + calculateWorkedTimeWith24HourLogic(session), 0);
        const scheduleItem = scheduleData.find((item) =>
            item.shifts?.some((s) => s.id === shift.id)
        );
        const toleranceMinutes = scheduleItem?.timeSetup?.actualScheduledTime ?? 0;
        const toleranceHours = Math.max(toleranceMinutes / 60, 0.01);
        return Math.abs(totalActualTime - scheduledDuration) > toleranceHours;
    };

    const getUserRowCount = (userId: number) => {
        const dateMap = buildUserDateShifts.get(userId);
        if (!dateMap) return 1;
        let max = 1;
        for (const dc of dateColumns) {
            const len = (dateMap.get(dc.date)?.length) || 0;
            if (len > max) max = len;
        }
        return max;
    };

    // True when editing sessions for a shift that started in the previous week (overflow into current week) — start time is not editable
    const isOverflowShiftForEdit = useMemo(() => {
        if (!editShiftModal.isOpen || editShiftModal.shiftId == null || !currentWeekRange?.startOfWeek) return false;
        const shift = scheduleData.flatMap(s => s.shifts || []).find(sh => sh.id === editShiftModal.shiftId);
        return shift ? isOverflowShift(shift.date, currentWeekRange.startOfWeek) : false;
    }, [editShiftModal.isOpen, editShiftModal.shiftId, scheduleData, currentWeekRange]);

    // Keep calendar picker aligned with backend validation window:
    // check-in/out can be at most 24h around shift start/end.
    const editSessionDateLimits = useMemo(() => {
        if (!editShiftModal.isOpen || editShiftModal.shiftId == null) {
            return { minDate: "", maxDate: "" };
        }
        const shift = scheduleData.flatMap(s => s.shifts || []).find(sh => sh.id === editShiftModal.shiftId);
        if (!shift?.date) return { minDate: "", maxDate: "" };

        const shiftStartDate = normDate(String(shift.date));
        const shiftEndDate = shiftSpansNextDay(shift.startTime, shift.endTime)
            ? getAdjustedDate(shiftStartDate, 1)
            : shiftStartDate;

        return {
            minDate: getAdjustedDate(shiftStartDate, -1),
            maxDate: getAdjustedDate(shiftEndDate, 1),
        };
    }, [editShiftModal.isOpen, editShiftModal.shiftId, scheduleData]);

    const getRowRowCount = (row: RowGroup) => {
        const dateMap = buildGroupDateShifts.get(String(row.id));
        if (!dateMap) return 1;
        let max = 1;
        for (const dc of dateColumns) {
            const len = dateMap.get(dc.date)?.length ?? 0;
            if (len > max) max = len;
        }
        return max;
    };


    return {
        dateColumns,
        uniqueUsers,
        rowGroups,
        buildUserDateShifts,
        buildGroupDateShifts,
        getSessionsForShift,
        openEditShift,
        addEditSessionRow,
        removeEditSessionRow,
        saveEditShiftSessions,
        cancelEditShiftSessions: () => {
            setEditShiftModal({ isOpen: false, userId: null, date: null, shiftId: null });
            setEditSessions([]);
        },
        confirmDeleteUser,
        cancelDeleteUser: () => setDeleteUserModal({ isOpen: false, userId: null }),
        handleDeleteUser: (userId: number) => setDeleteUserModal({ isOpen: true, userId }),
        confirmDeleteAllForShift,
        cancelDeleteAllForShift: () => setDeleteAllModal({ isOpen: false, shiftId: null }),
        setDeleteAllModal, // Exposed as in original code
        handleEditModeToggle,
        confirmEditModeToggle,
        cancelEditModeToggle: () => setEditModeConfirmModal({ isOpen: false }),
        calculateDayTotal,
        calculateUserDayTotalFromGrid,
        calculateUserTotal,
        calculateRowTotal,
        calculateGrandTotal,
        hasTimeMismatch,
        getUserRowCount,
        getRowRowCount,
        sessionCtx,
        // State exposed
        deleteAllModal,
        deleteUserModal,
        editModeConfirmModal,
        editShiftModal,
        editSessions,
        setEditSessions, // for input changes
        isOverflowShiftForEdit,
        editSessionDateLimits,
    };
};

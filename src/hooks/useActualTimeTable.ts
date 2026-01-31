import { useState, useMemo } from "react";
import { ScheduleItem, SessionItem, Shift, RowGroup, User } from "../types/schedule";
import { formatDateLocal, formatDateStringLocal, formatTimeDisplay, calculateHours, minutesDiffWithWrap, doTimesOverlap, timeToMinutes, shiftSpansNextDay, getAdjustedDate, formatDateFromISO } from "../lib/utils";
import { isOverflowShift } from "../pages/Manager/ViewSchedule/utils";
import { useToast } from "./use-toast";

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
    const [editSessions, setEditSessions] = useState<Array<{ id: number | null; clockIn: string; clockOut: string }>>([]);

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

    // Unique users logic
    const uniqueUsers = useMemo(() => {
        const userMap = new Map();
        scheduleData.forEach(item => {
            if (!userMap.has(item.userId)) {
                userMap.set(item.userId, {
                    id: item.userId,
                    name: item.userName,
                    phone: item.userPhone,
                    clientName: item.clientName,
                    address: item.address
                });
            }
        });
        return Array.from(userMap.values());
    }, [scheduleData]);

    // Row groups for employee view
    const rowGroups: RowGroup[] = useMemo(() => {
        if (!selectedUserId) return [];
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
    }, [scheduleData, selectedUserId]);

    // Build user date shifts map
    const buildUserDateShifts = useMemo(() => {
        const map = new Map<number, Map<string, Shift[]>>();
        const shiftMap = new Map<number, Shift>();
        const scheduleSessionUserMap = new Map<number, number>();

        // 1. Collect shifts from scheduleData
        scheduleData.forEach(item => {
            if (item.shifts) {
                item.shifts.forEach(s => {
                    if (s.scheduleSessionId) {
                        scheduleSessionUserMap.set(s.scheduleSessionId, item.userId);
                    }
                    shiftMap.set(s.id, s);
                });
            }
        });

        // 2. Collect shifts from sessionData (extended data)
        // When session's shift has no startTime/endTime, derive from sessions' clockIn/clockOut so that
        // after editing overnight → same-day, the shift is treated as same-day and stays on the current day column.
        sessionData.forEach(session => {
            if (session.shift) {
                const s: Shift = {
                    id: session.shift.id,
                    date: session.shift.date,
                    startTime: session.shift.startTime || "00:00",
                    endTime: session.shift.endTime || "00:00",
                    hours: 0,
                    scheduleSessionId: session.scheduleSessionId
                };
                const existing = shiftMap.get(s.id);
                if (!existing) {
                    shiftMap.set(s.id, s);
                } else if (s.startTime === "00:00" && s.endTime === "00:00" && (existing.startTime !== "00:00" || existing.endTime !== "00:00")) {
                    const sessionsForShift = sessionData.filter(sd => sd.shiftId === s.id && sd.clockIn);
                    const withOut = sessionsForShift.filter(sd => sd.clockOut);
                    if (withOut.length > 0) {
                        const minIn = sessionsForShift.reduce((min, sd) => (sd.clockIn && (!min || sd.clockIn < min)) ? sd.clockIn : min, "" as string);
                        const maxOut = withOut.reduce((max, sd) => (sd.clockOut && (!max || sd.clockOut > max)) ? sd.clockOut : max, "" as string);
                        if (minIn && maxOut && timeToMinutes(maxOut) >= timeToMinutes(minIn)) {
                            shiftMap.set(s.id, { ...existing, startTime: minIn, endTime: maxOut });
                        }
                    }
                } else {
                    shiftMap.set(s.id, s);
                }
            }
        });

        // Helper to normalize date
        const normalizeDate = (d: string) => {
            if (d.includes('T')) return d.split('T')[0];
            return d;
        };

        const addShiftToMap = (userId: number, date: string, shift: Shift) => {
            if (!map.has(userId)) map.set(userId, new Map());
            const dateMap = map.get(userId)!;
            if (!dateMap.has(date)) dateMap.set(date, []);

            const list = dateMap.get(date)!;
            if (!list.find(existing => existing.id === shift.id)) {
                list.push(shift);
            }
        };

        // 3. Distribute shifts
        for (const shift of shiftMap.values()) {
            const userId = scheduleSessionUserMap.get(shift.scheduleSessionId!);
            if (!userId) continue;

            const targetDate = normalizeDate(shift.date);

            // Default: Shift is normal
            let isOvernight = false;

            if (shift.startTime && shift.endTime) {
                const startM = timeToMinutes(shift.startTime);
                const endM = timeToMinutes(shift.endTime);
                if (startM > endM) {
                    isOvernight = true;
                }
            }

            if (isOvernight) {
                // Part 1: Current Day -> extends to 24:00
                const split1: Shift = { ...shift, endTime: "24:00", hours: calculateHours(shift.startTime, "24:00"), isSplit: true, splitSide: 'start' };
                addShiftToMap(userId, targetDate, split1);

                // Part 2: Next Day -> starts at 00:00
                const [y, m, d] = targetDate.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);
                dateObj.setDate(dateObj.getDate() + 1);
                const nextDate = formatDateLocal(dateObj);

                const split2: Shift = { ...shift, startTime: "00:00", hours: calculateHours("00:00", shift.endTime), isSplit: true, splitSide: 'end' };
                addShiftToMap(userId, nextDate, split2);
            } else {
                addShiftToMap(userId, targetDate, shift);
            }
        }

        // Sort shifts by start time for consistent row mapping
        for (const userMap of map.values()) {
            for (const shifts of userMap.values()) {
                shifts.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
            }
        }

        return map;
    }, [scheduleData, sessionData]);

    // Helper functions
    const getSessionsForShift = (
        shiftId?: number | Shift,
        scheduleSessionId?: number,
        date?: string,
        userId?: number
    ): SessionItem[] => {
        let actualShiftId: number | undefined;
        let shiftObj: Shift | undefined;

        if (typeof shiftId === 'object') {
            shiftObj = shiftId;
            actualShiftId = shiftObj.id;
        } else {
            actualShiftId = shiftId;
        }

        if (!actualShiftId && !scheduleSessionId) return [];
        let sessions = sessionData.filter(s => s.shiftId === actualShiftId);

        // Fallback for "Whole Column" issue prevention
        if (!actualShiftId && sessions.length === 0 && scheduleSessionId && date && typeof userId === 'number') {
            const shiftsOnDate = buildUserDateShifts.get(userId)?.get(date) || [];
            if (shiftsOnDate.length > 0) {
                const bySessionIdAndDate = sessionData.filter(s => {
                    const d = s.shift?.date || s.scheduleSessionId;
                    const sDate = d ? formatDateStringLocal(String(d)) : '';
                    return s.scheduleSessionId === scheduleSessionId && sDate === date;
                });
                if (bySessionIdAndDate.length > 0) sessions = bySessionIdAndDate;
            }
        }

        if (sessions.length === 0) return [];

        // Lookup Shift Context
        if (!shiftObj && date && typeof userId === 'number' && actualShiftId) {
            const userShifts = buildUserDateShifts.get(userId)?.get(date);
            shiftObj = userShifts?.find(s => s.id === actualShiftId);
        }

        // Post-Process
        if (date) {
            return sessions.filter(s => {
                if (!s.clockIn) return true;
                const sIn = timeToMinutes(s.clockIn);

                if (shiftObj?.isSplit) {
                    if (shiftObj.splitSide === 'start') {
                        if (sIn >= 12 * 60) return true;
                        if (s.clockOut && timeToMinutes(s.clockOut) < sIn) return true;
                        return false;
                    } else if (shiftObj.splitSide === 'end') {
                        if (sIn < 12 * 60) return true;
                        if (s.clockOut && timeToMinutes(s.clockOut) < sIn) return true;
                        return false;
                    }
                }

                const sDateRaw = s.shift?.date || s.scheduleSessionId;
                const sDate = sDateRaw ? formatDateStringLocal(String(sDateRaw)) : '';

                if (sDate === date) {
                    return true;
                } else if (sDate !== date) {
                    if (sIn < 12 * 60) return true;
                    return false;
                }
                return true;
            }).map(s => {
                if (!s.clockIn || !s.clockOut) return s;
                const sIn = timeToMinutes(s.clockIn);
                const sOut = timeToMinutes(s.clockOut);

                if (sIn > sOut) {
                    if (shiftObj?.isSplit) {
                        if (shiftObj.splitSide === 'start') {
                            return { ...s, clockOut: "24:00", workedTime: calculateHours(s.clockIn, "24:00") };
                        } else if (shiftObj.splitSide === 'end') {
                            return { ...s, clockIn: "00:00", workedTime: calculateHours("00:00", s.clockOut) };
                        }
                    } else {
                        const sDateRaw = s.shift?.date || s.scheduleSessionId;
                        const sDate = sDateRaw ? formatDateStringLocal(String(sDateRaw)) : '';
                        if (sDate === date) {
                            return { ...s, clockOut: "24:00", workedTime: calculateHours(s.clockIn, "24:00") };
                        } else {
                            return { ...s, clockIn: "00:00", workedTime: calculateHours("00:00", s.clockOut) };
                        }
                    }
                }
                return s;
            }).sort((a, b) => (a.clockIn || '').localeCompare(b.clockIn || ''));
        }

        return sessions.sort((a, b) => (a.clockIn || '').localeCompare(b.clockIn || ''));
    };


    // Edit Shift Logic: for overnight shifts load full sessions (no date filter) so both cells edit the same session with full start/end; display stays split visually only
    const openEditShift = (userId: number, date: string, shiftId: number) => {
        const shift = scheduleData.flatMap(s => s.shifts || []).find(sh => sh.id === shiftId);
        const scheduleSessionId = shift?.scheduleSessionId;
        const isOvernight = shift && shiftSpansNextDay(shift.startTime, shift.endTime);
        const sessions = getSessionsForShift(shiftId, scheduleSessionId, isOvernight ? undefined : date, userId);
        setEditSessions(
            sessions.map(s => ({ id: s.id, clockIn: s.clockIn || "", clockOut: s.clockOut || "" }))
        );
        setEditShiftModal({ isOpen: true, userId, date, shiftId });
    };

    const addEditSessionRow = () => {
        const hasIncomplete = editSessions.some(r => !r.clockIn || r.clockIn.trim() === "");
        if (hasIncomplete) return;
        setEditSessions(prev => [...prev, { id: null, clockIn: "", clockOut: "" }]);
    };

    const removeEditSessionRow = (index: number) => {
        setEditSessions(prev => prev.filter((_, i) => i !== index));
    };

    const saveEditShiftSessions = () => {
        if (!editShiftModal.isOpen || editShiftModal.shiftId == null) return;

        for (let i = 0; i < editSessions.length; i++) {
            const row = editSessions[i];
            if (!row.clockIn) {
                toast({ title: "Validation Error", description: "Clock-in is required for every session.", variant: "destructive" });
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

        // 1. Same-shift overlap: use doTimesOverlap so overnight sessions (e.g. 23:00-01:00) are checked correctly. Open-ended (no clockOut) is treated as empty end time — skip overlap check for pairs where either has no end.
        const sorted = [...editSessions].sort((a, b) => a.clockIn.localeCompare(b.clockIn));
        for (let i = 0; i < sorted.length; i++) {
            for (let j = i + 1; j < sorted.length; j++) {
                if (!sorted[i].clockOut || !sorted[j].clockOut) continue; // open-ended: empty end time, not 24:00
                if (doTimesOverlap(sorted[i].clockIn, sorted[i].clockOut, sorted[j].clockIn, sorted[j].clockOut)) {
                    console.warn("[Session overlap] Same-shift overlap:", {
                        sessionA: { id: sorted[i].id, clockIn: sorted[i].clockIn, clockOut: sorted[i].clockOut },
                        sessionB: { id: sorted[j].id, clockIn: sorted[j].clockIn, clockOut: sorted[j].clockOut },
                    });
                    toast({ title: "Overlap", description: "Sessions overlap within the same shift.", variant: "destructive" });
                    return;
                }
            }
        }

        const shiftId = editShiftModal.shiftId;
        const date = editShiftModal.date!;
        const userId = editShiftModal.userId!;
        const prevDate = getAdjustedDate(date, -1);
        const nextDate = getAdjustedDate(date, 1);
        const shiftForDate = scheduleData.flatMap(s => s.shifts || []).find(sh => sh.id === shiftId);
        const editedSessionStartDate = shiftForDate?.date ? (shiftForDate.date.includes("T") ? shiftForDate.date.split("T")[0] : shiftForDate.date) : date;
        const editedSessionIds = new Set(editSessions.map(r => r.id).filter((id): id is number => id != null));
        // 2. Same-column + adjacent-day overlap: include sessions on current date, previous day, and next day for this user (overnight sessions span days). Exclude the session(s) being edited so we don't compare with ourselves.
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

        // Helper: two sessions overlap only if they overlap on the same calendar date (consider overnight segments per day)
        const sessionsOverlapInCalendar = (
            date1: string, clockIn1: string, clockOut1: string,
            date2: string, clockIn2: string, clockOut2: string
        ): boolean => {
            const norm = (d: string) => d.includes("T") ? d.split("T")[0] : d;
            const d1 = norm(date1);
            const d2 = norm(date2);
            const segs = (d: string, inT: string, outT: string): Array<{ date: string; startM: number; endM: number }> => {
                const startM = timeToMinutes(inT);
                const endM = timeToMinutes(outT);
                if (startM > endM) {
                    return [
                        { date: d, startM, endM: 24 * 60 },
                        { date: getAdjustedDate(d, 1), startM: 0, endM },
                    ];
                }
                return [{ date: d, startM, endM }];
            };
            const segs1 = segs(d1, clockIn1, clockOut1);
            const segs2 = segs(d2, clockIn2, clockOut2);
            for (const a of segs1) {
                for (const b of segs2) {
                    if (a.date !== b.date) continue;
                    if (a.startM < b.endM && b.startM < a.endM) return true;
                }
            }
            return false;
        };

        for (const row of editSessions) {
            for (const s of otherSessionsSameUserAndAdjacentDays) {
                if (!s.clockIn) continue;
                if (!row.clockOut || !s.clockOut) continue; // open-ended: empty end time — skip overlap check
                const otherDateRaw = s.shift?.date || s.scheduleSessionId;
                const otherDate = otherDateRaw ? formatDateStringLocal(String(otherDateRaw)) : "";
                if (sessionsOverlapInCalendar(editedSessionStartDate, row.clockIn, row.clockOut, otherDate, s.clockIn, s.clockOut)) {
                    console.warn("[Session overlap] Same-column/adjacent-day overlap (calendar):", {
                        editedRow: { id: row.id, date: editedSessionStartDate, clockIn: row.clockIn, clockOut: row.clockOut },
                        otherSession: { id: s.id, shiftId: s.shiftId, date: otherDate, clockIn: s.clockIn, clockOut: s.clockOut },
                    });
                    toast({ title: "Overlap", description: "Edited sessions overlap with another session on this date or an adjacent day (same user).", variant: "destructive" });
                    return;
                }
            }
        }

        const remaining = sessionData.filter(s => s.shiftId !== shiftId);
        const sessionDate = shiftForDate?.date ? (shiftForDate.date.includes("T") ? shiftForDate.date.split("T")[0] : shiftForDate.date) : date;
        // Use shift's start date (sessionDate) so the shift stays on the current day column after edit.
        const withClockOut = editSessions.filter(r => r.clockOut);
        const minClockIn = editSessions.length ? editSessions.reduce((min, r) => (r.clockIn && (!min || r.clockIn < min)) ? r.clockIn : min, "" as string) : "";
        const maxClockOut = withClockOut.length ? withClockOut.reduce((max, r) => (r.clockOut && (!max || r.clockOut > max)) ? r.clockOut : max, "" as string) : "";
        const shiftTimes = (minClockIn && maxClockOut) ? { startTime: minClockIn, endTime: maxClockOut } : {};
        const toAdd = editSessions.map(row => ({
            id: row.id ?? Date.now() + Math.floor(Math.random() * 1000),
            shiftId,
            scheduleSessionId: (scheduleData.find(si => si.shifts.some(sh => sh.id === shiftId))?.shifts.find(sh => sh.id === shiftId)?.scheduleSessionId)!,
            clockIn: row.clockIn,
            clockOut: row.clockOut || null,
            workedTime: row.clockOut ? calculateHours(row.clockIn, row.clockOut) : 0,
            shift: { id: shiftId, date: sessionDate, ...shiftTimes }
        })) as unknown as SessionItem[];

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
    const calculateWorkedTimeWith24HourLogic = (session: SessionItem) => {
        if (!session.clockIn || !session.clockOut) {
            return (session.workedTime || 0) / 60;
        }
        if (session.clockIn === session.clockOut) {
            return 24.0;
        }
        return calculateHours(session.clockIn, session.clockOut);
    };

    /** Hours of this session that fall on the given calendar date (splits overnight by date). */
    const getSessionHoursOnDate = (session: SessionItem, date: string): number => {
        const sessionDateRaw = session.shift?.date ?? session.scheduleSessionId;
        const sessionDate = sessionDateRaw ? formatDateStringLocal(String(sessionDateRaw)) : "";
        if (!session.clockIn) {
            return sessionDate === date ? (session.workedTime || 0) / 60 : 0;
        }
        if (!session.clockOut) {
            return sessionDate === date ? (session.workedTime || 0) / 60 : 0;
        }
        const sIn = timeToMinutes(session.clockIn);
        const sOut = timeToMinutes(session.clockOut);
        if (sIn <= sOut) {
            return sessionDate === date ? calculateHours(session.clockIn, session.clockOut) : 0;
        }
        const startDate = sessionDate;
        const endDate = sessionDate ? getAdjustedDate(sessionDate, 1) : "";
        if (date === startDate) return calculateHours(session.clockIn, "24:00");
        if (date === endDate) return calculateHours("00:00", session.clockOut);
        return 0;
    };

    const calculateDayTotal = (date: string, sessions: SessionItem[]) => {
        const total = sessions.reduce((sum, item) => sum + getSessionHoursOnDate(item, date), 0);
        return parseFloat(total.toFixed(2));
    };

    const calculateUserTotal = (
        userId: number,
        sessions: SessionItem[],
        schedule: ScheduleItem[]
    ) => {
        const total = sessions
            .filter(item => {
                const scheduleItem = schedule.find(si =>
                    si.shifts.some(shift => shift.id === item.shiftId)
                );
                return scheduleItem?.userId === userId;
            })
            .reduce((t, item) => t + calculateWorkedTimeWith24HourLogic(item), 0);
        return parseFloat(total.toFixed(2));
    };

    const calculateRowTotal = (
        userId: number,
        rowIdx: number,
        _sessions: SessionItem[],
        _schedule: ScheduleItem[],
        dateCols: { date: string }[]
    ) => {
        let rowTotal = 0;
        dateCols.forEach(dateCol => {
            const shiftsOnDate = buildUserDateShifts.get(userId)?.get(dateCol.date) ?? [];
            const shift = shiftsOnDate[rowIdx];
            if (shift) {
                const cellSessions = getSessionsForShift(shift, shift.scheduleSessionId, dateCol.date, userId);
                cellSessions.forEach(session => {
                    rowTotal += calculateWorkedTimeWith24HourLogic(session);
                });
            }
        });
        return parseFloat(rowTotal.toFixed(2));
    };

    const calculateGrandTotal = (sessions: SessionItem[]) => {
        const total = sessions.reduce((total, item) => total + calculateWorkedTimeWith24HourLogic(item), 0);
        return parseFloat(total.toFixed(2));
    };

    const hasTimeMismatch = (shift: Shift, sessions: SessionItem[]): boolean => {
        if (!shift || sessions.length === 0) return false;
        const scheduledDuration = calculateHours(shift.startTime, shift.endTime);
        const totalActualTime = sessions.reduce((total, session) => {
            return total + calculateWorkedTimeWith24HourLogic(session);
        }, 0);
        return Math.abs(totalActualTime - scheduledDuration) > 0.01;
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

    const getRowRowCount = (row: RowGroup) => {
        const userDays = scheduleData.filter(
            item =>
                item.userId === row.userId &&
                item.clientId === row.clientId &&
                item.addressId === row.addressId
        );
        let max = 1;
        for (const dc of dateColumns) {
            const date = dc.date;
            const startingShifts = userDays
                .filter(item => {
                    const itemDate = item.startDate.includes("T") ? formatDateFromISO(item.startDate) : item.startDate;
                    return itemDate === date;
                })
                .flatMap(item => item.shifts || [])
                .filter(s => !(s as any).isDelete);
            const prevDate = getAdjustedDate(date, -1);
            const prevDayShifts = userDays
                .filter(item => {
                    const itemDate = item.startDate.includes("T") ? formatDateFromISO(item.startDate) : item.startDate;
                    return itemDate === prevDate;
                })
                .flatMap(item => item.shifts || [])
                .filter(s => !(s as any).isDelete && shiftSpansNextDay(s.startTime, s.endTime));
            const totalShiftsForDay = startingShifts.length + prevDayShifts.length;
            max = Math.max(max, totalShiftsForDay);
        }
        return max;
    };


    return {
        dateColumns,
        uniqueUsers,
        rowGroups,
        buildUserDateShifts,
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
        calculateUserTotal,
        calculateRowTotal,
        calculateGrandTotal,
        hasTimeMismatch,
        getUserRowCount,
        getRowRowCount,
        // State exposed
        deleteAllModal,
        deleteUserModal,
        editModeConfirmModal,
        editShiftModal,
        editSessions,
        setEditSessions, // for input changes
        isOverflowShiftForEdit,
    };
};

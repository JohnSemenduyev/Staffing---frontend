import { useState, useMemo } from "react";
import { ScheduleItem, SessionItem, Shift, RowGroup, User } from "../types/schedule";
import { formatDateLocal, formatDateStringLocal, formatTimeDisplay, calculateHours, minutesDiffWithWrap, doTimesOverlap, timeToMinutes } from "../lib/utils";
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
        for (const item of scheduleData) {
            const u = item.userId;
            const d = item.startDate;
            if (!map.has(u)) map.set(u, new Map());
            const dateMap = map.get(u)!;
            dateMap.set(d, item.shifts || []);
        }
        return map;
    }, [scheduleData]);

    // Helper functions
    const getSessionsForShift = (
        shiftId?: number,
        scheduleSessionId?: number,
        date?: string,
        userId?: number
    ): SessionItem[] => {
        if (!shiftId && !scheduleSessionId) return [];
        const byShift = sessionData.filter(s => s.shiftId === shiftId);
        if (byShift.length > 0) return byShift.slice().sort((a, b) => (a.clockIn || '').localeCompare(b.clockIn || ''));

        if (scheduleSessionId && date && typeof userId === 'number') {
            const shiftsOnDate = buildUserDateShifts.get(userId)?.get(date) || [];
            if (shiftsOnDate.length === 1) {
                const bySessionIdAndDate = sessionData.filter(s => {
                    const d = s.shift?.date || s.scheduleSessionId;
                    const sDate = d ? formatDateStringLocal(String(d)) : '';
                    return s.scheduleSessionId === scheduleSessionId && sDate === date;
                });
                return bySessionIdAndDate.slice().sort((a, b) => (a.clockIn || '').localeCompare(b.clockIn || ''));
            }
        }
        return [];
    };

    // Edit Shift Logic
    const openEditShift = (userId: number, date: string, shiftId: number) => {
        const sessions = getSessionsForShift(shiftId, undefined, date, userId);
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

        const sorted = [...editSessions].sort((a, b) => a.clockIn.localeCompare(b.clockIn));
        for (let i = 0; i < sorted.length; i++) {
            for (let j = i + 1; j < sorted.length; j++) {
                if (sorted[i].clockOut && sorted[j].clockOut) {
                    const noOverlap = (sorted[i].clockOut <= sorted[j].clockIn) || (sorted[j].clockOut <= sorted[i].clockIn);
                    if (!noOverlap) {
                        toast({ title: "Overlap", description: "Sessions overlap within the same shift.", variant: "destructive" });
                        return;
                    }
                }
            }
        }

        const shiftId = editShiftModal.shiftId;
        const date = editShiftModal.date!;
        const userId = editShiftModal.userId!;
        const otherSessionsSameUserDate = sessionData.filter(s => {
            if (s.shiftId === shiftId) return false;
            const scheduleItem = scheduleData.find(si => si.shifts.some(sh => sh.id === s.shiftId));
            if (!scheduleItem) return false;
            if (scheduleItem.userId !== userId) return false;
            const sDateRaw = s.shift?.date || s.scheduleSessionId;
            const sDate = sDateRaw ? formatDateStringLocal(String(sDateRaw)) : '';
            return sDate === date;
        });

        for (const row of editSessions) {
            for (const s of otherSessionsSameUserDate) {
                if (!s.clockIn) continue;
                if (row.clockOut && s.clockOut) {
                    if (doTimesOverlap(row.clockIn, row.clockOut, s.clockIn, s.clockOut)) {
                        toast({ title: "Overlap", description: "Edited sessions overlap with other sessions on this date.", variant: "destructive" });
                        return;
                    }
                }
                if (!row.clockOut && s.clockOut) {
                    if (s.clockOut > row.clockIn) {
                        toast({ title: "Overlap", description: "Open-ended session overlaps with another session on this date.", variant: "destructive" });
                        return;
                    }
                }
            }
        }

        const remaining = sessionData.filter(s => s.shiftId !== shiftId);
        const toAdd = editSessions.map(row => ({
            id: row.id ?? Date.now() + Math.floor(Math.random() * 1000),
            shiftId,
            scheduleSessionId: (scheduleData.find(si => si.shifts.some(sh => sh.id === shiftId))?.shifts.find(sh => sh.id === shiftId)?.scheduleSessionId)!,
            clockIn: row.clockIn,
            clockOut: row.clockOut || null,
            workedTime: row.clockOut ? calculateHours(row.clockIn, row.clockOut) : 0,
            shift: { id: shiftId, date }
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

    const calculateDayTotal = (date: string, sessions: SessionItem[]) => {
        const total = sessions
            .filter(item => {
                const sessionDate = item.shift?.date || String(item.scheduleSessionId);
                const formattedSessionDate = sessionDate ? formatDateStringLocal(sessionDate) : "";
                return formattedSessionDate === date;
            })
            .reduce((total, item) => total + calculateWorkedTimeWith24HourLogic(item), 0);
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
        sessions: SessionItem[],
        schedule: ScheduleItem[],
        dateCols: { date: string }[]
    ) => {
        let rowTotal = 0;

        dateCols.forEach(dateCol => {
            const userShifts = schedule
                .filter(item => item.userId === userId)
                .flatMap(item => item.shifts)
                .filter(shift => {
                    let shiftDate: string;
                    if (shift.date.includes('T') && shift.date.includes('Z')) {
                        shiftDate = shift.date.split('T')[0];
                    } else if (shift.date.includes('T')) {
                        shiftDate = new Date(shift.date).toISOString().split('T')[0];
                    } else {
                        shiftDate = shift.date;
                    }
                    return shiftDate === dateCol.date;
                });

            const uniqueShifts = [...new Set(userShifts.map(s => s.id))];
            const currentShiftId = uniqueShifts[rowIdx];

            if (currentShiftId) {
                const sessionsForShift = sessions.filter(item => item.shiftId === currentShiftId);
                sessionsForShift.forEach(session => {
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

    const getRowRowCount = (row: RowGroup) => {
        let max = 1;
        for (const dc of dateColumns) {
            const dayShifts = scheduleData
                .filter(
                    item =>
                        item.userId === row.userId &&
                        item.clientId === row.clientId &&
                        item.addressId === row.addressId &&
                        item.startDate === dc.date
                )
                .flatMap(item => item.shifts || []);
            if (dayShifts.length > max) max = dayShifts.length;
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
    };
};

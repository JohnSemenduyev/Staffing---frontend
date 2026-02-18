import { useState, useCallback, useMemo } from "react";
import { ScheduleItem, SessionItem, Shift, RowGroup } from "../types/schedule";
import { useToast } from "./use-toast";
import {
    formatDateLocal,
    timeToMinutes,
    doTimesOverlap,
    shiftSpansNextDay,
    getAdjustedDate
} from "../lib/utils";
import { graphQLClient } from "../GraphqlClient";
import {
    CREATE_DRAFT_SCHEDULE_SESSIONS,
    DELETE_SCHEDULE_SESSION,
    UPDATE_SHIFT_END_TIME,
} from "../graphql/mutation";
import { isOverflowShift } from "../pages/Manager/ViewSchedule/utils";

interface UseScheduleTableProps {
    scheduleData: ScheduleItem[];
    sessionData?: SessionItem[];
    selectedDate: string;
    currentWeekRange: any;
    isEditMode: boolean;
    onScheduleDataChange: (newData: ScheduleItem[]) => void;
    onToggleEditMode: () => void;
    onDeleteSuccess?: () => void | Promise<void>;
    onDraftShiftDeletion?: (shift: any) => void;
    onDeleteSingleDraftSession?: (draftScheduleSessionId: number) => Promise<void>;
    selectedUserId?: number;
    apiExistingShiftsData?: Map<string, any[]>;
    existingShifts?: Shift[];
    hasChanges?: boolean;
    onUserAutoToggle?: (userId: number, enabled: boolean) => void;
    onShiftAutoToggle?: (userId: number, date: string, shiftId: number, enabled: boolean) => void;
}

// Helper types for better type safety
type ModalState = {
    isOpen: boolean;
    shiftId?: number | null;
    userId?: number | null;
    date?: string | null;
    shift?: Shift | null;
};

type DragState = {
    shift: Shift;
    sourceUserId: number;
    sourceDate: string;
    sourceRowIdx: number;
};

type DragOverCell = {
    userId: number;
    date: string;
    rowIdx: number;
};

export const useScheduleTable = ({
    scheduleData,
    sessionData = [],
    selectedDate,
    currentWeekRange,
    isEditMode,
    onScheduleDataChange,
    onToggleEditMode,
    onDeleteSuccess,
    onDraftShiftDeletion,
    onDeleteSingleDraftSession,
    selectedUserId,
    apiExistingShiftsData = new Map(),
    existingShifts = [],
    hasChanges,
    onUserAutoToggle,
    onShiftAutoToggle,
}: UseScheduleTableProps) => {
    const { toast: hookToast } = useToast();

    // State declarations
    const [deleteModal, setDeleteModal] = useState<ModalState>({ isOpen: false });
    const [editModal, setEditModal] = useState<ModalState>({ isOpen: false, shift: null });
    const [deleteUserModal, setDeleteUserModal] = useState<ModalState>({ isOpen: false });
    const [deleteLastShiftModal, setDeleteLastShiftModal] = useState<ModalState>({ isOpen: false });
    const [editModeConfirmModal, setEditModeConfirmModal] = useState({ isOpen: false });
    const [editForm, setEditForm] = useState({ starttime: "", endtime: "" });
    const [deletingUser, setDeletingUser] = useState(false);
    const [draggedShift, setDraggedShift] = useState<DragState | null>(null);
    const [dragOverCell, setDragOverCell] = useState<DragOverCell | null>(null);
    const [deletingLastShift, setDeletingLastShift] = useState(false);

    // Helper functions
    const hasTimeMismatch = useCallback((
        shift: Shift,
        session?: { clockIn?: string; clockOut?: string },
        toleranceMinutes: number = 0
    ): boolean => {
        if (!session) return false;

        const getDiff = (t1?: string, t2?: string) => {
            if (!t1 || !t2) return 0;
            return Math.abs(timeToMinutes(t1) - timeToMinutes(t2));
        };

        const startTimeDiff = getDiff(shift.startTime, session.clockIn);
        const endTimeDiff = getDiff(shift.endTime, session.clockOut);
        return startTimeDiff > toleranceMinutes || endTimeDiff > toleranceMinutes;
    }, []);

    const findSessionForShift = useCallback((shiftId: number) => {
        return sessionData.find((s) => s.shiftId === shiftId) || null;
    }, [sessionData]);

    const isDraftShift = useCallback((shift: Shift): boolean => {
        return !!(shift as any)?.draftShiftId || !!(shift as any)?.draftScheduleSessionId;
    }, []);

    const hasDraftData = useCallback((): boolean => {
        return scheduleData.some((item) =>
            item.draftScheduleSession ||
            item.shifts.some((shift: any) => !!(shift?.draftShiftId || shift?.draftScheduleSessionId))
        );
    }, [scheduleData]);

    const sortShiftsByTime = useCallback((shifts: Shift[]): Shift[] => {
        return [...shifts].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    }, []);

    /** On date D: our shift has head [ourStartTime, 24:00], previous-day shift has tail [00:00, prevShiftEnd]. Overlap only when those segments overlap on D. */
    const overlapsWithPrevDayShift = useCallback((ourStartTime: string, prevShiftEnd: string) => {
        const ourStartMin = timeToMinutes(ourStartTime);
        const prevEndMin = timeToMinutes(prevShiftEnd);
        return prevEndMin > ourStartMin + 1;
    }, []);

    /** Our shift (on date D) spans to D+1 with tail [00:00, ourEndTime] on D+1. Next-day shift starts at nextShiftStartTime on D+1. Overlap only if that tail overlaps their start segment on D+1. */
    const overlapsWithNextDayShift = useCallback((ourEndTime: string, nextShiftStartTime: string): boolean => {
        const ourEndMin = timeToMinutes(ourEndTime);
        const theirStartMin = timeToMinutes(nextShiftStartTime);
        return ourEndMin > theirStartMin + 1;
    }, []);

    const formatDateFromISO = useCallback((isoDate: string): string => {
        try {
            const date = new Date(isoDate);
            return formatDateLocal(date);
        } catch (error) {
            console.error("Error formatting date:", isoDate, error);
            return isoDate;
        }
    }, []);

    // Optimized overlap checking
    const checkShiftOverlap = useCallback((
        shift1: { startTime: string; endTime: string },
        shift2: { startTime: string; endTime: string }
    ): boolean => {
        return doTimesOverlap(shift1.startTime, shift1.endTime, shift2.startTime, shift2.endTime);
    }, []);

    const checkOverlapWithApiShifts = useCallback((
        userId: number,
        clientId: number,
        addressId: number,
        date: string,
        startTime: string,
        endTime: string,
        excludeShiftId?: number,
        excludeByOriginalTimes?: { startTime: string; endTime: string }
    ): boolean => {
        const key = `${clientId}-${addressId}-${userId}`;
        const userShifts = apiExistingShiftsData.get(key) || [];

        const isExcludedApiShift = (shift: any, shiftDate: string): boolean => {
            if (excludeShiftId != null && shift.id != null && shift.id == excludeShiftId) return true;
            if (excludeByOriginalTimes && shiftDate === date &&
                shift.startTime === excludeByOriginalTimes.startTime &&
                shift.endTime === excludeByOriginalTimes.endTime) return true;
            return false;
        };

        console.log("[Overlap] checkOverlapWithApiShifts", {
            userId,
            clientId,
            addressId,
            date,
            startTime,
            endTime,
            excludeShiftId,
            excludeByOriginalTimes,
            apiShiftsCount: userShifts.length,
        });

        const normalizeShiftDate = (shift: any): string => {
            return shift.date.includes("T") ? shift.date.split("T")[0] : shift.date;
        };

        // Check same day overlap
        let overlappingShift = userShifts.find((shift: any) => {
            const shiftDate = normalizeShiftDate(shift);
            if (shiftDate !== date) return false;
            if (isExcludedApiShift(shift, shiftDate)) return false;
            return checkShiftOverlap({ startTime, endTime }, shift);
        });

        // Check previous day overlap for shifts that span to next day
        if (!overlappingShift) {
            const prevDate = getAdjustedDate(date, -1);
            overlappingShift = userShifts.find((shift: any) => {
                const shiftDate = normalizeShiftDate(shift);
                if (shiftDate !== prevDate) return false;
                if (isExcludedApiShift(shift, shiftDate)) return false;
                if (!shiftSpansNextDay(shift.startTime, shift.endTime)) return false;
                return overlapsWithPrevDayShift(startTime, shift.endTime);
            });
        }

        // Check next day overlap for shifts that start today and span to next day
        if (!overlappingShift && shiftSpansNextDay(startTime, endTime)) {
            const nextDate = getAdjustedDate(date, 1);
            overlappingShift = userShifts.find((shift: any) => {
                const shiftDate = normalizeShiftDate(shift);
                if (shiftDate !== nextDate) return false;
                if (isExcludedApiShift(shift, shiftDate)) return false;
                return overlapsWithNextDayShift(endTime, shift.startTime);
            });
        }

        if (overlappingShift) {
            const shiftDateStr = normalizeShiftDate(overlappingShift);
            const [year, month, day] = shiftDateStr.split("-");
            const formattedDate = `${month}-${day}-${year}`;
            console.log("[Overlap] API overlap detected", {
                newTimes: `${startTime}-${endTime}`,
                overlappingShift: { id: overlappingShift.id, date: shiftDateStr, startTime: overlappingShift.startTime, endTime: overlappingShift.endTime },
            });
            hookToast({
                title: "Shift Overlapping",
                description: `Shift overlapping on date ${formattedDate} at ${overlappingShift.startTime}-${overlappingShift.endTime}`,
                variant: "destructive",
            });
            return true;
        }
        return false;
    }, [apiExistingShiftsData, checkShiftOverlap, overlapsWithPrevDayShift, overlapsWithNextDayShift, hookToast]);

    // Memoized computations
    const dateColumns = useMemo(() => {
        if (!currentWeekRange) return [];
        const dates = [];
        const startDate = new Date(currentWeekRange.startOfWeek);
        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            dates.push({
                date: formatDateLocal(date),
                display: `${String(date.getMonth() + 1).padStart(2, "0")}-${String(
                    date.getDate()
                ).padStart(2, "0")}-${date.getFullYear()}`,
            });
        }
        return dates;
    }, [currentWeekRange]);

    const rowGroups = useMemo((): RowGroup[] => {
        const groupByClient = Boolean(selectedUserId);
        const rowMap = new Map<string | number, RowGroup>();
        const currentWeekDates = new Set(dateColumns.map((c) => c.date));
        const weekStart = currentWeekRange?.startOfWeek;

        const hasSomethingInCurrentWeek = (item: ScheduleItem): boolean => {
            if (currentWeekDates.has(item.startDate)) return true;
            if (!weekStart || !isOverflowShift(item.startDate, weekStart)) return false;
            return item.shifts.some(
                (s: any) => !s.isDelete && shiftSpansNextDay(s.startTime, s.endTime)
            );
        };

        scheduleData.forEach((item) => {
            if (!hasSomethingInCurrentWeek(item)) return;
            const key = groupByClient ? `${item.userId}-${item.clientId}-${item.addressId}` : item.userId;
            if (!rowMap.has(key)) {
                rowMap.set(key, {
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

        return Array.from(rowMap.values());
    }, [scheduleData, selectedUserId, dateColumns, currentWeekRange]);

    // Common utility functions
    const calculateShiftHours = useCallback((start: string, end: string): number => {
        const [startH, startM] = start.split(":").map(Number);
        const [endH, endM] = end.split(":").map(Number);
        if (startH === endH && startM === endM) return 24.0;
        let hours = endH - startH + (endM - startM) / 60;
        if (hours < 0) hours += 24;
        return parseFloat(hours.toFixed(2));
    }, []);

    const getScheduleItem = useCallback((userId: number, date: string): ScheduleItem | undefined => {
        return scheduleData.find(item => item.userId === userId && item.startDate === date);
    }, [scheduleData]);

    const getVisualShifts = useCallback((userId: number, date: string): any[] => {
        // 1. Current day shifts
        const daySchedule = getScheduleItem(userId, date);
        const currentDayShifts = daySchedule
            ? daySchedule.shifts.filter((s) => !(s as any).isDelete).map(s => ({ ...s, isContinuation: false }))
            : [];

        // 2. Previous day shifts that span to today
        const prevDate = getAdjustedDate(date, -1);
        const prevDaySchedule = getScheduleItem(userId, prevDate);

        const prevDaySpanningShifts = prevDaySchedule
            ? prevDaySchedule.shifts
                .filter(s => !(s as any).isDelete && shiftSpansNextDay(s.startTime, s.endTime))
                .map(s => ({
                    ...s,
                    isContinuation: true,
                    originalDate: prevDate,
                    displayStartTime: "00:00"
                }))
            : [];

        // 3. Merge and sort
        const allShifts = [
            ...currentDayShifts.map(s => ({ ...s, displayStartTime: s.startTime })),
            ...prevDaySpanningShifts
        ];

        return allShifts.sort((a, b) => {
            const timeA = (a as any).displayStartTime;
            const timeB = (b as any).displayStartTime;
            return timeToMinutes(timeA) - timeToMinutes(timeB);
        });
    }, [getScheduleItem, getAdjustedDate]);

    // Shift deletion helpers
    const markShiftAsDeleted = useCallback((
        userId: number,
        date: string,
        shiftId: number
    ): ScheduleItem[] => {
        return scheduleData.map((item) => {
            if (item.userId === userId && item.startDate === date) {
                return {
                    ...item,
                    shifts: item.shifts.map((shift) =>
                        shift.id === shiftId
                            ? { ...shift, isDelete: true }
                            : shift
                    )
                };
            }
            return item;
        });
    }, [scheduleData]);

    // Overlap checking helpers
    const isExcludedShiftById = useCallback((s: Shift, excludeShiftId?: number) =>
        excludeShiftId != null && excludeShiftId !== undefined && Number(s.id) === Number(excludeShiftId), []);

    const checkLocalOverlaps = useCallback((
        userId: number,
        date: string,
        startTime: string,
        endTime: string,
        excludeShiftId?: number
    ): boolean => {
        const localShifts = scheduleData
            .filter(item => item.userId === userId && item.startDate === date)
            .flatMap(item => item.shifts)
            .filter(s => !(s as any).isDelete && !isExcludedShiftById(s, excludeShiftId));

        console.log("[Overlap] checkLocalOverlaps", {
            userId,
            date,
            startTime,
            endTime,
            excludeShiftId,
            shiftsChecked: localShifts.length,
            shiftIds: localShifts.map((s) => s.id),
        });

        const hasOverlap = localShifts.some((existingShift) => {
            const overlaps = checkShiftOverlap({ startTime, endTime }, existingShift);
            if (overlaps) {
                console.log("[Overlap] Local overlap detected (same day)", {
                    newTimes: `${startTime}-${endTime}`,
                    existingShift: { id: existingShift.id, startTime: existingShift.startTime, endTime: existingShift.endTime },
                });
            }
            return overlaps;
        });
        return hasOverlap;
    }, [scheduleData, checkShiftOverlap, isExcludedShiftById]);

    const checkAdjacentDayOverlaps = useCallback((
        userId: number,
        date: string,
        startTime: string,
        endTime: string,
        direction: 'prev' | 'next',
        excludeShiftId?: number
    ): boolean => {
        const adjacentDate = getAdjustedDate(date, direction === 'prev' ? -1 : 1);
        const adjacentShifts = scheduleData
            .filter(item => item.userId === userId && item.startDate === adjacentDate)
            .flatMap(item => item.shifts)
            .filter(s => !(s as any).isDelete && !isExcludedShiftById(s, excludeShiftId));

        console.log("[Overlap] checkAdjacentDayOverlaps", {
            userId,
            date,
            direction,
            adjacentDate,
            startTime,
            endTime,
            excludeShiftId,
            shiftsChecked: adjacentShifts.length,
        });

        if (direction === 'prev') {
            const prevDaySpans = adjacentShifts.filter(s => shiftSpansNextDay(s.startTime, s.endTime));
            const hasOverlap = prevDaySpans.some((prevShift) => {
                const overlaps = overlapsWithPrevDayShift(startTime, prevShift.endTime);
                if (overlaps) {
                    console.log("[Overlap] Adjacent-day overlap detected (previous day)", {
                        newTimes: `${startTime}-${endTime}`,
                        existingShift: { id: prevShift.id, startTime: prevShift.startTime, endTime: prevShift.endTime },
                    });
                }
                return overlaps;
            });
            return hasOverlap;
        } else {
            // Our shift (date D) spans to D+1 with tail [00:00, endTime] on D+1. Next-day shift has head [startTime, 24:00] on D+1. Overlap only when our tail extends past their start.
            const hasOverlap = adjacentShifts.some((nextShift) => {
                const overlaps = overlapsWithNextDayShift(endTime, nextShift.startTime);
                if (overlaps) {
                    console.log("[Overlap] Adjacent-day overlap detected (next day)", {
                        newTimes: `${startTime}-${endTime}`,
                        existingShift: { id: nextShift.id, startTime: nextShift.startTime, endTime: nextShift.endTime },
                    });
                }
                return overlaps;
            });
            return hasOverlap;
        }
    }, [scheduleData, checkShiftOverlap, overlapsWithPrevDayShift, overlapsWithNextDayShift, isExcludedShiftById]);

    // Handlers
    const handleDeleteShift = useCallback((userId: number, date: string, shiftId: number) => {
        const itemWithShift = scheduleData.find((i) => i.userId === userId && i.shifts.some((s: any) => s.id === shiftId));
        const shift = itemWithShift?.shifts.find((s: any) => s.id === shiftId);
        const isOverflow = shift && currentWeekRange?.startOfWeek && isOverflowShift(shift.date, currentWeekRange.startOfWeek);

        if (isOverflow) {
            setDeleteModal({ isOpen: true, shiftId, userId, date });
            return;
        }

        // Only consider shifts in the current week (ignore previous/next week schedule)
        const currentWeekDates = new Set(dateColumns.map((c) => c.date));
        const isItemInCurrentWeek = (item: ScheduleItem): boolean => {
            const itemDate = item.startDate.includes("T")
                ? formatDateFromISO(item.startDate)
                : item.startDate;
            return currentWeekDates.has(itemDate);
        };
        const userShiftsInCurrentWeek = scheduleData
            .filter((item) => item.userId === userId && isItemInCurrentWeek(item))
            .flatMap((item) => item.shifts)
            .filter((s) => !(s as any).isDelete);

        const isLastInCurrentWeek = userShiftsInCurrentWeek.length === 1 && userShiftsInCurrentWeek[0].id === shiftId;

        if (isLastInCurrentWeek) {
            setDeleteLastShiftModal({ isOpen: true, shiftId, userId, date });
        } else {
            setDeleteModal({ isOpen: true, shiftId, userId, date });
        }
    }, [scheduleData, currentWeekRange, dateColumns, formatDateFromISO]);

    const confirmDeleteShift = useCallback(async () => {
        const { userId, date, shiftId } = deleteModal;
        if (userId == null || shiftId == null || !date) return;

        const itemWithShift = scheduleData.find((i) => i.userId === userId && i.shifts.some((s: any) => s.id === shiftId));
        const shiftToDelete = itemWithShift?.shifts.find((s: any) => s.id === shiftId);
        const itemDate = itemWithShift?.startDate ?? date;

        if (!shiftToDelete) return;

        const isDraftShiftFlag = isDraftShift(shiftToDelete) || shiftToDelete.id > 2000000000000;

        if (isDraftShiftFlag && onDraftShiftDeletion) {
            onDraftShiftDeletion(shiftToDelete);
        }

        const isOverflow = currentWeekRange?.startOfWeek && isOverflowShift(shiftToDelete.date, currentWeekRange.startOfWeek);

        if (isOverflow) {
            const overflowCount = scheduleData
                .filter((i) => i.userId === userId)
                .flatMap((i) => i.shifts)
                .filter((s: any) => !s.isDelete && isOverflowShift(s.date, currentWeekRange!.startOfWeek)).length;

            if (overflowCount === 1) {
                try {
                    const token = sessionStorage.getItem("token");
                    await graphQLClient.request(
                        UPDATE_SHIFT_END_TIME,
                        {
                            input: {
                                items: [{
                                    shiftId,
                                    endTime: shiftToDelete.endTime ?? null,
                                    draft: false,
                                    isDelete: true,
                                }],
                            },
                        },
                        { Authorization: `Bearer ${token}` }
                    );
                    hookToast({ title: "Success", description: "Shift deleted successfully!" });
                    if (onDeleteSuccess) await onDeleteSuccess();
                } catch (err) {
                    console.error(err);
                    hookToast({ title: "Error", description: "Failed to delete shift.", variant: "destructive" });
                    return;
                }
            }

            const updatedData = markShiftAsDeleted(userId, itemDate, shiftId);
            onScheduleDataChange(updatedData);
            setDeleteModal({ isOpen: false });
            return;
        }

        const updatedData = markShiftAsDeleted(userId, itemDate, shiftId);
        onScheduleDataChange(updatedData);
        setDeleteModal({ isOpen: false });
    }, [deleteModal, scheduleData, currentWeekRange, isDraftShift, markShiftAsDeleted, onDraftShiftDeletion, onScheduleDataChange, onDeleteSuccess, hookToast]);

    const confirmDeleteLastShift = useCallback(async () => {
        setDeletingLastShift(true);
        const { userId } = deleteLastShiftModal;
        if (userId == null) return;

        try {
            // Only delete schedule for the current week; ignore previous/next week
            const currentWeekDates = new Set(dateColumns.map((c) => c.date));
            const isItemInCurrentWeek = (item: ScheduleItem): boolean => {
                const itemDate = item.startDate.includes("T")
                    ? formatDateFromISO(item.startDate)
                    : item.startDate;
                return currentWeekDates.has(itemDate);
            };

            const scheduleSessionIds = new Set<number>();
            const draftScheduleSessionIds = new Set<number>();

            scheduleData.forEach((item) => {
                if (item.userId !== userId) return;
                if (!isItemInCurrentWeek(item)) return;
                if (item.draftScheduleSession) {
                    item.shifts.forEach((s: any) => {
                        if (s?.draftScheduleSessionId) draftScheduleSessionIds.add(s.draftScheduleSessionId);
                    });
                } else {
                    item.shifts.forEach((s) => {
                        if (s.scheduleSessionId) scheduleSessionIds.add(s.scheduleSessionId);
                    });
                }
            });

            const token = sessionStorage.getItem("token");

            // Delete regular schedule sessions (current week only)
            const deleteResults = await Promise.allSettled(
                Array.from(scheduleSessionIds).map((id) =>
                    graphQLClient.request(
                        DELETE_SCHEDULE_SESSION,
                        { deleteScheduleSessionId: id },
                        { Authorization: `Bearer ${token}` }
                    )
                )
            );

            const failedDeletions = deleteResults.filter((result) => result.status === "rejected");
            if (failedDeletions.length > 0) {
                hookToast({ title: "Error", description: "Some schedule sessions could not be deleted.", variant: "destructive" });
                return;
            }

            // Mark draft sessions for deletion (current week only)
            if (draftScheduleSessionIds.size > 0) {
                const draftInput = Array.from(draftScheduleSessionIds)
                    .map((id) => ({ draftScheduleSessionId: id, isDelete: true }));
                await graphQLClient.request(
                    CREATE_DRAFT_SCHEDULE_SESSIONS,
                    { input: draftInput },
                    { Authorization: `Bearer ${token}` }
                );
            }

            // Remove only current-week schedule items for this user; keep previous/next week intact
            const updatedData = scheduleData.filter(
                (item) => item.userId !== userId || !isItemInCurrentWeek(item)
            );
            onScheduleDataChange(updatedData);
            onToggleEditMode();
            hookToast({ title: "Success", description: "Schedule deleted for current week." });
            if (onDeleteSuccess) await onDeleteSuccess();
        } catch (error) {
            console.error(error);
            hookToast({ title: "Error", description: "Failed to delete schedule.", variant: "destructive" });
        } finally {
            setDeletingLastShift(false);
            setDeleteLastShiftModal({ isOpen: false });
        }
    }, [deleteLastShiftModal, scheduleData, dateColumns, formatDateFromISO, onScheduleDataChange, onToggleEditMode, onDeleteSuccess, hookToast]);

    const handleDeleteUser = useCallback((userId: number) => {
        setDeleteUserModal({ isOpen: true, userId });
    }, []);

    const confirmDeleteUser = useCallback(async () => {
        setDeletingUser(true);
        const { userId } = deleteUserModal;
        if (userId == null) return;

        try {
            // Only delete schedule for the current week; leave previous/next week intact
            const currentWeekDates = new Set(dateColumns.map((c) => c.date));

            const isItemInCurrentWeek = (item: ScheduleItem): boolean => {
                const itemDate = item.startDate.includes("T")
                    ? formatDateFromISO(item.startDate)
                    : item.startDate;
                return currentWeekDates.has(itemDate);
            };

            const scheduleSessionIds = new Set<number>();
            const draftScheduleSessionIds = new Set<number>();

            scheduleData.forEach((item) => {
                if (item.userId !== userId) return;
                if (!isItemInCurrentWeek(item)) return;
                if (item.draftScheduleSession) {
                    item.shifts.forEach((s: any) => {
                        if (s?.draftScheduleSessionId) draftScheduleSessionIds.add(s.draftScheduleSessionId);
                    });
                } else {
                    item.shifts.forEach((s) => {
                        if (s.scheduleSessionId) scheduleSessionIds.add(s.scheduleSessionId);
                    });
                }
            });

            const token = sessionStorage.getItem("token");

            // Delete regular schedule sessions (current week only)
            const deleteResults = await Promise.allSettled(
                Array.from(scheduleSessionIds).map((id) =>
                    graphQLClient.request(
                        DELETE_SCHEDULE_SESSION,
                        { deleteScheduleSessionId: id },
                        { Authorization: `Bearer ${token}` }
                    )
                )
            );

            const failedDeletions = deleteResults.filter((result) => result.status === "rejected");
            if (failedDeletions.length > 0) {
                hookToast({
                    title: "Error",
                    description: "Some schedule sessions could not be deleted. Please try again.",
                    variant: "destructive",
                });
                return;
            }

            // Mark draft sessions for deletion (current week only)
            if (draftScheduleSessionIds.size > 0) {
                const draftInput = Array.from(draftScheduleSessionIds)
                    .map((id) => ({ draftScheduleSessionId: id, isDelete: true }));
                await graphQLClient.request(
                    CREATE_DRAFT_SCHEDULE_SESSIONS,
                    { input: draftInput },
                    { Authorization: `Bearer ${token}` }
                );
            }

            // Remove only current-week schedule items for this user; keep other weeks
            const updatedData = scheduleData.filter(
                (item) => item.userId !== userId || !isItemInCurrentWeek(item)
            );
            onScheduleDataChange(updatedData);
            onToggleEditMode();
            hookToast({ title: "Success", description: "Schedule deleted for current week." });
            if (onDeleteSuccess) await onDeleteSuccess();

        } catch (error) {
            console.error(error);
            hookToast({ title: "Error", description: "Failed to delete schedule.", variant: "destructive" });
        } finally {
            setDeletingUser(false);
            setDeleteUserModal({ isOpen: false });
        }
    }, [deleteUserModal, scheduleData, dateColumns, formatDateFromISO, onScheduleDataChange, onToggleEditMode, onDeleteSuccess, hookToast]);

    const handleEditModeToggle = useCallback(() => {
        if (hasChanges) setEditModeConfirmModal({ isOpen: true });
        else onToggleEditMode();
    }, [hasChanges, onToggleEditMode]);

    const confirmEditModeToggle = useCallback(() => {
        setEditModeConfirmModal({ isOpen: false });
        onToggleEditMode();
    }, [onToggleEditMode]);

    const cancelEditModeToggle = useCallback(() => {
        setEditModeConfirmModal({ isOpen: false });
    }, []);

    const handleEditShift = useCallback((userId: number, date: string, shift: Shift) => {
        setEditModal({ isOpen: true, shift, userId, date });
        setEditForm({ starttime: shift.startTime, endtime: shift.endTime });
    }, []);

    const cancelEditShift = useCallback(() => {
        setEditModal({ isOpen: false });
        setEditForm({ starttime: "", endtime: "" });
    }, []);

    const confirmEditShift = useCallback(() => {
        const { userId, date, shift } = editModal;
        if (!shift || userId == null || !date) return;

        const { starttime, endtime } = editForm;
        if (!starttime || !endtime) {
            hookToast({ title: "Validation Error", description: "Start and end time required.", variant: "destructive" });
            return;
        }

        console.log("[Overlap] confirmEditShift – running overlap checks", {
            userId,
            date,
            shiftId: shift.id,
            newTimes: `${starttime}-${endtime}`,
        });

        // Check local overlaps
        if (checkLocalOverlaps(userId, date, starttime, endtime, shift.id)) {
            console.log("[Overlap] confirmEditShift – blocked by local (same day) overlap");
            hookToast({ title: "Overlapping Shift", description: "Overlap detected.", variant: "destructive" });
            return;
        }

        // Check previous day overlaps
        if (checkAdjacentDayOverlaps(userId, date, starttime, endtime, 'prev', shift.id)) {
            console.log("[Overlap] confirmEditShift – blocked by previous day overlap");
            hookToast({ title: "Overlapping Shift", description: "Overlap with previous day shift.", variant: "destructive" });
            return;
        }

        // Check next day overlaps if shift spans to next day
        if (shiftSpansNextDay(starttime, endtime) &&
            checkAdjacentDayOverlaps(userId, date, starttime, endtime, 'next', shift.id)) {
            console.log("[Overlap] confirmEditShift – blocked by next day overlap");
            hookToast({
                title: "Overlapping Shift",
                description: "Shift time overlaps with existing shift on next day",
                variant: "destructive"
            });
            return;
        }

        // Check API overlaps (exclude current shift by id and by original times when API has no id)
        const targetSchedule = getScheduleItem(userId, date);
        if (targetSchedule && checkOverlapWithApiShifts(
            userId, targetSchedule.clientId, targetSchedule.addressId,
            date, starttime, endtime, shift.id,
            { startTime: shift.startTime, endTime: shift.endTime }
        )) {
            console.log("[Overlap] confirmEditShift – blocked by API overlap");
            return;
        }

        // Check backend overlaps
        const hasBackendOverlap = existingShifts?.some((backendShift) => {
            const shiftDateStr = backendShift.date.includes("T")
                ? backendShift.date.split("T")[0]
                : backendShift.date;
            if (shiftDateStr !== date) return false;
            if (backendShift.id == shift.id) return false;
            return checkShiftOverlap({ startTime: starttime, endTime: endtime }, backendShift);
        });

        if (hasBackendOverlap) {
            console.log("[Overlap] confirmEditShift – blocked by backend overlap");
            hookToast({ title: "Overlapping Shift", description: "Overlap with backend shifts.", variant: "destructive" });
            return;
        }

        console.log("[Overlap] confirmEditShift – no overlap; saving");

        // Update the shift
        const updatedData = scheduleData.map((item) => {
            if (item.userId === userId && item.startDate === date) {
                return {
                    ...item,
                    shifts: item.shifts.map((s) =>
                        s.id === shift.id
                            ? {
                                ...s,
                                startTime: starttime,
                                endTime: endtime,
                                hours: calculateShiftHours(starttime, endtime),
                                confirm: false,
                                reject: false
                            }
                            : s
                    )
                };
            }
            return item;
        });

        onScheduleDataChange(updatedData);
        setEditModal({ isOpen: false });
        setEditForm({ starttime: "", endtime: "" });
    }, [editModal, editForm, checkLocalOverlaps, checkAdjacentDayOverlaps,
        getScheduleItem, checkOverlapWithApiShifts, existingShifts,
        checkShiftOverlap, scheduleData, calculateShiftHours, onScheduleDataChange, hookToast]);

    const handleDragStart = useCallback((
        e: React.DragEvent,
        shift: Shift,
        sourceUserId: number,
        sourceDate: string,
        sourceRowIdx: number
    ) => {
        setDraggedShift({ shift, sourceUserId, sourceDate, sourceRowIdx });
        e.dataTransfer.effectAllowed = "copy";
    }, []);

    const handleDragOver = useCallback((
        e: React.DragEvent,
        targetUserId: number,
        targetDate: string,
        targetRowIdx: number
    ) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDragOverCell({ userId: targetUserId, date: targetDate, rowIdx: targetRowIdx });
    }, []);

    const handleDrop = useCallback((
        e: React.DragEvent,
        targetUserId: number,
        targetDate: string,
        targetRowIdx: number,
        targetClientId?: number,
        targetAddressId?: number
    ) => {
        e.preventDefault();
        if (!draggedShift) return;

        const { shift: draggedShiftRef, sourceUserId, sourceDate, sourceRowIdx } = draggedShift;

        // Clean up drag state helper
        const cleanupDragState = () => {
            setDraggedShift(null);
            setDragOverCell(null);
        };

        // Check if dropping in same location
        if (sourceUserId === targetUserId && sourceDate === targetDate && sourceRowIdx === targetRowIdx) {
            cleanupDragState();
            return;
        }

        const sourceSchedule = getScheduleItem(sourceUserId, sourceDate);
        if (!sourceSchedule) {
            cleanupDragState();
            return;
        }

        // Retrieve the authentic shift record from the source schedule using the ID
        // This ensures we get the clean object without visual properties like isContinuation
        const shift = sourceSchedule.shifts.find(s => s.id === draggedShiftRef.id);

        if (!shift) {
            cleanupDragState();
            return;
        }

        // Helper to create a copied shift.
        // When source is an overflow shift (previous week), do not copy scheduleSessionId so the new
        // shift is treated as current-week and will get checkScheduleSessionId from the target user's
        // schedule (or null if none) at save time.
        const sourceIsOverflow = currentWeekRange?.startOfWeek && isOverflowShift(shift.date, currentWeekRange.startOfWeek);
        const createCopiedShift = (): any => ({
            ...shift,
            id: Date.now(),
            date: targetDate,
            confirm: false,
            reject: false,
            scheduleSessionId: sourceIsOverflow ? undefined : sourceSchedule.shifts[0]?.scheduleSessionId,
            draftShiftId: null,
            draftScheduleSessionId: null,
            isDraft: true,
        });

        // Determine if we are dropping onto an existing shift (visual or actual)
        let excludeShiftId: number | undefined;
        let targetExisting: any = null;

        const visualShifts = getVisualShifts(targetUserId, targetDate);
        if (targetRowIdx < visualShifts.length) {
            targetExisting = visualShifts[targetRowIdx];
            excludeShiftId = targetExisting.id;
        }

        // Check overlaps with backend shifts
        const checkBackendOverlap = (): boolean => {
            return existingShifts.some((existingShift) => {
                const shiftDateStr = existingShift.date.includes("T")
                    ? existingShift.date.split("T")[0]
                    : existingShift.date;

                if (shiftDateStr === targetDate) {
                    return checkShiftOverlap(shift, existingShift);
                }

                // Check previous day
                if (shiftDateStr === getAdjustedDate(targetDate, -1) &&
                    shiftSpansNextDay(existingShift.startTime, existingShift.endTime)) {
                    return overlapsWithPrevDayShift(shift.startTime, existingShift.endTime);
                }

                // Check next day
                if (shiftSpansNextDay(shift.startTime, shift.endTime) &&
                    shiftDateStr === getAdjustedDate(targetDate, 1)) {
                    return checkShiftOverlap(shift, existingShift);
                }

                return false;
            });
        };

        // Check API overlaps
        const checkApiOverlap = (): boolean => {
            let targetSchedule = getScheduleItem(targetUserId, targetDate);
            if (!targetSchedule) targetSchedule = sourceSchedule;
            if (!targetSchedule) return false; // Should generally not happen if sourceSchedule exists, but specific TARGET data might be missing

            return checkOverlapWithApiShifts(
                targetUserId,
                targetSchedule.clientId,
                targetSchedule.addressId,
                targetDate,
                shift.startTime,
                shift.endTime
            );
        };

        // Handle overlap error
        const handleOverlapError = (message: string) => {
            hookToast({
                title: "Overlapping Shift",
                description: message,
                variant: "destructive",
            });
            cleanupDragState();
        };

        // Perform overlap checks
        if (checkBackendOverlap()) {
            handleOverlapError("Cannot drop shift here - it overlaps with existing shifts from backend.");
            return;
        }

        if (checkApiOverlap()) {
            cleanupDragState();
            return;
        }

        // Local overlap checks
        // Check against ALL existing shifts in the target date (no exclusions for drag-drop)
        if (checkLocalOverlaps(targetUserId, targetDate, shift.startTime, shift.endTime)) {
            handleOverlapError("Cannot drop shift here - it overlaps with existing shifts for this user and date.");
            return;
        }

        // Check adjacent day overlaps
        if (checkAdjacentDayOverlaps(targetUserId, targetDate, shift.startTime, shift.endTime, 'prev') ||
            (shiftSpansNextDay(shift.startTime, shift.endTime) &&
                checkAdjacentDayOverlaps(targetUserId, targetDate, shift.startTime, shift.endTime, 'next'))) {
            handleOverlapError("Cannot drop shift here - it overlaps with adjacent day shifts.");
            return;
        }

        // Create the new shift
        const copiedShift: any = createCopiedShift();
        copiedShift.draftShiftId = null;
        copiedShift.draftScheduleSessionId = null;
        // Ensure new ID to prevent conflicts with source shift if it's a copy operation (though React DnD usually implies move/copy intent)
        // If we are moving within same grid, we might technically be "moving" so we should probably keep ID?
        // BUT logic says "Always Add", effectively "Copy".
        // If it's a move, we usually delete source. But here we are just adding.
        // User said: "it not affect the old shift". So it IS a copy.
        // So we keep the ID generation from createCopiedShift (Date.now()).

        const existingSchedule = getScheduleItem(targetUserId, targetDate);

        let updatedScheduleData;

        if (existingSchedule) {
            updatedScheduleData = scheduleData.map((item) => {
                if (item.userId === targetUserId && item.startDate === targetDate) {
                    const updatedShifts = [...item.shifts, copiedShift];
                    return { ...item, shifts: sortShiftsByTime(updatedShifts) };
                }
                return item;
            });
        } else {
            // Create new ScheduleItem. Use target row's clientId/addressId when provided so
            // checkScheduleSessionId is looked up correctly for (targetClientId, targetAddressId, targetUserId)
            // at save time. If no schedule exists for current week for that user, it will be null/omitted in API.
            const newItem: ScheduleItem = {
                ...sourceSchedule,
                startDate: targetDate,
                shifts: [copiedShift],
                draftScheduleSession: undefined,
                userId: targetUserId,
                ...(targetClientId != null && targetAddressId != null
                    ? { clientId: targetClientId, addressId: targetAddressId }
                    : {}),
            };
            updatedScheduleData = [...scheduleData, newItem];
        }

        onScheduleDataChange(updatedScheduleData);
        cleanupDragState();

        hookToast({ title: "Success", description: "Shift copied successfully!" });

    }, [draggedShift, getScheduleItem, existingShifts, checkShiftOverlap, overlapsWithPrevDayShift,
        checkOverlapWithApiShifts, checkAdjacentDayOverlaps, scheduleData, selectedUserId,
        currentWeekRange, rowGroups, sortShiftsByTime, onScheduleDataChange, hookToast]);

    const handleUserAutoToggle = useCallback((userId: number, enabled: boolean) => {
        if (onUserAutoToggle) {
            onUserAutoToggle(userId, enabled);
        } else {
            const updatedData = scheduleData.map(item =>
                item.userId === userId
                    ? {
                        ...item,
                        auto: enabled,
                        shifts: item.shifts.map(s => ({ ...s, auto: enabled, confirm: false, reject: false }))
                    }
                    : item
            );
            onScheduleDataChange(updatedData);
        }
    }, [scheduleData, onUserAutoToggle, onScheduleDataChange]);

    const handleShiftAutoToggleLocal = useCallback((
        userId: number,
        date: string,
        shiftId: number,
        enabled: boolean
    ) => {
        const updated = scheduleData.map((item) => {
            if (item.userId === userId && item.startDate === date) {
                const newShifts = item.shifts.map((s) =>
                    s.id === shiftId
                        ? { ...s, auto: enabled, confirm: false, reject: false }
                        : s
                );
                const anyOn = newShifts.some((s) => s.auto === true);
                return { ...item, auto: anyOn, shifts: newShifts };
            }
            return item;
        });
        onScheduleDataChange(updated);
    }, [scheduleData, onScheduleDataChange]);

    const getMaxShiftsPerDay = useCallback((row: RowGroup, groupByClient: boolean): number => {
        const userDays = scheduleData.filter((i) => {
            if (i.userId !== row.userId) return false;
            if (!groupByClient) return true;
            return i.clientId === row.clientId && i.addressId === row.addressId;
        });

        // Loop through the visible dates to find the max shifts
        let max = 1;

        dateColumns.forEach(dateCol => {
            const date = dateCol.date;

            // 1. Shifts starting on this day
            const startingShifts = userDays
                .filter(d => {
                    const dDate = d.startDate.includes("T") ? formatDateFromISO(d.startDate) : d.startDate;
                    return dDate === date;
                })
                .flatMap(d => d.shifts)
                .filter(s => !(s as any).isDelete);

            // 2. Shifts from previous day spanning to this day
            const prevDate = getAdjustedDate(date, -1);
            const prevDayShifts = userDays
                .filter(d => {
                    const dDate = d.startDate.includes("T") ? formatDateFromISO(d.startDate) : d.startDate;
                    return dDate === prevDate;
                })
                .flatMap(d => d.shifts)
                .filter(s => !(s as any).isDelete && shiftSpansNextDay(s.startTime, s.endTime));

            const totalShiftsForDay = startingShifts.length + prevDayShifts.length;
            max = Math.max(max, totalShiftsForDay);
        });

        return max;
    }, [scheduleData, dateColumns, formatDateFromISO]);

    const calculateEffectiveHours = useCallback((shift: any, targetDate: string): number => {
        // If shift starts on targetDate
        if (shift.startDate === targetDate || (shift.date && shift.date === targetDate)) {
            if (shiftSpansNextDay(shift.startTime, shift.endTime)) {
                // First half: Start to 24:00
                return calculateShiftHours(shift.startTime, "24:00");
            } else {
                // Normal shift - calculate specifically from time to avoid backend 'hours' mismatch
                return calculateShiftHours(shift.startTime, shift.endTime);
            }
        }

        // If shift starts on previous day (continuation)
        const prevDate = getAdjustedDate(targetDate, -1);
        if (shift.startDate === prevDate || (shift.date && shift.date === prevDate)) {
            if (shiftSpansNextDay(shift.startTime, shift.endTime)) {
                // Second half: 00:00 to End
                return calculateShiftHours("00:00", shift.endTime);
            }
        }

        return 0;
    }, [calculateShiftHours, getAdjustedDate]);

    const calculateRowTotal = useCallback((row: RowGroup, groupByClient: boolean): number => {
        let total = 0;

        dateColumns.forEach(dateCol => {
            const currentDay = dateCol.date;
            const prevDay = getAdjustedDate(currentDay, -1);

            // 1. Shifts starting on currentDay
            scheduleData.forEach(item => {
                if (item.userId !== row.userId) return;
                if (groupByClient && (item.clientId !== row.clientId || item.addressId !== row.addressId)) return;

                const itemDate = item.startDate.includes("T") ? formatDateFromISO(item.startDate) : item.startDate;

                if (itemDate === currentDay) {
                    // Shifts starting today
                    item.shifts.forEach(s => {
                        if (!(s as any).isDelete) {
                            total += calculateEffectiveHours({ ...s, startDate: currentDay }, currentDay);
                        }
                    });
                } else if (itemDate === prevDay) {
                    // Shifts starting previous day
                    item.shifts.forEach(s => {
                        if (!(s as any).isDelete && shiftSpansNextDay(s.startTime, s.endTime)) {
                            total += calculateEffectiveHours({ ...s, startDate: prevDay }, currentDay);
                        }
                    });
                }
            });
        });

        return parseFloat(total.toFixed(2));
    }, [scheduleData, dateColumns, calculateEffectiveHours, getAdjustedDate, formatDateFromISO]);

    const calculateDayTotal = useCallback((date: string): number => {
        let total = 0;
        const prevDate = getAdjustedDate(date, -1);

        scheduleData.forEach(item => {
            const itemDate = item.startDate.includes("T") ? formatDateFromISO(item.startDate) : item.startDate;

            if (itemDate === date) {
                item.shifts.forEach(s => {
                    if (!(s as any).isDelete) {
                        total += calculateEffectiveHours({ ...s, startDate: date }, date);
                    }
                });
            } else if (itemDate === prevDate) {
                item.shifts.forEach(s => {
                    if (!(s as any).isDelete && shiftSpansNextDay(s.startTime, s.endTime)) {
                        total += calculateEffectiveHours({ ...s, startDate: prevDate }, date);
                    }
                });
            }
        });

        return parseFloat(total.toFixed(2));
    }, [scheduleData, calculateEffectiveHours, getAdjustedDate, formatDateFromISO]);

    const calculateGrandTotal = useCallback((currentScheduleData: ScheduleItem[]): number => {
        // Final total = sum of day totals in the grand total row (so it matches the displayed day columns)
        if (dateColumns.length === 0) return 0;
        let total = 0;
        dateColumns.forEach(col => {
            total += calculateDayTotal(col.date);
        });
        return parseFloat(total.toFixed(2));
    }, [dateColumns, calculateDayTotal]);

    const calculateUserDayTotal = useCallback((row: RowGroup, date: string, groupByClient: boolean): number => {
        let total = 0;
        const currentDay = date;
        const prevDay = getAdjustedDate(currentDay, -1);

        scheduleData.forEach(item => {
            if (item.userId !== row.userId) return;
            if (groupByClient && (item.clientId !== row.clientId || item.addressId !== row.addressId)) return;

            const itemDate = item.startDate.includes("T") ? formatDateFromISO(item.startDate) : item.startDate;

            if (itemDate === currentDay) {
                item.shifts.forEach(s => {
                    if (!(s as any).isDelete) {
                        total += calculateEffectiveHours({ ...s, startDate: currentDay }, currentDay);
                    }
                });
            } else if (itemDate === prevDay) {
                item.shifts.forEach(s => {
                    if (!(s as any).isDelete && shiftSpansNextDay(s.startTime, s.endTime)) {
                        total += calculateEffectiveHours({ ...s, startDate: prevDay }, currentDay);
                    }
                });
            }
        });
        return parseFloat(total.toFixed(2));
    }, [scheduleData, calculateEffectiveHours, getAdjustedDate, formatDateFromISO]);

    return {
        dateColumns,
        rowGroups,
        hasDraftData,
        deleteModal,
        setDeleteModal,
        editModal,
        setEditModal,
        deleteUserModal,
        setDeleteUserModal,
        deleteLastShiftModal,
        setDeleteLastShiftModal,
        editModeConfirmModal,
        setEditModeConfirmModal,
        editForm,
        setEditForm,
        deletingUser,
        deletingLastShift,
        draggedShift,
        dragOverCell,
        handleDeleteShift,
        confirmDeleteShift,
        cancelDeleteShift: useCallback(() => setDeleteModal({ isOpen: false }), []),
        handleDeleteUser,
        confirmDeleteUser,
        cancelDeleteUser: useCallback(() => setDeleteUserModal({ isOpen: false }), []),
        handleEditShift,
        confirmEditShift,
        cancelEditShift,
        confirmDeleteLastShift,
        cancelDeleteLastShift: useCallback(() => setDeleteLastShiftModal({ isOpen: false }), []),
        handleEditModeToggle,
        confirmEditModeToggle,
        cancelEditModeToggle,
        handleDragStart,
        handleDragOver,
        handleDragLeave: useCallback(() => setDragOverCell(null), []),
        handleDrop,
        handleUserAutoToggle,
        handleShiftAutoToggleLocal,
        getMaxShiftsPerDay,
        calculateRowTotal,
        calculateDayTotal,
        calculateGrandTotal,
        calculateUserDayTotal, // Export new function
        hasTimeMismatch,
        findSessionForShift,
        isDraftShift,
        formatDateFromISO,
        sortShiftsByTime
    };
};
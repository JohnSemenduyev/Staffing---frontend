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
} from "../graphql/mutation";

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
    const [editModal, setEditModal] = useState<ModalState>({ isOpen: false });
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

    const overlapsWithPrevDayShift = useCallback((newStart: string, newEnd: string, prevShiftEnd: string) => {
        return doTimesOverlap(newStart, newEnd, "00:00", prevShiftEnd);
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
        excludeShiftId?: number
    ): boolean => {
        const key = `${clientId}-${addressId}-${userId}`;
        const userShifts = apiExistingShiftsData.get(key) || [];

        const normalizeShiftDate = (shift: any): string => {
            return shift.date.includes("T") ? shift.date.split("T")[0] : shift.date;
        };

        // Check same day overlap
        let overlappingShift = userShifts.find((shift: any) => {
            if (normalizeShiftDate(shift) !== date) return false;
            if (excludeShiftId && shift.id === excludeShiftId) return false;
            return checkShiftOverlap({ startTime, endTime }, shift);
        });

        // Check previous day overlap for shifts that span to next day
        if (!overlappingShift) {
            const prevDate = getAdjustedDate(date, -1);
            overlappingShift = userShifts.find((shift: any) => {
                if (normalizeShiftDate(shift) !== prevDate) return false;
                if (excludeShiftId && shift.id === excludeShiftId) return false;
                if (!shiftSpansNextDay(shift.startTime, shift.endTime)) return false;
                return overlapsWithPrevDayShift(startTime, endTime, shift.endTime);
            });
        }

        // Check next day overlap for shifts that start today and span to next day
        if (!overlappingShift && shiftSpansNextDay(startTime, endTime)) {
            const nextDate = getAdjustedDate(date, 1);
            overlappingShift = userShifts.find((shift: any) => {
                if (normalizeShiftDate(shift) !== nextDate) return false;
                return checkShiftOverlap({ startTime, endTime }, shift);
            });
        }

        if (overlappingShift) {
            const shiftDateStr = normalizeShiftDate(overlappingShift);
            const [year, month, day] = shiftDateStr.split("-");
            const formattedDate = `${month}-${day}-${year}`;
            hookToast({
                title: "Shift Overlapping",
                description: `Shift overlapping on date ${formattedDate} at ${overlappingShift.startTime}-${overlappingShift.endTime}`,
                variant: "destructive",
            });
            return true;
        }
        return false;
    }, [apiExistingShiftsData, checkShiftOverlap, overlapsWithPrevDayShift, hookToast]);

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

        scheduleData.forEach((item) => {
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
    }, [scheduleData, selectedUserId]);

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
            .filter(s => !(s as any).isDelete && s.id !== excludeShiftId);

        return localShifts.some(existingShift =>
            checkShiftOverlap({ startTime, endTime }, existingShift)
        );
    }, [scheduleData, checkShiftOverlap]);

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
            .filter(s => !(s as any).isDelete && s.id !== excludeShiftId);

        if (direction === 'prev') {
            return adjacentShifts
                .filter(s => shiftSpansNextDay(s.startTime, s.endTime))
                .some(prevShift =>
                    overlapsWithPrevDayShift(startTime, endTime, prevShift.endTime)
                );
        } else {
            return adjacentShifts.some(nextShift =>
                checkShiftOverlap({ startTime, endTime }, nextShift)
            );
        }
    }, [scheduleData, checkShiftOverlap, overlapsWithPrevDayShift]);

    // Handlers
    const handleDeleteShift = useCallback((userId: number, date: string, shiftId: number) => {
        setDeleteModal({ isOpen: true, shiftId, userId, date });
    }, []);

    const confirmDeleteShift = useCallback(() => {
        const { userId, date, shiftId } = deleteModal;
        if (userId == null || shiftId == null || !date) return;

        const shiftToDelete = getScheduleItem(userId, date)?.shifts
            .find(shift => shift.id === shiftId);

        if (!shiftToDelete) return;

        const isDraftShiftFlag = isDraftShift(shiftToDelete) || shiftToDelete.id > 2000000000000;

        if (isDraftShiftFlag && onDraftShiftDeletion) {
            onDraftShiftDeletion(shiftToDelete);
        }

        const updatedData = markShiftAsDeleted(userId, date, shiftId);
        onScheduleDataChange(updatedData);
        setDeleteModal({ isOpen: false });
    }, [deleteModal, getScheduleItem, isDraftShift, markShiftAsDeleted, onDraftShiftDeletion, onScheduleDataChange]);

    const confirmDeleteLastShift = useCallback(async () => {
        setDeletingLastShift(true);
        const { userId } = deleteLastShiftModal;
        if (userId == null) return;

        try {
            const sessionIds = new Set<number>();
            scheduleData.forEach((item) => {
                if (item.userId === userId) {
                    item.shifts.forEach((s) => {
                        if (s.scheduleSessionId) sessionIds.add(s.scheduleSessionId);
                    });
                }
            });

            const token = sessionStorage.getItem("token");
            const deleteResults = await Promise.allSettled(
                Array.from(sessionIds).map((id) =>
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

            const updatedData = scheduleData.filter((item) => item.userId !== userId);
            onScheduleDataChange(updatedData);
            onToggleEditMode();
            hookToast({ title: "Success", description: "Schedule deleted successfully!" });
            if (onDeleteSuccess) await onDeleteSuccess();
        } catch (error) {
            console.error(error);
            hookToast({ title: "Error", description: "Failed to delete schedule.", variant: "destructive" });
        } finally {
            setDeletingLastShift(false);
            setDeleteLastShiftModal({ isOpen: false });
        }
    }, [deleteLastShiftModal, scheduleData, onScheduleDataChange, onToggleEditMode, onDeleteSuccess, hookToast]);

    const handleDeleteUser = useCallback((userId: number) => {
        setDeleteUserModal({ isOpen: true, userId });
    }, []);

    const confirmDeleteUser = useCallback(async () => {
        setDeletingUser(true);
        const { userId } = deleteUserModal;
        if (userId == null) return;

        try {
            const scheduleSessionIds = new Set<number>();
            const draftScheduleSessionIds = new Set<number>();

            scheduleData.forEach((item) => {
                if (item.userId !== userId) return;
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

            // Delete regular schedule sessions
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

            // Mark draft sessions for deletion
            if (draftScheduleSessionIds.size > 0) {
                const draftInput = Array.from(draftScheduleSessionIds)
                    .map((id) => ({ draftScheduleSessionId: id, isDelete: true }));
                await graphQLClient.request(
                    CREATE_DRAFT_SCHEDULE_SESSIONS,
                    { input: draftInput },
                    { Authorization: `Bearer ${token}` }
                );
            }

            const updatedData = scheduleData.filter((item) => item.userId !== userId);
            onScheduleDataChange(updatedData);
            onToggleEditMode();
            hookToast({ title: "Success", description: "Schedule deleted successfully!" });
            if (onDeleteSuccess) await onDeleteSuccess();

        } catch (error) {
            console.error(error);
            hookToast({ title: "Error", description: "Failed to delete schedule.", variant: "destructive" });
        } finally {
            setDeletingUser(false);
            setDeleteUserModal({ isOpen: false });
        }
    }, [deleteUserModal, scheduleData, onScheduleDataChange, onToggleEditMode, onDeleteSuccess, hookToast]);

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

        // Check local overlaps
        if (checkLocalOverlaps(userId, date, starttime, endtime, shift.id)) {
            hookToast({ title: "Overlapping Shift", description: "Overlap detected.", variant: "destructive" });
            return;
        }

        // Check previous day overlaps
        if (checkAdjacentDayOverlaps(userId, date, starttime, endtime, 'prev', shift.id)) {
            hookToast({ title: "Overlapping Shift", description: "Overlap with previous day shift.", variant: "destructive" });
            return;
        }

        // Check next day overlaps if shift spans to next day
        if (shiftSpansNextDay(starttime, endtime) &&
            checkAdjacentDayOverlaps(userId, date, starttime, endtime, 'next', shift.id)) {
            hookToast({
                title: "Overlapping Shift",
                description: "Shift time overlaps with existing shift on next day",
                variant: "destructive"
            });
            return;
        }

        // Check API overlaps
        const targetSchedule = getScheduleItem(userId, date);
        if (targetSchedule && checkOverlapWithApiShifts(
            userId, targetSchedule.clientId, targetSchedule.addressId,
            date, starttime, endtime, shift.id
        )) {
            return;
        }

        // Check backend overlaps
        const hasBackendOverlap = existingShifts?.some((backendShift) => {
            const shiftDateStr = backendShift.date.includes("T")
                ? backendShift.date.split("T")[0]
                : backendShift.date;
            if (shiftDateStr !== date) return false;
            if (backendShift.id === shift.id) return false;
            return checkShiftOverlap({ startTime: starttime, endTime: endtime }, backendShift);
        });

        if (hasBackendOverlap) {
            hookToast({ title: "Overlapping Shift", description: "Overlap with backend shifts.", variant: "destructive" });
            return;
        }

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
        targetRowIdx: number
    ) => {
        e.preventDefault();
        if (!draggedShift) return;

        const { shift, sourceUserId, sourceDate, sourceRowIdx } = draggedShift;

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

        // Helper to create a copied shift
        const createCopiedShift = (): any => ({
            ...shift,
            id: Date.now(),
            date: targetDate,
            confirm: false,
            reject: false,
            scheduleSessionId: sourceSchedule.shifts[0]?.scheduleSessionId,
            draftShiftId: null,
            draftScheduleSessionId: null,
            isDraft: true,
        });

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
                    return overlapsWithPrevDayShift(shift.startTime, shift.endTime, existingShift.endTime);
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
            if (!targetSchedule) return false;

            return checkOverlapWithApiShifts(
                targetUserId,
                targetSchedule.clientId,
                targetSchedule.addressId,
                targetDate,
                shift.startTime,
                shift.endTime,
                sourceDate === targetDate ? undefined : shift.id
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

        const existingSchedule = getScheduleItem(targetUserId, targetDate);

        if (existingSchedule) {
            const sortedShifts = sortShiftsByTime(
                existingSchedule.shifts.filter((s: any) => !(s as any).isDelete)
            );
            const targetCellHasData = targetRowIdx < sortedShifts.length;

            if (targetCellHasData) {
                // Replace existing shift
                const targetExisting = sortedShifts[targetRowIdx];

                // Check local overlaps (excluding the target shift)
                const hasLocalOverlap = sortedShifts.some((existingShift, index) => {
                    if (index === targetRowIdx) return false;
                    return checkShiftOverlap(shift, existingShift);
                });

                if (hasLocalOverlap) {
                    handleOverlapError("Cannot drop shift here - it overlaps with existing shifts for this user and date.");
                    return;
                }

                // Check adjacent day overlaps
                if (checkAdjacentDayOverlaps(targetUserId, targetDate, shift.startTime, shift.endTime, 'prev', targetExisting.id) ||
                    (shiftSpansNextDay(shift.startTime, shift.endTime) &&
                        checkAdjacentDayOverlaps(targetUserId, targetDate, shift.startTime, shift.endTime, 'next', targetExisting.id))) {
                    handleOverlapError("Cannot drop shift here - it overlaps with adjacent day shifts.");
                    return;
                }

                // Create replacement shift
                const replacementShift: any = createCopiedShift();
                replacementShift.id = targetExisting.id;
                replacementShift.draftShiftId = (targetExisting as any)?.draftShiftId ?? null;
                replacementShift.draftScheduleSessionId = (targetExisting as any)?.draftScheduleSessionId ?? null;
                replacementShift.scheduleSessionId = (targetExisting as any)?.scheduleSessionId ?? replacementShift.scheduleSessionId ?? null;

                // Update schedule data
                const updatedScheduleData = scheduleData.map((item) => {
                    if (item.userId === targetUserId && item.startDate === targetDate) {
                        const updatedShifts = item.shifts.map((s: any) =>
                            s.id === targetExisting.id ? replacementShift : s
                        );
                        return { ...item, shifts: sortShiftsByTime(updatedShifts) };
                    }
                    return item;
                });

                onScheduleDataChange(updatedScheduleData);
            } else {
                // Add new shift
                const hasLocalOverlap = sortedShifts.some(existingShift =>
                    checkShiftOverlap(shift, existingShift)
                );

                if (hasLocalOverlap) {
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

                const copiedShift: any = createCopiedShift();
                copiedShift.draftShiftId = null;
                copiedShift.draftScheduleSessionId = null;

                const updatedScheduleData = scheduleData.map((item) => {
                    if (item.userId === targetUserId && item.startDate === targetDate) {
                        const updatedShifts = [...item.shifts, copiedShift];
                        return { ...item, shifts: sortShiftsByTime(updatedShifts) };
                    }
                    return item;
                });

                onScheduleDataChange(updatedScheduleData);
            }
        } else {
            // Create new schedule row
            const groupByClient = Boolean(selectedUserId);
            const targetGroupKey = groupByClient
                ? `${targetUserId}-${sourceSchedule.clientId}-${sourceSchedule.addressId}`
                : targetUserId;
            const targetGroup = rowGroups.find((g) => g.id === targetGroupKey);

            const copiedShift = createCopiedShift();

            const newSchedule: ScheduleItem = {
                id: Date.now(),
                clientId: sourceSchedule.clientId,
                addressId: sourceSchedule.addressId,
                userId: targetUserId,
                startDate: targetDate,
                auto: sourceSchedule.auto,
                shifts: [copiedShift],
                clientName: sourceSchedule.clientName,
                address: sourceSchedule.address,
                userName: targetGroup?.name || sourceSchedule.userName,
                userPhone: targetGroup?.phone || sourceSchedule.userPhone,
            };

            const newData = [...scheduleData, newSchedule];
            onScheduleDataChange(newData);
        }

        hookToast({ title: "Success", description: "Shift copied successfully!" });
        cleanupDragState();
    }, [draggedShift, getScheduleItem, existingShifts, checkShiftOverlap, overlapsWithPrevDayShift,
        checkOverlapWithApiShifts, checkAdjacentDayOverlaps, scheduleData, selectedUserId,
        rowGroups, sortShiftsByTime, onScheduleDataChange, hookToast]);

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

        return userDays.reduce((max, d) => {
            const activeShifts = d.shifts.filter((shift) => !(shift as any).isDelete);
            return Math.max(max, activeShifts.length);
        }, 1);
    }, [scheduleData]);

    const calculateRowTotal = useCallback((row: RowGroup, groupByClient: boolean): number => {
        const total = scheduleData
            .filter((item) => {
                if (item.userId !== row.userId) return false;
                if (!groupByClient) return true;
                return item.clientId === row.clientId && item.addressId === row.addressId;
            })
            .reduce((total, item) => total + item.shifts
                .filter((shift) => !(shift as any).isDelete)
                .reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0);

        return parseFloat(total.toFixed(2));
    }, [scheduleData]);

    const calculateDayTotal = useCallback((date: string): number => {
        const total = scheduleData
            .filter(item => {
                const itemDate = item.startDate.includes("T")
                    ? formatDateFromISO(item.startDate)
                    : item.startDate;
                return itemDate === date;
            })
            .reduce((total, item) => total + item.shifts
                .filter(s => !(s as any).isDelete)
                .reduce((st, s) => st + s.hours, 0), 0);

        return parseFloat(total.toFixed(2));
    }, [scheduleData, formatDateFromISO]);

    const calculateGrandTotal = useCallback((currentScheduleData: ScheduleItem[]): number => {
        const total = currentScheduleData.reduce((total, item) => total + item.shifts
            .filter(s => !(s as any).isDelete)
            .reduce((st, s) => st + s.hours, 0), 0);
        return parseFloat(total.toFixed(2));
    }, []);

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
        hasTimeMismatch,
        findSessionForShift,
        isDraftShift,
        formatDateFromISO,
        sortShiftsByTime
    };
};
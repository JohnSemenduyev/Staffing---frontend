import React, { useState } from "react";
import { FaFileExport, FaFilePdf, FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { GripVertical, RotateCcw, Send, Calendar, Save } from "lucide-react";
import ToggleSwitch from "./ui/toggle";
import { useToast } from "../hooks/use-toast";
import { formatDateLocal, formatTimeDisplay, formatUSPhone } from "../lib/utils";
import { graphQLClient } from "../GraphqlClient";
import {
  CREATE_DRAFT_SCHEDULE_SESSIONS,
  DELETE_SCHEDULE_SESSION,
} from "../graphql/mutation";

interface Shift {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  scheduleSessionId?: number;
  clockIn?: string;
  clockOut?: string;
  auto?: boolean;
  confirm?: boolean;
  reject?: boolean;
  // NEW: flag if backend explicitly marks it as draft
  isDraft?: boolean;
  // Flag to mark deleted draft shifts
  isDelete?: boolean;
}

interface ScheduleItem {
  id: number;
  clientId: number;
  addressId: number;
  userId: number;
  startDate: string;
  auto: boolean;
  shifts: Shift[];
  clientName: string;
  address: string;
  userName: string;
  userPhone: string;
  draftScheduleSession?: boolean;
}

interface RowGroup {
  id: string | number;
  userId: number;
  name: string;
  phone?: string;
  clientName: string;
  address: string;
  clientId: number;
  addressId: number;
}

interface SessionItem {
  id: number;
  shiftId?: number;
  scheduleSessionId: number;
  clockIn: string;
  clockOut: string;
  workedTime: number;
  shift?: {
    id: number;
    date: string;
  };
}

interface ScheduleTableProps {
  scheduleData: ScheduleItem[];
  sessionData?: SessionItem[];
  selectedDate: string;
  currentWeekRange: any;
  isEditMode: boolean;
  onScheduleDataChange: (newData: ScheduleItem[]) => void;
  onPublish: () => void;
  onSave?: () => void;
  onPrint: () => void;
  onDownloadExcel: () => void;
  onToggleEditMode: () => void;
  onDeleteSuccess?: () => void | Promise<void>;
  onDraftShiftDeletion?: (shift: any) => void;
  isPublishing: boolean;
  isPrinting: boolean;
  isSaving?: boolean;
  readOnly?: boolean;
  selectedUserId?: number;
  loading?: boolean;
  onUserAutoToggle?: (userId: number, enabled: boolean) => void;
  onShiftAutoToggle?: (userId: number, date: string, shiftId: number, enabled: boolean) => void;
  onScheduleAutoToggle?: (enabled: boolean) => void;
  hideActionButtons?: boolean;
  existingShifts?: Shift[];
  apiExistingShiftsData?: Map<string, any[]>;
  hasChanges?: boolean;
}

// ---------- Helpers for draft + mismatch ----------

const hasTimeMismatch = (
  shift: Shift,
  session?: { clockIn?: string; clockOut?: string }
): boolean => {
  if (!session) return false;
  const startTimeMismatch = shift.startTime !== session.clockIn;
  const endTimeMismatch = shift.endTime !== session.clockOut;
  return startTimeMismatch || endTimeMismatch;
};

const findSessionForShift = (
  shiftId: number,
  sessionData?: SessionItem[]
): SessionItem | null => {
  if (!sessionData) return null;
  return sessionData.find((s) => s.shiftId === shiftId) || null;
};

// Decide if a shift should be treated as "draft" (only for actual draft data from backend)
const isDraftShift = (shift: Shift): boolean => {
  // Only show draft styling for shifts that actually come from draft data (have draftShiftId or draftScheduleSessionId)
  // Newly created shifts (synthetic IDs) should NOT show draft styling
  const hasDraftShiftId = !!(shift as any)?.draftShiftId;
  const hasDraftScheduleSessionId = !!(shift as any)?.draftScheduleSessionId;
  return hasDraftShiftId || hasDraftScheduleSessionId;
};

// ---------- Time helpers ----------

const doTimesOverlap = (start1: string, end1: string, start2: string, end2: string) => {
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const toRanges = (s: string, e: string): Array<[number, number]> => {
    const ss = timeToMinutes(s);
    const ee = timeToMinutes(e);
    if (ss === ee) return [[0, 24 * 60]];
    if (ee > ss) return [[ss, ee]];
    return [
      [ss, 24 * 60],
      [0, ee],
    ];
  };

  const ranges1 = toRanges(start1, end1);
  const ranges2 = toRanges(start2, end2);

  for (const a of ranges1) {
    for (const b of ranges2) {
      const aStart = a[0],
        aEnd = a[1];
      const bStart = b[0],
        bEnd = b[1];
      const hasRequiredGap = aEnd + 1 <= bStart || bEnd + 1 <= aStart;
      if (!hasRequiredGap) return true;
    }
  }
  return false;
};

const sortShiftsByTime = (shifts: Shift[]) => {
  return [...shifts].sort((a, b) => {
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    };
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });
};

const getMaxShiftsPerDay = (
  row: RowGroup,
  scheduleData: ScheduleItem[],
  groupByClient: boolean
) => {
  const userDays = scheduleData.filter((i) => {
    if (i.userId !== row.userId) return false;
    if (!groupByClient) return true;
    return i.clientId === row.clientId && i.addressId === row.addressId;
  });
  let max = 1;
  for (const d of userDays) {
    const activeShifts = d.shifts.filter((shift) => !(shift as any).isDelete);
    max = Math.max(max, activeShifts.length);
  }
  return max;
};

const calculateDayTotal = (date: string, scheduleData: ScheduleItem[]) => {
  const total = scheduleData
    .filter((item) => {
      let itemDate: string;
      if (item.startDate.includes("T") && item.startDate.includes("Z")) {
        itemDate = item.startDate.split("T")[0];
      } else if (item.startDate.includes("T")) {
        itemDate = formatDateLocal(new Date(item.startDate));
      } else {
        itemDate = item.startDate;
      }
      return itemDate === date;
    })
    .reduce(
      (total, item) =>
        total +
        item.shifts
          .filter((shift) => !(shift as any).isDelete)
          .reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0),
      0
    );
  return parseFloat(total.toFixed(2));
};

const calculateRowTotal = (
  row: RowGroup,
  scheduleData: ScheduleItem[],
  groupByClient: boolean
) => {
  const total = scheduleData
    .filter((item) => {
      if (item.userId !== row.userId) return false;
      if (!groupByClient) return true;
      return item.clientId === row.clientId && item.addressId === row.addressId;
    })
    .reduce(
      (total, item) =>
        total +
        item.shifts
          .filter((shift) => !(shift as any).isDelete)
          .reduce(
            (shiftTotal, shift) => shiftTotal + shift.hours,
            0
          ),
      0
    );
  return parseFloat(total.toFixed(2));
};

const calculateGrandTotal = (scheduleData: ScheduleItem[]) => {
  const total = scheduleData.reduce(
    (total, item) =>
      total + item.shifts
        .filter((shift) => !(shift as any).isDelete)
        .reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0),
    0
  );
  return parseFloat(total.toFixed(2));
};

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  scheduleData,
  sessionData = [],
  selectedDate,
  currentWeekRange,
  isEditMode,
  onScheduleDataChange,
  onPublish,
  onPrint,
  onDownloadExcel,
  onToggleEditMode,
  onDeleteSuccess,
  onDraftShiftDeletion,
  isPublishing,
  isPrinting,
  readOnly = false,
  loading = false,
  onUserAutoToggle,
  onShiftAutoToggle,
  onScheduleAutoToggle,
  hideActionButtons = false,
  existingShifts = [],
  apiExistingShiftsData = new Map(),
  hasChanges,
  selectedUserId,
  onSave,
  isSaving = false,
}) => {
  const { toast: hookToast } = useToast();
  // console.log("scheduleData", scheduleData);

  // Check if draft data exists (either draftShiftId in shifts or draftScheduleSession flag)
  const hasDraftData = () => {
    return scheduleData.some((item) => {
      // Check if schedule session has draftScheduleSession flag
      if (item.draftScheduleSession) {
        return true;
      }
      // Check if any shift has draftShiftId or draftScheduleSessionId
      return item.shifts.some((shift: any) => {
        return !!(shift?.draftShiftId || shift?.draftScheduleSessionId);
      });
    });
  };

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    shiftId: null as number | null,
    userId: null as number | null,
    date: null as string | null,
  });
  const [editModal, setEditModal] = useState({
    isOpen: false,
    shift: null as Shift | null,
    userId: null as number | null,
    date: null as string | null,
  });
  const [deleteUserModal, setDeleteUserModal] = useState({
    isOpen: false,
    userId: null as number | null,
  });
  const [editForm, setEditForm] = useState({ starttime: "", endtime: "" });
  const [deletingUser, setDeletingUser] = useState(false);
  const [draggedShift, setDraggedShift] = useState<any>(null);
  const [dragOverCell, setDragOverCell] = useState<any>(null);
  const [deletingLastShift, setDeletingLastShift] = useState(false);
  const [deleteLastShiftModal, setDeleteLastShiftModal] = useState({
    isOpen: false,
    shiftId: null as number | null,
    userId: null as number | null,
    date: null as string | null,
  });
  const [editModeConfirmModal, setEditModeConfirmModal] = useState({
    isOpen: false,
  });

  const isLastShiftForUser = (userId: number, shiftId: number) => {
    const userShifts = scheduleData
      .filter((item) => item.userId === userId)
      .flatMap((item) => item.shifts)
      .filter((s) => !(s as any).isDelete);

    return userShifts.length === 1 && userShifts[0].id === shiftId;
  };

  const checkOverlapWithApiShifts = (
    userId: number,
    clientId: number,
    addressId: number,
    date: string,
    startTime: string,
    endTime: string,
    excludeShiftId?: number
  ) => {
    const key = `${clientId}-${addressId}-${userId}`;
    const userShifts = apiExistingShiftsData.get(key) || [];
    const overlappingShift = userShifts.find((shift: any) => {
      const shiftDateStr = shift.date.includes("T")
        ? shift.date.split("T")[0]
        : shift.date;
      const dateMatch = shiftDateStr === date;
      if (!dateMatch) return false;
      const hasOverlap = doTimesOverlap(
        startTime,
        endTime,
        shift.startTime,
        shift.endTime
      );
      return hasOverlap;
    });

    if (overlappingShift) {
      const shiftDateStr = overlappingShift.date.includes("T")
        ? overlappingShift.date.split("T")[0]
        : overlappingShift.date;
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
  };

  const generateDateColumns = () => {
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
  };

  const formatDateFromISO = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      return formatDateLocal(date);
    } catch (error) {
      console.error("Error formatting date:", isoDate, error);
      return isoDate;
    }
  };

  const dateColumns = generateDateColumns();

  const getRowGroups = (): RowGroup[] => {
    const groupByClient = Boolean(selectedUserId);
    const rowMap = new Map<string | number, RowGroup>();

    scheduleData.forEach((item) => {
      const key = groupByClient
        ? `${item.userId}-${item.clientId}-${item.addressId}`
        : item.userId;

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
  };

  const rowGroups = getRowGroups();

  // ---------- Delete shift ----------

  const handleDeleteShift = (userId: number, date: string, shiftId: number) => {
    setDeleteModal({ isOpen: true, shiftId, userId, date });
  };

  const confirmDeleteShift = () => {
    const { userId, date, shiftId } = deleteModal;
    if (userId == null || shiftId == null || !date) return;

    // Find the shift being deleted
    const shiftToDelete = scheduleData
      .find(item => item.userId === userId && item.startDate === date)
      ?.shifts.find(shift => shift.id === shiftId);

    if (!shiftToDelete) return;

    // Check if it's a draft shift
    const isDraftShift = (shiftToDelete as any)?.draftShiftId || 
                        (shiftToDelete as any)?.draftScheduleSessionId ||
                        (shiftToDelete.id > 2000000000000);
    
    if (isDraftShift) {
      // For draft shifts, mark with isDelete flag instead of removing
      if (onDraftShiftDeletion) {
        onDraftShiftDeletion(shiftToDelete);
      }
      
      const updatedData = scheduleData.map((item) => {
        if (item.userId === userId && item.startDate === date) {
          return {
            ...item,
            shifts: item.shifts.map((shift) =>
              shift.id === shiftId ? { ...shift, isDelete: true } : shift
            ),
          };
        }
        return item;
      });

      onScheduleDataChange(updatedData);
      setDeleteModal({ isOpen: false, shiftId: null, userId: null, date: null });
      return;
    }

    // For non-draft shifts, use existing deletion logic
    if (isLastShiftForUser(userId, shiftId)) {
      setDeleteModal({ isOpen: false, shiftId: null, userId: null, date: null });
      setDeleteLastShiftModal({ isOpen: true, shiftId, userId, date });
      return;
    }

    const updatedData = scheduleData
      .map((item) => {
        if (item.userId === userId && item.startDate === date) {
          return {
            ...item,
            shifts: item.shifts.filter((shift) => shift.id !== shiftId),
          };
        }
        return item;
      })
      .filter((item) => item.shifts.length > 0);

    onScheduleDataChange(updatedData);
    setDeleteModal({ isOpen: false, shiftId: null, userId: null, date: null });
  };

  const cancelDeleteShift = () => {
    setDeleteModal({ isOpen: false, shiftId: null, userId: null, date: null });
  };

  // ---------- Delete entire schedule for last shift ----------

  const confirmDeleteLastShift = async () => {
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

      const failedDeletions = deleteResults.filter(
        (result) => result.status === "rejected"
      );

      if (failedDeletions.length > 0) {
        hookToast({
          title: "Error",
          description:
            "Some schedule sessions could not be deleted. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const graphQLErrors = deleteResults
        .filter((result) => result.status === "fulfilled")
        .map((result) => {
          if (result.status === "fulfilled") {
            const response = result.value as any;
            return response?.errors;
          }
          return null;
        })
        .filter((errors) => errors && errors.length > 0)
        .flat();

      if (graphQLErrors.length > 0) {
        const errorMessage =
          (graphQLErrors[0] as any)?.message || "Failed to delete schedule";
        hookToast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      const updatedData = scheduleData.filter((item) => item.userId !== userId);
      onScheduleDataChange(updatedData);
      onToggleEditMode();

      hookToast({
        title: "Success",
        description: "Schedule deleted successfully!",
      });

      if (onDeleteSuccess) {
        await onDeleteSuccess();
      }
    } catch (error) {
      console.error("Error deleting schedule:", error);
      hookToast({
        title: "Error",
        description: "Failed to delete schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingLastShift(false);
      setDeleteLastShiftModal({
        isOpen: false,
        shiftId: null,
        userId: null,
        date: null,
      });
    }
  };

  const cancelDeleteLastShift = () => {
    setDeleteLastShiftModal({
      isOpen: false,
      shiftId: null,
      userId: null,
      date: null,
    });
  };

  // ---------- Edit mode toggle ----------

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

  const cancelEditModeToggle = () => {
    setEditModeConfirmModal({ isOpen: false });
  };

  // ---------- Edit shift ----------

  const handleEditShift = (userId: number, date: string, shift: Shift) => {
    setEditModal({ isOpen: true, shift, userId, date });
    setEditForm({
      starttime: shift.startTime,
      endtime: shift.endTime,
    });
  };

  const confirmEditShift = () => {
    const { userId, date, shift } = editModal;
    if (!shift || userId == null || !date) return;

    if (!editForm.starttime || !editForm.endtime) {
      hookToast({
        title: "Validation Error",
        description: "Start time and end time are required.",
        variant: "destructive",
      });
      return;
    }

    const localExistingShifts = scheduleData
      .filter((item) => item.userId === userId && item.startDate === date)
      .flatMap((item) => item.shifts);

    for (const existingShift of localExistingShifts) {
      if (existingShift.id === shift.id) continue;
      if (
        doTimesOverlap(
          editForm.starttime,
          editForm.endtime,
          existingShift.startTime,
          existingShift.endTime
        )
      ) {
        hookToast({
          title: "Overlapping Shift",
          description:
            "Shift time overlaps with existing shift for this user and date",
          variant: "destructive",
        });
        return;
      }
    }

    const targetSchedule = scheduleData.find(
      (item) => item.userId === userId && item.startDate === date
    );
    if (
      targetSchedule &&
      checkOverlapWithApiShifts(
        userId,
        targetSchedule.clientId,
        targetSchedule.addressId,
        date,
        editForm.starttime,
        editForm.endtime,
        shift.id
      )
    ) {
      return;
    }

    const hasBackendOverlap = existingShifts?.some((backendShift) => {
      const shiftDateStr = backendShift.date.includes("T")
        ? backendShift.date.split("T")[0]
        : backendShift.date;
      const dateMatch = shiftDateStr === date;
      if (!dateMatch) return false;
      if (backendShift.id === shift.id) return false;
      return doTimesOverlap(
        editForm.starttime,
        editForm.endtime,
        backendShift.startTime,
        backendShift.endTime
      );
    });

    if (hasBackendOverlap) {
      hookToast({
        title: "Overlapping Shift",
        description: "Shift time overlaps with existing shifts from backend.",
        variant: "destructive",
      });
      return;
    }

    const calculateHours = (start: string, end: string) => {
      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);

      if (startH === endH && startM === endM) {
        return 24.0;
      }

      let hours = endH - startH + (endM - startM) / 60;
      if (hours < 0) hours += 24;
      return parseFloat(hours.toFixed(2));
    };

    const updatedData = scheduleData.map((item) => {
      if (item.userId === userId && item.startDate === date) {
        return {
          ...item,
          shifts: item.shifts.map((s) =>
            s.id === shift.id
              ? {
                  ...s,
                  startTime: editForm.starttime,
                  endTime: editForm.endtime,
                  hours: calculateHours(
                    editForm.starttime,
                    editForm.endtime
                  ),
                  confirm: false,
                  reject: false,
                }
              : s
          ),
        };
      }
      return item;
    });

    onScheduleDataChange(updatedData);
    setEditModal({ isOpen: false, shift: null, userId: null, date: null });
    setEditForm({ starttime: "", endtime: "" });
  };

  const cancelEditShift = () => {
    setEditModal({ isOpen: false, shift: null, userId: null, date: null });
    setEditForm({ starttime: "", endtime: "" });
  };

  // ---------- Delete all user data ----------

  const handleDeleteUser = (userId: number) => {
    setDeleteUserModal({ isOpen: true, userId });
  };

  const confirmDeleteUser = async () => {
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
            if (s?.draftScheduleSessionId) {
              draftScheduleSessionIds.add(s.draftScheduleSessionId);
            }
          });
        } else {
          item.shifts.forEach((s) => {
            if (s.scheduleSessionId) scheduleSessionIds.add(s.scheduleSessionId);
          });
        }
      });

      const token = sessionStorage.getItem("token");

      // Delete published schedule sessions
      const deleteResults = await Promise.allSettled(
        Array.from(scheduleSessionIds).map((id) =>
          graphQLClient.request(
            DELETE_SCHEDULE_SESSION,
            { deleteScheduleSessionId: id },
            { Authorization: `Bearer ${token}` }
          )
        )
      );

      const failedDeletions = deleteResults.filter(
        (result) => result.status === "rejected"
      );

      if (failedDeletions.length > 0) {
        hookToast({
          title: "Error",
          description:
            "Some schedule sessions could not be deleted. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const graphQLErrors = deleteResults
        .filter((result) => result.status === "fulfilled")
        .map((result) => {
          if (result.status === "fulfilled") {
            const response = result.value as any;
            return response?.errors;
          }
          return null;
        })
        .filter((errors) => errors && errors.length > 0)
        .flat();

      if (graphQLErrors.length > 0) {
        const errorMessage =
          (graphQLErrors[0] as any)?.message || "Failed to delete schedule";
        hookToast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      // Delete draft schedule sessions
      if (draftScheduleSessionIds.size > 0) {
        const draftInput = Array.from(draftScheduleSessionIds).map((id) => ({
          draftScheduleSessionId: id,
          isDelete: true,
        }));

        await graphQLClient.request(
          CREATE_DRAFT_SCHEDULE_SESSIONS,
          { input: draftInput },
          { Authorization: `Bearer ${token}` }
        );
      }

      const updatedData = scheduleData.filter((item) => item.userId !== userId);
      onScheduleDataChange(updatedData);
      onToggleEditMode();

      hookToast({
        title: "Success",
        description: "Schedule deleted successfully!",
      });

      if (onDeleteSuccess) {
        await onDeleteSuccess();
      }
    } catch (error) {
      console.error("Error deleting schedule:", error);
      hookToast({
        title: "Error",
        description: "Failed to delete schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingUser(false);
      setDeleteUserModal({ isOpen: false, userId: null });
    }
  };

  const cancelDeleteUser = () => {
    setDeleteUserModal({ isOpen: false, userId: null });
  };

  // ---------- Auto toggle ----------

  const handleUserAutoToggle = (userId: number, enabled: boolean) => {
    if (onUserAutoToggle) {
      onUserAutoToggle(userId, enabled);
    } else {
      const updatedData = scheduleData.map((item) =>
        item.userId === userId
          ? {
              ...item,
              auto: enabled,
              shifts: item.shifts.map((s) => ({
                ...s,
                auto: enabled,
                confirm: false,
                reject: false,
              })),
            }
          : item
      );
      onScheduleDataChange(updatedData);
    }
  };

  // ---------- Drag & drop ----------

  const handleDragStart = (
    e: React.DragEvent,
    shift: Shift,
    sourceUserId: number,
    sourceDate: string,
    sourceRowIdx: number
  ) => {
    setDraggedShift({
      shift,
      sourceUserId,
      sourceDate,
      sourceRowIdx,
    });
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (
    e: React.DragEvent,
    targetUserId: number,
    targetDate: string,
    targetRowIdx: number
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverCell({ userId: targetUserId, date: targetDate, rowIdx: targetRowIdx });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverCell(null);
  };

  const handleDrop = (
    e: React.DragEvent,
    targetUserId: number,
    targetDate: string,
    targetRowIdx: number
  ) => {
    e.preventDefault();

    if (!draggedShift) {
      return;
    }

    const { shift, sourceUserId, sourceDate, sourceRowIdx } = draggedShift;

    const cleanupDragState = () => {
      setDraggedShift(null);
      setDragOverCell(null);
    };

    if (
      sourceUserId === targetUserId &&
      sourceDate === targetDate &&
      sourceRowIdx === targetRowIdx
    ) {
      cleanupDragState();
      return;
    }

    const checkBackendOverlap = () => {
      return existingShifts.some((existingShift) => {
        const shiftDateStr = existingShift.date.includes("T")
          ? existingShift.date.split("T")[0]
          : existingShift.date;

        return (
          shiftDateStr === targetDate &&
          doTimesOverlap(
            shift.startTime,
            shift.endTime,
            existingShift.startTime,
            existingShift.endTime
          )
        );
      });
    };

    const handleOverlapError = (message: string) => {
      hookToast({
        title: "Overlapping Shift",
        description: message,
        variant: "destructive",
      });
      cleanupDragState();
    };

    const sourceSchedule = scheduleData.find(
      (item) => item.userId === sourceUserId && item.startDate === sourceDate
    );

    const checkApiOverlapFn = () => {
      let targetSchedule = scheduleData.find(
        (item) => item.userId === targetUserId && item.startDate === targetDate
      );

      if (!targetSchedule) {
        targetSchedule = sourceSchedule;
      }

      if (!targetSchedule) return false;

      return checkOverlapWithApiShifts(
        targetUserId,
        targetSchedule.clientId,
        targetSchedule.addressId,
        targetDate,
        shift.startTime,
        shift.endTime
      );
    };

    if (checkBackendOverlap()) {
      handleOverlapError(
        "Cannot drop shift here - it overlaps with existing shifts from backend."
      );
      return;
    }

    if (checkApiOverlapFn()) {
      cleanupDragState();
      return;
    }

    const existingSchedule = scheduleData.find(
      (item) => item.userId === targetUserId && item.startDate === targetDate
    );

    if (!sourceSchedule) {
      cleanupDragState();
      return;
    }

    const createCopiedShift = () => ({
      ...shift,
      id: Date.now(),
      date: targetDate,
      confirm: false,
      reject: false,
      scheduleSessionId: sourceSchedule.shifts[0]?.scheduleSessionId,
      isDraft: true, // new copied shifts are draft until published
    });

    if (existingSchedule) {
      const sortedShifts = sortShiftsByTime(existingSchedule.shifts);
      const targetCellHasData = targetRowIdx < sortedShifts.length;

      if (targetCellHasData) {
        const hasLocalOverlap = sortedShifts.some((existingShift, index) => {
          if (index === targetRowIdx) return false;
          return doTimesOverlap(
            shift.startTime,
            shift.endTime,
            existingShift.startTime,
            existingShift.endTime
          );
        });

        if (hasLocalOverlap) {
          handleOverlapError(
            "Cannot drop shift here - it overlaps with existing shifts for this user and date."
          );
          return;
        }

        const originalShiftId = sortedShifts[targetRowIdx].id;
        const replacementShift = createCopiedShift();
        replacementShift.id = originalShiftId;

        const updatedScheduleData = scheduleData.map((item) => {
          if (item.userId === targetUserId && item.startDate === targetDate) {
            const updatedShifts = [...item.shifts];
            updatedShifts[targetRowIdx] = replacementShift;
            return {
              ...item,
              shifts: sortShiftsByTime(updatedShifts),
            };
          }
          return item;
        });

        onScheduleDataChange(updatedScheduleData);
      } else {
        const hasLocalOverlap = sortedShifts.some((existingShift) =>
          doTimesOverlap(
            shift.startTime,
            shift.endTime,
            existingShift.startTime,
            existingShift.endTime
          )
        );

        if (hasLocalOverlap) {
          handleOverlapError(
            "Cannot drop shift here - it overlaps with existing shifts for this user and date."
          );
          return;
        }

        const copiedShift = createCopiedShift();
        const updatedScheduleData = scheduleData.map((item) => {
          if (item.userId === targetUserId && item.startDate === targetDate) {
            const updatedShifts = [...item.shifts, copiedShift];
            return {
              ...item,
              shifts: sortShiftsByTime(updatedShifts),
            };
          }
          return item;
        });

        onScheduleDataChange(updatedScheduleData);
      }
    } else {
      if (checkBackendOverlap()) {
        handleOverlapError(
          "Cannot drop shift here - it overlaps with existing shifts from backend."
        );
        return;
      }

      if (checkApiOverlapFn()) {
        cleanupDragState();
        return;
      }

      const groupByClient = Boolean(selectedUserId);
      const targetGroupKey = groupByClient
        ? `${targetUserId}-${sourceSchedule.clientId}-${sourceSchedule.addressId}`
        : targetUserId;
      const targetGroup = getRowGroups().find((g) => g.id === targetGroupKey);

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

      onScheduleDataChange([...scheduleData, newSchedule]);
    }

    hookToast({
      title: "Success",
      description: "Shift copied successfully!",
    });

    cleanupDragState();
  };

  const handleDragEnd = () => {
    setDraggedShift(null);
    setDragOverCell(null);
  };

  const groupByClient = Boolean(selectedUserId);

  return (
    <div className="relative w-full border border-gray-200 shadow-xl rounded-2xl overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div className="w-full overflow-auto custom-scrollbar" style={{ maxHeight: "600px" }}>
        <table className="w-auto min-w-full table-fixed text-sm text-gray-800 font-sans border-collapse">
          <thead className="bg-[#004175] text-white text-xs font-sans sticky top-0 z-10">
            <tr className="h-[41px]" style={{ lineHeight: "16px" }}>
              <th className="px-4 py-2 text-left border border-gray-300 whitespace-nowrap">
                {selectedUserId ? "Client Name" : "Employee Name"}
              </th>
              {dateColumns.map((dateCol) => (
                <th
                  key={dateCol.date}
                  className="px-4 py-2 text-center border border-gray-300 whitespace-nowrap"
                  style={{ minWidth: "120px" }}
                >
                  {dateCol.display}
                </th>
              ))}
              <th className="px-4 py-2 text-center border border-gray-300 whitespace-nowrap">
                Total
              </th>
              <th className="px-4 py-2 text-center border border-gray-300 whitespace-nowrap w-16">
                Auto
              </th>
            </tr>
          </thead>
          <tbody className="relative">
            {rowGroups.map((row, rowIndex) => {
              const rowCount = getMaxShiftsPerDay(row, scheduleData, groupByClient);

              return (
                <React.Fragment key={row.id}>
                  {[...Array(rowCount)].map((_, rowIdx) => (
                    <tr
                      key={`${row.id}-row-${rowIdx}`}
                      className={`hover:bg-blue-50 transition-colors ${
                        (rowIndex + rowIdx) % 2 === 0 ? "bg-gray-50" : "bg-white"
                      }`}
                    >
                      {rowIdx === 0 && (
                        <td
                          className="border border-gray-300 px-4 py-3 text-center align-middle whitespace-nowrap"
                          rowSpan={rowCount}
                        >
                          <div className="font-medium text-gray-800">
                            {selectedUserId ? row.clientName : row.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {selectedUserId ? row.address : formatUSPhone(row.phone)}
                          </div>
                        </td>
                      )}

                      {dateColumns.map((dateCol) => {
                        const daySchedules = scheduleData.filter((item) => {
                          const itemDate = item.startDate.includes("T")
                            ? formatDateFromISO(item.startDate)
                            : item.startDate;
                          const sameUser = item.userId === row.userId;
                          const sameClientGroup = !groupByClient
                            ? true
                            : item.clientId === row.clientId &&
                              item.addressId === row.addressId;
                          return sameUser && sameClientGroup && itemDate === dateCol.date;
                        });
                        const sortedShifts = sortShiftsByTime(
                          daySchedules.flatMap((s) => s.shifts).filter((s) => !(s as any).isDelete)
                        );
                        const shift = sortedShifts[rowIdx];
                        const session = shift
                          ? findSessionForShift(shift.id, sessionData)
                          : null;
                        const hasMismatch = shift && session
                          ? hasTimeMismatch(shift, session)
                          : false;
                        const draft = shift ? isDraftShift(shift) : false;

                        return (
                          <td
                            key={dateCol.date + "-" + rowIdx}
                            className={`border border-gray-300 px-4 py-3 text-center text-sm whitespace-nowrap ${
                              !readOnly &&
                              dragOverCell?.userId === row.userId &&
                              dragOverCell?.date === dateCol.date
                                ? "bg-blue-50 border-blue-300"
                                : hasMismatch
                                ? "bg-red-100 border-red-300"
                                : draft
                                ? "bg-amber-50 border-amber-200"
                                : ""
                            }`}
                            onDragOver={
                              !readOnly
                                ? (e) => handleDragOver(e, row.userId, dateCol.date, rowIdx)
                                : undefined
                            }
                            onDragLeave={!readOnly ? handleDragLeave : undefined}
                            onDrop={
                              !readOnly
                                ? (e) => handleDrop(e, row.userId, dateCol.date, rowIdx)
                                : undefined
                            }
                          >
                            {shift ? (
                              <div className="relative group">
                                {isEditMode && !readOnly && (
                                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity mb-1 justify-center">
                                    <div
                                      className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                                      draggable
                                      onDragStart={(e) =>
                                        handleDragStart(
                                          e,
                                          shift,
                                          row.userId,
                                          dateCol.date,
                                          rowIdx
                                        )
                                      }
                                      onDragEnd={handleDragEnd}
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                    <button
                                      onClick={() =>
                                        handleEditShift(row.userId, dateCol.date, shift)
                                      }
                                      className="text-blue-600 hover:text-blue-800 p-0.5 hover:bg-blue-50 rounded"
                                      title="Edit shift"
                                    >
                                      <FaRegEdit className="w-4 h-4" color="blue" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteShift(
                                          row.userId,
                                          dateCol.date,
                                          shift.id
                                        )
                                      }
                                      className="text-red-600 hover:text-red-800 p-0.5 hover:bg-red-50 rounded"
                                      title="Delete shift"
                                    >
                                      <FaRegTrashAlt className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 justify-center flex-col">
                                  <span className="text-sm">
                                    {`${shift.startTime} - ${formatTimeDisplay(
                                      shift.endTime
                                    )}`}
                                  </span>

                                  {/* DRAFT BADGE */}
                                 

                                  <div className="w-[50px] h-[20px]">
                                    <ToggleSwitch
                                      size="small"
                                      enabled={Boolean(shift.auto)}
                                      disabled={!isEditMode || readOnly}
                                      onToggle={(enabled) => {
                                        if (readOnly || !isEditMode) return;
                                        if (onShiftAutoToggle) {
                                          onShiftAutoToggle(
                                            row.userId as number,
                                            dateCol.date,
                                            shift.id,
                                            enabled
                                          );
                                        } else {
                                          const updated = scheduleData.map((item) => {
                                            if (
                                              item.userId === row.userId &&
                                              item.startDate === dateCol.date
                                            ) {
                                              const newShifts = item.shifts.map((s) =>
                                                s.id === shift.id
                                                  ? {
                                                      ...s,
                                                      auto: enabled,
                                                      confirm: false,
                                                      reject: false,
                                                    }
                                                  : s
                                              );
                                              const anyOn = newShifts.some(
                                                (s) => s.auto === true
                                              );
                                              return {
                                                ...item,
                                                auto: anyOn,
                                                shifts: newShifts,
                                              };
                                            }
                                            return item;
                                          });
                                          onScheduleDataChange(updated);
                                        }
                                      }}
                                    />
                                  </div>
                                  {draft && (
                                    <span className="text-[10px] uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                                      Draft
                                    </span>
                                  )}
                                  {/* Confirm/Reject indicator (only in view mode) */}
                                  {!readOnly &&
                                    !isEditMode &&
                                    (shift.confirm || shift.reject) && (
                                      <div className="flex items-center justify-center m-1 absolute bottom-0 right-0">
                                        {shift.confirm && (
                                          <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                            <svg
                                              className="w-3 h-3 text-white"
                                              fill="currentColor"
                                              viewBox="0 0 20 20"
                                            >
                                              <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                              />
                                            </svg>
                                          </div>
                                        )}
                                        {shift.reject && (
                                          <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                            <svg
                                              className="w-3 h-3 text-white"
                                              fill="currentColor"
                                              viewBox="0 0 20 20"
                                            >
                                              <path
                                                fillRule="evenodd"
                                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                clipRule="evenodd"
                                              />
                                            </svg>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        );
                      })}

                      {rowIdx === 0 && (
                        <>
                          <td
                            className="border border-gray-300 px-4 py-3 text-center font-medium whitespace-nowrap"
                            rowSpan={rowCount}
                          >
                            {calculateRowTotal(row, scheduleData, groupByClient)}
                          </td>
                          <td
                            className="border border-gray-300 px-4 py-3 text-center w-16 align-middle whitespace-nowrap"
                            rowSpan={rowCount}
                          >
                            <div className="flex items-center justify-center">
                              <ToggleSwitch
                                size="medium"
                                enabled={scheduleData.some((item) => {
                                  if (item.userId !== row.userId) return false;
                                  if (!groupByClient)
                                    return item.shifts.some((s) => s.auto);
                                  return (
                                    item.clientId === row.clientId &&
                                    item.addressId === row.addressId &&
                                    item.shifts.some((s) => s.auto)
                                  );
                                })}
                                disabled={!isEditMode || readOnly}
                                onToggle={
                                  readOnly || !isEditMode
                                    ? undefined
                                    : (enabled) =>
                                        handleUserAutoToggle(row.userId, enabled)
                                }
                              />
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}

                  <tr
                    className={`transition-colors ${
                      rowIndex % 2 === 0 ? "bg-gray-100" : "bg-gray-200"
                    }`}
                  >
                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center whitespace-nowrap">
                      Total
                    </td>
                    {dateColumns.map((dateCol) => {
                      const daySchedules = scheduleData.filter((item) => {
                        const itemDate = item.startDate.includes("T")
                          ? formatDateFromISO(item.startDate)
                          : item.startDate;
                        const sameUser = item.userId === row.userId;
                        const sameClientGroup = !groupByClient
                          ? true
                          : item.clientId === row.clientId &&
                            item.addressId === row.addressId;
                        return (
                          sameUser &&
                          sameClientGroup &&
                          itemDate === dateCol.date
                        );
                      });
                      const dayTotal = daySchedules.reduce(
                        (t, s) =>
                          t +
                          s.shifts.reduce(
                            (st, sh) => st + sh.hours,
                            0
                          ),
                        0
                      );
                      const rounded = parseFloat(dayTotal.toFixed(2));
                      return (
                        <td
                          key={dateCol.date}
                          className="border border-gray-300 px-4 py-3 text-center text-sm font-medium whitespace-nowrap"
                        >
                          {rounded > 0 ? rounded : "-"}
                        </td>
                      );
                    })}
                    <td className="border border-gray-300 px-4 py-3 text-center font-medium whitespace-nowrap">
                      {calculateRowTotal(row, scheduleData, groupByClient)}
                    </td>
                    {isEditMode && (
                      <td className="border border-gray-300 px-4 py-3 whitespace-nowrap flex items-center justify-center">
                        <button
                          onClick={() => handleDeleteUser(row.userId)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete all data for this user"
                        >
                          <FaRegTrashAlt className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                </React.Fragment>
              );
            })}
            <tr className="bg-gray-50 font-medium">
              <td className="border border-gray-300 px-4 py-3 whitespace-nowrap">
                Grand Total
              </td>
              {dateColumns.map((dateCol) => (
                <td
                  key={dateCol.date}
                  className="border border-gray-300 px-4 py-3 text-center whitespace-nowrap"
                >
                  {calculateDayTotal(dateCol.date, scheduleData) || "-"}
                </td>
              ))}
              <td className="border border-gray-300 px-4 py-3 text-center whitespace-nowrap">
                {calculateGrandTotal(scheduleData)}
              </td>
              <td className="border border-gray-300 px-4 py-3 whitespace-nowrap"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bottom action bar */}
      <div className="flex justify-between items-center gap-2 p-4 border-t bg-gray-50 rounded-b-2xl">
        {isEditMode ? (
          <div className="flex gap-2">
            <button
              onClick={onPublish}
              disabled={isPublishing || (!hasChanges && !hasDraftData())}
              className="inline-flex items-center px-4 py-2 text-white bg-[#004175] hover:bg-[#00325d] disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium shadow-sm"
              title="Publish Schedule"
            >
              {isPublishing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Publish
                </>
              )}
            </button>
            {onSave && (
              <button
                onClick={onSave}
                disabled={isSaving || !hasChanges}
                className="inline-flex items-center px-4 py-2 text-[#004175] bg-white border border-[#004175] hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#004175] focus:ring-offset-2 font-medium shadow-sm"
                title="Save changes"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#004175] border-t-transparent rounded-full animate-spin mr-2" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </button>
            )}
            {!hideActionButtons && (
              <button
                onClick={onToggleEditMode}
                className="inline-flex items-center px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium shadow-sm"
                title="Cancel Edit Mode"
              >
                Cancel
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onPublish}
            disabled={true}
            className="inline-flex items-center px-4 py-2 text-white bg-gray-400 cursor-not-allowed rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium shadow-sm"
            title="Enter edit mode to publish"
          >
            <Send className="w-4 h-4 mr-2" />
            Publish
          </button>
        )}

        {!hideActionButtons && (
          <div className="flex items-center gap-2">
            <button
              onClick={onPrint}
              disabled={isPrinting}
              className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              title="Print Report"
            >
              {isPrinting ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2" />
                  <span className="text-sm">Preparing...</span>
                </>
              ) : (
                <FaFilePdf className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={onDownloadExcel}
              className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              title="Download Excel"
            >
              <FaFileExport className="w-5 h-5" />
            </button>

            <button
              onClick={handleEditModeToggle}
              className={`inline-flex items-center px-3 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isEditMode
                  ? "text-blue-600 hover:text-blue-800 hover:bg-blue-50 focus:ring-blue-500"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:ring-gray-500"
              }`}
              title={isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
            >
              <FaRegEdit className="w-5 h-5" color="blue" />
            </button>
          </div>
        )}
      </div>

      {/* Delete Shift Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this shift?
              </p>
            </div>
            <div className="flex space-x-3 justify-end">
              <button
                type="button"
                onClick={cancelDeleteShift}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteShift}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center"
              >
                <FaRegTrashAlt className="w-4 h-4 mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Shift Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Shift</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={editForm.starttime}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, starttime: e.target.value }))
                  }
                  className="w-full px-3 py-1 border border-[#d0d4d9] rounded-md placeholder:text-gray-500 font-normal focus:outline-none focus:ring-2 focus:ring-[#004175] transition appearance-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={editForm.endtime}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, endtime: e.target.value }))
                  }
                  className="w-full px-3 py-1 border border-[#d0d4d9] rounded-md placeholder:text-gray-500 font-normal focus:outline-none focus:ring-2 focus:ring-[#004175] transition appearance-none"
                />
              </div>
            </div>

            <div className="flex space-x-3 justify-end mt-6">
              <button
                type="button"
                onClick={cancelEditShift}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmEditShift}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
              >
                <FaRegEdit className="w-4 h-4 mr-2" color="white" />
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteUserModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete all data for this user?
              </p>
            </div>

            <div className="flex space-x-3 justify-end">
              <button
                type="button"
                onClick={cancelDeleteUser}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center"
              >
                {deletingUser ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <FaRegTrashAlt className="w-4 h-4 mr-2" />
                )}
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Last Shift -> Entire Schedule Modal */}
      {deleteLastShiftModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Delete Entire Schedule
              </h3>
              <p className="text-sm text-gray-500">
                Deleting this shift will delete the entire schedule for this user
                as it's their only remaining shift. Are you sure you want to
                proceed?
              </p>
            </div>

            <div className="flex space-x-3 justify-end">
              <button
                type="button"
                onClick={cancelDeleteLastShift}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteLastShift}
                disabled={deletingLastShift}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center"
              >
                {deletingLastShift ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <FaRegTrashAlt className="w-4 h-4 mr-2" />
                    Delete Schedule
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit mode unsaved changes modal */}
      {editModeConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Unsaved Changes
              </h3>
              <p className="text-sm text-gray-500">
                You have unsaved changes. Switching edit mode will reset your
                changes. Are you sure you want to continue?
              </p>
            </div>

            <div className="flex space-x-3 justify-end">
              <button
                type="button"
                onClick={cancelEditModeToggle}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmEditModeToggle}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

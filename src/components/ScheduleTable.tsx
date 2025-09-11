import React, { useState } from "react";
import { FaFileExport, FaFilePdf, FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { FiEye } from "react-icons/fi";
import { GoPlus } from "react-icons/go";
import { IoMdMail } from "react-icons/io";
import { MdPlusOne } from "react-icons/md";
import { GripVertical, RotateCcw, Send, Calendar } from "lucide-react";
import ToggleSwitch from "./ui/toggle";
import { useToast } from "../hooks/use-toast";
import { formatDateLocal, formatTimeDisplay, formatUSPhone } from "../lib/utils";
import { graphQLClient } from "../GraphqlClient";
import { DELETE_SCHEDULE_SESSION } from "../graphql/mutation";
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
}

interface User {
  id: string | number;
  name: string;
  phone?: string;
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
  sessionData?: SessionItem[]; // Add session data for comparison
  selectedDate: string;
  currentWeekRange: any;
  isEditMode: boolean;
  onScheduleDataChange: (newData: ScheduleItem[]) => void;
  onPublish: () => void;
  onPrint: () => void;
  onDownloadExcel: () => void;
  onToggleEditMode: () => void;
  isPublishing: boolean;
  isPrinting: boolean;
  readOnly?: boolean;
  loading?: boolean;
  onUserAutoToggle?: (userId: number, enabled: boolean) => void;
  onShiftAutoToggle?: (userId: number, date: string, shiftId: number, enabled: boolean) => void;
  onScheduleAutoToggle?: (enabled: boolean) => void;
  hideActionButtons?: boolean; // Hide cancel, edit, download buttons
}

// Utility functions
const timeToMinutes = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Check if times don't match exactly (for highlighting)
const hasTimeMismatch = (shift: Shift, session?: { clockIn?: string; clockOut?: string }): boolean => {
  if (!session) return false;
  
  // Check if start time doesn't match clock-in OR end time doesn't match clock-out
  const startTimeMismatch = shift.startTime !== session.clockIn;
  const endTimeMismatch = shift.endTime !== session.clockOut;
  
  return startTimeMismatch || endTimeMismatch;
};

// Find session data for a specific shift
const findSessionForShift = (shiftId: number, sessionData?: SessionItem[]): SessionItem | null => {
  if (!sessionData) return null;
  return sessionData.find(s => s.shiftId === shiftId) || null;
};

const doTimesOverlap = (start1: string, end1: string, start2: string, end2: string) => {
  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const toRanges = (s: string, e: string): Array<[number, number]> => {
    const ss = timeToMinutes(s), ee = timeToMinutes(e);
    if (ss === ee) return [[0, 1440]];
    if (ee > ss) return [[ss, ee]];
    return [[ss, 1440], [0, ee]];
  };
  const r1 = toRanges(start1, end1), r2 = toRanges(start2, end2);
  for (const a of r1) for (const b of r2) {
    const hasGap = (a[1] + 1 <= b[0]) || (b[1] + 1 <= a[0]);
    if (!hasGap) return true;
  }
  return false;
};

const sortShiftsByTime = (shifts: Shift[]) => {
  return [...shifts].sort((a, b) => {
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });
};

const getMaxShiftsPerDay = (userId: number, scheduleData: ScheduleItem[]) => {
  const userDays = scheduleData.filter(i => i.userId === userId);
  let max = 1;
  for (const d of userDays) max = Math.max(max, d.shifts.length);
  return max;
};

const calculateDayTotal = (date: string, scheduleData: ScheduleItem[]) => {
  const total = scheduleData
    .filter(item => {
      // Handle both local date format and ISO date format
      let itemDate: string;
      if (item.startDate.includes('T') && item.startDate.includes('Z')) {
        // This is a UTC date, extract just the date part without timezone conversion
        itemDate = item.startDate.split('T')[0];
      } else if (item.startDate.includes('T')) {
        itemDate = formatDateLocal(new Date(item.startDate));
      } else {
        itemDate = item.startDate;
      }
      return itemDate === date;
    })
    .reduce((total, item) => total + item.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0);
  return parseFloat(total.toFixed(2));
};

const calculateUserTotal = (userId: number, scheduleData: ScheduleItem[]) => {
  const total = scheduleData
    .filter(item => item.userId === userId)
    .reduce((total, item) => total + item.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0);
  return parseFloat(total.toFixed(2));
};

const calculateGrandTotal = (scheduleData: ScheduleItem[]) => {
  const total = scheduleData.reduce((total, item) => total + item.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0);
  return parseFloat(total.toFixed(2));
};

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  scheduleData,
  sessionData = [], // Add sessionData with default empty array
  selectedDate,
  currentWeekRange,
  isEditMode,
  onScheduleDataChange,
  onPublish,
  onPrint,
  onDownloadExcel,
  onToggleEditMode,
  isPublishing,
  isPrinting,
  readOnly = false,
  loading = false,
  onUserAutoToggle,
  onShiftAutoToggle,
  onScheduleAutoToggle,
  hideActionButtons = false
}) => {
  const { toast: hookToast } = useToast();

  // Modal states for edit/delete functionality
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, shiftId: null, userId: null, date: null });
  const [editModal, setEditModal] = useState({ isOpen: false, shift: null, userId: null, date: null });
  const [deleteUserModal, setDeleteUserModal] = useState({ isOpen: false, userId: null });
  const [editForm, setEditForm] = useState({ starttime: "", endtime: "" });
  const [deletingUser, setDeletingUser] = useState(false);
  // Drag and drop states
  const [draggedShift, setDraggedShift] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);

  // Generate date columns for the schedule table
  const generateDateColumns = () => {
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
  };

  // Helper function to format date from ISO string to local format
  const formatDateFromISO = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      return formatDateLocal(date);
    } catch (error) {
      console.error('Error formatting date:', isoDate, error);
      return isoDate; // fallback to original if parsing fails
    }
  };

  const dateColumns = generateDateColumns();

  // Get unique users from schedule data
  const getUniqueUsers = () => {
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

  const uniqueUsers = getUniqueUsers();

  // Delete individual shift
  const handleDeleteShift = (userId: number, date: string, shiftId: number) => {
    setDeleteModal({ isOpen: true, shiftId, userId, date });
  };

  const confirmDeleteShift = () => {
    const { userId, date, shiftId } = deleteModal;
    const updatedData = scheduleData.map(item => {
      if (item.userId === userId && item.startDate === date) {
        return {
          ...item,
          shifts: item.shifts.filter(shift => shift.id !== shiftId)
        };
      }
      return item;
    }).filter(item => item.shifts.length > 0);

    onScheduleDataChange(updatedData);
    setDeleteModal({ isOpen: false, shiftId: null, userId: null, date: null });
  };

  const cancelDeleteShift = () => {
    setDeleteModal({ isOpen: false, shiftId: null, userId: null, date: null });
  };

  // Edit individual shift
  const handleEditShift = (userId: number, date: string, shift: Shift) => {
    setEditModal({ isOpen: true, shift, userId, date });
    setEditForm({
      starttime: shift.startTime,
      endtime: shift.endTime
    });
  };

  const confirmEditShift = () => {
    const { userId, date, shift } = editModal;

    // Validate the edit form
    if (!editForm.starttime || !editForm.endtime) {
      hookToast({
        title: "Validation Error",
        description: "Start time and end time are required.",
        variant: "destructive",
      });
      return;
    }

    // Check for overlapping shifts
    const existingShifts = scheduleData
      .filter(item => item.userId === userId && item.startDate === date)
      .flatMap(item => item.shifts);

    for (const existingShift of existingShifts) {
      if (existingShift.id === shift.id) continue; // Skip current shift when editing

      if (doTimesOverlap(editForm.starttime, editForm.endtime, existingShift.startTime, existingShift.endTime)) {
        hookToast({
          title: "Overlapping Shift",
          description: "Shift time overlaps with existing shift for this user and date",
          variant: "destructive",
        });
        return;
      }
    }

    const calculateHours = (start: string, end: string) => {
      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);
      
      // If start time equals end time, treat as 24 hours
      if (startH === endH && startM === endM) {
        return 24.0;
      }
      
      let hours = endH - startH + (endM - startM) / 60;
      if (hours < 0) hours += 24;
      return parseFloat(hours.toFixed(2));
    };

    const updatedData = scheduleData.map(item => {
      if (item.userId === userId && item.startDate === date) {
        return {
          ...item,
          shifts: item.shifts.map(s =>
            s.id === shift.id
              ? { ...s, startTime: editForm.starttime, endTime: editForm.endtime, hours: calculateHours(editForm.starttime, editForm.endtime), confirm: false, reject: false }
              : s
          )
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

  // Delete all data for a user
  const handleDeleteUser = (userId: number) => {
    setDeleteUserModal({ isOpen: true, userId });
  };

  const confirmDeleteUser = async () => {
    setDeletingUser(true);
    const { userId } = deleteUserModal;
  
    try {
      // collect this user's scheduleSessionIds (unique) across the week
      const sessionIds = new Set<number>();
      scheduleData.forEach(item => {
        if (item.userId === userId) {
          item.shifts.forEach(s => { if (s.scheduleSessionId) sessionIds.add(s.scheduleSessionId); });
        }
      });
  
      const token = localStorage.getItem("token");
      // delete each schedule session on server

      await Promise.all(
        Array.from(sessionIds).map(id =>
          graphQLClient.request(
            DELETE_SCHEDULE_SESSION,
            { deleteScheduleSessionId: id },
            { Authorization: `Bearer ${token}` }
          )
        )
      );
  
      // then remove this user's entries locally 
      
      const updatedData = scheduleData.filter(item => item.userId !== userId);
      onScheduleDataChange(updatedData);
        // go to view mode
        onToggleEditMode();

      } finally {
      setDeletingUser(false);
      setDeleteUserModal({ isOpen: false, userId: null });
    }
  };

  const cancelDeleteUser = () => {
    setDeleteUserModal({ isOpen: false, userId: null });
  };

  // Auto toggle handler
  const handleUserAutoToggle = (userId: number, enabled: boolean) => {
    if (onUserAutoToggle) {
      // Use the parent component's handler if provided
      onUserAutoToggle(userId, enabled);
    } else {
      // Fallback to local state update
      const updatedData = scheduleData.map(item =>
        item.userId === userId ? { ...item, auto: enabled, shifts: item.shifts.map(s => ({ ...s, confirm: false, reject: false })) } : item
      );
      onScheduleDataChange(updatedData);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, shift: Shift, sourceUserId: number, sourceDate: string, sourceRowIdx: number) => {
    setDraggedShift({
      shift,
      sourceUserId,
      sourceDate,
      sourceRowIdx
    });
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent, targetUserId: number, targetDate: string, targetRowIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverCell({ userId: targetUserId, date: targetDate, rowIdx: targetRowIdx });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverCell(null);
  };

  const handleDrop = (e: React.DragEvent, targetUserId: number, targetDate: string, targetRowIdx: number) => {
    e.preventDefault();

    if (!draggedShift) return;

    const { shift, sourceUserId, sourceDate, sourceRowIdx } = draggedShift;

    // Don't allow dropping on the same cell
    if (sourceUserId === targetUserId && sourceDate === targetDate && sourceRowIdx === targetRowIdx) {
      setDraggedShift(null);
      setDragOverCell(null);
      return;
    }

    const existingSchedule = scheduleData.find(
      item => item.userId === targetUserId && item.startDate === targetDate
    );

    if (existingSchedule) {
      // Check for overlap, but exclude the shift at the target position (it will be replaced)
      const sortedShifts = sortShiftsByTime(existingSchedule.shifts);
      const hasOverlap = sortedShifts.some((existingShift, index) => {
        // Skip overlap check for the shift at the target row position (it will be replaced)
        if (index === targetRowIdx) {
          return false;
        }
        
        // Skip overlap check if this is the same shift being dragged from the same user/date
        if (sourceUserId === targetUserId && sourceDate === targetDate && 
            existingShift.startTime === shift.startTime && existingShift.endTime === shift.endTime) {
          return false;
        }
        
        return doTimesOverlap(
          shift.startTime,
          shift.endTime,
          existingShift.startTime,
          existingShift.endTime
        );
      });

      if (hasOverlap) {
        hookToast({
          title: "Overlapping Shift",
          description: "Cannot drop shift here - it overlaps with existing shifts for this user and date.",
          variant: "destructive",
        });
        setDraggedShift(null);
        setDragOverCell(null);
        return;
      }

      // Handle the specific row position
      const updatedData = scheduleData.map(item => {
        if (item.userId === targetUserId && item.startDate === targetDate) {
          const currentShifts = [...item.shifts];

          // If dropping to a specific row position, insert at that position
          if (targetRowIdx < currentShifts.length) {
            // Replace the shift at the target row position
            currentShifts[targetRowIdx] = { 
              ...shift, 
              id: Date.now(), 
              date: targetDate, 
              confirm: false, 
              reject: false,
              scheduleSessionId: currentShifts[0]?.scheduleSessionId // Inherit from existing shifts
            };
          } else {
            // Add to the end if target row is beyond current shifts
            currentShifts.push({ 
              ...shift, 
              id: Date.now(), 
              date: targetDate, 
              confirm: false, 
              reject: false,
              scheduleSessionId: currentShifts[0]?.scheduleSessionId // Inherit from existing shifts
            });
          }

          return {
            ...item,
            shifts: sortShiftsByTime(currentShifts)
          };
        }
        return item;
      });

      onScheduleDataChange(updatedData);
    } else {
      // Create new schedule for target user/date
      const sourceSchedule = scheduleData.find(
        item => item.userId === sourceUserId && item.startDate === sourceDate
      );

      if (sourceSchedule) {
        const targetUser = uniqueUsers.find(u => u.id === targetUserId);
        const newSchedule = {
          id: Date.now(),
          clientId: sourceSchedule.clientId,
          addressId: sourceSchedule.addressId,
          userId: targetUserId,
          startDate: targetDate,
          auto: sourceSchedule.auto,
          shifts: [{ 
            ...shift, 
            id: Date.now(), 
            date: targetDate, 
            confirm: false, 
            reject: false,
            scheduleSessionId: sourceSchedule.shifts[0]?.scheduleSessionId // Inherit from source schedule
          }],
          clientName: sourceSchedule.clientName,
          address: sourceSchedule.address,
          userName: targetUser?.name || sourceSchedule.userName,
          userPhone: targetUser?.phone || sourceSchedule.userPhone,
        };

        onScheduleDataChange([...scheduleData, newSchedule]);
      }
    }
    setDraggedShift(null);
    setDragOverCell(null);
  };

  const handleDragEnd = () => {
    setDraggedShift(null);
    setDragOverCell(null);
  };

  return (
    <div className="relative w-full  border border-gray-200 shadow-xl rounded-2xl overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      <div className="w-full overflow-auto custom-scrollbar" style={{ maxHeight: "600px" }}>
        {/* Table */}
        <table className="w-auto min-w-full table-fixed text-sm text-gray-800 font-sans border-collapse">
          <thead className="bg-[#004175] text-white text-xs font-sans sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left border border-gray-300 whitespace-nowrap">
                Employee Name
              </th>
              {dateColumns.map(dateCol => (
                <th key={dateCol.date} className="px-4 py-3 text-center border border-gray-300 whitespace-nowrap" style={{ minWidth: '120px' }}>
                  {dateCol.display}
                </th>
              ))}
              <th className="px-4 py-3 text-center border border-gray-300 whitespace-nowrap">
                Total
              </th>
              <th className="px-4 py-3 text-center border border-gray-300 whitespace-nowrap w-16">
                Auto
              </th>
            </tr>
          </thead>
          <tbody className="relative">
            {uniqueUsers.map((user, userIndex) => {
              const rowCount = getMaxShiftsPerDay(user.id, scheduleData);

              return (
                <React.Fragment key={user.id}>
                  {[...Array(rowCount)].map((_, rowIdx) => (
                    <tr
                      key={`${user.id}-row-${rowIdx}`}
                      className={`hover:bg-blue-50 transition-colors ${(userIndex + rowIdx) % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                        }`}
                    >
                      {rowIdx === 0 && (
                        <td
                          className="border border-gray-300 px-4 py-3 text-center align-middle whitespace-nowrap"
                          rowSpan={rowCount}
                        >
                                                   <div className="font-medium text-gray-800">{user.name}</div>
                          <div className="text-xs text-gray-500">{formatUSPhone(user.phone)}</div>
                        </td>
                      )}

                      {dateColumns.map(dateCol => {
                        const daySchedules = scheduleData.filter(item => {
                          // Handle both local date format and ISO date format
                          const itemDate = item.startDate.includes('T') ? formatDateFromISO(item.startDate) : item.startDate;
                          return item.userId === user.id && itemDate === dateCol.date;
                        });
                        const sortedShifts = sortShiftsByTime(
                          daySchedules.flatMap(s => s.shifts)
                        );
                        const shift = sortedShifts[rowIdx]; // take nth shift of the day

                        // Find corresponding session data for this shift
                        const session = shift ? findSessionForShift(shift.id, sessionData) : null;
                        const hasMismatch = shift && session ? hasTimeMismatch(shift, session) : false;

                        return (
                          <td
                            key={dateCol.date + '-' + rowIdx}
                            className={`border border-gray-300 px-4 py-3 text-center text-sm whitespace-nowrap ${
                              !readOnly && dragOverCell?.userId === user.id && dragOverCell?.date === dateCol.date
                                ? 'bg-blue-50 border-blue-300'
                                : hasMismatch
                                ? 'bg-red-100 border-red-300'
                                : ''
                            }`}
                            onDragOver={!readOnly ? (e => handleDragOver(e, user.id, dateCol.date, rowIdx)) : undefined}
                            onDragLeave={!readOnly ? handleDragLeave : undefined}
                            onDrop={!readOnly ? (e => handleDrop(e, user.id, dateCol.date, rowIdx)) : undefined}
                          >
                            {shift ? (
                              <div className="relative group">
                                {isEditMode && !readOnly && (
                                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity mb-1 justify-center">
                                    <div
                                      className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                                      draggable
                                      onDragStart={e => handleDragStart(e, shift, user.id, dateCol.date, rowIdx)}
                                      onDragEnd={handleDragEnd}
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                     <button
                                       onClick={() => {
                                         handleEditShift(user.id, dateCol.date, shift);
                                       }}
                                       className="text-blue-600 hover:text-blue-800 p-0.5 hover:bg-blue-50 rounded"
                                       title="Edit shift"
                                     >
                                       <FaRegEdit className="w-4 h-4" color="blue" />
                                     </button>
                                     <button
                                       onClick={() => handleDeleteShift(user.id, dateCol.date, shift.id)}
                                       className="text-red-600 hover:text-red-800 p-0.5 hover:bg-red-50 rounded"
                                       title="Delete shift"
                                     >
                                       <FaRegTrashAlt className="w-4 h-4" />
                                     </button>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 justify-center flex-col">
                                  <span className="text-sm">
                                    {`${shift.startTime} - ${formatTimeDisplay(shift.endTime)}`}
                                  </span>
                                  <div className="w-[50px] h-[20px]">
                                    <ToggleSwitch
                                      size="small"
                                      enabled={Boolean(shift.auto)}
                                      disabled={!isEditMode || readOnly}
                                      onToggle={(enabled) => {
                                        if (readOnly || !isEditMode) return;
                                        if (onShiftAutoToggle) {
                                          onShiftAutoToggle(user.id as number, dateCol.date, shift.id, enabled);
                                        } else {
                                          // fallback local update
                                          const updated = scheduleData.map(item => {
                                            if (item.userId === user.id && item.startDate === dateCol.date) {
                                              return {
                                                ...item,
                                                shifts: item.shifts.map(s => s.id === shift.id ? { ...s, auto: enabled, confirm: false, reject: false } : s)
                                              };
                                            }
                                            return item;
                                          });
                                          onScheduleDataChange(updated);
                                        }
                                      }}
                                    />
                                  </div>
                                       {/* Confirm/Reject Status - Only show when not in edit mode */}
                                       {!readOnly && !isEditMode && (shift.confirm || shift.reject) && (
                                     <div className="flex items-center justify-center m-1 absolute bottom-0 right-0 ">
                                       {shift.confirm && (
                                         <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                           <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                             <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                           </svg>
                                         </div>
                                       )}
                                       {shift.reject && (
                                         <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                           <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                             <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
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
                            {calculateUserTotal(user.id, scheduleData)}
                          </td>
                          <td
                            className="border border-gray-300 px-4 py-3 text-center w-16 align-middle whitespace-nowrap"
                            rowSpan={rowCount}
                          >
                            <div className="flex items-center justify-center">
                              <ToggleSwitch
                                size="medium"
                                enabled={scheduleData.find(item => item.userId === user.id)?.auto || false}
                                disabled={!isEditMode || readOnly}
                                onToggle={readOnly || !isEditMode ? undefined : (enabled => handleUserAutoToggle(user.id, enabled))}
                              />
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}

                  <tr className={`transition-colors ${userIndex % 2 === 0 ? 'bg-gray-100' : 'bg-gray-200'}`}>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center whitespace-nowrap">
                      Total
                    </td>
                    {dateColumns.map(dateCol => {
                      const daySchedules = scheduleData.filter(item => {
                        // Handle both local date format and ISO date format
                        const itemDate = item.startDate.includes('T') ? formatDateFromISO(item.startDate) : item.startDate;
                        return item.userId === user.id && itemDate === dateCol.date;
                      });
                      const dayTotal = daySchedules.reduce(
                        (t, s) => t + s.shifts.reduce((st, sh) => st + sh.hours, 0),
                        0
                      );
                      const rounded = parseFloat(dayTotal.toFixed(2));
                      return (
                        <td key={dateCol.date} className="border border-gray-300 px-4 py-3 text-center text-sm font-medium whitespace-nowrap">
                          {rounded > 0 ? rounded : '-'}
                        </td>
                      );
                    })}
                    <td className="border border-gray-300 px-4 py-3 text-center font-medium whitespace-nowrap">
                      {calculateUserTotal(user.id, scheduleData)}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 whitespace-nowrap">
                      {isEditMode && (
                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800 p-1" title="Delete all data for this user">
                          <FaRegTrashAlt  className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
            {/* Grand Total Row */}
            <tr className="bg-gray-50 font-medium">
              <td className="border border-gray-300 px-4 py-3 whitespace-nowrap">Grand Total</td>
              {dateColumns.map(dateCol => (
                <td key={dateCol.date} className="border border-gray-300 px-4 py-3 text-center whitespace-nowrap">
                  {calculateDayTotal(dateCol.date, scheduleData) || '-'}
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

      {/* Action buttons - Bottom Corner */}
      <div className="flex justify-between items-center gap-2 p-4 border-t bg-gray-50 rounded-b-2xl">
        {/* Publish/Cancel button - Leftmost */}
        {isEditMode ? (
          <div className="flex gap-2">
            <button
              onClick={onPublish}
              disabled={isPublishing}
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

        {/* Print, Download and Edit buttons - Right side */}
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
               onClick={onToggleEditMode}
               className={`inline-flex items-center px-3 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                 isEditMode 
                   ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 focus:ring-blue-500' 
                   : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:ring-gray-500'
               }`}
               title={isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
             >
               <FaRegEdit className="w-5 h-5" color="blue" />
             </button>
          </div>
        )}
      </div>

      {/* Delete Shift Confirmation Modal */}
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
                <FaRegTrashAlt  className="w-4 h-4 mr-2" />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={editForm.starttime}
                  onChange={(e) => setEditForm(prev => ({ ...prev, starttime: e.target.value }))}
                  className="w-full px-3 py-1 border border-[#d0d4d9] rounded-md placeholder:text-gray-500 font-normal focus:outline-none focus:ring-2 focus:ring-[#004175] transition appearance-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={editForm.endtime}
                  onChange={(e) => setEditForm(prev => ({ ...prev, endtime: e.target.value }))}
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
                 <FaRegEdit className="w-4 h-4 mr-2" color="blue" />
                 Update
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
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
                  <FaRegTrashAlt  className="w-4 h-4 mr-2" />
                )}
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 



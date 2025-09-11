import React, { useState, useMemo } from "react";
import { FaFileExport, FaFilePdf, FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { FiEye } from "react-icons/fi";
import { GoPlus } from "react-icons/go";
import { IoMdMail } from "react-icons/io";
import { MdPlusOne } from "react-icons/md";
import { RotateCcw, Send, Calendar } from "lucide-react";
import ToggleSwitch from "./ui/toggle";
import { useToast } from "../hooks/use-toast";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { formatDateLocal, formatDateStringLocal, formatTimeDisplay, formatUSPhone } from "../lib/utils";
import { Button } from "./ui/button";

interface Shift {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  actualHours?: number;
  confirm?: boolean;
  reject?: boolean;
  scheduleSessionId?: number;
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

// Updated Session interface to match minimal GraphQL schema
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

interface ScheduleSession {
  id: number;
  clientId: number;
  addressId: number;
  userId: number;
  startDate: string;
  endDate?: string;
  auto: boolean;
  weeklyHours?: number;
  client?: Client;
  address?: Address;
  user?: User;
  shifts?: Shift[];
  assignments?: Assignment[];
}

interface Client {
  name: string;
}

interface Address {
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface User {
  id: number;
  name: string;
  lastName?: string;
  phone?: string;
}

interface Assignment {
  id: number;
  // Add other assignment fields as needed
}

// New interface for Actual Time table data structure
interface ActualTimeCell {
  sessionId: number | null;
  shiftId: number | null;
  scheduleSessionId: number | null;
  clockIn: string | null;
  clockOut: string | null;
}

interface ActualTimeTableProps {
  scheduleData: ScheduleItem[];
  sessionData: SessionItem[];
  selectedDate: string;
  currentWeekRange: any;
  isEditMode: boolean;
  onSessionDataChange: (newData: SessionItem[]) => void;
  onPublish: () => void;
  onPrint: () => void;
  onDownloadExcel: () => void;
  onToggleEditMode: () => void;
  isPublishing: boolean;
  isPrinting: boolean;
  loading?: boolean;
}

// Utility functions
const timeToMinutes = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesDiffWithWrap = (start: string, end: string) => {
  const startM = timeToMinutes(start);
  const endM = timeToMinutes(end);
  
  // If start time equals end time, treat as 24 hours (1440 minutes)
  if (startM === endM) {
    return 24 * 60;
  }
  
  let diff = endM - startM;
  if (diff <= 0) diff += 24 * 60;
  return diff;
};

const doTimesOverlap = (start1: string, end1: string, start2: string, end2: string) => {
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);

  // Require at least 1-minute gap between sessions
  const hasRequiredGap = (end1Minutes + 1 <= start2Minutes) || (end2Minutes + 1 <= start1Minutes);
  return !hasRequiredGap;
};

const sortSessionsByTime = (sessions: SessionItem[]) => {
  return [...sessions].sort((a, b) => {
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    return timeToMinutes(a.clockIn) - timeToMinutes(b.clockIn);
  });
};

const getMaxShiftsPerDay = (userId: number, scheduleData: ScheduleItem[]) => {
  const userDays = scheduleData.filter(i => i.userId === userId);
  let max = 1;
  for (const d of userDays) max = Math.max(max, d.shifts.length);
  return max;
};

// Helper function to calculate worked time with 24-hour logic for clock-in == clock-out
const calculateWorkedTimeWith24HourLogic = (session: SessionItem) => {
  if (!session.clockIn || !session.clockOut) {
    return (session.workedTime || 0) / 60; // Convert minutes to hours
  }
  
  // If clock-in equals clock-out, return 24 hours
  if (session.clockIn === session.clockOut) {
    return 24.0; // 24 hours
  }
  
  // Otherwise use the calculated hours directly
  return calculateHours(session.clockIn, session.clockOut);
};

// Calculate totals
const calculateDayTotal = (date: string, sessionData: SessionItem[]) => {
  const total = sessionData
    .filter(item => {
      // Check if the session's date matches the given date
      const sessionDate = item.shift?.date || String(item.scheduleSessionId); // Convert to string
      const formattedSessionDate = sessionDate ? formatDateStringLocal(sessionDate) : "";
      return formattedSessionDate === date;
    })
    .reduce((total, item) => total + calculateWorkedTimeWith24HourLogic(item), 0);
  return parseFloat(total.toFixed(2));
};

const calculateUserTotal = (
  userId: number,
  sessionData: SessionItem[],
  scheduleData: ScheduleItem[]
) => {
  const total = sessionData
    .filter(item => {
      // Find the schedule item that contains this session's shift
      const scheduleItem = scheduleData.find(si =>
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
  sessionData: SessionItem[],
  scheduleData: ScheduleItem[],
  dateColumns: { date: string }[]
) => {
  let rowTotal = 0;
  
  dateColumns.forEach(dateCol => {
    // Get all shifts for this user on this date
    const userShifts = scheduleData
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

    // Get unique shifts and find the shift for this row
    const uniqueShifts = [...new Set(userShifts.map(s => s.id))];
    const currentShiftId = uniqueShifts[rowIdx];
    
    if (currentShiftId) {
      // Get all sessions for this shift
      const sessionsForShift = sessionData.filter(item => item.shiftId === currentShiftId);
      
      // Add all sessions in this shift to the row total
      sessionsForShift.forEach(session => {
        rowTotal += calculateWorkedTimeWith24HourLogic(session);
      });
    }
  });
  
  return parseFloat(rowTotal.toFixed(2));
};

const calculateGrandTotal = (sessionData: SessionItem[]) => {
  const total = sessionData.reduce((total, item) => total + calculateWorkedTimeWith24HourLogic(item), 0);
  return parseFloat(total.toFixed(2));
};



const logEditableCells = (sd: ScheduleItem[]) => {
  const fmt = (d: string) => (d ? formatDateStringLocal(d) : '');
  const cells = sd.flatMap(item =>
    (item.shifts || []).map(shift => ({
      table: 'Actual',
      guardName: item.userName,
      date: fmt(shift.date || item.startDate),
      shiftId: shift.id,
    }))
  );
  // console.log('Editable cells:', cells);
};

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

// Utility function to check for time violations
// const hasTimeViolation = (session: SessionItem, shift: Shift): boolean => {
//   if (!session.clockIn || !shift.startTime) return false;
  
//   // Convert times to minutes for comparison
//   const clockInMinutes = timeToMinutes(session.clockIn);
//   const shiftStartMinutes = timeToMinutes(shift.startTime);
  
//   // Check if clock-in is after shift start time
//   if (clockInMinutes > shiftStartMinutes) {
//     return true;
//   }
  
//   // Check if clock-out is before shift start time (if clock-out exists)
//   if (session.clockOut) {
//     const clockOutMinutes = timeToMinutes(session.clockOut);
//     if (clockOutMinutes < shiftStartMinutes) {
//       return true;
//     }
//   }
  
//   return false;
// };

// Check if times don't match exactly (for highlighting)
const hasTimeMismatch = (shift: Shift, sessions: SessionItem[]): boolean => {
  if (!shift || sessions.length === 0) return false;
  
  // Calculate scheduled shift duration in hours
  const scheduledDuration = calculateHours(shift.startTime, shift.endTime);
  
  // Calculate total actual time worked across all sessions
  const totalActualTime = sessions.reduce((total, session) => {
    return total + calculateWorkedTimeWith24HourLogic(session);
  }, 0);
  
  // Check if total actual time is not equal to scheduled duration (with small tolerance for rounding)
  return Math.abs(totalActualTime - scheduledDuration) > 0.01; // 0.01 hour tolerance (36 seconds)
};

// const hasOvertime = (shift: Shift, sessions: SessionItem[]): boolean => {
//   if (!shift || sessions.length === 0) return false;
  
//   const scheduledDuration = calculateHours(shift.startTime, shift.endTime);
  
//   const totalActualTime = sessions.reduce((total, session) => {
//     return total + calculateWorkedTimeWith24HourLogic(session);
//   }, 0);
  
//   return totalActualTime != scheduledDuration; 
// };


export const ActualTimeTable: React.FC<ActualTimeTableProps> = ({
  scheduleData,
  sessionData,
  selectedDate,
  currentWeekRange,
  isEditMode,
  onSessionDataChange,
  onPublish,
  onPrint,
  onDownloadExcel,
  onToggleEditMode,
  isPublishing,
  isPrinting,
  loading = false
}) => {
  const { toast: hookToast } = useToast();

  // Modal states
  const [deleteAllModal, setDeleteAllModal] = useState({ isOpen: false, shiftId: null as number | null });
  const [deleteUserModal, setDeleteUserModal] = useState({ isOpen: false, userId: null });

  // Edit dialog for a shift's sessions
  const [editShiftModal, setEditShiftModal] = useState({ isOpen: false, userId: null as number | null, date: null as string | null, shiftId: null as number | null });
  const [editSessions, setEditSessions] = useState<Array<{ id: number | null; clockIn: string; clockOut: string }>>([]);
  const hasTimeOverlap = (userId: number, date: string, start: string, end: string, excludeIds: Set<number> = new Set()) => {
    return sessionData.some(s => {
      if (excludeIds.has(s.id)) return false;
      const d = s.shift?.date || String(s.scheduleSessionId);
      const sDate = d ? formatDateStringLocal(d) : '';
      if (sDate !== date) return false;
      if (!s.clockIn || !s.clockOut) return false;
      return doTimesOverlap(start, end, s.clockIn, s.clockOut);
    });
  };
  // Generate date columns for the actual time table
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

  const dateColumns = generateDateColumns();

  // Get unique users from schedule data (mirror ScheduleTable structure)
  const getUniqueUsers = () => {
    const userMap = new Map();

    // Add users from schedule data (this ensures we always show the table)
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

  // Sessions for a shift (allow multiple)
  const getSessionsForShift = (
    shiftId?: number,
    scheduleSessionId?: number,
    date?: string,
    userId?: number
  ): SessionItem[] => {
    if (!shiftId && !scheduleSessionId) return [];
    const byShift = sessionData.filter(s => s.shiftId === shiftId);
    if (byShift.length > 0) return byShift.slice().sort((a, b) => (a.clockIn || '').localeCompare(b.clockIn || ''));

    // Fallback ONLY when there's exactly one shift for this user on this date
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

  // Helper function to check if session has valid clock-in/clock-out data
  const hasValidSessionData = (session: SessionItem | null) => {
    return session && session.clockIn && session.clockOut;
  };

  // Open edit modal for a shift (list all sessions and allow add/delete)
  const openEditShift = (userId: number, date: string, shiftId: number) => {
    const sessions = getSessionsForShift(shiftId, undefined, date, userId);
    setEditSessions(
      sessions.map(s => ({ id: s.id, clockIn: s.clockIn || "", clockOut: s.clockOut || "" }))
    );
    setEditShiftModal({ isOpen: true, userId, date, shiftId });
  };

  const addEditSessionRow = () => {
    const hasIncomplete = editSessions.some(r => !r.clockIn || r.clockIn.trim() === "");
    if (hasIncomplete) {
      return;
    }
    setEditSessions(prev => [...prev, { id: null, clockIn: "", clockOut: "" }]);
  };

  const removeEditSessionRow = (index: number) => {
    setEditSessions(prev => prev.filter((_, i) => i !== index));
  };

  const saveEditShiftSessions = () => {
    if (!editShiftModal.isOpen || editShiftModal.shiftId == null) return;

    // Validate rows: clock-in required; clock-out optional
    for (let i = 0; i < editSessions.length; i++) {
      const row = editSessions[i];
      if (!row.clockIn) {
        hookToast({ title: "Validation Error", description: "Clock-in is required for every session.", variant: "destructive" });
        return;
      }
      if (row.clockOut) {
        const durationMinutes = minutesDiffWithWrap(row.clockIn, row.clockOut);
        if (durationMinutes < 1) {
          hookToast({ title: "Invalid Duration", description: "When clock-out is provided, it must be at least 1 minute after clock-in.", variant: "destructive" });
          return;
        }
      }
    }

    // Check overlap between edited rows
    const sorted = [...editSessions].sort((a, b) => a.clockIn.localeCompare(b.clockIn));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        // Only check overlaps when both sessions have clock-out provided
        if (sorted[i].clockOut && sorted[j].clockOut) {
          const noOverlap = (sorted[i].clockOut <= sorted[j].clockIn) || (sorted[j].clockOut <= sorted[i].clockIn);
          if (!noOverlap) {
            hookToast({ title: "Overlap", description: "Sessions overlap within the same shift.", variant: "destructive" });
            return;
          }
        }
      }
    }

    // Check overlaps against ALL other sessions for the same user on the same date (different shifts)
    const shiftId = editShiftModal.shiftId;
    const date = editShiftModal.date!;
    const userId = editShiftModal.userId!;
    const otherSessionsSameUserDate = sessionData.filter(s => {
      if (s.shiftId === shiftId) return false; // exclude current shift; will be replaced
      // Resolve session user and date via scheduleData mapping
      const scheduleItem = scheduleData.find(si => si.shifts.some(sh => sh.id === s.shiftId));
      if (!scheduleItem) return false;
      if (scheduleItem.userId !== userId) return false;
      const sDateRaw = s.shift?.date || s.scheduleSessionId;
      const sDate = sDateRaw ? formatDateStringLocal(String(sDateRaw)) : '';
      return sDate === date;
    });

    // If there is any existing open session for this user/date, block adding any new sessions until it's closed
    const existingOpen = otherSessionsSameUserDate.find(s => !!s.clockIn && !s.clockOut);
    // if (existingOpen) {
    //   hookToast({ title: "Open Session Exists", description: `An existing session starting at ${existingOpen.clockIn} has no clock-out. Please add a clock-out before adding another session.`, variant: "destructive" });
    //   return;
    // }

    // Check edited rows against other closed sessions on the date
    for (const row of editSessions) {
      for (const s of otherSessionsSameUserDate) {
        if (!s.clockIn) continue;
        if (row.clockOut && s.clockOut) {
          if (doTimesOverlap(row.clockIn, row.clockOut, s.clockIn, s.clockOut)) {
            hookToast({ title: "Overlap", description: "Edited sessions overlap with other sessions on this date.", variant: "destructive" });
            return;
          }
        }
        // If the edited row is open-ended, it overlaps any closed session that ends after its start
        if (!row.clockOut && s.clockOut) {
          if (s.clockOut > row.clockIn) {
            hookToast({ title: "Overlap", description: "Open-ended session overlaps with another session on this date.", variant: "destructive" });
            return;
          }
        }
      }
    }

    // Build new list for this shiftId
    
    // Remove existing sessions for this shift
    const remaining = sessionData.filter(s => s.shiftId !== shiftId);
    // Add new ones
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

  const cancelEditShiftSessions = () => {
    setEditShiftModal({ isOpen: false, userId: null, date: null, shiftId: null });
    setEditSessions([]);
  };

  // Delete all data for a user
  const handleDeleteUser = (userId: number) => {
    setDeleteUserModal({ isOpen: true, userId });
  };

  const confirmDeleteUser = () => {
    const { userId } = deleteUserModal;
    const updatedData = sessionData.filter(item => {
      const sessionUserId = item.scheduleSessionId; // Use scheduleSessionId for user lookup
      if (!sessionUserId) return false; // No scheduleSessionId means it's not a session from a schedule

      const scheduleItem = scheduleData.find(scheduleItem =>
        scheduleItem.shifts.some(shift => shift.scheduleSessionId === sessionUserId)
      );
      return scheduleItem?.userId !== userId;
    });
    onSessionDataChange(updatedData);
    setDeleteUserModal({ isOpen: false, userId: null });
  };

  const cancelDeleteUser = () => {
    setDeleteUserModal({ isOpen: false, userId: null });
  };

  // Delete all sessions for a shift
  const confirmDeleteAllForShift = () => {
    if (!deleteAllModal.isOpen || deleteAllModal.shiftId == null) return;
    const updated = sessionData.filter(s => s.shiftId !== deleteAllModal.shiftId);
    onSessionDataChange(updated);
    setDeleteAllModal({ isOpen: false, shiftId: null });
  };
  const cancelDeleteAllForShift = () => setDeleteAllModal({ isOpen: false, shiftId: null });

  // Drag & drop removed for Actual table per requirements

  const getCellKey = (userId: number, date: string, shiftId: number) =>
    `${userId}|${date}|${shiftId}`;

  const sessionsById = useMemo(() => {
    const map = new Map<number, SessionItem>();
    sessionData.forEach(s => map.set(s.id, s));
    return map;
  }, [sessionData]);

  const cellMap = useMemo(() => {
    const map = new Map<string, {
      sessionId: number | null;
      shiftId: number;
      scheduleSessionId: number;
      clockIn: string | null;
      clockOut: string | null;
    }>();

    scheduleData.forEach(item => {
      item.shifts.forEach(shift => {
        if (!shift?.id || !shift?.scheduleSessionId) return;

        const date = shift.date ? formatDateStringLocal(shift.date) : item.startDate;
        // 1) try exact shiftId
        let match = sessionData.filter(s => s.shiftId === shift.id);
        // 2) fallback: same scheduleSessionId + same date (older data)
        if (match.length === 0) {
          match = sessionData.filter(s => {
            const sd = s.shift?.date || s.scheduleSessionId; // Use scheduleSessionId for date lookup
            const sDate = sd ? formatDateStringLocal(String(sd)) : '';
            return s.scheduleSessionId === shift.scheduleSessionId && sDate === date;
          });
        }
        // pick first only
        const first = match[0];

        map.set(getCellKey(item.userId, date, shift.id), {
          sessionId: first ? first.id : null,
          shiftId: shift.id,
          scheduleSessionId: shift.scheduleSessionId!,
          clockIn: first?.clockIn || null,
          clockOut: first?.clockOut || null,

        });
      });
    });

    return map;
  }, [scheduleData, sessionData]);

  // Also add debugging to the findSessionForCell function
  const findSessionForCell = (
    shiftId?: number,
    scheduleSessionId?: number,
    date?: string
  ): SessionItem | null => {
    if (!shiftId && !scheduleSessionId) return null;
    
    // new data: exact shiftId - should be unique
    if (shiftId) {
      const session = sessionData.find(s => s.shiftId === shiftId);
      if (session) return session;
    }
    
    // old data fallback: same scheduleSessionId + same date + same shiftId
    if (scheduleSessionId && shiftId) {
      const session = sessionData.find(s => {
        const d = s.shift?.date || s.scheduleSessionId;
        const sDate = d ? formatDateStringLocal(String(d)) : '';
        return s.scheduleSessionId === scheduleSessionId && 
               sDate === date && 
               s.shiftId === shiftId;
      });
      return session || null;
    }
    
    return null;
  };

  const buildUserDateShifts = useMemo(() => {
    // Map<userId, Map<date, Shift[]>>
    const map = new Map<number, Map<string, Shift[]>>();
    for (const item of scheduleData) {
      const u = item.userId;
      const d = item.startDate; // already YYYY-MM-DD in your data
      if (!map.has(u)) map.set(u, new Map());
      const dateMap = map.get(u)!;
      dateMap.set(d, item.shifts || []);
    }
    return map;
  }, [scheduleData]);

  const getUserRowCount = (userId: number, dateCols: { date: string }[]) => {
    const dateMap = buildUserDateShifts.get(userId);
    if (!dateMap) return 1;
    let max = 1;
    for (const dc of dateCols) {
      const len = (dateMap.get(dc.date)?.length) || 0;
      if (len > max) max = len;
    }
    return max;
  };

  return (
    <div className="relative w-full rounded-2xl border border-gray-200 shadow-xl">
      {loading && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <div className="w-full overflow-auto custom-scrollbar rounded-2xl" style={{ maxHeight: "600px" }}>
        {/* Table */}
        <table className="w-auto min-w-full table-fixed text-sm text-gray-800 font-sans border-collapse">
          <thead className="bg-[#004175] text-white text-xs font-sans sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2 text-left border border-gray-300 whitespace-nowrap">
                Employee Name
              </th>
              {dateColumns.map(dateCol => (
                <th key={dateCol.date} className="px-4 py-3 text-center border border-gray-300 whitespace-nowrap relative" style={{ minWidth: '120px' }}>
                  <span>{dateCol.display}</span>
                </th>
              ))}
              <th className="px-4 py-2 text-center border border-gray-300 whitespace-nowrap">
                Total
              </th>
              <th className="px-4 py-2 text-center border border-gray-300 whitespace-nowrap w-16">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="relative">
            {uniqueUsers.map((user, userIndex) => {
              const rowCount = getUserRowCount(user.id, dateColumns);

              return (
                <React.Fragment key={user.id}>
                  {[...Array(rowCount)].map((_, rowIdx) => (
                    <tr
                      key={`${user.id}-row-${rowIdx}`}
                      className={`hover:bg-blue-50 transition-colors ${(userIndex + rowIdx) % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
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

                      {dateColumns.map((dateCol, colIdx) => {
                        const shift = buildUserDateShifts.get(user.id)?.get(dateCol.date)?.[rowIdx] || null;
                        const sessions = shift ? getSessionsForShift(shift.id, shift.scheduleSessionId, dateCol.date, user.id) : [];
                        const hasSessions = sessions.length > 0;
                        
                        // Check for time violations, mismatches, and overtime across all sessions in the cell
                        // const hasViolation = shift ? sessions.some(s => hasTimeViolation(s, shift)) : false;
                        const hasMismatch = shift ? hasTimeMismatch(shift, sessions) : false;
                        // const hasOvertimeWorked = shift ? hasOvertime(shift, sessions) : false;

                        return (
                          <td
                            key={`${dateCol.date}-${rowIdx}-${colIdx}`}
                            className={`border border-gray-300 px-4 py-3 text-center text-sm whitespace-nowrap ${
                                hasMismatch
                                 ? 'bg-red-100 border-red-300' // Red background for time mismatch
                                 : ''
                            }`}
                            title={
                               hasMismatch
                                ? 'Time mismatch: Total actual time does not equal scheduled shift duration'
                                :  ''
                            }
                          >
                            {isEditMode && shift && (
                              <div className="flex items-center space-x-1 opacity-100 mb-1 justify-center">
                                 <Button onClick={() => openEditShift(user.id, dateCol.date, shift.id)} variant="ghost" size="icon-sm" className="text-blue-600 p-0.5" title="Edit sessions">
                                   <FaRegEdit className="w-4 h-4" />
                                 </Button>
                                 {hasSessions && (
                                   <Button onClick={() => setDeleteAllModal({ isOpen: true, shiftId: shift.id })} variant="ghost" size="icon-sm" className="text-red-600 p-0.5" title="Delete all sessions">
                                     <FaRegTrashAlt className="w-4 h-4" />
                                   </Button>
                                 )}
                              </div>
                            )}
                            {hasSessions ? (
                              <div className="flex flex-col items-center gap-1">
                                {sessions.map(s => (
                                  <span key={s.id} className="text-xs  px-2 py-0.5 rounded-md">
                                    {(s.clockIn || 'N/A')} - {formatTimeDisplay(s.clockOut || 'N/A')}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        );
                      })}

                      <td
                        className="border border-gray-300 px-4 py-3 text-center font-medium whitespace-nowrap"
                      >
                        {calculateRowTotal(user.id, rowIdx, sessionData, scheduleData, dateColumns)}
                      </td>
                      {rowIdx === 0 && (
                        <td
                          className="border border-gray-300 px-4 py-3 text-center w-16 align-middle whitespace-nowrap"
                          rowSpan={rowCount}
                        >
                            {/* {isEditMode && (
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Delete all data for this user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )} */}
                        </td>
                      )}
                    </tr>
                  ))}

                  <tr className={`transition-colors ${userIndex % 2 === 0 ? 'bg-gray-100' : 'bg-gray-200'}`}>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center whitespace-nowrap">
                      Total
                    </td>
                    {dateColumns.map(dateCol => {
                      const dayTotal = calculateDayTotal(dateCol.date, sessionData.filter(item => {
                        const scheduleItem = scheduleData.find(si =>
                          si.shifts.some(shift => shift.id === item.shiftId)
                        );
                        return scheduleItem?.userId === user.id;
                      }));
                      return (
                        <td key={dateCol.date} className="border border-gray-300 px-4 py-3 text-center text-sm font-medium whitespace-nowrap">
                          {dayTotal > 0 ? dayTotal : '-'}
                        </td>
                      );
                    })}
                    <td className="border border-gray-300 px-4 py-3 text-center font-medium whitespace-nowrap">
                      {calculateUserTotal(user.id, sessionData, scheduleData)}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 whitespace-nowrap">
                      {/* Empty cell for alignment */}
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
                  {calculateDayTotal(dateCol.date, sessionData) || '-'}
                </td>
              ))}
              <td className="border border-gray-300 px-4 py-3 text-center whitespace-nowrap">
                {calculateGrandTotal(sessionData)}
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
              title="Publish Actual Time"
            >
              {isPublishing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </button>
            <button
              onClick={onToggleEditMode}
              className="inline-flex items-center px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium shadow-sm"
              title="Cancel Edit Mode"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={onPublish}
            disabled={true}
            className="inline-flex items-center px-4 py-2 text-white bg-gray-400 cursor-not-allowed rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium shadow-sm"
            title="Enter edit mode to publish"
          >
            <Send className="w-4 h-4 mr-2" />
            Save
          </button>
        )}

        {/* Print, Download and Edit buttons - Right side */}
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
             onClick={() => { logEditableCells(scheduleData); onToggleEditMode(); }}
             className={`inline-flex items-center px-3 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isEditMode
                 ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 focus:ring-blue-500'
                 : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:ring-gray-500'
               }`}
             title={isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
           >
             <FaRegEdit className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Delete All Sessions for Shift */}
      {deleteAllModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-6">
              <p className="text-sm text-gray-500">Delete all clock-in/clock-out entries for this shift?</p>
            </div>
            <div className="flex space-x-3 justify-end">
              <button type="button" onClick={cancelDeleteAllForShift} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]">Cancel</button>
               <button type="button" onClick={confirmDeleteAllForShift} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center">
                 <FaRegTrashAlt className="w-4 h-4 mr-2" /> Delete All
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Shift Sessions Modal */}
      {editShiftModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-xl w-full mx-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Edit Sessions</h3>
              
            </div>
            {editSessions.length === 0 && (
              <div className="text-sm text-gray-500 mb-3">No sessions yet. Click "Add Session" to create one.</div>
            )}
            <div className="space-y-3 max-h-[50vh] overflow-auto pr-1">
              {editSessions.map((row, idx) => (
                <div key={idx} className="grid grid-cols-11 gap-2 items-end">
                  <div className="col-span-5">
                    <label className="block text-xs text-gray-600 mb-1">Check In</label>
                    <input type="time" value={row.clockIn} onChange={(e) => setEditSessions(prev => prev.map((r, i) => i === idx ? { ...r, clockIn: e.target.value } : r))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] focus:border-[#004175]" />
                  </div>
                  <div className="col-span-5">
                    <label className="block text-xs text-gray-600 mb-1">Check Out</label>
                    <input type="time" value={row.clockOut} onChange={(e) => setEditSessions(prev => prev.map((r, i) => i === idx ? { ...r, clockOut: e.target.value } : r))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] focus:border-[#004175]" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeEditSessionRow(idx)} className="text-red-600 inline-flex items-center px-2 py-2 hover:bg-red-50 rounded-md" title="Delete this session">
                      <FaRegTrashAlt className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex space-x-3 justify-end mt-6">
            <button onClick={addEditSessionRow} className="text-blue-600 inline-flex items-center text-sm">
                <GoPlus className="w-4 h-4 mr-1" /> Add Session
              </button>
              <button type="button" onClick={cancelEditShiftSessions} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]">Cancel</button>
              <button type="button" onClick={saveEditShiftSessions} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center">
                <FaRegEdit className="w-4 h-4 mr-2" /> Save
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
                <FaRegTrashAlt  className="w-4 h-4 mr-2" />
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

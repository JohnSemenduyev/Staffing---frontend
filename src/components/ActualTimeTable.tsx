import React, { useState, useMemo } from "react";
import { Eye, Edit, Trash2, GripVertical, Plus, RotateCcw, Printer, Upload, Send, Calendar } from "lucide-react";
import ToggleSwitch from "./ui/toggle";
import { useToast } from "../hooks/use-toast";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { formatDateLocal, formatDateStringLocal, formatTimeDisplay, formatUSPhone } from "../lib/utils";

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

// Calculate totals
const calculateDayTotal = (date: string, sessionData: SessionItem[]) => {
  const total = sessionData
    .filter(item => {
      // Check if the session's date matches the given date
      const sessionDate = item.shift?.date || String(item.scheduleSessionId); // Convert to string
      const formattedSessionDate = sessionDate ? formatDateStringLocal(sessionDate) : "";
      return formattedSessionDate === date;
    })
    .reduce((total, item) => total + (item.workedTime || 0), 0);
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
    .reduce((t, item) => t + (item.workedTime || 0), 0);
  return parseFloat(total.toFixed(2));
};

const calculateGrandTotal = (sessionData: SessionItem[]) => {
  const total = sessionData.reduce((total, item) => total + item.workedTime, 0);
  return parseFloat(total.toFixed(2));
};

// Get grand total cell style
const getGrandTotalCellStyle = (sessionData: SessionItem[]) => {
  const total = calculateGrandTotal(sessionData);
  if (total > 40) return "bg-red-100 text-red-800";
  if (total > 30) return "bg-yellow-100 text-yellow-800";
  return "";
};

// TODO: Implement these functions in the future
const handleGenerateExcel = () => {
  // TODO: Implement Excel generation for actual time data
  console.log("Generate Excel for actual time data");
};

const handleGeneratePrintableTable = () => {
  // TODO: Implement printable table generation for actual time data
  console.log("Generate printable table for actual time data");
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

const calculateHours = (start: string, end: string) =>
  parseFloat((minutesDiffWithWrap(start, end) / 60).toFixed(2));

// Utility function to check for time violations
const hasTimeViolation = (session: SessionItem, shift: Shift): boolean => {
  if (!session.clockIn || !shift.startTime) return false;
  
  // Convert times to minutes for comparison
  const clockInMinutes = timeToMinutes(session.clockIn);
  const shiftStartMinutes = timeToMinutes(shift.startTime);
  
  // Check if clock-in is after shift start time
  if (clockInMinutes > shiftStartMinutes) {
    return true;
  }
  
  // Check if clock-out is before shift start time (if clock-out exists)
  if (session.clockOut) {
    const clockOutMinutes = timeToMinutes(session.clockOut);
    if (clockOutMinutes < shiftStartMinutes) {
      return true;
    }
  }
  
  return false;
};

// Check if times don't match exactly (for highlighting)
const hasTimeMismatch = (shift: Shift, session: SessionItem): boolean => {
  if (!session) return false;
  
  // Check if start time doesn't match clock-in OR end time doesn't match clock-out
  const startTimeMismatch = shift.startTime !== session.clockIn;
  const endTimeMismatch = shift.endTime !== session.clockOut;
  
  return startTimeMismatch || endTimeMismatch;
};


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

  // Modal states for edit/delete functionality
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, sessionId: null, userId: null, date: null });
  const [editModal, setEditModal] = useState({ isOpen: false, session: null, userId: null, date: null });
  const [deleteUserModal, setDeleteUserModal] = useState({ isOpen: false, userId: null });
  const [editForm, setEditForm] = useState({ starttime: "", endtime: "" });

  // Add session modal for adding new sessions
  const [addSessionModal, setAddSessionModal] = useState({ isOpen: false, userId: null, date: null, shiftId: null });
  const [addSessionForm, setAddSessionForm] = useState({ starttime: "", endtime: "" });

  // Drag and drop states
  const [draggedSession, setDraggedSession] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);
  const hasTimeOverlap = (userId: number, date: string, start: string, end: string) => {
    return sessionData.some(s => {
      const d = s.shift?.date || String(s.scheduleSessionId); // Convert to string
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

  // Helper function to find session for a specific shift
  const findSessionForShift = (shiftId: number, scheduleSessionId: number) => {
    // First try to find by shiftId (new data)
    let session = sessionData.find(s => s.shiftId === shiftId);

    // If not found by shiftId, try by scheduleSessionId (for older data)
    if (!session) {
      session = sessionData.find(s => s.scheduleSessionId === scheduleSessionId);
    }

    return session;
  };

  // Helper function to check if session has valid clock-in/clock-out data
  const hasValidSessionData = (session: SessionItem | null) => {
    return session && session.clockIn && session.clockOut;
  };

  // Delete individual session
  const handleDeleteSession = (userId: number, date: string, sessionId: number) => {
    setDeleteModal({ isOpen: true, sessionId, userId, date });
  };

  const confirmDeleteSession = () => {
    const { userId, date, sessionId } = deleteModal;
    const updatedData = sessionData.filter(session => session.id !== sessionId);

    onSessionDataChange(updatedData);
    setDeleteModal({ isOpen: false, sessionId: null, userId: null, date: null });
  };

  const cancelDeleteSession = () => {
    setDeleteModal({ isOpen: false, sessionId: null, userId: null, date: null });
  };

  // Edit individual session
  const handleEditSession = (userId: number, date: string, session: SessionItem) => {
    setEditModal({ isOpen: true, session, userId, date });
    setEditForm({
      starttime: session.clockIn || "",
      endtime: session.clockOut || ""
    });
  };

  const confirmEditSession = () => {
    const { userId, date, session } = editModal;

    // Validate the edit form
    if (!editForm.starttime || !editForm.endtime) {
      hookToast({
        title: "Validation Error",
        description: "Check In and Check Out are required.",
        variant: "destructive",
      });
      return;
    }

    // Enforce minimum session duration of 1 minute
    const durationMinutes = minutesDiffWithWrap(editForm.starttime, editForm.endtime);
    if (durationMinutes < 1) {
      hookToast({
        title: "Invalid Duration",
        description: "Check Out must be at least 1 minute after Check In.",
        variant: "destructive",
      });
      return;
    }

    const updatedData = sessionData.map(item =>
      item.id === session.id
        ? {
          ...item,
          clockIn: editForm.starttime,
          clockOut: editForm.endtime,
          workedTime: calculateHours(editForm.starttime, editForm.endtime)
        }
        : item
    );

    onSessionDataChange(updatedData);
    setEditModal({ isOpen: false, session: null, userId: null, date: null });
    setEditForm({ starttime: "", endtime: "" });
  };

  const cancelEditSession = () => {
    setEditModal({ isOpen: false, session: null, userId: null, date: null });
    setEditForm({ starttime: "", endtime: "" });
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

  // Add new session for a specific shift
  const handleAddSession = (userId: number, date: string, shiftId: number) => {
    setAddSessionModal({ isOpen: true, userId, date, shiftId });
    setAddSessionForm({ starttime: "", endtime: "" });
  };

  const confirmAddSession = () => {
    const { userId, date, shiftId } = addSessionModal;

    const hasStart = !!addSessionForm.starttime;
    const hasEnd = !!addSessionForm.endtime;

    if (hasEnd && !hasStart) {
      hookToast({
        title: "Error",
        description: "Clock-out requires clock-in.",
        variant: "destructive",
      });
      return;
    }

    if (hasStart && hasEnd) {
      if (addSessionForm.starttime >= addSessionForm.endtime) {
        hookToast({
          title: "Error",
          description: "Start time must be before end time.",
          variant: "destructive",
        });
        return;
      }
      if (hasTimeOverlap(addSessionModal.userId, addSessionModal.date, addSessionForm.starttime, addSessionForm.endtime)) {
        hookToast({
          title: "Error",
          description: "Time overlap detected! This session overlaps with an existing session.",
          variant: "destructive",
        });
        return;
      }
    }

    const newHours = hasStart && hasEnd ? calculateHours(addSessionForm.starttime, addSessionForm.endtime) : undefined;

    const sid = Number(shiftId);
    const scheduleItem = scheduleData.find(item =>
      item.userId === userId && item.shifts?.some(s => s.id === sid)
    );
    
    if (!scheduleItem) {
      hookToast({ 
        title: "Error", 
        description: "Schedule item not found for this shift.", 
        variant: "destructive" 
      });
      return;
    }

    const shift = scheduleItem.shifts.find(s => s.id === sid);
    if (!shift) {
      hookToast({ 
        title: "Error", 
        description: "Shift not found.", 
        variant: "destructive" 
      });
      return;
    }

    if (!shift.scheduleSessionId) {
      hookToast({ 
        title: "Error", 
        description: "Shift is missing scheduleSessionId.", 
        variant: "destructive" 
      });
      return;
    }

    // Check if a session already exists for this shiftId
    const existingSession = sessionData.find(s => s.shiftId === shift.id);
    if (existingSession) {
      hookToast({ 
        title: "Error", 
        description: "A session already exists for this shift.", 
        variant: "destructive" 
      });
      return;
    }

    const newSession: SessionItem = {
      id: Date.now(),
      shiftId: shift.id,
      scheduleSessionId: shift.scheduleSessionId,
      clockIn: hasStart ? addSessionForm.starttime : null,
      clockOut: hasEnd ? addSessionForm.endtime : null,
      workedTime: newHours ?? 0,
      shift: {
        id: shift.id,
        date: date,
      }
    };

    const updatedData = [...sessionData, newSession];
    onSessionDataChange(updatedData);

    setAddSessionModal({ isOpen: false, userId: null, date: null, shiftId: null });
    setAddSessionForm({ starttime: "", endtime: "" });
  };

  const cancelAddSession = () => {
    setAddSessionModal({ isOpen: false, userId: null, date: null, shiftId: null });
    setAddSessionForm({ starttime: "", endtime: "" });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, session: SessionItem, sourceUserId: number, sourceDate: string, sourceRowIdx: number) => {
    setDraggedSession({
      session,
      sourceUserId,
      sourceDate,
      sourceRowIdx
    });
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', `Copying clock-in/clock-out times: ${session.clockIn} - ${session.clockOut}`);
  };

  const handleDragOver = (e: React.DragEvent, targetUserId: number, targetDate: string, targetRowIdx: number) => {
    e.preventDefault();
    setDragOverCell({ userId: targetUserId, date: targetDate, rowIdx: targetRowIdx });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverCell(null);
  };

  const handleDrop = (e: React.DragEvent, targetUserId: number, targetDate: string, targetRowIdx: number) => {
    e.preventDefault();

    if (!draggedSession) return;

    const { session, sourceUserId, sourceDate, sourceRowIdx } = draggedSession;

    // Don't allow dropping on the same cell
    if (sourceUserId === targetUserId && sourceDate === targetDate && sourceRowIdx === targetRowIdx) {
      setDraggedSession(null);
      setDragOverCell(null);
      return;
    }

    // Find the target shift for this user and date
    const targetScheduleItem = scheduleData.find(item =>
      item.userId === targetUserId && item.startDate === targetDate
    );

    if (!targetScheduleItem || targetScheduleItem.shifts.length === 0) {
      hookToast({
        title: "Error",
        description: "No shift found for this user and date.",
        variant: "destructive",
      });
      setDraggedSession(null);
      setDragOverCell(null);
      return;
    }

    // Use the shift at the targetRowIdx
    const targetShift = targetScheduleItem.shifts[targetRowIdx];
    if (!targetShift?.id) { setDraggedSession(null); setDragOverCell(null); return; }

    // Check if a session already exists for this shiftId
    const existing = sessionData.find(s => s.shiftId === targetShift.id);

    if (existing) {
      // Update existing session
      const updatedData = sessionData.map(item =>
        item.id === existing.id
          ? {
            ...item,
            clockIn: session.clockIn,
            clockOut: session.clockOut,
            workedTime: session.workedTime
          }
          : item
      );
      onSessionDataChange(updatedData);
    } else {
      // Create new session only if none exists for this shiftId
      const newSession: SessionItem = {
        id: Date.now(),
        shiftId: targetShift.id,
        scheduleSessionId: targetShift.scheduleSessionId,
        clockIn: session.clockIn,
        clockOut: session.clockOut,
        workedTime: session.workedTime,
        shift: {
          id: targetShift.id,
          date: targetDate
        }
      };

      const updatedData = [...sessionData, newSession];
      onSessionDataChange(updatedData);
    }

    setDraggedSession(null);
    setDragOverCell(null);
  };

  const handleDragEnd = () => {
    setDraggedSession(null);
    setDragOverCell(null);
  };

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
      <div className="w-full overflow-auto rounded-2xl" style={{ maxHeight: "600px" }}>
        {/* Table */}
        <table className="w-auto min-w-full table-fixed text-sm text-gray-800 font-sans border-collapse">
          <thead className="bg-[#004175] text-white text-xs font-sans sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left border border-gray-300 whitespace-nowrap">
                Employee Name
              </th>
              {dateColumns.map(dateCol => (
                <th key={dateCol.date} className="px-4 py-3 text-center border border-gray-300 whitespace-nowrap relative" style={{ minWidth: '120px' }}>
                  <span>{dateCol.display}</span>
                </th>
              ))}
              <th className="px-4 py-3 text-center border border-gray-300 whitespace-nowrap">
                Total
              </th>
              <th className="px-4 py-3 text-center border border-gray-300 whitespace-nowrap w-16">
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
                        // Robust lookup: try by exact shiftId, then fallback to scheduleSessionId + date
                        const session = shift
                          ? findSessionForCell(
                              shift.id,
                              shift.scheduleSessionId,
                              dateCol.date
                            )
                          : null;
                        const hasSession = Boolean(session);
                        
                        // Check for time violations and mismatches
                        const hasViolation = hasSession && shift ? hasTimeViolation(session!, shift) : false;
                        const hasMismatch = hasSession && shift ? hasTimeMismatch(shift, session!) : false;

                        return (
                          <td
                            key={`${dateCol.date}-${rowIdx}-${colIdx}`}
                            className={`border border-gray-300 px-4 py-3 text-center text-sm whitespace-nowrap ${
                              dragOverCell?.userId === user.id && dragOverCell?.date === dateCol.date && dragOverCell?.rowIdx === rowIdx
                                ? 'bg-blue-50 border-blue-300'
                                : hasMismatch
                                ? 'bg-red-100 border-red-300' // Yellow background for time mismatches
                                : hasViolation
                                ? 'bg-red-100' // Dull red background for time violations
                                : ''
                            }`}
                            title={
                              hasMismatch 
                                ? 'Time mismatch: Scheduled time differs from actual clock-in/clock-out time' 
                                : hasViolation 
                                ? 'Time violation: Clock-in after shift start or clock-out before shift start' 
                                : ''
                            }
                            onDragOver={e => handleDragOver(e, user.id, dateCol.date, rowIdx)}
                            onDragLeave={handleDragLeave}
                            onDrop={e => handleDrop(e, user.id, dateCol.date, rowIdx)}
                          >
                            {isEditMode && shift && (
                              <div className="flex items-center space-x-1 opacity-100 mb-1 justify-center">
                                {hasSession ? (
                                  <>
                                    <div
                                      className="cursor-grab text-gray-400 hover:text-gray-600"
                                      draggable
                                      onDragStart={e => handleDragStart(e, session!, user.id, dateCol.date, rowIdx)}
                                      onDragEnd={handleDragEnd}
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                    <button onClick={() => handleEditSession(user.id, dateCol.date, session!)} className="text-blue-600 p-0.5">
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteSession(user.id, dateCol.date, session!.id)} className="text-red-600 p-0.5">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => {
                                      handleAddSession(user.id, dateCol.date, shift!.id);
                                    }}
                                    className="text-blue-600 hover:text-blue-700 p-0.5"
                                    title="Add session"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}
                            <span className="text-sm">
                              {hasSession ? `${session!.clockIn || 'N/A'} - ${formatTimeDisplay(session!.clockOut || 'N/A')}` : <span className="text-gray-400">-</span>}
                            </span>
                          </td>
                        );
                      })}

                      {rowIdx === 0 && (
                        <>
                          <td
                            className="border border-gray-300 px-4 py-3 text-center font-medium whitespace-nowrap"
                            rowSpan={rowCount}
                          >
                            {calculateUserTotal(user.id, sessionData, scheduleData)}
                          </td>
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
                        </>
                      )}
                    </tr>
                  ))}

                  <tr className={`transition-colors ${userIndex % 2 === 0 ? 'bg-gray-100' : 'bg-gray-200'}`}>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center whitespace-nowrap">
                      Total
                    </td>
                    {dateColumns.map(dateCol => {
                      const dayTotal = calculateDayTotal(dateCol.date, sessionData);
                      return (
                        <td key={dateCol.date} className="border border-gray-300 px-4 py-3 text-center text-sm font-medium whitespace-nowrap">
                          {dayTotal > 0 ? dayTotal : '-'}
                        </td>
                      );
                    })}
                    <td className="border border-gray-300 px-4 py-3 text-center font-medium whitespace-nowrap">
                      {calculateGrandTotal(sessionData)}
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
              className="inline-flex items-center px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium shadow-sm"
              title="Publish Actual Time"
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
            disabled={isPublishing}
            className="inline-flex items-center px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium shadow-sm"
            title="Publish Actual Time"
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
              <Printer className="w-5 h-5" />
            )}
          </button>

          <button
            onClick={onDownloadExcel}
            className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            title="Download Excel"
          >
            <Upload className="w-5 h-5" />
          </button>

          <button
            onClick={() => { logEditableCells(scheduleData); onToggleEditMode(); }}
            className={`inline-flex items-center px-3 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isEditMode
                ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 focus:ring-blue-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:ring-gray-500'
              }`}
            title={isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          >
            <Edit className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Delete Session Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this session?
              </p>
            </div>

            <div className="flex space-x-3 justify-end">
              <button
                type="button"
                onClick={cancelDeleteSession}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSession}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Session</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check In</label>
                <input
                  type="time"
                  value={editForm.starttime}
                  onChange={(e) => setEditForm(prev => ({ ...prev, starttime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] focus:border-[#004175]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check Out</label>
                <input
                  type="time"
                  value={editForm.endtime}
                  onChange={(e) => setEditForm(prev => ({ ...prev, endtime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] focus:border-[#004175]"
                />
              </div>
            </div>

            <div className="flex space-x-3 justify-end mt-6">
              <button
                type="button"
                onClick={cancelEditSession}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmEditSession}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
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
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Session Modal */}
      {addSessionModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Session</h3>
              <p className="text-sm text-gray-500 mt-1">
                Set check-in and check-out times for the selected shift
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check In</label>
                <input
                  type="time"
                  value={addSessionForm.starttime}
                  onChange={(e) => setAddSessionForm(prev => ({ ...prev, starttime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] focus:border-[#004175]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check Out</label>
                <input
                  type="time"
                  value={addSessionForm.endtime}
                  onChange={(e) => setAddSessionForm(prev => ({ ...prev, endtime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] focus:border-[#004175]"
                />
              </div>
            </div>

            <div className="flex space-x-3 justify-end mt-6">
              <button
                type="button"
                onClick={cancelAddSession}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAddSession}
                disabled={!addSessionForm.starttime}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

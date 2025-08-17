import React, { useState } from "react";
import { Eye, Edit, Trash2, GripVertical, Plus, RotateCcw, Printer, Upload, Send, Calendar } from "lucide-react";
import ToggleSwitch from "./ui/toggle";
import { useToast } from "../hooks/use-toast";
import { toast } from "sonner";
import * as XLSX from "xlsx";

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

// Updated Session interface to match GraphQL schema
interface SessionItem {
  id: number;
  shiftId?: number;
  scheduleSessionId: number;
  clockIn: string;
  clockOut: string;
  workedTime: number;
  clockInLat?: number;
  clockInLong?: number;
  clockOutLat?: number;
  clockOutLong?: number;
  shift?: Shift;
  scheduleSession?: ScheduleSession;
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
}

// Utility functions
const timeToMinutes = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const doTimesOverlap = (start1: string, end1: string, start2: string, end2: string) => {
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);

  return start1Minutes < end2Minutes && end1Minutes > start2Minutes;
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

const getMaxSessionsPerDay = (userId: number, sessionData: SessionItem[]) => {
  const userDays = sessionData.filter(i => i.scheduleSession?.userId === userId);
  let max = 1;
  for (const d of userDays) max = Math.max(max, 1); // Each session represents one entry per day
  return max;
};

const sortShiftsByTime = (shifts: any[]) => {
  return [...shifts].sort((a, b) => {
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    const timeA = a.startTime || a.clockIn || "00:00";
    const timeB = b.startTime || b.clockIn || "00:00";
    return timeToMinutes(timeA) - timeToMinutes(timeB);
  });
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
  isPrinting
}) => {
  const { toast: hookToast } = useToast();

  // Modal states for edit/delete functionality
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, sessionId: null, userId: null, date: null });
  const [editModal, setEditModal] = useState({ isOpen: false, session: null, userId: null, date: null });
  const [deleteUserModal, setDeleteUserModal] = useState({ isOpen: false, userId: null });
  const [editForm, setEditForm] = useState({ starttime: "", endtime: "" });
  
  // Additional modal states for shift and session management
  const [addShiftModal, setAddShiftModal] = useState({ 
    isOpen: false, 
    date: null, 
    selectedGuardId: null,
    selectedShiftId: null 
  });
  const [addSessionModal, setAddSessionModal] = useState({ isOpen: false, userId: null, date: null });
  const [addSessionForm, setAddSessionForm] = useState({ starttime: "", endtime: "" });
  
  // Get unique guards from schedule data
  const getUniqueGuards = () => {
    const guardMap = new Map();
    scheduleData.forEach(item => {
      if (!guardMap.has(item.userId)) {
        guardMap.set(item.userId, {
          id: item.userId,
          name: item.userName,
          phone: item.userPhone
        });
      }
    });
    return Array.from(guardMap.values());
  };

  // Drag and drop states
  const [draggedSession, setDraggedSession] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);

  // Generate date columns for the actual time table
  const generateDateColumns = () => {
    if (!currentWeekRange) return [];

    const dates = [];
    const startDate = new Date(currentWeekRange.startOfWeek);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push({
        date: date.toISOString().split('T')[0],
        display: `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`
      });
    }
    return dates;
  };

  const dateColumns = generateDateColumns();

  // Helper function to get user ID from session data
  const getSessionUserId = (session: SessionItem): number => {
    let userId = session.scheduleSession?.userId;
    if (!userId && session.scheduleSessionId) {
      // If scheduleSession is null, find the user from schedule data
      const scheduleItem = scheduleData.find(item => 
        item.shifts.some(shift => shift.scheduleSessionId === session.scheduleSessionId)
      );
      userId = scheduleItem?.userId || 0;
    }
    return userId || 0;
  };

  // Get max shifts per day for a user
  const getMaxShiftsPerDay = (userId: number, sessionData: SessionItem[]) => {
    // Count sessions per day for this user
    const sessionsPerDay = new Map<string, number>();
    
    sessionData.forEach(session => {
      const sessionUserId = getSessionUserId(session);
      if (sessionUserId === userId) {
        const sessionDate = session.shift?.date || session.scheduleSession?.startDate;
        const formattedDate = sessionDate ? new Date(sessionDate).toISOString().split('T')[0] : "";
        if (formattedDate) {
          sessionsPerDay.set(formattedDate, (sessionsPerDay.get(formattedDate) || 0) + 1);
        }
      }
    });
    
    // Return the maximum number of sessions on any single day, or 1 if no sessions
    const maxSessions = Math.max(...Array.from(sessionsPerDay.values()), 1);
    return maxSessions;
  };

  // Transform session data to match the expected format
  const actualTimeData = sessionData.map(session => {
    // Convert ISO date to YYYY-MM-DD format for comparison
    const sessionDate = session.shift?.date || session.scheduleSession?.startDate || "";
    const formattedDate = sessionDate ? new Date(sessionDate).toISOString().split('T')[0] : "";
    
    return {
      id: session.id,
      userId: getSessionUserId(session),
      startDate: formattedDate,
      shifts: [{
        id: session.id,
        date: formattedDate,
        startTime: session.clockIn || "",
        endTime: session.clockOut || "",
        hours: session.workedTime || 0,
        clockIn: session.clockIn,
        clockOut: session.clockOut
      }]
    };
  });

  // Get unique users from schedule data (always show schedule users even if no session data)
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

    // Add users from session data (if not already present)
    sessionData.forEach(item => {
      const userId = getSessionUserId(item);
      if (userId && !userMap.has(userId)) {
        userMap.set(userId, {
          id: userId,
          name: item.scheduleSession?.user?.name || `User ${userId}`,
          phone: item.scheduleSession?.user?.phone || ""
        });
      }
    });

    // Ensure we always return at least one user if schedule data exists
    if (userMap.size === 0 && scheduleData.length > 0) {
      const firstScheduleItem = scheduleData[0];
      userMap.set(firstScheduleItem.userId, {
        id: firstScheduleItem.userId,
        name: firstScheduleItem.userName,
        phone: firstScheduleItem.userPhone
      });
    }

    return Array.from(userMap.values());
  };

  const uniqueUsers = getUniqueUsers();

  // Calculate totals
  const calculateDayTotal = (date: string) => {
    const total = sessionData
      .filter(item => {
        // Check if the session's date matches the given date
        const sessionDate = item.shift?.date || item.scheduleSession?.startDate;
        const formattedSessionDate = sessionDate ? new Date(sessionDate).toISOString().split('T')[0] : "";
        return formattedSessionDate === date;
      })
      .reduce((total, item) => total + (item.workedTime || 0), 0);
    return parseFloat(total.toFixed(2));
  };

  const calculateUserTotal = (userId: number) => {
    const total = sessionData
      .filter(item => getSessionUserId(item) === userId)
      .reduce((total, item) => total + (item.workedTime || 0), 0);
    return parseFloat(total.toFixed(2));
  };

  const calculateGrandTotal = () => {
    const total = sessionData.reduce((total, item) => total + item.workedTime, 0);
    return parseFloat(total.toFixed(2));
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
    hookToast({
      title: "Session Deleted",
      description: "Session has been deleted successfully.",
    });
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

    // Check for overlapping sessions
    const existingSessions = sessionData
      .filter(item => {
        const itemUserId = getSessionUserId(item);
        const itemDate = item.shift?.date || item.scheduleSession?.startDate;
        const formattedItemDate = itemDate ? new Date(itemDate).toISOString().split('T')[0] : "";
        return itemUserId === userId && formattedItemDate === date && item.id !== session.id;
      });

    for (const existingSession of existingSessions) {
      if (doTimesOverlap(editForm.starttime, editForm.endtime, existingSession.clockIn, existingSession.clockOut)) {
        hookToast({
          title: "Overlapping Session",
          description: "Session time overlaps with existing session for this user and date",
          variant: "destructive",
        });
        return;
      }
    }

    const calculateHours = (start: string, end: string) => {
      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);
      let hours = endH - startH + (endM - startM) / 60;
      if (hours < 0) hours += 24;
      return parseFloat(hours.toFixed(2));
    };

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
    hookToast({
      title: "Session Updated",
      description: "Session has been updated successfully.",
    });
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
    const updatedData = sessionData.filter(item => getSessionUserId(item) !== userId);
    onSessionDataChange(updatedData);
    setDeleteUserModal({ isOpen: false, userId: null });
    hookToast({
      title: "User Data Deleted",
      description: "All data for this user has been deleted successfully.",
    });
  };

  const cancelDeleteUser = () => {
    setDeleteUserModal({ isOpen: false, userId: null });
  };

  // Add new session
  const handleAddSession = (userId: number, date: string) => {
    // TODO: Implement add session functionality
    // This will open a modal to add a new session for the user on the specified date
    console.log("Add session for user:", userId, "on date:", date);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, session: SessionItem, sourceUserId: number, sourceDate: string) => {
    setDraggedSession({
      session,
      sourceUserId,
      sourceDate
    });
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', `Copying clock-in/clock-out times: ${session.clockIn} - ${session.clockOut}`);
  };

  const handleDragOver = (e: React.DragEvent, targetUserId: number, targetDate: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverCell({ userId: targetUserId, date: targetDate });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverCell(null);
  };

  const handleDrop = (e: React.DragEvent, targetUserId: number, targetDate: string) => {
    e.preventDefault();

    if (!draggedSession) return;

    const { session, sourceUserId, sourceDate } = draggedSession;

    // Don't allow dropping on the same cell
    if (sourceUserId === targetUserId && sourceDate === targetDate) {
      setDraggedSession(null);
      setDragOverCell(null);
      return;
    }

    // Find existing session data at target location
    const existingSessions = sessionData.filter(item => {
      const itemUserId = getSessionUserId(item);
      const itemDate = item.shift?.date || item.scheduleSession?.startDate;
      const formattedItemDate = itemDate ? new Date(itemDate).toISOString().split('T')[0] : "";
      return itemUserId === targetUserId && formattedItemDate === targetDate;
    });

    // Check for overlapping sessions (excluding the existing session we might be updating)
    const hasOverlap = existingSessions.some(existingSession => {
      return doTimesOverlap(
        session.clockIn,
        session.clockOut,
        existingSession.clockIn,
        existingSession.clockOut
      );
    });

    if (hasOverlap) {
      hookToast({
        title: "Overlapping Session",
        description: "Cannot drop session here - it overlaps with existing sessions for this user and date.",
        variant: "destructive",
      });
      setDraggedSession(null);
      setDragOverCell(null);
      return;
    }

    // Calculate worked time for the new clock-in/clock-out times
    const calculateHours = (start: string, end: string) => {
      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);
      let hours = endH - startH + (endM - startM) / 60;
      if (hours < 0) hours += 24;
      return parseFloat(hours.toFixed(2));
    };

    let newSession: SessionItem;

    if (existingSessions.length > 0) {
      // Destination has existing data - merge clock-in/clock-out times with existing data
      const existingSession = existingSessions[0]; // Take the first existing session
      
      newSession = {
        ...existingSession,
        clockIn: session.clockIn, // Use clock-in/clock-out from source
        clockOut: session.clockOut,
        workedTime: calculateHours(session.clockIn, session.clockOut)
      };
    } else {
      // Destination is empty - create new session using schedule data
      const scheduleItem = scheduleData.find(item => 
        item.userId === targetUserId && item.startDate === targetDate
      );

      if (!scheduleItem) {
        hookToast({
          title: "Error",
          description: "Schedule item not found for this user and date.",
          variant: "destructive",
        });
        setDraggedSession(null);
        setDragOverCell(null);
        return;
      }

      // Find the shift for this date
      const shift = scheduleItem.shifts.find(s => {
        const shiftDate = s.date ? new Date(s.date).toISOString().split('T')[0] : "";
        return shiftDate === targetDate;
      });

      if (!shift) {
        hookToast({
          title: "Error",
          description: "Shift not found for this date.",
          variant: "destructive",
        });
        setDraggedSession(null);
        setDragOverCell(null);
        return;
      }

      newSession = {
        id: Date.now(), // Generate temporary ID for new session
        shiftId: shift.id,
        scheduleSessionId: shift.scheduleSessionId,
        clockIn: session.clockIn, // Use clock-in/clock-out from source
        clockOut: session.clockOut,
        workedTime: calculateHours(session.clockIn, session.clockOut),
        shift: {
          id: shift.id,
          date: targetDate,
          startTime: shift.startTime,
          endTime: shift.endTime,
          hours: shift.hours
        },
        scheduleSession: {
          id: scheduleItem.id,
          clientId: scheduleItem.clientId,
          addressId: scheduleItem.addressId,
          userId: scheduleItem.userId,
          startDate: scheduleItem.startDate,
          auto: scheduleItem.auto,
          client: {
            name: scheduleItem.clientName
          },
          address: {
            address: scheduleItem.address
          },
          user: {
            id: scheduleItem.userId,
            name: scheduleItem.userName,
            phone: scheduleItem.userPhone
          }
        }
      };
    }

    // Keep source unchanged and add/update target (copy operation)
    let updatedData = [...sessionData];

    // If destination had existing data, replace it; otherwise add new session
    if (existingSessions.length > 0) {
      updatedData = updatedData.map(item => 
        item.id === existingSessions[0].id ? newSession : item
      );
    } else {
      updatedData = updatedData.concat(newSession);
    }

    onSessionDataChange(updatedData);
    setDraggedSession(null);
    setDragOverCell(null);

    hookToast({
      title: "Session Copied",
      description: "Session clock-in/clock-out times have been copied successfully.",
    });
  };

  const handleDragEnd = () => {
    setDraggedSession(null);
    setDragOverCell(null);
  };

  // Add shift from header
  const handleAddShiftFromHeader = (date: string) => {
    setAddShiftModal({ isOpen: true, date, selectedGuardId: null, selectedShiftId: null });
  };

  // Handle guard selection
  const handleGuardSelection = (guardId: number) => {
    setAddShiftModal(prev => ({ ...prev, selectedGuardId: guardId, selectedShiftId: null }));
  };

  // Get shifts for the selected guard on the specific date (step 2)
  const getShiftsForGuardOnDate = (selectedGuardId?: number, selectedDate?: string) => {
    if (!selectedGuardId || !selectedDate) return [];
    
    // Find the schedule item for the selected guard and date
    const scheduleItem = scheduleData.find(item => 
      item.userId === selectedGuardId && item.startDate === selectedDate
    );
    
    if (!scheduleItem) return [];
    
    // Return all shifts for that guard on that date
    return scheduleItem.shifts.map(shift => ({
      id: shift.id,
      startTime: shift.startTime,
      endTime: shift.endTime,
      hours: shift.hours,
      date: shift.date,
      scheduleSessionId: shift.scheduleSessionId
    }));
  };

  // Get available shifts for the selected date and selected guard (step 3)
  const getAvailableShifts = (selectedGuardId?: number, selectedDate?: string) => {
    if (!selectedGuardId || !selectedDate) return [];
    
    // Find the schedule item for the selected guard and date
    const scheduleItem = scheduleData.find(item => 
      item.userId === selectedGuardId && item.startDate === selectedDate
    );
    
    if (!scheduleItem) return [];
    
    // Return all shifts for that guard on that date
    return scheduleItem.shifts.map(shift => ({
      id: shift.id,
      startTime: shift.startTime,
      endTime: shift.endTime,
      hours: shift.hours,
      date: shift.date,
      scheduleSessionId: shift.scheduleSessionId
    }));
  };

  // Handle shift selection
  const handleShiftSelection = (shift: any) => {
    setAddShiftModal({ isOpen: false, date: null, selectedGuardId: null, selectedShiftId: null });
    setAddSessionModal({ isOpen: true, userId: addShiftModal.selectedGuardId, date: addShiftModal.date });
    setAddSessionForm({ starttime: shift.startTime, endtime: shift.endTime });
  };

  // Cancel add shift
  const cancelAddShift = () => {
    setAddShiftModal({ isOpen: false, date: null, selectedGuardId: null, selectedShiftId: null });
  };

  // Cancel add session
  const cancelAddSession = () => {
    setAddSessionModal({ isOpen: false, userId: null, date: null });
    setAddSessionForm({ starttime: "", endtime: "" });
  };

  // Confirm add session
  const confirmAddSession = () => {
    const { userId, date } = addSessionModal;

    if (!userId || !addSessionForm.starttime || !addSessionForm.endtime) {
      hookToast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Calculate worked time
    const calculateHours = (start: string, end: string) => {
      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);
      let hours = endH - startH + (endM - startM) / 60;
      if (hours < 0) hours += 24;
      return parseFloat(hours.toFixed(2));
    };

    // Find the schedule session for this user and date
    const scheduleItem = scheduleData.find(item => 
      item.userId === userId && item.startDate === date
    );

    if (!scheduleItem) {
      hookToast({
        title: "Error",
        description: "Schedule item not found for this user and date.",
        variant: "destructive",
      });
      return;
    }

    // Find the shift for this date
    const shift = scheduleItem.shifts.find(s => {
      const shiftDate = s.date ? new Date(s.date).toISOString().split('T')[0] : "";
      return shiftDate === date;
    });
    if (!shift) {
      hookToast({
        title: "Error",
        description: "Shift not found for this date.",
        variant: "destructive",
      });
      return;
    }

    // Check for overlapping sessions
    const existingSessions = sessionData
      .filter(item => {
        const itemUserId = getSessionUserId(item);
        const itemDate = item.shift?.date || item.scheduleSession?.startDate;
        const formattedItemDate = itemDate ? new Date(itemDate).toISOString().split('T')[0] : "";
        return itemUserId === userId && formattedItemDate === date;
      });

    for (const existingSession of existingSessions) {
      if (doTimesOverlap(addSessionForm.starttime, addSessionForm.endtime, existingSession.clockIn, existingSession.clockOut)) {
        hookToast({
          title: "Overlapping Session",
          description: "Session time overlaps with existing session for this user and date",
          variant: "destructive",
        });
        return;
      }
    }

    // Create new session locally
    const newSession: SessionItem = {
      id: Date.now(), // Generate temporary ID for local session
      shiftId: shift.id,
      scheduleSessionId: shift.scheduleSessionId, // Use the shift's scheduleSessionId
      clockIn: addSessionForm.starttime,
      clockOut: addSessionForm.endtime,
      workedTime: calculateHours(addSessionForm.starttime, addSessionForm.endtime),
      shift: {
        id: shift.id,
        date: date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        hours: shift.hours
      },
      scheduleSession: {
        id: scheduleItem.id,
        clientId: scheduleItem.clientId,
        addressId: scheduleItem.addressId,
        userId: scheduleItem.userId,
        startDate: scheduleItem.startDate,
        auto: scheduleItem.auto,
        client: {
          name: scheduleItem.clientName
        },
        address: {
          address: scheduleItem.address
        },
        user: {
          id: scheduleItem.userId,
          name: scheduleItem.userName,
          phone: scheduleItem.userPhone
        }
      }
    };

    // Add new session to local data
    const updatedData = [...sessionData, newSession];
    onSessionDataChange(updatedData);

    setAddSessionModal({ isOpen: false, userId: null, date: null });
    setAddSessionForm({ starttime: "", endtime: "" });

    hookToast({
      title: "Session Added",
      description: "New session has been added successfully.",
    });
  };

  // Get grand total cell style
  const getGrandTotalCellStyle = () => {
    const total = calculateGrandTotal();
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

  return (
    <div className="relative w-full rounded-2xl border border-gray-200 shadow-xl">
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
                  {isEditMode && (
                    <button
                      onClick={() => handleAddShiftFromHeader(dateCol.date)}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 text-green-600 hover:text-green-800 p-1.5 hover:bg-green-50 rounded"
                      title={`Add shift for ${dateCol.display}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
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
              const rowCount = getMaxShiftsPerDay(user.id, sessionData);

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
                          <div className="text-xs text-gray-500">{user.phone}</div>
                        </td>
                      )}

                      {dateColumns.map(dateCol => {
                        // Get all sessions for this user on this date
                        const daySessions = sessionData.filter(session => {
                          const sessionUserId = getSessionUserId(session);
                          const sessionDate = session.shift?.date || session.scheduleSession?.startDate;
                          const formattedSessionDate = sessionDate ? new Date(sessionDate).toISOString().split('T')[0] : "";
                          return sessionUserId === user.id && formattedSessionDate === dateCol.date;
                        });
                        // Sort sessions by clock-in time
                        const sortedSessions = daySessions.sort((a, b) => {
                          const timeA = a.clockIn || "00:00";
                          const timeB = b.clockIn || "00:00";
                          return timeToMinutes(timeA) - timeToMinutes(timeB);
                        });
                        const session = sortedSessions[rowIdx];

                        return (
                          <td
                            key={dateCol.date + '-' + rowIdx}
                            className={`border border-gray-300 px-4 py-3 text-center text-sm whitespace-nowrap ${
                              dragOverCell?.userId === user.id && dragOverCell?.date === dateCol.date
                                ? 'bg-blue-50 border-blue-300'
                                : ''
                            }`}
                            onDragOver={e => handleDragOver(e, user.id, dateCol.date)}
                            onDragLeave={handleDragLeave}
                            onDrop={e => handleDrop(e, user.id, dateCol.date)}
                          >
                            {session ? (
                              <div className="relative group">
                                {isEditMode && (
                                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity mb-1 justify-center">
                                    <div
                                      className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                                      draggable
                                      onDragStart={e => handleDragStart(e, session, user.id, dateCol.date)}
                                      onDragEnd={handleDragEnd}
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                    <button
                                      onClick={() => handleEditSession(user.id, dateCol.date, session)}
                                      className="text-blue-600 hover:text-blue-800 p-0.5 hover:bg-blue-50 rounded"
                                      title="Edit session"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSession(user.id, dateCol.date, session.id)}
                                      className="text-red-600 hover:text-red-800 p-0.5 hover:bg-red-50 rounded"
                                      title="Delete session"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                                <span className="text-sm">
                                  {/* Display clock-in/clock-out times */}
                                  {`${session.clockIn || 'N/A'} - ${session.clockOut || 'N/A'}`}
                                </span>
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
                            {calculateUserTotal(user.id)}
                          </td>
                          <td
                            className="border border-gray-300 px-4 py-3 text-center w-16 align-middle whitespace-nowrap"
                            rowSpan={rowCount}
                          >
                            {isEditMode && (
                              <button 
                                onClick={() => handleDeleteUser(user.id)} 
                                className="text-red-600 hover:text-red-800 p-1" 
                                title="Delete all data for this user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
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
                      const daySessions = sessionData.filter(i => {
                        const userId = getSessionUserId(i);
                        const sessionDate = i.shift?.date || i.scheduleSession?.startDate;
                        const formattedSessionDate = sessionDate ? new Date(sessionDate).toISOString().split('T')[0] : "";
                        return userId === user.id && formattedSessionDate === dateCol.date;
                      });
                      const dayTotal = daySessions.reduce((t, s) => t + (s.workedTime || 0), 0);
                      const rounded = parseFloat(dayTotal.toFixed(2));
                      return (
                        <td key={dateCol.date} className="border border-gray-300 px-4 py-3 text-center text-sm font-medium whitespace-nowrap">
                          {rounded > 0 ? rounded : '-'}
                        </td>
                      );
                    })}
                    <td className="border border-gray-300 px-4 py-3 text-center font-medium whitespace-nowrap">
                      {calculateUserTotal(user.id)}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center whitespace-nowrap">
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
                  {calculateDayTotal(dateCol.date) || '-'}
                </td>
              ))}
              <td className="border border-gray-300 px-4 py-3 text-center whitespace-nowrap">
                {calculateGrandTotal()}
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
            onClick={onToggleEditMode}
            className={`inline-flex items-center px-3 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isEditMode 
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Session</h3>
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete User Data</h3>
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

             {/* Shift Selection Modal */}
       {addShiftModal.isOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                           <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {!addShiftModal.selectedGuardId ? "Select Guard" : "Select Shift"}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {!addShiftModal.selectedGuardId 
                    ? `Choose a guard for ${addShiftModal.date}`
                    : `Choose a shift for ${addShiftModal.date}`
                  }
                </p>
              </div>

                           <div className="space-y-2 max-h-60 overflow-y-auto">
                {!addShiftModal.selectedGuardId ? (
                  // Step 1: Show guards
                  getUniqueGuards().length > 0 ? (
                    getUniqueGuards().map((guard) => (
                      <button
                        key={guard.id}
                        onClick={() => handleGuardSelection(guard.id)}
                        className="w-full p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#004175] focus:border-[#004175]"
                      >
                        <div className="font-medium text-gray-900">{guard.name}</div>
                        {guard.phone && (
                          <div className="text-sm text-gray-500">{guard.phone}</div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      No guards available.
                    </div>
                  )
                ) : (
                  // Step 2: Show shifts for selected guard on specific date
                  getShiftsForGuardOnDate(addShiftModal.selectedGuardId, addShiftModal.date).length > 0 ? (
                    getShiftsForGuardOnDate(addShiftModal.selectedGuardId, addShiftModal.date).map((shift, index) => (
                      <button
                        key={index}
                        onClick={() => handleShiftSelection(shift)}
                        className="w-full p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#004175] focus:border-[#004175]"
                      >
                        <div className="font-medium text-gray-900">
                          {shift.startTime} - {shift.endTime}
                        </div>
                        {shift.hours && (
                          <div className="text-sm text-gray-500">
                            {shift.hours} hours
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      No shifts available for this guard on this date.
                    </div>
                  )
                )}
              </div>

                           <div className="flex space-x-3 justify-end mt-6">
                {addShiftModal.selectedGuardId && (
                  <button
                    type="button"
                    onClick={() => setAddShiftModal(prev => ({ ...prev, selectedGuardId: null, selectedShiftId: null }))}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]"
                  >
                    Back to Guards
                  </button>
                )}
                <button
                  type="button"
                  onClick={cancelAddShift}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]"
                >
                  Cancel
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
                  disabled={!addSessionForm.starttime || !addSessionForm.endtime}
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

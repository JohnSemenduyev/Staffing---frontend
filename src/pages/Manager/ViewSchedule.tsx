import React, { useEffect, useState } from "react";
import { useClientSessions, UpdateOneSessionTimesInput, SessionTimeInput } from "../../context/ViewSchedule";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import { GET_SESSIONS_BY_SCHEDULE_SESSION } from "../../graphql/queries";
import { graphQLClient } from "../../GraphqlClient";
import { Eye, RotateCcw, Printer, Upload, Send, Edit } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { toZonedTime } from 'date-fns-tz';

// Import our refactored components
import { PeriodEndDateModal } from "./ViewSchedule/PeriodEndDateModal";
import { AddGuardForm } from "./ViewSchedule/AddGuardForm";
import { ScheduleTable } from "./ViewSchedule/ScheduleTable";
import { Modals } from "./ViewSchedule/Modals";
// Import our custom hooks and utilities
import { useScheduleState, useScheduleActions } from "./ViewSchedule/hooks";
import {
  generateDateColumns,
  convertDateFormat,
  getWeekRangeFromDate,
  getUniqueUsers,
  calculateUserTotal,
  calculateDayTotal,
  calculateGrandTotal,
  getUniqueShiftTimes,
  getShiftForUserDateAndTime
} from "./ViewSchedule/utils";

// Import types
import { ScheduleItem, DateColumn } from "./ViewSchedule/types";

export const ViewSchedule = () => {
  const {
    clientSessions,
    loading,
    error,
    fetchClientSessions,
    scheduleData: apiScheduleData,
    scheduleLoading,
    scheduleError,
    fetchScheduleData,
    clearScheduleData,
    bulkUpsertScheduleSessions,
    updateManySessionTimes, 
    mutationLoading
  } = useClientSessions();

  // Use our custom state hook
  const {
    scheduleData,
    setScheduleData,
    currentWeekRange,
    setCurrentWeekRange,
    selectedDate,
    setSelectedDate,
    isEditMode,
    setIsEditMode,
    draggedShift,
    setDraggedShift,
    dragOverCell,
    setDragOverCell,
    deleteModal,
    setDeleteModal,
    editModal,
    setEditModal,
    deleteUserModal,
    setDeleteUserModal,
    editForm,
    setEditForm
  } = useScheduleState();

  // Use our custom actions hook for schedule table
  const {
    handleDeleteShift: originalHandleDeleteShift,
    confirmDeleteShift: originalConfirmDeleteShift,
    cancelDeleteShift,
    handleEditShift: originalHandleEditShift,
    confirmEditShift: originalConfirmEditShift,
    cancelEditShift,
    handleDeleteUser: originalHandleDeleteUser,
    confirmDeleteUser: originalConfirmDeleteUser,
    cancelDeleteUser,
    handleUserAutoToggle,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  } = useScheduleActions(
    scheduleData,
    setScheduleData,
    currentWeekRange,
    deleteModal, // Add this
    setDeleteModal,
    editModal, // Add this
    setEditModal,
    deleteUserModal, // Add this
    setDeleteUserModal,
    editForm, // Add this
    setEditForm,
    draggedShift, // Add this
    setDraggedShift,
    setDragOverCell
  );

  // Wrapper handlers for schedule table that set the flag
  const handleDeleteShift = (userId: number, date: string, shiftId: number) => {
    setIsEditingSession(false);
    originalHandleDeleteShift(userId, date, shiftId);
  };

  const handleEditShift = (userId: number, date: string, shift: any) => {
    setIsEditingSession(false);
    originalHandleEditShift(userId, date, shift);
  };

  const handleDeleteUser = (userId: number) => {
    setIsEditingSession(false);
    originalHandleDeleteUser(userId);
  };

  const confirmDeleteShift = () => {
    if (isEditingSession) {
      handleSessionConfirmDeleteShift();
    } else {
      originalConfirmDeleteShift();
    }
  };

  const confirmEditShift = () => {
    if (isEditingSession) {
      handleSessionConfirmEditShift();
    } else {
      originalConfirmEditShift();
    }
  };

  const confirmDeleteUser = () => {
    if (isEditingSession) {
      handleSessionConfirmDeleteUser();
    } else {
      originalConfirmDeleteUser();
    }
  };

  // Create separate action handlers for session table
  const handleSessionDeleteShift = (userId: number, date: string, shiftId: number) => {
    setIsEditingSession(true);
    setDeleteModal({
      isOpen: true,
      userId,
      date,
      shiftId
    });
  };

  const handleSessionEditShift = (userId: number, date: string, shift: any) => {
    setIsEditingSession(true);
    setEditModal({
      isOpen: true,
      userId,
      date,
      shift
    });
    setEditForm({
      starttime: shift.startTime,
      endtime: shift.endTime
    });
  };

  const handleSessionDeleteUser = (userId: number) => {
    setIsEditingSession(true);
    setDeleteUserModal({
      isOpen: true,
      userId
    });
  };

  const handleSessionUserAutoToggle = (userId: number, enabled: boolean) => {
    setSessionData(prev =>
      prev.map(item =>
        item.userId === userId
          ? { ...item, auto: enabled }
          : item
      )
    );
  };
  const handleSessionDragStart = (e: React.DragEvent, shift: any, sourceUserId: number, sourceDate: string, sourceRowIdx: number) => {
    console.log('Session drag start:', { shift, sourceUserId, sourceDate, sourceRowIdx });
    setDraggedShift({
      shift,
      sourceUserId,
      sourceDate,
      sourceRowIdx
    });
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleSessionDragOver = (e: React.DragEvent, targetUserId: number, targetDate: string, targetRowIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverCell({
      userId: targetUserId,
      date: targetDate,
      rowIdx: targetRowIdx
    });
  };
  const handleSessionDragLeave = (e: React.DragEvent) => {
    setDragOverCell(null);
  };



  // Replace the session drag handlers with these corrected versions:
  // Fix the session drop handler to create a deep copy
  const handleSessionDrop = (e: React.DragEvent, targetUserId: number, targetDate: string, targetRowIdx: number) => {
    e.preventDefault();

    if (!draggedShift) return;

    const { shift, sourceUserId, sourceDate } = draggedShift;
    console.log('Session drop:', { shift, sourceUserId, sourceDate, targetUserId, targetDate, targetRowIdx });

    // Check if target user-date combination already exists
    const existingItem = sessionData.find(item =>
      item.userId === targetUserId && item.startDate === targetDate
    );

    if (existingItem) {
      // Replace existing shifts at target position (copy operation)
      setSessionData(prev =>
        prev.map(item => {
          if (item.userId === targetUserId && item.startDate === targetDate) {
            const newShifts = [...item.shifts];
            // Create a deep copy of the shift to avoid reference issues
            const deepCopiedShift = JSON.parse(JSON.stringify(shift));
            // Replace at the target position (remove existing if any)
            newShifts.splice(targetRowIdx, 1, {
              ...deepCopiedShift,
              date: targetDate,
              id: Date.now() + Math.random() // Generate new ID to avoid conflicts
            });
            return { ...item, shifts: newShifts };
          }
          return item;
        })
      );
    } else {
      // Create new item for target user-date combination
      const sourceItem = sessionData.find(item =>
        item.userId === sourceUserId && item.startDate === sourceDate
      );

      if (sourceItem) {
        const deepCopiedShift = JSON.parse(JSON.stringify(shift));
        const newSessionItem = {
          ...sourceItem,
          userId: targetUserId,
          startDate: targetDate,
          shifts: [{
            ...deepCopiedShift,
            date: targetDate,
            id: Date.now() + Math.random()
          }]
        };

        setSessionData(prev => [...prev, newSessionItem]);
      }
    }

    setDraggedShift(null);
    setDragOverCell(null);
  };
  const handleSessionDragEnd = () => {
    setDraggedShift(null);
    setDragOverCell(null);
  };

  // Session-specific modal handlers
  const handleSessionConfirmDeleteShift = () => {
    if (!deleteModal.isOpen || !deleteModal.userId || !deleteModal.date || !deleteModal.shiftId) return;

    setSessionData(prev =>
      prev.map(item => {
        if (item.userId === deleteModal.userId && item.startDate === deleteModal.date) {
          const newShifts = item.shifts.filter(shift => shift.id !== deleteModal.shiftId);
          return { ...item, shifts: newShifts };
        }
        return item;
      })
    );

    setDeleteModal({ isOpen: false, userId: null, date: null, shiftId: null });
  };

  const handleSessionConfirmEditShift = () => {
    if (!editModal.isOpen || !editModal.userId || !editModal.date || !editModal.shift) return;

    setSessionData(prev =>
      prev.map(item => {
        if (item.userId === editModal.userId && item.startDate === editModal.date) {
          const newShifts = item.shifts.map(shift =>
            shift.id === editModal.shift.id
              ? { ...shift, startTime: editForm.starttime, endTime: editForm.endtime }
              : shift
          );
          return { ...item, shifts: newShifts };
        }
        return item;
      })
    );

    setEditModal({ isOpen: false, userId: null, date: null, shift: null });
    setEditForm({ starttime: '', endtime: '' });
  };

  const handleSessionConfirmDeleteUser = () => {
    if (!deleteUserModal.isOpen || !deleteUserModal.userId) return;

    setSessionData(prev => prev.filter(item => item.userId !== deleteUserModal.userId));
    setDeleteUserModal({ isOpen: false, userId: null });
  };
  const validateSessionTimes = (sessionTimeUpdates: UpdateOneSessionTimesInput[]): { valid: UpdateOneSessionTimesInput[], invalid: Array<{ sessionId: number, clockIn: string, clockOut: string, reason: string }> } => {
    const valid: UpdateOneSessionTimesInput[] = [];
    const invalid: Array<{ sessionId: number, clockIn: string, clockOut: string, reason: string }> = [];
  
    sessionTimeUpdates.forEach(session => {
      const { sessionId, clockIn, clockOut } = session;
      
      // Convert times to minutes for easier comparison
      const parseTime = (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
  
      const clockInMinutes = parseTime(clockIn);
      const clockOutMinutes = parseTime(clockOut);
  
      // Check for invalid time format
      if (isNaN(clockInMinutes) || isNaN(clockOutMinutes)) {
        invalid.push({
          sessionId,
          clockIn,
          clockOut,
          reason: "Invalid time format"
        });
        return;
      }
  
      // Check for overnight shifts (clockOut < clockIn)
      if (clockOutMinutes < clockInMinutes) {
        // This is a valid overnight shift, but we need to handle it differently
        // For now, we'll skip these and log them for manual review
        invalid.push({
          sessionId,
          clockIn,
          clockOut,
          reason: "Overnight shift detected - requires manual handling"
        });
        return;
      }
  
      // Check for zero duration shifts
      if (clockOutMinutes === clockInMinutes) {
        invalid.push({
          sessionId,
          clockIn,
          clockOut,
          reason: "Zero duration shift"
        });
        return;
      }
  
      // Check for unreasonable shift durations (more than 24 hours)
      const durationMinutes = clockOutMinutes - clockInMinutes;
      if (durationMinutes > 24 * 60) {
        invalid.push({
          sessionId,
          clockIn,
          clockOut,
          reason: "Shift duration exceeds 24 hours"
        });
        return;
      }
  
      valid.push(session);
    });
  
    return { valid, invalid };
  };
  // Local state
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showScheduleTable, setShowScheduleTable] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [sessionData, setSessionData] = useState<any[]>([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isEditingSession, setIsEditingSession] = useState(false);

  // Function to fetch session data
  const fetchSessionData = async () => {
    if (!scheduleData || scheduleData.length === 0) {
      setSessionData([]);
      return;
    }

    setSessionLoading(true);
    setSessionError(null);

    try {
      // Get unique schedule session IDs from the schedule data
      const sessionIds = new Set<number>();
      scheduleData.forEach(item => {
        item.shifts.forEach((shift: any) => {
          if (shift.scheduleSessionId) {
            sessionIds.add(shift.scheduleSessionId);
          }
        });
      });

      if (sessionIds.size === 0) {
        setSessionData([]);
        return;
      }

      const allSessions: any[] = [];

      // Fetch session data for each schedule session ID
      for (const sessionId of sessionIds) {
        const response = await graphQLClient.request<{ sessionsByScheduleSession: any[] }>(
          GET_SESSIONS_BY_SCHEDULE_SESSION,
          { scheduleSessionId: sessionId }
        );
        allSessions.push(...response.sessionsByScheduleSession);
      }

      // Transform session data to match schedule data format
      const transformedSessionData = transformSessionDataToScheduleFormat(allSessions);
      setSessionData(transformedSessionData);

    } catch (err: any) {
      console.error("Error fetching session data:", err);
      setSessionError("Failed to fetch session data");
      toast.error("Failed to load session data!");
    } finally {
      setSessionLoading(false);
    }
  };

  // Function to transform session data to schedule format
  const transformSessionDataToScheduleFormat = (sessions: any[]) => {
    if (!sessions.length || !scheduleData.length) return [];

    // Group sessions by user and date
    const userSessionMap = new Map();

    sessions.forEach(session => {
      const shift = session.shift;
      const date = new Date(shift.date).toISOString().split('T')[0];

      // Find the corresponding schedule item to get user info
      const scheduleItem = scheduleData.find(item =>
        item.shifts.some((s: any) => s.scheduleSessionId === session.scheduleSessionId)
      );

      if (scheduleItem) {
        const userId = scheduleItem.userId;
        const userName = scheduleItem.userName;

        if (!userSessionMap.has(userId)) {
          userSessionMap.set(userId, {
            userId,
            userName,
            sessions: []
          });
        }

        userSessionMap.get(userId).sessions.push({
          date,
          clockIn: session.clockIn,
          clockOut: session.clockOut,
          workedTime: session.workedTime,
          sessionId: session.id || null,
        });
      }
    });

    // Convert to schedule format
    const transformedData: any[] = [];

    userSessionMap.forEach((userData, userId) => {
      // Group sessions by date
      const sessionsByDate = new Map();

      userData.sessions.forEach((session: any) => {
        if (!sessionsByDate.has(session.date)) {
          sessionsByDate.set(session.date, []);
        }
        sessionsByDate.get(session.date).push(session);
      });

      // Create schedule items for each date
      sessionsByDate.forEach((dateSessions, date) => {
        const scheduleItem = scheduleData.find(item =>
          item.userId === userId && item.startDate === date
        );

        if (scheduleItem) {
          // Convert sessions to shifts format
          const shifts = dateSessions.map((session: any, index: number) => ({
            id: session.shiftId || (Date.now() + index),
            date: session.date,
            startTime: session.clockIn || "N/A",
            endTime: session.clockOut || "N/A",
            hours: session.workedTime || 0,
            scheduleSessionId: session.sessionId  || null
          }));

          transformedData.push({
            ...scheduleItem,
            shifts: shifts,
            isSessionData: true // Flag to identify this as session data
          });
        }
      });
    });

    return transformedData;
  };

  const handleView = (rowData: any) => {
    const clientData = {
      clientId: rowData.clientId,
      addressId: rowData.addressId,
      name: rowData.clientName,
      address: rowData.address,
      city: rowData.city,
      pincode: rowData.pincode,
      addresses: rowData.client?.addresses || []
    };

    console.log("Selected client data:", clientData);
    setSelectedClient(clientData);
    setModalOpen(true);
  };

  const handleDateSubmit = async (date: string) => {
    setSelectedDate(date);
    setShowScheduleTable(true);

    const clientId = selectedClient?.clientId;
    const addressId = selectedClient?.addressId;

    const formattedDate = convertDateFormat(date);

    console.log("Submitting with:", {
      clientId,
      addressId,
      date: formattedDate,
      originalDate: date
    });

    if (!clientId || !addressId) {
      toast.error("Missing client or address information!");
      return;
    }

    const selectedDateObj = new Date(date + 'T00:00:00');
    const easternDate = toZonedTime(selectedDateObj, 'America/New_York');

    const weekRange = getWeekRangeFromDate(easternDate);
    setCurrentWeekRange(weekRange);

    clearScheduleData();
    setSessionData([]); // Clear session data as well

    try {
      // Start both loading states immediately
      setSessionLoading(true);

      // Fetch schedule data
      await fetchScheduleData(clientId, addressId, formattedDate);
    } catch (error) {
      console.error("Error fetching schedule data:", error);
      toast.error("Failed to load schedule data!");
      setSessionLoading(false); // Stop session loading if schedule fails
    }
  };


  useEffect(() => {
    fetchClientSessions();
  }, []);

  useEffect(() => {
    if (clientSessions && Array.isArray(clientSessions)) {
      const flatData = clientSessions.map(session => ({
        clientName: session.client.name,
        address: session.address.address,
        city: session.address.city,
        state: session.address.state,
        pincode: session.address.pincode,
        addressId: session.addressId,
        clientId: session.clientId
      }));
      setTableData(flatData);
    } else {
      setTableData([]);
    }
  }, [clientSessions]);

  // Transform API data when it arrives
  useEffect(() => {
    if (apiScheduleData && Array.isArray(apiScheduleData) && apiScheduleData.length > 0) {
      console.log("Raw API data:", apiScheduleData);

      const transformedData: ScheduleItem[] = [];

      apiScheduleData.forEach(scheduleGroup => {
        if (scheduleGroup.shifts && scheduleGroup.user) {
          const shiftsByDate = new Map();

          scheduleGroup.shifts.forEach(shift => {
            let readableDate;
            try {
              if (shift.date) {
                const dateObj = new Date(shift.date);
                readableDate = dateObj.toISOString().split('T')[0];
              } else {
                console.warn('Missing date for shift:', shift);
                return;
              }
            } catch (error) {
              console.error('Error converting date:', shift.date, error);
              return;
            }

            if (!shiftsByDate.has(readableDate)) {
              shiftsByDate.set(readableDate, []);
            }

            shiftsByDate.get(readableDate).push({
              id: shift.id,
              date: readableDate,
              startTime: shift.startTime,
              endTime: shift.endTime,
              hours: shift.hours,
              scheduleSessionId: shift.scheduleSessionId
            });
          });

          shiftsByDate.forEach((dateShifts, date) => {
            transformedData.push({
              id: transformedData.length + 1,
              clientId: scheduleGroup.clientId,
              addressId: scheduleGroup.addressId,
              userId: scheduleGroup.user.id,
              startDate: date,
              auto: false,
              shifts: dateShifts,
              clientName: selectedClient?.name || "Unknown Client",
              address: selectedClient?.address || "Unknown Address",
              userName: scheduleGroup.user.name,
              userPhone: ""
            });
          });
        }
      });

      console.log("Transformed schedule data:", transformedData);
      setScheduleData(transformedData);
    } else {
      console.log("No API schedule data or empty array:", apiScheduleData);
      setScheduleData([]);
    }
  }, [apiScheduleData, selectedClient]);

  // Fetch session data when schedule data changes
  useEffect(() => {
    if (scheduleData.length > 0) {
      fetchSessionData();
    }
  }, [scheduleData.length]);
  useEffect(() => {
    if (scheduleData.length === 0) {
      setSessionData([]);
    }
  }, [scheduleData.length]);
  const tableColumns: TableColumn[] = [
    { key: "clientName", label: "Client Name", sortable: true, searchable: true, width: "225px" },
    { key: "address", label: "Street Name", sortable: true, searchable: true, width: "225px" },
    { key: "city", label: "City", sortable: true, searchable: true, width: "225px" },
    { key: "state", label: "State", sortable: true, searchable: true, width: "225px" },
    { key: "pincode", label: "Pincode", sortable: true, searchable: true, width: "225px" },
  ];

  const tableActions: TableAction[] = [
    {
      label: "View",
      icon: <Eye className="w-4 h-4" />,
      onClick: handleView,
      className: "text-blue-500 hover:text-green-700 ml-4 px-1",
      title: "View"
    }
  ];

  const dateColumns = generateDateColumns(currentWeekRange);

  // Excel Download functionality
  const generateExcelFile = () => {
    const formattedData = [];
    const uniqueUsers = getUniqueUsers(scheduleData);

    uniqueUsers.forEach(user => {
      const userShiftTimes = getUniqueShiftTimes(user.id, scheduleData);

      const userMainRow = {
        "Employee Name": `${user.name}\n${user.phone || ""}`,
      };

      dateColumns.forEach(dateCol => {
        const userSchedulesForDate = scheduleData.filter(item =>
          item.userId === user.id && item.startDate === dateCol.date
        );

        if (userSchedulesForDate.length > 0) {
          const shifts = userSchedulesForDate.flatMap(schedule => schedule.shifts);
          const shiftTimes = shifts.map(shift => `${shift.startTime} - ${shift.endTime}`);
          userMainRow[dateCol.display] = shiftTimes.join('\n') || "-";
        } else {
          userMainRow[dateCol.display] = "-";
        }
      });

      userMainRow["Total"] = calculateUserTotal(user.id, scheduleData);
      userMainRow["Auto"] = scheduleData.find(item => item.userId === user.id)?.auto ? "ON" : "OFF";

      formattedData.push(userMainRow);

      const totalRow = {
        "Employee Name": "Total",
      };
      dateColumns.forEach(dateCol => {
        const daySchedules = scheduleData.filter(item =>
          item.userId === user.id && item.startDate === dateCol.date
        );
        const dayTotal = daySchedules.reduce((total, schedule) =>
          total + schedule.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0
        );
        totalRow[dateCol.display] = dayTotal > 0 ? parseFloat(dayTotal.toFixed(2)) : "-";
      });
      totalRow["Total"] = calculateUserTotal(user.id, scheduleData);
      totalRow["Auto"] = "";
      formattedData.push(totalRow);
    });

    const grandTotalRow = {
      "Employee Name": "Grand Total",
    };
    dateColumns.forEach(dateCol => {
      grandTotalRow[dateCol.display] = calculateDayTotal(dateCol.date, scheduleData) || "-";
    });
    grandTotalRow["Total"] = calculateGrandTotal(scheduleData);
    grandTotalRow["Auto"] = "";
    formattedData.push(grandTotalRow);

    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    const colWidths = [
      { wch: 20 },
      ...dateColumns.map(() => ({ wch: 15 })),
      { wch: 10 },
      { wch: 8 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Schedule");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    return blob;
  };

  // Publish functionality
  const handlePublish = async () => {
    if (!scheduleData || scheduleData.length === 0) {
      toast.error("No data available to publish!");
      return;
    }

    try {
      setIsPublishing(true);

      // First API call: Publish schedule data
      const selectedDateObj = new Date(selectedDate);
      const weekRange = getWeekRangeFromDate(selectedDateObj);
      const startDate = weekRange.startOfWeek.toISOString().split('T')[0];
      const endDate = weekRange.endOfWeek.toISOString().split('T')[0];

      const userScheduleMap = new Map();

      scheduleData.forEach(item => {
        const userId = item.userId;
        const scheduleSessionId = item.shifts.length > 0 && item.shifts[0].scheduleSessionId
          ? item.shifts[0].scheduleSessionId
          : null;

        if (!userScheduleMap.has(userId)) {
          userScheduleMap.set(userId, {
            scheduleSessionId: scheduleSessionId,
            clientId: item.clientId,
            addressId: item.addressId,
            userId: userId,
            startDate: convertDateFormat(startDate),
            endDate: convertDateFormat(endDate),
            auto: item.auto,
            weeklyHours: 0,
            shifts: []
          });
        } else {
          const existingSchedule = userScheduleMap.get(userId);
          existingSchedule.auto = item.auto;

          if (!existingSchedule.scheduleSessionId && scheduleSessionId) {
            existingSchedule.scheduleSessionId = scheduleSessionId;
          }
        }

        const userSchedule = userScheduleMap.get(userId);

        item.shifts.forEach(shift => {
          const isClientGeneratedId = shift.id > 1000000000000;
          userSchedule.shifts.push({
            date: convertDateFormat(shift.date),
            startTime: shift.startTime,
            endTime: shift.endTime,
            hours: shift.hours,
            shiftId: isClientGeneratedId ? null : shift.id
          });
        });
      });

      const scheduleInput = Array.from(userScheduleMap.values()).map(userSchedule => {
        const weeklyHours = userSchedule.shifts.reduce((total, shift) => total + shift.hours, 0);

        return {
          ...userSchedule,
          weeklyHours: parseFloat(weeklyHours.toFixed(2))
        };
      });

      console.log("=== PUBLISHING SCHEDULE DATA ===");
      console.log("Schedule Input:", JSON.stringify(scheduleInput, null, 2));
      console.log("Total Users:", scheduleInput.length);
      console.log("Week Range:", { startDate, endDate });
      console.log("=====================================");

      await bulkUpsertScheduleSessions(scheduleInput);
      console.log("scheduleInput", JSON.stringify(scheduleInput, null, 2));

      // Second API call: Update session times (if session data exists)
      if (sessionData && sessionData.length > 0) {
        console.log("=== UPDATING SESSION TIMES ===");
        
        const sessionTimeUpdates: UpdateOneSessionTimesInput[] = [];
        const newSessions: SessionTimeInput[] = [];
        
        sessionData.forEach(item => {
          item.shifts.forEach(shift => {
            // Only include sessions that have actual clock in/out times (not N/A)
            if (shift.startTime !== "N/A" && shift.endTime !== "N/A") {
              if (shift.scheduleSessionId) {
                // Existing session - update with session ID
                sessionTimeUpdates.push({
                  sessionId: shift.scheduleSessionId,
                  clockIn: shift.startTime,
                  clockOut: shift.endTime
                });
              } else {
                // New session - needs to be created with shiftId
                newSessions.push({
                  sessionId: null,  // null for new sessions
                  shiftId: shift.id, // required for new session creation
                  clockIn: shift.startTime,
                  clockOut: shift.endTime
                });
              }
            }
          });
        });
      
        if (sessionData && sessionData.length > 0) {
          console.log("=== UPDATING SESSION TIMES ===");
          
          const sessionTimeUpdates: UpdateOneSessionTimesInput[] = [];
          const newSessions: SessionTimeInput[] = []; // For new sessions that need to be created
          
          sessionData.forEach(item => {
            item.shifts.forEach(shift => {
              // Only include sessions that have actual clock in/out times (not N/A)
              if (shift.startTime !== "N/A" && shift.endTime !== "N/A") {
                if (shift.scheduleSessionId) {
                  // Existing session - update with session ID
                  sessionTimeUpdates.push({
                    sessionId: shift.scheduleSessionId,
                    clockIn: shift.startTime,
                    clockOut: shift.endTime
                  });
                } else {
                  // New session - needs to be created with shiftId
                  newSessions.push({
                    sessionId: null,  // null for new sessions
                    shiftId: shift.id, // required for new session creation
                    clockIn: shift.startTime,
                    clockOut: shift.endTime
                  });
                }
              }
            });
          });
        
          // Handle existing session updates
          if (sessionTimeUpdates.length > 0) {
            console.log("Session time updates:", JSON.stringify(sessionTimeUpdates, null, 2));
            
            // Validate session times before sending to API
            const validation = validateSessionTimes(sessionTimeUpdates);
            
            if (validation.invalid.length > 0) {
              console.warn("Invalid session times detected:", validation.invalid);
              
              // Show warning for invalid sessions
              const invalidMessages = validation.invalid.map(inv => 
                `Session ${inv.sessionId}: ${inv.reason} (${inv.clockIn} - ${inv.clockOut})`
              ).join('\n');
              
              toast.error(`Some session times could not be updated:\n${invalidMessages}`, {
                duration: 5000
              });
            }
        
            if (validation.valid.length > 0) {
              console.log("Valid session time updates:", JSON.stringify(validation.valid, null, 2));
              await updateManySessionTimes(validation.valid);
              console.log("Valid session times updated successfully");
            } else {
              console.log("No valid session time updates to process");
            }
          }
  
          // Handle new session creation
          if (newSessions.length > 0) {
            console.log("New sessions to create:", JSON.stringify(newSessions, null, 2));
            // TODO: Add API call to create new sessions with shiftId
            // await createNewSessions(newSessions);
            console.log("New sessions creation not yet implemented");
          }
        }

      }

      toast.success("Schedule and session times published successfully!");
      
      // Exit edit mode only on successful publish
      setIsEditMode(false);

    } catch (error) {
      console.error("Error publishing schedule:", error);
      toast.error("Failed to publish schedule. Please try again.");
      // Don't exit edit mode on error - stay in edit mode
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!scheduleData || scheduleData.length === 0) {
      toast.error("No data available to export!");
      return;
    }

    const blob = generateExcelFile();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ScheduleReport_${selectedDate}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Excel downloaded!");
  };

  // Print functionality
  const generatePrintableTable = () => {
    if (!scheduleData || scheduleData.length === 0) {
      return `
        <div style="text-align: center; padding: 40px; color: #666; font-size: 16px;">
          <p>No data available to print</p>
          <p style="font-size: 14px; margin-top: 10px;">Please run a search to generate data first.</p>
        </div>
      `;
    }

    const headers = [
      'Employee Name',
      ...dateColumns.map(col => col.display),
      'Total Hours',
      'Auto'
    ];

    const headerRow = headers.map(header =>
      `<th style="background-color: #004175; color: white; font-weight: bold; padding: 8px 4px; text-align: center; border: 1px solid #004175; font-size: 10px;">${header}</th>`
    ).join('');

    let dataRows = '';
    let rowIndex = 0;
    const uniqueUsers = getUniqueUsers(scheduleData);

    uniqueUsers.forEach(user => {
      const userShiftTimes = getUniqueShiftTimes(user.id, scheduleData);

      userShiftTimes.forEach((shiftTime, shiftIndex) => {
        const rowStyle = rowIndex % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f8f9fa;';

        let row = `<tr style="${rowStyle}">`;

        if (shiftIndex === 0) {
          row += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; font-size: 10px; font-weight: bold;" rowspan="${userShiftTimes.length}">
            ${user.name}
          </td>`;
        }
        dateColumns.forEach(dateCol => {
          const shift = getShiftForUserDateAndTime(
            user.id,
            dateCol.date,
            shiftTime.startTime,
            shiftTime.endTime,
            scheduleData
          );
          row += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; text-align: center; font-size: 10px;">
            ${shift ? `${shift.startTime} - ${shift.endTime}` : '-'}
          </td>`;
        });

        if (shiftIndex === 0) {
          row += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; font-size: 10px;" rowspan="${userShiftTimes.length}">
            ${calculateUserTotal(user.id, scheduleData)}
          </td>`;
        }

        if (shiftIndex === 0) {
          const autoValue = scheduleData.find(item => item.userId === user.id)?.auto ? "Yes" : "No";
          row += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; text-align: center; font-size: 10px;" rowspan="${userShiftTimes.length}">
            ${autoValue}
          </td>`;
        }

        row += '</tr>';
        dataRows += row;
        rowIndex++;
      });

      const totalRowStyle = rowIndex % 2 === 0 ? 'background-color: #f0f0f0;' : 'background-color: #e0e0e0;';
      let totalRow = `<tr style="${totalRowStyle}">`;
      totalRow += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; font-weight: bold; font-size: 10px;">Total</td>`;
      dateColumns.forEach(dateCol => {
        const daySchedules = scheduleData.filter(item =>
          item.userId === user.id && item.startDate === dateCol.date
        );
        const dayTotal = daySchedules.reduce((total, schedule) =>
          total + schedule.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0
        );
        const roundedDayTotal = parseFloat(dayTotal.toFixed(2));
        totalRow += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; font-size: 10px;">
          ${roundedDayTotal > 0 ? roundedDayTotal : '-'}
        </td>`;
      });

      totalRow += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; font-size: 10px;">${calculateUserTotal(user.id, scheduleData)}</td>`;
      totalRow += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; font-size: 10px;"></td>`;
      totalRow += '</tr>';
      dataRows += totalRow;
      rowIndex++;
    });

    let grandTotalRow = `<tr style="background-color: #d0d0d0; font-weight: bold;">`;
    grandTotalRow += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; font-weight: bold; font-size: 10px;">Grand Total</td>`;
    dateColumns.forEach(dateCol => {
      grandTotalRow += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; font-size: 10px;">
        ${calculateDayTotal(dateCol.date, scheduleData) || '-'}
      </td>`;
    });

    grandTotalRow += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; font-size: 10px;">${calculateGrandTotal(scheduleData)}</td>`;
    grandTotalRow += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; font-size: 10px;"></td>`;
    grandTotalRow += '</tr>';
    dataRows += grandTotalRow;

    const totalRecords = uniqueUsers.length;
    const totalHours = calculateGrandTotal(scheduleData);

    return `
      <div style="margin-bottom: 20px;">
        <p style="margin: 5px 0; font-size: 14px;"><strong>Client:</strong> ${scheduleData[0]?.clientName || 'N/A'}</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Address:</strong> ${scheduleData[0]?.address || 'N/A'}</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Total Employees:</strong> ${totalRecords}</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Total Hours:</strong> ${totalHours}</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px;">
        <thead>
          <tr>${headerRow}</tr>
        </thead>
        <tbody>
          ${dataRows}
        </tbody>
      </table>
    `;
  };

  const handlePrint = async () => {
    if (!scheduleData || scheduleData.length === 0) {
      toast.error("No data available to print!");
      return;
    }

    try {
      setIsPrinting(true);

      await new Promise(resolve => setTimeout(resolve, 300));

      const tableContent = generatePrintableTable();
      const currentDate = new Date().toLocaleDateString();
      const currentTime = new Date().toLocaleTimeString();

      const printWindow = window.open("", "_blank", "width=1200,height=800,scrollbars=yes,resizable=yes");

      if (!printWindow) {
        toast.error("Pop-up blocked! Please allow pop-ups and try again.");
        return;
      }

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Schedule Report</title>
            <style>
              @page {
                margin: 0.5in;
                size: landscape;
              }
              
              * {
                box-sizing: border-box;
              }
              
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                margin: 0;
                padding: 15px;
                background: white;
                color: #333;
                line-height: 1.3;
              }
              
              .header {
                text-align: center;
                margin-bottom: 20px;
                border-bottom: 2px solid #004175;
                padding-bottom: 10px;
              }
              
              .header h1 { 
                margin: 0;
                color: #004175;
                font-size: 20px;
                font-weight: bold;
              }
              
              .header .subtitle {
                margin: 5px 0 0 0;
                color: #666;
                font-size: 12px;
              }
              
              .print-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 15px;
                font-size: 10px;
                color: #666;
              }
              
              .summary-stats {
                background: #f8f9fa;
                padding: 10px;
                border-radius: 5px;
                margin-bottom: 15px;
                border-left: 4px solid #004175;
              }
              
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 10px;
                background: white;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              
              th { 
                background-color: #004175 !important;
                color: white !important;
                font-weight: bold;
                padding: 8px 4px;
                text-align: center;
                border: 1px solid #004175;
                font-size: 10px;
              }
              
              td { 
                padding: 6px 4px;
                border: 1px solid #dee2e6;
                font-size: 10px;
              }
              
              tr:nth-child(even) {
                background-color: #f8f9fa;
              }
              
              .footer {
                margin-top: 20px;
                text-align: center;
                font-size: 9px;
                color: #666;
                border-top: 1px solid #dee2e6;
                padding-top: 10px;
              }
              
              .no-data {
                text-align: center;
                padding: 40px;
                color: #666;
                font-style: italic;
              }
              
              @media print {
                body { 
                  margin: 0;
                  padding: 10px;
                }
                
                .header h1 {
                  font-size: 18px;
                }
                
                table {
                  font-size: 9px;
                }
                
                th, td {
                  padding: 4px 2px;
                }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Schedule Report</h1>
              <p class="subtitle">Generated on ${currentDate} at ${currentTime}</p>
            </div>
            
            <div class="print-info">
              <div>Report Type: Schedule</div>
              <div>Selected Date: ${selectedDate}</div>
              <div>Page 1 of 1</div>
            </div>
            
            ${tableContent}
            
            <div class="footer">
              <p>This report was generated automatically from the Schedule system.</p>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();

      printWindow.onload = () => {
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };

      toast.success("Print preview opened successfully!");

    } catch (error) {
      console.error("Print error:", error);
      toast.error("Error generating print preview. Please try again.");
    } finally {
      setIsPrinting(false);
    }
  };

  const resetScheduleView = () => {
    setShowScheduleTable(false);
    setScheduleData([]);
    setSessionData([]);
    setCurrentWeekRange(null);
    setSelectedDate("");
    setIsEditMode(false);
    clearScheduleData();
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 md:px-6 pt-10">
      {!showScheduleTable ? (
        <>
          {error ? (
            <p className="text-red-500">Error loading data: {error}</p>
          ) : (
            <GenericTable
              data={tableData}
              columns={tableColumns}
              actions={tableActions}
              loading={loading}
              emptyMessage="No records found."
              searchable={true}
            />
          )}

          <PeriodEndDateModal
            isOpen={isModalOpen}
            onClose={() => setModalOpen(false)}
            onSubmit={handleDateSubmit}
          />
        </>
      ) : (
        <div className="w-full">
          {/* Header with reset button */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Schedule View</h2>
            <button
              onClick={resetScheduleView}
              className="inline-flex items-center px-4 py-2 border border-gray-400 text-gray-600 hover:bg-gray-50 font-medium rounded-md transition-colors duration-200"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Back to Clients
            </button>
          </div>

          {/* Add New Guard Form */}
          <AddGuardForm
            scheduleData={scheduleData}
            setScheduleData={setScheduleData}
            currentWeekRange={currentWeekRange}
            isEditMode={isEditMode}
          />

          {scheduleLoading && (
            <div className="flex justify-center items-center p-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-600">Loading schedule data...</span>
            </div>
          )}

          {scheduleError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex">
                <div className="text-red-800">
                  <h3 className="text-sm font-medium">Error loading schedule data</h3>
                  <div className="mt-2 text-sm">
                    <p>{scheduleError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Show table only if we have data and not loading */}
          {!scheduleLoading && !scheduleError && scheduleData.length > 0 && (
            <>
              {/* Schedule Time Header */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Schedule Time</h3>
              </div>

              <ScheduleTable
                scheduleData={scheduleData}
                setScheduleData={setScheduleData}
                dateColumns={dateColumns}
                isEditMode={isEditMode}
                readOnly={false} // Add this line to enable drag and drop
                draggedShift={draggedShift}
                setDraggedShift={setDraggedShift}
                dragOverCell={dragOverCell}
                setDragOverCell={setDragOverCell}
                onEditShift={handleEditShift}
                onDeleteShift={handleDeleteShift}
                onDeleteUser={handleDeleteUser}
                onUserAutoToggle={handleUserAutoToggle}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />

              {/* Session Table - Using the same ScheduleTable component */}
              {sessionData.length > 0 && (
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Actual Time</h3>
                  </div>

                  {sessionLoading && (
                    <div className="flex justify-center items-center p-4">
                      <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="ml-2 text-gray-600">Loading session data...</span>
                    </div>
                  )}

                  {sessionError && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                      <div className="flex">
                        <div className="text-red-800">
                          <h3 className="text-sm font-medium">Error loading session data</h3>
                          <div className="mt-2 text-sm">
                            <p>{sessionError}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!sessionLoading && !sessionError && (
                    <ScheduleTable
                      scheduleData={sessionData}
                      setScheduleData={setSessionData}
                      dateColumns={dateColumns}
                      isEditMode={isEditMode} // Use same edit mode as schedule table
                      readOnly={false} // Add this line to enable drag and drop
                      draggedShift={draggedShift}
                      setDraggedShift={setDraggedShift}
                      dragOverCell={dragOverCell}
                      setDragOverCell={setDragOverCell}
                      onEditShift={handleSessionEditShift} // Session-specific edit functionality
                      onDeleteShift={handleSessionDeleteShift} // Session-specific delete functionality
                      onDeleteUser={handleSessionDeleteUser} // Session-specific delete user functionality
                      onUserAutoToggle={handleSessionUserAutoToggle} // Session-specific toggle functionality
                      onDragStart={handleSessionDragStart} // Session-specific drag functionality
                      onDragOver={handleSessionDragOver} // Session-specific drag over functionality
                      onDragLeave={handleSessionDragLeave} // Session-specific drag leave functionality
                      onDrop={handleSessionDrop} // Session-specific drop functionality
                      onDragEnd={handleSessionDragEnd} // Session-specific drag end functionality
                    />
                  )}
                </div>
              )}

              {/* Action buttons - Bottom Corner */}
              <div className="flex justify-between items-center gap-2 p-4 border-t bg-gray-50 rounded-b-2xl">
                {/* Publish and Cancel buttons - Left side */}
                <div className="flex items-center gap-2">
                  {/* Publish button - always visible */}
                  <button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="inline-flex items-center px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium shadow-sm"
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

                  {/* Cancel button - only visible in edit mode */}
                  {isEditMode && (
                    <button
                      onClick={toggleEditMode}
                      className="inline-flex items-center px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium shadow-sm"
                      title="Cancel Edit Mode"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {/* Print, Download and Edit buttons - Right side */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
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
                    onClick={handleDownloadExcel}
                    className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    title="Download Excel"
                  >
                    <Upload className="w-5 h-5" />
                  </button>

                  <button
                    onClick={toggleEditMode}
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
            </>
          )}

          {/* Show empty state if no data and not loading */}
          {!scheduleLoading && !scheduleError && scheduleData.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No schedule data found for the selected date.</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <Modals
        deleteModal={deleteModal}
        editModal={editModal}
        deleteUserModal={deleteUserModal}
        editForm={editForm}
        setEditForm={setEditForm}
        onCancelDeleteShift={cancelDeleteShift}
        onConfirmDeleteShift={confirmDeleteShift}
        onCancelEditShift={cancelEditShift}
        onConfirmEditShift={confirmEditShift}
        onCancelDeleteUser={cancelDeleteUser}
        onConfirmDeleteUser={confirmDeleteUser}
      />
    </div>
  );
};
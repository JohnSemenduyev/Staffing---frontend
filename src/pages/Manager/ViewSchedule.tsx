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
import { ActualTimeTable } from "./ViewSchedule/ActualTimeTable";
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

  // Separate edit modes for each table
  const [isScheduleEditMode, setIsScheduleEditMode] = useState(false);
  const [isActualTimeEditMode, setIsActualTimeEditMode] = useState(false);

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
    deleteModal, 
    setDeleteModal,
    editModal, 
    setEditModal,
    deleteUserModal, 
    setDeleteUserModal,
    editForm, 
    setEditForm,
    draggedShift, 
    setDraggedShift,
    setDragOverCell
  );

  // Wrapper handlers for schedule table that set the flag
  const handleDeleteShift = (userId: number, date: string, shiftId: number) => {
    originalHandleDeleteShift(userId, date, shiftId);
  };

  const handleEditShift = (userId: number, date: string, shift: any) => {
    originalHandleEditShift(userId, date, shift);
  };

  const handleDeleteUser = (userId: number) => {
    originalHandleDeleteUser(userId);
  };

  const confirmDeleteShift = () => {
    originalConfirmDeleteShift();
  };

  const confirmEditShift = () => {
    originalConfirmEditShift();
  };

  const confirmDeleteUser = () => {
    originalConfirmDeleteUser();
  };










  const validateSessionTimes = (sessionTimeUpdates: UpdateOneSessionTimesInput[]): { valid: UpdateOneSessionTimesInput[], invalid: Array<{ sessionId: number, clockIn: string, clockOut: string | null, reason: string }> } => {
    const valid: UpdateOneSessionTimesInput[] = [];
    const invalid: Array<{ sessionId: number, clockIn: string, clockOut: string | null, reason: string }> = [];
  
    sessionTimeUpdates.forEach(session => {
      const { sessionId, clockIn, clockOut } = session;
      
      // Convert times to minutes for easier comparison
      const parseTime = (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
  
      // Validate clockIn time
      const clockInMinutes = parseTime(clockIn);
      if (isNaN(clockInMinutes)) {
        invalid.push({
          sessionId,
          clockIn,
          clockOut,
          reason: "Invalid clock-in time format"
        });
        return;
      }
  
      // Handle null/undefined clockOut (ongoing shifts)
      if (!clockOut || clockOut === "N/A") {
        // This is a valid ongoing shift - only check-in time is required
        valid.push(session);
        return;
      }
  
      // Validate clockOut time
      const clockOutMinutes = parseTime(clockOut);
      if (isNaN(clockOutMinutes)) {
        invalid.push({
          sessionId,
          clockIn,
          clockOut,
          reason: "Invalid clock-out time format"
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
  const [isActualTimePublishing, setIsActualTimePublishing] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [sessionData, setSessionData] = useState<any[]>([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);


  // Add state to store original API data for comparison
  const [originalScheduleData, setOriginalScheduleData] = useState<any[]>([]);
  const [originalSessionData, setOriginalSessionData] = useState<any[]>([]);
  
  // Add state to track publish status
  const [isSchedulePublished, setIsSchedulePublished] = useState(false);
  const [isActualTimePublished, setIsActualTimePublished] = useState(false);
  const [publishedScheduleData, setPublishedScheduleData] = useState<any[]>([]);
  const [publishedSessionData, setPublishedSessionData] = useState<any[]>([]);

  // Function to detect changes in schedule data
  const detectScheduleChanges = (currentData: any[], originalData: any[]) => {
    const changes: any[] = [];
    
    currentData.forEach(currentItem => {
      const originalItem = originalData.find(item => 
        item.userId === currentItem.userId && 
        item.startDate === currentItem.startDate
      );
      
      if (!originalItem) {
        // New item - add to changes
        changes.push(currentItem);
        return;
      }
      
      // Check if shifts have changed
      const currentShifts = currentItem.shifts || [];
      const originalShifts = originalItem.shifts || [];
      
      if (currentShifts.length !== originalShifts.length) {
        // Number of shifts changed
        changes.push(currentItem);
        return;
      }
      
      // Check individual shifts for changes
      const shiftsChanged = currentShifts.some((currentShift: any, index: number) => {
        const originalShift = originalShifts[index];
        return (
          currentShift.startTime !== originalShift.startTime ||
          currentShift.endTime !== originalShift.endTime ||
          currentShift.hours !== originalShift.hours ||
          currentShift.date !== originalShift.date
        );
      });
      
      if (shiftsChanged) {
        changes.push(currentItem);
      }
    });
    
    return changes;
  };

  // Function to detect changes in session data
  const detectSessionChanges = (currentData: any[], originalData: any[]) => {
    const changes: UpdateOneSessionTimesInput[] = [];
    
    currentData.forEach(currentItem => {
      currentItem.shifts.forEach((currentShift: any) => {
        const originalItem = originalData.find(item => 
          item.userId === currentItem.userId && 
          item.startDate === currentItem.startDate
        );
        
        if (!originalItem) {
          // New session data
          if (currentShift.scheduleSessionId && 
              currentShift.startTime !== "N/A" && 
              currentShift.endTime !== "N/A") {
            changes.push({
              sessionId: currentShift.scheduleSessionId,
              clockIn: currentShift.startTime,
              clockOut: currentShift.endTime
            });
          }
          return;
        }
        
        const originalShift = originalItem.shifts.find((s: any) => s.id === currentShift.id);
        
        if (!originalShift) {
          // New shift
          if (currentShift.scheduleSessionId && 
              currentShift.startTime !== "N/A" && 
              currentShift.endTime !== "N/A") {
            changes.push({
              sessionId: currentShift.scheduleSessionId,
              clockIn: currentShift.startTime,
              clockOut: currentShift.endTime
            });
          }
        } else {
          // Check if shift times changed
          if (currentShift.startTime !== originalShift.startTime ||
              currentShift.endTime !== originalShift.endTime) {
            if (currentShift.scheduleSessionId && 
                currentShift.startTime !== "N/A" && 
                currentShift.endTime !== "N/A") {
              changes.push({
                sessionId: currentShift.scheduleSessionId,
                clockIn: currentShift.startTime,
                clockOut: currentShift.endTime
              });
            }
          }
        }
      });
    });
    
    return changes;
  };

  // Helper function to process schedule changes
  const processScheduleChanges = (changes: any[]) => {
    return changes.map(change => ({
      // ... format the changed data for API ...
    }));
  };

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
      setOriginalSessionData(transformedSessionData); // Store original session data
      setPublishedSessionData([]);
      setIsActualTimePublished(false);

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

    console.log("=== DATE DEBUGGING ===");
    console.log("Original date received:", date);
    console.log("Date type:", typeof date);
    console.log("Date length:", date.length);
    
    // Fix: Handle both YYYY-MM-DD and MM-DD-YYYY formats
    let formattedDate: string;
    let year: number, month: number, day: number;
    
    if (date.includes('-')) {
      const parts = date.split('-').map(Number);
      
      // Check if it's YYYY-MM-DD format (first part is 4 digits)
      if (parts[0] > 1000) {
        // YYYY-MM-DD format - convert to MM-DD-YYYY for API
        [year, month, day] = parts;
        formattedDate = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${year}`;
      } else {
        // MM-DD-YYYY format - already correct
        [month, day, year] = parts;
        formattedDate = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${year}`;
      }
    } else {
      // Fallback to original logic
      [month, day, year] = date.split('-').map(Number);
      formattedDate = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${year}`;
    }
    
    console.log("Formatted date for API:", formattedDate);
    console.log("=====================");

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

    // Fix: Properly parse MM-DD-YYYY format
    const selectedDateObj = new Date(year, month - 1, day, 0, 0, 0);
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
      setOriginalScheduleData(transformedData); // Store original data for comparison
    } else {
      console.log("No API schedule data or empty array:", apiScheduleData);
      setScheduleData([]);
      setOriginalScheduleData([]);
      setPublishedScheduleData([]);
      setIsSchedulePublished(false);
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
   const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  // Excel Download functionality
  const generateExcelFile = (dataToUse = scheduleData) => {
    const formattedData = [];
    const uniqueUsers = getUniqueUsers(dataToUse);

    uniqueUsers.forEach(user => {
      const userShiftTimes = getUniqueShiftTimes(user.id, dataToUse);

      const userMainRow = {
        "Employee Name": `${user.name}\n${user.phone || ""}`,
      };

      dateColumns.forEach(dateCol => {
        const userSchedulesForDate = dataToUse.filter(item =>
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

      userMainRow["Total"] = calculateUserTotal(user.id, dataToUse);
      userMainRow["Auto"] = dataToUse.find(item => item.userId === user.id)?.auto ? "ON" : "OFF";

      formattedData.push(userMainRow);

      const totalRow = {
        "Employee Name": "Total",
      };
      dateColumns.forEach(dateCol => {
        const daySchedules = dataToUse.filter(item =>
          item.userId === user.id && item.startDate === dateCol.date
        );
        const dayTotal = daySchedules.reduce((total, schedule) =>
          total + schedule.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0
        );
        totalRow[dateCol.display] = dayTotal > 0 ? parseFloat(dayTotal.toFixed(2)) : "-";
      });
      totalRow["Total"] = calculateUserTotal(user.id, dataToUse);
      totalRow["Auto"] = "";
      formattedData.push(totalRow);
    });

    const grandTotalRow = {
      "Employee Name": "Grand Total",
    };
    dateColumns.forEach(dateCol => {
      grandTotalRow[dateCol.display] = calculateDayTotal(dateCol.date, dataToUse) || "-";
    });
    grandTotalRow["Total"] = calculateGrandTotal(dataToUse);
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

      // Process ALL schedule data (not just changes)
      if (scheduleData.length > 0) {
        // First API call: Publish ALL schedule data
        // Fix: Handle both YYYY-MM-DD and MM-DD-YYYY formats
        let year: number, month: number, day: number;
        
        if (selectedDate.includes('-')) {
          const parts = selectedDate.split('-').map(Number);
          
          // Check if it's YYYY-MM-DD format (first part is 4 digits)
          if (parts[0] > 1000) {
            // YYYY-MM-DD format
            [year, month, day] = parts;
          } else {
            // MM-DD-YYYY format
            [month, day, year] = parts;
          }
        } else {
          // Fallback
          [month, day, year] = selectedDate.split('-').map(Number);
        }
        
        const selectedDateObj = new Date(year, month - 1, day, 0, 0, 0);
        const weekRange = getWeekRangeFromDate(selectedDateObj);
        const startDate = formatDateToYYYYMMDD(weekRange.startOfWeek);
        const endDate = formatDateToYYYYMMDD(weekRange.endOfWeek);
        
        const userScheduleMap = new Map();

        // Process ALL schedule data instead of just changes
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

          // Include ALL shifts for this user-date combination
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

        console.log("=== PUBLISHING ALL SCHEDULE DATA ===");
        console.log("Complete Schedule Input:", JSON.stringify(scheduleInput, null, 2));
        console.log("Total Users:", scheduleInput.length);
        
        // Uncomment the API call
        // await bulkUpsertScheduleSessions(scheduleInput);
        
        console.log("=== EXACT SCHEDULE API PAYLOAD THAT WOULD BE SENT ===");
        console.log("Mutation:", "BulkUpsertScheduleSession");
        console.log("Variables:", JSON.stringify({ input: scheduleInput }, null, 2));
        console.log("===================================================");
      }

      // Process ALL session data (not just changes)
      if (sessionData.length > 0) {
        console.log("=== UPDATING ALL SESSION TIMES ===");
        
        // Collect ALL session times from session data
        const allSessionTimes: UpdateOneSessionTimesInput[] = [];
        
        sessionData.forEach(sessionItem => {
          sessionItem.shifts.forEach((shift: any) => {
            if (shift.scheduleSessionId && 
                shift.startTime !== "N/A" && 
                shift.endTime !== "N/A") {
              allSessionTimes.push({
                sessionId: shift.scheduleSessionId,
                clockIn: shift.startTime,
                clockOut: shift.endTime
              });
            }
          });
        });
        
        console.log("All session time updates:", JSON.stringify(allSessionTimes, null, 2));
        
        // Validate session times before sending to API
        const validation = validateSessionTimes(allSessionTimes);
        
        if (validation.valid.length > 0) {
          console.log("Valid session time updates:", JSON.stringify(validation.valid, null, 2));
          
          // Uncomment the API call
          await updateManySessionTimes(validation.valid);
          
          console.log("=== EXACT SESSION TIMES API PAYLOAD THAT WOULD BE SENT ===");
          console.log("Mutation:", "UpdateManySessionTimes");
          console.log("Variables:", JSON.stringify({ items: validation.valid }, null, 2));
          console.log("=========================================================");
        }
      }

      toast.success("All data published successfully!");
      
      // Exit edit mode only on successful publish
      setIsEditMode(false);

    } catch (error) {
      console.error("Error publishing data:", error);
      toast.error("Failed to publish data. Please try again.");
      // Don't exit edit mode on error - stay in edit mode
    } finally {
      setIsPublishing(false);
    }
  };

  // Separate publish handlers for each table
  const handleSchedulePublish = async () => {
    if (!scheduleData || scheduleData.length === 0) {
      toast.error("No schedule data available to publish!");
      return;
    }

    try {
      setIsPublishing(true);
      
      // Reset published status when starting a new publish
      setIsSchedulePublished(false);

      // Process ALL schedule data (not just changes)
      if (scheduleData.length > 0) {
        // First API call: Publish ALL schedule data
        // Fix: Handle both YYYY-MM-DD and MM-DD-YYYY formats
        let year: number, month: number, day: number;
        
        if (selectedDate.includes('-')) {
          const parts = selectedDate.split('-').map(Number);
          
          // Check if it's YYYY-MM-DD format (first part is 4 digits)
          if (parts[0] > 1000) {
            // YYYY-MM-DD format
            [year, month, day] = parts;
          } else {
            // MM-DD-YYYY format
            [month, day, year] = parts;
          }
        } else {
          // Fallback
          [month, day, year] = selectedDate.split('-').map(Number);
        }
        
        const selectedDateObj = new Date(year, month - 1, day, 0, 0, 0);
        const weekRange = getWeekRangeFromDate(selectedDateObj);
        const startDate = formatDateToYYYYMMDD(weekRange.startOfWeek);
        const endDate = formatDateToYYYYMMDD(weekRange.endOfWeek);
        
        const userScheduleMap = new Map();

        // Process ALL schedule data instead of just changes
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

          // Include ALL shifts for this user-date combination
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
        console.log("Complete Schedule Input:", JSON.stringify(scheduleInput, null, 2));
        console.log("Total Users:", scheduleInput.length);
        
        // Uncomment the API call
        await bulkUpsertScheduleSessions(scheduleInput);
        
        console.log("=== EXACT SCHEDULE API PAYLOAD THAT WOULD BE SENT ===");
        console.log("Mutation:", "BulkUpsertScheduleSession");
        console.log("Variables:", JSON.stringify({ input: scheduleInput }, null, 2));
        console.log("===================================================");
        
        // Store the published data and mark as published
        setPublishedScheduleData([...scheduleData]);
        setIsSchedulePublished(true);
      }

      toast.success("Schedule data published successfully!");
      
      // Exit schedule edit mode only on successful publish
      setIsScheduleEditMode(false);

    } catch (error) {
      console.error("Error publishing schedule data:", error);
      toast.error("Failed to publish schedule data. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleActualTimePublish = async () => {
    if (!sessionData || sessionData.length === 0) {
      toast.error("No actual time data available to publish!");
      return;
    }

    try {
      setIsActualTimePublishing(true);
      
      // Reset published status when starting a new publish
      setIsActualTimePublished(false);
      
      console.log("=== DEBUGGING ACTUAL TIME PUBLISH ===");
      console.log("sessionData length:", sessionData.length);
      console.log("scheduleData length:", scheduleData.length);
      console.log("Sample scheduleData item:", scheduleData[0]);

      // Process ALL session data (not just changes)
      if (sessionData.length > 0) {
        console.log("=== UPDATING ALL SESSION TIMES ===");
        console.log("Raw sessionData:", JSON.stringify(sessionData, null, 2));
        
        // Collect ALL session times from session data
        const allSessionTimes: UpdateOneSessionTimesInput[] = [];
        
        sessionData.forEach(sessionItem => {
          console.log("Processing sessionItem:", sessionItem);
          sessionItem.shifts.forEach((shift: any) => {
            console.log("Processing shift:", shift);
            console.log("shift.scheduleSessionId:", shift.scheduleSessionId);
            console.log("shift.startTime:", shift.startTime);
            console.log("shift.endTime:", shift.endTime);
            
            if (shift.scheduleSessionId && 
                shift.startTime && 
                shift.startTime !== "N/A") {
              // For actual time, we can publish sessions with just check-in time
              // Check-out can be null/undefined/"N/A" for ongoing shifts
              const clockOut = (shift.endTime && shift.endTime !== "N/A") ? shift.endTime : null;
              
              allSessionTimes.push({
                sessionId: shift.scheduleSessionId,
                clockIn: shift.startTime,
                clockOut: clockOut
              });
              
              console.log("Including session:", {
                sessionId: shift.scheduleSessionId,
                clockIn: shift.startTime,
                clockOut: clockOut
              });
            } else {
              console.log("Skipping shift - missing scheduleSessionId or invalid start time");
              console.log("  scheduleSessionId:", shift.scheduleSessionId);
              console.log("  startTime:", shift.startTime);
              console.log("  endTime:", shift.endTime);
            }
          });
        });
        
        console.log("All session time updates:", JSON.stringify(allSessionTimes, null, 2));
        console.log("Total sessions processed:", sessionData.reduce((total, item) => total + item.shifts.length, 0));
        console.log("Valid sessions for publishing:", allSessionTimes.length);
        
        // Validate session times before sending to API
        const validation = validateSessionTimes(allSessionTimes);
        
        if (validation.valid.length > 0) {
          console.log("Valid session time updates:", JSON.stringify(validation.valid, null, 2));
          
          // Comment out the API call
          // await updateManySessionTimes(validation.valid);
          
          console.log("=== EXACT SESSION TIMES API PAYLOAD THAT WOULD BE SENT ===");
          console.log("Mutation:", "UpdateManySessionTimes");
          console.log("Variables:", JSON.stringify({ items: validation.valid }, null, 2));
          console.log("=========================================================");
          
          // Store the published data and mark as published
          setPublishedSessionData([...sessionData]);
          setIsActualTimePublished(true);
        } else {
          console.log("No valid sessions to publish - all sessions have incomplete data");
        }
      }

      toast.success("Actual time data published successfully!");
      
      // Exit actual time edit mode only on successful publish
      setIsActualTimeEditMode(false);

    } catch (error) {
      console.error("Error publishing actual time data:", error);
      toast.error("Failed to publish actual time data. Please try again.");
    } finally {
      setIsActualTimePublishing(false);
    }
  };

  const handleDownloadExcel = () => {
    // Use published data if available, otherwise use original data
    const dataToUse = isSchedulePublished ? publishedScheduleData : originalScheduleData;
    
    if (!dataToUse || dataToUse.length === 0) {
      toast.error("No data available to export!");
      return;
    }

    const blob = generateExcelFile(dataToUse);
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
    // Use published data if available, otherwise use original data
    const dataToUse = isSchedulePublished ? publishedScheduleData : originalScheduleData;
    
    if (!dataToUse || dataToUse.length === 0) {
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
    const uniqueUsers = getUniqueUsers(dataToUse);

    uniqueUsers.forEach(user => {
      const userShiftTimes = getUniqueShiftTimes(user.id, dataToUse);

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
            dataToUse
          );
          row += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; text-align: center; font-size: 10px;">
            ${shift ? `${shift.startTime} - ${shift.endTime}` : '-'}
          </td>`;
        });

        if (shiftIndex === 0) {
          row += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; font-size: 10px;" rowspan="${userShiftTimes.length}">
            ${calculateUserTotal(user.id, dataToUse)}
          </td>`;
        }

        if (shiftIndex === 0) {
          const autoValue = dataToUse.find(item => item.userId === user.id)?.auto ? "Yes" : "No";
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
        const daySchedules = dataToUse.filter(item =>
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

      totalRow += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; font-size: 10px;">${calculateUserTotal(user.id, dataToUse)}</td>`;
      totalRow += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; font-size: 10px;"></td>`;
      totalRow += '</tr>';
      dataRows += totalRow;
      rowIndex++;
    });

    let grandTotalRow = `<tr style="background-color: #d0d0d0; font-weight: bold;">`;
    grandTotalRow += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; font-weight: bold; font-size: 10px;">Grand Total</td>`;
    dateColumns.forEach(dateCol => {
      grandTotalRow += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; font-size: 10px;">
        ${calculateDayTotal(dateCol.date, dataToUse) || '-'}
      </td>`;
    });

    grandTotalRow += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; font-size: 10px;">${calculateGrandTotal(dataToUse)}</td>`;
    grandTotalRow += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; font-size: 10px;"></td>`;
    grandTotalRow += '</tr>';
    dataRows += grandTotalRow;

    const totalRecords = uniqueUsers.length;
    const totalHours = calculateGrandTotal(dataToUse);

    return `
      <div style="margin-bottom: 20px;">
        <p style="margin: 5px 0; font-size: 14px;"><strong>Client:</strong> ${dataToUse[0]?.clientName || 'N/A'}</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Address:</strong> ${dataToUse[0]?.address || 'N/A'}</p>
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
    // Use published data if available, otherwise use original data
    const dataToUse = isSchedulePublished ? publishedScheduleData : originalScheduleData;
    
    if (!dataToUse || dataToUse.length === 0) {
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
    const newEditMode = !isEditMode;
    console.log('Toggle edit mode:', { current: isEditMode, new: newEditMode });
    setIsEditMode(newEditMode);
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
            isEditMode={isScheduleEditMode}
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
                isEditMode={isScheduleEditMode}
                readOnly={false}
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

              {/* Schedule Table Controls - Directly below Schedule Table */}
              <div className="flex items-center gap-2 p-4 border-t bg-gray-50 rounded-b-2xl mt-2">
                
                {/* Schedule Publish button */}
                <button
                  onClick={handleSchedulePublish}
                  disabled={isPublishing}
                  className="inline-flex items-center px-3 py-2 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium shadow-sm text-sm"
                  title="Publish Schedule"
                >
                  {isPublishing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1" />
                      Publish
                    </>
                  )}
                </button>

                {/* Schedule Edit button */}
                <button
                  onClick={() => {
                    setIsScheduleEditMode(!isScheduleEditMode);
                    // Reset published status when entering edit mode
                    if (!isScheduleEditMode) {
                      setIsSchedulePublished(false);
                    }
                  }}
                  className={`inline-flex items-center px-3 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 text-sm ${isScheduleEditMode
                      ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 focus:ring-blue-500'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:ring-gray-500'
                    }`}
                  title={isScheduleEditMode ? "Exit Schedule Edit Mode" : "Enter Schedule Edit Mode"}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </button>

                {/* Schedule Cancel button - only visible in edit mode */}
                {isScheduleEditMode && (
                  <button
                    onClick={() => setIsScheduleEditMode(false)}
                    className="inline-flex items-center px-3 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium shadow-sm text-sm"
                    title="Cancel Schedule Edit Mode"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {/* Actual Time Table - Using the new ActualTimeTable component */}
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
                    <>
                      <ActualTimeTable
                        scheduleData={sessionData}
                        dateColumns={dateColumns}
                        isEditMode={isActualTimeEditMode}
                        scheduleDataForShifts={scheduleData}
                      />

                      {/* Actual Time Table Controls - Directly below Actual Time Table */}
                      <div className="flex items-center gap-2 p-4 border-t bg-gray-50 rounded-b-2xl mt-2">
                        <span className="text-sm font-medium text-gray-700 mr-2">Actual Time:</span>
                        
                        {/* Actual Time Publish button */}
                        <button
                          onClick={handleActualTimePublish}
                          disabled={isActualTimePublishing}
                          className="inline-flex items-center px-3 py-2 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium shadow-sm text-sm"
                          title="Publish Actual Time"
                        >
                          {isActualTimePublishing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                              <span>Publishing...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-1" />
                              Publish
                            </>
                          )}
                        </button>

                        {/* Actual Time Edit button */}
                        <button
                          onClick={() => {
                            setIsActualTimeEditMode(!isActualTimeEditMode);
                            // Reset published status when entering edit mode
                            if (!isActualTimeEditMode) {
                              setIsActualTimePublished(false);
                            }
                          }}
                          className={`inline-flex items-center px-3 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 text-sm ${isActualTimeEditMode
                              ? 'text-green-600 hover:text-green-800 hover:bg-green-50 focus:ring-green-500'
                              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:ring-gray-500'
                            }`}
                          title={isActualTimeEditMode ? "Exit Actual Time Edit Mode" : "Enter Actual Time Edit Mode"}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </button>

                        {/* Actual Time Cancel button - only visible in edit mode */}
                        {isActualTimeEditMode && (
                          <button
                            onClick={() => setIsActualTimeEditMode(false)}
                            className="inline-flex items-center px-3 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium shadow-sm text-sm"
                            title="Cancel Actual Time Edit Mode"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Print and Download buttons - Bottom */}
              <div className="flex justify-end items-center gap-2 p-4 border-t bg-gray-50 rounded-b-2xl mt-4">
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
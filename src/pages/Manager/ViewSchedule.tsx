import React, { useEffect, useRef, useState } from "react";
import { useClientSessions } from "../../context/ViewSchedule";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import { ScheduleTable } from "../../components/ScheduleTable";
import { ActualTimeTable } from "../../components/ActualTimeTable";
import { Eye, Plus, RotateCcw, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import ToggleSwitch from "../../components/ui/toggle";
import { useToast } from "../../hooks/use-toast";
import * as XLSX from "xlsx";

import { useSearchUsers } from "../../hooks/useSearchUser";
import { useDebounce } from "../../hooks/useDebounce";
import { CustomDatePicker } from "../../components/CustomDatePicker"; // use shared component
import { formatDateLocal, getWeekRangeFromDateLocal, toLocalYMD, parseLocalYMD, formatUSPhone } from "../../lib/utils";
import { graphQLClient } from "../../GraphqlClient";
import { UPDATE_MANY_SESSION_TIMES, UPDATE_SCHEDULE_SESSION_AUTO } from "../../graphql/mutation";
import { 
  generateSchedulePrintableTable, 
  generateActualTimePrintableTable, 
  handlePrint 
} from "../../utils/printUtils";
import { PeriodEndDateModal } from "./ViewSchedule/PeriodEndDateModal";


interface PeriodEndDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (date: string) => void;
  isLoading?: boolean;
}

interface FormData {
  userId: string;
  date: string;
  starttime: string;
  endtime: string;
}

interface User {
  id: string | number;
  name: string;
  phone?: string;
}

interface Shift {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  scheduleSessionId?: number; // Updated: Added scheduleSessionId property
  auto?: boolean;
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

const inputClasses = `
  w-full
  px-3
  py-1
  h-[32px]
  border
  border-[#d0d4d9]
  rounded-md
  placeholder:text-gray-500
  font-normal
  focus:outline-none
  focus:ring-2
  focus:ring-[#004175]
  transition
  appearance-none
`;



const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const doTimesOverlap = (start1, end1, start2, end2) => {
  const timeToMinutes = (t) => t.split(':').map(Number).reduce((a, b, i) => i === 0 ? a + b * 60 : a + b, 0);
  const toRanges = (s, e) => {
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

const sortShiftsByTime = (shifts) => {
  return [...shifts].sort((a, b) => {
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });
};

// Normalize a shift key for comparison (YYYY-MM-DD|start|end)
const makeShiftKey = (shift: { date: string; startTime: string; endTime: string }) => {
  const normalizedDate = formatDateLocal(new Date(shift.date));
  return `${normalizedDate}|${shift.startTime}|${shift.endTime}`;
};


// Utility function to convert date from YYYY-MM-DD to MM-DD-YYYY
const convertDateFormat = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${month}-${day}-${year}`;
};



// Form validation function
const validateForm = (formData: FormData, scheduleData: ScheduleItem[], editingShiftId?: number) => {
  const e: { [key: string]: string } = {};
  if (!formData.userId) e.userId = "Required";
  if (!formData.date) e.date = "Required";
  if (!formData.starttime) e.starttime = "Required";
  if (!formData.endtime) e.endtime = "Required";

  // Check for overlapping shifts
  if (formData.userId && formData.date && formData.starttime && formData.endtime) {
    const existingShifts = scheduleData
      .filter(item => item.userId === Number(formData.userId) && item.startDate === formData.date)
      .flatMap(item => item.shifts);

    for (const shift of existingShifts) {
      if (shift.id === editingShiftId) continue; // Skip current shift when editing

      if (doTimesOverlap(formData.starttime, formData.endtime, shift.startTime, shift.endTime)) {
        e.overlap = "Shift time overlaps with existing shift for this user and date";
        break;
      }
    }
  }

  return e;
};

const DateNavigation = ({
  selectedDate,
  onDateChange,
  currentWeekRange
}: {
  selectedDate: string;
  onDateChange: (date: string) => Promise<void>;
  currentWeekRange: any;
}) => {
  const formatDateForDisplay = (ymd: string) => {
    if (!ymd) return "";
    const [y,m,d] = ymd.split("-");
    return `${m}/${d}/${y}`;
  };

  const navigateWeek = async (direction: 'prev' | 'next') => {
    const base = parseLocalYMD(selectedDate);
    const delta = direction === 'next' ? 7 : -7;
    const next = new Date(base);
    next.setDate(base.getDate() + delta);
    const { startOfWeek } = getWeekRangeFromDateLocal(next);
    await onDateChange(toLocalYMD(startOfWeek));
  };

  return (
    <div className="flex items-center space-x-2 bg-white border border-blue-200 rounded-lg px-3 py-2 shadow-sm">
      <button
        type="button"
        onClick={() => navigateWeek('prev')}
        className="flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors duration-200"
        title="Previous Week"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="px-4 py-1 border border-blue-300 rounded-md bg-blue-50">
        <span className="text-blue-700 font-medium text-sm">
          {formatDateForDisplay(selectedDate)}
        </span>
      </div>

      <button
        type="button"
        onClick={() => navigateWeek('next')}
        className="flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors duration-200"
        title="Next Week"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export const ViewSchedule = () => {
  const { toast } = useToast();
  const {
    clientSessions,
    loading,
    error,
    fetchClientSessions,
    // Add these new properties from the updated context
    scheduleData: apiScheduleData,
    scheduleLoading,
    scheduleError,
    fetchScheduleData,
    clearScheduleData,
    bulkUpsertScheduleSessions, // Updated: Added bulkUpsertScheduleSessions
    // Session data from context
    sessionData: apiSessionData,
    sessionLoading: apiSessionLoading,
    sessionError: apiSessionError,
    fetchSessionData,
    clearSessionData,
    updateSessionTimes
  } = useClientSessions();

  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showScheduleTable, setShowScheduleTable] = useState(false);
  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  const [currentWeekRange, setCurrentWeekRange] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isActualTimePublishing, setIsActualTimePublishing] = useState(false);
  const [isScheduleEditMode, setIsScheduleEditMode] = useState(false);
  const [isActualTimeEditMode, setIsActualTimeEditMode] = useState(false);

  // Keep original shifts snapshot per user to detect changes on publish
  const originalShiftsRef = useRef<Map<number, Set<string>>>(new Map());

  // Session data state for actual time tracking (local state for UI)
  const [sessionData, setSessionData] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState(null);

  // Add local loading state for table navigation
  const [tableLoading, setTableLoading] = useState(false);

  // Add state to track previous date for navigation validation
  const [previousDate, setPreviousDate] = useState("");
  const [isNavigationAttempt, setIsNavigationAttempt] = useState(false);
  const [targetDate, setTargetDate] = useState("");

  // Form states for adding new guards
  const [form, setForm] = useState<FormData>({
    userId: "",
    date: "",
    starttime: "",
    endtime: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [userSearch, setUserSearch] = useState("");
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const { data: searchedUsers = [], isLoading: loadingUsers } = useSearchUsers(debouncedUserSearch);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [submitLoader, setSubmitLoader] = useState(false);
  const [auto, setAuto] = useState(false);
  const [applyAllWeek, setApplyAllWeek] = useState(false);

  // Add a state to track if we have data from API
  const [hasApiData, setHasApiData] = useState(false);

  // Track where navigation originated: 'week' | 'modal'
  const [navigationSource, setNavigationSource] = useState<"week" | "modal" | null>(null);
  // Bump key to remount tables and reset any internal component state
  const [viewKey, setViewKey] = useState(0);

  const resetUIForWeekNavigation = () => {
    // Close modals
    setModalOpen(false);
    // Exit edit modes
    setIsScheduleEditMode(false);
    setIsActualTimeEditMode(false);
    // Reset form-related state
    setForm({ userId: "", date: "", starttime: "", endtime: "" });
    setErrors({});
    setUserSearch("");
    setShowUserDropdown(false);
    setSubmitLoader(false);
    setAuto(false);
    setApplyAllWeek(false);
    // Reset actions state
    setIsPrinting(false);
    setIsPublishing(false);
    setIsActualTimePublishing(false);
    // Force remount tables
    setViewKey((k) => k + 1);
  };


  const handleView = (rowData: any) => {
    // Reset any stale schedule state to avoid spurious toasts
    clearScheduleData();
    setHasApiData(false);
    setIsNavigationAttempt(false);
    setTargetDate("");
  
    const clientData = {
      clientId: rowData.clientId,
      addressId: rowData.addressId,
      name: rowData.clientName,
      lastName: rowData.clientLastName,
      address: rowData.address,
      city: rowData.city,
      pincode: rowData.pincode,
      addresses: rowData.client?.addresses || []
    };
  
    setSelectedClient(clientData);
    setModalOpen(true);
  };

  const validateAndNavigate = async (newDate: string) => {
    console.log("validateAndNavigate called with:", newDate);
    setNavigationSource("week");

    const clientId = selectedClient?.clientId;
    const addressId = selectedClient?.addressId;

    if (!clientId || !addressId) {
      toast({
        title: "Error",
        description: "Missing client or address information!",
        variant: "destructive",
      });
      return;
    }

    // Normalize to start of week
    const week = getWeekRangeFromDateLocal(parseLocalYMD(newDate));
    const weekStartStr = toLocalYMD(week.startOfWeek);

    // Store the current date as previous date before attempting navigation
    setPreviousDate(selectedDate);
    setTargetDate(weekStartStr); // Store the target date (week start)
    setIsNavigationAttempt(true);

    // Reset UI for week navigation attempt
    resetUIForWeekNavigation();

    setTableLoading(true); // Set local loading state

    // Convert date format for backend
    const formattedDate = convertDateFormat(weekStartStr);

    // Update week range using week start - FIX: Add this missing update
    const weekRange = getWeekRangeFromDateLocal(parseLocalYMD(weekStartStr));
    setCurrentWeekRange(weekRange);

    // Clear any existing schedule data
    clearScheduleData();

    try {
      await fetchScheduleData(clientId, addressId, formattedDate);
    } catch (error) {
      console.error("Error fetching schedule data:", error);
      toast({
        title: "Error",
        description: "Failed to load schedule data!",
        variant: "destructive",
      });
    } finally {
      setTableLoading(false);
    }
  };

  const handleDateSubmit = async (date: string) => {
    setNavigationSource("modal");
    // Normalize to start of week
    const week = getWeekRangeFromDateLocal(parseLocalYMD(date));
    const weekStartStr = toLocalYMD(week.startOfWeek);

    // Store the current date as previous date before attempting navigation
    setPreviousDate(selectedDate);
    setTargetDate(weekStartStr); // week start
    setIsNavigationAttempt(true);

    setTableLoading(true);

    const clientId = selectedClient?.clientId;
    const addressId = selectedClient?.addressId;

    const formattedDate = convertDateFormat(weekStartStr);

    if (!clientId || !addressId) {
      toast({
        title: "Error",
        description: "Missing client or address information!",
        variant: "destructive",
      });
      setTableLoading(false);
      setIsNavigationAttempt(false);
      setTargetDate("");
      return;
    }

    // Update week range using week start
    const weekRange = getWeekRangeFromDateLocal(parseLocalYMD(weekStartStr));
    setCurrentWeekRange(weekRange);

    clearScheduleData();

    try {
      await fetchScheduleData(clientId, addressId, formattedDate);
      // Close the modal only after successful API call
      setModalOpen(false);
    } catch (error) {
      console.error("Error fetching schedule data:", error);
      toast({
        title: "Error",
        description: "Failed to load schedule data!",
        variant: "destructive",
      });
      // Don't close the modal on error - let user try again
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchClientSessions(); // Fetch only when needed
  }, []);

  const [tableData, setTableData] = useState([]);

  useEffect(() => {
    console.log(tableData);
  }, [tableData])

  useEffect(() => {
    if (clientSessions && Array.isArray(clientSessions)) {
      const flatData = clientSessions.map(session => ({
        clientName: [session.client.name, session.client.lastName].filter(Boolean).join(' '),
        clientLastName: session.client.lastName,
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

  // Transform API data when it arrives - FIXED VERSION
  useEffect(() => {
    console.log("useEffect triggered with:", {
      apiScheduleData: apiScheduleData?.length,
      isNavigationAttempt,
      targetDate,
      selectedDate,
      hasApiData
    });

    if (apiScheduleData && Array.isArray(apiScheduleData)) {
      console.log("API Schedule Data received:", apiScheduleData.length, "items");
      
      // Check if we have any data
      if (apiScheduleData.length === 0) {
        const clientName = [selectedClient?.name, selectedClient?.lastName].filter(Boolean).join(' ') || "this client";        const formattedDate = targetDate ? new Date(targetDate).toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        }) : "";
        toast({
          title: "No Schedule Found",
          description: `No schedule found for ${clientName} for week ${formattedDate}. Please prepare a schedule first.`,
          variant: "destructive",
        });
        
                // Only show the "No Schedule" toast when a navigation attempt triggered this state
                if (isNavigationAttempt) {
                  toast({
                    title: "No Schedule Found",
                    description: `No schedule found for ${clientName} for week ${formattedDate}. Please prepare a schedule first.`,
                    variant: "destructive",
                  });
                }
        
                setHasApiData(false);
        
                if (isNavigationAttempt && targetDate) {
                  if (navigationSource === "week") {
                    // Allow navigation to empty view
                    setSelectedDate(targetDate);
                    if (!showScheduleTable) setShowScheduleTable(true);
                  }
                  // If source is modal: do NOT change selectedDate or view; keep modal open
                }
        
        setIsNavigationAttempt(false);
        setTargetDate("");
        return;
      }

      // We have data
      setHasApiData(true);
      if (isNavigationAttempt && targetDate) {
        setSelectedDate(targetDate);
        if (!showScheduleTable) setShowScheduleTable(true);
        if (navigationSource === "modal") {
          setModalOpen(false); // close only when data exists
        }
        // Reset UI when week change is applied
        if (navigationSource === "week") {
          resetUIForWeekNavigation();
        }
      }
      setIsNavigationAttempt(false);
      setTargetDate("");

      // Transform the API data
      const keyedByUserDate = new Map();

      apiScheduleData.forEach((group: any) => {
        const userId = group.user?.id;
        group.shifts?.forEach(shift => {
          if (!shift?.date || userId == null) return;

          const date = formatDateLocal(new Date(shift.date));
          const key = `${userId}-${date}`;

          let item = keyedByUserDate.get(key);
          if (!item) {
            item = {
              id: keyedByUserDate.size + 1,
              clientId: group.clientId,
              addressId: group.addressId,
              userId,
              startDate: date,
              auto: group.auto ?? false,
              shifts: [],
              clientName: [selectedClient?.name, selectedClient?.lastName].filter(Boolean).join(' ') || "Unknown Client",              address: selectedClient?.address || "Unknown Address",
              userName: group.user?.name ?? "",
              userPhone: group.user?.phone ?? ""
            };
            keyedByUserDate.set(key, item);
          }

          item.shifts.push({
            id: shift.id,
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
            hours: shift.hours,
            scheduleSessionId: shift.scheduleSessionId,
            auto: (shift as any)?.auto ?? false
          });
        });
      });

      const transformedData = Array.from(keyedByUserDate.values());
      setScheduleData(transformedData);

      // Capture original snapshot of shifts per user to detect changes on publish
      const baseMap = new Map<number, Set<string>>();
      transformedData.forEach(item => {
        const set = baseMap.get(item.userId) || new Set<string>();
        item.shifts.forEach(s => set.add(makeShiftKey(s)));
        baseMap.set(item.userId, set);
      });
      originalShiftsRef.current = baseMap;

      // Fetch session data for the schedule sessions
      if (transformedData.length > 0) {
        const scheduleSessionIds = transformedData.map(item => item.shifts[0]?.scheduleSessionId).filter(Boolean);
        fetchSessionData(scheduleSessionIds);
      }

    } else if (apiScheduleData === null) {
      setHasApiData(false);
    }
  }, [apiScheduleData, selectedClient, selectedDate, isNavigationAttempt, previousDate, targetDate, showScheduleTable, navigationSource]);
  // Update local session data when API session data changes
  useEffect(() => {
    if (apiSessionData) {
      setSessionData(apiSessionData);
    } else {
      setSessionData([]);
    }
  }, [apiSessionData]);

  // Update loading states from context
  useEffect(() => {
    setSessionLoading(apiSessionLoading);
  }, [apiSessionLoading]);

  useEffect(() => {
    setSessionError(apiSessionError);
  }, [apiSessionError]);

  // Debug loading states
  useEffect(() => {
    console.log('Loading states:', { scheduleLoading, tableLoading, sessionLoading });
  }, [scheduleLoading, tableLoading, sessionLoading]);

  // ... existing code ...

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



  // Form handler functions
  const handleFormChange = (field: keyof FormData, value: string) => {
    setForm((f) => ({
      ...f,
      [field]: value,
    }));

    // Clear field-specific error and overlap error for fields that affect overlap validation
    if (field === 'starttime' || field === 'endtime' || field === 'userId' || field === 'date') {
      setErrors((e) => ({ ...e, [field]: undefined, overlap: undefined }));
    } else {
      setErrors((e) => ({ ...e, [field]: undefined }));
    }

    // Check week range when date changes
    if (field === 'date' && value && currentWeekRange) {
      const selectedDate = parseLocalYMD(value);
      const weekRange = getWeekRangeFromDateLocal(selectedDate);

      // Use local timezone formatting
      const existingWeekStart = toLocalYMD(currentWeekRange.startOfWeek);
      const newWeekStart = toLocalYMD(weekRange.startOfWeek);

      if (existingWeekStart !== newWeekStart) {
        toast({
          title: "Invalid Date Selection",
          description: "Please select a date from the same week (Thursday to Wednesday) as the existing schedule!",
          variant: "destructive",
        });
        setForm(f => ({ ...f, date: "" }));
        return;
      }
    }
  };

  const handleUserSelect = (user: User) => {
    setForm((f) => ({ ...f, userId: String(user.id) }));
    setUserSearch(user.name);
    setShowUserDropdown(false);
    setErrors((e) => ({ ...e, userId: undefined, overlap: undefined }));
  };

  const resetAddGuardForm = () => {
    setForm({
      userId: "",
      date: "",
      starttime: "",
      endtime: ""
    });
    setUserSearch("");
    setAuto(false);
    setErrors({});
    setApplyAllWeek(false);

    toast({
      title: "Form Reset",
      description: "Add guard form has been reset successfully.",
    });
  };

  const calculateHours = (start, end) => {
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    let hours = endH - startH + (endM - startM) / 60;
    if (hours < 0) hours += 24;
    return parseFloat(hours.toFixed(2));
  };

  const onSubmitAddGuard = async (e) => {
    e.preventDefault();
    const formErrors = validateForm(form, scheduleData);
    setErrors(formErrors);

    if (Object.keys(formErrors).length > 0) return;

    setSubmitLoader(true);

    try {
      // Get user details from the hook data
      const selectedUser = searchedUsers.find(u => String(u.id) === form.userId);

      if (!selectedUser) {
        toast({
          title: "Error",
          description: "Selected user not found.",
          variant: "destructive",
        });
        return;
      }

      // Create a copy of current schedule data to work with
      const updatedScheduleData = [...scheduleData];
      const newShift = {
        id: Date.now(),
        startTime: form.starttime,
        endTime: form.endtime,
        hours: calculateHours(form.starttime, form.endtime),
        auto: false,
      };

      if (applyAllWeek && currentWeekRange) {
        // Add for each day in the week (Thu-Wed)
        const startDate = new Date(currentWeekRange.startOfWeek);

        for (let i = 0; i < 7; i++) {
          const dateObj = new Date(startDate);
          dateObj.setDate(startDate.getDate() + i);
          // Use local timezone formatting
          const dateStr = toLocalYMD(dateObj);

          // Check if user already has a schedule for this date
          const existingScheduleIndex = updatedScheduleData.findIndex(
            item => item.userId === Number(form.userId) && item.startDate === dateStr
          );

          if (existingScheduleIndex !== -1) {
            // Add new shift to existing schedule
            const newShifts = [
              ...updatedScheduleData[existingScheduleIndex].shifts,
              {
                ...newShift,
                id: Date.now() + i, // Ensure unique ID
                date: dateStr,
              }
            ];

            // Sort shifts by time when adding
            updatedScheduleData[existingScheduleIndex] = {
              ...updatedScheduleData[existingScheduleIndex],
              shifts: sortShiftsByTime(newShifts)
            };
          } else {
            // Create new schedule for this day
            updatedScheduleData.push({
              id: Date.now() + i,
              clientId: selectedClient?.clientId || 0,
              addressId: selectedClient?.addressId || 0,
              userId: Number(form.userId),
              startDate: dateStr,
              auto,
              shifts: [
                {
                  ...newShift,
                  id: Date.now() + i,
                  date: dateStr,
                },
              ],
              clientName: [selectedClient?.name, selectedClient?.lastName].filter(Boolean).join(' ') || "Unknown Client",              address: selectedClient?.address || "Unknown Address",
              userName: selectedUser.name,
              userPhone: selectedUser.phone || '',
            });
          }
        }
      } else {
        // Single day entry
        const existingScheduleIndex = updatedScheduleData.findIndex(
          item => item.userId === Number(form.userId) && item.startDate === form.date
        );

        if (existingScheduleIndex !== -1) {
          // Add new shift to existing schedule
          const newShifts = [
            ...updatedScheduleData[existingScheduleIndex].shifts,
            {
              ...newShift,
              date: form.date,
            }
          ];

          // Sort shifts by time when adding
          updatedScheduleData[existingScheduleIndex] = {
            ...updatedScheduleData[existingScheduleIndex],
            shifts: sortShiftsByTime(newShifts)
          };
        } else {
          // Create new schedule
          updatedScheduleData.push({
            id: Date.now(),
            clientId: selectedClient?.clientId || 0,
            addressId: selectedClient?.addressId || 0,
            userId: Number(form.userId),
            startDate: form.date,
            auto,
            shifts: [
              {
                ...newShift,
                date: form.date,
              },
            ],
            clientName: [selectedClient?.name, selectedClient?.lastName].filter(Boolean).join(' ') || "Unknown Client",            address: selectedClient?.address || "Unknown Address",
            userName: selectedUser.name,
            userPhone: selectedUser.phone || '',
          });
        }
      }

      // Update schedule data and re-render table
      setScheduleData(updatedScheduleData);

      resetAddGuardForm();

      toast({
        title: "Success",
        description: "New guard shift added successfully!",
      });
    } catch (err) {
      console.error("Error adding guard shift:", err);
      toast({
        title: "Error",
        description: "Failed to add guard shift.",
        variant: "destructive",
      });
    } finally {
      setSubmitLoader(false);
    }
  };






  // Updated Publish functionality
  const handlePublish = async () => {
    if (!scheduleData || scheduleData.length === 0) {
      toast({
        title: "Error",
        description: "No data available to publish!",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsPublishing(true);

      // Calculate week start and end dates from the selected date
      const selectedDateObj = new Date(selectedDate);
      const weekRange = getWeekRangeFromDateLocal(selectedDateObj);
      // Use local timezone formatting
      const startDate = toLocalYMD(weekRange.startOfWeek);
      const endDate = toLocalYMD(weekRange.endOfWeek);

      // Group schedule data by user to create the required format
      const userScheduleMap = new Map();

      // Process each schedule item
      scheduleData.forEach(item => {
        const userId = item.userId;

        // Get scheduleSessionId from the first shift (all shifts for a user should have the same scheduleSessionId)
        const scheduleSessionId = item.shifts.length > 0 && item.shifts[0].scheduleSessionId
          ? item.shifts[0].scheduleSessionId
          : null;

        if (!userScheduleMap.has(userId)) {
          userScheduleMap.set(userId, {
            scheduleSessionId: scheduleSessionId, // Take from shift data
            clientId: item.clientId,
            addressId: item.addressId,
            userId: userId,
            startDate: convertDateFormat(startDate),
            endDate: convertDateFormat(endDate),
            auto: item.auto,
            weeklyHours: 0, // Will calculate below
            shifts: []
          });
        } else {
          // If user already exists, keep the first scheduleSessionId we found
          // but update auto setting if it's different (take the latest one)
          const existingSchedule = userScheduleMap.get(userId);
          existingSchedule.auto = item.auto; // Update with latest auto setting

          // If we don't have a scheduleSessionId yet, try to get it from this item
          if (!existingSchedule.scheduleSessionId && scheduleSessionId) {
            existingSchedule.scheduleSessionId = scheduleSessionId;
          }
        }

        const userSchedule = userScheduleMap.get(userId);

        // Add shifts for this user
        item.shifts.forEach(shift => {
          const isClientGeneratedId = shift.id > 1000000000000;
          userSchedule.shifts.push({
            date: convertDateFormat(shift.date),
            startTime: shift.startTime,
            endTime: shift.endTime,
            hours: shift.hours,
            shiftId: isClientGeneratedId ? null : shift.id,
            auto: (shift as any)?.auto ?? null
          });
        });
      });

      // Calculate weekly hours for each user and prepare final array
      const scheduleInput = Array.from(userScheduleMap.values()).map(userSchedule => {
        // Calculate total weekly hours
        const weeklyHours = userSchedule.shifts.reduce((total, shift) => total + shift.hours, 0);

        // Determine if this user's schedule changed compared to the original snapshot
        const originalSet = originalShiftsRef.current.get(userSchedule.userId) || new Set<string>();
        const currentSet = new Set<string>();
        scheduleData
          .filter(i => i.userId === userSchedule.userId)
          .forEach(i => i.shifts.forEach(s => currentSet.add(makeShiftKey(s))));
        let changed = false;
        if (originalSet.size !== currentSet.size) {
          changed = true;
        } else {
          for (const k of currentSet) {
            if (!originalSet.has(k)) { changed = true; break; }
          }
        }

        return {
          ...userSchedule,
          weeklyHours: parseFloat(weeklyHours.toFixed(2)),
          change: changed
        };
      });

      console.log("=== PUBLISHING SCHEDULE DATA ===");
      console.log("Schedule Input:", JSON.stringify(scheduleInput, null, 2));
      console.log("Total Users:", scheduleInput.length);
      console.log("Week Range:", { startDate, endDate });
      console.log("=====================================");
      console.log(scheduleInput);

      // Call the context function
      await bulkUpsertScheduleSessions(scheduleInput);
      console.log("scheduleInput", JSON.stringify(scheduleInput, null, 2));

      toast({
          title: "Success",
          description: "Schedule published successfully!",
        });

      // Switch to view mode after successful publish
      setIsScheduleEditMode(false);

    } catch (error) {
      console.error("Error publishing schedule:", error);
      toast({
          title: "Error",
          description: "Failed to publish schedule. Please try again.",
          variant: "destructive",
        });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUserAutoToggle = async (userId: number, enabled: boolean) => {
    try {
      // Find the schedule session for this user
      const userSchedule = scheduleData.find(item => item.userId === userId);
      if (!userSchedule) {
        toast({
          title: "Error",
          description: "Schedule session not found for this user",
          variant: "destructive",
        });
        return;
      }

      const token = localStorage.getItem("token");
      await graphQLClient.request(
        UPDATE_SCHEDULE_SESSION_AUTO,
        { id: userSchedule.id, auto: enabled },
        { Authorization: `Bearer ${token}` }
      );

      // Update local state
      setScheduleData(prev => prev.map(item =>
        item.userId === userId ? { ...item, auto: enabled } : item
      ));

      toast({
          title: "Success",
          description: `Auto setting ${enabled ? 'enabled' : 'disabled'} for user`,
        });
    } catch (error) {
      console.error("Error updating auto setting:", error);
      toast({
          title: "Error",
          description: "Failed to update auto setting",
          variant: "destructive",
        });
    }
  };

  const handleShiftAutoToggle = (userId: number, date: string, shiftId: number, enabled: boolean) => {
    setScheduleData(prev => prev.map(item => {
      if (item.userId === userId && item.startDate === date) {
        return {
          ...item,
          shifts: item.shifts.map(s => s.id === shiftId ? { ...s, auto: enabled } : s)
        };
      }
      return item;
    }));
  };

  const resetScheduleView = () => {
    setShowScheduleTable(false);
    setSelectedClient(null);
    setModalOpen(false);
    setScheduleData([]);
    setSessionData([]);
    setCurrentWeekRange(null);
    setSelectedDate("");
    setIsScheduleEditMode(false);
    setIsActualTimeEditMode(false);
    setTableLoading(false); // Reset local loading state
  };

  const toggleScheduleEditMode = () => {
    setIsScheduleEditMode(!isScheduleEditMode);
  };

  const toggleActualTimeEditMode = () => {
    setIsActualTimeEditMode(!isActualTimeEditMode);
  };

  // Handle actual time publish
  const handleActualTimePublish = async () => {
    if (!sessionData || sessionData.length === 0) {
      toast({
          title: "Error",
          description: "No actual time data available to publish!",
          variant: "destructive",
        });
      return;
    }

    try {
      setIsActualTimePublishing(true);

      const items = sessionData
        .filter(s => s.clockIn) // require clockIn; allow no clockOut
        .map(s => {
          const isNew = s.id > 1700000000000; // Check if it's a temporary ID
          return {
            sessionId: isNew ? null : s.id, // Send null for new sessions, actual ID for existing ones
            shiftId: s.shiftId,
            scheduleSessionId: s.scheduleSessionId,
            clockIn: s.clockIn!,
            clockOut: s.clockOut ?? null, // always include, null when not entered
          };
        });

      if (items.length === 0) {
        toast({
          title: "Error",
          description: "No sessions to publish.",
          variant: "destructive",
        });
        setIsActualTimePublishing(false);
        return;
      }

      // Log payload before API call
      console.log("=== PUBLISHING ACTUAL TIME ITEMS ===");
      console.log(JSON.stringify(items, null, 2));

      await updateSessionTimes(items);

      toast({
          title: "Success",
          description: "Actual time data published successfully!",
        });

      // Switch to view mode after successful publish
      setIsActualTimeEditMode(false);

    } catch (error) {
      console.error("Error publishing actual time data:", error);
      toast({
          title: "Error",
          description: "Failed to publish actual time data. Please try again.",
          variant: "destructive",
        });
    } finally {
      setIsActualTimePublishing(false);
    }
  };

  // Create immutable copy of schedule data for actual time table
  const createImmutableScheduleCopy = (scheduleData: ScheduleItem[]) => {
    return scheduleData.map(item => ({
      ...item,
      shifts: item.shifts.map(shift => ({ ...shift })),
      // Add any additional properties needed for actual time tracking
    }));
  };

  // Fetch session data for actual time tracking
  const fetchSessionDataForSchedule = async (scheduleData: ScheduleItem[]) => {
    if (!scheduleData || scheduleData.length === 0) {
      setSessionData([]);
      return;
    }

    try {
      setSessionLoading(true);
      setSessionError(null);

      // Extract unique schedule session IDs from the schedule data
      const scheduleSessionIds = scheduleData
        .flatMap(item => item.shifts)
        .map(shift => shift.scheduleSessionId)
        .filter((id, index, array) => id && array.indexOf(id) === index); // Remove duplicates

      if (scheduleSessionIds.length === 0) {
        setSessionData([]);
        return;
      }

      // Use the context function to fetch session data
      await fetchSessionData(scheduleSessionIds);

    } catch (error) {
      console.error("Error fetching session data:", error);
      setSessionError("Failed to load session data");
    } finally {
      setSessionLoading(false);
    }
  };

  // Add a new function to handle date navigation
  const handleDateNavigation = async (newDate: string) => {
    // This function is now deprecated, use validateAndNavigate instead
    await validateAndNavigate(newDate);
  };

  // Export functionality for Schedule Table
  const generateScheduleExcelData = () => {
    const excelData = [];

    // Add header row - match UI table headers exactly (no phone column)
    const headerRow = ['Employee Name'];
    if (currentWeekRange) {
      const startDate = new Date(currentWeekRange.startOfWeek);
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        // Format date as MM-DD-YYYY for headers
        const formattedDate = date.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        });
        headerRow.push(formattedDate);
      }
    }
    headerRow.push('Total');
    excelData.push(headerRow);

    // Get unique users and sort by name to match UI
    const uniqueUsers = new Map();
    scheduleData.forEach(item => {
      if (!uniqueUsers.has(item.userId)) {
        uniqueUsers.set(item.userId, {
          id: item.userId,
          name: item.userName,
          phone: item.userPhone
        });
      }
    });

    // Sort users by name to match UI table order
    const sortedUsers = Array.from(uniqueUsers.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Add data rows - fill first row completely before moving to next row
    sortedUsers.forEach(user => {
      // Get all shifts for this user across the week
      const userShifts = [];
      if (currentWeekRange) {
        const startDate = new Date(currentWeekRange.startOfWeek);
        for (let i = 0; i < 7; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          const dateStr = toLocalYMD(date);
          
          const daySchedules = scheduleData.filter(
            item => item.userId === user.id && item.startDate === dateStr
          );
          const shifts = daySchedules.flatMap(s => s.shifts);
          
          shifts.forEach(shift => {
            userShifts.push({
              ...shift,
              dayIndex: i,
              dateStr: dateStr
            });
          });
        }
      }
      
      // Sort shifts by day and time
      userShifts.sort((a, b) => {
        if (a.dayIndex !== b.dayIndex) {
          return a.dayIndex - b.dayIndex;
        }
        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      });
      
      // Group shifts by day
      const shiftsByDay = new Map();
      userShifts.forEach(shift => {
        if (!shiftsByDay.has(shift.dayIndex)) {
          shiftsByDay.set(shift.dayIndex, []);
        }
        shiftsByDay.get(shift.dayIndex).push(shift);
      });
      
      // Find max shifts per day for this user
      const maxShiftsPerDay = Math.max(...Array.from(shiftsByDay.values()).map(shifts => shifts.length), 1);
      
      // Create rows - fill first row completely, then next row, etc.
      for (let shiftIndex = 0; shiftIndex < maxShiftsPerDay; shiftIndex++) {
        const row = [
          shiftIndex === 0 ? user.name : '', // Only show name on first row
        ];
        
        // Fill all days in this row
        if (currentWeekRange) {
          const startDate = new Date(currentWeekRange.startOfWeek);
          for (let i = 0; i < 7; i++) {
            const dayShifts = shiftsByDay.get(i) || [];
            const shift = dayShifts[shiftIndex];
            
            if (shift) {
              row.push(`${shift.startTime} - ${shift.endTime}`);
            } else {
              row.push('');
            }
          }
        }
        
        // Add per-row total count only on first row
        if (shiftIndex === 0) {
          const userTotalCount = scheduleData
            .filter(item => item.userId === user.id)
            .reduce((total, item) => total + item.shifts.length, 0);
          row.push(String(userTotalCount));
        } else {
          row.push('');
        }
        
        excelData.push(row);
      }

      // Add per-guard totals row
      const userTotalsRow = [`${user.name} Total`];
      let userGrandTotal = 0;
      if (currentWeekRange) {
        const startDate = new Date(currentWeekRange.startOfWeek);
        for (let i = 0; i < 7; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          const dateStr = toLocalYMD(date);

          const dayTotal = scheduleData
            .filter(item => item.userId === user.id && item.startDate === dateStr)
            .reduce((total, item) => total + item.shifts.length, 0);

          userTotalsRow.push(String(dayTotal));
          userGrandTotal += dayTotal;
        }
      }
      userTotalsRow.push(String(userGrandTotal));
      excelData.push(userTotalsRow);
    });

    // Add totals row
    const totalsRow = ['GRAND TOTAL'];
    let grandTotal = 0;
    
    if (currentWeekRange) {
      const startDate = new Date(currentWeekRange.startOfWeek);
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = toLocalYMD(date);
        
        // Calculate total hours for this day across all users
        const dayTotal = scheduleData
          .filter(item => item.startDate === dateStr)
          .reduce((total, item) => total + item.shifts.length, 0);
        
        totalsRow.push(String(dayTotal));
        grandTotal += dayTotal;
      }
    }
    
    totalsRow.push(String(grandTotal));
    excelData.push(totalsRow);

    return excelData;
  };

  const handleSchedulePrint = async () => {
    try {
      setIsPrinting(true);
      
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const tableContent = generateSchedulePrintableTable(scheduleData, currentWeekRange);
      
      // Compute meta details for header
      const totalEmployees = new Set(scheduleData.map(i => i.userId)).size;
      const totalHours = scheduleData.reduce((sum, item) =>
        sum + item.shifts.reduce((s, sh) => s + (sh.hours || 0), 0), 0
      );
      
      await handlePrint(
        tableContent,
        {
          title: "Schedule Report",
          selectedClient,
          currentWeekRange,
          totalEmployees,
          totalHours
        },
        (error) => toast({
          title: "Error",
          description: error,
          variant: "destructive",
        }),
        () => toast({
          title: "Success",
          description: "Schedule report printed successfully!",
        })
      );
      
    } catch (error) {
      console.error("Error printing schedule:", error);
      toast({
          title: "Error",
          description: "Failed to print schedule report",
          variant: "destructive",
        });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleScheduleDownloadExcel = () => {
    try {
      const excelData = generateScheduleExcelData();

      // Guard clause: check if excelData is valid
      if (!excelData || !Array.isArray(excelData) || excelData.length === 0) {
        throw new Error("No data available to export to Excel.");
      }

      const worksheet = XLSX.utils.aoa_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Schedule Report");
      
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Schedule_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      
      toast({
          title: "Success",
          description: "Schedule Excel report exported successfully!",
        });
    } catch (error) {
      console.error("Error exporting Schedule Excel:", error);
      toast({
          title: "Error",
          description: "Failed to export Schedule Excel report",
          variant: "destructive",
        });
    }
  };




  // Export functionality for Actual Time Table
  const generateActualTimeExcelData = () => {
    const excelData = [];

    // Add header row - match UI table headers exactly (no phone column)
    const headerRow = ['Employee Name'];
    if (currentWeekRange) {
      const startDate = new Date(currentWeekRange.startOfWeek);
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        // Format date as MM-DD-YYYY for headers
        const formattedDate = date.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        });
        headerRow.push(formattedDate);
      }
    }
    headerRow.push('Total');
    excelData.push(headerRow);

    // Get unique users from session data
    const uniqueUsers = new Map();
    sessionData.forEach(item => {
      const scheduleItem = scheduleData.find(si =>
        si.shifts.some(shift => shift.id === item.shiftId)
      );
      if (scheduleItem && !uniqueUsers.has(scheduleItem.userId)) {
        uniqueUsers.set(scheduleItem.userId, {
          id: scheduleItem.userId,
          name: scheduleItem.userName,
          phone: scheduleItem.userPhone
        });
      }
    });

    // Sort users by name to match UI table order
    const sortedUsers = Array.from(uniqueUsers.values()).sort((a, b) => a.name.localeCompare(b.name));
    
    // Add data rows
    sortedUsers.forEach(user => {
      const row = [user.name];
      
      if (currentWeekRange) {
        const startDate = new Date(currentWeekRange.startOfWeek);
        for (let i = 0; i < 7; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          const dateStr = toLocalYMD(date);
          
          const daySessions = sessionData.filter(item => {
            const scheduleItem = scheduleData.find(si =>
              si.shifts.some(shift => shift.id === item.shiftId)
            );
            if (!scheduleItem || scheduleItem.userId !== user.id) return false;
            
            const shift = scheduleItem.shifts.find(s => s.id === item.shiftId);
            return shift && shift.date === dateStr;
          });
          
          if (daySessions.length > 0) {
            const sessionTimes = daySessions.map(session => 
              `${session.clockIn} - ${session.clockOut}`
            ).join(', ');
            row.push(sessionTimes);
          } else {
            row.push('');
          }
        }
      }
      
      // Add per-row total count of sessions
      const userTotal = sessionData
        .filter(item => {
          const scheduleItem = scheduleData.find(si =>
            si.shifts.some(shift => shift.id === item.shiftId)
          );
          return scheduleItem && scheduleItem.userId === user.id;
        })
        .length;
      row.push(String(userTotal));
      
      excelData.push(row);
    });

    // Add totals row
    const totalsRow = ['GRAND TOTAL'];
    let grandTotal = 0;
    
    if (currentWeekRange) {
      const startDate = new Date(currentWeekRange.startOfWeek);
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = toLocalYMD(date);
        
        // Calculate total hours for this day across all users
        const daySessions = sessionData.filter(item => {
          const scheduleItem = scheduleData.find(si =>
            si.shifts.some(shift => shift.id === item.shiftId)
          );
          if (!scheduleItem) return false;
          
          const shift = scheduleItem.shifts.find(s => s.id === item.shiftId);
          return shift && shift.date === dateStr;
        });
        
        const dayTotalCount = daySessions.length;
        
        totalsRow.push(String(dayTotalCount));
        grandTotal += dayTotalCount;
      }
    }
    
    totalsRow.push(String(grandTotal));
    excelData.push(totalsRow);

    return excelData;
  };

  const handleActualTimeDownloadExcel = () => {
    try {
      const excelData = generateActualTimeExcelData();
      
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Actual Time Report");
      
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Actual_Time_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      
      toast({
          title: "Success",
          description: "Actual Time Excel report exported successfully!",
        });
    } catch (error) {
      console.error("Error exporting Actual Time Excel:", error);
      toast({
          title: "Error",
          description: "Failed to export Actual Time Excel report",
          variant: "destructive",
        });
    }
  };



    const handleActualTimePrint = async () => {
    try {
      setIsPrinting(true);
      
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const tableContent = generateActualTimePrintableTable(sessionData, scheduleData, currentWeekRange);
      
      // Compute meta details for header (Actual Time)
      const totalEmployees = new Set(scheduleData.map(i => i.userId)).size;
      const totalHours = sessionData.reduce((sum, item) => sum + (item.workedTime || 0), 0) / 60;
      
      await handlePrint(
        tableContent,
        {
          title: "Actual Time Report",
          selectedClient,
          currentWeekRange,
          totalEmployees,
          totalHours
        },
        (error) => toast({
          title: "Error",
          description: error,
          variant: "destructive",
        }),
        () => toast({
          title: "Success",
          description: "Actual Time report printed successfully!",
        })
      );
      
    } catch (error) {
      console.error("Error printing actual time:", error);
      toast({
          title: "Error",
          description: "Failed to print actual time report",
          variant: "destructive",
        });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 md:px-6 pt-10">
      {!showScheduleTable ? (
        <>
          {error ? (
            <p className="text-red-500">Error loading data: {error}</p>
          ) : (
            <GenericTable
              key={viewKey} 
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
            isLoading={tableLoading}
          />
        </>
      ) : (
        <div className="w-full">
          {/* Header with reset button and date navigation */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Schedule View</h2>
            <div className="flex items-center space-x-4">
              {/* Date Navigation Component */}

              <button
                onClick={resetScheduleView}
                className="inline-flex items-center px-4 py-2 border border-gray-400 text-gray-600 hover:bg-gray-50 font-medium rounded-md transition-colors duration-200"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Back to Clients
              </button>
            </div>
          </div>

          {/* Add New Guard Form */}
          {!scheduleLoading && !scheduleError && isScheduleEditMode && (
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100 mb-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">
                {scheduleData.length > 0 ? "Edit Schedule" : "Add New Schedule"}
              </h3>

                             <form onSubmit={onSubmitAddGuard} autoComplete="off">
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">

                  {/* User Search */}
                  <div className="relative">
                    <input
                      type="text"
                      value={userSearch}
                      onFocus={() => setShowUserDropdown(true)}
                      onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                      onChange={e => {
                        setUserSearch(e.target.value);
                        setForm(f => ({ ...f, userId: "" }));
                      }}
                      placeholder="Guard Name"
                      className={inputClasses}
                    />
                    {errors.userId && (
                      <span className="text-xs text-red-500">{errors.userId}</span>
                    )}
                    {showUserDropdown && userSearch.length >= 2 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50 font-sans">
                        {loadingUsers ? (
                          <div className="p-2 text-sm text-gray-500">Searching guards...</div>
                        ) : searchedUsers.length === 0 ? (
                          <div className="p-2 text-gray-500 text-sm">No guards found</div>
                        ) : (
                          searchedUsers.map(user => (
                            <div
                              key={user.id}
                              className="p-2 cursor-pointer text-sm hover:bg-gray-50"
                              onMouseDown={() => handleUserSelect(user)}
                            >
                              {user.name}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Date */}
                  <div className="flex items-center">
                    <CustomDatePicker
                      value={form.date}
                      onChange={handleFormChange}
                      placeholder="Select Date"
                      className={`${inputClasses} ${form.date ? "text-black" : "text-gray-500"}`}
                      minDate={currentWeekRange ? toLocalYMD(currentWeekRange.startOfWeek) : undefined}
                      maxDate={currentWeekRange ? toLocalYMD(currentWeekRange.endOfWeek) : undefined}
                    />
                    {errors.date && (
                      <span className="text-xs text-red-500">{errors.date}</span>
                    )}
                    <div className="flex items-center m-2 space-x-2">
                      <input
                        id="applyAllWeek"
                        type="checkbox"
                        checked={applyAllWeek}
                        disabled={!form.date}
                        onChange={e => setApplyAllWeek(e.target.checked)}
                        className={`w-4 h-4 rounded ${form.date
                          ? "accent-blue-600 focus:ring-blue-500 border-gray-300"
                          : "accent-gray-400 border-gray-200 cursor-not-allowed"
                          }`}
                      />
                      <label
                        htmlFor="applyAllWeek"
                        className={`text-xs whitespace-nowrap ${form.date
                          ? "text-gray-600 cursor-pointer"
                          : "text-gray-400 cursor-not-allowed"
                          }`}
                      >
                        All Week
                      </label>
                    </div>
                  </div>

                  {/* Start Time */}
                  <div>
                    <input
                      type={form.starttime ? "time" : "text"}
                      value={form.starttime}
                      onChange={(e) => handleFormChange("starttime", e.target.value)}
                      placeholder="Start Time"
                      step="60"
                      onFocus={(e) => {
                        e.target.type = "time";
                        e.target.showPicker?.();
                      }}
                      onBlur={(e) => {
                        if (!e.target.value) {
                          e.target.type = "text";
                        }
                      }}
                      className={`${inputClasses} ${form.starttime ? "text-black" : "text-gray-500"}`}
                    />
                    {errors.starttime && (
                      <span className="text-xs text-red-500">{errors.starttime}</span>
                    )}
                  </div>

                  {/* End Time */}
                  <div>
                    <input
                      type={form.endtime ? "time" : "text"}
                      value={form.endtime}
                      onChange={(e) => handleFormChange("endtime", e.target.value)}
                      placeholder="End Time"
                      onFocus={(e) => {
                        e.target.type = "time";
                        e.target.showPicker?.();
                      }}
                      onBlur={(e) => {
                        if (!e.target.value) {
                          e.target.type = "text";
                        }
                      }}
                      className={`${inputClasses} ${form.endtime ? "text-black" : "text-gray-500"}`}
                    />
                    {errors.endtime && (
                      <span className="text-xs text-red-500">{errors.endtime}</span>
                    )}
                    {errors.overlap && (
                      <span className="text-xs text-red-500">{errors.overlap}</span>
                    )}
                  </div>

                                                        {/* Auto Toggle and Buttons */}
                    <div className="flex items-center justify-center h-[32px] border border-none ">
                       <ToggleSwitch enabled={auto} onToggle={setAuto} label="Auto" />
                     </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={submitLoader}
                        className="w-20 inline-flex items-center justify-center px-3 h-[32px] border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 disabled:cursor-not-allowed font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
                      >
                       {submitLoader ? (
                         <>
                           <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                           Adding...
                         </>
                       ) : (
                         <>
                           <Plus className="w-4 h-4 mr-1" />
                           Add
                         </>
                       )}
                     </button>
                     {(form.date || form.starttime || form.endtime || form.userId || auto) && (
                                               <button
                          type="button"
                          onClick={resetAddGuardForm}
                          className="w-20 inline-flex items-center justify-center px-3 h-[32px] border border-gray-400 text-gray-600 hover:bg-gray-50 font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 whitespace-nowrap"
                        >
                         <RotateCcw className="w-4 h-4 mr-1" />
                         Reset
                       </button>
                     )}
                   </div>
                </div>
              </form>
            </div>
          )}


          {/* Removed page-level schedule loader */}
          <div className="flex w-full justify-between items-center  my-0 py-2 px-4 rounded-t-lg bg-gray-50">
            {selectedClient && (
              <div className="text-left">
                <div className="text-lg font-medium text-gray-800">{selectedClient.name}</div>
                <div className="text-sm text-gray-500">{selectedClient.address}</div>
              </div>
            )}
            <DateNavigation
              selectedDate={selectedDate}
              onDateChange={validateAndNavigate}
              currentWeekRange={currentWeekRange}
            />
          </div>

          {/* Show no data message when no schedule exists or when we navigated to an empty week */}
          {!scheduleError && !scheduleLoading && !tableLoading && (scheduleData.length === 0 || !hasApiData) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <div className="text-gray-500">
                <h3 className="text-lg font-medium mb-2">No Schedule Found</h3>
                <p className="text-sm">
                No schedule found for {[selectedClient?.name, selectedClient?.lastName].filter(Boolean).join(' ') || "this client"} for week {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric'
                  }) : ""}.
                </p>
              </div>
            </div>
          )}

                    {/* Only render ScheduleTable when we have data */}
                    {!scheduleError && hasApiData && scheduleData.length > 0 && (
            <ScheduleTable
              key={`schedule-${viewKey}`}
              scheduleData={scheduleData}
              selectedDate={selectedDate}
              currentWeekRange={currentWeekRange}
              isEditMode={isScheduleEditMode}
              onScheduleDataChange={setScheduleData}
              onPublish={handlePublish}
              onPrint={handleSchedulePrint}
              onDownloadExcel={handleScheduleDownloadExcel}
              onToggleEditMode={toggleScheduleEditMode}
              isPublishing={isPublishing}
              isPrinting={isPrinting}
              loading={scheduleLoading || tableLoading}
              onUserAutoToggle={handleUserAutoToggle}
              onShiftAutoToggle={handleShiftAutoToggle}
            />
          )}

          {/* Actual Time Table Section - only when we have schedule data */}
          {!scheduleError && hasApiData && scheduleData.length > 0 && (
            <div key={`actual-${viewKey}`} className="mt-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Actual Time Tracking</h3>
              {!sessionError && (
                <ActualTimeTable
                  scheduleData={createImmutableScheduleCopy(scheduleData)}
                  sessionData={sessionData}
                  selectedDate={selectedDate}
                  currentWeekRange={currentWeekRange}
                  isEditMode={isActualTimeEditMode}
                  onSessionDataChange={(newData) => {
                    setSessionData(newData);
                  }}
                  onPublish={handleActualTimePublish}
                  onPrint={handleActualTimePrint}
                  onDownloadExcel={handleActualTimeDownloadExcel}
                  onToggleEditMode={toggleActualTimeEditMode}
                  isPublishing={isActualTimePublishing}
                  isPrinting={isPrinting}
                  loading={sessionLoading}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ViewSchedule;

import React, { useEffect, useState } from "react";
import { useClientSessions } from "../../context/ViewSchedule";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import { ScheduleTable } from "../../components/ScheduleTable";
import { ActualTimeTable } from "../../components/ActualTimeTable";
import { Eye, Plus, RotateCcw, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import ToggleSwitch from "../../components/ui/toggle";
import { useToast } from "../../hooks/use-toast";
import { toast } from "sonner";

import { useSearchUsers } from "../../hooks/useSearchUser";
import { useDebounce } from "../../hooks/useDebounce";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { formatDateLocal, formatDateStringLocal } from "../../lib/utils";

// Custom Date Picker Component
const CustomDatePicker = ({ value, onChange, placeholder, className, minDate, maxDate }: {
  value: string;
  onChange: (field: string, value: string) => void;
  placeholder?: string;
  className?: string;
  minDate?: string;
  maxDate?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Convert YYYY-MM-DD to Date object
  const selectedDate = value ? new Date(value) : null;

  // Format date for display as MM-DD-YYYY
  const formatDateForDisplay = (date) => {
    if (!date) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  };

  // Handle date selection
  const handleDateChange = (date) => {
    if (date) {
      // Convert to YYYY-MM-DD format for form state using local timezone
      const formattedDate = formatDateLocal(date);
      onChange("date", formattedDate);
    } else {
      onChange("date", '');
    }
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={formatDateForDisplay(selectedDate)}
        onChange={() => { }} // Read-only input
        placeholder={placeholder || "MM-DD-YYYY"}
        className={className}
        onClick={() => setIsOpen(true)}
        readOnly
      />
      <Calendar
        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
      />
      {isOpen && (
        <div className="absolute z-50 mt-1">
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            inline
            // minDate={minDate ? new Date(minDate) : undefined}
            // maxDate={maxDate ? new Date(maxDate) : undefined}
            dateFormat="MM/dd/yyyy"
            showYearDropdown
            scrollableYearDropdown
            yearDropdownItemNumber={15}
            onCalendarClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

interface PeriodEndDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (date: string) => void;
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

const getWeekRangeFromDate = (baseDate) => {
  const day = baseDate.getUTCDay();
  const daysSinceThursday = (day + 3) % 7;
  const startOfWeek = new Date(baseDate);
  startOfWeek.setUTCDate(baseDate.getUTCDate() - daysSinceThursday);
  startOfWeek.setUTCHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
  endOfWeek.setUTCHours(23, 59, 59, 999);

  return { startOfWeek, endOfWeek };
};

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


// Utility function to convert date from YYYY-MM-DD to MM-DD-YYYY
const convertDateFormat = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${month}-${day}-${year}`;
};

// Utility function to convert timestamp to YYYY-MM-DD format
const convertTimestampToDate = (timestamp: string) => {
  const date = new Date(parseInt(timestamp));
  return formatDateLocal(date);
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

export const PeriodEndDateModal: React.FC<PeriodEndDateModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [selectedDate, setSelectedDate] = useState("");

  const handleSubmit = () => {
    if (selectedDate) {
      onSubmit(selectedDate);
      onClose();
    }
  };

  const handleCurrentWeek = () => {
    const today = new Date();
    const day = today.getUTCDay();
    const daysSinceThursday = (day + 3) % 7; // Thursday = 4, so we subtract to get back to it
    const startOfWeek = new Date(today);
    startOfWeek.setUTCDate(today.getUTCDate() - daysSinceThursday);
    startOfWeek.setUTCHours(0, 0, 0, 0);

    const formatted = formatDateLocal(startOfWeek);
    setSelectedDate(formatted);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-80 shadow-lg">
        <h2 className="text-lg font-semibold mb-4 text-center">Period End Date</h2>
        <CustomDatePicker
          value={selectedDate}
          onChange={(field, value) => setSelectedDate(value)}
          placeholder="Select Date"
          className="border border-gray-300 rounded w-full p-2 mb-4"
        />
        <button
          onClick={handleSubmit}
          className="w-full py-2 rounded mb-4 text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors"
        >
          Enter
        </button>

        <div className="flex justify-between">
          <button
            onClick={handleCurrentWeek}
            className="w-[48%] py-2 rounded text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors"
          >
            Current Week
          </button>
          <button
            onClick={onClose}
            className="w-[48%] py-2 rounded text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors"
          >
            Return
          </button>
        </div>
      </div>
    </div>
  );
};

// Date Navigation Component
const DateNavigation = ({
  selectedDate,
  onDateChange,
  currentWeekRange
}: {
  selectedDate: string;
  onDateChange: (date: string) => void;
  currentWeekRange: any;
}) => {
  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (!currentWeekRange) return;

    const currentDate = new Date(selectedDate);
    const daysToAdd = direction === 'next' ? 7 : -7;
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + daysToAdd);

    const newDateStr = formatDateLocal(newDate);
    onDateChange(newDateStr);
  };

  return (
    <div className="flex items-center space-x-2 bg-white border border-blue-200 rounded-lg px-3 py-2 shadow-sm">
      <button
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
  const { toast: hookToast } = useToast();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isActualTimePublishing, setIsActualTimePublishing] = useState(false);
  const [isScheduleEditMode, setIsScheduleEditMode] = useState(false);
  const [isActualTimeEditMode, setIsActualTimeEditMode] = useState(false);

  // Session data state for actual time tracking (local state for UI)
  const [sessionData, setSessionData] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState(null);

  // Add local loading state for table navigation
  const [tableLoading, setTableLoading] = useState(false);

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


  const handleView = (rowData: any) => {
    // Extract the full client data from the row
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
    setTableLoading(true); // Set local loading state

    const clientId = selectedClient?.clientId;
    const addressId = selectedClient?.addressId;

    // Convert date format from YYYY-MM-DD to MM-DD-YYYY for backend
    const formattedDate = convertDateFormat(date);

    console.log("Submitting with:", {
      clientId,
      addressId,
      date: formattedDate,
      originalDate: date
    });

    if (!clientId || !addressId) {
      toast.error("Missing client or address information!");
      setTableLoading(false);
      return;
    }

    // Generate week range (use original date format for frontend calculations)
    const selectedDateObj = new Date(date);
    const weekRange = getWeekRangeFromDate(selectedDateObj);
    setCurrentWeekRange(weekRange);

    // Clear any existing schedule data
    clearScheduleData();

    // Fetch actual schedule data from API using formatted date
    try {
      await fetchScheduleData(clientId, addressId, formattedDate);
    } catch (error) {
      console.error("Error fetching schedule data:", error);
      toast.error("Failed to load schedule data!");
    } finally {
      setTableLoading(false); // Clear local loading state
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
      setTableData([]); // fallback if clientSessions is null or not an array
    }
  }, [clientSessions]);

  // Transform API data when it arrives - UPDATED
  // ... existing code ...

  // Transform API data when it arrives - FIXED VERSION
  useEffect(() => {
    if (apiScheduleData && Array.isArray(apiScheduleData)) {
      if (apiScheduleData.length === 0) {
        // No schedule data exists for this week
        const clientName = selectedClient?.name || "this client";
        const formattedDate = selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : "the selected date";
        
        toast.error(`No schedule exists for ${clientName} on ${formattedDate}. Please prepare a schedule first.`);
        setHasApiData(false);
        // Revert to the previous date or stay on current date
        return;
      }

      // We have data from API
      setHasApiData(true);

      const keyedByUserDate = new Map<string, {
        id: number;
        clientId: number;
        addressId: number;
        userId: number;
        startDate: string;
        auto: boolean;
        shifts: {
          id: number;
          date: string;
          startTime: string;
          endTime: string;
          hours: number;
          scheduleSessionId: number;
        }[];
        clientName: string;
        address: string;
        userName: string;
        userPhone: string;
      }>();

      apiScheduleData.forEach(group => {
        const userId = group.user?.id;
        group.shifts?.forEach(shift => {
          if (!shift?.date || userId == null) return;

          // Use local timezone formatting instead of toISOString
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
              clientName: selectedClient?.name || "Unknown Client",
              address: selectedClient?.address || "Unknown Address",
              userName: group.user?.name ?? "",
              userPhone: ""
            };
            keyedByUserDate.set(key, item);
          }

          // Deduplicate by id OR by start/end time
          const exists = item.shifts.some(s =>
            s.id === shift.id ||
            (s.startTime === shift.startTime && s.endTime === shift.endTime)
          );
          if (!exists) {
            item.shifts.push({
              id: shift.id,
              date,
              startTime: shift.startTime,
              endTime: shift.endTime,
              hours: shift.hours,
              scheduleSessionId: shift.scheduleSessionId
            });
          }
        });
      });

      // Sort shifts for each day by start time
      keyedByUserDate.forEach(v => {
        v.shifts.sort((a, b) => {
          const toMin = (t: string) => {
            const [h, m] = t.split(":").map(Number);
            return h * 60 + m;
          };
          return toMin(a.startTime) - toMin(b.startTime);
        });
      });

      const transformedData = Array.from(keyedByUserDate.values());
      setScheduleData(transformedData);

      // Only update the date and week range if we have valid data
      if (transformedData.length > 0) {
        setSelectedDate(selectedDate); // Keep the new date
        const selectedDateObj = new Date(selectedDate);
        const weekRange = getWeekRangeFromDate(selectedDateObj);
        setCurrentWeekRange(weekRange);
      }

      // Fetch session data after transform
      const scheduleSessionIds = new Set<number>();
      transformedData.forEach(item => {
        item.shifts.forEach(s => s.scheduleSessionId && scheduleSessionIds.add(s.scheduleSessionId));
      });
      fetchSessionData(Array.from(scheduleSessionIds));
    } else {
      setScheduleData([]);
      setSessionData([]);
      setHasApiData(false);
    }
  }, [apiScheduleData, selectedClient, selectedDate]);
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
      const selectedDate = new Date(value);
      const weekRange = getWeekRangeFromDate(selectedDate);

      // Use local timezone formatting
      const existingWeekStart = formatDateLocal(currentWeekRange.startOfWeek);
      const newWeekStart = formatDateLocal(weekRange.startOfWeek);

      if (existingWeekStart !== newWeekStart) {
        hookToast({
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

    hookToast({
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
        hookToast({
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
      };

      if (applyAllWeek && currentWeekRange) {
        // Add for each day in the week (Thu-Wed)
        const startDate = new Date(currentWeekRange.startOfWeek);

        for (let i = 0; i < 7; i++) {
          const dateObj = new Date(startDate);
          dateObj.setDate(startDate.getDate() + i);
          // Use local timezone formatting
          const dateStr = formatDateLocal(dateObj);

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
              clientName: selectedClient?.name || "Unknown Client",
              address: selectedClient?.address || "Unknown Address",
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
            clientName: selectedClient?.name || "Unknown Client",
            address: selectedClient?.address || "Unknown Address",
            userName: selectedUser.name,
            userPhone: selectedUser.phone || '',
          });
        }
      }

      // Update schedule data and re-render table
      setScheduleData(updatedScheduleData);

      resetAddGuardForm();

      hookToast({
        title: "Success",
        description: "New guard shift added successfully!",
      });
    } catch (err) {
      console.error("Error adding guard shift:", err);
      hookToast({
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
      toast.error("No data available to publish!");
      return;
    }

    try {
      setIsPublishing(true);

      // Calculate week start and end dates from the selected date
      const selectedDateObj = new Date(selectedDate);
      const weekRange = getWeekRangeFromDate(selectedDateObj);
      // Use local timezone formatting
      const startDate = formatDateLocal(weekRange.startOfWeek);
      const endDate = formatDateLocal(weekRange.endOfWeek);

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
            shiftId: isClientGeneratedId ? null : shift.id
          });
        });
      });

      // Calculate weekly hours for each user and prepare final array
      const scheduleInput = Array.from(userScheduleMap.values()).map(userSchedule => {
        // Calculate total weekly hours
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
      console.log(scheduleInput);

      // Call the context function
      await bulkUpsertScheduleSessions(scheduleInput);
      console.log("scheduleInput", JSON.stringify(scheduleInput, null, 2));

      toast.success("Schedule published successfully!");

      // Switch to view mode after successful publish
      setIsScheduleEditMode(false);

    } catch (error) {
      console.error("Error publishing schedule:", error);
      toast.error("Failed to publish schedule. Please try again.");
    } finally {
      setIsPublishing(false);
    }
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
      toast.error("No actual time data available to publish!");
      return;
    }

    try {
      setIsActualTimePublishing(true);

      // Only send complete sessions (both clockIn and clockOut present)
      const complete = sessionData.filter(s => s.clockIn && s.clockOut);

      const items = sessionData
        .filter(s => s.clockIn) // require clockIn; allow no clockOut
        .map(s => {
          const isNew = s.id > 1700000000000;
          return {
            sessionId: isNew ? null : s.id,
            shiftId: s.shiftId,
            scheduleSessionId: s.scheduleSessionId,
            clockIn: s.clockIn!,
            ...(s.clockOut ? { clockOut: s.clockOut } : {}), // include only if not null/empty
          };
        });

      if (items.length === 0) {
        toast.error("No sessions to publish.");
        setIsActualTimePublishing(false);
        return;
      }

      await updateSessionTimes(items);

      toast.success("Actual time data published successfully!");

      // Switch to view mode after successful publish
      setIsActualTimeEditMode(false);

    } catch (error) {
      console.error("Error publishing actual time data:", error);
      toast.error("Failed to publish actual time data. Please try again.");
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
    const clientId = selectedClient?.clientId;
    const addressId = selectedClient?.addressId;

    if (!clientId || !addressId) {
      toast.error("Missing client or address information!");
      return;
    }

    setTableLoading(true); // Set local loading state

    // Convert date format from YYYY-MM-DD to MM-DD-YYYY for backend
    const formattedDate = convertDateFormat(newDate);

    // Generate week range for the new date
    const selectedDateObj = new Date(newDate);
    const weekRange = getWeekRangeFromDate(selectedDateObj);

    // Clear any existing schedule data
    clearScheduleData();

    // Fetch actual schedule data from API using formatted date
    try {
      await fetchScheduleData(clientId, addressId, formattedDate);
      
      // The useEffect will handle checking if data exists and updating the UI accordingly
      
    } catch (error) {
      console.error("Error fetching schedule data:", error);
      toast.error("Failed to load schedule data!");
    } finally {
      setTableLoading(false); // Clear local loading state
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
                      minDate={currentWeekRange ? formatDateLocal(currentWeekRange.startOfWeek) : undefined}
                      maxDate={currentWeekRange ? formatDateLocal(currentWeekRange.endOfWeek) : undefined}
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
                  <div className="flex items-center gap-2">
                    <ToggleSwitch enabled={auto} onToggle={setAuto} label="Auto" />

                    <button
                      type="submit"
                      disabled={submitLoader}
                      className="inline-flex items-center px-4 py-1 border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 disabled:cursor-not-allowed font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
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
                        className="inline-flex items-center px-4 py-1 border border-gray-400 text-gray-600 hover:bg-gray-50 font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 whitespace-nowrap"
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
          <div className="flex w-full justify-end items-end">
            <DateNavigation
              selectedDate={selectedDate}
              onDateChange={handleDateNavigation}
              currentWeekRange={currentWeekRange}
            />
          </div>

          {/* Show no data message when no schedule exists */}
          {!scheduleLoading && !scheduleError && !tableLoading && scheduleData.length === 0 && !hasApiData && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <div className="text-gray-500">
                <h3 className="text-lg font-medium mb-2">No Schedule Found</h3>
                <p className="text-sm">
                  No schedule exists for the selected week ({selectedDate}). 
                  Click the "Edit" button to add guards and create a new schedule.
                </p>
              </div>
            </div>
          )}

          {/* Always render table; show inline loader via prop */}
          {!scheduleError && (
            <ScheduleTable
              scheduleData={scheduleData}
              selectedDate={selectedDate}
              currentWeekRange={currentWeekRange}
              isEditMode={isScheduleEditMode}
              onScheduleDataChange={setScheduleData}
              onPublish={handlePublish}
              onPrint={() => { }}
              onDownloadExcel={() => { }}
              onToggleEditMode={toggleScheduleEditMode}
              isPublishing={isPublishing}
              isPrinting={isPrinting}
              loading={scheduleLoading || tableLoading}
            />
          )}

          {/* Actual Time Table Section */}
                  {/* Actual Time Table Section */}
                  {!scheduleError && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Actual Time Tracking</h3>

              {/* Removed page-level session loader; error remains */}
              {sessionError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                  <div className="flex">
                    <div className="text-red-800">
                      <h3 className="text-sm font-medium">Error loading actual time data</h3>
                      <div className="mt-2 text-sm">
                        <p>{sessionError}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Always render; show inline loader via prop */}
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
                  onPrint={() => {
                    console.log("Printing actual time data");
                    toast.success("Printing actual time data...");
                  }}
                  onDownloadExcel={() => {
                    console.log("Downloading actual time Excel");
                    toast.success("Downloading actual time Excel...");
                  }}
                  onToggleEditMode={toggleActualTimeEditMode}
                  isPublishing={isActualTimePublishing}
                  isPrinting={false}
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
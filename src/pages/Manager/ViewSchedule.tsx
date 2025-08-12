import React, { useEffect, useState } from "react";
import { useClientSessions } from "../../context/ViewSchedule";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import { Eye, Edit, Trash2, GripVertical, Plus, RotateCcw, Printer, Upload, Send, Calendar } from "lucide-react";
import ToggleSwitch from "../../components/ui/toggle";
import { useToast } from "../../hooks/use-toast";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useSearchUsers } from "../../hooks/useSearchUser";
import { useDebounce } from "../../hooks/useDebounce";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CustomDatePicker } from "../../components/CustomDatePicker";



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
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);

  return start1Minutes < end2Minutes && end1Minutes > start2Minutes;
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
const getMaxShiftsPerDay = (userId: number, scheduleData: ScheduleItem[]) => {
  const userDays = scheduleData.filter(i => i.userId === userId);
  let max = 1;
  for (const d of userDays) max = Math.max(max, d.shifts.length);
  return max;
};
const userHasMultiShiftDay = (userId: number, scheduleData: ScheduleItem[]) => {
  const userSchedules = scheduleData.filter(item => item.userId === userId);

  // Group shifts by date to check if any date has multiple shifts
  const shiftsByDate = new Map<string, Shift[]>();

  userSchedules.forEach(schedule => {
    schedule.shifts.forEach(shift => {
      const date = shift.date;
      if (!shiftsByDate.has(date)) {
        shiftsByDate.set(date, []);
      }
      shiftsByDate.get(date)!.push(shift);
    });
  });

  // Check if any date has multiple shifts
  for (const [date, shifts] of shiftsByDate) {
    if (shifts.length > 1) {
      return true; // User has multiple shifts on at least one day
    }
  }

  return false; // User has at most one shift per day
};
const getUniqueShiftTimes = (userId: number, scheduleData: ScheduleItem[]) => {
  const userSchedules = scheduleData.filter(item => item.userId === userId);
  const uniqueTimes = new Set<string>();
  const shiftTimes: { startTime: string; endTime: string }[] = [];

  userSchedules.forEach(schedule => {
    schedule.shifts.forEach(shift => {
      const timeKey = `${shift.startTime}-${shift.endTime}`;
      if (!uniqueTimes.has(timeKey)) {
        uniqueTimes.add(timeKey);
        shiftTimes.push({
          startTime: shift.startTime,
          endTime: shift.endTime
        });
      }
    });
  });

  return shiftTimes;
};

const getShiftForUserDateAndTime = (userId: number, date: string, startTime: string, endTime: string, scheduleData: ScheduleItem[]) => {
  const daySchedules = scheduleData.filter(item =>
    item.userId === userId && item.startDate === date
  );

  for (const schedule of daySchedules) {
    const shift = schedule.shifts.find(s =>
      s.startTime === startTime && s.endTime === endTime
    );
    if (shift) return shift;
  }
  return null;
};

const calculateShiftTimeTotal = (userId: number, startTime: string, endTime: string, scheduleData: ScheduleItem[], dateColumns: any[]) => {
  let total = 0;
  dateColumns.forEach(dateCol => {
    const shift = getShiftForUserDateAndTime(userId, dateCol.date, startTime, endTime, scheduleData);
    if (shift) {
      total += shift.hours;
    }
  });
  return parseFloat(total.toFixed(2));
};

// Utility function to convert date from YYYY-MM-DD to MM-DD-YYYY
const convertDateFormat = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${month}-${day}-${year}`;
};

// Utility function to convert timestamp to YYYY-MM-DD format
const convertTimestampToDate = (timestamp: string) => {
  const date = new Date(parseInt(timestamp));
  return date.toISOString().split('T')[0];
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

    const formatted = startOfWeek.toISOString().slice(0, 10);
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
          className="mb-4"
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
    bulkUpsertScheduleSessions // Updated: Added bulkUpsertScheduleSessions
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
  const [isEditMode, setIsEditMode] = useState(false);

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

  // Modal states for edit/delete functionality
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, shiftId: null, userId: null, date: null });
  const [editModal, setEditModal] = useState({ isOpen: false, shift: null, userId: null, date: null });
  const [deleteUserModal, setDeleteUserModal] = useState({ isOpen: false, userId: null });
  const [editForm, setEditForm] = useState({ starttime: "", endtime: "" });

  // Drag and drop states
  const [draggedShift, setDraggedShift] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);

  // Add new state for table selection
  const [activeTable, setActiveTable] = useState<'schedule' | 'actual'>('schedule');

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
  if (apiScheduleData && Array.isArray(apiScheduleData) && apiScheduleData.length > 0) {
    console.log("Raw API data:", apiScheduleData);

    // Transform API data to match your component's expected format
    const transformedData: ScheduleItem[] = [];

    // Process each schedule group in the array
    apiScheduleData.forEach(scheduleGroup => {
      if (scheduleGroup.shifts && scheduleGroup.user) {
        // Group shifts by date for this user
        const shiftsByDate = new Map();

        scheduleGroup.shifts.forEach(shift => {
          // Convert ISO date string to YYYY-MM-DD format
          let readableDate;
          try {
            if (shift.date) {
              // Handle ISO date string like "2025-08-08T00:00:00.000Z"
              const dateObj = new Date(shift.date);
              readableDate = dateObj.toISOString().split('T')[0];
            } else {
              console.warn('Missing date for shift:', shift);
              return; // Skip this shift
            }
          } catch (error) {
            console.error('Error converting date:', shift.date, error);
            return; // Skip this shift
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

        // Create a ScheduleItem for each date
        shiftsByDate.forEach((dateShifts, date) => {
          transformedData.push({
            id: transformedData.length + 1,
            clientId: scheduleGroup.clientId,
            addressId: scheduleGroup.addressId,
            userId: scheduleGroup.user.id,
            startDate: date,
            auto: false, // You might need to get this from another source
            shifts: dateShifts,
            clientName: selectedClient?.name || "Unknown Client",
            address: selectedClient?.address || "Unknown Address",
            userName: scheduleGroup.user.name,
            userPhone: "" // You might need to fetch user phone separately
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

  // Generate date columns for the schedule table
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

      const existingWeekStart = currentWeekRange.startOfWeek.toISOString().split('T')[0];
      const newWeekStart = weekRange.startOfWeek.toISOString().split('T')[0];

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
          const dateStr = dateObj.toISOString().split('T')[0];
          
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
              clientId: scheduleData[0]?.clientId || 0,
              addressId: scheduleData[0]?.addressId || 0,
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
              clientName: scheduleData[0]?.clientName || "Unknown Client",
              address: scheduleData[0]?.address || "Unknown Address",
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
            clientId: scheduleData[0]?.clientId || 0,
            addressId: scheduleData[0]?.addressId || 0,
            userId: Number(form.userId),
            startDate: form.date,
            auto,
            shifts: [
              {
                ...newShift,
                date: form.date,
              },
            ],
            clientName: scheduleData[0]?.clientName || "Unknown Client",
            address: scheduleData[0]?.address || "Unknown Address",
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
  

  // Calculate totals
  const calculateDayTotal = (date: string) => {
    const total = scheduleData
      .filter(item => item.startDate === date)
      .reduce((total, item) => total + item.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0);
    return parseFloat(total.toFixed(2));
  };

  const calculateUserTotal = (userId: number) => {
    const total = scheduleData
      .filter(item => item.userId === userId)
      .reduce((total, item) => total + item.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0);
    return parseFloat(total.toFixed(2));
  };

  const calculateGrandTotal = () => {
    const total = scheduleData.reduce((total, item) => total + item.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0);
    return parseFloat(total.toFixed(2));
  };

  // Excel Download functionality
  const generateExcelFile = () => {
    const formattedData = [];

    // Add data rows for each user - matching table structure exactly
    uniqueUsers.forEach(user => {
      const userShiftTimes = getUniqueShiftTimes(user.id, scheduleData);

      // First row for each user: Employee name with phone number below
      const userMainRow = {
        "Employee Name": `${user.name}\n${user.phone || ""}`,
      };

      // Add shift times for each date (only show shifts if they exist)
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

      userMainRow["Total"] = calculateUserTotal(user.id);
      userMainRow["Auto"] = scheduleData.find(item => item.userId === user.id)?.auto ? "ON" : "OFF";

      formattedData.push(userMainRow);

      // Add user total row
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
      totalRow["Total"] = calculateUserTotal(user.id);
      totalRow["Auto"] = "";
      formattedData.push(totalRow);
    });

    // Add grand total row
    const grandTotalRow = {
      "Employee Name": "Grand Total",
    };
    dateColumns.forEach(dateCol => {
      grandTotalRow[dateCol.display] = calculateDayTotal(dateCol.date) || "-";
    });
    grandTotalRow["Total"] = calculateGrandTotal();
    grandTotalRow["Auto"] = "";
    formattedData.push(grandTotalRow);

    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // Set column widths for better formatting
    const colWidths = [
      { wch: 20 }, // Employee Name
      ...dateColumns.map(() => ({ wch: 15 })), // Date columns
      { wch: 10 }, // Total
      { wch: 8 }   // Auto
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
      const startDate = weekRange.startOfWeek.toISOString().split('T')[0];
      const endDate = weekRange.endOfWeek.toISOString().split('T')[0];

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

    } catch (error) {
      console.error("Error publishing schedule:", error);
      toast.error("Failed to publish schedule. Please try again.");
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

    // Table headers - removed Phone
    const headers = [
      'Employee Name',
      ...dateColumns.map(col => col.display),
      'Total Hours',
      'Auto'
    ];

    const headerRow = headers.map(header =>
      `<th style="background-color: #004175; color: white; font-weight: bold; padding: 8px 4px; text-align: center; border: 1px solid #004175; font-size: 10px;">${header}</th>`
    ).join('');

    // Table rows from schedule data
    let dataRows = '';
    let rowIndex = 0;

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

        // Total hours (only on first shift row)
        if (shiftIndex === 0) {
          row += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; font-size: 10px;" rowspan="${userShiftTimes.length}">
            ${calculateUserTotal(user.id)}
          </td>`;
        }

        // Auto (only on first shift row)
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

      // User total row
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

      totalRow += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; font-size: 10px;">${calculateUserTotal(user.id)}</td>`;
      totalRow += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; font-size: 10px;"></td>`;
      totalRow += '</tr>';
      dataRows += totalRow;
      rowIndex++;
    });

    // Grand total row
    let grandTotalRow = `<tr style="background-color: #d0d0d0; font-weight: bold;">`;
    grandTotalRow += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; font-weight: bold; font-size: 10px;">Grand Total</td>`;
    dateColumns.forEach(dateCol => {
      grandTotalRow += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; font-size: 10px;">
        ${calculateDayTotal(dateCol.date) || '-'}
      </td>`;
    });

    grandTotalRow += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; font-size: 10px;">${calculateGrandTotal()}</td>`;
    grandTotalRow += `<td style="padding: 6px 4px; border: 1px solid #dee2e6; font-size: 10px;"></td>`;
    grandTotalRow += '</tr>';
    dataRows += grandTotalRow;

    // Calculate totals
    const totalRecords = uniqueUsers.length;
    const totalHours = calculateGrandTotal();

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

      // Small delay to show loading state
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

      // Wait for content to load, then focus and print
      printWindow.onload = () => {
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          // Don't close automatically - let user choose
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

  // Delete individual shift
  const handleDeleteShift = (userId: number, date: string, shiftId: number) => {
    setDeleteModal({ isOpen: true, shiftId, userId, date });
  };

  const confirmDeleteShift = () => {
    const { userId, date, shiftId } = deleteModal;
    setScheduleData(prev => prev.map(item => {
      if (item.userId === userId && item.startDate === date) {
        return {
          ...item,
          shifts: item.shifts.filter(shift => shift.id !== shiftId)
        };
      }
      return item;
    }).filter(item => item.shifts.length > 0));

    setDeleteModal({ isOpen: false, shiftId: null, userId: null, date: null });
    hookToast({
      title: "Shift Deleted",
      description: "Shift has been deleted successfully.",
    });
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
    const tempForm = {
      userId: String(userId),
      date: date,
      starttime: editForm.starttime,
      endtime: editForm.endtime
    };

    const editErrors = validateForm(tempForm, scheduleData, shift.id);

    if (Object.keys(editErrors).length > 0) {
      // Show error toast for overlapping shifts
      if (editErrors.overlap) {
        hookToast({
          title: "Overlapping Shift",
          description: editErrors.overlap,
          variant: "destructive",
        });
      }
      return;
    }

    const calculateHours = (start, end) => {
      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);
      let hours = endH - startH + (endM - startM) / 60;
      if (hours < 0) hours += 24;
      return parseFloat(hours.toFixed(2));
    };

    setScheduleData(prev => prev.map(item => {
      if (item.userId === userId && item.startDate === date) {
        return {
          ...item,
          shifts: item.shifts.map(s =>
            s.id === shift.id
              ? { ...s, startTime: editForm.starttime, endTime: editForm.endtime, hours: calculateHours(editForm.starttime, editForm.endtime) }
              : s
          )
        };
      }
      return item;
    }));

    setEditModal({ isOpen: false, shift: null, userId: null, date: null });
    setEditForm({ starttime: "", endtime: "" });
    hookToast({
      title: "Shift Updated",
      description: "Shift has been updated successfully.",
    });
  };

  const cancelEditShift = () => {
    setEditModal({ isOpen: false, shift: null, userId: null, date: null });
    setEditForm({ starttime: "", endtime: "" });
  };

  // Delete all data for a user
  const handleDeleteUser = (userId: number) => {
    setDeleteUserModal({ isOpen: true, userId });
  };

  const confirmDeleteUser = () => {
    const { userId } = deleteUserModal;
    setScheduleData(prev => prev.filter(item => item.userId !== userId));
    setDeleteUserModal({ isOpen: false, userId: null });
    hookToast({
      title: "User Data Deleted",
      description: "All data for this user has been deleted successfully.",
    });
  };

  const cancelDeleteUser = () => {
    setDeleteUserModal({ isOpen: false, userId: null });
  };

  // Auto toggle handler
  const handleUserAutoToggle = (userId: number, enabled: boolean) => {
    setScheduleData(prev => prev.map(item =>
      item.userId === userId ? { ...item, auto: enabled } : item
    ));

    hookToast({
      title: "Auto Setting Updated",
      description: `Auto setting ${enabled ? 'enabled' : 'disabled'} for user.`,
    });
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
      const hasOverlap = existingSchedule.shifts.some(existingShift => {
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
      setScheduleData(prev => prev.map(item => {
        if (item.userId === targetUserId && item.startDate === targetDate) {
          const currentShifts = [...item.shifts];

          // If dropping to a specific row position, insert at that position
          if (targetRowIdx < currentShifts.length) {
            // Replace the shift at the target row position
            currentShifts[targetRowIdx] = { ...shift, id: Date.now(), date: targetDate };
          } else {
            // Add to the end if target row is beyond current shifts
            currentShifts.push({ ...shift, id: Date.now(), date: targetDate });
          }

          return {
            ...item,
            shifts: sortShiftsByTime(currentShifts)
          };
        }
        return item;
      }));
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
          shifts: [{ ...shift, id: Date.now(), date: targetDate }],
          clientName: sourceSchedule.clientName,
          address: sourceSchedule.address,
          userName: targetUser?.name || sourceSchedule.userName,
          userPhone: targetUser?.phone || sourceSchedule.userPhone,
        };

        setScheduleData(prev => [...prev, newSchedule]);
      }
    }
    setDraggedShift(null);
    setDragOverCell(null);

    hookToast({
      title: "Shift Copied",
      description: "Shift has been copied successfully.",
    });
  };

  const handleDragEnd = () => {
    setDraggedShift(null);
    setDragOverCell(null);
  };

  const resetScheduleView = () => {
    setShowScheduleTable(false);
    setScheduleData([]);
    setCurrentWeekRange(null);
    setSelectedDate("");
    setIsEditMode(false);
    clearScheduleData(); // Clear API data
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
          {!scheduleLoading && !scheduleError && scheduleData.length > 0 && isEditMode && (
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100 mb-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Edit Schedule</h3>

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
                      minDate={currentWeekRange?.startOfWeek.toISOString().split('T')[0]}
                      maxDate={currentWeekRange?.endOfWeek.toISOString().split('T')[0]}
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
                            ? "text-blue-600 focus:ring-blue-500 border-gray-300"
                            : "text-gray-400 border-gray-200 cursor-not-allowed"
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
          {scheduleLoading && (
            <div className="flex justify-center items-center p-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-600">Loading schedule data...</span>
            </div>
          )}

          {/* Add error state */}
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
            <div className="relative w-full rounded-2xl border border-gray-200 shadow-xl">
              <div className="w-full overflow-auto rounded-2xl" style={{ maxHeight: "600px" }}>
                {/* Client Info */}
                {/* <div className="p-4 border-b bg-gray-50">
                  <div className="font-medium text-gray-800">
                    {scheduleData[0]?.clientName || 'Client Name'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {scheduleData[0]?.address || 'Address'}
                  </div>
                  <div className="text-sm text-gray-500">
                    Selected Date: {selectedDate}
                  </div>
                </div> */}

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
                                  <div className="text-xs text-gray-500">{user.phone}</div>
                                </td>
                              )}

                              {dateColumns.map(dateCol => {
                                const daySchedules = scheduleData.filter(
                                  i => i.userId === user.id && i.startDate === dateCol.date
                                );
                                const sortedShifts = sortShiftsByTime(
                                  daySchedules.flatMap(s => s.shifts)
                                );
                                const shift = sortedShifts[rowIdx]; // take nth shift of the day

                                return (
                                  <td
                                    key={dateCol.date + '-' + rowIdx}
                                    className={`border border-gray-300 px-4 py-3 text-center text-sm whitespace-nowrap ${dragOverCell?.userId === user.id && dragOverCell?.date === dateCol.date
                                        ? 'bg-blue-50 border-blue-300'
                                        : ''
                                      }`}
                                    onDragOver={e => handleDragOver(e, user.id, dateCol.date, rowIdx)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={e => handleDrop(e, user.id, dateCol.date, rowIdx)}
                                  >
                                    {shift ? (
                                      <div className="relative group">
                                        {isEditMode && (
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
                                              onClick={() => handleEditShift(user.id, dateCol.date, shift)}
                                              className="text-blue-600 hover:text-blue-800 p-0.5"
                                              title="Edit shift"
                                            >
                                              <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteShift(user.id, dateCol.date, shift.id)}
                                              className="text-red-600 hover:text-red-800 p-0.5"
                                              title="Delete shift"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        )}
                                        <span className="text-sm">{shift.startTime} - {shift.endTime}</span>
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
                                    <div className="flex items-center justify-center">
                                      <ToggleSwitch
                                        enabled={scheduleData.find(item => item.userId === user.id)?.auto || false}
                                        onToggle={enabled => handleUserAutoToggle(user.id, enabled)}
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
                              const daySchedules = scheduleData.filter(
                                i => i.userId === user.id && i.startDate === dateCol.date
                              );
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
                              {calculateUserTotal(user.id)}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center whitespace-nowrap">
                              {isEditMode && (
                                <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800 p-1" title="Delete all data for this user">
                                  <Trash2 className="w-4 h-4" />
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
                  <button
                    onClick={toggleEditMode}
                    className="inline-flex items-center px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium shadow-sm"
                    title="Cancel Edit Mode"
                  >
                    Cancel
                  </button>
                ) : (
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
                )}

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
            </div>
          )}

          {/* Show empty state if no data and not loading */}
          {!scheduleLoading && !scheduleError && scheduleData.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No schedule data found for the selected date.</p>
            </div>
          )}
        </div>
      )}

      {/* Delete Shift Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Shift</h3>
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
                <Trash2 className="w-4 h-4 mr-2" />
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
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={editForm.endtime}
                  onChange={(e) => setEditForm(prev => ({ ...prev, endtime: e.target.value }))}
                  className={inputClasses}
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
    </div>
  );
};
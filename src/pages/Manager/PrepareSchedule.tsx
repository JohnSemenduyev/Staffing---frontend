import React, { useEffect, useState } from "react";
import { Plus, RotateCcw, Edit, Trash2, GripVertical, Calendar } from "lucide-react";
import { useSearchClient } from "../../hooks/usesearchClient";
import { useDebounce } from "../../hooks/useDebounce";
import { useSearchUsers } from "../../hooks/useSearchUser";
import ToggleSwitch from "../../components/ui/toggle";
import { useScheduleSession } from "../../context/ScheduleContext";
import { useToast } from "../../hooks/use-toast";
import { graphQLClient } from "../../GraphqlClient";
import { CREATE_MULTIPLE_SCHEDULE_SESSIONS } from "../../graphql/mutation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CustomDatePicker } from "../../components/CustomDatePicker";
import { ErrorMessage } from "../../components/ui/error-message";
import { formatDateLocal, formatTimeDisplay } from "../../lib/utils";

interface FormData {
  clientId: string;
  addressId: string;
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

interface Client {
  id: string | number;
  name: string;
  addresses: Address[];
}

interface Address {
  id: string | number;
  address: string;
  label?: string;
}

interface Shift {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
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

const inputClasses = `
  w-full
  px-3
  py-1
  border
  border-[#d0d4d9]
  rounded-md
  
  font-normal
  focus:outline-none
  focus:ring-2
  focus:ring-[#004175]
  transition
  appearance-none
`;


const getWeekRangeFromDate = (baseDate) => {
  const day = baseDate.getDay();
  const daysSinceThursday = (day + 3) % 7;

  const startOfWeek = new Date(baseDate);
  startOfWeek.setDate(baseDate.getDate() - daysSinceThursday);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return {
    startOfWeek,
    endOfWeek
  };
};

const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesDiffWithWrap = (start, end) => {
  const startM = timeToMinutes(start);
  const endM = timeToMinutes(end);
  let diff = endM - startM;
  if (diff <= 0) diff += 24 * 60;
  return diff;
};

// Helper function to check if two time ranges conflict with a required 1-minute gap
// Non-conflict condition: one ends at least 1 minute before the other starts
// i.e., end1 + 1 <= start2 OR end2 + 1 <= start1
const doTimesOverlap = (start1, end1, start2, end2) => {
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);

  const hasRequiredGap = (end1Minutes + 1 <= start2Minutes) || (end2Minutes + 1 <= start1Minutes);
  return !hasRequiredGap;
};
// Utility function to convert date from YYYY-MM-DD to MM-DD-YYYY
const convertDateFormat = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${month}-${day}-${year}`;
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

// Get unique shift time patterns for a user
const getUniqueShiftTimes = (userId: number, scheduleData: ScheduleItem[]) => {
  const userSchedules = scheduleData.filter(item => item.userId === userId);
  const allShifts = userSchedules.flatMap(schedule => schedule.shifts);

  const uniqueShiftTimes = new Map();
  allShifts.forEach(shift => {
    const key = `${shift.startTime}-${shift.endTime}`;
    if (!uniqueShiftTimes.has(key)) {
      uniqueShiftTimes.set(key, {
        startTime: shift.startTime,
        endTime: shift.endTime,
        hours: shift.hours
      });
    }
  });

  // Sort by start time
  return Array.from(uniqueShiftTimes.values()).sort((a, b) => {
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });
};

// Get shift for specific user, date, and time slot
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

// Calculate total hours for a specific shift time across all days for a user
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

function formatLocalYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatLocalMDY(d: Date): string {
  return `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${d.getFullYear()}`;
}

export const PrepareSchedule = () => {
  const [form, setForm] = useState<FormData>({
    clientId: "",
    addressId: "",
    userId: "",
    date: "",
    starttime: "",
    endtime: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [clientSearch, setClientSearch] = useState("");
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedAddressText, setSelectedAddressText] = useState("");
  const [submitLoader, setSubmitLoader] = useState(false);
  const [auto, setAuto] = useState(false);
  const [publishLoader, setPublishLoader] = useState(false);
  const { createSession, checkClientWeekSchedule } = useScheduleSession();
  const [userSearch, setUserSearch] = useState("");
  const token = localStorage.getItem('token') || '';

  const debouncedUserSearch = useDebounce(userSearch, 300);
  const { data: searchedUsers = [], isLoading: loadingUsers } = useSearchUsers(debouncedUserSearch);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  const [editingId, setEditingId] = useState(null);
  const [currentWeekRange, setCurrentWeekRange] = useState(null);
  const [isPublished, setIsPublished] = useState(false);
  const [showApplyAllDropdown, setShowApplyAllDropdown] = useState(false);
  const [applyToAllDates, setApplyToAllDates] = useState(false);
  const [applyAllWeek, setApplyAllWeek] = useState(false);
  const { toast } = useToast();
  const [hasOverlapError, setHasOverlapError] = useState(false);

  // Client search hook

  const { data: searchedClients = [], isLoading: loadingClients } = useSearchClient(
    debouncedClientSearch,
  );
  // Modal states
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, shiftId: null, userId: null, date: null });
  const [editModal, setEditModal] = useState({ isOpen: false, shift: null, userId: null, date: null });
  const [deleteUserModal, setDeleteUserModal] = useState({ isOpen: false, userId: null });

  // Drag and drop states
  const [draggedShift, setDraggedShift] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);

  const validate = () => {
    const e: { [key: string]: string } = {};
    if (!form.clientId) e.clientId = "Required";
    if (!form.addressId) e.addressId = "Required";
    if (!form.userId) e.userId = "Required";
    if (!form.date) e.date = "Required";
    if (!form.starttime) e.starttime = "Required";
    if (!form.endtime) e.endtime = "Required";

    // Validate minimum duration of 1 minute
    if (form.starttime && form.endtime) {
      const minutes = minutesDiffWithWrap(form.starttime, form.endtime);
      if (minutes < 1) {
        e.endtime = "End time must be at least 1 minute after start time";
      }
    }

    // Check for overlapping shifts
    if (form.userId && form.date && form.starttime && form.endtime) {
      const existingShifts = scheduleData
        .filter(item => item.userId === Number(form.userId) && item.startDate === form.date)
        .flatMap(item => item.shifts);

      const newStartTime = form.starttime;
      const newEndTime = form.endtime;

      for (const shift of existingShifts) {
        if (shift.id === editModal.shift?.id) continue; // Skip current shift when editing

        const existingStart = shift.startTime;
        const existingEnd = shift.endTime;

        // Check if new shift overlaps or touches existing shift (requires 1-minute gap)
        if (doTimesOverlap(newStartTime, newEndTime, shift.startTime, shift.endTime)) {
          e.overlap = "Shift time overlaps with existing shift for this user and date";
          break;
        }
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  useEffect(() => {
    const savedData = localStorage.getItem('scheduleData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setScheduleData(parsedData);
        if (parsedData.length > 0) {
          // Set the week range based on existing data
          const firstDate = new Date(parsedData[0].startDate);
          setCurrentWeekRange(getWeekRangeFromDate(firstDate));

          // Restore client name and address from saved data
          const firstScheduleItem = parsedData[0];
          setClientSearch(firstScheduleItem.clientName || '');
          setSelectedAddressText(firstScheduleItem.address || '');

          // Also restore the form clientId and addressId
          setForm(prevForm => ({
            ...prevForm,
            clientId: String(firstScheduleItem.clientId || ''),
            addressId: String(firstScheduleItem.addressId || '')
          }));
        }
      } catch (error) {
        console.error('Error loading data from localStorage:', error);
      }
    }
  }, []);

  // Control client search - only allow search when no schedule data or published
  useEffect(() => {
    if (scheduleData.length > 0 && !isPublished) {
      // Only clear client search if it's different from the existing client
      const existingClientName = scheduleData[0]?.clientName;
      if (clientSearch && clientSearch !== existingClientName) {
        setClientSearch("");
      }
    }
  }, [scheduleData.length, isPublished, clientSearch]);

  useEffect(() => {
    if (scheduleData.length > 0) {
      localStorage.setItem('scheduleData', JSON.stringify(scheduleData));
    } else {
      // Remove the item from localStorage when scheduleData is empty
      localStorage.removeItem('scheduleData');
    }
  }, [scheduleData]);
  const handleChange = (field: keyof FormData, value: string) => {
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
    if (field === 'date' && value) {
      const selectedDate = new Date(value);
      const weekRange = getWeekRangeFromDate(selectedDate);

      // If there's existing data and it's not published, check if the week is different
      if (scheduleData.length > 0 && !isPublished && currentWeekRange) {
        const existingWeekStart = formatDateLocal(currentWeekRange.startOfWeek);
        const newWeekStart = formatDateLocal(weekRange.startOfWeek);

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

      setCurrentWeekRange(weekRange);
    }
  };

   const handleClientSelect = (
    client: { id: string | number; name: string; lastName:string },
    addressId: number | string
  ) => {
    setForm((f) => ({
      ...f,
      clientId: String(client.id),
      addressId: String(addressId),
    }));
    setClientSearch(client.name);
    setShowClientDropdown(false);
    setErrors((e) => ({ ...e, clientId: undefined, addressId: undefined }));

    const selectedClient = searchedClients.find(
      (c) => String(c.id) === String(client.id)
    );
    const selectedAddress = selectedClient?.addresses.find(
      (a) => String(a.id) === String(addressId)
    );
    setSelectedAddressText(selectedAddress?.address || "");
  };
  const handleUserSelect = (user: User) => {
    setForm((f) => ({ ...f, userId: String(user.id) }));
    setUserSearch(user.name);
    setShowUserDropdown(false);
    setErrors((e) => ({ ...e, userId: undefined, overlap: undefined }));
  };

  const calculateHours = (start, end) => {
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    let hours = endH - startH + (endM - startM) / 60;
    if (hours < 0) hours += 24;
    return parseFloat(hours.toFixed(2));
  };

  const resetForm = () => {
    setForm({
      clientId: "",
      addressId: "",
      userId: "",
      date: "",
      starttime: "",
      endtime: ""
    });
    setClientSearch("");
    setSelectedAddressText("");
    setUserSearch("");
    setAuto(false);
    setErrors({});
    setEditingId(null);
    setCurrentWeekRange(null);
    setScheduleData([]);
    setIsPublished(false);
    setApplyToAllDates(false);
    setApplyAllWeek(false);

    toast({
      title: "Form Reset",
      description: "Form has been reset successfully.",
    });
  };


const generateDateColumns = () => {
  if (!currentWeekRange) return [];

  const dates = [];
  const startDate = new Date(currentWeekRange.startOfWeek);

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    // Use the exact date from the week range (no timezone conversion)
    const dateStr = formatDateLocal(date); // YYYY-MM-DD format

    
    dates.push({
      date: dateStr, // Use exact date to match API
      display: formatLocalMDY(date) // Same date for display
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

  const handleUserAutoToggle = (userId: number, enabled: boolean) => {
    // Update auto setting for specific user's schedules
    setScheduleData(prev => prev.map(item =>
      item.userId === userId ? { ...item, auto: enabled } : item
    ));

    toast({
      title: "Auto Setting Updated",
      description: `Auto setting ${enabled ? 'enabled' : 'disabled'} for user.`,
    });
  };

  const handlePublish = async () => {
    setPublishLoader(true);
    try {
      // Transform data structure for backend
      const backendData = uniqueUsers.map(user => {
        // Get all schedule items for this user
        const userSchedules = scheduleData.filter(item => item.userId === user.id);

        // Get the first schedule item to extract common data
        const firstSchedule = userSchedules[0];

        // Create a map to deduplicate shifts by date and time
        const shiftMap = new Map();

        userSchedules.forEach(schedule => {
          schedule.shifts.forEach(shift => {
            const shiftKey = `${shift.date}-${shift.startTime}-${shift.endTime}`;
            if (!shiftMap.has(shiftKey)) {
              shiftMap.set(shiftKey, {
                date: shift.date.split('-').slice(1).concat(shift.date.split('-')[0]).join('-'), // Convert to MM-DD-YYYY
                startTime: shift.startTime,
                endTime: shift.endTime,
                hours: shift.hours
              });
            }
          });
        });

        // Convert map values to array
        const userShifts = Array.from(shiftMap.values());

        // Calculate total weekly hours for this user
        const weeklyHours = parseFloat(userShifts.reduce((total, shift) => total + shift.hours, 0).toFixed(2));

        return {
          clientId: firstSchedule?.clientId,
          addressId: firstSchedule?.addressId,
          userId: user.id,
          startDate: convertDateFormat(formatDateLocal(currentWeekRange?.startOfWeek)), // Convert to MM-DD-YYYY
          endDate: convertDateFormat(formatDateLocal(currentWeekRange?.endOfWeek)), // Convert to MM-DD-YYYY

          weeklyHours: weeklyHours,
          shifts: userShifts,
          auto: firstSchedule?.auto || false
        };
      });

      console.log('Backend Data Structure:', backendData);

      // Send data to backend
      const response = await graphQLClient.request(
        CREATE_MULTIPLE_SCHEDULE_SESSIONS,
        { input: backendData }, // Variables
        { Authorization: `Bearer ${token}` } // Headers with token
      );

      console.log('Backend Response:', response);

      // Reset everything after successful API call
      setScheduleData([]);
      localStorage.removeItem('scheduleData');
      setIsPublished(false);
      setCurrentWeekRange(null);
      resetForm();

      toast({
        title: "Schedule Published",
        description: "Schedule published successfully! Employees with schedule changes will receive notifications.",
      });
    } catch (err) {
      console.error("Error publishing schedule sessions:", err);

      // Handle specific backend error messages
      let errorMessage = "Failed to publish schedule sessions. Please try again.";

      if (err.response?.errors && err.response.errors.length > 0) {
        const backendError = err.response.errors[0];
        if (backendError.message) {
          errorMessage = backendError.message;
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
    finally {
      setPublishLoader(false);
    }
  };
  const handleCheck = async (
    clientId: string,
    startDate: string,
    addressId: string
  ): Promise<boolean> => {
    try {
      console.log(clientId, addressId, startDate);
      const result = await checkClientWeekSchedule(Number(clientId), startDate, Number(addressId));

      if (result?.overlap === true) {
        toast({ title: "Success", description: result.message }); // ✅ Show toast if no overlap
        return true;
      }

      return false; // ✅ Overlap exists or result is null
    } catch (error) {
      toast({ title: "Error", description: "Error checking schedule overlap.", variant: "destructive" });
      return false;
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitLoader(true);

    try {
      // Get client and user details from the hook data
      const selectedClient = searchedClients.find(c => String(c.id) === form.clientId);
      const selectedAddress = selectedClient?.addresses.find(a => String(a.id) === form.addressId);
      const selectedUser = searchedUsers.find(u => String(u.id) === form.userId);
      const formatedDate = convertDateFormat(form.date);
      const results = await handleCheck(form.clientId, formatedDate, form.addressId);
      if (results) {
        // ✅ If overlap exists, show toast and set error state but don't reset form
        setHasOverlapError(true);
        // toast({
        //   title: "Schedule Overlap Detected",
        //   description: "There is an overlap with existing schedule. Please choose a different date or time.",
        //   variant: "destructive",
        // });
        setSubmitLoader(false);
        return;
      }
      
      // Clear overlap error if no overlap detected
      setHasOverlapError(false);
      let newScheduleItems = [];
      if (applyAllWeek && currentWeekRange) {
        // Add for each day in the week (Thu-Wed)
        const startDate = new Date(currentWeekRange.startOfWeek);
        const updatedScheduleData = [...scheduleData];
        
        for (let i = 0; i < 7; i++) {
          const dateObj = new Date(startDate);
          dateObj.setDate(startDate.getDate() + i);
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
                id: Date.now() + i,
                date: dateStr,
                startTime: form.starttime,
                endTime: form.endtime,
                hours: calculateHours(form.starttime, form.endtime),
              }
            ];
      
            // Sort shifts by time when adding
            updatedScheduleData[existingScheduleIndex] = {
              ...updatedScheduleData[existingScheduleIndex],
              shifts: sortShiftsByTime(newShifts)
            };
          } else {
            // Create new schedule for this day
            newScheduleItems.push({
              id: Date.now() + i,
              clientId: scheduleData[0]?.clientId || Number(form.clientId),
              addressId: scheduleData[0]?.addressId || Number(form.addressId),
              userId: Number(form.userId),
              startDate: dateStr,
              auto,
              shifts: [
                {
                  id: Date.now() + i,
                  date: dateStr,
                  startTime: form.starttime,
                  endTime: form.endtime,
                  hours: calculateHours(form.starttime, form.endtime),
                },
              ],
              clientName: scheduleData[0]?.clientName || selectedClient?.name || "Unknown Client",
              address: scheduleData[0]?.address || selectedAddress?.address || "Unknown Address",
              userName: selectedUser.name,
              userPhone: selectedUser.phone || '',
            });
          }
        }
        
        // Update the schedule data with merged shifts
        setScheduleData(updatedScheduleData);
      } else {
        // Check if user already has a schedule for this date
        const existingScheduleIndex = scheduleData.findIndex(
          item => item.userId === Number(form.userId) && item.startDate === form.date
        );

        if (existingScheduleIndex !== -1) {
          // Add new shift to existing schedule
          const updatedScheduleData = [...scheduleData];
          const newShifts = [
            ...updatedScheduleData[existingScheduleIndex].shifts,
            {
              id: Date.now(),
              date: form.date,
              startTime: form.starttime,
              endTime: form.endtime,
              hours: calculateHours(form.starttime, form.endtime),
            }
          ];

          // Sort shifts by time when adding
          updatedScheduleData[existingScheduleIndex] = {
            ...updatedScheduleData[existingScheduleIndex],
            shifts: sortShiftsByTime(newShifts)
          };
          setScheduleData(updatedScheduleData);
        } else {
          // Create new schedule
          newScheduleItems.push({
            id: Date.now(),
            clientId: Number(form.clientId),
            addressId: Number(form.addressId),
            userId: Number(form.userId),
            startDate: form.date,
            auto,
            shifts: [
              {
                id: Date.now(), // Ensure unique ID for shifts
                date: form.date,
                startTime: form.starttime,
                endTime: form.endtime,
                hours: calculateHours(form.starttime, form.endtime),
              },
            ],
            clientName: selectedClient?.name || "Unknown Client",
            address: selectedAddress?.address || "Unknown Address",
            userName: selectedUser?.name,
            userPhone: selectedUser?.phone || '',
          });
        }
      }

      setScheduleData(prev => [...prev, ...newScheduleItems]);

      if (scheduleData.length === 0) {
        const selectedDate = new Date(form.date);
        setCurrentWeekRange(getWeekRangeFromDate(selectedDate));
      }
      console.log("Schedule Data:", form);
      setForm({
        clientId: form.clientId, // Keep client and address
        addressId: form.addressId,
        userId: "",
        date: "",
        starttime: "",
        endtime: "",
      });
      // Don't reset clientSearch and selectedAddressText
      setUserSearch("");
      setAuto(false);
      setErrors({});
      setApplyAllWeek(false);
      console.log("Schedule Data:", form);
      toast({
        title: "Success",
        description: "Schedule session created successfully!",
      });
    } catch (err) {
      console.error("Error creating schedule session:", err);
      toast({
        title: "Error",
        description: "Failed to create schedule session.",
        variant: "destructive",
      });
    } finally {
      setSubmitLoader(false);
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
    }).filter(item => item.shifts.length > 0)); // Remove items with no shifts

    setDeleteModal({ isOpen: false, shiftId: null, userId: null, date: null });
    toast({
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
    // Pre-fill form with shift data
    setForm({
      clientId: form.clientId,
      addressId: form.addressId,
      userId: String(userId),
      date: date,
      starttime: shift.startTime,
      endtime: shift.endTime,
    });
  };

  const confirmEditShift = () => {
    const { userId, date, shift } = editModal;
    // Time-only validation for edits: min duration and overlap with other shifts
    if (!form.starttime || !form.endtime) return;
    const minutes = minutesDiffWithWrap(form.starttime, form.endtime);
    if (minutes < 1) {
      toast({
        title: "Invalid Time",
        description: "End time must be at least 1 minute after start time",
        variant: "destructive",
      });
      return;
    }
    const existingShifts = scheduleData
      .find(item => item.userId === userId && item.startDate === date)?.shifts || [];
    const hasConflict = existingShifts.some(s => s.id !== shift.id && doTimesOverlap(form.starttime, form.endtime, s.startTime, s.endTime));
    if (hasConflict) {
      toast({
        title: "Overlapping Shift",
        description: "Shift time conflicts with an existing shift for this user and date.",
        variant: "destructive",
      });
      return;
    }
    setScheduleData(prev => prev.map(item => {
      if (item.userId === userId && item.startDate === date) {
        return {
          ...item,
          shifts: item.shifts.map(s =>
            s.id === shift.id
              ? { ...s, startTime: form.starttime, endTime: form.endtime, hours: calculateHours(form.starttime, form.endtime) }
              : s
          )
        };
      }
      return item;
    }));

    setEditModal({ isOpen: false, shift: null, userId: null, date: null });
    // Reset form
    setForm({
      clientId: form.clientId,
      addressId: form.addressId,
      userId: "",
      date: "",
      starttime: "",
      endtime: "",
    });
    setUserSearch("");
    toast({
      title: "Shift Updated",
      description: "Shift has been updated successfully.",
    });
  };

  const cancelEditShift = () => {
    setEditModal({ isOpen: false, shift: null, userId: null, date: null });
    // Reset form
    setForm({
      clientId: form.clientId,
      addressId: form.addressId,
      userId: "",
      date: "",
      starttime: "",
      endtime: "",
    });
    setUserSearch("");
  };

  // Delete all data for a user
  const handleDeleteUser = (userId: number) => {
    setDeleteUserModal({ isOpen: true, userId });
  };

  const confirmDeleteUser = () => {
    const { userId } = deleteUserModal;
    setScheduleData(prev => prev.filter(item => item.userId !== userId));
    setDeleteUserModal({ isOpen: false, userId: null });
    toast({
      title: "User Data Deleted",
      description: "All data for this user has been deleted successfully.",
    });
  };

  const cancelDeleteUser = () => {
    setDeleteUserModal({ isOpen: false, userId: null });
  };

  // Drag and drop handlers - COPY behavior instead of MOVE
  const handleDragStart = (e: React.DragEvent, shift: Shift, sourceUserId: number, sourceDate: string) => {
    setDraggedShift({
      shift,
      sourceUserId,
      sourceDate
    });
    e.dataTransfer.effectAllowed = 'copy'; // Changed from 'move' to 'copy'
  };

  const handleDragOver = (e: React.DragEvent, targetUserId: number, targetDate: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy'; // Changed from 'move' to 'copy'
    setDragOverCell({ userId: targetUserId, date: targetDate });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverCell(null);
  };

  const handleDrop = (e: React.DragEvent, targetUserId: number, targetDate: string) => {
    e.preventDefault();

    if (!draggedShift) return;

    const { shift, sourceUserId, sourceDate } = draggedShift;

    // Don't allow dropping on the same cell
    if (sourceUserId === targetUserId && sourceDate === targetDate) {
      setDraggedShift(null);
      setDragOverCell(null);
      return;
    }

    // Check if target cell already has shifts for this user/date
    const existingSchedule = scheduleData.find(
      item => item.userId === targetUserId && item.startDate === targetDate
    );

    if (existingSchedule) {
      // Check for overlapping shifts
      const hasOverlap = existingSchedule.shifts.some(existingShift => {
        return doTimesOverlap(
          shift.startTime,
          shift.endTime,
          existingShift.startTime,
          existingShift.endTime
        );
      });

      if (hasOverlap) {
        // toast({
        //   title: "Overlapping Shift",
        //   description: "Cannot drop shift here - it overlaps with existing shifts for this user and date.",
        //   variant: "destructive",
        // });
        setDraggedShift(null);
        setDragOverCell(null);
        return;
      }

      // Add shift to existing schedule (copy, don't remove original)
      setScheduleData(prev => prev.map(item => {
        if (item.userId === targetUserId && item.startDate === targetDate) {
          return {
            ...item,
            shifts: sortShiftsByTime([...item.shifts, { ...shift, id: Date.now(), date: targetDate }])
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

    toast({
      title: "Shift Copied",
      description: "Shift has been copied successfully.",
    });
  };

  const handleDragEnd = () => {
    setDraggedShift(null);
    setDragOverCell(null);
  };

  const toYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  return (
    <div className="min-h-screen font-sans w-full p-6">
      <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100">
        <h2
          style={{
            fontFamily:
              'system-ui, ui-sans-serif, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
            fontWeight: 600,
            fontSize: '20px',
            lineHeight: '28px',
            color: 'rgb(0, 0, 0)',
          }}
          className="mb-2"
        >
          Prepare Schedule
        </h2>

        <form onSubmit={onSubmit} autoComplete="off">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-start">

            {/* Client Search */}
                                  <div className="relative">
  <input
    type="text"
    value={clientSearch}
    onFocus={() => setShowClientDropdown(true)}
    onBlur={() =>
      setTimeout(() => setShowClientDropdown(false), 200)
    }
    onChange={(e) => {
      setClientSearch(e.target.value);
      setForm((f) => ({ ...f, clientId: "", addressId: "" }));
      setSelectedAddressText("");
    }}
    placeholder="Client Name"
    className={inputClasses}
  />
  {errors.clientId && (
    <ErrorMessage message={errors.clientId} />
  )}

  {showClientDropdown && clientSearch.length >= 2 && (
    <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto z-50 font-sans">
      {loadingClients ? (
        <div className="p-2 text-sm text-gray-500">
          Searching clients...
        </div>
      ) : searchedClients.length === 0 ? (
        <div className="p-2 text-gray-500 text-sm">
          No clients found
        </div>
      ) : (
        searchedClients.flatMap((client, clientIndex) =>
          client.addresses.map((address, addressIndex) => {
            const isEven = (clientIndex + addressIndex) % 2 === 0;
            
            // Generate initials from first letter of name and lastName
            const initials = `${client.name
                          .charAt(0)
                          .toUpperCase()}${client.lastName
                            ? client.lastName.charAt(0).toUpperCase()
                            : ''}`;
            
            return (
              <div
                key={`${client.id}-${address.id}`}
                onMouseDown={() =>
                  handleClientSelect(
                    { id: client.id, name: client.name, lastName: client.lastName },
                    address.id
                  )
                }
                className={`p-3 cursor-pointer flex items-center space-x-3 ${
                  isEven ? "bg-white" : "bg-gray-50"
                } hover:bg-gray-100 transition-colors duration-150`}
              >
                {/* Circular Avatar with Initials */}
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-medium">
                    {initials}
                  </span>
                </div>
                
                {/* Client Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-blue-800 text-sm truncate">
                    {`${client.name} ${client.lastName}`}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {address.label || address.address}
                  </div>
                </div>
              </div>
            );
          })
        )
      )}
    </div>
  )}
</div>
            <div>
              <input
                type="text"
                value={selectedAddressText}
                placeholder="Location"
                readOnly
                className={`${inputClasses} ${scheduleData.length > 0 && !isPublished && selectedAddressText !== scheduleData[0]?.address ? 'bg-gray-100' : ''}`}
              />
              {errors.addressId && (
                <ErrorMessage message={errors.addressId} />
              )}

            </div>

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
                placeholder="User Name"
                className={inputClasses}
              />
              {errors.userId && (
                <ErrorMessage message={errors.userId} />
              )}
              {showUserDropdown && userSearch.length >= 2 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50 font-sans">
                  {loadingUsers ? (
                    <div className="p-2 text-sm text-gray-500">Searching users...</div>
                  ) : searchedUsers.length === 0 ? (
                    <div className="p-2 text-gray-500 text-sm">No users found</div>
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
            <div className="flex items-center flex-col">
            <div className="flex items-center flex-row w-full ">
            <CustomDatePicker
                value={form.date}
                onChange={handleChange}
                placeholder="Select Date"
                className={`${inputClasses} ${form.date ? "text-black" : "text-gray-500"} `}
                minDate={currentWeekRange ? formatDateLocal(currentWeekRange.startOfWeek) : undefined}
                maxDate={currentWeekRange ? formatDateLocal(currentWeekRange.endOfWeek) : undefined}

              />
              
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
              {errors.date && (
                <ErrorMessage message={errors.date} />
              )}
            </div>

            <div>
              <input
                type={form.starttime ? "time" : "text"}
                value={form.starttime}
                onChange={(e) => handleChange("starttime", e.target.value)}
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
                <ErrorMessage message={errors.starttime} />
              )}
            </div>
            <div>
              <input
                type={form.endtime ? "time" : "text"}
                value={form.endtime}
                onChange={(e) => handleChange("endtime", e.target.value)}
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
                <ErrorMessage message={errors.endtime} />
              )}
              {errors.overlap && (
                <ErrorMessage message={errors.overlap} />
              )}
            </div>
            <div className="flex items-center">
              <ToggleSwitch enabled={auto} onToggle={setAuto} label="Auto" />
            </div>

            <div className="flex gap-2 justify-start">
              <button
                type="submit"
                disabled={submitLoader}
                className="inline-flex items-center px-4 py-1 border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 disabled:cursor-not-allowed font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
              >
                {submitLoader ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </>
                )}
              </button>
              {(form.date || form.starttime || form.endtime || form.userId || form.addressId || form.clientId || auto) && (
                <button
                  type="button"
                  onClick={resetForm}
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

      {scheduleData.length > 0 && (
        <div className="w-full mt-2">
          <div className="relative w-full rounded-2xl border border-gray-200 shadow-xl">
            <div className="w-full overflow-auto rounded-2xl" style={{ maxHeight: "600px" }}>
              {/* Client Info */}
              <div className="p-4 border-b bg-gray-50">
                <div className="font-medium text-gray-800">
                  {scheduleData[0]?.clientName || 'Client Name'}
                </div>
                <div className="text-sm text-gray-600">
                  {scheduleData[0]?.address || 'Address'}
                </div>
              </div>

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
                    const userShiftTimes = getUniqueShiftTimes(user.id, scheduleData);
                    const rowCount = userShiftTimes.length;

                    return (
                      <React.Fragment key={user.id}>
                        {userShiftTimes.map((shiftTime, shiftIndex) => (
                          <tr
                            key={`${user.id}-${shiftTime.startTime}-${shiftTime.endTime}`}
                            className={`hover:bg-blue-50 transition-colors ${(userIndex * rowCount + shiftIndex) % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                              }`}
                          >
                            {shiftIndex === 0 && (
                              <td
                                className="border border-gray-300 px-4 py-3 text-center align-middle whitespace-nowrap"
                                rowSpan={rowCount}
                              >
                                <div className="font-medium text-gray-800">{user.name}</div>
                                <div className="text-xs text-gray-500">{user.phone}</div>
                              </td>
                            )}
                            {dateColumns.map(dateCol => {
                              const shift = getShiftForUserDateAndTime(
                                user.id,
                                dateCol.date,
                                shiftTime.startTime,
                                shiftTime.endTime,
                                scheduleData
                              );
                              return (
                                <td
                                  key={dateCol.date}
                                  className={`border border-gray-300 px-4 py-3 text-center text-sm whitespace-nowrap ${dragOverCell?.userId === user.id && dragOverCell?.date === dateCol.date
                                    ? 'bg-blue-50 border-blue-300'
                                    : ''
                                    }`}
                                  onDragOver={(e) => handleDragOver(e, user.id, dateCol.date)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, user.id, dateCol.date)}
                                >
                                  {shift ? (
                                    <div className="relative group">
                                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity mb-1 justify-center">
                                        <div
                                          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, shift, user.id, dateCol.date)}
                                          onDragEnd={handleDragEnd}
                                        >
                                          <GripVertical className="w-3 h-3" />
                                        </div>
                                        <button
                                          onClick={() => handleEditShift(user.id, dateCol.date, shift)}
                                          className="text-blue-600 hover:text-blue-800 p-0.5"
                                          title="Edit shift"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteShift(user.id, dateCol.date, shift.id)}
                                          className="text-red-600 hover:text-red-800 p-0.5"
                                          title="Delete shift"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                      <span className="text-sm">{shift.startTime} - {formatTimeDisplay(shift.endTime)}</span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="border border-gray-300 px-4 py-3 text-center font-medium whitespace-nowrap">
                              {calculateShiftTimeTotal(user.id, shiftTime.startTime, shiftTime.endTime, scheduleData, dateColumns)}
                            </td>
                            {shiftIndex === 0 && (
                              <td
                                className="border border-gray-300 px-4 py-3 text-center w-16 align-middle whitespace-nowrap"
                                rowSpan={rowCount}
                              >
                                <div className="flex items-center justify-center">
                                  <ToggleSwitch
                                    enabled={scheduleData.find(item => item.userId === user.id)?.auto || false}
                                    onToggle={(enabled) => handleUserAutoToggle(user.id, enabled)}
                                  />
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                        {/* User Total Row */}
                        <tr className={`transition-colors ${(userIndex * 2 + 1) % 2 === 0 ? 'bg-gray-100' : 'bg-gray-200'
                          }`}>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center whitespace-nowrap">
                            Total
                          </td>
                          {dateColumns.map(dateCol => {
                            const daySchedules = scheduleData.filter(item =>
                              item.userId === user.id && item.startDate === dateCol.date
                            );
                            const dayTotal = daySchedules.reduce((total, schedule) =>
                              total + schedule.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0
                            );
                            const roundedDayTotal = parseFloat(dayTotal.toFixed(2));
                            return (
                              <td key={dateCol.date} className="border border-gray-300 px-4 py-3 text-center text-sm font-medium whitespace-nowrap">
                                {roundedDayTotal > 0 ? roundedDayTotal : '-'}
                              </td>
                            );
                          })}
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium whitespace-nowrap">
                            {calculateUserTotal(user.id)}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Delete all data for this user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

            {/* Publish Button */}
            <div className="p-4 border-t bg-white">
              <button
                onClick={handlePublish}
                className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                disabled={isPublished || publishLoader}
              >
                {publishLoader ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block" />
                    Publishing...
                  </>
                ) : (
                  isPublished ? 'Published' : 'Publish'
                )}
              </button>
              <p className="text-sm text-gray-600 mt-2">
                Employees who had change in the schedule should get "Your schedule has been updated!" notification after Publish is clicked.
              </p>
            </div>
          </div>
        </div>
      )}

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
                  value={form.starttime}
                  onChange={(e) => setForm(prev => ({ ...prev, starttime: e.target.value }))}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={form.endtime}
                  onChange={(e) => setForm(prev => ({ ...prev, endtime: e.target.value }))}
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
import React, { useEffect, useState, useRef } from "react";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { GoPlus } from "react-icons/go";
import { RotateCcw, GripVertical, Calendar, Send } from "lucide-react";
import { useSearchClient } from "../../hooks/usesearchClient";
import { useDebounce } from "../../hooks/useDebounce";
import { useSearchUsers } from "../../hooks/useSearchUser";
import ToggleSwitch from "../../components/ui/toggle";
import { useScheduleSession } from "../../context/ScheduleContext";
import { ScheduleTable } from "../../components/ScheduleTable";
import { Button } from "../../components/ui/button";
import { inputClasses } from "../../pages/Admin/GeoLocationSetup";
// Local utility functions
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
  // Convert times to ranges in minutes, handling wrap-around
  const toRanges = (s: string, e: string): Array<[number, number]> => {
    const ss = timeToMinutes(s);
    const ee = timeToMinutes(e);
    if (ss === ee) return [[0, 24 * 60]];
    if (ee > ss) return [[ss, ee]];
    return [[ss, 24 * 60], [0, ee]];
  };

  const ranges1 = toRanges(start1, end1);
  const ranges2 = toRanges(start2, end2);

  for (const a of ranges1) {
    for (const b of ranges2) {
      const aStart = a[0], aEnd = a[1];
      const bStart = b[0], bEnd = b[1];
      // if start1===end1 or start2===end2, they cover full day and always overlap
      if (aStart === aEnd || bStart === bEnd) return true;
      const hasRequiredGap = (aEnd + 1 <= bStart) || (bEnd + 1 <= aStart);
      if (!hasRequiredGap) return true;
    }
  }
  return false;
};

const convertDateFormat = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${month}-${day}-${year}`;
};

const sortShiftsByTime = (shifts: Shift[]) => {
  return [...shifts].sort((a, b) => {
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });
};

const calculateHours = (start: string, end: string) => {
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  if(startH === endH && startM === endM) return 24;
  let hours = endH - startH + (endM - startM) / 60;
  if (hours < 0) hours += 24;
  return parseFloat(hours.toFixed(2));
};

const generateDateColumns = (currentWeekRange: any) => {
  if (!currentWeekRange) return [];

  const dates = [];
  const startDate = new Date(currentWeekRange.startOfWeek);

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    const dateStr = formatDateLocal(date);
    dates.push({
      date: dateStr,
      display: `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`
    });
  }
  return dates;
};

const getUniqueUsers = (scheduleData: ScheduleItem[]) => {
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

// Local type definitions for PrepareSchedule
interface Shift {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
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
import { graphQLClient } from "../../GraphqlClient";
import { CREATE_MULTIPLE_SCHEDULE_SESSIONS } from "../../graphql/mutation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CustomDatePicker } from "../../components/CustomDatePicker";
import { ErrorMessage } from "../../components/ui/error-message";
import { SearchResultItem, SearchResultsDropdown } from "../../components/ui/search-result-item";
import { formatDateLocal, getWeekRangeFromDateLocal, getWeekRangeFromDateUTC, parseLocalYMD } from "../../lib/utils";
import { useToast } from "../../hooks/use-toast";
import ResetButton from "../../components/ui/ResetButton";

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


export const PrepareSchedule = () => {
  const { toast } = useToast();
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

  const debouncedUserSearch = useDebounce(userSearch, 300);
  const { data: searchedUsers = [], isLoading: loadingUsers } = useSearchUsers(debouncedUserSearch);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  const [editingId, setEditingId] = useState(null);
  const [currentWeekRange, setCurrentWeekRange] = useState(null);
  const [isPublished, setIsPublished] = useState(false);
  const [selectedUserPhone, setSelectedUserPhone] = useState("");
  const [showApplyAllDropdown, setShowApplyAllDropdown] = useState(false);
  const [applyToAllDates, setApplyToAllDates] = useState(false);
  const [applyAllWeek, setApplyAllWeek] = useState(false);
  const [hasOverlapError, setHasOverlapError] = useState(false);

  // Publish confirmation modal
  const [publishModal, setPublishModal] = useState({ isOpen: false });
  const checkScheduleSessionIdRef = useRef<number | null>(null);

  const [existingShifts, setExistingShifts] = useState<Shift[]>([]);

  // Client search hook

  const { data: searchedClients = [], isLoading: loadingClients } = useSearchClient(
    debouncedClientSearch,
  );




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
        // Skip validation for editing since the main component handles it
        // if (shift.id === editingShiftId) continue; // Only skip if editing this specific shift

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
    const savedData = sessionStorage.getItem('scheduleData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setScheduleData(parsedData);
        if (parsedData.length > 0) {
          // Set the week range based on existing data
          const firstDate = parseLocalYMD(parsedData[0].startDate);
          setCurrentWeekRange(getWeekRangeFromDateLocal(firstDate));

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

  // Keep client name visible when schedule data exists - don't clear it
  // This effect is removed to prevent clearing the client name

  useEffect(() => {
    if (scheduleData.length > 0) {
      sessionStorage.setItem('scheduleData', JSON.stringify(scheduleData));
    } else {
      // Remove the item from localStorage when scheduleData is empty
      sessionStorage.removeItem('scheduleData');
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
      const selectedDate = parseLocalYMD(value);
      const weekRange = getWeekRangeFromDateLocal(selectedDate);

      // If there's existing data and it's not published, check if the week is different
      if (scheduleData.length > 0 && !isPublished && currentWeekRange) {
        const existingWeekStart = formatDateLocal(currentWeekRange.startOfWeek);
        const newWeekStart = formatDateLocal(weekRange.startOfWeek);

        if (existingWeekStart !== newWeekStart) {
          toast({
            title: "Error",
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
    client: { id: string | number; name: string; lastName: string },
    addressId: number | string
  ) => {
    setForm((f) => ({
      ...f,
      clientId: String(client.id),
      addressId: String(addressId),
    }));
    const fullClientName = [client.name, client.lastName].filter(Boolean).join(" ");
    setClientSearch(fullClientName);
    setShowClientDropdown(false);
    setErrors((e) => ({ ...e, clientId: undefined, addressId: undefined }));

    const selectedClient = searchedClients.find(
      (c) => String(c.id) === String(client.id)
    );
    const selectedAddress = selectedClient?.addresses.find(
      (a) => String(a.id) === String(addressId)
    );
    const fullAddress = [
      selectedAddress?.label || selectedAddress?.address,
      (selectedAddress as any)?.city,
      (selectedAddress as any)?.state,
      (selectedAddress as any)?.pincode,
    ].filter(Boolean).join(", ");
    setSelectedAddressText(fullAddress);
  };
  const handleUserSelect = (user: User) => {
    setForm((f) => ({ ...f, userId: String(user.id) }));
    const fullName = [user.name, (user as any)?.lastName].filter(Boolean).join(" ");
    setUserSearch(fullName || user.name);
    setSelectedUserPhone((user as any)?.phone || "");
    setShowUserDropdown(false);
    setErrors((e) => ({ ...e, userId: undefined, overlap: undefined }));
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
    setSelectedUserPhone("");
    setAuto(false);
    setErrors({});
    setEditingId(null);
    setCurrentWeekRange(null);
    setScheduleData([]);
    setIsPublished(false);
    setApplyToAllDates(false);
    setApplyAllWeek(false);

    toast({
      title: "Success",
      description: "Form has been reset successfully.",
    });
  };

  const dateColumns = generateDateColumns(currentWeekRange);

  // Get unique users from schedule data
  const uniqueUsers = getUniqueUsers(scheduleData);

// Updated handleUserAutoToggle - updates user's schedule and all their shifts
const handleUserAutoToggle = (userId: number, enabled: boolean) => {
  setScheduleData(prev => prev.map(item => {
    if (item.userId === userId) {
      return {
        ...item,
        auto: enabled,
        shifts: item.shifts.map(shift => ({ ...shift, auto: enabled }))
      };
    }
    return item;
  }));

  toast({
    title: "Success",
    description: `Auto setting ${enabled ? 'enabled' : 'disabled'} for user.`,
  });
};

// Updated handleShiftAutoToggle - updates individual shift and schedule auto with proper logic
const handleShiftAutoToggle = (userId: number, date: string, shiftId: number, enabled: boolean) => {
  setScheduleData(prev => prev.map(item => {
    if (item.userId === userId && item.startDate === date) {
      const updatedShifts = item.shifts.map(s => 
        s.id === shiftId ? { ...s, auto: enabled } : s
      );
      
      // Logic for schedule auto:
      let scheduleAuto;
      if (enabled) {
        // When enabling a shift, always enable schedule auto (or keep it enabled if already enabled)
        scheduleAuto = true;
      } else {
        // When disabling a shift, check if any other shifts still have auto enabled
        scheduleAuto = updatedShifts.some(shift => shift.auto === true);
      }
      
      return {
        ...item,
        auto: scheduleAuto,
        shifts: updatedShifts
      };
    }
    return item;
  }));
};

// Add back the handleScheduleAutoToggle function for table-level auto control
const handleScheduleAutoToggle = (enabled: boolean) => {
  setScheduleData(prev => prev.map(item => ({
    ...item,
    auto: enabled,
    shifts: item.shifts.map(shift => ({ ...shift, auto: enabled }))
  })));

  toast({
    title: "Success",
    description: `Schedule auto setting ${enabled ? 'enabled' : 'disabled'} for all users and shifts.`,
  });
};

  const handlePublish = async () => {
    setPublishModal({ isOpen: true });
  };

  const confirmPublish = async () => {
    setPublishLoader(true);
    try {
      // Get fresh token for each request
      const freshToken = sessionStorage.getItem('token');
      if (!freshToken) {
        toast({
          title: "Error",
          description: "Authentication token not found. Please log in again.",
          variant: "destructive",
        });
        setPublishLoader(false);
        return;
      }

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
                hours: shift.hours,
                auto: shift.auto ?? null
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
        { Authorization: `Bearer ${freshToken}` } // Headers with token
      );

      console.log('Backend Response:', response);

      // Reset everything after successful API call
      setScheduleData([]);
      sessionStorage.removeItem('scheduleData');
      setIsPublished(false);
      setCurrentWeekRange(null);
      resetForm();

      // Close the modal
      setPublishModal({ isOpen: false });

      toast({
        title: "Success",
        description: "Schedule published successfully! Employees with schedule changes will receive notifications.",
      });
    } catch (err: any) {
      console.error("Error publishing schedule sessions:", err);

      // Handle different types of errors
      let errorMessage = "Failed to publish schedule sessions. Please try again.";

      if (err.message) {
        if (err.message.includes("Network Error") || err.message.includes("fetch")) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else if (err.response?.errors && err.response.errors.length > 0) {
          const backendError = err.response.errors[0];
          if (backendError.message) {
            errorMessage = backendError.message;
          }
        } else {
          errorMessage = err.message;
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      // Close modal on error
      setPublishModal({ isOpen: false });
    }
    finally {
      setPublishLoader(false);
    }
  };

  const cancelPublish = () => {
    setPublishModal({ isOpen: false });
  };

  // add a variable to hold id (todo marker above it)
  // TODO: use this id later when creating/publishing sessions
  let checkScheduleSessionId: number | null = null;

  // update handleCheck signature and logic
  const handleCheck = async (
    clientId: string,
    addressId: string,
    userId: string,
    startDate: string
  ): Promise<any> => {
    try {
      const result = await checkClientWeekSchedule(
        Number(clientId),
        startDate,
        Number(addressId),
        Number(userId),
        "prepare" // type parameter for prepare schedule
      );

      // message === null -> allowed (same as previous overlap === true)
      if (result ) {
        checkScheduleSessionIdRef.current = result.id ?? null; // store id for later use
        setExistingShifts(result.shifts);
        console.log("Existing Shifts:", JSON.stringify(result.shifts));
        return result; // Return the full result object
      }
    
      // message present -> blocked; show server message
      if (result?.message) {
        // Check if it's an assignment not found error
        if (result.message.includes("Assignment not found")) {
          toast({
            title: "Assignment Required",
            description: "This user is not assigned to this client and address. Please create an assignment first in the Assignment section.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: result.message,
            variant: "destructive",
          });
        }
        return null;
      }
      return null;
    } catch (error: any) {
      // Handle GraphQL error response format
      if (error.response?.errors && error.response.errors.length > 0) {
        const graphQLError = error.response.errors[0];
        const errorMessage = graphQLError.message || "Unknown error occurred";

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        // Handle other types of errors
        toast({
          title: "Error",
          description: "Error checking schedule overlap.",
          variant: "destructive",
        });
      }
      return null;
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
      const formatedDate = formatDateUTC(new Date(form.date));
      const results = await handleCheck(form.clientId, form.addressId, form.userId, formatedDate);
      if (results === null) {
        setHasOverlapError(true);
        setSubmitLoader(false);
        return;
      }
      
      // Get existing shifts from the results
      const currentExistingShifts = results?.shifts || [];
      console.log("Results from handleCheck:", JSON.stringify(results));
      console.log("Current existing shifts:", JSON.stringify(currentExistingShifts));
      
      // OK → proceed
      setHasOverlapError(false);
      
      // Check for local overlap before proceeding
      const localOverlap = scheduleData
        .filter(item => item.userId === Number(form.userId) && item.startDate === form.date)
        .flatMap(item => item.shifts)
        .some(shift => {
          return doTimesOverlap(form.starttime, form.endtime, shift.startTime, shift.endTime);
        });
      
      if (localOverlap) {
        toast({
          title: "Overlapping Shift",
          description: "Shift time overlaps with existing local shift for this user and date",
          variant: "destructive",
        });
        setSubmitLoader(false);
        return;
      }
      
      let newScheduleItems = [];
      if (applyAllWeek && currentWeekRange) {
        // Add for each day in the week (Thu-Wed)
        const startDate = new Date(currentWeekRange.startOfWeek);
        const updatedScheduleData = [...scheduleData];
        for (let i = 0; i < 7; i++) {
        
          const dateObj = new Date(startDate);
          dateObj.setDate(startDate.getDate() + i);
          const dateStr = formatDateLocal(dateObj);
          
          // Check if shift overlaps with server-side existing shifts
          const serverOverlap = currentExistingShifts.some(shift => {
            const shiftDateStr = shift.date.includes('T') ? shift.date.split('T')[0] : shift.date;
            const dateMatch = shiftDateStr === dateStr;
            const timeOverlap = form.starttime < shift.endTime && form.endtime > shift.startTime;
            return dateMatch && timeOverlap;
          });
          
          // Check if shift overlaps with local existing shifts
          const localOverlap = scheduleData
            .filter(item => item.userId === Number(form.userId) && item.startDate === dateStr)
            .flatMap(item => item.shifts)
            .some(shift => {
              return doTimesOverlap(form.starttime, form.endtime, shift.startTime, shift.endTime);
            });
          
          if (serverOverlap || localOverlap){
            toast({
              title: "Overlapping Shift",
              description: "Shift time overlaps with existing shift for this user and date",
              variant: "destructive",
            });
            continue; // Skip overlapping shifts
          }
          
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
                auto: auto,
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
                  auto: auto,
                },
              ],
              clientName: scheduleData[0]?.clientName
              || clientSearch
              || [selectedClient?.name, selectedClient?.lastName].filter(Boolean).join(' ')
              || "Unknown Client",
              address: scheduleData[0]?.address || selectedAddressText || selectedAddress?.address || "Unknown Address",
              userName: userSearch || selectedUser?.name || "Unknown User",
              userPhone: selectedUserPhone || selectedUser?.phone || '',
            
          });
          }
        }

        // Update the schedule data with merged shifts
        setScheduleData(updatedScheduleData);
      } else {
        // Check if shift overlaps with server-side existing shifts
        const serverOverlap = currentExistingShifts.some(shift => {
          const shiftDateStr = shift.date.includes('T') ? shift.date.split('T')[0] : shift.date;
          const dateMatch = shiftDateStr === form.date;
          const timeOverlap = form.starttime < shift.endTime && form.endtime > shift.startTime;
          return dateMatch && timeOverlap;
        });
        
        // Check if shift overlaps with local existing shifts
        const localOverlap = scheduleData
          .filter(item => item.userId === Number(form.userId) && item.startDate === form.date)
          .flatMap(item => item.shifts)
          .some(shift => {
            return doTimesOverlap(form.starttime, form.endtime, shift.startTime, shift.endTime);
          });
        
        if (serverOverlap || localOverlap) {
          toast({
            title: "Overlapping Shift",
            description: "Shift time overlaps with existing shift for this user and date",
            variant: "destructive",
          });
          setSubmitLoader(false);
          return; // Skip if overlapping
        }
        
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
              auto: auto,
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
                auto: auto,
              },
            ],
            clientName: clientSearch
            || [selectedClient?.name, selectedClient?.lastName].filter(Boolean).join(' ')
            || "Unknown Client",
          address: selectedAddressText || selectedAddress?.address || "Unknown Address",
          userName: userSearch || selectedUser?.name || "Unknown User",
          userPhone: selectedUserPhone || selectedUser?.phone || '',
          });
        }
      }

      setScheduleData(prev => [...prev, ...newScheduleItems]);

      if (scheduleData.length === 0) {
        const selectedDate = parseLocalYMD(form.date);
        setCurrentWeekRange(getWeekRangeFromDateLocal(selectedDate));
      }
      console.log("Schedule Data:", form);
      setForm({
        clientId: form.clientId,
        addressId: form.addressId,
        userId: "",
        date: "",
        starttime: "",
        endtime: "",
      });
      // Don't reset clientSearch and selectedAddressText
      setUserSearch("");
      // Only reset auto if there's no existing schedule data
      if (scheduleData.length === 0) {
        setAuto(false);
      }
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

  const formatDateUTC = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

  return (
    <div className="min-h-screen font-sans w-full p-6">
      <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 space-y-2 grid">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2 items-start">

            {/* Client Search */}
            <div className="relative">
              <input
                type="text"
                value={clientSearch}
                disabled={scheduleData.length > 0 && !isPublished}
                onFocus={() => {
                  if (scheduleData.length === 0 || isPublished) {
                    setShowClientDropdown(true);
                  }
                }}
                onBlur={() =>
                  setTimeout(() => setShowClientDropdown(false), 200)
                }
                onChange={(e) => {
                  if (scheduleData.length === 0 || isPublished) {
                    setClientSearch(e.target.value);
                    setForm((f) => ({ ...f, clientId: "", addressId: "" }));
                    setSelectedAddressText("");
                  }
                }}
                placeholder="Client Name"
                className={`${inputClasses} ${scheduleData.length > 0 && !isPublished ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
              />
              {errors.clientId && (
                <ErrorMessage message={errors.clientId} />
              )}

              <SearchResultsDropdown show={showClientDropdown && clientSearch.length >= 1 && scheduleData.length === 0}>
                {loadingClients ? (
                  <div className="p-2 text-sm text-gray-500">Searching clients...</div>
                ) : searchedClients.length === 0 ? (
                  <div className="p-2 text-gray-500 text-sm">No clients found</div>
                ) : (
                  searchedClients.flatMap((client, clientIndex) =>
                    client.addresses.map((address, addressIndex) => (
                      <SearchResultItem
                        key={`${client.id}-${address.id}`}
                        index={clientIndex + addressIndex}
                        primaryText={[client.name, client.lastName].filter(Boolean).join(' ')}
                        secondaryText={[
                          address.label || address.address,
                          (address as any)?.city,
                          (address as any)?.state,
                          (address as any)?.pincode,
                        ].filter(Boolean).join(', ')}
                        initials={`${client.name?.[0]?.toUpperCase() ?? ''}${client.lastName ? client.lastName[0]?.toUpperCase() : ''}`}
                        onSelect={() =>
                          handleClientSelect(
                            { id: client.id, name: client.name, lastName: client.lastName },
                            address.id
                          )
                        }
                      />
                    ))
                  )
                )}
              </SearchResultsDropdown>
            </div>
            <div>
              <input
                type="text"
                value={selectedAddressText}
                placeholder="Location"
                readOnly
                className={`${inputClasses} ${scheduleData.length > 0 && !isPublished  ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
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
                className={`${inputClasses} `}
              />
              {errors.userId && (
                <ErrorMessage message={errors.userId} />
              )}
              <SearchResultsDropdown show={showUserDropdown && userSearch.length >= 1}>
                {loadingUsers ? (
                  <div className="p-2 text-sm text-gray-500">Searching users...</div>
                ) : searchedUsers.length === 0 ? (
                  <div className="p-2 text-gray-500 text-sm">No users found</div>
                ) : (
                  searchedUsers.map((user, idx) => {
                    const fullName = [user.name, (user as any)?.lastName].filter(Boolean).join(" ");
                    const fullAddressParts = [
                      (user as any)?.address,
                      (user as any)?.city,
                      (user as any)?.state,
                      (user as any)?.zipcode,
                    ].filter(Boolean);
                    const fullAddress = fullAddressParts.join(", ");
                    return (
                      <SearchResultItem
                        key={user.id}
                        index={idx}
                        primaryText={fullName || user.name}
                        secondaryText={fullAddress}
                        onSelect={() => handleUserSelect(user)}
                      />
                    );
                  })
                )}
              </SearchResultsDropdown>
            </div>
            <div className="flex items-center flex-col">
              <div className="flex items-center flex-row w-full ">
                <CustomDatePicker
                  value={form.date}
                  onChange={handleChange}
                  placeholder="Select Date"
                  className={`${inputClasses} ${form.date ? "text-black" : "text-gray-500"} `}
                // minDate={currentWeekRange ? formatDateLocal(currentWeekRange.startOfWeek) : undefined}
                // maxDate={currentWeekRange ? formatDateLocal(currentWeekRange.endOfWeek) : undefined}
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
                      ? "text-sm font-medium text-gray-700"
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
              <ToggleSwitch size="big" enabled={auto} onToggle={setAuto} label="Auto" />
            </div>

            <div className="flex gap-2 justify-start">
              <Button
                type="submit"
                disabled={submitLoader}
                variant="outline"
              >
                {submitLoader ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  <>
                    <GoPlus className="w-4 h-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
              {(form.date || form.starttime || form.endtime || form.userId || form.addressId || form.clientId || auto) && (
                // <Button
                //   type="button"
                //   onClick={resetForm}
                //   variant="secondary"
                // >
                //   <RotateCcw className="w-4 h-4 mr-1" />
                //   Reset
                // </Button>
                <ResetButton
                onClick={resetForm}
                confirmTitle="Confirm Reset"
                confirmMessage="This will clear the form. Proceed?"
                />
              )}
            </div>
          </div>
        </form>
      </div>

      {scheduleData.length > 0 && (
        <div className="w-full mt-2">
          {/* Client Info */}
          <div className="p-4 border-b bg-gray-50 rounded-t-2xl border border-gray-200 shadow-xl">
            <div className="font-medium text-gray-800">
              {scheduleData[0]?.clientName || 'Client Name'}
            </div>
            <div className="text-sm text-gray-600">
              {scheduleData[0]?.address || 'Address'}
            </div>
          </div>

          {/* ScheduleTable Component */}
          <ScheduleTable
            scheduleData={scheduleData}
            sessionData={[]}
            selectedDate={form.date || ''}
            currentWeekRange={currentWeekRange}
            isEditMode={true}
            onScheduleDataChange={setScheduleData}
            onPublish={handlePublish}
            onPrint={() => { }}
            onDownloadExcel={() => { }}
            onToggleEditMode={() => { }}
            isPublishing={publishLoader}
            isPrinting={false}
            readOnly={false}
            loading={false}
            onUserAutoToggle={handleUserAutoToggle}
            onShiftAutoToggle={handleShiftAutoToggle}
            onScheduleAutoToggle={handleScheduleAutoToggle}
            hideActionButtons={true}
            existingShifts={existingShifts}
            hasChanges={true}
          />
        </div>
      )}

      {/* Publish Confirmation Modal */}
      {publishModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you
                would like to save
                changes?
              </p>
            </div>

            <div className="flex space-x-3 justify-end">
              <Button
                type="button"
                onClick={cancelPublish}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmPublish}
                disabled={publishLoader}
                variant="primary"
                className="flex items-center"
              >
                {publishLoader ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publish Schedule
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
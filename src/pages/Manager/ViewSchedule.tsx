import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClientSessions } from "../../context/ViewSchedule";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import { ScheduleTable } from "../../components/ScheduleTable";
import { ActualTimeTable } from "../../components/ActualTimeTable";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { FiEye } from "react-icons/fi";
import { GoPlus } from "react-icons/go";
import { RotateCcw, Calendar, ChevronLeft, ChevronRight, Send } from "lucide-react";
import ToggleSwitch from "../../components/ui/toggle";
import { useToast } from "../../hooks/use-toast";
import { generateScheduleStyledExcel } from "../../utils/excel/excelGenerators";

import { useSearchUsers } from "../../hooks/useSearchUser";
import { SearchResultItem, SearchResultsDropdown } from "../../components/ui/search-result-item";
import { useDebounce } from "../../hooks/useDebounce";
import { CustomDatePicker } from "../../components/CustomDatePicker"; // use shared component
import { formatDateLocal, getWeekRangeFromDateLocal, toLocalYMD, parseLocalYMD, formatUSPhone } from "../../lib/utils";
import {
  generateSchedulePrintableTable,
  generateActualTimePrintableTable,
  handlePrint
} from "../../utils/printUtils";
import { PeriodEndDateModal } from "../../components/ui/PeriodEndDateModal";
import { Button } from "../../components/ui/button";
import {
  timeToMinutes,
  sortShiftsByTime,
  convertDateFormat,
  validateForm,
  calculateHours,
  doTimesOverlap,
  minutesDiffWithWrap,
  checkApiOverlap
} from "./ViewSchedule/utils";
import {
  FormData,
  User,
  Shift,
  ScheduleItem,
  PeriodEndDateModalProps
} from "./ViewSchedule/types";
import { inputClasses } from "../../pages/Admin/GeoLocationSetup";
import ResetButton from "../../components/ui/ResetButton";

// Normalize a shift key for comparison (YYYY-MM-DD|start|end)
const makeShiftKey = (shift: { date: string; startTime: string; endTime: string }) => {
  // Handle UTC dates properly - treat as local date
  let normalizedDate: string;
  if (shift.date.includes('T') && shift.date.includes('Z')) {
    normalizedDate = shift.date.split('T')[0];
  } else {
    normalizedDate = formatDateLocal(new Date(shift.date));
  }
  return `${normalizedDate}|${shift.startTime}|${shift.endTime}`;
};

// Detect if auto flags changed for a given user (schedule-level or per-shift)
const autoChangedForUser = (userId: number, scheduleDataParam: ScheduleItem[], originalScheduleDataParam: ScheduleItem[]) => {
  const cur = scheduleDataParam.filter(i => i.userId === userId);
  const org = originalScheduleDataParam.filter(i => i.userId === userId);
  const orgByDate = new Map(org.map(i => [i.startDate, i]));
  for (const c of cur) {
    const p = orgByDate.get(c.startDate);
    if (!p) return true;
    if (!!c.auto !== !!p.auto) return true;
    const byId = new Map(p.shifts.map(s => [s.id, s]));
    for (const s of c.shifts) {
      const ps = byId.get(s.id);
        if (ps && (!!s.auto !== !!ps.auto)) return true;
    }
  }
  return false;
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
    const [y, m, d] = ymd.split("-");
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
      <Button
        type="button"
        onClick={() => navigateWeek('prev')}
        variant="ghost"
        size="icon"
        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
        title="Previous Week"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>

      <div className="px-4 py-1 border border-blue-300 rounded-md bg-blue-50">
        <span className="text-blue-700 font-medium text-sm">
          {formatDateForDisplay(selectedDate)}
        </span>
      </div>

      <Button
        type="button"
        onClick={() => navigateWeek('next')}
        variant="ghost"
        size="icon"
        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
        title="Next Week"
      >
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
};

export const ViewSchedule = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // URL parameter handling functions
  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      clientId: params.get('clientId'),
      addressId: params.get('addressId'),
      selectedDate: params.get('selectedDate'),
      showSchedule: params.get('showSchedule') === 'true'
    };
  };

  const updateUrlParams = (updates: Record<string, string | boolean | null>) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  };

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
    updateSessionTimes,
    checkScheduleSession
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
  // Add state to store original data for cancel functionality
  const [originalScheduleData, setOriginalScheduleData] = useState<ScheduleItem[]>([]);
  const [originalSessionData, setOriginalSessionData] = useState([]);

  // Publish confirmation modals
  const [schedulePublishModal, setSchedulePublishModal] = useState({ isOpen: false });
  const [actualTimePublishModal, setActualTimePublishModal] = useState({ isOpen: false });

  // Keep original shifts snapshot per user to detect changes on publish
  const originalShiftsRef = useRef<Map<number, Set<string>>>(new Map());

  // Ref to store checkScheduleSessionId for publish

  // Session data state for actual time tracking (local state for UI)
  const [sessionData, setSessionData] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState(null);
  const [checkScheduleSessionIdMap, setCheckScheduleSessionIdMap] = useState<Map<string, number>>(new Map());
  // State to store API existing shifts for overlap checking
  const [apiExistingShifts, setApiExistingShifts] = useState<Map<string, any[]>>(new Map());

  const [hasScheduleChanges, setHasScheduleChanges] = useState(false);
  const [hasSessionChanges, setHasSessionChanges] = useState(false);
  // Function to fetch existing shifts from API for overlap checking
  const fetchApiExistingShifts = async (userId?: number) => {
    if (!currentWeekRange || !selectedClient) return null;

    try {
      const startDate = formatDateLocal(new Date(currentWeekRange.startOfWeek));
      const [year, month, day] = startDate.split("-");
      const formattedStartDate = `${month}-${day}-${year}`;

      const newApiShifts = new Map<string, any[]>();

      if (userId) {
        // Fetch for specific user only
        const combination = `${selectedClient.clientId}-${selectedClient.addressId}-${userId}`;

        try {
          const result = await checkScheduleSession(
            selectedClient.clientId,
            selectedClient.addressId,
            userId,
            formattedStartDate
          );

          // Check for GraphQL errors in the response
          if (result?.errors && result.errors.length > 0) {
            const errorMessage = result.errors[0].message;
            console.error(`GraphQL error for user ${userId}:`, errorMessage);

            if (errorMessage.includes("Assign permission") || errorMessage.includes("not found")) {
              toast({
                title: "Assignment Required",
                description: errorMessage,
                variant: "destructive",
              });
            }
            return null; // Exit early if there are errors
          }

          // Store checkScheduleSessionId from the result (regardless of shifts)
          if (result.data.checkScheduleSession.id) {
            // Use combination of parameters as key since API doesn't return scheduleSessionId
            const mapKey = `${selectedClient.clientId}-${selectedClient.addressId}-${userId}`;
            checkScheduleSessionIdMap.set(mapKey, result.data.checkScheduleSession.id);
            console.log(`Stored mapping: ${mapKey} -> ${result.data.checkScheduleSession.id}`);
          }

          if (result?.data?.checkScheduleSession?.shifts) {
            newApiShifts.set(combination, result.data.checkScheduleSession.shifts);
            console.log("Shifts found and stored:", result.data.checkScheduleSession.shifts);
          } else {
            console.log("No shifts found in result:", result?.data?.checkScheduleSession);
          }
        } catch (error: any) {
          console.error(`Failed to fetch shifts for user ${userId}:`, error);

          // Show error to user if it's a permission/assignment error
          if (error?.response?.errors && error.response.errors.length > 0) {
            const errorMessage = error.response.errors[0].message;
            if (errorMessage.includes("Assign permission") || errorMessage.includes("not found")) {
              toast({
                title: "Assignment Required",
                description: errorMessage,
                variant: "destructive",
              });
            }
            return null;
          }
        }
      } else {
        // Fetch for all users in schedule data (for edit mode)
        const uniqueCombinations = new Set<string>();
        scheduleData.forEach(item => {
          const key = `${item.clientId}-${item.addressId}-${item.userId}`;
          uniqueCombinations.add(key);
        });

        // Fetch existing shifts for each combination
        await Promise.all(
          Array.from(uniqueCombinations).map(async (combination) => {
            const [clientId, addressId, userId] = combination.split('-').map(Number);

            try {
              const result = await checkScheduleSession(
                clientId,
                addressId,
                userId,
                formattedStartDate
              );

              // Check for GraphQL errors in the response
              if (result?.errors && result.errors.length > 0) {
                const errorMessage = result.errors[0].message;
                console.error(`GraphQL error for user ${userId}:`, errorMessage);

                if (errorMessage.includes("Assign permission") || errorMessage.includes("not found")) {
                  toast({
                    title: "Assignment Required",
                    description: errorMessage,
                    variant: "destructive",
                  });
                }
                return null; // Skip this combination if there are errors
              }

              // Store checkScheduleSessionId from the result (regardless of shifts)
              if (result.data.checkScheduleSession.id) {
                // Use combination of parameters as key since API doesn't return scheduleSessionId
                const mapKey = `${clientId}-${addressId}-${userId}`;
                checkScheduleSessionIdMap.set(mapKey, result.data.checkScheduleSession.id);
                console.log(`Stored mapping (all users): ${mapKey} -> ${result.data.checkScheduleSession.id}`);
              }

              if (result?.data?.checkScheduleSession?.shifts) {
                newApiShifts.set(combination, result.data.checkScheduleSession.shifts);
                console.log("Shifts found and stored (all users):", result.data.checkScheduleSession.shifts);
              } else {
                console.log("No shifts found in result (all users):", result?.data?.checkScheduleSession);
              }
            } catch (error: any) {
              console.error(`Failed to fetch shifts for user ${userId}:`, error);

              // Show error to user if it's a permission/assignment error
              if (error?.response?.errors && error.response.errors.length > 0) {
                const errorMessage = error.response.errors[0].message;
                if (errorMessage.includes("Assign permission") || errorMessage.includes("not found")) {
                  toast({
                    title: "Assignment Required",
                    description: errorMessage,
                    variant: "destructive",
                  });
                }
                return null;
              }
            }
          })
        );
      }

      setApiExistingShifts(newApiShifts);
      console.log("Fetched API existing shifts:", newApiShifts);
    } catch (error) {
      console.error("Failed to fetch API existing shifts:", error);
    }
  };

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
  // const { data: searchedUsers = [], isLoading: loadingUsers } = useSearchUsers(
  //   debouncedUserSearch,
  //   selectedClient?.clientId ? Number(selectedClient.clientId) : undefined,
  //   selectedClient?.addressId ? Number(selectedClient.addressId) : undefined
  // );
  //   const [showUserDropdown, setShowUserDropdown] = useState(false);
  const { data: searchedUsers = [], isLoading: loadingUsers } = useSearchUsers(debouncedUserSearch);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const [submitLoader, setSubmitLoader] = useState(false);
  const [auto, setAuto] = useState(false);
  const [applyAllWeek, setApplyAllWeek] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Add a state to track if we have data from API
  const [hasApiData, setHasApiData] = useState(false);

  // Track where navigation originated: 'week' | 'modal'
  const [navigationSource, setNavigationSource] = useState<"week" | "modal" | null>(null);
  // track if the modal was opened via the "View" (eye) action
  const [openedFromViewButton, setOpenedFromViewButton] = useState(false);
  // Confirmation modal state for no schedule found
  const [noScheduleConfirmModal, setNoScheduleConfirmModal] = useState({
    isOpen: false,
    clientName: "",
    formattedDate: "",
    clientId: null as number | null,
    addressId: null as number | null,
    selectedDate: ""
  });
  // Bump key to remount tables and reset any internal component state
  const [viewKey, setViewKey] = useState(0);

  // Ref to track if we've already restored state from URL parameters
  const hasRestoredState = useRef(false);

  // Dynamic table height state and ref
  // const [tableHeight, setTableHeight] = useState<string>("400px");
  const formRef = useRef<HTMLDivElement>(null);

  // Initialize state from URL parameters on component mount
  useEffect(() => {
    const urlParams = getUrlParams();

    if (!hasRestoredState.current && urlParams.showSchedule && urlParams.clientId && urlParams.addressId) {
      // Restore schedule view state
      setShowScheduleTable(true);

      // Find the client data from the sessions
      if (clientSessions && Array.isArray(clientSessions)) {
        const clientSession = clientSessions.find(session =>
          session.clientId === parseInt(urlParams.clientId!) &&
          session.addressId === parseInt(urlParams.addressId!)
        );

        if (clientSession) {
          const clientData = {
            clientId: clientSession.clientId,
            addressId: clientSession.addressId,
            name: clientSession.client.name,
            lastName: clientSession.client.lastName,
            address: clientSession.address.address,
            city: clientSession.address.city,
            state: clientSession.address.state,
            pincode: clientSession.address.pincode,
            addresses: (clientSession.client as any)?.addresses || []
          };

          setSelectedClient(clientData);

          // Restore selected date if available
          if (urlParams.selectedDate) {
            setSelectedDate(urlParams.selectedDate);
            const weekRange = getWeekRangeFromDateLocal(parseLocalYMD(urlParams.selectedDate));
            setCurrentWeekRange(weekRange);

            // Trigger API call to fetch schedule data
            const formattedDate = convertDateFormat(urlParams.selectedDate);
            setTableLoading(true);

            fetchScheduleData(clientSession.clientId, clientSession.addressId, formattedDate)
              .catch(error => {
                console.error("Error fetching schedule data on refresh:", error);
                toast({
                  title: "Error",
                  description: "Failed to load schedule data on refresh!",
                  variant: "destructive",
                });
              })
              .finally(() => {
                setTableLoading(false);
              });
          }

          // Mark that we've restored the state
          hasRestoredState.current = true;
        }
      }
    }
  }, [clientSessions]); // Remove fetchScheduleData from dependencies

  const resetUIForWeekNavigation = () => {
    // Close modals
    setModalOpen(false);
    // Exit edit modes
    setIsScheduleEditMode(false);
    setIsActualTimeEditMode(false);
    // Reset original data
    setOriginalScheduleData([]);
    setOriginalSessionData([]);
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
    setOpenedFromViewButton(true);

    // Remove URL parameter updates from here - they will be set in handleDateSubmit
  };

  // Handler to close the period modal and reset related state
  const handleClosePeriodModal = () => {
    setModalOpen(false);
    setOpenedFromViewButton(false);
    // Also close confirmation modal if it's open
    setNoScheduleConfirmModal({
      isOpen: false,
      clientName: "",
      formattedDate: "",
      clientId: null,
      addressId: null,
      selectedDate: ""
    });
  };
  const validateAndNavigate = async (newDate: string) => {
    console.log("validateAndNavigate called with:", newDate);
    setNavigationSource("week");
    // this is a week navigation (not the modal view flow)
    setOpenedFromViewButton(false);

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

    // IMMEDIATELY update the selected date and week range
    setSelectedDate(weekStartStr);
    const weekRange = getWeekRangeFromDateLocal(parseLocalYMD(weekStartStr));
    setCurrentWeekRange(weekRange);

    // Update only the selectedDate parameter since others are already set
    updateUrlParams({
      selectedDate: weekStartStr
    });

    // Reset UI for week navigation attempt
    resetUIForWeekNavigation();

    setTableLoading(true); // Set local loading state

    // Convert date format for backend
    const formattedDate = convertDateFormat(weekStartStr);

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

    const week = getWeekRangeFromDateLocal(parseLocalYMD(date));
    const weekStartStr = toLocalYMD(week.startOfWeek);

    setPreviousDate(selectedDate);
    setTargetDate(weekStartStr);
    setIsNavigationAttempt(true);

    // IMMEDIATELY update the selected date and week range
    setSelectedDate(weekStartStr);
    const weekRange = getWeekRangeFromDateLocal(parseLocalYMD(weekStartStr));
    setCurrentWeekRange(weekRange);

    // Set ALL URL parameters here after clicking Enter button
    updateUrlParams({
      clientId: String(selectedClient?.clientId),
      addressId: String(selectedClient?.addressId),
      selectedDate: weekStartStr,
      showSchedule: true
    });

    // Reset UI for navigation (but don't close modal yet)
    setIsScheduleEditMode(false);
    setIsActualTimeEditMode(false);
    setOriginalScheduleData([]);
    setOriginalSessionData([]);
    setTableLoading(true);

    // Ensure confirmation modal is closed before making a new request
    // This allows the modal to show again if the same date has no schedule
    if (noScheduleConfirmModal.isOpen) {
      setNoScheduleConfirmModal({
        isOpen: false,
        clientName: "",
        formattedDate: "",
        clientId: null,
        addressId: null,
        selectedDate: ""
      });
    }

    const formattedDate = convertDateFormat(weekStartStr);
    clearScheduleData();

    try {
      const clientId = selectedClient?.clientId!;
      const addressId = selectedClient?.addressId!;
      await fetchScheduleData(clientId, addressId, formattedDate);
    } catch (e) {
      toast({ title: "Error", description: "Failed to load schedule data!", variant: "destructive" });
      // On error, close the modal
      setModalOpen(false);
    } finally {
      setTableLoading(false);
      // Don't close modal here - let the useEffect handle it based on whether data exists
      // If no data exists, the confirmation modal will be shown and period modal will stay open
    }
  };

  // Handler for confirmation modal - Yes button (navigate to prepare schedule)
  const handleConfirmPrepareSchedule = () => {
    const { clientId, addressId, selectedDate } = noScheduleConfirmModal;
    if (clientId && addressId && selectedDate) {
      // Close both modals
      setNoScheduleConfirmModal({ isOpen: false, clientName: "", formattedDate: "", clientId: null, addressId: null, selectedDate: "" });
      setModalOpen(false);
      // Reset openedFromViewButton since we're navigating away
      setOpenedFromViewButton(false);
      // Navigate to prepare schedule
      navigate(`/prepare-schedule/`);
    }
  };

  // Handler for confirmation modal - No button (keep period modal open)
  const handleCancelPrepareSchedule = () => {
    // Just close the confirmation modal, keep the period modal open
    setNoScheduleConfirmModal(
      {  isOpen: false,
        clientName: "",
        formattedDate: "",
        clientId: null as number | null,
        addressId: null as number | null,
        selectedDate: ""
       });
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
        const clientName = [selectedClient?.name, selectedClient?.lastName].filter(Boolean).join(' ') || "this client";
        const formattedDate = targetDate ? new Date(targetDate).toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        }) : "";
        //this toast should appear only when clicked on enter on Period end date modal 
        if (navigationSource === "modal" && openedFromViewButton) {
          // Show confirmation modal instead of directly navigating
          if (selectedClient && selectedDate) {
            // Only show modal if it's not already open (avoid duplicate modals)
            if (!noScheduleConfirmModal.isOpen) {
              setNoScheduleConfirmModal({
                isOpen: true,
                clientName,
                formattedDate,
                clientId: selectedClient.clientId,
                addressId: selectedClient.addressId,
                selectedDate
              });
            }
            // Don't set openedFromViewButton to false here - keep it true so modal can show again if user clicks "No"
            return; // stop further handling in this effect
          }
          // fallback toast if we can't show modal
          toast({
            title: "No Schedule Found",
            description: `No schedule found for this week. Please prepare a schedule first.`,
            variant: "destructive",
          });
        }
        // Only show the "No Schedule" toast when a navigation attempt triggered this state
        if (isNavigationAttempt) {
          toast({
            title: "No Schedule Found",
            description: `No schedule found for this week. Please prepare a schedule first.`,
            variant: "destructive",
          });
        }

        setHasApiData(false);

        // Don't update selectedDate here since it's already updated in validateAndNavigate
        if (isNavigationAttempt && targetDate) {
          if (navigationSource === "week") {
            // Allow navigation to empty view - selectedDate is already set
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
        // Don't update selectedDate here since it's already updated in validateAndNavigate
        if (!showScheduleTable) setShowScheduleTable(true);
        if (navigationSource === "modal") {
          // Close period modal only when data exists and confirmation modal is not open
          if (!noScheduleConfirmModal.isOpen) {
            setModalOpen(false);
            // Reset openedFromViewButton when period modal closes with data found
            setOpenedFromViewButton(false);
          }
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

          // FIX: Handle UTC dates properly - treat as local date
          let date: string;
          if (shift.date.includes('T') && shift.date.includes('Z')) {
            // This is a UTC date, extract just the date part without timezone conversion
            date = shift.date.split('T')[0];
          } else {
            date = formatDateLocal(new Date(shift.date));
          }

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
              clientName: [group.client?.name, (group.client as any)?.lastName].filter(Boolean).join(' ') || "Unknown Client",
              address: [group.address?.address, group.address?.city, group.address?.state, group.address?.pincode].filter(Boolean).join(", ") || "Unknown Address",
              userName: [group.user?.name, (group.user as any)?.lastName].filter(Boolean).join(" "),
              userPhone: (group.user as any)?.phone ?? ""
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
            auto: (shift as any)?.auto ?? false,
            confirm: (shift as any)?.confirm ?? false,
            reject: (shift as any)?.reject ?? false
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

  // Add these useEffect hooks after the existing useEffect hooks (around line 700)
  useEffect(() => {
    if (isScheduleEditMode && originalScheduleData.length > 0) {
      const hasChanges = !schedulesEqual(scheduleData, originalScheduleData);
      setHasScheduleChanges(hasChanges);
    } else {
      setHasScheduleChanges(false);
    }
  }, [scheduleData, originalScheduleData, isScheduleEditMode]);

  // Minimal handler to refresh schedule data after child reports a successful delete
  const handleDeleteSuccess = async () => {
    if (!selectedClient || !selectedDate) return;
    setTableLoading(true);
    try {
      const formattedDate = convertDateFormat(selectedDate);
      await fetchScheduleData(selectedClient.clientId, selectedClient.addressId, formattedDate);
      toast({ title: "Success", description: "Schedule refreshed after delete." });
    } catch (err) {
      console.error("Error refreshing schedule after delete:", err);
      toast({ title: "Error", description: "Failed to refresh schedule after delete.", variant: "destructive" });
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    if (isActualTimeEditMode) {
      // If we're in edit mode, check for changes regardless of originalSessionData length
      // This handles cases where we start with no sessions and add new ones
      const hasChanges = !sessionsEqual(sessionData, originalSessionData);
      setHasSessionChanges(hasChanges);
    } else {
      setHasSessionChanges(false);
    }
  }, [sessionData, originalSessionData, isActualTimeEditMode]);
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


  const tableColumns: TableColumn[] = [
    {
      key: "clientName",
      label: "Client Name",
      sortable: true,
      searchable: true,
      searchType: 'text',
      width: "250px",
      height: "40px",
      render: (_: any, row: any) => {
        const a = row;
        // const full = [a?.clientName??"" , a?.clientLastName??""].filter(Boolean).join(" ");
        const full = a?.clientName ?? "";

        console.log("first name");
        return <div className="truncate" title={full}>{full || "-"}</div>;
      }
    },
    { key: "address", label: "Street Address", sortable: true, searchable: true, width: "225px" },
    { key: "city", label: "City", sortable: true, searchable: true, width: "225px" },
    { key: "state", label: "State", sortable: true, searchable: true, width: "225px" },
    { key: "pincode", label: "Pincode", sortable: true, searchable: true, width: "225px" },
  ];

  const tableActions: TableAction[] = [
    {
      label: "View",
      icon: <FiEye className="w-4 h-4" />,
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
    const fullName = [user.name, (user as any)?.lastName].filter(Boolean).join(" ");
    setUserSearch(fullName || user.name);
    setSelectedUser(user);
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
    setSelectedUser(null);
    setAuto(false);
    setErrors({});
    setApplyAllWeek(false);

    toast({
      title: "Form Reset",
      description: "Add guard form has been reset successfully.",
    });
  };



  const onSubmitAddGuard = async (e) => {
    e.preventDefault();
    setSubmitLoader(true)
    // Check if the guard is already in the schedule table
    const guardExistsInSchedule = scheduleData.some(item => item.userId === Number(form.userId));

    // If guard is not in schedule table, fetch their existing shifts from API
    // if (!guardExistsInSchedule && form.userId) {
      const result = await fetchApiExistingShifts(Number(form.userId));
      console.log("result from fetchApiExistingShifts:", JSON.stringify(result));
      if (result === null) {
        setSubmitLoader(false);
        return;
      }
    // }

    // For "Apply All Week", we need custom validation
    if (applyAllWeek && currentWeekRange) {
      const weekErrors: { [key: string]: string } = {};

      // Basic field validation
      if (!form.userId) weekErrors.userId = "Required";
      if (!form.starttime) weekErrors.starttime = "Required";
      if (!form.endtime) weekErrors.endtime = "Required";

      // Time duration validation
      if (form.starttime && form.endtime) {
        const minutes = minutesDiffWithWrap(form.starttime, form.endtime);
        if (minutes < 1) {
          weekErrors.endtime = "End time must be at least 1 minute after start time";
        }
      }

      // For "Apply All Week", we don't block submission if there are overlaps
      // Instead, we'll skip overlapping days during the actual shift addition
      setErrors(weekErrors);
      if (Object.keys(weekErrors).length > 0) return;
    } else {
      // Single date validation
      const formErrors = validateForm(form, scheduleData, undefined, apiExistingShifts);
      setErrors(formErrors);
      if (Object.keys(formErrors).length > 0) {
        setSubmitLoader(false); // Add this line
        return;
      }
    }

    // setSubmitLoader(true);

    try {
      // Get user details from state or the search results as fallback
      const selected = selectedUser ?? searchedUsers.find(u => String(u.id) === form.userId);

      if (!selected) {
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
        auto: auto,
      };

      // Initialize counters for tracking added/skipped days
      let addedDays = 0;
      let skippedDays = 0;

      if (applyAllWeek && currentWeekRange) {
        // Add for each day in the week (Thu-Wed)
        const startDate = new Date(currentWeekRange.startOfWeek);

        for (let i = 0; i < 7; i++) {
          const dateObj = new Date(startDate);
          dateObj.setDate(startDate.getDate() + i);
          // Use local timezone formatting
          const dateStr = toLocalYMD(dateObj);

          // Check for overlap before adding shift (both local and API data)
          const existingShiftsForDate = updatedScheduleData
            .filter(item => item.userId === Number(form.userId) && item.startDate === dateStr)
            .flatMap(item => item.shifts);

          const hasLocalOverlap = existingShiftsForDate.some(existingShift => {

            return doTimesOverlap(form.starttime, form.endtime, existingShift.startTime, existingShift.endTime);
          });

          // Check API existing shifts overlap
          let hasApiOverlap = false;
          if (selectedClient) {
            hasApiOverlap = checkApiOverlap(
              Number(form.userId),
              dateStr,
              form.starttime,
              form.endtime,
              selectedClient.clientId,
              selectedClient.addressId,
              apiExistingShifts
            );
          }

          if (hasLocalOverlap || hasApiOverlap) {
            skippedDays++;
            console.log(`Skipping ${dateStr} due to ${hasLocalOverlap ? 'local' : 'API'} overlap`);
            continue; // Skip this day and move to next
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
            addedDays++;
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
              clientName: [selectedClient?.name, selectedClient?.lastName].filter(Boolean).join(' ') || "Unknown Client",
              address: [selectedClient?.address, selectedClient?.city, selectedClient?.state, selectedClient?.pincode].filter(Boolean).join(", ") || "Unknown Address",
              userName: [selectedUser.name, (selectedUser as any)?.lastName].filter(Boolean).join(" "),
              userPhone: (selectedUser as any)?.phone || '',
            });
            addedDays++;
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
          addedDays = 1; // Single day added
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
                auto: auto
              },
            ],
            clientName: [selectedClient?.name, selectedClient?.lastName].filter(Boolean).join(' ') || "Unknown Client",
            address: [selectedClient?.address, selectedClient?.city, selectedClient?.state, selectedClient?.pincode].filter(Boolean).join(", ") || "Unknown Address",
            userName: [selectedUser.name, (selectedUser as any)?.lastName].filter(Boolean).join(" "),
            userPhone: (selectedUser as any)?.phone || '',
          });
          addedDays = 1; // Single day added
        }
      }

      // Update schedule data and re-render table
      setScheduleData(updatedScheduleData);

      resetAddGuardForm();

      // Show appropriate success message based on Apply All Week or single date
      if (applyAllWeek && currentWeekRange) {
        if (addedDays > 0 && skippedDays > 0) {
          toast({
            title: "Partial Success",
            description: `Shifts added to ${addedDays} days. Skipped ${skippedDays} days due to overlapping shifts.`,
          });
        } else if (addedDays > 0) {
          toast({
            title: "Success",
            description: `Shifts added successfully to all ${addedDays} days!`,
          });
        } else {
          toast({
            title: "No Shifts Added",
            description: "All days had overlapping shifts. No shifts were added.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "New guard shift added successfully!",
        });
      }
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
    setSchedulePublishModal({ isOpen: true });
  };

  const confirmSchedulePublish = async () => {
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
      const selectedDateObj = parseLocalYMD(selectedDate);
      const weekRange = getWeekRangeFromDateLocal(selectedDateObj);
      // Use local timezone formatting
      const startDate = toLocalYMD(weekRange.startOfWeek);
      const endDate = toLocalYMD(weekRange.endOfWeek);

      // Group schedule data by user to create the required format
      const userScheduleMap = new Map();

      // Process each schedule item
      scheduleData.forEach(item => {
        const userId = item.userId;

        // Get scheduleSessionId from any existing shift (all shifts for a user should have the same scheduleSessionId)
        const scheduleSessionId = item.shifts.find(shift => shift.scheduleSessionId)?.scheduleSessionId || null;

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
        // Also mark changed if auto flags differ
        if (!changed && autoChangedForUser(userSchedule.userId, scheduleData, originalScheduleData)) {
          changed = true;
        }

        // Use the same key format as the mapping: clientId-addressId-userId
        const mapKey = `${userSchedule.clientId}-${userSchedule.addressId}-${userSchedule.userId}`;
        const mappedCheckScheduleSessionId = checkScheduleSessionIdMap.get(mapKey) || null;
        console.log(`User ${userSchedule.userId}: mapKey=${mapKey}, mapped checkScheduleSessionId=${mappedCheckScheduleSessionId}`);
        
        return {
          ...userSchedule,
          weeklyHours: parseFloat(weeklyHours.toFixed(2)),
          change: changed,
          checkScheduleSessionId: mappedCheckScheduleSessionId
        };
      });

      console.log("=== PUBLISHING SCHEDULE DATA ===");
      console.log("checkScheduleSessionIdMap:", checkScheduleSessionIdMap);
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
      try {
        const clientId = selectedClient?.clientId;
        const addressId = selectedClient?.addressId;
        const formattedDate = convertDateFormat(selectedDate);

        if (clientId && addressId) {
          await fetchScheduleData(clientId, addressId, formattedDate);
        }
        setIsPublishing(false);
      } catch (refreshError) {
        console.error("Error refreshing schedule data after publish:", refreshError);
        // Don't show error toast for refresh failure as publish was successful
      }
      // Switch to view mode after successful publish
      setIsScheduleEditMode(false);
      setSchedulePublishModal({ isOpen: false });

    } catch (error: any) {
      console.error("Error publishing schedule:", error);

      // Handle different types of errors
      let errorMessage = "Failed to publish schedule. Please try again.";

      if (error.message) {
        if (error.message.includes("No authentication token found")) {
          errorMessage = "Authentication token not found. Please log in again.";
        } else if (error.message.includes("Network Error") || error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else if (error.response?.errors && error.response.errors.length > 0) {
          errorMessage = error.response.errors[0].message || errorMessage;
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      // Close modal on error
      setSchedulePublishModal({ isOpen: false });
    } finally {

      setIsPublishing(false);
    }
  };

  const cancelSchedulePublish = () => {
    setSchedulePublishModal({ isOpen: false });
  };

  const handleUserAutoToggle = async (userId: number, enabled: boolean) => {
    setScheduleData(prev => prev.map(item =>
      item.userId === userId
        ? {
          ...item,
          auto: enabled,
          shifts: item.shifts.map(shift => ({ ...shift, auto: enabled }))
        }
        : item
    ));

    toast({
      title: "Success",
      description: `Auto setting ${enabled ? 'enabled' : 'disabled'} for user`,
    });
  };

  const handleShiftAutoToggle = (userId: number, date: string, shiftId: number, enabled: boolean) => {
    setScheduleData(prev => prev.map(item => {
      if (item.userId === userId && item.startDate === date) {
        const updatedShifts = item.shifts.map(s => (s.id === shiftId ? { ...s, auto: enabled } : s));
        const scheduleAuto = enabled ? true : updatedShifts.some(s => s.auto === true);
        return { ...item, auto: scheduleAuto, shifts: updatedShifts };
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

    // Clear URL parameters
    updateUrlParams({
      clientId: null,
      addressId: null,
      selectedDate: null,
      showSchedule: null
    });
  };
  // Add this function after the schedulesEqual function (around line 1300)
  const sessionsEqual = (a: any[], b: any[]) => {
    if (a.length !== b.length) return false;
    
    // Create normalized copies to avoid mutating original arrays
    // Only compare source data fields, not derived fields like workedTime
    const normalizeSession = (s: any) => ({
      shiftId: s.shiftId || null,
      scheduleSessionId: s.scheduleSessionId || null,
      clockIn: s.clockIn || null,
      clockOut: s.clockOut || null,
    });
    
    // Sort by shiftId, then clockIn for stable comparison
    const sortedA = [...a].sort((x, y) => {
      if (x.shiftId !== y.shiftId) return (x.shiftId || 0) - (y.shiftId || 0);
      return (x.clockIn || '').localeCompare(y.clockIn || '');
    }).map(normalizeSession);
    
    const sortedB = [...b].sort((x, y) => {
      if (x.shiftId !== y.shiftId) return (x.shiftId || 0) - (y.shiftId || 0);
      return (x.clockIn || '').localeCompare(y.clockIn || '');
    }).map(normalizeSession);
    
    return JSON.stringify(sortedA) === JSON.stringify(sortedB);
  };
  // Helper: deep equality for schedule data (order-insensitive)
  const schedulesEqual = (a: ScheduleItem[], b: ScheduleItem[]) => {
    const normalize = (arr: ScheduleItem[]) =>
      [...arr]
        .map(item => ({
          ...item,
          // sort shifts by startTime/endTime/id for stable compare
          shifts: [...item.shifts].sort((s1, s2) =>
            s1.startTime === s2.startTime
              ? (s1.endTime === s2.endTime ? (s1.id - s2.id) : s1.endTime.localeCompare(s2.endTime))
              : s1.startTime.localeCompare(s2.startTime)
          )
        }))
        // sort items by userId then startDate for stable compare
        .sort((i1, i2) =>
          i1.userId === i2.userId ? i1.startDate.localeCompare(i2.startDate) : i1.userId - i2.userId
        );

    const na = normalize(a);
    const nb = normalize(b);
    return JSON.stringify(na) === JSON.stringify(nb);
  };

  const toggleScheduleEditMode = () => {
    if (!isScheduleEditMode) {
      setOriginalScheduleData(JSON.parse(JSON.stringify(scheduleData)));
      // Fetch existing shifts from API when entering edit mode
      fetchApiExistingShifts();
    } else {
      const hasChanges = !schedulesEqual(scheduleData, originalScheduleData);
      if (hasChanges) {
        setScheduleData(originalScheduleData);
        toast({
          title: "Changes Cancelled",
          description: "Schedule time changes have been reset.",
        });
      }
    }
    setIsScheduleEditMode(!isScheduleEditMode);
  };

  const toggleActualTimeEditMode = () => {
    if (!isActualTimeEditMode) {
      setOriginalSessionData(JSON.parse(JSON.stringify(sessionData)));
    } else {
      setSessionData(originalSessionData);
      toast({
        title: "Changes Cancelled",
        description: "Actual time changes have been reset.",
      });
    }
    setIsActualTimeEditMode(!isActualTimeEditMode);
  };

  // Handle actual time publish
  const handleActualTimePublish = async () => {
    setActualTimePublishModal({ isOpen: true });
  };

  const confirmActualTimePublish = async () => {
    if (!sessionData) {
      toast({
        title: "Error",
        description: "No actual time data available to publish!",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsActualTimePublishing(true);

      // Prepare updated/new sessions (with clockIn)
      const updatedItems = sessionData
        .filter(s => s.clockIn)
        .map(s => {
          const isNew = s.id > 1700000000000;
          const base: any = {
            sessionId: isNew ? null : s.id,
            shiftId: s.shiftId,
            scheduleSessionId: s.scheduleSessionId,
            clockIn: s.clockIn!,
          };
          if (s.clockOut) {
            base.clockOut = s.clockOut; // omit when missing
          }
          return base;
        });

      // Find deleted sessions (exist in originalSessionData but not in current sessionData)
      const deletedItems: any[] = [];
      if (isActualTimeEditMode && originalSessionData.length > 0) {
        const currentSessionIds = new Set(sessionData.map(s => s.id));
        originalSessionData.forEach(originalSession => {
          // Only include sessions that had a real ID (not temporary IDs > 1700000000000)
          // and are no longer in the current sessionData
          if (originalSession.id <= 1700000000000 && !currentSessionIds.has(originalSession.id)) {
            deletedItems.push({
              shiftId: originalSession.shiftId,
              scheduleSessionId: originalSession.scheduleSessionId,
              // No sessionId, clockIn, or clockOut for deleted sessions
            });
          }
        });
      }

      // Combine updated/new sessions with deleted sessions
      const items = [...updatedItems, ...deletedItems];

      // if (items.length === 0) {
      //   toast({
      //     title: "Error",
      //     description: "No sessions to publish.",
      //     variant: "destructive",
      //   });
      //   setIsActualTimePublishing(false);
      //   return;
      // }

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
      setActualTimePublishModal({ isOpen: false });

    } catch (error: any) {
      console.error("Error publishing actual time data:", error);

      // Handle different types of errors
      let errorMessage = "Failed to publish actual time data. Please try again.";

      if (error.message) {
        if (error.message.includes("No authentication token found")) {
          errorMessage = "Authentication token not found. Please log in again.";
        } else if (error.message.includes("Network Error") || error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else {
          // Check for GraphQL errors in the response
          if (error.response?.errors && error.response.errors.length > 0) {
            errorMessage = error.response.errors[0].message || errorMessage;
          } else if (error.response?.data?.errors && error.response.data.errors.length > 0) {
            errorMessage = error.response.data.errors[0].message || errorMessage;
          } else if (error.errors && error.errors.length > 0) {
            errorMessage = error.errors[0].message || errorMessage;
          } else {
            errorMessage = error.message;
          }
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      // Close modal on error
      setActualTimePublishModal({ isOpen: false });
    } finally {
      setIsActualTimePublishing(false);
    }
  };

  const cancelActualTimePublish = () => {
    setActualTimePublishModal({ isOpen: false });
  };

  // Create immutable copy of schedule data for actual time table
  const createImmutableScheduleCopy = (scheduleData: ScheduleItem[]) => {
    return scheduleData.map(item => ({
      ...item,
      shifts: item.shifts.map(shift => ({ ...shift })),
      // Add any additional properties needed for actual time tracking
    }));
  };


  const handleSchedulePrint = async () => {
    try {
      setIsPrinting(true);

      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300));
      const cleanScheduleData = scheduleData.map(item => ({
        ...item,
        shifts: item.shifts.map(shift => ({
          ...shift,
          date: shift.date.split("T")[0],
        })),
      }));
      const tableContent = generateSchedulePrintableTable(cleanScheduleData, currentWeekRange, selectedClient);

      // Compute meta details for header
      const totalEmployees = new Set(scheduleData.map(i => i.userId)).size;
      const totalHours = scheduleData.reduce((sum, item) =>
        sum + item.shifts.reduce((s, sh) => s + (sh.hours || 0), 0), 0
      );

      await handlePrint(
        tableContent,
        {
          title: "Scheduled",
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

  const handleScheduleDownloadExcel = async () => {
    try {
      if (!currentWeekRange) throw new Error("Missing week range");
      await generateScheduleStyledExcel(scheduleData, selectedClient, currentWeekRange, 'schedule');

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

  // Helper function to calculate worked time with 24-hour logic for clock-in == clock-out
  const calculateWorkedTimeForExcel = (session: any) => {
    if (!session.clockIn || !session.clockOut) {
      return 0; // Return 0 if either time is missing
    }

    // If clock-in equals clock-out, return 24 hours
    if (session.clockIn === session.clockOut) {
      return 24.0; // 24 hours
    }

    // Otherwise use the calculated hours directly
    return calculateHours(session.clockIn, session.clockOut);
  };

  const handleActualTimeDownloadExcel = async () => {
    try {
      if (!currentWeekRange) throw new Error("Missing week range");

      // Transform actual time data to match schedule data format
      const transformedData = [];

      // Get unique users from session data
      const uniqueUsers = new Map();
      sessionData.forEach(item => {
        const scheduleItem = scheduleData.find(si =>
          si.shifts.some(shift => shift.id === item.shiftId)
        );
        if (scheduleItem && !uniqueUsers.has(scheduleItem.userId)) {
          uniqueUsers.set(scheduleItem.userId, {
            id: scheduleItem.userId,
            name: scheduleItem.userName
          });
        }
      });

      // Transform data for each user
      uniqueUsers.forEach((user) => {
        // Group sessions by date for this user
        const sessionsByDate = new Map();

        sessionData.forEach(session => {
          const scheduleItem = scheduleData.find(si =>
            si.shifts.some(shift => shift.id === session.shiftId)
          );

          if (scheduleItem && scheduleItem.userId === user.id) {
            const shift = scheduleItem.shifts.find(s => s.id === session.shiftId);
            if (shift) {
              // Handle both local date format and ISO date format
              let shiftDate: string;
              if (shift.date.includes('T') && shift.date.includes('Z')) {
                shiftDate = shift.date.split('T')[0];
              } else if (shift.date.includes('T')) {
                shiftDate = toLocalYMD(new Date(shift.date));
              } else {
                shiftDate = shift.date;
              }

              if (!sessionsByDate.has(shiftDate)) {
                sessionsByDate.set(shiftDate, []);
              }
              sessionsByDate.get(shiftDate).push(session);
            }
          }
        });

        // Create transformed data structure
        sessionsByDate.forEach((sessions, date) => {
          sessions.forEach(session => {
            // Check if we have both clock-in and clock-out times
            const hasCompleteTime = session.clockIn && session.clockOut;

            transformedData.push({
              userId: user.id,
              userName: user.name,
              startDate: date,
              shifts: [{
                id: session.shiftId,  // Add the shift ID for border detection
                startTime: session.clockIn || 'N/A',  // Use clockIn instead of startTime
                endTime: session.clockOut || 'N/A',   // Use clockOut instead of endTime
                hours: hasCompleteTime ? calculateWorkedTimeForExcel(session) : 'N/A'
              }]
            });
          });
        });
      });

      // Use the same Excel generation function with transformed data
      await generateScheduleStyledExcel(transformedData, selectedClient, currentWeekRange, 'actual');

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

      const tableContent = generateActualTimePrintableTable(sessionData, scheduleData, currentWeekRange, selectedClient);

      // Compute meta details for header (Actual Time)
      const totalEmployees = new Set(scheduleData.map(i => i.userId)).size;
      const totalHours = sessionData.reduce((sum, item) => sum + calculateWorkedTimeForExcel(item), 0);

      await handlePrint(
        tableContent,
        {
          title: "Actual",
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
  const isClientAndAddressSelected = !!selectedClient?.clientId && !!selectedClient?.addressId;

  return (
    <div className="w-full overflow-x-hidden p-6">
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
            // tableHeight={tableHeight}
            />
          )}

          <PeriodEndDateModal
            isOpen={isModalOpen}
            onClose={handleClosePeriodModal}
            onSubmit={handleDateSubmit}
            isLoading={tableLoading}
          />

          {/* No Schedule Found Confirmation Modal */}
          {noScheduleConfirmModal.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="mb-6">
                  {/* <h3 className="text-lg font-medium text-gray-900 mb-2">No Schedule Found</h3> */}
                  <p className="text-sm text-gray-500">
                    No schedule found for {noScheduleConfirmModal.clientName} on this week range.
                  </p>
                  <p className="text-sm text-gray-500 mt-2 font-medium">
                    Do you want to prepare a schedule?
                  </p>
                </div>
                <div className="flex space-x-3 justify-end">
                  <button
                    type="button"
                    onClick={handleCancelPrepareSchedule}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPrepareSchedule}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#004175] border border-transparent rounded-md hover:bg-[#00325d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]"
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="w-full">
          {/* Header with reset button and date navigation */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold"></h2>
            <div className="flex items-center space-x-4">
              {/* Date Navigation Component */}

              <Button
                onClick={resetScheduleView}
                variant="outline"
                className="inline-flex items-center"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Back to Clients
              </Button>
            </div>
          </div>

          {/* Add New Guard Form */}
          {!scheduleLoading && !scheduleError && isScheduleEditMode && (
            <div ref={formRef} className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 space-y-2 grid mb-4">
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
                      onFocus={() => {
                        if (isClientAndAddressSelected) setShowUserDropdown(true);
                      }}
                      onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                      onChange={e => {
                        if (isClientAndAddressSelected) {
                          setUserSearch(e.target.value);
                          setForm(f => ({ ...f, userId: "" }));
                          setSelectedUser(null);
                        }
                      }}
                      placeholder="Guard Name"
                      className={`${inputClasses} ${!isClientAndAddressSelected ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                      disabled={!isClientAndAddressSelected}
                    />
                    {errors.userId && (
                      <span className="text-xs text-red-500">{errors.userId}</span>
                    )}
                    <SearchResultsDropdown show={showUserDropdown && userSearch.length >= 1 && isClientAndAddressSelected}>
                      {loadingUsers ? (
                        <div className="p-2 text-sm text-gray-500">Searching guards...</div>
                      ) : searchedUsers.length === 0 ? (
                        <div className="p-2 text-gray-500 text-sm">No guards found</div>
                      ) : (
                        searchedUsers.map((user, idx) => {
                          const fullName = [user.name, (user as any)?.lastName].filter(Boolean).join(" ");
                          const fullAddress = [
                            (user as any)?.address,
                            (user as any)?.city,
                            (user as any)?.state,
                            (user as any)?.zipcode,
                          ].filter(Boolean).join(", ");
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
                    {!isClientAndAddressSelected && (
                      <div className="text-xs text-red-500 mt-1">
                        Please select a client and address before searching for a guard.
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
                          <svg
                            className="mr-2 h-4 w-4 animate-spin text-blue-600"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                          </svg>
                          Adding...
                        </>
                      ) : (
                        <>
                          <GoPlus className="w-4 h-4 mr-1" />
                          Add
                        </>
                      )}
                    </button>
                    {(form.date || form.starttime || form.endtime || form.userId || auto) && (

                      <ResetButton
                        onClick={resetAddGuardForm}
                        confirmTitle="Confirm Reset"
                        confirmMessage="This will clear the form. Proceed?"
                      />
                    )}
                  </div>
                </div>
              </form>
            </div>
          )}


          <div className="flex w-full justify-between items-center  my-0 py-2 px-4 rounded-t-lg bg-gray-50">
            {selectedClient && (
              <div className="text-left">
                <div className="text-lg font-medium text-gray-800">
                  {selectedClient?.lastName && String(selectedClient?.name || "").trim().endsWith(String(selectedClient.lastName))
                    ? selectedClient.name
                    : [selectedClient?.name, selectedClient?.lastName].filter(Boolean).join(" ")}
                </div>
                <div className="text-sm text-gray-500">
                  {[selectedClient.address, selectedClient.city, selectedClient.state, selectedClient.pincode].filter(Boolean).join(", ")}
                </div>
              </div>
            )}
            <DateNavigation
              selectedDate={selectedDate}
              onDateChange={validateAndNavigate}
              currentWeekRange={currentWeekRange}
            />
          </div>
          {(scheduleLoading || tableLoading) && !hasApiData && (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-gray-600">
                  <h3 className="text-lg font-medium mb-2">Loading Schedule Data</h3>
                  <p className="text-sm">Please wait while we fetch the schedule information...</p>
                </div>
              </div>
            </div>
          )}
          {/* Show no data message when no schedule exists or when we navigated to an empty week */}
          {!scheduleError && !scheduleLoading && !tableLoading && (scheduleData.length === 0 || !hasApiData) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <div className="text-gray-500">
                <h3 className="text-lg font-medium mb-2">No Schedule Found</h3>
              </div>
            </div>
          )}

          {/* Only render ScheduleTable when we have data */}
          {!scheduleError && hasApiData && scheduleData.length > 0 && (
            <div key={`schedule-${viewKey}`} className="mt-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Scheduled Time</h3>
              <ScheduleTable
                key={`schedule-${viewKey}`}
                scheduleData={scheduleData}
                sessionData={sessionData}
                selectedDate={selectedDate}
                currentWeekRange={currentWeekRange}
                isEditMode={isScheduleEditMode}
                onScheduleDataChange={setScheduleData}
                onPublish={handlePublish}
                onPrint={handleSchedulePrint}
                onDownloadExcel={handleScheduleDownloadExcel}
                onToggleEditMode={toggleScheduleEditMode}
                onDeleteSuccess={handleDeleteSuccess}
                isPublishing={isPublishing}
                isPrinting={isPrinting}
                loading={scheduleLoading || tableLoading}
                onUserAutoToggle={handleUserAutoToggle}
                onShiftAutoToggle={handleShiftAutoToggle}
                apiExistingShiftsData={apiExistingShifts}
                hasChanges={hasScheduleChanges}
              />
            </div>
          )}

          {/* Actual Time Table Section - only when we have schedule data */}
          {!scheduleError && hasApiData && scheduleData.length > 0 && (
            <div key={`actual-${viewKey}`} className="mt-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Actual Time</h3>
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
                hasChanges={hasSessionChanges}

              />
            </div>
          )}

          {/* Schedule Publish Confirmation Modal */}
          {schedulePublishModal.isOpen && (
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
                    onClick={cancelSchedulePublish}
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={confirmSchedulePublish}
                    disabled={isPublishing}
                    variant="primary"
                    className="flex items-center"
                  >
                    {isPublishing ? (
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

          {/* Actual Time Publish Confirmation Modal */}
          {actualTimePublishModal.isOpen && (
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
                    onClick={cancelActualTimePublish}
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={confirmActualTimePublish}
                    disabled={isActualTimePublishing}
                    variant="primary"
                    className="flex items-center"
                  >
                    {isActualTimePublishing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ViewSchedule;

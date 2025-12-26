import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  checkApiOverlap,
  shiftSpansNextDay,
  getAdjustedDate
} from "./ViewSchedule/utils";
import {
  FormData,
  User,
  ScheduleItem,
} from "./ViewSchedule/types";
import { inputClasses } from "../../pages/Admin/GeoLocationSetup";
import ResetButton from "../../components/ui/ResetButton";



const makeShiftKey = (shift: { date: string; startTime: string; endTime: string }) => {
  let normalizedDate: string;
  if (shift.date.includes('T') && shift.date.includes('Z')) {
    normalizedDate = shift.date.split('T')[0];
  } else {
    normalizedDate = formatDateLocal(new Date(shift.date));
  }
  return `${normalizedDate}|${shift.startTime}|${shift.endTime}`;
};
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

export const DateNavigation = ({
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
const hasRealQueryParams = (search: string) =>
  new URLSearchParams(search).toString().length > 0;
export const ViewSchedule = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const getUrlParams = () => {
    const params = new URLSearchParams(location.search);
    return {
      clientId: params.get("clientId"),
      addressId: params.get("addressId"),
      selectedDate: params.get("selectedDate"),
      showSchedule: params.get("showSchedule") === "true",
      viewClient: params.get("view-client") === "true",
      viewEmployee: params.get("view-employee") === "true",
      userId: params.get("userid"),
    };
  };
  
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
    createDraftScheduleSessions,
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
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserDisplayName, setSelectedUserDisplayName] = useState<string>("");
  useEffect(() => {
    return () => {
      setSelectedUserId(null);
      setSelectedUserDisplayName("");
    };
  }, []);
  const [showScheduleTable, setShowScheduleTable] = useState(() => {
    if (typeof window === "undefined") return false;
    return hasRealQueryParams(window.location.search);
  });
  
  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  useEffect(() => {
    const hasQuery = hasRealQueryParams(location.search);
  
    setShowScheduleTable(hasQuery);
    setScheduleData([]);
    setSessionData([]);
    setHasApiData(false);
  
    // ✅ when there are no query params, clear selection state
    if (!hasQuery) {
      setSelectedClient(null);
      setSelectedUserId(null);
      setSelectedUserDisplayName("");
  
      // optional but usually makes the UI consistent
      setModalOpen(false);
      setCurrentWeekRange(null);
      setSelectedDate("");
      hasRestoredState.current = false;
    }
  }, [location.search]);


  
  useEffect(() => {
    const hasQuery = hasRealQueryParams(location.search);
  
    setShowScheduleTable(hasQuery);
    setScheduleData([]);
    setSessionData([]);
    setHasApiData(false);
  
    // ✅ When URL is /view-schedule (no params), reset selection state
    if (!hasQuery) {
      setSelectedClient(null);
      setSelectedUserId(null);
      setSelectedUserDisplayName("");
      setCurrentWeekRange(null);
      setSelectedDate("");
      setModalOpen(false);
  
      hasRestoredState.current = false;
  
      clearScheduleData();
      clearSessionData();
    }
  }, [location.search]);
  

  const updateUrlParams = React.useCallback(
    (updates: Record<string, string | boolean | null>) => {
      const params = new URLSearchParams(location.search);
  
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) params.delete(key);
        else params.set(key, String(value));
      });
  
      const qs = params.toString();
      navigate(
        { pathname: location.pathname, search: qs ? `?${qs}` : "" },
        { replace: true }
      );
    },
    [navigate, location.pathname, location.search]
  );
  
  const [currentWeekRange, setCurrentWeekRange] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isActualTimePublishing, setIsActualTimePublishing] = useState(false);
  const [isScheduleEditMode, setIsScheduleEditMode] = useState(false);
  const [isActualTimeEditMode, setIsActualTimeEditMode] = useState(false);
  const [originalScheduleData, setOriginalScheduleData] = useState<ScheduleItem[]>([]);
  const [originalSessionData, setOriginalSessionData] = useState([]);
  const [schedulePublishModal, setSchedulePublishModal] = useState({ isOpen: false });
  const [actualTimePublishModal, setActualTimePublishModal] = useState({ isOpen: false });
  const originalShiftsRef = useRef<Map<number, Set<string>>>(new Map());
  const [sessionData, setSessionData] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState(null);
  const [checkScheduleSessionIdMap, setCheckScheduleSessionIdMap] = useState<Map<string, number>>(new Map());
  const [apiExistingShifts, setApiExistingShifts] = useState<Map<string, any[]>>(new Map());
  const [hasScheduleChanges, setHasScheduleChanges] = useState(false);
  const [hasSessionChanges, setHasSessionChanges] = useState(false);
  const fetchApiExistingShifts = async (userId?: number) => {
    if (!currentWeekRange || !selectedClient) return null;
    try {
      const startDate = formatDateLocal(new Date(currentWeekRange.startOfWeek));
      const [year, month, day] = startDate.split("-");
      const formattedStartDate = `${month}-${day}-${year}`;

      const newApiShifts = new Map<string, any[]>();

      if (userId) {
        const combination = `${selectedClient.clientId}-${selectedClient.addressId}-${userId}`;
        try {
          const result = await checkScheduleSession(
            selectedClient.clientId,
            selectedClient.addressId,
            userId,
            formattedStartDate
          );
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
            return null;
          }
          if (result.data.checkScheduleSession.id) {
            const mapKey = `${selectedClient.clientId}-${selectedClient.addressId}-${userId}`;
            checkScheduleSessionIdMap.set(mapKey, result.data.checkScheduleSession.id);
            // console.log(`Stored mapping: ${mapKey} -> ${result.data.checkScheduleSession.id}`);
          }
          if (result?.data?.checkScheduleSession?.shifts) {
            newApiShifts.set(combination, result.data.checkScheduleSession.shifts);
            // console.log("Shifts found and stored:", result.data.checkScheduleSession.shifts);
          } else {
            console.log("No shifts found in result:", result?.data?.checkScheduleSession);
          }
        } catch (error: any) {
          console.error(`Failed to fetch shifts for user ${userId}:`, error);
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
        const uniqueCombinations = new Set<string>();
        scheduleData.forEach(item => {
          const key = `${item.clientId}-${item.addressId}-${item.userId}`;
          uniqueCombinations.add(key);
        });
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
                return null;
              }
              if (result.data.checkScheduleSession.id) {
                const mapKey = `${clientId}-${addressId}-${userId}`;
                checkScheduleSessionIdMap.set(mapKey, result.data.checkScheduleSession.id);
                // console.log(`Stored mapping (all users): ${mapKey} -> ${result.data.checkScheduleSession.id}`);
              }
              if (result?.data?.checkScheduleSession?.shifts) {
                newApiShifts.set(combination, result.data.checkScheduleSession.shifts);
                // console.log("Shifts found and stored (all users):", result.data.checkScheduleSession.shifts);
              } else {
                console.log("No shifts found in result (all users):", result?.data?.checkScheduleSession);
              }
            } catch (error: any) {
              console.error(`Failed to fetch shifts for user ${userId}:`, error);
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
  const [tableLoading, setTableLoading] = useState(false);
  const [previousDate, setPreviousDate] = useState("");
  const [isNavigationAttempt, setIsNavigationAttempt] = useState(false);
  const [targetDate, setTargetDate] = useState("");
  const [form, setForm] = useState<FormData>({
    userId: "",
    date: "",
    starttime: "",
    endtime: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [userSearch, setUserSearch] = useState("");
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const { data: searchedUsers = [], isLoading: loadingUsers } = useSearchUsers(
    debouncedUserSearch,
    selectedClient?.clientId,
    selectedClient?.addressId
  );
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [submitLoader, setSubmitLoader] = useState(false);
  const [auto, setAuto] = useState(false);
  const [applyAllWeek, setApplyAllWeek] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [hasApiData, setHasApiData] = useState(false);
  const [navigationSource, setNavigationSource] = useState<"week" | "modal" | null>(null);
  const [openedFromViewButton, setOpenedFromViewButton] = useState(false);
  const [noScheduleConfirmModal, setNoScheduleConfirmModal] = useState({
    isOpen: false,
    clientName: "",
    formattedDate: "",
    clientId: null as number | null,
    addressId: null as number | null,
    selectedDate: ""
  });
  const [viewKey, setViewKey] = useState(0);
  const hasRestoredState = useRef(false);
  const [tableHeight, setTableHeight] = useState<string>("500px");
  const formRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const urlParams = getUrlParams();
    if (!hasRestoredState.current && urlParams.showSchedule && urlParams.clientId && urlParams.addressId) {
      setShowScheduleTable(true);
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
          if (urlParams.selectedDate) {
            setSelectedDate(urlParams.selectedDate);
            const weekRange = getWeekRangeFromDateLocal(parseLocalYMD(urlParams.selectedDate));
            setCurrentWeekRange(weekRange);
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
          hasRestoredState.current = true;
        }
      }
    } else if (
      !hasRestoredState.current &&
      urlParams.userId
    ) {
      const parsedUserId = parseInt(urlParams.userId, 10);
      if (!Number.isNaN(parsedUserId)) {
        setSelectedUserId(parsedUserId);
        setSelectedUserDisplayName("");
        setShowScheduleTable(true);
        const userSelectedDate = urlParams.selectedDate || toLocalYMD(new Date());
        setSelectedDate(userSelectedDate);
        const weekRange = getWeekRangeFromDateLocal(parseLocalYMD(userSelectedDate));
        setCurrentWeekRange(weekRange);
        const formattedDate = convertDateFormat(userSelectedDate);
        setTableLoading(true);
        fetchScheduleData(undefined, undefined, formattedDate, parsedUserId)
          .catch(error => {
            console.error("Error fetching schedule data for employee:", error);
            toast({
              title: "Error",
              description: "Failed to load schedule data for this employee!",
              variant: "destructive",
            });
          })
          .finally(() => {
            setTableLoading(false);
            hasRestoredState.current = true;
          });
      }
    }
  }, [clientSessions]); 

  const resetUIForWeekNavigation = () => {
    setModalOpen(false);
    setIsScheduleEditMode(false);
    setIsActualTimeEditMode(false);
    setOriginalScheduleData([]);
    setOriginalSessionData([]);
    setForm({ userId: "", date: "", starttime: "", endtime: "" });
    setErrors({});
    setUserSearch("");
    setShowUserDropdown(false);
    setSubmitLoader(false);
    setAuto(false);
    setApplyAllWeek(false);
    setIsPrinting(false);
    setIsPublishing(false);
    setIsActualTimePublishing(false);
    setViewKey((k) => k + 1);
  };
  const handleView = (rowData: any) => {
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
    setSelectedUserId(null);
    setSelectedUserDisplayName("");
    setModalOpen(true);
    setOpenedFromViewButton(true);
  };
  const handleClosePeriodModal = () => {
    setModalOpen(false);
    setOpenedFromViewButton(false);
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
    setNavigationSource("week");
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
    const week = getWeekRangeFromDateLocal(parseLocalYMD(newDate));
    const weekStartStr = toLocalYMD(week.startOfWeek);
    setPreviousDate(selectedDate);
    setTargetDate(weekStartStr); 
    setIsNavigationAttempt(true);
    setSelectedDate(weekStartStr);
    const weekRange = getWeekRangeFromDateLocal(parseLocalYMD(weekStartStr));
    setCurrentWeekRange(weekRange);
    updateUrlParams({
      selectedDate: weekStartStr
    });
    resetUIForWeekNavigation();
    setHasApiData(false);
    setScheduleData([]);
    setSessionData([]);

    setTableLoading(true);
    const formattedDate = convertDateFormat(weekStartStr);
    clearScheduleData();

    try {
      if (selectedUserId) {
        await fetchScheduleData(undefined, undefined, formattedDate, selectedUserId);
      } else {
        await fetchScheduleData(clientId, addressId, formattedDate);
      }
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
    setSelectedDate(weekStartStr);
    const weekRange = getWeekRangeFromDateLocal(parseLocalYMD(weekStartStr));
    setCurrentWeekRange(weekRange);
    const urlUpdates: Record<string, string | boolean | null> = {
      selectedDate: weekStartStr,
      showSchedule: true
    };

    if (selectedUserId) {
      urlUpdates.userid = String(selectedUserId);
      urlUpdates.clientId = null;
      urlUpdates.addressId = null;
    } else {
      urlUpdates.clientId = selectedClient?.clientId ? String(selectedClient.clientId) : null;
      urlUpdates.addressId = selectedClient?.addressId ? String(selectedClient.addressId) : null;
    }

    updateUrlParams(urlUpdates);
    setIsScheduleEditMode(false);
    setIsActualTimeEditMode(false);
    setOriginalScheduleData([]);
    setOriginalSessionData([]);
    setHasApiData(false);
    setScheduleData([]);
    setSessionData([]);
    setTableLoading(true);
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
      if (selectedUserId) {
        await fetchScheduleData(undefined, undefined, formattedDate, selectedUserId);
      } else {
        const clientId = selectedClient?.clientId!;
        const addressId = selectedClient?.addressId!;
        await fetchScheduleData(clientId, addressId, formattedDate);
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to load schedule data!", variant: "destructive" });
      setModalOpen(false);
    } finally {
      setTableLoading(false);
    }
  };
  const handleConfirmPrepareSchedule = () => {
    const { clientId, addressId, selectedDate } = noScheduleConfirmModal;
    if (clientId && addressId && selectedDate) {
      setNoScheduleConfirmModal({ isOpen: false, clientName: "", formattedDate: "", clientId: null, addressId: null, selectedDate: "" });
      setModalOpen(false);
      setOpenedFromViewButton(false);
      navigate(`/prepare-schedule/`);
    }
  };
  const handleCancelPrepareSchedule = () => {
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
    fetchClientSessions();
  }, []);

  const [tableData, setTableData] = useState([]);

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

      const sortedData = [...flatData].sort((a, b) =>
        a.clientName.localeCompare(b.clientName, undefined, { sensitivity: "base" })
      );

      setTableData(sortedData);
    } else {
      setTableData([]);
    }
  }, [clientSessions]);
  useEffect(() => {
    if (apiScheduleData) {
      const scheduleSessions = apiScheduleData.scheduleSessions ?? [];
      const draftScheduleSessions = apiScheduleData.draftScheduleSessions ?? [];
  
      const hasAnyData =
        (scheduleSessions && scheduleSessions.length > 0) ||
        (draftScheduleSessions && draftScheduleSessions.length > 0);
  
      // -------------------------
      // 1. No schedule / draft data
      // -------------------------
      if (!hasAnyData) {
        const clientName =
          [selectedClient?.name, selectedClient?.lastName]
            .filter(Boolean)
            .join(" ") || "this client";
  
        const formattedDate = targetDate
          ? new Date(targetDate).toLocaleDateString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "numeric",
            })
          : "";
  
        // Same UX as before
        if (navigationSource === "modal" && openedFromViewButton) {
          if (selectedClient && selectedDate) {
            if (!noScheduleConfirmModal.isOpen) {
              setNoScheduleConfirmModal({
                isOpen: true,
                clientName,
                formattedDate,
                clientId: selectedClient.clientId,
                addressId: selectedClient.addressId,
                selectedDate,
              });
            }
            return;
          }
          toast({
            title: "No Schedule Found",
            description: `No schedule found for this week. Please prepare a schedule first.`,
            variant: "destructive",
          });
        }
  
        if (isNavigationAttempt) {
          toast({
            title: "No Schedule Found",
            description: `No schedule found for this week. Please prepare a schedule first.`,
            variant: "destructive",
          });
        }
  
        setHasApiData(false);
  
        if (isNavigationAttempt && targetDate) {
          if (navigationSource === "week") {
            if (!showScheduleTable) setShowScheduleTable(true);
          }
        }
  
        setIsNavigationAttempt(false);
        setTargetDate("");
        return;
      }
  
      // -------------------------
      // 2. We DO have schedule or draft data
      // -------------------------
      setHasApiData(true);
  
      if (isNavigationAttempt && targetDate) {
        if (!showScheduleTable) setShowScheduleTable(true);
  
        if (navigationSource === "modal") {
          if (!noScheduleConfirmModal.isOpen) {
            setModalOpen(false);
            setOpenedFromViewButton(false);
          }
        }
  
        if (navigationSource === "week") {
          resetUIForWeekNavigation();
        }
      }
  
      setIsNavigationAttempt(false);
      setTargetDate("");
  
      const keyedByUserDate = new Map<string, any>();
      let derivedClientInfo: any = null;
  
      const normalizeDate = (raw: string) => {
        if (!raw) return "";
        if (raw.includes("T")) {
          return raw.split("T")[0];
        }
        return formatDateLocal(new Date(raw));
      };
  
      const ensureDerivedClientInfo = (group: any) => {
        if (derivedClientInfo) return;
        derivedClientInfo = {
          clientId: group.clientId,
          addressId: group.addressId,
          name: group.client?.name ?? "",
          lastName: (group.client as any)?.lastName ?? "",
          address: group.address?.address ?? "",
          city: group.address?.city ?? "",
          state: group.address?.state ?? "",
          pincode: group.address?.pincode ?? "",
          addresses: (group.client as any)?.addresses || [],
        };
      };
  
      const addShiftToMap = (params: {
        group: any;
        userId: number;
        userName: string;
        userPhone: string;
        shift: any;
        isDraft: boolean;
        groupAuto: boolean;
        isDraftScheduleSession: boolean;
      }) => {
        const {
          group,
          userId,
          userName,
          userPhone,
          shift,
          isDraft,
          groupAuto,
          isDraftScheduleSession,
        } = params;
        if (!shift?.date || userId == null) return;
  
        const date = normalizeDate(shift.date);
        const key = `${userId}-${date}`;
  
        let item = keyedByUserDate.get(key);
        if (!item) {
          item = {
            id: keyedByUserDate.size + 1,
            clientId: group.clientId,
            addressId: group.addressId,
            userId,
            startDate: date,
            auto: groupAuto ?? false,
            shifts: [],
            clientName:
              [group.client?.name, (group.client as any)?.lastName]
                .filter(Boolean)
                .join(" ") || "Unknown Client",
            address:
              [
                group.address?.address,
                group.address?.city,
                group.address?.state,
                group.address?.pincode,
              ]
                .filter(Boolean)
                .join(", ") || "Unknown Address",
            userName,
            userPhone,
            draftScheduleSession: isDraftScheduleSession,
          };
          keyedByUserDate.set(key, item);
        }
        if (item && isDraftScheduleSession) {
          item.draftScheduleSession = true;
        }
  
        // For draft shifts we give them a big synthetic id so they are treated as "new"
        const baseId = shift.id ?? 0;
        const syntheticId = isDraft ? 2000000000000 + baseId : baseId;

        const shiftData: any = {
          id: syntheticId,
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          hours: shift.hours,
          scheduleSessionId: shift.scheduleSessionId ?? null,
          auto: (shift as any)?.auto ?? false,
          confirm: (shift as any)?.confirm ?? false,
          reject: (shift as any)?.reject ?? false,
        };

        // Preserve draft-specific IDs for delete/update operations
        if (isDraft) {
          // draftShiftId is the original database ID (baseId)
          shiftData.draftShiftId = baseId;
          // draftScheduleSessionId comes from the shift object or the group
          shiftData.draftScheduleSessionId = (shift as any)?.draftScheduleSessionId ?? (group as any)?.draftScheduleSessionId ?? null;
        }

        item.shifts.push(shiftData);
      };
  
      // 2.a. Handle main scheduleSessions (shifts + draftShifts)
      scheduleSessions.forEach((group: any) => {
        ensureDerivedClientInfo(group);
  
        const userId = group.user?.id;
        const userName = [group.user?.name, (group.user as any)?.lastName]
          .filter(Boolean)
          .join(" ");
        const userPhone = (group.user as any)?.phone ?? "";
        const groupAuto = group.auto ?? false;
  
        // Real scheduled shifts
        group.shifts?.forEach((shift: any) => {
          addShiftToMap({
            group,
            userId,
            userName,
            userPhone,
            shift,
            isDraft: false,
            groupAuto,
            isDraftScheduleSession: false,
          });
        });
  
        // Draft shifts attached to existing scheduleSession
        group.draftShifts?.forEach((shift: any) => {
          addShiftToMap({
            group,
            userId,
            userName,
            userPhone,
            shift,
            isDraft: true,
            groupAuto: groupAuto || !!shift.auto,
            isDraftScheduleSession: false,
          });
        });
      });
  
      // 2.b. Handle draftScheduleSessions (draft-only sessions)
      draftScheduleSessions.forEach((group: any) => {
        ensureDerivedClientInfo(group);
  
        const userId = group.user?.id;
        const userName = [group.user?.name, (group.user as any)?.lastName]
          .filter(Boolean)
          .join(" ");
        const userPhone = (group.user as any)?.phone ?? "";
  
        // For draft schedule sessions, derive auto from shifts
        const groupAuto =
          group.draftShifts?.some((s: any) => s.auto) ?? false;
  
        group.draftShifts?.forEach((shift: any) => {
          addShiftToMap({
            group,
            userId,
            userName,
            userPhone,
            shift,
            isDraft: true,
            groupAuto,
            isDraftScheduleSession: true,
          });
        });
      });
  
      // -------------------------
      // 3. Final transformed data
      // -------------------------
      const transformedData = Array.from(keyedByUserDate.values());
      setScheduleData(transformedData);
  
      // Keep selectedClient in sync (same logic as before)
      if (transformedData.length > 0) {
        const first = transformedData[0];
        setSelectedClient((prev) => {
          const next = {
            clientId: first.clientId,
            addressId: first.addressId,
            name: first.clientName ?? prev?.name ?? "",
            lastName: prev?.lastName ?? "",
            address: first.address ?? prev?.address ?? "",
            city: prev?.city ?? "",
            state: prev?.state ?? "",
            pincode: prev?.pincode ?? "",
            addresses: prev?.addresses ?? [],
          };
  
          if (
            !prev ||
            prev.clientId !== next.clientId ||
            prev.addressId !== next.addressId ||
            prev.name !== next.name ||
            prev.address !== next.address
          ) {
            return next;
          }
          return prev;
        });
      }
  
      // Set selected employee display name if viewing by employee
      if (selectedUserId) {
        const match = transformedData.find(
          (item) => item.userId === selectedUserId
        );
        if (match) {
          setSelectedUserDisplayName(match.userName ?? "");
        }
      }
  
      const urlParams = getUrlParams();
      if (urlParams.viewEmployee && transformedData.length > 0) {
        const firstUserId = transformedData[0]?.userId ?? null;
        setSelectedUserId(firstUserId);
        setSelectedUserDisplayName(transformedData[0]?.userName ?? "");
      }
  
      if (!selectedClient && derivedClientInfo) {
        setSelectedClient(derivedClientInfo);
      }
  
      // Build originalShiftsRef (used for change detection)
      const baseMap = new Map<number, Set<string>>();
      transformedData.forEach((item) => {
        const set = baseMap.get(item.userId) || new Set<string>();
        item.shifts.forEach((s: any) => set.add(makeShiftKey(s)));
        baseMap.set(item.userId, set);
      });
      originalShiftsRef.current = baseMap;
  
      // Fetch session data for all scheduleSessionIds (only real sessions)
      if (transformedData.length > 0) {
        const scheduleSessionIds = Array.from(
          new Set(
            transformedData.flatMap((item) =>
              item.shifts
                .map((s: any) => s.scheduleSessionId)
                .filter((id: any): id is number => typeof id === "number")
            )
          )
        );
  
        if (scheduleSessionIds.length > 0) {
          fetchSessionData(scheduleSessionIds);
        }
      }
    } else if (apiScheduleData === null) {
      setHasApiData(false);
    }
  }, [
    apiScheduleData,
    selectedClient,
    selectedDate,
    isNavigationAttempt,
    previousDate,
    targetDate,
    showScheduleTable,
    navigationSource,
  ]);
  
  useEffect(() => {
    if (apiSessionData) {
      setSessionData(apiSessionData);
    } else {
      setSessionData([]);
    }
  }, [apiSessionData]);
  useEffect(() => {
    if (isScheduleEditMode && originalScheduleData.length > 0) {
      const hasChanges = !schedulesEqual(scheduleData, originalScheduleData);
      setHasScheduleChanges(hasChanges);
    } else {
      setHasScheduleChanges(false);
    }
  }, [scheduleData, originalScheduleData, isScheduleEditMode]);
  const handleDeleteSuccess = async () => {
    if (!selectedDate) return;
    setTableLoading(true);
    try {
      const formattedDate = convertDateFormat(selectedDate);
      if (selectedUserId) {
        await fetchScheduleData(undefined, undefined, formattedDate, selectedUserId);
      } else if (selectedClient) {
        await fetchScheduleData(selectedClient.clientId, selectedClient.addressId, formattedDate);
      }
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
      const hasChanges = !sessionsEqual(sessionData, originalSessionData);
      setHasSessionChanges(hasChanges);
    } else {
      setHasSessionChanges(false);
    }
  }, [sessionData, originalSessionData, isActualTimeEditMode]);
  useEffect(() => {
    setSessionLoading(apiSessionLoading);
  }, [apiSessionLoading]);

  useEffect(() => {
    setSessionError(apiSessionError);
  }, [apiSessionError]);

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
        const full = a?.clientName ?? "";
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
  const handleFormChange = (field: keyof FormData, value: string) => {
    setForm((f) => ({
      ...f,
      [field]: value,
    }));
    if (field === 'starttime' || field === 'endtime' || field === 'userId' || field === 'date') {
      setErrors((e) => ({ ...e, [field]: undefined, overlap: undefined }));
    } else {
      setErrors((e) => ({ ...e, [field]: undefined }));
    }
    if (field === 'date' && value && currentWeekRange) {
      const selectedDate = parseLocalYMD(value);
      const weekRange = getWeekRangeFromDateLocal(selectedDate);
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
    const guardExistsInSchedule = scheduleData.some(item => item.userId === Number(form.userId));
      const result = await fetchApiExistingShifts(Number(form.userId));
      if (result === null) {
        setSubmitLoader(false);
        return;
      }
    if (applyAllWeek && currentWeekRange) {
      const weekErrors: { [key: string]: string } = {};
      if (!form.userId) weekErrors.userId = "Required";
      if (!form.starttime) weekErrors.starttime = "Required";
      if (!form.endtime) weekErrors.endtime = "Required";
      if (form.starttime && form.endtime) {
        const minutes = minutesDiffWithWrap(form.starttime, form.endtime);
        if (minutes < 1) {
          weekErrors.endtime = "End time must be at least 1 minute after start time";
        }
      }
      setErrors(weekErrors);
      if (Object.keys(weekErrors).length > 0) return;
    } else {
      const formErrors = validateForm(form, scheduleData, undefined, apiExistingShifts);
      setErrors(formErrors);
      if (Object.keys(formErrors).length > 0) {
        setSubmitLoader(false);
        return;
      }
    }
    try {
      const selected = selectedUser ?? searchedUsers.find(u => String(u.id) === form.userId);

      if (!selected) {
        toast({
          title: "Error",
          description: "Selected user not found.",
          variant: "destructive",
        });
        return;
      }
      const updatedScheduleData = [...scheduleData];
      const newShift = {
        id: Date.now(),
        startTime: form.starttime,
        endTime: form.endtime,
        hours: calculateHours(form.starttime, form.endtime),
        auto: auto,
      };
      let addedDays = 0;
      let skippedDays = 0;

      if (applyAllWeek && currentWeekRange) {
        const startDate = new Date(currentWeekRange.startOfWeek);

        for (let i = 0; i < 7; i++) {
          const dateObj = new Date(startDate);
          dateObj.setDate(startDate.getDate() + i);
          const dateStr = toLocalYMD(dateObj);
          // Check same day local shifts
          const existingShiftsForDate = updatedScheduleData
            .filter(item => item.userId === Number(form.userId) && item.startDate === dateStr)
            .flatMap(item => item.shifts);

          let hasLocalOverlap = existingShiftsForDate.some(existingShift => {
            return doTimesOverlap(form.starttime, form.endtime, existingShift.startTime, existingShift.endTime);
          });

          // Always check previous day shifts (they may span into current day)
          // Shifts are treated as starting on current day, so previous day shifts might overlap
          if (!hasLocalOverlap) {
            const prevDate = getAdjustedDate(dateStr, -1);
            const prevDayShifts = updatedScheduleData
              .filter(item => item.userId === Number(form.userId) && item.startDate === prevDate)
              .flatMap(item => item.shifts)
              .filter(shift => shiftSpansNextDay(shift.startTime, shift.endTime));

            hasLocalOverlap = prevDayShifts.some(existingShift => {
              return doTimesOverlap(form.starttime, form.endtime, existingShift.startTime, existingShift.endTime);
            });
          }

          // Check next day shifts if current shift spans into next day
          // Shifts are treated as starting on current day and may extend to next day
          if (!hasLocalOverlap && shiftSpansNextDay(form.starttime, form.endtime)) {
            const nextDate = getAdjustedDate(dateStr, 1);
            const nextDayShifts = updatedScheduleData
              .filter(item => item.userId === Number(form.userId) && item.startDate === nextDate)
              .flatMap(item => item.shifts);

            hasLocalOverlap = nextDayShifts.some(existingShift => {
              return doTimesOverlap(form.starttime, form.endtime, existingShift.startTime, existingShift.endTime);
            });
          }

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
            continue;
          }
          const existingScheduleIndex = updatedScheduleData.findIndex(
            item => item.userId === Number(form.userId) && item.startDate === dateStr
          );

          if (existingScheduleIndex !== -1) {
            const newShifts = [
              ...updatedScheduleData[existingScheduleIndex].shifts,
              {
                ...newShift,
                id: Date.now() + i, 
                date: dateStr,
              }
            ];
            updatedScheduleData[existingScheduleIndex] = {
              ...updatedScheduleData[existingScheduleIndex],
              shifts: sortShiftsByTime(newShifts)
            };
            addedDays++;
          } else {
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
        const existingScheduleIndex = updatedScheduleData.findIndex(
          item => item.userId === Number(form.userId) && item.startDate === form.date
        );

        if (existingScheduleIndex !== -1) {
          const newShifts = [
            ...updatedScheduleData[existingScheduleIndex].shifts,
            {
              ...newShift,
              date: form.date,
            }
          ];
          updatedScheduleData[existingScheduleIndex] = {
            ...updatedScheduleData[existingScheduleIndex],
            shifts: sortShiftsByTime(newShifts)
          };
          addedDays = 1; 
        } else {
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
          addedDays = 1; 
        }
      }
      setScheduleData(updatedScheduleData);

      // resetAddGuardForm();
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
  const handlePublish = async () => {
    setSchedulePublishModal({ isOpen: true });
  };

  // const confirmSchedulePublish = async () => {
  //   if (!scheduleData || scheduleData.length === 0) {
  //     toast({
  //       title: "Error",
  //       description: "No data available to publish!",
  //       variant: "destructive",
  //     });
  //     return;
  //   }

  //   try {
  //     setIsPublishing(true);
  //     const selectedDateObj = parseLocalYMD(selectedDate);
  //     const weekRange = getWeekRangeFromDateLocal(selectedDateObj);
  //     const startDate = toLocalYMD(weekRange.startOfWeek);
  //     const endDate = toLocalYMD(weekRange.endOfWeek);
  //     const userScheduleMap = new Map();
  //     scheduleData.forEach(item => {
  //       const userId = item.userId;
  //       const scheduleSessionId = item.shifts.find(shift => shift.scheduleSessionId)?.scheduleSessionId || null;
  //       const hasDraftShiftsForItem = item.shifts.some((s: any) => !!(s?.draftShiftId));

  //       if (!userScheduleMap.has(userId)) {
  //         userScheduleMap.set(userId, {
  //           scheduleSessionId: scheduleSessionId, 
  //           clientId: item.clientId,
  //           addressId: item.addressId,
  //           userId: userId,
  //           startDate: convertDateFormat(startDate),
  //           endDate: convertDateFormat(endDate),
  //           auto: item.auto,
  //           weeklyHours: 0, 
  //           shifts: [],
  //           hasDraftShifts: hasDraftShiftsForItem || false,
  //         });
  //       } else {
  //         const existingSchedule = userScheduleMap.get(userId);
  //         existingSchedule.auto = item.auto;
  //         if (!existingSchedule.scheduleSessionId && scheduleSessionId) {
  //           existingSchedule.scheduleSessionId = scheduleSessionId;
  //         }
  //         if (hasDraftShiftsForItem) {
  //           existingSchedule.hasDraftShifts = true;
  //         }
  //       }

  //       const userSchedule = userScheduleMap.get(userId);
  //       item.shifts.forEach(shift => {
  //         const isClientGeneratedId = shift.id > 1000000000000;
  //         const isDraftShift = !!(shift as any)?.draftShiftId;
  //         // Treat draft shifts as new entities (shiftId: null) when they belong to existing scheduleSession
  //         const shiftId = (isClientGeneratedId || isDraftShift) ? null : shift.id;
  //         userSchedule.shifts.push({
  //           date: convertDateFormat(shift.date),
  //           startTime: shift.startTime,
  //           endTime: shift.endTime,
  //           hours: shift.hours,
  //           shiftId: shiftId,
  //           auto: (shift as any)?.auto ?? null
  //         });
  //       });
  //     });
  //     const scheduleInput = Array.from(userScheduleMap.values()).map(userSchedule => {
  //       const weeklyHours = userSchedule.shifts.reduce((total, shift) => total + shift.hours, 0);
  //       const originalSet = originalShiftsRef.current.get(userSchedule.userId) || new Set<string>();
  //       const currentSet = new Set<string>();
  //       scheduleData
  //         .filter(i => i.userId === userSchedule.userId)
  //         .forEach(i => i.shifts.forEach(s => currentSet.add(makeShiftKey(s))));
  //       let changed = false;
  //       if (originalSet.size !== currentSet.size) {
  //         changed = true;
  //       } else {
  //         for (const k of currentSet) {
  //           if (!originalSet.has(k)) { changed = true; break; }
  //         }
  //       }
  //       if (!changed && autoChangedForUser(userSchedule.userId, scheduleData, originalScheduleData)) {
  //         changed = true;
  //       }
  //       // Set change to true if there are draft shifts (they are treated as new entities)
  //       if (userSchedule.hasDraftShifts) {
  //         changed = true;
  //       }
  //       const mapKey = `${userSchedule.clientId}-${userSchedule.addressId}-${userSchedule.userId}`;
  //       const mappedCheckScheduleSessionId = checkScheduleSessionIdMap.get(mapKey) || null;
  //       console.log(`User ${userSchedule.userId}: mapKey=${mapKey}, mapped checkScheduleSessionId=${mappedCheckScheduleSessionId}`);
        
  //       // Remove hasDraftShifts before sending to server
  //       const { hasDraftShifts, ...scheduleSessionData } = userSchedule;
        
  //       return {
  //         ...scheduleSessionData,
  //         weeklyHours: parseFloat(weeklyHours.toFixed(2)),
  //         change: changed,
  //         checkScheduleSessionId: mappedCheckScheduleSessionId
  //       };
  //     });
  //     await bulkUpsertScheduleSessions(scheduleInput);
  //     console.log("scheduleInput", JSON.stringify(scheduleInput, null, 2));

  //     toast({
  //       title: "Success",
  //       description: "Schedule published successfully!",
  //     });
  //     try {
  //       const clientId = selectedClient?.clientId;
  //       const addressId = selectedClient?.addressId;
  //       const formattedDate = convertDateFormat(selectedDate);

  //       if (selectedUserId) {
  //         await fetchScheduleData(undefined, undefined, formattedDate, selectedUserId);
  //       } else if (clientId && addressId) {
  //         await fetchScheduleData(clientId, addressId, formattedDate);
  //       }
  //       setIsPublishing(false);
  //     } catch (refreshError) {
  //       console.error("Error refreshing schedule data after publish:", refreshError);
       
  //     }
  //     setIsScheduleEditMode(false);
  //     setSchedulePublishModal({ isOpen: false });

  //   } catch (error: any) {
  //     let errorMessage = "Failed to publish schedule. Please try again.";

  //     if (error.message) {
  //       if (error.message.includes("No authentication token found")) {
  //         errorMessage = "Authentication token not found. Please log in again.";
  //       } else if (error.message.includes("Network Error") || error.message.includes("fetch")) {
  //         errorMessage = "Network error. Please check your internet connection and try again.";
  //       } else if (error.response?.errors && error.response.errors.length > 0) {
  //         errorMessage = error.response.errors[0].message || errorMessage;
  //       } else {
  //         errorMessage = error.message;
  //       }
  //     }

  //     toast({
  //       title: "Error",
  //       description: errorMessage,
  //       variant: "destructive",
  //     });
  //     setSchedulePublishModal({ isOpen: false });
  //   } finally {

  //     setIsPublishing(false);
  //   }
  // };


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
      const selectedDateObj = parseLocalYMD(selectedDate);
      const weekRange = getWeekRangeFromDateLocal(selectedDateObj);
      const startDate = toLocalYMD(weekRange.startOfWeek);
      const endDate = toLocalYMD(weekRange.endOfWeek);
  
      const userScheduleMap = new Map();
      scheduleData.forEach(item => {
        const userId = item.userId;
        const scheduleSessionId = item.shifts.find(shift => shift.scheduleSessionId)?.scheduleSessionId || null;
        const hasDraftShiftsForItem = item.shifts.some((s: any) => !!(s?.draftShiftId));
  
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
            shifts: [],
            hasDraftShifts: hasDraftShiftsForItem || false,
          });
        } else {
          const existingSchedule = userScheduleMap.get(userId);
          existingSchedule.auto = item.auto;
          if (!existingSchedule.scheduleSessionId && scheduleSessionId) {
            existingSchedule.scheduleSessionId = scheduleSessionId;
          }
          if (hasDraftShiftsForItem) {
            existingSchedule.hasDraftShifts = true;
          }
        }
  
        const userSchedule = userScheduleMap.get(userId);
        item.shifts.forEach(shift => {
          const isClientGeneratedId = shift.id > 1000000000000;
          const isDraftShift = !!(shift as any)?.draftShiftId;
          const shiftId = (isClientGeneratedId || isDraftShift) ? null : shift.id;
  
          userSchedule.shifts.push({
            date: convertDateFormat(shift.date),
            startTime: shift.startTime,
            endTime: shift.endTime,
            hours: shift.hours,
            shiftId: shiftId,
            auto: (shift as any)?.auto ?? null
          });
        });
      });
  
      const scheduleInput = Array.from(userScheduleMap.values()).map(userSchedule => {
        const weeklyHours = userSchedule.shifts.reduce((total, shift) => total + shift.hours, 0);
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
  
        if (!changed && autoChangedForUser(userSchedule.userId, scheduleData, originalScheduleData)) {
          changed = true;
        }
  
        if (userSchedule.hasDraftShifts) {
          changed = true;
        }
  
        const mapKey = `${userSchedule.clientId}-${userSchedule.addressId}-${userSchedule.userId}`;
        const mappedCheckScheduleSessionId = checkScheduleSessionIdMap.get(mapKey) || null;
        console.log(`User ${userSchedule.userId}: mapKey=${mapKey}, mapped checkScheduleSessionId=${mappedCheckScheduleSessionId}`);
  
        const { hasDraftShifts, ...scheduleSessionData } = userSchedule;
  
        return {
          ...scheduleSessionData,
          weeklyHours: parseFloat(weeklyHours.toFixed(2)),
          change: changed,
          checkScheduleSessionId: mappedCheckScheduleSessionId
        };
      });
  
      await bulkUpsertScheduleSessions(scheduleInput);
  
      const draftDeletePayload: any[] = [];
      const draftScheduleSessionIds = new Set<number>();
  
      const scheduleSessionDraftMap = new Map<number, Set<number>>();
  
      scheduleData.forEach(item => {
        item.shifts.forEach((shift: any) => {
          const draftScheduleSessionId = shift.draftScheduleSessionId as number | null | undefined;
          const draftShiftId = shift.draftShiftId as number | null | undefined;
          const scheduleSessionId = shift.scheduleSessionId as number | null | undefined;
  
          if (draftScheduleSessionId && !draftScheduleSessionIds.has(draftScheduleSessionId)) {
            draftScheduleSessionIds.add(draftScheduleSessionId);
            draftDeletePayload.push({
              draftScheduleSessionId,
              isDelete: true,
            });
          }
  
          if (draftShiftId && scheduleSessionId) {
            if (!scheduleSessionDraftMap.has(scheduleSessionId)) {
              scheduleSessionDraftMap.set(scheduleSessionId, new Set());
            }
            scheduleSessionDraftMap.get(scheduleSessionId)!.add(draftShiftId);
          }
        });
      });
  
      scheduleSessionDraftMap.forEach((draftShiftIds, scheduleSessionId) => {
        draftDeletePayload.push({
          scheduleSessionId,
          shifts: Array.from(draftShiftIds).map(draftShiftId => ({
            draftShiftId,
            isDelete: true,
          })),
        });
      });
  
      console.log(
        "Draft delete payload after publish:",
        JSON.stringify(draftDeletePayload, null, 2)
      );

      if (draftDeletePayload.length > 0) {
        try {
          await createDraftScheduleSessions(draftDeletePayload);
        } catch (draftDeleteErr) {
          console.error("Failed to delete draft data after publish:", draftDeleteErr);
        }
      }
  
      toast({
        title: "Success",
        description: "Schedule published successfully!",
      });
  
      try {
        const clientId = selectedClient?.clientId;
        const addressId = selectedClient?.addressId;
        const formattedDate = convertDateFormat(selectedDate);
  
        if (selectedUserId) {
          await fetchScheduleData(undefined, undefined, formattedDate, selectedUserId);
        } else if (clientId && addressId) {
          await fetchScheduleData(clientId, addressId, formattedDate);
        }
        setIsPublishing(false);
      } catch (refreshError) {
        console.error("Error refreshing schedule data after publish:", refreshError);
      }
  
      setIsScheduleEditMode(false);
      setSchedulePublishModal({ isOpen: false });
  
    } catch (error: any) {
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
      setSchedulePublishModal({ isOpen: false });
    } finally {
      setIsPublishing(false);
    }
  };
  
  const cancelSchedulePublish = () => {
    setSchedulePublishModal({ isOpen: false });
  };

  // Callback to handle draft shift deletions
  // Note: The shift is already marked with isDelete: true in confirmDeleteShift
  // This callback is kept for compatibility but no longer needs to track deletions separately
  const handleDraftShiftDeletion = (shift: any) => {
    // Shift deletion is now handled by marking isDelete: true in scheduleData
    // No separate tracking needed
  };

  const handleSaveDraft = async () => {
    if (!scheduleData || scheduleData.length === 0) {
      toast({
        title: "Error",
        description: "No data available to save!",
        variant: "destructive",
      });
      return;
    }
  
    try {
      setIsSavingDraft(true);
  
      const selectedDateObj = parseLocalYMD(selectedDate);
      const weekRange = getWeekRangeFromDateLocal(selectedDateObj);
      const startDate = toLocalYMD(weekRange.startOfWeek);
      const endDate = toLocalYMD(weekRange.endOfWeek);
  
      // ---- helpers ----
      const normalizeYMD = (raw?: string) => {
        if (!raw) return "";
        if (raw.includes("T")) return raw.split("T")[0]; // ISO -> YYYY-MM-DD
        // already YYYY-MM-DD in your UI
        return raw;
      };
  
      const sameShift = (a: any, b: any) => {
        if (!a || !b) return false;
  
        // match by draftShiftId first (draft updates)
        const aDraftId = a?.draftShiftId ?? null;
        const bDraftId = b?.draftShiftId ?? null;
        if (aDraftId && bDraftId) return aDraftId === bDraftId;
  
        // otherwise match by shift.id (published shift update / same shift)
        return a?.id != null && b?.id != null && a.id === b.id;
      };
  
      const isShiftChanged = (curShift: any, curItem: any) => {
        const curDelete = curShift?.isDelete === true;
  
        const origItem = originalScheduleData?.find(
          (x) => x.userId === curItem.userId && x.startDate === curItem.startDate
        );
  
        const origShift = origItem?.shifts?.find((s: any) => sameShift(curShift, s)) ?? null;
  
        // deleted shift: send only if it existed before
        if (curDelete) {
          // If it has a real draftShiftId, it's persisted draft data -> must be sent for deletion
          if (curShift?.draftShiftId) return true;
        
          // If it belongs to a draftScheduleSession, also treat as change
          if (curShift?.draftScheduleSessionId) return true;
        
          // Otherwise fall back to original snapshot (covers non-draft deletes if you ever route them here)
          return !!origShift;
        }
        
  
        // brand new shift (not in original): send
        if (!origShift) return true;
  
        // compare fields
        const curDate = normalizeYMD(curShift.date || curItem.startDate);
        const origDate = normalizeYMD(origShift.date || origItem.startDate);
  
        return (
          curDate !== origDate ||
          curShift.startTime !== origShift.startTime ||
          curShift.endTime !== origShift.endTime ||
          Number(curShift.hours || 0) !== Number(origShift.hours || 0) ||
          Boolean(curShift.auto) !== Boolean(origShift.auto)
        );
      };
  
      // ---- group building ----
      type DraftSessionKey = string;
      type DraftSessionGroup = {
        draftScheduleSessionId: number | null;
        scheduleSessionId: number | null;
        clientId: number;
        addressId: number;
        userId: number;
        checkScheduleSessionId: number | null;
        auto: boolean;
  
        // all shifts (for weeklyHours)
        shiftsForHours: { isDelete: boolean; hours: number }[];
  
        // only changed/new/deleted shifts (payload)
        shiftsToSend: any[];
      };
  
      const draftSessionMap = new Map<DraftSessionKey, DraftSessionGroup>();
  
      scheduleData.forEach((item) => {
        const checkKey = `${item.clientId}-${item.addressId}-${item.userId}`;
        const checkScheduleSessionId = checkScheduleSessionIdMap.get(checkKey) || null;
  
        item.shifts.forEach((shift: any) => {
          const draftShiftId = shift?.draftShiftId ?? null;
          const draftScheduleSessionId = shift?.draftScheduleSessionId ?? null;
          const scheduleSessionId = shift?.scheduleSessionId ?? null;
  
          // Determine grouping key
          let sessionKey: DraftSessionKey;
          if (draftScheduleSessionId) {
            sessionKey = `draft-${draftScheduleSessionId}`;
          } else if (scheduleSessionId) {
            sessionKey = `existing-${scheduleSessionId}`;
          } else {
            sessionKey = `new-${item.userId}-${item.clientId}-${item.addressId}`;
          }
  
          if (!draftSessionMap.has(sessionKey)) {
            draftSessionMap.set(sessionKey, {
              draftScheduleSessionId,
              scheduleSessionId,
              clientId: item.clientId,
              addressId: item.addressId,
              userId: item.userId,
              checkScheduleSessionId,
              auto: item.auto || false,
              shiftsForHours: [],
              shiftsToSend: [],
            });
          }
  
          const group = draftSessionMap.get(sessionKey)!;
  
          const isDelete = shift?.isDelete === true;
  
          // always count for weeklyHours (even unchanged)
          group.shiftsForHours.push({
            isDelete,
            hours: shift?.hours || 0,
          });
  
          // only send if changed/new/deleted
          if (!isShiftChanged(shift, item)) return;
  
          const shiftDate = convertDateFormat(shift.date || item.startDate);
  
          const payloadShift: any = {
            isDelete,
            startTime: shift.startTime,
            endTime: shift.endTime,
            hours: shift.hours,
            auto: shift.auto || false,
            date: shiftDate,
          };
  
          // include draftShiftId ONLY if it's an existing draft shift (update/delete)
          if (draftShiftId) {
            payloadShift.draftShiftId = draftShiftId;
          } else {
            // for edited published shifts OR new shifts
            payloadShift.draftShiftId = null;
          }
  
          group.shiftsToSend.push(payloadShift);
        });
      });
  
      // ---- final payload ----
      const draftInput: any[] = [];
  
      draftSessionMap.forEach((group) => {
        if (group.shiftsToSend.length === 0) return;
  
        const weeklyHours = group.shiftsForHours
          .filter((s) => !s.isDelete)
          .reduce((t, s) => t + (s.hours || 0), 0);
  
        if (group.draftScheduleSessionId) {
          // Existing draft schedule session
          draftInput.push({
            draftScheduleSessionId: group.draftScheduleSessionId,
            shifts: group.shiftsToSend,
            weeklyHours: parseFloat(weeklyHours.toFixed(2)),
          });
        } else if (group.scheduleSessionId) {
          // Draft shifts attached to existing schedule session
          draftInput.push({
            scheduleSessionId: group.scheduleSessionId,
            shifts: group.shiftsToSend,
          });
        } else {
          // New draft schedule session
          draftInput.push({
            shifts: group.shiftsToSend,
            weeklyHours: parseFloat(weeklyHours.toFixed(2)),
            clientId: group.clientId,
            addressId: group.addressId,
            userId: group.userId,
            startDate: convertDateFormat(startDate),
            endDate: convertDateFormat(endDate),
            checkScheduleSessionId: group.checkScheduleSessionId,
            scheduleSessionId: null,
            auto: group.auto,
          });
        }
      });
  
      if (draftInput.length === 0) {
        toast({
          title: "Info",
          description: "No new or changed draft data to save.",
        });
        return;
      }
  
      console.log("DRAFT INPUT (changed only):", JSON.stringify(draftInput, null, 2));
      await createDraftScheduleSessions(draftInput);
  
      toast({
        title: "Success",
        description: "Draft schedule saved successfully!",
      });
  
      // refresh
      try {
        const clientId = selectedClient?.clientId;
        const addressId = selectedClient?.addressId;
        const formattedDate = convertDateFormat(selectedDate);
  
        if (selectedUserId) {
          await fetchScheduleData(undefined, undefined, formattedDate, selectedUserId);
        } else if (clientId && addressId) {
          await fetchScheduleData(clientId, addressId, formattedDate);
        }
      } catch (refreshError) {
        console.error("Error refreshing schedule data after save:", refreshError);
      }
    } catch (error: any) {
      let errorMessage = "Failed to save draft schedule. Please try again.";
  
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
    } finally {
      setIsSavingDraft(false);
    }
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
    const urlParams = getUrlParams();
    if (urlParams.viewClient) {
      navigate('/view-client-summary');
      return;
    }
    if (urlParams.viewEmployee) {
      navigate('/view-employee-summary');
      return;
    }
    setShowScheduleTable(false);
    setSelectedClient(null);
    setSelectedUserId(null);
    setSelectedUserDisplayName("");
    setModalOpen(false);
    setScheduleData([]);
    setSessionData([]);
    setCurrentWeekRange(null);
    setSelectedDate("");
    setIsScheduleEditMode(false);
    setIsActualTimeEditMode(false);
    setTableLoading(false);
    updateUrlParams({
      clientId: null,
      addressId: null,
      selectedDate: null,
      showSchedule: null,
      'view-client': null,
      'view-employee': null,
      userid: null
    });
  };
  const sessionsEqual = (a: any[], b: any[]) => {
    if (a.length !== b.length) return false;
    const normalizeSession = (s: any) => ({
      shiftId: s.shiftId || null,
      scheduleSessionId: s.scheduleSessionId || null,
      clockIn: s.clockIn || null,
      clockOut: s.clockOut || null,
    });
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
  const schedulesEqual = (a: ScheduleItem[], b: ScheduleItem[]) => {
    const normalize = (arr: ScheduleItem[]) =>
      [...arr]
        .map(item => ({
          ...item,
          shifts: [...item.shifts].sort((s1, s2) =>
            s1.startTime === s2.startTime
              ? (s1.endTime === s2.endTime ? (s1.id - s2.id) : s1.endTime.localeCompare(s2.endTime))
              : s1.startTime.localeCompare(s2.startTime)
          )
        }))
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
            base.clockOut = s.clockOut; 
          }
          return base;
        });
      const deletedItems: any[] = [];
      if (isActualTimeEditMode && originalSessionData.length > 0) {
        const currentSessionIds = new Set(sessionData.map(s => s.id));
        originalSessionData.forEach(originalSession => {
          if (originalSession.id <= 1700000000000 && !currentSessionIds.has(originalSession.id)) {
            deletedItems.push({
              shiftId: originalSession.shiftId,
              scheduleSessionId: originalSession.scheduleSessionId,
            });
          }
        });
      }
      const items = [...updatedItems, ...deletedItems];
      await updateSessionTimes(items);
      toast({
        title: "Success",
        description: "Actual time data published successfully!",
      });
      setIsActualTimeEditMode(false);
      setActualTimePublishModal({ isOpen: false });

    } catch (error: any) {
      console.error("Error publishing actual time data:", error);
      let errorMessage = "Failed to publish actual time data. Please try again.";

      if (error.message) {
        if (error.message.includes("No authentication token found")) {
          errorMessage = "Authentication token not found. Please log in again.";
        } else if (error.message.includes("Network Error") || error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else {
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
      setActualTimePublishModal({ isOpen: false });
    } finally {
      setIsActualTimePublishing(false);
    }
  };

  const cancelActualTimePublish = () => {
    setActualTimePublishModal({ isOpen: false });
  };
  const createImmutableScheduleCopy = (scheduleData: ScheduleItem[]) => {
    return scheduleData.map(item => ({
      ...item,
      shifts: item.shifts.map(shift => ({ ...shift })),
    }));
  };


  const handleSchedulePrint = async () => {
    try {
      setIsPrinting(true);
      await new Promise(resolve => setTimeout(resolve, 300));
      const cleanScheduleData = scheduleData.map(item => ({
        ...item,
        shifts: item.shifts.map(shift => ({
          ...shift,
          date: shift.date.split("T")[0],
        })),
      }));
      const tableContent = generateSchedulePrintableTable(cleanScheduleData, currentWeekRange, selectedClient);
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
  const calculateWorkedTimeForExcel = (session: any) => {
    if (!session.clockIn || !session.clockOut) {
      return 0;
    }
    if (session.clockIn === session.clockOut) {
      return 24.0; 
    }
    return calculateHours(session.clockIn, session.clockOut);
  };

  const handleActualTimeDownloadExcel = async () => {
    try {
      if (!currentWeekRange) throw new Error("Missing week range");
      const transformedData = [];
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
      uniqueUsers.forEach((user) => {
        const sessionsByDate = new Map();

        sessionData.forEach(session => {
          const scheduleItem = scheduleData.find(si =>
            si.shifts.some(shift => shift.id === session.shiftId)
          );

          if (scheduleItem && scheduleItem.userId === user.id) {
            const shift = scheduleItem.shifts.find(s => s.id === session.shiftId);
            if (shift) {
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
        sessionsByDate.forEach((sessions, date) => {
          sessions.forEach(session => {
            const hasCompleteTime = session.clockIn && session.clockOut;
            transformedData.push({
              userId: user.id,
              userName: user.name,
              startDate: date,
              shifts: [{
                id: session.shiftId,  
                startTime: session.clockIn || 'N/A',  
                endTime: session.clockOut || 'N/A',  
                hours: hasCompleteTime ? calculateWorkedTimeForExcel(session) : 'N/A'
              }]
            });
          });
        });
      });
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
      await new Promise(resolve => setTimeout(resolve, 300));

      const tableContent = generateActualTimePrintableTable(sessionData, scheduleData, currentWeekRange, selectedClient);
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

  useEffect(() => {
    if (showScheduleTable) return;

    const updateTableHeight = () => {
      if (!tableContainerRef.current) return;
      const { top } = tableContainerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const paddingBottom = 32;
      const available = Math.max(viewportHeight - top - paddingBottom, 320);
      setTableHeight(`${available}px`);
    };

    updateTableHeight();
    window.addEventListener("resize", updateTableHeight);

    return () => {
      window.removeEventListener("resize", updateTableHeight);
    };
  }, [showScheduleTable]);
  const isClientAndAddressSelected = !!selectedClient?.clientId && !!selectedClient?.addressId;
  return (
    <div className="w-full overflow-x-hidden p-6">
      {!showScheduleTable ? (
        <>
          {error ? (
            <p className="text-red-500">Error loading data: {error}</p>
          ) : (
            <div ref={tableContainerRef}>
              <GenericTable
                key={viewKey}
                data={tableData}
                columns={tableColumns}
                actions={tableActions}
                loading={loading}
                emptyMessage="No records found."
                searchable={true}
                tableHeight={tableHeight}
              />
            </div>
          )}

          <PeriodEndDateModal
            isOpen={isModalOpen}
            onClose={handleClosePeriodModal}
            onSubmit={handleDateSubmit}
            isLoading={tableLoading}
          />

          {noScheduleConfirmModal.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="mb-6">
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold"></h2>
            <div className="flex items-center space-x-4">
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
          {!scheduleLoading && !scheduleError && isScheduleEditMode && (
            <div ref={formRef} className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 space-y-2 grid mb-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">
                {scheduleData.length > 0 ? "Edit Schedule" : "Add New Schedule"}
              </h3>

              <form onSubmit={onSubmitAddGuard} autoComplete="off">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
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
            {selectedClient && !scheduleLoading && !tableLoading &&  (
              <div className="text-left">
                <div className="text-lg font-medium text-gray-800">
                {selectedUserId
                  ? (selectedUserDisplayName || "Employee")
                  : (selectedClient?.lastName && String(selectedClient?.name || "").trim().endsWith(String(selectedClient.lastName))
                    ? selectedClient?.name
                    : [selectedClient?.name, selectedClient?.lastName].filter(Boolean).join(" "))}
                </div>
               {selectedUserId ? null : <div className="text-sm text-gray-500">
                  {[selectedClient.address].filter(Boolean).join(", ")}
                </div>}
              </div>
            )}
            <div></div>
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
          {!scheduleError && !scheduleLoading && !tableLoading && (scheduleData.length === 0 || !hasApiData) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <div className="text-gray-500">
                <h3 className="text-lg font-medium mb-2">No Schedule Found</h3>
              </div>
            </div>
          )}
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
                onSave={handleSaveDraft}
                isSaving={isSavingDraft}
                onPrint={handleSchedulePrint}
                onDownloadExcel={handleScheduleDownloadExcel}
                onToggleEditMode={toggleScheduleEditMode}
                onDeleteSuccess={handleDeleteSuccess}
                onDraftShiftDeletion={handleDraftShiftDeletion}
                isPublishing={isPublishing}
                isPrinting={isPrinting}
                loading={scheduleLoading || tableLoading}
                onUserAutoToggle={handleUserAutoToggle}
                onShiftAutoToggle={handleShiftAutoToggle}
                apiExistingShiftsData={apiExistingShifts}
                hasChanges={hasScheduleChanges}
                selectedUserId={selectedUserId}
              />
            </div>
          )}
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
                selectedUserId={selectedUserId}
              />
            </div>
          )}
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

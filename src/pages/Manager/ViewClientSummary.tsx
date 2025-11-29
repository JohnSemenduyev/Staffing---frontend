import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiEye } from "react-icons/fi";
import { ChevronDown, X } from "lucide-react";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import { CustomDatePicker } from "../../components/CustomDatePicker";
import { Button } from "../../components/ui/button";
import { ErrorMessage } from "../../components/ui/error-message";
import { useClientSummary } from "../../context/ViewClientSummaryContext";
import { useNavigate } from "react-router-dom";
import { PeriodEndDateModal } from "../../components/ui/PeriodEndDateModal";
import { formatToMMDDYYYY } from "../../context/ViewTimeSummaryContext";
import { DateNavigation } from "./ViewSchedule";
import { getWeekRangeFromDateLocal, toLocalYMD, parseLocalYMD } from "../../lib/utils";
import { graphQLClient } from "../../GraphqlClient";
import { SCHEDULE_SESSIONS_BY_CLIENT_WEEK } from "../../graphql/queries";
import { toast } from "sonner";

const splitAddress = (address: string) => {
  if (!address || address === "-") {
    return { left: address || "-", right: "" };
  }
  const parts = address.split(",");
  if (parts.length <= 2) {
    return { left: address, right: "" }; 
  }
  const left = parts.slice(0, -2).join(",") + ",";
  const right = parts.slice(-2).map(p => p.trim()).join(", ");
  return { left, right };
};

const tableColumns: TableColumn[] = [
  { key: "clientName", label: "Client Name", sortable: true, searchable: true },
  { 
    key: "location", 
    label: "Location", 
    sortable: true, 
    searchable: true,
    render: (value: string) => {
      const { left, right } = splitAddress(value);
      return (
        <div className="flex flex-col">
          {left && <span>{left}</span>}
          {right && <span>{right}</span>}
        </div>
      );
    }
  },
  {
    key: "contractHours",
    label: "Contract Hours",
    sortable: true,
    searchable: true,
    className: "bg-blue-100",
  },
  {
    key: "totalWeeklyHours",
    label: "Scheduled Hours",
    sortable: true,
    searchable: true,
    className: "bg-blue-100",
  },
  {
    key: "diffContractMinusScheduled",
    label: "Difference",
    sortable: true,
    searchable: true,
    className: "bg-blue-100",
  },
  {
    key: "unconfirmedHours",
    label: "Unconfirmed Hours",
    sortable: true,
    searchable: true,
    className: "bg-green-100",
  },
  {
    key: "rejectedHours",
    label: "Rejected Hours",
    sortable: true,
    searchable: true,
    className: "bg-green-100",
  },
  {
    key: "scheduledHoursActual",
    label: "Scheduled Hours",
    sortable: true,
    searchable: true,
    className: "bg-red-100",
  },
  {
    key: "totalActualHours",
    label: "Actual Hours",
    sortable: true,
    searchable: true,
    className: "bg-red-100",
  },
  {
    key: "diffScheduledMinusActual",
    label: "Difference",
    sortable: true,
    searchable: true,
    className: "bg-red-100",
  },
  {
    key: "contractHoursActual",
    label: "Contract Hours",
    sortable: true,
    searchable: true,
    className: "bg-yellow-100",
  },
  {
    key: "totalActualHoursContract",
    label: "Actual Hours",
    sortable: true,
    searchable: true,
    className: "bg-yellow-100",
  },
  {
    key: "diffContractMinusActual",
    label: "Difference",
    sortable: true,
    searchable: true,
    className: "bg-yellow-100",
  },
];


type FilterOption = 
  | "contractVsScheduled" 
  | "unconfirmed" 
  | "rejected" 
  | "scheduledVsActual" 
  | "contractVsActual";

const filterOptions: { value: FilterOption; label: string }[] = [
  { value: "contractVsScheduled", label: "Contract vs Scheduled" },
  { value: "unconfirmed", label: "Unconfirmed" },
  { value: "rejected", label: "Rejected" },
  { value: "scheduledVsActual", label: "Scheduled vs Actual" },
  { value: "contractVsActual", label: "Contract vs Actual" },
];

export const ViewClientSummary = () => {
  const { data, loading, error, fetchClientSummary } = useClientSummary();
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [showDateModal, setShowDateModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [noScheduleModal, setNoScheduleModal] = useState<{
    isOpen: boolean;
    clientName: string;
    clientId: number | null;
    addressId: number | null;
    selectedDate: string;
  }>({
    isOpen: false,
    clientName: "",
    clientId: null,
    addressId: null,
    selectedDate: ""
  });
  const [tableHeight, setTableHeight] = useState<string>("500px");
  const formRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [date, setDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState("");
  const [currentWeekRange, setCurrentWeekRange] = useState<any>(null);
  const [selectedFilters, setSelectedFilters] = useState<FilterOption[]>([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const navigate = useNavigate();

   const handleView = (rowData: any) => {
    setSelectedRow(rowData);
    setShowDateModal(true);
  };

  const formatDateForApi = (ymd: string) => {
    if (!ymd) return "";
    const [year, month, day] = ymd.split("-");
    return `${month}-${day}-${year}`;
  };

  const handleDateSubmit = async (value: string) => {
    if (!selectedRow) {
      console.error("No row selected");
      return;
    }
    const clientId = selectedRow.clientId;
    const addressId = selectedRow.addressId;

    if (!clientId || !addressId) {
      console.error("Missing clientId or addressId");
      return;
    }
    const dateToUse = value || selectedDate || toLocalYMD(new Date());
    const week = getWeekRangeFromDateLocal(parseLocalYMD(dateToUse));
    const weekStartStr = toLocalYMD(week.startOfWeek);

    setModalLoading(true);
    try {
      const { ScheduleSessionsByClientWeek = [] } = await graphQLClient.request<{
        ScheduleSessionsByClientWeek: any[];
      }>(SCHEDULE_SESSIONS_BY_CLIENT_WEEK, {
        clientId,
        addressId,
        date: formatDateForApi(weekStartStr),
      });

      if (!ScheduleSessionsByClientWeek.length) {
        setShowDateModal(false);
        setNoScheduleModal({
          isOpen: true,
          clientName: selectedRow?.clientName || "",
          clientId,
          addressId,
          selectedDate: weekStartStr,
        });
        return;
      }

      navigate(
        `/view-schedule?clientId=${clientId}&addressId=${addressId}&selectedDate=${weekStartStr}&showSchedule=true&view-client=true`
      );
      setSelectedRow(null);
      setShowDateModal(false);
    } catch (error) {
      console.error("Failed to load schedule data:", error);
      toast.error("Failed to load schedule data. Please try again.");
    } finally {
      setModalLoading(false);
    }
  };

  const tableActions: TableAction[] = [
    {
      label: "View",
      icon: <FiEye className="w-4 h-4" />,
      onClick: handleView,
      className: "text-blue-500 hover:text-green-700 ml-4 px-1",
      title: "View"
    }
  ];

  // Handle filter toggle
  const handleFilterToggle = (filter: FilterOption) => {
    setSelectedFilters((prev) => {
      if (prev.includes(filter)) {
        return prev.filter((f) => f !== filter);
      } else {
        return [...prev, filter];
      }
    });
  };

  // Handle "All Fields" toggle
  const handleAllFieldsToggle = () => {
    if (selectedFilters.length === filterOptions.length) {
      setSelectedFilters([]);
    } else {
      setSelectedFilters(filterOptions.map((opt) => opt.value));
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showFilterDropdown) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilterDropdown]);

  useEffect(() => {
    const { startOfWeek } = getWeekRangeFromDateLocal(formatToMMDDYYYY(today));
    const weekStartStr = toLocalYMD(startOfWeek);
    setDate(weekStartStr);
    setSelectedDate(weekStartStr);
    const weekRange = getWeekRangeFromDateLocal(parseLocalYMD(weekStartStr));
    setCurrentWeekRange(weekRange);
    fetchClientSummary(weekStartStr);
  }, [today, fetchClientSummary]);

  const formatValue = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return Number(value).toFixed(2);
  };

  const rows = useMemo(
    () =>
      (data || []).map((item) => ({
        clientId: item.clientId,
        addressId: item.addressId,
        clientName: item.clientName || "-",
        location: item.address || "-",
        contractHours: formatValue(item.contractHours),
        totalWeeklyHours: formatValue(item.totalWeeklyHours),
        diffContractMinusScheduled: formatValue(item.diffContractMinusScheduled),
        unconfirmedHours: formatValue(item.unconfirmedHours),
        rejectedHours: formatValue(item.rejectedHours),
        scheduledHoursActual: formatValue(item.totalWeeklyHours),
        totalActualHours: formatValue(item.totalActualHours),
        diffScheduledMinusActual: formatValue(item.diffScheduledMinusActual),
        contractHoursActual: formatValue(item.contractHours),
        totalActualHoursContract: formatValue(item.totalActualHours),
        diffContractMinusActual: formatValue(item.diffContractMinusActual),
      })),
    [data]
  );
  const validateAndNavigate = async (newDate: string) => {
    const week = getWeekRangeFromDateLocal(parseLocalYMD(newDate));
    const weekStartStr = toLocalYMD(week.startOfWeek);
    setSelectedDate(weekStartStr);
    const weekRange = getWeekRangeFromDateLocal(parseLocalYMD(weekStartStr));
    setCurrentWeekRange(weekRange);
    setDate(weekStartStr);
    await fetchClientSummary(weekStartStr);
  };

  // Filter columns based on selected options
  const filteredColumns = useMemo(() => {
    const baseColumns: TableColumn[] = [
      { key: "clientName", label: "Client Name", sortable: true, searchable: true },
      { 
        key: "location", 
        label: "Location", 
        sortable: true, 
        searchable: true,
        render: (value: string) => {
          const { left, right } = splitAddress(value);
          return (
            <div className="flex flex-col">
              {left && <span>{left}</span>}
              {right && <span>{right}</span>}
            </div>
          );
        }
      },
    ];

    // If all filters are selected or no filters selected, show all columns
    if (selectedFilters.length === 0 || selectedFilters.length === filterOptions.length) {
      return tableColumns;
    }

    const additionalColumns: TableColumn[] = [];

    // Add columns based on selected filters
    selectedFilters.forEach((filter) => {
      switch (filter) {
        case "contractVsScheduled":
          additionalColumns.push(
            {
              key: "contractHours",
              label: "Contract Hours",
              sortable: true,
              searchable: true,
              className: "bg-blue-100",
            },
            {
              key: "totalWeeklyHours",
              label: "Scheduled Hours",
              sortable: true,
              searchable: true,
              className: "bg-blue-100",
            },
            {
              key: "diffContractMinusScheduled",
              label: "Difference",
              sortable: true,
              searchable: true,
              className: "bg-blue-100",
            }
          );
          break;
        case "unconfirmed":
          additionalColumns.push({
            key: "unconfirmedHours",
            label: "Unconfirmed Hours",
            sortable: true,
            searchable: true,
            className: "bg-green-100"
          });
          break;
        case "rejected":
          additionalColumns.push({
            key: "rejectedHours",
            label: "Rejected Hours",
            sortable: true,
            searchable: true,
            className: "bg-green-100"
          });
          break;
        case "scheduledVsActual":
          additionalColumns.push(
            {
              key: "scheduledHoursActual",
              label: "Scheduled Hours",
              sortable: true,
              searchable: true,
              className: "bg-red-100"
            },
            {
              key: "totalActualHours",
              label: "Actual Hours",
              sortable: true,
              searchable: true,
              className: "bg-red-100"
            },
            {
              key: "diffScheduledMinusActual",
              label: "Difference",
              sortable: true,
              searchable: true,
              className: "bg-red-100"
            }
          );
          break;
        case "contractVsActual":
          additionalColumns.push(
            {
              key: "contractHoursActual",
              label: "Contract Hours",
              sortable: true,
              searchable: true,
              className: "bg-yellow-100"
            },
            {
              key: "totalActualHoursContract",
              label: "Actual Hours",
              sortable: true,
              searchable: true,
              className: "bg-yellow-100"
            },
            {
              key: "diffContractMinusActual",
              label: "Difference",
              sortable: true,
              searchable: true,
              className: "bg-yellow-100"
            }
          );
          break;
      }
    });

    return [...baseColumns, ...additionalColumns];
  }, [selectedFilters]);

  useEffect(() => {
    if (filteredColumns) return;

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
  }, [filteredColumns]);

  return (
    <div className="w-full p-6 space-y-4">
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 space-y-4">
        <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-800">View Client Summary</h1>
          <div className="flex items-center gap-4">
          <div className="relative" ref={filterDropdownRef}>
            <button
              type="button"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="w-[250px] h-[40px] px-3 py-2 text-sm border border-gray-300 rounded-md bg-white flex items-center gap-2 cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#004175]"
            >
              <div 
                className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden filter-tags-scrollbar"
              >
                {selectedFilters.length === 0 ? (
                  <span className="text-gray-400 text-sm whitespace-nowrap">Select columns...</span>
                ) : selectedFilters.length === filterOptions.length ? (
                  <span className="text-gray-900 text-sm whitespace-nowrap">All Fields</span>
                ) : (
                  <div className="flex gap-1 items-center" style={{ width: 'max-content' }}>
                    {selectedFilters.map((filter) => {
                      const option = filterOptions.find((opt) => opt.value === filter);
                      return (
                        <span
                          key={filter}
                          className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs whitespace-nowrap flex-shrink-0"
                        >
                          {option?.label}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFilterToggle(filter);
                            }}
                            className="hover:bg-blue-200 rounded-full p-0.5 flex-shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>

            {showFilterDropdown && (
              <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-64 overflow-y-auto z-50">
                <div className="p-2 border-b">
                  <label className="flex items-center font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFilters.length === filterOptions.length}
                      onChange={handleAllFieldsToggle}
                      className="mr-2 accent-blue-600"
                    />
                    <span>All Fields</span>
                  </label>
                </div>
                {filterOptions.map((option) => (
                  <div key={option.value} className="p-2 border-b last:border-b-0">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFilters.includes(option.value)}
                        onChange={() => handleFilterToggle(option.value)}
                        className="mr-2 accent-blue-600"
                      />
                      <span className={selectedFilters.includes(option.value) ? "text-blue-800 font-medium" : "text-gray-700"}>
                        {option.label}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DateNavigation
            selectedDate={selectedDate}
            onDateChange={validateAndNavigate}
            currentWeekRange={currentWeekRange}
          />
          </div>
        </div>
        {error && <ErrorMessage message={error} />}
      </div>

      <div ref={tableContainerRef}>
      <GenericTable
        data={rows}
        columns={filteredColumns}
        actions={tableActions}
        tableHeight={tableHeight}
        emptyMessage="No client summary records available."
        loading={loading}
      />
      </div>
      {showDateModal && (
        <div className = "mt-[-20px]">
        <PeriodEndDateModal
          isOpen={showDateModal}
          onClose={() => setShowDateModal(false)}
          onSubmit={handleDateSubmit}
          isLoading={modalLoading}
        />
        </div>
      )}
      {noScheduleModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <p className="text-gray-700 text-base">
              No schedule found for <span className="font-semibold">{noScheduleModal.clientName}</span> on this week
              range.
            </p>
            <p className="text-sm text-gray-500 mt-3">Do you want to prepare a schedule?</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  setNoScheduleModal({ isOpen: false, clientName: "", clientId: null, addressId: null, selectedDate: "" })
                }
              >
                No
              </Button>
              <Button
                onClick={() => {
                  const { clientId, addressId, selectedDate } = noScheduleModal;
                  setNoScheduleModal({
                    isOpen: false,
                    clientName: "",
                    clientId: null,
                    addressId: null,
                    selectedDate: ""
                  });
                  if (clientId && addressId) {
                    navigate(`/prepare-schedule`);
                  }
                }}
              >
                Yes
              </Button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiEye } from "react-icons/fi";
import { ChevronDown, X } from "lucide-react";
import { FaFilePdf, FaFileExport } from "react-icons/fa";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import { CustomDatePicker } from "../../components/CustomDatePicker";
import { Button } from "../../components/ui/button";
import { ErrorMessage } from "../../components/ui/error-message";
import { useClientSummary } from "../../context/ViewClientSummaryContext";
import { useNavigate } from "react-router-dom";
import { PeriodEndDateModal } from "../../components/ui/PeriodEndDateModal";
import { DateNavigation } from "./ViewSchedule";
import { getWeekRangeFromDateLocal, toLocalYMD, parseLocalYMD } from "../../lib/utils";
import { graphQLClient } from "../../GraphqlClient";
import { SCHEDULE_SESSIONS_BY_CLIENT_WEEK } from "../../graphql/queries";
import { exportToPDF, exportToExcel, ExportColumn } from "../../utils/exportData";
import { useToast } from "../../hooks/use-toast";

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

const columnGroups = [
  {
    filters: ["contractVsScheduled"] as FilterOption[],
    columns: [
      { key: "contractHours", filter: "contractVsScheduled" as FilterOption },
      { key: "totalWeeklyHours", filter: "contractVsScheduled" as FilterOption },
      { key: "diffContractMinusScheduled", filter: "contractVsScheduled" as FilterOption },
    ],
  },
  {
    filters: ["unconfirmed", "rejected"] as FilterOption[],
    columns: [
      { key: "unconfirmedHours", filter: "unconfirmed" as FilterOption },
      { key: "rejectedHours", filter: "rejected" as FilterOption },
    ],
  },
  {
    filters: ["scheduledVsActual"] as FilterOption[],
    columns: [
      { key: "scheduledHoursActual", filter: "scheduledVsActual" as FilterOption },
      { key: "totalActualHours", filter: "scheduledVsActual" as FilterOption },
      { key: "diffScheduledMinusActual", filter: "scheduledVsActual" as FilterOption },
    ],
  },
  {
    filters: ["contractVsActual"] as FilterOption[],
    columns: [
      { key: "contractHoursActual", filter: "contractVsActual" as FilterOption },
      { key: "totalActualHoursContract", filter: "contractVsActual" as FilterOption },
      { key: "diffContractMinusActual", filter: "contractVsActual" as FilterOption },
    ],
  },
];

export const ViewClientSummary = () => {
  const { data, loading, error, fetchClientSummary } = useClientSummary();
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [showDateModal, setShowDateModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const {toast} = useToast();
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
      toast({
      title: "ERROR",
      description: "Failed to load schedule data",
      variant: "destructive",
      duration: 3000,
    });
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
    // When all fields are effectively selected (either explicitly or by default),
    // clicking "All Fields" will clear explicit selections and rely on the default.
    if (selectedFilters.length === 0 || selectedFilters.length === filterOptions.length) {
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
    const { startOfWeek } = getWeekRangeFromDateLocal(parseLocalYMD(today));
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

  // Export-only rows with numeric hour fields for Excel (same keys as rows)
  const excelExportRows = useMemo(
    () =>
      (data || []).map((item) => ({
        clientId: item.clientId,
        addressId: item.addressId,
        clientName: item.clientName || "-",
        location: item.address || "-",
        contractHours: item.contractHours ?? null,
        totalWeeklyHours: item.totalWeeklyHours ?? null,
        diffContractMinusScheduled: item.diffContractMinusScheduled ?? null,
        unconfirmedHours: item.unconfirmedHours ?? null,
        rejectedHours: item.rejectedHours ?? null,
        scheduledHoursActual: item.totalWeeklyHours ?? null,
        totalActualHours: item.totalActualHours ?? null,
        diffScheduledMinusActual: item.diffScheduledMinusActual ?? null,
        contractHoursActual: item.contractHours ?? null,
        totalActualHoursContract: item.totalActualHours ?? null,
        diffContractMinusActual: item.diffContractMinusActual ?? null,
      })),
    [data]
  );

  // Export column definitions matching the table structure
  const exportColumns: ExportColumn[] = useMemo(() => {
    const baseColumns: ExportColumn[] = [
      { key: "clientName", header: "Client Name", borderLeft: true, borderRight: true },
      { key: "location", header: "Location", borderLeft: true, borderRight: true },
    ];

    // Add columns based on selected filters (or all if none selected)
    const allFilterValues = filterOptions.map((f) => f.value);
    const activeFilterSet = new Set<FilterOption>(
      selectedFilters.length === 0 || selectedFilters.length === filterOptions.length
        ? allFilterValues
        : selectedFilters
    );

    // Contract vs Scheduled
    if (activeFilterSet.has("contractVsScheduled")) {
      baseColumns.push(
        { key: "contractHours", header: "Contract Hours", borderLeft: true, align: "center" },
        { key: "totalWeeklyHours", header: "Scheduled Hours", align: "center" },
        { key: "diffContractMinusScheduled", header: "Difference", borderRight: true, align: "center" }
      );
    }

    // Unconfirmed and Rejected
    if (activeFilterSet.has("unconfirmed")) {
      baseColumns.push({ key: "unconfirmedHours", header: "Unconfirmed Hours", borderLeft: true, borderRight: true, align: "center" });
    }
    if (activeFilterSet.has("rejected")) {
      baseColumns.push({ key: "rejectedHours", header: "Rejected Hours", borderLeft: true, borderRight: true, align: "center" });
    }

    // Scheduled vs Actual
    if (activeFilterSet.has("scheduledVsActual")) {
      baseColumns.push(
        { key: "scheduledHoursActual", header: "Scheduled Hours", borderLeft: true, align: "center" },
        { key: "totalActualHours", header: "Actual Hours", align: "center" },
        { key: "diffScheduledMinusActual", header: "Difference", borderRight: true, align: "center" }
      );
    }

    // Contract vs Actual
    if (activeFilterSet.has("contractVsActual")) {
      baseColumns.push(
        { key: "contractHoursActual", header: "Contract Hours", borderLeft: true, align: "center" },
        { key: "totalActualHoursContract", header: "Actual Hours", align: "center" },
        { key: "diffContractMinusActual", header: "Difference", borderRight: true, align: "center" }
      );
    }

    return baseColumns;
  }, [selectedFilters]);

  // Handle PDF export
  const handleExportToPDF = () => {
    if (!rows || rows.length === 0) {
      toast({title : "ERROR", description : "No data to export."});
      return;
    }

    const weekStart = selectedDate || toLocalYMD(new Date());
    const timestamp = weekStart.replace(/-/g, "");
    exportToPDF(rows, exportColumns, {
      title: "Client Summary",
      fileName: `client_summary_${timestamp}.pdf`,
    });
    toast({title : "SUCCESS", description : "PDF exported successfully!"});
  };

  // Handle Excel export
  const handleExportToExcel = async () => {
    if (!excelExportRows || excelExportRows.length === 0) {
      toast({title : "ERROR", description : "No data to export."});
      return;
    }

    const weekStart = selectedDate || toLocalYMD(new Date());
    const timestamp = weekStart.replace(/-/g, "");
    const result = await exportToExcel(excelExportRows, exportColumns, {
      fileName: `client_summary_${timestamp}`,
      includeTimestamp: false,
      worksheetName: "Client Summary",
    });

    if (result.success) {
      toast({title : "SUCCESS", description : `Excel file exported successfully: ${result.filename}`});
    } else {
      toast({title : "ERROR", description : result.error || "Failed to export Excel file"});
    }
  };
  const validateAndNavigate = async (newDate: string) => {
    const week = getWeekRangeFromDateLocal(parseLocalYMD(newDate));
    const weekStartStr = toLocalYMD(week.startOfWeek);
    setSelectedDate(weekStartStr);
    const weekRange = getWeekRangeFromDateLocal(parseLocalYMD(weekStartStr));
    setCurrentWeekRange(weekRange);
    setDate(weekStartStr);
    await fetchClientSummary(weekStartStr);
  };

  const tableColumnMap = useMemo(() => {
    const map = new Map<string, TableColumn>();
    tableColumns.forEach((col) => {
      map.set(col.key, col);
    });
    return map;
  }, []);

  const filteredColumns = useMemo(() => {
    const baseColumns: TableColumn[] = [
      { key: "clientName", label: "Client Name", sortable: true, searchable: true },
      { 
        key: "location", 
        label: "Location", 
        sortable: true, 
        searchable: true,
        headerClassName: "border-r border-r-gray-800",
        searchHeaderClassName: "border-r border-r-gray-800",   // ✅ already added
        className: "border-r border-r-gray-800",
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
  
    const allFilterValues = filterOptions.map((f) => f.value);
    const activeFilterSet = new Set<FilterOption>(
      selectedFilters.length === 0 || selectedFilters.length === filterOptions.length
        ? allFilterValues
        : selectedFilters
    );
  
    const columns: TableColumn[] = [...baseColumns];
    let groupColorIndex = 0;
  
    columnGroups.forEach((group) => {
      const groupHasActive = group.filters.some((filter) =>
        activeFilterSet.has(filter)
      );
      if (!groupHasActive) return;
  
      const activeColumnsInGroup = group.columns.filter(({ filter }) =>
        activeFilterSet.has(filter)
      );
      if (activeColumnsInGroup.length === 0) return;
  
      const groupBg = groupColorIndex % 2 === 0 ? "bg-gray-100" : "bg-white";
      groupColorIndex += 1;
  
      activeColumnsInGroup.forEach((colDef, idx) => {
        const baseDef = tableColumnMap.get(colDef.key);
        if (!baseDef) return;
  
        const borders: string[] = [];
  
        if (idx === 0) {
          borders.push("border-l border-l-gray-400");
        }
        if (idx === activeColumnsInGroup.length - 1) {
          borders.push("border-r border-r-gray-800");
        }
  
        const borderClass = borders.join(" ");
        const combinedClassName = [groupBg, borderClass, "pl-10"]
          .filter(Boolean)
          .join(" ")
          .trim();
  
        const combinedHeaderClassName = [baseDef.headerClassName, borderClass]
          .filter(Boolean)
          .join(" ")
          .trim();
  
        columns.push({
          ...baseDef,
          className: combinedClassName,
          headerClassName: combinedHeaderClassName || undefined,
          searchHeaderClassName: combinedHeaderClassName || undefined, // 👈 ADD THIS
        });
      });
    });
  
    return columns;
  }, [selectedFilters, tableColumnMap]);
  
  

  // Dynamically adjust table height based on viewport, similar to ViewSchedule
  useEffect(() => {
    const updateTableHeight = () => {
      if (!tableContainerRef.current) return;
      const { top } = tableContainerRef.current.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;
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
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-xl font-semibold text-gray-800">View Client Summary</h1>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-[250px]" ref={filterDropdownRef}>
            <button
              type="button"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="w-full h-[40px] px-3 py-2 text-sm border border-gray-300 rounded-md bg-white flex items-center gap-2 cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#004175]"
            >
              <div 
                className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden filter-tags-scrollbar"
              >
                {selectedFilters.length === 0 || selectedFilters.length === filterOptions.length ? (
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
                      checked={
                        selectedFilters.length === 0 ||
                        selectedFilters.length === filterOptions.length
                      }
                      onChange={handleAllFieldsToggle}
                      className="mr-2 accent-blue-600"
                    />
                    <span>All Fields</span>
                  </label>
                </div>
                {filterOptions.map((option) => (
                  <div key={option.value} className="p-2 ">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          selectedFilters.length === 0 ||
                          selectedFilters.includes(option.value)
                        }
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
          <div className="w-full md:w-auto">
            <DateNavigation
              selectedDate={selectedDate}
              onDateChange={validateAndNavigate}
              currentWeekRange={currentWeekRange}
            />
          </div>
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

      {/* Export buttons below table, above any future pagination */}
      {!loading && rows && rows.length > 0 && (
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={handleExportToPDF}
            className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            title="Export to PDF"
          >
            <FaFilePdf className="w-5 h-5" />
          </button>
          <button
            onClick={handleExportToExcel}
            className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            title="Export to Excel"
          >
            <FaFileExport className="w-5 h-5" />
          </button>
        </div>
      )}
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

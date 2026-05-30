import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiEye } from "react-icons/fi";
import { FaFilePdf, FaFileExport } from "react-icons/fa";
import { Button } from "../../components/ui/button";
import { ErrorMessage } from "../../components/ui/error-message";
import { useEmployeeSummary, type EmployeeHoursSummary } from "../../context/ViewEmployeeSummaryContext";
import { PeriodEndDateModal } from "../../components/ui/PeriodEndDateModal";
import { useNavigate } from "react-router-dom";
import {
  getWeekRangeFromDateLocal,
  toLocalYMD,
  parseLocalYMD,
} from "../../lib/utils";
import { DateNavigation } from "./ViewSchedule";
import { graphQLClient } from "../../GraphqlClient";
import { SCHEDULE_SESSIONS_BY_CLIENT_WEEK } from "../../graphql/queries";
import ResetButton from "../../components/ui/ResetButton";
import Pagination from "../../components/Pagination";
import { useDebounce } from "../../hooks/useDebounce";
import { exportToPDF, exportToExcel, ExportColumn } from "../../utils/exportData";
import { toast } from "sonner";

type EmployeeSummaryRow = {
  userId?: string | number;
  employeeName: string;
  regularScheduled: number | string;
  regularActual: number | string;
  regularDifference: number | string;
  overtimeScheduled: number | string;
  overtimeActual: number | string;
  overtimeDifference: number | string;
};

type SortKey =
  | "regularScheduled"
  | "regularActual"
  | "regularDifference"
  | "overtimeScheduled"
  | "overtimeActual"
  | "overtimeDifference";

export const ViewEmployeeSummary: React.FC = () => {
  const { data, totals, loading, error, fetchEmployeeSummary, currentPage, lastPage, setCurrentPage } = useEmployeeSummary();
  const today = useMemo(
    () => new Date().toISOString().split("T")[0],
    []
  );

  const [date, setDate] = useState<Date | null>(null);
  const [navigationSource, setNavigationSource] = useState<
    "week" | "modal" | null
  >(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [currentWeekRange, setCurrentWeekRange] = useState<any>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState<EmployeeSummaryRow | null>(
    null
  );
  const [modalLoading, setModalLoading] = useState(false);
  const [noScheduleModal, setNoScheduleModal] = useState({
    isOpen: false,
    userName: "",
    selectedDate: "",
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [tableHeight, setTableHeight] = useState<string>("500px");
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const navigate = useNavigate();
  const [exportLoading, setExportLoading] = useState<{ pdf: boolean; excel: boolean }>({ pdf: false, excel: false });
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey | null;
    direction: "asc" | "desc";
  }>({
    key: null,
    direction: "asc",
  });

  // initial load
  useEffect(() => {
    const { startOfWeek } = getWeekRangeFromDateLocal(parseLocalYMD(today));
    const weekStartStr = toLocalYMD(startOfWeek);
    setDate(startOfWeek);
    setSelectedDate(weekStartStr);

    const weekRange = getWeekRangeFromDateLocal(parseLocalYMD(weekStartStr));
    setCurrentWeekRange(weekRange);
    setCurrentPage(1);
    fetchEmployeeSummary(weekStartStr, 1, 10,false, "");
  }, [today, fetchEmployeeSummary, setCurrentPage]);

  useEffect(() => {
  if (isInitialMount.current) {
    isInitialMount.current = false;
    return;
  }

  if (selectedDate) {
    setCurrentPage(1);
    fetchEmployeeSummary(selectedDate, 1, 10, false, debouncedSearchTerm);
  }
}, [debouncedSearchTerm]);

  const formatDateForApi = (ymd: string) => {
    if (!ymd) return "";
    const [year, month, day] = ymd.split("-");
    return `${month}-${day}-${year}`;
  };

  console.log(noScheduleModal)

  const handleDateSubmit = async (value: string) => {
    if (!selectedRow) {
      console.error("No employee selected");
      return;
    }
    const userId = selectedRow.userId;
    if (!userId) {
      console.error("Missing userId for selected employee");
      return;
    }

    const dateToUse = value || selectedDate || toLocalYMD(new Date());
    const week = getWeekRangeFromDateLocal(parseLocalYMD(dateToUse));
    const weekStartStr = toLocalYMD(week.startOfWeek);

    setModalLoading(true);
    try {
      const { ScheduleSessionsByClientWeek = [] } =
        await graphQLClient.request<{
          ScheduleSessionsByClientWeek: any[];
        }>(SCHEDULE_SESSIONS_BY_CLIENT_WEEK, {
          userid: Number(userId),
          date: formatDateForApi(weekStartStr),
        });

      if (!ScheduleSessionsByClientWeek.length) {
        setShowDateModal(false);
        setNoScheduleModal({
          isOpen: true,
          userName: selectedRow.employeeName || "",
          selectedDate: weekStartStr,
        });
        return;
      }

      navigate(
        `/view-schedule?userid=${userId}&selectedDate=${weekStartStr}&showSchedule=true&view-employee=true`
      );
      setSelectedRow(null);
      setShowDateModal(false);
    } catch (error) {
      console.error("Failed to load schedule data", error);
    } finally {
      setModalLoading(false);
    }
  };

  const formatValue = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return Number(value).toFixed(2);
  };

  const rows: EmployeeSummaryRow[] = useMemo(() => {
    return (data || []).map((item) => ({
      userId: item.userId,
      employeeName: item.userName || "-",
      regularScheduled: formatValue(item.scheduledHours),
      regularActual: formatValue(item.actualHours),
      regularDifference: formatValue(item.diffScheduledMinusActual),
      overtimeScheduled: formatValue(item.overTimeSchedule),
      overtimeActual: formatValue(item.overTimeActualHours),
      overtimeDifference: formatValue(
        item.overTimediffScheduledMinusActual
      ),
    }));
  }, [data]);

  // No client-side filtering needed - server handles it
  const filteredRows = rows;

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) {
      return filteredRows;
    }
  
    const key = sortConfig.key;
    const directionMultiplier = sortConfig.direction === "asc" ? 1 : -1;
  
    const parseValue = (value: number | string) => {
      if (value === "-" || value === null || value === undefined) return null;
      const numeric = Number(value);
      if (!Number.isNaN(numeric)) return numeric;
      return String(value).toLowerCase();
    };
  
    return [...filteredRows].sort((a, b) => {
      const aValue = parseValue(a[key]);
      const bValue = parseValue(b[key]);
  
      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * directionMultiplier;
      }
  
      const aStr = String(aValue ?? "");
      const bStr = String(bValue ?? "");
      if (aStr === bStr) return 0;
      return aStr.localeCompare(bStr) * directionMultiplier;
    });
  }, [filteredRows, sortConfig]);


  // Export column definitions matching the table structure
  const exportColumns: ExportColumn[] = useMemo(() => [
    { key: "employeeName", header: "Employee Name" },
    { key: "regularScheduled", header: "Regular Scheduled Hours" },
    { key: "regularActual", header: "Regular Actual Hours" },
    { key: "regularDifference", header: "Regular Difference" },
    { key: "overtimeScheduled", header: "Overtime Scheduled Hours" },
    { key: "overtimeActual", header: "Overtime Actual Hours" },
    { key: "overtimeDifference", header: "Overtime Difference" },
  ], []);

const fetchAllEmployeeSummaryForExport = async (): Promise<EmployeeSummaryRow[]> => {
  try {
    const weekStart = selectedDate || toLocalYMD(new Date());

    const allData = await fetchEmployeeSummary(
      weekStart,
      1,
      10,
      true,
      debouncedSearchTerm
    ) as EmployeeHoursSummary[];

    if (!allData || allData.length === 0) return [];

    return allData.map((item) => ({
      userId: item.userId,
      employeeName: item.userName || "-",
      regularScheduled: formatValue(item.scheduledHours),
      regularActual: formatValue(item.actualHours),
      regularDifference: formatValue(item.diffScheduledMinusActual),
      overtimeScheduled: formatValue(item.overTimeSchedule),
      overtimeActual: formatValue(item.overTimeActualHours),
      overtimeDifference: formatValue(item.overTimediffScheduledMinusActual),
    }));
  } catch (error) {
    console.error("Error fetching employee summary for export:", error);
    toast.error("Failed to fetch all employee data for export.");
    throw error;
  }
};

  const handleExportToPDF = async () => {
    setExportLoading(prev => ({ ...prev, pdf: true }));
    try {
      const allData = await fetchAllEmployeeSummaryForExport();
      if (!allData || allData.length === 0) {
        toast.error("No data to export. Please select a date range with data.");
        return;
      }

      const weekStart = selectedDate || toLocalYMD(new Date());
      const timestamp = weekStart.replace(/-/g, "");
      exportToPDF(allData, exportColumns, {
        title: "Employee Summary",
        fileName: `employee_summary_${timestamp}.pdf`,
      });
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export PDF");
    } finally {
      setExportLoading(prev => ({ ...prev, pdf: false }));
    }
  };

  const handleExportToExcel = async () => {
    setExportLoading(prev => ({ ...prev, excel: true }));
    try {
      const allData = await fetchAllEmployeeSummaryForExport();
      if (!allData || allData.length === 0) {
        toast.error("No data to export. Please select a date range with data.");
        return;
      }

      const weekStart = selectedDate || toLocalYMD(new Date());
      const timestamp = weekStart.replace(/-/g, "");
      const result = await exportToExcel(allData, exportColumns, {
        fileName: `employee_summary_${timestamp}`,
        includeTimestamp: false,
        worksheetName: "Employee Summary",
      });

      if (result.success) {
        toast.success(`Excel file exported successfully: ${result.filename}`);
      } else {
        toast.error(result.error || "Failed to export Excel file");
      }
    } catch (error) {
      console.error("Error exporting Excel:", error);
      toast.error("Failed to export Excel");
    } finally {
      setExportLoading(prev => ({ ...prev, excel: false }));
    }
  };

  

  const resetSearch = () => {
    setSearchTerm("");
  };

  const hasSearchValues = searchTerm.trim() !== "";

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  const renderSortableLabel = (label: string, key: SortKey) => {
    const isActive = sortConfig.key === key;
    const isAscending = sortConfig.direction === "asc";

    return (
      <button
        type="button"
        onClick={() => handleSort(key)}
        className="flex items-center justify-center gap-1 w-full font-semibold text-current"
      >
        <span>{label}</span>
        <span className="pl-1 flex flex-col leading-[8px] text-[10px] text-current">
          <span
            className={`cursor-pointer ${
              isActive && isAscending ? "text-[#004175]" : "text-gray-400"
            }`}
          >
            <svg
              stroke="currentColor"
              fill="currentColor"
              strokeWidth="0"
              viewBox="0 0 512 512"
              className="-mb-1"
              height="1em"
              width="1em"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
            </svg>
          </span>
          <span
            className={`cursor-pointer ${
              isActive && !isAscending ? "text-[#004175]" : "text-gray-400"
            }`}
          >
            <svg
              stroke="currentColor"
              fill="currentColor"
              strokeWidth="0"
              viewBox="0 0 512 512"
              height="1em"
              width="1em"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="m98 190.06 139.78 163.12a24 24 0 0 0 36.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z"></path>
            </svg>
          </span>
        </span>
      </button>
    );
  };

  const validateAndNavigate = async (newDate: string) => {
    console.log("validateAndNavigate called with:", newDate);
    setNavigationSource("week");
    const week = getWeekRangeFromDateLocal(parseLocalYMD(newDate));
    const weekStartStr = toLocalYMD(week.startOfWeek);
    setSelectedDate(weekStartStr);

    const weekRange = getWeekRangeFromDateLocal(parseLocalYMD(weekStartStr));
    setCurrentWeekRange(weekRange);
    setDate(week.startOfWeek);
    setCurrentPage(1);
    await fetchEmployeeSummary(weekStartStr, 1, 10, false ,  debouncedSearchTerm);
  };
  useEffect(() => {
    const updateTableHeight = () => {
      if (!tableContainerRef.current) return;
      const { top } = tableContainerRef.current.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;
      const paddingBottom = 32;
      const available = Math.max(
        viewportHeight - top - paddingBottom,
        320
      );
      setTableHeight(`${available}px`);
    };

    updateTableHeight();
    window.addEventListener("resize", updateTableHeight);
    return () => {
      window.removeEventListener("resize", updateTableHeight);
    };
  }, []);

  return (
    <div className="w-full p-6 space-y-4">
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-xl font-semibold text-gray-800">
            View Employee Summary
          </h1>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4 w-full md:w-auto">
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

      {/* TABLE WRAPPER */}
      <div
         ref={tableContainerRef}
  className="bg-white rounded-2xl shadow-md border border-gray-100"
      >
         <div
    className="overflow-auto"
    style={{ maxHeight: tableHeight }}
  >
    <table className="w-full text-sm text-gray-800  border-separate border-spacing-0">

            <colgroup>
              <col style={{ width: "100px" }} />
              <col style={{ width: "200px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "110px" }} />
            </colgroup>

            {/* STICKY HEADER */}
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="bg-[#004175] text-white text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-center border-black">
                  Action
                </th>
                <th className="px-4 py-3 text-left border-r border-black">
                  Employee Name
                </th>
                <th
                  className="px-4 py-3 text-center border-l border-r border-black"
                  colSpan={3}
                >
                  Total Regular Hours
                </th>
                <th
                  className="px-4 py-3 text-center border-l  border-black"
                  colSpan={3}
                >
                  Total Overtime Hours
                </th>
              </tr>

              <tr className="bg-gray-100 text-[#004175] text-xs font-semibold border-b border-black">
                <th className="px-4 py-2 text-center border-t border-b border-black">
                  {hasSearchValues && (
                    <ResetButton
                      onClick={resetSearch}
                      disabled={!hasSearchValues}
                    />
                  )}
                </th>
                <th className="px-4 py-2 text-left border-t border-b border-black ">
                  <input
                    placeholder="Search employee name..."
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </th>
                <th className="px-4 py-2 text-center text-black border-t border-b border-l border-black bg-gray-100">
                  {renderSortableLabel("Scheduled", "regularScheduled")}
                </th>
                <th className="px-4 py-2 text-center text-black border-t border-b border-black bg-gray-100">
                  {renderSortableLabel("Actual", "regularActual")}
                </th>
                <th className="px-4 py-2 text-center text-black border-t border-b  border-black bg-gray-100">
                  {renderSortableLabel("Difference", "regularDifference")}
                </th>
                <th className="px-4 py-2 text-center text-black border-t border-b border-l border-black ">
                  {renderSortableLabel("Scheduled", "overtimeScheduled")}
                </th>
                <th className="px-4 py-2 text-center text-black border-t border-b  border-black ">
                  {renderSortableLabel("Actual", "overtimeActual")}
                </th>
                <th className="px-4 py-2 text-center text-black border-t border-b  border-black ">
                  {renderSortableLabel("Difference", "overtimeDifference")}
                </th>
              </tr>
            </thead>
            <tbody>
  {loading ? (
    <tr>
      <td
        colSpan={8}
        className="px-4 py-10 text-center text-gray-500 border-t border-black"
      >
        Loading employee summary...
      </td>
    </tr>
  ) : filteredRows.length === 0 ? (
    <tr>
      <td
        colSpan={8}
        className="px-4 py-10 text-center text-gray-500 border-t border-black"
      >
        No employee summary records available.
      </td>
    </tr>
  ) : (
    <>
      {sortedRows.map((row, index) => (
        <tr
          key={row.employeeName + index}
        >
          <td className="px-4 py-3 text-center border-b border-black bg-white">
            <button
              type="button"
              className="text-blue-500 hover:text-green-700 px-1"
              aria-label="View details"
              onClick={() => {
                setSelectedRow(row);
                setShowDateModal(true);
              }}
            >
              <FiEye className="w-4 h-4" />
            </button>
          </td>
          <td className="px-4 py-3 font-medium text-gray-900 border-b border-black bg-white">
            {row.employeeName}
          </td>
          <td className="px-4 py-3 text-center border-b border-black border-l border-black bg-gray-100">
            {row.regularScheduled}
          </td>
          <td className="px-4 py-3 text-center border-b border-black  border-black bg-gray-100">
            {row.regularActual}
          </td>
          <td className="px-4 py-3 text-center border-b border-black  border-black bg-gray-100">
            {row.regularDifference}
          </td>
          <td className="px-4 py-3 text-center border-b border-black border-l border-black bg-white">
            {row.overtimeScheduled}
          </td>
          <td className="px-4 py-3 text-center border-b border-black  border-black bg-white">
            {row.overtimeActual}
          </td>
          <td className="px-4 py-3 text-center border-b border-black  border-black bg-white">
            {row.overtimeDifference}
          </td>
        </tr>
      ))}

      {/* STICKY TOTAL ROW */}
      <tr className="sticky bottom-0 bg-gray-100 font-semibold">
        <td className="px-4 py-3 text-center border-t border-black" />
        <td className="px-4 py-3 text-left border-t border-black">
          Total
        </td>
        <td className="px-4 py-3 text-center border-t border-l border-black">
          {totals ? formatValue(totals.scheduledHours) : "0.00"}
        </td>
        <td className="px-4 py-3 text-center border-t  border-black">
          {totals ? formatValue(totals.actualHours) : "0.00"}
        </td>
        <td className="px-4 py-3 text-center border-t  border-black">
          {totals ? formatValue(totals.diffScheduledMinusActual) : "0.00"}
        </td>
        <td className="px-4 py-3 text-center border-t border-l border-black">
          {totals ? formatValue(totals.overTimeSchedule) : "0.00"}
        </td>
        <td className="px-4 py-3 text-center border-t  border-black">
          {totals ? formatValue(totals.overTimeActualHours) : "0.00"}
        </td>
        <td className="px-4 py-3 text-center border-t  border-black">
          {totals ? formatValue(totals.overTimediffScheduledMinusActual) : "0.00"}
        </td>
      </tr>
    </>
  )}
</tbody>


          </table>
        </div>
      </div>

      {/* Export buttons below table, above pagination */}
      {!loading && sortedRows && sortedRows.length > 0 && (
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={handleExportToPDF}
            disabled={exportLoading.pdf || exportLoading.excel}
            className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export to PDF"
          >
            {exportLoading.pdf ? (
              <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <FaFilePdf className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={handleExportToExcel}
            disabled={exportLoading.pdf || exportLoading.excel}
            className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export to Excel"
          >
            {exportLoading.excel ? (
              <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <FaFileExport className="w-5 h-5" />
            )}
          </button>
        </div>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 mt-4">
          <Pagination
            currentPage={currentPage}
            lastPage={lastPage}
            onPageChange={async (page) => {
              try {
                setCurrentPage(page);
                await fetchEmployeeSummary(selectedDate, page, 10,false, debouncedSearchTerm);
              } catch (error) {
                console.error("Error changing page:", error);
              }
            }}
            loading={loading}
          />
        </div>
      )}

      {showDateModal && (
        <div className="mt-[-20px]">
          <PeriodEndDateModal
            isOpen={showDateModal}
            onClose={() => {
              setShowDateModal(false);
              setSelectedRow(null);
            }}
            onSubmit={handleDateSubmit}
            isLoading={modalLoading}
          />
        </div>
      )}

      {noScheduleModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <p className="text-gray-700 text-base">
              No schedule found for{" "}
              <span className="font-semibold">
                {noScheduleModal.userName}
              </span>{" "}
              on this week range.
            </p>
            <p className="text-sm text-gray-500 mt-3">
              Do you want to prepare a schedule?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  setNoScheduleModal({
                    isOpen: false,
                    userName: "",
                    selectedDate: "",
                  })
                }
              >
                No
              </Button>
              <Button
                onClick={() => {
                  setNoScheduleModal({
                    isOpen: false,
                    userName: "",
                    selectedDate: "",
                  });
                  navigate(`/prepare-schedule`);
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

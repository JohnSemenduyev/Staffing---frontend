import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiEye } from "react-icons/fi";
import { Button } from "../../components/ui/button";
import { ErrorMessage } from "../../components/ui/error-message";
import { useEmployeeSummary } from "../../context/ViewEmployeeSummaryContext";
import { formatToMMDDYYYY } from "../../context/ViewTimeSummaryContext";
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
  const { data, loading, error, fetchEmployeeSummary, currentPage, lastPage, setCurrentPage } = useEmployeeSummary();
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
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey | null;
    direction: "asc" | "desc";
  }>({
    key: null,
    direction: "asc",
  });

  // initial load
  useEffect(() => {
    const { startOfWeek } = getWeekRangeFromDateLocal(
      formatToMMDDYYYY(today)
    );
    const weekStartStr = toLocalYMD(startOfWeek);
    setDate(startOfWeek);
    setSelectedDate(weekStartStr);

    const weekRange = getWeekRangeFromDateLocal(parseLocalYMD(weekStartStr));
    setCurrentWeekRange(weekRange);
    setCurrentPage(1);
    fetchEmployeeSummary(weekStartStr, 1, 10);
  }, [today, fetchEmployeeSummary, setCurrentPage]);

  const formatDateForApi = (ymd: string) => {
    if (!ymd) return "";
    const [year, month, day] = ymd.split("-");
    return `${month}-${day}-${year}`;
  };

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

  const totals = useMemo(() => {
    const sumField = (key: keyof EmployeeSummaryRow) =>
      sortedRows.reduce((sum, row) => {
        const raw = row[key];
        const num =
          typeof raw === "number"
            ? raw
            : raw === "-" || raw === null || raw === undefined
            ? 0
            : Number(raw);
        return sum + (Number.isNaN(num) ? 0 : num);
      }, 0);

    return {
      regularScheduled: sumField("regularScheduled"),
      regularActual: sumField("regularActual"),
      regularDifference: sumField("regularDifference"),
      overtimeScheduled: sumField("overtimeScheduled"),
      overtimeActual: sumField("overtimeActual"),
      overtimeDifference: sumField("overtimeDifference"),
    };
  }, [sortedRows]);

  

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
        <span className="flex flex-col leading-[8px] text-[10px] text-current">
          <svg
            stroke="currentColor"
            fill="currentColor"
            strokeWidth="0"
            viewBox="0 0 512 512"
            className={isActive && isAscending ? "text-[#004175]" : "text-gray-400"}
            height="0.9em"
            width="0.9em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
          </svg>
          <svg
            stroke="currentColor"
            fill="currentColor"
            strokeWidth="0"
            viewBox="0 0 512 512"
            className={isActive && !isAscending ? "text-[#004175]" : "text-gray-400"}
            height="0.9em"
            width="0.9em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="m98 190.06 139.78 163.12a24 24 0 0 0 36.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z"></path>
          </svg>
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
    await fetchEmployeeSummary(weekStartStr, 1, 10, debouncedSearchTerm.trim() || undefined);
  };

  // Handle search term changes - reset to page 1 and fetch
  useEffect(() => {
    // Skip on initial mount - initial load handles the first fetch
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (selectedDate) {
      setCurrentPage(1);
      fetchEmployeeSummary(selectedDate, 1, 10, debouncedSearchTerm.trim() || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);

  // dynamic table height
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
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800">
            View Employee Summary
          </h1>
          <DateNavigation
            selectedDate={selectedDate}
            onDateChange={validateAndNavigate}
            currentWeekRange={currentWeekRange}
          />
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
          {totals.regularScheduled.toFixed(2)}
        </td>
        <td className="px-4 py-3 text-center border-t border-l border-black">
          {totals.regularActual.toFixed(2)}
        </td>
        <td className="px-4 py-3 text-center border-t border-l border-black">
          {totals.regularDifference.toFixed(2)}
        </td>
        <td className="px-4 py-3 text-center border-t border-l border-black">
          {totals.overtimeScheduled.toFixed(2)}
        </td>
        <td className="px-4 py-3 text-center border-t border-l border-black">
          {totals.overtimeActual.toFixed(2)}
        </td>
        <td className="px-4 py-3 text-center border-t border-l border-black">
          {totals.overtimeDifference.toFixed(2)}
        </td>
      </tr>
    </>
  )}
</tbody>


          </table>
        </div>
      </div>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100">
          <Pagination
            currentPage={currentPage}
            lastPage={lastPage}
            onPageChange={async (page) => {
              try {
                setCurrentPage(page);
                await fetchEmployeeSummary(selectedDate, page, 10, debouncedSearchTerm);
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

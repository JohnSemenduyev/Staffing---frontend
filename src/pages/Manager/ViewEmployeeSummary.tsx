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

export const ViewEmployeeSummary: React.FC = () => {
  const { data, loading, error, fetchEmployeeSummary } = useEmployeeSummary();
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
  const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>(
    {}
  );
  const [tableHeight, setTableHeight] = useState<string>("500px");
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
    fetchEmployeeSummary(weekStartStr);
  }, [today, fetchEmployeeSummary]);

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

  const filteredRows = useMemo(() => {
    let filtered = rows;
    Object.entries(searchTerms).forEach(([key, value]) => {
      if (!value) return;
      const searchValue = String(value).toLowerCase();
      filtered = filtered.filter((row) => {
        const cellValue = row[key as keyof EmployeeSummaryRow];
        if (cellValue === null || cellValue === undefined) {
          return false;
        }
        return String(cellValue).toLowerCase().includes(searchValue);
      });
    });
    return filtered;
  }, [rows, searchTerms]);

  const resetSearch = () => {
    setSearchTerms({});
  };

  const hasSearchValues = Object.values(searchTerms).some(
    (val) => val !== undefined && val !== null && String(val)?.trim() !== ""
  );

  const validateAndNavigate = async (newDate: string) => {
    console.log("validateAndNavigate called with:", newDate);
    setNavigationSource("week");
    const week = getWeekRangeFromDateLocal(parseLocalYMD(newDate));
    const weekStartStr = toLocalYMD(week.startOfWeek);
    setSelectedDate(weekStartStr);

    const weekRange = getWeekRangeFromDateLocal(parseLocalYMD(weekStartStr));
    setCurrentWeekRange(weekRange);
    setDate(week.startOfWeek);
    await fetchEmployeeSummary(weekStartStr);
  };

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
        className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden"
        style={{ height: tableHeight, maxHeight: tableHeight }}
      >
        <div className="h-full overflow-auto">
          <table className="w-full text-sm text-gray-800 table-fixed">
            <colgroup>
              <col style={{ width: "80px" }} />
              <col style={{ width: "200px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "120px" }} />
            </colgroup>

            {/* STICKY HEADER */}
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="bg-[#004175] text-white text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-center border-black">
                  Action
                </th>
                <th className="px-4 py-3 text-left border-r-2 border-black">
                  Employee Name
                </th>
                <th
                  className="px-4 py-3 text-center border-l-2 border-r-2 border-black"
                  colSpan={3}
                >
                  Total Regular Hours
                </th>
                <th
                  className="px-4 py-3 text-center border-l-2 border-black"
                  colSpan={3}
                >
                  Total Overtime Hours
                </th>
              </tr>

              <tr className="bg-[#e8f1fb] text-[#004175] text-xs font-semibold">
                <th className="px-4 py-2 text-center border-t border-b border-black">
                  &nbsp;
                </th>
                <th className="px-4 py-2 text-left border-t border-b border-black">
                  &nbsp;
                </th>
                <th className="px-4 py-2 text-center border-t border-b border-l border-black">
                  Scheduled
                </th>
                <th className="px-4 py-2 text-center border-t border-b border-l border-black">
                  Actual
                </th>
                <th className="px-4 py-2 text-center border-t border-b border-l border-black">
                  Difference
                </th>
                <th className="px-4 py-2 text-center border-t border-b border-l border-black">
                  Scheduled
                </th>
                <th className="px-4 py-2 text-center border-t border-b border-l border-black">
                  Actual
                </th>
                <th className="px-4 py-2 text-center border-t border-b border-l border-black">
                  Difference
                </th>
              </tr>

              <tr className="bg-white text-gray-700 font-sans w-full h-[41px] border-t border-black">
                <th className="px-4 py-2 text-center border-t border-b border-black">
                  {hasSearchValues && (
                    <ResetButton
                      onClick={resetSearch}
                      disabled={!hasSearchValues}
                    />
                  )}
                </th>
                <th className="px-4 py-2 text-left border-t border-b border-black">
                  <input
                    placeholder="Search employee name..."
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                    type="text"
                    value={searchTerms.employeeName || ""}
                    onChange={(e) =>
                      setSearchTerms((prev) => ({
                        ...prev,
                        employeeName: e.target.value,
                      }))
                    }
                  />
                </th>
                <th className="px-4 py-2 text-center border-t border-b border-l border-black">
                  <input
                    placeholder="Search scheduled..."
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                    type="text"
                    value={searchTerms.regularScheduled || ""}
                    onChange={(e) =>
                      setSearchTerms((prev) => ({
                        ...prev,
                        regularScheduled: e.target.value,
                      }))
                    }
                  />
                </th>
                <th className="px-4 py-2 text-center border-t border-b border-l border-black">
                  <input
                    placeholder="Search actual..."
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                    type="text"
                    value={searchTerms.regularActual || ""}
                    onChange={(e) =>
                      setSearchTerms((prev) => ({
                        ...prev,
                        regularActual: e.target.value,
                      }))
                    }
                  />
                </th>
                <th className="px-4 py-2 text-center border-t border-b border-l border-black">
                  <input
                    placeholder="Search difference..."
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                    type="text"
                    value={searchTerms.regularDifference || ""}
                    onChange={(e) =>
                      setSearchTerms((prev) => ({
                        ...prev,
                        regularDifference: e.target.value,
                      }))
                    }
                  />
                </th>
                <th className="px-4 py-2 text-center border-t border-b border-l border-black">
                  <input
                    placeholder="Search scheduled..."
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                    type="text"
                    value={searchTerms.overtimeScheduled || ""}
                    onChange={(e) =>
                      setSearchTerms((prev) => ({
                        ...prev,
                        overtimeScheduled: e.target.value,
                      }))
                    }
                  />
                </th>
                <th className="px-4 py-2 text-center border-t border-b border-l border-black">
                  <input
                    placeholder="Search actual..."
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                    type="text"
                    value={searchTerms.overtimeActual || ""}
                    onChange={(e) =>
                      setSearchTerms((prev) => ({
                        ...prev,
                        overtimeActual: e.target.value,
                      }))
                    }
                  />
                </th>
                <th className="px-4 py-2 text-center border-t border-b border-l border-black">
                  <input
                    placeholder="Search difference..."
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                    type="text"
                    value={searchTerms.overtimeDifference || ""}
                    onChange={(e) =>
                      setSearchTerms((prev) => ({
                        ...prev,
                        overtimeDifference: e.target.value,
                      }))
                    }
                  />
                </th>
              </tr>
            </thead>

            {/* BODY */}
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
                filteredRows.map((row, index) => (
                  <tr
                    key={row.employeeName + index}
                    className="border-t border-black even:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-center border-t border-black">
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
                    <td className="px-4 py-3 font-medium text-gray-900 border-t border-black">
                      {row.employeeName}
                    </td>
                    <td className="px-4 py-3 text-center border-t border-black border-l border-black">
                      {row.regularScheduled}
                    </td>
                    <td className="px-4 py-3 text-center border-t border-black border-l border-black">
                      {row.regularActual}
                    </td>
                    <td className="px-4 py-3 text-center border-t border-black border-l border-black">
                      {row.regularDifference}
                    </td>
                    <td className="px-4 py-3 text-center border-t border-black border-l border-black">
                      {row.overtimeScheduled}
                    </td>
                    <td className="px-4 py-3 text-center border-t border-black border-l border-black">
                      {row.overtimeActual}
                    </td>
                    <td className="px-4 py-3 text-center border-t border-black border-l border-black">
                      {row.overtimeDifference}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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

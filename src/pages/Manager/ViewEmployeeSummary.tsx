import React, { useEffect, useMemo, useState } from "react";
import { FiEye } from "react-icons/fi";
import { CustomDatePicker } from "../../components/CustomDatePicker";
import { Button } from "../../components/ui/button";
import { ErrorMessage } from "../../components/ui/error-message";
import { useEmployeeSummary } from "../../context/ViewEmployeeSummaryContext";
import { formatToMMDDYYYY } from "../../context/ViewTimeSummaryContext";
import { PeriodEndDateModal } from "../../components/ui/PeriodEndDateModal";
import { useNavigate } from "react-router-dom";
import { getWeekRangeFromDateLocal, toLocalYMD, parseLocalYMD } from "../../lib/utils";
import { DateNavigation } from "./ViewSchedule";

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

export const ViewEmployeeSummary = () => {
  const { data, loading, error, fetchEmployeeSummary } = useEmployeeSummary();
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [date, setDate] = useState(null);
  const [navigationSource, setNavigationSource] = useState<"week" | "modal" | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [currentWeekRange, setCurrentWeekRange] = useState<any>(null);
  
  const [showDateModal,setShowDateModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState<EmployeeSummaryRow | null>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    const { startOfWeek } = getWeekRangeFromDateLocal(formatToMMDDYYYY(today));
    const weekStartStr = toLocalYMD(startOfWeek);
    setDate(startOfWeek);
    setSelectedDate(weekStartStr);
    const weekRange = getWeekRangeFromDateLocal(parseLocalYMD(weekStartStr));
    setCurrentWeekRange(weekRange);
    fetchEmployeeSummary(weekStartStr);
  }, [today, fetchEmployeeSummary]);

  const handleDateSubmit = (value: string) =>{
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

    navigate(`/view-schedule?userid=${userId}&selectedDate=${dateToUse}&showSchedule=true&view-employee=true`);

    setSelectedRow(null);
    setShowDateModal(false);
  }

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
      overtimeDifference: formatValue(item.overTimediffScheduledMinusActual),
    }));
  }, [data]);

  const handleDateChange = (field: "date", value: string) => {
    setDate(value);
  };

  const handleRun = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (selectedDate) {
      fetchEmployeeSummary(selectedDate);
    } else if (date) {
      // Fallback: convert date to YYYY-MM-DD format if it's a Date object
      const dateStr = date instanceof Date ? toLocalYMD(date) : date;
      fetchEmployeeSummary(dateStr);
    }
  };

  const validateAndNavigate = async (newDate: string) => {
    console.log("validateAndNavigate called with:", newDate);
    setNavigationSource("week");
    
    // Normalize to start of week
    const week = getWeekRangeFromDateLocal(parseLocalYMD(newDate));
    const weekStartStr = toLocalYMD(week.startOfWeek);
    
    // Update the selected date and week range
    setSelectedDate(weekStartStr);
    const weekRange = getWeekRangeFromDateLocal(parseLocalYMD(weekStartStr));
    setCurrentWeekRange(weekRange);
    
    // Update the date state for fetching
    setDate(week.startOfWeek);
    
    // Fetch employee summary with the new date
    await fetchEmployeeSummary(weekStartStr);
  };

  return (
    <div className="w-full p-6 space-y-4">
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 space-y-4">
        <h1 className="text-xl font-semibold text-gray-800">View Employee Summary</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track employee total regular and overtime hours.
        </p>
       <div className="flex justify-between items-center"> 
        {/* <form
          onSubmit={handleRun}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-[12px]"
        >
          <CustomDatePicker
            value={today}
            onChange={handleDateChange}
            placeholder="Date"
            fieldName="date"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004175]"
          />
          <div className="flex items-center">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Loading..." : "Run"}
            </Button>
          </div>
        </form> */}
        <div></div>
         <DateNavigation
                      selectedDate={selectedDate}
                      onDateChange={validateAndNavigate}
                      currentWeekRange={currentWeekRange}
                    /></div>
        {error && <ErrorMessage message={error} />}
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-sm text-gray-800">
            <thead>
              <tr className="bg-[#004175] text-white text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-center border-r-2 border-black w-16">Action</th>
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
                <th className="px-4 py-2 text-center border-t border-b border-black">&nbsp;</th>
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
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-gray-500 border-t border-black"
                  >
                    No employee summary records available.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr
                    key={row.employeeName + index}
                    className="border-t border-black even:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-center border-t border-black">
                      <button
                        type="button"
                        className="text-blue-500 hover:text-green-700 px-1"
                        aria-label="View details"
                        onClick={()=>{
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
        <PeriodEndDateModal
          isOpen={showDateModal}
          onClose={() => {
            setShowDateModal(false);
            setSelectedRow(null);
          }}
          onSubmit={handleDateSubmit}
        />
      )}
    </div>
  );
};
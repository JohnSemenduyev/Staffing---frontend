import React, { useEffect, useMemo, useState } from "react";
import { FiEye } from "react-icons/fi";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

const tableColumns: TableColumn[] = [
  { key: "clientName", label: "Client Name", sortable: true, searchable: true },
  { key: "location", label: "Location", sortable: true, searchable: true },
  {
    key: "contractHours",
    label: "Contract Hours",
    sortable: true,
    searchable: true,
  },
  {
    key: "totalWeeklyHours",
    label: "Scheduled Hours",
    sortable: true,
    searchable: true,
  },
  {
    key: "diffContractMinusScheduled",
    label: "Difference",
    sortable: true,
    searchable: true,
  },
  {
    key: "unconfirmedHours",
    label: "Unconfirmed Hours",
    sortable: true,
    searchable: true,
  },
  {
    key: "rejectedHours",
    label: "Rejected Hours",
    sortable: true,
    searchable: true,
  },
  {
    key: "totalActualHours",
    label: "Actual Hours",
    sortable: true,
    searchable: true,
  },
  {
    key: "diffScheduledMinusActual",
    label: "Difference",
    sortable: true,
    searchable: true,
  },
  {
    key: "diffContractMinusActual",
    label: "Difference",
    sortable: true,
    searchable: true,
  },
];


type FilterOption = 
  | "all" 
  | "contractVsScheduled" 
  | "unconfirmed" 
  | "rejected" 
  | "scheduledVsActual" 
  | "contractVsActual";

export const ViewClientSummary = () => {
  const { data, loading, error, fetchClientSummary } = useClientSummary();
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [showDateModal, setShowDateModal] = useState(false);
  const [date, setDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState("");
  const [currentWeekRange, setCurrentWeekRange] = useState<any>(null);
  const [filterOption, setFilterOption] = useState<FilterOption>("all");
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const navigate = useNavigate();

   const handleView = (rowData: any) => {
    setSelectedRow(rowData);
    setShowDateModal(true);
  };

  const handleDateSubmit = (value: string) => {
    if (!selectedRow) {
      console.error("No row selected");
      return;
    }

    // Get clientId and addressId from the selected row
    const clientId = selectedRow.clientId;
    const addressId = selectedRow.addressId;

    if (!clientId || !addressId) {
      console.error("Missing clientId or addressId");
      return;
    }

    // Get the date from the PeriodEndDateModal (value parameter is in YYYY-MM-DD format)
    // PeriodEndDateModal returns the date as a string in YYYY-MM-DD format
    const dateToUse = value || selectedDate || toLocalYMD(new Date());
    // Navigate with dynamic values
    navigate(
      `/view-schedule?clientId=${clientId}&addressId=${addressId}&selectedDate=${dateToUse}&showSchedule=true&view-client=true`
    );
    
    // Reset the selected row after navigation
    setSelectedRow(null);
    setShowDateModal(false);
  }

  const tableActions: TableAction[] = [
    {
      label: "View",
      icon: <FiEye className="w-4 h-4" />,
      onClick: handleView,
      className: "text-blue-500 hover:text-green-700 ml-4 px-1",
      title: "View"
    }
  ];

  useEffect(() => {
    const { startOfWeek } = getWeekRangeFromDateLocal(formatToMMDDYYYY(today));
    const weekStartStr = toLocalYMD(startOfWeek);
    setDate(weekStartStr);
    setSelectedDate(weekStartStr);
    const weekRange = getWeekRangeFromDateLocal(parseLocalYMD(weekStartStr));
    setCurrentWeekRange(weekRange);
    fetchClientSummary(weekStartStr);
  }, [today, fetchClientSummary]);

  const rows = useMemo(
    () =>
      (data || []).map((item) => ({
        clientId: item.clientId,
        addressId: item.addressId,
        clientName: item.clientName || "-",
        location: item.address || "-",
        contractHours: item.contractHours ?? "-",
        totalWeeklyHours: item.totalWeeklyHours ?? "-",
        // difference1: item.diffContractMinusScheduled ?? "-",
        diffContractMinusScheduled: item.diffContractMinusScheduled ?? "-",
        unconfirmedHours: item.unconfirmedHours ?? "-",
        rejectedHours: item.rejectedHours ?? "-",
        totalActualHours: item.totalActualHours ?? "-",
        // difference2: item.diffScheduledMinusActual ?? "-",
        diffScheduledMinusActual: item.diffScheduledMinusActual ?? "-",
        diffContractMinusActual: item.diffContractMinusActual ?? "-",
        // difference3: item.diffContractMinusActual ?? "-",
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

  // Filter columns based on selected option
  const filteredColumns = useMemo(() => {
    const baseColumns: TableColumn[] = [
      { key: "clientName", label: "Client Name", sortable: true, searchable: true },
      { key: "location", label: "Location", sortable: true, searchable: true },
    ];

    if (filterOption === "all") {
      return tableColumns;
    }

    const additionalColumns: TableColumn[] = [];

    switch (filterOption) {
      case "contractVsScheduled":
        additionalColumns.push(
          {
            key: "contractHours",
            label: "Contract Hours",
            sortable: true,
            searchable: true,
          },
          {
            key: "totalWeeklyHours",
            label: "Scheduled Hours",
            sortable: true,
            searchable: true,
          },
          {
            key: "diffContractMinusScheduled",
            label: "Difference",
            sortable: true,
            searchable: true,
          }
        );
        break;
      case "unconfirmed":
        additionalColumns.push({
          key: "unconfirmedHours",
          label: "Unconfirmed Hours",
          sortable: true,
          searchable: true,
        });
        break;
      case "rejected":
        additionalColumns.push({
          key: "rejectedHours",
          label: "Rejected Hours",
          sortable: true,
          searchable: true,
        });
        break;
      case "scheduledVsActual":
        additionalColumns.push(
          {
            key: "totalWeeklyHours",
            label: "Scheduled Hours",
            sortable: true,
            searchable: true,
          },
          {
            key: "totalActualHours",
            label: "Actual Hours",
            sortable: true,
            searchable: true,
          },
          {
            key: "diffScheduledMinusActual",
            label: "Difference",
            sortable: true,
            searchable: true,
          }
        );
        break;
      case "contractVsActual":
        additionalColumns.push(
          {
            key: "contractHours",
            label: "Contract Hours",
            sortable: true,
            searchable: true,
          },
          {
            key: "totalActualHours",
            label: "Actual Hours",
            sortable: true,
            searchable: true,
          },
          {
            key: "diffContractMinusActual",
            label: "Difference",
            sortable: true,
            searchable: true,
          }
        );
        break;
    }

    return [...baseColumns, ...additionalColumns];
  }, [filterOption]);

  return (
    <div className="w-full p-6 space-y-4">
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 space-y-4">
        <h1 className="text-xl font-semibold text-gray-800">View Client Summary</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review client-level hour totals, confirmation status, and variances.
        </p>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Select value={filterOption} onValueChange={(value) => setFilterOption(value as FilterOption)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fields</SelectItem>
                <SelectItem value="contractVsScheduled">Contract vs Scheduled</SelectItem>
                <SelectItem value="unconfirmed">Unconfirmed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="scheduledVsActual">Scheduled vs Actual</SelectItem>
                <SelectItem value="contractVsActual">Contract vs Actual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DateNavigation
            selectedDate={selectedDate}
            onDateChange={validateAndNavigate}
            currentWeekRange={currentWeekRange}
          />
        </div>
        {error && <ErrorMessage message={error} />}
      </div>

      <GenericTable
        data={rows}
        columns={filteredColumns}
        actions={tableActions}
        tableHeight="60vh"
        emptyMessage="No client summary records available."
        loading={loading}
      />

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

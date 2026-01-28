import React from "react";
import { ScheduleItem, SessionItem } from "../types/schedule";
import { useActualTimeTable } from "../hooks/useActualTimeTable";
import { ActualTableHeader } from "./actual-table/ActualTableHeader";
import { ActualTableControls } from "./actual-table/ActualTableControls";
import { ActualTableModals } from "./actual-table/ActualTableModals";
import { ActualTableRow } from "./actual-table/ActualTableRow";

interface ActualTimeTableProps {
  scheduleData: ScheduleItem[];
  sessionData: SessionItem[];
  selectedDate: string;
  currentWeekRange: any;
  isEditMode: boolean;
  onSessionDataChange: (newData: SessionItem[]) => void;
  onPublish: () => void;
  onPrint: () => void;
  onDownloadExcel: () => void;
  onToggleEditMode: () => void;
  isPublishing: boolean;
  isPrinting: boolean;
  loading?: boolean;
  hasChanges?: boolean;
  selectedUserId?: number;
}

export const ActualTimeTable: React.FC<ActualTimeTableProps> = (props) => {
  const {
    dateColumns,
    uniqueUsers,
    rowGroups,
    buildUserDateShifts,
    getSessionsForShift,
    openEditShift,
    addEditSessionRow,
    removeEditSessionRow,
    saveEditShiftSessions,
    cancelEditShiftSessions,
    confirmDeleteUser,
    cancelDeleteUser,
    handleDeleteUser,
    confirmDeleteAllForShift,
    cancelDeleteAllForShift,
    setDeleteAllModal,
    handleEditModeToggle,
    confirmEditModeToggle,
    cancelEditModeToggle,
    calculateDayTotal,
    calculateUserTotal,
    calculateRowTotal,
    calculateGrandTotal,
    hasTimeMismatch,
    getUserRowCount,
    getRowRowCount,
    deleteAllModal,
    deleteUserModal,
    editModeConfirmModal,
    editShiftModal,
    editSessions,
    setEditSessions,
  } = useActualTimeTable(props);

  return (
    <div className="relative w-full rounded-2xl border border-gray-200 shadow-xl">
      {props.loading && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <div className="w-full overflow-auto custom-scrollbar rounded-2xl" style={{ maxHeight: "600px" }}>
        {/* Table */}
        <table className="w-auto min-w-full table-fixed text-sm text-gray-800 font-sans border-collapse">
          <ActualTableHeader
            selectedUserId={props.selectedUserId}
            dateColumns={dateColumns}
          />
          <tbody className="relative">
            {props.selectedUserId
              ? rowGroups.map((row) => (
                <ActualTableRow
                  key={row.id}
                  mode="group"
                  data={row}
                  scheduleData={props.scheduleData}
                  sessionData={props.sessionData}
                  dateColumns={dateColumns}
                  isEditMode={props.isEditMode}
                  getSessionsForShift={getSessionsForShift}
                  hasTimeMismatch={hasTimeMismatch}
                  calculateRowTotal={calculateRowTotal}
                  calculateDayTotal={calculateDayTotal}
                  calculateUserTotal={calculateUserTotal}
                  openEditShift={openEditShift}
                  setDeleteAllModal={setDeleteAllModal}
                  rowCount={getRowRowCount(row)}
                />
              ))
              : uniqueUsers.map((user) => (
                <ActualTableRow
                  key={user.id}
                  mode="user"
                  data={user}
                  scheduleData={props.scheduleData}
                  sessionData={props.sessionData}
                  dateColumns={dateColumns}
                  isEditMode={props.isEditMode}
                  getSessionsForShift={getSessionsForShift}
                  hasTimeMismatch={hasTimeMismatch}
                  calculateRowTotal={calculateRowTotal}
                  calculateDayTotal={calculateDayTotal}
                  calculateUserTotal={calculateUserTotal}
                  openEditShift={openEditShift}
                  setDeleteAllModal={setDeleteAllModal}
                  rowCount={getUserRowCount(user.id)}
                  buildUserDateShifts={buildUserDateShifts}
                />
              ))}

            {/* Grand Total Row */}
            <tr className="bg-gray-50 font-medium">
              <td className="border border-gray-300 px-4 py-3 whitespace-nowrap">Grand Total</td>
              {dateColumns.map((dateCol) => (
                <td key={dateCol.date} className="border border-gray-300 px-4 py-3 text-center whitespace-nowrap">
                  {calculateDayTotal(dateCol.date, props.sessionData) || "-"}
                </td>
              ))}
              <td className="border border-gray-300 px-4 py-3 text-center whitespace-nowrap">
                {calculateGrandTotal(props.sessionData)}
              </td>
              <td className="border border-gray-300 px-4 py-3 whitespace-nowrap"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <ActualTableControls
        isEditMode={props.isEditMode}
        hasChanges={props.hasChanges}
        isPublishing={props.isPublishing}
        isPrinting={props.isPrinting}
        onPublish={props.onPublish}
        onPrint={props.onPrint}
        onDownloadExcel={props.onDownloadExcel}
        onToggleEditMode={props.onToggleEditMode}
        handleEditModeToggle={handleEditModeToggle}
      />

      <ActualTableModals
        deleteAllModal={deleteAllModal}
        confirmDeleteAllForShift={confirmDeleteAllForShift}
        cancelDeleteAllForShift={cancelDeleteAllForShift}
        editShiftModal={editShiftModal}
        editSessions={editSessions}
        setEditSessions={setEditSessions}
        addEditSessionRow={addEditSessionRow}
        removeEditSessionRow={removeEditSessionRow}
        saveEditShiftSessions={saveEditShiftSessions}
        cancelEditShiftSessions={cancelEditShiftSessions}
        deleteUserModal={deleteUserModal}
        confirmDeleteUser={confirmDeleteUser}
        cancelDeleteUser={cancelDeleteUser}
        editModeConfirmModal={editModeConfirmModal}
        confirmEditModeToggle={confirmEditModeToggle}
        cancelEditModeToggle={cancelEditModeToggle}
      />
    </div>
  );
};

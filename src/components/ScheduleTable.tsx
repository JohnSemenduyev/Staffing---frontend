import React from "react";
import { ScheduleItem, SessionItem, Shift } from "../types/schedule";
import { useScheduleTable } from "../hooks/useScheduleTable";
import { ScheduleTableHeader } from "./schedule-table/ScheduleTableHeader";
import { ScheduleTableControls } from "./schedule-table/ScheduleTableControls";
import { ScheduleTableModals } from "./schedule-table/ScheduleTableModals";
import { ScheduleTableRow } from "./schedule-table/ScheduleTableRow";

interface ScheduleTableProps {
  scheduleData: ScheduleItem[];
  sessionData?: SessionItem[];
  selectedDate: string;
  currentWeekRange: any;
  isEditMode: boolean;
  onScheduleDataChange: (newData: ScheduleItem[]) => void;
  onPublish: () => void;
  onSave?: () => void;
  onPrint: () => void;
  onDownloadExcel: () => void;
  onToggleEditMode: () => void;
  onDeleteSuccess?: () => void | Promise<void>;
  onDraftShiftDeletion?: (shift: any) => void;
  onDeleteSingleDraftSession?: (draftScheduleSessionId: number) => Promise<void>;
  isPublishing: boolean;
  isPrinting: boolean;
  isSaving?: boolean;
  readOnly?: boolean;
  selectedUserId?: number;
  loading?: boolean;
  onUserAutoToggle?: (userId: number, enabled: boolean) => void;
  onShiftAutoToggle?: (userId: number, date: string, shiftId: number, enabled: boolean) => void;
  onScheduleAutoToggle?: (enabled: boolean) => void;
  hideActionButtons?: boolean;
  existingShifts?: Shift[];
  apiExistingShiftsData?: Map<string, any[]>;
  hasChanges?: boolean;
}

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  scheduleData,
  sessionData = [],
  selectedDate,
  currentWeekRange,
  isEditMode,
  onScheduleDataChange,
  onPublish,
  onPrint,
  onDownloadExcel,
  onToggleEditMode,
  onDeleteSuccess,
  onDraftShiftDeletion,
  onDeleteSingleDraftSession,
  isPublishing,
  isPrinting,
  readOnly = false,
  loading = false,
  onUserAutoToggle,
  onShiftAutoToggle,
  onScheduleAutoToggle,
  hideActionButtons = false,
  existingShifts = [],
  apiExistingShiftsData = new Map(),
  hasChanges,
  selectedUserId,
  onSave,
  isSaving,
}) => {
  const {
    dateColumns,
    rowGroups,
    hasDraftData,
    deleteModal,
    setDeleteModal,
    editModal,
    setEditModal,
    deleteUserModal,
    setDeleteUserModal,
    deleteLastShiftModal,
    setDeleteLastShiftModal,
    editModeConfirmModal,
    setEditModeConfirmModal,
    editForm,
    setEditForm,
    deletingUser,
    deletingLastShift,
    draggedShift,
    dragOverCell,
    handleDeleteShift,
    confirmDeleteShift,
    cancelDeleteShift,
    handleDeleteUser,
    confirmDeleteUser,
    cancelDeleteUser,
    handleEditShift,
    confirmEditShift,
    cancelEditShift,
    confirmDeleteLastShift,
    cancelDeleteLastShift,
    handleEditModeToggle,
    confirmEditModeToggle,
    cancelEditModeToggle,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleUserAutoToggle,
    handleShiftAutoToggleLocal,
    getMaxShiftsPerDay,
    calculateRowTotal,
    calculateDayTotal,
    calculateGrandTotal,
    calculateUserDayTotal,
    hasTimeMismatch,
    findSessionForShift,
    isDraftShift,
    formatDateFromISO,
    sortShiftsByTime
  } = useScheduleTable({
    scheduleData,
    sessionData,
    selectedDate,
    currentWeekRange,
    isEditMode,
    onScheduleDataChange,
    onToggleEditMode,
    onDeleteSuccess,
    onDraftShiftDeletion,
    onDeleteSingleDraftSession,
    selectedUserId,
    apiExistingShiftsData,
    existingShifts,
    hasChanges,
    onUserAutoToggle,
    onShiftAutoToggle,
  });

  const groupByClient = Boolean(selectedUserId);

  return (
    <div className="relative w-full border border-gray-200 shadow-xl rounded-2xl overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div className="w-full overflow-auto custom-scrollbar" style={{ maxHeight: "600px" }}>
        <table className="w-auto min-w-full table-fixed text-sm text-gray-800 font-sans border-collapse">
          <ScheduleTableHeader
            selectedUserId={selectedUserId}
            dateColumns={dateColumns}
            isEditMode={isEditMode}
          />
          <tbody className="relative">
            {rowGroups.map((row, rowIndex) => (
              <ScheduleTableRow
                key={row.id}
                row={row}
                rowIndex={rowIndex}
                scheduleData={scheduleData}
                sessionData={sessionData}
                dateColumns={dateColumns}
                selectedUserId={selectedUserId}
                groupByClient={groupByClient}
                getMaxShiftsPerDay={getMaxShiftsPerDay}
                calculateRowTotal={calculateRowTotal}
                isEditMode={isEditMode}
                readOnly={readOnly}
                dragOverCell={dragOverCell}
                handleDragStart={handleDragStart}
                handleDragEnd={() => { /* no-op in hook, or can accept handler if needed */ }}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                handleEditShift={handleEditShift}
                handleDeleteShift={handleDeleteShift}
                onShiftAutoToggle={onShiftAutoToggle}
                handleShiftAutoToggleLocal={handleShiftAutoToggleLocal}
                handleUserAutoToggle={handleUserAutoToggle}
                handleDeleteUser={handleDeleteUser}
                calculateDayTotal={calculateDayTotal}
                calculateUserDayTotal={calculateUserDayTotal}
                findSessionForShift={findSessionForShift}
                hasTimeMismatch={hasTimeMismatch}
                isDraftShift={isDraftShift}
                formatDateFromISO={formatDateFromISO}
                sortShiftsByTime={sortShiftsByTime}
                currentWeekRange={currentWeekRange}
              />
            ))}
            <tr className="bg-gray-50 font-medium">
              <td className="border border-gray-300 px-4 py-3 whitespace-nowrap">
                Grand Total
              </td>
              {(() => {
                const dayTotals = dateColumns.map((dateCol) => calculateDayTotal(dateCol.date));
                const grandTotalFromColumns = parseFloat(
                  dayTotals.reduce((s, v) => s + v, 0).toFixed(2)
                );
                return (
                  <>
                    {dayTotals.map((dayTotal, i) => (
                      <td
                        key={dateColumns[i].date}
                        className="border border-gray-300 px-4 py-3 text-center whitespace-nowrap"
                      >
                        {dayTotal > 0 ? dayTotal : "-"}
                      </td>
                    ))}
                    <td className="border border-gray-300 px-4 py-3 text-center whitespace-nowrap">
                      {grandTotalFromColumns > 0 ? grandTotalFromColumns : "-"}
                    </td>
                  </>
                );
              })()}
              <td className="border border-gray-300 px-4 py-3 text-center w-16"></td>
              {isEditMode && <td className="border border-gray-300 px-4 py-3 whitespace-nowrap w-16"></td>}
            </tr>
          </tbody>
        </table>
      </div>

      <ScheduleTableControls
        isEditMode={isEditMode}
        onPublish={onPublish}
        onSave={onSave}
        onPrint={onPrint}
        onDownloadExcel={onDownloadExcel}
        onToggleEditMode={onToggleEditMode}
        handleEditModeToggle={handleEditModeToggle}
        isPublishing={isPublishing}
        isSaving={isSaving}
        isPrinting={isPrinting}
        hasChanges={hasChanges}
        hasDraftData={hasDraftData}
        hideActionButtons={hideActionButtons}
      />

      <ScheduleTableModals
        deleteModal={deleteModal}
        confirmDeleteShift={confirmDeleteShift}
        cancelDeleteShift={cancelDeleteShift}
        editModal={editModal}
        editForm={editForm}
        setEditForm={setEditForm}
        confirmEditShift={confirmEditShift}
        cancelEditShift={cancelEditShift}
        deleteUserModal={deleteUserModal}
        confirmDeleteUser={confirmDeleteUser}
        cancelDeleteUser={cancelDeleteUser}
        deletingUser={deletingUser}
        deleteLastShiftModal={deleteLastShiftModal}
        confirmDeleteLastShift={confirmDeleteLastShift}
        cancelDeleteLastShift={cancelDeleteLastShift}
        deletingLastShift={deletingLastShift}
        editModeConfirmModal={editModeConfirmModal}
        confirmEditModeToggle={confirmEditModeToggle}
        cancelEditModeToggle={cancelEditModeToggle}
        currentWeekRange={currentWeekRange}
      />
    </div>
  );
};

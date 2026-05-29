import React, { useEffect, useRef } from "react";
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
  const TABLE_MAX_HEIGHT = 600;
  const HEADER_HEIGHT = 41;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerWrapperRef = useRef<HTMLDivElement>(null);
  const headerTableRef = useRef<HTMLTableElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [headerRightCompensation, setHeaderRightCompensation] = React.useState(0);

  const {
    dateColumns,
    uniqueUsers,
    rowGroups,
    buildUserDateShifts,
    buildGroupDateShifts,
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
    calculateUserDayTotalFromGrid,
    calculateGroupDayTotalFromGrid,
    calculateUserTotal,
    calculateRowTotal,
    calculateGrandTotal,
    hasTimeMismatch,
    getUserRowCount,
    getRowRowCount,
    sessionCtx,
    deleteAllModal,
    deleteUserModal,
    editModeConfirmModal,
    editShiftModal,
    editSessions,
    setEditSessions,
    isOverflowShiftForEdit,
    editSessionDateLimits,
  } = useActualTimeTable(props);

  const fixedColumnWidths = {
    name: 160,
    day: 120,
    total: 90,
  };

  const renderColumnGroup = () => (
    <colgroup>
      <col style={{ width: `${fixedColumnWidths.name}px` }} />
      {dateColumns.map((dateCol) => (
        <col key={`col-${dateCol.date}`} style={{ width: `${fixedColumnWidths.day}px` }} />
      ))}
      <col style={{ width: `${fixedColumnWidths.total}px` }} />
    </colgroup>
  );

  const bodyRowCount = props.selectedUserId ? rowGroups.length : uniqueUsers.length;

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollbarWidth = container.offsetWidth - container.clientWidth;
    setHeaderRightCompensation(scrollbarWidth);
    const rafId = window.requestAnimationFrame(() => {
      const updatedScrollbarWidth = container.offsetWidth - container.clientWidth;
      setHeaderRightCompensation(updatedScrollbarWidth);
    });
    const handleResize = () => {
      const resizeScrollbarWidth = container.offsetWidth - container.clientWidth;
      setHeaderRightCompensation(resizeScrollbarWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
    };
  }, [dateColumns.length, bodyRowCount, props.isEditMode, props.loading, props.selectedUserId]);

  const editShiftInfo = React.useMemo(() => {
    if (!editShiftModal.isOpen || editShiftModal.shiftId == null) return null;
    const shift = props.scheduleData
      .flatMap((item) => item.shifts || [])
      .find((s) => s.id === editShiftModal.shiftId);
    if (!shift) return null;
    return {
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
    };
  }, [editShiftModal.isOpen, editShiftModal.shiftId, props.scheduleData]);

  return (
    <div className="relative w-full rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
      {props.loading && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div className="w-full overflow-x-auto custom-scrollbar">
        <div style={{ minWidth: "max-content" }}>
          <div
            ref={headerWrapperRef}
            style={{ paddingRight: `${headerRightCompensation}px`, backgroundColor: "#004175" }}
          >
            <table
              ref={headerTableRef}
              className="w-auto min-w-full table-fixed text-sm text-gray-800 font-sans border-collapse"
              style={{ marginRight: `${headerRightCompensation}px` }}
            >
              {renderColumnGroup()}
              <ActualTableHeader
                selectedUserId={props.selectedUserId}
                dateColumns={dateColumns}
              />
            </table>
          </div>

          <div
            ref={scrollContainerRef}
            className="w-full overflow-y-auto overflow-x-hidden custom-scrollbar"
            style={{ maxHeight: `${TABLE_MAX_HEIGHT - HEADER_HEIGHT}px` }}
          >
            <table
              ref={tableRef}
              className="w-auto min-w-full table-fixed text-sm text-gray-800 font-sans border-collapse"
            >
              {renderColumnGroup()}
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
                        calculateUserDayTotalFromGrid={calculateUserDayTotalFromGrid}
                        calculateGroupDayTotalFromGrid={calculateGroupDayTotalFromGrid}
                        calculateUserTotal={calculateUserTotal}
                        openEditShift={openEditShift}
                        setDeleteAllModal={setDeleteAllModal}
                        rowCount={getRowRowCount(row)}
                        buildGroupDateShifts={buildGroupDateShifts}
                        sessionCtx={sessionCtx}
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
                        calculateUserDayTotalFromGrid={calculateUserDayTotalFromGrid}
                        calculateUserTotal={calculateUserTotal}
                        openEditShift={openEditShift}
                        setDeleteAllModal={setDeleteAllModal}
                        rowCount={getUserRowCount(user.id)}
                        buildUserDateShifts={buildUserDateShifts}
                        sessionCtx={sessionCtx}
                      />
                    ))}

                <tr className="bg-gray-50 font-medium">
                  <td className="border border-gray-300 px-4 py-3 whitespace-nowrap w-[160px] min-w-[160px] max-w-[160px]">
                    Grand Total
                  </td>
                  {(() => {
                    const dayTotals = dateColumns.map((dateCol) => {
                      if (props.selectedUserId) {
                        return rowGroups.reduce(
                          (sum, g) =>
                            sum +
                            calculateGroupDayTotalFromGrid(String(g.id), g.userId, dateCol.date),
                          0
                        );
                      }
                      return uniqueUsers.reduce(
                        (sum, u) => sum + calculateUserDayTotalFromGrid(u.id, dateCol.date),
                        0
                      );
                    });
                    const grandTotalFromColumns = parseFloat(
                      dayTotals.reduce((s, v) => s + v, 0).toFixed(2)
                    );
                    return (
                      <>
                        {dayTotals.map((dayTotal, i) => (
                          <td
                            key={dateColumns[i].date}
                            className="border border-gray-300 px-4 py-3 text-center whitespace-nowrap w-[120px] min-w-[120px] max-w-[120px]"
                          >
                            {dayTotal > 0 ? parseFloat(dayTotal.toFixed(2)) : "-"}
                          </td>
                        ))}
                        <td className="border border-gray-300 px-4 py-3 text-center whitespace-nowrap w-[90px] min-w-[90px] max-w-[90px]">
                          {grandTotalFromColumns > 0 ? grandTotalFromColumns.toFixed(2) : "-"}
                        </td>
                      </>
                    );
                  })()}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
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
        editShiftInfo={editShiftInfo}
        editSessions={editSessions}
        setEditSessions={setEditSessions}
        addEditSessionRow={addEditSessionRow}
        removeEditSessionRow={removeEditSessionRow}
        saveEditShiftSessions={saveEditShiftSessions}
        cancelEditShiftSessions={cancelEditShiftSessions}
        isOverflowShiftForEdit={isOverflowShiftForEdit}
        editSessionDateLimits={editSessionDateLimits}
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

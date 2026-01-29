import React from "react";
import { FaRegTrashAlt } from "react-icons/fa";
import ToggleSwitch from "../ui/toggle";
import { ScheduleItem, SessionItem, RowGroup } from "../../types/schedule";
import { ScheduleTableCell } from "./ScheduleTableCell";
import { addressTwoLines, formatUSPhone, shiftSpansNextDay } from "../../lib/utils";

interface ScheduleTableRowProps {
    row: RowGroup;
    rowIndex: number;
    scheduleData: ScheduleItem[];
    sessionData: SessionItem[];
    dateColumns: { date: string; display: string }[];
    selectedUserId?: number;
    groupByClient: boolean;
    getMaxShiftsPerDay: (row: RowGroup, groupByClient: boolean) => number;
    calculateRowTotal: (row: RowGroup, groupByClient: boolean) => number;
    isEditMode: boolean;
    readOnly?: boolean;
    dragOverCell: any;
    handleDragStart: (e: React.DragEvent, shift: any, userId: number, date: string, rowIdx: number) => void;
    handleDragEnd: () => void;
    handleDragOver: (e: React.DragEvent, userId: number, date: string, rowIdx: number) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent, userId: number, date: string, rowIdx: number) => void;
    handleEditShift: (userId: number, date: string, shift: any) => void;
    handleDeleteShift: (userId: number, date: string, shiftId: number) => void;
    onShiftAutoToggle?: (userId: number, date: string, shiftId: number, enabled: boolean) => void;
    handleShiftAutoToggleLocal: (userId: number, date: string, shiftId: number, enabled: boolean) => void;
    handleUserAutoToggle: (userId: number, enabled: boolean) => void;
    handleDeleteUser: (userId: number) => void;
    calculateDayTotal: (date: string) => number;
    calculateUserDayTotal: (row: RowGroup, date: string, groupByClient: boolean) => number;
    findSessionForShift: (shiftId: number) => SessionItem | null;
    hasTimeMismatch: (shift: any, session?: any, tolerance?: number) => boolean;
    isDraftShift: (shift: any) => boolean;
    formatDateFromISO: (date: string) => string;
    sortShiftsByTime: (shifts: any[]) => any[];
    currentWeekRange: any;
}

export const ScheduleTableRow: React.FC<ScheduleTableRowProps> = ({
    row,
    rowIndex,
    scheduleData,
    sessionData,
    dateColumns,
    selectedUserId,
    groupByClient,
    getMaxShiftsPerDay,
    calculateRowTotal,
    isEditMode,
    readOnly,
    dragOverCell,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleEditShift,
    handleDeleteShift,
    onShiftAutoToggle,
    handleShiftAutoToggleLocal,
    handleUserAutoToggle,
    handleDeleteUser,
    calculateDayTotal,
    calculateUserDayTotal,
    findSessionForShift,
    hasTimeMismatch,
    isDraftShift,
    formatDateFromISO,
    sortShiftsByTime,
    currentWeekRange
}) => {
    const rowCount = getMaxShiftsPerDay(row, groupByClient);

    return (
        <React.Fragment key={row.id}>
            {[...Array(rowCount)].map((_, rowIdx) => (
                <tr
                    key={`${row.id}-row-${rowIdx}`}
                    className={`hover:bg-blue-50 transition-colors ${(rowIndex + rowIdx) % 2 === 0 ? "bg-gray-50" : "bg-white"
                        }`}
                >
                    {rowIdx === 0 && (
                        <td
                            className="border border-gray-300 px-4 py-3 text-center align-middle whitespace-nowrap"
                            rowSpan={rowCount}
                        >
                            <div className="font-medium text-gray-800">
                                {selectedUserId ? row.clientName : row.name}
                            </div>

                            <div className="text-xs text-gray-500 whitespace-normal">
                                {selectedUserId ? (
                                    (() => {
                                        const { line1, line2 } = addressTwoLines(row.address);
                                        return (
                                            <>
                                                {line1}
                                                {line2 ? <br /> : null}
                                                {line2}
                                            </>
                                        );
                                    })()
                                ) : (
                                    formatUSPhone(row.phone)
                                )}
                            </div>
                        </td>
                    )}
                    {dateColumns.map((dateCol) => {
                        const daySchedules = scheduleData.filter((item) => {
                            const itemDate = item.startDate.includes("T")
                                ? formatDateFromISO(item.startDate)
                                : item.startDate;
                            const sameUser = item.userId === row.userId;
                            const sameClientGroup = !groupByClient
                                ? true
                                : item.clientId === row.clientId &&
                                item.addressId === row.addressId;
                            return sameUser && sameClientGroup && itemDate === dateCol.date;
                        });

                        // 1. Current day shifts
                        const currentDayShifts = daySchedules
                            .flatMap((s) => s.shifts)
                            .filter((s) => !(s as any).isDelete);

                        // 2. Previous day shifts that span to today
                        const prevDate = (() => {
                            // Simple logic to get previous date YYYY-MM-DD
                            const d = new Date(dateCol.date + 'T00:00:00');
                            d.setDate(d.getDate() - 1);
                            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        })();

                        // We need to find the user's schedule for the previous day
                        const prevDaySchedules = scheduleData.filter((item) => {
                            const itemDate = item.startDate.includes("T")
                                ? formatDateFromISO(item.startDate)
                                : item.startDate;

                            const sameUser = item.userId === row.userId;
                            const sameClientGroup = !groupByClient
                                ? true
                                : item.clientId === row.clientId &&
                                item.addressId === row.addressId;

                            return sameUser && sameClientGroup && itemDate === prevDate;
                        });

                        const prevDaySpanningShifts = prevDaySchedules
                            .flatMap(s => s.shifts)
                            .filter(s => !(s as any).isDelete && shiftSpansNextDay(s.startTime, s.endTime))
                            .map(s => ({
                                ...s,
                                isContinuation: true, // Mark as continuation
                                originalDate: prevDate, // Keep track of original date
                                displayStartTime: "00:00" // For sorting, treat as start of day
                            }));

                        // 3. Merge and sort
                        const allShifts = [
                            ...currentDayShifts.map(s => ({ ...s, displayStartTime: s.startTime })),
                            ...prevDaySpanningShifts
                        ];

                        const sortedShifts = allShifts.sort((a, b) => {
                            const timeA = (a as any).displayStartTime;
                            const timeB = (b as any).displayStartTime;
                            // Simple time comparison HH:MM
                            return timeA.localeCompare(timeB);
                        });

                        const shift = sortedShifts[rowIdx];
                        const session = shift && !(shift as any).isContinuation
                            ? findSessionForShift(shift.id)
                            : null;

                        // Get tolerance from the schedule item (row data)
                        // Use the correct day schedule based on where the shift "lives" visually
                        const targetSchedule = (shift as any)?.isContinuation ? prevDaySchedules[0] : daySchedules[0];
                        const tolerance = targetSchedule?.timeSetup?.actualScheduledTime ?? 0;

                        const mismatch = shift && session
                            ? hasTimeMismatch(shift, session, tolerance)
                            : false;
                        const draft = shift ? isDraftShift(shift) : false;

                        return (
                            <ScheduleTableCell
                                key={dateCol.date + "-" + rowIdx}
                                shift={shift}
                                dateCol={dateCol}
                                rowUserId={row.userId}
                                rowIdx={rowIdx}
                                isEditMode={isEditMode}
                                readOnly={readOnly}
                                dragOverCell={dragOverCell}
                                handleDragStart={handleDragStart}
                                handleDragEnd={handleDragEnd}
                                handleDragOver={handleDragOver}
                                handleDragLeave={handleDragLeave}
                                handleDrop={handleDrop}
                                handleEditShift={handleEditShift}
                                handleDeleteShift={handleDeleteShift}
                                onShiftAutoToggle={onShiftAutoToggle}
                                handleShiftAutoToggleLocal={handleShiftAutoToggleLocal}
                                hasMismatch={mismatch}
                                isDraft={draft}
                                currentWeekRange={currentWeekRange}
                            />
                        );
                    })}

                    {rowIdx === 0 && (
                        <>
                            <td
                                className="border border-gray-300 px-4 py-3 text-center font-medium whitespace-nowrap"
                                rowSpan={rowCount}
                            >
                                {calculateRowTotal(row, groupByClient)}
                            </td>
                            <td
                                className="border border-gray-300 px-4 py-3 text-center w-16 align-middle whitespace-nowrap"
                                rowSpan={rowCount}
                            >
                                <div className="flex items-center justify-center">
                                    <ToggleSwitch
                                        size="medium"
                                        enabled={scheduleData.some((item) => {
                                            if (item.userId !== row.userId) return false;
                                            if (!groupByClient)
                                                return item.shifts.some((s) => s.auto);
                                            return (
                                                item.clientId === row.clientId &&
                                                item.addressId === row.addressId &&
                                                item.shifts.some((s) => s.auto)
                                            );
                                        })}
                                        disabled={!isEditMode || readOnly}
                                        onToggle={
                                            readOnly || !isEditMode
                                                ? undefined
                                                : (enabled) =>
                                                    handleUserAutoToggle(row.userId, enabled)
                                        }
                                    />
                                </div>
                            </td>
                        </>
                    )}
                </tr>
            ))}

            <tr
                className={`transition-colors ${rowIndex % 2 === 0 ? "bg-gray-100" : "bg-gray-200"
                    }`}
            >
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center whitespace-nowrap">
                    Total
                </td>
                {dateColumns.map((dateCol) => {
                    const dayTotal = calculateUserDayTotal(row, dateCol.date, groupByClient);

                    const rounded = parseFloat(dayTotal.toFixed(2));
                    return (
                        <td
                            key={dateCol.date}
                            className="border border-gray-300 px-4 py-3 text-center text-sm font-medium whitespace-nowrap"
                        >
                            {rounded > 0 ? rounded : "-"}
                        </td>
                    );
                })}
                <td className="border border-gray-300 px-4 py-3 text-center font-medium whitespace-nowrap">
                    {calculateRowTotal(row, groupByClient)}
                </td>
                {isEditMode && (
                    <td className="border border-gray-300 px-4 py-3 whitespace-nowrap flex items-center justify-center">
                        <button
                            onClick={() => handleDeleteUser(row.userId)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Delete all data for this user"
                        >
                            <FaRegTrashAlt className="w-4 h-4" />
                        </button>
                    </td>
                )}
            </tr>
        </React.Fragment>
    );
};

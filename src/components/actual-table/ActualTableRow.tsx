import React from "react";
import { ActualTableCell } from "./ActualTableCell";
import { formatUSPhone, addressTwoLines } from "../../lib/utils";
import { ScheduleItem, SessionItem, Shift, RowGroup, User } from "../../types/schedule";
import type { SessionCalendarCtx } from "../../utils/sessionCalendar";

interface ActualTableRowProps {
    mode: "user" | "group";
    data: User | RowGroup;
    scheduleData: ScheduleItem[];
    sessionData: SessionItem[];
    dateColumns: { date: string }[];
    isEditMode: boolean;

    // Logic helpers
    getSessionsForShift: (shiftId?: number | Shift, scheduleSessionId?: number, date?: string, userId?: number) => SessionItem[];
    hasTimeMismatch: (shift: Shift, sessions: SessionItem[], cellDate?: string) => boolean;
    calculateRowTotal: (userId: number, rowIdx: number, sessions: SessionItem[], schedule: ScheduleItem[], dateCols: { date: string }[], groupId?: string) => number;
    calculateDayTotal: (date: string, sessions: SessionItem[]) => number;
    calculateUserDayTotalFromGrid: (userId: number, date: string) => number;
    calculateGroupDayTotalFromGrid?: (groupId: string, userId: number, date: string) => number;
    calculateUserTotal: (userId: number, sessions: SessionItem[], schedule: ScheduleItem[]) => number;

    // Row Count helpers
    rowCount: number;
    buildUserDateShifts?: Map<number, Map<string, (Shift | null)[]>>; // For user mode
    buildGroupDateShifts?: Map<string, Map<string, (Shift | null)[]>>; // For group mode

    openEditShift: (userId: number, date: string, shiftId: number) => void;
    setDeleteAllModal: (data: { isOpen: boolean; shiftId: number }) => void;

    sessionCtx: SessionCalendarCtx;
}

export const ActualTableRow: React.FC<ActualTableRowProps> = ({
    mode,
    data,
    scheduleData,
    sessionData,
    dateColumns,
    isEditMode,
    getSessionsForShift,
    hasTimeMismatch,
    calculateRowTotal,
    calculateDayTotal,
    calculateUserDayTotalFromGrid,
    calculateGroupDayTotalFromGrid,
    calculateUserTotal,
    rowCount,
    buildUserDateShifts,
    buildGroupDateShifts,
    openEditShift,
    setDeleteAllModal,
    sessionCtx,
}) => {
    const userId = data instanceof Object && 'userId' in data ? (data as RowGroup).userId : Number((data as User).id);

    // Filter data specific to this row block
    const filteredScheduleData = React.useMemo(() => {
        if (mode === "group") {
            const group = data as RowGroup;
            return scheduleData.filter(item =>
                item.userId === group.userId &&
                item.clientId === group.clientId &&
                item.addressId === group.addressId
            );
        } else {
            const user = data as User;
            return scheduleData.filter(item => item.userId === Number(user.id));
        }
    }, [mode, data, scheduleData]);

    const filteredSessionData = React.useMemo(() => {
        return sessionData.filter(item => {
            const scheduleItem = scheduleData.find(si => si.shifts.some(shift => shift.id === item.shiftId));
            if (!scheduleItem) return false;

            if (mode === "group") {
                const group = data as RowGroup;
                return (
                    scheduleItem.userId === group.userId &&
                    scheduleItem.clientId === group.clientId &&
                    scheduleItem.addressId === group.addressId
                );
            } else {
                return scheduleItem.userId === userId;
            }
        });
    }, [mode, data, sessionData, scheduleData, userId]);


    return (
        <React.Fragment>
            {[...Array(rowCount)].map((_, rowIdx) => (
                <tr
                    key={`${(data as any).id || userId}-row-${rowIdx}`}
                    className={`hover:bg-blue-50 transition-colors ${((mode === 'group' ? (data as RowGroup).id : userId) as any) % 2 === 0 ? "bg-gray-50" : "bg-white"}`} // Simplified shading logic, might not match exactly but good enough
                >
                    {rowIdx === 0 && (
                        <td
                            className="border border-gray-300 px-4 py-3 text-center align-middle whitespace-nowrap"
                            rowSpan={rowCount}
                        >
                            {mode === "group" ? (
                                <>
                                    <div className="font-medium text-gray-800">
                                        {(data as RowGroup).clientName}
                                    </div>
                                    <div className="text-xs text-gray-500 whitespace-normal">
                                        {(() => {
                                            const { line1, line2 } = addressTwoLines((data as RowGroup).address);
                                            return (
                                                <>
                                                    {line1}
                                                    {line2 ? <br /> : null}
                                                    {line2}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="font-medium text-gray-800">
                                        {(data as User).name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {formatUSPhone((data as User).phone)}
                                    </div>
                                </>
                            )}
                        </td>
                    )}

                    {dateColumns.map((dateCol, colIdx) => {
                        let shift: Shift | null = null;
                        if (mode === "group") {
                            const group = data as RowGroup;
                            shift = buildGroupDateShifts?.get(String(group.id))?.get(dateCol.date)?.[rowIdx] ?? null;
                        } else {
                            shift = buildUserDateShifts?.get(userId)?.get(dateCol.date)?.[rowIdx] ?? null;
                        }

                        const sessions = shift
                            ? getSessionsForShift(shift, shift.scheduleSessionId, dateCol.date, userId)
                            : [];

                        const hasMismatch = shift ? hasTimeMismatch(shift, sessions, dateCol.date) : false;

                        return (
                            <ActualTableCell
                                key={`${dateCol.date}-${rowIdx}-${colIdx}`}
                                shift={shift}
                                cellDate={dateCol.date}
                                sessionCtx={sessionCtx}
                                sessions={sessions}
                                isEditMode={isEditMode}
                                hasMismatch={hasMismatch}
                                onEditShift={() => shift && openEditShift(userId, dateCol.date, shift.id)}
                                onDeleteAll={() => shift && setDeleteAllModal({ isOpen: true, shiftId: shift.id })}
                            />
                        );
                    })}

                    <td className="border border-gray-300 px-4 py-3 text-center font-medium whitespace-nowrap">
                        {calculateRowTotal(
                            userId,
                            rowIdx,
                            filteredSessionData,
                            scheduleData,
                            dateColumns,
                            mode === "group" ? String((data as RowGroup).id) : undefined
                        )}
                    </td>
                </tr>
            ))}

            {/* Summary Row: day values = only hours displayed in grid (so total matches sum of shift row totals) */}
            <tr
                className={`transition-colors bg-gray-100`} // Simplification
            >
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center whitespace-nowrap">
                    Total
                </td>
                {(() => {
                    const dayTotals = dateColumns.map((dateCol) =>
                        mode === "group" && calculateGroupDayTotalFromGrid
                            ? calculateGroupDayTotalFromGrid(
                                  String((data as RowGroup).id),
                                  userId,
                                  dateCol.date
                              )
                            : calculateUserDayTotalFromGrid(userId, dateCol.date)
                    );
                    const rowTotalFromColumns = parseFloat(
                        dayTotals.reduce((s, v) => s + v, 0).toFixed(2)
                    );
                    return (
                        <>
                            {dayTotals.map((dayTotal, i) => (
                                <td
                                    key={dateColumns[i].date}
                                    className="border border-gray-300 px-4 py-3 text-center text-sm font-medium whitespace-nowrap"
                                >
                                    {dayTotal > 0 ? dayTotal : "-"}
                                </td>
                            ))}
                            <td className="border border-gray-300 px-4 py-3 text-center font-medium whitespace-nowrap">
                                {rowTotalFromColumns > 0 ? rowTotalFromColumns : "-"}
                            </td>
                        </>
                    );
                })()}
            </tr>
        </React.Fragment>
    );
};

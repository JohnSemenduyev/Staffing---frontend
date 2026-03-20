import React from "react";
import { Button } from "../ui/button";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { formatTimeDisplay, shiftSpansNextDay, timeToMinutes } from "../../lib/utils";
import { Shift, SessionItem } from "../../types/schedule";

/** Display range for a session in a cell: uses shift.splitSide and session span so overnight shows x–24:00 / 00:00–y. */
function sessionDisplayRange(session: SessionItem, shift: Shift | null): { start: string; end: string } {
    const ci = session.clockIn || "";
    const co = session.clockOut || "";
    if (!shift?.isSplit || !ci || !co) return { start: formatTimeDisplay(ci) || "N/A", end: formatTimeDisplay(co) || "N/A" };
    if (shift.splitSide === "end") {
        // For overnight shifts, the end-day cell may start at midnight (sessions that began before midnight)
        // OR at the session's real clock-in time (sessions that began after midnight but still belong to this shift).
        const shiftEnd = shift.endTime || "";
        const ciM = timeToMinutes(ci);
        const shiftEndM = shiftEnd ? timeToMinutes(shiftEnd) : 0;
        const start = shiftEndM > 0 && ciM <= shiftEndM ? formatTimeDisplay(ci) : "00:00";
        return { start, end: formatTimeDisplay(co) };
    }
    if (shift.splitSide === "start" && shiftSpansNextDay(ci, co)) return { start: formatTimeDisplay(ci), end: "24:00" };
    return { start: formatTimeDisplay(ci), end: formatTimeDisplay(co) };
}

interface ActualTableCellProps {
    shift: Shift | null;
    sessions: SessionItem[];
    isEditMode: boolean;
    hasMismatch: boolean;
    onEditShift: () => void;
    onDeleteAll: () => void;
}

export const ActualTableCell: React.FC<ActualTableCellProps> = ({
    shift,
    sessions,
    isEditMode,
    hasMismatch,
    onEditShift,
    onDeleteAll,
}) => {
    const hasSessions = sessions.length > 0;

    return (
        <td
            className={`border border-gray-300 px-4 py-3 text-center text-sm whitespace-nowrap ${hasMismatch ? "bg-red-100 border-red-300" : ""
                }`}
            title={
                hasMismatch
                    ? "Time mismatch: Total actual time does not equal scheduled shift duration"
                    : ""
            }
        >
            {isEditMode && shift && (
                <div className="flex items-center space-x-1 opacity-100 mb-1 justify-center">
                    <Button
                        onClick={onEditShift}
                        variant="ghost"
                        size="icon-sm"
                        className="text-blue-600 p-0.5"
                        title="Edit sessions"
                    >
                        <FaRegEdit className="w-4 h-4" color="blue" />
                    </Button>
                    {hasSessions && (
                        <Button
                            onClick={onDeleteAll}
                            variant="ghost"
                            size="icon-sm"
                            className="text-red-600 p-0.5"
                            title="Delete all sessions"
                        >
                            <FaRegTrashAlt className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            )}
            {hasSessions ? (
                <div className="flex flex-col items-center gap-1">
                    {sessions.map(s => {
                        const range = sessionDisplayRange(s, shift);
                        const displayStart = range.start === "24:00" ? "00:00" : range.start;
                        const displayEnd = range.end === "24:00" ? "24:00" : range.end;
                        return (
                            <span key={s.id} className="text-xs px-2 py-0.5 rounded-md">
                                {displayStart} – {displayEnd}
                            </span>
                        );
                    })}
                </div>
            ) : (
                <span className="text-gray-400">-</span>
            )}
        </td>
    );
};

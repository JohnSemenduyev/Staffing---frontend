import React from "react";
import { Button } from "../ui/button";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { formatTimeDisplay } from "../../lib/utils"; // Adjust import path
import { Shift, SessionItem } from "../../types/schedule";

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
                    {sessions.map(s => (
                        <span
                            key={s.id}
                            className="text-xs px-2 py-0.5 rounded-md"
                        >
                            {(s.clockIn || "N/A")} -{" "}
                            {formatTimeDisplay(
                                s.clockOut || "N/A"
                            )}
                        </span>
                    ))}
                </div>
            ) : (
                <span className="text-gray-400">-</span>
            )}
        </td>
    );
};

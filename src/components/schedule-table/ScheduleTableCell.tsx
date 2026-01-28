import React from "react";
import { FaRegTrashAlt, FaRegEdit } from "react-icons/fa";
import { GripVertical } from "lucide-react";
import ToggleSwitch from "../ui/toggle";
import { Shift, SessionItem } from "../../types/schedule";
import { formatTimeDisplay } from "../../lib/utils";

interface ScheduleTableCellProps {
    shift: Shift | undefined;
    dateCol: { date: string };
    rowUserId: number;
    rowIdx: number;
    isEditMode: boolean;
    readOnly?: boolean;
    dragOverCell: any;
    handleDragStart: (e: React.DragEvent, shift: Shift, userId: number, date: string, rowIdx: number) => void;
    handleDragEnd: () => void;
    handleDragOver: (e: React.DragEvent, userId: number, date: string, rowIdx: number) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent, userId: number, date: string, rowIdx: number) => void;
    handleEditShift: (userId: number, date: string, shift: Shift) => void;
    handleDeleteShift: (userId: number, date: string, shiftId: number) => void;
    onShiftAutoToggle?: (userId: number, date: string, shiftId: number, enabled: boolean) => void;
    handleShiftAutoToggleLocal: (userId: number, date: string, shiftId: number, enabled: boolean) => void;
    hasMismatch: boolean;
    isDraft: boolean;
}

export const ScheduleTableCell: React.FC<ScheduleTableCellProps> = ({
    shift,
    dateCol,
    rowUserId,
    rowIdx,
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
    hasMismatch,
    isDraft
}) => {
    return (
        <td
            className={`border border-gray-300 px-4 py-3 text-center text-sm whitespace-nowrap ${!readOnly &&
                    dragOverCell?.userId === rowUserId &&
                    dragOverCell?.date === dateCol.date
                    ? "bg-blue-50 border-blue-300"
                    : hasMismatch
                        ? "bg-red-100 border-red-300"
                        : isDraft
                            ? "bg-amber-50 border-amber-200"
                            : ""
                }`}
            onDragOver={
                !readOnly
                    ? (e) => handleDragOver(e, rowUserId, dateCol.date, rowIdx)
                    : undefined
            }
            onDragLeave={!readOnly ? handleDragLeave : undefined}
            onDrop={
                !readOnly
                    ? (e) => handleDrop(e, rowUserId, dateCol.date, rowIdx)
                    : undefined
            }
        >
            {shift ? (
                <div className="relative group">
                    {isEditMode && !readOnly && (
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity mb-1 justify-center">
                            <div
                                className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                                draggable
                                onDragStart={(e) =>
                                    handleDragStart(
                                        e,
                                        shift,
                                        rowUserId,
                                        dateCol.date,
                                        rowIdx
                                    )
                                }
                                onDragEnd={handleDragEnd}
                            >
                                <GripVertical className="w-4 h-4" />
                            </div>
                            <button
                                onClick={() =>
                                    handleEditShift(rowUserId, dateCol.date, shift)
                                }
                                className="text-blue-600 hover:text-blue-800 p-0.5 hover:bg-blue-50 rounded"
                                title="Edit shift"
                            >
                                <FaRegEdit className="w-4 h-4" color="blue" />
                            </button>
                            <button
                                onClick={() =>
                                    handleDeleteShift(
                                        rowUserId,
                                        dateCol.date,
                                        shift.id
                                    )
                                }
                                className="text-red-600 hover:text-red-800 p-0.5 hover:bg-red-50 rounded"
                                title="Delete shift"
                            >
                                <FaRegTrashAlt className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <div className="flex items-center gap-2 justify-center flex-col">
                        <span className="text-sm">
                            {`${shift.startTime} - ${formatTimeDisplay(
                                shift.endTime
                            )}`}
                        </span>

                        {/* AUTO TOGGLE */}
                        <div className="w-[50px] h-[20px]">
                            <ToggleSwitch
                                size="small"
                                enabled={Boolean(shift.auto)}
                                disabled={!isEditMode || readOnly}
                                onToggle={(enabled) => {
                                    if (readOnly || !isEditMode) return;
                                    if (onShiftAutoToggle) {
                                        onShiftAutoToggle(
                                            rowUserId,
                                            dateCol.date,
                                            shift.id,
                                            enabled
                                        );
                                    } else {
                                        handleShiftAutoToggleLocal(
                                            rowUserId,
                                            dateCol.date,
                                            shift.id,
                                            enabled
                                        );
                                    }
                                }}
                            />
                        </div>
                        {isDraft && (
                            <span className="text-[10px] uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                                Draft
                            </span>
                        )}
                        {/* Confirm/Reject indicator (only in view mode) */}
                        {!readOnly &&
                            !isEditMode &&
                            (shift.confirm || shift.reject) && (
                                <div className="flex items-center justify-center m-1 absolute bottom-0 right-0">
                                    {shift.confirm && (
                                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                            <svg
                                                className="w-3 h-3 text-white"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </div>
                                    )}
                                    {shift.reject && (
                                        <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                            <svg
                                                className="w-3 h-3 text-white"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            )}
                    </div>
                </div>
            ) : (
                <span className="text-gray-400">-</span>
            )}
        </td>
    );
};

import React from "react";
import { FaRegTrashAlt, FaRegEdit } from "react-icons/fa";
import { GoPlus } from "react-icons/go";
import type { EditSessionRowState } from "../../utils/sessionCalendar";
import { CustomDatePicker } from "../CustomDatePicker";

interface ActualTableModalsProps {
    deleteAllModal: { isOpen: boolean; shiftId: number | null };
    confirmDeleteAllForShift: () => void;
    cancelDeleteAllForShift: () => void;

    editShiftModal: { isOpen: boolean; userId: number | null; date: string | null; shiftId: number | null };
    editShiftInfo?: { date?: string | null; startTime?: string | null; endTime?: string | null } | null;
    editSessions: EditSessionRowState[];
    setEditSessions: React.Dispatch<React.SetStateAction<EditSessionRowState[]>>;
    addEditSessionRow: () => void;
    removeEditSessionRow: (index: number) => void;
    saveEditShiftSessions: () => void;
    cancelEditShiftSessions: () => void;
    isOverflowShiftForEdit?: boolean;
    editSessionDateLimits?: { minDate: string; maxDate: string };

    deleteUserModal: { isOpen: boolean; userId: number | null };
    confirmDeleteUser: () => void;
    cancelDeleteUser: () => void;

    editModeConfirmModal: { isOpen: boolean };
    confirmEditModeToggle: () => void;
    cancelEditModeToggle: () => void;
}

export const ActualTableModals: React.FC<ActualTableModalsProps> = ({
    deleteAllModal,
    confirmDeleteAllForShift,
    cancelDeleteAllForShift,
    editShiftModal,
    editShiftInfo,
    editSessions,
    setEditSessions,
    addEditSessionRow,
    removeEditSessionRow,
    saveEditShiftSessions,
    cancelEditShiftSessions,
    isOverflowShiftForEdit = false,
    editSessionDateLimits,
    deleteUserModal,
    confirmDeleteUser,
    cancelDeleteUser,
    editModeConfirmModal,
    confirmEditModeToggle,
    cancelEditModeToggle,
}) => {
    const formatShiftDate = (raw?: string | null) => {
        if (!raw) return "";
        const ymd = raw.includes("T") ? raw.split("T")[0] : raw;
        const d = new Date(`${ymd}T00:00:00`);
        if (Number.isNaN(d.getTime())) return ymd;
        return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    };

    const shiftDateLabel = formatShiftDate(editShiftInfo?.date);
    const shiftTimeLabel =
        editShiftInfo?.startTime && editShiftInfo?.endTime
            ? `${editShiftInfo.startTime} - ${editShiftInfo.endTime}`
            : "";
    const toMinutes = (t?: string | null) => {
        if (!t) return 0;
        if (t === "24:00") return 24 * 60;
        const [h, m] = t.split(":").map(Number);
        return (h || 0) * 60 + (m || 0);
    };
    const isOvernightShift =
        Boolean(editShiftInfo?.startTime && editShiftInfo?.endTime) &&
        toMinutes(editShiftInfo?.endTime) <= toMinutes(editShiftInfo?.startTime);

    return (
        <>
            {/* Delete All Sessions for Shift */}
            {deleteAllModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="mb-6">
                            <p className="text-sm text-gray-500">Delete all clock-in/clock-out entries for this shift?</p>
                        </div>
                        <div className="flex space-x-3 justify-end">
                            <button type="button" onClick={cancelDeleteAllForShift} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]">Cancel</button>
                            <button type="button" onClick={confirmDeleteAllForShift} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center">
                                <FaRegTrashAlt className="w-4 h-4 mr-2" /> Delete All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Shift Sessions Modal */}
            {editShiftModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900">Edit Sessions</h3>
                            {(shiftDateLabel || shiftTimeLabel) && (
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-700">
                                        Shift: {[shiftDateLabel, shiftTimeLabel].filter(Boolean).join(" | ")}
                                    </p>
                                    <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isOvernightShift
                                                ? "bg-amber-100 text-amber-800"
                                                : "bg-emerald-100 text-emerald-800"
                                            }`}
                                    >
                                        {isOvernightShift ? "Overnight" : "Same-day"}
                                    </span>
                                </div>
                            )}
                        </div>
                        {isOverflowShiftForEdit && (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">
                                Overflow shift from previous week. Only end time (Check Out) can be edited.
                            </p>
                        )}
                        {editSessions.length === 0 && (
                            <div className="text-sm text-gray-500 mb-3">No sessions yet. Click "Add Session" to create one.</div>
                        )}
                        <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1">
                            {editSessions.map((row, idx) => (
                                <div key={idx} className="border border-gray-100 rounded-lg p-3 space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Check-in date</label>
                                            <CustomDatePicker
                                                value={row.clockInDate}
                                                onChange={(_, value) =>
                                                    setEditSessions(prev => prev.map((r, i) => i === idx ? { ...r, clockInDate: value, clockInDateExplicit: true } : r))
                                                }
                                                minDate={editSessionDateLimits?.minDate || undefined}
                                                maxDate={editSessionDateLimits?.maxDate || undefined}
                                                disabled={isOverflowShiftForEdit}
                                                fieldName="clockInDate"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Check-in time</label>
                                            <input type="time" value={row.clockIn} onChange={(e) => setEditSessions(prev => prev.map((r, i) => i === idx ? { ...r, clockIn: e.target.value } : r))} readOnly={isOverflowShiftForEdit} disabled={isOverflowShiftForEdit} className={`w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] focus:border-[#004175] ${isOverflowShiftForEdit ? "bg-gray-100 cursor-not-allowed" : ""}`} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Check-out date</label>
                                            <CustomDatePicker
                                                value={row.clockOutDate}
                                                onChange={(_, value) =>
                                                    setEditSessions(prev => prev.map((r, i) => i === idx ? { ...r, clockOutDate: value, clockOutDateExplicit: value.trim() !== "" } : r))
                                                }
                                                minDate={row.clockInDate || editSessionDateLimits?.minDate || undefined}
                                                maxDate={editSessionDateLimits?.maxDate || undefined}
                                                fieldName="clockOutDate"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Check-out time</label>
                                            <input type="time" value={row.clockOut} onChange={(e) => setEditSessions(prev => prev.map((r, i) => i === idx ? { ...r, clockOut: e.target.value } : r))} className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] focus:border-[#004175]" />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button type="button" onClick={() => removeEditSessionRow(idx)} className="text-red-600 inline-flex items-center px-2 py-2 hover:bg-red-50 rounded-md" title="Delete this session">
                                            <FaRegTrashAlt className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex space-x-3 justify-end mt-4 pt-4 border-t border-gray-200 bg-white">
                            <button onClick={addEditSessionRow} className="text-blue-600 inline-flex items-center text-sm">
                                <GoPlus className="w-4 h-4 mr-1" /> Add Session
                            </button>
                            <button type="button" onClick={cancelEditShiftSessions} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]">Cancel</button>
                            <button type="button" onClick={saveEditShiftSessions} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center">
                                <FaRegEdit className="w-4 h-4 mr-2" color="white" /> Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete User Confirmation Modal */}
            {deleteUserModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="mb-6">
                            <p className="text-sm text-gray-500">
                                Are you sure you want to delete all data for this user?
                            </p>
                        </div>
                        <div className="flex space-x-3 justify-end">
                            <button type="button" onClick={cancelDeleteUser} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]">Cancel</button>
                            <button type="button" onClick={confirmDeleteUser} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center">
                                <FaRegTrashAlt className="w-4 h-4 mr-2" /> Delete All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Mode Confirmation Modal */}
            {editModeConfirmModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="mb-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Unsaved Changes</h3>
                            <p className="text-sm text-gray-500">
                                You have unsaved changes. Switching edit mode will reset your changes. Are you sure you want to continue?
                            </p>
                        </div>
                        <div className="flex space-x-3 justify-end">
                            <button type="button" onClick={cancelEditModeToggle} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]">Cancel</button>
                            <button type="button" onClick={confirmEditModeToggle} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">Continue</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

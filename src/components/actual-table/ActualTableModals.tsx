import React from "react";
import { FaRegTrashAlt, FaRegEdit } from "react-icons/fa";
import { GoPlus } from "react-icons/go";
import type { EditSessionRowState } from "../../utils/sessionCalendar";

interface ActualTableModalsProps {
    deleteAllModal: { isOpen: boolean; shiftId: number | null };
    confirmDeleteAllForShift: () => void;
    cancelDeleteAllForShift: () => void;

    editShiftModal: { isOpen: boolean; userId: number | null; date: string | null; shiftId: number | null };
    editSessions: EditSessionRowState[];
    setEditSessions: React.Dispatch<React.SetStateAction<EditSessionRowState[]>>;
    addEditSessionRow: () => void;
    removeEditSessionRow: (index: number) => void;
    saveEditShiftSessions: () => void;
    cancelEditShiftSessions: () => void;
    isOverflowShiftForEdit?: boolean;

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
    editSessions,
    setEditSessions,
    addEditSessionRow,
    removeEditSessionRow,
    saveEditShiftSessions,
    cancelEditShiftSessions,
    isOverflowShiftForEdit = false,
    deleteUserModal,
    confirmDeleteUser,
    cancelDeleteUser,
    editModeConfirmModal,
    confirmEditModeToggle,
    cancelEditModeToggle,
}) => {
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
                    <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900">Edit Sessions</h3>
                        </div>
                        {isOverflowShiftForEdit && (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">
                                Overflow shift from previous week. Only end time (Check Out) can be edited.
                            </p>
                        )}
                        {editSessions.length === 0 && (
                            <div className="text-sm text-gray-500 mb-3">No sessions yet. Click "Add Session" to create one.</div>
                        )}
                        <div className="space-y-4 max-h-[50vh] overflow-auto pr-1">
                            {editSessions.map((row, idx) => (
                                <div key={idx} className="border border-gray-100 rounded-lg p-3 space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Check-in date</label>
                                            <input
                                                type="date"
                                                value={row.clockInDate}
                                                onChange={(e) => setEditSessions(prev => prev.map((r, i) => i === idx ? { ...r, clockInDate: e.target.value } : r))}
                                                readOnly={isOverflowShiftForEdit}
                                                disabled={isOverflowShiftForEdit}
                                                className={`w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] focus:border-[#004175] ${isOverflowShiftForEdit ? "bg-gray-100 cursor-not-allowed" : ""}`}
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
                                            <input
                                                type="date"
                                                value={row.clockOutDate}
                                                onChange={(e) => setEditSessions(prev => prev.map((r, i) => i === idx ? { ...r, clockOutDate: e.target.value } : r))}
                                                className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] focus:border-[#004175]"
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
                        <div className="flex space-x-3 justify-end mt-6">
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

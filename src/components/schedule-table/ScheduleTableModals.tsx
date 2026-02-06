import React from "react";
import { createPortal } from "react-dom";
import { FaRegTrashAlt, FaRegEdit } from "react-icons/fa";
import { Shift } from "../../types/schedule";
import { isOverflowShift } from "../../pages/Manager/ViewSchedule/utils";

const MODAL_Z_INDEX = 9999;

interface ScheduleTableModalsProps {
    deleteModal: { isOpen: boolean; shiftId?: number | null; userId?: number | null; date?: string | null; isSingleDraftSession?: boolean };
    confirmDeleteShift: () => void;
    cancelDeleteShift: () => void;

    editModal: { isOpen: boolean; shift?: Shift | null };
    editForm: { starttime: string; endtime: string };
    setEditForm: React.Dispatch<React.SetStateAction<{ starttime: string; endtime: string }>>;
    confirmEditShift: () => void;
    cancelEditShift: () => void;

    deleteUserModal: { isOpen: boolean };
    confirmDeleteUser: () => void;
    cancelDeleteUser: () => void;
    deletingUser: boolean;

    deleteLastShiftModal: { isOpen: boolean };
    confirmDeleteLastShift: () => void;
    cancelDeleteLastShift: () => void;
    deletingLastShift: boolean;

    editModeConfirmModal: { isOpen: boolean };
    confirmEditModeToggle: () => void;
    cancelEditModeToggle: () => void;
    currentWeekRange: any;
}

export const ScheduleTableModals: React.FC<ScheduleTableModalsProps> = ({
    deleteModal,
    confirmDeleteShift,
    cancelDeleteShift,
    editModal,
    editForm,
    setEditForm,
    confirmEditShift,
    cancelEditShift,
    deleteUserModal,
    confirmDeleteUser,
    cancelDeleteUser,
    deletingUser,
    deleteLastShiftModal,
    confirmDeleteLastShift,
    cancelDeleteLastShift,
    deletingLastShift,
    editModeConfirmModal,
    confirmEditModeToggle,
    cancelEditModeToggle,
    currentWeekRange
}) => {
    // Helper to check if shift is overflow
    const isOverflow = React.useMemo(() => {
        if (!editModal.shift?.date || !currentWeekRange?.startOfWeek) return false;
        return isOverflowShift(editModal.shift.date, currentWeekRange.startOfWeek);
    }, [editModal.shift, currentWeekRange]);

    return (
        <>
            {/* Delete Shift Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="mb-6">
                            <p className="text-sm text-gray-500">
                                {deleteModal.isSingleDraftSession
                                    ? "This is the only shift in this draft. Deleting it will remove the entire draft schedule. Continue?"
                                    : "Are you sure you want to delete this shift?"}
                            </p>
                        </div>
                        <div className="flex space-x-3 justify-end">
                            <button
                                type="button"
                                onClick={cancelDeleteShift}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteShift}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center"
                            >
                                <FaRegTrashAlt className="w-4 h-4 mr-2" />
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Shift Modal */}
            {editModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Edit Shift</h3>
                            {isOverflow && (
                                <p className="text-xs text-amber-600 mt-1">
                                    Note: This is an overflow shift from a previous week. Only the end time can be modified.
                                </p>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Start Time
                                </label>
                                <input
                                    type="time"
                                    value={editForm.starttime}
                                    disabled={isOverflow}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({ ...prev, starttime: e.target.value }))
                                    }
                                    className={`w-full px-3 py-1 border border-[#d0d4d9] rounded-md placeholder:text-gray-500 font-normal focus:outline-none focus:ring-2 focus:ring-[#004175] transition appearance-none ${isOverflow ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    End Time
                                </label>
                                <input
                                    type="time"
                                    value={editForm.endtime}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({ ...prev, endtime: e.target.value }))
                                    }
                                    className="w-full px-3 py-1 border border-[#d0d4d9] rounded-md placeholder:text-gray-500 font-normal focus:outline-none focus:ring-2 focus:ring-[#004175] transition appearance-none"
                                />
                            </div>
                        </div>

                        <div className="flex space-x-3 justify-end mt-6">
                            <button
                                type="button"
                                onClick={cancelEditShift}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmEditShift}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                            >
                                <FaRegEdit className="w-4 h-4 mr-2" color="white" />
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete User Modal (schedule-level) - portaled so confirm dialog is always visible */}
            {deleteUserModal.isOpen && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: MODAL_Z_INDEX }}>
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                        <div className="mb-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete schedule for this user?</h3>
                            <p className="text-sm text-gray-500">
                                Are you sure you want to delete all schedule data for this user?
                            </p>
                        </div>

                        <div className="flex space-x-3 justify-end">
                            <button
                                type="button"
                                onClick={cancelDeleteUser}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteUser}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center"
                            >
                                {deletingUser ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                ) : (
                                    <FaRegTrashAlt className="w-4 h-4 mr-2" />
                                )}
                                Delete All
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Last Shift -> Entire Schedule Modal - portaled so confirm dialog is always visible */}
            {deleteLastShiftModal.isOpen && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: MODAL_Z_INDEX }}>
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                        <div className="mb-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Delete Schedule for This Week
                            </h3>
                            <p className="text-sm text-gray-500">
                                This is the only shift in the current week. Deleting it will
                                delete the schedule for this week only (previous and next weeks
                                are not affected). Are you sure you want to proceed?
                            </p>
                        </div>

                        <div className="flex space-x-3 justify-end">
                            <button
                                type="button"
                                onClick={cancelDeleteLastShift}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteLastShift}
                                disabled={deletingLastShift}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center"
                            >
                                {deletingLastShift ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <FaRegTrashAlt className="w-4 h-4 mr-2" />
                                        Delete Schedule for This Week
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Edit mode unsaved changes modal */}
            {editModeConfirmModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="mb-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Unsaved Changes
                            </h3>
                            <p className="text-sm text-gray-500">
                                You have unsaved changes. Switching edit mode will reset your
                                changes. Are you sure you want to continue?
                            </p>
                        </div>

                        <div className="flex space-x-3 justify-end">
                            <button
                                type="button"
                                onClick={cancelEditModeToggle}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmEditModeToggle}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

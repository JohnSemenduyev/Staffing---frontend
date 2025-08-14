import React, { useState } from "react";
import { Edit, Trash2, GripVertical } from "lucide-react";
import ToggleSwitch from "../../../components/ui/toggle";
import { ScheduleItem, Shift, DateColumn, DraggedShift, DragOverCell } from "./types";
import { 
  getMaxShiftsPerDay, 
  sortShiftsByTime, 
  calculateUserTotal, 
  calculateDayTotal, 
  calculateGrandTotal 
} from "./utils";
import { toast } from "sonner";

interface ActualTimeTableProps {
  scheduleData: ScheduleItem[];
  dateColumns: DateColumn[];
  isEditMode: boolean;
}

interface DeleteModalState {
  isOpen: boolean;
  userId: number | null;
  date: string | null;
  shiftId: number | null;
}

interface EditModalState {
  isOpen: boolean;
  userId: number | null;
  date: string | null;
  shift: Shift | null;
}

interface DeleteUserModalState {
  isOpen: boolean;
  userId: number | null;
}

export const ActualTimeTable: React.FC<ActualTimeTableProps> = ({
  scheduleData,
  dateColumns,
  isEditMode
}) => {
  // Local state for the actual time table
  const [actualTimeData, setActualTimeData] = useState<ScheduleItem[]>(scheduleData);
  const [draggedShift, setDraggedShift] = useState<DraggedShift | null>(null);
  const [dragOverCell, setDragOverCell] = useState<DragOverCell | null>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({ 
    isOpen: false, 
    userId: null, 
    date: null, 
    shiftId: null 
  });
  const [editModal, setEditModal] = useState<EditModalState>({ 
    isOpen: false, 
    userId: null, 
    date: null, 
    shift: null 
  });
  const [deleteUserModal, setDeleteUserModal] = useState<DeleteUserModalState>({ 
    isOpen: false, 
    userId: null 
  });
  const [editForm, setEditForm] = useState({ starttime: "", endtime: "" });

  // Update actual time data when schedule data changes
  React.useEffect(() => {
    setActualTimeData(scheduleData);
  }, [scheduleData]);

  // Get unique users from actual time data
  const getUniqueUsers = () => {
    const userMap = new Map();
    actualTimeData.forEach(item => {
      if (!userMap.has(item.userId)) {
        userMap.set(item.userId, {
          id: item.userId,
          name: item.userName,
          phone: item.userPhone
        });
      }
    });
    return Array.from(userMap.values());
  };

  const uniqueUsers = getUniqueUsers();

  // Edit shift functionality
  const handleEditShift = (userId: number, date: string, shift: Shift) => {
    console.log('Actual time edit shift called with:', { userId, date, shift });
    setEditModal({
      isOpen: true,
      userId,
      date,
      shift
    });
    // Handle both session data (clockIn/clockOut) and schedule data (startTime/endTime)
    const startTime = shift.clockIn !== undefined ? shift.clockIn : shift.startTime;
    const endTime = shift.clockOut !== undefined ? shift.clockOut : shift.endTime;
    setEditForm({
      starttime: startTime || '',
      endtime: endTime || ''
    });
  };

  const confirmEditShift = () => {
    if (!editModal.isOpen || !editModal.userId || !editModal.date || !editModal.shift) {
      return;
    }

    setActualTimeData(prev => {
      const updated = prev.map(item => {
        if (item.userId === editModal.userId && item.startDate === editModal.date) {
          const newShifts = item.shifts.map(shift =>
            shift.id === editModal.shift?.id
              ? { 
                  ...shift, 
                  clockIn: editForm.starttime, 
                  clockOut: editForm.endtime,
                  startTime: editForm.starttime, 
                  endTime: editForm.endtime 
                }
              : shift
          );
          return { ...item, shifts: newShifts };
        }
        return item;
      });
      return updated;
    });

    setEditModal({ isOpen: false, userId: null, date: null, shift: null });
    setEditForm({ starttime: '', endtime: '' });
    toast.success('Actual time updated successfully!');
  };

  const cancelEditShift = () => {
    setEditModal({ isOpen: false, userId: null, date: null, shift: null });
    setEditForm({ starttime: '', endtime: '' });
  };

  // Delete shift functionality
  const handleDeleteShift = (userId: number, date: string, shiftId: number) => {
    setDeleteModal({ isOpen: true, userId, date, shiftId });
  };

  const confirmDeleteShift = () => {
    if (!deleteModal.isOpen || !deleteModal.userId || !deleteModal.date || !deleteModal.shiftId) return;

    setActualTimeData(prev =>
      prev.map(item => {
        if (item.userId === deleteModal.userId && item.startDate === deleteModal.date) {
          const newShifts = item.shifts.filter(shift => shift.id !== deleteModal.shiftId);
          return { ...item, shifts: newShifts };
        }
        return item;
      })
    );

    setDeleteModal({ isOpen: false, userId: null, date: null, shiftId: null });
    toast.success('Shift deleted successfully!');
  };

  const cancelDeleteShift = () => {
    setDeleteModal({ isOpen: false, userId: null, date: null, shiftId: null });
  };

  // Delete user functionality
  const handleDeleteUser = (userId: number) => {
    setDeleteUserModal({ isOpen: true, userId });
  };

  const confirmDeleteUser = () => {
    if (!deleteUserModal.isOpen || !deleteUserModal.userId) return;

    setActualTimeData(prev => prev.filter(item => item.userId !== deleteUserModal.userId));
    setDeleteUserModal({ isOpen: false, userId: null });
    toast.success('User data deleted successfully!');
  };

  const cancelDeleteUser = () => {
    setDeleteUserModal({ isOpen: false, userId: null });
  };

  // User auto toggle functionality
  const handleUserAutoToggle = (userId: number, enabled: boolean) => {
    setActualTimeData(prev =>
      prev.map(item =>
        item.userId === userId
          ? { ...item, auto: enabled }
          : item
      )
    );
    toast.success(`Auto setting ${enabled ? 'enabled' : 'disabled'} for user.`);
  };

  // Drag and drop functionality
  const handleDragStart = (e: React.DragEvent, shift: Shift, sourceUserId: number, sourceDate: string, sourceRowIdx: number) => {
    setDraggedShift({
      shift,
      sourceUserId,
      sourceDate,
      sourceRowIdx
    });
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent, targetUserId: number, targetDate: string, targetRowIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverCell({
      userId: targetUserId,
      date: targetDate,
      rowIdx: targetRowIdx
    });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverCell(null);
  };

  const handleDrop = (e: React.DragEvent, targetUserId: number, targetDate: string, targetRowIdx: number) => {
    e.preventDefault();

    if (!draggedShift) return;

    const { shift, sourceUserId, sourceDate } = draggedShift;

    // Check if target user-date combination already exists
    const existingItem = actualTimeData.find(item =>
      item.userId === targetUserId && item.startDate === targetDate
    );

    if (existingItem && existingItem.shifts.length > 0) {
      // Cell has existing data - replace at target position
      setActualTimeData(prev =>
        prev.map(item => {
          if (item.userId === targetUserId && item.startDate === targetDate) {
            const newShifts = [...item.shifts];
            
            // Extract time data from the dragged shift
            const clockIn = shift.clockIn !== undefined ? shift.clockIn : shift.startTime;
            const clockOut = shift.clockOut !== undefined ? shift.clockOut : shift.endTime;
            
            // Create new session with proper time data
            const newSessionShift = {
              ...shift,
              id: Date.now() + Math.random(), // Generate new ID
              clockIn: clockIn,
              clockOut: clockOut,
              startTime: clockIn,
              endTime: clockOut
            };
            
            newShifts.splice(targetRowIdx, 1, newSessionShift);
            return { ...item, shifts: newShifts };
          }
          return item;
        })
      );
    } else {
      // Empty cell - create new item
      const sourceItem = actualTimeData.find(item => 
        item.userId === sourceUserId && item.startDate === sourceDate
      );
      
      if (sourceItem) {
        const clockIn = shift.clockIn !== undefined ? shift.clockIn : shift.startTime;
        const clockOut = shift.clockOut !== undefined ? shift.clockOut : shift.endTime;
        
        const newSessionItem = {
          ...sourceItem,
          userId: targetUserId,
          startDate: targetDate,
          shifts: [{ 
            ...shift, 
            id: Date.now() + Math.random(),
            clockIn: clockIn,
            clockOut: clockOut,
            startTime: clockIn,
            endTime: clockOut
          }]
        };
        
        setActualTimeData(prev => [...prev, newSessionItem]);
      }
    }

    setDraggedShift(null);
    setDragOverCell(null);
    toast.success('Session moved successfully!');
  };

  const handleDragEnd = () => {
    setDraggedShift(null);
    setDragOverCell(null);
  };

  return (
    <>
      <div className="relative w-full rounded-2xl border border-gray-200 shadow-xl">
        <div className="w-full overflow-auto rounded-2xl" style={{ maxHeight: "600px" }}>
          <table className="w-auto min-w-full table-fixed text-sm text-gray-800 font-sans border-collapse">
            <thead className="bg-[#004175] text-white text-xs font-sans sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left border border-gray-300 whitespace-nowrap">
                  Employee Name
                </th>
                {dateColumns.map(dateCol => (
                  <th key={dateCol.date} className="px-4 py-3 text-center border border-gray-300 whitespace-nowrap" style={{ minWidth: '120px' }}>
                    {dateCol.display}
                  </th>
                ))}
                <th className="px-4 py-3 text-center border border-gray-300 whitespace-nowrap">
                  Total
                </th>
                <th className="px-4 py-3 text-center border border-gray-300 whitespace-nowrap w-16">
                  Auto
                </th>
              </tr>
            </thead>
            <tbody className="relative">
              {uniqueUsers.map((user, userIndex) => {
                const rowCount = getMaxShiftsPerDay(user.id, actualTimeData);

                return (
                  <React.Fragment key={user.id}>
                    {[...Array(rowCount)].map((_, rowIdx) => (
                      <tr
                        key={`${user.id}-row-${rowIdx}`}
                        className={`hover:bg-blue-50 transition-colors ${(userIndex + rowIdx) % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                          }`}
                      >
                        {rowIdx === 0 && (
                          <td
                            className="border border-gray-300 px-4 py-3 text-center align-middle whitespace-nowrap"
                            rowSpan={rowCount}
                          >
                            <div className="font-medium text-gray-800">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.phone}</div>
                          </td>
                        )}

                        {dateColumns.map(dateCol => {
                          const daySchedules = actualTimeData.filter(
                            i => i.userId === user.id && i.startDate === dateCol.date
                          );
                          const sortedShifts = sortShiftsByTime(
                            daySchedules.flatMap(s => s.shifts)
                          );
                          const shift = sortedShifts[rowIdx]; // take nth shift of the day

                          return (
                            <td
                              key={dateCol.date + '-' + rowIdx}
                              className={`border border-gray-300 px-4 py-3 text-center text-sm whitespace-nowrap ${dragOverCell?.userId === user.id && dragOverCell?.date === dateCol.date
                                  ? 'bg-blue-50 border-blue-300'
                                  : ''
                                }`}
                              onDragOver={e => handleDragOver(e, user.id, dateCol.date, rowIdx)}
                              onDragLeave={handleDragLeave}
                              onDrop={e => handleDrop(e, user.id, dateCol.date, rowIdx)}
                            >
                              {shift ? (
                                <div className="relative group">
                                  {isEditMode && (
                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity mb-1 justify-center">
                                      <div
                                        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                                        draggable
                                        onDragStart={e => handleDragStart(e, shift, user.id, dateCol.date, rowIdx)}
                                        onDragEnd={handleDragEnd}
                                      >
                                        <GripVertical className="w-4 h-4" />
                                      </div>
                                      <button
                                        onClick={() => handleEditShift(user.id, dateCol.date, shift)}
                                        className="text-blue-600 hover:text-blue-800 p-0.5 hover:bg-blue-50 rounded"
                                        title="Edit shift"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteShift(user.id, dateCol.date, shift.id)}
                                        className="text-red-600 hover:text-red-800 p-0.5 hover:bg-red-50 rounded"
                                        title="Delete shift"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                  <span className="text-sm">
                                    {/* Session data has clockIn/clockOut, Shift data has startTime/endTime */}
                                    {shift.clockIn !== undefined || shift.clockOut !== undefined ? (
                                      // Session data - use clockIn/clockOut
                                      `${shift.clockIn || 'N/A'} - ${shift.clockOut || 'N/A'}`
                                    ) : (
                                      // Shift data - use startTime/endTime
                                      `${shift.startTime} - ${shift.endTime}`
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          );
                        })}

                        {rowIdx === 0 && (
                          <>
                            <td
                              className="border border-gray-300 px-4 py-3 text-center font-medium whitespace-nowrap"
                              rowSpan={rowCount}
                            >
                              {calculateUserTotal(user.id, actualTimeData)}
                            </td>
                            <td
                              className="border border-gray-300 px-4 py-3 text-center w-16 align-middle whitespace-nowrap"
                              rowSpan={rowCount}
                            >
                              <div className="flex items-center justify-center">
                                <ToggleSwitch
                                  enabled={actualTimeData.find(item => item.userId === user.id)?.auto || false}
                                  onToggle={enabled => handleUserAutoToggle(user.id, enabled)}
                                />
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}

                    <tr className={`transition-colors ${userIndex % 2 === 0 ? 'bg-gray-100' : 'bg-gray-200'}`}>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center whitespace-nowrap">
                        Total
                      </td>
                      {dateColumns.map(dateCol => {
                        const daySchedules = actualTimeData.filter(
                          i => i.userId === user.id && i.startDate === dateCol.date
                        );
                        const dayTotal = daySchedules.reduce(
                          (t, s) => t + s.shifts.reduce((st, sh) => st + sh.hours, 0),
                          0
                        );
                        const rounded = parseFloat(dayTotal.toFixed(2));
                        return (
                          <td key={dateCol.date} className="border border-gray-300 px-4 py-3 text-center text-sm font-medium whitespace-nowrap">
                            {rounded > 0 ? rounded : '-'}
                          </td>
                        );
                      })}
                      <td className="border border-gray-300 px-4 py-3 text-center font-medium whitespace-nowrap">
                        {calculateUserTotal(user.id, actualTimeData)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center whitespace-nowrap">
                        {isEditMode && (
                          <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800 p-1" title="Delete all data for this user">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
              {/* Grand Total Row */}
              <tr className="bg-gray-50 font-medium">
                <td className="border border-gray-300 px-4 py-3 whitespace-nowrap">Grand Total</td>
                {dateColumns.map(dateCol => (
                  <td key={dateCol.date} className="border border-gray-300 px-4 py-3 text-center whitespace-nowrap">
                    {calculateDayTotal(dateCol.date, actualTimeData) || '-'}
                  </td>
                ))}
                <td className="border border-gray-300 px-4 py-3 text-center whitespace-nowrap">
                  {calculateGrandTotal(actualTimeData)}
                </td>
                <td className="border border-gray-300 px-4 py-3 whitespace-nowrap"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {/* Delete Shift Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Shift</h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this shift?
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
                <Trash2 className="w-4 h-4 mr-2" />
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
              <h3 className="text-lg font-medium text-gray-900">Edit Actual Time</h3>
              <p className="text-sm text-gray-500 mt-1">
                Update the start and end times for this session
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={editForm.starttime}
                  onChange={(e) => setEditForm(prev => ({ ...prev, starttime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] focus:border-[#004175]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={editForm.endtime}
                  onChange={(e) => setEditForm(prev => ({ ...prev, endtime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] focus:border-[#004175]"
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
                <Edit className="w-4 h-4 mr-2" />
                Update
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete User Data</h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete all data for this user?
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
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

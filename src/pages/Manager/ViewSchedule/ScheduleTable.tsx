import React from "react";
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
import { formatTimeDisplay, formatUSPhone } from "../../../lib/utils";

interface ScheduleTableProps {
  scheduleData: ScheduleItem[];
  setScheduleData: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
  dateColumns: DateColumn[];
  isEditMode: boolean;
  readOnly?: boolean; // New prop to completely disable edit functionality
  draggedShift: DraggedShift | null;
  setDraggedShift: React.Dispatch<React.SetStateAction<DraggedShift | null>>;
  dragOverCell: DragOverCell | null;
  setDragOverCell: React.Dispatch<React.SetStateAction<DragOverCell | null>>;
  onEditShift: (userId: number, date: string, shift: Shift) => void;
  onDeleteShift: (userId: number, date: string, shiftId: number) => void;
  onDeleteUser: (userId: number) => void;
  onUserAutoToggle: (userId: number, enabled: boolean) => void;
  onShiftAutoToggle?: (userId: number, date: string, shiftId: number, enabled: boolean) => void;
  onDragStart: (e: React.DragEvent, shift: Shift, sourceUserId: number, sourceDate: string, sourceRowIdx: number) => void;
  onDragOver: (e: React.DragEvent, targetUserId: number, targetDate: string, targetRowIdx: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetUserId: number, targetDate: string, targetRowIdx: number) => void;
  onDragEnd: () => void;
}

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  scheduleData,
  setScheduleData,
  dateColumns,
  isEditMode,
  readOnly = false,
  draggedShift,
  setDraggedShift,
  dragOverCell,
  setDragOverCell,
  onEditShift,
  onDeleteShift,
  onDeleteUser,
  onUserAutoToggle,
  onShiftAutoToggle,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd
}) => {
  console.log('ScheduleTable render:', { isEditMode, readOnly, scheduleDataLength: scheduleData.length });
  // Get unique users from schedule data
  const getUniqueUsers = () => {
    const userMap = new Map();
    scheduleData.forEach(item => {
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

  return (
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
              const rowCount = getMaxShiftsPerDay(user.id, scheduleData);

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
                                                      <div className="text-xs text-gray-500">{formatUSPhone(user.phone)}</div>
                        </td>
                      )}

                      {dateColumns.map(dateCol => {
                        const daySchedules = scheduleData.filter(
                          i => i.userId === user.id && i.startDate === dateCol.date
                        );
                        const sortedShifts = sortShiftsByTime(
                          daySchedules.flatMap(s => s.shifts)
                        );
                        const shift = sortedShifts[rowIdx]; // take nth shift of the day

                        return (
                          <td
                            key={dateCol.date + '-' + rowIdx}
                            className={`border border-gray-300 px-4 py-3 text-center text-sm whitespace-nowrap ${!readOnly && dragOverCell?.userId === user.id && dragOverCell?.date === dateCol.date
                                ? 'bg-blue-50 border-blue-300'
                                : ''
                              }`}
                            onDragOver={!readOnly ? (e => onDragOver(e, user.id, dateCol.date, rowIdx)) : undefined}
                            onDragLeave={!readOnly ? onDragLeave : undefined}
                            onDrop={!readOnly ? (e => onDrop(e, user.id, dateCol.date, rowIdx)) : undefined}
                          >
                            {shift ? (
                              <div className="relative group">
                                {isEditMode && !readOnly && (
                                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity mb-1 justify-center">
                                    <div
                                      className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                                      draggable
                                      onDragStart={e => onDragStart(e, shift, user.id, dateCol.date, rowIdx)}
                                      onDragEnd={onDragEnd}
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                    <button
                                      onClick={() => {
                                        console.log('Edit button clicked for shift:', shift);
                                        onEditShift(user.id, dateCol.date, shift);
                                      }}
                                      className="text-blue-600 hover:text-blue-800 p-0.5 hover:bg-blue-50 rounded"
                                      title="Edit shift"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => onDeleteShift(user.id, dateCol.date, shift.id)}
                                      className="text-red-600 hover:text-red-800 p-0.5 hover:bg-red-50 rounded"
                                      title="Delete shift"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 justify-center">
                                  <span className="text-sm">
                                    {`${shift.startTime} - ${formatTimeDisplay(shift.endTime)}`}
                                  </span>
                                  <div className="w-[46px]">
                                    <ToggleSwitch
                                      enabled={Boolean(shift.auto)}
                                      onToggle={(enabled) => {
                                        if (readOnly) return;
                                        if (onShiftAutoToggle) {
                                          onShiftAutoToggle(user.id, dateCol.date, shift.id, enabled);
                                        } else {
                                          setScheduleData(prev => prev.map(item => {
                                            if (item.userId === user.id && item.startDate === dateCol.date) {
                                              return { ...item, shifts: item.shifts.map(s => s.id === shift.id ? { ...s, auto: enabled } : s) };
                                            }
                                            return item;
                                          }));
                                        }
                                      }}
                                      disabled={readOnly}
                                    />
                                  </div>
                                </div>
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
                            {calculateUserTotal(user.id, scheduleData)}
                          </td>
                          <td
                            className="border border-gray-300 px-4 py-3 text-center w-16 align-middle whitespace-nowrap"
                            rowSpan={rowCount}
                          >
                            <div className="flex items-center justify-center">
                              <ToggleSwitch
                                enabled={scheduleData.find(item => item.userId === user.id)?.auto || false}
                                onToggle={readOnly ? undefined : (enabled => onUserAutoToggle(user.id, enabled))}
                                disabled={readOnly}
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
                      const daySchedules = scheduleData.filter(
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
                      {calculateUserTotal(user.id, scheduleData)}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center whitespace-nowrap">
                      {isEditMode && (
                        <button onClick={() => onDeleteUser(user.id)} className="text-red-600 hover:text-red-800 p-1" title="Delete all data for this user">
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
                  {calculateDayTotal(dateCol.date, scheduleData) || '-'}
                </td>
              ))}
              <td className="border border-gray-300 px-4 py-3 text-center whitespace-nowrap">
                {calculateGrandTotal(scheduleData)}
              </td>
              <td className="border border-gray-300 px-4 py-3 whitespace-nowrap"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

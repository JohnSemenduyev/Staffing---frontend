import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useToast } from "../../../hooks/use-toast";
import { ScheduleItem, WeekRange, DeleteModalState, EditModalState, DeleteUserModalState, DraggedShift, DragOverCell, Shift } from "./types";
import { 
  getWeekRangeFromDate, 
  convertDateFormat, 
  doTimesOverlap, 
  sortShiftsByTime, 
  calculateHours,
  validateForm 
} from "./utils";

export const useScheduleState = () => {
  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  const [currentWeekRange, setCurrentWeekRange] = useState<WeekRange | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedShift, setDraggedShift] = useState<DraggedShift | null>(null);
  const [dragOverCell, setDragOverCell] = useState<DragOverCell | null>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({ isOpen: false, shiftId: null, userId: null, date: null });
  const [editModal, setEditModal] = useState<EditModalState>({ isOpen: false, shift: null, userId: null, date: null });
  const [deleteUserModal, setDeleteUserModal] = useState<DeleteUserModalState>({ isOpen: false, userId: null });
  const [editForm, setEditForm] = useState({ starttime: "", endtime: "" });

  return {
    scheduleData,
    setScheduleData,
    currentWeekRange,
    setCurrentWeekRange,
    selectedDate,
    setSelectedDate,
    isEditMode,
    setIsEditMode,
    draggedShift,
    setDraggedShift,
    dragOverCell,
    setDragOverCell,
    deleteModal,
    setDeleteModal,
    editModal,
    setEditModal,
    deleteUserModal,
    setDeleteUserModal,
    editForm,
    setEditForm
  };
};

export const useScheduleActions = (
    scheduleData: ScheduleItem[],
    setScheduleData: React.Dispatch<React.SetStateAction<ScheduleItem[]>>,
    currentWeekRange: WeekRange | null,
    deleteModal: DeleteModalState, // Add this
    setDeleteModal: React.Dispatch<React.SetStateAction<DeleteModalState>>,
    editModal: EditModalState, // Add this
    setEditModal: React.Dispatch<React.SetStateAction<EditModalState>>,
    deleteUserModal: DeleteUserModalState, // Add this
    setDeleteUserModal: React.Dispatch<React.SetStateAction<DeleteUserModalState>>,
    editForm: { starttime: string; endtime: string }, // Add this
    setEditForm: React.Dispatch<React.SetStateAction<{ starttime: string; endtime: string }>>,
    draggedShift: DraggedShift | null, // Add this
    setDraggedShift: React.Dispatch<React.SetStateAction<DraggedShift | null>>,
    setDragOverCell: React.Dispatch<React.SetStateAction<DragOverCell | null>>
  ) => {
  const { toast: hookToast } = useToast();

  const handleDeleteShift = (userId: number, date: string, shiftId: number) => {
    setDeleteModal({ isOpen: true, shiftId, userId, date });
  };

  const confirmDeleteShift = () => {
    const { userId, date, shiftId } = deleteModal;
    setScheduleData(prev => prev.map(item => {
      if (item.userId === userId && item.startDate === date) {
        return {
          ...item,
          shifts: item.shifts.filter(shift => shift.id !== shiftId)
        };
      }
      return item;
    }).filter(item => item.shifts.length > 0));

    setDeleteModal({ isOpen: false, shiftId: null, userId: null, date: null });
    hookToast({
      title: "Shift Deleted",
      description: "Shift has been deleted successfully.",
    });
  };

  const cancelDeleteShift = () => {
    setDeleteModal({ isOpen: false, shiftId: null, userId: null, date: null });
  };

  const handleEditShift = (userId: number, date: string, shift: Shift) => {
    setEditModal({ isOpen: true, shift, userId, date });
    setEditForm({
      starttime: shift.startTime,
      endtime: shift.endTime
    });
  };

  const confirmEditShift = () => {
    const { userId, date, shift } = editModal;

    // Validate the edit form
    const tempForm = {
      userId: String(userId),
      date: date,
      starttime: editForm.starttime,
      endtime: editForm.endtime
    };

    const editErrors = validateForm(tempForm, scheduleData, shift?.id);

    if (Object.keys(editErrors).length > 0) {
      // Show error toast for overlapping shifts
      if (editErrors.overlap) {
        hookToast({
          title: "Overlapping Shift",
          description: editErrors.overlap,
          variant: "destructive",
        });
      }
      return;
    }

    setScheduleData(prev => prev.map(item => {
      if (item.userId === userId && item.startDate === date) {
        return {
          ...item,
          shifts: item.shifts.map(s =>
            s.id === shift?.id
              ? { ...s, startTime: editForm.starttime, endTime: editForm.endtime, hours: calculateHours(editForm.starttime, editForm.endtime) }
              : s
          )
        };
      }
      return item;
    }));

    setEditModal({ isOpen: false, shift: null, userId: null, date: null });
    setEditForm({ starttime: "", endtime: "" });
    hookToast({
      title: "Shift Updated",
      description: "Shift has been updated successfully.",
    });
  };

  const cancelEditShift = () => {
    setEditModal({ isOpen: false, shift: null, userId: null, date: null });
    setEditForm({ starttime: "", endtime: "" });
  };

  const handleDeleteUser = (userId: number) => {
    setDeleteUserModal({ isOpen: true, userId });
  };

  const confirmDeleteUser = () => {
    const { userId } = deleteUserModal;
    setScheduleData(prev => prev.filter(item => item.userId !== userId));
    setDeleteUserModal({ isOpen: false, userId: null });
    hookToast({
      title: "User Data Deleted",
      description: "All data for this user has been deleted successfully.",
    });
  };

  const cancelDeleteUser = () => {
    setDeleteUserModal({ isOpen: false, userId: null });
  };

  const handleUserAutoToggle = (userId: number, enabled: boolean) => {
    setScheduleData(prev => prev.map(item =>
      item.userId === userId ? { ...item, auto: enabled } : item
    ));

    hookToast({
      title: "Auto Setting Updated",
      description: `Auto setting ${enabled ? 'enabled' : 'disabled'} for user.`,
    });
  };

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
    setDragOverCell({ userId: targetUserId, date: targetDate, rowIdx: targetRowIdx });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverCell(null);
  };

 // Update the schedule table drag handlers in the useScheduleActions hook:
 const handleDrop = (e: React.DragEvent, targetUserId: number, targetDate: string, targetRowIdx: number) => {
    e.preventDefault();
    
    if (!draggedShift) return;
  
    const { shift, sourceUserId, sourceDate } = draggedShift;
  
    // Check if target user-date combination already exists
    const existingItem = scheduleData.find(item => 
      item.userId === targetUserId && item.startDate === targetDate
    );
  
    if (existingItem) {
      // Replace existing shifts at target position (copy operation)
      setScheduleData(prev => 
        prev.map(item => {
          if (item.userId === targetUserId && item.startDate === targetDate) {
            const newShifts = [...item.shifts];
            // Create a deep copy of the shift to avoid reference issues
            const deepCopiedShift = JSON.parse(JSON.stringify(shift));
            // Replace at the target position (remove existing if any)
            newShifts.splice(targetRowIdx, 1, { 
              ...deepCopiedShift, 
              date: targetDate,
              id: Date.now() + Math.random() // Generate new ID to avoid conflicts
            });
            return { ...item, shifts: newShifts };
          }
          return item;
        })
      );
    } else {
      // Create new item for target user-date combination
      const sourceItem = scheduleData.find(item => 
        item.userId === sourceUserId && item.startDate === sourceDate
      );
      
      if (sourceItem) {
        const deepCopiedShift = JSON.parse(JSON.stringify(shift));
        const newScheduleItem = {
          ...sourceItem,
          userId: targetUserId,
          startDate: targetDate,
          shifts: [{ 
            ...deepCopiedShift, 
            date: targetDate,
            id: Date.now() + Math.random()
          }]
        };
        
        setScheduleData(prev => [...prev, newScheduleItem]);
      }
    }
  
    setDraggedShift(null);
    setDragOverCell(null);
  };

  const handleDragEnd = () => {
    setDraggedShift(null);
    setDragOverCell(null);
  };

  const getUniqueUsers = (scheduleData: ScheduleItem[]) => {
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

  return {
    handleDeleteShift,
    confirmDeleteShift,
    cancelDeleteShift,
    handleEditShift,
    confirmEditShift,
    cancelEditShift,
    handleDeleteUser,
    confirmDeleteUser,
    cancelDeleteUser,
    handleUserAutoToggle,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  };
};

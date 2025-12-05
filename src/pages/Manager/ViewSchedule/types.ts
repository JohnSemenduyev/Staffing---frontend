export interface PeriodEndDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (date: string) => void;
  isLoading?: boolean;
}


export interface SessionData {
  id: number;
  shiftId: number;
  scheduleSessionId: number;
  clockIn: string | null;
  clockOut: string | null;
  workedTime: number | null;
  shift: {
    id: number;
    date: string;
  };
}

export interface FormData {
  userId: string;
  date: string;
  starttime: string;
  endtime: string;
}

export interface User {
  id: string | number;
  name: string;
  phone?: string;
}

export interface Shift {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  scheduleSessionId?: number;
  auto?: boolean;
  isDraft?: boolean;                 // optional flag
  draftShiftId?: number | null;      // from backend
  draftScheduleSessionId?: number | null;
  isDelete?: boolean;                 // flag to mark deleted draft shifts
  // Add these properties for session data
  clockIn?: string | null;
  clockOut?: string | null;
  workedTime?: number | null;
  shiftId?: number;
  shift?: {
    id: number;
    date: string;
  };
}

export interface ScheduleItem {
  id: number;
  clientId: number;
  addressId: number;
  userId: number;
  startDate: string;
  auto: boolean;
  shifts: Shift[];
  clientName: string;
  address: string;
  userName: string;
  userPhone: string;
}

export interface WeekRange {
  startOfWeek: Date;
  endOfWeek: Date;
}

export interface DateColumn {
  date: string;
  display: string;
}

export interface DeleteModalState {
  isOpen: boolean;
  shiftId: number | null;
  userId: number | null;
  date: string | null;
}

export interface EditModalState {
  isOpen: boolean;
  shift: Shift | null;
  userId: number | null;
  date: string | null;
}

export interface DeleteUserModalState {
  isOpen: boolean;
  userId: number | null;
}

export interface DraggedShift {
  shift: Shift;
  sourceUserId: number;
  sourceDate: string;
  sourceRowIdx: number;
}

export interface DragOverCell {
  userId: number;
  date: string;
  rowIdx: number;
}


export interface Shift {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    hours: number;
    scheduleSessionId?: number;
    clockIn?: string;
    clockOut?: string;
    auto?: boolean;
    confirm?: boolean;
    reject?: boolean;
    guardPrepared?: boolean;
    // NEW: flag if backend explicitly marks it as draft
    isDraft?: boolean;
    // Flag to mark deleted draft shifts
    isDelete?: boolean;
    actualHours?: number; // From ActualTimeTable
    draftShiftId?: number;
    draftScheduleSessionId?: number;
    isSplit?: boolean;
    splitSide?: 'start' | 'end';
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
    draftScheduleSession?: boolean;
    timeSetup?: {
        actualScheduledTime: number;
    };
    // API metadata for View Schedule total display logic
    apiWeeklyHours?: number | null;
    apiShiftHoursSum?: number | null;
    apiSessionKey?: string;
}

export interface SessionItem {
    id: number;
    shiftId?: number;
    scheduleSessionId: number;
    clockIn: string;
    clockOut?: string | null;
    /** YYYY-MM-DD when provided; legacy sessions may omit (shift-based inference). */
    clockInDate?: string | null;
    clockOutDate?: string | null;
    workedTime: number;
    shift?: {
        id: number;
        date: string;
        startTime?: string;
        endTime?: string;
    };
}

export interface RowGroup {
    id: string | number;
    userId: number;
    name: string;
    phone?: string;
    clientName: string;
    address: string;
    clientId: number;
    addressId: number;
}

export interface Client {
    id: string | number;
    name: string;
    lastName?: string; // Appears in PrepareSchedule
    addresses: Address[];
}

export interface Address {
    id: string | number;
    address: string;
    city?: string;
    state?: string;
    pincode?: string;
    label?: string;
}

export interface User {
    id: string | number;
    name: string;
    lastName?: string;
    phone?: string;
}

export interface DateColumn {
    date: string;
    display: string;
}

export interface WeekRange {
    startOfWeek: Date;
    endOfWeek: Date;
}

// TypeScript interfaces and types for Excel operations

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  style?: ExcelCellStyle;
}

export interface ExcelCellStyle {
  fill?: {
    type: 'pattern';
    pattern: 'solid';
    fgColor: { argb: string };
  };
  font?: {
    color?: { argb: string };
    bold?: boolean;
    size?: number;
  };
  alignment?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
  };
  border?: {
    style?: string;
    color?: { argb: string };
  };
}

export interface ExcelData {
  headers: string[];
  rows: any[][];
  worksheetName?: string;
  fileName?: string;
}

export interface ExcelExportOptions {
  fileName?: string;
  worksheetName?: string;
  includeTimestamp?: boolean;
  customStyles?: {
    headerStyle?: ExcelCellStyle;
    dataStyle?: ExcelCellStyle;
  };
}

export interface ScheduleExcelData {
  userId: string;
  userName: string;
  date: string;
  clockIn: string;
  clockOut: string;
  workedTime: number;
  totalHours: number;
}

export interface ActualTimeExcelData {
  employeeName: string;
  dailyHours: { [date: string]: number };
  totalHours: number;
}

export interface SummaryExcelData {
  firstName: string;
  lastName: string;
  date: string;
  clientName: string;
  location: string;
  hours: number;
}

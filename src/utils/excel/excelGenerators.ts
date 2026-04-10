import ExcelJS from 'exceljs';
import { ExcelData, ExcelExportOptions, ExcelCellStyle } from './excelTypes';
import { getAdjustedDate, shiftSpansNextDay, calculateHours } from '../../lib/utils';
import { actualTimeCellLookupKey } from '../actualTimeExportLayout';

/**
 * Core Excel generation utilities
 */

export class ExcelGenerator {
  private workbook: ExcelJS.Workbook;

  constructor() {
    this.workbook = new ExcelJS.Workbook();
  }

  /**
   * Generate and download Excel file
   */
  async generateAndDownload(
    data: ExcelData,
    options: ExcelExportOptions = {}
  ): Promise<void> {
    try {
      const worksheet = this.workbook.addWorksheet(
        options.worksheetName || data.worksheetName || 'Sheet1'
      );

      // Add headers
      if (data.headers.length > 0) {
        worksheet.addRow(data.headers);
        this.styleHeaderRow(worksheet, 1, options.customStyles?.headerStyle);
      }

      // Add data rows
      if (data.rows.length > 0) {
        worksheet.addRows(data.rows);
        this.styleDataRows(worksheet, 2, data.rows.length, options.customStyles?.dataStyle);
      }

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        if (column.values) {
          const maxLength = Math.max(
            ...column.values.map(value =>
              value ? value.toString().length : 0
            )
          );
          column.width = Math.min(maxLength + 2, 50);
        }
      });

      // Generate and download
      const buffer = await this.workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const fileName = this.generateFileName(
        options.fileName || data.fileName || 'Report',
        options.includeTimestamp
      );

      this.downloadFile(blob, fileName);
    } catch (error) {
      console.error('Error generating Excel file:', error);
      throw error;
    }
  }

  /**
   * Style header row
   */
  private styleHeaderRow(
    worksheet: ExcelJS.Worksheet,
    rowNumber: number,
    customStyle?: ExcelCellStyle
  ): void {
    const headerRow = worksheet.getRow(rowNumber);
    const defaultStyle: ExcelCellStyle = {
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1E90FF' }, // Blue
      },
      font: {
        color: { argb: 'FFFFFF' },
        bold: true,
      },
      alignment: {
        horizontal: 'center',
        vertical: 'middle',
      },
    };

    const style = customStyle || defaultStyle;
    headerRow.eachCell((cell) => {
      if (style.fill) cell.fill = style.fill as any;
      if (style.font) cell.font = style.font as any;
      if (style.alignment) cell.alignment = style.alignment as any;
      // Skip border from custom style to avoid type mismatch; borders set elsewhere if needed
    });
  }

  /**
   * Style data rows
   */
  private styleDataRows(
    worksheet: ExcelJS.Worksheet,
    startRow: number,
    rowCount: number,
    customStyle?: ExcelCellStyle
  ): void {
    if (!customStyle) return;

    for (let i = startRow; i < startRow + rowCount; i++) {
      const row = worksheet.getRow(i);
      row.eachCell((cell) => {
        if (customStyle.font) cell.font = customStyle.font as any;
        if (customStyle.alignment) cell.alignment = customStyle.alignment as any;
      });
    }
  }

  /**
   * Generate filename with optional timestamp
   */
  private generateFileName(baseName: string, includeTimestamp?: boolean): string {
    if (includeTimestamp) {
      const timestamp = new Date().toISOString().split('T')[0];
      return `${baseName}_${timestamp}.xlsx`;
    }
    return `${baseName}.xlsx`;
  }

  /**
   * Download file to user's device
   */
  private downloadFile(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /**
   * Download the generated Excel file
   */
  async download(fileName: string): Promise<void> {
    const buffer = await this.workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}

/**
 * Specific Excel generators for different report types
 */

export class ScheduleExcelGenerator extends ExcelGenerator {
  /**
   * Generate schedule report Excel
   */
  async generateScheduleReport(
    scheduleData: any[],
    options: ExcelExportOptions = {}
  ): Promise<void> {
    const data = this.formatScheduleData(scheduleData);
    await this.generateAndDownload(data, {
      fileName: 'Schedule_Report',
      worksheetName: 'Schedule Report',
      includeTimestamp: true,
      ...options,
    });
  }

  private formatScheduleData(scheduleData: any[]): ExcelData {
    // Implementation for schedule data formatting
    // This would contain the logic from generateScheduleExcelData()
    return {
      headers: ['Employee', 'Date', 'Clock In', 'Clock Out', 'Worked Time', 'Total Hours'],
      rows: [], // Format your data here
      worksheetName: 'Schedule Report',
    };
  }
}

export class ActualTimeExcelGenerator extends ExcelGenerator {
  /**
   * Generate actual time report Excel
   */
  async generateActualTimeReport(
    sessionData: any[],
    scheduleData: any[],
    currentWeekRange: any,
    options: ExcelExportOptions = {}
  ): Promise<void> {
    const data = this.formatActualTimeData(sessionData, scheduleData, currentWeekRange);
    await this.generateAndDownload(data, {
      fileName: 'Actual_Time_Report',
      worksheetName: 'Actual Time Report',
      includeTimestamp: true,
      ...options,
    });
  }

  private formatActualTimeData(
    sessionData: any[],
    scheduleData: any[],
    currentWeekRange: any
  ): ExcelData {
    // Implementation for actual time data formatting
    // This would contain the logic from generateActualTimeExcelData()
    return {
      headers: ['Employee Name', 'Date', 'Hours'],
      rows: [], // Format your data here
      worksheetName: 'Actual Time Report',
    };
  }
}

export class SummaryExcelGenerator extends ExcelGenerator {
  /**
   * Generate summary report Excel
   */
  async generateSummaryReport(
    summaryData: any[],
    options: ExcelExportOptions = {}
  ): Promise<void> {
    const data = this.formatSummaryData(summaryData);
    await this.generateAndDownload(data, {
      fileName: 'Summary_Report',
      worksheetName: 'Summary',
      includeTimestamp: false,
      ...options,
    });
  }

  private formatSummaryData(summaryData: any[]): ExcelData {
    return {
      headers: ['First Name', 'Last Name', 'Date', 'Client Name', 'Location', 'Hours'],
      rows: summaryData.map(item => [
        item.guardFirst?.name || '',
        item.guardLast?.name || '',
        item.date || '',
        item.Client?.name || '',
        item.address?.address || '',
        item.time || 0
      ]),
      worksheetName: 'Summary',
    };
  }
}

/**
 * Utility function for quick Excel generation
 */
export async function generateExcelFile(
  data: ExcelData,
  options: ExcelExportOptions = {}
): Promise<void> {
  const generator = new ExcelGenerator();
  await generator.generateAndDownload(data, options);
}

/**
 * Generate a styled Schedule or Actual Time report that exactly matches the provided image layout
 * Structure: Officer Name | Empty Column | 7 Days | Total = 10 columns
 * Each officer has: shift rows + one total row, with officer name spanning all rows
 * 
 * @param scheduleData - Array of schedule or actual time data
 * @param selectedClient - Client information
 * @param currentWeekRange - Week range for the report
 * @param reportType - Type of report: 'schedule' or 'actual' (defaults to 'schedule')
 * @param actualOptions - When reportType is 'actual', pass session-derived cell labels/hours from `buildActualTimeCellLookup` (matches grid / print).
 */
export async function generateScheduleStyledExcel(
  scheduleData: any[],
  selectedClient: any,
  currentWeekRange: { startOfWeek: Date; endOfWeek: Date },
  reportType: 'schedule' | 'actual' = 'schedule',
  actualOptions?: {
    cellLookup: Map<string, { label: string; hours: number }>;
    maxShiftsByUser: Map<number, number>;
  }
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheetName = reportType === 'actual' ? 'Actual Time Report' : 'Schedule Report';
  const worksheet = workbook.addWorksheet(worksheetName);

  // Build week dates (Thu-Wed per app logic)
  const weekDates: Date[] = [];
  const start = new Date(currentWeekRange.startOfWeek);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    weekDates.push(d);
  }

  const formatMMDDYY = (d: Date) =>
    d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });

  // Column setup: Empty A + Officer Name + Empty Column + 7 days + Total = 11 columns
  const totalColumns = 11;

  // Set column widths
  worksheet.columns = [
    { header: '', key: 'emptyA', width: 5 },       // Empty column A - 2px width
    { header: '', key: 'officer', width: 20 },     // Officer Name - increased width
    { header: '', key: 'empty', width: 5 },        // Empty column - half width
    ...weekDates.map(() => ({ header: '', key: 'd', width: 12 })), // 7 days
    { header: '', key: 'total', width: 6 }         // Total - narrow width for word only
  ];

  // Increase width for merged columns in row 3 only
  // Note: These widths only affect the merged cells in row 3, not the header row
  worksheet.getColumn(2).width = 30;  // Column B (Client Name) - increased width for row 3

  // Set equal width for columns E, F, G, H, I, J
  const equalWidth = 15;  // Same width for all these columns
  worksheet.getColumn(5).width = equalWidth;  // Column E
  worksheet.getColumn(6).width = equalWidth;  // Column F
  worksheet.getColumn(7).width = equalWidth;  // Column G
  worksheet.getColumn(8).width = equalWidth;  // Column H
  worksheet.getColumn(9).width = equalWidth;  // Column I
  worksheet.getColumn(10).width = equalWidth;  // Column J

  let currentRow = 1;

  // Keep row 1 empty - start from row 2
  currentRow++;

  // Title row - dynamic based on report type (starting from column B)
  worksheet.mergeCells(currentRow, 2, currentRow, totalColumns);

  // Merge column A across all rows (will be set after all rows are created)
  const startRowForColumnA = currentRow;
  const titleCell = worksheet.getCell(currentRow, 2);
  titleCell.value = reportType === 'actual' ? 'Actual Time' : 'Scheduled';
  titleCell.font = { bold: true, italic: true, size: 14, name: 'Aptos Narrow' };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  // No border around title - it's outside the table
  // Remove any default borders by not setting border property
  currentRow++;

  // Meta information row (3 sections) - starting from column B
  worksheet.mergeCells(currentRow, 2, currentRow, 4);  // Client Name (B-D)
  worksheet.mergeCells(currentRow, 5, currentRow, 8);  // Address (E-H)
  worksheet.mergeCells(currentRow, 9, currentRow, 11);  // Week Ending (I-K)

  const clientName = [selectedClient?.name, selectedClient?.lastName]
    .filter(Boolean)
    .join(' ');
  const clientAddress = [
    selectedClient?.address
  ]
    .filter(Boolean)
    .join(', ');
  const weekEnding = formatMMDDYY(new Date(currentWeekRange.endOfWeek));
  // Fill meta info - starting from column B with mixed formatting
  const clientNameCell = worksheet.getCell(currentRow, 2);
  clientNameCell.value = {
    richText: [
      { text: 'Client Name: ', font: { bold: true, italic: false, size: 11, name: 'Aptos Narrow' } },
      { text: clientName, font: { bold: false, size: 11, name: 'Aptos Narrow' } }
    ]
  };
  clientNameCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  const addressCell = worksheet.getCell(currentRow, 5);
  addressCell.value = {
    richText: [
      { text: 'Address: ', font: { bold: true, italic: false, size: 11, name: 'Aptos Narrow' } },
      { text: clientAddress, font: { bold: false, size: 11, name: 'Aptos Narrow' } }
    ]
  };
  addressCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  const weekEndingCell = worksheet.getCell(currentRow, 9);
  weekEndingCell.value = {
    richText: [
      { text: 'Week Ending: ', font: { bold: true, italic: false, size: 11, name: 'Aptos Narrow' } },
      { text: weekEnding, font: { bold: false, size: 11, name: 'Aptos Narrow' } }
    ]
  };
  weekEndingCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  // Add borders to meta row
  for (let col = 1; col <= totalColumns; col++) {
    const cell = worksheet.getCell(currentRow, col);
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: col === 1 ? { style: 'thin', color: { argb: 'FF000000' } } : { style: 'thin' },
      right: col === totalColumns ? { style: 'thin', color: { argb: 'FF000000' } } : { style: 'thin' }
    };
  }
  currentRow++;

  // Header row with dates - starting from column B
  const headerValues = ['', 'Officer Name', '', ...weekDates.map(formatMMDDYY), 'Total'];
  const headerRow = worksheet.getRow(currentRow);
  headerRow.values = headerValues;
  headerRow.height = 20;

  headerRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, italic: false, size: 11, name: 'Aptos Narrow' };
    cell.alignment = {
      horizontal: colNumber === 2 ? 'left' : 'center',
      vertical: 'middle',
      indent: colNumber === 2 ? 1 : 0
    };
    // Add light gray background for headers
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' } // Light gray background
    };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: colNumber === 2 ? { style: 'thin', color: { argb: 'FF000000' } } : { style: 'thin' },
      right: colNumber === totalColumns ? { style: 'thin', color: { argb: 'FF000000' } } : { style: 'thin' }
    };
  });
  currentRow++;

  // Process schedule data
  type Shift = { id?: number; startTime: string; endTime: string; hours?: number; date?: string };
  type Item = { userId: number; userName: string; startDate: string; shifts: Shift[] };
  const items: Item[] = (scheduleData || []) as Item[];

  const normDate = (d: string) => (d && d.includes('T')) ? d.split('T')[0] : (d || '');
  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Visual shifts for (user's days map, date): current day + previous day spanning (overnight/overflow)
  type UserEntry = { name: string; days: Map<string, Shift[]> };
  const getVisualShifts = (entry: UserEntry, dateStr: string): { shift: Shift; isContinuation: boolean; displayStart: string; displayEnd: string; shiftStartDate: string }[] => {
    const prevDateStr = getAdjustedDate(dateStr, -1);
    const currentShifts = (entry.days.get(dateStr) || []).filter((s: any) => !s.isDelete).map((s: Shift) => ({
      shift: s, isContinuation: false, displayStart: s.startTime, displayEnd: s.endTime, shiftStartDate: dateStr
    }));
    const prevSpanning = (entry.days.get(prevDateStr) || [])
      .filter((s: any) => !s.isDelete && shiftSpansNextDay(s.startTime, s.endTime))
      .map((s: Shift) => ({
        shift: s, isContinuation: true, displayStart: '00:00', displayEnd: s.endTime, shiftStartDate: prevDateStr
      }));
    const merged = [...currentShifts, ...prevSpanning].sort(
      (a, b) => timeToMinutes(a.displayStart) - timeToMinutes(b.displayStart)
    );
    return merged;
  };

  const calcShiftHours = (start: string, end: string) => {
    const h = calculateHours(start, end);
    return typeof h === 'number' ? h : 0;
  };
  const calculateEffectiveHours = (shift: Shift, shiftStartDate: string, targetDate: string): number => {
    if (normDate(shiftStartDate) === targetDate) {
      if (shiftSpansNextDay(shift.startTime, shift.endTime)) return calcShiftHours(shift.startTime, '24:00');
      return calcShiftHours(shift.startTime, shift.endTime);
    }
    const prevDateStr = getAdjustedDate(targetDate, -1);
    if (normDate(shiftStartDate) === prevDateStr && shiftSpansNextDay(shift.startTime, shift.endTime)) {
      return calcShiftHours('00:00', shift.endTime);
    }
    return 0;
  };

  // Group data by user (keep for users list and names)
  const byUser = new Map<number, { name: string; days: Map<string, Shift[]> }>();
  items.forEach((it) => {
    const u = it.userId;
    if (!byUser.has(u)) {
      byUser.set(u, { name: it.userName, days: new Map<string, Shift[]>() });
    }
    const entry = byUser.get(u)!;
    const dayKey = normDate(it.startDate);
    const arr = entry.days.get(dayKey) || [];
    it.shifts.forEach((s) => arr.push(s));
    entry.days.set(dayKey, arr);
  });

  const dateKeys = weekDates.map((d) => {
    const year = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${year}-${m}-${day}`;
  });

  // User order: first-occurrence in scheduleData (match Web UI row order)
  const users = Array.from(byUser.entries());

  // Add data rows for each user (visual shifts: overnight + overflow; effective hours for totals)
  users.forEach(([userId, data]) => {
    if (!data) return;
    const userStartRow = currentRow;
    let userMaxShiftsPerDay = 0;
    if (reportType === 'actual' && actualOptions?.maxShiftsByUser?.has(userId)) {
      userMaxShiftsPerDay = actualOptions.maxShiftsByUser.get(userId) ?? 1;
    } else {
      dateKeys.forEach(dateKey => {
        const visual = getVisualShifts(data, dateKey);
        userMaxShiftsPerDay = Math.max(userMaxShiftsPerDay, visual.length);
      });
    }

    let lastShiftId: any = null;
    for (let shiftIndex = 0; shiftIndex < userMaxShiftsPerDay; shiftIndex++) {
      const row = worksheet.getRow(currentRow);
      const rowValues: (string | number)[] = new Array(totalColumns + 1).fill('');
      let weeklyTotalForThisShift = 0;
      let currentShiftId: any = null;
      const shiftIdsInRow: any[] = [];

      dateKeys.forEach((dateKey, dayIndex) => {
        const visual = getVisualShifts(data, dateKey);
        const entry = visual[shiftIndex];
        if (reportType === 'actual' && actualOptions?.cellLookup) {
          const key = actualTimeCellLookupKey(userId, dateKey, shiftIndex);
          const cell = actualOptions.cellLookup.get(key);
          rowValues[3 + dayIndex] = cell?.label ?? '';
          const eff = cell?.hours ?? 0;
          weeklyTotalForThisShift += eff;
          if (entry?.shift?.id) shiftIdsInRow.push(entry.shift.id);
        } else if (entry) {
            rowValues[3 + dayIndex] = `${entry.displayStart} - ${entry.displayEnd}`;
            const eff = reportType === 'actual'
              ? (typeof entry.shift.hours === 'number' ? entry.shift.hours : 0)
              : calculateEffectiveHours(entry.shift, entry.shiftStartDate, dateKey);
            weeklyTotalForThisShift += eff;
            if (reportType === 'actual' && entry.shift.id) shiftIdsInRow.push(entry.shift.id);
        }
      });
      currentShiftId = shiftIdsInRow.length > 0 ? shiftIdsInRow[0] : null;
      rowValues[totalColumns - 1] = weeklyTotalForThisShift;

      row.values = rowValues;
      row.height = 18;
      const isNewShift = reportType === 'actual' && lastShiftId != null && currentShiftId != null && lastShiftId !== currentShiftId;
      for (let col = 1; col <= totalColumns; col++) {
        const cell = row.getCell(col);
        cell.font = { size: 11, name: 'Aptos Narrow' };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          left: { style: 'thin' },
          right: col === totalColumns ? { style: 'thin', color: { argb: 'FF000000' } } : { style: 'thin' }
        };
        if (isNewShift) cell.border.top = { style: 'thin', color: { argb: 'FF000000' } };
      }
      if (reportType === 'actual' && lastShiftId != null && currentShiftId != null && lastShiftId !== currentShiftId && currentRow > 1) {
        const prevRow = worksheet.getRow(currentRow - 1);
        for (let col = 1; col <= totalColumns; col++) {
          const prevCell = prevRow.getCell(col);
          if (!prevCell.border) prevCell.border = {};
          prevCell.border.bottom = { style: 'thin', color: { argb: 'FF000000' } };
        }
      }
      if (reportType === 'actual' && currentShiftId != null) lastShiftId = currentShiftId;
      currentRow++;
    }

    // Total row: day totals = effective hours per day for this user; total = user total
    const totalRow = worksheet.getRow(currentRow);
    const totalValues: (string | number)[] = new Array(totalColumns + 1).fill('');
    totalValues[2] = 'Total';
    let weeklyGrandTotal = 0;
    dateKeys.forEach((dateKey, dayIndex) => {
      let dayTotal = 0;
      if (reportType === 'actual' && actualOptions?.cellLookup && actualOptions.maxShiftsByUser) {
        const maxR = actualOptions.maxShiftsByUser.get(userId) ?? 1;
        for (let si = 0; si < maxR; si++) {
          dayTotal += actualOptions.cellLookup.get(actualTimeCellLookupKey(userId, dateKey, si))?.hours ?? 0;
        }
      } else {
        getVisualShifts(data, dateKey).forEach(({ shift, shiftStartDate }) => {
          dayTotal += reportType === 'actual'
            ? (typeof shift.hours === 'number' ? shift.hours : 0)
            : calculateEffectiveHours(shift, shiftStartDate, dateKey);
        });
      }
      totalValues[3 + dayIndex] = dayTotal > 0 ? dayTotal : '';
      weeklyGrandTotal += dayTotal;
    });
    totalValues[totalColumns - 1] = weeklyGrandTotal > 0 ? weeklyGrandTotal : '';
    totalRow.values = totalValues;
    totalRow.height = 18;
    for (let col = 2; col <= totalColumns; col++) {
      const cell = totalRow.getCell(col);
      cell.font = { size: 11, bold: true, name: 'Aptos Narrow' };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: col === totalColumns ? { style: 'thin', color: { argb: 'FF000000' } } : { style: 'thin' }
      };
    }
    currentRow++;

    const userEndRow = currentRow - 1;
    worksheet.mergeCells(userStartRow, 2, userEndRow, 2);
    const nameCell = worksheet.getCell(userStartRow, 2);
    nameCell.value = data.name;
    nameCell.font = { size: 11, name: 'Aptos Narrow' };
    nameCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    nameCell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin' }
    };
  });

  // Grand Total row: day totals = sum effective hours per day (all users); total = grand total
  const grandRow = worksheet.getRow(currentRow);
  const grandValues: (string | number)[] = new Array(totalColumns).fill('');
  grandValues[1] = 'Grand Total';
  let weeklyGrandTotal = 0;
  dateKeys.forEach((dateKey, dayIndex) => {
    let dayTotal = 0;
    users.forEach(([uid, data]) => {
      if (!data) return;
      if (reportType === 'actual' && actualOptions?.cellLookup && actualOptions.maxShiftsByUser) {
        const maxR = actualOptions.maxShiftsByUser.get(uid) ?? 1;
        for (let si = 0; si < maxR; si++) {
          dayTotal += actualOptions.cellLookup.get(actualTimeCellLookupKey(uid, dateKey, si))?.hours ?? 0;
        }
      } else {
        getVisualShifts(data, dateKey).forEach(({ shift, shiftStartDate }) => {
          dayTotal += reportType === 'actual'
            ? (typeof shift.hours === 'number' ? shift.hours : 0)
            : calculateEffectiveHours(shift, shiftStartDate, dateKey);
        });
      }
    });
    weeklyGrandTotal += dayTotal;
    grandValues[3 + dayIndex] = dayTotal > 0 ? parseFloat(dayTotal.toFixed(2)) : '';
  });
  grandValues[totalColumns - 1] = weeklyGrandTotal > 0 ? parseFloat(weeklyGrandTotal.toFixed(2)) : '';

  grandRow.values = grandValues;
  grandRow.height = 20;

  // Style the grand total row
  grandRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, italic: false, size: 11, name: 'Aptos Narrow' };
    cell.alignment = {
      horizontal: colNumber === 2 ? 'left' : 'center',
      vertical: 'middle',
      indent: colNumber === 2 ? 1 : 0
    };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: colNumber === 2 ? { style: 'thin', color: { argb: 'FF000000' } } : { style: 'thin' },
      right: colNumber === totalColumns ? { style: 'thin', color: { argb: 'FF000000' } } : { style: 'thin' }
    };
  });

  // Merge column A across all rows
  const endRowForColumnA = currentRow;
  worksheet.mergeCells(startRowForColumnA, 1, endRowForColumnA, 1);

  // Set empty value for merged column A
  const columnACell = worksheet.getCell(startRowForColumnA, 1);
  columnACell.value = '';
  // No borders for column A since it's outside the table
  // columnACell.border = {
  //   top: { style: 'thin' },
  //   bottom: { style: 'thin' },
  //   left: { style: 'thin' },
  //   right: { style: 'thin' }
  // };

  // Generate and download the file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const reportTypeText = reportType === 'actual' ? 'Actual_Time' : 'Schedule';
  const fileName = `${reportTypeText}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Generate a Scheduled format Excel that matches the second image exactly
 * This creates the "Scheduled" format with shift times like "00:00-08:00" and "16:00-24:00"
 */
export async function generateScheduledFormatExcel(
  scheduleData: any[],
  selectedClient: any,
  currentWeekRange: { startOfWeek: Date; endOfWeek: Date }
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Scheduled');

  // Build week dates (Thu-Wed per app logic)
  const weekDates: Date[] = [];
  const start = new Date(currentWeekRange.startOfWeek);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    weekDates.push(d);
  }

  const formatMMDDYY = (d: Date) =>
    d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });

  // Column setup: Empty A + Officer Name + Empty Column + 7 days + Total = 11 columns
  const totalColumns = 11;

  // Set column widths
  worksheet.columns = [
    { header: '', key: 'emptyA', width: 2 },       // Empty column A - 2px width
    { header: '', key: 'officer', width: 25 },     // Officer Name - increased width
    { header: '', key: 'empty', width: 5 },        // Empty column - half width
    ...weekDates.map(() => ({ header: '', key: 'd', width: 12 })), // 7 days
    { header: '', key: 'total', width: 6 }         // Total - narrow width for word only
  ];

  // Increase width for merged columns in row 3 only
  // Note: These widths only affect the merged cells in row 3, not the header row
  worksheet.getColumn(2).width = 30;  // Column B (Client Name) - increased width for row 3

  // Set equal width for columns E, F, G, H, I, J
  const equalWidth = 15;  // Same width for all these columns
  worksheet.getColumn(5).width = equalWidth;  // Column E
  worksheet.getColumn(6).width = equalWidth;  // Column F
  worksheet.getColumn(7).width = equalWidth;  // Column G
  worksheet.getColumn(8).width = equalWidth;  // Column H
  worksheet.getColumn(9).width = equalWidth;  // Column I
  worksheet.getColumn(10).width = equalWidth;  // Column J

  let currentRow = 1;

  // Keep row 1 empty - start from row 2
  currentRow++;

  // Title row - "Scheduled" (Row 2)
  worksheet.mergeCells(currentRow, 2, currentRow, totalColumns);

  // Merge column A across all rows (will be set after all rows are created)
  const startRowForColumnA = currentRow;
  const titleCell = worksheet.getCell(currentRow, 2);
  titleCell.value = 'Scheduled';
  titleCell.font = { bold: true, italic: true, size: 14, name: 'Aptos Narrow' };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  // No border around title - it's outside the table
  // Remove any default borders by not setting border property  

  currentRow++;

  // Meta information row (3 sections) - starting from column B
  worksheet.mergeCells(currentRow, 2, currentRow, 4);  // Client Name (B-D)
  worksheet.mergeCells(currentRow, 5, currentRow, 8);  // Address (E-H)
  worksheet.mergeCells(currentRow, 9, currentRow, 11);  // Week Ending (I-K)

  const clientName = [selectedClient?.name, selectedClient?.lastName]
    .filter(Boolean)
    .join(' ');
  const clientAddress = [
    selectedClient?.address
  ]
    .filter(Boolean)
    .join(', ');
  const weekEnding = formatMMDDYY(new Date(currentWeekRange.endOfWeek));

  // Fill meta info - starting from column B with mixed formatting
  const clientNameCell = worksheet.getCell(currentRow, 2);
  clientNameCell.value = {
    richText: [
      { text: 'Client Name: ', font: { bold: true, italic: false, size: 11, name: 'Aptos Narrow' } },
      { text: clientName, font: { bold: false, size: 11, name: 'Aptos Narrow' } }
    ]
  };
  clientNameCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  const addressCell = worksheet.getCell(currentRow, 5);
  addressCell.value = {
    richText: [
      { text: 'Address: ', font: { bold: true, italic: false, size: 11, name: 'Aptos Narrow' } },
      { text: clientAddress, font: { bold: false, size: 11, name: 'Aptos Narrow' } }
    ]
  };
  addressCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  const weekEndingCell = worksheet.getCell(currentRow, 9);
  weekEndingCell.value = {
    richText: [
      { text: 'Week Ending: ', font: { bold: true, italic: false, size: 11, name: 'Aptos Narrow' } },
      { text: weekEnding, font: { bold: false, size: 11, name: 'Aptos Narrow' } }
    ]
  };
  weekEndingCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  // Add borders to meta row
  for (let col = 1; col <= totalColumns; col++) {
    const cell = worksheet.getCell(currentRow, col);
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: col === 1 ? { style: 'thin', color: { argb: 'FF000000' } } : { style: 'thin' },
      right: col === totalColumns ? { style: 'thin', color: { argb: 'FF000000' } } : { style: 'thin' }
    };
  }
  currentRow++;

  // Header row with dates (Row 5 in image)
  const headerValues = ['', 'Officer Name', '', ...weekDates.map(formatMMDDYY), 'Total'];
  const headerRow = worksheet.getRow(currentRow);
  headerRow.values = headerValues;
  headerRow.height = 20;

  headerRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, italic: false, size: 11, name: 'Aptos Narrow' };
    cell.alignment = {
      horizontal: colNumber === 2 ? 'left' : 'center',
      vertical: 'middle',
      indent: colNumber === 2 ? 1 : 0
    };
    // Add light gray background for headers
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' } // Light gray background
    };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: colNumber === 2 ? { style: 'thin', color: { argb: 'FF000000' } } : { style: 'thin' },
      right: colNumber === totalColumns ? { style: 'thin', color: { argb: 'FF000000' } } : { style: 'thin' }
    };
  });
  currentRow++;

  // Add shift time headers under dates (Row 6 in image)
  // First shift row: 00:00-08:00
  const shiftHeaderRow1 = worksheet.getRow(currentRow);
  const shiftHeaderValues1 = ['', '', '', '', ...weekDates.map(() => '00:00-08:00'), ''];
  shiftHeaderRow1.values = shiftHeaderValues1;
  shiftHeaderRow1.height = 18;

  shiftHeaderRow1.eachCell((cell, colNumber) => {
    cell.font = { size: 11, name: 'Aptos Narrow' };
    cell.alignment = {
      horizontal: colNumber === 2 ? 'left' : 'center',
      vertical: 'middle',
      indent: colNumber === 2 ? 1 : 0
    };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: colNumber === 2 ? { style: 'thin', color: { argb: 'FF000000' } } : { style: 'thin' },
      right: colNumber === totalColumns ? { style: 'thin', color: { argb: 'FF000000' } } : { style: 'thin' }
    };
  });
  currentRow++;

  // Second shift row: 16:00-24:00
  const shiftHeaderRow2 = worksheet.getRow(currentRow);
  const shiftHeaderValues2 = ['', '', '', '', ...weekDates.map(() => '16:00-24:00'), ''];
  shiftHeaderRow2.values = shiftHeaderValues2;
  shiftHeaderRow2.height = 18;

  shiftHeaderRow2.eachCell((cell, colNumber) => {
    cell.font = { size: 11, name: 'Aptos Narrow' };
    cell.alignment = {
      horizontal: colNumber === 2 ? 'left' : 'center',
      vertical: 'middle',
      indent: colNumber === 2 ? 1 : 0
    };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: colNumber === 2 ? { style: 'thin', color: { argb: 'FF000000' } } : { style: 'thin' },
      right: colNumber === totalColumns ? { style: 'thin', color: { argb: 'FF000000' } } : { style: 'thin' }
    };
  });
  currentRow++;

  // Process schedule data
  type Shift = { startTime: string; endTime: string; hours?: number };
  type Item = { userId: number; userName: string; startDate: string; shifts: Shift[] };
  const items: Item[] = (scheduleData || []) as Item[];

  // Group data by user
  const byUser = new Map<number, { name: string; days: Map<string, Shift[]> }>();
  items.forEach((it) => {
    const u = it.userId;
    if (!byUser.has(u)) {
      byUser.set(u, { name: it.userName, days: new Map<string, Shift[]>() });
    }
    const entry = byUser.get(u)!;
    const dayKey = it.startDate;
    const arr = entry.days.get(dayKey) || [];
    it.shifts.forEach((s) => arr.push(s));
    entry.days.set(dayKey, arr);
  });

  const dateKeys = weekDates.map((d) => {
    const year = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${year}-${m}-${day}`;
  });

  // User order: first-occurrence in scheduleData (match Web UI row order)
  const users = Array.from(byUser.entries());

  // Add data rows for each user
  users.forEach(([_, data]) => {
    if (!data) return;

    const userStartRow = currentRow;

    // Calculate total rows needed for this specific user (their actual shifts + 1 total row)
    let userMaxShiftsPerDay = 0;
    dateKeys.forEach(dateKey => {
      const shifts = data.days.get(dateKey) || [];
      userMaxShiftsPerDay = Math.max(userMaxShiftsPerDay, shifts.length);
    });

    const userRowsNeeded = userMaxShiftsPerDay + 1;

    // Add shift rows (one row per shift index for this specific user)
    for (let shiftIndex = 0; shiftIndex < userMaxShiftsPerDay; shiftIndex++) {
      const row = worksheet.getRow(currentRow);
      const rowValues: (string | number)[] = new Array(totalColumns + 1).fill('');

      let weeklyTotalForThisShift = 0;

      dateKeys.forEach((dateKey, dayIndex) => {
        const shifts = data.days.get(dateKey) || [];
        const shift = shifts[shiftIndex]; // Get the shift at this index

        if (shift) {
          rowValues[4 + dayIndex] = `${shift.startTime} - ${shift.endTime}`; // +4 because we have Empty A (col 1) + Officer Name (col 2) + Empty (col 3) + Date columns starting at col 4
          weeklyTotalForThisShift += shift.hours || 8;
        } else {
          rowValues[4 + dayIndex] = ''; // Empty if no shift at this index
        }
      });

      rowValues[totalColumns - 1] = weeklyTotalForThisShift;

      row.values = rowValues;
      row.height = 18;

      // Style the shift row (skip column 1 since it's merged)
      for (let col = 2; col <= totalColumns; col++) {
        const cell = row.getCell(col);
        cell.font = { size: 11, name: 'Aptos Narrow' };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: col === totalColumns ? { style: 'thin', color: { argb: 'FF000000' } } : { style: 'thin' }
        };
      }
      currentRow++;
    }

    // Add "Total" row for this officer showing daily totals
    const totalRow = worksheet.getRow(currentRow);
    const totalValues: (string | number)[] = new Array(totalColumns + 1).fill('');
    totalValues[1] = 'Total'; // This will be in the merged cell area but won't show

    let weeklyGrandTotal = 0;
    dateKeys.forEach((dateKey, dayIndex) => {
      const shifts = data.days.get(dateKey) || [];
      const dayTotal = shifts.reduce((sum, shift) => sum + (shift.hours || 8), 0);
      totalValues[4 + dayIndex] = dayTotal > 0 ? dayTotal : ''; // +4 because we have Empty A (col 1) + Officer Name (col 2) + Empty (col 3) + Date columns starting at col 4
      weeklyGrandTotal += dayTotal;
    });

    totalValues[totalColumns - 1] = weeklyGrandTotal > 0 ? weeklyGrandTotal : '';
    totalRow.values = totalValues;
    totalRow.height = 18;

    // Style the total row
    for (let col = 2; col <= totalColumns; col++) {
      const cell = totalRow.getCell(col);
      cell.font = { size: 11, bold: true, name: 'Aptos Narrow' };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: col === totalColumns ? { style: 'thin', color: { argb: 'FF000000' } } : { style: 'thin' }
      };
    }
    currentRow++;

    // Now merge the officer name cell vertically across all rows for this user
    const userEndRow = currentRow - 1;
    worksheet.mergeCells(userStartRow, 2, userEndRow, 2);

    // Set the officer name in the merged cell
    const nameCell = worksheet.getCell(userStartRow, 2);
    nameCell.value = data.name;
    nameCell.font = { size: 11, name: 'Aptos Narrow' };
    nameCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    nameCell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin' }
    };
  });

  // Grand Total row
  const grandRow = worksheet.getRow(currentRow);
  const grandValues: (string | number)[] = new Array(totalColumns).fill('');
  grandValues[1] = 'Grand Total'; // Column B in image

  let weeklyGrandTotal = 0;
  dateKeys.forEach((dateKey, dayIndex) => {
    let dayTotal = 0;
    users.forEach(([__, data]) => {
      if (!data) return;
      const shifts = data.days.get(dateKey) || [];
      dayTotal += shifts.reduce((sum, s) => sum + (s.hours || 8), 0);
    });
    weeklyGrandTotal += dayTotal;
    grandValues[4 + dayIndex] = dayTotal > 0 ? dayTotal : ''; // +4 because we have Empty A (col 1) + Officer Name (col 2) + Empty (col 3) + Date columns starting at col 4
  });
  grandValues[totalColumns - 1] = weeklyGrandTotal > 0 ? weeklyGrandTotal : '';

  grandRow.values = grandValues;
  grandRow.height = 20;

  // Style the grand total row
  grandRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, italic: false, size: 11, name: 'Aptos Narrow' };
    cell.alignment = {
      horizontal: colNumber === 2 ? 'left' : 'center',
      vertical: 'middle',
      indent: colNumber === 2 ? 1 : 0
    };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: colNumber === 2 ? { style: 'thin', color: { argb: 'FF000000' } } : { style: 'thin' },
      right: colNumber === totalColumns ? { style: 'thin', color: { argb: 'FF000000' } } : { style: 'thin' }
    };
  });

  // Merge column A across all rows
  const endRowForColumnA = currentRow;
  worksheet.mergeCells(startRowForColumnA, 1, endRowForColumnA, 1);

  // Set empty value for merged column A
  const columnACell = worksheet.getCell(startRowForColumnA, 1);
  columnACell.value = '';
  // No borders for column A since it's outside the table
  // columnACell.border = {
  //   top: { style: 'thin' },
  //   bottom: { style: 'thin' },
  //   left: { style: 'thin' },
  //   right: { style: 'thin' }
  // };

  // Generate and download the file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const fileName = `Scheduled_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Legacy function for backward compatibility with existing code
 */
export function generateExcelFileLegacy(data: any[]): Promise<Blob> {
  // This function maintains compatibility with existing code that expects a Blob return
  // Implementation would depend on the specific data structure
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');

  // Add data to worksheet
  worksheet.addRows(data);

  // Return a promise that resolves to a blob
  return workbook.xlsx.writeBuffer().then(buffer => {
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  });
}



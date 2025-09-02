import ExcelJS from 'exceljs';
import { ExcelData, ExcelExportOptions, ExcelCellStyle } from './excelTypes';

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
 */
export async function generateScheduleStyledExcel(
  scheduleData: any[],
  selectedClient: any,
  currentWeekRange: { startOfWeek: Date; endOfWeek: Date },
  reportType: 'schedule' | 'actual' = 'schedule'
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

  // Column setup: Officer Name + Empty Column + 7 days + Total = 10 columns
  const totalColumns = 10;
  
  // Set column widths
  worksheet.columns = [
    { header: '', key: 'officer', width: 18 },      // Officer Name
    { header: '', key: 'empty', width: 8 },        // Empty column (no header text)
    ...weekDates.map(() => ({ header: '', key: 'd', width: 12 })), // 7 days
    { header: '', key: 'total', width: 10 }        // Total
  ];

  let currentRow = 1;

  // Title row - dynamic based on report type
  worksheet.mergeCells(currentRow, 1, currentRow, totalColumns);
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.value = reportType === 'actual' ? 'Actual Time' : 'Scheduled';
  titleCell.font = { bold: true, size: 11 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  
  // Add dashed border around title
  titleCell.border = {
    top: { style: 'dashDot', color: { argb: 'FF0066CC' } },
    left: { style: 'dashDot', color: { argb: 'FF0066CC' } },
    right: { style: 'dashDot', color: { argb: 'FF0066CC' } },
    bottom: { style: 'thin' }
  };
  currentRow++;

  // Meta information row (3 sections)
  worksheet.mergeCells(currentRow, 1, currentRow, 3);  // Client Name
  worksheet.mergeCells(currentRow, 4, currentRow, 6);  // Client Address  
  worksheet.mergeCells(currentRow, 7, currentRow, 9);  // Week Ending

  const clientName = [selectedClient?.name, selectedClient?.lastName]
    .filter(Boolean)
    .join(' ');
  const clientAddress = [
    selectedClient?.address,
    selectedClient?.city,
    selectedClient?.state,
    selectedClient?.pincode
  ]
    .filter(Boolean)
    .join(', ');
  const weekEnding = formatMMDDYY(new Date(currentWeekRange.endOfWeek));
  // Fill meta info
  worksheet.getCell(currentRow, 1).value = `Client Name: ${clientName }`;
  worksheet.getCell(currentRow, 4).value = `Client Address: ${clientAddress }`;
  worksheet.getCell(currentRow, 7).value = `Week Ending: ${weekEnding }`;
  
  // Style meta row
  [1, 4, 7].forEach(col => {
    const cell = worksheet.getCell(currentRow, col);
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
  });
  
  // Add borders to meta row
  for (let col = 1; col <= totalColumns; col++) {
    const cell = worksheet.getCell(currentRow, col);
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: col === 1 ? { style: 'dashDot', color: { argb: 'FF0066CC' } } : { style: 'thin' },
      right: col === totalColumns ? { style: 'dashDot', color: { argb: 'FF0066CC' } } : { style: 'thin' }
    };
  }
  currentRow++;

  // Header row with dates
  const headerValues = ['Officer Name', '', ...weekDates.map(formatMMDDYY), 'Total'];
  const headerRow = worksheet.getRow(currentRow);
  headerRow.values = headerValues;
  headerRow.height = 20;
  
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' } // Light gray background
    };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: colNumber === 1 ? { style: 'dashDot', color: { argb: 'FF0066CC' } } : { style: 'thin' },
      right: colNumber === totalColumns ? { style: 'dashDot', color: { argb: 'FF0066CC' } } : { style: 'thin' }
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

  const users = Array.from(byUser.entries()).sort((a, b) =>
    (a[1]?.name || '').localeCompare(b[1]?.name || '')
  );

  // Add sample data if no real data (for demo purposes)
  if (users.length === 0) {
    const sampleUser = {
      name: 'Pawan Sharma',
      days: new Map<string, Shift[]>()
    };
    
    // Add sample shifts for each day
    dateKeys.forEach(dateKey => {
      sampleUser.days.set(dateKey, [
        { startTime: '00:00', endTime: '08:00', hours: 8 },
        { startTime: '16:00', endTime: '24:00', hours: 8 }
      ]);
    });
    
    users.push([1, sampleUser]);
  }

  // Note: maxShiftsPerDay is no longer used since each user gets their own row count
  // Keeping this for potential future use if needed
  let maxShiftsPerDay = 0;
  users.forEach(([_, data]) => {
    if (!data) return;
    dateKeys.forEach(dateKey => {
      const shifts = data.days.get(dateKey) || [];
      maxShiftsPerDay = Math.max(maxShiftsPerDay, shifts.length);
    });
  });

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
       
       // Store the start row for this user to merge later
       const userShiftRows = userMaxShiftsPerDay;
       const userTotalRow = 1; // 1 total row per user
       const totalRowsForThisUser = userShiftRows + userTotalRow;
       
       // We'll merge the cells after creating all rows for this user

    // Add shift rows (one row per shift index for this specific user)
    for (let shiftIndex = 0; shiftIndex < userMaxShiftsPerDay; shiftIndex++) {
      const row = worksheet.getRow(currentRow);
      const rowValues: (string | number)[] = new Array(totalColumns + 1).fill('');
      
      // Skip column 1 (officer name is already merged)
      let weeklyTotalForThisShift = 0;
      
             dateKeys.forEach((dateKey, dayIndex) => {
         const shifts = data.days.get(dateKey) || [];
         const shift = shifts[shiftIndex]; // Get the shift at this index
         
         if (shift) {
           rowValues[2 + dayIndex] = `${shift.startTime} - ${shift.endTime}`; // +2 because we have Officer Name (col 1) + Empty Column (col 2) + Date columns starting at col 3
           weeklyTotalForThisShift += shift.hours || 8;
         } else {
           rowValues[2 + dayIndex] = ''; // Empty if no shift at this index
         }
       });
      
             // Only show total in the last shift row, and only if there are shifts
      //  if (shiftIndex === maxShiftsPerDay - 1 && weeklyTotalForThisShift > 0) {
         rowValues[totalColumns - 1] = weeklyTotalForThisShift;
      //  }
      
      row.values = rowValues;
      row.height = 18;
      
      // Style the shift row (skip column 1 since it's merged)
      for (let col = 2; col <= totalColumns; col++) {
        const cell = row.getCell(col);
        cell.font = { size: 9 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: col === totalColumns ? { style: 'dashDot', color: { argb: 'FF0066CC' } } : { style: 'thin' }
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
       totalValues[2 + dayIndex] = dayTotal > 0 ? dayTotal : ''; // +2 because we have Officer Name (col 1) + Empty Column (col 2) + Date columns starting at col 3
       weeklyGrandTotal += dayTotal;
     });
    
         totalValues[totalColumns - 1] = weeklyGrandTotal > 0 ? weeklyGrandTotal : '';
    totalRow.values = totalValues;
    totalRow.height = 18;
    
         // Style the total row
    
    for (let col = 2; col <= totalColumns; col++) {
      const cell = totalRow.getCell(col);
      cell.font = { size: 9, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: col === totalColumns ? { style: 'dashDot', color: { argb: 'FF0066CC' } } : { style: 'thin' }
      };
    }
    currentRow++;
    
    // Now merge the officer name cell vertically across all rows for this user
    const userEndRow = currentRow - 1;
    worksheet.mergeCells(userStartRow, 1, userEndRow, 1);
    
    // Set the officer name in the merged cell
    const nameCell = worksheet.getCell(userStartRow, 1);
    nameCell.value = data.name;
    nameCell.font = { size: 10 };
    nameCell.alignment = { horizontal: 'left', vertical: 'middle' };
    nameCell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'dashDot', color: { argb: 'FF0066CC' } },
      right: { style: 'thin' }
    };
  });

  // Grand Total row
  const grandRow = worksheet.getRow(currentRow);
  const grandValues: (string | number)[] = new Array(totalColumns ).fill('');
     grandValues[0] = 'Grand Total';
  
  let weeklyGrandTotal = 0;
     dateKeys.forEach((dateKey, dayIndex) => {
     let dayTotal = 0;
     users.forEach(([__, data]) => {
       if (!data) return;
       const shifts = data.days.get(dateKey) || [];
       dayTotal += shifts.reduce((sum, s) => sum + (s.hours || 8), 0);
     });
     weeklyGrandTotal += dayTotal;
     grandValues[2 + dayIndex] = dayTotal > 0 ? dayTotal : ''; // +3 because we have Officer Name (col 1) + Empty Column (col 2) + Date columns starting at col 3
   });
           grandValues[totalColumns - 1] = weeklyGrandTotal > 0 ? weeklyGrandTotal : '';
  
  grandRow.values = grandValues;
  grandRow.height = 20;
  
  // Style the grand total row
  grandRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 10 };
    cell.alignment = { 
      horizontal: colNumber === 1 ? 'left' : 'center', 
      vertical: 'middle' 
    };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'dashDot', color: { argb: 'FF0066CC' } },
      left: colNumber === 1 ? { style: 'dashDot', color: { argb: 'FF0066CC' } } : { style: 'thin' },
      right: colNumber === totalColumns ? { style: 'dashDot', color: { argb: 'FF0066CC' } } : { style: 'thin' }
    };
  });

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

// // Enhanced base ExcelGenerator class with better styling
// export class ExcelGenerator {
//   private workbook: ExcelJS.Workbook;

//   constructor() {
//     this.workbook = new ExcelJS.Workbook();
//   }

//   /**
//    * Create a worksheet with proper styling that matches the image format
//    */
//   protected createStyledWorksheet(
//     name: string,
//     title: string,
//     headers: string[],
//     metaInfo?: { [key: string]: string }
//   ): ExcelJS.Worksheet {
//     const worksheet = this.workbook.addWorksheet(name);
//     let currentRow = 1;

//     // Title
//     worksheet.mergeCells(currentRow, 1, currentRow, headers.length);
//     const titleCell = worksheet.getCell(currentRow, 1);
//     titleCell.value = title;
//     titleCell.font = { bold: true, size: 12 };
//     titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
//     currentRow++;

//     // Meta information if provided
//     if (metaInfo) {
//       const metaKeys = Object.keys(metaInfo);
//       const colsPerMeta = Math.floor(headers.length / metaKeys.length);
      
//       metaKeys.forEach((key, index) => {
//         const startCol = index * colsPerMeta + 1;
//         const endCol = index === metaKeys.length - 1 ? headers.length : (index + 1) * colsPerMeta;
        
//         worksheet.mergeCells(currentRow, startCol, currentRow, endCol);
//         const cell = worksheet.getCell(currentRow, startCol);
//         cell.value = `${key}: ${metaInfo[key]}`;
//         cell.font = { bold: true, size: 10 };
//         cell.alignment = { horizontal: 'left', vertical: 'middle' };
        
//         // Add borders
//         for (let col = startCol; col <= endCol; col++) {
//           const borderCell = worksheet.getCell(currentRow, col);
//           borderCell.border = {
//             top: { style: 'medium' },
//             bottom: { style: 'thin' },
//             left: col === 1 ? { style: 'medium' } : { style: 'thin' },
//             right: col === headers.length ? { style: 'medium' } : { style: 'thin' }
//           };
//         }
//       });
//       currentRow++;
//     }

//     // Headers
//     const headerRow = worksheet.getRow(currentRow);
//     headerRow.values = headers;
//     headerRow.height = 20;
    
//     headerRow.eachCell((cell, colNumber) => {
//       cell.font = { bold: true, size: 10 };
//       cell.alignment = { horizontal: 'center', vertical: 'middle' };
//       cell.fill = {
//         type: 'pattern',
//         pattern: 'solid',
//         fgColor: { argb: 'FFF2F2F2' }
//       };
//       cell.border = {
//         top: { style: 'thin' },
//         bottom: { style: 'thin' },
//         left: colNumber === 1 ? { style: 'medium' } : { style: 'thin' },
//         right: colNumber === headers.length ? { style: 'medium' } : { style: 'thin' }
//       };
//     });

//     return worksheet;
//   }

//   /**
//    * Add a data row with proper styling and borders
//    */
//   protected addStyledDataRow(
//     worksheet: ExcelJS.Worksheet,
//     rowData: any[],
//     rowNumber: number,
//     options: { isTotalRow?: boolean; height?: number } = {}
//   ): void {
//     const row = worksheet.getRow(rowNumber);
//     row.values = rowData;
//     row.height = options.height || 20;
    
//     const totalColumns = rowData.length - 1; // -1 because values array is 1-indexed
    
//     row.eachCell((cell, colNumber) => {
//       cell.font = { 
//         bold: options.isTotalRow || false, 
//         size: 10 
//       };
//       cell.alignment = { 
//         horizontal: colNumber === 1 ? 'left' : 'center', 
//         vertical: 'middle',
//         wrapText: true 
//       };
//       cell.border = {
//         top: { style: 'thin' },
//         bottom: { style: 'thin' },
//         left: colNumber === 1 ? { style: 'medium' } : { style: 'thin' },
//         right: colNumber === totalColumns ? { style: 'medium' } : { style: 'thin' }
//       };
//     });
//   }

//   /**
//    * Download the generated Excel file
//    */
//   async download(fileName: string): Promise<void> {
//     const buffer = await this.workbook.xlsx.writeBuffer();
//     const blob = new Blob([buffer], {
//       type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
//     });
    
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
//     document.body.appendChild(a);
//     a.click();
//     a.remove();
//     URL.revokeObjectURL(url);
//   }
// }


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



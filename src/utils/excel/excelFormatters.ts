// Data formatting utilities for Excel generation

import { ScheduleExcelData, ActualTimeExcelData, SummaryExcelData } from './excelTypes';

/**
 * Format schedule data for Excel export
 */
export function formatScheduleDataForExcel(scheduleData: any[]): ScheduleExcelData[] {
  return scheduleData.map(item => ({
    userId: item.userId,
    userName: item.userName,
    date: item.date,
    clockIn: item.clockIn,
    clockOut: item.clockOut,
    workedTime: item.workedTime,
    totalHours: item.totalHours,
  }));
}

/**
 * Format actual time data for Excel export
 */
export function formatActualTimeDataForExcel(
  sessionData: any[],
  scheduleData: any[],
  currentWeekRange: any
): ActualTimeExcelData[] {
  // Implementation for formatting actual time data
  return [];
}

/**
 * Format summary data for Excel export
 */
export function formatSummaryDataForExcel(summaryData: any[]): SummaryExcelData[] {
  return summaryData.map(item => ({
    firstName: item.guardFirst?.name || '',
    lastName: item.guardLast?.name || '',
    date: item.date || '',
    clientName: item.Client?.name || '',
    location: item.address?.address || '',
    hours: item.time || 0,
  }));
}

/**
 * Calculate worked time for Excel (with 24-hour logic)
 */
export function calculateWorkedTimeForExcel(session: any): number {
  if (!session.clockIn || !session.clockOut) {
    return (session.workedTime || 0) / 60; // Convert minutes to hours
  }
  
  // If clock-in equals clock-out, return 24 hours
  if (session.clockIn === session.clockOut) {
    return 24.0; // 24 hours
  }
  
  // Otherwise use the calculated hours directly
  return calculateHours(session.clockIn, session.clockOut);
}

/**
 * Calculate hours between two times
 */
function calculateHours(clockIn: string, clockOut: string): number {
  // Implementation for calculating hours
  // This would contain your existing calculateHours logic
  return 0;
}

/**
 * Format date for Excel headers
 */
export function formatDateForExcel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
}

/**
 * Generate week headers for Excel
 */
export function generateWeekHeaders(startDate: Date): string[] {
  const headers = ['Employee Name'];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    headers.push(formatDateForExcel(date));
  }
  headers.push('Total');
  return headers;
}

/**
 * Format time for Excel display
 */
export function formatTimeForExcel(time: string | null): string {
  if (!time) return '-';
  return time;
}

/**
 * Format hours for Excel display
 */
export function formatHoursForExcel(hours: number): string {
  return `${hours.toFixed(2)} Hr`;
}

/**
 * Format minutes for Excel display
 */
export function formatMinutesForExcel(minutes: number): string {
  return `${minutes} Min`;
}

/**
 * Format distance for Excel display
 */
export function formatDistanceForExcel(distance: number): string {
  return `${distance} Mile`;
}

/**
 * Create Excel-friendly data array from object array
 */
export function createExcelDataArray<T>(
  data: T[],
  headers: string[],
  valueExtractors: ((item: T) => any)[]
): any[][] {
  const rows: any[][] = [];
  
  data.forEach(item => {
    const row = valueExtractors.map(extractor => extractor(item));
    rows.push(row);
  });
  
  return rows;
}

/**
 * Generate Excel data with headers and rows
 */
export function generateExcelData<T>(
  data: T[],
  headers: string[],
  valueExtractors: ((item: T) => any)[],
  worksheetName?: string,
  fileName?: string
) {
  return {
    headers,
    rows: createExcelDataArray(data, headers, valueExtractors),
    worksheetName,
    fileName,
  };
}

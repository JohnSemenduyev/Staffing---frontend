import { getAdjustedDate, shiftSpansNextDay, calculateHours } from "../lib/utils";
import type { Shift, SessionItem } from "../types/schedule";
import { getSessionHoursOnDate as getSessionHoursOnDateFromCalendar } from "./sessionCalendar";
import {
  buildSessionCalendarCtx,
  getActualTimeCellContent,
  getMaxShiftsPerDayForUser,
  getWeekDateKeys,
} from "./actualTimeExportLayout";
// utils.ts
export const toLocalYMD = (date: Date) => {
  const year = date.getFullYear(); // local year
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface ScheduleItem {
  id: number;
  clientId: number;
  addressId: number;
  userId: number;
  startDate: string;
  auto: boolean;
  shifts: {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    hours: number;
    scheduleSessionId?: number;
  }[];
  clientName: string;
  address: string;
  userName: string;
  userPhone: string;
}

interface SessionData {
  id: number;
  shiftId: number;
  scheduleSessionId: number;
  clockIn: string;
  clockOut?: string;
  clockInDate?: string | null;
  clockOutDate?: string | null;
  workedTime?: number;
  shift?: { id: number; date: string; startTime?: string; endTime?: string };
}

interface PrintOptions {
  title: string;
  selectedClient?: {
    name: string;
    lastName?: string;
    address: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  currentWeekRange?: {
    startOfWeek: Date;
    endOfWeek: Date;
  };
  totalEmployees?: number;
  totalHours?: number;
}

const timeToMinutes = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};
const getFullClientName = (client: { name?: string; lastName?: string }) => {
  if (!client) return "-";
  // If name already ends with lastName, don't append again
  if (
    client.lastName &&
    client.name &&
    client.name.trim().endsWith(client.lastName.trim())
  ) {
    return client.name;
  }
  return [client.name, client.lastName].filter(Boolean).join(" ");
};
export const generateSchedulePrintableTable = (
  scheduleData: ScheduleItem[],
  currentWeekRange?: { startOfWeek: Date; endOfWeek: Date },
  selectedClient?: { name: string; lastName?: string; address: string; city?: string; state?: string; pincode?: string }
) => {
  if (!scheduleData || scheduleData.length === 0) {
    return `
      <div style="text-align: center; padding: 40px; color: #666; font-size: 20px; margin:20px">
        <p>No schedule data available to print</p>
      </div>
    `;
  }

  // Get unique users in first-occurrence order (match Web UI row order)
  const uniqueUsers = new Map();
  scheduleData.forEach(item => {
    if (!uniqueUsers.has(item.userId)) {
      uniqueUsers.set(item.userId, {
        id: item.userId,
        name: item.userName,
        phone: item.userPhone
      });
    }
  });
  const usersInDisplayOrder = Array.from(uniqueUsers.values());

  // Table headers
  const headers = ['Officer Name']; // Add empty column after Officer Name
  headers.push(''); // Add empty column after Officer Name
  if (currentWeekRange) {
    const startDate = new Date(currentWeekRange.startOfWeek);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const formattedDate = date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit'
      });
      headers.push(formattedDate);
    }
  }
  headers.push('Total');

  const columnWidths = [
    '20%',   // Officer Name
    '3%',   // Empty column
    '10%',   // Day 1
    '10%',   // Day 2
    '10%',   // Day 3
    '10%',   // Day 4
    '10%',   // Day 5
    '10%',   // Day 6
    '10%',   // Day 7
    '7%'    // Total
  ];

  const headerRow = headers.map((header, index) => {
    const isOfficerName = header === 'Officer Name';
    const textAlign = isOfficerName ? 'left' : 'center';
    const leftPadding = isOfficerName ? '12px' : '2px';
    return `<th style="background-color: #FFFEFEFF; color: black; font-weight: bold; padding: 0px 2px 0px ${leftPadding}; text-align: ${textAlign}; border: 1px solid black !important; font-size: 15px; width: ${columnWidths[index] || 'auto'};">${header}</th>`;
  }).join('');

  // Client info row - single row spanning all columns
  const clientInfoRow = `
    <tr>
      <td colspan="3" style="padding: 0px 12px 0px 12px; text-align: left; font-size: 15px; background-color: #FFFEFEFF; line-height: 1.4; height: 22px; vertical-align: middle; border: 1px solid black !important;">
        <strong>Client Name:</strong> ${selectedClient ? getFullClientName(selectedClient) : 'All Clients'}
      </td>
      <td colspan="5" style="padding: 0px 0px 0px 12px; text-align: left; font-size: 15px; background-color: #FFFEFEFF; line-height: 1.4; height: 22px; vertical-align: middle; border: 1px solid black !important;">
        <strong>Address:</strong> ${selectedClient ? [selectedClient.address].filter(Boolean).join(', ') : '-'}
      </td>
      <td colspan="2" style="padding: 0px 10px; text-align: left; font-size: 15px; background-color: #FFFEFEFF; line-height: 1.4; height: 22px; vertical-align: middle; border: 1px solid black !important;">
        <strong>Week Ending:</strong> ${currentWeekRange ? new Date(currentWeekRange.endOfWeek).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit'
  }) : ''}
      </td>
    </tr>
  `;

  const normDate = (d: string) => (d && d.includes('T')) ? d.split('T')[0] : (d || '');
  const getShiftsForUserDate = (userId: number, dateStr: string): any[] => {
    const shifts: any[] = [];
    scheduleData.forEach((item) => {
      if (item.userId === userId && normDate(item.startDate) === dateStr) {
        (item.shifts || []).forEach((s: any) => shifts.push(s));
      }
    });
    return shifts;
  };

  // Visual shifts for a (user, column date): current day shifts + previous day shifts that span (overnight/overflow)
  const getVisualShifts = (userId: number, dateStr: string): { shift: any; isContinuation: boolean; displayStart: string; displayEnd: string }[] => {
    const currentShiftsList = getShiftsForUserDate(userId, dateStr);
    const prevDateStr = getAdjustedDate(dateStr, -1);
    const prevShiftsList = getShiftsForUserDate(userId, prevDateStr);

    const currentShifts = currentShiftsList
      .filter((s: any) => !s.isDelete)
      .map((s: any) => ({ shift: s, isContinuation: false, displayStart: s.startTime, displayEnd: s.endTime }));

    const prevSpanning = prevShiftsList
      .filter((s: any) => !s.isDelete && shiftSpansNextDay(s.startTime, s.endTime))
      .map((s: any) => ({ shift: s, isContinuation: true, displayStart: '00:00', displayEnd: s.endTime }));

    const merged = [...currentShifts, ...prevSpanning].sort(
      (a, b) => timeToMinutes(a.displayStart) - timeToMinutes(b.displayStart)
    );
    return merged;
  };

  const calculateShiftHours = (start: string, end: string) => {
    const h = calculateHours(start, end);
    return typeof h === 'number' ? h : 0;
  };

  // Effective hours of a shift on targetDate (overnight split by date)
  const calculateEffectiveHours = (shift: any, shiftStartDate: string, targetDate: string): number => {
    if (normDate(shiftStartDate) === targetDate) {
      if (shiftSpansNextDay(shift.startTime, shift.endTime)) {
        return calculateShiftHours(shift.startTime, '24:00');
      }
      return calculateShiftHours(shift.startTime, shift.endTime);
    }
    const prevDateStr = getAdjustedDate(targetDate, -1);
    if (normDate(shiftStartDate) === prevDateStr && shiftSpansNextDay(shift.startTime, shift.endTime)) {
      return calculateShiftHours('00:00', shift.endTime);
    }
    return 0;
  };

  const getMaxShiftsPerDay = (userId: number) => {
    let maxShifts = 1;
    if (!currentWeekRange) return maxShifts;
    const startDate = new Date(currentWeekRange.startOfWeek);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = toLocalYMD(date);
      const visual = getVisualShifts(userId, dateStr);
      maxShifts = Math.max(maxShifts, visual.length);
    }
    return maxShifts;
  };

  const calculateUserTotal = (userId: number) => {
    let total = 0;
    if (!currentWeekRange) return total;
    const startDate = new Date(currentWeekRange.startOfWeek);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = toLocalYMD(date);
      const visual = getVisualShifts(userId, dateStr);
      visual.forEach(({ shift, isContinuation }) => {
        const shiftStartDate = isContinuation ? getAdjustedDate(dateStr, -1) : dateStr;
        total += calculateEffectiveHours(shift, shiftStartDate, dateStr);
      });
    }
    return parseFloat(total.toFixed(2));
  };

  const calculateDayTotal = (dateStr: string) => {
    let total = 0;
    const userIds = [...new Set(scheduleData.map(item => item.userId))];
    userIds.forEach(userId => {
      getVisualShifts(userId, dateStr).forEach(({ shift, isContinuation }) => {
        const shiftStartDate = isContinuation ? getAdjustedDate(dateStr, -1) : dateStr;
        total += calculateEffectiveHours(shift, shiftStartDate, dateStr);
      });
    });
    return parseFloat(total.toFixed(2));
  };

  const calculateGrandTotal = () => {
    let total = 0;
    if (!currentWeekRange) return total;
    const startDate = new Date(currentWeekRange.startOfWeek);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      total += calculateDayTotal(toLocalYMD(date));
    }
    return parseFloat(total.toFixed(2));
  };

  // User day total (effective hours for this user on this date only)
  const calculateUserDayTotal = (userId: number, dateStr: string) => {
    let total = 0;
    getVisualShifts(userId, dateStr).forEach(({ shift, isContinuation }) => {
      const shiftStartDate = isContinuation ? getAdjustedDate(dateStr, -1) : dateStr;
      total += calculateEffectiveHours(shift, shiftStartDate, dateStr);
    });
    return parseFloat(total.toFixed(2));
  };

  // Build table rows
  const dataRows = [];

  usersInDisplayOrder.forEach(user => {
    const maxShifts = getMaxShiftsPerDay(user.id);
    const totalRows = maxShifts + 1; // +1 for Total row

    // Data rows for shifts (visual shifts: overnight + overflow)
    for (let rowIdx = 0; rowIdx < maxShifts; rowIdx++) {
      const cells = [];

      if (rowIdx === 0) {
        cells.push(`
          <td style="padding: 0px 6px 0px 12px; text-align: left; font-size: 15px; font-weight: normal; border: 1px solid black !important;" rowspan="${totalRows}">
            ${user.name}
          </td>
        `);
        cells.push(`
          <td style="border: 1px solid black; padding: 0px 2px; text-align: center; font-size: 15px;" rowspan="${totalRows - 1}">
            
          </td>
        `);
      }

      // Day columns: use visual shifts (current day + previous day spanning)
      let rowTotal = 0;
      if (currentWeekRange) {
        const startDate = new Date(currentWeekRange.startOfWeek);
        for (let i = 0; i < 7; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          const dateStr = toLocalYMD(date);
          const visual = getVisualShifts(user.id, dateStr);
          const entry = visual[rowIdx];
          const cellContent = entry ? `${entry.displayStart} - ${entry.displayEnd}` : '';
          if (entry) {
            const shiftStartDate = entry.isContinuation ? getAdjustedDate(dateStr, -1) : dateStr;
            rowTotal += calculateEffectiveHours(entry.shift, shiftStartDate, dateStr);
          }
          cells.push(`
            <td style="border-right: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px;">
              ${cellContent}
            </td>
          `);
        }
      }

      cells.push(`
        <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px;">
          ${rowTotal > 0 ? rowTotal.toFixed(2) : ''}
        </td>
      `);

      dataRows.push(`<tr>${cells.join('')}</tr>`);
    }

    // Total row: day values from columns, row total = sum of day values
    const totalCells = [`
      <td style="border: 1px solid black !important; text-align: left; font-size: 15px; font-weight: bold;">
        Total
      </td>
    `];

    const dayTotalsForUser: number[] = [];
    if (currentWeekRange) {
      const startDate = new Date(currentWeekRange.startOfWeek);
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = toLocalYMD(date);
        const dayTotal = calculateUserDayTotal(user.id, dateStr);
        dayTotalsForUser.push(dayTotal);
        totalCells.push(`
          <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px; font-weight: bold;">
            ${dayTotal > 0 ? dayTotal.toFixed(2) : ''}
          </td>
        `);
      }
    }
    const rowTotalFromColumns = parseFloat(dayTotalsForUser.reduce((s, v) => s + v, 0).toFixed(2));
    totalCells.push(`
      <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px; font-weight: bold;">
        ${rowTotalFromColumns > 0 ? rowTotalFromColumns.toFixed(2) : ''}
      </td>
    `);

    dataRows.push(`<tr>${totalCells.join('')}</tr>`);
  });

  // Grand Total row: column totals from day columns, grand total = sum of column totals
  const grandTotalCells = [`
    <td style="border: 1px solid black !important; padding: 0px 6px 0px 12px; text-align: left; font-size: 15px; font-weight: bold;">
      Grand Total
    </td>
  `, `
    <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px; font-weight: bold;">
      
    </td>
  `];

  const dayTotalsForGrand: number[] = [];
  if (currentWeekRange) {
    const startDate = new Date(currentWeekRange.startOfWeek);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = toLocalYMD(date);
      const dayTotal = calculateDayTotal(dateStr);
      dayTotalsForGrand.push(dayTotal);
      grandTotalCells.push(`
        <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px; font-weight: bold;">
          ${dayTotal > 0 ? dayTotal.toFixed(2) : ''}
        </td>
      `);
    }
  }
  const grandTotalFromColumns = parseFloat(dayTotalsForGrand.reduce((s, v) => s + v, 0).toFixed(2));
  grandTotalCells.push(`
    <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px; font-weight: bold;">
      ${grandTotalFromColumns > 0 ? grandTotalFromColumns.toFixed(2) : ''}
    </td>
  `);

  dataRows.push(`<tr>${grandTotalCells.join('')}</tr>`);

  return `
    <table style="width: 100%; border-collapse: collapse; margin-top: 0px; border: 1px solid black;">
      <thead>
        ${clientInfoRow}
        <tr>${headerRow}</tr>
      </thead>
      <tbody>
        ${dataRows.join('')}
      </tbody>
    </table>
  `;
};

export const generateActualTimePrintableTable = (
  sessionData: SessionData[],
  scheduleData: ScheduleItem[],
  currentWeekRange?: { startOfWeek: Date; endOfWeek: Date },
  selectedClient?: { name: string; lastName?: string; address: string; city?: string; state?: string; pincode?: string }
) => {
  if (!sessionData || sessionData.length === 0) {
    return `
      <div style="text-align: center; padding: 40px; color: #666; font-size: 20px;">
        <p>No actual time data available to print</p>
      </div>
    `;
  }

  // Get unique users in scheduleData first-occurrence order (match Web UI row order)
  const uniqueUsers = new Map();
  scheduleData.forEach(item => {
    if (!uniqueUsers.has(item.userId)) {
      uniqueUsers.set(item.userId, {
        id: item.userId,
        name: item.userName,
        phone: item.userPhone
      });
    }
  });
  const usersInDisplayOrder = Array.from(uniqueUsers.values());

  const sessionCtx = buildSessionCalendarCtx(scheduleData, currentWeekRange);
  const dateKeysForWeek = currentWeekRange ? getWeekDateKeys(currentWeekRange) : [];

  const getSessionHoursOnDate = (session: SessionData, dateStr: string) =>
    getSessionHoursOnDateFromCalendar(session as unknown as SessionItem, dateStr, sessionCtx);

  const getMaxShiftsPerDay = (userId: number) => {
    if (!currentWeekRange || dateKeysForWeek.length === 0) return 1;
    return getMaxShiftsPerDayForUser(scheduleData, userId, dateKeysForWeek);
  };

  const calculateDayTotal = (dateStr: string) => {
    const total = sessionData.reduce((sum, item) => sum + getSessionHoursOnDate(item, dateStr), 0);
    return parseFloat(total.toFixed(2));
  };

  const calculateGrandTotal = () => {
    // Final total = sum of day totals in the grand total row (so it matches the displayed day columns)
    let total = 0;
    if (currentWeekRange) {
      const startDate = new Date(currentWeekRange.startOfWeek);
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        total += calculateDayTotal(toLocalYMD(date));
      }
    }
    return parseFloat(total.toFixed(2));
  };

  const calculateUserDayTotal = (userId: number, dateStr: string) => {
    const total = sessionData
      .filter(item => {
        const scheduleItem = scheduleData.find(si => si.shifts.some((s: any) => s.id === item.shiftId));
        return scheduleItem && scheduleItem.userId === userId;
      })
      .reduce((sum, item) => sum + getSessionHoursOnDate(item, dateStr), 0);
    return parseFloat(total.toFixed(2));
  };

  // Table headers
  const headers = ['Officer Name', '']; // Add empty column after Officer Name
  if (currentWeekRange) {
    const startDate = new Date(currentWeekRange.startOfWeek);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const formattedDate = date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit'
      });
      headers.push(formattedDate);
    }
  }
  headers.push('Total');

  const columnWidths = [
    '20%',   // Officer Name
    '3%',   // Empty column
    '10%',   // Day 1
    '10%',   // Day 2
    '10%',   // Day 3
    '10%',   // Day 4
    '10%',   // Day 5
    '10%',   // Day 6
    '10%',   // Day 7
    '7%'    // Total
  ];

  const headerRow = headers.map((header, index) => {
    const isOfficerName = header === 'Officer Name';
    const textAlign = isOfficerName ? 'left' : 'center';
    const leftPadding = isOfficerName ? '15px' : '2px';
    return `<th style="background-color: #fff; color: black; font-weight: bold; padding: 0px 2px 0px ${leftPadding}; text-align: ${textAlign}; border: 1px solid black !important; font-size: 15px; width: ${columnWidths[index] || 'auto'};">${header}</th>`;
  }).join('');

  // Client info row - divided into 3 cells with specific column spans
  const clientInfoRow = `
    <tr>
      <td colspan="3" style="padding: 0px 12px 0px 12px; text-align: left; font-size: 15px; background-color: #FFFEFEFF; line-height: 1.4; height: 22px; vertical-align: middle; border: 1px solid black !important;">
        <strong>Client Name:</strong> ${selectedClient ? getFullClientName(selectedClient) : 'All Clients'}
      </td>
      <td colspan="5" style="padding: 0px 0px 0px 12px; text-align: left; font-size: 15px; background-color: #FFFEFEFF; line-height: 1.4; height: 22px; vertical-align: middle; border: 1px solid black !important;">
        <strong>Address:</strong> ${selectedClient ? [selectedClient.address].filter(Boolean).join(', ') : '-'}
      </td>
      <td colspan="2" style="padding: 0px 10px; text-align: left; font-size: 15px; background-color: #FFFEFEFF; line-height: 1.4; height: 22px; vertical-align: middle; border: 1px solid black !important;">
        <strong>Week Ending:</strong> ${currentWeekRange ? new Date(currentWeekRange.endOfWeek).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit'
  }) : ''}
      </td>
    </tr>
  `;

  // Build table rows
  const dataRows = [];

  usersInDisplayOrder.forEach(user => {
    const maxShifts = getMaxShiftsPerDay(user.id);
    const totalRows = maxShifts + 1; // +1 for Total row

    // Data rows for shifts
    for (let rowIdx = 0; rowIdx < maxShifts; rowIdx++) {
      const cells = [];

      // Officer name (spans all rows including Total)
      if (rowIdx === 0) {
        cells.push(`
          <td style="padding: 0px 6px 0px 12px; text-align: left; font-size: 15px; font-weight: normal; border: 1px solid black !important;" rowspan="${totalRows}">
            ${user.name}
          </td>
        `);

        // Empty column (spans all rows including Total)
        cells.push(`
          <td style="border-left: 1px solid black !important; border-right: 1px solid black !important; border-top: 1px solid black !important; border-bottom: none !important; padding: 0px 6px; text-align: center; font-size: 15px;" rowspan="${totalRows - 1}">
            
          </td>
        `);
      }

      // Day columns: use visual shifts (overnight + overflow), show sessions with SPLIT display (start part "clockIn-24:00", end part "00:00-clockOut") like web UI
      let rowTotal = 0;
      if (currentWeekRange) {
        const startDate = new Date(currentWeekRange.startOfWeek);
        for (let i = 0; i < 7; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          const dateStr = toLocalYMD(date);
          const { label: cellContent, hours: cellHours } = getActualTimeCellContent(
            sessionData as SessionItem[],
            scheduleData,
            sessionCtx,
            user.id,
            dateStr,
            rowIdx
          );
          rowTotal += cellHours;
          cells.push(`
            <td style="border: 1px solid black !important; padding: 0px; text-align: center; font-size: 15px; ">
              ${cellContent}
            </td>
          `);
        }
      }

      cells.push(`
        <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px;">
          ${rowTotal > 0 ? rowTotal.toFixed(2) : ''}
        </td>
      `);

      dataRows.push(`<tr>${cells.join('')}</tr>`);
    }

    // Total row: day values from columns, row total = sum of day values
    const totalCells = [`
      <td style="border: 1px solid black !important; text-align: left; font-size: 15px; font-weight: bold;">
        Total
      </td>
    `];

    const dayTotalsForUserActual: number[] = [];
    if (currentWeekRange) {
      const startDate = new Date(currentWeekRange.startOfWeek);
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = toLocalYMD(date);
        const dayTotal = calculateUserDayTotal(user.id, dateStr);
        dayTotalsForUserActual.push(dayTotal);
        totalCells.push(`
          <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px; font-weight: bold;">
            ${dayTotal > 0 ? dayTotal.toFixed(2) : ''}
          </td>
        `);
      }
    }
    const rowTotalFromColumnsActual = parseFloat(dayTotalsForUserActual.reduce((s, v) => s + v, 0).toFixed(2));
    totalCells.push(`
      <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px; font-weight: bold;">
        ${rowTotalFromColumnsActual > 0 ? rowTotalFromColumnsActual.toFixed(2) : ''}
      </td>
    `);

    dataRows.push(`<tr>${totalCells.join('')}</tr>`);
  });

  // Grand Total row: column totals from day columns, grand total = sum of column totals
  const grandTotalCells = [`
    <td style="border: 1px solid black !important; padding: 0px 6px 0px 12px; text-align: left; font-size: 15px; font-weight: bold;">
      Grand Total
    </td>
  `, `
    <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px; font-weight: bold;">
      
    </td>
  `];

  const dayTotalsForGrandActual: number[] = [];
  if (currentWeekRange) {
    const startDate = new Date(currentWeekRange.startOfWeek);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = toLocalYMD(date);
      const dayTotal = calculateDayTotal(dateStr);
      dayTotalsForGrandActual.push(dayTotal);
      grandTotalCells.push(`
        <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px; font-weight: bold;">
          ${dayTotal > 0 ? dayTotal.toFixed(2) : ''}
        </td>
      `);
    }
  }
  const grandTotalFromColumnsActual = parseFloat(dayTotalsForGrandActual.reduce((s, v) => s + v, 0).toFixed(2));
  grandTotalCells.push(`
    <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px; font-weight: bold;">
      ${grandTotalFromColumnsActual > 0 ? grandTotalFromColumnsActual.toFixed(2) : ''}
    </td>
  `);

  dataRows.push(`<tr>${grandTotalCells.join('')}</tr>`);

  return `
    <table style="width: 100%; border-collapse: collapse; margin-top: 0px; border: 1px solid black;">
      <thead>
        ${clientInfoRow}
        <tr>${headerRow}</tr>
      </thead>
      <tbody>
        ${dataRows.join('')}
      </tbody>
    </table>
  `;
};

export const generatePrintContent = (
  tableContent: string,
  options: PrintOptions
) => {
  const { title, selectedClient, currentWeekRange, totalEmployees, totalHours } = options;
  const generatedDateStr = new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
  const generatedTimeStr = new Date().toLocaleTimeString();

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @page {
            margin: 0.1in;
            size: A4 landscape;
          }
          
          * {
            box-sizing: border-box;
          }
          
          body { 
            font-family: Arial, sans-serif; 
            margin: 0;
            padding: 0px;
            background: white;
            color: black;
            line-height: 1.2;
          }
          
          .header {
            text-align: left;
            margin-bottom: 2px;
          }
          
          .header h1 { 
            margin: 0;
            color: black;
            font-size: 18px;
            font-weight: bold;
          }
          
          .header .subtitle {
            margin: 0 0 0 0;
            color: black;
            font-size: 15px;
          }
          
          table { 
            width: 100%; 
            border-collapse: collapse; 
            background: white;
            /* border: 1px solid black; */
          }
          
          th { 
            background-color: white !important;
            color: black !important;
            font-weight: bold;
            padding: 0px 2px;
            text-align: center;
            border: none;
            font-size: 15px;
            height: 22px;
            vertical-align: middle;
          }
          
          td { 
            padding: 0px 2px;
            border: none;
            font-size: 15px;
            height: 22px;
            vertical-align: middle;
          }
          
          tr {
            height: 22px;
          }
        </style>
      </head>
      <body>
        <div class="header" style="margin-left: 20px; margin-bottom: 0;">
          <h1 style="margin-bottom: 0; font-style: italic;">${title}</h1>
        </div>
        
        <div style="margin-top: 0px;">
          ${tableContent}
        </div>
      </body>
    </html>
  `;
};

export const handlePrint = async (
  tableContent: string,
  options: PrintOptions,
  onError?: (error: string) => void,
  onSuccess?: () => void
) => {
  try {
    const printContent = generatePrintContent(tableContent, options);

    const printWindow = window.open("", "_blank", "width=900,height=700,scrollbars=yes,resizable=yes");

    if (!printWindow) {
      onError?.("Pop-up blocked! Please allow pop-ups and try again.");
      return;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();

    setTimeout(() => {
      try {
        printWindow.print();
        onSuccess?.();
      } catch (error) {
        console.error("Print error:", error);
        onError?.("Failed to print. Please try again.");
      } finally {
        printWindow.close();
      }
    }, 500);

  } catch (error) {
    console.error("Error in print operation:", error);
    onError?.("Failed to generate print content");
  }
};
// US state name -> abbreviation map
const STATE_ABBR: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY', 'American Samoa': 'AS', 'District of Columbia': 'DC', 'Guam': 'GU', 'Northern Mariana Islands': 'MP', 'Puerto Rico': 'PR', 'Trust Territories': 'TT', 'Virgin Islands': 'VI'
};

const formatStateWithAbbr = (state?: string) => {
  if (!state) return '';
  const abbr = STATE_ABBR[state.trim()];
  return abbr ? `${abbr}` : state;
};
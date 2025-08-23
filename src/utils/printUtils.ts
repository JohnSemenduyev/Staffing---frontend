import { formatDateLocal, toLocalYMD } from "../lib/utils";

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
  workedTime?: number;
}

interface PrintOptions {
  title: string;
  selectedClient?: {
    name: string;
    address: string;
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

export const generateSchedulePrintableTable = (
  scheduleData: ScheduleItem[],
  currentWeekRange?: { startOfWeek: Date; endOfWeek: Date }
) => {
  // Debug: Log the incoming data structure
  console.log('PDF Debug - Incoming scheduleData:', scheduleData.slice(0, 2)); // Log first 2 items
  console.log('PDF Debug - Current week range:', currentWeekRange);
  if (!scheduleData || scheduleData.length === 0) {
    return `
      <div style="text-align: center; padding: 40px; color: #666; font-size: 16px;">
        <p>No schedule data available to print</p>
      </div>
    `;
  }

  // Get unique users - handle multiple entries for same user
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

  // Table headers - match UI table headers exactly
  const headers = ['Employee Name'];
  if (currentWeekRange) {
    const startDate = new Date(currentWeekRange.startOfWeek);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      // Format date as MM-DD-YYYY for headers
      const formattedDate = date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
      headers.push(formattedDate);
    }
  }
  headers.push('Total');

  const headerRow = headers.map(header => 
    `<th style="background-color: #004175; color: white; font-weight: bold; padding: 12px; text-align: center; border: 1px solid #004175; font-size: 12px;">${header}</th>`
  ).join('');
  
  // Table rows from data - match UI structure exactly
  const dataRows = [];
  
  // Sort users by name to match UI table order
  const sortedUsers = Array.from(uniqueUsers.values()).sort((a, b) => a.name.localeCompare(b.name));
  
  // Helper function to get max shifts per day for a user
  const getMaxShiftsPerDay = (userId: number) => {
    const userDays = scheduleData.filter(i => i.userId === userId);
    let max = 1;
    for (const d of userDays) max = Math.max(max, d.shifts.length);
    return max;
  };

  // Helper function to format date from ISO string to local format
  const formatDateFromISO = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      return toLocalYMD(date);
    } catch (error) {
      console.error('Error formatting date:', isoDate, error);
      return isoDate; // fallback to original if parsing fails
    }
  };

  // Helper function to normalize date for comparison
  const normalizeDateForComparison = (dateStr: string) => {
    // Handle both local date format and ISO date format
    if (dateStr.includes('T')) {
      return formatDateFromISO(dateStr);
    }
    return dateStr;
  };

  // Helper function to calculate user total
  const calculateUserTotal = (userId: number) => {
    return scheduleData
      .filter(item => item.userId === userId)
      .reduce((total, item) => total + item.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0);
  };

  // Helper function to calculate day total
  const calculateDayTotal = (date: string) => {
    const total = scheduleData
      .flatMap(item => item.shifts)
      .filter(shift => {
        const shiftDate = normalizeDateForComparison(shift.date);
        return shiftDate === date;
      })
      .reduce((total, shift) => total + shift.hours, 0);
    return parseFloat(total.toFixed(2));
  };

  // Helper function to calculate grand total
  const calculateGrandTotal = () => {
    return scheduleData
      .reduce((total, item) => total + item.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0);
  };
  
  sortedUsers.forEach((user, userIndex) => {
    const rowCount = getMaxShiftsPerDay(user.id);

    // Create shift rows for this user
    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      const rowStyle = (userIndex + rowIdx) % 2 === 0 ? 'background-color: #f9fafb;' : 'background-color: #ffffff;';
      
      const row = [];
      
      // Employee Name column (only on first row)
      if (rowIdx === 0) {
        row.push(`
          <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; vertical-align: middle; font-size: 11px;" rowspan="${rowCount}">
            <div style="font-weight: 500; color: #1f2937;">${user.name || '-'}</div>
          </td>
        `);
      }
      
      // Date columns - Updated sorting algorithm
      if (currentWeekRange) {
        const startDate = new Date(currentWeekRange.startOfWeek);
        for (let i = 0; i < 7; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          const dateStr = toLocalYMD(date);
          
          // Debug: Log the date being processed
          if (rowIdx === 0) { // Only log once per date
            console.log(`PDF Debug - Processing date ${i}: ${dateStr}`);
          }
          
          // Find all shifts for this specific date and user
          const allShiftsForDate = scheduleData
            .filter(item => item.userId === user.id)
            .flatMap(s => s.shifts)
            .filter(shift => {
              const shiftDate = normalizeDateForComparison(shift.date);
              const matches = shiftDate === dateStr;
              
              // Debug logging for troubleshooting
              console.log(`PDF Debug - Date: ${dateStr}, User: ${user.name}, ShiftDate: ${shiftDate}, Shift: ${shift.startTime}-${shift.endTime}, Matches: ${matches}`);
              
              return matches;
            });
          
          const sortedShifts = allShiftsForDate.sort((a, b) => 
            timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
          );
          
          // Get the shift for this specific row index
          const shift = sortedShifts[rowIdx];
          
          row.push(`
            <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-size: 11px;">
              ${shift ? `${shift.startTime} - ${shift.endTime}` : '-'}
            </td>
          `);
        }
      }
      
      // Total column (only on first row)
      if (rowIdx === 0) {
        row.push(`
          <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-weight: 500; font-size: 11px;" rowspan="${rowCount}">
            ${calculateUserTotal(user.id).toFixed(2)}
          </td>
        `);
      }
      

      
      dataRows.push(`
        <tr style="${rowStyle}">
          ${row.join('')}
        </tr>
      `);
    }

    // Add Total row for this user
    const totalRow = ['<td style="border: 1px solid #d1d5db; padding: 12px; text-sm text-gray-600 text-align: center; font-size: 11px;">Total</td>'];
    
    if (currentWeekRange) {
      const startDate = new Date(currentWeekRange.startOfWeek);
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = toLocalYMD(date);
        
                 const dayShifts = scheduleData
           .filter(item => item.userId === user.id)
           .flatMap(s => s.shifts)
           .filter(shift => {
             const shiftDate = normalizeDateForComparison(shift.date);
             const matches = shiftDate === dateStr;
             
             // Debug logging for total row calculation
             console.log(`PDF Total Debug - Date: ${dateStr}, User: ${user.name}, ShiftDate: ${shiftDate}, Shift: ${shift.startTime}-${shift.endTime}, Matches: ${matches}`);
             
             return matches;
           });
        const dayTotal = dayShifts.reduce((total, shift) => total + shift.hours, 0);
        const rounded = parseFloat(dayTotal.toFixed(2));
        
        totalRow.push(`
          <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-weight: 500; font-size: 11px;">
            ${rounded > 0 ? rounded : '-'}
          </td>
        `);
      }
    }
    
    totalRow.push(`
      <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-weight: 500; font-size: 11px;">
        ${calculateUserTotal(user.id).toFixed(2)}
      </td>
    `);
    

    
    dataRows.push(`
      <tr style="background-color: ${userIndex % 2 === 0 ? '#f3f4f6' : '#e5e7eb'};">
        ${totalRow.join('')}
      </tr>
    `);
  });

  // Add Grand Total Row
  const grandTotalRow = ['<td style="border: 1px solid #d1d5db; padding: 12px; font-weight: 500; font-size: 11px;">Grand Total</td>'];
  
  if (currentWeekRange) {
    const startDate = new Date(currentWeekRange.startOfWeek);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = toLocalYMD(date);
      
      const dayTotal = calculateDayTotal(dateStr);
      grandTotalRow.push(`
        <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-size: 11px;">
          ${dayTotal || '-'}
        </td>
      `);
    }
  }
  
  grandTotalRow.push(`
    <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-size: 11px;">
      ${calculateGrandTotal().toFixed(2)}
    </td>
  `);
  

  
  dataRows.push(`
    <tr style="background-color: #f9fafb; font-weight: 500;">
      ${grandTotalRow.join('')}
    </tr>
  `);

  return `
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px;">
      <thead>
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
  currentWeekRange?: { startOfWeek: Date; endOfWeek: Date }
) => {
  // Debug logging
  console.log('PDF Debug - Session data:', sessionData);
  console.log('PDF Debug - Schedule data:', scheduleData);
  console.log('PDF Debug - Current week range:', currentWeekRange);
  
  if (!sessionData || sessionData.length === 0) {
    return `
      <div style="text-align: center; padding: 40px; color: #666; font-size: 16px;">
        <p>No actual time data available to print</p>
      </div>
    `;
  }

  // Helper function to calculate worked time with 24-hour logic for clock-in == clock-out
  const calculateWorkedTimeWith24HourLogic = (session: SessionData) => {
    if (!session.clockIn || !session.clockOut) {
      return (session.workedTime || 0) / 60; // Convert minutes to hours
    }
    
    // If clock-in equals clock-out, return 24 hours
    if (session.clockIn === session.clockOut) {
      return 24.0; // 24 hours
    }
    
    // Otherwise use the calculated hours directly
    const calculateHours = (start: string, end: string) => {
      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);
      let hours = endH - startH + (endM - startM) / 60;
      if (hours <= 0) hours += 24; // equal times => 24h, overnight => +24
      return parseFloat(hours.toFixed(2));
    };
    
    return calculateHours(session.clockIn, session.clockOut);
  };

  // Get unique users from session data (same as UI)
  const uniqueUsers = new Map();
  sessionData.forEach(item => {
    const scheduleItem = scheduleData.find(si =>
      si.shifts.some(shift => shift.id === item.shiftId)
    );
    if (scheduleItem && !uniqueUsers.has(scheduleItem.userId)) {
      uniqueUsers.set(scheduleItem.userId, {
        id: scheduleItem.userId,
        name: scheduleItem.userName,
        phone: scheduleItem.userPhone
      });
    }
  });

  // Sort users by name to match UI table order
  const sortedUsers = Array.from(uniqueUsers.values()).sort((a, b) => a.name.localeCompare(b.name));

  // Helper function to calculate user total (same as UI)
  const calculateUserTotal = (userId: number) => {
    const total = sessionData
      .filter(item => {
        const scheduleItem = scheduleData.find(si =>
          si.shifts.some(shift => shift.id === item.shiftId)
        );
        return scheduleItem && scheduleItem.userId === userId;
      })
      .reduce((t, item) => t + calculateWorkedTimeWith24HourLogic(item), 0);
    return parseFloat(total.toFixed(2));
  };

  // Helper function to calculate day total (same as UI)
  const calculateDayTotal = (date: string, sessionData: SessionData[]) => {
    const total = sessionData
      .filter(item => {
        const scheduleItem = scheduleData.find(si =>
          si.shifts.some(shift => shift.id === item.shiftId)
        );
        if (!scheduleItem) return false;

        const shift = scheduleItem.shifts.find(s => s.id === item.shiftId);
        if (!shift) return false;
        
        // Handle both local date format and ISO date format
        let shiftDate: string;
        if (shift.date.includes('T') && shift.date.includes('Z')) {
          // This is a UTC date, extract just the date part without timezone conversion
          shiftDate = shift.date.split('T')[0];
        } else if (shift.date.includes('T')) {
          shiftDate = toLocalYMD(new Date(shift.date));
        } else {
          shiftDate = shift.date;
        }
        
        return shiftDate === date;
      })
      .reduce((total, item) => total + calculateWorkedTimeWith24HourLogic(item), 0);
    return parseFloat(total.toFixed(2));
  };

  // Helper function to calculate grand total (same as UI)
  const calculateGrandTotal = (sessionData: SessionData[]) => {
    const total = sessionData.reduce((total, item) => total + calculateWorkedTimeWith24HourLogic(item), 0);
    return parseFloat(total.toFixed(2));
  };

  // Table headers - match UI table headers exactly
  const headers = ['Employee Name'];
  if (currentWeekRange) {
    const startDate = new Date(currentWeekRange.startOfWeek);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      // Format date as MM-DD-YYYY for headers
      const formattedDate = date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
      headers.push(formattedDate);
    }
  }
  headers.push('Total');

  const headerRow = headers.map(header => 
    `<th style="background-color: #004175; color: white; font-weight: bold; padding: 12px; text-align: center; border: 1px solid #004175; font-size: 12px;">${header}</th>`
  ).join('');

  // Table rows from data - match UI structure exactly
  const dataRows = [];
  
  // Add data rows for each user
  sortedUsers.forEach((user, userIndex) => {
    const rowStyle = userIndex % 2 === 0 ? 'background-color: #f9fafb;' : 'background-color: #ffffff;';
    
    const row = [`
      <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; vertical-align: middle; font-size: 11px;">
        <div style="font-weight: 500; color: #1f2937;">${user.name || '-'}</div>
      </td>
    `];
    
    // Date columns - match UI structure
    if (currentWeekRange) {
      const startDate = new Date(currentWeekRange.startOfWeek);
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = toLocalYMD(date);
        
        // Debug: Log the date we're looking for
        console.log(`PDF Debug - Looking for date: ${dateStr} for user: ${user.name}`);
        
        const daySessions = sessionData.filter(item => {
          const scheduleItem = scheduleData.find(si =>
            si.shifts.some(shift => shift.id === item.shiftId)
          );
          if (!scheduleItem || scheduleItem.userId !== user.id) return false;

          const shift = scheduleItem.shifts.find(s => s.id === item.shiftId);
          if (!shift) return false;
          
          // Debug: Log the shift date we found
          console.log(`PDF Debug - Found shift date: ${shift.date} for session: ${item.id}`);
          
          // Handle both local date format and ISO date format
          let shiftDate: string;
          if (shift.date.includes('T') && shift.date.includes('Z')) {
            // This is a UTC date, extract just the date part without timezone conversion
            shiftDate = shift.date.split('T')[0];
          } else if (shift.date.includes('T')) {
            shiftDate = toLocalYMD(new Date(shift.date));
          } else {
            shiftDate = shift.date;
          }
          
          return shiftDate === dateStr;
        });

        console.log(`PDF Debug - Found ${daySessions.length} sessions for date ${dateStr} and user ${user.name}`);

        if (daySessions.length > 0) {
          const sessionTimes = daySessions.map(session =>
            `${session.clockIn} - ${session.clockOut}`
          ).join(', ');
          row.push(`
            <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-size: 11px;">
              ${sessionTimes}
            </td>
          `);
        } else {
          row.push(`
            <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-size: 11px;">
              -
            </td>
          `);
        }
      }
    }
    
    // Total column
    row.push(`
      <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-weight: 500; font-size: 11px;">
        ${calculateUserTotal(user.id).toFixed(2)}
      </td>
    `);
    
    dataRows.push(`
      <tr style="${rowStyle}">
        ${row.join('')}
      </tr>
    `);

    // Add Total row for this user (same as UI)
    const totalRow = ['<td style="border: 1px solid #d1d5db; padding: 12px; text-sm text-gray-600 text-align: center; font-size: 11px;">Total</td>'];
    
    if (currentWeekRange) {
      const startDate = new Date(currentWeekRange.startOfWeek);
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = toLocalYMD(date);
        
        const dayTotal = sessionData
          .filter(item => {
            const scheduleItem = scheduleData.find(si =>
              si.shifts.some(shift => shift.id === item.shiftId)
            );
            if (!scheduleItem || scheduleItem.userId !== user.id) return false;

            const shift = scheduleItem.shifts.find(s => s.id === item.shiftId);
            if (!shift) return false;
            
            // Handle both local date format and ISO date format
            let shiftDate: string;
            if (shift.date.includes('T') && shift.date.includes('Z')) {
              shiftDate = shift.date.split('T')[0];
            } else if (shift.date.includes('T')) {
              shiftDate = toLocalYMD(new Date(shift.date));
            } else {
              shiftDate = shift.date;
            }
            
            return shiftDate === dateStr;
          })
          .reduce((total, item) => total + calculateWorkedTimeWith24HourLogic(item), 0);
        
        totalRow.push(`
          <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-weight: 500; font-size: 11px;">
            ${dayTotal > 0 ? dayTotal.toFixed(2) : '-'}
          </td>
        `);
      }
    }
    
    totalRow.push(`
      <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-weight: 500; font-size: 11px;">
        ${calculateUserTotal(user.id).toFixed(2)}
      </td>
    `);
    
    dataRows.push(`
      <tr style="background-color: ${userIndex % 2 === 0 ? '#f3f4f6' : '#e5e7eb'};">
        ${totalRow.join('')}
      </tr>
    `);
  });

  // Add Grand Total Row
  const grandTotalRow = ['<td style="border: 1px solid #d1d5db; padding: 12px; font-weight: 500; font-size: 11px;">GRAND TOTAL</td>'];
  
  if (currentWeekRange) {
    const startDate = new Date(currentWeekRange.startOfWeek);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = toLocalYMD(date);
      
      const dayTotal = calculateDayTotal(dateStr, sessionData);
      console.log(`PDF Debug - Grand Total Day ${dateStr}: ${dayTotal}`);
      grandTotalRow.push(`
        <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-size: 11px;">
          ${dayTotal > 0 ? dayTotal.toFixed(2) : '-'}
        </td>
      `);
    }
  }
  
  const grandTotal = calculateGrandTotal(sessionData);
  console.log(`PDF Debug - Grand Total: ${grandTotal}`);
  grandTotalRow.push(`
    <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-size: 11px;">
      ${grandTotal.toFixed(2)}
    </td>
  `);
  
  dataRows.push(`
    <tr style="background-color: #f9fafb; font-weight: 500;">
      ${grandTotalRow.join('')}
    </tr>
  `);

  return `
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px;">
      <thead>
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
            margin: 1in;
            size: landscape;
          }
          
          * {
            box-sizing: border-box;
          }
          
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0;
            padding: 20px;
            background: white;
            color: #333;
            line-height: 1.4;
          }
          
          .header {
            text-align: center;
            margin-bottom: 16px;
            border-bottom: 2px solid #004175;
            padding-bottom: 12px;
          }
          
          .header h1 { 
            margin: 0;
            color: #004175;
            font-size: 24px;
            font-weight: bold;
          }
          
          .header .subtitle {
            margin: 5px 0 0 0;
            color: #666;
            font-size: 14px;
          }
          
          .meta-info {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
            margin: 8px 0 12px 0;
            font-size: 13px;
            max-width: 55%;
          }

          .meta-info div b { color: #000; }

          .print-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 12px;
            color: #666;
          }
          
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 10px;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          
          th { 
            background-color: #004175 !important;
            color: white !important;
            font-weight: bold;
            padding: 12px 8px;
            text-align: left;
            border: 1px solid #004175;
            font-size: 12px;
          }
          
          td { 
            padding: 8px;
            border: 1px solid #dee2e6;
            font-size: 11px;
            vertical-align: top;
          }
          
          tr:nth-child(even) {
            background-color: #f8f9fa;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <div class="subtitle">Generated on: ${generatedDateStr} at ${generatedTimeStr}</div>
        </div>
        
        <div class="meta-info">
          <div><b>Client:</b> ${selectedClient ? selectedClient.name : 'All Clients'}</div>
          <div><b>Address:</b> ${selectedClient ? selectedClient.address : '-'}</div>
          ${typeof totalEmployees === 'number' ? `<div><b>Total Employees:</b> ${totalEmployees}</div>` : ``}
          ${typeof totalHours === 'number' ? `<div><b>Total Hours:</b> ${Number(totalHours).toFixed(2)}</div>` : ``}
        </div>
        
        <div class="print-info">
          <span>Week: ${currentWeekRange ? `${new Date(currentWeekRange.startOfWeek).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
          })} to ${new Date(currentWeekRange.endOfWeek).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
          })}` : ''}</span>
        </div>
        
        ${tableContent}
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
    
    // Use setTimeout to ensure content is loaded before printing
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


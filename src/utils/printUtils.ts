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
  if (!sessionData || sessionData.length === 0) {
    return `
      <div style="text-align: center; padding: 40px; color: #666; font-size: 16px;">
        <p>No actual time data available to print</p>
      </div>
    `;
  }

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
    if (dateStr.includes('T')) {
      return formatDateFromISO(dateStr);
    }
    return dateStr;
  };

  // Get unique users from schedule data (mirror ActualTimeTable structure)
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

  // Create a mapping of scheduleSessionId to userId for better session-to-user mapping
  const scheduleSessionToUserMap = new Map();
  scheduleData.forEach(item => {
    item.shifts.forEach(shift => {
      if (shift.scheduleSessionId) {
        scheduleSessionToUserMap.set(shift.scheduleSessionId, item.userId);
      }
    });
  });

  console.log('PDF Debug - ScheduleSession to User mapping:', Object.fromEntries(scheduleSessionToUserMap));

  // Debug: Log the data we're working with
  console.log('PDF Debug - Schedule data:', scheduleData);
  console.log('PDF Debug - Session data:', sessionData);
  console.log('PDF Debug - Unique users:', Array.from(uniqueUsers.values()));

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
  
  // Sort users by name to match UI table order
  const sortedUsers = Array.from(uniqueUsers.values()).sort((a, b) => a.name.localeCompare(b.name));
  
  // Helper function to get max shifts per day for a user
  const getMaxShiftsPerDay = (userId: number) => {
    const userDays = scheduleData.filter(i => i.userId === userId);
    let max = 1;
    for (const d of userDays) max = Math.max(max, d.shifts.length);
    return max;
  };

    // Helper function to calculate user total
  const calculateUserTotal = (userId: number) => {
    const userSessions = sessionData.filter(item => {
      // First try to find the shift in schedule data
      const scheduleItem = scheduleData.find(si =>
        si.shifts.some(shift => shift.id === item.shiftId)
      );
      
      if (scheduleItem && scheduleItem.userId === userId) {
        return true;
      }
      
      // If not found in schedule data, we need to determine user from scheduleSessionId
      // This is a fallback for when schedule data is not available
      const sessionUserId = scheduleSessionToUserMap.get(item.scheduleSessionId);
      return sessionUserId === userId;
    });
    
    const total = userSessions.reduce((total, item) => total + (item.workedTime || 0), 0) / 60; // Convert minutes to hours
    
    // Debug logging for user total calculation
    console.log(`PDF User Total Debug - User ID: ${userId}, Sessions found: ${userSessions.length}, Total hours: ${total.toFixed(2)}`);
    userSessions.forEach(session => {
      console.log(`  - Session ID: ${session.id}, ShiftId: ${session.shiftId}, ScheduleSessionId: ${session.scheduleSessionId}, WorkedTime: ${session.workedTime}`);
    });
    
    return total;
  };

  // Helper function to calculate day total for a specific user
  const calculateDayTotalForUser = (date: string, userId: number) => {
    const total = sessionData
      .filter(item => {
        let shiftDate: string | null = null;
        let belongsToUser = false;
        
        // Try to find shift in schedule data
        const scheduleItem = scheduleData.find(si =>
          si.shifts.some(shift => shift.id === item.shiftId)
        );
        
        if (scheduleItem && scheduleItem.userId === userId) {
          // Found in schedule data and belongs to this user
          const shift = scheduleItem.shifts.find(s => s.id === item.shiftId);
          if (shift) {
            shiftDate = normalizeDateForComparison(shift.date);
            belongsToUser = true;
          }
        } else if ((item as any).shift && (item as any).shift.date) {
          // Use embedded shift data if available
          shiftDate = normalizeDateForComparison((item as any).shift.date);
          
          // Check if this session belongs to this user via scheduleSessionId
          const sessionUserId = scheduleSessionToUserMap.get(item.scheduleSessionId);
          belongsToUser = sessionUserId === userId;
        }
        
        return shiftDate === date && belongsToUser;
      })
      .reduce((total, item) => total + (item.workedTime || 0), 0);
    return parseFloat((total / 60).toFixed(2)); // Convert minutes to hours
  };

  // Helper function to calculate day total (for grand total - all users)
  const calculateDayTotal = (date: string) => {
    const total = sessionData
      .filter(item => {
        let shiftDate: string | null = null;
        
        // Try to find shift in schedule data
        const scheduleItem = scheduleData.find(si =>
          si.shifts.some(shift => shift.id === item.shiftId)
        );
        
        if (scheduleItem) {
          const shift = scheduleItem.shifts.find(s => s.id === item.shiftId);
          if (shift) {
            shiftDate = normalizeDateForComparison(shift.date);
          }
        } else if ((item as any).shift && (item as any).shift.date) {
          // Use embedded shift data if available
          shiftDate = normalizeDateForComparison((item as any).shift.date);
        }
        
        return shiftDate === date;
      })
      .reduce((total, item) => total + (item.workedTime || 0), 0);
    return parseFloat((total / 60).toFixed(2)); // Convert minutes to hours
  };

  // Helper function to calculate grand total
  const calculateGrandTotal = () => {
    const total = sessionData.reduce((total, item) => total + (item.workedTime || 0), 0);
    return parseFloat((total / 60).toFixed(2)); // Convert minutes to hours
  };

  // Table rows from data - match UI structure exactly
  const dataRows = [];
  
  sortedUsers.forEach((user, userIndex) => {
    const rowCount = getMaxShiftsPerDay(user.id);

    // Create session rows for this user
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
      
      // Date columns - match UI structure
      if (currentWeekRange) {
        const startDate = new Date(currentWeekRange.startOfWeek);
        for (let i = 0; i < 7; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          const dateStr = toLocalYMD(date);
          
                     // Find all sessions for this specific date and user
           const daySessions = sessionData.filter(item => {
             let shiftDate: string | null = null;
             let belongsToUser = false;
             
             // Try to find shift in schedule data
             const scheduleItem = scheduleData.find(si =>
               si.shifts.some(shift => shift.id === item.shiftId)
             );
             
             if (scheduleItem && scheduleItem.userId === user.id) {
               // Found in schedule data and belongs to this user
               const shift = scheduleItem.shifts.find(s => s.id === item.shiftId);
               if (shift) {
                 shiftDate = normalizeDateForComparison(shift.date);
                 belongsToUser = true;
               }
             } else if ((item as any).shift && (item as any).shift.date) {
               // Use embedded shift data if available
               shiftDate = normalizeDateForComparison((item as any).shift.date);
               
               // Check if this session belongs to this user via scheduleSessionId
               const sessionUserId = scheduleSessionToUserMap.get(item.scheduleSessionId);
               belongsToUser = sessionUserId === user.id;
             }
             
             
             // Debug logging for session filtering
             console.log(`PDF Session Filter Debug - Date: ${dateStr}, User: ${user.name}, SessionId: ${item.id}, ShiftId: ${item.shiftId}, ScheduleSessionId: ${item.scheduleSessionId}, ShiftDate: ${shiftDate}, BelongsToUser: ${belongsToUser}, Matches: ${shiftDate === dateStr && belongsToUser}`);
             
             return shiftDate === dateStr && belongsToUser;
           });
          
          // Sort sessions by clock-in time (increasing order)
          const sortedSessions = daySessions.sort((a, b) => 
            timeToMinutes(a.clockIn) - timeToMinutes(b.clockIn)
          );
          
          // Get the session for this specific row index
          const session = sortedSessions[rowIdx];
          
          row.push(`
            <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-size: 11px;">
              ${session ? `${session.clockIn} - ${session.clockOut}` : '-'}
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
        
        const dayTotal = calculateDayTotalForUser(dateStr, user.id);
        totalRow.push(`
          <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; font-weight: 500; font-size: 11px;">
            ${dayTotal > 0 ? dayTotal : '-'}
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

export const generatePrintContent = (
  tableContent: string,
  options: PrintOptions
) => {
  const { title, selectedClient, currentWeekRange } = options;
  
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
            margin-bottom: 30px;
            border-bottom: 2px solid #004175;
            padding-bottom: 15px;
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
          <div class="subtitle">${selectedClient ? `${selectedClient.name} - ${selectedClient.address}` : 'All Clients'}</div>
        </div>
        
        <div class="print-info">
          <span>Generated on: ${new Date().toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
          })} at ${new Date().toLocaleTimeString()}</span>
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


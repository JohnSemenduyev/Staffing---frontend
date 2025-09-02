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
  currentWeekRange?: { startOfWeek: Date; endOfWeek: Date },
  selectedClient?: { name: string; address: string }
) => {
  console.log('PDF Debug - Incoming scheduleData:', scheduleData.slice(0, 2));
  console.log('PDF Debug - Current week range:', currentWeekRange);
  
  if (!scheduleData || scheduleData.length === 0) {
    return `
      <div style="text-align: center; padding: 40px; color: #666; font-size: 16px;">
        <p>No schedule data available to print</p>
      </div>
    `;
  }

  // Get unique users
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

  // Sort users by name
  const sortedUsers = Array.from(uniqueUsers.values()).sort((a, b) => a.name.localeCompare(b.name));

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

  const headerRow = headers.map(header => 
    `<th style="background-color: #fff; color: black; font-weight: bold; padding: 4px 6px; text-align: center; border: 2px solid black; font-size: 10px;">${header}</th>`
  ).join('');

  // Client info row - single row spanning all columns
  const clientInfoRow = `
    <tr>
      <td colspan="11" style="border: 2px solid black; padding: 8px 12px; text-align: left; font-size: 11px; background-color: #F0F0F0; line-height: 1.4;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1;">
            <strong>Client Name:</strong> ${selectedClient ? selectedClient.name : 'All Clients'}
          </div>
          <div style="flex: 1;">
            <strong>Client Address:</strong> ${selectedClient ? selectedClient.address : '-'}
          </div>
          <div style="flex: 1;">
            <strong>Week Ending:</strong> ${currentWeekRange ? new Date(currentWeekRange.endOfWeek).toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: '2-digit'
            }) : ''}
          </div>
        </div>
      </td>
    </tr>
  `;

  // Helper functions
  const getMaxShiftsPerDay = (userId: number) => {
    let maxShifts = 1;
    if (!currentWeekRange) return maxShifts;

    const startDate = new Date(currentWeekRange.startOfWeek);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = toLocalYMD(date);
      
      const shiftsForDay = scheduleData
        .filter(item => item.userId === userId)
        .flatMap(item => item.shifts)
        .filter(shift => {
          const shiftDate = shift.date.includes('T') ? 
            toLocalYMD(new Date(shift.date)) : shift.date;
          return shiftDate === dateStr;
        });
      
      maxShifts = Math.max(maxShifts, shiftsForDay.length);
    }
    return maxShifts;
  };

  const calculateUserTotal = (userId: number) => {
    return scheduleData
      .filter(item => item.userId === userId)
      .reduce((total, item) => total + item.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0);
  };

  const calculateDayTotal = (dateStr: string) => {
    return scheduleData
      .flatMap(item => item.shifts)
      .filter(shift => {
        const shiftDate = shift.date.includes('T') ? 
          toLocalYMD(new Date(shift.date)) : shift.date;
        return shiftDate === dateStr;
      })
      .reduce((total, shift) => total + shift.hours, 0);
  };

  const calculateGrandTotal = () => {
    return scheduleData
      .reduce((total, item) => total + item.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.hours, 0), 0);
  };

  // Build table rows
  const dataRows = [];

  sortedUsers.forEach(user => {
    const maxShifts = getMaxShiftsPerDay(user.id);
    const totalRows = maxShifts + 1; // +1 for Total row
    
    // Data rows for shifts
    for (let rowIdx = 0; rowIdx < maxShifts; rowIdx++) {
      const cells = [];
      
      // Officer name (spans all rows including Total)
      if (rowIdx === 0) {
        cells.push(`
          <td style="border: 2px solid black; padding: 4px 6px; text-align: left; font-size: 10px; font-weight: normal;" rowspan="${totalRows}">
            ${user.name}
          </td>
        `);
        
        // Empty column (spans all rows including Total)
        cells.push(`
          <td style="border: 2px solid black; padding: 4px 6px; text-align: center; font-size: 10px;" rowspan="${totalRows-1}">
            
          </td>
        `);
      }

      // Day columns
      if (currentWeekRange) {
        const startDate = new Date(currentWeekRange.startOfWeek);
        for (let i = 0; i < 7; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          const dateStr = toLocalYMD(date);
          
          // Find shifts for this day and user
          const dayShifts = scheduleData
            .filter(item => item.userId === user.id)
            .flatMap(item => item.shifts)
            .filter(shift => {
              const shiftDate = shift.date.includes('T') ? 
                toLocalYMD(new Date(shift.date)) : shift.date;
              return shiftDate === dateStr;
            })
            .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

          const shift = dayShifts[rowIdx];
          const cellContent = shift ? `${shift.startTime} - ${shift.endTime}` : '';

          cells.push(`
            <td style="border: 2px solid black; padding: 4px 6px; text-align: center; font-size: 10px;">
              ${cellContent}
            </td>
          `);
        }
      }

      // Total column (spans all data rows, not the Total row)
      if (rowIdx === 0) {
        cells.push(`
          <td style="border: 2px solid black; padding: 4px 6px; text-align: center; font-size: 10px;" rowspan="${maxShifts}">
            ${calculateUserTotal(user.id).toFixed(0)}
          </td>
        `);
      }

      dataRows.push(`<tr>${cells.join('')}</tr>`);
    }

    // Total row for this user
    const totalCells = [`
      <td style="border: 2px solid black; padding: 4px 6px; text-align: left; font-size: 10px; font-weight: bold;">
        Total
      </td>
    `];

    if (currentWeekRange) {
      const startDate = new Date(currentWeekRange.startOfWeek);
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = toLocalYMD(date);
        
        const dayTotal = scheduleData
          .filter(item => item.userId === user.id)
          .flatMap(item => item.shifts)
          .filter(shift => {
            const shiftDate = shift.date.includes('T') ? 
              toLocalYMD(new Date(shift.date)) : shift.date;
            return shiftDate === dateStr;
          })
          .reduce((total, shift) => total + shift.hours, 0);

        totalCells.push(`
          <td style="border: 2px solid black; padding: 4px 6px; text-align: center; font-size: 10px; font-weight: bold;">
            ${dayTotal > 0 ? dayTotal.toFixed(0) : ''}
          </td>
        `);
      }
    }

    // Total column for Total row
    totalCells.push(`
      <td style="border: 2px solid black; padding: 4px 6px; text-align: center; font-size: 10px; font-weight: bold;">
        ${calculateUserTotal(user.id).toFixed(0)}
      </td>
    `);

    dataRows.push(`<tr>${totalCells.join('')}</tr>`);
  });

  // Grand Total row
  const grandTotalCells = [`
    <td style="border: 2px solid black; padding: 4px 6px; text-align: left; font-size: 10px; font-weight: bold;">
      Grand Total
    </td>
  `, `
    <td style="border: 2px solid black; padding: 4px 6px; text-align: center; font-size: 10px; font-weight: bold;">
      
    </td>
  `];

  if (currentWeekRange) {
    const startDate = new Date(currentWeekRange.startOfWeek);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = toLocalYMD(date);
      
      const dayTotal = calculateDayTotal(dateStr);
      grandTotalCells.push(`
        <td style="border: 2px solid black; padding: 4px 6px; text-align: center; font-size: 10px; font-weight: bold;">
          ${dayTotal > 0 ? dayTotal.toFixed(0) : ''}
        </td>
      `);
    }
  }

  grandTotalCells.push(`
    <td style="border: 2px solid black; padding: 4px 6px; text-align: center; font-size: 10px; font-weight: bold;">
      ${calculateGrandTotal().toFixed(0)}
    </td>
  `);

  dataRows.push(`<tr>${grandTotalCells.join('')}</tr>`);

  return `
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; border: 2px solid black;">
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
  selectedClient?: { name: string; address: string }
) => {
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

  // Helper function to calculate worked time with 24-hour logic
  const calculateWorkedTimeWith24HourLogic = (session: SessionData) => {
    if (!session.clockIn || !session.clockOut) {
      return (session.workedTime || 0) / 60;
    }
    
    if (session.clockIn === session.clockOut) {
      return 24.0;
    }
    
    const calculateHours = (start: string, end: string) => {
      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);
      let hours = endH - startH + (endM - startM) / 60;
      if (hours <= 0) hours += 24;
      return parseFloat(hours.toFixed(2));
    };
    
    return calculateHours(session.clockIn, session.clockOut);
  };

  // Get unique users from session data
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

  const sortedUsers = Array.from(uniqueUsers.values()).sort((a, b) => a.name.localeCompare(b.name));

  // Helper functions
  const getMaxSessionsPerDay = (userId: number) => {
    let maxSessions = 1;
    if (!currentWeekRange) return maxSessions;

    const startDate = new Date(currentWeekRange.startOfWeek);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = toLocalYMD(date);
      
      const sessionsForDay = sessionData.filter(item => {
        const scheduleItem = scheduleData.find(si =>
          si.shifts.some(shift => shift.id === item.shiftId)
        );
        if (!scheduleItem || scheduleItem.userId !== userId) return false;

        const shift = scheduleItem.shifts.find(s => s.id === item.shiftId);
        if (!shift) return false;
        
        let shiftDate: string;
        if (shift.date.includes('T') && shift.date.includes('Z')) {
          shiftDate = shift.date.split('T')[0];
        } else if (shift.date.includes('T')) {
          shiftDate = toLocalYMD(new Date(shift.date));
        } else {
          shiftDate = shift.date;
        }
        
        return shiftDate === dateStr;
      });
      
      maxSessions = Math.max(maxSessions, sessionsForDay.length);
    }
    return maxSessions;
  };

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

  const calculateDayTotal = (dateStr: string) => {
    const total = sessionData
      .filter(item => {
        const scheduleItem = scheduleData.find(si =>
          si.shifts.some(shift => shift.id === item.shiftId)
        );
        if (!scheduleItem) return false;

        const shift = scheduleItem.shifts.find(s => s.id === item.shiftId);
        if (!shift) return false;
        
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
    return parseFloat(total.toFixed(2));
  };

  const calculateGrandTotal = () => {
    const total = sessionData.reduce((total, item) => total + calculateWorkedTimeWith24HourLogic(item), 0);
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

  const headerRow = headers.map(header => 
    `<th style="background-color: #fff; color: black; font-weight: bold; padding: 4px 6px; text-align: center; border: 2px solid black; font-size: 10px;">${header}</th>`
  ).join('');

  // Client info row - single row spanning all columns
  const clientInfoRow = `
    <tr>
      <td colspan="11" style="border: 2px solid black; padding: 8px 12px; text-align: left; font-size: 11px; background-color: #F0F0F0; line-height: 1.4;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1;">
            <strong>Client Name:</strong> ${selectedClient ? selectedClient.name : 'All Clients'}
          </div>
          <div style="flex: 1;">
            <strong>Client Address:</strong> ${selectedClient ? selectedClient.address : '-'}
          </div>
          <div style="flex: 1;">
            <strong>Week Ending:</strong> ${currentWeekRange ? new Date(currentWeekRange.endOfWeek).toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: '2-digit'
            }) : ''}
          </div>
        </div>
      </td>
    </tr>
  `;

  // Build table rows
  const dataRows = [];

  sortedUsers.forEach(user => {
    const maxSessions = getMaxSessionsPerDay(user.id);
    const totalRows = maxSessions + 1; // +1 for Total row

    // Data rows for sessions
    for (let rowIdx = 0; rowIdx < maxSessions; rowIdx++) {
      const cells = [];
      
      // Officer name (spans all rows including Total)
      if (rowIdx === 0) {
        cells.push(`
          <td style="border: 2px solid black; padding: 4px 6px; text-align: left; font-size: 10px; font-weight: normal;" rowspan="${totalRows}">
            ${user.name}
          </td>
        `);
        
        // Empty column (spans all rows including Total)
        cells.push(`
          <td style="border: 2px solid black; padding: 4px 6px; text-align: center; font-size: 10px;" rowspan="${totalRows -1 }">
            
          </td>
        `);
      }

      // Day columns
      if (currentWeekRange) {
        const startDate = new Date(currentWeekRange.startOfWeek);
        for (let i = 0; i < 7; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          const dateStr = toLocalYMD(date);
          
          // Find sessions for this day and user
          const daySessions = sessionData.filter(item => {
            const scheduleItem = scheduleData.find(si =>
              si.shifts.some(shift => shift.id === item.shiftId)
            );
            if (!scheduleItem || scheduleItem.userId !== user.id) return false;

            const shift = scheduleItem.shifts.find(s => s.id === item.shiftId);
            if (!shift) return false;
            
            let shiftDate: string;
            if (shift.date.includes('T') && shift.date.includes('Z')) {
              shiftDate = shift.date.split('T')[0];
            } else if (shift.date.includes('T')) {
              shiftDate = toLocalYMD(new Date(shift.date));
            } else {
              shiftDate = shift.date;
            }
            
            return shiftDate === dateStr;
          });

          const session = daySessions[rowIdx];
          const cellContent = session ? `${session.clockIn} - ${session.clockOut}` : '';

          cells.push(`
            <td style="border: 2px solid black; padding: 4px 6px; text-align: center; font-size: 10px;">
              ${cellContent}
            </td>
          `);
        }
      }

      // Total column (spans all data rows, not the Total row)
      if (rowIdx === 0) {
        cells.push(`
          <td style="border: 2px solid black; padding: 4px 6px; text-align: center; font-size: 10px;" rowspan="${maxSessions}">
            ${calculateUserTotal(user.id).toFixed(0)}
          </td>
        `);
      }

      dataRows.push(`<tr>${cells.join('')}</tr>`);
    }

    // Total row for this user
    const totalCells = [`
      <td style="border: 2px solid black; padding: 4px 6px; text-align: left; font-size: 10px; font-weight: bold;">
        Total
      </td>
    `];

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

        totalCells.push(`
          <td style="border: 2px solid black; padding: 4px 6px; text-align: center; font-size: 10px; font-weight: bold;">
            ${dayTotal > 0 ? dayTotal.toFixed(0) : ''}
          </td>
        `);
      }
    }

    // Total column for Total row
    totalCells.push(`
      <td style="border: 2px solid black; padding: 4px 6px; text-align: center; font-size: 10px; font-weight: bold;">
        ${calculateUserTotal(user.id).toFixed(0)}
      </td>
    `);

    dataRows.push(`<tr>${totalCells.join('')}</tr>`);
  });

  // Grand Total row
  const grandTotalCells = [`
    <td style="border: 2px solid black; padding: 4px 6px; text-align: left; font-size: 10px; font-weight: bold;">
      Grand Total
    </td>
  `, `
    <td style="border: 2px solid black; padding: 4px 6px; text-align: center; font-size: 10px; font-weight: bold;">
      
    </td>
  `];

  if (currentWeekRange) {
    const startDate = new Date(currentWeekRange.startOfWeek);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = toLocalYMD(date);
      
      const dayTotal = calculateDayTotal(dateStr);
      grandTotalCells.push(`
        <td style="border: 2px solid black; padding: 4px 6px; text-align: center; font-size: 10px; font-weight: bold;">
          ${dayTotal > 0 ? dayTotal.toFixed(0) : ''}
        </td>
      `);
    }
  }

  grandTotalCells.push(`
    <td style="border: 2px solid black; padding: 4px 6px; text-align: center; font-size: 10px; font-weight: bold;">
      ${calculateGrandTotal().toFixed(0)}
    </td>
  `);

  dataRows.push(`<tr>${grandTotalCells.join('')}</tr>`);

  return `
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; border: 2px solid black;">
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
            margin: 0.5in;
            size: landscape;
          }
          
          * {
            box-sizing: border-box;
          }
          
          body { 
            font-family: Arial, sans-serif; 
            margin: 0;
            padding: 10px;
            background: white;
            color: black;
            line-height: 1.2;
          }
          
          .header {
            text-align: left;
            margin-bottom: 12px;
          }
          
          .header h1 { 
            margin: 0;
            color: black;
            font-size: 18px;
            font-weight: bold;
          }
          
          .header .subtitle {
            margin: 4px 0 0 0;
            color: black;
            font-size: 12px;
          }
          
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 8px;
            background: white;
            border: 2px solid black;
          }
          
          th { 
            background-color: white !important;
            color: black !important;
            font-weight: bold;
            padding: 4px 6px;
            text-align: center;
            border: 2px solid black;
            font-size: 10px;
          }
          
          td { 
            padding: 4px 6px;
            border: 2px solid black;
            font-size: 10px;
            vertical-align: middle;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
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
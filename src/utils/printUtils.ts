import { format } from "path";
import { formatDateLocal } from "../lib/utils";
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
  workedTime?: number;
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
  console.log('PDF Debug - Incoming scheduleData:', scheduleData.slice(0, 2));
  console.log('PDF Debug - Current week range:', currentWeekRange);
  
  if (!scheduleData || scheduleData.length === 0) {
    return `
      <div style="text-align: center; padding: 40px; color: #666; font-size: 20px; margin:20px">
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
        <strong>Address:</strong> ${selectedClient ? [selectedClient.address, selectedClient.city, formatStateWithAbbr(selectedClient.state), selectedClient.pincode].filter(Boolean).join(', ') : '-'}
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
          const shiftDate = shift.date;
            
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
        const shiftDate = shift.date;
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
          <td style="padding: 0px 6px 0px 12px; text-align: left; font-size: 15px; font-weight: normal; border: 1px solid black !important;" rowspan="${totalRows}">
            ${user.name}
          </td>
        `);
        
        // Empty column (spans all rows including Total)
        cells.push(`
          <td style="border: 1px solid black; padding: 0px 2px; text-align: center; font-size: 15px;" rowspan="${totalRows-1}">
            
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
              const shiftDate =  shift.date;
              return shiftDate === dateStr;
            })
            .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

          const shift = dayShifts[rowIdx];
          const cellContent = shift ? `${shift.startTime} - ${shift.endTime}` : '';
          
          cells.push(`
            <td style="border-right: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px;">
              ${cellContent}
            </td>
          `);
        }
      }

      // Calculate total for this specific row (sum of all shifts in this row across all days)
      let rowTotal = 0;
      if (currentWeekRange) {
        const startDate = new Date(currentWeekRange.startOfWeek);
        for (let i = 0; i < 7; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          const dateStr = toLocalYMD(date);
          
          const shiftsForDay = scheduleData
            .filter(item => item.userId === user.id)
            .flatMap(item => item.shifts)
            .filter(shift => {
              const shiftDate = shift.date.includes('T') ? 
          toLocalYMD(new Date(shift.date)) : shift.date;
              return shiftDate === dateStr;
            });
          
          if (shiftsForDay[rowIdx]) {
            rowTotal += shiftsForDay[rowIdx].hours;
          }
        }
      }
      
      
      cells.push(`
        <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px;">
          ${rowTotal > 0 ? rowTotal.toFixed(2) : ''}
        </td>
      `);

      dataRows.push(`<tr>${cells.join('')}</tr>`);
    }

    // Total row for this user
    const totalCells = [`
      <td style="border: 1px solid black !important; text-align: left; font-size: 15px; font-weight: bold;">
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
            const shiftDate = shift.date;
            return shiftDate === dateStr;
          })
          .reduce((total, shift) => total + shift.hours, 0);

        totalCells.push(`
          <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px; font-weight: bold;">
            ${dayTotal > 0 ? dayTotal.toFixed(2) : ''}
          </td>
        `);
      }
    }

    // Total column for Total row
    totalCells.push(`
      <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px; font-weight: bold;">
        ${calculateUserTotal(user.id).toFixed(2)}
      </td>
    `);

    dataRows.push(`<tr>${totalCells.join('')}</tr>`);
  });

  // Grand Total row
  const grandTotalCells = [`
    <td style="border: 1px solid black !important; padding: 0px 6px 0px 12px; text-align: left; font-size: 15px; font-weight: bold;">
      Grand Total
    </td>
  `, `
    <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px; font-weight: bold;">
      
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
        <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px; font-weight: bold;">
          ${dayTotal > 0 ? dayTotal.toFixed(2) : ''}
        </td>
      `);
    }
  }

  grandTotalCells.push(`
    <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px; font-weight: bold;">
      ${calculateGrandTotal().toFixed(2)}
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
  console.log('PDF Debug - Session data:', sessionData);
  console.log('PDF Debug - Schedule data:', scheduleData);
  console.log('PDF Debug - Current week range:', currentWeekRange);
  
  if (!sessionData || sessionData.length === 0) {
    return `
      <div style="text-align: center; padding: 40px; color: #666; font-size: 20px;">
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
  const getMaxShiftsPerDay = (userId: number) => {
    let maxShifts = 1;
    if (!currentWeekRange) return maxShifts;

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
        
        const shiftDate = shift.date.includes('T') ? toLocalYMD(new Date(shift.date)) : shift.date;
        return shiftDate === dateStr;
      });
      
      // Get unique shifts for this day
      const uniqueShifts = [...new Set(sessionsForDay.map(s => s.shiftId))];
      maxShifts = Math.max(maxShifts, uniqueShifts.length);
    }
    return maxShifts;
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
        
        const shiftDate = shift.date.includes('T') ? toLocalYMD(new Date(shift.date)) : shift.date;
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
        <strong>Address:</strong> ${selectedClient ? [selectedClient.address, selectedClient.city, formatStateWithAbbr(selectedClient.state), selectedClient.pincode].filter(Boolean).join(', ') : '-'}
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

  sortedUsers.forEach(user => {
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
          <td style="border-left: 1px solid black !important; border-right: 1px solid black !important; border-top: 1px solid black !important; border-bottom: none !important; padding: 0px 6px; text-align: center; font-size: 15px;" rowspan="${totalRows -1 }">
            
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
            
            const shiftDate = shift.date.includes('T') ? toLocalYMD(new Date(shift.date)) : shift.date;
            return shiftDate === dateStr;
          });

          // Group sessions by shift and get the shift for this row
          const shiftsForDay = [...new Set(daySessions.map(s => s.shiftId))];
          const currentShiftId = shiftsForDay[rowIdx];
          
          let cellContent = '';
          if (currentShiftId) {
            const sessionsForShift = daySessions.filter(s => s.shiftId === currentShiftId);
            cellContent = sessionsForShift.map(s => `${s.clockIn} - ${s.clockOut}`).join('\n');
          }

          cells.push(`
            <td style="border: 1px solid black !important; padding: 0px; text-align: center; font-size: 15px; ">
              ${cellContent}
            </td>
          `);
        }
      }

      // Calculate total for this specific row (sum of all sessions in this row across all days)
      let rowTotal = 0;
      if (currentWeekRange) {
        const startDate = new Date(currentWeekRange.startOfWeek);
        for (let i = 0; i < 7; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          const dateStr = toLocalYMD(date);
          
          const sessionsForDay = sessionData.filter(item => {
            const scheduleItem = scheduleData.find(si =>
              si.shifts.some(shift => shift.id === item.shiftId)
            );
            if (!scheduleItem || scheduleItem.userId !== user.id) return false;

            const shift = scheduleItem.shifts.find(s => s.id === item.shiftId);
            if (!shift) return false;
            
            const shiftDate = shift.date.includes('T') ? toLocalYMD(new Date(shift.date)) : shift.date;
            return shiftDate === dateStr;
          });
          
          // Group sessions by shift and get the shift for this row
          const shiftsForDay = [...new Set(sessionsForDay.map(s => s.shiftId))];
          const currentShiftId = shiftsForDay[rowIdx];
          
          if (currentShiftId) {
            const sessionsForShift = sessionsForDay.filter(s => s.shiftId === currentShiftId);
            // Add all sessions in this shift to the row total
            sessionsForShift.forEach(session => {
              rowTotal += calculateWorkedTimeWith24HourLogic(session);
            });
          }
        }
      }
      
      cells.push(`
        <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px;">
          ${rowTotal > 0 ? rowTotal.toFixed(2) : ''}
        </td>
      `);

      dataRows.push(`<tr>${cells.join('')}</tr>`);
    }

    // Total row for this user
    const totalCells = [`
      <td style="border: 1px solid black !important; text-align: left; font-size: 15px; font-weight: bold;">
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
            
            const shiftDate = shift.date.includes('T') ? toLocalYMD(new Date(shift.date)) : shift.date;
            return shiftDate === dateStr;
          })
          .reduce((total, item) => total + calculateWorkedTimeWith24HourLogic(item), 0);

        totalCells.push(`
          <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px; font-weight: bold;">
            ${dayTotal > 0 ? dayTotal.toFixed(2) : ''}
          </td>
        `);
      }
    }

    // Total column for Total row
    totalCells.push(`
      <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px; font-weight: bold;">
        ${calculateUserTotal(user.id).toFixed(2)}
      </td>
    `);

    dataRows.push(`<tr>${totalCells.join('')}</tr>`);
  });

  // Grand Total row
  const grandTotalCells = [`
    <td style="border: 1px solid black !important; padding: 0px 6px 0px 12px; text-align: left; font-size: 15px; font-weight: bold;">
      Grand Total
    </td>
  `, `
    <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px; font-weight: bold;">
      
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
        <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px; font-weight: bold;">
          ${dayTotal > 0 ? dayTotal.toFixed(2) : ''}
        </td>
      `);
    }
  }

  grandTotalCells.push(`
    <td style="border: 1px solid black !important; padding: 0px 6px; text-align: center; font-size: 15px; font-weight: bold;">
      ${calculateGrandTotal().toFixed(2)}
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
  'Alabama': 'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA','Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY','American Samoa':'AS','District of Columbia':'DC','Guam':'GU','Northern Mariana Islands':'MP','Puerto Rico':'PR','Trust Territories':'TT','Virgin Islands':'VI'
};

const formatStateWithAbbr = (state?: string) => {
  if (!state) return '';
  const abbr = STATE_ABBR[state.trim()];
  return abbr ? `${abbr}` : state;
};
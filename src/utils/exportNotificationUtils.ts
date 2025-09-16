import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface NotificationData {
  client: { name: string };
  address: { address: string; city: string; state: string; pincode: string };
  guardFirst: { name: string };
  guardLast: { name: string };
  notificationType: string;
  message: string;
  date: string;
  time: string;
  [key: string]: any;
}

export const exportNotificationToExcel = (data: NotificationData[], filename: string = 'notifications') => {
  try {
    // Transform data for Excel export
    const excelData = data.map((row, index) => ({
      'S.No': index + 1,
      'Client Name': row.client?.name || '-',
      'Address': row.address ? 
        `${row.address.address || ''}, ${row.address.city || ''}, ${row.address.state || ''} ${row.address.pincode || ''}`.trim() : '-',
      'User Name': row.guardFirst && row.guardLast ? 
        `${row.guardFirst.name || ''} ${row.guardLast.name || ''}`.trim() : '-',
      'Notification Type': row.notificationType || '-',
      'Message': row.message || '-',
      'Date': row.date || '-',
      'Time': row.time || '-'
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    
    // Create data structure with empty first row and column
    const titleRow = ['', 'Notifications']; // Empty first cell, then title
    const headerRow = ['', ...Object.keys(excelData[0] || {})]; // Empty first cell, then headers
    const dataRows = excelData.map(row => ['', ...Object.values(row)]); // Empty first cell, then data
    
    const dataWithStructure = [
      titleRow,      // Row 0: Empty first cell, then title
      headerRow,     // Row 1: Empty first cell, then headers
      ...dataRows    // Row 2+: Empty first cell, then data
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(dataWithStructure);

    // Set column widths - matching summary proportions
    const columnWidths = [
      { wch: 5 },   // Empty first column
      { wch: 8 },   // S.No
      { wch: 20 },  // Client Name
      { wch: 35 },  // Address
      { wch: 20 },  // User Name
      { wch: 18 },  // Notification Type
      { wch: 40 },  // Message
      { wch: 15 },  // Date
      { wch: 12 }   // Time
    ];
    worksheet['!cols'] = columnWidths;

    // Add styling to match summary exports
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Style title cell (B1 - row 0, col 1)
    const titleCellAddress = XLSX.utils.encode_cell({ r: 0, c: 1 });
    worksheet[titleCellAddress].s = {
      font: { name: 'Arial', sz: 18, bold: true, italic: true, color: { rgb: '000000' } },
      fill: { fgColor: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };
    
    // Merge title cell across all data columns (B1 to last column)
    if (!worksheet['!merges']) worksheet['!merges'] = [];
    worksheet['!merges'].push({
      s: { r: 0, c: 1 },  // B1
      e: { r: 0, c: range.e.c }  // Last column, row 0
    });
    
    // Style header row (row 1, starting from col 1)
    for (let col = 1; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 1, c: col });
      if (!worksheet[cellAddress]) continue;
      
      worksheet[cellAddress].s = {
        font: { name: 'Arial', sz: 15, bold: true, color: { rgb: '000000' } },
        fill: { fgColor: { rgb: 'FFFFFF' } },
        border: {
          top: { style: 'hairline', color: { rgb: '000000' } },
          bottom: { style: 'hairline', color: { rgb: '000000' } },
          left: { style: 'hairline', color: { rgb: '000000' } },
          right: { style: 'hairline', color: { rgb: '000000' } }
        },
        alignment: { horizontal: 'center', vertical: 'middle' },
        numFmt: '@' // Force text format to prevent Excel's default number alignment
      };
    }

    // Style data rows (starting from row 2, starting from col 1)
    for (let row = 2; row <= range.e.r; row++) {
      for (let col = 1; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) continue;
        
        // All text center-aligned with explicit number formatting
        worksheet[cellAddress].s = {
          font: { name: 'Arial', sz: 15, color: { rgb: '000000' } },
          fill: { fgColor: { rgb: 'FFFFFF' } },
          border: {
            top: { style: 'hairline', color: { rgb: '000000' } },
            bottom: { style: 'hairline', color: { rgb: '000000' } },
            left: { style: 'hairline', color: { rgb: '000000' } },
            right: { style: 'hairline', color: { rgb: '000000' } }
          },
          alignment: { horizontal: 'center', vertical: 'middle' },
          numFmt: '@' // Force text format to prevent Excel's default number alignment
        };
      }
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Notifications');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const finalFilename = `${filename}_${timestamp}.xlsx`;

    // Save file
    XLSX.writeFile(workbook, finalFilename);

    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return { success: false, error: error.message };
  }
};

export const exportNotificationToPDF = (data: NotificationData[], filename: string = 'notifications') => {
  try {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Add title - matching summary styling with italic
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bolditalic');
    doc.text('Notifications', 5, 15); // Reduced margin to match 0.1in

    // Prepare table data
    const tableData = data.map((row, index) => [
      index + 1,
      row.client?.name || '-',
      row.address ? 
        `${row.address.address || ''}, ${row.address.city || ''}, ${row.address.state || ''} ${row.address.pincode || ''}`.trim() : '-',
      row.guardFirst && row.guardLast ? 
        `${row.guardFirst.name || ''} ${row.guardLast.name || ''}`.trim() : '-',
      row.notificationType || '-',
      row.message || '-',
      row.date || '-',
      row.time || '-'
    ]);

    // Table headers
    const headers = [
      'S.No',
      'Client Name',
      'Address',
      'User Name',
      'Notification Type',
      'Message',
      'Date',
      'Time'
    ];

    // Generate table - matching summary styling
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 20,
      styles: {
        fontSize: 15, // Match summary font size
        cellPadding: { top: 2, right: 2, bottom: 2, left: 3 }, // Match summary padding
        overflow: 'linebreak',
        halign: 'center',
        lineWidth: 0.5, // Thinner border for table cells
        lineColor: [0, 0, 0], // Black color for cell borders
        minCellHeight: 5.5, // Match summary height (22px ≈ 5.5mm)
        font: 'helvetica', // Match summary Arial/helvetica
        textColor: [0, 0, 0], // Black text
        fillColor: [255, 255, 255] // Pure white background for all rows
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255] // Ensure alternate rows are also white
      },
      headStyles: {
        fillColor: [255, 255, 255], // White background like summary
        textColor: [0, 0, 0], // Black text
        fontStyle: 'bold',
        lineWidth: 0.5, // Thinner border for table header
        lineColor: [0, 0, 0], // Black color for header borders
        minCellHeight: 5.5, // Match summary height
        fontSize: 15, // Match summary font size
        font: 'helvetica' // Match summary font
      },
      columnStyles: {
        0: { 
          halign: 'center', 
          fontStyle: 'bold',
          cellPadding: { top: 2, right: 2, bottom: 2, left: 3 },
          fillColor: [255, 255, 255] // Explicit white background
        }, // S.No
        1: { 
          halign: 'center',
          cellPadding: { top: 2, right: 2, bottom: 2, left: 3 },
          fillColor: [255, 255, 255] // Explicit white background
        },   // Client Name
        2: { 
          halign: 'center',
          cellPadding: { top: 2, right: 2, bottom: 2, left: 3 },
          fillColor: [255, 255, 255] // Explicit white background
        },   // Address
        3: { 
          halign: 'center',
          cellPadding: { top: 2, right: 2, bottom: 2, left: 3 },
          fillColor: [255, 255, 255] // Explicit white background
        }, // User Name
        4: { 
          halign: 'center',
          cellPadding: { top: 2, right: 2, bottom: 2, left: 3 },
          fillColor: [255, 255, 255] // Explicit white background
        },   // Notification Type
        5: { 
          halign: 'center',
          cellPadding: { top: 2, right: 2, bottom: 2, left: 3 },
          fillColor: [255, 255, 255] // Explicit white background
        },   // Message
        6: { 
          halign: 'center',
          cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
          fillColor: [255, 255, 255] // Explicit white background
        }, // Date
        7: { 
          halign: 'center',
          cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
          fillColor: [255, 255, 255] // Explicit white background
        }  // Time
      },
      margin: { left: 2.5, right: 2.5, top: 0, bottom: 0 }, // Match 0.1in margins
      tableLineWidth: 0.5, // Thinner border for outer table border
      tableLineColor: [0, 0, 0], // Black color for outer table border
      theme: 'grid' // Ensure all borders are visible
    });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const finalFilename = `${filename}_${timestamp}.pdf`;

    // Save file
    doc.save(finalFilename);

    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to format date and time for export
const formatDateTimeForExport = (dateTimeString: string): string => {
  try {
    if (!dateTimeString) return '-';
    
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return dateTimeString;
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting date/time:', error);
    return dateTimeString || '-';
  }
};

// Helper function to truncate text for PDF display
const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Export both functions as default
export default {
  exportNotificationToExcel,
  exportNotificationToPDF
};

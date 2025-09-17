import * as ExcelJS from 'exceljs';
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

export const exportNotificationToExcel = async (data: NotificationData[], filename: string = 'notifications') => {
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
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Notifications');

    // Calculate dynamic column widths based on content length
    const calculateColumnWidths = () => {
      if (!excelData || excelData.length === 0) {
        return [5]; // Just empty first column if no data
      }
      
      const headers = Object.keys(excelData[0]);
      const columnWidths = [5]; // Empty first column (small width)
      
      headers.forEach((header, colIndex) => {
        let maxLength = header.length; // Start with header length
        
        // Check all data rows for this column
        excelData.forEach(row => {
          const values = Object.values(row);
          const cellValue = String(values[colIndex] || '');
          
          // Handle multi-line content (like addresses) by finding the longest line
          const lines = cellValue.split('\n');
          const longestLine = lines.reduce((max, line) => 
            line.length > max.length ? line : max, ''
          );
          
          maxLength = Math.max(maxLength, longestLine.length);
        });
        
        // More generous padding and better limits for full content visibility
        const minWidth = 12; // Increased minimum width
        const maxWidth = 80; // Increased maximum width for better readability
        
        // Add more padding (5 characters) to ensure content is fully visible
        // Also multiply by 1.2 to account for font width variations
        const calculatedWidth = Math.min(
          Math.max(Math.ceil(maxLength * 1.2) + 5, minWidth), 
          maxWidth
        );
        
        columnWidths.push(calculatedWidth);
      });
      
      return columnWidths;
    };

    // Set column widths
    const columnWidths = calculateColumnWidths();
    columnWidths.forEach((width, index) => {
      const column = worksheet.getColumn(index + 1);
      column.width = width;
    });

    // Add title in B2 (row 2, column 2)
    const titleCell = worksheet.getCell('B2');
    titleCell.value = 'Notifications';
    titleCell.font = {
      name: 'Arial',
      size: 18,
      bold: true,
      italic: true,
      color: { argb: 'FF000000' }
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFFFF' }
    };
    titleCell.alignment = {
      horizontal: 'left',
      vertical: 'middle'
    };

    // Merge title cell across all data columns
    const headers = Object.keys(excelData[0] || {});
    const lastColumn = String.fromCharCode(66 + headers.length - 1); // B + number of headers
    worksheet.mergeCells(`B2:${lastColumn}2`);

    // First, remove all default borders from the entire worksheet
    // This ensures no cell shows any border unless explicitly set
    const maxRow = Math.max(100, excelData.length + 10); // Ensure we cover enough area
    const maxCol = headers.length + 10;
    
    for (let row = 1; row <= maxRow; row++) {
      for (let col = 1; col <= maxCol; col++) {
        const cell = worksheet.getCell(row, col);
        // cell.border = {
        //   top: { style: 'none' },
        //   bottom: { style: 'none' },
        //   left: { style: 'none' },
        //   right: { style: 'none' }
        // };
      }
    }

    // Add headers in row 3 starting from column B
    if (headers.length > 0) {
      headers.forEach((header, index) => {
        const cell = worksheet.getCell(3, index + 2); // Row 3, column B onwards
        cell.value = header;
        cell.font = {
          name: 'Arial',
          size: 15,
          bold: true,
          color: { argb: 'FF000000' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' }
        };
        cell.alignment = {
          horizontal: 'left',
          vertical: 'middle'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
    }

    // Add data starting from row 4, column B
    excelData.forEach((row, rowIndex) => {
      const values = Object.values(row);
      values.forEach((value, colIndex) => {
        const cell = worksheet.getCell(rowIndex + 4, colIndex + 2); // Row 4+, column B onwards
        cell.value = value;
        cell.font = {
          name: 'Arial',
          size: 12,
          color: { argb: 'FF000000' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' }
        };
        cell.alignment = {
          horizontal: 'left',
          vertical: 'middle'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        
        // Ensure all cells are formatted as text
        cell.numFmt = '@';
      });
    });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const finalFilename = `${filename}_${timestamp}.xlsx`;

    // Write file
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Create blob and download (for browser environment)
    if (typeof window !== 'undefined') {
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }

    return { success: true, filename: finalFilename, buffer };
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

    // Generate table - with smaller font sizes for better fit
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 20,
      styles: {
        fontSize: 10, // Reduced from 15 to 10
        cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 }, // Slightly reduced padding
        overflow: 'linebreak',
        halign: 'left',
        lineWidth: 0.5, // Thinner border for table cells
        lineColor: [0, 0, 0], // Black color for cell borders
        minCellHeight: 4, // Reduced from 5.5 to 4
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
        minCellHeight: 4.5, // Reduced from 5.5 to 4.5
        fontSize: 11, // Reduced from 15 to 11 (slightly larger than data for hierarchy)
        font: 'helvetica' // Match summary font
      },
      columnStyles: {
        0: { 
          halign: 'left', 
          fontStyle: 'bold',
          cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
          fillColor: [255, 255, 255] // Explicit white background
        }, // S.No
        1: { 
          halign: 'left',
          cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
          fillColor: [255, 255, 255] // Explicit white background
        },   // Client Name
        2: { 
          halign: 'left',
          cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
          fillColor: [255, 255, 255] // Explicit white background
        },   // Address
        3: { 
          halign: 'left',
          cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
          fillColor: [255, 255, 255] // Explicit white background
        }, // User Name
        4: { 
          halign: 'left',
          cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
          fillColor: [255, 255, 255] // Explicit white background
        },   // Notification Type
        5: { 
          halign: 'left',
          cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
          fillColor: [255, 255, 255] // Explicit white background
        },   // Message
        6: { 
          halign: 'left',
          cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
          fillColor: [255, 255, 255] // Explicit white background
        }, // Date
        7: { 
          halign: 'left',
          cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
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
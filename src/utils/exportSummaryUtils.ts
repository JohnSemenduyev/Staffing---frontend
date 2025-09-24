import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface SummaryData {
  guardFirst: { name: string };
  guardLast: { name: string };
  date: string;
  Client: { name: string; lastName: string };
  address: { address: string; city: string; state: string; pincode: string };
  time: number;
  [key: string]: any;
}

export const exportSummaryToExcel = async (data: SummaryData[], filename: string = 'time_summary') => {
  try {
    // Transform data for Excel export
    const excelData = data.map((row, index) => ({
      'S.No': index + 1,
      'First Name': row.guardFirst?.name || '-',
      'Last Name': row.guardLast?.name || '-',
      'Date': row.date ? formatDateForExport(row.date) : '-',
      'Client Name': row.Client ? `${row.Client.name || ''} ${row.Client.lastName || ''}`.trim() : '-',
      'Client Location': row.address ? 
        `${row.address.address || ''}, ${row.address.city || ''}, ${row.address.state || ''} ${row.address.pincode || ''}`.trim() : '-',
      'Hours': row.time || 0
    }));

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Time Summary');

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

    // Remove all default borders from the entire worksheet
    const maxRow = Math.max(100, excelData.length + 10);
    const headers = Object.keys(excelData[0] || {});
    const maxCol = headers.length + 10;
    
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.style = {}; // resets font, fill, alignment, border etc.
      });
    });

    // Add title in B2 (row 2, column 2)
    const titleCell = worksheet.getCell('B2');
    titleCell.value = 'View Time Summary';
    titleCell.font = {
      name: 'Aptos Narrow',
      size: 14,
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
      vertical: 'middle',
      indent: 1
    };
    // Add dashed border around title
    titleCell.border = {
      bottom: { style: 'thin' }
    };

    // Merge title cell across all data columns
    const lastColumn = String.fromCharCode(66 + headers.length - 1); // B + number of headers
    worksheet.mergeCells(`B2:${lastColumn}2`);

    // Set row height for title row to reduce vertical spacing
    worksheet.getRow(2).height = 18;

    // Add headers in row 3 starting from column B
    if (headers.length > 0) {
      headers.forEach((header, index) => {
        const cell = worksheet.getCell(3, index + 2); // Row 3, column B onwards
        cell.value = header;
        cell.font = {
          name: 'Aptos Narrow',
          size: 11,
          bold: true,
          color: { argb: 'FF000000' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0F0' } // Light gray background
        };
        cell.alignment = {
          horizontal: 'left',
          vertical: 'middle',
          indent: 1
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
    }

    // Set row height for header row
    worksheet.getRow(3).height = 15;

    // Add data starting from row 4, column B
    excelData.forEach((row, rowIndex) => {
      const values = Object.values(row);
      values.forEach((value, colIndex) => {
        const cell = worksheet.getCell(rowIndex + 4, colIndex + 2); // Row 4+, column B onwards
        cell.value = value;
        cell.font = {
          name: 'Aptos Narrow',
          size: 11,
          color: { argb: 'FF000000' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' }
        };
        cell.alignment = {
          horizontal: 'left',
          vertical: 'middle',
          indent: 1
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

export const exportSummaryToPDF = (data: SummaryData[], filename: string = 'time_summary') => {
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Add title - matching summary styling with italic
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bolditalic'); // Note: jsPDF doesn't support Aptos Narrow, using helvetica
    doc.text('View Time Summary', 1, 5); // Minimal top spacing
    
    // Prepare table data
    const tableData = data.map((row, index) => [
      index + 1,
      row.guardFirst?.name || '-',
      row.guardLast?.name || '-',
      row.date ? formatDateForExport(row.date) : '-',
      row.Client ? `${row.Client.name || ''} ${row.Client.lastName || ''}`.trim() : '-',
      row.address ? 
        `${row.address.address || ''}, ${row.address.city || ''}, ${row.address.state || ''} ${row.address.pincode || ''}`.trim() : '-',
      row.time || 0
    ]);

    // Table headers
    const headers = [
      'S.No',
      'First Name',
      'Last Name', 
      'Date',
      'Client Name',
      'Location',
      'Hours'
    ];

    // Generate table - with smaller font sizes for better fit
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 8,
      styles: {
        fontSize: 11,
        cellPadding: { top: 1, right: 2, bottom: 1, left: 4 },
        overflow: 'linebreak',
        halign: 'left',
        lineWidth: 0.3,
        lineColor: [0, 0, 0],
        minCellHeight: 3,
        font: 'helvetica', // Note: jsPDF doesn't support Aptos Narrow, using helvetica
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255] //
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255]
      },
      headStyles: {
        fillColor: [240, 240, 240], // Light gray background
        textColor: [0, 0, 0], // Black text
        fontStyle: 'bold',
        lineWidth: 0.3,
        lineColor: [0, 0, 0],
        minCellHeight: 3.5,
        fontSize: 11,
        font: 'helvetica', // Note: jsPDF doesn't support Aptos Narrow, using helvetica
        cellPadding: { top: 1, right: 2, bottom: 1, left: 2 }
      },
      columnStyles: {
        0: { 
          halign: 'left', 
          fontStyle: 'bold',
          cellPadding: { top: 1, right: 2, bottom: 1, left: 2 },
          fillColor: [255, 255, 255]
        },
        1: { 
          halign: 'left',
          cellPadding: { top: 1, right: 2, bottom: 1, left: 2 },
          fillColor: [255, 255, 255]
        },
        2: { 
          halign: 'left',
          cellPadding: { top: 1, right: 2, bottom: 1, left: 2 },
          fillColor: [255, 255, 255]
        },
        3: { 
          halign: 'left',
          cellPadding: { top: 1, right: 2, bottom: 1, left: 2 },
          fillColor: [255, 255, 255]
        },
        4: { 
          halign: 'left',
          cellPadding: { top: 1, right: 2, bottom: 1, left: 2 },
          fillColor: [255, 255, 255]
        },
        5: { 
          halign: 'left',
          cellPadding: { top: 1, right: 2, bottom: 1, left: 2 },
          fillColor: [255, 255, 255]
        },
        6: { 
          halign: 'left',
          cellPadding: { top: 1, right: 2, bottom: 1, left: 2 },
          fillColor: [255, 255, 255]
        }
      },
      margin: { left: 1, right: 1, top: 2, bottom: 0 },
      tableLineWidth: 0.3,
      tableLineColor: [0, 0, 0],
      theme: 'grid'
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

// Helper function to format date for export
const formatDateForExport = (date: Date | string): string => {
  try {
    if (typeof date === 'string') {
      // Handle different date formats
      if (!date || date.trim() === '') {
        return '-';
      }
      
      // If it's already in YYYY-MM-DD format, convert to MM-DD-YYYY
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-');
        return `${month}-${day}-${year}`;
      }
      
      // If it's already in MM-DD-YYYY format, return as is
      if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
        return date;
      }
      
      // If it has timezone info (like "2024-01-15T00:00:00.000Z"), extract date part and convert
      if (date.includes('T')) {
        const datePart = date.split('T')[0];
        const [year, month, day] = datePart.split('-');
        return `${month}-${day}-${year}`;
      }
      
      // Try to parse as a regular date string
      try {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          console.warn('Invalid date format:', date);
          return '-';
        }
        // Convert to MM-DD-YYYY format
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');
        const year = parsedDate.getFullYear();
        return `${month}-${day}-${year}`;
      } catch (error) {
        console.warn('Error parsing date:', date, error);
        return '-';
      }
    }
    
    // If it's already a Date object
    if (date instanceof Date) {
      // Convert to MM-DD-YYYY format
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}-${day}-${year}`;
    }
    
    return '-';
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

// Export both functions as default
export default {
  exportSummaryToExcel,
  exportSummaryToPDF
};
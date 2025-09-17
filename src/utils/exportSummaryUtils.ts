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
      name: 'Arial',
      size: 16.2, // 10% smaller than 18
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
    // Remove borders from title cell
    titleCell.border = undefined;

    // Merge title cell across all data columns
    const lastColumn = String.fromCharCode(66 + headers.length - 1); // B + number of headers
    worksheet.mergeCells(`B2:${lastColumn}2`);

    // Add headers in row 3 starting from column B
    if (headers.length > 0) {
      headers.forEach((header, index) => {
        const cell = worksheet.getCell(3, index + 2); // Row 3, column B onwards
        cell.value = header;
        cell.font = {
          name: 'Arial',
          size: 10.8, // 10% smaller than 12
          bold: true,
          color: { argb: 'FFFFFFFF' } // White text for contrast
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF004175' } // Header color #004175
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
          size: 10.8, // 10% smaller than 12 - match notifications
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

export const exportSummaryToPDF = (data: SummaryData[], filename: string = 'time_summary') => {
  try {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Add title - matching summary styling with italic (10% smaller)
    doc.setFontSize(16.2); // 10% smaller than 18
    doc.setFont('helvetica', 'bolditalic');
    doc.text('View Time Summary', 5, 15); // Reduced margin to match 0.1in

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
      startY: 20,
      styles: {
        fontSize: 9, // 10% smaller than 10
        cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
        overflow: 'linebreak',
        halign: 'left',
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
        minCellHeight: 4,
        font: 'helvetica',
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255]
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255]
      },
      headStyles: {
        fillColor: [0, 65, 117], // #004175 in RGB
        textColor: [255, 255, 255], // White text for contrast
        fontStyle: 'bold',
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
        minCellHeight: 4.5,
        fontSize: 9.9, // 10% smaller than 11
        font: 'helvetica'
      },
      columnStyles: {
        0: { 
          halign: 'left', 
          fontStyle: 'bold',
          cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
          fillColor: [255, 255, 255]
        },
        1: { 
          halign: 'left',
          cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
          fillColor: [255, 255, 255]
        },
        2: { 
          halign: 'left',
          cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
          fillColor: [255, 255, 255]
        },
        3: { 
          halign: 'left',
          cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
          fillColor: [255, 255, 255]
        },
        4: { 
          halign: 'left',
          cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
          fillColor: [255, 255, 255]
        },
        5: { 
          halign: 'left',
          cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
          fillColor: [255, 255, 255]
        },
        6: { 
          halign: 'left',
          cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
          fillColor: [255, 255, 255]
        }
      },
      margin: { left: 2.5, right: 2.5, top: 0, bottom: 0 },
      tableLineWidth: 0.5,
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
const formatDateForExport = (dateString: string): string => {
  try {
    if (!dateString) return '-';
    
    // Handle different date formats
    if (dateString.includes('-')) {
      const [month, day, year] = dateString.split('-');
      return `${month}-${day}-${year}`;
    }
    
    // If it's already in a good format, return as is
    return dateString;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString || '-';
  }
};

// Export both functions as default
export default {
  exportSummaryToExcel,
  exportSummaryToPDF
};
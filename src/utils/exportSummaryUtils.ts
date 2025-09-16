import * as XLSX from 'xlsx';
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

export const exportSummaryToExcel = (data: SummaryData[], filename: string = 'time_summary') => {
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
    const workbook = XLSX.utils.book_new();
    
    // Create data structure with empty first row and column
    const titleRow = ['', 'View Time Summary']; // Empty first cell, then title
    const headerRow = ['', ...Object.keys(excelData[0] || {})]; // Empty first cell, then headers
    const dataRows = excelData.map(row => ['', ...Object.values(row)]); // Empty first cell, then data
    
    const dataWithStructure = [
      titleRow,      // Row 0: Empty first cell, then title
      headerRow,     // Row 1: Empty first cell, then headers
      ...dataRows    // Row 2+: Empty first cell, then data
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(dataWithStructure);

    // Set column widths - matching printUtils proportions
    const columnWidths = [
      { wch: 5 },   // Empty first column
      { wch: 8 },   // S.No
      { wch: 18 },  // First Name (increased to match printUtils)
      { wch: 18 },  // Last Name (increased to match printUtils)
      { wch: 12 },  // Date
      { wch: 25 },  // Client Name (increased to match printUtils)
      { wch: 35 },  // Client Location (increased to match printUtils)
      { wch: 12 }   // Hours
    ];
    worksheet['!cols'] = columnWidths;

    // Add styling to match printUtils
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Summary');

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

export const exportSummaryToPDF = (data: SummaryData[], filename: string = 'time_summary') => {
  try {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Add title - matching printUtils styling with italic
    doc.setFontSize(18);
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

    // Generate table - matching printUtils styling
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 20,
      styles: {
        fontSize: 15, // Match printUtils font size
        cellPadding: { top: 2, right: 2, bottom: 2, left: 3 }, // Match printUtils padding
        overflow: 'linebreak',
        halign: 'center',
        lineWidth: 0.5, // Thinner border for table cells
        lineColor: [0, 0, 0], // Black color for cell borders
        minCellHeight: 5.5, // Match printUtils height (22px ≈ 5.5mm)
        font: 'helvetica', // Match printUtils Arial/helvetica
        textColor: [0, 0, 0], // Black text
        fillColor: [255, 255, 255] // Pure white background for all rows
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255] // Ensure alternate rows are also white
      },
      headStyles: {
        fillColor: [255, 255, 255], // White background like printUtils
        textColor: [0, 0, 0], // Black text
        fontStyle: 'bold',
        lineWidth: 0.5, // Thinner border for table header
        lineColor: [0, 0, 0], // Black color for header borders
        minCellHeight: 5.5, // Match printUtils height
        fontSize: 15, // Match printUtils font size
        font: 'helvetica' // Match printUtils font
      },
      columnStyles: {
        0: { 
          halign: 'center', 
          fontStyle: 'bold',
          cellPadding: { top: 2, right: 2, bottom: 2, left: 3 },
          fillColor: [255, 255, 255] // Explicit white background
        }, // S.No
        1: { 
          halign: 'left',
          cellPadding: { top: 2, right: 2, bottom: 2, left: 3 },
          fillColor: [255, 255, 255] // Explicit white background
        },   // First Name
        2: { 
          halign: 'left',
          cellPadding: { top: 2, right: 2, bottom: 2, left: 3 },
          fillColor: [255, 255, 255] // Explicit white background
        },   // Last Name
        3: { 
          halign: 'center',
          cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
          fillColor: [255, 255, 255] // Explicit white background
        }, // Date
        4: { 
          halign: 'left',
          cellPadding: { top: 2, right: 2, bottom: 2, left: 3 },
          fillColor: [255, 255, 255] // Explicit white background
        },   // Client Name
        5: { 
          halign: 'left',
          cellPadding: { top: 2, right: 2, bottom: 2, left: 3 },
          fillColor: [255, 255, 255] // Explicit white background
        },   // Location
        6: { 
          halign: 'center',
          cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
          fillColor: [255, 255, 255] // Explicit white background
        }  // Hours
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

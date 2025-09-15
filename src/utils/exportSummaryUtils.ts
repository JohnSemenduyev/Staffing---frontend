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
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 8 },   // S.No
      { wch: 15 },  // First Name
      { wch: 15 },  // Last Name
      { wch: 12 },  // Date
      { wch: 20 },  // Client Name
      { wch: 30 },  // Client Location
      { wch: 12 }   // Hours
    ];
    worksheet['!cols'] = columnWidths;

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
    
    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('View Time Summary', 14, 20);

    // Prepare table data
    const tableData = data.map((row, index) => [
      index + 1,
      row.guardFirst?.name || '-',
      row.guardLast?.name || '-',
      row.date ? formatDateForExport(row.date) : '-',
      row.Client ? `${row.Client.name || ''} ${row.Client.lastName || ''}`.trim() : '-',
      row.address ? 
        `${row.address.address || ''}, ${row.address.city || ''}, ${row.address.state || ''}`.trim() : '-',
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

    // Generate table
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 25,
      styles: {
        fontSize: 9,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'center',
        lineWidth: 1, // 1px border for table cells
        lineColor: [0, 0, 0], // Black color for cell borders
        minCellHeight: 5 // Minimum line height
      },
      headStyles: {
        fillColor: [0, 65, 117], // #5D6469FF
        textColor: 255,
        fontStyle: 'bold',
        lineWidth: 1, // 1px border for table header
        lineColor: [0, 0, 0], // Black color for header borders
        minCellHeight: 5 // Minimum line height for header
      },
      columnStyles: {
        0: { 
          halign: 'center', 
          fontStyle: 'bold' // Make Sr. No. bold
        }, // S.No
        1: { halign: 'left' },   // First Name
        2: { halign: 'left' },   // Last Name
        3: { halign: 'center' }, // Date
        4: { halign: 'left' },   // Client Name
        5: { halign: 'left' },   // Location
        6: { halign: 'center' }  // Hours
      },
      margin: { left: 14, right: 14 },
      tableLineWidth: 1, // 1px border for outer table border
      tableLineColor: [0, 0, 0] // Black color for outer table border
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

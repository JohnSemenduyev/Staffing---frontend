import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
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
    
    // Add title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Notifications Report', 14, 15);

    // Add date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 25);

    // Prepare table data
    const tableData = data.map((row, index) => [
      index + 1,
      row.client?.name || '-',
      row.address ? 
        `${row.address.address || ''}, ${row.address.city || ''}, ${row.address.state || ''}`.trim() : '-',
      row.guardFirst && row.guardLast ? 
        `${row.guardFirst.name || ''} ${row.guardLast.name || ''}`.trim() : '-',
      row.notificationType || '-',
      row.message ? truncateText(row.message, 50) : '-',
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

    // Generate table
    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 35,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'center'
      },
      headStyles: {
        fillColor: [0, 65, 117], // #004175
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 }, // S.No
        1: { halign: 'left', cellWidth: 25 },   // Client Name
        2: { halign: 'left', cellWidth: 40 },   // Address
        3: { halign: 'left', cellWidth: 25 },   // User Name
        4: { halign: 'center', cellWidth: 20 }, // Notification Type
        5: { halign: 'left', cellWidth: 50 },   // Message
        6: { halign: 'center', cellWidth: 15 }, // Date
        7: { halign: 'center', cellWidth: 12 }  // Time
      },
      margin: { left: 14, right: 14 }
    });

    // Add summary statistics
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary Statistics:', 14, finalY);

    const totalRecords = data.length;
    const notificationTypes = data.reduce((acc, row) => {
      const type = row.notificationType || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    doc.setFont('helvetica', 'normal');
    doc.text(`Total Notifications: ${totalRecords}`, 14, finalY + 8);
    
    let yOffset = finalY + 16;
    doc.text('Notification Types:', 14, yOffset);
    yOffset += 8;
    
    Object.entries(notificationTypes).forEach(([type, count]) => {
      doc.text(`  • ${type}: ${count}`, 14, yOffset);
      yOffset += 6;
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

// // Example usage of Excel utilities for refactoring existing code

// import { 
//   ScheduleExcelGenerator, 
//   ActualTimeExcelGenerator,
//   SummaryExcelGenerator,
//   generateExcelFile 
// } from './excelGenerators';
// import { 
//   formatScheduleDataForExcel,
//   formatActualTimeDataForExcel,
//   formatSummaryDataForExcel,
//   calculateWorkedTimeForExcel,
//   generateWeekHeaders,
//   generateExcelData
// } from './excelFormatters';
// import { ExcelData, ExcelExportOptions } from './excelTypes';

// /**
//  * Example: How to refactor ViewSchedule.tsx Excel functions
//  */

// // OLD CODE (to be replaced):
// /*
// const handleScheduleDownloadExcel = async () => {
//   try {
//     const excelData = generateScheduleExcelData();
//     if (!excelData || excelData.length === 0) throw new Error("No data");

//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet("Schedule Report");

//     worksheet.addRows(excelData);

//     // Style first row
//     const headerRow = worksheet.getRow(1);
//     headerRow.eachCell((cell) => {
//       cell.fill = {
//         type: "pattern",
//         pattern: "solid",
//         fgColor: { argb: "1E90FF" }, // Blue
//       };
//       cell.font = { color: { argb: "FFFFFF" }, bold: true };
//       cell.alignment = { horizontal: "center", vertical: "middle" };
//     });

//     const buffer = await workbook.xlsx.writeBuffer();
//     const blob = new Blob([buffer], {
//       type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//     });

//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `Schedule_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
//     document.body.appendChild(a);
//     a.click();
//     a.remove();
//     URL.revokeObjectURL(url);

//     toast({ title: "Success", description: "Schedule Excel exported!" });
//   } catch (err) {
//     console.error(err);
//     toast({ title: "Error", description: "Export failed", variant: "destructive" });
//   }
// };
// */

// // NEW CODE (using utilities):
// export const handleScheduleDownloadExcelRefactored = async (
//   scheduleData: any[],
//   toast: any
// ) => {
//   try {
//     const generator = new ScheduleExcelGenerator();
//     await generator.generateScheduleReport(scheduleData);
//     toast({ title: "Success", description: "Schedule Excel exported!" });
//   } catch (error) {
//     console.error('Error exporting schedule Excel:', error);
//     toast({ title: "Error", description: "Export failed", variant: "destructive" });
//   }
// };
// /**
//  * Example: How to refactor Actual Time Excel function
//  */
// export const handleActualTimeDownloadExcelRefactored = async (
//   sessionData: any[],
//   scheduleData: any[],
//   currentWeekRange: any,
//   toast: any
// ) => {
//   try {
//     const generator = new ActualTimeExcelGenerator();
//     await generator.generateActualTimeReport(sessionData, scheduleData, currentWeekRange);
//     toast({ title: "Success", description: "Actual Time Excel report exported successfully!" });
//   } catch (error) {
//     console.error('Error exporting Actual Time Excel:', error);
//     toast({ title: "Error", description: "Failed to export Actual Time Excel report" });
//   }
// };
// // Alternative approach using the utility function:
// export const handleScheduleDownloadExcelSimple = async (
//   scheduleData: any[],
//   toast: any
// ) => {
//   try {
//     const excelData: ExcelData = {
//       headers: ['Employee', 'Date', 'Clock In', 'Clock Out', 'Worked Time', 'Total Hours'],
//       rows: scheduleData.map(item => [
//         item.userName || '',
//         item.date || '',
//         item.clockIn || '',
//         item.clockOut || '',
//         item.workedTime || 0,
//         item.totalHours || 0
//       ]),
//       fileName: 'Schedule_Report',
//       worksheetName: 'Schedule Report'
//     };

//     await generateExcelFile(excelData, {
//       includeTimestamp: true
//     });

//     toast({ title: "Success", description: "Schedule Excel exported!" });
//   } catch (error) {
//     console.error('Error exporting schedule Excel:', error);
//     toast({ title: "Error", description: "Export failed", variant: "destructive" });
//   }
// };



// /**
//  * Example: How to refactor Summary.tsx Excel function
//  */
// export const handleSummaryDownloadExcelRefactored = async (
//   summaryData: any[],
//   toast: any
// ) => {
//   try {
//     const generator = new SummaryExcelGenerator();
//     await generator.generateSummaryReport(summaryData);
//     toast.success("Excel downloaded!");
//   } catch (error) {
//     console.error('Error downloading Excel:', error);
//     toast.error("Failed to download Excel");
//   }
// };

// // Alternative approach for Summary:a
// export const handleSummaryDownloadExcelSimple = async (
//   summaryData: any[],
//   toast: any
// ) => {
//   try {
//     const formattedData = summaryData.map((item) => ({
//       "First Name": item.guardFirst?.name || '',
//       "Last Name": item.guardLast?.name || '',
//       "Date": item.date || '',
//       "Client Name": item.Client?.name || '',
//       "Location": item.address?.address || '',
//       "Hours": item.time || 0,
//     }));

//     const excelData: ExcelData = {
//       headers: ['First Name', 'Last Name', 'Date', 'Client Name', 'Location', 'Hours'],
//       rows: formattedData.map(item => [
//         item['First Name'],
//         item['Last Name'],
//         item['Date'],
//         item['Client Name'],
//         item['Location'],
//         item['Hours']
//       ]),
//       fileName: 'SummaryReport',
//       worksheetName: 'Summary'
//     };

//     await generateExcelFile(excelData, {
//       includeTimestamp: false
//     });

//     toast.success("Excel downloaded!");
//   } catch (error) {
//     console.error('Error downloading Excel:', error);
//     toast.error("Failed to download Excel");
//   }
// };

// /**
//  * Example: Using the generateExcelData helper function
//  */
// export const handleCustomExcelExport = async (
//   data: any[],
//   toast: any
// ) => {
//   try {
//     const excelData = generateExcelData(
//       data,
//       ['Name', 'Email', 'Phone', 'Status'],
//       [
//         (item) => item.name,
//         (item) => item.email,
//         (item) => item.phone,
//         (item) => item.status
//       ],
//       'Custom Report',
//       'Custom_Report'
//     );

//     await generateExcelFile(excelData, {
//       includeTimestamp: true,
//       customStyles: {
//         headerStyle: {
//           fill: {
//             type: 'pattern',
//             pattern: 'solid',
//             fgColor: { argb: 'FF6B6B' } // Red header
//           },
//           font: {
//             color: { argb: 'FFFFFF' },
//             bold: true
//           }
//         }
//       }
//     });

//     toast.success("Custom Excel report exported!");
//   } catch (error) {
//     console.error('Error exporting custom Excel:', error);
//     toast.error("Failed to export custom Excel report");
//   }
// };

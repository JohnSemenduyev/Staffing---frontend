// import React, { useRef, useState } from "react";
// import { Eye, Plus, Trash2, Printer, Share2 } from "lucide-react";
// import { useSearchClient } from "../../hooks/usesearchClient";
// import { useDebounce } from "../../hooks/useDebounce";
// import { useSearchUsers } from "../../hooks/useSearchUser";
// import { GenericTable,TableAction,TableColumn } from "../../components/GenericTable";
// import { toast } from "sonner";
// import * as XLSX from "xlsx";
// export const Summary = () => {
//   const [form, setForm] = useState({
//     clientId: "",
//     addressId: "",
//     date: "",
//   });
//   const data=[
//     {
//       guardFirst: { name: "John" },
//       guardLast: { name: "Doe" },
//       date: "2023-10-01",
//       Client: { name: "Client A" },
//       address: { address: "123 Main St" },
//       time: 120,
//     },
//     {
//       guardFirst: { name: "Jane" },
//       guardLast: { name: "Smith" },
//       date: "2023-10-02",
//       Client: { name: "Client B" },
//       address: { address: "456 Elm St" },
//       time: 90,
//     }
//   ]

//   const [errors, setErrors] = useState<{ [key: string]: string }>({});
//   const [clientSearch, setClientSearch] = useState("");
//   const debouncedClientSearch = useDebounce(clientSearch, 300);
//   const [showClientDropdown, setShowClientDropdown] = useState(false);
//   const [selectedAddressText, setSelectedAddressText] = useState("");
//   const [submitLoader, setSubmitLoader] = useState(false);
//   const [auto, setAuto] = useState(false);
//   const[loading, setLoading] = useState(false);
//   const { data: searchedClients = [], isLoading: loadingClients } =
//     useSearchClient(debouncedClientSearch);
//   const [userSearch, setUserSearch] = useState("");
//   const debouncedUserSearch = useDebounce(userSearch, 300);
//   const { data: searchedUsers = [], isLoading: loadingUsers } =
//     useSearchUsers(debouncedUserSearch);
//   const [showUserDropdown, setShowUserDropdown] = useState(false);
// const tableRef = useRef<HTMLDivElement>(null);
//   const fieldInputClasses =
//     "w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition";

//   const validate = () => {
//     const e: any = {};
//     if (!form.clientId) e.clientId = "Required";
//     if (!form.addressId) e.addressId = "Required";
//     if (!form.date) e.date = "Required";
//     setErrors(e);
//     return Object.keys(e).length === 0;
//   };

//   const handleChange = (field: string, value: any) => {
//     setForm((f) => ({
//       ...f,
//       [field]: value,
//     }));
//     setErrors((e) => ({ ...e, [field]: undefined }));
//   };

//   const handleClientSelect = (
//     client: { id: string | number; name: string },
//     addressId: number | string
//   ) => {
//     setForm((f) => ({
//       ...f,
//       clientId: String(client.id),
//       addressId: String(addressId),
//     }));
//     setClientSearch(client.name);
//     setShowClientDropdown(false);
//     setErrors((e) => ({ ...e, clientId: undefined, addressId: undefined }));

//     const selectedClient = searchedClients.find(
//       (c) => String(c.id) === String(client.id)
//     );
//     const selectedAddress = selectedClient?.addresses.find(
//       (a) => String(a.id) === String(addressId)
//     );
//     setSelectedAddressText(selectedAddress?.address || "");
//   };
  
//   const handleUserSelect = (user: { id: string | number; name: string }) => {
//     setForm((f) => ({ ...f, userId: String(user.id) }));
//     setUserSearch(user.name);
//     setShowUserDropdown(false);
//     setErrors((e) => ({ ...e, userId: undefined }));
//   };
  
//   const onSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validate()) return;
//     setSubmitLoader(true);
//     console.log("Submitting form with data:", form); // Debug log
//     setSubmitLoader(false);

//     //   try {
//     //     // Ensure all numbers are converted safely, fallback to 0 if empty
//     //     const payload = {
//     //       clientId: Number(form.clientId),
//     //       addressId: Number(form.addressId),
//     //       distance: form.distance !== "" ? Number(form.distance) : 0,
//     //       actualScheduledTime: form.time !== "" ? Number(form.time) : 0,
//     //       weeklyHours: form.hours !== "" ? Number(form.hours) : 0,
//     //       reminderTime: form.reminder !== "" ? Number(form.reminder) : 0,
//     //       overlap: overlap,
//     //       unscheduledTime: unscheduledTime,
//     //     };

//     //     console.log("Submitting payload:", payload); // Debug log

//     //     await createTimeSetup(payload);

//     //     // Reset form
//     //     setForm({
//     //       clientId: "",
//     //       addressId: "",
//     //       distance: "",
//     //       time: "",
//     //       hours: "",
//     //       reminder: "",
//     //     });
//     //     setClientSearch("");
//     //     setSelectedAddressText("");
//     //     setOverlap(false);
//     //     setUnscheduledTime(false);
//     //     alert("Time setup created successfully!");
//     //   } catch (error) {
//     //     console.error("Error creating time setup:", error);
//     //     alert("Failed to create time setup.");
//     //   } finally {
//     //     setSubmitLoader(false);
//     //   }
//   };

//      const generateExcelFile = () => {
//     const formattedData = data.map((item) => ({
//       "First Name": item.guardFirst.name,
//       "Last Name": item.guardLast.name,
//       "Date": item.date,
//       "Client Name": item.Client.name,
//       "Location": item.address.address,
//       "Hours (Mins)": item.time,
//     }));

//     const worksheet = XLSX.utils.json_to_sheet(formattedData);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "Summary");

//     const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
//     const blob = new Blob([excelBuffer], {
//       type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//     });
//     return blob;
//   };

//   const handleDownloadExcel = () => {
//     const blob = generateExcelFile();
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = "SummaryReport.xlsx";
//     document.body.appendChild(a);
//     a.click();
//     a.remove();
//     URL.revokeObjectURL(url);
//     toast.success("Excel downloaded!");
//   };

//   const handlePrint = () => {
//     const content = tableRef.current?.innerHTML;
//     const printWindow = window.open("", "", "width=800,height=600");

//     if (printWindow && content) {
//       printWindow.document.write(`
//         <html>
//           <head>
//             <title>Time Summary Report</title>
//             <style>
//               body { font-family: Arial, sans-serif; padding: 20px; }
//               h1 { text-align: center; margin-bottom: 20px; }
//               table { width: 100%; border-collapse: collapse; margin-top: 10px; }
//               th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
//               th { background-color: #f2f2f2; }
//             </style>
//           </head>
//           <body>
//             <h1>Time Summary Report</h1>
//             ${content}
//           </body>
//         </html>
//       `);
//       printWindow.document.close();
//       printWindow.focus();
//       printWindow.print();
//       printWindow.close();
//     }
//   };

//   const tableColumns: TableColumn[] = [
//     {
//       key: "guardFirst.name",
//       label: "First Name",
//       sortable: true,
//       searchable: true,
//       className: "whitespace-nowrap max-w-[200px]"
//     },
//     {
//       key: "guardLast.name",
//       label: "Last Name",
//       sortable: true,
//       searchable: true,
//       className: "whitespace-nowrap max-w-[200px]"
//     },
//     {
//       key: "date",
//       label: "Date",
//       sortable: true,
//       searchable: true,
//       className: "whitespace-nowrap max-w-[200px]",
//       render: (value: any) => `${value} Mins`
//     },
//     {
//       key: "Client.name",
//       label: "Client Name",
//       sortable: true,
//       searchable: true,
//       className: "whitespace-nowrap max-w-[200px]"
//     },
//     {
//       key: "address.address",
//       label: "Client Location",
//       sortable: true,
//       searchable: true,
//       className: "break-words max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]",
//       render: (value: string) => <div className="truncate" title={value}>{value || "-"}</div>
//     },
//     {
//       key: "time",
//       label: "Hours",
//       sortable: true,
//       searchable: true,
//       className: "whitespace-nowrap max-w-[200px]",
//       render: (value: any) => `${value} Mins`
//     }
//   ]; 
  
//   return (
//     <div className="w-full overflow-x-hidden px-2 sm:px-4 md:px-6 pt-10">
//         <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 mb-2">
//           <h2 className="text-xl font-semibold mb-2">
//            View Time Summary</h2>
//         <form onSubmit={onSubmit} autoComplete="off">
//           <div className="grid grid-cols-4 gap-4 items-start">
//             {/* Client Search Field */}
//             <div className="relative">
//               <input
//                 type="text"
//                 value={clientSearch}
//                 onFocus={() => setShowClientDropdown(true)}
//                 onBlur={() =>
//                   setTimeout(() => setShowClientDropdown(false), 200)
//                 }
//                 onChange={(e) => {
//                   setClientSearch(e.target.value);
//                   setForm((f) => ({ ...f, clientId: "", addressId: "" }));
//                   setSelectedAddressText("");
//                 }}
//                 placeholder="Client Name"
//                 className={fieldInputClasses}
//               />
//               {errors.clientId && (
//                 <span className="text-xs text-red-500">{errors.clientId}</span>
//               )}
//               {errors.addressId && (
//                 <span className="text-xs text-red-500 block">
//                   {errors.addressId}
//                 </span>
//               )}
//               {showClientDropdown && clientSearch.length >= 2 && (
//                 <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto z-50 font-sans">
//                   {loadingClients ? (
//                     <div className="p-2 text-sm text-gray-500">
//                       Searching clients...
//                     </div>
//                   ) : searchedClients.length === 0 ? (
//                     <div className="p-2 text-gray-500 text-sm">
//                       No clients found
//                     </div>
//                   ) : (
//                     searchedClients.flatMap((client, clientIndex) =>
//                       client.addresses.map((address, addressIndex) => {
//                         const isEven = (clientIndex + addressIndex) % 2 === 0;
//                         return (
//                           <div
//                             key={`${client.id}-${address.id}`}
//                             onMouseDown={() =>
//                               handleClientSelect(
//                                 { id: client.id, name: client.name },
//                                 address.id
//                               )
//                             }
//                             className={`p-4 cursor-pointer text-sm ${
//                               isEven ? "bg-white" : "bg-gray-50"
//                             } hover:bg-gray-100`}
//                           >
//                             <div className="font-semibold text-gray-600 text-base">
//                               {client.name}
//                             </div>
//                             <div className="text-xs text-gray-500">
//                               {address.label || address.address}
//                             </div>
//                           </div>
//                         );
//                       })
//                     )
//                   )}
//                 </div>
//               )}
//             </div>

//             {/* Address (read-only) */}
//             <div>
//               <input
//                 type="text"
//                 value={selectedAddressText}
//                 placeholder="Location"
//                 readOnly
//                 className={`${fieldInputClasses} appearance-none bg-gray-50`}
//               />
//             </div>
//             <div>
//               <input
//                 type="text"
//                 placeholder="Select date"
//                 value={form.date}
//                 onChange={(e) => handleChange("date", e.target.value)}
//                 onFocus={(e) => (e.target.type = "date")}
//                 onBlur={(e) => {
//                   if (!form.date) e.target.type = "text";
//                 }}
//                 className={`${fieldInputClasses} appearance-none`}
//               />
//               {errors.date && (
//                 <span className="text-xs text-red-500">{errors.date}</span>
//               )}
//             </div>

//             {/* Submit Button */}
//                 {/* Submit Button */}
//             <div className="flex justify-start">               
//   <button                 
//     type="submit"                 
//     disabled={submitLoader}                 
//     className="inline-flex items-center px-4 py-1 border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 disabled:cursor-not-allowed font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap pl-5 pr-5"               
//   >                 
//     {submitLoader ? (                   
//       <>                     
//         <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />                     
//         Loading...                   
//       </>                 
//     ) : (                   
//       "Run"                 
//     )}               
//   </button>             
// </div>
//           </div>
//         </form>
//       </div>
      
//       {/* Table Header with Print and Share Icons */}
//       <div className="flex justify-end items-center  mt-4 mb-2">
//         <button
//           onClick={handlePrint}
//           className="inline-flex items-center  py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
//           title="Print"
//         >
//           <Printer className="w-5 h-5" />
//         </button>
//         <button
//           onClick={handleDownloadExcel}
//           className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
//           title="Share"
//         >
//           <Share2 className="w-5 h-5" />
//         </button>
//       </div>
//       <div ref={tableRef} className="overflow-x-auto">
//       <GenericTable
//         data={data || []}
//         columns={tableColumns}
//         loading={loading}
//         emptyMessage="No records found matching your search criteria."
//         searchable={true}
//       />
//       </div>
//     </div>
//   );
// };

import React, { useEffect, useState } from "react";
import {  Printer, RotateCcw, Share2, Upload } from "lucide-react";
import { useSearchClient } from "../../hooks/usesearchClient";
import { useDebounce } from "../../hooks/useDebounce";
import { useSearchUsers } from "../../hooks/useSearchUser";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useViewTimeSummary } from "../../context/ViewTimeSummaryContext";
import { CustomDatePicker } from "../../components/CustomDatePicker";
export const Summary = () => {
  const [form, setForm] = useState({
    clientId: "",
    addressId: "",
    date: "",
  });
const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [clientSearch, setClientSearch] = useState("");
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedAddressText, setSelectedAddressText] = useState("");
  const [submitLoader, setSubmitLoader] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const { data: searchedClients = [], isLoading: loadingClients } =
    useSearchClient(debouncedClientSearch);
  const fieldInputClasses =
    "w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition";
 const { data, loading, error, fetchSummary } = useViewTimeSummary();
  const validate = () => {
    const e: any = {};
    if (!form.clientId) e.clientId = "Required";
    if (!form.addressId) e.addressId = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (field, value) => {
    setForm((f) => ({
      ...f,
      [field]: value,
    }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleClientSelect = (
    client,
    addressId
  ) => {
    setForm((f) => ({
      ...f,
      clientId: String(client.id),
      addressId: String(addressId),
    }));
    setClientSearch(client.name);
    setShowClientDropdown(false);
    setErrors((e) => ({ ...e, clientId: undefined, addressId: undefined }));

    const selectedClient = searchedClients.find(
      (c) => String(c.id) === String(client.id)
    );
    const selectedAddress = selectedClient?.addresses.find(
      (a) => String(a.id) === String(addressId)
    );
    setSelectedAddressText(selectedAddress?.address || "");
  };

  const formatDateToYYYYMMDD = (rawDate: string | Date): string => {
  const dateObj = new Date(rawDate);
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${mm}-${dd}-${yyyy}`;   // ✅ YYYY-MM-DD
};
const handleReset = () => {
    setForm({
       clientId: "",
    addressId: "",  
    date: "",
    });
    setClientSearch("");
    
    setSelectedAddressText("");
    setErrors({});
   
    setShowClientDropdown(false);
    
  };
const onSubmit = async (e) => {
  e.preventDefault();
  if (!validate()) return;

  setSubmitLoader(true);
  try {
    console.log("Submitting form with data:", form); // Debug log

    const clientId = Number(form.clientId);
    const rawDate = form.date;

    if (rawDate) {
      const formattedDate = formatDateToYYYYMMDD(rawDate);  // Format only if date exists
      console.log("Formatted Date for API:", formattedDate);
      await fetchSummary(clientId, formattedDate); // ✅ Call with date
    } else {
      console.log("No date provided, calling API without date");
      await fetchSummary(clientId); // ✅ Call without date
    }

    console.log("Time summary fetched:", data);  // Optional debug log
  } catch (err) {
    console.error("Failed to fetch time summary:", err);
  } finally {
    setSubmitLoader(false);
  }
};



  const generateExcelFile = () => {
    const formattedData = data.map((item) => ({
      "First Name": item.guardFirst.name,
      "Last Name": item.guardLast.name,
      "Date": item.date,
      "Client Name": item.Client.name,
      "Location": item.address.address,
      "Hours (Mins)": item.time,
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Summary");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    return blob;
  };

  const handleDownloadExcel = () => {
    const blob = generateExcelFile();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SummaryReport.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Excel downloaded!");
  };

  const generatePrintableTable = () => {
    if (!data || data.length === 0) {
      return `
        <div style="text-align: center; padding: 40px; color: #666; font-size: 16px;">
          <p>No data available to print</p>
          <p style="font-size: 14px; margin-top: 10px;">Please run a search to generate data first.</p>
        </div>
      `;
    }

    // Table headers
    const headers = [
      'First Name',
      'Last Name', 
      'Date',
      'Client Name',
      'Client Location',
      'Hours (Minutes)'
    ];

    const headerRow = headers.map(header => 
      `<th style="background-color: #f8f9fa; font-weight: bold; padding: 12px; text-align: left; border: 1px solid #dee2e6;">${header}</th>`
    ).join('');
    
    // Table rows from data
    const dataRows = data.map((item, index) => {
      const rowStyle = index % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f8f9fa;';
      return `
        <tr style="${rowStyle}">
          <td style="padding: 10px; border: 1px solid #dee2e6;">${item.guardFirst?.name || '-'}</td>
          <td style="padding: 10px; border: 1px solid #dee2e6;">${item.guardLast?.name || '-'}</td>
          <td style="padding: 10px; border: 1px solid #dee2e6;">${item.date || '-'}</td>
          <td style="padding: 10px; border: 1px solid #dee2e6;">${item.Client?.name || '-'}</td>
          <td style="padding: 10px; border: 1px solid #dee2e6; max-width: 200px; word-wrap: break-word;">${item.address?.address || '-'}</td>
          <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">${item.time || 0}</td>
        </tr>
      `;
    }).join('');

    // Calculate totals
    const totalHours = data.reduce((sum, item) => sum + (item.time || 0), 0);
    const totalRecords = data.length;

    return `
      <div style="margin-bottom: 20px;">
        <p style="margin: 5px 0; font-size: 14px;"><strong>Total Records:</strong> ${totalRecords}</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Total Hours:</strong> ${totalHours} minutes (${(totalHours / 60).toFixed(2)} hours)</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px;">
        <thead>
          <tr>${headerRow}</tr>
        </thead>
        <tbody>
          ${dataRows}
        </tbody>
      </table>
    `;
  };

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const tableContent = generatePrintableTable();
      const currentDate = new Date().toLocaleDateString();
      const currentTime = new Date().toLocaleTimeString();
      
      const printWindow = window.open("", "_blank", "width=900,height=700,scrollbars=yes,resizable=yes");

      if (!printWindow) {
        toast.error("Pop-up blocked! Please allow pop-ups and try again.");
        return;
      }

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Time Summary Report</title>
            <style>
              @page {
                margin: 1in;
                size: landscape;
              }
              
              * {
                box-sizing: border-box;
              }
              
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                margin: 0;
                padding: 20px;
                background: white;
                color: #333;
                line-height: 1.4;
              }
              
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #004175;
                padding-bottom: 15px;
              }
              
              .header h1 { 
                margin: 0;
                color: #004175;
                font-size: 24px;
                font-weight: bold;
              }
              
              .header .subtitle {
                margin: 5px 0 0 0;
                color: #666;
                font-size: 14px;
              }
              
              .print-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
                font-size: 12px;
                color: #666;
              }
              
              .summary-stats {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
                border-left: 4px solid #004175;
              }
              
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 10px;
                background: white;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              
              th { 
                background-color: #004175 !important;
                color: white !important;
                font-weight: bold;
                padding: 12px 8px;
                text-align: left;
                border: 1px solid #004175;
                font-size: 12px;
              }
              
              td { 
                padding: 10px 8px;
                border: 1px solid #dee2e6;
                font-size: 11px;
              }
              
              tr:nth-child(even) {
                background-color: #f8f9fa;
              }
              
              tr:hover {
                background-color: #e9ecef;
              }
              
              .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 10px;
                color: #666;
                border-top: 1px solid #dee2e6;
                padding-top: 15px;
              }
              
              .no-data {
                text-align: center;
                padding: 40px;
                color: #666;
                font-style: italic;
              }
              
              @media print {
                body { 
                  margin: 0;
                  padding: 15px;
                }
                
                .header h1 {
                  font-size: 20px;
                }
                
                table {
                  font-size: 10px;
                }
                
                th, td {
                  padding: 6px 4px;
                }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Time Summary Report</h1>
              <p class="subtitle">Generated on ${currentDate} at ${currentTime}</p>
            </div>
            
            <div class="print-info">
              <div>Report Type: Time Summary</div>
              <div>Page 1 of 1</div>
            </div>
            
            ${tableContent}
            
            <div class="footer">
              <p>This report was generated automatically from the Time Summary system.</p>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load, then focus and print
      printWindow.onload = () => {
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          // Don't close automatically - let user choose
        }, 500);
      };
      
      toast.success("Print preview opened successfully!");
      
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Error generating print preview. Please try again.");
    } finally {
      setIsPrinting(false);
    }
  };

  const tableColumns = [
    {
      key: "guardFirst.name",
      label: "First Name",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap max-w-[200px]"
    },
    {
      key: "guardLast.name",
      label: "Last Name",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap max-w-[200px]"
    },
    {
      key: "date",
      label: "Date",  
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap max-w-[200px]"
    },
    {
      key: "Client.name",
      label: "Client Name",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap max-w-[200px]"
    },
    {
      key: "address.address",
      label: "Client Location",
      sortable: true,
      searchable: true,
      className: "break-words max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]",
      render: (value) => <div className="truncate" title={value}>{value || "-"}</div>
    },
    {
      key: "time",
      label: "Hours",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap max-w-[200px]",
      render: (value) => `${value} Mins`
    }
  ];
  
  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 md:px-6 pt-10">
      <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 mb-2">
        <h2 className="text-xl font-semibold mb-2">
          View Time Summary
        </h2>
        <form onSubmit={onSubmit} autoComplete="off">
          <div className="grid grid-cols-4 gap-4 items-start">
            {/* Client Search Field */}
            <div className="relative">
              <input
                type="text"
                value={clientSearch}
                onFocus={() => setShowClientDropdown(true)}
                onBlur={() =>
                  setTimeout(() => setShowClientDropdown(false), 200)
                }
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setForm((f) => ({ ...f, clientId: "", addressId: "" }));
                  setSelectedAddressText("");
                }}
                placeholder="Client Name"
                className={fieldInputClasses}
              />
              {errors.clientId && (
                <span className="text-xs text-red-500">{errors.clientId}</span>
              )}
              {errors.addressId && (
                <span className="text-xs text-red-500 block">
                  {errors.addressId}
                </span>
              )}
              {showClientDropdown && clientSearch.length >= 2 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto z-50 font-sans">
                  {loadingClients ? (
                    <div className="p-2 text-sm text-gray-500">
                      Searching clients...
                    </div>
                  ) : searchedClients.length === 0 ? (
                    <div className="p-2 text-gray-500 text-sm">
                      No clients found
                    </div>
                  ) : (
                    searchedClients.flatMap((client, clientIndex) =>
                      client.addresses.map((address, addressIndex) => {
                        const isEven = (clientIndex + addressIndex) % 2 === 0;
                        return (
                          <div
                            key={`${client.id}-${address.id}`}
                            onMouseDown={() =>
                              handleClientSelect(
                                { id: client.id, name: client.name },
                                address.id
                              )
                            }
                            className={`p-4 cursor-pointer text-sm ${
                              isEven ? "bg-white" : "bg-gray-50"
                            } hover:bg-gray-100`}
                          >
                            <div className="font-semibold text-gray-600 text-base">
                              {client.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {address.label || address.address}
                            </div>
                          </div>
                        );
                      })
                    )
                  )}
                </div>
              )}
            </div>

            {/* Address (read-only) */}
            <div>
              <input
                type="text"
                value={selectedAddressText}
                placeholder="Location"
                readOnly
                className={`${fieldInputClasses} appearance-none bg-gray-50`}
              />
            </div>
            
            <div>
              <CustomDatePicker
                value={form.date}
                onChange={handleChange}
                placeholder="Select date"
                fieldName="date"
                className={`${fieldInputClasses} appearance-none`}
              />
              {errors.date && (
                <span className="text-xs text-red-500">{errors.date}</span>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-start gap-2">               
              <button                 
                type="submit"                 
                disabled={submitLoader}                 
                className="inline-flex items-center px-4 py-1 border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 disabled:cursor-not-allowed font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap pl-5 pr-5"               
              >                 
                {submitLoader ? (                   
                  <>                     
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />                     
                    Loading...                   
                  </>                 
                ) : (                   
                  "Run"                 
                )}               
              </button> 
              { (form.addressId || form.clientId || form.date)&&
                (<button
                type="button"
                onClick={handleReset}
                disabled={submitLoader}
                className="inline-flex items-center px-4 py-1 border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </button>) }            
            </div>
          </div>
        </form>
      </div>
      
      {/* Table Header with Print and Share Icons */}
      <div className="flex justify-end items-center gap-2 mt-4 mb-2">
        <button
          onClick={handlePrint}
          disabled={isPrinting}
          className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          title="Print Report"
        >
          {isPrinting ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2" />
              <span className="text-sm">Preparing...</span>
            </>
          ) : (
            <Printer className="w-5 h-5" />
          )}
        </button>
        
        <button
          onClick={handleDownloadExcel}
          className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          title="Download Excel"
        >
          <Upload className="w-5 h-5" />
        </button>
      </div>

      <GenericTable
        data={data || []}
        columns={tableColumns}
        loading={loading}
        emptyMessage="No records found matching your search criteria."
        searchable={true}
      />
    </div>
  );
};

import React, { useEffect, useState, useRef } from "react";
import { FaFilePdf, FaFileExport } from "react-icons/fa";
import { RotateCcw, Share2 } from "lucide-react";
import { useSearchClient } from "../../hooks/usesearchClient";
import { useDebounce } from "../../hooks/useDebounce";
import { GenericTable, TableColumn } from "../../components/GenericTable";
import { SearchResultItem, SearchResultsDropdown } from "../../components/ui/search-result-item";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useViewTimeSummary } from "../../context/ViewTimeSummaryContext";
import ResetButton from "../../components/ui/ResetButton";
import { CustomDatePicker } from "../../components/CustomDatePicker";
import { ErrorMessage } from "../../components/ui/error-message";
import { formatDateLocal, formatDateStringLocal } from "../../lib/utils";
import { Button } from "../../components/ui/button";

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
  const [tableHeight, setTableHeight] = useState<string>("400px");
  const formRef = useRef<HTMLDivElement>(null);

  const { data: searchedClients = [], isLoading: loadingClients } =
    useSearchClient(debouncedClientSearch);
  const fieldInputClasses =
    "w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition";
 const { data, loading, error, fetchSummary } = useViewTimeSummary();

  // Calculate table height dynamically
  useEffect(() => {
    const calculateTableHeight = () => {
      if (formRef.current) {
        const formHeight = formRef.current.offsetHeight;
        const calculatedHeight = `calc(100vh - ${formHeight}px - 150px)`;
        setTableHeight(calculatedHeight);
      }
    };

    // Calculate on mount and when form content changes
    calculateTableHeight();

    // Recalculate on window resize
    const handleResize = () => {
      calculateTableHeight();
    };

    window.addEventListener('resize', handleResize);
    
    // Use ResizeObserver to detect form height changes
    const resizeObserver = new ResizeObserver(() => {
      calculateTableHeight();
    });

    if (formRef.current) {
      resizeObserver.observe(formRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [form, errors, submitLoader]);
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
    client: { id: string | number; name: string; lastName:string },
    addressId: number | string
  ) => {
    setForm((f) => ({
      ...f,
      clientId: String(client.id),
      addressId: String(addressId),
    }));
    const fullClientName = [client.name, client.lastName].filter(Boolean).join(' ');
    setClientSearch(fullClientName);
    setShowClientDropdown(false);
    setErrors((e) => ({ ...e, clientId: undefined, addressId: undefined }));

    const selectedClient = searchedClients.find(
      (c) => String(c.id) === String(client.id)
    );
    const selectedAddress = selectedClient?.addresses.find(
      (a) => String(a.id) === String(addressId)
    );
    const fullAddress = [
      selectedAddress?.label || selectedAddress?.address,
      (selectedAddress as any)?.city,
      (selectedAddress as any)?.state,
      (selectedAddress as any)?.pincode,
    ].filter(Boolean).join(', ');
    setSelectedAddressText(fullAddress);
  };

  const formatDateForAPI = (rawDate: string | Date): string => {
  if (typeof rawDate === 'string') {
    // Convert to MM-DD-YYYY for API
    const yyyyMMdd = formatDateStringLocal(rawDate);
    const [year, month, day] = yyyyMMdd.split('-');
    return `${month}-${day}-${year}`;
  }
  // Convert Date object to MM-DD-YYYY for API
  const yyyyMMdd = formatDateLocal(rawDate);
  const [year, month, day] = yyyyMMdd.split('-');
  return `${month}-${day}-${year}`;
};

const formatDateForDisplay = (rawDate: string | Date): string => {
  if (typeof rawDate === 'string') {
    // Convert YYYY-MM-DD to MM-DD-YYYY for display
    const [year, month, day] = rawDate.split('-');
    return `${month}-${day}-${year}`;
  }
  // Convert Date object to MM-DD-YYYY for display
  const yyyyMMdd = formatDateLocal(rawDate);
  const [year, month, day] = yyyyMMdd.split('-');
  return `${month}-${day}-${year}`;
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
  if (!validate()) {
    toast.error("Please fill in all required fields");
    return;
  }

  setSubmitLoader(true);
  
  try {
    console.log("Submitting form with data:", form);

    const clientId = Number(form.clientId);
    const rawDate = form.date;

    // Call API with or without date
    if (rawDate) {
      const formattedDate = formatDateForAPI(rawDate);  // Use utility function
      console.log("Formatted Date for API:", formattedDate);
      
      // Add minimum loading time to ensure user sees the loading state
      await Promise.all([
        fetchSummary(clientId, formattedDate),
        new Promise(resolve => setTimeout(resolve, 500)) // Minimum 500ms loading
      ]);
    } else {
      await Promise.all([
        fetchSummary(clientId),
        new Promise(resolve => setTimeout(resolve, 500)) // Minimum 500ms loading
      ]);
    }
    
    
    toast.success("Time summary loaded successfully!");

    console.log("Time summary fetched:", data);  
  } catch (err) {
    console.error("Failed to fetch time summary:", err);
    toast.error("Failed to fetch time summary");
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
      "Hours ": item.time,
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
    if (!data || data.length === 0) {
      toast.error("No data to print!");
      return;
    }

    try {
      setIsPrinting(true);
      
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const tableContent = generatePrintableTable();
      const currentDate = new Date();
      const currentDateFormatted = formatDateForDisplay(currentDate); // Use utility function
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
              <p class="subtitle">Generated on ${currentDateFormatted} at ${currentTime}</p>
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
      toast.error("Failed to generate print preview");
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
      className: "whitespace-nowrap max-w-[200px]",
     render: (value) => {
  if (!value) return "-";
  console.log("raw value:", value);

  const [month, day, year] = value.split("-");
  const formatted = `${month}-${day}-${year}`;
  console.log("formatted:", formatted);

  return formatted;
}
    },
    {
      key: "Client.name",
      label: "Client Name",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap max-w-[200px]",
      render: (_: any, row: any) => {
        const a = row.Client;
        console.log(1,a)
        const full = [a?.name??"" , a?.lastName??""].filter(Boolean).join(" ");
        return <div className="truncate" title={full}>{full || "-"}</div>;
      }
    },
    {
      key: "address.address",
      label: "Client Location",
      sortable: true,
      searchable: true,
      className: "break-words max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]",
      render: (_: any, row: any) => {
        const a = row.address;
        console.log(1,a)
        const full = [a?.address??"" , a?.city??"" , a?.state??"" , a?.pincode??""].filter(Boolean).join(", ");
        return <div className="truncate" title={full}>{full || "-"}</div>;
      }
    },
    {
      key: "time",
      label: "Hours",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap max-w-[200px]",
    }
  ];
  
  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 md:px-6 pt-10">
      <div ref={formRef} className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 space-y-2 grid mb-2">
        <h2 className="text-xl font-semibold mb-2">
          View Time Summary
        </h2>
        <form onSubmit={onSubmit} autoComplete="off">
<div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2 items-start">   
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
    <ErrorMessage message={errors.clientId} />
  )}

  <SearchResultsDropdown show={showClientDropdown && clientSearch.length >= 1}>
    {loadingClients ? (
      <div className="p-2 text-sm text-gray-500">Searching clients...</div>
    ) : searchedClients.length === 0 ? (
      <div className="p-2 text-gray-500 text-sm">No clients found</div>
    ) : (
      searchedClients.flatMap((client, clientIndex) =>
        client.addresses.map((address, addressIndex) => (
          <SearchResultItem
            key={`${client.id}-${address.id}`}
            index={clientIndex + addressIndex}
            primaryText={[client.name, client.lastName].filter(Boolean).join(' ')}
            secondaryText={[
              address.label || address.address,
              (address as any)?.city,
              (address as any)?.state,
              (address as any)?.pincode,
            ].filter(Boolean).join(', ')}
            initials={`${client.name?.[0]?.toUpperCase() ?? ''}${client.lastName ? client.lastName[0]?.toUpperCase() : ''}`}
            onSelect={() =>
              handleClientSelect(
                { id: client.id, name: client.name, lastName: client.lastName },
                address.id
              )
            }
          />
        ))
      )
    )}
  </SearchResultsDropdown>
</div>

            {/* Address (read-only) */}
            <div>
              <input
                type="text"
                value={selectedAddressText}
                placeholder="Location"
                readOnly
                className={`${fieldInputClasses} appearance-none `}
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

                <ErrorMessage message={errors.date} />
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-start gap-2">               
              <Button                 
                type="submit"                 
                disabled={submitLoader}                 
                variant="outline"
                className="pl-5 pr-5"               
              >                 
                {submitLoader ? (                   
                  <>                     
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />                     
                    Loading...                   
                  </>                 
                ) : (                   
                  "Run"                 
                )}               
              </Button> 
              { (form.addressId || form.clientId || form.date)&&
                (<ResetButton onClick={handleReset}
                disabled={submitLoader}/>) }            
            </div>
          </div>
        </form>
      </div>
      
      {/* Table Header with Print and Share Icons */}
      

      <GenericTable
        data={data || []}
        columns={tableColumns}
        loading={loading}
        emptyMessage="No records found matching your search criteria."
        searchable={true}
        tableHeight={tableHeight}
      />
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
            <FaFilePdf className="w-5 h-5" />
          )}
        </button>
        
        <button
          onClick={handleDownloadExcel}
          className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          title="Download Excel"
        >
          <FaFileExport className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

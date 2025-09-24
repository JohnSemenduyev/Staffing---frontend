import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { FaFilePdf, FaFileExport } from "react-icons/fa";
import { useSearchClient } from "../../hooks/usesearchClient";
import { useDebounce } from "../../hooks/useDebounce";
import { useSearchUsers } from "../../hooks/useSearchUser";
import { GenericTable, TableColumn } from "../../components/GenericTable";
import { inputClasses } from "../Admin/GeoLocationSetup";
import { useNotifications } from "../../context/NotificatoinContext";
import { toast } from "sonner";
import ResetButton from "../../components/ui/ResetButton";
import { exportNotificationToExcel, exportNotificationToPDF } from "../../utils/exportNotificationUtils";
import { CustomDatePicker } from "../../components/CustomDatePicker";
import { ErrorMessage } from "../../components/ui/error-message";
import { SearchResultItem, SearchResultsDropdown } from "../../components/ui/search-result-item";
import { Button } from "../../components/ui/button";
import Pagination from "../../components/Pagination";


const notificationOptions = ["Geolocation", "Time Clock", "Weekly Hours", "Scheduling"] as const;
type NotificationOption = (typeof notificationOptions)[number];
const notificationTypeMap: Record<NotificationOption, string> = {
  "Geolocation": "geo_location",
  "Time Clock": "time_clock",
  "Weekly Hours": "weekly_Hours",
  "Scheduling": "schedule"
};

export const Notification = () => {
  const [form, setForm] = useState({
    clientId: "",
    addressId: "",
    userId: "",
    Startdate: "",
    Enddate: "",
    notification: [] as NotificationOption[],
  });

  const { data, loading, error, lastPage, currentPage, setCurrentPage, fetchNotifications } = useNotifications();
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [clientSearch, setClientSearch] = useState("");
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedAddressText, setSelectedAddressText] = useState("");
  const [submitLoader, setSubmitLoader] = useState(false);
  const { data: searchedClients = [], isLoading: loadingClients } =
    useSearchClient(debouncedClientSearch);
  const [userSearch, setUserSearch] = useState("");
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const { data: searchedUsers = [], isLoading: loadingUsers } =
    useSearchUsers(debouncedUserSearch);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);
  const [tableHeight, setTableHeight] = useState<string>("400px");
  const formRef = useRef<HTMLDivElement>(null);

  const fieldInputClasses = inputClasses;

  // Date format conversion utility
  const toMDY = (ymd?: string) => {
    if (!ymd) return "";
    const [y,m,d] = ymd.split("-");
    return `${m}-${d}-${y}`;
  };

  // Calculate table height dynamically
  useEffect(() => {
    const calculateTableHeight = () => {
      if (formRef.current) {
        const formHeight = formRef.current.offsetHeight;
        const calculatedHeight = `calc(100vh - ${formHeight}px - 200px)`;
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
  }, [form, errors, showErrors, submitLoader]);

  const validate = () => {
    const e: any = {};
    // Client and address are now optional - no validation required
    if (form.Startdate && form.Enddate && new Date(form.Enddate) < new Date(form.Startdate)) {
      e.Enddate = "End date must be after start date";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (field: string, value: any) => {
    setForm((f) => ({
      ...f,
      [field]: value,
    }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleClientSelect = (
    client: { id: string | number; name: string; lastName: string },
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
      (selectedAddress as any)?.zipcode,
    ].filter(Boolean).join(', ');
    setSelectedAddressText(fullAddress);
  };

  const handleUserSelect = (user: { id: string | number; name: string }) => {
    setForm((f) => ({ ...f, userId: String(user.id) }));
    const fullName = [user.name, (user as any)?.lastName].filter(Boolean).join(' ');
    setUserSearch(fullName || user.name);
    setShowUserDropdown(false);
    setErrors((e) => ({ ...e, userId: undefined }));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target as Node)) {
        setShowNotificationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCheckbox = (option: NotificationOption) => {
    setForm(f =>
      f.notification.includes(option)
        ? { ...f, notification: f.notification.filter(n => n !== option) }
        : { ...f, notification: [...f.notification, option] }
    );
    setErrors(prev => ({ ...prev, notification: undefined }));
    setShowErrors(false);
  };

  const handleReset = () => {
    setForm({
      clientId: "",
      addressId: "",
      userId: "",
      Startdate: "",
      Enddate: "",
      notification: [],
    });
    setClientSearch("");
    setUserSearch("");
    setSelectedAddressText("");
    setErrors({});
    setShowErrors(false);
    setShowClientDropdown(false);
    setShowUserDropdown(false);
    setShowNotificationDropdown(false);
  };
  useEffect(() => {
    console.log("Notification data:", data);
    console.log("Last page:", lastPage);
    console.log("Current page:", currentPage);
  }, [data, lastPage, currentPage])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      setShowErrors(true);
      return;
    }

    setSubmitLoader(true);
    setErrors({});

    try {
      await fetchNotifications({
        startDate: toMDY(form.Startdate),
        endDate: toMDY(form.Enddate),
        ...(form.clientId && { clientId: Number(form.clientId) }),
        ...(form.addressId && { addressId: Number(form.addressId) }),
        userId: Number(form.userId),
        notificationType: form.notification.map(n => notificationTypeMap[n]),
        page: currentPage,
      });

      toast.success("Notifications fetched successfully!");
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to fetch notifications. Please try again.");
    } finally {
      setSubmitLoader(false);
    }
  };

  // Export functions using utility
  const handleExportToExcel = async () => {
    if (!data || data.length === 0) {
      toast.error("No data to export. Please fetch data first.");
      return;
    }

    console.log("Exporting Excel with data:", data);
    try {
      const result = await exportNotificationToExcel(data, 'notifications');
      console.log("Excel export result:", result);
      if (result.success) {
        toast.success(`Excel file exported successfully: ${result.filename}`);
      } else {
        toast.error(`Failed to export Excel: ${result.error}`);
      }
    } catch (error) {
      console.error("Excel Export - Unexpected error:", error);
      toast.error(`Unexpected error during Excel export: ${error.message}`);
    }
  };

  const handleExportToPDF = () => {
    if (!data || data.length === 0) {
      toast.error("No data to export. Please fetch data first.");
      return;
    }

    console.log("Exporting PDF with data:", data);
    try {
      const result = exportNotificationToPDF(data, 'notifications');
      console.log("PDF export result:", result);
      if (result.success) {
        toast.success(`PDF file exported successfully: ${result.filename}`);
      } else {
        toast.error(`Failed to export PDF: ${result.error}`);
      }
    } catch (error) {
      console.error("PDF Export - Unexpected error:", error);
      toast.error(`Unexpected error during PDF export: ${error.message}`);
    }
  };

  const getFieldClasses = (fieldName: string) => {
    const hasError = showErrors && errors[fieldName];
    return `${inputClasses} ${hasError ? 'border-red-500 focus:ring-red-500' : ''}`;
  };
  const formatNotificationText = (notification: string): string => {
    if (notification == "geo_location") {
      return "GeoLocation"
    }
    return notification
      .replace(/_/g, ' ') 
      .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
  };

  const tableColumns: TableColumn[] = [
    {
      key: "client.name",
      label: "Client Name",
      sortable: true,
      searchable: true,
      searchType: 'text',
      width: "250px",
      height:"40px",
       render: (_: any, row: any) => {
        const a = row.client;
        const full = [a?.name??"" , a?.lastName??""].filter(Boolean).join(" ");
        return <div className="truncate" title={full}>{full || "-"}</div>;
      }
    },
         {
       key: "address.address",
       label: "Address",
       sortable: true,
       searchable: true,
       width: "350px",
       className: "min-w-[300px]",
       render: (value: string, row: any) => {
         console.log('Address render - value:', value, 'row:', row);
         const address = row.address;
         if (!address) return "-";
         
         const streetAddress = address.address ?? "";
         const city = address.city ?? "";
         const state = address.state ?? "";
         const pin = address.pincode ?? "";
         
         const fullAddress = [streetAddress, city, state, pin].filter(Boolean).join(', ');
         
         // Format: street address, city (line 1), state, pin (line 2)
         // If any line is more than 50 chars, break it
         const formatAddressLine = (text: string) => {
           if (text.length <= 50) return [text];
           const words = text.split(' ');
           const lines = [];
           let currentLine = '';
           
           for (const word of words) {
             if ((currentLine + ' ' + word).trim().length <= 50) {
               currentLine = currentLine ? currentLine + ' ' + word : word;
             } else {
               if (currentLine) lines.push(currentLine);
               currentLine = word;
             }
           }
           if (currentLine) lines.push(currentLine);
           return lines;
         };
         
         const line1 = [streetAddress, city].filter(Boolean).join(", ");
         const line2 = [state, pin].filter(Boolean).join(", ");
         
         const line1Parts = formatAddressLine(line1);
         const line2Parts = formatAddressLine(line2);
         
         return (
           <div className="space-y-1" title={fullAddress}>
             {line1Parts.map((part, index) => (
               <div key={`address-line1-${index}`} className="text-sm leading-tight">
                 {part}
               </div>
             ))}
             {line2Parts.map((part, index) => (
               <div key={`address-line2-${index}`} className="text-sm leading-tight">
                 {part}
               </div>
             ))}
           </div>
         );
       }
     },
    {
      key: "guardFirst.name",
      label: "User Name",
      sortable: true,
      searchable: true,
      width: "250px",
      className: "min-w-[150px]",
       render: (_: any, row: any) => {
        const a = row;
        console.log(row)
        const full = [a?.guardFirst.name??"" , a?.guardLast.name??""].filter(Boolean).join(" ");
        return <div className="truncate" title={full}>{full || "-"}</div>;
      }
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      width: "120px",
      searchable: true,
      className: "min-w-[120px]",
      render: (value: string) => {
        if (!value) return "-";
        try {
          
          return value;
        } catch {
          return value || "-";
        }
      }
    },
    {
      key: "time",
      label: "Time",
      sortable: true,
      width: "100px",
      searchable: true,
      className: "min-w-[100px]",
      render: (value: string) => value || "-"
    },
    {
      key: "notificationType",
      label: "Notification",
      sortable: true,
      searchable: true,
      searchType: 'dropdown',
      searchOptions: [
        { label: 'Geolocation', value: 'geo_location' },
        { label: 'Time Clock', value: 'time_clock' },
        { label: 'Weekly Hours', value: 'weekly_Hours' },
        { label: 'Schedule', value: 'schedule' },
      ],
      width: "200px",
      className: "min-w-[120px]",
      render: (value: string) => {
        const formattedType = value ? formatNotificationText(value) : "Unknown";
        return (
          <div>
            {formattedType}
          </div>
        );
      }
    },
    {
      key: "message",
      label: "Message",
      sortable: false,
      searchable: true,
      className: "min-w-[250px]",
      width: "200px",
      render: (value: string) => {
        // Convert "BREAK" to line breaks in notification messages
        const formatMessage = (message: string) => {
          if (!message) return "-";
          return message.split("BREAK").map((part, index) => (
            <React.Fragment key={index}>
              {part}
              {index < message.split("BREAK").length - 1 && <br />}
            </React.Fragment>
          ));
        };

        return (
          <div className="leading-relaxed" title={value || ""}>
            {formatMessage(value)}
          </div>
        );
      }
    }
  ];
  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 md:px-6 pt-10 pb-6">
      <div ref={formRef} className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 space-y-2 grid mb-2">
        <h2 className="text-xl font-semibold mb-2">
          Notification
        </h2>
        <form onSubmit={onSubmit} autoComplete="off">
          <div className="grid grid-cols-1  md:grid-cols-3 lg:grid-cols-4 gap-2 items-start w-full" style={{ display: 'grid' }}>
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
                          (address as any)?.pincode || (address as any)?.zipcode,
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
            <div>
              <input
                type="text"
                value={selectedAddressText}
                placeholder="Location"
                readOnly
                className={`${fieldInputClasses} appearance-none `}
              />
              {errors.addressId && (
                <ErrorMessage message={errors.addressId} />
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={userSearch}
                onFocus={() => setShowUserDropdown(true)}
                onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                onChange={e => {
                  setUserSearch(e.target.value);
                  setForm(f => ({ ...f, userId: "" }));
                }}
                placeholder="User Name"
                className={getFieldClasses('userId')}
              />
              {errors.userId && (
                <ErrorMessage message={errors.userId} />
              )}

              {showErrors && errors.userId && (
                <div className="mt-1 flex items-center text-sm text-red-600">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.userId}
                </div>
              )}
              <SearchResultsDropdown show={showUserDropdown && userSearch.length >= 1}>
                {loadingUsers ? (
                  <div className="p-2 text-sm text-gray-500">Searching users...</div>
                ) : searchedUsers.length === 0 ? (
                  <div className="p-2 text-gray-500 text-sm">No users found</div>
                ) : (
                  searchedUsers.map((user, idx) => {
                    const fullName = [user.name, (user as any)?.lastName].filter(Boolean).join(" ");
                    const fullAddress = [
                      (user as any)?.address,
                      (user as any)?.city,
                      (user as any)?.state,
                      (user as any)?.zipcode,
                    ].filter(Boolean).join(", ");
                    return (
                      <SearchResultItem
                        key={user.id}
                        index={idx}
                        primaryText={fullName || user.name}
                        secondaryText={fullAddress}
                        onSelect={() => handleUserSelect(user)}
                      />
                    );
                  })
                )}
              </SearchResultsDropdown>
            </div>

            <div>
              <CustomDatePicker
                value={form.Startdate}
                onChange={handleChange}
                placeholder="Select Start Date"
                fieldName="Startdate"
                className={`${fieldInputClasses} appearance-none`}
              />
              {errors.Startdate && (
                <ErrorMessage message={errors.Startdate} />
              )}
            </div>

            <div>
              <CustomDatePicker
                value={form.Enddate}
                onChange={handleChange}
                placeholder="Select End Date"
                fieldName="Enddate"
                className={`${fieldInputClasses} appearance-none`}
              />
              {errors.Enddate && (
                <ErrorMessage message={errors.Enddate} />
              )}
            </div>

            {/* Buttons for 1-3 column layouts - show before notification dropdown */}
            <div className="flex justify-start gap-2 lg:hidden">
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
              {(form.addressId || form.clientId || form.Enddate || form.Startdate || form.notification.length > 0 || form.userId) &&
                (<ResetButton onClick={handleReset}
                  disabled={submitLoader} />)}
            </div>

            <div className="relative md:col-span-3 lg:col-span-2" ref={notificationDropdownRef}>
              <div
                className={`${getFieldClasses('notification')} cursor-pointer flex items-center justify-between`}
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              >
                <div className="flex flex-wrap gap-1 flex-1">
                  {form.notification.length === 0 ? (
                    <span className="text-gray-500">Select notifications...</span>
                  ) : (
                    form.notification.map(option => (
                      <span
                        key={option}
                        className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm"
                      >
                        {option}
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckbox(option);
                          }}
                          variant="ghost"
                          size="icon-sm"
                          className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </span>
                    ))
                  )}
                </div>
                <div className="ml-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {showNotificationDropdown && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                  {notificationOptions.map(option => (
                    <label key={option} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={form.notification.includes(option)}
                        onChange={() => handleCheckbox(option)}
                        className="mr-3 text-[#004175] focus:ring-[#004175] focus:ring-2"
                      />
                      <span className={`${form.notification.includes(option) ? 'text-blue-800' : 'text-gray-700'}`}>
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {showErrors && errors.notification && (
                <div className="mt-1 flex items-center text-sm text-red-600">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.notification}
                </div>
              )}
            </div>

            {/* Submit Button - only show on 4-column layout (lg and above) */}
            <div className="hidden lg:flex justify-start gap-2">
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
              {(form.addressId || form.clientId || form.Enddate || form.Startdate || form.notification.length > 0 || form.userId) &&
                (<ResetButton onClick={handleReset}
                  disabled={submitLoader} />)}
            </div>
          </div>
        </form>
      </div>

      {/* Error message display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <GenericTable
        data={data || []}
        columns={tableColumns}
        loading={loading}
        emptyMessage="No notifications found matching your search criteria."
        searchable={true}
        tableHeight={tableHeight}
      />
      
      {/* Export Buttons */}
      {data && data.length > 0 && (
        <div className="flex justify-end items-center gap-2 mt-2 mb-2">
          <button
            onClick={handleExportToPDF}
            className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            title="Export to PDF"
          >
            <FaFilePdf className="w-5 h-5" />
          </button>

          <button
            onClick={handleExportToExcel}
            className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            title="Export to Excel"
          >
            <FaFileExport className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {/* Pagination */}
      {data && data.length > 0 && (
        <div className="mt-3">
          {lastPage && lastPage > 0 ? (
            <Pagination
              currentPage={currentPage}
              lastPage={lastPage}
              onPageChange={(page) => {
                setCurrentPage(page);
                fetchNotifications({
                  startDate: toMDY(form.Startdate),
                  endDate: toMDY(form.Enddate),
                  ...(form.clientId && { clientId: Number(form.clientId) }),
                  ...(form.addressId && { addressId: Number(form.addressId) }),
                  userId: Number(form.userId),
                  notificationType: form.notification.map(n => notificationTypeMap[n]),
                  page: page,
                });
              }}
              loading={loading}
            />
          ) : (
            <div className="text-center text-gray-500 py-4">
              No pagination data available
            </div>
          )}
        </div>
      )}
    </div>
  );
};
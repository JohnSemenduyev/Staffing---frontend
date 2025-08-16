import React, { useEffect, useRef, useState } from "react";
import { Eye, Plus, Trash2, Printer, Share2, Type, X, RotateCcw } from "lucide-react";
import { useSearchClient } from "../../hooks/usesearchClient";
import { useDebounce } from "../../hooks/useDebounce";
import { useSearchUsers } from "../../hooks/useSearchUser";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import { inputClasses } from "../Admin/GeoLocationSetup";
import { useNotifications } from "../../context/NotificatoinContext";
import { toast } from "sonner";
import ResetButton from "../../components/ui/ResetButton";
import { CustomDatePicker } from "../../components/CustomDatePicker";
import { ErrorMessage } from "../../components/ui/error-message";


const notificationOptions = ["Geolocation", "Time Clock", "Weekly Hours", "Scheduling"] as const;
type NotificationOption = (typeof notificationOptions)[number];

export const Notification = () => {
  const [form, setForm] = useState({
    clientId: "",
    addressId: "",
    userId: "",
    Startdate: "",
    Enddate: "",
    notification: [] as NotificationOption[],
  });

 const { data, loading, error, fetchNotifications } = useNotifications();
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

  const fieldInputClasses =
    "w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition";

  // Load notifications on component mount


  const validate = () => {
    const e: any = {};
    if (!form.clientId) e.clientId = "Required";
    if (!form.addressId) e.addressId = "Required";
    
    // Date validation: End date should be after start date
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
    client: { id: string | number; name: string; lastName:string },
    addressId: number | string
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

  const handleUserSelect = (user: { id: string | number; name: string }) => {
    setForm((f) => ({ ...f, userId: String(user.id) }));
    setUserSearch(user.name);
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
    // Remove notification validation error when notifications change
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
  useEffect(()=>{
    console.log(data);
    
  },[data])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      setShowErrors(true);
      return;
    }
    
    setSubmitLoader(true);
    setErrors({});
    
    try {
      // Call fetchNotifications with filters - Note: not passing endDate as requested
      await fetchNotifications({
        clientId: Number(form.clientId),
        addressId: Number(form.addressId),
        userId: Number(form.userId),
        date: form.Startdate ||null
      });
      
      console.log("Notification filters applied:", {
        clientId: form.clientId,
        addressId: form.addressId,
        userId: form.userId,
        startDate: form.Startdate,
        notifications: form.notification
      });
      
      toast.success("Notifications fetched successfully!");
      
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to fetch notifications. Please try again.");
      
    } finally {
      setSubmitLoader(false);
    }
  };

  const getFieldClasses = (fieldName: string) => {
    const hasError = showErrors && errors[fieldName];
    return `${inputClasses} ${hasError ? 'border-red-500 focus:ring-red-500' : ''}`;
  };

//   const tableColumns: TableColumn[] = [
//   {
//     key: "client.name",
//     label: "Client Name",
//     sortable: true,
//     searchable: true,
//     width: "200px",
//     height: "40px",
//     allowWrap: true, // Enable text wrapping for this column
//     render: (value: string) => value || "-"
//   },
//   {
//     key: "address.address",
//     label: "Address",
//     sortable: true,
//     searchable: true,
//     className: "max-w-[200px]", // Remove break-words class, it's handled by allowWrap
//     allowWrap: true, // Enable text wrapping
//     render: (value: string) => (
//       <div title={value || ""}>
//         {value || "-"}
//       </div>
//     )
//   },
//   {
//     key: "guardFirst.name",
//     label: "User Name",
//     sortable: true,
//     searchable: true,
//     className: "max-w-[200px]",
//     allowWrap: true, // Enable text wrapping
//   },
//   {
//     key: "date",
//     label: "Date",
//     sortable: true,
//     searchable: true,
//     className: "max-w-[200px]",
//     allowWrap: false, // Keep dates on single line
//     render: (value: string) => {
//       if (!value) return "-";
//       try {
//         const date = new Date(value);
//         return isNaN(date.getTime()) ? value : date.toLocaleDateString();
//       } catch {
//         return value || "-";
//       }
//     }
//   },
//   {
//     key: "notificationType",
//     label: "Type",
//     sortable: true,
//     searchable: true,
//     width: "200px",
//     className: "max-w-[150px]",
//     allowWrap: false, // Keep type badges on single line
//     render: (value: string) => (
//       <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
//         {value || "Unknown"}
//       </span>
//     )
//   },
//   {
//     key: "message",
//     label: "Message",
//     sortable: false,
//     searchable: true,
//     className: "max-w-[300px]",
//     allowWrap: true, // Enable text wrapping for messages
//     render: (value: string) => (
//       <div className="leading-relaxed" title={value || ""}>
//         {value || "-"}
//       </div>
//     )
//   }
// ];
 
// Updated table columns with dynamic width expansion
// Helper function to format notification text (add this at the top of your component)
const formatNotificationText = (notification: string): string => {
  if(notification=="geo_location"){
    return "GeoLocation"
  }
  return notification
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
};


// Updated table columns with formatted notification type

const tableColumns: TableColumn[] = [
  {
    key: "client.name",
    label: "Client Name",
    sortable: true,
    searchable: true,
    width: "250px",
    height: "40px",
    className: "min-w-[150px]",
    render: (value: string) => value || "-"
  },
  {
    key: "address.address",
    label: "Address",
    sortable: true,
    searchable: true,
    width: "250px",
    className: "min-w-[200px]",
    render: (value: string) => (
      <div title={value || ""}>
        {value || "-"}
      </div>
    )
  },
  {
    key: "guardFirst.name",
    label: "User Name",
    sortable: true,
    searchable: true,
    width: "250px",
    className: "min-w-[150px]",
  },
  {
    key: "date",
    label: "Date",
    sortable: true,
    width: "250px",
    searchable: true,
    className: "min-w-[120px]",
    render: (value: string) => {
      if (!value) return "-";
      try {
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date.toLocaleDateString();
      } catch {
        return value || "-";
      }
    }
  },
  {
  key: "notificationType",
  label: "Notification",
  sortable: true,
  searchable: true,
  searchType: 'dropdown', // Add this
  searchOptions: [ // Add this
    { label: 'Geolocation', value: 'geo_location' },
    { label: 'Time Clock', value: 'time_clock' },
    { label: 'Weekly Hours', value: 'weekly_hours' },
    { label: 'Schedule', value: 'schedule' }
  ],
  width: "250px",
  className: "min-w-[120px]",
  render: (value: string) => {
    // Format the notification type using the same helper function
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
    className: "min-w-[350px]",
    width:"200px",
    render: (value: string) => (
      <div className="leading-relaxed" title={value || ""}>
        {value || "-"}
      </div>
    )
  }
];
return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 md:px-6 pt-10">
      <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 mb-2">
        <h2 className="text-xl font-semibold mb-2">
          Notification
        </h2>
        <form onSubmit={onSubmit} autoComplete="off">
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-start">   
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
            
            // Generate initials from first letter of name and lastName
            const initials = `${client.name.charAt(0).toUpperCase()}${client.lastName.charAt(0).toUpperCase()}`;
            
            return (
              <div
                key={`${client.id}-${address.id}`}
                onMouseDown={() =>
                  handleClientSelect(
                    { id: client.id, name: client.name, lastName: client.lastName },
                    address.id
                  )
                }
                className={`p-3 cursor-pointer flex items-center space-x-3 ${
                  isEven ? "bg-white" : "bg-gray-50"
                } hover:bg-gray-100 transition-colors duration-150`}
              >
                {/* Circular Avatar with Initials */}
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-medium">
                    {initials}
                  </span>
                </div>
                
                {/* Client Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-blue-800 text-sm truncate">
                    {`${client.name} ${client.lastName}`}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {address.label || address.address}
                  </div>
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
              {showUserDropdown && userSearch.length >= 2 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50 font-sans">
                  {loadingUsers ? (
                    <div className="p-2 text-sm text-gray-500">Searching users...</div>
                  ) : searchedUsers.length === 0 ? (
                    <div className="p-2 text-gray-500 text-sm">No users found</div>
                  ) : (
                    searchedUsers.map(user => (
                      <div
                        key={user.id}
                        className="p-2 cursor-pointer text-sm hover:bg-gray-50"
                        onMouseDown={() => handleUserSelect(user)}
                      >
                        {user.name}
                      </div>
                    ))
                  )}
                </div>
              )}
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

            <div className="relative col-span-1 md:col-span-2 " ref={notificationDropdownRef}>
              <div
                className={`${getFieldClasses('notification')} cursor-pointer flex items-center justify-between`}
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              >
                <div className="flex flex-wrap gap-1 flex-1">
                  {form.notification.length === 0 ? (
                    <span className="text-gray-400">Select notifications...</span>
                  ) : (
                    form.notification.map(option => (
                      <span
                        key={option}
                        className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm"
                      >
                        {option}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckbox(option);
                          }}
                          className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
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
              {(form.addressId || form.clientId || form.Enddate || form.Startdate || form.notification.length > 0 || form.userId) &&
                (<ResetButton onClick={handleReset}
                  disabled={submitLoader}/>)}
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
      />
    </div>
  );
};
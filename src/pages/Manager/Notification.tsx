import React, { useEffect, useRef, useState } from "react";
import { Eye, Plus, Trash2, Printer, Share2, Type, X } from "lucide-react";
import { useSearchClient } from "../../hooks/usesearchClient";
import { useDebounce } from "../../hooks/useDebounce";
import { useSearchUsers } from "../../hooks/useSearchUser";
import { GenericTable,TableAction,TableColumn } from "../../components/GenericTable";
import { inputClasses } from "../Admin/GeoLocationSetup";

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
  const data=[];

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [clientSearch, setClientSearch] = useState("");
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedAddressText, setSelectedAddressText] = useState("");
  const [submitLoader, setSubmitLoader] = useState(false);
  const [auto, setAuto] = useState(false);
  const[loading, setLoading] = useState(false);
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

  const validate = () => {
    const e: any = {};
    if (!form.clientId) e.clientId = "Required";
    if (!form.addressId) e.addressId = "Required";
    if (!form.Startdate) e.Startdate = "Required";
    if (!form.Enddate) e.Enddate = "Required";
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
    client: { id: string | number; name: string },
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
    // Remove all validation errors when notifications change
    setErrors({});
    setShowErrors(false);
  };
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitLoader(true);
    data.push(form);
    console.log("Submitting form with data:", form); // Debug log
    setSubmitLoader(false);

    //   try {
    //     // Ensure all numbers are converted safely, fallback to 0 if empty
    //     const payload = {
    //       clientId: Number(form.clientId),
    //       addressId: Number(form.addressId),
    //       distance: form.distance !== "" ? Number(form.distance) : 0,
    //       actualScheduledTime: form.time !== "" ? Number(form.time) : 0,
    //       weeklyHours: form.hours !== "" ? Number(form.hours) : 0,
    //       reminderTime: form.reminder !== "" ? Number(form.reminder) : 0,
    //       overlap: overlap,
    //       unscheduledTime: unscheduledTime,
    //     };

    //     console.log("Submitting payload:", payload); // Debug log

    //     await createTimeSetup(payload);

    //     // Reset form
    //     setForm({
    //       clientId: "",
    //       addressId: "",
    //       distance: "",
    //       time: "",
    //       hours: "",
    //       reminder: "",
    //     });
    //     setClientSearch("");
    //     setSelectedAddressText("");
    //     setOverlap(false);
    //     setUnscheduledTime(false);
    //     alert("Time setup created successfully!");
    //   } catch (error) {
    //     console.error("Error creating time setup:", error);
    //     alert("Failed to create time setup.");
    //   } finally {
    //     setSubmitLoader(false);
    //   }
  };

 const getFieldClasses = (fieldName: string) => {
     const hasError = showErrors && errors[fieldName];
     return `${inputClasses} ${hasError ? 'border-red-500 focus:ring-red-500' : ''}`;
   };
 

  const tableColumns: TableColumn[] = [
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
      render: (value: any) => `${value} Mins`
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
      render: (value: string) => <div className="truncate" title={value}>{value || "-"}</div>
    }
  ]; 
  
  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 md:px-6 pt-10">
        <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 mb-2">
          <h2 className="text-xl font-semibold mb-2">
           Notification</h2>
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
              <input
                type="text"
                placeholder="Select date"
                value={form.Startdate}
                onChange={(e) => handleChange("Startdate", e.target.value)}
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => {
                  if (!form.Startdate) e.target.type = "text";
                }}
                className={`${fieldInputClasses} appearance-none`}
              />
              {errors.Startdate && (
                <span className="text-xs text-red-500">{errors.Startdate}</span>
              )}
            </div>
<div>
              <input
                type="text"
                placeholder="End date"
                value={form.Enddate}
                onChange={(e) => handleChange("Enddate", e.target.value)}
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => {
                  if (!form.Enddate) e.target.type = "text";
                }}
                className={`${fieldInputClasses} appearance-none`}
              />
              {errors.Enddate && (
                <span className="text-xs text-red-500">{errors.Enddate}</span>
              )}
            </div>
            <div className="relative col-span-1 md:col-span-2 " ref={notificationDropdownRef}>
                {/* <label className="block font-sans mb-2">Notifications</label> */}
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
            <div className="flex justify-start">               
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
      />
    </div>
  );
};
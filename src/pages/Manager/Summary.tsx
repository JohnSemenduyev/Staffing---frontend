// import React, { useState } from "react";
// import { Eye, Plus, Trash2 } from "lucide-react";
// import { useSearchClient } from "../../hooks/usesearchClient";
// import { useDebounce } from "../../hooks/useDebounce";
// import { useSearchUsers } from "../../hooks/useSearchUser";
// import { GenericTable,TableAction,TableColumn } from "../../components/GenericTable";

// export const Summary = () => {
//   const [form, setForm] = useState({
//     clientId: "",
//     addressId: "",
//     date: "",
//   });

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

//    const tableColumns: TableColumn[] = [
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
//       className: "whitespace-nowrap max-w-[200px]",
//       render: (value: any) => `${value} Mins`
//     }
//   ]; 
//   return (
//     <div className="min-h-screen font-sans w-full p-6">
//       <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100">
//         <h2 className="text-xl font-semibold mb-6">Summary</h2>
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
//             <div className="flex justify-start">
//               <button
//                 type="submit"
//                 disabled={submitLoader}
//                 className="inline-flex items-center px-4 py-1 border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 disabled:cursor-not-allowed font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
//               >
//                 {submitLoader ? (
//                   <>
//                     <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
//                     Loading...
//                   </>
//                 ) : (
//                   <>
//                     <Plus className="w-4 h-4 mr-1" />
//                     Add
//                   </>
//                 )}
//               </button>
//             </div>
//           </div>
//         </form>
//       </div>
//       <GenericTable
//                 data={[]}
//                 columns={tableColumns}
//                 loading={loading}
//                 emptyMessage="No records found matching your search criteria."
//                 searchable={true}
//               />
//     </div>
//   );
// };
import React, { useState } from "react";
import { Eye, Plus, Trash2, Printer, Share2 } from "lucide-react";
import { useSearchClient } from "../../hooks/usesearchClient";
import { useDebounce } from "../../hooks/useDebounce";
import { useSearchUsers } from "../../hooks/useSearchUser";
import { GenericTable,TableAction,TableColumn } from "../../components/GenericTable";

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
  const [auto, setAuto] = useState(false);
  const[loading, setLoading] = useState(false);
  const { data: searchedClients = [], isLoading: loadingClients } =
    useSearchClient(debouncedClientSearch);
  const [userSearch, setUserSearch] = useState("");
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const { data: searchedUsers = [], isLoading: loadingUsers } =
    useSearchUsers(debouncedUserSearch);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const fieldInputClasses =
    "w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition";

  const validate = () => {
    const e: any = {};
    if (!form.clientId) e.clientId = "Required";
    if (!form.addressId) e.addressId = "Required";
    if (!form.date) e.date = "Required";
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
  
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitLoader(true);
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

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    // Add your share logic here
    if (navigator.share) {
      navigator.share({
        title: 'Summary Report',
        text: 'Check out this summary report',
        url: window.location.href,
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
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
    },
    {
      key: "time",
      label: "Hours",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap max-w-[200px]",
      render: (value: any) => `${value} Mins`
    }
  ]; 
  
  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 md:px-6 pt-10">
        <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 mb-2">
          <h2 className="text-xl font-semibold mb-2">
           View Time Summary</h2>
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
              <input
                type="text"
                placeholder="Select date"
                value={form.date}
                onChange={(e) => handleChange("date", e.target.value)}
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => {
                  if (!form.date) e.target.type = "text";
                }}
                className={`${fieldInputClasses} appearance-none`}
              />
              {errors.date && (
                <span className="text-xs text-red-500">{errors.date}</span>
              )}
            </div>

            {/* Submit Button */}
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
      <div className="flex justify-end items-center  mt-4 mb-2">
        <button
          onClick={handlePrint}
          className="inline-flex items-center  py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          title="Print"
        >
          <Printer className="w-5 h-5" />
        </button>
        <button
          onClick={handleShare}
          className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          title="Share"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      <GenericTable
        data={[]}
        columns={tableColumns}
        loading={loading}
        emptyMessage="No records found matching your search criteria."
        searchable={true}
      />
    </div>
  );
};
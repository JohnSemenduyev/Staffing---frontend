import React, { useState } from "react";
import { Eye, Plus, X } from "lucide-react";
import { useSearchClient } from "../../hooks/usesearchClient";
import { useDebounce } from "../../hooks/useDebounce";
import { useSearchUsers } from "../../hooks/useSearchUser";
import { GenericTable,TableAction,TableColumn } from "../../components/GenericTable";
import { inputClasses } from "../Admin/GeoLocationSetup";

export const UniformCompliance = () => {
  const [form, setForm] = useState({
    clientId: "",
    addressId: "",
    userId: "",
    startDate: "",
    endDate: "",
  });

  const data=[
    {
      id: 1,
      guardFirst: { name: "John" },
      guardLast: { name: "Doe" },
      date: "2023-10-01",
      Client: { name: "Client A" },
      address: { address: "123 Main St" },
      images:["src/assets/images/guard1.png", "src/assets/images/guard2.png"]

    },
    {
      id: 2,
      guardFirst: { name: "ane" },
      guardLast: { name: "Smith" },
      date: "2023-10-02",
      Client: { name: "Client B" },
      address: { address: "456 Elm St" },
      images:["src/assets/images/guard1.png", "src/assets/images/guard2.png"]
    }
  ]

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [clientSearch, setClientSearch] = useState("");
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedAddressText, setSelectedAddressText] = useState("");
  const [submitLoader, setSubmitLoader] = useState(false);
  const [auto, setAuto] = useState(false);
  const[loading, setLoading] = useState(false);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedGuard, setSelectedGuard] = useState(null);
  
  const { data: searchedClients = [], isLoading: loadingClients } =
    useSearchClient(debouncedClientSearch);
  const [userSearch, setUserSearch] = useState("");
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const { data: searchedUsers = [], isLoading: loadingUsers } =
    useSearchUsers(debouncedUserSearch);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const fieldInputClasses =
    "w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition";

  const validate = () => {
    const e: any = {};
    if (!form.clientId) e.clientId = "Required";
    if (!form.addressId) e.addressId = "Required";
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

  const handleView = (row: any) => {
    console.log("View action clicked for row:", row);
    setSelectedGuard(row);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedGuard(null);
  };

  const tableActions: TableAction[] = [
    {
      label: "View",
      icon: <Eye className="w-4 h-4" />,
      onClick: handleView,
      className: "text-blue-500 hover:text-green-700",
      title: "View"
    }
  ];

  // Image Modal Component
  const ImageModal = () => {
    if (!showModal || !selectedGuard) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {selectedGuard.guardFirst.name} {selectedGuard.guardLast.name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Client:</span> {selectedGuard.Client.name}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Location:</span> {selectedGuard.address.address}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Date:</span> {selectedGuard.date}
              </p>
            </div>
            
          </div>

          {/* Modal Body - Images */}
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Guard Images</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedGuard.images && selectedGuard.images.length > 0 ? (
                selectedGuard.images.map((image, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    <h1 className="text-center text-lg text-gray-900 p-2 bg-gray-50">
                      {index === 0 ? "Top Image" : `Bottom Image`}
                    </h1>
                    <img
                      src={image}
                      alt={`Guard image ${index + 1}`}
                      className="w-full h-64 object-contain bg-gray-50"
                      onError={(e) => {
      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDElIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzllYTNhOSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
    }}
  />
</div>
                ))
              ) : (
                <div className="col-span-2 text-center py-8">
                  <p className="text-gray-500">No images available</p>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end p-6 border-t border-gray-100">
            <button
              onClick={closeModal}
              className="px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 md:px-6 pt-10">
        <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 mb-2">
          <h2 className="text-xl font-semibold mb-2">
           Uniform Compliance</h2>
        <form onSubmit={onSubmit} autoComplete="off">
          <div className="grid grid-cols-3 gap-4 items-start">
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
                value={form.startDate}
                onChange={(e) => handleChange("startDate", e.target.value)}
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => {
                  if (!form.startDate) e.target.type = "text";
                }}
                className={`${fieldInputClasses} appearance-none`}
              />
              {errors.startDate && (
                <span className="text-xs text-red-500">{errors.startDate}</span>
              )}
            </div>
<div>
              <input
                type="text"
                placeholder="End date"
                value={form.endDate}
                onChange={(e) => handleChange("endDate", e.target.value)}
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => {
                  if (!form.endDate) e.target.type = "text";
                }}
                className={`${fieldInputClasses} appearance-none`}
              />
              {errors.endDate && (
                <span className="text-xs text-red-500">{errors.endDate}</span>
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

      <GenericTable
        data={data || []}
        columns={tableColumns}
        loading={loading}
        actions={tableActions}
        emptyMessage="No records found matching your search criteria."
        searchable={true}
      />

      {/* Image Modal */}
      <ImageModal />
    </div>
  );
};
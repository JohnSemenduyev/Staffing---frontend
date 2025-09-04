import React, { use, useEffect, useState } from "react";
import { Eye, Plus, X, RotateCcw } from "lucide-react";
import { useSearchClient } from "../../hooks/usesearchClient";
import { useDebounce } from "../../hooks/useDebounce";
import { useSearchUsers } from "../../hooks/useSearchUser";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import { inputClasses } from "../Admin/GeoLocationSetup";
import { useUniformCompliance } from "../../context/unifromCompliace";
import ResetButton from "../../components/ui/ResetButton";
import { CustomDatePicker } from "../../components/CustomDatePicker";
import { ErrorMessage } from "../../components/ui/error-message";
import { SearchResultItem, SearchResultsDropdown } from "../../components/ui/search-result-item";
import { formatDateLocal, getWeekRangeFromDateUTC, parseLocalYMD } from "../../lib/utils";

export const UniformCompliance = () => {
  const [form, setForm] = useState({
    clientId: "",
    addressId: "",
    userId: "",
    startDate: "",
    endDate: "",
  });

  // Date constraints state
  const [startDateConstraints, setStartDateConstraints] = useState({ min: "", max: "" });
  const [endDateConstraints, setEndDateConstraints] = useState({ min: "", max: "" });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [clientSearch, setClientSearch] = useState("");
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedAddressText, setSelectedAddressText] = useState("");
  const [submitLoader, setSubmitLoader] = useState(false);
  const [auto, setAuto] = useState(false);
  const [loading, setLoading] = useState(false);

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
  const { uniformCompliances, error, fetchUniformCompliances } = useUniformCompliance();
  const fieldInputClasses =
    "w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition";

  // Week range function (Thursday to Wednesday)


  // Format date to YYYY-MM-DD for input fields
  const formatDateForInput = (date) => {
    return formatDateLocal(date);
  };


  const formatDate = (date: Date | string) => {
    if (typeof date === 'string') {
      // Handle different date formats
      if (!date || date.trim() === '') {
        return '';
      }
      
      // If it's already in YYYY-MM-DD format, convert to MM-DD-YYYY
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-');
        return `${month}-${day}-${year}`;
      }
      
      // If it's already in MM-DD-YYYY format, return as is
      if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
        return date;
      }
      
      // If it has timezone info (like "2024-01-15T00:00:00.000Z"), extract date part and convert
      if (date.includes('T')) {
        const datePart = date.split('T')[0];
        const [year, month, day] = datePart.split('-');
        return `${month}-${day}-${year}`;
      }
      
      // Try to parse as a regular date string
      try {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          console.warn('Invalid date format:', date);
          return '';
        }
        // Convert to MM-DD-YYYY format
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');
        const year = parsedDate.getFullYear();
        return `${month}-${day}-${year}`;
      } catch (error) {
        console.warn('Error parsing date:', date, error);
        return '';
      }
    }
    
    // If it's already a Date object
    if (date instanceof Date) {
      // Convert to MM-DD-YYYY format
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}-${day}-${year}`;
    }
    
    return '';
  };


  const transformComplianceData = (uniformCompliances: any[]) => {
    console.log(uniformCompliances);
    return uniformCompliances.map((item) => ({
      id: `${item.scheduleSessionId}-${item.shiftId}`,
      guardFirst: { name: item.scheduleSession.user.name },
      guardLast: { name: item.scheduleSession.user.lastName },
      date: formatDate(item.shift.date),
      Client: { 
        name: [item.scheduleSession?.client?.name??'', item.scheduleSession?.client?.lastName??'']
          .filter(Boolean)
          .join(' ')
      },
      address: { address: [item.scheduleSession.address.address , item.scheduleSession.address.city , item.scheduleSession.address.state , item.scheduleSession.address.pincode].filter(Boolean).join(', ') },
      images: [item.topUniformImage, item.bottomUniformImage],
    }));
  };

  const tableData = transformComplianceData(uniformCompliances);

  const validate = () => {
    const e: any = {};
    if (!form.clientId) e.clientId = "Required";
    if (!form.addressId) e.addressId = "Required";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (field: string, value: any) => {
    if (field === 'startDate' && value) {
      const selectedDate = new Date(value);
      const weekRange = getWeekRangeFromDateUTC(selectedDate);

      // Set constraints for end date picker - from start date to end of week (future dates)
      setEndDateConstraints({
        min: value, // Start from the selected start date
        max: formatDateForInput(weekRange.endOfWeek)
      });

      setForm((f) => ({
        ...f,
        [field]: value,
      }));
    } else if (field === 'endDate' && value) {
      const selectedDate = new Date(value);
      const weekRange = getWeekRangeFromDateUTC(selectedDate);

      // Set constraints for start date picker - from beginning of week to end date (past dates)
      setStartDateConstraints({
        min: formatDateForInput(weekRange.startOfWeek),
        max: value // End at the selected end date
      });

      setForm((f) => ({
        ...f,
        [field]: value,
      }));
    } else {
      setForm((f) => ({
        ...f,
        [field]: value,
      }));
    }
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleReset = () => {
    // Reset form state
    setForm({
      clientId: "",
      addressId: "",
      userId: "",
      startDate: "",
      endDate: "",
    });

    // Clear errors
    setErrors({});

    // Clear search states
    setClientSearch("");
    setUserSearch("");
    setSelectedAddressText("");

    // Reset date constraints
    setStartDateConstraints({ min: "", max: "" });
    setEndDateConstraints({ min: "", max: "" });

    // Hide dropdowns
    setShowClientDropdown(false);
    setShowUserDropdown(false);
    setShowErrors(false);
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
    const fullClientName = [client.name, client.lastName].filter(Boolean).join(" ");
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
    ].filter(Boolean).join(", ");
    setSelectedAddressText(fullAddress);
  };

  const handleUserSelect = (user: { id: string | number; name: string }) => {
    setForm((f) => ({ ...f, userId: String(user.id) }));
    const fullName = [user.name, (user as any)?.lastName].filter(Boolean).join(" ");
    setUserSearch(fullName || user.name);
    setShowUserDropdown(false);
    setErrors((e) => ({ ...e, userId: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitLoader(true);

    // Calculate full week range from either start or end date
    let weekRange;
    if (form.startDate) {
      weekRange = getWeekRangeFromDateUTC(new Date(form.startDate));
    } else if (form.endDate) {
      weekRange = getWeekRangeFromDateUTC(new Date(form.endDate));
    }

    // Always send full week range to backend (Thursday to Wednesday)
    const backendStartDate = weekRange ? formatDateForInput(weekRange.startOfWeek) : form.startDate;
    const backendEndDate = weekRange ? formatDateForInput(weekRange.endOfWeek) : form.endDate;

    try {
      await fetchUniformCompliances({
        startDate: backendStartDate,
        endDate: backendEndDate,
        addressId: Number(form.addressId),
        clientId: Number(form.clientId),
        userId: Number(form.userId),
      });

      console.log('Sent to backend:', {
        startDate: backendStartDate, // Always Thursday
        endDate: backendEndDate,     // Always Wednesday
        originalUserSelection: { startDate: form.startDate, endDate: form.endDate }
      });
    } catch (error) {
      console.error('Error fetching uniform compliances:', error);

      // Check if it's the specific PostgreSQL cache error
      if (error?.message?.includes('cached plan must not change result type')) {
        alert('Database cache error detected. Please contact your system administrator to clear the database query cache.');
      } else {
        alert('An error occurred while fetching data. Please try again or contact support.');
      }
    } finally {
      setSubmitLoader(false);
    }
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

    },
    {
      key: "Client.name",
      label: "Client Name",
      sortable: true,
      searchable: true,
      searchType: 'text',
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
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzllYTNhOSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-start">
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

                        const initials = `${client.name
                          .charAt(0)
                          .toUpperCase()}${client.lastName
                            ? client.lastName.charAt(0).toUpperCase()
                            : ''}`;

                        return (
                          <div
                            key={`${client.id}-${address.id}`}
                            onMouseDown={() =>
                              handleClientSelect(
                                { id: client.id, name: client.name, lastName: client.lastName },
                                address.id
                              )
                            }
                            className={`p-3 cursor-pointer flex items-center space-x-3 ${isEven ? "bg-white" : "bg-gray-50"
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
                                {[client.name, client.lastName].filter(Boolean).join(' ')}             
                             </div>
                              <div className="text-xs text-gray-500 truncate">
                                {[
                                  address.label || address.address,
                                  (address as any)?.city,
                                  (address as any)?.state,
                                  (address as any)?.pincode,
                                ].filter(Boolean).join(', ')}
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
                className={`${fieldInputClasses} appearance-none bg-gray-50`}
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
              {showErrors && errors.userId && (
                <div className="mt-1 flex items-center text-sm text-red-600">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.userId}
                </div>
              )}
              <SearchResultsDropdown show={showUserDropdown && userSearch.length >= 2}>
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
                value={form.startDate}
                onChange={handleChange}
                placeholder="Select Start Date"
                fieldName="startDate"
                minDate={startDateConstraints.min}
                maxDate={startDateConstraints.max}
                className={`${fieldInputClasses} appearance-none`}
              />
              {errors.startDate && (
                <ErrorMessage message={errors.startDate} />
              )}
            </div>

            <div>
              <CustomDatePicker
                value={form.endDate}
                onChange={handleChange}
                placeholder="Select End Date"
                fieldName="endDate"
                minDate={endDateConstraints.min}
                maxDate={endDateConstraints.max}
                className={`${fieldInputClasses} appearance-none`}
              />
              {errors.endDate && (
                <ErrorMessage message={errors.endDate} />
              )}
            </div>
            {/* Action Buttons */}
            <div className="flex justify-start gap-2">
              <button
                type="submit"
                disabled={submitLoader}
                className="inline-flex items-center px-4 py-1 border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 disabled:cursor-not-allowed font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
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

              {(form.addressId || form.clientId || form.endDate || form.startDate || form.userId) &&
                (<ResetButton onClick={handleReset}
                  disabled={submitLoader} />)}
            </div>
          </div>
        </form>
      </div>

      <GenericTable
        data={tableData || []}
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
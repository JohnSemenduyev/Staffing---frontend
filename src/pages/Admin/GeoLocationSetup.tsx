import React, { useEffect, useState, useCallback } from "react";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { GoPlus } from "react-icons/go";
import { RotateCcw } from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";
import { useSearchClient } from "../../hooks/usesearchClient";
import { GeoLocation, useGeoLocation } from "../../context/GeoLocationContext";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import Pagination from "../../components/Pagination";
import SubmitButton from "../../components/ui/ButtonUi";
import { ErrorMessage } from "../../components/ui/error-message";
import { SearchResultItem, SearchResultsDropdown } from "../../components/ui/search-result-item";
import { Button } from "../../components/ui/button";
import { twMerge } from "tailwind-merge";

// export const inputClasses = ` w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition`;
export const inputClasses = twMerge(
  "w-full text-black placeholder:text-gray-500 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition",
);
export const GeoLocationSetup = () => {
  const [form, setForm] = useState({ clientId: "", addressId: "", distance: "", time: "" });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showErrors, setShowErrors] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; record: any }>({ isOpen: false, record: null });
  const [deleteLoader, setDeleteLoader] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedAddressText, setSelectedAddressText] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  const { data: searchedClients = [], isLoading: loadingClients } = useSearchClient(debouncedClientSearch);
  const { fetchGeoLocations, createGeoLocation, updateGeoLocation, setCurrentPage,loading,setSubmitError,error, lastPage, deleteGeoLocation,currentPage,geoLocations,submitLoader,submitError} = useGeoLocation();

  useEffect(() => {
    fetchGeoLocations(currentPage);
  }, [currentPage]);

  const handleChange = (field: string, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors({});
    setShowErrors(false);
  };
  
  const hasInput = Object.values(form).some((val) => val.trim() !== "");

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

  const validate = () => {
    const e: any = {};
    if (!form.clientId) e.clientId = "Client is required";
    if (!form.addressId) e.addressId = "Address is required";
    if (!form.distance) e.distance = "Distance is required";
    if (!form.time) e.time = "Time is required";
    setErrors(e);
    setShowErrors(true);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setForm({ clientId: "", addressId: "", distance: "", time: "" });
    setClientSearch("");
    setSelectedAddressText("");
    setShowClientDropdown(false);
    setIsEditing(false);
    setEditId(null);
    setErrors({});
    setShowErrors(false);
  };

  const getFieldClasses = (fieldName: string) => {
    const hasError = showErrors && errors[fieldName];
    return `${inputClasses} ${hasError ? 'border-red-500 focus:ring-red-500' : ''}`;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const input = {
      clientId: Number(form.clientId),
      addressId: Number(form.addressId),
      distance: Number(form.distance),
      time: Number(form.time),
    };

    try {
      if (isEditing && editId !== null) {
        await updateGeoLocation(editId, input);
      } else {
        await createGeoLocation(input);
      }
      resetForm();
    } catch (err) {
     console.log(err)
    }finally{
      setSubmitError("");
      console.log(submitError)
    }
  };

  const handleEdit = (record: GeoLocation) => {
    setIsEditing(true);
    setEditId(record.id);
    setForm({
      clientId: String(record.clientId),
      addressId: String(record.addressId),
      distance: String(record.distance ?? ""),
      time: String(record.time ?? ""),
    });
    setClientSearch(record.client.name);
    const fullAddress = [
      record.address.address,
      (record.address as any)?.city,
      (record.address as any)?.state,
      (record.address as any)?.pincode,
    ]
      .filter(Boolean)
      .join(", ");
    setSelectedAddressText(fullAddress);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (record: GeoLocation) => {
    setDeleteModal({ isOpen: true, record });
  };

  const confirmDelete = async () => {
    if (!deleteModal.record) return;

    try {
      setDeleteLoader(true);
      await deleteGeoLocation(deleteModal.record.id);
      fetchGeoLocations(currentPage);
      setDeleteModal({ isOpen: false, record: null });
    } catch (err) {
      console.log("Delete error:", err);
    } finally {
      setDeleteLoader(false);
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, record: null });
    setDeleteLoader(false);
  };

  const tableColumns: TableColumn[] = [
    {
      key: "client.name",
      label: "Client Name",
      sortable: true,
      searchable: true,
      searchType: 'text',
      className: "whitespace-nowrap max-w-[200px]",
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
      label: "Client Location",
      sortable: true,
      searchable: true,
      className: "break-words max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]",
      render: (_: any, row: any) => {
        const a = row.address;
        const full = [a?.address, a?.city, a?.state, a?.pincode].filter(Boolean).join(", ");
        return <div className="truncate" title={full}>{full || "-"}</div>;
      }
    },
    {
      key: "distance",
      label: "Distance",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap max-w-[200px]",
      render: (value: any) => `${value} Mile`
    },
    {
      key: "time",
      label: "Time",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap max-w-[200px]",
      render: (value: any) => `${value} Mins`
    }
  ];

  const tableActions: TableAction[] = [
    {
      label: "Edit",
      icon: <FaRegEdit className="w-4 h-4" color="blue" />,
      onClick: handleEdit,
      className: "text-blue-500 hover:text-green-700 max-w-[100px] text-center",
      title: "Edit"
    },
    {
      label: "Delete",
      icon: <FaRegTrashAlt className="w-4 h-4" />,
      onClick: handleDelete,
      className: "text-red-500 hover:text-red-700",
      title: "Delete"
    }
  ];

  // FIXED: Wrap handleSearch in useCallback to prevent recreating on every render
  const handleSearch = useCallback((formData: { [key: string]: any }) => {
    const filterEntries = Object.entries(formData).filter(
      ([_, v]) => v !== undefined && v !== null && String(v).trim() !== ""
    );

    if (filterEntries.length === 0) {
      setCurrentPage(1);
      fetchGeoLocations(1, null);
      return;
    }
    
    const keyMapping: Record<string, string> = {
      "client.name": "clientName",
      "address.address": "addressText",
      "distance": "distance",
      "time": "time"
    };

     const numericKeys = ["distance", "time"];

    const filter = Object.fromEntries(
      filterEntries.map(([key, value]) => {
        const mappedKey = keyMapping[key] || key;
      const mappedValue = numericKeys.includes(mappedKey)
        ? Number(value)
        : value;
      return [mappedKey, mappedValue];
  })
    );

    setCurrentPage(1);
    fetchGeoLocations(1, filter);
  }, [setCurrentPage, fetchGeoLocations]); 

  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 md:px-6 pt-10">
      {/* Form Section */}
      <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 space-y-2 grid mb-2">
        <h2 className="text-xl font-semibold mb-2">
          {isEditing ? "Edit Geolocation Setup" : "Geolocation Setup"}
        </h2>
        <form onSubmit={onSubmit} autoComplete="off">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            {/* Client Search Input */}
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
                className={inputClasses}
              />
              {showErrors && errors.clientId && (
                <div className="mt-1 flex items-center text-sm text-red-600">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.clientId}
                </div>
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

            {/* Address Display Input */}
            <div>
              <input
                type="text"
                value={selectedAddressText}
                placeholder="Location"
                readOnly
                className={`${inputClasses} appearance-none`}
              />
              {showErrors && errors.addressId && (
                <div className="mt-1 flex items-center text-sm text-red-600">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.addressId}
                </div>
              )}
            </div>

            {/* Distance Input */}
            <div>
              <input
                type="number"
                value={form.distance}
                onChange={(e) => handleChange("distance", e.target.value)}
                placeholder="Enter distance"
                className={getFieldClasses('distance')}
              />
              {showErrors && errors.distance && (
                <ErrorMessage message={errors.distance} />
              )}
            </div>

            {/* Time Input */}
            <div>
              <input
                type="number"
                value={form.time}
                onChange={(e) => handleChange("time", e.target.value)}
                placeholder="Enter time"
                min="0"
                className={getFieldClasses('time')}
              />
              {showErrors && errors.time && (
                <ErrorMessage message={errors.time} />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-start gap-2">
              <SubmitButton
                loading={submitLoader}
                disabled={submitLoader}
                icon={isEditing ? <FaRegEdit className="w-4 h-4 mr-1" color="blue" /> : <GoPlus className="w-4 h-4 mr-1" />}
              >
                {isEditing ? "Update" : "Add"}
              </SubmitButton>
              {hasInput && (
                <Button
                  type="button"
                  onClick={resetForm}
                  disabled={submitLoader}
                  variant="outline"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Display submit error if any */}
          {submitError && (
            <div className="mt-4">
              <ErrorMessage message={submitError} />
            </div>
          )}
        </form>
      </div>

      {/* Table Section */}
      <GenericTable
        data={geoLocations || []}
        columns={tableColumns}
        actions={tableActions}
        loading={loading}
        emptyMessage="No records found matching your search criteria."
        searchable={true}
        onSearch={handleSearch}
      />

      {/* Pagination Section */}
      <div className="mt-6">
        <Pagination
          currentPage={currentPage}
          lastPage={lastPage}
          onPageChange={(page) => {
            setCurrentPage(page);
            fetchGeoLocations(page);
          }}
          loading={loading}
        />
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Geolocation Setup
              </h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this geolocation setup? This action cannot be undone.
              </p>
            </div>
            <div className="flex space-x-3 justify-end">
              <button
                type="button"
                onClick={cancelDelete}
                disabled={deleteLoader}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteLoader}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {deleteLoader ? (
                  <>
                    <svg 
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                    >
                      <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                      ></circle>
                      <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
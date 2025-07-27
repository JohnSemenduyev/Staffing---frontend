import React, { useEffect, useState } from "react";
import {  Edit, Plus, Trash2 } from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";
import { useSearchClient } from "../../hooks/usesearchClient";
import { GeoLocation, useGeoLocation } from "../../context/GeoLocationContext";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import Pagination from "../../components/Pagination";
import SubmitButton from "../../components/ui/ButtonUi";
import { toast } from "sonner";

export const GeoLocationSetup = () => {
  // Form state
  const [form, setForm] = useState({ clientId: "", addressId: "", distance: "", time: "" });
  
  // Component state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; record: any }>({ isOpen: false, record: null });
  const [deleteLoader, setDeleteLoader] = useState(false);
  
  // Search states
  const [clientSearch, setClientSearch] = useState("");
  const [selectedAddressText, setSelectedAddressText] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  
  // Hooks
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  const { data: searchedClients = [], isLoading: loadingClients } = useSearchClient(debouncedClientSearch);
  const { 
    fetchGeoLocations, 
    createGeoLocation, 
    updateGeoLocation, 
    setCurrentPage, 
    loading, 
    error, 
    lastPage, 
    deleteGeoLocation, 
    currentPage, 
    geoLocations, 
    submitLoader, 
    submitError 
  } = useGeoLocation();

  const fieldInputClasses = "w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition";

  useEffect(() => {
    fetchGeoLocations(currentPage);
  }, [currentPage]);

  const handleChange = (field: string, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleClientSelect = (client: { id: string | number; name: string }, addressId: number | string) => {
    setForm((f) => ({ ...f, clientId: String(client.id), addressId: String(addressId) }));
    setClientSearch(client.name);
    setShowClientDropdown(false);
    setErrors((e) => ({ ...e, clientId: undefined, addressId: undefined }));
    const selectedClient = searchedClients.find((c) => String(c.id) === String(client.id));
    const selectedAddress = selectedClient?.addresses.find((a) => String(a.id) === String(addressId));
    setSelectedAddressText(selectedAddress?.address || "");
  };

  const validate = () => {
    const e: any = {};
    if (!form.clientId) e.clientId = "Required";
    if (!form.addressId) e.addressId = "Required";
    if (!form.distance) e.distance = "Required";
    if (!form.time) e.time = "Required";
    setErrors(e);
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
        toast.success("Geolocation updated successfully");
      } else {
        await createGeoLocation(input);
        toast.success("Geolocation created successfully");
      }
      resetForm();
      fetchGeoLocations(currentPage);
    } catch (err) {
      toast.error("Failed to save geolocation");
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
    setSelectedAddressText(record.address.address);
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
      toast.success("Geolocation deleted successfully");
      fetchGeoLocations(currentPage);
      setDeleteModal({ isOpen: false, record: null });
    } catch (err) {
      toast.error("Failed to delete geolocation");
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
      className: "whitespace-nowrap"
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
      key: "distance",
      label: "Distance",
      sortable: true,
      className: "whitespace-nowrap",
      render: (value: any) => `${value} Mile`
    },
    {
      key: "time",
      label: "Time",
      sortable: true,
      className: "whitespace-nowrap",
      render: (value: any) => `${value} Mins`
    }
  ];

  const tableActions: TableAction[] = [
    {
      label: "Edit",
      icon: <Edit className="w-4 h-4" />,
      onClick: handleEdit,
      className: "text-blue-500 hover:text-green-700",
      title: "Edit"
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-4 h-4" />,
      onClick: handleDelete,
      className: "text-red-500 hover:text-red-700",
      title: "Delete"
    }
  ];

  return (
    <div className="min-h-screen p-6 font-sans">
      {/* Form Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          {isEditing ? "Edit Geolocation Setup" : "Geolocation Setup"}
        </h2>
        <form onSubmit={onSubmit} autoComplete="off">
          <div className="grid grid-cols-4 gap-4 items-start">
            <div className="relative">
              <input
                type="text"
                value={clientSearch}
                onFocus={() => setShowClientDropdown(true)}
                onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setForm((f) => ({ ...f, clientId: "", addressId: "" }));
                  setSelectedAddressText("");
                }}
                placeholder="Client Name"
                className={fieldInputClasses}
              />
              {errors.clientId && <span className="text-xs text-red-500">{errors.clientId}</span>}
              {errors.addressId && <span className="text-xs text-red-500 block">{errors.addressId}</span>}
              {showClientDropdown && clientSearch.length >= 2 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto z-50 font-sans">
                  {loadingClients ? (
                    <div className="p-2 text-sm text-gray-500">Searching clients...</div>
                  ) : searchedClients.length === 0 ? (
                    <div className="p-2 text-gray-500 text-sm">No clients found</div>
                  ) : (
                    searchedClients.flatMap((client, clientIndex) =>
                      client.addresses.map((address, addressIndex) => {
                        const isEven = (clientIndex + addressIndex) % 2 === 0;
                        return (
                          <div
                            key={`${client.id}-${address.id}`}
                            onMouseDown={() => handleClientSelect({ id: client.id, name: client.name }, address.id)}
                            className={`p-4 cursor-pointer text-sm ${isEven ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}
                          >
                            <div className="font-semibold text-gray-600 text-base">{client.name}</div>
                            <div className="text-xs text-gray-500">{address.label || address.address}</div>
                          </div>
                        );
                      })
                    )
                  )}
                </div>
              )}
            </div>
            
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
                type="number"
                value={form.distance}
                onChange={(e) => handleChange("distance", e.target.value)}
                placeholder="Enter distance"
                min="0"
                className={`${fieldInputClasses}`}
              />
              {errors.distance && <span className="text-xs text-red-500">{errors.distance}</span>}
            </div>
            
            <div>
              <input
                type="number"
                value={form.time}
                onChange={(e) => handleChange("time", e.target.value)}
                placeholder="Enter time"
                min="0"
                className={`${fieldInputClasses} appearance-none`}
              />
              {errors.time && <span className="text-xs text-red-500">{errors.time}</span>}
            </div>
            
            <div className="flex justify-start">
              <SubmitButton
                loading={submitLoader}
                disabled={submitLoader}
                icon={isEditing ? <Edit className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              >
                {isEditing ? "Update" : "Add"}
              </SubmitButton>
            </div>
          </div>
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
        />
        
        {lastPage > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              lastPage={lastPage}
              onPageChange={(page) => {
                setCurrentPage(page);
                fetchGeoLocations(page);
              }}
            />
          </div>
        )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Delete Geolocation</h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this geolocation setup? This action cannot be undone.
              </p>
              {deleteModal.record && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-900">
                    {deleteModal.record.client?.name || "Unknown Client"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {deleteModal.record.address?.address || "Unknown Location"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Distance: {deleteModal.record.distance} Mile | Time: {deleteModal.record.time} Mins
                  </p>
                </div>
              )}
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
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
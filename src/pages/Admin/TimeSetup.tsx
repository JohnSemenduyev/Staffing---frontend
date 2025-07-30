import React, { useState, useEffect } from "react";
import { Plus, AlertTriangle, RotateCcw } from "lucide-react";
import ToggleSwitch from "../../components/ui/toggle";
import { useSearchClient } from "../../hooks/usesearchClient";
import { useDebounce } from "../../hooks/useDebounce";
import { useTimeSetupContext } from "../../context/TimeStemp";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import { Edit, Trash2 } from "lucide-react";
import Pagination from "../../components/Pagination";
import SubmitButton from "../../components/ui/ButtonUi";
import { toast } from "sonner";
import { inputClasses } from "./GeoLocationSetup";

export const TimeSetup = () => {
  const [form, setForm] = useState({
    clientId: "",
    addressId: "",
    distance: "",
    time: "",
    hours: "",
    reminder: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showErrors, setShowErrors] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedAddressText, setSelectedAddressText] = useState("");
  const [submitLoader, setSubmitLoader] = useState(false);
  const [overlap, setOverlap] = useState(false);
  const [unscheduledTime, setUnscheduledTime] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; record: any }>({ isOpen: false, record: null });
  const [deleteLoader, setDeleteLoader] = useState(false);
  const { timeSetups,createTimeSetup, updateTimeSetup, deleteTimeSetup, currentPage, lastPage, fetchTimeSetups, setCurrentPage , loading } = useTimeSetupContext();
  const { data: searchedClients = [], isLoading: loadingClients } = useSearchClient(debouncedClientSearch);

  const getFieldClasses = (fieldName: string) => {
    const baseClasses = "w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition";
    const errorClasses = "border-red-500 focus:ring-red-500 focus:border-red-500";
    const normalClasses = "border-gray-300";
    
    return `${baseClasses} ${showErrors && errors[fieldName] ? errorClasses : normalClasses}`;
  };

  const validate = () => {
    const e: any = {};
    if (!form.clientId) e.clientId = "Client is required";
    if (!form.addressId) e.addressId = "Address is required";
    if (!form.distance) e.distance = "Distance is required";
    if (!form.time) e.time = "Scheduled time is required";
    if (!form.hours) e.hours = "Weekly hours is required";
    if (!form.reminder) e.reminder = "Reminder time is required";
    setErrors(e);
    setShowErrors(true);
    return Object.keys(e).length === 0;
  };

  useEffect(() => {
  fetchTimeSetups(currentPage);
}, [currentPage]);

  const handleChange = (field: string, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors({});
    setShowErrors(false);
  };

  const handleClientSelect = (client: { id: string | number; name: string }, addressId: number | string) => {
    setForm((f) => ({
      ...f,
      clientId: String(client.id),
      addressId: String(addressId),
    }));
    setClientSearch(client.name);
    setShowClientDropdown(false);
    setErrors({});
    setShowErrors(false);

    const selectedClient = searchedClients.find((c) => String(c.id) === String(client.id));
    const selectedAddress = selectedClient?.addresses.find((a) => String(a.id) === String(addressId));
    setSelectedAddressText(selectedAddress?.address || "");
  };

  const onSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!validate()) return;
  setSubmitLoader(true);
  try {
    const payload = {
      clientId: Number(form.clientId),
      addressId: Number(form.addressId),
      distance: form.distance !== "" ? Number(form.distance) : 0,
      actualScheduledTime: form.time !== "" ? Number(form.time) : 0,
      weeklyHours: form.hours !== "" ? Number(form.hours) : 0,
      reminderTime: form.reminder !== "" ? Number(form.reminder) : 0,
      overlap: overlap,
      unscheduledTime: unscheduledTime,
    };

    if (editId) {
      await updateTimeSetup(editId, payload);
      toast.success("Time setup updated successfully!");
    } else {
      await createTimeSetup(payload);
      toast.success("Time setup created successfully!");
    }
    
    resetForm();
    fetchTimeSetups(currentPage);
  
}catch (error) {
    console.error("Error creating time setup:", error);
    toast.error("Failed to save time setup.");
  } finally {
    setSubmitLoader(false);
  }
};
   
 const resetForm = () => {
    setForm({
      clientId: "",
      addressId: "",
      distance: "",
      time: "",
      hours: "",
      reminder: "",
    });
    setClientSearch("");
    setSelectedAddressText("");
    setShowClientDropdown(false);
    setOverlap(false);
    setUnscheduledTime(false);
    setEditId(null);
    setErrors({});
    setShowErrors(false);
  }

  const handleEdit = (record: any) => {
    setEditId(record.id);
    setForm({
      clientId: String(record.client.id),
      addressId: String(record.address.id),
      distance: String(record.distance),
      time: String(record.actualScheduledTime),
      hours: String(record.weeklyHours),
      reminder: String(record.reminderTime),
    });
    setClientSearch(record.client.name);
    setSelectedAddressText(record.address.label || record.address.address || "");
    setOverlap(record.overlap);
    setUnscheduledTime(record.unscheduledTime);
    setErrors({});
    setShowErrors(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (record: any) => {
    setDeleteModal({ isOpen: true, record });
  };

  const confirmDelete = async () => {
    if (!deleteModal.record) return;

    try {
      setDeleteLoader(true);
      await deleteTimeSetup(deleteModal.record.id);
      toast.success("Time setup deleted successfully!");
      fetchTimeSetups(currentPage);
      setDeleteModal({ isOpen: false, record: null });
    } catch (err) {
      console.error("Failed to delete time setup:", err);
      toast.error("Failed to delete time setup.");
    } finally {
      setDeleteLoader(false);
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, record: null });
    setDeleteLoader(false);
  };

  const tableColumns: TableColumn[] = [
    { key: "client.name", label: "Client Name", sortable: true, searchable: true },
    { key: "address.address", label: "Client Location", sortable: true, searchable: true },
    { key: "distance", label: "Distance (Miles)", sortable: true, render: (v) => `${v} Mile` },
    { key: "actualScheduledTime", label: "Scheduled Time", sortable: true, render: (v) => `${v} Hr` },
    { key: "weeklyHours", label: "Weekly Hours", sortable: true, render: (v) => `${v} Hr` },
    { key: "reminderTime", label: "Reminder Time", sortable: true, render: (v) => `${v} Min` },
     {
  key: "overlap",
  label: "Overlap", 
  sortable: false,
  searchable: false,
  className: "whitespace-nowrap",
  render: (value: boolean) => (
    <label className="inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        readOnly
        className="sr-only peer"
      />
      <div className="w-10 h-5 bg-gray-300 peer-checked:bg-[#004175] rounded-full relative transition-colors duration-300">
        <div className="w-4 h-4 bg-white rounded-full shadow absolute top-0.5 left-0.5 peer-checked:translate-x-5 transition-transform duration-300" />
      </div>
    </label>
  )
},
    {
      key: "unscheduledTime", label: "Unscheduled Time", sortable: false, render: (v) => (
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={v}
            readOnly
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-gray-300 peer-checked:bg-[#004175] rounded-full relative transition-colors duration-300">
            <div className="w-4 h-4 bg-white rounded-full shadow absolute top-0.5 left-0.5 peer-checked:translate-x-5 transition-transform duration-300" />
          </div>
        </label>
      )
    },
  ];

  const tableActions: TableAction[] = [
    { label: "Edit", icon: <Edit className="w-4 h-4" />, onClick: handleEdit, className: "text-blue-500 hover:text-green-700" },
    { label: "Delete", icon: <Trash2 className="w-4 h-4" />, onClick: handleDelete, className: "text-red-500 hover:text-red-700" },
  ];

  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 md:px-6 pt-10">
        <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 mb-1">
        <h2 className="text-xl font-semibold mb-2">
          {editId ? "Edit Time Setup" : "Add Time Setup"}
        </h2>
        <form onSubmit={onSubmit} autoComplete="off">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
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
                  setErrors({});
                  setShowErrors(false);
                }}
                placeholder="Client Name"
                className={getFieldClasses('clientId')}
              />
              {showErrors && errors.clientId && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  <span>{errors.clientId}</span>
                </div>
              )}
              {showClientDropdown && clientSearch.length >= 2 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto z-50">
                  {loadingClients ? (
                    <div className="p-2 text-sm text-gray-500">Searching clients...</div>
                  ) : searchedClients.length === 0 ? (
                    <div className="p-2 text-gray-500 text-sm">No clients found</div>
                  ) : (
                    searchedClients.flatMap((client, ci) =>
                      client.addresses.map((address, ai) => (
                        <div
                          key={`${client.id}-${address.id}`}
                          onMouseDown={() =>
                            handleClientSelect({ id: client.id, name: client.name }, address.id)
                          }
                          className={`p-4 cursor-pointer text-sm ${((ci + ai) % 2 === 0) ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}
                        >
                          <div className="font-semibold text-gray-600 text-base">{client.name}</div>
                          <div className="text-xs text-gray-500">{address.label || address.address}</div>
                        </div>
                      ))
                    )
                  )}
                </div>
              )}
            </div>
            <div>
              <input type="text" value={selectedAddressText} placeholder="Location" readOnly className={`${getFieldClasses('addressId')} bg-gray-50`} />
              {showErrors && errors.addressId && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  <span>{errors.addressId}</span>
                </div>
              )}
            </div>
            <div>
              <input type="number" value={form.distance} onChange={(e) => handleChange("distance", e.target.value)} placeholder="Enter distance" min="0" className={getFieldClasses('distance')} />
              {showErrors && errors.distance && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  <span>{errors.distance}</span>
                </div>
              )}
            </div>
            <div>
              <input type="number" value={form.time} onChange={(e) => handleChange("time", e.target.value)} placeholder="Actual/Scheduled Time" min="0" className={getFieldClasses('time')} />
              {showErrors && errors.time && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  <span>{errors.time}</span>
                </div>
              )}
            </div>
            <div>
              <input type="number" value={form.hours} onChange={(e) => handleChange("hours", e.target.value)} placeholder="Weekly Hours" min="0" className={getFieldClasses('hours')} />
              {showErrors && errors.hours && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  <span>{errors.hours}</span>
                </div>
              )}
            </div>
            <div>
              <input type="number" value={form.reminder} onChange={(e) => handleChange("reminder", e.target.value)} placeholder="Reminder" min="0" className={getFieldClasses('reminder')} />
              {showErrors && errors.reminder && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  <span>{errors.reminder}</span>
                </div>
              )}
            </div>
            <ToggleSwitch enabled={overlap} onToggle={setOverlap} label="Overlap" />
            <ToggleSwitch enabled={unscheduledTime} onToggle={setUnscheduledTime} label="Unscheduled Time" />
            
            {/* Submit and Reset Buttons */}
            <div className="flex items-center gap-2 col-span-1 md:col-span-2">
              <SubmitButton
                loading={submitLoader}
                disabled={submitLoader}
                icon={<Plus className="w-4 h-4 mr-1" />}
              >
                {editId ? "Update" : "Add"}
              </SubmitButton>
              <button
                type="button"
                onClick={resetForm}
                disabled={submitLoader}
      className="inline-flex items-center px-4 py-1 border border-blue-600 bg-transparent text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 disabled:cursor-not-allowed font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Table Section */}
        <GenericTable
          data={timeSetups || []}
          columns={tableColumns}
          actions={tableActions}
          loading={loading}
          emptyMessage="No time setup records found."
          searchable={true}
        />

        {lastPage > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              lastPage={lastPage}
              onPageChange={(page) => {
                setCurrentPage(page);
                fetchTimeSetups(page);
              }}
            />
          </div>
        )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this time setup?
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
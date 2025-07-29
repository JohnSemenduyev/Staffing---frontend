import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import ToggleSwitch from "../../components/ui/toggle";
import { useSearchClient } from "../../hooks/usesearchClient";
import { useDebounce } from "../../hooks/useDebounce";
import { useTimeSetupContext } from "../../context/TimeStemp";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import { Edit, Trash2 } from "lucide-react";
import Pagination from "../../components/Pagination";
import SubmitButton from "../../components/ui/ButtonUi";
import { toast } from "sonner";

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
  const [clientSearch, setClientSearch] = useState("");
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedAddressText, setSelectedAddressText] = useState("");
  const [submitLoader, setSubmitLoader] = useState(false);
  const [overlap, setOverlap] = useState(false);
  const [unscheduledTime, setUnscheduledTime] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; record: any }>({ isOpen: false, record: null });
  const [deleteLoader, setDeleteLoader] = useState(false);

  const { timeSetups,createTimeSetup, updateTimeSetup, deleteTimeSetup, currentPage, lastPage, fetchTimeSetups, setCurrentPage , loading } = useTimeSetupContext();
  const { data: searchedClients = [], isLoading: loadingClients } = useSearchClient(debouncedClientSearch);

  const fieldInputClasses =
    "w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition";

  const validate = () => {
    const e: any = {};
    if (!form.clientId) e.clientId = "Required";
    if (!form.addressId) e.addressId = "Required";
    if (!form.distance) e.distance = "Required";
    if (!form.time) e.time = "Required";
    if (!form.hours) e.hours = "Required";
    if (!form.reminder) e.reminder = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  useEffect(() => {
  fetchTimeSetups(currentPage);
}, [currentPage]);

  const handleChange = (field: string, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleClientSelect = (client: { id: string | number; name: string }, addressId: number | string) => {
    setForm((f) => ({
      ...f,
      clientId: String(client.id),
      addressId: String(addressId),
    }));
    setClientSearch(client.name);
    setShowClientDropdown(false);
    setErrors((e) => ({ ...e, clientId: undefined, addressId: undefined }));

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
    setClientSearch("");
    setSelectedAddressText("");
    setOverlap(false);
    setUnscheduledTime(false);
    setEditId(null);
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
    setEditId(null);
    setErrors({});
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
    <div className="min-h-screen p-6 font-sans">
      {/* Form Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          {editId ? "Edit Time Setup" : "Add Time Setup"}
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
            <input type="text" value={selectedAddressText} placeholder="Location" readOnly className={`${fieldInputClasses} bg-gray-50`} />
            <input type="number" value={form.distance} onChange={(e) => handleChange("distance", e.target.value)} placeholder="Enter distance" min="0" className={fieldInputClasses} />
            <input type="number" value={form.time} onChange={(e) => handleChange("time", e.target.value)} placeholder="Actual/Scheduled Time" min="0" className={fieldInputClasses} />
            <input type="number" value={form.hours} onChange={(e) => handleChange("hours", e.target.value)} placeholder="Weekly Hours" min="0" className={fieldInputClasses} />
            <input type="number" value={form.reminder} onChange={(e) => handleChange("reminder", e.target.value)} placeholder="Reminder" min="0" className={fieldInputClasses} />
            <ToggleSwitch enabled={overlap} onToggle={setOverlap} label="Overlap" />
            <ToggleSwitch enabled={unscheduledTime} onToggle={setUnscheduledTime} label="Unscheduled Time" />
            <SubmitButton loading={submitLoader} disabled={submitLoader} icon={<Plus className="w-4 h-4 mr-1" />}>
              {editId ? "Update" : "Add"}
            </SubmitButton>
          </div>
        </form>
      </div>

      {/* Table Section */}
      <div>
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
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Delete Time Setup</h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this time setup? This action cannot be undone.
              </p>
              {deleteModal.record && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-900">
                    {deleteModal.record.client?.name || "Unknown Client"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {deleteModal.record.address?.address || "Unknown Location"}
                  </p>
                  <div className="text-xs text-gray-500 mt-1 space-y-1">
                    <p>Distance: {deleteModal.record.distance} Mile | Time: {deleteModal.record.actualScheduledTime} Hr</p>
                    <p>Weekly Hours: {deleteModal.record.weeklyHours} Hr | Reminder: {deleteModal.record.reminderTime} Min</p>
                  </div>
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
import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import ToggleSwitch from "../../components/ui/toggle";
import { useSearchClient } from "../../hooks/usesearchClient";
import { useDebounce } from "../../hooks/useDebounce";
import { useTimeSetupContext } from "../../context/TimeStemp";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import { Edit, Trash2 } from "lucide-react";
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

  const [editId, setEditId] = useState<number | null>(null); // ← Track editing

  const { data: searchedClients = [], isLoading: loadingClients } = useSearchClient(debouncedClientSearch);
  const { timeSetups, createTimeSetup, updateTimeSetup, deleteTimeSetup, refreshTimeSetups } = useTimeSetupContext();

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
    setOverlap(false);
    setUnscheduledTime(false);
    setEditId(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitLoader(true);

    const payload = {
      clientId: Number(form.clientId),
      addressId: Number(form.addressId),
      distance: form.distance !== "" ? Number(form.distance) : 0,
      actualScheduledTime: form.time !== "" ? Number(form.time) : 0,
      weeklyHours: form.hours !== "" ? Number(form.hours) : 0,
      reminderTime: form.reminder !== "" ? Number(form.reminder) : 0,
      overlap,
      unscheduledTime,
    };

    try {
      if (editId !== null) {
        await updateTimeSetup(editId, payload);
        toast.success("Time setup updated successfully!");
      } else {
        await createTimeSetup(payload);
        toast.success("Time setup created successfully!");
      }
      resetForm();
    } catch (error) {
      console.error("Error saving time setup:", error);
      toast.error("Failed to save time setup.");
    } finally {
      setSubmitLoader(false);
    }
  };

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  }, []);

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
    setSelectedAddressText(record.address.label || "");
    setOverlap(record.overlap);
    setUnscheduledTime(record.unscheduledTime);
  };

  const handleDelete = async (record: any) => {
    const confirm = window.confirm("Are you sure you want to delete this time setup?");
    if (!confirm) return;

    try {
      await deleteTimeSetup(record.id);
      toast.success("Time setup deleted successfully!");
      refreshTimeSetups();
    } catch (err) {
      console.error("Failed to delete time setup:", err);
      toast.error("Failed to delete time setup.");
    }
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
      key: "unscheduledTime", label: "Unscheduled Time", render: (v) => (
        <input type="checkbox" checked={v} readOnly />
      )
    },
  ];

  const tableActions: TableAction[] = [
    { label: "Edit", icon: <Edit className="w-4 h-4" />, onClick: handleEdit, className: "text-blue-500" },
    { label: "Delete", icon: <Trash2 className="w-4 h-4" />, onClick: handleDelete, className: "text-red-500" },
  ];

  return (
    <div className="min-h-screen p-6 font-sans">
      <div className="w-full px-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
      </div>
      <GenericTable
        data={timeSetups || []}
        columns={tableColumns}
        actions={tableActions}
        loading={loading}
        emptyMessage="No time setup records found."
        searchable={true}
      />
    </div>
  );
};

import React, { useState, useEffect, useMemo } from "react";
import { GoPlus } from "react-icons/go";
import { AlertTriangle, RotateCcw, Search } from "lucide-react";
import ToggleSwitch from "../../components/ui/toggle";
import { useSearchClient } from "../../hooks/usesearchClient";
import { useDebounce } from "../../hooks/useDebounce";
import { useTimeSetupContext } from "../../context/TimeStemp";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import Pagination from "../../components/Pagination";
import SubmitButton from "../../components/ui/ButtonUi";
import { inputClasses } from "./GeoLocationSetup";
import { ErrorMessage } from "../../components/ui/error-message";
import { GenericSearchForm, FieldConfig } from "../../components/GenericFormSearch";
import { useToast } from "../../hooks/use-toast";
import { SearchResultItem, SearchResultsDropdown } from "../../components/ui/search-result-item";
import { Button } from "../../components/ui/button";

export const TimeSetup = () => {
  const [form, setForm] = useState({
    clientId: "",
    addressId: "",
    distance: "",
    time: "",
    hours: "",
    reminder: "",
  });
  const {toast} = useToast();
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
  const { timeSetups, createTimeSetup,error, updateTimeSetup, deleteTimeSetup, currentPage, lastPage, fetchTimeSetups, setCurrentPage, loading } = useTimeSetupContext();
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
      } else {
        await createTimeSetup(payload);
      }
      resetForm();
      fetchTimeSetups(currentPage);

    } catch (error) {
      console.error("Error creating time setup:", error);
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
    const fullAddress = [
      record.address.address,
      (record.address as any)?.city,
      (record.address as any)?.state,
      (record.address as any)?.pincode,
    ]
      .filter(Boolean)
      .join(", ");
    setSelectedAddressText(fullAddress);
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
      toast({ title: "success", description: "Time setup deleted successfully" });
      fetchTimeSetups(currentPage);
      setDeleteModal({ isOpen: false, record: null });
    } catch (err) {
      console.error("Failed to delete time setup:", err);
      toast({ title: "error", description: "Failed to delete time setup" });
    } finally {
      setDeleteLoader(false);
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, record: null });
    setDeleteLoader(false);
  };
  const hasInput = Object.values(form).some((val) => val.trim() !== "");

  const tableColumns: TableColumn[] = [
   {
      key: "client.name",
      label: "Client Name",
      sortable: true,
      searchable: true,
      searchType: 'text',
      width: "250px",
      height:"40px",
       render: (_: any, row: any) => {
        const a = row.client;
        const full = [a?.name??"" , a?.lastName??""].filter(Boolean).join(" ");
        return <div className="truncate" title={full}>{full || "-"}</div>;
      }
    },
    { key: "address.address",
      label: "Client Location", sortable: true, searchable: true, width: "250px", height: "40px",
      render: (_: any, row: any) => {
        const a = row.address;
        const full = [a?.address, a?.city, a?.state, a?.pincode].filter(Boolean).join(", ");
        return <div className="truncate" title={full}>{full || "-"}</div>;
      }
    },
    { key: "distance", label: "Distance (Miles)", sortable: true, render: (v) => `${v} Mile`, searchable: true, width: "250px", height: "40px" },
    { key: "actualScheduledTime", label: "Scheduled Time", sortable: true, render: (v) => `${v} Min`, searchable: true, width: "250px", height: "40px" },
    { key: "weeklyHours", label: "Weekly Hours", sortable: true, render: (v) => `${v} Hr`, searchable: true, width: "250px", height: "40px" },
    { key: "reminderTime", label: "Reminder Time", sortable: true, render: (v) => `${v} Hr`, searchable: true, width: "250px", height: "40px" },
    {
      key: "overlap",
      label: "Overlap",
      sortable: false,
      searchable: false,
      width: "250px",
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
      key: "unscheduledTime", label: "Unscheduled Time", width: "250px", sortable: false, searchable: false, render: (v) => (
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
    { label: "Edit", icon: <FaRegEdit className="w-4 h-4" />, onClick: handleEdit, className: "text-blue-500 hover:text-green-700" },
    { label: "Delete", icon: <FaRegTrashAlt className="w-4 h-4" />, onClick: handleDelete, className: "text-red-500 hover:text-red-700" },
  ];
const handleSearch = (formData: { [key: string]: any }) => {
  const filterEntries = Object.entries(formData).filter(
    ([_, v]) => v !== undefined && v !== null && String(v).trim() !== ""
  );

  if (filterEntries.length === 0) {
    setCurrentPage(1);
    fetchTimeSetups(1, null);
    return;
  }
  const keyMapping: Record<string, string> = {
    "client.name": "clientName",
    "address.address": "addressText",
  };

  const numericKeys = ["distance", "actualScheduledTime", "weeklyHours", "reminderTime"];

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
  fetchTimeSetups(1, filter);
};


  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 md:px-6 pt-10">

      <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 space-y-2 grid mb-1">
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
              {errors.clientId && (
                <ErrorMessage message={errors.clientId} />
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
            <div>
              <input type="text" value={selectedAddressText} placeholder="Location" readOnly className={`${getFieldClasses('addressId')} bg-gray-50`} />
              {showErrors && errors.addressId && (
                <ErrorMessage message={errors.addressId} />
              )}
            </div>
            <div>
              <input type="number" step="any" value={form.distance} onChange={(e) => handleChange("distance", e.target.value)} placeholder="Enter distance" min="0" className={getFieldClasses('distance')} />
              {showErrors && errors.distance && (
                <ErrorMessage message={errors.distance} />
              )}
            </div>
            <div>
              <input type="number" step="any" value={form.time} onChange={(e) => handleChange("time", e.target.value)} placeholder="Actual/Scheduled Time" min="0" className={getFieldClasses('time')} />
              {showErrors && errors.time && (
                <ErrorMessage message={errors.time} />
              )}
            </div>
            <div>
              <input type="number" step="any" value={form.hours} onChange={(e) => handleChange("hours", e.target.value)} placeholder="Weekly Hours" min="0" className={getFieldClasses('hours')} />
              {showErrors && errors.hours && (
                <ErrorMessage message={errors.hours} />
              )}
            </div>
            <div>
              <input type="number" step="any" value={form.reminder} onChange={(e) => handleChange("reminder", e.target.value)} placeholder="Reminder" min="0" className={getFieldClasses('reminder')} />
              {showErrors && errors.reminder && (
                <ErrorMessage message={errors.reminder} />
              )}
            </div>
            <ToggleSwitch enabled={overlap} onToggle={setOverlap} label="Overlap" />
            <ToggleSwitch enabled={unscheduledTime} onToggle={setUnscheduledTime} label="Unscheduled Time" />

            {/* Submit and Reset Buttons */}
            <div className="flex items-center gap-2 col-span-1 md:col-span-2">
              <SubmitButton
                loading={submitLoader}
                disabled={submitLoader}
                icon={<GoPlus className="w-4 h-4 mr-1" />}
              >
                {editId ? "Update" : "Add"}
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
        </form>
      </div>
      <GenericTable
        data={timeSetups || []}
        columns={tableColumns}
        actions={tableActions}
        loading={loading}
        emptyMessage="No time setup records found."
        searchable={true}
        onSearch = {handleSearch}

      />

      <div className="mt-6">
        <Pagination
          currentPage={currentPage}
          lastPage={lastPage}
          onPageChange={(page) => {
            setCurrentPage(page);
            fetchTimeSetups(page);
          }}
          loading={loading}
        />
      </div>

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
import React, { useEffect, useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";
import { useSearchClient } from "../../hooks/usesearchClient";
import { useSearchUsers } from "../../hooks/useSearchUser";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import Pagination from "../../components/Pagination";
import SubmitButton from "../../components/ui/ButtonUi";
import { toast } from "sonner";
import { useAssignment } from "../../context/Assignment";
import { inputClasses } from "./GeoLocationSetup";

const notificationOptions = ["Geolocation", "Time Clock", "Weekly Hours", "Scheduling"] as const;
type NotificationOption = (typeof notificationOptions)[number];

export default function AssignmentNew() {
  const {
    assignments,
    lastPage,
    loading,
    fetchAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment,
  } = useAssignment();

  // Form state
  const [form, setForm] = useState({
    userId: "",
    guardId: "",
    clientId: "",
    addressId: "",
    role: "",
    access: "",
    notification: [] as NotificationOption[],
  });

  // Component state
  const [currentPage, setCurrentPage] = useState(1);
  const [editId, setEditId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitLoader, setSubmitLoader] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; record: any }>({ isOpen: false, record: null });
  const [deleteLoader, setDeleteLoader] = useState(false);

  // Search states
  const [clientSearch, setClientSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [guardSearch, setGuardSearch] = useState("");
  const [selectedAddressText, setSelectedAddressText] = useState("");

  // Dropdown visibility states
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showGuardDropdown, setShowGuardDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  // Debounced search values
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const debouncedGuardSearch = useDebounce(guardSearch, 300);

  // Search hooks
  const { data: searchedClients = [], isLoading: loadingClients } = useSearchClient(debouncedClientSearch);
  const { data: searchedUsers = [], isLoading: loadingUsers } = useSearchUsers(debouncedUserSearch);
  const { data: searchedGuards = [], isLoading: loadingGuards } = useSearchUsers(debouncedGuardSearch);

  useEffect(() => {
    fetchAssignments(currentPage);
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

  const handleUserSelect = (user: { id: string | number; name: string }) => {
    setForm(f => ({ ...f, userId: String(user.id) }));
    setUserSearch(user.name);
    setShowUserDropdown(false);
    setErrors(e => ({ ...e, userId: undefined }));
  };

  const handleGuardSelect = (guard: { id: string | number; name: string }) => {
    setForm(f => ({ ...f, guardId: String(guard.id) }));
    setGuardSearch(guard.name);
    setShowGuardDropdown(false);
    setErrors(e => ({ ...e, guardId: undefined }));
  };

  const handleCheckbox = (option: NotificationOption) => {
    setForm(f =>
      f.notification.includes(option)
        ? { ...f, notification: f.notification.filter(n => n !== option) }
        : { ...f, notification: [...f.notification, option] }
    );
    setErrors(e => ({ ...e, notification: undefined }));
  };

  const validate = () => {
    const e: any = {};
    if (!form.clientId) e.clientId = "Required";
    if (!form.userId) e.userId = "Required";
    if (!form.guardId) e.guardId = "Required";
    if (!form.addressId) e.addressId = "Required";
    if (!form.role) e.role = "Required";
    if (!form.access) e.access = "Required";
    if (!form.notification.length) e.notification = "Select at least one notification";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setForm({ clientId: "", addressId: "", userId: "", guardId: "", role: "", access: "", notification: [] });
    setClientSearch("");
    setSelectedAddressText("");
    setUserSearch("");
    setGuardSearch("");
    setShowClientDropdown(false);
    setShowUserDropdown(false);
    setShowGuardDropdown(false);
    setShowNotificationDropdown(false);
    setErrors({});
    setIsEditing(false);
    setEditId(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const input = {
      userId: Number(form.userId),
      guardId: Number(form.guardId),
      clientId: Number(form.clientId),
      addressId: Number(form.addressId),
      role: form.role,
      access: form.access,
      notification: form.notification,
    };

    try {
      setSubmitLoader(true);
      if (isEditing && editId !== null) {
        await updateAssignment(editId, input);
        toast.success("Assignment updated successfully");
      } else {
        await createAssignment(input);
        toast.success("Assignment created successfully");
      }
      resetForm();
      fetchAssignments(currentPage);
    } catch (error) {
      toast.error("Failed to submit assignment");
    } finally {
      setSubmitLoader(false);
    }
  };

  const handleEdit = (record: any) => {
    setIsEditing(true);
    setEditId(record.id);
    setForm({
      clientId: String(record.client?.id || ""),
      addressId: String(record.address?.id || ""),
      userId: String(record.user?.id || ""),
      guardId: String(record.guard?.id || ""),
      role: record.role || "",
      access: record.access || "",
      notification: Array.isArray(record.notification) ? record.notification : [],
    });
    setClientSearch(record.client?.name || "");
    setSelectedAddressText(record.address?.address || record.address?.label || "");
    setUserSearch(record.user?.name || "");
    setGuardSearch(record.guard?.name || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (record: any) => {
    setDeleteModal({ isOpen: true, record });
  };

  const confirmDelete = async () => {
    if (!deleteModal.record) return;

    try {
      setDeleteLoader(true);
      await deleteAssignment(deleteModal.record.id);
      toast.success("Assignment deleted successfully");
      fetchAssignments(currentPage);
      setDeleteModal({ isOpen: false, record: null });
    } catch (err) {
      toast.error("Failed to delete assignment");
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
    width: "300px",
   
  },
  { 
    key: "address.address", 
    label: "Location", 
    sortable: true, 
    searchable: true,
    width: "300px",
    
  },
  { 
    key: "guard.name", 
    label: "Guard Name", 
    sortable: true, 
    searchable: true,
    width: "300px",
    
  },
  { 
    key: "user.name", 
    label: "User Name", 
    sortable: true, 
    searchable: true,
    width: "300px",
   
  },
  { 
    key: "role", 
    label: "Role", 
    sortable: true, 
    searchable: true,
    width: "300px",
    
  },
  { 
    key: "access", 
    label: "Access", 
    sortable: true, 
    searchable: true,
    width: "300px",
    
  },
  {
    key: "notification",
    label: "Notifications",
    sortable: false,
    width: "400px",

    render: (value: NotificationOption[] | null | undefined) =>
      Array.isArray(value) && value.length > 0 ? value.join(", ") : "-",
  },
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
    <div className="min-h-screen p-6 font-sans max-w-full overflow-hidden">
      <div className="w-full ">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 w-full">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            {isEditing ? "Edit Assignment" : "Add Assignment"}
          </h2>
          <form onSubmit={onSubmit} autoComplete="off">
            <div className="grid grid-cols-4 gap-4 items-start w-full">
              {/* Client Search */}
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
                  className={inputClasses}
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
              
              {/* Location (read-only) */}
              <div>
                <input
                  type="text"
                  value={selectedAddressText}
                  placeholder="Location"
                  readOnly
                  className={`${inputClasses} appearance-none bg-gray-50`}
                />
              </div>
              
              {/* User Search */}
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
                  className={inputClasses}
                />
                {errors.userId && (
                  <span className="text-xs text-red-500">{errors.userId}</span>
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
              
              {/* Guard Search */}
              <div className="relative">
                <input
                  type="text"
                  value={guardSearch}
                  onFocus={() => setShowGuardDropdown(true)}
                  onBlur={() => setTimeout(() => setShowGuardDropdown(false), 200)}
                  onChange={e => {
                    setGuardSearch(e.target.value);
                    setForm(f => ({ ...f, guardId: "" }));
                  }}
                  placeholder="Guard Name"
                  className={inputClasses}
                />
                {errors.guardId && (
                  <span className="text-xs text-red-500">{errors.guardId}</span>
                )}
                {showGuardDropdown && guardSearch.length >= 2 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50 font-sans">
                    {loadingGuards ? (
                      <div className="p-2 text-sm text-gray-500">Searching guards...</div>
                    ) : searchedGuards.length === 0 ? (
                      <div className="p-2 text-gray-500 text-sm">No guards found</div>
                    ) : (
                      searchedGuards.map(guard => (
                        <div
                          key={guard.id}
                          className="p-2 cursor-pointer text-sm hover:bg-gray-50"
                          onMouseDown={() => handleGuardSelect(guard)}
                        >
                          {guard.name}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Role Select */}
              <div>
                <select
                  value={form.role}
                  onChange={e => handleChange("role", e.target.value)}
                  className={`${inputClasses} appearance-none 
    bg-transparent  ${form.role === "" ? "text-gray-400" : "text-gray-900"}`}
                >
                  <option value="" disabled>Select Role</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Guard">Guard</option>
                  <option value="Client">Client</option>
                </select>
                {errors.role && (
                  <span className="text-xs text-red-500">{errors.role}</span>
                )}
              </div>

              {/* Access Select */}
              <div>
                <select
                  value={form.access}
                  onChange={e => handleChange("access", e.target.value)}
                  className={`${inputClasses} appearance-none 
    bg-transparent  ${form.access === "" ? "text-gray-400" : "text-gray-900"}`}
                >
                  <option value="" disabled>Select Access</option>
                  <option value="View">View</option>
                  <option value="Edit">Edit</option>
                </select>
                {errors.access && (
                  <span className="text-xs text-red-500">{errors.access}</span>
                )}
              </div>

              {/* Notification Dropdown */}
              <div className="relative">
                <div
                  className={`${inputClasses}  cursor-pointer flex items-center justify-between`}
                  onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                >
                  <span className={form.notification.length > 0 ? "text-gray-900" : "text-gray-400"}>
                    {form.notification.length > 0 
                      ? `${form.notification.length} selected` 
                      : "Select Notifications"
                    }
                  </span>
                </div>
                {errors.notification && (
                  <span className="text-xs text-red-500">{errors.notification}</span>
                )}
                {showNotificationDropdown && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                    {notificationOptions.map(option => (
                      <label key={option} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={form.notification.includes(option)}
                          onChange={() => handleCheckbox(option)}
                          className="mr-3 text-[#004175] focus:ring-[#004175] focus:ring-2"
                        />
                        <span className="text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Submit Button */}
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
      </div>
      <div >
        <GenericTable
          data={assignments || []}
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
                fetchAssignments(page);
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
                <h3 className="text-lg font-medium text-gray-900">Delete Assignment</h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this assignment?
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
}
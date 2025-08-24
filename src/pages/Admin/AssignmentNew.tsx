import React, { useEffect, useState, useRef, useMemo } from "react";
import { Edit, Plus, Trash2, X, RotateCcw, Search } from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";
import { useSearchClient } from "../../hooks/usesearchClient";
import { useSearchUsers } from "../../hooks/useSearchUser";
import {
  GenericTable,
  TableAction,
  TableColumn,
  SearchOption
} from "../../components/GenericTable";
import Pagination from "../../components/Pagination";
import SubmitButton from "../../components/ui/ButtonUi";
import { toast } from "sonner";
import { useAssignment } from "../../context/Assignment";
import { inputClasses } from "./GeoLocationSetup";
import ResetButton from "../../components/ui/ResetButton";
import { GenericSearchForm, FieldConfig } from "../../components/GenericFormSearch";

const notificationOptions = [
  "Geolocation",
  "Time Clock",
  "Weekly Hours",
  "Scheduling",
] as const;
type NotificationOption = (typeof notificationOptions)[number];

const notificationMapping = {
  'geo_location': 'Geolocation',
  'time_clock': 'Time Clock',
  'weekly_Hours': 'Weekly Hours',
  'schedule': 'Scheduling',
  'Geolocation': 'Geolocation',
  'Time Clock': 'Time Clock',
  'Weekly Hours': 'Weekly Hours',
  'Scheduling': 'Scheduling'
};
const reverseNotificationMapping = {
  'Geolocation': 'geo_location',
  'Time Clock': 'time_clock',
  'Weekly Hours': 'weekly_Hours',
  'Scheduling': 'schedule'
};

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

  const [form, setForm] = useState({
    userId: "",
    guardId: "",
    clientId: "",
    addressId: "",
    role: "",
    access: "",
    notification: [] as NotificationOption[],
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [editId, setEditId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitLoader, setSubmitLoader] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showErrors, setShowErrors] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    record: any;
  }>({ isOpen: false, record: null });
  const [deleteLoader, setDeleteLoader] = useState(false);
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [guardSearch, setGuardSearch] = useState("");
  const [selectedAddressText, setSelectedAddressText] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showGuardDropdown, setShowGuardDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] =useState(false);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  const debouncedClientSearch = useDebounce(clientSearch, 300);
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const debouncedGuardSearch = useDebounce(guardSearch, 300);

  const { data: searchedClients = [], isLoading: loadingClients } =
    useSearchClient(debouncedClientSearch);
  const { data: searchedUsers = [], isLoading: loadingUsers } =
    useSearchUsers(debouncedUserSearch);
  const { data: searchedGuards = [], isLoading: loadingGuards } =
    useSearchUsers(debouncedGuardSearch);

    const searchFields = useMemo<FieldConfig[]>(() => [
      { name: 'clientName', type: 'text', placeholder: 'Client Name' },
      { name: 'location', type: 'text', placeholder: 'Location' },
      { name: 'userName', type: 'text', placeholder: 'User Name' },
      { name: 'role', type: 'select', placeholder: 'Select Role', options: [
        { label: 'Admin', value: 'Admin' },
        { label: 'Manager', value: 'Manager' },
        { label: 'Guard', value: 'Guard' },
        { label: 'Client', value: 'Client' }
      ]},
      { name: 'access', type: 'select', placeholder: 'Select Access', options: [
        { label: 'View', value: 'View' },
        { label: 'Edit', value: 'Edit' }
      ]},
      { name: 'userNotified', type: 'text', placeholder: 'User Notified' }
    ], []);

  useEffect(() => {
    fetchAssignments(currentPage);
  }, [currentPage]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target as Node)
      ) {
        setShowNotificationDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearch = async (searchData: { [key: string]: any }) => {
    setSearchLoading(true);
    try {
      const filterEntries = Object.entries(searchData).filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== "");
      const filter = filterEntries.length > 0 ? Object.fromEntries(filterEntries) : null;
      setCurrentPage(1);
      await fetchAssignments(1, filter);
      toast.success('Search applied successfully!');
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };
  const handleSearchReset = () => {
    setShowSearchForm(false);
    setCurrentPage(1);
    fetchAssignments(1, null);
    toast.success('Search filters cleared!');
  };

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
    setErrors({});
    setShowErrors(false);
  };

  const handleGuardSelect = (guard: { id: string | number; name: string }) => {
    setForm((f) => ({ ...f, guardId: String(guard.id) }));
    setGuardSearch(guard.name);
    setShowGuardDropdown(false);
    setErrors({});
    setShowErrors(false);
  };

  const handleCheckbox = (option: NotificationOption) => {
    setForm((f) =>
      f.notification.includes(option)
        ? { ...f, notification: f.notification.filter((n) => n !== option) }
        : { ...f, notification: [...f.notification, option] }
    );
    setErrors({});
    setShowErrors(false);
  };

  const getFieldClasses = (fieldName: string) => {
    const hasError = showErrors && errors[fieldName];
    return `${inputClasses} ${hasError ? "border-red-500 focus:ring-red-500" : ""
      }`;
  };

  const validate = () => {
    const e: any = {};
    if (!form.clientId) e.clientId = "Client is required";
    if (!form.userId) e.userId = "User is required";
    if (!form.guardId) e.guardId = "User Notified required";
    if (!form.addressId) e.addressId = "Address is required";
    if (!form.role) e.role = "Role is required";
    if (!form.access) e.access = "Access level is required";
    if (!form.notification.length)
      e.notification = "Please select at least one notification";
    setErrors(e);
    setShowErrors(true);
    return Object.keys(e).length === 0;
  };

  const hasTextInput =
    form.userId !== "" ||
    form.guardId !== "" ||
    form.clientId !== "" ||
    form.addressId !== "" ||
    form.role !== "" ||
    form.access !== "" ||
    (Array.isArray(form.notification) && form.notification.length > 0);

  const resetForm = () => {
    setForm({
      clientId: "",
      addressId: "",
      userId: "",
      guardId: "",
      role: "",
      access: "",
      notification: [],
    });
    setClientSearch("");
    setSelectedAddressText("");
    setUserSearch("");
    setGuardSearch("");
    setShowClientDropdown(false);
    setShowUserDropdown(false);
    setShowGuardDropdown(false);
    setShowNotificationDropdown(false);
    setErrors({});
    setShowErrors(false);
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

    const mappedNotifications = Array.isArray(record.notification)
      ? record.notification.map(notif => notificationMapping[notif] || notif)
      : [];

    setForm({
      clientId: String(record.client?.id || ""),
      addressId: String(record.address?.id || ""),
      userId: String(record.user?.id || ""),
      guardId: String(record.guard?.id || ""),
      role: record.role || "",
      access: record.access || "",
      notification: mappedNotifications, 
    });
    setClientSearch(record.client?.name || "");
    setSelectedAddressText(
      record.address?.address || record.address?.label || ""
    );
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
  const formatNotificationText = (notification: string): string => {
    if (notification == "geo_location") {
      return "GeoLocation"
    }
    return notification
      .replace(/_/g, ' ') 
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const tableColumns: TableColumn[] = [
    {
      key: "client.name",
      label: "Client Name",
      sortable: true,
      searchable: true,
      searchType: 'text',
      width: "250px",
      height:"40px"
    },
    {
      key: "address.address",
      label: "Location",
      sortable: true,
      searchable: true,
      searchType: 'text', // Keep as text search
      width: "250px",
    },
    {
      key: "guard.name",
      label: "User Name",
      sortable: true,
      searchable: true,
      searchType: 'text', // Keep as text search
      width: "250px",
    },
    {
      key: "role",
      label: "User Role",
      sortable: true,
      searchable: true,
      searchType: 'dropdown', // Change to dropdown
      searchOptions: [
        { label: 'Admin', value: 'Admin' },
        { label: 'Manager', value: 'Manager' },
        { label: 'Guard', value: 'Guard' },
        { label: 'Client', value: 'Client' }
      ],
      width: "250px",
    },
    {
      key: "access",
      label: "Schedule Access",
      sortable: true,
      searchable: true,
      searchType: 'dropdown', // Change to dropdown
      searchOptions: [
        { label: 'View', value: 'View' },
        { label: 'Edit', value: 'Edit' }
      ],
      width: "250px",
    },
    {
      key: "user.name",
      label: "User Notified",
      sortable: true,
      searchable: true,
      searchType: 'text', // Keep as text search
      width: "250px",
    },
    {
      key: "notification",
      label: "Notification",
      sortable: true,
      searchable: true,
      searchType: 'dropdown', // Change to dropdown - auto-generates from data
      width: "400px",
      searchOptions: [ // Add this
        { label: 'Geolocation', value: 'geo_location' },
        { label: 'Time Clock', value: 'time_clock' },
        { label: 'Weekly Hours', value: 'weekly_Hours' },
        { label: 'Schedule', value: 'schedule' }
      ],
      render: (value: NotificationOption[] | string[] | null | undefined) => {
        if (!value || !Array.isArray(value) || value.length === 0) {
          return "-";
        }

        // Transform backend format to display format
        const formattedNotifications = value.map((notification: string) =>
          formatNotificationText(notification)
        );

        return formattedNotifications.join(", ");
      },
    },
  ];

  const tableActions: TableAction[] = [
    {
      label: "Edit",
      icon: <Edit className="w-4 h-4" />,
      onClick: handleEdit,
      className: "text-blue-500 hover:text-green-700",
      title: "Edit",
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-4 h-4" />,
      onClick: handleDelete,
      className: "text-red-500 hover:text-red-700",
      title: "Delete",
    },
  ];

  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 md:px-6 pt-10">
      <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 mb-2">
        <h2 className="text-xl font-semibold mb-2">
          {isEditing ? "Edit Assignment" : "Add Assignment"}
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
                                {
                                  id: client.id,
                                  name: client.name,
                                  lastName: client.lastName,
                                },
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
                              {`${client.name}${client.lastName ? ` ${client.lastName}` : ''}`}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {address.label || address.address}
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

            {/* Location (read-only) */}
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

            {/* Guard Search */}
            <div className="relative">
              <input
                type="text"
                value={guardSearch}
                onFocus={() => setShowGuardDropdown(true)}
                onBlur={() =>
                  setTimeout(() => setShowGuardDropdown(false), 200)
                }
                onChange={(e) => {
                  setGuardSearch(e.target.value);
                  setForm((f) => ({ ...f, guardId: "" }));
                }}
                placeholder="Select User"
                className={getFieldClasses("guardId")}
              />
              {showErrors && errors.guardId && (
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
                  {errors.guardId}
                </div>
              )}
              {showGuardDropdown && guardSearch.length >= 2 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50 font-sans">
                  {loadingGuards ? (
                    <div className="p-2 text-sm text-gray-500">
                      Searching guards...
                    </div>
                  ) : searchedGuards.length === 0 ? (
                    <div className="p-2 text-gray-500 text-sm">
                      No guards found
                    </div>
                  ) : (
                    searchedGuards.map((guard) => (
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
                onChange={(e) => handleChange("role", e.target.value)}
                className={`${getFieldClasses(
                  "role"
                )} appearance-none bg-transparent ${form.role === "" ? "text-gray-400" : "text-gray-900"
                  }`}
              >
                <option value="" disabled hidden>
                  Select Role
                </option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Guard">Guard</option>
                <option value="Client">Client</option>
              </select>
              {showErrors && errors.role && (
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
                  {errors.role}
                </div>
              )}
            </div>

            {/* Access Select */}
            <div>
              <select
                value={form.access}
                onChange={(e) => handleChange("access", e.target.value)}
                className={`${getFieldClasses(
                  "access"
                )} appearance-none bg-transparent ${form.access === "" ? "text-gray-400" : "text-gray-900"
                  }`}
              >
                <option value="" disabled hidden>
                  Select Access
                </option>
                <option value="View">View</option>
                <option value="Edit">Edit</option>
              </select>
              {showErrors && errors.access && (
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
                  {errors.access}
                </div>
              )}
            </div>

            {/* User Search */}
            <div className="relative">
              <input
                type="text"
                value={userSearch}
                onFocus={() => setShowUserDropdown(true)}
                onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setForm((f) => ({ ...f, userId: "" }));
                }}
                placeholder="Select User Notified"
                className={getFieldClasses("userId")}
              />
              {showErrors && errors.userId && (
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
                  {errors.userId}
                </div>
              )}
              {showUserDropdown && userSearch.length >= 2 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50 font-sans">
                  {loadingUsers ? (
                    <div className="p-2 text-sm text-gray-500">
                      Searching users...
                    </div>
                  ) : searchedUsers.length === 0 ? (
                    <div className="p-2 text-gray-500 text-sm">
                      No users found
                    </div>
                  ) : (
                    searchedUsers.map((user) => (
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

            {/* Notification Dropdown */}
            <div
              className="relative col-span-1 md:col-span-2 "
              ref={notificationDropdownRef}
            >
              <div
                className={`${getFieldClasses(
                  "notification"
                )} cursor-pointer flex items-center justify-between`}
                onClick={() =>
                  setShowNotificationDropdown(!showNotificationDropdown)
                }
              >
                <div className="flex flex-wrap gap-1 flex-1">
                  {form.notification.length === 0 ? (
                    <span className="text-gray-400">
                      Select notifications...
                    </span>
                  ) : (
                    form.notification.map((option) => (
                      <span
                        key={option}
                        className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm"
                      >
                        {option}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckbox(option);
                          }}
                          className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <div className="ml-2">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              {showNotificationDropdown && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                  {notificationOptions.map((option) => (
                    <label
                      key={option}
                      className="flex items-center p-2 hover:bg-gray-50 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.notification.includes(option)}
                        onChange={() => handleCheckbox(option)}
                        className="mr-3 text-[#004175] focus:ring-[#004175] focus:ring-2"
                      />
                      <span
                        className={`${form.notification.includes(option)
                            ? "text-blue-800"
                            : "text-gray-700"
                          }`}
                      >
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {showErrors && errors.notification && (
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
                  {errors.notification}
                </div>
              )}
            </div>

            {/* Submit and Reset Buttons */}
            <div className="flex justify-start gap-2">
              <SubmitButton
                loading={submitLoader}
                disabled={submitLoader}
                icon={
                  isEditing ? (
                    <Edit className="w-4 h-4 mr-1" />
                  ) : (
                    <Plus className="w-4 h-4 mr-1" />
                  )
                }
              >
                {isEditing ? "Update" : "Add"}
              </SubmitButton>
              {hasTextInput && (
                <ResetButton onClick={resetForm} disabled={submitLoader} />
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Search Button */}
      <div className="my-4 flex justify-end">
        <button
          onClick={() => setShowSearchForm(!showSearchForm)}
          className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Search className="w-4 h-4 mr-2" />
          {showSearchForm ? 'Hide Search' : 'Search'}
        </button>
      </div>

      {/* Generic Search Form */}
      <GenericSearchForm
        fields={searchFields}
        route="Assignment"
        onSearch={handleSearch}
        onReset={handleSearchReset}
        isVisible={showSearchForm}
        loading={searchLoading}
        resetKey={"Assignment"}
      />

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
            loading={loading}
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4"></div>

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
}
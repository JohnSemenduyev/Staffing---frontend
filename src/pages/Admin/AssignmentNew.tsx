import React, { useEffect, useState, useRef, useMemo } from "react";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { GoPlus } from "react-icons/go";
import { X, RotateCcw, Search } from "lucide-react";
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
import { useAssignment } from "../../context/Assignment";
import { inputClasses } from "./GeoLocationSetup";
import ResetButton from "../../components/ui/ResetButton";
import { GenericSearchForm, FieldConfig } from "../../components/GenericFormSearch";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../../components/ui/button";
import { SearchResultItem, SearchResultsDropdown } from "../../components/ui/search-result-item";

const notificationOptions = [
  "Geolocation",
  "Time Clock",
  "Weekly Hours",
  "Scheduling",
    "Shift Updates"

] as const;
type NotificationOption = (typeof notificationOptions)[number];

const notificationMapping = {
  'geo_location': 'Geolocation',
  'time_clock': 'Time Clock',
  'weekly_Hours': 'Weekly Hours',
  'shift_updates': 'Shift Updates',
  'schedule': 'Scheduling',
  'Geolocation': 'Geolocation',
  'Time Clock': 'Time Clock',
  'Weekly Hours': 'Weekly Hours',
  'Scheduling': 'Scheduling',

};

export default function AssignmentNew() {
  const {
    assignments,
    lastPage,
    loading,
    currentPage,
    submitError,
    fetchAssignments,
    setCurrentPage,
    createAssignment,
    setSubmitError,
    updateAssignment,
    deleteAssignment,
  } = useAssignment();
  const {toast} = useToast();
  const [form, setForm] = useState({
    userId: "",
    guardId: "",
    clientId: "",
    addressId: "",
    role: "",
    access: "",
    notification: [] as NotificationOption[],
  });

 
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
  const filterEntries = Object.entries(searchData).filter(
    ([_, v]) => v !== undefined && v !== null && String(v).trim() !== ""
  );

  if (filterEntries.length === 0) {
    setCurrentPage(1);
    await fetchAssignments(1, null);
    return;
  }

  // mapping table keys -> API keys
  const keyMapping: Record<string, string> = {
    "client.name": "clientName",
    "user.name": "userName",
    "guard.name": "guardName",
    "address.address": "addressText",
    "notification": "notification",
    "role": "role",
    "access": "access",
  };

  const filter = Object.fromEntries(
    filterEntries.map(([key, value]) => [keyMapping[key] || key, value])
  );

  setCurrentPage(1);
  console.log(filter); // 👀 debug
  await fetchAssignments(1, filter);
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
    ]
      .filter(Boolean)
      .join(", ");
    setSelectedAddressText(fullAddress);
  };

  const handleUserSelect = (user: { id: string | number; name: string }) => {
    setForm((f) => ({ ...f, userId: String(user.id) }));
    const fullName = [user.name, (user as any)?.lastName].filter(Boolean).join(" ");
    setUserSearch(fullName || user.name);
    setShowUserDropdown(false);
    setErrors({});
    setShowErrors(false);
  };

  const handleGuardSelect = (guard: { id: string | number; name: string }) => {
    setForm((f) => ({ ...f, guardId: String(guard.id) }));
    const fullName = [guard.name, (guard as any)?.lastName].filter(Boolean).join(" ");
    setGuardSearch(fullName || guard.name);
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
    } else {
      await createAssignment(input);
    }
    resetForm();
    fetchAssignments(currentPage)
  } catch (error: any) {
    console.error("Error submitting assignment:", error);
  } finally {
    setSubmitError("");
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
    const fullAddress = [
      record.address?.address || record.address?.label,
      (record.address as any)?.city,
      (record.address as any)?.state,
      (record.address as any)?.pincode,
    ]
      .filter(Boolean)
      .join(", ");
    setSelectedAddressText(fullAddress);
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
      toast({title : "SUCCESS", description : "Assignment deleted successfully"});
      fetchAssignments(currentPage);
      setDeleteModal({ isOpen: false, record: null });
    } catch (err) {
      toast({title : "ERROR", description : "Failed to delete assignment"});
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
      height:"40px",
       render: (_: any, row: any) => {
        const a = row.client;
        const full = [a?.name??"" , a?.lastName??""].filter(Boolean).join(" ");
        return <div className="truncate" title={full}>{full || "-"}</div>;
      }
    },
    {
      key: "address.address",
      label: "Location",
      sortable: true,
      searchable: true,
      searchType: 'text',
      width: "250px",
      render: (_: any, row: any) => {
        const a = row.address;
        const full = [a?.address, a?.city, a?.state, a?.pincode || a?.zipcode].filter(Boolean).join(", ");
        return <div className="truncate" title={full}>{full || "-"}</div>;
      }
    },
    {
      key: "guard.name",
      label: "User Name",
      sortable: true,
      searchable: true,
      searchType: 'text', // Keep as text search
      width: "250px",
       render: (_: any, row: any) => {
        const a = row.guard;
        const full = [a?.name??"" , a?.lastName??""].filter(Boolean).join(" ");
        return <div className="truncate" title={full}>{full || "-"}</div>;
      }
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
      render: (_: any, row: any) => {
        const a = row.user;
        const full = [a?.name??"" , a?.lastName??""].filter(Boolean).join(" ");
        return <div className="truncate" title={full}>{full || "-"}</div>;
      }
    },
    {
      key: "notification",
      label: "Notification",
      sortable: true,
      searchable: true,
      searchType: 'dropdown',
      width: "400px",
      searchOptions: [ // Add this
        { label: 'Geolocation', value: 'geo_location' },
        { label: 'Time Clock', value: 'time_clock' },
        { label: 'Weekly Hours', value: 'weekly_Hours' },
        { label: 'Schedule', value: 'schedule' },
        { label: 'Shift Updates', value: 'shift_updates' },
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
      icon: <FaRegEdit className="w-4 h-4" color="blue"/>,
      onClick: handleEdit,
      className: "text-blue-500 hover:text-green-700",
      title: "Edit",
    },
    {
      label: "Delete",
      icon: <FaRegTrashAlt className="w-4 h-4" />,
      onClick: handleDelete,
      className: "text-red-500 hover:text-red-700",
      title: "Delete",
    },
  ];

  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 md:px-6 pt-10">
      <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 space-y-2 grid mb-2">
        <h2 className="text-xl font-semibold mb-2">
          {isEditing ? "Edit Assignment" : "Add Assignment"}
        </h2>
        <form onSubmit={onSubmit} autoComplete="off">
        <div className="grid grid-cols-1 sm:grid-cols-3  lg:grid-cols-4 xxl:grid-cols-3 gap-2">
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
                        primaryText={`${client.name}${client.lastName ? ` ${client.lastName}` : ''}`}
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
              <SearchResultsDropdown show={showGuardDropdown && guardSearch.length >= 1}>
                {loadingGuards ? (
                  <div className="p-2 text-sm text-gray-500">Searching guards...</div>
                ) : searchedGuards.length === 0 ? (
                  <div className="p-2 text-gray-500 text-sm">No guards found</div>
                ) : (
                  searchedGuards.map((guard, idx) => {
                    const fullName = [guard.name, (guard as any)?.lastName].filter(Boolean).join(" ");
                    const fullAddress = [
                      (guard as any)?.address,
                      (guard as any)?.city,
                      (guard as any)?.state,
                      (guard as any)?.zipcode,
                    ].filter(Boolean).join(", ");
                    return (
                      <SearchResultItem
                        key={guard.id}
                        index={idx}
                        primaryText={fullName || guard.name}
                        secondaryText={fullAddress}
                        onSelect={() => handleGuardSelect(guard)}
                      />
                    );
                  })
                )}
              </SearchResultsDropdown>
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
              <SearchResultsDropdown show={showUserDropdown && userSearch.length >= 1}>
                {loadingUsers ? (
                  <div className="p-2 text-sm text-gray-500">Searching users...</div>
                ) : searchedUsers.length === 0 ? (
                  <div className="p-2 text-gray-500 text-sm">No users found</div>
                ) : (
                  searchedUsers.map((user, idx) => {
                    const fullName = [user.name, (user as any)?.lastName].filter(Boolean).join(" ");
                    const fullAddressParts = [
                      (user as any)?.address,
                      (user as any)?.city,
                      (user as any)?.state,
                      (user as any)?.zipcode,
                    ].filter(Boolean);
                    const fullAddress = fullAddressParts.join(", ");
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

            {/* Notification Dropdown */}
            <div
              className="relative  sm:col-span-3 lg:col-span-2 "
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
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckbox(option);
                          }}
                          variant="ghost"
                          size="icon-sm"
                          className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </Button>
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
            <div className="flex justify-start items-start gap-2">
              <SubmitButton
                loading={submitLoader}
                disabled={submitLoader}
                icon={
                  isEditing ? (
                    <FaRegEdit className="w-4 h-4 mr-1" color="blue" />
                  ) : (
                    <GoPlus className="w-4 h-4 mr-1" />
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
      <GenericTable
        data={assignments || []}
        columns={tableColumns}
        actions={tableActions}
        loading={loading}
        emptyMessage="No records found matching your search criteria."
        searchable={true}
        onSearch = {handleSearch}
      />

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
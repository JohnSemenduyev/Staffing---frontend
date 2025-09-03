import React, { useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { useAddressesByClient } from "../../hooks/useAddressesByClient";
import { useCreateAssignment } from "../../hooks/userAssignment";
import AssignmentHistory from "../../components/AssignmentReport";
import { useDebounce } from "../../hooks/useDebounce";
import { useSearchClient } from "../../hooks/usesearchClient";
import { useSearchGuards } from "../../hooks/useSearchGuard";
import { useSearchUsers } from "../../hooks/useSearchUser";
import SubmitButton from "../../components/ui/ButtonUi";
import { ErrorMessage } from "../../components/ui/error-message";
import { SearchResultItem, SearchResultsDropdown } from "../../components/ui/search-result-item";

const notificationOptions = [
  "Geolocation",
  "Time Clock",
  "Weekly Hours",
  "Scheduling",
    "Shift Updates"

] as const;

type NotificationOption = (typeof notificationOptions)[number];

const DEFAULT_FORM = {
  userId: "",
  guardId: "",
  clientId: "",
  addressId: "",
  role: "",
  access: "",
  notification: [] as NotificationOption[],
};

export default function AssignmentForm() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [clientSearch, setClientSearch] = useState("");
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  const { data: searchedClients = [], isLoading: loadingClients } = useSearchClient(debouncedClientSearch);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const { data: searchedUsers = [], isLoading: loadingUsers } = useSearchUsers(debouncedUserSearch);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  const [guardSearch, setGuardSearch] = useState("");
  // const debouncedGuardSearch = useDebounce(guardSearch, 300);
  // const { data: searchedGuards = [], isLoading: loadingGuards } = useSearchGuards(debouncedGuardSearch);
  // const [showGuardDropdown, setShowGuardDropdown] = useState(false);

  const clientIdNum = form.clientId ? Number(form.clientId) : 0;
  const { data: addresses, isLoading: loadingAddresses } = useAddressesByClient(clientIdNum);

  // Handle clicking outside notification dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target as Node)) {
        setShowNotificationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const createAssignment = useCreateAssignment();

  const handleChange = (field: string, value: any) => {
    setForm(f => ({
      ...f,
      [field]: value,
      ...(field === "clientId" ? { addressId: "" } : {}),
    }));
    // Remove validation error for this field when it changes
    if (errors[field]) {
      setErrors(e => ({ ...e, [field]: undefined }));
    }
  };

  const handleCheckbox = (option: NotificationOption) => {
    setForm(f =>
      f.notification.includes(option)
        ? { ...f, notification: f.notification.filter(n => n !== option) }
        : { ...f, notification: [...f.notification, option] }
    );
    // Remove validation error for notifications when it changes
    if (errors.notification) {
      setErrors(e => ({ ...e, notification: undefined }));
    }
  };

  const handleClientSelect = (client: { id: string | number; name: string; lastName?: string }) => {
    setForm(f => ({ ...f, clientId: String(client.id), addressId: "" }));
    const fullClientName = [client.name, client.lastName].filter(Boolean).join(" ");
    setClientSearch(fullClientName || client.name);
    setShowClientDropdown(false);
    // Remove validation error for clientId when it changes
    if (errors.clientId) {
      setErrors(e => ({ ...e, clientId: undefined }));
    }
  };

  const handleUserSelect = (user: { id: string | number; name: string; lastName?: string; address?: string; city?: string; state?: string; zipcode?: string }) => {
    setForm(f => ({ ...f, userId: String(user.id) }));
    const fullName = [user.name, user.lastName].filter(Boolean).join(" ");
    setUserSearch(fullName || user.name);
    setShowUserDropdown(false);
    // Remove validation error for userId when it changes
    if (errors.userId) {
      setErrors(e => ({ ...e, userId: undefined }));
    }
  };

  // const handleGuardSelect = (guard: { id: string | number; name: string }) => {
  //   setForm(f => ({ ...f, guardId: String(guard.id) }));
  //   setGuardSearch(guard.name);
  //   setShowGuardDropdown(false);
  //   setErrors(e => ({ ...e, guardId: undefined }));
  // };

  const validate = () => {
    const e: any = {};
    if (!form.clientId) e.clientId = "Required";
    if (!form.userId) e.userId = "Required";
    if (!form.guardId) e.guardId = "Required";
    if (!form.addressId) e.addressId = "Required";
    if (!form.role) e.role = "Required";
    if (!form.access) e.access = "Required";
    if (!form.notification.length)
      e.notification = "Select at least one notification";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    // console.log("Submitting form with data:", form); 
    createAssignment.mutate({
      userId: Number(form.userId),
      guardId: Number(form.guardId),
      clientId: Number(form.clientId),
      addressId: Number(form.addressId),
      role: form.role,
      access: form.access,
      notification: form.notification,
    });
    setForm(DEFAULT_FORM);
    setClientSearch("");
    setUserSearch("");
    setGuardSearch("");
    setErrors({});
  };

  const fieldInputClasses = "w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition";

  return (
    <div className="min-h-screen p-6 font-sans">
      <div className="w-full px-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Add Assignment
          </h2>
          <form onSubmit={onSubmit} autoComplete="off">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Client Search */}
              <div className="relative">
                <input
                  type="text"
                  value={clientSearch}
                  onFocus={() => setShowClientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                  onChange={e => {
                    setClientSearch(e.target.value);
                    setForm(f => ({ ...f, clientId: "", addressId: "" }));
                  }}
                  placeholder="Client Name"
                  className={fieldInputClasses}
                />
                {errors.clientId && (
                  <ErrorMessage message={errors.clientId} />
                )}
                <SearchResultsDropdown show={showClientDropdown && clientSearch.length >= 2}>
                  {loadingClients ? (
                    <div className="p-2 text-sm text-gray-500">Searching clients...</div>
                  ) : searchedClients.length === 0 ? (
                    <div className="p-2 text-gray-500 text-sm">No clients found</div>
                  ) : (
                    searchedClients.map((client, idx) => (
                      <SearchResultItem
                        key={client.id}
                        index={idx}
                        primaryText={client.name}
                        onSelect={() => handleClientSelect(client)}
                      />
                    ))
                  )}
                </SearchResultsDropdown>
              </div>

              {/* Address select */}
              <div>
                <select
                  value={form.addressId}
                  onChange={e => handleChange("addressId", e.target.value)}
                  disabled={!form.clientId || loadingAddresses}
                  className={`${fieldInputClasses} ${form.addressId === "" ? "text-gray-400" : "text-gray-900"}`}
                >
                  <option value="" disabled>Select Address</option>
                  {addresses?.map(address => (
                    <option key={address.id} value={address.id}>
                      {address.label || address.address}
                    </option>
                  ))}
                </select>
                {loadingAddresses && (
                  <span className="text-xs text-blue-500 ml-2">Loading...</span>
                )}
                {errors.addressId && (
                  <ErrorMessage message={errors.addressId} />
                )}
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
                  className={fieldInputClasses}
                />
                {errors.userId && (
                  <ErrorMessage message={errors.userId} />
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

              {/* Guard Search */}
              <div className="relative">
                <input
                  type="text"
                  value={guardSearch}
                  onFocus={() => setShowUserDropdown(true)}
                  onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                  onChange={e => {
                    setGuardSearch(e.target.value);
                    setForm(f => ({ ...f, userId: "" }));
                  }}
                  placeholder="Guard Name"
                  className={fieldInputClasses}
                />
                {errors.userId && (
                  <ErrorMessage message={errors.userId} />
                )}
                {showUserDropdown && guardSearch.length >= 2 && (
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

              <div>
                <select
                  value={form.role}
                  onChange={e => handleChange("role", e.target.value)}
                  className={`${fieldInputClasses} ${form.role === "" ? "text-gray-400" : "text-gray-900"}`}
                >
                  <option value="" disabled>Select Role</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Guard">Guard</option>
                  <option value="Client">Client</option>
                </select>
                {errors.role && (
                  <ErrorMessage message={errors.role} />
                )}
              </div>

              {/* Access select */}
              <div>
                <select
                  value={form.access}
                  onChange={e => handleChange("access", e.target.value)}
                  className={`${fieldInputClasses} ${form.access === "" ? "text-gray-400" : "text-gray-900"}`}
                >
                  <option value="" disabled>Select Access</option>
                  <option value="View">View</option>
                  <option value="Edit">Edit</option>
                </select>
                {errors.access && (
                  <ErrorMessage message={errors.access} />
                )}
              </div>


              {/* Notification Dropdown */}
              <div className="col-span-1 md:col-span-2 lg:col-span-3 relative" ref={notificationDropdownRef}>
                <label className="block font-sans mb-2">Notifications</label>
                <div
                  className={`${fieldInputClasses} cursor-pointer flex items-center justify-between`}
                  onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                >
                  <div className="flex flex-wrap gap-1 flex-1">
                    {form.notification.length === 0 ? (
                      <span className="text-gray-400">Select notifications...</span>
                    ) : (
                      form.notification.map(option => (
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
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {showNotificationDropdown && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                    {notificationOptions.map(option => (
                      <div
                        key={option}
                        className={`p-2 cursor-pointer text-sm hover:bg-gray-50 ${form.notification.includes(option) ? 'bg-blue-50 text-blue-800' : ''
                          }`}
                        onClick={() => handleCheckbox(option)}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}

                {errors.notification && (
                  <ErrorMessage message={errors.notification} />
                )}
              </div>
              {/* Submit Button */}
              <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-4">
                {/* <button
                  type="submit"
                  disabled={createAssignment.status === "pending"}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md font-sans w-full sm:w-auto"
                >
                  <Plus className="inline-block w-4 h-4 mr-1" /> Add Assignment
                </button> */}
                <SubmitButton
                  loading={createAssignment.status === "pending"}
                  disabled={createAssignment.status === "pending"}
                  icon={<Plus className="w-4 h-4 mr-1" />}
                >
                  Add
                </SubmitButton>
              </div>
            </div>
          </form>
        </div>
        <div className="mt-6"></div>
        <AssignmentHistory />
      </div>
    </div>
  );
}

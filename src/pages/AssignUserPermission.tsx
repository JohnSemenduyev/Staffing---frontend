import React, { useState, useEffect, useMemo, useRef } from "react";
import { Plus, ChevronUp, ChevronDown } from "lucide-react";

// Mock data - Updated to have single locations per client
const mockClients = [
  { id: 1, name: "Acme Corp", location: "New York Office" },
  { id: 2, name: "TechFlow Inc", location: "San Francisco HQ" },
  { id: 3, name: "Global Industries", location: "London Office" }
];

const mockUsers = [
  { id: 1, name: "John Smith" },
  { id: 2, name: "Sarah Johnson" },
  { id: 3, name: "Mike Davis" },
  { id: 4, name: "Emily Brown" }
];

const mockManagers = [
  { id: 1, name: "David Wilson" },
  { id: 2, name: "Lisa Anderson" },
  { id: 3, name: "James Taylor" }
];

const mockNotificationOptions = ["Geolocation", "Time Clock", "Weekly Hours", "Scheduling"];

type RoleOption = "Admin" | "Manager" | "Guard" | "Client";
type NotificationOption = "Geolocation" | "Time Clock" | "Weekly Hours" | "Scheduling";

interface AssignmentRecord {
  id: string;
  clientId: number;
  clientName: string;
  location: string | null;
  userId: number;
  userName: string;
  role: RoleOption;
  access: "View" | "Edit";
  notifiedManagerId: number;
  notifiedManagerName: string;
  notifications: NotificationOption[];
  createdAt: string;
}

interface FormData {
  clientId: number | "";
  location: string | "";
  userId: number | "";
  role: RoleOption | "";
  access: "View" | "Edit" | "";
  notifiedManagerId: number | "";
  notifications: NotificationOption[];
}

const AssignmentUI = () => {
  // All state declarations
  const [formData, setFormData] = useState<FormData>({
    clientId: "",
    location: "",
    userId: "",
    role: "",
    access: "",
    notifiedManagerId: "",
    notifications: []
  });

  const [assignments, setAssignments] = useState<AssignmentRecord[]>([
    {
      id: "1",
      clientId: 1,
      clientName: "Acme Corp",
      location: "New York Office",
      userId: 1,
      userName: "John Smith",
      role: "Admin",
      access: "Edit",
      notifiedManagerId: 1,
      notifiedManagerName: "David Wilson",
      notifications: ["Geolocation", "Time Clock"],
      createdAt: new Date().toISOString()
    },
    {
      id: "2",
      clientId: 2,
      clientName: "TechFlow Inc",
      location: "San Francisco HQ",
      userId: 2,
      userName: "Sarah Johnson",
      role: "Manager",
      access: "Edit",
      notifiedManagerId: 2,
      notifiedManagerName: "Lisa Anderson",
      notifications: ["Weekly Hours", "Scheduling"],
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: "3",
      clientId: 3,
      clientName: "Global Industries",
      location: "London Office",
      userId: 3,
      userName: "Mike Davis",
      role: "Guard",
      access: "View",
      notifiedManagerId: 3,
      notifiedManagerName: "James Taylor",
      notifications: ["Geolocation"],
      createdAt: new Date(Date.now() - 172800000).toISOString()
    }
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchTerms, setSearchTerms] = useState({
    clientName: "",
    clientLocation: "",
    invoiceName: "",
    status: "",
    access: "",
    manager: ""
  });
  const [sortConfig, setSortConfig] = useState<{
    key: keyof AssignmentRecord | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc'
  });
  const [editingRecord, setEditingRecord] = useState<AssignmentRecord | null>(null);

  // Refs
  const notifRef = useRef<HTMLDivElement>(null);

  // Computed values - Updated for single location per client
  const selectedClientLocation = useMemo(() => {
    const client = mockClients.find((c) => c.id === Number(formData.clientId));
    return client ? client.location : "";
  }, [formData.clientId]);

  const accessOptions = useMemo<("View" | "Edit")[]>(() => {
    if (!formData.role) return [];
    return formData.role === "Admin" || formData.role === "Manager" ? ["Edit"] : ["View"];
  }, [formData.role]);

  const filteredAssignments = useMemo(() => {
    let filtered = assignments.filter(record => {
      const clientLocation = record.location || "";
      return (
        (!searchTerms.clientName || record.clientName.toLowerCase().includes(searchTerms.clientName.toLowerCase())) &&
        (!searchTerms.clientLocation || clientLocation.toLowerCase().includes(searchTerms.clientLocation.toLowerCase())) &&
        (!searchTerms.invoiceName || record.userName.toLowerCase().includes(searchTerms.invoiceName.toLowerCase())) &&
        (!searchTerms.status || record.role.toLowerCase().includes(searchTerms.status.toLowerCase())) &&
        (!searchTerms.access || record.access.toLowerCase().includes(searchTerms.access.toLowerCase())) &&
        (!searchTerms.manager || record.notifiedManagerName.toLowerCase().includes(searchTerms.manager.toLowerCase()))
      );
    });

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [assignments, searchTerms, sortConfig]);

  // Effects - Auto-populate location when client changes
  useEffect(() => {
    if (formData.clientId && selectedClientLocation) {
      setFormData(prev => ({ ...prev, location: selectedClientLocation }));
    }
  }, [formData.clientId, selectedClientLocation]);

  useEffect(() => {
    if (!formData.role) {
      setFormData(prev => ({ ...prev, access: "" }));
    } else if (formData.role === "Admin" || formData.role === "Manager") {
      if (formData.access !== "Edit") setFormData(prev => ({ ...prev, access: "Edit" }));
    } else {
      if (formData.access !== "View") setFormData(prev => ({ ...prev, access: "View" }));
    }
  }, [formData.role]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  // Event handlers
  const handleSort = (key: keyof AssignmentRecord) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const toggleNotification = (opt: NotificationOption) => {
    const current = formData.notifications;
    if (current.includes(opt)) {
      handleInputChange("notifications", current.filter(v => v !== opt));
    } else {
      handleInputChange("notifications", [...current, opt]);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.clientId) newErrors.clientId = "Client is required";
    if (!formData.location) newErrors.location = "Location is required";
    if (!formData.userId) newErrors.userId = "User is required";
    if (!formData.role) newErrors.role = "Role is required";
    if (!formData.access) newErrors.access = "Access is required";
    if (!formData.notifiedManagerId) newErrors.notifiedManagerId = "Manager is required";
    if (formData.notifications.length === 0) newErrors.notifications = "Select at least one notification";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = (record: AssignmentRecord) => {
    setEditingRecord(record);
    setFormData({
      clientId: record.clientId,
      location: record.location || "",
      userId: record.userId,
      role: record.role,
      access: record.access,
      notifiedManagerId: record.notifiedManagerId,
      notifications: record.notifications
    });
  };

  const handleDelete = (record: AssignmentRecord) => {
    const confirmed = window.confirm(`Are you sure you want to delete the assignment for ${record.userName}?`);
    if (confirmed) {
      setAssignments(prev => prev.filter(a => a.id !== record.id));
    }
  };

  const handleUpdate = () => {
    if (!validateForm() || !editingRecord) return;

    const clientRec = mockClients.find(c => c.id === Number(formData.clientId));
    const userRec = mockUsers.find(u => u.id === Number(formData.userId));
    const mgrRec = mockManagers.find(m => m.id === Number(formData.notifiedManagerId));

    const updatedRecord: AssignmentRecord = {
      ...editingRecord,
      clientId: Number(formData.clientId),
      clientName: clientRec?.name ?? "",
      location: formData.location || null,
      userId: Number(formData.userId),
      userName: userRec?.name ?? "",
      role: formData.role as RoleOption,
      access: formData.access as "View" | "Edit",
      notifiedManagerId: Number(formData.notifiedManagerId),
      notifiedManagerName: mgrRec?.name ?? "",
      notifications: formData.notifications,
    };

    setAssignments(prev => prev.map(a => a.id === editingRecord.id ? updatedRecord : a));
    setEditingRecord(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      clientId: "",
      location: "",
      userId: "",
      role: "",
      access: "",
      notifiedManagerId: "",
      notifications: []
    });
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
    resetForm();
  };

  const handleSubmit = () => {
    if (editingRecord) {
      handleUpdate();
    } else {
      if (!validateForm()) return;

      const clientRec = mockClients.find(c => c.id === Number(formData.clientId));
      const userRec = mockUsers.find(u => u.id === Number(formData.userId));
      const mgrRec = mockManagers.find(m => m.id === Number(formData.notifiedManagerId));

      const record: AssignmentRecord = {
        id: crypto.randomUUID(),
        clientId: Number(formData.clientId),
        clientName: clientRec?.name ?? "",
        location: formData.location || null,
        userId: Number(formData.userId),
        userName: userRec?.name ?? "",
        role: formData.role as RoleOption,
        access: formData.access as "View" | "Edit",
        notifiedManagerId: Number(formData.notifiedManagerId),
        notifiedManagerName: mgrRec?.name ?? "",
        notifications: formData.notifications,
        createdAt: new Date().toISOString(),
      };

      setAssignments(prev => [...prev, record]);
      resetForm();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Form Section */}
        <div className="bg-white rounded-lg border border-gray-200 mb-8 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 font-sans">
            {editingRecord ? 'Edit Assignment' : 'General Assignment Information'}
          </h2>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* First Row */}
            <div>
              <select
                value={formData.clientId}
                onChange={(e) => {
                  const value = e.target.value === "" ? "" : Number(e.target.value);
                  handleInputChange("clientId", value);
                }}
                className={`w-full px-3 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition text-sm bg-white appearance-none font-sans ${
                  formData.clientId === "" ? "text-gray-400" : "text-gray-700"
                }`}
                style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
              >
                <option value="" disabled hidden style={{ color: '#9CA3AF' }}>Select Client</option>
                {mockClients.map(c => (
                  <option key={c.id} value={c.id} style={{ color: '#374151' }}>{c.name}</option>
                ))}
              </select>
              {errors.clientId && <p className="text-red-500 text-xs mt-1 font-sans">{errors.clientId}</p>}
            </div>

            <div>
              <input
                type="text"
                placeholder="Location"
                value={formData.location}
                readOnly
                className="w-full px-3 py-0.5 border border-gray-300 rounded-md bg-gray-50 text-gray-700 placeholder:text-gray-400 cursor-not-allowed text-sm font-sans"
                style={{ WebkitAppearance: 'none' }}
              />
              {errors.location && <p className="text-red-500 text-xs mt-1 font-sans">{errors.location}</p>}
            </div>

            <div>
              <select
                value={formData.userId}
                onChange={(e) => handleInputChange("userId", e.target.value === "" ? "" : Number(e.target.value))}
                className={`w-full px-3 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition text-sm bg-white appearance-none font-sans ${
                  formData.userId === "" ? "text-gray-400" : "text-gray-700"
                }`}
                style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
              >
                <option value="" disabled hidden style={{ color: '#9CA3AF' }}>Select User</option>
                {mockUsers.map(u => (
                  <option key={u.id} value={u.id} style={{ color: '#374151' }}>{u.name}</option>
                ))}
              </select>
              {errors.userId && <p className="text-red-500 text-xs mt-1 font-sans">{errors.userId}</p>}
            </div>

            {/* Second Row */}
            <div>
              <select
                value={formData.role}
                onChange={(e) => handleInputChange("role", e.target.value)}
                className={`w-full px-3 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition text-sm bg-white appearance-none font-sans ${
                  formData.role === "" ? "text-gray-400" : "text-gray-700"
                }`}
                style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
              >
                <option value="" disabled hidden style={{ color: '#9CA3AF' }}>Select Role</option>
                {["Admin", "Manager", "Guard", "Client"].map(r => (
                  <option key={r} value={r} style={{ color: '#374151' }}>{r}</option>
                ))}
              </select>
              {errors.role && <p className="text-red-500 text-xs mt-1 font-sans">{errors.role}</p>}
            </div>

            <div>
              <select
                value={formData.access}
                onChange={(e) => handleInputChange("access", e.target.value)}
                className={`w-full px-3 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition text-sm bg-white appearance-none font-sans ${
                  formData.access === "" ? "text-gray-400" : "text-gray-700"
                }`}
                style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
              >
                <option value="" disabled hidden style={{ color: '#9CA3AF' }}>Select Access</option>
                {accessOptions.map(a => (
                  <option key={a} value={a} style={{ color: '#374151' }}>{a}</option>
                ))}
              </select>
              {errors.access && <p className="text-red-500 text-xs mt-1 font-sans">{errors.access}</p>}
            </div>

            <div>
              <select
                value={formData.notifiedManagerId}
                onChange={(e) => handleInputChange("notifiedManagerId", e.target.value === "" ? "" : Number(e.target.value))}
                className={`w-full px-3 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition text-sm bg-white appearance-none font-sans ${
                  formData.notifiedManagerId === "" ? "text-gray-400" : "text-gray-700"
                }`}
                style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
              >
                <option value="" disabled hidden style={{ color: '#9CA3AF' }}>Select Manager</option>
                {mockManagers.map(m => (
                  <option key={m.id} value={m.id} style={{ color: '#374151' }}>{m.name}</option>
                ))}
              </select>
              {errors.notifiedManagerId && <p className="text-red-500 text-xs mt-1 font-sans">{errors.notifiedManagerId}</p>}
            </div>

            {/* Third Row - Notifications and Buttons */}
            <div className="col-span-2 relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                className="w-full px-3 py-0.5 border border-gray-300 rounded-md bg-white text-gray-700 placeholder:text-gray-400 text-left focus:outline-none focus:ring-2 focus:ring-[#004175] transition text-sm font-sans"
                style={{ WebkitAppearance: 'none' }}
              >
                {formData.notifications.length > 0 
                  ? formData.notifications.join(", ") 
                  : <span className="text-gray-400">Select Notifications</span>
                }
              </button>
              
              {notifOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto font-sans">
                  {mockNotificationOptions.map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center px-3 py-2 hover:bg-gray-50 text-sm cursor-pointer font-sans"
                    >
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.notifications.includes(opt as NotificationOption)}
                        onChange={() => toggleNotification(opt as NotificationOption)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
              {errors.notifications && <p className="text-red-500 text-xs mt-1 font-sans">{errors.notifications}</p>}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {editingRecord && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="py-1.5 px-4 rounded-md transition cursor-pointer w-auto flex items-center gap-1 border border-gray-500 bg-transparent text-gray-500 hover:bg-gray-50 h-7 text-sm font-sans"
                  style={{ WebkitAppearance: 'none' }}
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                className="py-1.5 px-4 rounded-md transition cursor-pointer w-auto flex items-center gap-1 border border-blue-600 bg-transparent text-blue-600 hover:bg-blue-50 h-7 text-sm font-sans"
                style={{ WebkitAppearance: 'none' }}
              >
                <Plus className="w-4 h-4" />
                {editingRecord ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>

        {/* Assignment History Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 font-sans">Assignment History</h2>
        </div>

        {/* Table Section */}
        <div className="w-full overflow-x-auto rounded-2xl border border-gray-200 shadow-xl bg-white">
          <table className="min-w-[700px] w-full text-sm text-gray-800 border-separate border-spacing-0 font-sans">
            {/* Header */}
            <thead className="bg-[#004175] text-white text-xs font-sans">
              <tr>
                <th className="px-4 py-3 text-left border-b border-gray-300 whitespace-nowrap select-none font-sans">
                  <div className="flex items-center">
                    Client Name
                    <div className="pl-1">
                      <span 
                        className={`cursor-pointer ${sortConfig.key === 'clientName' && sortConfig.direction === 'asc' ? 'text-white' : 'text-white/40'}`}
                        onClick={() => handleSort('clientName')}
                      >
                        <ChevronUp className="-mb-1 w-4 h-4" />
                      </span>
                      <span 
                        className={`cursor-pointer ${sortConfig.key === 'clientName' && sortConfig.direction === 'desc' ? 'text-white' : 'text-white/40'}`}
                        onClick={() => handleSort('clientName')}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-left border-b border-gray-300 whitespace-nowrap select-none font-sans">
                  <div className="flex items-center">
                    Client Location
                    <div className="pl-1">
                      <span 
                        className={`cursor-pointer ${sortConfig.key === 'location' && sortConfig.direction === 'asc' ? 'text-white' : 'text-white/40'}`}
                        onClick={() => handleSort('location')}
                      >
                        <ChevronUp className="-mb-1 w-4 h-4" />
                      </span>
                      <span 
                        className={`cursor-pointer ${sortConfig.key === 'location' && sortConfig.direction === 'desc' ? 'text-white' : 'text-white/40'}`}
                        onClick={() => handleSort('location')}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-left border-b border-gray-300 whitespace-nowrap select-none font-sans">
                  <div className="flex items-center">
                    User Name
                    <div className="pl-1">
                      <span 
                        className={`cursor-pointer ${sortConfig.key === 'userName' && sortConfig.direction === 'asc' ? 'text-white' : 'text-white/40'}`}
                        onClick={() => handleSort('userName')}
                      >
                        <ChevronUp className="-mb-1 w-4 h-4" />
                      </span>
                      <span 
                        className={`cursor-pointer ${sortConfig.key === 'userName' && sortConfig.direction === 'desc' ? 'text-white' : 'text-white/40'}`}
                        onClick={() => handleSort('userName')}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-left border-b border-gray-300 whitespace-nowrap select-none font-sans">
                  <div className="flex items-center">
                    Role
                    <div className="pl-1">
                      <span 
                        className={`cursor-pointer ${sortConfig.key === 'role' && sortConfig.direction === 'asc' ? 'text-white' : 'text-white/40'}`}
                        onClick={() => handleSort('role')}
                      >
                        <ChevronUp className="-mb-1 w-4 h-4" />
                      </span>
                      <span 
                        className={`cursor-pointer ${sortConfig.key === 'role' && sortConfig.direction === 'desc' ? 'text-white' : 'text-white/40'}`}
                        onClick={() => handleSort('role')}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-left border-b border-gray-300 whitespace-nowrap select-none font-sans">
                  <div className="flex items-center">
                    Access
                    <div className="pl-1">
                      <span 
                        className={`cursor-pointer ${sortConfig.key === 'access' && sortConfig.direction === 'asc' ? 'text-white' : 'text-white/40'}`}
                        onClick={() => handleSort('access')}
                      >
                        <ChevronUp className="-mb-1 w-4 h-4" />
                      </span>
                      <span 
                        className={`cursor-pointer ${sortConfig.key === 'access' && sortConfig.direction === 'desc' ? 'text-white' : 'text-white/40'}`}
                        onClick={() => handleSort('access')}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-left border-b border-gray-300 whitespace-nowrap select-none font-sans">
                  <div className="flex items-center">
                    Manager
                    <div className="pl-1">
                      <span 
                        className={`cursor-pointer ${sortConfig.key === 'notifiedManagerName' && sortConfig.direction === 'asc' ? 'text-white' : 'text-white/40'}`}
                        onClick={() => handleSort('notifiedManagerName')}
                      >
                        <ChevronUp className="-mb-1 w-4 h-4" />
                      </span>
                      <span 
                        className={`cursor-pointer ${sortConfig.key === 'notifiedManagerName' && sortConfig.direction === 'desc' ? 'text-white' : 'text-white/40'}`}
                        onClick={() => handleSort('notifiedManagerName')}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-left border-b border-gray-300 whitespace-nowrap font-sans">Notifications</th>
                <th className="px-4 py-3 text-left border-b border-gray-300 whitespace-nowrap font-sans">Actions</th>
              </tr>

              {/* Search Row */}
              <tr className="bg-white text-gray-700 font-sans">
                <th className="px-4 py-2 border-b text-left">
                  <input
                    placeholder="Search client name"
                    className="w-40 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 placeholder:text-gray-400 font-sans"
                    type="text"
                    value={searchTerms.clientName}
                    onChange={(e) => setSearchTerms(prev => ({ ...prev, clientName: e.target.value }))}
                    style={{ WebkitAppearance: 'none' }}
                  />
                </th>
                <th className="px-4 py-2 border-b text-left">
                  <input
                    placeholder="Search client location"
                    className="w-40 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 placeholder:text-gray-400 font-sans"
                    type="text"
                    value={searchTerms.clientLocation}
                    onChange={(e) => setSearchTerms(prev => ({ ...prev, clientLocation: e.target.value }))}
                    style={{ WebkitAppearance: 'none' }}
                  />
                </th>
                <th className="px-4 py-2 border-b text-left">
                  <input
                    placeholder="Search user name"
                    className="w-40 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 placeholder:text-gray-400 font-sans"
                    type="text"
                    value={searchTerms.invoiceName}
                    onChange={(e) => setSearchTerms(prev => ({ ...prev, invoiceName: e.target.value }))}
                    style={{ WebkitAppearance: 'none' }}
                  />
                </th>
                <th className="px-4 py-2 border-b text-left">
                  <input
                    placeholder="Search role"
                    className="w-40 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 placeholder:text-gray-400 font-sans"
                    type="text"
                    value={searchTerms.status}
                    onChange={(e) => setSearchTerms(prev => ({ ...prev, status: e.target.value }))}
                    style={{ WebkitAppearance: 'none' }}
                  />
                </th>
                <th className="px-4 py-2 border-b text-left">
                  <input
                    placeholder="Search access"
                    className="w-40 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 placeholder:text-gray-400 font-sans"
                    type="text"
                    value={searchTerms.access}
                    onChange={(e) => setSearchTerms(prev => ({ ...prev, access: e.target.value }))}
                    style={{ WebkitAppearance: 'none' }}
                  />
                </th>
                <th className="px-4 py-2 border-b text-left">
                  <input
                    placeholder="Search manager"
                    className="w-40 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 placeholder:text-gray-400 font-sans"
                    type="text"
                    value={searchTerms.manager}
                    onChange={(e) => setSearchTerms(prev => ({ ...prev, manager: e.target.value }))}
                    style={{ WebkitAppearance: 'none' }}
                  />
                </th>
                <th className="px-4 py-2 border-b"></th>
                <th className="px-4 py-2 border-b"></th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {filteredAssignments.map((record) => (
                <tr key={record.id} className="hover:bg-blue-50 transition-colors border-t border-gray-100 font-sans">
                  <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap font-sans">{record.clientName}</td>
                  <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap font-sans">{record.location || "-"}</td>
                  <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap font-sans">{record.userName}</td>
                  <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap font-sans">{record.role}</td>
                  <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap font-sans">{record.access}</td>
                  <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap font-sans">{record.notifiedManagerName}</td>
                  <td className="px-4 py-3 border-b border-gray-100 font-sans">
                    <div className="flex flex-wrap gap-1">
                      {record.notifications.map((notif, i) => (
                        <span key={i} className="inline-flex px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                          {notif}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap font-sans">
                    <div className="flex items-center">
                      <button
                        onClick={() => handleEdit(record)}
                        className="text-blue-500 hover:text-green-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-square-pen" aria-hidden="true">
                          <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(record)}
                        className="pl-2 text-red-500 hover:text-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash2 lucide-trash-2" aria-hidden="true">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          <line x1="10" x2="10" y1="11" y2="17"></line>
                          <line x1="14" x2="14" y1="11" y2="17"></line>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AssignmentUI;

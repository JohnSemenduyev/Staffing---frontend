import React, { useState, useEffect, useMemo, useRef } from "react";
import { ChevronDown, Search, Plus, Grid, List, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";

// Mock data
const mockClients = [
  { id: 1, name: "Acme Corp", locations: ["New York Office", "Boston Branch", "Chicago Hub"] },
  { id: 2, name: "TechFlow Inc", locations: ["San Francisco HQ", "Austin Office", "Seattle Branch"] },
  { id: 3, name: "Global Industries", locations: ["London Office", "Paris Branch", "Berlin Hub"] }
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
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [filters, setFilters] = useState({
    client: "",
    location: "",
    user: "",
    role: "",
    access: "",
    manager: ""
  });
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<AssignmentRecord | null>(null);

  // Refs
  const notifRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Computed values
  const availableLocations = useMemo(() => {
    const client = mockClients.find((c) => c.id === Number(formData.clientId));
    return client ? client.locations : [];
  }, [formData.clientId]);

  const accessOptions = useMemo<("View" | "Edit")[]>(() => {
    if (!formData.role) return [];
    return formData.role === "Admin" || formData.role === "Manager" ? ["Edit"] : ["View"];
  }, [formData.role]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter(record => {
      const matchesSearch = !searchTerm || 
        record.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.notifiedManagerName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilters = 
        (!filters.client || record.clientName.toLowerCase().includes(filters.client.toLowerCase())) &&
        (!filters.location || record.location?.toLowerCase().includes(filters.location.toLowerCase())) &&
        (!filters.user || record.userName.toLowerCase().includes(filters.user.toLowerCase())) &&
        (!filters.role || record.role.toLowerCase().includes(filters.role.toLowerCase())) &&
        (!filters.access || record.access.toLowerCase().includes(filters.access.toLowerCase())) &&
        (!filters.manager || record.notifiedManagerName.toLowerCase().includes(filters.manager.toLowerCase()));

      return matchesSearch && matchesFilters;
    });
  }, [assignments, searchTerm, filters]);

  // Effects
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
      // Remove dropdown ref check since we're not using it consistently
      if (dropdownOpen) {
        const target = e.target as Element;
        if (!target.closest('.relative')) {
          setDropdownOpen(null);
        }
      }
    }
    if (notifOpen || dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen, dropdownOpen]);

  // Event handlers
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
      setDropdownOpen(null);
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
      setFormData({
        clientId: "",
        location: "",
        userId: "",
        role: "",
        access: "",
        notifiedManagerId: "",
        notifications: []
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-normal text-gray-800 mb-6">
            {editingRecord ? 'Edit Assignment' : 'Assign User Permissions'}
          </h1>
          
          {/* Form Section */}
          <div className="bg-white border border-gray-200 shadow-sm mb-8">
            <div className="p-6">
              <div className="grid grid-cols-4 gap-4 mb-6">
                
                {/* Client Select */}
                <div className="relative">
                  <select
                    value={formData.clientId}
                    onChange={(e) => {
                      const value = e.target.value === "" ? "" : Number(e.target.value);
                      handleInputChange("clientId", value);
                      handleInputChange("location", "");
                    }}
                    className={`w-full px-3 py-2 border bg-white text-gray-700 focus:outline-none focus:border-gray-400 appearance-none
                      ${errors.clientId ? 'border-red-300' : 'border-gray-300'}`}
                  >
                    <option value="">Select Client *</option>
                    {mockClients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  {errors.clientId && <p className="text-red-500 text-xs mt-1">{errors.clientId}</p>}
                </div>

                {/* Location Select */}
                <div className="relative">
                  <select
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    className={`w-full px-3 py-2 border bg-white text-gray-700 focus:outline-none focus:border-gray-400 appearance-none
                      ${errors.location ? 'border-red-300' : 'border-gray-300'}`}
                  >
                    <option value="">Select Location *</option>
                    {availableLocations.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
                </div>

                {/* User Select */}
                <div className="relative">
                  <select
                    value={formData.userId}
                    onChange={(e) => handleInputChange("userId", e.target.value === "" ? "" : Number(e.target.value))}
                    className={`w-full px-3 py-2 border bg-white text-gray-700 focus:outline-none focus:border-gray-400 appearance-none
                      ${errors.userId ? 'border-red-300' : 'border-gray-300'}`}
                  >
                    <option value="">Select User *</option>
                    {mockUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  {errors.userId && <p className="text-red-500 text-xs mt-1">{errors.userId}</p>}
                </div>

                {/* Role Select */}
                <div className="relative">
                  <select
                    value={formData.role}
                    onChange={(e) => handleInputChange("role", e.target.value)}
                    className={`w-full px-3 py-2 border bg-white text-gray-700 focus:outline-none focus:border-gray-400 appearance-none
                      ${errors.role ? 'border-red-300' : 'border-gray-300'}`}
                  >
                    <option value="">Select Role *</option>
                    {["Admin", "Manager", "Guard", "Client"].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
                </div>

                {/* Access Select */}
                <div className="relative">
                  <select
                    value={formData.access}
                    onChange={(e) => handleInputChange("access", e.target.value)}
                    className={`w-full px-3 py-2 border bg-white text-gray-700 focus:outline-none focus:border-gray-400 appearance-none
                      ${errors.access ? 'border-red-300' : 'border-gray-300'}`}
                  >
                    <option value="">Select Access *</option>
                    {accessOptions.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  {errors.access && <p className="text-red-500 text-xs mt-1">{errors.access}</p>}
                </div>

                {/* Manager Select */}
                <div className="relative">
                  <select
                    value={formData.notifiedManagerId}
                    onChange={(e) => handleInputChange("notifiedManagerId", e.target.value === "" ? "" : Number(e.target.value))}
                    className={`w-full px-3 py-2 border bg-white text-gray-700 focus:outline-none focus:border-gray-400 appearance-none
                      ${errors.notifiedManagerId ? 'border-red-300' : 'border-gray-300'}`}
                  >
                    <option value="">User Notified *</option>
                    {mockManagers.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  {errors.notifiedManagerId && <p className="text-red-500 text-xs mt-1">{errors.notifiedManagerId}</p>}
                </div>

                {/* Notifications Multi-select */}
                <div className="relative" ref={notifRef}>
                  <button
                    type="button"
                    onClick={() => setNotifOpen(!notifOpen)}
                    className={`w-full px-3 py-2 border bg-white text-gray-700 text-left focus:outline-none focus:border-gray-400
                      ${errors.notifications ? 'border-red-300' : 'border-gray-300'}`}
                  >
                    {formData.notifications.length > 0 
                      ? formData.notifications.join(", ") 
                      : "Select Notifications *"
                    }
                  </button>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  
                  {notifOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 shadow-lg max-h-48 overflow-auto">
                      {mockNotificationOptions.map((opt) => (
                        <label
                          key={opt}
                          className="flex items-center px-3 py-2 hover:bg-gray-50 text-sm cursor-pointer"
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
                  {errors.notifications && <p className="text-red-500 text-xs mt-1">{errors.notifications}</p>}
                </div>

                {/* Submit Button */}
                <div className="flex items-end gap-2">
                  {editingRecord && (
                    <button

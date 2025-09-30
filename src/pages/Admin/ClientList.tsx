import React, { useEffect, useState, useMemo, useRef } from "react";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { GoPlus } from "react-icons/go";
import { ChevronDown, Check, X } from "lucide-react";
import Pagination from "../../components/Pagination";
import { useScheduleSessionContext } from "../../context/ClientList";
import { useToast } from '../../hooks/use-toast';
import {  FieldConfig } from "../../components/GenericFormSearch";
import { Search } from "lucide-react";
// import { GenericTable } from "@/components/GenericTable";
import { graphQLClient } from "../../GraphqlClient";
import { DELETE_CLIENT, UPDATE_CLIENT_WITH_ADDRESS } from "../../graphql/mutation";
import { Button } from "../../components/ui/button";

interface NewClientData {
  clientName: string;
  industry: string;
  contractHour: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: string;
  longitude: string;
}

function ClientList() {
  const { toast } = useToast();
  const {
    state,
    fetchScheduleSessions,
    setCurrentPage,
    createClient,
    refreshScheduleSessions
  } = useScheduleSessionContext();
  const { scheduleSessions, loading, error, lastPage, currentPage } = state;

  // State for add new row
  const [showAddRow, setShowAddRow] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newClientData, setNewClientData] = useState<NewClientData>({
    clientName: "",
    industry: "",
    contractHour: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    latitude: "",
    longitude: ""
  });

  // State for search and sort
  const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({});
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [tableHeight, setTableHeight] = useState<string>("400px");
  const formRef = useRef<HTMLDivElement>(null);

  // Client edit/delete modals
  const [deleteClientModal, setDeleteClientModal] = useState({ isOpen: false, clientId: null, clientName: "" });
  const [saveEditModal, setSaveEditModal] = useState({ isOpen: false, clientData: null });
  const [cancelEditModal, setCancelEditModal] = useState({ isOpen: false });

  // Loading states
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Client editing state
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [editClientForm, setEditClientForm] = useState({
    name: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    industry: "",
    contractHour: "",
    latitude: "",
    longitude: ""
  });

  const searchFields: FieldConfig[] = [
    { name: "clientName", type: "text", placeholder: "Client Name" },
    { name: "industry", type: "text", placeholder: "Industry" },
    { name: "contractHour", type: "text", placeholder: "Contract Hour" },
    { name: "address", type: "text", placeholder: "Street Address" },
    { name: "city", type: "text", placeholder: "City" },
    { name: "state", type: "text", placeholder: "State" },
    { name: "pincode", type: "text", placeholder: "Zip Code" },
  ];

  const handleSearch = (formData: any) => {
    // console.log('Client List search:', formData);
    setSearchLoading(false);

    // Show search feedback
    if (Object.keys(formData).some(key => formData[key] && formData[key].trim())) {

    } else {
      toast({
        title: "No Search Terms",
        description: "Please enter at least one search term.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    // setShowSearchForm(false);
    setSearchTerms({});

  };
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "asc" | "desc";
  }>({
    key: null,
    direction: "asc",
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchScheduleSessions(currentPage);
      } catch (error: any) {
        console.error("Error loading client data:", error);

        let errorMessage = "Failed to load client data. Please try again.";

        if (error.message) {
          if (error.message.includes("Network Error") || error.message.includes("fetch")) {
            errorMessage = "Network error. Please check your internet connection and try again.";
          } else if (error.response?.errors && error.response.errors.length > 0) {
            errorMessage = error.response.errors[0].message || errorMessage;
          } else {
            errorMessage = error.message;
          }
        }

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    };

    loadData();
  }, [currentPage]);

  // Calculate table height dynamically
  useEffect(() => {
    const calculateTableHeight = () => {
      if (formRef.current) {
        const formHeight = formRef.current.offsetHeight;
        const calculatedHeight = `calc(100vh - ${formHeight}px - 150px)`;
        setTableHeight(calculatedHeight);
      }
    };

    // Calculate on mount and when form content changes
    calculateTableHeight();

    // Recalculate on window resize
    const handleResize = () => {
      calculateTableHeight();
    };

    window.addEventListener('resize', handleResize);
    
    // Use ResizeObserver to detect form height changes
    const resizeObserver = new ResizeObserver(() => {
      calculateTableHeight();
    });

    if (formRef.current) {
      resizeObserver.observe(formRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  // Helper function to get nested values
  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  };

  // Handle sort
  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Handle add button click
  const handleAddClick = () => {
    setShowAddRow(true);
    setNewClientData({
      clientName: "",
      industry: "",
      contractHour: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      latitude: "",   // Reset latitude
      longitude: ""   // Reset longitude
    });

  };

  // Handle delete client
  const handleDeleteClient = (clientId: number, clientName: string) => {
    console.log("Delete client clicked:", clientId, clientName);
    setDeleteClientModal({ isOpen: true, clientId, clientName });
  };

  const confirmDeleteClient = async () => {
    setIsDeleting(true);
    try {
      const token = sessionStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication token not found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      await graphQLClient.request(
        DELETE_CLIENT,
        { deleteClientId: deleteClientModal.clientId },
        { Authorization: `Bearer ${token}` }
      );

      toast({
        title: "Success",
        description: `Client "${deleteClientModal.clientName}" deleted successfully!`,
      });

      // Refresh the client list
      refreshScheduleSessions();
    } catch (error: any) {
      console.error("Error deleting client:", error);

      // Handle different types of errors
      let errorMessage = "Failed to delete client. Please try again.";

      if (error.message) {
        if (error.message.includes("Network Error") || error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else if (error.response?.errors && error.response.errors.length > 0) {
          errorMessage = error.response.errors[0].message || errorMessage;
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleteClientModal({ isOpen: false, clientId: null, clientName: "" });
      setIsDeleting(false);
    }
  };

  const cancelDeleteClient = () => {
    setDeleteClientModal({ isOpen: false, clientId: null, clientName: "" });
  };

  // Handle edit client (inline editing)
  const handleEditClient = (clientData: any) => {
    console.log("Edit client clicked:", clientData);
    setEditingClientId(clientData.client?.id);
    setEditClientForm({
      name: clientData.client?.name || "",
      lastName: clientData.client?.lastName || "",
      address: clientData.address || "",
      city: clientData.city || "",
      state: clientData.state || "",
      pincode: clientData.pincode || "",
      industry: clientData.industry || "",
      contractHour: clientData.contractHour || "",
      latitude: clientData.latitude || "",
      longitude: clientData.longitute || ""
    });


  };

  const handleSaveEdit = (clientData: any) => {
    console.log("Save edit clicked:", clientData);
    setSaveEditModal({ isOpen: true, clientData });
  };

  const confirmSaveEdit = async () => {
    setIsSaving(true);
    try {
      const token = sessionStorage.getItem("token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication token not found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      // Build input object, excluding null/empty latitude/longitude
      const input: any = {
        clientId: saveEditModal.clientData?.client?.id,
        addressId: saveEditModal.clientData?.id,
        name: editClientForm.name,
        lastName: editClientForm.lastName,
        address: editClientForm.address,
        city: editClientForm.city,
        state: editClientForm.state,
        pincode: editClientForm.pincode,
        industry: editClientForm.industry,
        contractHours: parseInt(editClientForm.contractHour) || 0
      };

      // Only add latitude/longitude if they have values
      if (editClientForm.latitude && String(editClientForm.latitude).trim()) {
        input.latitude = parseFloat(String(editClientForm.latitude));
      }
      if (editClientForm.longitude && String(editClientForm.longitude).trim()) {
        input.longitute = parseFloat(String(editClientForm.longitude));
      }

      await graphQLClient.request(
        UPDATE_CLIENT_WITH_ADDRESS,
        { input },
        { Authorization: `Bearer ${token}` }
      );

      toast({
        title: "Success",
        description: "Client updated successfully!",
      });

      // Reset editing state
      setEditingClientId(null);
      setEditClientForm({
        name: "",
        lastName: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        industry: "",
        contractHour: "",
        latitude: "",
        longitude: ""
      });

      // Refresh the client list
      refreshScheduleSessions();
    } catch (error: any) {
      console.error("Error updating client:", error);

      // Handle different types of errors
      let errorMessage = "Failed to update client. Please try again.";

      if (error.message) {
        if (error.message.includes("Network Error") || error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else if (error.response?.errors && error.response.errors.length > 0) {
          errorMessage = error.response.errors[0].message || errorMessage;
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaveEditModal({ isOpen: false, clientData: null });
      setIsSaving(false);
    }
  };

  const cancelSaveEdit = () => {
    setSaveEditModal({ isOpen: false, clientData: null });
  };

  const handleCancelEdit = () => {
    console.log("Cancel edit clicked");
    setCancelEditModal({ isOpen: true });
  };

  const confirmCancelEdit = () => {
    setEditingClientId(null);
    setEditClientForm({
      name: "",
      lastName: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      industry: "",
      contractHour: "",
      latitude: "",
      longitude: ""
    });
    setCancelEditModal({ isOpen: false });
  };

  const cancelCancelEdit = () => {
    setCancelEditModal({ isOpen: false });
  };

  // Handle cancel add
  const handleCancelAdd = () => {
    setShowAddRow(false);
    setIsCreating(false);
    setNewClientData({
      clientName: "",
      industry: "",
      contractHour: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      latitude: "",   // Reset latitude
      longitude: ""   // Reset longitude
    });

    // Show feedback that add operation was cancelled
    toast({
      title: "Add Cancelled",
      description: "Adding new client has been cancelled.",
    });
  };

  // Validation function
  const validateNewClientData = () => {
    const errors: string[] = [];

    if (!newClientData.clientName.trim()) {
      errors.push("Client name is required");
    }
    if (!newClientData.industry.trim()) {
      errors.push("Industry is required");
    }
    if (!newClientData.contractHour.trim()) {
      errors.push("Contract hour is required");
    }
    if (!newClientData.address.trim()) {
      errors.push("Address is required");
    }
    if (!newClientData.city.trim()) {
      errors.push("City is required");
    }
    if (!newClientData.state.trim()) {
      errors.push("State is required");
    }
    if (!newClientData.pincode.trim()) {
      errors.push("Pincode is required");
    }
    // Add validation for latitude and longitude (optional but if provided, should be valid numbers)
    if (newClientData.latitude.trim() && isNaN(Number(newClientData.latitude))) {
      errors.push("Latitude must be a valid number");
    }
    if (newClientData.longitude.trim() && isNaN(Number(newClientData.longitude))) {
      errors.push("Longitude must be a valid number");
    }

    return errors;
  };

  // Handle save new client

  const handleSaveNewClient = async () => {
    // Split clientName into first and last (multiple spaces safe)
    const parts = newClientData.clientName.trim().split(/\s+/);
    const firstName = parts[0] ?? "";
    const lastName = parts.length > 1 ? parts[parts.length - 1] : undefined;
    const validationErrors = validateNewClientData();
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please fill in all required fields:\n${validationErrors.join("\n")}`,
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const input = {
        name: firstName,
        lastName: lastName || null,
        addresses: [{
          address: newClientData.address,
          city: newClientData.city,
          state: newClientData.state,
          pincode: newClientData.pincode,
          contractHours: parseInt(newClientData.contractHour) || 0,
          industry: newClientData.industry,
          latitude: newClientData.latitude ? parseFloat(newClientData.latitude) : null,
          longitude: newClientData.longitude ? parseFloat(newClientData.longitude) : null,
        }]
      };

      const createdClient = await createClient(input);

      setShowAddRow(false);
      setNewClientData({
        clientName: "",
        industry: "",
        contractHour: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        latitude: "",
        longitude: ""
      });

      await refreshScheduleSessions();
      toast({
        title: "Success",
        description: "Client created successfully!",
      });
    } catch (error: any) {
      console.error("Failed to create client:", error);

      // Handle different types of errors
      let errorMessage = "Failed to create client. Please try again.";

      if (error.message) {
        if (error.message.includes("Network Error") || error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else if (error.response?.errors && error.response.errors.length > 0) {
          errorMessage = error.response.errors[0].message || errorMessage;
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Handle input change for new client
  const handleNewClientInputChange = (field: keyof NewClientData, value: string) => {
    setNewClientData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = (scheduleSessions || []).filter((record) => {
      // Client Name search
      if (searchTerms["client.name"]) {
        const clientName = getNestedValue(record, "client.name");
        if (!clientName || !String(clientName).toLowerCase().includes(searchTerms["client.name"].toLowerCase())) {
          return false;
        }
      }

      // Industry search
      if (searchTerms["industry"]) {
        const industry = getNestedValue(record, "industry");
        if (!industry || !String(industry).toLowerCase().includes(searchTerms["industry"].toLowerCase())) {
          return false;
        }
      }

      // Contract Hour search
      if (searchTerms["contractHour"]) {
        const contractHour = getNestedValue(record, "contractHour");
        if (!contractHour || !String(contractHour).toLowerCase().includes(searchTerms["contractHour"].toLowerCase())) {
          return false;
        }
      }

      // Address search
      if (searchTerms["address"]) {
        const address = getNestedValue(record, "address");
        if (!address || !String(address).toLowerCase().includes(searchTerms["address"].toLowerCase())) {
          return false;
        }
      }

      // City search
      if (searchTerms["city"]) {
        const city = getNestedValue(record, "city");
        if (!city || !String(city).toLowerCase().includes(searchTerms["city"].toLowerCase())) {
          return false;
        }
      }

      // State search
      if (searchTerms["state"]) {
        const state = getNestedValue(record, "state");
        if (!state || !String(state).toLowerCase().includes(searchTerms["state"].toLowerCase())) {
          return false;
        }
      }

      // Pincode search
      if (searchTerms["pincode"]) {
        const pincode = getNestedValue(record, "pincode");
        if (!pincode || !String(pincode).toLowerCase().includes(searchTerms["pincode"].toLowerCase())) {
          return false;
        }
      }

      // Remove latitude and longitude search filters since they don't exist in the backend yet
      // We'll add them back once the backend supports these fields

      return true;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = getNestedValue(a, sortConfig.key!);
        const bValue = getNestedValue(b, sortConfig.key!);

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        let aCompare: any = aValue;
        let bCompare: any = bValue;

        // Handle numeric comparison for coordinates and other numeric fields
        if (!isNaN(Number(aCompare)) && !isNaN(Number(bCompare))) {
          aCompare = Number(aCompare);
          bCompare = Number(bCompare);
        } else if (typeof aCompare === "string" && typeof bCompare === "string") {
          aCompare = aCompare.toLowerCase();
          bCompare = bCompare.toLowerCase();
        }

        if (aCompare < bCompare) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aCompare > bCompare) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [scheduleSessions, searchTerms, sortConfig]);

  // Show error if there's one
  if (error) {
    return (
      <div className="min-h-screen p-6 font-sans">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 font-sans">

      <div ref={formRef} className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Client  List
          </h2>

        </div>

        {/* Add Button */}
        <Button
          type="button"
          onClick={handleAddClick}
          disabled={showAddRow || isCreating}
          variant="outline"
        >
          <GoPlus className="w-4 h-4 mr-1" />
          Add Client
        </Button>
      </div>
      <div className="w-full mt-3">
        <div
          className="relative w-full rounded-2xl border border-gray-200 shadow-xl bg-white"
          style={{ height: tableHeight, minHeight: "400px" }}
        >
          <div className="w-full h-full overflow-auto bg-white rounded-t-2xl custom-scrollbar">
            <table className="w-auto min-w-full table-fixed text-sm text-gray-800 font-sans">
              <thead className="bg-[#004175] text-white text-xs font-sans sticky top-0 z-10 ">
                <tr className="h-[41px] " style={{ lineHeight: '16px' }}>
                  <th className="px-4 py-1 text-left border-b border-gray-300 whitespace-nowrap" style={{ width: "120px" }}>
                    Actions
                  </th>
                  <th className="px-4 py-1 text-left border-b border-gray-300 whitespace-nowrap" style={{ width: "200px" }}>
                    <div className="flex items-center">
                      Client Name
                      <div className="pl-1 cursor-pointer" onClick={() => handleSort("client.name")}>
                        <span className={`cursor-pointer ${sortConfig.key === "client.name" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="-mb-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
                          </svg>
                        </span>
                        <span className={`cursor-pointer ${sortConfig.key === "client.name" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="m98 190.06 139.78 163.12a24 24 0 0 0 36.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z"></path>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-1 text-left border-b border-gray-300 whitespace-nowrap" style={{ width: "200px" }}>
                    <div className="flex items-center">
                      Industry
                      <div className="pl-1 cursor-pointer" onClick={() => handleSort("industry")}>
                        <span className={`cursor-pointer ${sortConfig.key === "industry" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="-mb-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
                          </svg>
                        </span>
                        <span className={`cursor-pointer ${sortConfig.key === "industry" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="m98 190.06 139.78 163.12a24 24 0 0 0 36.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z"></path>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-1 text-left border-b border-gray-300 whitespace-nowrap" style={{ width: "200px" }}>
                    <div className="flex items-center">
                      Contract Hours
                      <div className="pl-1 cursor-pointer" onClick={() => handleSort("contractHour")}>
                        <span className={`cursor-pointer ${sortConfig.key === "contractHour" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="-mb-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
                          </svg>
                        </span>
                        <span className={`cursor-pointer ${sortConfig.key === "contractHour" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="m98 190.06 139.78 163.12a24 24 0 0 0 36.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z"></path>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-1 text-left border-b border-gray-300 whitespace-nowrap" style={{ width: "250px" }}>
                    <div className="flex items-center">
                      Street Address
                      <div className="pl-1 cursor-pointer" onClick={() => handleSort("address")}>
                        <span className={`cursor-pointer ${sortConfig.key === "address" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="-mb-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
                          </svg>
                        </span>
                        <span className={`cursor-pointer ${sortConfig.key === "address" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="m98 190.06 139.78 163.12a24 24 0 0 0 36.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z"></path>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-1 text-left border-b border-gray-300 whitespace-nowrap" style={{ width: "150px" }}>
                    <div className="flex items-center">
                      City
                      <div className="pl-1 cursor-pointer" onClick={() => handleSort("city")}>
                        <span className={`cursor-pointer ${sortConfig.key === "city" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="-mb-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
                          </svg>
                        </span>
                        <span className={`cursor-pointer ${sortConfig.key === "city" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="m98 190.06 139.78 163.12a24 24 0 0 0 36.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z"></path>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-1 text-left border-b border-gray-300 whitespace-nowrap" style={{ width: "100px" }}>
                    <div className="flex items-center">
                      State
                      <div className="pl-1 cursor-pointer" onClick={() => handleSort("state")}>
                        <span className={`cursor-pointer ${sortConfig.key === "state" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="-mb-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
                          </svg>
                        </span>
                        <span className={`cursor-pointer ${sortConfig.key === "state" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="m98 190.06 139.78 163.12a24 24 0 0 0 36.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z"></path>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-1 text-left border-b border-gray-300 whitespace-nowrap" style={{ width: "120px" }}>
                    <div className="flex items-center">
                      Zip Code
                      <div className="pl-1 cursor-pointer" onClick={() => handleSort("pincode")}>
                        <span className={`cursor-pointer ${sortConfig.key === "pincode" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="-mb-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
                          </svg>
                        </span>
                        <span className={`cursor-pointer ${sortConfig.key === "pincode" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="m98 190.06 139.78 163.12a24 24 0 0 0 36.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z"></path>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-1 text-left border-b border-gray-300 whitespace-nowrap" style={{ width: "120px" }}>
                    <div className="flex items-center">
                      Latitude
                      <div className="pl-1 cursor-pointer" onClick={() => handleSort("latitude")}>
                        <span className={`cursor-pointer ${sortConfig.key === "latitude" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="-mb-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
                          </svg>
                        </span>
                        <span className={`cursor-pointer ${sortConfig.key === "latitude" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="m98 190.06 139.78 163.12a24 24 0 0 0 36.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z"></path>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-1 text-left border-b border-gray-300 whitespace-nowrap" style={{ width: "120px" }}>
                    <div className="flex items-center">
                      Longitude
                      <div className="pl-1 cursor-pointer" onClick={() => handleSort("longitute")}>
                        <span className={`cursor-pointer ${sortConfig.key === "longitute" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="-mb-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
                          </svg>
                        </span>
                        <span className={`cursor-pointer ${sortConfig.key === "longitute" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="m98 190.06 139.78 163.12a24 24 0 0 0 36.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z"></path>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </th>
                </tr>

                <tr className="bg-white text-gray-700 font-sans w-full">
                  <th className="px-4 py-2 text-left" style={{ width: "120px" }}>
                    {/* Actions column - no search input */}
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "200px" }}>
                    <input
                      placeholder="Search client name"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                      type="text"
                      value={searchTerms["client.name"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "client.name": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(200px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "200px" }}>
                    <input
                      placeholder="Search industry"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                      type="text"
                      value={searchTerms["industry"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "industry": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(200px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "200px" }}>
                    <input
                      placeholder="Search contract hours"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                      type="text"
                      value={searchTerms["contractHour"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "contractHour": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(200px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "250px" }}>
                    <input
                      placeholder="Search street address"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                      type="text"
                      value={searchTerms["address"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "address": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(250px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "150px" }}>
                    <input
                      placeholder="Search city"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                      type="text"
                      value={searchTerms["city"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "city": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(150px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "100px" }}>
                    <input
                      placeholder="Search state"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                      type="text"
                      value={searchTerms["state"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "state": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(100px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "250px" }}>
                    <input
                      placeholder="Search zip code"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                      type="text"
                      value={searchTerms["pincode"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "pincode": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(120px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "120px" }}>
                    <input
                      placeholder="Search latitude"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                      type="text"
                      value={searchTerms["latitude"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "latitude": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(120px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "120px" }}>
                    <input
                      placeholder="Search longitude"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                      type="text"
                      value={searchTerms["longitude"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "longitude": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(120px - 32px)' }}
                    />
                  </th>
                </tr>
              </thead>

              <tbody className="relative">
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="relative p-0"
                      style={{ height: "calc(400px - 150px)" }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center bg-white">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-gray-500">Loading...</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {showAddRow && (
                      <tr className="bg-gray-100 border-2 ">
                        <td className="px-4 py-3 border-b border-gray-100" style={{ width: "120px" }}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleSaveNewClient}
                              disabled={isCreating}
                              className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Save client"
                            >
                              {isCreating ? (
                                <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={handleCancelAdd}
                              disabled={isCreating}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100" style={{ width: "200px" }}>
                          <input
                            placeholder="Enter client name"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                            type="text"
                            value={newClientData.clientName}
                            onChange={(e) => handleNewClientInputChange("clientName", e.target.value)}
                            disabled={isCreating}
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100" style={{ width: "200px" }}>
                          <input
                            placeholder="Enter industry"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                            type="text"
                            value={newClientData.industry}
                            onChange={(e) => handleNewClientInputChange("industry", e.target.value)}
                            disabled={isCreating}
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100" style={{ width: "200px" }}>
                          <input
                            placeholder="Enter contract hours"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                            type="number"
                            value={newClientData.contractHour}
                            onChange={(e) => handleNewClientInputChange("contractHour", e.target.value)}
                            disabled={isCreating}
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100" style={{ width: "250px" }}>
                          <input
                            placeholder="Enter street address"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                            type="text"
                            value={newClientData.address}
                            onChange={(e) => handleNewClientInputChange("address", e.target.value)}
                            disabled={isCreating}
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100" style={{ width: "150px" }}>
                          <input
                            placeholder="Enter city"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                            type="text"
                            value={newClientData.city}
                            onChange={(e) => handleNewClientInputChange("city", e.target.value)}
                            disabled={isCreating}
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100" style={{ width: "100px" }}>
                          <input
                            placeholder="Enter state"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                            type="text"
                            value={newClientData.state}
                            onChange={(e) => handleNewClientInputChange("state", e.target.value)}
                            disabled={isCreating}
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100" style={{ width: "120px" }}>
                          <input
                            placeholder="Enter zip"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                            type="text"
                            value={newClientData.pincode}
                            onChange={(e) => handleNewClientInputChange("pincode", e.target.value)}
                            disabled={isCreating}
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100" style={{ width: "120px" }}>
                          <input
                            placeholder="Enter latitude"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                            type="number"
                            step="any"
                            value={newClientData.latitude}
                            onChange={(e) => handleNewClientInputChange("latitude", e.target.value)}
                            disabled={isCreating}
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100" style={{ width: "120px" }}>
                          <input
                            placeholder="Enter longitude"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                            type="number"
                            step="any"
                            value={newClientData.longitude}
                            onChange={(e) => handleNewClientInputChange("longitude", e.target.value)}
                            disabled={isCreating}
                          />
                        </td>
                      </tr>
                    )}

                    {filteredAndSortedData.map((record, index) => {
                      const isEditing = editingClientId === getNestedValue(record, "client.id");

                      return (
                        <tr
                          key={`client-row-${index}`}
                          className={`hover:bg-blue-50 bg-white ${isEditing ? 'bg-blue-50' : ''}`}
                        >
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "120px" }}>
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSaveEdit(record)}
                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded"
                                    title="Save changes"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded"
                                    title="Cancel editing"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEditClient(record)}
                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded"
                                    title="Edit client"
                                  >
                                    <FaRegEdit className="w-4 h-4" color="blue" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClient(
                                      getNestedValue(record, "client.id"),
                                      [getNestedValue(record, "client.name"), getNestedValue(record, "client.lastName")].filter(Boolean).join(' ')
                                    )}
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded"
                                    title="Delete client"
                                  >
                                    <FaRegTrashAlt className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "200px" }}>
                            {isEditing ? (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={editClientForm.name}
                                  onChange={(e) => setEditClientForm(prev => ({ ...prev, name: e.target.value }))}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                  placeholder="First name"
                                />
                                <input
                                  type="text"
                                  value={editClientForm.lastName}
                                  onChange={(e) => setEditClientForm(prev => ({ ...prev, lastName: e.target.value }))}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                  placeholder="Last name"
                                />
                              </div>
                            ) : (
                              [
                                getNestedValue(record, "client.name"),
                                getNestedValue(record, "client.lastName")
                              ].filter(Boolean).join(' ') || "-"
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "200px" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editClientForm.industry}
                                onChange={(e) => setEditClientForm(prev => ({ ...prev, industry: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="Industry"
                              />
                            ) : (
                              getNestedValue(record, "industry") || "-"
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "200px" }}>
                            {isEditing ? (
                              <input
                                type="number"
                                value={editClientForm.contractHour}
                                onChange={(e) => setEditClientForm(prev => ({ ...prev, contractHour: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="Contract hours"
                              />
                            ) : (
                              getNestedValue(record, "contractHour") || "-"
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "250px" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editClientForm.address}
                                onChange={(e) => setEditClientForm(prev => ({ ...prev, address: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="Address"
                              />
                            ) : (
                              getNestedValue(record, "address") || "-"
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "150px" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editClientForm.city}
                                onChange={(e) => setEditClientForm(prev => ({ ...prev, city: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="City"
                              />
                            ) : (
                              getNestedValue(record, "city") || "-"
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "100px" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editClientForm.state}
                                onChange={(e) => setEditClientForm(prev => ({ ...prev, state: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="State"
                              />
                            ) : (
                              getNestedValue(record, "state") || "-"
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "120px" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editClientForm.pincode}
                                onChange={(e) => setEditClientForm(prev => ({ ...prev, pincode: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="Zip code"
                              />
                            ) : (
                              getNestedValue(record, "pincode") || "-"
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "120px" }}>
                            {isEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={editClientForm.latitude}
                                onChange={(e) => setEditClientForm(prev => ({ ...prev, latitude: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="Latitude"
                              />
                            ) : (
                              getNestedValue(record, "latitude") || "-"
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "120px" }}>
                            {isEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={editClientForm.longitude}
                                onChange={(e) => setEditClientForm(prev => ({ ...prev, longitude: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="Longitude"
                              />
                            ) : (
                              getNestedValue(record, "longitute") || "-"
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredAndSortedData.length === 0 && !showAddRow && (
                      <tr>
                        <td
                          colSpan={10}
                          className="relative p-0"
                          style={{ height: "calc(400px - 150px)" }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center bg-white">
                            <span className="text-gray-500 text-center">
                              No client addresses found.
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Client Confirmation Modal */}
      {deleteClientModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete client "{deleteClientModal.clientName}"? .
              </p>
            </div>

            <div className="flex space-x-3 justify-end">
              <button
                type="button"
                onClick={cancelDeleteClient}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteClient}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <FaRegTrashAlt className="w-4 h-4 mr-2" />
                )}
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Edit Confirmation Modal */}
      {saveEditModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you want to save the changes to this client?
              </p>
            </div>

            <div className="flex space-x-3 justify-end">
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  cancelSaveEdit();
                  setSaveEditModal({ isOpen: false, clientData: null });
                }}
                variant="secondary"

                // className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  confirmSaveEdit();
                  setSaveEditModal({ isOpen: false, clientData: null });
                }}
                disabled={isSaving}
                variant="primary"
                className="flex items-center"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Edit Confirmation Modal */}
      {cancelEditModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you want to cancel editing? All unsaved changes will be lost.
              </p>
            </div>

            <div className="flex space-x-3 justify-end">
              <button
                type="button"
                onClick={cancelCancelEdit}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Continue Editing
              </button>
              <button
                type="button"
                onClick={confirmCancelEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="mt-6">
        <Pagination
          currentPage={currentPage}
          lastPage={lastPage}
          onPageChange={async (page) => {
            try {
              setCurrentPage(page);
              await fetchScheduleSessions(page);
            } catch (error: any) {
              console.error("Error changing page:", error);

              let errorMessage = "Failed to load page data. Please try again.";

              if (error.message) {
                if (error.message.includes("Network Error") || error.message.includes("fetch")) {
                  errorMessage = "Network error. Please check your internet connection and try again.";
                } else if (error.response?.errors && error.response.errors.length > 0) {
                  errorMessage = error.response.errors[0].message || errorMessage;
                } else {
                  errorMessage = error.message;
                }
              }

              toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
              });
            }
          }}
          loading={loading}
        />
      </div>
    </div>
  );
}

export default ClientList;
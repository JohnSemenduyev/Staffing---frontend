import React, { useEffect, useState, useMemo } from "react";
import { ChevronDown, Plus, Check, X } from "lucide-react";
import Pagination from "../../components/Pagination";
import { useScheduleSessionContext } from "../../context/ClientList";
import { toast } from 'sonner';
import { GenericSearchForm, FieldConfig } from "../../components/GenericFormSearch";
import { Search } from "lucide-react";
import { GenericTable } from "@/components/GenericTable";

interface NewClientData {
  clientName: string;
  industry: string;
  contractHour: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: string;  // Add latitude field
  longitude: string; // Add longitude field
}

function ClientList() {
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
    latitude: "",   // Initialize latitude
    longitude: ""   // Initialize longitude
  });

  // State for search and sort
  const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({});
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

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
    // TODO:- implement Client List search (could map fields to existing searchTerms if desired)
    // console.log('Client List search:', formData);
    setSearchLoading(false);
  };

  const handleReset = () => {
    // TODO:- reset Client List search
    // console.log('Client List reset');
    setShowSearchForm(false);
  };
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "asc" | "desc";
  }>({
    key: null,
    direction: "asc",
  });

  useEffect(() => {
    fetchScheduleSessions(currentPage);
  }, [currentPage]);

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
      toast.error(`Please fill in all required fields:\n${validationErrors.join("\n")}`);
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
      toast.success("Client created successfully!");
    } catch (error: any) {
      console.error("Failed to create client:", error);
      toast.error(`Failed to create client: ${error.message || "Unknown error"}`);
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

        if (typeof aCompare === "string" && typeof bCompare === "string") {
          aCompare = aCompare.toLowerCase();
          bCompare = bCompare.toLowerCase();
        } else if (!isNaN(Number(aCompare)) && !isNaN(Number(bCompare))) {
          aCompare = Number(aCompare);
          bCompare = Number(bCompare);
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

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Client  List
          </h2>

        </div>

        {/* Add Button */}
        <button
          type="button"
          onClick={handleAddClick}
          disabled={showAddRow || isCreating}
          className="inline-flex items-center px-2 py-1 border border-blue-600 bg-transparent text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 disabled:cursor-not-allowed font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Client
        </button>
      </div>
      {/* Search Button */}
      <div className="mb-4 flex justify-end">
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
        route="Client List"
        onSearch={handleSearch}
        onReset={handleReset}
        isVisible={showSearchForm}
        loading={searchLoading || loading}
        resetKey={"Client List"}
      />
      {/* Table */}
      <div className="w-full mt-6">
        <div
          className="relative w-full rounded-2xl border border-gray-200 shadow-xl"
          style={{ height: "400px", minHeight: "400px" }}
        >
          <div className="w-full h-full overflow-auto bg-white rounded-2xl">
            <table className="w-auto min-w-full table-fixed text-sm text-gray-800 font-sans">
              <thead className="bg-[#004175] text-white text-xs font-sans sticky top-0 z-10">
                <tr>
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
                            <path d="m98 190.06 139.78 163.12a24 24 0 0 0 36.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0 31.56 24.05-18.18 39.62z"></path>
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
                      <div className="pl-1 cursor-pointer" onClick={() => handleSort("longitude")}>
                        <span className={`cursor-pointer ${sortConfig.key === "longitude" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="-mb-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
                          </svg>
                        </span>
                        <span className={`cursor-pointer ${sortConfig.key === "longitude" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="m98 190.06 139.78 163.12a24 24 0 0 0 36.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z"></path>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </th>
                </tr>

                <tr className="bg-white text-gray-700 font-sans w-full">
                  <th className="px-4 py-2 text-left" style={{ width: "200px" }}>
                    <input
                      placeholder="Search client name"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                      type="text"
                      value={searchTerms["client.name"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "client.name": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(200px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "200px" }}>
                    <input
                      placeholder="Search industry"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                      type="text"
                      value={searchTerms["industry"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "industry": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(200px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "200px" }}>
                    <input
                      placeholder="Search contract hours"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                      type="text"
                      value={searchTerms["contractHour"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "contractHour": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(200px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "250px" }}>
                    <input
                      placeholder="Search street address"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                      type="text"
                      value={searchTerms["address"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "address": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(250px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "150px" }}>
                    <input
                      placeholder="Search city"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                      type="text"
                      value={searchTerms["city"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "city": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(150px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "100px" }}>
                    <input
                      placeholder="Search state"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                      type="text"
                      value={searchTerms["state"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "state": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(100px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "250px" }}>
                    <input
                      placeholder="Search zip code"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                      type="text"
                      value={searchTerms["pincode"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "pincode": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(120px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "120px" }}>
                    <input
                      placeholder="Search latitude"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                      type="text"
                      value={searchTerms["latitude"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "latitude": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(120px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "120px" }}>
                    <input
                      placeholder="Search longitude"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                      colSpan={9}
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
                        <td className="px-4 py-3 border-b border-gray-100" style={{ width: "200px" }}>
                          <input
                            placeholder="Enter client name"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                            type="text"
                            value={newClientData.clientName}
                            onChange={(e) => handleNewClientInputChange("clientName", e.target.value)}
                            disabled={isCreating}
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100" style={{ width: "200px" }}>
                          <input
                            placeholder="Enter industry"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                            type="text"
                            value={newClientData.industry}
                            onChange={(e) => handleNewClientInputChange("industry", e.target.value)}
                            disabled={isCreating}
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100" style={{ width: "200px" }}>
                          <input
                            placeholder="Enter contract hours"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                            type="number"
                            value={newClientData.contractHour}
                            onChange={(e) => handleNewClientInputChange("contractHour", e.target.value)}
                            disabled={isCreating}
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100" style={{ width: "250px" }}>
                          <input
                            placeholder="Enter street address"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                            type="text"
                            value={newClientData.address}
                            onChange={(e) => handleNewClientInputChange("address", e.target.value)}
                            disabled={isCreating}
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100" style={{ width: "150px" }}>
                          <input
                            placeholder="Enter city"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                            type="text"
                            value={newClientData.city}
                            onChange={(e) => handleNewClientInputChange("city", e.target.value)}
                            disabled={isCreating}
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100" style={{ width: "100px" }}>
                          <input
                            placeholder="Enter state"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                            type="text"
                            value={newClientData.state}
                            onChange={(e) => handleNewClientInputChange("state", e.target.value)}
                            disabled={isCreating}
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100" style={{ width: "120px" }}>
                          <input
                            placeholder="Enter zip"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                            type="text"
                            value={newClientData.pincode}
                            onChange={(e) => handleNewClientInputChange("pincode", e.target.value)}
                            disabled={isCreating}
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100" style={{ width: "120px" }}>
                          <input
                            placeholder="Enter latitude"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                            type="number"
                            step="any"
                            value={newClientData.latitude}
                            onChange={(e) => handleNewClientInputChange("latitude", e.target.value)}
                            disabled={isCreating}
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 relative" style={{ width: "120px" }}>
                          <div className="flex items-center gap-2">
                            <input
                              placeholder="Enter longitude"
                              className="w-fit px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                              type="number"
                              step="any"
                              value={newClientData.longitude}
                              onChange={(e) => handleNewClientInputChange("longitude", e.target.value)}
                              style={{ minWidth: "60px" }}
                              disabled={isCreating}
                            />
                            <div className="flex items-center gap-1 ml-2">
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
                          </div>
                        </td>
                      </tr>
                    )}

                    {filteredAndSortedData.map((record, index) => (
                      <tr
                        key={`client-row-${index}`}
                        className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                          }`}
                      >
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "200px" }}>
                          {[
                            getNestedValue(record, "client.name"),
                            getNestedValue(record, "client.lastName")
                          ].filter(Boolean).join(' ') || "-"}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "200px" }}>
                          {getNestedValue(record, "industry") || "-"}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "200px" }}>
                          {getNestedValue(record, "contractHour") || "-"}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "250px" }}>
                          {getNestedValue(record, "address") || "-"}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "150px" }}>
                          {getNestedValue(record, "city") || "-"}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "100px" }}>
                          {getNestedValue(record, "state") || "-"}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "120px" }}>
                          {getNestedValue(record, "pincode") || "-"}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "120px" }}>
                          {"-"}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "120px" }}>
                          {"-"}
                        </td>
                      </tr>
                    ))}

                    {filteredAndSortedData.length === 0 && !showAddRow && (
                      <tr>
                        <td
                          colSpan={9}
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


      {/* Pagination */}
      {lastPage > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            lastPage={lastPage}
            onPageChange={(page) => {
              setCurrentPage(page);
              fetchScheduleSessions(page);
            }}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}

export default ClientList;
import React, { useEffect, useState, useMemo, useRef } from "react";
import { FaFilePdf, FaFileExport, FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { Check, X } from "lucide-react";
import Pagination from "../../components/Pagination";
import { useAddresses } from "../../context/AddressContext";
import { useToast } from '../../hooks/use-toast';
import { graphQLClient } from "../../GraphqlClient";
import { UPDATE_USER_PROFILE, DELETE_USER } from "../../graphql/mutation";
import { Button } from "../../components/ui/button";
import { downloadClientsPdf } from "../../PDF/guard";
import { exportClientAddressToExcel } from "../../utils/clientAddressExcel";

export const Client = () => {
  const { toast } = useToast();
  const {
    addresses,
    loading,
    error,
    currentPage,
    lastPage,
    fetchClientAddresses,
    setCurrentPage,
    // refreshClientAddresses
  } = useAddresses();

  // State for search and sort
  const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({});
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
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    state: "",
    pincode: ""
  });

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
        await fetchClientAddresses(currentPage);
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

    calculateTableHeight();
    const handleResize = () => calculateTableHeight();
    window.addEventListener('resize', handleResize);
    
    const resizeObserver = new ResizeObserver(() => calculateTableHeight());
    if (formRef.current) {
      resizeObserver.observe(formRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

    const handleExportToPDF = async (data: any) =>{
   await downloadClientsPdf(data, {
  title: "Clients",
  fileName: "clients.pdf",
});

  }

  const handleExportToExcel = async (data: any) => {
    try {
      console.log('Exporting Excel - Data received:', data);
      console.log('Data type:', Array.isArray(data) ? 'Array' : typeof data);
      console.log('Data length/keys:', Array.isArray(data) ? data.length : Object.keys(data || {}));
      
      const result = await exportClientAddressToExcel(data, 'clients');
      if (result.success) {
        toast({
          title: "Success",
          description: `Excel file exported successfully: ${result.filename}`,
          variant: "default"
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to export Excel file",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to export Excel file",
        variant: "destructive"
      });
    }
  };

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

  // Handle delete client
  const handleDeleteClient = (clientId: number, clientName: string) => {
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
        DELETE_USER,
        { deleteUserId: deleteClientModal.clientId },
        { Authorization: `Bearer ${token}` }
      );

      toast({
        title: "Success",
        description: `Client "${deleteClientModal.clientName}" deleted successfully!`,
      });

      await fetchClientAddresses(currentPage);
    } catch (error: any) {
      console.error("Error deleting client:", error);
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

  // Handle edit client
  const handleEditClient = (clientData: any) => {
    setEditingClientId(clientData.client?.id);
    setEditClientForm({
      name: clientData.client?.name || "",
      lastName: clientData.client?.lastName || "",
      email: clientData.client?.email || "",
      phone: clientData.client?.phone || "",
      company: clientData.client?.company || "",
      address: clientData.address || "",
      city: clientData.city || "",
      state: clientData.state || "",
      pincode: clientData.pincode || ""
    });
  };

  const handleSaveEdit = (clientData: any) => {
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

      await graphQLClient.request(
        UPDATE_USER_PROFILE,
        {
          updateUserProfileId: editingClientId,
          name: editClientForm.name,
          lastName: editClientForm.lastName,
          phone: editClientForm.phone,
          address: editClientForm.address,
          city: editClientForm.city,
          state: editClientForm.state,
          zipcode: editClientForm.pincode
        },
        { Authorization: `Bearer ${token}` }
      );

      toast({
        title: "Success",
        description: "Client updated successfully!",
      });

      setEditingClientId(null);
      setEditClientForm({
        name: "",
        lastName: "",
        email: "",
        phone: "",
        company: "",
        address: "",
        city: "",
        state: "",
        pincode: ""
      });

      await fetchClientAddresses(currentPage);
    } catch (error: any) {
      console.error("Error updating client:", error);
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
    setCancelEditModal({ isOpen: true });
  };

  const confirmCancelEdit = () => {
    setEditingClientId(null);
    setEditClientForm({
      name: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      city: "",
      state: "",
      pincode: ""
    });
    setCancelEditModal({ isOpen: false });
  };

  const cancelCancelEdit = () => {
    setCancelEditModal({ isOpen: false });
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = (addresses || []).filter((record) => {
      if (searchTerms["client.name"]) {
        const clientName = getNestedValue(record, "client.name");
        if (!clientName || !String(clientName).toLowerCase().includes(searchTerms["client.name"].toLowerCase())) {
          return false;
        }
      }

      if (searchTerms["client.lastName"]) {
        const lastName = getNestedValue(record, "client.lastName");
        if (!lastName || !String(lastName).toLowerCase().includes(searchTerms["client.lastName"].toLowerCase())) {
          return false;
        }
      }

      if (searchTerms["client.email"]) {
        const email = getNestedValue(record, "client.email");
        if (!email || !String(email).toLowerCase().includes(searchTerms["client.email"].toLowerCase())) {
          return false;
        }
      }

      if (searchTerms["client.phone"]) {
        const phone = getNestedValue(record, "client.phone");
        if (!phone || !String(phone).toLowerCase().includes(searchTerms["client.phone"].toLowerCase())) {
          return false;
        }
      }

      if (searchTerms["client.company"]) {
        const company = getNestedValue(record, "client.company");
        if (!company || !String(company).toLowerCase().includes(searchTerms["client.company"].toLowerCase())) {
          return false;
        }
      }

      if (searchTerms["address"]) {
        const address = getNestedValue(record, "address");
        if (!address || !String(address).toLowerCase().includes(searchTerms["address"].toLowerCase())) {
          return false;
        }
      }

      if (searchTerms["city"]) {
        const city = getNestedValue(record, "city");
        if (!city || !String(city).toLowerCase().includes(searchTerms["city"].toLowerCase())) {
          return false;
        }
      }

      if (searchTerms["state"]) {
        const state = getNestedValue(record, "state");
        if (!state || !String(state).toLowerCase().includes(searchTerms["state"].toLowerCase())) {
          return false;
        }
      }

      if (searchTerms["pincode"]) {
        const pincode = getNestedValue(record, "pincode");
        if (!pincode || !String(pincode).toLowerCase().includes(searchTerms["pincode"].toLowerCase())) {
          return false;
        }
      }

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
  }, [addresses, searchTerms, sortConfig]);

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
          <h2 className="text-lg font-semibold text-gray-800">Client List</h2>
        </div>
      </div>

      <div className="w-full mt-3">
        <div
          className="relative w-full rounded-2xl border border-gray-200 shadow-xl bg-white"
          style={{ height: tableHeight, minHeight: "400px" }}
        >
          <div className="w-full h-full overflow-auto bg-white rounded-t-2xl custom-scrollbar">
            <table className="w-auto min-w-full table-fixed text-sm text-gray-800 font-sans">
              <thead className="bg-[#004175] text-white text-xs font-sans sticky top-0 z-10">
                <tr className="h-[41px]" style={{ lineHeight: '16px' }}>
                  <th className="px-4 py-1 text-left border-b border-gray-300 whitespace-nowrap" style={{ width: "120px" }}>
                    Actions
                  </th>
                  <th className="px-4 py-1 text-left border-b border-gray-300 whitespace-nowrap" style={{ width: "200px" }}>
                    <div className="flex items-center">
                      First Name
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
                      Last Name
                      <div className="pl-1 cursor-pointer" onClick={() => handleSort("client.lastName")}>
                        <span className={`cursor-pointer ${sortConfig.key === "client.lastName" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="-mb-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
                          </svg>
                        </span>
                        <span className={`cursor-pointer ${sortConfig.key === "client.lastName" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="m98 190.06 139.78 163.12a24 24 0 0 0 36.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z"></path>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-1 text-left border-b border-gray-300 whitespace-nowrap" style={{ width: "200px" }}>
                    <div className="flex items-center">
                      Email
                      <div className="pl-1 cursor-pointer" onClick={() => handleSort("client.email")}>
                        <span className={`cursor-pointer ${sortConfig.key === "client.email" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="-mb-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
                          </svg>
                        </span>
                        <span className={`cursor-pointer ${sortConfig.key === "client.email" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="m98 190.06 139.78 163.12a24 24 0 0 0 36.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z"></path>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-1 text-left border-b border-gray-300 whitespace-nowrap" style={{ width: "200px" }}>
                    <div className="flex items-center">
                      Phone
                      <div className="pl-1 cursor-pointer" onClick={() => handleSort("client.phone")}>
                        <span className={`cursor-pointer ${sortConfig.key === "client.phone" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="-mb-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
                          </svg>
                        </span>
                        <span className={`cursor-pointer ${sortConfig.key === "client.phone" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="m98 190.06 139.78 163.12a24 24 0 0 0 36.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z"></path>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-1 text-left border-b border-gray-300 whitespace-nowrap" style={{ width: "200px" }}>
                    <div className="flex items-center">
                      Company
                      <div className="pl-1 cursor-pointer" onClick={() => handleSort("client.company")}>
                        <span className={`cursor-pointer ${sortConfig.key === "client.company" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="-mb-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
                          </svg>
                        </span>
                        <span className={`cursor-pointer ${sortConfig.key === "client.company" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}>
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
                </tr>

                <tr className="bg-white text-gray-700 font-sans w-full">
                  <th className="px-4 py-2 text-left" style={{ width: "120px" }}>
                    {/* Actions column - no search input */}
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "200px" }}>
                    <input
                      placeholder="Search first name"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                      type="text"
                      value={searchTerms["client.name"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "client.name": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(200px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "200px" }}>
                    <input
                      placeholder="Search last name"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                      type="text"
                      value={searchTerms["client.lastName"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "client.lastName": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(200px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "200px" }}>
                    <input
                      placeholder="Search email"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                      type="text"
                      value={searchTerms["client.email"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "client.email": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(200px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "200px" }}>
                    <input
                      placeholder="Search phone"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                      type="text"
                      value={searchTerms["client.phone"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "client.phone": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(200px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "200px" }}>
                    <input
                      placeholder="Search company"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                      type="text"
                      value={searchTerms["client.company"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "client.company": e.target.value }))}
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
                  <th className="px-4 py-2 text-left" style={{ width: "120px" }}>
                    <input
                      placeholder="Search zip code"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                      type="text"
                      value={searchTerms["pincode"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "pincode": e.target.value }))}
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
                    {filteredAndSortedData.map((record, index) => {
                      const isEditing = editingClientId === getNestedValue(record, "client.id");

                      return (
                        <tr
                          key={`client-${getNestedValue(record, "client.id") ?? 'unknown'}-address-${record.id ?? index}`}
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
                              <input
                                type="text"
                                value={editClientForm.name}
                                onChange={(e) => setEditClientForm(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="First name"
                              />
                            ) : (
                              getNestedValue(record, "client.name") || "-"
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "200px" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editClientForm.lastName}
                                onChange={(e) => setEditClientForm(prev => ({ ...prev, lastName: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="Last name"
                              />
                            ) : (
                              getNestedValue(record, "client.lastName") || "-"
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "200px" }}>
                            {isEditing ? (
                              <input
                                type="email"
                                value={editClientForm.email}
                                onChange={(e) => setEditClientForm(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="Email"
                              />
                            ) : (
                              <div className="truncate" title={getNestedValue(record, "client.email") || "-"}>
                                {getNestedValue(record, "client.email") || "-"}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "200px" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editClientForm.phone}
                                onChange={(e) => setEditClientForm(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="Phone"
                              />
                            ) : (
                              getNestedValue(record, "client.phone") || "-"
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "200px" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editClientForm.company}
                                onChange={(e) => setEditClientForm(prev => ({ ...prev, company: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="Company"
                              />
                            ) : (
                              getNestedValue(record, "client.company") || "-"
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
                        </tr>
                      );
                    })}

                    {filteredAndSortedData.length === 0 && (
                      <tr>
                        <td
                          colSpan={10}
                          className="relative p-0"
                          style={{ height: "calc(400px - 150px)" }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center bg-white">
                            <span className="text-gray-500 text-center">
                              No client records found.
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
                Are you sure you want to delete client "{deleteClientModal.clientName}"?
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
                }}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  confirmSaveEdit();
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
   <div className="mt-6 flex items-center justify-between">
        <Pagination
          currentPage={currentPage}
          lastPage={lastPage}
          onPageChange={async (page) => {
            try {
              setCurrentPage(page);
              await fetchClientAddresses(page);
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

        {addresses && addresses.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportToPDF(addresses)}
              className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              title="Export to PDF"
            >
              <FaFilePdf className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleExportToExcel(addresses)}
              className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              title="Export to Excel"
            >
              <FaFileExport className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
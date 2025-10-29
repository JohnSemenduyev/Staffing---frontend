import React, { useEffect, useState, useMemo, useRef } from "react";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { Check, X } from "lucide-react";
import Pagination from "../../components/Pagination";
import { useUsers } from "../../context/UserContext";
import { useToast } from '../../hooks/use-toast';
import { graphQLClient } from "../../GraphqlClient";
import { UPDATE_USER_PROFILE, DELETE_USER } from "../../graphql/mutation";
import { Button } from "../../components/ui/button";
import { FaFilePdf } from "react-icons/fa";
import { downloadListPdf } from "../../PDF/admin";


export const Guard = () => {
  const { toast } = useToast();
  const {
    users,
    loading,
    error,
    currentPage,
    lastPage,
    fetchUsersByRole,
    setCurrentPage,
    // refreshUsers
  } = useUsers();

  // State for search and sort
  const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({});
  const [tableHeight, setTableHeight] = useState<string>("400px");
  const formRef = useRef<HTMLDivElement>(null);

  // Guard edit/delete modals
  const [deleteGuardModal, setDeleteGuardModal] = useState({ isOpen: false, userId: null, userName: "" });
  const [saveEditModal, setSaveEditModal] = useState({ isOpen: false, userData: null });
  const [cancelEditModal, setCancelEditModal] = useState({ isOpen: false });

  // Loading states
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Guard editing state
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editGuardForm, setEditGuardForm] = useState({
    name: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipcode: ""
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
        await fetchUsersByRole("guard", currentPage);
      } catch (error: any) {
        console.error("Error loading guard data:", error);
        let errorMessage = "Failed to load guard data. Please try again.";

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

  const handleExportToPDF = async (data: any) =>{
   await downloadListPdf(data, {
  title: "Guards",
  fileName: "guards.pdf",
});

  }

  // Handle delete guard
  const handleDeleteGuard = (userId: number, userName: string) => {
    setDeleteGuardModal({ isOpen: true, userId, userName });
  };

  const confirmDeleteGuard = async () => {
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
        { deleteUserId: deleteGuardModal.userId },
        { Authorization: `Bearer ${token}` }
      );

      toast({
        title: "Success",
        description: `Guard "${deleteGuardModal.userName}" deleted successfully!`,
      });

      await fetchUsersByRole("guard", currentPage);
    } catch (error: any) {
      console.error("Error deleting guard:", error);
      let errorMessage = "Failed to delete guard. Please try again.";

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
      setDeleteGuardModal({ isOpen: false, userId: null, userName: "" });
      setIsDeleting(false);
    }
  };

  const cancelDeleteGuard = () => {
    setDeleteGuardModal({ isOpen: false, userId: null, userName: "" });
  };

  // Handle edit guard
  const handleEditGuard = (userData: any) => {
    setEditingUserId(userData.id);
    setEditGuardForm({
      name: userData.name || "",
      lastName: userData.lastName || "",
      email: userData.email || "",
      phone: userData.phone || "",
      address: userData.address || "",
      city: userData.city || "",
      state: userData.state || "",
      zipcode: userData.zipcode || ""
    });
  };

  const handleSaveEdit = (userData: any) => {
    setSaveEditModal({ isOpen: true, userData });
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
          updateUserProfileId: editingUserId,
          name: editGuardForm.name,
          lastName: editGuardForm.lastName,
          phone: editGuardForm.phone,
          address: editGuardForm.address,
          city: editGuardForm.city,
          state: editGuardForm.state,
          zipcode: editGuardForm.zipcode
        },
        { Authorization: `Bearer ${token}` }
      );

      toast({
        title: "Success",
        description: "Guard updated successfully!",
      });

      setEditingUserId(null);
      setEditGuardForm({
        name: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zipcode: ""
      });

      await fetchUsersByRole("guard", currentPage);
    } catch (error: any) {
      console.error("Error updating guard:", error);
      let errorMessage = "Failed to update guard. Please try again.";

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
      setSaveEditModal({ isOpen: false, userData: null });
      setIsSaving(false);
    }
  };

  const cancelSaveEdit = () => {
    setSaveEditModal({ isOpen: false, userData: null });
  };

  const handleCancelEdit = () => {
    setCancelEditModal({ isOpen: true });
  };

  const confirmCancelEdit = () => {
    setEditingUserId(null);
    setEditGuardForm({
      name: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipcode: ""
    });
    setCancelEditModal({ isOpen: false });
  };

  const cancelCancelEdit = () => {
    setCancelEditModal({ isOpen: false });
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = (users || []).filter((record) => {
      if (searchTerms["name"]) {
        const name = getNestedValue(record, "name");
        if (!name || !String(name).toLowerCase().includes(searchTerms["name"].toLowerCase())) {
          return false;
        }
      }

      if (searchTerms["lastName"]) {
        const lastName = getNestedValue(record, "lastName");
        if (!lastName || !String(lastName).toLowerCase().includes(searchTerms["lastName"].toLowerCase())) {
          return false;
        }
      }

      if (searchTerms["email"]) {
        const email = getNestedValue(record, "email");
        if (!email || !String(email).toLowerCase().includes(searchTerms["email"].toLowerCase())) {
          return false;
        }
      }

      if (searchTerms["phone"]) {
        const phone = getNestedValue(record, "phone");
        if (!phone || !String(phone).toLowerCase().includes(searchTerms["phone"].toLowerCase())) {
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

      if (searchTerms["zipcode"]) {
        const zipcode = getNestedValue(record, "zipcode");
        if (!zipcode || !String(zipcode).toLowerCase().includes(searchTerms["zipcode"].toLowerCase())) {
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
  }, [users, searchTerms, sortConfig]);

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
          <h2 className="text-lg font-semibold text-gray-800">Guard List</h2>
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
                      <div className="pl-1 cursor-pointer" onClick={() => handleSort("name")}>
                        <span className={`cursor-pointer ${sortConfig.key === "name" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="-mb-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
                          </svg>
                        </span>
                        <span className={`cursor-pointer ${sortConfig.key === "name" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}>
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
                      <div className="pl-1 cursor-pointer" onClick={() => handleSort("lastName")}>
                        <span className={`cursor-pointer ${sortConfig.key === "lastName" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="-mb-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
                          </svg>
                        </span>
                        <span className={`cursor-pointer ${sortConfig.key === "lastName" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}>
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
                      <div className="pl-1 cursor-pointer" onClick={() => handleSort("email")}>
                        <span className={`cursor-pointer ${sortConfig.key === "email" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="-mb-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
                          </svg>
                        </span>
                        <span className={`cursor-pointer ${sortConfig.key === "email" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}>
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
                      <div className="pl-1 cursor-pointer" onClick={() => handleSort("phone")}>
                        <span className={`cursor-pointer ${sortConfig.key === "phone" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="-mb-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
                          </svg>
                        </span>
                        <span className={`cursor-pointer ${sortConfig.key === "phone" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}>
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
                      Zipcode
                      <div className="pl-1 cursor-pointer" onClick={() => handleSort("zipcode")}>
                        <span className={`cursor-pointer ${sortConfig.key === "zipcode" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="-mb-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="M414 321.94 274.22 158.82a24 24 0 0 0-36.44 0L98 321.94c-13.34 15.57-2.28 39.62 18.22 39.62h279.6c20.5 0 31.56-24.05 18.18-39.62z"></path>
                          </svg>
                        </span>
                        <span className={`cursor-pointer ${sortConfig.key === "zipcode" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}>
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
                      value={searchTerms["name"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "name": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(200px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "200px" }}>
                    <input
                      placeholder="Search last name"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                      type="text"
                      value={searchTerms["lastName"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "lastName": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(200px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "200px" }}>
                    <input
                      placeholder="Search email"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                      type="text"
                      value={searchTerms["email"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "email": e.target.value }))}
                      style={{ maxWidth: '100%', minWidth: 'calc(200px - 32px)' }}
                    />
                  </th>
                  <th className="px-4 py-2 text-left" style={{ width: "200px" }}>
                    <input
                      placeholder="Search phone"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                      type="text"
                      value={searchTerms["phone"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "phone": e.target.value }))}
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
                      placeholder="Search zipcode"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                      type="text"
                      value={searchTerms["zipcode"] || ''}
                      onChange={(e) => setSearchTerms(prev => ({ ...prev, "zipcode": e.target.value }))}
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
                    {filteredAndSortedData.map((record, index) => {
                      const isEditing = editingUserId === record.id;

                      return (
                        <tr
                          key={`guard-${record.id ?? index}`}
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
                                    onClick={() => handleEditGuard(record)}
                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded"
                                    title="Edit guard"
                                  >
                                    <FaRegEdit className="w-4 h-4" color="blue" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteGuard(
                                      record.id,
                                      [record.name, record.lastName].filter(Boolean).join(' ')
                                    )}
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded"
                                    title="Delete guard"
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
                                value={editGuardForm.name}
                                onChange={(e) => setEditGuardForm(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="First name"
                              />
                            ) : (
                              record.name || "-"
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "200px" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editGuardForm.lastName}
                                onChange={(e) => setEditGuardForm(prev => ({ ...prev, lastName: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="Last name"
                              />
                            ) : (
                              record.lastName || "-"
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "200px" }}>
                            {isEditing ? (
                              <input
                                type="email"
                                value={editGuardForm.email}
                                onChange={(e) => setEditGuardForm(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="Email"
                              />
                            ) : (
                              <div className="truncate" title={record.email || "-"}>
                                {record.email || "-"}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "200px" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editGuardForm.phone}
                                onChange={(e) => setEditGuardForm(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="Phone"
                              />
                            ) : (
                              record.phone || "-"
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "250px" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editGuardForm.address}
                                onChange={(e) => setEditGuardForm(prev => ({ ...prev, address: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="Address"
                              />
                            ) : (
                              record.address || "-"
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "150px" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editGuardForm.city}
                                onChange={(e) => setEditGuardForm(prev => ({ ...prev, city: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="City"
                              />
                            ) : (
                              record.city || "-"
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "100px" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editGuardForm.state}
                                onChange={(e) => setEditGuardForm(prev => ({ ...prev, state: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="State"
                              />
                            ) : (
                              record.state || "-"
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" style={{ width: "120px" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editGuardForm.zipcode}
                                onChange={(e) => setEditGuardForm(prev => ({ ...prev, zipcode: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                placeholder="Zipcode"
                              />
                            ) : (
                              record.zipcode || "-"
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredAndSortedData.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="relative p-0"
                          style={{ height: "calc(400px - 150px)" }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center bg-white">
                            <span className="text-gray-500 text-center">
                              No guard records found.
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

      {/* Delete Guard Confirmation Modal */}
      {deleteGuardModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete guard "{deleteGuardModal.userName}"?
              </p>
            </div>

            <div className="flex space-x-3 justify-end">
              <button
                type="button"
                onClick={cancelDeleteGuard}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteGuard}
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
                Are you sure you want to save the changes to this guard?
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
  {/* Left side — pagination info + controls */}
  <Pagination
    currentPage={currentPage}
    lastPage={lastPage}
    onPageChange={async (page) => {
      try {
        setCurrentPage(page);
        await fetchUsersByRole("guard", page);
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

  {/* Right side — PDF export icon */}
  <button
    onClick={() => handleExportToPDF(users)}
    className="ml-4 inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
    title="Export to PDF"
  >
    <FaFilePdf className="w-5 h-5" />
  </button>
</div>

    </div>
  );
};
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Check, X } from "lucide-react";
import { FaRegEdit, FaRegTrashAlt, FaFilePdf, FaFileExport } from "react-icons/fa";
import Pagination from "../../components/Pagination";
import { useUsers } from "../../context/UserContext";
import { useToast } from "../../hooks/use-toast";
import { graphQLClient } from "../../GraphqlClient";
import { UPDATE_USER_PROFILE, DELETE_USER } from "../../graphql/mutation";
import { GET_CLIENT_USERS } from "../../graphql/queries";
import { useDebounce } from "../../hooks/useDebounce";
import ResetButton from "../../components/ui/ResetButton";
import { downloadListPdf } from "../../PDF/admin";
import { exportUserListToExcel } from "../../utils/adminExcel";
import type { User } from "../../context/UserContext";

export const Client = () => {
  const { users, loading, error, currentPage, lastPage, fetchUsersByRole, setCurrentPage, currentFilter } = useUsers();
  const { toast } = useToast();

  const [tableHeight, setTableHeight] = useState<string>("400px");
  const formRef = useRef<HTMLDivElement>(null);

  const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({});
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: "asc" | "desc" }>({
    key: null,
    direction: "asc",
  });

  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    state: "",
    zipcode: "",
  });

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; userId: number | null; userName: string }>({
    isOpen: false,
    userId: null,
    userName: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const debouncedSearchTerms = useDebounce(searchTerms, 300);
  const hasSearchFilters = useMemo(
    () => Object.values(searchTerms).some((v) => v && String(v).trim() !== ""),
    [searchTerms]
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const filter = {
          company: debouncedSearchTerms.company || undefined,
          name: debouncedSearchTerms.name || undefined,
          lastName: debouncedSearchTerms.lastName || undefined,
          email: debouncedSearchTerms.email || undefined,
          phone: debouncedSearchTerms.phone || undefined,
          address: debouncedSearchTerms.address || undefined,
          city: debouncedSearchTerms.city || undefined,
          state: debouncedSearchTerms.state || undefined,
          zipcode: debouncedSearchTerms.zipcode || undefined,
        };

        await fetchUsersByRole("client", currentPage, filter);
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
  }, [currentPage, debouncedSearchTerms]);

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
    window.addEventListener("resize", handleResize);
    const resizeObserver = new ResizeObserver(() => calculateTableHeight());
    if (formRef.current) {
      resizeObserver.observe(formRef.current);
    }
    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  const getNestedValue = (obj: any, path: string) => {
    return path.split(".").reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleSearchChange = (field: string, value: string) => {
    setSearchTerms((prev) => ({
      ...prev,
      [field]: value,
    }));
    setCurrentPage(1);
  };

  const handleResetSearch = () => {
    setSearchTerms({});
    setCurrentPage(1);
  };

  const sortedData = useMemo(() => {
    const data = [...(users || [])];

    if (sortConfig.key) {
      data.sort((a, b) => {
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
        if (aCompare < bCompare) return sortConfig.direction === "asc" ? -1 : 1;
        if (aCompare > bCompare) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [users, sortConfig]);

  const handleEdit = (user: any) => {
    setEditingUserId(user.id);
    setEditForm({
      name: user.name || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phone: user.phone || "",
      company: user.company || "",
      address: user.address || "",
      city: user.city || "",
      state: user.state || "",
      zipcode: user.zipcode || "",
    });
  };

  const handleSave = async () => {
    if (!editingUserId) return;

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
          name: editForm.name,
          lastName: editForm.lastName,
          phone: editForm.phone,
          address: editForm.address,
          city: editForm.city,
          state: editForm.state,
          zipcode: editForm.zipcode,
        },
        { Authorization: `Bearer ${token}` }
      );

      toast({ title: "Success", description: "Client updated successfully!" });
      setEditingUserId(null);
      await fetchUsersByRole("client", currentPage);
    } catch (error: any) {
      console.error("Error updating client:", error);
      const errorMessage =
        error?.response?.errors?.[0]?.message || error?.message || "Failed to update client. Please try again.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    }
  };

  const handleCancel = () => {
    setEditingUserId(null);
  };

  const handleDelete = (userId: number, userName: string) => {
    setDeleteModal({ isOpen: true, userId, userName });
  };

  const confirmDelete = async () => {
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
        { deleteUserId: deleteModal.userId },
        { Authorization: `Bearer ${token}` }
      );

      toast({ title: "Success", description: `Client "${deleteModal.userName}" deleted successfully!` });
      await fetchUsersByRole("client", currentPage);
    } catch (error: any) {
      console.error("Error deleting client:", error);
      const errorMessage =
        error?.response?.errors?.[0]?.message || error?.message || "Failed to delete client. Please try again.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setDeleteModal({ isOpen: false, userId: null, userName: "" });
      setIsDeleting(false);
    }
  };

  // Fetch all clients for export (separate from UI state)
  const fetchAllClientsForExport = useCallback(async (): Promise<User[]> => {
    try {
      const token = sessionStorage.getItem("token");
      const effectiveFilter = currentFilter || undefined;
      const variables: any = { limit: 20, page: 1, export: true };
      
      if (effectiveFilter) {
        Object.entries(effectiveFilter).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            variables[key] = value;
          }
        });
      }
      
      const response = await graphQLClient.request<{ clientUsers: { data: User[]; lastPage: number } }>(
        GET_CLIENT_USERS,
        variables,
        { Authorization: `Bearer ${token}` }
      );
      
      return response.clientUsers.data;
    } catch (error) {
      console.error("Error fetching clients for export:", error);
      throw error;
    }
  }, [currentFilter]);

  const handleExportToPDF = async () => {
    try {
      const allClients = await fetchAllClientsForExport();
      if (!allClients || allClients.length === 0) {
        toast({ title: "Error", description: "No data to export", variant: "destructive" });
        return;
      }
      await downloadListPdf(allClients, {
        title: "Clients",
        fileName: "clients.pdf",
      });
      toast({ title: "Success", description: "PDF exported successfully", variant: "default" });
    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      toast({ title: "Error", description: "Failed to export PDF", variant: "destructive" });
    }
  };

  const handleExportToExcel = async () => {
    try {
      const allClients = await fetchAllClientsForExport();
      if (!allClients || allClients.length === 0) {
        toast({ title: "Error", description: "No data to export", variant: "destructive" });
        return;
      }
      const result = await exportUserListToExcel(allClients, 'clients', false);
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

  const cancelDelete = () => setDeleteModal({ isOpen: false, userId: null, userName: "" });

  if (error) {
    return (
      <div className="min-h-screen p-6 font-sans">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden p-6">
      <div ref={formRef} className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Client List</h2>
      </div>

      <div className="w-full mt-3">
        <div
          className="relative w-full rounded-2xl border border-gray-200 shadow-xl bg-white"
          style={{ height: tableHeight, minHeight: "400px" }}
        >
          <div className="w-full h-full overflow-auto bg-white rounded-t-2xl custom-scrollbar">
            <table className="w-auto min-w-full table-fixed text-sm text-gray-800 font-sans">
              <thead className="bg-[#004175] text-white text-xs font-sans sticky top-0 z-10">
                <tr className="h-[41px]" style={{ lineHeight: "16px" }}>
                  <th
                    className="px-4 py-1 text-left border-b border-gray-300 whitespace-nowrap"
                    style={{ width: "120px" }}
                  >
                    Actions
                  </th>
                  {[
                    { key: "name", label: "First Name", width: "180px" },
                    { key: "lastName", label: "Last Name", width: "180px" },
                    { key: "email", label: "Email", width: "220px" },
                    { key: "phone", label: "Phone", width: "160px" },
                    { key: "company", label: "Company", width: "200px" },
                    { key: "address", label: "Street Address", width: "260px" },
                    { key: "city", label: "City", width: "160px" },
                    { key: "state", label: "State", width: "140px" },
                    { key: "zipcode", label: "Zipcode", width: "140px" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-1 text-left border-b border-gray-300 whitespace-nowrap"
                      style={{ width: col.width }}
                    >
                      <div className="flex items-center">
                        {col.label}
                        <div className="pl-1 cursor-pointer" onClick={() => handleSort(col.key)}>
                          <span
                            className={`cursor-pointer ${
                              sortConfig.key === col.key && sortConfig.direction === "asc"
                                ? "text-white"
                                : "text-white/40"
                            }`}
                          >
                            ▲
                          </span>
                          <span
                            className={`cursor-pointer ml-0.5 ${
                              sortConfig.key === col.key && sortConfig.direction === "desc"
                                ? "text-white"
                                : "text-white/40"
                            }`}
                          >
                            ▼
                          </span>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>

                <tr className="bg-white text-gray-700 font-sans w-full">
                  <th className="px-4 py-2 text-left" style={{ width: "120px" }}>
                    {hasSearchFilters && (
                      <ResetButton
                        onClick={handleResetSearch}
                        confirmTitle="Confirm Reset"
                        confirmMessage="This will clear all search filters. Proceed?"
                      />
                    )}
                  </th>
                  {[
                    { key: "name", width: "180px", placeholder: "Search first name" },
                    { key: "lastName", width: "180px", placeholder: "Search last name" },
                    { key: "email", width: "220px", placeholder: "Search email" },
                    { key: "phone", width: "160px", placeholder: "Search phone" },
                    { key: "company", width: "200px", placeholder: "Search company" },
                    { key: "address", width: "260px", placeholder: "Search street address" },
                    { key: "city", width: "160px", placeholder: "Search city" },
                    { key: "state", width: "140px", placeholder: "Search state" },
                    { key: "zipcode", width: "140px", placeholder: "Search zipcode" },
                  ].map((col) => (
                    <th key={col.key} className="px-4 py-2 text-left" style={{ width: col.width }}>
                      <input
                        placeholder={col.placeholder}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                        type="text"
                        value={searchTerms[col.key] || ""}
                        onChange={(e) => handleSearchChange(col.key, e.target.value)}
                        style={{ maxWidth: "100%", minWidth: `calc(${col.width} - 32px)` }}
                      />
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="relative">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="relative p-0" style={{ height: "calc(400px - 150px)" }}>
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
                    {sortedData.map((record: any, index: number) => {
                      const isEditing = editingUserId === record.id;
                      return (
                        <tr
                          key={`client-${record.id ?? index}`}
                          className={`hover:bg-blue-50 bg-white ${isEditing ? "bg-blue-50" : ""}`}
                        >
                          <td
                            className="px-4 py-3 border-b border-gray-100 whitespace-nowrap"
                            style={{ width: "120px" }}
                          >
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={handleSave}
                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded"
                                    title="Save changes"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={handleCancel}
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded"
                                    title="Cancel editing"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEdit(record)}
                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded"
                                    title="Edit client"
                                  >
                                    <FaRegEdit className="w-4 h-4" color="blue" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDelete(
                                        record.id,
                                        [record.name, record.lastName].filter(Boolean).join(" ")
                                      )
                                    }
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded"
                                    title="Delete client"
                                  >
                                    <FaRegTrashAlt className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                          {[
                            { key: "name", width: "180px" },
                            { key: "lastName", width: "180px" },
                            { key: "email", width: "220px" },
                            { key: "phone", width: "160px" },
                            { key: "company", width: "200px" },
                            { key: "address", width: "260px" },
                            { key: "city", width: "160px" },
                            { key: "state", width: "140px" },
                            { key: "zipcode", width: "140px" },
                          ].map((col) => (
                            <td
                              key={col.key}
                              className="px-4 py-3 border-b border-gray-100 whitespace-nowrap"
                              style={{ width: col.width }}
                            >
                              {isEditing && col.key !== "email" && col.key !== "company" ? (
                                <input
                                  type="text"
                                  value={(editForm as any)[col.key]}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      [col.key]: e.target.value,
                                    }))
                                  }
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                                />
                              ) : col.key === "email" ? (
                                <div className="truncate" title={record[col.key] || "-"}>
                                  {record[col.key] || "-"}
                                </div>
                              ) : (
                                record[col.key] || "-"
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}

                    {sortedData.length === 0 && (
                      <tr>
                        <td colSpan={10} className="relative p-0" style={{ height: "calc(400px - 150px)" }}>
                          <div className="absolute inset-0 flex items-center justify-center bg-white">
                            <span className="text-gray-500 text-center">No client records found.</span>
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

      {/* Export buttons below table */}
      {!loading && users && users.length > 0 && (
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={handleExportToPDF}
            className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            title="Export to PDF"
          >
            <FaFilePdf className="w-5 h-5" />
          </button>
          <button
            onClick={handleExportToExcel}
            className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            title="Export to Excel"
          >
            <FaFileExport className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Pagination
          currentPage={currentPage}
          lastPage={lastPage}
          onPageChange={(page) => {
            setCurrentPage(page);
            fetchUsersByRole("client", page);
          }}
          loading={loading}
        />
      </div>

      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete client "{deleteModal.userName}"?
              </p>
            </div>

            <div className="flex space-x-3 justify-end">
              <button
                type="button"
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
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
    </div>
  );
};

export default Client;


import { useSearchClient } from "../../hooks/usesearchClient";
import { useDebounce } from "../../hooks/useDebounce";
import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Check, X, AlertTriangle, RotateCcw } from "lucide-react";
import { usePostAssignContext } from "../../context/PostAssignm";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import Pagination from "../../components/Pagination";
import SubmitButton from "../../components/ui/ButtonUi";
import { toast } from "sonner";
import { inputClasses } from "./GeoLocationSetup";
import { ErrorMessage } from "../../components/ui/error-message";

export const PostAssignment = () => {
  const [form, setForm] = useState({
    clientId: "",
    addressId: "",
    postname: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showErrors, setShowErrors] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedAddressText, setSelectedAddressText] = useState("");
  const [submitLoader, setSubmitLoader] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; record: any }>({ isOpen: false, record: null });
  const [deleteLoader, setDeleteLoader] = useState(false);

  const { data: searchedClients = [], isLoading: loadingClients } = useSearchClient(debouncedClientSearch);
  const {postAssigns,
  createPostAssign,
  currentPage,
  lastPage,
  fetchPostAssigns,
  setCurrentPage,
  loading,
  deletePostAssign,
  updatePostAssign,
  error
} = usePostAssignContext();

useEffect(() => {
  fetchPostAssigns(currentPage);
}, [currentPage]);

  const handleClientSelect = (
    client: { id: string | number; name: string; lastName:string },
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

  const getFieldClasses = (fieldName: string) => {
    const baseClasses = "w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition";
    const errorClasses = "border-red-500 focus:ring-red-500 focus:border-red-500";
    const normalClasses = "border-gray-300";
    
    return `${baseClasses} ${showErrors && errors[fieldName] ? errorClasses : normalClasses}`;
  };

  const validateForm = () => {
    const e: any = {};
    if (!form.clientId) e.clientId = "Client is required";
    if (!form.addressId) e.addressId = "Address is required";
    if (!form.postname) e.postname = "Post name is required";
    setErrors(e);
    setShowErrors(true);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setForm({ clientId: "", addressId: "", postname: "" });
    setClientSearch("");
    setSelectedAddressText("");
    setShowClientDropdown(false);
    setIsEditMode(false);
    setEditId(null);
    setErrors({});
    setShowErrors(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitLoader(true);

    try {
      const payload = {
        clientId: Number(form.clientId),
        addressId: Number(form.addressId),
        post: form.postname,
      };

      if (isEditMode && editId !== null) {
        await updatePostAssign(editId, payload);
        toast.success("Post assignment updated successfully!");
      } else {
        await createPostAssign(payload);
        toast.success("Post assignment created successfully!");
      }
    fetchPostAssigns(currentPage);
      resetForm();
    } catch (error) {
      console.error("Error submitting post assignment:", error);
      toast.error("Submission failed.");
    } finally {
      setSubmitLoader(false);
    }
  };

  const hasInput = Object.values(form).some((val) => val.trim() !== "");

  const handleEdit = (record: any) => {
  console.log("Editing record:", record);
  setIsEditMode(true);
  setEditId(record.id);
  
  // Set form data
  setForm({
    clientId: String(record.client.id),
    addressId: String(record.address.id),
    postname: record.post,
  });

  // Set client search and address text directly from the record
  setClientSearch(record.client.name || "");
  setSelectedAddressText(record.address.address || "");

  // Clear errors
  setErrors({});
  setShowErrors(false);
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });
};

  const handleDelete = (record: any) => {
    setDeleteModal({ isOpen: true, record });
  };

  const confirmDelete = async () => {
    if (!deleteModal.record) return;

    try {
      setDeleteLoader(true);
      await deletePostAssign(deleteModal.record.id);
      toast.success("Post assignment deleted successfully!");
      fetchPostAssigns(currentPage);
      setDeleteModal({ isOpen: false, record: null });
    } catch (err) {
      toast.error("Failed to delete post assignment.");
    } finally {
      setDeleteLoader(false);
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, record: null });
    setDeleteLoader(false);
  };

  const handleChange = (field: string, value: any) => {
    setForm((f) => ({
      ...f,
      [field]: value,
    }));
    setErrors({});
    setShowErrors(false);
  };

  const tableColumns: TableColumn[] = [
    {
      key: "client.name",
      label: "Client Name",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap"
    },
    {
      key: "address.address",
      label: "Client Location",
      sortable: true,
      searchable: true,
      className: "break-words max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]",
      render: (value: string) => (
        <div className="truncate" title={value}>
          {value || "-"}
        </div>
      )
    },
    {
      key: "post",
      label: "Post Name",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
      render: (value: string) => value || "-"
    }
  ];

  const tableActions: TableAction[] = [
    {
      label: "Edit",
      icon: <Edit className="w-4 h-4" />,
      onClick: (record: any) => handleEdit(record),
      className: "text-blue-500 hover:text-green-700",
      title: "Edit"
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-4 h-4" />,
      onClick: (record: any) => handleDelete(record),
      className: "text-red-500 hover:text-red-700",
      title: "Delete"
    }
  ];

  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 md:px-6 pt-10">
        <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 mb-2">
        <h2 className="text-xl font-semibold mb-2">
          {isEditMode ? "Edit Post Assignment" : "Post Assignment"}
        </h2>
        <form onSubmit={onSubmit} autoComplete="off">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            {/* Client Search */}
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
  {errors.clientId && (
    <ErrorMessage message={errors.clientId} />
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
            
            // Generate initials from first letter of name and lastName
            const initials = `${client.name.charAt(0).toUpperCase()}${client.lastName.charAt(0).toUpperCase()}`;
            
            return (
              <div
                key={`${client.id}-${address.id}`}
                onMouseDown={() =>
                  handleClientSelect(
                    { id: client.id, name: client.name, lastName: client.lastName },
                    address.id
                  )
                }
                className={`p-3 cursor-pointer flex items-center space-x-3 ${
                  isEven ? "bg-white" : "bg-gray-50"
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
                    {`${client.name} ${client.lastName}`}
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

            {/* Address (read-only) */}
            <div>
              <input
                type="text"
                value={selectedAddressText}
                placeholder="Location"
                readOnly
                className={`${getFieldClasses('addressId')} appearance-none`}
              />
              {showErrors && errors.addressId && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  <span>{errors.addressId}</span>
                </div>
              )}
            </div>

            {/* Post Name */}
            <div>
              <input
                type="text"
                value={form.postname}
                onChange={(e) => handleChange("postname", e.target.value)}
                placeholder="Enter post name"
                className={getFieldClasses('postname')}
              />
              {showErrors && errors.postname && (
                <ErrorMessage message={errors.postname} />
              )}
            </div>

            {/* Submit / Cancel */}
            <div className="flex items-center gap-2">
              <SubmitButton
                loading={submitLoader}
                disabled={submitLoader}
                icon={isEditMode ? <Check className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              >
                {isEditMode ? "Update" : "Add"}
              </SubmitButton>
               {hasInput &&<button
                  type="button"
                  onClick={resetForm}
                  disabled={submitLoader}
      className="inline-flex items-center px-4 py-1 border border-blue-600 bg-transparent text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 disabled:cursor-not-allowed font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </button>}
              
            </div>
          </div>
        </form>
      </div>

      {/* Table Section */}
        <GenericTable
          data={postAssigns || []}
          columns={tableColumns}
          actions={tableActions}
          loading={loading}
          emptyMessage="No post assignment records found."
          searchable={true}
        />

        {lastPage > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              lastPage={lastPage}
              onPageChange={(page) => {
                setCurrentPage(page);
                fetchPostAssigns(page);
              }}
               loading={loading}
            />
          </div>
        )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this post assignment?
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
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
};
import { useSearchClient } from "../../hooks/usesearchClient";
import { useDebounce } from "../../hooks/useDebounce";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { validate } from "graphql";
import { usePostAssignContext } from "../../context/PostAssignm";
import { GenericTable, TableAction, TableColumn } from "../../components/GenericTable";
import { Edit, Trash2 } from "lucide-react";

export const PostAssignment = () => {
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

     const handleEdit = (record: any) => {
  console.log("Edit record:", record);
};

const handleDelete = (record: any) => {
  console.log("Delete record:", record);
};

    const tableActions: TableAction[] = [
  {
    label: "Edit",
    icon: <Edit className="w-4 h-4" />,
    onClick: handleEdit,
    className: "text-blue-500 hover:text-green-700",
    title: "Edit"
  },
  {
    label: "Delete",
    icon: <Trash2 className="w-4 h-4" />,
    onClick: handleDelete,
    className: "text-red-500 hover:text-red-700",
    title: "Delete"
  }
];
  const [form, setForm] = useState({
    clientId: "",
    addressId: "",
    postname: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [clientSearch, setClientSearch] = useState("");
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedAddressText, setSelectedAddressText] = useState("");
  const [loadingTable, setLoadingTable] = useState(false);

  const [submitLoader, setSubmitLoader] = useState(false)
  const { data: searchedClients = [], isLoading: loadingClients } =
    useSearchClient(debouncedClientSearch);
const { createPostAssign, refreshPostAssigns } = usePostAssignContext();
  const { postAssigns, loading, error } = usePostAssignContext();

  const fieldInputClasses =
    "w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition";
  const handleClientSelect = (
    client: { id: string | number; name: string },
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
  
  const validate = () => {
    const e: any = {};
    if (!form.clientId) e.clientId = "Required";
    if (!form.addressId) e.addressId = "Required";
    if (!form.postname) e.postname = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
 const onSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!validate()) return;
  setSubmitLoader(true);

  try {
    const payload = {
      clientId: Number(form.clientId),
      addressId: Number(form.addressId),
      post: form.postname,
    };

    await createPostAssign(payload);
    refreshPostAssigns(); // optional, refresh list if you're showing it somewhere

    // Reset form
    setForm({
      clientId: "",
      addressId: "",
      postname: "",
    });
    setClientSearch("");
    setSelectedAddressText("");

    alert("Post assignment created successfully!");
  } catch (error) {
    console.error("Error creating post assignment:", error);
    alert("Failed to create post assignment.");
  } finally {
    setSubmitLoader(false);
  }
};
 useEffect(() => {
    if (!loading && postAssigns.length > 0) {
      console.log("Post Assignments:", postAssigns);
    }
    if (error) {
      console.error("Error fetching post assignments:", error);
    }
  }, [postAssigns, loading, error]);

  


    const handleChange = (field: string, value: any) => {
    setForm((f) => ({
      ...f,
      [field]: value,
    }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };
  return (
    <div className="min-h-screen p-6 font-sans">
      <div className="w-full px-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Post Assignment
          </h2>
          <form onSubmit={onSubmit} autoComplete="off">
            <div className="grid grid-cols-4 gap-4 items-start">
              {/* Client Search Field */}
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
                  className={fieldInputClasses}
                />
                {errors.clientId && (
                  <span className="text-xs text-red-500">
                    {errors.clientId}
                  </span>
                )}
                {errors.addressId && (
                  <span className="text-xs text-red-500 block">
                    {errors.addressId}
                  </span>
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
                          return (
                            <div
                              key={`${client.id}-${address.id}`}
                              onMouseDown={() =>
                                handleClientSelect(
                                  { id: client.id, name: client.name },
                                  address.id
                                )
                              }
                              className={`p-4 cursor-pointer text-sm ${
                                isEven ? "bg-white" : "bg-gray-50"
                              } hover:bg-gray-100`}
                            >
                              <div className="font-semibold text-gray-600 text-base">
                                {client.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {address.label || address.address}
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
                  className={`${fieldInputClasses} appearance-none bg-gray-50`}
                />
              </div>

              {/* Distance */}
              <div>
                <input
                  type="text"
                  value={form.postname}
                  onChange={(e) => handleChange("postname", e.target.value)}
                  placeholder="Enter post name"
                  className={`${fieldInputClasses}`}
                />
                {errors.postname && (
                  <span className="text-xs text-red-500">
                    {errors.postname}
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-start">
                <button
                  type="submit"
                  disabled={submitLoader}
                  className="inline-flex items-center px-4 py-1 border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 disabled:cursor-not-allowed font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
                >
                  {submitLoader ? (
                    <>
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <GenericTable
              data={postAssigns || []}
              columns={tableColumns}
              actions={tableActions}
              loading={loading}
              emptyMessage="No post assignment records found."
              searchable={true}
            />
    </div>
  );
};

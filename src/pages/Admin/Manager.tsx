import { useEffect, useState, useMemo } from "react";
import { useUsers } from "../../context/UserContext";
import { GenericTable, TableColumn } from "../../components/GenericTable";
import { GenericSearchForm, FieldConfig } from "../../components/GenericFormSearch";
import { Search } from "lucide-react";
import { toast } from "sonner";
import Pagination from "../../components/Pagination";

export const Manager = () => {
  const { 
    users, 
    loading, 
    error, 
    currentPage, 
    lastPage, 
    fetchUsersByRole, 
    setCurrentPage 
  } = useUsers();
  
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    fetchUsersByRole("manager", currentPage);
  }, [currentPage]);
  const searchFields = useMemo<FieldConfig[]>(() => [
    { name: "name", type: "text", placeholder: "First Name" },
    { name: "lastName", type: "text", placeholder: "Last Name" },
    { name: "email", type: "text", placeholder: "Email" },
    { name: "phone", type: "text", placeholder: "Phone" },
    { name: "address", type: "text", placeholder: "Street Address" },
    { name: "city", type: "text", placeholder: "City" },
    { name: "state", type: "text", placeholder: "State" },
    { name: "zipcode", type: "text", placeholder: "Zipcode" }
  ], []);

  const handleSearch = async (formData: { [key: string]: any }) => {
      const filterEntries = Object.entries(formData).filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== "");
      const filter = filterEntries.length > 0 ? Object.fromEntries(filterEntries) : null;
      setCurrentPage(1);
      await fetchUsersByRole("manager", 1, filter);
  };

  const tableColumns: TableColumn[] = [
    {
      key: "name",
      label: "First Name",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap"
    },
    {
      key: "lastName",
      label: "Last Name",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap"
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      searchable: true,
      className: "break-words max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]",
      render: (value: string) => <div className="truncate" title={value}>{value || "-"}</div>
    },
    {
      key: "phone",
      label: "Phone",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
    },
    {
      key: "address",
      label: "Street Address",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
    },
    {
      key: "city",
      label: "City",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
    },
    {
      key: "state",
      label: "State",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
    },
    {
      key: "zipcode",
      label: "Zipcode",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
    },
  ];

  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 md:px-6 pt-10">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Manager List</h2>
      </div>
      <GenericTable
        data={users || []}
        columns={tableColumns}
        actions={[]}
        loading={loading}
        emptyMessage="No records found matching your search criteria."
        searchable={true}
        onSearch = {handleSearch}

      />

      <div className="mt-6">
        <Pagination
          currentPage={currentPage}
          lastPage={lastPage}
          onPageChange={(page) => {
            setCurrentPage(page);
            fetchUsersByRole("manager", page);
          }}
          loading={loading}
        />
      </div>
    </div>
  );
};
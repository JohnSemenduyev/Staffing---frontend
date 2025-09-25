import { useEffect, useState, useMemo, useRef } from "react";
import { useUsers } from "../../context/UserContext";
import { GenericTable, TableColumn } from "../../components/GenericTable";
import { GenericSearchForm, FieldConfig } from "../../components/GenericFormSearch";
import { Search } from "lucide-react";
import Pagination from "../../components/Pagination";

export const Admin = () => {
  const { users, loading, error, currentPage, lastPage, fetchUsersByRole, setCurrentPage } = useUsers();
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [tableHeight, setTableHeight] = useState<string>("400px");
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsersByRole("admin");
  }, []);

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

  const searchFields = useMemo<FieldConfig[]>(() => [
    { name: "name", type: "text", placeholder: "First Name" },
    { name: "lastName", type: "text", placeholder: "Last Name" },
    { name: "email", type: "text", placeholder: "Email" },
    { name: "phone", type: "text", placeholder: "Phone" },
    { name: "address", type: "text", placeholder: "Street Address" },
    { name: "city", type: "text", placeholder: "City" },
    { name: "state", type: "text", placeholder: "State" },
    { name: "zipcode", type: "text", placeholder: "Zipcode" },
    {
      name: "status", type: "select", placeholder: "Status", options: [
        { label: "Verified", value: "true" },
        { label: "Unverified", value: "false" },
      ]
    },
  ], []);

  const handleSearch = async (formData: { [key: string]: any }) => {

      const filterEntries = Object.entries(formData).filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== "");
      const filter = filterEntries.length > 0 ? Object.fromEntries(filterEntries) : null;
      setCurrentPage(1);
      console.log(filter);
      await fetchUsersByRole("admin", 1, filter);
  };



  const tableColumns: TableColumn[] = [
    {
      key: "name",
      label: "First Name",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
      width: "200px"
    },
    {
      key: "lastName",
      label: "Last Name",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
      width: "200px"
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      searchable: true,
      width: "200px",
      className: "break-words max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]",
      render: (value: string) => <div className="truncate" title={value}>{value || "-"}</div>

    },
    {
      key: "phone",
      label: "Phone",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
      width: "200px"
    },
    {
      key: "address",
      label: "Street Address",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
      width: "200px"
    },
    {
      key: "city",
      label: "City",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
      width: "200px"
    },
    {
      key: "state",
      label: "State",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
      width: "200px"
    },
    {
      key: "zipcode",
      label: "Zipcode",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
      width: "200px"
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      searchable: true,
      width: "200px",
      className: "whitespace-nowrap",
      render: (value: boolean) => (
        <div className={`font-medium ${value ? 'text-green-600' : 'text-red-600'}`}>
          {value ? "verified" : "unverified"}
        </div>
      )
    }
  ];

  return (
    <div className="w-full overflow-x-hidden p-6">
      <div ref={formRef} className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Admin List</h2>
      </div>
      <GenericTable
        data={users || []}
        columns={tableColumns}
        actions={[]}
        loading={loading}
        emptyMessage="No records found matching your search criteria."
        searchable={true}
        onSearch = {handleSearch}
        tableHeight={tableHeight}
      />

      <div className="mt-6">
        <Pagination
          currentPage={currentPage}
          lastPage={lastPage}
          onPageChange={(page) => {
            setCurrentPage(page);
            fetchUsersByRole("admin", page);
          }}
          loading={loading}
        />
      </div>
    </div>
  );
};
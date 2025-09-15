import { useEffect, useState, useMemo, useRef } from "react";
import { GenericTable, TableColumn } from "../../components/GenericTable";
import { useAddresses } from "../../context/AddressContext";
import { GenericSearchForm, FieldConfig } from "../../components/GenericFormSearch";
import { Search } from "lucide-react";
import { toast } from "sonner";
import Pagination from "../../components/Pagination";

export const Client = () => {
  const {
    addresses,
    loading,
    error,
    currentPage,
    lastPage,
    fetchClientAddresses,
    setCurrentPage,
  } = useAddresses();

  const [showSearchForm, setShowSearchForm] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [tableHeight, setTableHeight] = useState<string>("400px");
  const formRef = useRef<HTMLDivElement>(null);

  // Fields that match the backend's ClientRegistrationFilter structure
  const searchFields = useMemo<FieldConfig[]>(() => [
    { name: "name", type: "text", placeholder: "First Name" },
    { name: "lastName", type: "text", placeholder: "Last Name" },
    { name: "email", type: "text", placeholder: "Email" },
    { name: "phone", type: "text", placeholder: "Phone" },
    { name: "company", type: "text", placeholder: "Company" },
    { name: "address", type: "text", placeholder: "Street Address" },
    { name: "city", type: "text", placeholder: "City" },
    { name: "state", type: "text", placeholder: "State" },
    { name: "pincode", type: "text", placeholder: "Zip Code" },
  ], []);

  const handleSearch = async (formData: { [key: string]: any }) => {

      const filterEntries = Object.entries(formData).filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== "");
      const filter = filterEntries.length > 0 ? Object.fromEntries(filterEntries) : null;
      setCurrentPage(1);
      await fetchClientAddresses(1, filter);

  };

  useEffect(() => {
    fetchClientAddresses(currentPage);
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
  }, [showSearchForm]);

  const tableColumns: TableColumn[] = [
    {
      key: "client.name",
      label: "First Name",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
      width: "200px",
    },
    {
      key: "client.lastName",
      label: "Last Name",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
      width: "200px",
    },
    {
      key: "client.email",
      label: "Email",
      sortable: true,
      searchable: true,
      width: "200px",
      className:
        "break-words max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]",
      render: (value: string) => (
        <div className="truncate" title={value}>
          {value || "-"}
        </div>
      ),
    },
    {
      key: "client.phone",
      label: "Phone",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
      width: "200px",
    },
    {
      key: "client.company",
      label: "Company",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
      width: "200px",
    },
    {
      key: "address",
      label: "Street Address",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
      width: "200px",
    },
    {
      key: "city",
      label: "City",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
      width: "200px",
    },
    {
      key: "state",
      label: "State",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
      width: "200px",
    },
    {
      key: "pincode",
      label: "Zip Code",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
      width: "200px",
    },
  ];

  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-4 md:px-6 pt-10">
      <div ref={formRef} className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Client List</h2>
      </div>
      <GenericTable
        data={addresses || []}
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
            fetchClientAddresses(page);
          }}
          loading={loading}
        />
      </div>
    </div>
  );
};

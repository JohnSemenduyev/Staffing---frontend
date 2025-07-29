import { useEffect, useState } from "react";
import { GenericTable, TableColumn } from "../../components/GenericTable";
import Pagination from "../../components/Pagination";
import { useAddresses } from "../../context/AddressContext";

export const Client = () => {
 const {
    addresses,
    loading,
    error,
    currentPage,
    lastPage,
    fetchAddresses,
    setCurrentPage
  } = useAddresses();

  useEffect(() => {
    fetchAddresses(currentPage);
  }, [currentPage]);

  const tableColumns: TableColumn[] = [
    {
      key: "client.name",
      label: "Client Name",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap"
    },
    {
      key: "client.email",
      label: "Email",
      sortable: true,
      searchable: true,
      className: "break-words max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]",
      render: (value: string) => (
        <div className="truncate" title={value}>{value || "-"}</div>
      )
    },
    {
      key: "address", // fixed typo from "adrress"
      label: "Address",
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
      key: "pincode",
      label: "Zip Code",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
    },
  ];

  return (
      <div className="min-h-screen p-6 font-sans">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">
          Client List
        </h2>
        </div>
    <GenericTable
      data={addresses || []}
      columns={tableColumns}
      actions={[]}
      loading={loading}
      emptyMessage="No records found matching your search criteria."
      searchable={true}
    />

     {lastPage > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  lastPage={lastPage}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    fetchAddresses(page);
                  }}
                />
              </div>
            )}
            </div>
  );
};


import { useEffect, useState } from "react";
import { GenericTable, TableColumn } from "../../components/GenericTable";
import { useClients } from "../../context/ClientContext";

export const Client = () => {
  const { clients, loading, error, fetchClients } = useClients();
  const [flattenedClients, setFlattenedClients] = useState([]);

  // 1. Fetch clients once on mount
  useEffect(() => {
    fetchClients();
  }, []);

  // 2. Whenever clients change, flatten the structure
  useEffect(() => {
    if (clients.length > 0) {
      const flatArray = flattenClientsWithAddresses(clients);
      setFlattenedClients(flatArray);
    }
  }, [clients]);

  const tableColumns: TableColumn[] = [
    {
      key: "name",
      label: "Client Name",
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
      render: (value: string) => (
        <div className="truncate" title={value}>{value || "-"}</div>
      )
    },
    {
      key: "address.address", // fixed typo from "adrress"
      label: "Address",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
    },
    {
      key: "address.city",
      label: "City",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
    },
    {
      key: "address.state",
      label: "State",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
    },
    {
      key: "address.pincode",
      label: "Zip Code",
      sortable: true,
      searchable: true,
      className: "whitespace-nowrap",
    },
  ];

  return (
    <GenericTable
      data={flattenedClients || []}
      columns={tableColumns}
      actions={[]}
      loading={loading}
      emptyMessage="No records found matching your search criteria."
      searchable={true}
    />
  );
};

function flattenClientsWithAddresses(clients) {
  const result = [];

  clients.forEach((client) => {
    if (client.addresses && client.addresses.length > 0) {
      client.addresses.forEach((address) => {
        result.push({
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          createdAt: client.createdAt,
          address: address,
        });
      });
    } else {
      result.push({
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        createdAt: client.createdAt,
        address: null,
      });
    }
  });

  return result;
}

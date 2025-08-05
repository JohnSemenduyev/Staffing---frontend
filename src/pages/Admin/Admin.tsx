import { useEffect } from "react";
import { useUsers } from "../../context/UserContext";
import { GenericTable, TableColumn } from "../../components/GenericTable";


export const Admin = () => {
      const { users, loading, error, fetchUsersByRole } = useUsers();

      useEffect(()=>{
        fetchUsersByRole("admin");
        console
      },[]);


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
         <div className="min-h-screen p-6 font-sans">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">
          Administrator List
        </h2>
        </div>
        <GenericTable
                  data={users || []}
                  columns={tableColumns}
                  actions={ []}
                  loading={loading}
                  emptyMessage="No records found matching your search criteria."
                  searchable={true}
                />
        </div>
    )
}
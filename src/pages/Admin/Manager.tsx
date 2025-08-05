import { useEffect } from "react";
import { useUsers } from "../../context/UserContext";
import { GenericTable, TableColumn } from "../../components/GenericTable";


export const Manager = () => {
      const { users, loading, error, fetchUsersByRole } = useUsers();

      useEffect(()=>{
        fetchUsersByRole("manager");
      },[]);


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
            key: "zipcode",
            label: "Zipcode",
            sortable: true,
            searchable: true,
            className: "whitespace-nowrap",
          },
          
        ];

    return (
         <div className="min-h-screen p-6 font-sans">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">
          Manager List
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
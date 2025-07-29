import { useEffect } from "react";
import { useUsers } from "../../context/UserContext";
import { GenericTable, TableColumn } from "../../components/GenericTable";


export const Guard = () => {
      const { users, loading, error, fetchUsersByRole } = useUsers();

      useEffect(()=>{
        fetchUsersByRole("guard");
      },[]);


        const tableColumns: TableColumn[] = [
          {
            key: "name",
            label: "Guard Name",
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
            key: "role",
            label: "Role",
            sortable: true,
            className: "whitespace-nowrap",
          },
          
        ];

    return (
        
        <GenericTable
                  data={users || []}
                  columns={tableColumns}
                  actions={ []}
                  loading={loading}
                  emptyMessage="No records found matching your search criteria."
                  searchable={true}
                />
    )
}
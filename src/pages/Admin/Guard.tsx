import { useEffect, useState } from "react";
import { useUsers } from "../../context/UserContext";
import { GenericTable, TableColumn } from "../../components/GenericTable";
import { GenericSearchForm, FieldConfig } from "../../components/GenericFormSearch";
import { Search } from "lucide-react";


export const Guard = () => {
      const { users, loading, error, fetchUsersByRole } = useUsers();
      const [showSearchForm, setShowSearchForm] = useState(false);
      const [searchLoading, setSearchLoading] = useState(false);

      useEffect(()=>{
        fetchUsersByRole("guard");
        console.log("Fetched guard users", users);
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
            label: " Street Address",
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

        const searchFields: FieldConfig[] = [
          { name: "name", type: "text", placeholder: "First Name" },
          { name: "lastName", type: "text", placeholder: "Last Name" },
          { name: "email", type: "text", placeholder: "Email" },
          { name: "phone", type: "text", placeholder: "Phone" },
          { name: "address", type: "text", placeholder: "Street Address" },
          { name: "city", type: "text", placeholder: "City" },
          { name: "state", type: "text", placeholder: "State" },
          { name: "zipcode", type: "text", placeholder: "Zipcode" }
        ];

        const handleSearch = (formData: any) => {
          // TODO:- implement Guard search
          console.log('Guard search:', formData);
          setSearchLoading(false);
        };

        const handleReset = () => {
          // TODO:- reset Guard search
          console.log('Guard reset');
          setShowSearchForm(false);
        };

    return (
         <div className="min-h-screen p-6 font-sans">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">
          Guard List
        </h2>
        </div>
        {/* Search Button */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowSearchForm(!showSearchForm)}
            className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Search className="w-4 h-4 mr-2" />
            {showSearchForm ? 'Hide Search' : 'Search'}
          </button>
        </div>

        {/* Generic Search Form */}
        <GenericSearchForm
          fields={searchFields}
          route="Guard"
          onSearch={handleSearch}
          onReset={handleReset}
          isVisible={showSearchForm}
          loading={searchLoading || loading}
        />

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
// import { useEffect, useState } from "react";
// import { GenericTable, TableColumn } from "../../components/GenericTable";
// import Pagination from "../../components/Pagination";
// import { useAddresses } from "../../context/AddressContext";

// export const Client = () => {
//  const {
//     addresses,
//     loading,
//     error,
//     currentPage,
//     lastPage,
//     fetchAddresses,
//     setCurrentPage
//   } = useAddresses();

//   useEffect(() => {
//     fetchAddresses(currentPage);
//     console.log("Fetching addresses for client view", addresses);
//   }, [currentPage]);

//   const tableColumns: TableColumn[] = [
//     {
//       key: "client.name",
//       label: "First Name",
//       sortable: true,
//       searchable: true,
//       className: "whitespace-nowrap",
//       width: "200px"
//     },
//     {
//       key: "client.lastName",
//       label: "Last Name",
//       sortable: true,
//       searchable: true,
//       className: "whitespace-nowrap",
//       width: "200px"
//     },
//     {
//       key: "client.email",
//       label: "Email",
//       sortable: true,
//       searchable: true,
//       width: "200px",
//       className: "break-words max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]",
//       render: (value: string) => (
//         <div className="truncate" title={value}>{value || "-"}</div>
//       )
//     },
//     {
//       key: "client.phone",
//       label: "Phone",
//       sortable: true,
//       searchable: true,
//       className: "whitespace-nowrap",
//       width: "200px"
//     },
//     {
//             key:"client.company",
//             label: "Company",
//             sortable: true,
//             searchable: true,
//             className: "whitespace-nowrap",
//             width: "200px"
//           },
//     {
//       key: "address", // fixed typo from "adrress"
//       label: " Street Address",
//       sortable: true,
//       searchable: true,
//       className: "whitespace-nowrap",
//       width: "200px"
//     },

//     {
//       key: "city",
//       label: "City",
//       sortable: true,
//       searchable: true,
//       className: "whitespace-nowrap",
//       width: "200px"
//     },
//     {
//       key: "state",
//       label: "State",
//       sortable: true,
//       searchable: true,
//       className: "whitespace-nowrap",
//       width: "200px"
//     },
//     {
//       key: "pincode",
//       label: "Zip Code",
//       sortable: true,
//       searchable: true,
//       className: "whitespace-nowrap",
//       width: "200px"
//     },
//   ];

//   return (
//       <div className="min-h-screen p-6 font-sans">
//       <div>
//         <h2 className="text-xl font-semibold text-gray-800">
//           Client List
//         </h2>
//         </div>
//     <GenericTable
//       data={addresses || []}
//       columns={tableColumns}
//       actions={[]}
//       loading={loading}
//       emptyMessage="No records found matching your search criteria."
//       searchable={true}
//     />

//      {lastPage > 1 && (
//               <div className="mt-6">
//                 <Pagination
//                   currentPage={currentPage}
//                   lastPage={lastPage}
//                   onPageChange={(page) => {
//                     setCurrentPage(page);
//                     fetchAddresses(page);
//                   }}
//                    loading={loading}
//                 />
//               </div>
//             )}
//             </div>
//   );
// };

import { useEffect, useState } from "react";
import { GenericTable, TableColumn } from "../../components/GenericTable";
import { useAddresses } from "../../context/AddressContext";
import { GenericSearchForm, FieldConfig } from "../../components/GenericFormSearch";
import { Search } from "lucide-react";

export const Client = () => {
  const {
    addresses,
    loading,
    error,
    fetchClientAddresses, // ✅ new API
  } = useAddresses();

  const [showSearchForm, setShowSearchForm] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Fields mirror the table/interface
  const searchFields: FieldConfig[] = [
    { name: "clientFirstName", type: "text", placeholder: "First Name" },
    { name: "clientLastName", type: "text", placeholder: "Last Name" },
    { name: "clientEmail", type: "text", placeholder: "Email" },
    { name: "clientPhone", type: "text", placeholder: "Phone" },
    { name: "clientCompany", type: "text", placeholder: "Company" },
    { name: "address", type: "text", placeholder: "Street Address" },
    { name: "city", type: "text", placeholder: "City" },
    { name: "state", type: "text", placeholder: "State" },
    { name: "pincode", type: "text", placeholder: "Zip Code" },
  ];

  const handleSearch = (formData: { [key: string]: any }) => {
    // TODO:- implement Client search
    console.log("Client search:", formData);
    setSearchLoading(false);
  };

  const handleReset = () => {
    // TODO:- reset Client search
    console.log("Client search reset");
    setShowSearchForm(false);
  };

  useEffect(() => {
    fetchClientAddresses();
    console.log("Fetching client addresses", addresses);
  }, []);

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
    <div className="min-h-screen p-6 font-sans">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Client List</h2>
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
        route="Client"
        onSearch={handleSearch}
        onReset={handleReset}
        isVisible={showSearchForm}
        loading={searchLoading || loading}
      />

      <GenericTable
        data={addresses || []}
        columns={tableColumns}
        actions={[]}
        loading={loading}
        emptyMessage="No records found matching your search criteria."
        searchable={true}
      />
    </div>
  );
};

import { useEffect } from "react";
import { GenericTable, TableColumn } from "../../components/GenericTable";
import Pagination from "../../components/Pagination";
import { useScheduleSessionContext } from "../../context/ClientList";

function ClientList() {
    const { state, fetchScheduleSessions, setCurrentPage } = useScheduleSessionContext();
    const { scheduleSessions, loading, error, lastPage, currentPage } = state;

    // Get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
  const date = new Date(); // or pass a specific date here
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
   const formattedDate = `${yyyy}-${mm}-${dd}`;
  return formattedDate;  // ✅ You need to return it
};

useEffect(() => {
    const currentDate = getCurrentDate();
    fetchScheduleSessions(currentPage, currentDate);
    console.log("Fetching schedule sessions for client list", scheduleSessions);
}, [currentPage]);

    const tableColumns: TableColumn[] = [
        {
          key: "client.name",
          label: "Client Name",
          sortable: true,
          searchable: true,
          className: "whitespace-nowrap",
          width: "200px"
        },
        {
            key:"address.industry",
            label: "Industry",
            sortable: true,
            searchable: true,
            className: "whitespace-nowrap",
            width: "200px"
        },
        {
            key:"weeklyHours",
            label: "Weekly Hours",
            sortable: true,
            searchable: true,
            className: "whitespace-nowrap",
            width: "200px"
        },
        {
            key:"address.address",
            label: "Street Address",
            sortable: true,
            searchable: true,
            className: "whitespace-nowrap",
            width: "200px"
        },
        {
            key:"address.city",
            label: "City",
            sortable: true,
            searchable: true,
            className: "whitespace-nowrap",
            width: "200px"
        },
        {
            key:"address.state",
            label: "State",
            sortable: true,
            searchable: true,
            className: "whitespace-nowrap",
            width: "200px"
        },
        {
            key:"address.pincode",
            label: "Zip Code",
            sortable: true,
            searchable: true,
            className: "whitespace-nowrap",
            width: "200px"
        }
        
    ];

    // Show error if there's one
    if (error) {
        return (
            <div className="min-h-screen p-6 font-sans">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    Error: {error}
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen p-6 font-sans">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">
          Client List
        </h2>
        </div>
            
            <GenericTable
                data={scheduleSessions || []}
                columns={tableColumns}
                actions={[]}
                loading={loading}
                emptyMessage="No schedule sessions found."
                searchable={true}
            />

            {lastPage > 1 && (
                <div className="mt-6">
                    <Pagination
                        currentPage={currentPage}
                        lastPage={lastPage}
                        onPageChange={(page) => {
                            setCurrentPage(page);
                            const currentDate = getCurrentDate();
                            fetchScheduleSessions(page, currentDate); // Remove the startDate parameter
                        }}
                         loading={loading}
                    />
                </div>
            )}
        </div>
    );
}

export default ClientList
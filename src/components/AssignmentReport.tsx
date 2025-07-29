import React, { useMemo, useState } from "react";
import { useAssignments } from "../hooks/useAssignment";
import { useDeleteAssignment } from "../hooks/usedeleteassignment";
import { GenericTable, TableColumn, TableAction } from "../components/GenericTable";
import { Edit, Trash2 } from "lucide-react";

const getLocationString = (location: any) =>
  [location?.label, location?.address, location?.city].filter(Boolean).join(", ");

const AssignmentHistory: React.FC = () => {
  const { data, isLoading, isError } = useAssignments();
  const deleteMutation = useDeleteAssignment();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  const assignments = useMemo(() => {
    if (!data) return [];
    return data.map((a: any) => ({
      id: String(a.id),
      clientName: a.client?.name || "",
      location: getLocationString(a.address),
      userName: a.user?.name || "",
      role: a.role,
      access: a.access,
      guardName: a.guard?.name || "",
      notifications: a.notification || [],
      createdAt: a.createdAt,
    }));
  }, [data]);

  const handleEdit = (record: any) => {
    alert(`Start editing assignment for: ${record.userName}`);
  };

  const handleDelete = (record: any) => {
    setSelectedRecord(record);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (selectedRecord) {
      try {
        await deleteMutation.mutateAsync(Number(selectedRecord.id));
        setShowConfirmModal(false);
        setSelectedRecord(null);
      } catch (error) {
        console.error("Failed to delete assignment", error);
      }
    }
  };

const columns: TableColumn[] = [
  {
    key: "clientName",
    label: "Client Name",
    sortable: true,
    searchable: true,
    className: "whitespace-nowrap",
    width: "200px"
  },
  {
    key: "location",
    label: "Client Location",
    sortable: true,
    searchable: true,
    className: "break-words max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]",
    render: (value: string) => (
      <div className="truncate" title={value}>
        {value || "-"}
      </div>
    )
  },
  {
    key: "userName",
    label: "User Name",
    sortable: true,
    searchable: true,
    className: "whitespace-nowrap"
  },
  {
    key: "role",
    label: "Role",
    sortable: true,
    searchable: true,
    className: "whitespace-nowrap"
  },
  {
    key: "access",
    label: "Access",
    sortable: true,
    searchable: true,
    className: "whitespace-nowrap"
  },
  {
    key: "guardName",
    label: "Guard",
    sortable: true,
    searchable: true,
    className: "whitespace-nowrap"
  },
  {
    key: "notifications",
    label: "Notifications",
    sortable: false,
    searchable: false,
    className: "whitespace-nowrap",
    render: (value: string[]) => (
      <div className="flex gap-1 flex-row flex-wrap max-w-[400px]">
        {value.map((notif, i) => (
          <span key={i} className="inline-flex px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
            {notif}
          </span>
        ))}
      </div>
    )
  }
];
const actions: TableAction[] = [
  {
    label: "Edit",
    icon: <Edit className="w-4 h-4" />,
    onClick: handleEdit,
    className: "text-blue-500 hover:text-green-700",
    title: "Edit"
  },
  {
    label: "Delete",
    icon:<Trash2 className="w-4 h-4" />,
    onClick: handleDelete,
    className: "text-red-500 hover:text-red-700",
    title: "Delete"
  }
];

  return (
    <div className="w-full max-w-full">
      <div className="mb-3 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 font-sans">
          Assignment History
        </h2>
      </div>

      <GenericTable
        data={assignments}
        columns={columns}
        actions={actions}
        loading={isLoading}
        emptyMessage="No assignment records found."
        searchable={true}
      />
      {showConfirmModal && selectedRecord && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-[90%] max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Confirm Deletion</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete the assignment for <strong>{selectedRecord.userName}</strong>?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentHistory;




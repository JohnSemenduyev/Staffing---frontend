import React, { useMemo, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useAssignments } from "../hooks/useAssignment";
import { useDeleteAssignment } from "../hooks/usedeleteassignment";
// import { useDeleteAssignment } from "../hooks/usedeleteassignment";

type RoleOption = "Admin" | "Manager" | "Guard" | "Client";
type NotificationOption = "Geolocation" | "Time Clock" | "Weekly Hours" | "Scheduling";

interface AssignmentRecord {
  id: string;
  clientId: number;
  clientName: string;
  location: string;
  userId: number;
  userName: string;
  role: RoleOption;
  access: "View" | "Edit";
  guardId: number;
  guardName: string;
  notifications: NotificationOption[];
  createdAt: string;
}

function getLocationString(location: any) {
  if (!location) return "";
  return [location?.label, location?.address, location?.city].filter(Boolean).join(", ");
}

const AssignmentHistory: React.FC = () => {
  const { data, isLoading, isError } = useAssignments();
  const deleteMutation = useDeleteAssignment();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AssignmentRecord | null>(null);

  const assignments: AssignmentRecord[] = useMemo(() => {
    if (!data) return [];
    return data.map((a: any) => ({
      id: String(a.id),
      clientId: a.clientId,
      clientName: a.client?.name || "",
      location: getLocationString(a.address),
      userId: a.userId,
      userName: a.user?.name || "",
      role: a.role,
      access: a.access,
      guardId: a.guardId,
      guardName: a.guard?.name || "",
      notifications: a.notification || [],
      createdAt: a.createdAt,
    }));
  }, [data]);

  const [sortConfig, setSortConfig] = useState<{ key: keyof AssignmentRecord | null; direction: "asc" | "desc" }>({
    key: null,
    direction: "asc",
  });

  const [searchTerms, setSearchTerms] = useState({
    clientName: "",
    clientLocation: "",
    invoiceName: "",
    status: "",
    access: "",
    manager: "",
  });

  const filteredAssignments = useMemo(() => {
    let filtered = assignments.filter((record) => {
      const clientLocation = record.location || "";
      return (
        (!searchTerms.clientName || record.clientName.toLowerCase().includes(searchTerms.clientName.toLowerCase())) &&
        (!searchTerms.clientLocation || clientLocation.toLowerCase().includes(searchTerms.clientLocation.toLowerCase())) &&
        (!searchTerms.invoiceName || record.userName.toLowerCase().includes(searchTerms.invoiceName.toLowerCase())) &&
        (!searchTerms.status || record.role.toLowerCase().includes(searchTerms.status.toLowerCase())) &&
        (!searchTerms.access || record.access.toLowerCase().includes(searchTerms.access.toLowerCase()))
      );
    });
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key!] ?? "";
        const bValue = b[sortConfig.key!] ?? "";
        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return filtered;
  }, [assignments, searchTerms, sortConfig]);

  const handleSort = (key: keyof AssignmentRecord) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleEdit = (record: AssignmentRecord) => {
    alert(`Start editing assignment for: ${record.userName}`);
  };

  const handleDelete = (record: AssignmentRecord) => {
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
        // Optionally show an error toast here
      }
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading assignments.</div>;

  return (
    <div className="w-full max-w-full">
      <div className="mb-3 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 font-sans">
          Assignment History
        </h2>
      </div>
      <div className="relative w-full overflow-x-auto rounded-2xl border border-gray-200 shadow-xl bg-white">
        <table className="w-full table-auto text-sm text-gray-800 border-separate border-spacing-0 font-sans">
          <thead className="bg-[#004175] text-white text-xs font-sans">
            <tr>
              {["Client Name", "Client Location", "User Name", "Role", "Access", "Guard", "Notifications", "Actions"].map((header, index) => (
                <th key={header} className="px-3 sm:px-4 py-3 text-left border-b border-gray-300 whitespace-nowrap">
                  <div className="flex items-center">
                    {header}
                    {index < 5 && (
                      <div className="pl-1">
                        <span
                          className={`cursor-pointer ${sortConfig.key === header.toLowerCase().replace(" ", "") && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}
                          onClick={() => handleSort(header.toLowerCase().replace(" ", "") as keyof AssignmentRecord)}
                        >
                          <ChevronUp className="-mb-1 w-4 h-4" />
                        </span>
                        <span
                          className={`cursor-pointer ${sortConfig.key === header.toLowerCase().replace(" ", "") && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}
                          onClick={() => handleSort(header.toLowerCase().replace(" ", "") as keyof AssignmentRecord)}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </span>
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>

            {/* Search filter inputs */}
            <tr className="bg-white text-gray-700 font-sans">
              {[{ label: "Name", key: "clientName" },
                { label: "Location", key: "clientLocation" },
                { label: "User", key: "invoiceName" },
                { label: "Status", key: "status" },
                { label: "Access", key: "access" },
                { label: "Manager", key: "manager" }]
                .map(({ label, key }) => (
                  <th key={key} className="px-2 sm:px-4 py-2 border-b text-left">
                    <input
                      placeholder={`Search ${label}`}
                      className="w-min max-w-[120px] sm:max-w-[160px] md:max-w-[200px] px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 placeholder:text-gray-400"
                      type="text"
                      value={searchTerms[key as keyof typeof searchTerms]}
                      onChange={(e) =>
                        setSearchTerms((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                    />
                  </th>
                ))}
              <th className="px-2 sm:px-4 py-2 border-b"></th>
              <th className="px-2 sm:px-4 py-2 border-b"></th>
            </tr>
          </thead>
          <tbody>
            {filteredAssignments.map((record) => (
              <tr key={record.id} className="hover:bg-blue-50 transition-colors border-t border-gray-100">
                <td className="px-2 h-7 sm:px-4 py-3 border-b border-gray-100 whitespace-nowrap">{record.clientName}</td>
                <td className="px-2 sm:px-4 py-3 border-b border-gray-100 break-words max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]">
                  <div className="truncate" title={record.location}>{record.location || "-"}</div>
                </td>
                <td className="px-2 sm:px-4 py-3 border-b border-gray-100 whitespace-nowrap">{record.userName}</td>
                <td className="px-2 sm:px-4 py-3 border-b border-gray-100 whitespace-nowrap">{record.role}</td>
                <td className="px-2 sm:px-4 py-3 border-b border-gray-100 whitespace-nowrap">{record.access}</td>
                <td className="px-2 sm:px-4 py-3 border-b border-gray-100 whitespace-nowrap">{record.guardName}</td>
                <td className="px-2 sm:px-4 py-3 border-b border-gray-100 align-top w-[200px] sm:w-[300px] lg:w-[380px]">
                  <div className="flex gap-1 flex-row">
                    {record.notifications.map((notif, i) => (
                      <span key={i} className="inline-flex w-fit px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                        {notif}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-2 sm:px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(record)} className="text-blue-500 hover:text-green-700" title="Edit">✏️</button>
                    <button onClick={() => handleDelete(record)} className="text-red-500 hover:text-red-700" title="Delete">
                      {deleteMutation.isPending && selectedRecord?.id === record.id ? "Deleting..." : "🗑️"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="sm:hidden px-2 py-2 text-xs text-gray-400">Scroll horizontally for more</div>
      </div>

      {/* Confirmation Modal */}
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
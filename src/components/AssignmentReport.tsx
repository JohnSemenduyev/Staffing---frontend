import React, { useMemo, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useAssignments } from "../hooks/useAssignment"; // <-- Adjust path if needed

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

  // Flatten backend response
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
    key: null, direction: "asc"
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
        // manager filter can be added if you link manager data
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
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleEdit = (record: AssignmentRecord) => {
    alert(`Start editing assignment for: ${record.userName}`);
  };

  const handleDelete = (record: AssignmentRecord) => {
    alert(`Delete assignment (id: ${record.id})`);
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
        <table className="min-w-[950px] w-full text-sm text-gray-800 border-separate border-spacing-0 font-sans table-fixed">
          <thead className="bg-[#004175] text-white text-xs font-sans">
            <tr>
              <th className="px-3 sm:px-4 py-3 text-left border-b border-gray-300 whitespace-nowrap select-none">
                <div className="flex items-center">
                  Client Name
                  <div className="pl-1">
                    <span
                      className={`cursor-pointer ${sortConfig.key === "clientName" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}
                      onClick={() => handleSort("clientName")}
                    >
                      <ChevronUp className="-mb-1 w-4 h-4" />
                    </span>
                    <span
                      className={`cursor-pointer ${sortConfig.key === "clientName" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}
                      onClick={() => handleSort("clientName")}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </th>
              <th className="px-3 sm:px-4 py-3 text-left border-b border-gray-300 whitespace-nowrap select-none">
                <div className="flex items-center">
                  Client Location
                  <div className="pl-1">
                    <span
                      className={`cursor-pointer ${sortConfig.key === "location" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}
                      onClick={() => handleSort("location")}
                    >
                      <ChevronUp className="-mb-1 w-4 h-4" />
                    </span>
                    <span
                      className={`cursor-pointer ${sortConfig.key === "location" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}
                      onClick={() => handleSort("location")}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </th>
              <th className="px-3 sm:px-4 py-3 text-left border-b border-gray-300 whitespace-nowrap select-none">
                <div className="flex items-center">
                  User Name
                  <div className="pl-1">
                    <span
                      className={`cursor-pointer ${sortConfig.key === "userName" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}
                      onClick={() => handleSort("userName")}
                    >
                      <ChevronUp className="-mb-1 w-4 h-4" />
                    </span>
                    <span
                      className={`cursor-pointer ${sortConfig.key === "userName" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}
                      onClick={() => handleSort("userName")}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </th>
              <th className="px-3 sm:px-4 py-3 text-left border-b border-gray-300 whitespace-nowrap select-none">
                <div className="flex items-center">
                  Role
                  <div className="pl-1">
                    <span
                      className={`cursor-pointer ${sortConfig.key === "role" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}
                      onClick={() => handleSort("role")}
                    >
                      <ChevronUp className="-mb-1 w-4 h-4" />
                    </span>
                    <span
                      className={`cursor-pointer ${sortConfig.key === "role" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}
                      onClick={() => handleSort("role")}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </th>
              <th className="px-3 sm:px-4 py-3 text-left border-b border-gray-300 whitespace-nowrap select-none">
                <div className="flex items-center">
                  Access
                  <div className="pl-1">
                    <span
                      className={`cursor-pointer ${sortConfig.key === "access" && sortConfig.direction === "asc" ? "text-white" : "text-white/40"}`}
                      onClick={() => handleSort("access")}
                    >
                      <ChevronUp className="-mb-1 w-4 h-4" />
                    </span>
                    <span
                      className={`cursor-pointer ${sortConfig.key === "access" && sortConfig.direction === "desc" ? "text-white" : "text-white/40"}`}
                      onClick={() => handleSort("access")}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </th>
              <th className="px-3 sm:px-4 py-3 text-left border-b border-gray-300 whitespace-nowrap select-none">
                <div className="flex items-center">
                  Guard
                </div>
              </th>
              <th className="px-2 sm:px-4 py-3 text-left border-b border-gray-300 whitespace-nowrap">
                Notifications
              </th>
              <th className="px-2 sm:px-4 py-3 text-left border-b border-gray-300 whitespace-nowrap">
                Actions
              </th>
            </tr>
            <tr className="bg-white text-gray-700 font-sans">
              {[
                "clientName",
                "clientLocation",
                "invoiceName",
                "status",
                "access",
                "manager",
              ].map((term, idx) => (
                <th key={term} className="px-2 sm:px-4 py-2 border-b text-left">
                  <input
                    placeholder={
                      idx === 0
                        ? "Search client name"
                        : idx === 1
                        ? "Search client location"
                        : idx === 2
                        ? "Search user name"
                        : idx === 3
                        ? "Search role"
                        : idx === 4
                        ? "Search access"
                        : "Search manager"
                    }
                    className="w-full max-w-[120px] sm:max-w-[160px] md:max-w-[200px] px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 placeholder:text-gray-400"
                    type="text"
                    value={searchTerms[term as keyof typeof searchTerms]}
                    onChange={(e) =>
                      setSearchTerms((prev) => ({
                        ...prev,
                        [term]: e.target.value,
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
              <tr
                key={record.id}
                className="hover:bg-blue-50 transition-colors border-t border-gray-100"
              >
                <td className="px-2 sm:px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                  {record.clientName}
                </td>
                <td className="px-2 sm:px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                  {record.location || "-"}
                </td>
                <td className="px-2 sm:px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                  {record.userName}
                </td>
                <td className="px-2 sm:px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                  {record.role}
                </td>
                <td className="px-2 sm:px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                  {record.access}
                </td>
                <td className="px-2 sm:px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                  {record.guardName}
                </td>
                <td className="px-2 sm:px-4 py-3 border-b border-gray-100 align-top w-[250px] sm:w-[320px] lg:w-[380px]">
                  <div className="grid grid-cols-2 gap-x-1 gap-y-1">
                    {record.notifications.map((notif, i) => (
                      <span
                        key={i}
                        className="inline-flex px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded"
                      >
                        {notif}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-2 sm:px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(record)}
                      className="text-blue-500 hover:text-green-700"
                      title="Edit"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-square-pen"
                        aria-hidden="true"
                      >
                        <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(record)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-trash2"
                        aria-hidden="true"
                      >
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        <line x1="10" x2="10" y1="11" y2="17"></line>
                        <line x1="14" x2="14" y1="11" y2="17"></line>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="sm:hidden px-2 py-2 text-xs text-gray-400">
          Scroll horizontally for more
        </div>
      </div>
    </div>
  );
};

export default AssignmentHistory;

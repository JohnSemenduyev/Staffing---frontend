import React, { useMemo, useState } from "react";
import { Input } from "../components/ui/input";

// Types
type RoleOption = "Admin" | "Manager" | "Guard" | "Client";
type NotificationOption = "Geolocation" | "Time Clock" | "Weekly Hours" | "Scheduling";

interface AssignmentRecord {
  id: string;
  clientId: number;
  clientName: string;
  location: string | null;
  userId: number;
  userName: string;
  role: RoleOption;
  access: "View" | "Edit";
  notifiedManagerId: number;
  notifiedManagerName: string;
  notifications: NotificationOption[];
  createdAt: string;
}

interface Props {
  assignments: AssignmentRecord[];
}

const AssignmentReport: React.FC<Props> = ({ assignments }) => {
  const [clientFilter, setClientFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [accessFilter, setAccessFilter] = useState("");
  const [managerFilter, setManagerFilter] = useState("");
  const [createdFilter, setCreatedFilter] = useState("");

  const norm = (s: unknown) => (s ?? "").toString().toLowerCase();

  const filtered = useMemo(() => {
    const c = norm(clientFilter);
    const l = norm(locationFilter);
    const u = norm(userFilter);
    const r = norm(roleFilter);
    const a = norm(accessFilter);
    const m = norm(managerFilter);
    const d = norm(createdFilter);

    return assignments.filter((rec) => {
      const clientName = norm(rec.clientName);
      const location = norm(rec.location);
      const userName = norm(rec.userName);
      const role = norm(rec.role);
      const access = norm(rec.access);
      const mgr = norm(rec.notifiedManagerName);
      const createdLocal = norm(new Date(rec.createdAt).toLocaleString());
      const createdISO = norm(rec.createdAt);

      return (
        (!c || clientName.includes(c)) &&
        (!l || location.includes(l)) &&
        (!u || userName.includes(u)) &&
        (!r || role.includes(r)) &&
        (!a || access.includes(a)) &&
        (!m || mgr.includes(m)) &&
        (!d || createdLocal.includes(d) || createdISO.includes(d))
      );
    });
  }, [assignments, clientFilter, locationFilter, userFilter, roleFilter, accessFilter, managerFilter, createdFilter]);

  return (
    <div className=" p-2">
<div className="mb-6 border-b ">
          <h1 className="text-xl font-semibold mb-2 text-gray-800">Assignment History</h1>
        </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-1 border text-left">Client</th>
              <th className="px-2 py-1 border text-left">Location</th>
              <th className="px-2 py-1 border text-left">User</th>
              <th className="px-2 py-1 border text-left">Role</th>
              <th className="px-2 py-1 border text-left">Access</th>
              <th className="px-2 py-1 border text-left">Manager</th>
              <th className="px-2 py-1 border text-left">Notifications</th>
              <th className="px-2 py-1 border text-left">Created</th>
            </tr>
            <tr className="bg-white">
              <th className="px-2 py-1 border">
                <Input value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} placeholder="Filter..." className="h-8 font-normal" />
              </th>
              <th className="px-2 py-1 border">
                <Input value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} placeholder="Filter..." className="h-8 font-normal" />
              </th>
              <th className="px-2 py-1 border">
                <Input value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="Filter..." className="h-8 font-normal" />
              </th>
              <th className="px-2 py-1 border">
                <Input value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} placeholder="Filter..." className="h-8 font-normal" />
              </th>
              <th className="px-2 py-1 border">
                <Input value={accessFilter} onChange={(e) => setAccessFilter(e.target.value)} placeholder="Filter..." className="h-8 font-normal" />
              </th>
              <th className="px-2 py-1 border">
                <Input value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)} placeholder="Filter..." className="h-8 font-normal" />
              </th>
              <th className="px-2 py-1 border"></th>
              <th className="px-2 py-1 border">
                <Input value={createdFilter} onChange={(e) => setCreatedFilter(e.target.value)} placeholder="Filter..." className="h-8 font-normal" />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-4">
                  No matching records.
                </td>
              </tr>
            ) : (
              filtered.map((rec) => (
                <tr key={rec.id} className="border-t">
                  <td className="px-2 py-1">{rec.clientName}</td>
                  <td className="px-2 py-1">{rec.location ?? "-"}</td>
                  <td className="px-2 py-1">{rec.userName}</td>
                  <td className="px-2 py-1">{rec.role}</td>
                  <td className="px-2 py-1">{rec.access}</td>
                  <td className="px-2 py-1">{rec.notifiedManagerName}</td>
                  <td className="px-2 py-1">{rec.notifications.join(", ") || "-"}</td>
                  <td className="px-2 py-1 whitespace-nowrap">
                    {new Date(rec.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssignmentReport;

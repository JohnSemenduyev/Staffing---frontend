import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useClients } from "../../hooks/useClients";
import { useUsers } from "../../hooks/useUsers";
import { useGuards } from "../../hooks/useGuards";
import { useAddressesByClient } from "../../hooks/useAddressesByClient";
import { useCreateAssignment } from "../../hooks/userAssignment"; // << Correct!
import AssignmentHistory from "../../components/AssignmentReport";

const notificationOptions = [
  "Geolocation",
  "Time Clock",
  "Weekly Hours",
  "Scheduling",
] as const;

type NotificationOption = (typeof notificationOptions)[number];
type RoleOption = "Admin" | "Manager" | "Guard" | "Client";

const DEFAULT_FORM = {
  userId: "",
  guardId: "",
  clientId: "",
  addressId: "",
  role: "",
  access: "",
  notification: [] as NotificationOption[],
};

export default function AssignmentForm() {
  const { data: clients, isLoading: loadingClients } = useClients();
  const { data: users, isLoading: loadingUsers } = useUsers();
  const { data: guards, isLoading: loadingGuards } = useGuards();

  const [form, setForm] = useState(DEFAULT_FORM);

  // Whenever client changes, reset address selection!
  const clientIdNum = form.clientId ? Number(form.clientId) : 0;
  const { data: addresses, isLoading: loadingAddresses } = useAddressesByClient(clientIdNum);

  const createAssignment = useCreateAssignment();

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (field: string, value: any) => {
    setForm(f => ({
      ...f,
      [field]: value,
      ...(field === "clientId" ? { addressId: "" } : {}),
    }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const handleCheckbox = (option: NotificationOption) => {
    setForm(f =>
      f.notification.includes(option)
        ? { ...f, notification: f.notification.filter(n => n !== option) }
        : { ...f, notification: [...f.notification, option] }
    );
  };

  const validate = () => {
    const e: any = {};
    if (!form.clientId) e.clientId = "Required";
    if (!form.userId) e.userId = "Required";
    if (!form.guardId) e.guardId = "Required";
    if (!form.addressId) e.addressId = "Required";
    if (!form.role) e.role = "Required";
    if (!form.access) e.access = "Required";
    if (!form.notification.length) e.notification = "Select at least one notification";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    createAssignment.mutate({
      userId: Number(form.userId),
      guardId: Number(form.guardId),
      clientId: Number(form.clientId),
      addressId: Number(form.addressId),
      role: form.role,
      access: form.access,
      notification: form.notification,
    });
    setForm(DEFAULT_FORM);
  };

  if (loadingClients || loadingUsers || loadingGuards || loadingAddresses)
    return <div>Loading...</div>;
  if (!clients || !users || !guards) return <div>Error fetching data.</div>;

  return (
    <>
    <form
      onSubmit={onSubmit}
      className="w-full max-w-6xl mx-auto bg-white rounded-lg border border-gray-200 shadow-md p-2 sm:p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
    >
      {/* Client */}
      <div>
        <label className="block mb-1 text-sm font-semibold">Client</label>
        <select
          value={form.clientId}
          onChange={e => handleChange("clientId", e.target.value)}
          className={`w-full px-3 py-0.5 border border-gray-300 rounded-md text-sm ${form.clientId === "" ? "text-gray-400" : "text-gray-700"}`}
        >
          <option value="">Select Client</option>
          {clients.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.clientId && <p className="text-red-500 text-xs mt-1">{errors.clientId}</p>}
      </div>

      {/* Address: filtered by client */}
      <div>
        <label className="block mb-1 text-sm font-semibold">Client Address</label>
        <select
          value={form.addressId}
          onChange={e => handleChange("addressId", e.target.value)}
          className={`w-full px-3 py-0.5 border border-gray-300 rounded-md text-sm ${form.addressId === "" ? "text-gray-400" : "text-gray-700"}`}
          disabled={!form.clientId || !addresses}
        >
          <option value="">Select Address</option>
          {addresses && addresses.map((a: any) => (
            <option key={a.id} value={a.id}>
              {a.label ? `${a.label}, ` : ""}
              {a.address}, {a.city}
            </option>
          ))}
        </select>
        {errors.addressId && <p className="text-red-500 text-xs mt-1">{errors.addressId}</p>}
      </div>

      {/* User */}
      <div>
        <label className="block mb-1 text-sm font-semibold">User</label>
        <select
          value={form.userId}
          onChange={e => handleChange("userId", e.target.value)}
          className={`w-full px-3 py-0.5 border border-gray-300 rounded-md text-sm ${form.userId === "" ? "text-gray-400" : "text-gray-700"}`}
        >
          <option value="">Select User</option>
          {users.map((u: any) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        {errors.userId && <p className="text-red-500 text-xs mt-1">{errors.userId}</p>}
      </div>
      {/* Guard */}
      <div>
        <label className="block mb-1 text-sm font-semibold">Guard</label>
        <select
          value={form.guardId}
          onChange={e => handleChange("guardId", e.target.value)}
          className={`w-full px-3 py-0.5 border border-gray-300 rounded-md text-sm ${form.guardId === "" ? "text-gray-400" : "text-gray-700"}`}
        >
          <option value="">Select Guard</option>
          {guards.map((g: any) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        {errors.guardId && <p className="text-red-500 text-xs mt-1">{errors.guardId}</p>}
      </div>
      {/* Role */}
      <div>
        <label className="block mb-1 text-sm font-semibold">Role</label>
        <select
          value={form.role}
          onChange={e => handleChange("role", e.target.value)}
          className={`w-full px-3 py-0.5 border border-gray-300 rounded-md text-sm ${form.role === "" ? "text-gray-400" : "text-gray-700"}`}
        >
          <option value="">Select Role</option>
          {["Admin", "Manager", "Guard", "Client"].map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
      </div>
      {/* Access */}
      <div>
        <label className="block mb-1 text-sm font-semibold">Access</label>
        <select
          value={form.access}
          onChange={e => handleChange("access", e.target.value)}
          className={`w-full px-3 py-0.5 border border-gray-300 rounded-md text-sm ${form.access === "" ? "text-gray-400" : "text-gray-700"}`}
        >
          <option value="">Select Access</option>
          {["View", "Edit"].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        {errors.access && <p className="text-red-500 text-xs mt-1">{errors.access}</p>}
      </div>
      {/* Notifications */}
      <div className="sm:col-span-2 lg:col-span-2 flex flex-col">
        <label className="block mb-1 text-sm font-semibold">Notifications</label>
        <div className="flex flex-wrap gap-4">
          {notificationOptions.map(opt => (
            <label key={opt} className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.notification.includes(opt)}
                onChange={() => handleCheckbox(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
        {errors.notification && <div className="text-red-600 text-xs">{errors.notification}</div>}
      </div>
      {/* Button */}
      <div className="flex gap-3 pt-2 sm:pt-0 sm:col-span-2 lg:col-span-2 justify-end">
        <button
          type="submit"
          disabled={createAssignment.isPending}
          className="py-1.5 px-3 sm:px-4 rounded-md transition cursor-pointer w-auto flex items-center gap-1 border border-blue-600 bg-transparent text-blue-600 hover:bg-blue-50 h-9 text-sm font-sans"
        >
          <Plus className="w-5 h-5" />
          {createAssignment.isPending ? "Saving..." : "Add"}
        </button>
      </div>
    </form>
    <AssignmentHistory />
    </>
  );
}

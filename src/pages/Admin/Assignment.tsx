// import React, { useState } from "react";
// import { Plus } from "lucide-react";
// import { useClients } from "../../hooks/useClients";
// import { useUsers } from "../../hooks/useUsers";
// import { useGuards } from "../../hooks/useGuards";
// import { useAddressesByClient } from "../../hooks/useAddressesByClient";
// import { useCreateAssignment } from "../../hooks/userAssignment";
// import AssignmentHistory from "../../components/AssignmentReport";

// const notificationOptions = [
//   "Geolocation",
//   "Time Clock",
//   "Weekly Hours",
//   "Scheduling",
// ] as const;

// type NotificationOption = (typeof notificationOptions)[number];

// const DEFAULT_FORM = {
//   userId: "",
//   guardId: "",
//   clientId: "",
//   addressId: "",
//   role: "",
//   access: "",
//   notification: [] as NotificationOption[],
// };

// export default function AssignmentForm() {
//   const { data: clients, isLoading: loadingClients } = useClients();
//   const { data: users, isLoading: loadingUsers } = useUsers();
//   const { data: guards, isLoading: loadingGuards } = useGuards();

//   const [form, setForm] = useState(DEFAULT_FORM);
//   const clientIdNum = form.clientId ? Number(form.clientId) : 0;
//   const { data: addresses, isLoading: loadingAddresses } = useAddressesByClient(clientIdNum);

//   const createAssignment = useCreateAssignment();
//   const [errors, setErrors] = useState<{ [key: string]: string }>({});

//   const handleChange = (field: string, value: any) => {
//     setForm(f => ({
//       ...f,
//       [field]: value,
//       ...(field === "clientId" ? { addressId: "" } : {}),
//     }));
//     setErrors(e => ({ ...e, [field]: undefined }));
//   };

//   const handleCheckbox = (option: NotificationOption) => {
//     setForm(f =>
//       f.notification.includes(option)
//         ? { ...f, notification: f.notification.filter(n => n !== option) }
//         : { ...f, notification: [...f.notification, option] }
//     );
//   };

//   const validate = () => {
//     const e: any = {};
//     if (!form.clientId) e.clientId = "Required";
//     if (!form.userId) e.userId = "Required";
//     if (!form.guardId) e.guardId = "Required";
//     if (!form.addressId) e.addressId = "Required";
//     if (!form.role) e.role = "Required";
//     if (!form.access) e.access = "Required";
//     if (!form.notification.length) e.notification = "Select at least one notification";
//     setErrors(e);
//     return Object.keys(e).length === 0;
//   };

//   const onSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validate()) return;
//     createAssignment.mutate({
//       userId: Number(form.userId),
//       guardId: Number(form.guardId),
//       clientId: Number(form.clientId),
//       addressId: Number(form.addressId),
//       role: form.role,
//       access: form.access,
//       notification: form.notification,
//     });
//     setForm(DEFAULT_FORM);
//   };

//   if (loadingClients || loadingUsers || loadingGuards || loadingAddresses) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
//       </div>
//     );
//   }

//   if (!clients || !users || !guards) {
//     return <div>Error fetching data.</div>;
//   }

//   return (
//     <>
//       <form
//         onSubmit={onSubmit}
//         className="w-full max-w-6xl mx-auto bg-white rounded-lg border border-gray-200 shadow-md p-2 sm:p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
//       >
//         {/* Client */}
//         <div>
//           <label className="block mb-1 text-sm font-semibold">Client</label>
//           <select
//             value={form.clientId}
//             onChange={e => handleChange("clientId", e.target.value)}
//             className={`w-full px-3 py-0.5 border border-gray-300 rounded-md text-sm ${form.clientId === "" ? "text-gray-400" : "text-gray-700"}`}
//           >
//             <option value="">Select Client</option>
//             {clients.map((c: any) => (
//               <option key={c.id} value={c.id}>
//                 {c.name}
//               </option>
//             ))}
//           </select>
//           {errors.clientId && <p className="text-red-500 text-xs mt-1">{errors.clientId}</p>}
//         </div>

//         {/* Address */}
//         <div>
//           <label className="block mb-1 text-sm font-semibold">Client Address</label>
//           <select
//             value={form.addressId}
//             onChange={e => handleChange("addressId", e.target.value)}
//             className={`w-full px-3 py-0.5 border border-gray-300 rounded-md text-sm ${form.addressId === "" ? "text-gray-400" : "text-gray-700"}`}
//             disabled={!form.clientId || !addresses}
//           >
//             <option value="">Select Address</option>
//             {addresses && addresses.map((a: any) => (
//               <option key={a.id} value={a.id}>
//                 {a.label ? `${a.label}, ` : ""}
//                 {a.address}, {a.city}
//               </option>
//             ))}
//           </select>
//           {errors.addressId && <p className="text-red-500 text-xs mt-1">{errors.addressId}</p>}
//         </div>

//         {/* User */}
//         <div>
//           <label className="block mb-1 text-sm font-semibold">User</label>
//           <select
//             value={form.userId}
//             onChange={e => handleChange("userId", e.target.value)}
//             className={`w-full px-3 py-0.5 border border-gray-300 rounded-md text-sm ${form.userId === "" ? "text-gray-400" : "text-gray-700"}`}
//           >
//             <option value="">Select User</option>
//             {users.map((u: any) => (
//               <option key={u.id} value={u.id}>{u.name}</option>
//             ))}
//           </select>
//           {errors.userId && <p className="text-red-500 text-xs mt-1">{errors.userId}</p>}
//         </div>

//         {/* Guard */}
//         <div>
//           <label className="block mb-1 text-sm font-semibold">Guard</label>
//           <select
//             value={form.guardId}
//             onChange={e => handleChange("guardId", e.target.value)}
//             className={`w-full px-3 py-0.5 border border-gray-300 rounded-md text-sm ${form.guardId === "" ? "text-gray-400" : "text-gray-700"}`}
//           >
//             <option value="">Select Guard</option>
//             {guards.map((g: any) => (
//               <option key={g.id} value={g.id}>{g.name}</option>
//             ))}
//           </select>
//           {errors.guardId && <p className="text-red-500 text-xs mt-1">{errors.guardId}</p>}
//         </div>

//         {/* Role */}
//         <div>
//           <label className="block mb-1 text-sm font-semibold">Role</label>
//           <select
//             value={form.role}
//             onChange={e => handleChange("role", e.target.value)}
//             className={`w-full px-3 py-0.5 border border-gray-300 rounded-md text-sm ${form.role === "" ? "text-gray-400" : "text-gray-700"}`}
//           >
//             <option value="">Select Role</option>
//             {["Admin", "Manager", "Guard", "Client"].map(r => (
//               <option key={r} value={r}>{r}</option>
//             ))}
//           </select>
//           {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
//         </div>

//         {/* Access */}
//         <div>
//           <label className="block mb-1 text-sm font-semibold">Access</label>
//           <select
//             value={form.access}
//             onChange={e => handleChange("access", e.target.value)}
//             className={`w-full px-3 py-0.5 border border-gray-300 rounded-md text-sm ${form.access === "" ? "text-gray-400" : "text-gray-700"}`}
//           >
//             <option value="">Select Access</option>
//             {["View", "Edit"].map(a => (
//               <option key={a} value={a}>{a}</option>
//             ))}
//           </select>
//           {errors.access && <p className="text-red-500 text-xs mt-1">{errors.access}</p>}
//         </div>

//         {/* Notifications */}
//         <div className="sm:col-span-2 lg:col-span-2 flex flex-col">
//           <label className="block mb-1 text-sm font-semibold">Notifications</label>
//           <div className="flex flex-wrap gap-4">
//             {notificationOptions.map(opt => (
//               <label key={opt} className="inline-flex items-center gap-2 text-sm">
//                 <input
//                   type="checkbox"
//                   checked={form.notification.includes(opt)}
//                   onChange={() => handleCheckbox(opt)}
//                 />
//                 {opt}
//               </label>
//             ))}
//           </div>
//           {errors.notification && <div className="text-red-600 text-xs">{errors.notification}</div>}
//         </div>

//         {/* Submit Button with Spinner */}
//         <div className="flex gap-3 pt-2 sm:pt-0 sm:col-span-2 lg:col-span-2 justify-end">
//           <button
//             type="submit"
//             disabled={createAssignment.isPending}
//             className="py-1.5 px-3 sm:px-4 rounded-md transition cursor-pointer w-auto flex items-center gap-1 border border-blue-600 bg-transparent text-blue-600 hover:bg-blue-50 h-9 text-sm font-sans"
//           >
//             {createAssignment.isPending ? (
//               <>
//                 <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
//                 Saving...
//               </>
//             ) : (
//               <>
//                 <Plus className="w-5 h-5" />
//                 Add
//               </>
//             )}
//           </button>
//         </div>
//       </form>
//       <div className="h-4">
//       <AssignmentHistory />
//       </div>
//     </>
//   );
// }
// import React, { useState } from "react";
// import { Plus } from "lucide-react";
// import { useUsers } from "../../hooks/useUsers";
// import { useGuards } from "../../hooks/useGuards";
// import { useAddressesByClient } from "../../hooks/useAddressesByClient";
// import { useCreateAssignment } from "../../hooks/userAssignment";
// import AssignmentHistory from "../../components/AssignmentReport";
// import { useDebounce } from "../../hooks/";
// import { useSearchClient } from "../../hooks/usesearchClient";

// const notificationOptions = [
//   "Geolocation",
//   "Time Clock",
//   "Weekly Hours",
//   "Scheduling",
// ] as const;

// type NotificationOption = (typeof notificationOptions)[number];

// const DEFAULT_FORM = {
//   userId: "",
//   guardId: "",
//   clientId: "",
//   addressId: "",
//   role: "",
//   access: "",
//   notification: [] as NotificationOption[],
// };

// export default function AssignmentForm() {
//   const { data: users, isLoading: loadingUsers } = useUsers();
//   const { data: guards, isLoading: loadingGuards } = useGuards();
//   const [form, setForm] = useState(DEFAULT_FORM);
//   const [clientSearch, setClientSearch] = useState("");
//   const debouncedSearch = useDebounce(clientSearch, 300);

//   const { data: clients, isLoading: loadingClients } = useSearchClient(debouncedSearch);

//   const clientIdNum = form.clientId ? Number(form.clientId) : 0;
//   const { data: addresses, isLoading: loadingAddresses } = useAddressesByClient(clientIdNum);

//   const createAssignment = useCreateAssignment();
//   const [errors, setErrors] = useState<{ [key: string]: string }>({});

//   const handleChange = (field: string, value: any) => {
//     setForm(f => ({
//       ...f,
//       [field]: value,
//       ...(field === "clientId" ? { addressId: "" } : {}),
//     }));
//     setErrors(e => ({ ...e, [field]: undefined }));
//   };

//   const handleCheckbox = (option: NotificationOption) => {
//     setForm(f =>
//       f.notification.includes(option)
//         ? { ...f, notification: f.notification.filter(n => n !== option) }
//         : { ...f, notification: [...f.notification, option] }
//     );
//   };

//   const validate = () => {
//     const e: any = {};
//     if (!form.clientId) e.clientId = "Required";
//     if (!form.userId) e.userId = "Required";
//     if (!form.guardId) e.guardId = "Required";
//     if (!form.addressId) e.addressId = "Required";
//     if (!form.role) e.role = "Required";
//     if (!form.access) e.access = "Required";
//     if (!form.notification.length) e.notification = "Select at least one notification";
//     setErrors(e);
//     return Object.keys(e).length === 0;
//   };

//   const onSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validate()) return;
//     createAssignment.mutate({
//       userId: Number(form.userId),
//       guardId: Number(form.guardId),
//       clientId: Number(form.clientId),
//       addressId: Number(form.addressId),
//       role: form.role,
//       access: form.access,
//       notification: form.notification,
//     });
//     setForm(DEFAULT_FORM);
//   };

//   if (loadingClients || loadingUsers || loadingGuards || loadingAddresses) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
//       </div>
//     );
//   }

//   if (!clients || !users || !guards) {
//     return <div>Error fetching data.</div>;
//   }

//   return (
//     <>
//       <form
//         onSubmit={onSubmit}
//         className="w-full max-w-6xl mx-auto bg-white rounded-lg border border-gray-200 shadow-md p-2 sm:p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
//       >
//         {/* Client Search Input */}
//         <div>
//           <label className="block mb-1 text-sm font-semibold">Search Client</label>
//           <input
//             type="text"
//             placeholder="Search by client name"
//             value={clientSearch}
//             onChange={e => setClientSearch(e.target.value)}
//             className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
//           />
//         </div>

//         {/* Client Select */}
//         <div>
//           <label className="block mb-1 text-sm font-semibold">Client</label>
//           <select
//             value={form.clientId}
//             onChange={e => handleChange("clientId", e.target.value)}
//             className={`w-full px-3 py-0.5 border border-gray-300 rounded-md text-sm ${form.clientId === "" ? "text-gray-400" : "text-gray-700"}`}
//           >
//             <option value="">Select Client</option>
//             {clients.map((c: any) => (
//               <option key={c.id} value={c.id}>
//                 {c.name}
//               </option>
//             ))}
//           </select>
//           {errors.clientId && <p className="text-red-500 text-xs mt-1">{errors.clientId}</p>}
//         </div>

//         {/* Keep other fields as-is */}
//         {/* ... Address, User, Guard, Role, Access, Notifications, Submit ... */}

//       </form>
//       <div className="h-4">
//         <AssignmentHistory />
//       </div>
//     </>
//   );
// }
// --------------------------------------------------------------------------------------------------*/
// AssignmentForm.tsx
// import React, { useState } from "react";
// import { Plus } from "lucide-react";
// import { useUsers } from "../../hooks/useUsers";
// import { useGuards } from "../../hooks/useGuards";
// import { useAddressesByClient } from "../../hooks/useAddressesByClient";
// import { useCreateAssignment } from "../../hooks/userAssignment";
// import AssignmentHistory from "../../components/AssignmentReport";
// import { useDebounce } from "../../hooks/useDebounce";
// import { useSearchClient } from "../../hooks/usesearchClient";

// const notificationOptions = [
//   "Geolocation",
//   "Time Clock",
//   "Weekly Hours",
//   "Scheduling",
// ] as const;

// type NotificationOption = (typeof notificationOptions)[number];

// const DEFAULT_FORM = {
//   userId: "",
//   guardId: "",
//   clientId: "",
//   addressId: "",
//   role: "",
//   access: "",
//   notification: [] as NotificationOption[],
// };

// export default function AssignmentForm() {
//   // ---- Debounced client search states
//   const [clientSearch, setClientSearch] = useState("");
//   const debouncedSearch = useDebounce(clientSearch, 300);
//   const {
//     data: searchedClients = [],
//     isLoading: loadingClients,
//   } = useSearchClient(debouncedSearch);

//   // ---- Other hooks
//   const { data: users, isLoading: loadingUsers } = useUsers();
//   const { data: guards, isLoading: loadingGuards } = useGuards();

//   const [form, setForm] = useState(DEFAULT_FORM);
//   const clientIdNum = form.clientId ? Number(form.clientId) : 0;
//   const { data: addresses, isLoading: loadingAddresses } = useAddressesByClient(clientIdNum);

//   const createAssignment = useCreateAssignment();
//   const [errors, setErrors] = useState<{ [key: string]: string }>({});

//   // Handles all regular selects/inputs
//   const handleChange = (field: string, value: any) => {
//     setForm(f => ({
//       ...f,
//       [field]: value,
//       ...(field === "clientId" ? { addressId: "" } : {}),
//     }));
//     setErrors(e => ({ ...e, [field]: undefined }));
//   };

//   // Notification checkbox logic
//   const handleCheckbox = (option: NotificationOption) => {
//     setForm(f =>
//       f.notification.includes(option)
//         ? { ...f, notification: f.notification.filter(n => n !== option) }
//         : { ...f, notification: [...f.notification, option] }
//     );
//   };

//   // Debounced client select action
//   const handleClientSelect = (client: { id: string | number; name: string }) => {
//     setForm(f => ({
//       ...f,
//       clientId: String(client.id),
//       addressId: "",
//     }));
//     setClientSearch(client.name);
//     setErrors(e => ({ ...e, clientId: undefined }));
//   };

//   // Validation
//   const validate = () => {
//     const e: any = {};
//     if (!form.clientId) e.clientId = "Required";
//     if (!form.userId) e.userId = "Required";
//     if (!form.guardId) e.guardId = "Required";
//     if (!form.addressId) e.addressId = "Required";
//     if (!form.role) e.role = "Required";
//     if (!form.access) e.access = "Required";
//     if (!form.notification.length) e.notification = "Select at least one notification";
//     setErrors(e);
//     return Object.keys(e).length === 0;
//   };

//   const onSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validate()) return;
//     createAssignment.mutate({
//       userId: Number(form.userId),
//       guardId: Number(form.guardId),
//       clientId: Number(form.clientId),
//       addressId: Number(form.addressId),
//       role: form.role,
//       access: form.access,
//       notification: form.notification,
//     });
//     setForm(DEFAULT_FORM);
//     setClientSearch(""); // Reset search box after submit
//   };

//   // Loading state
//   if (loadingClients || loadingUsers || loadingGuards || loadingAddresses) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
//       </div>
//     );
//   }

//   // Error state
//   if (!users || !guards) {
//     return <div>Error fetching data.</div>;
//   }

//   return (
//     <>
//       <form
//         onSubmit={onSubmit}
//         className="w-full max-w-6xl mx-auto bg-white rounded-lg border border-gray-200 shadow-md p-2 sm:p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
//       >
//         {/* Client search and dropdown */}
//         <div className="relative">
//           <label className="block mb-1 text-sm font-semibold">Client</label>
//           <input
//             type="text"
//             value={clientSearch}
//             onChange={e => {
//               setClientSearch(e.target.value);
//               setForm(f => ({ ...f, clientId: "", addressId: "" })); // clear client selection when typing
//             }}
//             placeholder="Type to search client..."
//             className="w-full px-3 py-0.5 border border-gray-300 rounded-md text-sm"
//           />
//           {clientSearch.length >= 3 && (
//             <div className="absolute left-0 right-0 bg-white border border-gray-300 z-10 rounded shadow mt-1 max-h-40 overflow-y-auto">
//               {loadingClients ? (
//                 <div className="p-2 text-gray-500 text-sm">Searching...</div>
//               ) : searchedClients.length === 0 ? (
//                 <div className="p-2 text-gray-500 text-sm">No results</div>
//               ) : (
//                 searchedClients.map((client: any) => (
//                   <div
//                     key={client.id}
//                     className={`p-2 hover:bg-blue-100 cursor-pointer text-sm ${
//                       form.clientId === client.id ? "bg-blue-200" : ""
//                     }`}
//                     onClick={() => handleClientSelect(client)}
//                   >
//                     {client.name}
//                   </div>
//                 ))
//               )}
//             </div>
//           )}
//           {errors.clientId && <p className="text-red-500 text-xs mt-1">{errors.clientId}</p>}
//         </div>

//         {/* Address select */}
//         <div>
//           <label className="block mb-1 text-sm font-semibold">Client Address</label>
//           <select
//             value={form.addressId}
//             onChange={e => handleChange("addressId", e.target.value)}
//             className={`w-full px-3 py-0.5 border border-gray-300 rounded-md text-sm ${
//               form.addressId === "" ? "text-gray-400" : "text-gray-700"
//             }`}
//             disabled={!form.clientId || !addresses}
//           >
//             <option value="">Select Address</option>
//             {addresses &&
//               addresses.map((a: any) => (
//                 <option key={a.id} value={a.id}>
//                   {a.label ? `${a.label}, ` : ""}
//                   {a.address}, {a.city}
//                 </option>
//               ))}
//           </select>
//           {errors.addressId && <p className="text-red-500 text-xs mt-1">{errors.addressId}</p>}
//         </div>

//         {/* User select */}
//         <div>
//           <label className="block mb-1 text-sm font-semibold">User</label>
//           <select
//             value={form.userId}
//             onChange={e => handleChange("userId", e.target.value)}
//             className={`w-full px-3 py-0.5 border border-gray-300 rounded-md text-sm ${
//               form.userId === "" ? "text-gray-400" : "text-gray-700"
//             }`}
//           >
//             <option value="">Select User</option>
//             {users.map((u: any) => (
//               <option key={u.id} value={u.id}>
//                 {u.name}
//               </option>
//             ))}
//           </select>
//           {errors.userId && <p className="text-red-500 text-xs mt-1">{errors.userId}</p>}
//         </div>

//         {/* Guard select */}
//         <div>
//           <label className="block mb-1 text-sm font-semibold">Guard</label>
//           <select
//             value={form.guardId}
//             onChange={e => handleChange("guardId", e.target.value)}
//             className={`w-full px-3 py-0.5 border border-gray-300 rounded-md text-sm ${
//               form.guardId === "" ? "text-gray-400" : "text-gray-700"
//             }`}
//           >
//             <option value="">Select Guard</option>
//             {guards.map((g: any) => (
//               <option key={g.id} value={g.id}>
//                 {g.name}
//               </option>
//             ))}
//           </select>
//           {errors.guardId && <p className="text-red-500 text-xs mt-1">{errors.guardId}</p>}
//         </div>

//         {/* Role select */}
//         <div>
//           <label className="block mb-1 text-sm font-semibold">Role</label>
//           <select
//             value={form.role}
//             onChange={e => handleChange("role", e.target.value)}
//             className={`w-full px-3 py-0.5 border border-gray-300 rounded-md text-sm ${
//               form.role === "" ? "text-gray-400" : "text-gray-700"
//             }`}
//           >
//             <option value="">Select Role</option>
//             {["Admin", "Manager", "Guard", "Client"].map(r => (
//               <option key={r} value={r}>
//                 {r}
//               </option>
//             ))}
//           </select>
//           {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
//         </div>

//         {/* Access select */}
//         <div>
//           <label className="block mb-1 text-sm font-semibold">Access</label>
//           <select
//             value={form.access}
//             onChange={e => handleChange("access", e.target.value)}
//             className={`w-full px-3 py-0.5 border border-gray-300 rounded-md text-sm ${
//               form.access === "" ? "text-gray-400" : "text-gray-700"
//             }`}
//           >
//             <option value="">Select Access</option>
//             {["View", "Edit"].map(a => (
//               <option key={a} value={a}>
//                 {a}
//               </option>
//             ))}
//           </select>
//           {errors.access && <p className="text-red-500 text-xs mt-1">{errors.access}</p>}
//         </div>

//         {/* Notifications */}
//         <div className="sm:col-span-2 lg:col-span-2 flex flex-col">
//           <label className="block mb-1 text-sm font-semibold">Notifications</label>
//           <div className="flex flex-wrap gap-4">
//             {notificationOptions.map(opt => (
//               <label key={opt} className="inline-flex items-center gap-2 text-sm">
//                 <input
//                   type="checkbox"
//                   checked={form.notification.includes(opt)}
//                   onChange={() => handleCheckbox(opt)}
//                 />
//                 {opt}
//               </label>
//             ))}
//           </div>
//           {errors.notification && <div className="text-red-600 text-xs">{errors.notification}</div>}
//         </div>

//         {/* Submit Button with Spinner */}
//         <div className="flex gap-3 pt-2 sm:pt-0 sm:col-span-2 lg:col-span-2 justify-end">
//           <button
//             type="submit"
//             disabled={createAssignment.isPending}
//             className="py-1.5 px-3 sm:px-4 rounded-md transition cursor-pointer w-auto flex items-center gap-1 border border-blue-600 bg-transparent text-blue-600 hover:bg-blue-50 h-9 text-sm font-sans"
//           >
//             {createAssignment.isPending ? (
//               <>
//                 <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
//                 Saving...
//               </>
//             ) : (
//               <>
//                 <Plus className="w-5 h-5" />
//                 Add
//               </>
//             )}
//           </button>
//         </div>
//       </form>
//       <div className="h-4">
//         <AssignmentHistory />
//       </div>
//     </>
//   );
// }
// import React, { useState } from "react";
// import { Plus, X, Search as SearchIcon, Loader2 } from "lucide-react";
// import { useUsers } from "../../hooks/useUsers";
// import { useGuards } from "../../hooks/useGuards";
// import { useAddressesByClient } from "../../hooks/useAddressesByClient";
// import { useCreateAssignment } from "../../hooks/userAssignment";
// import AssignmentHistory from "../../components/AssignmentReport";
// import { useDebounce } from "../../hooks/useDebounce";
// import { useSearchClient } from "../../hooks/usesearchClient";

// const notificationOptions = [
//   "Geolocation",
//   "Time Clock",
//   "Weekly Hours",
//   "Scheduling",
// ] as const;

// type NotificationOption = (typeof notificationOptions)[number];

// const DEFAULT_FORM = {
//   userId: "",
//   guardId: "",
//   clientId: "",
//   addressId: "",
//   role: "",
//   access: "",
//   notification: [] as NotificationOption[],
// };

// export default function AssignmentForm() {
//   // ---- Debounced client search states
//   const [clientSearch, setClientSearch] = useState("");
//   const debouncedSearch = useDebounce(clientSearch, 300);
//   const {
//     data: searchedClients = [],
//     isLoading: loadingClients,
//   } = useSearchClient(debouncedSearch);

//   // ---- Other hooks
//   const { data: users, isLoading: loadingUsers } = useUsers();
//   const { data: guards, isLoading: loadingGuards } = useGuards();

//   const [form, setForm] = useState(DEFAULT_FORM);
//   const clientIdNum = form.clientId ? Number(form.clientId) : 0;
//   const { data: addresses, isLoading: loadingAddresses } = useAddressesByClient(clientIdNum);

//   const createAssignment = useCreateAssignment();
//   const [errors, setErrors] = useState<{ [key: string]: string }>({});
//   const [showClientDropdown, setShowClientDropdown] = useState(false);
//   const [clientDropdownActiveIdx, setClientDropdownActiveIdx] = useState<number>(-1);

//   // Handles all regular selects/inputs
//   const handleChange = (field: string, value: any) => {
//     setForm(f => ({
//       ...f,
//       [field]: value,
//       ...(field === "clientId" ? { addressId: "" } : {}),
//     }));
//     setErrors(e => ({ ...e, [field]: undefined }));
//   };

//   // Notification checkbox logic
//   const handleCheckbox = (option: NotificationOption) => {
//     setForm(f =>
//       f.notification.includes(option)
//         ? { ...f, notification: f.notification.filter(n => n !== option) }
//         : { ...f, notification: [...f.notification, option] }
//     );
//   };

//   // Debounced client select action
//   const handleClientSelect = (client: { id: string | number; name: string }) => {
//     setForm(f => ({
//       ...f,
//       clientId: String(client.id),
//       addressId: "",
//     }));
//     setClientSearch(client.name);
//     setShowClientDropdown(false);
//     setClientDropdownActiveIdx(-1);
//     setErrors(e => ({ ...e, clientId: undefined }));
//   };

//   const clearClientSearch = () => {
//     setClientSearch("");
//     setShowClientDropdown(false);
//     setForm(f => ({ ...f, clientId: "", addressId: "" }));
//     setErrors(e => ({ ...e, clientId: undefined }));
//   };

//   // Validation
//   const validate = () => {
//     const e: any = {};
//     if (!form.clientId) e.clientId = "Required";
//     if (!form.userId) e.userId = "Required";
//     if (!form.guardId) e.guardId = "Required";
//     if (!form.addressId) e.addressId = "Required";
//     if (!form.role) e.role = "Required";
//     if (!form.access) e.access = "Required";
//     if (!form.notification.length) e.notification = "Select at least one notification";
//     setErrors(e);
//     return Object.keys(e).length === 0;
//   };

//   const onSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validate()) return;
//     createAssignment.mutate({
//       userId: Number(form.userId),
//       guardId: Number(form.guardId),
//       clientId: Number(form.clientId),
//       addressId: Number(form.addressId),
//       role: form.role,
//       access: form.access,
//       notification: form.notification,
//     });
//     setForm(DEFAULT_FORM);
//     setClientSearch(""); // Reset search box after submit
//   };

//   // Loading state
//   if (loadingClients || loadingUsers || loadingGuards || loadingAddresses) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
//       </div>
//     );
//   }

//   // Error state
//   if (!users || !guards) {
//     return <div className="p-8 text-center text-red-600">Error fetching data.</div>;
//   }

//   return (
//     <>
//       <form
//         onSubmit={onSubmit}
//         className="w-full max-w-6xl mx-auto bg-white rounded-xl border border-gray-200 shadow-md p-3 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
//         autoComplete="off"
//       >
//         {/* Client search and dropdown */}
//         <div className="relative">
//           <label className="block mb-1 text-sm font-semibold text-gray-700">Client</label>
//           <div className="relative group">
//             <span className="absolute top-0.5 left-2 z-10">
//               <SearchIcon className="w-4 h-4 text-gray-400" />
//             </span>
//             <input
//               type="text"
//               value={clientSearch}
//               onFocus={() => setShowClientDropdown(true)}
//               onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
//               onChange={e => {
//                 setClientSearch(e.target.value);
//                 setShowClientDropdown(true);
//                 setForm(f => ({ ...f, clientId: "", addressId: "" }));
//               }}
//               placeholder="Search client..."
//               className={`w-full px-8 py-2 border rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-100 transition text-sm ${
//                 errors.clientId ? "border-red-400" : "border-gray-300"
//               }`}
//               aria-autocomplete="list"
//               aria-activedescendant={
//                 clientDropdownActiveIdx >= 0
//                   ? `client-search-item-${clientDropdownActiveIdx}`
//                   : undefined
//               }
//               aria-controls="client-search-dropdown"
//               aria-haspopup="listbox"
//               onKeyDown={e => {
//                 if (showClientDropdown && searchedClients.length > 0) {
//                   if (e.key === "ArrowDown") {
//                     e.preventDefault();
//                     setClientDropdownActiveIdx(prev =>
//                       prev === searchedClients.length - 1 ? 0 : prev + 1
//                     );
//                   } else if (e.key === "ArrowUp") {
//                     e.preventDefault();
//                     setClientDropdownActiveIdx(prev =>
//                       prev <= 0 ? searchedClients.length - 1 : prev - 1
//                     );
//                   } else if (e.key === "Enter" && clientDropdownActiveIdx >= 0) {
//                     handleClientSelect(searchedClients[clientDropdownActiveIdx]);
//                   }
//                 }
//               }}
//             />
//             {clientSearch && (
//               <button
//                 type="button"
//                 className="absolute right-2 top-0.5 text-gray-400 hover:text-gray-700 transition"
//                 onClick={clearClientSearch}
//                 tabIndex={-1}
//                 aria-label="Clear"
//               >
//                 <X className="w-4 h-4" />
//               </button>
//             )}
//             {/* Dropdown */}
//             {showClientDropdown && clientSearch.length >= 3 && (
//               <div
//                 className="absolute left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto z-50 animate-fade-in"
//                 id="client-search-dropdown"
//                 role="listbox"
//               >
//                 {loadingClients ? (
//                   <div className="p-2 flex items-center gap-2 text-sm text-gray-500">
//                     <Loader2 className="w-4 h-4 animate-spin" />
//                     Searching...
//                   </div>
//                 ) : searchedClients.length === 0 ? (
//                   <div className="p-2 text-gray-500 text-sm">No results</div>
//                 ) : (
//                   searchedClients.map((client: any, idx: number) => (
//                     <div
//                       key={client.id}
//                       id={`client-search-item-${idx}`}
//                       className={`p-2 cursor-pointer text-sm transition
//                         ${
//                           form.clientId === String(client.id)
//                             ? "bg-blue-100 text-blue-700 font-semibold"
//                             : idx === clientDropdownActiveIdx
//                             ? "bg-blue-50"
//                             : "hover:bg-blue-50"
//                         }`}
//                       role="option"
//                       aria-selected={form.clientId === String(client.id)}
//                       onClick={() => handleClientSelect(client)}
//                       onMouseEnter={() => setClientDropdownActiveIdx(idx)}
//                     >
//                       {client.name}
//                     </div>
//                   ))
//                 )}
//               </div>
//             )}
//           </div>
//           {errors.clientId && (
//             <p className="text-red-500 text-xs mt-1">{errors.clientId}</p>
//           )}
//         </div>

//         {/* Address select */}
//         <div>
//           <label className="block mb-1 text-sm font-semibold text-gray-700">Client Address</label>
//           <select
//             value={form.addressId}
//             onChange={e => handleChange("addressId", e.target.value)}
//             className={`w-full px-3 py-2 border rounded-md focus:border-blue-500 focus:ring focus:ring-blue-100 transition text-sm ${
//               form.addressId === "" ? "text-gray-400" : "text-gray-800"
//             }`}
//             disabled={!form.clientId || !addresses}
//           >
//             <option value="">Select Address</option>
//             {addresses &&
//               addresses.map((a: any) => (
//                 <option key={a.id} value={a.id}>
//                   {a.label ? `${a.label}, ` : ""}
//                   {a.address}, {a.city}
//                 </option>
//               ))}
//           </select>
//           {errors.addressId && (
//             <p className="text-red-500 text-xs mt-1">{errors.addressId}</p>
//           )}
//         </div>

//         {/* User select */}
//         <div>
//           <label className="block mb-1 text-sm font-semibold text-gray-700">User</label>
//           <select
//             value={form.userId}
//             onChange={e => handleChange("userId", e.target.value)}
//             className={`w-full px-3 py-2 border rounded-md focus:border-blue-500 focus:ring focus:ring-blue-100 transition text-sm ${
//               form.userId === "" ? "text-gray-400" : "text-gray-800"
//             }`}
//           >
//             <option value="">Select User</option>
//             {users.map((u: any) => (
//               <option key={u.id} value={u.id}>
//                 {u.name}
//               </option>
//             ))}
//           </select>
//           {errors.userId && <p className="text-red-500 text-xs mt-1">{errors.userId}</p>}
//         </div>

//         {/* Guard select */}
//         <div>
//           <label className="block mb-1 text-sm font-semibold text-gray-700">Guard</label>
//           <select
//             value={form.guardId}
//             onChange={e => handleChange("guardId", e.target.value)}
//             className={`w-full px-3 py-2 border rounded-md focus:border-blue-500 focus:ring focus:ring-blue-100 transition text-sm ${
//               form.guardId === "" ? "text-gray-400" : "text-gray-800"
//             }`}
//           >
//             <option value="">Select Guard</option>
//             {guards.map((g: any) => (
//               <option key={g.id} value={g.id}>
//                 {g.name}
//               </option>
//             ))}
//           </select>
//           {errors.guardId && <p className="text-red-500 text-xs mt-1">{errors.guardId}</p>}
//         </div>

//         {/* Role select */}
//         <div>
//           <label className="block mb-1 text-sm font-semibold text-gray-700">Role</label>
//           <select
//             value={form.role}
//             onChange={e => handleChange("role", e.target.value)}
//             className={`w-full px-3 py-2 border rounded-md focus:border-blue-500 focus:ring focus:ring-blue-100 transition text-sm ${
//               form.role === "" ? "text-gray-400" : "text-gray-800"
//             }`}
//           >
//             <option value="">Select Role</option>
//             {["Admin", "Manager", "Guard", "Client"].map(r => (
//               <option key={r} value={r}>
//                 {r}
//               </option>
//             ))}
//           </select>
//           {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
//         </div>

//         {/* Access select */}
//         <div>
//           <label className="block mb-1 text-sm font-semibold text-gray-700">Access</label>
//           <select
//             value={form.access}
//             onChange={e => handleChange("access", e.target.value)}
//             className={`w-full px-3 py-2 border rounded-md focus:border-blue-500 focus:ring focus:ring-blue-100 transition text-sm ${
//               form.access === "" ? "text-gray-400" : "text-gray-800"
//             }`}
//           >
//             <option value="">Select Access</option>
//             {["View", "Edit"].map(a => (
//               <option key={a} value={a}>
//                 {a}
//               </option>
//             ))}
//           </select>
//           {errors.access && <p className="text-red-500 text-xs mt-1">{errors.access}</p>}
//         </div>

//         {/* Notifications */}
//         <div className="sm:col-span-2 lg:col-span-2 flex flex-col">
//           <label className="block mb-1 text-sm font-semibold text-gray-700">Notifications</label>
//           <div className="flex flex-wrap gap-4">
//             {notificationOptions.map(opt => (
//               <label key={opt} className="inline-flex items-center gap-2 text-sm">
//                 <input
//                   type="checkbox"
//                   className="accent-blue-600 rounded"
//                   checked={form.notification.includes(opt)}
//                   onChange={() => handleCheckbox(opt)}
//                 />
//                 {opt}
//               </label>
//             ))}
//           </div>
//           {errors.notification && (
//             <div className="text-red-600 text-xs mt-1">{errors.notification}</div>
//           )}
//         </div>

//         {/* Submit Button with Spinner */}
//         <div className="flex gap-3 pt-2 sm:pt-0 sm:col-span-2 lg:col-span-2 justify-end">
//           <button
//             type="submit"
//             disabled={createAssignment.isPending}
//             className={`py-2 px-4 rounded-md transition gap-2 w-full sm:w-auto flex justify-center items-center border text-white font-semibold shadow
//               ${createAssignment.isPending
//                 ? "bg-blue-200 cursor-not-allowed"
//                 : "bg-blue-600 hover:bg-blue-700 border-blue-700"
//               }`}
//           >
//             {createAssignment.isPending ? (
//               <>
//                 <Loader2 className="w-5 h-5 animate-spin" />
//                 Saving...
//               </>
//             ) : (
//               <>
//                 <Plus className="w-5 h-5" />
//                 Add Assignment
//               </>
//             )}
//           </button>
//         </div>
//       </form>
//       <div className="h-6" />
//       <AssignmentHistory />
//     </>
//   );
// }
// finallll-------------------
// import React, { useState } from "react";
// import { Plus, X, Search as SearchIcon, Loader2, ChevronDown } from "lucide-react";
// import { useUsers } from "../../hooks/useUsers";
// import { useGuards } from "../../hooks/useGuards";
// import { useAddressesByClient } from "../../hooks/useAddressesByClient";
// import { useCreateAssignment } from "../../hooks/userAssignment";
// import AssignmentHistory from "../../components/AssignmentReport";
// import { useDebounce } from "../../hooks/useDebounce";
// import { useSearchClient } from "../../hooks/usesearchClient";

// const notificationOptions = [
//   "Geolocation",
//   "Time Clock",
//   "Weekly Hours",
//   "Scheduling",
// ] as const;

// type NotificationOption = (typeof notificationOptions)[number];

// const DEFAULT_FORM = {
//   userId: "",
//   guardId: "",
//   clientId: "",
//   addressId: "",
//   role: "",
//   access: "",
//   notification: [] as NotificationOption[],
// };

// export default function AssignmentForm() {
//   // Debounced client search states
//   const [clientSearch, setClientSearch] = useState("");
//   const debouncedSearch = useDebounce(clientSearch, 300);
//   const {
//     data: searchedClients = [],
//     isLoading: loadingClients,
//   } = useSearchClient(debouncedSearch);

//   // Other hooks
//   const { data: users, isLoading: loadingUsers } = useUsers();
//   const { data: guards, isLoading: loadingGuards } = useGuards();

//   const [form, setForm] = useState(DEFAULT_FORM);
//   const clientIdNum = form.clientId ? Number(form.clientId) : 0;
//   const { data: addresses, isLoading: loadingAddresses } = useAddressesByClient(clientIdNum);

//   const createAssignment = useCreateAssignment();
//   const [errors, setErrors] = useState<{ [key: string]: string }>({});
//   const [showClientDropdown, setShowClientDropdown] = useState(false);
//   const [clientDropdownActiveIdx, setClientDropdownActiveIdx] = useState<number>(-1);
//   const [notifOpen, setNotifOpen] = useState(false);

//   // Handles all regular selects/inputs
//   const handleChange = (field: string, value: any) => {
//     setForm(f => ({
//       ...f,
//       [field]: value,
//       ...(field === "clientId" ? { addressId: "" } : {}),
//     }));
//     setErrors(e => ({ ...e, [field]: undefined }));
//   };

//   // Notification checkbox logic
//   const handleCheckbox = (option: NotificationOption) => {
//     setForm(f =>
//       f.notification.includes(option)
//         ? { ...f, notification: f.notification.filter(n => n !== option) }
//         : { ...f, notification: [...f.notification, option] }
//     );
//   };

//   // Debounced client select action
//   const handleClientSelect = (client: { id: string | number; name: string }) => {
//     setForm(f => ({
//       ...f,
//       clientId: String(client.id),
//       addressId: "",
//     }));
//     setClientSearch(client.name);
//     setShowClientDropdown(false);
//     setClientDropdownActiveIdx(-1);
//     setErrors(e => ({ ...e, clientId: undefined }));
//   };

//   const clearClientSearch = () => {
//     setClientSearch("");
//     setShowClientDropdown(false);
//     setForm(f => ({ ...f, clientId: "", addressId: "" }));
//     setErrors(e => ({ ...e, clientId: undefined }));
//   };

//   // Validation
//   const validate = () => {
//     const e: any = {};
//     if (!form.clientId) e.clientId = "Required";
//     if (!form.userId) e.userId = "Required";
//     if (!form.guardId) e.guardId = "Required";
//     if (!form.addressId) e.addressId = "Required";
//     if (!form.role) e.role = "Required";
//     if (!form.access) e.access = "Required";
//     if (!form.notification.length) e.notification = "Select at least one notification";
//     setErrors(e);
//     return Object.keys(e).length === 0;
//   };

//   const onSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validate()) return;
//     createAssignment.mutate({
//       userId: Number(form.userId),
//       guardId: Number(form.guardId),
//       clientId: Number(form.clientId),
//       addressId: Number(form.addressId),
//       role: form.role,
//       access: form.access,
//       notification: form.notification,
//     });
//     setForm(DEFAULT_FORM);
//     setClientSearch(""); // Reset search box after submit
//   };

//   // Global loader only for initial page-critical data
//   if (loadingUsers || loadingGuards || loadingAddresses) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-50">
//         <div className="text-center">
//           <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
//           <p className="text-gray-600">Loading assignment form...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!users || !guards) {
//     return (
//       <div className="min-h-screen bg-gray-50 p-6">
//         <div className="max-w-7xl mx-auto">
//           <div className="bg-white border border-gray-200 shadow-sm p-8 text-center">
//             <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
//             <p className="text-gray-600">Unable to fetch required data. Please try again.</p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 p-6">
//       <div className="max-w-7xl mx-auto">
        
//         {/* Header */}
//         <div className="mb-8">
//           <h1 className="text-3xl font-normal text-gray-800 mb-6">
//             Assign User Permissions
//           </h1>
          
//           {/* Form Section */}
//           <div className="bg-white border border-gray-200 shadow-sm mb-8">
//             <div className="p-6">
//               <form onSubmit={onSubmit} autoComplete="off">
//                 <div className="grid grid-cols-4 gap-4 mb-6">
                  
//                   {/* Client search and dropdown */}
//                   <div className="relative">
//                     <div className="relative">
//                       <input
//                         type="text"
//                         value={clientSearch}
//                         onFocus={() => setShowClientDropdown(true)}
//                         onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
//                         onChange={e => {
//                           setClientSearch(e.target.value);
//                           setShowClientDropdown(true);
//                           setForm(f => ({ ...f, clientId: "", addressId: "" }));
//                         }}
//                         placeholder="Select Client *"
//                         className={`w-full px-3 py-2 border bg-white text-gray-700 focus:outline-none focus:border-gray-400 pr-8
//                           ${errors.clientId ? 'border-red-300' : 'border-gray-300'}`}
//                         aria-autocomplete="list"
//                         aria-activedescendant={
//                           clientDropdownActiveIdx >= 0
//                             ? `client-search-item-${clientDropdownActiveIdx}`
//                             : undefined
//                         }
//                         aria-controls="client-search-dropdown"
//                         aria-haspopup="listbox"
//                         onKeyDown={e => {
//                           if (showClientDropdown && searchedClients.length > 0) {
//                             if (e.key === "ArrowDown") {
//                               e.preventDefault();
//                               setClientDropdownActiveIdx(prev =>
//                                 prev === searchedClients.length - 1 ? 0 : prev + 1
//                               );
//                             } else if (e.key === "ArrowUp") {
//                               e.preventDefault();
//                               setClientDropdownActiveIdx(prev =>
//                                 prev <= 0 ? searchedClients.length - 1 : prev - 1
//                               );
//                             } else if (e.key === "Enter" && clientDropdownActiveIdx >= 0) {
//                               handleClientSelect(searchedClients[clientDropdownActiveIdx]);
//                             }
//                           }
//                         }}
//                       />
//                       <SearchIcon className="absolute right-8 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
//                       {clientSearch && (
//                         <button
//                           type="button"
//                           className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
//                           onClick={clearClientSearch}
//                           tabIndex={-1}
//                           aria-label="Clear"
//                         >
//                           <X className="w-4 h-4" />
//                         </button>
//                       )}
//                       {/* Dropdown */}
//                       {showClientDropdown && clientSearch.length >= 3 && (
//                         <div
//                           className="absolute left-0 right-0 mt-1 bg-white border border-gray-300 shadow-lg max-h-48 overflow-y-auto z-50"
//                           id="client-search-dropdown"
//                           role="listbox"
//                         >
//                           {loadingClients ? (
//                             <div className="p-2 flex items-center gap-2 text-sm text-gray-500">
//                               <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
//                               Searching clients...
//                             </div>
//                           ) : searchedClients.length === 0 ? (
//                             <div className="p-2 text-gray-500 text-sm">
//                               No clients found matching "{clientSearch}"
//                             </div>
//                           ) : (
//                             searchedClients.map((client: any, idx: number) => (
//                               <div
//                                 key={client.id}
//                                 id={`client-search-item-${idx}`}
//                                 className={`p-2 cursor-pointer text-sm transition
//                                   ${
//                                     form.clientId === String(client.id)
//                                       ? "bg-blue-100 text-blue-700 font-semibold"
//                                       : idx === clientDropdownActiveIdx
//                                       ? "bg-blue-50"
//                                       : "hover:bg-blue-50"
//                                   }`}
//                                 role="option"
//                                 aria-selected={form.clientId === String(client.id)}
//                                 onClick={() => handleClientSelect(client)}
//                                 onMouseEnter={() => setClientDropdownActiveIdx(idx)}
//                               >
//                                 {client.name}
//                               </div>
//                             ))
//                           )}
//                         </div>
//                       )}
//                     </div>
//                     {errors.clientId && (
//                       <p className="text-red-500 text-xs mt-1">{errors.clientId}</p>
//                     )}
//                   </div>

//                   {/* Address select */}
//                   <div className="relative">
//                     <select
//                       value={form.addressId}
//                       onChange={e => handleChange("addressId", e.target.value)}
//                       className={`w-full px-3 py-2 border bg-white text-gray-700 focus:outline-none focus:border-gray-400 appearance-none
//                         ${!form.clientId || !addresses ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}
//                         ${errors.addressId ? 'border-red-300' : 'border-gray-300'}`}
//                       disabled={!form.clientId || !addresses}
//                     >
//                       <option value="">Select Address *</option>
//                       {addresses &&
//                         addresses.map((a: any) => (
//                           <option key={a.id} value={a.id}>
//                             {a.label ? `${a.label}, ` : ""}
//                             {a.address}, {a.city}
//                           </option>
//                         ))}
//                     </select>
//                     <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
//                     {errors.addressId && (
//                       <p className="text-red-500 text-xs mt-1">{errors.addressId}</p>
//                     )}
//                   </div>

//                   {/* User select */}
//                   <div className="relative">
//                     <select
//                       value={form.userId}
//                       onChange={e => handleChange("userId", e.target.value)}
//                       className={`w-full px-3 py-2 border bg-white text-gray-700 focus:outline-none focus:border-gray-400 appearance-none
//                         ${errors.userId ? 'border-red-300' : 'border-gray-300'}`}
//                     >
//                       <option value="">Select User *</option>
//                       {users.map((u: any) => (
//                         <option key={u.id} value={u.id}>
//                           {u.name}
//                         </option>
//                       ))}
//                     </select>
//                     <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
//                     {errors.userId && <p className="text-red-500 text-xs mt-1">{errors.userId}</p>}
//                   </div>

//                   {/* Guard select */}
//                   <div className="relative">
//                     <select
//                       value={form.guardId}
//                       onChange={e => handleChange("guardId", e.target.value)}
//                       className={`w-full px-3 py-2 border bg-white text-gray-700 focus:outline-none focus:border-gray-400 appearance-none
//                         ${errors.guardId ? 'border-red-300' : 'border-gray-300'}`}
//                     >
//                       <option value="">Select Guard *</option>
//                       {guards.map((g: any) => (
//                         <option key={g.id} value={g.id}>
//                           {g.name}
//                         </option>
//                       ))}
//                     </select>
//                     <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
//                     {errors.guardId && <p className="text-red-500 text-xs mt-1">{errors.guardId}</p>}
//                   </div>

//                   {/* Role select */}
//                   <div className="relative">
//                     <select
//                       value={form.role}
//                       onChange={e => handleChange("role", e.target.value)}
//                       className={`w-full px-3 py-2 border bg-white text-gray-700 focus:outline-none focus:border-gray-400 appearance-none
//                         ${errors.role ? 'border-red-300' : 'border-gray-300'}`}
//                     >
//                       <option value="">Select Role *</option>
//                       {["Admin", "Manager", "Guard", "Client"].map(r => (
//                         <option key={r} value={r}>
//                           {r}
//                         </option>
//                       ))}
//                     </select>
//                     <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
//                     {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
//                   </div>

//                   {/* Access select */}
//                   <div className="relative">
//                     <select
//                       value={form.access}
//                       onChange={e => handleChange("access", e.target.value)}
//                       className={`w-full px-3 py-2 border bg-white text-gray-700 focus:outline-none focus:border-gray-400 appearance-none
//                         ${errors.access ? 'border-red-300' : 'border-gray-300'}`}
//                     >
//                       <option value="">Select Access *</option>
//                       {["View", "Edit"].map(a => (
//                         <option key={a} value={a}>
//                           {a}
//                         </option>
//                       ))}
//                     </select>
//                     <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
//                     {errors.access && <p className="text-red-500 text-xs mt-1">{errors.access}</p>}
//                   </div>

//                   {/* Notifications Multi-select */}
//                   <div className="relative">
//                     <button
//                       type="button"
//                       onClick={() => setNotifOpen(!notifOpen)}
//                       className={`w-full px-3 py-2 border bg-white text-gray-700 text-left focus:outline-none focus:border-gray-400
//                         ${errors.notification ? 'border-red-300' : 'border-gray-300'}`}
//                     >
//                       {form.notification.length > 0 
//                         ? form.notification.join(", ") 
//                         : "Select Notifications *"
//                       }
//                     </button>
//                     <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    
//                     {notifOpen && (
//                       <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 shadow-lg max-h-48 overflow-auto">
//                         {notificationOptions.map((opt) => (
//                           <label
//                             key={opt}
//                             className="flex items-center px-3 py-2 hover:bg-gray-50 text-sm cursor-pointer"
//                           >
//                             <input
//                               type="checkbox"
//                               className="mr-2"
//                               checked={form.notification.includes(opt)}
//                               onChange={() => handleCheckbox(opt)}
//                             />
//                             {opt}
//                           </label>
//                         ))}
//                       </div>
//                     )}
//                     {errors.notification && <p className="text-red-500 text-xs mt-1">{errors.notification}</p>}
//                   </div>

//                   {/* Submit Button */}
//                   <div className="flex items-end">
//                     <button
//                       type="submit"
//                       disabled={createAssignment.isPending}
//                       className={`flex items-center px-4 py-2 text-sm font-medium transition-colors
//                         ${createAssignment.isPending
//                           ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
//                           : 'bg-blue-600 text-white hover:bg-blue-700'
//                         }`}
//                     >
//                       {createAssignment.isPending ? (
//                         <>
//                           <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
//                           Creating...
//                         </>
//                       ) : (
//                         <>
//                           <Plus className="w-4 h-4 mr-2" />
//                           Add Assignment
//                         </>
//                       )}
//                     </button>
//                   </div>

//                 </div>
//               </form>
//             </div>
//           </div>
//         </div>

//         {/* Assignment History */}
//         <div className="mt-8">
//           <AssignmentHistory />
//         </div>
//       </div>
//     </div>
//   );
// }

//------------------------------------------------------------------------------------------
//-----------------------finalizeeeee----------------------------
// import React, { useState } from "react";
// import { Plus, X, Search as SearchIcon } from "lucide-react";
// import { useUsers } from "../../hooks/useUsers";
// import { useGuards } from "../../hooks/useGuards";
// import { useAddressesByClient } from "../../hooks/useAddressesByClient";
// import { useCreateAssignment } from "../../hooks/userAssignment";
// import AssignmentHistory from "../../components/AssignmentReport";
// import { useDebounce } from "../../hooks/useDebounce";
// import { useSearchClient } from "../../hooks/usesearchClient";

// const notificationOptions = [
//   "Geolocation",
//   "Time Clock",
//   "Weekly Hours",
//   "Scheduling",
// ] as const;

// type NotificationOption = (typeof notificationOptions)[number];

// const DEFAULT_FORM = {
//   userId: "",
//   guardId: "",
//   clientId: "",
//   addressId: "",
//   role: "",
//   access: "",
//   notification: [] as NotificationOption[],
// };

// export default function AssignmentForm() {
//   // Debounced client search states
//   const [clientSearch, setClientSearch] = useState("");
//   const debouncedSearch = useDebounce(clientSearch, 300);
//   const {
//     data: searchedClients = [],
//     isLoading: loadingClients,
//   } = useSearchClient(debouncedSearch);

//   // Other hooks
//   const { data: users, isLoading: loadingUsers } = useUsers();
//   const { data: guards, isLoading: loadingGuards } = useGuards();

//   const [form, setForm] = useState(DEFAULT_FORM);
//   const clientIdNum = form.clientId ? Number(form.clientId) : 0;
//   const { data: addresses, isLoading: loadingAddresses } = useAddressesByClient(clientIdNum);

//   const createAssignment = useCreateAssignment();
//   const [errors, setErrors] = useState<{ [key: string]: string }>({});
//   const [showClientDropdown, setShowClientDropdown] = useState(false);
//   const [clientDropdownActiveIdx, setClientDropdownActiveIdx] = useState<number>(-1);
//   const [notifOpen, setNotifOpen] = useState(false);

//   // Handles all regular selects/inputs
//   const handleChange = (field: string, value: any) => {
//     setForm(f => ({
//       ...f,
//       [field]: value,
//       ...(field === "clientId" ? { addressId: "" } : {}),
//     }));
//     setErrors(e => ({ ...e, [field]: undefined }));
//   };

//   // Notification checkbox logic
//   const handleCheckbox = (option: NotificationOption) => {
//     setForm(f =>
//       f.notification.includes(option)
//         ? { ...f, notification: f.notification.filter(n => n !== option) }
//         : { ...f, notification: [...f.notification, option] }
//     );
//   };

//   // Debounced client select action
//   const handleClientSelect = (client: { id: string | number; name: string }) => {
//     setForm(f => ({
//       ...f,
//       clientId: String(client.id),
//       addressId: "",
//     }));
//     setClientSearch(client.name);
//     setShowClientDropdown(false);
//     setClientDropdownActiveIdx(-1);
//     setErrors(e => ({ ...e, clientId: undefined }));
//   };

//   const clearClientSearch = () => {
//     setClientSearch("");
//     setShowClientDropdown(false);
//     setForm(f => ({ ...f, clientId: "", addressId: "" }));
//     setErrors(e => ({ ...e, clientId: undefined }));
//   };

//   // Validation
//   const validate = () => {
//     const e: any = {};
//     if (!form.clientId) e.clientId = "Required";
//     if (!form.userId) e.userId = "Required";
//     if (!form.guardId) e.guardId = "Required";
//     if (!form.addressId) e.addressId = "Required";
//     if (!form.role) e.role = "Required";
//     if (!form.access) e.access = "Required";
//     if (!form.notification.length) e.notification = "Select at least one notification";
//     setErrors(e);
//     return Object.keys(e).length === 0;
//   };

//   const onSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validate()) return;
//     createAssignment.mutate({
//       userId: Number(form.userId),
//       guardId: Number(form.guardId),
//       clientId: Number(form.clientId),
//       addressId: Number(form.addressId),
//       role: form.role,
//       access: form.access,
//       notification: form.notification,
//     });
//     setForm(DEFAULT_FORM);
//     setClientSearch(""); // Reset search box after submit
//   };

//   // Global loader only for initial page-critical data
//   if (loadingUsers || loadingGuards) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-100">
//         <div className="text-center">
//           <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
//           <p className="text-gray-600 font-sans">Loading assignment form...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!users || !guards) {
//     return (
//       <div className="min-h-screen bg-gray-100 p-6 font-sans">
//         <div className="max-w-6xl mx-auto">
//           <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
//             <h3 className="text-lg font-semibold text-gray-900 mb-2 font-sans">Error Loading Data</h3>
//             <p className="text-gray-600 font-sans">Unable to fetch required data. Please try again.</p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-100 p-6 font-sans">
//       <div className="max-w-6xl mx-auto">
//         {/* Form Section */}
//         <div className="bg-white rounded-lg border border-gray-200 mb-8 p-6">
//           <h2 className="text-xl font-semibold text-gray-900 mb-6 font-sans">
//             General Assignment Information
//           </h2>

//           <form onSubmit={onSubmit} autoComplete="off">
//             <div className="grid grid-cols-3 gap-4 mb-6">
//               {/* Client search and dropdown */}
//               <div className="relative">
//                 <div className="relative">
//                   <input
//                     type="text"
//                     value={clientSearch}
//                     onFocus={() => setShowClientDropdown(true)}
//                     onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
//                     onChange={e => {
//                       setClientSearch(e.target.value);
//                       setShowClientDropdown(true);
//                       setForm(f => ({ ...f, clientId: "", addressId: "" }));
//                     }}
//                     placeholder="Select Client"
//                     className={`w-full px-3 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition text-sm bg-white font-sans pr-8 ${
//                       errors.clientId ? 'border-red-300' : 'border-gray-300'
//                     } ${clientSearch === "" ? "text-gray-400" : "text-gray-700"}`}
//                     style={{ WebkitAppearance: 'none' }}
//                     aria-autocomplete="list"
//                     aria-activedescendant={
//                       clientDropdownActiveIdx >= 0
//                         ? `client-search-item-${clientDropdownActiveIdx}`
//                         : undefined
//                     }
//                     aria-controls="client-search-dropdown"
//                     aria-haspopup="listbox"
//                     onKeyDown={e => {
//                       if (showClientDropdown && searchedClients.length > 0) {
//                         if (e.key === "ArrowDown") {
//                           e.preventDefault();
//                           setClientDropdownActiveIdx(prev =>
//                             prev === searchedClients.length - 1 ? 0 : prev + 1
//                           );
//                         } else if (e.key === "ArrowUp") {
//                           e.preventDefault();
//                           setClientDropdownActiveIdx(prev =>
//                             prev <= 0 ? searchedClients.length - 1 : prev - 1
//                           );
//                         } else if (e.key === "Enter" && clientDropdownActiveIdx >= 0) {
//                           handleClientSelect(searchedClients[clientDropdownActiveIdx]);
//                         }
//                       }
//                     }}
//                   />
//                   <SearchIcon className="absolute right-8 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
//                   {clientSearch && (
//                     <button
//                       type="button"
//                       className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
//                       onClick={clearClientSearch}
//                       tabIndex={-1}
//                       aria-label="Clear"
//                     >
//                       <X className="w-4 h-4" />
//                     </button>
//                   )}
//                   {/* Dropdown */}
//                   {showClientDropdown && clientSearch.length >= 3 && (
//                     <div
//                       className="absolute left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto z-50 font-sans"
//                       id="client-search-dropdown"
//                       role="listbox"
//                     >
//                       {loadingClients ? (
//                         <div className="p-2 flex items-center gap-2 text-sm text-gray-500">
//                           <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
//                           Searching clients...
//                         </div>
//                       ) : searchedClients.length === 0 ? (
//                         <div className="p-2 text-gray-500 text-sm">
//                           No clients found matching "{clientSearch}"
//                         </div>
//                       ) : (
//                         searchedClients.map((client: any, idx: number) => (
//                           <div
//                             key={client.id}
//                             id={`client-search-item-${idx}`}
//                             className={`p-2 cursor-pointer text-sm transition hover:bg-gray-50 font-sans
//                               ${form.clientId === String(client.id)
//                                 ? "bg-blue-100 text-blue-700 font-semibold"
//                                 : idx === clientDropdownActiveIdx
//                                 ? "bg-blue-50"
//                                 : ""
//                               }`}
//                             role="option"
//                             aria-selected={form.clientId === String(client.id)}
//                             onClick={() => handleClientSelect(client)}
//                             onMouseEnter={() => setClientDropdownActiveIdx(idx)}
//                           >
//                             {client.name}
//                           </div>
//                         ))
//                       )}
//                     </div>
//                   )}
//                 </div>
//                 {errors.clientId && (
//                   <p className="text-red-500 text-xs mt-1 font-sans">{errors.clientId}</p>
//                 )}
//               </div>

//               {/* Address select with loader */}
//               <div className="relative">
//                 <select
//                   value={form.addressId}
//                   onChange={e => handleChange("addressId", e.target.value)}
//                   className={`w-full px-3 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition text-sm bg-white appearance-none font-sans ${
//                     !form.clientId || !addresses ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''
//                   } ${errors.addressId ? 'border-red-300' : 'border-gray-300'} ${
//                     form.addressId === "" ? "text-gray-400" : "text-gray-700"
//                   }`}
//                   style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
//                   disabled={!form.clientId || loadingAddresses}
//                 >
//                   <option value="" disabled hidden style={{ color: '#9CA3AF' }}>Select Address</option>
//                   {addresses &&
//                     addresses.map((a: any) => (
//                       <option key={a.id} value={a.id} style={{ color: '#374151' }}>
//                         {a.label ? `${a.label}, ` : ""}
//                         {a.address}, {a.city}
//                       </option>
//                     ))}
//                 </select>
//                 {loadingAddresses && (
//                   <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
//                     <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
//                   </div>
//                 )}
//                 {errors.addressId && (
//                   <p className="text-red-500 text-xs mt-1 font-sans">{errors.addressId}</p>
//                 )}
//               </div>

//               {/* User select */}
//               <div>
//                 <select
//                   value={form.userId}
//                   onChange={e => handleChange("userId", e.target.value)}
//                   className={`w-full px-3 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition text-sm bg-white appearance-none font-sans ${
//                     errors.userId ? 'border-red-300' : 'border-gray-300'
//                   } ${form.userId === "" ? "text-gray-400" : "text-gray-700"}`}
//                   style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
//                 >
//                   <option value="" disabled hidden style={{ color: '#9CA3AF' }}>Select User</option>
//                   {users.map((u: any) => (
//                     <option key={u.id} value={u.id} style={{ color: '#374151' }}>
//                       {u.name}
//                     </option>
//                   ))}
//                 </select>
//                 {errors.userId && <p className="text-red-500 text-xs mt-1 font-sans">{errors.userId}</p>}
//               </div>

//               {/* Guard select */}
//               <div>
//                 <select
//                   value={form.guardId}
//                   onChange={e => handleChange("guardId", e.target.value)}
//                   className={`w-full px-3 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition text-sm bg-white appearance-none font-sans ${
//                     errors.guardId ? 'border-red-300' : 'border-gray-300'
//                   } ${form.guardId === "" ? "text-gray-400" : "text-gray-700"}`}
//                   style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
//                 >
//                   <option value="" disabled hidden style={{ color: '#9CA3AF' }}>Select Guard</option>
//                   {guards.map((g: any) => (
//                     <option key={g.id} value={g.id} style={{ color: '#374151' }}>
//                       {g.name}
//                     </option>
//                   ))}
//                 </select>
//                 {errors.guardId && <p className="text-red-500 text-xs mt-1 font-sans">{errors.guardId}</p>}
//               </div>

//               {/* Role select */}
//               <div>
//                 <select
//                   value={form.role}
//                   onChange={e => handleChange("role", e.target.value)}
//                   className={`w-full px-3 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition text-sm bg-white appearance-none font-sans ${
//                     errors.role ? 'border-red-300' : 'border-gray-300'
//                   } ${form.role === "" ? "text-gray-400" : "text-gray-700"}`}
//                   style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
//                 >
//                   <option value="" disabled hidden style={{ color: '#9CA3AF' }}>Select Role</option>
//                   {["Admin", "Manager", "Guard", "Client"].map(r => (
//                     <option key={r} value={r} style={{ color: '#374151' }}>
//                       {r}
//                     </option>
//                   ))}
//                 </select>
//                 {errors.role && <p className="text-red-500 text-xs mt-1 font-sans">{errors.role}</p>}
//               </div>

//               {/* Access select */}
//               <div>
//                 <select
//                   value={form.access}
//                   onChange={e => handleChange("access", e.target.value)}
//                   className={`w-full px-3 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition text-sm bg-white appearance-none font-sans ${
//                     errors.access ? 'border-red-300' : 'border-gray-300'
//                   } ${form.access === "" ? "text-gray-400" : "text-gray-700"}`}
//                   style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
//                 >
//                   <option value="" disabled hidden style={{ color: '#9CA3AF' }}>Select Access</option>
//                   {["View", "Edit"].map(a => (
//                     <option key={a} value={a} style={{ color: '#374151' }}>
//                       {a}
//                     </option>
//                   ))}
//                 </select>
//                 {errors.access && <p className="text-red-500 text-xs mt-1 font-sans">{errors.access}</p>}
//               </div>

//               {/* Notifications */}
//               <div className="col-span-2 relative">
//                 <button
//                   type="button"
//                   onClick={() => setNotifOpen(!notifOpen)}
//                   className={`w-full px-3 py-0.5 border border-gray-300 rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-[#004175] transition text-sm font-sans ${
//                     errors.notification ? 'border-red-300' : 'border-gray-300'
//                   }`}
//                   style={{ WebkitAppearance: 'none' }}
//                 >
//                   {form.notification.length > 0 
//                     ? form.notification.join(", ") 
//                     : <span className="text-gray-400">Select Notifications</span>
//                   }
//                 </button>
                
//                 {notifOpen && (
//                   <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto font-sans">
//                       {notificationOptions.map((opt) => (
//                         <label
//                           key={opt}
//                           className="flex items-center px-3 py-2 hover:bg-gray-50 text-sm cursor-pointer font-sans"
//                         >
//                           <input
//                             type="checkbox"
//                             className="mr-2"
//                             checked={form.notification.includes(opt)}
//                             onChange={() => handleCheckbox(opt)}
//                           />
//                           {opt}
//                         </label>
//                       ))}
//                   </div>
//                 )}
//                 {errors.notification && <p className="text-red-500 text-xs mt-1 font-sans">{errors.notification}</p>}
//               </div>

//               {/* Action Buttons */}
//               <div className="flex gap-3">
//                 <button
//                   type="submit"
//                   disabled={createAssignment.isPending}
//                   className={`py-1.5 px-4 rounded-md transition cursor-pointer w-auto flex items-center gap-1 border text-sm font-sans h-7 ${
//                     createAssignment.isPending
//                       ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300'
//                       : 'border-blue-600 bg-transparent text-blue-600 hover:bg-blue-50'
//                   }`}
//                   style={{ WebkitAppearance: 'none' }}
//                 >
//                   {createAssignment.isPending ? (
//                     <>
//                       <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
//                       Creating...
//                     </>
//                   ) : (
//                     <>
//                       <Plus className="w-4 h-4" />
//                       Add
//                     </>
//                   )}
//                 </button>
//               </div>
//             </div>
//           </form>
//         </div>

//         <AssignmentHistory />
//       </div>
//     </div>
//   );
// }
import React, { useState } from "react";
import { Plus, X, Search as SearchIcon } from "lucide-react";
import { useAddressesByClient } from "../../hooks/useAddressesByClient";
import { useCreateAssignment } from "../../hooks/userAssignment";
import AssignmentHistory from "../../components/AssignmentReport";
import { useDebounce } from "../../hooks/useDebounce";
import { useSearchClient } from "../../hooks/usesearchClient";
import { useSearchGuards } from "../../hooks/useSearchGuard";
import { useSearchUsers } from "../../hooks/useSearchUser";

const notificationOptions = [
  "Geolocation",
  "Time Clock",
  "Weekly Hours",
  "Scheduling",
] as const;

type NotificationOption = (typeof notificationOptions)[number];

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
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [clientSearch, setClientSearch] = useState("");
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  const { data: searchedClients = [], isLoading: loadingClients } = useSearchClient(debouncedClientSearch);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const { data: searchedUsers = [], isLoading: loadingUsers } = useSearchUsers(debouncedUserSearch);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const [guardSearch, setGuardSearch] = useState("");
  const debouncedGuardSearch = useDebounce(guardSearch, 300);
  const { data: searchedGuards = [], isLoading: loadingGuards } = useSearchGuards(debouncedGuardSearch);
  const [showGuardDropdown, setShowGuardDropdown] = useState(false);

  const clientIdNum = form.clientId ? Number(form.clientId) : 0;
  const { data: addresses, isLoading: loadingAddresses } = useAddressesByClient(clientIdNum);
  const createAssignment = useCreateAssignment();

  const [notifOpen, setNotifOpen] = useState(false);

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

  const handleClientSelect = (client: { id: string | number; name: string }) => {
    setForm(f => ({ ...f, clientId: String(client.id), addressId: "" }));
    setClientSearch(client.name);
    setShowClientDropdown(false);
    setErrors(e => ({ ...e, clientId: undefined }));
  };

  const handleUserSelect = (user: { id: string | number; name: string }) => {
    setForm(f => ({ ...f, userId: String(user.id) }));
    setUserSearch(user.name);
    setShowUserDropdown(false);
    setErrors(e => ({ ...e, userId: undefined }));
  };

  const handleGuardSelect = (guard: { id: string | number; name: string }) => {
    setForm(f => ({ ...f, guardId: String(guard.id) }));
    setGuardSearch(guard.name);
    setShowGuardDropdown(false);
    setErrors(e => ({ ...e, guardId: undefined }));
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
    setClientSearch("");
    setUserSearch("");
    setGuardSearch("");
  };

  if (loadingUsers || loadingGuards) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-sans">Loading assignment form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 mb-8 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 font-sans">
            General Assignment Information
          </h2>

          <form onSubmit={onSubmit} autoComplete="off">
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* Client Search Input and Dropdown */}
              <div className="relative">
                <input
                  type="text"
                  value={clientSearch}
                  onFocus={() => setShowClientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                  onChange={e => {
                    setClientSearch(e.target.value);
                    setForm(f => ({ ...f, clientId: "", addressId: "" }));
                  }}
                  placeholder="Search Client"
                  className="w-full px-3 py-0.5 border rounded-md text-sm font-sans"
                />
                {showClientDropdown && clientSearch.length >= 2 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50 font-sans">
                    {loadingClients ? (
                      <div className="p-2 text-sm text-gray-500">Searching clients...</div>
                    ) : searchedClients.length === 0 ? (
                      <div className="p-2 text-gray-500 text-sm">No clients found</div>
                    ) : (
                      searchedClients.map(client => (
                        <div
                          key={client.id}
                          className="p-2 cursor-pointer text-sm hover:bg-gray-50"
                          onMouseDown={() => handleClientSelect(client)}
                        >
                          {client.name}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Address Select */}
              <div>
                <select
                  value={form.addressId}
                  onChange={e => handleChange("addressId", e.target.value)}
                  className="w-full px-3 py-0.5 border rounded-md text-sm font-sans"
                >
                  <option value="">Select Address</option>
                  {addresses?.map(address => (
                    <option key={address.id} value={address.id}>
                      {address.label || address.address}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Search Input and Dropdown */}
              <div className="relative">
                <input
                  type="text"
                  value={userSearch}
                  onFocus={() => setShowUserDropdown(true)}
                  onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                  onChange={e => {
                    setUserSearch(e.target.value);
                    setForm(f => ({ ...f, userId: "" }));
                  }}
                  placeholder="Search User"
                  className="w-full px-3 py-0.5 border rounded-md text-sm font-sans"
                />
                {showUserDropdown && userSearch.length >= 2 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50 font-sans">
                    {loadingUsers ? (
                      <div className="p-2 text-sm text-gray-500">Searching users...</div>
                    ) : searchedUsers.length === 0 ? (
                      <div className="p-2 text-gray-500 text-sm">No users found</div>
                    ) : (
                      searchedUsers.map(user => (
                        <div
                          key={user.id}
                          className="p-2 cursor-pointer text-sm hover:bg-gray-50"
                          onMouseDown={() => handleUserSelect(user)}
                        >
                          {user.name}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Guard Search Input and Dropdown */}
              <div className="relative">
                <input
                  type="text"
                  value={guardSearch}
                  onFocus={() => setShowGuardDropdown(true)}
                  onBlur={() => setTimeout(() => setShowGuardDropdown(false), 200)}
                  onChange={e => {
                    setGuardSearch(e.target.value);
                    setForm(f => ({ ...f, guardId: "" }));
                  }}
                  placeholder="Search Guard"
                  className="w-full px-3 py-0.5 border rounded-md text-sm font-sans"
                />
                {showGuardDropdown && guardSearch.length >= 2 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50 font-sans">
                    {loadingGuards ? (
                      <div className="p-2 text-sm text-gray-500">Searching guards...</div>
                    ) : searchedGuards.length === 0 ? (
                      <div className="p-2 text-gray-500 text-sm">No guards found</div>
                    ) : (
                      searchedGuards.map(guard => (
                        <div
                          key={guard.id}
                          className="p-2 cursor-pointer text-sm hover:bg-gray-50"
                          onMouseDown={() => handleGuardSelect(guard)}
                        >
                          {guard.name}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Role Select */}
              <div>
                <select
                  value={form.role}
                  onChange={e => handleChange("role", e.target.value)}
                  className="w-full px-3 py-0.5 border rounded-md text-sm font-sans"
                >
                  <option value="">Select Role</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Guard">Guard</option>
                  <option value="Client">Client</option>
                </select>
              </div>

              {/* Access Select */}
              <div>
                <select
                  value={form.access}
                  onChange={e => handleChange("access", e.target.value)}
                  className="w-full px-3 py-0.5 border rounded-md text-sm font-sans"
                >
                  <option value="">Select Access</option>
                  <option value="View">View</option>
                  <option value="Edit">Edit</option>
                </select>
              </div>

              {/* Notification Checkboxes */}
              <div className="col-span-3">
                <label className="block font-sans mb-2">Notifications</label>
                <div className="flex flex-wrap gap-2">
                  {notificationOptions.map(option => (
                    <label key={option} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={form.notification.includes(option)}
                        onChange={() => handleCheckbox(option)}
                        className="mr-2"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="col-span-3 mt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md font-sans"
                >
                  <Plus className="inline-block w-4 h-4 mr-1" /> Add Assignment
                </button>
              </div>
            </div>
          </form>
        </div>
        <AssignmentHistory />
      </div>
    </div>
  );
}
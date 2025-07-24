// import React, { useState } from "react";
// import { Plus } from "lucide-react";
// import { useAddressesByClient } from "../../hooks/useAddressesByClient";
// import { useCreateAssignment } from "../../hooks/userAssignment";
// import AssignmentHistory from "../../components/AssignmentReport";
// import { useDebounce } from "../../hooks/useDebounce";
// import { useSearchClient } from "../../hooks/usesearchClient";
// import { useSearchGuards } from "../../hooks/useSearchGuard";
// import { useSearchUsers } from "../../hooks/useSearchUser";

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
//   const [form, setForm] = useState(DEFAULT_FORM);
//   const [errors, setErrors] = useState<{ [key: string]: string }>({});

//   const [clientSearch, setClientSearch] = useState("");
//   const debouncedClientSearch = useDebounce(clientSearch, 300);
//   const { data: searchedClients = [], isLoading: loadingClients } = useSearchClient(debouncedClientSearch);
//   const [showClientDropdown, setShowClientDropdown] = useState(false);

//   const [userSearch, setUserSearch] = useState("");
//   const debouncedUserSearch = useDebounce(userSearch, 300);
//   const { data: searchedUsers = [], isLoading: loadingUsers } = useSearchUsers(debouncedUserSearch);
//   const [showUserDropdown, setShowUserDropdown] = useState(false);

//   const [guardSearch, setGuardSearch] = useState("");
//   const debouncedGuardSearch = useDebounce(guardSearch, 300);
//   const { data: searchedGuards = [], isLoading: loadingGuards } = useSearchGuards(debouncedGuardSearch);
//   const [showGuardDropdown, setShowGuardDropdown] = useState(false);

//   const clientIdNum = form.clientId ? Number(form.clientId) : 0;
//   const { data: addresses, isLoading: loadingAddresses } = useAddressesByClient(clientIdNum);

//   const createAssignment = useCreateAssignment();

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

//   const handleClientSelect = (client: { id: string | number; name: string }) => {
//     setForm(f => ({ ...f, clientId: String(client.id), addressId: "" }));
//     setClientSearch(client.name);
//     setShowClientDropdown(false);
//     setErrors(e => ({ ...e, clientId: undefined }));
//   };

//   const handleUserSelect = (user: { id: string | number; name: string }) => {
//     setForm(f => ({ ...f, userId: String(user.id) }));
//     setUserSearch(user.name);
//     setShowUserDropdown(false);
//     setErrors(e => ({ ...e, userId: undefined }));
//   };

//   const handleGuardSelect = (guard: { id: string | number; name: string }) => {
//     setForm(f => ({ ...f, guardId: String(guard.id) }));
//     setGuardSearch(guard.name);
//     setShowGuardDropdown(false);
//     setErrors(e => ({ ...e, guardId: undefined }));
//   };

//   const validate = () => {
//     const e: any = {};
//     if (!form.clientId) e.clientId = "Required";
//     if (!form.userId) e.userId = "Required";
//     if (!form.guardId) e.guardId = "Required";
//     if (!form.addressId) e.addressId = "Required";
//     if (!form.role) e.role = "Required";
//     if (!form.access) e.access = "Required";
//     if (!form.notification.length)
//       e.notification = "Select at least one notification";
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
//     setClientSearch("");
//     setUserSearch("");
//     setGuardSearch("");
//     setErrors({});
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 p-6 font-sans">
//       <div className="max-w-6xl mx-auto">
//         <div className="bg-white rounded-lg border border-gray-200 mb-8 p-6">
//           <h2 className="text-xl font-semibold text-gray-900 mb-6 font-sans">
//             General Assignment Information
//           </h2>

//           <form onSubmit={onSubmit} autoComplete="off">
//             <div className="grid grid-cols-3 gap-4 mb-6">
//               {/* Client Search */}
//               <div className="relative">
//                 <input
//                   type="text"
//                   value={clientSearch}
//                   onFocus={() => setShowClientDropdown(true)}
//                   onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
//                   onChange={e => {
//                     setClientSearch(e.target.value);
//                     setForm(f => ({ ...f, clientId: "", addressId: "" }));
//                   }}
//                   placeholder="Search Client"
//                   className="w-full px-3 py-0.5 border rounded-md text-sm font-sans"
//                 />
//                 {errors.clientId && (
//                   <span className="text-xs text-red-500">{errors.clientId}</span>
//                 )}
//                 {showClientDropdown && clientSearch.length >= 2 && (
//                   <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50 font-sans">
//                     {loadingClients ? (
//                       <div className="p-2 text-sm text-gray-500">Searching clients...</div>
//                     ) : searchedClients.length === 0 ? (
//                       <div className="p-2 text-gray-500 text-sm">No clients found</div>
//                     ) : (
//                       searchedClients.map(client => (
//                         <div
//                           key={client.id}
//                           className="p-2 cursor-pointer text-sm hover:bg-gray-50"
//                           onMouseDown={() => handleClientSelect(client)}
//                         >
//                           {client.name}
//                         </div>
//                       ))
//                     )}
//                   </div>
//                 )}
//               </div>

//               {/* Address select */}
//               <div>
//                 <select
//                   value={form.addressId}
//                   onChange={e => handleChange("addressId", e.target.value)}
//                   disabled={!form.clientId || loadingAddresses}
//                   className="w-full px-3 py-0.5 border rounded-md text-sm font-sans"
//                 >
//                   <option value="">Select Address</option>
//                   {addresses?.map(address => (
//                     <option key={address.id} value={address.id}>
//                       {address.label || address.address}
//                     </option>
//                   ))}
//                 </select>
//                 {loadingAddresses && (
//                   <span className="text-xs text-blue-500 ml-2">Loading...</span>
//                 )}
//                 {errors.addressId && (
//                   <span className="text-xs text-red-500">{errors.addressId}</span>
//                 )}
//               </div>

//               {/* User Search */}
//               <div className="relative">
//                 <input
//                   type="text"
//                   value={userSearch}
//                   onFocus={() => setShowUserDropdown(true)}
//                   onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
//                   onChange={e => {
//                     setUserSearch(e.target.value);
//                     setForm(f => ({ ...f, userId: "" }));
//                   }}
//                   placeholder="Search User"
//                   className="w-full px-3 py-0.5 border rounded-md text-sm font-sans"
//                 />
//                 {errors.userId && (
//                   <span className="text-xs text-red-500">{errors.userId}</span>
//                 )}
//                 {showUserDropdown && userSearch.length >= 2 && (
//                   <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50 font-sans">
//                     {loadingUsers ? (
//                       <div className="p-2 text-sm text-gray-500">Searching users...</div>
//                     ) : searchedUsers.length === 0 ? (
//                       <div className="p-2 text-gray-500 text-sm">No users found</div>
//                     ) : (
//                       searchedUsers.map(user => (
//                         <div
//                           key={user.id}
//                           className="p-2 cursor-pointer text-sm hover:bg-gray-50"
//                           onMouseDown={() => handleUserSelect(user)}
//                         >
//                           {user.name}
//                         </div>
//                       ))
//                     )}
//                   </div>
//                 )}
//               </div>

//               {/* Guard Search */}
//               <div className="relative">
//                 <input
//                   type="text"
//                   value={guardSearch}
//                   onFocus={() => setShowGuardDropdown(true)}
//                   onBlur={() => setTimeout(() => setShowGuardDropdown(false), 200)}
//                   onChange={e => {
//                     setGuardSearch(e.target.value);
//                     setForm(f => ({ ...f, guardId: "" }));
//                   }}
//                   placeholder="Search Guard"
//                   className="w-full px-3 py-0.5 border rounded-md text-sm font-sans"
//                 />
//                 {errors.guardId && (
//                   <span className="text-xs text-red-500">{errors.guardId}</span>
//                 )}
//                 {showGuardDropdown && guardSearch.length >= 2 && (
//                   <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50 font-sans">
//                     {loadingGuards ? (
//                       <div className="p-2 text-sm text-gray-500">Searching guards...</div>
//                     ) : searchedGuards.length === 0 ? (
//                       <div className="p-2 text-gray-500 text-sm">No guards found</div>
//                     ) : (
//                       searchedGuards.map(guard => (
//                         <div
//                           key={guard.id}
//                           className="p-2 cursor-pointer text-sm hover:bg-gray-50"
//                           onMouseDown={() => handleGuardSelect(guard)}
//                         >
//                           {guard.name}
//                         </div>
//                       ))
//                     )}
//                   </div>
//                 )}
//               </div>

//               {/* Role select */}
//               <div>
//                 <select
//                   value={form.role}
//                   onChange={e => handleChange("role", e.target.value)}
//                   className="w-full px-3 py-0.5 border rounded-md text-sm font-sans"
//                 >
//                   <option value="">Select Role</option>
//                   <option value="Admin">Admin</option>
//                   <option value="Manager">Manager</option>
//                   <option value="Guard">Guard</option>
//                   <option value="Client">Client</option>
//                 </select>
//                 {errors.role && (
//                   <span className="text-xs text-red-500">{errors.role}</span>
//                 )}
//               </div>

//               {/* Access select */}
//               <div>
//                 <select
//                   value={form.access}
//                   onChange={e => handleChange("access", e.target.value)}
//                   className="w-full px-3 py-0.5 border rounded-md text-sm font-sans"
//                 >
//                   <option value="">Select Access</option>
//                   <option value="View">View</option>
//                   <option value="Edit">Edit</option>
//                 </select>
//                 {errors.access && (
//                   <span className="text-xs text-red-500">{errors.access}</span>
//                 )}
//               </div>

//               {/* Notification Checkboxes */}
//               <div className="col-span-3">
//                 <label className="block font-sans mb-2">Notifications</label>
//                 <div className="flex flex-wrap gap-2">
//                   {notificationOptions.map(option => (
//                     <label key={option} className="flex items-center">
//                       <input
//                         type="checkbox"
//                         checked={form.notification.includes(option)}
//                         onChange={() => handleCheckbox(option)}
//                         className="mr-2"
//                       />
//                       {option}
//                     </label>
//                   ))}
//                 </div>
//                 {errors.notification && (
//                   <span className="text-xs text-red-500 block mt-1">
//                     {errors.notification}
//                   </span>
//                 )}
//               </div>
//               {/* Submit Button */}
//               <div className="col-span-3 mt-4">
//                 <button
//   type="submit"
//   disabled={createAssignment.status === "pending"} // or createAssignment.isPending if available
//   className="px-4 py-2 bg-blue-600 text-white rounded-md font-sans"
// >
//   <Plus className="inline-block w-4 h-4 mr-1" /> Add Assignment
// </button>
// {createAssignment.status === "pending" && (
//   <span className="ml-2 text-blue-500">Submitting...</span>
// )}
//               </div>
//             </div>
//           </form>
//         </div>
//         <AssignmentHistory />
//       </div>
//     </div>
//   );
// }
// import React, { useState } from "react";
// import { Plus } from "lucide-react";
// import { useAddressesByClient } from "../../hooks/useAddressesByClient";
// import { useCreateAssignment } from "../../hooks/userAssignment";
// import AssignmentHistory from "../../components/AssignmentReport";
// import { useDebounce } from "../../hooks/useDebounce";
// import { useSearchClient } from "../../hooks/usesearchClient";
// import { useSearchGuards } from "../../hooks/useSearchGuard";
// import { useSearchUsers } from "../../hooks/useSearchUser";

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
//   const [form, setForm] = useState(DEFAULT_FORM);
//   const [errors, setErrors] = useState<{ [key: string]: string }>({});

//   const [clientSearch, setClientSearch] = useState("");
//   const debouncedClientSearch = useDebounce(clientSearch, 300);
//   const { data: searchedClients = [], isLoading: loadingClients } = useSearchClient(debouncedClientSearch);
//   const [showClientDropdown, setShowClientDropdown] = useState(false);

//   const [userSearch, setUserSearch] = useState("");
//   const debouncedUserSearch = useDebounce(userSearch, 300);
//   const { data: searchedUsers = [], isLoading: loadingUsers } = useSearchUsers(debouncedUserSearch);
//   const [showUserDropdown, setShowUserDropdown] = useState(false);

//   const [guardSearch, setGuardSearch] = useState("");
//   const debouncedGuardSearch = useDebounce(guardSearch, 300);
//   const { data: searchedGuards = [], isLoading: loadingGuards } = useSearchGuards(debouncedGuardSearch);
//   const [showGuardDropdown, setShowGuardDropdown] = useState(false);

//   const clientIdNum = form.clientId ? Number(form.clientId) : 0;
//   const { data: addresses, isLoading: loadingAddresses } = useAddressesByClient(clientIdNum);

//   const createAssignment = useCreateAssignment();

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

//   const handleClientSelect = (client: { id: string | number; name: string }) => {
//     setForm(f => ({ ...f, clientId: String(client.id), addressId: "" }));
//     setClientSearch(client.name);
//     setShowClientDropdown(false);
//     setErrors(e => ({ ...e, clientId: undefined }));
//   };

//   const handleUserSelect = (user: { id: string | number; name: string }) => {
//     setForm(f => ({ ...f, userId: String(user.id) }));
//     setUserSearch(user.name);
//     setShowUserDropdown(false);
//     setErrors(e => ({ ...e, userId: undefined }));
//   };

//   const handleGuardSelect = (guard: { id: string | number; name: string }) => {
//     setForm(f => ({ ...f, guardId: String(guard.id) }));
//     setGuardSearch(guard.name);
//     setShowGuardDropdown(false);
//     setErrors(e => ({ ...e, guardId: undefined }));
//   };

//   const validate = () => {
//     const e: any = {};
//     if (!form.clientId) e.clientId = "Required";
//     if (!form.userId) e.userId = "Required";
//     if (!form.guardId) e.guardId = "Required";
//     if (!form.addressId) e.addressId = "Required";
//     if (!form.role) e.role = "Required";
//     if (!form.access) e.access = "Required";
//     if (!form.notification.length)
//       e.notification = "Select at least one notification";
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
//     setClientSearch("");
//     setUserSearch("");
//     setGuardSearch("");
//     setErrors({});
//   };

//   const fieldInputClasses = "w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition";

//   return (
//     <div className="min-h-screen bg-gray-100 p-6 font-sans">
//       <div className="max-w-6xl mx-auto">
//         <div className="bg-white rounded-lg border border-gray-200 mb-8 p-6">
//           <h2 className="text-xl font-semibold text-gray-900 mb-6 font-sans">
//             General Assignment Information
//           </h2>

//           <form onSubmit={onSubmit} autoComplete="off">
//             <div className="grid grid-cols-3 gap-4 mb-6">
//               {/* Client Search */}
//               <div className="relative">
//                 <input
//                   type="text"
//                   value={clientSearch}
//                   onFocus={() => setShowClientDropdown(true)}
//                   onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
//                   onChange={e => {
//                     setClientSearch(e.target.value);
//                     setForm(f => ({ ...f, clientId: "", addressId: "" }));
//                   }}
//                   placeholder="Client Name"
//                   className={fieldInputClasses}
//                 />
//                 {errors.clientId && (
//                   <span className="text-xs text-red-500">{errors.clientId}</span>
//                 )}
//                 {showClientDropdown && clientSearch.length >= 2 && (
//                   <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50 font-sans">
//                     {loadingClients ? (
//                       <div className="p-2 text-sm text-gray-500">Searching clients...</div>
//                     ) : searchedClients.length === 0 ? (
//                       <div className="p-2 text-gray-500 text-sm">No clients found</div>
//                     ) : (
//                       searchedClients.map(client => (
//                         <div
//                           key={client.id}
//                           className="p-2 cursor-pointer text-sm hover:bg-gray-50"
//                           onMouseDown={() => handleClientSelect(client)}
//                         >
//                           {client.name}
//                         </div>
//                       ))
//                     )}
//                   </div>
//                 )}
//               </div>

//               {/* Address select */}
//               <div>
//                 <select
//                   value={form.addressId}
//                   onChange={e => handleChange("addressId", e.target.value)}
//                   disabled={!form.clientId || loadingAddresses}
//                   className={fieldInputClasses}
//                 >
//                   <option value="">Select Address</option>
//                   {addresses?.map(address => (
//                     <option key={address.id} value={address.id}>
//                       {address.label || address.address}
//                     </option>
//                   ))}
//                 </select>
//                 {loadingAddresses && (
//                   <span className="text-xs text-blue-500 ml-2">Loading...</span>
//                 )}
//                 {errors.addressId && (
//                   <span className="text-xs text-red-500">{errors.addressId}</span>
//                 )}
//               </div>

//               {/* User Search */}
//               <div className="relative">
//                 <input
//                   type="text"
//                   value={userSearch}
//                   onFocus={() => setShowUserDropdown(true)}
//                   onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
//                   onChange={e => {
//                     setUserSearch(e.target.value);
//                     setForm(f => ({ ...f, userId: "" }));
//                   }}
//                   placeholder="User Name"
//                   className={fieldInputClasses}
//                 />
//                 {errors.userId && (
//                   <span className="text-xs text-red-500">{errors.userId}</span>
//                 )}
//                 {showUserDropdown && userSearch.length >= 2 && (
//                   <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50 font-sans">
//                     {loadingUsers ? (
//                       <div className="p-2 text-sm text-gray-500">Searching users...</div>
//                     ) : searchedUsers.length === 0 ? (
//                       <div className="p-2 text-gray-500 text-sm">No users found</div>
//                     ) : (
//                       searchedUsers.map(user => (
//                         <div
//                           key={user.id}
//                           className="p-2 cursor-pointer text-sm hover:bg-gray-50"
//                           onMouseDown={() => handleUserSelect(user)}
//                         >
//                           {user.name}
//                         </div>
//                       ))
//                     )}
//                   </div>
//                 )}
//               </div>

//               {/* Guard Search */}
//               <div className="relative">
//                 <input
//                   type="text"
//                   value={guardSearch}
//                   onFocus={() => setShowGuardDropdown(true)}
//                   onBlur={() => setTimeout(() => setShowGuardDropdown(false), 200)}
//                   onChange={e => {
//                     setGuardSearch(e.target.value);
//                     setForm(f => ({ ...f, guardId: "" }));
//                   }}
//                   placeholder="Guard Name"
//                   className={fieldInputClasses}
//                 />
//                 {errors.guardId && (
//                   <span className="text-xs text-red-500">{errors.guardId}</span>
//                 )}
//                 {showGuardDropdown && guardSearch.length >= 2 && (
//                   <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50 font-sans">
//                     {loadingGuards ? (
//                       <div className="p-2 text-sm text-gray-500">Searching guards...</div>
//                     ) : searchedGuards.length === 0 ? (
//                       <div className="p-2 text-gray-500 text-sm">No guards found</div>
//                     ) : (
//                       searchedGuards.map(guard => (
//                         <div
//                           key={guard.id}
//                           className="p-2 cursor-pointer text-sm hover:bg-gray-50"
//                           onMouseDown={() => handleGuardSelect(guard)}
//                         >
//                           {guard.name}
//                         </div>
//                       ))
//                     )}
//                   </div>
//                 )}
//               </div>

//               {/* Role select */}
//               <div>
//                 <select
//                   value={form.role}
//                   onChange={e => handleChange("role", e.target.value)}
//                   className={fieldInputClasses}
//                 >
//                   <option value="">Select Role</option>
//                   <option value="Admin">Admin</option>
//                   <option value="Manager">Manager</option>
//                   <option value="Guard">Guard</option>
//                   <option value="Client">Client</option>
//                 </select>
//                 {errors.role && (
//                   <span className="text-xs text-red-500">{errors.role}</span>
//                 )}
//               </div>

//               {/* Access select */}
//               <div>
//                 <select
//                   value={form.access}
//                   onChange={e => handleChange("access", e.target.value)}
//                   className={fieldInputClasses}
//                 >
//                   <option value="">Select Access</option>
//                   <option value="View">View</option>
//                   <option value="Edit">Edit</option>
//                 </select>
//                 {errors.access && (
//                   <span className="text-xs text-red-500">{errors.access}</span>
//                 )}
//               </div>

//               {/* Notification Checkboxes */}
//               <div className="col-span-3">
//                 <label className="block font-sans mb-2">Notifications</label>
//                 <div className="flex flex-wrap gap-2">
//                   {notificationOptions.map(option => (
//                     <label key={option} className="flex items-center">
//                       <input
//                         type="checkbox"
//                         checked={form.notification.includes(option)}
//                         onChange={() => handleCheckbox(option)}
//                         className="mr-2"
//                       />
//                       {option}
//                     </label>
//                   ))}
//                 </div>
//                 {errors.notification && (
//                   <span className="text-xs text-red-500 block mt-1">
//                     {errors.notification}
//                   </span>
//                 )}
//               </div>
//               {/* Submit Button */}
//               <div className="col-span-3 mt-4">
//                 <button
//                   type="submit"
//                   disabled={createAssignment.status === "pending"}
//                   className="px-4 py-2 bg-blue-600 text-white rounded-md font-sans"
//                 >
//                   <Plus className="inline-block w-4 h-4 mr-1" /> Add Assignment
//                 </button>
//                 {createAssignment.status === "pending" && (
//                   <span className="ml-2 text-blue-500">Submitting...</span>
//                 )}
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
import { Plus } from "lucide-react";
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
    if (!form.notification.length)
      e.notification = "Select at least one notification";
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
    setErrors({});
  };

  const fieldInputClasses = "w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175] transition";

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 mb-8 p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 font-sans">
            General Assignment Information
          </h2>

          <form onSubmit={onSubmit} autoComplete="off">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Client Search */}
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
                  placeholder="Client Name"
                  className={fieldInputClasses}
                />
                {errors.clientId && (
                  <span className="text-xs text-red-500">{errors.clientId}</span>
                )}
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

              {/* Address select */}
              <div>
                <select
                  value={form.addressId}
                  onChange={e => handleChange("addressId", e.target.value)}
                  disabled={!form.clientId || loadingAddresses}
                  className={fieldInputClasses}
                >
                  <option value="">Select Address</option>
                  {addresses?.map(address => (
                    <option key={address.id} value={address.id}>
                      {address.label || address.address}
                    </option>
                  ))}
                </select>
                {loadingAddresses && (
                  <span className="text-xs text-blue-500 ml-2">Loading...</span>
                )}
                {errors.addressId && (
                  <span className="text-xs text-red-500">{errors.addressId}</span>
                )}
              </div>

              {/* User Search */}
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
                  placeholder="User Name"
                  className={fieldInputClasses}
                />
                {errors.userId && (
                  <span className="text-xs text-red-500">{errors.userId}</span>
                )}
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

              {/* Guard Search */}
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
                  placeholder="Guard Name"
                  className={fieldInputClasses}
                />
                {errors.guardId && (
                  <span className="text-xs text-red-500">{errors.guardId}</span>
                )}
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

              {/* Role select */}
              <div>
                <select
                  value={form.role}
                  onChange={e => handleChange("role", e.target.value)}
                  className={fieldInputClasses}
                >
                  <option value="">Select Role</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Guard">Guard</option>
                  <option value="Client">Client</option>
                </select>
                {errors.role && (
                  <span className="text-xs text-red-500">{errors.role}</span>
                )}
              </div>

              {/* Access select */}
              <div>
                <select
                  value={form.access}
                  onChange={e => handleChange("access", e.target.value)}
                  className={fieldInputClasses}
                >
                  <option value="">Select Access</option>
                  <option value="View">View</option>
                  <option value="Edit">Edit</option>
                </select>
                {errors.access && (
                  <span className="text-xs text-red-500">{errors.access}</span>
                )}
              </div>

              {/* Notification Checkboxes */}
              <div className="col-span-1 md:col-span-2 lg:col-span-3">
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
                {errors.notification && (
                  <span className="text-xs text-red-500 block mt-1">
                    {errors.notification}
                  </span>
                )}
              </div>
              {/* Submit Button */}
              <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-4">
                <button
                  type="submit"
                  disabled={createAssignment.status === "pending"}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md font-sans w-full sm:w-auto"
                >
                  <Plus className="inline-block w-4 h-4 mr-1" /> Add Assignment
                </button>
                {createAssignment.status === "pending" && (
                  <span className="ml-2 text-blue-500">Submitting...</span>
                )}
              </div>
            </div>
          </form>
        </div>
        <AssignmentHistory />
      </div>
    </div>
  );
}

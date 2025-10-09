import React, { useEffect, useState, useRef, useMemo } from "react";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { GoPlus } from "react-icons/go";
import { X, RotateCcw, Search } from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";
import { useSearchClient } from "../../hooks/usesearchClient";
import { useSearchUsers } from "../../hooks/useSearchUser";
import { useAuth } from "../../context/LoginContext";
import {
	GenericTable,
	TableAction,
	TableColumn,
	SearchOption,
} from "../../components/GenericTable";
import Pagination from "../../components/Pagination";
import SubmitButton from "../../components/ui/ButtonUi";
import { useAssignment } from "../../context/Assignment";
import { inputClasses } from "./GeoLocationSetup";
import ResetButton from "../../components/ui/ResetButton";
import {
	GenericSearchForm,
	FieldConfig,
} from "../../components/GenericFormSearch";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../../components/ui/button";
import {
	SearchResultItem,
	SearchResultsDropdown,
} from "../../components/ui/search-result-item";

const notificationOptions = [
	"Geolocation",
	"Time Clock",
	"Weekly Hours",
	"Scheduling",
] as const;
type NotificationOption = (typeof notificationOptions)[number];

const flattenNotificationCategories = (categories) => {
	const flattened = [];
	categories.forEach((cat) => {
		// Add parent as group label if needed
		flattened.push({ label: cat.label, value: cat.value });

		// Add subcategories (with clear prefix for UI clarity)
		if (Array.isArray(cat.subCategories)) {
			cat.subCategories.forEach((sub) => {
				flattened.push({
					label: `— ${cat.label} / ${sub.label}`, // visually nested
					value: sub.value,
				});
			});
		}
	});
	return flattened;
};

const notificationMapping = {
	geo_location: "Geolocation",
	time_clock: "Time Clock",
	weekly_Hours: "Weekly Hours",
	schedule: "Scheduling",
	Geolocation: "Geolocation",
	"Time Clock": "Time Clock",
	"Weekly Hours": "Weekly Hours",
	Scheduling: "Scheduling",
};

const NotificationSubCategories = [
	"guard_absent",
	"proximity_alert",
	"late_checkin",
	"early_departure",
	"return_onsite",
	"untracked_logout",
	"reconnected_onsite",
	"assigned_hours_discrepancy",
	"worked_hours_discrepancy",
	"schedule_published",
	"schedule_unconfirmed",
	"schedule_rejection",
	"schedule_accepted",
	"enroute_confirmation",
	"enroute_unconfirmed",
	"enroute_rejected",
];
export const notificationCategories = [
	{
		label: "Geolocation",
		value: "Geolocation",
		subCategories: [
			{ label: "Guard Absent", value: "guard_absent" },
			{ label: "Proximity Alert", value: "proximity_alert" },
			{ label: "Late Check-In", value: "late_checkin" },
			{ label: "Early Departure", value: "early_departure" },
			{ label: "Return On-Site", value: "return_onsite" },
			{ label: "Untracked Logout", value: "untracked_logout" },
			{ label: "Reconnected On-Site", value: "reconnected_onsite" },
		],
	},
	{
		label: "Time Deviation",
		value: "Time Deviation",
		subCategories: [], // none yet
	},
	{
		label: "Weekly Hours",
		value: "Weekly Hours",
		subCategories: [
			{ label: "Assigned Hours Discrepancy", value: "assigned_hours_discrepancy" },
			{ label: "Worked Hours Discrepancy", value: "worked_hours_discrepancy" },
		],
	},
	{
		label: "Schedule",
		value: "Schedule",
		subCategories: [
			{ label: "Schedule Published", value: "schedule_published" },
			{ label: "Schedule Unconfirmed", value: "schedule_unconfirmed" },
			{ label: "Schedule Rejection", value: "schedule_rejection" },
			{ label: "Schedule Accepted", value: "schedule_accepted" },
			{ label: "Enroute Confirmation", value: "enroute_confirmation" },
			{ label: "Enroute Unconfirmed", value: "enroute_unconfirmed" },
			{ label: "Enroute Rejected", value: "enroute_rejected" },
		],
	},
];

const filterMap = {
  'Geolocation': 'geolocation',
  'Time Clock': 'time_clock',
  'Weekly Hours': 'weekly_hours',
  'Scheduling': 'schedule'
};

export default function AssignmentNew() {
	const {
		assignments,
		lastPage,
		loading,
		currentPage,
		submitError,
		fetchAssignments,
		setCurrentPage,
		createAssignment,
		setSubmitError,
		updateAssignment,
		deleteAssignment,
	} = useAssignment();
	const { toast } = useToast();
	const { syncRolesFromSession } = useAuth();
	const [form, setForm] = useState({
		userId: "",
		guardId: "",
		clientId: "",
		addressId: "",
		role: "",
		access: "",
		notification: [] as string[],
		notificationSubCat: [] as string[],
	});
	const [showAccessDropdown, setShowAccessDropdown] = useState(false);
	const [showRoleDropdown, setShowRoleDropdown] = useState(false);
	const [editId, setEditId] = useState<number | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [submitLoader, setSubmitLoader] = useState(false);
	const [errors, setErrors] = useState<{ [key: string]: string }>({});
	const [showErrors, setShowErrors] = useState(false);
	const [deleteModal, setDeleteModal] = useState<{
		isOpen: boolean;
		record: any;
	}>({ isOpen: false, record: null });
	const [deleteLoader, setDeleteLoader] = useState(false);
	const [showSearchForm, setShowSearchForm] = useState(false);
	const [searchLoading, setSearchLoading] = useState(false);
	const [clientSearch, setClientSearch] = useState("");
	const [userSearch, setUserSearch] = useState("");
	const [guardSearch, setGuardSearch] = useState("");
	const [selectedAddressText, setSelectedAddressText] = useState("");
	const [showClientDropdown, setShowClientDropdown] = useState(false);
	const [showUserDropdown, setShowUserDropdown] = useState(false);
	const [showGuardDropdown, setShowGuardDropdown] = useState(false);
	const [showNotificationDropdown, setShowNotificationDropdown] =
		useState(false);
	const notificationDropdownRef = useRef<HTMLDivElement>(null);
	const [notifiedUserEmail, setNotifiedUserEmail] = useState("");
	const roleDropdownRef = useRef<HTMLDivElement>(null);
	const accessDropdownRef = useRef<HTMLDivElement>(null);

	const [tableHeight, setTableHeight] = useState<string>("400px");
	const formRef = useRef<HTMLDivElement>(null);
	const debouncedClientSearch = useDebounce(clientSearch, 300);
	const debouncedUserSearch = useDebounce(userSearch, 300);
	const debouncedGuardSearch = useDebounce(guardSearch, 300);

	const { data: searchedClients = [], isLoading: loadingClients } =
		useSearchClient(debouncedClientSearch);
	const { data: searchedUsers = [], isLoading: loadingUsers } =
		useSearchUsers(debouncedUserSearch);
	const { data: searchedGuards = [], isLoading: loadingGuards } =
		useSearchUsers(debouncedGuardSearch);
	// const accessDropdownRef = useRef<HTMLDivElement>(null);

	// Access Dropdown
	useEffect(() => {
		if (!showAccessDropdown) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (
				accessDropdownRef.current &&
				!accessDropdownRef.current.contains(event.target as Node)
			) {
				setShowAccessDropdown(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [showAccessDropdown]);

	// Role Dropdown
	useEffect(() => {
		if (!showRoleDropdown) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (
				roleDropdownRef.current &&
				!roleDropdownRef.current.contains(event.target as Node)
			) {
				setShowRoleDropdown(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [showRoleDropdown]);

	// Notification Dropdown
	useEffect(() => {
		if (!showNotificationDropdown) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (
				notificationDropdownRef.current &&
				!notificationDropdownRef.current.contains(event.target as Node)
			) {
				setShowNotificationDropdown(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [showNotificationDropdown]);
	const searchFields = useMemo<FieldConfig[]>(
		() => [
			{ name: "clientName", type: "text", placeholder: "Client Name" },
			{ name: "location", type: "text", placeholder: "Location" },
			{ name: "userName", type: "text", placeholder: "User Name" },
			{
				name: "role",
				type: "select",
				placeholder: "Select Role",
				options: [
					{ label: "Admin", value: "Admin" },
					{ label: "Manager", value: "Manager" },
					{ label: "Guard", value: "Guard" },
					{ label: "Client", value: "Client" },
				],
			},
			{
				name: "access",
				type: "select",
				placeholder: "Select Access",
				options: [
					{ label: "View", value: "View" },
					{ label: "Edit", value: "Edit" },
				],
			},
			{ name: "userNotified", type: "text", placeholder: "User Notified" },
		],
		[],
	);

	useEffect(() => {
		fetchAssignments(currentPage);
	}, [currentPage]);

	// Calculate table height dynamically
	useEffect(() => {
		const calculateTableHeight = () => {
			if (formRef.current) {
				const formHeight = formRef.current.offsetHeight;
				const calculatedHeight = `calc(100vh - ${formHeight}px - 150px)`;
				setTableHeight(calculatedHeight);
			}
		};

		// Calculate on mount and when form content changes
		calculateTableHeight();

		// Recalculate on window resize
		const handleResize = () => {
			calculateTableHeight();
		};

		window.addEventListener("resize", handleResize);

		// Use ResizeObserver to detect form height changes
		const resizeObserver = new ResizeObserver(() => {
			calculateTableHeight();
		});

		if (formRef.current) {
			resizeObserver.observe(formRef.current);
		}

		return () => {
			window.removeEventListener("resize", handleResize);
			resizeObserver.disconnect();
		};
	}, [form, errors, submitLoader, isEditing]);
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				notificationDropdownRef.current &&
				!notificationDropdownRef.current.contains(event.target as Node)
			) {
				setShowNotificationDropdown(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	// const handleSearch = async (searchData: { [key: string]: any }) => {
	//   console.log({searchData});

	//   const filterEntries = Object.entries(searchData).filter(
	//     ([_, v]) => v !== undefined && v !== null && String(v).trim() !== ""
	//   );

	//   if (filterEntries.length === 0) {
	//     setCurrentPage(1);
	//     await fetchAssignments(1, null);
	//     return;
	//   }

	//   // mapping table keys -> API keys
	//   const keyMapping: Record<string, string> = {
	//     "client.name": "clientName",
	//     "user.name": "userName",
	//     "guard.name": "guardName",
	//     "address.address": "addressText",
	//     "notification": "notification",
	//     "role": "role",
	//     "access": "access",
	//   };

	//   const filter = Object.fromEntries(
	//     filterEntries.map(([key, value]) => {
	//       const mappedKey = keyMapping[key] || key;
	//       // Convert notification to array format (handle comma-separated values)
	//       if (mappedKey === "notification") {
	//         if (Array.isArray(value)) {
	//           return [mappedKey, value];
	//         }
	//         // Split comma-separated string into array
	//         const notificationArray = typeof value === 'string'
	//           ? value.split(',').map(item => item.trim()).filter(item => item.length > 0)
	//           : [value];
	//         return [mappedKey, notificationArray];
	//       }
	//       return [mappedKey, value];
	//     })
	//   );

	//   setCurrentPage(1);
	//   console.log(filter); // 👀 debug
	//   await fetchAssignments(1, filter);
	// };
	// const handleSearch = async (searchData: { [key: string]: any }) => {
	// 	console.log({ searchData });

	// 	const filterEntries = Object.entries(searchData).filter(
	// 		([_, v]) => v !== undefined && v !== null && String(v).trim() !== "",
	// 	);

	// 	if (filterEntries.length === 0) {
	// 		setCurrentPage(1);
	// 		await fetchAssignments(1, null);
	// 		return;
	// 	}

	// 	// mapping table keys -> API keys
	// 	const keyMapping: Record<string, string> = {
	// 		"client.name": "clientName",
	// 		"user.name": "userName",
	// 		"guard.name": "guardName",
	// 		"address.address": "addressText",
	// 		notification: "notification",
	// 		role: "role",
	// 		access: "access",
	// 	};

	// 	// step 1️⃣ - build filter normally
	// 	let filter = Object.fromEntries(
	// 		filterEntries.map(([key, value]) => {
	// 			const mappedKey = keyMapping[key] || key;

	// 			// Convert notification to array format (handle comma-separated values)
	// 			if (mappedKey === "notification") {
	// 				if (Array.isArray(value)) {
	// 					return [mappedKey, value];
	// 				}
	// 				// Split comma-separated string into array
	// 				const notificationArray =
	// 					typeof value === "string"
	// 						? value
	// 								.split(",")
	// 								.map((item) => item.trim())
	// 								.filter((item) => item.length > 0)
	// 						: [value];
	// 				return [mappedKey, notificationArray];
	// 			}

	// 			return [mappedKey, value];
	// 		}),
	// 	);

	// 	// step 2️⃣ - remove subCategory from notification array if present
	// 	if (filter.subCategories && filter.notification) {
	// 		const subValue = filter.subCategories;
	// 		if (Array.isArray(filter.notification)) {
	// 			filter.notification = filter.notification.filter(
	// 				(item: string) => item !== subValue,
	// 			);
	// 		}
	// 	}

	// 	// step 3️⃣ - send final payload
	// 	setCurrentPage(1);
	// 	console.log("✅ Final Filter:", filter);
	// 	await fetchAssignments(1, filter);
	// };
	const handleSearch = async (searchData: { [key: string]: any }) => {
		console.log("📥 Raw searchData:", searchData);

		const filterEntries = Object.entries(searchData).filter(
			([_, v]) => v !== undefined && v !== null && String(v).trim() !== "",
		);

		if (filterEntries.length === 0) {
			setCurrentPage(1);
			await fetchAssignments(1, null);
			return;
		}

		// mapping table keys -> API keys
		const keyMapping: Record<string, string> = {
			"client.name": "clientName",
			"user.name": "userName",
			"guard.name": "guardName",
			"address.address": "addressText",
			notification: "notification",
			role: "role",
			access: "access",
		};

		// Step 1️⃣ - build filter object normally
		let filter = Object.fromEntries(
			filterEntries.map(([key, value]) => {
				const mappedKey = keyMapping[key] || key;

				if (mappedKey === "notification") {
					if (Array.isArray(value)) {
						return [mappedKey, value];
					}
					// Split comma-separated string into array
					const notificationArray =
						typeof value === "string"
							? value
									.split(",")
									.map((item) => item.trim())
									.filter((item) => item.length > 0)
							: [value];
					return [mappedKey, notificationArray];
				}

				return [mappedKey, value];
			}),
		);

		// Step 2️⃣ - Remove subCategories from notification array
		console.log({ step2: filter });

		// if there is any notification
    filter.notificationSubCat = filter.subCategories;
		if (filter.notification) {
			filter.notification = filter.notification.filter(
				(item: string) => !NotificationSubCategories.includes(item),
			);
		}

		console.log({ step2Updated: filter });

		if (filter.notificationSubCat && Array.isArray(filter.notification)) {
			console.log("🧹 Before cleanup:", filter.notification, filter.notificationSubCat);

			if (Array.isArray(filter.notificationSubCat)) {
				// if subCategories is an array
				filter.notification = filter.notification.filter(
					(item: string) => !filter.notificationSubCat.includes(item),
				);
			} else {
				// if it's a single string
				filter.notification = filter.notification.filter(
					(item: string) => item !== filter.notificationSubCat,
				);
			}

			console.log("✅ After cleanup:", filter.notification);
		}

		// Step 3️⃣ - send final payload
		setCurrentPage(1);
    // update filter string to array
    const filterString = filter.notificationSubCat.split(',') || [];
    filter.notificationSubCat = filterString;

    filter.notification = filter.notification.map(n => filterMap[n]);
    delete filter.subCategories;
		console.log("🚀 Final Payload:", filter);
		await fetchAssignments(1, filter);
	};

	const handleChange = (field: string, value: any) => {
		setForm((f) => ({ ...f, [field]: value }));
		setErrors({});
		setShowErrors(false);
	};

	const handleClientSelect = (
		client: { id: string | number; name: string; lastName: string },
		addressId: number | string,
	) => {
		setForm((f) => ({
			...f,
			clientId: String(client.id),
			addressId: String(addressId),
		}));
		const fullClientName = [client.name, client.lastName]
			.filter(Boolean)
			.join(" ");
		setClientSearch(fullClientName);
		setShowClientDropdown(false);
		setErrors((e) => ({ ...e, clientId: undefined, addressId: undefined }));

		const selectedClient = searchedClients.find(
			(c) => String(c.id) === String(client.id),
		);
		const selectedAddress = selectedClient?.addresses.find(
			(a) => String(a.id) === String(addressId),
		);
		const fullAddress = [
			selectedAddress?.label || selectedAddress?.address,
			(selectedAddress as any)?.city,
			(selectedAddress as any)?.state,
			(selectedAddress as any)?.pincode,
		]
			.filter(Boolean)
			.join(", ");
		setSelectedAddressText(fullAddress);
	};

	const handleUserSelect = (user: {
		id: string | number;
		name: string;
		email?: string;
	}) => {
		setForm((f) => ({ ...f, userId: String(user.id) }));
		const fullName = [user.name, (user as any)?.lastName]
			.filter(Boolean)
			.join(" ");
		setUserSearch(fullName || user.name);
		setNotifiedUserEmail((user as any)?.email || "");
		console.log("notifidsadf  " + notifiedUserEmail);
		setShowUserDropdown(false);
		setErrors({});
		setShowErrors(false);
	};

	const handleGuardSelect = (guard: { id: string | number; name: string }) => {
		setForm((f) => ({ ...f, guardId: String(guard.id) }));
		const fullName = [guard.name, (guard as any)?.lastName]
			.filter(Boolean)
			.join(" ");
		setGuardSearch(fullName || guard.name);
		setShowGuardDropdown(false);
		setErrors({});
		setShowErrors(false);
	};

	const handleCheckbox = (option: any) => {
		setForm((f) =>
			f.notification.includes(option)
				? { ...f, notification: f.notification.filter((n) => n !== option) }
				: { ...f, notification: [...f.notification, option] },
		);
		setErrors({});
		setShowErrors(false);
	};

	const getFieldClasses = (fieldName: string) => {
		const hasError = showErrors && errors[fieldName];
		return `${inputClasses} ${
			hasError ? "border-red-500 focus:ring-red-500" : ""
		}`;
	};

	const validate = () => {
		const e: any = {};
		if (!form.clientId) e.clientId = "Client is required";
		if (!form.userId) e.userId = "User is required";
		if (!form.guardId) e.guardId = "User Notified required";
		if (!form.addressId) e.addressId = "Address is required";
		if (!form.role) e.role = "Role is required";
		if (!form.access) e.access = "Access level is required";
		if (!form.notification.length)
			e.notification = "Please select at least one notification";
		setErrors(e);
		setShowErrors(true);
		return Object.keys(e).length === 0;
	};

	const hasTextInput =
		form.userId !== "" ||
		form.guardId !== "" ||
		form.clientId !== "" ||
		form.addressId !== "" ||
		form.role !== "" ||
		form.access !== "" ||
		(Array.isArray(form.notification) && form.notification.length > 0);

	const resetForm = () => {
		setForm({
			clientId: "",
			addressId: "",
			userId: "",
			guardId: "",
			role: "",
			access: "",
			notification: [],
			notificationSubCat: [] as string[],
		});
		setClientSearch("");
		setSelectedAddressText("");
		setUserSearch("");
		setGuardSearch("");
		setShowClientDropdown(false);
		setShowUserDropdown(false);
		setShowGuardDropdown(false);
		setShowNotificationDropdown(false);
		setErrors({});
		setShowErrors(false);
		setIsEditing(false);
		setEditId(null);
	};

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validate()) return;

		const input = {
			userId: Number(form.userId),
			guardId: Number(form.guardId),
			clientId: Number(form.clientId),
			addressId: Number(form.addressId),
			role: form.role,
			access: form.access,
			notification: form.notification,
			notificationSubCat: form.notificationSubCat,
		};
		console.log("input", input);
		try {
			setSubmitLoader(true);
			if (isEditing && editId !== null) {
				await updateAssignment(editId, input);
			} else {
				await createAssignment(input);
			}
			if (sessionStorage.getItem("adminEmail") === notifiedUserEmail) {
				const existing = sessionStorage.getItem("roles");
				const arr = existing ? (JSON.parse(existing) as string[]) : [];
				if (!arr.includes("manager")) arr.push("manager");
				sessionStorage.setItem("roles", JSON.stringify(arr));
				syncRolesFromSession();
			}
			// resetForm();
			fetchAssignments(currentPage);
		} catch (error: any) {
			console.error("Error submitting assignment:", error);
		} finally {
			setSubmitError("");
			setSubmitLoader(false);
		}
	};

	const handleEdit = (record: any) => {
		setIsEditing(true);
		setEditId(record.id);

		const mappedNotifications = Array.isArray(record.notification)
			? record.notification.map((notif) => notificationMapping[notif] || notif)
			: [];

		const mappedSubCats = Array.isArray(record.notificationSubCat)
			? record.notificationSubCat.map((notif: string) => notif)
			: [];

		setForm({
			clientId: String(record.client?.id || ""),
			addressId: String(record.address?.id || ""),
			userId: String(record.user?.id || ""),
			guardId: String(record.guard?.id || ""),
			role: record.role || "",
			access: record.access || "",
			notification: mappedNotifications,
			notificationSubCat: mappedSubCats,
		});
		setClientSearch(record.client?.name || "");
		const fullAddress = [
			record.address?.address || record.address?.label,
			(record.address as any)?.city,
			(record.address as any)?.state,
			(record.address as any)?.pincode,
		]
			.filter(Boolean)
			.join(", ");
		setSelectedAddressText(fullAddress);
		setUserSearch(record.user?.name + " " + record.user?.lastName || "");
		setGuardSearch(record.guard?.name + " " + record.guard?.lastName || "");

		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const handleDelete = (record: any) => {
		setDeleteModal({ isOpen: true, record });
	};

	const handleCategoryToggle = (
		category: string,
		subCategories: { value: string }[],
	) => {
		setForm((prev: any) => {
			const alreadySelected = prev.notification.includes(category);
			let updatedCategories: string[];
			let updatedSubCats: string[];

			if (alreadySelected) {
				// Remove category + its subcats
				updatedCategories = prev.notification.filter((c) => c !== category);
				updatedSubCats = prev.notificationSubCat.filter(
					(sub) => !subCategories.some((s) => s.value === sub),
				);
			} else {
				// Add category + all subcats
				updatedCategories = [...prev.notification, category];
				updatedSubCats = [
					...prev.notificationSubCat,
					...subCategories.map((s) => s.value),
				];
			}

			return {
				...prev,
				notification: updatedCategories,
				notificationSubCat: updatedSubCats,
			};
		});
	};

	const handleSubCategoryToggle = (
		subCat: string,
		parentCategory: string,
		subCategories: { value: string }[],
	) => {
		setForm((prev) => {
			const alreadySelected = prev.notificationSubCat.includes(subCat);
			let updatedSubCats: string[];

			if (alreadySelected) {
				updatedSubCats = prev.notificationSubCat.filter((s) => s !== subCat);
			} else {
				updatedSubCats = [...prev.notificationSubCat, subCat];
			}

			// 🔥 NEW: if at least 1 subcategory is selected → mark parent checked
			const anySelected = subCategories.some((s) =>
				updatedSubCats.includes(s.value),
			);
			const updatedCategories = anySelected
				? [...new Set([...prev.notification, parentCategory])]
				: prev.notification.filter((c) => c !== parentCategory);

			return {
				...prev,
				notification: updatedCategories,
				notificationSubCat: updatedSubCats,
			};
		});
	};

	const confirmDelete = async () => {
		if (!deleteModal.record) return;

		try {
			setDeleteLoader(true);
			await deleteAssignment(deleteModal.record.id);
			toast({ title: "SUCCESS", description: "Assignment deleted successfully" });
			fetchAssignments(currentPage);
			setDeleteModal({ isOpen: false, record: null });
		} catch (err) {
			toast({ title: "ERROR", description: "Failed to delete assignment" });
		} finally {
			setDeleteLoader(false);
		}
	};

	const cancelDelete = () => {
		setDeleteModal({ isOpen: false, record: null });
		setDeleteLoader(false);
	};
	// const formatNotificationText = (notification: string): string => {
	//   if (notification == "geo_location") {
	//     return "GeoLocation"
	//   }
	//   return notification
	//     .replace(/_/g, ' ')
	//     .replace(/\b\w/g, (char) => char.toUpperCase());
	// };
	const formatNotificationText = (notification: string): string => {
		if (!notification) return "-";

		// 1️⃣ Handle known special cases first
		const specialCases: Record<string, string> = {
			geo_location: "Geo Location",
			otp_alert: "OTP Alert",
			sms_marketing: "SMS Marketing",
		};

		if (specialCases[notification]) {
			return specialCases[notification];
		}

		// 2️⃣ Replace underscores or dots with spaces and clean up
		let formatted = notification.replace(/[_\.]/g, " ");

		// 3️⃣ Capitalize each word properly
		formatted = formatted.replace(/\b\w/g, (char) => char.toUpperCase());

		// 4️⃣ Optional: handle nested keys like "email.welcome" => "Email / Welcome"
		formatted = formatted.replace(/\s*\.\s*/g, " / ");

		// 5️⃣ Trim any extra spaces
		return formatted.trim();
	};

	const flattenedCategories = flattenNotificationCategories(
		notificationCategories,
	);
	console.log({ flattenedCategories });
	const tableColumns: TableColumn[] = [
		{
			key: "client.name",
			label: "Client Name",
			sortable: true,
			searchable: true,
			searchType: "text",
			width: "250px",
			height: "40px",
			render: (_: any, row: any) => {
				const a = row.client;
				const full = [a?.name ?? "", a?.lastName ?? ""].filter(Boolean).join(" ");
				return (
					<div className='truncate' title={full}>
						{full || "-"}
					</div>
				);
			},
		},
		{
			key: "address.address",
			label: "Client Location",
			sortable: true,
			searchable: true,
			searchType: "text",
			width: "250px",
			render: (_: any, row: any) => {
				const a = row.address;

				if (!a) return <div>-</div>;

				const streetAddress = a?.address ?? "";
				const city = a?.city ?? "";
				const state = a?.state ?? "";
				const pin = (a?.pincode || a?.zipcode) ?? "";

				const full = [streetAddress, city, state, pin].filter(Boolean).join(", ");

				// Format: street address, city (line 1), state, pin (line 2)
				// If any line is more than 50 chars, break it
				const formatAddressLine = (text: string) => {
					if (text.length <= 50) return [text];
					const words = text.split(" ");
					const lines = [];
					let currentLine = "";

					for (const word of words) {
						if ((currentLine + " " + word).trim().length <= 50) {
							currentLine = currentLine ? currentLine + " " + word : word;
						} else {
							if (currentLine) lines.push(currentLine);
							currentLine = word;
						}
					}
					if (currentLine) lines.push(currentLine);
					return lines;
				};

				const line1 = [streetAddress, city].filter(Boolean).join(", ");
				const line2 = [state, pin].filter(Boolean).join(", ");

				const line1Parts = formatAddressLine(line1);
				const line2Parts = formatAddressLine(line2);

				return (
					<div className='space-y-1' title={full}>
						{line1Parts.map((part, index) => (
							<div key={`address-line1-${index}`} className='text-sm leading-tight'>
								{part}
							</div>
						))}
						{line2Parts.map((part, index) => (
							<div key={`address-line2-${index}`} className='text-sm leading-tight'>
								{part}
							</div>
						))}
					</div>
				);
			},
		},
		{
			key: "guard.name",
			label: "User Name",
			sortable: true,
			searchable: true,
			searchType: "text", // Keep as text search
			width: "250px",
			render: (_: any, row: any) => {
				const a = row.guard;
				const full = [a?.name ?? "", a?.lastName ?? ""].filter(Boolean).join(" ");
				return (
					<div className='truncate' title={full}>
						{full || "-"}
					</div>
				);
			},
		},
		{
			key: "role",
			label: "User Role",
			sortable: true,
			searchable: true,
			searchType: "dropdown",
			searchOptions: [
				{ label: "Admin", value: "Admin" },
				{ label: "Manager", value: "Manager" },
				{ label: "Guard", value: "Guard" },
				{ label: "Client", value: "Client" },
			],
			width: "250px",
		},
		{
			key: "access",
			label: "Schedule Access",
			sortable: true,
			searchable: true,
			searchType: "dropdown", // Change to dropdown
			searchOptions: [
				{ label: "View", value: "View" },
				{ label: "Edit", value: "Edit" },
			],
			width: "250px",
		},
		{
			key: "user.name",
			label: "User Notified",
			sortable: true,
			searchable: true,
			searchType: "text", // Keep as text search
			width: "250px",
			render: (_: any, row: any) => {
				const a = row.user;
				const full = [a?.name ?? "", a?.lastName ?? ""].filter(Boolean).join(" ");
				return (
					<div className='truncate' title={full}>
						{full || "-"}
					</div>
				);
			},
		},
		{
			key: "notification",
			label: "Notification",
			sortable: true,
			searchable: true,
			searchType: "dropdown",
			width: "400px",
			// searchOptions: [ // Add this // TODO:
			//   { label: 'Geolocation', value: 'geo_location' },
			//   { label: 'Time Clock', value: 'time_clock' },
			//   { label: 'Weekly Hours', value: 'weekly_Hours' },
			//   { label: 'Schedule', value: 'schedule' }
			// ],
			// searchOptions: notificationCategories.map((cat) => ({
			//   label: cat.label,
			//   value: cat.value,
			//   subCategories: cat.subCategories.map((sub) => ({
			//     label: sub.label,
			//     value: sub.value
			//   }))
			// })),
			searchOptions: notificationCategories,
			render: (value: NotificationOption[] | string[] | null | undefined) => {
				if (!value || !Array.isArray(value) || value.length === 0) {
					return "-";
				}

				// Transform backend format to display format
				console.log({ value });
				const formattedNotifications = value.map((notification: string) =>
					formatNotificationText(notification),
				);
				// return formattedNotifications.join(", ");
				return formattedNotifications.join(", ");
			},
		},
	];

	const tableActions: TableAction[] = [
		{
			label: "Edit",
			icon: <FaRegEdit className='w-4 h-4' color='blue' />,
			onClick: handleEdit,
			className: "text-blue-500 hover:text-green-700",
			title: "Edit",
		},
		{
			label: "Delete",
			icon: <FaRegTrashAlt className='w-4 h-4' />,
			onClick: handleDelete,
			className: "text-red-500 hover:text-red-700",
			title: "Delete",
		},
	];

	return (
		<div className='w-full overflow-x-hidden p-6'>
			<div
				ref={formRef}
				className='bg-white p-4 rounded-2xl shadow-md border border-gray-100 space-y-2 grid mb-2'
			>
				<h2 className='text-lg font-semibold mb-2'>
					{isEditing ? "Edit Assignment" : "Add Assignment"}
				</h2>
				<form onSubmit={onSubmit} autoComplete='off'>
					<div className='grid grid-cols-1 sm:grid-cols-3  lg:grid-cols-4 xxl:grid-cols-3 gap-2'>
						<div className='relative'>
							<input
								type='text'
								value={clientSearch}
								onFocus={() => setShowClientDropdown(true)}
								onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
								onChange={(e) => {
									setClientSearch(e.target.value);
									setForm((f) => ({ ...f, clientId: "", addressId: "" }));
									setSelectedAddressText("");
								}}
								placeholder='Client Name'
								className={inputClasses}
							/>
							{showErrors && errors.clientId && (
								<div className='mt-1 flex items-center text-sm text-red-600'>
									<svg className='w-4 h-4 mr-1' fill='currentColor' viewBox='0 0 20 20'>
										<path
											fillRule='evenodd'
											d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
											clipRule='evenodd'
										/>
									</svg>
									{errors.clientId}
								</div>
							)}

							<SearchResultsDropdown
								show={showClientDropdown && clientSearch.length >= 1}
							>
								{loadingClients ? (
									<div className='p-2 text-sm text-gray-500'>Searching clients...</div>
								) : searchedClients.length === 0 ? (
									<div className='p-2 text-gray-500 text-sm'>No clients found</div>
								) : (
									searchedClients.flatMap((client, clientIndex) =>
										client.addresses.map((address, addressIndex) => (
											<SearchResultItem
												key={`${client.id}-${address.id}`}
												index={clientIndex + addressIndex}
												primaryText={`${client.name}${
													client.lastName ? ` ${client.lastName}` : ""
												}`}
												secondaryText={[
													address.label || address.address,
													(address as any)?.city,
													(address as any)?.state,
													(address as any)?.pincode,
												]
													.filter(Boolean)
													.join(", ")}
												initials={`${client.name?.[0]?.toUpperCase() ?? ""}${
													client.lastName ? client.lastName[0]?.toUpperCase() : ""
												}`}
												onSelect={() =>
													handleClientSelect(
														{ id: client.id, name: client.name, lastName: client.lastName },
														address.id,
													)
												}
											/>
										)),
									)
								)}
							</SearchResultsDropdown>
						</div>

						{/* Location (read-only) */}
						<div>
							<input
								type='text'
								value={selectedAddressText}
								placeholder='Location'
								readOnly
								className={`${inputClasses} appearance-none`}
							/>
							{showErrors && errors.addressId && (
								<div className='mt-1 flex items-center text-sm text-red-600'>
									<svg className='w-4 h-4 mr-1' fill='currentColor' viewBox='0 0 20 20'>
										<path
											fillRule='evenodd'
											d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
											clipRule='evenodd'
										/>
									</svg>
									{errors.addressId}
								</div>
							)}
						</div>

						{/* Guard Search */}
						<div className='relative'>
							<input
								type='text'
								value={guardSearch}
								onFocus={() => setShowGuardDropdown(true)}
								onBlur={() => setTimeout(() => setShowGuardDropdown(false), 200)}
								onChange={(e) => {
									setGuardSearch(e.target.value);
									setForm((f) => ({ ...f, guardId: "" }));
								}}
								placeholder='Select User'
								className={getFieldClasses("guardId")}
							/>
							{showErrors && errors.guardId && (
								<div className='mt-1 flex items-center text-sm text-red-600'>
									<svg className='w-4 h-4 mr-1' fill='currentColor' viewBox='0 0 20 20'>
										<path
											fillRule='evenodd'
											d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
											clipRule='evenodd'
										/>
									</svg>
									{errors.guardId}
								</div>
							)}
							<SearchResultsDropdown
								show={showGuardDropdown && guardSearch.length >= 1}
							>
								{loadingGuards ? (
									<div className='p-2 text-sm text-gray-500'>Searching guards...</div>
								) : searchedGuards.length === 0 ? (
									<div className='p-2 text-gray-500 text-sm'>No guards found</div>
								) : (
									searchedGuards.map((guard, idx) => {
										const fullName = [guard.name, (guard as any)?.lastName]
											.filter(Boolean)
											.join(" ");
										const fullAddress = [
											(guard as any)?.address,
											(guard as any)?.city,
											(guard as any)?.state,
											(guard as any)?.zipcode,
										]
											.filter(Boolean)
											.join(", ");
										return (
											<SearchResultItem
												key={guard.id}
												index={idx}
												primaryText={fullName || guard.name}
												secondaryText={fullAddress}
												onSelect={() => handleGuardSelect(guard)}
											/>
										);
									})
								)}
							</SearchResultsDropdown>
						</div>
						<div
							className='relative sm:col-span-1 lg:col-span-1'
							ref={roleDropdownRef}
						>
							<div
								className={`${getFieldClasses(
									"role",
								)} cursor-pointer flex items-center justify-between`}
								onClick={() => setShowRoleDropdown(!showRoleDropdown)}
							>
								<div className='flex-1'>
									{form.role === "" ? (
										<span className='text-gray-500'>Select role...</span>
									) : (
										<span className='text-gray-900'>{form.role}</span>
									)}
								</div>
							</div>

							{/* Dropdown menu */}
							{showRoleDropdown && (
								<div className='absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50'>
									{["Admin", "Manager", "Guard", "Client"].map((role) => (
										<div
											key={role}
											className='p-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700'
											onClick={() => {
												setForm((prev) => ({
													...prev,
													role,
													access: role === "Guard" ? "View" : prev.access,
												}));
												setShowRoleDropdown(false);
											}}
										>
											{role}
										</div>
									))}
								</div>
							)}

							{/* Error message */}
							{showErrors && errors.role && (
								<div className='mt-1 flex items-center text-sm text-red-600'>
									<svg className='w-4 h-4 mr-1' fill='currentColor' viewBox='0 0 20 20'>
										<path
											fillRule='evenodd'
											d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
											clipRule='evenodd'
										/>
									</svg>
									{errors.role}
								</div>
							)}
						</div>

						<div
							className='relative sm:col-span-1 lg:col-span-1'
							ref={accessDropdownRef}
						>
							{/* Dropdown trigger */}
							<div
								className={`${getFieldClasses(
									"access",
								)} cursor-pointer flex items-center justify-between ${
									form.role === "Guard"
										? "bg-gray-100 text-gray-400 cursor-not-allowed"
										: ""
								}`}
								onClick={() => {
									if (form.role === "Guard") return;
									setShowAccessDropdown(!showAccessDropdown);
								}}
								aria-disabled={form.role === "Guard"}
							>
								<div className='flex-1'>
									{form.access === "" ? (
										<span className='text-gray-500'>Select Access...</span>
									) : (
										<span className='text-gray-900'>{form.access}</span>
									)}
								</div>
							</div>

							{/* Dropdown menu */}
							{showAccessDropdown && (
								<div className='absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50'>
									{["View", "Edit"].map((access) => (
										<div
											key={access}
											className='p-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700'
											onClick={() => {
												setForm((prev) => ({ ...prev, access }));
												setShowAccessDropdown(false);
											}}
										>
											{access}
										</div>
									))}
								</div>
							)}

							{/* Error message */}
							{showErrors && errors.access && (
								<div className='mt-1 flex items-center text-sm text-red-600'>
									<svg className='w-4 h-4 mr-1' fill='currentColor' viewBox='0 0 20 20'>
										<path
											fillRule='evenodd'
											d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
											clipRule='evenodd'
										/>
									</svg>
									{errors.access}
								</div>
							)}
						</div>

						{/* User Search */}
						<div className='relative'>
							<input
								type='text'
								value={userSearch}
								onFocus={() => setShowUserDropdown(true)}
								onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
								onChange={(e) => {
									setUserSearch(e.target.value);
									setForm((f) => ({ ...f, userId: "" }));
								}}
								placeholder='Select User Notified'
								className={getFieldClasses("userId")}
							/>
							{showErrors && errors.userId && (
								<div className='mt-1 flex items-center text-sm text-red-600'>
									<svg className='w-4 h-4 mr-1' fill='currentColor' viewBox='0 0 20 20'>
										<path
											fillRule='evenodd'
											d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
											clipRule='evenodd'
										/>
									</svg>
									{errors.userId}
								</div>
							)}
							<SearchResultsDropdown show={showUserDropdown && userSearch.length >= 1}>
								{loadingUsers ? (
									<div className='p-2 text-sm text-gray-500'>Searching users...</div>
								) : searchedUsers.length === 0 ? (
									<div className='p-2 text-gray-500 text-sm'>No users found</div>
								) : (
									searchedUsers.map((user, idx) => {
										const fullName = [user.name, (user as any)?.lastName]
											.filter(Boolean)
											.join(" ");
										const fullAddressParts = [
											(user as any)?.address,
											(user as any)?.city,
											(user as any)?.state,
											(user as any)?.zipcode,
										].filter(Boolean);
										const fullAddress = fullAddressParts.join(", ");
										return (
											<SearchResultItem
												key={user.id}
												index={idx}
												primaryText={fullName || user.name}
												secondaryText={fullAddress}
												onSelect={() => handleUserSelect(user)}
											/>
										);
									})
								)}
							</SearchResultsDropdown>
						</div>

						{/* Notification Dropdown */}
						<div
							className='relative  sm:col-span-3 lg:col-span-2 '
							ref={notificationDropdownRef}
						>
							<div
								className={`${getFieldClasses(
									"notification",
								)} cursor-pointer flex items-center justify-between`}
								onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
							>
								<div className='flex flex-wrap gap-1 flex-1'>
									{/* Take reference from here */}
									{form.notification.length === 0 ? (
										<span className='text-gray-500'>Select notifications...</span>
									) : (
										form.notification.map((option) => (
											<span
												key={option}
												className='inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm'
											>
												{option}
												<Button
													type='button'
													onClick={(e) => {
														e.stopPropagation();
														handleCheckbox(option);
													}}
													variant='ghost'
													size='icon-sm'
													className='ml-1 hover:bg-blue-200 rounded-full p-0.5'
												>
													<X className='w-3 h-3' />
												</Button>
											</span>
										))
									)}
								</div>
							</div>

							{/* {showNotificationDropdown && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                  {notificationOptions.map((option) => (
                    <label
                      key={option}
                      className="flex items-center p-2 hover:bg-gray-50 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.notification.includes(option)}
                        onChange={() => handleCheckbox(option)}
                        className="mr-3 text-[#004175] focus:ring-[#004175] focus:ring-2"
                      />
                      <span
                        className={`${form.notification.includes(option)
                          ? "text-blue-800"
                          : "text-gray-700"
                          }`}
                      >
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              )} */}

							{showNotificationDropdown && (
								<div className='absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-64 overflow-y-auto z-50'>
									{notificationCategories.map((cat) => (
										<div key={cat.value} className='border-b p-2'>
											{/* Category checkbox */}
											<label className='flex items-center font-medium'>
												<input
													type='checkbox'
													checked={form.notification.includes(cat.value)}
													onChange={() => handleCategoryToggle(cat.value, cat.subCategories)}
													className='mr-2'
												/>
												{cat.label}
											</label>

											{/* Subcategories */}
											{cat.subCategories.length > 0 && (
												<div className='ml-6 mt-1 space-y-1'>
													{cat.subCategories.map((sub) => (
														<label key={sub.value} className='flex items-center text-sm'>
															<input
																type='checkbox'
																checked={form.notificationSubCat.includes(sub.value)}
																onChange={() =>
																	handleSubCategoryToggle(
																		sub.value,
																		cat.value,
																		cat.subCategories,
																	)
																}
																className='mr-2'
															/>
															{sub.label}
														</label>
													))}
												</div>
											)}
										</div>
									))}
								</div>
							)}

							{showErrors && errors.notification && (
								<div className='mt-1 flex items-center text-sm text-red-600'>
									<svg className='w-4 h-4 mr-1' fill='currentColor' viewBox='0 0 20 20'>
										<path
											fillRule='evenodd'
											d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
											clipRule='evenodd'
										/>
									</svg>
									{errors.notification}
								</div>
							)}
						</div>

						{/* Submit and Reset Buttons */}
						<div className='flex justify-start items-start gap-2'>
							<SubmitButton
								loading={submitLoader}
								disabled={submitLoader}
								icon={
									isEditing ? (
										<FaRegEdit className='w-4 h-4 mr-1' color='blue' />
									) : (
										<GoPlus className='w-4 h-4 mr-1' />
									)
								}
							>
								{isEditing ? "Update" : "Add"}
							</SubmitButton>
							{hasTextInput && (
								<ResetButton
									onClick={resetForm}
									confirmTitle='Confirm Reset'
									confirmMessage='This will clear the form. Proceed?'
								/>
							)}
						</div>
					</div>
				</form>
			</div>
			<GenericTable
				data={assignments || []}
				columns={tableColumns}
				actions={tableActions}
				loading={loading}
				emptyMessage='No records found matching your search criteria.'
				searchable={true}
				onSearch={handleSearch}
				tableHeight={tableHeight}
			/>

			<div className='mt-6'>
				<Pagination
					currentPage={currentPage}
					lastPage={lastPage}
					onPageChange={(page) => {
						setCurrentPage(page);
						fetchAssignments(page);
					}}
					loading={loading}
				/>
			</div>
			{deleteModal.isOpen && (
				<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
					<div className='bg-white rounded-lg p-6 max-w-md w-full mx-4'>
						<div className='flex items-center mb-4'></div>

						<div className='mb-6'>
							<p className='text-sm text-gray-500'>
								Are you sure you want to delete this assignment?
							</p>
						</div>

						<div className='flex space-x-3 justify-end'>
							<button
								type='button'
								onClick={cancelDelete}
								disabled={deleteLoader}
								className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004175] disabled:opacity-50 disabled:cursor-not-allowed'
							>
								Cancel
							</button>
							<button
								type='button'
								onClick={confirmDelete}
								disabled={deleteLoader}
								className='px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center'
							>
								{deleteLoader ? (
									<>
										<svg
											className='animate-spin -ml-1 mr-2 h-4 w-4 text-white'
											xmlns='http://www.w3.org/2000/svg'
											fill='none'
											viewBox='0 0 24 24'
										>
											<circle
												className='opacity-25'
												cx='12'
												cy='12'
												r='10'
												stroke='currentColor'
												strokeWidth='4'
											></circle>
											<path
												className='opacity-75'
												fill='currentColor'
												d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
											></path>
										</svg>
										Deleting...
									</>
								) : (
									"Delete"
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

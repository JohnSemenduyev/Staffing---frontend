import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { FaRegEdit, FaRegTrashAlt, FaFilePdf, FaFileExport } from "react-icons/fa";
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
import { exportToPDF, exportToExcel, ExportColumn } from "../../utils/exportData";
import { toast } from "sonner";
import { graphQLClient } from "../../GraphqlClient";
import { GET_ASSIGNMENTS } from "../../graphql/queries";
import type { Assignment } from "../../context/Assignment";

const notificationOptions = [
	"Geolocation",
	"Time Clock",
	"Time Deviation",
	"Weekly Hours",
	"Scheduling",
] as const;
type NotificationOption = (typeof notificationOptions)[number];

const flattenNotificationCategories = (categories) => {
	const flattened = [];
	categories.forEach((cat) => {
		flattened.push({ label: cat.label, value: cat.value });
		if (Array.isArray(cat.subCategories)) {
			cat.subCategories.forEach((sub) => {
				flattened.push({
					label: `— ${cat.label} / ${sub.label}`,
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
	time_deviation: "Time Deviation",
	weekly_Hours: "Weekly Hours",
	schedule: "Scheduling",
	Geolocation: "Geolocation",
	"Time Clock": "Time Clock",
	"Time Deviation": "Time Deviation",
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
		subCategories: [],
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
  'Time Deviation': 'time_deviation',
  'Weekly Hours': 'weekly_hours',
  'Scheduling': 'schedule'
};

const formatRoleLabel = (role: string) =>
  role
    ? role
        .replace(/_/g, " ")
        .split(" ")
        .filter(Boolean)
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ")
    : "";

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
		currentFilter,
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
	useEffect(() => {
		fetchAssignments(currentPage);
	}, [currentPage]);
	useEffect(() => {
		const calculateTableHeight = () => {
			if (formRef.current) {
				const formHeight = formRef.current.offsetHeight;
				const calculatedHeight = `calc(100vh - ${formHeight}px - 150px)`;
				setTableHeight(calculatedHeight);
			}
		};
		calculateTableHeight();
		const handleResize = () => {
			calculateTableHeight();
		};

		window.addEventListener("resize", handleResize);
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
	const toArray = (value: unknown) => {
		if (Array.isArray(value)) return value.filter(Boolean) as string[];
		if (typeof value === "string") {
			return value
				.split(",")
				.map((item) => item.trim())
				.filter((item) => item.length > 0);
		}
		return value ? [String(value)] : [];
	};

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
		const keyMapping: Record<string, string> = {
			"client.name": "clientName",
			"user.name": "userName",
			"guard.name": "guardName",
			"address.address": "addressText",
			notification: "notification",
			role: "role",
			access: "access",
		};
		let filter = Object.fromEntries(
			filterEntries.map(([key, value]) => {
				const mappedKey = keyMapping[key] || key;

				if (mappedKey === "notification") {
					return [mappedKey, toArray(value)];
				}

				return [mappedKey, value];
			}),
		);
		const notificationSelections = toArray(filter.notification);
		const providedSubCats = toArray(filter.subCategories);

		const notificationSubCat =
			providedSubCats.length > 0
				? providedSubCats
				: notificationSelections.filter((item) =>
						NotificationSubCategories.includes(item),
				  );

		const normalizedNotification = notificationSelections.filter(
			(item) => !NotificationSubCategories.includes(item),
		);

		filter.notificationSubCat = notificationSubCat.length > 0 ? notificationSubCat : null;
		filter.notification = normalizedNotification.length > 0 ? normalizedNotification : null;
		delete filter.subCategories;
		setCurrentPage(1);

		if (Array.isArray(filter.notification)) {
	filter.notification = filter.notification
		.map((n: string) => filterMap[n] || n)
		.filter(Boolean);

	if (filter.notification.length === 0) {
		filter.notification = null;
	}
}
		console.log("🚀 Final Payload:", filter);
		await fetchAssignments(1, filter);
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
		const isClientRole = form.role?.toLowerCase() === "client";

		if (!form.clientId) e.clientId = "Client is required";
		if (!isClientRole && !form.userId) e.userId = "User is required";
		if (!isClientRole && !form.guardId) e.guardId = "User Notified required";
		if (!form.addressId) e.addressId = "Address is required";
		if (!form.role) e.role = "Role is required";
		if (!form.access) e.access = "Access level is required";
		// if (!form.notification.length)
		// 	e.notification = "Please select at least one notification";
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

		const isClientRole = form.role?.toLowerCase() === "client";

		const input = {
			userId: form.userId ? Number(form.userId) : null,
			guardId: form.guardId ? Number(form.guardId) : null,
			clientId: Number(form.clientId),
			addressId: Number(form.addressId),
			role: form.role,
			access: form.access,
			notification: form.notification,
			notificationSubCat: form.notificationSubCat,
		};
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
			resetForm();
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

  // 🔹 guard is always from guard entity now
  const guardEntity = record.guard;

  const effectiveGuardId = record.guardId;

  setForm({
    clientId: String(record.client?.id || ""),
    addressId: String(record.address?.id || ""),
    userId: String(record.user?.id || ""),
    guardId: effectiveGuardId ? String(effectiveGuardId) : "",
    role: record.role || "",
    access: record.access || "",
    notification: mappedNotifications,
    notificationSubCat: mappedSubCats,
  });

  const fullAddress = [
    record.address?.address || record.address?.label,
    (record.address as any)?.city,
    (record.address as any)?.state,
    (record.address as any)?.pincode,
  ]
    .filter(Boolean)
    .join(", ");
  setSelectedAddressText(fullAddress);

  const userFullName = [record.user?.name, record.user?.lastName].filter(Boolean).join(" ");
  setUserSearch(userFullName || "");
  setNotifiedUserEmail((record.user as any)?.email || "");

  const clientFullName = [record.client?.name, record.client?.lastName].filter(Boolean).join(" ");
  setClientSearch(clientFullName || "");

  const guardFullName = [guardEntity?.name, guardEntity?.lastName].filter(Boolean).join(" ");
  setGuardSearch(guardFullName || "");

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
				updatedCategories = prev.notification.filter((c) => c !== category);
				updatedSubCats = prev.notificationSubCat.filter(
					(sub) => !subCategories.some((s) => s.value === sub),
				);
			} else {
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
	
	const formatNotificationText = (notification: string): string => {
		if (!notification) return "-";
		const specialCases: Record<string, string> = {
			geo_location: "Geo Location",
			otp_alert: "OTP Alert",
			sms_marketing: "SMS Marketing",
		};

		if (specialCases[notification]) {
			return specialCases[notification];
		}
		let formatted = notification.replace(/[_\.]/g, " ");
		formatted = formatted.replace(/\b\w/g, (char) => char.toUpperCase());
		formatted = formatted.replace(/\s*\.\s*/g, " / ");
		return formatted.trim();
	};

	const flattenedCategories = flattenNotificationCategories(
		notificationCategories,
	);
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
  searchType: "text",
  width: "250px",
  render: (_: any, row: any) => {
    // 🔹 Prefer guard (User); clientregistration removed.
    const src = row.guard;

    const full = [src?.name ?? "", src?.lastName ?? ""]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="truncate" title={full}>
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
			render: (value: string) => formatRoleLabel(value),
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
			searchOptions: notificationCategories,
			render: (value: NotificationOption[] | string[] | null | undefined) => {
				if (!value || !Array.isArray(value) || value.length === 0) {
					return "-";
				}
				const formattedNotifications = value.map((notification: string) =>
					formatNotificationText(notification),
				);
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

	// Reusable function to transform assignment data for export
	const transformAssignmentForExport = useCallback((row: Assignment) => {
		const client = row.client;
		const clientName = client ? [client.name ?? "", client.lastName ?? ""].filter(Boolean).join(" ") : "-";
		
		const address = row.address;
		const addressText = address 
			? [address.label ?? "", address.address ?? "", address.city ?? "", address.state ?? "", address.pincode ?? ""].filter(Boolean).join(", ")
			: "-";
		
		const guard = row.guard;
		const guardName = guard ? [guard.name ?? "", guard.lastName ?? ""].filter(Boolean).join(" ") : "-";
		
		const user = row.user;
		const userName = user ? [user.name ?? "", user.lastName ?? ""].filter(Boolean).join(" ") : "-";
		
		const notifications = row.notification && Array.isArray(row.notification) && row.notification.length > 0
			? row.notification.map((n: string) => formatNotificationText(n)).join(", ")
			: "-";

		return {
			clientName,
			address: addressText,
			guardName,
			role: formatRoleLabel(row.role),
			access: row.access || "-",
			userName,
			notification: notifications,
		};
	}, []);

	// Prepare data for export (flatten nested structures) - for UI display
	const exportData = useMemo(() => {
		return (assignments || []).map(transformAssignmentForExport);
	}, [assignments, transformAssignmentForExport]);

	// Fetch all assignments for export (separate from UI state)
	const fetchAllAssignmentsForExport = async (): Promise<Assignment[]> => {
		try {
			type GetAssignmentsResponse = {
				assignments: {
					data: Assignment[];
					lastPage: number;
				};
			};
			
			const token = sessionStorage.getItem("token");
			const effectiveFilter = currentFilter || undefined;
			const variables: any = { page: 1, export: true };
			
			if (effectiveFilter && Object.keys(effectiveFilter).length > 0) {
				variables.filter = effectiveFilter;
			}
			
			const response = await graphQLClient.request<GetAssignmentsResponse>(
				GET_ASSIGNMENTS,
				variables,
				{ Authorization: `Bearer ${token}` }
			);
			
			return response.assignments.data;
		} catch (error) {
			console.error("Error fetching assignments for export:", error);
			throw error;
		}
	};

	// Export column definitions
	const exportColumns: ExportColumn[] = useMemo(() => [
		{ key: "clientName", header: "Client Name" },
		{ key: "address", header: "Client Location" },
		{ key: "guardName", header: "User Name" },
		{ key: "role", header: "User Role" },
		{ key: "access", header: "Schedule Access" },
		{ key: "userName", header: "User Notified" },
		{ key: "notification", header: "Notification" },
	], []);

	// Handle PDF export
	const handleExportToPDF = async () => {
		try {
			// Fetch all data with export: true (kept in local variable, not updating UI)
			const allAssignments = await fetchAllAssignmentsForExport();
			
			if (!allAssignments || allAssignments.length === 0) {
				toast({ title: "ERROR", description: "No data to export" });
				return;
			}

			// Transform data for export using reusable function
			const exportDataForPDF = allAssignments.map(transformAssignmentForExport);

			exportToPDF(exportDataForPDF, exportColumns, {
				title: "Assignment List",
				fileName: "assignments.pdf",
			});
			toast({ title: "SUCCESS", description: "PDF exported successfully" });
		} catch (error) {
			console.error("Error exporting PDF:", error);
			toast({ title: "ERROR", description: "Failed to export PDF" });
		}
	};

	// Handle Excel export
	const handleExportToExcel = async () => {
		try {
			// Fetch all data with export: true (kept in local variable, not updating UI)
			const allAssignments = await fetchAllAssignmentsForExport();
			
			if (!allAssignments || allAssignments.length === 0) {
				toast({ title: "ERROR", description: "No data to export" });
				return;
			}

			// Transform data for export using reusable function
			const exportDataForExcel = allAssignments.map(transformAssignmentForExport);

			const result = await exportToExcel(exportDataForExcel, exportColumns, {
				fileName: "assignments",
				includeTimestamp: true,
				worksheetName: "Assignments",
			});

			if (result.success) {
				toast({ title: "SUCCESS", description: `Excel file exported successfully: ${result.filename}` });
			} else {
				toast({ title: "ERROR", description: result.error || "Failed to export Excel file" });
			}
		} catch (error) {
			console.error("Error exporting Excel:", error);
			toast({ title: "ERROR", description: "Failed to export Excel" });
		}
	};

	return (
		<div className='w-full overflow-x-hidden p-6'>
			<div
				ref={formRef}
				className='bg-white p-4 rounded-2xl shadow-md border border-gray-100 space-y-2 grid mb-2'
			>
				<div className="flex justify-between items-center mb-2">
					<h2 className='text-lg font-semibold'>
						{isEditing ? "Edit Assignment" : "Add Assignment"}
					</h2>
				</div>
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
										<span className='text-gray-900'>
											{formatRoleLabel(form.role)}
										</span>
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
											{formatRoleLabel(role)}
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

			{/* Export buttons below table */}
			{!loading && exportData && exportData.length > 0 && (
				<div className="mt-4 flex justify-end gap-2">
					<button
						onClick={handleExportToPDF}
						className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
						title="Export to PDF"
					>
						<FaFilePdf className="w-5 h-5" />
					</button>
					<button
						onClick={handleExportToExcel}
						className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
						title="Export to Excel"
					>
						<FaFileExport className="w-5 h-5" />
					</button>
				</div>
			)}

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
